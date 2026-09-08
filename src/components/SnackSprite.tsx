import PixelSprite from './PixelSprite';
import { foodArt } from '../art';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Snack } from '../game/actions';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

/** Food is 32px art too, so it gets the same exact two-tile box. */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

interface SnackSpriteProps {
  snack: Snack;
  /** True while the snack is only planned, not yet put down. */
  isPending?: boolean;
}

export default function SnackSprite({ snack, isPending = false }: SnackSpriteProps) {
  return (
    <div
      className="absolute"
      style={{
        left: `${snack.x * CELL_W}%`,
        top: `${snack.y * CELL_H}%`,
        width: `${CELL_W}%`,
        height: `${CELL_H}%`,
        opacity: isPending ? 0.55 : 1,
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
        {/* Food is a lure, so it glows the same amber as a switched-on object. */}
        <div className="absolute inset-[28%] rounded-full bg-amber-300/25 blur-[4px]" />
        <PixelSprite
          art={foodArt(snack.art)}
          title={isPending ? `Planned: ${snack.art}` : snack.art}
          label={`${snack.art} on the floor`}
          className="relative h-full w-full"
        />
      </div>
    </div>
  );
}
