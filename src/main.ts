import { createRoot } from 'react-dom/client';
import React from 'react';
import { Renderer } from './render/Renderer';
import { World } from './game/World';
import { Squad } from './game/Squad';
import { GameLoop } from './game/GameLoop';
import { setGameRefs, useGameStore } from './store/gameStore';

/** Maximum tile coordinate (map is 64×64, indices 0–63). */
const MAP_MAX_COORD = 63;
/** How many tiles away to flee when the player right-clicks during combat. */
const FLEE_DISTANCE = 6;
import { HUD } from './ui/HUD';
import { CharDetailPanel } from './ui/CharDetailPanel';
import { ShopModal } from './ui/ShopModal';
import { BountyBoard } from './ui/BountyBoard';
import { RecruitModal } from './ui/RecruitModal';
import { GameOver } from './ui/GameOver';
import { WandererActionMenu } from './ui/WandererActionMenu';

async function main(): Promise<void> {
  const world = new World();
  const squad = new Squad();
  const renderer = new Renderer();

  await renderer.init();

  // Create game loop before registering click handlers so handlers can reference it
  const gameLoop = new GameLoop(world, squad);

  setGameRefs(world, squad, gameLoop.wandererSpawner);

  renderer.setOnTileClick((tileX: number, tileY: number) => {
    const state = useGameStore.getState();
    const selectedId = state.selectedCharId;
    if (!selectedId) return;
    const char = squad.getById(selectedId);
    if (!char || char.status === 'dead' || char.status === 'unconscious') return;
    // Use A* pathfinding; clears combatTarget so autoEngage won't re-engage while moving
    gameLoop.requestPath(selectedId, tileX, tileY);
  });

  renderer.setOnEntityClick((event) => {
    const state = useGameStore.getState();

    if (event.type === 'vendor') {
      useGameStore.getState().openShop(event.id);
      return;
    }

    if (event.type === 'loot') {
      const selectedId = state.selectedCharId ?? squad.getLeader()?.id;
      if (selectedId) {
        useGameStore.getState().openLoot(event.id, selectedId);
      }
      return;
    }

    if (event.type === 'wanderer') {
      // For Desperate Raiders: show Attack/Ignore menu.
      // For Drifters/Scavengers: show Talk/Recruit/Ignore menu.
      useGameStore.getState().openWandererMenu(event.id);
      return;
    }

    if (event.type === 'enemy') {
      const selectedId = state.selectedCharId;
      if (!selectedId) return;
      const char = squad.getById(selectedId);
      if (!char || char.status === 'dead' || char.status === 'unconscious') return;
      const enemy = world.enemies.find(e => e.id === event.id);
      if (!enemy || enemy.status === 'dead') return;
      // Move towards enemy and mark as combat target
      char.targetX = enemy.x;
      char.targetY = enemy.y;
      char.status = 'moving';
      char.combatTarget = enemy.id;
      gameLoop.clearPath(char.id);
    }
  });

  renderer.setOnRightClick(() => {
    const state = useGameStore.getState();
    const selectedId = state.selectedCharId;
    if (!selectedId) return;
    const char = squad.getById(selectedId);
    if (!char) return;

    char.combatTarget = null;
    gameLoop.clearPath(char.id);

    // If threats are actively chasing/attacking this character, auto-flee from the nearest one.
    // This sets status='moving' so autoEngage won't immediately re-engage (GDD §6.1 flee).
    const threats = world.enemies.filter(
      e => e.status !== 'dead' && (e.state === 'attack' || e.state === 'chase') && e.aggroTarget === selectedId
    );

    if (threats.length > 0) {
      let nearest = threats[0];
      let minDist = Infinity;
      for (const t of threats) {
        const d = Math.sqrt((char.x - t.x) ** 2 + (char.y - t.y) ** 2);
        if (d < minDist) { minDist = d; nearest = t; }
      }
      const dirX = char.x - nearest.x;
      const dirY = char.y - nearest.y;
      const dirD = Math.sqrt(dirX * dirX + dirY * dirY);
      if (dirD > 0) {
        const fleeX = Math.round(Math.min(MAP_MAX_COORD, Math.max(0, char.x + (dirX / dirD) * FLEE_DISTANCE)));
        const fleeY = Math.round(Math.min(MAP_MAX_COORD, Math.max(0, char.y + (dirY / dirD) * FLEE_DISTANCE)));
        gameLoop.requestPath(char.id, fleeX, fleeY);
      } else {
        // Directly on top of enemy — just cancel action
        char.targetX = null;
        char.targetY = null;
        if (char.status === 'moving' || char.status === 'fighting') char.status = 'idle';
      }
    } else {
      // No active threat — just cancel the current action
      char.targetX = null;
      char.targetY = null;
      if (char.status === 'moving' || char.status === 'fighting') {
        char.status = 'idle';
      }
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      useGameStore.getState().toggleSlowMotion();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      useGameStore.getState().togglePause();
    }
    if (e.code === 'KeyB') {
      useGameStore.getState().openBountyBoard();
    }
    if (e.code === 'KeyR') {
      useGameStore.getState().openRecruit();
    }
    if (e.code === 'KeyC') {
      gameLoop.toggleCrouch();
    }
  });

  // HUD crouch button dispatches a custom event to avoid circular store dependency
  window.addEventListener('iron-dunes:toggleCrouch', () => {
    gameLoop.toggleCrouch();
  });

  // WandererActionMenu "Attack" button dispatches this event
  window.addEventListener('iron-dunes:attackWanderer', (e: Event) => {
    const detail = (e as CustomEvent<{ id: string }>).detail;
    const state = useGameStore.getState();
    const selectedId = state.selectedCharId;
    if (!selectedId) return;
    const char = squad.getById(selectedId);
    if (!char || char.status === 'dead' || char.status === 'unconscious') return;
    const wanderer = gameLoop.wandererSpawner.wanderers.find(w => w.id === detail.id);
    if (!wanderer || wanderer.status === 'dead') return;
    char.targetX = wanderer.x;
    char.targetY = wanderer.y;
    char.status = 'moving';
    char.combatTarget = wanderer.id;
    gameLoop.clearPath(char.id);
  });

  useGameStore.subscribe((state) => {
    gameLoop.setPaused(state.paused);
    gameLoop.setSlowMotion(state.slowMotion);
  });

  gameLoop.start();

  // Capture live references so renderLoop reads current positions at 60fps
  // instead of relying on the 10Hz Zustand store snapshots.
  const wandererSpawner = gameLoop.wandererSpawner;

  function renderLoop(): void {
    const state = useGameStore.getState();
    const escortTargets = state.bounties
      .filter(b => b.type === 'escort' && b.accepted && !b.completed && b.targetX !== undefined && b.targetY !== undefined)
      .map(b => ({ x: b.targetX!, y: b.targetY! }));
    renderer.update(
      squad.characters,
      world.enemies,
      wandererSpawner.wanderers,
      world.lootContainers,
      state.vendors,
      state.selectedCharId,
      world.timeOfDay,
      world.isNight,
      escortTargets,
    );
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  const uiRoot = document.getElementById('ui-root');
  if (uiRoot) {
    const root = createRoot(uiRoot);
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(HUD),
        React.createElement(CharDetailPanel),
        React.createElement(ShopModal),
        React.createElement(BountyBoard),
        React.createElement(RecruitModal),
        React.createElement(WandererActionMenu),
        React.createElement(GameOver),
      )
    );
  }
}

main().catch(console.error);
