import { createInitialState, reducer, project, availableActions, type GameState, type Projection, type Msg } from '../../../src/game/state';
import { ACTION_MINUTES, ACTION_SUSPICION } from '../../../src/game/actions';
import { collectLights } from '../../../src/game/lights';
import { CAST, FAMILIARITY_STEPS } from '../../../src/game/cast';
import { personArt, furnitureArt } from '../../../src/art';
import { floorAt, floorPoint, floorNeighbours, adjacentOnFloor, stairsOnFloor, floorInfo, type FloorId } from '../../../src/data/floors';
import { placeAt } from '../../../src/data/rooms';
import { GRID_WIDTH as GW, HOUSE_X, HOUSE_Y, BUILDING_WIDTH } from '../../../src/data/houseMap';
import { INTERACTABLE_META, MUTATION_META, LURE_META, isWalkable, tileAt, guestAt, interactableAt, decorAt, type Guest, type Tile } from '../../../src/types/game';
import { buildLayer, localTile, T, FH, type Layer } from './world';
import { sprite, icon, hashStr } from './gfx';
import { propSprite, propFrame, foodSprite, emoteSprite, doorSprite, PROP_DEFS } from '../art/props';
import { personSprite, ANIM_FRAMES, type Anim, type View } from '../art/people';
import type { Sprite } from '../art/pix';

type P = { x: number; y: number };
type ToolId = 'hand' | 'snack' | 'talk' | 'shove' | 'lock';
const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ state */

let state: GameState = createInitialState();
let proj: Projection = project(state);
let mode: 'title' | 'play' | 'resolving' | 'over' = 'title';
let tool: ToolId = 'hand';
let groups: number[] = [];
let viewFloor: FloorId = floorAt(state.host.x, state.host.y);
let follow = true;
let selectedGuest: string | null = null;
let overlay: string | null = null;
let started = false;

const layers = {} as Record<FloorId, Layer>;
const decorByFloor = {} as Record<FloorId, { x: number; y: number; art: string; phase: number }[]>;
const doorsByFloor = {} as Record<FloorId, { x: number; y: number; ax: number; ay: number; kind: 'h' | 'v' }[]>;
/** Things whose new look is held back until the host has walked over and done the job. */
const holds = new Set<string>();
function buildWorld(): void {
  for (const f of ['ground', 'upper', 'basement'] as FloorId[]) {
    layers[f] = buildLayer(state.grid, state.decor, f);
    decorByFloor[f] = state.decor.filter((d) => !d.floorSize && floorAt(d.x, d.y) === f).map((d) => {
      const p = floorPoint(d);
      return { x: p.x, y: p.y, art: d.art, phase: hashStr(d.id) };
    });
    doorsByFloor[f] = [];
    for (const row of state.grid) for (const t of row) {
      if (!t.hasDoor || floorAt(t.x, t.y) !== f) continue;
      const p = floorPoint(t);
      const side = (dx: number) => localTile(state.grid, f, p.x + dx, p.y)?.kind;
      const h = side(-1) === 'wall' || side(1) === 'wall' || side(-1) === 'door' || side(1) === 'door';
      doorsByFloor[f].push({ x: p.x, y: p.y, ax: t.x, ay: t.y, kind: h ? 'h' : 'v' });
    }
  }
}

/* ----------------------------------------------------------------- actors */

interface Marker { act: Anim; dur: number; face: P; fire: () => void; t?: number; carry?: boolean }
type Step = P | Marker;
const isMarker = (s: Step): s is Marker => 'act' in s;
interface Actor {
  id: string; px: number; py: number; floor: FloorId; tx: number; ty: number; path: Step[];
  moving: boolean; view: View; facing: 1 | -1; dist: number; act: { anim: Anim; until: number } | null; alpha: number; gone: boolean; phase: number; stage: number; flash: number;
}
const actors = new Map<string, Actor>();
const centre = (a: P) => { const p = floorPoint(a); return { x: p.x * T + 8, y: p.y * T + 8 }; };

function makeActor(id: string, at: P, stage: number): Actor {
  const c = centre(at);
  return { id, px: c.x, py: c.y, floor: floorAt(at.x, at.y), tx: at.x, ty: at.y, path: [], moving: false, view: 'down', facing: 1, dist: 0, act: null, alpha: 1, gone: false, phase: hashStr(id) * 10, stage, flash: 0 };
}

function walkable(p: P): boolean {
  return isWalkable(state.grid, state.decor, p.x, p.y) && !guestAt(proj.guests, p.x, p.y);
}

function bfs(from: P, goal: (p: P) => boolean, pass: (p: P) => boolean = walkable, limit = 4000): P[] | null {
  if (goal(from)) return [];
  const key = (p: P) => p.y * 1000 + p.x;
  const prev = new Map<number, P | null>([[key(from), null]]);
  const queue: P[] = [from];
  let n = 0;
  while (queue.length > 0 && n < limit) {
    const cur = queue.shift()!;
    n += 1;
    for (const nb of floorNeighbours(state.grid, cur)) {
      const k = key(nb);
      if (prev.has(k)) continue;
      if (!pass(nb)) continue;
      const done = goal(nb);
      prev.set(k, cur);
      if (done) {
        const out: P[] = [nb];
        let c: P | null | undefined = cur;
        while (c && !(c.x === from.x && c.y === from.y)) { out.push(c); c = prev.get(key(c)); }
        return out.reverse();
      }
      queue.push(nb);
    }
  }
  return null;
}

function retarget(a: Actor, to: P, isHost: boolean): void {
  if (a.tx === to.x && a.ty === to.y) return;
  const from = { x: a.tx, y: a.ty };
  const toFloor = floorAt(to.x, to.y);
  a.tx = to.x; a.ty = to.y;
  if (toFloor !== floorAt(from.x, from.y)) {
    const c = centre(to);
    a.path = []; a.px = c.x; a.py = c.y; a.floor = toFloor;
    if (isHost) { fadeFloor(); }
    return;
  }
  if (adjacentOnFloor(from, to)) { a.path.push(to); return; }
  const route = bfs(from, (p) => p.x === to.x && p.y === to.y, (p) => isWalkable(state.grid, state.decor, p.x, p.y), 3000);
  if (route && route.length < 140) a.path.push(...route);
  else { const c = centre(to); a.path = []; a.px = c.x; a.py = c.y; }
}

function syncActors(): void {
  let host = actors.get('host');
  if (!host) { host = makeActor('host', proj.host, 0); actors.set('host', host); }
  retarget(host, proj.host, true);
  const live = new Set<string>(['host']);
  for (const g of proj.guests) {
    live.add(g.id);
    let a = actors.get(g.id);
    if (!a) { a = makeActor(g.id, g, g.mutationStage); actors.set(g.id, a); }
    if (g.mutationStage !== a.stage) { a.stage = g.mutationStage; a.flash = 1; puff(a.px, a.py - 12, '#b6f08a', 14); }
    if (!holds.has(g.id)) retarget(a, g, false);
  }
  for (const a of actors.values()) if (!live.has(a.id) && !a.gone) { a.gone = true; confetti(a.px, a.py - 10); }
}

function dispatch(msg: Msg): void {
  state = reducer(state, msg);
  proj = project(state);
  syncActors();
  hudDirty = true;
}

/* ------------------------------------------------------------------ sound */

let audio: AudioContext | null = null;
let muted = false;
function blip(freq: number, dur = 0.06, type: OscillatorType = 'square', vol = 0.035, slide = 0): void {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* sound is optional */ }
}
const sfx = {
  step: () => blip(150 + Math.random() * 40, 0.035, 'triangle', 0.025),
  act: () => { blip(520, 0.07, 'square', 0.03, 260); },
  deny: () => blip(150, 0.12, 'sawtooth', 0.03, -60),
  undo: () => blip(420, 0.07, 'triangle', 0.035, -180),
  hour: () => { blip(392, 0.14, 'triangle', 0.05); setTimeout(() => blip(523, 0.14, 'triangle', 0.05), 130); setTimeout(() => blip(659, 0.24, 'triangle', 0.05), 260); },
  talk: () => blip(300 + Math.random() * 160, 0.03, 'square', 0.015),
  gone: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'triangle', 0.05), i * 90)); },
};

/* -------------------------------------------------------------- particles */

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; kind?: 'note' }
const particles: Particle[] = [];
function puff(x: number, y: number, col: string, n = 8): void {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 22;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 8, life: 0, max: 0.5 + Math.random() * 0.3, col, size: 2 });
  }
}
function confetti(x: number, y: number): void {
  const cols = ['#f2d24a', '#6ac0e8', '#e8667a', '#f4f0e6', '#8ad08a'];
  for (let i = 0; i < 26; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 50, life: 0, max: 0.9 + Math.random() * 0.5, col: cols[i % cols.length]!, size: 2 });
  sfx.gone();
}
interface Floater { x: number; y: number; text: string; col: string; t: number }
const floaters: Floater[] = [];
function floatText(at: P, text: string, col: string, dy = 0): void {
  const c = centre(at);
  floaters.push({ x: c.x, y: c.y - 26 - dy, text, col, t: 0 });
}

/* -------------------------------------------------------------- the view */

