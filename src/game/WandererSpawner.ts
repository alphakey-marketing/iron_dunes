/**
 * WandererSpawner — manages the wanderer NPC pool (GDD §4.5).
 *
 * Keeps 3–5 wanderers alive on the map at all times.
 * Handles FSMs for all 3 archetypes:
 *   Drifter        — random-direction wander (never aggros)
 *   Scavenger      — seeks ruin POIs; flees if attacked
 *   Desperate Raider — bandit-style FSM with base aggro range 4
 */

import type { Wanderer, Character as CharData, BodyParts } from '../types';
import type { World } from './World';
import { createWanderer } from '../data/enemies';
import { POI, MAP_DATA } from '../data/map';
import { resolveCombatTick, applyBodyPartEffects, type Combatant } from './Combat';
import { computeEffectiveAggroRange } from './AI';
import { createLootContainer } from './Economy';
import { makeCatsPouch } from '../data/items';

// Pool limits
const MIN_ACTIVE = 3;
const MAX_ACTIVE = 5;
// Respawn timers (seconds)
const RESPAWN_MIN = 60;
const RESPAWN_MAX = 90;
// Early-game spawn weighting (GDD §4.5)
const EARLY_GAME_DAYS = 2;
const EARLY_GAME_NEAR_RANGE = 15;
const EARLY_GAME_NEAR_CHANCE = 0.6;
// Settlement exclusion zone (tiles from town centre)
const SETTLEMENT_EXCLUSION = 10;
// Movement
const DRIFTER_DIR_MIN = 10;
const DRIFTER_DIR_MAX = 20;
const SCAVENGER_FLEE_DURATION = 10;
const SCAVENGER_RUIN_IDLE_MIN = 30;
const SCAVENGER_RUIN_IDLE_MAX = 60;
// Desperate Raider aggro
const RAIDER_BASE_AGGRO = 4;
const RAIDER_FLEE_RESET_TIME = 30;
const RAIDER_FLEE_HP = 0.2;
const COMBAT_INTERVAL = 0.5;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function getHpPct(w: Wanderer): number {
  return Object.values(w.bodyParts).reduce((a, b) => a + b, 0) / 700;
}

function toCombatant(entity: Wanderer | CharData): Combatant {
  return {
    id: entity.id,
    skills: { ...entity.skills } as unknown as Combatant['skills'],
    bodyParts: { ...entity.bodyParts },
    weapon: entity.weapon,
    armour: entity.armour,
    status: entity.status,
  };
}

/** Picks a random archetype per GDD §4.5 distribution: Drifter 40%, Scavenger 35%, Desperate Raider 25%. */
function pickArchetype(): Wanderer['archetype'] {
  const r = Math.random();
  if (r < 0.40) return 'drifter';
  if (r < 0.75) return 'scavenger';
  return 'desperateRaider';
}

export class WandererSpawner {
  /** Live wanderer objects — read by GameLoop for combat and syncToStore. */
  wanderers: Wanderer[] = [];

  private respawnTimers: number[] = []; // pending respawn countdown values (seconds)
  /** Valid edge tiles for spawning, computed once and cached. */
  private cachedEdgeTiles: { x: number; y: number }[] | null = null;

  update(delta: number, world: World, squad: CharData[]): void {
    this.updateFSMs(delta, world, squad);
    this.cleanDead(world);
    this.tickRespawnTimers(delta, world);
    this.ensureMinimum(world);
  }

  // ---------------------------------------------------------------------------
  // FSM dispatch
  // ---------------------------------------------------------------------------

