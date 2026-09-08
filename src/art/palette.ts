import { mix, type PixelPalette } from './pixel';
import type { MutationStage } from '../types/game';

/**
 * PEOPLE INK
 *
 * Character sprites are authored against semantic slots, not literal colours:
 * 's' is "skin", not "#e0ac7e". One well-drawn pose therefore serves every
 * guest — swap the palette and you get a different person in the same posture.
 * Three guests x four mutation stages = twelve looks from four hand-drawn poses.
 *
 *   .  transparent      o  outline        s  skin        d  skin shade
 *   h  hair             g  hair shade     e  eye         w  eye white
 *   m  mouth            t  shirt          u  shirt shade p  pants
 *   q  pants shade      b  shoe           n  ground shadow
 */

const OUTLINE = '#17110d';
const MOUTH = '#5c2b28';
const EYE_WHITE = '#f2ece2';
const SHADOW = 'rgba(0,0,0,0.30)';

/** Where skin drifts as a guest turns, and where the eyes end up at the end. */
const SICK_GREEN = '#86a05e';
const FERAL_EYE = '#c93a2b';
const CALM_EYE = '#241a14';

/** How far each stage pulls skin toward SICK_GREEN. */
const MUTATION_TINT: Record<MutationStage, number> = {
  0: 0,
  1: 0.18,
  2: 0.46,
  3: 0.7,
};

export interface GuestSkin {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  shirt: string;
  shirtShade: string;
  pants: string;
  pantsShade: string;
  shoe: string;
}

/** One palette per guest, so the same pose reads as three different people. */
export const GUEST_SKINS: Record<string, GuestSkin> = {
  'guest-gary': {
    skin: '#e0a878',
    skinShade: '#bd8659',
    hair: '#4a3a28',
    hairShade: '#2f2117',
    shirt: '#3f7fa8',
    shirtShade: '#2d5f81',
    pants: '#3b4657',
    pantsShade: '#2a3341',
    shoe: '#2b2118',
  },
  'guest-denise': {
    skin: '#8d5a3c',
    skinShade: '#6d4229',
    hair: '#241a14',
    hairShade: '#120c09',
    shirt: '#c2506b',
    shirtShade: '#96374f',
    pants: '#d9d2c4',
    pantsShade: '#b0a897',
    shoe: '#e8e2d8',
  },
  'guest-moss': {
    skin: '#efc39c',
    skinShade: '#c99b74',
    hair: '#b5652c',
    hairShade: '#8a4a1d',
    shirt: '#6f8f4a',
    shirtShade: '#516d33',
    pants: '#6b5842',
    pantsShade: '#4d3f2f',
    shoe: '#3a2c1f',
  },
  'guest-priya': {
    skin: '#c68642',
    skinShade: '#9c6630',
    hair: '#1d1410',
    hairShade: '#0e0907',
    shirt: '#8158b0',
    shirtShade: '#5f3e86',
    pants: '#2f3440',
    pantsShade: '#22262f',
    shoe: '#181410',
  },
  'guest-benno': {
    skin: '#f0cfa8',
    skinShade: '#caa87f',
    hair: '#d8b45c',
    hairShade: '#a3843a',
    shirt: '#c96a2e',
    shirtShade: '#9a4d1c',
    pants: '#4a5560',
    pantsShade: '#353d46',
    shoe: '#2a2018',
  },
  'guest-roz': {
    skin: '#f2d3b4',
    skinShade: '#ccac8c',
    hair: '#a83b2a',
    hairShade: '#7c2819',
    shirt: '#2f8f8a',
    shirtShade: '#1f6a66',
    pants: '#3b3b46',
    pantsShade: '#2a2a33',
    shoe: '#201914',
  },
  'guest-teddy': {
    skin: '#a9713f',
    skinShade: '#84552c',
    hair: '#241a13',
    hairShade: '#120c08',
    shirt: '#d2a52c',
    shirtShade: '#9e7a17',
    pants: '#3f4a3a',
    pantsShade: '#2d352a',
    shoe: '#221a12',
  },
  'guest-nadia': {
    skin: '#d9a473',
    skinShade: '#b07f52',
    hair: '#171012',
    hairShade: '#0a0709',
    shirt: '#bd3f7e',
    shirtShade: '#8e2a5c',
    pants: '#22242c',
    pantsShade: '#16171d',
    shoe: '#e2dcd2',
  },
  'guest-colm': {
    skin: '#e8c4a4',
    skinShade: '#bf9c7e',
    hair: '#9aa0a6',
    hairShade: '#6f757b',
    shirt: '#33456e',
    shirtShade: '#22304f',
    pants: '#5a5348',
    pantsShade: '#413c34',
    shoe: '#2b241c',
  },
  'guest-yusuf': {
    skin: '#8a5a34',
    skinShade: '#6a4224',
    hair: '#191110',
    hairShade: '#0b0707',
    shirt: '#ddd6c6',
    shirtShade: '#b0a898',
    pants: '#37424f',
    pantsShade: '#27303a',
    shoe: '#1d1811',
  },
  'guest-bex': {
    skin: '#f4d9bd',
    skinShade: '#ccb197',
    hair: '#e6dfc9',
    hairShade: '#b0a68d',
    shirt: '#26242a',
    shirtShade: '#161519',
    pants: '#5c3a56',
    pantsShade: '#432a3e',
    shoe: '#1a1616',
  },
  'guest-marlon': {
    skin: '#6f4326',
    skinShade: '#523018',
    hair: '#140e0a',
    hairShade: '#080504',
    shirt: '#2f6b3f',
    shirtShade: '#1e4c2b',
    pants: '#4b4a52',
    pantsShade: '#36353c',
    shoe: '#1f1a15',
  },
};

