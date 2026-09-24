import { animate, createTimeline, onScroll, splitText, stagger, utils } from 'animejs';
import {
  emoteArt,
  foodArt,
  furnitureArt,
  hostArt,
  poseArt,
  terrainArt,
  type Art,
  type EmoteId,
  type FoodId,
  type PropId,
} from '../src/art';
import { rasterise } from '../src/art/pixel';
import {
  ACTION_MINUTES,
  ACTION_SUSPICION,
  CAMERA_UNLOCK_TASKS,
  MAX_BANKED_MINUTES,
  MAX_BORROWED_MINUTES,
  MINUTES_PER_TURN,
  type ActionKind,
} from '../src/game/actions';
import { CAST, type BarkTrigger } from '../src/game/cast';
import { createInitialGuests } from '../src/data/initialState';
import { LURE_META, MUTATION_META, type LureType, type MutationStage } from '../src/types/game';
import { ago, calendarDate, latestCommits, MILESTONES, REPO_URL, type Commit } from './devlog';
import { auditFont } from './pixel-font';
import { confetti, decode, pixelCursors, pixelWipe, pixelWord } from './pixel-fx';

/**
 * THE LANDING PAGE
 *
 * Everything shown here is read from the game rather than restated: sprites
 * come from src/art, costs from src/game/actions, lines from src/game/cast,
 * opening stages from src/data/initialState. A trailer that quotes last
 * month's numbers is worse than no trailer, and this way retuning the economy
 * retunes the page with it.
 *
 * One rule carried over from the game: nothing on this page ever says which
 * guest is drawn to what. The deduction demo deals each guest a random lure
 * for exactly that reason.
 */

const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm) document.documentElement.classList.add('motion');

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`landing: #${id} is missing from the markup`);
  return node as T;
}

function spriteUrl(art: Art): string {
  return `url(${rasterise(art.cacheKey, art.grid, art.palette)})`;
}

function paint(node: HTMLElement, art: Art): void {
  node.style.backgroundImage = spriteUrl(art);
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Stable per-id number, so twelve people breathing never breathe in unison. */
function seed(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pick<T>(items: readonly T[] | undefined, fallback: T): T {
  if (!items || items.length === 0) return fallback;
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

/** Runs `play` once, the first time `node` scrolls into view. */
const onFirstSight = (() => {
  const plays = new Map<Element, () => void>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        plays.get(entry.target)?.();
      }
    },
    { threshold: 0.2 },
  );
  return (node: Element, play: () => void) => {
    plays.set(node, play);
    io.observe(node);
  };
})();

/** Undertale-style: the line arrives a letter at a time. */
function typeLine(node: HTMLElement, text: string): void {
  const line = make('span', '', text);
  node.replaceChildren(line);
  if (calm) return;
  const { chars } = splitText(line, { chars: true });
  utils.set(chars, { opacity: 0 });
  animate(chars, { opacity: 1, duration: 1, delay: stagger(16) });
}

const NAMES = Object.keys(CAST);
const nameOf = (id: string) => id.replace('guest-', '').replace(/^./, (c) => c.toUpperCase());

/** A bark, attributed when it is a quote rather than a description. */
function bark(id: string, trigger: BarkTrigger, fallback: string): string {
  const line = pick(CAST[id]?.lines[trigger], fallback);
  return line.startsWith('"') ? `${nameOf(id)}: ${line}` : line;
}

const OPENING_STAGE = new Map<string, MutationStage>(
  createInitialGuests().map((guest) => [guest.id, guest.mutationStage]),
);
const stageOf = (id: string): MutationStage => OPENING_STAGE.get(id) ?? 0;

/* -------------------------------------------------------- static sprites */

document.querySelectorAll<HTMLElement>('[data-prop]').forEach((node) => {
  paint(node, furnitureArt(node.dataset.prop as PropId));
});
document.querySelectorAll<HTMLElement>('[data-food]').forEach((node) => {
  paint(node, foodArt(node.dataset.food as FoodId));
});
document.querySelectorAll<HTMLElement>('[data-emote]').forEach((node) => {
  paint(node, emoteArt(node.dataset.emote as EmoteId));
});
document.querySelectorAll<HTMLElement>('[data-host]').forEach((node) => paint(node, hostArt()));

/** A guest in a wrapper: CSS owns the idle on the sprite, anime.js owns the hop. */
function crowdMember(id: string, stage: MutationStage): HTMLElement {
  const hop = make('div', 'hop');
  const body = make('div', `guest sprite anim-${stage}`);
  body.style.animationDelay = `-${(seed(id) % 1000) / 300}s`;
  paint(body, poseArt(id, stage));
  hop.append(body);
  return hop;
}

/* ================================================================== HERO */

