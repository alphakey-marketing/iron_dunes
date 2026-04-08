import * as PIXI from 'pixi.js';
import type { Character as CharData, Enemy, LootContainer } from '../types';
import { MapRenderer } from './MapRenderer';
import { CharRenderer } from './CharRenderer';
import { MAP_DATA, TILE_SIZE } from '../data/map';

export class Renderer {
  app: PIXI.Application;
  private mapRenderer: MapRenderer;
  private charRenderer: CharRenderer;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1.0;
  private worldContainer: PIXI.Container;
  private onTileClick?: (tileX: number, tileY: number) => void;

  constructor() {
    this.app = new PIXI.Application();
    this.worldContainer = new PIXI.Container();
    this.mapRenderer = new MapRenderer(this.worldContainer);
    this.charRenderer = new CharRenderer(this.worldContainer);
  }

  async init(): Promise<void> {
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1512,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    const canvasDiv = document.getElementById('pixi-canvas');
    if (canvasDiv) {
      canvasDiv.appendChild(this.app.canvas);
    }

    this.app.stage.addChild(this.worldContainer);
    this.mapRenderer.init(MAP_DATA);
    this.setupCamera();
    this.setupInput();
    this.setupResize();
  }

  private setupCamera(): void {
    this.cameraX = 32 * TILE_SIZE;
    this.cameraY = 30 * TILE_SIZE;
    this.applyCamera();
  }

  private setupInput(): void {
    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      this.zoom = Math.max(0.5, Math.min(2.0, this.zoom - e.deltaY * 0.001));
      this.applyCamera();
    });

    this.app.canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.onTileClick) return;
      const rect = this.app.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = (screenX / this.zoom) + this.cameraX - (this.app.screen.width / 2 / this.zoom);
      const worldY = (screenY / this.zoom) + this.cameraY - (this.app.screen.height / 2 / this.zoom);

      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      this.onTileClick(tileX, tileY);
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.applyCamera();
    });
  }

  private applyCamera(): void {
    const hw = this.app.screen.width / 2;
    const hh = this.app.screen.height / 2;
    this.worldContainer.scale.set(this.zoom);
    this.worldContainer.x = hw - this.cameraX * this.zoom;
    this.worldContainer.y = hh - this.cameraY * this.zoom;
  }

  setOnTileClick(cb: (tileX: number, tileY: number) => void): void {
    this.onTileClick = cb;
  }

  update(squad: CharData[], enemies: Enemy[], loot: LootContainer[], selectedId: string | null): void {
    if (squad.length > 0) {
      const leader = squad.find(c => c.status !== 'dead') ?? squad[0];
      this.cameraX = leader.x * TILE_SIZE;
      this.cameraY = leader.y * TILE_SIZE;
      this.applyCamera();
    }

    this.charRenderer.update(squad, enemies, loot, selectedId);
  }
}
