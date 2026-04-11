# Game Design Document — Project: Iron Dunes
### A Simplified Kenshi-Inspired Browser Survival RPG

**Version:** 0.2 (MVP+ Planning)
**Author:** Chan Kwan Yin
**Platform:** Browser (HTML5 / PixiJS + React)
**Engine:** Vanilla JS + PixiJS v8 (renderer) + React (UI overlay)
**Genre:** Squad-based Survival RPG / Sandbox
**Target Audience:** Fans of Kenshi, survival games, indie RPGs
**Repository Target:** Itch.io

> **Status Legend used in this document:**
> - ✅ **Done** — implemented and working in `copilot/complete-mvp`
> - 🐛 **Done (bugfix pending)** — implemented but has a known bug (see Issue #3)
> - 🔲 **Planned** — not yet implemented; scheduled for Milestone 6+
> - ⏳ **Post-MVP** — consciously deferred; not in active scope

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
Encounter wanderers → practice combat / recruit allies    ← NEW (MVP+)
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

### 3.1 Map ✅

- **Grid Size (MVP):** 64 × 64 tiles
- **Tile Size:** 32px × 32px rendered (2048 × 2048 pixel world)
- **Camera:** Scrollable viewport (400 × 300 visible tiles at 1× zoom); follows squad leader
- **Zoom:** 0.5× to 2× via scroll wheel

### 3.2 Biomes ✅

| Biome | Visual | Effect | % of Map |
|-------|--------|--------|-----------|
| **Blasted Desert** | Orange sand, cracked earth | None (baseline) | 55% |
| **Ancient Ruins** | Stone rubble, collapsed walls | +loot spawn rate, +enemy patrol | 25% |
| **Dust Plains** | Grey gravel, sparse scrub | Slower movement (×0.85) | 15% |
| **Settlement** | Buildings, NPCs, roads | Safe zone, shops, recruits | 5% |

### 3.3 Points of Interest ✅

- 1 × **Town** (The Sump): central safe zone, 3 vendors
- 3 × **Bandit Camps**: enemy patrol spawns, loot containers
- 5 × **Ruin Sites**: random loot, occasional wandering enemy
- 2 × **Bounty Posts**: bulletin board with bounty contracts

### 3.4 Day / Night Cycle ✅

- Full cycle: 10 real-time minutes (5 day / 5 night)
- Night: visibility radius reduced to 40% for player and NPCs
- Night: enemy patrol frequency reduced by 30%
- Visual: ambient color shifts from warm orange → deep blue-grey

---

## 4. Characters & Squad

### 4.1 Character Data Model ✅

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

  // MVP+ additions
  isCrouching: boolean;   // 🔲 stealth crouch toggle (§6.6)
}
```

### 4.2 Skill Progression Rules ✅

Skills improve **only through use** — never via points allocation.

| Skill | How It Improves | Rate (per event) |
|-------|-----------------|------------------|
| Melee | Each attack landed | +0.5 XP |
| Defence | Each incoming hit | +0.4 XP |
| Athletics | Every 5 seconds of movement | +0.1 XP |
| Strength | Each item picked up > 5kg | +0.2 XP |
| Labouring | Each mining/building tick | +0.3 XP |
| Stealth | Each second crouching within enemy's base aggro radius | +0.15 XP |

Skills cap at 100. No visual "level up" popup — only the stat number changes in the squad panel.

### 4.3 Body Part Damage System ✅

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

### 4.4 Recruitment — Town Pool ✅

- Recruit from Town's "Wanderers" pool (3 available at a time, refreshes every 5 in-game days)
- Each recruit has randomly generated starting skills (5–25 each)
- Cost: 1,000–3,000 cats (currency) depending on starting stats
- Maximum squad size (MVP): **4 characters**

### 4.5 Wanderer NPCs 🔲

Wanderers are sparse, low-threat NPCs that roam the open desert and ruins. They solve the new-player pacing problem: without them, the player must walk to a bandit camp to find any combat, making the 10-minute first loop impossible. Wanderers provide early combat practice and an alternative recruitment path that reinforces the Emergent Stories design pillar.

#### Wanderer Archetypes

| Archetype | Faction | Default Behaviour | Aggro? | Recruitable? | Skill Range |
|-----------|---------|-------------------|--------|--------------|-------------|
| **Drifter** | neutral | Freely wanders — random direction changes, no fixed path or destination | Never | ✅ Yes | 5–15 |
| **Scavenger** | neutral | Actively moves toward the nearest ruin site; idles and loots when inside ruins | Only if attacked first | ✅ Yes | 5–15 |
| **Desperate Raider** | bandit | Aggros on sight like a bandit, but at shorter range | Immediate (4 tiles) | ❌ No | 5–15 |

All wanderers carry only unarmed or a rusty sword — never clubs or shortswords. This ensures they are always weaker than bandit camp enemies (skill 15–25, better weapons).

#### Wanderer Stats

- Starting skills: 5–15 (randomised per spawn, same distribution across all archetypes)
- Weapon: 70% unarmed, 30% rusty sword
- Armour: none
- Loot on death: same as bandit but with lower cats (10–80) and no medical kit drop

#### Spawn Rules

- **Active count:** 3–5 wanderers alive on the map at any time
- **Biomes:** Desert and Ruins only — never spawn within 10 tiles of Settlement
- **Respawn:** When a wanderer dies or walks off the map edge, a new one spawns at a random desert edge tile after 60–90 seconds
- **Early-game weighting:** For the first 2 in-game days, 60% of wanderer spawns are placed within 15 tiles of the player's starting position (tile 32, 32)
- **Archetype distribution:** Drifter 40%, Scavenger 35%, Desperate Raider 25%

#### Drifter Movement

- Picks a random direction and walks for 10–20 seconds
- On timer expiry, picks a new random direction (may reverse)
- Does not pathfind — direct movement only, will get stuck on walls and pick a new direction
- Speed: 70% of base move speed

#### Scavenger Movement

- On spawn, targets the nearest ruin site POI
- Moves toward it using direct movement (no A*)
- On arrival, enters idle state and "loots" (visual flavour only — no actual item collection)
- After 30–60 seconds idling, picks the next nearest unvisited ruin site
- If attacked, flees away from the attacker for 10 seconds then resumes ruin-seeking

#### Recruitment Flow (Field Recruitment)

Unlike town recruits, wanderers are hired directly on the map:

1. Player left-clicks a Drifter or Scavenger
2. Action menu appears: **Talk / Recruit / Ignore**
3. Selecting **Recruit** shows cost and starting skills
4. Player confirms → wanderer joins squad if player has enough cats and squad < 4
5. If squad is full (4 members), Recruit option is greyed out with tooltip: *"Squad is full"*

| Archetype | Recruit Cost |
|-----------|--------------|
| Drifter | 500–1,000 cats (randomised on spawn) |
| Scavenger | 1,000–2,000 cats (randomised on spawn) |

Recruited wanderers use the same `createCharacter` factory as town recruits, with their actual skill values carried over.

#### New File: `src/game/WandererSpawner.ts`

Manages the wanderer pool independently of the bandit enemy system:

```typescript
class WandererSpawner {
  update(delta: number, world: World, squad: Squad): void
  // checks active count, fires spawns, manages respawn timers
  private spawnWanderer(world: World): Wanderer
  private getSpawnPosition(world: World, squad: Squad): { x: number; y: number }
}
```

---

## 5. Survival System

### 5.1 Hunger ✅

- Depletes at 1 unit per 30 real-time seconds (baseline)
- Accelerated by: combat (+2×), stomach injury (+2×), running (+1.25×)
- At 0 hunger: all skills capped at 50% effectiveness, move speed –20%
- At 0 hunger for 60 seconds: character loses 1 HP/second (starvation)

### 5.2 Food Items ✅

| Item | Hunger Restored | Cost (cats) | Weight |
|------|----------------|-------------|--------|
| Dried Ration | 40 | 80 | 0.5 kg |
| Cactus Fruit | 15 | 20 | 0.2 kg |
| Cooked Meat | 70 | 150 | 0.8 kg |

Food is consumed automatically when hunger drops below 20 (if in backpack).

### 5.3 Healing ✅

- Injuries heal at 1 HP per body part per 60 real-time seconds at rest
- Combat stops all healing
- **Medical Kit** item: instantly restores 30 HP to one body part; cost: 300 cats
- Unconscious characters heal at ×0.5 speed until woken by an ally

---

## 6. Combat System

### 6.1 Engagement Rules ✅

- Combat triggers when a player squad member enters an NPC's **effective aggro radius** (see §6.6 for stealth modification)
- Bandits: base aggro radius 8 tiles
- Player can initiate by clicking "Attack" on an enemy
- Enemies within 15 tiles of an engaged enemy will join the fight (group aggro)

### 6.2 Attack Resolution ✅

Combat runs on a tick system (every 0.5 seconds):

```
attackRoll   = attacker.skills.melee + weapon.attackBonus + rand(-10, +10)
defenceRoll  = defender.skills.defence + armour.defenceBonus + rand(-5, +5)

