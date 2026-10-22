import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  GlowLayer,
  ArcRotateCamera,
  TransformNode,
  DefaultRenderingPipeline,
  PointerEventTypes
} from '@babylonjs/core';
import { GameMap } from '../sim/mapData.ts';
import { EconomyManager } from '../sim/economy.ts';
import { Commander, CommanderState } from '../sim/Commander.ts';
import { ActiveRobot } from '../sim/Construction.ts';
import { RobotMovementSystem } from '../sim/RobotMovement.ts';
import { CombatSystem } from '../sim/combat.ts';
import { CaptureSystem } from '../sim/capture.ts';
import { NuclearDetonationSystem } from '../sim/nuclear.ts';
import { BaseAIGeneral } from '../sim/enemyAI.ts';
import { SoundManager } from '../audio/SoundManager.ts';
import { InputManager } from './InputManager.ts';
import { MapRenderer } from '../render/MapRenderer.ts';
import { BuildingRenderer } from '../render/BuildingRenderer.ts';
import { CommanderRenderer } from '../render/CommanderRenderer.ts';
import { RobotMeshBuilder } from '../render/RobotMeshBuilder.ts';
import { ProjectilesRenderer } from '../render/ProjectilesRenderer.ts';
import { ModernConstructor } from '../ui/ModernConstructor.ts';
import { ModernHUD } from '../ui/ModernHUD.ts';
import { WeaponType, PlayerId, OrderType, StructureType, GameMode } from '../sim/types.ts';
import { MAP_LENGTH, MAP_WIDTH, WEAPON_CONFIG } from '../sim/constants.ts';

export class GameApp {
  public engine: Engine;
  public scene: Scene;
  public camera: ArcRotateCamera;
  public glowLayer: GlowLayer;
  public pipeline: DefaultRenderingPipeline;

  // Simulation Systems
  public map: GameMap;
  public economy: EconomyManager;
  public commander: Commander;
  public input: InputManager;
  public combat: CombatSystem;
  public enemyAI: BaseAIGeneral;
  public allianceAI: BaseAIGeneral;
  public gameMode: GameMode = GameMode.HUMAN_VS_AI;
  public sound: SoundManager;
  public robots: ActiveRobot[] = [];

  // Renderers & UI
  public mapRenderer: MapRenderer;
  public buildingRenderer: BuildingRenderer;
  public commanderRenderer: CommanderRenderer;
  public robotMeshBuilder: RobotMeshBuilder;
  public projectilesRenderer: ProjectilesRenderer;
  public constructorUI: ModernConstructor;
  public hud: ModernHUD;
  public robotMeshes: Map<number, TransformNode> = new Map();
  public selectedRobot: ActiveRobot | null = null;

