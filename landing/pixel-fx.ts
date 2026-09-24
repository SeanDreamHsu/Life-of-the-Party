import type { PixelGrid, PixelPalette } from '../src/art/pixel';
import { GLYPH_HEIGHT, spell, spelledWidth } from './pixel-font';

/**
 * PIXEL EFFECTS
 *
 * The cursor, the confetti, the big pixel word and the screen wipe all keep
 * the page's one rule: every pixel is authored as text in this repository and
 * painted at runtime. No image files, and nothing the game's own sprite
 * pipeline could not also have drawn.
 *
 * All of it is decoration. The overlays never take a click (the wipe aside,
 * for the half-second it exists), the pixel word is an ordinary button, and
 * every moving part stands down when the reader has asked for less motion.
 */

/** The party lights, plus the house's own bone and brass. */
const CONFETTI = ['#ff4fa3', '#3fe0d0', '#ffd35a', '#ece0c8', '#c8a24a'] as const;
const LIGHTS = ['#ff4fa3', '#3fe0d0', '#ffd35a'] as const;
const BONE = '#ece0c8';
const SHELL = '#0d0a09';

function anyOf<T>(items: readonly T[], fallback: T): T {
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

/* ================================================================ CURSORS */

const INK: PixelPalette = {
  o: '#17110e', // outline: the HUD's darkest wood, so it holds on a light page too
  w: BONE,
  p: '#ff4fa3',
};

/** The classic desktop arrow's proportions, twelve by twenty. */
const ARROW: PixelGrid = [
  'o...........',
  'oo..........',
  'owo.........',
  'owwo........',
  'owwwo.......',
  'owwwwo......',
  'owwwwwo.....',
  'owwwwwwo....',
  'owwwwwwwo...',
  'owwwwwwwwo..',
  'owwwwwwwwwo.',
  'owwwwwwooooo',
  'owwwowwo....',
  'owwo.owwo...',
  'owo..owwo...',
  'oo....owwo..',
  'o.....owwo..',
  '.......owwo.',
  '.......owwo.',
  '........oo..',
];

const HAND: PixelGrid = [
  '.....oo..........',
  '....owwo.........',
  '....owwo.........',
  '....owwo.........',
  '....owwooo.......',
  '....owwowwooo....',
  '....owwowwowwoo..',
  'ooo.owwowwowwowo.',
  'owwoowwwwwwwwowwo',
  'owwwowwwwwwwwwwwo',
  '.owwwwwwwwwwwwwwo',
  '..owwwwwwwwwwwwwo',
  '..owwwwwwwwwwwwo.',
  '...owwwwwwwwwwwo.',
  '....owwwwwwwwwo..',
  '.....owwwwwwwwo..',
  '.....oooooooooo..',
];

/** The dance floor's own cursor: party pink, because clicking there is a beat. */
const CROSS: PixelGrid = [
  '......ooo......',
  '......opo......',
  '......opo......',
  '......opo......',
  '......ooo......',
  '...............',
  'ooooo.ooo.ooooo',
  'opppo.opo.opppo',
  'ooooo.ooo.ooooo',
  '...............',
  '......ooo......',
  '......opo......',
  '......opo......',
  '......opo......',
  '......ooo......',
];

/**
 * Cursor images are shown one image pixel to one CSS pixel, so the sprite is
 * painted at double size here. `rasterise` paints at native size, which is
 * right for backgrounds that CSS scales and far too small for a cursor.
 */
function cursorImage(grid: PixelGrid, scale: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(...grid.map((row) => row.length)) * scale;
  canvas.height = grid.length * scale;
  const pen = canvas.getContext('2d');
  if (!pen) return '';
  grid.forEach((row, y) => {
    [...row].forEach((ink, x) => {
      const colour = INK[ink];
      if (colour === undefined) return;
      pen.fillStyle = colour;
      pen.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return canvas.toDataURL();
}

/** Hands the cursors to CSS as custom properties. A touch screen has no cursor to replace. */
export function pixelCursors(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const scale = 2;
  const define = (name: string, grid: PixelGrid, hotX: number, hotY: number, fallback: string) => {
    const image = cursorImage(grid, scale);
    if (!image) return;
    document.documentElement.style.setProperty(
      name,
      `url("${image}") ${hotX * scale} ${hotY * scale}, ${fallback}`,
    );
  };
  define('--cursor-arrow', ARROW, 0, 0, 'auto');
  define('--cursor-hand', HAND, 5, 0, 'pointer');
  define('--cursor-cross', CROSS, 7, 7, 'crosshair');
}

/* =============================================================== CONFETTI */

/** One confetti pixel, in CSS pixels. Big enough to read as a pixel, not a speck. */
const BIT = 4;
/** A hard cap, so a restless mouse can never turn into a slow page. */
const MAX_BITS = 480;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** The life it started with, so it knows how far through fading it is. */
  span: number;
  size: number;
  colour: string;
  /** Some pieces blink as they fall, which is what makes it read as a sparkle. */
  blink: boolean;
}

/**
 * A mouse trail and a pop on every click, drawn on one fixed canvas at a
 * quarter of the screen's resolution. Scaling that up with `pixelated` is
 * what makes every piece a crisp square, and it is also why a few hundred of
 * them cost almost nothing to draw.
 */
export function confetti(calm: boolean): void {
  if (calm) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) return;
  const pen: CanvasRenderingContext2D = context;

  const bits: Bit[] = [];
  let running = false;
  let last = 0;
  let frame = 0;

  function fit(): void {
    canvas.width = Math.ceil(window.innerWidth / BIT);
    canvas.height = Math.ceil(window.innerHeight / BIT);
  }
  fit();
  window.addEventListener('resize', fit);

  function tick(now: number): void {
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;
    frame += 1;
    pen.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = bits.length - 1; i >= 0; i -= 1) {
      const bit = bits[i];
      if (!bit) continue;
      bit.life -= dt;
      if (bit.life <= 0) {
        bits.splice(i, 1);
        continue;
      }
      const drag = Math.pow(0.96, dt);
      bit.vx *= drag;
      bit.vy = bit.vy * drag + 0.045 * dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      if (bit.blink && (frame >> 2) % 2 === 0) continue;
      // Four hard steps of fade rather than a smooth one: a pixel has no
      // half-lit state, and a smooth fade is what gives a particle effect away
      // as modern.
      pen.globalAlpha = Math.ceil((bit.life / bit.span) * 4) / 4;
      pen.fillStyle = bit.colour;
      pen.fillRect(Math.round(bit.x), Math.round(bit.y), bit.size, bit.size);
    }
    pen.globalAlpha = 1;
    if (bits.length > 0) requestAnimationFrame(tick);
    else running = false;
  }

  function add(bit: Bit): void {
    if (bits.length >= MAX_BITS) bits.shift();
    bits.push(bit);
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  let lastX = -1;
  let lastY = -1;
  window.addEventListener(
    'pointermove',
    (event) => {
      // A finger dragging a page is scrolling, not asking for sparkles.
      if (event.pointerType !== 'mouse') return;
      const x = event.clientX / BIT;
      const y = event.clientY / BIT;
      // Spaced by distance, not by event: a fast flick and a slow drift leave
      // the same density of trail.
      if (lastX >= 0 && Math.hypot(x - lastX, y - lastY) < 2.5) return;
      lastX = x;
      lastY = y;
      const life = 26 + Math.random() * 22;
      add({
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.3,
        life,
        span: life,
        size: 1,
        colour: anyOf(CONFETTI, BONE),
        blink: Math.random() < 0.3,
      });
    },
    { passive: true },
  );

  window.addEventListener('click', (event) => {
    // A keyboard "click" has no position, and a pop in the corner of the
    // screen would read as a glitch.
    if (event.detail === 0) return;
    const x = event.clientX / BIT;
    const y = event.clientY / BIT;
    for (let i = 0; i < 26; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.9 + Math.random() * 2.1;
      const life = 40 + Math.random() * 40;
      add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.9,
        life,
        span: life,
        size: Math.random() < 0.35 ? 2 : 1,
        colour: anyOf(CONFETTI, BONE),
        blink: Math.random() < 0.25,
      });
    }
  });
}

/* ============================================================= PIXEL WORD */

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where this pixel belongs in the word it is currently spelling. */
  hx: number;
  hy: number;
  /** Surplus after the word changed to a shorter one: flies off and fades. */
  leaving: boolean;
  alpha: number;
}

