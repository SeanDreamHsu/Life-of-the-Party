import { useLayoutEffect, useState, type RefObject } from 'react';
import { frameBoard, NATIVE_WIDTH, NATIVE_HEIGHT, type BoardView } from '../game/framing';
import { TERRAIN_SIZE } from '../art/terrain';
import type { Focus } from '../game/camera';

export { NATIVE_WIDTH, NATIVE_HEIGHT } from '../game/framing';
export type { BoardView } from '../game/framing';

/** Observe the play surface so opening a panel reframes rather than obscures a room. */
export function useBoardView(focus: Focus, viewport: RefObject<HTMLDivElement | null>, centerFocus = false): BoardView {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width > 0 && height > 0) setSize(current => current.width === width && current.height === height ? current : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewport]);
  const board = frameBoard(focus, size.width, size.height);
  if (!centerFocus) return board;
  return { ...board,
    left: Math.round(size.width / 2 - (focus.x + focus.w / 2) * board.width / (NATIVE_WIDTH / TERRAIN_SIZE)),
    top: Math.round(size.height / 2 - (focus.y + focus.h / 2) * board.height / (NATIVE_HEIGHT / TERRAIN_SIZE)),
  };
}
