import type { Enemy, Character as CharData } from '../types';
import { resolveCombatTick, applyBodyPartEffects, type Combatant } from './Combat';

const AGGRO_RANGE_DAY = 8;
const AGGRO_RANGE_NIGHT = 4;
const GROUP_AGGRO_RANGE = 15;
const FLEE_HP_THRESHOLD = 0.2;
const MAX_CHASE_RANGE = 20;
const FLEE_RESET_TIME = 60;
const COMBAT_INTERVAL = 0.5;
const PATROL_SPEED_MOD = 0.6;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function getHealthPercent(enemy: Enemy): number {
  const total = Object.values(enemy.bodyParts).reduce((a, b) => a + b, 0);
  return total / 700;
}

function toCombatant(entity: Enemy | CharData): Combatant {
  return {
    id: entity.id,
    skills: entity.skills as unknown as { melee: number; defence: number; strength: number; [key: string]: number },
    bodyParts: entity.bodyParts,
    weapon: entity.weapon,
    armour: entity.armour,
    status: entity.status,
  };
}

export class AISystem {
  private fleeTimers: Map<string, number> = new Map();

  update(enemies: Enemy[], squad: CharData[], delta: number, isNight: boolean): void {
    const aliveSquad = squad.filter(c => c.status !== 'dead' && c.status !== 'unconscious');

    for (const enemy of enemies) {
      if (enemy.status === 'dead' || enemy.status === 'unconscious') continue;
      this.updateEnemy(enemy, enemies, aliveSquad, delta, isNight);
    }
  }

  private updateEnemy(
    enemy: Enemy,
    allEnemies: Enemy[],
    squad: CharData[],
    delta: number,
    isNight: boolean
  ): void {
    const hp = getHealthPercent(enemy);
    const aggroRange = isNight ? AGGRO_RANGE_NIGHT : AGGRO_RANGE_DAY;

    if (hp < FLEE_HP_THRESHOLD && enemy.state !== 'flee') {
      enemy.state = 'flee';
      enemy.aggroTarget = null;
      this.fleeTimers.set(enemy.id, 0);
    }

    switch (enemy.state) {
      case 'idle':
        this.handleIdle(enemy, squad, aggroRange, allEnemies);
        break;
      case 'patrol':
        this.handlePatrol(enemy, squad, aggroRange, allEnemies, delta);
        break;
      case 'chase':
        this.handleChase(enemy, squad, delta);
        break;
      case 'attack':
        this.handleAttack(enemy, squad, delta);
        break;
      case 'flee':
        this.handleFlee(enemy, delta);
        break;
    }
  }

  private handleIdle(enemy: Enemy, squad: CharData[], aggroRange: number, allEnemies: Enemy[]): void {
    const target = this.findTarget(enemy, squad, aggroRange);
    if (target) {
      this.triggerAggro(enemy, target.id, allEnemies);
    }
  }

