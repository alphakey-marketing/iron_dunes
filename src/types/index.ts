export type CharStatus = 'idle' | 'moving' | 'fighting' | 'unconscious' | 'dead';
export type Faction = 'player' | 'bandit' | 'neutral';
export type BiomeType = 'desert' | 'ruins' | 'dustPlains' | 'settlement';
export type ItemType = 'weapon' | 'armour' | 'food' | 'medical' | 'currency' | 'scrap';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'wander' | 'seek_ruin' | 'idle_at_ruin';
export type BountyType = 'banditHunt' | 'campRaid' | 'escort';
export type WandererArchetype = 'drifter' | 'scavenger' | 'desperateRaider';

export interface Skills {
  melee: number;
  defence: number;
  strength: number;
  athletics: number;
  labouring: number;
  stealth: number;
}

export interface BodyParts {
  head: number;
  chest: number;
  stomach: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  weight: number;
  buyPrice: number;
  sellPrice: number;
  baseDamage?: number;
  attackBonus?: number;
  defenceBonus?: number;
  damageReduction?: number;
  hungerRestore?: number;
}

export interface Character {
  id: string;
  name: string;
  faction: Faction;
  maxHealth: number;
  moveSpeed: number;
  skills: Skills;
  bodyParts: BodyParts;
  hunger: number;
  status: CharStatus;
  weapon: Item | null;
  armour: Item | null;
  backpack: Item[];
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  combatTarget: string | null;
  hungerTimer: number;
  athleticsTimer: number;
  starvationTimer: number;
  isCrouching: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  faction: Faction;
  templateId: string;
  x: number;
  y: number;
  maxHealth: number;
  skills: Skills;
  bodyParts: BodyParts;
  status: CharStatus;
  weapon: Item | null;
  armour: Item | null;
  state: EnemyState;
  patrolPath: { x: number; y: number }[];
  patrolIndex: number;
  spawnX: number;
  spawnY: number;
  aggroTarget: string | null;
  moveSpeed: number;
  combatTimer: number;
}

/** Wanderer NPC — an Enemy with archetype-specific FSM state (GDD §4.5). */
export interface Wanderer extends Enemy {
  archetype: WandererArchetype;
  /** Cats to recruit; null means not recruitable (Desperate Raider). */
  recruitCost: number | null;
  /** Current wander direction vector (Drifter). */
  wanderDir: { x: number; y: number };
  /**
   * Drifter: seconds until next direction change.
   */
  wanderTimer: number;
  /** Scavenger: index into POI.ruinSites of the current target ruin. */
  targetRuinIdx: number;
  /** Scavenger: seconds spent idling at current ruin. */
  idleTimer: number;
  /** Scavenger: target idle duration at the current ruin (set on arrival). */
  scavengerIdleDuration: number;
  /** Scavenger: indices of already-visited ruin sites this cycle. */
  visitedRuinIndices: number[];
  /** Scavenger: currently executing a flee-from-threat burst. */
  scavengerFleeing: boolean;
  /** Scavenger: seconds elapsed in the current flee burst. */
  scavengerFleeTimer: number;
  /** Desperate Raider / shared flee: timer for flee cooldown. */
  raiderFleeTimer: number;
}

export interface Vendor {
  id: string;
  name: string;
  x: number;
  y: number;
  inventory: Item[];
  buys: ItemType[];
}

export interface BountyContract {
  id: string;
  type: BountyType;
  description: string;
  reward: number;
  target?: string;
  targetCount?: number;
  currentCount?: number;
  completed: boolean;
  accepted: boolean;
  targetX?: number;
  targetY?: number;
}

export interface Recruit {
  id: string;
  name: string;
  skills: Skills;
  cost: number;
}

export interface LootContainer {
  id: string;
  x: number;
  y: number;
  items: Item[];
  opened: boolean;
}

export interface GameState {
  day: number;
  timeOfDay: number;
  isNight: boolean;
  cats: number;
  squad: Character[];
  selectedCharId: string | null;
  enemies: Enemy[];
  wanderers: Wanderer[];
  vendors: Vendor[];
  bounties: BountyContract[];
  bountyDayRefresh: number;
  recruits: Recruit[];
  recruitDayRefresh: number;
  shopVendorId: string | null;
  bountyBoardOpen: boolean;
  recruitOpen: boolean;
  gameOver: boolean;
  paused: boolean;
  slowMotion: boolean;
  lootContainers: LootContainer[];
  isCrouching: boolean;
  wandererMenuId: string | null;
}

export interface Tile {
  biome: BiomeType;
  passable: boolean;
}

export interface MapData {
  width: number;
  height: number;
  tiles: Tile[][];
}
