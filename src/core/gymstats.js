// Gym stats (gym plan G5). Pure: gym state in, numbers and lists out; bundled exercise data only for muscles.
// Only finished workouts count. Weeks run Monday to Sunday and are built from date keys (logic.js), never from 24 h steps.
// A visit is a workout's `date`, so an edited date moves the visit. The home screen's own 3/4 comparison is the caller's job.
import { addDays, weekStart } from '../logic.js';
import { exerciseMap } from './exercises.js';

const arr = v => (Array.isArray(v) ? v : []);
const finished = gym => arr(gym?.workouts).filter(w => w && w.finishedAt !== null);
const counts = s => s.done && !s.warmup;
const inRange = (a, b) => d => d >= a && d <= b; // zero-padded keys compare as text

export const visitDates = gym => [...new Set(finished(gym).map(w => w.date))].sort();

export const weekKeys = key => { const s = weekStart(key); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };

const weekHas = (dates, start) => dates.filter(inRange(start, addDays(start, 6))).length;

export const visitsInWeek = (gym, key) => weekHas(visitDates(gym), weekStart(key));

// The `weeks` weeks ending with the week of todayKey, oldest first.
export function weeklyVisits(gym, todayKey, weeks = 12) {
  const dates = visitDates(gym), first = addDays(weekStart(todayKey), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => { const start = addDays(first, 7 * i); return { start, visits: weekHas(dates, start) }; });
}

export const visitsInMonth = (gym, month) => visitDates(gym).filter(d => d.slice(0, 7) === month).length; // month = 'YYYY-MM'

// The `months` months ending with the month of todayKey, oldest first.
export function monthlyVisits(gym, todayKey, months = 12) {
  const n = Number(todayKey.slice(0, 4)) * 12 + Number(todayKey.slice(5, 7)) - 1;
  return Array.from({ length: months }, (_, i) => {
    const k = n - (months - 1 - i), month = `${String(Math.floor(k / 12)).padStart(4, '0')}-${String((k % 12) + 1).padStart(2, '0')}`;
    return { month, visits: visitsInMonth(gym, month) };
  });
}

const setsVolume = sets => arr(sets).filter(counts).reduce((n, s) => n + s.weight * s.reps, 0);

export const workoutVolume = w => arr(w?.items).reduce((n, it) => n + setsVolume(it.sets), 0);

// One entry per exercise id in first-seen order; the same exercise in two items is merged.
export function volumeByExercise(w) {
  const m = new Map();
  for (const it of arr(w?.items)) m.set(it.exerciseId, (m.get(it.exerciseId) ?? 0) + setsVolume(it.sets));
  return [...m].map(([exerciseId, volume]) => ({ exerciseId, volume }));
}

// Done working sets of finished workouts in the week of `key`, credited to the primary muscle. An id nobody knows is "other".
export function setsPerMuscle(data, gym, key) {
  const names = exerciseMap(data, gym), start = weekStart(key), m = new Map();
  for (const w of finished(gym).filter(x => inRange(start, addDays(start, 6))(x.date))) {
    for (const it of arr(w.items)) {
      const muscle = names.get(it.exerciseId)?.muscle ?? 'other', n = arr(it.sets).filter(counts).length;
      if (n) m.set(muscle, (m.get(muscle) ?? 0) + n);
    }
  }
  return [...m].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets || (a.muscle < b.muscle ? -1 : 1));
}

// Epley, unrounded. null when the set does not qualify: not done, warm-up, no weight, or outside 1 to 10 reps.
export const est1RM = s => (!counts(s) || !(s.weight > 0) || !(s.reps >= 1 && s.reps <= 10) ? null : s.reps === 1 ? s.weight : (s.weight * (30 + s.reps)) / 30);

export const display1RM = x => Math.round(x * 10) / 10;

// Sets whose estimated 1RM is strictly above every earlier qualifying set of the exercise, by workout startedAt (ties keep list order).
// The first workout with a qualifying set is the baseline: all its sets, none marked.
export function prMarkers(gym, exerciseId) {
  const out = [];
  let best = null;
  for (const w of finished(gym).sort((a, b) => a.startedAt - b.startedAt)) {
    const found = [];
    arr(w.items).forEach((it, itemIndex) => {
      if (it.exerciseId === exerciseId) arr(it.sets).forEach((s, setIndex) => { const e1rm = est1RM(s); if (e1rm !== null) found.push({ itemIndex, setIndex, e1rm }); });
    });
    if (!found.length) continue;
    if (best === null) { best = Math.max(...found.map(f => f.e1rm)); continue; }
    for (const f of found) if (f.e1rm > best) { best = f.e1rm; out.push({ workoutId: w.id, ...f, date: w.date, startedAt: w.startedAt }); }
  }
  return out;
}
