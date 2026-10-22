import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ArcRotateCamera,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  TransformNode
} from '@babylonjs/core';
import { RobotBlueprint, PlayerId } from '../sim/types.ts';
import { RobotMeshBuilder } from '../render/RobotMeshBuilder.ts';

export class RobotPreviewRenderer {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private meshBuilder: RobotMeshBuilder;
  private currentRobotNode: TransformNode | null = null;
  private isAutoRotate: boolean = true;
  private isRunning: boolean = false;
  private userInteracting: boolean = false;
  private resumeRotateTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      antialias: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.07, 0.11, 1.0);
    this.scene.ambientColor = new Color3(0.12, 0.16, 0.22);

    // Camera focused on showroom platform
    this.camera = new ArcRotateCamera(
      'previewCamera',
      -Math.PI / 2.3,
      Math.PI / 3.1,
      6.8,
      new Vector3(0, 1.3, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 20;
    this.camera.lowerRadiusLimit = 3.5;
    this.camera.upperRadiusLimit = 11.0;
    this.camera.lowerBetaLimit = 0.15;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.05; // Do not go below platform floor

    this.setupLighting();
    this.setupHoloPlatform();

    this.meshBuilder = new RobotMeshBuilder(this.scene);

    // Track user drag interaction to temporarily pause auto-rotation
    canvas.addEventListener('pointerdown', () => {
      this.userInteracting = true;
    });
    window.addEventListener('pointerup', () => {
      if (this.userInteracting) {
        this.userInteracting = false;
        this.resumeRotateTimer = 2.0; // Resume auto-rotate after 2 seconds of inactivity
      }
    });

    // Resize listener
    window.addEventListener('resize', () => {
      if (this.isRunning) {
        this.engine.resize();
      }
    });
  }

  private setupLighting(): void {
    // 1. Ambient soft hemisphere
    const hemiLight = new HemisphericLight('previewHemi', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.75;
    hemiLight.diffuse = new Color3(0.5, 0.6, 0.75);
    hemiLight.groundColor = new Color3(0.08, 0.15, 0.25);

    // 2. High-contrast Key light for sharp metallic bevels
    const keyLight = new DirectionalLight('previewKey', new Vector3(-0.6, -0.9, 0.7), this.scene);
    keyLight.position = new Vector3(5, 8, -5);
    keyLight.intensity = 1.3;
    keyLight.diffuse = new Color3(1.0, 0.95, 0.88);

    // 3. Cyberpunk Cyan Rim/Back light (silhouetting weapons and armor edges)
    const rimLight = new DirectionalLight('previewRim', new Vector3(0.6, -0.4, -0.8), this.scene);
    rimLight.position = new Vector3(-5, 4, 6);
    rimLight.intensity = 1.1;
    rimLight.diffuse = new Color3(0.1, 0.8, 1.0);
  }

  private setupHoloPlatform(): void {
    // Cylindrical assembly pedestal base
    const pedestal = MeshBuilder.CreateCylinder(
      'previewPedestal',
      { diameter: 4.4, height: 0.3, tessellation: 36 },
      this.scene
    );
    pedestal.position.set(0, 0.15, 0);

    const pedMat = new StandardMaterial('matPedestal', this.scene);
    pedMat.diffuseColor = new Color3(0.06, 0.09, 0.13);
    pedMat.specularColor = new Color3(0.2, 0.25, 0.35);
    pedMat.roughness = 0.6;
    pedMat.backFaceCulling = false;
    pedestal.material = pedMat;

    // Glowing Neon Perimeter Ring
    const ring = MeshBuilder.CreateTorus(
      'pedestalRing',
      { diameter: 4.42, thickness: 0.05, tessellation: 48 },
      this.scene
    );
    ring.position.set(0, 0.3, 0);

    const ringMat = new StandardMaterial('matPedestalRing', this.scene);
    ringMat.diffuseColor = new Color3(0.0, 0.8, 1.0);
    ringMat.emissiveColor = new Color3(0.0, 0.65, 0.95);
    ringMat.backFaceCulling = false;
    ring.material = ringMat;

    // Projected Holographic Floor Grid Disc
    const holoDisc = MeshBuilder.CreateDisc(
      'holoDisc',
      { radius: 2.1, tessellation: 48 },
      this.scene
    );
    holoDisc.rotation.x = Math.PI / 2;
    holoDisc.position.set(0, 0.31, 0);

    const discTexture = new DynamicTexture('holoDiscTex', 512, this.scene, false);
    const ctx = discTexture.getContext();
    ctx.clearRect(0, 0, 512, 512);

    // Draw concentric radar lines & crosshairs
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 3;

    // Circles
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.arc(256, 256, 170, 0, Math.PI * 2);
    ctx.arc(256, 256, 100, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs & calibration ticks
    ctx.beginPath();
    ctx.moveTo(256, 26);
    ctx.lineTo(256, 486);
    ctx.moveTo(26, 256);
    ctx.lineTo(486, 256);
    ctx.stroke();

    // Ticks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const x1 = 256 + Math.cos(rad) * 215;
      const y1 = 256 + Math.sin(rad) * 215;
      const x2 = 256 + Math.cos(rad) * 230;
      const y2 = 256 + Math.sin(rad) * 230;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    discTexture.update();

    const discMat = new StandardMaterial('matHoloDisc', this.scene);
    discMat.diffuseTexture = discTexture;
    discMat.opacityTexture = discTexture;
    discMat.emissiveColor = new Color3(0.0, 0.7, 0.95);
    discMat.disableLighting = true;
    discMat.backFaceCulling = false;
    holoDisc.material = discMat;
  }

  public update(blueprint: RobotBlueprint): void {
    // Remove previous mesh
    if (this.currentRobotNode) {
      this.meshBuilder.removeRobotMesh(this.currentRobotNode);
      this.currentRobotNode = null;
    }

    // Build new robot mesh on platform
    const node = this.meshBuilder.buildRobotMesh(9999, blueprint, PlayerId.HUMAN);
    node.position.set(0, 0.3, 0);
    this.currentRobotNode = node;

    // Adjust camera target based on robot height (number of stacked weapons)
    const weaponCount = blueprint.weapons.length;
    const targetY = 1.1 + weaponCount * 0.28;
    this.camera.target.y = targetY;
  }

  public resetCamera(): void {
    this.camera.alpha = -Math.PI / 2.3;
    this.camera.beta = Math.PI / 3.1;
    this.camera.radius = 6.8;
  }

  public toggleAutoRotate(): boolean {
    this.isAutoRotate = !this.isAutoRotate;
    return this.isAutoRotate;
  }

  private isPreviewWalking: boolean = false;

  public toggleWalking(): boolean {
    this.isPreviewWalking = !this.isPreviewWalking;
    return this.isPreviewWalking;
  }

  public isWalking(): boolean {
    return this.isPreviewWalking;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.engine.resize();

    this.engine.runRenderLoop(() => {
      if (!this.isRunning) return;

      // Handle auto-rotation
      if (this.isAutoRotate) {
        if (!this.userInteracting) {
          if (this.resumeRotateTimer > 0) {
            this.resumeRotateTimer -= 0.016;
          } else {
            this.camera.alpha += 0.007; // Smooth showroom rotation
          }
        }
      }

      // Animate preview robot (idle hydraulic breathing or active walking stride)
      this.meshBuilder.animate(9999, 0.016, this.isPreviewWalking);

      this.scene.render();
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }

  public resize(): void {
    this.engine.resize();
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
