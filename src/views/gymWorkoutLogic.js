// Workout screen logic (gym plan G9): start or repeat on a chosen day, typed and stepped values, clocks, last time. Pure, DOM-free.
import { dateKey } from '../logic.js';
import { startWorkout, editWorkout } from '../core/workouts.js';
import { repeatLastWorkout } from '../core/routines.js';

export const REST_CHOICES = [60, 90, 120, 180]; // seconds
export const DEFAULT_REST = 90;

// Start a workout, or repeat the last one, on `date` (default: the local date of nowMs). The core takes the date from
// nowMs, so another day is set with editWorkout; a refusal comes back alone, with no half-made workout.
export function begin(gym, nowMs, { date = dateKey(new Date(nowMs)), repeat = false } = {}) {
  const r = repeat ? repeatLastWorkout(gym, nowMs) : startWorkout(gym, nowMs);
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

const pad = n => String(n).padStart(2, '0');
export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export const elapsedSec = (startedAt, now) => Math.max(0, Math.floor((now - startedAt) / 1000));

// Everything comes from the stored end time and the clock now, so a locked phone or a backgrounded app cannot make it drift.
export function restState(end, now) {
  if (end == null) return { kind: 'idle' };
  const left = end - now;
  return left <= 0 ? { kind: 'over', text: 'Rest over' } : { kind: 'running', secs: Math.ceil(left / 1000), text: fmtClock(Math.ceil(left / 1000)) };
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
