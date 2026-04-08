# Game Design Document — Project: Iron Dunes
### A Simplified Kenshi-Inspired Browser Survival RPG

**Version:** 0.1 (MVP)
**Author:** Chan Kwan Yin
**Platform:** Browser (HTML5 / PixiJS + React)
**Engine:** Vanilla JS + PixiJS v8 (renderer) + React (UI overlay)
**Genre:** Squad-based Survival RPG / Sandbox
**Target Audience:** Fans of Kenshi, survival games, indie RPGs
**Repository Target:** Itch.io

---

## 1. Executive Overview

Iron Dunes is a browser-playable, simplified reimagining of the core Kenshi experience. The player begins as a lone, destitute wanderer in a hostile desert world, with no money, no weapons, and no allies. Through scavenging, combat, trading, and recruitment, the player builds a small squad capable of surviving — and eventually dominating — the wasteland.

The game distils Kenshi into its most essential emotional loop: **the satisfaction of earned progression from absolute zero**. Every system serves that loop. No system is included unless it reinforces hunger, danger, growth, or decision-making.

### Design Pillars

| Pillar | Description |
|--------|-------------|
| **Start Broken** | The player begins with nothing. Difficulty is the canvas. |
| **Learn by Doing** | Skills improve only through use. No XP menus. No level-ups. |
| **Consequences Stick** | Injuries are persistent. Lost limbs slow you permanently. |
| **Emergent Stories** | No scripted quests. Player creates their own narrative. |
| **Readable at a Glance** | UI communicates all critical info in under 2 seconds. |

---

## 2. Core Game Loop

```
START BROKE
    ↓
Scavenge ruins / accept bounty
    ↓
Fight bandits → get injured, loot bodies
    ↓
Sell loot at town → buy food + medicine
    ↓
Heal, eat, level skills
    ↓
Recruit new squad member
    ↓
Harder targets → better loot → repeat
    ↓
[LATE MVP] Build camp → passive income → independence
```

The loop must be self-sustaining within the first 10 minutes of play. If the player cannot complete one full cycle in 10 minutes, the pacing is wrong.

---

## 3. World Design

### 3.1 Map

- **Grid Size (MVP):** 64 × 64 tiles
- **Tile Size:** 32px × 32px rendered (2048 × 2048 pixel world)
- **Camera:** Scrollable viewport (400 × 300 visible tiles at 1× zoom); follows squad leader
- **Zoom:** 0.5× to 2× via scroll wheel

### 3.2 Biomes (MVP)

| Biome | Visual | Effect | % of Map |
|-------|--------|--------|-----------|
| **Blasted Desert** | Orange sand, cracked earth | None (baseline) | 55% |
| **Ancient Ruins** | Stone rubble, collapsed walls | +loot spawn rate, +enemy patrol | 25% |
| **Dust Plains** | Grey gravel, sparse scrub | Slower movement (×0.85) | 15% |
| **Settlement** | Buildings, NPCs, roads | Safe zone, shops, recruits | 5% |

### 3.3 Points of Interest (MVP)

- 1 × **Town** (The Sump): central safe zone, 3 vendors
- 3 × **Bandit Camps**: enemy patrol spawns, loot containers
- 5 × **Ruin Sites**: random loot, occasional wandering enemy
- 2 × **Bounty Posts**: bulletin board with bounty contracts

### 3.4 Day / Night Cycle

- Full cycle: 10 real-time minutes (5 day / 5 night)
- Night: visibility radius reduced to 40% for player and NPCs
- Night: enemy patrol frequency reduced by 30%
- Visual: ambient color shifts from warm orange → deep blue-grey

---

## 4. Characters & Squad

### 4.1 Character Data Model

```typescript
interface Character {
  id: string;
  name: string;
  faction: 'player' | 'bandit' | 'neutral';

  // Core stats (derived from skills)
  maxHealth: number;       // = 100 + (strength * 2)
  moveSpeed: number;       // = 1.0 + (athletics * 0.01), modified by limb damage

  // Skills (0–100, improve by use)
  skills: {
    melee:      number;   // improves each attack landed
    defence:    number;   // improves each hit blocked/dodged
    strength:   number;   // improves when carrying heavy loads
    athletics:  number;   // improves constantly while moving
    labouring:  number;   // improves when mining / building
    stealth:    number;   // improves while crouching near enemies
  };

  // Body part HP (0–100 per part)
  bodyParts: {
    head:      number;
    chest:     number;
    stomach:   number;
    leftArm:   number;
    rightArm:  number;
    leftLeg:   number;
    rightLeg:  number;
  };

  // Survival
  hunger:     number;     // 0–100; 0 = starving
  status:     CharStatus; // 'idle' | 'moving' | 'fighting' | 'unconscious' | 'dead'

  // Equipment slots
  weapon:    Item | null;
  armour:    Item | null;
  backpack:  Item[];      // inventory
}
```

