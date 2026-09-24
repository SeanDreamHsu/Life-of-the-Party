import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * DRAG TO PAN
 *
 * The camera frames a room; this lets you shove that framing around by hand
 * without leaving it. Two things make it more than a mousedown handler:
 *
 * CLICKS MUST SURVIVE. The board underneath is the game — every tile is a
 * click target. So a press only becomes a drag once the pointer has travelled
 * past a small threshold, and only a press that became a drag suppresses the
 * click that follows it. Below the threshold nothing moves and the click lands
 * normally, which means a slightly shaky click still selects the tile you
 * aimed at rather than nudging the view and doing nothing.
 *
 * THE PAN IS PART OF THE CAMERA, NOT ON TOP OF IT. Moving to another room
 * resets the offset to zero, because the whole point of choosing a room is
 * that the game frames it for you. Carrying a stale hand-made offset into a
 * new room would land you looking at its wall.
 */

export interface Pan {
  x: number;
  y: number;
}

/** How far the pointer must travel before a press counts as a drag, in pixels. */
const DRAG_THRESHOLD = 4;

export interface PanControls {
  offset: Pan;
  /** True while a drag is actually under way, so the caller can drop easing. */
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  /**
   * Whether the click that is about to fire came at the end of a drag and
   * should be ignored. Reading it clears it.
   */
  consumeDragClick: () => boolean;
  reset: () => void;
}

export interface PanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * @param resetKey Change this whenever the framing should snap back — moving
 *                 the camera to a different room, for instance.
 * @param bounds   How far the offset may travel in each direction.
 *
 * The bounds are ASYMMETRIC and the caller computes them, because what has to
 * stay in range is the board POSITION, not the offset. The camera has already
 * placed the board off-centre to frame a room, so an offset limited to a
 * symmetric ±slack lets a drag from one of those off-centre framings run the
 * board clean past the edge and expose empty shell — which is exactly what it
 * did before this was split apart.
 */
export function usePan(resetKey: string, bounds: PanBounds): PanControls {
  const [offset, setOffset] = useState<Pan>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);
  const swallowClick = useRef(false);

  // A new framing is a fresh start; see the note above about stale offsets.
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    start.current = null;
    moved.current = false;
    setDragging(false);
  }, [resetKey]);

  // Clamping lives in an effect as well as in the move handler, because the
  // window resizing or the camera zooming can shrink the allowance underneath
  // an offset that was legal when it was made.
  const { minX, maxX, minY, maxY } = bounds;
  useEffect(() => {
    setOffset((current) => {
      const x = Math.max(minX, Math.min(maxX, current.x));
      const y = Math.max(minY, Math.min(maxY, current.y));
      return x === current.x && y === current.y ? current : { x, y };
    });
  }, [minX, maxX, minY, maxY]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Left button only; right-click belongs to the browser.
      if (event.button !== 0) return;
      start.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
      moved.current = false;
    },
    [offset.x, offset.y],
  );

  // Move and release are bound to the window rather than the board, so a drag
  // that wanders over the HUD — or off the edge of it entirely — keeps working
  // instead of sticking the board to the pointer.
  useEffect(() => {
    function onMove(event: globalThis.PointerEvent): void {
      const from = start.current;
      if (from === null) return;

      const dx = event.clientX - from.px;
      const dy = event.clientY - from.py;

      if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!moved.current) {
        moved.current = true;
        setDragging(true);
      }

      setOffset({
        x: Math.max(minX, Math.min(maxX, from.ox + dx)),
        y: Math.max(minY, Math.min(maxY, from.oy + dy)),
      });
    }

    function onUp(): void {
      if (start.current === null) return;
      start.current = null;
      if (moved.current) {
        // The click event fires after pointerup; mark it to be ignored so the
        // tile under the pointer is not selected at the end of a drag.
        swallowClick.current = true;
        setDragging(false);
      }
      moved.current = false;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [minX, maxX, minY, maxY]);

  const consumeDragClick = useCallback(() => {
    const value = swallowClick.current;
    swallowClick.current = false;
    return value;
  }, []);

  const reset = (): void => {
    start.current = null;
    moved.current = false;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  };
  return { offset, dragging, onPointerDown, consumeDragClick, reset };
}