const canvas = $<HTMLCanvasElement>('view');
const ctx = canvas.getContext('2d')!;
const lm = document.createElement('canvas');
const lctx = lm.getContext('2d')!;
let vw = 0, vh = 0, dpr = 1, S = 3, userZoom = 0;
const cam = { x: 0, y: 0 };
let floorFade = 0;
function fadeFloor(): void { floorFade = 1; viewFloor = floorAt(proj.host.x, proj.host.y); }

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  vw = Math.max(1, Math.round(cw * dpr)); vh = Math.max(1, Math.round(ch * dpr));
  if (canvas.width !== vw || canvas.height !== vh) { canvas.width = vw; canvas.height = vh; }
  const across = clamp(cw / 46, 10.5, 30);
  S = clamp(Math.max(1, Math.round(vw / (across * T))) + userZoom, 1, 12);
}

function camBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const L = layers[viewFloor];
  const hw = vw / 2 / S, hh = vh / 2 / S;
  let x0 = L.x0, x1 = L.x0 + L.w, y0 = L.y0, y1 = L.y0 + L.h;
  if (viewFloor !== 'ground') { x0 = (HOUSE_X - 4) * T; x1 = (HOUSE_X + BUILDING_WIDTH + 4) * T; y0 = (HOUSE_Y - 4) * T; y1 = (HOUSE_Y + 29) * T; }
  // leave room for the HUD at the bottom on small screens
  y1 += 60 / (S / dpr);
  const b = { minX: x0 + hw, maxX: x1 - hw, minY: y0 + hh, maxY: y1 - hh };
  if (b.minX > b.maxX) b.minX = b.maxX = (x0 + x1) / 2;
  if (b.minY > b.maxY) b.minY = b.maxY = (y0 + y1) / 2;
  return b;
}

/* ------------------------------------------------------------- intentions */

interface Intent { label: string; cost: number; path: P[]; tile: Tile; ok: boolean; why?: string; run: () => void; push?: P[] }
const stairTiles = (): { from: P; to: P; cells: P[]; up: boolean; dest: FloorId; walkout: boolean }[] =>
  (['ground', 'upper', 'basement'] as FloorId[]).flatMap((f) => stairsOnFloor(state.grid, f).map((s) => ({
    from: s.from, to: s.to, dest: s.destination, walkout: !!s.walkout,
    up: floorInfo(s.destination).level > floorInfo(f).level,
    cells: s.walkout ? [s.from] : [s.from, { x: s.from.x + 1, y: s.from.y }, { x: s.from.x, y: s.from.y + 1 }, { x: s.from.x + 1, y: s.from.y + 1 }],
  })));
let STAIRS: ReturnType<typeof stairTiles> = [];

function queueSteps(path: P[]): number {
  let n = 0;
  for (const step of path) {
    const tile = tileAt(state.grid, step.x, step.y);
    if (!tile) break;
    const opt = availableActions(state, proj, tile).find((o) => o.kind === 'move');
    if (!opt || opt.disabledReason) { if (opt?.disabledReason) toast(opt.disabledReason); break; }
    dispatch({ type: 'queueAction', option: opt, tile });
    n += 1;
  }
  return n;
}

function approach(tile: Tile): P[] | null {
  if (adjacentOnFloor(proj.host, tile) && !(proj.host.x === tile.x && proj.host.y === tile.y)) return [];
  return bfs(proj.host, (p) => adjacentOnFloor(p, tile) && !(p.x === tile.x && p.y === tile.y) && walkable(p));
}

function actionIntent(tile: Tile, kind: string, label: string): Intent {
  const path = approach(tile);
  const cost = ACTION_MINUTES[kind as keyof typeof ACTION_MINUTES] ?? 0;
  if (!path) return { label, cost, path: [], tile, ok: false, why: 'No way to get there.', run: () => deny('No way to get there.') };
  let push: P[] | undefined;
  if (kind === 'nudge' || kind === 'shove') {
    const stand = floorPoint(path.at(-1) ?? proj.host), g = floorPoint(tile);
    const dx = Math.sign(g.x - stand.x), dy = Math.sign(g.y - stand.y);
    push = Array.from({ length: kind === 'shove' ? 2 : 1 }, (_, i) => ({ x: g.x + dx * (i + 1), y: g.y + dy * (i + 1) }));
  }
  return {
    label, cost: cost + path.length, path, tile, ok: true, push,
    run: () => {
      const before = state.queue.length;
      const walked = queueSteps(path);
      if (walked === path.length) {
        const opt = availableActions(state, proj, tile).find((o) => o.kind === kind);
        if (!opt) deny('That cannot be done from here.');
        else if (opt.disabledReason) { toast(opt.disabledReason); sfx.deny(); }
        else {
          // The board changes when the host gets there and does it, not when you click.
          const hold = opt.targetId ?? `${kind}:${tile.x},${tile.y}`;
          holds.add(hold);
          dispatch({ type: 'queueAction', option: opt, tile });
          const anim: Anim = kind === 'nudge' ? 'talk' : kind === 'shove' ? 'shove' : 'act';
          actors.get('host')!.path.push({
            act: anim, dur: kind === 'nudge' ? 0.7 : kind === 'shove' ? 0.28 : 0.4, face: tile, carry: kind === 'snack',
            fire: () => {
              holds.delete(hold);
              syncActors();
              sfx.act();
              floatText(tile, `-${opt.cost} min`, '#ffe08a');
              const sus = ACTION_SUSPICION[opt.kind];
              if (sus > 0) floatText(tile, `+${sus} suspicion`, '#ff8a8a', 9);
              const c = centre(tile);
              puff(c.x, c.y - 8, kind === 'shove' ? '#ff9a6a' : '#ffe9b0', kind === 'shove' ? 12 : 6);
              const target = opt.targetId ? actors.get(opt.targetId) : undefined;
              if (target && kind === 'shove') { shake = 0.25; target.act = { anim: 'hurt', until: time + 0.7 }; }
              if (target && kind === 'nudge') target.act = { anim: 'talk', until: time + 0.6 };
            },
          });
        }
      }
      const added = state.queue.length - before;
      if (added > 0) groups.push(added);
      follow = true; viewFloor = floorAt(proj.host.x, proj.host.y);
    },
  };
}

function intentFor(tile: Tile): Intent | null {
  const g = guestAt(proj.guests, tile.x, tile.y);
  const it = interactableAt(proj.interactables, tile.x, tile.y);
  const stair = STAIRS.find((s) => s.cells.some((c) => c.x === tile.x && c.y === tile.y));
  const snack = proj.snacks.some((s) => s.x === tile.x && s.y === tile.y);
  const blocked = decorAt(state.decor, tile.x, tile.y)?.blocking === true;

  if (tool === 'talk' || tool === 'shove') {
    if (!g) return null;
    return actionIntent(tile, tool === 'talk' ? 'nudge' : 'shove', `${tool === 'talk' ? 'Talk to' : 'Shove'} ${g.name}`);
  }
  if (tool === 'lock') {
    if (!tile.hasDoor) return null;
    return actionIntent(tile, 'door', proj.lockedDoors.includes(`${tile.x},${tile.y}`) ? 'Unlock door' : 'Lock door');
  }
  if (tool === 'snack') {
    if (!tile.isPassable || g || it || snack || blocked) return null;
    return actionIntent(tile, 'snack', 'Put out a snack');
  }
  // hand
  if (g) return { label: g.name, cost: 0, path: [], tile, ok: true, run: () => selectGuest(g.id) };
  if (it) {
    const meta = INTERACTABLE_META[it.type];
    if (it.type === 'pc') return actionIntent(tile, 'cameras', 'Check the cameras');
    return actionIntent(tile, 'toggle', `${meta.label}: ${it.state === 'on' ? meta.stateLabels.off : meta.stateLabels.on}`);
  }
  if (stair) {
    const first = bfs(proj.host, (p) => p.x === stair.from.x && p.y === stair.from.y);
    if (!first) return null;
    return {
      label: `Stairs ${stair.up ? 'up' : 'down'} to ${floorInfo(stair.dest).name}`, cost: first.length + 1, path: first, tile, ok: true,
      run: () => { const n = queueSteps([...first, stair.to]); if (n > 0) { groups.push(n); sfx.act(); } follow = true; },
    };
  }
  if (!isWalkable(state.grid, state.decor, tile.x, tile.y)) return null;
  if (tile.x === proj.host.x && tile.y === proj.host.y) return null;
  const path = bfs(proj.host, (p) => p.x === tile.x && p.y === tile.y);
  if (!path) return null;
  return {
    label: 'Walk', cost: path.length, path, tile, ok: true,
    run: () => { const n = queueSteps(path); if (n > 0) groups.push(n); follow = true; viewFloor = floorAt(proj.host.x, proj.host.y); },
  };
}

function flushHolds(): void {
  holds.clear();
  const h = actors.get('host');
  if (h) h.path = h.path.filter((st) => !isMarker(st));
}
function undo(): void {
  if (mode !== 'play') return;
  flushHolds();
  const n = groups.pop();
  if (!n) { if (state.queue.length > 0) dispatch({ type: 'undoLast' }); else return; }
  else for (let i = 0; i < n; i += 1) dispatch({ type: 'undoLast' });
  sfx.undo(); follow = true; viewFloor = floorAt(proj.host.x, proj.host.y);
}

let shake = 0;
function deny(msg: string): void { toast(msg); sfx.deny(); }

/* ------------------------------------------------------------- end of hour */

interface Line { who: string | null; text: string }
let lines: Line[] = [];
let lineAt = 0, lineChars = 0, lineHold = 0;

