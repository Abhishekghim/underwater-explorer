import * as THREE from 'three';
import { CameraController } from './CameraController';

export class LightingSystem {
  public group: THREE.Group;
  private overlayMesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private cameraController: CameraController;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;
    this.group = new THREE.Group();
    this.group.name = 'lighting_system';

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 worldP = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldP.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldP;
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      uniform float uAmbient;
      uniform vec2 uDiverPos;
      uniform vec2 uDiverDir;
      uniform float uFlashlightAngle;
      uniform float uFlashlightDist;
      uniform vec2 uCompanionPos;
      uniform float uCompanionActive;
      uniform vec3 uDarknessColor;

      void main() {
        // Darkness temporarily disabled for clear exploration
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
    `;

    const uniforms = {
      uAmbient: { value: 1.0 },
      uDiverPos: { value: new THREE.Vector2(0, 0) },
      uDiverDir: { value: new THREE.Vector2(1, 0) },
      uFlashlightAngle: { value: 0.72 },
      uFlashlightDist: { value: 12.0 },
      uCompanionPos: { value: new THREE.Vector2(0, 0) },
      uCompanionActive: { value: 0.0 },
      uDarknessColor: { value: new THREE.Color(0x000000) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Mesh sized to comfortably cover the camera view plane
    const geo = new THREE.PlaneGeometry(60, 40);
    this.overlayMesh = new THREE.Mesh(geo, this.material);
    this.overlayMesh.position.set(0, 0, 4.5);
    this.overlayMesh.visible = false; // Darkness overlay disabled
    this.group.visible = false; // Darkness group disabled
    this.group.add(this.overlayMesh);
  }

  /**
   * Computes continuous ambient light based on depth Y
   * (Disabled for clear exploration: returns 1.0 fully lit everywhere)
   */
  public static getAmbientLightAtY(_y: number): number {
    return 1.0;
  }

  /**
   * Updates lighting overlay position with camera and updates illumination uniforms
   */
  public update(
    cameraPos: THREE.Vector3,
    diverPos: THREE.Vector3,
    diverFacing: 1 | -1,
    diverPitch: number,
    companionPos: THREE.Vector3 | null,
    isCompanionActive: boolean
  ): void {
    // Keep overlay plane centered over the camera view
    this.overlayMesh.position.x = cameraPos.x;
    this.overlayMesh.position.y = cameraPos.y;

    // Calculate depth-based ambient light
    const ambient = LightingSystem.getAmbientLightAtY(diverPos.y);
    this.material.uniforms.uAmbient.value = ambient;

    // Update diver position and flashlight direction
    this.material.uniforms.uDiverPos.value.set(diverPos.x, diverPos.y);

    // Direction vector of flashlight based on facing and pitch
    const dirX = Math.cos(diverPitch) * diverFacing;
    const dirY = Math.sin(diverPitch);
    this.material.uniforms.uDiverDir.value.set(dirX, dirY).normalize();

    // Update companion light
    if (isCompanionActive && companionPos) {
      this.material.uniforms.uCompanionActive.value = 1.0;
      this.material.uniforms.uCompanionPos.value.set(companionPos.x, companionPos.y);
    } else {
      this.material.uniforms.uCompanionActive.value = 0.0;
    }
  }

  public resize(width: number, height: number): void {
    if (height === 0) return;
    const aspect = width / height;
    const viewH = this.cameraController.viewHeight + 8;
    const viewW = viewH * aspect + 8;

    this.overlayMesh.geometry.dispose();
    this.overlayMesh.geometry = new THREE.PlaneGeometry(viewW, viewH);
  }

  public destroy(): void {
    this.overlayMesh.geometry.dispose();
    this.material.dispose();
  }
}

