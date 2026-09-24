import { adjacentOnFloor, atlasPoint, floorAt, floorInfo, floorPoint, stairBetween } from '../data/floors';
import {
  ACTION_AGITATION,
  ACTION_MINUTES,
  ACTION_SUSPICION,
  CAMERA_UNLOCK_TASKS,
  jobKey,
  MAX_BANKED_MINUTES,
  MAX_BORROWED_MINUTES,
  MINUTES_PER_TURN,
  SNACK_ROTATION,
  type QueuedAction,
  type Snack,
} from './actions';
import { key } from './ai';
import { describeEmptyFeed, describeProfile } from './narrate';
import { resolveTurn } from './resolve';
import { narrativeNameAt, roomAt } from '../data/rooms';
import {
  createHostStart,
  createInitialDecor,
  createInitialGrid,
  createInitialGuests,
  createInitialInteractables,
} from '../data/initialState';
import {
  decorAt,
  guestAt,
  interactableAt,
  isOutdoors,
  isWalkable,
  tileAt,
  INTERACTABLE_META,
  LURE_META,
  type Decor,
  type Grid,
  type Guest,
  type Interactable,
  type Tile,
} from '../types/game';

export interface Position {
  x: number;
  y: number;
}

export type Phase = 'planning' | 'resolution';

export interface GameState {
  day: number;
  turn: number;
  /**
   * Minutes left in this hour. Goes NEGATIVE when the player starts something
   * they cannot finish in time — that is deliberate, and the debt is carried
   * into the next hour rather than refused here.
   */
  minutes: number;
  /** Minutes this hour started with: sixty, plus whatever last hour left over. */
  budget: number;
  /**
   * What the previous hour handed over. Positive is time banked by an easy
   * hour, negative is time borrowed by a frantic one. Kept separately from
   * `budget` purely so the HUD can say where the number came from.
   */
  carry: number;
  /** 0–100. At 100 the neighbours call it in and the run ends. */
  suspicion: number;
  phase: Phase;

  grid: Grid;
  decor: Decor[];
  host: Position;
  guests: Guest[];
  interactables: Interactable[];
  snacks: Snack[];
  /** Keys of doors the host has bolted, as "x,y". */
  lockedDoors: string[];
  /** Names of guests who have left the lot, in the order they went. */
  departed: string[];
  /**
   * Every distinct job the host has finished across the whole night, as
   * `kind:target` keys — see `jobKey`. The surveillance PC unlocks off the
   * SIZE of this, so it only ever grows, and doing the same thing to the same
   * object twice adds nothing to it.
   */
  jobsDone: string[];

  queue: QueuedAction[];
  selected: Tile | null;
  log: string[];
}

export function doorKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function createInitialState(): GameState {
  return {
    day: 1,
    turn: 1,
    minutes: MINUTES_PER_TURN,
    budget: MINUTES_PER_TURN,
    carry: 0,
    suspicion: 12,
    phase: 'planning',

    grid: createInitialGrid(),
    decor: createInitialDecor(),
    host: createHostStart(),
    guests: createInitialGuests(),
    interactables: createInitialInteractables(),
    snacks: [],
    lockedDoors: [],
    departed: [],
    jobsDone: [],

    queue: [],
    selected: null,
    log: ['Day 1. The party is on hour fifty-two. Nobody has left.'],
  };
}

/* ----------------------------------------------------------- the projection */

/**
 * What the board will look like once the queue resolves.
 *
 * The player plans against this, not against the committed state — queue a step
 * east and the next click is judged from where the host *will* be standing. The
 * alternative (measuring adjacency from the committed position) makes multi-step
 * plans impossible to express, because every action after the first would be
 * out of reach.
 */
export interface Projection {
  host: Position;
  guests: Guest[];
  interactables: Interactable[];
  snacks: Snack[];
  lockedDoors: string[];
  suspicion: number;
}

