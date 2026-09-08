import type { EmoteId } from '../art/sprites/emotes';
import type { PropId } from '../art/sprites/catalog';

/**
 * Core domain types for "Life of the Party".
 *
 * GRID CONVENTION
 * The board is indexed `grid[y][x]` — `y` is the row (0 = street side, at the
 * top of the screen), `x` is the column (0 = left). Entities carry their own
 * `x`/`y` rather than living inside the tile array, so the render layer can
 * position and animate sprites independently of the terrain beneath them.
 * That split matters in Phase 3, when guests need to slide between tiles
 * simultaneously during the Resolution Phase.
 */

/* ------------------------------------------------------------------ tiles */

/**
 * What a tile *is*, semantically. `isPassable` alone cannot distinguish the
 * front lawn from the living room floor, but the win condition ("usher guests
 * out of the home") and the Suspicion Meter ("guests lingering visibly in the
 * front yard") both need that distinction — so terrain carries a `kind`.
 *
 * The room kinds also pick the floor material, which is what stops the board
 * reading as one undifferentiated grid: boards in the living areas, tile in
 * the kitchen and bathroom, carpet in the bedroom.
 */
export type TileKind =
  | 'yard'
  | 'path'
  | 'street'
  | 'wall'
  | 'door'
  | 'living'
  | 'entry'
  | 'hall'
  | 'kitchen'
  | 'bedroom'
  | 'bathroom'
  | 'den'
  | 'garage';

/** Human-readable room names, used by the inspector and the log in Phase 4. */
export const TILE_LABEL: Record<TileKind, string> = {
  yard: 'Lawn',
  path: 'Concrete',
  street: 'Street',
  wall: 'Wall',
  door: 'Doorway',
  living: 'Living Room',
  entry: 'Entry Hall',
  hall: 'Hallway',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  den: 'Den',
  garage: 'Garage',
};

export interface Tile {
  x: number;
  y: number;
  /** Whether an entity may occupy this tile. Walls are the only hard block. */
  isPassable: boolean;
  /** A threshold guests can cross. Doors can later be locked to seal a route. */
  hasDoor: boolean;
  kind: TileKind;
}

/** The terrain array. Row-major: `Grid[y][x]`. */
export type Grid = Tile[][];

/** Tiles that count as "outside the house" for win/suspicion checks. */
export const OUTDOOR_KINDS: readonly TileKind[] = ['yard', 'path', 'street'];

/* ------------------------------------------------------------------ decor */

/**
 * Furniture that dresses the house but takes no player input — a couch, a bed,
 * the kitchen counters. Most of it blocks movement, which is the point: a room
 * full of furniture forces guests onto walking lanes the player can predict and
 * cut off. Interactive objects live in `Interactable` instead.
 */
export interface Decor {
  id: string;
  art: PropId;
  x: number;
  y: number;
  /** Whether a guest may walk over this tile. */
  blocking: boolean;
}

/* ----------------------------------------------------------------- guests */

/**
 * How far gone a guest is. Advances passively on the Mutation Timer and
 * re-weights the guest's AI priorities — stage 0 wanders politely, stage 3
 * pathfinds toward whatever it can break.
 */
export type MutationStage = 0 | 1 | 2 | 3;

/**
 * The stimulus a guest is secretly drawn to. Hidden from the player at spawn;
 * deduced through trial and error by watching who moves toward what.
 */
export type LureType = 'bass' | 'food' | 'light' | 'quiet';

export interface Guest {
  id: string;
  /** Shown in the Phase 4 text log — "Gary shuffled toward the garage." */
  name: string;
  x: number;
  y: number;
  mutationStage: MutationStage;
  hiddenLure: LureType;
  /** 0–100. Rises when pushed or mis-lured; high values cause property damage. */
  agitationLevel: number;
  /**
   * Some people simply live in the kitchen.
   *
   * Everybody heads that way once they have mutated far enough, but a hungry
   * guest drifts toward it from the moment they arrive, whatever else is
   * playing. It outranks wandering and is outranked by their own lure — so
   * they can still be steered, they just default to the fridge.
   */
  hungry: boolean;

  /* --- presentation state, recomputed every resolution --- */

  /** Which way they last moved. The sprite mirrors to match. */
  facing: 1 | -1;
  /**
   * The bubble over their head. Deliberately expresses FEELING, never the
   * hidden lure — 'content' is legal, 'wants bass' would end the deduction.
   */
  mood: EmoteId | null;
  /** Near live music. Anyone dances near a speaker, whatever they secretly want. */
  dancing: boolean;
  /** What they said this hour, if anything. Shown as a speech bubble. */
  saying: string | null;
  /** Hours spent near you. Unlocks their dossier a line at a time. */
  familiarity: number;
  /**
   * Whether the cameras have caught this one on a feed long enough to say what
   * they are after. Permanent once earned, and the ONLY in-game way to see a
   * hidden lure — the "Secrets" button is a developer switch, not a mechanic.
   */
  profiled: boolean;
}

