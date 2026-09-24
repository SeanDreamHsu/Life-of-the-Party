import { formatMinutes } from '../game/actions';
import type { GameState } from '../game/state';

interface TopBarProps {
  state: GameState;
  /** Suspicion including everything currently queued but not yet committed. */
  projectedSuspicion: number;
  onEndTurn: () => void;
}

/** The party started on hour fifty-two. Turns are hours. */
const OPENING_HOUR = 52;

const NUMERALS = ['—', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'] as const;

/** Suspicion is a person, not a percentage. Name what is about to happen. */
function suspicionVerdict(value: number): string {
  if (value >= 85) return 'someone is dialling';
  if (value >= 60) return 'curtains are twitching';
  if (value >= 35) return 'they have noticed';
  return 'nobody minds yet';
}

/** Keeps the dial fill inside its track when the hour has been overrun. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function gaugeColour(value: number): string {
  if (value >= 85) return 'var(--color-oxblood-hi)';
  if (value >= 60) return '#d08a2a';
  if (value >= 35) return '#c8a24a';
  return 'var(--color-moss)';
}

/**
 * The vitals bar.
 *
 * Reads as one instrument rather than four cards: the night, then the hour
 * burning down, then the noise gauge, then the lever. The hour is a dial rather
 * than a row of pips because it is now a continuous quantity you can overdraw —
 * pips cannot show a debt, a dial hatched in oxblood can.
 */
export default function TopBar({ state, projectedSuspicion, onEndTurn }: TopBarProps) {
  const resolving = state.phase === 'resolution';
  const pending = Math.max(0, projectedSuspicion - state.suspicion);
  const hour = OPENING_HOUR + state.turn - 1;

  /** Past the end of the hour: everything from here is borrowed from the next. */
  const overdrawn = state.minutes < 0;

  const carryNote =
    state.carry > 0
      ? `+${state.carry} banked last hour`
      : state.carry < 0
        ? `${state.carry} owed from last hour`
        : null;

  return (
    <div className="plate instrument-strip">
      {/* The night */}
      <div className="instrument-night flex flex-col justify-center">
        <div className="legend text-[1.05rem] leading-none font-bold whitespace-nowrap">
          Night {NUMERALS[state.day] ?? state.day}
        </div>
        <div className="mt-1 text-[0.74rem] text-bone-dim italic">hour {hour} of the party</div>
      </div>

      <div className="w-px bg-gradient-to-b from-transparent via-brass-dim to-transparent" />

      {/* The hour, as a dial burning down. */}
      <div className="flex flex-col justify-center px-1">
        <div className="mb-1 flex items-baseline gap-2 whitespace-nowrap">
          <span
            className="text-[0.94rem] leading-none font-bold"
            style={{ color: overdrawn ? 'var(--color-oxblood-hi)' : 'var(--color-bone)' }}
          >
            {overdrawn ? `${formatMinutes(state.minutes)} over` : formatMinutes(state.minutes)}
          </span>
          <span className="text-[0.72rem] text-bone-dim italic">
            of {formatMinutes(state.budget)}
          </span>
        </div>

        {/* Sixty tick marks would be noise; twelve five-minute blocks read as a
            clock face laid flat, and each queued action visibly eats some. */}
        <div className="well relative h-3.5 w-[132px] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-200"
            style={{
              width: `${clamp01(state.minutes / state.budget) * 100}%`,
              background: 'linear-gradient(180deg,#efd489,#b8892c)',
              boxShadow: 'inset 0 1px 0 rgba(255,244,214,.8)',
            }}
          />
          {/* Time already borrowed from the next hour, hatched in oxblood. */}
          {overdrawn && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(201,74,58,.9) 0 4px, rgba(201,74,58,.4) 4px 8px)',
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 flex justify-between">
            {Array.from({ length: 11 }, (_tick, index) => (
              <span key={index} className="ml-[8.33%] w-px bg-black/40" />
            ))}
          </div>
        </div>

        {carryNote !== null && (
          <div
            className="mt-1 text-[0.7rem] italic"
            style={{ color: state.carry < 0 ? 'var(--color-oxblood-hi)' : 'var(--color-moss)' }}
          >
            {carryNote}
          </div>
        )}
      </div>

      <div className="w-px bg-gradient-to-b from-transparent via-brass-dim to-transparent" />

      {/* The gauge */}
      <div className="instrument-suspicion flex flex-col justify-center">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="legend text-[0.9rem] leading-none font-bold">Suspicion</span>
          <span className="instrument-verdict text-[0.72rem] text-bone-dim italic">{suspicionVerdict(projectedSuspicion)}</span>
        </div>

        <div className="well relative h-3.5 w-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-300"
            style={{
              width: `${state.suspicion}%`,
              background: `linear-gradient(180deg, ${gaugeColour(state.suspicion)}, rgba(0,0,0,.45))`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28)',
            }}
          />
          {/* What this turn's plan will add, hatched ahead of the filled bar. */}
          {pending > 0 && (
            <div
              className="absolute inset-y-0 transition-[left,width] duration-200"
              style={{
                left: `${state.suspicion}%`,
                width: `${pending}%`,
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(201,74,58,.85) 0 4px, rgba(201,74,58,.35) 4px 8px)',
              }}
            />
          )}
          {/* Tick marks, so the gauge reads as an instrument with a scale. */}
          <div className="pointer-events-none absolute inset-0 flex justify-between px-[12.5%]">
            {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
              <span key={tick} className="w-px bg-black/45" />
            ))}
          </div>
        </div>

        <div className="mt-1 flex items-baseline gap-2 text-[0.72rem]">
          <span className="text-bone">{state.suspicion}%</span>
          {pending > 0 && <span className="text-oxblood-hi">+{pending} from this plan</span>}
        </div>
      </div>

      <div className="w-px bg-gradient-to-b from-transparent via-brass-dim to-transparent" />

      {/* The lever */}
      <button
        type="button"
        onClick={onEndTurn}
        disabled={resolving}
        className="brassbtn my-auto px-5 py-2 text-[1rem] font-bold whitespace-nowrap"
      >
        {resolving ? 'Resolving…' : 'End the Hour'}
      </button>
    </div>
  );
}
