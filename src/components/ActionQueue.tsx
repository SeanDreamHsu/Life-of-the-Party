import Panel from './Panel';
import { formatMinutes, type QueuedAction } from '../game/actions';

interface ActionQueueProps {
  queue: readonly QueuedAction[];
  /** Minutes left in the hour after everything queued. May be negative. */
  minutes: number;
  /** Minutes the hour started with. */
  budget: number;
  onUndo: () => void;
  onClear: () => void;
}

/**
 * The plan for this hour, in the order it will happen.
 *
 * Nothing here has happened yet — that is what makes undo possible and why the
 * board shows a ghost of the host rather than moving them. Numbered like a
 * written order of service, because that is what it is.
 */
export default function ActionQueue({ queue, minutes, budget, onUndo, onClear }: ActionQueueProps) {
  const spent = budget - minutes;

  return (
    <Panel
      title="Your Intentions"
      note={spent > 0 ? `${formatMinutes(spent)} spent` : 'nothing yet'}
    >
      {queue.length === 0 ? (
        <p className="py-1 text-[0.8rem] leading-snug text-bone-dim italic">
          Use WASD or arrow keys to plan a move (1 min per tile), or click a tile beside you.
        </p>
      ) : (
        <>
          <ol className="mb-2.5">
            {queue.map((action, index) => (
              <li
                key={action.id}
                className={[
                  'flex items-baseline gap-2 py-1.5 text-[0.84rem]',
                  index > 0 ? 'border-t border-brass-dim/30' : '',
                ].join(' ')}
              >
                <span className="w-4 shrink-0 text-right text-brass-dim">{index + 1}.</span>
                <span className="flex-1 text-bone">{action.label}</span>
                <span className="text-[0.7rem] text-bone-dim italic">
                  {formatMinutes(action.cost)}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex gap-2">
            <button type="button" onClick={onUndo} className="ghostbtn flex-1 py-1 text-[0.82rem]">
              Take it back
            </button>
            <button type="button" onClick={onClear} className="ghostbtn flex-1 py-1 text-[0.82rem]">
              Start over
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
