import type { Snack } from './actions';
import type { Position } from './state';
import {
  isWalkable,
  tileAt,
  type Decor,
  type Grid,
  type Guest,
  type Interactable,
  type LureType,
  type MutationStage,
  type Tile,
} from '../types/game';

/**
 * PHASE 3 — the Entity Phase.
 *
 * Guests are independent agents, not scripted events. Each one reads the board
 * the player just produced, decides where it wants to be, and takes one step.
 * Nobody is told where to go; they are told what they want, and the house
 * decides how far they get.
 *
 * Movement is resolved simultaneously: every guest picks its intent against the
 * SAME pre-move snapshot, then the moves are applied together. Evaluating them
 * one at a time would let the first guest's move change what the second one
 * sees, which turns a simultaneous phase into a turn order.
 */

export function key(x: number, y: number): string {
  return `${x},${y}`;
}

/** Orthogonal steps only — the house is drawn on a square grid, not a diagonal one. */
const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export type Blocker = (x: number, y: number) => boolean;

/**
 * Breadth-first distance from any of `sources`, over tiles a guest could stand
 * on. Multi-source, so "distance to the nearest snack" costs one sweep no
 * matter how many snacks are on the floor.
 *
 * A field rather than a path, because guests only ever take one step: they need
 * to know which neighbour is closer, not the whole route. It also means walls
 * are handled for free — a tile behind a wall simply never gets a distance, so
 * a guest will not walk into the wall trying to reach it.
 */
export function distanceField(
  grid: Grid,
  blocked: Blocker,
  sources: readonly Position[],
): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: Position[] = [];

  for (const source of sources) {
    const k = key(source.x, source.y);
    if (dist.has(k)) continue;
    dist.set(k, 0);
    queue.push(source);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const at = queue[head];
    if (!at) continue;
    const here = dist.get(key(at.x, at.y)) ?? 0;

    for (const [dx, dy] of STEPS) {
      const nx = at.x + dx;
      const ny = at.y + dy;
      const nk = key(nx, ny);
      if (dist.has(nk)) continue;
      if (!tileAt(grid, nx, ny)) continue;
      if (blocked(nx, ny)) continue;

      dist.set(nk, here + 1);
      queue.push({ x: nx, y: ny });
    }
  }

  return dist;
}

/** Deterministic 0..1 from a guest and a turn, so a replay looks the same. */
function roll(seed: string, turn: number): number {
  let h = turn * 2654435761;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 1597334677);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------- what pulls */

export interface BoardSignals {
  /** Where each lure type is currently being broadcast from. */
  lures: Record<LureType, Position[]>;
  /** Sources of noise, which the quiet-seeking flee rather than approach. */
  noise: Position[];
  /** Every kitchen tile — the default destination once a guest starts raiding. */
  kitchen: Position[];
  /** The street, which is where a guest who is already outside heads next. */
  street: Position[];
}

export function readBoard(
  grid: Grid,
  interactables: readonly Interactable[],
  snacks: readonly Snack[],
): BoardSignals {
  const lures: Record<LureType, Position[]> = { bass: [], food: [], light: [], quiet: [] };
  const noise: Position[] = [];
  const kitchen: Position[] = [];
  const street: Position[] = [];

  for (const item of interactables) {
    if (item.state !== 'on') continue;
    const at = { x: item.x, y: item.y };
    if (item.type === 'speaker') {
      lures.bass.push(at);
      noise.push(at);
    } else if (item.type === 'fridge') {
      lures.food.push(at);
    } else if (item.type === 'lamp' || item.type === 'pc') {
      // A monitor is a light. That is the whole trap of the surveillance room:
      // the machine that finds people also calls them.
      lures.light.push(at);
    }
  }

  // Food on the floor pulls exactly like an open fridge does.
  for (const snack of snacks) lures.food.push({ x: snack.x, y: snack.y });

  for (const row of grid) {
    for (const tile of row) {
      if (tile.kind === 'kitchen') kitchen.push({ x: tile.x, y: tile.y });
      else if (tile.kind === 'street') street.push({ x: tile.x, y: tile.y });
    }
  }

  return { lures, noise, kitchen, street };
}

