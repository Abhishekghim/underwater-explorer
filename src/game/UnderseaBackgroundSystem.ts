import * as THREE from 'three';
import { AssetLoader } from './AssetLoader';
import { ENV_ASSETS, EnvAssetKey } from './envAssets';

interface ParallaxZoneDiorama {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  parallaxX: number;
}

interface AnimatedShaderItem {
  material: THREE.ShaderMaterial;
  isBioluminescent: boolean;
  baseGlowIntensity: number;
  glowPhase: number;
}

interface GodRayBeam {
  material: THREE.ShaderMaterial;
}

interface DistantFishSchool {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  rangeX: number;
  speed: number;
  direction: 1 | -1;
  phase: number;
}

interface PatrollingSilhouette {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  rangeX: number;
  speed: number;
  phase: number;
}

interface DriftingJellyfish {
  group: THREE.Group;
  haloMat: THREE.MeshBasicMaterial;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
}

interface ThermalPlumeParticle {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  age: number;
  life: number;
  speedY: number;
  driftPhase: number;
  baseScale: number;
}

/**
 * Custom GLSL Shader for the 4 Landmass Layers:
 * - Grades background landmasses into soft, luminous atmospheric teal-cyan (#115570 -> #1e7d9e -> #52d6f4)
 * - NEVER produces pitch-black pixels, guaranteeing 100% visual separation from the #02060d foreground cave walls!
 */
const LANDMASS_LAYER_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform vec3 shadowColor;
    uniform vec3 midColor;
    uniform vec3 highlightColor;
    uniform vec3 fogColor;
    uniform float fogAmount;
    uniform float rimStrength;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(map, vUv);
      if (tex.a < 0.03) discard;

      float sideFeather = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
      float alphaMask = tex.a * sideFeather * opacity;
      if (alphaMask < 0.01) discard;

      float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      float relief = pow(clamp(lum, 0.02, 1.0), 0.58);
      float topRim = smoothstep(0.35, 0.92, vUv.y) * rimStrength;
      float totalLum = clamp(relief + topRim, 0.0, 1.0);

      vec3 graded;
      if (totalLum < 0.45) {
        graded = mix(shadowColor, midColor, totalLum / 0.45);
      } else {
        graded = mix(midColor, highlightColor, (totalLum - 0.45) / 0.55);
      }

      vec3 finalRgb = mix(graded, fogColor, fogAmount);
      gl_FragColor = vec4(finalRgb, alphaMask);
    }
  `,
};

/**
 * Custom GLSL Shader for architectural ruins, shipwrecks, leviathan skeletons, and background props
 */
const UNDERWATER_PROP_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    uniform float sway;
    uniform float time;
    uniform float swayPhase;

    void main() {
      vUv = uv;
      vec3 pos = position;

      if (sway > 0.0) {
        float heightFactor = smoothstep(0.05, 0.95, uv.y);
        pos.x += sin(time * 1.25 + swayPhase + uv.y * 2.4) * sway * heightFactor;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform vec3 shadowColor;
    uniform vec3 midColor;
    uniform vec3 highlightColor;
    uniform vec3 fogColor;
    uniform float fogAmount;
    uniform float rimStrength;
    uniform float opacity;
    uniform float baseFade;
    uniform vec3 glowColor;
    uniform float glowIntensity;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(map, vUv);

      float cleanAlpha = smoothstep(0.18, 0.74, tex.a);
      if (cleanAlpha < 0.01) discard;

      float edgeMask = smoothstep(0.20, 0.92, tex.a);
      vec3 rawRgb = clamp(tex.rgb, 0.0, 1.0);
      float rawLum = dot(rawRgb, vec3(0.299, 0.587, 0.114));

      float dewhitedLum = mix(0.18, rawLum, edgeMask);
      float reliefLum = pow(clamp(dewhitedLum, 0.04, 1.0), 0.58);

      float topRim = smoothstep(0.28, 0.95, vUv.y) * rimStrength * edgeMask;
      float totalLum = clamp(reliefLum + topRim, 0.0, 1.0);

      vec3 graded;
      if (totalLum < 0.48) {
        graded = mix(shadowColor, midColor, totalLum / 0.48);
      } else {
        graded = mix(midColor, highlightColor, (totalLum - 0.48) / 0.52);
      }

      if (glowIntensity > 0.0) {
        float crystalCore = smoothstep(0.22, 0.80, reliefLum) * edgeMask;
        graded = mix(graded, glowColor * 1.15, crystalCore * 0.75);
        graded += glowColor * (crystalCore * glowIntensity * 0.90);
      }

      float baseBlend = smoothstep(0.0, 0.22, vUv.y);
      graded = mix(shadowColor * 0.85, graded, mix(1.0, baseBlend, baseFade * 0.75));

      vec3 finalRgb = mix(graded, fogColor, fogAmount);
      gl_FragColor = vec4(finalRgb, cleanAlpha * opacity);
    }
  `,
};

/**
 * Custom GLSL Shader for Volcanic Hydrothermal Vent Towers (`vent_tower_a.webp`, `vent_tower_b.webp`)
 * Preserves the glowing molten orange-amber magma fissures while grading the rock body into dark volcanic basalt!
 */
