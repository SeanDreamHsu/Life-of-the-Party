# Life of the Party — Project State Report

**Audience:** an AI agent picking up this codebase cold.
**Date of audit:** 2026-09-07
**Verification performed:** full source read, `tsc -b` (clean), `npm run build` (clean), dev server launched and one turn played end-to-end in a browser. All claims below were checked against source, not inferred.

---

## 1. What the game is

A non-lethal, turn-based survival strategy game. Your house party has run 52+ hours and your guests are slowly mutating into hungover, destructive quasi-zombies. You are the host.

- **Win condition (design):** usher every guest off the property alive.
- **Fail condition (design):** the Suspicion Meter reaches 100 (neighbours/police intervene), **or** you critically injure a guest.
- **The catch:** you cannot carry anyone. You can only rearrange the house so that leaving becomes the most attractive option available to each guest.

**Visual style:** 2D top-down "dollhouse" cutaway, hand-authored pixel art rendered from string grids, Stardew-Valley-adjacent. Presentation is deliberately Victorian/brass/oxblood — sign plates, dials, an "instrument panel" HUD — not a bright cartoon.

**Voice:** the text log is Undertale-adjacent: every line names a person, in a room you can point at. The comedy is dry and slightly sad.

### The two-phase turn loop

| Phase | Owner | What happens |
|---|---|---|
| Planning | Player | Queue actions against a *projection* of the board. Fully reversible (undo / clear). |
| Resolution | Engine | Player's queued changes land **first**, then every guest reads that new board and takes one step **simultaneously**, then narration is generated. |

That ordering is load-bearing: flip the speaker on and walk away in the same hour, and the guests hear it during that same resolution.

---

## 2. Roadmap (from `instructions.txt`)

- **Phase 1 — Web prototype (current phase).** React + TypeScript + Vite + Tailwind. Rapid hot-reload to dial in the economy and AI before fighting an engine's physics.
- **Phase 2 — Commercial build.** Port the proven logic to **Godot** (native 2D tilemaps, GDScript) for a pixel-perfect Steam release.

The original brief specified four build phases. Their status:

| Brief phase | Scope | Status |
|---|---|---|
| 1. State architecture & grid scaffold | Types, 10×10 grid, 3 guests, 2 interactables | **Done and massively exceeded** (68×50 lot, 18 rooms, 12 guests, 10 interactables) |
| 2. Player phase (input & UI) | Top bar, action menu, queue, undo, End Turn | **Done and redesigned** (AP replaced by a 60-minute clock with carry/debt) |
| 3. Entity phase (AI & pathfinding) | Board evaluation, lure-seeking, simultaneous movement | **Done** (BFS distance fields, 4-tier priority, collision-settled simultaneous moves) |
| 4. Feedback & consequence engine | Text log, suspicion penalties, Game Over / Night Survived overlays | **Partially done.** Log, barks, ambient lines and intrusion suspicion all ship. **The win/lose overlays and the terminal state checks do not exist.** |

---

## 3. Tech stack and how to run it

```
React 19.2  ·  TypeScript 5.9 (strict, project references)  ·  Vite 8.2  ·  Tailwind CSS 4.3 (@tailwindcss/vite)
```

- No test framework, no linter config, no router, no state library. `useReducer` only.
- **Not a git repository.** There is a `.gitignore` but no `.git`. No version history exists.
- `dist/` holds build output plus one stray dev artifact, `dist/_pcview.html` (a hand-made data-URI preview of the surveillance-PC sprite at 3 zoom levels). Safe to delete.

```bash
npm run dev        # vite, port 5173 (also wired in .claude/launch.json)
npm run build      # tsc -b && vite build  — verified clean
npm run typecheck  # tsc -b — verified clean
```

Production bundle: **359 kB JS / 35 kB CSS** (107 kB / 7 kB gzipped), 67 modules. No runtime dependencies beyond React.

**Boot-time self-audit.** `App.tsx` runs five validators on mount and `console.error`s any problems: `auditFloorPlan()`, `auditAllSprites()`, `auditHouseMap()`, `auditLayout()`, `auditRooms(grid)`. On the current build all five pass ("Audit: floor plan, sprites, map, furnishing and rooms are all valid."). These catch silent corruption — a mis-typed pixel row, a ragged map row, two chairs sharing a tile — that throws no error but renders a wrong house.