### 4.2 Skill Progression Rules

Skills improve **only through use** — never via points allocation.

| Skill | How It Improves | Rate (per event) |
|-------|-----------------|------------------|
| Melee | Each attack landed | +0.5 XP |
| Defence | Each incoming hit | +0.4 XP |
| Athletics | Every 5 seconds of movement | +0.1 XP |
| Strength | Each item picked up > 5kg | +0.2 XP |
| Labouring | Each mining/building tick | +0.3 XP |
| Stealth | Each second crouching near enemy | +0.15 XP |

Skills cap at 100. No visual "level up" popup — only the stat number changes in the squad panel.

### 4.3 Body Part Damage System

This is the most critical mechanic for the Kenshi feel. Damage is always applied to a specific body part.

**Hit location roll:**
```
Head:      10%
Chest:     25%
Stomach:   20%
Left Arm:  10%
Right Arm: 10%
Left Leg:  12.5%
Right Leg: 12.5%
```

**Effects of damage:**
| Part | Effect at < 50 HP | Effect at 0 HP |
|------|-------------------|----------------|
| Head | No visible effect | Unconscious immediately |
| Chest | Reduced melee damage | Unconscious |
| Stomach | Hunger depletes 2× faster | Unconscious |
| Arm (either) | –30% melee damage | Cannot attack |
| Leg (either) | –25% move speed | Cannot move; falls |

**Unconscious ≠ Dead.** Characters at 0 HP on chest or head fall unconscious. They can be looted by enemies, then left behind. Allies can carry them. They wake with 1–5 HP after the fight ends (if not killed by an enemy finishing blow). This is the central design tension.

### 4.4 Recruitment

- Recruit from Town's "Wanderers" pool (3 available at a time, refreshes daily)
- Each recruit has randomly generated starting skills (5–25 each)
- Cost: 1,000–3,000 cats (currency) depending on starting stats
- Maximum squad size (MVP): **4 characters**

---

## 5. Survival System

### 5.1 Hunger

- Depletes at 1 unit per 30 real-time seconds (baseline)
- Accelerated by: combat (+2×), stomach injury (+2×), running (+1.25×)
- At 0 hunger: all skills capped at 50% effectiveness, move speed –20%
- At 0 hunger for 60 seconds: character loses 1 HP/second (starvation)

### 5.2 Food Items (MVP)

| Item | Hunger Restored | Cost (cats) | Weight |
|------|----------------|-------------|--------|
| Dried Ration | 40 | 80 | 0.5 kg |
| Cactus Fruit | 15 | 20 | 0.2 kg |
| Cooked Meat | 70 | 150 | 0.8 kg |

Food is consumed automatically when hunger drops below 20 (if in backpack).

### 5.3 Healing

- Injuries heal at 1 HP per body part per 60 real-time seconds at rest
- Combat stops all healing
- **Medical Kit** item: instantly restores 30 HP to one body part; cost: 300 cats
- Unconscious characters heal at ×0.5 speed until woken by an ally

---

## 6. Combat System

### 6.1 Engagement Rules

- Combat triggers when a player squad member enters an NPC's **aggro radius** (8 tiles for bandits)
- Player can initiate by clicking "Attack" on an enemy
- Enemies within 15 tiles of an engaged enemy will join the fight (group aggro)

### 6.2 Attack Resolution

Combat runs on a tick system (every 0.5 seconds):

```
attackRoll   = attacker.skills.melee + weapon.attackBonus + rand(-10, +10)
defenceRoll  = defender.skills.defence + armour.defenceBonus + rand(-5, +5)

if (attackRoll > defenceRoll):
    rawDamage = weapon.baseDamage + (attacker.skills.melee * 0.1)
    finalDamage = rawDamage * (1 - armour.damageReduction)
    applyToRandomBodyPart(finalDamage)
    attacker.skills.melee += 0.5
    defender.skills.defence += 0.4
else:
    // Miss — no damage, still tick defence
    defender.skills.defence += 0.2
```

