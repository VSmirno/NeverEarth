import { describe, it, expect } from 'vitest';
import { CombatSystem } from '../src/sim/combat.ts';
import { RobotMovementSystem } from '../src/sim/RobotMovement.ts';
import { GameMap } from '../src/sim/mapData.ts';
import { ChassisType, WeaponType, OrderType, PlayerId } from '../src/sim/types.ts';
import { ActiveRobot } from '../src/sim/Construction.ts';

describe('Combat System & Multi-Weapon Salvo', () => {
  it('correctly fires lateral spread multi-weapon salvos', () => {
    const combat = new CombatSystem();
    const shooter: ActiveRobot = {
      id: 1,
      owner: PlayerId.HUMAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON, WeaponType.MISSILES, WeaponType.PHASERS],
        hasElectronics: true
      },
      stackHeight: 33,
      x: 30,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 0, // East (+X)
      order: OrderType.STOP_AND_DEFEND,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Target to the East at [38, 30] (distance 8)
    const target: ActiveRobot = {
      id: 2,
      owner: PlayerId.INSIGNIAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON],
        hasElectronics: false
      },
      stackHeight: 13,
      x: 38,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 2, // West
      order: OrderType.STOP_AND_DEFEND,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Fire 3-weapon salvo with lateral spread
    const offsets = [-0.38, 0, 0.38];
    shooter.blueprint.weapons.forEach((w, idx) => {
      combat.fireWeapon(shooter, w, target.x, target.y, offsets[idx]);
    });

    expect(combat.projectiles.length).toBe(3);
    // Facing East means dirX = 1, dirY = 0.
    // Perpendicular vector is (-dirY, dirX) = (0, 1) -> offsets shift Y
    expect(combat.projectiles[0].type).toBe(WeaponType.CANNON);
    expect(combat.projectiles[0].y).toBeCloseTo(30 - 0.38);

    expect(combat.projectiles[1].type).toBe(WeaponType.MISSILES);
    expect(combat.projectiles[1].y).toBeCloseTo(30);

    expect(combat.projectiles[2].type).toBe(WeaponType.PHASERS);
    expect(combat.projectiles[2].y).toBeCloseTo(30 + 0.38);

    // All 3 projectiles fly towards the target and impact it
    const map = new GameMap();
    let hits = 0;
    let totalDamage = 0;

    for (let step = 0; step < 10; step++) {
      combat.updateProjectiles([shooter, target], map, (_t, dmg) => {
        hits++;
        totalDamage += dmg;
      });
    }

    expect(hits).toBe(3);
    // Cannon (9) + Missiles (13) + Phasers (18) = 40 damage in one volley!
    expect(totalDamage).toBe(40);
    expect(target.strength).toBe(60);
  });

  it('proves a heavy 3-weapon dreadnought crushes a single-weapon enemy in combat', () => {
    const combat = new CombatSystem();
    const map = new GameMap();

    // Heavy player robot with Cannons, Missiles, Phasers, Electronics on Bipod/Tracks
    const heavyPlayer: ActiveRobot = {
      id: 10,
      owner: PlayerId.HUMAN,
      blueprint: {
        chassis: ChassisType.BIPOD,
        weapons: [WeaponType.MISSILES, WeaponType.PHASERS, WeaponType.CANNON],
        hasElectronics: true
      },
      stackHeight: 37,
      x: 20,
      y: 20,
      altitude: 0,
      strength: 100,
      facing: 0,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Enemy robot with single Cannon on Tracks
    const enemyRobot: ActiveRobot = {
      id: 20,
      owner: PlayerId.INSIGNIAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON],
        hasElectronics: false
      },
      stackHeight: 13,
      x: 26,
      y: 20,
      altitude: 0,
      strength: 100,
      facing: 2,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Simulate 3 volleys from heavy player (salvo of 3 weapons each)
    // and 3 single shots from enemy
    for (let round = 0; round < 3; round++) {
      // Player salvo
      heavyPlayer.blueprint.weapons.forEach((w, idx) => {
        const offset = idx === 0 ? -0.38 : idx === 1 ? 0 : 0.38;
        combat.fireWeapon(heavyPlayer, w, enemyRobot.x, enemyRobot.y, offset);
      });

      // Enemy single shot
      combat.fireWeapon(enemyRobot, enemyRobot.blueprint.weapons[0], heavyPlayer.x, heavyPlayer.y);

      // Simulate projectile impacts
      for (let step = 0; step < 10; step++) {
        combat.updateProjectiles([heavyPlayer, enemyRobot], map);
      }
    }

    // After 3 rounds (3 volleys of 40 dmg = 120 dmg):
    // Enemy (100 HP) must be completely destroyed!
    expect(enemyRobot.isDestroyed).toBe(true);
    expect(enemyRobot.strength).toBe(0);

    // Player took 3 cannon hits of 4 dmg = 12 dmg total. Still standing strong with 88% HP!
    expect(heavyPlayer.isDestroyed).toBe(false);
    expect(heavyPlayer.strength).toBe(88);
  });

  it('ensures robot with SEARCH_AND_CAPTURE order halts and faces enemy when engaged in combat', () => {
    const map = new GameMap();
    const capturer: ActiveRobot = {
      id: 50,
      owner: PlayerId.HUMAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.MISSILES, WeaponType.PHASERS],
        hasElectronics: false
      },
      stackHeight: 20,
      x: 30,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 1, // Facing South towards a distant factory
      order: OrderType.SEARCH_AND_CAPTURE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Hostile enemy robot at [34, 30] (East, distance 4 cells)
    const enemy: ActiveRobot = {
      id: 51,
      owner: PlayerId.INSIGNIAN,
      blueprint: {
        chassis: ChassisType.TRACKS,
        weapons: [WeaponType.CANNON],
        hasElectronics: false
      },
      stackHeight: 13,
      x: 34,
      y: 30,
      altitude: 0,
      strength: 100,
      facing: 2,
      order: OrderType.ADVANCE,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    // Update robot movement tick
    RobotMovementSystem.updateRobot(capturer, map, [capturer, enemy]);

    // Capturer must have turned to face East (dx = 4, dy = 0 -> facing = 0) towards the threat
    expect(capturer.facing).toBe(0);
    expect(capturer.targetFacingAngle).toBeCloseTo(Math.PI / 2);
    // And halted its factory advance (did not step away or ignore the enemy)
    expect(capturer.x).toBe(30);
    expect(capturer.y).toBe(30);
  });
});
