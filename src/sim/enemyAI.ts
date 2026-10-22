import { ActiveRobot, ConstructionValidator } from './Construction.ts';
import { GameMap } from './mapData.ts';
import { EconomyManager } from './economy.ts';
import { ChassisType, WeaponType, PlayerId, OrderType, ModuleType, RobotBlueprint } from './types.ts';
import { MAX_ROBOTS_PER_PLAYER } from './constants.ts';

export interface AIGeneralStats {
  robotsBuilt: number;
  byChassis: Record<string, number>;
  byWeapons: Record<string, number>;
  nuclearLaunched: number;
}

export class BaseAIGeneral {
  public enabled: boolean = true;
  public timer: number = 0;
  public spawnInterval: number;
  public nextRobotId: number;
  public stats: AIGeneralStats;

  constructor(
    public playerId: PlayerId = PlayerId.INSIGNIAN,
    spawnInterval: number = 220
  ) {
    this.spawnInterval = spawnInterval;
    this.nextRobotId = playerId === PlayerId.HUMAN ? 1000 : 5000;
    this.stats = {
      robotsBuilt: 0,
      byChassis: {},
      byWeapons: {},
      nuclearLaunched: 0
    };
  }

  public reset(): void {
    this.timer = 0;
    this.nextRobotId = this.playerId === PlayerId.HUMAN ? 1000 : 5000;
    this.stats = {
      robotsBuilt: 0,
      byChassis: {},
      byWeapons: {},
      nuclearLaunched: 0
    };
  }

  public update(
    map: GameMap,
    economy: EconomyManager,
    robots: ActiveRobot[],
    onRobotSpawned: (robot: ActiveRobot) => void
  ): void {
    if (!this.enabled) return;

    this.timer++;
    if (this.timer < this.spawnInterval) return;

    // Find owned active warbases
    const myBases = map.warbases.filter((b) => b.owner === this.playerId && !b.isDestroyed);
    if (myBases.length === 0) return;

    const myRobots = robots.filter((r) => r.owner === this.playerId && !r.isDestroyed);
    if (myRobots.length >= MAX_ROBOTS_PER_PLAYER) return;

    // Strategic assessment
    const myFactories = map.factories.filter((f) => f.owner === this.playerId && !f.isDestroyed).length;
    const unownedFactories = map.factories.filter((f) => f.owner !== this.playerId && !f.isDestroyed).length;
    const pool = economy.getResources(this.playerId);

    // Pick blueprint candidate list based on strategic phase
    const candidates: { bp: RobotBlueprint; order: OrderType }[] = [];

    // 1. Nuclear delivery unit (if enemy has base, player has enough resources, and chance rolls)
    if (pool.general >= 25 && (pool.nuclear >= 1 || pool.general >= 35) && Math.random() < 0.25) {
      candidates.push({
        bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.NUCLEAR], hasElectronics: false },
        order: OrderType.ADVANCE
      });
    }

    // 2. Heavy combat units (Multi-weapon salvos)
    candidates.push(
      {
        bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON, WeaponType.MISSILES, WeaponType.PHASERS], hasElectronics: false },
        order: Math.random() < 0.5 ? OrderType.ADVANCE : OrderType.SEARCH_AND_DESTROY
      },
      {
        bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON, WeaponType.MISSILES], hasElectronics: false },
        order: OrderType.ADVANCE
      },
      {
        bp: { chassis: ChassisType.ANTIGRAV, weapons: [WeaponType.MISSILES, WeaponType.PHASERS], hasElectronics: true },
        order: OrderType.SEARCH_AND_DESTROY
      },
      {
        bp: { chassis: ChassisType.BIPOD, weapons: [WeaponType.PHASERS], hasElectronics: true },
        order: Math.random() < 0.4 ? OrderType.SEARCH_AND_CAPTURE : OrderType.ADVANCE
      }
    );

    // 3. Early/Expansion capture scouts
    if (myFactories < 4 && unownedFactories > 0) {
      candidates.unshift(
        {
          bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
          order: OrderType.SEARCH_AND_CAPTURE
        },
        {
          bp: { chassis: ChassisType.BIPOD, weapons: [WeaponType.PHASERS], hasElectronics: false },
          order: OrderType.SEARCH_AND_CAPTURE
        },
        {
          bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.MISSILES], hasElectronics: false },
          order: OrderType.SEARCH_AND_CAPTURE
        }
      );
    } else {
      // Add lightweight fallbacks at the end
      candidates.push(
        {
          bp: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
          order: OrderType.ADVANCE
        },
        {
          bp: { chassis: ChassisType.BIPOD, weapons: [WeaponType.PHASERS], hasElectronics: false },
          order: OrderType.SEARCH_AND_DESTROY
        }
      );
    }

    // Find first blueprint that can be afforded
    let selectedCandidate: { bp: RobotBlueprint; order: OrderType } | null = null;
    for (const cand of candidates) {
      if (ConstructionValidator.canBuild(this.playerId, cand.bp, economy, myRobots.length).canBuild) {
        selectedCandidate = cand;
        break;
      }
    }

    if (!selectedCandidate) return; // Wait until next tick when resources accumulate

    const { bp, order } = selectedCandidate;

    // Deduct resources
    economy.purchasePiece(this.playerId, bp.chassis);
    for (const w of bp.weapons) {
      economy.purchasePiece(this.playerId, w);
    }
    if (bp.hasElectronics) {
      economy.purchasePiece(this.playerId, ModuleType.ELECTRONICS);
    }

    this.timer = 0;

    // Determine spawn location and orientation
    const base = myBases[0];
    let spawnX: number;
    let spawnY: number;
    let facing: number;

    if (base.x < 64) {
      // Southwest base (Alliance) -> Spawns facing East/North
      spawnX = base.x + 3;
      spawnY = base.y;
      facing = 0; // East
    } else {
      // Northeast base (Insignian) -> Spawns facing West/South
      spawnX = base.x - 3;
      spawnY = base.y;
      facing = 2; // West
    }

    const newRobot: ActiveRobot = {
      id: this.nextRobotId++,
      owner: this.playerId,
      blueprint: bp,
      stackHeight: ConstructionValidator.calculateStackHeight(bp),
      x: spawnX,
      y: spawnY,
      altitude: 0,
      strength: 100,
      facing,
      order,
      orderParam: 50,
      isDestroyed: false,
      walkOutStepsRemaining: 2,
      currentMoveTicksRemaining: 0
    };

    // Update internal stats
    this.stats.robotsBuilt++;
    this.stats.byChassis[bp.chassis] = (this.stats.byChassis[bp.chassis] || 0) + 1;
    for (const w of bp.weapons) {
      this.stats.byWeapons[w] = (this.stats.byWeapons[w] || 0) + 1;
      if (w === WeaponType.NUCLEAR) this.stats.nuclearLaunched++;
    }

    onRobotSpawned(newRobot);
  }
}

// Backwards compatibility alias
export class EnemyAIGeneral extends BaseAIGeneral {
  constructor() {
    super(PlayerId.INSIGNIAN, 220);
  }
}