const hero = byId('top');
const floor = byId('floor');
const tiles = byId('tiles');
const crowd = byId('crowd');
const TILE = 48;
const PARTY_LIGHT = ['#ff4fa3', '#3fe0d0', '#ffd35a'] as const;

floor.style.backgroundImage = spriteUrl(terrainArt('den', 0, 0));
NAMES.forEach((id) => crowd.append(crowdMember(id, stageOf(id))));

let cols = 0;
let rows = 0;
function buildTiles(): void {
  const { width, height } = hero.getBoundingClientRect();
  cols = Math.ceil(width / TILE);
  rows = Math.ceil(height / TILE);
  tiles.style.setProperty('--cols', String(cols));
  tiles.replaceChildren(...Array.from({ length: cols * rows }, () => make('span')));
}
buildTiles();

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(buildTiles, 150);
});

/**
 * The anime.js grid ripple, as a dance floor. Light spreads out from the
 * tile you clicked and the crowd hops as it reaches them.
 */
let beat = 0;
function ripple(index: number): void {
  if (calm) return;
  const colour = PARTY_LIGHT[beat % PARTY_LIGHT.length] ?? '#ff4fa3';
  beat += 1;
  utils.set(tiles.children, { backgroundColor: colour });
  animate(tiles.children, {
    opacity: [
      { to: 0.5, duration: 160 },
      { to: 0, duration: 900 },
    ],
    delay: stagger(42, { grid: [cols, rows], from: index }),
    ease: 'out(2)',
  });
  animate(crowd.children, {
    y: [
      { to: -16, duration: 150, ease: 'out(2)' },
      { to: 0, duration: 380, ease: 'outBounce' },
    ],
    delay: stagger(35, { from: 'center', start: 250 }),
  });
}

hero.addEventListener('click', (event) => {
  if ((event.target as Element).closest('a, button')) return;
  const box = hero.getBoundingClientRect();
  const col = Math.floor((event.clientX - box.left) / TILE);
  const row = Math.floor((event.clientY - box.top) / TILE);
  ripple(row * cols + col);
});

// The music never quite stops: an unprompted beat while the hero is on screen.
let heroVisible = true;
new IntersectionObserver(([entry]) => {
  heroVisible = entry?.isIntersecting ?? false;
}).observe(hero);
if (!calm) {
  window.setInterval(() => {
    if (heroVisible && document.visibilityState === 'visible') {
      ripple(Math.floor(Math.random() * cols * rows));
    }
  }, 3600);
}

if (!calm) {
  const title = splitText('#title', { chars: true });
  const typed = splitText('#typed', { chars: true });
  const buttons = document.querySelectorAll('.hero .cta .btn');
  utils.set([...title.chars, ...typed.chars, ...buttons, ...crowd.children, '.disco'], {
    opacity: 0,
  });

  createTimeline({ delay: 200 })
    .add('.disco', {
      opacity: [0, 1],
      scale: [0.2, 1],
      rotate: [-200, 0],
      duration: 1100,
      ease: 'outElastic(1, .6)',
    })
    .add(
      title.chars,
      {
        opacity: [0, 1],
        y: ['-120%', '0%'],
        rotate: { from: () => utils.random(-40, 40), to: 0 },
        duration: 1000,
        delay: stagger(45),
        ease: 'outElastic(1, .55)',
      },
      '-=800',
    )
    .add(typed.chars, { opacity: [0, 1], duration: 1, delay: stagger(22) }, '-=500')
    .add(
      crowd.children,
      {
        opacity: [0, 1],
        y: [80, 0],
        duration: 800,
        delay: stagger(55, { from: 'center' }),
        ease: 'outBack(1.4)',
      },
      '-=2400',
    )
    .add(
      buttons,
      { opacity: [0, 1], y: [24, 0], duration: 600, delay: stagger(110), ease: 'out(3)' },
      '-=900',
    )
    .call(() => ripple(Math.floor(cols * rows * 0.5 + cols / 2)));

  animate('.disco', {
    rotate: [-8, 8],
    duration: 1400,
    alternate: true,
    loop: true,
    ease: 'inOut(2)',
    delay: 1500,
  });
}

/* ================================================================ TICKER */

const ticker = byId('ticker');
const departures = NAMES.flatMap((id) => CAST[id]?.lines.gone ?? []);
ticker.replaceChildren(...[...departures, ...departures].map((line) => make('p', '', line)));
if (!calm) {
  animate(ticker, {
    x: ['0%', '-50%'],
    duration: departures.length * 5200,
    ease: 'linear',
    loop: true,
  });
}

/* =============================================================== PREMISE */

