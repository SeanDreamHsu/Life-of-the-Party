import { GRID_WIDTH as GW, HOUSE_X, HOUSE_Y, BUILDING_WIDTH } from '../../../src/data/houseMap';
import { atlasPoint, floorPoint, visibleOnFloor, stairsOnFloor, floorInfo, floorAt, FLOOR_VIEW, type FloorId } from '../../../src/data/floors';
import { roomAt } from '../../../src/data/rooms';
import { roomRug } from '../../../src/art/sprites/rugs';
import { OBJECT_PALETTE } from '../../../src/art/palette';
import type { Decor, Grid, Tile } from '../../../src/types/game';
import { css, h2, hex, shade, sprite, type RGB } from './gfx';

export const T = 16;
export const FH = FLOOR_VIEW.h;
const PAD_L = 5, PAD_R = 5, PAD_T = 12, PAD_B = 4;

export interface Win { x: number; y: number; w: number; h: number; order: number }
export interface SceneLight { x: number; y: number; radius: number; colour: readonly [number, number, number]; intensity: number }
export interface Layer {
  floor: FloorId;
  canvas: HTMLCanvasElement;
  ambient: HTMLCanvasElement;
  x0: number; y0: number; w: number; h: number;
  windows: Win[];
  lights: SceneLight[];
}

/** Tile at floor-local coordinates, or undefined when nothing is there on this storey. */
export function localTile(grid: Grid, floor: FloorId, x: number, ly: number): Tile | undefined {
  if (ly < 0 || ly >= FH || x < 0 || x >= GW) return undefined;
  const a = atlasPoint({ x, y: ly }, floor);
  const tile = grid[a.y]?.[a.x];
  if (!tile || !visibleOnFloor(tile, floor)) return undefined;
  return tile;
}

type Style = { type: string; a: RGB; b?: RGB };

const ROOM_FLOOR: Record<string, Style> = {
  lounge: { type: 'wood', a: hex('#b47a45') },
  foyer: { type: 'checker', a: hex('#d9cdb6'), b: hex('#8f8474') },
  'dining-room': { type: 'wood', a: hex('#96623a') },
  kitchen: { type: 'checker', a: hex('#ece2c6'), b: hex('#9cb7a0') },
  'main-hall': { type: 'wood', a: hex('#a87244') },
  ballroom: { type: 'parquet', a: hex('#c08a48') },
  study: { type: 'wood', a: hex('#83563a') },
  theater: { type: 'carpet', a: hex('#7a3a48') },
  'game-room': { type: 'carpet', a: hex('#4c6e58') },
  'back-landing': { type: 'wood', a: hex('#a87244') },
  'upper-landing': { type: 'wood', a: hex('#a87244') },
  'master-bedroom': { type: 'carpet', a: hex('#566490') },
  'guest-room-1': { type: 'carpet', a: hex('#9a6470') },
  'guest-room-2': { type: 'carpet', a: hex('#5f8a80') },
  'guest-room-3': { type: 'carpet', a: hex('#8f7c55') },
  bathroom: { type: 'smalltile', a: hex('#e4eeee'), b: hex('#94bcc0') },
  basement: { type: 'concrete', a: hex('#8a878e') },
  'basement-landing': { type: 'concrete', a: hex('#8a878e') },
  'rec-room': { type: 'wood', a: hex('#8c6040') },
  'seans-crib': { type: 'carpet', a: hex('#4a4468') },
  'front-stairs': { type: 'wood', a: hex('#a87244') },
  gallery: { type: 'wood', a: hex('#9a6840') },
  'master-bath': { type: 'smalltile', a: hex('#e8e2d2'), b: hex('#8f9cc0') },
  'sewing-room': { type: 'wood', a: hex('#b98a56') },
  sunroom: { type: 'checker', a: hex('#d8c9a0'), b: hex('#a9b58a') },
  'cold-store': { type: 'smalltile', a: hex('#cfd6d8'), b: hex('#8d9aa0') },
  laundry: { type: 'checker', a: hex('#dfe6e6'), b: hex('#9cc0c4') },
  'wine-cellar': { type: 'pavers', a: hex('#8a7f78') },
};

