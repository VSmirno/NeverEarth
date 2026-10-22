import { ResourcePool, StructureType, PlayerId, ChassisType, WeaponType, ModuleType } from './types.ts';
import { INITIAL_GENERAL_RESOURCES, PIECE_COSTS, DAY_DURATION_TICKS } from './constants.ts';
import { StructureDef } from './mapData.ts';

export class EconomyManager {
  private resources: Map<PlayerId, ResourcePool>;
  private tickCounter: number = 0;

  constructor() {
    this.resources = new Map();
    this.reset();
  }

  public reset(): void {
    this.resources.set(PlayerId.HUMAN, this.createEmptyPool(INITIAL_GENERAL_RESOURCES));
    this.resources.set(PlayerId.INSIGNIAN, this.createEmptyPool(INITIAL_GENERAL_RESOURCES));
    this.resources.set(PlayerId.NEUTRAL, this.createEmptyPool(0));
    this.tickCounter = 0;
  }

  private createEmptyPool(generalAmount: number): ResourcePool {
    return {
      general: generalAmount,
      chassis: 0,
      cannons: 0,
      missiles: 0,
      phasers: 0,
      nuclear: 0,
      electronics: 0
    };
  }

  public getResources(player: PlayerId): ResourcePool {
    return this.resources.get(player)!;
  }

  public update(ticks: number, warbases: StructureDef[], factories: StructureDef[]): void {
    this.tickCounter += ticks;
    while (this.tickCounter >= DAY_DURATION_TICKS) {
      this.tickCounter -= DAY_DURATION_TICKS;
      this.applyDailyProduction(warbases, factories);
    }
  }

  public applyDailyProduction(warbases: StructureDef[], factories: StructureDef[]): void {
    // Warbases give +5 General Resources per owned active base
    for (const base of warbases) {
      if (!base.isDestroyed && base.owner !== PlayerId.NEUTRAL) {
        const pool = this.resources.get(base.owner);
        if (pool) pool.general += 5;
      }
    }

    // Factories give +2 to their specific component pool
    for (const factory of factories) {
      if (!factory.isDestroyed && factory.owner !== PlayerId.NEUTRAL) {
        const pool = this.resources.get(factory.owner);
        if (!pool) continue;

        switch (factory.type) {
          case StructureType.FACTORY_CHASSIS:
            pool.chassis += 2;
            break;
          case StructureType.FACTORY_CANNONS:
            pool.cannons += 2;
            break;
          case StructureType.FACTORY_MISSILES:
            pool.missiles += 2;
            break;
          case StructureType.FACTORY_PHASERS:
            pool.phasers += 2;
            break;
          case StructureType.FACTORY_NUCLEAR:
            pool.nuclear += 2;
            break;
          case StructureType.FACTORY_ELECTRONICS:
            pool.electronics += 2;
            break;
        }
      }
    }
  }

  // Can the player afford this piece given their specific + general resources?
  public canAffordPiece(player: PlayerId, piece: ChassisType | WeaponType | ModuleType): boolean {
    const pool = this.resources.get(player)!;
    const cost = PIECE_COSTS[piece];
    const specificAvailable = this.getSpecificPoolForPiece(pool, piece);

    // Specific pool pays first; shortfall is covered by General
    const shortfall = Math.max(0, cost - specificAvailable);
    return pool.general >= shortfall;
  }

  // Purchase a piece deducting specific first, then general
  public purchasePiece(player: PlayerId, piece: ChassisType | WeaponType | ModuleType): boolean {
    if (!this.canAffordPiece(player, piece)) return false;

    const pool = this.resources.get(player)!;
    const cost = PIECE_COSTS[piece];
    const key = this.getPoolKeyForPiece(piece);
    const specificAvailable = pool[key];

    if (specificAvailable >= cost) {
      pool[key] -= cost;
    } else {
      const shortfall = cost - specificAvailable;
      pool[key] = 0;
      pool.general -= shortfall;
    }
    return true;
  }

  // Refund when deselecting a piece in the constructor
  public refundPiece(player: PlayerId, piece: ChassisType | WeaponType | ModuleType): void {
    const pool = this.resources.get(player)!;
    const cost = PIECE_COSTS[piece];
    const key = this.getPoolKeyForPiece(piece);
    pool[key] += cost;
  }

  private getPoolKeyForPiece(piece: ChassisType | WeaponType | ModuleType): keyof ResourcePool {
    switch (piece) {
      case ChassisType.BIPOD:
      case ChassisType.TRACKS:
      case ChassisType.ANTIGRAV:
        return 'chassis';
      case WeaponType.CANNON:
        return 'cannons';
      case WeaponType.MISSILES:
        return 'missiles';
      case WeaponType.PHASERS:
        return 'phasers';
      case WeaponType.NUCLEAR:
        return 'nuclear';
      case ModuleType.ELECTRONICS:
        return 'electronics';
    }
  }

  private getSpecificPoolForPiece(pool: ResourcePool, piece: ChassisType | WeaponType | ModuleType): number {
    const key = this.getPoolKeyForPiece(piece);
    return pool[key];
  }
}
