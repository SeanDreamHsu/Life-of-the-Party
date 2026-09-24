import { HOUSE_X, HOUSE_Y } from './houseMap';
import type { Decor, Guest, Interactable } from '../types/game';

export {
  createInitialGrid,
  GRID_HEIGHT,
  GRID_WIDTH,
  HOUSE_MAP,
  HOUSE_X,
  HOUSE_Y,
  auditHouseMap,
} from './houseMap';

/**
 * ROOM COMPOSITIONS — building-local coordinates, offset once onto the lot.
 *
 * Each room has one activity group and a clear route between its doors. Rugs
 * belong to those groups, storage follows walls, and chairs face their tables
 * or screens. Food is drawn ON tables; there is no decorative floor litter.
 * The two narrow corridors contain no floor-standing furniture at all.
 */
function inside(x: number, y: number): { x: number; y: number } {
  // Keep the authored furniture groups together; put reading/seating groups
  // toward the rear of the deeper upper rooms and basement.
  const row = y >= 34 ? 51 + (y - 34) * 4
    : y >= 25 ? y + 1 + (y >= 29 ? 8 : 0)
    : y === 24 ? 25 : y;
  return { x: x + HOUSE_X, y: row + HOUSE_Y };
}

type Placement = [string, Decor['art'], number, number, boolean, (readonly [number, number])?];

const RUGS: Placement[] = [
  ['rug-lounge', 'rugRed', 5, 4, false, [8, 6]],
  ['rug-foyer', 'rugBlue', 23, 4, false, [4, 6]],
  ['rug-dining', 'rugGreen', 37, 4, false, [8, 6]],
  ['rug-hall', 'rugRed', 27, 10, false, [36, 1]],
  ['rug-ballroom', 'rugRed', 12, 16, false, [10, 6]],
  ['rug-study', 'rugBlue', 27, 17, false, [6, 4]],
  ['rug-theater', 'rugRed', 39, 17, false, [8, 6]],
  ['rug-game', 'rugGreen', 50, 16, false, [6, 4]],
  ['rug-landing', 'rugBlue', 28, 22, false, [38, 1]],
  ['rug-master', 'rugBlue', 6, 29, false, [8, 4]],
  ['rug-g1', 'rugRed', 24, 29, false, [6, 4]],
  ['rug-g2', 'rugGreen', 34, 29, false, [6, 4]],
  ['rug-g3', 'rugBlue', 43, 29, false, [4, 4]],
  ['rug-rec', 'rugRed', 36, 36, false, [6, 3]],
  ['rug-sean', 'rugBlue', 50, 36, false, [6, 3]],
];

/** Opposing sofas share a coffee table; media and storage occupy the east wall. */
const LOUNGE: Placement[] = [
  ['couch-lounge-a', 'couch', 5, 2, true],
  ['table-lounge', 'tableSet', 5, 4, true],
  ['couch-lounge-b', 'couchBack', 5, 6, true],
  ['chair-lounge', 'chair', 8, 4, false],
  ['tv-lounge', 'television', 11, 1, true],
  ['bookshelf-lounge', 'bookshelf', 15, 1, true],
  ['plant-lounge', 'plant', 13, 1, false],
  ['candle-lounge', 'candle', 2, 4, false],
  ['painting-lounge', 'painting', 5, 0, false],
  ['stringlights-lounge', 'stringlights', 11, 1, false],
];

/** The runner marks the exit. Columns 23/24 remain completely unobstructed. */
const FOYER: Placement[] = [
  ['plant-foyer-a', 'plant', 19, 2, false],
  ['plant-foyer-b', 'plant', 28, 2, false],
  ['console-foyer', 'counter', 19, 5, true],
  ['chair-foyer', 'chair', 28, 5, false],
  ['candle-foyer', 'candle', 19, 7, false],
  ['painting-foyer', 'painting', 27, 0, false],
];