interface Paper { base: string; alt: string; pat: 'stripe' | 'dot' | 'panel' | 'tile' | 'plain'; dado: string; rail: string }
const WOOD_DADO = '#6b4630', WOOD_RAIL = '#c9a26a';
const WALLPAPER: Record<string, Paper> = {
  lounge: { base: '#8c4a55', alt: '#9d5a63', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL },
  foyer: { base: '#4a6688', alt: '#5a769a', pat: 'stripe', dado: '#e2d9c6', rail: '#f4ecd8' },
  'dining-room': { base: '#557f5f', alt: '#6c9674', pat: 'dot', dado: WOOD_DADO, rail: WOOD_RAIL },
  kitchen: { base: '#eadfc0', alt: '#d6c9a4', pat: 'tile', dado: '#9cb7a0', rail: '#f6efd8' },
  'main-hall': { base: '#b08a5c', alt: '#9c784c', pat: 'panel', dado: WOOD_DADO, rail: WOOD_RAIL },
  ballroom: { base: '#6a4a8a', alt: '#d2b060', pat: 'dot', dado: '#3d2a52', rail: '#d2b060' },
  study: { base: '#356f72', alt: '#438286', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL },
  theater: { base: '#732f3e', alt: '#8a3d4c', pat: 'plain', dado: '#3a1c26', rail: '#c9a26a' },
  'game-room': { base: '#7b8442', alt: '#8c9650', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL },
  'back-landing': { base: '#b08a5c', alt: '#9c784c', pat: 'panel', dado: WOOD_DADO, rail: WOOD_RAIL },
  'upper-landing': { base: '#b08a5c', alt: '#9c784c', pat: 'panel', dado: WOOD_DADO, rail: WOOD_RAIL },
  'master-bedroom': { base: '#51619a', alt: '#6373ac', pat: 'dot', dado: '#e2d9c6', rail: '#f4ecd8' },
  'guest-room-1': { base: '#b07880', alt: '#c08a90', pat: 'stripe', dado: '#e2d9c6', rail: '#f4ecd8' },
  'guest-room-2': { base: '#6c9aa8', alt: '#7eacba', pat: 'dot', dado: '#e2d9c6', rail: '#f4ecd8' },
  'guest-room-3': { base: '#a8965e', alt: '#b8a66e', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL },
  bathroom: { base: '#cfe4e4', alt: '#a9cccc', pat: 'tile', dado: '#94bcc0', rail: '#f2fafa' },
  basement: { base: '#77747c', alt: '#68656c', pat: 'tile', dado: '#55525a', rail: '#8a878e' },
  'basement-landing': { base: '#77747c', alt: '#68656c', pat: 'tile', dado: '#55525a', rail: '#8a878e' },
  'rec-room': { base: '#8a6844', alt: '#775838', pat: 'panel', dado: '#4c3524', rail: '#b08a5c' },
  'seans-crib': { base: '#40406a', alt: '#d06aa8', pat: 'dot', dado: '#26263f', rail: '#6a6aa0' },
  'front-stairs': { base: '#b08a5c', alt: '#9c784c', pat: 'panel', dado: WOOD_DADO, rail: WOOD_RAIL },
  gallery: { base: '#7d4a52', alt: '#8e5a62', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL },
  'master-bath': { base: '#c9d0e6', alt: '#a8b2d2', pat: 'tile', dado: '#8f9cc0', rail: '#eef0fa' },
  'sewing-room': { base: '#b8935a', alt: '#c8a36a', pat: 'dot', dado: WOOD_DADO, rail: WOOD_RAIL },
  sunroom: { base: '#9fb88a', alt: '#b4ca9e', pat: 'stripe', dado: '#e2d9c6', rail: '#f4ecd8' },
  'cold-store': { base: '#c4ccd0', alt: '#a4aeb4', pat: 'tile', dado: '#8d9aa0', rail: '#e6ecee' },
  laundry: { base: '#cfe0e0', alt: '#a9c8c8', pat: 'tile', dado: '#9cc0c4', rail: '#f2fafa' },
  'wine-cellar': { base: '#6a5a58', alt: '#5a4a48', pat: 'tile', dado: '#4a3c3a', rail: '#8a7a74' },
};
const DEFAULT_PAPER: Paper = { base: '#8a7868', alt: '#9a8878', pat: 'stripe', dado: WOOD_DADO, rail: WOOD_RAIL };

const KIND_FLOOR: Record<string, Style> = {
  yard: { type: 'grass', a: hex('#68a650') },
  path: { type: 'pavers', a: hex('#b9b2a6') },
  street: { type: 'asphalt', a: hex('#62616e') },
  door: { type: 'thresh', a: hex('#7a5234') },
  wall: { type: 'flat', a: hex('#3a3040') },
  kitchen: ROOM_FLOOR.kitchen!,
  bathroom: ROOM_FLOOR.bathroom!,
  bedroom: { type: 'carpet', a: hex('#566490') },
  garage: { type: 'concrete', a: hex('#8a878e') },
};
const WOOD_DEFAULT: Style = { type: 'wood', a: hex('#a87244') };

