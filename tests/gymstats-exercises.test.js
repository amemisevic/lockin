import test from 'node:test';
import assert from 'node:assert/strict';
import { trainedExercises } from '../src/core/gymstats.js';
import { emptyGym } from '../src/core/gym.js';

// Gym stats G11s: which exercises have anything to chart. Expected values written by hand before the code.
// An exercise is "trained" when a FINISHED workout has a qualifying set of it (done, working, weight > 0, 1 to 10 reps).
// Most recently trained first (by the workout's startedAt); ties keep first-seen order.

const T = (m, d, hh = 10) => new Date(2026, m - 1, d, hh).getTime();
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const A = (exerciseId, sets) => ({ exerciseId, sets });
const wk = (id, m, d, items, o = {}) => ({ id, date: `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, startedAt: T(m, d), finishedAt: T(m, d, 11), name: id, routineId: null, items, ...o });
const g = workouts => ({ ...emptyGym(), workouts });

test('most recently trained first: bench 12 Oct, row 5 Oct, squat 20 Sep', () => {
  const gym = g([
    wk('w1', 9, 20, [A('squat', [ws(5, 100)])]),
    wk('w3', 10, 12, [A('bench', [ws(5, 80)])]),
    wk('w2', 10, 5, [A('row', [ws(10, 50)])]),
  ]);
  assert.deepEqual(trainedExercises(gym), ['bench', 'row', 'squat']);
});

test('an exercise trained in two workouts and two items is listed once, at its latest workout', () => {
  const gym = g([
    wk('w1', 9, 20, [A('bench', [ws(5, 80)]), A('bench', [ws(5, 82.5)])]),
    wk('w2', 10, 5, [A('row', [ws(10, 50)])]),
    wk('w3', 10, 12, [A('bench', [ws(5, 85)])]),
  ]);
  assert.deepEqual(trainedExercises(gym), ['bench', 'row']);
});

test('sets that do not qualify never make an exercise trained: warm-up, not done, 12 reps, 0 kg, 100 x 1 warm-up', () => {
  const gym = g([wk('w1', 10, 12, [
    A('a', [ws(5, 80, { warmup: true })]),
    A('b', [ws(5, 80, { done: false })]),
    A('c', [ws(12, 50)]),
    A('d', [ws(15, 0)]),
    A('e', [ws(1, 100, { warmup: true })]),
    A('f', [ws(5, 80, { warmup: true }), ws(5, 60)]), // one qualifying set is enough
  ])]);
  assert.deepEqual(trainedExercises(gym), ['f']);
});

test('an unfinished workout never counts', () => {
  const gym = g([wk('w1', 10, 12, [A('bench', [ws(5, 80)])], { finishedAt: null })]);
  assert.deepEqual(trainedExercises(gym), []);
});

test('ties on the workout start keep first-seen order', () => {
  const gym = g([wk('w1', 10, 12, [A('b', [ws(5, 80)]), A('a', [ws(5, 80)])])]);
  assert.deepEqual(trainedExercises(gym), ['b', 'a']);
});

test('ids named toString and __proto__ are ordinary ids (Map, not a plain object)', () => {
  const gym = g([wk('w1', 10, 5, [A('toString', [ws(5, 80)])]), wk('w2', 10, 12, [A('__proto__', [ws(5, 80)])])]);
  assert.deepEqual(trainedExercises(gym), ['__proto__', 'toString']);
});

test('empty, missing and malformed state give an empty list and never throw', () => {
  assert.deepEqual(trainedExercises(emptyGym()), []);
  assert.deepEqual(trainedExercises(undefined), []);
  assert.deepEqual(trainedExercises({ workouts: null }), []);
  assert.deepEqual(trainedExercises(g([null, { finishedAt: 1, startedAt: 1, items: null }])), []);
});

test('the input is not changed', () => {
  const gym = g([wk('w1', 10, 12, [A('bench', [ws(5, 80)])])]);
  const before = JSON.stringify(gym);
  trainedExercises(gym);
  assert.equal(JSON.stringify(gym), before);
});
