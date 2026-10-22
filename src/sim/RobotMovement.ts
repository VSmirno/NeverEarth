import { ActiveRobot } from './Construction.ts';
import { GameMap } from './mapData.ts';
import { CHASSIS_SPEEDS, SPECTRUM_CYCLE_TICKS } from './constants.ts';
import { TerrainType, OrderType, PlayerId, WeaponType } from './types.ts';
import { AStarPathfinder } from './Pathfinding.ts';

export class RobotMovementSystem {
  public static canEnterTerrain(chassis: ActiveRobot['blueprint']['chassis'], terrain: TerrainType): boolean {
    const speeds = CHASSIS_SPEEDS[chassis];
    switch (terrain) {
      case TerrainType.NORMAL:
        return speeds.normal !== Infinity;
      case TerrainType.ROUGH:
      case TerrainType.DEBRIS:
        return speeds.rough !== Infinity;
      case TerrainType.MOUNTAIN:
        return speeds.mountain !== Infinity;
      case TerrainType.DITCH:
        return speeds.ditch !== Infinity;
      case TerrainType.FENCE:
      case TerrainType.WALL_HIGH:
      case TerrainType.WALL_LOW:
      default:
        return false;
    }
  }

  public static getStepDuration(
    chassis: ActiveRobot['blueprint']['chassis'],
    terrain: TerrainType
  ): number {
    const speeds = CHASSIS_SPEEDS[chassis];
    switch (terrain) {
      case TerrainType.NORMAL:
        return speeds.normal;
      case TerrainType.ROUGH:
      case TerrainType.DEBRIS:
        return speeds.rough;
      case TerrainType.MOUNTAIN:
        return speeds.mountain;
      case TerrainType.DITCH:
        return speeds.ditch;
      default:
        return Infinity;
    }
  }

