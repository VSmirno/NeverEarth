import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode
} from '@babylonjs/core';
import { RobotBlueprint, ChassisType, WeaponType, PlayerId } from '../sim/types.ts';

export interface RobotAnimationRig {
  id: number;
  chassis: ChassisType;
  root: TransformNode;
  torsoMount: TransformNode;
  chassisNode?: TransformNode;
  pelvis?: TransformNode;
  thighL?: TransformNode;
  thighR?: TransformNode;
  kneeL?: TransformNode;
  kneeR?: TransformNode;
  footL?: TransformNode;
  footR?: TransformNode;
  hoverNode?: TransformNode;
  healthRing?: Mesh;
  healthRingMat?: StandardMaterial;
  healthBarFill?: Mesh;
  healthBarMat?: StandardMaterial;
  walkPhase: number;
  idlePhase: number;
  isMoving: boolean;
}

export class RobotMeshBuilder {
  private scene: Scene;
  public rigs: Map<number, RobotAnimationRig> = new Map();

  // Cached materials
  private matAllianceArmor!: StandardMaterial;
  private matInsigniaArmor!: StandardMaterial;
  private matDarkMetal!: StandardMaterial;
  private matSteelTrim!: StandardMaterial;
  private matTrackTread!: StandardMaterial;
  private matVisorAlliance!: StandardMaterial;
  private matVisorInsignia!: StandardMaterial;
  private matThrusterGlow!: StandardMaterial;
  private matHazardNuke!: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials(): void {
    // 1. Alliance Armor: Matte military steel-blue with subtle specularity
    this.matAllianceArmor = new StandardMaterial('matAllianceArmor', this.scene);
    this.matAllianceArmor.diffuseColor = new Color3(0.18, 0.32, 0.48);
    this.matAllianceArmor.specularColor = new Color3(0.25, 0.35, 0.45);
    this.matAllianceArmor.roughness = 0.45;

    // 2. Insignia Armor: Gritty matte charcoal-carbon
    this.matInsigniaArmor = new StandardMaterial('matInsigniaArmor', this.scene);
    this.matInsigniaArmor.diffuseColor = new Color3(0.2, 0.12, 0.14);
    this.matInsigniaArmor.specularColor = new Color3(0.4, 0.15, 0.18);
    this.matInsigniaArmor.roughness = 0.45;

    // 3. Dark mechanical cast iron
    this.matDarkMetal = new StandardMaterial('matDarkMetal', this.scene);
    this.matDarkMetal.diffuseColor = new Color3(0.12, 0.13, 0.15);
    this.matDarkMetal.specularColor = new Color3(0.15, 0.15, 0.15);
    this.matDarkMetal.roughness = 0.7;

    // 4. Milled stainless steel / gunmetal
    this.matSteelTrim = new StandardMaterial('matSteelTrim', this.scene);
    this.matSteelTrim.diffuseColor = new Color3(0.35, 0.38, 0.42);
    this.matSteelTrim.specularColor = new Color3(0.6, 0.65, 0.7);
    this.matSteelTrim.roughness = 0.3;

    // 5. Heavy rubberized tank tread
    this.matTrackTread = new StandardMaterial('matTrackTread', this.scene);
    this.matTrackTread.diffuseColor = new Color3(0.08, 0.08, 0.09);
    this.matTrackTread.roughness = 0.95;

    // 6. Tactical sensor visors
    this.matVisorAlliance = new StandardMaterial('matVisorAlliance', this.scene);
    this.matVisorAlliance.diffuseColor = new Color3(0.0, 0.8, 0.95);
    this.matVisorAlliance.emissiveColor = new Color3(0.0, 0.65, 0.85);

    this.matVisorInsignia = new StandardMaterial('matVisorInsignia', this.scene);
    this.matVisorInsignia.diffuseColor = new Color3(0.95, 0.15, 0.15);
    this.matVisorInsignia.emissiveColor = new Color3(0.85, 0.1, 0.1);

    // 7. Hover thrusters glow
    this.matThrusterGlow = new StandardMaterial('matThrusterGlow', this.scene);
    this.matThrusterGlow.diffuseColor = new Color3(0.1, 0.6, 0.9);
    this.matThrusterGlow.emissiveColor = new Color3(0.05, 0.4, 0.7);

    // 8. Nuclear Warhead Yellow Hazard
    this.matHazardNuke = new StandardMaterial('matHazardNuke', this.scene);
    this.matHazardNuke.diffuseColor = new Color3(0.85, 0.7, 0.1);
    this.matHazardNuke.emissiveColor = new Color3(0.2, 0.15, 0.0);

    // Ensure all robot component surfaces (armor, chassis, treads, turrets) are double-sided
    const allMats = [
      this.matAllianceArmor,
      this.matInsigniaArmor,
      this.matDarkMetal,
      this.matSteelTrim,
      this.matTrackTread,
      this.matVisorAlliance,
      this.matVisorInsignia,
      this.matThrusterGlow,
      this.matHazardNuke
    ];
    for (const m of allMats) {
      m.backFaceCulling = false;
    }
  }

