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
 * FURNISHING
 *
 * Everything here is placed in BUILDING-LOCAL coordinates and offset onto the
 * lot by `inside()`. Writing absolute map coordinates would mean every piece of
 * furniture silently moves into a wall the moment the lawn margin changes.
 *
 * All eighteen rooms are furnished, one list each, in the order they appear in
 * the house. The lure sources live in createInitialInteractables rather than
 * here: where a speaker or a fridge sits is a gameplay decision, so it is made
 * first and the furniture works around it.
 *
 * ── ROOM COORDINATES (building-local; see floorplan.ts) ──────────────────────
 *
 *   Lounge       x1..16  y1..8     Foyer         x18..29 y1..8
 *   Dining Room  x31..42 y1..8     Kitchen       x44..54 y1..8
 *   Main Hall    x1..54  y10..11
 *   Ballroom     x1..22  y13..20   Study         x24..33 y13..20
 *   Theater      x35..44 y13..20   Game Room     x46..54 y13..20
 *   Back Landing x1..54  y22..23
 *   Master Bed   x1..18  y25..32   Guest One     x20..28 y25..32
 *   Guest Two    x30..38 y25..32   Guest Three   x40..46 y25..32
 *   Bathroom     x48..54 y25..32
 *   Basement     x1..24  y34..38   Rec Room      x26..44 y34..38
 *   Sean's Crib  x46..54 y34..38   (hidden)
 *
 * ── THE RULES EVERY ROOM FOLLOWS ─────────────────────────────────────────────
 *
 * A sprite box is TWO tiles wide and tall, CENTRED on its own tile, so two
 * pieces one tile apart share half their area and merge into one blob. Floor
 * furniture therefore sits on an even 2-tile LATTICE within each room. Big
 * pieces back onto the room's top wall, because every sprite is drawn front-on.
 * The middle of a room stays open for a rug. Nothing blocking sits next to a
 * doorway. Hanging decor goes on the first floor row UNDER a wall, so its cord
 * lands on the wall rather than out over the lawn.
 *
 * `auditLayout` enforces all of that at boot; see the notes there.
 */
function inside(x: number, y: number): { x: number; y: number } {
  return { x: x + HOUSE_X, y: y + HOUSE_Y };
}

/** [id, prop, localX, localY, blocksMovement] */
type Placement = [string, Decor['art'], number, number, boolean];

/**
 * RUGS FIRST — decor draws in array order, and these are meant to go under.
 */
const RUGS: Placement[] = [
  ['rug-lounge', 'rugRed', 7, 3, false],
  ['rug-foyer', 'rugBlue', 23, 3, false],
  ['rug-dining', 'rugGreen', 37, 5, false],
  ['rug-hall', 'rugGreen', 26, 10, false],
  ['rug-ballroom', 'rugRed', 10, 16, false],
  ['rug-study', 'rugBlue', 28, 17, false],
  ['rug-theater', 'rugRed', 39, 17, false],
  ['rug-game', 'rugGreen', 50, 17, false],
  ['rug-landing', 'rugBlue', 18, 22, false],
  ['rug-master', 'rugBlue', 9, 29, false],
  ['rug-g1', 'rugRed', 24, 29, false],
  ['rug-g2', 'rugBlue', 34, 29, false],
  ['rug-g3', 'rugGreen', 42, 29, false],
];

/**
 * THE LOUNGE — the second-loudest room, and the one people spill into from the
 * ballroom. Seating along the back wall, an open middle, and the debris of two
 * days on every surface that is not seating.
 */
