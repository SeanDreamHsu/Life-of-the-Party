import Panel from './Panel';
import PixelSprite from './PixelSprite';
import { terrainArt } from '../art';
import { TILE_LABEL, type TileKind } from '../types/game';

/** Materials worth calling out. Walls and doors read on their own. */
const SHOWN: readonly TileKind[] = [
  'yard',
  'path',
  'living',
  'kitchen',
  'bedroom',
  'bathroom',
  'door',
];

export default function Legend() {
  return (
    <Panel title="Rooms">
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {SHOWN.map((kind) => (
          <li key={kind} className="flex items-center gap-1.5 text-[0.65rem] text-white/60">
            <PixelSprite
              art={terrainArt(kind, 0, 0)}
              className="h-4 w-4 shrink-0 rounded-sm border border-black/40"
            />
            {TILE_LABEL[kind]}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
