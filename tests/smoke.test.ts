import { describe, it, expect } from 'vitest';
import {
  MAP_LENGTH,
  MAP_WIDTH,
  PIECE_COSTS,
  PIECE_HEIGHTS,
  WEAPON_CONFIG
} from '../src/sim/constants.ts';
import { ChassisType, WeaponType, ModuleType } from '../src/sim/types.ts';

describe('Nether Earth Constants & Formulas', () => {
  it('has open planetary map dimensions 128x128', () => {
    expect(MAP_LENGTH).toBe(128);
    expect(MAP_WIDTH).toBe(128);
  });

  it('has exact piece costs from disassembly', () => {
    expect(PIECE_COSTS[ChassisType.BIPOD]).toBe(3);
    expect(PIECE_COSTS[ChassisType.TRACKS]).toBe(5);
    expect(PIECE_COSTS[ChassisType.ANTIGRAV]).toBe(10);
    expect(PIECE_COSTS[WeaponType.CANNON]).toBe(2);
    expect(PIECE_COSTS[WeaponType.MISSILES]).toBe(4);
    expect(PIECE_COSTS[WeaponType.PHASERS]).toBe(4);
    expect(PIECE_COSTS[WeaponType.NUCLEAR]).toBe(20);
    expect(PIECE_COSTS[ModuleType.ELECTRONICS]).toBe(3);
  });

  it('calculates robot stack height correctly', () => {
    // Tallest robot: Bipod + Missiles + Phasers + Nuke + Electronics = 11 + 6 + 7 + 7 + 7 = 38
    const maxStack =
      PIECE_HEIGHTS[ChassisType.BIPOD] +
      PIECE_HEIGHTS[WeaponType.MISSILES] +
      PIECE_HEIGHTS[WeaponType.PHASERS] +
      PIECE_HEIGHTS[WeaponType.NUCLEAR] +
      PIECE_HEIGHTS[ModuleType.ELECTRONICS];
    expect(maxStack).toBe(38);

    // Weakest robot: Tracks + Cannon = 7 + 6 = 13
    const minStack =
      PIECE_HEIGHTS[ChassisType.TRACKS] + PIECE_HEIGHTS[WeaponType.CANNON];
    expect(minStack).toBe(13);
  });

  it('calculates damage according to Z80 formula', () => {
    // Formula: floor((60 - (robot_height + ground_height)) / 4) * multiplier
    // Weakest robot (height 13) at ground level (ground 0) hit by phaser (mult 4):
    // floor((60 - 13) / 4) * 4 = floor(47 / 4) * 4 = 11 * 4 = 44 damage
    const robotHeight = 13;
    const groundHeight = 0;
    const baseDamage = Math.floor((60 - (robotHeight + groundHeight)) / 4);
    const phaserDamage = baseDamage * WEAPON_CONFIG[WeaponType.PHASERS].damageMultiplier;
    expect(phaserDamage).toBe(44);

    // Standing on mountain (+6): floor((60 - 19) / 4) * 4 = floor(41 / 4) * 4 = 10 * 4 = 40 damage
    const mountainDamage = Math.floor((60 - (robotHeight + 6)) / 4) * WEAPON_CONFIG[WeaponType.PHASERS].damageMultiplier;
    expect(mountainDamage).toBe(40);
  });
});
