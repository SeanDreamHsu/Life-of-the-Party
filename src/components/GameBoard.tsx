import type { MouseEvent } from 'react';
import ActionMenu from './ActionMenu';
import DecorSprite from './DecorSprite';
import GuestSprite from './GuestSprite';
import HostSprite from './HostSprite';
import InteractableSprite from './InteractableSprite';
import LightingLayer from './LightingLayer';
import SnackSprite from './SnackSprite';
import SpeechBubble from './SpeechBubble';
import TerrainCanvas from './TerrainCanvas';
import SectionOverlay from './SectionOverlay';
import { useBoardView } from './useBoardScale';
import { usePan } from './usePan';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { focusOf, sectionsOf, type Camera } from '../game/camera';
import { collectLights } from '../game/lights';
import type { ActionOption, GameState, Projection } from '../game/state';
import { placeAt } from '../data/rooms';
import { decorAt, guestAt, interactableAt, tileAt, type Tile } from '../types/game';

const CELL_W = 100 / GRID_WIDTH;
const CELL_H = 100 / GRID_HEIGHT;

interface GameBoardProps {
  state: GameState;
  projection: Projection;
  /** "x,y" keys of tiles the host can act on this turn. */
  reachable: ReadonlySet<string>;
  /** Which depth of the house is on screen. */
  camera: Camera;
  onMoveCamera: (camera: Camera) => void;
  menuOptions: readonly ActionOption[];
  onSelectTile: (tile: Tile | null) => void;
  onChooseAction: (option: ActionOption) => void;
}

