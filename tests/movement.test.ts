import { describe, it, expect } from 'vitest';
import { RobotMovementSystem } from '../src/sim/RobotMovement.ts';
import { AStarPathfinder } from '../src/sim/Pathfinding.ts';
import { GameMap } from '../src/sim/mapData.ts';
import { ChassisType, TerrainType, WeaponType, OrderType, PlayerId } from '../src/sim/types.ts';
import { ActiveRobot } from '../src/sim/Construction.ts';
import { SPECTRUM_CYCLE_TICKS, CAPTURE_DURATION_TICKS } from '../src/sim/constants.ts';
import { CaptureSystem } from '../src/sim/capture.ts';
import { CombatSystem } from '../src/sim/combat.ts';

describe('Robot Movement & Navigation System', () => {
  it('correctly enforces terrain traversal permissions by chassis type', () => {
    // Bipod: normal, rough, ditch (blocked), mountain (blocked)
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.BIPOD, TerrainType.NORMAL)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.BIPOD, TerrainType.ROUGH)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.BIPOD, TerrainType.DITCH)).toBe(false);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.BIPOD, TerrainType.MOUNTAIN)).toBe(false);

    // Tracks: normal, rough, mountain, ditch (blocked)
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.TRACKS, TerrainType.NORMAL)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.TRACKS, TerrainType.ROUGH)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.TRACKS, TerrainType.MOUNTAIN)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.TRACKS, TerrainType.DITCH)).toBe(false);

    // Anti-Grav: passes normal, rough, mountain, and ditch
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.NORMAL)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.ROUGH)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.MOUNTAIN)).toBe(true);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.DITCH)).toBe(true);

    // Impassable boundaries
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.FENCE)).toBe(false);
    expect(RobotMovementSystem.canEnterTerrain(ChassisType.ANTIGRAV, TerrainType.WALL_HIGH)).toBe(false);
  });

  it('calculates exact disassembly step durations', () => {
    // Anti-grav: 12 ticks normal, 12 rough, 16 mountain, 12 ditch
    expect(RobotMovementSystem.getStepDuration(ChassisType.ANTIGRAV, TerrainType.NORMAL)).toBe(12);
    expect(RobotMovementSystem.getStepDuration(ChassisType.ANTIGRAV, TerrainType.ROUGH)).toBe(12);
    expect(RobotMovementSystem.getStepDuration(ChassisType.ANTIGRAV, TerrainType.MOUNTAIN)).toBe(16);
    expect(RobotMovementSystem.getStepDuration(ChassisType.ANTIGRAV, TerrainType.DITCH)).toBe(12);

    // Tracks: 16 ticks normal, 24 rough, 28 mountain
    expect(RobotMovementSystem.getStepDuration(ChassisType.TRACKS, TerrainType.NORMAL)).toBe(16);
    expect(RobotMovementSystem.getStepDuration(ChassisType.TRACKS, TerrainType.ROUGH)).toBe(24);
    expect(RobotMovementSystem.getStepDuration(ChassisType.TRACKS, TerrainType.MOUNTAIN)).toBe(28);

    // Bipod: 24 ticks normal, 32 rough
    expect(RobotMovementSystem.getStepDuration(ChassisType.BIPOD, TerrainType.NORMAL)).toBe(24);
    expect(RobotMovementSystem.getStepDuration(ChassisType.BIPOD, TerrainType.ROUGH)).toBe(32);
  });

  it('charges 4 ticks when robot changes facing direction', () => {
    const map = new GameMap();
    const robot: ActiveRobot = {
      id: 1,
      owner: PlayerId.HUMAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON],
        hasElectronics: false
      },
      stackHeight: 13,
      x: 20,
      y: 5,
      altitude: 0,
      strength: 100,
      facing: 1, // South
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Turning to East (0) should take 4 ticks without moving position
    const moved = RobotMovementSystem.stepInDirection(robot, 0, map);
    expect(moved).toBe(true);
    expect(robot.facing).toBe(0);
    expect(robot.currentMoveTicksRemaining).toBe(SPECTRUM_CYCLE_TICKS);
    expect(robot.x).toBe(20);
    expect(robot.y).toBe(5);
  });

  it('A* pathfinder computes valid paths navigating around impassable terrain', () => {
    const map = new GameMap();
    const path = AStarPathfinder.findPath(10, 5, 14, 5, ChassisType.TRACKS, map);
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ x: 10, y: 5 });
    const end = path[path.length - 1];
    expect(Math.abs(end.x - 14) + Math.abs(end.y - 5)).toBeLessThanOrEqual(1);
  });

  it('advances around obstacles without infinite turn oscillation', () => {
    const map = new GameMap();
    // Place an impassable fence directly in front of robot at (99, 5)
    map.terrain[5 * map.length + 99] = TerrainType.FENCE;

    const robot: ActiveRobot = {
      id: 2,
      owner: PlayerId.INSIGNIAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON],
        hasElectronics: false
      },
      stackHeight: 13,
      x: 100,
      y: 5,
      altitude: 0,
      strength: 100,
      facing: 2, // West
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Simulate several movement updates (Tracks takes 16 ticks per step on normal terrain)
    for (let i = 0; i < 40; i++) {
      RobotMovementSystem.updateRobot(robot, map, [robot]);
    }

    // Robot should successfully detour, not remain stuck at (100, 5)
    expect(robot.x !== 100 || robot.y !== 5).toBe(true);
  });

  it('halts and faces enemy in range during ADVANCE order instead of driving past', () => {
    const map = new GameMap();
    const humanRobot: ActiveRobot = {
      id: 1,
      owner: PlayerId.HUMAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 30,
      y: 5,
      altitude: 0,
      strength: 100,
      facing: 0, // East
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    const enemyRobot: ActiveRobot = {
      id: 2,
      owner: PlayerId.INSIGNIAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 36, // 6 cells ahead
      y: 5,
      altitude: 0,
      strength: 100,
      facing: 2, // West
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    RobotMovementSystem.updateRobot(humanRobot, map, [humanRobot, enemyRobot]);

    // Robot should halt (remain at x = 30) to engage enemy, facing East (0)
    expect(humanRobot.x).toBe(30);
    expect(humanRobot.facing).toBe(0);
  });

  it('treats warbase bunker footprint as solid impassable WALL_HIGH', () => {
    const map = new GameMap();
    const base = map.warbases[0]; // Human base at (18, 110)
    expect(map.getTerrainAt(base.x, base.y)).toBe(TerrainType.WALL_HIGH);
    expect(map.getElevationAt(base.x, base.y)).toBe(15);

    const robot: ActiveRobot = {
      id: 1,
      owner: PlayerId.INSIGNIAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: base.x + 2,
      y: base.y,
      altitude: 0,
      strength: 100,
      facing: 2, // West
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Stepping West into (base.x, base.y) must be blocked
    expect(RobotMovementSystem.canStepInDirection(robot, 2, map)).toBe(false);
  });

  it('allows robots in Southern territory (e.g. y = 107) to advance and capture', () => {
    const map = new GameMap();
    const robot: ActiveRobot = {
      id: 5,
      owner: PlayerId.HUMAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 21,
      y: 107,
      altitude: 0,
      strength: 100,
      facing: 0,
      order: OrderType.SEARCH_AND_CAPTURE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Update robot for 40 ticks
    for (let i = 0; i < 40; i++) {
      RobotMovementSystem.updateRobot(robot, map, [robot]);
    }

    // Robot should have moved from its spawn position
    expect(robot.x !== 21 || robot.y !== 107).toBe(true);
  });

  it('navigates directly towards custom right-click waypoint coordinates', () => {
    const map = new GameMap();
    const robot: ActiveRobot = {
      id: 6,
      owner: PlayerId.HUMAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 21,
      y: 107,
      altitude: 0,
      strength: 100,
      facing: 0,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0,
      targetX: 25,
      targetY: 107
    };

    for (let i = 0; i < 40; i++) {
      RobotMovementSystem.updateRobot(robot, map, [robot]);
    }

    // Robot should step towards targetX = 25
    expect(robot.x).toBeGreaterThan(21);
  });

  it('allows capturing warbases when occupying robot is in the courtyard', () => {
    const map = new GameMap();
    const warbase = map.warbases.find((b) => b.id === 100)!;
    expect(warbase.owner).toBe(PlayerId.HUMAN);

    // Insignian robot standing at (18, 112) - in the courtyard, dist 2.0 to base (18, 110)
    const enemyRobot: ActiveRobot = {
      id: 77,
      owner: PlayerId.INSIGNIAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 18,
      y: 112,
      altitude: 0,
      strength: 100,
      facing: 3,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    let capturedBy: PlayerId | null = null;
    const ticksToCapture = Math.ceil(CAPTURE_DURATION_TICKS / 3);
    for (let t = 0; t < ticksToCapture; t++) {
      CaptureSystem.updateCapture(
        map.warbases,
        [enemyRobot],
        (_structure, newOwner) => {
          capturedBy = newOwner;
        }
      );
    }

    expect(capturedBy).toBe(PlayerId.INSIGNIAN);
    expect(warbase.owner).toBe(PlayerId.INSIGNIAN);
  });

  it('does not oscillate or spin endlessly when robot reaches warbase', () => {
    const map = new GameMap();
    // Robot commanded to move to Alliance warbase
    const robot: ActiveRobot = {
      id: 88,
      owner: PlayerId.INSIGNIAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 18,
      y: 112,
      altitude: 0,
      strength: 100,
      facing: 3,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0,
      targetX: 18,
      targetY: 110
    };

    const facings: number[] = [];
    const positions: string[] = [];

    // Simulate 20 ticks
    for (let i = 0; i < 20; i++) {
      RobotMovementSystem.updateRobot(robot, map, [robot]);
      facings.push(robot.facing);
      positions.push(`${robot.x},${robot.y}`);
    }

    // Target waypoint should be cleared upon entering courtyard
    expect(robot.targetX).toBeUndefined();
    expect(robot.targetY).toBeUndefined();

    // Position must remain steady (no ping-pong between 112 and 113)
    const lastPositions = positions.slice(-10);
    const uniquePositions = new Set(lastPositions);
    expect(uniquePositions.size).toBe(1);

    // Facing must remain steady
    const lastFacings = facings.slice(-10);
    const uniqueFacings = new Set(lastFacings);
    expect(uniqueFacings.size).toBe(1);
  });

  it('scales robot protection so duels require multiple hits over 3-4 seconds', () => {
    const map = new GameMap();
    const combat = new CombatSystem();

    const shooter: ActiveRobot = {
      id: 101,
      owner: PlayerId.HUMAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 30,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 0,
      order: OrderType.STOP_AND_DEFEND,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    const target: ActiveRobot = {
      id: 102,
      owner: PlayerId.INSIGNIAN,
      blueprint: { chassis: ChassisType.TRACKS, weapons: [WeaponType.CANNON], hasElectronics: false },
      stackHeight: 13,
      x: 34,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 2,
      order: OrderType.STOP_AND_DEFEND,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Fire one shot from shooter to target
    combat.fireWeapon(shooter, WeaponType.CANNON, target.x, target.y);
    let hitCount = 0;
    let damageTaken = 0;

    // Simulate projectile movement until impact
    for (let i = 0; i < 10; i++) {
      combat.updateProjectiles([shooter, target], map, (_t, dmg) => {
        hitCount++;
        damageTaken += dmg;
      });
    }

    expect(hitCount).toBe(1);
    // Scaled durability: 9 damage per cannon hit (takes 12 hits = ~3.5-4s of combat)
    expect(damageTaken).toBe(9);
    expect(target.strength).toBe(91);
    expect(target.isDestroyed).toBe(false);

    // Target can withstand 12 cannon hits (lasting 3-4+ seconds of combat)
    const hitsToDestroy = Math.ceil(100 / damageTaken);
    expect(hitsToDestroy).toBeGreaterThanOrEqual(10);
  });
});
