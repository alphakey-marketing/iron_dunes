import { World } from './World';
import { Squad } from './Squad';
import { AISystem } from './AI';
import { resolveCombatTick, applyBodyPartEffects, type Combatant } from './Combat';
import { syncToStore, useGameStore } from '../store/gameStore';
import { MAP_DATA } from '../data/map';
import { Pathfinder } from './Pathfinder';
import type { Character as CharData } from '../types';

const UI_SYNC_INTERVAL = 0.1;
const ESCORT_COMPLETION_DISTANCE = 3;
/** Melee attack range for player-controlled characters (in tiles). */
const PLAYER_ATTACK_RANGE = 1.5;
/** Distance at which a character stops chasing and starts fighting. */
const CHASE_STOP_RANGE = 1.2;
/** Distance threshold for advancing to the next path waypoint. */
const WAYPOINT_REACH_DIST = 0.4;

export class GameLoop {
  private world: World;
  private squad: Squad;
  private ai: AISystem;
  private pathfinder: Pathfinder;
  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number = 0;
  private timeScale: number = 1;
  private uiSyncTimer: number = 0;
  private playerCombatTimers: Map<string, number> = new Map();
  /** Tracks enemy IDs already reported as dead so kills are counted exactly once. */
  private reportedDeadIds: Set<string> = new Set();
  /** Per-character A* waypoint queues for click-to-move. */
  private pathQueues: Map<string, Array<{ x: number; y: number }>> = new Map();

  constructor(world: World, squad: Squad) {
    this.world = world;
    this.squad = squad;
    this.ai = new AISystem();
    this.pathfinder = new Pathfinder();
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

  /**
   * Request an A* path for a character to a destination tile.
   * Clears any active combatTarget so the movement is treated as a flee command.
   * autoEngage will not override this movement while the character is moving.
   */
  requestPath(charId: string, toX: number, toY: number): void {
    const char = this.squad.getById(charId);
    if (!char || char.status === 'dead' || char.status === 'unconscious') return;

    char.combatTarget = null;
    this.pathQueues.delete(charId);

    this.pathfinder.findPath(char.x, char.y, toX, toY, (path) => {
      if (path && path.length > 1) {
        // path[0] is the start tile — skip it
        const waypoints = path.slice(1);
        this.pathQueues.set(charId, waypoints);
        char.targetX = waypoints[0].x + 0.5;
        char.targetY = waypoints[0].y + 0.5;
      } else {
        // Fallback: direct movement
        char.targetX = toX;
        char.targetY = toY;
      }
    });

    char.status = 'moving';
  }

  /** Cancel any queued path for a character (e.g. on right-click). */
  clearPath(charId: string): void {
    this.pathQueues.delete(charId);
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

  /**
   * BUG FIX: fire attacks based on combatTarget + distance, not status.
   * The old check (status === 'fighting') caused attacks to miss because status
   * oscillated between 'moving' (chasing) and 'fighting' (in-range), preventing
   * the 0.5 s timer from ever filling.
   */
  private updatePlayerCombat(delta: number): void {
    for (const char of this.squad.characters) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;
      if (!char.combatTarget) continue;

      const enemy = this.world.enemies.find(e => e.id === char.combatTarget);
      if (!enemy || enemy.status === 'dead') {
        char.combatTarget = null;
        this.playerCombatTimers.delete(char.id);
        if (char.status === 'fighting') char.status = 'idle';
        continue;
      }

      const d = Math.sqrt((char.x - enemy.x) ** 2 + (char.y - enemy.y) ** 2);
      if (d > PLAYER_ATTACK_RANGE) continue; // still closing the distance

      // In attack range — mark fighting and tick
      char.status = 'fighting';
      const timer = (this.playerCombatTimers.get(char.id) ?? 0) + delta;
      this.playerCombatTimers.set(char.id, timer);
      if (timer >= 0.5) {
        this.playerCombatTimers.set(char.id, 0);
        const skillMod = char.hunger <= 0 ? 0.5 : 1.0;
        const attacker: Combatant = {
          id: char.id,
          skills: { ...char.skills } as unknown as Combatant['skills'],
          bodyParts: { ...char.bodyParts },
          weapon: char.weapon,
          armour: char.armour,
          status: char.status,
          skillMod,
        };
        const defender: Combatant = {
          id: enemy.id,
          skills: { ...enemy.skills } as unknown as Combatant['skills'],
          bodyParts: { ...enemy.bodyParts },
          weapon: enemy.weapon,
          armour: enemy.armour,
          status: enemy.status,
        };
        resolveCombatTick(attacker, defender);
        char.skills.melee = attacker.skills.melee;
        char.bodyParts = attacker.bodyParts;
        enemy.skills.melee = defender.skills.melee;
        enemy.skills.defence = defender.skills.defence;
        enemy.bodyParts = defender.bodyParts;
        applyBodyPartEffects(defender);
        enemy.status = defender.status as typeof enemy.status;
        applyBodyPartEffects(attacker);
        char.status = attacker.status as CharData['status'];
      }
    }
  }

  /**
   * BUG FIX: do not auto-engage while the character is explicitly moving.
   * Previously autoEngage would immediately reassign combatTarget after the
   * player right-clicked or clicked a tile to flee, preventing any escape.
   */
  private autoEngage(): void {
    for (const char of this.squad.characters) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;
      if (char.combatTarget) continue;
      // Respect explicit player movement — skip auto-engage while moving
      if (char.status === 'moving') continue;
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
      const recoveryHp = 1 + Math.floor(Math.random() * 5);
      if (char.bodyParts.head <= 0) char.bodyParts.head = recoveryHp;
      if (char.bodyParts.chest <= 0) char.bodyParts.chest = recoveryHp;
      if (char.bodyParts.stomach <= 0) char.bodyParts.stomach = recoveryHp;
      char.status = 'idle';
    }
  }

