# Quantum Obsidian — Modern UI/UX & Visual Overhaul Plan

> **Goal:** Transform the visual identity and interface of Nether Earth 3D from a retro 1987 prototype into a cutting-edge Sci-Fi tactical RTS with the **"Quantum Obsidian"** aesthetic: aerogel glassmorphism UI, real-time tactical minimap, kinetic PBR structures, post-processing bloom/ACES tone-mapping, and layered audiovisual feedback.

---

## 1. Architecture & Design Principles

### A. Modern Layered UI Architecture (`src/ui/`)
Rather than relying on rasterized canvas textures from `Babylon.GUI`, we build a high-DPI responsive **HTML5/CSS3 glassmorphic HUD overlay** layered cleanly over the WebGL canvas:
- **Design Tokens:**
  - Obsidian dark glass (`rgba(10, 14, 22, 0.75)`, `backdrop-filter: blur(16px)`).
  - Quantum Cyan (`#00f0ff`), Solar Amber (`#ffb020`), Crimson Threat (`#ff3355`), Matrix Jade (`#00ffaa`).
  - Typography: Futuristic geometric typography (`Orbitron` & `Rajdhani` via Google Fonts).
  - Borders: 1px subtle glowing laser-cut borders with corner accents (`clip-path`).
- **Interactive Radar / Minimap (`src/ui/Minimap.ts`):**
  - Real-time 2D canvas radar showing the 512×16 world strip.
  - Live positions of Commander (amber blip), Alliance robots (cyan), Insignian forces (crimson), bases, and factories.
  - Interactive click-to-pan camera navigation.
- **Top Command Console (`src/ui/ModernHUD.ts`):**
  - Quantum Resource Bar with sleek icons, current stockpiles, and generation rates (+N/day).
  - Sector Control indicator (Alliance vs Insignia bar).
  - Quick-launch Unit Constructor toggle `[ ⚡ СБОРКА РОБОТА (B) ]`.
- **Tactical Telemetry & Battle Ticker (Bottom Bar):**
  - Flight attitude indicator (altitude, speed, coordinate grid).
  - Live animated battle feed (captures, skirmishes, robot casualties).
- **Overhauled Modular Constructor Screen (`src/ui/ModernConstructor.ts`):**
  - Sleek modal with 4 stages: Chassis selection -> Weapon slots (1-3) -> Quantum AI -> Tactical Order.
  - Live stat preview: Armor / Height, Speed, Range, DPS, and Cost breakdown.
  - "DEPLOY UNIT" confirmation with tactical audio chime.

### B. Visual Presentation & PBR Overhaul (`src/render/`)
- **PBR Materials & Post-Processing (`src/core/Engine.ts`):**
  - `DefaultRenderingPipeline`: Bloom with threshold 0.75, ACES Tone Mapping, Chromatic Aberration, Vignette.
  - Environment ambient lighting with warm solar highlights and deep space shadows.
- **Obsidian Terrain & Kinetic Energy Boundaries (`src/render/MapRenderer.ts`):**
  - Hexagonal carbon-patterned floor panels with emissive neon grid lines.
  - Impassable perimeter fences rendered as vertical pulsating laser forcefields.
- **Kinetic Architecture (`src/render/BuildingRenderer.ts`):**
  - Warbases: Brutalist obsidian citadels with glowing subterranean reactor cores and illuminated "H" helipads.
  - Factories: Kinetic industrial complexes with animated rotating energy rings and volumetric beacon beams.
  - Capturing Hologram: 3D expanding particle torus and vertical laser column that fills up with the capturing team's color.
- **Combat & Particle VFX (`src/render/ProjectilesRenderer.ts` & `src/render/CombatVFX.ts`):**
  - Phaser energy arcs, missile flame & smoke trails, laser bolt tracers with impact sparks.
  - Multi-stage nuclear explosion: expanding plasma fireball -> shockwave blast wave -> lingering radioactive embers.

---

## 2. Implementation Tasks

### Task 1: Styling System & Web Fonts
- [ ] Import `Orbitron` and `Rajdhani` Google Fonts in `index.html`.
- [ ] Create `src/ui/styles.css` containing glassmorphic design tokens, keyframe animations (pulse, scanlines, glow, slide-in), and responsive utility classes.

### Task 2: Real-time Tactical Minimap & Radar
- [ ] Create `src/ui/Minimap.ts`: renders 512×16 radar scan to HTML5 canvas.
- [ ] Render base icons, factory icons with ownership colors, commander viewpoint box, and live unit blips.
- [ ] Add click-to-navigate camera support.

### Task 3: Modern Glassmorphic HUD & Battle Ticker
- [ ] Create `src/ui/ModernHUD.ts` replacing `GameHUD.ts`.
- [ ] Render Top Command Console: Quantum resources (crystals, chassis, weapons, electronics), Base score, Deploy button.
- [ ] Render Bottom Telemetry Bar: Altitude graph, direct control indicator, live combat notifications feed.
- [ ] Connect HUD events to simulation without per-frame string allocation.

### Task 4: Next-Gen Modular Robot Assembly Terminal
- [ ] Create `src/ui/ModernConstructor.ts` replacing `ConstructionUI.ts`.
- [ ] Interactive component picker cards with visual icons, stat badges, and cost counters.
- [ ] Real-time validation of resource balance (specific + general crystal substitution).
- [ ] Tactical order selection with animated hover states.
- [ ] Sound integration for button hovers, selections, and launch.

### Task 5: Post-Processing Pipeline & Lighting
- [ ] Update `src/core/GameApp.ts` with `DefaultRenderingPipeline`:
  - Bloom (subtle glow on lasers, holographic icons, thrusters).
  - Chromatic Aberration on nuclear blast and damage.
  - ACES Tone Mapping & Vignette for cinematic contrast.
  - Directional shadow generator for crisp robot and building shadows.

### Task 6: Obsidian Terrain & Laser Boundary Grid
- [ ] Update `src/render/MapRenderer.ts`:
  - PBR ground material with dark metallic roughness and hex grid normal map.
  - Laser fence barriers with animated scrolling UV emissive shaders.
  - Mountain peaks with volcanic obsidian rock styling.

### Task 7: Kinetic Architecture & Holographic Beacon Towers
- [ ] Update `src/render/BuildingRenderer.ts`:
  - Modernized Warbase citadel with landing light strips and subterranean core glow.
  - Kinetic factory models with spinning holographic icon projectors and capture energy torus.
  - Ownership transition color morphing.

### Task 8: Combat VFX, Audio Layering & Polish
- [ ] Create `src/render/CombatVFX.ts` for missile smoke trails, laser spark bursts, and nuclear shockwaves.
- [ ] Connect sound effects in `SoundManager.ts` to UI interactions and weapon discharges.
- [ ] Verify test suite (`npm test`) and build verification (`npm run build`).
