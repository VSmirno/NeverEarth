import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  TransformNode
} from '@babylonjs/core';
import { StructureDef } from '../sim/mapData.ts';
import { StructureType, PlayerId } from '../sim/types.ts';

export class BuildingRenderer {
  private scene: Scene;
  private buildingNodes: Map<number, TransformNode> = new Map();
  private materials: Map<string, StandardMaterial> = new Map();
  private animatedMeshes: Mesh[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials(): void {
    // 1. Team Military Materials
    const humanMat = new StandardMaterial('mat_human', this.scene);
    humanMat.diffuseColor = new Color3(0.12, 0.25, 0.42);
    humanMat.specularColor = new Color3(0.3, 0.45, 0.6);
    humanMat.roughness = 0.5;
    this.materials.set('owner_' + PlayerId.HUMAN, humanMat);

    const enemyMat = new StandardMaterial('mat_enemy', this.scene);
    enemyMat.diffuseColor = new Color3(0.32, 0.1, 0.12);
    enemyMat.specularColor = new Color3(0.5, 0.2, 0.22);
    enemyMat.roughness = 0.5;
    this.materials.set('owner_' + PlayerId.INSIGNIAN, enemyMat);

    const neutralMat = new StandardMaterial('mat_neutral', this.scene);
    neutralMat.diffuseColor = new Color3(0.18, 0.2, 0.22);
    neutralMat.specularColor = new Color3(0.2, 0.25, 0.28);
    neutralMat.roughness = 0.7;
    this.materials.set('owner_' + PlayerId.NEUTRAL, neutralMat);

    // 2. Heavy Blast Concrete & Reinforced Steel
    const concreteMat = new StandardMaterial('mat_concrete', this.scene);
    concreteMat.diffuseColor = new Color3(0.14, 0.15, 0.16);
    concreteMat.roughness = 0.9;
    this.materials.set('concrete', concreteMat);

    const steelMat = new StandardMaterial('mat_gantry_steel', this.scene);
    steelMat.diffuseColor = new Color3(0.3, 0.32, 0.35);
    steelMat.specularColor = new Color3(0.5, 0.55, 0.6);
    steelMat.roughness = 0.4;
    this.materials.set('steel', steelMat);

    // 3. Landing Pad Decal Material (Yellow/Black Hazard Stripes)
    const padMat = new StandardMaterial('mat_landing_pad', this.scene);
    padMat.diffuseColor = new Color3(0.2, 0.22, 0.25);
    padMat.specularColor = new Color3(0.3, 0.3, 0.3);
    this.materials.set('pad', padMat);

    // 4. Vibrant, Distinct Materials for Factory 3D Components
    const matChassis = new StandardMaterial('part_chassis', this.scene);
    matChassis.diffuseColor = new Color3(0.85, 0.55, 0.1);
    matChassis.specularColor = new Color3(0.9, 0.7, 0.3);
    this.materials.set('comp_' + StructureType.FACTORY_CHASSIS, matChassis);

    const matCannon = new StandardMaterial('part_cannon', this.scene);
    matCannon.diffuseColor = new Color3(0.4, 0.45, 0.5);
    matCannon.specularColor = new Color3(0.8, 0.85, 0.9);
    this.materials.set('comp_' + StructureType.FACTORY_CANNONS, matCannon);

    const matMissile = new StandardMaterial('part_missile', this.scene);
    matMissile.diffuseColor = new Color3(0.9, 0.85, 0.8);
    matMissile.emissiveColor = new Color3(0.2, 0.1, 0.1);
    this.materials.set('comp_' + StructureType.FACTORY_MISSILES, matMissile);

    const matPhaser = new StandardMaterial('part_phaser', this.scene);
    matPhaser.diffuseColor = new Color3(0.55, 0.2, 0.95);
    matPhaser.emissiveColor = new Color3(0.35, 0.1, 0.6);
    this.materials.set('comp_' + StructureType.FACTORY_PHASERS, matPhaser);

    const matNuke = new StandardMaterial('part_nuke', this.scene);
    matNuke.diffuseColor = new Color3(0.95, 0.8, 0.05);
    matNuke.emissiveColor = new Color3(0.3, 0.2, 0.0);
    this.materials.set('comp_' + StructureType.FACTORY_NUCLEAR, matNuke);

    const matElec = new StandardMaterial('part_elec', this.scene);
    matElec.diffuseColor = new Color3(0.05, 0.8, 0.9);
    matElec.emissiveColor = new Color3(0.05, 0.4, 0.5);
    this.materials.set('comp_' + StructureType.FACTORY_ELECTRONICS, matElec);

    // Ensure all building surfaces, hangar interiors, roofs, and gantries are double-sided (never transparent from reverse side)
    for (const mat of this.materials.values()) {
      mat.backFaceCulling = false;
    }
  }

  public renderStructures(warbases: StructureDef[], factories: StructureDef[]): void {
    for (const base of warbases) {
      this.createWarbaseMesh(base);
    }
    for (const factory of factories) {
      this.createFactoryMesh(factory);
    }
  }

  private createWarbaseMesh(base: StructureDef): void {
    const root = new TransformNode(`warbase_${base.id}`, this.scene);
    root.position = new Vector3(base.x + 1, 0, base.y + 1);

    // 1. Heavy Star-Fortress Blast Perimeter Walls (Hexagonal redoubt)
    const baseWall = MeshBuilder.CreateCylinder(
      `wb_wall_${base.id}`,
      { diameter: 6.8, height: 2.2, tessellation: 6 },
      this.scene
    );
    baseWall.position.y = 1.1;
    baseWall.material = this.materials.get('concrete')!;
    baseWall.parent = root;

    // 2. Four Corner Defensive Bastion Turrets
    const corners = [
      { x: -2.8, z: -2.8 },
      { x: 2.8, z: -2.8 },
      { x: -2.8, z: 2.8 },
      { x: 2.8, z: 2.8 }
    ];
    for (let i = 0; i < 4; i++) {
      const turret = MeshBuilder.CreateCylinder(
        `wb_turret_${i}_${base.id}`,
        { diameter: 1.4, height: 3.0 },
        this.scene
      );
      turret.position.set(corners[i].x, 1.5, corners[i].z);
      turret.material = this.materials.get('concrete')!;
      turret.parent = root;

      const gun = MeshBuilder.CreateCylinder(`wb_gun_${i}_${base.id}`, { diameter: 0.2, height: 1.0 }, this.scene);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(corners[i].x, 2.5, corners[i].z + 0.6);
      gun.material = this.materials.get('steel')!;
      gun.parent = root;
    }

    // 3. Central Command Citadel with Team Camouflage
    const citadel = MeshBuilder.CreateBox(
      `wb_citadel_${base.id}`,
      { width: 4.2, height: 3.2, depth: 4.2 },
      this.scene
    );
    citadel.position.y = 2.6;
    citadel.material = this.materials.get('owner_' + base.owner)!;
    citadel.parent = root;

    // 4. Elevated Helipad Flight Deck (Landing Pad at altitude 4.2)
    const pad = MeshBuilder.CreateCylinder(
      `wb_pad_${base.id}`,
      { diameter: 3.2, height: 0.2 },
      this.scene
    );
    pad.position.y = 4.3;
    pad.material = this.materials.get('pad')!;
    pad.parent = root;

    // Yellow "H" Landing Decal
    const hBar1 = MeshBuilder.CreateBox(`wb_h1_${base.id}`, { width: 0.25, height: 0.05, depth: 1.4 }, this.scene);
    hBar1.position.set(-0.5, 4.42, 0);
    hBar1.material = this.materials.get('comp_' + StructureType.FACTORY_NUCLEAR)!; // High-vis yellow
    hBar1.parent = root;

    const hBar2 = MeshBuilder.CreateBox(`wb_h2_${base.id}`, { width: 0.25, height: 0.05, depth: 1.4 }, this.scene);
    hBar2.position.set(0.5, 4.42, 0);
    hBar2.material = this.materials.get('comp_' + StructureType.FACTORY_NUCLEAR)!;
    hBar2.parent = root;

    const hCross = MeshBuilder.CreateBox(`wb_hc_${base.id}`, { width: 1.0, height: 0.05, depth: 0.25 }, this.scene);
    hCross.position.set(0, 4.42, 0);
    hCross.material = this.materials.get('comp_' + StructureType.FACTORY_NUCLEAR)!;
    hCross.parent = root;

    // 5. Rotating Command Surveillance Radar Dome
    const radarMast = MeshBuilder.CreateCylinder(`wb_radar_mast_${base.id}`, { diameter: 0.15, height: 1.2 }, this.scene);
    radarMast.position.set(-1.4, 4.8, -1.4);
    radarMast.material = this.materials.get('steel')!;
    radarMast.parent = root;

    const radarDish = MeshBuilder.CreateCylinder(`wb_radar_dish_${base.id}`, { diameterTop: 0.8, diameterBottom: 0.1, height: 0.2 }, this.scene);
    radarDish.rotation.x = Math.PI / 4;
    radarDish.position.set(-1.4, 5.4, -1.4);
    radarDish.material = this.materials.get('steel')!;
    radarDish.parent = root;
    this.animatedMeshes.push(radarDish);

    // 6. Perimeter Warbase Capture Ring
    const captureRing = MeshBuilder.CreateTorus(
      `wb_ring_${base.id}`,
      { diameter: 7.4, thickness: 0.24, tessellation: 36 },
      this.scene
    );
    captureRing.position.y = 0.14;
    captureRing.material = this.materials.get('owner_' + base.owner)!;
    captureRing.parent = root;

    this.buildingNodes.set(base.id, root);
  }

  private createFactoryMesh(factory: StructureDef): void {
    const root = new TransformNode(`factory_${factory.id}`, this.scene);
    root.position = new Vector3(factory.x + 1, 0, factory.y + 1);

    // 1. Armored Interior Hangar Floor Deck
    const floor = MeshBuilder.CreateBox(
      `fact_floor_${factory.id}`,
      { width: 3.4, height: 0.08, depth: 3.4 },
      this.scene
    );
    floor.position.set(0, 0.04, 0);
    floor.material = this.materials.get('concrete')!;
    floor.parent = root;

    // 2. Reinforced Industrial Bulkhead Walls (Open south hangar entrance)
    // Solid Back Wall (North)
    const wallBack = MeshBuilder.CreateBox(
      `fact_wall_b_${factory.id}`,
      { width: 3.8, height: 2.5, depth: 0.6 },
      this.scene
    );
    wallBack.position.set(0, 1.25, -1.6);
    wallBack.material = this.materials.get('concrete')!;
    wallBack.parent = root;

    // Solid Left Wall (West)
    const wallLeft = MeshBuilder.CreateBox(
      `fact_wall_l_${factory.id}`,
      { width: 0.5, height: 2.5, depth: 3.8 },
      this.scene
    );
    wallLeft.position.set(-1.65, 1.25, 0);
    wallLeft.material = this.materials.get('concrete')!;
    wallLeft.parent = root;

    // Solid Right Wall (East)
    const wallRight = MeshBuilder.CreateBox(
      `fact_wall_r_${factory.id}`,
      { width: 0.5, height: 2.5, depth: 3.8 },
      this.scene
    );
    wallRight.position.set(1.65, 1.25, 0);
    wallRight.material = this.materials.get('concrete')!;
    wallRight.parent = root;

    // Heavy Reinforced Roof Slab
    const roof = MeshBuilder.CreateBox(
      `fact_roof_${factory.id}`,
      { width: 4.0, height: 0.35, depth: 4.0 },
      this.scene
    );
    roof.position.set(0, 2.65, 0);
    roof.material = this.materials.get('concrete')!;
    roof.parent = root;

    // Faction Ownership Decal Trim (Mounted around roof rim)
    const trim = MeshBuilder.CreateBox(
      `fact_trim_${factory.id}`,
      { width: 4.15, height: 0.35, depth: 4.15 },
      this.scene
    );
    trim.position.set(0, 2.85, 0);
    trim.material = this.materials.get('owner_' + factory.owner)!;
    trim.parent = root;

    // Front Hangar Portal Lintel (Archway header leaving open entrance below)
    const doorHeader = MeshBuilder.CreateBox(
      `fact_door_hdr_${factory.id}`,
      { width: 3.8, height: 0.6, depth: 0.5 },
      this.scene
    );
    doorHeader.position.set(0, 2.2, 1.6);
    doorHeader.material = this.materials.get('steel')!;
    doorHeader.parent = root;

    // Entrance Guidance Pylons (Left & Right of open door)
    for (const side of [-1.4, 1.4]) {
      const pylon = MeshBuilder.CreateCylinder(`fact_pylon_${side}_${factory.id}`, { diameter: 0.25, height: 1.8 }, this.scene);
      pylon.position.set(side, 0.9, 1.65);
      pylon.material = this.materials.get('steel')!;
      pylon.parent = root;
    }

    // 3. Cooling Stacks / Power Generators
    for (const pos of [-1.2, 1.2]) {
      const chimney = MeshBuilder.CreateCylinder(`chimney_${pos}_${factory.id}`, { diameter: 0.4, height: 1.4 }, this.scene);
      chimney.position.set(pos, 3.4, -1.2);
      chimney.material = this.materials.get('steel')!;
      chimney.parent = root;
    }

    // 4. Overhead Gantry Support Arch
    const gantryLegL = MeshBuilder.CreateCylinder(`gantry_l_${factory.id}`, { diameter: 0.15, height: 2.2 }, this.scene);
    gantryLegL.position.set(-1.2, 3.7, 0);
    gantryLegL.material = this.materials.get('steel')!;
    gantryLegL.parent = root;

    const gantryLegR = MeshBuilder.CreateCylinder(`gantry_r_${factory.id}`, { diameter: 0.15, height: 2.2 }, this.scene);
    gantryLegR.position.set(1.2, 3.7, 0);
    gantryLegR.material = this.materials.get('steel')!;
    gantryLegR.parent = root;

    const gantryCross = MeshBuilder.CreateBox(`gantry_bar_${factory.id}`, { width: 2.6, height: 0.2, depth: 0.4 }, this.scene);
    gantryCross.position.set(0, 4.8, 0);
    gantryCross.material = this.materials.get('steel')!;
    gantryCross.parent = root;

    // 5. GIANT DISTINCT 3D REPLICA OF THE PRODUCED ITEM (Mounted above the roof!)
    const compNode = this.buildDistinctComponentMesh(factory.type, factory.id);
    compNode.position.set(0, 5.7, 0);
    compNode.parent = root;
    this.animatedMeshes.push(compNode as any);

    // 6. Interior Capture Ring Beacon (Inside the hangar bay on the floor)
    const captureRing = MeshBuilder.CreateTorus(
      `fact_ring_${factory.id}`,
      { diameter: 2.4, thickness: 0.12 },
      this.scene
    );
    captureRing.position.set(0, 0.08, 0.4);
    captureRing.material = this.materials.get('owner_' + factory.owner)!;
    captureRing.parent = root;

    this.buildingNodes.set(factory.id, root);
  }

  // Build the unmistakably clear 3D component replica
  private buildDistinctComponentMesh(type: StructureType, id: number): TransformNode {
    const node = new TransformNode(`comp_rep_${id}`, this.scene);

    if (type === StructureType.FACTORY_CHASSIS) {
      // GIANT 3D TANK TRACK PLATFORM
      const trackL = MeshBuilder.CreateBox(`c_track_l_${id}`, { width: 0.35, height: 0.45, depth: 1.6 }, this.scene);
      trackL.position.set(-0.55, 0, 0);
      trackL.material = this.materials.get('comp_' + type)!;
      trackL.parent = node;

      const trackR = MeshBuilder.CreateBox(`c_track_r_${id}`, { width: 0.35, height: 0.45, depth: 1.6 }, this.scene);
      trackR.position.set(0.55, 0, 0);
      trackR.material = this.materials.get('comp_' + type)!;
      trackR.parent = node;

      const body = MeshBuilder.CreateBox(`c_body_${id}`, { width: 1.0, height: 0.3, depth: 1.2 }, this.scene);
      body.position.set(0, 0.1, 0);
      body.material = this.materials.get('steel')!;
      body.parent = node;
    } else if (type === StructureType.FACTORY_CANNONS) {
      // MASSIVE TWIN ARTILLERY TURRET
      const turret = MeshBuilder.CreateCylinder(`c_turret_${id}`, { diameter: 1.2, height: 0.4 }, this.scene);
      turret.material = this.materials.get('steel')!;
      turret.parent = node;

      for (const side of [-0.25, 0.25]) {
        const barrel = MeshBuilder.CreateCylinder(`c_barrel_${side}_${id}`, { diameter: 0.18, height: 1.6 }, this.scene);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(side, 0.1, 0.75);
        barrel.material = this.materials.get('comp_' + type)!;
        barrel.parent = node;
      }
    } else if (type === StructureType.FACTORY_MISSILES) {
      // TRI-CLUSTER UPRIGHT BALLISTIC MISSILES
      const offsets = [
        { x: 0, z: 0.35 },
        { x: -0.32, z: -0.22 },
        { x: 0.32, z: -0.22 }
      ];
      for (let i = 0; i < 3; i++) {
        const m = MeshBuilder.CreateCylinder(`c_missile_${i}_${id}`, { diameterTop: 0.05, diameterBottom: 0.25, height: 1.8 }, this.scene);
        m.position.set(offsets[i].x, 0, offsets[i].z);
        m.material = this.materials.get('comp_' + type)!;
        m.parent = node;

        // Red hazard cap
        const cap = MeshBuilder.CreateSphere(`c_cap_${i}_${id}`, { diameter: 0.2 }, this.scene);
        cap.position.set(offsets[i].x, 0.85, offsets[i].z);
        cap.material = this.materials.get('owner_' + PlayerId.INSIGNIAN)!;
        cap.parent = node;
      }
    } else if (type === StructureType.FACTORY_PHASERS) {
      // PULSING CONCENTRIC FOCUSING TORUS
      const ring = MeshBuilder.CreateTorus(`c_ring_${id}`, { diameter: 1.6, thickness: 0.2 }, this.scene);
      ring.rotation.x = Math.PI / 3;
      ring.material = this.materials.get('comp_' + type)!;
      ring.parent = node;

      const crystal = MeshBuilder.CreatePolyhedron(`c_crys_${id}`, { type: 1, size: 0.5 }, this.scene);
      crystal.material = this.materials.get('comp_' + type)!;
      crystal.parent = node;
    } else if (type === StructureType.FACTORY_NUCLEAR) {
      // HEAVY BALLISTIC SPHERE WITH REVOLVING RADIATION SIGN
      const sphere = MeshBuilder.CreateSphere(`c_nuke_sph_${id}`, { diameter: 1.2 }, this.scene);
      sphere.material = this.materials.get('comp_' + type)!;
      sphere.parent = node;

      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const blade = MeshBuilder.CreateBox(`c_blade_${i}_${id}`, { width: 0.2, height: 0.6, depth: 0.08 }, this.scene);
        blade.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0);
        blade.rotation.z = angle;
        blade.material = this.materials.get('concrete')!;
        blade.parent = node;
      }
    } else if (type === StructureType.FACTORY_ELECTRONICS) {
      // OVERSIZED RADAR DISH & HOLOGRAPHIC AI CORE
      const dish = MeshBuilder.CreateCylinder(`c_dish_${id}`, { diameterTop: 1.4, diameterBottom: 0.15, height: 0.3 }, this.scene);
      dish.rotation.x = Math.PI / 3;
      dish.material = this.materials.get('comp_' + type)!;
      dish.parent = node;

      const aiCore = MeshBuilder.CreateBox(`c_core_${id}`, { width: 0.5, height: 0.5, depth: 0.5 }, this.scene);
      aiCore.position.y = 0.4;
      aiCore.material = this.materials.get('comp_' + type)!;
      aiCore.parent = node;
    }