/* ---------------------------------------------------------------- intents */

export type MoveReason = 'lure' | 'flee' | 'raid' | 'wander' | 'hold' | 'leave' | 'depart';

export interface GuestIntent {
  guestId: string;
  to: Position;
  reason: MoveReason;
  /** True when the guest walks off the lot entirely this turn. */
  departs: boolean;
}

/** Stage 2 and up stop mingling and start hunting the pantry. */
const RAIDING_STAGE: MutationStage = 2;

/** Walkable neighbours of a tile, in a fixed order. */
function neighbourhood(grid: Grid, blocked: Blocker, at: Position): Position[] {
  const out: Position[] = [];
  for (const [dx, dy] of STEPS) {
    const nx = at.x + dx;
    const ny = at.y + dy;
    if (!tileAt(grid, nx, ny)) continue;
    if (blocked(nx, ny)) continue;
    out.push({ x: nx, y: ny });
  }
  return out;
}

/** The neighbour that moves furthest down (or up) a distance field. */
function stepAlong(
  grid: Grid,
  blocked: Blocker,
  at: Position,
  field: Map<string, number>,
  direction: 'toward' | 'away',
): Position | null {
  const here = field.get(key(at.x, at.y));
  let best: Position | null = null;
  let bestScore = here ?? (direction === 'toward' ? Number.POSITIVE_INFINITY : -1);

  for (const next of neighbourhood(grid, blocked, at)) {
    const score = field.get(key(next.x, next.y));
    if (score === undefined) continue;
    if (direction === 'toward' ? score < bestScore : score > bestScore) {
      bestScore = score;
      best = next;
    }
  }

  return best;
}

/**
 * Decides where every guest wants to be, all against the same snapshot.
 *
 * Priority, highest first:
 *   1. Already outside — head for the street and be gone.
 *   2. Their own hidden lure is live — walk to it. (Quiet-seekers instead walk
 *      away from noise, since "quiet" is an absence, not a place.)
 *   3. Far enough gone to raid — head for the kitchen.
 *   4. Otherwise mill about.
 */
