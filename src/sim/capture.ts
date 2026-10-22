import { StructureDef } from './mapData.ts';
import { ActiveRobot } from './Construction.ts';
import { CAPTURE_DURATION_TICKS } from './constants.ts';
import { PlayerId, StructureType } from './types.ts';

export interface ActiveCaptureInfo {
  structureId: number;
  structure: StructureDef;
  occupyingTeam: PlayerId;
  progress: number;
  progressRatio: number;
}

export class CaptureSystem {
  public static updateCapture(
    structures: StructureDef[],
    robots: ActiveRobot[],
    onCaptureComplete?: (structure: StructureDef, newOwner: PlayerId) => void,
    onCaptureProgress?: (info: ActiveCaptureInfo) => void
  ): void {
    for (const structure of structures) {
      if (structure.isDestroyed) continue;

      // Warbases have footprint diameter ~6.8 and solid citadel core; capture zone covers the courtyard perimeter (radius 3.8).
      // Factories have single entrance bays; capture zone covers radius 2.2.
      const captureRadius = structure.type === StructureType.WARBASE ? 3.8 : 2.2;

      const occupyingEnemies = robots.filter(
        (r) => !r.isDestroyed && Math.hypot(r.x - structure.x, r.y - structure.y) <= captureRadius && r.owner !== structure.owner
      );
      const friendlyDefenders = robots.filter(
        (r) => !r.isDestroyed && Math.hypot(r.x - structure.x, r.y - structure.y) <= captureRadius && r.owner === structure.owner
      );

      // If contested by defenders, capture progress holds/halts
      if (occupyingEnemies.length > 0 && friendlyDefenders.length === 0) {
        const occupyingRobot = occupyingEnemies[0];
        structure.captureProgress += 3; // Smooth satisfying RTS capture pacing
        const ratio = Math.min(1.0, structure.captureProgress / CAPTURE_DURATION_TICKS);
        if (onCaptureProgress) {
          onCaptureProgress({
            structureId: structure.id,
            structure,
            occupyingTeam: occupyingRobot.owner,
            progress: structure.captureProgress,
            progressRatio: ratio
          });
        }
        if (structure.captureProgress >= CAPTURE_DURATION_TICKS) {
          structure.owner = occupyingRobot.owner;
          structure.captureProgress = 0;
          if (onCaptureComplete) {
            onCaptureComplete(structure, occupyingRobot.owner);
          }
        }
      } else {
        if (structure.captureProgress > 0) {
          structure.captureProgress = Math.max(0, structure.captureProgress - 6);
          const ratio = Math.min(1.0, structure.captureProgress / CAPTURE_DURATION_TICKS);
          if (onCaptureProgress) {
            onCaptureProgress({
              structureId: structure.id,
              structure,
              occupyingTeam: structure.owner,
              progress: structure.captureProgress,
              progressRatio: ratio
            });
          }
        }
      }
    }
  }
}
