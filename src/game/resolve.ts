import { floorAt, floorPoint } from '../data/floors';
import { applyIntents, planGuestMoves, readBoard, type GuestIntent } from './ai';
import { ambientLine, collectBarks, familiarityGain } from './barks';
import { describeIntrusion, describeMove, describeMutation } from './narrate';
import { roomAt } from '../data/rooms';
import type { Snack } from './actions';
import type { Position } from './state';
import {
  MUTATION_META,
  type Decor,
  type Grid,
  type Guest,
  type Interactable,
  type MutationStage,
} from '../types/game';

/**
 * THE RESOLUTION PHASE
 *
 * Runs after the player's queued changes have already landed, which is the
 * order the design calls for: guests read the board the host just produced,
 * not the one they woke up to. So flipping the speaker on and walking away in
 * the same turn works — the guests hear it during the same resolution.
 */

/** Turns between every guest sliding one stage further gone. */
const MUTATION_EVERY = 6;

/** Agitation at which a guest turns early, regardless of the timer. */
const AGITATION_BREAKING_POINT = 100;

/**
 * What an hour of somebody in a room they should not be in costs you.
 *
 * The base is bad and the multiplier is worse: a merely tipsy guest wandering
 * into your bedroom is embarrassing, a feral one going through it is the thing
 * that ends the night. Scaling on mutation stage gets that escalation without
 * having to track how long each of them has been in there.
 *
 * This is deliberately the sharpest suspicion source in the game. The whole
 * point is that it should change what you do — and the counter-play is already
 * built and cheap: three minutes to bolt the door before anybody finds it.
 */
const INTRUSION_SUSPICION_BASE = 3;
const INTRUSION_SUSPICION_PER_STAGE = 2;

/** Being somewhere forbidden is its own encouragement. */
const INTRUSION_AGITATION = 4;

/** How agitation drifts per turn, by what the guest experienced. */
const AGITATION_DRIFT = {
  /** Got what they wanted. */
  satisfied: -3,
  /** Nothing calling them; just restless. */
  idle: 1,
  /** A lure is running, but not theirs. */
  wrongLure: 2,
  /** Actively driven out of a room by noise. */
  harassed: 4,
} as const;

export interface ResolutionInput {
  grid: Grid;
  decor: readonly Decor[];
  guests: readonly Guest[];
  interactables: readonly Interactable[];
  snacks: readonly Snack[];
  lockedDoors: readonly string[];
  host: Position;
  turn: number;
  /** Guests the host handled this hour, so they can react to it out loud. */
  nudged: ReadonlySet<string>;
  shoved: ReadonlySet<string>;
  suspicion: number;
}

export interface ResolutionResult {
  guests: Guest[];
  /** Guests who walked off the lot this turn. */
  departed: Guest[];
  /**
   * Suspicion earned during resolution rather than by the player's own actions
   * — currently only from guests in rooms they should not be in. Returned
   * rather than applied so the reducer stays the only thing that owns state.
   */
  suspicionAdded: number;
  /** Narration for the log, in the order it happened. */
  log: string[];
  intents: GuestIntent[];
}

function nextStage(stage: MutationStage): MutationStage {
  return (stage < 3 ? stage + 1 : 3) as MutationStage;
}

/**
 * How this turn treated a guest, which is what their agitation responds to.
 * Getting the lure right calms someone down; running the wrong one at them is
 * how a merely tipsy guest ends up putting a foot through the television.
 */
function agitationDelta(intent: GuestIntent | undefined, anyForeignLure: boolean): number {
  if (!intent) return AGITATION_DRIFT.idle;
  if (intent.reason === 'flee') return AGITATION_DRIFT.harassed;
  if (intent.reason === 'lure') return AGITATION_DRIFT.satisfied;
  if (anyForeignLure) return AGITATION_DRIFT.wrongLure;
  return AGITATION_DRIFT.idle;
}

/**
 * The bubble over a guest's head.
 *
 * Strictly about how the turn treated them — never about what they secretly
 * want. A guest who got their lure looks content; one driven out of a room
 * looks alarmed; one nobody has entertained in five turns looks bored. The
 * player reads mood plus movement and infers the lure, which is the game.
 */
function readMood(
  intent: GuestIntent | undefined,
  agitation: number,
  stage: MutationStage,
  dancing: boolean,
): Guest['mood'] {
  if (intent?.reason === 'flee') return 'alert';
  if (agitation >= 70) return 'anger';
  if (dancing) return 'note';
  if (stage >= 3) return 'skull';
  if (intent?.reason === 'lure') return 'heart';
  if (intent?.reason === 'raid') return 'food';
  if (intent?.reason === 'depart' || intent?.reason === 'leave') return 'heart';
  if (agitation >= 40) return 'sweat';
  if (intent?.reason === 'hold') return 'sleep';
  return null;
}

