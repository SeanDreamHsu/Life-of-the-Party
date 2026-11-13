/**
 * Furniture, fixtures, food and emotes.
 *
 * Every piece is drawn on the same 32 x 32 canvas the game already uses, with
 * the tile it stands on occupying the middle 16 x 16, so the new set drops
 * onto the existing room layouts without moving a single placement.
 *
 * Everything is seen from the three-quarter view: you look down and forward,
 * so each object shows its top face and its front face. Lit things carry a
 * second, glowing image so lamps, screens and flames stay bright at night.
 */
import { Pix, ramp, flat, bake, type Ramp, type Sprite } from './pix';

/* ------------------------------------------------------------ materials */

const OAK = ramp('#b9834a'), WALNUT = ramp('#7d5236'), PINE = ramp('#d6ab70');
const NAVY = ramp('#42599c'), WINE = ramp('#a53b4a'), MOSS = ramp('#5c8c50'), MUSTARD = ramp('#d6a53a'), PLUMF = ramp('#7a4f93');
const CREAM = ramp('#e8dcc2'), WHITE = ramp('#ecebe6'), PAPER = ramp('#f1e8d0');
const STEEL = ramp('#9ea8b6', 1.2), DSTEEL = ramp('#565e70', 1.1), BRASS = ramp('#d8a83e', 1.25), STONE = ramp('#b9b3ad');
const LEAF = ramp('#4f9c55', 1.1), TERRA = ramp('#c2703f');
const RED = ramp('#d8463c'), CARD = ramp('#c89e68'), CRUST = ramp('#d39a4a'), CHEESE = ramp('#f2c94c');
const WATER = ramp('#6fb7d8'), GLASSW = ramp('#cfe6ee'), PUNCH = ramp('#8fd66a');
const NIGHT = ramp('#27345e'), GREY = ramp('#bcb8c4'), INK = ramp('#2a2334');
const SCREEN = ramp('#3f6fb8', 1.3), FEED = ramp('#4fae6a', 1.25);
const WARM = flat('#fff1bd'), FLAME = flat('#ffd35a'), FLAME_HOT = flat('#fff6d8'), EMBER = flat('#ff8a3c');
const LED_G = flat('#7dffa0'), LED_R = flat('#ff5a5a'), BULB_W = flat('#fffbe6');

