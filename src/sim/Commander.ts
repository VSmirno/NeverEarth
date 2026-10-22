import {
  COMMANDER_MIN_ALTITUDE,
  COMMANDER_MAX_ALTITUDE,
  COMMANDER_WARBASE_DOCK_ALTITUDE,
  COMMANDER_AUTO_LIFT_STEP,
  COMMANDER_AUTO_LIFT_UPDATES,
  MAP_LENGTH,
  MAP_WIDTH
} from './constants.ts';
import { GameMap } from './mapData.ts';
import { PlayerId } from './types.ts';
import { ActiveRobot } from './Construction.ts';

export enum CommanderState {
  FLYING = 'flying',
  DOCKED_WARBASE = 'docked_warbase',
  DOCKED_ROBOT = 'docked_robot'
}

export class Commander {
  public x: number;
  public y: number;
  public altitude: number;
  public state: CommanderState = CommanderState.FLYING;
  public owner: PlayerId = PlayerId.HUMAN;

  public autoLiftRemaining: number = 0;
  public dockedEntityId: number | null = null;

  constructor(startX: number, startY: number, startAltitude: number = 6) {
    this.x = startX;
    this.y = startY;
    this.altitude = startAltitude;
  }

  public updateMovement(
    dx: number,
    dy: number,
    rise: boolean,
    descend: boolean,
    map: GameMap,
    robots?: ActiveRobot[]
  ): void {
    if (this.state === CommanderState.DOCKED_WARBASE) {
      // Input while in construction screen is handled by the UI
      return;
    }

    if (this.state === CommanderState.DOCKED_ROBOT) {
      // In direct robot control mode: pressing rise (Space/E) undocks
      if (rise) {
        this.exitRobot();
      }
      return;
    }

    // Horizontal 2x2 body movement with boundary clamping
    const nextX = Math.max(1, Math.min(MAP_LENGTH - 2, this.x + dx));
    const nextY = Math.max(1, Math.min(MAP_WIDTH - 2, this.y + dy));

    this.x = nextX;
    this.y = nextY;

    // Check minimum terrain height under the 2x2 body
    const minClearance = map.getMaxElevationInFootprint(this.x, this.y);

    // Auto-lift processing (after exiting base or undocking)
    if (this.autoLiftRemaining > 0) {
      this.altitude = Math.min(COMMANDER_MAX_ALTITUDE, this.altitude + COMMANDER_AUTO_LIFT_STEP);
      this.autoLiftRemaining--;
      return;
    }

    // Vertical flight dynamics
    if (rise) {
      this.altitude = Math.min(COMMANDER_MAX_ALTITUDE, this.altitude + 2);
    } else if (descend) {
      this.altitude = Math.max(Math.max(COMMANDER_MIN_ALTITUDE, minClearance), this.altitude - 2);
    } else {
      // Mild natural hover stabilization
      if (this.altitude < minClearance) {
        this.altitude = minClearance;
      }
    }

    // Check Warbase Helipad Landing ("H" pad at altitude 15)
    this.checkWarbaseLanding(map);

    // Check Landing on Friendly Robot for Direct Control
    if (descend && robots) {
      this.checkRobotLanding(robots);
    }
  }

  private checkWarbaseLanding(map: GameMap): void {
    if (this.state !== CommanderState.FLYING) return;

    for (const base of map.warbases) {
      if (base.isDestroyed || base.owner !== this.owner) continue;

      // Distance to warbase anchor
      const dist = Math.hypot(this.x - base.x, this.y - base.y);
      if (dist < 2.0 && Math.abs(this.altitude - COMMANDER_WARBASE_DOCK_ALTITUDE) <= 2) {
        this.state = CommanderState.DOCKED_WARBASE;
        this.dockedEntityId = base.id;
        break;
      }
    }
  }

  private checkRobotLanding(robots: ActiveRobot[]): void {
    if (this.state !== CommanderState.FLYING) return;

    for (const robot of robots) {
      if (robot.isDestroyed || robot.owner !== this.owner) continue;

      const dist = Math.hypot(this.x - robot.x, this.y - robot.y);
      // Robot top altitude clearance
      const robotAlt = Math.max(1, robot.altitude + 2);
      if (dist < 2.0 && Math.abs(this.altitude - robotAlt) <= 3) {
        this.state = CommanderState.DOCKED_ROBOT;
        this.dockedEntityId = robot.id;
        this.altitude = robotAlt;
        break;
      }
    }
  }

  public exitRobot(): void {
    this.state = CommanderState.FLYING;
    this.dockedEntityId = null;
    this.autoLiftRemaining = COMMANDER_AUTO_LIFT_UPDATES;
  }

  public exitWarbase(): void {
    this.state = CommanderState.FLYING;
    this.dockedEntityId = null;
    this.autoLiftRemaining = COMMANDER_AUTO_LIFT_UPDATES;
  }
}
