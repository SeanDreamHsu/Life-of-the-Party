import type { TileKind } from '../types/game';

/**
 * THE FLOOR PLAN
 *
 * The house used to be a hand-typed grid of characters. At thirty by fifteen
 * that was readable; at fifty-six by forty it is two thousand two hundred
 * characters in which a single miscount silently shears the entire map — a
 * failure this project has already had twice.
 *
 * So the grid is GENERATED. Rooms are rectangles, doors are coordinates, and
 * the walls are simply everywhere no room reached. A room cannot be one tile
 * out of line with its neighbour, because nobody types the line; and adding a
 * room later really is one entry in a list rather than a careful edit to forty
 * rows at once.
 *
 * This is also the single source of truth for what rooms EXIST. `rooms.ts`
 * reads the same list for names and camera bounds, so the map and the registry
 * cannot disagree about where the kitchen is.
 *
 * ── THE LAYOUT ───────────────────────────────────────────────────────────────
 *
 *   y 1..8    front   Lounge · Foyer · Dining Room · Kitchen
 *   y 10..11  hall    The Main Hall, running the full width
 *   y 13..20  middle  Ballroom · Study · Theater · Game Room
 *   y 22..23  hall    The Back Landing
 *   y 25..32  back    Master Bedroom · Guest Rooms 1-3 · Bathroom
 *   y 34..38  under   Basement · Rec Room · (something else)
 *
 * Rooms are separated by exactly one column or row, which becomes their shared
 * wall. Doors are punched into those walls afterwards.
 */

export const BUILDING_WIDTH = 56;
export const BUILDING_HEIGHT = 40;

/** Which map character draws each floor material. Must match houseMap's LEGEND. */
const FLOOR_CHAR: Partial<Record<TileKind, string>> = {
  living: 'w',
  entry: 'e',
  hall: 'h',
  kitchen: 'k',
  bedroom: 'c',
  bathroom: 'b',
  den: 'd',
  garage: 'G',
};

export type WingId = 'front' | 'middle' | 'back' | 'under' | 'grounds';

export interface RoomPlan {
  id: string;
  /** What the house calls it. No two rooms share a name. */
  name: string;
  /** One dry line for the inspector. */
  blurb: string;
  /** The name as it reads mid-sentence in the log, article included. */
  narrative: string;
  /** Material only. Four bedrooms share `bedroom`; none share a name. */
  floor: TileKind;
  wing: WingId;
  /**
   * Kept off every nameplate and out of the camera's list of places to go.
   * A hidden room is still on the map, still walkable, still named once you
   * are standing in it — it simply is not advertised, which is the only
   * honest way to build a room somebody has to actually find.
   */
  hidden?: boolean;
  /**
   * Rooms a guest has no business being in.
   *
   * Somebody going through your bedroom is not a party any more, and the game
   * treats it that way: every hour a guest spends in one of these costs real
   * suspicion, and costs more the further gone they are. The counter-play
   * already exists — bolt the door before anybody wanders in.
   */
  offLimits?: boolean;
  /** Building-local, inclusive of x/y and exclusive of x+w / y+h. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ROOM_PLAN: readonly RoomPlan[] = [
  /* ---------------------------------------------------------------- front */
  {
    id: 'lounge',
    name: 'The Lounge',
    blurb: 'Where the party still thinks it is happening.',
    narrative: 'the lounge',
    floor: 'living',
    wing: 'front',
    x: 1,
    y: 1,
    w: 16,
    h: 8,
  },
  {
    id: 'foyer',
    name: 'The Foyer',
    blurb: 'The front door is right there. Nobody has used it in two days.',
    narrative: 'the foyer',
    floor: 'entry',
    wing: 'front',
    x: 18,
    y: 1,
    w: 12,
    h: 8,
  },
  {
    id: 'dining-room',
    name: 'The Dining Room',
    blurb: 'Nobody has eaten at this table. Several people have slept on it.',
    narrative: 'the dining room',
    floor: 'living',
    wing: 'front',
    x: 31,
    y: 1,
    w: 12,
    h: 8,
  },
  {
    id: 'kitchen',
    name: 'The Kitchen',
    blurb: 'Everything edible in this house has already been through here.',
    narrative: 'the kitchen',
    floor: 'kitchen',
    wing: 'front',
    x: 44,
    y: 1,
    w: 11,
    h: 8,
  },
  {
    id: 'main-hall',
    name: 'The Main Hall',
    blurb: 'Everyone ends up in the hall eventually. It goes everywhere.',
    narrative: 'the main hall',
    floor: 'hall',
    wing: 'front',
    x: 1,
    y: 10,
    w: 54,
    h: 2,
  },

