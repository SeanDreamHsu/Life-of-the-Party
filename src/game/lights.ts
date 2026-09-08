import type { Snack } from './actions';
import type { Decor, Interactable } from '../types/game';

/**
 * WHAT GLOWS
 *
 * The house is dark. Everything you can see, you can see because something in
 * the room is lit — which makes turning a lamp on a visual event, not just a
 * state change, and makes the speaker's party wash the loudest thing on screen.
 */

export type LightKind = 'steady' | 'flicker' | 'beat' | 'disco';

export interface LightSource {
  /** Tile coordinates of the centre. */
  x: number;
  y: number;
  /** Reach, in tiles. */
  radius: number;
  colour: readonly [number, number, number];
  /** 0..1 brightness before animation. */
  intensity: number;
  kind: LightKind;
  /** Phase offset so two candles never flicker in lockstep. */
  phase: number;
}

const WARM: readonly [number, number, number] = [255, 196, 110];
const CANDLE: readonly [number, number, number] = [255, 168, 82];
const COLD: readonly [number, number, number] = [186, 226, 255];
const TV: readonly [number, number, number] = [110, 170, 255];
const PUNCH: readonly [number, number, number] = [140, 240, 120];
const PARTY: readonly [number, number, number] = [255, 80, 200];
const MOON: readonly [number, number, number] = [120, 150, 210];

/** Deterministic phase from an id, so a light looks the same every reload. */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  return ((h >>> 0) % 1000) / 1000;
}

export function collectLights(
  interactables: readonly Interactable[],
  decor: readonly Decor[],
  snacks: readonly Snack[],
): LightSource[] {
  const lights: LightSource[] = [];

  // A mirror ball with nothing playing is just a heavy ornament. Keeping the
  // beams tied to the music means flipping the speaker on is a visible event
  // across the whole house, not a line in a log.
  const musicOn = interactables.some((item) => item.type === 'speaker' && item.state === 'on');

  for (const item of interactables) {
    if (item.state !== 'on') continue;
    const phase = phaseOf(item.id);

    if (item.type === 'lamp') {
      lights.push({ x: item.x, y: item.y, radius: 5.5, colour: WARM, intensity: 0.95, kind: 'steady', phase });
    } else if (item.type === 'speaker') {
      // The speaker is the party. It pulses, and it throws colour everywhere.
      lights.push({ x: item.x, y: item.y, radius: 9, colour: PARTY, intensity: 1, kind: 'beat', phase });
    } else if (item.type === 'fridge') {
      lights.push({ x: item.x, y: item.y, radius: 4, colour: COLD, intensity: 0.85, kind: 'steady', phase });
    } else if (item.type === 'pc') {
      // Screen light: cold, short-range and unsteady, so a live PC reads as a
      // monitor two rooms away rather than as another lamp.
      lights.push({ x: item.x, y: item.y, radius: 3.6, colour: TV, intensity: 0.75, kind: 'flicker', phase });
    }
  }

  for (const item of decor) {
    const phase = phaseOf(item.id);
    switch (item.art) {
      case 'candle':
        lights.push({ x: item.x, y: item.y, radius: 3.4, colour: CANDLE, intensity: 0.8, kind: 'flicker', phase });
        break;
      case 'television':
        lights.push({ x: item.x, y: item.y, radius: 4.2, colour: TV, intensity: 0.7, kind: 'flicker', phase });
        break;
      case 'punchbowl':
        lights.push({ x: item.x, y: item.y, radius: 2.6, colour: PUNCH, intensity: 0.7, kind: 'steady', phase });
        break;
      case 'discoball':
        // Sweeping beams, the one light that moves on its own.
        lights.push({
          x: item.x,
          y: item.y,
          radius: musicOn ? 8 : 3,
          colour: PARTY,
          intensity: musicOn ? 0.95 : 0.3,
          kind: 'disco',
          phase,
        });
        break;
      case 'stringlights':
      case 'bunting':
        lights.push({ x: item.x, y: item.y, radius: 2.8, colour: WARM, intensity: 0.6, kind: 'flicker', phase });
        break;
      default:
        break;
    }
  }

  // Food on the floor catches whatever light there is; a faint hint helps the
  // player spot a lure they placed three rooms away.
  for (const snack of snacks) {
    lights.push({
      x: snack.x,
      y: snack.y,
      radius: 1.8,
      colour: WARM,
      intensity: 0.5,
      kind: 'steady',
      phase: phaseOf(snack.id),
    });
  }

  return lights;
}

/** Moonlight over the lot, so the outdoors is dim rather than pitch black. */
export function moonlight(width: number, height: number): LightSource {
  return {
    x: width / 2,
    y: -2,
    radius: Math.max(width, height) * 0.9,
    colour: MOON,
    intensity: 0.36,
    kind: 'steady',
    phase: 0,
  };
}