---

## 4. Codebase map

~8,900 lines across 45 files in `src/`.

```
src/
  App.tsx                    262  Root. Owns camera, panel toggles, tutorial gate, resolution timer.
  main.tsx / index.css            Entry + the whole Tailwind theme (242 lines of CSS vars & plate/signplate/ghostbtn classes)

  types/game.ts              303  ALL domain types + metadata tables + tile/entity selectors. Read this first.

  game/                           The simulation. Pure, no React.
    state.ts                 597  GameState, the reducer, the projection system, availableActions(), commitTurn()
    ai.ts                    369  BFS distance fields, board signal reading, intent planning, simultaneous move application
    resolve.ts               241  Resolution orchestration: intents -> mutation -> agitation -> intrusion -> barks -> log
    actions.ts               183  The minute economy: costs, suspicion deltas, agitation deltas, camera-unlock rules
    cast.ts                  489  DATA ONLY. 12 guest profiles: tagline, 4-line dossier, ~10 bark categories, cross-guest lines
    barks.ts                 133  Who speaks this hour and why (2 chatterers + anyone with a dramatic trigger)
    narrate.ts               143  Movement/mutation/intrusion/profile prose, deterministic phrase selection
    camera.ts                200  Three zoom depths (lot -> wing -> room), derived focus rectangles, breadcrumbs
    lights.ts                134  What glows: lamps, speakers, disco balls, candles, TVs, punchbowls, moonlight

  data/
    floorplan.ts             505  SOURCE OF TRUTH for the house. Room rectangles + door coordinates. Generates the map.
    houseMap.ts              139  Wraps the building in lawn / walk / driveway / street. Emits the Grid.
    rooms.ts                 321  Room registry: names, blurbs, wings, offLimits flags, roomAt()/placeAt() lookups
    initialState.ts          560  260 furniture placements across 18 rooms, 12 guest spawns, 10 interactables, host start
    auditLayout.ts           314  Enforces the furnishing rules (2-tile lattice, nothing blocking a doorway, etc.)

  art/                            Pixel-art engine. Sprites are string grids + palette maps.
    pixel.ts / palette.ts / terrain.ts / index.ts
    sprites/  furniture(14) decorations(11) rugs(3) food(6) emotes(8) people(4 poses)

  components/                21 files. GameBoard + TerrainCanvas + LightingLayer do the rendering;
                             TopBar / ActionQueue / InspectorPanel / GuestRoster / EventLog are the HUD;
                             HowToPlay (708 lines, 7 cards) is the tutorial; SpriteGallery + Legend are dev tools.
```

**Architectural rule to preserve:** `game/` is pure and framework-free; the reducer is the only thing that owns state; `resolveTurn` *returns* suspicion rather than applying it. Keep it that way — this is what makes the Godot port tractable.

---

## 5. Systems that are BUILT and working

### 5.1 The house

Generated, never hand-typed. `floorplan.ts` holds 18 room rectangles and 33 door coordinates; `buildBuilding()` paints the rooms onto a field of wall (walls are simply wherever no room reached) and punches the doors. `houseMap.ts` pads that with 6 tiles of lawn each side, 5 front rows (street → pavement → lawn with a walk and a driveway) and 5 back rows.

- **Building:** 56 × 40. **Full lot:** 68 × 50 = 3,400 tiles.
- **Rooms (18):** Lounge, Foyer, Dining Room, Kitchen, Main Hall, Ballroom, Study, Theater, Game Room, Back Landing, Master Bedroom, Guest Rooms 1–3, Bathroom, Basement, Rec Room, **Sean's Crib** (`hidden: true` — on the map, walkable, named once you stand in it, but never advertised on a nameplate or in the camera list).
- **Off-limits rooms (2):** Master Bedroom, Sean's Crib. A guest ending an hour in one costs suspicion.
- **Exterior doors (4 tiles / 3 ways out):** the front door (2 tiles, x23–24), a side door off the Main Hall, and the basement walkout.
- **Wings (5):** front, middle, back, under, grounds. Four are zoomable; grounds is not (it *is* the border).
- **Furnishing:** 260 placements on a strict 2-tile lattice, audited at boot. Big pieces back onto the top wall (every sprite is drawn front-on), room centres stay open for rugs, nothing blocking sits beside a doorway.