  /* --------------------------------------------------------------- middle */
  {
    id: 'ballroom',
    name: 'The Ballroom',
    blurb: 'Built for eighty people. Currently holding the loudest four.',
    narrative: 'the ballroom',
    floor: 'living',
    wing: 'middle',
    x: 1,
    y: 13,
    w: 22,
    h: 8,
  },
  {
    id: 'study',
    name: 'The Study',
    blurb: 'The quietest room in the house, which is why they keep finding it.',
    narrative: 'the study',
    floor: 'den',
    wing: 'middle',
    x: 24,
    y: 13,
    w: 10,
    h: 8,
  },
  {
    id: 'theater',
    name: 'The Theater',
    blurb: 'Something has been playing in here since Saturday. Nobody is watching.',
    narrative: 'the theater',
    floor: 'den',
    wing: 'middle',
    x: 35,
    y: 13,
    w: 10,
    h: 8,
  },
  {
    id: 'game-room',
    name: 'The Game Room',
    blurb: 'Whatever tournament started here has long since stopped having rules.',
    narrative: 'the game room',
    floor: 'den',
    wing: 'middle',
    x: 46,
    y: 13,
    w: 9,
    h: 8,
  },
  {
    id: 'back-landing',
    name: 'The Back Landing',
    blurb: 'The corridor nobody decorated, because nobody was meant to linger.',
    narrative: 'the back landing',
    floor: 'hall',
    wing: 'middle',
    x: 1,
    y: 22,
    w: 54,
    h: 2,
  },

  /* ----------------------------------------------------------------- back */
  {
    // Large, private, and the one room in the house with real consequences
    // attached to it. The surveillance PC goes here once that exists.
    id: 'master-bedroom',
    name: 'The Master Bedroom',
    blurb: 'Yours. The door was shut on Friday and it is going to stay shut.',
    narrative: 'your room',
    floor: 'bedroom',
    wing: 'back',
    offLimits: true,
    x: 1,
    y: 25,
    w: 18,
    h: 8,
  },
  {
    id: 'guest-room-1',
    name: 'Guest Room One',
    blurb: 'Made up for one person. Currently accounting for three.',
    narrative: 'the first guest room',
    floor: 'bedroom',
    wing: 'back',
    x: 20,
    y: 25,
    w: 9,
    h: 8,
  },
  {
    id: 'guest-room-2',
    name: 'Guest Room Two',
    blurb: 'Somebody put their bag down in here on Thursday and never came back.',
    narrative: 'the second guest room',
    floor: 'bedroom',
    wing: 'back',
    x: 30,
    y: 25,
    w: 9,
    h: 8,
  },
  {
    id: 'guest-room-3',
    name: 'Guest Room Three',
    blurb: 'The small one at the end. Whoever is in here has not come out.',
    narrative: 'the third guest room',
    floor: 'bedroom',
    wing: 'back',
    x: 40,
    y: 25,
    w: 7,
    h: 8,
  },
  {
    id: 'bathroom',
    name: 'The Bathroom',
    blurb: 'The only door in this house anybody still bothers to shut.',
    narrative: 'the bathroom',
    floor: 'bathroom',
    wing: 'back',
    x: 48,
    y: 25,
    w: 7,
    h: 8,
  },

