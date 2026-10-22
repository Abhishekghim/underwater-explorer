import * as THREE from 'three';
import { WorldBounds } from './types';

export class CameraController {
  public camera: THREE.OrthographicCamera;
  public readonly viewHeight = 18; // Fixed vertical world units visible
  public viewWidth = 32;
  private halfWidth = 0;
  private halfHeight = 0;
  private smoothFactor = 4.5;

  constructor(aspect: number) {
    this.halfHeight = this.viewHeight / 2;
    this.halfWidth = this.halfHeight * aspect;
    this.viewWidth = this.halfWidth * 2;

    this.camera = new THREE.OrthographicCamera(
      -this.halfWidth,
      this.halfWidth,
      this.halfHeight,
      -this.halfHeight,
      -50,
      50
    );
    this.camera.position.set(-18.3, 1.0, 10);
    this.camera.lookAt(-18.3, 1.0, 0);
  }

  public resize(width: number, height: number): void {
    if (height === 0) return;
    const aspect = width / height;
    this.halfHeight = this.viewHeight / 2;
    this.halfWidth = this.halfHeight * aspect;
    this.viewWidth = this.halfWidth * 2;

    this.camera.left = -this.halfWidth;
    this.camera.right = this.halfWidth;
    this.camera.top = this.halfHeight;
    this.camera.bottom = -this.halfHeight;
    this.camera.updateProjectionMatrix();
  }

  public update(
    delta: number,
    target: THREE.Vector3,
    targetVelocity: THREE.Vector2,
    bounds: WorldBounds
  ): void {
    // Subtle lead in direction of motion for cinematic feel
    const lookaheadX = targetVelocity.x * 0.15;
    const lookaheadY = targetVelocity.y * 0.12;

    // When the diver is near the surface (Y > -5.5), smoothly bias camera Y upward
    // so the waterline sits around ~58% down the viewport and the full Sky + Hero Title
    // + Sailboat + Seabirds scene is framed identically to the portfolio website!
    const surfaceFactor = THREE.MathUtils.clamp((target.y + 5.5) / 4.2, 0, 1);
    const surfaceBiasY = surfaceFactor * 3.1;

    const targetX = target.x + lookaheadX;
    const targetY = target.y + lookaheadY + surfaceBiasY;

    // Exponential smoothing
    const t = 1 - Math.exp(-this.smoothFactor * delta);
    this.camera.position.x += (targetX - this.camera.position.x) * t;
    this.camera.position.y += (targetY - this.camera.position.y) * t;

    // Enforce world view boundaries so camera doesn't peer past world limits
    const minCamX = bounds.minX + this.halfWidth;
    const maxCamX = bounds.maxX - this.halfWidth;
    const minCamY = bounds.minY + this.halfHeight;
    const maxCamY = bounds.maxY - this.halfHeight;

    if (minCamX <= maxCamX) {
      this.camera.position.x = Math.max(
        minCamX,
        Math.min(maxCamX, this.camera.position.x)
      );
    } else {
      this.camera.position.x = (bounds.minX + bounds.maxX) / 2;
    }

    if (minCamY <= maxCamY) {
      this.camera.position.y = Math.max(
        minCamY,
        Math.min(maxCamY, this.camera.position.y)
      );
    } else {
      this.camera.position.y = (bounds.minY + bounds.maxY) / 2;
    }
  }

  public snapTo(x: number, y: number): void {
    const surfaceFactor = THREE.MathUtils.clamp((y + 5.5) / 4.2, 0, 1);
    const surfaceBiasY = surfaceFactor * 3.1;
    this.camera.position.set(x, y + surfaceBiasY, 10);
  }
}
