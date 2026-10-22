import test from 'node:test';
import assert from 'node:assert/strict';
import { statsModel } from '../src/views/gymStatsLogic.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G11s Stats view model. Pure, DOM-free; today is a parameter. All expected values below were worked out by hand.
// statsModel(data, gym, today, { picked = null, settled = true }) =
//   { empty,
//     weeks:  { values[12], starts[12], target, max, first, last, label },
//     months: { values[12], months[12], max, first, last, label },
//     muscles: null | [{ muscle, name, sets, share, label }],      (null = exercise list not available)
//     weight: null | { options[{id,name}], id, name, points[{n,date,kg,text,x,y,first,last,fifth,show}], yTicks[{v,text,y}], xTicks[{n,x}],
//               plot{left,right,top,bottom}, width, height, wide, summary, dates, rows[], label } }

const T = (y, m, d, hh = 10) => new Date(y, m - 1, d, hh).getTime();
const D = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const A = (exerciseId, sets) => ({ exerciseId, sets });
const wk = (id, date, items, o = {}) => {
  const [y, m, d] = date.split('-').map(Number), s = T(y, m, d);
  return { id, date, startedAt: s, finishedAt: s + 3_600_000, name: id, routineId: null, items, ...o };
};
const g = (workouts, o = {}) => ({ ...emptyGym(), workouts, ...o });
const DATA = { exercises: [
  { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
  { id: 'pushdown', name: 'Triceps Pushdown', equipment: 'cable', muscle: 'triceps', category: 'strength' },
  { id: 'row', name: 'Barbell Row', equipment: 'barbell', muscle: 'back', category: 'strength' },
  { id: 'squat', name: 'Squat', equipment: 'barbell', muscle: 'quadriceps', category: 'strength' },
], muscles: ['chest', 'other'], equipment: ['barbell', 'other'] };
const TODAY = '2026-10-12'; // a Monday
const R = [A('row', [ws(10, 50)])]; // any valid one-set workout body

// ---- visits ----
// Rules example: finished on 10-05, 10-07 (two), 10-11, 10-12. Also 09-30, 08-10 and 07-20 (outside the 12 weeks), and an OPEN one on 10-13.
const VISITS = g([
  wk('a1', '2026-07-20', R), wk('a2', '2026-08-10', R), wk('a3', '2026-09-30', R),
  wk('b1', '2026-10-05', R), wk('b2', '2026-10-07', R), wk('b3', '2026-10-07', R), wk('b4', '2026-10-11', R), wk('b5', '2026-10-12', R),
  wk('open', '2026-10-13', R, { finishedAt: null }),
]);

test('weeks: 12 Monday-based weeks ending with this week; two workouts on one day are one visit; open workouts never count', () => {
  const m = statsModel(DATA, VISITS, TODAY);
  assert.equal(m.empty, false);
  assert.equal(m.weeks.starts.length, 12);
  assert.equal(m.weeks.starts[0], '2026-07-27');
  assert.equal(m.weeks.starts[11], '2026-10-12');
  assert.deepEqual(m.weeks.values, [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 1]);
});

test('weeks: target, headroom, captions and the spoken label', () => {
  const w = statsModel(DATA, VISITS, TODAY).weeks;
  assert.equal(w.target, 4);
  assert.equal(w.max, 5); // max(target 4, peak 3) + 1
  assert.equal(w.first, '27 Jul');
  assert.equal(w.last, 'This week');
  assert.equal(w.label, 'Visits per week for the last 12 weeks, oldest first, target 4: 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 1');
});

test('weeks: the scale follows the target and the peak', () => {
  assert.equal(statsModel(DATA, { ...VISITS, settings: { weeklyTarget: 7 } }, TODAY).weeks.max, 8);
  const one = statsModel(DATA, { ...VISITS, settings: { weeklyTarget: 1 } }, TODAY).weeks;
  assert.equal(one.target, 1);
  assert.equal(one.max, 4); // peak 3 + 1
});

test('months: 12 months ending with this one; October = 4 visits (5, 7, 11, 12)', () => {
  const m = statsModel(DATA, VISITS, TODAY).months;
  assert.equal(m.months.length, 12);
  assert.equal(m.months[0], '2025-11');
  assert.equal(m.months[11], '2026-10');
  assert.deepEqual(m.values, [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 4]);
  assert.equal(m.max, 4);
  assert.equal(m.first, 'Nov 2025');
  assert.equal(m.last, 'Oct 2026');
  assert.equal(m.label, 'Visits per month for the last 12 months, oldest first: 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 4');
});

test('months: a quiet year still has a scale of at least 1', () => {
  const m = statsModel(DATA, g([wk('x', '2026-10-12', R, { finishedAt: null })]), TODAY).months;
  assert.deepEqual(m.values, new Array(12).fill(0));
  assert.equal(m.max, 1);
});

test('no finished workout at all: empty is true and there is nothing to chart', () => {
  const m = statsModel(DATA, emptyGym(), TODAY);
  assert.equal(m.empty, true);
  assert.equal(m.exercise, null);
  const open = statsModel(DATA, g([wk('x', '2026-10-12', R, { finishedAt: null })]), TODAY);
  assert.equal(open.empty, true);
});

// ---- sets per muscle (this week) ----
// Rules example: bench 3 working sets + 1 warm-up, pushdown 3 sets: chest 3, triceps 3. Row 2 done + 1 not done = back 2. An unknown id = Other 2.
const MUSCLE = g([
  wk('m1', '2026-10-12', [
    A('bench', [ws(10, 40, { warmup: true }), ws(8, 80), ws(8, 80), ws(7, 77.5)]),
    A('pushdown', [ws(12, 30), ws(12, 30), ws(12, 30)]),
    A('row', [ws(10, 50), ws(10, 50), ws(10, 50, { done: false })]),
    A('ghost', [ws(10, 20), ws(10, 20)]),
  ]),
  wk('m0', '2026-10-05', [A('squat', [ws(5, 100), ws(5, 100), ws(5, 100)])]), // last week
  wk('mo', '2026-10-13', [A('bench', [ws(5, 80), ws(5, 80), ws(5, 80), ws(5, 80), ws(5, 80)])], { finishedAt: null }), // open
]);

test('muscles: done working sets this week, primary muscle, sorted by sets then name', () => {
  const rows = statsModel(DATA, MUSCLE, TODAY).muscles;
  assert.deepEqual(rows.map(r => [r.muscle, r.name, r.sets]), [['chest', 'Chest', 3], ['triceps', 'Triceps', 3], ['back', 'Back', 2], ['other', 'Other', 2]]);
});

test('muscles: share is sets over the top row; labels spell the count', () => {
  const rows = statsModel(DATA, MUSCLE, TODAY).muscles;
  assert.deepEqual(rows.map(r => r.share.toFixed(4)), ['1.0000', '1.0000', '0.6667', '0.6667']);
  assert.deepEqual(rows.map(r => r.label), ['Chest: 3 sets', 'Triceps: 3 sets', 'Back: 2 sets', 'Other: 2 sets']);
});

test('muscles: one set reads "1 set"; a week with no sets is an empty list; last week is not this week', () => {
  const one = g([wk('x', '2026-10-12', [A('bench', [ws(5, 80)])])]);
  assert.equal(statsModel(DATA, one, TODAY).muscles[0].label, 'Chest: 1 set');
  assert.deepEqual(statsModel(DATA, g([wk('x', '2026-10-05', [A('bench', [ws(5, 80)])])]), TODAY).muscles, []);
});

test('muscles: no exercise list (null data) gives null, not guesses', () => {
  assert.equal(statsModel(null, MUSCLE, TODAY).muscles, null);
});

// ---- weight progress ----
// The heaviest done working set (warm-ups out, weight above 0) of each workout. bench: 80 (20 Sep), 60 (27 Sep: the 100 x 1 warm-up and
// the 50 x 12 do not win), 85 (5 Oct: two bench items, 82.5 and 85, ONE point), 82.5 (12 Oct: the undone 200 does not count). Row: 50 on 10 Oct.
const EX = g([
  wk('b1', '2026-09-20', [A('bench', [ws(5, 80)])]),
  wk('b2', '2026-09-27', [A('bench', [ws(1, 100, { warmup: true }), ws(10, 60), ws(12, 50)])]),
  wk('b3', '2026-10-05', [A('bench', [ws(5, 82.5)]), A('bench', [ws(3, 85)])]),
  wk('r1', '2026-10-10', [A('row', [ws(10, 50)])]),
  wk('b4', '2026-10-12', [A('bench', [ws(5, 82.5), ws(5, 200, { done: false })])]),
]);
// Geometry: the box is 44 + plot + 50 wide (plot = 226 up to 17 workouts, else 14 per gap) and 24 + 150 + 44 = 218 high. Workouts are spread
// evenly from plot.left to plot.right, the top tick at plot.top, the bottom tick at plot.bottom. Bench: ticks 60 to 85 step 5.
const series = weights => g(weights.map((w, i) => wk(`s${i}`, D(2026, 8, 1 + i), [A('bench', [ws(5, w)])])));
const ramp = n => series(Array.from({ length: n }, (_, i) => 50 + (i * 5) / 2)); // 50, 52.5, 55 ...

test('weight: options most recently trained first; the first one is selected by default', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.deepEqual(e.options, [{ id: 'bench', name: 'Barbell Bench Press' }, { id: 'row', name: 'Barbell Row' }]);
  assert.equal(e.id, 'bench');
  assert.equal(e.name, 'Barbell Bench Press');
  assert.equal(statsModel(DATA, EX, TODAY).exercise, undefined, 'the 1RM model is gone');
});

