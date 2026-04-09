import { World } from './World';
import { Squad } from './Squad';
import { AISystem } from './AI';
import { resolveCombatTick, applyBodyPartEffects, type Combatant } from './Combat';
import { syncToStore, useGameStore } from '../store/gameStore';
import type { Character as CharData } from '../types';

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
      this.updateMovement(delta);
      this.world.update(delta);
      this.squad.update(delta);
      this.updatePlayerCombat(delta);
      this.ai.update(this.world.enemies, this.squad.characters, delta, this.world.isNight);
      this.trackBanditKills();
      this.checkEscortBounties();
      this.world.cleanDeadEnemies();
    }

    this.uiSyncTimer += rawDelta;
    if (this.uiSyncTimer >= UI_SYNC_INTERVAL) {
      this.uiSyncTimer = 0;
      syncToStore(this.world, this.squad);
    }

    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  private playerCombatTimers: Map<string, number> = new Map();

  private updatePlayerCombat(delta: number): void {
    for (const char of this.squad.characters) {
      if (char.status !== 'fighting' || !char.combatTarget) continue;
      const enemy = this.world.enemies.find(e => e.id === char.combatTarget);
      if (!enemy || enemy.status === 'dead') {
        char.combatTarget = null;
        char.status = 'idle';
        continue;
      }
      const timer = (this.playerCombatTimers.get(char.id) ?? 0) + delta;
      this.playerCombatTimers.set(char.id, timer);
      if (timer >= 0.5) {
        this.playerCombatTimers.set(char.id, 0);
        const attacker: Combatant = { id: char.id, skills: char.skills as unknown as Combatant['skills'], bodyParts: char.bodyParts, weapon: char.weapon, armour: char.armour, status: char.status };
        const defender: Combatant = { id: enemy.id, skills: enemy.skills as unknown as Combatant['skills'], bodyParts: enemy.bodyParts, weapon: enemy.weapon, armour: enemy.armour, status: enemy.status };
        resolveCombatTick(attacker, defender);
        char.skills.melee = attacker.skills.melee;
        char.bodyParts = attacker.bodyParts;
        enemy.skills.defence = defender.skills.defence;
        enemy.bodyParts = defender.bodyParts;
        applyBodyPartEffects(defender);
        enemy.status = defender.status as typeof enemy.status;
        applyBodyPartEffects(attacker);
        char.status = attacker.status as CharData['status'];
      }
    }
  }

  private trackBanditKills(): void {
    const justDied = this.world.enemies.filter(
      e => e.status === 'dead' && e.faction === 'bandit'
    );
    if (justDied.length > 0) {
      useGameStore.getState().incrementBountyKills(justDied.length);
    }
  }

  private checkEscortBounties(): void {
    const state = useGameStore.getState();
    const activeEscorts = state.bounties.filter(
      b => b.type === 'escort' && b.accepted && !b.completed &&
           b.targetX !== undefined && b.targetY !== undefined
    );
    if (activeEscorts.length === 0) return;

    for (const char of this.squad.characters) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;
      for (const bounty of activeEscorts) {
        const d = Math.sqrt((char.x - bounty.targetX!) ** 2 + (char.y - bounty.targetY!) ** 2);
        if (d <= 3) {
          useGameStore.getState().completeEscortBounty(bounty.id);
        }
      }
    }
  }

  private updateMovement(delta: number): void {
    for (const char of this.squad.characters) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;

      // Update target towards combatTarget enemy position each tick
      if (char.combatTarget) {
        const enemy = this.world.enemies.find(e => e.id === char.combatTarget);
        if (!enemy || enemy.status === 'dead') {
          char.combatTarget = null;
          char.targetX = null;
          char.targetY = null;
          char.status = 'idle';
          continue;
        }
        const d = Math.sqrt((char.x - enemy.x) ** 2 + (char.y - enemy.y) ** 2);
        if (d <= 1.2) {
          // In attack range — handled by AI system attacking back; player side just stays
          char.status = 'fighting';
          char.targetX = null;
          char.targetY = null;
          continue;
        }
        // Keep chasing
        char.targetX = enemy.x;
        char.targetY = enemy.y;
      }

      if (char.targetX === null || char.targetY === null) continue;
      const dx = char.targetX - char.x;
      const dy = char.targetY - char.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.1) {
        char.x = char.targetX;
        char.y = char.targetY;
        char.targetX = null;
        char.targetY = null;
        if (!char.combatTarget) char.status = 'idle';
      } else {
        char.x += (dx / d) * char.moveSpeed * delta;
        char.y += (dy / d) * char.moveSpeed * delta;
        char.status = 'moving';
      }
    }
  }
}
