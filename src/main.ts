import { GameApp } from './core/GameApp.ts';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #renderCanvas not found');
    return;
  }

  const app = new GameApp(canvas);
  app.start();
  (window as any).app = app;
  console.log('Nether Earth 3D Engine initialized successfully');
});