function texel(st: Style, px: number, py: number): RGB {
  const a = st.a;
  switch (st.type) {
    case 'wood': {
      // long boards with fine gaps, so it reads as planking rather than brick
      const row = Math.floor(py / 6);
      const off = Math.floor(h2(row, 7) * 44);
      const bx = Math.floor((px + off) / 44);
      let f = 0.95 + 0.1 * h2(bx, row, 3);
      const m = ((py % 6) + 6) % 6;
      if (m === 5) f *= 0.8;
      else if ((((px + off) % 44) + 44) % 44 === 0) f *= 0.84;
      else if (h2(px >> 2, py, 5) < 0.1) f *= 0.95;
      else if (m === 0) f *= 1.04;
      return shade(a, f);
    }
    case 'parquet': {
      const bx = Math.floor(px / 8), by = Math.floor(py / 8);
      const horiz = (bx + by) & 1;
      const s = horiz ? ((py % 8) + 8) % 8 : ((px % 8) + 8) % 8;
      let f = 0.9 + 0.16 * h2(bx, by, 9);
      if (s % 4 === 3) f *= 0.8;
      if ((((px % 8) + 8) % 8) === 7 || (((py % 8) + 8) % 8) === 7) f *= 0.84;
      return shade(a, f);
    }
    case 'checker': case 'smalltile': {
      const size = st.type === 'checker' ? 8 : 4;
      const cx = Math.floor(px / size), cy = Math.floor(py / size);
      const c = (cx + cy) & 1 ? a : st.b ?? a;
      let f = 0.95 + 0.08 * h2(cx, cy, 10);
      const mx = ((px % size) + size) % size, my = ((py % size) + size) % size;
      if (mx === 0 || my === 0) f *= 0.84;
      return shade(c, f);
    }
    case 'carpet': {
      let f = 0.92 + 0.13 * h2(px, py, 11);
      if (((px + py) & 3) === 0) f *= 0.95;
      return shade(a, f);
    }
    case 'concrete': {
      let f = 0.92 + 0.1 * h2(px >> 1, py >> 1, 13);
      if (h2(px, py, 14) < 0.012) f *= 0.76;
      if ((((px % 32) + 32) % 32) === 0 || (((py % 32) + 32) % 32) === 0) f *= 0.82;
      return shade(a, f);
    }
    case 'grass': {
      let f = 0.9 + 0.13 * h2(px, py, 2);
      if ((Math.floor(py / 16) & 1) === 0) f *= 0.955;
      if (h2(px >> 1, py >> 2, 4) < 0.075) f *= 1.2;
      else if (h2(px, py, 6) < 0.05) f *= 0.8;
      return shade(a, f);
    }
    case 'pavers': {
      const row = Math.floor(py / 8);
      const ox = row & 1 ? 4 : 0;
      let f = 0.9 + 0.14 * h2(Math.floor((px + ox) / 8), row, 8);
      if ((((py % 8) + 8) % 8) === 0 || ((((px + ox) % 8) + 8) % 8) === 0) f *= 0.7;
      return shade(a, f);
    }
    case 'asphalt': {
      let f = 0.9 + 0.14 * h2(px, py, 15);
      if (h2(px, py, 16) < 0.02) f *= 1.3;
      return shade(a, f);
    }
    case 'thresh': {
      let f = 0.9 + 0.14 * h2(px >> 2, 0, 17);
      if ((((px % 4) + 4) % 4) === 3) f *= 0.74;
      return shade(a, f);
    }
    case 'sky': {
      const t = Math.max(0, Math.min(1, (py + PAD_T * T) / (5 * T)));
      const c: RGB = [16 + 22 * t, 22 + 26 * t, 52 + 44 * t];
      const star = h2(px, py, 21);
      if (star < 0.0035) return shade([235, 238, 255], 0.6 + 0.4 * h2(px, py, 22));
      return c;
    }
    case 'roof': {
      // the ground floor's roof, seen from the storey above
      const row = Math.floor(py / 5), off = row & 1 ? 4 : 0;
      let f = 0.9 + 0.14 * h2(Math.floor((px + off) / 8), row, 41);
      if ((((py % 5) + 5) % 5) === 4) f *= 0.68; else if ((((px + off) % 8) + 8) % 8 === 0) f *= 0.8;
      return shade(a, f);
    }
    case 'earth': {
      let f = 0.86 + 0.2 * h2(px >> 1, py >> 1, 43);
      if (h2(px >> 2, py >> 2, 44) < 0.05) f *= 1.5;
      return shade(a, f);
    }
    case 'void': return shade([20, 16, 26], 0.9 + 0.2 * h2(px >> 1, py >> 1, 23));
    default: return a;
  }
}

