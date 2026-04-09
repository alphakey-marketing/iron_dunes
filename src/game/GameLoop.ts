import { World } from './World';
import { Squad } from './Squad';
import { AISystem } from './AI';
import { resolveCombatTick, applyBodyPartEffects, type Combatant } from './Combat';
import { syncToStore, useGameStore } from '../store/gameStore';
import { MAP_DATA } from '../data/map';
import type { Character as CharData } from '../types';

const UI_SYNC_INTERVAL = 0.1;
const ESCORT_COMPLETION_DISTANCE = 3;

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
      this.autoEngage();
      this.recoverUnconscious();
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
        const skillMod = char.hunger <= 0 ? 0.5 : 1.0;
        const attacker: Combatant = { id: char.id, skills: char.skills as unknown as Combatant['skills'], bodyParts: char.bodyParts, weapon: char.weapon, armour: char.armour, status: char.status, skillMod };
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

  private autoEngage(): void {
    for (const char of this.squad.characters) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;
      if (char.combatTarget) continue;
      const attacker = this.world.enemies.find(
        e => e.status !== 'dead' && (e.state === 'attack' || e.state === 'chase') && e.aggroTarget === char.id
      );
      if (attacker) {
        char.combatTarget = attacker.id;
      }
    }
  }

  private recoverUnconscious(): void {
    const hasNearbyThreat = this.world.enemies.some(
      e => e.status !== 'dead' && (e.state === 'attack' || e.state === 'chase')
    );
    if (hasNearbyThreat) return;

    for (const char of this.squad.characters) {
      if (char.status !== 'unconscious') continue;
      // Wake with 1–5 HP on each critical body part (GDD §4.3)
      const recoveryHp = 1 + Math.floor(Math.random() * 5);
      if (char.bodyParts.head <= 0) char.bodyParts.head = recoveryHp;
      if (char.bodyParts.chest <= 0) char.bodyParts.chest = recoveryHp;
      if (char.bodyParts.stomach <= 0) char.bodyParts.stomach = recoveryHp;
      char.status = 'idle';
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
        if (d <= ESCORT_COMPLETION_DISTANCE) {
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
        const tileX = Math.floor(char.x);
        const tileY = Math.floor(char.y);
        const biome = (tileX >= 0 && tileX < MAP_DATA.width && tileY >= 0 && tileY < MAP_DATA.height)
          ? MAP_DATA.tiles[tileY][tileX].biome
          : 'desert';
        const tileMod = biome === 'dustPlains' ? 0.85 : 1.0;
        char.x += (dx / d) * char.moveSpeed * tileMod * delta;
        char.y += (dy / d) * char.moveSpeed * tileMod * delta;
        char.status = 'moving';
      }
    }
  }
}
