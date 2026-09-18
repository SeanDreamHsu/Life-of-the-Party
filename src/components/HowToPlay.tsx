import { useEffect, useState, type ReactNode } from 'react';
import LureDemo from './LureDemo';
import PixelSprite from './PixelSprite';
import { emoteArt, foodArt, furnitureArt, poseArt, terrainArt } from '../art';
import {
  ACTION_MINUTES,
  CAMERA_UNLOCK_TASKS,
  formatMinutes,
  MINUTES_PER_TURN,
} from '../game/actions';
import { LURE_META, MUTATION_META, type LureType, type MutationStage } from '../types/game';
import type { EmoteId } from '../art/sprites/emotes';
import type { PropId } from '../art/sprites/catalog';

/**
 * HOW TO PLAY
 *
 * A tutorial nobody reads is worse than none, so this is built as seven short
 * cards rather than one wall of rules: a player can land on any card, learn one
 * whole idea, and leave. Chapter four hands them the deduction loop to actually
 * play with, because the hidden lure is the only rule in this game that cannot
 * be taught by a sentence.
 *
 * Every number quoted here is imported or mirrored from the systems that own
 * it, so the tutorial cannot quietly drift out of date when the economy is
 * retuned — which is the usual fate of a hand-written help screen.
 */

interface Chapter {
  id: string;
  /** Shown on the stepper. Short enough to sit in a row of seven. */
  tab: string;
  title: string;
  /** The one-line promise of the card, in the game's own voice. */
  standfirst: string;
  body: ReactNode;
}

/* ------------------------------------------------------------- small parts */

interface CostProps {
  label: string;
  /** Minutes off the hour. */
  minutes: number;
  suspicion: number;
  note: string;
  danger?: boolean;
}

function Cost({ label, minutes, suspicion, note, danger = false }: CostProps) {
  return (
    <li
      className={`flex items-baseline gap-3 border-b border-brass-dim/25 py-1.5 last:border-0 ${
        danger ? 'text-oxblood-hi' : ''
      }`}
    >
      <span className={`w-[9.5rem] shrink-0 font-bold ${danger ? '' : 'text-bone'}`}>{label}</span>
      <span className="w-[3.4rem] shrink-0 text-[0.8rem] tabular-nums text-brass">
        {minutes} min
      </span>
      <span className="w-[4.6rem] shrink-0 text-[0.8rem] tabular-nums">
        {suspicion === 0 ? (
          <span className="text-moss">no noise</span>
        ) : (
          <span className={suspicion >= 9 ? 'text-oxblood-hi' : 'text-bone-dim'}>
            +{suspicion} susp.
          </span>
        )}
      </span>
      <span className="text-[0.8rem] leading-snug text-bone-dim italic">{note}</span>
    </li>
  );
}

/** A framed pixel object, the way the sprite sheet presents one. */
function Chip({ art, size = 'h-9 w-9' }: { art: PropId; size?: string }) {
  return (
    <span className="well inline-flex shrink-0 items-center justify-center p-0.5">
      <PixelSprite art={furnitureArt(art)} className={size} label={art} />
    </span>
  );
}

function LureCard({ type, art, tell }: { type: LureType; art: PropId | null; tell: string }) {
  const meta = LURE_META[type];
  return (
    <div className="plate flex items-start gap-2.5 px-2.5 py-2">
      {art ? (
        <Chip art={art} />
      ) : (
        <span className="well inline-flex h-10 w-10 shrink-0 items-center justify-center text-[1.3rem] text-bone-dim">
          —
        </span>
      )}
      <div className="min-w-0">
        <div className="legend text-[0.88rem] leading-none font-bold">{meta.label}</div>
        <div className="mt-1 text-[0.78rem] leading-snug text-bone-dim italic">{tell}</div>
      </div>
    </div>
  );
}

const MOOD_MEANING: Record<EmoteId, string> = {
  heart: 'Got exactly what they wanted this hour. Whatever you just did, it was for them.',
  note: 'Dancing. Everyone near live music dances — this one means nothing.',
  food: 'Gone hunting the kitchen on their own. They are past mingling.',
  sleep: 'Nothing is calling them. Bored people do not leave.',
  sweat: 'Agitation is climbing. Something is running that is not for them.',
  alert: 'Being driven out of a room by noise. Effective, and it costs them.',
  anger: 'Nearly at their breaking point. Push once more and they turn early.',
  skull: 'Feral. There is no lure left that reaches them.',
};

