/**
 * The cast, rebuilt on one rig.
 *
 * Each person is assembled from the same parts (legs, torso, arms, head, hair,
 * outfit, accessory), drawn for three views: facing the camera, facing away
 * and in profile. Left is profile mirrored. Because the parts are separate,
 * every animation works for everybody and a new guest is one line of data.
 *
 * Who somebody is still comes from the game's own data: hair, outfit and
 * colours are read from src/art, so no identity was changed here.
 */
import { GUEST_SKINS, HOST_SKIN, DEFAULT_SKIN } from '../../../src/art/palette';
import { CHARACTER_LOOKS } from '../../../src/art/sprites/people';
import { Pix, ramp, flat, bake, mixRgb, type Ramp, type Sprite, type RGB } from './pix';

export type View = 'down' | 'up' | 'side';
export type Anim = 'idle' | 'walk' | 'dance' | 'act' | 'shove' | 'talk' | 'hurt' | 'wave' | 'carry';
export const ANIM_FRAMES: Record<Anim, number> = { idle: 2, walk: 4, dance: 4, act: 1, shove: 1, talk: 2, hurt: 1, wave: 2, carry: 4 };

type Arm = 'down' | 'up' | 'out' | 'hold' | number;
interface Pose { bob: number; head: number; legL: number; legR: number; stride: number; armL: Arm; armR: Arm; lean: number; face: 'normal' | 'blink' | 'hurt' | 'talk'; plate: boolean }

const EYE = flat('#241a2c'), WHITE = flat('#fbf7ee'), FERAL = flat('#ff5040'), MOUTH = flat('#8a2f3a'), SHIRT = ramp('#eee6d4');
const GOLD = ramp('#e2b84a', 1.2), SPEC = flat('#2a2334'), TIE = ramp('#c8403e'), SCARF = ramp('#b8454e'), PLATE = ramp('#ecebe6'), SICK: RGB = [142, 176, 96];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ROT = [0, 0.16, 0.42, 0.68];

interface Inks { skin: Ramp; hair: Ramp; top: Ramp; bottom: Ramp; shoe: Ramp }
const inkCache = new Map<string, Inks>();
function inksFor(id: string, stage: number): Inks {
  const k = `${id}:${stage}`;
  let v = inkCache.get(k);
  if (!v) {
    const s = id === 'host' ? HOST_SKIN : GUEST_SKINS[id] ?? DEFAULT_SKIN;
    const dull = (c: string): RGB => mixRgb(hex(c), [110, 112, 100], stage * 0.09);
    v = { skin: ramp(mixRgb(hex(s.skin), SICK, ROT[stage]!)), hair: ramp(dull(s.hair), 1.15), top: ramp(dull(s.shirt)), bottom: ramp(dull(s.pants)), shoe: ramp(dull(s.shoe)) };
    inkCache.set(k, v);
  }
  return v;
}

/* ----------------------------------------------------------------- hair */

interface HairSpec { top: number; fringe: number; sides: number; wide?: boolean; part?: 'mid' | 'swept'; extra?: 'ponytail' | 'bun' | 'mohawk' | 'cap' | 'locs' | 'curls' | 'quiff' | 'shag' }
const HAIR: Record<string, HairSpec> = {
  swept: { top: 4, fringe: 2, sides: 9, part: 'swept' },
  curls: { top: 3, fringe: 2, sides: 12, wide: true, extra: 'curls' },
  shag: { top: 3, fringe: 3, sides: 14, wide: true, extra: 'shag' },
  ponytail: { top: 4, fringe: 2, sides: 10, part: 'mid', extra: 'ponytail' },
  quiff: { top: 3, fringe: 1, sides: 9, extra: 'quiff' },
  bob: { top: 4, fringe: 3, sides: 14, wide: true },
  cap: { top: 4, fringe: 1, sides: 9, extra: 'cap' },
  bun: { top: 4, fringe: 2, sides: 10, part: 'mid', extra: 'bun' },
  parted: { top: 4, fringe: 2, sides: 9, part: 'mid' },
  fade: { top: 5, fringe: 1, sides: 8 },
  mohawk: { top: 5, fringe: 0, sides: 7, extra: 'mohawk' },
  locs: { top: 3, fringe: 2, sides: 15, wide: true, extra: 'locs' },
};

