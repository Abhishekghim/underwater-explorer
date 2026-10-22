import * as THREE from 'three';
import { AssetLoader } from './AssetLoader';
import { ParticleSystem } from './ParticleSystem';

export interface CompanionEvents {
  onRescuePromptChange?: (canRescue: boolean) => void;
  onCompanionRescued?: () => void;
}

export class CompanionManager {
  public group: THREE.Group;
  private isRescued = false;
  private isRescuing = false;
  private rescueProgress = 0;

  // Trapped encounter spot in Western Luminescent Caverns
  public readonly encounterPos = new THREE.Vector2(-75, -58);
  private trappedGroup: THREE.Group;
  private fishMesh: THREE.Mesh;
  private leftTex: THREE.Texture;
  private rightTex: THREE.Texture;
  private netMesh: THREE.Mesh | null = null;
  private auraMesh: THREE.Mesh;

  // Companion follow movement
  private currentScaleX = 1;
  private facing: 1 | -1 = 1;
  private velocity = new THREE.Vector2(0, 0);
  private time = 0;
  private distressTimer = 0;
  private events: CompanionEvents;

  private static readonly STORAGE_KEY = 'underwater_companion_rescued';

  constructor(events: CompanionEvents = {}) {
    this.events = events;
    this.group = new THREE.Group();
    this.group.name = 'companion_system';

    const loader = AssetLoader.getInstance();

    // Check local persistence safely
    this.isRescued = this.checkSavedRescueState();

    this.trappedGroup = new THREE.Group();
    this.trappedGroup.position.set(this.encounterPos.x, this.encounterPos.y, 0.1);

    // 1. Companion fish mesh (Refined silhouette Clownfish)
    this.fishMesh = loader.createTexturedPlane(
      '/assets/silhouettes/clownfish.svg',
      0.45,
      0.30
    );
    this.fishMesh.position.set(0, 0, 0.05);

    // Load silhouette texture
    this.leftTex = loader.loadTexture('/assets/silhouettes/clownfish.svg');
    this.rightTex = loader.loadTexture('/assets/silhouettes/clownfish.svg');

    // 2. Soft, atmospheric cyan bioluminescent aura attached to the fish
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const ctx = auraCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
      grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.32)');
      grad.addColorStop(0.7, 'rgba(2, 132, 199, 0.08)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const auraTex = new THREE.CanvasTexture(auraCanvas);
    const auraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.auraMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), auraMat);
    this.auraMesh.position.set(0, 0, -0.02);
    this.fishMesh.add(this.auraMesh);

    // All underwater creatures (including companion fish) removed per user request
    this.auraMesh.visible = false;
    this.isRescued = false;
  }

  private checkSavedRescueState(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(CompanionManager.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private saveRescueState(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CompanionManager.STORAGE_KEY, 'true');
    } catch {
      // Ignore private browsing storage restrictions safely
    }
  }

  public getIsRescued(): boolean {
    return false;
  }

  public getCompanionPosition(): THREE.Vector3 {
    return this.fishMesh.getWorldPosition(new THREE.Vector3());
  }

  /**
   * Updates trapped encounter behavior or follow-diver companion behavior
   */
  public update(
    delta: number,
    diverPos: THREE.Vector3,
    diverFacing: 1 | -1,
    diverVelocity: THREE.Vector2,
    particleSystem: ParticleSystem,
    canInteractInput: boolean
  ): void {
    this.time += delta;
  }

  private updateTrappedEncounter(
    delta: number,
    diverPos: THREE.Vector3,
    particleSystem: ParticleSystem,
    canInteractInput: boolean
  ): void {
    const distToDiver = diverPos.distanceTo(
      new THREE.Vector3(this.encounterPos.x, this.encounterPos.y, 0)
    );

    const isNear = distToDiver < 4.2;
    this.events.onRescuePromptChange?.(isNear && !this.isRescuing);

    // 1. Distressed struggle animation
    if (!this.isRescuing) {
      const struggle = Math.sin(this.time * 16) * 0.08;
      this.fishMesh.rotation.z = struggle;
      this.fishMesh.position.x = Math.sin(this.time * 12) * 0.04;
      this.fishMesh.position.y = Math.cos(this.time * 10) * 0.03;

      // Occasional distress bubbles
      this.distressTimer += delta;
      if (this.distressTimer > 1.2 && isNear) {
        this.distressTimer = 0;
        particleSystem.spawnBubble(
          this.encounterPos.x + 0.2,
          this.encounterPos.y + 0.1,
          (Math.random() - 0.5) * 0.2,
          1.2,
          0.4,
          2.0
        );
      }

      // Check rescue trigger
      if (isNear && canInteractInput) {
        this.startRescue(particleSystem);
      }
    } else {
      // 2. Rescue sequence animation
      this.rescueProgress += delta * 1.5;

      // Net fades and dissolves away
      if (this.netMesh) {
        const mat = this.netMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1.0 - this.rescueProgress);
        this.netMesh.scale.multiplyScalar(0.97);
      }

      // Fish performs celebratory joyous spin
      this.fishMesh.rotation.z += delta * 14;

      if (this.rescueProgress >= 1.0) {
        this.completeRescue();
      }
    }
  }

  private startRescue(particleSystem: ParticleSystem): void {
    this.isRescuing = true;
    this.events.onRescuePromptChange?.(false);

    // Joyous bubble burst
    particleSystem.spawnBubbleBurst(this.encounterPos.x, this.encounterPos.y, 8);
  }

  private completeRescue(): void {
    this.isRescued = true;
    this.isRescuing = false;
    this.saveRescueState();

    // Detach from trapped group and attach to main group
    if (this.netMesh) {
      this.trappedGroup.remove(this.netMesh);
      this.netMesh.geometry.dispose();
      (this.netMesh.material as THREE.Material).dispose();
      this.netMesh = null;
    }
    this.trappedGroup.remove(this.fishMesh);
    this.group.remove(this.trappedGroup);

    this.fishMesh.position.set(this.encounterPos.x, this.encounterPos.y, 0.2);
    this.fishMesh.rotation.z = 0;
    this.auraMesh.visible = true;
    this.group.add(this.fishMesh);

    this.events.onCompanionRescued?.();
  }

  private updateRescuedCompanion(
    delta: number,
    diverPos: THREE.Vector3,
    diverFacing: 1 | -1,
    diverVelocity: THREE.Vector2
  ): void {
    // Companion target: floats smoothly behind and slightly above the diver
    const lagDist = 1.6;
    const targetX = diverPos.x - diverFacing * lagDist;
    const bob = Math.sin(this.time * 2.8) * 0.22;
    const targetY = diverPos.y + 0.65 + bob;

    const dx = targetX - this.fishMesh.position.x;
    const dy = targetY - this.fishMesh.position.y;

    // Smooth spring follow with slight fluid lag, adapting to diver velocity
    const diverSpeed = diverVelocity.length();
    const followSpeed = 4.0 + Math.min(2.5, diverSpeed * 0.4);
    this.velocity.x += (dx * followSpeed - this.velocity.x) * Math.min(1, delta * 6);
    this.velocity.y += (dy * followSpeed - this.velocity.y) * Math.min(1, delta * 6);

    this.fishMesh.position.x += this.velocity.x * delta;
    this.fishMesh.position.y += this.velocity.y * delta;

    // Smooth facing turn and horizontal flip
    if (this.velocity.x > 0.08) {
      this.facing = 1;
    } else if (this.velocity.x < -0.08) {
      this.facing = -1;
    }

    // Subtle breathing/swimming scale flutter with horizontal facing
    const swimFlutter = Math.sin(this.time * (diverSpeed > 1 ? 14 : 7)) * 0.03;
    this.fishMesh.scale.set(this.facing * 1.0, 1.0 + swimFlutter, 1.0);

    // Natural swim pitch tilt (subtle and realistic, clamped)
    const targetPitch = THREE.MathUtils.clamp((this.velocity.y / 5.0) * 0.25, -0.22, 0.22);
    this.fishMesh.rotation.z += (targetPitch - this.fishMesh.rotation.z) * Math.min(1, delta * 6);

    // Pulsing cyan aura intensity
    const pulse = 0.50 + Math.sin(this.time * 2.2) * 0.12;
    (this.auraMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
  }

  public destroy(): void {
    this.fishMesh.geometry.dispose();
    (this.fishMesh.material as THREE.Material).dispose();

    if (this.netMesh) {
      this.netMesh.geometry.dispose();
      (this.netMesh.material as THREE.Material).dispose();
    }

    this.auraMesh.geometry.dispose();
    (this.auraMesh.material as THREE.Material).dispose();
  }
}