function Mood({ id }: { id: EmoteId }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="well inline-flex shrink-0 items-center justify-center p-1">
        <PixelSprite art={emoteArt(id)} className="h-6 w-6" label={id} />
      </span>
      <span className="text-[0.79rem] leading-snug text-bone-dim">{MOOD_MEANING[id]}</span>
    </li>
  );
}

function Stage({ stage }: { stage: MutationStage }) {
  const meta = MUTATION_META[stage];
  return (
    <li className="flex flex-col items-center gap-1.5">
      <span className={`well p-1 ring-2 ${meta.ringClass}`}>
        <PixelSprite
          art={poseArt('guest-demo', stage)}
          className={`h-14 w-14 ${['anim-breathe', 'anim-sway', 'anim-twitch', 'anim-jitter'][stage]}`}
          label={meta.label}
        />
      </span>
      <span className="legend text-[0.76rem] leading-none font-bold whitespace-nowrap">
        {meta.label}
      </span>
    </li>
  );
}

/** A numbered instruction, for the opening-move card. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 rotate-45 items-center justify-center border border-brass-dim bg-gradient-to-br from-[#efd489] to-[#b8892c]">
        <span className="-rotate-45 text-[0.8rem] font-bold text-[#2a1c0c]">{n}</span>
      </span>
      <span className="text-[0.86rem] leading-snug text-bone">{children}</span>
    </li>
  );
}

/** A pull-quote in brass. Reserved for the one idea per card worth stealing. */
function Aside({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-brass-dim bg-black/25 py-1.5 pr-2 pl-3 text-[0.84rem] leading-snug text-brass">
      {children}
    </p>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="text-[0.92rem] leading-relaxed text-bone">{children}</p>;
}

function Body({ children }: { children: ReactNode }) {
  return <p className="text-[0.86rem] leading-relaxed text-bone-dim">{children}</p>;
}

/* ---------------------------------------------------------------- chapters */

const CHAPTERS: Chapter[] = [
  {
    id: 'situation',
    tab: 'The house',
    title: 'It is hour fifty-two',
    standfirst: 'Twelve people are still in your house, and they are not getting better.',
    body: (
      <div className="space-y-3">
        <Lede>
          Nobody has gone home. Somewhere around hour thirty the party stopped being a party and
          started being a condition. Your guests are slowly turning: hungover, then strange, then
          destructive. You would like them out of your house before the neighbours work out what is
          happening in it.
        </Lede>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="plate px-2.5 py-2">
            <div className="legend text-[0.86rem] leading-none font-bold text-moss">You win</div>
            <p className="mt-1.5 text-[0.79rem] leading-snug text-bone-dim">
              Every guest walks off the lot under their own power. They reach the street, they are
              gone, and you did not have to touch a single one of them.
            </p>
          </div>
          <div className="plate px-2.5 py-2">
            <div className="legend text-[0.86rem] leading-none font-bold text-oxblood-hi">
              You lose
            </div>
            <p className="mt-1.5 text-[0.79rem] leading-snug text-bone-dim">
              Suspicion reaches 100 and somebody outside finally picks up a phone. Or you hurt
              someone getting them out, which is its own kind of losing.
            </p>
          </div>
          <div className="plate px-2.5 py-2">
            <div className="legend text-[0.86rem] leading-none font-bold">The catch</div>
            <p className="mt-1.5 text-[0.79rem] leading-snug text-bone-dim">
              You cannot carry anyone anywhere. You can only make your house a place they would
              rather not be, and make outside a place they would rather go.
            </p>
          </div>
        </div>

        <p className="text-[0.82rem] leading-snug text-bone-dim">
          Choose Ground Floor, Upper Floor or Basement in the floor panel to look around.
          Each floor sits above the same footprint. To travel, walk onto a staircase and
          press its “Take stairs” button. The trip costs one minute and can be undone.
        </p>

        <Aside>
          This is not a game about beating people out of a house. It is a game about arranging a
          house until leaving is the most appealing thing in it.
        </Aside>
      </div>
    ),
  },

  {
    id: 'hour',
    tab: 'The hour',
    title: 'An hour of your life',
    standfirst: 'You plan the whole hour. Then everybody moves at once.',
    body: (
      <div className="space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="plate px-3 py-2.5">
            <div className="legend text-[0.92rem] leading-none font-bold">1 — You plan</div>
            <hr className="rule mt-1.5 mb-2" />
            <p className="text-[0.82rem] leading-snug text-bone-dim">
              You get <span className="text-bone">{MINUTES_PER_TURN} minutes</span> an hour, and
              everything costs some of them. Click any tile{' '}
              <span className="text-bone">next to where you are standing</span> and a small menu
              opens with everything you could do to it, and what it will take.
            </p>
            <p className="mt-2 text-[0.82rem] leading-snug text-bone-dim">
              Nothing you pick actually happens yet. It joins a queue on the right, and you can take
              any of it back until you commit. Plan badly on purpose. It is free.
            </p>
          </div>

          <div className="plate px-3 py-2.5">
            <div className="legend text-[0.92rem] leading-none font-bold">2 — The house answers</div>
            <hr className="rule mt-1.5 mb-2" />
            <p className="text-[0.82rem] leading-snug text-bone-dim">
              Press <span className="text-brass">End the Hour</span>. Your entire plan lands first —
              every switch, every snack, every step. Only then does each guest look at the house you
              just made and take <span className="text-bone">one step</span>.
            </p>
            <p className="mt-2 text-[0.82rem] leading-snug text-bone-dim">
              They all decide against the same snapshot and move together. Nobody gets to react to
              anybody else's move, including yours.
            </p>
          </div>
        </div>

        <Aside>
          Because your plan lands before they think, you can switch the speaker on and walk away in
          the same hour. They hear it on your way out the door.
        </Aside>

        <div className="space-y-1.5">
          <Body>
            <span className="text-bone">Two things the board tells you while you plan.</span> Tiles
            you can reach are washed in pale blue — if a tile is not lit, walk closer first. And the
            Suspicion gauge grows a red hatched section showing exactly what your plan will cost you
            the moment you commit it. If that hatching looks expensive, undo something.
          </Body>
          <Body>
            One more: <span className="text-bone">your body is a wall.</span> Guests cannot walk
            through you. Standing in a doorway shuts that doorway for the hour, for free.
          </Body>
        </div>
      </div>
    ),
  },

  {
    id: 'costs',
    tab: 'The cost',
    title: 'What things cost',
    standfirst: 'Sixty minutes an hour. Some of them are loud.',
    body: (
      <div className="space-y-3">
        <Body>
          Every action costs minutes, and most of them also cost you a little quiet. The clock
          resets every hour; Suspicion never does. Treat noise as a budget for the whole night and
          time as a budget for the hour — and remember you are allowed to overspend either.
        </Body>

        <ul className="plate px-3 py-1.5">
          <Cost
            label="Move here"
            minutes={ACTION_MINUTES.move}
            suspicion={0}
            note="One tile. Sixty of them is the whole hour, and nothing else."
          />
          <Cost
            label="Place snack"
            minutes={ACTION_MINUTES.snack}
            suspicion={0}
            note="Silent, and it calms whoever takes it. Your best tool."
          />
          <Cost
            label="Lock / unlock door"
            minutes={ACTION_MINUTES.door}
            suspicion={1}
            note="Seals a route completely. Guests will not path through it."
          />
          <Cost
            label="Flip a switch"
            minutes={ACTION_MINUTES.toggle}
            suspicion={2}
            note="Speaker, fridge or lamp. This is how you steer people."
          />
          <Cost
            label="Nudge someone"
            minutes={ACTION_MINUTES.nudge}
            suspicion={3}
            note="Shifts them one tile away from you. Adds 8 agitation."
          />
          <Cost
            label="Shove someone"
            minutes={ACTION_MINUTES.shove}
            suspicion={9}
            danger
            note="Two tiles, 22 agitation, and the only action that can end your night badly."
          />
        </ul>

        {/* The hour is a ledger, not a wall — this is the part that changes how
            you play, so it gets its own framed callout rather than a footnote. */}
        <div className="plate border-l-2 border-brass px-3 py-2.5">
          <div className="legend text-[0.92rem] leading-none font-bold">
            The hour carries over
          </div>
          <hr className="rule mt-1.5 mb-2" />
          <p className="text-[0.82rem] leading-snug text-bone-dim">
            You are allowed to <span className="text-bone">start anything you have a minute left
            for</span>. Begin an {formatMinutes(ACTION_MINUTES.nudge)} conversation with two minutes
            on the clock and you will finish it — but the next hour opens six minutes short.
          </p>
          <p className="mt-2 text-[0.82rem] leading-snug text-bone-dim">
            It works the other way too. An hour you barely touch{' '}
            <span className="text-moss">banks the remainder</span> for the next one. A quiet hour
            spent watching is how you afford a loud one later — but the house keeps rotting while
            you watch, so nothing about waiting is free.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="plate flex items-start gap-2.5 px-2.5 py-2">
            <span className="well inline-flex shrink-0 p-0.5">
              <PixelSprite art={foodArt('pizza')} className="h-9 w-9" label="pizza" />
            </span>
            <p className="text-[0.79rem] leading-snug text-bone-dim">
              Food on the floor pulls exactly like an open fridge, costs nothing in noise, and takes
              four points off the agitation of whoever eats it. It is also gone once eaten.
            </p>
          </div>
          <div className="plate flex items-start gap-2.5 px-2.5 py-2">
            <span className="well inline-flex h-10 w-10 shrink-0 items-center justify-center text-[1.1rem] text-oxblood-hi">
              !
            </span>
            <p className="text-[0.79rem] leading-snug text-bone-dim">
              Hands are the expensive way to move somebody: loud, and it winds them up so they turn
              sooner. Shoving is for the last tile of the lawn, not the first room of the house.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: 'lures',
    tab: 'The pull',
    title: 'Everybody wants something',
    standfirst: 'One hidden appetite each. The game will never simply tell you.',
    body: (
      <div className="space-y-3">
        <Body>
          Every guest spawns drawn to exactly one thing, and you are never shown which. You find out
          the way you would at a real party: you change something, and you watch who turns.
        </Body>

        <div className="grid gap-2 sm:grid-cols-2">
          <LureCard type="bass" art="speaker" tell="Walks toward any speaker that is playing." />
          <LureCard
            type="food"
            art="fridge"
            tell="Walks toward an open fridge — or anything edible left on the floor."
          />
          <LureCard type="light" art="lamp" tell="Walks toward any lamp that is lit." />
          <LureCard
            type="quiet"
            art={null}
            tell="Wants an absence, not a place. Walks away from noise, so noise is how you steer them."
          />
        </div>

        <Aside>
          Run one lure at a time. Switch on three things and the whole house moves at once, and you
          have learned nothing about anybody.
        </Aside>

        <div>
          <div className="legend mb-1.5 text-[0.88rem] font-bold">Try it — this stranger wants one of them</div>
          <LureDemo />
        </div>

        {/* The one shortcut past all of the above, and what it costs. */}
        <div className="border-t border-brass-dim/40 pt-2.5">
          <div className="legend mb-1.5 flex items-baseline gap-2 text-[0.88rem] font-bold">
            <PixelSprite art={furnitureArt('pc')} className="well h-8 w-8 shrink-0" label="" />
            <span>There is one shortcut. It is in your bedroom.</span>
          </div>
          <Body>
            The desk in the master bedroom runs the house cameras. It stays locked until you have
            finished {CAMERA_UNLOCK_TASKS} real jobs — steps do not count — and then each sitting
            costs {ACTION_MINUTES.cameras} minutes and names one guest's appetite outright,
            starting with whoever is most wound up.
          </Body>
          <Aside>
            The monitor is a light. Leave it running and every guest drawn to light starts the long
            walk toward the one room that must stay empty. Two minutes to switch it off; three to
            bolt the door. Forget both and the night ends without anybody touching you.
          </Aside>
        </div>
      </div>
    ),
  },

  {
    id: 'clocks',
    tab: 'The clocks',
    title: 'Three clocks, all running',
    standfirst: 'None of them run backwards on their own.',
    body: (
      <div className="space-y-3">
        <div className="plate px-3 py-2.5">
          <div className="legend text-[0.9rem] leading-none font-bold">Suspicion — the loud one</div>
          <hr className="rule mt-1.5 mb-2" />
          <p className="text-[0.82rem] leading-snug text-bone-dim">
            The gauge across the top. It climbs when you make noise and when guests are visible out
            on the front lawn. At 100 the neighbours stop wondering and start dialling, and the run
            is over. It starts the night at 12, which is a warning, not a cushion.
          </p>
        </div>

        <div className="plate px-3 py-2.5">
          <div className="legend text-[0.9rem] leading-none font-bold">
            Mutation — the one you cannot stop
          </div>
          <hr className="rule mt-1.5 mb-2" />
          <p className="mb-2.5 text-[0.82rem] leading-snug text-bone-dim">
            Every sixth hour, everyone still in the house slides one stage further gone. From{' '}
            <span className="text-bone">Mutating</span> onward they stop mingling and start hunting
            your kitchen on their own, whatever you had planned for them.
          </p>
          <ul className="flex flex-wrap items-end justify-around gap-3">
            {([0, 1, 2, 3] as MutationStage[]).map((stage) => (
              <Stage key={stage} stage={stage} />
            ))}
          </ul>
        </div>

        <div className="plate px-3 py-2.5">
          <div className="legend text-[0.9rem] leading-none font-bold">
            Agitation — the hidden one
          </div>
          <hr className="rule mt-1.5 mb-2" />
          <p className="text-[0.82rem] leading-snug text-bone-dim">
            Every guest carries a private temper. Getting the lure they wanted settles them. Running
            a lure that is not theirs winds them up a little every hour it stays on. Hands wind them
            up a lot. A guest who reaches the top of that meter mutates{' '}
            <span className="text-bone">early</span>, ahead of the clock — which is how a manageable
            night becomes four feral people and a kitchen.
          </p>
        </div>
      </div>
    ),
  },

  {
    id: 'faces',
    tab: 'The faces',
    title: 'What their faces tell you',
    standfirst: 'How the hour treated them. Never what they want.',
    body: (
      <div className="space-y-3">
        <Body>
          A bubble over someone's head is honest about their mood and says nothing about their
          appetite — deducing the appetite is the game, so the bubble will never hand it to you.
          Read mood and movement together and you have your answer anyway.
        </Body>

        <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {(['heart', 'note', 'food', 'sleep', 'sweat', 'alert', 'anger', 'skull'] as EmoteId[]).map(
            (id) => (
              <Mood key={id} id={id} />
            ),
          )}
        </ul>

        <Aside>
          A heart the hour after you flipped one switch is a confession. That is the whole detective
          loop: change one thing, end the hour, see who looks pleased about it.
        </Aside>

        <Body>
          The log in the bottom corner narrates every hour in order, and the guests talk. Stand near
          someone for a few hours and their file in the roster opens a line at a time — who they
          are, why they came, why they have not gone home. None of it is required to win. It is the
          reason to.
        </Body>
      </div>
    ),
  },

  {
    id: 'first',
    tab: 'Hour one',
    title: 'Your first hour',
    standfirst: 'Three actions. Spend them learning, not winning.',
    body: (
      <div className="space-y-3">
        <Body>
          Opening night, twelve guests, nothing switched on. Here is an opening that costs you almost
          nothing and tells you almost everything.
        </Body>

        <ol className="plate space-y-2.5 px-3 py-3">
          <Step n={1}>
            <span className="text-brass">Flip exactly one lamp.</span> One. Then, next hour, look for
            the person who turned toward it — and for the person who suddenly looks unsettled.
            That second one is telling you something too.
          </Step>
          <Step n={2}>
            <span className="text-brass">Drop a snack in the hallway.</span> Silent, calming, and it
            drags anyone hungry off the sofa and into a corridor where you can work on them.
          </Step>
          <Step n={3}>
            <span className="text-brass">Take one step toward the crowd.</span> Standing near people
            opens their file, and being close is how you get to nudge anybody later without walking
            across the house first.
          </Step>
        </ol>

        <Body>
          Then end the hour and read the log. Somebody moved, and they moved for a reason. Once you
          know what pulls a guest, the rest is plumbing: pull them to the entry, open the front,
          pull them onto the lawn. Anyone outside walks to the street on their own — you do not have
          to escort them, only get them through the door.
        </Body>

        <div className="signplate px-3.5 py-2.5 text-center">
          <p className="legend text-[1.05rem] leading-none font-bold text-brass">
            Everyone out. Nobody hurt. Nobody calls it in.
          </p>
          <p className="mt-1.5 text-[0.78rem] text-bone-dim italic">
            You can reopen this from the corner of the screen at any time.
          </p>
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------- shell */

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const [index, setIndex] = useState(0);
  const chapter = CHAPTERS[index] ?? CHAPTERS[0]!;
  const first = index === 0;
  const last = index === CHAPTERS.length - 1;

  // Arrow keys page it and Escape closes it, because anyone who opens a help
  // screen mid-turn wants out of it faster than they can find the button.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(CHAPTERS.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      className="absolute inset-0 z-[70] overflow-y-auto bg-shell/94 p-4 sm:p-6"
    >
      {/* A strip of the game's own floorboards along the top, so the help screen
          reads as part of the house rather than a browser dialog dropped on it. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-6 opacity-40">
        {Array.from({ length: 44 }, (_tile, x) => (
          <PixelSprite key={x} art={terrainArt('living', x, 0)} className="h-full flex-1" />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-full max-w-[56rem] flex-col justify-center py-4">
        <div className="plate flex flex-col px-4 py-3.5 sm:px-6 sm:py-5">
          {/* Header: what this is, and a way out of it. */}
          <header className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.74rem] text-bone-dim italic">Life of the Party — how to play</p>
              <h2 className="legend mt-0.5 text-[1.55rem] leading-none font-bold">
                {chapter.title}
              </h2>
              <p className="mt-1.5 text-[0.86rem] text-bone-dim italic">{chapter.standfirst}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ghostbtn shrink-0 px-2.5 py-1 text-[0.78rem]"
            >
              Close
            </button>
          </header>

          {/* Stepper. Clickable, because a player coming back for one rule
              should not have to page through six cards to reach it. */}
          <nav className="mb-3 flex flex-wrap gap-1.5" aria-label="Tutorial sections">
            {CHAPTERS.map((entry, position) => {
              const current = position === index;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-current={current ? 'step' : undefined}
                  className={`border px-2 py-0.5 text-[0.74rem] transition-colors ${
                    current
                      ? 'border-brass bg-brass-dim/25 text-brass'
                      : 'border-brass-dim/40 text-bone-dim hover:border-brass-dim hover:text-bone'
                  }`}
                  style={{ fontVariant: 'small-caps', borderRadius: 2 }}
                >
                  {position + 1}. {entry.tab}
                </button>
              );
            })}
          </nav>

          <hr className="rule mb-3.5" />

          {/* The card body. A floor under it keeps paging from jolting the
              layout when a short chapter follows a tall one. */}
          <div className="min-h-[17rem]">{chapter.body}</div>

          <hr className="rule mt-4 mb-3" />

          <footer className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={first}
              className="ghostbtn px-3 py-1.5 text-[0.8rem] disabled:cursor-default disabled:opacity-35"
            >
              Back
            </button>

            <span className="text-[0.75rem] text-bone-dim italic">
              {index + 1} of {CHAPTERS.length}
            </span>

            <div className="flex-1" />

            {last ? (
              <button type="button" onClick={onClose} className="brassbtn px-5 py-2 text-[0.95rem] font-bold">
                Go and host
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="ghostbtn px-3 py-1.5 text-[0.8rem]"
                >
                  Skip it
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(CHAPTERS.length - 1, i + 1))}
                  className="brassbtn px-5 py-2 text-[0.95rem] font-bold"
                >
                  Next
                </button>
              </>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