### 5.2 The minute economy (replaces Action Points)

This is the biggest deliberate divergence from the brief. **A turn is one hour = 60 minutes**, not 3 AP.

| Action | Minutes | Suspicion | Agitation |
|---|---|---|---|
| Move (1 tile) | 1 | 0 | 0 |
| Toggle object | 2 | +2 | 0 |
| Lock/unlock door | 3 | +1 | 0 |
| **Shove** (2 tiles) | **4** | **+9** | **+22** |
| Place snack | 5 | 0 | −4 |
| **Nudge** (1 tile) | **8** | +3 | +8 |
| Check the cameras | 10 | 0 | 0 |

The nudge/shove inversion is the game in miniature: **the humane way is slower; the fast way is charged in suspicion and agitation instead of in time.**

**The hour is a soft edge.** You may *begin* anything you have ≥1 minute for. Overrun is borrowed from next hour (`minutes` goes negative and carries). Underspend banks forward. Caps: `MAX_BANKED_MINUTES = 60` (so an hour can be at most 120 minutes long), `MAX_BORROWED_MINUTES = 45`. Verified live: idling one hour produced "2h of 2h · +60 banked last hour".

**Movement is cheap per step, expensive in aggregate** — crossing a 56-tile house is most of an hour. *Where you are standing when the hour ends* is the biggest decision in the game.

### 5.3 The projection system

`project(state)` replays the queue over a copy of the board. Everything the player plans against — adjacency, action availability, the lighting layer, the projected suspicion readout, faded "planned" snack sprites — is measured against the projection, not the committed state. This is what makes multi-step plans expressible ("step east, *then* flip that lamp").

One deliberate exception: `cameras` previews only the monitor lighting up, never *who* the feeds identify — otherwise you could queue a look, read the answer off the panel, and undo it for a free peek.

### 5.4 Guest AI (`ai.ts`)

Guests are independent agents. Every guest evaluates the **same pre-move snapshot**, then all moves are applied together (evaluating one at a time would silently turn a simultaneous phase into a turn order).

**Pathfinding:** multi-source BFS `distanceField`s, cached per-target per-turn. A *field*, not a path, because guests only ever take one step — they need to know which neighbour is closer. Walls are handled for free (an unreachable tile simply never gets a distance). Blockers: walls, blocking furniture, bolted doors, the host's body, and other guests.

**Priority ladder (highest first):**
1. **Already outside** → head for the street. On the street → `depart`, gone.
2. **Own hidden lure is live** → walk toward it. (`quiet` inverts: walk *away* from noise, since quiet is an absence, not a place.)
3. **Hungry, or mutation stage ≥ 2** → head for the kitchen.
4. **Mill about.** Restlessness = `0.35 + agitation/200`, seeded deterministically per guest per turn so replays match.

**Board signals read each turn:** speakers → `bass` + `noise`; fridge → `food`; lamps **and the surveillance PC** → `light` (a monitor is a light — that is the trap of the surveillance room); snacks on the floor → `food`, pulling exactly like an open fridge.

**Collision settling in `applyIntents`:** anyone holding position claims their tile first so movers cannot displace them; a mover whose target is already claimed stays put.

### 5.5 Guests, lures, mutation, agitation

**12 guests**, spread across the whole house on purpose so no single lure reaches everyone.

| Guest | Lure | Start stage | Start agitation | Hungry |
|---|---|---|---|---|
| Gary | bass | 1 | 10 | |
| Denise | food | 0 | 0 | |
| Moss | quiet | 2 | 35 | |
| Priya | light | 0 | 5 | |
| Benno | food | 1 | 20 | yes |
| Roz | light | 0 | 8 | |
| Teddy | food | 1 | 12 | yes |
| Nadia | bass | 1 | 18 | |
| Colm | quiet | 0 | 2 | |
| Yusuf | quiet | 1 | 6 | |
| Bex | light | 2 | 25 | |
| Marlon | food | 2 | 30 | yes |