export function planGuestMoves(
  grid: Grid,
  decor: readonly Decor[],
  guests: readonly Guest[],
  signals: BoardSignals,
  lockedDoors: readonly string[],
  host: Position,
  turn: number,
): GuestIntent[] {
  const locked = new Set(lockedDoors);
  const occupied = new Set(guests.map((guest) => key(guest.x, guest.y)));

  /** Terrain, furniture, bolted doors, and the host all stop a guest. */
  const blocked: Blocker = (x, y) => {
    if (!isWalkable(grid, decor, x, y)) return true;
    if (locked.has(key(x, y))) return true;
    if (host.x === x && host.y === y) return true;
    return false;
  };

  /** Same, but ignoring the guest doing the asking so it can leave its own tile. */
  const blockedFor = (self: Guest): Blocker => {
    return (x, y) => {
      if (blocked(x, y)) return true;
      const k = key(x, y);
      return occupied.has(k) && !(self.x === x && self.y === y);
    };
  };

  // Fields shared by every guest that wants the same thing.
  const fieldCache = new Map<string, Map<string, number>>();
  const fieldFor = (name: string, sources: readonly Position[]): Map<string, number> => {
    const cached = fieldCache.get(name);
    if (cached) return cached;
    const built = distanceField(grid, blocked, sources);
    fieldCache.set(name, built);
    return built;
  };

  const intents: GuestIntent[] = [];

  for (const guest of guests) {
    const at: Position = { x: guest.x, y: guest.y };
    const tile: Tile | undefined = tileAt(grid, guest.x, guest.y);
    const mine = blockedFor(guest);

    // 1. Outside already. Make for the road; if you are on it, you are gone.
    if (tile && (tile.kind === 'yard' || tile.kind === 'path' || tile.kind === 'street')) {
      if (tile.kind === 'street') {
        intents.push({ guestId: guest.id, to: at, reason: 'depart', departs: true });
        continue;
      }
      const next = stepAlong(grid, mine, at, fieldFor('street', signals.street), 'toward');
      intents.push({
        guestId: guest.id,
        to: next ?? at,
        reason: 'leave',
        departs: false,
      });
      continue;
    }

    // 2. Their own lure.
    if (guest.hiddenLure === 'quiet') {
      if (signals.noise.length > 0) {
        const next = stepAlong(grid, mine, at, fieldFor('noise', signals.noise), 'away');
        if (next) {
          intents.push({ guestId: guest.id, to: next, reason: 'flee', departs: false });
          continue;
        }
      }
    } else {
      const sources = signals.lures[guest.hiddenLure];
      if (sources.length > 0) {
        const next = stepAlong(
          grid,
          mine,
          at,
          fieldFor(guest.hiddenLure, sources),
          'toward',
        );
        if (next) {
          intents.push({ guestId: guest.id, to: next, reason: 'lure', departs: false });
          continue;
        }
      }
    }

    // 3. Off to the kitchen — either far enough gone to go foraging, or one of
    //    the people who was always going to end up in there anyway.
    if ((guest.hungry || guest.mutationStage >= RAIDING_STAGE) && signals.kitchen.length > 0) {
      const next = stepAlong(grid, mine, at, fieldFor('kitchen', signals.kitchen), 'toward');
      if (next) {
        intents.push({ guestId: guest.id, to: next, reason: 'raid', departs: false });
        continue;
      }
    }

    // 4. Mill about. Higher agitation means less standing still.
    const options = neighbourhood(grid, mine, at);
    const restlessness = 0.35 + guest.agitationLevel / 200;
    if (options.length > 0 && roll(guest.id, turn) < restlessness) {
      const pick = options[Math.floor(roll(`${guest.id}:where`, turn) * options.length)];
      intents.push({ guestId: guest.id, to: pick ?? at, reason: 'wander', departs: false });
    } else {
      intents.push({ guestId: guest.id, to: at, reason: 'hold', departs: false });
    }
  }

  return intents;
}

/**
 * Applies every intent at once, settling the collisions that simultaneous
 * movement creates: two guests cannot claim the same tile, and whoever is
 * evaluated second stays put rather than overlapping.
 */
export function applyIntents(
  guests: readonly Guest[],
  intents: readonly GuestIntent[],
): { moved: Guest[]; departed: Guest[] } {
  const claimed = new Set<string>();
  const moved: Guest[] = [];
  const departed: Guest[] = [];

  // Anyone holding position keeps their tile, so movers cannot displace them.
  for (const guest of guests) {
    const intent = intents.find((candidate) => candidate.guestId === guest.id);
    if (!intent || intent.departs) continue;
    if (intent.to.x === guest.x && intent.to.y === guest.y) claimed.add(key(guest.x, guest.y));
  }

  for (const guest of guests) {
    const intent = intents.find((candidate) => candidate.guestId === guest.id);

    if (intent?.departs) {
      departed.push(guest);
      continue;
    }

    if (!intent) {
      claimed.add(key(guest.x, guest.y));
      moved.push(guest);
      continue;
    }

    const target = key(intent.to.x, intent.to.y);
    const staying = intent.to.x === guest.x && intent.to.y === guest.y;

    if (!staying && claimed.has(target)) {
      claimed.add(key(guest.x, guest.y));
      moved.push(guest);
      continue;
    }

    claimed.add(target);
    moved.push({ ...guest, x: intent.to.x, y: intent.to.y });
  }

  return { moved, departed };
}
