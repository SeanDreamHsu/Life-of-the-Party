/**
 * The drawing kit every redesigned sprite is built with.
 *
 * A sprite is painted as (material, shade level) cells rather than raw colours.
 * That is what lets one outline pass, one light direction and one set of
 * hue-shifted ramps apply to the whole game: a couch and a guest's jacket are
 * shaded by the same rules, so they sit in the same world.
 *
 * Rules held throughout the set:
 *   - Light comes from the upper left.
 *   - Every material is a five-step ramp. Shadows drift toward violet,
 *     highlights toward yellow, so nothing is shaded by simply adding black.
 *   - Outlines take the colour of what they enclose. Nothing is ringed in
 *     pure black.
 */

export type RGB = readonly [number, number, number];

export interface Ramp {
  id: number;
  /** 0 is the deepest shadow, 2 the local colour, 4 the highlight. */
  cols: RGB[];
  /** The outline drawn round this material. */
  out: RGB;
}

const RAMPS: Ramp[] = [];

function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
/** Moves a hue part of the way toward a target, the short way round the wheel. */
function hueToward(h: number, target: number, t: number): number {
  let d = ((target - h + 540) % 360) - 180;
  return h + d * t;
}
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

const SHADOW_HUE = 262, LIGHT_HUE = 46;
const PLUM: RGB = [38, 26, 44];

/**
 * Builds a five-step ramp round one local colour.
 * `contrast` widens or narrows the value steps; shiny things want more.
 */
export function ramp(base: string | RGB, contrast = 1): Ramp {
  const rgb = typeof base === 'string' ? hexToRgb(base) : base;
  const [h, s, l] = rgbToHsl(rgb);
  const steps = [-0.21, -0.11, 0, 0.09, 0.18];
  const cols = steps.map((d, i) => {
    const k = i - 2;
    const hue = k < 0 ? hueToward(h, SHADOW_HUE, 0.11 * -k) : hueToward(h, LIGHT_HUE, 0.1 * k);
    const sat = Math.max(0, Math.min(1, s * (k < 0 ? 1 + 0.1 * -k : 1 - 0.14 * k)));
    const lig = Math.max(0.03, Math.min(0.97, l + d * contrast));
    return s < 0.04 ? hslToRgb(k < 0 ? SHADOW_HUE : LIGHT_HUE, 0.06 * Math.abs(k), lig) : hslToRgb(hue, sat, lig);
  });
  const r: Ramp = { id: RAMPS.length, cols, out: mixRgb(mixRgb(cols[0]!, [0, 0, 0], 0.5), PLUM, 0.55) };
  RAMPS.push(r);
  return r;
}
/** A ramp with one colour at every level, for eyes, flames and other absolutes. */
export function flat(base: string): Ramp {
  const c = hexToRgb(base);
  const r: Ramp = { id: RAMPS.length, cols: [c, c, c, c, c], out: mixRgb(mixRgb(c, [0, 0, 0], 0.55), PLUM, 0.3) };
  RAMPS.push(r);
  return r;
}

export type Ink = readonly [Ramp, number] | readonly [Ramp, number, 1];
export type Key = Record<string, Ink | undefined>;

const OUTLINE = 9;

export class Pix {
  readonly w: number; readonly h: number;
  private mat: Int16Array; private lv: Uint8Array; private em: Uint8Array;

  constructor(w = 32, h = 32) {
    this.w = w; this.h = h;
    this.mat = new Int16Array(w * h).fill(-1);
    this.lv = new Uint8Array(w * h);
    this.em = new Uint8Array(w * h);
  }

  has(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.mat[y * this.w + x]! >= 0; }

