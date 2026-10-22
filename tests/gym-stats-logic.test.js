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
//     exercise: null | { options[{id,name}], id, name, points[{date,x,y,text,pr}], prs[{text}], tiles[[label,value]], label, first, last, note } }

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

// ---- estimated 1RM ----
// bench: 80 x 5 = 93.33 (baseline), 60 x 10 = 80.0 (warm-up 100 x 1 and 50 x 12 do not qualify), 82.5 x 5 = 96.25 (a PR), 80 x 5 = 93.33 (not a PR).
// row on 10-10: 50 x 10 = 66.67.
const EX = g([
  wk('b1', '2026-09-20', [A('bench', [ws(5, 80)])]),
  wk('b2', '2026-09-27', [A('bench', [ws(1, 100, { warmup: true }), ws(10, 60), ws(12, 50)])]),
  wk('b3', '2026-10-05', [A('bench', [ws(5, 82.5)])]),
  wk('r1', '2026-10-10', [A('row', [ws(10, 50)])]),
  wk('b4', '2026-10-12', [A('bench', [ws(5, 80)])]),
]);

test('exercise: options most recently trained first; the first one is selected by default', () => {
  const e = statsModel(DATA, EX, TODAY).exercise;
  assert.deepEqual(e.options, [{ id: 'bench', name: 'Barbell Bench Press' }, { id: 'row', name: 'Barbell Row' }]);
  assert.equal(e.id, 'bench');
  assert.equal(e.name, 'Barbell Bench Press');
});

test('exercise: points are the best qualifying set per workout, rounded to 0.1, with the PR flagged', () => {
  const e = statsModel(DATA, EX, TODAY).exercise;
  assert.deepEqual(e.points.map(p => p.text), ['93.3', '80.0', '96.3', '93.3']);
  assert.deepEqual(e.points.map(p => p.pr), [false, false, true, false]);
  assert.deepEqual(e.points.map(p => p.date), ['2026-09-20', '2026-09-27', '2026-10-05', '2026-10-12']);
});

test('exercise: geometry is in a 320 x 120 box with 10 padding, evenly spaced, highest value at the top', () => {
  const e = statsModel(DATA, EX, TODAY).exercise;
  assert.deepEqual(e.points.map(p => p.x), [10, 110, 210, 310]);
  assert.equal(e.points[2].y, 10); // 96.25, the top
  assert.equal(e.points[1].y, 110); // 80, the bottom
  assert.equal(e.points[0].y, 27.95); // 10 + (96.25 - 93.333) / (96.25 - 80) * 100
  assert.equal(e.points[3].y, 27.95);
});

test('exercise: one point sits in the middle; equal points are level and nothing is a PR', () => {
  const row = statsModel(DATA, EX, TODAY, { picked: 'row' }).exercise;
  assert.equal(row.points.length, 1);
  assert.deepEqual([row.points[0].x, row.points[0].y], [160, 60]);
  const level = statsModel(DATA, g([wk('p', '2026-10-05', [A('bench', [ws(5, 60)])]), wk('q', '2026-10-12', [A('bench', [ws(5, 60)])])]), TODAY).exercise;
  assert.deepEqual(level.points.map(p => [p.x, p.y, p.pr]), [[10, 60, false], [310, 60, false]]);
});

test('exercise: tiles, PR list, captions and spoken label', () => {
  const e = statsModel(DATA, EX, TODAY).exercise;
  assert.deepEqual(e.tiles, [['Latest', '93.3 kg'], ['Best', '96.3 kg'], ['PRs', '1']]);
  assert.deepEqual(e.prs.map(p => p.text), ['5 Oct 2026 · 96.3 kg · PR']);
  assert.equal(e.first, '20 Sep 2026');
  assert.equal(e.last, '12 Oct 2026');
  assert.equal(e.note, '');
  assert.equal(e.label, 'Estimated 1RM, Barbell Bench Press, 4 workouts, oldest first: 93.3, 80.0, 96.3 PR, 93.3 kg');
});

test('exercise: the first performance is a baseline, not a PR (row: 0 PRs)', () => {
  const row = statsModel(DATA, EX, TODAY, { picked: 'row' }).exercise;
  assert.deepEqual(row.tiles, [['Latest', '66.7 kg'], ['Best', '66.7 kg'], ['PRs', '0']]);
  assert.deepEqual(row.prs, []);
});

test('exercise: an unknown, odd or inherited picked id falls back to the default', () => {
  for (const picked of ['nope', 'toString', '__proto__', '', null, undefined, 5]) assert.equal(statsModel(DATA, EX, TODAY, { picked }).exercise.id, 'bench', String(picked));
});

test('exercise: only sets that qualify make a chart; no qualifying set = null', () => {
  const none = g([wk('w', '2026-10-12', [A('bench', [ws(5, 80, { warmup: true }), ws(12, 50)])])]);
  assert.equal(statsModel(DATA, none, TODAY).exercise, null);
  assert.equal(statsModel(DATA, none, TODAY).empty, false);
});

test('exercise: names come from custom exercises; an unknown id says so, or says Loading while the list loads', () => {
  const custom = g([wk('w', '2026-10-12', [A('custom-1', [ws(5, 40)]), A('ghost', [ws(5, 30)])])],
    { customExercises: [{ id: 'custom-1', name: 'My Lift', muscle: 'chest', equipment: 'other' }] });
  assert.deepEqual(statsModel(DATA, custom, TODAY).exercise.options.map(o => o.name), ['My Lift', 'Unknown exercise']);
  assert.deepEqual(statsModel(null, custom, TODAY, { settled: false }).exercise.options.map(o => o.name), ['My Lift', 'Loading…']);
  assert.deepEqual(statsModel(null, custom, TODAY, { settled: true }).exercise.options.map(o => o.name), ['My Lift', 'Unknown exercise']);
});

test('exercise: only the latest 20 workouts are drawn; tiles still cover all of them', () => {
  const many = g(Array.from({ length: 25 }, (_, i) => wk(`w${i}`, D(2026, 9, 1 + i), [A('bench', [ws(5, 50 + i)])]))); // 50, 51 ... 74 kg x 5, each a PR but the first
  const e = statsModel(DATA, many, TODAY).exercise;
  assert.equal(e.points.length, 20);
  assert.equal(e.points[0].text, '64.2'); // workout 5: 55 kg x 5
  assert.equal(e.points[19].text, '86.3'); // 74 kg x 5
  assert.equal(e.note, 'Showing the latest 20 of 25 workouts.');
  assert.deepEqual(e.tiles, [['Latest', '86.3 kg'], ['Best', '86.3 kg'], ['PRs', '24']]);
  assert.equal(e.prs.length, 20);
  assert.equal(e.first, '6 Sep 2026');
  assert.match(e.label, /^Estimated 1RM, Barbell Bench Press, 20 workouts, oldest first: 64\.2 PR, 65\.3 PR, /);
});

test('the input is not changed and a dirty state does not throw', () => {
  const before = JSON.stringify(EX);
  statsModel(DATA, EX, TODAY);
  assert.equal(JSON.stringify(EX), before);
  assert.doesNotThrow(() => statsModel(DATA, { workouts: [null, { finishedAt: 5, startedAt: 5, date: '2026-10-12', items: null }] }, TODAY));
  assert.doesNotThrow(() => statsModel(DATA, emptyGym(), TODAY, { picked: '__proto__' }));
});
