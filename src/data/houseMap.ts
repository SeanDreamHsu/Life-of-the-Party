import { buildBuilding } from './floorplan';
import type { Grid, Tile, TileKind } from '../types/game';

/**
 * THE HOUSE AND ITS LOT
 *
 * The building is generated from room rectangles (see floorplan.ts), then
 * padded with yard, walk and street to reach the full map. Nothing here is
 * hand-typed, so neither the walls nor the padding can drift out of step with
 * the rooms — the failure mode that sheared the whole board twice before.
 *
 * The map is deliberately much wider than the house. Pulled all the way out,
 * the camera picks the largest INTEGER scale at which the whole lot fits, so
 * the surrounding lawn and street are what the eye finds at the edges of the
 * screen rather than the house being cropped at them. Zoomed in, that same
 * surplus is what bleeds off the edges instead of empty space. See useBoardView
 * — the lot size and the scale rule are one design, not two.
 *
 *   ,  lawn      :  concrete walk      _  street
 *   #  wall      D  exterior door      +  interior door
 *   w  living    e  entry hall         h  hallway     k  kitchen
 *   c  bedroom   b  bathroom           d  den         G  garage
 */

/** The building, generated from the room rectangles in floorplan.ts. */
const BUILDING: readonly string[] = buildBuilding();

/** Lawn to the left and right of the building. */
const YARD_MARGIN = 6;
/** Rows of street, pavement, and lawn above the building. */
const FRONT_ROWS = 5;
/** Rows of lawn behind the building. */
const BACK_ROWS = 5;

export const BUILDING_WIDTH = BUILDING[0]?.length ?? 0;
export const BUILDING_HEIGHT = BUILDING.length;

/** Where the building sits inside the lot. Furniture coordinates are absolute. */
export const HOUSE_X = YARD_MARGIN;
export const HOUSE_Y = FRONT_ROWS;

export const GRID_WIDTH = BUILDING_WIDTH + YARD_MARGIN * 2;
export const GRID_HEIGHT = BUILDING_HEIGHT + FRONT_ROWS + BACK_ROWS;

/** The front door, and therefore where the concrete walk has to line up. */
const DOOR_LOCAL_X = BUILDING[0]?.indexOf('D') ?? 0;
const WALK_X = HOUSE_X + DOOR_LOCAL_X;
const WALK_WIDTH = 2;

/** A driveway off to one side, purely to make the lot read as a real address. */
const DRIVE_X = 2;
const DRIVE_WIDTH = 4;

function frontRow(y: number): string {
  // Row 0 is the road, row 1 the pavement; the rest is lawn cut by the walk.
  if (y === 0) return '_'.repeat(GRID_WIDTH);
  if (y === 1) return ':'.repeat(GRID_WIDTH);

  const cells = Array.from({ length: GRID_WIDTH }, () => ',');
  for (let x = DRIVE_X; x < DRIVE_X + DRIVE_WIDTH; x += 1) cells[x] = ':';
  for (let x = WALK_X; x < WALK_X + WALK_WIDTH; x += 1) cells[x] = ':';
  return cells.join('');
}

/** Assembles the full lot: front rows, then the padded building, then back lawn. */
export function buildMap(): string[] {
  const rows: string[] = [];

  for (let y = 0; y < FRONT_ROWS; y += 1) rows.push(frontRow(y));

  const pad = ','.repeat(YARD_MARGIN);
  for (const row of BUILDING) rows.push(`${pad}${row}${pad}`);

  for (let y = 0; y < BACK_ROWS; y += 1) rows.push(','.repeat(GRID_WIDTH));

  return rows;
}

export const HOUSE_MAP: readonly string[] = buildMap();

/** Map character -> terrain kind. Anything unlisted is a hard error at boot. */
const LEGEND: Readonly<Record<string, TileKind>> = {
  ',': 'yard',
  ':': 'path',
  _: 'street',
  '#': 'wall',
  D: 'door',
  '+': 'door',
  w: 'living',
  e: 'entry',
  h: 'hall',
  k: 'kitchen',
  c: 'bedroom',
  b: 'bathroom',
  d: 'den',
  G: 'garage',
};

/**
 * Checks the map is rectangular and uses only known characters. A ragged row
 * would silently shear the whole house, so this reports rather than limps.
 */
export function auditHouseMap(): string[] {
  const problems: string[] = [];

  HOUSE_MAP.forEach((row, y) => {
    if (row.length !== GRID_WIDTH) {
      problems.push(`house map row ${y} is ${row.length} wide, expected ${GRID_WIDTH}`);
    }
    for (const ch of row) {
      if (LEGEND[ch] === undefined) {
        problems.push(`house map row ${y} uses '${ch}', which is not in the legend`);
        break;
      }
    }
  });

  if (HOUSE_MAP.length !== GRID_HEIGHT) {
    problems.push(`house map has ${HOUSE_MAP.length} rows, expected ${GRID_HEIGHT}`);
  }

  return problems;
}

function makeTile(x: number, y: number, ch: string): Tile {
  const kind = LEGEND[ch] ?? 'wall';
  return {
    x,
    y,
    isPassable: kind !== 'wall',
    hasDoor: kind === 'door',
    kind,
  };
}

/** Builds the terrain array from the text map. Pure — safe for a fresh game. */
export function createInitialGrid(): Grid {
  return HOUSE_MAP.map((row, y) => [...row].map((ch, x) => makeTile(x, y, ch)));
}
