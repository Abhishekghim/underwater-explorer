import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { InputManager } from './InputManager';
import { CameraController } from './CameraController';
import { ParticleSystem } from './ParticleSystem';
import { CreatureManager } from './CreatureManager';
import { CompanionManager } from './CompanionManager';
import { LightingSystem } from './LightingSystem';
import { AssetLoader } from './AssetLoader';
import { GameEngineOptions, PlayerStats } from './types';
import { journalManager } from './JournalManager';

export class GameEngine {
  private container: HTMLElement;
  private options: GameEngineOptions;

  public scene: THREE.Scene;
  public fgScene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public fgRenderer: THREE.WebGLRenderer;
  public world: World;
  public player: Player;
  public creatureManager: CreatureManager;
  public companionManager: CompanionManager;
  public lightingSystem: LightingSystem;
  public inputManager: InputManager;
  public cameraController: CameraController;
  public particleSystem: ParticleSystem;

  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTime = 0;
  private statsTimer = 0;
  private resizeObserver: ResizeObserver | null = null;
  private canRescueState = false;
  private gold = 1250;
  private oxygen = 100;
  private energy = 100;

  // Smooth autopilot glide when user clicks a Portfolio Navbar section
  private navTarget: { x: number; y: number } | null = null;

  constructor(container: HTMLElement, options: GameEngineOptions = {}) {
    this.container = container;
    this.options = options;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);

    // 1. Background & World Scene + Foreground Diver Scene
    this.scene = new THREE.Scene();
    this.fgScene = new THREE.Scene();

    // 2. Camera Controller (Orthographic 2D)
    this.cameraController = new CameraController(aspect);

    // 3A. World & Caves Renderer (z-index: 1, behind portfolio cards)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // 3B. Foreground Diver, Flashlight & Bubbles Renderer (z-index: 28, IN FRONT of portfolio cards)
    this.fgRenderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    this.fgRenderer.setClearColor(0x000000, 0);
    this.fgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.fgRenderer.setSize(width, height);
    this.fgRenderer.domElement.style.position = 'absolute';
    this.fgRenderer.domElement.style.inset = '0';
    this.fgRenderer.domElement.style.width = '100%';
    this.fgRenderer.domElement.style.height = '100%';
    this.fgRenderer.domElement.style.pointerEvents = 'none';
    this.fgRenderer.domElement.style.zIndex = '28';
    this.container.appendChild(this.fgRenderer.domElement);

    // 4. World & Marine Systems
    this.world = new World();
    this.scene.add(this.world.group);

    this.creatureManager = new CreatureManager();
    this.scene.add(this.creatureManager.group);

    // Add Player Diver & Particle Bubbles to fgScene so diver is ALWAYS in front of portfolio cards!
    this.player = new Player();
    this.fgScene.add(this.player.mesh);

    this.particleSystem = new ParticleSystem();
    this.fgScene.add(this.particleSystem.group);

    // 5. Companion Fish System
    this.companionManager = new CompanionManager({
      onRescuePromptChange: (canRescue) => {
        this.canRescueState = canRescue;
        this.options.onRescuePromptChange?.(canRescue);
      },
      onCompanionRescued: () => {
        this.options.onCompanionRescued?.();
      },
    });
    this.fgScene.add(this.companionManager.group);

    // 6. Atmospheric Lighting & Depth Darkness System
    this.lightingSystem = new LightingSystem(this.cameraController);
    this.scene.add(this.lightingSystem.group);

    this.inputManager = new InputManager();

    // Initial camera placement at surface hero (-18.3, -2.0)
    this.cameraController.snapTo(-18.3, -2.0);

