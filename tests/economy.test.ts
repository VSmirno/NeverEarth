import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyManager } from '../src/sim/economy.ts';
import { GameMap } from '../src/sim/mapData.ts';
import { PlayerId, WeaponType } from '../src/sim/types.ts';
import { INITIAL_GENERAL_RESOURCES, PIECE_COSTS } from '../src/sim/constants.ts';

describe('Economy and Map System', () => {
  let economy: EconomyManager;
  let gameMap: GameMap;

  beforeEach(() => {
    economy = new EconomyManager();
    gameMap = new GameMap();
  });

  it('initializes with 4 warbases and 24 factories', () => {
    expect(gameMap.warbases.length).toBe(4);
    expect(gameMap.factories.length).toBe(24);
    expect(gameMap.warbases[0].owner).toBe(PlayerId.HUMAN);
    expect(gameMap.warbases[3].owner).toBe(PlayerId.INSIGNIAN);
  });

  it('starts players with 20 general resources', () => {
    const humanPool = economy.getResources(PlayerId.HUMAN);
    expect(humanPool.general).toBe(INITIAL_GENERAL_RESOURCES);
    expect(humanPool.chassis).toBe(0);
    expect(humanPool.cannons).toBe(0);
  });

  it('allows buying pieces using general resources as fallback', () => {
    // Cannon costs 2
    expect(economy.canAffordPiece(PlayerId.HUMAN, WeaponType.CANNON)).toBe(true);
    const bought = economy.purchasePiece(PlayerId.HUMAN, WeaponType.CANNON);
    expect(bought).toBe(true);

    const pool = economy.getResources(PlayerId.HUMAN);
    expect(pool.cannons).toBe(0);
    expect(pool.general).toBe(INITIAL_GENERAL_RESOURCES - PIECE_COSTS[WeaponType.CANNON]);
  });

  it('uses specific pool first before general resources', () => {
    const pool = economy.getResources(PlayerId.HUMAN);
    pool.missiles = 3; // Missile costs 4; 3 from specific, 1 from general
    pool.general = 10;

    const bought = economy.purchasePiece(PlayerId.HUMAN, WeaponType.MISSILES);
    expect(bought).toBe(true);
    expect(pool.missiles).toBe(0);
    expect(pool.general).toBe(9);
  });

  it('applies daily production correctly', () => {
    // Set 1 factory of phasers to Human
    gameMap.factories[4].owner = PlayerId.HUMAN; // factory 5 is phasers

    economy.applyDailyProduction(gameMap.warbases, gameMap.factories);
    const pool = economy.getResources(PlayerId.HUMAN);

    // 1 base gives +5 general, 1 factory gives +2 phasers
    expect(pool.general).toBe(INITIAL_GENERAL_RESOURCES + 5);
    expect(pool.phasers).toBe(2);
  });
});
