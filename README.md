# Life of the Party

**Alpha v0.7.5** · A non-lethal, turn-based survival strategy game.

Your house party has been going for days. Your guests are no longer entirely
people. Nobody is going home, the pantry is emptying, and the neighbours are
starting to look out of their windows.

You cannot throw anyone out. You cannot hurt anyone. You have to make leaving
their idea.

---

## The pitch

You play the host of a party that will not end. Guests mutate from *merely
tipsy* through to *feral* as the hours pass, and each stage rewrites what they
want and where they walk. Your only real tools are the house itself — the
lights, the speakers, the fridge, the doors, and a plate of something warm put
down in the right room at the right time.

- **Win** by ushering every guest off the lot alive.
- **Lose** if the Suspicion Meter reaches 100 and the authorities arrive — or if
  you seriously injure a guest getting them out.

The design tension is that the *humane* options are slow and the *fast* options
are loud. Talking somebody into leaving takes eight minutes. Shoving them takes
four. The clock and your conscience pull in opposite directions, and the game is
almost entirely about how you spend that difference.

## Visual style

2D top-down pixel art in a "dollhouse" cutaway, in the Stardew Valley tradition.
Every sprite in the game is authored in-repo as data — see [`src/art/`](src/art)
— so there are no binary art assets to keep in sync, and anyone can add a prop
by writing one file.

---

## Core systems

### The hour (the turn)

A turn is **not** a fixed number of actions. A turn is **sixty minutes**, and
everything the host does spends some of them.

| Action | Minutes | Suspicion | Agitation | Notes |
| --- | ---: | ---: | ---: | --- |
| Move one tile | 1 | 0 | 0 | Cheap per step, ruinous in aggregate |
| Toggle an object | 2 | +2 | 0 | Lamp, speaker, fridge |
| Lock / unlock a door | 3 | +1 | 0 | Seals a route |
| Shove a guest | 4 | +9 | +22 | Fast, dangerous, the only action that can injure |
| Put out a snack | 5 | 0 | −4 | Fetching it, plating it, carrying it back |
| Nudge (talk them out) | 8 | +3 | +8 | Never one sentence, never quick |
| Read the cameras | 10 | 0 | 0 | The most expensive thing an hour can hold |

The hour is a **soft edge, not a wall**. You may *begin* anything you still have
a minute left for — so with two minutes on the clock you can start an
eight-minute conversation, and the six you borrow comes out of the next hour. An
hour you underspend banks the remainder forward, up to sixty minutes; you may run
up to forty-five minutes into debt.

That ledger is the strategic hinge. A quiet hour buys a long one later. An hour
spent walking the length of the house arrives with nothing left to do when you
get there. The mutation timer does not care how you budgeted, which is what
stops banking from being free.

### Planning and resolution

The two halves of a turn are strictly separated:

1. **Planning Phase** — you queue actions against the current board. Nothing
   happens yet. Anything can be taken back.
2. **Resolution Phase** — on *End the Hour*, your queued changes apply, then
   every guest evaluates the new board and moves. **Planning is reversible;
   resolution is not.**

Guest movement is resolved **simultaneously**: every guest picks its intent
against the same pre-move snapshot, then all moves apply together. Evaluating
them one at a time would let the first guest's move change what the second one
sees — that turns a simultaneous phase into a turn order, and the AI stops being
readable.

### Guests

Twelve authored characters live in [`src/game/cast.ts`](src/game/cast.ts). Each
one is pure data — tagline, unlockable dossier, and barks keyed to what just
happened to them. Two rules held throughout that file:

1. **A bark never names the guest's hidden lure.** Gary can love the speaker out
   loud; he must never say "I am drawn to bass."
2. **Every character is funny in a way that is also a little sad.** That is what
   makes a player want to *know* them rather than just clear them.

Each guest carries:

- **`hiddenLure`** — `bass`, `food`, `light`, or `quiet`. What they are secretly
  drawn to (or, for `quiet`, what they flee). Hidden at spawn, deduced by
  watching who moves toward what.