### 6.3 Time Scaling

- Default speed: 1×
- Player can press **Space** to toggle 0.25× slow-motion during combat
- Slow-motion is cosmetic only; all tick rates scale proportionally

### 6.4 Weapons (MVP)

| Weapon | Base Damage | Attack Bonus | Weight | Cost |
|--------|------------|--------------|--------|------|
| Rusty Sword | 12 | +5 | 2 kg | 200 cats |
| Iron Club | 18 | +2 | 4 kg | 350 cats |
| Shortsword | 10 | +10 | 1.5 kg | 500 cats |
| Unarmed | 4 | 0 | 0 | — |

### 6.5 Armour (MVP)

| Armour | Defence Bonus | Damage Reduction | Weight | Cost |
|--------|--------------|-----------------|--------|------|
| Leather Vest | +5 | 10% | 3 kg | 300 cats |
| Iron Plate | +10 | 20% | 8 kg | 800 cats |
| Dustcoat | +3 | 5% | 1.5 kg | 150 cats |

---

## 7. Economy & Loot

### 7.1 Currency

**Cats** (copper coins). Starting amount: **300 cats**.

### 7.2 Loot System

Defeated enemies drop their equipped weapon, armour, and a random selection from:

| Item | Drop Chance |
|------|-------------|
| Dried Ration | 40% |
| Cats (50–300) | 60% |
| Weapon (equipped) | 100% |
| Armour (equipped) | 100% |
| Medical Kit | 15% |
| Scrap Metal | 30% |

Loot containers in ruins spawn 1–3 random items from the above table.

### 7.3 Town Vendors

**The Sump** contains three fixed vendors:

| Vendor | Sells | Buys |
|--------|-------|------|
| **General Trader** | Food, Medical Kits, Backpacks | Weapons, Armour, Scrap Metal |
| **Armour Smith** | Armour (all types) | Armour, Scrap Metal |
| **Weapons Dealer** | Weapons (all types) | Weapons, Scrap Metal |

Sell price = 50% of item buy price.

### 7.4 Bounty Board

Three active bounties at a time; refresh every 5 in-game days.

| Bounty Type | Target | Reward |
|-------------|--------|--------|
| Bandit Hunt | Kill 3 bandits | 500 cats |
| Camp Raid | Loot a bandit camp container | 800 cats |
| Escort | Reach a ruin site (walk to marker) | 400 cats |

---

## 8. AI Behaviour

### 8.1 Enemy States (Finite State Machine)

```
PATROL → (aggro triggered) → CHASE → (in range) → ATTACK
  ↑                                                   ↓
IDLE ←── (target lost / dead) ──────────────────── FLEE (< 20% HP)
```

### 8.2 Patrol Behaviour

- Enemies follow a pre-defined patrol path (3–5 waypoints around their camp)
- Patrol speed: 60% of base move speed
- Aggro radius: 8 tiles (night: 4 tiles)

### 8.3 Group Behaviour

- If one enemy aggroes, all enemies within 15 tiles join
- Enemies do not pursue beyond 20 tiles from their spawn origin
- Fleeing enemies who escape return to spawn and reset after 60 seconds

---

## 9. User Interface

### 9.1 HUD (Always Visible)

```
┌─────────────────────────────────────────────────────────────┐
│ [DAY 3 — 14:22]  [CATS: 1,240]              [×0.25] [PAUSE] │
├─────────────────────────────────────────────────────────────┤
│ SQUAD                                                        │
│ ● Mira     HP [████░░] 62%  HUNGER [███░░] 58%  IDLE       │
│ ● Drak     HP [██████] 100% HUNGER [█░░░░] 20%  MOVING     │
│ ● Yena     HP [█░░░░░] 18%  HUNGER [██░░░] 42%  INJURED    │
└─────────────────────────────────────────────────────────────┘
```

- Colour coding: HP green → yellow → red. Hunger green → orange → red
- Click any squad member to select and view their full stat panel

### 9.2 Character Detail Panel (Right Sidebar)

Opens on squad member click. Displays:

- Body part HP diagram (body silhouette with colour-coded parts)
- Skills list with progress bars
- Equipped weapon / armour slots
- Inventory grid (backpack contents)

### 9.3 World Interaction