/** Solid wall with no room anywhere near it: on the smaller storeys this is not house at all. */
export function isDeep(grid: Grid, floor: FloorId, x: number, ly: number): boolean {
  if (floor === 'ground') return false;
  const t = localTile(grid, floor, x, ly);
  if (!t || t.kind !== 'wall') return false;
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const n = localTile(grid, floor, x + dx, ly + dy);
    if (n && n.kind !== 'wall') return false;
  }
  return true;
}
const ROOF: Style = { type: 'roof', a: hex('#7a5a66') };
const EARTH: Style = { type: 'earth', a: hex('#5a4a44') };

function styleFor(grid: Grid, floor: FloorId, x: number, ly: number): Style {
  if (isDeep(grid, floor, x, ly)) return floor === 'upper' ? ROOF : EARTH;
  const tile = localTile(grid, floor, x, ly);
  if (tile) {
    if (tile.kind === 'yard' || tile.kind === 'path' || tile.kind === 'street' || tile.kind === 'door' || tile.kind === 'wall') return KIND_FLOOR[tile.kind]!;
    const room = roomAt(tile.x, tile.y);
    return (room && ROOM_FLOOR[room.id]) || KIND_FLOOR[tile.kind] || WOOD_DEFAULT;
  }
  if (floor !== 'ground') return { type: 'void', a: [0, 0, 0] };
  if (ly <= -8) return { type: 'sky', a: [0, 0, 0] };
  if (ly <= -4) return { type: 'grass', a: hex('#4f8a44') };
  if (ly === -3) return KIND_FLOOR.path!;
  if (ly <= 0) return KIND_FLOOR.street!;
  if (ly === 1) return KIND_FLOOR.path!;
  return { type: 'grass', a: hex('#55904a') };
}

function isWall(t: Tile | undefined): boolean { return t?.kind === 'wall'; }
function isOut(t: Tile | undefined): boolean { return !t || t.kind === 'yard' || t.kind === 'path' || t.kind === 'street'; }

