import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/state';
import { version } from '../../package.json';

const DRAFT_KEY = 'lotp:feedback-draft';

function readDraft(): string {
  try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
}

export default function PlaytestFeedback({ state }: { state: GameState }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState(readDraft);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, notes); } catch { /* Export works without storage. */ }
  }, [notes]);

  function report(): string {
    return [
      `Life of the Party — playtest v${version}`,
      `Date: ${new Date().toISOString()}`,
      `Day ${state.day}, hour ${state.turn} | Suspicion ${state.suspicion}/100`,
      `Guests remaining: ${state.guests.length} | Departed: ${state.departed.length}`,
      `Viewport: ${window.innerWidth} × ${window.innerHeight}`,
      '', 'Feedback:', notes.trim() || '(No notes entered)',
      '', 'Recent game events:', ...state.log.slice(-8),
    ].join('\n');
  }

  async function copyReport(): Promise<void> {
    try {
      await navigator.clipboard.writeText(report());
      setStatus('Copied! Paste the report into a message to the person who sent you this game.');
    } catch {
      setStatus('Clipboard unavailable. Use Download report and send the text file instead.');
    }
  }

  function downloadReport(): void {
    const url = URL.createObjectURL(new Blob([report()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lotp-playtest-feedback.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Report downloaded. Send the text file to the person who shared this game.');
  }

  return <>
    <button type="button" className="ghostbtn px-2.5 py-1 text-[0.78rem]" onClick={() => {
      setStatus('');
      dialog.current?.showModal();
    }}>Playtest feedback</button>
    <dialog ref={dialog} className="playtest-dialog plate text-bone" aria-labelledby="playtest-title"
      onKeyDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-bone-dim">Alpha v{version} · Friend playtest</p>
          <h2 id="playtest-title" className="legend mt-1 text-2xl">How was the party?</h2>
        </div>
        <button type="button" className="ghostbtn px-3 py-2" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-bone-dim">
        Try a few hours, steer a guest toward the exit, and tell us what felt fun or confusing.
        Best played on a laptop or desktop. This alpha has no win/lose screen or saved games yet;
        refreshing starts a new run.
      </p>
      <label htmlFor="playtest-notes" className="mt-5 block font-bold">Your feedback</label>
      <p id="feedback-prompts" className="mt-1 text-sm text-bone-dim">
        What did you enjoy? Where did you get stuck? For a bug, describe what you did and what you expected.
      </p>
      <textarea id="playtest-notes" aria-describedby="feedback-prompts" rows={6} maxLength={10000}
        className="well mt-3 w-full resize-y rounded p-3 text-base text-bone"
        value={notes} onChange={(event) => { setNotes(event.target.value); setStatus(''); }} />
      <p className="mt-2 text-sm text-bone-dim">Notes stay in this browser when storage is available. Nothing is sent automatically.
        Your report includes the current hour, suspicion and recent game events.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="brassbtn px-4 py-2" onClick={() => void copyReport()}>Copy report</button>
        <button type="button" className="ghostbtn px-4 py-2" onClick={downloadReport}>Download report</button>
      </div>
      <p role="status" className="mt-4 min-h-10 text-sm text-moss">{status}</p>
    </dialog>
  </>;
}
