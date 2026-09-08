import { useState, type ReactNode } from 'react';
import PixelSprite from './PixelSprite';
import { emoteArt, furnitureArt, guestArt, terrainArt } from '../art';
import type { Guest } from '../types/game';

/**
 * THE LURE SANDBOX
 *
 * Reading "every guest is secretly drawn to one thing" teaches nobody anything.
 * Flipping a switch and watching a stranger walk the length of a hallway toward
 * it teaches it in four clicks — so the tutorial hands the player the actual
 * deduction loop in miniature before the real board ever asks them to run it.
 *
 * Deliberately ONE guest, ONE corridor, TWO switches. Every extra variable is a
 * second thing the learner has to hold while still learning the first. The
 * corridor also runs on a single axis rather than a grid, because that makes
 * "they stepped toward it" unmistakable rather than merely likely.
 */

/** Tiles in the corridor. Long enough that walking it takes real hours. */
const LANE = 9;
const SPEAKER_X = 0;
const LAMP_X = LANE - 1;
const START_X = 4;

const CELL = 100 / LANE;

/** The same overscan the board uses: a 32px sprite standing on a 16px tile. */
const OVERSCAN = 2;
const OFFSET = (OVERSCAN - 1) / 2;

/** Anyone within earshot dances — which is exactly why dancing is not a tell. */
const EARSHOT = 4;

/** A stranger. No name, no dossier, nothing to learn here but the one fact. */
function demoGuest(x: number, facing: 1 | -1, mood: Guest['mood'], dancing: boolean): Guest {
  return {
    id: 'guest-demo',
    name: 'A guest',
    x,
    y: 0,
    mutationStage: 1,
    hiddenLure: 'bass',
    hungry: false,
    agitationLevel: 20,
    facing,
    mood,
    dancing,
    saying: null,
    familiarity: 0,
    profiled: false,
  };
}

interface Beat {
  x: number;
  facing: 1 | -1;
  mood: Guest['mood'];
  line: string;
}

const OPENING: Beat = {
  x: START_X,
  facing: 1,
  mood: null,
  line: 'Nothing is running. Flip something on, end the hour, and watch what they do about it.',
};