export default function GameBoard({
  state,
  projection,
  reachable,
  camera,
  onMoveCamera,
  menuOptions,
  onSelectTile,
  onChooseAction,
}: GameBoardProps) {
  const { grid, decor, selected } = state;
  const board = useBoardView(focusOf(camera));
  const sections = sectionsOf(camera);

  // What the drag is allowed to do is keep the board covering the window: its
  // left edge no further right than 0, its right edge no further left than the
  // window. Expressed as limits on the OFFSET that means subtracting the
  // placement the camera already chose, which is why these are not symmetric.
  const slackX = Math.max(0, board.width - board.viewportWidth);
  const slackY = Math.max(0, board.height - board.viewportHeight);
  const pan = usePan(`${camera.level}:${camera.wingId ?? ''}:${camera.roomId ?? ''}`, {
    minX: slackX === 0 ? 0 : board.viewportWidth - board.width - board.left,
    maxX: slackX === 0 ? 0 : -board.left,
    minY: slackY === 0 ? 0 : board.viewportHeight - board.height - board.top,
    maxY: slackY === 0 ? 0 : -board.top,
  });
  const selectedDecor = selected ? decorAt(decor, selected.x, selected.y) : undefined;

  // Committed snacks are already in the projection; anything beyond the
  // committed count is still only planned, and is drawn faded.
  const committedSnackCount = state.snacks.length;
  const hostMoved = projection.host.x !== state.host.x || projection.host.y !== state.host.y;

  // Lights follow the projection, so flipping a switch lights the room while
  // the action is still only planned. That preview is most of the feedback.
  const lights = collectLights(projection.interactables, decor, projection.snacks);
  const partyMode = projection.interactables.some(
    (item) => item.type === 'speaker' && item.state === 'on',
  );

  /** Turns a click anywhere on the board into the tile underneath it. */
  function pickTile(event: MouseEvent<HTMLDivElement>): void {
    // A click that merely ended a drag is not a click on a tile.
    if (pan.consumeDragClick()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_WIDTH);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_HEIGHT);
    onSelectTile(tileAt(grid, x, y) ?? null);
  }

  return (
    // The whole lot is always drawn; the camera decides which part of it lands
    // in the middle of the window and at what INTEGER scale (see useBoardView).
    // Zoomed in, the rest of the house is far larger than the viewport and
    // simply runs off every edge, which is what makes leaning into a room feel
    // continuous rather than like loading a different screen.
    <div
      className="absolute inset-0 overflow-hidden bg-shell"
      onPointerDown={pan.onPointerDown}
      style={{ cursor: pan.dragging ? 'grabbing' : slackX + slackY > 0 ? 'grab' : 'default' }}
    >
      <div
        // Easing is dropped mid-drag: a 300ms transition on left/top makes the
        // board lag a few frames behind the pointer, which feels broken.
        className={pan.dragging ? 'absolute' : 'absolute transition-[left,top,width,height] duration-300 ease-out'}
        style={{
          left: board.left + pan.offset.x,
          top: board.top + pan.offset.y,
          width: board.width,
          height: board.height,
        }}
      >
        <TerrainCanvas grid={grid} />

        {/* One hit target for the whole floor, since the terrain is a canvas. */}
        <div className="absolute inset-0" onClick={pickTile} />

        {/* Reach and selection washes. Only a handful of elements, not a grid. */}
        {[...reachable].map((key) => {
          const [x, y] = key.split(',').map(Number);
          if (x === undefined || y === undefined) return null;
          const tile = tileAt(grid, x, y);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTile(tile ?? null)}
              aria-label={
                tile ? `${placeAt(grid, x, y).name} at column ${x}, row ${y}` : `tile ${x}, ${y}`
              }
              className="absolute bg-cyan-200/15 ring-1 ring-cyan-200/60 ring-inset transition-colors hover:bg-cyan-200/30"
              style={{
                left: `${x * CELL_W}%`,
                top: `${y * CELL_H}%`,
                width: `${CELL_W}%`,
                height: `${CELL_H}%`,
              }}
            />
          );
        })}

        {selected && (
          <div
            className="pointer-events-none absolute bg-white/20 ring-2 ring-white ring-inset"
            style={{
              left: `${selected.x * CELL_W}%`,
              top: `${selected.y * CELL_H}%`,
              width: `${CELL_W}%`,
              height: `${CELL_H}%`,
            }}
          />
        )}

        {/* Entities. Draw order is decor, snacks, objects, then people, so
            nobody is hidden behind the couch they are standing next to. */}
        <div className="pointer-events-none absolute inset-0">
          {decor.map((item) => (
            <DecorSprite key={item.id} item={item} isSelected={selectedDecor?.id === item.id} />
          ))}

          {projection.snacks.map((snack, index) => (
            <SnackSprite key={snack.id} snack={snack} isPending={index >= committedSnackCount} />
          ))}

          {projection.interactables.map((item) => (
            <InteractableSprite
              key={item.id}
              item={item}
              isSelected={
                selected !== null &&
                interactableAt(projection.interactables, selected.x, selected.y)?.id === item.id
              }
            />
          ))}

          {projection.guests.map((guest) => (
            <GuestSprite
              key={guest.id}
              guest={guest}
              isSelected={
                selected !== null &&
                guestAt(projection.guests, selected.x, selected.y)?.id === guest.id
              }
            />
          ))}

          {/* Anything anyone said this hour, above the crowd but under the HUD. */}
          {projection.guests.map((guest) => (
            <SpeechBubble key={`say-${guest.id}`} guest={guest} />
          ))}

          {/* Where you stand, and — if the plan moves you — where it leaves you. */}
          {hostMoved && <HostSprite at={state.host} isGhost />}
          <HostSprite at={projection.host} />
        </div>

        {/* How the house is divided, and the way further in. Above the
            entities so the nameplates stay readable over a crowd, below the
            night so a dark room still reads as dark. */}
        {sections.length > 0 && <SectionOverlay sections={sections} onOpen={onMoveCamera} />}

        {/* Night, and the holes the lights punch in it. Above the entities so
            people are genuinely in shadow, below the menu so the UI stays legible. */}
        <LightingLayer lights={lights} partyMode={partyMode} />

        {/* Menu layer sits above everything and takes its own clicks. */}
        <div className="pointer-events-none absolute inset-0 z-40">
          {selected && menuOptions.length > 0 && state.phase === 'planning' && (
            <ActionMenu
              grid={grid}
              tile={selected}
              options={menuOptions}
              onChoose={onChooseAction}
              onDismiss={() => onSelectTile(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