- **`mutationStage`** — `0` Merely Tipsy → `1` Rough Shape → `2` Mutating →
  `3` Feral. Every guest advances one stage every **6 turns**, and the stage
  re-weights their AI priorities and how much suspicion they generate outdoors.
- **`agitationLevel`** — 0–100. Rises when pushed or mis-lured. High agitation
  means property damage and unpredictable pathing.
- **`hungry`** — some people simply live in the kitchen. A hungry guest drifts
  toward it from the moment they arrive. It outranks wandering and is outranked
  by their own lure, so they can still be steered — they just default to the
  fridge.
- **`familiarity`** / **`profiled`** — hours spent near you unlock their dossier
  a line at a time. The **cameras are the only in-game way to reveal a hidden
  lure**; the "Secrets" toggle in the UI is a developer switch, not a mechanic.

### The surveillance PC

There is one interactable you cannot simply flip. The camera desk unlocks only
after the host has finished **12 distinct jobs** across the night.

Two rules there, and both were paid for in playtesting:

- **Steps do not count.** Otherwise the machine unlocks during the first walk
  down the hall and the gate means nothing.
- **A job counts once, per thing done to it.** An earlier version counted every
  deliberate action, which meant standing next to one lamp and flipping it
  twelve times — twenty-four minutes, no walking — opened the cameras. Keying on
  the *target* makes the only way through the gate the intended one: go and deal
  with twelve different things in the house.

The PC emits **light** while it runs, and that is not a technicality. The machine
that tells you where everyone is lights up the one room you cannot let anyone
into. The tool and the hazard are the same object.

### The camera (view, not surveillance)

The house is large, and a large house shown all at once is a map rather than a
place. The board has three depths and you drill down through them:

- **Lot** — the whole property, house and grounds. Where you plan.
- **Wing** — one part of the house: the front, the entertaining rooms, the
  bedrooms, downstairs, the grounds.
- **Room** — a single named room, filling the screen.

Each level is a focus rectangle in tiles; the renderer centres it at the largest
whole-number scale that fits, and everything outside keeps drawing and runs off
the edges. That is what makes zooming feel like leaning in rather than loading a
different screen. Camera levels store **ids, never rectangles** — rooms move when
the house is remodelled, and a stored rectangle would quietly point at the wrong
part of the map afterwards.

### The house

Nothing about the map is hand-typed. The building is generated from room
rectangles in [`src/data/floorplan.ts`](src/data/floorplan.ts), then padded with
lawn, walk and street to reach the full lot in
[`src/data/houseMap.ts`](src/data/houseMap.ts). Walls and padding therefore
cannot drift out of step with the rooms — a failure mode that sheared the whole
board twice before this was automated.

Named rooms include the Lounge, the Foyer, the Dining Room, the Kitchen, the
Main Hall, the Ballroom, the Study, the Theater, the Game Room, the Back
Landing and the Master Bedroom; outdoors there is the Street, the Front Lawn,
the Side Passage, the Bins and the Backyard.

Several `audit*` functions (`auditRooms`, `auditFloorPlan`, `auditHouseMap`,
`auditLayout`, `auditAllSprites`) run at startup and shout in the console if the
data has gone inconsistent — duplicate room names, overlapping rectangles,
malformed sprites. **If you touch the floorplan or the sprite catalog, watch the
console.**

---

## Getting started

Requires **Node 20+**.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/play/ for the game. The site root,
http://localhost:5173, is the landing page — the same page that is live at
https://lotp.vercel.app.

