// Safe load/save of the v2 state, validated import/export, backup status.
import { daysBetween } from '../logic.js';
import { defaultState, validateState } from './model.js';
import { validateGym } from './gym.js';

export const KEY = 'lockin.v2';
export const CORRUPT = 'lockin.v2.corrupt';

// `today` is unused: v2 defaults do not depend on the date. Signature kept for callers.
export function load(storage, today) {
  let raw = null;
  try { raw = storage.getItem(KEY); } catch { return defaultState(); }
  if (raw === null) return defaultState();
  try {
    const obj = JSON.parse(raw);
    if (!validateState(obj)) return obj;
  } catch { /* not JSON: fall through to the corrupt path */ }
  try { storage.setItem(CORRUPT, raw); } catch { /* nothing more we can do */ }
  return defaultState();
}

export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

// One file: the v2 state plus, when given, the whole gym state under the extra top-level key `gym`.
export const exportJson = (state, gym) => JSON.stringify(gym === undefined ? state : { ...state, gym }, null, 2);

// ok: { state, gym? }. `gym` is absent when the file has no gym section (the caller then leaves gym data alone);
// a present but invalid section refuses the whole import. Pure: nothing is written here.
export function validateImport(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' };
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'The file is not valid JSON. Choose a Lock In backup file.' }; }
  if (obj?.v === 1) return { ok: false, error: 'This is a Lock In v1 backup. v2 cannot import it.' };
  const error = validateState(obj);
  if (error) return { ok: false, error };
  if (!Object.hasOwn(obj, 'gym')) return { ok: true, state: obj };
  const { gym, ...state } = obj;
  return validateGym(gym).ok ? { ok: true, state, gym } : { ok: false, error: "The backup's gym data is damaged." };
}

export const markBackup = (state, today) => ({ ...state, settings: { ...state.settings, lastBackup: today } });

export function backupStatus(state, today) {
  const last = state.settings.lastBackup;
  if (!last) return { days: null, overdue: true };
  const days = daysBetween(last, today);
  if (days < 0) return { days: null, overdue: true }; // a future date is never shown as a negative count
  return { days, overdue: days > 7 };
}
