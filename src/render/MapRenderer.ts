import * as PIXI from 'pixi.js';
import type { MapData } from '../types';
import { BIOME_COLORS, TILE_SIZE } from '../data/map';

export class MapRenderer {
  private tileContainer: PIXI.Container;

  constructor(parent: PIXI.Container) {
    this.tileContainer = new PIXI.Container();
    parent.addChild(this.tileContainer);
  }

  init(mapData: MapData): void {
    const gfx = new PIXI.Graphics();

    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y][x];
        const color = BIOME_COLORS[tile.biome];
        gfx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
        gfx.fill({ color });
      }
    }

    this.tileContainer.addChild(gfx);

    const gridGfx = new PIXI.Graphics();
    for (let x = 0; x <= mapData.width; x++) {
      gridGfx.moveTo(x * TILE_SIZE, 0);
      gridGfx.lineTo(x * TILE_SIZE, mapData.height * TILE_SIZE);
    }
    for (let y = 0; y <= mapData.height; y++) {
      gridGfx.moveTo(0, y * TILE_SIZE);
      gridGfx.lineTo(mapData.width * TILE_SIZE, y * TILE_SIZE);
    }
    gridGfx.stroke({ color: 0x000000, alpha: 0.1, width: 0.5 });
    this.tileContainer.addChild(gridGfx);
  }
}
