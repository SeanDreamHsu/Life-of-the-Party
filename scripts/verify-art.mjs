import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Reuse Vite's TypeScript loader; the audit needs no browser or extra test dependency.
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', cacheDir: 'node_modules/.vite-audit', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const art = await server.ssrLoadModule('/src/art/index.ts');
  const { auditLayout } = await server.ssrLoadModule('/src/data/auditLayout.ts');
  const { auditFloorPlan } = await server.ssrLoadModule('/src/data/floorplan.ts');
  const { auditHouseMap } = await server.ssrLoadModule('/src/data/houseMap.ts');
  const { frameBoard } = await server.ssrLoadModule('/src/game/framing.ts');
  const { focusOf } = await server.ssrLoadModule('/src/game/camera.ts');
  const { TERRAIN_SIZE } = await server.ssrLoadModule('/src/art/terrain.ts');
  const { auditRooms, ROOMS, roomAt } = await server.ssrLoadModule('/src/data/rooms.ts');
  const { createInitialState, reducer, project, availableActions } = await server.ssrLoadModule('/src/game/state.ts');
  const { isWalkable } = await server.ssrLoadModule('/src/types/game.ts');
  const { floorNeighbours } = await server.ssrLoadModule('/src/data/floors.ts');
  const initial = createInitialState();
  assert.ok(reducer(initial, { type: 'endTurn' }).log.includes('You stood in the foyer and did nothing.'), 'Idle narration follows the new host starting room');
  const problems = [...art.auditAllSprites(), ...auditLayout(), ...auditFloorPlan(), ...auditHouseMap(), ...auditRooms(initial.grid)];
  assert.deepEqual(problems, [], problems.join('\n'));
  for (const person of [initial.host, ...initial.guests]) {
    assert.ok(isWalkable(initial.grid, initial.decor, person.x, person.y), `Blocked spawn at ${person.x},${person.y}`);
  }
  for (const piece of initial.decor) {
    assert.ok(!['cups', 'pizzabox', 'punchbowl', 'balloon'].includes(piece.art), 'Decorative clutter belongs on a surface');
    const room = roomAt(piece.x, piece.y);
    if (room && ['main-hall', 'back-landing'].includes(room.id)) {
      assert.ok(piece.floorSize || ['painting', 'cobweb'].includes(piece.art), 'Corridors stay clear of floor-standing furniture');
    }
  }
  for (const person of [initial.host, ...initial.guests]) {
    assert.ok(!initial.interactables.some(item => item.x === person.x && item.y === person.y), 'An actor cannot spawn on an appliance');
  }
  // Every camera focus, including the complete lot, fits the stage below the HUD.
  const cameras = [{ level: 'lot', wingId: null, roomId: null }, ...ROOMS.filter(r => !r.hidden && r.wing !== 'grounds').map(r => ({ level: 'room', wingId: r.wing, roomId: r.id }))];
  for (const [width, height] of [[600, 568], [952, 480], [1400, 760], [355, 390]]) {
    for (const camera of cameras) {
      const focus = focusOf(camera);
      const view = frameBoard(focus, width, height);
      const x = view.left + focus.x * TERRAIN_SIZE * view.scale;
      const y = view.top + focus.y * TERRAIN_SIZE * view.scale;
      assert.ok(x >= -.5 && y >= -.5 && x + focus.w * TERRAIN_SIZE * view.scale <= width + .5 && y + focus.h * TERRAIN_SIZE * view.scale <= height + .5, `Camera clips ${camera.roomId ?? 'lot'} at ${width}x${height}`);
    }
  }
  // Every person needs their own silhouette, independent of palette.
  assert.equal(new Set(initial.guests.map(g => art.poseArt(g.id, 0).grid.join(''))).size, 12);
  assert.notDeepEqual(art.hostArt().grid, art.poseArt('guest-gary', 0).grid);
  for (const guest of initial.guests) {
    assert.notDeepEqual(art.guestArt(guest, 'step-a').grid, art.guestArt(guest, 'step-b').grid);
  }
  // Rearranging solid furniture must leave legal, deterministic simultaneous turns.
  let state = initial;
  let moves = 0;
  for (let i = 0; i < 24; i += 1) {
    const before = state;
    state = reducer(before, { type: 'endTurn' });
    assert.deepEqual(state, reducer(before, { type: 'endTurn' }));
    assert.equal(new Set(state.guests.map(g => `${g.x},${g.y}`)).size, state.guests.length);
    for (const g of state.guests) {
      assert.ok(isWalkable(state.grid, state.decor, g.x, g.y));
      const was = before.guests.find(p => p.id === g.id);
      const distance = Math.abs(g.x - was.x) + Math.abs(g.y - was.y);
      assert.ok(distance === 0 || floorNeighbours(state.grid, was).some(p => p.x === g.x && p.y === g.y), 'One legal floor or stair step per hour');
      moves += Number(distance > 0);
    }
    state = reducer(state, { type: 'resolutionComplete' });
  }
  // Planning and undo still leave the committed host and guests untouched.
  const tile = initial.grid[initial.host.y][initial.host.x + 1];
  const move = availableActions(initial, project(initial), tile).find(a => a.kind === 'move');
  assert.ok(move);
  const queued = reducer(initial, { type: 'queueAction', option: move, tile });
  assert.deepEqual(queued.host, initial.host);
  assert.deepEqual(queued.guests, initial.guests);
  assert.notDeepEqual(project(queued).host, initial.host);
  assert.deepEqual(project(reducer(queued, { type: 'undoLast' })).host, initial.host);
  // Keyboard movement follows the projected plan, obeys blockers and stops at
  // the hour boundary even when held keys deliver more input than is affordable.
  const keyboardMove = reducer(initial, { type: 'queueMove', direction: 'right' });
  assert.deepEqual(project(keyboardMove).host, project(queued).host);
  assert.equal(keyboardMove.minutes, initial.minutes - 1);
  assert.deepEqual(project(reducer(keyboardMove, { type: 'undoLast' })).host, initial.host);
  const occupied = { ...initial, guests: [...initial.guests, { ...initial.guests[0], id: 'blocking-guest', x: tile.x, y: tile.y }] };
  assert.equal(reducer(occupied, { type: 'queueMove', direction: 'right' }), occupied);
  const resolving = { ...initial, phase: 'resolution' };
  assert.equal(reducer(resolving, { type: 'queueMove', direction: 'right' }), resolving);
  const atEdge = { ...initial, host: { x: 0, y: 0 } };
  assert.equal(reducer(atEdge, { type: 'queueMove', direction: 'left' }), atEdge);
  let keyboardPlan = initial;
  for (let i = 0; i < initial.minutes + 4; i += 1) {
    keyboardPlan = reducer(keyboardPlan, { type: 'queueMove', direction: i % 2 === 0 ? 'right' : 'left' });
  }
  assert.equal(keyboardPlan.minutes, 0);
  assert.equal(keyboardPlan.queue.length, initial.minutes);
  assert.deepEqual(project(keyboardPlan).host, initial.host);
  console.log('Keyboard movement: projected steps, undo, occupied tiles, map edges, resolution lock and minute limit pass.');
  console.log(`All art/layout/map audits pass. 12 unique guests + host; 24 deterministic turns; ${moves} legal moves; queue/undo, clear corridors, and camera framing pass.`);
} finally {
  await server.close();
}
