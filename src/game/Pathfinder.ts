import EasyStar from 'easystarjs';
import { MAP_DATA } from '../data/map';

export class Pathfinder {
  private easystar: EasyStar.js;

  constructor() {
    this.easystar = new EasyStar.js();
    const grid = MAP_DATA.tiles.map(row =>
      row.map(tile => (tile.passable ? 0 : 1))
    );
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    this.easystar.enableCornerCutting();
  }

  /**
   * Synchronously compute an A* path. The callback fires immediately.
   * Returns null if no path found — caller should fall back to direct movement.
   */
  findPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    callback: (path: Array<{ x: number; y: number }> | null) => void
  ): void {
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const sx = clamp(Math.round(fromX), 0, MAP_DATA.width - 1);
    const sy = clamp(Math.round(fromY), 0, MAP_DATA.height - 1);
    const ex = clamp(Math.round(toX), 0, MAP_DATA.width - 1);
    const ey = clamp(Math.round(toY), 0, MAP_DATA.height - 1);
    this.easystar.findPath(sx, sy, ex, ey, callback);
    this.easystar.calculate();
  }
}