  /* ---------------------------------------------------------------- under */
  {
    id: 'basement',
    name: 'The Basement',
    blurb: 'Colder than the rest of it, and the only way out that nobody watches.',
    narrative: 'the basement',
    floor: 'garage',
    wing: 'under',
    x: 1,
    y: 34,
    w: 24,
    h: 5,
  },
  {
    id: 'rec-room',
    name: 'The Rec Room',
    blurb: 'Half a recording studio. The booth still works, which is the problem.',
    narrative: 'the rec room',
    floor: 'garage',
    wing: 'under',
    x: 26,
    y: 34,
    w: 19,
    h: 5,
  },
  {
    // Not on any nameplate, not in the camera's list, one door off the back of
    // the rec room. You find it by walking into it.
    id: 'seans-crib',
    name: "Sean's Crib",
    blurb: 'Somebody actually lives down here. Nobody at this party knows that.',
    narrative: "Sean's crib",
    floor: 'bedroom',
    wing: 'under',
    hidden: true,
    offLimits: true,
    x: 46,
    y: 34,
    w: 9,
    h: 5,
  },
];

export interface Door {
  x: number;
  y: number;
  /** Exterior doors lead off the building; the front walk lines up with one. */
  exterior?: boolean;
}

/**
 * Every threshold in the house, punched into the wall it belongs to.
 *
 * The exterior set is deliberately small. Three ways off the lot in a house
 * this size is already generous — the front door everyone came in through, a
 * side door off the main hall, and the basement's walkout, which is the one
 * nobody is watching.
 */
export const DOORS: readonly Door[] = [
  // The front door. The concrete walk outside lines up with this.
  { x: 23, y: 0, exterior: true },
  { x: 24, y: 0, exterior: true },
  // Side door off the main hall, and the basement walkout at the back.
  { x: 0, y: 11, exterior: true },
  { x: 12, y: 39, exterior: true },

  // Front band down into the main hall.
  { x: 8, y: 9 },
  { x: 23, y: 9 },
  { x: 24, y: 9 },
  { x: 36, y: 9 },
  { x: 49, y: 9 },
  // ...and between each other.
  { x: 17, y: 4 },
  { x: 30, y: 4 },
  { x: 43, y: 4 },

  // Main hall down into the middle band.
  { x: 10, y: 12 },
  { x: 28, y: 12 },
  { x: 39, y: 12 },
  { x: 50, y: 12 },
  // Middle band, room to room.
  { x: 23, y: 16 },
  { x: 34, y: 16 },
  { x: 45, y: 16 },
  // ...and down into the back landing.
  { x: 10, y: 21 },
  { x: 28, y: 21 },
  { x: 39, y: 21 },
  { x: 50, y: 21 },

  // Back landing into the bedrooms.
  { x: 9, y: 24 },
  { x: 24, y: 24 },
  { x: 34, y: 24 },
  { x: 43, y: 24 },
  { x: 51, y: 24 },

  // The stairs. One way down, through the first guest room.
  { x: 24, y: 33 },
  // And the two doors that make up the lower floor.
  { x: 25, y: 36 },
  { x: 45, y: 36 },
];

/**
 * Paints the room rectangles onto a field of wall, then punches the doors.
 *
 * Anything no room claimed stays '#', which is what makes the walls emerge
 * from the gaps between rooms rather than having to be drawn.
 */
export function buildBuilding(): string[] {
  const grid: string[][] = Array.from({ length: BUILDING_HEIGHT }, () =>
    Array.from({ length: BUILDING_WIDTH }, () => '#'),
  );

  for (const room of ROOM_PLAN) {
    const char = FLOOR_CHAR[room.floor];
    if (char === undefined) continue;
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        const row = grid[y];
        if (row !== undefined && row[x] !== undefined) row[x] = char;
      }
    }
  }

  for (const door of DOORS) {
    const row = grid[door.y];
    if (row !== undefined && row[door.x] !== undefined) {
      row[door.x] = door.exterior === true ? 'D' : '+';
    }
  }

  return grid.map((row) => row.join(''));
}

