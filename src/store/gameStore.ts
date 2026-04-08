import { create } from 'zustand';
import type { GameState } from '../types';
import type { World } from '../game/World';
import type { Squad } from '../game/Squad';
import { createVendor, buyItem, sellItem, generateBounties, generateRecruits, openLootContainer } from '../game/Economy';
import { createCharacter } from '../game/Character';
import { POI } from '../data/map';

const initialVendors = [
  createVendor('vendor_1', 'Old Sump Trader', POI.town.x, POI.town.y),
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
      b.id === bountyId ? { ...b } : b
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

    openLootContainer(container, char);
    set({ lootContainers: [...state.lootContainers] });
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

