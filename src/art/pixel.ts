/**
 * Pixel-art plumbing.
 *
 * Sprites are authored as arrays of equal-length strings — one character per
 * pixel — plus a palette mapping each character to a CSS colour. Plain text
 * means anyone on the team can redraw a sprite in any editor without tooling,
 * and diffs stay readable when someone tweaks two pixels.
 *
 * At runtime each (grid, palette) pair is rasterised once onto a canvas and
 * cached as a data URL, then drawn as a CSS background with
 * `image-rendering: pixelated` so it scales to any tile size with hard edges.
 */

export type PixelGrid = readonly string[];

/** Character -> CSS colour. Characters absent from the map render transparent. */
export type PixelPalette = Readonly<Record<string, string>>;

/** The character that means "leave this pixel empty". */
export const TRANSPARENT = '.';

/** Every sprite in the game is authored on this canvas. */
export const SPRITE_SIZE = 32;

export interface SpriteSize {
  width: number;
  height: number;
}

export function measure(grid: PixelGrid): SpriteSize {
  return { width: grid[0]?.length ?? 0, height: grid.length };
}

/**
 * Reports what is wrong with a sprite: ragged rows, an off-spec canvas, or a
 * character with no palette entry. An empty array means the sprite is sound.
 * Hand-authored pixel grids drift by a character all the time — this is what
 * catches it before it reaches the board as a silently skewed image.
 */
export function validate(
  id: string,
  grid: PixelGrid,
  palette: PixelPalette,
  expected: number = SPRITE_SIZE,
): string[] {
  const problems: string[] = [];

  if (grid.length === 0) {
    return [`${id}: sprite has no rows`];
  }

  const width = grid[0]?.length ?? 0;

  grid.forEach((row, y) => {
    if (row.length !== width) {
      problems.push(`${id}: row ${y} is ${row.length}px wide, expected ${width}`);
    }
    for (const ch of row) {
      if (ch !== TRANSPARENT && palette[ch] === undefined) {
        problems.push(`${id}: row ${y} uses '${ch}', absent from the palette`);
        break;
      }
    }
  });

  if (width !== expected || grid.length !== expected) {
    problems.push(`${id}: canvas is ${width}x${grid.length}, expected ${expected}x${expected}`);
  }

  return problems;
}

const rasterCache = new Map<string, string>();

/**
 * Rasterises a grid to a PNG data URL, memoised by `cacheKey`. Callers must
 * fold anything that varies the colours into that key — a guest's palette
 * shifts as they mutate, so their key carries the stage.
 */
export function rasterise(cacheKey: string, grid: PixelGrid, palette: PixelPalette): string {
  const cached = rasterCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { width, height } = measure(grid);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  for (let y = 0; y < height; y += 1) {
    const row = grid[y] ?? '';
    for (let x = 0; x < width; x += 1) {
      const colour = palette[row[x] ?? TRANSPARENT];
      if (colour === undefined) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const url = canvas.toDataURL();
  rasterCache.set(cacheKey, url);
  return url;
}

/* ------------------------------------------------------------ colour math */

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function toHex(channel: number): string {
  return Math.round(Math.max(0, Math.min(255, channel)))
    .toString(16)
    .padStart(2, '0');
}

/** Linear blend between two hex colours. `t` of 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`;
}

/* ------------------------------------------------------- bulk rasterisation */

type Rgba = readonly [number, number, number, number];

const rgbaCache = new Map<string, Rgba | null>();

/** Parses `#rrggbb` and `rgba(r,g,b,a)`. Anything else is treated as invisible. */
function toRgba(colour: string): Rgba | null {
  const cached = rgbaCache.get(colour);
  if (cached !== undefined) return cached;

  let parsed: Rgba | null = null;

  if (colour.startsWith('#') && colour.length === 7) {
    parsed = [...parseHex(colour), 255] as const;
  } else {
    const match = /^rgba?\(([^)]+)\)$/.exec(colour);
    if (match?.[1]) {
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      const [r, g, b, a] = parts;
      if (r !== undefined && g !== undefined && b !== undefined) {
        parsed = [r, g, b, Math.round((a ?? 1) * 255)] as const;
      }
    }
  }

  rgbaCache.set(colour, parsed);
  return parsed;
}

/**
 * Blits one sprite grid into a shared ImageData at a pixel offset.
 *
 * The terrain layer is ~1000 tiles. Rendering each as its own element buries
 * the browser in nodes and React in reconciliation, so the whole floor is
 * composited into a single ImageData and pushed to one canvas instead. Writing
 * pixels directly is far cheaper than a fillRect per pixel.
 */
export function paintInto(
  image: ImageData,
  grid: PixelGrid,
  palette: PixelPalette,
  originX: number,
  originY: number,
): void {
  const { width, height } = measure(grid);

  for (let y = 0; y < height; y += 1) {
    const row = grid[y] ?? '';
    const py = originY + y;
    if (py < 0 || py >= image.height) continue;

    for (let x = 0; x < width; x += 1) {
      const colour = palette[row[x] ?? TRANSPARENT];
      if (colour === undefined) continue;

      const rgba = toRgba(colour);
      if (rgba === null) continue;

      const px = originX + x;
      if (px < 0 || px >= image.width) continue;

      const offset = (py * image.width + px) * 4;
      image.data[offset] = rgba[0];
      image.data[offset + 1] = rgba[1];
      image.data[offset + 2] = rgba[2];
      image.data[offset + 3] = rgba[3];
    }
  }
}
