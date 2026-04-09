import type { Item, BodyParts } from '../types';

type BodyPartKey = keyof BodyParts;

const HIT_LOCATIONS: Array<{ part: BodyPartKey; weight: number }> = [
  { part: 'head', weight: 0.10 },
  { part: 'chest', weight: 0.25 },
  { part: 'stomach', weight: 0.20 },
  { part: 'leftArm', weight: 0.10 },
  { part: 'rightArm', weight: 0.10 },
  { part: 'leftLeg', weight: 0.125 },
  { part: 'rightLeg', weight: 0.125 },
];

function randomHitLocation(): BodyPartKey {
  const roll = Math.random();
  let cumulative = 0;
  for (const loc of HIT_LOCATIONS) {
    cumulative += loc.weight;
    if (roll < cumulative) return loc.part;
  }
  return 'chest';
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getWeaponStats(weapon: Item | null): { baseDamage: number; attackBonus: number } {
  if (!weapon) return { baseDamage: 4, attackBonus: 0 };
  return {
    baseDamage: weapon.baseDamage ?? 4,
    attackBonus: weapon.attackBonus ?? 0,
  };
}

function getArmourStats(armour: Item | null): { defenceBonus: number; damageReduction: number } {
  if (!armour) return { defenceBonus: 0, damageReduction: 0 };
  return {
    defenceBonus: armour.defenceBonus ?? 0,
    damageReduction: armour.damageReduction ?? 0,
  };
}

export interface Combatant {
  id: string;
  skills: { melee: number; defence: number; strength: number; [key: string]: number };
  bodyParts: BodyParts;
  weapon: Item | null;
  armour: Item | null;
  status: string;
  /** 0–1 multiplier applied to skill rolls (e.g. 0.5 when starving). Default 1. */
  skillMod?: number;
}

export function resolveCombatTick(attacker: Combatant, defender: Combatant): void {
  const weapon = getWeaponStats(attacker.weapon);
  const armour = getArmourStats(defender.armour);

  // Body-part penalties on attacker (GDD §4.3)
  const armCrippled = attacker.bodyParts.leftArm <= 0 || attacker.bodyParts.rightArm <= 0;
  const armWeakened = attacker.bodyParts.leftArm < 50 || attacker.bodyParts.rightArm < 50;
  const chestWeakened = attacker.bodyParts.chest < 50;

  if (armCrippled) {
    // Cannot attack; defender still gets a small defence tick
    defender.skills.defence = Math.min(100, defender.skills.defence + 0.2);
    return;
  }

  const attackerSkillMod = attacker.skillMod ?? 1.0;
  const defenderSkillMod = defender.skillMod ?? 1.0;

  const attackRoll = attacker.skills.melee * attackerSkillMod + weapon.attackBonus + rand(-10, 10);
  const defenceRoll = defender.skills.defence * defenderSkillMod + armour.defenceBonus + rand(-5, 5);

  if (attackRoll > defenceRoll) {
    let rawDamage = weapon.baseDamage + (attacker.skills.melee * 0.1);
    // Additive penalties: each weakened/crippled part reduces damage by 30% (GDD §4.3)
    let damagePenalty = 0;
    if (armWeakened) damagePenalty += 0.3;
    if (chestWeakened) damagePenalty += 0.3;
    rawDamage *= Math.max(0, 1 - damagePenalty);
    const finalDamage = rawDamage * (1 - armour.damageReduction);
    const part = randomHitLocation();

    defender.bodyParts[part] = Math.max(0, defender.bodyParts[part] - finalDamage);

    attacker.skills.melee = Math.min(100, attacker.skills.melee + 0.5);
    defender.skills.defence = Math.min(100, defender.skills.defence + 0.4);
  } else {
    defender.skills.defence = Math.min(100, defender.skills.defence + 0.2);
  }
}

export function applyBodyPartEffects(combatant: Combatant): void {
  if (combatant.bodyParts.head <= 0 || combatant.bodyParts.chest <= 0 || combatant.bodyParts.stomach <= 0) {
    if (combatant.status !== 'dead' && combatant.status !== 'unconscious') {
      combatant.status = 'unconscious';
    }
  }
  const total = Object.values(combatant.bodyParts).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    combatant.status = 'dead';
  }
}
