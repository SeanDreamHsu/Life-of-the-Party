const FOCUS_KEY_STORAGE = 'lotp:focus-host-key';
export const DEFAULT_FOCUS_KEY = 'f';

/** Movement and browser/navigation keys retain their existing meanings. */
export function validFocusKey(key: string): boolean {
  return /^[a-z0-9]$/.test(key) && !'wasd'.includes(key);
}
export function readFocusKey(): string {
  try {
    const saved = localStorage.getItem(FOCUS_KEY_STORAGE);
    return saved && validFocusKey(saved) ? saved : DEFAULT_FOCUS_KEY;
  } catch { return DEFAULT_FOCUS_KEY; }
}
export function saveFocusKey(key: string): boolean {
  try { localStorage.setItem(FOCUS_KEY_STORAGE, key); return true; }
  catch { return false; }
}
