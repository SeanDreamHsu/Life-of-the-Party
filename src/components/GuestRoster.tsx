import Panel from './Panel';
import PixelSprite from './PixelSprite';
import { guestArt } from '../art';
import { CAST } from '../game/cast';
import { LURE_META, MUTATION_META, type Guest, type MutationStage } from '../types/game';

interface GuestRosterProps {
  guests: readonly Guest[];
  selectedGuestId: string | null;
  /** Names of everyone who has already left, in the order they went. */
  departed: readonly string[];
}

/** How each stage is written on the list — a verdict, not a status code. */
const STANDING: Record<MutationStage, string> = {
  0: 'still themselves',
  1: 'not doing well',
  2: 'turning',
  3: 'gone',
};

/** The agitation bar runs bone → oxblood as someone comes apart. */
function agitationFill(level: number): string {
  if (level >= 70) return 'linear-gradient(180deg,#c94a3a,#6b1616)';
  if (level >= 40) return 'linear-gradient(180deg,#d08a2a,#6d4410)';
  return 'linear-gradient(180deg,#7d9a52,#3c4d24)';
}

/** Who is still in the house, and how close each one is to turning. */
export default function GuestRoster({ guests, selectedGuestId, departed }: GuestRosterProps) {
  return (
    <Panel title="The Guest List" note={`${guests.length} in · ${departed.length} out`}>
      <ul>
        {guests.map((guest, index) => {
          const meta = MUTATION_META[guest.mutationStage];
          const selected = guest.id === selectedGuestId;
          return (
            <li
              key={guest.id}
              className={[
                'flex items-center gap-2.5 py-2',
                index > 0 ? 'border-t border-brass-dim/30' : '',
                selected ? 'bg-brass/10' : '',
              ].join(' ')}
            >
              {/* Portrait, sunk into the plate like a locket. */}
              <PixelSprite
                art={guestArt(guest)}
                className={`well h-10 w-9 shrink-0 ${selected ? 'ring-1 ring-brass' : ''}`}
                label={`${guest.name} portrait`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.95rem] leading-tight font-bold text-bone">
                    {guest.name}
                  </span>
                  <span className="text-[0.7rem] text-bone-dim italic">
                    {STANDING[guest.mutationStage]}
                  </span>
                </div>

                <div className="well mt-1.5 h-2 w-full overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{
                      width: `${guest.agitationLevel}%`,
                      background: agitationFill(guest.agitationLevel),
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22)',
                    }}
                  />
                </div>

                <p className="mt-0.5 text-[0.7rem] leading-snug text-brass/75 italic">
                  {CAST[guest.id]?.tagline}
                </p>

                <div className="mt-0.5 text-[0.68rem] text-bone-dim">
                  <span className="italic">{meta.label}</span>
                  <span className="mx-1 text-brass-dim">·</span>
                  <span>agitation {guest.agitationLevel}</span>
                  {/* Anyone the cameras have worked out carries it on the list,
                      so the payoff is visible without opening the inspector. */}
                  {guest.profiled && (
                    <>
                      <span className="mx-1 text-brass-dim">·</span>
                      <span className="text-moss">{LURE_META[guest.hiddenLure].label}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {departed.length > 0 && (
        <p className="mt-2 border-t border-brass-dim/40 pt-2 text-[0.74rem] text-moss italic">
          Shown out: {departed.join(', ')}.
        </p>
      )}
    </Panel>
  );
}
