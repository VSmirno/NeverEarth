import { ActiveRobot } from './Construction.ts';
import { WeaponType } from './types.ts';
import { WEAPON_CONFIG } from './constants.ts';
import { GameMap } from './mapData.ts';

export interface ActiveProjectile {
  id: number;
  firingRobotId: number;
  firingRobotOwner: number;
  type: WeaponType;
  x: number;
  y: number;
  altitude: number;
  facing: number;
  dirX: number;
  dirY: number;
  remainingRange: number;
  isDead: boolean;
}

export class CombatSystem {
  private nextProjId = 1;
  public projectiles: ActiveProjectile[] = [];

  public fireWeapon(
    robot: ActiveRobot,
    weapon: WeaponType,
    targetX?: number,
    targetY?: number,
    offsetPerp: number = 0
  ): ActiveProjectile | null {
    if (weapon === WeaponType.NUCLEAR) return null; // Nuclear detonates in-place

    const config = WEAPON_CONFIG[weapon];
    const bonusRange = robot.blueprint.hasElectronics ? 2 : 0;
    const totalRange = config.range + bonusRange;

    let dirX: number;
    let dirY: number;

    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - robot.x;
      const dy = targetY - robot.y;
      const dist = Math.hypot(dx, dy);
      dirX = dist > 0.001 ? dx / dist : 1;
      dirY = dist > 0.001 ? dy / dist : 0;
    } else {
      const offsets = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 }
      ];
      const off = offsets[robot.facing % 4];
      dirX = off.dx;
      dirY = off.dy;
    }

    // Perpendicular unit vector (-dirY, dirX) for lateral salvo spread
    const perpX = -dirY;
    const perpY = dirX;

    const proj: ActiveProjectile = {
      id: this.nextProjId++,
      firingRobotId: robot.id,
      firingRobotOwner: robot.owner,
      type: weapon,
      x: robot.x + perpX * offsetPerp,
      y: robot.y + perpY * offsetPerp,
      altitude: 10,
      facing: robot.facing,
      dirX,
      dirY,
      remainingRange: totalRange,
      isDead: false
    };

    this.projectiles.push(proj);
    return proj;
  }

  public updateProjectiles(
    robots: ActiveRobot[],
    map: GameMap,
    onHit?: (target: ActiveRobot, damage: number) => void
  ): void {
    const stepSpeed = 1.4;

    for (const proj of this.projectiles) {
      if (proj.isDead) continue;

      proj.x += proj.dirX * stepSpeed;
      proj.y += proj.dirY * stepSpeed;
      proj.remainingRange -= stepSpeed;

      // Check bounds or obstacle blocking
      if (proj.x < 1 || proj.x >= map.length - 2 || proj.y < 1 || proj.y >= map.width - 2 || proj.remainingRange <= 0) {
        proj.isDead = true;
        continue;
      }

      // Check height blocking (boxes h=15 or fences h=99 stop projectiles)
      const obstacleElevation = map.getMaxElevationInFootprint(Math.round(proj.x), Math.round(proj.y));
      if (obstacleElevation >= proj.altitude) {
        proj.isDead = true;
        continue;
      }

      // Check collision with hostile robots
      for (const target of robots) {
        if (target.isDestroyed || target.id === proj.firingRobotId || target.owner === proj.firingRobotOwner) continue;

        const dist = Math.hypot(target.x - proj.x, target.y - proj.y);
        if (dist <= 1.6) {
          // Hit detected! Calculate Z80 damage formula with durability scaling:
          // rawDamage = floor((60 - (robot_height + ground_height)) / 4) * multiplier
          // Scaled so tactical duels between robots last a satisfying 3-4 seconds
          const mult = WEAPON_CONFIG[proj.type].damageMultiplier;
          const baseDamage = Math.max(1, Math.floor((60 - (target.stackHeight + target.altitude)) / 4));
          const rawDamage = Math.max(1, baseDamage * mult);
          const damage = Math.max(1, Math.round(rawDamage / 2.5));

          target.strength -= damage;
          if (target.strength <= 0) {
            target.strength = 0;
            target.isDestroyed = true;
          }

          proj.isDead = true;
          if (onHit) onHit(target, damage);
          break;
        }
      }
    }

    // Clean up dead projectiles
    this.projectiles = this.projectiles.filter((p) => !p.isDead);
  }
}
