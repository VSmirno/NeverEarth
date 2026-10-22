import { ChassisType, WeaponType, ModuleType, PlayerId, OrderType, RobotBlueprint } from '../sim/types.ts';
import { ConstructionValidator, ActiveRobot } from '../sim/Construction.ts';
import { EconomyManager } from '../sim/economy.ts';
import { PIECE_COSTS } from '../sim/constants.ts';
import { RobotPreviewRenderer } from './RobotPreviewRenderer.ts';

export class ModernConstructor {
  private backdrop!: HTMLElement;
  private container!: HTMLElement;
  private economy: EconomyManager;
  private previewRenderer!: RobotPreviewRenderer;

  // Selected Blueprint
  private selectedChassis: ChassisType = ChassisType.TRACKS;
  private selectedWeapons: WeaponType[] = [WeaponType.CANNON];
  private selectedElectronics: boolean = false;
  private selectedOrder: OrderType = OrderType.SEARCH_AND_CAPTURE;

  // Tech Badges
  private badgeChassis!: HTMLElement;
  private badgeWeapons!: HTMLElement;
  private badgeAi!: HTMLElement;
  private btnToggleRotate!: HTMLElement;

  private onLaunchCallback: ((robot: ActiveRobot) => void) | null = null;
  private onExitCallback: (() => void) | null = null;
  private nextRobotId: number = 1;

  constructor(economy: EconomyManager) {
    this.economy = economy;
    this.buildDOM();
  }

