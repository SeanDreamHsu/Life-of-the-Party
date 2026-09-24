import type { PixelGrid } from '../pixel';
import { FURNITURE } from './furniture';

function overlay(base: PixelGrid, x: number, y: number, detail: PixelGrid): PixelGrid {
  const rows = base.map(row => [...row]);
  detail.forEach((row, dy) => [...row].forEach((ink, dx) => {
    const target = rows[y + dy];
    if (target && ink !== '.') target[x + dx] = ink;
  }));
  return rows.map(row => row.join(''));
}

/** Plates belong on the tabletop, rather than occupying another floor tile. */
const TABLE_SET = overlay(FURNITURE.table, 8, 10, [
  '.III......III...', 'IEEII....IEEII..', 'IEiiI....IEiiI..', '.III..RR..III...',
  '......pR........', '...y..RR..y.....', '...y......y.....',
]);

/** North-facing seats keep the theater looking at its screen, not its door. */
const COUCH_BACK: PixelGrid = Array.from({ length: 32 }, (_, y) => {
  if (y < 6 || y > 27) return '.'.repeat(32);
  if (y === 27) return '..' + 'n'.repeat(28) + '..';
  if (y > 24) return '....WWW..................WWW....';
  if (y === 6 || y === 24) return '..' + 'C'.repeat(28) + '..';
  if (y === 7) return '..C' + 'l'.repeat(26) + 'C..';
  if (y === 22 || y === 23) return '..C' + 'C'.repeat(26) + 'C..';
  return '..Cl' + 'c'.repeat(12) + 'C' + 'c'.repeat(11) + 'CC..';
});
const CHAIR_BACK: PixelGrid = Array.from({ length: 32 }, (_, y) => {
  if (y < 9 || y > 28) return '.'.repeat(32);
  if (y === 28) return '........' + 'n'.repeat(16) + '........';
  if (y > 24) return '.........WW..........WW.........';
  if (y === 9 || y === 24) return '........' + 'W'.repeat(16) + '........';
  if (y === 10) return '........W' + 'y'.repeat(14) + 'W........';
  return '........WyRrrrrrrrrrrRWw........';
});

/** Edge-to-edge segments form one long banquet table on a two-tile lattice. */
const BANQUET_TABLE = overlay(Array.from({ length: 32 }, (_, y) => {
  if (y < 8 || y > 27) return '.'.repeat(32);
  if (y === 8) return 'y'.repeat(32);
  if (y === 9 || y === 19) return 'W'.repeat(32);
  if (y > 19 && y < 26) return '...WWw....................WWw...';
  if (y >= 26) return '...nnnnnnnnnnnnnnnnnnnnnnnnnn...';
  if (y === 13 || y === 14) return 'I'.repeat(32);
  return 'w'.repeat(32);
}), 5, 10, [
  '.III...............III.', 'IEEII.............IEEII', 'IEiiI.............IEiiI',
  '.III...............III.', '..........pR..........', '..........RR..........',
]);

export const ROOM_PIECES = { tableSet: TABLE_SET, banquetTable: BANQUET_TABLE, couchBack: COUCH_BACK, chairBack: CHAIR_BACK } as const;
