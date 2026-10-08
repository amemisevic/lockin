// State defaults, safe load/save, validated import/export.
import { addDays, daysBetween } from './logic.js';

export const KEY = 'lockin.v1';
export const CORRUPT = 'lockin.v1.corrupt';

export function defaultState(today) {
  const until = addDays(today, 30);
  const goal = (id, name, icon, minutes, weeklyCount, checks) =>
    ({ id, name, icon, minutes, weeklyCount, checks, committedUntil: until });
  return {
    v: 1,
    goals: [
      goal('biz', 'Business', 'briefcase', { weekday: 60, weekend: 240 }, null, []),
      goal('uni', 'Uni', 'book', { weekday: 120, weekend: 240 }, null, []),
      goal('body', 'Body & Health', 'heart', null, { label: 'Gym sessions', target: 4 }, [{ id: 'cal', label: 'Calories on target' }]),
      goal('social', 'Socializing', 'people', null, { label: 'Social reps', target: 3 }, []),
    ],
    redLines: [], blocks: [], occ: {}, checks: {}, manualMet: {}, counts: {}, red: {},
    weights: [], targetWeightKg: null, timer: null, lastBackup: null,
  };
}

// Fields an older export may lack; filled on load/import.
const OPTIONAL = { weights: [], targetWeightKg: null, timer: null, lastBackup: null };

const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = x => typeof x === 'string';
const isNum = x => typeof x === 'number' && Number.isFinite(x);
const isDate = x => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);

const goalOk = g => isObj(g) && isStr(g.id) && isStr(g.name) && isStr(g.icon) && isDate(g.committedUntil)
  && (g.minutes === null || (isObj(g.minutes) && isNum(g.minutes.weekday) && isNum(g.minutes.weekend)))
  && (g.weeklyCount === null || (isObj(g.weeklyCount) && isStr(g.weeklyCount.label) && isNum(g.weeklyCount.target)))
  && Array.isArray(g.checks) && g.checks.every(c => isObj(c) && isStr(c.id) && isStr(c.label));

const blockOk = b => isObj(b) && isStr(b.id) && !b.id.includes(':') && isStr(b.title) && isStr(b.desc)
  && isDate(b.date) && isStr(b.start) && isStr(b.end) && isStr(b.tag)
  && isObj(b.repeat) && isStr(b.repeat.type) && Array.isArray(b.repeat.days)
  && (b.until === null || isDate(b.until)) && Array.isArray(b.skip);

// Red lines may be measured: limit (>= 0) and unit (1-12 chars), both or neither.
const lineOk = r => isObj(r) && isStr(r.id) && isStr(r.name) && ((r.limit === undefined && r.unit === undefined)
  || (isNum(r.limit) && r.limit >= 0 && isStr(r.unit) && r.unit.length >= 1 && r.unit.length <= 12));
const entryOk = e => e === 'held' || e === 'slipped' || (isObj(e) && isNum(e.amount) && e.amount >= 0
  && isNum(e.limit) && e.limit >= 0 && isStr(e.unit) && isStr(e.name));

export function validateState(obj) {
  if (!isObj(obj)) return 'This is not a Lock In backup.';
  if (obj.v !== 1) return 'Unsupported version. Expected v1.';
  for (const k of ['goals', 'redLines', 'blocks']) if (!Array.isArray(obj[k])) return `The backup is missing its ${k} list.`;
  for (const k of ['occ', 'checks', 'manualMet', 'counts', 'red']) if (!isObj(obj[k])) return `The backup's ${k} data is damaged.`;
  if (obj.weights !== undefined && !Array.isArray(obj.weights)) return "The backup's weigh-ins are damaged.";
  if (obj.goals.map(g => g?.id).join() !== 'biz,uni,body,social' || !obj.goals.every(goalOk))
    return "The backup's goals are damaged.";
  if (!obj.redLines.every(lineOk)) return "The backup's red lines are damaged.";
  if (!Object.values(obj.red).every(day => isObj(day) && Object.values(day).every(entryOk))) return "The backup's red-line log is damaged.";
  if (!obj.blocks.every(blockOk)) return "The backup's blocks are damaged.";
  if (obj.timer != null && !(isObj(obj.timer) && isStr(obj.timer.occId) && isNum(obj.timer.startedAt)))
    return "The backup's timer is damaged.";
  return null;
}

const fill = obj => ({ ...OPTIONAL, ...obj });

export function load(storage, today) {
  let raw = null;
  try { raw = storage.getItem(KEY); } catch { return defaultState(today); }
  if (raw === null) return defaultState(today);
  try {
    const obj = JSON.parse(raw);
    if (!validateState(obj)) return fill(obj);
  } catch { /* not JSON: fall through to the corrupt path */ }
  try { storage.setItem(CORRUPT, raw); } catch { /* nothing more we can do */ }
  return defaultState(today);
}

export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export const exportJson = state => JSON.stringify(state, null, 2);

export function validateImport(text) {
  if (!text?.trim()) return { ok: false, error: 'The file is empty.' };
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'The file is not valid JSON. Choose a Lock In backup file.' }; }
  const error = validateState(obj);
  return error ? { ok: false, error } : { ok: true, state: fill(obj) };
}

export const markBackup = (state, today) => ({ ...state, lastBackup: today });

export function backupStatus(state, today) {
  if (!state.lastBackup) return { days: null, overdue: true };
  const days = daysBetween(state.lastBackup, today);
  return { days, overdue: days > 7 };
}