const VOLCANIC_VENT_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform float time;
    uniform float swayPhase;
    uniform vec3 fogColor;
    uniform float fogAmount;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(map, vUv);
      float a = smoothstep(0.18, 0.75, tex.a);
      if (a < 0.01) discard;

      float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      // Detect warm orange/amber magma cracks from the 2K artwork (high red vs blue)
      float magmaMask = clamp((tex.r - tex.b) * 2.2, 0.0, 1.0) * smoothstep(0.25, 0.85, tex.r);
      float pulse = 0.82 + 0.18 * sin(time * 3.2 + swayPhase + vUv.y * 6.0);

      vec3 basalt = mix(vec3(0.04, 0.14, 0.22), vec3(0.12, 0.36, 0.48), pow(lum, 0.65));
      vec3 magmaCol = mix(vec3(1.0, 0.38, 0.05), vec3(1.0, 0.82, 0.22), smoothstep(0.3, 0.9, lum)) * pulse * 1.25;

      vec3 col = mix(basalt, magmaCol, magmaMask);
      col = mix(col, fogColor, fogAmount * (1.0 - magmaMask * 0.7));

      gl_FragColor = vec4(col, a * 0.94);
    }
  `,
};

/**
 * Diagonal & radial volumetric sunbeam shader
 */
const RADIAL_GOD_RAY_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    varying float vWorldY;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldY = wp.y;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vWorldY;
    uniform vec3 rayColor;
    uniform float opacity;
    uniform float time;
    uniform float seed;

    void main() {
      if (vWorldY > -0.25) discard;
      float surfaceFade = smoothstep(-0.25, -1.8, vWorldY);
      float horiz = sin(vUv.x * 3.14159265);
      horiz = pow(max(0.0, horiz), 1.45);

      float streaks =
        0.68 +
        0.20 * sin(vUv.x * 14.0 + time * 0.70 + seed) +
        0.12 * cos(vUv.x * 24.0 - time * 1.05 + seed * 2.1);

      float vert = pow(smoothstep(0.0, 0.90, vUv.y), 1.05) * smoothstep(1.0, 0.86, vUv.y);
      float alpha = horiz * streaks * vert * opacity * surfaceFade;
      if (alpha < 0.002) discard;

      gl_FragColor = vec4(rayColor, alpha);
    }
  `,
};

/**
 * Soft radial water glow illuminating the open cavern water column
 */