if (attackRoll > defenceRoll):
    rawDamage    = weapon.baseDamage + (attacker.skills.melee * 0.1)
    skillMod     = 0.5 if attacker is starving, else 1.0          ← ✅ implemented
    damagePenalty+= 0.3 if attacker arm < 50 HP                   ← ✅ implemented
    damagePenalty+= 0.3 if attacker chest < 50 HP                 ← ✅ implemented
    rawDamage    *= skillMod * max(0, 1 - damagePenalty)
    finalDamage   = rawDamage * (1 - armour.damageReduction)
    applyToRandomBodyPart(finalDamage)
    attacker.skills.melee   += 0.5
    defender.skills.defence += 0.4
else:
    defender.skills.defence += 0.2
```

> **Note:** `skillMod` and `damagePenalty` are live in `Combat.ts` but were omitted from v0.1 GDD. Added here for accuracy.

### 6.3 Time Scaling ✅

- Default speed: 1×
- Player can press **Space** to toggle 0.25× slow-motion during combat
- Slow-motion is cosmetic only; all tick rates scale proportionally

### 6.4 Weapons ✅

| Weapon | Base Damage | Attack Bonus | Weight | Cost |
|--------|------------|--------------|--------|------|
| Rusty Sword | 12 | +5 | 2 kg | 200 cats |
| Iron Club | 18 | +2 | 4 kg | 350 cats |
| Shortsword | 10 | +10 | 1.5 kg | 500 cats |
| Unarmed | 4 | 0 | 0 | — |

### 6.5 Armour ✅

| Armour | Defence Bonus | Damage Reduction | Weight | Cost |
|--------|--------------|-----------------|--------|------|
| Leather Vest | +5 | 10% | 3 kg | 300 cats |
| Iron Plate | +10 | 20% | 8 kg | 800 cats |
| Dustcoat | +3 | 5% | 1.5 kg | 150 cats |

### 6.6 Stealth System 🔲

Stealth gives the player an active tool to reduce their detection footprint. It solves the wide-open desert aggro problem — without stealth, the player has almost no approach window against enemies in flat terrain.

#### Crouch Toggle

- **Keyboard:** **C** key
- **Mouse:** Clickable crouch button in the HUD squad panel (icon toggles visually)
- **Scope:** Applies to the **entire squad simultaneously** — all living, conscious members crouch or stand together
- **Speed penalty while crouching:** ×0.5 move speed
- Crouching while at 0 move speed (leg injury) is allowed — it still grants stealth benefit

#### Detection Formula

Replaces the flat `aggroRadius` constant in §8.2 for all entities:

```
effectiveAggroRange = baseAggroRange × (1 − stealthFactor)

