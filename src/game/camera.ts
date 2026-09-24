import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import { ROOMS, WINGS, roomAt, roomById, wingBounds, type Room, type WingId } from '../data/rooms';
import { floorAt, floorNeighbours } from '../data/floors';
import type { Grid } from '../types/game';

/**
 * THE CAMERA
 *
 * The house is meant to get large, and a large house shown all at once is a
 * map rather than a place. So the board has three depths, and the player drills
 * down through them:
 *
 *   lot    the whole property, house and grounds. Where you plan.
 *   wing   one part of the house — the front, the hall, the back, the grounds.
 *   room   a single named room, filling the screen.
 *
 * Each level is defined by a FOCUS RECTANGLE in tiles, and the renderer's only
 * job is to put that rectangle in the middle of the viewport at the largest
 * whole-number scale that fits. Everything outside it keeps drawing and simply
 * runs off the edges, which is what makes zooming feel like leaning in rather
 * than loading a different screen.
 *
 * WHY THE LEVELS ARE DERIVED, NOT STORED. A camera holds ids, never rectangles.
 * Rooms move when the house is remodelled, and a stored rectangle would quietly
 * point at the wrong part of the map afterwards; an id cannot.
 */

export type CameraLevel = 'lot' | 'wing' | 'room';

export interface Camera {
  level: CameraLevel;
  /** Set at 'wing' and 'room'. */
  wingId: WingId | null;
  /** Set at 'room'. */
  roomId: string | null;
}

export const WHOLE_LOT: Camera = { level: 'lot', wingId: null, roomId: null };

/** Door thresholds borrow an adjacent room; outdoors uses the floor overview. */
export function cameraAtHost(grid: Grid, host: { x: number; y: number }): Camera {
  const floor = floorAt(host.x, host.y);
  const room = roomAt(host.x, host.y) ?? floorNeighbours(grid, host)
    .filter(point => floorAt(point.x, point.y) === floor)
    .map(point => roomAt(point.x, point.y)).find(candidate => candidate && candidate.wing !== 'grounds');
  return room && room.wing !== 'grounds'
    ? { level: 'room', wingId: room.wing, roomId: room.id } : WHOLE_LOT;
}

/** Whether two cameras frame the same place. */
export function sameCamera(a: Camera, b: Camera): boolean {
  return a.level === b.level && a.wingId === b.wingId && a.roomId === b.roomId;
}