/** Fallback so an unrecognised guest id still renders instead of crashing. */
export const DEFAULT_SKIN: GuestSkin = {
  skin: '#d8a780',
  skinShade: '#b3835f',
  hair: '#3a2b1f',
  hairShade: '#231a12',
  shirt: '#7a7f8a',
  shirtShade: '#5b606a',
  pants: '#44484f',
  pantsShade: '#31343a',
  shoe: '#241d16',
};

/**
 * Resolves a guest's ink for a given stage. Skin drifts green, eyes go red at
 * the end — the visual tell that a guest is about to stop taking hints.
 */
export function guestPalette(skin: GuestSkin, stage: MutationStage): PixelPalette {
  const rot = MUTATION_TINT[stage];
  return {
    o: OUTLINE,
    s: mix(skin.skin, SICK_GREEN, rot),
    d: mix(skin.skinShade, SICK_GREEN, rot),
    h: skin.hair,
    g: skin.hairShade,
    e: stage === 3 ? FERAL_EYE : CALM_EYE,
    w: EYE_WHITE,
    m: MOUTH,
    t: skin.shirt,
    u: skin.shirtShade,
    p: skin.pants,
    q: skin.pantsShade,
    b: skin.shoe,
    n: SHADOW,
  };
}

/**
 * OBJECT INK
 *
 * Furniture and food share one palette so the whole house reads as a single
 * art pass. Uppercase is consistently the darker/shaded partner of lowercase.
 *
 * Every material is a RAMP of three or four steps, not a pair. Two shades is
 * what makes hand-drawn props read as flat colouring-in; a light, a mid, a dark
 * and a near-black is what lets a 32x32 object look round.
 *
 * The dark end of each ramp doubles as that material's outline. A pure black
 * line around everything is the other thing that flattens pixel art — an object
 * outlined in its own dark hue sits in the scene instead of being stickered on
 * top of it. `o` is kept for hard contact edges only.
 *
 * Light comes from the upper left, always. Highlights go top-left, shadow and
 * contact go bottom-right, on every single prop.
 *
 *   o  hard outline     d  deep shadow      n  ground shadow
 *   y/w/W  wood         l/c/C  upholstery   x/z/Z  metal
 *   K/k  screen         E/i/I/j  ceramic    p/r/R  red
 *   g/f/F  gold         h/v/V  green        q/b/B  crust
 *   m/M  plum           G  emissive core
 */
export const OBJECT_PALETTE: PixelPalette = {
  o: '#16100c',
  d: '#291f18',

  y: '#b07f4c',
  w: '#8a5a34',
  W: '#5f3a20',

  l: '#7189bd',
  c: '#4d6291',
  C: '#2f3f66',

  x: '#d3dae1',
  z: '#98a1ab',
  Z: '#5b636d',

  K: '#5f97c4',
  k: '#1a232b',

  // Ceramic: plates and porcelain. Four steps, because a white object with two
  // shades reads as a flat card.
  E: '#fbf7ef',
  i: '#e6ded1',
  I: '#bfb4a3',
  j: '#8e8474',

  p: '#e0614d',
  r: '#c0392b',
  R: '#7f2018',

  g: '#ffe9a3',
  f: '#e8b33c',
  F: '#a9761a',

  h: '#86bd5e',
  v: '#5f9440',
  V: '#375f26',

  q: '#ddad70',
  b: '#c08a4a',
  B: '#8a5c28',

  m: '#7d4a8f',
  M: '#4e2b5c',

  /** Emissive core. Anything actually giving off light gets this at its centre. */
  G: '#fffbe8',

  n: 'rgba(0,0,0,0.30)',
};

/**
 * The host — you. Deliberately plainer than the guests: white tee, dark jeans,
 * no party colours. You are the only person here still trying.
 */
export const HOST_SKIN: GuestSkin = {
  skin: '#d99b6c',
  skinShade: '#b57a4f',
  hair: '#2e2620',
  hairShade: '#1a1512',
  shirt: '#dcd8cf',
  shirtShade: '#b2ada2',
  pants: '#2f3a4a',
  pantsShade: '#222b37',
  shoe: '#1b1611',
};