stealthFactor = (skills.stealth / 100) × crouchMultiplier

crouchMultiplier:
  1.0  — crouching + stationary (status = 'idle')
  0.6  — crouching + moving     (status = 'moving')
  0.0  — standing               (isCrouching = false)
```

**Example:** A character with stealth 50, crouching and moving:
`8 × (1 − (50/100 × 0.6))` = 8 × 0.70 = **5.6 tile effective aggro range**

At stealth 100, crouching stationary:
`8 × (1 − 1.0)` = **0 tiles** — the character is effectively invisible while still.

#### Night Stacking

Day/night halving (§3.4) and stealth reduction are multiplicative:
```
nightAggroRange  = baseAggroRange × 0.5          (night only)
effectiveRange   = nightAggroRange × (1 − stealthFactor)
```
This makes night scouting with high stealth extremely powerful — an intentional late-game reward.

#### Stealth Skill Training

- Unchanged from §4.2: +0.15 XP per second while crouching within the enemy's **base** (un-modified) aggro radius
- Training uses the base radius so the player has to actually be near the enemy to improve — stealth training cannot be farmed safely from long range

#### Line of Sight

⏳ **Deferred to Post-MVP.** Current implementation is radius-only. LoS will be added when ruins tile rendering supports opaque wall blocks. LoS will make ruins tactically distinct from open desert.

---

## 7. Economy & Loot

### 7.1 Currency ✅

**Cats** (copper coins). Starting amount: **300 cats**.

### 7.2 Loot System ✅

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

**Wanderer loot (§4.5):** Cats 10–80 only; no medical kit; weapon drops only if carrying one.

### 7.3 Town Vendors ✅

**The Sump** contains three fixed vendors:

| Vendor | Sells | Buys |
|--------|-------|------|
| **General Trader** | Food, Medical Kits, Backpacks | Weapons, Armour, Scrap Metal |
| **Armour Smith** | Armour (all types) | Armour, Scrap Metal |
| **Weapons Dealer** | Weapons (all types) | Weapons, Scrap Metal |

Sell price = 50% of item buy price.

### 7.4 Bounty Board ✅

Three active bounties at a time; refresh every 5 in-game days.

| Bounty Type | Target | Reward |
|-------------|--------|--------|
| Bandit Hunt | Kill 3 bandits | 500 cats |
| Camp Raid | Loot a bandit camp container | 800 cats |
| Escort | Reach a ruin site (walk to marker) | 400 cats |

---

## 8. AI Behaviour

### 8.1 Enemy States (Finite State Machine) ✅

```
PATROL → (aggro triggered) → CHASE → (in range) → ATTACK
  ↑                                                   ↓