function endHour(): void {
  if (mode !== 'play' || state.phase !== 'planning') return;
  const before = { logLen: state.log.length, sus: state.suspicion, turn: state.turn };
  mode = 'resolving'; groups = []; hover = null;
  flushHolds();
  document.body.classList.add('resolving');
  dispatch({ type: 'endTurn' });
  follow = true;
  window.setTimeout(() => {
    const sayings = new Map(state.guests.filter((g) => g.saying).map((g) => [g.saying as string, g.id]));
    const fresh = state.log.slice(before.logLen).filter((l) => !l.startsWith('—') && !l.startsWith('You:') && !l.startsWith('You stood'));
    dispatch({ type: 'resolutionComplete' });
    document.body.classList.remove('resolving');
    mode = 'play';
    sfx.hour();
    banner(`Hour ${51 + state.turn}`, clockText());
    const delta = state.suspicion - before.sus;
    if (delta > 0) hudFloat(`+${delta}`);
    const wins = layers.ground.windows;
    const litBefore = Math.round((before.sus / 100) * wins.length), litNow = Math.round((state.suspicion / 100) * wins.length);
    if (litNow > litBefore && floorAt(state.host.x, state.host.y) === 'ground') {
      const w = wins.find((x) => x.order === litNow - 1);
      if (w) { glance = { x: w.x + 11, y: w.y + 60, t: 2.1 }; toast('A light comes on across the road.'); }
    }
    const all = fresh.map((text) => ({ who: sayings.get(text) ?? null, text }));
    lines = [...all.filter((l) => l.who), ...all.filter((l) => !l.who)].slice(0, 5);
    lineAt = 0; lineChars = 0; lineHold = 0;
    if (state.suspicion >= 100) finish(false);
    else if (state.guests.length === 0) finish(true);
  }, 1500);
}

function finish(won: boolean): void {
  mode = 'over';
  $('end-title').textContent = won ? 'Everyone went home' : 'Somebody made the call';
  $('end-text').textContent = won
    ? `The last guest reached the street on hour ${51 + state.turn}. Nobody was hurt and nobody phoned anyone.`
    : `Every window on the street is lit. Hour ${51 + state.turn}, ${state.guests.length} guests still inside.`;
  openOverlay('end');
}

function restart(): void {
  state = createInitialState(); proj = project(state);
  actors.clear(); groups = []; lines = []; selectedGuest = null; tool = 'hand';
  syncActors(); mode = 'play'; follow = true; viewFloor = floorAt(proj.host.x, proj.host.y);
  const h = actors.get('host')!; cam.x = h.px; cam.y = h.py;
  $('guests').innerHTML = ''; chips.clear();
  closeOverlay(); hudDirty = true;
}

/* -------------------------------------------------------------------- HUD */

let hudDirty = true;
const STAGE_COL = ['#86cf7c', '#ecc55a', '#f08c3c', '#e2506c'];
const chips = new Map<string, { el: HTMLButtonElement; stage: number; bar: HTMLElement }>();

function portrait(id: string, stage: number, size: number): HTMLCanvasElement {
  const src = personSprite(id, stage, 'idle', 0, 'down').base;
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 16; cv.style.width = cv.style.height = `${size}px`;
  cv.getContext('2d')!.drawImage(src, 8, 1, 16, 16, 0, 0, 16, 16);
  return cv;
}