    // Setup responsive resize
    this.setupResize();
  }

  private setupResize(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.handleResize(width, height);
          }
        }
      });
      this.resizeObserver.observe(this.container);
    }

    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.handleResize(width, height);
    }
  };

  private handleResize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.fgRenderer.setSize(width, height);
    this.cameraController.resize(width, height);
    this.lightingSystem.resize(width, height);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Maps world Y coordinate (0 to -118) to portfolio depth readout (0m to 1000m)
   * matching C:\xampp\htdocs\portfolio depth zones (0m, 30m, 80m, 200m, 600m, 1000m)
   */
  public static worldYToPortfolioDepth(y: number): number {
    if (y >= -2.2) return 0;
    const absY = -y;
    if (absY <= 20) {
      return Math.round(((absY - 2.2) / 17.8) * 35);
    }
    if (absY <= 38) {
      return Math.round(35 + ((absY - 20) / 18) * 65);
    }
    if (absY <= 62) {
      return Math.round(100 + ((absY - 38) / 24) * 140);
    }
    if (absY <= 95) {
      return Math.round(240 + ((absY - 62) / 33) * 380);
    }
    return Math.min(1000, Math.round(620 + ((absY - 95) / 22) * 380));
  }

  private loop = (now: number): void => {
    if (!this.isRunning) return;

    const rawDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const delta = Math.min(rawDelta, 0.1);

    if (this.inputManager.consumeJournalToggle() && this.options.onJournalToggle) {
      this.options.onJournalToggle();
    }

    if (this.inputManager.consumeMapToggle() && this.options.onMapToggle) {
      this.options.onMapToggle();
    }

    // 1. Gather player input
    const input = this.inputManager.getDirection();
    const rawBoost = this.inputManager.isBoost();
    const isBurst = this.inputManager.isBubbleBurst();
    const isInteract = this.inputManager.consumeInteract();

    // Cancel autopilot glide if user manually presses movement keys
    if (Math.abs(input.x) > 0.05 || Math.abs(input.y) > 0.05) {
      this.navTarget = null;
    }

    // Smooth autopilot transition if navigating to a portfolio station
    if (this.navTarget) {
      const dx = this.navTarget.x - this.player.mesh.position.x;
      const dy = this.navTarget.y - this.player.mesh.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.35) {
        this.player.mesh.position.set(this.navTarget.x, this.navTarget.y, 0);
        this.player.velocity.set(0, 0);
        this.navTarget = null;
      } else {
        const t = 1 - Math.exp(-6.5 * delta);
        this.player.mesh.position.x += dx * t;
        this.player.mesh.position.y += dy * t;
        this.player.velocity.set(dx * 2.5, dy * 2.5);
      }
    }

    // Energy & Boost dynamics
    const isMoving = input.x !== 0 || input.y !== 0 || this.navTarget !== null;
    const canBoost = rawBoost && this.energy > 5 && isMoving;
    if (canBoost) {
      this.energy = Math.max(0, this.energy - delta * 25);
    } else {
      this.energy = Math.min(100, this.energy + delta * 15);
    }

    // Oxygen consumption and surface replenishment
    const posY = this.player.mesh.position.y;
    if (posY >= -3.0) {
      this.oxygen = Math.min(100, this.oxygen + delta * 25);
    } else {
      this.oxygen = Math.max(15, this.oxygen - delta * 0.12);
    }

    // 2. Update player kinematics & animated sprite state with cave collision (when not on nav glide)
    this.player.update(
      delta,
      input,
      canBoost,
      this.world.bounds,
      this.navTarget ? undefined : this.world.getCaveSystem()
    );

    // Check coin collection from sunken treasure
    this.world.getCaveSystem().checkCoinCollection(this.player.mesh.position, (value) => {
      this.gold += value;
    });

    // Track exploration distance & depth metrics in JournalManager
    const depthMeters = GameEngine.worldYToPortfolioDepth(this.player.mesh.position.y);
    const distDelta = this.player.velocity.length() * delta;
    journalManager.updatePlayerMetrics(distDelta, depthMeters);

    // 3. Update camera follow with boundary clamping & surface framing
    this.cameraController.update(
      delta,
      this.player.mesh.position,
      this.player.velocity,
      this.world.bounds
    );

    // 4. Update parallax world layers and check landmarks/artifacts
    const camPos = this.cameraController.camera.position;
    this.world.update(delta, camPos.x, camPos.y, this.player.mesh.position, isInteract);

    // 5. Update marine fauna
    this.creatureManager.update(
      delta,
      this.world.bounds,
      this.player.mesh.position,
      this.player.velocity,
      this.player.getFacingValue(),
      this.player.getPitch(),
      this.companionManager.getCompanionPosition(),
      this.companionManager.getIsRescued(),
      this.world.getCaveSystem()
    );

    // 6. Update companion fish
    this.companionManager.update(
      delta,
      this.player.mesh.position,
      this.player.getFacingValue(),
      this.player.velocity,
      this.particleSystem,
      isInteract
    );

    // 7. Update particle effects
    const caveSys = this.world.getCaveSystem();
    if (caveSys.lastSiltContact) {
      const sc = caveSys.lastSiltContact;
      this.particleSystem.spawnSiltCloud(sc.x, sc.y, sc.nx, sc.ny, sc.intensity);
    }

    const isPlayerMoving = this.player.velocity.lengthSq() > 0.1;
    const beamOrigin = this.player.getFlashlightOrigin();
    const beamDir = this.player.getFlashlightDirection();

    this.particleSystem.update(
      delta,
      camPos,
      this.player.getRegulatorPosition(),
      isPlayerMoving,
      isBurst,
      {
        isBoost: canBoost,
        finPos: this.player.getFinPosition(),
        facing: this.player.getFacingValue(),
        pitch: this.player.getPitch(),
        beamOrigin,
        beamDir,
      }
    );

    // 8. Update lighting system
    const compPos = this.companionManager.getCompanionPosition();
    const compActive = this.companionManager.getIsRescued();
    this.lightingSystem.update(
      camPos,
      this.player.mesh.position,
      this.player.getFacingValue(),
      this.player.getPitch(),
      compPos,
      compActive
    );

    // 9. Emit 60fps camera/diver frame state for world-space Portfolio Stations, Lottie Jellyfish & Darkness Canvas
    if (this.options.onFrameUpdate) {
      this.options.onFrameUpdate({
        camX: camPos.x,
        camY: camPos.y,
        viewWidth: this.cameraController.viewWidth,
        viewHeight: this.cameraController.viewHeight,
        diverX: this.player.mesh.position.x,
        diverY: this.player.mesh.position.y,
        diverFacing: this.player.getFacingValue(),
        diverPitch: this.player.getPitch(),
        beamOriginX: beamOrigin.x,
        beamOriginY: beamOrigin.y,
        beamDirX: beamDir.x,
        beamDirY: beamDir.y,
        companionX: compPos ? compPos.x : null,
        companionY: compPos ? compPos.y : null,
        companionActive: compActive,
        depthMeters,
      });
    }

    // 10. Render 2D world scene & foreground diver scene (in front of portfolio cards)
    this.renderer.render(this.scene, this.cameraController.camera);
    this.fgRenderer.render(this.fgScene, this.cameraController.camera);

    // 11. Throttled UI stats notification (~10Hz)
    this.statsTimer += delta;
    if (this.statsTimer >= 0.1) {
      this.statsTimer = 0;
      this.emitStats();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private emitStats(): void {
    if (!this.options.onStatsUpdate) return;

    const posY = this.player.mesh.position.y;
    const depthMeters = GameEngine.worldYToPortfolioDepth(posY);

    const stats: PlayerStats = {
      x: Math.round(this.player.mesh.position.x * 10) / 10,
      y: Math.round(posY * 10) / 10,
      depthMeters,
      speed: Math.round(this.player.velocity.length() * 10) / 10,
      zone: this.world.getZoneAtY(posY),
      facing: this.player.getFacing(),
      companionRescued: this.companionManager.getIsRescued(),
      canRescueCompanion: this.canRescueState,
      nearbyArtifact: this.world.getNearbyArtifact(),
      gold: this.gold,
      oxygen: Math.round(this.oxygen),
      energy: Math.round(this.energy),
    };

    this.options.onStatsUpdate(stats);
  }

  public setPaused(paused: boolean): void {
    this.inputManager.setPaused(paused);
  }

  /**
   * Smoothly glides the diver & camera to any portfolio station coordinate in the map
   */
  public navigateToWorldPosition(x: number, y: number): void {
    this.navTarget = { x, y };
  }

  public resetDiver(): void {
    this.navTarget = null;
    this.player.reset(-18.3, -2.0);
    this.cameraController.snapTo(-18.3, -2.0);
  }

  public triggerInteract(): void {
    this.inputManager.triggerInteract();
  }

  public destroy(): void {
    this.stop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.onWindowResize);

    this.inputManager.destroy();
    this.particleSystem.destroy();
    this.player.destroy();
    this.creatureManager.destroy();
    this.companionManager.destroy();
    this.lightingSystem.destroy();
    this.world.destroy();

    this.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh || (object as THREE.Line).isLine) {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    this.fgScene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh || (object as THREE.Line).isLine) {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    AssetLoader.getInstance().dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      );
    }

    this.fgRenderer.dispose();
    if (this.fgRenderer.domElement.parentElement) {
      this.fgRenderer.domElement.parentElement.removeChild(
        this.fgRenderer.domElement
      );
    }
  }
}
