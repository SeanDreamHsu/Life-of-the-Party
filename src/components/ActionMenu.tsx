import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { formatMinutes } from '../game/actions';
import type { ActionOption } from '../game/state';
import { placeAt } from '../data/rooms';
import type { Grid, Tile } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

interface ActionMenuProps {
  tile: Tile;
  /** Needed to name the room the tile belongs to. */
  grid: Grid;
  options: readonly ActionOption[];
  onChoose: (option: ActionOption) => void;
  onDismiss: () => void;
}

/**
 * The interaction menu, anchored to the tile it belongs to.
 *
 * It flips to the other side of the tile near the board edges so it never opens
 * off-screen. Styled as the same brass-and-wood plate as the rest of the HUD,
 * so it reads as part of the same object rather than a browser context menu.
 */
export default function ActionMenu({ tile, grid, options, onChoose, onDismiss }: ActionMenuProps) {
  const flipX = tile.x > GRID_WIDTH * 0.6;
  const flipY = tile.y > GRID_HEIGHT * 0.6;

  return (
    <div
      className="pointer-events-auto absolute z-50"
      style={{
        left: `${(tile.x + (flipX ? 0 : 1)) * CELL_W}%`,
        top: `${(tile.y + (flipY ? 1 : 0)) * CELL_H}%`,
        transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
      }}
    >
      <div className="plate min-w-[170px] px-2.5 pt-1.5 pb-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="legend text-[0.82rem] font-bold">{placeAt(grid, tile.x, tile.y).name}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close menu"
            className="text-[0.9rem] leading-none text-bone-dim hover:text-bone"
          >
            &times;
          </button>
        </div>
        <hr className="rule mb-1" />

        {options.length === 0 ? (
          <p className="py-0.5 text-[0.78rem] text-bone-dim italic">Too far to reach.</p>
        ) : (
          <ul>
            {options.map((option) => {
              const blocked = option.disabledReason !== undefined;
              return (
                <li key={`${option.kind}-${option.targetId ?? 'tile'}`}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onChoose(option)}
                    title={option.disabledReason}
                    className={[
                      'flex w-full items-baseline justify-between gap-3 px-1 py-1 text-left text-[0.86rem]',
                      blocked
                        ? 'cursor-not-allowed text-bone-dim/40'
                        : 'text-bone hover:bg-brass/15 hover:text-white',
                    ].join(' ')}
                  >
                    <span>{option.label}</span>
                    <span className={blocked ? 'text-bone-dim/30' : 'text-brass'}>
                      {formatMinutes(option.cost)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
