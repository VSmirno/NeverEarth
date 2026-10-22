import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Button,
  Control
} from '@babylonjs/gui';
import { EconomyManager } from '../sim/economy.ts';
import { Commander } from '../sim/Commander.ts';
import { GameMap } from '../sim/mapData.ts';
import { PlayerId } from '../sim/types.ts';

export class GameHUD {
  private advancedTexture: AdvancedDynamicTexture;
  private topBar: Rectangle;
  private resText: TextBlock;
  private infoText: TextBlock;
  private notifyText: TextBlock;
  private bannerText: TextBlock;
  private notifyTimer: number = 0;
  public onOpenFactoryClick: (() => void) | null = null;

  constructor() {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('GameHUD');

    // 1. Top Bar Container
    this.topBar = new Rectangle('topBar');
    this.topBar.width = '100%';
    this.topBar.height = '84px';
    this.topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.topBar.background = 'rgba(6, 10, 18, 0.9)';
    this.topBar.thickness = 1;
    this.topBar.color = 'rgba(0, 240, 255, 0.5)';
    this.advancedTexture.addControl(this.topBar);

    const topRow = new StackPanel('topRow');
    topRow.isVertical = false;
    topRow.width = '100%';
    topRow.height = '100%';
    this.topBar.addControl(topRow);

    // Left block: Resources & info
    const leftStack = new StackPanel('leftStack');
    leftStack.isVertical = true;
    leftStack.width = '75%';
    leftStack.height = '100%';
    topRow.addControl(leftStack);

    this.resText = new TextBlock('hudRes', 'РЕСУРСЫ: ОБЩИЕ 20 | ШАССИ 0 | ПУШКИ 0 | РАКЕТЫ 0 | ФАЗЕР 0 | ЯДЕР 0 | ЭЛЕК 0');
    this.resText.height = '28px';
    this.resText.color = '#70ff90';
    this.resText.fontSize = 15;
    this.resText.fontFamily = 'monospace';
    leftStack.addControl(this.resText);

    this.infoText = new TextBlock('hudInfo', '');
    this.infoText.height = '24px';
    this.infoText.color = '#00f0ff';
    this.infoText.fontSize = 13;
    this.infoText.fontFamily = 'monospace';
    leftStack.addControl(this.infoText);

    this.notifyText = new TextBlock('hudNotify', '');
    this.notifyText.height = '22px';
    this.notifyText.color = '#ffff55';
    this.notifyText.fontSize = 13;
    this.notifyText.fontFamily = 'monospace';
    leftStack.addControl(this.notifyText);

    // Right block: Direct "OPEN FACTORY" button
    const factoryBtn = Button.CreateSimpleButton('btn_open_factory', '🏭 СОБРАТЬ РОБОТА [B]');
    factoryBtn.width = '220px';
    factoryBtn.height = '46px';
    factoryBtn.color = '#000000';
    factoryBtn.background = '#00ffaa';
    factoryBtn.cornerRadius = 6;
    factoryBtn.fontSize = 14;
    factoryBtn.fontFamily = 'monospace';
    factoryBtn.onPointerClickObservable.add(() => {
      if (this.onOpenFactoryClick) this.onOpenFactoryClick();
    });
    topRow.addControl(factoryBtn);

    // 2. Controls & Guide Box (Bottom-Left)
    const helperBox = new Rectangle('helperBox');
    helperBox.width = '460px';
    helperBox.height = '120px';
    helperBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    helperBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    helperBox.left = '16px';
    helperBox.top = '-16px';
    helperBox.background = 'rgba(6, 10, 18, 0.92)';
    helperBox.thickness = 1;
    helperBox.color = '#00f0ff';
    helperBox.cornerRadius = 8;
    this.advancedTexture.addControl(helperBox);

    const helperText = new TextBlock(
      'helperText',
      'КАК ИГРАТЬ (NETHER EARTH):\n' +
      '• [B] или кнопка вверху — Собрать робота на базе\n' +
      '• [WASD / Стрелки] — Полёт командира | [Space/E] Вверх | [Shift/Q] Вниз\n' +
      '• Фабрики командиром НЕ посещаются — их захватывают роботы (приказ "ЗАХВАТ")\n' +
      '• Спуск на своего робота — ПРЯМОЕ УПРАВЛЕНИЕ (WASD - ход, F/Enter - огонь)'
    );
    helperText.color = '#eeeeee';
    helperText.fontSize = 11;
    helperText.fontFamily = 'monospace';
    helperBox.addControl(helperText);

    // 3. Victory/Defeat Center Banner
    this.bannerText = new TextBlock('banner', '');
    this.bannerText.width = '100%';
    this.bannerText.height = '80px';
    this.bannerText.fontSize = 34;
    this.bannerText.fontFamily = 'monospace';
    this.bannerText.isVisible = false;
    this.advancedTexture.addControl(this.bannerText);
  }

  public update(economy: EconomyManager, commander: Commander, map: GameMap, activeRobotsCount: number): void {
    const res = economy.getResources(PlayerId.HUMAN);
    this.resText.text = `РЕСУРСЫ: ОБЩИЕ ${res.general} | ШАССИ ${res.chassis} | ПУШКИ ${res.cannons} | РАКЕТЫ ${res.missiles} | ФАЗЕР ${res.phasers} | ЯДЕР ${res.nuclear} | ЭЛЕК ${res.electronics}`;

    const humanBases = map.warbases.filter((b) => b.owner === PlayerId.HUMAN && !b.isDestroyed).length;
    const enemyBases = map.warbases.filter((b) => b.owner === PlayerId.INSIGNIAN && !b.isDestroyed).length;

    if (commander.dockedEntityId && commander.state === 'docked_robot' as any) {
      this.infoText.text = `🎮 [ПРЯМОЕ УПРАВЛЕНИЕ РОБОТОМ #${commander.dockedEntityId}] WASD: ход | F/Enter: огонь | Space/E: взлёт`;
      this.infoText.color = '#ffcc00';
    } else {
      this.infoText.text = `ВЫСОТА: ${commander.altitude} / 48 | РОБОТЫ: ${activeRobotsCount}/24 | БАЗЫ: ВЫ ${humanBases} vs ВРАГ ${enemyBases}`;
      this.infoText.color = '#00f0ff';
    }

    // Update Notification Timer
    if (this.notifyTimer > 0) {
      this.notifyTimer -= 0.02;
      if (this.notifyTimer <= 0) {
        this.notifyText.text = '';
      }
    }

    // Victory or Defeat Banner
    if (enemyBases === 0) {
      this.bannerText.text = '★ ПОБЕДА! ВСЕ БАЗЫ ВРАГА УНИЧТОЖЕНЫ ★';
      this.bannerText.color = '#00ffaa';
      this.bannerText.isVisible = true;
    } else if (humanBases === 0) {
      this.bannerText.text = '☠ ПОРАЖЕНИЕ! ВАША БАЗА РАЗРУШЕНА ☠';
      this.bannerText.color = '#ff3344';
      this.bannerText.isVisible = true;
    }
  }

  public showNotification(msg: string, color: string = '#ffff55'): void {
    this.notifyText.text = msg;
    this.notifyText.color = color;
    this.notifyTimer = 4.5;
  }
}
