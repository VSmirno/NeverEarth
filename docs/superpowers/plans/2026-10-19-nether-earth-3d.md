# Nether Earth 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a faithful, high-performance 3D web remake of the 1987 tactical RTS classic *Nether Earth* on **Babylon.js 7 + TypeScript + Vite**, preserving exact Z80 original formulas, 512×16 map layout, modular robot construction, factory capture, and real-time commander control.

**Architecture:** Pure decoupled architecture:
1. `src/sim/` — Deterministic headless Simulation Engine running at authoritative 20 Hz tick rate (independent of rendering, 100% testable via Vitest).
2. `src/render/` — Babylon.js 3D Presentation Layer (PBR materials, GlowLayer, procedural Sci-Fi low-poly meshes, particle systems, camera tracking).
3. `src/ui/` — Retro-futuristic cyberpunk HUD and modal Robot Assembly screen.
4. `src/audio/` — Web Audio API procedural sound synthesizer (lasers, engines, explosions).

**Tech Stack:** 
- TypeScript, Vite
- Babylon.js 7 (`@babylonjs/core`, `@babylonjs/gui`)
- Vitest for simulation unit & formula tests

**Spec:** Original 1987 ZX Spectrum annotated disassembly by Santiago Ontañón (`santiontanon/netherearth-disassembly`) and authoritative specification (`AndyTheFactory/nether_earth/_specs/functional-spec.md`).

---

## Global Constraints
- **Tile Grid:** Map is strictly 512 × 16 cells (1 cell = 0.5 miles; 2 cells = 1 mile).
- **Physical Footprint:** Robots, Commander, and Bullets are 2×2 cell bodies.
- **Tick Rate:** Authoritative 20 Hz (1 tick = 50ms; 4 ticks = 1 Spectrum cycle; 1440 ticks = 12 in-game hours / capture time; 2880 ticks = 1 in-game day).
- **Damage Formula:** `floor((60 - (robot_height + ground_height)) / 4) * multiplier` (Cannon=2, Missile=3, Phaser=4).
- **Component Limits:** Exactly 1 chassis (Bipod, Tracks, Anti-Grav), 1–3 weapons (Cannon, Missiles, Phasers, Nuclear), optional Electronics. Max 24 robots per player.

---

## Tasks

### Task 1: Project Scaffolding & Engine Bootstrap
**Deliverable:** Configured Vite + TypeScript + Babylon.js 7 project with Vitest test harness and running empty 3D scene.

- [x] Initialize project with `package.json`, `tsconfig.json`, `vite.config.ts`.
- [x] Install dependencies: `@babylonjs/core`, `@babylonjs/gui`, `vitest`.
- [x] Create `index.html` with full-screen canvas `#renderCanvas`.
- [x] Create `src/core/Engine.ts`: initializes Babylon `Engine`, `Scene`, PBR default pipeline with `GlowLayer`, ambient and directional light, isometric `ArcRotateCamera`.
- [x] Verify test runner works with a smoke test in `tests/smoke.test.ts`.
- [x] Verify build passes with `npm run build`.

---

### Task 2: Simulation Core: Types, Map Layout & Economy
**Deliverable:** Headless data model defining terrain, 24 factories, 4 warbases, resources, and daily production cycle with 100% test coverage.

- [x] Create `src/sim/types.ts`: enums for `TerrainType`, `ChassisType`, `WeaponType`, `ModuleType`, `OrderType`, `PlayerId`.
- [x] Create `src/sim/constants.ts`: piece heights, piece costs, weapon ranges, terrain speed tables from disassembly.
- [x] Create `src/sim/mapData.ts`: exact coordinates of the 4 warbases and 24 factories matching the original map.
- [x] Create `src/sim/economy.ts`: resource inventory management (General, Chassis, Cannons, Missiles, Phasers, Nuclear, Electronics), production ticks (+2 specific per factory, +5 general per warbase every 2880 ticks).
- [x] Write unit tests in `tests/economy.test.ts` verifying resource accrual and General Resource shortfall payment rules.
- [x] Run `npx vitest run` and confirm all tests pass.

---

### Task 3: 3D Map & Procedural Architecture Visualization
**Deliverable:** 512×16 3D corridor rendered in Babylon.js with terrain elevations, perimeter fences, low/high walls, and distinct 3D factories and warbases.

- [x] Create `src/render/MapRenderer.ts`: generate terrain mesh using `InstancedMesh` for optimized draw calls over the 512×16 grid.
- [x] Render terrain elevations: normal (h=0), rough (h=2..3), mountains (h=6), ravines (h=0).
- [x] Render static scenery: impassable fences (h=99), low boxes (h=7), high boxes (h=15).
- [x] Create procedural 3D building models in `src/render/BuildingRenderer.ts`:
  - Warbase: large fortified military hangar with landing helipad ("H") at altitude 15.
  - Factories: industrial bunkers with animated holographic/glowing 3D icons on roof indicating type (Chassis, Cannon, Missile, Phaser, Nuke, Electronics).
- [x] Test scene rendering in browser; verify smooth 60 FPS performance and correct spatial placement.

---

### Task 4: Commander Flight Ship & Controls
**Deliverable:** Interactive flying anti-grav command craft with 3D altitude physics, collision boundaries, and auto-docking detection.