/**
 * Who the cameras pick out this hour: the most agitated guest you have not
 * already worked out.
 *
 * The first rule tried here was "furthest from the host", on the theory that a
 * camera is for seeing where you are not standing. It played terribly. The desk
 * is in the far back corner, so furthest is ALWAYS the kitchen, and the kitchen
 * is where the hungry guests live — the first four reveals of every game were
 * the same four people and all four of them wanted food. A rule fixed at spawn
 * that never varies is not information, it is a cutscene.
 *
 * Agitation fixes both halves. It moves constantly in response to how the night
 * has actually gone, so no two runs profile the same order; and it points the
 * camera at whoever is closest to putting a foot through something, which is
 * the person worth identifying. It also gives the player a lever: wind somebody
 * up and the cameras will find them next. That is a slightly horrible thing to
 * do to a guest, and entirely in keeping with the rest of the game.
 *
 * Ties fall to spawn order, so a given board always resolves the same way and
 * the system can be tested.
 */
export function cameraTarget(guests: readonly Guest[]): Guest | undefined {
  let best: Guest | undefined;
  for (const guest of guests) {
    if (guest.profiled) continue;
    if (best === undefined || guest.agitationLevel > best.agitationLevel) best = guest;
  }
  return best;
}

/** Pushes a guest away from `from`, one tile at a time, stopping at obstacles. */
function pushGuest(
  guest: Guest,
  from: Position,
  distance: number,
  grid: Grid,
  decor: readonly Decor[],
  others: readonly Guest[],
): Position {
  const origin = floorPoint(from), target = floorPoint(guest);
  const floor = floorAt(guest.x, guest.y);
  const dx = Math.sign(target.x - origin.x);
  const dy = Math.sign(target.y - origin.y);

  let { x, y } = guest;
  for (let step = 0; step < distance; step += 1) {
    const local = floorPoint({ x, y });
    const { x: nx, y: ny } = atlasPoint({ x: local.x + dx, y: local.y + dy }, floor);
    if (!adjacentOnFloor({ x, y }, { x: nx, y: ny }) || !isWalkable(grid, decor, nx, ny)) break;
    if (others.some((other) => other.id !== guest.id && other.x === nx && other.y === ny)) break;
    x = nx;
    y = ny;
  }

  return { x, y };
}

function applyToProjection(projection: Projection, action: QueuedAction, state: GameState): void {
  switch (action.kind) {
    case 'move': {
      projection.host = { x: action.x, y: action.y };
      break;
    }
    case 'toggle': {
      projection.interactables = projection.interactables.map((item) =>
        item.id === action.targetId
          ? { ...item, state: item.state === 'on' ? 'off' : 'on' }
          : item,
      );
      break;
    }
    case 'snack': {
      const art = SNACK_ROTATION[projection.snacks.length % SNACK_ROTATION.length] ?? 'pizza';
      projection.snacks = [
        ...projection.snacks,
        { id: `snack-${action.id}`, art, x: action.x, y: action.y },
      ];
      break;
    }
    case 'nudge':
    case 'shove': {
      const distance = action.kind === 'shove' ? 2 : 1;
      projection.guests = projection.guests.map((guest) => {
        if (guest.id !== action.targetId) return guest;
        const moved = pushGuest(guest, projection.host, distance, state.grid, state.decor, projection.guests);
        return {
          ...guest,
          x: moved.x,
          y: moved.y,
          agitationLevel: Math.min(100, guest.agitationLevel + ACTION_AGITATION[action.kind]),
        };
      });
      break;
    }
    case 'cameras': {
      // Only the screen coming on is previewed. WHO the feeds pick out is
      // settled at resolution, or the player could queue a look, read the
      // answer off the panel and undo it for a free peek.
      projection.interactables = projection.interactables.map((item) =>
        item.id === action.targetId ? { ...item, state: 'on' as const } : item,
      );
      break;
    }
    case 'door': {
      const key = doorKey(action.x, action.y);
      projection.lockedDoors = projection.lockedDoors.includes(key)
        ? projection.lockedDoors.filter((entry) => entry !== key)
        : [...projection.lockedDoors, key];
      break;
    }
    default: {
      break;
    }
  }

  projection.suspicion = Math.min(100, projection.suspicion + ACTION_SUSPICION[action.kind]);
}

