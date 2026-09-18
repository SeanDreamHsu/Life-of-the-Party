import { useRef, useState } from 'react';
import { DEFAULT_FOCUS_KEY, validFocusKey } from '../settings/shortcuts';

interface Props {
  focusKey: string;
  onChangeFocusKey: (key: string) => boolean;
}

export default function Settings({ focusKey, onChangeFocusKey }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('');

  function save(key: string): void {
    const persisted = onChangeFocusKey(key);
    setListening(false);
    setStatus(persisted ? `Shortcut saved: ${key.toUpperCase()}.` : `Shortcut set to ${key.toUpperCase()} for this session. Browser storage is unavailable.`);
  }

  return <>
    <button type="button" className="ghostbtn px-2.5 py-1 text-[0.78rem]" onClick={() => {
      setListening(false); setStatus(''); dialog.current?.showModal();
    }}>Settings</button>
    <dialog ref={dialog} className="playtest-dialog plate text-bone" aria-labelledby="settings-title"
      onKeyDown={event => {
        event.stopPropagation();
        if (!listening || event.key === 'Tab') return;
        event.preventDefault();
        if (event.key === 'Escape') { setListening(false); setStatus('Shortcut unchanged.'); return; }
        if (event.nativeEvent.isComposing || event.repeat) return;
        const key = event.key.toLowerCase();
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !validFocusKey(key)) {
          setStatus('Choose one letter or number. W, A, S and D are reserved for movement.');
          return;
        }
        save(key);
      }}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="settings-title" className="legend text-2xl">Settings</h2>
        <button type="button" className="ghostbtn px-3 py-2" onClick={() => dialog.current?.close()}>Close settings</button>
      </div>
      <h3 className="legend mt-5 text-lg text-brass">Keyboard shortcuts</h3>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold">Focus on the host</p>
          <p className="mt-1 text-sm text-bone-dim">Move the camera to the host’s current room and floor.</p>
        </div>
        <button type="button" aria-label="Change focus shortcut" className="brassbtn min-w-24 px-4 py-2"
          onClick={() => { setListening(true); setStatus('Press a letter or number. Esc cancels.'); }}>
          {listening ? 'Press a key…' : focusKey.toUpperCase()}
        </button>
      </div>
      <p className="mt-4 text-sm text-bone-dim">Click the key to change it. Your shortcut is remembered in this browser.</p>
      <button type="button" className="ghostbtn mt-4 px-3 py-2" onClick={() => save(DEFAULT_FOCUS_KEY)}>Reset to F</button>
      <p role="status" className="mt-4 min-h-10 text-sm text-brass">{status}</p>
    </dialog>
  </>;
}