function drawHair(p: Pix, spec: HairSpec, view: View, H: Ramp, cap: Ramp, hy: number, hx: number, stage: number): void {
  const x0 = 10 + hx, x1 = 21 + hx;
  const row = (y: number, a: number, b: number, l = 2) => { for (let x = a; x <= b; x += 1) p.px(x, y + hy, H, l); };
  const top = spec.top;
  // the cap of hair over the skull
  for (let y = top; y <= 6; y += 1) { const inset = y === top ? 2 : y === top + 1 ? 1 : 0; row(y, x0 + inset, x1 - inset, y === top ? 3 : 2); }
  row(top, x0 + 3, x0 + 6, 4); row(top + 1, x0 + 2, x0 + 4, 3);
  const wide = spec.wide ? 1 : 0;
  if (view === 'down') {
    for (let y = 7; y < 7 + spec.fringe; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (spec.part === 'mid' && Math.abs(x - (x0 + 5.5)) < (y - 6) * 1.5) continue;
        if (spec.part === 'swept' && x > x0 + 3 + (8 - y) * 3) continue;
        p.px(x, y + hy, H, y === 6 + spec.fringe ? 1 : 2);
      }
    }
    for (let y = 7; y <= spec.sides; y += 1) { row(y, x0 - wide, x0, 2); row(y, x1, x1 + wide, 1); }
  } else if (view === 'up') {
    for (let y = 7; y <= Math.max(12, spec.sides); y += 1) row(y, x0 - wide, x1 + wide, y > 11 ? 1 : 2);
    row(8, x0 + 2, x0 + 3, 3); row(10, x1 - 3, x1 - 2, 1);
  } else {
    for (let y = 7; y <= Math.max(11, spec.sides); y += 1) row(y, x0 - wide, x0 + 4 + (y < 9 ? 2 : 0), y > 11 ? 1 : 2);
    for (let y = 7; y < 7 + spec.fringe; y += 1) row(y, x1 - 3 + (y - 7), x1, 2);
  }
  switch (spec.extra) {
    case 'quiff': row(top - 1, x0 + 4, x0 + 9, 3); row(top - 2, x0 + 6, x0 + 9, 4); if (view !== 'up') row(top, x0 + 7, x0 + 9, 4); break;
    case 'bun': p.ball(15.5 + hx, top - 2 + hy, 2.4, 2, H, 2); break;
    case 'mohawk': for (let y = top - 4; y < top; y += 1) row(y, x0 + 4 + (y < top - 2 ? 1 : 0), x0 + 7 - (y < top - 2 ? 1 : 0), y < top - 2 ? 4 : 3); for (let y = top; y <= 6; y += 1) { row(y, x0, x0 + 3, 0); row(y, x0 + 8, x1, 0); } break;
    case 'ponytail':
      if (view === 'up') { for (let y = 9; y <= 17; y += 1) row(y, x0 + 4, x0 + 7, y % 3 === 0 ? 1 : 2); row(9, x0 + 4, x0 + 7, 0); }
      else if (view === 'side') { for (let y = 8; y <= 16; y += 1) row(y, x0 - 3, x0 - 1, y > 13 ? 1 : 2); }
      else { for (let y = 5; y <= 14; y += 1) row(y, x1 + 1, x1 + 2, 1); }
      break;
    case 'cap': {
      const c = (y: number, a: number, b: number, l: number) => { for (let x = a; x <= b; x += 1) p.px(x, y + hy, cap, l); };
      for (let y = top - 1; y <= 6; y += 1) { const inset = y === top - 1 ? 2 : y === top ? 1 : 0; c(y, x0 + inset, x1 - inset, y === top - 1 ? 4 : 3); }
      c(5, x0 + 2, x1 - 5, 4);
      if (view === 'down') c(7, x0 - 1, x1 + 1, 1); else if (view === 'side') c(7, x0 + 5, x1 + 3, 1); else c(7, x0, x1, 2);
      break;
    }
    case 'locs': for (let x = x0 - 1; x <= x1 + 1; x += 2) for (let y = 7; y <= spec.sides; y += 1) if (view === 'up' || x <= x0 + 1 || x >= x1 - 1 || (view === 'side' && x < x0 + 6)) p.px(x, y + hy, H, (y + x) % 3 === 0 ? 3 : 1); break;
    case 'curls': for (let x = x0 - 1; x <= x1 + 1; x += 2) { p.px(x, top - 1 + hy + ((x >> 1) & 1), H, 3); } for (let y = 6; y <= spec.sides; y += 2) { p.px(x0 - 2, y + hy, H, 2); p.px(x1 + 2, y + hy, H, 1); } break;
    case 'shag': for (let x = x0 - 1; x <= x1 + 1; x += 3) p.px(x, spec.sides + 1 + hy, H, 1); p.px(x0 + 3, top - 1 + hy, H, 3); p.px(x1 - 2, top - 1 + hy, H, 2); break;
    default: break;
  }
  // Somebody three days into a party has stopped fixing their hair.
  if (stage >= 2) { p.px(x0 + 2, top - 1 + hy, H, 2); p.px(x1 - 1, top - 1 + hy, H, 1); if (stage === 3) { p.px(x0 - 1, 8 + hy, H, 1); p.px(x1 + 1, 6 + hy, H, 2); } }
}

