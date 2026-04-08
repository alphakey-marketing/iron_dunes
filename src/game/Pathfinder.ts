import EasyStar from 'easystarjs';
import type { MapData } from '../types';

const RECALC_INTERVAL = 0.25;

export class Pathfinder {
  private easystar: EasyStar.js;
  private lastCalc: Map<string, number> = new Map();

  constructor(mapData: MapData) {
    this.easystar = new EasyStar.js();
    this.buildGrid(mapData);
  }

  private buildGrid(mapData: MapData): void {
    const grid: number[][] = [];
    for (let y = 0; y < mapData.height; y++) {
      grid[y] = [];
      for (let x = 0; x < mapData.width; x++) {
        grid[y][x] = mapData.tiles[y][x].passable ? 0 : 1;
      }
    }
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    this.easystar.enableCornerCutting();
  }

  findPath(
    entityId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    elapsed: number,
    callback: (path: Array<{ x: number; y: number }> | null) => void
  ): void {
    const lastTime = this.lastCalc.get(entityId) ?? -Infinity;
    if (elapsed - lastTime < RECALC_INTERVAL) return;

    this.lastCalc.set(entityId, elapsed);

    const sx = Math.round(fromX);
    const sy = Math.round(fromY);
    const tx = Math.round(toX);
    const ty = Math.round(toY);

    if (sx < 0 || sy < 0 || tx < 0 || ty < 0) {
      callback(null);
      return;
    }

    this.easystar.findPath(sx, sy, tx, ty, (path) => {
      callback(path);
    });
    this.easystar.calculate();
  }
}
