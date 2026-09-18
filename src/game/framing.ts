import { TERRAIN_SIZE } from '../art/terrain';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Focus } from './camera';

export const NATIVE_WIDTH = GRID_WIDTH * TERRAIN_SIZE;
export const NATIVE_HEIGHT = GRID_HEIGHT * TERRAIN_SIZE;

export interface BoardView {
  /** Whole-number magnification, or reciprocal downsampling for the overview. */
  scale: number;
  width: number;
  height: number;
  left: number;
  top: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Fit inside the actual play surface, excluding the instrument panel and rail. */
export function frameBoard(focus: Focus, vw: number, vh: number): BoardView {
  const fit = Math.min(vw / (Math.max(1, focus.w) * TERRAIN_SIZE), vh / (Math.max(1, focus.h) * TERRAIN_SIZE));
  // Below native scale the overview still must show every exit. Reciprocal
  // scales downsample consistently; close-ups always use whole source pixels.
  const scale = fit >= 1 ? Math.floor(fit) : 1 / Math.ceil(1 / Math.max(.01, fit));
  const width = NATIVE_WIDTH * scale;
  const height = NATIVE_HEIGHT * scale;
  const centreX = (focus.x + focus.w / 2) * TERRAIN_SIZE * scale;
  const centreY = (focus.y + focus.h / 2) * TERRAIN_SIZE * scale;
  const left = width >= vw ? Math.min(0, Math.max(vw - width, Math.round(vw / 2 - centreX))) : Math.round((vw - width) / 2);
  const top = height >= vh ? Math.min(0, Math.max(vh - height, Math.round(vh / 2 - centreY))) : Math.round((vh - height) / 2);
  return { scale, width, height, left, top, viewportWidth: vw, viewportHeight: vh };
}