export function project(state: GameState): Projection {
  const projection: Projection = {
    host: { ...state.host },
    guests: state.guests.map((guest) => ({ ...guest })),
    interactables: state.interactables.map((item) => ({ ...item })),
    snacks: [...state.snacks],
    lockedDoors: [...state.lockedDoors],
    suspicion: state.suspicion,
  };

  for (const action of state.queue) applyToProjection(projection, action, state);

  return projection;
}

/* ------------------------------------------------------- the action menu */

export interface ActionOption {
  kind: QueuedAction['kind'];
  label: string;
  cost: number;
  targetId?: string;
  /** Set when the option cannot be taken, explaining why. */
  disabledReason?: string;
}

/**
 * What the host can do to `tile` right now. Everything is judged against the
 * projection, and against the AP left after the already-queued actions.
 */
export function availableActions(
  state: GameState,
  projection: Projection,
  tile: Tile,
): ActionOption[] {
  const options: ActionOption[] = [];
  const { host } = projection;

  if (tile.x === host.x && tile.y === host.y) return options;
  if (stairBetween(host, tile)) {
    if (isWalkable(state.grid, state.decor, tile.x, tile.y)
      && !guestAt(projection.guests, tile.x, tile.y)
      && !projection.lockedDoors.includes(doorKey(tile.x, tile.y))) {
      options.push({ kind: 'move', label: `Take stairs to ${floorInfo(floorAt(tile.x, tile.y)).name}`, cost: ACTION_MINUTES.move });
    }
    return options;
  }
  if (!adjacentOnFloor(host, tile)) return options;
  if (!tile.isPassable) return options;

  const guest = guestAt(projection.guests, tile.x, tile.y);
  const item = interactableAt(projection.interactables, tile.x, tile.y);
  const furniture = decorAt(state.decor, tile.x, tile.y);
  const hasSnack = projection.snacks.some((snack) => snack.x === tile.x && snack.y === tile.y);

  if (guest) {
    options.push({
      kind: 'nudge',
      label: `Nudge ${guest.name}`,
      cost: ACTION_MINUTES.nudge,
      targetId: guest.id,
    });
    options.push({
      kind: 'shove',
      label: `Shove ${guest.name}`,
      cost: ACTION_MINUTES.shove,
      targetId: guest.id,
    });
  }

  if (item && item.type === 'pc') {
    // The PC is the one interactable you cannot simply flip on. Watching the
    // feeds is its own action, and it is gated on having actually hosted.
    const left = CAMERA_UNLOCK_TASKS - state.jobsDone.length;
    const unseen = projection.guests.some((guest) => !guest.profiled);
    const locked =
      left > 0
        ? `The machine wants ${left} more job${left === 1 ? '' : 's'} done first.`
        : !unseen
          ? 'You have worked out everybody still here.'
          : undefined;

    options.push({
      kind: 'cameras',
      label: 'Check the cameras',
      cost: ACTION_MINUTES.cameras,
      targetId: item.id,
      ...(locked !== undefined ? { disabledReason: locked } : {}),
    });

    // Always offer the way back out. Leaving the screen lit is a real mistake
    // to have made — it throws light into the one room nobody may enter — so
    // undoing it has to be available even while the feeds are locked.
    if (item.state === 'on') {
      options.push({
        kind: 'toggle',
        label: 'Surveillance PC: Asleep',
        cost: ACTION_MINUTES.toggle,
        targetId: item.id,
      });
    }
  } else if (item) {
    const meta = INTERACTABLE_META[item.type];
    const next = item.state === 'on' ? meta.stateLabels.off : meta.stateLabels.on;
    options.push({
      kind: 'toggle',
      label: `${meta.label}: ${next}`,
      cost: ACTION_MINUTES.toggle,
      targetId: item.id,
    });
  }

  if (tile.hasDoor) {
    const locked = projection.lockedDoors.includes(doorKey(tile.x, tile.y));
    options.push({
      kind: 'door',
      label: locked ? 'Unlock Door' : 'Lock Door',
      cost: ACTION_MINUTES.door,
    });
  }

  if (!guest && !hasSnack && !furniture?.blocking && !item) {
    options.push({ kind: 'snack', label: 'Place Snack', cost: ACTION_MINUTES.snack });
  }

  if (!guest && isWalkable(state.grid, state.decor, tile.x, tile.y)) {
    options.push({ kind: 'move', label: 'Move Here', cost: ACTION_MINUTES.move });
  }

  // The hour is a soft edge. You may BEGIN anything you have a minute left for,
  // and anything that runs past the hour is borrowed from the next one — so the
  // only thing that closes the menu is having no time at all.
  const remaining = state.minutes;
  if (remaining > 0) return options;

  return options.map((option) => ({
    ...option,
    disabledReason: 'The hour is gone. End it and carry the debt.',
  }));
}

