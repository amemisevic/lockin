import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGym } from '../src/core/gym.js';
import { editWorkout } from '../src/core/workouts.js';
import { recentWorkouts, workoutRow } from '../src/views/gymHomeLogic.js';
import {
  historyHref, workoutIdFromParam, historyGroups, historySummary, detailModel, lengthText, checkDate, refusalMessage, addDoneSet,
  DATE_BAD, DATE_FUTURE, NO_SETS_MESSAGE, SAVE_FAILED,
} from '../src/views/gymHistoryLogic.js';

// Gym G11 history logic. Expected values by hand. Local dates only.
const T = (y, m, d, hh = 10) => new Date(y, m - 1, d, hh).getTime();
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const wk = (id, date, startedAt, items, o = {}) => ({ id, date, startedAt, finishedAt: startedAt + 75 * 60_000, name: id, routineId: null, items, ...o });
const g = workouts => ({ ...emptyGym(), workouts });
const A = (id, sets) => ({ exerciseId: id, sets });

test('historyHref / workoutIdFromParam: the id travels escaped and comes back as it was', () => {
  assert.equal(historyHref('w-1'), '#gym/history/w-1');
  for (const id of ['w-1', '__proto__', 'a/b c', 'toString', '100%']) assert.equal(workoutIdFromParam(historyHref(id).slice('#gym/history/'.length)), id);
  assert.equal(workoutIdFromParam('%E0%A4%A'), '%E0%A4%A'); // broken escape is left as it was
});

test('workoutRow is the row recentWorkouts draws: id, title, short date, summary', () => {
  const w = wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(5, 80), ws(5, 80, { done: false })])], { name: 'Push' });
  assert.deepEqual(workoutRow(w), { id: 'a', title: 'Push', date: 'Mon 12 Oct', summary: '1 exercise · 1 set · 75 min' });
  assert.deepEqual(recentWorkouts(g([w])), [workoutRow(w)]);
});

test('historyGroups: finished workouts only, by the month of their date, newest first (date, then start, then later in the list)', () => {
  const w1 = wk('w1', '2026-09-30', T(2026, 9, 30, 18), []);
  const w2 = wk('w2', '2026-10-02', T(2026, 10, 2), []);
  const w3 = wk('w3', '2026-10-12', T(2026, 10, 12, 8), []);
  const w4 = wk('w4', '2026-10-12', T(2026, 10, 12, 19), []);
  const w6 = wk('w6', '2026-08-15', T(2026, 8, 15), []);
  const open = { ...wk('open', '2026-10-12', T(2026, 10, 12, 20), []), finishedAt: null };
  const moved = wk('w7', '2026-09-01', T(2026, 10, 5), []); // started in October, date edited to September
  const groups = historyGroups(g([w1, w2, w3, open, w4, w6, moved]));
  assert.deepEqual(groups.map(x => [x.month, x.label, x.rows.map(r => r.id)]), [
    ['2026-10', 'October 2026', ['w4', 'w3', 'w2']],
    ['2026-09', 'September 2026', ['w1', 'w7']],
    ['2026-08', 'August 2026', ['w6']],
  ]);
  assert.deepEqual(groups[0].rows[0], workoutRow(w4));
  assert.deepEqual(historyGroups(emptyGym()), []);
});

test('historyGroups: 100 workouts across a year change keep every row; December 2025 sorts after January 2026', () => {
  const ws100 = Array.from({ length: 100 }, (_, i) => { const d = new Date(2025, 11, 1 + i * 2); return wk(`w${i}`, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, d.getTime(), []); });
  const groups = historyGroups(g(ws100));
  assert.equal(groups.reduce((n, x) => n + x.rows.length, 0), 100);
  assert.equal(groups.at(-1).label, 'December 2025');
  assert.equal(groups[0].rows[0].id, 'w99');
  assert.ok(groups.slice(0, -1).every((x, i) => x.month > groups[i + 1].month));
});

test('historySummary: counts finished workouts only', () => {
  const f = n => Array.from({ length: n }, (_, i) => wk(`f${i}`, '2026-10-01', T(2026, 10, 1) + i, []));
  const open = { ...wk('o', '2026-10-02', T(2026, 10, 2), []), finishedAt: null };
  assert.equal(historySummary(emptyGym()), 'No workouts yet');
  assert.equal(historySummary(g([open])), 'No workouts yet');
  assert.equal(historySummary(g([...f(1), open])), '1 workout');
  assert.equal(historySummary(g(f(3))), '3 workouts');
});

test('detailModel: name, date, length in whole minutes, every set numbered from 1 with its flags', () => {
  const a = wk('a', '2026-10-12', T(2026, 10, 12), [
    A('bench', [ws(10, 40, { warmup: true }), ws(5, 82.5), ws(5, 85), ws(5, 80)]),
    A('row', [ws(10, 50), ws(10, 50, { done: false })]),
  ], { name: 'Push' });
  const m = detailModel(g([a]), 'a');
  assert.equal(m.id, 'a');
  assert.equal(m.name, 'Push');
  assert.equal(m.date, '2026-10-12');
  assert.equal(m.minutes, 75);
  assert.equal(m.items.length, 2);
  assert.deepEqual(m.items[0].sets.map(s => [s.n, s.weight, s.reps, s.warmup, s.done]), [[1, 40, 10, true, true], [2, 82.5, 5, false, true], [3, 85, 5, false, true], [4, 80, 5, false, true]]);
  assert.deepEqual(m.items[1].sets.map(s => [s.n, s.done]), [[1, true], [2, false]]);
  assert.equal(m.items[0].exerciseId, 'bench');
});

