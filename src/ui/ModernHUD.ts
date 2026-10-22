import { EconomyManager } from '../sim/economy.ts';
import { Commander, CommanderState } from '../sim/Commander.ts';
import { GameMap } from '../sim/mapData.ts';
import { ActiveRobot } from '../sim/Construction.ts';
import { PlayerId, OrderType, ChassisType, GameMode } from '../sim/types.ts';
import { Minimap } from './Minimap.ts';

export class ModernHUD {
  private overlay: HTMLElement;
  public minimap: Minimap;
  public onOpenConstructorClick: (() => void) | null = null;
  public onRestartClick: (() => void) | null = null;
  public onOrderSelected: ((order: OrderType) => void) | null = null;
  public onTakeControlClick: (() => void) | null = null;
  public onToggleModeClick: (() => void) | null = null;

  // Cached DOM elements
  private btnToggleMode!: HTMLElement;
  private resGeneralVal!: HTMLElement;
  private resChassisVal!: HTMLElement;
  private resCannonsVal!: HTMLElement;
  private resMissilesVal!: HTMLElement;
  private resPhasersVal!: HTMLElement;
  private resNuclearVal!: HTMLElement;
  private resElectronicsVal!: HTMLElement;

  private warAllianceBases!: HTMLElement;
  private warInsigniaBases!: HTMLElement;
  private telemetryCoords!: HTMLElement;
  private telemetryDrones!: HTMLElement;
  private telemetryMode!: HTMLElement;
  private directControlBanner!: HTMLElement;
  private battleTicker!: HTMLElement;
  private victoryBanner!: HTMLElement;

  // Selected Unit elements
  private selectedUnitPanel!: HTMLElement;
  private unitCardTitle!: HTMLElement;
  private unitChassisBadge!: HTMLElement;
  private unitWeaponsList!: HTMLElement;

  private tickerTimer: number = 0;

  constructor() {
    this.overlay = document.getElementById('hud-overlay')!;
    this.buildDOM();

    const canvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
    this.minimap = new Minimap(canvas);
  }

