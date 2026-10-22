import { GameMap } from '../sim/mapData.ts';
import { ActiveRobot } from '../sim/Construction.ts';
import { Commander } from '../sim/Commander.ts';
import { PlayerId } from '../sim/types.ts';
import { MAP_LENGTH, MAP_WIDTH } from '../sim/constants.ts';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onPanCallback: ((worldX: number, worldY: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Square 220x220 tactical radar
    this.canvas.width = 220;
    this.canvas.height = 220;

    // Click on minimap to pan camera / commander
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const normX = clickX / rect.width;
      const normY = clickY / rect.height;

      const worldX = Math.round(normX * MAP_LENGTH);
      const worldY = Math.round(normY * MAP_WIDTH);

      if (this.onPanCallback) {
        this.onPanCallback(worldX, worldY);
      }
    });
  }

  public onPan(callback: (worldX: number, worldY: number) => void): void {
    this.onPanCallback = callback;
  }

  public render(map: GameMap, robots: ActiveRobot[], commander: Commander): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Dark graphite military radar background
    ctx.fillStyle = '#0c1017';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / MAP_LENGTH;
    const scaleY = h / MAP_WIDTH;

    // 2. Tactical Quadrant Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 3. Draw Factories (24 factories)
    for (const f of map.factories) {
      if (f.isDestroyed) continue;
      const fx = f.x * scaleX;
      const fy = f.y * scaleY;

      ctx.fillStyle =
        f.owner === PlayerId.HUMAN
          ? '#38bdf8'
          : f.owner === PlayerId.INSIGNIAN
          ? '#ef4444'
          : '#94a3b8';

      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Warbases (4 military redoubts)
    for (const b of map.warbases) {
      if (b.isDestroyed) continue;
      const bx = b.x * scaleX;
      const by = b.y * scaleY;

      ctx.fillStyle =
        b.owner === PlayerId.HUMAN
          ? '#10b981'
          : b.owner === PlayerId.INSIGNIAN
          ? '#f43f5e'
          : '#cbd5e1';

      ctx.fillRect(bx - 4, by - 4, 8, 8);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(bx - 4, by - 4, 8, 8);
    }

    // 5. Draw Active Robots
    for (const r of robots) {
      if (r.isDestroyed) continue;
      const rx = r.x * scaleX;
      const ry = r.y * scaleY;

      ctx.fillStyle = r.owner === PlayerId.HUMAN ? '#38bdf8' : '#f87171';
      ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
    }

    // 6. Draw Commander Aircraft Reticle
    const cx = commander.x * scaleX;
    const cy = commander.y * scaleY;

    ctx.strokeStyle = '#f59e0b'; // Tactical amber
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}
