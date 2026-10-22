import * as THREE from 'three';
import { WorldBounds } from './types';
import { AssetLoader } from './AssetLoader';
import { CaveSystem } from './CaveSystem';

type PlayerAnimState = 'idle' | 'swim' | 'fast';

interface AnimConfig {
  texture: THREE.Texture;
  frames: number;
  fps: number;
}

export class Player {
  public mesh: THREE.Group;
  public velocity: THREE.Vector2 = new THREE.Vector2(0, 0);
  public maxSpeed = 7.5;
  public acceleration = 22.0;
  public drag = 3.2;

  private facing: 1 | -1 = 1;
  private currentScaleX = 1;
  private flashlightMesh!: THREE.Mesh;
  private flashlightMat!: THREE.ShaderMaterial;
  private diverHaloMesh!: THREE.Mesh;
  private time = 0;

  // Collision boundary margin
  public readonly radius = 0.85;

  // Animated sprite properties
  private spriteMesh!: THREE.Mesh;
  private spriteMaterial!: THREE.MeshBasicMaterial;
  private animState: PlayerAnimState = 'idle';
  private frameTimer = 0;
  private currentFrame = 0;
  private animConfigs: Map<PlayerAnimState, AnimConfig> = new Map();

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'player_group';
    this.mesh.position.set(-18.3, -2.0, 0);