export interface ClockStop {
  word: string;
  /** The hour it shows, or null when it is saying something else. */
  hour: number | null;
}

/** Wide enough for the longest thing the clock ever says, so it never resizes mid-party. */
const WIDEST = 'GO HOME?';
const FIRST_HOUR = 52;

/**
 * What the clock says next. It counts up, somebody eventually suggests going
 * home, and nobody does. After hour ninety-nine it starts again, because the
 * party is still going.
 */
function partyClock(): () => ClockStop {
  let hour = FIRST_HOUR;
  const queued: ClockStop[] = [];
  return () => {
    const next = queued.shift();
    if (next) return next;
    hour = hour >= 99 ? FIRST_HOUR : hour + 1;
    const stop = { word: `HOUR ${hour}`, hour };
    if (hour === 60) {
      queued.push({ word: 'NOPE.', hour: null }, stop);
      return { word: 'GO HOME?', hour: null };
    }
    return stop;
  };
}

/**
 * The hour, in pixels you can push around.
 *
 * Every lit pixel of the word is its own spring: the mouse shoves them out of
 * the way and they settle back where they belong. A click blows the word
 * apart and the same pixels reassemble as the next hour, so the change reads
 * as the clock moving on rather than as a new picture.
 */
export function pixelWord(
  button: HTMLButtonElement,
  canvas: HTMLCanvasElement,
  calm: boolean,
  onChange: (stop: ClockStop) => void,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const pen: CanvasRenderingContext2D = context;

  const dots: Dot[] = [];
  const next = partyClock();
  let word = `HOUR ${FIRST_HOUR}`;
  let cell = 8;
  let width = 0;
  let height = 0;
  let top = 0;
  let pointer: { x: number; y: number } | null = null;
  let visible = false;
  let running = false;
  let last = 0;
  let clock = 0;
  /** 1 straight after a click, easing to 0: the springs go slack so the blast can be seen. */
  let stun = 0;

  function layout(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = button.clientWidth;
    cell = Math.max(3, Math.floor(width / (spelledWidth(WIDEST) + 2)));
    // Three cells of air above and below, so a pushed pixel has room to go.
    height = cell * (GLYPH_HEIGHT + 6);
    top = cell * 3;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    pen.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function homes(text: string): { x: number; y: number }[] {
    const left = Math.round((width - spelledWidth(text) * cell) / 2);
    return spell(text).map((p) => ({ x: left + p.x * cell, y: top + p.y * cell }));
  }

  /** Points the pixels at a word. `explode` flings them first; otherwise they just appear. */
  function spellOut(text: string, explode: boolean): void {
    const targets = homes(text);
    const midX = width / 2;
    const midY = top + (GLYPH_HEIGHT * cell) / 2;
    const fling = (dot: Dot) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = cell * (1.2 + Math.random() * 2.2);
      dot.vx += Math.cos(angle) * speed;
      dot.vy += Math.sin(angle) * speed;
    };
    targets.forEach((target, i) => {
      let dot = dots[i];
      if (!dot) {
        dot = { x: midX, y: midY, vx: 0, vy: 0, hx: 0, hy: 0, leaving: false, alpha: 1 };
        dots.push(dot);
      }
      dot.hx = target.x;
      dot.hy = target.y;
      dot.leaving = false;
      dot.alpha = 1;
      if (explode) fling(dot);
      else Object.assign(dot, { x: target.x, y: target.y, vx: 0, vy: 0 });
    });
    if (!explode) {
      dots.splice(targets.length);
      return;
    }
    stun = 1;
    for (let i = targets.length; i < dots.length; i += 1) {
      const dot = dots[i];
      if (!dot) continue;
      dot.leaving = true;
      fling(dot);
    }
  }

  function draw(): void {
    pen.clearRect(0, 0, width, height);
    const size = Math.max(2, cell - Math.max(1, Math.round(cell / 6)));
    const drop = Math.max(1, Math.round(cell / 5));
    // A slanted band of party light that sweeps across the word now and then.
    const sweep = calm ? -Infinity : ((clock * cell * 0.35) % (width * 2.5)) - width * 0.25;
    const band = LIGHTS[Math.floor((clock * cell * 0.35) / (width * 2.5)) % LIGHTS.length] ?? BONE;
    for (const dot of dots) {
      const x = Math.round(dot.x);
      const y = Math.round(dot.y);
      const displaced = Math.abs(dot.x - dot.hx) + Math.abs(dot.y - dot.hy);
      let colour = BONE;
      if (displaced > cell * 0.6) {
        // Knocked loose: it catches the light on its way back.
        colour = LIGHTS[Math.abs(Math.round(dot.hx / cell) + Math.round(dot.hy / cell)) % LIGHTS.length] ?? BONE;
      } else if (Math.abs(dot.hx + (dot.hy - top) * 0.6 - sweep) < cell * 2.5) {
        colour = band;
      }
      pen.globalAlpha = dot.alpha;
      pen.fillStyle = 'rgba(0, 0, 0, 0.55)';
      pen.fillRect(x + drop, y + drop, size, size);
      pen.fillStyle = colour;
      pen.fillRect(x, y, size, size);
    }
    pen.globalAlpha = 1;
  }

  function tick(now: number): void {
    const dt = Math.min(2.5, (now - last) / 16.67);
    last = now;
    clock += dt;
    const reach = cell * 4;
    stun = Math.max(0, stun - 0.025 * dt);
    const spring = 0.06 * (1 - stun * 0.85);
    for (let i = dots.length - 1; i >= 0; i -= 1) {
      const dot = dots[i];
      if (!dot) continue;
      if (dot.leaving) {
        dot.alpha -= 0.035 * dt;
        if (dot.alpha <= 0) {
          dots.splice(i, 1);
          continue;
        }
      } else {
        dot.vx += (dot.hx - dot.x) * spring * dt;
        dot.vy += (dot.hy - dot.y) * spring * dt;
      }
      if (pointer) {
        const dx = dot.x + cell / 2 - pointer.x;
        const dy = dot.y + cell / 2 - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < reach && distance > 0.01) {
          const push = (1 - distance / reach) * cell * 0.6 * dt;
          dot.vx += (dx / distance) * push;
          dot.vy += (dy / distance) * push;
        }
      }
      const drag = Math.pow(0.84, dt);
      dot.vx *= drag;
      dot.vy *= drag;
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
    }
    draw();
    // Only while it can be seen: an animation nobody is looking at is just a
    // warm laptop.
    if (visible && document.visibilityState === 'visible') requestAnimationFrame(tick);
    else running = false;
  }

  function wake(): void {
    if (calm || running || !visible) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  layout();
  spellOut(word, false);
  draw();

  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    wake();
  }).observe(button);
  document.addEventListener('visibilitychange', wake);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      spellOut(word, false);
      draw();
    }, 150);
  });

  button.addEventListener('pointermove', (event) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    wake();
  });
  button.addEventListener('pointerleave', () => {
    pointer = null;
  });
  button.addEventListener('click', () => {
    const stop = next();
    word = stop.word;
    spellOut(word, !calm);
    if (calm) draw();
    onChange(stop);
  });
}

