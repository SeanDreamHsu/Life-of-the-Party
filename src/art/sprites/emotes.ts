import type { PixelGrid } from '../pixel';

/**
 * EMOTES — 16x16 thought bubbles that float above a guest's head.
 *
 * The hidden lure is the whole deduction loop, so these must never say outright
 * what a guest wants. They say how the guest FEELS: content, annoyed, alarmed,
 * bored. The player infers the lure from behaviour plus mood, which is the
 * game; an emote that read "wants bass" would end it.
 *
 * Drawn against OBJECT_PALETTE.
 */

const NOTE: PixelGrid = [
  '................',
  '................',
  '.......oooo.....',
  '.......oiio.....',
  '.......oiio.....',
  '.......oiio.....',
  '.......oiio.....',
  '.......oiio.....',
  '.....oooiio.....',
  '....oiiiiio.....',
  '....oiiiiio.....',
  '....oiiiiio.....',
  '.....ooooo......',
  '................',
  '................',
  '................',
];

const FOOD: PixelGrid = [
  '................',
  '................',
  '................',
  '.....oooooo.....',
  '.....obbbbo.....',
  '.....offffo.....',
  '......offfo.....',
  '......offro.....',
  '.......offo.....',
  '.......offo.....',
  '........oo......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const HEART: PixelGrid = [
  '................',
  '................',
  '................',
  '................',
  '...oo...oo......',
  '..orro.orro.....',
  '.orrrroorrrro...',
  '.orrrrrrrrrro...',
  '..orrrrrrrro....',
  '...orrrrrro.....',
  '....orrrro......',
  '.....orro.......',
  '......oo........',
  '................',
  '................',
  '................',
];

const ANGER: PixelGrid = [
  '................',
  '................',
  '................',
  '..oo........oo..',
  '..orro....orro..',
  '...orro..orro...',
  '....orroorro....',
  '.....orrrro.....',
  '....orroorro....',
  '...orro..orro...',
  '..orro....orro..',
  '..oo........oo..',
  '................',
  '................',
  '................',
  '................',
];

const SWEAT: PixelGrid = [
  '................',
  '................',
  '................',
  '.......oo.......',
  '......oKKo......',
  '.....oKKKKo.....',
  '....oKKKKKKo....',
  '....oKKKKKKo....',
  '....oKKKKKKo....',
  '.....oKKKKo.....',
  '......oooo......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const SLEEP: PixelGrid = [
  '................',
  '................',
  '................',
  '................',
  '....oooooo......',
  '.......oo.......',
  '......oo........',
  '.....oo.........',
  '....oooooo......',
  '................',
  '..oooo..........',
  '....oo..........',
  '...oo...........',
  '..oooo..........',
  '................',
  '................',
];

const ALERT: PixelGrid = [
  '................',
  '................',
  '......oooo......',
  '......orro......',
  '......orro......',
  '......orro......',
  '......orro......',
  '......orro......',
  '......oooo......',
  '................',
  '......oooo......',
  '......orro......',
  '......oooo......',
  '................',
  '................',
  '................',
];

const SKULL: PixelGrid = [
  '................',
  '................',
  '................',
  '....oooooooo....',
  '...oiiiiiiiio...',
  '..oiiiiiiiiiio..',
  '..oiikkiikkiio..',
  '..oiikkiikkiio..',
  '..oiiiiiiiiiio..',
  '...oiiikkiiio...',
  '...oiiiiiiiio...',
  '....oioioioo....',
  '....oooooooo....',
  '................',
  '................',
  '................',
];

export const EMOTES = {
  note: NOTE,
  food: FOOD,
  heart: HEART,
  anger: ANGER,
  sweat: SWEAT,
  sleep: SLEEP,
  alert: ALERT,
  skull: SKULL,
} as const;

export type EmoteId = keyof typeof EMOTES;

export const EMOTE_SIZE = 16;
