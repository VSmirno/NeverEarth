import { ActiveRobot } from './Construction.ts';
import { GameMap, StructureDef } from './mapData.ts';
import { TerrainType } from './types.ts';

export class NuclearDetonationSystem {
  public static detonate(
    carrier: ActiveRobot,
    robots: ActiveRobot[],
    map: GameMap,
    onBuildingDestroyed?: (structure: StructureDef) => void
  ): { destroyedRobots: ActiveRobot[]; destroyedStructure: StructureDef | null } {
    const destroyedRobots: ActiveRobot[] = [];
    let destroyedStructure: StructureDef | null = null;

    // 1. Destroy all robots inside 9x9 blast window
    for (const r of robots) {
      if (r.isDestroyed) continue;
      const dx = Math.abs(r.x - carrier.x);
      const dy = Math.abs(r.y - carrier.y);
      if (dx <= 4 && dy <= 4) {
        r.strength = 0;
        r.isDestroyed = true;
        destroyedRobots.push(r);
      }
    }

    // 2. Destroy at most 1 building in blast range (Warbases checked first, then Factories)
    const allStructures = [...map.warbases, ...map.factories];
    for (const s of allStructures) {
      if (s.isDestroyed) continue;
      const dx = Math.abs(s.x - carrier.x);
      const dy = Math.abs(s.y - carrier.y);

      // Warbase range: dx < 7, dy < 7, dx + dy < 10
      // Factory range: dx < 5, dy < 5, dx + dy < 7
      const isWarbase = s.id >= 100;
      const inRange = isWarbase
        ? dx < 7 && dy < 7 && dx + dy < 10
        : dx < 5 && dy < 5 && dx + dy < 7;

      if (inRange) {
        s.isDestroyed = true;
        destroyedStructure = s;

        // Turn ground into rough debris
        for (let bx = s.x - 1; bx <= s.x + 2; bx++) {
          for (let by = s.y - 1; by <= s.y + 2; by++) {
            if (bx >= 0 && bx < map.length && by >= 0 && by < map.width) {
              const idx = by * map.length + bx;
              map.terrain[idx] = TerrainType.DEBRIS;
              map.elevation[idx] = 3;
            }
          }
        }

        if (onBuildingDestroyed) onBuildingDestroyed(s);
        break;
      }
    }

    // Carrier is always destroyed
    carrier.isDestroyed = true;
    return { destroyedRobots, destroyedStructure };
  }
}
