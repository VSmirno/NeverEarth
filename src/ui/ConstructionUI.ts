import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Button,
  StackPanel
} from '@babylonjs/gui';
import { ChassisType, WeaponType, PlayerId, OrderType } from '../sim/types.ts';
import { ConstructionValidator, ActiveRobot } from '../sim/Construction.ts';
import { EconomyManager } from '../sim/economy.ts';
import { PIECE_COSTS } from '../sim/constants.ts';

export class ConstructionUI {
  private advancedTexture: AdvancedDynamicTexture;
  private container: Rectangle;
  private economy: EconomyManager;

  // Current build state
  private selectedChassis: ChassisType = ChassisType.TRACKS;
  private selectedWeapons: WeaponType[] = [WeaponType.CANNON];
  private selectedElectronics: boolean = false;
  private selectedOrder: OrderType = OrderType.SEARCH_AND_CAPTURE;

  private onLaunchCallback: ((robot: ActiveRobot) => void) | null = null;
  private onExitCallback: (() => void) | null = null;
  private nextRobotId: number = 1;

  constructor(economy: EconomyManager) {
    this.economy = economy;
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('ConstructionUI');

    // Main Modal Dialog Container
    this.container = new Rectangle('construction_modal');
    this.container.width = '780px';
    this.container.height = '560px';
    this.container.cornerRadius = 12;
    this.container.color = '#00f0ff';
    this.container.thickness = 2;
    this.container.background = 'rgba(8, 12, 22, 0.95)';
    this.container.isVisible = false;
    this.advancedTexture.addControl(this.container);

    this.buildUI();
  }

