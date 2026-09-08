import PixelSprite from './PixelSprite';
import { furnitureArt } from '../art';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Decor } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

/**
 * A sprite is 32 source pixels; a tile is 16. So a sprite box is exactly TWO
 * tiles wide and tall, centred on its own tile. Any other size scales the art
 * by a fraction of the board scale and the pixels stop being square.
 */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

interface DecorSpriteProps {
  item: Decor;
  isSelected: boolean;
}

export default function DecorSprite({ item, isSelected }: DecorSpriteProps) {
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
        {isSelected && (
          <div className="absolute inset-[18%] rounded-md bg-white/20 ring-2 ring-white/90" />
        )}
        <PixelSprite art={furnitureArt(item.art)} className="relative h-full w-full" />
      </div>
    </div>
  );
}