const LOUNGE: Placement[] = [
  ['couch-lounge-a', 'couch', 3, 1, true],
  ['couch-lounge-b', 'couch', 5, 1, true],
  ['tv-lounge', 'television', 7, 1, true],
  ['bookshelf-lounge', 'bookshelf', 11, 1, true],
  ['plant-lounge-a', 'plant', 15, 1, false],
  ['chair-lounge-a', 'chair', 1, 3, false],
  ['cups-lounge', 'cups', 13, 3, false],
  ['table-lounge', 'table', 5, 5, true],
  ['punchbowl-lounge', 'punchbowl', 9, 5, false],
  ['pizzabox-lounge', 'pizzabox', 13, 5, false],
  ['plant-lounge-b', 'plant', 1, 7, false],
  ['candle-lounge', 'candle', 11, 7, false],
  ['chair-lounge-b', 'chair', 15, 7, false],
  // Ceiling and walls.
  ['discoball-lounge', 'discoball', 7, 3, false],
  ['stringlights-lounge', 'stringlights', 5, 1, false],
  ['bunting-lounge', 'bunting', 11, 1, false],
  ['balloon-lounge-a', 'balloon', 3, 3, false],
  ['balloon-lounge-b', 'balloon', 13, 7, false],
  ['painting-lounge-a', 'painting', 5, 0, false],
  ['painting-lounge-b', 'painting', 13, 0, false],
  ['cobweb-lounge', 'cobweb', 17, 1, false],
];

/**
 * THE FOYER — the front door and the way out. Columns 23 and 24 run straight
 * from the door to the main hall and carry nothing at all: a guest leaving
 * walks this, and nothing should read as being in the way.
 */
const FOYER: Placement[] = [
  ['plant-foyer-a', 'plant', 18, 1, false],
  ['bookshelf-foyer', 'bookshelf', 20, 1, true],
  ['chair-foyer-a', 'chair', 28, 1, false],
  ['candle-foyer-a', 'candle', 18, 3, false],
  ['cups-foyer', 'cups', 28, 3, false],
  ['table-foyer', 'table', 20, 5, true],
  ['chair-foyer-b', 'chair', 26, 5, false],
  ['plant-foyer-b', 'plant', 18, 7, false],
  ['candle-foyer-b', 'candle', 28, 7, false],
  ['bunting-foyer', 'bunting', 22, 1, false],
  ['painting-foyer', 'painting', 26, 0, false],
  ['cobweb-foyer', 'cobweb', 30, 1, false],
];

/**
 * THE DINING ROOM — three tables in a row read as one long table, which is the
 * only way to get a dining table out of a prop set that has no long one.
 */
const DINING: Placement[] = [
  ['bookshelf-dining', 'bookshelf', 31, 1, true],
  ['counter-dining', 'counter', 35, 1, true],
  ['plant-dining-a', 'plant', 41, 1, false],
  ['table-dining-a', 'table', 33, 3, true],
  ['table-dining-b', 'table', 35, 3, true],
  ['table-dining-c', 'table', 37, 3, true],
  ['cups-dining', 'cups', 39, 3, false],
  ['chair-dining-a', 'chair', 33, 5, false],
  ['chair-dining-b', 'chair', 35, 5, false],
  ['chair-dining-c', 'chair', 37, 5, false],
  ['pizzabox-dining', 'pizzabox', 39, 5, false],
  ['plant-dining-b', 'plant', 31, 7, false],
  ['candle-dining', 'candle', 41, 7, false],
  ['stringlights-dining', 'stringlights', 38, 1, false],
  ['painting-dining', 'painting', 33, 0, false],
  ['cobweb-dining', 'cobweb', 43, 1, false],
];

/**
 * THE KITCHEN — three counters, a sink and the fridge in one unbroken run at
 * 2-tile spacing, which leaves a quarter-tile seam and reads as continuous.
 * The fridge is an interactable and finishes the run; see createInitialInteractables.
 */
const KITCHEN: Placement[] = [
  ['counter-a', 'counter', 44, 1, true],
  ['counter-b', 'counter', 46, 1, true],
  ['counter-c', 'counter', 48, 1, true],
  ['sink-kitchen', 'sink', 50, 1, true],
  ['table-kitchen', 'table', 46, 3, true],
  ['keg', 'keg', 52, 3, true],
  ['chair-kitchen', 'chair', 44, 5, false],
  ['punchbowl-kitchen', 'punchbowl', 48, 5, false],
  ['plant-kitchen', 'plant', 54, 5, false],
  ['cups-kitchen', 'cups', 44, 7, false],
  ['pizzabox-kitchen', 'pizzabox', 50, 7, false],
  ['stringlights-kitchen', 'stringlights', 46, 1, false],
  ['painting-kitchen', 'painting', 45, 0, false],
  ['cobweb-kitchen', 'cobweb', 55, 1, false],
];

