import { furnitureArt, poseArt, type Art } from '../src/art';

/**
 * FOLLOW THE DEVELOPMENT
 *
 * Two halves, kept apart on purpose. The milestones are written by hand,
 * because "what mattered" is an editorial call a commit log cannot make. The
 * feed beside them is read live from GitHub, because "what changed today" is
 * exactly what a hand-written page goes stale on first.
 *
 * Dates are stored as the instant they happened (from git, GitHub and the
 * host's deploy log) and printed in the reader's own time zone, the way
 * GitHub prints them. A calendar date typed in here would be a day out for
 * half the people reading it.
 */

const REPO = 'SeanDreamHsu/Life-of-the-Party';
export const REPO_URL = `https://github.com/${REPO}`;

export interface Milestone {
  /** When it shipped, or null for what happened before version control. */
  when: string | null;
  title: string;
  text: string;
  /** One of the game's own sprites marks each stop. */
  icon: Art;
  link?: { label: string; href: string };
  /** The most recent stop, where the reader is standing. */
  now?: boolean;
}

export const MILESTONES: readonly Milestone[] = [
  {
    when: null,
    title: 'Three squares in a living room',
    text:
      'The original brief: a ten-by-ten room, three coloured squares for guests, a speaker, a ' +
      'fridge and three Action Points a turn. It all happened before version control, so none ' +
      'of those early versions survive. The idea did.',
    icon: furnitureArt('cobweb'),
    link: { label: 'Read the original brief', href: `${REPO_URL}/blob/main/instructions.txt` },
  },
  {
    when: '2026-09-08T04:14:42Z',
    title: 'Alpha 0.7.5, the first tagged release',
    text:
      'The first version in git. Action Points became sixty-minute hours, three squares became ' +
      'twelve hand-written guests, and the house grew to eighteen rooms with a surveillance PC ' +
      'in the back bedroom.',
    icon: furnitureArt('keg'),
    link: { label: 'See v0.7.5', href: `${REPO_URL}/releases/tag/v0.7.5` },
  },
  {
    when: '2026-09-12T22:47:29Z',
    title: 'The party goes online',
    text:
      'The alpha is published to the web, so it can be played in a browser instead of only on ' +
      'the machine it was built on.',
    icon: furnitureArt('television'),
    link: { label: 'Play the alpha', href: './play/' },
  },
  {
    when: '2026-09-23T20:49:56Z',
    title: 'A front door for the party',
    text:
      'This page. An animated landing page that reads its sprites, costs and lines straight out ' +
      'of the game, with the game itself moving to /play/.',
    icon: furnitureArt('discoball'),
  },
  {
    when: '2026-09-24T00:04:34Z',
    title: 'The big redesign',
    text:
      'Every guest redrawn with their own hair, outfit and accessories, the rooms rebuilt around ' +
      'the way people actually stand at parties, and the house stacked into three floors joined ' +
      'by real stairs.',
    icon: poseArt('guest-nadia', 0),
    link: { label: 'Read pull request #1', href: `${REPO_URL}/pull/1` },
  },
  {
    when: '2026-09-24T00:22:13Z',
    title: 'The lore drop',
    text:
      'A character bible for all twelve guests: backstories, running jokes and the Saturday ' +
      'Incident. Nobody knows what happened to Keith.',
    icon: poseArt('guest-gary', 0),
    link: { label: 'Meet the cast', href: `${REPO_URL}/blob/main/CHARACTERS.md` },
  },
  {
    when: '2026-09-24T01:26:34Z',
    title: 'Pixels everywhere',
    text:
      'Pixel cursors, a confetti trail, section labels that decode like an old display, a giant ' +
      'hour you can push around, and this log.',
    icon: furnitureArt('balloon'),
    now: true,
  },
];

/** "Sep 7, 2026", in the reader's own time zone. The page is in English, so the months are too. */
export function calendarDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(iso),
  );
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "3 hours ago". A feed is about recency, so it speaks in it. */
export function ago(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/* ------------------------------------------------------------ the feed */

export interface Commit {
  sha: string;
  url: string;
  /** The first line of the message. The rest is for people reading the code. */
  title: string;
  when: string;
  /** A merged pull request, which is when a change actually reaches the game. */
  merged: boolean;
}

const CACHE_KEY = 'lotp:commits';
/**
 * GitHub allows sixty anonymous requests an hour from one address. Holding
 * the answer for ten minutes means reloading the page, or coming back to it,
 * never spends one.
 */
const CACHE_FOR = 10 * 60_000;

/** A merge commit's own subject is branch plumbing; the pull request's title is the news. */
function summarise(sha: string, url: string, message: string, when: string): Commit {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const subject = lines[0] ?? sha.slice(0, 7);
  const pull = /^Merge pull request #(\d+)/.exec(subject);
  if (pull) {
    return { sha, url, when, merged: true, title: `#${pull[1] ?? ''}: ${lines[1] ?? subject}` };
  }
  return { sha, url, when, merged: false, title: subject };
}

/** GitHub's answer, checked field by field rather than trusted. */
function parse(raw: unknown): Commit[] {
  if (!Array.isArray(raw)) return [];
  const commits: Commit[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { sha, html_url: url, commit } = item as Record<string, unknown>;
    if (typeof sha !== 'string' || typeof url !== 'string') continue;
    if (typeof commit !== 'object' || commit === null) continue;
    const { message, committer } = commit as Record<string, unknown>;
    const when =
      typeof committer === 'object' && committer !== null
        ? (committer as Record<string, unknown>).date
        : undefined;
    if (typeof message !== 'string' || typeof when !== 'string') continue;
    commits.push(summarise(sha, url, message, when));
  }
  return commits;
}

function readCache(): Commit[] | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { at?: unknown; commits?: unknown };
    if (typeof saved.at !== 'number' || Date.now() - saved.at > CACHE_FOR) return null;
    return Array.isArray(saved.commits) ? (saved.commits as Commit[]) : null;
  } catch {
    // Private windows and blocked storage both land here. The feed simply asks GitHub again.
    return null;
  }
}

function writeCache(commits: Commit[]): void {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), commits }));
  } catch {
    // Not being able to remember is fine; the page still works.
  }
}

/** The newest commits on main, straight from GitHub. Rejects if GitHub cannot be reached. */
export async function latestCommits(count: number): Promise<Commit[]> {
  const cached = readCache();
  if (cached) return cached.slice(0, count);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/commits?sha=main&per_page=${count}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const commits = parse(await response.json());
    if (commits.length > 0) writeCache(commits);
    return commits;
  } finally {
    window.clearTimeout(timer);
  }
}