IDLE ←── (target lost / dead) ──────────────────── FLEE (< 20% HP)
```

### 8.2 Patrol Behaviour ✅ (aggro formula update 🔲)

- Enemies follow a pre-defined patrol path (3–5 waypoints around their camp)
- Patrol speed: 60% of base move speed
- **Base aggro radius:** 8 tiles for bandits (night: 4 tiles)
- **Effective aggro radius:** modified by target's stealth when §6.6 is implemented — replace hardcoded constant with `effectiveAggroRange` formula

#### Wanderer AI States 🔲

Drifters and Scavengers use a simplified FSM (no patrol path):

```
WANDER / SEEK_RUIN → (player clicks Attack) → FLEE
                   → (Desperate Raider only, player within 4 tiles) → ATTACK
```

- **Drifter:** WANDER state only — random direction, timer-based turns
- **Scavenger:** SEEK_RUIN → IDLE_AT_RUIN → SEEK_NEXT_RUIN loop; switches to FLEE if attacked
- **Desperate Raider:** Uses bandit FSM with `baseAggroRange: 4` instead of 8

### 8.3 Group Behaviour ✅

- If one bandit aggroes, all bandits within 15 tiles join
- Enemies do not pursue beyond 20 tiles from their spawn origin
- Fleeing enemies who escape return to spawn and reset after 60 seconds

> **Note:** Group aggro does **not** propagate to wanderers — each wanderer reacts independently.

---

## 9. User Interface

### 9.1 HUD (Always Visible) ✅ (crouch button 🔲)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [DAY 3 — 14:22]  [CATS: 1,240]              [CROUCH] [×0.25] [PAUSE] │
├──────────────────────────────────────────────────────────────────────┤
│ SQUAD                                                                 │
│ ● Mira   [🧎] HP [████░░] 62%  HUNGER [███░░] 58%  CROUCHING        │
│ ● Drak        HP [██████] 100% HUNGER [█░░░░] 20%  MOVING           │
│ ● Yena        HP [█░░░░░] 18%  HUNGER [██░░░] 42%  INJURED          │
└──────────────────────────────────────────────────────────────────────┘
```

- **[CROUCH] button** in top bar toggles crouch for the whole squad
- Crouching characters show a small kneel icon `🧎` next to their name in the squad panel
- Colour coding: HP green → yellow → red. Hunger green → orange → red
- Click any squad member to select and view their full stat panel

### 9.2 Character Detail Panel (Right Sidebar) ✅

Opens on squad member click. Displays:

- Body part HP diagram (body silhouette with colour-coded parts)
- Skills list with progress bars (includes Stealth)
- Equipped weapon / armour slots
- Inventory grid (backpack contents)

### 9.3 World Interaction ✅ (wanderer actions 🔲)

- **Left click** on ground: move selected character(s)
- **Left click** on enemy/Desperate Raider: open action menu (Attack / Follow / Ignore)
- **Left click** on Drifter or Scavenger: open action menu (Talk / **Recruit** / Ignore)
- **Left click** on vendor NPC: open dialogue (trade / recruit)
- **Right click**: cancel action
- **Drag box**: multi-select squad members
- **C key**: toggle crouch for whole squad

