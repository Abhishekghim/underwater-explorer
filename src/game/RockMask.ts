import { MAP_CONFIG } from './landmassCollisionData';

/**
 * CPU-side sampler of the playable rock silhouette (map_foreground.png).
 * Lets environment systems ask "is this world point solid rock or open water?"
 * so decor, jellyfish and bubble streams are only ever placed in believable spots.
 */
export class RockMask {
  private static instance: RockMask | null = null;
  private data: Uint8ClampedArray | null = null;
  private w = 0;
  private h = 0;
  private callbacks: (() => void)[] = [];

  public static get(): RockMask {
    if (!RockMask.instance) RockMask.instance = new RockMask();
    return RockMask.instance;
  }

  private constructor() {
    if (typeof window === 'undefined') return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      this.data = ctx.getImageData(0, 0, img.width, img.height).data;
      this.w = img.width;
      this.h = img.height;
      const cbs = this.callbacks;
      this.callbacks = [];
      cbs.forEach((cb) => cb());
    };
    img.src = '/assets/environment/map_foreground.png';
  }

  public get ready(): boolean {
    return this.data !== null;
  }

  /** Runs callback immediately if loaded, otherwise once the mask has loaded. */
  public onReady(cb: () => void): void {
    if (this.data) cb();
    else this.callbacks.push(cb);
  }

  /** True if the world point lies inside solid rock (or outside the playable map). */
  public isRock(x: number, y: number): boolean {
    if (y > 0) return false; // open sky / surface water
    if (!this.data) return false;
    const u = (x + MAP_CONFIG.width / 2) / MAP_CONFIG.width;
    const v = 1 - (y - (MAP_CONFIG.centerY - MAP_CONFIG.height / 2)) / MAP_CONFIG.height;
    if (u < 0 || u > 1 || v > 1) return true;
    if (v < 0) return false;
    const px = Math.min(this.w - 1, Math.floor(u * this.w));
    const py = Math.min(this.h - 1, Math.floor(v * this.h));
    return this.data[(py * this.w + px) * 4 + 3] > 127;
  }

  /** True if a vertical column of open water exists above (x, y) up to `height`. */
  public isOpenColumn(x: number, y: number, height: number, halfWidth = 0): boolean {
    const steps = Math.max(3, Math.ceil(height / 0.5));
    for (let i = 1; i <= steps; i++) {
      const yy = y + (height * i) / steps;
      if (this.isRock(x, yy)) return false;
      if (halfWidth > 0 && (this.isRock(x - halfWidth, yy) || this.isRock(x + halfWidth, yy))) return false;
    }
    return true;
  }
}