  public buildRobotMesh(id: number, blueprint: RobotBlueprint, owner: PlayerId): TransformNode {
    if (!this.matAllianceArmor || !this.scene.materials.includes(this.matAllianceArmor)) {
      this.initMaterials();
    }

    const root = new TransformNode(`robot_${id}`, this.scene);
    const armorMat = owner === PlayerId.HUMAN ? this.matAllianceArmor : this.matInsigniaArmor;
    const visorMat = owner === PlayerId.HUMAN ? this.matVisorAlliance : this.matVisorInsignia;

    const torsoMount = new TransformNode(`torso_${id}`, this.scene);
    const rig: RobotAnimationRig = {
      id,
      chassis: blueprint.chassis,
      root,
      torsoMount,
      walkPhase: 0,
      idlePhase: (id * 1.618) % 10,
      isMoving: false
    };

    // 1. Build High-Detail Mechanical Chassis with Articulation
    if (blueprint.chassis === ChassisType.TRACKS) {
      this.buildTracksChassis(root, id, armorMat, rig);
      torsoMount.parent = root;
      torsoMount.position.set(0, 0.52, 0);
    } else if (blueprint.chassis === ChassisType.BIPOD) {
      this.buildBipodChassis(root, id, armorMat, rig);
      torsoMount.parent = rig.pelvis!;
      torsoMount.position.set(0, 0.18, 0);
    } else if (blueprint.chassis === ChassisType.ANTIGRAV) {
      this.buildAntigravChassis(root, id, armorMat, rig);
      torsoMount.parent = rig.hoverNode!;
      torsoMount.position.set(0, 0.15, 0);
    }

    // 2. Armored Hull & Cockpit (parented to torsoMount for dynamic sway & heave)
    const hullGroup = new TransformNode(`hull_grp_${id}`, this.scene);
    hullGroup.parent = torsoMount;

    // Main angled hull block
    const mainHull = MeshBuilder.CreateBox(`hull_${id}`, { width: 1.3, height: 0.65, depth: 1.4 }, this.scene);
    mainHull.position.set(0, 0.35, 0);
    mainHull.material = armorMat;
    mainHull.parent = hullGroup;

    // Front angled glacis armor plate
    const glacis = MeshBuilder.CreateCylinder(`glacis_${id}`, { diameter: 1.3, height: 0.4, tessellation: 3 }, this.scene);
    glacis.rotation.y = Math.PI / 2;
    glacis.rotation.z = Math.PI / 2;
    glacis.position.set(0, 0.35, 0.7);
    glacis.material = armorMat;
    glacis.parent = hullGroup;

    // Cybernetic sensor visor slit (eyes/cameras)
    const visor = MeshBuilder.CreateBox(`visor_${id}`, { width: 0.7, height: 0.12, depth: 0.08 }, this.scene);
    visor.position.set(0, 0.42, 0.72);
    visor.material = visorMat;
    visor.parent = hullGroup;

    // Side reactive armor packs
    const eraL = MeshBuilder.CreateBox(`era_l_${id}`, { width: 0.1, height: 0.3, depth: 0.9 }, this.scene);
    eraL.position.set(-0.7, 0.35, 0);
    eraL.material = this.matDarkMetal;
    eraL.parent = hullGroup;

    const eraR = MeshBuilder.CreateBox(`era_r_${id}`, { width: 0.1, height: 0.3, depth: 0.9 }, this.scene);
    eraR.position.set(0.7, 0.35, 0);
    eraR.material = this.matDarkMetal;
    eraR.parent = hullGroup;

    let currentStackY = 0.7;

    // 3. Stack Weapons (Rifled Cannons, Quad Rocket Pods, Phaser Rings, Nuke Cannister)
    for (const weapon of blueprint.weapons) {
      if (weapon === WeaponType.CANNON) {
        currentStackY = this.buildTwinCannons(torsoMount, id, currentStackY, armorMat);
      } else if (weapon === WeaponType.MISSILES) {
        currentStackY = this.buildQuadMissilePod(torsoMount, id, currentStackY, armorMat);
      } else if (weapon === WeaponType.PHASERS) {
        currentStackY = this.buildPhaserEmitter(torsoMount, id, currentStackY);
      } else if (weapon === WeaponType.NUCLEAR) {
        currentStackY = this.buildNuclearSilo(torsoMount, id, currentStackY);
      }
    }

    // 4. Electronics Module: Articulated Phased Array Radar
    if (blueprint.hasElectronics) {
      this.buildElectronicsDish(torsoMount, id, currentStackY);
    }

    // 5. Tactical Ground Protection Ring under unit
    const healthRing = MeshBuilder.CreateTorus(
      `hp_ring_${id}`,
      { diameter: 2.1, thickness: 0.05, tessellation: 36 },
      this.scene
    );
    healthRing.position.set(0, 0.04, 0);
    const healthRingMat = new StandardMaterial(`hp_ring_mat_${id}`, this.scene);
    const teamColor = owner === PlayerId.HUMAN ? new Color3(0, 0.95, 1) : new Color3(1, 0.25, 0.35);
    healthRingMat.diffuseColor = teamColor;
    healthRingMat.emissiveColor = teamColor.scale(0.85);
    healthRingMat.backFaceCulling = false;
    healthRing.material = healthRingMat;
    healthRing.parent = root;

    // 6. Floating Cybernetic Health Bar above unit
    const barAnchor = new TransformNode(`hp_bar_anchor_${id}`, this.scene);
    const barHeight = currentStackY + (blueprint.hasElectronics ? 0.95 : 0.65);
    barAnchor.position.set(0, barHeight, 0);
    barAnchor.parent = root;
    barAnchor.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    // Background container
    const barBg = MeshBuilder.CreatePlane(`hp_bg_${id}`, { width: 1.15, height: 0.14 }, this.scene);
    barBg.parent = barAnchor;
    const barBgMat = new StandardMaterial(`hp_bg_mat_${id}`, this.scene);
    barBgMat.diffuseColor = new Color3(0.04, 0.06, 0.08);
    barBgMat.emissiveColor = new Color3(0.02, 0.03, 0.04);
    barBgMat.backFaceCulling = false;
    barBg.material = barBgMat;

    // Foreground fill bar (width 1.05, height 0.08)
    const barFill = MeshBuilder.CreatePlane(`hp_fill_${id}`, { width: 1.05, height: 0.08 }, this.scene);
    barFill.position.z = -0.01;
    barFill.parent = barAnchor;

    const barFillMat = new StandardMaterial(`hp_fill_mat_${id}`, this.scene);
    barFillMat.diffuseColor = teamColor;
    barFillMat.emissiveColor = teamColor.scale(0.95);
    barFillMat.backFaceCulling = false;
    barFill.material = barFillMat;

    rig.healthRing = healthRing;
    rig.healthRingMat = healthRingMat;
    rig.healthBarFill = barFill;
    rig.healthBarMat = barFillMat;

    // Scale slightly for commanding presence on the battlefield
    root.scaling.setAll(1.15);
    this.rigs.set(id, rig);
    return root;
  }

