import {
  BUILDING_HEIGHT,
  BUILDING_WIDTH,
  GRID_HEIGHT,
  GRID_WIDTH,
  HOUSE_X,
  HOUSE_Y,
} from './houseMap';
import { ROOM_PLAN, type RoomPlan, type WingId } from './floorplan';
import { OUTDOOR_KINDS, TILE_LABEL, tileAt, type Grid } from '../types/game';

/**
 * THE ROOM REGISTRY
 *
 * A room's identity used to BE its floor material: the kitchen was every tile
 * whose `TileKind` happened to be `kitchen`, and its name came out of
 * `TILE_LABEL`. That works exactly as long as the house has one of everything.
 *
 * This house has four bedrooms and three rooms floored in the same dark boards.
 * Under the old scheme every one of those would have reported the same name in
 * the inspector, the action menu, the screen-reader labels and the log, and the
 * only cure would have been inventing a `TileKind` per room — dragging a new
 * terrain generator, legend character and label along behind each one.
 *
 * So identity lives here and material stays there. `floor` is only what a room
 * happens to be tiled in; the NAME is what distinguishes it. The rectangles
 * themselves come from floorplan.ts, which is also what draws the map — one
 * list, so the walls and the names cannot disagree about where anything is.
 */

export type { WingId };

export interface Wing {
  id: WingId;
  name: string;
  /** What this part of the house is for, in one line. */
  blurb: string;
  /**
   * Whether the camera offers this wing as somewhere to zoom into.
   *
   * The grounds wrap the whole property, so their bounding box IS the lot —
   * zooming to them would change nothing and their outline would frame the
   * entire board. Zooming exists because the house is too big to read at once;
   * the grounds are the border and are always in view already.
   */
  zoomable: boolean;
}

export const WINGS: readonly Wing[] = [
  {
    id: 'front',
    name: 'The Front of the House',
    blurb: 'Where the party is, where the noise is, and where the front door is.',
    zoomable: true,
  },
  {
    id: 'middle',
    name: 'The Entertaining Rooms',
    blurb: 'The ballroom and everything built to keep people in it.',
    zoomable: true,
  },
  {
    id: 'back',
    name: 'The Bedrooms',
    blurb: 'Where people have started shutting doors behind them.',
    zoomable: true,
  },
  {
    id: 'under',
    name: 'Downstairs',
    blurb: 'Below the house. Colder, quieter, and not on anybody else’s map.',
    zoomable: true,
  },
  {
    id: 'grounds',
    name: 'The Grounds',
    blurb: 'Off the carpet. A guest out here is nearly gone — or nearly a problem.',
    zoomable: false,
  },
];

export interface Room extends RoomPlan {
  /** Lot-absolute bounds, inclusive of x/y and exclusive of x+w / y+h. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The rooms inside the building, still in building-local coordinates. */
const INTERIOR: readonly RoomPlan[] = ROOM_PLAN;

/**
 * Outdoor zones, in lot coordinates.
 *
 * Split rather than treated as one lawn because the two ends mean opposite
 * things: the front is where guests arrive, where they leave, and where the
 * neighbours can count them; the back is where nobody can see anything.
 */
const EXTERIOR: readonly Room[] = [
  {
    id: 'street',
    name: 'The Street',
    blurb: 'Off the lot. A guest who reaches this is somebody else’s problem now.',
    narrative: 'the street',
    floor: 'street',
    wing: 'grounds',
    x: 0,
    y: 0,
    w: GRID_WIDTH,
    h: 1,
  },
  {
    id: 'front-lawn',
    name: 'The Front Lawn',
    blurb: 'The porch, the path, and four neighbouring windows with a view of it.',
    narrative: 'the front lawn',
    floor: 'yard',
    wing: 'grounds',
    x: 0,
    y: 1,
    w: GRID_WIDTH,
    h: HOUSE_Y - 1,
  },
  {
    id: 'side-passage',
    name: 'The Side Passage',
    blurb: 'A strip of grass and a gate that has never locked properly.',
    narrative: 'the side passage',
    floor: 'yard',
    wing: 'grounds',
    x: 0,
    y: HOUSE_Y,
    w: HOUSE_X,
    h: GRID_HEIGHT - HOUSE_Y,
  },
  {
    id: 'the-bins',
    name: 'The Bins',
    blurb: 'Three days of this party, stacked up and waiting for Tuesday.',
    narrative: 'the bins',
    floor: 'yard',
    wing: 'grounds',
    x: GRID_WIDTH - HOUSE_X,
    y: HOUSE_Y,
    w: HOUSE_X,
    h: GRID_HEIGHT - HOUSE_Y,
  },
  {
    id: 'backyard',
    name: 'The Backyard',
    blurb: 'Not overlooked by anybody, which is the only good thing about it.',
    narrative: 'the backyard',
    floor: 'yard',
    wing: 'grounds',
    x: HOUSE_X,
    y: HOUSE_Y + BUILDING_HEIGHT,
    w: GRID_WIDTH - HOUSE_X * 2,
    h: GRID_HEIGHT - HOUSE_Y - BUILDING_HEIGHT,
  },
];

export const ROOMS: readonly Room[] = [
  ...INTERIOR.map((spec) => ({ ...spec, x: spec.x + HOUSE_X, y: spec.y + HOUSE_Y })),
  ...EXTERIOR,
];

const ROOM_BY_ID = new Map(ROOMS.map((room) => [room.id, room]));

export function roomById(id: string): Room | undefined {
  return ROOM_BY_ID.get(id);
}

/**
 * The room containing a lot coordinate, or null in a wall or a doorway.
 *
 * Interior rooms are searched first so the side yards, which span the whole
 * height of the lot, cannot swallow the building sitting between them.
 */
export function roomAt(x: number, y: number): Room | null {
  for (const room of ROOMS) {
    if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) return room;
  }
  return null;
}

