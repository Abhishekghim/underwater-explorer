import * as THREE from 'three';
import { WorldBounds, BiomeZone, NearbyArtifactInfo } from './types';
import { AssetLoader } from './AssetLoader';
import {
  ArtifactDefinition,
  LandmarkDefinition,
} from './artifactData';
import { journalManager } from './JournalManager';
import { CaveSystem } from './CaveSystem';
import { UnderseaBackgroundSystem } from './UnderseaBackgroundSystem';
import { EXPANDED_WORLD_BOUNDS, CAVE_ENTRANCES_CATALOG } from './mapData';
import { PORTFOLIO_STATIONS } from './portfolioData';
import { ENV_ASSETS } from './envAssets';

interface SurfaceCloud {
  mesh: THREE.Mesh;
  baseX: number;
  speed: number;
}

interface SurfaceBird {
  mesh: THREE.Mesh;
  baseX: number;
  speed: number;
  baseY: number;
  phase: number;
  flapSpeed: number;
  glideTex: THREE.Texture;
  flapTex: THREE.Texture;
}

interface SurfaceBoat {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
}

export class World {
  public group: THREE.Group;
  public bounds: WorldBounds = EXPANDED_WORLD_BOUNDS;

  private distantLayer: THREE.Group;
  private midgroundLayer: THREE.Group;
  private foregroundLayer: THREE.Group;
  private surfaceGroup: THREE.Group;
  private skyFollowGroup: THREE.Group;

  public caveSystem: CaveSystem;
  public underseaBackground: UnderseaBackgroundSystem;
  private artifactMeshes: { def: ArtifactDefinition; mesh: THREE.Mesh; haloMesh: THREE.Mesh }[] = [];
  private stationBeacons: { mesh: THREE.Mesh; baseOpacity: number; phase: number }[] = [];
  private landmarkPoints: LandmarkDefinition[] = [];
  private nearbyArtifact: NearbyArtifactInfo | null = null;

  // Surface atmospheric elements
  private clouds: SurfaceCloud[] = [];
  private birds: SurfaceBird[] = [];
  private researchBoat: SurfaceBoat | null = null;
  private waveMesh!: THREE.Mesh;
  private waveLine!: THREE.Line;
  private rippleLines: THREE.Line[] = [];
  private wavePointsCount = 180;
  private causticsOverlayMesh!: THREE.Mesh;
  private causticsOverlayMat!: THREE.ShaderMaterial;
  private surfaceSunShafts: THREE.ShaderMaterial[] = [];
  private backdropMesh!: THREE.Mesh;
  private time = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'world_group';

    this.distantLayer = new THREE.Group();
    this.distantLayer.position.z = -10;

    this.midgroundLayer = new THREE.Group();
    this.midgroundLayer.position.z = -4;

    this.foregroundLayer = new THREE.Group();
    this.foregroundLayer.position.z = 0;

    this.surfaceGroup = new THREE.Group();
    this.surfaceGroup.position.z = 0.12;

    this.skyFollowGroup = new THREE.Group();
    this.skyFollowGroup.position.z = -12;
    this.surfaceGroup.add(this.skyFollowGroup);

    // 1. Build the realistic ocean & sky gradient matching portfolio/css/theme.css & js/surface.js
    this.buildBackdrop();

    // 2. Build multi-plane undersea background system with 2K assets & underwater color grading
    this.underseaBackground = new UnderseaBackgroundSystem();
    this.group.add(this.underseaBackground.distantGroup);
    this.group.add(this.underseaBackground.midgroundGroup);
    this.group.add(this.underseaBackground.foregroundGroup);

    this.group.add(this.distantLayer);
    this.group.add(this.midgroundLayer);
    this.group.add(this.foregroundLayer);
    this.group.add(this.surfaceGroup);

    // 3. Build the surface atmosphere matching portfolio/js/surface.js:
    //    sun + radial corona, soft clouds, compact soaring seabirds, left-waterline sailboat, wave ripples & caustics
    this.buildSurface();

    // 4. Build physical solid cave labyrinth & environmental formations
    this.caveSystem = new CaveSystem();
    this.group.add(this.caveSystem.group);

