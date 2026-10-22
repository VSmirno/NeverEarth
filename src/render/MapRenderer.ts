import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DynamicTexture,
  VertexBuffer
} from '@babylonjs/core';
import { GameMap } from '../sim/mapData.ts';
import { MAP_LENGTH, MAP_WIDTH } from '../sim/constants.ts';

export class MapRenderer {
  private scene: Scene;
  public map: GameMap;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
    this.buildPlanetaryLandscape();
  }

  private buildPlanetaryLandscape(): void {
    // 1. Procedural Planetary Recon Texture (Deserts of Kharak / Martian Basalt style)
    const terrainTex = new DynamicTexture('planetarySurfaceTex', 1024, this.scene, true);
    const ctx = terrainTex.getContext();

    // Dark Martian red-brown bedrock
    ctx.fillStyle = '#1c1514';
    ctx.fillRect(0, 0, 1024, 1024);

    // Weathered sand strata and sediment noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      const grain = (Math.random() - 0.5) * 15;
      data[i] = Math.min(255, Math.max(0, 48 + noise + grain));     // R
      data[i + 1] = Math.min(255, Math.max(0, 36 + noise * 0.7));   // G
      data[i + 2] = Math.min(255, Math.max(0, 32 + noise * 0.5));   // B
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle military tactical sector grid (very soft, non-neon, military reconnaissance style)
    ctx.strokeStyle = 'rgba(210, 180, 140, 0.08)';
    ctx.lineWidth = 1;
    const gridStep = 64; // 16x16 major sectors
    for (let x = 0; x <= 1024; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Faint military recon sector coordinates (e.g., A1, B2, D4)
    ctx.fillStyle = 'rgba(255, 220, 180, 0.12)';
    ctx.font = '10px monospace';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillText(`${letters[i]}-${j + 1}`, i * 128 + 8, j * 128 + 18);
      }
    }

    terrainTex.update();
    terrainTex.uScale = 4;
    terrainTex.vScale = 4;

    // 2. High-Density Ground Mesh with Real Heightmap Relief
    const subdivisions = 128;
    const ground = MeshBuilder.CreateGround(
      'planetary_ground',
      { width: MAP_LENGTH, height: MAP_WIDTH, subdivisions },
      this.scene
    );
    ground.position.set(MAP_LENGTH / 2, 0, MAP_WIDTH / 2);

    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      // Displace vertices according to GameMap elevation data
      for (let i = 0; i < positions.length; i += 3) {
        const localX = positions[i];
        const localZ = positions[i + 2];

        // Convert ground local position to map grid coordinates
        const mapX = Math.round(localX + MAP_LENGTH / 2);
        const mapY = Math.round(localZ + MAP_WIDTH / 2);

        const elev = this.map.getElevationAt(mapX, mapY);
        if (elev >= 99) {
          // Perimeter mountain cliffs
          positions[i + 1] = 7.5;
        } else if (elev >= 6) {
          // Mountain ridges / crater rims
          positions[i + 1] = 3.2 + Math.sin(mapX * 0.4) * 0.4;
        } else if (elev >= 2) {
          // Rough crags / crater floors
          positions[i + 1] = 1.0 + (Math.sin(mapX * 0.8) + Math.cos(mapY * 0.8)) * 0.2;
        } else {
          // Flat plains & road corridors
          positions[i + 1] = 0;
        }
      }
      ground.setVerticesData(VertexBuffer.PositionKind, positions);
      ground.createNormals(false);
    }

    const groundMat = new StandardMaterial('ground_rock_mat', this.scene);
    groundMat.diffuseTexture = terrainTex;
    groundMat.specularColor = new Color3(0.08, 0.08, 0.08); // Matte finish, not shiny!
    groundMat.roughness = 0.85;
    groundMat.backFaceCulling = false;
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Perimeter planetary bedrock skirt (solid slab edges so the world is never transparent from the sides/underneath)
    const skirtHeight = 8;
    const skirtMat = new StandardMaterial('bedrock_skirt_mat', this.scene);
    skirtMat.diffuseColor = new Color3(0.11, 0.08, 0.08);
    skirtMat.specularColor = new Color3(0.02, 0.02, 0.02);
    skirtMat.backFaceCulling = false;

    // North skirt
    const skirtN = MeshBuilder.CreateBox('skirt_n', { width: MAP_LENGTH, height: skirtHeight, depth: 1 }, this.scene);
    skirtN.position.set(MAP_LENGTH / 2, -skirtHeight / 2, MAP_WIDTH);
    skirtN.material = skirtMat;

    // South skirt
    const skirtS = MeshBuilder.CreateBox('skirt_s', { width: MAP_LENGTH, height: skirtHeight, depth: 1 }, this.scene);
    skirtS.position.set(MAP_LENGTH / 2, -skirtHeight / 2, 0);
    skirtS.material = skirtMat;

    // West skirt
    const skirtW = MeshBuilder.CreateBox('skirt_w', { width: 1, height: skirtHeight, depth: MAP_WIDTH }, this.scene);
    skirtW.position.set(0, -skirtHeight / 2, MAP_WIDTH / 2);
    skirtW.material = skirtMat;

    // East skirt
    const skirtE = MeshBuilder.CreateBox('skirt_e', { width: 1, height: skirtHeight, depth: MAP_WIDTH }, this.scene);
    skirtE.position.set(MAP_LENGTH, -skirtHeight / 2, MAP_WIDTH / 2);
    skirtE.material = skirtMat;

    // 3. Natural Planetary Rock Formations on Mountain & Ridge tiles
    this.spawnPlanetaryBoulders();
  }

  private spawnPlanetaryBoulders(): void {
    const rockMat = new StandardMaterial('boulder_mat', this.scene);
    rockMat.diffuseColor = new Color3(0.24, 0.18, 0.16);
    rockMat.specularColor = new Color3(0.05, 0.05, 0.05);
    rockMat.roughness = 0.95;
    rockMat.backFaceCulling = false;

    // Boulder prototype
    const boulderProto = MeshBuilder.CreatePolyhedron(
      'rock_proto',
      { type: 1, size: 1.2 },
      this.scene
    );
    boulderProto.material = rockMat;
    boulderProto.isVisible = false;

    let rockCount = 0;
    const maxRocks = 120;

    // Distribute boulders across mountain and rough terrain
    for (let x = 4; x < MAP_LENGTH - 4; x += 3) {
      for (let y = 4; y < MAP_WIDTH - 4; y += 3) {
        const elev = this.map.getElevationAt(x, y);
        if (elev === 6 && rockCount < maxRocks && Math.random() < 0.25) {
          const inst = boulderProto.createInstance(`boulder_${rockCount++}`);
          inst.position.set(x + (Math.random() - 0.5) * 1.5, 3.2, y + (Math.random() - 0.5) * 1.5);
          const s = 0.8 + Math.random() * 1.2;
          inst.scaling.set(s, s * (0.6 + Math.random() * 0.6), s);
          inst.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        }
      }
    }
  }
}
