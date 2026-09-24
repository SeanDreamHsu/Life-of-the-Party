# Art redesign — characters, rooms, motion

Scope: the user's September 2026 visual redesign request. The original
instructions.txt is the historical prototype brief, not a request to rebuild
the game or add its remaining economy systems.

## Phase 1 — inspect and establish a baseline

- Read instructions.txt, CONTRIBUTING.md, README, project report and source.
- Preserve pure simulation, reversible planning, deterministic simultaneous AI.
- Verify the original production build and inspect the running house.

## Phase 2 — character art

- Keep the dollhouse pixel-art medium and warm, worn Victorian atmosphere.
- Replace palette-swapped clones with authored hair, outfit and accessory data.
- Give the host a waistcoat, rolled sleeves and a readable player marker.
- Use 32px sprites with clear faces, stepped highlights and grounded feet.
- Keep identities recognizable through all four mutation stages.

## Phase 3 — room composition

- Rebuild all eighteen rooms around distinct activity groups; clear corridors
  and remove decorative floor litter. Place every actor deliberately.
- Group lounge seating, dining settings, kitchen work areas and theater rows.
- Give the ballroom an open dance floor, with refreshments at the perimeter.
- Differentiate bedrooms and quiet corners rather than repeating each layout.
- Keep generated architecture, lure-source positions and doorway access intact.
- Add larger floor rugs to anchor groups without changing collision footprints.
- Move HUD controls outside the play surface and fit cameras to its actual size.

## Phase 4 — life and movement

- Add distinct walking frames, north-facing poses, blinks and personal idles.
- Animate only actual coordinate changes; preserve the simulation's turn cadence.
- Separate contact shadows from moving bodies and allow readable resolution time.
- Honor reduced-motion preferences, including lights.

## Phase 5 — verification and delivery

- Run TypeScript, production build, sprite/map/room/layout audits.
- Check deterministic turns, legal spawns and room/exit reachability.
- Inspect the house, room close-ups, cast and movement in the browser.
- Update CHANGELOG and record limitations. Deliver local preview and source.

No balance constants, hidden-lure disclosure, terminal states, engine port or
remote publication are included in this pass.


## Completion notes

All five phases completed locally on `art/characters-rooms-motion`.

- Thirteen character identities, each assembled from authored masks; 936
  combinations of identity, mutation stage, frame and direction audited.
- Twelve guests preserve their own silhouettes at stage zero; the host has a
  separate look, contact ring and pointer. Walking uses two alternating poses.
- 133 furniture/decor placements, rebuilt room by room after the user requested
  a calmer arrangement. Fifteen native-resolution rugs/runners organize the
  activity groups. Four new prop variants include a continuous banquet table.
- All twelve guest spawns are arranged around activity groups; the host starts
  in the foyer. All ten lure-source positions remain as before.
- The five existing startup audits pass, including full-rug room bounds.
- Production build and TypeScript pass. The regression script runs 24 identical
  replayable turns, 202 legal guest steps, unique occupancy, legal spawns and
  reversible host planning.
- Browser review covered lot, ballroom, dining room, the complete cast and the
  live motion study. Observed actual moving NPCs using walking frames while
  stationary guests retained idle frames. Host planning showed its walking
  frames and original-position ghost with a 0.64s transition.
- Native room selection provides direct access to close-ups and omits the
  hidden room. The camera now measures the unobstructed play surface using
  ResizeObserver; every listed room and the lot fit at four tested sizes.
- The instrument bar and side rail sit outside the play area. Selected-room
  dimming turns off when panning, and Recenter view restores the room framing.
  Browser console reports a clean startup audit.

The work is local and unpushed. This visual pass does not complete the original
prototype's missing win/lose, pantry, injury, audio or save systems.


## Follow-up: shared footprint and real stairs

Requested after the furnishing pass: stack the storeys over the same ground,
show the selected floor, and provide stairs to travel between them.

1. **Align the floors — complete.** Each storey occupies a 56 × 25 footprint.
   Atlas coordinates are converted to one screen origin for terrain, furniture,
   actors, lighting, camera focus, selection and menus. Browsing is free and
   keeps the overview scale fixed. Upper and basement rooms have shared landings.
2. **Connect the storeys — complete.** Authored stair flights join ground to
   upper and ground to basement; the basement also has a walkout. Both host and
   NPCs use this graph. Floor changes are planned one-minute moves with collision
   checks and undo. A larger contextual travel button supplements the map stairs.
3. **Verify — complete.** Production build, existing art/layout/keyboard checks,
   and floor tests pass. Verified the 23-step live keyboard route from the foyer,
   clicking upstairs, undoing back to ground, and using the basement travel prompt.
   Checked matching rendered footprints and a clean browser console. Fixed an
   overlapping destination-label click target found at small overview scales.

This follow-up supersedes the earlier note that all lure-source coordinates
remain fixed: upper and basement objects move with their rooms. There are now
20 named interior spaces, including the two added landings. No remote push.