    return node;
  }

  public update(delta: number): void {
    // Gently rotate overhead factory components and radar dishes
    for (const mesh of this.animatedMeshes) {
      mesh.rotation.y += delta * 0.8;
    }
  }

  public updateCaptureVisual(structureId: number, progressRatio: number, occupyingTeam: PlayerId): void {
    const root = this.buildingNodes.get(structureId);
    if (!root) return;

    const ring = root.getChildMeshes().find((m) => m.name.startsWith('fact_ring_') || m.name.startsWith('wb_ring_'));
    if (ring) {
      // Pulse ring scaling and brightness based on capture progress
      const s = 1.0 + progressRatio * 0.25 + Math.sin(Date.now() * 0.008) * 0.05;
      ring.scaling.set(s, 1.0, s);
      const teamMat = this.materials.get('owner_' + occupyingTeam);
      if (teamMat) ring.material = teamMat;
    }
  }

  public updateBuildingOwnership(buildingId: number, newOwner: PlayerId): void {
    const root = this.buildingNodes.get(buildingId);
    if (!root) return;

    const newMat = this.materials.get('owner_' + newOwner);
    if (!newMat) return;

    for (const child of root.getChildMeshes()) {
      if (
        child.name.startsWith('fact_trim_') ||
        child.name.startsWith('fact_ring_') ||
        child.name.startsWith('wb_citadel_') ||
        child.name.startsWith('wb_ring_')
      ) {
        child.material = newMat;
      }
    }
  }
}
