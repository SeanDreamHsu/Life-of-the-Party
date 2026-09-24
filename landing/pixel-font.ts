import type { PixelGrid } from '../src/art/pixel';

/**
 * A PIXEL FONT, AS DATA
 *
 * Five by seven, the size of the letters on an old dot-matrix display, and
 * written the same way as every sprite in the game: one character per pixel,
 * `#` lit and `.` dark. Pixelify Sans already covers the small print; this is
 * for words big enough that you can see, and push, every pixel in them.
 *
 * Only what the page spells is here. A glyph nobody uses is a glyph nobody
 * notices is wrong.
 */

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;

const GLYPHS: Readonly<Record<string, PixelGrid>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
};

/** How many pixel columns `text` needs: five per letter, one between each. */
export function spelledWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * (GLYPH_WIDTH + 1) - 1;
}

/**
 * The lit pixels of `text`, as coordinates in pixel columns and rows.
 *
 * Coordinates rather than a grid, because everything that spells a word here
 * moves its pixels one at a time. Unknown characters draw as `?` instead of
 * vanishing, so a typo shows up on the page rather than as a gap nobody reads.
 */
export function spell(text: string): { x: number; y: number }[] {
  const lit: { x: number; y: number }[] = [];
  [...text.toUpperCase()].forEach((ch, index) => {
    const glyph = GLYPHS[ch] ?? GLYPHS['?'] ?? [];
    glyph.forEach((row, y) => {
      [...row].forEach((ink, x) => {
        if (ink === '#') lit.push({ x: index * (GLYPH_WIDTH + 1) + x, y });
      });
    });
  });
  return lit;
}

/** Every glyph is exactly five by seven and uses only `#` and `.`. */
export function auditFont(): string[] {
  const problems: string[] = [];
  for (const [ch, glyph] of Object.entries(GLYPHS)) {
    if (glyph.length !== GLYPH_HEIGHT) {
      problems.push(`pixel-font: '${ch}' has ${glyph.length} rows, expected ${GLYPH_HEIGHT}`);
    }
    glyph.forEach((row, y) => {
      if (row.length !== GLYPH_WIDTH) {
        problems.push(`pixel-font: '${ch}' row ${y} is ${row.length} wide, expected ${GLYPH_WIDTH}`);
      }
      if (/[^#.]/.test(row)) problems.push(`pixel-font: '${ch}' row ${y} has ink other than # and .`);
    });
  }
  return problems;
}
