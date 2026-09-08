import { DEFAULT_SKIN, GUEST_SKINS, guestPalette, HOST_SKIN, OBJECT_PALETTE } from './palette';
import { validate, type PixelGrid, type PixelPalette } from './pixel';
import {
  asphalt,
  bathTile,
  carpet,
  concrete,
  doorway,
  grass,
  kitchenTile,
  TERRAIN_PALETTE,
  TERRAIN_SIZE,
  wall as wallTile,
  woodFloor,
} from './terrain';
import { PROPS, type PropId } from './sprites/catalog';
import { EMOTES, EMOTE_SIZE, type EmoteId } from './sprites/emotes';
import { FOOD, type FoodId } from './sprites/food';
import { FURNITURE } from './sprites/furniture';
import { GUEST_POSES } from './sprites/people';
import type { Guest, MutationStage, TileKind } from '../types/game';

export type { FoodId, PropId, PropId as FurnitureId, EmoteId };
export { FOOD, FURNITURE, PROPS, EMOTES, GUEST_POSES };

/** Everything the renderer needs to draw one sprite. */
export interface Art {
  cacheKey: string;
  grid: PixelGrid;
  palette: PixelPalette;
}

/**
 * A guest's art is their stage's pose plus their personal palette. The cache
 * key folds in the stage because the palette shifts as they rot — without it,
 * a mutating guest would keep rendering with their stage-0 colours.
 */
export function guestArt(guest: Guest): Art {
  const skin = GUEST_SKINS[guest.id] ?? DEFAULT_SKIN;
  return {
    cacheKey: `guest:${guest.id}:${guest.mutationStage}`,
    grid: GUEST_POSES[guest.mutationStage],
    palette: guestPalette(skin, guest.mutationStage),
  };
}

/** Art for a bare pose, used by the gallery to show stages side by side. */
export function poseArt(guestId: string, stage: MutationStage): Art {
  const skin = GUEST_SKINS[guestId] ?? DEFAULT_SKIN;
  return {
    cacheKey: `guest:${guestId}:${stage}`,
    grid: GUEST_POSES[stage],
    palette: guestPalette(skin, stage),
  };
}

export function furnitureArt(id: PropId): Art {
  return { cacheKey: `prop:${id}`, grid: PROPS[id], palette: OBJECT_PALETTE };
}

/** A mood bubble. Small, so it reads even at one tile. */
export function emoteArt(id: EmoteId): Art {
  return { cacheKey: `emote:${id}`, grid: EMOTES[id], palette: OBJECT_PALETTE };
}

/** How many interchangeable looks each material has. */
const TERRAIN_VARIANTS = 3;

const TERRAIN_BUILDERS: Record<TileKind, (variant: number) => PixelGrid> = {
  yard: grass,
  path: concrete,
  street: asphalt,
  wall: wallTile,
  door: doorway,
  living: woodFloor,
  entry: woodFloor,
  hall: woodFloor,
  den: woodFloor,
  kitchen: kitchenTile,
  bedroom: carpet,
  bathroom: bathTile,
  garage: concrete,
};

/** Built once per (kind, variant) and reused for every tile that needs it. */
const terrainCache = new Map<string, PixelGrid>();

/**
 * Terrain art for one tile. The variant is derived from the tile's own
 * coordinates, so a given square always looks the same but its neighbours
 * differ — that scatter is what keeps a large room from reading as a single
 * repeated stamp.
 */
export function terrainArt(kind: TileKind, x: number, y: number): Art {
  const variant = Math.abs(Math.imul(x, 73) + Math.imul(y, 151)) % TERRAIN_VARIANTS;
  const key = `terrain:${kind}:${variant}`;

  let grid = terrainCache.get(key);
  if (grid === undefined) {
    grid = TERRAIN_BUILDERS[kind](variant);
    terrainCache.set(key, grid);
  }

  return { cacheKey: key, grid, palette: TERRAIN_PALETTE };
}

export function foodArt(id: FoodId): Art {
  return { cacheKey: `food:${id}`, grid: FOOD[id], palette: OBJECT_PALETTE };
}

/**
 * Checks every sprite in the game and returns the problems found. Called once
 * on boot in dev so a mis-typed row surfaces in the console immediately rather
 * than as a subtly skewed image nobody notices for a week.
 */
export function auditAllSprites(): string[] {
  const problems: string[] = [];

  for (const [stage, grid] of Object.entries(GUEST_POSES)) {
    problems.push(...validate(`pose:${stage}`, grid, guestPalette(DEFAULT_SKIN, 0)));
  }
  for (const [id, grid] of Object.entries(PROPS)) {
    problems.push(...validate(`prop:${id}`, grid, OBJECT_PALETTE));
  }
  for (const [id, grid] of Object.entries(EMOTES)) {
    problems.push(...validate(`emote:${id}`, grid, OBJECT_PALETTE, EMOTE_SIZE));
  }
  for (const [id, grid] of Object.entries(FOOD)) {
    problems.push(...validate(`food:${id}`, grid, OBJECT_PALETTE));
  }
  for (const kind of Object.keys(TERRAIN_BUILDERS) as TileKind[]) {
    for (let variant = 0; variant < TERRAIN_VARIANTS; variant += 1) {
      const built = TERRAIN_BUILDERS[kind](variant);
      problems.push(...validate(`terrain:${kind}:${variant}`, built, TERRAIN_PALETTE, TERRAIN_SIZE));
    }
  }

  return problems;
}

/** The host avatar. Always drawn upright — you have not started turning. */
export function hostArt(): Art {
  return {
    cacheKey: 'host',
    grid: GUEST_POSES[0],
    palette: guestPalette(HOST_SKIN, 0),
  };
}
