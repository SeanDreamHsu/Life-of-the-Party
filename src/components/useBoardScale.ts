import { useEffect, useState } from 'react';
import { TERRAIN_SIZE } from '../art/terrain';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Focus } from '../game/camera';

/**
 * SCREEN SCALE
 *
 * The board has a native resolution — one terrain tile is 16 source pixels, so
 * the whole lot is 704x384. Everything drawn on it (32px sprites, 16px floors)
 * is authored at that resolution.
 *
 * The only way pixel art survives being blown up is an INTEGER scale factor.
 * At 3.89x — which is what "stretch to fill the window" was doing — some source
 * pixels land on 4 screen pixels and their neighbours land on 3, so straight
 * lines wobble and the whole image crawls when anything moves. At 4x every
 * source pixel is exactly 4x4 and the art is as sharp as it was authored.
 *
 * ── WHAT CHANGED WITH THE CAMERA ─────────────────────────────────────────────
 *
 * This used to pick the smallest integer scale that COVERED the window, so the
 * board always reached every edge and never letterboxed. That rule had a defect
 * which only became obvious once zooming was on the table: when the covering
 * scale came out larger than the fitting scale — which it does at a great many
 * ordinary window sizes — the house was silently CROPPED. "Zoom out to see the
 * whole house" was not a feature that could be added on top; it was a bug that
 * had to be fixed first.
 *
 * So the rule is now simply: the largest whole-number scale at which the
 * camera's focus rectangle fits on screen. Zoomed into a room, the rest of the
 * house is far bigger than the window and runs off every edge, so nothing
 * letterboxes. Pulled all the way out to the lot, the whole property is
 * guaranteed visible, which is the entire point of being pulled out.
 */

/** Native size of the whole lot, in source pixels. */
export const NATIVE_WIDTH = GRID_WIDTH * TERRAIN_SIZE;
export const NATIVE_HEIGHT = GRID_HEIGHT * TERRAIN_SIZE;

export interface BoardView {
  /** Integer multiplier from source pixels to CSS pixels. */
  scale: number;
  /** The whole board's size in CSS pixels — an exact multiple of native. */
  width: number;
  height: number;
  /** Where to place the board's top-left corner within the viewport. */
  left: number;
  top: number;
  /**
   * The window this was measured against. Returned so callers can work out how
   * much slack there is to drag without reading window size during a render,
   * where it would go stale the moment the window changed.
   */
  viewportWidth: number;
  viewportHeight: number;
}

function measure(focus: Focus, previous?: BoardView): BoardView {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // A hidden pane, a backgrounded tab and a print preview all report a window
  // with no size. Measuring against that yields scale 1 and an offset computed
  // from a centre of zero — a coherent-looking but completely wrong frame. The
  // condition is always transient, so the right answer is to keep the last good
  // measurement and wait for a real one.
  if (!Number.isFinite(vw) || !Number.isFinite(vh) || vw < 1 || vh < 1) {
    return previous ?? { scale: 1, width: NATIVE_WIDTH, height: NATIVE_HEIGHT, left: 0, top: 0, viewportWidth: NATIVE_WIDTH, viewportHeight: NATIVE_HEIGHT };
  }

  const focusW = Math.max(1, focus.w) * TERRAIN_SIZE;
  const focusH = Math.max(1, focus.h) * TERRAIN_SIZE;

  // The largest whole-number scale that still shows all of what we are looking
  // at. Fractional scales are not an option; see above.
  const scale = Math.max(1, Math.floor(Math.min(vw / focusW, vh / focusH)));

  const width = NATIVE_WIDTH * scale;
  const height = NATIVE_HEIGHT * scale;

  // Put the middle of the focus rectangle in the middle of the window.
  const centreX = (focus.x + focus.w / 2) * TERRAIN_SIZE * scale;
  const centreY = (focus.y + focus.h / 2) * TERRAIN_SIZE * scale;
  let left = Math.round(vw / 2 - centreX);
  let top = Math.round(vh / 2 - centreY);

  // Where the board is larger than the window — which is every zoomed-in view —
  // slide it so no empty shell shows at the edges. Where it is smaller, centre
  // it and let the surround frame it.
  left = width >= vw ? Math.min(0, Math.max(vw - width, left)) : Math.round((vw - width) / 2);
  top = height >= vh ? Math.min(0, Math.max(vh - height, top)) : Math.round((vh - height) / 2);

  return { scale, width, height, left, top, viewportWidth: vw, viewportHeight: vh };
}

/** Recomputes placement whenever the window resizes or the camera moves. */
export function useBoardView(focus: Focus): BoardView {
  const [value, setValue] = useState<BoardView>(() => measure(focus));

  // The focus is a fresh object every render, so depend on its numbers.
  const { x, y, w, h } = focus;

  useEffect(() => {
    setValue((previous) => measure({ x, y, w, h }, previous));
  }, [x, y, w, h]);

  useEffect(() => {
    let frame = 0;
    function onResize(): void {
      // Coalesce resize storms into one measurement per frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setValue((previous) => measure({ x, y, w, h }, previous)));
    }

    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [x, y, w, h]);

  return value;
}
