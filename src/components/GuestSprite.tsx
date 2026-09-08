import PixelSprite from './PixelSprite';
import { emoteArt, guestArt } from '../art';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { EmoteId } from '../art/sprites/emotes';
import { MUTATION_META, type Guest, type MutationStage } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

/**
 * A sprite is 32 source pixels; a tile is 16. So a sprite box is exactly TWO
 * tiles wide and tall, centred on its own tile. Any other size scales the art
 * by a fraction of the board scale and the pixels stop being square.
 */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

/** Plain-English mood, for the tooltip and screen readers. */
const MOOD_WORD: Record<EmoteId, string> = {
  note: 'is dancing',
  food: 'is hungry',
  heart: 'looks happy',
  anger: 'is furious',
  sweat: 'is getting agitated',
  sleep: 'looks bored',
  alert: 'is alarmed',
  skull: 'is beyond reasoning',
};

/** Idle animation escalates as a guest comes apart. */
const IDLE_BY_STAGE: Record<MutationStage, string> = {
  0: 'anim-breathe',
  1: 'anim-sway',
  2: 'anim-twitch',
  3: 'anim-jitter',
};

/**
 * A stable per-guest offset in seconds. Two guests on the same animation must
 * never be in phase, or the room reads as a row of clones rather than a crowd.
 */
function phaseSeconds(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  return ((h >>> 0) % 2000) / 1000;
}

interface GuestSpriteProps {
  guest: Guest;
  isSelected: boolean;
}

export default function GuestSprite({ guest, isSelected }: GuestSpriteProps) {
  const meta = MUTATION_META[guest.mutationStage];
  const phase = phaseSeconds(guest.id);
  const idleClass = guest.dancing ? 'anim-dance' : IDLE_BY_STAGE[guest.mutationStage];

  return (
    <div
      // Positioned in percentages over the board rather than nested inside a
      // tile, so every guest can transition to new coordinates at once.
      className="absolute transition-[left,top] duration-300 ease-out"
      style={{
        left: `${guest.x * CELL_W}%`,
        top: `${guest.y * CELL_H}%`,
        width: `${CELL_W}%`,
        height: `${CELL_H}%`,
      }}
    >
      <div
        className="absolute"
        style={{
          left: `${-OFFSET * 100}%`,
          top: `${-OFFSET * 100}%`,
          width: `${OVERSCAN * 100}%`,
          height: `${OVERSCAN * 100}%`,
        }}
      >
        {isSelected && (
          <div className="absolute inset-[18%] rounded-md bg-white/20 ring-2 ring-white/90" />
        )}

        {/* The body: idles on its own clock, and mirrors to face its heading.
            Scale and animation live on separate elements so the flip does not
            fight the keyframes for the transform property. */}
        <div
          className={`absolute inset-0 ${idleClass}`}
          style={{ animationDelay: `-${phase}s`, transformOrigin: '50% 90%' }}
        >
          <div
            className="h-full w-full"
            style={{ transform: `scaleX(${guest.facing})` }}
          >
            <PixelSprite
              art={guestArt(guest)}
              title={`${guest.name} — ${meta.label}`}
              label={`${guest.name}, ${meta.label}`}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Mood bubble, floating clear of the head. */}
        {guest.mood && (
          <div
            className="anim-emote pointer-events-none absolute"
            style={{
              left: '52%',
              top: '-14%',
              width: '46%',
              height: '46%',
              animationDelay: `-${phase * 1.7}s`,
            }}
          >
            <PixelSprite
              art={emoteArt(guest.mood)}
              className="h-full w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              title={`${guest.name} ${MOOD_WORD[guest.mood]}`}
              label={`${guest.name} ${MOOD_WORD[guest.mood]}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