  public static updateRobot(robot: ActiveRobot, map: GameMap, allRobots: ActiveRobot[]): void {
    if (robot.isDestroyed) return;

    // Turn or movement delay countdown
    if (robot.currentMoveTicksRemaining > 0) {
      robot.currentMoveTicksRemaining--;
      return;
    }

    // Newly spawned robots take initial clearing step in their facing direction
    if (robot.walkOutStepsRemaining > 0) {
      if (this.canStepInDirection(robot, robot.facing, map)) {
        this.stepInDirection(robot, robot.facing, map);
      }
      robot.walkOutStepsRemaining--;
      return;
    }

    // Specific player waypoint target (e.g. from right-click)
    if (robot.targetX !== undefined && robot.targetY !== undefined) {
      const dist = Math.hypot(robot.x - robot.targetX, robot.y - robot.targetY);
      // If target is a warbase or near one, consider arrived when inside capture courtyard (radius 3.2)
      const targetNearWarbase = map.warbases.some((b) => Math.hypot(robot.targetX! - b.x, robot.targetY! - b.y) <= 3.2);
      const arrivalRadius = targetNearWarbase ? 3.2 : 1.2;

      if (dist > arrivalRadius) {
        this.navigateTowards(robot, robot.targetX, robot.targetY, map);
        return;
      } else {
        delete robot.targetX;
        delete robot.targetY;
        if (targetNearWarbase) {
          const nearestBase = map.warbases.find((b) => Math.hypot(robot.x - b.x, robot.y - b.y) <= 3.8);
          if (nearestBase) {
            const dx = nearestBase.x - robot.x;
            const dy = nearestBase.y - robot.y;
            if (Math.hypot(dx, dy) >= 0.5) {
              robot.targetFacingAngle = Math.atan2(dx, dy);
              if (Math.abs(dx) >= Math.abs(dy)) {
                robot.facing = dx > 0 ? 0 : 2;
              } else {
                robot.facing = dy > 0 ? 1 : 3;
              }
            }
          }
        }
        return;
      }
    }

    // Execute Autonomous Orders
    switch (robot.order) {
      case OrderType.ADVANCE: {
        // 1. Check if any hostile robot is in weapon range
        const bonusRange = robot.blueprint.hasElectronics ? 2 : 0;
        const maxRange = (robot.blueprint.weapons.includes(WeaponType.MISSILES) ? 14 : 10) + bonusRange;
        let enemyInRange: ActiveRobot | null = null;
        let minEnemyDist = Infinity;
        for (const r of allRobots) {
          if (r.isDestroyed || r.owner === robot.owner) continue;
          const d = Math.hypot(r.x - robot.x, r.y - robot.y);
          if (d <= maxRange && d < minEnemyDist) {
            minEnemyDist = d;
            enemyInRange = r;
          }
        }

        if (enemyInRange) {
          const dx = enemyInRange.x - robot.x;
          const dy = enemyInRange.y - robot.y;
          if (Math.hypot(dx, dy) >= 0.5) {
            robot.targetFacingAngle = Math.atan2(dx, dy);
            if (Math.abs(dx) >= Math.abs(dy)) {
              robot.facing = dx > 0 ? 0 : 2;
            } else {
              robot.facing = dy > 0 ? 1 : 3;
            }
          }

          // If beyond effective combat range (> 6 cells), maneuver closer!
          if (minEnemyDist > 6) {
            this.navigateTowards(robot, enemyInRange.x, enemyInRange.y, map);
          }
          break; // Stop advancing while combat is active
        }

        // 2. Check if enemy warbase is in weapon/capture range
        const enemyBase = map.warbases.find((b) => !b.isDestroyed && b.owner !== robot.owner);
        if (enemyBase) {
          const distToBase = Math.hypot(enemyBase.x - robot.x, enemyBase.y - robot.y);

          // If within courtyard capture perimeter (<= 3.2 cells), hold ground, face base and capture!
          if (distToBase <= 3.2) {
            const dx = enemyBase.x - robot.x;
            const dy = enemyBase.y - robot.y;
            if (Math.hypot(dx, dy) >= 0.5) {
              robot.targetFacingAngle = Math.atan2(dx, dy);
              if (Math.abs(dx) >= Math.abs(dy)) {
                robot.facing = dx > 0 ? 0 : 2;
              } else {
                robot.facing = dy > 0 ? 1 : 3;
              }
            }
            break; // Hold steady stance inside warbase to complete capture!
          }

          // Nuclear unit detonates upon reaching base perimeter (<= 3)
          if (robot.blueprint.weapons.includes(WeaponType.NUCLEAR) && distToBase <= 3.0) {
            break;
          }

          // March directly towards the primary enemy warbase
          this.navigateTowards(robot, enemyBase.x, enemyBase.y, map);
          break;
        } else {
          const forwardDir = robot.owner === PlayerId.HUMAN ? 0 : 2;
          this.stepTowards(robot, forwardDir, map);
        }
        break;
      }

      case OrderType.RETREAT: {
        const myBase = map.warbases.find((b) => !b.isDestroyed && b.owner === robot.owner);
        if (myBase) {
          this.navigateTowards(robot, myBase.x, myBase.y, map);
        } else {
          const retreatDir = robot.owner === PlayerId.HUMAN ? 2 : 0;
          this.stepTowards(robot, retreatDir, map);
        }
        break;
      }

      case OrderType.SEARCH_AND_CAPTURE: {
        // Combat self-defense: if hostile robot is in weapon range, halt, orient, and neutralize it!
        const bonusRange = robot.blueprint.hasElectronics ? 2 : 0;
        const maxRange = (robot.blueprint.weapons.includes(WeaponType.MISSILES) ? 14 : 10) + bonusRange;
        let enemyInRange: ActiveRobot | null = null;
        let minEnemyDist = Infinity;
        for (const r of allRobots) {
          if (r.isDestroyed || r.owner === robot.owner) continue;
          const d = Math.hypot(r.x - robot.x, r.y - robot.y);
          if (d <= maxRange && d < minEnemyDist) {
            minEnemyDist = d;
            enemyInRange = r;
          }
        }

        if (enemyInRange) {
          const dx = enemyInRange.x - robot.x;
          const dy = enemyInRange.y - robot.y;
          if (Math.hypot(dx, dy) >= 0.5) {
            robot.targetFacingAngle = Math.atan2(dx, dy);
            if (Math.abs(dx) >= Math.abs(dy)) {
              robot.facing = dx > 0 ? 0 : 2;
            } else {
              robot.facing = dy > 0 ? 1 : 3;
            }
          }

          // If beyond effective combat range (> 6 cells), maneuver closer to bring all weapons to bear!
          if (minEnemyDist > 6) {
            this.navigateTowards(robot, enemyInRange.x, enemyInRange.y, map);
          }
          break; // Stop navigating towards factory while actively locked in combat!
        }

        // Find nearest unowned or enemy factory
        const unowned = map.factories.filter((f) => !f.isDestroyed && f.owner !== robot.owner);
        const unownedWarbases = map.warbases.filter((b) => !b.isDestroyed && b.owner !== robot.owner);

        // If unowned factories exist, prioritize capturing them
        if (unowned.length > 0) {
          let closest = unowned[0];
          let minDist = Infinity;
          for (const f of unowned) {
            const entryX = f.x;
            const entryY = f.y + 1;
            const d = Math.hypot(entryX - robot.x, entryY - robot.y);
            if (d < minDist) {
              minDist = d;
              closest = f;
            }
          }

          // Navigate directly into the factory interior entrance bay
          const entranceX = closest.x;
          const entranceY = closest.y + 1;
          const distToEntrance = Math.hypot(entranceX - robot.x, entranceY - robot.y);
          if (distToEntrance > 0.8) {
            this.navigateTowards(robot, entranceX, entranceY, map);
          }
          // If within 0.8 cells of entrance bay, robot is parked inside the hangar completing capture!
          break;
        }

        // If all factories are captured, capture enemy or neutral warbases!
        if (unownedWarbases.length > 0) {
          let closestBase = unownedWarbases[0];
          let minDist = Infinity;
          for (const b of unownedWarbases) {
            const d = Math.hypot(b.x - robot.x, b.y - robot.y);
            if (d < minDist) {
              minDist = d;
              closestBase = b;
            }
          }

          const distToBase = Math.hypot(closestBase.x - robot.x, closestBase.y - robot.y);
          if (distToBase > 3.2) {
            this.navigateTowards(robot, closestBase.x, closestBase.y, map);
          } else {
            // Inside warbase capture perimeter, hold ground facing base center
            const dx = closestBase.x - robot.x;
            const dy = closestBase.y - robot.y;
            if (Math.hypot(dx, dy) >= 0.5) {
              robot.targetFacingAngle = Math.atan2(dx, dy);
              if (Math.abs(dx) >= Math.abs(dy)) {
                robot.facing = dx > 0 ? 0 : 2;
              } else {
                robot.facing = dy > 0 ? 1 : 3;
              }
            }
          }
          break;
        }

        break;
      }

      case OrderType.SEARCH_AND_DESTROY: {
        // Find nearest hostile robot
        const enemies = allRobots.filter((r) => !r.isDestroyed && r.owner !== robot.owner);
        if (enemies.length === 0) {
          // If no enemy robots, advance towards enemy warbase
          const targetBase = map.warbases.find((b) => !b.isDestroyed && b.owner !== robot.owner);
          if (targetBase) {
            this.navigateTowards(robot, targetBase.x, targetBase.y, map);
          } else {
            const forwardDir = robot.owner === PlayerId.HUMAN ? 0 : 2;
            this.stepTowards(robot, forwardDir, map);
          }
          break;
        }

        let closestEnemy = enemies[0];
        let minDist = Infinity;
        for (const e of enemies) {
          const d = Math.hypot(e.x - robot.x, e.y - robot.y);
          if (d < minDist) {
            minDist = d;
            closestEnemy = e;
          }
        }

        const dx = closestEnemy.x - robot.x;
        const dy = closestEnemy.y - robot.y;
        robot.targetFacingAngle = Math.atan2(dx, dy);

        if (Math.abs(dx) >= Math.abs(dy)) {
          robot.facing = dx > 0 ? 0 : 2;
        } else {
          robot.facing = dy > 0 ? 1 : 3;
        }

        // Maneuver into effective combat range (<= 6 cells)
        if (minDist > 6) {
          this.navigateTowards(robot, closestEnemy.x, closestEnemy.y, map);
        }
        break;
      }

      case OrderType.STOP_AND_DEFEND:
      default:
        // Hold position, engage in combat
        break;
    }
  }