Lure spread: 4 food, 3 quiet, 3 light, 2 bass.

**Mutation stages (0–3):** Merely Tipsy → Rough Shape → Mutating → Feral. Every guest advances one stage **every 6 turns** (`MUTATION_EVERY`), or immediately if agitation hits 100. Stage 3 is reached at turn 18 and is terminal. Sprite palette rots with the stage.

**Agitation drift per hour:** got their lure −3 · nothing happening +1 · a *wrong* lure is running +2 · actively driven out by noise +4 · plus +4 for ending an hour trespassing. Direct handling: nudge +8, shove +22, snack −4.

**Intrusion cost:** `3 + 2 × mutationStage` suspicion per guest per hour spent in an off-limits room, measured on where they *end* the hour (so crossing a doorway and coming back out is free). Getting away with it adds +4 agitation, so it compounds. The counter-play already exists and is cheap: 3 minutes to bolt the door first.

### 5.6 Information design — the surveillance PC

The **only in-game way to learn a hidden lure**. (The "Secrets" HUD button is a developer switch, and is documented as such.)

- Gated behind **12 distinct jobs done** (`CAMERA_UNLOCK_TASKS`). Steps don't count. A job is keyed `kind:target`, so flipping one lamp twelve times does nothing — you must go and deal with twelve different things.
- The desk sits at the back of the **Master Bedroom** — the furthest point from the front door, *and* an off-limits room. The walk is the cost.
- Costs 10 minutes and reveals **one** guest per sitting. A full cast is a whole night of sittings.
- **The trap:** the monitor emits `light`. The machine that finds people also calls the light-seekers into the one room nobody may enter.
- **Who it picks:** the most agitated un-profiled guest. (Documented history: the first rule was "furthest from the host", which always resolved to the kitchen and always revealed the same four food-lovers. Agitation makes it responsive to how the night actually went, and gives the player a lever — wind somebody up and the cameras find them next.)

### 5.7 Writing and feedback

- **`cast.ts`** — 12 profiles, each with a tagline, a 4-entry dossier unlocked by proximity (`FAMILIARITY_STEPS = [4,10,18,28]`; +3/hour within 3 tiles, +1 within 7), ~10 bark categories, and cross-guest lines that fire when two specific people stand next to each other. ~255 authored strings.
- **Two hard rules, held throughout:** (1) a bark never names the guest's hidden lure — Gary can love the speaker out loud but must never say "I am drawn to bass"; (2) every character is funny in a way that is also a little sad.
- **`barks.ts` speaking budget:** dramatic triggers (shoved, nudged, mutate, gone, leaving) always speak; from everyone else only **2** get a line, rotating by turn.
- **Moods** express *feeling*, never the lure — `content` is legal, "wants bass" would end the deduction. Everyone within 4 tiles of live music dances, not just bass-lovers, for the same reason.
- **18 ambient lines** gated on suspicion thresholds (40/55/70) and board conditions.
- **`narrate.ts`** picks phrasing deterministically, so the same turn always reads the same way. "Hold" lines are suppressed except every 3rd turn, or the log fills with people doing nothing.

### 5.8 Presentation

- **Pixel-art engine:** sprites are authored as string grids with a palette map, validated at boot, rendered through a cached `PixelSprite`. 28 props + 6 foods + 8 emotes + 4 guest poses + procedural terrain (grass, concrete, asphalt, wood, kitchen tile, bath tile, carpet, wall, doorway).
- **Lighting layer:** the house is dark; everything visible is lit by something in the room. Four light kinds — steady, flicker, beat, disco — with deterministic per-source phase offsets. A disco ball with nothing playing is just a heavy ornament: the beams are tied to the speaker state, so flipping music on is a **visible event across the whole house**. Lights follow the *projection*, so planning a lamp lights the room immediately.
- **Camera:** three depths (lot → wing → room). Cameras hold **ids, never rectangles**, so remodelling the house can't leave a stored rectangle pointing at the wrong place. Escape zooms out one level. Breadcrumb bar hides itself at the top level. Drag-to-pan with computed slack.
- **HUD:** click-through overlay; the board underneath stays clickable in the gaps. Sign plate, camera bar, vitals bar (night · hour dial · suspicion gauge · End the Hour), right rail (Your Intentions / Close Inspection / The Guest List), bottom-left event log.
- **Tutorial (`HowToPlay.tsx`, 708 lines):** 7 cards — The House · The Hour · The Cost · The Pull · The Clocks · The Faces · Hour One. Auto-opens once per browser (`localStorage` key `lotp:tutorial-seen`, wrapped in try/catch). Card 4 embeds **`LureDemo`** — a playable one-guest, one-corridor, two-switch sandbox that teaches the deduction loop in four clicks rather than describing it.

