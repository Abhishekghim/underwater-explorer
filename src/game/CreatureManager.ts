import * as THREE from 'three';
import { AssetLoader } from './AssetLoader';
import { WorldBounds } from './types';
import { SPECIES_CATALOG, SpeciesDefinition, CreatureBehavior } from './speciesData';
import { journalManager } from './JournalManager';
import { LightingSystem } from './LightingSystem';
import { CaveSystem } from './CaveSystem';

interface CreatureEntity {
  id: string;
  speciesId: string;
  def: SpeciesDefinition;
  mesh: THREE.Mesh;
  geom: THREE.PlaneGeometry;
  baseYPositions: Float32Array; // Original Y vertex positions for spine wave
  leftTex?: THREE.Texture;
  rightTex?: THREE.Texture;
  facing: 1 | -1;
  targetFacing: 1 | -1;
  turnProgress: number; // 0 to 1 for smooth turn
  turnSpeed: number;
  width: number;
  height: number;
  baseScale: number;
  vx: number;
  vy: number;
  baseY: number;
  minX: number;
  maxX: number;
  minY?: number;
  maxY?: number;
  // Locomotion dynamics
  swimTimer: number;
  swimFreq: number;
  tailAmp: number;
  isGlide: boolean;
  glideTimer: number;
  // Behavior
  behavior: CreatureBehavior;
  behaviorTimer: number;
  schoolGroup?: number;
  // Animation frames for animated creatures (whale, medusa)
  animTextures?: THREE.Texture[];
  animTimer: number;
  currentFrame: number;
  // Bioluminescent elements
  lureMesh?: THREE.Mesh;
}

