import type { GuestIntent, MoveReason } from './ai';
import { narrativeNameAt } from '../data/rooms';
import { tileAt, type Grid, type Guest } from '../types/game';

/**
 * The text log's voice.
 *
 * Every line names a person and says what they did in a room you can point at,
 * because the log is the only place the player learns what a guest wants. If a
 * line cannot be traced back to a tile on the board, it is not doing its job.
 *
 * Phase 4 adds the consequence lines — property damage, the meter climbing, the
 * neighbours. These are the movement lines those will be interleaved with.
 */

const PHRASES: Record<MoveReason, readonly string[]> = {
  lure: [
    '{name} drifted toward {room}.',
    '{name} followed something into {room}.',
    '{name} made a beeline for {room}.',
  ],
  flee: [
    '{name} backed away from the racket, into {room}.',
    '{name} covered their ears and retreated to {room}.',
    '{name} went looking for somewhere quieter. They settled for {room}.',
  ],
  raid: [
    '{name} shuffled toward the kitchen. Through {room}.',
    '{name} is hunting for food. They got as far as {room}.',
    '{name} smelled something and started moving. They are in {room} now.',
  ],
  wander: [
    '{name} wandered into {room}.',
    '{name} drifted through {room}, looking at nothing.',
    '{name} took a lap. They are in {room} now.',
  ],
  hold: [
    '{name} has not moved in some time.',
    '{name} stayed exactly where they were.',
    '{name} is still standing in {room}. Still.',
  ],
  leave: [
    '{name} is out on {room}. Almost.',
    '{name} stumbled onto {room}.',
    '{name} made it as far as {room}. Keep going.',
  ],
  depart: [
    '{name} let themselves out. That is one.',
    '{name} wandered off down the street. Gone.',
    '{name} is somebody else’s problem now.',
  ],
};

/** Deterministic phrase choice, so the same turn always reads the same way. */
function pick(options: readonly string[], seed: string, turn: number): string {
  let h = turn * 374761393;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 668265263);
  const index = ((h ^ (h >>> 13)) >>> 0) % options.length;
  return options[index] ?? options[0] ?? '';
}

/** Arriving at the pantry deserves different words than trudging toward it. */
const ARRIVED_RAIDING: readonly string[] = [
  '{name} reached the kitchen and started going through the cupboards.',
  '{name} is in the kitchen now, and the kitchen is not ready for it.',
  '{name} found the kitchen. That was the fear.',
];

export function describeMove(
  guest: Guest,
  intent: GuestIntent,
  grid: Grid,
  turn: number,
): string {
  const tile = tileAt(grid, intent.to.x, intent.to.y);
  const room = narrativeNameAt(grid, intent.to.x, intent.to.y);

  // 'Shuffled toward the kitchen. Through the kitchen.' reads as a bug even
  // though it is not, so arrival gets its own line.
  const phrases =
    intent.reason === 'raid' && tile?.kind === 'kitchen' ? ARRIVED_RAIDING : PHRASES[intent.reason];

  return pick(phrases, guest.id, turn)
    .replace('{name}', guest.name)
    .replace('{room}', room);
}

/**
 * Somebody in a room they should not be in.
 *
 * These lines are pitched harder than the rest of the log on purpose. The
 * movement narration is dry and observational; this is the one thing the house
 * wants the player to look up at, so it names the person, names the room, and
 * says what it is costing.
 */
const INTRUSION: readonly string[] = [
  '{name} is in {room}. Going through it.',
  '{name} has found {room}. Drawers are open.',
  'Something falls over in {room}. {name} is in there.',
  '{name} is in {room} and has stopped pretending not to be.',
  'You can hear {name} in {room}. That is not a party noise.',
];

export function describeIntrusion(guest: Guest, room: string, turn: number): string {
  return pick(INTRUSION, guest.id, turn).replace('{name}', guest.name).replace('{room}', room);
}

/**
 * What the cameras got.
 *
 * The reveal is written as an OBSERVATION, never as a readout — you watched
 * somebody cross the same feed three times and worked out what they were
 * walking toward. The tell comes from LURE_META so the log and the inspector
 * always agree about what was learned.
 *
 * Room names arrive with their own article — "The Ballroom", "Guest Room One",
 * "Sean's Crib" — so no template here may add one. Two of these read "the The
 * Ballroom" until a distribution check over the whole cast caught it.
 */
const SURVEILLANCE: readonly string[] = [
  'Camera on {room}. {name} again, same corner, same walk. {hint}',
  'You run {room} back twice. {name} is not wandering — {name} is going somewhere. {hint}',
  '{name} crosses the same feed for the third time in an hour. {room}, again. {hint}',
  '{room}, camera two: {name} doubling back. Now it is obvious. {hint}',
  'You watch {name} in {room} until it stops looking random. {hint}',
];

export function describeProfile(guest: Guest, room: string, hint: string, turn: number): string {
  return pick(SURVEILLANCE, guest.id, turn)
    .replaceAll('{name}', guest.name)
    .replace('{room}', room)
    .replace('{hint}', hint);
}

/** The feeds are up but there is nothing on them worth the ten minutes. */
export function describeEmptyFeed(): string {
  return 'You sit through every feed. Nothing you did not already know.';
}

/** Announces a guest crossing into a new mutation stage. */
export function describeMutation(guest: Guest, label: string): string {
  return `${guest.name} is getting worse. ${label}.`;
}
