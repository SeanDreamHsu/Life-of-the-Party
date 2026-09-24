import CharacterBody from './CharacterBody';
import { useCharacterMotion, WALK_MS } from './useCharacterMotion';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Position } from '../game/state';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

interface HostSpriteProps {
  at: Position;
  /** True when this is where the queued plan leaves you, not where you stand. */
  isGhost?: boolean;
}

export default function HostSprite({ at, isGhost = false }: HostSpriteProps) {
  const motion = useCharacterMotion(at.x, at.y);
  return (
    <div
      className="character-position absolute"
      data-character={isGhost ? 'host-ghost' : 'host'}
      data-moving={motion.moving}
      style={{
        transitionDuration: `${WALK_MS}ms`,
        left: `${at.x * CELL_W}%`,
        top: `${at.y * CELL_H}%`,
        width: `${CELL_W}%`,
        height: `${CELL_H}%`,
        opacity: isGhost ? 0.45 : 1,
      }}
    >
      <div className="character-anchor">
        <div className="character-shadow character-shadow-host" />
        {!isGhost && <span className="host-pointer" aria-hidden="true" />}
        <CharacterBody id="host" stage={0} moving={!isGhost && motion.moving}
          direction={motion.direction} facing={motion.facing}
          label={isGhost ? 'Original host position' : 'You, the host'} />

      </div>
    </div>
  );
}
