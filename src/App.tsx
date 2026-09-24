import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import FloorSelector from './components/FloorSelector';
import { floorNeighbours, floorAt, floorForWing, floorInfo, type FloorId } from './data/floors';
import ActionQueue from './components/ActionQueue';
import CameraBar from './components/CameraBar';
import EventLog from './components/EventLog';
import GameBoard from './components/GameBoard';
import GuestRoster from './components/GuestRoster';
import HowToPlay from './components/HowToPlay';
import InspectorPanel from './components/InspectorPanel';
import SpriteGallery from './components/SpriteGallery';
import TopBar from './components/TopBar';
import PlaytestFeedback from './components/PlaytestFeedback';
import Settings from './components/Settings';
import { readFocusKey, saveFocusKey } from './settings/shortcuts';
import { auditAllSprites } from './art';
import { auditLayout } from './data/auditLayout';
import { auditHouseMap } from './data/houseMap';
import { auditFloorPlan } from './data/floorplan';
import { auditRooms, ROOMS } from './data/rooms';
import { cameraAtHost, WHOLE_LOT, zoomOut, type Camera } from './game/camera';
import {
  availableActions,
  createInitialState,
  doorKey,
  project,
  reducer,
  type ActionOption,
  type Msg,
} from './game/state';
import { guestAt, interactableAt, type Guest, type Interactable, type Tile } from './types/game';

/** How long the board sits locked in the Resolution Phase before handing back. */
const RESOLUTION_MS = 820;

/** Set once the player has been shown the tutorial, so it opens exactly once. */
const TUTORIAL_SEEN_KEY = 'lotp:tutorial-seen';

const MOVE_KEYS: Record<string, Extract<Msg, { type: 'queueMove' }>['direction']> = {
  w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
};

/**
 * Whether this is somebody's first night. Wrapped because storage throws
 * outright in a few contexts (private windows, embedded previews), and a help
 * screen is not worth taking the whole game down over.
 */