function clockText(): string {
  const total = (state.turn - 1) * 60 + Math.max(0, state.budget - state.minutes);
  const h24 = Math.floor(total / 60) % 24, m = total % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function susWord(v: number): string {
  if (v < 25) return 'The street is asleep';
  if (v < 50) return 'Curtains are twitching';
  if (v < 75) return 'Lights are coming on';
  if (v < 100) return 'Somebody is dialling';
  return 'They called it in';
}

function renderHud(): void {
  hudDirty = false;
  $('p-night').textContent = `Night ${state.day} · hour ${51 + state.turn}`;
  $('p-time').textContent = clockText();
  const left = state.minutes;
  ($('p-min-fill') as HTMLElement).style.width = `${clamp(left / Math.max(60, state.budget), 0, 1) * 100}%`;
  $('p-min-fill').classList.toggle('debt', left < 0);
  $('p-min-text').textContent = left > 0 ? `${left} min left` : left === 0 ? 'Hour spent' : `${-left} min borrowed`;
  $('p-carry').textContent = state.carry > 0 ? `+${state.carry} banked` : state.carry < 0 ? `${state.carry} owed` : '';

  const pips = $('p-sus-pips');
  if (pips.childElementCount !== 12) { pips.innerHTML = ''; for (let i = 0; i < 12; i += 1) pips.appendChild(document.createElement('i')); }
  const lit = Math.round((state.suspicion / 100) * 12), planned = Math.round((proj.suspicion / 100) * 12);
  [...pips.children].forEach((el, i) => { el.className = i < lit ? 'on' : i < planned ? 'soon' : ''; });
  $('p-sus-text').textContent = `${proj.suspicion}% · ${susWord(proj.suspicion)}`;

  document.querySelectorAll<HTMLButtonElement>('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  const moves = state.queue.filter((q) => q.kind === 'move').length, jobs = state.queue.length - moves;
  const spent = state.queue.reduce((s, q) => s + q.cost, 0);
  $('plan').textContent = state.queue.length === 0 ? 'Nothing planned yet' : `Plan: ${moves} step${moves === 1 ? '' : 's'}${jobs ? `, ${jobs} job${jobs === 1 ? '' : 's'}` : ''} · ${spent} min`;
  ($('btn-undo') as HTMLButtonElement).disabled = state.queue.length === 0 || mode !== 'play';
  ($('btn-end') as HTMLButtonElement).disabled = mode !== 'play';
  $('home-count').textContent = `${state.departed.length} of ${state.departed.length + state.guests.length} home`;

  // guest strip
  const strip = $('guests');
  const here = new Set(proj.guests.map((g) => g.id));
  for (const [id, chip] of chips) if (!here.has(id)) { chip.el.remove(); chips.delete(id); }
  for (const g of proj.guests) {
    let chip = chips.get(g.id);
    if (!chip || chip.stage !== g.mutationStage) {
      const el = chip?.el ?? document.createElement('button');
      el.type = 'button'; el.className = 'chip'; el.innerHTML = '';
      el.appendChild(portrait(g.id, g.mutationStage, 32));
      const bar = document.createElement('span'); bar.className = 'agi'; el.appendChild(bar);
      const tag = document.createElement('span'); tag.className = 'flr'; el.appendChild(tag);
      if (!chip) { el.addEventListener('click', () => selectGuest(g.id)); strip.appendChild(el); }
      chip = { el, stage: g.mutationStage, bar };
      chips.set(g.id, chip);
    }
    chip.el.style.setProperty('--ring', STAGE_COL[g.mutationStage]!);
    chip.el.setAttribute('aria-label', `${g.name}, ${MUTATION_META[g.mutationStage].label}, agitation ${g.agitationLevel}`);
    chip.el.title = `${g.name} · ${MUTATION_META[g.mutationStage].label}`;
    chip.el.setAttribute('aria-pressed', String(selectedGuest === g.id));
    chip.bar.style.setProperty('--v', `${g.agitationLevel}%`);
    const f = floorAt(g.x, g.y), hf = floorAt(proj.host.x, proj.host.y);
    (chip.el.querySelector('.flr') as HTMLElement).textContent = f === hf ? '' : floorInfo(f).level > floorInfo(hf).level ? '▲' : '▼';
  }

  // stairs prompt
  const st = STAIRS.find((s) => s.from.x === proj.host.x && s.from.y === proj.host.y);
  const sp = $<HTMLButtonElement>('stairs-prompt');
  sp.hidden = !st || mode !== 'play';
  if (st) sp.textContent = `${st.up ? '▲' : '▼'} Take the stairs to ${floorInfo(st.dest).name} · 1 min`;
  $('btn-host').hidden = follow;

  renderCard();
}

function renderCard(): void {
  const card = $('card');
  const g = selectedGuest ? proj.guests.find((x) => x.id === selectedGuest) : undefined;
  card.hidden = !g;
  if (!g) return;
  const profile = CAST[g.id];
  const unlocked = FAMILIARITY_STEPS.filter((s) => g.familiarity >= s).length;
  $('card-face').innerHTML = '';
  $('card-face').appendChild(portrait(g.id, g.mutationStage, 64));
  $('card-name').textContent = g.name;
  $('card-tag').textContent = profile?.tagline ?? '';
  $('card-stage').textContent = MUTATION_META[g.mutationStage].label;
  ($('card-stage') as HTMLElement).style.color = STAGE_COL[g.mutationStage]!;
  ($('card-agi') as HTMLElement).style.setProperty('--v', `${g.agitationLevel}%`);
  $('card-agi-n').textContent = `${g.agitationLevel}`;
  $('card-lure').textContent = g.profiled ? `${LURE_META[g.hiddenLure].label}. ${LURE_META[g.hiddenLure].hint}` : 'Unknown. Watch what they walk toward, or catch them on the cameras.';
  const notes = $('card-notes');
  notes.innerHTML = '';
  (profile?.dossier ?? []).slice(0, unlocked).forEach((t) => { const li = document.createElement('li'); li.textContent = t; notes.appendChild(li); });
  if (unlocked < (profile?.dossier.length ?? 0)) { const li = document.createElement('li'); li.className = 'locked'; li.textContent = 'Spend an hour near them to learn more.'; notes.appendChild(li); }
}

function selectGuest(id: string | null): void {
  selectedGuest = id;
  if (id) {
    const g = proj.guests.find((x) => x.id === id), a = actors.get(id);
    if (g && a) { follow = false; viewFloor = a.floor; panTo = { x: a.px, y: a.py - 10 }; }
  }
  hudDirty = true;
}
let panTo: P | null = null;
let glance: { x: number; y: number; t: number } | null = null;

function cardAction(kind: 'nudge' | 'shove'): void {
  const g = proj.guests.find((x) => x.id === selectedGuest);
  const tile = g && tileAt(state.grid, g.x, g.y);
  if (!g || !tile || mode !== 'play') return;
  actionIntent(tile, kind, '').run();
  selectedGuest = null; hudDirty = true;
}

let toastTimer = 0;
function toast(msg: string): void {
  const el = $('toast');
  el.textContent = msg; el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}
function banner(title: string, sub: string): void {
  const el = $('banner');
  $('banner-title').textContent = title; $('banner-sub').textContent = sub;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function hudFloat(text: string): void {
  const el = $('sus-float');
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
let lastRoom = '';
function roomToast(): void {
  const name = placeAt(state.grid, proj.host.x, proj.host.y).name;
  if (name === lastRoom) return;
  lastRoom = name;
  const el = $('room-toast');
  el.textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function openOverlay(name: string): void {
  overlay = name;
  document.querySelectorAll<HTMLElement>('.overlay').forEach((o) => { o.hidden = o.id !== `ov-${name}`; });
  if (name === 'journal') {
    const body = $('journal-body'); body.innerHTML = '';
    for (const l of state.log) { const p = document.createElement('p'); p.textContent = l; if (l.startsWith('—')) p.className = 'turn'; body.appendChild(p); }
    body.scrollTop = body.scrollHeight;
  }
  if (name === 'map') drawMap();
  ($(`ov-${name}`).querySelector('[data-close], .primary') as HTMLElement | null)?.focus?.();
}
function closeOverlay(): void {
  overlay = null;
  document.querySelectorAll<HTMLElement>('.overlay').forEach((o) => { o.hidden = true; });
}

/* -------------------------------------------------------------------- map */

const MAP_FLOORS: FloorId[] = ['upper', 'ground', 'basement'];
let mapRects: { f: FloorId; x: number; y: number; s: number; sx: number; sy: number; w: number; h: number }[] = [];
function drawMap(): void {
  const cv = $<HTMLCanvasElement>('map');
  const cssW = Math.min(920, cv.parentElement!.clientWidth);
  const srcs = MAP_FLOORS.map((f) => f === 'ground'
    ? { f, sx: -2 * T, sy: -1 * T, w: (GW + 4) * T, h: (FH + 2) * T }
    : { f, sx: (HOUSE_X - 1) * T, sy: (HOUSE_Y - 1) * T, w: (BUILDING_WIDTH + 2) * T, h: 27 * T });
  const s = cssW / ((GW + 4) * T);
  const gap = 34;
  const total = srcs.reduce((a, r) => a + r.h * s + gap, 0);
  const d = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(cssW * d); cv.height = Math.round(total * d);
  cv.style.width = `${cssW}px`; cv.style.height = `${total}px`;
  const m = cv.getContext('2d')!;
  m.setTransform(d, 0, 0, d, 0, 0);
  m.imageSmoothingEnabled = true; m.imageSmoothingQuality = 'high';
  mapRects = [];
  let y = 0;
  for (const r of srcs) {
    const L = layers[r.f];
    const x = (cssW - r.w * s) / 2;
    m.fillStyle = '#f3e6c4'; m.font = '600 15px "Pixelify Sans", system-ui, sans-serif'; m.textBaseline = 'top';
    const here = floorAt(proj.host.x, proj.host.y) === r.f;
    m.fillText(`${floorInfo(r.f).name}${here ? '  · you are here' : ''}`, x, y + 6);
    y += gap - 6;
    m.drawImage(L.canvas, r.sx - L.x0, r.sy - L.y0, r.w, r.h, x, y, r.w * s, r.h * s);
    m.fillStyle = 'rgba(20,14,34,.28)'; m.fillRect(x, y, r.w * s, r.h * s);
    mapRects.push({ f: r.f, x, y, s, sx: r.sx, sy: r.sy, w: r.w * s, h: r.h * s });
    for (const a of actors.values()) {
      if (a.floor !== r.f || a.gone) continue;
      const px = x + (a.px - r.sx) * s, py = y + (a.py - r.sy) * s;
      m.beginPath(); m.arc(px, py - 3, a.id === 'host' ? 6 : 5, 0, Math.PI * 2);
      m.fillStyle = a.id === 'host' ? '#7fe6da' : STAGE_COL[a.stage]!; m.fill();
      m.lineWidth = 2; m.strokeStyle = '#1a1420'; m.stroke();
    }
    y += r.h * s + 6;
  }
}

/* ------------------------------------------------------------------ input */

let hover: Intent | null = null;
let hoverKey = '';
let pointer = { x: 0, y: 0, down: false, sx: 0, sy: 0, drag: false, mouse: false, cx: 0, cy: 0 };

function worldAt(clientX: number, clientY: number): P {
  const r = canvas.getBoundingClientRect();
  const dx = (clientX - r.left) * dpr, dy = (clientY - r.top) * dpr;
  return { x: (dx - vw / 2) / S + cam.x, y: (dy - vh / 2) / S + cam.y };
}
function tileAtWorld(w: P): Tile | undefined {
  // People are tall: a click on a head counts as a click on the person.
  for (const g of proj.guests) {
    const a = actors.get(g.id);
    if (!a || a.floor !== viewFloor) continue;
    if (Math.abs(w.x - a.px) < 7 && w.y > a.py - 23 && w.y < a.py + 5) return tileAt(state.grid, g.x, g.y);
  }
  for (const it of proj.interactables) {
    if (floorAt(it.x, it.y) !== viewFloor) continue;
    const c = centre(it);
    if (Math.abs(w.x - c.x) < 9 && w.y > c.y - 16 && w.y < c.y + 10) return tileAt(state.grid, it.x, it.y);
  }
  return localTile(state.grid, viewFloor, Math.floor(w.x / T), Math.floor(w.y / T));
}

canvas.addEventListener('pointerdown', (e) => {
  glance = null;
  pointer = { ...pointer, down: true, sx: e.clientX, sy: e.clientY, drag: false, mouse: e.pointerType === 'mouse', cx: cam.x, cy: cam.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.mouse = e.pointerType === 'mouse';
  if (pointer.down) {
    const dx = e.clientX - pointer.sx, dy = e.clientY - pointer.sy;
    if (!pointer.drag && Math.hypot(dx, dy) > 8) { pointer.drag = true; follow = false; panTo = null; hudDirty = true; }
    if (pointer.drag) { cam.x = pointer.cx - (dx * dpr) / S; cam.y = pointer.cy - (dy * dpr) / S; }
    return;
  }
  if (mode !== 'play' || !pointer.mouse) { hover = null; return; }
  const tile = tileAtWorld(worldAt(e.clientX, e.clientY));
  const key = tile ? `${tile.x},${tile.y},${tool},${state.queue.length}` : '';
  if (key === hoverKey) return;
  hoverKey = key;
  hover = tile ? intentFor(tile) : null;
  canvas.style.cursor = hover ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; hoverKey = ''; });
canvas.addEventListener('pointerup', (e) => {
  const wasDrag = pointer.drag;
  pointer.down = false; pointer.drag = false;
  if (wasDrag || mode !== 'play') return;
  const tile = tileAtWorld(worldAt(e.clientX, e.clientY));
  if (!tile) { selectGuest(null); return; }
  const intent = intentFor(tile);
  if (!intent) {
    if (selectedGuest) selectGuest(null);
    else if (tool !== 'hand') toast(TOOL_HINT[tool]);
    return;
  }
  intent.run();
  hoverKey = ''; hover = null;
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });

let zoomAt = 0;
function zoom(d: number): void {
  const now = performance.now();
  if (now - zoomAt < 140) return;
  zoomAt = now;
  const before = S;
  userZoom = clamp(userZoom + d, -6, 6);
  resize();
  if (S === before) userZoom -= d;
}

const TOOL_HINT: Record<ToolId, string> = {
  hand: 'Click a floor tile to walk there, or a thing to use it.',
  snack: 'Snack: click an empty floor tile.',
  talk: 'Talk: click a guest. They step away from you.',
  shove: 'Shove: click a guest. Fast, loud, two tiles.',
  lock: 'Lock: click a doorway.',
};
function setTool(t: ToolId): void { tool = t; hoverKey = ''; hudDirty = true; toast(TOOL_HINT[t]); blip(660, 0.03, 'square', 0.02); }

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (overlay) { if (k === 'escape' || (k === 'enter' && overlay === 'title')) { if (!started) start(); else if (overlay !== 'end') closeOverlay(); } return; }
  if (mode !== 'play') return;
  const dirs: Record<string, 'up' | 'down' | 'left' | 'right'> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  if (dirs[k]) {
    e.preventDefault();
    const n = state.queue.length;
    dispatch({ type: 'queueMove', direction: dirs[k]! });
    if (state.queue.length > n) { groups.push(1); follow = true; viewFloor = floorAt(proj.host.x, proj.host.y); }
    return;
  }
  const tools: Record<string, ToolId> = { '1': 'hand', '2': 'snack', '3': 'talk', '4': 'shove', '5': 'lock' };
  if (tools[k]) { setTool(tools[k]!); return; }
  if (k === 'z' || k === 'backspace') { e.preventDefault(); undo(); }
  else if (k === 'enter') { e.preventDefault(); endHour(); }
  else if (k === 'f') { follow = true; viewFloor = floorAt(proj.host.x, proj.host.y); hudDirty = true; }
  else if (k === 'm') openOverlay('map');
  else if (k === 'j') openOverlay('journal');
  else if (k === 'e') takeStairs();
  else if (k === ' ') { e.preventDefault(); nextLine(); }
  else if (k === 'escape') { if (selectedGuest) selectGuest(null); else if (tool !== 'hand') setTool('hand'); }
});

function takeStairs(): void {
  const st = STAIRS.find((s) => s.from.x === proj.host.x && s.from.y === proj.host.y);
  if (!st || mode !== 'play') return;
  const n = queueSteps([st.to]);
  if (n > 0) { groups.push(n); sfx.act(); }
}

function nextLine(): void {
  if (lineAt >= lines.length) return;
  const l = lines[lineAt]!;
  if (lineChars < l.text.length) lineChars = l.text.length;
  else { lineAt += 1; lineChars = 0; lineHold = 0; }
}

function start(): void {
  started = true;
  document.body.classList.remove('title');
  closeOverlay();
  mode = 'play'; follow = true;
  lines = [
    { who: null, text: 'It is hour fifty-two. Twelve guests, none of them leaving. Click anywhere to walk: every tile costs a minute.' },
    { who: null, text: 'Pick a tool at the bottom, then click a target. Nothing happens until you press End Hour, and anything can be undone.' },
    { who: null, text: 'Watch the windows across the street. Every light that comes on is a neighbour paying attention.' },
  ];
  lineAt = 0; lineChars = 0; lineHold = 0;
  blip(523, 0.1, 'triangle', 0.04);
  hudDirty = true;
}

function wire(): void {
  document.querySelectorAll<HTMLButtonElement>('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as ToolId)));
  $('btn-undo').addEventListener('click', undo);
  $('btn-end').addEventListener('click', endHour);
  $('btn-map').addEventListener('click', () => openOverlay('map'));
  $('btn-journal').addEventListener('click', () => openOverlay('journal'));
  $('btn-notes').addEventListener('click', () => openOverlay('notes'));
  $('btn-art').addEventListener('click', () => openOverlay('art'));
  $('btn-sound').addEventListener('click', () => { muted = !muted; $('btn-sound').textContent = muted ? 'Sound off' : 'Sound on'; $('btn-sound').setAttribute('aria-pressed', String(!muted)); });
  $('btn-zin').addEventListener('click', () => zoom(1));
  $('btn-zout').addEventListener('click', () => zoom(-1));
  $('btn-host').addEventListener('click', () => { follow = true; viewFloor = floorAt(proj.host.x, proj.host.y); selectedGuest = null; hudDirty = true; });
  $('stairs-prompt').addEventListener('click', takeStairs);
  $('dialogue').addEventListener('click', nextLine);
  $('btn-play').addEventListener('click', start);
  $('btn-read').addEventListener('click', () => openOverlay('notes'));
  $('btn-again').addEventListener('click', restart);
  $('card-talk').addEventListener('click', () => cardAction('nudge'));
  $('card-shove').addEventListener('click', () => cardAction('shove'));
  $('card-close').addEventListener('click', () => selectGuest(null));
  document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) => b.addEventListener('click', () => { if (!started) start(); else closeOverlay(); }));
  $('map').addEventListener('click', (e) => {
    const r = $('map').getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = mapRects.find((m) => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);
    if (!hit) return;
    viewFloor = hit.f; follow = false; selectedGuest = null;
    cam.x = hit.sx + (x - hit.x) / hit.s; cam.y = hit.sy + (y - hit.y) / hit.s; panTo = null;
    closeOverlay(); hudDirty = true;
  });
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  // tool icons
  const PAL = { o: '#1c1420', w: '#f6efdc', r: '#f0703c', g: '#e8c35a', k: '#8c8494' };
  const ICONS: Record<string, string[]> = {
    hand: ['o...........', 'oo..........', 'owo.........', 'owwo........', 'owwwo.......', 'owwwwo......', 'owwwwwo.....', 'owwwwwwo....', 'owwwwooo....', 'owowwo......', 'oo.owwo.....', '....owwo....', '.....oo.....'],
    talk: ['..oooooooooo..', '.owwwwwwwwwwo.', 'owwwwwwwwwwwwo', 'owwkkwkkwkkwwo', 'owwkkwkkwkkwwo', 'owwwwwwwwwwwwo', '.owwwwwwwwwwo.', '..ooowwooooo..', '....owo.......', '....oo........'],
    shove: ['.oo....oo.....', '.oro...oro....', '..oro...oro...', '...oro...oro..', '....oro...oro.', '...oro...oro..', '..oro...oro...', '.oro...oro....', '.oo....oo.....'],
    lock: ['....oooo....', '...ok..ko...', '...ok..ko...', '...ok..ko...', '.oooooooooo.', '.oggggggggo.', '.ogggoogggo.', '.ogggoogggo.', '.oggggggggo.', '.oooooooooo.'],
  };
  for (const [name, rows] of Object.entries(ICONS)) {
    const width = Math.max(...rows.map((r) => r.length));
    const cv = icon(name, rows.map((r) => r.padEnd(width, '.')), PAL);
    const holder = document.querySelector(`.tool[data-tool="${name}"] .ico`);
    if (holder) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d')!.drawImage(cv, 0, 0); c.style.width = `${cv.width * 2}px`; c.style.height = `${cv.height * 2}px`; holder.appendChild(c); }
  }
  const snack = foodSprite('pizza').base;
  const sc = document.createElement('canvas'); sc.width = 20; sc.height = 20; sc.getContext('2d')!.drawImage(snack, 6, 6, 20, 20, 0, 0, 20, 20);
  sc.style.width = '30px'; sc.style.height = '30px';
  document.querySelector('.tool[data-tool="snack"] .ico')?.appendChild(sc);
}

/* ----------------------------------------------------------------- render */

let last = performance.now();
let time = 0;

function frameOf(a: Actor, g: Guest | undefined): Sprite {
  const stage = a.id === 'host' ? 0 : a.stage;
  const speaking = lineAt < lines.length && lines[lineAt]!.who === a.id;
  if (a.act) return personSprite(a.id, stage, a.act.anim, Math.floor(time * 6), a.view);
  if (a.moving) {
    const carrying = a.id === 'host' && a.path.some((st) => isMarker(st) && st.carry);
    return personSprite(a.id, stage, carrying ? 'carry' : 'walk', Math.floor(a.dist / 5), a.view);
  }
  if (a.gone) return personSprite(a.id, stage, 'wave', Math.floor(time * 5), 'down');
  if (g?.dancing) return personSprite(a.id, stage, 'dance', Math.floor(time * 4.2 + a.phase), 'down');
  if (speaking) return personSprite(a.id, stage, 'talk', Math.floor(time * 4), 'down');
  const blink = (time + a.phase) % 3.7 < 0.13;
  return personSprite(a.id, stage, 'idle', Math.floor(time * 1.4 + a.phase), a.view, blink);
}

function update(dt: number): void {
  time += dt;
  for (const a of actors.values()) {
    if (a.gone) { a.alpha -= dt * 1.4; if (a.alpha <= 0) actors.delete(a.id); continue; }
    a.flash = Math.max(0, a.flash - dt * 1.6);
    if (a.act && time > a.act.until) a.act = null;
    const next = a.path[0];
    a.moving = !!next && !isMarker(next);
    if (!next) {
      // People standing about look around now and then.
      if (a.id !== 'host' && !a.act) {
        const beat = Math.floor((time + a.phase * 3) / 4.5);
        const pick = Math.floor(hashStr(a.id + beat) * 5);
        a.view = pick === 0 ? 'up' : pick < 3 ? 'side' : 'down';
        if (pick === 1) a.facing = 1; else if (pick === 2) a.facing = -1;
      }
      continue;
    }
    if (isMarker(next)) {
      if (next.t === undefined) {
        next.t = 0;
        const me = floorPoint({ x: a.tx, y: a.ty }), to = floorPoint(next.face);
        const fx = to.x - me.x, fy = to.y - me.y;
        a.view = Math.abs(fx) >= Math.abs(fy) && fx !== 0 ? 'side' : fy < 0 ? 'up' : 'down';
        if (fx !== 0) a.facing = fx > 0 ? 1 : -1;
        a.act = { anim: next.act, until: time + next.dur + 0.12 };
      }
      next.t += dt;
      if (next.t >= next.dur) { a.path.shift(); next.fire(); }
      continue;
    }
    const c = centre(next);
    const dx = c.x - a.px, dy = c.y - a.py;
    const dist = Math.hypot(dx, dy);
    const hurt = a.act?.anim === 'hurt';
    const pace = a.id === 'host' ? Math.max(7.5, a.path.length * 2.2) : hurt ? 7 : [3.2, 2.7, 2.1, 4.4][a.stage] ?? 3;
    const step = pace * T * dt;
    if (!hurt) {
      a.view = Math.abs(dx) >= Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
      if (Math.abs(dx) > 0.5) a.facing = dx > 0 ? 1 : -1;
    }
    a.dist += Math.min(step, dist);
    if (dist <= step) {
      a.px = c.x; a.py = c.y; a.path.shift();
      if (a.id === 'host' && mode === 'play') sfx.step();
      if (hurt && a.path.length === 0) puff(a.px, a.py, '#d8d0c0', 5);
    } else { a.px += (dx / dist) * step; a.py += (dy / dist) * step; }
  }
  const host = actors.get('host');
  if (mode === 'title') {
    cam.x = (HOUSE_X + 28) * T + Math.sin(time * 0.1) * 330; cam.y = 22 + Math.cos(time * 0.08) * 26;
  } else if (glance) {
    const k = 1 - Math.exp(-dt * 5);
    cam.x += (glance.x - cam.x) * k; cam.y += (glance.y - cam.y) * k;
    glance.t -= dt; if (glance.t <= 0) glance = null;
  } else if (follow && host) {
    const k = 1 - Math.exp(-dt * 7);
    cam.x += (host.px - cam.x) * k; cam.y += (host.py - 6 - cam.y) * k;
  } else if (panTo) {
    const k = 1 - Math.exp(-dt * 7);
    cam.x += (panTo.x - cam.x) * k; cam.y += (panTo.y - cam.y) * k;
  }
  const b = camBounds();
  cam.x = clamp(cam.x, b.minX, b.maxX); cam.y = clamp(cam.y, b.minY, b.maxY);
  shake = Math.max(0, shake - dt);
  floorFade = Math.max(0, floorFade - dt * 2.2);

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i]!;
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind !== 'note') p.vy += 60 * dt;
    if (p.life >= p.max) particles.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i -= 1) { floaters[i]!.t += dt; if (floaters[i]!.t > 1.3) floaters.splice(i, 1); }
  // the speaker throws notes while it plays
  for (const it of proj.interactables) {
    if (it.type !== 'speaker' || it.state !== 'on' || floorAt(it.x, it.y) !== viewFloor) continue;
    if (Math.random() < dt * 3) { const c = centre(it); particles.push({ x: c.x + (Math.random() - 0.5) * 10, y: c.y - 14, vx: (Math.random() - 0.5) * 14, vy: -18, life: 0, max: 1.5, col: '#ffd0f0', size: 2, kind: 'note' }); }
  }

  // dialogue box
  const dlg = $('dialogue');
  if (lineAt < lines.length && mode !== 'title') {
    const l = lines[lineAt]!;
    const prev = Math.floor(lineChars);
    if (lineChars < l.text.length) { lineChars += dt * 46; if (Math.floor(lineChars) > prev && Math.floor(lineChars) % 3 === 0) sfx.talk(); }
    else { lineHold += dt; if (lineHold > 2.0 + l.text.length * 0.028) nextLine(); }
    if (dlg.hidden || dlg.dataset.i !== String(lineAt)) {
      dlg.hidden = false; dlg.dataset.i = String(lineAt);
      const face = $('dlg-face'); face.innerHTML = '';
      const g = l.who ? state.guests.find((x) => x.id === l.who) : undefined;
      if (g) { face.appendChild(portrait(g.id, g.mutationStage, 56)); $('dlg-name').textContent = g.name; face.hidden = false; }
      else { face.hidden = true; $('dlg-name').textContent = 'The house'; }
      $('dlg-count').textContent = `${lineAt + 1}/${lines.length}`;
    }
    $('dlg-text').textContent = l.text.slice(0, Math.floor(lineChars));
  } else if (!dlg.hidden) dlg.hidden = true;

  if (mode === 'play') roomToast();
  if (hudDirty) renderHud();
}