if (!calm) {
  const { words } = splitText('#premiseText', { words: true });
  animate(words, {
    opacity: [0.1, 1],
    y: ['0.25em', '0em'],
    ease: 'linear',
    delay: stagger(80),
    duration: 300,
    autoplay: onScroll({ target: '#premiseText', enter: 'bottom top', leave: 'center bottom', sync: 0.6 }),
  });
}

document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => {
  if (calm) return;
  onFirstSight(node, () => {
    animate(node, { opacity: [0, 1], y: [48, 0], duration: 1000, ease: 'out(4)' });
  });
});

/* ============================================================== THE HOUR */

const ACTION_COPY: Record<ActionKind, { label: string; note: string }> = {
  move: { label: 'Take a step', note: 'Cheap per tile. Ruinous across a whole house.' },
  toggle: { label: 'Flip a switch', note: 'A lamp, the speaker, the fridge.' },
  door: { label: 'Bolt a door', note: 'Find the key, work the lock, seal a route.' },
  shove: { label: 'Shove a guest', note: 'Fast. Loud. The only thing that can hurt someone.' },
  snack: { label: 'Put out a snack', note: 'Fetch it, plate it, carry it back.' },
  nudge: { label: 'Talk someone out', note: 'Never one sentence. Never quick.' },
  cameras: { label: 'Read the cameras', note: 'The most expensive thing an hour can hold.' },
};
const ACTION_ORDER: readonly ActionKind[] = ['move', 'toggle', 'door', 'shove', 'snack', 'nudge', 'cameras'];

/** The same four readings the in-game gauge gives. */
function suspicionReading(value: number): { word: string; colour: string } {
  if (value >= 85) return { word: 'someone is dialling', colour: '#c94a3a' };
  if (value >= 60) return { word: 'curtains are twitching', colour: '#d08a2a' };
  if (value >= 35) return { word: 'they have noticed', colour: '#c8a24a' };
  return { word: 'nobody minds yet', colour: '#7d9a52' };
}

const hourState = {
  hour: 52,
  budget: MINUTES_PER_TURN,
  carried: 0,
  suspicion: 12,
  queue: [] as ActionKind[],
};

const DIAL_R = 74;
const DEBT_R = 86;
const DIAL_C = 2 * Math.PI * DIAL_R;
const DEBT_C = 2 * Math.PI * DEBT_R;
const spentArc = byId('spentArc') as unknown as SVGCircleElement;
const debtArc = byId('debtArc') as unknown as SVGCircleElement;
const actionsBox = byId('actions');
const queueBox = byId('queue');
const hourLog = byId('hourLog');
const readout = { minutes: MINUTES_PER_TURN };

utils.set(spentArc, { strokeDasharray: DIAL_C, strokeDashoffset: DIAL_C });
utils.set(debtArc, { strokeDasharray: DEBT_C, strokeDashoffset: DEBT_C });

const ticks = byId('ticks') as unknown as SVGGElement;
for (let i = 0; i < 60; i += 1) {
  const angle = (i / 60) * Math.PI * 2;
  const inner = i % 5 === 0 ? 90 : 94;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(100 + Math.cos(angle) * inner));
  line.setAttribute('y1', String(100 + Math.sin(angle) * inner));
  line.setAttribute('x2', String(100 + Math.cos(angle) * 98));
  line.setAttribute('y2', String(100 + Math.sin(angle) * 98));
  line.setAttribute('class', i % 5 === 0 ? 'tick major' : 'tick');
  ticks.append(line);
}

const actionButtons = new Map<ActionKind, HTMLButtonElement>();
for (const kind of ACTION_ORDER) {
  const copy = ACTION_COPY[kind];
  const suspicion = ACTION_SUSPICION[kind];
  const button = make('button', `action${suspicion >= 9 ? ' loud' : ''}`);
  button.type = 'button';
  button.append(
    make('b', '', copy.label),
    make('span', 'cost', `${ACTION_MINUTES[kind]} min`),
    make('small', '', suspicion > 0 ? `${copy.note} +${suspicion} suspicion.` : copy.note),
  );
  button.addEventListener('click', () => {
    hourState.queue.push(kind);
    renderHour();
  });
  actionButtons.set(kind, button);
  actionsBox.append(button);
}

function spentMinutes(): number {
  return hourState.queue.reduce((sum, kind) => sum + ACTION_MINUTES[kind], 0);
}

function projectedSuspicion(): number {
  const added = hourState.queue.reduce((sum, kind) => sum + ACTION_SUSPICION[kind], 0);
  return Math.min(100, hourState.suspicion + added);
}