export function buildLayer(grid: Grid, decor: readonly Decor[], floor: FloorId): Layer {
  const x0 = -PAD_L * T, y0 = -PAD_T * T;
  const w = (GW + PAD_L + PAD_R) * T, h = (FH + PAD_T + PAD_B) * T;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tl = (x: number, ly: number) => (isDeep(grid, floor, x, ly) ? undefined : localTile(grid, floor, x, ly));

  // ---- 1. ground: every pixel gets a texel from its tile's material
  const cols = GW + PAD_L + PAD_R, rows = FH + PAD_T + PAD_B;
  const styles: Style[] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) styles.push(styleFor(grid, floor, c - PAD_L, r - PAD_T));
  const img = ctx.createImageData(w, h);
  for (let py = 0; py < h; py += 1) {
    const r = Math.floor(py / T);
    for (let px = 0; px < w; px += 1) {
      const st = styles[r * cols + Math.floor(px / T)]!;
      const c = texel(st, px + x0, py + y0);
      const o = (py * w + px) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.translate(-x0, -y0);
  const fill = (x: number, y: number, ww: number, hh: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };

  const windows: Win[] = [];
  const lights: SceneLight[] = [];
  if (floor === 'ground') paintStreet(fill, windows, lights);

  // ---- 2. rugs lie on the floor, under everything
  for (const d of decor) {
    if (!d.floorSize || floorAt(d.x, d.y) !== floor) continue;
    const p = floorPoint(d);
    const [rw, rh] = d.floorSize;
    const cv = sprite({ cacheKey: `rug:${d.art}:${rw}:${rh}`, grid: roomRug(d.art, rw * T, rh * T), palette: OBJECT_PALETTE as Record<string, string> });
    ctx.drawImage(cv, p.x * T - (rw - 1) * 8, p.y * T - (rh - 1) * 8);
  }

  // ---- 3. contact shadows thrown by walls onto the floor
  for (let ly = 0; ly < FH; ly += 1) for (let x = 0; x < GW; x += 1) {
    const t = tl(x, ly);
    if (!t || isWall(t)) continue;
    const X = x * T, Y = ly * T;
    if (isWall(tl(x, ly - 1))) { fill(X, Y, T, 2, 'rgba(10,6,20,.34)'); fill(X, Y + 2, T, 2, 'rgba(10,6,20,.16)'); }
    if (isWall(tl(x - 1, ly))) fill(X, Y, 2, T, 'rgba(10,6,20,.2)');
  }

  // ---- 4. stairs
  for (const s of stairsOnFloor(grid, floor)) {
    const p = floorPoint(s.from);
    const X = p.x * T, Y = p.y * T;
    const up = floorInfo(s.destination).level > floorInfo(floor).level;
    if (s.walkout) {
      fill(X + 1, Y + 1, 14, 14, '#4a3524'); fill(X + 2, Y + 2, 12, 12, '#7a5636');
      fill(X + 7, Y + 2, 2, 12, '#3a2818'); fill(X + 4, Y + 7, 2, 2, '#d8b860'); fill(X + 10, Y + 7, 2, 2, '#d8b860');
      continue;
    }
    fill(X, Y, 32, 32, up ? '#5a3c26' : '#16121c');
    for (let i = 0; i < 8; i += 1) {
      const k = up ? 1 - i * 0.05 : 0.35 + i * 0.09;
      fill(X + 3, Y + i * 4, 26, 3, css(shade(up ? hex('#d2a46a') : hex('#8f7a66'), k)));
      fill(X + 3, Y + i * 4 + 3, 26, 1, 'rgba(0,0,0,.45)');
    }
    fill(X, Y, 3, 32, '#3a2616'); fill(X + 29, Y, 3, 32, '#3a2616');
    fill(X, Y, 1, 32, '#8a6a44'); fill(X + 29, Y, 1, 32, '#8a6a44');
  }

  // ---- 5. walls: a face where the room is to the south, a cap everywhere
  const CAP = '#3d3346', CAP_HI = '#685a72', CAP_LO = '#261f2c', TRIM = '#c9a26a', TRIM_D = '#7a5a34';
  const occupied = new Set(decor.map((d) => `${d.x},${d.y}`));
  for (let ly = 0; ly < FH; ly += 1) for (let x = 0; x < GW; x += 1) {
    const t = tl(x, ly);
    if (!t) continue;
    const X = x * T, Y = ly * T;
    const n = tl(x, ly - 1), s = tl(x, ly + 1), wst = tl(x - 1, ly), est = tl(x + 1, ly);

    if (t.kind === 'door') {
      if (isWall(wst)) { fill(X, Y - 6, 2, 22, TRIM); fill(X + 1, Y - 6, 1, 22, TRIM_D); }
      if (isWall(est)) { fill(X + 14, Y - 6, 2, 22, TRIM); fill(X + 14, Y - 6, 1, 22, TRIM_D); }
      if (isWall(wst) || isWall(est)) fill(X, Y, T, 2, 'rgba(10,6,20,.3)');
      else if (isWall(n) || isWall(s)) { fill(X, Y, T, 2, TRIM); fill(X, Y + 14, T, 2, TRIM_D); }
      continue;
    }
    if (!isWall(t)) continue;

    const face = !isWall(s) && (s !== undefined || (floor !== 'ground' && ly < FH - 1 && isDeep(grid, floor, x, ly + 1)));
    if (face) {
      const outside = isOut(s);
      if (outside) {
        // The outside of the house, seen from the garden.
        const stone = floor === 'basement';
        fill(X, Y, T, T, stone ? '#6c6a72' : '#96584a');
        for (let r = 0; r < 4; r += 1) {
          fill(X, Y + r * 4 + 3, T, 1, stone ? '#4e4c54' : '#6a3a30');
          const o = r & 1 ? 4 : 0;
          fill(X + o, Y + r * 4, 1, 3, stone ? '#4e4c54' : '#6a3a30'); fill(X + o + 8, Y + r * 4, 1, 3, stone ? '#4e4c54' : '#6a3a30');
          if (h2(x, ly * 4 + r, 31) < 0.3) fill(X + o + 1, Y + r * 4, 7, 3, stone ? '#787680' : '#a86656');
        }
        fill(X, Y + 13, T, 3, '#5c5a62'); fill(X, Y + 13, T, 1, '#7c7a84');
        if (s && (x - HOUSE_X) % 6 === 3 && floor === 'ground') {
          fill(X + 2, Y + 2, 12, 9, '#e9dfc8'); fill(X + 3, Y + 3, 10, 7, '#23304e'); fill(X + 7, Y + 3, 2, 7, '#e9dfc8'); fill(X + 4, Y + 4, 2, 2, '#6f86b8');
        }
      } else {
        const a = atlasPoint({ x, y: ly + 1 }, floor);
        const room = roomAt(a.x, a.y);
        const wp = (room && WALLPAPER[room.id]) || DEFAULT_PAPER;
        fill(X, Y, T, T, wp.base);
        if (wp.pat === 'stripe') for (let i = 0; i < 4; i += 1) fill(X + i * 4 + 1, Y, 2, 10, wp.alt);
        else if (wp.pat === 'dot') { fill(X + 3, Y + 3, 2, 2, wp.alt); fill(X + 11, Y + 6, 2, 2, wp.alt); fill(X + 4, Y + 2, 0, 0, wp.alt); }
        else if (wp.pat === 'panel') { fill(X, Y, 1, 10, wp.alt); fill(X + 8, Y, 1, 10, wp.alt); fill(X + 1, Y + 2, 6, 1, wp.alt); fill(X + 9, Y + 2, 6, 1, wp.alt); }
        else if (wp.pat === 'tile') { for (let i = 0; i < 4; i += 1) fill(X + i * 4, Y, 1, 10, wp.alt); fill(X, Y + 4, T, 1, wp.alt); fill(X, Y + 8, T, 1, wp.alt); }
        fill(X, Y, T, 1, 'rgba(10,6,20,.4)'); fill(X, Y + 1, T, 1, 'rgba(10,6,20,.18)');
        fill(X, Y + 10, T, 1, wp.rail);
        fill(X, Y + 11, T, 5, wp.dado);
        fill(X, Y + 11, T, 1, 'rgba(255,255,255,.14)');
        fill(X + 7, Y + 12, 1, 3, 'rgba(0,0,0,.22)');
        fill(X, Y + 15, T, 1, 'rgba(10,6,20,.45)');
        // Windows on the street-facing wall: the neighbours can see in.
        const streetWall = floor === 'ground' && ly === HOUSE_Y;
        const upperWall = floor === 'upper' && isOut(n) && n === undefined && ly <= HOUSE_Y + 1;
        if ((streetWall || upperWall) && (x - HOUSE_X) % 5 === 2 && !occupied.has(`${t.x},${t.y}`)) {
          fill(X + 1, Y + 1, 14, 9, '#efe6d0'); fill(X + 2, Y + 2, 12, 7, '#1c2848');
          fill(X + 7, Y + 2, 2, 7, '#efe6d0'); fill(X + 2, Y + 5, 12, 1, '#efe6d0');
          fill(X + 3, Y + 3, 2, 1, '#8ea4d8'); fill(X + 10, Y + 6, 1, 1, '#c8d4f4');
          fill(X + 1, Y + 1, 2, 9, wp.rail); fill(X + 13, Y + 1, 2, 9, wp.rail);
        }
      }
    } else {
      fill(X, Y, T, T, CAP);
      if (!isWall(wst)) fill(X, Y, 1, T, CAP_HI);
      if (!isWall(est)) fill(X + 15, Y, 1, T, CAP_LO);
    }
    if (!isWall(n)) {
      fill(X, Y - 6, T, 6, CAP); fill(X, Y - 6, T, 1, CAP_HI); fill(X, Y - 1, T, 1, CAP_LO);
      if (!isWall(wst) && wst?.kind !== 'door') fill(X, Y - 6, 1, 6, CAP_HI);
    }
  }

  if (floor === 'ground') paintGarden(grid, fill, lights);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ---- 6. ambient light: the house is lit, the night outside is not
  const ambient = document.createElement('canvas');
  ambient.width = w / 2; ambient.height = h / 2;
  const actx = ambient.getContext('2d')!;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const x = c - PAD_L, ly = r - PAD_T;
    const t = tl(x, ly);
    let col = 'rgb(84,96,150)';
    if (t && !isOut(t)) col = 'rgb(164,150,172)';
    else if (floor === 'upper') col = 'rgb(96,104,160)';
    else if (floor !== 'ground') col = 'rgb(70,64,92)';
    else if (ly <= -8) col = 'rgb(150,160,220)';
    actx.fillStyle = col;
    actx.fillRect(c * 8, r * 8, 8, 8);
  }

  return { floor, canvas, ambient, x0, y0, w, h, windows, lights };
}