function isFirstVisit(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SEEN_KEY) === null;
  } catch {
    return true;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [activeFloor, setActiveFloor] = useState<FloorId>('ground');
  const [showGallery, setShowGallery] = useState(false);
  const [focusKey, setFocusKey] = useState(readFocusKey);
  const [focusRevision, setFocusRevision] = useState(0);
  const [showPanels, setShowPanels] = useState(true);
  const [showSecrets, setShowSecrets] = useState(false);
  // How far into the house we are looking. A view concern, so it lives here
  // rather than in the reducer — zooming is not a move and must not be undoable.
  const [camera, setCamera] = useState<Camera>(WHOLE_LOT);
  // A new player should not have to find the help screen; it finds them.
  const [showTutorial, setShowTutorial] = useState(isFirstVisit);

  const chooseFloor = useCallback((floor: FloorId): void => {
    setActiveFloor(floor);
    setCamera(WHOLE_LOT);
    dispatch({ type: 'selectTile', tile: null });
  }, []);

  function closeTutorial(): void {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    } catch {
      /* Storage is unavailable; the tutorial simply opens again next time. */
    }
  }

  // A mis-typed pixel row, a ragged map row and two chairs sharing a tile all
  // produce silent corruption — nothing throws, the board just looks wrong. So
  // shout about all three on boot rather than shipping a skewed house.
  useEffect(() => {
    const problems = [
      ...auditFloorPlan(),
      ...auditAllSprites(),
      ...auditHouseMap(),
      ...auditLayout(),
      ...auditRooms(state.grid),
    ];
    if (problems.length > 0) {
      console.error(`Art audit found ${problems.length} problem(s):\n${problems.join('\n')}`);
    } else {
      console.info('Audit: floor plan, sprites, map, furnishing and rooms are all valid.');
    }
  }, []);

  // Escape steps back out one level, which is the gesture everybody tries
  // first in anything that zooms.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      setCamera((current) => (current.level === 'lot' ? current : zoomOut(current)));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (state.phase !== 'resolution') return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'resolutionComplete' }), RESOLUTION_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.turn]);

  const projection = useMemo(() => project(state), [state]);
  const hostFloor = floorAt(projection.host.x, projection.host.y);
  const focusHost = useCallback(() => {
    setActiveFloor(hostFloor);
    setCamera(cameraAtHost(state.grid, projection.host));
    setFocusRevision(value => value + 1);
    dispatch({ type: 'selectTile', tile: null });
  }, [hostFloor, state.grid, projection.host]);
  const previousHostFloor = useRef(hostFloor);
  useEffect(() => {
    // Browsing another floor is free. Only an actual host crossing changes the
    // view automatically, including undoing a planned stair move.
    if (previousHostFloor.current !== hostFloor) chooseFloor(hostFloor);
    previousHostFloor.current = hostFloor;
  }, [hostFloor, chooseFloor]);

  useEffect(() => {
    function onMoveKey(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (showTutorial || showGallery || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;
      if (event.key.toLowerCase() === focusKey) {
        event.preventDefault();
        if (!event.repeat) focusHost();
        return;
      }
      const direction = MOVE_KEYS[event.key.toLowerCase()];
      if (!direction) return;
      event.preventDefault();
      if (activeFloor !== hostFloor) { chooseFloor(hostFloor); return; }
      dispatch({ type: 'queueMove', direction });
    }
    window.addEventListener('keydown', onMoveKey);
    return () => window.removeEventListener('keydown', onMoveKey);
  }, [showTutorial, showGallery, activeFloor, hostFloor, chooseFloor, focusKey, focusHost]);

  const menuOptions = useMemo(
    () => (state.selected ? availableActions(state, projection, state.selected) : []),
    [state, projection],
  );

  /** Every tile the host could act on from where the plan leaves them. */
  const reachable = useMemo(() => {
    const keys = new Set<string>();
    if (state.phase !== 'planning') return keys;

    for (const point of floorNeighbours(state.grid, projection.host)) {
      const tile = state.grid[point.y]?.[point.x];
      if (tile && availableActions(state, projection, tile).length > 0) keys.add(doorKey(tile.x, tile.y));
    }
    return keys;
  }, [state, projection]);

  const selectedGuest: Guest | undefined = state.selected
    ? guestAt(projection.guests, state.selected.x, state.selected.y)
    : undefined;

  const selectedItem: Interactable | undefined = state.selected
    ? interactableAt(projection.interactables, state.selected.x, state.selected.y)
    : undefined;

  function takeStairs(tile: Tile): void {
    const option = availableActions(state, projection, tile).find(action => action.kind === 'move');
    if (option) dispatch({ type: 'queueAction', option, tile });
  }

  function chooseAction(option: ActionOption): void {
    if (!state.selected) return;
    dispatch({ type: 'queueAction', option, tile: state.selected });
  }

  return (
    // The board is the page. Everything else is furniture bolted over it.
    <div className="game-shell fixed inset-0 overflow-hidden" data-panels={showPanels}>
      <div className="game-stage">
      <div className="floor-scene">
      <GameBoard
        floor={activeFloor}
        onTakeStairs={takeStairs}
        state={state}
        projection={projection}
        reachable={reachable}
        camera={camera}
        focusRevision={focusRevision}
        onMoveCamera={setCamera}
        menuOptions={menuOptions}
        onSelectTile={(tile) => dispatch({ type: 'selectTile', tile })}
        onChooseAction={chooseAction}
      />
      </div>
      <div className="floor-caption" role="status">{floorInfo(activeFloor).name}</div>
      {activeFloor !== hostFloor && <button type="button" className="floor-return ghostbtn"
        onClick={() => chooseFloor(hostFloor)}>Return to host · {floorInfo(hostFloor).name}</button>}
      </div>

      {/* HUD. Click-through except on the plates themselves, so the board
          underneath stays fully clickable in the gaps between them. */}
      <div className="pointer-events-none absolute inset-0 z-50">
        <FloorSelector active={activeFloor} hostFloor={hostFloor} guests={projection.guests} onSelect={chooseFloor} />
        {/* Top left: the sign over the door, then the instrument panel. */}
        <div className="game-header pointer-events-auto">
          <div className="signplate px-4 py-2">
            <h1 className="legend text-[1.5rem] leading-none font-bold text-brass">
              Life of the Party
            </h1>
            <p className="mt-1 text-[0.78rem] text-bone-dim italic">
              Everyone out. Nobody hurt. Nobody calls it in.
            </p>
          </div>

          <CameraBar camera={camera} floorName={floorInfo(activeFloor).name} onMove={setCamera} />


        </div>

        {/* Top right: small controls, out of the way. */}
        <div className="game-tools pointer-events-auto">
          <PlaytestFeedback state={state} />
          <button type="button" className="ghostbtn px-2.5 py-1 text-[0.78rem]"
            onClick={focusHost} title={`Focus on the host’s room (${focusKey.toUpperCase()})`}>
            Focus host · {focusKey.toUpperCase()}
          </button>
          <Settings focusKey={focusKey} onChangeFocusKey={key => {
            setFocusKey(key);
            return saveFocusKey(key);
          }} />
          <select
            aria-label="View a room"
            value={camera.roomId ?? ''}
            onChange={(event) => {
              const room = ROOMS.find(candidate => candidate.id === event.target.value && (!candidate.hidden || candidate.id === camera.roomId));
              setCamera(room ? { level: 'room', wingId: room.wing, roomId: room.id } : WHOLE_LOT);
            }}
            className="ghostbtn max-w-[160px] px-2 py-1 text-[0.78rem]"
          >
            <option value="">Whole floor</option>
            {ROOMS.filter(room => (!room.hidden || room.id === camera.roomId) && room.wing !== 'grounds' && floorForWing(room.wing) === activeFloor).map(room => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            // The title becomes the accessible name, so it has to contain the
            // visible label rather than replace it.
            title="How to play — the rules, in seven short cards"
            className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          >
            How to play
          </button>
          <button
            type="button"
            onClick={() => setShowSecrets((on) => !on)}
            title="Reveal what each guest is secretly drawn to"
            className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          >
            {showSecrets ? 'Hide secrets' : 'Secrets'}
          </button>
          <button
            type="button"
            onClick={() => setShowPanels((open) => !open)}
            className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          >
            {showPanels ? 'Hide panels' : 'Show panels'}
          </button>
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          >
            Sprite sheet
          </button>
        </div>

        <div className="game-instruments pointer-events-auto">
          <TopBar state={state} projectedSuspicion={projection.suspicion}
            onEndTurn={() => dispatch({ type: 'endTurn' })} />
        </div>

        {showPanels && (
          <>
            {/* Right rail: what you consult while planning. */}
            <aside className="game-rail pointer-events-auto">
              <ActionQueue
                queue={state.queue}
                minutes={state.minutes}
                budget={state.budget}
                onUndo={() => dispatch({ type: 'undoLast' })}
                onClear={() => dispatch({ type: 'clearQueue' })}
              />
              <InspectorPanel
                tile={state.selected}
                grid={state.grid}
                guest={selectedGuest}
                item={selectedItem}
                showSecrets={showSecrets}
                tasksCompleted={state.jobsDone.length}
              />
              <EventLog entries={state.log} />
              <GuestRoster
                guests={projection.guests.filter(guest => floorAt(guest.x, guest.y) === activeFloor)}
                selectedGuestId={selectedGuest?.id ?? null}
                departed={state.departed}
              />
            </aside>
          </>
        )}
      </div>

      {showTutorial && <HowToPlay onClose={closeTutorial} />}

      {showGallery && (
        <div className="absolute inset-0 z-[60] overflow-y-auto bg-shell/95 p-5">
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => setShowGallery(false)}
              className="ghostbtn mb-3 px-3 py-1 text-[0.82rem]"
            >
              Back to the house
            </button>
            <SpriteGallery />
          </div>
        </div>
      )}
    </div>
  );
}
