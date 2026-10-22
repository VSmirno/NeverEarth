import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Mesh
} from '@babylonjs/core';
import { ActiveProjectile } from '../sim/combat.ts';
import { WeaponType } from '../sim/types.ts';

export class ProjectilesRenderer {
  private scene: Scene;
  private projectileNodes: Map<number, TransformNode> = new Map();
  private materials: Map<WeaponType, StandardMaterial> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials(): void {
    const cannonMat = new StandardMaterial('mat_p_cannon', this.scene);
    cannonMat.emissiveColor = new Color3(1.0, 0.8, 0.2);
    cannonMat.backFaceCulling = false;
    this.materials.set(WeaponType.CANNON, cannonMat);

    const missileMat = new StandardMaterial('mat_p_missile', this.scene);
    missileMat.emissiveColor = new Color3(1.0, 0.4, 0.0);
    missileMat.backFaceCulling = false;
    this.materials.set(WeaponType.MISSILES, missileMat);

    const phaserMat = new StandardMaterial('mat_p_phaser', this.scene);
    phaserMat.emissiveColor = new Color3(0.7, 0.2, 1.0);
    phaserMat.backFaceCulling = false;
    this.materials.set(WeaponType.PHASERS, phaserMat);
  }

  public update(projectiles: ActiveProjectile[]): void {
    const activeIds = new Set(projectiles.map((p) => p.id));

    // Remove dead projectile meshes
    for (const [id, node] of this.projectileNodes.entries()) {
      if (!activeIds.has(id)) {
        for (const child of node.getChildren()) {
          (child as Mesh).dispose();
        }
        node.dispose();
        this.projectileNodes.delete(id);
      }
    }

    // Create or update active meshes
    for (const proj of projectiles) {
      let node = this.projectileNodes.get(proj.id);
      if (!node) {
        node = new TransformNode(`proj_${proj.id}`, this.scene);
        const diameter = proj.type === WeaponType.PHASERS ? 0.8 : proj.type === WeaponType.MISSILES ? 0.75 : 0.65;
        const mesh = MeshBuilder.CreateSphere(`p_sphere_${proj.id}`, { diameter }, this.scene);
        mesh.material = this.materials.get(proj.type) || this.materials.get(WeaponType.CANNON)!;
        mesh.parent = node;
        this.projectileNodes.set(proj.id, node);
      }

      // Height aligned with robot weapon mounts (~1.4 in 3D world)
      node.position.set(proj.x + 1, 1.4, proj.y + 1);
    }
  }
}
