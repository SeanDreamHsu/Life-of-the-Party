import { useEffect, useMemo, useReducer, useState } from 'react';
import ActionQueue from './components/ActionQueue';
import CameraBar from './components/CameraBar';
import EventLog from './components/EventLog';
import GameBoard from './components/GameBoard';
import GuestRoster from './components/GuestRoster';
import HowToPlay from './components/HowToPlay';
import InspectorPanel from './components/InspectorPanel';
import SpriteGallery from './components/SpriteGallery';
import TopBar from './components/TopBar';
import { auditAllSprites } from './art';
import { auditLayout } from './data/auditLayout';
import { auditHouseMap } from './data/houseMap';
import { auditFloorPlan } from './data/floorplan';
import { auditRooms } from './data/rooms';
import { WHOLE_LOT, zoomOut, type Camera } from './game/camera';
import {
  availableActions,
  createInitialState,
  doorKey,
  project,
  reducer,
  type ActionOption,
} from './game/state';
import { guestAt, interactableAt, isAdjacent, type Guest, type Interactable } from './types/game';

/** How long the board sits locked in the Resolution Phase before handing back. */
const RESOLUTION_MS = 420;

/** Set once the player has been shown the tutorial, so it opens exactly once. */
const TUTORIAL_SEEN_KEY = 'lotp:tutorial-seen';

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
  const [showGallery, setShowGallery] = useState(false);
  const [showPanels, setShowPanels] = useState(true);
  const [showSecrets, setShowSecrets] = useState(false);
  // How far into the house we are looking. A view concern, so it lives here
  // rather than in the reducer — zooming is not a move and must not be undoable.
  const [camera, setCamera] = useState<Camera>(WHOLE_LOT);
  // A new player should not have to find the help screen; it finds them.
  const [showTutorial, setShowTutorial] = useState(isFirstVisit);

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
      if (event.key !== 'Escape') return;
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

  const menuOptions = useMemo(
    () => (state.selected ? availableActions(state, projection, state.selected) : []),
    [state, projection],
  );

  /** Every tile the host could act on from where the plan leaves them. */
  const reachable = useMemo(() => {
    const keys = new Set<string>();
    if (state.phase !== 'planning') return keys;

    for (const row of state.grid) {
      for (const tile of row) {
        if (!isAdjacent(projection.host.x, projection.host.y, tile.x, tile.y)) continue;
        if (availableActions(state, projection, tile).length > 0) {
          keys.add(doorKey(tile.x, tile.y));
        }
      }
    }
    return keys;
  }, [state, projection]);

  const selectedGuest: Guest | undefined = state.selected
    ? guestAt(projection.guests, state.selected.x, state.selected.y)
    : undefined;

  const selectedItem: Interactable | undefined = state.selected
    ? interactableAt(projection.interactables, state.selected.x, state.selected.y)
    : undefined;

  function chooseAction(option: ActionOption): void {
    if (!state.selected) return;
    dispatch({ type: 'queueAction', option, tile: state.selected });
  }

  return (
    // The board is the page. Everything else is furniture bolted over it.
    <div className="fixed inset-0 overflow-hidden">
      <GameBoard
        state={state}
        projection={projection}
        reachable={reachable}
        camera={camera}
        onMoveCamera={setCamera}
        menuOptions={menuOptions}
        onSelectTile={(tile) => dispatch({ type: 'selectTile', tile })}
        onChooseAction={chooseAction}
      />

      {/* HUD. Click-through except on the plates themselves, so the board
          underneath stays fully clickable in the gaps between them. */}
      <div className="pointer-events-none absolute inset-0 z-50">
        {/* Top left: the sign over the door, then the instrument panel. */}
        <div className="pointer-events-auto absolute top-4 left-4 flex flex-col items-start gap-2.5">
          <div className="signplate px-4 py-2">
            <h1 className="legend text-[1.5rem] leading-none font-bold text-brass">
              Life of the Party
            </h1>
            <p className="mt-1 text-[0.78rem] text-bone-dim italic">
              Everyone out. Nobody hurt. Nobody calls it in.
            </p>
          </div>

          <CameraBar camera={camera} onMove={setCamera} />

          <TopBar
            state={state}
            projectedSuspicion={projection.suspicion}
            onEndTurn={() => dispatch({ type: 'endTurn' })}
          />
        </div>

        {/* Top right: small controls, out of the way. */}
        <div className="pointer-events-auto absolute top-4 right-4 flex gap-2">
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

        {showPanels && (
          <>
            {/* Right rail: what you consult while planning. */}
            <aside className="pointer-events-auto absolute top-[4.6rem] right-4 bottom-4 flex w-[264px] flex-col gap-2.5 overflow-y-auto">
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
              <GuestRoster
                guests={projection.guests}
                selectedGuestId={selectedGuest?.id ?? null}
                departed={state.departed}
              />
            </aside>

            {/* Bottom left: the ledger. */}
            <div className="pointer-events-auto absolute bottom-4 left-4 w-[min(460px,42vw)]">
              <EventLog entries={state.log} />
            </div>
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