- [x] Create `src/sim/Commander.ts`: 2×2 body, position (x, y), altitude (0..48), state (flying, docked, in-construction).
- [x] Implement altitude dynamics: ascent (+2 while holding Up/Shift), descent (-2 with gravity), terrain clearance checking.
- [x] Implement automatic +10 elevation lift on exit from base or robot.
- [x] Create `src/render/CommanderRenderer.ts`: futuristic anti-grav drone with thruster glow and ground shadow projection.
- [x] Create input controller binding WASD / Arrow keys for planar movement and Shift/Space for altitude.
- [x] Implement landing detection on Warbase Helipad ("H", alt 15) and friendly robots.

---

### Task 5: Robot Modular Constructor & Assembly UI
**Deliverable:** Fullscreen modal robot engineering interface, cost deduction with general resource substitution, and robot factory roll-out.

- [x] Create `src/sim/Construction.ts`: validation rules (1 chassis, 1..3 weapons, opt electronics, max 24 robots limit, exit doorway clear).
- [x] Implement stack height computation based on selected modules.
- [x] Create `src/ui/ConstructionUI.ts` with Babylon.GUI:
  - Interactive selection grid for chassis, weapons, and electronics.
  - Live resource cost calculation showing available vs required resources.
  - 3D rotating preview of the robot being assembled.
  - "START ROBOT" and "EXIT" buttons.
- [x] Implement exit rollout: newly constructed robot rolls out south from warbase door.
- [x] Unit tests in `tests/construction.test.ts` verifying stacking heights and resource validation.

---

### Task 6: Procedural Modular Robots & Locomotion
**Deliverable:** Procedural 3D robot entities reflecting fitted modules, terrain-dependent speeds, and dual navigation modes (random wall-follow vs A*).

- [x] Create `src/render/RobotMeshBuilder.ts`: procedural composite mesh assembly:
  - Base: Bipod (legs), Tracks (caterpillar treads), or Anti-Grav (floating disc).
  - Torso: stacked weapons (Cannons, Missiles, Phasers, Nuclear bomb).
  - Top: spinning radar dish for Electronics module.
- [x] Implement terrain speed controller in `src/sim/RobotMovement.ts`:
  - Bipod (24/32/blocked), Tracks (16/24/28/blocked), Anti-Grav (12/12/16/12 ticks per cell).
  - 4-tick rotation delay when turning cardinal directions.
- [x] Implement navigation algorithms in `src/sim/Pathfinding.ts`:
  - Local wander/wall-following navigation for robots without electronics.
  - A* shortest-path grid navigation for robots equipped with Electronics.
- [x] Write unit tests in `tests/movement.test.ts` verifying terrain speed and blocking rules.

---

### Task 7: Autonomous Orders & Factory Capture System
**Deliverable:** Full robot command system (5 orders), continuous 72s factory capture mechanics, and direct player control mode.

- [x] Implement `OrderProcessor` in `src/sim/orders.ts`:
  - `Stop & Defend`: hold cell, auto-engage nearest targets.
  - `Advance N` / `Retreat N`: march fixed distance east/west, then defend.
  - `Search & Capture`: march to target neutral/enemy structure, occupy capture anchor.
  - `Search & Destroy`: hunt enemy robots or nuke structures.
- [x] Implement `CaptureSystem` in `src/sim/capture.ts`:
  - 1440 ticks continuous presence timer on structure capture anchor.
  - Immediate reset on departure or death.
  - Ownership transfer upon timer completion.
- [x] Implement Direct Control mode: landing commander on top of friendly robot transfers full manual steering and firing controls.
- [x] Create visual capture indicator and team color changing (Blue vs Red).

---

### Task 8: Combat System, Damage Formula & Nuclear Explosion
**Deliverable:** Projectile simulation, exact disassembly damage formula, explosive particle VFX, camera shake, and procedural audio.

- [x] Create `src/sim/CombatSystem.ts`:
  - Normal projectile channel at altitude 10, speed 2 cells / 4 ticks.
  - Ranges: Cannon=10, Missiles=14, Phasers=10 (+2 with Electronics).
  - Exact damage calculation: `floor((60 - (robot_height + ground_height)) / 4) * multiplier`.
- [x] Create `src/render/ProjectilesRenderer.ts`: tracer beams, missile smoke trails, phaser energy pulses.
- [x] Implement Nuclear Blast in `src/sim/nuclear.ts`:
  - 9×9 destruction footprint destroying all robots.
  - Permanent conversion of targeted factory/warbase into rough debris (h=3).
- [x] Add Game Feel & Audio in `src/audio/SoundManager.ts`:
  - Web Audio synthesized laser shots, missile whoosh, and heavy low-pass explosion rumble.
  - Screen shake effect on ArcRotateCamera upon nuclear blast.

---

### Task 9: Enemy AI General & Victory Conditions
**Deliverable:** Autonomous Insignian AI opponent producing and commanding counter-armies, win/loss detection, and end-game screen.

- [x] Create `src/sim/EnemyAI.ts`:
  - Manages Insignian warbase production.
  - Selects optimal robot blueprints based on available enemy parts.
  - Issues assault and capture orders based on battlefield state.
- [x] Implement match victory condition: player loses immediately when owning 0 warbases.
- [x] Create Victory / Defeat UI banner overlay.
- [x] Add restart match capability.

---

### Task 10: Performance Optimization, Verification & Polish
**Deliverable:** 60+ FPS stable full-game playthrough with zero memory leaks, full test suite pass, and clean production build.

- [x] Run `npx vitest run` to ensure 100% passing core simulation tests.
- [x] Optimize mesh instancing and texture reuse using `performance-optimization` skill.
- [x] Verify complete build with `npm run build`.
- [x] Conduct end-to-end playtest verification.