function render(): void {
  const L = layers[viewFloor];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = viewFloor === 'ground' ? '#0d1226' : '#100c16';
  ctx.fillRect(0, 0, vw, vh);
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake * 16) : 0;
  const ox = Math.round(vw / 2 - cam.x * S) + sx, oy = Math.round(vh / 2 - cam.y * S);
  const X = (wx: number) => ox + wx * S, Y = (wy: number) => oy + wy * S;
  ctx.drawImage(L.canvas, X(L.x0), Y(L.y0), L.w * S, L.h * S);

  const on = (p: P) => floorAt(p.x, p.y) === viewFloor;
  const rect = (wx: number, wy: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(X(wx), Y(wy), w * S, h * S); };

  // the plan so far: a trail from where the hour began
  if (mode !== 'title') {
    ctx.globalAlpha = 0.75;
    for (const q of state.queue) {
      if (q.kind !== 'move' || !on(q)) continue;
      const c = centre(q);
      rect(c.x - 1.5, c.y - 1, 3, 2, '#ffe08a');
    }
    ctx.globalAlpha = 1;
  }
  // hover: the route this click would take, and what it costs
  if (hover && mode === 'play') {
    for (const st of hover.path) { if (!on(st)) continue; const c = centre(st); rect(c.x - 1.5, c.y - 1.5, 3, 3, '#7fe6da'); }
    for (const p of hover.push ?? []) rect(p.x * T + 5, p.y * T + 5, 6, 6, 'rgba(255,140,110,.8)');
    const p = floorPoint(hover.tile);
    bracket(X(p.x * T), Y(p.y * T), T * S, hover.ok ? '#7fe6da' : '#ff8a8a');
  }

  // everything that stands up, sorted back to front
  type Item = { key: number; draw: () => void };
  const items: Item[] = [];
  const viewT = (wy: number) => Y(wy);
  const minY = cam.y - vh / 2 / S - 40, maxY = cam.y + vh / 2 / S + 40, minX = cam.x - vw / 2 / S - 40, maxX = cam.x + vw / 2 / S + 40;
  const glows: { cv: HTMLCanvasElement; wx: number; wy: number }[] = [];
  const shadowOf = (id: string, wx: number, wy: number) => {
    const sh = PROP_DEFS[id]?.shadow;
    if (sh) { ctx.fillStyle = 'rgba(14,10,24,.3)'; ctx.fillRect(X(wx + sh[0] + 1), Y(wy + sh[1]), (sh[2] - 2) * S, 2 * S); ctx.fillRect(X(wx + sh[0]), Y(wy + sh[1]), sh[2] * S, S); }
  };
  const put = (sp: Sprite, wx: number, wy: number) => { ctx.drawImage(sp.base, X(wx), Y(wy), sp.w * S, sp.h * S); if (sp.glow) glows.push({ cv: sp.glow, wx, wy }); };
  const musicOn = proj.interactables.some((it) => it.type === 'speaker' && it.state === 'on' && !holds.has(it.id));
  for (const d of decorByFloor[viewFloor]) {
    const wx = d.x * T - 8, wy = d.y * T - 8;
    if (wy < minY || wy > maxY || wx < minX || wx > maxX) continue;
    const f = d.art === 'discoball' && !musicOn ? 0 : propFrame(d.art, time, d.phase);
    const sway = d.art === 'balloon' ? Math.round(Math.sin(time * 1.3 + d.phase * 9)) : 0;
    items.push({ key: PROP_DEFS[d.art]?.flat ? d.y * T - 4 : d.y * T + 8, draw: () => { shadowOf(d.art, wx, wy); put(propSprite(d.art, { f }), wx + sway, wy); } });
  }
  for (const it of proj.interactables) {
    if (!on(it)) continue;
    const p = floorPoint(it);
    const art = INTERACTABLE_META[it.type].art;
    const isOn = (it.state === 'on') !== holds.has(it.id);
    items.push({ key: p.y * T + 8.2, draw: () => { shadowOf(art, p.x * T - 8, p.y * T - 8); put(propSprite(art, { on: isOn, f: propFrame(art, time) }), p.x * T - 8, p.y * T - 8); } });
  }
  proj.snacks.forEach((sn, i) => {
    if (!on(sn) || holds.has(`snack:${sn.x},${sn.y}`)) return;
    const p = floorPoint(sn);
    items.push({ key: p.y * T + 7, draw: () => { ctx.globalAlpha = i >= state.snacks.length ? 0.75 : 1; put(foodSprite(sn.art), p.x * T - 8, p.y * T - 8); ctx.globalAlpha = 1; } });
  });
  // doors swing open for whoever is passing and shut behind them
  for (const d of doorsByFloor[viewFloor]) {
    const locked = proj.lockedDoors.includes(`${d.ax},${d.ay}`) !== holds.has(`door:${d.ax},${d.ay}`);
    let near = false;
    if (!locked) for (const a of actors.values()) if (a.floor === viewFloor && Math.abs(a.px - (d.x * T + 8)) < 19 && Math.abs(a.py - (d.y * T + 8)) < 19) { near = true; break; }
    const sp = doorSprite(d.kind, locked ? 'locked' : near ? 'open' : 'closed');
    items.push({ key: d.y * T + 1, draw: () => ctx.drawImage(sp.base, X(d.x * T), Y(d.y * T - 6), sp.w * S, sp.h * S) });
  }
  // ghost of where the hour started
  if (mode === 'play' && on(state.host) && (state.host.x !== proj.host.x || state.host.y !== proj.host.y)) {
    const c = centre(state.host);
    const cv = personSprite('host', 0, 'idle', 0, 'down').base;
    items.push({ key: c.y - 0.5, draw: () => { ctx.globalAlpha = 0.3; ctx.drawImage(cv, X(c.x - 16), Y(c.y - 29), 32 * S, 32 * S); ctx.globalAlpha = 1; } });
  }
  for (const a of actors.values()) {
    if (a.floor !== viewFloor) continue;
    const g = a.id === 'host' ? undefined : proj.guests.find((x) => x.id === a.id);
    items.push({ key: a.py + 0.1, draw: () => { const g2 = drawActor(a, g, X, Y); if (g2) glows.push(g2); } });
  }
  items.sort((p, q) => p.key - q.key);
  for (const it of items) it.draw();

  for (const p of particles) {
    ctx.globalAlpha = clamp(1 - p.life / p.max, 0, 1);
    if (p.kind === 'note') { ctx.fillStyle = p.col; ctx.fillRect(X(p.x), Y(p.y), 2 * S, 2 * S); ctx.fillRect(X(p.x + 1), Y(p.y - 4), S, 4 * S); ctx.fillRect(X(p.x + 2), Y(p.y - 4), 2 * S, S); }
    else rect(Math.round(p.x), Math.round(p.y), p.size, p.size, p.col);
  }
  ctx.globalAlpha = 1;

  drawLight(L, ox, oy, X, Y);
  // whatever gives off light is drawn again over the night, so it stays bright
  for (const g of glows) ctx.drawImage(g.cv, X(g.wx), Y(g.wy), g.cv.width * S, g.cv.height * S);

  // above the night: markers and words
  for (const s of STAIRS) {
    if (!on(s.from) || s.walkout) continue;
    const p = floorPoint(s.from);
    const bob = Math.round(Math.sin(time * 3) * 1.5);
    const cx = p.x * T + 16, cy = p.y * T - 3 + bob;
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 4; i += 1) { const w = s.up ? 1 + i * 2 : 7 - i * 2; ctx.fillRect(X(cx - w / 2), Y(cy + i), w * S, S); }
  }
  for (const a of actors.values()) {
    if (a.floor !== viewFloor || a.gone) continue;
    if (a.id === 'host') {
      if (mode === 'title') continue;
      const bob = Math.round(Math.sin(time * 4) * 1.2);
      ctx.fillStyle = '#7fe6da';
      for (let i = 0; i < 3; i += 1) ctx.fillRect(X(a.px - 2.5 + i), Y(a.py - 35 + bob + i), (5 - i * 2) * S, S);
      continue;
    }
    const g = proj.guests.find((x) => x.id === a.id);
    if (!g) continue;
    const speaking = lineAt < lines.length && lines[lineAt]!.who === g.id;
    if (g.mood && !speaking) {
      const bob = Math.round(Math.sin(time * 2.4 + a.phase) * 1.2);
      ctx.drawImage(emoteSprite(g.mood).base, X(a.px - 1), Y(a.py - 43 + bob), 16 * S, 16 * S);
    }
    if (speaking) {
      const bx = a.px + 2, by = a.py - 40;
      rect(bx, by, 14, 9, '#1c1420'); rect(bx + 1, by + 1, 12, 7, '#f6efdc'); rect(bx + 3, by + 9, 3, 2, '#f6efdc');
      for (let i = 0; i < 3; i += 1) rect(bx + 3 + i * 3, by + 4 - (Math.floor(time * 6) % 3 === i ? 1 : 0), 2, 2, '#1c1420');
    }
    if (selectedGuest === g.id || (hover && hover.tile.x === g.x && hover.tile.y === g.y)) label(g.name, X(a.px), Y(a.py + 5), STAGE_COL[g.mutationStage]!);
  }
  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = clamp(1.3 - f.t, 0, 1);
    text(f.text, X(f.x), Y(f.y - f.t * 16), f.col);
  }
  ctx.globalAlpha = 1;
  if (hover && mode === 'play' && pointer.mouse) {
    const p = floorPoint(hover.tile);
    const t = hover.cost > 0 ? `${hover.label} · ${hover.cost} min` : hover.label;
    label(t, X(p.x * T + 8), Y(p.y * T + 18), hover.ok ? '#f6efdc' : '#ff8a8a');
  }

  if (floorFade > 0) { ctx.fillStyle = `rgba(8,6,14,${floorFade})`; ctx.fillRect(0, 0, vw, vh); }
}

