# 8gents: Vertical Slice Prototype

A React-based vertical slice prototype demonstrating systemic continuity between map escalation and combat intervention.

## Design Intent

The prototype tests whether a game loop of **observation → intervention → consequence** feels like one continuous game rather than disconnected modes.

```
Map Escalation → Player Taps Infected Zone → Combat Engagement → World State Changes → Back to Map
```

## Core Systems

### 1. Exponential Escalation (`escalation.ts`)

**8x8 Grid Map** with a single escalation cluster starting at center (4, 4).

**Exponential Spread Behavior:**
- Cluster radius expands **15% every 2 seconds**
- Intensity increases **10% per spread cycle** (capped at 1.0)
- Spread velocity increases **15% per cycle** (visual metric of danger)

**Tile Contamination:**
- Distance-based falloff from cluster center
- Tiles > 30% contamination marked as "infected" (red zone)
- Contamination visualized as gradient: white → orange → deep red
- Infected zones pulsate on map to communicate urgency

**Visual Communication (within 5 seconds):**
- **Contaminated count** shows raw zone count
- **Intensity (%)** shows hazard level of cluster
- **Spread Velocity** shows tiles/second expansion
- **Radius** shows current cluster size
- Real-time updates every 200ms for smooth animation

### 2. Combat System (`combat.ts`)

**Lightweight, Partially Automated Combat**

When player taps infected zone:
1. Combat initiates with **enemy count scaled from contaminated tiles**
   - Formula: `min(12, ceil(infectedCount * 0.8))`
   - Caps at 12 even on large spread (prevents overwhelming fights)

2. **Auto-resolving Combat Rounds** (1 second per round)
   - Player deals 2-3 base damage (+ round scaling + 0%-50% variance)
   - Enemies deal 2 base damage (scaled by hazard level + remaining enemy count)
   - Health decreases each round until victory or defeat
   - ~3-5 rounds typical

3. **Arena Contamination Influence**
   - Combat difficulty scales with escalation intensity
   - Arena displays contaminated tiles in combat zone (3-tile radius from tap)
   - Hazard bar shows how much spread affects combat

**Victory Condition:**
- All enemies defeated before player health reaches 0
- Reward: **Cluster radius × 0.7**, intensity **-0.2**, zone contamination **-0.3**
- Spread intensity overall reduced by **-0.1**

**Defeat Condition:**
- Player health reaches 0
- Penalty: **Cluster radius × 1.3**, intensity **+0.15**
- Spread velocity increases by **+0.3**
- Spread intensity overall increased by **+0.15**

### 3. State Coupling

The continuous loop is maintained through:

- **Escalation → Combat Difficulty:** More infected tiles = more enemies
- **Combat Result → Map State:** Victory reduces spread; defeat accelerates it
- **Immediate Feedback:** Player sees changes on map within ~200ms of combat end
- **Consequence Teaches Mapping:** Large spread = harder combat = visible penalty if defeated

## Tuning Constraints

**Combat Difficulty Design:**
- Difficulty communicates consequence, not punishment
- Enemy cap of 12 prevents overwhelming scenarios even at large spread
- Health scaling: `10 + hazard * 5` (max 15 HP at full intensity)
- Damage output scales gradually to maintain readability

**Escalation Pacing:**
- 2-second spread cycle allows 5+ cycles before map fills (playable window)
- 15% radius growth gives exponential urgency without immediate threat
- Display updates every 200ms for smooth animation

## Component Structure

```
GameContainer (state orchestration, mode routing)
├── MapRenderer (8x8 grid with contamination)
│   └── MapTile (individual tile with gradient color)
├── CombatScreen (combat visualization)
│   └── Auto-resolving round display
└── Victory/Defeat messaging
```

**File Organization:**
```
src/games/eightgents/
├── types.ts                 # GameState, MapState, CombatState types
├── escalation.ts            # Spread simulation, tile contamination
├── combat.ts                # Combat resolution, state consequence
├── MapRenderer.tsx          # 8x8 grid display component
├── MapRenderer.css          # Map styling & animations
├── CombatScreen.tsx         # Combat UI & auto-resolution
├── CombatScreen.css         # Combat styling & animations
├── GameContainer.tsx        # Main game orchestrator
├── GameContainer.css        # Container layout & footer
├── index.ts                 # Module exports
└── README.md                # This file
```

## Playing the Prototype

**Route:** `/games/8gents`

**Gameplay Loop:**
1. **Watch:** Escalation cluster expands every 2 seconds
   - Infected zones (red) grow outward
   - Stats update in real-time
2. **Intervene:** Tap any red zone to initiate combat
3. **Fight:** Combat auto-resolves over ~3-5 seconds
   - Enemy count, player health, damage per round displayed
   - Victory/defeat shown with consequences
4. **Observe:** Return to map and see immediate changes
   - Victory: spread shrinks and intensity drops
   - Defeat: spread expands and velocity increases
5. **Repeat:** Until escalation is contained or spirals out of control

**Win Condition:** Reduce contaminated zones to 0 (fully contained spread)

**Failure State:** Escalation fills entire map (spread not contained)

## Design Decisions

### Why Exponential Growth?
Creates urgency. Small delays are manageable; late interventions face exponential penalty. Teaches consequence of inaction.

### Why Auto-Resolving Combat?
Removes mechanical friction between modes. Focuses on loop feedback rather than combat skill. Player watches "what they caused" rather than managing combat execution.

### Why Cap Enemy Count at 12?
Prevents degenerate cases where massive spread = impossible fights. Caps difficulty at "moderate" even late-game, keeping focus on decision-making over mechanical punishment.

### Why Distance Falloff for Contamination?
Makes cluster center more dangerous than edges. Encourages strategic decision-making about where to intervene.

### Why World-State Coupling?
Tests whether consequence feels real. Defeat that worsens the world teaches map interpretation matters.

## Future Extensions (Not Implemented)

Explicitly excluded per requirements:
- ~~Progression systems~~ (no leveling, no persistent stats)
- ~~Inventory/loadouts~~ (no equipment, no choice paralysis)
- ~~GPS integration~~ (no location-based mechanics)
- ~~Multiple escalation types~~ (single Exponential Spread behavior)
- ~~Polished combat rendering~~ (lightweight text-based UI)
- ~~Narrative systems~~ (no story or dialogue)

Potential future work:
- Multiple simultaneous clusters
- Different spread behaviors (Linear, Viral, Temporal)
- Player abilities or loadouts
- Persistent world state across sessions
- Difficulty scaling modes

## Technical Notes

- **React Hooks:** `useState` for state, `useEffect` for escalation loop, `useCallback` for memoized handlers
- **CSS:** Mobile-first responsive design, pulsing animations for infected zones
- **Performance:** 200ms update interval balances smoothness with re-render load
- **Type Safety:** Full TypeScript for game logic and components
- **No External Game Libraries:** Vanilla React + CSS (portable to React Native)

## Testing the Loop

1. **Load game** at `/games/8gents`
2. **Observe 10 seconds:** Cluster expands visibly
3. **Tap red zone:** Combat resolves in ~3-5 seconds
4. **Check result:** Victory shrinks spread; defeat expands it
5. **Tap again within 20 seconds:** Second intervention shows escalation + aftermath
6. **Repeat 5+ times:** Verify loop feels continuous despite mode transitions

**Expected Feeling:** "The spread is always there. I fight it, the world changes, and I see the consequence immediately."
