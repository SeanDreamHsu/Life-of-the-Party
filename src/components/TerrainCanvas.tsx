import { useEffect, useRef } from 'react';
import { terrainArt } from '../art';
import { paintInto } from '../art/pixel';
import { TERRAIN_SIZE } from '../art/terrain';
import { GRID_HEIGHT, GRID_WIDTH } from '../data/houseMap';
import type { Grid } from '../types/game';

/**
 * The whole floor, composited onto one canvas.
 *
 * The lot is ~1000 tiles. As elements that is a thousand DOM nodes React has to
 * reconcile on every state change; as one canvas it is a single node painted
 * once, because terrain never changes after the map is built. The canvas is
 * kept at native pixel size (16px per tile) and stretched by CSS with
 * nearest-neighbour, so it stays sharp at any zoom.
 */
export default function TerrainCanvas({ grid }: { grid: Grid }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = GRID_WIDTH * TERRAIN_SIZE;
    const height = GRID_HEIGHT * TERRAIN_SIZE;
    canvas.width = width;
    canvas.height = height;

    const image = ctx.createImageData(width, height);
    for (const row of grid) {
      for (const tile of row) {
        const art = terrainArt(tile.kind, tile.x, tile.y);
        paintInto(image, art.grid, art.palette, tile.x * TERRAIN_SIZE, tile.y * TERRAIN_SIZE);
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [grid]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