test('weight: one point per workout, the heaviest working set, text without a needless .0', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.deepEqual(e.points.map(p => [p.n, p.date, p.kg, p.text]), [[1, '2026-09-20', 80, '80'], [2, '2026-09-27', 60, '60'], [3, '2026-10-05', 85, '85'], [4, '2026-10-12', 82.5, '82.5']]);
});

test('weight: the box, the plot, the y ticks (60 to 85 step 5) and the x ticks (first and last workout)', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.deepEqual([e.width, e.height, e.wide], [320, 218, false]);
  assert.deepEqual(e.plot, { left: 44, right: 270, top: 24, bottom: 174 });
  assert.deepEqual(e.yTicks.map(t => [t.v, t.text, t.y]), [[60, '60', 174], [65, '65', 144], [70, '70', 114], [75, '75', 84], [80, '80', 54], [85, '85', 24]]);
  assert.deepEqual(e.xTicks, [{ n: 1, x: 44 }, { n: 4, x: 270 }]);
});

test('weight: points are spread evenly, the heaviest at the top tick', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.deepEqual(e.points.map(p => [p.x, p.y]), [[44, 54], [119.33, 174], [194.67, 24], [270, 39]]);
});

test('weight: first and latest are flagged and labelled; nothing else is (4 workouts, no 5th)', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.deepEqual(e.points.map(p => [p.first, p.last, p.fifth, p.show]), [[true, false, false, true], [false, false, false, false], [false, false, false, false], [false, true, false, true]]);
});

