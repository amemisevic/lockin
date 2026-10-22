import test from 'node:test';
import assert from 'node:assert/strict';
import { weightExercises, weightSeries } from '../src/core/gymstats.js';
import { emptyGym } from '../src/core/gym.js';

// Gym stats G11w: weight progress. Expected values written by hand before the code, all data invented.
// An exercise has a weight when a FINISHED workout has a done, non-warm-up set of it with weight above 0 (reps do not matter).
// weightExercises: most recently trained first (by the workout's startedAt); ties keep first-seen order.
// weightSeries: one point per finished workout that has such a set of the exercise: its heaviest such set, in kg. Oldest first.

const T = (m, d, hh = 10) => new Date(2026, m - 1, d, hh).getTime();
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const A = (exerciseId, sets) => ({ exerciseId, sets });
const wk = (id, m, d, items, o = {}) => ({ id, date: `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, startedAt: T(m, d), finishedAt: T(m, d, 11), name: id, routineId: null, items, ...o });
const g = workouts => ({ ...emptyGym(), workouts });

test('exercises: most recently trained first: bench 12 Oct, row 5 Oct, squat 20 Sep', () => {
  const gym = g([
    wk('w1', 9, 20, [A('squat', [ws(5, 100)])]),
    wk('w3', 10, 12, [A('bench', [ws(5, 80)])]),
    wk('w2', 10, 5, [A('row', [ws(10, 50)])]),
  ]);
  assert.deepEqual(weightExercises(gym), ['bench', 'row', 'squat']);
});

test('exercises: one trained in two workouts and two items is listed once, at its latest workout', () => {
  const gym = g([
    wk('w1', 9, 20, [A('bench', [ws(5, 80)]), A('bench', [ws(5, 82.5)])]),
    wk('w2', 10, 5, [A('row', [ws(10, 50)])]),
    wk('w3', 10, 12, [A('bench', [ws(5, 85)])]),
  ]);
  assert.deepEqual(weightExercises(gym), ['bench', 'row']);
});

test('exercises: any rep count counts (12 and 25 reps are fine); warm-up, not done and 0 kg never do', () => {
  const gym = g([wk('w1', 10, 12, [
    A('a', [ws(5, 80, { warmup: true })]),
    A('b', [ws(5, 80, { done: false })]),
    A('c', [ws(12, 50)]),
    A('d', [ws(15, 0)]),
    A('e', [ws(25, 20)]),
    A('f', [ws(5, 80, { warmup: true }), ws(5, 60)]), // one counting set is enough
  ])]);
  assert.deepEqual(weightExercises(gym), ['c', 'e', 'f']);
});

test('exercises: an unfinished workout never counts', () => {
  const gym = g([wk('w1', 10, 12, [A('bench', [ws(5, 80)])], { finishedAt: null })]);
  assert.deepEqual(weightExercises(gym), []);
});

test('exercises: ties on the workout start keep first-seen order; ids named toString and __proto__ are ordinary ids', () => {
  assert.deepEqual(weightExercises(g([wk('w1', 10, 12, [A('b', [ws(5, 80)]), A('a', [ws(5, 80)])])])), ['b', 'a']);
  const gym = g([wk('w1', 10, 5, [A('toString', [ws(5, 80)])]), wk('w2', 10, 12, [A('__proto__', [ws(5, 80)])])]);
  assert.deepEqual(weightExercises(gym), ['__proto__', 'toString']);
});

test('series: the heaviest counting set per workout, oldest first, whatever the list order', () => {
  const gym = g([
    wk('w3', 10, 5, [A('bench', [ws(5, 82.5), ws(3, 85), ws(8, 70)])]),
    wk('w1', 9, 20, [A('bench', [ws(5, 80)])]),
    wk('w2', 9, 27, [A('bench', [ws(5, 75), ws(5, 77.5)])]),
  ]);
  assert.deepEqual(weightSeries(gym, 'bench').map(p => [p.workoutId, p.date, p.weight]), [['w1', '2026-09-20', 80], ['w2', '2026-09-27', 77.5], ['w3', '2026-10-05', 85]]);
  assert.equal(weightSeries(gym, 'bench')[0].startedAt, T(9, 20));
});

test('series: warm-ups, undone sets and 0 kg are left out even when heavier; reps do not matter', () => {
  const gym = g([wk('w1', 10, 5, [A('bench', [ws(1, 100, { warmup: true }), ws(5, 120, { done: false }), ws(20, 40), ws(9, 0)])])]);
  assert.deepEqual(weightSeries(gym, 'bench').map(p => p.weight), [40]);
});

test('series: the same exercise twice in one workout is ONE point, the heavier of both items', () => {
  const gym = g([wk('w1', 10, 5, [A('bench', [ws(5, 80)]), A('row', [ws(5, 50)]), A('bench', [ws(3, 85)])])]);
  assert.deepEqual(weightSeries(gym, 'bench').map(p => p.weight), [85]);
});

test('series: a workout with only warm-up or 0 kg sets of the exercise gives no point; other exercises and open workouts are ignored', () => {
  const gym = g([
    wk('w1', 9, 20, [A('bench', [ws(5, 80, { warmup: true })])]),
    wk('w2', 9, 27, [A('bench', [ws(10, 0)]), A('row', [ws(5, 50)])]),
    wk('w3', 10, 5, [A('bench', [ws(5, 90)])], { finishedAt: null }),
    wk('w4', 10, 12, [A('bench', [ws(5, 70)])]),
  ]);
  assert.deepEqual(weightSeries(gym, 'bench').map(p => p.workoutId), ['w4']);
  assert.deepEqual(weightSeries(gym, 'nope'), []);
});

test('series: the input is not changed and a dirty state does not throw', () => {
  const gym = g([wk('w1', 10, 5, [A('bench', [ws(5, 80)])])]);
  const before = JSON.stringify(gym);
  weightSeries(gym, 'bench');
  weightExercises(gym);
  assert.equal(JSON.stringify(gym), before);
  const dirty = { workouts: [null, { finishedAt: 5, startedAt: 5, date: '2026-10-12', items: null }] };
  assert.doesNotThrow(() => { weightSeries(dirty, 'bench'); weightExercises(dirty); weightSeries(null, 'x'); weightExercises(undefined); });
});
