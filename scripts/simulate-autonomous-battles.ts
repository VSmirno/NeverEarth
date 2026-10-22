import { GameMap } from '../src/sim/mapData.ts';
import { EconomyManager } from '../src/sim/economy.ts';
import { CombatSystem } from '../src/sim/combat.ts';
import { RobotMovementSystem } from '../src/sim/RobotMovement.ts';
import { CaptureSystem } from '../src/sim/capture.ts';
import { NuclearDetonationSystem } from '../src/sim/nuclear.ts';
import { BaseAIGeneral } from '../src/sim/enemyAI.ts';
import { ActiveRobot } from '../src/sim/Construction.ts';
import { PlayerId, WeaponType, StructureType } from '../src/sim/types.ts';
import { WEAPON_CONFIG } from '../src/sim/constants.ts';
import * as fs from 'fs';
import * as path from 'path';

interface RoundResult {
  round: number;
  winner: 'ALLIANCE' | 'INSIGNIA' | 'DRAW';
  victoryCondition: string;
  durationTicks: number;
  durationMinutes: number;
  alliance: {
    robotsBuilt: number;
    robotsLost: number;
    factoriesCaptured: number;
    warbasesOwned: number;
    damageDealt: number;
    kills: number;
    nuclearLaunched: number;
    chassisBreakdown: Record<string, number>;
    weaponsBreakdown: Record<string, number>;
  };
  insignia: {
    robotsBuilt: number;
    robotsLost: number;
    factoriesCaptured: number;
    warbasesOwned: number;
    damageDealt: number;
    kills: number;
    nuclearLaunched: number;
    chassisBreakdown: Record<string, number>;
    weaponsBreakdown: Record<string, number>;
  };
  highlights: string[];
}

