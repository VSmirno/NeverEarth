import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  ArcRotateCamera
} from '@babylonjs/core';
import { ActiveRobot } from '../sim/Construction.ts';

export class CommanderRenderer {
  private scene: Scene;
  public selectionRing: Mesh;

  constructor(scene: Scene, _camera: ArcRotateCamera) {
    this.scene = scene;

    // Glowing RTS Tactical Unit Selection Ring on Ground
    this.selectionRing = MeshBuilder.CreateTorus(
      'rts_selection_ring',
      { diameter: 3.2, thickness: 0.12 },
      this.scene
    );
    const ringMat = new StandardMaterial('mat_select_ring', this.scene);
    ringMat.diffuseColor = new Color3(0.2, 0.75, 1.0);
    ringMat.emissiveColor = new Color3(0.1, 0.55, 0.9);
    ringMat.backFaceCulling = false;
    this.selectionRing.material = ringMat;
    this.selectionRing.isVisible = false;
  }

  public updateSelection(selectedRobot: ActiveRobot | null): void {
    if (!selectedRobot || selectedRobot.isDestroyed) {
      this.selectionRing.isVisible = false;
    } else {
      this.selectionRing.isVisible = true;
      this.selectionRing.position.set(
        selectedRobot.x + 1,
        selectedRobot.altitude * 0.35 + 0.12,
        selectedRobot.y + 1
      );
      this.selectionRing.rotation.y += 0.03;
    }
  }

  // Backwards compatibility method for render loop
  public update(_commander: any, _delta: number): void {
    if (this.selectionRing.isVisible) {
      this.selectionRing.rotation.y += 0.03;
    }
  }
}
