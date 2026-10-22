export class InputManager {
  private keys: Set<string> = new Set();
  private virtualX = 0;
  private virtualY = 0;
  private interactTriggered = false;
  private journalToggleTriggered = false;
  private mapToggleTriggered = false;
  private paused = false;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;

  constructor() {
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = this.handleBlur.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownBound);
      window.addEventListener('keyup', this.onKeyUpBound);
      window.addEventListener('blur', this.onBlurBound);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent default scroll behavior for arrow keys and space when playing
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }
    if (e.code === 'KeyE') {
      this.interactTriggered = true;
    }
    if (e.code === 'KeyJ') {
      this.journalToggleTriggered = true;
    }
    if (e.code === 'KeyM') {
      this.mapToggleTriggered = true;
    }
    this.keys.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private handleBlur(): void {
    this.keys.clear();
    this.virtualX = 0;
    this.virtualY = 0;
    this.interactTriggered = false;
    this.journalToggleTriggered = false;
  }

  /**
   * Allows UI components (e.g. mobile joystick or D-pad) to feed input
   */
  public setVirtualInput(x: number, y: number): void {
    this.virtualX = Math.max(-1, Math.min(1, x));
    this.virtualY = Math.max(-1, Math.min(1, y));
  }

  /**
   * Returns normalized directional input vector { x, y }
   */
  public getDirection(): { x: number; y: number } {
    if (this.paused) {
      return { x: 0, y: 0 };
    }

    let x = this.virtualX;
    let y = this.virtualY;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  public isBoost(): boolean {
    if (this.paused) return false;
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  public isBubbleBurst(): boolean {
    if (this.paused) return false;
    return this.keys.has('Space');
  }

  public isInteract(): boolean {
    return this.keys.has('KeyE') || this.interactTriggered;
  }

  public consumeInteract(): boolean {
    const active = this.isInteract();
    this.interactTriggered = false;
    return active;
  }

  public triggerInteract(): void {
    this.interactTriggered = true;
  }

  public consumeJournalToggle(): boolean {
    const active = this.journalToggleTriggered;
    this.journalToggleTriggered = false;
    return active;
  }

  public consumeMapToggle(): boolean {
    const active = this.mapToggleTriggered;
    this.mapToggleTriggered = false;
    return active;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.virtualX = 0;
      this.virtualY = 0;
    }
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownBound);
      window.removeEventListener('keyup', this.onKeyUpBound);
      window.removeEventListener('blur', this.onBlurBound);
    }
    this.keys.clear();
  }
}