  private buildUI(): void {
    const mainStack = new StackPanel('mainStack');
    mainStack.width = '100%';
    mainStack.height = '100%';
    mainStack.isVertical = true;
    this.container.addControl(mainStack);

    // Title Header
    const title = new TextBlock('title', '◆ СБОРКА БОЕВОГО РОБОТА ◆');
    title.height = '44px';
    title.color = '#00f0ff';
    title.fontSize = 22;
    title.fontFamily = 'monospace';
    mainStack.addControl(title);

    // Resource Status Bar
    const resBar = new TextBlock('resBar', '');
    resBar.height = '28px';
    resBar.color = '#70ff90';
    resBar.fontSize = 13;
    resBar.fontFamily = 'monospace';
    mainStack.addControl(resBar);

    // 1. Chassis Selector Row
    const chassisLabel = new TextBlock('cLabel', '1. ВЫБЕРИТЕ ШАССИ:');
    chassisLabel.height = '26px';
    chassisLabel.color = '#ffaa33';
    chassisLabel.fontSize = 13;
    mainStack.addControl(chassisLabel);

    const chassisRow = new StackPanel('chassisRow');
    chassisRow.isVertical = false;
    chassisRow.height = '38px';
    mainStack.addControl(chassisRow);

    const chassisTypes = [
      { type: ChassisType.BIPOD, name: `ШАГОХОД (${PIECE_COSTS[ChassisType.BIPOD]})` },
      { type: ChassisType.TRACKS, name: `ГУСЕНИЦЫ (${PIECE_COSTS[ChassisType.TRACKS]})` },
      { type: ChassisType.ANTIGRAV, name: `АНТИГРАВ (${PIECE_COSTS[ChassisType.ANTIGRAV]})` }
    ];

    chassisTypes.forEach((c) => {
      const btn = Button.CreateSimpleButton(`btn_${c.type}`, c.name);
      btn.width = '180px';
      btn.height = '34px';
      btn.color = '#ffffff';
      btn.background = this.selectedChassis === c.type ? '#0066aa' : '#1a2233';
      btn.onPointerClickObservable.add(() => {
        this.selectedChassis = c.type;
        this.refreshUI(resBar);
      });
      chassisRow.addControl(btn);
    });

    // 2. Weapons Selector Row
    const weaponLabel = new TextBlock('wLabel', '2. ОРУЖИЕ (ОТ 1 ДО 3 ТИПОВ):');
    weaponLabel.height = '26px';
    weaponLabel.color = '#ff5566';
    weaponLabel.fontSize = 13;
    mainStack.addControl(weaponLabel);

    const weaponRow = new StackPanel('weaponRow');
    weaponRow.isVertical = false;
    weaponRow.height = '38px';
    mainStack.addControl(weaponRow);

    const weaponTypes = [
      { type: WeaponType.CANNON, name: `ПУШКА (${PIECE_COSTS[WeaponType.CANNON]})` },
      { type: WeaponType.MISSILES, name: `РАКЕТЫ (${PIECE_COSTS[WeaponType.MISSILES]})` },
      { type: WeaponType.PHASERS, name: `ФАЗЕР (${PIECE_COSTS[WeaponType.PHASERS]})` },
      { type: WeaponType.NUCLEAR, name: `ЯДЕРНАЯ (${PIECE_COSTS[WeaponType.NUCLEAR]})` }
    ];

    weaponTypes.forEach((w) => {
      const btn = Button.CreateSimpleButton(`btn_${w.type}`, w.name);
      btn.width = '140px';
      btn.height = '34px';
      btn.color = '#ffffff';
      btn.background = this.selectedWeapons.includes(w.type) ? '#aa2233' : '#1a2233';
      btn.onPointerClickObservable.add(() => {
        if (this.selectedWeapons.includes(w.type)) {
          if (this.selectedWeapons.length > 1) {
            this.selectedWeapons = this.selectedWeapons.filter((item) => item !== w.type);
          }
        } else {
          if (this.selectedWeapons.length < 3) {
            this.selectedWeapons.push(w.type);
          }
        }
        this.refreshUI(resBar);
      });
      weaponRow.addControl(btn);
    });

    // 3. Module / Electronics Row
    const moduleRow = new StackPanel('moduleRow');
    moduleRow.isVertical = false;
    moduleRow.height = '38px';
    mainStack.addControl(moduleRow);

    const elecBtn = Button.CreateSimpleButton('btn_elec', `МОДУЛЬ ЭЛЕКТРОНИКИ / ИИ (+${PIECE_COSTS.electronics})`);
    elecBtn.width = '320px';
    elecBtn.height = '32px';
    elecBtn.color = '#ffffff';
    elecBtn.background = this.selectedElectronics ? '#009977' : '#1a2233';
    elecBtn.onPointerClickObservable.add(() => {
      this.selectedElectronics = !this.selectedElectronics;
      this.refreshUI(resBar);
    });
    moduleRow.addControl(elecBtn);

    // 4. Robot Order Selector Row
    const orderLabel = new TextBlock('oLabel', '3. ПРИКАЗ ПОСЛЕ ВЫЕЗДА:');
    orderLabel.height = '26px';
    orderLabel.color = '#55aaff';
    orderLabel.fontSize = 13;
    mainStack.addControl(orderLabel);

    const orderRow = new StackPanel('orderRow');
    orderRow.isVertical = false;
    orderRow.height = '38px';
    mainStack.addControl(orderRow);

    const orderTypes = [
      { order: OrderType.SEARCH_AND_CAPTURE, name: '🏴 ЗАХВАТ ФАБРИК' },
      { order: OrderType.ADVANCE, name: '▶ В АТАКУ' },
      { order: OrderType.SEARCH_AND_DESTROY, name: '⚔ ОХОТА НА ВРАГА' },
      { order: OrderType.STOP_AND_DEFEND, name: '🛡 ОБОРОНА' }
    ];

    orderTypes.forEach((o) => {
      const btn = Button.CreateSimpleButton(`btn_order_${o.order}`, o.name);
      btn.width = '170px';
      btn.height = '32px';
      btn.color = '#ffffff';
      btn.background = this.selectedOrder === o.order ? '#008855' : '#1a2233';
      btn.onPointerClickObservable.add(() => {
        this.selectedOrder = o.order;
        this.refreshUI(resBar);
      });
      orderRow.addControl(btn);
    });

    // Summary Text (Height + Cost)
    const summaryText = new TextBlock('summary', '');
    summaryText.height = '36px';
    summaryText.color = '#ffffaa';
    summaryText.fontSize = 14;
    mainStack.addControl(summaryText);

    // Bottom Action Buttons (START ROBOT / EXIT)
    const actionRow = new StackPanel('actionRow');
    actionRow.isVertical = false;
    actionRow.height = '50px';
    mainStack.addControl(actionRow);

    const startBtn = Button.CreateSimpleButton('startBtn', '▶ ЗАПУСТИТЬ РОБОТА');
    startBtn.width = '240px';
    startBtn.height = '42px';
    startBtn.color = '#000000';
    startBtn.background = '#00ffaa';
    startBtn.onPointerClickObservable.add(() => {
      this.launchRobot();
    });
    actionRow.addControl(startBtn);

    const exitBtn = Button.CreateSimpleButton('exitBtn', '✖ ЗАКРЫТЬ (ESC)');
    exitBtn.width = '160px';
    exitBtn.height = '42px';
    exitBtn.color = '#ffffff';
    exitBtn.background = '#445566';
    exitBtn.onPointerClickObservable.add(() => {
      this.close();
    });
    actionRow.addControl(exitBtn);

    this.container.onAfterDrawObservable.add(() => {
      this.updateStatusText(resBar, summaryText);
    });
  }

