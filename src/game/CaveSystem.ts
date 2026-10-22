import * as THREE from 'three';
import { AssetLoader } from './AssetLoader';
import { LANDMASS_COLLISION_SEGMENTS, MAP_CONFIG } from './landmassCollisionData';
import { ENV_ASSETS, EnvAssetKey } from './envAssets';

export interface CollisionSegment {
  p1: THREE.Vector2;
  p2: THREE.Vector2;
  normal: THREE.Vector2;
}

export interface CollectibleCoin {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  pos: THREE.Vector2;
  baseY: number;
  phase: number;
  collected: boolean;
  value: number;
}

interface AlcoveBubble {
  mesh: THREE.Mesh;
  baseX: number;
  startY: number;
  maxRise: number;
  speed: number;
  phase: number;
}

interface TreasureSparkle {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
  baseScale: number;
}

interface AnimatedHalo {
  mesh: THREE.Mesh;
  baseOpacity: number;
  phase: number;
}

export class CaveSystem {
  public group: THREE.Group;
  public backgroundRocks: THREE.Group;
  public midgroundRocks: THREE.Group;
  public foregroundRocks: THREE.Group;
  public environmentalPropsGroup: THREE.Group;
  public decorGroup: THREE.Group;
  public biolumGroup: THREE.Group;
  public thermalVentsGroup: THREE.Group;

  // Spatial Grid Collision engine
  private segments: CollisionSegment[] = [];
  private gridCellSize = 10;
  private spatialGrid: Map<string, CollisionSegment[]> = new Map();

  // Last floor/wall contact or skim point for triggering disturbed silt clouds
  public lastSiltContact: {
    x: number;
    y: number;
    nx: number;
    ny: number;
    intensity: number;
  } | null = null;

  // Interactive treasure coins & storytelling props
  public chestMesh: THREE.Group = new THREE.Group();
  public chestLidMesh: THREE.Mesh = new THREE.Mesh();
  public chestGlowMesh: THREE.Mesh = new THREE.Mesh();
  public coins: CollectibleCoin[] = [];
  public galleonGroup: THREE.Group = new THREE.Group();
  public schoonerGroup: THREE.Group = new THREE.Group();
  public leviathanGroup: THREE.Group = new THREE.Group();

  // Animated elements
  private alcoveBubbles: AlcoveBubble[] = [];
  private treasureSparkles: TreasureSparkle[] = [];
  private animatedHalos: AnimatedHalo[] = [];
  private swayingFlora: { mesh: THREE.Mesh; baseRotZ: number; phase: number; amp: number }[] = [];
  private time = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cave_system';

    this.backgroundRocks = new THREE.Group();
    this.backgroundRocks.position.z = -6.0;
    this.backgroundRocks.renderOrder = -14;

    this.midgroundRocks = new THREE.Group();
    this.midgroundRocks.position.z = -2.8;
    this.midgroundRocks.renderOrder = -6;

    this.environmentalPropsGroup = new THREE.Group();
    this.environmentalPropsGroup.position.z = -0.05;

    this.foregroundRocks = new THREE.Group();
    this.foregroundRocks.position.z = 0; // Playable solid collision rock layer
    this.foregroundRocks.renderOrder = 5;

    this.decorGroup = new THREE.Group();
    this.decorGroup.position.z = 0.04;
    this.decorGroup.renderOrder = 6;

    this.biolumGroup = new THREE.Group();
    this.biolumGroup.position.z = 0.08;
    this.biolumGroup.renderOrder = 8;

    this.thermalVentsGroup = new THREE.Group();
    this.thermalVentsGroup.position.z = 0.12;
    this.thermalVentsGroup.renderOrder = 10;

    this.group.add(this.backgroundRocks);
    this.group.add(this.midgroundRocks);
    this.group.add(this.environmentalPropsGroup);
    this.group.add(this.foregroundRocks);
    this.group.add(this.decorGroup);
    this.group.add(this.biolumGroup);
    this.group.add(this.thermalVentsGroup);

    // 1. Build the sculpted foreground rock & recessed teal cave archways
    this.buildUserMapLayers();

    // 2. Compile spatial grid from user SVG collision boundaries
    this.buildSpatialGrid();

