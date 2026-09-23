# Changelog

All notable changes to **Life of the Party** are recorded here.

This project is in **alpha** and does not follow semantic versioning yet.
Versions are `0.MINOR.PATCH`, and anything — mechanics, types, file layout — may
change between minors without a deprecation path. Treat every `0.x` as a
snapshot of a prototype, not a stable API.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added

- **A landing page** at the site root (`index.html` + `landing/`). The game
  itself moves to `/play/`. Every sprite,
  action cost, bark and opening mutation stage on it is read from `src/`, not
  restated. It includes a playable sixty-minute hour, a lure-deduction lab (the
  demo guest's lure is dealt at random, so the page never spoils the real one),
  a scroll-driven mutation sequence and a sprite drawn live from its source
  text. Animation is anime.js v4; `prefers-reduced-motion` is honoured
  throughout.

---

## [0.7.5] — 2026-09-07 — *first tagged release*

The first version published to version control. Everything below describes the
state of the prototype as of this tag rather than the delta from a previous
release, because there was no previous release — development up to this point
happened outside git, and that history is not recoverable. **0.7.5 is the
baseline every future entry is measured against.**

### The turn

- **Sixty-minute hours** replace the original three-Action-Point turn. Every
  action is priced in minutes that you can picture taking that long: 1 to walk a
  tile, 2 to reach a switch and flip it, 3 to find a key and work a bolt, 5 to
  fetch and plate a snack, 8 to talk somebody into leaving, 10 to sit down with
  the camera feeds.
- **Shoving costs 4 minutes** — deliberately *less* than nudging's 8. The fast
  way out is charged for in suspicion (+9) and agitation (+22) instead of in
  time. That inversion is the game's central tension in one table row.
- **A soft hour edge.** Any action may be *started* with a single minute left,
  and the overrun is borrowed from the next hour. Underspent hours bank forward.
- **A carry ledger**, capped at +60 banked and −45 borrowed. The bank cap is the
  one that bites: without it, idling four hours and then spending a five-hour
  turn trivialises the back half of a night. The debt floor is a guard rather
  than a rule you will meet — since only one action can start past the end of
  the hour, the worst reachable overdraft today is seven minutes.
- **Queue, review, undo, commit.** Planning changes nothing; *End the Hour*
  changes everything. Planning is reversible, resolution is not.

### Guests and AI

- **Twelve authored guests** in `src/game/cast.ts`, each with a tagline, a
  four-line dossier unlocked by proximity, and barks keyed to nine situations
  (`idle`, `lured`, `flee`, `raid`, `dancing`, `nudged`, `shoved`, `mutate`,
  `leaving`, `gone`), plus optional lines said only when standing beside a
  specific other guest.
- **Four hidden lures** — `bass`, `food`, `light`, `quiet` — assigned at spawn
  and never stated by a bark, so they stay deducible rather than announced.
- **Four mutation stages** (Merely Tipsy → Rough Shape → Mutating → Feral),
  advancing every 6 turns and re-weighting both AI priorities and the suspicion
  a guest generates while visible outdoors.
- **Agitation** 0–100, raised by shoving and mis-lured lures, lowered by food.
- **A `hungry` trait** that biases a guest toward the kitchen from turn one. It
  outranks wandering and is outranked by the guest's own lure, so a hungry guest
  is still steerable — they just default to the fridge.
- **Simultaneous resolution.** Every guest evaluates the same pre-move snapshot
  and all moves apply together, so no guest's step can change what the next one
  sees. Sequential evaluation was tried first and turned a simultaneous phase
  into a hidden turn order.
- **Multi-source BFS pathfinding**, so "distance to the nearest snack" is one
  sweep rather than one per snack.

### The surveillance PC

- **A gated interactable.** The camera desk opens only after **12 distinct
  jobs**, where a job is identified by verb *and* target. Steps do not count.
- **Cameras are the only in-game way to reveal a hidden lure.** The "Secrets"
  toggle in the UI is a developer switch, not a mechanic.
- **The PC emits light while live**, lighting up the one room nobody may enter.
  The tool and the hazard are deliberately the same object.

### The house

- **A generated floorplan.** Rooms are declared as rectangles in
  `floorplan.ts`; walls, doorways, lawn, walk and street are derived from them.
  Nothing is hand-typed, so walls and padding can no longer drift apart — a
  failure mode that sheared the whole board twice before automation.
- **Named rooms with blurbs**, grouped into five wings (the front of the house,
  the entertaining rooms, the bedrooms, downstairs, the grounds).
- **A three-level camera** — lot, wing, room — where each level is a focus
  rectangle centred at the largest whole-number scale that fits. Levels store
  room and wing **ids, never rectangles**, so a remodel cannot leave the camera
  pointing at the wrong part of the map.
- **Startup audits** (`auditRooms`, `auditFloorPlan`, `auditHouseMap`,
  `auditLayout`, `auditAllSprites`) that report inconsistent data to the console
  instead of rendering a subtly wrong board.

### Presentation

- **Every sprite is data**, authored in `src/art/` — people, food, furniture,
  rugs, decorations and emotes — so there are no binary assets to keep in sync.
- **A sprite gallery** for reviewing the whole catalog in-app.
- **Lighting propagation**, a terrain canvas, speech bubbles, mood emotes,
  facing that mirrors with movement, and dancing near live speakers.
- **An event log** in the Undertale tradition, written by `narrate.ts` from the
  events the resolution phase produced.
- **An inspector panel**, a guest roster with departure tracking, a legend, and
  a tutorial that opens itself exactly once per browser.

### Project

- Bumped `package.json` to `0.7.5` (it had been sitting at the Vite default
  `0.1.0` since scaffolding).
- Added `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` and an MIT `LICENSE`.
- Expanded `.gitignore` to cover env files, editor directories and log output.

### Not in this release

Tracked as the known gaps in the README:

- No win or lose overlay — suspicion reaching 100 and an emptied house both pass
  without ceremony.
- No injury system, so *fail by harming a guest* is documented but unreachable.
- No Pantry Reserve resource.
- No automated tests; `npm run typecheck` is the only gate.
- No audio.
- No save or resume.

[0.7.5]: https://github.com/SeanDreamHsu/Life-of-the-Party/releases/tag/v0.7.5
