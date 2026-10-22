import { GameMap } from './mapData.ts';
import { ChassisType } from './types.ts';
import { RobotMovementSystem } from './RobotMovement.ts';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

export class AStarPathfinder {
  public static findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    chassis: ChassisType,
    map: GameMap,
    maxSearchNodes: number = 300
  ): { x: number; y: number }[] {
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: Math.hypot(targetX - startX, targetY - startY),
      f: Math.hypot(targetX - startX, targetY - startY)
    };
    openSet.push(startNode);

    let searched = 0;
    let closestNode: PathNode = startNode;

    while (openSet.length > 0 && searched < maxSearchNodes) {
      searched++;

      // Pop node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIdx].f) {
          lowestIdx = i;
        }
      }
      const current = openSet.splice(lowestIdx, 1)[0];

      // Track closest node in case exact target is unreachable
      if (current.h < closestNode.h) {
        closestNode = current;
      }

      // Target reached
      if (Math.abs(current.x - targetX) <= 1 && Math.abs(current.y - targetY) <= 1) {
        return this.reconstructPath(current);
      }

      const key = `${current.x},${current.y}`;
      closedSet.add(key);

      const neighbors = [
        // 4 Cardinals
        { x: current.x + 1, y: current.y, costMult: 1.0, isDiag: false, c1: null, c2: null },
        { x: current.x - 1, y: current.y, costMult: 1.0, isDiag: false, c1: null, c2: null },
        { x: current.x, y: current.y + 1, costMult: 1.0, isDiag: false, c1: null, c2: null },
        { x: current.x, y: current.y - 1, costMult: 1.0, isDiag: false, c1: null, c2: null },
        // 4 Diagonals (with obstacle corner clearance)
        { x: current.x + 1, y: current.y + 1, costMult: 1.414, isDiag: true, c1: { x: current.x + 1, y: current.y }, c2: { x: current.x, y: current.y + 1 } },
        { x: current.x + 1, y: current.y - 1, costMult: 1.414, isDiag: true, c1: { x: current.x + 1, y: current.y }, c2: { x: current.x, y: current.y - 1 } },
        { x: current.x - 1, y: current.y + 1, costMult: 1.414, isDiag: true, c1: { x: current.x - 1, y: current.y }, c2: { x: current.x, y: current.y + 1 } },
        { x: current.x - 1, y: current.y - 1, costMult: 1.414, isDiag: true, c1: { x: current.x - 1, y: current.y }, c2: { x: current.x, y: current.y - 1 } }
      ];

      for (const nb of neighbors) {
        if (nb.x < 1 || nb.x >= map.length - 2 || nb.y < 1 || nb.y >= map.width - 2) continue;
        if (closedSet.has(`${nb.x},${nb.y}`)) continue;

        const terrain = map.getTerrainAt(nb.x, nb.y);
        if (!RobotMovementSystem.canEnterTerrain(chassis, terrain)) continue;

        // For diagonal movement, ensure we don't cut through impassable wall/mountain corners
        if (nb.isDiag && nb.c1 && nb.c2) {
          const t1 = map.getTerrainAt(nb.c1.x, nb.c1.y);
          const t2 = map.getTerrainAt(nb.c2.x, nb.c2.y);
          if (!RobotMovementSystem.canEnterTerrain(chassis, t1) && !RobotMovementSystem.canEnterTerrain(chassis, t2)) {
            continue;
          }
        }

        const stepCost = Math.round(RobotMovementSystem.getStepDuration(chassis, terrain) * nb.costMult);
        const gScore = current.g + stepCost;

        let existing = openSet.find((n) => n.x === nb.x && n.y === nb.y);
        if (!existing) {
          const hScore = Math.hypot(targetX - nb.x, targetY - nb.y);
          existing = {
            x: nb.x,
            y: nb.y,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            parent: current
          };
          openSet.push(existing);
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + existing.h;
          existing.parent = current;
        }
      }
    }

    return this.reconstructPath(closestNode);
  }

  private static reconstructPath(endNode: PathNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let curr: PathNode | undefined = endNode;
    while (curr) {
      path.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    return path;
  }
}
