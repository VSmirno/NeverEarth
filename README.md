# Nether Earth 3D 🚀🤖

A modernized 3D real-time strategy remake of the legendary 1987 tactical sci-fi classic **Nether Earth** (ZX Spectrum / C64), built from scratch in TypeScript using **Babylon.js** and **Vite**.

![Nether Earth 3D Screenshot](./references/banner.png)

## 🎮 Play Online
- **Live Game**: [https://vsmirno.github.io/NeverEarth/](https://vsmirno.github.io/NeverEarth/)
- **Autonomous AI vs AI Spectator Mode**: [https://vsmirno.github.io/NeverEarth/?mode=auto](https://vsmirno.github.io/NeverEarth/?mode=auto)

---

## ⚡ Features

- **Full 3D Planetary Landscape**: 128×128 terrain grid with craters, mountains, roads, bridges, and industrial bases.
- **Interactive Holographic Robot Constructor**: Assemble custom combat drones with 3 chassis types (Bipod, Tracks, Antigrav), up to 3 stacked weapons (Cannons, Missiles, Phasers, Nuclear charges), and Quantum Electronics with live 3D preview, walk cycle, and stock warehouse inventory.
- **Multi-Weapon Salvo Combat**: Drones with multiple mounted weapons fire simultaneously in coordinated salvos with lateral projectile spread.
- **RTS & Direct Control**:
  - Free RTS camera with WASD orientation-aware panning, minimap radar click navigation, and unit command issuing.
  - Direct Robot Piloting: Take the helm of any active robot and drive it with WASD, firing all weapons with Space/F.
- **Continuous Base Captures**: Drive or deploy robots into the interior hangar entrance bays of neutral factories and warbases to capture them and expand your production economy.
- **Autonomous Battle Modes**:
  - **Player vs AI**: Command the Alliance base in the southwest against the Insignian Empire in the northeast.
  - **AI vs AI**: Spectator mode with autonomous AI Generals managing both bases simultaneously.

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests (Vitest)
npm test

# Build for production
npm run build
```

## 📜 License
MIT