function renderHour(): void {
  const spent = spentMinutes();
  const left = hourState.budget - spent;
  // The soft edge: anything may be begun with a single minute on the clock.
  const open = left >= 1;
  actionButtons.forEach((button) => (button.disabled = !open));

  const dur = calm ? 0 : 520;
  const filled = Math.min(spent, hourState.budget) / hourState.budget;
  const owed = Math.max(0, -left) / MINUTES_PER_TURN;
  animate(spentArc, { strokeDashoffset: DIAL_C * (1 - filled), duration: dur, ease: 'out(3)' });
  animate(debtArc, { strokeDashoffset: DEBT_C * (1 - owed), duration: dur, ease: 'out(3)' });
  animate(readout, {
    minutes: left,
    duration: dur,
    ease: 'out(3)',
    onUpdate: () => {
      byId('minLeft').textContent = String(Math.round(readout.minutes));
    },
  });
  byId('minLabel').textContent =
    left < 0 ? 'borrowed from next hour' : hourState.budget > MINUTES_PER_TURN ? `of a ${hourState.budget}-minute hour` : 'minutes left';

  queueBox.replaceChildren(
    ...(hourState.queue.length === 0
      ? [make('span', 'empty', 'Nothing planned. Nothing has happened yet.')]
      : hourState.queue.map((kind) => make('span', '', `${ACTION_COPY[kind].label} · ${ACTION_MINUTES[kind]}m`))),
  );

  const suspicion = projectedSuspicion();
  const reading = suspicionReading(suspicion);
  byId('suspNum').textContent = String(suspicion);
  byId('suspWord').textContent = reading.word;
  animate('#suspBar', {
    width: `${suspicion}%`,
    backgroundColor: reading.colour,
    duration: dur,
    ease: 'out(3)',
  });

  const carry = hourState.carried;
  byId('ledger').textContent =
    `Hour ${hourState.hour} of the party · ` +
    (carry > 0 ? `+${carry} min banked` : carry < 0 ? `${carry} min borrowed` : 'nothing carried over');
}

function resolveHourLine(): string {
  const queue = hourState.queue;
  const who = pick(NAMES, 'guest-gary');
  if (queue.length === 0) return 'You stand very still for an hour. The minutes bank. Nobody leaves.';
  if (queue.includes('shove')) return bark(who, 'shoved', `${nameOf(who)} stumbles, and remembers this.`);
  if (queue.includes('nudge')) return bark(who, 'nudged', `${nameOf(who)} shuffles a step toward the door.`);
  if (queue.includes('cameras')) return `The feeds find ${nameOf(who)}. Now you know one thing for certain.`;
  if (queue.includes('snack')) return bark(who, 'raid', `${nameOf(who)} follows the smell.`);
  if (queue.includes('toggle')) return bark(who, 'dancing', `${nameOf(who)} is dancing, for now.`);
  if (queue.includes('door')) return 'The bolt goes across. Somebody tries the handle an hour later.';
  return bark(who, 'idle', `${nameOf(who)} watches you walk past. Twice.`);
}

byId('undo').addEventListener('click', () => {
  hourState.queue.pop();
  renderHour();
});

byId('endHour').addEventListener('click', () => {
  if (hourState.suspicion >= 100) {
    Object.assign(hourState, { hour: 52, budget: MINUTES_PER_TURN, carried: 0, suspicion: 12, queue: [] });
    typeLine(hourLog, 'It is hour fifty-two again. Nobody has called anyone. Yet.');
    renderHour();
    return;
  }
  const left = hourState.budget - spentMinutes();
  const carried = Math.max(-MAX_BORROWED_MINUTES, Math.min(MAX_BANKED_MINUTES, left));
  const line = resolveHourLine();
  hourState.suspicion = projectedSuspicion();
  hourState.carried = carried;
  hourState.budget = MINUTES_PER_TURN + carried;
  hourState.hour += 1;
  hourState.queue = [];
  typeLine(
    hourLog,
    hourState.suspicion >= 100
      ? 'Blue light moves across the ceiling. Somebody made the call. (End the hour to try again.)'
      : line,
  );
  renderHour();
});

utils.set('#suspBar', { width: '12%' });
renderHour();

if (!calm) {
  utils.set(ticks.children, { opacity: 0 });
  onFirstSight(ticks, () => {
    animate(ticks.children, { opacity: [0, 1], duration: 300, delay: stagger(18) });
  });
}

/* ============================================================== THE PULL */

const LURE_ART: Record<LureType, Art | null> = {
  bass: furnitureArt('speaker'),
  food: foodArt('pizza'),
  light: furnitureArt('lamp'),
  quiet: null,
};
const LURES = Object.keys(LURE_META) as LureType[];

