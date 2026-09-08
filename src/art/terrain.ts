import type { PixelGrid, PixelPalette } from './pixel';

/**
 * TERRAIN — 16x16 floor and wall tiles, generated rather than hand-drawn.
 *
 * Floors are repetitive by nature: planks, grout lines, carpet fibre. Authoring
 * those as text grids invites off-by-one seams that only show up once 300 tiles
 * are laid side by side. Generating them guarantees the patterns line up across
 * tile boundaries, and keeps plank width, grout pitch, and noise density as
 * numbers you can tune in one place.
 *
 * Every generator takes a `variant`, so neighbouring tiles of the same material
 * differ slightly. That is what stops a large room reading as a flat repeated
 * texture — the complaint that made us redo this in the first place.
 */

export const TERRAIN_SIZE = 16;

export const TERRAIN_PALETTE: PixelPalette = {
  // lawn
  g: '#4b7a37', G: '#3d672c', h: '#5c8d43',
  // concrete path
  s: '#8a8781', S: '#6f6c67', p: '#9d9992',
  // wood flooring
  w: '#8a5f39', W: '#67452a', y: '#9c6f45',
  // kitchen tile
  t: '#b7bec7', T: '#8d959f', u: '#6c737c',
  // bathroom tile
  b: '#ccd6dc', B: '#a6b1b9', v: '#7f8b93',
  // bedroom carpet
  c: '#7a5768', C: '#654759', e: '#8a6577',
  // walls
  n: '#39322c', N: '#221c18', m: '#4d4239',
  // road asphalt
  a: '#3c3b3a', A: '#2c2b2b', q: '#4a4948',
  // door threshold
  d: '#a9743c', D: '#7b5027',
};

type Cells = string[][];

function blank(fill: string): Cells {
  return Array.from({ length: TERRAIN_SIZE }, () =>
    Array.from({ length: TERRAIN_SIZE }, () => fill),
  );
}

function freeze(cells: Cells): PixelGrid {
  return cells.map((row) => row.join(''));
}

function put(cells: Cells, x: number, y: number, ch: string): void {
  const row = cells[y];
  if (row && x >= 0 && x < TERRAIN_SIZE) row[x] = ch;
}

/** Deterministic 0..1 noise. Same tile always looks the same across reloads. */
function noise(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------ floors */

const PLANK_HEIGHT = 4;

/**
 * Wood flooring. Planks run horizontally with a seam on every 4th row, and
 * each band gets one staggered vertical joint so the courses look laid, not
 * printed. The seam sits on row 0 so it continues into the tile above.
 */
export function woodFloor(variant: number): PixelGrid {
  const cells = blank('w');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      if (y % PLANK_HEIGHT === 0) {
        put(cells, x, y, 'W');
      } else if (noise(x, y, variant + 11) > 0.86) {
        put(cells, x, y, 'y');
      }
    }
  }

  const bands = TERRAIN_SIZE / PLANK_HEIGHT;
  for (let band = 0; band < bands; band += 1) {
    const jointX = (band * 7 + variant * 5 + 3) % TERRAIN_SIZE;
    for (let y = band * PLANK_HEIGHT + 1; y < (band + 1) * PLANK_HEIGHT; y += 1) {
      put(cells, jointX, y, 'W');
    }
  }

  return freeze(cells);
}

/** Kitchen tile: 8px chequer with grout on the leading edges so it tiles. */
export function kitchenTile(variant: number): PixelGrid {
  const cells = blank('t');
  const PITCH = 8;

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const dark = (Math.floor(x / PITCH) + Math.floor(y / PITCH)) % 2 === 1;
      put(cells, x, y, dark ? 'T' : 't');
      if (x % PITCH === 0 || y % PITCH === 0) put(cells, x, y, 'u');
      else if (noise(x, y, variant + 31) > 0.94) put(cells, x, y, dark ? 't' : 'T');
    }
  }

  return freeze(cells);
}

/** Bathroom: smaller 4px tiles, cooler and cleaner than the kitchen. */
export function bathTile(variant: number): PixelGrid {
  const cells = blank('b');
  const PITCH = 4;

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const dark = (Math.floor(x / PITCH) + Math.floor(y / PITCH)) % 2 === 1;
      put(cells, x, y, dark ? 'B' : 'b');
      if (x % PITCH === 0 || y % PITCH === 0) put(cells, x, y, 'v');
      else if (noise(x, y, variant + 47) > 0.95) put(cells, x, y, dark ? 'b' : 'B');
    }
  }

  return freeze(cells);
}

/** Bedroom carpet: dense two-tone fibre noise, no structure. */
export function carpet(variant: number): PixelGrid {
  const cells = blank('c');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const n = noise(x, y, variant + 59);
      if (n > 0.72) put(cells, x, y, 'C');
      else if (n < 0.16) put(cells, x, y, 'e');
    }
  }

  return freeze(cells);
}

/** Lawn: base green with sparse two-pixel tufts and lighter flecks. */
export function grass(variant: number): PixelGrid {
  const cells = blank('g');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const n = noise(x, y, variant + 73);
      if (n > 0.955) {
        // A tuft: two stacked pixels read as a blade from above.
        put(cells, x, y, 'G');
        put(cells, x, y + 1, 'G');
      } else if (n < 0.05) {
        put(cells, x, y, 'h');
      }
    }
  }

  return freeze(cells);
}

/** The front walk: grey concrete, speckled, with a expansion joint. */
export function concrete(variant: number): PixelGrid {
  const cells = blank('s');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const n = noise(x, y, variant + 97);
      if (n > 0.88) put(cells, x, y, 'p');
      else if (n < 0.12) put(cells, x, y, 'S');
      if (y === 0) put(cells, x, y, 'S');
    }
  }

  return freeze(cells);
}

/** The road out front: dark asphalt, speckled, with a worn kerb edge. */
export function asphalt(variant: number): PixelGrid {
  const cells = blank('a');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      const n = noise(x, y, variant + 149);
      if (n > 0.9) put(cells, x, y, 'q');
      else if (n < 0.1) put(cells, x, y, 'A');
    }
  }

  return freeze(cells);
}

/* ------------------------------------------------------------------- walls */

/**
 * Wall block. A lit top edge and a dark bottom edge give the slab enough
 * relief to read as structure rather than as a hole in the floor.
 */
export function wall(variant: number): PixelGrid {
  const cells = blank('n');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      if (y <= 1) put(cells, x, y, 'm');
      else if (y >= TERRAIN_SIZE - 2) put(cells, x, y, 'N');
      else if (noise(x, y, variant + 113) > 0.9) put(cells, x, y, 'm');
    }
  }

  return freeze(cells);
}

/** Doorway: floorboards running through, with a raised timber threshold. */
export function doorway(variant: number): PixelGrid {
  const cells = blank('d');

  for (let y = 0; y < TERRAIN_SIZE; y += 1) {
    for (let x = 0; x < TERRAIN_SIZE; x += 1) {
      if (y <= 1 || y >= TERRAIN_SIZE - 2) put(cells, x, y, 'D');
      else if (noise(x, y, variant + 131) > 0.85) put(cells, x, y, 'D');
    }
  }

  return freeze(cells);
}