  private handlePatrol(
    enemy: Enemy,
    squad: CharData[],
    aggroRange: number,
    allEnemies: Enemy[],
    delta: number
  ): void {
    const target = this.findTarget(enemy, squad, aggroRange);
    if (target) {
      this.triggerAggro(enemy, target.id, allEnemies);
      return;
    }

    if (enemy.patrolPath.length === 0) return;
    const wp = enemy.patrolPath[enemy.patrolIndex];
    const d = dist(enemy.x, enemy.y, wp.x, wp.y);
    if (d < 0.5) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
    } else {
      const speed = enemy.moveSpeed * PATROL_SPEED_MOD;
      const dx = (wp.x - enemy.x) / d;
      const dy = (wp.y - enemy.y) / d;
      enemy.x += dx * speed * delta;
      enemy.y += dy * speed * delta;
    }
  }

  private handleChase(enemy: Enemy, squad: CharData[], delta: number): void {
    if (!enemy.aggroTarget) {
      enemy.state = 'patrol';
      return;
    }

    const target = squad.find(c => c.id === enemy.aggroTarget);
    if (!target) {
      enemy.state = 'patrol';
      enemy.aggroTarget = null;
      return;
    }

    const d = dist(enemy.x, enemy.y, target.x, target.y);
    const spawnDist = dist(enemy.x, enemy.y, enemy.spawnX, enemy.spawnY);

    if (spawnDist > MAX_CHASE_RANGE) {
      enemy.state = 'flee';
      this.fleeTimers.set(enemy.id, FLEE_RESET_TIME);
      return;
    }

    if (d < 1.0) {
      enemy.state = 'attack';
    } else {
      const dx = (target.x - enemy.x) / d;
      const dy = (target.y - enemy.y) / d;
      enemy.x += dx * enemy.moveSpeed * delta;
      enemy.y += dy * enemy.moveSpeed * delta;
      enemy.status = 'moving';
    }
  }

  private handleAttack(enemy: Enemy, squad: CharData[], delta: number): void {
    if (!enemy.aggroTarget) {
      enemy.state = 'patrol';
      return;
    }

    const target = squad.find(c => c.id === enemy.aggroTarget);
    if (!target) {
      enemy.state = 'patrol';
      enemy.aggroTarget = null;
      return;
    }

    const d = dist(enemy.x, enemy.y, target.x, target.y);
    if (d > 1.5) {
      enemy.state = 'chase';
      return;
    }

    enemy.status = 'fighting';
    enemy.combatTimer += delta;
    if (enemy.combatTimer >= COMBAT_INTERVAL) {
      enemy.combatTimer = 0;
      const enemyCombatant = toCombatant(enemy);
      const targetCombatant = toCombatant(target);
      resolveCombatTick(enemyCombatant, targetCombatant);
      // Write back mutated values
      enemy.skills.melee = enemyCombatant.skills.melee;
      enemy.bodyParts = enemyCombatant.bodyParts;
      target.skills.defence = targetCombatant.skills.defence;
      target.bodyParts = targetCombatant.bodyParts;
      applyBodyPartEffects(enemyCombatant);
      applyBodyPartEffects(targetCombatant);
      enemy.status = enemyCombatant.status as Enemy['status'];
      target.status = targetCombatant.status as CharData['status'];
    }
  }

  private handleFlee(enemy: Enemy, delta: number): void {
    let timer = this.fleeTimers.get(enemy.id) ?? 0;
    timer += delta;
    this.fleeTimers.set(enemy.id, timer);

    const d = dist(enemy.x, enemy.y, enemy.spawnX, enemy.spawnY);
    if (d > 0.5) {
      const dx = (enemy.x - enemy.spawnX) / d;
      const dy = (enemy.y - enemy.spawnY) / d;
      enemy.x += dx * enemy.moveSpeed * delta;
      enemy.y += dy * enemy.moveSpeed * delta;
    }

    if (timer >= FLEE_RESET_TIME) {
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
      enemy.state = 'patrol';
      enemy.aggroTarget = null;
      enemy.status = 'idle';
      const parts = Object.keys(enemy.bodyParts) as Array<keyof typeof enemy.bodyParts>;
      for (const part of parts) {
        enemy.bodyParts[part] = Math.min(100, enemy.bodyParts[part] + 20);
      }
      enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + 20);
      this.fleeTimers.delete(enemy.id);
    }
  }

  private findTarget(enemy: Enemy, squad: CharData[], aggroRange: number): CharData | null {
    for (const char of squad) {
      if (char.status === 'dead' || char.status === 'unconscious') continue;
      const d = dist(enemy.x, enemy.y, char.x, char.y);
      if (d <= aggroRange) return char;
    }
    return null;
  }

  private triggerAggro(enemy: Enemy, targetId: string, allEnemies: Enemy[]): void {
    enemy.state = 'chase';
    enemy.aggroTarget = targetId;

    for (const other of allEnemies) {
      if (other.id === enemy.id) continue;
      if (other.state !== 'idle' && other.state !== 'patrol') continue;
      const d = dist(enemy.x, enemy.y, other.x, other.y);
      if (d <= GROUP_AGGRO_RANGE) {
        other.state = 'chase';
        other.aggroTarget = targetId;
      }
    }
  }
}
