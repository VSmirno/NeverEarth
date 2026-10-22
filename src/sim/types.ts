export enum PlayerId {
  HUMAN = 0,
  INSIGNIAN = 1,
  NEUTRAL = 2
}

export enum TerrainType {
  NORMAL = 0,    // Grass/dirt, height 0
  ROUGH = 1,     // Broken ground/rocks, height 2..3
  MOUNTAIN = 2,  // Steep elevations, height 6 (defensive bonus)
  DITCH = 3,     // Ravine / trenches, height 0
  FENCE = 4,     // End-of-map border fences, height 99 (impassable)
  WALL_LOW = 5,  // Low obstacles, height 7
  WALL_HIGH = 6, // High obstacles, height 15
  DEBRIS = 7     // Destroyed buildings / wreckage, height 3
}

export enum ChassisType {
  BIPOD = 'bipod',
  TRACKS = 'tracks',
  ANTIGRAV = 'antigrav'
}

export enum WeaponType {
  CANNON = 'cannon',
  MISSILES = 'missiles',
  PHASERS = 'phasers',
  NUCLEAR = 'nuclear'
}

export enum ModuleType {
  ELECTRONICS = 'electronics'
}

export enum OrderType {
  STOP_AND_DEFEND = 0,
  ADVANCE = 1,
  RETREAT = 2,
  SEARCH_AND_CAPTURE = 3,
  SEARCH_AND_DESTROY = 4
}

export enum StructureType {
  WARBASE = 'warbase',
  FACTORY_CHASSIS = 'factory_chassis',
  FACTORY_CANNONS = 'factory_cannons',
  FACTORY_MISSILES = 'factory_missiles',
  FACTORY_PHASERS = 'factory_phasers',
  FACTORY_NUCLEAR = 'factory_nuclear',
  FACTORY_ELECTRONICS = 'factory_electronics'
}

export interface ResourcePool {
  general: number;
  chassis: number;
  cannons: number;
  missiles: number;
  phasers: number;
  nuclear: number;
  electronics: number;
}

export interface RobotBlueprint {
  chassis: ChassisType;
  weapons: WeaponType[]; // 1 to 3 weapons
  hasElectronics: boolean;
}

export interface Vector2D {
  x: number;
  y: number;
}

export enum GameMode {
  HUMAN_VS_AI = 'human_vs_ai',
  AI_VS_AI = 'ai_vs_ai'
}