/* ---------------------------------------------------------------- reducer */

export type Msg =
  | { type: 'selectTile'; tile: Tile | null }
  | { type: 'queueMove'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'queueAction'; option: ActionOption; tile: Tile }
  | { type: 'undoLast' }
  | { type: 'clearQueue' }
  | { type: 'endTurn' }
  | { type: 'resolutionComplete' };

let actionSeq = 0;

/**
 * Commits the queue. Phase 3 slots guest pathfinding in immediately after this
 * point — the spec has the resolution step process the player's environmental
 * changes first, then let every guest read the board they produced.
 */
function commitTurn(state: GameState): GameState {
  // 1. The player's queued environmental changes land first. Everything the
  //    guests are about to read is the board the host just finished making.
  const projection = project(state);

  const entries: string[] = [];
  if (state.queue.length === 0) {
    const tile = tileAt(state.grid, state.host.x, state.host.y);
    const preposition = tile && isOutdoors(tile) ? 'on' : 'in';
    entries.push(`You stood ${preposition} ${narrativeNameAt(state.grid, state.host.x, state.host.y)} and did nothing.`);
  } else {
    for (const action of state.queue) entries.push(`You: ${action.label.toLowerCase()}.`);
  }

  // Who the host physically handled this hour, so they can answer back.
  const nudged = new Set(
    state.queue.filter((a) => a.kind === 'nudge' && a.targetId).map((a) => a.targetId as string),
  );
  const shoved = new Set(
    state.queue.filter((a) => a.kind === 'shove' && a.targetId).map((a) => a.targetId as string),
  );

  // 1b. The feeds, if the host sat down at them. One look finds one person,
  //     so a whole cast is a whole night of ten-minute sittings in the back
  //     bedroom — which is exactly the trade the room is there to charge for.
  for (const action of state.queue) {
    if (action.kind !== 'cameras') continue;
    const found = cameraTarget(projection.guests);
    if (!found) {
      entries.push(describeEmptyFeed());
      continue;
    }
    projection.guests = projection.guests.map((guest) =>
      guest.id === found.id ? { ...guest, profiled: true } : guest,
    );
    entries.push(
      describeProfile(
        found,
        roomAt(found.x, found.y)?.name ?? 'somewhere in the house',
        LURE_META[found.hiddenLure].hint,
        state.turn,
      ),
    );
  }

  // 2. Every guest reads that board and takes one step, simultaneously.
  const resolution = resolveTurn({
    grid: state.grid,
    decor: state.decor,
    guests: projection.guests,
    interactables: projection.interactables,
    snacks: projection.snacks,
    lockedDoors: projection.lockedDoors,
    host: projection.host,
    turn: state.turn,
    nudged,
    shoved,
    suspicion: projection.suspicion,
  });

  entries.push(...resolution.log);

  // A guest who ate a snack takes it with them; food on the floor does not last.
  const eaten = new Set(
    resolution.guests
      .filter((guest) => projection.snacks.some((s) => s.x === guest.x && s.y === guest.y))
      .map((guest) => key(guest.x, guest.y)),
  );
  const snacks = projection.snacks.filter((snack) => !eaten.has(key(snack.x, snack.y)));
  for (const snack of projection.snacks) {
    if (eaten.has(key(snack.x, snack.y))) entries.push(`Someone got to the ${snack.art}.`);
  }

  return {
    ...state,
    phase: 'resolution',
    host: projection.host,
    guests: resolution.guests,
    departed: [...state.departed, ...resolution.departed.map((guest) => guest.name)],
    interactables: projection.interactables,
    snacks,
    lockedDoors: projection.lockedDoors,
    jobsDone: [
      ...new Set([
        ...state.jobsDone,
        ...state.queue.map(jobKey).filter((entry): entry is string => entry !== null),
      ]),
    ],
    // The plan's own noise, plus whatever the guests earned by being somewhere
    // they should not be. Both are capped at the same ceiling.
    suspicion: Math.min(100, projection.suspicion + resolution.suspicionAdded),
    queue: [],
    selected: null,
    log: [...state.log, `— Turn ${state.turn} —`, ...entries],
  };
}

