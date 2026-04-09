import { create } from 'zustand';
import type { GameState } from '../types';
import type { World } from '../game/World';
import type { Squad } from '../game/Squad';
import { createGeneralTrader, createArmourSmith, createWeaponsDealer, buyItem, sellItem, generateBounties, generateRecruits, openLootContainer } from '../game/Economy';
import { createCharacter, useMedicalKit } from '../game/Character';
import { POI } from '../data/map';
import type { Character as CharData } from '../types';

const initialVendors = [
  createGeneralTrader('vendor_1', POI.town.x - 1, POI.town.y - 1),
  createArmourSmith('vendor_2', POI.town.x + 1, POI.town.y - 1),
  createWeaponsDealer('vendor_3', POI.town.x, POI.town.y + 1),
];

const initialBounties = generateBounties(1);
const initialRecruits = generateRecruits(1);

const initialState: GameState = {
  day: 1,
  timeOfDay: 0,
  isNight: false,
  cats: 300,
  squad: [],
  selectedCharId: null,
  enemies: [],
  vendors: initialVendors,
  bounties: initialBounties,
  bountyDayRefresh: 1,
  recruits: initialRecruits,
  recruitDayRefresh: 1,
  shopVendorId: null,
  bountyBoardOpen: false,
  recruitOpen: false,
  gameOver: false,
  paused: false,
  slowMotion: false,
  lootContainers: [],
};

interface GameActions {
  selectChar: (id: string) => void;
  openShop: (vendorId: string) => void;
  closeShop: () => void;
  openBountyBoard: () => void;
  closeBountyBoard: () => void;
  openRecruit: () => void;
  closeRecruit: () => void;
  togglePause: () => void;
  toggleSlowMotion: () => void;
  buyItemAction: (vendorId: string, itemId: string) => void;
  sellItemAction: (vendorId: string, charId: string, itemIdx: number) => void;
  acceptBounty: (bountyId: string) => void;
  recruitMember: (recruitId: string) => void;
  openLoot: (containerId: string, charId: string) => void;
  equipItem: (charId: string, itemIdx: number) => void;
  unequipWeapon: (charId: string) => void;
  unequipArmour: (charId: string) => void;
  incrementBountyKills: (count: number) => void;
  completeEscortBounty: (bountyId: string) => void;
  useMedKit: (charId: string, part: keyof CharData['bodyParts']) => void;
}

let squadRef: Squad | null = null;

