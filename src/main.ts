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
    if (!char) return;
    char.targetX = tileX;
    char.targetY = tileY;
    char.status = 'moving';
  });

  const gameLoop = new GameLoop(world, squad);

  useGameStore.subscribe((state) => {
    gameLoop.setPaused(state.paused);
    gameLoop.setSlowMotion(state.slowMotion);
  });

  gameLoop.start();

  function renderLoop(): void {
    const state = useGameStore.getState();
    renderer.update(state.squad, state.enemies, state.lootContainers, state.selectedCharId);
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
      )
    );
  }
}

main().catch(console.error);
