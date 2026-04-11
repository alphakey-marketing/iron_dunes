import type { Character as CharData } from '../types';
import { ITEMS } from '../data/items';

export function createCharacter(id: string, name: string, x: number, y: number): CharData {
  const skills = {
    melee: 20,
    defence: 20,
    strength: 20,
    athletics: 20,
    labouring: 20,
    stealth: 20,
  };
  return {
    id,
    name,
    faction: 'player',
    maxHealth: getMaxHealth(skills.strength),
    moveSpeed: getMoveSpeed(skills.athletics, 100, 100),
    skills,
    bodyParts: {
      head: 100,
      chest: 100,
      stomach: 100,
      leftArm: 100,
      rightArm: 100,
      leftLeg: 100,
      rightLeg: 100,
    },
    hunger: 100,
    status: 'idle',
    weapon: null,
    armour: null,
    backpack: [{ ...ITEMS.driedRation }],
    x,
    y,
    targetX: null,
    targetY: null,
    combatTarget: null,
    hungerTimer: 0,
    athleticsTimer: 0,
    starvationTimer: 0,
    isCrouching: false,
  };
}

export function getMaxHealth(strength: number): number {
  return 100 + (strength * 2);
}

export function getMoveSpeed(athletics: number, leftLeg: number, rightLeg: number): number {
  let speed = 1.0 + (athletics * 0.01);
  if (leftLeg < 50) speed *= 0.75;
  if (leftLeg <= 0) speed = 0;
  if (rightLeg < 50) speed *= 0.75;
  if (rightLeg <= 0) speed = 0;
  return speed;
}

export function getTotalHealth(char: CharData): number {
  const bp = char.bodyParts;
  return bp.head + bp.chest + bp.stomach + bp.leftArm + bp.rightArm + bp.leftLeg + bp.rightLeg;
}

export function isAlive(char: CharData): boolean {
  return char.status !== 'dead';
}

export function isConscious(char: CharData): boolean {
  return char.status !== 'unconscious' && char.status !== 'dead';
}

export function applyBodyPartDamage(char: CharData, part: keyof CharData['bodyParts'], damage: number): void {
  char.bodyParts[part] = Math.max(0, char.bodyParts[part] - damage);
  checkBodyPartEffects(char);
}

export function checkBodyPartEffects(char: CharData): void {
  if (char.status === 'dead') return;

  if (char.bodyParts.head <= 0 || char.bodyParts.chest <= 0 || char.bodyParts.stomach <= 0) {
    if (char.status !== 'unconscious') {
      char.status = 'unconscious';
    }
  }

  if (getTotalHealth(char) <= 0) {
    char.status = 'dead';
  }
}

function autoEat(char: CharData): boolean {
  const foodIdx = char.backpack.findIndex(item => item.type === 'food' && (item.hungerRestore ?? 0) > 0);
  if (foodIdx === -1) return false;
  const food = char.backpack[foodIdx];
  char.hunger = Math.min(100, char.hunger + (food.hungerRestore ?? 0));
  char.backpack.splice(foodIdx, 1);
  return true;
}

export function updateCharacter(char: CharData, delta: number): void {
  if (!isAlive(char)) return;

  let hungerRate = 1 / 30;
  if (char.status === 'fighting') hungerRate *= 2;
  if (char.status === 'moving') hungerRate *= 1.25;
  if (char.bodyParts.stomach < 50) hungerRate *= 2;

  char.hungerTimer += delta;
  if (char.hungerTimer >= 1) {
    char.hunger = Math.max(0, char.hunger - (hungerRate * char.hungerTimer));
    char.hungerTimer = 0;
  }

  if (char.hunger < 20) {
    autoEat(char);
  }

  if (char.hunger <= 0) {
    char.starvationTimer += delta;
    if (char.starvationTimer >= 1) {
      applyBodyPartDamage(char, 'chest', 1);
      char.starvationTimer = 0;
    }
  } else {
    char.starvationTimer = 0;
  }

  if (char.status === 'moving') {
    char.athleticsTimer += delta;
    if (char.athleticsTimer >= 30) {
      char.skills.athletics = Math.min(100, char.skills.athletics + 0.1);
      char.athleticsTimer = 0;
    }
  }

  if (char.status !== 'fighting' && isAlive(char)) {
    const healRate = isConscious(char) ? 1 / 60 : 0.5 / 60;
    const parts = Object.keys(char.bodyParts) as Array<keyof typeof char.bodyParts>;
    for (const part of parts) {
      if (char.bodyParts[part] > 0 && char.bodyParts[part] < 100) {
        char.bodyParts[part] = Math.min(100, char.bodyParts[part] + healRate * delta);
      }
    }
    if (char.status === 'unconscious') {
      if (
        char.bodyParts.head > 10 &&
        char.bodyParts.chest > 10 &&
        char.bodyParts.stomach > 10
      ) {
        char.status = 'idle';
      }
    }
  }

  char.moveSpeed = getMoveSpeed(
    char.hunger <= 0 ? char.skills.athletics * 0.8 : char.skills.athletics,
    char.bodyParts.leftLeg,
    char.bodyParts.rightLeg
  ) * (char.isCrouching ? 0.5 : 1.0);
}

export function useMedicalKit(char: CharData, part: keyof CharData['bodyParts']): boolean {
  const kitIdx = char.backpack.findIndex(item => item.type === 'medical');
  if (kitIdx === -1) return false;
  char.bodyParts[part] = Math.min(100, char.bodyParts[part] + 30);
  char.backpack.splice(kitIdx, 1);
  checkBodyPartEffects(char);
  return true;
}

/**
 * Trains stealth skill while the character is crouching near an enemy (GDD §4.2 / §6.6).
 * +0.15 XP/s while crouching within the base (un-modified) aggro radius of any enemy.
 * @param nearEnemy Whether the character is currently within a base aggro radius.
 */
export function updateStealthTraining(char: CharData, nearEnemy: boolean, delta: number): void {
  if (!char.isCrouching || !nearEnemy) return;
  char.skills.stealth = Math.min(100, char.skills.stealth + 0.15 * delta);
}