/* ================================================================= DECODE */

/** What a line looks like before it has finished arriving. */
const NOISE = [...'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?'];
const decoding = new WeakMap<HTMLElement, number>();

/**
 * Types `text` into `node` the way an old display would: noise first,
 * resolving left to right. Screen readers get the finished line from the
 * start, in a hidden span, so they never read out the noise.
 */
export function decode(node: HTMLElement, text: string, calm: boolean): void {
  const run = (decoding.get(node) ?? 0) + 1;
  decoding.set(node, run);
  if (calm || text.length === 0) {
    node.textContent = text;
    return;
  }

  const said = document.createElement('span');
  said.className = 'sr-only';
  said.textContent = text;
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  node.replaceChildren(said, shown);

  const started = performance.now();
  const duration = Math.min(1100, 380 + text.length * 22);
  let frame = 0;
  const step = (now: number) => {
    // A newer line has started on this node; let it have it.
    if (decoding.get(node) !== run) return;
    const progress = (now - started) / duration;
    if (progress >= 1) {
      node.textContent = text;
      return;
    }
    frame += 1;
    // Every other frame: a display this old does not refresh at sixty.
    if (frame % 2 === 0) {
      const settled = Math.floor(progress * text.length);
      shown.textContent = [...text]
        .map((ch, i) => (i < settled || ch === ' ' || ch === '·' ? ch : anyOf(NOISE, ch)))
        .join('');
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* =================================================================== WIPE */

/** One block of the wipe, in CSS pixels. */
const BLOCK = 24;

/**
 * The way into the game: the page dissolves into blocks before the link is
 * followed, the way a console fades out to load. Modified clicks (a new tab,
 * a new window) are left alone, because the page is not going anywhere then.
 */
export function pixelWipe(calm: boolean): void {
  if (calm) return;

  // Coming back with the browser's back button can restore this page from
  // memory with the wipe still drawn over it.
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('.wipe').forEach((node) => node.remove());
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href="./play/"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const href = link.href;
      wipe(() => window.location.assign(href));
    });
  });
}