export function reducer(state: GameState, msg: Msg): GameState {
  // Input is locked while the engine resolves the turn.
  if (state.phase === 'resolution' && msg.type !== 'resolutionComplete') return state;

  switch (msg.type) {
    case 'queueMove': {
      // Resolve against the latest plan so fast key presses never reuse an old
      // host position. Clicks and keys share the same legality and minute costs.
      const projection = project(state);
      const { x, y } = projection.host;
      const dx = msg.direction === 'left' ? -1 : msg.direction === 'right' ? 1 : 0;
      const dy = msg.direction === 'up' ? -1 : msg.direction === 'down' ? 1 : 0;
      const local = floorPoint({ x, y });
      const next = atlasPoint({ x: local.x + dx, y: local.y + dy }, floorAt(x, y));
      const tile = tileAt(state.grid, next.x, next.y);
      if (!tile) return state;
      const option = availableActions(state, projection, tile).find(action => action.kind === 'move');
      return option ? reducer(state, { type: 'queueAction', option, tile }) : state;
    }

    case 'selectTile': {
      return { ...state, selected: msg.tile };
    }

    case 'queueAction': {
      const { option, tile } = msg;
      // Note the gate is `minutes > 0`, not `cost <= minutes`: starting a job
      // you cannot finish inside the hour is a legal, and often correct, move.
      if (option.disabledReason !== undefined || state.minutes <= 0) return state;

      actionSeq += 1;
      const action: QueuedAction = {
        id: `act-${actionSeq}`,
        kind: option.kind,
        cost: option.cost,
        x: tile.x,
        y: tile.y,
        label: option.label,
        ...(option.targetId !== undefined ? { targetId: option.targetId } : {}),
      };

      return {
        ...state,
        minutes: state.minutes - option.cost,
        queue: [...state.queue, action],
        selected: null,
      };
    }

    case 'undoLast': {
      const last = state.queue.at(-1);
      if (!last) return state;
      return {
        ...state,
        minutes: state.minutes + last.cost,
        queue: state.queue.slice(0, -1),
      };
    }

    case 'clearQueue': {
      const refund = state.queue.reduce((sum, action) => sum + action.cost, 0);
      return { ...state, minutes: state.minutes + refund, queue: [] };
    }

    case 'endTurn': {
      return commitTurn(state);
    }

    case 'resolutionComplete': {
      // A "day" is eight turns; the Mutation Timer will hang off this in Phase 3.
      const nextTurn = state.turn + 1;

      // Whatever was left on the clock rides into the next hour. An hour you
      // barely touched buys you a long one; an hour you overran hands you the
      // bill. The caps keep both ends of that playable rather than degenerate.
      const carry = Math.max(
        -MAX_BORROWED_MINUTES,
        Math.min(MAX_BANKED_MINUTES, state.minutes),
      );
      const budget = MINUTES_PER_TURN + carry;

      const note =
        carry > 0
          ? `You finished the hour with ${carry} minutes spare. They carry over.`
          : carry < 0
            ? `You ran ${-carry} minutes over. Next hour is short by that much.`
            : null;

      return {
        ...state,
        phase: 'planning',
        turn: nextTurn,
        day: Math.floor((nextTurn - 1) / 8) + 1,
        minutes: budget,
        budget,
        carry,
        log: note === null ? state.log : [...state.log, note],
      };
    }

    default: {
      return state;
    }
  }
}

/** Tile lookup that respects the current grid, for callers holding only state. */
export function selectedTile(state: GameState, x: number, y: number): Tile | undefined {
  return tileAt(state.grid, x, y);
}