function runSingleRound(roundNumber: number, maxTicks: number = 18000): RoundResult {
  const map = new GameMap();
  const economy = new EconomyManager();
  const combat = new CombatSystem();
  let robots: ActiveRobot[] = [];

  const allianceAI = new BaseAIGeneral(PlayerId.HUMAN, 240);
  const insigniaAI = new BaseAIGeneral(PlayerId.INSIGNIAN, 220);

  const stats = {
    round: roundNumber,
    winner: 'DRAW' as 'ALLIANCE' | 'INSIGNIA' | 'DRAW',
    victoryCondition: 'TIMEOUT',
    durationTicks: 0,
    durationMinutes: 0,
    alliance: {
      robotsBuilt: 0,
      robotsLost: 0,
      factoriesCaptured: 0,
      warbasesOwned: 1,
      damageDealt: 0,
      kills: 0,
      nuclearLaunched: 0,
      chassisBreakdown: {} as Record<string, number>,
      weaponsBreakdown: {} as Record<string, number>
    },
    insignia: {
      robotsBuilt: 0,
      robotsLost: 0,
      factoriesCaptured: 0,
      warbasesOwned: 1,
      damageDealt: 0,
      kills: 0,
      nuclearLaunched: 0,
      chassisBreakdown: {} as Record<string, number>,
      weaponsBreakdown: {} as Record<string, number>
    },
    highlights: [] as string[]
  };

  const delta = 1 / 20; // 20 Hz simulation tick

  for (let tick = 1; tick <= maxTicks; tick++) {
    stats.durationTicks = tick;

    // 1. Economy daily update (every 2880 ticks = 1 in-game day)
    economy.update(1, map.warbases, map.factories);

    // 2. AI General updates
    allianceAI.update(map, economy, robots, (r) => {
      robots.push(r);
      stats.alliance.robotsBuilt++;
      stats.alliance.chassisBreakdown[r.blueprint.chassis] = (stats.alliance.chassisBreakdown[r.blueprint.chassis] || 0) + 1;
      for (const w of r.blueprint.weapons) {
        stats.alliance.weaponsBreakdown[w] = (stats.alliance.weaponsBreakdown[w] || 0) + 1;
        if (w === WeaponType.NUCLEAR) {
          stats.alliance.nuclearLaunched++;
          stats.highlights.push(`[${Math.round(tick/20)}с] Альянс запустил ядерный заряд на дроне #${r.id}!`);
        }
      }
    });

    insigniaAI.update(map, economy, robots, (r) => {
      robots.push(r);
      stats.insignia.robotsBuilt++;
      stats.insignia.chassisBreakdown[r.blueprint.chassis] = (stats.insignia.chassisBreakdown[r.blueprint.chassis] || 0) + 1;
      for (const w of r.blueprint.weapons) {
        stats.insignia.weaponsBreakdown[w] = (stats.insignia.weaponsBreakdown[w] || 0) + 1;
        if (w === WeaponType.NUCLEAR) {
          stats.insignia.nuclearLaunched++;
          stats.highlights.push(`[${Math.round(tick/20)}с] Инсигния запустила ядерный удар на дроне #${r.id}!`);
        }
      }
    });

    // 3. Robots movement
    for (const r of robots) {
      if (r.isDestroyed) continue;
      RobotMovementSystem.updateRobot(r, map, robots);
    }

    // 4. Robot Autonomous Combat (Full Salvo firing)
    for (const r of robots) {
      if (r.isDestroyed) continue;

      if (r.weaponCooldown !== undefined && r.weaponCooldown > 0) {
        r.weaponCooldown -= delta;
        continue;
      }

      // Nuclear detonation
      if (r.blueprint.weapons.includes(WeaponType.NUCLEAR)) {
        const nearStructure = [...map.warbases, ...map.factories].some(
          (s) => !s.isDestroyed && s.owner !== r.owner && Math.abs(s.x - r.x) <= 3 && Math.abs(s.y - r.y) <= 3
        );
        if (nearStructure) {
          const { destroyedStructure } = NuclearDetonationSystem.detonate(r, robots, map);
          if (destroyedStructure) {
            stats.highlights.push(`[${Math.round(tick/20)}с] Ядерная детонация уничтожила объект #${destroyedStructure.id} (${destroyedStructure.type})!`);
          }
          continue;
        }
      }

      const nonNuclear = r.blueprint.weapons.filter((w) => w !== WeaponType.NUCLEAR);
      if (nonNuclear.length === 0) continue;

      const bonusRange = r.blueprint.hasElectronics ? 2 : 0;
      let maxRange = 0;
      for (const w of nonNuclear) {
        const cfg = WEAPON_CONFIG[w];
        if (cfg && cfg.range + bonusRange > maxRange) maxRange = cfg.range + bonusRange;
      }

      let target: ActiveRobot | null = null;
      let minDist = Infinity;
      for (const other of robots) {
        if (other.isDestroyed || other.owner === r.owner) continue;
        const d = Math.hypot(other.x - r.x, other.y - r.y);
        if (d <= maxRange && d < minDist) {
          minDist = d;
          target = other;
        }
      }

      if (target) {
        const weaponsToFire = nonNuclear.filter((w) => {
          const cfg = WEAPON_CONFIG[w];
          return cfg && (cfg.range + bonusRange) >= minDist;
        });

        if (weaponsToFire.length > 0) {
          const count = weaponsToFire.length;
          let hasMissiles = false;
          weaponsToFire.forEach((w, idx) => {
            let offsetPerp = 0;
            if (count === 2) offsetPerp = idx === 0 ? -0.28 : 0.28;
            else if (count >= 3) offsetPerp = idx === 0 ? -0.38 : idx === 1 ? 0 : 0.38;

            combat.fireWeapon(r, w, target!.x, target!.y, offsetPerp);
            if (w === WeaponType.MISSILES) hasMissiles = true;
          });
          r.weaponCooldown = hasMissiles ? 0.65 : 0.55;
        }
      }
    }

    // 5. Update projectiles & hits
    combat.updateProjectiles(robots, map, (target, damage) => {
      const shooterOwner = target.owner === PlayerId.HUMAN ? PlayerId.INSIGNIAN : PlayerId.HUMAN;
      if (shooterOwner === PlayerId.HUMAN) {
        stats.alliance.damageDealt += damage;
      } else {
        stats.insignia.damageDealt += damage;
      }

      if (target.isDestroyed) {
        if (target.owner === PlayerId.HUMAN) {
          stats.alliance.robotsLost++;
          stats.insignia.kills++;
        } else {
          stats.insignia.robotsLost++;
          stats.alliance.kills++;
        }
      }
    });

    // Clean up destroyed robots
    robots = robots.filter((r) => !r.isDestroyed);

    // 6. Continuous captures
    const allStructures = [...map.warbases, ...map.factories];
    CaptureSystem.updateCapture(
      allStructures,
      robots,
      (structure, newOwner) => {
        const teamName = newOwner === PlayerId.HUMAN ? 'Альянс' : 'Инсигния';
        if (structure.type === StructureType.WARBASE) {
          stats.highlights.push(`[${Math.round(tick/20)}с] ${teamName} захватил военную базу #${structure.id}!`);
        } else {
          if (newOwner === PlayerId.HUMAN) stats.alliance.factoriesCaptured++;
          else stats.insignia.factoriesCaptured++;
        }
      }
    );

    // 7. Check Victory Conditions
    const allianceBase = map.warbases.find((b) => b.id === 100);
    const insigniaBase = map.warbases.find((b) => b.id === 103);

    const allianceBaseLost = !allianceBase || allianceBase.isDestroyed || allianceBase.owner === PlayerId.INSIGNIAN;
    const insigniaBaseLost = !insigniaBase || insigniaBase.isDestroyed || insigniaBase.owner === PlayerId.HUMAN;

    if (insigniaBaseLost && !allianceBaseLost) {
      stats.winner = 'ALLIANCE';
      stats.victoryCondition = insigniaBase?.isDestroyed ? 'Уничтожение главной базы Инсигнии (Ядерный удар)' : 'Захват главной базы Инсигнии';
      break;
    } else if (allianceBaseLost && !insigniaBaseLost) {
      stats.winner = 'INSIGNIA';
      stats.victoryCondition = allianceBase?.isDestroyed ? 'Уничтожение главной базы Альянса (Ядерный удар)' : 'Захват главной базы Альянса';
      break;
    } else if (allianceBaseLost && insigniaBaseLost) {
      stats.winner = 'DRAW';
      stats.victoryCondition = 'Обоюдное уничтожение';
      break;
    }
  }

  // Count final controlled structures
  stats.alliance.warbasesOwned = map.warbases.filter((b) => b.owner === PlayerId.HUMAN && !b.isDestroyed).length;
  stats.insignia.warbasesOwned = map.warbases.filter((b) => b.owner === PlayerId.INSIGNIAN && !b.isDestroyed).length;

  if (stats.winner === 'DRAW' && stats.victoryCondition === 'TIMEOUT') {
    if (stats.alliance.warbasesOwned > stats.insignia.warbasesOwned) {
      stats.winner = 'ALLIANCE';
      stats.victoryCondition = 'Доминирование по военным базам';
    } else if (stats.insignia.warbasesOwned > stats.alliance.warbasesOwned) {
      stats.winner = 'INSIGNIA';
      stats.victoryCondition = 'Доминирование по военным базам';
    } else if (stats.alliance.factoriesCaptured > stats.insignia.factoriesCaptured) {
      stats.winner = 'ALLIANCE';
      stats.victoryCondition = 'Экономическое доминирование по фабрикам';
    } else {
      stats.winner = 'INSIGNIA';
      stats.victoryCondition = 'Экономическое доминирование по фабрикам';
    }
  }

  stats.durationMinutes = Number((stats.durationTicks / 20 / 60).toFixed(2));
  return stats;
}

