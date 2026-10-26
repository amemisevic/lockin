// Gym state shape, validation and safe load/save (gym plan G2). Pure: storage is passed in.
// Own key, so a gym bug can never move the challenge data to the corrupt key.
// validateGym returns { ok: true } or { ok: false, reason }; unknown extra keys are accepted and kept.
import { dateKey, keyToDate } from '../logic.js';

export const GYM_KEY = 'lockin.v2.gym';
export const GYM_CORRUPT = 'lockin.v2.gym.corrupt';

// weeklyTarget (1 to 7) and weeklyTargetOn (G13). Data saved before G13 has no weeklyTargetOn: absent means on.
export const WEEKLY_TARGET = { min: 1, max: 7 };
export const emptyGym = () => ({ v: 1, settings: { weeklyTarget: 4, weeklyTargetOn: true }, customExercises: [], routines: [], workouts: [] });

const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = x => typeof x === 'string';
const isNum = x => typeof x === 'number' && Number.isFinite(x);
const isId = x => isStr(x) && x !== '';
const realDate = d => isStr(d) && /^\d{4}-\d{2}-\d{2}$/.test(d) && dateKey(keyToDate(d)) === d;

// First non-null problem code over a list.
const first = (list, fn) => { for (const x of list) { const p = fn(x); if (p) return p; } return null; };

// Workout sets carry warmup and done; routine template sets are { reps, weight } only.
// A set of an OPEN workout that is not done may have null reps and/or weight (a true empty set, not entered yet).
function setProblem(s, workout, open) {
  if (!isObj(s)) return 'shape';
  const blankOk = open && s.done !== true;
  if (!(blankOk && s.reps === null) && (!Number.isInteger(s.reps) || s.reps < 1 || s.reps > 999)) return 'reps';
  if (!(blankOk && s.weight === null) && (!isNum(s.weight) || s.weight < 0 || s.weight > 1000)) return 'weight';
  if (workout && (typeof s.warmup !== 'boolean' || typeof s.done !== 'boolean')) return 'shape';
  return null;
}

// An exercise id the bundled list no longer has is fine; only its type is checked.
function itemProblem(it, workout, open = false) {
  if (!isObj(it)) return 'shape';
  if (!isId(it.exerciseId)) return 'id';
  if (!Array.isArray(it.sets)) return 'shape';
  return first(it.sets, s => setProblem(s, workout, open));
}

const customProblem = c => (!isObj(c) ? 'shape' : !isId(c.id) ? 'id' : !isStr(c.name) || !isStr(c.muscle) || !isStr(c.equipment) ? 'shape' : null);

function routineProblem(r) {
  if (!isObj(r)) return 'shape';
  if (!isId(r.id)) return 'id';
  if (!isStr(r.name) || !isNum(r.createdAt) || !Array.isArray(r.items)) return 'shape';
  return first(r.items, it => itemProblem(it, false));
}

function workoutProblem(w) {
  if (!isObj(w)) return 'shape';
  if (!isId(w.id)) return 'id';
  if (!isStr(w.name) || !(w.routineId === null || isStr(w.routineId))) return 'shape';
  if (!realDate(w.date)) return 'date';
  if (!isNum(w.startedAt)) return 'shape';
  if (w.finishedAt !== null && !(isNum(w.finishedAt) && w.finishedAt >= w.startedAt)) return 'finish-time';
  if (!Array.isArray(w.items)) return 'shape';
  const p = first(w.items, it => itemProblem(it, true, w.finishedAt === null));
  if (p) return p;
  if (w.finishedAt !== null && !w.items.some(it => it.sets.some(s => s.done && !s.warmup))) return 'no-sets';
  return null;
}

// Set, so ids like "toString" or "__proto__" are plain values.
const hasDuplicate = list => new Set(list.map(x => x.id)).size !== list.length;

export function validateGym(obj) {
  const no = reason => ({ ok: false, reason });
  if (!isObj(obj)) return no('shape');
  if (obj.v !== 1) return no('version');
  const t = obj.settings?.weeklyTarget, on = obj.settings?.weeklyTargetOn;
  if (!isObj(obj.settings) || !Number.isInteger(t) || t < WEEKLY_TARGET.min || t > WEEKLY_TARGET.max) return no('settings');
  if (on !== undefined && typeof on !== 'boolean') return no('settings');
  for (const key of ['customExercises', 'routines', 'workouts']) if (!Array.isArray(obj[key])) return no('collection');
  for (const [key, problem] of [['customExercises', customProblem], ['routines', routineProblem], ['workouts', workoutProblem]]) {
    const p = first(obj[key], problem);
    if (p) return no(p);
    if (hasDuplicate(obj[key])) return no('duplicate-id');
  }
  if (obj.workouts.filter(w => w.finishedAt === null).length > 1) return no('open-workouts');
  return { ok: true };
}

// What every screen shows: the weekly target, or null when it is switched off (then no screen shows any target text).
export const weeklyTarget = gym => (gym?.settings?.weeklyTargetOn === false ? null : gym?.settings?.weeklyTarget ?? 4);

// A refused value (validateGym is the one place the bounds live) or an unchanged one returns the same object, so nothing is saved.
function withSetting(gym, key, value) {
  const next = { ...gym, settings: { ...gym.settings, [key]: value } };
  return gym.settings[key] === value || !validateGym(next).ok ? gym : next;
}
export const setWeeklyTarget = (gym, n) => withSetting(gym, 'weeklyTarget', n);
export const setWeeklyTargetOn = (gym, on) => (typeof on === 'boolean' ? withSetting(gym, 'weeklyTargetOn', on) : gym); // validateGym accepts undefined (old data)

// Never throws. Unreadable or invalid data: the text is kept under GYM_CORRUPT, the state is empty and corrupt is true.
export function loadGym(storage) {
  let raw;
  try { raw = storage.getItem(GYM_KEY); } catch { return { state: emptyGym(), corrupt: false }; }
  if (raw == null) return { state: emptyGym(), corrupt: false };
  try {
    const obj = JSON.parse(raw);
    if (validateGym(obj).ok) return { state: obj, corrupt: false };
  } catch { /* not JSON: fall through to the corrupt path */ }
  try { storage.setItem(GYM_CORRUPT, raw); } catch { /* nothing more we can do */ }
  return { state: emptyGym(), corrupt: true };
}

// Invalid state is refused (nothing written); a failed write or text that does not hold a valid state is reason "storage".
export function saveGym(storage, state) {
  const v = validateGym(state);
  if (!v.ok) return v;
  try {
    const text = JSON.stringify(state); // a toJSON on the state or an unknown key could change what is written
    if (typeof text !== 'string' || !validateGym(JSON.parse(text)).ok) return { ok: false, reason: 'storage' };
    storage.setItem(GYM_KEY, text);
    return { ok: true };
  } catch { return { ok: false, reason: 'storage' }; }
}