  private updateStatusText(resBar: TextBlock, summaryText: TextBlock): void {
    const res = this.economy.getResources(PlayerId.HUMAN);
    resBar.text = `РЕСУРСЫ: ОБЩИЕ ${res.general} | ШАССИ ${res.chassis} | ПУШКИ ${res.cannons} | РАКЕТЫ ${res.missiles} | ФАЗЕР ${res.phasers} | ЯДЕР ${res.nuclear} | ЭЛЕК ${res.electronics}`;

    const bp = {
      chassis: this.selectedChassis,
      weapons: this.selectedWeapons,
      hasElectronics: this.selectedElectronics
    };
    const height = ConstructionValidator.calculateStackHeight(bp);
    const cost = ConstructionValidator.computeTotalCost(bp);
    summaryText.text = `Стоимость: ${cost.totalCost} | Высота робота: ${height} (Броня: ${height}/38)`;
  }

  private refreshUI(resBar: TextBlock): void {
    const summary = this.container.getChildByName('summary') as TextBlock;
    if (summary) this.updateStatusText(resBar, summary);

    // Update button background colors
    for (const child of this.container.getDescendants()) {
      if (child instanceof Button && child.name) {
        if (child.name.startsWith('btn_bipod')) child.background = this.selectedChassis === ChassisType.BIPOD ? '#0066aa' : '#1a2233';
        if (child.name.startsWith('btn_tracks')) child.background = this.selectedChassis === ChassisType.TRACKS ? '#0066aa' : '#1a2233';
        if (child.name.startsWith('btn_antigrav')) child.background = this.selectedChassis === ChassisType.ANTIGRAV ? '#0066aa' : '#1a2233';
        if (child.name === 'btn_cannon') child.background = this.selectedWeapons.includes(WeaponType.CANNON) ? '#aa2233' : '#1a2233';
        if (child.name === 'btn_missiles') child.background = this.selectedWeapons.includes(WeaponType.MISSILES) ? '#aa2233' : '#1a2233';
        if (child.name === 'btn_phasers') child.background = this.selectedWeapons.includes(WeaponType.PHASERS) ? '#aa2233' : '#1a2233';
        if (child.name === 'btn_nuclear') child.background = this.selectedWeapons.includes(WeaponType.NUCLEAR) ? '#aa2233' : '#1a2233';
        if (child.name === 'btn_elec') child.background = this.selectedElectronics ? '#009977' : '#1a2233';

        // Orders
        if (child.name === `btn_order_${OrderType.SEARCH_AND_CAPTURE}`) child.background = this.selectedOrder === OrderType.SEARCH_AND_CAPTURE ? '#008855' : '#1a2233';
        if (child.name === `btn_order_${OrderType.ADVANCE}`) child.background = this.selectedOrder === OrderType.ADVANCE ? '#008855' : '#1a2233';
        if (child.name === `btn_order_${OrderType.SEARCH_AND_DESTROY}`) child.background = this.selectedOrder === OrderType.SEARCH_AND_DESTROY ? '#008855' : '#1a2233';
        if (child.name === `btn_order_${OrderType.STOP_AND_DEFEND}`) child.background = this.selectedOrder === OrderType.STOP_AND_DEFEND ? '#008855' : '#1a2233';
      }
    }
  }

  public open(onLaunch: (robot: ActiveRobot) => void, onExit: () => void): void {
    this.onLaunchCallback = onLaunch;
    this.onExitCallback = onExit;
    this.container.isVisible = true;
    const resBar = this.container.getChildByName('resBar') as TextBlock;
    if (resBar) this.refreshUI(resBar);
  }

  public close(): void {
    this.container.isVisible = false;
    if (this.onExitCallback) this.onExitCallback();
  }

  public isOpen(): boolean {
    return this.container.isVisible;
  }

  private launchRobot(): void {
    const bp = {
      chassis: this.selectedChassis,
      weapons: this.selectedWeapons,
      hasElectronics: this.selectedElectronics
    };

    const check = ConstructionValidator.canBuild(PlayerId.HUMAN, bp, this.economy, 0);
    if (!check.canBuild) {
      alert(check.reason || 'Недостаточно ресурсов для постройки');
      return;
    }

    // Purchase pieces
    this.economy.purchasePiece(PlayerId.HUMAN, bp.chassis);
    for (const w of bp.weapons) {
      this.economy.purchasePiece(PlayerId.HUMAN, w);
    }
    if (bp.hasElectronics) {
      this.economy.purchasePiece(PlayerId.HUMAN, 'electronics' as any);
    }

    const newRobot: ActiveRobot = {
      id: this.nextRobotId++,
      owner: PlayerId.HUMAN,
      blueprint: bp,
      stackHeight: ConstructionValidator.calculateStackHeight(bp),
      x: 25,
      y: 8, // Exit into open central corridor
      altitude: 0,
      strength: 100,
      facing: 0, // Facing East
      order: this.selectedOrder,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 0,
      currentMoveTicksRemaining: 0
    };

    this.container.isVisible = false;
    if (this.onLaunchCallback) this.onLaunchCallback(newRobot);
  }
}
