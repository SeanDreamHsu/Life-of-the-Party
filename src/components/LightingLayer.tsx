import { useEffect, useRef } from 'react';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { moonlight, type LightSource } from '../game/lights';

/** Pixels per tile in the light buffer. Low, because light is soft anyway. */
const LIGHT_SCALE = 12;

/** How dark an unlit room gets. Enough to feel like night, not so dark the art dies. */
const NIGHT = 'rgba(6, 8, 22, 0.78)';

interface LightingLayerProps {
  lights: readonly LightSource[];
  /** Party lights swing harder when the music is on. */
  partyMode: boolean;
}

/**
 * The dark, and the holes punched in it.
 *
 * Drawn on its own canvas over the board: fill the whole lot with night, then
 * erase a soft radial hole per light (destination-out), then add the light's
 * colour back on top (lighter). That two-pass order is what makes a lamp both
 * reveal the floor AND tint it, instead of just painting a coloured circle over
 * darkness.
 *
 * The buffer is 12px per tile and scaled up smoothly — unlike the sprites,
 * light should NOT be nearest-neighbour, and the contrast between soft light
 * and hard pixels is most of the mood.
 */
export default function LightingLayer({ lights, partyMode }: LightingLayerProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ lights, partyMode });
  latest.current = { lights, partyMode };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const width = GRID_WIDTH * LIGHT_SCALE;
    const height = GRID_HEIGHT * LIGHT_SCALE;
    canvas.width = width;
    canvas.height = height;

    let raf = 0;
    const started = performance.now();

    function pool(
      source: LightSource,
      radius: number,
      alpha: number,
      colour: readonly [number, number, number],
      mode: 'erase' | 'add',
    ): void {
      if (!ctx || alpha <= 0 || radius <= 0) return;
      const cx = (source.x + 0.5) * LIGHT_SCALE;
      const cy = (source.y + 0.5) * LIGHT_SCALE;
      const r = radius * LIGHT_SCALE;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const [cr, cg, cb] = colour;
      if (mode === 'erase') {
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        gradient.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
        gradient.addColorStop(0.6, `rgba(${cr},${cg},${cb},${alpha * 0.35})`);
        gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    /** Per-light animation: how bright and how big it is at time `t`. */
    function animate(source: LightSource, t: number): { radius: number; gain: number } {
      const p = source.phase * Math.PI * 2;
      switch (source.kind) {
        case 'flicker': {
          // Two detuned sines read as a candle; one sine reads as a machine.
          const f = 0.86 + 0.1 * Math.sin(t * 7.3 + p) + 0.06 * Math.sin(t * 17.7 + p * 3);
          return { radius: source.radius * f, gain: f };
        }
        case 'beat': {
          const beat = Math.pow((Math.sin(t * 5.2 + p) + 1) / 2, 2.2);
          return { radius: source.radius * (0.72 + 0.4 * beat), gain: 0.6 + 0.55 * beat };
        }
        case 'disco':
          return { radius: source.radius, gain: 0.9 };
        default:
          return { radius: source.radius, gain: 1 };
      }
    }

    function frame(now: number): void {
      if (!ctx) return;
      const t = (now - started) / 1000;
      const { lights: sources, partyMode: party } = latest.current;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, width, height);

      const all: LightSource[] = [moonlight(GRID_WIDTH, GRID_HEIGHT), ...sources];

      // Pass one: cut the darkness away where light falls.
      ctx.globalCompositeOperation = 'destination-out';
      for (const source of all) {
        const { radius, gain } = animate(source, t);
        pool(source, radius, Math.min(1, source.intensity * gain), source.colour, 'erase');

        if (source.kind === 'disco') {
          // Four beams orbiting the ball. This is the light that sweeps.
          for (let i = 0; i < 4; i += 1) {
            const angle = t * 1.1 + (i * Math.PI) / 2 + source.phase * 6.28;
            const spot: LightSource = {
              ...source,
              x: source.x + Math.cos(angle) * source.radius * 0.45,
              y: source.y + Math.sin(angle) * source.radius * 0.3,
            };
            pool(spot, source.radius * 0.34, 0.5, source.colour, 'erase');
          }
        }
      }

      // Pass two: put the colour back, additively, so lights tint what they lit.
      ctx.globalCompositeOperation = 'lighter';
      for (const source of all) {
        const { radius, gain } = animate(source, t);
        const boost = party && source.kind === 'beat' ? 1.5 : 1;
        pool(source, radius, source.intensity * gain * 0.3 * boost, source.colour, 'add');

        if (source.kind === 'disco') {
          for (let i = 0; i < 4; i += 1) {
            const angle = t * 1.1 + (i * Math.PI) / 2 + source.phase * 6.28;
            // Each beam runs its own hue, so the sweep reads as colour, not glare.
            const hue = (t * 60 + i * 90) % 360;
            const rgb = hslToRgb(hue, 0.9, 0.6);
            const spot: LightSource = {
              ...source,
              x: source.x + Math.cos(angle) * source.radius * 0.45,
              y: source.y + Math.sin(angle) * source.radius * 0.3,
            };
            pool(spot, source.radius * 0.34, 0.28, rgb, 'add');
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}

/** Minimal HSL -> RGB, for the disco beams cycling hue. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