### 9.4 Shop Modal ✅

Triggered by clicking a vendor NPC:

- Left panel: vendor inventory (items for sale, buy price)
- Right panel: player inventory (items to sell, sell price)
- Player balance shown live at top
- Confirm button commits transaction

---

## 10. Tech Architecture

### 10.1 Stack ✅

| Layer | Technology | Role |
|-------|-----------|------|
| Renderer | PixiJS v8 | Tile map, sprites, health bars, world |
| UI Overlay | React 18 | HUD, panels, shop modal, bounty board |
| State | Zustand | Shared game state between engine and UI |
| Pathfinding | EasyStar.js | A* grid pathfinding for movement |
| Build | Vite | Dev server, TS compilation, bundling |
| Language | TypeScript | Entire codebase |
| Deploy | Itch.io | Static file hosting |

### 10.2 Core Architecture Pattern ✅ (WandererSpawner addition 🔲)

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
  ├── WandererSpawner.update(delta)  🔲  ← NEW
  │     └── Wanderer.updateFSM(delta) × N
  │
  ├── CombatManager.update(delta)
  │     └── resolveFights()          (tick-based resolution)
  │
  └── UIBridge.sync()
        └── zustandStore.setState()  (pushes to React)
```

### 10.3 Project File Structure ✅ (new files 🔲)

```
iron-dunes/
├── iron-dunes.html
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── GameLoop.ts
│   │   ├── World.ts
│   │   ├── Character.ts
│   │   ├── Squad.ts
│   │   ├── Combat.ts
│   │   ├── AI.ts
│   │   ├── Economy.ts
│   │   ├── Pathfinder.ts
│   │   └── WandererSpawner.ts  🔲  ← NEW
│   ├── render/
│   │   ├── Renderer.ts
│   │   ├── MapRenderer.ts
│   │   └── CharRenderer.ts
│   ├── ui/
│   │   ├── HUD.tsx             (add CROUCH button) 🔲
│   │   ├── SquadPanel.tsx      (add crouch icon per member) 🔲
│   │   ├── CharDetailPanel.tsx
│   │   ├── ShopModal.tsx
│   │   └── BountyBoard.tsx
│   ├── store/
│   │   └── gameStore.ts
│   ├── data/
│   │   ├── items.ts
│   │   ├── enemies.ts          (add wanderer templates) 🔲
│   │   └── map.ts
│   └── types/
│       └── index.ts            (add isCrouching, Wanderer type) 🔲
├── assets/
│   └── sprites/
└── vite.config.ts
```

---

## 11. MVP Scope & Milestones

### 11.1 Feature Status

| System | Status | Notes |
|--------|--------|-------|
| Tile map + camera | ✅ Done | |
| Character stats + skills | ✅ Done | |
| Body part HP + injuries | ✅ Done | |
| Hunger / food | ✅ Done | |
| Click-to-move pathfinding | ✅ Done | |
| Real-time combat (melee) | 🐛 Done (bugfix) | Enemy HP not updating in UI — see Issue #3 |
| 1 Town + 3 vendors | ✅ Done | |
| Loot system | ✅ Done | |
| Bounty board (3 contracts) | ✅ Done | |
| Squad recruitment (up to 4) | ✅ Done | |
| Day/night cycle | ✅ Done | |
| Enemy patrol AI + FSM | ✅ Done | |
| Game over screen | ✅ Done | |
| Wanderer NPCs (3 archetypes) | 🔲 Planned | Milestone 6 |
| Stealth system (crouch) | 🔲 Planned | Milestone 6 |
| Base building / camp | ⏳ Post-MVP | |
| Crafting system | ⏳ Post-MVP | |
| Farming / food production | ⏳ Post-MVP | |
| Ranged combat | ⏳ Post-MVP | |
| Stealth — line of sight | ⏳ Post-MVP | Radius-only first |
| Faction reputation | ⏳ Post-MVP | |
| Multiple towns | ⏳ Post-MVP | |
| More biomes | ⏳ Post-MVP | |
| Save / JSON export | ⏳ Post-MVP | localStorage unavailable in browser sandbox |

### 11.2 Development Milestones

#### Milestone 1 — Foundation ✅
- [x] PixiJS renderer renders 64×64 tile map
- [x] Camera follows a moveable character sprite
- [x] EasyStar pathfinding: click to move character
- [x] Day/night visual cycle

#### Milestone 2 — Characters ✅
- [x] `Character` class with all data fields
- [x] Squad panel React component shows HP + hunger
- [x] Hunger depletes over time; character weakens
- [x] Food item consumed from inventory

#### Milestone 3 — Combat ✅ (bugfix pending)
- [x] Enemy spawns with patrol FSM
- [x] Combat tick system resolves attacks
- [x] Body part damage applied and shown in UI
- [x] Unconscious state + recovery
- [ ] **Fix:** Enemy HP display not updating in React (Issue #3)

#### Milestone 4 — Economy ✅
- [x] Town map with 3 vendor NPCs
- [x] Shop modal: buy/sell items
- [x] Loot drops on enemy defeat
- [x] Bounty board with 3 contracts

#### Milestone 5 — Polish & Deploy ✅
- [x] Recruit system (hire from town wanderers)
- [x] Full HUD complete with time, cats, squad status
- [x] Game over screen (all characters dead)
- [x] Deploy to Itch.io

#### Milestone 6 — Wanderers & Stealth 🔲 (Week 7–8)
- [ ] Add `isCrouching: boolean` to `Character` type in `src/types/index.ts`
- [ ] Add **C key** input handler and **[CROUCH]** button in HUD — toggle whole squad
- [ ] Add crouch icon indicator to `SquadPanel.tsx` per character
- [ ] Modify `AI.ts` aggro check to use `effectiveAggroRange` formula (§6.6)
- [ ] Create `src/game/WandererSpawner.ts` — pool manager, respawn timer, biome weighting
- [ ] Add 3 wanderer templates to `src/data/enemies.ts` (Drifter, Scavenger, Desperate Raider)
- [ ] Implement Drifter FSM: random direction timer in `WandererSpawner.ts`
- [ ] Implement Scavenger FSM: seek nearest ruin POI, idle, seek next
- [ ] Add `Talk / Recruit / Ignore` action menu for neutral wanderers in world-click handler
- [ ] Add stealth skill training tick to `updateCharacter()` in `Character.ts`
- [ ] Wire wanderers into `syncToStore` so React HUD reflects their positions

---

## 12. Art Direction

### 12.1 Visual Style ✅

**Post-apocalyptic desert, low-poly top-down 2D.** Think Kenshi's desolate wasteland translated into a flat, readable sprite style — muted earth tones punctuated by rust, bone white, and the occasional pale blue of metal.

### 12.2 Colour Palette ✅

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
| Wanderer (neutral) | Sprite tint | `#A8C5A0` (muted green — distinguishable from bandit brown) |

