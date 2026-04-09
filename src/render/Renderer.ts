import * as PIXI from 'pixi.js';
import type { Character as CharData, Enemy, LootContainer, Vendor } from '../types';
import { MapRenderer } from './MapRenderer';
import { CharRenderer } from './CharRenderer';
import { MAP_DATA, TILE_SIZE } from '../data/map';

export type EntityClickType = 'enemy' | 'loot' | 'vendor';

export interface EntityClickEvent {
  type: EntityClickType;
  id: string;
}

export class Renderer {
  app: PIXI.Application;
  private mapRenderer: MapRenderer;
  private charRenderer: CharRenderer;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1.0;
  private worldContainer: PIXI.Container;
  private onTileClick?: (tileX: number, tileY: number) => void;
  private onEntityClick?: (event: EntityClickEvent) => void;
  private onRightClick?: () => void;

  // Snapshot of entities for click detection (updated each frame)
  private enemiesSnapshot: Enemy[] = [];
  private lootSnapshot: LootContainer[] = [];
  private vendorsSnapshot: Vendor[] = [];

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

  private screenToWorld(screenX: number, screenY: number): { worldX: number; worldY: number } {
    const worldX = (screenX / this.zoom) + this.cameraX - (this.app.screen.width / 2 / this.zoom);
    const worldY = (screenY / this.zoom) + this.cameraY - (this.app.screen.height / 2 / this.zoom);
    return { worldX, worldY };
  }

  private findClickedEntity(worldX: number, worldY: number): EntityClickEvent | null {
    const CLICK_RADIUS = 16; // pixels in world space

    for (const enemy of this.enemiesSnapshot) {
      if (enemy.status === 'dead') continue;
      const ex = enemy.x * TILE_SIZE;
      const ey = enemy.y * TILE_SIZE;
      const dist = Math.sqrt((worldX - ex) ** 2 + (worldY - ey) ** 2);
      if (dist < CLICK_RADIUS) return { type: 'enemy', id: enemy.id };
    }

    for (const container of this.lootSnapshot) {
      if (container.opened) continue;
      const cx = container.x * TILE_SIZE;
      const cy = container.y * TILE_SIZE;
      const dist = Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2);
      if (dist < CLICK_RADIUS) return { type: 'loot', id: container.id };
    }

    for (const vendor of this.vendorsSnapshot) {
      const vx = vendor.x * TILE_SIZE;
      const vy = vendor.y * TILE_SIZE;
      const dist = Math.sqrt((worldX - vx) ** 2 + (worldY - vy) ** 2);
      if (dist < CLICK_RADIUS) return { type: 'vendor', id: vendor.id };
    }

    return null;
  }

  private setupInput(): void {
    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      this.zoom = Math.max(0.5, Math.min(2.0, this.zoom - e.deltaY * 0.001));
      this.applyCamera();
    });

    this.app.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.app.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { worldX, worldY } = this.screenToWorld(screenX, screenY);

      const entity = this.findClickedEntity(worldX, worldY);
      if (entity && this.onEntityClick) {
        this.onEntityClick(entity);
        return;
      }

      if (!this.onTileClick) return;
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      this.onTileClick(tileX, tileY);
    });

    this.app.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      if (this.onRightClick) this.onRightClick();
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

  private applyDayNightTint(timeOfDay: number, isNight: boolean): void {
    if (isNight) {
      // Deep blue-grey night
      const nightProgress = Math.min(1, (timeOfDay - 300) / 60);
      const r = Math.round(26 + (200 - 26) * (1 - nightProgress));
      const g = Math.round(26 + (180 - 26) * (1 - nightProgress));
      const b = Math.round(46 + (120 - 46) * (1 - nightProgress));
      this.worldContainer.tint = (r << 16) | (g << 8) | b;
    } else {
      // Warm orange/tan day
      const dayProgress = Math.min(1, timeOfDay / 60);
      const r = Math.round(200 + (255 - 200) * dayProgress);
      const g = Math.round(160 + (220 - 160) * dayProgress);
      const b = Math.round(100 + (180 - 100) * dayProgress);
      this.worldContainer.tint = (r << 16) | (g << 8) | b;
    }
  }

  setOnTileClick(cb: (tileX: number, tileY: number) => void): void {
    this.onTileClick = cb;
  }

  setOnEntityClick(cb: (event: EntityClickEvent) => void): void {
    this.onEntityClick = cb;
  }

  setOnRightClick(cb: () => void): void {
    this.onRightClick = cb;
  }

  update(
    squad: CharData[],
    enemies: Enemy[],
    loot: LootContainer[],
    vendors: Vendor[],
    selectedId: string | null,
    timeOfDay: number,
    isNight: boolean,
    escortTargets: { x: number; y: number }[],
  ): void {
    this.enemiesSnapshot = enemies;
    this.lootSnapshot = loot;
    this.vendorsSnapshot = vendors;

    if (squad.length > 0) {
      const leader = squad.find(c => c.status !== 'dead') ?? squad[0];
      this.cameraX = leader.x * TILE_SIZE;
      this.cameraY = leader.y * TILE_SIZE;
      this.applyCamera();
    }

    this.applyDayNightTint(timeOfDay, isNight);
    this.charRenderer.update(squad, enemies, loot, vendors, selectedId, escortTargets);
  }
}
