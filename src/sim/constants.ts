import { ChassisType, WeaponType, ModuleType } from './types.ts';

// Grid Dimensions
export const MAP_LENGTH = 128; // X axis (planetary sector: 0..127)
export const MAP_WIDTH = 128;  // Y axis (planetary sector: 0..127)
export const CELLS_PER_MILE = 2; // 1 cell = 0.5 miles

// Timing (authoritative 20 Hz tick rate)
export const TICKS_PER_SECOND = 20;
export const SPECTRUM_CYCLE_TICKS = 4; // 1 original game cycle = 4 ticks (200 ms)
export const CAPTURE_DURATION_TICKS = 1440; // 72 real seconds = 12 in-game hours
export const DAY_DURATION_TICKS = 2880; // 144 real seconds = 1 in-game day

// Initial resources
export const INITIAL_GENERAL_RESOURCES = 20;
export const MAX_ROBOTS_PER_PLAYER = 24;

// Piece Heights (used for stacking & damage resistance)
export const PIECE_HEIGHTS: Record<ChassisType | WeaponType | ModuleType, number> = {
  [ChassisType.BIPOD]: 11,
  [ChassisType.TRACKS]: 7,
  [ChassisType.ANTIGRAV]: 8,
  [WeaponType.CANNON]: 6,
  [WeaponType.MISSILES]: 6,
  [WeaponType.PHASERS]: 7,
  [WeaponType.NUCLEAR]: 7,
  [ModuleType.ELECTRONICS]: 7
};

// Component Production Costs
export const PIECE_COSTS: Record<ChassisType | WeaponType | ModuleType, number> = {
  [ChassisType.BIPOD]: 3,
  [ChassisType.TRACKS]: 5,
  [ChassisType.ANTIGRAV]: 10,
  [WeaponType.CANNON]: 2,
  [WeaponType.MISSILES]: 4,
  [WeaponType.PHASERS]: 4,
  [WeaponType.NUCLEAR]: 20,
  [ModuleType.ELECTRONICS]: 3
};

// Weapon Combat Parameters
export const WEAPON_CONFIG = {
  [WeaponType.CANNON]: {
    range: 10, // cells (5 miles)
    damageMultiplier: 2,
    persistence: 40
  },
  [WeaponType.MISSILES]: {
    range: 14, // cells (7 miles)
    damageMultiplier: 3,
    persistence: 60
  },
  [WeaponType.PHASERS]: {
    range: 10, // cells (5 miles)
    damageMultiplier: 4,
    persistence: 40
  },
  [WeaponType.NUCLEAR]: {
    range: 0,
    damageMultiplier: 999,
    persistence: 0
  }
};

// Chassis Movement Speeds (ticks per cell)
export const CHASSIS_SPEEDS = {
  [ChassisType.BIPOD]: {
    normal: 24,
    rough: 32,
    mountain: Infinity, // blocked
    ditch: Infinity     // blocked
  },
  [ChassisType.TRACKS]: {
    normal: 16,
    rough: 24,
    mountain: 28,
    ditch: Infinity     // blocked
  },
  [ChassisType.ANTIGRAV]: {
    normal: 12,
    rough: 12,
    mountain: 16,
    ditch: 12
  }
};

// Commander parameters
export const COMMANDER_MIN_ALTITUDE = 0;
export const COMMANDER_MAX_ALTITUDE = 48;
export const COMMANDER_WARBASE_DOCK_ALTITUDE = 15;
export const COMMANDER_AUTO_LIFT_STEP = 2;
export const COMMANDER_AUTO_LIFT_UPDATES = 5;

// Scenery & Structure elevations
export const ELEVATION_FENCE = 99;
export const ELEVATION_WALL_HIGH = 15;
export const ELEVATION_WALL_LOW = 7;
export const ELEVATION_MOUNTAIN = 6;
export const ELEVATION_ROUGH = 3;
export const ELEVATION_NORMAL = 0;
export const ELEVATION_PROJECTILE = 10;
