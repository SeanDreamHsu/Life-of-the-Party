import type { FoodId } from '../art/sprites/food';

/**
 * PHASE 2 — the player's turn.
 *
 * Everything the host does is queued rather than applied. The player spends the
 * hour building a plan, can take any of it back, and only on "End the Hour"
 * does the board actually change. That split is the whole point of the design:
 * planning is reversible, resolution is not.
 *
 * ── THE HOUR ─────────────────────────────────────────────────────────────────
 *
 * A turn is not three actions. A turn is SIXTY MINUTES, and everything you do
 * costs some of them.
 *
 * The costs below are meant to be things you can picture taking that long. A
 * tile is about a stride, so movement is priced by the minute — not because
 * walking a metre takes a minute, but because at hour fifty-two you are
 * crossing a packed house and every step invites somebody to start talking to
 * you. Everything else is close to its literal duration: two minutes to reach a
 * switch and flip it, three to find the key and work a bolt, five to go and
 * fetch a plate of something.
 *
 * The one number that carries an opinion is NUDGE. Talking a drunk person into
 * leaving takes eight minutes and shoving them takes four, and that inversion
 * is the game in miniature: the hands-off way is slower, and the fast way is
 * charged for in suspicion and agitation instead of in time.
 *
 * The hour is a soft edge, not a wall. You may BEGIN anything you still have a
 * minute left for — so with two minutes on the clock you can still start an
 * eight-minute conversation, and the six you borrow comes straight out of the
 * next hour. Likewise an hour you underspend banks the remainder forward.
 *
 * That is the whole strategic hinge. A quiet hour spent doing almost nothing
 * buys a long one later; one spent walking the length of the house arrives with
 * nothing left to do when you get there. Meanwhile the mutation timer does not
 * care how you budgeted, which is what stops banking from being free.
 */

/** Minutes an hour nominally grants. Turns are hours; this is the hour. */
export const MINUTES_PER_TURN = 60;

/**
 * How far the ledger may run in each direction between hours.
 *
 * The bank cap is the one that bites: without it, idling four hours and then
 * spending a five-hour turn trivialises the back half of a night.
 *
 * The debt floor is a guard rather than a rule you will meet. Since you can
 * only ever start ONE action past the end of the hour, the worst overdraft
 * reachable today is the priciest action minus a minute — seven. It is kept so
 * that retuning the costs upward later cannot quietly produce an hour with no
 * time in it at all.
 */
export const MAX_BANKED_MINUTES = 60;
export const MAX_BORROWED_MINUTES = 45;

export type ActionKind = 'move' | 'toggle' | 'snack' | 'nudge' | 'shove' | 'door' | 'cameras';

/**
 * How many DISTINCT jobs you have to have done before the surveillance PC will
 * let you in.
 *
 * Two rules, and both were paid for.
 *
 * Steps do not count, or the machine would unlock during the first walk down
 * the hall and the gate would mean nothing.
 *
 * And a job is counted ONCE, per thing done to it. The first version of this
 * counted every deliberate action, which meant standing next to one lamp and
 * flipping it twelve times — twenty-four minutes, no walking — opened the
 * cameras. Keying on the target makes the only way through the gate the
 * intended one: go and deal with twelve different things in the house.
 */
export const CAMERA_UNLOCK_TASKS = 12;

/**
 * The identity of a job, for the unlock ledger. Same verb on the same target is
 * the same job however many times you do it; the same verb somewhere else is a
 * new one.
 */
export function jobKey(action: Pick<QueuedAction, 'kind' | 'targetId' | 'x' | 'y'>): string | null {
  if (action.kind === 'move') return null;
  return `${action.kind}:${action.targetId ?? `${action.x},${action.y}`}`;
}

/**
 * What each action costs in minutes.
 *
 * Movement is cheap per step and expensive in aggregate, which is the whole
 * point: in a house this size, WHERE YOU ARE STANDING when the hour ends is the
 * biggest decision you make. Walking the length of the place is most of an
 * hour, so a plan that ends on the wrong side of it has already spent the next
 * one.
 */
export const ACTION_MINUTES: Record<ActionKind, number> = {
  /** One tile, through a house with a great many people in it. */
  move: 1,
  /** Getting to the switch and flipping it. */
  toggle: 2,
  /** Finding the key, working the bolt, checking it holds. */
  door: 3,
  // Shoving is the only action that can hurt someone — but it is FAST, and that
  // is exactly why it tempts. Its real price is +9 suspicion, +22 agitation and
  // the fail condition hanging off it, not the clock.
  shove: 4,
  /** Going to the kitchen, plating something, carrying it back. */
  snack: 5,
  /** Talking somebody into leaving. Never one sentence, never quick. */
  nudge: 8,
  // The most expensive thing you can do with an hour, which is the point:
  // information costs more than any single act of hosting. You sit down in the
  // back bedroom, work through the feeds, and find one person in them.
  cameras: 10,
};

export interface QueuedAction {
  id: string;
  kind: ActionKind;
  /** Minutes this will consume when the hour resolves. */
  cost: number;
  /** The tile the action is aimed at. */
  x: number;
  y: number;
  /** Sentence shown in the queue, e.g. "Shove Gary". */
  label: string;
  /** Id of the guest or interactable being acted on, when there is one. */
  targetId?: string;
}

/** "25 minutes", "an hour", "1h 10m" — the clock in words, for the HUD. */
export function formatMinutes(total: number): string {
  const sign = total < 0 ? '-' : '';
  const value = Math.abs(total);
  if (value === 0) return 'no time';
  if (value === 60) return `${sign}an hour`;
  if (value < 60) return `${sign}${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${minutes}m`;
}

/** A food lure the host has put down. Drawn from the food sprite set. */
export interface Snack {
  id: string;
  art: FoodId;
  x: number;
  y: number;
}

/** Snacks cycle through the pantry so the board does not fill with one item. */
export const SNACK_ROTATION: readonly FoodId[] = [
  'pizza',
  'nachos',
  'chips',
  'leftovers',
  'cake',
  'soda',
];

/** How much a queued action is expected to raise Suspicion when it resolves. */
export const ACTION_SUSPICION: Record<ActionKind, number> = {
  move: 0,
  toggle: 2,
  snack: 0,
  nudge: 3,
  shove: 9,
  door: 1,
  // Watching is not a party foul. The PC's cost is the walk, the ten minutes
  // and the light it throws into a room nobody may enter.
  cameras: 0,
};

/** How much a guest's agitation moves when the host handles them directly. */
export const ACTION_AGITATION: Record<ActionKind, number> = {
  move: 0,
  toggle: 0,
  snack: -4,
  nudge: 8,
  shove: 22,
  door: 0,
  cameras: 0,
};
