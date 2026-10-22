import { describe, it, expect, beforeEach } from 'vitest';
import { ConstructionValidator } from '../src/sim/Construction.ts';
import { EconomyManager } from '../src/sim/economy.ts';
import { ChassisType, WeaponType, PlayerId } from '../src/sim/types.ts';

describe('Construction Validator & Stacking', () => {
  let economy: EconomyManager;

  beforeEach(() => {
    economy = new EconomyManager();
  });

  it('calculates min and max robot heights correctly', () => {
    const minBlueprint = {
      chassis: ChassisType.TRACKS,
      weapons: [WeaponType.CANNON],
      hasElectronics: false
    };
    expect(ConstructionValidator.calculateStackHeight(minBlueprint)).toBe(13);

    const maxBlueprint = {
      chassis: ChassisType.BIPOD,
      weapons: [WeaponType.MISSILES, WeaponType.PHASERS, WeaponType.NUCLEAR],
      hasElectronics: true
    };
    expect(ConstructionValidator.calculateStackHeight(maxBlueprint)).toBe(38);
  });

  it('rejects blueprints without chassis or weapons', () => {
    expect(ConstructionValidator.isValidBlueprint({ weapons: [WeaponType.CANNON] }).valid).toBe(false);
    expect(ConstructionValidator.isValidBlueprint({ chassis: ChassisType.TRACKS, weapons: [] }).valid).toBe(false);
  });

  it('rejects duplicate weapons', () => {
    const dupe = {
      chassis: ChassisType.TRACKS,
      weapons: [WeaponType.CANNON, WeaponType.CANNON],
      hasElectronics: false
    };
    expect(ConstructionValidator.isValidBlueprint(dupe).valid).toBe(false);
  });

  it('allows building when general resources cover the cost', () => {
    const blueprint = {
      chassis: ChassisType.TRACKS, // 5
      weapons: [WeaponType.CANNON], // 2 -> total 7 <= 20 initial general
      hasElectronics: false
    };
    const res = ConstructionValidator.canBuild(PlayerId.HUMAN, blueprint, economy, 0);
    expect(res.canBuild).toBe(true);
  });

  it('rejects building when player cannot afford total cost', () => {
    const expensiveBlueprint = {
      chassis: ChassisType.ANTIGRAV, // 10
      weapons: [WeaponType.NUCLEAR, WeaponType.PHASERS], // 20 + 4 = 24 -> total 34 > 20
      hasElectronics: true // 3 -> total 37
    };
    const res = ConstructionValidator.canBuild(PlayerId.HUMAN, expensiveBlueprint, economy, 0);
    expect(res.canBuild).toBe(false);
  });
});
