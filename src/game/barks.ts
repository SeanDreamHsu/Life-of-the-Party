import { adjacentOnFloor, floorAt, floorPoint } from '../data/floors';
import type { GuestIntent } from './ai';
import { AMBIENT, CAST, pickIndex, type AmbientContext, type BarkTrigger } from './cast';
import type { Position } from './state';
import type { Guest } from '../types/game';

/**
 * WHO SPEAKS, AND WHEN
 *
 * Five people all talking every hour is noise, not character. So: anything
 * dramatic (being shoved, turning, leaving) always gets said, and from whatever
 * is left only a couple of people speak, rotating by turn so nobody goes quiet
 * for long. A room where two people say something specific reads far more alive
 * than one where five people say something generic.
 */

/** Triggers loud enough that the guest always gets the line. */
const ALWAYS_SPEAKS: readonly BarkTrigger[] = ['shoved', 'nudged', 'mutate', 'gone', 'leaving'];

/** How many of the remaining guests get a line in a normal hour. */
const CHATTER_LIMIT = 2;

export interface BarkInput {
  guests: readonly Guest[];
  intents: readonly GuestIntent[];
  /** Guests the host physically handled this hour. */
  nudged: ReadonlySet<string>;
  shoved: ReadonlySet<string>;
  /** Guests who crossed into a new mutation stage this hour. */
  mutated: ReadonlySet<string>;
  turn: number;
}

export interface Bark {
  guestId: string;
  text: string;
}

function triggerFor(guest: Guest, intent: GuestIntent | undefined, input: BarkInput): BarkTrigger {
  if (input.shoved.has(guest.id)) return 'shoved';
  if (input.nudged.has(guest.id)) return 'nudged';
  if (input.mutated.has(guest.id)) return 'mutate';
  if (intent?.reason === 'depart') return 'gone';
  if (intent?.reason === 'leave') return 'leaving';
  if (intent?.reason === 'flee') return 'flee';
  if (guest.dancing) return 'dancing';
  if (intent?.reason === 'lure') return 'lured';
  if (intent?.reason === 'raid') return 'raid';
  return 'idle';
}

/**
 * A line about the person standing next to them, when there is one and the
 * hour is otherwise uneventful. These are the lines that imply the five of them
 * knew each other before you started counting hours.
 */
function relationshipLine(guest: Guest, guests: readonly Guest[], turn: number): string | null {
  const profile = CAST[guest.id];
  if (!profile?.aboutOthers) return null;

  for (const other of guests) {
    if (other.id === guest.id) continue;
    if (!adjacentOnFloor(other, guest)) continue;

    const lines = profile.aboutOthers[other.id];
    if (!lines || lines.length === 0) continue;
    return lines[pickIndex(`${guest.id}:${other.id}`, turn, lines.length)] ?? null;
  }

  return null;
}

function lineFor(guest: Guest, trigger: BarkTrigger, turn: number): string | null {
  const profile = CAST[guest.id];
  const lines = profile?.lines[trigger];
  if (!lines || lines.length === 0) return null;
  return lines[pickIndex(`${guest.id}:${trigger}`, turn, lines.length)] ?? null;
}

export function collectBarks(input: BarkInput): Bark[] {
  const { guests, intents, turn } = input;

  const candidates = guests.map((guest) => {
    const intent = intents.find((i) => i.guestId === guest.id);
    const trigger = triggerFor(guest, intent, input);
    // Relationship lines only get a look-in on an otherwise idle hour.
    const text =
      (trigger === 'idle' ? relationshipLine(guest, guests, turn) : null) ??
      lineFor(guest, trigger, turn);
    return { guest, trigger, text };
  });

  const barks: Bark[] = [];
  const quiet: typeof candidates = [];

  for (const candidate of candidates) {
    if (!candidate.text) continue;
    if (ALWAYS_SPEAKS.includes(candidate.trigger)) {
      barks.push({ guestId: candidate.guest.id, text: candidate.text });
    } else {
      quiet.push(candidate);
    }
  }

  // Rotate through the rest so the same two people are not always the talkative
  // ones. Offsetting by the turn means everyone comes round eventually.
  const offset = quiet.length > 0 ? turn % quiet.length : 0;
  for (let i = 0; i < Math.min(CHATTER_LIMIT, quiet.length); i += 1) {
    const candidate = quiet[(offset + i) % quiet.length];
    if (candidate?.text) barks.push({ guestId: candidate.guest.id, text: candidate.text });
  }

  return barks;
}

/** A line from the house itself, so a quiet hour is never actually silent. */
export function ambientLine(context: AmbientContext): string | null {
  // Roughly every third hour; often enough to feel lived-in, rare enough to land.
  if (pickIndex('ambient:gate', context.turn, 3) !== 0) return null;

  const eligible = AMBIENT.filter((event) => !event.when || event.when(context));
  if (eligible.length === 0) return null;

  return eligible[pickIndex('ambient', context.turn, eligible.length)]?.text ?? null;
}

/** Hours spent near the host. You learn about people by being around them. */
export function familiarityGain(guest: Guest, host: Position): number {
  if (floorAt(guest.x, guest.y) !== floorAt(host.x, host.y)) return 0;
  const a = floorPoint(guest), b = floorPoint(host);
  const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  if (distance <= 3) return 3;
  if (distance <= 7) return 1;
  return 0;
}