/**
 * THE BALLROOM — the biggest room in the house and where the noise comes from.
 * Column 10 is left open the whole way down: the hall door is at (10,12) and
 * the landing door at (10,21), so that column is the route straight through.
 */
const BALLROOM: Placement[] = [
  ['couch-ball-a', 'couch', 5, 13, true],
  ['couch-ball-b', 'couch', 7, 13, true],
  ['tv-ball', 'television', 13, 13, true],
  ['bookshelf-ball', 'bookshelf', 17, 13, true],
  ['plant-ball-a', 'plant', 21, 13, false],
  ['candle-ball', 'candle', 1, 15, false],
  ['cups-ball', 'cups', 19, 15, false],
  ['table-ball', 'table', 3, 17, true],
  ['punchbowl-ball', 'punchbowl', 17, 17, false],
  ['plant-ball-b', 'plant', 1, 19, false],
  ['chair-ball-a', 'chair', 5, 19, false],
  ['pizzabox-ball', 'pizzabox', 15, 19, false],
  ['chair-ball-b', 'chair', 21, 19, false],
  // Ceiling and walls.
  ['discoball-ball', 'discoball', 11, 17, false],
  ['stringlights-ball-a', 'stringlights', 5, 13, false],
  ['stringlights-ball-b', 'stringlights', 15, 13, false],
  ['bunting-ball', 'bunting', 19, 13, false],
  ['balloon-ball-a', 'balloon', 9, 15, false],
  ['balloon-ball-b', 'balloon', 13, 19, false],
  ['painting-ball-a', 'painting', 9, 12, false],
  ['painting-ball-b', 'painting', 15, 12, false],
  ['cobweb-ball', 'cobweb', 1, 13, false],
];

/**
 * THE MAIN HALL — two tiles deep and fifty-four wide, so everything hugs the
 * top and the nine door columns are left alone.
 */
const MAIN_HALL: Placement[] = [
  ['bookshelf-hall-a', 'bookshelf', 3, 10, true],
  ['plant-hall-a', 'plant', 13, 10, false],
  ['cups-hall', 'cups', 19, 10, false],
  ['candle-hall', 'candle', 31, 10, false],
  ['plant-hall-b', 'plant', 43, 10, false],
  ['bookshelf-hall-b', 'bookshelf', 53, 10, true],
  ['bunting-hall', 'bunting', 6, 10, false],
  ['stringlights-hall', 'stringlights', 33, 10, false],
  ['painting-hall-a', 'painting', 15, 9, false],
  ['painting-hall-b', 'painting', 41, 9, false],
  ['cobweb-hall', 'cobweb', 1, 10, false],
];

/** THE STUDY — the quietest room, which is exactly why they keep finding it. */
const STUDY: Placement[] = [
  ['bookshelf-study-a', 'bookshelf', 26, 13, true],
  ['bookshelf-study-b', 'bookshelf', 30, 13, true],
  ['plant-study', 'plant', 32, 13, false],
  ['table-study', 'table', 24, 15, true],
  ['cups-study', 'cups', 32, 15, false],
  ['chair-study', 'chair', 24, 17, false],
  ['candle-study', 'candle', 32, 17, false],
  ['plant-study-b', 'plant', 24, 19, false],
  ['pizzabox-study', 'pizzabox', 30, 19, false],
  ['bunting-study', 'bunting', 30, 13, false],
  ['painting-study', 'painting', 25, 12, false],
  ['cobweb-study', 'cobweb', 34, 13, false],
];

/**
 * THE THEATER — two televisions side by side stand in for one big screen, and
 * the seating faces them. Column 39 is the through-route and carries nothing.
 */