/** A single banquet group, a north sideboard, and a west service aisle. */
const DINING: Placement[] = [
  ['sideboard-dining-a', 'counter', 33, 1, true],
  ['sideboard-dining-b', 'counter', 35, 1, true],
  ['table-dining-a', 'banquetTable', 35, 3, true],
  ['table-dining-b', 'banquetTable', 37, 3, true],
  ['table-dining-c', 'banquetTable', 39, 3, true],
  ['chair-dining-a', 'chairBack', 35, 5, false],
  ['chair-dining-b', 'chairBack', 37, 5, false],
  ['chair-dining-c', 'chairBack', 39, 5, false],
  ['plant-dining', 'plant', 41, 1, false],
  ['candle-dining', 'candle', 41, 7, false],
  ['painting-dining', 'painting', 38, 0, false],
];

/** One appliance run and one prep island; the south and east lanes stay open. */
const KITCHEN: Placement[] = [
  ['counter-a', 'counter', 44, 1, true],
  ['counter-b', 'counter', 46, 1, true],
  ['counter-c', 'counter', 48, 1, true],
  ['sink-kitchen', 'sink', 50, 1, true],
  ['island-kitchen', 'tableSet', 46, 4, true],
  ['chair-kitchen', 'chairBack', 46, 6, false],
  ['keg-kitchen', 'keg', 54, 3, true],
  ['plant-kitchen', 'plant', 54, 7, false],
];

/** A central dance floor, west seating pocket, and east refreshment station. */
const BALLROOM: Placement[] = [
  ['couch-ball-a', 'couch', 3, 15, true],
  ['table-ball', 'tableSet', 3, 17, true],
  ['couch-ball-b', 'couchBack', 3, 19, true],
  ['buffet-ball-a', 'counter', 19, 14, true],
  ['buffet-ball-b', 'tableSet', 19, 16, true],
  ['keg-ball', 'keg', 19, 18, true],
  ['plant-ball-a', 'plant', 21, 13, false],
  ['plant-ball-b', 'plant', 21, 19, false],
  ['discoball-ball', 'discoball', 12, 14, false],
  ['stringlights-ball-a', 'stringlights', 7, 13, false],
  ['stringlights-ball-b', 'stringlights', 17, 13, false],
  ['bunting-ball', 'bunting', 12, 13, false],
];

/** Corridors are circulation space, not furniture storage. */
const MAIN_HALL: Placement[] = [
  ['painting-hall-a', 'painting', 15, 9, false],
  ['painting-hall-b', 'painting', 41, 9, false],
];
const BACK_LANDING: Placement[] = [
  ['painting-landing-a', 'painting', 7, 21, false],
  ['painting-landing-b', 'painting', 36, 21, false],
];

const STUDY: Placement[] = [
  ['bookshelf-study-a', 'bookshelf', 26, 13, true],
  ['bookshelf-study-b', 'bookshelf', 30, 13, true],
  ['desk-study', 'tableSet', 26, 17, true],
  ['chair-study', 'chairBack', 26, 19, false],
  ['plant-study', 'plant', 32, 19, false],
  ['painting-study', 'painting', 32, 12, false],
];

/** Two rows face the screen; the center aisle joins both doors. */
const THEATER: Placement[] = [
  ['tv-theater-a', 'television', 37, 13, true],
  ['tv-theater-b', 'television', 41, 13, true],
  ['couch-theater-a', 'couchBack', 37, 16, true],
  ['couch-theater-b', 'couchBack', 41, 16, true],
  ['chair-theater-a', 'chairBack', 37, 19, false],
  ['chair-theater-b', 'chairBack', 41, 19, false],
  ['plant-theater', 'plant', 43, 13, false],
];

const GAME_ROOM: Placement[] = [
  ['tv-game', 'television', 48, 13, true],
  ['bookshelf-game', 'bookshelf', 52, 13, true],
  ['couch-game', 'couchBack', 48, 17, true],
  ['table-game', 'tableSet', 52, 17, true],
  ['chair-game', 'chairBack', 52, 19, false],
  ['plant-game', 'plant', 54, 13, false],
];

