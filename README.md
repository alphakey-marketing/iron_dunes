# Iron Dunes

A browser-based RPG set in a harsh desert wasteland. Lead a squad of survivors through bandit-infested ruins, trade with merchants, and take on bounties.

## Tech Stack

- **Renderer**: PixiJS v8 — tile map & sprite rendering
- **UI**: React 18 — HUD, panels, modals
- **State**: Zustand v5
- **Pathfinding**: EasyStar.js
- **Build**: Vite + TypeScript (strict mode)

## Getting Started

```bash
npm install
npm run dev        # open iron-dunes.html in browser
npm run build      # production build
```

Open `http://localhost:5173/iron-dunes.html`

## Controls

- **Click** the map to move the selected character
- **Scroll wheel** to zoom in/out
- **⏸ / ▶** to pause/resume
- **1x / 0.25x** to toggle slow-motion
- Click a squad portrait at the top to select a character

## Features

- 64×64 tile map with desert, ruins, dustPlains, and settlement biomes
- AI bandits that patrol, chase, attack, and flee when injured
- Body-part hit system (head, chest, stomach, arms, legs)
- Hunger system with auto-eating and starvation damage
- Natural healing when resting
- Buy/sell at the settlement vendor
- Bounty board refreshed each in-game day
- Recruit new squad members (up to 4 total)
- Loot containers dropped by defeated enemies
- Day/night cycle affecting enemy aggro range