The landing page (`index.html` + `landing/`) is plain TypeScript and [anime.js](https://animejs.com)
— no React. It imports its sprites, costs, lines and opening stages straight from
`src/`, so retuning the game retunes the page. `npm run build` emits both pages.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b` only — no emit, fastest correctness gate |

**`npm run typecheck` must pass before you push.** It is currently the entire
test suite (see *Known gaps*).

## Tech stack

- **React 19** + **TypeScript 5.9** (strict)
- **Vite 8** for dev server and build
- **Tailwind CSS 4** via `@tailwindcss/vite`
- No game engine, no physics, no canvas library — the board is DOM, the sprites
  are data, and hot reload is the whole reason Phase 1 is a web app

## Project layout

```
src/
├─ App.tsx              Root: wires reducer, camera, panels, tutorial
├─ types/game.ts        Core domain types + selectors. Read this first.
├─ data/
│  ├─ floorplan.ts      Room rectangles — the source of truth for the house
│  ├─ houseMap.ts       Generates the full lot grid from the floorplan
│  ├─ rooms.ts          Room + wing metadata, names, blurbs
│  ├─ initialState.ts   Starting grid, decor, guests, interactables
│  └─ auditLayout.ts    Startup consistency checks
├─ game/
│  ├─ state.ts          GameState, the reducer, the minute ledger
│  ├─ actions.ts        Action kinds and their minute/suspicion/agitation costs
│  ├─ ai.ts             Guest intent + BFS pathfinding
│  ├─ resolve.ts        The Resolution Phase — applies a whole hour
│  ├─ cast.ts           The twelve guests, as pure data
│  ├─ barks.ts          Bark selection
│  ├─ narrate.ts        Turns resolution events into log prose
│  ├─ camera.ts         Lot / wing / room focus rectangles
│  └─ lights.ts         Lighting propagation
├─ components/          Board, sprites, HUD, panels, inspector, event log
└─ art/                 Palette, pixel helpers, and every sprite as data
```

## Reading order for a new contributor

1. [`src/types/game.ts`](src/types/game.ts) — the whole domain in one file, and
   heavily commented on *why* each type is shaped the way it is.
2. [`src/game/actions.ts`](src/game/actions.ts) — the economy. The long comment
   at the top is the design document for the turn.
3. [`src/game/ai.ts`](src/game/ai.ts) — how a guest decides.
4. [`src/game/state.ts`](src/game/state.ts) — how a turn is assembled.

The codebase is commented in a particular style: comments explain **why a
decision was made and what the alternative cost**, not what the line does.
Please match it.

---

## Roadmap

**Phase 1 — Web Prototype (current).** Build the logic, UI, state arrays and turn
queue in React + TypeScript + Vite, so the action economy and the AI behaviour
can be dialled in with hot reload instead of fighting an engine's physics.

**Phase 2 — Commercial Build.** Migrate the proven logic to **Godot**, using
native 2D tilemaps and GDScript for a pixel-perfect Steam release.

### Where alpha v0.7.5 stands

| Original phase | Status |
| --- | --- |
| Phase 1 — State architecture & grid | ✅ Done, and far past the original 10×10 scaffold |
| Phase 2 — Player phase, queue, undo | ✅ Done — the AP pool became the sixty-minute ledger |
| Phase 3 — AI, pathfinding, simultaneous resolution | ✅ Done |
| Phase 4 — Text log & consequence engine | 🟡 Partial — log, barks, suspicion and mutation land; the endgame does not |

## Known gaps

Honest list. These are the good first issues.

- **No win / lose overlay.** Suspicion accumulates and guests depart, but
  nothing yet fires at 100 suspicion or on an empty house. This is the single
  biggest gap between "prototype" and "game".
- **No injury / fail-on-harm.** Shoving raises agitation and suspicion but
  cannot yet actually injure a guest, so one of the two documented fail
  conditions is unimplemented.
- **No Pantry Reserve.** The design calls for a draining food resource that
  turns guests aggressive when it empties. Snacks currently cost only minutes.
- **No automated tests.** `tsc -b` is the only gate. A resolution-phase test
  harness would pay for itself immediately.
- **No sound.** Not one byte of audio, in a game about a speaker.
- **No save / resume.** `localStorage` holds exactly one flag: whether you have
  seen the tutorial.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: branch off `main`, keep
`npm run typecheck` green, write comments that explain *why*, and add guests and
props as data rather than as special cases.

The original design brief this project was built from is preserved verbatim in
[instructions.txt](instructions.txt).

## Versioning

This project is in alpha and does **not** follow semantic versioning yet.
Versions are `0.MINOR.PATCH`; anything may change between minors. See
[CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE).
