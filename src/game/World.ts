import type { Enemy, LootContainer } from '../types';
import { spawnBanditCamp } from '../data/enemies';
import { createLootContainer, generateEnemyLoot, generateRuinLoot } from './Economy';
import { POI } from '../data/map';

const DAY_CYCLE = 600;
const DAY_DURATION = 300;

export class World {
  day: number = 1;
  timeOfDay: number = 0;
  isNight: boolean = false;
  enemies: Enemy[] = [];
  lootContainers: LootContainer[] = [];

  constructor() {
    this.spawnInitialEnemies();
    this.spawnRuinLoot();
  }

  private spawnInitialEnemies(): void {
    for (const camp of POI.banditCamps) {
      const bandits = spawnBanditCamp(camp.x, camp.y, 3);
      this.enemies.push(...bandits);
    }
  }

  private spawnRuinLoot(): void {
    for (const ruin of POI.ruinSites) {
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const ox = Math.floor((Math.random() - 0.5) * 4);
        const oy = Math.floor((Math.random() - 0.5) * 4);
        const items = generateRuinLoot();
        if (items.length > 0) {
          this.lootContainers.push(createLootContainer(ruin.x + ox, ruin.y + oy, items));
        }
      }
    }
  }

  update(delta: number): void {
    this.timeOfDay += delta;
    if (this.timeOfDay >= DAY_CYCLE) {
      this.timeOfDay -= DAY_CYCLE;
      this.day += 1;
    }
    this.isNight = this.timeOfDay >= DAY_DURATION;
  }

  removeEnemy(id: string): void {
    const enemy = this.enemies.find(e => e.id === id);
    if (enemy) {
      const loot = generateEnemyLoot(enemy);
      if (loot.length > 0) {
        this.lootContainers.push(createLootContainer(enemy.x, enemy.y, loot));
      }
    }
    this.enemies = this.enemies.filter(e => e.id !== id);
  }

  cleanDeadEnemies(): void {
    const dead = this.enemies.filter(e => e.status === 'dead');
    for (const e of dead) {
      this.removeEnemy(e.id);
    }
  }
}
