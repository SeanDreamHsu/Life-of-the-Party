import { useMemo, useRef, type MouseEvent } from 'react';
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
import { atlasPoint, FLOOR_VIEW, floorPoint, visibleOnFloor, floorAt, floorForWing, floorInfo, stairsOnFloor, type FloorId } from '../data/floors';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { focusOf, sectionsOf, type Camera } from '../game/camera';
import { collectLights } from '../game/lights';
import { availableActions, type ActionOption, type GameState, type Projection } from '../game/state';
import { placeAt, roomById } from '../data/rooms';
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
  focusRevision: number;
  floor: FloorId;
  onTakeStairs: (tile: Tile) => void;
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
  focusRevision,
  floor,
  onTakeStairs,
  onMoveCamera,
  menuOptions,
  onSelectTile,
  onChooseAction,
}: GameBoardProps) {
  const { grid, decor, selected } = state;
  const viewport = useRef<HTMLDivElement>(null);
  const visible = (position: { x: number; y: number }) => visibleOnFloor(position, floor);
  const focus = camera.level === 'lot' ? FLOOR_VIEW : floorPoint(focusOf(camera));
  const board = useBoardView(focus, viewport, true);
  const sections = sectionsOf(camera).filter(section => floorForWing(section.target.wingId) === floor && section.target.wingId !== 'grounds').map(floorPoint);
  const stairs = useMemo(() => stairsOnFloor(grid, floor), [grid, floor]);
  const standingStair = stairs.find(link => link.from.x === projection.host.x && link.from.y === projection.host.y);
  const stairDestination = standingStair ? tileAt(grid, standingStair.to.x, standingStair.to.y) : undefined;
  const canTakeStairs = state.minutes > 0 && stairDestination !== undefined
    && availableActions(state, projection, stairDestination).some(action => action.kind === 'move');
  const sourceRoom = camera.level === 'room' && camera.roomId ? roomById(camera.roomId) : undefined;

  const focusedRoom = sourceRoom ? floorPoint(sourceRoom) : undefined;
  const viewSelected = selected ? floorPoint(selected) : null;

  // What the drag is allowed to do is keep the board covering the window: its
  // left edge no further right than 0, its right edge no further left than the
  // window. Expressed as limits on the OFFSET that means subtracting the
  // placement the camera already chose, which is why these are not symmetric.
  const slackX = Math.max(0, board.width - board.viewportWidth);
  const floorHeight = board.height * FLOOR_VIEW.h / GRID_HEIGHT;
  const slackY = Math.max(0, floorHeight - board.viewportHeight);
  const pan = usePan(`${focusRevision}:${floor}:${camera.level}:${camera.wingId ?? ''}:${camera.roomId ?? ''}:${board.viewportWidth}:${board.viewportHeight}`, {
    minX: slackX === 0 ? 0 : board.viewportWidth - board.width - board.left,
    maxX: slackX === 0 ? 0 : -board.left,
    minY: slackY === 0 ? 0 : board.viewportHeight - floorHeight - board.top,
    maxY: slackY === 0 ? 0 : -board.top,
  });
  const selectedDecor = selected ? decorAt(decor, selected.x, selected.y) : undefined;
  const isPanned = Math.abs(pan.offset.x) + Math.abs(pan.offset.y) > 8;

  // Committed snacks are already in the projection; anything beyond the
  // committed count is still only planned, and is drawn faded.
  const committedSnackCount = state.snacks.length;
  const hostMoved = projection.host.x !== state.host.x || projection.host.y !== state.host.y;

  // Lights follow the projection, so flipping a switch lights the room while
  // the action is still only planned. That preview is most of the feedback.
  const lights = collectLights(projection.interactables.filter(visible), decor.filter(visible), projection.snacks.filter(visible)).map(floorPoint);
  const partyMode = projection.interactables.some(
    (item) => visible(item) && item.type === 'speaker' && item.state === 'on',
  );

  /** Turns a click anywhere on the board into the tile underneath it. */
  function pickTile(event: MouseEvent<HTMLDivElement>): void {
    // A click that merely ended a drag is not a click on a tile.
    if (pan.consumeDragClick()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_WIDTH);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_HEIGHT);
    const source = atlasPoint({ x, y }, floor);
    if (y >= 0 && y < FLOOR_VIEW.h && visibleOnFloor(source, floor)) onSelectTile(tileAt(grid, source.x, source.y) ?? null);
  }

  return (
    // The whole lot is always drawn; the camera decides which part of it lands
    // in the middle of the window and at what INTEGER scale (see useBoardView).
    // Zoomed in, the rest of the house is far larger than the viewport and
    // simply runs off every edge, which is what makes leaning into a room feel
    // continuous rather than like loading a different screen.
    <div
      ref={viewport}
      data-testid="play-surface"
      data-floor={floor}
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
        <TerrainCanvas grid={grid} floor={floor} />

        {/* One hit target for the whole floor, since the terrain is a canvas. */}
        <div className="absolute inset-0" onClick={pickTile} />

        {/* Reach and selection washes. Only a handful of elements, not a grid. */}
        {[...reachable].map((key) => {
          const [x, y] = key.split(',').map(Number);
          if (x === undefined || y === undefined || floorAt(x, y) !== floor) return null;
          const tile = tileAt(grid, x, y);
          const view = floorPoint({ x, y });
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTile(tile ?? null)}
              aria-label={
                tile ? `${placeAt(grid, x, y).name} at column ${view.x}, row ${view.y}` : `tile ${x}, ${y}`
              }
              className="absolute bg-cyan-200/15 ring-1 ring-cyan-200/60 ring-inset transition-colors hover:bg-cyan-200/30"
              style={{
                left: `${view.x * CELL_W}%`,
                top: `${view.y * CELL_H}%`,
                width: `${CELL_W}%`,
                height: `${CELL_H}%`,
              }}
            />
          );
        })}

        {selected && viewSelected && visible(selected) && (
          <div
            className="pointer-events-none absolute bg-white/20 ring-2 ring-white ring-inset"
            style={{
              left: `${viewSelected.x * CELL_W}%`,
              top: `${viewSelected.y * CELL_H}%`,
              width: `${CELL_W}%`,
              height: `${CELL_H}%`,
            }}
          />
        )}

        {/* Entities. Draw order is decor, snacks, objects, then people, so
            nobody is hidden behind the couch they are standing next to. */}
        <div className="pointer-events-none absolute inset-0">
          {decor.filter(visible).map((item) => (
            <DecorSprite key={item.id} item={floorPoint(item)} isSelected={selectedDecor?.id === item.id} />
          ))}

          {projection.snacks.map((snack, index) => (
            visible(snack) && <SnackSprite key={snack.id} snack={floorPoint(snack)} isPending={index >= committedSnackCount} />
          ))}

          {projection.interactables.filter(visible).map((item) => (
            <InteractableSprite
              key={item.id}
              item={floorPoint(item)}
              isSelected={
                selected !== null &&
                interactableAt(projection.interactables, selected.x, selected.y)?.id === item.id
              }
            />
          ))}

          {projection.guests.filter(visible).map((guest) => (
            <GuestSprite
              key={guest.id}
              guest={floorPoint(guest)}
              isSelected={
                selected !== null &&
                guestAt(projection.guests, selected.x, selected.y)?.id === guest.id
              }
            />
          ))}

          {/* Anything anyone said this hour, above the crowd but under the HUD. */}
          {projection.guests.filter(visible).map((guest) => (
            <SpeechBubble key={`say-${guest.id}`} guest={floorPoint(guest)} />
          ))}

          {/* Where you stand, and — if the plan moves you — where it leaves you. */}
          {hostMoved && visible(state.host) && <HostSprite at={floorPoint(state.host)} isGhost />}
          {visible(projection.host) && <HostSprite at={floorPoint(projection.host)} />}
        </div>

        {/* How the house is divided, and the way further in. Above the
            entities so the nameplates stay readable over a crowd, below the
            night so a dark room still reads as dark. */}
        {sections.length > 0 && <SectionOverlay sections={sections} onOpen={onMoveCamera} />}

        {/* Night, and the holes the lights punch in it. Above the entities so
            people are genuinely in shadow, below the menu so the UI stays legible. */}
        <LightingLayer lights={lights} partyMode={partyMode} />

        {focusedRoom && !isPanned && (
          <div className="pointer-events-none absolute z-20" aria-hidden="true"
            style={{ left: `${focusedRoom.x * CELL_W}%`, top: `${focusedRoom.y * CELL_H}%`,
              width: `${focusedRoom.w * CELL_W}%`, height: `${focusedRoom.h * CELL_H}%`,
              boxShadow: '0 0 0 9999px rgba(8,10,17,.44), inset 0 0 0 1px rgba(224,190,112,.55)' }} />
        )}

        <div className="pointer-events-none absolute inset-0 z-30">
          {stairs.map(stair => {
            const destination = floorInfo(stair.destination);
            const position = floorPoint(stair.from);
            const usable = projection.host.x === stair.from.x && projection.host.y === stair.from.y;
            return <button key={`${stair.from.x},${stair.from.y}:${stair.destination}`} type="button"
              className={`stair-marker stair-flight pointer-events-auto ${stair.walkout ? 'stair-walkout' : ''}`} data-stairs-to={stair.destination}
              aria-label={`${stair.walkout ? 'Walkout stairs' : 'Stairs'} to ${destination.name}`} title={usable ? `Take stairs to ${destination.name} (1 min)` : `Walk here for stairs to ${destination.name}`}
              style={{ left: `${position.x * CELL_W}%`, top: `${position.y * CELL_H}%`, width: `${CELL_W * (stair.walkout ? 1 : 2)}%`, height: `${CELL_H * (stair.walkout ? 1 : 2)}%` }}
              onClick={() => {
                const tile = tileAt(grid, usable ? stair.to.x : stair.from.x, usable ? stair.to.y : stair.from.y);
                if (!tile) return;
                if (usable) onTakeStairs(tile); else onSelectTile(tile);
              }}>
              <span className="stair-treads" aria-hidden="true" /><span className="stair-destination">{destination.level > floorInfo(floor).level ? '↑' : '↓'} {destination.number}</span>
            </button>;
          })}
        </div>

        {/* Menu layer sits above everything and takes its own clicks. */}
        <div className="pointer-events-none absolute inset-0 z-40">
          {selected && visible(selected) && menuOptions.length > 0 && state.phase === 'planning' && (
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
      {isPanned && (
        <button type="button" className="signplate absolute right-3 bottom-3 z-40 px-3 py-1.5 text-xs text-brass"
          onPointerDown={event => event.stopPropagation()} onClick={pan.reset}>
          Recenter view
        </button>
      )}
      {standingStair && state.phase === 'planning' && (
        <button type="button" disabled={!canTakeStairs}
          title={canTakeStairs ? undefined : 'The destination must be clear and unlocked, with at least one minute remaining.'}
          className="signplate absolute bottom-3 left-1/2 z-40 -translate-x-1/2 px-4 py-2 text-sm text-brass disabled:opacity-50"
          onPointerDown={event => event.stopPropagation()}
          onClick={() => {
            const tile = tileAt(grid, standingStair.to.x, standingStair.to.y);
            if (tile) onTakeStairs(tile);
          }}>
          Take stairs to {floorInfo(standingStair.destination).name} · 1 min
        </button>
      )}
    </div>
  );
}