export function setGameRefs(_world: World, squad: Squad): void {
  squadRef = squad;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  selectChar: (id) => {
    squadRef?.selectCharacter(id);
    set({ selectedCharId: id });
  },

  openShop: (vendorId) => set({ shopVendorId: vendorId }),
  closeShop: () => set({ shopVendorId: null }),
  openBountyBoard: () => set({ bountyBoardOpen: true }),
  closeBountyBoard: () => set({ bountyBoardOpen: false }),
  openRecruit: () => set({ recruitOpen: true }),
  closeRecruit: () => set({ recruitOpen: false }),

  togglePause: () => {
    const paused = !get().paused;
    set({ paused });
  },

  toggleSlowMotion: () => {
    const slowMotion = !get().slowMotion;
    set({ slowMotion });
  },

  buyItemAction: (vendorId, itemId) => {
    const state = get();
    const vendor = state.vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    const leader = squadRef?.getLeader();
    if (!leader) return;

    const result = buyItem(vendor, itemId, state.cats, leader.backpack);
    if (result.success) {
      set({ cats: result.newCats, vendors: [...state.vendors] });
    }
  },

  sellItemAction: (vendorId, charId, itemIdx) => {
    const state = get();
    const vendor = state.vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    const char = squadRef?.getById(charId);
    if (!char) return;
    const item = char.backpack[itemIdx];
    if (!item) return;

    const result = sellItem(vendor, item, state.cats, char.backpack, itemIdx);
    if (result.success) {
      set({ cats: result.newCats, vendors: [...state.vendors] });
    }
  },

  acceptBounty: (bountyId) => {
    const state = get();
    const bounties = state.bounties.map(b =>
      b.id === bountyId ? { ...b, accepted: true } : b
    );
    set({ bounties });
  },

  recruitMember: (recruitId) => {
    const state = get();
    const recruit = state.recruits.find(r => r.id === recruitId);
    if (!recruit) return;
    if (state.cats < recruit.cost) return;
    if (!squadRef) return;
    if (squadRef.characters.length >= 4) return;

    const newChar = createCharacter(recruit.id, recruit.name, 32, 30);
    newChar.skills = { ...recruit.skills };
    squadRef.addCharacter(newChar);

    const recruits = state.recruits.filter(r => r.id !== recruitId);
    set({ cats: state.cats - recruit.cost, recruits });
  },

  openLoot: (containerId, charId) => {
    const state = get();
    const container = state.lootContainers.find(c => c.id === containerId);
    if (!container) return;
    const char = squadRef?.getById(charId);
    if (!char) return;

    // openLootContainer now skips currency items — collect them separately
    const rawItems = [...container.items];
    openLootContainer(container, char);

    // Convert any currency items to cats balance
    const catsGained = rawItems
      .filter(item => item.type === 'currency')
      .reduce((sum, item) => sum + item.buyPrice, 0);

    // Check campRaid bounty completion (container near a bandit camp)
    const nearBanditCamp = POI.banditCamps.some(camp => {
      const d = Math.sqrt((container.x - camp.x) ** 2 + (container.y - camp.y) ** 2);
      return d <= 10;
    });

    let extraCats = catsGained;
    const bounties = state.bounties.map(b => {
      if (b.type === 'campRaid' && b.accepted && !b.completed && nearBanditCamp) {
        extraCats += b.reward;
        return { ...b, completed: true };
      }
      return b;
    });

    set({ lootContainers: [...state.lootContainers], cats: state.cats + extraCats, bounties });
  },

  equipItem: (charId, itemIdx) => {
    const char = squadRef?.getById(charId);
    if (!char) return;
    const item = char.backpack[itemIdx];
    if (!item) return;

    if (item.type === 'weapon') {
      if (char.weapon) char.backpack.push({ ...char.weapon });
      char.weapon = item;
      char.backpack.splice(itemIdx, 1);
    } else if (item.type === 'armour') {
      if (char.armour) char.backpack.push({ ...char.armour });
      char.armour = item;
      char.backpack.splice(itemIdx, 1);
    }
    set({ squad: [...(squadRef?.characters ?? [])] });
  },

  unequipWeapon: (charId) => {
    const char = squadRef?.getById(charId);
    if (!char || !char.weapon) return;
    char.backpack.push({ ...char.weapon });
    char.weapon = null;
    set({ squad: [...(squadRef?.characters ?? [])] });
  },

  unequipArmour: (charId) => {
    const char = squadRef?.getById(charId);
    if (!char || !char.armour) return;
    char.backpack.push({ ...char.armour });
    char.armour = null;
    set({ squad: [...(squadRef?.characters ?? [])] });
  },

  incrementBountyKills: (count) => {
    const state = get();
    let catsGained = 0;
    const bounties = state.bounties.map(b => {
      if (b.type === 'banditHunt' && b.accepted && !b.completed && b.currentCount !== undefined && b.targetCount !== undefined) {
        const newCount = b.currentCount + count;
        const completed = newCount >= b.targetCount;
        if (completed) catsGained += b.reward;
        return { ...b, currentCount: Math.min(newCount, b.targetCount), completed };
      }
      return b;
    });
    set({ bounties, cats: state.cats + catsGained });
  },

  completeEscortBounty: (bountyId) => {
    const state = get();
    let catsGained = 0;
    const bounties = state.bounties.map(b => {
      if (b.id === bountyId && b.type === 'escort' && b.accepted && !b.completed) {
        catsGained += b.reward;
        return { ...b, completed: true };
      }
      return b;
    });
    set({ bounties, cats: state.cats + catsGained });
  },

  useMedKit: (charId, part) => {
    const char = squadRef?.getById(charId);
    if (!char) return;
    useMedicalKit(char, part);
    set({ squad: [...(squadRef?.characters ?? [])] });
  },
}));

export function syncToStore(world: World, squad: Squad): void {
  const store = useGameStore.getState();

  const allDead = squad.allDead();

  const newBounties = world.day > store.bountyDayRefresh
    ? generateBounties(world.day)
    : store.bounties;
  const newRecruits = world.day > store.recruitDayRefresh
    ? generateRecruits(world.day)
    : store.recruits;

  useGameStore.setState({
    day: world.day,
    timeOfDay: world.timeOfDay,
    isNight: world.isNight,
    squad: [...squad.characters],
    selectedCharId: squad.selectedCharId,
    enemies: [...world.enemies],
    lootContainers: [...world.lootContainers],
    gameOver: allDead,
    bounties: newBounties,
    recruits: newRecruits,
    bountyDayRefresh: world.day > store.bountyDayRefresh ? world.day : store.bountyDayRefresh,
    recruitDayRefresh: world.day > store.recruitDayRefresh ? world.day : store.recruitDayRefresh,
  });
}