const THEATER: Placement[] = [
  ['tv-theater-a', 'television', 37, 13, true],
  ['tv-theater-b', 'television', 41, 13, true],
  ['plant-theater', 'plant', 43, 13, false],
  ['couch-theater-a', 'couch', 35, 15, true],
  ['couch-theater-b', 'couch', 41, 15, true],
  ['cups-theater', 'cups', 35, 17, false],
  ['pizzabox-theater', 'pizzabox', 41, 17, false],
  ['chair-theater-a', 'chair', 35, 19, false],
  ['chair-theater-b', 'chair', 37, 19, false],
  ['chair-theater-c', 'chair', 41, 19, false],
  ['chair-theater-d', 'chair', 43, 19, false],
  ['bunting-theater', 'bunting', 41, 13, false],
  ['painting-theater', 'painting', 43, 12, false],
  ['cobweb-theater', 'cobweb', 45, 13, false],
];

/** THE GAME ROOM — whatever tournament started here stopped having rules. */
const GAME_ROOM: Placement[] = [
  ['tv-game', 'television', 48, 13, true],
  ['bookshelf-game', 'bookshelf', 52, 13, true],
  ['plant-game', 'plant', 54, 13, false],
  ['couch-game', 'couch', 46, 15, true],
  ['table-game', 'table', 52, 15, true],
  ['cups-game', 'cups', 46, 17, false],
  ['pizzabox-game', 'pizzabox', 52, 17, false],
  ['chair-game-a', 'chair', 46, 19, false],
  ['chair-game-b', 'chair', 48, 19, false],
  ['chair-game-c', 'chair', 52, 19, false],
  ['candle-game', 'candle', 54, 19, false],
  ['stringlights-game', 'stringlights', 52, 13, false],
  ['painting-game', 'painting', 47, 12, false],
  ['cobweb-game', 'cobweb', 45, 15, false],
];

/** THE BACK LANDING — a corridor, so everything hugs the wall it came from. */
const BACK_LANDING: Placement[] = [
  ['bookshelf-landing-a', 'bookshelf', 3, 22, true],
  ['plant-landing-a', 'plant', 15, 22, false],
  ['cups-landing', 'cups', 21, 22, false],
  ['candle-landing', 'candle', 31, 22, false],
  ['plant-landing-b', 'plant', 46, 22, false],
  ['bookshelf-landing-b', 'bookshelf', 54, 22, true],
  ['bunting-landing', 'bunting', 25, 22, false],
  ['stringlights-landing', 'stringlights', 47, 22, false],
  ['painting-landing-a', 'painting', 7, 21, false],
  ['painting-landing-b', 'painting', 36, 21, false],
  ['cobweb-landing', 'cobweb', 1, 22, false],
];

/**
 * THE MASTER BEDROOM — the largest room in the house and the one with real
 * consequences attached. Deliberately the least party-like thing on the map.
 */
const MASTER: Placement[] = [
  ['bed-master', 'bed', 3, 25, true],
  ['bookshelf-master', 'bookshelf', 7, 25, true],
  ['tv-master', 'television', 13, 25, true],
  ['plant-master-a', 'plant', 17, 25, false],
  ['couch-master', 'couch', 3, 27, true],
  ['table-master', 'table', 15, 27, true],
  ['cups-master', 'cups', 3, 29, false],
  ['candle-master', 'candle', 17, 29, false],
  ['plant-master-b', 'plant', 1, 31, false],
  ['chair-master', 'chair', 5, 31, false],
  ['bookshelf-master-b', 'bookshelf', 13, 31, true],
  ['pizzabox-master', 'pizzabox', 17, 31, false],
  // Moved off column 11 to clear the back wall for the surveillance desk.
  ['bunting-master', 'bunting', 15, 25, false],
  ['painting-master-a', 'painting', 5, 24, false],
  ['painting-master-b', 'painting', 15, 24, false],
  ['cobweb-master', 'cobweb', 19, 25, false],
];

