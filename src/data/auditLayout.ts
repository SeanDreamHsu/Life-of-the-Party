import { floorNeighbours } from './floors';
import { PROPS, type PropId } from '../art';
import { TRANSPARENT, type PixelGrid } from '../art/pixel';
import { INTERACTABLE_META } from '../types/game';
import { createInitialGrid, BUILDING_HEIGHT, BUILDING_WIDTH, HOUSE_MAP, HOUSE_X, HOUSE_Y } from './houseMap';
import { createInitialDecor, createInitialInteractables } from './initialState';
import { roomAt } from './rooms';

/**
 * LAYOUT AUDIT
 *
 * The sprite audit catches a mis-typed pixel row. This catches the other silent
 * corruption: furnishing that is individually valid but arranged wrong.
 *
 * It exists because both of the layout's failure modes were invisible to every
 * check we had. Three kitchen counters placed one tile apart each validated
 * perfectly and rendered as one unreadable smear, because a sprite box is two
 * tiles wide and they were sharing half their area. And every string of party
 * lights hung on the building's outer wall row put its cord out over the front
 * lawn, because bunting inks from -0.44 to +0.13 tiles vertically — it draws
 * almost entirely in the row ABOVE the tile it is placed on.
 *
 * Neither is a crash. Both just look wrong, and only in the running game.
 */

/** How much ink two pieces may share before it reads as an overlap, in tiles. */
const TOLERANCE = 0.25;

/** Rugs draw first and are meant to sit UNDER the furniture. */
const UNDER: ReadonlySet<string> = new Set(['rugRed', 'rugBlue', 'rugGreen']);

/** These hang at ceiling height, so passing over furniture is correct. */
const OVER: ReadonlySet<string> = new Set(['stringlights', 'bunting', 'discoball', 'balloon']);

/** These are fixed to a wall rather than standing on the floor. */
const WALL_MOUNTED: ReadonlySet<string> = new Set(['painting', 'cobweb']);

/** Of the hanging pieces, these are on a cord that needs a wall behind it. */
const CORDED: ReadonlySet<string> = new Set(['stringlights', 'bunting']);

/** A prop's ink, as tile offsets from the tile it is placed on. */
interface Ink {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Where a sprite's ink actually sits inside its box. The renderer centres a
 * 2x2-tile box on the prop's own tile, so source pixel p maps to tile offset
 * (p / size) * 2 - 0.5. Comparing boxes rather than ink flags every cup sitting
 * politely beside a chair; comparing ink flags only what really collides.
 */
function measureInk(grid: PixelGrid): Ink | null {
  const size = grid[0]?.length ?? 0;
  if (size === 0) return null;

  let x0 = size;
  let x1 = -1;
  let y0 = size;
  let y1 = -1;

  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === TRANSPARENT) return;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    });
  });

  if (x1 < 0) return null;
  const toTiles = (px: number): number => (px / size) * 2 - 0.5;
  return {
    left: toTiles(x0),
    right: toTiles(x1 + 1),
    top: toTiles(y0),
    bottom: toTiles(y1 + 1),
  };
}

const INK: Partial<Record<PropId, Ink>> = {};
for (const [id, grid] of Object.entries(PROPS) as [PropId, PixelGrid][]) {
  const ink = measureInk(grid);
  if (ink) INK[id] = ink;
}

