import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Guest } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

interface SpeechBubbleProps {
  guest: Guest;
}

/**
 * What someone said this hour, floating over their head.
 *
 * Anchored to the guest's tile but allowed to be much wider than one, and it
 * flips to the other side near the edges so a line is never cut off by the
 * board. Kept to the HUD's serif so it reads as narration rather than a
 * cartoon balloon — these people are funny, but the game is not a cartoon.
 */
export default function SpeechBubble({ guest }: SpeechBubbleProps) {
  if (!guest.saying) return null;

  const flipX = guest.x > GRID_WIDTH * 0.62;
  // Anyone in the front rooms gets their line hung BELOW them. Above, it slides
  // under the title plate and the top-right controls and becomes unreadable —
  // the HUD sits on a higher layer and will always win that fight.
  const nearTop = guest.y < GRID_HEIGHT * 0.45;

  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: `${(guest.x + 0.5) * CELL_W}%`,
        top: `${(guest.y + (nearTop ? 1.05 : -0.15)) * CELL_H}%`,
        transform: `translate(${flipX ? '-92%' : '-8%'}, ${nearTop ? '0' : '-100%'})`,
      }}
    >
      <div
        className="max-w-[19rem] min-w-[7rem] px-2.5 py-1.5"
        style={{
          background: 'linear-gradient(176deg, rgba(45,33,25,.97), rgba(20,14,11,.97))',
          border: '1px solid var(--color-brass-dim)',
          borderRadius: '2px',
          boxShadow:
            'inset 0 1px 0 rgba(226,190,120,.22), 0 6px 18px rgba(0,0,0,.75)',
        }}
      >
        <p className="text-[0.8rem] leading-snug text-bone">{guest.saying}</p>
        <p className="mt-0.5 text-[0.66rem] text-brass italic">— {guest.name}</p>
      </div>
    </div>
  );
}