    this.initDiverCharacter();
    this.initWarmFlashlight();
  }

  /**
   * Initializes the high-resolution, modern technical scuba diver sprite sheet
   * with smooth flutter-kick swim cycle matching the reference art direction.
   */
  private initDiverCharacter(): void {
    const loader = AssetLoader.getInstance();

    // 8-frame high-resolution diver swim animation sheet (2048x128 px)
    const baseTex = loader.loadTexture('/assets/player/diver_swim_sheet.png', { nearest: false });

    const idleTex = baseTex.clone();
    idleTex.repeat.set(1 / 8, 1);
    idleTex.needsUpdate = true;

    const swimTex = baseTex.clone();
    swimTex.repeat.set(1 / 8, 1);
    swimTex.needsUpdate = true;

    const fastTex = baseTex.clone();
    fastTex.repeat.set(1 / 8, 1);
    fastTex.needsUpdate = true;

    this.animConfigs.set('idle', { texture: idleTex, frames: 8, fps: 4 });
    this.animConfigs.set('swim', { texture: swimTex, frames: 8, fps: 8 });
    this.animConfigs.set('fast', { texture: fastTex, frames: 8, fps: 14 });

    // Proportional dimensions: 2.5 units length x 1.25 units height
    const planeGeo = new THREE.PlaneGeometry(2.5, 1.25);
    this.spriteMaterial = new THREE.MeshBasicMaterial({
      map: idleTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.spriteMesh = new THREE.Mesh(planeGeo, this.spriteMaterial);
    this.spriteMesh.position.set(0, 0, 0.25);
    this.spriteMesh.renderOrder = 22;
    this.mesh.add(this.spriteMesh);
  }

  /**
   * Generates the volumetric conical flashlight beam with internal dust mote shimmer,
   * soft radial & angular light falloff, and warm lens flare matching the reference screenshots.
   */
  private initWarmFlashlight(): void {
    const beamW = 9.6;
    const beamH = 5.4;
    const beamGeo = new THREE.PlaneGeometry(beamW, beamH);
    beamGeo.translate(beamW / 2, 0, 0); // Origin anchored at handheld torch lens

    this.flashlightMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.48 },
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
        uniform float uOpacity;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          // vUv.x: 0.0 at torch lens -> 1.0 at far end of cone
          // vUv.y: 0.5 is centerline
          float x = vUv.x;
          float y = vUv.y - 0.5;

          // Cone expands smoothly from a tight lens aperture (0.025) out to full width (0.48)
          float halfWidth = mix(0.024, 0.48, pow(x, 0.88));
          float normY = abs(y) / max(0.001, halfWidth);
          if (normY > 1.0) discard;

          // Soft Gaussian-like angular falloff across the cone cross-section
          float angularFalloff = pow(1.0 - normY * normY, 1.85);

          // Soft longitudinal falloff from bright lens hotspot to distant fade
          float distFalloff = smoothstep(0.0, 0.035, x) * pow(1.0 - smoothstep(0.08, 1.0, x), 1.45);

          // Subtle internal volumetric light rays / streaks inside the flashlight cone
          float angleRatio = y / max(0.001, halfWidth);
          float rayStreaks = 0.84 +
            0.10 * sin(angleRatio * 18.0 + uTime * 0.9) +
            0.06 * cos(angleRatio * 31.0 - uTime * 1.3);

          // Floating micro-dust motes shimmering inside the beam
          vec2 moteUv = vec2(x * 16.0 - uTime * 0.35, (y + 0.5) * 10.0 + sin(uTime * 0.4 + x * 4.0) * 0.4);
          vec2 cell = floor(moteUv);
          vec2 f = fract(moteUv) - 0.5;
          float rnd = hash(cell);
          float mote = 0.0;
          if (rnd > 0.72) {
            vec2 offset = vec2(fract(rnd * 13.7) - 0.5, fract(rnd * 29.3) - 0.5) * 0.5;
            float d = length(f - offset);
            float twinkle = 0.5 + 0.5 * sin(uTime * 4.0 + rnd * 25.0);
            mote = smoothstep(0.18, 0.02, d) * twinkle * angularFalloff * (1.0 - x * 0.7);
          }

          // Bright lens hotspot near x = 0.02
          float hotspot = exp(-x * 18.0) * pow(max(0.0, 1.0 - normY), 2.5) * 0.85;

          float intensity = (angularFalloff * distFalloff * rayStreaks + hotspot + mote * 0.55) * uOpacity;
          if (intensity < 0.002) discard;

          // Color gradient: warm white-gold at lens -> golden amber mid -> soft honey gold tip
          vec3 cLens = vec3(1.0, 0.98, 0.86);
          vec3 cMid  = vec3(0.99, 0.85, 0.32);
          vec3 cFar  = vec3(0.92, 0.65, 0.12);
          vec3 col = mix(cLens, mix(cMid, cFar, smoothstep(0.15, 0.85, x)), smoothstep(0.0, 0.30, x));
          col += vec3(1.0, 0.96, 0.75) * mote * 0.65;

          gl_FragColor = vec4(col, clamp(intensity, 0.0, 0.95));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.flashlightMesh = new THREE.Mesh(beamGeo, this.flashlightMat);
    this.flashlightMesh.position.set(0.75, -0.02, 0.22);
    this.flashlightMesh.renderOrder = 21;
    this.mesh.add(this.flashlightMesh);

    // Subtle warm ambient halo around the diver & torch
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hctx = haloCanvas.getContext('2d');
    if (hctx) {
      const hgrad = hctx.createRadialGradient(64, 64, 4, 64, 64, 60);
      hgrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.38)');
      hgrad.addColorStop(0.45, 'rgba(250, 204, 21, 0.14)');
      hgrad.addColorStop(1.0, 'rgba(234, 179, 8, 0.0)');
      hctx.fillStyle = hgrad;
      hctx.fillRect(0, 0, 128, 128);
    }
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.diverHaloMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), haloMat);
    this.diverHaloMesh.position.set(0.25, 0, 0.20);
    this.diverHaloMesh.renderOrder = 20;
    this.mesh.add(this.diverHaloMesh);
  }

  /**
   * Updates diver kinematics, animation state, wall collision with sliding, and boundaries
   */
  public update(
    delta: number,
    input: { x: number; y: number },
    isBoost: boolean,
    bounds: WorldBounds,
    caveSystem?: CaveSystem
  ): void {
    this.time += delta;

    // 1. Calculate Acceleration & Max Speed
    const currentMaxSpeed = isBoost ? this.maxSpeed * 1.45 : this.maxSpeed;
    const currentAccel = isBoost ? this.acceleration * 1.4 : this.acceleration;

    const inputLen = Math.hypot(input.x, input.y);

    if (inputLen > 0.01) {
      this.velocity.x += input.x * currentAccel * delta;
      this.velocity.y += input.y * currentAccel * delta;

      if (input.x > 0.05) this.facing = 1;
      else if (input.x < -0.05) this.facing = -1;
    } else {
      const dragFactor = Math.max(0, 1 - this.drag * delta);
      this.velocity.x *= dragFactor;
      this.velocity.y *= dragFactor;

      if (this.velocity.lengthSq() < 0.001) {
        this.velocity.set(0, 0);
      }
    }

    const speed = this.velocity.length();
    if (speed > currentMaxSpeed) {
      this.velocity.multiplyScalar(currentMaxSpeed / speed);
    }

    // 2. Integrate Position
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // 3. Physical Solid Rock Collision & Smooth Wall Sliding
    if (caveSystem) {
      caveSystem.resolvePlayerCollision(this.mesh.position, this.velocity, this.radius);
    }

    // 4. Enforce World Outer Boundaries & Water Surface Ceiling
    const minX = bounds.minX + this.radius;
    const maxX = bounds.maxX - this.radius;
    const minY = bounds.minY + this.radius;

    // Diver is submerged in the ocean: cannot swim into the air above the surface!
    const maxSurfaceWaterY = -0.45;
    const maxY = Math.min(bounds.maxY - this.radius, maxSurfaceWaterY);

    if (this.mesh.position.x < minX) {
      this.mesh.position.x = minX;
      this.velocity.x = 0;
    } else if (this.mesh.position.x > maxX) {
      this.mesh.position.x = maxX;
      this.velocity.x = 0;
    }

    if (this.mesh.position.y < minY) {
      this.mesh.position.y = minY;
      this.velocity.y = 0;
    } else if (this.mesh.position.y >= maxY) {
      this.mesh.position.y = maxY;
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    }

    // 5. Smooth Facing Turn & Realistic Swim Pitch Tilt
    const targetScaleX = this.facing;
    this.currentScaleX += (targetScaleX - this.currentScaleX) * Math.min(1, delta * 16);
    this.mesh.scale.x = this.currentScaleX;

    const pitch = (this.velocity.y / this.maxSpeed) * 0.35 * this.facing;
    this.mesh.rotation.z += (pitch - this.mesh.rotation.z) * Math.min(1, delta * 8);

    // 6. Update Animation State & Sprite Frame
    let targetState: PlayerAnimState = 'idle';
    if (speed > 0.4) {
      targetState = isBoost ? 'fast' : 'swim';
    }

    if (targetState !== this.animState) {
      this.animState = targetState;
      this.frameTimer = 0;
      this.currentFrame = 0;
      const conf = this.animConfigs.get(this.animState);
      if (conf) {
        this.spriteMaterial.map = conf.texture;
        conf.texture.offset.x = 0;
        this.spriteMaterial.needsUpdate = true;
      }
    }

    const currentConf = this.animConfigs.get(this.animState);
    if (currentConf) {
      const speedMultiplier = this.animState === 'idle' ? 1.0 : Math.max(0.7, speed / 3.5);
      this.frameTimer += delta * currentConf.fps * speedMultiplier;

      const nextFrame = Math.floor(this.frameTimer) % currentConf.frames;
      if (nextFrame !== this.currentFrame) {
        this.currentFrame = nextFrame;
        currentConf.texture.offset.x = this.currentFrame / currentConf.frames;
      }
    }

    // 7. Update volumetric flashlight shader uniforms
    if (this.flashlightMat) {
      this.flashlightMat.uniforms.uTime.value = this.time;
      const depthFactor = Math.min(1, Math.max(0, -this.mesh.position.y / 65));
      this.flashlightMat.uniforms.uOpacity.value = 0.44 + depthFactor * 0.24;
    }
  }

  public getRegulatorPosition(): THREE.Vector3 {
    const mouthOffset = new THREE.Vector3(0.52 * this.facing, 0.08, 0);
    mouthOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.mesh.rotation.z);
    return this.mesh.position.clone().add(mouthOffset);
  }

  public getFinPosition(): THREE.Vector3 {
    const finOffset = new THREE.Vector3(-1.05 * this.facing, -0.05, 0);
    finOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.mesh.rotation.z);
    return this.mesh.position.clone().add(finOffset);
  }

  public getFlashlightOrigin(): THREE.Vector2 {
    const lensOffset = new THREE.Vector3(0.75 * this.facing, -0.02, 0);
    lensOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.mesh.rotation.z);
    return new THREE.Vector2(
      this.mesh.position.x + lensOffset.x,
      this.mesh.position.y + lensOffset.y
    );
  }

  public getFlashlightDirection(): THREE.Vector2 {
    const angle = this.mesh.rotation.z;
    return new THREE.Vector2(
      Math.cos(angle) * this.facing,
      Math.sin(angle)
    ).normalize();
  }

  public getFacing(): 'left' | 'right' {
    return this.facing === 1 ? 'right' : 'left';
  }

  public getFacingValue(): 1 | -1 {
    return this.facing;
  }

  public getPitch(): number {
    return this.mesh.rotation.z;
  }

  public reset(x = -18.3, y = -2.0): void {
    this.mesh.position.set(x, y, 0);
    this.velocity.set(0, 0);
    this.facing = 1;
    this.currentScaleX = 1;
    this.mesh.rotation.z = 0;
    this.animState = 'idle';
    this.frameTimer = 0;
    this.currentFrame = 0;
  }

  public destroy(): void {
    if (this.spriteMesh) {
      this.spriteMesh.geometry.dispose();
      this.spriteMaterial.dispose();
    }
    if (this.flashlightMesh) {
      this.flashlightMesh.geometry.dispose();
      this.flashlightMat.dispose();
    }
    if (this.diverHaloMesh) {
      this.diverHaloMesh.geometry.dispose();
      (this.diverHaloMesh.material as THREE.Material).dispose();
    }
    for (const [, conf] of this.animConfigs) {
      conf.texture.dispose();
    }
  }
}
