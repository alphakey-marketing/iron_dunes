import type { MapData, Tile, BiomeType } from '../types';

const WIDTH = 64;
const HEIGHT = 64;

function makeTile(biome: BiomeType): Tile {
  return { biome, passable: true };
}

export function generateMap(): MapData {
  const tiles: Tile[][] = [];

  for (let y = 0; y < HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < WIDTH; x++) {
      tiles[y][x] = makeTile('desert');
    }
  }

  // Settlement centered at 32,32 (radius 4)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dx = x - 32;
      const dy = y - 32;
      if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) {
        tiles[y][x] = makeTile('settlement');
      }
    }
  }

  // Ruin sites
  const ruinCenters = [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 30, y: 50 },
    { x: 15, y: 40 },
    { x: 48, y: 35 },
    { x: 25, y: 20 },
    { x: 55, y: 50 },
  ];

  for (const center of ruinCenters) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = center.x + dx;
        const ty = center.y + dy;
        if (tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT) {
          if (tiles[ty][tx].biome !== 'settlement') {
            tiles[ty][tx] = makeTile('ruins');
          }
        }
      }
    }
  }

  // Dust plains
  const plainCenters = [
    { x: 20, y: 15 },
    { x: 42, y: 20 },
    { x: 8, y: 30 },
    { x: 55, y: 30 },
    { x: 30, y: 8 },
  ];

  for (const center of plainCenters) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const tx = center.x + dx;
        const ty = center.y + dy;
        if (tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT) {
          if (tiles[ty][tx].biome === 'desert') {
            tiles[ty][tx] = makeTile('dustPlains');
          }
        }
      }
    }
  }

  return { width: WIDTH, height: HEIGHT, tiles };
}

export const MAP_DATA: MapData = generateMap();

export const BIOME_COLORS: Record<BiomeType, number> = {
  desert: 0xC8A97A,
  ruins: 0x6E6459,
  dustPlains: 0x8B8B7A,
  settlement: 0xA89070,
};

export const TILE_SIZE = 32;

export const POI = {
  town: { x: 32, y: 32, name: 'The Sump' },
  banditCamps: [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 30, y: 50 },
  ],
  ruinSites: [
    { x: 15, y: 40 },
    { x: 48, y: 35 },
    { x: 25, y: 20 },
    { x: 55, y: 50 },
    { x: 8, y: 30 },
  ],
  bountyPosts: [
    { x: 30, y: 30 },
    { x: 34, y: 34 },
  ],
};