  private buildDOM(): void {
    this.overlay.innerHTML = `
      <!-- TOP COMMAND BAR -->
      <div class="glass-panel top-command-bar hud-interactive">
        <div class="res-strip">
          <div class="res-item general" title="Общие кристаллы энергии">
            <span class="res-icon">💎</span>
            <span class="label">ОБЩИЕ</span>
            <span class="res-val" id="resGeneral">20</span>
          </div>
          <div class="res-item" title="Каркасы шасси">
            <span class="res-icon">⚙</span>
            <span class="label">ШАССИ</span>
            <span class="res-val" id="resChassis">0</span>
          </div>
          <div class="res-item" title="Орудийные батареи">
            <span class="res-icon">💥</span>
            <span class="label">ПУШКИ</span>
            <span class="res-val" id="resCannons">0</span>
          </div>
          <div class="res-item" title="Ракетные контейнеры">
            <span class="res-icon">🚀</span>
            <span class="label">РАКЕТЫ</span>
            <span class="res-val" id="resMissiles">0</span>
          </div>
          <div class="res-item" title="Квантовые фазеры">
            <span class="res-icon">⚡</span>
            <span class="label">ФАЗЕРЫ</span>
            <span class="res-val" id="resPhasers">0</span>
          </div>
          <div class="res-item" title="Ядерные боезаряды">
            <span class="res-icon">☢</span>
            <span class="label">ЯДЕРНЫЕ</span>
            <span class="res-val" id="resNuclear">0</span>
          </div>
          <div class="res-item" title="Модули ИИ и связи">
            <span class="res-icon">📡</span>
            <span class="label">ИИ/СВЯЗЬ</span>
            <span class="res-val" id="resElectronics">0</span>
          </div>
        </div>

        <div class="war-status">
          <span class="badge-alliance">АЛЬЯНС: <span id="allianceBases">1</span></span>
          <span class="badge-vs">VS</span>
          <span class="badge-insignia">ИНСИГНИЯ: <span id="insigniaBases">1</span></span>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-mode-toggle" id="btnToggleMode" title="Переключить режим: Человек vs ИИ / ИИ vs ИИ">
            <span id="modeIcon">👤</span> <span id="modeText">ЧЕЛОВЕК vs ИИ</span>
          </button>
          <button class="btn-open-constructor" id="btnOpenConstructor">
            <span>⚡ СБОРКА РОБОТА [B]</span>
          </button>
        </div>
      </div>

      <!-- BOTTOM RTS UNIT & COMMAND BAR -->
      <div class="glass-panel bottom-telemetry-bar hud-interactive" style="width: 540px;">
        <div class="telemetry-header">
          <span id="unitCardTitle">ТАКТИЧЕСКИЙ ШТАБ ОПЕРАЦИИ</span>
          <span id="telemetryCoords">SEC: 18 / 110</span>
        </div>

        <div id="directControlBanner" class="direct-control-banner">
          🎮 [РУЧНОЕ УПРАВЛЕНИЕ РОБОТОМ] WASD: ход | Пробел/F: огонь | E / Esc: вернуться в обзор
        </div>

        <!-- Selected Unit Status & Quick Commands -->
        <div id="selectedUnitPanel" style="display: none; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            <div>
              <span id="unitChassisBadge" style="font-weight: 700; color: var(--cyan); font-family: var(--font-display);">РОБОТ</span>
              <span id="unitWeaponsList" style="font-size: 13px; color: rgba(255,255,255,0.7); margin-left: 8px;">[Пушка]</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button id="btnOrderCapture" class="btn-micro-order" title="Приказ: Захват нейтральных фабрик">🏴 ЗАХВАТ</button>
              <button id="btnOrderAdvance" class="btn-micro-order" title="Приказ: Штурм вражеской базы">▶ АТАКА</button>
              <button id="btnOrderHunt" class="btn-micro-order" title="Приказ: Охота на роботов врага">⚔ ОХОТА</button>
              <button id="btnOrderDefend" class="btn-micro-order" title="Приказ: Удержание сектора">🛡 ОБОРОНА</button>
              <button id="btnTakeDirectControl" class="btn-micro-order primary" title="Взять прямое управление [E]">🎮 ШТУРВАЛ [E]</button>
            </div>
          </div>
        </div>

        <div class="telemetry-stats">
          <div class="telemetry-item">
            <div class="label">РЕЖИМ КАМЕРЫ</div>
            <div class="val" id="telemetryMode">RTS ОБЗОР (WASD)</div>
          </div>
          <div class="telemetry-item">
            <div class="label">ДРОНЫ В СТРОЮ</div>
            <div class="val" id="telemetryDrones">0 / 24</div>
          </div>
          <div class="telemetry-item">
            <div class="label">СВЯЗЬ ИИ</div>
            <div class="val" style="color: var(--emerald);">СТАБИЛЬНО</div>
          </div>
        </div>

        <div class="battle-ticker" id="battleTicker">
          СИСТЕМА: Свободный RTS-обзор. Кликайте на роботов для выбора и отдачи приказов.
        </div>
      </div>

      <!-- BOTTOM-RIGHT MINIMAP RADAR -->
      <div class="glass-panel minimap-container hud-interactive">
        <div class="minimap-header">
          <span>ТАКТИЧЕСКИЙ РАДАР [128×128]</span>
          <span style="color: rgba(255,255,255,0.4);">КЛИК ДЛЯ ПЕРЕХОДА</span>
        </div>
        <canvas id="minimapCanvas"></canvas>
      </div>

      <!-- VICTORY / DEFEAT BANNER -->
      <div id="victoryBanner" style="display: none; position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(8, 14, 24, 0.95); border: 2px solid var(--cyan); box-shadow: 0 0 60px rgba(56, 189, 248, 0.5); padding: 40px 60px; border-radius: 16px; z-index: 100; pointer-events: auto;">
        <h1 id="victoryTitle" style="font-family: var(--font-display); font-size: 38px; margin-bottom: 20px; letter-spacing: 3px;"></h1>
        <button id="btnRestartMatch" style="background: var(--cyan); border: none; padding: 14px 34px; font-family: var(--font-display); font-weight: 700; font-size: 16px; border-radius: 8px; cursor: pointer;">
          НАЧАТЬ ЗАНОВО
        </button>
      </div>
    `;

    // Cache elements
    this.resGeneralVal = document.getElementById('resGeneral')!;
    this.resChassisVal = document.getElementById('resChassis')!;
    this.resCannonsVal = document.getElementById('resCannons')!;
    this.resMissilesVal = document.getElementById('resMissiles')!;
    this.resPhasersVal = document.getElementById('resPhasers')!;
    this.resNuclearVal = document.getElementById('resNuclear')!;
    this.resElectronicsVal = document.getElementById('resElectronics')!;

    this.warAllianceBases = document.getElementById('allianceBases')!;
    this.warInsigniaBases = document.getElementById('insigniaBases')!;
    this.telemetryCoords = document.getElementById('telemetryCoords')!;
    this.telemetryDrones = document.getElementById('telemetryDrones')!;
    this.telemetryMode = document.getElementById('telemetryMode')!;
    this.directControlBanner = document.getElementById('directControlBanner')!;
    this.battleTicker = document.getElementById('battleTicker')!;
    this.victoryBanner = document.getElementById('victoryBanner')!;

    // Selected Unit Panel
    this.selectedUnitPanel = document.getElementById('selectedUnitPanel')!;
    this.unitCardTitle = document.getElementById('unitCardTitle')!;
    this.unitChassisBadge = document.getElementById('unitChassisBadge')!;
    this.unitWeaponsList = document.getElementById('unitWeaponsList')!;

    // Event listeners
    this.btnToggleMode = document.getElementById('btnToggleMode')!;
    if (this.btnToggleMode) {
      this.btnToggleMode.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onToggleModeClick) this.onToggleModeClick();
      });
    }

    const btnConstructor = document.getElementById('btnOpenConstructor');
    if (btnConstructor) {
      btnConstructor.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onOpenConstructorClick) this.onOpenConstructorClick();
      });
    }

    document.getElementById('btnRestartMatch')!.addEventListener('click', () => {
      window.location.reload();
    });

    // Unit Quick Order buttons
    document.getElementById('btnOrderCapture')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onOrderSelected) this.onOrderSelected(OrderType.SEARCH_AND_CAPTURE);
    });

    document.getElementById('btnOrderAdvance')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onOrderSelected) this.onOrderSelected(OrderType.ADVANCE);
    });

    document.getElementById('btnOrderHunt')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onOrderSelected) this.onOrderSelected(OrderType.SEARCH_AND_DESTROY);
    });

    document.getElementById('btnOrderDefend')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onOrderSelected) this.onOrderSelected(OrderType.STOP_AND_DEFEND);
    });

    document.getElementById('btnTakeDirectControl')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onTakeControlClick) this.onTakeControlClick();
    });
  }

  public showNotification(msg: string, color: string = '#ffffaa'): void {
    this.battleTicker.style.color = color;
    this.battleTicker.textContent = msg;
    this.tickerTimer = 5.0;
  }

  public update(
    economy: EconomyManager,
    commander: Commander,
    map: GameMap,
    robots: ActiveRobot[],
    activeHumanRobotsCount: number,
    selectedRobot: ActiveRobot | null = null
  ): void {
    // 1. Update Resources
    const res = economy.getResources(PlayerId.HUMAN);
    this.resGeneralVal.textContent = String(res.general);
    this.resChassisVal.textContent = String(res.chassis);
    this.resCannonsVal.textContent = String(res.cannons);
    this.resMissilesVal.textContent = String(res.missiles);
    this.resPhasersVal.textContent = String(res.phasers);
    this.resNuclearVal.textContent = String(res.nuclear);
    this.resElectronicsVal.textContent = String(res.electronics);

    // 2. War Status
    const humanBases = map.warbases.filter((b) => b.owner === PlayerId.HUMAN && !b.isDestroyed).length;
    const enemyBases = map.warbases.filter((b) => b.owner === PlayerId.INSIGNIAN && !b.isDestroyed).length;
    this.warAllianceBases.textContent = String(humanBases);
    this.warInsigniaBases.textContent = String(enemyBases);

    // 3. Telemetry & Viewport Coords
    this.telemetryCoords.textContent = `SEC: ${Math.round(commander.x)} / ${Math.round(commander.y)}`;
    this.telemetryDrones.textContent = `${activeHumanRobotsCount} / 24`;

    // 4. Selected Unit Status
    if (selectedRobot && !selectedRobot.isDestroyed) {
      this.selectedUnitPanel.style.display = 'block';
      this.unitCardTitle.textContent = `ВЫБРАН БОЕВОЙ ДРОН #${selectedRobot.id}`;

      let chassisName = 'ГУСЕНИЧНЫЙ';
      if (selectedRobot.blueprint.chassis === ChassisType.BIPOD) chassisName = 'ШАГОХОД';
      else if (selectedRobot.blueprint.chassis === ChassisType.ANTIGRAV) chassisName = 'АНТИГРАВ';
      this.unitChassisBadge.textContent = chassisName;

      const weaponsList = selectedRobot.blueprint.weapons.join(' + ').toUpperCase();
      this.unitWeaponsList.textContent = `[${weaponsList}] | Прочность: ${selectedRobot.strength}%`;
    } else {
      this.selectedUnitPanel.style.display = 'none';
      this.unitCardTitle.textContent = 'ТАКТИЧЕСКИЙ ШТАБ ОПЕРАЦИИ';
    }

    // 5. Direct Control Banner vs Free RTS Camera
    if (commander.state === CommanderState.DOCKED_ROBOT && commander.dockedEntityId) {
      this.directControlBanner.style.display = 'block';
      this.directControlBanner.textContent = `🎮 [РУЧНОЕ УПРАВЛЕНИЕ РОБОТОМ #${commander.dockedEntityId}] WASD: ход | Пробел/F: огонь | E / Esc: вернуться в обзор`;
      this.telemetryMode.textContent = 'РУЧНОЙ ШТУРВАЛ';
      this.telemetryMode.style.color = 'var(--amber)';
    } else {
      this.directControlBanner.style.display = 'none';
      this.telemetryMode.textContent = 'RTS ОБЗОР (WASD)';
      this.telemetryMode.style.color = '#ffffff';
    }

    // 6. Victory / Defeat Overlay
    if (enemyBases === 0) {
      const title = document.getElementById('victoryTitle')!;
      title.style.color = 'var(--emerald)';
      title.textContent = '★ ПОБЕДА! ВСЕ БАЗЫ ВРАГА УНИЧТОЖЕНЫ ★';
      this.victoryBanner.style.display = 'block';
    } else if (humanBases === 0) {
      const title = document.getElementById('victoryTitle')!;
      title.style.color = 'var(--crimson)';
      title.textContent = '☠ ПОРАЖЕНИЕ! ВАША БАЗА РАЗРУШЕНА ☠';
      this.victoryBanner.style.display = 'block';
    }

    // 7. Minimap Radar Update
    this.minimap.render(map, robots, commander);

    // 8. Ticker fade countdown
    if (this.tickerTimer > 0) {
      this.tickerTimer -= 0.02;
    }
  }

  public updateGameMode(mode: GameMode): void {
    if (!this.btnToggleMode) return;
    const modeIcon = this.btnToggleMode.querySelector('#modeIcon');
    const modeText = this.btnToggleMode.querySelector('#modeText');
    if (mode === GameMode.AI_VS_AI) {
      this.btnToggleMode.classList.add('autonomous');
      if (modeIcon) modeIcon.textContent = '⚔';
      if (modeText) modeText.textContent = 'ИИ vs ИИ (АВТОНОМНЫЙ)';
      this.showNotification('⚔ Включён режим АВТОНОМНОГО БОЯ (ИИ против ИИ)! Обеими базами управляют алгоритмы генералов.', '#ffb800');
    } else {
      this.btnToggleMode.classList.remove('autonomous');
      if (modeIcon) modeIcon.textContent = '👤';
      if (modeText) modeText.textContent = 'ЧЕЛОВЕК vs ИИ';
      this.showNotification('👤 Включён СТАНДАРТНЫЙ РЕЖИМ (Человек против ИИ). База Альянса под вашим командованием.', 'var(--cyan)');
    }
  }
}