/** Whether this room is inside the building rather than out on the lot. */
export function isIndoors(room: Room): boolean {
  return room.wing !== 'grounds';
}

/** The bounding box of a wing, derived from its rooms so it cannot drift. */
export function wingBounds(id: WingId): { x: number; y: number; w: number; h: number } | null {
  const rooms = ROOMS.filter((room) => room.wing === id);
  if (rooms.length === 0) return null;

  const left = Math.min(...rooms.map((r) => r.x));
  const top = Math.min(...rooms.map((r) => r.y));
  const right = Math.max(...rooms.map((r) => r.x + r.w));
  const bottom = Math.max(...rooms.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export interface Place {
  /** What to print. A room name, or the terrain when between rooms. */
  name: string;
  /** The room's line of character, when there is a room. */
  blurb: string | null;
  room: Room | null;
}

/**
 * What to call a tile. Doorways and walls belong to no room, so they fall back
 * to the terrain label — "Doorway" is the right answer for a doorway, and it
 * keeps every caller from having to handle null itself.
 */
export function placeAt(grid: Grid, x: number, y: number): Place {
  const room = roomAt(x, y);
  const tile = tileAt(grid, x, y);

  // A doorway sits inside a room's rectangle in a few places, but it is a
  // threshold, not a room — name it for what it is.
  if (tile !== undefined && (tile.kind === 'door' || tile.kind === 'wall')) {
    return { name: TILE_LABEL[tile.kind], blurb: null, room: null };
  }

  if (room !== null) return { name: room.name, blurb: room.blurb, room };
  return {
    name: tile === undefined ? 'Off the lot' : TILE_LABEL[tile.kind],
    blurb: null,
    room: null,
  };
}

/**
 * The room name as the log should say it mid-sentence, article included.
 * Thresholds and the void get grammar of their own so the narrator never has
 * to special-case a null.
 */
export function narrativeNameAt(grid: Grid, x: number, y: number): string {
  const tile = tileAt(grid, x, y);
  if (tile === undefined) return 'the dark';
  if (tile.kind === 'door') return 'the doorway';
  return roomAt(x, y)?.narrative ?? TILE_LABEL[tile.kind].toLowerCase();
}

/**
 * Checks that every walkable interior tile belongs to exactly one room.
 *
 * A gap here is invisible in play — the tile simply reports its floor material
 * instead of a room name, which reads as a typo rather than a bug. An overlap
 * is worse: two rooms claiming a tile means the narrator's account of where
 * somebody went depends on registry order. Both are worth failing loudly for,
 * especially once rooms are being added a few at a time.
 */
export function auditRooms(grid: Grid): string[] {
  const problems: string[] = [];

  const names = new Set<string>();
  for (const room of ROOMS) {
    if (names.has(room.name)) problems.push(`rooms: two rooms are called '${room.name}'`);
    names.add(room.name);
    if (room.w <= 0 || room.h <= 0) {
      problems.push(`rooms: ${room.id} has an empty rectangle (${room.w}x${room.h})`);
    }
  }

  // Interior rooms must not overlap each other.
  const indoors = ROOMS.filter(isIndoors);
  for (let a = 0; a < indoors.length; a += 1) {
    for (let b = a + 1; b < indoors.length; b += 1) {
      const p = indoors[a];
      const q = indoors[b];
      if (p === undefined || q === undefined) continue;
      const overlapX = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const overlapY = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (overlapX > 0 && overlapY > 0) {
        problems.push(`rooms: ${p.id} and ${q.id} both claim ${overlapX}x${overlapY} tiles`);
      }
    }
  }

  // Every floor tile inside the building must belong to a room, and the room
  // must agree with the material it is actually tiled in.
  //
  // The sweep is over the building's BOUNDING BOX, which is not the same shape
  // as the building. Once the house stops being a plain rectangle — a wing off
  // the back, a courtyard, an L — the leftover corners of that box are garden,
  // and garden inside the box is exactly as correct as garden outside it. So
  // outdoor tiles are skipped rather than demanded to be in a room.
  const uncovered: string[] = [];
  const mismatched: string[] = [];
  for (let y = HOUSE_Y; y < HOUSE_Y + BUILDING_HEIGHT; y += 1) {
    for (let x = HOUSE_X; x < HOUSE_X + BUILDING_WIDTH; x += 1) {
      const tile = tileAt(grid, x, y);
      if (tile === undefined) continue;
      if (tile.kind === 'wall' || tile.kind === 'door') continue;
      if (OUTDOOR_KINDS.includes(tile.kind)) continue;

      const room = roomAt(x, y);
      if (room === null || !isIndoors(room)) {
        uncovered.push(`(${x},${y})`);
      } else if (room.floor !== tile.kind) {
        mismatched.push(`(${x},${y}) is ${tile.kind} but ${room.id} expects ${room.floor}`);
      }
    }
  }

  if (uncovered.length > 0) {
    problems.push(
      `rooms: ${uncovered.length} interior tile(s) belong to no room — ` +
        `${uncovered.slice(0, 8).join(' ')}${uncovered.length > 8 ? ' …' : ''}`,
    );
  }
  for (const line of mismatched.slice(0, 6)) problems.push(`rooms: ${line}`);
  if (mismatched.length > 6) {
    problems.push(`rooms: …and ${mismatched.length - 6} more floor mismatches`);
  }

  return problems;
}
