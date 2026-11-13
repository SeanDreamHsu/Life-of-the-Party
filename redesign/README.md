# Redesign workspace

A separate, playable demo of a new presentation for the game. Nothing in `src/`
is changed by it: the demo imports the real rules, map, cast and colours from
`src/` and draws them differently.

- `src/art/` — the redrawn sprites. `pix.ts` is the drawing kit (hue-shifted
  ramps, coloured outlines, glow layers), `props.ts` is furniture, fixtures,
  food, emotes and doors, `people.ts` is the character rig and its animations.
- `src/demo/` — the demo itself: world renderer, lighting, input and HUD.
- `notes.html` — the design notes shown inside the demo.

Build the demo into one HTML file (run `npm install` in the repo root first):

```bash
node redesign/tools/build.mjs
```

Render a contact sheet of the sprites to a PNG for review:

```bash
node redesign/tools/sheet.mjs src/art/sheet.ts props.png
```

```bash
node redesign/tools/sheet.mjs src/art/sheet-people.ts people.png
```

Walk-cycle mechanics were studied from the Liberated Pixel Cup sheets as a
reference; no pixels were copied from them.
