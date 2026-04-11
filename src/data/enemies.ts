import type { Enemy, Skills, BodyParts, Wanderer, WandererArchetype } from '../types';
import { ITEMS } from './items';

function randomSkill(): number {
  return Math.floor(Math.random() * 21) + 15; // 15-35
}

function randomWandererSkill(): number {
  return Math.floor(Math.random() * 11) + 5; // 5-15
}

function makeBodyParts(): BodyParts {
  return {
    head: 100,
    chest: 100,
    stomach: 100,
    leftArm: 100,
    rightArm: 100,
    leftLeg: 100,
    rightLeg: 100,
  };
}

function makeSkills(): Skills {
  return {
    melee: randomSkill(),
    defence: randomSkill(),
    strength: randomSkill(),
    athletics: randomSkill(),
    labouring: randomSkill(),
    stealth: randomSkill(),
  };
}

let enemyCounter = 0;
let wandererCounter = 0;

export function createBandit(spawnX: number, spawnY: number, patrolPath: { x: number; y: number }[]): Enemy {
  const id = `bandit_${++enemyCounter}`;
  const skills = makeSkills();
  const useClub = Math.random() < 0.5;
  const weapon = useClub ? { ...ITEMS.ironClub } : { ...ITEMS.rustySword };
  const armour = Math.random() < 0.5 ? { ...ITEMS.dustcoat } : null;

  return {
    id,
    name: 'Bandit',
    faction: 'bandit',
    templateId: 'bandit',
    x: spawnX,
    y: spawnY,
    maxHealth: 100 + (skills.strength * 2),
    skills,
    bodyParts: makeBodyParts(),
    status: 'idle',
    weapon,
    armour,
    state: 'patrol',
    patrolPath,
    patrolIndex: 0,
    spawnX,
    spawnY,
    aggroTarget: null,
    moveSpeed: 1.0 + (skills.athletics * 0.01),
    combatTimer: 0,
  };
}

export function spawnBanditCamp(centerX: number, centerY: number, count = 3): Enemy[] {
  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 6;
    const offsetY = (Math.random() - 0.5) * 6;
    const sx = Math.round(centerX + offsetX);
    const sy = Math.round(centerY + offsetY);
    const patrolPath = [
      { x: sx, y: sy },
      { x: sx + 2, y: sy },
      { x: sx + 2, y: sy + 2 },
      { x: sx, y: sy + 2 },
    ];
    enemies.push(createBandit(sx, sy, patrolPath));
  }
  return enemies;
}

/**
 * Creates a Wanderer NPC (GDD §4.5).
 * Skills 5–15, weapon 70% unarmed / 30% rusty sword, no armour.
 * Desperate Raiders are bandit faction; Drifters and Scavengers are neutral.
 */
export function createWanderer(archetype: WandererArchetype, spawnX: number, spawnY: number): Wanderer {
  const id = `wanderer_${++wandererCounter}`;

  const skills: Skills = {
    melee: randomWandererSkill(),
    defence: randomWandererSkill(),
    strength: randomWandererSkill(),
    athletics: randomWandererSkill(),
    labouring: randomWandererSkill(),
    stealth: randomWandererSkill(),
  };

  const weapon = Math.random() < 0.3 ? { ...ITEMS.rustySword } : null;

  const faction = archetype === 'desperateRaider' ? 'bandit' : 'neutral';

  let recruitCost: number | null = null;
  if (archetype === 'drifter') {
    recruitCost = Math.floor(500 + Math.random() * 501);  // 500–1,000
  } else if (archetype === 'scavenger') {
    recruitCost = Math.floor(1000 + Math.random() * 1001); // 1,000–2,000
  }

  const name = archetype === 'drifter' ? 'Drifter'
    : archetype === 'scavenger' ? 'Scavenger'
    : 'Desperate Raider';

  const initialState = archetype === 'desperateRaider' ? 'wander'
    : archetype === 'scavenger' ? 'seek_ruin'
    : 'wander';

  return {
    id,
    name,
    faction,
    templateId: archetype,
    x: spawnX,
    y: spawnY,
    maxHealth: 100 + (skills.strength * 2),
    skills,
    bodyParts: makeBodyParts(),
    status: 'idle',
    weapon,
    armour: null,
    state: initialState,
    patrolPath: [],
    patrolIndex: 0,
    spawnX,
    spawnY,
    aggroTarget: null,
    moveSpeed: 0.7 + (skills.athletics * 0.01),
    combatTimer: 0,
    // Wanderer-specific fields
    archetype,
    recruitCost,
    wanderDir: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
    wanderTimer: 10 + Math.random() * 10, // 10–20 s for first direction
    targetRuinIdx: 0,
    idleTimer: 0,
    visitedRuinIndices: [],
    scavengerFleeing: false,
    scavengerFleeTimer: 0,
    raiderFleeTimer: 0,
  };
}
