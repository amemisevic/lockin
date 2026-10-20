import test from 'node:test';
import assert from 'node:assert/strict';
import { GYM_CORRUPT_NOTICE, weekStrip, visitsText, recentWorkouts, routineRows } from '../src/views/gymHomeLogic.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G8 home logic. Expected values by hand from the plan's Rules example:
// finished Mon 2026-10-05, Wed 10-07 (two), Sun 10-11, Mon 10-12. Week of 10-05 = 3 visits, week of 10-12 = 1.
const fin = (date, id, startedAt = 1, extra = {}) => ({ id, date, startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items: [], ...extra });
const g = (workouts, weeklyTarget = 4, routines = []) => ({ ...emptyGym(), settings: { weeklyTarget }, workouts, routines });
const EX = [fin('2026-10-05', 'a'), fin('2026-10-07', 'b'), fin('2026-10-07', 'c'), fin('2026-10-11', 'd'), fin('2026-10-12', 'e')];

test('corrupt notice is the exact one-line copy from the owner', () => {
  assert.equal(GYM_CORRUPT_NOTICE, 'Gym data could not be read. A copy was kept.');
});

test('weekStrip: Sunday 2026-10-11 shows Mon 10-05 to Sun 10-11, visits on 05, 07, 11, today = Sunday', () => {
  const s = weekStrip(g(EX), '2026-10-11');
  assert.deepEqual(s.map(d => d.key), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  assert.deepEqual(s.map(d => d.name), ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
  assert.deepEqual(s.map(d => d.day), [5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(s.map(d => d.visited), [true, false, true, false, false, false, true]);
  assert.deepEqual(s.map(d => d.today), [false, false, false, false, false, false, true]);
});

test('weekStrip: the label says the day, whether there was a visit, and today (colour is never the only signal)', () => {
  const s = weekStrip(g(EX), '2026-10-11');
  assert.equal(s[0].label, 'Monday 5 October, gym visit');
  assert.equal(s[1].label, 'Tuesday 6 October, no visit');
  assert.equal(s[6].label, 'Sunday 11 October, gym visit, today');
});

test('weekStrip: Wednesday 2026-10-14 is the week of 10-12; only Monday 12 is a visit; today is index 2', () => {
  const s = weekStrip(g(EX), '2026-10-14');
  assert.equal(s[0].key, '2026-10-12');
  assert.equal(s[6].key, '2026-10-18');
  assert.deepEqual(s.map(d => d.visited), [true, false, false, false, false, false, false]);
  assert.deepEqual(s.map(d => d.today), [false, false, true, false, false, false, false]);
  assert.equal(s[2].label, 'Wednesday 14 October, no visit, today');
});

test('weekStrip: an open workout is never a visit; an empty history has no visits', () => {
  const open = fin('2026-10-13', 'o', 5, { finishedAt: null });
  assert.equal(weekStrip(g([open]), '2026-10-14').some(d => d.visited), false);
  assert.equal(weekStrip(emptyGym(), '2026-10-14').some(d => d.visited), false);
});

test('weekStrip: the DST week of Sun 2026-10-25 still has 7 keys 10-19..10-25', () => {
  const s = weekStrip(emptyGym(), '2026-10-25');
  assert.deepEqual(s.map(d => d.key), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
});

test('visitsText: 3 visits against 4 reads "3 of 4 visits"; two workouts on one day are one visit', () => {
  assert.deepEqual(visitsText(g(EX), '2026-10-11'), { visits: 3, target: 4, text: '3 of 4 visits' });
  assert.equal(visitsText(g(EX), '2026-10-14').text, '1 of 4 visits');
});

test('visitsText: target 1 says "visit"; target 7; empty history', () => {
  assert.equal(visitsText(g(EX, 1), '2026-10-14').text, '1 of 1 visit');
  assert.equal(visitsText(g([], 7), '2026-10-14').text, '0 of 7 visits');
  assert.equal(visitsText(emptyGym(), '2026-10-14').text, '0 of 4 visits');
});

const sets = (...flags) => flags.map(([done, warmup]) => ({ reps: 5, weight: 50, done, warmup }));
test('recentWorkouts: newest 5 finished first; open workouts left out; ties go to the later one in the list', () => {
  const ws = [1, 2, 3, 4, 5, 6, 7].map(n => fin(`2026-09-0${n}`, `w${n}`, n * 10));
  const open = fin('2026-09-09', 'open', 99, { finishedAt: null });
  assert.deepEqual(recentWorkouts(g([...ws, open])).map(r => r.id), ['w7', 'w6', 'w5', 'w4', 'w3']);
  const tie = [fin('2026-09-01', 'x', 10), fin('2026-09-01', 'y', 10)];
  assert.deepEqual(recentWorkouts(g(tie)).map(r => r.id), ['y', 'x']);
  assert.deepEqual(recentWorkouts(g(ws), 2).map(r => r.id), ['w7', 'w6']);
  assert.deepEqual(recentWorkouts(emptyGym()), []);
});

test('recentWorkouts: row = title, short date, "n exercises · m sets" (done working sets only)', () => {
  const w = fin('2026-10-05', 'a', 1, {
    name: 'Push day',
    items: [
      { exerciseId: 'bench', sets: sets([true, false], [true, true], [false, false], [true, false]) }, // 2 counted
      { exerciseId: 'row', sets: sets([true, false]) }, // 1 counted
    ],
  });
  assert.deepEqual(recentWorkouts(g([w])), [{ id: 'a', title: 'Push day', date: 'Mon 5 Oct', summary: '2 exercises · 3 sets' }]);
});

test('recentWorkouts: no name = "Workout"; singular "1 exercise · 1 set"; date for Sep, May and Dec', () => {
  const one = items => fin('2026-09-30', 'a', 1, { items });
  const r = recentWorkouts(g([one([{ exerciseId: 'bench', sets: sets([true, false]) }])]))[0];
  assert.equal(r.title, 'Workout');
  assert.equal(r.summary, '1 exercise · 1 set');
  assert.equal(r.date, 'Wed 30 Sep');
  assert.equal(recentWorkouts(g([fin('2026-05-04', 'm')]))[0].date, 'Mon 4 May');
  assert.equal(recentWorkouts(g([fin('2026-12-31', 'z')]))[0].date, 'Thu 31 Dec');
  assert.equal(recentWorkouts(g([fin('2026-10-05', 'e')]))[0].summary, '0 exercises · 0 sets');
});

test('routineRows: stored order, name and exercise count; singular for one', () => {
  const routines = [
    { id: 'r-1', name: 'Pull', createdAt: 1, items: [{ exerciseId: 'row', sets: [{ reps: 8, weight: 60 }] }] },
    { id: 'r-2', name: 'Legs', createdAt: 2, items: [{ exerciseId: 'a', sets: [{ reps: 5, weight: 100 }] }, { exerciseId: 'b', sets: [{ reps: 5, weight: 100 }] }] },
  ];
  assert.deepEqual(routineRows(g([], 4, routines)), [
    { id: 'r-1', name: 'Pull', summary: '1 exercise' },
    { id: 'r-2', name: 'Legs', summary: '2 exercises' },
  ]);
  assert.deepEqual(routineRows(emptyGym()), []);
});

test('home logic never throws on worst-case ids and names', () => {
  const w = fin('2026-10-05', '__proto__', 1, { name: 'x'.repeat(200), items: [{ exerciseId: 'toString', sets: sets([true, false]) }] });
  assert.equal(recentWorkouts(g([w]))[0].id, '__proto__');
  assert.equal(recentWorkouts(g([w]))[0].title.length, 200);
});