const GUEST_ONE: Placement[] = [
  ['bed-g1', 'bed', 20, 25, true],
  ['bookshelf-g1', 'bookshelf', 26, 25, true],
  ['plant-g1', 'plant', 28, 25, false],
  ['chair-g1', 'chair', 20, 27, false],
  ['cups-g1', 'cups', 28, 27, false],
  ['candle-g1', 'candle', 20, 29, false],
  ['pizzabox-g1', 'pizzabox', 28, 29, false],
  ['plant-g1-b', 'plant', 20, 31, false],
  ['chair-g1-b', 'chair', 26, 31, false],
  ['balloon-g1', 'balloon', 26, 25, false],
  ['painting-g1', 'painting', 21, 24, false],
  ['cobweb-g1', 'cobweb', 19, 27, false],
];

const GUEST_TWO: Placement[] = [
  ['bed-g2', 'bed', 30, 25, true],
  ['bookshelf-g2', 'bookshelf', 36, 25, true],
  ['plant-g2', 'plant', 38, 25, false],
  ['chair-g2', 'chair', 30, 27, false],
  ['cups-g2', 'cups', 38, 27, false],
  ['candle-g2', 'candle', 30, 29, false],
  ['pizzabox-g2', 'pizzabox', 38, 29, false],
  ['plant-g2-b', 'plant', 30, 31, false],
  ['chair-g2-b', 'chair', 36, 31, false],
  ['balloon-g2', 'balloon', 36, 25, false],
  ['painting-g2', 'painting', 31, 24, false],
  ['cobweb-g2', 'cobweb', 29, 27, false],
];

const GUEST_THREE: Placement[] = [
  ['bed-g3', 'bed', 40, 25, true],
  ['plant-g3', 'plant', 46, 25, false],
  ['chair-g3', 'chair', 40, 27, false],
  ['cups-g3', 'cups', 46, 27, false],
  ['candle-g3', 'candle', 40, 29, false],
  ['bookshelf-g3', 'bookshelf', 40, 31, true],
  ['pizzabox-g3', 'pizzabox', 46, 31, false],
  ['painting-g3', 'painting', 41, 24, false],
  ['cobweb-g3', 'cobweb', 39, 27, false],
];

const BATHROOM: Placement[] = [
  ['toilet', 'toilet', 48, 25, true],
  ['sink-bath', 'sink', 52, 25, true],
  ['cups-bath', 'cups', 48, 27, false],
  ['plant-bath', 'plant', 54, 27, false],
  ['candle-bath', 'candle', 48, 29, false],
  ['pizzabox-bath', 'pizzabox', 52, 29, false],
  ['plant-bath-b', 'plant', 48, 31, false],
  ['cups-bath-b', 'cups', 54, 31, false],
  ['painting-bath', 'painting', 49, 24, false],
  ['cobweb-bath', 'cobweb', 55, 25, false],
];

/**
 * THE BASEMENT — the walkout is at (12,39), so column 12 stays clear all the
 * way down. It is the exit nobody is watching and it should stay usable.
 */
const BASEMENT: Placement[] = [
  ['counter-base-a', 'counter', 3, 34, true],
  ['bookshelf-base-a', 'bookshelf', 7, 34, true],
  ['keg-base', 'keg', 15, 34, true],
  ['counter-base-b', 'counter', 19, 34, true],
  ['table-base', 'table', 3, 36, true],
  ['cups-base', 'cups', 9, 36, false],
  ['pizzabox-base', 'pizzabox', 17, 36, false],
  ['candle-base', 'candle', 23, 36, false],
  ['plant-base-a', 'plant', 1, 38, false],
  ['chair-base-a', 'chair', 5, 38, false],
  ['cups-base-b', 'cups', 9, 38, false],
  ['chair-base-b', 'chair', 15, 38, false],
  ['plant-base-b', 'plant', 23, 38, false],
  ['painting-base-a', 'painting', 5, 33, false],
  ['painting-base-b', 'painting', 17, 33, false],
  ['cobweb-base', 'cobweb', 25, 34, false],
];