const WATER_GLOW_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    varying float vWorldY;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldY = wp.y;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vWorldY;
    uniform vec3 glowColor;
    uniform float opacity;

    void main() {
      if (vWorldY > -0.3) discard;
      float surfaceFade = smoothstep(-0.3, -2.5, vWorldY);
      vec2 centered = (vUv - vec2(0.5, 0.54)) * vec2(1.0, 1.15);
      float dist = length(centered) * 2.0;
      float falloff = pow(max(0.0, 1.0 - dist), 2.0);
      if (falloff < 0.003) discard;
      gl_FragColor = vec4(glowColor, falloff * opacity * surfaceFade);
    }
  `,
};

interface DepthPalette {
  shadow: number;
  mid: number;
  highlight: number;
  fog: number;
}

export class UnderseaBackgroundSystem {
  public distantGroup: THREE.Group;
  public midgroundGroup: THREE.Group;
  public foregroundGroup: THREE.Group;

  private dioramas: ParallaxZoneDiorama[] = [];
  private animatedShaders: AnimatedShaderItem[] = [];
  private godRays: GodRayBeam[] = [];
  private fishSchools: DistantFishSchool[] = [];
  private patrollingSilhouettes: PatrollingSilhouette[] = [];
  private driftingJellyfish: DriftingJellyfish[] = [];
  private plumeParticles: ThermalPlumeParticle[] = [];
  private radialHaloTex!: THREE.CanvasTexture;
  private time = 0;

  constructor() {
    this.distantGroup = new THREE.Group();
    this.distantGroup.name = 'undersea_distant_layer';

    this.midgroundGroup = new THREE.Group();
    this.midgroundGroup.name = 'undersea_midground_layer';

    this.foregroundGroup = new THREE.Group();
    this.foregroundGroup.name = 'undersea_foreground_layer';

    this.initRadialHaloTexture();
    this.buildAllCavernVistas();
  }

  private initRadialHaloTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
      grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.16)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    this.radialHaloTex = new THREE.CanvasTexture(canvas);
  }

  /**
   * Atmospheric Teal-Cyan Palette:
   * Every background layer stays in a luminous/medium marine teal range (#10526e to #5ce4ff)
   * so it NEVER blends into the #02060d pitch-black playable foreground cave walls!
   */
  private getDepthPalette(layer: 1 | 2 | 3 | 4, wy: number): DepthPalette {
    const depthFactor = THREE.MathUtils.clamp((-wy - 10) / 120, 0, 1) * 0.35;

    if (layer === 1) {
      const cShadow = new THREE.Color(0x1b7c9c).lerp(new THREE.Color(0x13607a), depthFactor);
      const cMid    = new THREE.Color(0x289ab8).lerp(new THREE.Color(0x1c7896), depthFactor);
      const cHigh   = new THREE.Color(0x68e8ff).lerp(new THREE.Color(0x46c2e0), depthFactor);
      const cFog    = new THREE.Color(0x2696b4).lerp(new THREE.Color(0x18708c), depthFactor);
      return { shadow: cShadow.getHex(), mid: cMid.getHex(), highlight: cHigh.getHex(), fog: cFog.getHex() };
    } else if (layer === 2) {
      const cShadow = new THREE.Color(0x166d8a).lerp(new THREE.Color(0x10546e), depthFactor);
      const cMid    = new THREE.Color(0x2288a6).lerp(new THREE.Color(0x186a86), depthFactor);
      const cHigh   = new THREE.Color(0x56daf5).lerp(new THREE.Color(0x3cb4d4), depthFactor);
      const cFog    = new THREE.Color(0x2088a6).lerp(new THREE.Color(0x15647e), depthFactor);
      return { shadow: cShadow.getHex(), mid: cMid.getHex(), highlight: cHigh.getHex(), fog: cFog.getHex() };
    } else if (layer === 3) {
      const cShadow = new THREE.Color(0x125e78).lerp(new THREE.Color(0x0d4860), depthFactor);
      const cMid    = new THREE.Color(0x1c7896).lerp(new THREE.Color(0x145c76), depthFactor);
      const cHigh   = new THREE.Color(0x48cae8).lerp(new THREE.Color(0x32a4c4), depthFactor);
      const cFog    = new THREE.Color(0x1b7a96).lerp(new THREE.Color(0x125870), depthFactor);
      return { shadow: cShadow.getHex(), mid: cMid.getHex(), highlight: cHigh.getHex(), fog: cFog.getHex() };
    } else {
      const cShadow = new THREE.Color(0x0f5068).lerp(new THREE.Color(0x0b3e52), depthFactor);
      const cMid    = new THREE.Color(0x176884).lerp(new THREE.Color(0x115068), depthFactor);
      const cHigh   = new THREE.Color(0x3cbadd).lerp(new THREE.Color(0x2a96b5), depthFactor);
      const cFog    = new THREE.Color(0x176c86).lerp(new THREE.Color(0x104e64), depthFactor);
      return { shadow: cShadow.getHex(), mid: cMid.getHex(), highlight: cHigh.getHex(), fog: cFog.getHex() };
    }
  }

  private createLandmassMesh(
    layerNumber: 1 | 2 | 3 | 4,
    texPath: string,
    width: number,
    height: number,
    localX: number,
    localY: number,
    z: number,
    renderOrder: number,
    worldY: number,
    options: {
      fogAmount?: number;
      rimStrength?: number;
      opacity?: number;
      flipX?: boolean;
    } = {}
  ): THREE.Mesh {
    const loader = AssetLoader.getInstance();
    const texture = loader.loadTexture(texPath, {
      mipmaps: true,
      anisotropy: 8,
    });

    const pal = this.getDepthPalette(layerNumber, worldY);

    const uniforms = {
      map: { value: texture },
      shadowColor: { value: new THREE.Color(pal.shadow) },
      midColor: { value: new THREE.Color(pal.mid) },
      highlightColor: { value: new THREE.Color(pal.highlight) },
      fogColor: { value: new THREE.Color(pal.fog) },
      fogAmount: { value: options.fogAmount ?? (layerNumber === 1 ? 0.55 : layerNumber === 2 ? 0.42 : layerNumber === 3 ? 0.30 : 0.22) },
      rimStrength: { value: options.rimStrength ?? (layerNumber === 1 ? 0.36 : layerNumber === 2 ? 0.32 : layerNumber === 3 ? 0.28 : 0.24) },
      opacity: { value: options.opacity ?? (layerNumber === 1 ? 0.52 : layerNumber === 2 ? 0.58 : layerNumber === 3 ? 0.65 : 0.72) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: LANDMASS_LAYER_SHADER.vertexShader,
      fragmentShader: LANDMASS_LAYER_SHADER.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const geo = new THREE.PlaneGeometry(width, height);
    if (options.flipX) {
      geo.scale(-1, 1, 1);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(localX, localY, z);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  private addProp(
    parentGroup: THREE.Group,
    layerNumber: 1 | 2 | 3 | 4,
    texPath: string,
    width: number,
    localX: number,
    localY: number,
    worldY: number,
    options: {
      height?: number;
      zOffset?: number;
      roOffset?: number;
      fogAmount?: number;
      rimStrength?: number;
      opacity?: number;
      baseFade?: number;
      flipX?: boolean;
      rotationZ?: number;
      sway?: number;
      isBioluminescent?: boolean;
      glowColorHex?: number;
      glowIntensity?: number;
      hasThermalPlume?: boolean;
      isHotVent?: boolean;
    } = {}
  ): THREE.Mesh {
    const loader = AssetLoader.getInstance();
    const texture = loader.loadTexture(texPath, {
      mipmaps: true,
      anisotropy: 8,
    });

    const height = options.height ?? width / (2400 / 1792);
    const pal = this.getDepthPalette(layerNumber, worldY);

    let baseZ = -3.6;
    let baseRo = -8;
    let defaultFog = 0.22;

    if (layerNumber === 1) {
      baseZ = -13.5;
      baseRo = -24;
      defaultFog = 0.52;
    } else if (layerNumber === 2) {
      baseZ = -9.5;
      baseRo = -18;
      defaultFog = 0.38;
    } else if (layerNumber === 3) {
      baseZ = -6.5;
      baseRo = -12;
      defaultFog = 0.28;
    }

    const z = baseZ + (options.zOffset ?? 0);
    const renderOrder = baseRo + (options.roOffset ?? 0);
    const swayPhase = Math.abs(localX * 1.7 + worldY * 0.9) % (Math.PI * 2);
    const baseGlow = options.glowIntensity ?? (options.isBioluminescent ? 0.90 : 0.0);

    let mat: THREE.ShaderMaterial;
    if (options.isHotVent) {
      mat = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          time: { value: 0 },
          swayPhase: { value: swayPhase },
          fogColor: { value: new THREE.Color(pal.fog) },
          fogAmount: { value: options.fogAmount ?? 0.22 },
        },
        vertexShader: VOLCANIC_VENT_SHADER.vertexShader,
        fragmentShader: VOLCANIC_VENT_SHADER.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.animatedShaders.push({
        material: mat,
        isBioluminescent: false,
        baseGlowIntensity: 0,
        glowPhase: swayPhase,
      });

      // Add warm orange-amber magma glow halo behind the volcanic vent chimney
      const haloMat = new THREE.MeshBasicMaterial({
        map: this.radialHaloTex,
        color: 0xff6b1a,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.45, height * 1.35), haloMat);
      haloMesh.position.set(localX, localY, z - 0.1);
      haloMesh.renderOrder = renderOrder - 1;
      parentGroup.add(haloMesh);
    } else {
      const uniforms = {
        map: { value: texture },
        shadowColor: { value: new THREE.Color(pal.shadow) },
        midColor: { value: new THREE.Color(pal.mid) },
        highlightColor: { value: new THREE.Color(pal.highlight) },
        fogColor: { value: new THREE.Color(pal.fog) },
        fogAmount: { value: options.fogAmount ?? defaultFog },
        rimStrength: { value: options.rimStrength ?? 0.28 },
        opacity: { value: options.opacity ?? 0.85 },
        baseFade: { value: options.baseFade ?? 0.55 },
        sway: { value: options.sway ?? 0.0 },
        time: { value: 0 },
        swayPhase: { value: swayPhase },
        glowColor: { value: new THREE.Color(options.glowColorHex ?? 0x38f8ff) },
        glowIntensity: { value: baseGlow },
      };

      mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: UNDERWATER_PROP_SHADER.vertexShader,
        fragmentShader: UNDERWATER_PROP_SHADER.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      if ((options.sway ?? 0) > 0 || options.isBioluminescent) {
        this.animatedShaders.push({
          material: mat,
          isBioluminescent: Boolean(options.isBioluminescent),
          baseGlowIntensity: baseGlow,
          glowPhase: swayPhase,
        });
      }
    }

    const geo = new THREE.PlaneGeometry(width, height);
    if (options.flipX) {
      geo.scale(-1, 1, 1);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(localX, localY, z);
    mesh.renderOrder = renderOrder;
    if (options.rotationZ) {
      mesh.rotation.z = options.rotationZ;
    }

    parentGroup.add(mesh);

    if (options.hasThermalPlume) {
      this.addThermalPlume(
        parentGroup,
        localX,
        localY + height * 0.42,
        z + 0.05,
        renderOrder + 1,
        width * 0.16,
        Boolean(options.isHotVent)
      );
    }

    return mesh;
  }

  /**
   * Helper to place a trimmed 2K asset from ENV_ASSETS with its exact aspect ratio
   */
  private addEnvAssetProp(
    parentGroup: THREE.Group,
    layerNumber: 1 | 2 | 3 | 4,
    assetKey: EnvAssetKey,
    width: number,
    localX: number,
    crestY: number,
    worldY: number,
    options: {
      zOffset?: number;
      roOffset?: number;
      fogAmount?: number;
      rimStrength?: number;
      opacity?: number;
      baseFade?: number;
      flipX?: boolean;
      rotationZ?: number;
      sway?: number;
      isBioluminescent?: boolean;
      glowColorHex?: number;
      glowIntensity?: number;
      hasThermalPlume?: boolean;
      isHotVent?: boolean;
      yEmbedFactor?: number;
    } = {}
  ): THREE.Mesh {
    const info = ENV_ASSETS[assetKey];
    const height = width / info.aspect;
    const embed = options.yEmbedFactor ?? 0.42;
    const localY = crestY + height * embed;

    return this.addProp(parentGroup, layerNumber, info.url, width, localX, localY, worldY, {
      ...options,
      height,
    });
  }

  /**
   * Adds a drifting bioluminescent 2K Jellyfish (`jellyfish.webp`) with a pulsing cyan/violet halo
   */
  private addDriftingJellyfish(
    parentGroup: THREE.Group,
    localX: number,
    localY: number,
    width: number,
    haloHex: number,
    seed: number
  ): void {
    const loader = AssetLoader.getInstance();
    const info = ENV_ASSETS.jellyfish;
    const height = width / info.aspect;

    const jellyGroup = new THREE.Group();
    jellyGroup.position.set(localX, localY, -5.5);

    // 1. Soft alpha gradient bioluminescent glow halo
    const haloMat = new THREE.MeshBasicMaterial({
      map: this.radialHaloTex,
      color: haloHex,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloSize = Math.max(width, height) * 1.9;
    const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(haloSize, haloSize), haloMat);
    haloMesh.position.set(0, height * 0.1, -0.05);
    haloMesh.renderOrder = -11;
    jellyGroup.add(haloMesh);

    // 2. Bioluminescent jellyfish sprite
    const tex = loader.loadTexture(info.url, { mipmaps: true, anisotropy: 8 });
    const jellyMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        uGlowColor: { value: new THREE.Color(haloHex) },
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
          float a = smoothstep(0.16, 0.72, t.a);
          if (a < 0.01) discard;
          float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
          vec3 baseCol = mix(vec3(0.08, 0.25, 0.42), uGlowColor * 1.25, pow(lum, 0.65));
          gl_FragColor = vec4(baseCol, a * 0.90);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const jellyMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), jellyMat);
    jellyMesh.renderOrder = -10;
    jellyGroup.add(jellyMesh);

    parentGroup.add(jellyGroup);

    this.driftingJellyfish.push({
      group: jellyGroup,
      haloMat,
      baseX: localX,
      baseY: localY,
      phase: seed,
      speed: 1.1 + (seed % 3) * 0.25,
    });
  }

  private addSunburstRays(
    parentGroup: THREE.Group,
    width: number,
    height: number,
    topY: number,
    intensity = 1.0,
    seed = 1.0
  ): void {
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x36d2eb) },
        opacity: { value: 0.48 * intensity },
      },
      vertexShader: WATER_GLOW_SHADER.vertexShader,
      fragmentShader: WATER_GLOW_SHADER.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.5, height * 1.4), glowMat);
    glowMesh.position.set(0, topY - height * 0.35, -14.5);
    glowMesh.renderOrder = -28;
    parentGroup.add(glowMesh);

    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x98fcff) },
        opacity: { value: 0.56 * intensity },
      },
      vertexShader: WATER_GLOW_SHADER.vertexShader,
      fragmentShader: WATER_GLOW_SHADER.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, height * 0.65), coreMat);
    coreMesh.position.set(-width * 0.06, topY + 1.5, -14.2);
    coreMesh.renderOrder = -27;
    parentGroup.add(coreMesh);

    const rayCount = 9;
    for (let i = 0; i < rayCount; i++) {
      const t = i / (rayCount - 1) - 0.5;
      const angle = 0.22 + t * 0.48;
      const rayW = (2.8 + (1.0 - Math.abs(t) * 1.3) * 2.8) * (width / 28);
      const rayH = height * (1.25 + (1.0 - Math.abs(t)) * 0.25);

      const rayMat = new THREE.ShaderMaterial({
        uniforms: {
          rayColor: { value: new THREE.Color(Math.abs(t) < 0.28 ? 0x9efcff : 0x48daf5) },
          opacity: { value: (0.26 - Math.abs(t) * 0.16) * intensity },
          time: { value: 0 },
          seed: { value: seed + i * 1.9 },
        },
        vertexShader: RADIAL_GOD_RAY_SHADER.vertexShader,
        fragmentShader: RADIAL_GOD_RAY_SHADER.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const rayGeo = new THREE.PlaneGeometry(rayW, rayH);
      rayGeo.translate(0, -rayH * 0.45, 0);

      const rayMesh = new THREE.Mesh(rayGeo, rayMat);
      rayMesh.position.set(-width * 0.08 + t * width * 0.36, topY + 2.0, -10.8);
      rayMesh.rotation.z = angle;
      rayMesh.renderOrder = -19;
      parentGroup.add(rayMesh);

      this.godRays.push({ material: rayMat });
    }
  }

  private addPatrollingSilhouette(
    parentGroup: THREE.Group,
    svgPath: string,
    width: number,
    height: number,
    localX: number,
    localY: number,
    rangeX: number,
    speed: number,
    seed: number
  ): void {
    const loader = AssetLoader.getInstance();
    const mesh = loader.createTexturedPlane(svgPath, width, height, {
      opacity: 0.68,
      depthWrite: false,
    });
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(0x0e4d66);
    mesh.position.set(localX, localY, -10.5);
    mesh.renderOrder = -18;
    parentGroup.add(mesh);

    this.patrollingSilhouettes.push({
      mesh,
      baseX: localX,
      baseY: localY,
      rangeX,
      speed,
      phase: seed,
    });
  }

  private addFishSchool(
    parentGroup: THREE.Group,
    centerX: number,
    centerY: number,
    count = 14,
    seed = 1.0
  ): void {
    const loader = AssetLoader.getInstance();
    const schoolGroup = new THREE.Group();
    schoolGroup.position.set(centerX, centerY, -11.5);

    const fishPaths = [
      '/assets/silhouettes/tang.svg',
      '/assets/silhouettes/angelfish.svg',
      '/assets/silhouettes/clownfish.svg',
    ];

    for (let i = 0; i < count; i++) {
      const fx = Math.sin(seed + i * 3.7) * 3.6;
      const fy = Math.cos(seed + i * 5.3) * 1.5;
      const fw = 0.36 + (Math.sin(seed + i * 9.1) * 0.5 + 0.5) * 0.28;
      const fh = fw * 0.62;

      const mesh = loader.createTexturedPlane(fishPaths[i % fishPaths.length], fw, fh, {
        opacity: 0.58,
        depthWrite: false,
      });
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(0x0d4e68);
      mesh.position.set(fx, fy, (i % 3) * 0.02);
      mesh.renderOrder = -19;
      schoolGroup.add(mesh);
    }

    parentGroup.add(schoolGroup);
    this.fishSchools.push({
      group: schoolGroup,
      baseX: centerX,
      baseY: centerY,
      rangeX: 6.5,
      speed: 0.85 + (seed % 3) * 0.22,
      direction: seed % 2 > 1 ? 1 : -1,
      phase: seed * 2.1,
    });
  }

  /**
   * Spawns rising hydrothermal vent smoke plumes & glowing ember particles
   */
  private addThermalPlume(
    parentGroup: THREE.Group,
    localX: number,
    localY: number,
    z: number,
    renderOrder: number,
    spread: number,
    isHotVent = false
  ): void {
    const count = isHotVent ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const isEmber = isHotVent && i % 3 === 0;
      const radius = isEmber ? 0.14 + (i % 2) * 0.06 : 0.26 + (i % 3) * 0.12;
      const geo = new THREE.CircleGeometry(radius, 12);
      const colorHex = isEmber
        ? 0xff8c24
        : i % 2 === 0
        ? 0x2c9ab8
        : 0x165e78;

      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: isEmber ? 0.85 : 0.32,
        blending: isEmber ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const bx = localX + ((i % 3) - 1) * spread * 0.65;
      mesh.position.set(bx, localY, z);
      mesh.renderOrder = renderOrder;
      parentGroup.add(mesh);

      const life = 2.8 + i * 0.35;
      this.plumeParticles.push({
        mesh,
        baseX: bx,
        baseY: localY,
        age: (i / count) * life,
        life,
        speedY: isEmber ? 1.9 + (i % 3) * 0.45 : 1.4 + (i % 3) * 0.35,
        driftPhase: i * 1.2,
        baseScale: isEmber ? 0.65 : 0.80 + (i % 3) * 0.25,
      });
    }
  }

  /**
   * Builds a grounded, high-contrast Cavern Vista inside an open cavern chamber
   * incorporating the 2K asset pack (`kelp`, `fan`, `anemone`, `jellyfish`, `leviathan_skeleton`,
   * `leviathan_skull`, `vent_tower_a/b`) across all 5 depth zones!
   */
  private createCavernVista(config: {
    wx: number;
    wy: number;
    width: number;
    cavernHeight: number;
    sunburstIntensity: number;
    seed: number;
    variant: 'galleon_shark_cavern' | 'atlantis_sanctuary' | 'smoker_rift' | 'abyssal_leviathan_vault';
  }): void {
    const { wx, wy, width, cavernHeight, sunburstIntensity, seed, variant } = config;

    const g1 = new THREE.Group();
    g1.position.set(wx, wy, 0);
    this.distantGroup.add(g1);
    this.dioramas.push({ group: g1, baseX: wx, baseY: wy, parallaxX: 0.12 });

    const g2 = new THREE.Group();
    g2.position.set(wx, wy, 0);
    this.distantGroup.add(g2);
    this.dioramas.push({ group: g2, baseX: wx, baseY: wy, parallaxX: 0.08 });

    const g3 = new THREE.Group();
    g3.position.set(wx, wy, 0);
    this.midgroundGroup.add(g3);
    this.dioramas.push({ group: g3, baseX: wx, baseY: wy, parallaxX: 0.04 });

    const g4 = new THREE.Group();
    g4.position.set(wx, wy, 0);
    this.foregroundGroup.add(g4);
    this.dioramas.push({ group: g4, baseX: wx, baseY: wy, parallaxX: 0.015 });

    // Continuous deep bedrock terrain extending far down so no straight bottom edge is ever visible
    const planeW = width * 1.18;
    const planeH = Math.max(cavernHeight * 1.85, 38.0);

    const crestY1 = -cavernHeight * 0.08;
    const centerY1 = crestY1 - planeH * 0.20;

    const crestY2 = -cavernHeight * 0.16;
    const centerY2 = crestY2 - planeH * 0.20;

    const crestY3 = -cavernHeight * 0.24;
    const centerY3 = crestY3 - planeH * 0.20;

    const crestY4 = -cavernHeight * 0.32;
    const centerY4 = crestY4 - planeH * 0.20;

    // 0. DIAGONAL VOLUMETRIC SUNBEAMS & GLOWING AQUA-TEAL WATER BLOOM
    this.addSunburstRays(g1, width, cavernHeight, cavernHeight * 0.48, sunburstIntensity, seed);

    // 1. LAYER 1: DISTANT MISTY HORIZON RIDGE & PATROLLING SHARK / MANTA / TURTLE SILHOUETTE
    const l1Mesh = this.createLandmassMesh(
      1,
      '/assets/environment/landmasses/landmass_layer1_distant.png',
      planeW * 1.05,
      planeH,
      0,
      centerY1,
      -13.5,
      -24,
      wy
    );
    g1.add(l1Mesh);

    this.addPatrollingSilhouette(
      g1,
      '/assets/silhouettes/reef-shark.svg',
      4.4,
      1.85,
      -width * 0.24,
      cavernHeight * 0.08,
      4.5,
      0.55,
      seed + 1.2
    );

    if (seed % 2 === 0) {
      this.addPatrollingSilhouette(
        g1,
        '/assets/silhouettes/manta-ray.svg',
        4.2,
        2.1,
        width * 0.18,
        cavernHeight * 0.18,
        5.0,
        0.45,
        seed + 3.8
      );
    }

    this.addFishSchool(g1, -width * 0.12, cavernHeight * 0.14, 14, seed + 2.1);
    this.addFishSchool(g1, width * 0.14, cavernHeight * 0.06, 12, seed + 5.7);

    // 2. LAYER 2: MID-DISTANT STONE ARCH & SEABED RIDGES
    const l2Mesh = this.createLandmassMesh(
      2,
      '/assets/environment/landmasses/landmass_layer2_deep_arch.png',
      planeW * 1.0,
      planeH,
      0,
      centerY2,
      -9.5,
      -18,
      wy
    );
    g2.add(l2Mesh);

    // 3. LAYER 3: MIDGROUND STEPPED TERRACES & BIOME LANDMARKS
    const l3Mesh = this.createLandmassMesh(
      3,
      '/assets/environment/landmasses/landmass_layer3_stepped_canyon.png',
      planeW * 0.95,
      planeH,
      0,
      centerY3,
      -6.5,
      -12,
      wy
    );
    g3.add(l3Mesh);

    if (variant === 'galleon_shark_cavern') {
      // Tilted Sunken Pirate Galleon with tall rigged masts & yardarms
      const shipW = 11.2;
      const shipH = shipW / (2400 / 1792);
      const shipY = crestY3 + shipH * 0.36;

      const rigMesh = AssetLoader.getInstance().createTexturedPlane(
        '/assets/silhouettes/shipwreck-detailed.svg',
        11.5,
        9.8,
        { opacity: 0.76, depthWrite: false }
      );
      (rigMesh.material as THREE.MeshBasicMaterial).color.setHex(0x0c465e);
      rigMesh.position.set(width * 0.24, shipY + 1.2, -6.2);
      rigMesh.rotation.z = 0.22;
      rigMesh.renderOrder = -11;
      g3.add(rigMesh);

      this.addProp(
        g3,
        3,
        '/assets/environment/Pirate_galleon_main_hull_2K_20261016212455.png',
        shipW,
        width * 0.24,
        shipY,
        wy,
        {
          rotationZ: 0.22,
          fogAmount: 0.28,
          opacity: 0.86,
        }
      );

      // Left background Atlantis temple colonnade
      const leftPilW = 9.2;
      const leftPilH = leftPilW / (2400 / 1792);
      this.addProp(
        g2,
        2,
        '/assets/environment/Flat_Atlantis_architecture_pillars_2K_20261016212354.png',
        leftPilW,
        -width * 0.26,
        crestY2 + leftPilH * 0.38,
        wy,
        { fogAmount: 0.42, opacity: 0.75 }
      );

      // Swaying 2K Kelp & Glowing Anemone on the midground ridge
      this.addEnvAssetProp(g3, 3, 'kelp_a', 4.2, -width * 0.14, crestY3, wy, {
        sway: 0.18,
        isBioluminescent: true,
        glowColorHex: 0x2dd4bf,
        glowIntensity: 0.45,
      });
    } else if (variant === 'atlantis_sanctuary') {
      const pilLeftW = 10.5;
      const pilLeftH = pilLeftW / (2400 / 1792);
      this.addProp(
        g3,
        3,
        '/assets/environment/Flat_Atlantis_architecture_pillars_2K_20261016212354.png',
        pilLeftW,
        -width * 0.24,
        crestY3 + pilLeftH * 0.36,
        wy
      );

      const pilRightW = 9.8;
      const pilRightH = pilRightW / (2400 / 1792);
      this.addProp(
        g3,
        3,
        '/assets/environment/Ancient_broken_marble_pillars_2K_20261016210933.png',
        pilRightW,
        width * 0.24,
        crestY3 + pilRightH * 0.36,
        wy
      );

      const headW = 7.0;
      const headH = headW / (2400 / 1792);
      this.addProp(
        g3,
        3,
        '/assets/environment/Colossal_sunken_statue_head_2K_20261016211038.png',
        headW,
        width * 0.02,
        crestY3 + headH * 0.38,
        wy
      );

      // Drifting bioluminescent jellyfish in twilight/sanctuary caverns
      this.addDriftingJellyfish(g3, -width * 0.12, cavernHeight * 0.12, 2.3, 0x38f8ff, seed + 1.5);
      this.addDriftingJellyfish(g3, width * 0.15, cavernHeight * 0.20, 1.9, 0xa855f7, seed + 4.2);
    } else if (variant === 'smoker_rift') {
      // Midnight / Volcanic Smoker Rift: Active 2K Hydrothermal Vent Towers with molten magma fissures & smoke/ember plumes
      // PLUS Giant Leviathan Skull & Ribcage resting in the rift!
      this.addEnvAssetProp(g3, 3, 'vent_tower_a', 7.2, -width * 0.22, crestY3, wy, {
        isHotVent: true,
        hasThermalPlume: true,
        yEmbedFactor: 0.38,
      });

      this.addEnvAssetProp(g3, 3, 'vent_tower_b', 7.6, width * 0.22, crestY3, wy, {
        isHotVent: true,
        hasThermalPlume: true,
        yEmbedFactor: 0.38,
      });

      // Colossal Leviathan Skeleton Ribcage & Skull in the center of the rift (matching media_1792225844380_95f0377c.jpg!)
      this.addEnvAssetProp(g3, 3, 'leviathan_skeleton', 12.8, 0, crestY3, wy, {
        rimStrength: 0.36,
        opacity: 0.90,
        yEmbedFactor: 0.35,
      });

      this.addDriftingJellyfish(g3, -width * 0.08, cavernHeight * 0.18, 2.4, 0x38f8ff, seed + 2.1);
      this.addDriftingJellyfish(g3, width * 0.12, cavernHeight * 0.10, 2.1, 0xa855f7, seed + 5.4);
    } else {
      // Abyssal Leviathan Graveyard & Volcanic Vent Vault (matching media_1792225844380_95f0377c.jpg & media_1792225870243_137b1a10.jpg!)
      // Background Atlantis temple colonnade in distant mist
      const pilW = 11.2;
      const pilH = pilW / (2400 / 1792);
      this.addProp(
        g2,
        2,
        '/assets/environment/Flat_Atlantis_architecture_pillars_2K_20261016212345.png',
        pilW,
        0,
        crestY2 + pilH * 0.38,
        wy
      );

      // Center-left: Giant Leviathan Ribcage & Spine (`leviathan_skeleton.webp`)
      this.addEnvAssetProp(g3, 3, 'leviathan_skeleton', 14.5, -width * 0.08, crestY3, wy, {
        rimStrength: 0.38,
        opacity: 0.92,
        yEmbedFactor: 0.36,
      });

      // Center-right: Colossal Horned Leviathan Skull (`leviathan_skull.webp`)
      this.addEnvAssetProp(g3, 3, 'leviathan_skull', 8.2, width * 0.14, crestY3, wy, {
        rimStrength: 0.38,
        opacity: 0.92,
        yEmbedFactor: 0.34,
      });

      // Flanking Active Volcanic Hydrothermal Vent Chimneys (`vent_tower_a`, `vent_tower_b`) with glowing magma cracks & ember plumes
      this.addEnvAssetProp(g3, 3, 'vent_tower_a', 7.5, -width * 0.28, crestY3, wy, {
        isHotVent: true,
        hasThermalPlume: true,
        yEmbedFactor: 0.38,
      });

      this.addEnvAssetProp(g3, 3, 'vent_tower_b', 7.8, width * 0.28, crestY3, wy, {
        isHotVent: true,
        hasThermalPlume: true,
        yEmbedFactor: 0.38,
      });

      // Drifting Abyssal Bioluminescent Jellyfish
      this.addDriftingJellyfish(g3, -width * 0.16, cavernHeight * 0.16, 2.5, 0x38f8ff, seed + 1.8);
      this.addDriftingJellyfish(g3, width * 0.08, cavernHeight * 0.22, 2.2, 0xa855f7, seed + 3.9);
    }

    // 4. LAYER 4: NEAR-BACKGROUND SEABED REEF & 2K CORAL FANS / KELP STALKS (Z = -4.5, renderOrder = -9)
    const l4Mesh = this.createLandmassMesh(
      4,
      '/assets/environment/landmasses/landmass_layer4_arch_reef.png',
      planeW * 0.90,
      planeH,
      0,
      centerY4,
      -4.5,
      -9,
      wy
    );
    g4.add(l4Mesh);

    // Flanking 2K sea fans & swaying kelp stalks on Layer 4
    this.addEnvAssetProp(g4, 4, 'fan_a', 4.6, -width * 0.30, crestY4, wy, {
      sway: 0.16,
      opacity: 0.84,
      isBioluminescent: true,
      glowColorHex: 0x38f8ff,
      glowIntensity: 0.42,
    });

    this.addEnvAssetProp(g4, 4, 'fan_b', 4.4, width * 0.30, crestY4, wy, {
      flipX: true,
      sway: 0.16,
      opacity: 0.84,
      isBioluminescent: true,
      glowColorHex: 0x2dd4bf,
      glowIntensity: 0.42,
    });

    this.addEnvAssetProp(g4, 4, 'kelp_b', 3.8, -width * 0.22, crestY4, wy, {
      sway: 0.20,
      opacity: 0.82,
      isBioluminescent: true,
      glowColorHex: 0x34f598,
      glowIntensity: 0.38,
    });

    this.addEnvAssetProp(g4, 4, 'anemone_a', 2.6, width * 0.21, crestY4, wy, {
      sway: 0.10,
      opacity: 0.86,
      isBioluminescent: true,
      glowColorHex: 0xa855f7,
      glowIntensity: 0.65,
    });
  }

  /**
   * Populates all open-water caverns and mid-depth tunnels across the 5 depth biomes
   */
  private buildAllCavernVistas(): void {
    // 1. HERO SPAWN LAGOON & CENTRAL SUNLIT CAVERN (wx = -18, wy = -17.5)
    this.createCavernVista({
      wx: -18.0,
      wy: -17.5,
      width: 44.0,
      cavernHeight: 19.0,
      sunburstIntensity: 1.20,
      seed: 11.0,
      variant: 'galleon_shark_cavern',
    });

    // 2. UPPER-MID CAVERN TUNNEL AT DEPTH 110m-145m (wx = -26, wy = -35)
    this.createCavernVista({
      wx: -26.0,
      wy: -35.0,
      width: 42.0,
      cavernHeight: 18.0,
      sunburstIntensity: 1.15,
      seed: 19.0,
      variant: 'galleon_shark_cavern',
    });

    // 3. WEST SHALLOWS LAGOON & CORRIDOR (wx = -52, wy = -16)
    this.createCavernVista({
      wx: -52.0,
      wy: -16.0,
      width: 38.0,
      cavernHeight: 18.0,
      sunburstIntensity: 1.05,
      seed: 27.0,
      variant: 'atlantis_sanctuary',
    });

    // 4. EAST SUNLIT GRAND CHAMBER (wx = 52, wy = -24)
    this.createCavernVista({
      wx: 52.0,
      wy: -24.0,
      width: 44.0,
      cavernHeight: 22.0,
      sunburstIntensity: 1.10,
      seed: 35.0,
      variant: 'atlantis_sanctuary',
    });

    // 5. TWILIGHT CROSSROADS & GALLEON CAVERN (wx = -46, wy = -56)
    this.createCavernVista({
      wx: -46.0,
      wy: -56.0,
      width: 46.0,
      cavernHeight: 22.0,
      sunburstIntensity: 1.10,
      seed: 47.0,
      variant: 'galleon_shark_cavern',
    });

    // 6. TWILIGHT CENTRAL CHASM & ACROPOLIS (wx = 0, wy = -56)
    this.createCavernVista({
      wx: 0.0,
      wy: -56.0,
      width: 42.0,
      cavernHeight: 20.0,
      sunburstIntensity: 1.05,
      seed: 59.0,
      variant: 'atlantis_sanctuary',
    });

    // 7. TWILIGHT EASTERN CORAL CANYON (wx = 62, wy = -54)
    this.createCavernVista({
      wx: 62.0,
      wy: -54.0,
      width: 42.0,
      cavernHeight: 20.0,
      sunburstIntensity: 1.05,
      seed: 68.0,
      variant: 'galleon_shark_cavern',
    });

    // 8. MIDNIGHT SMOKER RIFT & LEVIATHAN PASSAGE (wx = -28, wy = -92)
    this.createCavernVista({
      wx: -28.0,
      wy: -92.0,
      width: 46.0,
      cavernHeight: 20.0,
      sunburstIntensity: 0.95,
      seed: 79.0,
      variant: 'smoker_rift',
    });

    // 9. MIDNIGHT EASTERN CHASM (wx = 48, wy = -88)
    this.createCavernVista({
      wx: 48.0,
      wy: -88.0,
      width: 42.0,
      cavernHeight: 20.0,
      sunburstIntensity: 0.95,
      seed: 88.0,
      variant: 'smoker_rift',
    });

    // 10. ABYSSAL CENTRAL BASIN: LEVIATHAN SKELETON & VOLCANIC VENT VAULT (wx = 4, wy = -116)
    this.createCavernVista({
      wx: 4.0,
      wy: -116.0,
      width: 52.0,
      cavernHeight: 22.0,
      sunburstIntensity: 0.95,
      seed: 102.0,
      variant: 'abyssal_leviathan_vault',
    });
  }

  public update(delta: number, cameraX: number, _cameraY: number): void {
    this.time += delta;

    // 1. Horizontal-only parallax across all 4 depth tiers
    for (let i = 0; i < this.dioramas.length; i++) {
      const d = this.dioramas[i];
      const dx = THREE.MathUtils.clamp(cameraX - d.baseX, -24, 24);
      d.group.position.x = d.baseX + dx * d.parallaxX;
      d.group.position.y = d.baseY;
    }

    // 2. Animate coral sway, magma vent pulse & bioluminescent breathing
    for (let i = 0; i < this.animatedShaders.length; i++) {
      const item = this.animatedShaders[i];
      item.material.uniforms.time.value = this.time;

      if (item.isBioluminescent && item.material.uniforms.glowIntensity) {
        const pulse =
          item.baseGlowIntensity *
          (0.78 + Math.sin(this.time * 2.3 + item.glowPhase) * 0.22);
        item.material.uniforms.glowIntensity.value = pulse;
      }
    }

    // 3. Animate volumetric sunbeam shafts
    for (let i = 0; i < this.godRays.length; i++) {
      this.godRays[i].material.uniforms.time.value = this.time;
    }

    // 4. Animate patrolling background shark & manta ray silhouettes
    for (let i = 0; i < this.patrollingSilhouettes.length; i++) {
      const p = this.patrollingSilhouettes[i];
      const angle = this.time * 0.32 * p.speed + p.phase;
      const offset = Math.sin(angle) * p.rangeX;
      const dir = Math.cos(angle) >= 0 ? 1 : -1;
      p.mesh.position.x = p.baseX + offset;
      p.mesh.position.y = p.baseY + Math.sin(this.time * 0.85 + p.phase) * 0.30;
      p.mesh.scale.x = dir;
    }

    // 5. Animate drifting bioluminescent jellyfish with bell-pulse motion & glowing halos
    for (let i = 0; i < this.driftingJellyfish.length; i++) {
      const j = this.driftingJellyfish[i];
      const pulse = Math.sin(this.time * 2.1 * j.speed + j.phase);
      j.group.position.y = j.baseY + Math.sin(this.time * 0.9 * j.speed + j.phase) * 0.85;
      j.group.position.x = j.baseX + Math.cos(this.time * 0.55 * j.speed + j.phase) * 0.55;
      j.group.scale.set(1.0 - pulse * 0.05, 1.0 + pulse * 0.07, 1);
      j.haloMat.opacity = 0.42 + pulse * 0.14;
    }

    // 6. Animate distant fish schools
    for (let i = 0; i < this.fishSchools.length; i++) {
      const s = this.fishSchools[i];
      const offset = Math.sin(this.time * 0.38 * s.speed + s.phase) * s.rangeX;
      const dir = Math.cos(this.time * 0.38 * s.speed + s.phase) >= 0 ? 1 : -1;
      s.group.position.x = s.baseX + offset;
      s.group.position.y = s.baseY + Math.sin(this.time * 0.9 + s.phase) * 0.35;
      s.group.scale.x = dir;
    }

    // 7. Animate rising hydrothermal vent plume & ember particles
    for (let i = 0; i < this.plumeParticles.length; i++) {
      const p = this.plumeParticles[i];
      p.age += delta;
      if (p.age >= p.life) {
        p.age %= p.life;
      }

      const progress = p.age / p.life;
      const riseY = progress * p.speedY * p.life;
      const wobbleX = Math.sin(this.time * 1.8 + p.driftPhase + progress * 3.0) * 0.35 * progress;

      p.mesh.position.x = p.baseX + wobbleX;
      p.mesh.position.y = p.baseY + riseY;

      const scale = p.baseScale * (0.8 + progress * 1.35);
      p.mesh.scale.set(scale, scale, 1);

      const alpha = Math.sin(progress * Math.PI) * 0.35;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    }
  }

  public destroy(): void {
    const disposeGroup = (grp: THREE.Group) => {
      grp.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      grp.clear();
    };

    disposeGroup(this.distantGroup);
    disposeGroup(this.midgroundGroup);
    disposeGroup(this.foregroundGroup);
    if (this.radialHaloTex) this.radialHaloTex.dispose();
    this.dioramas = [];
    this.animatedShaders = [];
    this.godRays = [];
    this.fishSchools = [];
    this.patrollingSilhouettes = [];
    this.driftingJellyfish = [];
    this.plumeParticles = [];
  }
}