    // 3. Populate golden treasure chest alcoves with treasure sparkle particles,
    //    plus natural 2K kelp, anemones, and bioluminescent corals with soft alpha glow halos
    this.buildCaveWallDecorAndAlcoves();
  }

  /**
   * Creates the Sculpted Foreground Rock Shader:
   * - Vector-sharp 1-pixel screen-space edge via fwidth(alpha)
   * - Deep pitch-black (#02060d) interior so solid collision rock is 100% unmistakable
   * - Chiselled 2-step slate-teal rock rim (#248eb0 on upward-facing ledges, #12526e on side edges)
   */
  private createSculptedForegroundMaterial(texUrl: string): THREE.ShaderMaterial {
    const loader = AssetLoader.getInstance();
    const texture = loader.loadTexture(texUrl);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        coreColor: { value: new THREE.Color(0x02060d) },
        bevelColor: { value: new THREE.Color(0x082638) },
        rimSideColor: { value: new THREE.Color(0x12526e) },
        rimTopColor: { value: new THREE.Color(0x248eb0) },
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
        uniform vec3 coreColor;
        uniform vec3 bevelColor;
        uniform vec3 rimSideColor;
        uniform vec3 rimTopColor;
        varying vec2 vUv;

        void main() {
          vec4 tex = texture2D(map, vUv);
          float d = fwidth(tex.a);
          float halfWidth = max(d * 0.75, 0.001);
          float a = smoothstep(0.5 - halfWidth, 0.5 + halfWidth, tex.a);
          if (a < 0.01) discard;

          float aUp1   = texture2D(map, vUv + vec2(0.0, 0.0022)).a;
          float aUp2   = texture2D(map, vUv + vec2(0.0, 0.0052)).a;
          float aDown  = texture2D(map, vUv + vec2(0.0, -0.0022)).a;
          float aLeft  = texture2D(map, vUv + vec2(-0.0018, 0.0)).a;
          float aRight = texture2D(map, vUv + vec2(0.0018, 0.0)).a;

          float minNear = min(min(aUp1, aDown), min(aLeft, aRight));

          float aUpFar    = texture2D(map, vUv + vec2(0.0, 0.0065)).a;
          float aDownFar  = texture2D(map, vUv + vec2(0.0, -0.0055)).a;
          float aLeftFar  = texture2D(map, vUv + vec2(-0.0045, 0.0)).a;
          float aRightFar = texture2D(map, vUv + vec2(0.0045, 0.0)).a;
          float minFar = min(min(aUpFar, aDownFar), min(aLeftFar, aRightFar));

          float outerRim = 1.0 - smoothstep(0.25, 0.75, minNear);
          float innerBevel = 1.0 - smoothstep(0.25, 0.75, minFar);
          float topLedge = 1.0 - smoothstep(0.25, 0.75, min(aUp1, aUp2));

          vec3 col = mix(coreColor, bevelColor, innerBevel * 0.85);
          vec3 rimCol = mix(rimSideColor, rimTopColor, topLedge);
          col = mix(col, rimCol, outerRim * 0.92);

          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Creates a Hollow Recessed Cave Archway Material
   */
  private createRecessedArchwayMaterial(
    texUrl: string,
    archColorHex: number,
    rimColorHex: number,
    radiusUvX: number,
    radiusUvY: number,
    opacity: number
  ): THREE.ShaderMaterial {
    const loader = AssetLoader.getInstance();
    const texture = loader.loadTexture(texUrl);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        archColor: { value: new THREE.Color(archColorHex) },
        rimColor: { value: new THREE.Color(rimColorHex) },
        uRadius: { value: new THREE.Vector2(radiusUvX, radiusUvY) },
        uOpacity: { value: opacity },
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
        uniform vec3 archColor;
        uniform vec3 rimColor;
        uniform vec2 uRadius;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          float a0 = texture2D(map, vUv).a;
          float a1 = texture2D(map, vUv + vec2(uRadius.x, 0.0)).a;
          float a2 = texture2D(map, vUv + vec2(-uRadius.x, 0.0)).a;
          float a3 = texture2D(map, vUv + vec2(0.0, uRadius.y)).a;
          float a4 = texture2D(map, vUv + vec2(0.0, -uRadius.y)).a;
          float a5 = texture2D(map, vUv + vec2(uRadius.x * 0.7, uRadius.y * 0.7)).a;
          float a6 = texture2D(map, vUv + vec2(-uRadius.x * 0.7, uRadius.y * 0.7)).a;
          float a7 = texture2D(map, vUv + vec2(uRadius.x * 0.7, -uRadius.y * 0.7)).a;
          float a8 = texture2D(map, vUv + vec2(-uRadius.x * 0.7, -uRadius.y * 0.7)).a;

          float maxA = max(a0, max(max(max(a1, a2), max(a3, a4)), max(max(a5, a6), max(a7, a8))));
          float archMask = smoothstep(0.35, 0.65, maxA);
          if (archMask < 0.01) discard;

          float avgA = (a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8) * 0.125;
          float edgeFactor = smoothstep(0.85, 0.25, avgA);
          vec3 col = mix(archColor, rimColor, edgeFactor * 0.65);

          gl_FragColor = vec4(col, archMask * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  private buildUserMapLayers(): void {
    const mapW = MAP_CONFIG.width; // 183.6
    const mapH = MAP_CONFIG.height; // 147.15
    const mapCenterY = MAP_CONFIG.centerY; // -63.525
    const planeGeo = new THREE.PlaneGeometry(mapW, mapH);

    // 1. BACKGROUND RECESSED TEAL CAVE ARCHWAYS (Z = -6.0, renderOrder = -14)
    const bgArchMat = this.createRecessedArchwayMaterial(
      '/assets/environment/map_foreground.png',
      0x146682,
      0x289ab8,
      0.018,
      0.022,
      0.52
    );
    const bgArchMesh = new THREE.Mesh(planeGeo, bgArchMat);
    bgArchMesh.position.set(0, mapCenterY, 0);
    bgArchMesh.renderOrder = -14;
    this.backgroundRocks.add(bgArchMesh);

    // 2. MIDGROUND RECESSED TEAL CAVE ARCHWAYS (Z = -2.8, renderOrder = -6)
    const mgArchMat = this.createRecessedArchwayMaterial(
      '/assets/environment/map_foreground.png',
      0x0c445c,
      0x1b7694,
      0.009,
      0.012,
      0.68
    );
    const mgArchMesh = new THREE.Mesh(planeGeo, mgArchMat);
    mgArchMesh.position.set(0, mapCenterY, 0);
    mgArchMesh.renderOrder = -6;
    this.midgroundRocks.add(mgArchMesh);

    // 3. FOREGROUND ROCK LAYER (Playable Solid Vector Silhouettes, Z = 0, renderOrder = 5)
    const fgMat = this.createSculptedForegroundMaterial('/assets/environment/map_foreground.png');
    const fgMesh = new THREE.Mesh(planeGeo, fgMat);
    fgMesh.position.set(0, mapCenterY, 0);
    fgMesh.renderOrder = 5;
    this.foregroundRocks.add(fgMesh);

    // Solid obsidian black margin slabs extending to world boundaries
    const solidFgMat = new THREE.MeshBasicMaterial({
      color: 0x02060d,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const leftSlabGeo = new THREE.PlaneGeometry(52, 142);
    const leftSlab = new THREE.Mesh(leftSlabGeo, solidFgMat);
    leftSlab.position.set(-117.8, -72.2, 0);
    leftSlab.renderOrder = 5;
    this.foregroundRocks.add(leftSlab);

    const rightSlabGeo = new THREE.PlaneGeometry(52, 142);
    const rightSlab = new THREE.Mesh(rightSlabGeo, solidFgMat);
    rightSlab.position.set(117.8, -72.2, 0);
    rightSlab.renderOrder = 5;
    this.foregroundRocks.add(rightSlab);

    const bottomSlabGeo = new THREE.PlaneGeometry(284, 14);
    const bottomSlab = new THREE.Mesh(bottomSlabGeo, solidFgMat);
    bottomSlab.position.set(0, -143.5, 0);
    bottomSlab.renderOrder = 5;
    this.foregroundRocks.add(bottomSlab);
  }

  /**
   * Builds treasure chest alcoves with twinkling 4-point star sparkle particles,
   * soft alpha bioluminescent glow halos, and natural 2K flora clusters on cavern shelves.
   */
  private buildCaveWallDecorAndAlcoves(): void {
    // 1. Soft radial alpha gradient texture for bioluminescent glow halos (organisms & chests)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d');
    if (gctx) {
      const grad = gctx.createRadialGradient(64, 64, 2, 64, 64, 60);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.58)');
      grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.18)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 128, 128);
    }
    const radialGlowTex = new THREE.CanvasTexture(glowCanvas);

    // 2. 4-point diamond/starburst texture for Treasure Sparkle Particles
    const sparkleCanvas = document.createElement('canvas');
    sparkleCanvas.width = 64;
    sparkleCanvas.height = 64;
    const sctx = sparkleCanvas.getContext('2d');
    if (sctx) {
      sctx.clearRect(0, 0, 64, 64);
      const rg = sctx.createRadialGradient(32, 32, 1, 32, 32, 28);
      rg.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      rg.addColorStop(0.35, 'rgba(254, 240, 138, 0.85)');
      rg.addColorStop(0.75, 'rgba(250, 204, 21, 0.25)');
      rg.addColorStop(1.0, 'rgba(250, 204, 21, 0.0)');
      sctx.fillStyle = rg;
      sctx.fillRect(0, 0, 64, 64);

      // Crisp 4-point star flare rays
      sctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      sctx.beginPath();
      sctx.moveTo(32, 2);
      sctx.quadraticCurveTo(34, 29, 62, 32);
      sctx.quadraticCurveTo(34, 35, 32, 62);
      sctx.quadraticCurveTo(30, 35, 2, 32);
      sctx.quadraticCurveTo(30, 29, 32, 2);
      sctx.closePath();
      sctx.fill();
    }
    const sparkleTex = new THREE.CanvasTexture(sparkleCanvas);

    // 3. Bubble ring texture for rising alcove bubbles
    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 64;
    bubbleCanvas.height = 64;
    const bctx = bubbleCanvas.getContext('2d');
    if (bctx) {
      bctx.clearRect(0, 0, 64, 64);
      const bgrad = bctx.createRadialGradient(24, 22, 2, 32, 32, 26);
      bgrad.addColorStop(0.0, 'rgba(224, 252, 255, 0.90)');
      bgrad.addColorStop(0.55, 'rgba(103, 232, 249, 0.35)');
      bgrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.75)');
      bgrad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
      bctx.fillStyle = bgrad;
      bctx.beginPath();
      bctx.arc(32, 32, 26, 0, Math.PI * 2);
      bctx.fill();
    }
    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas);

    // 4. Gold coin texture
    const coinCanvas = document.createElement('canvas');
    coinCanvas.width = 64;
    coinCanvas.height = 64;
    const cctx = coinCanvas.getContext('2d');
    if (cctx) {
      const cgrad = cctx.createRadialGradient(24, 22, 2, 32, 32, 24);
      cgrad.addColorStop(0.0, '#fef9c3');
      cgrad.addColorStop(0.45, '#facc15');
      cgrad.addColorStop(0.85, '#ca8a04');
      cgrad.addColorStop(1.0, 'rgba(161, 98, 7, 0.0)');
      cctx.fillStyle = cgrad;
      cctx.beginPath();
      cctx.arc(32, 32, 22, 0, Math.PI * 2);
      cctx.fill();
    }
    const coinTex = new THREE.CanvasTexture(coinCanvas);

    // 5. Golden Sunken Treasure Chest Alcoves across all depth biomes
    const chestAlcoves = [
      // 1. Main Sunlit Entry Cavern alcove (right below diver spawn!)
      { x: -15.5, y: -26.8, chestImg: '/assets/environment/Open_damaged_treasure_chest_2K_20261016213001.png', flipX: false },
      // 2. Upper-Mid Tunnel alcove (DEPTH: 110m-140m)
      { x: -24.5, y: -36.8, chestImg: '/assets/environment/Damaged_treasure_chest_closed_2K_20261016212855.png', flipX: true },
      // 3. West Lagoon Grotto alcove
      { x: -42.5, y: -22.8, chestImg: '/assets/environment/Broken_treasure_chest_on_white_2K_20261016212738.png', flipX: false },
      // 4. Central Subterranean Crossroads Treasure Grotto
      { x: -45.0, y: -66.8, chestImg: '/assets/environment/Open_damaged_treasure_chest_2K_20261016213001.png', flipX: false },
      // 5. Eastern Grand Chamber Reef Ledge
      { x: 52.0, y: -33.2, chestImg: '/assets/environment/Broken_treasure_chest_on_white_2K_20261016212745.png', flipX: true },
      // 6. Midnight Highway Cavern Alcove
      { x: -28.0, y: -91.5, chestImg: '/assets/environment/Damaged_treasure_chest_closed_2K_20261016212858.png', flipX: false },
      // 7. Abyssal Central Basin Vault
      { x: 6.5, y: -125.4, chestImg: '/assets/environment/Open_damaged_treasure_chest_2K_20261016213001.png', flipX: false },
    ];

    chestAlcoves.forEach((alcove, idx) => {
      this.createTreasureChestAlcove(
        alcove.x,
        alcove.y,
        alcove.chestImg,
        alcove.flipX,
        radialGlowTex,
        coinTex,
        bubbleTex,
        sparkleTex,
        idx
      );
    });

    // 6. Natural 2K Bioluminescent Anemones, Staghorn Corals & Swaying Kelp on Cavern Floor Ledges
    //    Each organism has a soft radial bioluminescent glow halo matching media_1792225844406_fe469a41.jpg!
    const ledgeOrganisms: {
      x: number;
      y: number;
      asset: EnvAssetKey;
      width: number;
      glowHex: number;
      sway: number;
      flipX?: boolean;
    }[] = [
      // Spawn Lagoon & Sunlit Shallows ledges
      { x: -23.2, y: -15.2, asset: 'kelp_c', width: 2.2, glowHex: 0x2dd4bf, sway: 0.08 },
      { x: -21.4, y: -15.4, asset: 'anemone_a', width: 1.85, glowHex: 0x38f8ff, sway: 0.04 },
      { x: -12.8, y: -26.8, asset: 'staghorn_a', width: 2.3, glowHex: 0x34f598, sway: 0.03 },
      { x: -18.2, y: -26.9, asset: 'kelp_d', width: 2.4, glowHex: 0x2dd4bf, sway: 0.08, flipX: true },
      // Upper-Mid Cavern (DEPTH 110m-140m)
      { x: -30.5, y: -37.2, asset: 'kelp_a', width: 2.8, glowHex: 0x2dd4bf, sway: 0.07 },
      { x: -27.2, y: -37.0, asset: 'anemone_c', width: 1.9, glowHex: 0xa855f7, sway: 0.04 },
      { x: -20.8, y: -36.9, asset: 'staghorn_b', width: 2.2, glowHex: 0x38f8ff, sway: 0.03 },
      // West & East Shallows
      { x: -46.5, y: -23.0, asset: 'anemone_b', width: 2.0, glowHex: 0x34f598, sway: 0.04 },
      { x: 48.0, y: -33.4, asset: 'kelp_b', width: 2.9, glowHex: 0x2dd4bf, sway: 0.07 },
      { x: 55.2, y: -33.3, asset: 'anemone_d', width: 1.95, glowHex: 0x38f8ff, sway: 0.04 },
      // Twilight Caverns
      { x: -49.5, y: -67.0, asset: 'crystal_a', width: 2.3, glowHex: 0x38f8ff, sway: 0.0 },
      { x: -41.0, y: -66.9, asset: 'anemone_a', width: 2.1, glowHex: 0xa855f7, sway: 0.04 },
      { x: 2.5, y: -65.5, asset: 'crystal_b', width: 2.4, glowHex: 0x34f598, sway: 0.0 },
      // Midnight & Abyssal Ledges
      { x: -32.0, y: -91.8, asset: 'crystal_a', width: 2.5, glowHex: 0x38f8ff, sway: 0.0 },
      { x: -24.0, y: -91.6, asset: 'anemone_c', width: 2.0, glowHex: 0xa855f7, sway: 0.04 },
      { x: 2.0, y: -125.6, asset: 'crystal_b', width: 2.6, glowHex: 0x38f8ff, sway: 0.0 },
      { x: 10.5, y: -125.5, asset: 'crystal_a', width: 2.4, glowHex: 0xa855f7, sway: 0.0 },
    ];

    ledgeOrganisms.forEach((org, idx) => {
      this.createBiolumLedgeOrganism(
        org.x,
        org.y,
        org.asset,
        org.width,
        org.glowHex,
        org.sway,
        Boolean(org.flipX),
        radialGlowTex,
        idx
      );
    });
  }

  /**
   * Places a 2K kelp, anemone, coral, or crystal on a cavern shelf with underwater color grading
   * and a soft pulsing bioluminescent alpha glow halo.
   */
  private createBiolumLedgeOrganism(
    x: number,
    y: number,
    assetKey: EnvAssetKey,
    width: number,
    glowHex: number,
    swayAmp: number,
    flipX: boolean,
    glowTex: THREE.Texture,
    seedIdx: number
  ): void {
    const loader = AssetLoader.getInstance();
    const info = ENV_ASSETS[assetKey];
    const height = width / info.aspect;

    // 1. Soft alpha gradient bioluminescent glow halo behind the organism
    const haloMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: glowHex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloSize = Math.max(width, height) * 1.85;
    const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(haloSize, haloSize), haloMat);
    haloMesh.position.set(x, y + height * 0.48, 0.02);
    haloMesh.renderOrder = 6;
    this.biolumGroup.add(haloMesh);
    this.animatedHalos.push({
      mesh: haloMesh,
      baseOpacity: 0.42,
      phase: seedIdx * 1.3,
    });

    // 2. Underwater-graded 2K organism sprite
    const tex = loader.loadTexture(info.url, { mipmaps: true, anisotropy: 8 });
    const orgMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        uGlowColor: { value: new THREE.Color(glowHex) },
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
        uniform vec3 uGlowColor;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(map, vUv);
          float a = smoothstep(0.18, 0.72, t.a);
          if (a < 0.01) discard;

          float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
          // Deep oceanic silhouette base with bioluminescent tip & rim emission
          vec3 darkTeal = mix(vec3(0.02, 0.10, 0.16), vec3(0.09, 0.34, 0.44), pow(lum, 0.7));
          float tipGlow = smoothstep(0.30, 0.90, lum) * smoothstep(0.15, 0.92, vUv.y);
          vec3 col = mix(darkTeal, uGlowColor * 1.15, tipGlow * 0.78);
          // Grounded shadow at bottom root
          col *= smoothstep(-0.05, 0.22, vUv.y);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const geo = new THREE.PlaneGeometry(width, height);
    // Anchor at bottom base so swaying pivots naturally from the rock floor
    geo.translate(0, height * 0.46, 0);
    if (flipX) geo.scale(-1, 1, 1);

    const mesh = new THREE.Mesh(geo, orgMat);
    mesh.position.set(x, y, 0.05);
    mesh.renderOrder = 7;
    this.decorGroup.add(mesh);

    if (swayAmp > 0) {
      this.swayingFlora.push({
        mesh,
        baseRotZ: 0,
        phase: seedIdx * 1.7,
        amp: swayAmp,
      });
    }
  }

  /**
   * Builds a complete Sunken Treasure Chest Alcove with:
   * - Soft golden bioluminescent glow halo (#fde047)
   * - Diver-proportioned treasure chest (~2.35 units wide) graded in dark oceanic slate with golden rim glints
   * - Twinkling 4-point star Treasure Sparkle Particles rising & shimmering around the chest
   * - Collectible floating gold coins hovering above the chest
   * - Rising translucent water bubbles
   */
  private createTreasureChestAlcove(
    x: number,
    y: number,
    chestPath: string,
    flipX: boolean,
    glowTex: THREE.Texture,
    coinTex: THREE.Texture,
    bubbleTex: THREE.Texture,
    sparkleTex: THREE.Texture,
    seedIdx: number
  ): void {
    const loader = AssetLoader.getInstance();
    const chestW = 2.35;
    const chestH = 1.75;

    // 1. Soft alpha gradient golden glow halo behind the chest
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.5), glowMat);
    glowMesh.position.set(x, y + 0.65, 0.03);
    glowMesh.renderOrder = 6;
    this.biolumGroup.add(glowMesh);
    this.animatedHalos.push({ mesh: glowMesh, baseOpacity: 0.56, phase: seedIdx * 1.5 });

    // 2. Treasure chest mesh with clean alpha cutout & warm golden rim highlight
    const tex = loader.loadTexture(chestPath, { mipmaps: true, anisotropy: 8 });
    const chestMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
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
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(map, vUv);
          float a = smoothstep(0.20, 0.75, t.a);
          if (a < 0.01) discard;
          float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
          vec3 darkWood = mix(vec3(0.03, 0.09, 0.14), vec3(0.12, 0.34, 0.44), pow(lum, 0.7));
          float goldGlint = smoothstep(0.60, 0.92, lum) * smoothstep(0.22, 0.78, vUv.y);
          vec3 col = mix(darkWood, vec3(0.99, 0.86, 0.34), goldGlint * 0.88);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const chestGeo = new THREE.PlaneGeometry(chestW, chestH);
    if (flipX) chestGeo.scale(-1, 1, 1);
    const chestMesh = new THREE.Mesh(chestGeo, chestMat);
    chestMesh.position.set(x, y + chestH * 0.42, 0.06);
    chestMesh.renderOrder = 8;
    this.decorGroup.add(chestMesh);

    // 3. Treasure Sparkle Particles (twinkling 4-point golden star glints around the chest)
    const sparkleOffsets = [
      { dx: -0.95, dy: 0.55, scale: 0.48 },
      { dx: -0.35, dy: 1.15, scale: 0.62 },
      { dx: 0.25, dy: 0.85, scale: 0.55 },
      { dx: 0.85, dy: 1.25, scale: 0.52 },
      { dx: -0.15, dy: 1.65, scale: 0.45 },
      { dx: 0.55, dy: 0.45, scale: 0.42 },
    ];
    sparkleOffsets.forEach((sp, sIdx) => {
      const spMat = new THREE.MeshBasicMaterial({
        map: sparkleTex,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const spMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), spMat);
      const sx = x + sp.dx;
      const sy = y + sp.dy;
      spMesh.position.set(sx, sy, 0.11);
      spMesh.renderOrder = 11;
      this.biolumGroup.add(spMesh);

      this.treasureSparkles.push({
        mesh: spMesh,
        baseX: sx,
        baseY: sy,
        phase: seedIdx * 2.3 + sIdx * 1.15,
        speed: 2.2 + (sIdx % 3) * 0.65,
        baseScale: sp.scale,
      });
    });

    // 4. Collectible floating gold coins hovering above the chest
    const coinOffsets = [
      { dx: -0.85, dy: 1.85, val: 50 },
      { dx: 0.15, dy: 2.55, val: 50 },
      { dx: 1.05, dy: 3.25, val: 100 },
    ];
    coinOffsets.forEach((co, cIdx) => {
      const cx = x + co.dx;
      const cy = y + co.dy;

      const cGlowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0xfacc15,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cGlowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), cGlowMat);
      cGlowMesh.position.set(cx, cy, 0.09);
      cGlowMesh.renderOrder = 9;
      this.biolumGroup.add(cGlowMesh);

      const cMat = new THREE.MeshBasicMaterial({
        map: coinTex,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
      });
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), cMat);
      cMesh.position.set(cx, cy, 0.10);
      cMesh.renderOrder = 10;
      this.biolumGroup.add(cMesh);

      this.coins.push({
        mesh: cMesh,
        glowMesh: cGlowMesh,
        pos: new THREE.Vector2(cx, cy),
        baseY: cy,
        phase: seedIdx * 2.1 + cIdx * 1.3,
        collected: false,
        value: co.val,
      });
    });

    // 5. Rising translucent water bubbles from the treasure alcove
    for (let b = 0; b < 5; b++) {
      const bSize = 0.22 + (b % 3) * 0.12;
      const bMat = new THREE.MeshBasicMaterial({
        map: bubbleTex,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
      const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bSize), bMat);
      const bx = x + (b - 2) * 0.45;
      const by = y + 0.8 + b * 0.65;
      bMesh.position.set(bx, by, 0.08);
      bMesh.renderOrder = 9;
      this.biolumGroup.add(bMesh);

      this.alcoveBubbles.push({
        mesh: bMesh,
        baseX: bx,
        startY: y + 0.6,
        maxRise: 4.2 + (b % 2) * 1.2,
        speed: 0.75 + (b % 3) * 0.22,
        phase: seedIdx * 1.7 + b * 1.4,
      });
    }
  }

  /**
   * Spatial hash grid for fast O(1) collision queries
   */
  private buildSpatialGrid(): void {
    this.spatialGrid.clear();

    this.segments = LANDMASS_COLLISION_SEGMENTS.map((s) => ({
      p1: new THREE.Vector2(s.p1[0], s.p1[1]),
      p2: new THREE.Vector2(s.p2[0], s.p2[1]),
      normal: new THREE.Vector2(s.n[0], s.n[1]),
    }));

    this.segments.forEach((seg) => {
      const minX = Math.min(seg.p1.x, seg.p2.x);
      const maxX = Math.max(seg.p1.x, seg.p2.x);
      const minY = Math.min(seg.p1.y, seg.p2.y);
      const maxY = Math.max(seg.p1.y, seg.p2.y);

      const cellMinX = Math.floor(minX / this.gridCellSize);
      const cellMaxX = Math.floor(maxX / this.gridCellSize);
      const cellMinY = Math.floor(minY / this.gridCellSize);
      const cellMaxY = Math.floor(maxY / this.gridCellSize);

      for (let cx = cellMinX; cx <= cellMaxX; cx++) {
        for (let cy = cellMinY; cy <= cellMaxY; cy++) {
          const key = `${cx},${cy}`;
          let cell = this.spatialGrid.get(key);
          if (!cell) {
            cell = [];
            this.spatialGrid.set(key, cell);
          }
          cell.push(seg);
        }
      }
    });
  }

  /**
   * Resolves physical solid rock collisions with smooth wall sliding
   * and records floor/wall proximity for kicking up disturbed silt clouds.
   */
  public resolvePlayerCollision(
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector2,
    radius: number
  ): boolean {
    this.lastSiltContact = null;
    let hasCollided = false;
    for (let iter = 0; iter < 2; iter++) {
      if (this.doCollisionPass(playerPos, playerVel, radius)) {
        hasCollided = true;
      }
    }
    return hasCollided;
  }

  private doCollisionPass(
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector2,
    radius: number
  ): boolean {
    const cx = Math.floor(playerPos.x / this.gridCellSize);
    const cy = Math.floor(playerPos.y / this.gridCellSize);

    let hasCollided = false;
    const skimRadius = radius + 0.55; // Kick up subtle silt when swimming right along the cave floor
    const speed = playerVel.length();

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = `${cx + ox},${cy + oy}`;
        const cellSegments = this.spatialGrid.get(key);
        if (!cellSegments) continue;

        for (let i = 0; i < cellSegments.length; i++) {
          const seg = cellSegments[i];

          const vx = seg.p2.x - seg.p1.x;
          const vy = seg.p2.y - seg.p1.y;
          const len2 = vx * vx + vy * vy;
          if (len2 === 0) continue;

          const t = Math.max(
            0,
            Math.min(
              1,
              ((playerPos.x - seg.p1.x) * vx + (playerPos.y - seg.p1.y) * vy) / len2
            )
          );

          const nearX = seg.p1.x + t * vx;
          const nearY = seg.p1.y + t * vy;

          const dx = playerPos.x - nearX;
          const dy = playerPos.y - nearY;
          const dist = Math.hypot(dx, dy);

          let nx = seg.normal.x;
          let ny = seg.normal.y;
          if (dist > 0.001) {
            nx = dx / dist;
            ny = dy / dist;
          }

          // Check floor/wall skim proximity for silt cloud kick-up
          if (dist < skimRadius && speed > 0.85 && ny > -0.25) {
            this.lastSiltContact = {
              x: nearX,
              y: nearY,
              nx,
              ny,
              intensity: dist < radius ? 1.0 : 0.65,
            };
          }

          // Physical overlap with rock segment
          if (dist < radius) {
            hasCollided = true;
            const overlap = radius - dist;

            playerPos.x += nx * overlap;
            playerPos.y += ny * overlap;

            this.lastSiltContact = {
              x: nearX,
              y: nearY,
              nx,
              ny,
              intensity: 1.0,
            };

            const vDotN = playerVel.x * nx + playerVel.y * ny;
            if (vDotN < 0) {
              playerVel.x -= nx * vDotN;
              playerVel.y -= ny * vDotN;
              playerVel.multiplyScalar(0.985);
            }
          }
        }
      }
    }

    return hasCollided;
  }

  /**
   * Resolves collision for entities, preventing them from penetrating rock boundaries
   */
  public resolveCreatureCollision(
    pos: THREE.Vector3,
    vel: { vx: number; vy: number },
    radius: number
  ): boolean {
    const cx = Math.floor(pos.x / this.gridCellSize);
    const cy = Math.floor(pos.y / this.gridCellSize);

    let hasCollided = false;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = `${cx + ox},${cy + oy}`;
        const cellSegments = this.spatialGrid.get(key);
        if (!cellSegments) continue;

        for (let i = 0; i < cellSegments.length; i++) {
          const seg = cellSegments[i];

          const vx = seg.p2.x - seg.p1.x;
          const vy = seg.p2.y - seg.p1.y;
          const len2 = vx * vx + vy * vy;
          if (len2 === 0) continue;

          const t = Math.max(
            0,
            Math.min(
              1,
              ((pos.x - seg.p1.x) * vx + (pos.y - seg.p1.y) * vy) / len2
            )
          );

          const nearX = seg.p1.x + t * vx;
          const nearY = seg.p1.y + t * vy;

          const dx = pos.x - nearX;
          const dy = pos.y - nearY;
          const dist = Math.hypot(dx, dy);

          if (dist < radius) {
            hasCollided = true;
            const overlap = radius - dist;

            let nx = seg.normal.x;
            let ny = seg.normal.y;

            if (dist > 0.001) {
              nx = dx / dist;
              ny = dy / dist;
            }

            pos.x += nx * overlap;
            pos.y += ny * overlap;

            const vDotN = vel.vx * nx + vel.vy * ny;
            if (vDotN < 0) {
              vel.vx -= nx * vDotN * 1.8;
              vel.vy -= ny * vDotN * 1.8;
            }
          }
        }
      }
    }

    return hasCollided;
  }

  /**
   * Checks coin collection proximity
   */
  public checkCoinCollection(
    playerPos: THREE.Vector3,
    onCollected: (val: number) => void
  ): void {
    const collectRadiusSq = 1.65 * 1.65;

    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.collected) continue;

      const dx = playerPos.x - c.pos.x;
      const dy = playerPos.y - c.pos.y;
      if (dx * dx + dy * dy < collectRadiusSq) {
        c.collected = true;
        c.mesh.visible = false;
        c.glowMesh.visible = false;
        onCollected(c.value);
      }
    }
  }

  /**
   * Updates CaveSystem multi-depth archway parallax, swaying kelp, pulsing coral/chest halos,
   * twinkling treasure sparkles, bobbing gold coins, and rising alcove bubbles
   */
  public update(delta: number, cameraX: number = 0, _cameraY: number = 0): void {
    this.time += delta;

    // 1. Subtle horizontal parallax on the recessed teal cave archway layers
    this.midgroundRocks.position.x = cameraX * 0.025;
    this.backgroundRocks.position.x = cameraX * 0.055;

    // 2. Swaying 2K kelp & anemones on rock ledges
    for (let i = 0; i < this.swayingFlora.length; i++) {
      const f = this.swayingFlora[i];
      f.mesh.rotation.z = f.baseRotZ + Math.sin(this.time * 1.45 + f.phase) * f.amp;
    }

    // 3. Pulsing bioluminescent organism & treasure chest light halos
    for (let i = 0; i < this.animatedHalos.length; i++) {
      const h = this.animatedHalos[i];
      (h.mesh.material as THREE.MeshBasicMaterial).opacity =
        h.baseOpacity * (0.80 + Math.sin(this.time * 2.2 + h.phase) * 0.20);
    }

    // 4. Twinkling & gently rising Treasure Sparkle Particles
    for (let i = 0; i < this.treasureSparkles.length; i++) {
      const sp = this.treasureSparkles[i];
      const wave = Math.sin(this.time * sp.speed + sp.phase);
      const twinkle = Math.max(0, wave);
      const scale = sp.baseScale * (0.35 + twinkle * 0.85);
      sp.mesh.scale.set(scale, scale, 1);
      sp.mesh.rotation.z = this.time * 0.8 + sp.phase;
      sp.mesh.position.y = sp.baseY + Math.sin(this.time * 1.2 + sp.phase) * 0.18;
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = twinkle * 0.95;
    }

    // 5. Bobbing collectible gold coins
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.collected) continue;
      const bobY = c.baseY + Math.sin(this.time * 2.4 + c.phase) * 0.14;
      c.mesh.position.y = bobY;
      c.glowMesh.position.y = bobY;
      c.pos.y = bobY;
    }

    // 6. Rising alcove bubbles
    for (let i = 0; i < this.alcoveBubbles.length; i++) {
      const b = this.alcoveBubbles[i];
      const progress = ((this.time * b.speed + b.phase) % b.maxRise) / b.maxRise;
      b.mesh.position.y = b.startY + progress * b.maxRise;
      b.mesh.position.x = b.baseX + Math.sin(this.time * 2.6 + b.phase) * 0.16;
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.72;
    }
  }

  public destroy(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.segments = [];
    this.spatialGrid.clear();
    this.coins = [];
    this.alcoveBubbles = [];
    this.treasureSparkles = [];
    this.animatedHalos = [];
    this.swayingFlora = [];
  }
}
