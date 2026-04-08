declare module 'easystarjs' {
  namespace EasyStar {
    class js {
      setGrid(grid: number[][]): void;
      setAcceptableTiles(tiles: number[]): void;
      enableDiagonals(): void;
      enableCornerCutting(): void;
      findPath(
        startX: number, startY: number,
        endX: number, endY: number,
        callback: (path: Array<{ x: number; y: number }> | null) => void
      ): void;
      calculate(): void;
    }
  }
  export = EasyStar;
}