test('detailModel: unknown id, an open workout and inherited ids give null', () => {
  const open = { ...wk('o', '2026-10-12', T(2026, 10, 12), []), finishedAt: null };
  const gym = g([wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(5, 80)])]), open]);
  for (const id of ['nope', 'o', '__proto__', 'toString', 'constructor', '', null, undefined, 7]) assert.equal(detailModel(gym, id), null, String(id));
});

test('PR: only where the core marks one, one per exercise per workout, on its best set; the first workout is the baseline', () => {
  // Baseline 80 x 5 = 93.33. Then 82.5 x 5 = 96.25 (PR), 85 x 5 = 99.17 (PR); 80 x 5 is not. Display keeps only 85 x 5.
  const base = wk('w0', '2026-09-20', T(2026, 9, 20), [A('bench', [ws(5, 80)])]);
  const a = wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(10, 40, { warmup: true }), ws(5, 82.5), ws(5, 85), ws(5, 80)]), A('row', [ws(10, 50)])]);
  const gym = g([base, a]);
  assert.deepEqual(detailModel(gym, 'a').items[0].sets.map(s => s.pr), [false, false, true, false]);
  assert.deepEqual(detailModel(gym, 'a').items[1].sets.map(s => s.pr), [false]); // row: first ever, baseline
  assert.deepEqual(detailModel(gym, 'w0').items[0].sets.map(s => s.pr), [false]);
});

test('PR: the same exercise in two items of one workout still gets one marker, on the best set', () => {
  const base = wk('w0', '2026-09-20', T(2026, 9, 20), [A('bench', [ws(5, 80)])]);
  const a = wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(5, 82.5)]), A('bench', [ws(5, 85)])]);
  const m = detailModel(g([base, a]), 'a');
  assert.deepEqual([m.items[0].sets[0].pr, m.items[1].sets[0].pr], [false, true]);
});

test('lengthText: whole minutes, under one minute says so', () => {
  assert.equal(lengthText(75), '75 min');
  assert.equal(lengthText(1), '1 min');
  assert.equal(lengthText(0), 'Under 1 min');
});

test('checkDate: a key in YYYY-MM-DD, not after today; real-calendar checks stay with the core', () => {
  assert.deepEqual(checkDate('2026-10-12', '2026-10-12'), { ok: true, date: '2026-10-12' });
  assert.deepEqual(checkDate('2026-01-05', '2026-10-12'), { ok: true, date: '2026-01-05' });
  assert.deepEqual(checkDate('2026-10-13', '2026-10-12'), { ok: false, message: DATE_FUTURE });
  assert.deepEqual(checkDate('2027-01-01', '2026-10-12'), { ok: false, message: DATE_FUTURE });
  for (const bad of ['', '12/10/2026', '2026-1-5', '2026-10-12T10:00', ' 2026-10-12', null, undefined, 20261012]) assert.deepEqual(checkDate(bad, '2026-10-12'), { ok: false, message: DATE_BAD }, String(bad));
  assert.deepEqual(checkDate('2026-02-30', '2026-10-12'), { ok: true, date: '2026-02-30' });
});

test('refusalMessage: no-sets and date have their own words, anything else the general one', () => {
  assert.equal(refusalMessage('no-sets'), NO_SETS_MESSAGE);
  assert.equal(refusalMessage('date'), DATE_BAD);
  for (const r of ['reps', 'weight', 'unknown-workout', 'bad-index', undefined]) assert.equal(refusalMessage(r), SAVE_FAILED);
  assert.equal(NO_SETS_MESSAGE, 'A workout needs at least one done working set.');
  assert.equal(DATE_FUTURE, "The date can't be in the future.");
  assert.equal(DATE_BAD, 'Enter a valid date.');
  assert.equal(SAVE_FAILED, 'That change could not be saved.');
});

test('the core refuses an impossible date, so the view only has to show DATE_BAD', () => {
  const gym = g([wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(5, 80)])])]);
  const r = editWorkout(gym, 'a', { date: '2026-02-30' });
  assert.equal(r.ok, false);
  assert.equal(refusalMessage(r.reason), DATE_BAD);
});

test('addDoneSet: a new set on a finished workout is reps 1, weight 0, working and DONE so it counts; input untouched', () => {
  const gym = g([wk('a', '2026-10-12', T(2026, 10, 12), [A('bench', [ws(5, 80)]), A('row', [ws(10, 50)])])]);
  const before = JSON.stringify(gym);
  const r = addDoneSet(gym, 'a', 1);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.workouts[0].items[1].sets, [ws(10, 50), { reps: 1, weight: 0, warmup: false, done: true }]);
  assert.deepEqual(r.state.workouts[0].items[0].sets, [ws(5, 80)]);
  assert.equal(JSON.stringify(gym), before);
  assert.equal(addDoneSet(gym, 'nope', 0).ok, false);
  assert.equal(addDoneSet(gym, 'a', 5).ok, false);
  assert.equal(addDoneSet(gym, 'a', -1).ok, false);
  assert.equal(addDoneSet(gym, '__proto__', 0).ok, false);
});