  public static canStep(robot: ActiveRobot, stepDx: number, stepDy: number, map: GameMap): boolean {
    if (stepDx === 0 && stepDy === 0) return false;
    const nextX = robot.x + stepDx;
    const nextY = robot.y + stepDy;

    if (nextX < 1 || nextX >= map.length - 2 || nextY < 1 || nextY >= map.width - 2) {
      return false;
    }

    const terrain = map.getTerrainAt(nextX, nextY);
    if (!this.canEnterTerrain(robot.blueprint.chassis, terrain)) {
      return false;
    }

    // Diagonal corner clearance so units don't clip through wall/mountain vertices
    if (stepDx !== 0 && stepDy !== 0) {
      const c1 = map.getTerrainAt(robot.x + stepDx, robot.y);
      const c2 = map.getTerrainAt(robot.x, robot.y + stepDy);
      if (!this.canEnterTerrain(robot.blueprint.chassis, c1) && !this.canEnterTerrain(robot.blueprint.chassis, c2)) {
        return false;
      }
    }

    return true;
  }

  public static step(robot: ActiveRobot, stepDx: number, stepDy: number, map: GameMap): boolean {
    if (!this.canStep(robot, stepDx, stepDy, map)) {
      return false;
    }

    const nextX = robot.x + stepDx;
    const nextY = robot.y + stepDy;
    const terrain = map.getTerrainAt(nextX, nextY);

    // Continuous facing angle towards direction of movement!
    robot.targetFacingAngle = Math.atan2(stepDx, stepDy);

    // Update nearest cardinal facing
    if (Math.abs(stepDx) >= Math.abs(stepDy)) {
      robot.facing = stepDx > 0 ? 0 : 2;
    } else {
      robot.facing = stepDy > 0 ? 1 : 3;
    }

    const baseDuration = this.getStepDuration(robot.blueprint.chassis, terrain);
    const isDiagonal = stepDx !== 0 && stepDy !== 0;
    const duration = isDiagonal ? Math.round(baseDuration * 1.414) : baseDuration;

    robot.x = nextX;
    robot.y = nextY;
    robot.altitude = map.getMaxElevationInFootprint(nextX, nextY);
    robot.currentMoveTicksRemaining = duration;
    return true;
  }

