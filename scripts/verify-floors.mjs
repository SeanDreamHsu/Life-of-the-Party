import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', cacheDir: 'node_modules/.vite-audit', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { createInitialState, reducer, project, availableActions } = await server.ssrLoadModule('/src/game/state.ts');
  const { FLOOR_VIEW, FLOORS, floorAt, floorPoint, atlasPoint, visibleOnFloor, stairsOnFloor, floorNeighbours, stairBetween } = await server.ssrLoadModule('/src/data/floors.ts');
  const { distanceField } = await server.ssrLoadModule('/src/game/ai.ts');
  const { isWalkable } = await server.ssrLoadModule('/src/types/game.ts');
  const initial = createInitialState();
  const free = p => isWalkable(initial.grid, initial.decor, p.x, p.y);
  const key = p => `${p.x},${p.y}`;
  for (const floor of FLOORS) {
    assert.deepEqual(floor.bounds, FLOOR_VIEW);
    for (const row of initial.grid) for (const tile of row) {
      if (!visibleOnFloor(tile, floor.id)) continue;
      assert.deepEqual(atlasPoint(floorPoint(tile), floor.id), { x: tile.x, y: tile.y });
      for (const next of floorNeighbours(initial.grid, tile)) {
        if (floorAt(next.x, next.y) !== floor.id) assert.ok(stairBetween(tile, next), 'Only stairs cross storeys');
      }
    }
    for (const stairs of stairsOnFloor(initial.grid, floor.id)) {
      assert.ok(free(stairs.from) && free(stairs.to), `Clear landing: ${stairs.id}`);
      if (!stairs.walkout) assert.deepEqual(floorPoint(stairs.from), floorPoint(stairs.to), 'The stair flight aligns vertically');
      const state = { ...initial, host: stairs.from, guests: [] };
      const tile = initial.grid[stairs.to.y][stairs.to.x];
      const move = availableActions(state, project(state), tile).find(a => a.kind === 'move');
      assert.ok(move, `Can use ${stairs.id} from ${floor.id}`);
      const plan = reducer(state, { type: 'queueAction', option: move, tile });
      assert.deepEqual(project(plan).host, stairs.to);
      assert.equal(plan.minutes, state.minutes - 1);
      assert.deepEqual(plan.host, stairs.from, 'Planning does not commit the move');
      assert.deepEqual(project(reducer(plan, { type: 'undoLast' })).host, stairs.from);
      const committed = reducer(plan, { type: 'endTurn' });
      assert.deepEqual(committed.host, stairs.to);
      const occupied = { ...state, guests: [{ ...initial.guests[0], ...stairs.to }] };
      assert.ok(!availableActions(occupied, project(occupied), tile).some(a => a.kind === 'move'), 'Occupied landing prevents travel');
      assert.equal(reducer({ ...state, minutes: 0 }, { type: 'queueAction', option: move, tile }).queue.length, 0);
      const fields = distanceField(initial.grid, (x, y) => !free({ x, y }), [stairs.to]);
      assert.equal(fields.get(key(stairs.from)), 1, 'NPCs use the same one-step stair graph');
    }
  }
  // A playable route from the real host spawn to each storey and back to the street.
  const dist = distanceField(initial.grid, (x, y) => !free({ x, y }), [initial.host]);
  for (const guest of initial.guests) assert.ok(dist.has(key(guest)), `Reach ${guest.name}'s room`);
  const groundStairs = stairsOnFloor(initial.grid, 'ground').find(s => s.destination === 'upper');
  const blocked = new Set(initial.guests.map(key));
  const queue = [initial.host], parents = new Map([[key(initial.host), null]]);
  for (let i = 0; i < queue.length && !parents.has(key(groundStairs.from)); i++) {
    const point = queue[i];
    for (const next of floorNeighbours(initial.grid, point)) {
      if (!free(next) || blocked.has(key(next)) || parents.has(key(next))) continue;
      parents.set(key(next), point); queue.push(next);
    }
  }
  const path = []; let point = groundStairs.from;
  while (parents.get(key(point))) { path.unshift(point); point = parents.get(key(point)); }
  let state = initial;
  const keys = [];
  for (const next of path) {
    const before = floorPoint(project(state).host), after = floorPoint(next);
    const direction = after.x > before.x ? 'right' : after.x < before.x ? 'left' : after.y > before.y ? 'down' : 'up';
    keys.push(direction);
    state = reducer(state, { type: 'queueMove', direction });
    assert.deepEqual(project(state).host, next, 'Real keyboard route to the stairs is clear');
  }
  console.log('All three floor footprints align. Six directed stair trips pass planning, commit, undo, occupancy, minute costs and NPC routing. All guests remain reachable.');
  console.log(`Playtest route to upper stairs: ${keys.join(', ')}`);
} finally { await server.close(); }