function bracket(x: number, y: number, size: number, col: string): void {
  const n = Math.max(2, Math.round(size * 0.28)), w = Math.max(2, Math.round(S * 0.9));
  const pulse = Math.round(Math.sin(time * 6) * S * 0.5);
  ctx.fillStyle = col;
  const a = x - pulse, b = y - pulse, s = size + pulse * 2;
  for (const [cx, cy, hx, hy] of [[a, b, 1, 1], [a + s, b, -1, 1], [a, b + s, 1, -1], [a + s, b + s, -1, -1]] as const) {
    ctx.fillRect(hx > 0 ? cx : cx - n, hy > 0 ? cy : cy - w, n, w);
    ctx.fillRect(hx > 0 ? cx : cx - w, hy > 0 ? cy : cy - n, w, n);
  }
}
function fontPx(): number { return Math.max(11 * dpr, Math.round(S * 4.6)); }
function text(t: string, x: number, y: number, col: string): void {
  ctx.font = `600 ${fontPx()}px "Pixelify Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, S); ctx.strokeStyle = '#1a1420'; ctx.lineJoin = 'round';
  ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
}
function label(t: string, x: number, y: number, col: string): void {
  const px = fontPx();
  ctx.font = `600 ${px}px "Pixelify Sans", system-ui, sans-serif`;
  const w = ctx.measureText(t).width + px, h = px * 1.55;
  const lx = clamp(x - w / 2, 4, vw - w - 4);
  ctx.fillStyle = 'rgba(26,20,32,.92)'; ctx.fillRect(lx, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(lx, y + h - Math.max(2, S * 0.6), w, Math.max(2, S * 0.6));
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col; ctx.fillText(t, lx + px / 2, y + h / 2 - 1);
}

function drawActor(a: Actor, g: Guest | undefined, X: (n: number) => number, Y: (n: number) => number): { cv: HTMLCanvasElement; wx: number; wy: number } | null {
  const sp = frameOf(a, g);
  let jx = 0;
  if (!a.moving && a.stage >= 2 && (time * 3 + a.phase) % 5 < 0.25) jx = Math.random() < 0.5 ? -1 : 1;
  // tipsy people do not walk in straight lines
  const sway = a.moving && a.id !== 'host' && a.stage < 3 ? Math.round(Math.sin(a.dist / 7 + a.phase) * (a.stage + 0.4)) : 0;
  ctx.globalAlpha = clamp(a.alpha, 0, 1);
  ctx.fillStyle = 'rgba(14,10,24,.42)';
  ctx.fillRect(X(a.px - 6), Y(a.py), 12 * S, 2 * S); ctx.fillRect(X(a.px - 4), Y(a.py - 1), 8 * S, 4 * S);
  if (selectedGuest === a.id) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(X(a.px - 9), Y(a.py + 3), 18 * S, S); ctx.fillRect(X(a.px - 9), Y(a.py - 3), S, 6 * S); ctx.fillRect(X(a.px + 8), Y(a.py - 3), S, 6 * S); }
  const wx = a.px - 16 + jx + (a.view === 'side' ? 0 : sway), wy = a.py - 29;
  const dx = X(wx), dy = Y(wy);
  const flip = a.view === 'side' && a.facing < 0;
  const blit = (cv: HTMLCanvasElement) => {
    if (flip) { ctx.save(); ctx.translate(dx + 32 * S, dy); ctx.scale(-1, 1); ctx.drawImage(cv, 0, 0, 32 * S, 32 * S); ctx.restore(); }
    else ctx.drawImage(cv, dx, dy, 32 * S, 32 * S);
  };
  blit(sp.base);
  if (a.flash > 0) { ctx.globalAlpha = a.flash * 0.6; ctx.globalCompositeOperation = 'lighter'; blit(sp.base); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  return sp.glow && !flip ? { cv: sp.glow, wx, wy } : null;
}

const maskCache = new Map<string, HTMLCanvasElement>();
/** One light's pool, cut to what it can actually reach: walls stop it, doorways let it through. */
function lightMask(wx: number, wy: number, r: number, c: readonly [number, number, number]): HTMLCanvasElement {
  const key = `${viewFloor}:${wx | 0},${wy | 0}:${r | 0}:${c.join()}`;
  let cv = maskCache.get(key);
  if (cv) return cv;
  const size = Math.ceil(r) + 2;
  cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const m = cv.getContext('2d')!;
  const wall = (x: number, y: number) => localTile(state.grid, viewFloor, x, y)?.kind === 'wall';
  let sx = Math.floor(wx / T), sy = Math.floor(wy / T);
  if (wall(sx, sy)) sy += 1;
  const reach = Math.ceil(r / T);
  const ox = wx - size, oy = wy - size;
  m.fillStyle = '#fff';
  for (let ty = sy - reach; ty <= sy + reach; ty += 1) for (let tx = sx - reach; tx <= sx + reach; tx += 1) {
    const n = Math.max(Math.abs(tx - sx), Math.abs(ty - sy));
    let clear = true;
    for (let i = 1; i < n && clear; i += 1) if (wall(Math.round(sx + ((tx - sx) * i) / n), Math.round(sy + ((ty - sy) * i) / n))) clear = false;
    if (clear) m.fillRect((tx * T - ox) / 2 - 0.5, (ty * T - oy) / 2 - 0.5, T / 2 + 1, T / 2 + 1);
  }
  m.globalCompositeOperation = 'source-in';
  const g = m.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, r / 2);
  const col = `${c[0]},${c[1]},${c[2]}`;
  g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.5, `rgba(${col},.5)`); g.addColorStop(1, `rgba(${col},0)`);
  m.fillStyle = g; m.fillRect(0, 0, size, size);
  maskCache.set(key, cv);
  return cv;
}

function drawLight(L: Layer, ox: number, oy: number, X: (n: number) => number, Y: (n: number) => number): void {
  const lw = Math.ceil(vw / (S * 2)) + 4, lh = Math.ceil(vh / (S * 2)) + 4;
  if (lm.width !== lw || lm.height !== lh) { lm.width = lw; lm.height = lh; }
  const wx0 = Math.floor(-ox / S / 2) * 2 - 2, wy0 = Math.floor(-oy / S / 2) * 2 - 2;
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lw, lh);
  lctx.drawImage(L.ambient, (L.x0 - wx0) / 2, (L.y0 - wy0) / 2);
  lctx.globalCompositeOperation = 'lighter';

  const on = (p: P) => floorAt(p.x, p.y) === viewFloor;
  type Lt = { x: number; y: number; r: number; c: readonly [number, number, number]; a: number; wash?: boolean; walls?: boolean };
  const lights: Lt[] = [];
  const shown = proj.interactables.filter(on).map((it) => (holds.has(it.id) ? { ...it, state: it.state === 'on' ? 'off' as const : 'on' as const } : it));
  for (const s of collectLights(shown, state.decor.filter(on), proj.snacks.filter((sn) => on(sn) && !holds.has(`snack:${sn.x},${sn.y}`)))) {
    const p = floorPoint({ x: s.x, y: s.y });
    let a = s.intensity;
    if (s.kind === 'flicker') a *= 0.8 + 0.2 * Math.sin(time * 9 + s.phase * 40) * Math.sin(time * 5.3 + s.phase * 17);
    else if (s.kind === 'beat') a *= 0.55 + 0.45 * Math.abs(Math.sin(time * Math.PI * 2 + s.phase));
    if (s.kind === 'disco') {
      const cols: [number, number, number][] = [[255, 90, 200], [90, 200, 255], [255, 220, 90]];
      for (let i = 0; i < 3; i += 1) {
        const ang = time * 1.3 + (i * Math.PI * 2) / 3 + s.phase * 6;
        lights.push({ x: (p.x + 0.5 + Math.cos(ang) * s.radius * 0.45) * T, y: (p.y + 1.5 + Math.sin(ang) * s.radius * 0.3) * T, r: s.radius * 0.45 * T, c: cols[i]!, a: s.intensity * 0.8, wash: s.radius > 4 });
      }
      continue;
    }
    lights.push({ x: (p.x + 0.5) * T, y: (p.y + 0.5) * T, r: s.radius * T, c: s.colour, a, wash: s.kind === 'beat', walls: true });
  }
  for (const s of L.lights) lights.push({ x: s.x * T, y: s.y * T, r: s.radius * T, c: s.colour, a: s.intensity * (0.96 + 0.04 * Math.sin(time * 3 + s.x)), walls: true });
  const host = actors.get('host');
  if (host && host.floor === viewFloor && mode !== 'title') lights.push({ x: host.px, y: host.py - 8, r: 2.6 * T, c: [255, 240, 220], a: 0.3 });
  // windows across the road
  const lit = viewFloor === 'ground' ? Math.round((proj.suspicion / 100) * L.windows.length) : 0;
  for (const w of L.windows) if (w.order < lit) lights.push({ x: w.x + w.w / 2, y: w.y + w.h + 8, r: 3.2 * T, c: [255, 214, 140], a: 0.55 });

  for (const l of lights) {
    const cx = (l.x - wx0) / 2, cy = (l.y - wy0) / 2, r = l.r / 2;
    if (cx + r < 0 || cy + r < 0 || cx - r > lw || cy - r > lh) continue;
    if (l.walls) { const m = lightMask(l.x, l.y, l.r, l.c); lctx.globalAlpha = clamp(l.a, 0, 1); lctx.drawImage(m, cx - m.width / 2, cy - m.height / 2); lctx.globalAlpha = 1; continue; }
    const g = lctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = `${l.c[0]},${l.c[1]},${l.c[2]}`;
    g.addColorStop(0, `rgba(${c},${l.a})`); g.addColorStop(0.5, `rgba(${c},${l.a * 0.5})`); g.addColorStop(1, `rgba(${c},0)`);
    lctx.fillStyle = g; lctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lm, ox + wx0 * S, oy + wy0 * S, lw * 2 * S, lh * 2 * S);
  ctx.imageSmoothingEnabled = false;

  // coloured party wash on top of the night
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.wash) continue;
    const g = ctx.createRadialGradient(X(l.x), Y(l.y), 0, X(l.x), Y(l.y), l.r * S);
    const c = `${l.c[0]},${l.c[1]},${l.c[2]}`;
    g.addColorStop(0, `rgba(${c},${0.2 * l.a})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(X(l.x - l.r), Y(l.y - l.r), l.r * 2 * S, l.r * 2 * S);
  }
  ctx.globalCompositeOperation = 'source-over';

  // lit windows are emissive: they ignore the night
  if (viewFloor === 'ground') {
    for (const w of L.windows) {
      if (w.order >= lit) continue;
      const flick = 0.9 + 0.1 * Math.sin(time * 2 + w.order * 1.7);
      ctx.fillStyle = `rgba(255,${Math.round(214 * flick)},${Math.round(130 * flick)},1)`;
      ctx.fillRect(X(w.x), Y(w.y), w.w * S, w.h * S);
      ctx.fillStyle = '#efe6d0'; ctx.fillRect(X(w.x + 10), Y(w.y), 2 * S, w.h * S); ctx.fillRect(X(w.x), Y(w.y + 9), w.w * S, 2 * S);
      if (proj.suspicion >= 45 && w.order % 2 === 0) {
        // somebody is standing at the glass
        ctx.fillStyle = '#2a2030';
        const sway = Math.round(Math.sin(time * 0.8 + w.order) * 1.5);
        ctx.fillRect(X(w.x + 3 + sway), Y(w.y + 6), 5 * S, 14 * S); ctx.fillRect(X(w.x + 4 + sway), Y(w.y + 2), 3 * S, 4 * S);
      }
    }
    if (proj.suspicion >= 85) {
      const red = Math.floor(time * 3) % 2 === 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = red ? 'rgba(255,40,60,.16)' : 'rgba(60,90,255,.16)';
      ctx.fillRect(0, Y(-3 * T), vw, 7 * T * S);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

/** Old art beside new, with the new set animating, so the whole pass can be judged at a glance. */
function drawGallery(): void {
  const cv = $<HTMLCanvasElement>('art');
  const cssW = Math.min(880, cv.parentElement!.clientWidth);
  const Z = cssW < 520 ? 2 : 3, cell = 34 * Z, pairW = cell * 2 + 14;
  const cols = Math.max(1, Math.floor(cssW / pairW));
  const propIds = Object.keys(PROP_DEFS);
  const people = ['host', ...state.guests.map((g) => g.id), ...['guest-moss', 'guest-moss', 'guest-moss']].slice(0, 16);
  const rowsA = Math.ceil(propIds.length / cols), rowsB = Math.ceil(people.length / cols);
  const H = 30 + rowsA * (cell + 18) + 40 + rowsB * (cell + 18) + 10;
  if (cv.width !== cols * pairW || cv.height !== H) { cv.width = cols * pairW; cv.height = H; cv.style.width = `${cols * pairW}px`; cv.style.height = `${H}px`; }
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);
  const head = (t: string, y: number) => { g.fillStyle = '#e8c35a'; g.font = '600 16px "Pixelify Sans", system-ui, sans-serif'; g.fillText(t, 0, y); };
  const tile = (x: number, y: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, cell, cell); };
  const cap = (t: string, x: number, y: number) => { g.fillStyle = '#b9aaa6'; g.font = '11px "Pixelify Sans", system-ui, sans-serif'; g.fillText(t, x, y); };
  head('Furniture and fixtures: before, after', 18);
  propIds.forEach((id, i) => {
    const x = (i % cols) * pairW, y = 30 + Math.floor(i / cols) * (cell + 18);
    tile(x, y, '#6a4a34'); tile(x + cell + 2, y, '#a87244');
    g.drawImage(sprite(furnitureArt(id as never) as never), x + Z, y + Z, 32 * Z, 32 * Z);
    const def = PROP_DEFS[id]!;
    const sp = propSprite(id, { on: def.switchable ? Math.floor(time / 1.5) % 2 === 1 : false, f: propFrame(id, time) });
    g.drawImage(sp.base, x + cell + 2 + Z, y + Z, 32 * Z, 32 * Z);
    cap(id, x + 2, y + cell + 12);
  });
  const y0 = 30 + rowsA * (cell + 18) + 28;
  head('The cast: before, after (walking, three views)', y0 - 10);
  people.forEach((id, i) => {
    const x = (i % cols) * pairW, y = y0 + Math.floor(i / cols) * (cell + 18);
    const stage = i >= 13 ? i - 12 : 0;
    tile(x, y, '#6a4a34'); tile(x + cell + 2, y, '#a87244');
    g.drawImage(sprite(personArt(id, stage as 0, Math.floor(time * 3) % 2 ? 'step-a' : 'step-b', 'front') as never), x + Z, y + Z, 32 * Z, 32 * Z);
    const view = (['down', 'side', 'up', 'side'] as View[])[Math.floor(time / 2.2 + i * 0.37) % 4]!;
    g.drawImage(personSprite(id, stage, 'walk', Math.floor(time * 6.5), view).base, x + cell + 2 + Z, y + Z, 32 * Z, 32 * Z);
    cap(id.replace('guest-', '') + (stage ? ` · stage ${stage}` : ''), x + 2, y + cell + 12);
  });
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  if (overlay === 'art') drawGallery();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------- boot */

function boot(): void {
  buildWorld();
  STAIRS = stairTiles();
  syncActors();
  wire();
  resize();
  const h = actors.get('host')!;
  cam.x = h.px; cam.y = h.py;
  overlay = 'title';
  document.body.classList.add('title');
  requestAnimationFrame(loop);
  (window as never as { __lotp: unknown }).__lotp = { get state() { return state; }, get proj() { return proj; }, get cam() { return cam; }, get S() { return S; }, look(f: FloorId, x: number, y: number) { viewFloor = f; follow = false; panTo = null; cam.x = x * T; cam.y = y * T; hudDirty = true; } };
}
boot();