export function runFiveRoundsSimulation(): RoundResult[] {
  console.log('=== ЗАПУСК 5 АВТОНОМНЫХ РАУНДОВ (ИИ vs ИИ) ===\n');
  const results: RoundResult[] = [];

  for (let r = 1; r <= 5; r++) {
    console.log(`--- Запуск Раунда #${r} ---`);
    const tStart = Date.now();
    const result = runSingleRound(r);
    const ms = Date.now() - tStart;
    console.log(`Раунд #${r} завершён за ${ms}мс: Победитель: ${result.winner} (${result.victoryCondition}) за ${result.durationMinutes} мин (${result.durationTicks} тиков)`);
    console.log(`  Альянс: Построено ${result.alliance.robotsBuilt}, Потери ${result.alliance.robotsLost}, Фабрик ${result.alliance.factoriesCaptured}, Урон ${result.alliance.damageDealt}`);
    console.log(`  Инсигния: Построено ${result.insignia.robotsBuilt}, Потери ${result.insignia.robotsLost}, Фабрик ${result.insignia.factoriesCaptured}, Урон ${result.insignia.damageDealt}`);
    console.log(`  Ключевые события: ${result.highlights.slice(0, 3).join('; ') || 'Без ядерных инцидентов'}\n`);
    results.push(result);
  }

  return results;
}

// If run directly via vite-node / ts-node
const results = runFiveRoundsSimulation();
const outPath = path.resolve('C:/Users/vl/.gemini/antigravity/brain/ece97188-dbb5-4fa3-9ece-0534acf53684/autonomous_5_rounds_data.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
console.log('Результаты сохранены в:', outPath);
