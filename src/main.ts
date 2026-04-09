import { createRoot } from 'react-dom/client';
import React from 'react';
import { Renderer } from './render/Renderer';
import { World } from './game/World';
import { Squad } from './game/Squad';
import { GameLoop } from './game/GameLoop';
import { setGameRefs, useGameStore } from './store/gameStore';
import { HUD } from './ui/HUD';
import { CharDetailPanel } from './ui/CharDetailPanel';
import { ShopModal } from './ui/ShopModal';
import { BountyBoard } from './ui/BountyBoard';
import { RecruitModal } from './ui/RecruitModal';
import { GameOver } from './ui/GameOver';

async function main(): Promise<void> {
  const world = new World();
  const squad = new Squad();
  const renderer = new Renderer();

  setGameRefs(world, squad);

  await renderer.init();

  renderer.setOnTileClick((tileX: number, tileY: number) => {
    const state = useGameStore.getState();
    const selectedId = state.selectedCharId;
    if (!selectedId) return;
    const char = squad.getById(selectedId);
    if (!char || char.status === 'dead' || char.status === 'unconscious') return;
    char.targetX = tileX;
    char.targetY = tileY;
    char.status = 'moving';
    char.combatTarget = null;
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
    }
  });

  renderer.setOnRightClick(() => {
    const state = useGameStore.getState();
    const selectedId = state.selectedCharId;
    if (!selectedId) return;
    const char = squad.getById(selectedId);
    if (!char) return;
    char.targetX = null;
    char.targetY = null;
    char.combatTarget = null;
    if (char.status === 'moving' || char.status === 'fighting') {
      char.status = 'idle';
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
  });

  const gameLoop = new GameLoop(world, squad);

  useGameStore.subscribe((state) => {
    gameLoop.setPaused(state.paused);
    gameLoop.setSlowMotion(state.slowMotion);
  });

  gameLoop.start();

  function renderLoop(): void {
    const state = useGameStore.getState();
    const escortTargets = state.bounties
      .filter(b => b.type === 'escort' && b.accepted && !b.completed && b.targetX !== undefined && b.targetY !== undefined)
      .map(b => ({ x: b.targetX!, y: b.targetY! }));
    renderer.update(
      state.squad,
      state.enemies,
      state.lootContainers,
      state.vendors,
      state.selectedCharId,
      state.timeOfDay,
      state.isNight,
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
        React.createElement(GameOver),
      )
    );
  }
}

main().catch(console.error);
