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


/** Sized at native resolution so a large rug keeps the same pixel grain as the floor. */
export function roomRug(id: string, width: number, height: number): PixelGrid {
  const [border, field, accent] = WEAVES[id === 'rugRed' ? 0 : id === 'rugBlue' ? 1 : 2] ?? ['R', 'r', 'f'];
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
    if (edge === 0) return (x + y) % 2 ? '.' : 'I';
    if (edge < 3) return border;
    if (edge === 3 || edge === 6) return accent;
    if (edge < 9) return border;
    const diamond = Math.abs(x - (width - 1) / 2) + Math.abs(y - (height - 1) / 2);
    if (Math.abs(diamond - Math.min(width, height) * .3) < 2) return accent;
    if (diamond < 4) return accent;
    if ((x + 3 * y) % 19 === 0) return border;
    if (edge < 12 && (x + y) % 6 === 0) return accent;
    return field;
  }).join(''));
}