const luresBox = byId('lures');
for (const lure of LURES) {
  const card = make('div', 'lure plate');
  card.dataset.reveal = '';
  const well = make('span', 'well');
  const art = LURE_ART[lure];
  if (art) {
    const sprite = make('span', 'sprite');
    paint(sprite, art);
    well.append(sprite);
  } else {
    well.textContent = '—';
  }
  const text = make('div');
  text.append(make('b', 'legend', LURE_META[lure].label), make('small', '', LURE_META[lure].hint));
  card.append(well, text);
  luresBox.append(card);
  if (!calm) onFirstSight(card, () => animate(card, { opacity: [0, 1], y: [30, 0], duration: 800, delay: LURES.indexOf(lure) * 90, ease: 'out(3)' }));
}

type Stimulus = 'speaker' | 'snack' | 'lamp';
const LANE = 9;
const lane = byId('lane');
lane.style.backgroundImage = spriteUrl(terrainArt('hall', 1, 2));

const cells = Array.from({ length: LANE }, () => {
  const cell = make('div', 'cell');
  lane.append(cell);
  return cell;
});

function fixture(index: number, art: Art, extra = ''): { sprite: HTMLElement; glow: HTMLElement } {
  const glow = make('div', 'glow');
  const sprite = make('div', `sprite ${extra}`);
  paint(sprite, art);
  cells[index]?.append(glow, sprite);
  return { sprite, glow };
}
const speaker = fixture(0, furnitureArt('speaker'));
const lamp = fixture(LANE - 1, furnitureArt('lamp'));
const snack = fixture(LANE - 2, foodArt('pizza'), 'snack');

const mystery = make('div', 'mystery');
const mysteryBody = make('div', 'sprite anim-0');
const mysteryEmote = make('div', 'emote sprite');
mystery.append(mysteryBody, mysteryEmote);
lane.append(mystery);

const labLog = byId('labLog');
const verdict = byId('verdict');
const guessBox = byId('guesses');

const round = { guest: 'guest-gary', lure: 'bass' as LureType, pos: 4, tests: 0, solved: false };

function place(pos: number, duration: number): void {
  const steps = Math.abs(pos - round.pos);
  round.pos = pos;
  animate(mystery, { x: `${pos * 100}%`, duration: calm ? 0 : duration * Math.max(1, steps), ease: 'inOut(2)' });
  if (!calm && steps > 0) {
    animate(mysteryBody, { y: [{ to: '-10%', duration: 110 }, { to: '0%', duration: 110 }], loop: steps * 2 - 1 });
  }
}

function emote(id: EmoteId | null): void {
  if (id === null) {
    utils.set(mysteryEmote, { opacity: 0 });
    return;
  }
  paint(mysteryEmote, emoteArt(id));
  animate(mysteryEmote, { opacity: [0, 1], y: ['30%', '0%'], scale: [0.6, 1], duration: calm ? 0 : 500, ease: 'outBack(2)' });
}

function setStimulus(active: Stimulus | null): void {
  document.querySelectorAll<HTMLButtonElement>('[data-stim]').forEach((button) => {
    button.classList.toggle('on', button.dataset.stim === active);
    button.setAttribute('aria-pressed', String(button.dataset.stim === active));
  });
  const dur = calm ? 0 : 400;
  animate([speaker.glow], { opacity: active === 'speaker' ? 1 : 0, duration: dur });
  animate([lamp.glow], { opacity: active === 'lamp' ? 1 : 0, duration: dur });
  animate(snack.sprite, {
    opacity: active === 'snack' ? 1 : 0,
    y: active === 'snack' ? ['-60%', '0%'] : '0%',
    duration: dur,
    ease: active === 'snack' ? 'outBounce' : 'out(2)',
  });
  mysteryBody.classList.toggle('dancing', false);
}

function react(stimulus: Stimulus): void {
  const { guest, lure } = round;
  const name = nameOf(guest);
  round.tests += 1;
  setStimulus(stimulus);
  place(4, 0);

  window.setTimeout(() => {
    if (stimulus === 'speaker' && lure === 'bass') {
      place(1, 260);
      emote('heart');
      typeLine(labLog, bark(guest, 'lured', `${name} follows the sound, delighted.`));
    } else if (stimulus === 'speaker' && lure === 'quiet') {
      place(LANE - 2, 200);
      emote('alert');
      typeLine(labLog, bark(guest, 'flee', `${name} backs out of the room, fast.`));
    } else if (stimulus === 'speaker') {
      mysteryBody.classList.add('dancing');
      emote('note');
      typeLine(labLog, bark(guest, 'dancing', `${name} dances. Everyone near music dances. It means nothing.`));
    } else if ((stimulus === 'snack' && lure === 'food') || (stimulus === 'lamp' && lure === 'light')) {
      place(stimulus === 'snack' ? LANE - 3 : LANE - 2, 260);
      emote('heart');
      typeLine(labLog, bark(guest, 'lured', `${name} drifts toward it without a word.`));
    } else {
      emote('sweat');
      typeLine(labLog, `${name} glances at it and stays exactly where they are. Something is running that isn't for them.`);
    }
  }, calm ? 0 : 280);
}