  private isConstructionOpen: boolean = false;
  private shakeTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.03, 0.04, 0.07, 1.0);
    this.scene.ambientColor = new Color3(0.08, 0.1, 0.15);

    // Isometric-style RTS Camera
    this.camera = new ArcRotateCamera(
      'rtsCamera',
      -Math.PI / 2.8,
      Math.PI / 3.4,
      45,
      new Vector3(18, 0, 110),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 12;
    this.camera.upperRadiusLimit = 160;
    this.camera.wheelPrecision = 15;
    this.camera.lowerBetaLimit = 0.2; // ~11 degrees: comfortable top-down angle, prevents upside-down flip
    this.camera.upperBetaLimit = Math.PI / 2.2; // ~81 degrees: low horizon angle, prevents camera going underground

    // Atmospheric Planetary Fog (Soft dust haze, not blinding!)
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0035;
    this.scene.fogColor = new Color3(0.11, 0.13, 0.17);

    // Warm Planetary Sunlight (Golden-hour desert sun)
    const ambientLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.65;
    ambientLight.diffuse = new Color3(0.35, 0.42, 0.52);
    ambientLight.groundColor = new Color3(0.12, 0.1, 0.1);

    const sunLight = new DirectionalLight(
      'sunLight',
      new Vector3(-0.6, -0.9, -0.5),
      this.scene
    );
    sunLight.position = new Vector3(40, 80, 80);
    sunLight.intensity = 1.5;
    sunLight.diffuse = new Color3(1.0, 0.92, 0.82);

    // Soft, Controlled Glow (no radioactive neon haze)
    this.glowLayer = new GlowLayer('glow', this.scene, {
      mainTextureFixedSize: 512,
      blurKernelSize: 16
    });
    this.glowLayer.intensity = 0.25;

    // Cinematic Post-Processing Pipeline
    this.pipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR
      this.scene,
      [this.camera]
    );
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.88; // Only very bright thrusters / laser beams bloom
    this.pipeline.bloomWeight = 0.2;
    this.pipeline.bloomKernel = 16;
    this.pipeline.bloomScale = 0.5;

    this.pipeline.chromaticAberrationEnabled = true;
    this.pipeline.chromaticAberration.aberrationAmount = 1.0;

    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = 1.2;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = 1; // ACES

    // Initialize Simulation Core
    this.map = new GameMap();
    this.economy = new EconomyManager();
    this.commander = new Commander(18, 110, 8);
    this.input = new InputManager();
    this.combat = new CombatSystem();
    this.enemyAI = new BaseAIGeneral(PlayerId.INSIGNIAN, 220);
    this.allianceAI = new BaseAIGeneral(PlayerId.HUMAN, 240);
    this.sound = new SoundManager();

    // Check optional URL game mode (?mode=auto or ?mode=aivsai)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'auto' || urlParams.get('mode') === 'aivsai') {
        this.gameMode = GameMode.AI_VS_AI;
      }
    } catch (_e) {
      // Ignore in non-browser environments
    }
    this.allianceAI.enabled = (this.gameMode === GameMode.AI_VS_AI);

    // Initialize Renderers & UI
    this.mapRenderer = new MapRenderer(this.scene, this.map);
    this.buildingRenderer = new BuildingRenderer(this.scene);
    this.buildingRenderer.renderStructures(this.map.warbases, this.map.factories);
    this.commanderRenderer = new CommanderRenderer(this.scene, this.camera);
    this.robotMeshBuilder = new RobotMeshBuilder(this.scene);
    this.projectilesRenderer = new ProjectilesRenderer(this.scene);
    this.hud = new ModernHUD();
    this.constructorUI = new ModernConstructor(this.economy);

    // Game Mode toggle listener
    this.hud.updateGameMode(this.gameMode);
    this.hud.onToggleModeClick = () => {
      this.toggleGameMode();
    };

    // Direct click on HUD button opens constructor
    this.hud.onOpenConstructorClick = () => {
      if (!this.isConstructionOpen) {
        this.openConstructionScreen();
      }
    };

    // Minimap click navigation
    this.hud.minimap.onPan((worldX, worldY) => {
      this.camera.target.x = Math.max(4, Math.min(MAP_LENGTH - 4, worldX));
      this.camera.target.z = Math.max(4, Math.min(MAP_WIDTH - 4, worldY));
      this.commander.x = this.camera.target.x;
      this.commander.y = this.camera.target.z;
    });

    // Unit Quick Order buttons from HUD
    this.hud.onOrderSelected = (order) => {
      if (this.selectedRobot && !this.selectedRobot.isDestroyed) {
        this.selectedRobot.order = order;
        delete this.selectedRobot.targetX;
        delete this.selectedRobot.targetY;
        this.hud.showNotification(`Приказ роботу #${this.selectedRobot.id} обновлён`, 'var(--emerald)');
      }
    };

    this.hud.onTakeControlClick = () => {
      this.toggleDirectControl();
    };

    // Hotkeys: [B] Constructor, [E] Direct Control, [Esc] Close / Deselect
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'KeyB' || e.key === 'b' || e.key === 'и' || e.key === 'И') && !this.isConstructionOpen) {
        this.openConstructionScreen();
      } else if (e.code === 'KeyE' || e.key === 'e' || e.key === 'у' || e.key === 'У') {
        if (!this.isConstructionOpen) {
          this.toggleDirectControl();
        }
      } else if (e.code === 'Escape') {
        if (this.isConstructionOpen) {
          this.constructorUI.close();
        } else if (this.commander.state === CommanderState.DOCKED_ROBOT) {
          this.commander.exitRobot();
          this.hud.showNotification('Возврат в свободный RTS-обзор камеры', 'var(--cyan)');
        } else {
          this.selectedRobot = null;
          this.commanderRenderer.updateSelection(null);
        }
      }
    });

    // 3D Scene Click Selection & Orders
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const evt = pointerInfo.event as MouseEvent;
        if (this.isConstructionOpen) return;

        const pick = pointerInfo.pickInfo;
        if (pick && pick.hit && pick.pickedMesh) {
          const meshName = pick.pickedMesh.name;

          // Click on Warbase -> open Constructor!
          if (meshName.startsWith('wb_') || meshName.startsWith('warbase_')) {
            const base = this.map.warbases.find((b) => b.owner === PlayerId.HUMAN && !b.isDestroyed);
            if (base) {
              this.openConstructionScreen();
              return;
            }
          }

          // Check if clicked near a robot
          let clickedRobot: ActiveRobot | null = null;
          for (const r of this.robots) {
            if (r.isDestroyed) continue;
            const d = Math.hypot(r.x + 1 - pick.pickedPoint!.x, r.y + 1 - pick.pickedPoint!.z);
            if (d < 2.0) {
              clickedRobot = r;
              break;
            }
          }

          if (clickedRobot) {
            if (clickedRobot.owner === PlayerId.HUMAN) {
              this.selectedRobot = clickedRobot;
              this.commanderRenderer.updateSelection(this.selectedRobot);
              this.sound.playLaser();
              this.hud.showNotification(`Выбран боевой дрон #${clickedRobot.id}`, 'var(--cyan)');
            } else if (this.selectedRobot) {
              // Target enemy with selected robot
              this.selectedRobot.order = OrderType.SEARCH_AND_DESTROY;
              this.hud.showNotification(`Дрону #${this.selectedRobot.id} отдан приказ атаковать цель!`, 'var(--amber)');
            }
            return;
          }

          // Right click on ground: command selected robot to move to clicked position
          if (evt.button === 2 && this.selectedRobot && pick.pickedPoint) {
            let targetX = Math.max(2, Math.min(MAP_LENGTH - 3, Math.round(pick.pickedPoint.x - 1)));
            let targetY = Math.max(2, Math.min(MAP_WIDTH - 3, Math.round(pick.pickedPoint.z - 1)));

            // If player clicked on or near a factory structure, steer directly into its interior entrance bay!
            const clickedFactory = this.map.factories.find(f => Math.hypot(f.x - targetX, f.y - targetY) <= 2.2);
            if (clickedFactory) {
              targetX = clickedFactory.x;
              targetY = clickedFactory.y + 1;
            }

            // If player clicked on or near a warbase, steer directly into its capture courtyard!
            const clickedWarbase = this.map.warbases.find(b => Math.hypot(b.x - targetX, b.y - targetY) <= 3.5);
            if (clickedWarbase) {
              targetX = clickedWarbase.x;
              targetY = clickedWarbase.y <= 64 ? clickedWarbase.y + 2 : clickedWarbase.y - 2;
            }

            this.selectedRobot.targetX = targetX;
            this.selectedRobot.targetY = targetY;
            this.sound.playLaser();
            this.hud.showNotification(`Дрону #${this.selectedRobot.id} отдан приказ следовать в [${targetX}, ${targetY}]`, 'var(--cyan)');
          }
        }
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private toggleDirectControl(): void {
    if (this.commander.state === CommanderState.DOCKED_ROBOT) {
      this.commander.exitRobot();
      this.hud.showNotification('Возврат в свободный RTS-обзор камеры', 'var(--cyan)');
    } else if (this.selectedRobot && !this.selectedRobot.isDestroyed) {
      this.commander.state = CommanderState.DOCKED_ROBOT;
      this.commander.dockedEntityId = this.selectedRobot.id;
      this.hud.showNotification(`ШТУРВАЛ АКТИВИРОВАН: прямое управление роботом #${this.selectedRobot.id}`, 'var(--amber)');
    } else {
      const firstRobot = this.robots.find((r) => r.owner === PlayerId.HUMAN && !r.isDestroyed);
      if (firstRobot) {
        this.selectedRobot = firstRobot;
        this.commanderRenderer.updateSelection(firstRobot);
        this.commander.state = CommanderState.DOCKED_ROBOT;
        this.commander.dockedEntityId = firstRobot.id;
        this.hud.showNotification(`ШТУРВАЛ АКТИВИРОВАН: прямое управление роботом #${firstRobot.id}`, 'var(--amber)');
      } else {
        this.hud.showNotification('⚠ Нет активных роботов для штурвала. Постройте робота [B]!', 'var(--crimson)');
      }
    }
  }

  public start(): void {
    let lastTime = performance.now();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Camera Navigation & Robot Control
      if (!this.isConstructionOpen) {
        if (this.commander.state === CommanderState.DOCKED_ROBOT && this.commander.dockedEntityId) {
          // Direct control mode: camera tracks robot, WASD drives robot
          const dockedRobot = this.robots.find((r) => r.id === this.commander.dockedEntityId && !r.isDestroyed);
          if (dockedRobot) {
            const { driveX, driveY } = this.input.getRobotDriveVector(this.camera.alpha);
            if (driveX !== 0 || driveY !== 0) {
              const stepX = Math.abs(driveX) > 0.35 ? (driveX > 0 ? 1 : -1) : 0;
              const stepY = Math.abs(driveY) > 0.35 ? (driveY > 0 ? 1 : -1) : 0;
              dockedRobot.targetFacingAngle = Math.atan2(driveX, driveY);

              if (stepX !== 0 || stepY !== 0) {
                RobotMovementSystem.step(dockedRobot, stepX, stepY, this.map);
              }
            }

            if (this.input.isFirePressed()) {
              if (!dockedRobot.weaponCooldown || dockedRobot.weaponCooldown <= 0) {
                const weaponsToFire = dockedRobot.blueprint.weapons.filter((w) => w !== WeaponType.NUCLEAR);
                if (weaponsToFire.length > 0) {
                  let hasMissiles = false;
                  let hasLasers = false;
                  const count = weaponsToFire.length;
                  weaponsToFire.forEach((w, idx) => {
                    let offsetPerp = 0;
                    if (count === 2) offsetPerp = idx === 0 ? -0.28 : 0.28;
                    else if (count >= 3) offsetPerp = idx === 0 ? -0.38 : idx === 1 ? 0 : 0.38;

                    this.combat.fireWeapon(dockedRobot, w, undefined, undefined, offsetPerp);
                    if (w === WeaponType.MISSILES) hasMissiles = true;
                    else hasLasers = true;
                  });
                  if (hasMissiles) this.sound.playMissile();
                  if (hasLasers) this.sound.playLaser();
                  dockedRobot.weaponCooldown = hasMissiles ? 0.65 : 0.55;
                }
              }
            }

            // Smooth camera lock onto driven robot
            this.camera.target.x = dockedRobot.x + 1;
            this.camera.target.z = dockedRobot.y + 1;
            this.commander.x = dockedRobot.x;
            this.commander.y = dockedRobot.y;
          } else {
            this.commander.exitRobot();
          }
        } else {
          // Free RTS Camera Pan (WASD, Arrows, Edge-pan, Drag) - camera orientation aware!
          const { panX, panZ } = this.input.getCameraPanVector(this.camera.alpha);
          const panSpeed = 48;
          this.camera.target.x = Math.max(4, Math.min(MAP_LENGTH - 4, this.camera.target.x + panX * panSpeed * delta));
          this.camera.target.z = Math.max(4, Math.min(MAP_WIDTH - 4, this.camera.target.z + panZ * panSpeed * delta));
          this.commander.x = this.camera.target.x;
          this.commander.y = this.camera.target.z;
        }

        // Selection ring visual update
        this.commanderRenderer.updateSelection(this.selectedRobot);
      }

      // 2. Update AI Generals
      this.enemyAI.update(this.map, this.economy, this.robots, (enemyRobot) => {
        this.spawnRobot(enemyRobot);
      });

      if (this.gameMode === GameMode.AI_VS_AI) {
        this.allianceAI.update(this.map, this.economy, this.robots, (allianceRobot) => {
          this.spawnRobot(allianceRobot);
        });
      }

      // Update Robots Movement & Autonomous Combat
      for (const robot of this.robots) {
        if (robot.isDestroyed) continue;

        // Skip autonomous movement if human is in Direct Control of this robot
        if (this.commander.state === CommanderState.DOCKED_ROBOT && this.commander.dockedEntityId === robot.id) {
          // Autonomous movement skipped
        } else {
          RobotMovementSystem.updateRobot(robot, this.map, this.robots);
        }

        // Update 3D mesh
        const meshNode = this.robotMeshes.get(robot.id);
        if (meshNode) {
          const targetPos = new Vector3(robot.x + 1, robot.altitude * 0.35, robot.y + 1);
          const distToTarget = Vector3.Distance(meshNode.position, targetPos);
          let isMoving = distToTarget > 0.03;

          if (this.commander.state === CommanderState.DOCKED_ROBOT && this.commander.dockedEntityId === robot.id) {
            const { driveX, driveY } = this.input.getRobotDriveVector(this.camera.alpha);
            if (driveX !== 0 || driveY !== 0) isMoving = true;
          } else if (robot.targetX !== undefined && robot.targetY !== undefined) {
            if (robot.targetX !== robot.x || robot.targetY !== robot.y) {
              isMoving = true;
            }
          }

          meshNode.position = Vector3.Lerp(meshNode.position, targetPos, Math.min(1.0, delta * 10));

          const cardinalAngles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
          const targetAngle = robot.targetFacingAngle !== undefined ? robot.targetFacingAngle : cardinalAngles[robot.facing % 4];

          // Smooth shortest-arc rotation towards target or movement orientation
          let angleDiff = targetAngle - meshNode.rotation.y;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) < 0.02) {
            meshNode.rotation.y = targetAngle;
          } else {
            meshNode.rotation.y += angleDiff * Math.min(1.0, delta * 12);
          }
          while (meshNode.rotation.y < -Math.PI) meshNode.rotation.y += Math.PI * 2;
          while (meshNode.rotation.y > Math.PI) meshNode.rotation.y -= Math.PI * 2;

          // Animate articulated chassis (legs walk cycle, tracks rumble, antigrav float)
          this.robotMeshBuilder.animate(robot.id, delta, isMoving);

          // Update dynamic protection indicators (floating health bar + contracting ground ring)
          this.robotMeshBuilder.updateHealth(robot.id, robot.strength, robot.owner);
        }

        // Autonomous combat: check hostile targets in range
        this.processRobotCombat(robot, delta);
      }

      // Update Projectiles & Hits
      this.combat.updateProjectiles(this.robots, this.map, (target, _damage) => {
        this.sound.playExplosion();
        if (target.isDestroyed) {
          const ownerName = target.owner === PlayerId.HUMAN ? 'Ваш робот' : 'Вражеский робот';
          this.hud.showNotification(
            `💥 ${ownerName} #${target.id} уничтожен в бою!`,
            target.owner === PlayerId.HUMAN ? '#ff3355' : '#00ffaa'
          );
        }
      });
      this.projectilesRenderer.update(this.combat.projectiles);

      // Clean up destroyed robot meshes
      for (const robot of this.robots) {
        if (robot.isDestroyed) {
          const meshNode = this.robotMeshes.get(robot.id);
          if (meshNode) {
            this.robotMeshBuilder.removeRobotMesh(meshNode);
            this.robotMeshes.delete(robot.id);
          }
        }
      }

      // Update Factory & Warbase Continuous Captures
      const allStructures = [...this.map.warbases, ...this.map.factories];
      CaptureSystem.updateCapture(
        allStructures,
        this.robots,
        (structure, newOwner) => {
          this.buildingRenderer.updateBuildingOwnership(structure.id, newOwner);
          this.sound.playCapture();
          const team = newOwner === PlayerId.HUMAN ? 'АЛЬЯНС' : 'ИНСИГНИЯ';
          const color = newOwner === PlayerId.HUMAN ? '#00f0ff' : '#ff3355';
          if (structure.type === StructureType.WARBASE) {
            if (structure.id === 103 && newOwner === PlayerId.HUMAN) {
              this.hud.showNotification('🎉 ПОБЕДА! ГЛАВНАЯ ЦИТАДЕЛЬ ИНСИГНИИ ЗАХВАЧЕНА!', '#00f0ff');
            } else if (structure.id === 100 && newOwner === PlayerId.INSIGNIAN) {
              this.hud.showNotification('💥 ПОРАЖЕНИЕ! НАША ВОЕННАЯ БАЗА ЗАХВАЧЕНА ИНСИГНИЕЙ!', '#ff3355');
            } else {
              this.hud.showNotification(`🚩 [${team}] ЗАХВАТИЛ ВОЕННУЮ БАЗУ #${structure.id}!`, color);
            }
          } else {
            this.hud.showNotification(`🚩 [${team}] ЗАХВАТИЛ ОБЪЕКТ #${structure.id}!`, color);
          }
        },
        (info) => {
          this.buildingRenderer.updateCaptureVisual(info.structureId, info.progressRatio, info.occupyingTeam);
        }
      );

      // Update kinetic architecture animations
      this.buildingRenderer.update(delta);

      // Advance Economy (20 ticks per second)
      this.economy.update(1, this.map.warbases, this.map.factories);

      // Camera screen shake upon explosions
      if (this.shakeTimer > 0) {
        this.camera.target.x += (Math.random() - 0.5) * 0.5;
        this.camera.target.z += (Math.random() - 0.5) * 0.5;
        this.shakeTimer -= delta;
      }

      // Update HUD
      const activeHumanRobots = this.robots.filter((r) => r.owner === PlayerId.HUMAN && !r.isDestroyed).length;
      this.hud.update(this.economy, this.commander, this.map, this.robots, activeHumanRobots, this.selectedRobot);

      // Render 3D Scene
      this.scene.render();
    });
  }

  private processRobotCombat(robot: ActiveRobot, delta: number): void {
    if (robot.weaponCooldown !== undefined && robot.weaponCooldown > 0) {
      robot.weaponCooldown -= delta;
      return;
    }

    // Nuclear robot detonates upon reaching target area
    if (robot.blueprint.weapons.includes(WeaponType.NUCLEAR)) {
      const nearStructure = [...this.map.warbases, ...this.map.factories].some(
        (s) => !s.isDestroyed && s.owner !== robot.owner && Math.abs(s.x - robot.x) <= 3 && Math.abs(s.y - robot.y) <= 3
      );
      if (nearStructure) {
        NuclearDetonationSystem.detonate(robot, this.robots, this.map, (destroyedBldg) => {
          this.buildingRenderer.updateBuildingOwnership(destroyedBldg.id, PlayerId.NEUTRAL);
        });
        this.sound.playNuke();
        this.shakeTimer = 1.2;
        this.pipeline.chromaticAberration.aberrationAmount = 20.0;
        setTimeout(() => {
          this.pipeline.chromaticAberration.aberrationAmount = 2.0;
        }, 1200);
        return;
      }
    }

    // Filter all conventional weapons mounted on this robot
    const nonNuclearWeapons = robot.blueprint.weapons.filter((w) => w !== WeaponType.NUCLEAR);
    if (nonNuclearWeapons.length === 0) return;

    const bonusRange = robot.blueprint.hasElectronics ? 2 : 0;
    let maxWeaponRange = 0;
    for (const w of nonNuclearWeapons) {
      const cfg = WEAPON_CONFIG[w];
      if (cfg && cfg.range + bonusRange > maxWeaponRange) {
        maxWeaponRange = cfg.range + bonusRange;
      }
    }

    // Conventional weapons: find closest hostile robot within maximum effective range
    let target: ActiveRobot | null = null;
    let minDist = Infinity;
    for (const other of this.robots) {
      if (other.isDestroyed || other.owner === robot.owner) continue;
      const d = Math.hypot(other.x - robot.x, other.y - robot.y);
      if (d <= maxWeaponRange && d < minDist) {
        minDist = d;
        target = other;
      }
    }

    if (target) {
      // Only orient to enemy if not currently marching towards an explicit player waypoint
      if (robot.targetX === undefined && robot.targetY === undefined) {
        const dx = target.x - robot.x;
        const dy = target.y - robot.y;
        robot.targetFacingAngle = Math.atan2(dx, dy);

        if (Math.abs(dx) >= Math.abs(dy)) {
          robot.facing = dx > 0 ? 0 : 2;
        } else {
          robot.facing = dy > 0 ? 1 : 3;
        }
      }

      // Fire ALL mounted weapons whose individual range reaches the target (Salvo Fire)!
      const weaponsToFire = nonNuclearWeapons.filter((w) => {
        const cfg = WEAPON_CONFIG[w];
        return cfg && (cfg.range + bonusRange) >= minDist;
      });

      if (weaponsToFire.length > 0) {
        let hasMissiles = false;
        let hasLasers = false;
        const count = weaponsToFire.length;

        weaponsToFire.forEach((weapon, idx) => {
          // Spread projectiles laterally so the multi-weapon salvo is clearly visible in 3D
          let offsetPerp = 0;
          if (count === 2) {
            offsetPerp = idx === 0 ? -0.28 : 0.28;
          } else if (count >= 3) {
            offsetPerp = idx === 0 ? -0.38 : idx === 1 ? 0 : 0.38;
          }

          this.combat.fireWeapon(robot, weapon, target!.x, target!.y, offsetPerp);
          if (weapon === WeaponType.MISSILES) hasMissiles = true;
          else hasLasers = true;
        });

        if (hasMissiles) this.sound.playMissile();
        if (hasLasers) this.sound.playLaser();

        // Salvo reload cadence
        robot.weaponCooldown = hasMissiles ? 0.65 : 0.55;
      }
    }
  }

  public openConstructionScreen(): void {
    this.isConstructionOpen = true;
    this.constructorUI.open(
      (newRobot: ActiveRobot) => {
        this.spawnRobot(newRobot);
        this.isConstructionOpen = false;
        this.commander.exitWarbase();
        this.selectedRobot = newRobot;
        this.commanderRenderer.updateSelection(newRobot);
        this.camera.target.x = newRobot.x + 1;
        this.camera.target.z = newRobot.y + 1;
        this.hud.showNotification(`★ БОЕВОЙ ДРОН #${newRobot.id} РАЗВЁРНУТ И ВЫШЕЛ В БОЙ ★`, 'var(--emerald)');
        this.sound.playLaser();
      },
      () => {
        this.isConstructionOpen = false;
        this.commander.exitWarbase();
      }
    );
  }

  private spawnRobot(robot: ActiveRobot): void {
    this.robots.push(robot);
    const meshNode = this.robotMeshBuilder.buildRobotMesh(
      robot.id,
      robot.blueprint,
      robot.owner
    );
    meshNode.position.set(robot.x + 1, robot.altitude * 0.35, robot.y + 1);
    this.robotMeshBuilder.updateRobotFacing(meshNode, robot.facing);
    this.robotMeshes.set(robot.id, meshNode);
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    this.allianceAI.enabled = (this.gameMode === GameMode.AI_VS_AI);
    this.hud.updateGameMode(this.gameMode);
  }

  public toggleGameMode(): void {
    const newMode = this.gameMode === GameMode.HUMAN_VS_AI ? GameMode.AI_VS_AI : GameMode.HUMAN_VS_AI;
    this.setGameMode(newMode);
  }
}
