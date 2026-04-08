# Iron Dunes

A browser-based squad RPG set in a desert wasteland. Players manage a group of survivors, navigate a tile-based map, fight bandits, and engage in trading and bounty missions.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Frontend Framework**: React 19
- **Rendering Engine**: PixiJS v8
- **State Management**: Zustand v5
- **Pathfinding**: EasyStar.js
- **Build Tool**: Vite 8
- **Package Manager**: npm

## Project Structure

```
.
├── iron-dunes.html       # Main HTML entry point
├── vite.config.ts        # Vite configuration (port 5000, allowedHosts: true)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── public/               # Static assets (favicon, icons)
└── src/
    ├── main.ts           # Game initialization
    ├── assets/           # Images and icons
    ├── data/             # Static game data (enemies, items, map)
    ├── game/             # Core game logic (AI, Combat, Economy, GameLoop, World)
    ├── render/           # PixiJS rendering (MapRenderer, CharRenderer)
    ├── store/            # Zustand store (gameStore.ts)
    ├── types/            # TypeScript type definitions
    └── ui/               # React HUD components
```

## Development

```bash
npm install
npm run dev      # Starts dev server on port 5000
npm run build    # TypeScript check + Vite build
```

## Replit Setup

- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for proxy compatibility
- Deployment: static site, build with `npm run build`, serve from `dist/`