document.querySelectorAll<HTMLButtonElement>('[data-stim]').forEach((button) => {
  button.addEventListener('click', () => react(button.dataset.stim as Stimulus));
});

const guessButtons = LURES.map((lure) => {
  const button = make('button', 'btn btn-ghost', LURE_META[lure].label);
  button.type = 'button';
  button.addEventListener('click', () => {
    if (round.solved) return;
    const name = nameOf(round.guest);
    if (lure === round.lure) {
      round.solved = true;
      verdict.className = 'verdict right';
      verdict.textContent = `Right. ${name}: ${LURE_META[lure].hint} Worked out in ${round.tests} ${round.tests === 1 ? 'hour' : 'hours'}.`;
      if (!calm) animate(mystery, { scale: [1.25, 1], duration: 600, ease: 'outElastic(1, .5)' });
    } else {
      button.disabled = true;
      verdict.className = 'verdict wrong';
      verdict.textContent = `Not that. ${name} is still here.`;
      if (!calm) animate(mystery, { x: [`${round.pos * 100 - 6}%`, `${round.pos * 100 + 6}%`, `${round.pos * 100}%`], duration: 300 });
    }
  });
  guessBox.append(button);
  return button;
});

function newRound(): void {
  const others = NAMES.filter((id) => id !== round.guest);
  round.guest = pick(others, 'guest-gary');
  // Dealt at random, never the guest's real lure: this page must not spoil the game.
  round.lure = pick(LURES, 'bass');
  round.tests = 0;
  round.solved = false;
  round.pos = 4;
  utils.set(mystery, { x: '400%' });
  paint(mysteryBody, poseArt(round.guest, 0));
  setStimulus(null);
  emote(null);
  guessButtons.forEach((button) => (button.disabled = false));
  verdict.className = 'verdict';
  verdict.textContent = '';
  typeLine(labLog, `${nameOf(round.guest)} is in the hall. ${CAST[round.guest]?.tagline ?? ''} What are they drawn to?`);
  if (!calm) animate(mystery, { opacity: [0, 1], scale: [0.6, 1], duration: 500, ease: 'outBack(2)' });
}
byId('nextGuest').addEventListener('click', newRound);
newRound();

/* ============================================================= THE CLOCK */

/** Mirrors MUTATION_EVERY in src/game/resolve.ts, which keeps it private. */
const MUTATION_EVERY = 6;
const STAGE_COLOUR = ['#7d9a52', '#c8a24a', '#d08a2a', '#c94a3a'] as const;
const STAGE_GLOW = ['rgba(125,154,82,.18)', 'rgba(200,162,74,.2)', 'rgba(208,138,42,.24)', 'rgba(201,58,43,.3)'] as const;
const STAGE_COPY: Record<MutationStage, string> = {
  0: 'Upright, holding it together, faint smile. Still takes a hint.',
  1: 'Slumped and leaning, eyes shut. Wandering further, caring less.',
  2: 'Hunched, arms out, jaw hanging. Heads for the kitchen whatever you do.',
  3: 'Arms up, eyes red. There is no lure left that reaches them.',
};
const STAGES: readonly MutationStage[] = [0, 1, 2, 3];
const MUT_GUEST = 'guest-priya';

const stageList = byId('stages');
const stageItems = STAGES.map((stage) => {
  const item = make('li');
  item.append(make('b', '', MUTATION_META[stage].label), make('p', '', STAGE_COPY[stage]));
  stageList.append(item);
  return item;
});
const mutSprite = byId('mutSprite');
const mutSticky = byId('mutSticky');
let shownStage = -1;

function showHour(progress: number): void {
  const hour = Math.min(MUTATION_EVERY * 4 - 1, Math.floor(progress * MUTATION_EVERY * 4));
  byId('mutHour').textContent = String(hour);
  const stage = Math.min(3, Math.floor(hour / MUTATION_EVERY)) as MutationStage;
  if (stage === shownStage) return;
  shownStage = stage;
  paint(mutSprite, poseArt(MUT_GUEST, stage));
  mutSprite.className = `sprite anim-${stage}`;
  mutSticky.style.setProperty('--stage-color', STAGE_COLOUR[stage]);
  mutSticky.style.setProperty('--mut-glow', STAGE_GLOW[stage]);
  stageItems.forEach((item, i) => item.classList.toggle('active', i === stage));
  if (!calm) animate('.mut-frame', { scale: [1.06, 1], duration: 600, ease: 'outElastic(1, .6)' });
}
showHour(0);

