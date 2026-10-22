// Gym Stats view model (gym plan G11 Stats). Pure and DOM-free: today is a parameter, the numbers come from src/core/gymstats.js.
// Numbers become display strings and chart geometry here; the views only draw. The 1RM chart box is 320 x 120 with 10 padding.
import { weeklyVisits, monthlyVisits, setsPerMuscle, e1rmSeries, prMarkers, display1RM, trainedExercises, visitDates } from '../core/gymstats.js';
import { exerciseMap } from '../core/exercises.js';
import { dayLabel } from './tasksLogic.js';

export const W = 320, H = 120, PAD = 10, MAX_POINTS = 20;

const list = v => v.join(', ');
const plural = (n, one, many) => (n === 1 ? one : many);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const kg = x => display1RM(x).toFixed(1);
const dm = key => { const [, d, m] = dayLabel(key).split(' '); return `${d} ${m.slice(0, 3)}`; }; // '27 Jul'
const dmy = key => `${dm(key)} ${key.slice(0, 4)}`; // '27 Jul 2026'

function weeks(gym, today) {
  const rows = weeklyVisits(gym, today, 12), values = rows.map(r => r.visits);
  const target = gym?.settings?.weeklyTarget ?? 4;
  return { values, starts: rows.map(r => r.start), target, max: Math.max(target, ...values, 1) + 1, first: dm(rows[0].start), last: 'This week',
    label: `Visits per week for the last 12 weeks, oldest first, target ${target}: ${list(values)}` };
}

function months(gym, today) {
  const rows = monthlyVisits(gym, today, 12), values = rows.map(r => r.visits), at = m => `${dm(`${m}-01`).split(' ')[1]} ${m.slice(0, 4)}`;
  return { values, months: rows.map(r => r.month), max: Math.max(...values, 1), first: at(rows[0].month), last: at(rows[11].month),
    label: `Visits per month for the last 12 months, oldest first: ${list(values)}` };
}

function muscles(data, gym, today) {
  if (!data) return null;
  const rows = setsPerMuscle(data, gym, today), top = rows[0]?.sets ?? 1;
  return rows.map(r => ({ ...r, name: cap(r.muscle), share: r.sets / top, label: `${cap(r.muscle)}: ${r.sets} ${plural(r.sets, 'set', 'sets')}` }));
}

// Evenly spaced left to right; the highest value is at the top. One point sits in the middle, equal values on the middle line.
function place(series) {
  const es = series.map(p => p.e1rm), hi = Math.max(...es), lo = Math.min(...es), n = series.length;
  return series.map((p, i) => ({ x: n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1),
    y: hi === lo ? H / 2 : Math.round((PAD + ((hi - p.e1rm) / (hi - lo)) * (H - 2 * PAD)) * 100) / 100 }));
}

function exercise(data, gym, picked, settled) {
  const ids = trainedExercises(gym);
  if (!ids.length) return null;
  const names = exerciseMap(data, gym), nameOf = id => names.get(id)?.name || (settled ? 'Unknown exercise' : 'Loading…');
  const id = typeof picked === 'string' && ids.includes(picked) ? picked : ids[0];
  const series = e1rmSeries(gym, id), prIds = new Set(prMarkers(gym, id).map(m => m.workoutId));
  const shown = series.slice(-MAX_POINTS), at = place(shown);
  const points = shown.map((p, i) => ({ date: p.date, x: at[i].x, y: at[i].y, text: display1RM(p.e1rm).toFixed(1), pr: prIds.has(p.workoutId) }));
  const name = nameOf(id), best = Math.max(...series.map(p => p.e1rm));
  return { options: ids.map(i => ({ id: i, name: nameOf(i) })), id, name, points,
    prs: points.filter(p => p.pr).map(p => ({ text: `${dmy(p.date)} · ${p.text} kg · PR` })),
    tiles: [['Latest', `${kg(series.at(-1).e1rm)} kg`], ['Best', `${kg(best)} kg`], ['PRs', String(series.filter(p => prIds.has(p.workoutId)).length)]],
    first: dmy(shown[0].date), last: dmy(shown.at(-1).date),
    note: series.length > shown.length ? `Showing the latest ${shown.length} of ${series.length} workouts.` : '',
    label: `Estimated 1RM, ${name}, ${points.length} ${plural(points.length, 'workout', 'workouts')}, oldest first: ${list(points.map(p => (p.pr ? `${p.text} PR` : p.text)))} kg` };
}

// data null = the exercise list is not here (yet); settled = it has loaded or failed (decides Loading… vs Unknown exercise).
export function statsModel(data, gym, today, { picked = null, settled = true } = {}) {
  return { empty: visitDates(gym).length === 0, weeks: weeks(gym, today), months: months(gym, today), muscles: muscles(data, gym, today),
    exercise: exercise(data, gym, picked, settled) };
}