  px(x: number, y: number, r: Ramp, l = 2, glow = 0): this {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const i = y * this.w + x;
    this.mat[i] = r.id; this.lv[i] = Math.max(0, Math.min(4, Math.round(l))); this.em[i] = glow;
    return this;
  }
  clear(x: number, y: number): this {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.mat[y * this.w + x] = -1; this.em[y * this.w + x] = 0;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, r: Ramp, l = 2, glow = 0): this {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.px(x + i, y + j, r, l, glow);
    return this;
  }
  /** Re-shades whatever is already there, leaving empty cells empty. */
  tone(x: number, y: number, w: number, h: number, delta: number): this {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) {
      const X = x + i, Y = y + j;
      if (!this.has(X, Y)) continue;
      const k = Y * this.w + X;
      if (this.lv[k] === OUTLINE) continue;
      this.lv[k] = Math.max(0, Math.min(4, this.lv[k]! + delta));
    }
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, r: Ramp, l = 2, glow = 0): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
      if (dx * dx + dy * dy <= 1) this.px(x, y, r, l, glow);
    }
    return this;
  }
  /** A lit volume: local colour, a highlight up and left, a core shadow down and right. */
  ball(cx: number, cy: number, rx: number, ry: number, r: Ramp, base = 2): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
      if (dx * dx + dy * dy > 1) continue;
      const lit = -(dx * 0.62 + dy * 0.78);
      this.px(x, y, r, base + (lit > 0.5 ? 1 : lit < -0.45 ? -1 : 0));
    }
    return this;
  }
  /** A flat panel with a bevel: lighter along the top and left, darker along the bottom and right. */
  panel(x: number, y: number, w: number, h: number, r: Ramp, l = 2): this {
    this.rect(x, y, w, h, r, l);
    if (h > 2) { this.rect(x, y, w, 1, r, l + 1); this.rect(x, y + h - 1, w, 1, r, l - 1); }
    if (w > 2) this.rect(x + w - 1, y + 1, 1, h - 1, r, l - 1);
    return this;
  }
  /**
   * A box seen from the three-quarter view: its top face, then its front face
   * below. Almost every piece of furniture starts as one or two of these.
   */
  box(x: number, y: number, w: number, top: number, front: number, r: Ramp, frontRamp: Ramp = r): this {
    this.rect(x, y, w, top, r, 3);
    this.rect(x, y, w, 1, r, 4);
    this.rect(x + w - 1, y + 1, 1, top - 1, r, 2);
    this.rect(x, y + top, w, front, frontRamp, 2);
    this.rect(x, y + top, w, 1, frontRamp, 1);
    this.rect(x + w - 1, y + top, 1, front, frontRamp, 1);
    this.rect(x, y + top + front - 1, w, 1, frontRamp, 0);
    return this;
  }
  /** Stamps hand-placed pixels. Each character maps to a material and level; '.' is skipped. */
  art(x: number, y: number, rows: readonly string[], key: Key, flip = false): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i += 1) {
        const ink = key[row[flip ? row.length - 1 - i : i]!];
        if (ink) this.px(x + i, y + j, ink[0], ink[1], ink[2] ?? 0);
      }
    });
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, r: Ramp, l = 2, glow = 0): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 1) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, l, glow);
    return this;
  }
  blit(src: Pix, dx = 0, dy = 0, flip = false): this {
    for (let y = 0; y < src.h; y += 1) for (let x = 0; x < src.w; x += 1) {
      const i = y * src.w + x;
      if (src.mat[i]! < 0) continue;
      const X = dx + (flip ? src.w - 1 - x : x), Y = dy + y;
      if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      const k = Y * this.w + X;
      this.mat[k] = src.mat[i]!; this.lv[k] = src.lv[i]!; this.em[k] = src.em[i]!;
    }
    return this;
  }
  /**
   * Rings the silhouette. Each outline pixel takes its colour from the material
   * it touches, and edges facing the light get the gentler of two tones, so the
   * sprite is held together without a black wire round it.
   */
  outline(): this {
    const add: [number, number, number, number][] = [];
    for (let y = 0; y < this.h; y += 1) for (let x = 0; x < this.w; x += 1) {
      if (this.has(x, y)) continue;
      // Prefer the neighbour below or to the right: that makes this an upper-left, lit edge.
      const below = this.has(x, y + 1), right = this.has(x + 1, y), above = this.has(x, y - 1), left = this.has(x - 1, y);
      if (!below && !right && !above && !left) continue;
      const [nx, ny] = below ? [x, y + 1] : right ? [x + 1, y] : above ? [x, y - 1] : [x - 1, y];
      const k = ny * this.w + nx;
      if (this.lv[k] === OUTLINE || this.lv[k] === OUTLINE + 1) continue;
      const lit = (below || right) && !above && !left;
      add.push([x, y, this.mat[k]!, lit ? OUTLINE + 1 : OUTLINE]);
    }
    for (const [x, y, m, l] of add) { const i = y * this.w + x; this.mat[i] = m; this.lv[i] = l; this.em[i] = 0; }
    return this;
  }

  private colour(i: number): RGB {
    const r = RAMPS[this.mat[i]!]!;
    const l = this.lv[i]!;
    if (l === OUTLINE) return r.out;
    if (l === OUTLINE + 1) return mixRgb(r.out, r.cols[0]!, 0.22);
    return r.cols[l]!;
  }

  /** The sprite itself, plus a second image holding only the parts that give off light. */
  toCanvas(): { base: HTMLCanvasElement; glow: HTMLCanvasElement | null } {
    const base = document.createElement('canvas');
    base.width = this.w; base.height = this.h;
    const ctx = base.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    let any = false;
    const gimg = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.mat.length; i += 1) {
      if (this.mat[i]! < 0) continue;
      const c = this.colour(i);
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
      if (this.em[i]) { any = true; gimg.data[i * 4] = c[0]; gimg.data[i * 4 + 1] = c[1]; gimg.data[i * 4 + 2] = c[2]; gimg.data[i * 4 + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
    let glow: HTMLCanvasElement | null = null;
    if (any) { glow = document.createElement('canvas'); glow.width = this.w; glow.height = this.h; glow.getContext('2d')!.putImageData(gimg, 0, 0); }
    return { base, glow };
  }

  /** The same sprite as text rows and a palette, in the format src/art already uses. */
  toGrid(): { grid: string[]; palette: Record<string, string> } {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+,-/:;<=>?@^_~';
    const seen = new Map<string, string>();
    const palette: Record<string, string> = {};
    const grid: string[] = [];
    for (let y = 0; y < this.h; y += 1) {
      let row = '';
      for (let x = 0; x < this.w; x += 1) {
        const i = y * this.w + x;
        if (this.mat[i]! < 0) { row += '.'; continue; }
        const c = this.colour(i);
        const hex = `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        let ch = seen.get(hex);
        if (!ch) { ch = chars[seen.size] ?? '?'; seen.set(hex, ch); palette[ch] = hex; }
        row += ch;
      }
      grid.push(row);
    }
    return { grid, palette };
  }
}

export interface Sprite { base: HTMLCanvasElement; glow: HTMLCanvasElement | null; w: number; h: number }
const cache = new Map<string, Sprite>();
/** Builds a sprite once and remembers it. */
export function bake(key: string, draw: () => Pix): Sprite {
  let s = cache.get(key);
  if (!s) { const p = draw(); const c = p.toCanvas(); s = { ...c, w: p.w, h: p.h }; cache.set(key, s); }
  return s;
}