/**
 * Checks the plan itself, before any of it reaches the board.
 *
 * Two rooms overlapping, a room hanging off the edge, or a door punched into
 * open floor are all things that produce a house which looks almost right and
 * plays wrong — a doorway in the middle of the ballroom, a wall that is not
 * there. Cheaper to catch here than to notice later.
 */
export function auditFloorPlan(): string[] {
  const problems: string[] = [];

  for (const room of ROOM_PLAN) {
    if (FLOOR_CHAR[room.floor] === undefined) {
      problems.push(`plan: ${room.id} has floor '${room.floor}', which has no map character`);
    }
    if (room.w <= 0 || room.h <= 0) {
      problems.push(`plan: ${room.id} is ${room.w}x${room.h}`);
    }
    // Rooms must leave the outer ring alone; that ring is the exterior wall.
    if (room.x < 1 || room.y < 1) {
      problems.push(`plan: ${room.id} starts at (${room.x},${room.y}), inside the outer wall`);
    }
    if (room.x + room.w > BUILDING_WIDTH - 1 || room.y + room.h > BUILDING_HEIGHT - 1) {
      problems.push(`plan: ${room.id} runs past the outer wall`);
    }
  }

  for (let a = 0; a < ROOM_PLAN.length; a += 1) {
    for (let b = a + 1; b < ROOM_PLAN.length; b += 1) {
      const p = ROOM_PLAN[a];
      const q = ROOM_PLAN[b];
      if (p === undefined || q === undefined) continue;
      if (p.name === q.name) problems.push(`plan: two rooms are called '${p.name}'`);
      const overlapX = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const overlapY = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (overlapX > 0 && overlapY > 0) {
        problems.push(`plan: ${p.id} and ${q.id} overlap by ${overlapX}x${overlapY}`);
      }
    }
  }

  // A door has to be cut into a wall, and has to join two walkable places.
  const bare = buildBuildingWithoutDoors();
  for (const door of DOORS) {
    const here = bare[door.y]?.[door.x];
    if (here === undefined) {
      problems.push(`plan: door (${door.x},${door.y}) is off the building`);
      continue;
    }
    if (here !== '#') {
      problems.push(`plan: door (${door.x},${door.y}) is cut into floor, not wall`);
      continue;
    }

    const open = (x: number, y: number): boolean => {
      const ch = bare[y]?.[x];
      return ch !== undefined && ch !== '#';
    };
    const joinsAcross = open(door.x - 1, door.y) && open(door.x + 1, door.y);
    const joinsDown = open(door.x, door.y - 1) && open(door.x, door.y + 1);
    if (!joinsAcross && !joinsDown && door.exterior !== true) {
      problems.push(`plan: door (${door.x},${door.y}) does not join two rooms`);
    }
    if (door.exterior === true) {
      // An exterior door needs floor on exactly one side; the other is outdoors.
      const inside =
        open(door.x, door.y - 1) ||
        open(door.x, door.y + 1) ||
        open(door.x - 1, door.y) ||
        open(door.x + 1, door.y);
      if (!inside) problems.push(`plan: exterior door (${door.x},${door.y}) opens onto nothing`);
    }
  }

  return problems;
}

function buildBuildingWithoutDoors(): string[] {
  const grid: string[][] = Array.from({ length: BUILDING_HEIGHT }, () =>
    Array.from({ length: BUILDING_WIDTH }, () => '#'),
  );
  for (const room of ROOM_PLAN) {
    const char = FLOOR_CHAR[room.floor];
    if (char === undefined) continue;
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        const row = grid[y];
        if (row !== undefined && row[x] !== undefined) row[x] = char;
      }
    }
  }
  return grid.map((row) => row.join(''));
}
