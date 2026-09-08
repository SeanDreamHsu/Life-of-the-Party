import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Camera, Section } from '../game/camera';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

interface SectionOverlayProps {
  sections: readonly Section[];
  onOpen: (camera: Camera) => void;
}

/**
 * The parts of the house you can lean into.
 *
 * Deliberately NOT a full-area click target. An overlay covering each section
 * would swallow every click on the board underneath it, so you would have to
 * zoom all the way into a room before you could plan anything — which turns a
 * convenience into a chore. Instead each section is outlined, and only its
 * NAMEPLATE takes clicks. Zooming and playing therefore never compete for the
 * same gesture, and the whole board stays live at every depth.
 *
 * The outlines are drawn at low contrast on purpose: they are a hint about how
 * the house is organised, not furniture, and the party underneath them is the
 * thing worth looking at.
 */
export default function SectionOverlay({ sections, onOpen }: SectionOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {sections.map((section) => (
        <div
          key={section.id}
          className="absolute rounded-[2px] ring-1 ring-brass/25 ring-inset"
          style={{
            left: `${section.x * CELL_W}%`,
            top: `${section.y * CELL_H}%`,
            width: `${section.w * CELL_W}%`,
            height: `${section.h * CELL_H}%`,
          }}
        >
          {/* The nameplate hangs inside the top-left corner of its section and
              is the only part of this layer that takes a click. */}
          <button
            type="button"
            onClick={() => onOpen(section.target)}
            title={`${section.name} — ${section.blurb}`}
            className="signplate pointer-events-auto absolute top-1 left-1 max-w-[92%] truncate px-2 py-0.5 text-[0.72rem] leading-tight font-bold whitespace-nowrap text-brass hover:text-white"
          >
            {section.name}
          </button>
        </div>
      ))}
    </div>
  );
}
