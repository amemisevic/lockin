// Gym Stats view model (gym plan G11 Stats). Pure and DOM-free: today is a parameter, the numbers come from src/core/gymstats.js.
// Numbers become display strings and chart geometry here; the views only draw. The weight chart box is described above `weight()`.
import { weeklyVisits, monthlyVisits, setsPerMuscle, weightSeries, weightExercises, visitDates } from '../core/gymstats.js';
import { exerciseMap } from '../core/exercises.js';
import { weeklyTarget } from '../core/gym.js';
import { dayLabel } from './tasksLogic.js';

const list = v => v.join(', ');
const plural = (n, one, many) => (n === 1 ? one : many);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const r2 = x => Math.round(x * 100) / 100;
const kg = x => String(r2(x)); // 80, 82.5, 22.25 (no needless .0)
const dm = key => { const [, d, m] = dayLabel(key).split(' '); return `${d} ${m.slice(0, 3)}`; }; // '27 Jul'
const dmy = key => `${dm(key)} ${key.slice(0, 4)}`; // '27 Jul 2026'

function weeks(gym, today) {
  const rows = weeklyVisits(gym, today, 12), values = rows.map(r => r.visits);
  const target = weeklyTarget(gym); // null = switched off (G13): no target in the numbers, the scale or the label
  return { values, starts: rows.map(r => r.start), target, max: Math.max(target ?? 0, ...values, 1) + 1, first: dm(rows[0].start), last: 'This week',
    label: `Visits per week for the last 12 weeks, oldest first${target === null ? '' : `, target ${target}`}: ${list(values)}` };
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

// id null = nothing picked (the section starts empty); the options are always there.
// Weight chart box: 44 left (kg ticks and title), 24 top (labels above the highest point), 150 plot height, 44 bottom (workout ticks and
// title), 50 right (the latest label sits beside its dot). The plot is 226 wide up to 17 workouts, then 14 per gap and the chart scrolls.
const PAD = { l: 44, r: 50, t: 24, b: 44 }, PLOT_H = 150, PLOT_MIN = 226, GAP = 14, MIN_TICK_GAP = 24;
const KG_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]; // whole kg only, so a tick label is at most 3 characters

// Ticks on a round step, at most 5 gaps; equal weights get one tick above and below so the line sits in the middle.
function kgAxis(lo, hi) {
  const step = KG_STEPS.find(s => Math.max(hi - lo, 1) / s <= 5) ?? 1000;
  let min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
  if (min === max) { min -= step; max += step; }
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => r2(min + i * step)) };
}

function weight(data, gym, picked, settled) {
  const ids = weightExercises(gym);
  if (!ids.length) return null;
  const names = exerciseMap(data, gym), nameOf = id => names.get(id)?.name || (settled ? 'Unknown exercise' : 'Loading…');
  const options = ids.map(i => ({ id: i, name: nameOf(i) }));
  if (typeof picked !== 'string' || !ids.includes(picked)) return { options, id: null }; // nothing picked: the view shows a placeholder
  const id = picked;
  const series = weightSeries(gym, id), n = series.length, kgs = series.map(p => p.weight);
  const axis = kgAxis(Math.min(...kgs), Math.max(...kgs));
  const plotW = Math.max(PLOT_MIN, (n - 1) * GAP), plot = { left: PAD.l, right: PAD.l + plotW, top: PAD.t, bottom: PAD.t + PLOT_H };
  const px = i => (n === 1 ? plot.left + plotW / 2 : r2(plot.left + (i * plotW) / (n - 1)));
  const py = v => r2(plot.top + ((axis.max - v) / (axis.max - axis.min)) * PLOT_H);
  const points = series.map((p, i) => {
    const first = i === 0, last = i === n - 1, fifth = (i + 1) % 5 === 0;
    return { n: i + 1, date: p.date, kg: p.weight, text: kg(p.weight), x: px(i), y: py(p.weight), first, last, fifth, show: first || last || fifth };
  });
  const xTicks = [1, ...Array.from({ length: Math.floor(n / 5) }, (_, i) => 5 * (i + 1))].filter((v, i, a) => a.indexOf(v) === i && v <= n).map(v => ({ n: v, x: px(v - 1) }));
  if (n > 1 && !xTicks.some(t => t.n === n) && px(n - 1) - xTicks.at(-1).x >= MIN_TICK_GAP) xTicks.push({ n, x: px(n - 1) });
  const name = nameOf(id), delta = r2(kgs.at(-1) - kgs[0]);
  return { options, id, name, points, xTicks, plot,
    yTicks: axis.ticks.map(v => ({ v, text: kg(v), y: py(v) })), width: plot.right + PAD.r, height: plot.bottom + PAD.b, wide: plotW > PLOT_MIN,
    summary: `Start ${kg(kgs[0])} kg, now ${kg(kgs.at(-1))} kg, ${delta < 0 ? '-' : '+'}${kg(Math.abs(delta))} kg`,
    dates: `First workout ${dmy(series[0].date)}, latest ${dmy(series.at(-1).date)}`,
    rows: series.map((p, i) => `Workout ${i + 1} · ${dmy(p.date)} · ${kg(p.weight)} kg`),
    label: `Weight progress, ${name}, ${n} ${plural(n, 'workout', 'workouts')}, oldest first: ${list(points.map(p => p.text))} kg` };
}

// data null = the exercise list is not here (yet); settled = it has loaded or failed (decides Loading… vs Unknown exercise).
export function statsModel(data, gym, today, { picked = null, settled = true } = {}) {
  return { empty: visitDates(gym).length === 0, weeks: weeks(gym, today), months: months(gym, today), muscles: muscles(data, gym, today),
    weight: weight(data, gym, picked, settled) };
}
