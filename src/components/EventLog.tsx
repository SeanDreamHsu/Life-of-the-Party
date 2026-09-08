import { useEffect, useRef } from 'react';

interface EventLogProps {
  entries: readonly string[];
}

/**
 * The night's ledger.
 *
 * Set like a page rather than a console: serif, generous leading, hour headings
 * in small caps with a brass rule. Earlier lines fade back so the eye lands on
 * what just happened without the log having to shout.
 */
export default function EventLog({ entries }: EventLogProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries.length]);

  return (
    <section className="plate px-4 pt-2 pb-3">
      <header className="mb-1.5">
        <h2 className="legend text-[0.95rem] leading-none font-bold">The Night So Far</h2>
        <hr className="rule mt-1.5" />
      </header>

      <div ref={scroller} className="max-h-[7.5rem] overflow-y-auto pr-1">
        {entries.map((entry, index) => {
          const isHeading = entry.startsWith('—');
          const isLast = index === entries.length - 1;

          if (isHeading) {
            return (
              <p
                key={`${index}-${entry}`}
                className="legend mt-2 mb-1 text-[0.78rem] font-bold first:mt-0"
              >
                {entry.replaceAll('—', '').trim()}
                <span className="ml-2 inline-block h-px w-10 align-middle bg-brass-dim" />
              </p>
            );
          }

          return (
            <p
              key={`${index}-${entry}`}
              className={[
                'text-[0.84rem] leading-[1.45]',
                isLast ? 'text-bone' : 'text-bone-dim',
              ].join(' ')}
            >
              {entry}
            </p>
          );
        })}
      </div>
    </section>
  );
}