  private buildDOM(): void {
    // 1. Fullscreen Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'constructor-backdrop';
    backdrop.id = 'constructorBackdrop';
    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    // 2. Main Terminal Modal
    const el = document.createElement('div');
    el.className = 'constructor-modal';
    el.id = 'constructorModal';
    el.innerHTML = `
      <div class="constructor-header">
        <div class="constructor-title">◆ ТАКТИЧЕСКИЙ ТЕРМИНАЛ СБОРКИ ДРОНОВ ◆</div>
        <button class="btn-close-modal" id="btnCloseConstructor" title="Закрыть [Esc]">✕</button>
      </div>

      <!-- WAREHOUSE INVENTORY STRIP -->
      <div class="constructor-warehouse-strip">
        <div class="warehouse-title">СКЛАДСКИЕ ЗАПАСЫ БАЗЫ:</div>
        <div class="warehouse-items">
          <div class="warehouse-item general" title="Общие кристаллы казны (универсальный эквивалент)">
            <span class="wh-icon">💎</span>
            <span class="wh-label">КАЗНА</span>
            <span class="wh-val" id="whGeneral">20</span>
          </div>
          <div class="warehouse-item" id="whItemChassis" title="Каркасы шасси на складе">
            <span class="wh-icon">⚙</span>
            <span class="wh-label">ШАССИ</span>
            <span class="wh-val" id="whChassis">0</span>
          </div>
          <div class="warehouse-item" id="whItemCannons" title="Орудийные башни на складе">
            <span class="wh-icon">💥</span>
            <span class="wh-label">ПУШКИ</span>
            <span class="wh-val" id="whCannons">0</span>
          </div>
          <div class="warehouse-item" id="whItemMissiles" title="Ракетные пусковые контейнеры на складе">
            <span class="wh-icon">🚀</span>
            <span class="wh-label">РАКЕТЫ</span>
            <span class="wh-val" id="whMissiles">0</span>
          </div>
          <div class="warehouse-item" id="whItemPhasers" title="Фазерные излучатели на складе">
            <span class="wh-icon">⚡</span>
            <span class="wh-label">ФАЗЕРЫ</span>
            <span class="wh-val" id="whPhasers">0</span>
          </div>
          <div class="warehouse-item" id="whItemNuclear" title="Ядерные боеголовки на складе">
            <span class="wh-icon">☢</span>
            <span class="wh-label">ЯДЕРНЫЕ</span>
            <span class="wh-val" id="whNuclear">0</span>
          </div>
          <div class="warehouse-item" id="whItemElectronics" title="Модули квантового ИИ на складе">
            <span class="wh-icon">📡</span>
            <span class="wh-label">ИИ/СВЯЗЬ</span>
            <span class="wh-val" id="whElectronics">0</span>
          </div>
        </div>
      </div>

      <div class="constructor-body-split">
        <!-- LEFT: 3D HOLOGRAPHIC PREVIEW BAY -->
        <div class="constructor-preview-panel">
          <div class="preview-panel-header">
            <span class="preview-badge-status">● АКТИВЕН</span>
            <span class="preview-title">АНГАР СБОРКИ // ПРОТОТИП 3D</span>
          </div>

          <div class="preview-canvas-container">
            <canvas id="robotPreviewCanvas" class="constructor-preview-canvas"></canvas>
            <div class="preview-corner-bracket top-left"></div>
            <div class="preview-corner-bracket top-right"></div>
            <div class="preview-corner-bracket bottom-left"></div>
            <div class="preview-corner-bracket bottom-right"></div>
            <div class="preview-scanlines"></div>

            <div class="preview-tech-badges">
              <div class="tech-badge" id="badgeChassis">ГУСЕНИЦЫ</div>
              <div class="tech-badge" id="badgeWeapons">ПУШКА</div>
              <div class="tech-badge" id="badgeAi">БАЗОВЫЙ ИИ</div>
            </div>
          </div>

          <div class="preview-toolbar">
            <div class="preview-hint">🖱 Зажмите ЛКМ для обзора | Колесо: Зум</div>
            <div class="preview-btn-group">
              <button type="button" class="btn-preview-action" id="btnResetView" title="Сбросить ракурс камеры">↺ Ракурс</button>
              <button type="button" class="btn-preview-action" id="btnToggleRotate" title="Пауза / авто-вращение подиума">⏸ Вращение</button>
              <button type="button" class="btn-preview-action" id="btnToggleWalk" title="Тест походки и моторов шасси">🚶 Шаг</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: COMPONENT SELECTION & DEPLOY CONTROLS -->
        <div class="constructor-controls-column">
          <!-- 1. CHASSIS SELECTION -->
          <div class="section-label">1. ВЫБЕРИТЕ ШАССИ / ПЛАТФОРМУ:</div>
          <div class="cards-grid" id="chassisGrid">
            <div class="select-card" data-chassis="${ChassisType.BIPOD}">
              <div class="card-title">🦵 ШАГОХОД</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[ChassisType.BIPOD]} 💎</div>
              <div class="card-stock" id="stockChassis_bipod">На складе: 0 шт.</div>
              <div class="card-stats">Скорость: 24t | Равнина, камни</div>
            </div>
            <div class="select-card selected" data-chassis="${ChassisType.TRACKS}">
              <div class="card-title">🚜 ГУСЕНИЦЫ</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[ChassisType.TRACKS]} 💎</div>
              <div class="card-stock" id="stockChassis_tracks">На складе: 0 шт.</div>
              <div class="card-stats">Скорость: 16t | Включая горы</div>
            </div>
            <div class="select-card" data-chassis="${ChassisType.ANTIGRAV}">
              <div class="card-title">🛸 АНТИГРАВ</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[ChassisType.ANTIGRAV]} 💎</div>
              <div class="card-stock" id="stockChassis_antigrav">На складе: 0 шт.</div>
              <div class="card-stats">Скорость: 12t | Вездеход + рвы</div>
            </div>
          </div>

          <!-- 2. WEAPON SYSTEMS -->
          <div class="section-label">2. БОЕВЫЕ СИСТЕМЫ (ОТ 1 ДО 3 МОДУЛЕЙ):</div>
          <div class="cards-grid" id="weaponGrid">
            <div class="select-card selected crimson-theme" data-weapon="${WeaponType.CANNON}">
              <div class="card-title">💥 ПУШКА</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[WeaponType.CANNON]} 💎</div>
              <div class="card-stock" id="stockWeapon_cannon">На складе: 0 шт.</div>
              <div class="card-stats">Дальность: 10 | Урон ×2</div>
            </div>
            <div class="select-card crimson-theme" data-weapon="${WeaponType.MISSILES}">
              <div class="card-title">🚀 РАКЕТЫ</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[WeaponType.MISSILES]} 💎</div>
              <div class="card-stock" id="stockWeapon_missiles">На складе: 0 шт.</div>
              <div class="card-stats">Дальность: 14 | Урон ×3</div>
            </div>
            <div class="select-card crimson-theme" data-weapon="${WeaponType.PHASERS}">
              <div class="card-title">⚡ ФАЗЕР</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[WeaponType.PHASERS]} 💎</div>
              <div class="card-stock" id="stockWeapon_phasers">На складе: 0 шт.</div>
              <div class="card-stats">Дальность: 10 | Урон ×4</div>
            </div>
            <div class="select-card crimson-theme" data-weapon="${WeaponType.NUCLEAR}">
              <div class="card-title">☢ ЯДЕРНЫЙ ЗАРЯД</div>
              <div class="card-cost">Стоимость: ${PIECE_COSTS[WeaponType.NUCLEAR]} 💎</div>
              <div class="card-stock" id="stockWeapon_nuclear">На складе: 0 шт.</div>
              <div class="card-stats">Радиус: 9×9 | Взрыв базы</div>
            </div>
          </div>

          <!-- 3. QUANTUM AI & PROTOCOLS -->
          <div class="sub-split-grid">
            <div>
              <div class="section-label">3. МОДУЛЬ ИИ:</div>
              <div class="select-card" id="cardElectronics">
                <div class="card-title">📡 КВАНТОВЫЙ ИИ (+${PIECE_COSTS.electronics} 💎)</div>
                <div class="card-stock" id="stockElectronics">На складе: 0 шт.</div>
                <div class="card-stats">+2 дальность фазеров, навигация A*</div>
              </div>
            </div>

            <div>
              <div class="section-label">4. ТАКТИЧЕСКИЙ ПРИКАЗ:</div>
              <div class="cards-grid" id="orderGrid" style="margin-bottom: 0;">
                <div class="select-card selected" data-order="${OrderType.SEARCH_AND_CAPTURE}">
                  <div class="card-title">🏴 ЗАХВАТ</div>
                  <div class="card-stats">Штурм фабрик</div>
                </div>
                <div class="select-card" data-order="${OrderType.ADVANCE}">
                  <div class="card-title">▶ В АТАКУ</div>
                  <div class="card-stats">Прорыв к базе</div>
                </div>
                <div class="select-card" data-order="${OrderType.SEARCH_AND_DESTROY}">
                  <div class="card-title">⚔ ОХОТА</div>
                  <div class="card-stats">Ликвидация</div>
                </div>
                <div class="select-card" data-order="${OrderType.STOP_AND_DEFEND}">
                  <div class="card-title">🛡 ОБОРОНА</div>
                  <div class="card-stats">Патруль</div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUMMARY & DEPLOY -->
          <div class="constructor-summary">
            <div class="summary-stats" id="constructorSummary">
              Стоимость: 7 💎 | Высота: 13/38
            </div>
            <button class="btn-deploy" id="btnDeployUnit">
              ▶ ЗАПУСТИТЬ РОБОТА
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.container = el;

    this.badgeChassis = el.querySelector('#badgeChassis')!;
    this.badgeWeapons = el.querySelector('#badgeWeapons')!;
    this.badgeAi = el.querySelector('#badgeAi')!;
    this.btnToggleRotate = el.querySelector('#btnToggleRotate')!;

    // Initialize 3D Preview Engine
    const previewCanvas = el.querySelector('#robotPreviewCanvas') as HTMLCanvasElement;
    this.previewRenderer = new RobotPreviewRenderer(previewCanvas);

    this.bindEvents();
    this.updateSummary();
  }

  private bindEvents(): void {
    // Backdrop click closes modal
    this.backdrop.addEventListener('click', () => {
      this.close();
    });

    // Close button
    this.container.querySelector('#btnCloseConstructor')!.addEventListener('click', () => {
      this.close();
    });

    // 3D Preview controls
    this.container.querySelector('#btnResetView')!.addEventListener('click', () => {
      this.previewRenderer.resetCamera();
    });

    this.btnToggleRotate.addEventListener('click', () => {
      const active = this.previewRenderer.toggleAutoRotate();
      this.btnToggleRotate.textContent = active ? '⏸ Вращение' : '▶ Вращение';
    });

    const btnToggleWalk = this.container.querySelector('#btnToggleWalk') as HTMLButtonElement;
    if (btnToggleWalk) {
      btnToggleWalk.addEventListener('click', () => {
        const walking = this.previewRenderer.toggleWalking();
        btnToggleWalk.textContent = walking ? '⏹ Стоп' : '🚶 Шаг';
        if (walking) {
          btnToggleWalk.style.borderColor = '#00f3ff';
          btnToggleWalk.style.color = '#00f3ff';
          btnToggleWalk.style.boxShadow = '0 0 10px rgba(0, 243, 255, 0.4)';
        } else {
          btnToggleWalk.style.borderColor = '';
          btnToggleWalk.style.color = '';
          btnToggleWalk.style.boxShadow = '';
        }
      });
    }

    // Chassis cards
    const chassisCards = this.container.querySelectorAll('#chassisGrid .select-card');
    chassisCards.forEach((c) => {
      c.addEventListener('click', () => {
        chassisCards.forEach((item) => item.classList.remove('selected'));
        c.classList.add('selected');
        this.selectedChassis = c.getAttribute('data-chassis') as ChassisType;
        this.updateSummary();
      });
    });

    // Weapon cards
    const weaponCards = this.container.querySelectorAll('#weaponGrid .select-card');
    weaponCards.forEach((w) => {
      w.addEventListener('click', () => {
        const type = w.getAttribute('data-weapon') as WeaponType;
        if (this.selectedWeapons.includes(type)) {
          if (this.selectedWeapons.length > 1) {
            this.selectedWeapons = this.selectedWeapons.filter((item) => item !== type);
            w.classList.remove('selected');
          }
        } else {
          if (this.selectedWeapons.length < 3) {
            this.selectedWeapons.push(type);
            w.classList.add('selected');
          }
        }
        this.updateSummary();
      });
    });

    // Electronics card
    const elecCard = this.container.querySelector('#cardElectronics')!;
    elecCard.addEventListener('click', () => {
      this.selectedElectronics = !this.selectedElectronics;
      if (this.selectedElectronics) elecCard.classList.add('selected');
      else elecCard.classList.remove('selected');
      this.updateSummary();
    });

    // Order cards
    const orderCards = this.container.querySelectorAll('#orderGrid .select-card');
    orderCards.forEach((o) => {
      o.addEventListener('click', () => {
        orderCards.forEach((item) => item.classList.remove('selected'));
        o.classList.add('selected');
        this.selectedOrder = Number(o.getAttribute('data-order')) as OrderType;
        this.updateSummary();
      });
    });

    // Deploy button
    this.container.querySelector('#btnDeployUnit')!.addEventListener('click', () => {
      this.deployUnit();
    });
  }

  private getBlueprint(): RobotBlueprint {
    return {
      chassis: this.selectedChassis,
      weapons: [...this.selectedWeapons],
      hasElectronics: this.selectedElectronics
    };
  }

  private updateSummary(): void {
    const bp = this.getBlueprint();
    const height = ConstructionValidator.calculateStackHeight(bp);
    const cost = ConstructionValidator.computeTotalCost(bp);
    const summary = this.container.querySelector('#constructorSummary')!;
    const btn = this.container.querySelector('#btnDeployUnit') as HTMLButtonElement;
    const res = this.economy.getResources(PlayerId.HUMAN);

    // Update 3D Preview
    this.previewRenderer.update(bp);

    // Update Hologram Diagnostic Badges
    const chassisNames: Record<ChassisType, string> = {
      [ChassisType.BIPOD]: 'ШАГОХОД',
      [ChassisType.TRACKS]: 'ГУСЕНИЦЫ',
      [ChassisType.ANTIGRAV]: 'АНТИГРАВ'
    };
    const weaponNames: Record<WeaponType, string> = {
      [WeaponType.CANNON]: 'ПУШКА',
      [WeaponType.MISSILES]: 'РАКЕТЫ',
      [WeaponType.PHASERS]: 'ФАЗЕР',
      [WeaponType.NUCLEAR]: 'ЯДЕРНЫЙ'
    };

    this.badgeChassis.textContent = `ПЛАТФОРМА: ${chassisNames[this.selectedChassis]}`;
    this.badgeWeapons.textContent = `ОРУЖИЕ: ${this.selectedWeapons.map((w) => weaponNames[w]).join(' + ')}`;
    this.badgeAi.textContent = this.selectedElectronics ? 'ИИ: КВАНТОВЫЙ A*' : 'ИИ: БАЗОВЫЙ';

    // 1. Update Warehouse Inventory Strip values
    const whGeneral = this.container.querySelector('#whGeneral');
    const whChassis = this.container.querySelector('#whChassis');
    const whCannons = this.container.querySelector('#whCannons');
    const whMissiles = this.container.querySelector('#whMissiles');
    const whPhasers = this.container.querySelector('#whPhasers');
    const whNuclear = this.container.querySelector('#whNuclear');
    const whElectronics = this.container.querySelector('#whElectronics');

    if (whGeneral) whGeneral.textContent = String(res.general);
    if (whChassis) whChassis.textContent = String(res.chassis);
    if (whCannons) whCannons.textContent = String(res.cannons);
    if (whMissiles) whMissiles.textContent = String(res.missiles);
    if (whPhasers) whPhasers.textContent = String(res.phasers);
    if (whNuclear) whNuclear.textContent = String(res.nuclear);
    if (whElectronics) whElectronics.textContent = String(res.electronics);

    const setWhStyle = (id: string, count: number) => {
      const el = this.container.querySelector(id);
      if (el) {
        if (count > 0) el.classList.add('in-stock');
        else el.classList.remove('in-stock');
      }
    };
    setWhStyle('#whItemChassis', res.chassis);
    setWhStyle('#whItemCannons', res.cannons);
    setWhStyle('#whItemMissiles', res.missiles);
    setWhStyle('#whItemPhasers', res.phasers);
    setWhStyle('#whItemNuclear', res.nuclear);
    setWhStyle('#whItemElectronics', res.electronics);

    // 2. Update stock badges on selection cards
    const setStock = (selector: string, count: number) => {
      const el = this.container.querySelector(selector);
      if (el) {
        if (count > 0) {
          el.className = 'card-stock in-stock';
          el.innerHTML = `✔ На складе: <b>${count} шт.</b>`;
        } else {
          el.className = 'card-stock';
          el.textContent = `На складе: 0 шт. (оплата 💎)`;
        }
      }
    };

    setStock('#stockChassis_bipod', res.chassis);
    setStock('#stockChassis_tracks', res.chassis);
    setStock('#stockChassis_antigrav', res.chassis);
    setStock('#stockWeapon_cannon', res.cannons);
    setStock('#stockWeapon_missiles', res.missiles);
    setStock('#stockWeapon_phasers', res.phasers);
    setStock('#stockWeapon_nuclear', res.nuclear);
    setStock('#stockElectronics', res.electronics);

    // 3. Compute detailed cost breakdown (Warehouse parts vs Treasury crystals)
    const simPool = { ...res };
    const pieces: (ChassisType | WeaponType | ModuleType)[] = [
      bp.chassis,
      ...bp.weapons
    ];
    if (bp.hasElectronics) pieces.push(ModuleType.ELECTRONICS);

    let partsFromWarehouse = 0;
    let crystalsFromTreasury = 0;
    const missingParts: string[] = [];

    for (const piece of pieces) {
      const cost = PIECE_COSTS[piece];
      let poolKey: keyof typeof simPool;
      let pieceName: string;
      if (piece === ChassisType.BIPOD || piece === ChassisType.TRACKS || piece === ChassisType.ANTIGRAV) {
        poolKey = 'chassis';
        pieceName = chassisNames[piece as ChassisType];
      } else if (piece === WeaponType.CANNON) {
        poolKey = 'cannons';
        pieceName = 'Пушка';
      } else if (piece === WeaponType.MISSILES) {
        poolKey = 'missiles';
        pieceName = 'Ракеты';
      } else if (piece === WeaponType.PHASERS) {
        poolKey = 'phasers';
        pieceName = 'Фазер';
      } else if (piece === WeaponType.NUCLEAR) {
        poolKey = 'nuclear';
        pieceName = 'Ядерный заряд';
      } else {
        poolKey = 'electronics';
        pieceName = 'Квантовый ИИ';
      }

      if (simPool[poolKey] >= cost) {
        simPool[poolKey] -= cost;
        partsFromWarehouse += 1;
      } else {
        const shortfall = cost - simPool[poolKey];
        if (simPool[poolKey] > 0) {
          partsFromWarehouse += 1;
          simPool[poolKey] = 0;
        }
        if (simPool.general >= shortfall) {
          simPool.general -= shortfall;
          crystalsFromTreasury += shortfall;
        } else {
          missingParts.push(`${pieceName} (на складе: ${res[poolKey]} шт., не хватает ${shortfall - simPool.general} 💎)`);
          simPool.general = 0;
        }
      }
    }

    const check = ConstructionValidator.canBuild(PlayerId.HUMAN, bp, this.economy, 0);
    if (!check.canBuild || missingParts.length > 0) {
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      btn.disabled = true;
      const reasonText = missingParts.length > 0
        ? `Недостаточно деталей: ${missingParts.join(', ')}`
        : (check.reason || `Недостаточно ресурсов: требуется ${cost.totalCost} 💎 (в казне: ${res.general} 💎)`);
      summary.innerHTML = `<span style="color: var(--crimson); font-weight: 700;">⚠ ${reasonText}</span>`;
    } else {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.disabled = false;
      const whInfo = partsFromWarehouse > 0 ? ` | <span style="color: var(--emerald);">Со склада: ${partsFromWarehouse} дет.</span>` : '';
      summary.innerHTML = `Списание: <b style="color: var(--cyan);">${crystalsFromTreasury} 💎</b>${whInfo} | Модули: <b>${height}/38</b> | В казне останется: <b style="color: var(--amber);">${simPool.general} 💎</b>`;
    }
  }

  private deployUnit(): void {
    const bp = this.getBlueprint();
    const check = ConstructionValidator.canBuild(PlayerId.HUMAN, bp, this.economy, 0);
    if (!check.canBuild) {
      const summary = this.container.querySelector('#constructorSummary')!;
      summary.innerHTML = `<span style="color: var(--crimson); font-weight: 700;">⚠ ${check.reason || 'Недостаточно деталей или ресурсов!'}</span>`;
      return;
    }

    // Purchase pieces
    this.economy.purchasePiece(PlayerId.HUMAN, bp.chassis);
    for (const w of bp.weapons) {
      this.economy.purchasePiece(PlayerId.HUMAN, w);
    }
    if (bp.hasElectronics) {
      this.economy.purchasePiece(PlayerId.HUMAN, ModuleType.ELECTRONICS);
    }

    const newRobot: ActiveRobot = {
      id: this.nextRobotId++,
      owner: PlayerId.HUMAN,
      blueprint: bp,
      stackHeight: ConstructionValidator.calculateStackHeight(bp),
      x: 21,
      y: 107, // Exit into open planetary terrain near Alliance base
      altitude: 0,
      strength: 100,
      facing: 0, // East
      order: this.selectedOrder,
      orderParam: 0,
      isDestroyed: false,
      walkOutStepsRemaining: 2,
      currentMoveTicksRemaining: 0
    };

    this.close();
    if (this.onLaunchCallback) this.onLaunchCallback(newRobot);
  }

  public open(onLaunch: (robot: ActiveRobot) => void, onExit: () => void): void {
    this.onLaunchCallback = onLaunch;
    this.onExitCallback = onExit;
    this.backdrop.classList.add('active');
    this.container.classList.add('active');

    // Start 3D preview render loop and refresh blueprint
    this.previewRenderer.start();
    this.updateSummary();

    // Trigger canvas resize after CSS modal transition
    setTimeout(() => {
      this.previewRenderer.resize();
    }, 60);
  }

  public close(): void {
    this.previewRenderer.stop();
    this.backdrop.classList.remove('active');
    this.container.classList.remove('active');
    if (this.onExitCallback) this.onExitCallback();
  }

  public isOpen(): boolean {
    return this.container.classList.contains('active');
  }
}
