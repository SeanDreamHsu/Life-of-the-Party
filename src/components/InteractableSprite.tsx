import PixelSprite from './PixelSprite';
import { furnitureArt } from '../art';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { INTERACTABLE_META, type Interactable } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

/**
 * A sprite is 32 source pixels; a tile is 16. So a sprite box is exactly TWO
 * tiles wide and tall, centred on its own tile. Any other size scales the art
 * by a fraction of the board scale and the pixels stop being square.
 */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

interface InteractableSpriteProps {
  item: Interactable;
  isSelected: boolean;
}

export default function InteractableSprite({ item, isSelected }: InteractableSpriteProps) {
  const meta = INTERACTABLE_META[item.type];
  const isActive = item.state === 'on';

  return (
    <div
      className="absolute"
      style={{
        left: `${item.x * CELL_W}%`,
        top: `${item.y * CELL_H}%`,
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
        {/* An object that is switched on is broadcasting a lure, so it glows. */}
        {isActive && (
          <div className="absolute inset-[15%] rounded-full bg-amber-300/35 blur-[6px]" />
        )}
        {isSelected && (
          <div className="absolute inset-[18%] rounded-md bg-white/20 ring-2 ring-white/90" />
        )}
        <PixelSprite
          art={furnitureArt(meta.art)}
          title={`${meta.label} — ${meta.stateLabels[item.state]}`}
          label={`${meta.label}, ${meta.stateLabels[item.state]}`}
          className="relative h-full w-full"
        />
      </div>
    </div>
  );
}
