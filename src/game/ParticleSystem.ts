import * as THREE from 'three';

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  life: number;
  maxLife: number;
  wobblePhase: number;
  active: boolean;
}

interface SiltCloud {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  scale: number;
  maxScale: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface WakeRibbonNode {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  scale: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface BgBubbleEmitter {
  x: number;
  y: number;
  interval: number;
  timer: number;
  spread: number;
}

export class ParticleSystem {
  public group: THREE.Group;

  // 1. Marine snow & Conical Flashlight Dust Motes (GLSL Shader Points)
  private marinePoints!: THREE.Points;
  private marineGeo!: THREE.BufferGeometry;
  private marineMat!: THREE.ShaderMaterial;
  private marineCount = 340;
  private marinePositions!: Float32Array;
  private marineVelocities!: Float32Array;
  private marineSizes!: Float32Array;
  private marineSeeds!: Float32Array;

  // 2. Rising Bubbles InstancedMesh (Exhale trails, propulsion bursts, background streams)
  private bubbleMesh!: THREE.InstancedMesh;
  private bubbleTex!: THREE.CanvasTexture;
  private maxBubbles = 260;
  private bubbles: Bubble[] = [];
  private dummy = new THREE.Object3D();

  // 3. Disturbed Cave Floor Silt / Sediment Clouds
  private siltGroup = new THREE.Group();
  private siltTex!: THREE.CanvasTexture;
  private siltPool: SiltCloud[] = [];
  private maxSiltClouds = 48;
  private lastSiltSpawnTime = 0;

  // 4. Propulsion Slipstream Wake (Triggered on swim & boost/dash)
  private wakeGroup = new THREE.Group();
  private wakeTex!: THREE.CanvasTexture;
  private wakePool: WakeRibbonNode[] = [];
  private maxWakeNodes = 36;
  private wakeEmitTimer = 0;

  // 5. Rising Background Bubble Stream Emitters across depth zones
  private bgBubbleEmitters: BgBubbleEmitter[] = [
    // Surface & Sunlit Shallows
    { x: -23.5, y: -14.2, interval: 0.45, timer: 0.1, spread: 0.35 },
    { x: -12.0, y: -26.5, interval: 0.38, timer: 0.2, spread: 0.40 },
    { x: -48.0, y: -22.5, interval: 0.50, timer: 0.0, spread: 0.35 },
    { x: 46.0, y: -28.0, interval: 0.42, timer: 0.3, spread: 0.45 },
    // Twilight Reef & Galleon Caverns
    { x: -28.0, y: -38.5, interval: 0.35, timer: 0.1, spread: 0.40 },
    { x: -42.0, y: -62.0, interval: 0.40, timer: 0.2, spread: 0.50 },
    { x: 4.5, y: -60.5, interval: 0.45, timer: 0.0, spread: 0.40 },
    { x: 58.0, y: -58.0, interval: 0.42, timer: 0.15, spread: 0.45 },
    // Midnight Trench & Hydrothermal Vent Rift
    { x: -32.5, y: -95.0, interval: 0.26, timer: 0.0, spread: 0.65 },
    { x: -22.0, y: -94.0, interval: 0.28, timer: 0.12, spread: 0.65 },
    { x: 44.0, y: -92.0, interval: 0.32, timer: 0.05, spread: 0.55 },
    // Abyssal Depths & Leviathan Graveyard
    { x: -6.5, y: -124.5, interval: 0.24, timer: 0.0, spread: 0.70 },
    { x: 11.5, y: -124.0, interval: 0.25, timer: 0.14, spread: 0.70 },
  ];

  private diverBubbleTimer = 0;
  private boostBubbleTimer = 0;
  private time = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'particle_system';

    this.initMarineSnowAndFlashlightMotes();
    this.initBubbles();
    this.initSiltClouds();
    this.initPropulsionWake();
  }

  /**
   * Initializes ambient marine snow AND golden dust motes that illuminate brightly
   * inside the diver's conical flashlight beam with soft radial + angular falloff.
   */
  private initMarineSnowAndFlashlightMotes(): void {
    this.marinePositions = new Float32Array(this.marineCount * 3);
    this.marineVelocities = new Float32Array(this.marineCount * 2);
    this.marineSizes = new Float32Array(this.marineCount);
    this.marineSeeds = new Float32Array(this.marineCount);

    for (let i = 0; i < this.marineCount; i++) {
      this.marinePositions[i * 3] = (Math.random() - 0.5) * 44;
      this.marinePositions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      this.marinePositions[i * 3 + 2] = 0.18 + (Math.random() - 0.5) * 0.2;

      this.marineVelocities[i * 2] = (Math.random() - 0.5) * 0.35;
      this.marineVelocities[i * 2 + 1] = -0.15 - Math.random() * 0.32;
      this.marineSizes[i] = 4.0 + Math.random() * 7.5;
      this.marineSeeds[i] = Math.random() * Math.PI * 2;
    }

    this.marineGeo = new THREE.BufferGeometry();
    this.marineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.marinePositions, 3)
    );
    this.marineGeo.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.marineSizes, 1)
    );
    this.marineGeo.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(this.marineSeeds, 1)
    );

    this.marineMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBeamOrigin: { value: new THREE.Vector2(-18.3, -6.45) },
        uBeamDir: { value: new THREE.Vector2(1.0, 0.0) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform vec2 uBeamOrigin;
        uniform vec2 uBeamDir;
        varying float vBeamLit;
        varying float vTwinkle;

        void main() {
          vec2 toMote = position.xy - uBeamOrigin;
          float dist = length(toMote);
          vec2 dir = dist > 0.001 ? toMote / dist : vec2(1.0, 0.0);
          float cosAngle = dot(dir, normalize(uBeamDir));

          // Conical flashlight test (half-angle ~24 deg => cos ~0.91)
          float coneMask = smoothstep(0.86, 0.965, cosAngle);
          float distMask = (1.0 - smoothstep(1.2, 10.5, dist)) * smoothstep(0.05, 0.45, dist);
          vBeamLit = clamp(coneMask * distMask, 0.0, 1.0);

          vTwinkle = 0.65 + 0.35 * sin(uTime * 3.4 + aSeed * 6.28);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * (1.0 + vBeamLit * 0.75);
        }
      `,
      fragmentShader: `
        varying float vBeamLit;
        varying float vTwinkle;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv) * 2.0;
          if (d > 1.0) discard;

          float core = pow(1.0 - d, 2.2);
          // Ambient marine cyan-white snow vs warm golden flashlight dust mote
          vec3 ambientCol = vec3(0.62, 0.92, 0.98);
          vec3 beamCol = vec3(1.0, 0.93, 0.56);
          vec3 col = mix(ambientCol, beamCol, vBeamLit);

          float alpha = core * mix(0.36, 0.92, vBeamLit) * vTwinkle;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.marinePoints = new THREE.Points(this.marineGeo, this.marineMat);
    this.marinePoints.renderOrder = 23;
    this.group.add(this.marinePoints);
  }

  /**
   * Initializes crisp hollow-ring water bubbles with specular highlight
   * for diver exhale trails, propulsion bubble bursts, and rising background bubble streams.
   */
  private initBubbles(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      // Translucent bubble body with bright outer rim
      const grad = ctx.createRadialGradient(26, 24, 3, 32, 32, 28);
      grad.addColorStop(0.0, 'rgba(240, 253, 255, 0.85)');
      grad.addColorStop(0.45, 'rgba(125, 211, 252, 0.22)');
      grad.addColorStop(0.82, 'rgba(103, 232, 249, 0.78)');
      grad.addColorStop(0.95, 'rgba(224, 242, 254, 0.92)');
      grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fill();

      // Specular glint on top-left of bubble
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.ellipse(22, 20, 6, 3.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    this.bubbleTex = new THREE.CanvasTexture(canvas);

    const bubbleGeo = new THREE.PlaneGeometry(0.28, 0.28);
    const bubbleMat = new THREE.MeshBasicMaterial({
      map: this.bubbleTex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.bubbleMesh = new THREE.InstancedMesh(
      bubbleGeo,
      bubbleMat,
      this.maxBubbles
    );
    this.bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bubbleMesh.renderOrder = 22;
    this.group.add(this.bubbleMesh);

    for (let i = 0; i < this.maxBubbles; i++) {
      this.dummy.position.set(0, 1000, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.bubbleMesh.setMatrixAt(i, this.dummy.matrix);

      this.bubbles.push({
        x: 0,
        y: 1000,
        vx: 0,
        vy: 0,
        scale: 1,
        life: 0,
        maxLife: 1,
        wobblePhase: Math.random() * Math.PI * 2,
        active: false,
      });
    }
    this.bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Initializes the pool of disturbed silt/dust clouds kicked up when touching the cave floor or walls.
   */
  private initSiltClouds(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Multi-lobed organic sediment puff
      const puffs = [
        { x: 64, y: 68, r: 44 },
        { x: 42, y: 74, r: 32 },
        { x: 86, y: 72, r: 34 },
        { x: 56, y: 50, r: 30 },
        { x: 74, y: 54, r: 28 },
      ];
      puffs.forEach((p) => {
        const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
        g.addColorStop(0.0, 'rgba(94, 178, 198, 0.42)');
        g.addColorStop(0.5, 'rgba(42, 118, 142, 0.24)');
        g.addColorStop(1.0, 'rgba(18, 64, 84, 0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    this.siltTex = new THREE.CanvasTexture(canvas);
    this.siltGroup.renderOrder = 19;
    this.group.add(this.siltGroup);

    const geo = new THREE.PlaneGeometry(1.0, 1.0);
    for (let i = 0; i < this.maxSiltClouds; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.siltTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 19;
      this.siltGroup.add(mesh);

      this.siltPool.push({
        mesh,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vRot: 0,
        scale: 0.5,
        maxScale: 1.8,
        life: 0,
        maxLife: 1.5,
        active: false,
      });
    }
  }

  /**
   * Initializes the swirling turquoise propulsion slipstream wake behind the diver's fins
   * matching the reference screenshots.
   */
  private initPropulsionWake(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 64);
      const grad = ctx.createRadialGradient(64, 32, 4, 64, 32, 54);
      grad.addColorStop(0.0, 'rgba(204, 251, 241, 0.75)');
      grad.addColorStop(0.4, 'rgba(56, 248, 255, 0.42)');
      grad.addColorStop(0.75, 'rgba(20, 184, 166, 0.16)');
      grad.addColorStop(1.0, 'rgba(13, 148, 136, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(64, 32, 54, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    this.wakeTex = new THREE.CanvasTexture(canvas);
    this.wakeGroup.renderOrder = 20;
    this.group.add(this.wakeGroup);

    const geo = new THREE.PlaneGeometry(1.35, 0.68);
    for (let i = 0; i < this.maxWakeNodes; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.wakeTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 20;
      this.wakeGroup.add(mesh);

      this.wakePool.push({
        mesh,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        scale: 1,
        life: 0,
        maxLife: 0.65,
        active: false,
      });
    }
  }

  public spawnBubble(
    x: number,
    y: number,
    vx = 0,
    vy = 2.0,
    scale = 1.0,
    maxLife = 4.0
  ): void {
    let slot = this.bubbles.findIndex((b) => !b.active);
    if (slot === -1) {
      slot = Math.floor(Math.random() * this.maxBubbles);
    }

    const b = this.bubbles[slot];
    b.x = x + (Math.random() - 0.5) * 0.14;
    b.y = y + (Math.random() - 0.5) * 0.08;
    b.vx = vx + (Math.random() - 0.5) * 0.45;
    b.vy = vy + Math.random() * 0.75;
    b.scale = scale * (0.55 + Math.random() * 0.65);
    b.life = 0;
    b.maxLife = maxLife;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.active = true;
  }

  public spawnBubbleBurst(x: number, y: number, count = 6): void {
    for (let i = 0; i < count; i++) {
      this.spawnBubble(
        x,
        y,
        (Math.random() - 0.5) * 1.8,
        1.4 + Math.random() * 2.2,
        0.7 + Math.random() * 0.65,
        2.6 + Math.random() * 1.8
      );
    }
  }

  /**
   * Spawns a propulsion bubble burst & slipstream wake behind the diver's fins during dash/thrust.
   */
  public spawnPropulsionBurst(
    finX: number,
    finY: number,
    facing: 1 | -1,
    pitch: number,
    isBoost: boolean
  ): void {
    const backDirX = -Math.cos(pitch) * facing;
    const backDirY = -Math.sin(pitch) * facing;

    // 1. Spawn wake ribbon puff
    let wSlot = this.wakePool.findIndex((w) => !w.active);
    if (wSlot === -1) wSlot = Math.floor(Math.random() * this.maxWakeNodes);
    const w = this.wakePool[wSlot];
    w.x = finX + (Math.random() - 0.5) * 0.12;
    w.y = finY + (Math.random() - 0.5) * 0.12;
    w.vx = backDirX * (isBoost ? 2.4 : 1.1) + (Math.random() - 0.5) * 0.35;
    w.vy = backDirY * (isBoost ? 2.4 : 1.1) + (Math.random() - 0.5) * 0.35;
    w.rot = pitch + (Math.random() - 0.5) * 0.25;
    w.scale = isBoost ? 1.15 : 0.72;
    w.life = 0;
    w.maxLife = isBoost ? 0.68 : 0.45;
    w.active = true;
    w.mesh.visible = true;
    w.mesh.position.set(w.x, w.y, 0.16);
    w.mesh.rotation.z = w.rot;

    // 2. Spawn propulsion bubbles kicked backward by the fins
    const bubbleCount = isBoost ? 3 : 1;
    for (let i = 0; i < bubbleCount; i++) {
      this.spawnBubble(
        finX + (Math.random() - 0.5) * 0.25,
        finY + (Math.random() - 0.5) * 0.25,
        backDirX * (isBoost ? 3.2 : 1.5) + (Math.random() - 0.5) * 1.1,
        backDirY * 1.2 + 1.0 + Math.random() * 1.4,
        isBoost ? 0.85 : 0.55,
        1.8 + Math.random() * 1.4
      );
    }
  }

  /**
   * Spawns disturbed silt/sediment clouds when the diver touches or skims the cave floor/walls.
   */
  public spawnSiltCloud(
    contactX: number,
    contactY: number,
    normalX: number,
    normalY: number,
    intensity = 1.0
  ): void {
    if (this.time - this.lastSiltSpawnTime < 0.06) return;
    this.lastSiltSpawnTime = this.time;

    const count = intensity > 0.75 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      let slot = this.siltPool.findIndex((s) => !s.active);
      if (slot === -1) slot = Math.floor(Math.random() * this.maxSiltClouds);

      const s = this.siltPool[slot];
      const tangentX = -normalY;
      const tangentY = normalX;
      const spread = (Math.random() - 0.5) * 0.85;

      s.x = contactX + normalX * 0.18 + tangentX * spread;
      s.y = contactY + normalY * 0.18 + tangentY * spread;
      s.vx = normalX * (0.45 + Math.random() * 0.55) + tangentX * spread * 1.2;
      s.vy = normalY * (0.45 + Math.random() * 0.65) + 0.15;
      s.rot = Math.random() * Math.PI * 2;
      s.vRot = (Math.random() - 0.5) * 1.1;
      s.scale = 0.45 + Math.random() * 0.25;
      s.maxScale = (1.45 + Math.random() * 0.85) * Math.max(0.65, intensity);
      s.life = 0;
      s.maxLife = 1.25 + Math.random() * 0.65;
      s.active = true;

      s.mesh.visible = true;
      s.mesh.position.set(s.x, s.y, 0.14);
      s.mesh.rotation.z = s.rot;
      s.mesh.scale.set(s.scale, s.scale, 1);
    }
  }

  public update(
    delta: number,
    cameraPos: THREE.Vector3,
    diverRegulatorPos: THREE.Vector3,
    isDiverMoving: boolean,
    isBurst: boolean,
    options?: {
      isBoost?: boolean;
      finPos?: THREE.Vector3;
      facing?: 1 | -1;
      pitch?: number;
      beamOrigin?: THREE.Vector2;
      beamDir?: THREE.Vector2;
    }
  ): void {
    this.time += delta;

    // 1. Update Marine Snow & Flashlight Dust Motes
    this.marineMat.uniforms.uTime.value = this.time;
    if (options?.beamOrigin) {
      this.marineMat.uniforms.uBeamOrigin.value.copy(options.beamOrigin);
    } else {
      this.marineMat.uniforms.uBeamOrigin.value.set(diverRegulatorPos.x, diverRegulatorPos.y);
    }
    if (options?.beamDir) {
      this.marineMat.uniforms.uBeamDir.value.copy(options.beamDir);
    }

    const posAttr = this.marineGeo.attributes.position;
    const viewW = 36;
    const viewH = 24;

    for (let i = 0; i < this.marineCount; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);

      x += Math.sin(this.time * 0.85 + i) * 0.014 + this.marineVelocities[i * 2] * delta;
      y += this.marineVelocities[i * 2 + 1] * delta;

      if (x < cameraPos.x - viewW / 2) x += viewW;
      if (x > cameraPos.x + viewW / 2) x -= viewW;
      if (y < cameraPos.y - viewH / 2) y += viewH;
      if (y > cameraPos.y + viewH / 2) y -= viewH;

      posAttr.setXY(i, x, y);
    }
    posAttr.needsUpdate = true;

    // 2. Exhale Bubble Trails behind Diver Helmet
    this.diverBubbleTimer += delta;
    const isBoost = Boolean(options?.isBoost);
    const emitInterval = isBoost ? 0.16 : isDiverMoving ? 0.34 : 0.95;

    if (this.diverBubbleTimer >= emitInterval) {
      this.diverBubbleTimer = 0;
      // Emit a cluster of 1-2 helmet exhale bubbles
      const count = isDiverMoving ? 2 : 1;
      for (let c = 0; c < count; c++) {
        this.spawnBubble(
          diverRegulatorPos.x + (Math.random() - 0.5) * 0.12,
          diverRegulatorPos.y + c * 0.08,
          (Math.random() - 0.5) * 0.45,
          2.0 + Math.random() * 0.95,
          0.62 + Math.random() * 0.48,
          3.2 + Math.random() * 1.0
        );
      }
    }

    // 3. Propulsion Bubble Burst & Slipstream Wake on swim / dash
    if (isDiverMoving && options?.finPos) {
      this.wakeEmitTimer += delta;
      const wakeInterval = isBoost ? 0.045 : 0.12;
      if (this.wakeEmitTimer >= wakeInterval) {
        this.wakeEmitTimer = 0;
        this.spawnPropulsionBurst(
          options.finPos.x,
          options.finPos.y,
          options.facing ?? 1,
          options.pitch ?? 0,
          isBoost
        );
      }
    }

    if (isBurst) {
      this.spawnBubbleBurst(diverRegulatorPos.x, diverRegulatorPos.y, 5);
    }

    // 4. Rising Background Bubble Streams (emit for streams near camera view)
    for (let i = 0; i < this.bgBubbleEmitters.length; i++) {
      const em = this.bgBubbleEmitters[i];
      if (
        Math.abs(em.x - cameraPos.x) > 28 ||
        Math.abs(em.y - cameraPos.y) > 22
      ) {
        continue;
      }
      em.timer += delta;
      if (em.timer >= em.interval) {
        em.timer = 0;
        this.spawnBubble(
          em.x + (Math.random() - 0.5) * em.spread,
          em.y,
          (Math.random() - 0.5) * 0.25,
          1.85 + Math.random() * 0.85,
          0.55 + Math.random() * 0.55,
          4.5 + Math.random() * 2.0
        );
      }
    }

    // 5. Update and render active bubbles
    for (let i = 0; i < this.maxBubbles; i++) {
      const b = this.bubbles[i];
      if (!b.active) continue;

      b.life += delta;
      if (b.life >= b.maxLife || b.y >= -0.15) {
        b.active = false;
        this.dummy.position.set(0, 1000, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.bubbleMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Hydrodynamic drag on horizontal velocity + upward buoyancy
      b.vx *= Math.max(0, 1 - 2.4 * delta);
      b.y += b.vy * delta;
      b.x += Math.sin(this.time * 5.8 + b.wobblePhase) * 0.028 + b.vx * delta;
      const progress = b.life / b.maxLife;
      const fadeOut = 1.0 - Math.pow(progress, 3.0);
      const curScale = b.scale * (0.85 + progress * 0.55) * fadeOut;

      this.dummy.position.set(b.x, b.y, 0.18);
      this.dummy.scale.set(curScale, curScale, 1);
      this.dummy.updateMatrix();
      this.bubbleMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.bubbleMesh.instanceMatrix.needsUpdate = true;

    // 6. Update Disturbed Silt/Dust Clouds
    for (let i = 0; i < this.maxSiltClouds; i++) {
      const s = this.siltPool[i];
      if (!s.active) continue;

      s.life += delta;
      if (s.life >= s.maxLife) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }

      const p = s.life / s.maxLife;
      s.vx *= Math.max(0, 1 - 2.2 * delta);
      s.vy *= Math.max(0, 1 - 1.8 * delta);
      s.x += s.vx * delta;
      s.y += s.vy * delta;
      s.rot += s.vRot * delta;

      const curScale = THREE.MathUtils.lerp(s.scale, s.maxScale, Math.sqrt(p));
      const alpha = Math.sin(p * Math.PI) * 0.65;

      s.mesh.position.set(s.x, s.y, 0.14);
      s.mesh.rotation.z = s.rot;
      s.mesh.scale.set(curScale, curScale, 1);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    // 7. Update Propulsion Wake Nodes
    for (let i = 0; i < this.maxWakeNodes; i++) {
      const w = this.wakePool[i];
      if (!w.active) continue;

      w.life += delta;
      if (w.life >= w.maxLife) {
        w.active = false;
        w.mesh.visible = false;
        continue;
      }

      const p = w.life / w.maxLife;
      w.vx *= Math.max(0, 1 - 3.5 * delta);
      w.vy *= Math.max(0, 1 - 3.5 * delta);
      w.x += w.vx * delta;
      w.y += w.vy * delta;

      const scaleX = w.scale * (1.0 + p * 0.85);
      const scaleY = w.scale * (1.0 + p * 0.45);
      const alpha = (1.0 - p) * (1.0 - p) * 0.58;

      w.mesh.position.set(w.x, w.y, 0.16);
      w.mesh.scale.set(scaleX, scaleY, 1);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    }
  }

  public destroy(): void {
    if (this.marineGeo) this.marineGeo.dispose();
    if (this.marineMat) this.marineMat.dispose();
    if (this.bubbleMesh) {
      this.bubbleMesh.geometry.dispose();
      (this.bubbleMesh.material as THREE.Material).dispose();
    }
    if (this.bubbleTex) this.bubbleTex.dispose();
    if (this.siltTex) this.siltTex.dispose();
    if (this.wakeTex) this.wakeTex.dispose();

    this.siltPool.forEach((s) => {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    this.wakePool.forEach((w) => {
      w.mesh.geometry.dispose();
      (w.mesh.material as THREE.Material).dispose();
    });
  }
}