### 12.3 Typography ✅

| Role | Font | Size |
|------|------|------|
| Game title / headers | Cabinet Grotesk Bold | 28px+ |
| HUD / squad names | Satoshi Medium | 14px |
| Body text / dialogue | Satoshi Regular | 16px |
| Tiny labels / values | Satoshi Regular | 12px |

### 12.4 Sprites ✅ (wanderer sprites 🔲)

Minimal sprite set for MVP. All sprites: 32×32px or 16×16px tileable.

- Player characters: 4-frame walk cycle (top-down, 4 directions)
- Enemies (Bandit): same structure, different colour palette
- Terrain tiles: desert, ruin, road, settlement floor
- Items: flat icons for weapons, food, armour, cats
- **Wanderers:** 🔲 reuse player walk cycle with muted green tint; Scavenger carries a sack prop

---

## 13. Audio ⏳ Post-MVP

Audio requires a user gesture to start (`AudioContext` restriction in browsers). Defer all audio to Post-MVP to avoid blocking gameplay testing.

**Planned (Post-MVP):**
- Ambient wind/desert loop
- Combat hit / miss sounds
- Coin clink on purchase
- Character unconscious grunt
- Day/night transition tone

---

## 14. Out of Scope (Explicitly Excluded)

The following systems are consciously excluded to maintain scope:

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
| Wanderer spawn clustering (all near start) | Low | Medium | Cap early-game spawn weighting at 60%; enforce min 5-tile spacing between spawns |
| Stealth breaks bandit balance (trivially avoidable) | Medium | Medium | Stealth skill requires proximity to train; max reduction 100% at skill 100 only |

---

*Document last updated: April 2026 (v0.2). Milestone dates are relative to project start.*