/* ---------------------------------------------------- interactable objects */

export type InteractableType = 'speaker' | 'fridge' | 'lamp' | 'pc';

/**
 * Interactables are binary for now. A speaker is playing or silent; a fridge
 * is open or shut. Keeping one shared union (rather than a per-type shape)
 * means the Phase 2 action menu can toggle anything without narrowing first.
 */
export type InteractableState = 'on' | 'off';

export interface Interactable {
  id: string;
  type: InteractableType;
  x: number;
  y: number;
  state: InteractableState;
}

/* --------------------------------------------------------------- metadata */

/** Presentation + behaviour data for each mutation stage. */
export interface MutationMeta {
  label: string;
  /** Tailwind ring colour, escalating with the stage. */
  ringClass: string;
}

export const MUTATION_META: Record<MutationStage, MutationMeta> = {
  0: { label: 'Merely Tipsy', ringClass: 'ring-emerald-400' },
  1: { label: 'Rough Shape', ringClass: 'ring-amber-400' },
  2: { label: 'Mutating', ringClass: 'ring-orange-500' },
  3: { label: 'Feral', ringClass: 'ring-rose-500' },
};

export interface LureMeta {
  label: string;

  /** Flavour shown once the player has deduced this lure. */
  hint: string;
}

export const LURE_META: Record<LureType, LureMeta> = {
  bass: { label: 'Heavy Bass', hint: 'Follows the low end.' },
  food: { label: 'Leftovers', hint: 'Follows the smell.' },
  light: { label: 'Bright Light', hint: 'Follows anything lit.' },
  quiet: { label: 'Quiet', hint: 'Flees noise entirely.' },
};

export interface InteractableMeta {
  label: string;
  /** Which prop sprite draws this object. */
  art: PropId;
  /** Human-readable name for each state, per object type. */
  stateLabels: Record<InteractableState, string>;
  /** The lure this object broadcasts while switched on. */
  emits: LureType;
}

export const INTERACTABLE_META: Record<InteractableType, InteractableMeta> = {
  speaker: {
    label: 'Speaker',
    art: 'speaker',
    stateLabels: { on: 'Playing', off: 'Silent' },
    emits: 'bass',
  },
  fridge: {
    label: 'Fridge',
    art: 'fridge',
    stateLabels: { on: 'Open', off: 'Shut' },
    emits: 'food',
  },
  lamp: {
    label: 'Lamp',
    art: 'lamp',
    stateLabels: { on: 'Lit', off: 'Dark' },
    emits: 'light',
  },
  // The one interactable you cannot simply flip. See CAMERA_UNLOCK_TASKS.
  //
  // It emits light because a monitor does, and that is not a technicality: the
  // machine that tells you where everyone is lights up the one room you cannot
  // let anyone into. The tool and the hazard are the same object.
  pc: {
    label: 'Surveillance PC',
    art: 'pc',
    stateLabels: { on: 'Feeds live', off: 'Asleep' },
    emits: 'light',
  },
};

/* -------------------------------------------------------------- selectors */

/**
 * Safe tile lookup. Returns `undefined` outside the board so callers are
 * forced to handle the edge — pathfinding in Phase 3 leans on this.
 */
export function tileAt(grid: Grid, x: number, y: number): Tile | undefined {
  return grid[y]?.[x];
}

export function isInsideGrid(grid: Grid, x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

export function isOutdoors(tile: Tile): boolean {
  return OUTDOOR_KINDS.includes(tile.kind);
}

export function guestAt(guests: readonly Guest[], x: number, y: number): Guest | undefined {
  return guests.find((guest) => guest.x === x && guest.y === y);
}

export function interactableAt(
  interactables: readonly Interactable[],
  x: number,
  y: number,
): Interactable | undefined {
  return interactables.find((item) => item.x === x && item.y === y);
}

export function decorAt(decor: readonly Decor[], x: number, y: number): Decor | undefined {
  return decor.find((item) => item.x === x && item.y === y);
}

/**
 * Whether a guest could stand here. Terrain and furniture both block, and the
 * Phase 3 pathfinder needs one answer covering the two — a couch stops a guest
 * just as surely as a wall does.
 */
export function isWalkable(grid: Grid, decor: readonly Decor[], x: number, y: number): boolean {
  const tile = tileAt(grid, x, y);
  if (!tile || !tile.isPassable) return false;
  return decorAt(decor, x, y)?.blocking !== true;
}

/** The four orthogonal neighbours of a tile that exist on the board. */
export function neighbours(grid: Grid, x: number, y: number): Tile[] {
  const steps: readonly [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  return steps
    .map(([dx, dy]) => tileAt(grid, x + dx, y + dy))
    .filter((tile): tile is Tile => tile !== undefined);
}

/** Chebyshev-free adjacency: orthogonally next to, or on, the given tile. */
export function isAdjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) <= 1;
}