export function resolveTurn(input: ResolutionInput): ResolutionResult {
  const { grid, decor, guests, interactables, snacks, lockedDoors, host, turn } = input;

  const signals = readBoard(grid, interactables, snacks);
  const intents = planGuestMoves(grid, decor, guests, signals, lockedDoors, host, turn);
  const { moved, departed } = applyIntents(guests, intents);

  const log: string[] = [];
  for (const guest of guests) {
    const intent = intents.find((candidate) => candidate.guestId === guest.id);
    if (!intent) continue;
    // Standing still is only worth a line occasionally; otherwise the log fills
    // with five people doing nothing and the real events get lost in it.
    if (intent.reason === 'hold' && turn % 3 !== 0) continue;
    log.push(describeMove(guest, intent, grid, turn));
  }

  const mutationTurn = turn % MUTATION_EVERY === 0;
  const mutated = new Set<string>();

  const before = new Map(guests.map((guest) => [guest.id, { x: guest.x, y: guest.y }]));

  const settled: Guest[] = moved.map((guest) => {
    const intent = intents.find((candidate) => candidate.guestId === guest.id);

    const anyForeignLure = (Object.keys(signals.lures) as (keyof typeof signals.lures)[]).some(
      (type) => type !== guest.hiddenLure && signals.lures[type].length > 0,
    );

    const agitationLevel = Math.max(
      0,
      Math.min(100, guest.agitationLevel + agitationDelta(intent, anyForeignLure)),
    );

    const shouldTurn = mutationTurn || agitationLevel >= AGITATION_BREAKING_POINT;
    const mutationStage = shouldTurn ? nextStage(guest.mutationStage) : guest.mutationStage;

    if (mutationStage !== guest.mutationStage) {
      mutated.add(guest.id);
      log.push(describeMutation(guest, MUTATION_META[mutationStage].label));
    }

    // Face the way you walked, and keep facing that way when you stop.
    const was = before.get(guest.id);
    const dx = was ? guest.x - was.x : 0;
    const facing: 1 | -1 = dx === 0 ? guest.facing : dx > 0 ? 1 : -1;

    // Anyone within earshot of live music dances. Everyone, not just the guest
    // who secretly wants bass — otherwise dancing would give the lure away.
    const dancing = signals.noise.some(
      (source) => floorAt(source.x, source.y) === floorAt(guest.x, guest.y)
        && Math.abs(source.x - guest.x) + Math.abs(floorPoint(source).y - floorPoint(guest).y) <= 4,
    );

    return {
      ...guest,
      agitationLevel,
      mutationStage,
      facing,
      dancing,
      mood: readMood(intent, agitationLevel, mutationStage, dancing),
      familiarity: guest.familiarity + familiarityGain(guest, input.host),
      saying: null as string | null,
    };
  });

  // Anyone who has ENDED the hour somewhere they should not be — measured on
  // where they are now rather than where they set off, so crossing a doorway
  // and coming straight back out again the same hour costs nothing.
  let suspicionAdded = 0;
  const trespassing: Guest[] = settled.map((guest) => {
    const room = roomAt(guest.x, guest.y);
    if (room?.offLimits !== true) return guest;

    suspicionAdded +=
      INTRUSION_SUSPICION_BASE + guest.mutationStage * INTRUSION_SUSPICION_PER_STAGE;
    log.push(describeIntrusion(guest, room.name, turn));

    // Getting away with it makes them bolder, which makes next hour worse.
    return {
      ...guest,
      agitationLevel: Math.min(100, guest.agitationLevel + INTRUSION_AGITATION),
    };
  });

  // Voices last, so a bark can react to a mutation that happened this hour.
  const barks = collectBarks({
    guests: trespassing,
    intents,
    nudged: input.nudged,
    shoved: input.shoved,
    mutated,
    turn,
  });

  const spoken = new Map(barks.map((bark) => [bark.guestId, bark.text]));
  const voiced = trespassing.map((guest) => ({ ...guest, saying: spoken.get(guest.id) ?? null }));
  for (const bark of barks) log.push(bark.text);

  const ambient = ambientLine({
    musicOn: signals.noise.length > 0,
    suspicion: input.suspicion,
    turn,
    guestsLeft: voiced.length,
  });
  if (ambient) log.push(ambient);

  return { guests: voiced, departed, log, intents, suspicionAdded };
}
