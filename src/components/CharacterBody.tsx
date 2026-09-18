import PixelSprite from './PixelSprite';
import { personArt } from '../art';
import type { CharacterDirection, CharacterFrame } from '../art/sprites/people';
import type { MutationStage } from '../types/game';

interface Props {
  id: string;
  stage: MutationStage;
  moving?: boolean;
  dancing?: boolean;
  direction?: CharacterDirection;
  facing?: number;
  phase?: number;
  label: string;
}

const IDLES = ['anim-breathe', 'anim-sway', 'anim-twitch', 'anim-jitter'] as const;

/** CSS flips between cached pixel frames; no per-person animation timers or rerenders. */
export default function CharacterBody({ id, stage, moving = false, dancing = false, direction = 'front', facing = 1, phase = 0, label }: Props) {
  const activity = moving ? 'walking' : dancing ? 'dancing' : 'idle';
  const frames: readonly CharacterFrame[] = moving ? ['step-a', 'step-b'] : dancing ? ['dance-a', 'dance-b'] : ['idle', 'blink'];
  return (
    <div className={`character-body ${moving ? 'anim-walk' : dancing ? 'anim-dance' : IDLES[stage]}`}
      style={{ animationDelay: moving ? '0s' : `-${phase}s` }} role="img" aria-label={label}>
      <div className={`character-frames character-${activity}`} style={{ transform: `scaleX(${facing})` }} aria-hidden="true">
        {frames.map((frame, i) => (
          <div key={`${activity}-${i}`} className={`character-frame character-frame-${i}`}
            style={{ animationDelay: moving ? '0s' : `-${phase}s` }}>
            <PixelSprite art={personArt(id, stage, frame, direction)} className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