  // --- CHASSIS BUILDERS ---

  private buildTracksChassis(root: TransformNode, id: number, armorMat: StandardMaterial, rig: RobotAnimationRig): void {
    const chassisNode = new TransformNode(`chassis_tracks_${id}`, this.scene);
    chassisNode.parent = root;
    rig.chassisNode = chassisNode;

    // Central belly plate
    const belly = MeshBuilder.CreateBox(`belly_${id}`, { width: 0.8, height: 0.3, depth: 1.6 }, this.scene);
    belly.position.set(0, 0.25, 0);
    belly.material = this.matDarkMetal;
    belly.parent = chassisNode;

    // Build Left and Right Track Assemblies
    for (const side of [-1, 1]) {
      const x = side * 0.72;
      // Main track body (wrapped rubber/steel track)
      const trackBelt = MeshBuilder.CreateBox(`track_belt_${side}_${id}`, { width: 0.4, height: 0.48, depth: 1.9 }, this.scene);
      trackBelt.position.set(x, 0.26, 0);
      trackBelt.material = this.matTrackTread;
      trackBelt.parent = chassisNode;

      // Armored side skirt with rivets
      const skirt = MeshBuilder.CreateBox(`skirt_${side}_${id}`, { width: 0.08, height: 0.35, depth: 1.7 }, this.scene);
      skirt.position.set(side * 0.94, 0.32, 0);
      skirt.material = armorMat;
      skirt.parent = chassisNode;

      // 4 Road Wheels per track
      for (let w = -0.65; w <= 0.65; w += 0.43) {
        const wheel = MeshBuilder.CreateCylinder(`wheel_${side}_${w}_${id}`, { diameter: 0.38, height: 0.42 }, this.scene);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.22, w);
        wheel.material = this.matSteelTrim;
        wheel.parent = chassisNode;
      }

      // Drive Sprocket (front & rear)
      const frontSprocket = MeshBuilder.CreateCylinder(`sprocket_f_${side}_${id}`, { diameter: 0.44, height: 0.42 }, this.scene);
      frontSprocket.rotation.z = Math.PI / 2;
      frontSprocket.position.set(x, 0.32, 0.85);
      frontSprocket.material = this.matDarkMetal;
      frontSprocket.parent = chassisNode;

      const rearSprocket = MeshBuilder.CreateCylinder(`sprocket_r_${side}_${id}`, { diameter: 0.44, height: 0.42 }, this.scene);
      rearSprocket.rotation.z = Math.PI / 2;
      rearSprocket.position.set(x, 0.32, -0.85);
      rearSprocket.material = this.matDarkMetal;
      rearSprocket.parent = chassisNode;
    }
  }

  private buildBipodChassis(
    root: TransformNode,
    id: number,
    armorMat: StandardMaterial,
    rig: RobotAnimationRig
  ): void {
    const chassisNode = new TransformNode(`chassis_bipod_${id}`, this.scene);
    chassisNode.parent = root;
    rig.chassisNode = chassisNode;

    // Pelvis Hub (Root of mechanical legs and upper torso mount)
    const pelvis = new TransformNode(`pelvis_${id}`, this.scene);
    pelvis.position.set(0, 1.05, 0);
    pelvis.parent = chassisNode;
    rig.pelvis = pelvis;

    // Pelvis core gearbox
    const pelvisBox = MeshBuilder.CreateBox(`pelvis_box_${id}`, { width: 0.72, height: 0.36, depth: 0.65 }, this.scene);
    pelvisBox.material = this.matDarkMetal;
    pelvisBox.parent = pelvis;

    // Pelvis heavy gyro ring
    const gyroRing = MeshBuilder.CreateCylinder(`pelvis_ring_${id}`, { diameter: 0.68, height: 0.12 }, this.scene);
    gyroRing.position.set(0, 0.18, 0);
    gyroRing.material = this.matSteelTrim;
    gyroRing.parent = pelvis;

    // Articulated Left and Right Bipod Legs
    for (const side of [-1, 1]) {
      const isLeft = side === -1;
      const legX = side * 0.58;

      // Hip ball joint sphere
      const hip = MeshBuilder.CreateSphere(`hip_${side}_${id}`, { diameter: 0.34 }, this.scene);
      hip.position.set(legX, 0, 0);
      hip.material = this.matSteelTrim;
      hip.parent = pelvis;

      // 1. Thigh Root Node (Pivot at hip center)
      const thighRoot = new TransformNode(`thigh_root_${side}_${id}`, this.scene);
      thighRoot.position.set(legX, 0, 0);
      thighRoot.parent = pelvis;
      if (isLeft) rig.thighL = thighRoot;
      else rig.thighR = thighRoot;

      // Thigh armored structural beam
      const thigh = MeshBuilder.CreateBox(`thigh_${side}_${id}`, { width: 0.22, height: 0.56, depth: 0.3 }, this.scene);
      thigh.position.set(0, -0.28, 0.04);
      thigh.material = armorMat;
      thigh.parent = thighRoot;

      // Thigh rear hydraulic actuator
      const thighPiston = MeshBuilder.CreateCylinder(`thigh_piston_${side}_${id}`, { diameter: 0.08, height: 0.44 }, this.scene);
      thighPiston.position.set(0, -0.24, -0.12);
      thighPiston.material = this.matSteelTrim;
      thighPiston.parent = thighRoot;

      // 2. Knee Joint Node (Pivot at knee hinge)
      const kneeRoot = new TransformNode(`knee_root_${side}_${id}`, this.scene);
      kneeRoot.position.set(0, -0.55, 0.08);
      kneeRoot.parent = thighRoot;
      if (isLeft) rig.kneeL = kneeRoot;
      else rig.kneeR = kneeRoot;

      // Knee hinge cylindrical joint
      const knee = MeshBuilder.CreateCylinder(`knee_${side}_${id}`, { diameter: 0.26, height: 0.26 }, this.scene);
      knee.rotation.z = Math.PI / 2;
      knee.material = this.matSteelTrim;
      knee.parent = kneeRoot;

      // Shin heavy structural beam
      const shin = MeshBuilder.CreateBox(`shin_${side}_${id}`, { width: 0.2, height: 0.54, depth: 0.26 }, this.scene);
      shin.position.set(0, -0.26, -0.04);
      shin.material = this.matDarkMetal;
      shin.parent = kneeRoot;

      // Shin front armored strike plate
      const shinPlate = MeshBuilder.CreateBox(`shin_plate_${side}_${id}`, { width: 0.24, height: 0.42, depth: 0.06 }, this.scene);
      shinPlate.position.set(0, -0.24, 0.1);
      shinPlate.material = armorMat;
      shinPlate.parent = kneeRoot;

      // 3. Ankle / Foot Joint Node (Pivot at foot connection)
      const footRoot = new TransformNode(`foot_root_${side}_${id}`, this.scene);
      footRoot.position.set(0, -0.54, -0.06);
      footRoot.parent = kneeRoot;
      if (isLeft) rig.footL = footRoot;
      else rig.footR = footRoot;

      // Heavy combat foot sole pad
      const footSole = MeshBuilder.CreateBox(`foot_sole_${side}_${id}`, { width: 0.44, height: 0.1, depth: 0.65 }, this.scene);
      footSole.position.set(0, 0.05, 0.08);
      footSole.material = this.matDarkMetal;
      footSole.parent = footRoot;

      // Front stabilizer toe claws
      const footToe = MeshBuilder.CreateBox(`foot_toe_${side}_${id}`, { width: 0.38, height: 0.08, depth: 0.22 }, this.scene);
      footToe.position.set(0, 0.04, 0.44);
      footToe.rotation.x = 0.15;
      footToe.material = this.matSteelTrim;
      footToe.parent = footRoot;

      // Rear stabilizer heel spur
      const footHeel = MeshBuilder.CreateBox(`foot_heel_${side}_${id}`, { width: 0.32, height: 0.08, depth: 0.2 }, this.scene);
      footHeel.position.set(0, 0.04, -0.32);
      footHeel.material = this.matSteelTrim;
      footHeel.parent = footRoot;

      // Initial natural combat stance (chicken walker / avian knee)
      thighRoot.rotation.x = -0.25;
      kneeRoot.rotation.x = 0.45;
      footRoot.rotation.x = -0.2;
    }
  }

  private buildAntigravChassis(root: TransformNode, id: number, armorMat: StandardMaterial, rig: RobotAnimationRig): void {
    const chassisNode = new TransformNode(`chassis_antigrav_${id}`, this.scene);
    chassisNode.parent = root;
    rig.chassisNode = chassisNode;

    const hoverNode = new TransformNode(`hover_node_${id}`, this.scene);
    hoverNode.position.set(0, 0.45, 0);
    hoverNode.parent = chassisNode;
    rig.hoverNode = hoverNode;

    // Aerodynamic swept hover disc
    const disc = MeshBuilder.CreateCylinder(`disc_${id}`, { diameter: 1.8, height: 0.28, tessellation: 12 }, this.scene);
    disc.position.set(0, 0, 0);
    disc.material = armorMat;
    disc.parent = hoverNode;

    // 3 Plasma Lift Thruster Cones (underneath)
    const thrusterCoords = [
      { x: 0, z: 0.55 },
      { x: -0.5, z: -0.4 },
      { x: 0.5, z: -0.4 }
    ];

    for (let i = 0; i < 3; i++) {
      const tc = thrusterCoords[i];
      const thruster = MeshBuilder.CreateCylinder(`thruster_${i}_${id}`, { diameterTop: 0.35, diameterBottom: 0.2, height: 0.2 }, this.scene);
      thruster.position.set(tc.x, -0.15, tc.z);
      thruster.material = this.matSteelTrim;
      thruster.parent = hoverNode;

      // Glowing plasma discharge ring
      const glowRing = MeshBuilder.CreateTorus(`glow_ring_${i}_${id}`, { diameter: 0.22, thickness: 0.05 }, this.scene);
      glowRing.position.set(tc.x, -0.25, tc.z);
      glowRing.material = this.matThrusterGlow;
      glowRing.parent = hoverNode;
    }
  }

  // --- WEAPON BUILDERS ---

  private buildTwinCannons(root: TransformNode, id: number, currentStackY: number, armorMat: StandardMaterial): number {
    const turretNode = new TransformNode(`cannon_turret_${id}`, this.scene);
    turretNode.parent = root;

    // Armored Turret Base
    const turretBase = MeshBuilder.CreateCylinder(`turret_base_${id}`, { diameter: 0.9, height: 0.35 }, this.scene);
    turretBase.position.set(0, currentStackY + 0.18, 0);
    turretBase.material = armorMat;
    turretBase.parent = turretNode;

    // Dual Rifled Barrels with Muzzle Brakes
    for (const side of [-0.22, 0.22]) {
      // Barrel Tube
      const barrel = MeshBuilder.CreateCylinder(`barrel_${side}_${id}`, { diameter: 0.14, height: 1.2 }, this.scene);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side, currentStackY + 0.22, 0.65);
      barrel.material = this.matDarkMetal;
      barrel.parent = turretNode;

      // Muzzle Compensator
      const muzzle = MeshBuilder.CreateCylinder(`muzzle_${side}_${id}`, { diameter: 0.2, height: 0.15 }, this.scene);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(side, currentStackY + 0.22, 1.25);
      muzzle.material = this.matSteelTrim;
      muzzle.parent = turretNode;
    }

    return currentStackY + 0.4;
  }

  private buildQuadMissilePod(root: TransformNode, id: number, currentStackY: number, armorMat: StandardMaterial): number {
    const podNode = new TransformNode(`missile_pod_${id}`, this.scene);
    podNode.parent = root;

    // Angled Pod Housing
    const podBox = MeshBuilder.CreateBox(`pod_box_${id}`, { width: 0.95, height: 0.45, depth: 0.8 }, this.scene);
    podBox.rotation.x = -0.15; // Angled slightly upward
    podBox.position.set(0, currentStackY + 0.24, 0);
    podBox.material = armorMat;
    podBox.parent = podNode;

    // 4 Open Missile Tubes with Visible Rocket Tips
    const tubeCoords = [
      { x: -0.28, y: 0.12 },
      { x: 0.28, y: 0.12 },
      { x: -0.28, y: -0.12 },
      { x: 0.28, y: -0.12 }
    ];

    for (let i = 0; i < 4; i++) {
      const tc = tubeCoords[i];
      // Tube Cavity
      const tube = MeshBuilder.CreateCylinder(`tube_${i}_${id}`, { diameter: 0.18, height: 0.25 }, this.scene);
      tube.rotation.x = Math.PI / 2 - 0.15;
      tube.position.set(tc.x, currentStackY + 0.24 + tc.y, 0.4);
      tube.material = this.matDarkMetal;
      tube.parent = podNode;

      // Warhead Nose (White cone with hazard tip)
      const warhead = MeshBuilder.CreateCylinder(`warhead_${i}_${id}`, { diameterTop: 0.0, diameterBottom: 0.14, height: 0.2 }, this.scene);
      warhead.rotation.x = Math.PI / 2 - 0.15;
      warhead.position.set(tc.x, currentStackY + 0.24 + tc.y, 0.48);
      warhead.material = this.matHazardNuke;
      warhead.parent = podNode;
    }

    return currentStackY + 0.5;
  }

  private buildPhaserEmitter(root: TransformNode, id: number, currentStackY: number): number {
    const phaserNode = new TransformNode(`phaser_node_${id}`, this.scene);
    phaserNode.parent = root;

    // Cooling Heatsink Base
    const base = MeshBuilder.CreateBox(`phaser_base_${id}`, { width: 0.8, height: 0.2, depth: 0.8 }, this.scene);
    base.position.set(0, currentStackY + 0.1, 0);
    base.material = this.matDarkMetal;
    base.parent = phaserNode;

    // Glowing Concentric Torus Projector Ring
    const ring = MeshBuilder.CreateTorus(`phaser_ring_${id}`, { diameter: 0.75, thickness: 0.12 }, this.scene);
    ring.rotation.x = Math.PI / 4;
    ring.position.set(0, currentStackY + 0.26, 0.1);
    const ringMat = new StandardMaterial(`phaser_ring_mat_${id}`, this.scene);
    ringMat.emissiveColor = new Color3(0.5, 0.2, 0.9);
    ringMat.diffuseColor = new Color3(0.7, 0.3, 1.0);
    ringMat.backFaceCulling = false;
    ring.material = ringMat;
    ring.parent = phaserNode;

    // Central Energy Emitter Needle
    const needle = MeshBuilder.CreateCylinder(`phaser_needle_${id}`, { diameterTop: 0.02, diameterBottom: 0.12, height: 0.6 }, this.scene);
    needle.rotation.x = Math.PI / 2;
    needle.position.set(0, currentStackY + 0.26, 0.35);
    needle.material = this.matSteelTrim;
    needle.parent = phaserNode;

    return currentStackY + 0.42;
  }

  private buildNuclearSilo(root: TransformNode, id: number, currentStackY: number): number {
    const nukeNode = new TransformNode(`nuke_node_${id}`, this.scene);
    nukeNode.parent = root;

    // Armored Silo Mount
    const siloMount = MeshBuilder.CreateCylinder(`silo_mount_${id}`, { diameter: 0.75, height: 0.3 }, this.scene);
    siloMount.position.set(0, currentStackY + 0.15, 0);
    siloMount.material = this.matDarkMetal;
    siloMount.parent = nukeNode;

    // Heavy Ballistic Warhead Capsule
    const warhead = MeshBuilder.CreateSphere(`nuke_capsule_${id}`, { diameterX: 0.65, diameterY: 0.9, diameterZ: 0.65 }, this.scene);
    warhead.position.set(0, currentStackY + 0.55, 0);
    warhead.material = this.matHazardNuke;
    warhead.parent = nukeNode;

    // Retaining Clamps
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const clamp = MeshBuilder.CreateBox(`clamp_${i}_${id}`, { width: 0.1, height: 0.4, depth: 0.08 }, this.scene);
      clamp.position.set(Math.cos(angle) * 0.36, currentStackY + 0.45, Math.sin(angle) * 0.36);
      clamp.material = this.matSteelTrim;
      clamp.parent = nukeNode;
    }

    return currentStackY + 0.75;
  }

  private buildElectronicsDish(root: TransformNode, id: number, currentStackY: number): void {
    const radarNode = new TransformNode(`radar_node_${id}`, this.scene);
    radarNode.parent = root;

    // Mast
    const mast = MeshBuilder.CreateCylinder(`mast_${id}`, { diameter: 0.08, height: 0.3 }, this.scene);
    mast.position.set(0, currentStackY + 0.15, -0.2);
    mast.material = this.matSteelTrim;
    mast.parent = radarNode;

    // Parabolic Radar Dish
    const dish = MeshBuilder.CreateCylinder(`dish_${id}`, { diameterTop: 0.65, diameterBottom: 0.1, height: 0.12 }, this.scene);
    dish.rotation.x = Math.PI / 4;
    dish.position.set(0, currentStackY + 0.32, -0.2);
    dish.material = this.matSteelTrim;
    dish.parent = radarNode;

    // Slowly rotate dish in flight
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      if (dish.isDisposed()) {
        this.scene.onBeforeRenderObservable.remove(obs);
        return;
      }
      dish.rotation.y += 0.04;
    });
  }

  public updateRobotFacing(node: TransformNode, facing: number, customAngle?: number): void {
    if (customAngle !== undefined) {
      node.rotation.y = customAngle;
    } else {
      // 0: East, 1: South, 2: West, 3: North
      const angles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
      node.rotation.y = angles[facing % 4];
    }
  }

  public animate(id: number, delta: number, isMoving: boolean): void {
    const rig = this.rigs.get(id);
    if (!rig) return;

    rig.isMoving = isMoving;

    if (rig.chassis === ChassisType.BIPOD) {
      if (isMoving) {
        // Active walking pace
        const walkSpeed = 6.8; // rad/s
        rig.walkPhase += delta * walkSpeed;
        const phase = rig.walkPhase;

        const sin = Math.sin(phase);
        const cos = Math.cos(phase);

        // 1. Alternating Hip Swing (Thighs)
        const thighAngleL = -0.25 + sin * 0.45;
        const thighAngleR = -0.25 - sin * 0.45;

        // 2. Knee Flexion (Chicken-walker reverse knee)
        // High knee lift during recovery phase (when stepping forward)
        const kneeLiftL = Math.max(0, -sin) * 0.65;
        const kneeLiftR = Math.max(0, sin) * 0.65;
        const kneeAngleL = 0.45 + kneeLiftL;
        const kneeAngleR = 0.45 + kneeLiftR;

        // 3. Ankle / Foot Pitch (counter-rotates to stay level, toe down on swing)
        const footAngleL = -thighAngleL - kneeAngleL + (sin < 0 ? 0.15 : 0);
        const footAngleR = -thighAngleR - kneeAngleR + (sin > 0 ? 0.15 : 0);

        if (rig.thighL) rig.thighL.rotation.x = thighAngleL;
        if (rig.thighR) rig.thighR.rotation.x = thighAngleR;
        if (rig.kneeL) rig.kneeL.rotation.x = kneeAngleL;
        if (rig.kneeR) rig.kneeR.rotation.x = kneeAngleR;
        if (rig.footL) rig.footL.rotation.x = footAngleL;
        if (rig.footR) rig.footR.rotation.x = footAngleR;

        // 4. Pelvis Heave, Sway & Spine Twist (Mechanical inertia & weight shift)
        if (rig.pelvis) {
          // Double-frequency vertical bobbing (dips on each stride plant)
          rig.pelvis.position.y = 1.05 + Math.abs(sin) * 0.07;
          // Lateral weight shift towards planted leg
          rig.pelvis.position.x = sin * 0.045;
          rig.pelvis.rotation.z = sin * 0.04;
          // Torso counter-twist
          rig.pelvis.rotation.y = sin * 0.06;
          // Subtle forward surge pitch
          rig.pelvis.rotation.x = Math.abs(cos) * 0.03;
        }
      } else {
        // Idle Stance: smooth lerp to rest + hydraulic breathing
        rig.idlePhase += delta * 2.0;
        const breath = Math.sin(rig.idlePhase) * 0.015;

        const lerpSpeed = Math.min(1.0, delta * 6.0);
        if (rig.thighL) rig.thighL.rotation.x += (-0.25 - rig.thighL.rotation.x) * lerpSpeed;
        if (rig.thighR) rig.thighR.rotation.x += (-0.25 - rig.thighR.rotation.x) * lerpSpeed;
        if (rig.kneeL) rig.kneeL.rotation.x += (0.45 - rig.kneeL.rotation.x) * lerpSpeed;
        if (rig.kneeR) rig.kneeR.rotation.x += (0.45 - rig.kneeR.rotation.x) * lerpSpeed;
        if (rig.footL) rig.footL.rotation.x += (-0.2 - rig.footL.rotation.x) * lerpSpeed;
        if (rig.footR) rig.footR.rotation.x += (-0.2 - rig.footR.rotation.x) * lerpSpeed;

        if (rig.pelvis) {
          rig.pelvis.position.y += (1.05 + breath - rig.pelvis.position.y) * lerpSpeed;
          rig.pelvis.position.x += (0 - rig.pelvis.position.x) * lerpSpeed;
          rig.pelvis.rotation.z += (0 - rig.pelvis.rotation.z) * lerpSpeed;
          rig.pelvis.rotation.y += (0 - rig.pelvis.rotation.y) * lerpSpeed;
          rig.pelvis.rotation.x += (0 - rig.pelvis.rotation.x) * lerpSpeed;
        }
      }
    } else if (rig.chassis === ChassisType.ANTIGRAV) {
      rig.idlePhase += delta * 2.5;
      const hoverFloat = Math.sin(rig.idlePhase) * 0.06;
      if (rig.hoverNode) {
        rig.hoverNode.position.y = 0.45 + hoverFloat;
        if (isMoving) {
          rig.hoverNode.rotation.x = 0.08; // Pitch nose down in flight
          rig.hoverNode.rotation.z = Math.sin(rig.idlePhase * 1.5) * 0.05; // Banking roll
        } else {
          rig.hoverNode.rotation.x *= 0.9;
          rig.hoverNode.rotation.z *= 0.9;
        }
      }
    } else if (rig.chassis === ChassisType.TRACKS) {
      if (isMoving) {
        rig.walkPhase += delta * 30.0;
        // Rumble vibration on tracks
        if (rig.chassisNode) {
          rig.chassisNode.position.y = Math.sin(rig.walkPhase) * 0.012;
        }
      } else {
        if (rig.chassisNode) {
          rig.chassisNode.position.y = 0;
        }
      }
    }
  }

  public updateHealth(id: number, strength: number, owner: PlayerId): void {
    const rig = this.rigs.get(id);
    if (!rig) return;

    const ratio = Math.max(0.001, Math.min(1.0, strength / 100));

    // Update floating health bar fill
    if (rig.healthBarFill) {
      rig.healthBarFill.scaling.x = ratio;
      // Fixed left anchor alignment: shifts center as it scales down
      rig.healthBarFill.position.x = -0.525 * (1 - ratio);
    }

    // Dynamic color transition: > 60% Faction color, 30-60% Warning Amber, < 30% Critical Red
    let col: Color3;
    if (ratio > 0.6) {
      col = owner === PlayerId.HUMAN ? new Color3(0, 0.95, 1) : new Color3(1, 0.25, 0.35);
    } else if (ratio > 0.3) {
      col = new Color3(1, 0.75, 0.1); // Warning Amber
    } else {
      col = new Color3(1, 0.15, 0.15); // Critical Red
    }

    if (rig.healthBarMat) {
      rig.healthBarMat.diffuseColor = col;
      rig.healthBarMat.emissiveColor = col.scale(0.95);
    }

    // Update ground health ring: smoothly contracts radius from 1.0 down to 0.3 with remaining protection
    if (rig.healthRing) {
      const ringScale = 0.3 + 0.7 * ratio;
      rig.healthRing.scaling.set(ringScale, 1.0, ringScale);
    }

    if (rig.healthRingMat) {
      rig.healthRingMat.diffuseColor = col;
      rig.healthRingMat.emissiveColor = col.scale(0.85);
    }
  }

  public removeRobotMesh(node: TransformNode): void {
    const match = node.name.match(/robot_(\d+)/);
    if (match) {
      const id = parseInt(match[1], 10);
      const rig = this.rigs.get(id);
      if (rig) {
        if (rig.healthBarMat) rig.healthBarMat.dispose();
        if (rig.healthRingMat) rig.healthRingMat.dispose();
      }
      this.rigs.delete(id);
    }
    node.dispose(false, false); // Crucial: false prevents destroying shared materials!
  }
}
