import { StructureType, PlayerId, TerrainType } from './types.ts';
import { MAP_LENGTH, MAP_WIDTH } from './constants.ts';

export interface StructureDef {
  id: number;
  type: StructureType;
  x: number;
  y: number;
  owner: PlayerId;
  captureProgress: number; // 0..1440 ticks
  captureTimer: number;
  isDestroyed: boolean;
}

export interface SceneryDef {
  type: TerrainType;
  x: number;
  y: number;
  elevation: number;
}

// 4 Warbases in 128x128 planetary sector
export const WARBASES_INITIAL: StructureDef[] = [
  { id: 100, type: StructureType.WARBASE, x: 18, y: 110, owner: PlayerId.HUMAN, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 101, type: StructureType.WARBASE, x: 24, y: 24, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 102, type: StructureType.WARBASE, x: 104, y: 104, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 103, type: StructureType.WARBASE, x: 110, y: 18, owner: PlayerId.INSIGNIAN, captureProgress: 0, captureTimer: 0, isDestroyed: false }
];

// 24 Factories strategically placed across 4 planetary quadrants
export const FACTORIES_INITIAL: StructureDef[] = [
  // Quadrant 1 (Southwest - Alliance Sector)
  { id: 1, type: StructureType.FACTORY_MISSILES, x: 28, y: 92, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 2, type: StructureType.FACTORY_CHASSIS, x: 38, y: 108, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 3, type: StructureType.FACTORY_ELECTRONICS, x: 22, y: 64, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 4, type: StructureType.FACTORY_CANNONS, x: 52, y: 112, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 5, type: StructureType.FACTORY_PHASERS, x: 48, y: 84, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 6, type: StructureType.FACTORY_NUCLEAR, x: 34, y: 74, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },

  // Quadrant 2 (Northwest - Outpost Alpha Sector)
  { id: 7, type: StructureType.FACTORY_CHASSIS, x: 18, y: 38, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 8, type: StructureType.FACTORY_ELECTRONICS, x: 36, y: 18, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 9, type: StructureType.FACTORY_PHASERS, x: 46, y: 32, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 10, type: StructureType.FACTORY_MISSILES, x: 24, y: 48, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 11, type: StructureType.FACTORY_CANNONS, x: 48, y: 46, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 12, type: StructureType.FACTORY_NUCLEAR, x: 34, y: 34, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },

  // Quadrant 3 (Central & Southeast - Outpost Beta Sector)
  { id: 13, type: StructureType.FACTORY_PHASERS, x: 64, y: 64, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 14, type: StructureType.FACTORY_ELECTRONICS, x: 76, y: 74, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 15, type: StructureType.FACTORY_NUCLEAR, x: 64, y: 48, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 16, type: StructureType.FACTORY_MISSILES, x: 78, y: 56, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 17, type: StructureType.FACTORY_CHASSIS, x: 94, y: 70, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 18, type: StructureType.FACTORY_PHASERS, x: 72, y: 96, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 19, type: StructureType.FACTORY_CANNONS, x: 88, y: 106, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 20, type: StructureType.FACTORY_ELECTRONICS, x: 108, y: 92, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },

  // Quadrant 4 (Northeast - Insignian Imperial Sector)
  { id: 21, type: StructureType.FACTORY_NUCLEAR, x: 96, y: 32, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 22, type: StructureType.FACTORY_MISSILES, x: 84, y: 18, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 23, type: StructureType.FACTORY_CANNONS, x: 108, y: 36, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false },
  { id: 24, type: StructureType.FACTORY_CHASSIS, x: 98, y: 46, owner: PlayerId.NEUTRAL, captureProgress: 0, captureTimer: 0, isDestroyed: false }
];

export class GameMap {
  public length: number = MAP_LENGTH;
  public width: number = MAP_WIDTH;
  public terrain: Uint8Array;
  public elevation: Uint8Array;
  public warbases: StructureDef[];
  public factories: StructureDef[];

  constructor() {
    this.terrain = new Uint8Array(MAP_LENGTH * MAP_WIDTH);
    this.elevation = new Uint8Array(MAP_LENGTH * MAP_WIDTH);
    this.warbases = JSON.parse(JSON.stringify(WARBASES_INITIAL));
    this.factories = JSON.parse(JSON.stringify(FACTORIES_INITIAL));
    this.initTerrain();
  }