---

## 6. Systems that are NOT built

These are the gaps. Ranked by how much they matter.

### 6.1 There is no win state, no lose state, and no game over

**The single most important gap.** `App.tsx` has no terminal-state check and no overlay component. Verified by search: the only occurrences of "You win" / "You lose" in the codebase are prose inside the tutorial cards.

- Suspicion is clamped at 100 (`Math.min(100, …)`) and then *nothing happens*.
- `state.departed` is appended to and displayed in the roster, but emptying the house triggers nothing.
- The game runs forever.

**This was Phase 4's explicit deliverable and it is missing.** Everything needed to build it already exists in `GameState`: `suspicion`, `guests.length`, `departed`.

### 6.2 There is no reliable route to the win condition for most guests

Nothing in the AI pulls a guest toward an exit. The priority ladder only heads for the street once a guest is **already outdoors**. Working through the four lure types:

| Lure | Can they be lured outside? | How |
|---|---|---|
| `food` (4 guests) | **Yes** | Snacks can be placed on any passable tile, lawn included. Food guests follow them out. This is the working case. |
| `quiet` (3 guests) | **Partly** | They flee noise. You can herd them outward with speakers, but you cannot aim them at a door. |
| `light` (3) | **No** | All 6 lamps + the PC are fixed indoors. No portable light exists. |
| `bass` (2) | **No** | Both speakers are fixed indoors. No portable speaker exists. |

So 5 of 12 guests have **no lure-based route out** and must be physically nudged (8 min/tile) or shoved (4 min/2 tiles, +9 suspicion each) across a 56-tile house. That is not a balance problem, it is a missing mechanic. Candidate fixes, cheapest first: a portable/placeable lamp and boombox action; a "prop the front door open" action that emits a lure; a `departing` disposition once agitation or stage crosses a threshold; or make `nudge` path a guest toward the nearest exit rather than simply away from the host.

### 6.3 Suspicion never decreases

`suspicion` starts at 12 and only ever climbs (`Math.min(100, …)` in two places, no subtraction anywhere). With 12 guests, passive mutation, and no decay, a long night is monotonic pressure with no recovery play. There is no "things quieten down", no reward for a clean hour, and no suspicion relief when a guest leaves. Worth deciding deliberately rather than by omission.

### 6.4 The Pantry Reserve does not exist

The brief specifies a third pressure system: a pantry that drains as guests raid the kitchen, and once empty guests turn aggressive, damage the house, and spike suspicion. **Not implemented in any form.** Snacks are created from nothing at 5 minutes each, unlimited.

### 6.5 No property damage, no injury, no second fail condition

- The types promise it (`agitationLevel`: "high values cause property damage") and `narrate.ts` has a comment reserving space for it. Nothing implements it.
- Shove is described in the tutorial and the code comments as "the only action that can hurt someone", and the design's second fail condition is injuring a guest. **There is no injury model at all** — shove only costs suspicion and agitation.
- Agitation at 100 currently does exactly one thing: force an early mutation.

### 6.6 Smaller gaps and inconsistencies