/** THE REC ROOM — half a recording studio. The booth still works. */
const REC_ROOM: Placement[] = [
  ['counter-rec-a', 'counter', 28, 34, true],
  ['bookshelf-rec', 'bookshelf', 32, 34, true],
  ['tv-rec', 'television', 36, 34, true],
  ['counter-rec-b', 'counter', 40, 34, true],
  ['table-rec', 'table', 28, 36, true],
  ['cups-rec', 'cups', 34, 36, false],
  ['pizzabox-rec', 'pizzabox', 40, 36, false],
  ['plant-rec-b', 'plant', 26, 38, false],
  ['chair-rec-a', 'chair', 30, 38, false],
  ['chair-rec-b', 'chair', 34, 38, false],
  ['plant-rec-c', 'plant', 44, 38, false],
  ['stringlights-rec', 'stringlights', 36, 34, false],
  ['painting-rec-a', 'painting', 30, 33, false],
  ['painting-rec-b', 'painting', 38, 33, false],
  ['cobweb-rec', 'cobweb', 25, 38, false],
];

/**
 * SEAN'S CRIB — somebody actually lives down here. Furnished like a room that
 * is lived in rather than partied in, which is most of the joke.
 */
const SEANS_CRIB: Placement[] = [
  ['bed-sean', 'bed', 46, 34, true],
  ['tv-sean', 'television', 50, 34, true],
  ['bookshelf-sean', 'bookshelf', 54, 34, true],
  ['cups-sean', 'cups', 48, 36, false],
  ['pizzabox-sean', 'pizzabox', 52, 36, false],
  ['plant-sean', 'plant', 46, 38, false],
  ['chair-sean', 'chair', 50, 38, false],
  ['candle-sean', 'candle', 54, 38, false],
  ['painting-sean', 'painting', 48, 33, false],
  ['cobweb-sean', 'cobweb', 45, 34, false],
];

const DECOR: Placement[] = [
  ...RUGS,
  ...LOUNGE,
  ...FOYER,
  ...DINING,
  ...KITCHEN,
  ...BALLROOM,
  ...MAIN_HALL,
  ...STUDY,
  ...THEATER,
  ...GAME_ROOM,
  ...BACK_LANDING,
  ...MASTER,
  ...GUEST_ONE,
  ...GUEST_TWO,
  ...GUEST_THREE,
  ...BATHROOM,
  ...BASEMENT,
  ...REC_ROOM,
  ...SEANS_CRIB,
];

export function createInitialDecor(): Decor[] {
  return DECOR.map(([id, art, x, y, blocking]) => ({
    id: `decor-${id}`,
    art,
    ...inside(x, y),
    blocking,
  }));
}

/**
 * Five guests, scattered so no single lure reaches everyone. Each has a
 * different hidden lure and a different amount of time left before they turn —
 * the player does not get to see `hiddenLure`.
 *
 * A house this size wants far more people in it than five; that is its own
 * pass, and every new guest needs a palette, a dossier and their own lines
 * before they are worth adding.
 */
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
    ['gary', 'Gary', 8, 16, 1, 'bass', 10, false],
    ['denise', 'Denise', 47, 4, 0, 'food', 0, false],
    ['moss', 'Moss', 29, 19, 2, 'quiet', 35, false],
    ['priya', 'Priya', 25, 3, 0, 'light', 5, false],
    ['benno', 'Benno', 49, 4, 1, 'food', 20, true],
    ['roz', 'Roz', 26, 7, 0, 'light', 8, false],
    ['teddy', 'Teddy', 45, 4, 1, 'food', 12, true],
    ['nadia', 'Nadia', 4, 15, 1, 'bass', 18, false],
    ['colm', 'Colm', 34, 27, 0, 'quiet', 2, false],
    ['yusuf', 'Yusuf', 37, 11, 1, 'quiet', 6, false],
    ['bex', 'Bex', 39, 17, 2, 'light', 25, false],
    ['marlon', 'Marlon', 39, 7, 2, 'food', 30, true],
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

/** The host starts in the middle of the main hall, within reach of both ends. */
export function createHostStart(): { x: number; y: number } {
  return inside(27, 10);
}