  private initTerrain(): void {
    // 1. Base terrain height & planetary features (craters, canyons, mesas)
    const craters = [
      { cx: 38, cy: 38, r: 10 },
      { cx: 90, cy: 90, r: 12 },
      { cx: 64, cy: 96, r: 9 },
      { cx: 94, cy: 36, r: 11 },
      { cx: 36, cy: 90, r: 8 }
    ];

    for (let x = 0; x < MAP_LENGTH; x++) {
      for (let y = 0; y < MAP_WIDTH; y++) {
        const idx = y * MAP_LENGTH + x;

        // Perimeter mountain cliffs at outer borders
        if (x <= 1 || x >= MAP_LENGTH - 2 || y <= 1 || y >= MAP_WIDTH - 2) {
          this.terrain[idx] = TerrainType.FENCE;
          this.elevation[idx] = 99;
          continue;
        }

        // Check if inside/near an impact crater
        let craterFactor = 0;
        for (const c of craters) {
          const dist = Math.hypot(x - c.cx, y - c.cy);
          if (Math.abs(dist - c.r) <= 1.5) {
            // Crater elevated rim
            craterFactor = 2; // Mountain rim
            break;
          } else if (dist < c.r) {
            // Sunken rough floor
            craterFactor = 1;
          }
        }

        if (craterFactor === 2) {
          this.terrain[idx] = TerrainType.MOUNTAIN;
          this.elevation[idx] = 6;
          continue;
        } else if (craterFactor === 1) {
          this.terrain[idx] = TerrainType.ROUGH;
          this.elevation[idx] = 2;
          continue;
        }

        // Natural planetary rock mesas using low-frequency harmonics
        const n1 = Math.sin(x * 0.08) * Math.cos(y * 0.08);
        const n2 = Math.cos(x * 0.16 + 1.2) * Math.sin(y * 0.16 + 0.8);
        const elevationScore = n1 * 0.65 + n2 * 0.35;

        if (elevationScore > 0.48) {
          this.terrain[idx] = TerrainType.MOUNTAIN;
          this.elevation[idx] = 6;
        } else if (elevationScore > 0.28) {
          this.terrain[idx] = TerrainType.ROUGH;
          this.elevation[idx] = 3;
        } else {
          this.terrain[idx] = TerrainType.NORMAL;
          this.elevation[idx] = 0;
        }
      }
    }

    // 2. Guaranteed Arterial Highway Network (ensuring 100% accessible routes between all bases and factories)
    const centralHub = { x: 64, y: 64 };

    // Primary diagonal & cross-sector highways connecting Warbases to Central Transit Hub
    this.carveRoad(18, 110, centralHub.x, centralHub.y, 4);
    this.carveRoad(110, 18, centralHub.x, centralHub.y, 4);
    this.carveRoad(24, 24, centralHub.x, centralHub.y, 4);
    this.carveRoad(104, 104, centralHub.x, centralHub.y, 4);

    // Perimeter arterial highways
    this.carveRoad(18, 110, 24, 24, 4);   // West arterial
    this.carveRoad(24, 24, 110, 18, 4);   // North arterial
    this.carveRoad(110, 18, 104, 104, 4); // East arterial
    this.carveRoad(104, 104, 18, 110, 4); // South arterial

    // Dedicated approach roads for every factory entrance bay
    for (const f of FACTORIES_INITIAL) {
      const entryX = f.x;
      const entryY = f.y + 1;

      // Find nearest point along main highway corridors
      let nearestX = centralHub.x;
      let nearestY = centralHub.y;
      let minDist = Math.hypot(entryX - centralHub.x, entryY - centralHub.y);

      const arterialCheckpoints = [
        { x: 18, y: 110 }, { x: 24, y: 24 }, { x: 104, y: 104 }, { x: 110, y: 18 },
        { x: 20, y: 64 }, { x: 64, y: 20 }, { x: 108, y: 64 }, { x: 64, y: 108 },
        { x: 42, y: 88 }, { x: 88, y: 42 }, { x: 42, y: 42 }, { x: 88, y: 88 }
      ];

      for (const cp of arterialCheckpoints) {
        const d = Math.hypot(entryX - cp.x, entryY - cp.y);
        if (d < minDist) {
          minDist = d;
          nearestX = cp.x;
          nearestY = cp.y;
        }
      }

      this.carveRoad(entryX, entryY, nearestX, nearestY, 3);
    }

    // 3. Clear spacious maneuver aprons around all structures (radius 3)
    const allStructures = [...WARBASES_INITIAL, ...FACTORIES_INITIAL];
    for (const s of allStructures) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const sx = s.x + dx;
          const sy = s.y + dy;
          if (sx >= 1 && sx < MAP_LENGTH - 1 && sy >= 1 && sy < MAP_WIDTH - 1) {
            const idx = sy * MAP_LENGTH + sx;
            this.terrain[idx] = TerrainType.NORMAL;
            this.elevation[idx] = 0;
          }
        }
      }
    }

    // 4. Mark solid back & side bunker walls as impassable WALL_HIGH, but preserve open entrance bay at ground level!
    for (const f of FACTORIES_INITIAL) {
      // Solid back wall of the factory
      const idx = f.y * MAP_LENGTH + f.x;
      this.terrain[idx] = TerrainType.WALL_HIGH;
      this.elevation[idx] = 15;

      // Hangar entrance bay at (f.x, f.y + 1) is guaranteed ground level NORMAL floor
      const entryIdx = (f.y + 1) * MAP_LENGTH + f.x;
      this.terrain[entryIdx] = TerrainType.NORMAL;
      this.elevation[entryIdx] = 0;
    }

    // Warbase core is solid bunker WALL_HIGH
    for (const b of WARBASES_INITIAL) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const bx = b.x + dx;
          const by = b.y + dy;
          if (bx >= 1 && bx < MAP_LENGTH - 1 && by >= 1 && by < MAP_WIDTH - 1) {
            const idx = by * MAP_LENGTH + bx;
            this.terrain[idx] = TerrainType.WALL_HIGH;
            this.elevation[idx] = 15;
          }
        }
      }

      // Warbase deployment exit pad is guaranteed ground level NORMAL
      const exitX = b.owner === PlayerId.HUMAN ? b.x + 3 : b.x - 3;
      const exitY = b.owner === PlayerId.HUMAN ? b.y - 3 : b.y + 3;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const px = exitX + dx;
          const py = exitY + dy;
          if (px >= 1 && px < MAP_LENGTH - 1 && py >= 1 && py < MAP_WIDTH - 1) {
            const pIdx = py * MAP_LENGTH + px;
            this.terrain[pIdx] = TerrainType.NORMAL;
            this.elevation[pIdx] = 0;
          }
        }
      }
    }
  }

  // Carves a smooth, flat passable corridor between two coordinates
  private carveRoad(x1: number, y1: number, x2: number, y2: number, roadWidth: number = 3): void {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / (steps || 1);
      const cx = Math.round(x1 + (x2 - x1) * t);
      const cy = Math.round(y1 + (y2 - y1) * t);
      const halfW = Math.floor(roadWidth / 2);
      for (let dx = -halfW; dx <= halfW; dx++) {
        for (let dy = -halfW; dy <= halfW; dy++) {
          const rx = cx + dx;
          const ry = cy + dy;
          if (rx >= 2 && rx < MAP_LENGTH - 2 && ry >= 2 && ry < MAP_WIDTH - 2) {
            const idx = ry * MAP_LENGTH + rx;
            this.terrain[idx] = TerrainType.NORMAL;
            this.elevation[idx] = 0;
          }
        }
      }
    }
  }

  public getTerrainAt(x: number, y: number): TerrainType {
    if (x < 0 || x >= MAP_LENGTH || y < 0 || y >= MAP_WIDTH) {
      return TerrainType.FENCE;
    }
    return this.terrain[y * MAP_LENGTH + x];
  }

  public getElevationAt(x: number, y: number): number {
    if (x < 0 || x >= MAP_LENGTH || y < 0 || y >= MAP_WIDTH) {
      return 99;
    }
    return this.elevation[y * MAP_LENGTH + x];
  }

  // Max elevation under a 2x2 unit footprint for ground terrain
  public getMaxElevationInFootprint(anchorX: number, anchorY: number): number {
    let maxElev = 0;
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = -1; dy <= 0; dy++) {
        const t = this.getTerrainAt(anchorX + dx, anchorY + dy);
        // Exclude impassable structural walls and building cores so ground robots never jump on roofs!
        if (t === TerrainType.WALL_HIGH || t === TerrainType.FENCE) {
          continue;
        }
        const h = this.getElevationAt(anchorX + dx, anchorY + dy);
        if (h > maxElev) maxElev = h;
      }
    }
    return maxElev;
  }
}