test('weight: every 5th workout (5, 10, 15 ...) is a labelled dot, with the workout number as its x tick', () => {
  const e = statsModel(DATA, ramp(12), TODAY).weight;
  assert.deepEqual(e.points.filter(p => p.show).map(p => [p.n, p.text, p.first, p.last, p.fifth]),
    [[1, '50', true, false, false], [5, '60', false, false, true], [10, '72.5', false, false, true], [12, '77.5', false, true, false]]);
  assert.deepEqual(e.yTicks.map(t => t.v), [50, 60, 70, 80]);
  assert.equal(e.points[4].x, 126.18); // 44 + 4 * 226 / 11
  assert.equal(e.points[4].y, 124); // 24 + (80 - 60) / 30 * 150
  assert.deepEqual(e.xTicks.map(t => t.n), [1, 5, 10, 12]);
});

test('weight: the last x tick is left out when it would touch the one before (11 workouts: 1, 5, 10)', () => {
  assert.deepEqual(statsModel(DATA, ramp(11), TODAY).weight.xTicks.map(t => t.n), [1, 5, 10]);
  assert.deepEqual(statsModel(DATA, ramp(10), TODAY).weight.xTicks.map(t => t.n), [1, 5, 10]);
});

test('weight: a 5th workout that is also the latest is flagged last and fifth, and shown once', () => {
  const e = statsModel(DATA, ramp(5), TODAY).weight;
  assert.deepEqual(e.points.map(p => [p.first, p.last, p.fifth, p.show]), [[true, false, false, true], [false, false, false, false], [false, false, false, false], [false, false, false, false], [false, true, true, true]]);
});

test('weight: ALL workouts are shown, none cut; past 17 workouts the chart gets wider and scrolls (14 per gap)', () => {
  const e = statsModel(DATA, ramp(30), TODAY).weight;
  assert.equal(e.points.length, 30);
  assert.deepEqual([e.width, e.wide, e.plot.right], [500, true, 450]); // 44 + 29 * 14 + 50
  assert.equal(e.points[29].x, 450);
  assert.equal(e.points[1].x - e.points[0].x, 14);
  assert.deepEqual(e.xTicks.map(t => t.n), [1, 5, 10, 15, 20, 25, 30]);
  assert.equal(e.rows.length, 30);
  assert.equal(statsModel(DATA, ramp(17), TODAY).weight.wide, false);
  assert.equal(statsModel(DATA, ramp(18), TODAY).weight.wide, true);
});