export default function LureDemo() {
  const [speakerOn, setSpeakerOn] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [hour, setHour] = useState(0);
  const [beat, setBeat] = useState<Beat>(OPENING);

  const solved = beat.x === SPEAKER_X;
  const dancing = speakerOn && Math.abs(beat.x - SPEAKER_X) <= EARSHOT;
  const guest = demoGuest(beat.x, beat.facing, beat.mood, dancing);

  /** One resolution. Their lure is bass; everything else is scenery to them. */
  function endHour(): void {
    if (solved) return;
    setHour((h) => h + 1);

    if (speakerOn) {
      const x = Math.max(SPEAKER_X, beat.x - 1);
      setBeat({
        x,
        facing: -1,
        mood: x === SPEAKER_X ? 'note' : 'heart',
        line:
          x === SPEAKER_X
            ? 'They plant themselves in front of the speaker and stop pretending to listen to anyone. Heavy bass. Now you know.'
            : 'They turn toward the low end and take a step. Nobody asked them to.',
      });
      return;
    }

    if (lampOn) {
      // The wrong lure is not neutral. Something is running that is not for
      // them, and on the real board that is +2 agitation an hour, every hour.
      const drift = hour % 2 === 0 ? 1 : -1;
      setBeat({
        x: Math.min(LAMP_X - 1, Math.max(SPEAKER_X + 1, beat.x + drift)),
        facing: drift > 0 ? 1 : -1,
        mood: 'sweat',
        line: 'The lamp is on. They glance at it, shrug, and drift. Something is running that is not for them, and that grates.',
      });
      return;
    }

    setBeat({
      x: beat.x,
      facing: beat.facing,
      mood: 'sleep',
      line: 'Nothing is calling. They stay exactly where they are, which is inside your house.',
    });
  }

  function reset(): void {
    setSpeakerOn(false);
    setLampOn(false);
    setHour(0);
    setBeat({ ...OPENING, line: 'Back to hour one. Try the other switch first this time.' });
  }

  return (
    <div className="well p-2.5">
      {/* HEADROOM. A sprite box is two tiles tall against a one-tile lane, so
          every figure hangs half a tile past the floor in each direction — and
          without this margin they climb over the copy on either side. The
          padding is a percentage, which resolves against width, which is
          exactly how a tile's height is derived here. */}
      <div
        style={{
          padding: `${CELL * 0.85}% ${CELL / 2}% ${CELL / 2}%`,
        }}
      >
        {/* The corridor. One row of floorboards, a switch bolted to each end. */}
        <div className="relative w-full" style={{ aspectRatio: `${LANE} / 1` }}>
          <div className="absolute inset-0 flex">
            {Array.from({ length: LANE }, (_tile, x) => (
              <PixelSprite key={x} art={terrainArt('living', x, 0)} className="h-full flex-1" />
            ))}
          </div>

          <Fixture x={SPEAKER_X} art="speaker" on={speakerOn} glow="rgba(120,180,255,0.55)" />
          <Fixture x={LAMP_X} art="lamp" on={lampOn} glow="rgba(255,214,140,0.75)" />

          {/* The guest, positioned in percentages so they slide between tiles. */}
          <div
            className="absolute top-0 h-full transition-[left] duration-500 ease-out"
            style={{ left: `${guest.x * CELL}%`, width: `${CELL}%` }}
          >
            <Overscan>
              <div className={`absolute inset-0 ${dancing ? 'anim-dance' : 'anim-sway'}`}>
                <div className="h-full w-full" style={{ transform: `scaleX(${guest.facing})` }}>
                  <PixelSprite art={guestArt(guest)} className="h-full w-full" label="A guest" />
                </div>
              </div>

              {guest.mood && (
                <div
                  className="anim-emote pointer-events-none absolute"
                  style={{ left: '54%', top: '-4%', width: '38%', height: '38%' }}
                >
                  <PixelSprite
                    art={emoteArt(guest.mood)}
                    className="h-full w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  />
                </div>
              )}
            </Overscan>
          </div>
        </div>
      </div>

      {/* The narration, in the voice the real event log speaks in. */}
      <p
        className={`mt-2.5 min-h-[2.4rem] text-[0.82rem] leading-snug italic ${
          solved ? 'text-brass' : 'text-bone-dim'
        }`}
      >
        {beat.line}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSpeakerOn((on) => !on)}
          className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          aria-pressed={speakerOn}
        >
          Speaker: {speakerOn ? 'playing' : 'silent'}
        </button>
        <button
          type="button"
          onClick={() => setLampOn((on) => !on)}
          className="ghostbtn px-2.5 py-1 text-[0.78rem]"
          aria-pressed={lampOn}
        >
          Lamp: {lampOn ? 'lit' : 'dark'}
        </button>

        <div className="flex-1" />

        {solved ? (
          <button type="button" onClick={reset} className="ghostbtn px-3 py-1 text-[0.78rem]">
            Run it again
          </button>
        ) : (
          <button type="button" onClick={endHour} className="brassbtn px-3.5 py-1.5 text-[0.85rem]">
            End the hour
          </button>
        )}
      </div>

      {dancing && !solved && (
        <p className="mt-2 text-[0.75rem] leading-snug text-oxblood-hi">
          They are dancing — but everyone dances near live music, whatever they secretly want.
          Dancing is never the tell. Walking is.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The two-tiles-square box a 32px sprite occupies, centred on its own tile.
 * Anything else scales the art by a fraction of a tile and the pixels stop
 * being square, which is the one thing pixel art cannot survive.
 */
function Overscan({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${-OFFSET * 100}%`,
        top: `${-OFFSET * 100}%`,
        width: `${OVERSCAN * 100}%`,
        height: `${OVERSCAN * 100}%`,
      }}
    >
      {children}
    </div>
  );
}

interface FixtureProps {
  x: number;
  art: 'speaker' | 'lamp';
  on: boolean;
  glow: string;
}

/** A switchable object on the corridor, dimmed while it is off. */
function Fixture({ x, art, on, glow }: FixtureProps) {
  return (
    <div className="absolute top-0 h-full" style={{ left: `${x * CELL}%`, width: `${CELL}%` }}>
      <Overscan>
        {on && (
          <div
            className="absolute inset-[-25%]"
            style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 68%)` }}
          />
        )}
        <PixelSprite
          art={furnitureArt(art)}
          className="absolute inset-0 h-full w-full"
          label={`${art}, ${on ? 'on' : 'off'}`}
        />
        {!on && <div className="absolute inset-[12%] bg-shell/50" />}
      </Overscan>
    </div>
  );
}
