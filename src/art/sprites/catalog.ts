import { DECORATIONS } from './decorations';
import { FURNITURE } from './furniture';
import { ROOM_PIECES } from './roomPieces';
import { RUGS } from './rugs';

/**
 * Every prop that can be placed in the house, in one lookup.
 *
 * This module deliberately imports nothing from the game types, so the game
 * types can import the id union from here without a cycle.
 */
export const PROPS = {
  ...FURNITURE,
  ...DECORATIONS,
  ...RUGS,
  ...ROOM_PIECES,
} as const;

export type PropId = keyof typeof PROPS;

/** Historic name; the catalogue is no longer only furniture. */
export type FurnitureId = PropId;
