// Workout actions on the gym state (gym plan G3). Pure: state and nowMs in, new state out; never mutates.
// Success: { ok: true, state, id? }. Refusal: { ok: false, reason } and the caller keeps its state.
// Every result is checked with validateGym, so its codes (no-sets, reps, weight, date, shape, id) pass straight through.
// Workouts are found by id with ===, items and sets by integer index.
import { dateKey } from '../logic.js';
import { validateGym } from './gym.js';

const no = reason => ({ ok: false, reason });
const isObj = x => x !== null && typeof x === 'object';
const inRange = (list, i) => Number.isInteger(i) && i >= 0 && i < list.length;
const replaceAt = (list, i, x) => list.map((old, j) => (j === i ? x : old));
const newSet = (reps, weight) => ({ reps, weight, warmup: false, done: false });

export const openWorkout = gym => gym.workouts.find(w => w.finishedAt === null) ?? null;

// fn gets the workout and returns the new workout, or a string: the refusal code.
function change(gym, id, fn) {
  const i = gym.workouts.findIndex(w => w.id === id);
  if (i < 0) return no('unknown-workout');
  const w = fn(gym.workouts[i]);
  if (typeof w === 'string') return no(w);
  const state = { ...gym, workouts: replaceAt(gym.workouts, i, w) };
  const v = validateGym(state);
  return v.ok ? { ok: true, state } : v;
}

const changeItem = (gym, id, ii, fn) => change(gym, id, w => (inRange(w.items, ii) ? { ...w, items: replaceAt(w.items, ii, fn(w.items[ii])) } : 'bad-index'));
// fn gets the item's sets and returns the new sets, or a refusal string.
const changeSet = (gym, id, ii, si, fn) => change(gym, id, w => {
  if (!inRange(w.items, ii) || !inRange(w.items[ii].sets, si)) return 'bad-index';
  const sets = fn(w.items[ii].sets);
  return typeof sets === 'string' ? sets : { ...w, items: replaceAt(w.items, ii, { ...w.items[ii], sets }) };
});

// The date is the local calendar date of the start. Id = w-<nowMs>, plus -2, -3 … if taken.
export function startWorkout(gym, nowMs, name = '') {
  if (openWorkout(gym)) return no('workout-open');
  const taken = new Set(gym.workouts.map(w => w.id));
  let id = `w-${nowMs}`;
  for (let n = 2; taken.has(id); n++) id = `w-${nowMs}-${n}`;
  const w = { id, date: dateKey(new Date(nowMs)), startedAt: nowMs, finishedAt: null, name: typeof name === 'string' ? name : '', routineId: null, items: [] };
  const state = { ...gym, workouts: [...gym.workouts, w] };
  const v = validateGym(state);
  return v.ok ? { ok: true, state, id } : v;
}

// Prefill rule. Rows come from the most recent finished workout (by startedAt) with a working set of the exercise,
// warm-ups excluded, done or not. Count = template item's set count, else last time's. Set i takes last time's set i,
// beyond that its final set. No history: the template's values, else one empty set (reps 1, weight 0).
// excludeId skips one workout (the one being edited).
export function prefillSets(gym, exerciseId, template = null, excludeId = null) {
  let last = null;
  for (const w of gym.workouts) {
    if (w.finishedAt === null || w.id === excludeId || (last && w.startedAt < last.startedAt)) continue;
    const it = w.items.find(x => x.exerciseId === exerciseId && x.sets.some(s => !s.warmup));
    if (it) last = { startedAt: w.startedAt, sets: it.sets.filter(s => !s.warmup) };
  }
  const tmpl = Array.isArray(template?.sets) && template.sets.length ? template.sets : null;
  if (last) return Array.from({ length: tmpl ? tmpl.length : last.sets.length }, (_, i) => { const s = last.sets[Math.min(i, last.sets.length - 1)]; return newSet(s.reps, s.weight); });
  return tmpl ? tmpl.map(s => newSet(s.reps, s.weight)) : [newSet(1, 0)];
}

export const addExercise = (gym, id, exerciseId) =>
  change(gym, id, w => ({ ...w, items: [...w.items, { exerciseId, sets: prefillSets(gym, exerciseId, null, w.id) }] }));

export const addSet = (gym, id, ii) => changeItem(gym, id, ii, it => ({ ...it, sets: [...it.sets, newSet(1, 0)] }));

// Open workout: any set. Finished workout: validateGym refuses the last done working set with no-sets.
export const removeSet = (gym, id, ii, si) => changeSet(gym, id, ii, si, sets => sets.filter((_, j) => j !== si));

// Only reps and weight are read from the patch; a key that is present but undefined is refused by validateGym.
export const editSet = (gym, id, ii, si, patch) => changeSet(gym, id, ii, si, sets => (!isObj(patch) ? 'shape'
  : replaceAt(sets, si, { ...sets[si], ...(Object.hasOwn(patch, 'reps') && { reps: patch.reps }), ...(Object.hasOwn(patch, 'weight') && { weight: patch.weight }) })));

const toggle = key => (gym, id, ii, si) => changeSet(gym, id, ii, si, sets => replaceAt(sets, si, { ...sets[si], [key]: !sets[si][key] }));
export const toggleDone = toggle('done');
export const toggleWarmup = toggle('warmup');

// A clock set back cannot leave finishedAt before startedAt: it is clamped.
export const finishWorkout = (gym, id, nowMs) => change(gym, id, w => (w.finishedAt !== null ? 'already-finished' : { ...w, finishedAt: Math.max(nowMs, w.startedAt) }));

export function discardWorkout(gym, id) {
  const w = gym.workouts.find(x => x.id === id);
  return !w ? no('unknown-workout') : w.finishedAt !== null ? no('not-open') : { ok: true, state: { ...gym, workouts: gym.workouts.filter(x => x !== w) } };
}

export function deleteWorkout(gym, id) {
  const w = gym.workouts.find(x => x.id === id);
  return !w ? no('unknown-workout') : w.finishedAt === null ? no('not-finished') : { ok: true, state: { ...gym, workouts: gym.workouts.filter(x => x !== w) } };
}

// Name and date only (a finished workout may change its date, ruling 7); other keys are ignored.
export const editWorkout = (gym, id, patch) => change(gym, id, w => (!isObj(patch) ? 'shape'
  : { ...w, ...(Object.hasOwn(patch, 'name') && { name: patch.name }), ...(Object.hasOwn(patch, 'date') && { date: patch.date }) }));
