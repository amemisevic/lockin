// Workout screen logic (gym plan G9, G9c): start or repeat on a chosen day, typed and stepped values, name and length, last time.
// Pure, DOM-free. No clocks: the app has no live timers.
import { dateKey } from '../logic.js';
import { startWorkout, editWorkout, editSet } from '../core/workouts.js';
import { repeatLastWorkout } from '../core/routines.js';

export const DEFAULT_MINUTES = 60;
export const NAME_MAX = 60;
export const NAME_MESSAGE = 'Name must be 60 characters or fewer.';
export const LENGTH_MESSAGE = 'Enter whole minutes, 1 to 600.';

// Start a workout, or repeat the last one, on `date` (default: the local date of nowMs). The core takes the date from
// nowMs, so another day is set with editWorkout; a refusal comes back alone, with no half-made workout.
export function begin(gym, nowMs, { date = dateKey(new Date(nowMs)), repeat = false, name = '' } = {}) {
  const r = repeat ? repeatLastWorkout(gym, nowMs) : startWorkout(gym, nowMs, name);
  if (!r.ok || date === dateKey(new Date(nowMs))) return r;
  const e = editWorkout(r.state, r.id, { date });
  return e.ok ? { ok: true, state: e.state, id: r.id } : e;
}

// Typed text: a point or a comma, at most two decimals. Anything else (empty, half typed, out of range) is null.
export function parseWeight(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(t)) return null;
  const n = Number(t.replace(',', '.'));
  return n <= 1000 ? n : null;
}

export function parseReps(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 ? n : null;
}

export const stepWeight = (w, dir) => Math.min(1000, Math.max(0, Math.round((w + dir * 2.5) * 100) / 100));
export const stepReps = (r, dir) => Math.min(999, Math.max(1, r + dir));

// Workout length in whole minutes, 1 to 600. Finish sets finishedAt to startedAt plus this.
export function parseMinutes(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 600 ? n : null;
}
export const finishTime = (startedAt, minutes) => startedAt + minutes * 60_000;

// Workout name: trimmed, blank allowed (the screen then says "Workout"), 60 UTF-16 units at most; null = refused.
export function parseName(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  return t.length <= NAME_MAX ? t : null;
}

// Same pick as the Prefill rule: the newest finished workout with a working set of the exercise, warm-ups left out.
export function lastTimeText(gym, exerciseId, excludeId = null) {
  let last = null;
  for (const w of gym.workouts) {
    if (w.finishedAt === null || w.id === excludeId || (last && w.startedAt < last.startedAt)) continue;
    const sets = (w.items.find(x => x.exerciseId === exerciseId)?.sets ?? []).filter(s => !s.warmup);
    if (sets.length) last = { startedAt: w.startedAt, sets };
  }
  return last ? last.sets.map(s => `${s.weight} × ${s.reps}`).join(' · ') : '';
}

// True empty sets (owner, 2026-10-27): a set not filled in yet stores reps and weight as null. The grey placeholder shows
// these values, and a step on an empty field enters them.
export const PLACEHOLDER = { reps: 1, weight: 0 };

// An exercise with no history comes in with the fixed default set (1 / 0): make its sets true empty sets.
export function blankItem(gym, id, ii) {
  const sets = gym.workouts.find(w => w.id === id)?.items[ii]?.sets ?? [];
  return sets.reduce((g, _, si) => { const r = editSet(g, id, ii, si, { reps: null, weight: null }); return r.ok ? r.state : g; }, gym);
}