/* ----------------------------------------------------------------- body */

function poseFor(anim: Anim, f: number, stage: number): Pose {
  const base: Pose = { bob: 0, head: stage >= 3 ? 2 : stage >= 2 ? 1 : 0, legL: 0, legR: 0, stride: 0, armL: 'down', armR: 'down', lean: 0, face: 'normal', plate: false };
  const zombie = stage >= 3;
  switch (anim) {
    case 'walk': case 'carry': {
      const s = [{ legL: 0, legR: 2, stride: 3, bob: 0, a: 1 }, { legL: 0, legR: 0, stride: 0, bob: -1, a: 0 }, { legL: 2, legR: 0, stride: -3, bob: 0, a: -1 }, { legL: 0, legR: 0, stride: 0, bob: -1, a: 0 }][f % 4]!;
      Object.assign(base, { legL: s.legL, legR: s.legR, stride: s.stride, bob: s.bob });
      if (anim === 'carry') { base.armL = 'hold'; base.armR = 'hold'; base.plate = true; }
      else if (zombie) { base.armL = 'out'; base.armR = 'out'; }
      else { base.armL = -s.a; base.armR = s.a; }
      break;
    }
    case 'idle': base.head += f % 2; break;
    case 'dance': {
      const k = f % 4;
      base.bob = k % 2 ? 1 : 0; base.armL = k === 0 ? 'up' : k === 2 ? 'out' : 'down'; base.armR = k === 2 ? 'up' : k === 0 ? 'out' : 'down'; base.lean = k === 0 ? -1 : k === 2 ? 1 : 0;
      base.legL = k === 1 ? 1 : 0; base.legR = k === 3 ? 1 : 0;
      break;
    }
    case 'act': base.armR = 'out'; base.lean = 1; break;
    case 'shove': base.armL = 'out'; base.armR = 'out'; base.lean = 1; base.stride = 2; base.legR = 1; break;
    case 'talk': base.armR = f % 2 ? 'up' : 'out'; base.face = f % 2 ? 'talk' : 'normal'; break;
    case 'hurt': base.armL = 'up'; base.armR = 'up'; base.lean = -1; base.face = 'hurt'; base.legL = 1; break;
    case 'wave': base.armR = 'up'; base.lean = f % 2 ? 1 : 0; break;
    default: break;
  }
  return base;
}