/** Bedside zone to the west, surveillance desk north, reading nook to the east. */
const MASTER: Placement[] = [
  ['bed-master', 'bed', 5, 26, true],
  ['candle-master', 'candle', 3, 26, false],
  ['bookshelf-master', 'bookshelf', 15, 25, true],
  ['couch-master', 'couch', 15, 29, true],
  ['table-master', 'tableSet', 15, 31, true],
  ['plant-master', 'plant', 17, 31, false],
  ['painting-master', 'painting', 5, 24, false],
];
const GUEST_ONE: Placement[] = [
  ['bed-g1', 'bed', 21, 26, true],
  ['bookshelf-g1', 'bookshelf', 27, 25, true],
  ['table-g1', 'tableSet', 22, 29, true],
  ['chair-g1', 'chairBack', 22, 31, false],
  ['candle-g1', 'candle', 26, 29, false],
  ['plant-g1', 'plant', 28, 31, false],
];
const GUEST_TWO: Placement[] = [
  ['bed-g2', 'bed', 32, 26, true],
  ['bookshelf-g2', 'bookshelf', 36, 25, true],
  ['table-g2', 'tableSet', 36, 29, true],
  ['chair-g2', 'chairBack', 36, 31, false],
  ['candle-g2', 'candle', 30, 25, false],
  ['plant-g2', 'plant', 38, 31, false],
];
const GUEST_THREE: Placement[] = [
  ['bed-g3', 'bed', 41, 26, true],
  ['table-g3', 'tableSet', 45, 29, true],
  ['chair-g3', 'chairBack', 45, 31, false],
  ['candle-g3', 'candle', 46, 25, false],
  ['plant-g3', 'plant', 40, 31, false],
];
const BATHROOM: Placement[] = [
  ['toilet', 'toilet', 48, 25, true],
  ['counter-bath', 'counter', 52, 25, true],
  ['sink-bath', 'sink', 54, 25, true],
  ['plant-bath', 'plant', 48, 31, false],
];

/** Storage stays north. The walkout at column 12 has a straight, empty approach. */
const BASEMENT: Placement[] = [
  ['bookshelf-base-a', 'bookshelf', 5, 34, true],
  ['bookshelf-base-b', 'bookshelf', 7, 34, true],
  ['counter-base-a', 'counter', 17, 34, true],
  ['counter-base-b', 'counter', 19, 34, true],
  ['keg-base', 'keg', 21, 34, true],
  ['table-base', 'tableSet', 7, 37, true],
  ['chair-base', 'chair', 5, 37, false],
  ['plant-base', 'plant', 1, 38, false],
];
const REC_ROOM: Placement[] = [
  ['counter-rec', 'counter', 28, 34, true],
  ['tv-rec', 'television', 30, 34, true],
  ['desk-rec', 'tableSet', 36, 35, true],
  ['chair-rec', 'chairBack', 36, 37, false],
  ['bookshelf-rec', 'bookshelf', 42, 34, true],
  ['plant-rec', 'plant', 44, 38, false],
];
const SEANS_CRIB: Placement[] = [
  ['bed-sean', 'bed', 48, 34, true],
  ['tv-sean', 'television', 52, 34, true],
  ['bookshelf-sean', 'bookshelf', 54, 34, true],
  ['table-sean', 'tableSet', 48, 37, true],
  ['chair-sean', 'chairBack', 52, 37, false],
  ['plant-sean', 'plant', 46, 38, false],
];

const DECOR: Placement[] = [
  ...RUGS, ...LOUNGE, ...FOYER, ...DINING, ...KITCHEN, ...BALLROOM,
  ...MAIN_HALL, ...STUDY, ...THEATER, ...GAME_ROOM, ...BACK_LANDING,
  ...MASTER, ...GUEST_ONE, ...GUEST_TWO, ...GUEST_THREE, ...BATHROOM,
  ...BASEMENT, ...REC_ROOM, ...SEANS_CRIB,
];

