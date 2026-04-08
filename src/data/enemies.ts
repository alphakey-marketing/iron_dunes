import type { Enemy, Skills, BodyParts } from '../types';
import { ITEMS } from './items';

function randomSkill(): number {
  return Math.floor(Math.random() * 21) + 15; // 15-35
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
    currentHealth: 100 + (skills.strength * 2),
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