test('weight: one workout sits in the middle; equal weights are level in the middle of a 3 kg axis', () => {
  const row = statsModel(DATA, EX, TODAY, { picked: 'row' }).weight;
  assert.equal(row.points.length, 1);
  assert.deepEqual([row.points[0].x, row.points[0].y, row.points[0].first, row.points[0].last], [157, 99, true, true]);
  assert.deepEqual(row.yTicks.map(t => t.v), [49, 50, 51]);
  assert.deepEqual(row.xTicks, [{ n: 1, x: 157 }]);
  const level = statsModel(DATA, series([60, 60]), TODAY).weight;
  assert.deepEqual(level.points.map(p => [p.x, p.y]), [[44, 99], [270, 99]]);
  assert.deepEqual(level.yTicks.map(t => t.v), [59, 60, 61]);
});

test('weight: start, now and the change; first and latest date; the list under the chart; the spoken label', () => {
  const e = statsModel(DATA, EX, TODAY).weight;
  assert.equal(e.summary, 'Start 80 kg, now 82.5 kg, +2.5 kg');
  assert.equal(e.dates, 'First workout 20 Sep 2026, latest 12 Oct 2026');
  assert.deepEqual(e.rows, ['Workout 1 · 20 Sep 2026 · 80 kg', 'Workout 2 · 27 Sep 2026 · 60 kg', 'Workout 3 · 5 Oct 2026 · 85 kg', 'Workout 4 · 12 Oct 2026 · 82.5 kg']);
  assert.equal(e.label, 'Weight progress, Barbell Bench Press, 4 workouts, oldest first: 80, 60, 85, 82.5 kg');
});

test('weight: a drop reads with a minus, no change reads +0, one workout reads "1 workout"', () => {
  assert.equal(statsModel(DATA, series([100, 90]), TODAY).weight.summary, 'Start 100 kg, now 90 kg, -10 kg');
  assert.equal(statsModel(DATA, series([60, 70, 60]), TODAY).weight.summary, 'Start 60 kg, now 60 kg, +0 kg');
  assert.equal(statsModel(DATA, series([22.25, 24]), TODAY).weight.summary, 'Start 22.25 kg, now 24 kg, +1.75 kg');
  const row = statsModel(DATA, EX, TODAY, { picked: 'row' }).weight;
  assert.equal(row.summary, 'Start 50 kg, now 50 kg, +0 kg');
  assert.equal(row.dates, 'First workout 10 Oct 2026, latest 10 Oct 2026');
  assert.equal(row.label, 'Weight progress, Barbell Row, 1 workout, oldest first: 50 kg');
});

test('weight: an unknown, odd or inherited picked id falls back to the default', () => {
  for (const picked of ['nope', 'toString', '__proto__', '', null, undefined, 5]) assert.equal(statsModel(DATA, EX, TODAY, { picked }).weight.id, 'bench', String(picked));
});

test('weight: no working set with a weight above 0 = no chart (warm-up only, 0 kg only)', () => {
  const none = g([wk('w', '2026-10-12', [A('bench', [ws(5, 80, { warmup: true })]), A('row', [ws(10, 0)])])]);
  assert.equal(statsModel(DATA, none, TODAY).weight, null);
  assert.equal(statsModel(DATA, none, TODAY).empty, false);
});

test('weight: names come from custom exercises; an unknown id says so, or says Loading while the list loads', () => {
  const custom = g([wk('w', '2026-10-12', [A('custom-1', [ws(5, 40)]), A('ghost', [ws(5, 30)])])],
    { customExercises: [{ id: 'custom-1', name: 'My Lift', muscle: 'chest', equipment: 'other' }] });
  assert.deepEqual(statsModel(DATA, custom, TODAY).weight.options.map(o => o.name), ['My Lift', 'Unknown exercise']);
  assert.deepEqual(statsModel(null, custom, TODAY, { settled: false }).weight.options.map(o => o.name), ['My Lift', 'Loading…']);
  assert.deepEqual(statsModel(null, custom, TODAY, { settled: true }).weight.options.map(o => o.name), ['My Lift', 'Unknown exercise']);
});

test('the input is not changed and a dirty state does not throw', () => {
  const before = JSON.stringify(EX);
  statsModel(DATA, EX, TODAY);
  assert.equal(JSON.stringify(EX), before);
  assert.doesNotThrow(() => statsModel(DATA, { workouts: [null, { finishedAt: 5, startedAt: 5, date: '2026-10-12', items: null }] }, TODAY));
  assert.doesNotThrow(() => statsModel(DATA, emptyGym(), TODAY, { picked: '__proto__' }));
});
