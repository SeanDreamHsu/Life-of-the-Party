import PixelSprite from './PixelSprite';
import { furnitureArt } from '../art';
import { roomRug } from '../art/sprites/rugs';
import { OBJECT_PALETTE } from '../art/palette';
import { useMemo } from 'react';
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

interface DecorSpriteProps {
  item: Decor;
  isSelected: boolean;
}

export default function DecorSprite({ item, isSelected }: DecorSpriteProps) {
  const width = item.floorSize?.[0] ?? OVERSCAN;
  const height = item.floorSize?.[1] ?? OVERSCAN;
  const art = useMemo(() => item.floorSize ? {
    cacheKey: `rug:${item.art}:${width}:${height}`,
    grid: roomRug(item.art, width * 16, height * 16),
    palette: OBJECT_PALETTE,
  } : furnitureArt(item.art), [item.art, item.floorSize, width, height]);
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
          left: `${-(width - 1) * 50}%`,
          top: `${-(height - 1) * 50}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
        }}
      >
        {isSelected && (
          <div className="absolute inset-[18%] rounded-md bg-white/20 ring-2 ring-white/90" />
        )}
        <PixelSprite art={art} className="relative h-full w-full" />
      </div>
    </div>
  );
}
