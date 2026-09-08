import Panel from './Panel';
import { CAST, FAMILIARITY_STEPS } from '../game/cast';
import { placeAt } from '../data/rooms';
import { CAMERA_UNLOCK_TASKS } from '../game/actions';
import {
  INTERACTABLE_META,
  LURE_META,
  MUTATION_META,
  type Grid,
  type Guest,
  type Interactable,
  type Tile,
} from '../types/game';

interface RowProps {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
}

function Row({ label, value, tone = 'default' }: RowProps) {
  const toneClass =
    tone === 'good' ? 'text-moss' : tone === 'bad' ? 'text-oxblood-hi' : 'text-bone';
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] text-[0.82rem]">
      <span className="text-bone-dim italic">{label}</span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}

interface InspectorPanelProps {
  tile: Tile | null;
  /** Needed to name the room the selected tile belongs to. */
  grid: Grid;
  guest: Guest | undefined;
  item: Interactable | undefined;
  /** Whether to reveal hidden information. Off during real play. */
  showSecrets: boolean;
  /** Deliberate jobs done so far, which is what opens the surveillance PC. */
  tasksCompleted: number;
}

/**
 * What is on the tile under the cursor.
 *
 * `hiddenLure` is the whole deduction loop, so it is behind `showSecrets` and
 * off by default. It was visible for the whole build and was quietly giving the
 * game away.
 */
export default function InspectorPanel({
  tile,
  grid,
  guest,
  item,
  showSecrets,
  tasksCompleted,
}: InspectorPanelProps) {
  const place = tile ? placeAt(grid, tile.x, tile.y) : null;
  return (
    <Panel title="Close Inspection" {...(showSecrets ? { note: 'secrets shown' } : {})}>
      {!tile ? (
        <p className="py-1 text-[0.8rem] leading-snug text-bone-dim italic">
          Nothing selected. Click anywhere in the house.
        </p>
      ) : (
        <div>
          <p className="text-[0.95rem] font-bold text-bone">{place?.name}</p>
          {place?.blurb !== null && place?.blurb !== undefined && (
            <p className="mt-0.5 mb-1.5 text-[0.76rem] leading-snug text-brass italic">
              {place.blurb}
            </p>
          )}
          {place?.blurb === null && <div className="mb-1.5" />}

          <Row
            label="Can be walked"
            value={tile.isPassable ? 'yes' : 'no'}
            tone={tile.isPassable ? 'good' : 'bad'}
          />
          {tile.hasDoor && <Row label="Doorway" value="yes" />}

          {guest && (
            <div className="mt-2 border-t border-brass-dim/40 pt-1.5">
              <p className="text-[0.9rem] font-bold text-bone">{guest.name}</p>
              {CAST[guest.id] && (
                <p className="mt-0.5 mb-1.5 text-[0.76rem] leading-snug text-brass italic">
                  {CAST[guest.id]!.tagline}
                </p>
              )}
              <Row label="Condition" value={MUTATION_META[guest.mutationStage].label} />
              <Row label="Agitation" value={`${guest.agitationLevel} of 100`} />
              {/* Earned on camera, or handed over by the developer switch. The
                  first is the mechanic; the second is a debugging affordance. */}
              {(guest.profiled || showSecrets) && (
                <Row label="Drawn to" value={LURE_META[guest.hiddenLure].label} tone="bad" />
              )}
              {guest.profiled && (
                <p className="mt-0.5 text-[0.72rem] leading-snug text-moss italic">
                  On camera: {LURE_META[guest.hiddenLure].hint.toLowerCase()}
                </p>
              )}

              {/* What you have worked out about them by being nearby. This is
                  the reward for watching people instead of only herding them. */}
              {(() => {
                const profile = CAST[guest.id];
                if (!profile) return null;
                const known = FAMILIARITY_STEPS.filter((step) => guest.familiarity >= step).length;
                const total = profile.dossier.length;
                return (
                  <div className="mt-2 border-t border-brass-dim/30 pt-1.5">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="legend text-[0.8rem] font-bold">What you know</span>
                      <span className="text-[0.68rem] text-bone-dim italic">
                        {Math.min(known, total)} of {total}
                      </span>
                    </div>
                    {known === 0 ? (
                      <p className="text-[0.74rem] leading-snug text-bone-dim italic">
                        You have not spent enough of this party near {guest.name} to say.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {profile.dossier.slice(0, known).map((line) => (
                          <li key={line} className="text-[0.76rem] leading-snug text-bone">
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {item && (
            <div className="mt-2 border-t border-brass-dim/40 pt-1.5">
              <p className="mb-1 text-[0.9rem] font-bold text-bone">
                {INTERACTABLE_META[item.type].label}
              </p>
              <Row
                label="Currently"
                value={INTERACTABLE_META[item.type].stateLabels[item.state]}
                tone={item.state === 'on' ? 'good' : 'default'}
              />

              {item.type === 'pc' &&
                (tasksCompleted >= CAMERA_UNLOCK_TASKS ? (
                  <p className="mt-1 text-[0.74rem] leading-snug text-moss italic">
                    The feeds are yours. Ten minutes at the desk finds one more guest —
                    and leaves the screen throwing light into a room nobody may enter.
                  </p>
                ) : (
                  <>
                    <Row
                      label="Jobs done"
                      value={`${tasksCompleted} of ${CAMERA_UNLOCK_TASKS}`}
                      tone="bad"
                    />
                    <p className="mt-1 text-[0.74rem] leading-snug text-bone-dim italic">
                      It wants proof you are actually hosting. Steps do not count.
                    </p>
                  </>
                ))}
            </div>
          )}

          {!guest && !item && (
            <p className="mt-1.5 text-[0.76rem] text-bone-dim italic">Nothing here but the floor.</p>
          )}
        </div>
      )}
    </Panel>
  );
}