- **Left click** on ground: move selected character(s)
- **Left click** on enemy: open action menu (Attack / Follow / Ignore)
- **Left click** on NPC: open dialogue (trade / recruit)
- **Right click**: cancel action
- **Drag box**: multi-select squad members

### 9.4 Shop Modal

Triggered by clicking a vendor NPC:

- Left panel: vendor inventory (items for sale, buy price)
- Right panel: player inventory (items to sell, sell price)
- Player balance shown live at top
- Confirm button commits transaction

---

## 10. Tech Architecture

### 10.1 Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Renderer | PixiJS v8 | Tile map, sprites, health bars, world |
| UI Overlay | React 18 | HUD, panels, shop modal, bounty board |
| State | Zustand (or ES6 classes) | Shared game state between engine and UI |
| Pathfinding | EasyStar.js | A* grid pathfinding for movement |
| Build | Vite | Dev server, TS compilation, bundling |
| Language | TypeScript | Entire codebase |
| Deploy | Itch.io | Static file hosting |

### 10.2 Core Architecture Pattern

```
GameLoop (rAF)
  │
  ├── World.update(delta)
  │     ├── DayNightCycle.tick()
  │     └── LootSpawner.tick()
  │
  ├── SquadManager.update(delta)
  │     ├── Character.update(delta)  × N  (hunger, regen, status)
  │     └── Pathfinder.step()        × N  (movement)
  │
  ├── AIManager.update(delta)
  │     └── Enemy.updateFSM(delta)   × N  (patrol, chase, attack)
  │
  ├── CombatManager.update(delta)
  │     └── resolveFights()          (tick-based resolution)
  │
  └── UIBridge.sync()
        └── zustandStore.setState()  (pushes to React)
```

React re-renders only when `UIBridge.sync()` pushes new state — decoupled from the 60fps game loop.

### 10.3 Project File Structure

```
iron-dunes/
├── iron-dunes.html          ← single entry point
├── src/
│   ├── main.ts              ← bootstrap game + React mount
│   ├── game/
│   │   ├── GameLoop.ts
│   │   ├── World.ts
│   │   ├── Character.ts
│   │   ├── Squad.ts
│   │   ├── Combat.ts
│   │   ├── AI.ts
│   │   ├── Economy.ts
│   │   └── Pathfinder.ts
│   ├── render/
│   │   ├── Renderer.ts      ← PixiJS setup
│   │   ├── MapRenderer.ts   ← tile drawing
│   │   └── CharRenderer.ts  ← sprite + health bars
│   ├── ui/
│   │   ├── HUD.tsx
│   │   ├── SquadPanel.tsx
│   │   ├── CharDetailPanel.tsx
│   │   ├── ShopModal.tsx
│   │   └── BountyBoard.tsx
│   ├── store/
│   │   └── gameStore.ts     ← Zustand store (UI bridge)
│   ├── data/
│   │   ├── items.ts         ← item definitions
│   │   ├── enemies.ts       ← enemy templates
│   │   └── map.ts           ← tile map data
│   └── types/
│       └── index.ts         ← shared TypeScript interfaces
├── assets/
│   └── sprites/             ← PixiJS sprite sheets
└── vite.config.ts
```

---

## 11. MVP Scope & Milestones

### 11.1 MVP Inclusion Criteria

A feature is IN the MVP only if removing it breaks the core loop. Everything else is Post-MVP.

| System | MVP | Post-MVP |
|--------|-----|---------|
| Tile map + camera | ✅ | — |
| Character stats + skills | ✅ | — |
| Body part HP + injuries | ✅ | — |
| Hunger / food | ✅ | — |
| Click-to-move pathfinding | ✅ | — |
| Real-time combat (melee) | ✅ | — |
| 1 Town + 3 vendors | ✅ | — |
| Loot system | ✅ | — |
| Bounty board (3 contracts) | ✅ | — |
| Squad recruitment (up to 4) | ✅ | — |
| Day/night cycle | ✅ | — |
| Enemy patrol AI + FSM | ✅ | — |
| Base building / camp | — | ✅ |
| Crafting system | — | ✅ |
| Farming / food production | — | ✅ |
| Ranged combat | — | ✅ |
| Stealth system | — | ✅ |
| Faction reputation | — | ✅ |
| Multiple towns | — | ✅ |
| More biomes | — | ✅ |
| Save / JSON export | — | ✅ |

### 11.2 Development Milestones

