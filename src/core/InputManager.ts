export class InputManager {
  private keys: Set<string> = new Set();
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isRightMouseDown: boolean = false;
  public isMiddleMouseDown: boolean = false;
  public lastMouseX: number = 0;
  public lastMouseY: number = 0;
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.isRightMouseDown || this.isMiddleMouseDown) {
        this.mouseDeltaX += e.clientX - this.lastMouseX;
        this.mouseDeltaY += e.clientY - this.lastMouseY;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      if (e.button === 2) {
        this.isRightMouseDown = true;
      } else if (e.button === 1) {
        this.isMiddleMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isRightMouseDown = false;
      if (e.button === 1) this.isMiddleMouseDown = false;
    });

    // Prevent default context menu on right click in the canvas
    window.addEventListener('contextmenu', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') {
        e.preventDefault();
      }
    });
  }

  public isDown(code: string): boolean {
    return this.keys.has(code);
  }

  // Returns camera-relative 2D pan vector: panX, panZ in world coordinates
  public getCameraPanVector(cameraAlpha: number): { panX: number; panZ: number } {
    let screenForward = 0;
    let screenRight = 0;

    // Keyboard WASD & Arrows
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) screenForward += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) screenForward -= 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) screenRight -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) screenRight += 1;

    // Edge panning (when cursor is within 18px of screen edge)
    const edgeThreshold = 18;
    if (this.mouseX > 0 && this.mouseX < edgeThreshold) screenRight -= 0.85;
    if (this.mouseX > window.innerWidth - edgeThreshold && this.mouseX < window.innerWidth) screenRight += 0.85;
    if (this.mouseY > 0 && this.mouseY < edgeThreshold) screenForward += 0.85;
    if (this.mouseY > window.innerHeight - edgeThreshold && this.mouseY < window.innerHeight) screenForward -= 0.85;

    // Mouse drag pan (right or middle mouse drag)
    if (this.mouseDeltaX !== 0 || this.mouseDeltaY !== 0) {
      screenRight -= this.mouseDeltaX * 0.15;
      screenForward += this.mouseDeltaY * 0.15;
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
    }

    if (screenForward === 0 && screenRight === 0) {
      return { panX: 0, panZ: 0 };
    }

    // In BabylonJS ArcRotateCamera:
    // camera.alpha rotates in the X-Z plane around Y axis.
    // Forward direction from camera to target in world coordinates:
    const fwdX = -Math.cos(cameraAlpha);
    const fwdZ = -Math.sin(cameraAlpha);
    // Right direction (perpendicular to forward):
    const rightX = fwdZ;
    const rightZ = -fwdX;

    const panX = screenForward * fwdX + screenRight * rightX;
    const panZ = screenForward * fwdZ + screenRight * rightZ;

    return { panX, panZ };
  }

  // Used during Direct Robot Piloting (WASD driving relative to camera view)
  public getRobotDriveVector(cameraAlpha: number): { driveX: number; driveY: number } {
    let screenForward = 0;
    let screenRight = 0;

    if (this.isDown('KeyW') || this.isDown('ArrowUp')) screenForward += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) screenForward -= 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) screenRight -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) screenRight += 1;

    if (screenForward === 0 && screenRight === 0) {
      return { driveX: 0, driveY: 0 };
    }

    const fwdX = -Math.cos(cameraAlpha);
    const fwdZ = -Math.sin(cameraAlpha);
    const rightX = fwdZ;
    const rightZ = -fwdX;

    const driveX = screenForward * fwdX + screenRight * rightX;
    const driveY = screenForward * fwdZ + screenRight * rightZ;

    return { driveX, driveY };
  }

  public isFirePressed(): boolean {
    return this.isDown('KeyF') || this.isDown('Enter') || this.isDown('Space');
  }

  public isDirectControlTogglePressed(): boolean {
    return this.isDown('KeyE');
  }
}
