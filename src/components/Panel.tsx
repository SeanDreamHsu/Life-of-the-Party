import { type ReactNode } from 'react';

interface PanelProps {
  title: string;
  /** Optional right-aligned note in the header, e.g. a count. */
  note?: string;
  children: ReactNode;
}

/**
 * A stained-wood plate with a brass rule under its heading.
 *
 * The heading is small-caps rather than letter-spaced uppercase on purpose:
 * tracked-out micro-caps are the house style of settings screens, and this is
 * meant to look like something screwed to the wall of the house you are in.
 */
export default function Panel({ title, note, children }: PanelProps) {
  return (
    <section className="plate px-3 pt-2 pb-2.5">
      <header className="mb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="legend text-[0.95rem] leading-none font-bold">{title}</h2>
          {note && <span className="text-[0.72rem] text-bone-dim italic">{note}</span>}
        </div>
        <hr className="rule mt-1.5" />
      </header>
      {children}
    </section>
  );
}
