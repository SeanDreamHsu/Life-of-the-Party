import { useMemo } from 'react';
import { rasterise } from '../art/pixel';
import type { Art } from '../art';

interface PixelSpriteProps {
  art: Art;
  /** Sizing/positioning classes. The sprite fills whatever box you give it. */
  className?: string;
  /** Native tooltip. */
  title?: string;
  /** Screen-reader text, since the sprite itself is a background image. */
  label?: string;
}

/**
 * Draws a pixel sprite as a scaled background image.
 *
 * `image-rendering: pixelated` is the whole point: the source art is 32x32 and
 * the board cell is whatever the layout gives it, so the browser must upscale
 * with nearest-neighbour or the art turns to mush.
 */
export default function PixelSprite({ art, className = '', title, label }: PixelSpriteProps) {
  const url = useMemo(
    () => rasterise(art.cacheKey, art.grid, art.palette),
    [art.cacheKey, art.grid, art.palette],
  );

  return (
    <div
      className={className}
      title={title}
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    >
      {label !== undefined && <span className="sr-only">{label}</span>}
    </div>
  );
}