const scrub = { progress: 0 };
animate(scrub, {
  progress: [0, 1],
  ease: 'linear',
  autoplay: onScroll({ target: '#clock', enter: 'top top', leave: 'bottom bottom', sync: true }),
  onUpdate: () => showHour(scrub.progress),
});

/* ============================================================== THE CAST */

const castGrid = byId('castGrid');
const cards = NAMES.map((id) => {
  const profile = CAST[id];
  const stage = stageOf(id);
  const card = make('article', 'card plate');
  card.tabIndex = 0;
  const well = make('div', 'well');
  const sprite = make('div', `sprite anim-${stage}`);
  sprite.style.animationDelay = `-${(seed(id) % 1000) / 300}s`;
  paint(sprite, poseArt(id, stage));
  well.append(sprite);
  const text = make('div');
  text.append(make('h3', '', nameOf(id)), make('p', '', profile?.tagline ?? ''));
  const said = make('p', 'bark', `* ${bark(id, 'idle', '…')}`);
  card.append(well, text, said);
  const dance = (on: boolean) => sprite.classList.toggle('dancing', on);
  card.addEventListener('mouseenter', () => dance(true));
  card.addEventListener('mouseleave', () => dance(false));
  card.addEventListener('focus', () => dance(true));
  card.addEventListener('blur', () => dance(false));
  castGrid.append(card);
  return card;
});
if (!calm) {
  utils.set(cards, { opacity: 0 });
  onFirstSight(castGrid, () => {
    animate(cards, {
      opacity: [0, 1],
      y: [40, 0],
      rotate: { from: () => utils.random(-4, 4), to: 0 },
      duration: 800,
      delay: stagger(70),
      ease: 'out(3)',
    });
  });
}

/* =========================================================== THE CAMERAS */

const pips = byId('pips');
const pipDots = Array.from({ length: CAMERA_UNLOCK_TASKS }, () => {
  const dot = make('i', 'well');
  pips.append(dot);
  return dot;
});
onFirstSight(pips, () => {
  pipDots.forEach((dot, i) => window.setTimeout(() => dot.classList.add('lit'), calm ? 0 : 400 + i * 140));
  if (!calm) animate(pipDots, { scale: [0.4, 1], duration: 400, delay: stagger(140, { start: 400 }), ease: 'outBack(3)' });
});
if (!calm) {
  animate('.pc-wrap .glow', { opacity: [0.3, 0.8], duration: 1600, alternate: true, loop: true, ease: 'inOut(2)' });
}

/* ========================================================== SPRITE = DATA */

const POSE_NAMES = ['TIPSY', 'ROUGH', 'MUTATING', 'FERAL'] as const;
const DATA_GUEST = 'guest-gary';
const pixels = byId('pixels');
const code = byId('code');
const pixelCells = Array.from({ length: 32 * 32 }, () => {
  const dot = make('i');
  pixels.append(dot);
  return dot;
});
let dataStage: MutationStage = 0;

function drawPose(stage: MutationStage, withMotion: boolean): void {
  const art = poseArt(DATA_GUEST, stage);
  code.textContent = `const ${POSE_NAMES[stage]}: PixelGrid = [\n${art.grid.map((row) => `  '${row}',`).join('\n')}\n];`;
  byId('poseName').textContent = `Stage ${stage} · ${MUTATION_META[stage].label}`;
  pixelCells.forEach((dot, i) => {
    const ch = art.grid[Math.floor(i / 32)]?.[i % 32] ?? '.';
    dot.style.background = art.palette[ch] ?? 'transparent';
  });
  if (withMotion && !calm) {
    animate(pixelCells, {
      scale: [0, 1],
      duration: 420,
      delay: stagger(14, { grid: [32, 32], from: 'center' }),
      ease: 'outBack(1.6)',
    });
  }
}

drawPose(0, false);
if (!calm) {
  utils.set(pixelCells, { scale: 0 });
  onFirstSight(pixels, () => drawPose(0, true));
}
byId('mutate').addEventListener('click', () => {
  dataStage = ((dataStage + 1) % 4) as MutationStage;
  drawPose(dataStage, true);
});

/* =============================================================== ROADMAP */

if (!calm) {
  animate('#roadLine', {
    scaleY: [0, 1],
    ease: 'linear',
    autoplay: onScroll({ target: '#roadmap', enter: 'bottom top', leave: 'center bottom', sync: 0.5 }),
  });
}

/* ================================================================ FINALE */

