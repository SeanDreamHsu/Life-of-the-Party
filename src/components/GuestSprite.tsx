import PixelSprite from './PixelSprite';
import { emoteArt } from '../art';
import CharacterBody from './CharacterBody';
import { useCharacterMotion, WALK_MS } from './useCharacterMotion';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { EmoteId } from '../art/sprites/emotes';
import { MUTATION_META, type Guest } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;


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
  const motion = useCharacterMotion(guest.x, guest.y);

  return (
    <div
      // Positioned in percentages over the board rather than nested inside a
      // tile, so every guest can transition to new coordinates at once.
      className="character-position absolute"
      data-character={guest.id}
      data-moving={motion.moving}
      style={{
        transitionDuration: `${WALK_MS}ms`,
        left: `${guest.x * CELL_W}%`,
        top: `${guest.y * CELL_H}%`,
        width: `${CELL_W}%`,
        height: `${CELL_H}%`,
      }}
    >
      <div className="character-anchor">
        <div className={`character-shadow ${isSelected ? 'character-shadow-selected' : ''}`} />
        <CharacterBody id={guest.id} stage={guest.mutationStage} moving={motion.moving}
          dancing={guest.dancing} direction={motion.direction} facing={motion.facing}
          phase={phase} label={`${guest.name}, ${meta.label}`} />
        {isSelected && <span className="character-name">{guest.name}</span>}

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