  private updateFSMs(delta: number, world: World, squad: CharData[]): void {
    const aliveSquad = squad.filter(c => c.status !== 'dead' && c.status !== 'unconscious');

    for (const w of this.wanderers) {
      if (w.status === 'dead' || w.status === 'unconscious') continue;

      switch (w.archetype) {
        case 'drifter':
          this.handleDrifter(w, delta);
          break;
        case 'scavenger':
          this.handleScavenger(w, delta, aliveSquad);
          break;
        case 'desperateRaider':
          this.handleDesperateRaider(w, delta, world, aliveSquad);
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Drifter FSM — wanders randomly, never aggros (GDD §4.5)
  // ---------------------------------------------------------------------------

  private handleDrifter(w: Wanderer, delta: number): void {
    w.wanderTimer -= delta;

    if (w.wanderTimer <= 0) {
      // Pick a new random direction (unit vector)
      const angle = Math.random() * Math.PI * 2;
      w.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
      w.wanderTimer = DRIFTER_DIR_MIN + Math.random() * (DRIFTER_DIR_MAX - DRIFTER_DIR_MIN);
    }

    // Move in current direction (no pathfinding — will simply stop at map edge)
    const newX = w.x + w.wanderDir.x * w.moveSpeed * delta;
    const newY = w.y + w.wanderDir.y * w.moveSpeed * delta;
    const clampedX = Math.max(0, Math.min(MAP_DATA.width - 1, newX));
    const clampedY = Math.max(0, Math.min(MAP_DATA.height - 1, newY));

    // On wall collision (clamped), pick a new direction next tick
    if (clampedX !== newX || clampedY !== newY) {
      w.wanderTimer = 0;
    }

    w.x = clampedX;
    w.y = clampedY;
    w.state = 'wander';
    w.status = 'moving';
  }

  // ---------------------------------------------------------------------------
  // Scavenger FSM — seeks ruins, flees from attackers (GDD §4.5)
  // ---------------------------------------------------------------------------

  private handleScavenger(w: Wanderer, delta: number, squad: CharData[]): void {
    // Detect incoming attack: any squad member has this wanderer as combatTarget
    const underAttack = squad.some(c => c.combatTarget === w.id);

    if (underAttack && !w.scavengerFleeing) {
      w.scavengerFleeing = true;
      w.scavengerFleeTimer = 0;
      w.state = 'flee';
    }

    if (w.scavengerFleeing) {
      w.scavengerFleeTimer += delta;

      // Flee away from the nearest attacker
      const attacker = squad
        .filter(c => c.combatTarget === w.id)
        .reduce<CharData | null>((nearest, c) => {
          if (!nearest) return c;
          return dist(w.x, w.y, c.x, c.y) < dist(w.x, w.y, nearest.x, nearest.y) ? c : nearest;
        }, null);

      if (attacker) {
        const d = dist(w.x, w.y, attacker.x, attacker.y);
        if (d > 0.1) {
          w.x += ((w.x - attacker.x) / d) * w.moveSpeed * delta;
          w.y += ((w.y - attacker.y) / d) * w.moveSpeed * delta;
          w.x = Math.max(0, Math.min(MAP_DATA.width - 1, w.x));
          w.y = Math.max(0, Math.min(MAP_DATA.height - 1, w.y));
          w.status = 'moving';
        }
      }

      if (w.scavengerFleeTimer >= SCAVENGER_FLEE_DURATION) {
        w.scavengerFleeing = false;
        w.scavengerFleeTimer = 0;
        w.state = 'seek_ruin';
      }
      return;
    }

    // Idle at ruin
    if (w.state === 'idle_at_ruin') {
      w.idleTimer += delta;
      w.status = 'idle';
      if (w.idleTimer >= w.scavengerIdleDuration) {
        w.visitedRuinIndices.push(w.targetRuinIdx);
        w.idleTimer = 0;
        w.state = 'seek_ruin';
      }
      return;
    }

    // Seek ruin
    const ruinSites = POI.ruinSites;
    let unvisited = ruinSites
      .map((r, i) => ({ ...r, i }))
      .filter(r => !w.visitedRuinIndices.includes(r.i));

    if (unvisited.length === 0) {
      w.visitedRuinIndices = [];
      unvisited = ruinSites.map((r, i) => ({ ...r, i }));
    }

    // Find nearest unvisited ruin
    let nearest = unvisited[0];
    let minD = dist(w.x, w.y, nearest.x, nearest.y);
    for (const r of unvisited) {
      const d = dist(w.x, w.y, r.x, r.y);
      if (d < minD) { minD = d; nearest = r; }
    }
    w.targetRuinIdx = nearest.i;

    const target = ruinSites[w.targetRuinIdx];
    const d = dist(w.x, w.y, target.x, target.y);

    if (d < 1.0) {
      w.state = 'idle_at_ruin';
      w.idleTimer = 0;
      w.scavengerIdleDuration = SCAVENGER_RUIN_IDLE_MIN + Math.random() * (SCAVENGER_RUIN_IDLE_MAX - SCAVENGER_RUIN_IDLE_MIN);
      w.status = 'idle';
    } else {
      w.x += ((target.x - w.x) / d) * w.moveSpeed * delta;
      w.y += ((target.y - w.y) / d) * w.moveSpeed * delta;
      w.state = 'seek_ruin';
      w.status = 'moving';
    }
  }

  // ---------------------------------------------------------------------------
  // Desperate Raider FSM — bandit-style with base aggro range 4 (GDD §4.5 / §8.2)
  // ---------------------------------------------------------------------------

  private handleDesperateRaider(w: Wanderer, delta: number, world: World, squad: CharData[]): void {
    const BASE_AGGRO = world.isNight ? RAIDER_BASE_AGGRO * 0.5 : RAIDER_BASE_AGGRO;
    const hp = getHpPct(w);

    // Flee when low HP
    if (hp < RAIDER_FLEE_HP && w.state !== 'flee') {
      w.state = 'flee';
      w.aggroTarget = null;
      w.raiderFleeTimer = 0;
    }

    switch (w.state) {
      case 'wander':
      case 'idle': {
        // Aggro scan — group aggro does NOT propagate to wanderers (GDD §8.3)
        for (const char of squad) {
          if (char.status === 'dead' || char.status === 'unconscious') continue;
          const effectiveRange = computeEffectiveAggroRange(BASE_AGGRO, char);
          if (dist(w.x, w.y, char.x, char.y) <= effectiveRange) {
            w.state = 'chase';
            w.aggroTarget = char.id;
            break;
          }
        }
        if (w.state === 'wander' || w.state === 'idle') {
          // Light wander while not aggroed
          this.handleDrifter(w, delta);
          w.state = 'wander';
        }
        break;
      }

      case 'chase': {
        const target = squad.find(c => c.id === w.aggroTarget);
        if (!target || target.status === 'dead') {
          w.state = 'wander';
          w.aggroTarget = null;
          break;
        }
        const d = dist(w.x, w.y, target.x, target.y);
        if (d < 1.0) {
          w.state = 'attack';
        } else {
          w.x += ((target.x - w.x) / d) * w.moveSpeed * delta;
          w.y += ((target.y - w.y) / d) * w.moveSpeed * delta;
          w.status = 'moving';
        }
        break;
      }

      case 'attack': {
        const target = squad.find(c => c.id === w.aggroTarget);
        if (!target) { w.state = 'wander'; break; }
        const d = dist(w.x, w.y, target.x, target.y);
        if (d > 1.5) { w.state = 'chase'; break; }

        w.status = 'fighting';
        w.combatTimer += delta;
        if (w.combatTimer >= COMBAT_INTERVAL) {
          w.combatTimer = 0;
          const attackerC = toCombatant(w);
          const defenderC = toCombatant(target);
          resolveCombatTick(attackerC, defenderC);
          w.skills.melee = attackerC.skills.melee;
          w.bodyParts = attackerC.bodyParts;
          target.skills.melee = defenderC.skills.melee;
          target.skills.defence = defenderC.skills.defence;
          target.bodyParts = defenderC.bodyParts;
          applyBodyPartEffects(attackerC);
          applyBodyPartEffects(defenderC);
          w.status = attackerC.status as Wanderer['status'];
          target.status = defenderC.status as CharData['status'];
        }
        break;
      }

      case 'flee': {
        w.raiderFleeTimer += delta;
        // Flee away from spawn (same direction as bandit flee in AI.ts)
        const d = dist(w.x, w.y, w.spawnX, w.spawnY);
        if (d > 0.5) {
          w.x += ((w.x - w.spawnX) / d) * w.moveSpeed * delta;
          w.y += ((w.y - w.spawnY) / d) * w.moveSpeed * delta;
          w.x = Math.max(0, Math.min(MAP_DATA.width - 1, w.x));
          w.y = Math.max(0, Math.min(MAP_DATA.height - 1, w.y));
        }
        if (w.raiderFleeTimer >= RAIDER_FLEE_RESET_TIME) {
          w.state = 'wander';
          w.aggroTarget = null;
          w.status = 'idle';
          w.raiderFleeTimer = 0;
          const parts = Object.keys(w.bodyParts) as Array<keyof BodyParts>;
          for (const part of parts) {
            w.bodyParts[part] = Math.min(100, w.bodyParts[part] + 20);
          }
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pool management
  // ---------------------------------------------------------------------------

  /** Removes dead wanderers and spawns loot (GDD §4.5 loot rules). */
  private cleanDead(world: World): void {
    const dead = this.wanderers.filter(w => w.status === 'dead');
    for (const w of dead) {
      // Wanderer loot: cats 10–80; weapon if carrying one; no medical kit
      const lootItems = [];
      const cats = Math.floor(10 + Math.random() * 71); // 10–80
      lootItems.push(makeCatsPouch(cats));
      if (w.weapon) lootItems.push({ ...w.weapon });
      if (lootItems.length > 0) {
        world.lootContainers.push(createLootContainer(w.x, w.y, lootItems));
      }
      // Queue a respawn
      this.respawnTimers.push(RESPAWN_MIN + Math.random() * (RESPAWN_MAX - RESPAWN_MIN));
    }
    this.wanderers = this.wanderers.filter(w => w.status !== 'dead');
  }

  private tickRespawnTimers(delta: number, world: World): void {
    for (let i = this.respawnTimers.length - 1; i >= 0; i--) {
      this.respawnTimers[i] -= delta;
      if (this.respawnTimers[i] <= 0) {
        this.respawnTimers.splice(i, 1);
        if (this.wanderers.length < MAX_ACTIVE) {
          const pos = this.getSpawnPosition(world);
          if (pos) {
            const archetype = pickArchetype();
            this.wanderers.push(createWanderer(archetype, pos.x, pos.y));
          }
        }
      }
    }
  }

  /** Ensures at least MIN_ACTIVE wanderers are on the map. */
  private ensureMinimum(world: World): void {
    const missing = Math.max(0, MIN_ACTIVE - this.wanderers.length);
    for (let i = 0; i < missing; i++) {
      const pos = this.getSpawnPosition(world);
      if (!pos) break;
      const archetype = pickArchetype();
      this.wanderers.push(createWanderer(archetype, pos.x, pos.y));
    }
  }

  /**
   * Picks a spawn position:
   * - Early game (days 1–2, 60% chance): 10–15 tiles from settlement centre
   *   (the ring just outside the exclusion zone, within wanderer-encounter range)
   * - Otherwise: random desert edge tile
   * Never within 10 tiles of settlement; biome must be desert or ruins.
   */
  private getSpawnPosition(world: World): { x: number; y: number } | null {
    const MAP_W = MAP_DATA.width;
    const MAP_H = MAP_DATA.height;
    const cx = POI.town.x;
    const cy = POI.town.y;

    const isEarlyGame = world.day <= EARLY_GAME_DAYS;

    if (isEarlyGame && Math.random() < EARLY_GAME_NEAR_CHANCE) {
      // Spawn in the ring between SETTLEMENT_EXCLUSION and EARLY_GAME_NEAR_RANGE tiles
      for (let attempt = 0; attempt < 100; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = SETTLEMENT_EXCLUSION + Math.random() * (EARLY_GAME_NEAR_RANGE - SETTLEMENT_EXCLUSION);
        const x = Math.round(cx + Math.cos(angle) * radius);
        const y = Math.round(cy + Math.sin(angle) * radius);
        if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) continue;
        const biome = MAP_DATA.tiles[y]?.[x]?.biome;
        if (biome !== 'desert' && biome !== 'ruins') continue;
        return { x, y };
      }
    }

    // Edge spawn: build the candidate list once and cache it (map tiles never change at runtime)
    if (!this.cachedEdgeTiles) {
      const candidates: { x: number; y: number }[] = [];
      for (let i = 0; i < MAP_W; i++) {
        candidates.push({ x: i, y: 0 });
        candidates.push({ x: i, y: MAP_H - 1 });
      }
      for (let i = 1; i < MAP_H - 1; i++) {
        candidates.push({ x: 0, y: i });
        candidates.push({ x: MAP_W - 1, y: i });
      }
      this.cachedEdgeTiles = candidates.filter(p => {
        const biome = MAP_DATA.tiles[p.y]?.[p.x]?.biome;
        if (biome !== 'desert' && biome !== 'ruins') return false;
        return dist(p.x, p.y, cx, cy) >= SETTLEMENT_EXCLUSION;
      });
    }

    const valid = this.cachedEdgeTiles;
    if (valid.length === 0) return null;
    return valid[Math.floor(Math.random() * valid.length)];
  }
}