function wipe(done: () => void): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'wipe';
  canvas.setAttribute('aria-hidden', 'true');
  const cols = Math.ceil(window.innerWidth / BLOCK);
  const rows = Math.ceil(window.innerHeight / BLOCK);
  // One canvas pixel per block, scaled up by CSS: the blocks are the pixels.
  canvas.width = cols;
  canvas.height = rows;
  document.body.append(canvas);
  const pen = canvas.getContext('2d');
  if (!pen) {
    done();
    return;
  }

  const order = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
  }

  const duration = 420;
  const started = performance.now();
  let placed = 0;
  let fresh: number[] = [];
  const paint = (index: number, colour: string) => {
    pen.fillStyle = colour;
    pen.fillRect(index % cols, Math.floor(index / cols), 1, 1);
  };
  const step = (now: number) => {
    // Last frame's new blocks flash in party light, then go dark: the
    // dissolve sparkles instead of just spreading.
    fresh.forEach((index) => paint(index, SHELL));
    const target = Math.min(order.length, Math.ceil(((now - started) / duration) * order.length));
    fresh = order.slice(placed, target);
    fresh.forEach((index) => paint(index, anyOf(LIGHTS, SHELL)));
    placed = target;
    if (placed < order.length) {
      requestAnimationFrame(step);
      return;
    }
    fresh.forEach((index) => paint(index, SHELL));
    done();
    // If the navigation never happens (blocked, offline), give the page back.
    window.setTimeout(() => canvas.remove(), 5000);
  };
  requestAnimationFrame(step);
}
