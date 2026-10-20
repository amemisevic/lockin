// Routine screen logic (gym plan G10): names, set counts, order, new items, start. Pure, DOM-free, no clocks.
// State changes go through src/core/routines.js and workouts.js; this only shapes input for them.
import { prefillSets, editWorkout } from '../core/workouts.js';
import { startRoutine } from '../core/routines.js';

export const MAX_SETS = 20; // per exercise in a routine (the plan's worst case); the core sets no upper bound
export const ROUTINE_NAME_MESSAGE = 'Name must be 1 to 60 characters.';

// Routine name: trimmed, 1 to 60 UTF-16 units (as the core counts); anything else is null.
export function parseRoutineName(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  return t.length >= 1 && t.length <= 60 ? t : null;
}

// The id travels in the hash; any character is escaped on the way in and a broken escape is left as it was.
export const routineHref = id => `#gym/routine/${encodeURIComponent(id)}`;
export function routineIdFromParam(param) {
  try { return decodeURIComponent(param); } catch { return param; }
}

// Sets resized to n (1 to MAX_SETS): shrinking keeps the first sets, growing repeats the last one. New objects, input untouched.
export function withSetCount(item, n) {
  const want = Math.min(MAX_SETS, Math.max(1, Math.trunc(Number(n)) || 1));
  const sets = item.sets.slice(0, want).map(s => ({ reps: s.reps, weight: s.weight }));
  const last = sets[sets.length - 1] ?? { reps: 1, weight: 0 };
  while (sets.length < want) sets.push({ reps: last.reps, weight: last.weight });
  return { ...item, sets };
}

// Swaps item i with its neighbour (dir -1 up, 1 down); out of range or at an end the order stays. Returns a new array.
export function moveItem(items, i, dir) {
  const j = i + dir;
  if (!Number.isInteger(i) || i < 0 || i >= items.length || j < 0 || j >= items.length) return [...items];
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// A routine item for an exercise added by hand: the Prefill rule (last time's working sets), at most MAX_SETS.
export function newItem(gym, exerciseId) {
  const sets = prefillSets(gym, exerciseId);
  return withSetCount({ exerciseId, sets }, sets.length); // also drops done / warmup: a routine row is reps and weight only
}

// startRoutine names the workout after the routine; a typed name replaces that. A refusal comes back alone.
export function startFromRoutine(gym, id, nowMs, name) {
  const typed = typeof name === 'string' ? name.trim() : '';
  if (typed.length > 60) return { ok: false, reason: 'name-length' };
  const r = startRoutine(gym, id, nowMs);
  if (!r.ok || typed === '') return r;
  const e = editWorkout(r.state, r.id, { name: typed });
  return e.ok ? { ok: true, state: e.state, id: r.id } : e;
}
