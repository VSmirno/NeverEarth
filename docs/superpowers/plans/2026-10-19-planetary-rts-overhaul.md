# Planetary RTS Overhaul: Gritty Sci-Fi, Articulated Robots, Fortified Bases & Open World

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Nether Earth from a narrow retro neon corridor into a grounded, visually stunning planetary tactical RTS with an open 128×128 cratered battlefield, mechanically articulated robot models, fortified command bases, distinct 3D factory icons, and balanced military sci-fi aesthetics without blinding bloom.

**Architecture:**
- **Terrain & Map System:** Expand map to 128×128 open planetary sector with natural height variations, craters, rocky mesas, canyons, and dirt/rock PBR procedural materials.
- **Robot Mesh Architecture:** Procedural high-detail robot assembly: multi-part articulated tracks with road wheels and sprockets, bipod walker legs with hydraulic pistons, hover repulsors with vector thrusters, rifled dual-cannon turrets, 4-pod missile launchers with visible warheads, phaser coils, and nuke silos.
- **Building & Factory Architecture:** Hardened military warbases with blast walls, watchtowers, and illuminated helipads; factories with giant, unmistakable 3D component replicas mounted on factory gantries.
- **Lighting & Atmosphere:** Cinematic low-sun directional light, soft atmospheric ground fog, subdued graphite military HUD, and tuned post-processing (subtle vignette, soft bloom threshold > 0.85, no blinding neon glare).
- **Tactical Minimap & Radar:** 128×128 square radar display with real-time terrain contour, structure icons, unit blips, and camera viewport frustum.

**Tech Stack:** Babylon.js 7 (PBR materials, Procedural Textures, Shadow Generator, Fog), TypeScript, CSS3 Glassmorphism (Military Graphite theme), Vitest.

---

### Task 1: Planetary Map Data & 128×128 Open World Simulation
- [x] Update `src/sim/constants.ts` to set `MAP_LENGTH = 128`, `MAP_WIDTH = 128`.
- [x] Redesign `src/sim/mapData.ts` to place Human Warbase (Southwest), Insignian Warbase (Northeast), 2 Neutral Warbases (Northwest, Southeast), and 12-16 strategically balanced factories across natural plateaus and valleys.
- [x] Update unit tests in `tests/smoke.test.ts` and `tests/movement.test.ts` to pass with new 128×128 dimensions and layout.
- [x] Verify with `npm test`.

### Task 2: Grounded Planetary Terrain & Atmosphere Rendering
- [x] Rewrite `src/render/MapRenderer.ts` to generate realistic planetary terrain mesh with craters, rocky plateaus, and sandy canyons using procedural heightmaps and rocky/dust PBR textures.
- [x] Add natural rock formations, debris crags, and perimeter cliffs.
- [x] In `src/core/GameApp.ts`, adjust lighting: warm directional planetary sun, atmospheric ground haze/fog (`scene.fogMode = Scene.FOGMODE_EXP2`), toned-down bloom and ACES tone mapping.
- [x] Verify visuals and build with `npm test; npm run build`.

### Task 3: Articulated Mechanical Robots (Chassis & Weapons)
- [x] Rewrite `src/render/RobotMeshBuilder.ts` with multi-part mechanical detailing:
  - **Tracks:** Main chassis body, side armor skirts with rivets, drive sprockets, 4 road wheels per track, animated/textured tread belts, front bullbar.
  - **Bipod:** Pelvis hub, 2-segment legs (thighs, shins), hydraulic piston cylinders, wide stabilizer foot pads, armor plating.
  - **Antigrav:** Sculpted hover hull, 3 downward plasma thruster rings, aerodynamic side flaps.
  - **Cannons:** Heavy dual rifled barrels with muzzle compensators and ammo feeding chutes.
  - **Missiles:** Quad-box launcher with 4 exposed missile warheads painted with high-contrast hazard tips.
  - **Phasers:** Dual crystalline energy emitters with cooling radiators and copper conduit rings.
  - **Nuclear:** Heavy ballistic missile cone with radiation hazard markings and safety locking clamps.
  - **Electronics:** Dish antenna with receiver horn and AI sensor eye.
- [x] Add team insignia livery (matte military navy blue + olive/white markings for Alliance, matte charcoal + crimson hazard stripes for Insignia).
- [x] Verify compilation and test suite with `npm test; npm run build`.

### Task 4: Fortified Military Warbases & Distinct Factory Component Gantries
- [x] Rewrite `src/render/BuildingRenderer.ts`:
  - **Warbases:** Massive fortified hexagonal military redoubt with 4 corner pillboxes/turrets, central hardened command bunker, elevated circular landing pad with hazard stripes, comms radar, and faction floodlights.
  - **Factories:** Heavy industrial bunker with cooling vents and a prominent overhead gantry mounting a **GIANT, CLEAR 3D REPLICA OF THE PRODUCED ITEM**:
    - *Chassis Factory:* Giant revolving tank tread assembly / chassis frame.
    - *Cannon Factory:* Massive revolving twin-artillery cannon turret.
    - *Missile Factory:* Tri-cluster upright rocket assembly with distinct fins and warheads.
    - *Phaser Factory:* Pulsing energy focusing ring / crystal prism.
    - *Nuclear Factory:* Heavy warhead sphere with revolving 3D radiation hazard trefoil.
    - *Electronics Factory:* Rotating dish with glowing holographic microchip matrix.
- [x] Animated capture rings and faction flag indicators on all structures.
- [x] Verify build and tests with `npm test; npm run build`.

### Task 5: Military Graphite UI & Square 128×128 Minimap
- [x] Update `src/ui/styles.css` to switch from eye-straining bright cyan/magenta neon to refined tactical military graphite (`#0b1017`, `#182230`, amber `#f59e0b`, tactical cyan `#0ea5e9`, muted olive `#10b981`).
- [x] Update `src/ui/Minimap.ts` for square $128 \times 128$ planetary sector: render topography, faction bases, factory icons, robot blips, and commander frustum.
- [x] Update `ModernHUD.ts` and `ModernConstructor.ts` to seamlessly integrate with the new planetary scale and visual design.
- [x] Verify full test suite and production build: `npm test && npm run build`.

### Task 6: Final Integration, Audio-Visual Juice & Verification
- [x] Fine-tune camera constraints in `GameApp.ts` for planetary navigation (smooth panning, zoom levels from tactical close-up to strategic bird's-eye).
- [x] Test robot AI pathfinding across craters and canyons, capturing factories, and attacking bases.
- [x] Verify all 21+ unit tests pass, zero errors in console, smooth 60 FPS performance.
