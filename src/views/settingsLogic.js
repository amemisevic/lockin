// Settings logic (plan Task 19). Pure and DOM-free: state transforms, validation, backup filename and export flow.
// Before Day 1 the lists live in state.setup (via setupLists); once the challenge runs they live in state.challenge.
import { uid, addDays, dateKey, keyToDate } from '../logic.js';
import { defaultState, validateState } from '../core/model.js';
import { exportJson, markBackup, backupStatus, KEY, CORRUPT } from '../core/store.js';
import { settleMissed } from '../core/scoring.js';
import { GYM_KEY, GYM_CORRUPT } from '../core/gym.js';
import { setupLists } from './challengeLogic.js';

const no = error => ({ ok: false, error });
const yes = state => ({ ok: true, state });

// The core validator is the one place the bounds live: probe it instead of repeating the numbers.
function bounds(key) {
  const fits = n => validateState({ ...defaultState(), settings: { ...defaultState().settings, [key]: n } }) === null;
  const ok = Array.from({ length: 31 }, (_, i) => i - 5).filter(fits);
  return { min: ok[0], max: ok.at(-1) };
}
export const SETTING_BOUNDS = { zeroDay: bounds('zeroDay'), medPerWeek: bounds('medPerWeek') };

export const lists = state => (state.challenge
  ? { protocols: state.challenge.protocols, redLines: state.challenge.redLines } : setupLists(state));

const write = (state, patch) => (state.challenge
  ? { ...state, challenge: { ...state.challenge, ...patch } }
  : { ...state, setup: { ...setupLists(state), ...patch } });

// Add (id null) or rename one list entry. item: the stored shape; label names it in the error.
function put(state, key, item, id, label) {
  const list = lists(state)[key];
  if (id === null) return yes(write(state, { [key]: [...list, item] }));
  if (!list.some(x => x.id === id)) return no(`That ${label} no longer exists.`);
  return yes(write(state, { [key]: list.map(x => (x.id === id ? { ...item, id } : x)) }));
}

// Delete only edits the live list: finished days keep their night.protocols / night.redLines snapshots.
function drop(state, key, id, label) {
  const list = lists(state)[key];
  if (!list.some(x => x.id === id)) return yes(state); // unknown id: same state, so app.set does not save
  if (state.challenge && list.length === 1 && list[0].id === id) return no(`A challenge needs at least one ${label}.`);
  return yes(write(state, { [key]: list.filter(x => x.id !== id) }));
}

export function saveProtocol(state, { title, med }, id = null, newId = uid) {
  const t = title?.trim();
  if (!t) return no('Give the protocol a title.');
  return put(state, 'protocols', { id: newId(), title: t, med: med?.trim() || null }, id, 'protocol');
}
export function saveRedLine(state, { name }, id = null, newId = uid) {
  const n = name?.trim();
  if (!n) return no('Give the red line a name.');
  return put(state, 'redLines', { id: newId(), name: n }, id, 'red line');
}
export const deleteProtocol = (state, id) => drop(state, 'protocols', id, 'protocol');
export const deleteRedLine = (state, id) => drop(state, 'redLines', id, 'red line');

const setting = key => (state, n) => {
  const { min, max } = SETTING_BOUNDS[key];
  return !Number.isInteger(n) || n < min || n > max || state.settings[key] === n
    ? state : { ...state, settings: { ...state.settings, [key]: n } };
};
export const setZeroDay = setting('zeroDay');
export const setMedPerWeek = setting('medPerWeek');

const isClosed = d => d?.closedAt != null || d?.result != null;
export const startEditable = state => !!state.challenge && !Object.values(state.days).some(isClosed);

const ORPHAN = 'Day 1 cannot move there: a day you already filed would fall outside the 30 days.';
const ENDED = 'Day 1 cannot move back to a day that has already ended.';
const realDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && dateKey(keyToDate(d)) === d;