    // 5. Build subtle bioluminescent cavern beacons at each Portfolio Station
    this.buildPortfolioStationBeacons();
  }

  public getCaveSystem(): CaveSystem {
    return this.caveSystem;
  }

  /**
   * Continuous realistic sky & ocean gradient matching portfolio/js/surface.js and css/theme.css
   */
  private buildBackdrop(): void {
    const width = 420;
    const height = 260;
    const segmentsY = 260;

    const geo = new THREE.PlaneGeometry(width, height, 1, segmentsY);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Airy Daylight Sky (Y > 0) — exact stops from portfolio/js/surface.js:
    // rgb(120,190,232) -> rgb(150,210,235) -> rgb(206,236,242)
    const cSkyTop  = new THREE.Color(0x78bee8);
    const cSkyMid  = new THREE.Color(0x96d2eb);
    const cSkyHaze = new THREE.Color(0xceecf2);

    // Deep Oceanic Underwater (Y <= 0)
    const cSeaShallow  = new THREE.Color(0x3a96b6); // rgb(58,150,182) at waterline from surface.js
    const cSeaUpper    = new THREE.Color(0x26b0c6);
    const cSeaMid      = new THREE.Color(0x209cb4);
    const cSeaDeep     = new THREE.Color(0x1b88a0);
    const cSeaTwilight = new THREE.Color(0x17768e);
    const cSeaMidnight = new THREE.Color(0x13657c);
    const cDeepMid     = new THREE.Color(0x10566b);
    const cTrench      = new THREE.Color(0x0d495c);
    const cHadal       = new THREE.Color(0x0b3f50);
    const cAbyss       = new THREE.Color(0x093545);

    const tempColor = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) - 65;

      if (y > 0) {
        if (y >= 9.5) {
          tempColor.copy(cSkyTop);
        } else if (y >= 4.0) {
          const t = (9.5 - y) / 5.5;
          tempColor.copy(cSkyTop).lerp(cSkyMid, t);
        } else {
          const t = (4.0 - y) / 4.0;
          tempColor.copy(cSkyMid).lerp(cSkyHaze, t);
        }
      } else {
        if (y >= -5) {
          const t = -y / 5;
          tempColor.copy(cSeaShallow).lerp(cSeaUpper, t);
        } else if (y >= -18) {
          const t = (-5 - y) / 13;
          tempColor.copy(cSeaUpper).lerp(cSeaMid, t);
        } else if (y >= -35) {
          const t = (-18 - y) / 17;
          tempColor.copy(cSeaMid).lerp(cSeaDeep, t);
        } else if (y >= -55) {
          const t = (-35 - y) / 20;
          tempColor.copy(cSeaDeep).lerp(cSeaTwilight, t);
        } else if (y >= -75) {
          const t = (-55 - y) / 20;
          tempColor.copy(cSeaTwilight).lerp(cSeaMidnight, t);
        } else if (y >= -95) {
          const t = (-75 - y) / 20;
          tempColor.copy(cSeaMidnight).lerp(cDeepMid, t);
        } else if (y >= -115) {
          const t = (-95 - y) / 20;
          tempColor.copy(cDeepMid).lerp(cTrench, t);
        } else if (y >= -126) {
          const t = (-115 - y) / 11;
          tempColor.copy(cTrench).lerp(cHadal, t);
        } else if (y >= -132) {
          const t = (-126 - y) / 6;
          tempColor.copy(cHadal).lerp(cAbyss, t);
        } else {
          tempColor.copy(cAbyss);
        }
      }

      colors[i * 3]     = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      depthWrite: false,
    });

    this.backdropMesh = new THREE.Mesh(geo, mat);
    this.backdropMesh.position.set(0, -65, -16);
    this.backdropMesh.renderOrder = -30;
    this.group.add(this.backdropMesh);
  }

  /**
   * Builds the above-water sky scene and surface waterline matching portfolio/js/surface.js:
   * 1. Warm ambient sun disc & multi-stop radial corona glow at upper-right of viewport
   * 2. Soft ethereal volumetric drifting clouds high in the sky
   * 3. Compact, graceful soaring seabirds high in the upper sky (above hero text)
   * 4. Charming Exploration Sailboat (`sailboat.svg`) resting on the left waterline (outside hero text column)
   * 5. Undulating ocean waterline surface wave ribbon, foam crest & 6 subtle wave ripple bands
   * 6. Scrolling water-ripple light caustics & descending sun shafts
   */
  private buildSurface(): void {
    const loader = AssetLoader.getInstance();

    // 1. Warm Ambient Sun Disc & Soft Multi-Stop Radial Corona Glow (matching surface.js)
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 256;
    sunCanvas.height = 256;
    const sctx = sunCanvas.getContext('2d');
    if (sctx) {
      const sg = sctx.createRadialGradient(128, 128, 0, 128, 128, 124);
      sg.addColorStop(0.0, 'rgba(255, 252, 235, 0.98)');
      sg.addColorStop(0.08, 'rgba(255, 250, 225, 0.85)');
      sg.addColorStop(0.22, 'rgba(255, 245, 210, 0.48)');
      sg.addColorStop(0.50, 'rgba(255, 240, 200, 0.14)');
      sg.addColorStop(1.0, 'rgba(255, 240, 200, 0.0)');
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 256, 256);
    }
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      depthWrite: false,
    });
    const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 14.5), sunMat);
    // Relative to skyFollowGroup (centered on camera X): sits at X = +9.5 (80% viewport width), Y = 6.6
    sunMesh.position.set(9.5, 6.6, -2.0);
    sunMesh.renderOrder = -26;
    this.skyFollowGroup.add(sunMesh);

    // 2. Soft Ethereal Volumetric Clouds high in the sky (matching surface.js a: 0.18..0.32)
    const cloudConfigs = [
      { x: -16, y: 7.4, w: 6.2, h: 2.5, path: '/assets/silhouettes/cloud-volumetric-1.svg', speed: 0.35, opacity: 0.28 },
      { x: -7,  y: 8.3, w: 7.4, h: 3.0, path: '/assets/silhouettes/cloud-volumetric-2.svg', speed: 0.48, opacity: 0.32 },
      { x: 2,   y: 6.9, w: 5.8, h: 2.3, path: '/assets/silhouettes/cloud-volumetric-1.svg', speed: 0.30, opacity: 0.24 },
      { x: 11,  y: 8.0, w: 6.8, h: 2.7, path: '/assets/silhouettes/cloud-volumetric-2.svg', speed: 0.42, opacity: 0.28 },
      { x: 19,  y: 7.2, w: 6.0, h: 2.4, path: '/assets/silhouettes/cloud-volumetric-1.svg', speed: 0.38, opacity: 0.26 },
    ];

    cloudConfigs.forEach((c) => {
      const mesh = loader.createTexturedPlane(c.path, c.w, c.h, {
        opacity: c.opacity,
        depthWrite: false,
      });
      mesh.position.set(c.x, c.y, -1.0);
      mesh.renderOrder = -25;
      this.skyFollowGroup.add(mesh);
      this.clouds.push({ mesh, baseX: c.x, speed: c.speed });
    });

    // 3. Small, Distant Soaring Seabirds high in upper sky (matching surface.js w: 22-32px, a: 0.45-0.65)
    const birdConfigs = [
      { x: -12, y: 7.8, speed: 1.15, phase: 0.2, flapSpeed: 4.2, w: 0.82 },
      { x: -3,  y: 8.5, speed: 1.40, phase: 1.8, flapSpeed: 4.8, w: 0.72 },
      { x: 5,   y: 7.5, speed: 1.25, phase: 3.4, flapSpeed: 4.0, w: 0.78 },
      { x: 13,  y: 8.2, speed: 1.55, phase: 5.1, flapSpeed: 5.0, w: 0.68 },
    ];

    const glideTex = loader.loadTexture('/assets/silhouettes/seabird-glide.svg');
    const flapTex  = loader.loadTexture('/assets/silhouettes/seabird-flap.svg');

    birdConfigs.forEach((b) => {
      const mesh = loader.createTexturedPlane(
        '/assets/silhouettes/seabird-glide.svg',
        b.w,
        b.w * 0.45,
        {
          opacity: 0.58,
          depthWrite: false,
        }
      );
      mesh.position.set(b.x, b.y, -0.5);
      mesh.renderOrder = -24;
      this.skyFollowGroup.add(mesh);
      this.birds.push({
        mesh,
        baseX: b.x,
        speed: b.speed,
        baseY: b.y,
        phase: b.phase,
        flapSpeed: b.flapSpeed,
        glideTex,
        flapTex,
      });
    });

    // 4. 2K Dive Research Boat (`research_boat.webp`) floating on the left waterline
    //    with submerged red/blue lower hull & propeller with underwater caustic shimmer
    const rbAspect = ENV_ASSETS.research_boat.aspect;
    const rbW = 10.5;
    const rbH = rbW / rbAspect;
    const rbTex = loader.loadTexture(ENV_ASSETS.research_boat.url, {
      mipmaps: true,
      anisotropy: 8,
    });
    const rbMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: rbTex },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(map, vUv);
          float a = smoothstep(0.15, 0.70, t.a);
          if (a < 0.01) discard;

          // Above vUv.y = 0.44 is above-water cabin/deck; below is submerged hull & propeller
          float submergeMask = 1.0 - smoothstep(0.38, 0.48, vUv.y);
          vec3 underCol = mix(t.rgb * vec3(0.55, 0.88, 0.98), vec3(0.12, 0.58, 0.72), 0.38);
          // Subtle underwater caustic ripple across the submerged hull
          float caustic = 0.5 + 0.5 * sin(vUv.x * 28.0 + uTime * 2.6) * cos(vUv.y * 22.0 - uTime * 1.9);
          underCol += vec3(0.22, 0.85, 0.95) * pow(caustic, 3.0) * 0.28;

          vec3 finalCol = mix(t.rgb, underCol, submergeMask);
          gl_FragColor = vec4(finalCol, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rbMesh = new THREE.Mesh(new THREE.PlaneGeometry(rbW, rbH), rbMat);
    const rbBaseX = -28.8;
    const rbBaseY = 0.42;
    rbMesh.position.set(rbBaseX, rbBaseY, 0.05);
    rbMesh.renderOrder = 4;
    this.surfaceGroup.add(rbMesh);
    this.researchBoat = { mesh: rbMesh, baseX: rbBaseX, baseY: rbBaseY };

    // 5. Scrolling Water Ripple Light Caustics Overlay (Y: 0 down to Y: -32)
    const causticsW = 280;
    const causticsH = 34;
    const causticsGeo = new THREE.PlaneGeometry(causticsW, causticsH);
    this.causticsOverlayMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec2 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xy;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec2 vWorldPos;

        float causticPattern(vec2 p, float t) {
          vec2 i = p;
          float c = 0.0;
          float inten = 0.05;
          for (int n = 0; n < 3; n++) {
            float ft = t * (1.0 - (3.2 / float(n + 1)));
            i = p + vec2(
              cos(ft - i.x) + sin(ft + i.y),
              sin(ft - i.y) + cos(ft + i.x)
            );
            c += 1.0 / length(vec2(
              p.x / (sin(i.x + ft) / inten),
              p.y / (cos(i.y + ft) / inten)
            ));
          }
          c /= 3.0;
          c = 1.15 - pow(c, 1.35);
          return pow(abs(c), 7.5);
        }

        void main() {
          float depthFade = pow(smoothstep(0.0, 0.96, vUv.y), 1.65) * smoothstep(1.0, 0.97, vUv.y);
          if (depthFade < 0.005) discard;

          vec2 p = vec2(vWorldPos.x * 0.24, vWorldPos.y * 0.32);
          float c1 = causticPattern(p + vec2(uTime * 0.12, -uTime * 0.06), uTime * 0.85);
          float c2 = causticPattern(p * 1.35 - vec2(uTime * 0.09, uTime * 0.05), uTime * 0.65 + 2.4);
          float net = clamp((c1 + c2 * 0.75), 0.0, 1.0);

          float surfaceCrestGlow = pow(smoothstep(0.82, 0.99, vUv.y), 2.5) *
            (0.45 + 0.55 * sin(vWorldPos.x * 1.4 + uTime * 2.5));

          float alpha = (net * 0.30 + surfaceCrestGlow * 0.24) * depthFade;
          if (alpha < 0.003) discard;

          vec3 col = mix(vec3(0.28, 0.92, 0.98), vec3(0.82, 0.99, 1.0), clamp(net + surfaceCrestGlow, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.causticsOverlayMesh = new THREE.Mesh(causticsGeo, this.causticsOverlayMat);
    this.causticsOverlayMesh.position.set(0, -17.0, 0.05);
    this.causticsOverlayMesh.renderOrder = 6;
    this.surfaceGroup.add(this.causticsOverlayMesh);

    // 6. Descending Surface Sun Shafts ("God Rays")
    const shaftPositions = [-82, -54, -26, -12, 8, 34, 62, 88];
    shaftPositions.forEach((sx, idx) => {
      const shaftW = 9.5 + (idx % 3) * 3.2;
      const shaftH = 26.0 + (idx % 2) * 8.0;
      const shaftGeo = new THREE.PlaneGeometry(shaftW, shaftH);
      shaftGeo.translate(0, -shaftH * 0.5, 0);

      const shaftMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: idx * 2.3 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uSeed;

          void main() {
            float horiz = pow(max(0.0, sin(vUv.x * 3.14159265)), 1.6);
            float streaks = 0.65 +
              0.22 * sin(vUv.x * 16.0 + uTime * 0.75 + uSeed) +
              0.13 * cos(vUv.x * 28.0 - uTime * 1.1 + uSeed * 1.7);
            float vert = pow(smoothstep(0.0, 0.94, vUv.y), 1.25) * smoothstep(1.0, 0.92, vUv.y);
            float alpha = horiz * streaks * vert * 0.22;
            if (alpha < 0.002) discard;

            vec3 col = mix(vec3(0.28, 0.90, 0.98), vec3(0.78, 0.99, 1.0), vUv.y);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      shaftMesh.position.set(sx, -0.15, -2.5);
      shaftMesh.rotation.z = 0.20 + ((idx % 3) - 1) * 0.05;
      shaftMesh.renderOrder = -4;
      this.surfaceGroup.add(shaftMesh);
      this.surfaceSunShafts.push(shaftMat);
    });

    // 7. Undulating Ocean Waterline Surface Wave Mesh at Y = 0
    const waveW = 320;
    const waveH = 1.0;
    const waveCols = 160;
    const waveMeshGeo = new THREE.PlaneGeometry(waveW, waveH, waveCols, 1);
    const waveMeshMat = new THREE.MeshBasicMaterial({
      color: 0x3a96b6,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.waveMesh = new THREE.Mesh(waveMeshGeo, waveMeshMat);
    this.waveMesh.position.set(0, -0.22, 0.06);
    this.surfaceGroup.add(this.waveMesh);

    // 8. Bright White Foam Crest Line at Y = 0 + 5 Horizontal Wave Ripple Bands (from surface.js)
    const minX = -160;
    const maxX = 160;
    const step = (maxX - minX) / this.wavePointsCount;

    const wavePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= this.wavePointsCount; i++) {
      wavePoints.push(new THREE.Vector3(minX + i * step, 0, 0.08));
    }

    const waveLineGeo = new THREE.BufferGeometry().setFromPoints(wavePoints);
    const waveLineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
      linewidth: 2,
    });
    this.waveLine = new THREE.Line(waveLineGeo, waveLineMat);
    this.surfaceGroup.add(this.waveLine);

    // 5 subtle horizontal wave ripple bands right below the waterline (matching surface.js)
    for (let r = 0; r < 5; r++) {
      const rPoints: THREE.Vector3[] = [];
      const baseY = -0.55 - r * 0.65;
      for (let i = 0; i <= this.wavePointsCount; i++) {
        rPoints.push(new THREE.Vector3(minX + i * step, baseY, 0.07));
      }
      const rGeo = new THREE.BufferGeometry().setFromPoints(rPoints);
      const rMat = new THREE.LineBasicMaterial({
        color: 0xdcf6fc,
        transparent: true,
        opacity: 0.20 - r * 0.025,
      });
      const rLine = new THREE.Line(rGeo, rMat);
      this.surfaceGroup.add(rLine);
      this.rippleLines.push(rLine);
    }
  }

  /**
   * Builds subtle glowing cyan ambient light halos in the caverns behind each Portfolio Station
   */
  private buildPortfolioStationBeacons(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      g.addColorStop(0.0, 'rgba(0, 212, 255, 0.55)');
      g.addColorStop(0.45, 'rgba(0, 212, 255, 0.18)');
      g.addColorStop(1.0, 'rgba(0, 212, 255, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const beaconTex = new THREE.CanvasTexture(canvas);

    PORTFOLIO_STATIONS.forEach((st, idx) => {
      if (st.section === 'home') return; // Skip surface hero
      const mat = new THREE.MeshBasicMaterial({
        map: beaconTex,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 8.5), mat);
      mesh.position.set(st.worldX, st.worldY, -1.2);
      mesh.renderOrder = -2;
      this.foregroundLayer.add(mesh);
      this.stationBeacons.push({
        mesh,
        baseOpacity: 0.45,
        phase: idx * 1.4,
      });
    });
  }

  public update(
    delta: number,
    cameraX: number,
    cameraY: number,
    playerPos?: THREE.Vector3,
    isInteract = false
  ): NearbyArtifactInfo | null {
    this.time += delta;

    // 1. Update cave system with camera coordinates
    this.caveSystem.update(delta, cameraX, cameraY);

    // 2. Update multi-plane undersea background parallax
    this.underseaBackground.update(delta, cameraX, cameraY);

    // 3. Keep sky group gently following camera X so the sun, clouds & seabirds stay framed in the sky
    this.skyFollowGroup.position.x = cameraX;

    // 4. Animate surface sky elements, sailboat, wave ripples, caustics & sun shafts
    this.updateSurface(delta);

    // 5. Parallax background layer offsets
    this.distantLayer.position.x = cameraX * 0.25;
    this.distantLayer.position.y = cameraY * 0.15;

    this.midgroundLayer.position.x = cameraX * 0.50;
    this.midgroundLayer.position.y = cameraY * 0.30;

    // 6. Animate portfolio station cavern beacons
    for (let i = 0; i < this.stationBeacons.length; i++) {
      const b = this.stationBeacons[i];
      (b.mesh.material as THREE.MeshBasicMaterial).opacity =
        b.baseOpacity * (0.78 + 0.22 * Math.sin(this.time * 1.8 + b.phase));
    }

    // 7. Proximity checks for Biomes, Landmarks, Cave Entrances, and Artifacts
    if (playerPos) {
      journalManager.recordSector(playerPos.x, playerPos.y);

      const zone = this.getZoneAtY(playerPos.y);
      journalManager.recordBiome(zone);

      for (let i = 0; i < this.landmarkPoints.length; i++) {
        const lm = this.landmarkPoints[i];
        const dx = playerPos.x - lm.worldPosition.x;
        const dy = playerPos.y - lm.worldPosition.y;
        if (dx * dx + dy * dy <= lm.discoveryRadius * lm.discoveryRadius) {
          journalManager.recordLandmark(lm.id);
        }
      }

      for (let i = 0; i < CAVE_ENTRANCES_CATALOG.length; i++) {
        const ent = CAVE_ENTRANCES_CATALOG[i];
        const dx = playerPos.x - ent.worldPosition.x;
        const dy = playerPos.y - ent.worldPosition.y;
        if (dx * dx + dy * dy <= ent.radius * ent.radius) {
          journalManager.recordEntrance(ent.id, ent.name, ent.description);
        }
      }

      let foundNearby: NearbyArtifactInfo | null = null;
      const interactRadiusSq = 3.4 * 3.4;

      for (let i = 0; i < this.artifactMeshes.length; i++) {
        const item = this.artifactMeshes[i];
        const dx = playerPos.x - item.def.worldPosition.x;
        const dy = playerPos.y - item.def.worldPosition.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= interactRadiusSq) {
          const isDiscovered = journalManager.isArtifactDiscovered(item.def.id);
          foundNearby = {
            id: item.def.id,
            title: item.def.title,
            category: item.def.category,
            description: item.def.description,
            isDiscovered,
          };

          if (isInteract) {
            journalManager.recordArtifact(item.def.id);
            foundNearby.isDiscovered = true;
          }
          break;
        }
      }

      this.nearbyArtifact = foundNearby;
      return foundNearby;
    }

    return null;
  }

  private updateSurface(delta: number): void {
    // 1. Drifting Clouds across viewport sky
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 22) {
        c.mesh.position.x = -22;
      }
    }

    // 2. Soaring Seabirds high in upper sky
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      b.mesh.position.x += b.speed * delta;
      if (b.mesh.position.x > 20) {
        b.mesh.position.x = -20;
      }
      b.mesh.position.y = b.baseY + Math.sin(this.time * 1.4 + b.phase) * 0.14;
      b.mesh.rotation.z = Math.sin(this.time * 1.4 + b.phase) * 0.08;

      const isFlapping = Math.sin(this.time * b.flapSpeed + b.phase) > 0.18;
      const mat = b.mesh.material as THREE.MeshBasicMaterial;
      const targetTex = isFlapping ? b.flapTex : b.glideTex;
      if (mat.map !== targetTex) {
        mat.map = targetTex;
        mat.needsUpdate = true;
      }
    }

    // 3. Waterline Wave Crest Line Undulation
    if (this.waveLine) {
      const posAttr = this.waveLine.geometry.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const wy = Math.sin(x * 0.18 + this.time * 1.1) * 0.12 + Math.cos(x * 0.09 - this.time * 0.8) * 0.06;
        posAttr.setY(i, wy);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Subtle Horizontal Wave Ripple Bands below waterline (matching surface.js)
    for (let r = 0; r < this.rippleLines.length; r++) {
      const rLine = this.rippleLines[r];
      const posAttr = rLine.geometry.attributes.position;
      const baseY = -0.55 - r * 0.65;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const wy = Math.sin(x * 0.16 + this.time * 0.95 + r) * 0.11;
        posAttr.setY(i, baseY + wy);
      }
      posAttr.needsUpdate = true;
    }

    // 5. Waterline Translucent Surface Wave Ribbon
    if (this.waveMesh) {
      const mPos = this.waveMesh.geometry.attributes.position;
      const mCount = mPos.count;
      for (let i = 0; i < mCount; i++) {
        const x = mPos.getX(i);
        const wy = Math.sin(x * 0.18 + this.time * 1.1) * 0.12 + Math.cos(x * 0.09 - this.time * 0.8) * 0.06;
        if (i < mCount / 2) {
          mPos.setY(i, 0.12 + wy);
        } else {
          mPos.setY(i, -0.55 + wy * 0.25);
        }
      }
      mPos.needsUpdate = true;
    }

    // 6. Bobbing 2K Research Boat at left waterline
    if (this.researchBoat) {
      const wave =
        Math.sin(this.researchBoat.baseX * 0.14 + this.time * 1.6) * 0.18 +
        Math.cos(this.researchBoat.baseX * 0.08 - this.time * 0.9) * 0.10;
      this.researchBoat.mesh.position.y = this.researchBoat.baseY + wave;
      this.researchBoat.mesh.rotation.z =
        Math.sin(this.time * 0.85) * 0.025 + Math.cos(this.time * 1.3) * 0.012;
      (this.researchBoat.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;
    }

    // 7. Update Scrolling Water Caustics Overlay & Descending Sun Shafts
    if (this.causticsOverlayMat) {
      this.causticsOverlayMat.uniforms.uTime.value = this.time;
    }
    for (let i = 0; i < this.surfaceSunShafts.length; i++) {
      this.surfaceSunShafts[i].uniforms.uTime.value = this.time;
    }
  }

  public getNearbyArtifact(): NearbyArtifactInfo | null {
    return this.nearbyArtifact;
  }

  public getZoneAtY(y: number): BiomeZone {
    if (y >= -4) return 'Surface Waters';
    if (y >= -35) return 'Sunlit Shallows';
    if (y >= -75) return 'Twilight Reef';
    if (y >= -105) return 'Midnight Trench';
    return 'Abyssal Depths';
  }

  public destroy(): void {
    this.caveSystem.destroy();
    this.underseaBackground.destroy();
    this.artifactMeshes.forEach((a) => {
      a.mesh.geometry.dispose();
      if (Array.isArray(a.mesh.material)) {
        a.mesh.material.forEach((m) => m.dispose());
      } else {
        a.mesh.material.dispose();
      }
      a.haloMesh.geometry.dispose();
      (a.haloMesh.material as THREE.Material).dispose();
    });
    this.artifactMeshes = [];
    this.stationBeacons.forEach((b) => {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    });
    this.stationBeacons = [];
    this.clouds = [];
    this.birds = [];
    this.researchBoat = null;

    if (this.causticsOverlayMesh) {
      this.causticsOverlayMesh.geometry.dispose();
      this.causticsOverlayMat.dispose();
    }
    this.surfaceSunShafts.forEach((m) => m.dispose());
    this.surfaceSunShafts = [];

    this.rippleLines.forEach((l) => {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
    this.rippleLines = [];

    if (this.waveMesh) {
      this.waveMesh.geometry.dispose();
      (this.waveMesh.material as THREE.Material).dispose();
    }
    if (this.waveLine) {
      this.waveLine.geometry.dispose();
      (this.waveLine.material as THREE.Material).dispose();
    }
    if (this.backdropMesh) {
      this.backdropMesh.geometry.dispose();
      (this.backdropMesh.material as THREE.Material).dispose();
    }
  }
}
