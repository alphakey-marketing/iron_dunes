import type { Vendor, Item, Character as CharData, BountyContract, Recruit, LootContainer, Enemy, Skills } from '../types';
import { ITEMS } from '../data/items';

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeSkills(base: number): Skills {
  return {
    melee: randInt(base, base + 15),
    defence: randInt(base, base + 15),
    strength: randInt(base, base + 15),
    athletics: randInt(base, base + 15),
    labouring: randInt(base, base + 15),
    stealth: randInt(base, base + 15),
  };
}

const RECRUIT_NAMES = [
  'Kira', 'Duso', 'Marsh', 'Flek', 'Tara', 'Sabo', 'Olun', 'Vess', 'Brak', 'Lyse',
];

export function createVendor(id: string, name: string, x: number, y: number): Vendor {
  return {
    id,
    name,
    x,
    y,
    inventory: [
      { ...ITEMS.driedRation },
      { ...ITEMS.driedRation },
      { ...ITEMS.cactusFruit },
      { ...ITEMS.cookedMeat },
      { ...ITEMS.rustySword },
      { ...ITEMS.shortsword },
      { ...ITEMS.leatherVest },
      { ...ITEMS.dustcoat },
      { ...ITEMS.medicalKit },
      { ...ITEMS.medicalKit },
    ],
    buys: ['weapon', 'armour', 'food', 'scrap'],
  };
}

export function buyItem(vendor: Vendor, itemId: string, playerCats: number, playerBackpack: Item[]): {
  success: boolean;
  newCats: number;
  message: string;
} {
  const idx = vendor.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return { success: false, newCats: playerCats, message: 'Item not found' };

  const item = vendor.inventory[idx];
  if (playerCats < item.buyPrice) {
    return { success: false, newCats: playerCats, message: 'Not enough cats' };
  }

  vendor.inventory.splice(idx, 1);
  playerBackpack.push({ ...item });
  return { success: true, newCats: playerCats - item.buyPrice, message: `Bought ${item.name}` };
}

export function sellItem(vendor: Vendor, item: Item, playerCats: number, playerBackpack: Item[], itemIdx: number): {
  success: boolean;
  newCats: number;
  message: string;
} {
  if (!vendor.buys.includes(item.type)) {
    return { success: false, newCats: playerCats, message: 'Vendor does not buy this' };
  }

  playerBackpack.splice(itemIdx, 1);
  vendor.inventory.push({ ...item });
  return { success: true, newCats: playerCats + item.sellPrice, message: `Sold ${item.name}` };
}

export function generateBounties(_day: number): BountyContract[] {
  const bountyTypes = ['banditHunt', 'campRaid', 'escort'] as const;
  return bountyTypes.map((type) => {
    const id = genId(`bounty`);
    const reward = randInt(300, 800);
    return {
      id,
      type,
      description: getBountyDescription(type, reward),
      reward,
      targetCount: type === 'banditHunt' ? randInt(2, 5) : undefined,
      currentCount: type === 'banditHunt' ? 0 : undefined,
      completed: false,
      targetX: type !== 'banditHunt' ? randInt(5, 58) : undefined,
      targetY: type !== 'banditHunt' ? randInt(5, 58) : undefined,
    };
  });
}

function getBountyDescription(type: string, reward: number): string {
  switch (type) {
    case 'banditHunt': return `Eliminate bandit raiders. Reward: ${reward} cats`;
    case 'campRaid': return `Raid the bandit camp and clear it out. Reward: ${reward} cats`;
    case 'escort': return `Escort a trader safely across the dunes. Reward: ${reward} cats`;
    default: return `Unknown bounty. Reward: ${reward} cats`;
  }
}

export function generateRecruits(day: number): Recruit[] {
  return Array.from({ length: 3 }, (_, i) => {
    const name = RECRUIT_NAMES[(day * 3 + i) % RECRUIT_NAMES.length];
    const skills = makeSkills(10 + day * 2);
    const cost = randInt(200, 600);
    return { id: genId('recruit'), name, skills, cost };
  });
}

export function generateEnemyLoot(enemy: Enemy): Item[] {
  const loot: Item[] = [];
  if (enemy.weapon) loot.push({ ...enemy.weapon });
  if (enemy.armour) loot.push({ ...enemy.armour });
  if (Math.random() < 0.4) loot.push({ ...ITEMS.scrapMetal });
  if (Math.random() < 0.3) loot.push({ ...ITEMS.driedRation });
  return loot;
}

export function createLootContainer(x: number, y: number, items: Item[]): LootContainer {
  return {
    id: genId('loot'),
    x,
    y,
    items,
    opened: false,
  };
}

export function openLootContainer(container: LootContainer, char: CharData): Item[] {
  if (container.opened) return [];
  container.opened = true;
  const taken = [...container.items];
  char.backpack.push(...taken);
  container.items = [];
  return taken;
}