export function createInitialDecor(): Decor[] {
  return DECOR.map(([id, art, x, y, blocking, floorSize]) => ({
    id: `decor-${id}`, art, ...inside(x, y), blocking,
    ...(floorSize ? { floorSize } : {}),
  }));
}

/** Guests start in authored activity groups without exposing their hidden lures. */
export function createInitialGuests(): Guest[] {
  /** [id, name, localX, localY, stage, hidden lure, agitation, lives in the kitchen] */
  type Spawn = [
    string,
    string,
    number,
    number,
    Guest['mutationStage'],
    Guest['hiddenLure'],
    number,
    boolean,
  ];

  // Spread across the whole house on purpose. With eighteen rooms, a cast
  // clustered in two of them makes the other sixteen read as scenery — and
  // every lure has to reach somebody it can actually move.
  const cast: Spawn[] = [
    ['gary', 'Gary', 10, 16, 1, 'bass', 10, false],
    ['denise', 'Denise', 48, 4, 0, 'food', 0, false],
    ['moss', 'Moss', 29, 17, 2, 'quiet', 35, false],
    ['priya', 'Priya', 25, 5, 0, 'light', 5, false],
    ['benno', 'Benno', 52, 4, 1, 'food', 20, true],
    ['roz', 'Roz', 27, 6, 0, 'light', 8, false],
    ['teddy', 'Teddy', 50, 5, 1, 'food', 12, true],
    ['nadia', 'Nadia', 13, 17, 1, 'bass', 18, false],
    ['colm', 'Colm', 33, 28, 0, 'quiet', 2, false],
    ['yusuf', 'Yusuf', 38, 37, 1, 'quiet', 6, false],
    ['bex', 'Bex', 39, 18, 2, 'light', 25, false],
    ['marlon', 'Marlon', 33, 6, 2, 'food', 30, true],
  ];

  return cast.map(([id, name, x, y, mutationStage, hiddenLure, agitationLevel, hungry]) => ({
    id: `guest-${id}`,
    name,
    ...inside(x, y),
    mutationStage,
    hiddenLure,
    agitationLevel,
    hungry,
    facing: 1 as const,
    mood: null,
    dancing: false,
    saying: null,
    familiarity: 0,
    profiled: false,
  }));
}

/**
 * The lure sources — the switches the whole deduction loop is played on.
 *
 * Spread one to a wing so no single flip solves the house, and deliberately
 * placed before any decoration: where these sit is a gameplay decision, not a
 * furnishing one, and the detailing passes have to work around them rather
 * than the other way round.
 */
export function createInitialInteractables(): Interactable[] {
  // All of these sit on their room's own 2-tile lattice, same as the furniture.
  // A lure source parked on an odd column is a piece of furniture nothing else
  // can be placed beside without overlapping it.
  const objects: [string, Interactable['type'], number, number][] = [
    // The party's own speaker, at the back of the ballroom.
    ['speaker', 'speaker', 3, 13],
    // ...and the one in the studio downstairs, which still works.
    ['speaker-rec', 'speaker', 26, 34],
    ['fridge', 'fridge', 52, 1],
    ['lamp-lounge', 'lamp', 1, 1],
    ['lamp-study', 'lamp', 24, 13],
    ['lamp-theater', 'lamp', 35, 13],
    ['lamp-game', 'lamp', 46, 13],
    ['lamp-master', 'lamp', 1, 25],
    // The surveillance desk, centred on the back wall of the master bedroom so
    // it faces you through the door at (9,24) — and as far from the front of the
    // house as anything is. That walk IS the cost of using it; see
    // CAMERA_UNLOCK_TASKS.
    ['pc-master', 'pc', 11, 25],
    ['lamp-basement', 'lamp', 1, 34],
  ];

  return objects.map(([id, type, x, y]) => ({
    id: `obj-${id}`,
    type,
    ...inside(x, y),
    state: 'off' as const,
  }));
}

/** The host starts on the foyer runner, with the entrance and two guests in view. */
export function createHostStart(): { x: number; y: number } {
  return inside(24, 7);
}