export class CreatureManager {
  public group: THREE.Group;
  private creatures: CreatureEntity[] = [];
  private time = 0;
  private observationCooldown = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'creature_ecosystem';
    // Marine fauna completely removed per user request
    this.creatures = [];
  }

  private spawnAllFauna(): void {
    this.creatures = [];
    return;
    const loader = AssetLoader.getInstance();

    const addCreature = (
      speciesId: string,
      x: number,
      y: number,
      minX: number,
      maxX: number,
      opts: {
        schoolGroup?: number;
        zOffset?: number;
        minY?: number;
        maxY?: number;
      } = {}
    ) => {
      const def = SPECIES_CATALOG.find((s) => s.id === speciesId);
      if (!def) return;

      // Aspect ratios calibrated for Polyy.AI 3D models and animated packs
      let baseW = 1.0;
      let baseH = 0.6;
      let swimFreq = 5.0;
      let tailAmp = 0.12;
      let turnSpeed = 2.4;

      switch (def.id) {
        case 'azure_tang':
          baseW = 0.55;
          baseH = 0.35;
          swimFreq = 6.5;
          tailAmp = 0.11;
          turnSpeed = 2.8;
          break;
        case 'bluefin_tuna':
          baseW = 1.75;
          baseH = 0.75;
          swimFreq = 8.0;
          tailAmp = 0.14;
          turnSpeed = 2.0;
          break;
        case 'freshwater_angelfish':
          baseW = 0.60;
          baseH = 0.75;
          swimFreq = 4.0;
          tailAmp = 0.08;
          turnSpeed = 2.2;
          break;
        case 'coral_clownfish':
          baseW = 0.45;
          baseH = 0.30;
          swimFreq = 6.0;
          tailAmp = 0.12;
          turnSpeed = 2.8;
          break;
        case 'mandarinfish':
          baseW = 0.38;
          baseH = 0.24;
          swimFreq = 5.2;
          tailAmp = 0.09;
          turnSpeed = 2.6;
          break;
        case 'pygmy_seahorse':
          baseW = 0.28;
          baseH = 0.48;
          swimFreq = 3.0;
          tailAmp = 0.04;
          turnSpeed = 2.0;
          break;
        case 'mottled_flounder':
          baseW = 0.70;
          baseH = 0.42;
          swimFreq = 4.5;
          tailAmp = 0.10;
          turnSpeed = 2.2;
          break;
        case 'red_lionfish':
          baseW = 0.80;
          baseH = 0.60;
          swimFreq = 3.6;
          tailAmp = 0.08;
          turnSpeed = 1.8;
          break;
        case 'giant_moray':
          baseW = 2.00;
          baseH = 0.65;
          swimFreq = 3.2;
          tailAmp = 0.22;
          turnSpeed = 1.6;
          break;
        case 'broadbill_swordfish':
          baseW = 2.40;
          baseH = 0.85;
          swimFreq = 6.2;
          tailAmp = 0.16;
          turnSpeed = 1.8;
          break;
        case 'green_sea_turtle':
          baseW = 1.40;
          baseH = 1.05;
          swimFreq = 1.8;
          tailAmp = 0.10;
          turnSpeed = 1.5;
          break;
        case 'pelagic_manta_ray':
          baseW = 3.60;
          baseH = 2.40;
          swimFreq = 2.0;
          tailAmp = 0.28;
          turnSpeed = 1.2;
          break;
        case 'luminescent_medusa':
          baseW = 1.00;
          baseH = 1.40;
          swimFreq = 1.8;
          tailAmp = 0.05;
          turnSpeed = 1.5;
          break;
        case 'hammerhead_shark':
          baseW = 2.80;
          baseH = 1.20;
          swimFreq = 3.8;
          tailAmp = 0.24;
          turnSpeed = 1.4;
          break;
        case 'great_white_shark':
          baseW = 3.60;
          baseH = 1.50;
          swimFreq = 3.2;
          tailAmp = 0.26;
          turnSpeed = 1.2;
          break;
        case 'ocean_sunfish':
          baseW = 2.00;
          baseH = 2.40;
          swimFreq = 2.2;
          tailAmp = 0.12;
          turnSpeed = 1.1;
          break;
        case 'abyssal_anglerfish':
          baseW = 1.10;
          baseH = 0.90;
          swimFreq = 2.6;
          tailAmp = 0.08;
          turnSpeed = 1.6;
          break;
        case 'abyssal_pufferfish':
          baseW = 0.85;
          baseH = 0.70;
          swimFreq = 4.0;
          tailAmp = 0.09;
          turnSpeed = 2.0;
          break;
        case 'ancient_leviathan':
          baseW = 10.50;
          baseH = 4.80;
          swimFreq = 1.4;
          tailAmp = 0.20;
          turnSpeed = 0.8;
          break;
      }

      const w = baseW;
      const h = baseH;

      const initialFacing: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      let leftTex: THREE.Texture | undefined;
      let rightTex: THREE.Texture | undefined;
      let animTextures: THREE.Texture[] | undefined;
      let primaryTexPath = def.texturePath;

      if (def.textureLeftPath && def.textureRightPath) {
        leftTex = loader.loadTexture(def.textureLeftPath);
        rightTex = loader.loadTexture(def.textureRightPath);
        primaryTexPath = initialFacing === 1 ? def.textureRightPath : def.textureLeftPath;
      }

      if (def.isAnimated && def.frames && def.frames.length > 0) {
        animTextures = def.frames.map((p) => loader.loadTexture(p));
        primaryTexPath = def.frames[0];
      }

      // Create segmented plane (12 horizontal segments) for spine wave deformation
      const segmentsX = def.id === 'luminescent_medusa' ? 2 : 12;
      const mesh = loader.createTexturedPlane(primaryTexPath, w, h, {
        opacity: def.id === 'luminescent_medusa' ? 0.84 : 0.98,
        depthWrite: false,
        segmentsX,
        segmentsY: 1,
      });

      const geom = mesh.geometry as THREE.PlaneGeometry;
      const posAttr = geom.attributes.position;
      const baseYPositions = new Float32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) {
        baseYPositions[i] = posAttr.getY(i);
      }

      mesh.position.set(x, y, opts.zOffset ?? -0.02);

      // Anglerfish glowing esca lure
      let lureMesh: THREE.Mesh | undefined;
      if (def.id === 'abyssal_anglerfish') {
        const lureGlow = new THREE.Mesh(
          new THREE.CircleGeometry(0.18, 16),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        // Position lure directly in front of head/mouth
        lureGlow.position.set(0.48 * initialFacing, 0.38, 0.02);
        mesh.add(lureGlow);
        lureMesh = lureGlow;
      }

      mesh.scale.x = initialFacing;
      mesh.scale.y = 1.0;
      this.group.add(mesh);

      const vx = def.baseSpeed * initialFacing * (0.88 + Math.random() * 0.24);

      this.creatures.push({
        id: `${speciesId}_${Math.random().toString(36).substring(2, 7)}`,
        speciesId,
        def,
        mesh,
        geom,
        baseYPositions,
        leftTex,
        rightTex,
        facing: initialFacing,
        targetFacing: initialFacing,
        turnProgress: 1.0,
        turnSpeed,
        width: w,
        height: h,
        baseScale: 1.0,
        vx,
        vy: 0,
        baseY: y,
        minX,
        maxX,
        minY: opts.minY,
        maxY: opts.maxY,
        swimTimer: Math.random() * 10,
        swimFreq,
        tailAmp,
        isGlide: false,
        glideTimer: 0,
        behavior: def.behavior,
        behaviorTimer: Math.random() * 4,
        animTextures,
        animTimer: Math.random() * 2,
        currentFrame: 0,
        lureMesh,
        schoolGroup: opts.schoolGroup,
      });
    };

    // ==========================================
    // 1. SURFACE WATERS (Submerged: Y: -1.0 to -6.5)
    // ==========================================
    // School of Azure Tangs in open photic water
    for (let i = 0; i < 6; i++) {
      addCreature('azure_tang', -18 + i * 4.2, -1.4 - (i % 3) * 0.7, -40, 40, {
        schoolGroup: 1,
        zOffset: -0.02,
      });
    }

    // High-speed Atlantic Bluefin Tuna school
    for (let i = 0; i < 4; i++) {
      addCreature('bluefin_tuna', 6 + i * 5.5, -2.4 - (i % 2) * 1.2, -22, 48, {
        schoolGroup: 2,
        zOffset: -0.02,
      });
    }

    // Majestic Green Sea Turtles gliding through surface currents
    addCreature('green_sea_turtle', -14, -1.6, -38, 38, { zOffset: -0.02 });
    addCreature('green_sea_turtle', 24, -3.8, -12, 48, { zOffset: -0.02 });

    // Silver Scalare Angelfish (hovering near open reef)
    addCreature('freshwater_angelfish', -26, -2.8, -38, 10);
    addCreature('freshwater_angelfish', 22, -4.2, 8, 48);

    // ==========================================
    // 2. SUNLIT SHALLOWS (Y: -7.0 to -25.0)
    // ==========================================
    // Ocellaris Clownfish in central open lagoon channel & eastern temple cove
    addCreature('coral_clownfish', -2, -12.0, -8, 8);
    addCreature('coral_clownfish', 4, -14.5, -6, 8);
    addCreature('coral_clownfish', 20, -20.0, 14, 38);
    addCreature('coral_clownfish', 32, -21.5, 18, 42);

    // Psychedelic Mandarinfish in western grotto & central open floors
    addCreature('mandarinfish', -24, -21.0, -34, -14);
    addCreature('mandarinfish', 2, -23.0, -8, 8);
    addCreature('mandarinfish', 28, -22.0, 18, 42);

    // Pacific Pygmy Seahorses (anchored in open grotto)
    addCreature('pygmy_seahorse', -22, -22.0, -30, -14);
    addCreature('pygmy_seahorse', 24, -22.5, 16, 36);

    // Peacock Flounders (skimming open seafloor sand)
    addCreature('mottled_flounder', -26, -23.8, -36, -14);
    addCreature('mottled_flounder', 0, -23.8, -10, 10);
    addCreature('mottled_flounder', 30, -24.2, 16, 44);

    // ==========================================
    // 3. TWILIGHT REEF (Y: -25.0 to -60.0)
    // ==========================================
    // Red Lionfish in Central Crossroads & Eastern Arch
    addCreature('red_lionfish', -10, -34.0, -24, 6);
    addCreature('red_lionfish', 18, -36.0, 4, 34);
    addCreature('red_lionfish', 48, -48.0, 36, 68);

    // Giant Moray Eels in Schooner Cove open water
    addCreature('giant_moray', -65, -48.0, -82, -48);
    addCreature('giant_moray', 12, -54.0, 0, 24);

    // Broadbill Swordfish (high-speed horizontal cruisers in open crossroads)
    addCreature('broadbill_swordfish', -10, -36.0, -32, 24);
    addCreature('broadbill_swordfish', 60, -50.0, 42, 78);

    // Giant Oceanic Manta Rays (graceful gliders across open crossroads)
    addCreature('pelagic_manta_ray', -12, -46.0, -40, 20, { zOffset: -0.06 });
    addCreature('pelagic_manta_ray', 64, -52.0, 46, 82, { zOffset: -0.06 });

    // Moonlit Medusa (pulsating cyan jellyfish in open coves)
    const jellySpawns = [
      { x: -14, y: -34, minY: -50, maxY: -26 },
      { x: 12, y: -40, minY: -54, maxY: -28 },
      { x: -65, y: -48, minY: -58, maxY: -38 },
      { x: 60, y: -42, minY: -54, maxY: -32 },
      { x: -50, y: -52, minY: -60, maxY: -38 },
      { x: 24, y: -54, minY: -62, maxY: -40 },
    ];
    jellySpawns.forEach((j) => {
      addCreature('luminescent_medusa', j.x, j.y, j.x - 10, j.x + 10, {
        minY: j.minY,
        maxY: j.maxY,
        zOffset: -0.02,
      });
    });

    // ==========================================
    // 4. MIDNIGHT TRENCH (Y: -60.0 to -90.0)
    // ==========================================
    // Scalloped Hammerhead Sharks in wide open trench
    addCreature('hammerhead_shark', -24, -72.0, -48, 20);
    addCreature('hammerhead_shark', 20, -78.0, -15, 52);

    // Apex Great White Shark (colossal predatory patrol in open trench)
    addCreature('great_white_shark', 0, -74.0, -40, 40, { zOffset: -0.05 });

    // Pelagic Ocean Sunfish (massive slow drift)
    addCreature('ocean_sunfish', -16, -72.0, -38, 16);
    addCreature('ocean_sunfish', 30, -80.0, 10, 55);

    // Humpback Anglerfish (pitch-black ambush with glowing lure in open canyon)
    addCreature('abyssal_anglerfish', 24, -80.0, 8, 48);
    addCreature('abyssal_anglerfish', -20, -78.0, -42, 6);

    // ==========================================
    // 5. ABYSSAL DEPTHS (Y: -90.0 to -110.0)
    // ==========================================
    // Abyssal Porcupine Puffers in open abyssal water
    addCreature('abyssal_pufferfish', -25, -98.0, -45, 10);
    addCreature('abyssal_pufferfish', 20, -100.0, -8, 45);

    // Ancient Oceanic Leviathan (Colossal Mythical Whale)
    addCreature('ancient_leviathan', 0, -105.0, -42, 42, {
      zOffset: -0.15, // Majestic background titan
    });
  }

  public update(
    delta: number,
    bounds: WorldBounds,
    playerPos?: THREE.Vector3,
    playerVel?: THREE.Vector2,
    playerFacing: 1 | -1 = 1,
    playerPitch: number = 0,
    companionPos: THREE.Vector3 | null = null,
    isCompanionActive: boolean = false,
    caveSystem?: CaveSystem
  ): void {
    this.time += delta;
    this.observationCooldown -= delta;

    // Check player observation proximity
    if (playerPos && this.observationCooldown <= 0) {
      this.observationCooldown = 0.2; // Check 5 times per sec
      this.checkPlayerObservation(playerPos);
    }

    const pX = playerPos?.x ?? 0;
    const pY = playerPos?.y ?? 0;
    const pSpeed = playerVel?.length() ?? 0;

    // Calculate diver flashlight direction vector
    const dirX = Math.cos(playerPitch) * playerFacing;
    const dirY = Math.sin(playerPitch);

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];

      // Handle animated sprite cycles (Whale, Jellyfish)
      if (c.animTextures && c.animTextures.length > 0) {
        c.animTimer += delta * (c.def.animationSpeed || 4);
        const nextFrame = Math.floor(c.animTimer) % c.animTextures.length;
        if (nextFrame !== c.currentFrame) {
          c.currentFrame = nextFrame;
          const mat = c.mesh.material as THREE.MeshBasicMaterial;
          mat.map = c.animTextures[nextFrame];
          mat.needsUpdate = true;
        }
      }

      // Vertical drifting (e.g. Jellyfish)
      if (c.behavior === 'slow_drift' && c.minY !== undefined && c.maxY !== undefined) {
        c.mesh.position.y += Math.sin(this.time * 0.9 + c.swimTimer) * 0.4 * delta + 0.65 * delta;
        c.mesh.position.x += Math.sin(this.time * 0.6 + c.swimTimer) * 0.3 * delta;

        const pulse = 1.0 + Math.sin(this.time * 2.4 + c.swimTimer) * 0.06;
        c.mesh.scale.set(c.baseScale * pulse, c.baseScale * pulse, 1.0);

        if (c.mesh.position.y > c.maxY) {
          c.mesh.position.y = c.minY;
        }
        this.updateLightingAndSilhouette(c, playerPos, dirX, dirY, companionPos, isCompanionActive);
        continue;
      }

      // Distance to diver
      const dx = c.mesh.position.x - pX;
      const dy = c.mesh.position.y - pY;
      const distSq = dx * dx + dy * dy;

      // Behavioral dynamics
      switch (c.behavior) {
        case 'curious':
          // Approaching player if within 6.0 units, circling gently
          if (distSq < 36 && distSq > 6) {
            const angle = Math.atan2(-dy, -dx);
            c.vx += (Math.cos(angle) * c.def.baseSpeed - c.vx) * delta * 2;
          }
          break;

        case 'flee':
          // Darting away if fast diver approaches within 5.0 units
          if (distSq < 25 && pSpeed > 3.0) {
            c.vx = (dx > 0 ? 1 : -1) * c.def.baseSpeed * 1.8;
          }
          break;

        case 'schooling':
          // Subtle school cohesion: align with neighbors in same group
          if (c.schoolGroup) {
            const neighbor = this.creatures.find(
              (other) => other.schoolGroup === c.schoolGroup && other !== c
            );
            if (neighbor) {
              const diffX = neighbor.mesh.position.x - c.mesh.position.x;
              if (Math.abs(diffX) > 6) {
                c.vx += (Math.sign(diffX) * c.def.baseSpeed - c.vx) * delta * 0.9;
              }
            }
          }
          break;

        case 'lurker':
          // Near stationary ambush predator
          c.vx *= 0.96;
          break;
      }

      // Horizontal swimming movement
      c.mesh.position.x += c.vx * delta;

      // Gentle vertical sinusoidal bobbing
      const bob = Math.sin(this.time * (c.def.baseSpeed * 0.6) + c.swimTimer) * 0.18;
      c.mesh.position.y = c.baseY + bob;

      // Physical solid rock cave collision prevention: turn around smoothly upon touching rock
      if (caveSystem) {
        const creatureRadius = Math.max(c.width, c.height) * 0.40;
        const collided = caveSystem.resolveCreatureCollision(c.mesh.position, c, creatureRadius);
        if (collided) {
          c.vx = -c.vx;
          c.targetFacing = c.vx > 0 ? 1 : -1;
          c.turnProgress = 0;
        }
      }

      // Boundary turn-around with margin
      const minX = Math.max(c.minX, bounds.minX + 3);
      const maxX = Math.min(c.maxX, bounds.maxX - 3);

      if (c.vx > 0 && c.mesh.position.x >= maxX) {
        c.vx = -Math.abs(c.vx);
        c.targetFacing = -1;
        c.turnProgress = 0;
      } else if (c.vx < 0 && c.mesh.position.x <= minX) {
        c.vx = Math.abs(c.vx);
        c.targetFacing = 1;
        c.turnProgress = 0;
      } else if (c.vx > 0 && c.targetFacing !== 1) {
        c.targetFacing = 1;
        c.turnProgress = 0;
      } else if (c.vx < 0 && c.targetFacing !== -1) {
        c.targetFacing = -1;
        c.turnProgress = 0;
      }

      // Smooth turning transition & directional texture swapping
      if (c.turnProgress < 1.0) {
        c.turnProgress += delta * c.turnSpeed;
        if (c.turnProgress >= 0.5 && c.facing !== c.targetFacing) {
          c.facing = c.targetFacing;
          if (c.leftTex && c.rightTex) {
            const mat = c.mesh.material as THREE.MeshBasicMaterial;
            mat.map = c.facing === 1 ? c.rightTex : c.leftTex;
            mat.needsUpdate = true;
          }
          if (c.lureMesh) {
            // Reposition lure to match new facing
            c.lureMesh.position.x = 0.48 * c.facing;
          }
        }
        // Smooth turn squash & stretch mimicking 3D rotation in perspective
        const turnSquash = 0.62 + 0.38 * Math.cos(c.turnProgress * Math.PI);
        c.mesh.scale.x = c.facing * c.baseScale * turnSquash;
      } else {
        c.mesh.scale.x = c.facing * c.baseScale;
      }
      c.mesh.scale.y = c.baseScale;

      // Swim spine undulation (tail-driven locomotion)
      c.swimTimer += delta;
      const posAttr = c.geom.attributes.position;
      const count = posAttr.count;

      for (let v = 0; v < count; v++) {
        const lx = posAttr.getX(v);
        const by = c.baseYPositions[v];

        // Head stays steady; tail sweeps back and forth with quadratic amplitude
        const t =
          c.facing === 1
            ? THREE.MathUtils.clamp(0.5 - lx / c.width, 0, 1)
            : THREE.MathUtils.clamp(0.5 + lx / c.width, 0, 1);
        const weight = t * t;
        const wave = Math.sin(c.swimTimer * c.swimFreq + (c.facing === 1 ? -lx : lx) * 3.2);
        posAttr.setY(v, by + wave * weight * c.tailAmp);
      }
      posAttr.needsUpdate = true;

      // Natural swim pitch tilt (subtle and realistic, clamped)
      const targetPitch = THREE.MathUtils.clamp((c.vy / (Math.abs(c.vx) + 0.5)) * 0.22, -0.20, 0.20);
      c.mesh.rotation.z += (targetPitch - c.mesh.rotation.z) * Math.min(1, delta * 6);

      // Anglerfish lure bioluminescent flicker
      if (c.lureMesh) {
        const pulse = 0.68 + Math.sin(this.time * 4.2 + c.swimTimer) * 0.28;
        (c.lureMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      }

      // Distance and darkness-based atmospheric silhouette blending
      this.updateLightingAndSilhouette(c, playerPos, dirX, dirY, companionPos, isCompanionActive);
    }
  }

  /**
   * Evaluates diver flashlight, halo, companion glow, and ambient ocean depth to blend
   * creature materials into mysterious atmospheric silhouettes outside direct light
   */
  private updateLightingAndSilhouette(
    c: CreatureEntity,
    playerPos?: THREE.Vector3,
    diverDirX = 1,
    diverDirY = 0,
    companionPos: THREE.Vector3 | null = null,
    isCompanionActive = false
  ): void {
    const mat = c.mesh.material as THREE.MeshBasicMaterial;
    if (!mat) return;

    // Ambient light at creature depth
    const ambient = LightingSystem.getAmbientLightAtY(c.mesh.position.y);

    let flashlightLight = 0;
    let diverHalo = 0;
    let companionLight = 0;

    if (playerPos) {
      const dx = c.mesh.position.x - playerPos.x;
      const dy = c.mesh.position.y - playerPos.y;
      const distDiver = Math.sqrt(dx * dx + dy * dy);

      if (distDiver > 0.01) {
        const nx = dx / distDiver;
        const ny = dy / distDiver;
        const dot = nx * diverDirX + ny * diverDirY;

        // Flashlight beam: half-angle ~38 degrees, range ~15m
        if (dot > 0.70 && distDiver < 15.0) {
          const cone = THREE.MathUtils.smoothstep(dot, 0.70, 0.94);
          const distF = THREE.MathUtils.smoothstep(15.0 - distDiver, 0, 14.0);
          flashlightLight = cone * distF * 0.95;
        }

        // Diver ambient proximity halo
        diverHalo = THREE.MathUtils.smoothstep(4.0 - distDiver, 0, 3.5) * 0.65;
      }

      // Companion fish localized cyan illumination
      if (isCompanionActive && companionPos) {
        const cdx = c.mesh.position.x - companionPos.x;
        const cdy = c.mesh.position.y - companionPos.y;
        const distComp = Math.sqrt(cdx * cdx + cdy * cdy);
        if (distComp < 7.0) {
          companionLight = THREE.MathUtils.smoothstep(7.0 - distComp, 0, 6.0) * 0.90;
        }
      }
    }

    const totalIllum = THREE.MathUtils.clamp(
      ambient + flashlightLight + diverHalo + companionLight,
      0.0,
      1.0
    );

    // Depth-tuned atmospheric silhouette color (ABZÛ / documentary deep sea aesthetic)
    const y = c.mesh.position.y;
    let baseSilhouette: THREE.Color;
    if (y < -60) {
      baseSilhouette = new THREE.Color(0x020817); // Inky abyssal navy
    } else if (y < -25) {
      baseSilhouette = new THREE.Color(0x071b30); // Deep twilight teal-navy
    } else {
      baseSilhouette = new THREE.Color(0x133852); // Upper photic muted blue
    }

    // Preserve vector silhouette details; subtly illuminate on flashlight or companion
    const illumFactor = Math.pow(totalIllum, 0.85);
    const litColor = new THREE.Color(0xa5cde5);
    mat.color.copy(baseSilhouette).lerp(litColor, illumFactor * 0.70);
  }

  private checkPlayerObservation(playerPos: THREE.Vector3): void {
    const observationRadiusSq = 7.0 * 7.0; // 7 units observation radius

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      const dx = c.mesh.position.x - playerPos.x;
      const dy = c.mesh.position.y - playerPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= observationRadiusSq) {
        journalManager.recordSpecies(c.speciesId);
      }
    }
  }

  public destroy(): void {
    this.creatures.forEach((c) => {
      c.mesh.geometry.dispose();
      if (Array.isArray(c.mesh.material)) {
        c.mesh.material.forEach((m) => m.dispose());
      } else {
        c.mesh.material.dispose();
      }
    });
    this.creatures = [];
  }
}
