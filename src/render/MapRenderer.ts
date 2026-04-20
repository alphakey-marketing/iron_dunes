import * as PIXI from 'pixi.js';
import type { MapData } from '../types';
import { BIOME_COLORS, TILE_SIZE } from '../data/map';
import { POI } from '../data/map';

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

    this.drawPOIMarkers();
  }

  private drawPOIMarkers(): void {
    const markerGfx = new PIXI.Graphics();

    // Town ring
    markerGfx.circle(POI.town.x * TILE_SIZE, POI.town.y * TILE_SIZE, 6 * TILE_SIZE);
    markerGfx.stroke({ color: 0xf0c040, alpha: 0.25, width: 2 });

    // Bandit camp markers
    for (const camp of POI.banditCamps) {
      markerGfx.rect(
        camp.x * TILE_SIZE - TILE_SIZE * 1.5,
        camp.y * TILE_SIZE - TILE_SIZE * 1.5,
        TILE_SIZE * 3,
        TILE_SIZE * 3,
      );
      markerGfx.stroke({ color: 0xe84040, alpha: 0.35, width: 2 });
    }

    // Ruin markers
    for (const ruin of POI.ruinSites) {
      markerGfx.rect(
        ruin.x * TILE_SIZE - TILE_SIZE,
        ruin.y * TILE_SIZE - TILE_SIZE,
        TILE_SIZE * 2,
        TILE_SIZE * 2,
      );
      markerGfx.stroke({ color: 0x8888aa, alpha: 0.3, width: 1 });
    }

    this.tileContainer.addChild(markerGfx);

    // Text labels
    const townLabel = new PIXI.Text({
      text: POI.town.name,
      style: {
        fontSize: 14,
        fill: 0xf0c040,
        fontFamily: 'monospace',
        align: 'center',
      },
    });
    townLabel.anchor.set(0.5, 1);
    townLabel.x = POI.town.x * TILE_SIZE;
    townLabel.y = (POI.town.y - 5) * TILE_SIZE;
    this.tileContainer.addChild(townLabel);

    for (let i = 0; i < POI.banditCamps.length; i++) {
      const camp = POI.banditCamps[i];
      const label = new PIXI.Text({
        text: `Bandit Camp ${i + 1}`,
        style: { fontSize: 10, fill: 0xe84040, fontFamily: 'monospace' },
      });
      label.anchor.set(0.5, 1);
      label.x = camp.x * TILE_SIZE;
      label.y = (camp.y - 2.5) * TILE_SIZE;
      this.tileContainer.addChild(label);
    }

    for (let i = 0; i < POI.ruinSites.length; i++) {
      const ruin = POI.ruinSites[i];
      const label = new PIXI.Text({
        text: `Ruin ${i + 1}`,
        style: { fontSize: 9, fill: 0x9999bb, fontFamily: 'monospace' },
      });
      label.anchor.set(0.5, 1);
      label.x = ruin.x * TILE_SIZE;
      label.y = (ruin.y - 1.8) * TILE_SIZE;
      this.tileContainer.addChild(label);
    }

    // Bounty post markers
    for (const post of POI.bountyPosts) {
      const postGfx = new PIXI.Graphics();
      postGfx.circle(post.x * TILE_SIZE, post.y * TILE_SIZE, 8);
      postGfx.fill({ color: 0xf0c040, alpha: 0.6 });
      this.tileContainer.addChild(postGfx);
      const label = new PIXI.Text({
        text: '📋',
        style: { fontSize: 12, fontFamily: 'monospace' },
      });
      label.anchor.set(0.5, 0.5);
      label.x = post.x * TILE_SIZE;
      label.y = post.y * TILE_SIZE;
      this.tileContainer.addChild(label);
    }
  }
}
