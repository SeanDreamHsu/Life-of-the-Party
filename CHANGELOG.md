# Changelog

All notable changes to **Life of the Party** are recorded here.

This project is in **alpha** and does not follow semantic versioning yet.
Versions are `0.MINOR.PATCH`, and anything — mechanics, types, file layout — may
change between minors without a deprecation path. Treat every `0.x` as a
snapshot of a prototype, not a stable API.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Host camera shortcut

- Press F to focus the host’s current room and floor, including planned moves.
  Repeated use recenters a dragged view without spending game time.
- Add Settings to rebind the shortcut to a letter or number, remember it in this
  browser, and reset to F. Reserve movement keys and ignore game shortcuts while
  typing or using a dialog.

### Stacked floors and stairs

- Give Ground Floor, Upper Floor and Basement the same 56 × 25 footprint and
  screen origin. Only the selected storey renders; switching floors retains the
  overview scale. Start with the whole ground floor visible.
- Expand the upper and basement rooms into their own storeys. Add shared rear
  landings and move the existing furniture groups into the deeper rooms.
- Add visible stair flights between ground/upper and ground/basement, plus a
  basement walkout. Stairs align vertically, cost one minute, respect occupied
  destinations, work in the projected plan and support undo.
- Use the same explicit stair graph for NPC routing and layout reachability.
  Keep proximity dialogue, familiarity and dancing on the appropriate floor.
- Show the selected floor and host location. A large travel button appears on
  a stair landing; small overview destination labels cannot intercept clicks.
- Add `npm run verify:floors` for shared coordinates, all six directed trips,
  occupancy, costs, commit/undo, NPC routing and the real keyboard route from
  the foyer. Existing build and art/layout checks also pass.

### Art, furnishing and movement

- Redesign the host and all twelve guests with distinct hair, outfits, body
  widths and accessories. Keep identities readable through four mutation stages.
- Add cached idle/blink, walking and dance frames, north-facing art, grounded
  contact shadows, a host pointer and a selected-guest nameplate.
- Animate actual position changes over 640ms and keep the resolution gate open
  for 820ms so the simultaneous step can be read. Idles remain within their tile.
- Rebuild all eighteen room compositions, reducing 252 interim decor placements
  to 133. Keep corridors clear, remove decorative floor litter, and place
  seating, tables and storage in coherent activity groups.
- Place all twelve guests in authored activity groups and start the host in the
  foyer, with the exit and nearby guests visible.
- Join the dining tables into a continuous banquet table.
- Add place-setting tables and north-facing seating. Render larger woven rugs
  and corridor runners at native pixel resolution, with room-boundary audits.
- Lift ambient visibility while retaining candle pools and music-driven lights.
  Freeze character animation, movement transitions and light motion when the
  system requests reduced motion.
- Put the instrument bar and side panels outside the play surface. Reframe
  rooms when panels open or the window resizes; downsample the overview when
  needed so the whole property and every exit remain visible.
- Add a room selector, a subtle focus border/dimming, and a recenter control
  after panning. Hidden rooms stay absent from the selector.
- Expand the sprite gallery with the complete cast and a live motion study.
- Add `npm run verify:art`: all five startup audits, spawn checks, unique
  silhouettes, walk frames, 24 deterministic turns, queue/undo, clear corridors
  and every listed room camera at four viewport sizes.

Furniture and spawn changes alter opening positions and walking routes; lure-source locations,
AI priorities and the minute/suspicion/agitation economy are unchanged.

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
