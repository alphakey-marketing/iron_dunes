import { World } from './World';
import { Squad } from './Squad';
import { AISystem } from './AI';
import { syncToStore } from '../store/gameStore';

const UI_SYNC_INTERVAL = 0.1;

export class GameLoop {
  private world: World;
  private squad: Squad;
  private ai: AISystem;
  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number = 0;
  private timeScale: number = 1;
  private uiSyncTimer: number = 0;

  constructor(world: World, squad: Squad) {
    this.world = world;
    this.squad = squad;
    this.ai = new AISystem();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setPaused(paused: boolean): void {
    if (paused) {
      this.timeScale = 0;
    } else if (this.timeScale === 0) {
      this.timeScale = 1;
    }
  }

  setSlowMotion(slow: boolean): void {
    if (this.timeScale === 0) return;
    this.timeScale = slow ? 0.25 : 1;
  }

  private tick(now: number): void {
    if (!this.running) return;

    const rawDelta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    const delta = rawDelta * this.timeScale;

    if (this.timeScale > 0) {
      this.world.update(delta);
      this.squad.update(delta);
      this.ai.update(this.world.enemies, this.squad.characters, delta, this.world.isNight);
      this.world.cleanDeadEnemies();
    }

    this.uiSyncTimer += rawDelta;
    if (this.uiSyncTimer >= UI_SYNC_INTERVAL) {
      this.uiSyncTimer = 0;
      syncToStore(this.world, this.squad);
    }

    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }
}