| Item | Detail |
|---|---|
| Tutorial says "five people" | `HowToPlay` card 1 reads "Five people are still in your house." There are **12**. Stale copy from an earlier build. |
| Not under version control | No `.git`. Zero history. Recommend `git init` before any further work. |
| Locked doors don't stop the host | `blocked()` in `ai.ts` honours `lockedDoors`; the host's `move` option uses `isWalkable`, which does not. The host walks through his own bolts. |
| Exterior doors are lockable | Nothing prevents bolting all 4 exterior door tiles, which would make the win condition unreachable once 6.2 is fixed. |
| `NUMERALS` runs out at Day 7 | `TopBar` falls back to the raw number from Day 8 (turn 57+). Cosmetic. |
| Snacks are free and infinite | See 6.4. |
| No tests | Zero test files, no runner. `ai.ts` and `state.ts` are pure and highly testable — deterministic seeded rolls make golden-turn tests easy. |
| No linter | No ESLint/Prettier config. Style is nonetheless very consistent. |
| Guests never interact with each other | The brief mentions guests fighting each other when the pantry empties. No guest-to-guest mechanics exist beyond `aboutOthers` flavour lines. |
| `dist/_pcview.html` | Stray dev artifact. Delete. |

---

## 7. Design principles this codebase holds to

An agent working here should preserve these; each is documented in-source, usually with the failure that motivated it.

1. **Generate, don't hand-type.** The house was hand-typed twice and sheared twice. Rooms are rectangles, walls are the gaps, doors are coordinates. One list feeds both the map and the room registry, so they cannot disagree.
2. **Identity is not material.** A room's *name* lives in the registry; `TileKind` is only what it's floored in. Four bedrooms share `bedroom`; none share a name.
3. **Audit at boot.** Anything that can silently render a wrong-but-plausible board gets a validator that shouts on mount.
4. **Plan against the projection, commit against the state.** Planning is reversible; resolution is not.
5. **Never leak the hidden lure.** Not in moods, not in barks, not in dancing, not in the camera preview. The deduction loop is the game.
6. **Simultaneous means simultaneous.** All guests read one snapshot; collisions are settled afterwards.
7. **Determinism.** Every random choice is seeded from `(id, turn)`. Two identical turns read identically — which is what makes the simulation testable.
8. **The humane path is slower, never weaker.** Nudge costs twice what shove does. That inversion is the thesis.
9. **`game/` is framework-free.** No React anywhere in the simulation. This is the Godot port's foundation.

---

## 8. Recommended next steps

**Must-do before this is a game rather than a toy:**

1. **Terminal states.** Add `outcome: 'playing' | 'caught' | 'survived'` to `GameState`, evaluate it at the end of `commitTurn` (suspicion ≥ 100 → caught; `guests.length === 0` → survived), and build the overlay. Small, self-contained, unblocks all playtesting.
2. **A route to the exit.** Fix 6.2 — without it the win condition is not reachable by design means for 5 of 12 guests. Recommend starting with a placeable lamp and a placeable speaker, since both reuse the existing `Interactable` + lure plumbing.
3. **Suspicion relief.** Decide: decay per quiet hour, a bonus per departure, or explicit calming actions. Pick one and state it in-source.

**Then:**

4. Pantry Reserve as the third pressure system (6.4), with snacks drawing from it.
5. Property damage + injury as real consequences of agitation and shoving (6.5), closing the second fail condition.
6. `git init` and a first commit.
7. Golden-turn tests over `resolveTurn` and `planGuestMoves` — cheap, given the determinism.
8. Fix the "five people" tutorial copy.

**Do not do yet:** the Godot port. Phase 1's stated purpose is to dial in the economy and AI behaviour before migrating, and two of the three pressure systems plus both fail conditions are still open.

---

## 9. Quick orientation for an agent

Reading order that gets you productive fastest:

1. `src/types/game.ts` — every domain type and metadata table, heavily commented.
2. `src/game/actions.ts` — the economy, and the reasoning behind every number.
3. `src/game/state.ts` — the reducer, the projection, `availableActions`, `commitTurn`.
4. `src/game/ai.ts` — the priority ladder and the distance fields.
5. `src/game/resolve.ts` — how a turn actually completes.
6. `src/data/floorplan.ts` — the house, and why it's generated.

The comments in this codebase are unusually load-bearing: most non-obvious constants carry a paragraph explaining what was tried before and why it failed. Read them before changing a number.