  private trackBanditKills(): void {
    const newlyDead = this.world.enemies.filter(
      e => e.status === 'dead' && e.faction === 'bandit' && !this.reportedDeadIds.has(e.id)
    );
    if (newlyDead.length > 0) {
      for (const e of newlyDead) this.reportedDeadIds.add(e.id);
      useGameStore.getState().incrementBountyKills(newlyDead.length);
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

      if (char.combatTarget) {
        // Direct chase — path queues are cleared; AI handles enemy side
        const enemy = this.world.enemies.find(e => e.id === char.combatTarget);
        if (!enemy || enemy.status === 'dead') {
          char.combatTarget = null;
          char.targetX = null;
          char.targetY = null;
          this.pathQueues.delete(char.id);
          char.status = 'idle';
          continue;
        }
        const d = Math.sqrt((char.x - enemy.x) ** 2 + (char.y - enemy.y) ** 2);
        if (d <= CHASE_STOP_RANGE) {
          char.status = 'fighting';
          char.targetX = null;
          char.targetY = null;
          this.pathQueues.delete(char.id);
          continue;
        }
        // Chase: direct movement toward enemy (no pathfinding to keep it snappy)
        char.targetX = enemy.x;
        char.targetY = enemy.y;
      } else {
        // Follow A* waypoints when available
        const path = this.pathQueues.get(char.id);
        if (path && path.length > 0) {
          const wp = path[0];
          char.targetX = wp.x + 0.5;
          char.targetY = wp.y + 0.5;
        }
      }

      if (char.targetX === null || char.targetY === null) continue;

      const dx = char.targetX - char.x;
      const dy = char.targetY - char.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < WAYPOINT_REACH_DIST) {
        // Close enough to sub-target (only reachable without combatTarget,
        // since CHASE_STOP_RANGE > WAYPOINT_REACH_DIST keeps combat separate)
        const path = this.pathQueues.get(char.id);
        if (path && path.length > 0) {
          path.shift(); // Advance to next waypoint
          if (path.length > 0) {
            const next = path[0];
            char.targetX = next.x + 0.5;
            char.targetY = next.y + 0.5;
          } else {
            this.pathQueues.delete(char.id);
            char.x = char.targetX;
            char.y = char.targetY;
            char.targetX = null;
            char.targetY = null;
            char.status = 'idle';
          }
        } else {
          char.x = char.targetX;
          char.y = char.targetY;
          char.targetX = null;
          char.targetY = null;
          char.status = 'idle';
        }
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
