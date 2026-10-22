import {
  RobotBlueprint,
  ChassisType,
  WeaponType,
  ModuleType,
  PlayerId,
  OrderType
} from './types.ts';
import {
  PIECE_COSTS,
  PIECE_HEIGHTS,
  MAX_ROBOTS_PER_PLAYER
} from './constants.ts';
import { EconomyManager } from './economy.ts';

export interface ActiveRobot {
  id: number;
  owner: PlayerId;
  blueprint: RobotBlueprint;
  stackHeight: number;
  x: number;
  y: number;
  altitude: number;
  strength: number; // 100 max
  facing: number;   // 0: East, 1: South, 2: West, 3: North
  order: OrderType;
  orderParam: number; // miles or target id
  isDestroyed: boolean;
  walkOutStepsRemaining: number; // walks out south 5 steps upon launch
  currentMoveTicksRemaining: number;
  targetX?: number;
  targetY?: number;
  targetFacingAngle?: number;
  lastX?: number;
  lastY?: number;
  weaponCooldown?: number;
}

export class ConstructionValidator {
  public static calculateStackHeight(blueprint: RobotBlueprint): number {
    let height = PIECE_HEIGHTS[blueprint.chassis];
    for (const w of blueprint.weapons) {
      height += PIECE_HEIGHTS[w];
    }
    if (blueprint.hasElectronics) {
      height += PIECE_HEIGHTS[ModuleType.ELECTRONICS];
    }
    return height;
  }

  public static isValidBlueprint(blueprint: Partial<RobotBlueprint>): { valid: boolean; reason?: string } {
    if (!blueprint.chassis) {
      return { valid: false, reason: 'Chassis required' };
    }

    if (!blueprint.weapons || blueprint.weapons.length === 0) {
      return { valid: false, reason: 'At least one weapon required' };
    }

    if (blueprint.weapons.length > 3) {
      return { valid: false, reason: 'Maximum 3 weapons allowed' };
    }

    // Check duplicate weapons
    const set = new Set(blueprint.weapons);
    if (set.size !== blueprint.weapons.length) {
      return { valid: false, reason: 'Duplicate weapons are not permitted' };
    }

    return { valid: true };
  }

  public static computeTotalCost(blueprint: RobotBlueprint): {
    specific: { chassis: number; cannons: number; missiles: number; phasers: number; nuclear: number; electronics: number };
    totalCost: number;
  } {
    const specific = {
      chassis: PIECE_COSTS[blueprint.chassis],
      cannons: 0,
      missiles: 0,
      phasers: 0,
      nuclear: 0,
      electronics: blueprint.hasElectronics ? PIECE_COSTS[ModuleType.ELECTRONICS] : 0
    };

    for (const w of blueprint.weapons) {
      if (w === WeaponType.CANNON) specific.cannons += PIECE_COSTS[WeaponType.CANNON];
      if (w === WeaponType.MISSILES) specific.missiles += PIECE_COSTS[WeaponType.MISSILES];
      if (w === WeaponType.PHASERS) specific.phasers += PIECE_COSTS[WeaponType.PHASERS];
      if (w === WeaponType.NUCLEAR) specific.nuclear += PIECE_COSTS[WeaponType.NUCLEAR];
    }

    const totalCost = Object.values(specific).reduce((a, b) => a + b, 0);
    return { specific, totalCost };
  }

  public static canBuild(
    player: PlayerId,
    blueprint: RobotBlueprint,
    economy: EconomyManager,
    currentRobotCount: number
  ): { canBuild: boolean; reason?: string } {
    if (currentRobotCount >= MAX_ROBOTS_PER_PLAYER) {
      return { canBuild: false, reason: `Maximum robot limit (${MAX_ROBOTS_PER_PLAYER}) reached` };
    }

    const validation = this.isValidBlueprint(blueprint);
    if (!validation.valid) return { canBuild: false, reason: validation.reason };

    // Check affordability of each piece
    const pieces: (ChassisType | WeaponType | ModuleType)[] = [
      blueprint.chassis,
      ...blueprint.weapons
    ];
    if (blueprint.hasElectronics) pieces.push(ModuleType.ELECTRONICS);

    // Compute whether player has enough resources (specific + general)
    const pool = { ...economy.getResources(player) };
    for (const piece of pieces) {
      const cost = PIECE_COSTS[piece];
      let key: keyof typeof pool;
      if (piece === ChassisType.BIPOD || piece === ChassisType.TRACKS || piece === ChassisType.ANTIGRAV) key = 'chassis';
      else if (piece === WeaponType.CANNON) key = 'cannons';
      else if (piece === WeaponType.MISSILES) key = 'missiles';
      else if (piece === WeaponType.PHASERS) key = 'phasers';
      else if (piece === WeaponType.NUCLEAR) key = 'nuclear';
      else key = 'electronics';

      if (pool[key] >= cost) {
        pool[key] -= cost;
      } else {
        const shortfall = cost - pool[key];
        pool[key] = 0;
        if (pool.general >= shortfall) {
          pool.general -= shortfall;
        } else {
          return { canBuild: false, reason: `Insufficient resources for ${piece}` };
        }
      }
    }

    return { canBuild: true };
  }
}