/* ------------------------------------------------------------ the street */

function paintStreet(fill: (x: number, y: number, w: number, h: number, c: string) => void, windows: Win[], lights: SceneLight[]): void {
  const left = -PAD_L * T, right = (GW + PAD_R) * T;
  // kerbs and the dashed centre line
  fill(left, -2 * T, right - left, 1, '#8c8a96'); fill(left, T - 1, right - left, 1, '#8c8a96');
  for (let x = left; x < right; x += 24) fill(x, -T + 7, 12, 2, '#d8cf9a');

  // four neighbours, facing us across the road
  const SIDING = ['#93a8c0', '#c2a482', '#a2b896', '#c09a9a'];
  const ROOF = ['#514a62', '#6a4a40', '#465656', '#5a4660'];
  const base = -3 * T;
  let order = 0;
  for (let i = 0; i < 4; i += 1) {
    const hx = 26 + i * 272 + (i % 2) * 14;
    const hw = 196;
    const top = base - 58;
    const siding = SIDING[i]!, roof = ROOF[i]!;
    // roof: stepped gable
    for (let s = 0; s < 7; s += 1) fill(hx - 6 + s * 5, top - 4 - s * 4, hw + 12 - s * 10, 4, s % 2 ? roof : css(shade(hex(roof), 1.12)));
    fill(hx - 8, top - 2, hw + 16, 3, css(shade(hex(roof), 0.7)));
    // chimney
    fill(hx + 30 + i * 22, top - 40, 12, 22, '#7a5a50'); fill(hx + 28 + i * 22, top - 42, 16, 3, '#5a4038');
    // facade with clapboard lines
    fill(hx, top, hw, 58, siding);
    for (let y = top + 5; y < base; y += 6) fill(hx, y, hw, 1, css(shade(hex(siding), 0.84)));
    fill(hx, top, 2, 58, css(shade(hex(siding), 1.15))); fill(hx + hw - 2, top, 2, 58, css(shade(hex(siding), 0.75)));
    fill(hx, base - 4, hw, 4, '#6e6c76');
    // door and porch step
    const dx = hx + (i % 2 ? 60 : 118);
    fill(dx - 3, base - 34, 22, 34, '#efe6d0'); fill(dx, base - 31, 16, 31, i % 2 ? '#5c3a3a' : '#39566a');
    fill(dx + 12, base - 16, 2, 2, '#e8c860'); fill(dx - 6, base - 2, 28, 2, '#8c8a96');
    // windows: three a house, lit one at a time as suspicion climbs
    const spots = i % 2 ? [[104, 26], [152, 26], [16, 26]] : [[18, 26], [66, 26], [164, 26]];
    for (const [ox, oy] of spots) {
      const wx = hx + ox!, wy = top + oy! - 8;
      fill(wx - 2, wy - 2, 26, 26, '#efe6d0'); fill(wx - 3, wy + 22, 28, 3, '#d8cdb4');
      fill(wx, wy, 22, 20, '#1a2440'); fill(wx + 10, wy, 2, 20, '#efe6d0'); fill(wx, wy + 9, 22, 2, '#efe6d0');
      windows.push({ x: wx, y: wy, w: 22, h: 20, order: 0 });
    }
    // dormer
    fill(hx + hw / 2 - 12, top - 24, 24, 18, siding); fill(hx + hw / 2 - 14, top - 27, 28, 4, css(shade(hex(roof), 0.8)));
    fill(hx + hw / 2 - 8, top - 20, 16, 12, '#1a2440'); fill(hx + hw / 2 - 1, top - 20, 2, 12, '#efe6d0');
    // hedge along the front
    for (let x = hx - 4; x < hx + hw + 4; x += 6) {
      if (x > dx - 10 && x < dx + 26) continue;
      fill(x, base - 9 - (h2(x, i, 40) < 0.5 ? 1 : 0), 7, 9, '#2f6a3a'); fill(x + 1, base - 9, 3, 2, '#4a8a4e');
    }
  }
  // order windows so they light from the middle of the street outwards
  const mid = (GW * T) / 2;
  [...windows].sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid)).forEach((wn) => { wn.order = order; order += 1; });

  // trees between the houses
  for (const tx of [-40, 236, 520, 790, 1066]) tree(fill, tx, base - 2, 1);

  // streetlamps on the far pavement
  for (const lx of [120, 400, 680, 960]) {
    fill(lx, base - 44, 3, 56, '#2a2a34'); fill(lx - 1, base + 10, 5, 3, '#2a2a34');
    fill(lx - 8, base - 46, 14, 3, '#2a2a34'); fill(lx - 9, base - 43, 7, 3, '#ffe2a0');
    lights.push({ x: (lx - 5) / T, y: (base - 20) / T, radius: 5.5, colour: [255, 200, 120], intensity: 0.85 });
  }
}