const finale = byId('crowd2');
NAMES.forEach((id, i) => {
  if (i === Math.floor(NAMES.length / 2)) {
    // The host, in the middle of it all: the only person here still trying.
    const hop = make('div', 'hop');
    const host = make('div', 'guest sprite anim-0');
    paint(host, hostArt());
    hop.append(host);
    finale.append(hop);
  }
  finale.append(crowdMember(id, Math.min(3, stageOf(id) + 1) as MutationStage));
});
if (!calm) {
  utils.set(finale.children, { opacity: 0 });
  onFirstSight(finale, () => {
    animate(finale.children, {
      opacity: [0, 1],
      y: [60, 0],
      duration: 700,
      delay: stagger(60, { from: 'center' }),
      ease: 'outBack(1.6)',
    });
  });
}

/* ================================================ FOLLOW THE DEVELOPMENT */

const timeline = byId('timeline');
const stops = MILESTONES.map((milestone) => {
  const item = make('li', milestone.now ? 'milestone now' : 'milestone');
  const node = make('span', 'node well');
  node.setAttribute('aria-hidden', 'true');
  const icon = make('span', 'sprite');
  paint(icon, milestone.icon);
  node.append(icon);

  let date: HTMLElement = make('span', 'when', 'Before git');
  if (milestone.when) {
    const time = make('time', '', calendarDate(milestone.when));
    time.dateTime = milestone.when;
    date = time;
  }
  const title = make('h3', '', milestone.title);
  if (milestone.now) title.append(' ', make('span', 'here', 'You are here'));
  item.append(node, date, title, make('p', '', milestone.text));
  if (milestone.link) {
    const link = make('a', '', `${milestone.link.label} →`);
    link.href = milestone.link.href;
    item.append(link);
  }
  timeline.append(item);
  return item;
});
// Built here rather than in the markup, so the generic [data-reveal] pass has
// already run; each stop brings itself in instead.
if (!calm) {
  utils.set(stops, { opacity: 0 });
  stops.forEach((stop) => {
    onFirstSight(stop, () => {
      animate(stop, { opacity: [0, 1], x: [-28, 0], duration: 700, ease: 'out(3)' });
    });
  });
}

const commitList = byId('commits');
function showCommits(commits: readonly Commit[]): void {
  if (commits.length === 0) throw new Error('GitHub sent no commits');
  commitList.replaceChildren(
    ...commits.map((commit) => {
      const item = make('li');
      const sha = make('a', 'sha', commit.sha.slice(0, 7));
      sha.href = commit.url;
      const title = make('span', 'commit-title');
      // Real spaces between the badges and the words, not just margins: a screen
      // reader would otherwise run them together.
      if (commit.merged) title.append(make('span', 'merged', 'Merged'), ' ');
      title.append(commit.title);
      const when = make('time', '', ago(commit.when));
      when.dateTime = commit.when;
      when.title = calendarDate(commit.when);
      item.append(sha, title, when);
      return item;
    }),
  );
}
// Asked for only once somebody scrolls this far: GitHub's anonymous allowance
// is small, and most visits never reach the log.
onFirstSight(commitList, () => {
  latestCommits(5)
    .then(showCommits)
    .catch(() => {
      const note = make('li', 'commit-note', "GitHub isn't answering right now. ");
      const link = make('a', '', 'The full history is over there.');
      link.href = `${REPO_URL}/commits/main`;
      note.append(link);
      commitList.replaceChildren(note);
    });
});

/* ============================================================ PIXEL BITS */

for (const problem of auditFont()) console.error(problem);

pixelCursors();
confetti(calm);
pixelWipe(calm);

// Every section label arrives the way an old display would print it.
document.querySelectorAll<HTMLElement>('.kicker').forEach((kicker) => {
  onFirstSight(kicker, () => decode(kicker, kicker.textContent ?? '', calm));
});

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** 52 is "fifty-two". The clock only ever reads between fifty-two and ninety-nine. */
function inWords(n: number): string {
  const tens = TENS[Math.floor(n / 10)] ?? '';
  const ones = ONES[n % 10] ?? '';
  return ones ? `${tens}-${ones}` : tens;
}

// The finale's hour is a toy: poke it and the party moves on an hour, and the
// label above it keeps up.
const finaleKicker = byId('finaleKicker');
const pixelButton = byId<HTMLButtonElement>('pixelWord');
pixelWord(pixelButton, byId<HTMLCanvasElement>('pixelWordCanvas'), calm, (stop) => {
  const line =
    stop.hour !== null
      ? `It's hour ${inWords(stop.hour)}`
      : stop.word === 'NOPE.'
        ? 'Nobody goes home'
        : 'Somebody suggests going home';
  decode(finaleKicker, line, calm);
  const spoken =
    stop.hour !== null ? `Hour ${stop.hour}.` : stop.word === 'NOPE.' ? 'Nope.' : 'Go home?';
  pixelButton.setAttribute('aria-label', `${spoken} Poke it to keep the party going.`);
});
