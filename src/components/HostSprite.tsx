import PixelSprite from './PixelSprite';
import { hostArt } from '../art';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Position } from '../game/state';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;
/**
 * A sprite is 32 source pixels; a tile is 16. So a sprite box is exactly TWO
 * tiles wide and tall, centred on its own tile. Any other size scales the art
 * by a fraction of the board scale and the pixels stop being square.
 */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

interface HostSpriteProps {
  at: Position;
  /** True when this is where the queued plan leaves you, not where you stand. */
  isGhost?: boolean;
}

export default function HostSprite({ at, isGhost = false }: HostSpriteProps) {
  return (
    <div
      className="absolute transition-[left,top] duration-300 ease-out"
      style={{
        left: `${at.x * CELL_W}%`,
        top: `${at.y * CELL_H}%`,
        width: `${CELL_W}%`,
        height: `${CELL_H}%`,
        opacity: isGhost ? 0.45 : 1,
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
        {/* A cyan footprint marks you out from the guests at a glance. */}
        <div
          className={[
            'absolute inset-[24%] rounded-full',
            isGhost ? 'ring-1 ring-cyan-200/50' : 'bg-cyan-300/20 ring-2 ring-cyan-300/80',
          ].join(' ')}
        />
        <PixelSprite
          art={hostArt()}
          title={isGhost ? 'Where this plan leaves you' : 'You'}
          label={isGhost ? 'Planned host position' : 'You, the host'}
          className="relative h-full w-full"
        />
      </div>
    </div>
  );
}
