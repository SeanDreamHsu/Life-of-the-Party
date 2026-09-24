import { BUILDING_WIDTH, GRID_WIDTH, HOUSE_X, HOUSE_Y } from './houseMap';
import { STOREY_HEIGHT, type WingId } from './floorplan';
import type { Grid } from '../types/game';

export type FloorId = 'basement' | 'ground' | 'upper';
type Point = { x: number; y: number };

/** Every storey is drawn on the same foundation, with one shared camera scale. */
export const FLOOR_VIEW = { x: 0, y: 0, w: GRID_WIDTH, h: HOUSE_Y + STOREY_HEIGHT + 5 };
export const FLOORS = [
  { id: 'upper', level: 1, number: '02', name: 'Upper Floor', description: 'Bedrooms & bathroom', offset: STOREY_HEIGHT, bounds: FLOOR_VIEW },
  { id: 'ground', level: 0, number: '01', name: 'Ground Floor', description: 'Party rooms & garden', offset: 0, bounds: FLOOR_VIEW },
  { id: 'basement', level: -1, number: 'B1', name: 'Basement', description: 'Basement & rec room', offset: STOREY_HEIGHT * 2, bounds: FLOOR_VIEW },
] as const;

export function floorInfo(id: FloorId) { return FLOORS.find(floor => floor.id === id) ?? FLOORS[1]; }
export function floorForWing(wing: WingId | null): FloorId {
  return wing === 'back' ? 'upper' : wing === 'under' ? 'basement' : 'ground';
}
export function floorAt(_x: number, y: number): FloorId {
  if (y >= HOUSE_Y + STOREY_HEIGHT && y < HOUSE_Y + STOREY_HEIGHT * 2) return 'upper';
  if (y >= HOUSE_Y + STOREY_HEIGHT * 2 && y < HOUSE_Y + STOREY_HEIGHT * 3) return 'basement';
  return 'ground';
}

/** The atlas is never exposed as a long, flat house. Sprites retain native size. */
export function floorPoint<T extends Point>(point: T): T {
  const floor = floorAt(point.x, point.y);
  const offset = floor === 'ground' && point.y >= HOUSE_Y + STOREY_HEIGHT * 3
    ? STOREY_HEIGHT * 2 : floorInfo(floor).offset;
  return { ...point, y: point.y - offset };
}
export function atlasPoint(point: Point, floor: FloorId): Point {
  return { x: point.x, y: point.y + (floor === 'ground' && point.y >= HOUSE_Y + STOREY_HEIGHT
    ? STOREY_HEIGHT * 2 : floorInfo(floor).offset) };
}
export function visibleOnFloor(point: Point, floor: FloorId): boolean {
  return floorAt(point.x, point.y) === floor && (floor === 'ground'
    || (point.x >= HOUSE_X && point.x < HOUSE_X + BUILDING_WIDTH));
}

export interface StairLink {
  id: string;
  from: Point;
  to: Point;
  destination: FloorId;
  walkout?: boolean;
}
const at = (x: number, y: number): Point => ({ x: HOUSE_X + x, y: HOUSE_Y + y });
const CONNECTIONS = [
  { id: 'main-stairs', a: at(24, 22), b: at(24, 47) },
  { id: 'cellar-stairs', a: at(27, 22), b: at(27, 72) },
  { id: 'walkout', a: at(12, 74), b: at(12, 75), walkout: true },
] as const;

export function stairsOnFloor(_grid: Grid, floor: FloorId): StairLink[] {
  return CONNECTIONS.flatMap(connection => [
    { id: connection.id, from: connection.a, to: connection.b, destination: floorAt(connection.b.x, connection.b.y), walkout: 'walkout' in connection },
    { id: connection.id, from: connection.b, to: connection.a, destination: floorAt(connection.a.x, connection.a.y), walkout: 'walkout' in connection },
  ]).filter(link => floorAt(link.from.x, link.from.y) === floor);
}
export function stairBetween(from: Point, to: Point): boolean {
  return CONNECTIONS.some(({ a, b }) =>
    (a.x === from.x && a.y === from.y && b.x === to.x && b.y === to.y)
    || (b.x === from.x && b.y === from.y && a.x === to.x && a.y === to.y));
}

/** Orthogonal movement on this storey, plus explicitly authored stair links. */
export function floorNeighbours(grid: Grid, at: Point): Point[] {
  const floor = floorAt(at.x, at.y);
  const local = floorPoint(at);
  const candidates = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) =>
    atlasPoint({ x: local.x + dx!, y: local.y + dy! }, floor));
  const ordinary = candidates.filter(p => grid[p.y]?.[p.x] && visibleOnFloor(p, floor)
    && floorPoint(p).y >= 0 && floorPoint(p).y < FLOOR_VIEW.h);
  const stairs = stairsOnFloor(grid, floor).filter(link => link.from.x === at.x && link.from.y === at.y).map(link => link.to);
  return [...ordinary, ...stairs].filter((p, index, all) => all.findIndex(q => q.x === p.x && q.y === p.y) === index);
}
export function adjacentOnFloor(a: Point, b: Point): boolean {
  if (floorAt(a.x, a.y) !== floorAt(b.x, b.y)) return false;
  const pa = floorPoint(a), pb = floorPoint(b);
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) <= 1;
}