interface Piece {
  id: string;
  art: PropId;
  x: number;
  y: number;
  blocking: boolean;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rectOf(piece: Piece): Rect | null {
  const ink = INK[piece.art];
  if (!ink) return null;
  return {
    left: piece.x + ink.left,
    right: piece.x + ink.right,
    top: piece.y + ink.top,
    bottom: piece.y + ink.bottom,
  };
}

/** Shared width and height of two rects, in tiles. Negative means no contact. */
function shared(a: Rect, b: Rect): { w: number; h: number } {
  return {
    w: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    h: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

function charAt(x: number, y: number): string {
  return HOUSE_MAP[y]?.[x] ?? '?';
}

const isWall = (x: number, y: number): boolean => charAt(x, y) === '#';
const isDoor = (x: number, y: number): boolean => charAt(x, y) === '+' || charAt(x, y) === 'D';

/**
 * Checks the furnishing and returns the problems found, in the same shape as
 * the sprite and map audits so App can print them all together.
 */
export function auditLayout(): string[] {
  const problems: string[] = [];

  // Floor textiles have their own native dimensions. Validate their full area,
  // not the old 2x2 prop box, so a large runner cannot silently cross a wall.
  for (const item of createInitialDecor()) {
    if (!item.floorSize) continue;
    const [width, height] = item.floorSize;
    if (!UNDER.has(item.art) || item.blocking || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      problems.push(`layout: ${item.id} has invalid floor textile dimensions or collision`);
      continue;
    }
    const room = roomAt(item.x, item.y);
    const left = item.x + 0.5 - width / 2;
    const top = item.y + 0.5 - height / 2;
    if (!room || left < room.x || top < room.y || left + width > room.x + room.w || top + height > room.y + room.h) {
      problems.push(`layout: ${item.id} extends beyond its room`);
    }
  }

  const pieces: Piece[] = [
    ...createInitialDecor().map((d) => ({
      id: d.id,
      art: d.art,
      x: d.x,
      y: d.y,
      blocking: d.blocking,
    })),
    ...createInitialInteractables().map((o) => ({
      id: o.id,
      art: INTERACTABLE_META[o.type].art,
      x: o.x,
      y: o.y,
      blocking: true,
    })),
  ];

  for (const piece of pieces) {
    if (!INK[piece.art]) problems.push(`layout: '${piece.art}' (${piece.id}) has no ink to measure`);
  }

  const floor = pieces.filter(
    (p) => !UNDER.has(p.art) && !OVER.has(p.art) && !WALL_MOUNTED.has(p.art),
  );

  // Floor-standing pieces must not share ink with each other.
  for (let a = 0; a < floor.length; a += 1) {
    for (let b = a + 1; b < floor.length; b += 1) {
      const first = floor[a];
      const second = floor[b];
      if (first === undefined || second === undefined) continue;
      const p = rectOf(first);
      const q = rectOf(second);
      if (p === null || q === null) continue;

      const { w, h } = shared(p, q);
      if (w > TOLERANCE && h > TOLERANCE) {
        problems.push(
          `layout: ${first.id} and ${second.id} overlap by ${w.toFixed(2)}x${h.toFixed(2)} tiles`,
        );
      }
    }
  }

  // Wall-mounted pieces need a wall, and must not be pasted over furniture.
  for (const piece of pieces) {
    if (!WALL_MOUNTED.has(piece.art)) continue;

    const touchesWall =
      isWall(piece.x, piece.y) || isWall(piece.x - 1, piece.y) || isWall(piece.x, piece.y - 1);
    if (!touchesWall) {
      problems.push(`layout: ${piece.id} is mounted at (${piece.x},${piece.y}) with no wall there`);
    }

    const p = rectOf(piece);
    if (p === null) continue;
    for (const other of floor) {
      const q = rectOf(other);
      if (q === null) continue;
      const { w, h } = shared(p, q);
      if (w > TOLERANCE && h > TOLERANCE) {
        problems.push(`layout: ${piece.id} is drawn over ${other.id}`);
      }
    }
  }

  // Corded decor hangs from the row above its own tile, which must be a wall.
  for (const piece of pieces) {
    if (!CORDED.has(piece.art)) continue;
    const p = rectOf(piece);
    if (p === null) continue;

    const cordRow = Math.floor(p.top);
    if (!isWall(piece.x, cordRow)) {
      problems.push(
        `layout: ${piece.id} hangs its cord in row ${cordRow}, which is ` +
          `'${charAt(piece.x, cordRow)}' and not a wall`,
      );
    }
  }

  // Nothing solid may stand in a doorway or seal the tile in front of one.
  for (const piece of pieces) {
    if (!piece.blocking) continue;

    if (isDoor(piece.x, piece.y)) {
      problems.push(`layout: ${piece.id} stands in the doorway at (${piece.x},${piece.y})`);
    }
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      if (isDoor(piece.x + dx, piece.y + dy)) {
        problems.push(
          `layout: ${piece.id} blocks the approach to the door at (${piece.x + dx},${piece.y + dy})`,
        );
      }
    }
  }

  // And floor-standing pieces belong on floor.
  for (const piece of floor) {
    const here = charAt(piece.x, piece.y);
    if (here === '#' || here === '?' || here === '+' || here === 'D') {
      problems.push(`layout: ${piece.id} stands on '${here}' at (${piece.x},${piece.y})`);
    }
  }

  problems.push(...auditReachability(pieces));

  return problems;
}

/**
 * Every walkable tile must still reach a door. Nudging one bookshelf can seal a
 * room, and a sealed room does not throw — the guests inside it simply can
 * never leave and the game quietly becomes unwinnable.
 */
function auditReachability(pieces: Piece[]): string[] {
  const width = HOUSE_MAP[0]?.length ?? 0;
  const height = HOUSE_MAP.length;

  const blocked = new Set<string>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isWall(x, y)) blocked.add(`${x},${y}`);
    }
  }
  for (const piece of pieces) {
    if (piece.blocking) blocked.add(`${piece.x},${piece.y}`);
  }

  // Flood from the street, which is where a departing guest is headed.
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  for (let x = 0; x < width; x += 1) {
    const key = `${x},0`;
    seen.add(key);
    queue.push([x, 0]);
  }

  const grid = createInitialGrid();
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    const [x, y] = next;
    for (const { x: nx, y: ny } of floorNeighbours(grid, { x, y })) {
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (seen.has(key) || blocked.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }

  const stranded: string[] = [];
  for (let y = HOUSE_Y; y < HOUSE_Y + BUILDING_HEIGHT; y += 1) {
    for (let x = HOUSE_X; x < HOUSE_X + BUILDING_WIDTH; x += 1) {
      const here = charAt(x, y);
      if (here === '#' || here === '?') continue;
      if (blocked.has(`${x},${y}`)) continue;
      if (!seen.has(`${x},${y}`)) stranded.push(`(${x},${y})`);
    }
  }

  if (stranded.length === 0) return [];
  return [
    `layout: ${stranded.length} floor tile(s) cannot reach the street — ` +
      `${stranded.slice(0, 8).join(' ')}${stranded.length > 8 ? ' …' : ''}`,
  ];
}