  public static canStepInDirection(robot: ActiveRobot, desiredFacing: number, map: GameMap): boolean {
    const offsets = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 }
    ];
    const offset = offsets[desiredFacing % 4];
    return this.canStep(robot, offset.dx, offset.dy, map);
  }

  public static stepInDirection(robot: ActiveRobot, desiredFacing: number, map: GameMap): boolean {
    // Legacy turn delay if explicitly commanding cardinal turn in-place
    if (robot.facing !== desiredFacing) {
      robot.facing = desiredFacing;
      const cardinalAngles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
      robot.targetFacingAngle = cardinalAngles[desiredFacing % 4];
      robot.currentMoveTicksRemaining = SPECTRUM_CYCLE_TICKS;
      return true;
    }

    const offsets = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 }
    ];
    const offset = offsets[desiredFacing % 4];
    return this.step(robot, offset.dx, offset.dy, map);
  }

  // Smooth direct 8-way navigation towards target (targetX, targetY)
  private static navigateTowards(robot: ActiveRobot, targetX: number, targetY: number, map: GameMap): void {
    const dx = targetX - robot.x;
    const dy = targetY - robot.y;

    if (Math.hypot(dx, dy) < 0.2) return;

    // Direct continuous orientation towards target
    robot.targetFacingAngle = Math.atan2(dx, dy);

    // If robot has Electronics module, use intelligent 8-way A* shortest-path navigation
    if (robot.blueprint.hasElectronics) {
      const path = AStarPathfinder.findPath(
        robot.x,
        robot.y,
        targetX,
        targetY,
        robot.blueprint.chassis,
        map
      );
      if (path.length > 1) {
        const nextCell = path[1];
        const stepDx = nextCell.x - robot.x;
        const stepDy = nextCell.y - robot.y;
        this.step(robot, stepDx, stepDy, map);
        return;
      }
    }

    // Direct 8-way diagonal-first navigation:
    const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

    // 1. Direct diagonal step (no zig-zagging!)
    if (stepX !== 0 && stepY !== 0 && this.canStep(robot, stepX, stepY, map)) {
      this.step(robot, stepX, stepY, map);
      return;
    }

    // 2. Primary axis step (whichever component has greater delta)
    const primaryIsX = Math.abs(dx) >= Math.abs(dy);
    const pX = primaryIsX ? stepX : 0;
    const pY = primaryIsX ? 0 : stepY;
    const sX = primaryIsX ? 0 : stepX;
    const sY = primaryIsX ? stepY : 0;

    if ((pX !== 0 || pY !== 0) && this.canStep(robot, pX, pY, map)) {
      this.step(robot, pX, pY, map);
      return;
    }

    // 3. Secondary axis step
    if ((sX !== 0 || sY !== 0) && this.canStep(robot, sX, sY, map)) {
      this.step(robot, sX, sY, map);
      return;
    }

    // 4. Detour steps around obstacles
    const currentDist = Math.hypot(dx, dy);
    // If already adjacent to target/obstacle boundary (dist <= 2.8), do not step backwards away from target
    if (currentDist <= 2.8) {
      return;
    }

    const detours = [
      { dx: stepX, dy: -stepY },
      { dx: -stepX, dy: stepY },
      { dx: pX !== 0 ? 0 : 1, dy: pY !== 0 ? 0 : 1 },
      { dx: pX !== 0 ? 0 : -1, dy: pY !== 0 ? 0 : -1 },
      { dx: -stepX, dy: 0 },
      { dx: 0, dy: -stepY }
    ];

    for (const d of detours) {
      if ((d.dx !== 0 || d.dy !== 0) && this.canStep(robot, d.dx, d.dy, map)) {
        this.step(robot, d.dx, d.dy, map);
        return;
      }
    }
  }

  private static stepTowards(robot: ActiveRobot, desiredDir: number, map: GameMap): void {
    const offsets = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 }
    ];
    const off = offsets[desiredDir % 4];

    // Primary direction
    if (this.canStep(robot, off.dx, off.dy, map)) {
      this.step(robot, off.dx, off.dy, map);
      return;
    }

    // If blocked, evaluate detours (turn 90 deg clockwise or counter-clockwise)
    const detourA = (desiredDir + 1) % 4;
    const detourB = (desiredDir + 3) % 4;
    const detours = [offsets[detourA], offsets[detourB]];

    for (const d of detours) {
      if (this.canStep(robot, d.dx, d.dy, map)) {
        this.step(robot, d.dx, d.dy, map);
        return;
      }
    }
  }
}