export interface Focus {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Breathing room around a focused area, in tiles. Without it a room sits with
 * its walls flush against the screen edge and reads as cropped rather than
 * framed.
 */
const PADDING: Record<CameraLevel, number> = { lot: 0, wing: 1, room: 1 };

function padded(rect: Focus, level: CameraLevel): Focus {
  const pad = PADDING[level];
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

/** The rectangle the camera is looking at, in tiles. */
export function focusOf(camera: Camera): Focus {
  if (camera.level === 'room' && camera.roomId !== null) {
    const room = roomById(camera.roomId);
    if (room) return padded(room, 'room');
  }

  if (camera.level === 'wing' && camera.wingId !== null) {
    const bounds = wingBounds(camera.wingId);
    if (bounds) return padded(bounds, 'wing');
  }

  return { x: 0, y: 0, w: GRID_WIDTH, h: GRID_HEIGHT };
}

/** How much of a hall, in tiles, the view keeps around a host walking it. */
const HALL_WINDOW = 16;

/**
 * The halls run the width of the house, so framing a whole one needs the
 * whole floor's width, and on most laptop screens that only fits at half size.
 * While the host is in a hall the view frames the stretch around them instead,
 * sliding along as they walk. Null when the host is not in this room (or in a
 * doorway onto it) or the room is not a hall.
 */
export function hallFocus(room: Room, host: { x: number; y: number }): Focus | null {
  const pad = PADDING.room;
  const inside = host.x >= room.x - pad && host.x < room.x + room.w + pad
    && host.y >= room.y - pad && host.y < room.y + room.h + pad;
  if (!inside || room.h > 2) return null;
  const w = Math.min(HALL_WINDOW, room.w + pad * 2);
  const x = Math.min(Math.max(host.x - Math.floor(w / 2), room.x - pad), room.x + room.w + pad - w);
  return { x, y: room.y - pad, w, h: room.h + pad * 2 };
}

/**
 * Somewhere else you can go from here.
 *
 * Looking at the whole lot these are the wings; inside a wing they are its
 * rooms. Inside a ROOM they are every OTHER room — because the neighbours are
 * already half on screen at that zoom, and having to back out to the wing and
 * come down again just to step next door is a chore the view can spare you.
 * The room you are already in is left out: it fills the screen, so outlining
 * and labelling it says nothing you cannot see.
 *
 * Rooms far from the focus are still returned, and simply fall outside the
 * viewport — geometry does the filtering, so there is no visibility rule here
 * to keep in step with the renderer.
 */
export interface Section {
  id: string;
  name: string;
  blurb: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The camera this section opens when clicked. */
  target: Camera;
}

export function sectionsOf(camera: Camera): Section[] {
  if (camera.level === 'lot') {
    return WINGS.flatMap((wing) => {
      if (!wing.zoomable) return [];
      const bounds = wingBounds(wing.id);
      if (!bounds) return [];
      return [
        {
          id: wing.id,
          name: wing.name,
          blurb: wing.blurb,
          ...bounds,
          target: { level: 'wing' as const, wingId: wing.id, roomId: null },
        },
      ];
    });
  }

  const asSection = (room: Room): Section => ({
    id: room.id,
    name: room.name,
    blurb: room.blurb,
    x: room.x,
    y: room.y,
    w: room.w,
    h: room.h,
    target: { level: 'room', wingId: room.wing, roomId: room.id },
  });

  // A hidden room is deliberately absent from every list of places to go. It
  // is on the map and walkable; it is simply never advertised, which is the
  // only honest way to build a room somebody has to find for themselves.
  const listed = ROOMS.filter((room) => room.hidden !== true);

  if (camera.level === 'wing' && camera.wingId !== null) {
    const wingId = camera.wingId;
    return listed.filter((room) => room.wing === wingId).map(asSection);
  }

  if (camera.level === 'room') {
    return listed.filter((room) => room.id !== camera.roomId).map(asSection);
  }

  return [];
}

/** One step back out. From the lot there is nowhere further to go. */
export function zoomOut(camera: Camera): Camera {
  if (camera.level === 'room') {
    return { level: 'wing', wingId: camera.wingId, roomId: null };
  }
  return WHOLE_LOT;
}

export interface Crumb {
  label: string;
  camera: Camera;
  /** True for the level currently shown, which is not a link. */
  current: boolean;
}

/** The trail back out, e.g. The House › The Back of the House › Your Room. */
export function breadcrumbs(camera: Camera): Crumb[] {
  const trail: Crumb[] = [
    { label: 'The House', camera: WHOLE_LOT, current: camera.level === 'lot' },
  ];

  if (camera.wingId !== null) {
    const wing = WINGS.find((entry) => entry.id === camera.wingId);
    if (wing) {
      trail.push({
        label: wing.name,
        camera: { level: 'wing', wingId: wing.id, roomId: null },
        current: camera.level === 'wing',
      });
    }
  }

  if (camera.level === 'room' && camera.roomId !== null) {
    const room = roomById(camera.roomId);
    if (room) {
      trail.push({
        label: room.name,
        camera: { level: 'room', wingId: room.wing, roomId: room.id },
        current: true,
      });
    }
  }

  return trail;
}

/**
 * The camera that frames a particular tile — used to follow the action, so a
 * guest reaching the street or a room catching fire can pull the view to it.
 */
export function cameraForTile(x: number, y: number): Camera {
  const room: Room | undefined = ROOMS.find(
    (entry) => x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h,
  );
  if (!room) return WHOLE_LOT;
  return { level: 'room', wingId: room.wing, roomId: room.id };
}
