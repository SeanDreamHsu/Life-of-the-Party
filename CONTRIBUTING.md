# Contributing to Life of the Party

This is a small collaborative prototype. The bar for a change is not "does it
compile" — it is "will the next person understand why you did it that way."

## Setup

Requires **Node 20+**.

```bash
npm install
```

```bash
npm run dev
```

## Before you push

```bash
npm run typecheck
```

This must pass. It is currently the entire test suite — there is no unit test
runner yet, so TypeScript's strictness is doing all the work.

Also **open the browser console** after any change to the floorplan, rooms or
sprite catalog. Several `audit*` functions run at startup and report
inconsistent data (duplicate room names, overlapping rectangles, malformed
sprites) as console warnings rather than by crashing. A silently sheared board
looks fine until it very much does not.

## Branching and pull requests

- Branch off `main`. Name branches for what they do: `feat/pantry-reserve`,
  `fix/door-lock-cost`, `art/kitchen-props`.
- Keep pull requests to one idea. A PR that adds a mechanic *and* reformats a
  component is two PRs.
- In the description, say **what changed and why**, and call out anything that
  shifts the balance of the game. Retuning a single number in `ACTION_MINUTES`
  is a design change, not a typo fix, and it deserves a sentence.
- Update [CHANGELOG.md](CHANGELOG.md) under an `## [Unreleased]` heading if your
  change is something a player or another contributor would notice.

## Commit messages

Short imperative subject, then a body explaining *why* if the reason is not
obvious from the diff.

```
Cost the surveillance PC by distinct jobs, not action count

Counting every deliberate action meant standing beside one lamp and
flipping it twelve times unlocked the cameras. Keying on verb+target
makes the only route through the gate the intended one.
```

## House style

### Comments explain *why*

This is the one rule the codebase is genuinely opinionated about. Read the
header comment in [`src/game/actions.ts`](src/game/actions.ts) for the target.
Comments should record the decision and what the alternative cost — especially
when a naive reading of the code would suggest a simpler approach that was tried
and failed.

Do not write comments that restate the line beneath them.

### Add content as data, not as special cases

- **A new guest** is an entry in `CAST` in `src/game/cast.ts`. No system should
  need to learn their name.
- **A new prop** is a sprite in `src/art/sprites/` plus an entry in the catalog.
- **A new room** is a rectangle in `src/data/floorplan.ts` plus metadata in
  `src/data/rooms.ts`. Do not hand-edit the generated grid.
- **A new interactable type** is an entry in `INTERACTABLE_META` in
  `src/types/game.ts`, which carries its label, art, state names and the lure it
  emits while on.

If your change requires a system to branch on a specific id, that is usually a
sign the data model needs a field instead.

### Writing guest dialogue

Two rules, and they are not negotiable:

1. **A bark never names the guest's hidden lure.** Gary can love the speaker out
   loud; he must never say "I am drawn to bass." Naming it ends the deduction
   the whole game is built on. The same applies to mood emotes — they express
   *feeling*, never *want*.
2. **Every character is funny in a way that is also a little sad.** That is what
   makes a player want to know them rather than just clear them out.

### TypeScript

- Strict mode, no `any`, no non-null assertions you cannot justify in a comment.
- Prefer unions of string literals over enums; the codebase does this everywhere.
- Use the selectors in `src/types/game.ts` (`tileAt`, `guestAt`, `isWalkable`,
  `neighbours`, …) rather than indexing arrays directly. `tileAt` returns
  `undefined` off-board on purpose, to force callers to handle the edge.

### React

- Game logic lives in `src/game/`. Components render and dispatch; they do not
  decide.
- State that must be undoable goes through the reducer. State that must **not**
  be undoable — the camera zoom, panel visibility, the tutorial flag — stays in
  component state. Zooming is not a move.

## Balance changes

Numbers in `ACTION_MINUTES`, `ACTION_SUSPICION`, `ACTION_AGITATION`,
`MUTATION_EVERY`, `CAMERA_UNLOCK_TASKS`, `MAX_BANKED_MINUTES` and
`MAX_BORROWED_MINUTES` are load-bearing and interlocking. Before changing one:

- Play a few hours with the change in place.
- Say in the PR what you were trying to fix and what it broke elsewhere.
- Check the comment above the constant first — several of them record a value
  that was already tried and rejected.

## Good first issues

The known gaps in the [README](README.md#known-gaps) are all up for grabs. The
win/lose overlay and the Pantry Reserve are the two that most change how the
game plays.

## Questions

Open an issue. A question that turns out to be a design ambiguity is worth more
than a patch that guesses.
