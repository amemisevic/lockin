// History logic (gym plan G11): the month-grouped list and the detail model of one finished workout. Pure, DOM-free, no clocks.
// State changes go through src/core/workouts.js and routines.js; this only shapes what the screens show and say.
import { prMarkers } from '../core/gymstats.js';
import { addSet, toggleDone } from '../core/workouts.js';
import { dayLabel } from './tasksLogic.js';
import { workoutRow } from './gymHomeLogic.js';

export const DATE_BAD = 'Enter a valid date.';
export const DATE_FUTURE = "The date can't be in the future.";
export const NO_SETS_MESSAGE = 'A workout needs at least one done working set.';
export const SAVE_FAILED = 'That change could not be saved.';

// The id travels in the hash; any character is escaped on the way in and a broken escape is left as it was.
export const historyHref = id => `#gym/history/${encodeURIComponent(id)}`;
export function workoutIdFromParam(param) {
  try { return decodeURIComponent(param); } catch { return param; }
}

const finished = gym => (Array.isArray(gym?.workouts) ? gym.workouts : []).filter(w => w.finishedAt !== null);

// Finished workouts grouped by the month of their date, newest first. Order inside a month: date, then start, then later in the list.
export function historyGroups(gym) {
  const rows = finished(gym).map((w, i) => ({ w, i })).sort((a, b) => (a.w.date < b.w.date ? 1 : a.w.date > b.w.date ? -1 : 0) || b.w.startedAt - a.w.startedAt || b.i - a.i);
  const groups = [];
  for (const { w } of rows) {
    const month = w.date.slice(0, 7);
    if (groups.at(-1)?.month !== month) groups.push({ month, label: `${dayLabel(w.date).split(' ')[2]} ${w.date.slice(0, 4)}`, rows: [] });
    groups.at(-1).rows.push(workoutRow(w));
  }
  return groups;
}

export function historySummary(gym) {
  const n = finished(gym).length;
  return n === 0 ? 'No workouts yet' : `${n} ${n === 1 ? 'workout' : 'workouts'}`;
}

// Per exercise in the workout: the core's PR marker with the best estimated 1RM, as "item:set". The core marks every set that
// beats the running best; the screen shows one PR per exercise per workout (ruling 5).
function prKeys(gym, w) {
  const keys = new Set();
  for (const id of new Set(w.items.map(it => it.exerciseId))) {
    const best = prMarkers(gym, id).filter(m => m.workoutId === w.id).reduce((a, m) => (a && a.e1rm >= m.e1rm ? a : m), null);
    if (best) keys.add(`${best.itemIndex}:${best.setIndex}`);
  }
  return keys;
}

// null for an unknown id or a workout that is still open (not history).
export function detailModel(gym, id) {
  const w = finished(gym).find(x => x.id === id);
  if (!w) return null;
  const pr = prKeys(gym, w);
  return {
    id: w.id, name: w.name, date: w.date, minutes: Math.round((w.finishedAt - w.startedAt) / 60_000),
    items: w.items.map((it, ii) => ({ exerciseId: it.exerciseId,
      sets: it.sets.map((s, si) => ({ n: si + 1, weight: s.weight, reps: s.reps, warmup: s.warmup, done: s.done, pr: pr.has(`${ii}:${si}`) })) })),
  };
}

export const lengthText = minutes => (minutes >= 1 ? `${minutes} min` : 'Under 1 min');

// A key in YYYY-MM-DD, not after today (keys compare as text). Whether it is a real calendar day is the core's call.
export function checkDate(text, today) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false, message: DATE_BAD };
  return text > today ? { ok: false, message: DATE_FUTURE } : { ok: true, date: text };
}

export const refusalMessage = reason => (reason === 'no-sets' ? NO_SETS_MESSAGE : reason === 'date' ? DATE_BAD : SAVE_FAILED);

// A set added to a finished workout counts at once: the core adds it undone, so it is marked done in the same step.
export function addDoneSet(gym, id, ii) {
  const a = addSet(gym, id, ii);
  if (!a.ok) return a;
  const w = a.state.workouts.find(x => x.id === id);
  return toggleDone(a.state, id, ii, w.items[ii].sets.length - 1);
}