// nowMs: a start the core would settle (days already past their 04:00 grace become Redo, then Day 1 locks) is refused.
export function setStartDate(state, today, date, nowMs) {
  if (!state.challenge) return no('The challenge has not started.');
  if (!startEditable(state)) return no('Day 1 cannot change once a day is closed.');
  if (!realDate(date)) return no('Choose a valid date.');
  if (date > today) return no('Day 1 cannot be in the future.');
  if (date === state.challenge.startDate) return yes(state);
  const last = addDays(date, state.challenge.length - 1);
  const inside = d => d >= date && d <= last;
  if (Object.keys(state.days).some(d => !inside(d)) || (state.challenge.redoUsed && !inside(state.challenge.redoUsed))) return no(ORPHAN);
  const next = { ...state, challenge: { ...state.challenge, startDate: date } };
  return settleMissed(next, nowMs) === next ? yes(next) : no(ENDED);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const packSummary = state => (state.pack
  ? `${plural(state.pack.missions.length, 'mission')} · ${plural(state.pack.tactics.length, 'tactic')} · imported` : 'No pack imported');

export function backupLine(state, today) {
  const { days, overdue } = backupStatus(state, today);
  const head = days === null ? (state.settings.lastBackup ? 'The last backup date is in the future' : 'No backup yet')
    : days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
  return { text: `${head} · export one weekly`, overdue };
}

// [name, time, text]: shown in the Reminders sheet (Shortcuts automations, no in-app notifications).
export const REMINDERS = [
  ['Morning', '07:00', 'Morning check-in. Open Lock In and file it.'],
  ['Afternoon', '13:00', 'Midday. Still on track? Log it.'],
  ['Night', '21:30', 'Night check-in. Close the day.'],
];

export const backupName = today => `lockin-${today}.json`;

// io: { makeFile(name, text), canShare(file), share(file), download(file) }. Marked only after share or download ran;
// a cancelled share (AbortError), or a download that throws, is { outcome: 'cancelled' } with no state; any other share
// failure (e.g. an expired tap) falls back to download.
export async function runExport(state, today, io, gym) {
  const marked = markBackup(state, today);
  const file = io.makeFile(backupName(today), exportJson(marked, gym));
  let outcome = 'shared';
  try {
    if (!io.canShare(file)) outcome = 'downloaded';
    else await io.share(file);
  } catch (e) {
    if (e?.name === 'AbortError') return { outcome: 'cancelled' };
    outcome = 'downloaded';
  }
  if (outcome === 'downloaded') {
    try { io.download(file); } catch { return { outcome: 'cancelled' }; }
  }
  return { outcome, state: marked };
}

// Erase all data (owner ruling 2026-10-24): removes every key the app writes, the saved copies of unreadable data included.
// Each removal is tried even if another throws; false when any did (storage blocked), so the caller must not restart.
export function eraseAll(storage) {
  let ok = true;
  for (const k of [KEY, CORRUPT, GYM_KEY, GYM_CORRUPT]) { try { storage.removeItem(k); } catch { ok = false; } }
  return ok;
}

// Import write (owner ruling 17). Gym first: a failed gym write aborts with nothing changed. If the v2 write then fails, the
// previous gym TEXT goes back (removed if there was none) and the previous v2 state returns to memory. r = validateImport result.
// A file without a gym section only replaces v2 (ruling 3). Returns true when everything was written.
export function applyImport(app, r) {
  if (r.gym === undefined) { app.set(() => r.state); return true; }
  const oldState = app.state, oldGym = app.gym;
  let oldText;
  try { oldText = app.storage.getItem(GYM_KEY); } catch { return false; }
  const undo = () => {
    app.setGym(() => oldGym);
    try { if (oldText == null) app.storage.removeItem(GYM_KEY); else app.storage.setItem(GYM_KEY, oldText); } catch { /* storage is failing: the old text was never overwritten */ }
    app.set(() => oldState);
    return false;
  };
  if (!app.setGym(() => r.gym)) return undo();
  app.set(() => r.state);
  return app.saveFailed ? undo() : true;
}
