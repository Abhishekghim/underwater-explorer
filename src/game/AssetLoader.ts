import * as THREE from 'three';

/**
 * Robust asset and texture loader with automatic caching, fallback texture generation,
 * and memory management for Three.js 2D sprite rendering.
 */
export class AssetLoader {
  private static instance: AssetLoader;
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private fallbackTexture: THREE.CanvasTexture;

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();

    // Create a 1x1 transparent fallback texture to prevent any rendering crashes
    // if an image is loading or fails to load
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, 16, 16);
    }
    this.fallbackTexture = new THREE.CanvasTexture(canvas);
  }

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Loads or retrieves a cached texture.
   * Resilient: If an asset cannot be loaded, logs a warning and returns a safe fallback.
   */
  public loadTexture(
    url: string,
    options?: {
      nearest?: boolean;
      mipmaps?: boolean;
      anisotropy?: number;
      wrapS?: THREE.Wrapping;
      wrapT?: THREE.Wrapping;
      repeatX?: number;
      repeatY?: number;
    }
  ): THREE.Texture {
    const cached = this.textureCache.get(url);
    if (cached) {
      return cached;
    }

    try {
      const texture = this.textureLoader.load(
        url,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          if (options?.nearest) {
            loadedTex.minFilter = THREE.NearestFilter;
            loadedTex.magFilter = THREE.NearestFilter;
          } else if (options?.mipmaps) {
            loadedTex.generateMipmaps = true;
            loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTex.magFilter = THREE.LinearFilter;
          } else {
            loadedTex.minFilter = THREE.LinearFilter;
            loadedTex.magFilter = THREE.LinearFilter;
          }

          if (options?.anisotropy) {
            loadedTex.anisotropy = options.anisotropy;
          }

          if (options?.wrapS) loadedTex.wrapS = options.wrapS;
          if (options?.wrapT) loadedTex.wrapT = options.wrapT;
          if (options?.repeatX || options?.repeatY) {
            loadedTex.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
          }
          loadedTex.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn(`[AssetLoader] Resilient fallback: could not load "${url}".`, err);
        }
      );

      texture.colorSpace = THREE.SRGBColorSpace;
      if (options?.nearest) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
      } else if (options?.mipmaps) {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
      } else {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }
      if (options?.anisotropy) {
        texture.anisotropy = options.anisotropy;
      }

      this.textureCache.set(url, texture);
      return texture;
    } catch (e) {
      console.warn(`[AssetLoader] Exception loading texture "${url}":`, e);
      return this.fallbackTexture;
    }
  }

  /**
   * Helper to create a textured 2D sprite plane mesh with transparent material
   */
  public createTexturedPlane(
    url: string,
    width: number,
    height: number,
    materialOptions?: {
      transparent?: boolean;
      opacity?: number;
      depthWrite?: boolean;
      nearest?: boolean;
      blending?: THREE.Blending;
      segmentsX?: number;
      segmentsY?: number;
    }
  ): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(
      width,
      height,
      materialOptions?.segmentsX ?? 1,
      materialOptions?.segmentsY ?? 1
    );
    const tex = this.loadTexture(url, { nearest: materialOptions?.nearest });
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: materialOptions?.transparent ?? true,
      opacity: materialOptions?.opacity ?? 1.0,
      depthWrite: materialOptions?.depthWrite ?? false,
      blending: materialOptions?.blending ?? THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  /**
   * Disposes all cached textures and materials
   */
  public dispose(): void {
    for (const [, texture] of this.textureCache) {
      texture.dispose();
    }
    this.textureCache.clear();
    this.fallbackTexture.dispose();
  }
}