function drawPerson(id: string, stage: number, anim: Anim, frame: number, view: View, blink: boolean): Pix {
  const p = new Pix();
  const look = CHARACTER_LOOKS[id] ?? CHARACTER_LOOKS.host!;
  const ink = inksFor(id, stage);
  const po = poseFor(anim, frame, stage);
  if (blink && po.face === 'normal') po.face = 'blink';
  const by = po.bob, hy = po.bob + po.head;
  const { skin: S, top: T, bottom: B, shoe: SH } = ink;
  const outfit = look.outfit;
  const sleeve = outfit === 'vest' || outfit === 'apron' ? SHIRT : T;
  const bare = outfit === 'dress';
  const broad = look.broad ? 1 : 0;

  if (view !== 'side') {
    const back = view === 'up';
    const tx0 = 13 - broad, tx1 = 18 + broad, lean = po.lean;
    // legs and shoes
    const leg = (x: number, lift: number, dark: boolean) => {
      const R = bare ? S : B;
      p.rect(x, 23 + by, 3, 5 - lift, R, dark || lift ? 1 : 2); p.px(x, 23 + by, R, 3);
      p.rect(x - (x < 16 ? 1 : 0), 28 - lift, 4, 2, SH, 2); p.rect(x - (x < 16 ? 1 : 0), 28 - lift, 4, 1, SH, 3);
    };
    leg(13, po.legL, false); leg(16, po.legR, true);
    p.rect(15, 24 + by, 1, 4 - Math.max(po.legL, po.legR), bare ? S : B, 0);
    // torso
    p.rect(tx0 + lean, 15 + by, tx1 - tx0 + 1, 8, T, 2);
    p.rect(tx0 + lean, 15 + by, 1, 8, T, 3); p.rect(tx1 + lean, 15 + by, 1, 8, T, 1); p.rect(tx0 + lean, 22 + by, tx1 - tx0 + 1, 1, T, 1);
    if (outfit === 'dress') { p.rect(tx0 - 1, 22 + by, tx1 - tx0 + 3, 4, T, 2); p.rect(tx0 - 1, 25 + by, tx1 - tx0 + 3, 1, T, 1); p.rect(tx0 - 1, 22 + by, 1, 4, T, 3); p.rect(tx0, 20 + by, tx1 - tx0 + 1, 1, T, 1); }
    if (outfit === 'stripe') for (let y = 16; y < 23; y += 2) p.rect(tx0 + lean, y + by, tx1 - tx0 + 1, 1, SHIRT, 3);
    if (!back) {
      if (outfit === 'jacket') { p.rect(15 + lean, 15 + by, 2, 5, SHIRT, 3); p.px(14 + lean, 16 + by, T, 3); p.px(17 + lean, 16 + by, T, 1); p.rect(15 + lean, 20 + by, 1, 3, T, 1); }
      if (outfit === 'cardigan') { p.rect(15 + lean, 15 + by, 2, 2, SHIRT, 3); for (let y = 17; y < 23; y += 2) p.px(16 + lean, y + by, T, 4); p.rect(15 + lean, 17 + by, 1, 6, T, 1); }
      if (outfit === 'hoodie') { p.rect(tx0 + 1 + lean, 15 + by, tx1 - tx0 - 1, 1, T, 3); p.rect(14 + lean, 20 + by, 4, 2, T, 1); p.px(15 + lean, 16 + by, SHIRT, 3); p.px(16 + lean, 17 + by, SHIRT, 3); }
      if (outfit === 'vest') { p.rect(15 + lean, 15 + by, 2, 3, SHIRT, 3); p.px(15 + lean, 19 + by, GOLD, 3); p.px(15 + lean, 21 + by, GOLD, 3); }
      if (outfit === 'apron') { p.rect(14 + lean, 16 + by, 4, 9, SHIRT, 3); p.rect(14 + lean, 16 + by, 4, 1, SHIRT, 4); p.rect(17 + lean, 17 + by, 1, 8, SHIRT, 2); p.rect(15 + lean, 20 + by, 2, 1, SHIRT, 1); }
      if (outfit === 'dress') { p.rect(14 + lean, 15 + by, 4, 1, S, 2); p.px(15 + lean, 16 + by, S, 2); p.px(16 + lean, 16 + by, S, 2); }
      if (look.accessory === 'tie') { p.rect(15 + lean, 15 + by, 2, 1, TIE, 3); p.rect(15 + lean, 16 + by, 1, 4, TIE, 2); p.px(16 + lean, 17 + by, TIE, 1); }
      if (look.accessory === 'chain') { p.px(14 + lean, 16 + by, GOLD, 3); p.px(15 + lean, 17 + by, GOLD, 4); p.px(16 + lean, 17 + by, GOLD, 3); p.px(17 + lean, 16 + by, GOLD, 2); }
      if (stage >= 2) { p.px(tx0 + 1 + lean, 21 + by, T, 0); p.px(tx1 - 1 + lean, 18 + by, ink.skin, 1); }
      if (stage >= 3) { p.clear(tx0 + lean, 22 + by); p.px(tx1 - 2 + lean, 20 + by, T, 0); p.px(tx0 + 2 + lean, 17 + by, ink.skin, 0); }
    } else {
      if (outfit === 'hoodie') { p.rect(tx0 + 1, 15 + by, tx1 - tx0 - 1, 3, T, 3); p.rect(tx0 + 1, 17 + by, tx1 - tx0 - 1, 1, T, 1); }
      if (outfit === 'apron') { p.rect(tx0, 19 + by, tx1 - tx0 + 1, 1, SHIRT, 3); p.px(15, 20 + by, SHIRT, 3); p.px(16, 21 + by, SHIRT, 2); }
      if (outfit === 'vest') p.rect(15, 16 + by, 1, 6, T, 1);
    }
    // arms
    const arm = (side: -1 | 1, a: Arm) => {
      const x = side < 0 ? tx0 - 2 + lean : tx1 + 1 + lean;
      const sh = side < 0 ? 3 : 1;
      if (a === 'up') { p.rect(x + side, 9 + by, 2, 7, sleeve, 2); p.rect(x + side, 9 + by, 1, 7, sleeve, sh); p.rect(x + side, 7 + by, 2, 2, S, 2); }
      else if (a === 'out') { p.rect(side < 0 ? x - 3 : x, 16 + by, 5, 2, sleeve, 2); p.rect(side < 0 ? x - 3 : x, 16 + by, 5, 1, sleeve, 3); p.rect(side < 0 ? x - 5 : x + 5, 16 + by, 2, 2, S, 2); }
      else if (a === 'hold') { p.rect(x, 15 + by, 2, 4, sleeve, 2); p.rect(side < 0 ? x + 1 : x - 1, 18 + by, 2, 2, sleeve, 1); p.rect(side < 0 ? x + 2 : x - 2, 19 + by, 2, 2, S, 2); }
      else {
        const sw = typeof a === 'number' ? a : 0;
        const len = 6 - Math.abs(sw) + (stage >= 2 ? 1 : 0);
        p.rect(x, 15 + by, 2, len, sleeve, 2); p.rect(x, 15 + by, 1, len, sleeve, sh); p.rect(side < 0 ? x + 1 : x, 16 + by, 1, len - 1, sleeve, 1);
        p.rect(x, 15 + by + len, 2, 2, S, sw > 0 ? 3 : 2);
      }
    };
    arm(-1, po.armL); arm(1, po.armR);
    if (po.plate && !back) { p.rect(12, 19 + by, 8, 2, PLATE, 3); p.rect(12, 19 + by, 8, 1, PLATE, 4); p.rect(14, 18 + by, 4, 1, GOLD, 2); }
    if (look.accessory === 'scarf') { p.rect(tx0 - 1 + lean, 14 + by, tx1 - tx0 + 3, 2, SCARF, 2); p.rect(tx0 - 1 + lean, 14 + by, tx1 - tx0 + 3, 1, SCARF, 3); if (!back) p.rect(tx1 - 1 + lean, 16 + by, 2, 4, SCARF, 1); }
    // head
    const hx = lean;
    for (let y = 6; y <= 14; y += 1) { const inset = y === 6 || y === 13 ? 1 : y === 14 ? 2 : 0; p.rect(10 + inset + hx, y + hy, 12 - inset * 2, 1, S, y >= 13 ? 1 : 2); }
    p.rect(10 + hx, 7 + hy, 1, 6, S, 3); p.rect(21 + hx, 7 + hy, 1, 6, S, 1);
    if (!back) {
      const ey = 10 + hy;
      if (po.face === 'blink') { p.rect(12 + hx, ey + 1, 2, 1, S, 0); p.rect(18 + hx, ey + 1, 2, 1, S, 0); }
      else if (po.face === 'hurt') { p.px(12 + hx, ey, EYE, 2); p.px(13 + hx, ey + 1, EYE, 2); p.px(12 + hx, ey + 2, EYE, 2); p.px(19 + hx, ey, EYE, 2); p.px(18 + hx, ey + 1, EYE, 2); p.px(19 + hx, ey + 2, EYE, 2); }
      else if (stage >= 3) { p.rect(12 + hx, ey, 2, 2, FERAL, 2, 1); p.rect(18 + hx, ey, 2, 2, FERAL, 2, 1); p.rect(12 + hx, ey + 2, 2, 1, S, 0); p.rect(18 + hx, ey + 2, 2, 1, S, 0); }
      else {
        p.rect(12 + hx, ey, 1, 2, WHITE, 2); p.rect(13 + hx, ey, 1, 2, EYE, 2); p.rect(18 + hx, ey, 1, 2, EYE, 2); p.rect(19 + hx, ey, 1, 2, WHITE, 2);
        if (stage >= 1) { p.rect(12 + hx, ey + 2, 2, 1, S, 1); p.rect(18 + hx, ey + 2, 2, 1, S, 1); }
        if (stage >= 2) { p.px(12 + hx, ey, S, 1); p.px(19 + hx, ey, S, 1); }
      }
      p.px(11 + hx, 12 + hy, S, 3); p.px(20 + hx, 12 + hy, S, 3);
      if (po.face === 'talk' || po.face === 'hurt' || stage >= 2) { p.rect(15 + hx, 13 + hy, 2, 1, MOUTH, 2); if (stage >= 3 || po.face === 'hurt') p.rect(15 + hx, 12 + hy, 2, 1, MOUTH, 2); if (stage >= 2) p.px(16 + hx, 14 + hy, WHITE, 2); }
      else p.rect(15 + hx, 13 + hy, 2, 1, S, 0);
      if (look.accessory === 'glasses') { p.rect(11 + hx, 9 + hy, 4, 1, SPEC, 2); p.rect(17 + hx, 9 + hy, 4, 1, SPEC, 2); p.rect(15 + hx, 10 + hy, 2, 1, SPEC, 2); p.px(11 + hx, 11 + hy, SPEC, 2); p.px(20 + hx, 11 + hy, SPEC, 2); }
      if (look.accessory === 'earrings') { p.px(10 + hx, 13 + hy, GOLD, 4); p.px(21 + hx, 13 + hy, GOLD, 3); }
    }
    drawHair(p, HAIR[look.hair] ?? HAIR.parted!, view, ink.hair, T, hy, hx, stage);
    if (look.accessory === 'headphones') { p.rect(11 + hx, 3 + hy, 10, 1, SPEC, 2); p.rect(9 + hx, 8 + hy, 2, 4, SPEC, 2); p.rect(21 + hx, 8 + hy, 2, 4, SPEC, 2); p.px(9 + hx, 9 + hy, TIE, 3); p.px(22 + hx, 9 + hy, TIE, 2); }
  } else {
    // ---- profile, facing right
    const lean = po.lean, st = po.stride, R = bare ? S : B;
    const leg = (off: number, lift: number, far: boolean) => {
      for (let i = 0; i < 5 - lift; i += 1) { const x = 14 + Math.round((off * i) / 4); p.rect(x, 23 + by + i, 3, 1, R, far ? 0 : 2); if (!far) p.px(x, 23 + by + i, R, 3); }
      p.rect(14 + off, 28 - lift, 4, 2, SH, far ? 1 : 2); if (!far) p.rect(14 + off, 28 - lift, 4, 1, SH, 3);
    };
    leg(-st, st === 0 ? po.legR : 0, true);
    // far arm, glimpsed behind the body
    if (typeof po.armL === 'number') { const sw = -po.armR as number; p.rect(15 + lean - Math.sign(sw || 0) * 2, 16 + by, 2, 5, sleeve, 0); }
    p.rect(13 + lean, 15 + by, 6 + broad, 8, T, 2); p.rect(13 + lean, 15 + by, 1, 8, T, 3); p.rect(18 + broad + lean, 15 + by, 1, 8, T, 1); p.rect(13 + lean, 22 + by, 6 + broad, 1, T, 1);
    if (outfit === 'dress') { p.rect(12, 22 + by, 8, 4, T, 2); p.rect(12, 25 + by, 8, 1, T, 1); }
    if (outfit === 'stripe') for (let y = 16; y < 23; y += 2) p.rect(13 + lean, y + by, 6 + broad, 1, SHIRT, 3);
    if (outfit === 'apron') { p.rect(17 + lean, 16 + by, 2 + broad, 9, SHIRT, 3); p.rect(13 + lean, 19 + by, 4, 1, SHIRT, 2); }
    if (outfit === 'jacket' || outfit === 'vest') p.rect(18 + broad + lean, 15 + by, 1, 5, SHIRT, 3);
    if (outfit === 'hoodie') { p.rect(12 + lean, 15 + by, 3, 3, T, 3); p.rect(12 + lean, 17 + by, 3, 1, T, 1); }
    if (look.accessory === 'scarf') { p.rect(12 + lean, 14 + by, 8, 2, SCARF, 2); p.rect(12 + lean, 16 + by, 2, 4, SCARF, 1); }
    if (look.accessory === 'tie') p.rect(19 + lean, 15 + by, 1, 4, TIE, 2);
    leg(st, st === 0 ? po.legL : 0, false);
    // head
    const hx = lean + (stage >= 2 ? 1 : 0);
    for (let y = 6; y <= 14; y += 1) { const inset = y === 6 || y === 13 ? 1 : y === 14 ? 2 : 0; p.rect(10 + inset + hx, y + hy, 12 - inset * 2, 1, S, y >= 13 ? 1 : 2); }
    p.rect(10 + hx, 7 + hy, 1, 6, S, 1); p.px(22 + hx, 11 + hy, S, 2); p.px(22 + hx, 12 + hy, S, 1);
    p.rect(14 + hx, 10 + hy, 2, 3, S, 1); p.px(14 + hx, 11 + hy, S, 0);
    const ey = 10 + hy;
    if (po.face === 'blink') p.rect(18 + hx, ey + 1, 2, 1, S, 0);
    else if (stage >= 3) p.rect(18 + hx, ey, 2, 2, FERAL, 2, 1);
    else { p.rect(18 + hx, ey, 1, 2, WHITE, 2); p.rect(19 + hx, ey, 1, 2, EYE, 2); if (stage >= 1) p.rect(18 + hx, ey + 2, 2, 1, S, 1); }
    if (po.face === 'talk' || po.face === 'hurt' || stage >= 2) p.rect(19 + hx, 13 + hy, 2, 1, MOUTH, 2); else p.px(20 + hx, 13 + hy, S, 0);
    if (look.accessory === 'glasses') { p.rect(17 + hx, 9 + hy, 5, 1, SPEC, 2); p.px(17 + hx, 11 + hy, SPEC, 2); p.rect(12 + hx, 9 + hy, 5, 1, SPEC, 2); }
    if (look.accessory === 'earrings') p.px(14 + hx, 13 + hy, GOLD, 4);
    drawHair(p, HAIR[look.hair] ?? HAIR.parted!, view, ink.hair, T, hy, hx, stage);
    if (look.accessory === 'headphones') { p.rect(12 + hx, 3 + hy, 6, 1, SPEC, 2); p.rect(13 + hx, 8 + hy, 3, 5, SPEC, 2); p.px(14 + hx, 10 + hy, TIE, 3); }
    // near arm, drawn last so it swings in front of the body
    const a = po.armR;
    if (a === 'up') { p.rect(16 + lean, 9 + by, 2, 7, sleeve, 2); p.rect(16 + lean, 7 + by, 2, 2, S, 2); }
    else if (a === 'out') { p.rect(16 + lean, 16 + by, 6, 2, sleeve, 2); p.rect(16 + lean, 16 + by, 6, 1, sleeve, 3); p.rect(22 + lean, 16 + by, 2, 2, S, 2); if (po.armL === 'out') { p.rect(17 + lean, 18 + by, 5, 1, sleeve, 0); p.px(22 + lean, 18 + by, S, 1); } }
    else if (a === 'hold') { p.rect(15 + lean, 15 + by, 2, 4, sleeve, 2); p.rect(16 + lean, 18 + by, 4, 2, sleeve, 1); p.rect(20 + lean, 18 + by, 2, 2, S, 2); }
    else {
      const sw = (typeof a === 'number' ? a : 0) * 2;
      for (let i = 0; i < 6; i += 1) { const x = 15 + lean + Math.round((sw * i) / 5); p.rect(x, 15 + by + i, 2, 1, sleeve, 2); p.px(x, 15 + by + i, sleeve, 3); }
      p.rect(15 + lean + sw, 21 + by, 2, 2, S, 2);
    }
    if (po.plate) { p.rect(19, 19 + by, 6, 2, PLATE, 3); p.rect(19, 19 + by, 6, 1, PLATE, 4); p.rect(20, 18 + by, 4, 1, GOLD, 2); }
  }
  return p.outline();
}

export function personSprite(id: string, stage: number, anim: Anim, frame: number, view: View, blink = false): Sprite {
  const f = frame % ANIM_FRAMES[anim];
  return bake(`person:${id}:${stage}:${anim}:${f}:${view}:${blink ? 1 : 0}`, () => drawPerson(id, stage, anim, f, view, blink));
}
export const PERSON_IDS = Object.keys(CHARACTER_LOOKS);
