import { paintInto } from '../../../src/art/pixel';

export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const c = h.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
export function shade(c: RGB, f: number): RGB {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
}
export function css(c: RGB, a = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
/** Deterministic 0..1 hash of two integers. */
export function h2(x: number, y: number, s = 0): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
  return (h >>> 0) / 4294967296;
}

const cache = new Map<string, HTMLCanvasElement>();
export function sprite(art: { cacheKey: string; grid: readonly string[]; palette: Record<string, string> }): HTMLCanvasElement {
  const hit = cache.get(art.cacheKey);
  if (hit) return hit;
  const w = art.grid[0]?.length ?? 1;
  const h = art.grid.length || 1;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  paintInto(img, art.grid, art.palette, 0, 0);
  ctx.putImageData(img, 0, 0);
  cache.set(art.cacheKey, cv);
  return cv;
}

/** A tiny authored icon: rows of characters mapped through a palette. */
export function icon(key: string, rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  return sprite({ cacheKey: `icon:${key}`, grid: rows, palette: pal });
}