function tree(fill: (x: number, y: number, w: number, h: number, c: string) => void, x: number, baseY: number, scale: number): void {
  fill(x - 3, baseY - 22, 6, 24, '#4a3324'); fill(x - 3, baseY - 22, 2, 24, '#6a4a34');
  const blobs: [number, number, number][] = [[0, -52, 22], [-16, -40, 16], [16, -40, 16], [0, -34, 18]];
  for (const [bx, by, r] of blobs) {
    for (let yy = -r; yy <= r; yy += 2) {
      const half = Math.floor(Math.sqrt(r * r - yy * yy) * scale);
      fill(x + bx - half, baseY + by + yy, half * 2, 2, yy < -r * 0.3 ? '#3f8048' : '#2c6238');
    }
  }
  fill(x - 10, baseY - 62, 8, 4, '#58a05a'); fill(x + 4, baseY - 56, 6, 3, '#58a05a');
}

/* ------------------------------------------------------------ the garden */

function paintGarden(grid: Grid, fill: (x: number, y: number, w: number, h: number, c: string) => void, lights: SceneLight[]): void {
  const tl = (x: number, ly: number) => localTile(grid, 'ground', x, ly);
  const W = GW * T, bottom = FH * T;

  // picket fence round the lot: sides and back
  for (let y = 2 * T; y < bottom; y += 8) {
    for (const fx of [-6, W + 2]) { fill(fx, y, 4, 7, '#d9d0bc'); fill(fx, y, 1, 7, '#f4eedd'); fill(fx + 1, y + 7, 2, 1, '#8c8474'); }
  }
  for (let x = -6; x < W + 6; x += 5) {
    fill(x, bottom + 1, 3, 10, '#d9d0bc'); fill(x, bottom + 1, 1, 10, '#f4eedd'); fill(x + 1, bottom, 1, 1, '#f4eedd');
  }
  fill(-6, bottom + 4, W + 12, 2, '#b8ae98'); fill(-6, bottom + 11, W + 12, 2, 'rgba(10,6,20,.3)');
  // the neighbours' trees lean over the back and side fences
  for (const tx of [-44, W + 44]) for (const ty of [8, 20, 31]) tree(fill, tx, ty * T, 1);
  for (let x = 70; x < W; x += 190) tree(fill, x, bottom + 64, 1);

  // flower beds hard against the front of the house, and scattered wild ones out back
  const COLS = ['#f2d24a', '#e8667a', '#f4f0e6', '#b48ae0'];
  for (let x = 0; x < GW; x += 1) for (let ly = 2; ly < FH; ly += 1) {
    const t = tl(x, ly);
    if (!t || t.kind !== 'yard') continue;
    const X = x * T, Y = ly * T;
    const bed = ly === HOUSE_Y - 1 && x >= HOUSE_X && x < HOUSE_X + BUILDING_WIDTH;
    if (bed) {
      fill(X, Y + 9, T, 7, '#4a3524'); fill(X, Y + 9, T, 1, '#6a4a34');
      for (let i = 0; i < 3; i += 1) {
        const fx = X + 2 + i * 5, fy = Y + 6 + Math.floor(h2(x, i, 50) * 4);
        fill(fx, fy + 2, 1, 4, '#3f8048'); fill(fx - 1, fy, 3, 3, COLS[Math.floor(h2(x, i, 51) * COLS.length)]!); fill(fx, fy + 1, 1, 1, '#fff6d0');
      }
    } else if (h2(x, ly, 52) < 0.09) {
      const fx = X + 3 + Math.floor(h2(x, ly, 53) * 9), fy = Y + 3 + Math.floor(h2(x, ly, 54) * 9);
      fill(fx, fy, 2, 2, COLS[Math.floor(h2(x, ly, 55) * COLS.length)]!); fill(fx, fy + 2, 1, 2, '#3f8048');
    } else if (h2(x, ly, 56) < 0.035) {
      fill(X + 4, Y + 8, 8, 5, '#8c8a90'); fill(X + 5, Y + 7, 6, 1, '#a8a6ac'); fill(X + 4, Y + 12, 8, 1, '#5c5a62');
    }
  }

  // Fifty-two hours of party has reached the front lawn.
  const doorX = (HOUSE_X + 23.5) * T, doorY = HOUSE_Y * T;
  for (let i = 0; i < 26; i += 1) {
    const cx = Math.floor(doorX - 84 + h2(i, 1, 60) * 168), cy = Math.floor(doorY - 42 + h2(i, 2, 61) * 38);
    if (i % 3 === 0) { fill(cx, cy, 3, 4, '#d8434a'); fill(cx, cy, 3, 1, '#f6eee0'); }
    else fill(cx, cy, 2, 1, ['#f2d24a', '#6ac0e8', '#e8667a', '#f4f0e6'][i % 4]!);
  }
  // doormat and porch light
  fill(doorX - 10, doorY - 9, 36, 7, '#7a3a34'); fill(doorX - 8, doorY - 8, 32, 5, '#a8584a'); fill(doorX - 4, doorY - 6, 24, 1, '#e8c890');
  lights.push({ x: HOUSE_X + 24, y: HOUSE_Y - 1.2, radius: 4.2, colour: [255, 214, 150], intensity: 0.8 });
  lights.push({ x: HOUSE_X + 12.5, y: FH - 4.6, radius: 3.6, colour: [255, 214, 150], intensity: 0.6 });
}
