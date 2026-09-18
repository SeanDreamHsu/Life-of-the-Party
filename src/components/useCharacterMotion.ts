import { useEffect, useRef, useState } from 'react';
import type { CharacterDirection } from '../art/sprites/people';

export const WALK_MS = 640;

/** Visual history only. A rerender or a blocked AI intent cannot invent a step. */
export function useCharacterMotion(x: number, y: number) {
  const previous = useRef({ x, y });
  const timer = useRef<number | undefined>(undefined);
  const [motion, setMotion] = useState({ moving: false, direction: 'front' as CharacterDirection, facing: 1 });

  useEffect(() => {
    const dx = x - previous.current.x;
    const dy = y - previous.current.y;
    previous.current = { x, y };
    if (dx === 0 && dy === 0) return;
    window.clearTimeout(timer.current);
    setMotion(current => ({
      moving: true,
      direction: dy < 0 && dx === 0 ? 'back' : 'front',
      facing: dx === 0 ? current.facing : dx > 0 ? 1 : -1,
    }));
    timer.current = window.setTimeout(() => setMotion(current => ({ ...current, moving: false })), WALK_MS);
  }, [x, y]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return motion;
}
