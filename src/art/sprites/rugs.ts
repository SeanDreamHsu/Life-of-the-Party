import type { PixelGrid } from '../pixel';

/**
 * RUGS — generated, not drawn.
 *
 * A rug is a border, a ring, and a field. Generating it means the three colour
 * ways stay pixel-identical in construction and a rug can never end up with a
 * lopsided border, which is exactly the mistake hand-drawing a 32x32 frame
 * invites. Drawn against OBJECT_PALETTE.
 */

const SIZE = 32;

/** [border, field, accent] characters, per colour way. */
const WEAVES: readonly (readonly [string, string, string])[] = [
  ['R', 'r', 'f'],
  ['C', 'c', 'l'],
  ['V', 'v', 'f'],
];

function weave(variant: number): PixelGrid {
  const [border, field, accent] = WEAVES[variant] ?? WEAVES[0]!;
  const cells: string[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => field),
  );

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const edge = Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y);
      const row = cells[y];
      if (!row) continue;

      if (edge === 0) row[x] = 'o';
      else if (edge <= 2) row[x] = border;
      else if (edge === 4) row[x] = accent;
      // A centred diamond, so the middle of the rug is not a dead field.
      else if (Math.abs(x - SIZE / 2 + 0.5) + Math.abs(y - SIZE / 2 + 0.5) < 6) row[x] = accent;
    }
  }

  return cells.map((row) => row.join(''));
}

export const RUGS = {
  rugRed: weave(0),
  rugBlue: weave(1),
  rugGreen: weave(2),
} as const;

export type RugId = keyof typeof RUGS;