#### Milestone 1 — Foundation (Week 1–2)
- [ ] PixiJS renderer renders 64×64 tile map
- [ ] Camera follows a moveable character sprite
- [ ] EasyStar pathfinding: click to move character
- [ ] Day/night visual cycle

#### Milestone 2 — Characters (Week 3)
- [ ] `Character` class with all data fields
- [ ] Squad panel React component shows HP + hunger
- [ ] Hunger depletes over time; character weakens
- [ ] Food item consumed from inventory

#### Milestone 3 — Combat (Week 4)
- [ ] Enemy spawns with patrol FSM
- [ ] Combat tick system resolves attacks
- [ ] Body part damage applied and shown in UI
- [ ] Unconscious state + recovery

#### Milestone 4 — Economy (Week 5)
- [ ] Town map with 3 vendor NPCs
- [ ] Shop modal: buy/sell items
- [ ] Loot drops on enemy defeat
- [ ] Bounty board with 3 contracts

#### Milestone 5 — Polish & Deploy (Week 6)
- [ ] Recruit system (hire from town wanderers)
- [ ] Full HUD complete with time, cats, squad status
- [ ] Game over screen (all characters dead)
- [ ] Deploy to Itch.io

---

## 12. Art Direction

### 12.1 Visual Style

**Post-apocalyptic desert, low-poly top-down 2D.** Think Kenshi's desolate wasteland translated into a flat, readable sprite style — muted earth tones punctuated by rust, bone white, and the occasional pale blue of metal.

### 12.2 Colour Palette

| Role | Colour | Hex |
|------|--------|-----|
| Desert sand | Base terrain | `#C8A97A` |
| Cracked earth | Accent terrain | `#8B6E4E` |
| Ruins | Stone/rubble | `#6E6459` |
| Sky (day) | Ambient | `#F5A623` → `#E8DCC8` |
| Sky (night) | Ambient | `#1A1A2E` → `#2D2B4A` |
| UI background | Panels | `#1C1B19` (dark) |
| HP bar | Full → empty | `#5AAF3A` → `#E84040` |
| Hunger bar | Full → empty | `#F5A623` → `#E84040` |
| Accent / selection | Highlight | `#4F98A3` |

### 12.3 Typography

| Role | Font | Size |
|------|------|------|
| Game title / headers | Cabinet Grotesk Bold | 28px+ |
| HUD / squad names | Satoshi Medium | 14px |
| Body text / dialogue | Satoshi Regular | 16px |
| Tiny labels / values | Satoshi Regular | 12px |

### 12.4 Sprites (MVP)

Minimal sprite set for MVP. All sprites: 32×32px or 16×16px tileable.

- Player characters: 4-frame walk cycle (top-down, 4 directions)
- Enemies (Bandit): same structure, different colour palette
- Terrain tiles: desert, ruin, road, settlement floor
- Items: flat icons for weapons, food, armour, cats

---

## 13. Audio (Post-MVP)

Audio requires a user gesture to start (`AudioContext` restriction in browsers). Defer all audio to Post-MVP to avoid blocking gameplay testing.

**Planned (Post-MVP):**
- Ambient wind/desert loop
- Combat hit / miss sounds
- Coin clink on purchase
- Character unconscious grunt
- Day/night transition tone

---

## 14. Out of Scope (Explicitly Excluded from MVP)

The following systems are consciously excluded from MVP to maintain scope:

- Dialogue trees / story quests
- Animal companions
- Slavery / prisoner system (Kenshi mechanic)
- Research system
- Multiple factions with reputation meters
- World map travel (fast travel)
- Mod support
- Multiplayer
- Save files (localStorage not available in browser sandbox)

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PixiJS learning curve slows Milestone 1 | Medium | High | Start with plain Canvas API; migrate to PixiJS once loop works |
| Pathfinding performance on 64×64 grid | Low | Medium | EasyStar uses Web Worker; limit path recalc to 250ms intervals |
| React ↔ game loop state sync lag | Medium | Medium | UIBridge syncs at 10fps (not 60fps); React not in hot path |
| Combat balance (too easy/hard) | High | Medium | Expose skill/damage constants in a `balance.ts` config file |
| Scope creep (adding systems mid-MVP) | High | High | Hard freeze: no new MVP systems after Milestone 3 starts |

---

*Document last updated: April 2026. Milestone dates are relative to project start.*