const BOOKS: Ramp[] = [RED, NAVY, MOSS, MUSTARD, CREAM, PLUMF, WINE, WATER];
const rnd = (a: number, b: number, s = 0): number => {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export interface PropOpts { on?: boolean; f?: number }
interface PropDef {
  draw: (o: Required<PropOpts>) => Pix;
  /** Animation frames, and how many a second. */
  frames?: number; fps?: number;
  /** Whether the "on" state looks different. */
  switchable?: boolean;
  /** Contact shadow under the piece: x, y, width in sprite pixels. */
  shadow?: readonly [number, number, number];
  /** Hung on a wall or lying flat: never sorted in front of people. */
  flat?: boolean;
}

/* ------------------------------------------------------------ seating */

function couch(): Pix {
  const p = new Pix();
  const U = NAVY;
  p.box(3, 6, 26, 3, 7, U);
  p.box(2, 10, 5, 3, 11, U); p.box(25, 10, 5, 3, 11, U);
  p.rect(7, 14, 18, 6, U, 3); p.rect(7, 14, 18, 1, U, 4);
  p.rect(15, 15, 1, 5, U, 2); p.rect(16, 14, 1, 6, U, 4); p.rect(24, 15, 1, 5, U, 2);
  p.rect(7, 20, 18, 4, U, 1); p.rect(7, 23, 18, 1, U, 0); p.rect(16, 20, 1, 3, U, 0);
  // a mustard cushion left on the seat
  p.ball(10.5, 14, 2.6, 2.6, MUSTARD, 2);
  p.rect(3, 24, 2, 2, WALNUT, 1); p.rect(27, 24, 2, 2, WALNUT, 0);
  return p.outline();
}
function couchBack(): Pix {
  const p = new Pix();
  const U = NAVY;
  p.box(2, 11, 4, 2, 11, U); p.box(26, 11, 4, 2, 11, U);
  p.box(4, 7, 24, 3, 14, U);
  p.rect(15, 11, 1, 12, U, 1); p.rect(16, 11, 1, 12, U, 3);
  p.rect(6, 12, 8, 1, U, 3); p.rect(18, 12, 8, 1, U, 3);
  p.rect(3, 24, 2, 2, WALNUT, 1); p.rect(27, 24, 2, 2, WALNUT, 0);
  return p.outline();
}
function chair(): Pix {
  const p = new Pix();
  const W = WALNUT;
  p.rect(10, 5, 2, 10, W, 2); p.rect(20, 5, 2, 10, W, 1);
  p.rect(10, 4, 12, 2, W, 3); p.rect(12, 8, 8, 2, W, 2); p.rect(12, 12, 8, 1, W, 1);
  p.box(9, 14, 14, 5, 2, W);
  p.rect(11, 15, 10, 3, WINE, 3); p.rect(11, 15, 10, 1, WINE, 4); p.rect(20, 16, 1, 2, WINE, 2);
  p.rect(9, 21, 2, 6, W, 1); p.rect(21, 21, 2, 6, W, 0);
  return p.outline();
}
function chairBack(): Pix {
  const p = new Pix();
  const W = WALNUT;
  p.rect(12, 11, 8, 6, WINE, 2); p.rect(12, 11, 8, 1, WINE, 3);
  p.rect(10, 5, 2, 22, W, 2); p.rect(20, 5, 2, 22, W, 1);
  p.rect(10, 4, 12, 2, W, 3); p.rect(10, 4, 12, 1, W, 4);
  p.rect(12, 8, 8, 2, W, 2); p.rect(12, 13, 8, 1, W, 2);
  p.rect(10, 17, 12, 2, W, 1); p.rect(10, 17, 12, 1, W, 2);
  return p.outline();
}

/* ------------------------------------------------------------- tables */

function tableBase(p: Pix, wood: Ramp): void {
  p.box(4, 10, 24, 8, 3, wood);
  p.rect(7, 12, 9, 1, wood, 2); p.rect(15, 15, 10, 1, wood, 2); p.rect(6, 16, 5, 1, wood, 2);
  p.rect(5, 21, 2, 5, wood, 1); p.rect(25, 21, 2, 5, wood, 0);
}
function cup(p: Pix, x: number, y: number): void {
  p.rect(x, y, 3, 4, RED, 2); p.rect(x, y, 3, 1, CREAM, 4); p.px(x + 2, y + 1, RED, 1); p.px(x + 2, y + 2, RED, 1); p.px(x, y + 3, RED, 3);
}
function plate(p: Pix, cx: number, cy: number, food?: Ramp): void {
  p.ellipse(cx, cy, 2.6, 1.4, WHITE, 3); p.px(cx - 1, cy - 1, WHITE, 4);
  if (food) { p.px(cx, cy, food, 2); p.px(cx + 1, cy, food, 3); }
}
function table(): Pix { const p = new Pix(); tableBase(p, OAK); return p.outline(); }
function tableSet(): Pix {
  const p = new Pix();
  tableBase(p, OAK);
  plate(p, 10, 14, CRUST); cup(p, 15, 10); cup(p, 21, 12);
  p.rect(18, 15, 5, 1, PAPER, 3);
  return p.outline();
}
function banquetTable(): Pix {
  const p = new Pix();
  // Runs edge to edge so three of them read as one long table.
  p.box(0, 8, 32, 11, 3, WALNUT);
  p.rect(0, 10, 32, 7, CREAM, 3); p.rect(0, 10, 32, 1, CREAM, 4); p.rect(0, 16, 32, 1, CREAM, 2);
  for (let x = 3; x < 32; x += 8) p.px(x, 13, CREAM, 2);
  plate(p, 7, 13, MOSS); plate(p, 24, 13, CRUST);
  p.rect(15, 9, 2, 5, CREAM, 4); p.px(15, 8, FLAME, 2, 1); p.px(16, 8, FLAME_HOT, 2, 1); p.rect(14, 14, 4, 1, BRASS, 2);
  p.rect(1, 22, 2, 5, WALNUT, 1); p.rect(29, 22, 2, 5, WALNUT, 0);
  const o = p.outline();
  return o;
}

/* ------------------------------------------------------------ kitchen */

function counterBase(p: Pix): void {
  p.box(2, 7, 28, 5, 1, STONE);
  p.rect(2, 13, 28, 12, OAK, 2); p.rect(2, 13, 28, 1, OAK, 1);
  for (const x of [4, 17]) { p.panel(x, 15, 11, 9, OAK, 2); p.rect(x + 2, 17, 7, 5, OAK, 1); p.rect(x + 2, 17, 7, 1, OAK, 0); }
  p.px(13, 19, BRASS, 3); p.px(18, 19, BRASS, 3);
  p.rect(3, 25, 26, 1, OAK, 0);
}
function counter(): Pix {
  const p = new Pix();
  counterBase(p);
  p.rect(6, 8, 4, 2, PINE, 3); p.rect(6, 8, 4, 1, PINE, 4);
  p.rect(22, 6, 3, 4, WHITE, 3); p.px(24, 7, WHITE, 2); p.px(25, 8, WHITE, 3);
  return p.outline();
}
function sink(): Pix {
  const p = new Pix();
  counterBase(p);
  p.rect(9, 8, 14, 3, STEEL, 1); p.rect(9, 8, 14, 1, STEEL, 0); p.rect(10, 10, 12, 1, STEEL, 3); p.px(15, 9, DSTEEL, 0);
  p.rect(15, 3, 2, 5, STEEL, 3); p.rect(15, 3, 5, 2, STEEL, 3); p.rect(19, 5, 1, 1, STEEL, 2); p.px(15, 3, STEEL, 4);
  p.px(12, 6, STEEL, 4); p.px(20, 7, STEEL, 2);
  return p.outline();
}
function fridge(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.box(8, 1, 16, 3, 24, STEEL);
  p.rect(9, 4, 1, 23, STEEL, 3); p.rect(8, 11, 16, 1, STEEL, 0); p.rect(8, 12, 16, 1, STEEL, 3);
  p.rect(20, 6, 1, 4, DSTEEL, 1);
  if (!o.on) {
    p.rect(20, 14, 1, 8, DSTEEL, 1);
    p.rect(11, 14, 4, 4, PAPER, 3); p.px(12, 14, RED, 2); p.rect(12, 16, 2, 1, INK, 2); p.px(16, 20, MUSTARD, 3);
  } else {
    // The door stands open and the light inside is the brightest thing in the room.
    p.rect(9, 13, 14, 13, WARM, 2, 1);
    p.rect(9, 17, 14, 1, STEEL, 2); p.rect(9, 22, 14, 1, STEEL, 2);
    p.rect(11, 14, 2, 3, MOSS, 2); p.rect(14, 15, 3, 2, RED, 2); p.rect(18, 14, 2, 3, WATER, 3);
    p.rect(10, 19, 4, 3, CARD, 3); p.rect(16, 20, 2, 2, MUSTARD, 2); p.rect(19, 19, 3, 3, WHITE, 3);
    p.rect(11, 24, 5, 2, MOSS, 3); p.rect(18, 24, 4, 2, CRUST, 2);
    p.box(3, 11, 5, 2, 15, STEEL); p.rect(4, 14, 3, 11, WHITE, 3);
  }
  return p.outline();
}
function keg(): Pix {
  const p = new Pix();
  p.rect(9, 8, 14, 18, STEEL, 2); p.rect(9, 8, 2, 18, STEEL, 3); p.rect(21, 8, 2, 18, STEEL, 1); p.rect(12, 9, 1, 16, STEEL, 4);
  p.rect(9, 13, 14, 1, DSTEEL, 2); p.rect(9, 21, 14, 1, DSTEEL, 2); p.rect(9, 25, 14, 1, STEEL, 0);
  p.ellipse(16, 8, 6.4, 2.2, STEEL, 3); p.ellipse(16, 8, 4, 1.1, DSTEEL, 1);
  p.rect(15, 3, 2, 5, DSTEEL, 2); p.rect(13, 3, 6, 1, RED, 2); p.px(13, 3, RED, 3);
  return p.outline();
}

/* ------------------------------------------------------ living things */

function television(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.box(6, 19, 20, 3, 4, WALNUT); p.rect(9, 23, 6, 2, WALNUT, 1); p.rect(17, 23, 6, 2, WALNUT, 1);
  p.rect(14, 17, 4, 2, DSTEEL, 0);
  p.rect(4, 3, 24, 15, DSTEEL, 1); p.rect(4, 3, 24, 1, DSTEEL, 3); p.rect(27, 4, 1, 14, DSTEEL, 0);
  // Late-night television nobody is watching.
  const f = o.f % 3;
  p.rect(6, 5, 20, 11, SCREEN, f === 2 ? 3 : 2, 1);
  if (f === 0) { p.rect(6, 11, 20, 5, SCREEN, 1, 1); p.ellipse(19, 9, 2, 2, SCREEN, 4, 1); p.rect(8, 13, 6, 3, SCREEN, 0, 1); }
  else if (f === 1) { p.rect(6, 12, 20, 4, SCREEN, 1, 1); p.ellipse(13, 10, 3, 3, SCREEN, 4, 1); p.rect(12, 13, 3, 3, SCREEN, 3, 1); }
  else { for (let y = 5; y < 16; y += 1) for (let x = 6; x < 26; x += 1) if (rnd(x, y, 9) < 0.42) p.px(x, y, SCREEN, rnd(x, y, 4) < 0.5 ? 4 : 1, 1); }
  p.px(26, 17, LED_R, 2, 1);
  return p.outline();
}
function speaker(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.box(9, 2, 14, 3, 23, WALNUT);
  p.rect(11, 6, 10, 20, INK, 2); p.rect(11, 6, 10, 1, INK, 1);
  p.ball(16, 10, 2, 2, STEEL, 2); p.px(16, 10, DSTEEL, 0);
  const push = o.on && o.f % 2 === 1;
  p.ball(16, 19, push ? 4.6 : 4, push ? 4.6 : 4, DSTEEL, push ? 3 : 2);
  p.ball(16, 19, push ? 2.2 : 1.6, push ? 2.2 : 1.6, STEEL, 3);
  p.px(12, 24, o.on ? LED_G : INK, o.on ? 2 : 4, o.on ? 1 : 0);
  return p.outline();
}
function lamp(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.ellipse(16, 27, 4, 1.3, BRASS, 1); p.rect(13, 26, 6, 1, BRASS, 3);
  p.rect(15, 10, 2, 16, BRASS, 2); p.rect(15, 10, 1, 16, BRASS, 3);
  for (let i = 0; i < 8; i += 1) {
    const w = 8 + Math.round((i * 6) / 7), x = 16 - w / 2;
    if (o.on) { p.rect(x, 2 + i, w, 1, i > 4 ? FLAME_HOT : WARM, 2, 1); }
    else { p.rect(x, 2 + i, w, 1, CREAM, 2); p.rect(x, 2 + i, 2, 1, CREAM, 3); p.rect(x + w - 2, 2 + i, 2, 1, CREAM, 1); }
  }
  p.rect(9, 9, 14, 1, BRASS, o.on ? 4 : 2);
  p.rect(12, 2, 8, 1, BRASS, 3);
  return p.outline();
}
function bed(): Pix {
  const p = new Pix();
  p.box(4, 2, 24, 2, 5, WALNUT); p.rect(8, 5, 16, 3, WALNUT, 3); p.rect(8, 5, 16, 1, WALNUT, 4);
  p.rect(5, 9, 22, 4, WHITE, 2);
  for (const x of [7, 17]) { p.rect(x, 9, 8, 4, WHITE, 4); p.rect(x, 12, 8, 1, WHITE, 2); p.rect(x + 7, 10, 1, 3, WHITE, 2); p.px(x + 2, 10, WHITE, 3); }
  p.rect(5, 13, 22, 11, NAVY, 2); p.rect(26, 13, 1, 11, NAVY, 1);
  p.rect(5, 13, 22, 2, CREAM, 3); p.rect(5, 13, 22, 1, CREAM, 4); p.rect(5, 15, 22, 1, NAVY, 3);
  for (let y = 17; y < 24; y += 3) for (let x = 7 + ((y / 3) & 1) * 3; x < 26; x += 6) p.px(x, y, NAVY, 3);
  p.rect(5, 24, 22, 1, NAVY, 0);
  p.box(4, 25, 24, 1, 2, WALNUT);
  return p.outline();
}
function toilet(): Pix {
  const p = new Pix();
  p.box(11, 4, 10, 2, 6, WHITE); p.px(13, 7, STEEL, 2); p.px(14, 7, STEEL, 4);
  p.rect(13, 22, 6, 4, WHITE, 2); p.rect(18, 22, 1, 4, WHITE, 1);
  p.ball(16, 17, 5.6, 5, WHITE, 3);
  p.ellipse(16, 16.5, 3.4, 2.8, WHITE, 1); p.ellipse(16, 17, 2.6, 2, WATER, 2); p.px(15, 16, WATER, 4);
  return p.outline();
}
function bookshelf(): Pix {
  const p = new Pix();
  p.box(6, 1, 20, 2, 25, WALNUT);
  for (let s = 0; s < 3; s += 1) {
    const top = 4 + s * 8;
    p.rect(8, top, 16, 7, WALNUT, 0);
    let x = 8;
    while (x < 24) {
      const r = rnd(x, s, 2);
      const w = r < 0.3 ? 1 : 2;
      if (rnd(x, s, 7) < 0.12 && x < 22) { x += 2; continue; }
      const h = 4 + Math.floor(rnd(x, s, 3) * 3);
      const c = BOOKS[Math.floor(rnd(x, s, 5) * BOOKS.length)]!;
      p.rect(x, top + 7 - h, Math.min(w, 24 - x), h, c, 2);
      p.px(x, top + 7 - h, c, 4); if (w === 2) p.rect(x + 1, top + 8 - h, 1, h - 1, c, 1);
      if (h > 4) p.px(x, top + 9 - h, c, 3);
      x += w;
    }
    p.rect(8, top + 7, 16, 1, WALNUT, 3);
  }
  return p.outline();
}
function plant(): Pix {
  const p = new Pix();
  for (let i = 0; i < 7; i += 1) { const inset = Math.floor(i / 3); p.rect(11 + inset, 21 + i, 10 - inset * 2, 1, TERRA, 2); p.px(11 + inset, 21 + i, TERRA, 3); p.px(20 - inset, 21 + i, TERRA, 1); }
  p.rect(10, 19, 12, 2, TERRA, 3); p.rect(10, 19, 12, 1, TERRA, 4); p.rect(21, 20, 1, 1, TERRA, 2);
  p.ball(16, 11, 6.5, 6, LEAF, 2); p.ball(10.5, 14, 4, 3.6, LEAF, 2); p.ball(21.5, 14, 4, 3.6, LEAF, 1); p.ball(16, 5.5, 4, 3.4, LEAF, 3);
  for (const [x, y] of [[12, 8], [17, 4], [9, 13], [15, 11], [20, 9]] as const) { p.px(x, y, LEAF, 4); p.px(x + 1, y, LEAF, 4); }
  for (const [x, y] of [[14, 15], [19, 13], [12, 11], [18, 17], [22, 16]] as const) p.px(x, y, LEAF, 0);
  return p.outline();
}
function pc(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.box(2, 15, 28, 5, 2, OAK); p.rect(3, 22, 2, 5, OAK, 1); p.rect(27, 22, 2, 5, OAK, 0);
  p.rect(12, 15, 8, 1, DSTEEL, 1); p.rect(15, 13, 2, 2, DSTEEL, 0);
  p.rect(7, 1, 18, 12, DSTEEL, 1); p.rect(7, 1, 18, 1, DSTEEL, 3); p.rect(24, 2, 1, 11, DSTEEL, 0);
  if (!o.on) { p.rect(9, 3, 14, 8, INK, 2); p.line(11, 9, 16, 4, INK, 4); p.px(21, 4, INK, 3); }
  else {
    // Four camera feeds. Somebody is always moving in one of them.
    for (const [x, y, i] of [[9, 3, 0], [16, 3, 1], [9, 7, 2], [16, 7, 3]] as const) {
      p.rect(x, y, 7, 4, FEED, 1, 1); p.rect(x, y + 3, 7, 1, FEED, 0, 1);
      const who = (i + o.f) % 4;
      if (who !== 3) { p.px(x + 2 + who, y + 1, FEED, 4, 1); p.px(x + 2 + who, y + 2, FEED, 3, 1); }
      if ((o.f + i) % 3 === 0) p.rect(x, y + 1 + (o.f % 2), 7, 1, FEED, 2, 1);
    }
    p.rect(15, 3, 1, 8, INK, 2); p.rect(9, 6, 14, 1, INK, 2);
    if (o.f % 2 === 0) p.px(22, 3, LED_R, 2, 1);
  }
  p.rect(9, 17, 10, 2, STEEL, 3); p.rect(9, 18, 10, 1, STEEL, 2); p.rect(21, 17, 2, 2, STEEL, 3);
  return p.outline();
}

/* -------------------------------------------------------- decorations */

function painting(): Pix {
  const p = new Pix();
  p.panel(8, 6, 16, 12, BRASS, 2); p.rect(9, 7, 14, 10, BRASS, 1);
  p.rect(10, 8, 12, 8, NIGHT, 2); p.rect(10, 8, 12, 3, NIGHT, 1);
  p.rect(18, 9, 2, 2, BULB_W, 2); p.px(12, 9, NIGHT, 4); p.px(15, 10, NIGHT, 4);
  p.rect(10, 14, 12, 2, MOSS, 1); p.rect(10, 13, 5, 1, MOSS, 1); p.rect(17, 13, 5, 1, MOSS, 2); p.px(13, 12, MOSS, 1); p.px(19, 12, MOSS, 2);
  return p.outline();
}
function cobweb(): Pix {
  const p = new Pix();
  for (const [x, y] of [[18, 8], [14, 12], [8, 18]] as const) p.line(8, 8, x, y, GREY, 3);
  p.line(13, 8, 11, 11, GREY, 2); p.line(11, 11, 8, 13, GREY, 2); p.line(17, 8, 13, 13, GREY, 2); p.line(13, 13, 8, 17, GREY, 2);
  return p;
}
function candle(o: Required<PropOpts>): Pix {
  const p = new Pix();
  p.ellipse(16, 26, 3.6, 1.3, BRASS, 2); p.rect(13, 25, 6, 1, BRASS, 4); p.rect(15, 22, 2, 3, BRASS, 2); p.px(15, 22, BRASS, 4);
  p.rect(14, 13, 4, 9, CREAM, 3); p.rect(17, 13, 1, 9, CREAM, 2); p.rect(14, 13, 1, 9, CREAM, 4); p.px(14, 15, CREAM, 2); p.px(15, 16, CREAM, 2);
  p.outline();
  p.px(16, 12, INK, 2);
  const f = o.f % 3, lean = f === 1 ? 1 : f === 2 ? -1 : 0;
  p.px(16, 11, EMBER, 2, 1); p.px(15, 11, EMBER, 2, 1);
  p.px(15, 10, FLAME, 2, 1); p.px(16, 10, FLAME_HOT, 2, 1); p.px(17, 10, FLAME, 2, 1);
  p.px(15 + lean, 9, FLAME, 2, 1); p.px(16 + lean, 9, FLAME_HOT, 2, 1);
  p.px(16 + lean, 8, FLAME, 2, 1); if (f !== 1) p.px(16 + lean, 7, EMBER, 2, 1);
  return p;
}
function balloon(): Pix {
  const p = new Pix();
  p.ball(16, 9, 6, 7, RED, 2); p.px(13, 5, RED, 4); p.px(13, 6, RED, 4); p.px(14, 4, RED, 4); p.rect(15, 17, 2, 1, RED, 1);
  p.outline();
  p.line(16, 19, 17, 22, GREY, 3); p.line(17, 22, 15, 25, GREY, 3); p.line(15, 25, 16, 28, GREY, 3);
  return p;
}
function discoball(o: Required<PropOpts>): Pix {
  const p = new Pix();
  const f = o.f % 4;
  for (let y = 6; y <= 20; y += 1) for (let x = 9; x <= 23; x += 1) {
    const dx = (x - 16) / 7.3, dy = (y - 13) / 7.3;
    if (dx * dx + dy * dy > 1) continue;
    const tile = (Math.floor((x + f) / 2) + Math.floor(y / 2)) & 1;
    const lit = -(dx * 0.62 + dy * 0.78);
    p.px(x, y, STEEL, (tile ? 3 : 1) + (lit > 0.4 ? 1 : lit < -0.5 ? -1 : 0));
  }
  p.outline();
  p.rect(16, 0, 1, 6, DSTEEL, 1);
  const sparks = [[12, 9], [19, 11], [14, 16], [21, 15]] as const;
  const [sx, sy] = sparks[f]!;
  p.px(sx, sy, BULB_W, 2, 1); p.px(sx - 1, sy, BULB_W, 2, 1); p.px(sx + 1, sy, BULB_W, 2, 1); p.px(sx, sy - 1, BULB_W, 2, 1); p.px(sx, sy + 1, BULB_W, 2, 1);
  return p;
}
function cups(): Pix {
  const p = new Pix();
  cup(p, 11, 14); cup(p, 17, 17);
  p.rect(18, 11, 5, 3, RED, 2); p.rect(22, 11, 1, 3, CREAM, 4); p.rect(18, 13, 4, 1, RED, 1);
  p.outline();
  p.rect(14, 21, 3, 1, MUSTARD, 3); p.px(22, 15, MUSTARD, 3); p.px(23, 16, MUSTARD, 2);
  return p;
}
function pizzabox(): Pix {
  const p = new Pix();
  p.box(7, 5, 18, 6, 1, CARD); p.rect(9, 7, 14, 3, CARD, 2);
  p.rect(7, 12, 18, 12, CARD, 3); p.rect(7, 12, 18, 1, CARD, 1); p.rect(24, 13, 1, 11, CARD, 2); p.rect(7, 23, 18, 1, CARD, 1);
  p.ellipse(16, 18, 6.4, 4.2, CRUST, 2); p.ellipse(16, 18, 5.2, 3.2, CHEESE, 3);
  for (const [x, y] of [[13, 17], [17, 16], [15, 20], [19, 19]] as const) p.px(x, y, RED, 2);
  for (let i = 0; i < 5; i += 1) p.rect(16 + i, 18 - i, 6 - i, 1, CARD, 3);
  return p.outline();
}
function punchbowl(): Pix {
  const p = new Pix();
  p.rect(13, 23, 6, 2, GLASSW, 2); p.rect(11, 25, 10, 1, GLASSW, 3);
  p.ball(16, 17, 8, 6, GLASSW, 3);
  p.ellipse(16, 14, 6.6, 2.4, PUNCH, 3, 1); p.ellipse(16, 14.6, 5, 1.2, PUNCH, 2, 1);
  p.px(13, 14, MUSTARD, 3, 1); p.px(18, 13, RED, 3, 1); p.px(20, 15, MUSTARD, 3, 1);
  p.rect(9, 12, 14, 1, GLASSW, 4);
  p.outline();
  p.line(20, 13, 25, 7, STEEL, 3); p.px(25, 6, STEEL, 4);
  return p;
}
function wire(p: Pix, y: number): number[] {
  const ys: number[] = [];
  for (let x = 0; x < 32; x += 1) { const sag = Math.round(3.2 * Math.sin((x / 31) * Math.PI)); ys.push(y + sag); p.px(x, y + sag, INK, 2); }
  return ys;
}
function bunting(): Pix {
  const p = new Pix();
  const cols = [RED, MUSTARD, MOSS, PLUMF, NAVY];
  const ys: number[] = [];
  for (let x = 0; x < 32; x += 1) ys.push(9 + Math.round(3.2 * Math.sin((x / 31) * Math.PI)));
  for (let i = 0; i < 5; i += 1) {
    const x = 2 + i * 6, c = cols[i]!;
    for (let r = 0; r < 5; r += 1) { p.rect(x + Math.ceil(r / 2), ys[x + 2]! + 1 + r, 5 - r, 1, c, r === 0 ? 3 : 2); }
    p.px(x + 4, ys[x + 2]! + 2, c, 1);
  }
  p.outline();
  wire(p, 9);
  return p;
}
function stringlights(o: Required<PropOpts>): Pix {
  const p = new Pix();
  const ys = wire(p, 9);
  const cols = [FLAME, LED_R, BULB_W, LED_G, flat('#7fc4ff')];
  for (let i = 0; i < 5; i += 1) {
    const x = 3 + i * 6, y = ys[x]! + 1;
    const bright = (i + o.f) % 2 === 0;
    p.px(x, y, INK, 3);
    p.rect(x - 1, y + 1, 3, 2, cols[i]!, 2, bright ? 1 : 0); p.px(x, y + 3, cols[i]!, 2, bright ? 1 : 0);
    if (!bright) p.tone(x - 1, y + 1, 3, 3, 0);
  }
  return p;
}

/* --------------------------------------------------------------- food */

function dish(p: Pix): void { p.ellipse(16, 20, 7, 3, WHITE, 3); p.ellipse(16, 20, 5, 1.8, WHITE, 2); p.rect(11, 18, 6, 1, WHITE, 4); }
const FOODS: Record<string, () => Pix> = {
  pizza: () => {
    const p = new Pix(); dish(p);
    for (let i = 0; i < 8; i += 1) { const w = 9 - i; p.rect(12 + Math.floor(i / 2), 13 + i, w, 1, CHEESE, i < 2 ? 2 : 3); }
    p.rect(11, 12, 11, 2, CRUST, 2); p.rect(11, 12, 11, 1, CRUST, 3);
    p.px(14, 15, RED, 2); p.px(18, 16, RED, 2); p.px(16, 18, RED, 2); p.px(15, 16, CHEESE, 4);
    return p.outline();
  },
  nachos: () => {
    const p = new Pix();
    p.ball(16, 20, 7, 3.4, WINE, 2); p.ellipse(16, 18, 6.4, 1.6, WINE, 1);
    for (const [x, y] of [[11, 15], [15, 13], [19, 15], [13, 17], [18, 17]] as const) { p.rect(x, y, 3, 1, CHEESE, 3); p.rect(x, y + 1, 2, 1, CHEESE, 2); p.px(x, y + 2, CRUST, 2); }
    p.px(16, 15, MOSS, 3); p.px(14, 14, RED, 2);
    return p.outline();
  },
  chips: () => {
    const p = new Pix();
    p.rect(11, 9, 10, 14, RED, 2); p.rect(11, 9, 2, 14, RED, 3); p.rect(19, 9, 2, 14, RED, 1);
    p.rect(11, 8, 10, 2, RED, 1); for (let x = 11; x < 21; x += 2) p.px(x, 7, RED, 2);
    p.ellipse(16, 16, 3, 3, CHEESE, 3); p.px(15, 15, CHEESE, 4); p.rect(13, 21, 6, 1, CREAM, 3);
    return p.outline();
  },
  soda: () => {
    const p = new Pix();
    p.rect(13, 10, 6, 13, RED, 2); p.rect(13, 10, 1, 13, RED, 4); p.rect(18, 10, 1, 13, RED, 1);
    p.rect(13, 14, 6, 4, CREAM, 3); p.rect(18, 14, 1, 4, CREAM, 2); p.rect(15, 15, 2, 2, RED, 2);
    p.rect(13, 9, 6, 1, STEEL, 3); p.rect(14, 8, 4, 1, STEEL, 2); p.rect(13, 23, 6, 1, STEEL, 1);
    return p.outline();
  },
  leftovers: () => {
    const p = new Pix();
    p.box(9, 14, 14, 6, 3, STEEL); p.rect(10, 15, 12, 4, STEEL, 1);
    p.rect(11, 15, 4, 3, CRUST, 2); p.rect(16, 15, 5, 2, MOSS, 2); p.px(18, 17, RED, 2); p.px(12, 15, CRUST, 4); p.rect(15, 17, 3, 1, CHEESE, 3);
    return p.outline();
  },
  cake: () => {
    const p = new Pix(); dish(p);
    p.box(11, 11, 10, 4, 6, WHITE, PINE); p.rect(11, 17, 10, 1, WINE, 2); p.rect(11, 15, 10, 1, WHITE, 4);
    p.px(13, 12, RED, 2); p.px(18, 13, RED, 2); p.rect(16, 8, 1, 3, CREAM, 4); p.px(16, 7, FLAME, 2, 1);
    return p.outline();
  },
};

/* ------------------------------------------------------------- emotes */

const BUBBLE = flat('#fbf6e8'), E_BLUE = flat('#4f7fd6'), E_RED = flat('#e0484a'), E_INK = flat('#2a2334'), E_GREY = flat('#b7b3c2'), E_GOLD = flat('#f0b93a');
const EMOTE_ICONS: Record<string, [string[], Record<string, Ramp>]> = {
  note: [['...bb', '..bbb', '..b.b', '..b..', '.bb..', 'bbb..', '.b...'], { b: E_BLUE }],
  food: [['..yy..', '.yyyy.', '.yryy.', '.yyry.', '..yy..', '..cc..', '..cc..'], { y: E_GOLD, r: E_RED, c: CREAM }],
  heart: [['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: E_RED }],
  anger: [['r...r', 'rr.rr', '.....', 'rr.rr', 'r...r'], { r: E_RED }],
  sweat: [['..b..', '..b..', '.bbb.', 'bbbbb', 'bbbbb', '.bbb.'], { b: E_BLUE }],
  sleep: [['bbbb...', '..b....', '.b..bbb', 'bbbb.b.', '....bbb'], { b: E_BLUE }],
  alert: [['rr', 'rr', 'rr', 'rr', '..', 'rr', 'rr'], { r: E_RED }],
  skull: [['.ggggg.', 'ggggggg', 'gigggig', 'gigggig', 'ggggggg', '.ggigg.', '.g.g.g.'], { g: E_GREY, i: E_INK }],
};
function emote(id: string): Pix {
  const p = new Pix(16, 16);
  p.rect(2, 1, 12, 10, BUBBLE, 2); p.rect(1, 2, 14, 8, BUBBLE, 2); p.rect(4, 11, 3, 1, BUBBLE, 2); p.px(4, 12, BUBBLE, 2);
  p.outline();
  const [rows, key] = EMOTE_ICONS[id] ?? EMOTE_ICONS.alert!;
  const w = rows[0]!.length;
  p.art(Math.round(8 - w / 2), Math.round(6 - rows.length / 2), rows, Object.fromEntries(Object.entries(key).map(([k, r]) => [k, [r, 2] as const])));
  return p;
}

/* --------------------------------------------------------------- doors */

/** A door leaf in a wall that runs left to right. 16 wide, 22 tall: it stands 6 px above its tile. */
function doorPanel(state: 'closed' | 'open' | 'locked'): Pix {
  const p = new Pix(16, 22);
  if (state === 'open') {
    // Swung inward and seen edge-on against the left jamb.
    p.rect(2, 1, 3, 20, OAK, 2); p.rect(2, 1, 1, 20, OAK, 4); p.rect(4, 1, 1, 20, OAK, 0); p.px(4, 12, BRASS, 3);
    return p;
  }
  p.rect(2, 1, 12, 20, OAK, 2); p.rect(2, 1, 12, 1, OAK, 4); p.rect(2, 1, 1, 20, OAK, 3); p.rect(13, 2, 1, 19, OAK, 1);
  p.panel(4, 3, 8, 6, OAK, 1); p.panel(4, 11, 8, 8, OAK, 1);
  p.px(12, 11, BRASS, 4); p.px(12, 12, BRASS, 2);
  if (state === 'locked') {
    p.rect(2, 9, 12, 2, DSTEEL, 1); p.rect(2, 9, 12, 1, DSTEEL, 3);
    p.rect(6, 8, 4, 4, BRASS, 2); p.rect(6, 8, 4, 1, BRASS, 4); p.px(8, 10, INK, 2); p.rect(7, 6, 2, 2, STEEL, 3);
  }
  return p;
}
/** A door in a wall that runs top to bottom: you see it edge-on. */
function doorSide(state: 'closed' | 'open' | 'locked'): Pix {
  const p = new Pix(16, 22);
  if (state === 'open') { p.rect(1, 1, 14, 3, OAK, 2); p.rect(1, 1, 14, 1, OAK, 4); p.rect(1, 3, 14, 1, OAK, 0); return p; }
  p.rect(6, 1, 4, 20, OAK, 2); p.rect(6, 1, 4, 1, OAK, 4); p.rect(6, 1, 1, 20, OAK, 3); p.rect(9, 2, 1, 19, OAK, 0);
  p.px(8, 12, BRASS, 4);
  if (state === 'locked') { p.rect(5, 9, 6, 4, BRASS, 2); p.rect(5, 9, 6, 1, BRASS, 4); p.px(8, 11, INK, 2); }
  return p;
}

/* ------------------------------------------------------------ registry */

export const PROP_DEFS: Record<string, PropDef> = {
  couch: { draw: couch, shadow: [3, 25, 26] },
  couchBack: { draw: couchBack, shadow: [3, 25, 26] },
  chair: { draw: chair, shadow: [9, 26, 14] },
  chairBack: { draw: chairBack, shadow: [9, 26, 14] },
  table: { draw: table, shadow: [5, 25, 22] },
  tableSet: { draw: tableSet, shadow: [5, 25, 22] },
  banquetTable: { draw: banquetTable, shadow: [0, 26, 32] },
  counter: { draw: counter, shadow: [2, 25, 28] },
  sink: { draw: sink, shadow: [2, 25, 28] },
  fridge: { draw: fridge, switchable: true, shadow: [8, 27, 16] },
  keg: { draw: keg, shadow: [9, 26, 14] },
  television: { draw: television, frames: 3, fps: 2.5, shadow: [6, 25, 20] },
  speaker: { draw: speaker, frames: 2, fps: 4, switchable: true, shadow: [9, 27, 14] },
  lamp: { draw: lamp, switchable: true, shadow: [12, 27, 8] },
  bed: { draw: bed, shadow: [4, 27, 24] },
  toilet: { draw: toilet, shadow: [12, 25, 8] },
  bookshelf: { draw: bookshelf, shadow: [6, 27, 20] },
  plant: { draw: plant, shadow: [11, 27, 10] },
  pc: { draw: pc, frames: 4, fps: 3, switchable: true, shadow: [3, 26, 26] },
  painting: { draw: painting, flat: true },
  cobweb: { draw: cobweb, flat: true },
  candle: { draw: candle, frames: 3, fps: 7, shadow: [13, 27, 6] },
  balloon: { draw: balloon },
  discoball: { draw: discoball, frames: 4, fps: 5 },
  cups: { draw: cups },
  pizzabox: { draw: pizzabox, shadow: [7, 23, 18] },
  punchbowl: { draw: punchbowl, shadow: [11, 25, 10] },
  bunting: { draw: bunting, flat: true },
  stringlights: { draw: stringlights, frames: 2, fps: 1.6, flat: true },
};

export function propSprite(id: string, o: PropOpts = {}): Sprite {
  const def = PROP_DEFS[id];
  const on = !!o.on, f = (o.f ?? 0) % (def?.frames ?? 1);
  return bake(`prop:${id}:${on ? 1 : 0}:${f}`, () => (def ? def.draw({ on, f }) : new Pix()));
}
export function propFrame(id: string, time: number, phase = 0): number {
  const def = PROP_DEFS[id];
  return def?.frames ? Math.floor(time * (def.fps ?? 4) + phase * 7) % def.frames : 0;
}
export function foodSprite(id: string): Sprite { return bake(`food:${id}`, () => (FOODS[id] ?? FOODS.pizza!)()); }
export function emoteSprite(id: string): Sprite { return bake(`emote:${id}`, () => emote(id)); }
export function doorSprite(kind: 'h' | 'v', state: 'closed' | 'open' | 'locked'): Sprite {
  return bake(`door:${kind}:${state}`, () => (kind === 'h' ? doorPanel(state) : doorSide(state)).outline());
}
export const FOOD_IDS = Object.keys(FOODS);
export const EMOTE_IDS = Object.keys(EMOTE_ICONS);
