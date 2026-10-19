// Routine actions on the gym state (gym plan G4). Pure: state and nowMs in, new state out; never mutates.
// Success: { ok: true, state, id? }. Refusal: { ok: false, reason } and the caller keeps its state.
// Every result is checked with validateGym, so its codes (reps, weight, shape, id, …) pass straight through.
// Own codes: name-length, set-count, unknown-routine, unknown-workout, not-finished, no-history; startWorkout adds workout-open.
// Routines and workouts are found by id with ===.
import { validateGym } from './gym.js';
import { startWorkout, prefillSets } from './workouts.js';

const no = reason => ({ ok: false, reason });
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);

// Name: a string, 1 to 60 characters after trim. Returns the trimmed name or null.
const cleanName = n => { const t = typeof n === 'string' ? n.trim() : ''; return t.length >= 1 && t.length <= 60 ? t : null; };

// Keeps exerciseId and { reps, weight } only. Anything of the wrong type is passed on for validateGym to refuse.
const cleanItems = items => (!Array.isArray(items) ? items : items.map(it => (!isObj(it) ? it : {
  exerciseId: it.exerciseId,
  sets: Array.isArray(it.sets) ? it.sets.map(s => (isObj(s) ? { reps: s.reps, weight: s.weight } : s)) : it.sets,
})));
const hasEmptyItem = items => Array.isArray(items) && items.some(it => Array.isArray(it?.sets) && it.sets.length === 0);

// Gym state with new routines, checked.
function withRoutines(gym, routines, id) {
  const state = { ...gym, routines };
  const v = validateGym(state);
  return v.ok ? { ok: true, state, ...(id && { id }) } : v;
}

// Id = r-<nowMs>, plus -2, -3 … if taken.
function add(gym, nowMs, name, items) {
  const taken = new Set(gym.routines.map(r => r.id));
  let id = `r-${nowMs}`;
  for (let n = 2; taken.has(id); n++) id = `r-${nowMs}-${n}`;
  return withRoutines(gym, [...gym.routines, { id, name, createdAt: nowMs, items }], id);
}

export function createRoutine(gym, nowMs, name, items = []) {
  const n = cleanName(name);
  const list = cleanItems(items);
  return n === null ? no('name-length') : hasEmptyItem(list) ? no('set-count') : add(gym, nowMs, n, list);
}

// Working sets (not warm-ups, done or not, as Prefill ruling 14) become template rows; an exercise with none is left out.
export function saveRoutineFromWorkout(gym, workoutId, nowMs, name) {
  const w = gym.workouts.find(x => x.id === workoutId);
  if (!w) return no('unknown-workout');
  if (w.finishedAt === null) return no('not-finished');
  const n = cleanName(name);
  if (n === null) return no('name-length');
  const items = w.items
    .map(it => ({ exerciseId: it.exerciseId, sets: it.sets.filter(s => !s.warmup).map(s => ({ reps: s.reps, weight: s.weight })) }))
    .filter(it => it.sets.length > 0);
  return add(gym, nowMs, n, items);
}

// Only name and items are read from the patch; items replaces the whole list (order, set counts, add, remove).
export function editRoutine(gym, id, patch) {
  const i = gym.routines.findIndex(r => r.id === id);
  if (i < 0) return no('unknown-routine');
  if (!isObj(patch)) return no('shape');
  let r = gym.routines[i];
  if (Object.hasOwn(patch, 'name')) {
    const n = cleanName(patch.name);
    if (n === null) return no('name-length');
    r = { ...r, name: n };
  }
  if (Object.hasOwn(patch, 'items')) {
    const items = cleanItems(patch.items);
    if (hasEmptyItem(items)) return no('set-count');
    r = { ...r, items };
  }
  return withRoutines(gym, gym.routines.map((old, j) => (j === i ? r : old)));
}

// Workouts keep their routineId even when it no longer matches a routine.
export function deleteRoutine(gym, id) {
  const r = gym.routines.find(x => x.id === id);
  return !r ? no('unknown-routine') : withRoutines(gym, gym.routines.filter(x => x !== r));
}

// A new open workout (startWorkout: date, id, workout-open) with the given items, not done.
function begin(gym, nowMs, name, routineId, items) {
  const s = startWorkout(gym, nowMs, name);
  if (!s.ok) return s;
  const state = { ...s.state, workouts: s.state.workouts.map(w => (w.id === s.id ? { ...w, routineId, items } : w)) };
  const v = validateGym(state);
  return v.ok ? { ok: true, state, id: s.id } : v;
}

// The workout is named after the routine. Rows follow the Prefill rule with the routine item as template.
export function startRoutine(gym, id, nowMs) {
  const r = gym.routines.find(x => x.id === id);
  return !r ? no('unknown-routine') : begin(gym, nowMs, r.name, r.id, r.items.map(it => ({ exerciseId: it.exerciseId, sets: prefillSets(gym, it.exerciseId, it) })));
}

// Latest finished workout by startedAt (a tie goes to the later one in the list). Unnamed, no routine, rows by Prefill.
export function repeatLastWorkout(gym, nowMs) {
  let last = null;
  for (const w of gym.workouts) if (w.finishedAt !== null && (!last || w.startedAt >= last.startedAt)) last = w;
  return !last ? no('no-history') : begin(gym, nowMs, '', null, last.items.map(it => ({ exerciseId: it.exerciseId, sets: prefillSets(gym, it.exerciseId) })));
}
