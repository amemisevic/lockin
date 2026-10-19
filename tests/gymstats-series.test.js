import test from 'node:test';
import assert from 'node:assert/strict';
import { e1rmSeries } from '../src/core/gymstats.js';
import { emptyGym } from '../src/core/gym.js';

// Invented sample data only. Epley by hand: 80x8 = 80*38/30 = 101.3333.., 90x5 = 90*35/30 = 105, 100x3 = 100*33/30 = 110,
// 100x1 = 100 (one rep is the weight itself), 60x10 = 60*40/30 = 80.
const T = (day, h = 10) => new Date(2026, 9, day, h, 0).getTime();
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const item = (sets, exerciseId = 'bench-press') => ({ exerciseId, sets });
const wk = (id, day, items, o = {}) => ({ id, date: `2026-10-${String(day).padStart(2, '0')}`, startedAt: T(day), finishedAt: T(day, 11), name: '', routineId: null, items, ...o });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const gym = (...workouts) => deepFreeze({ ...emptyGym(), workouts });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('e1rmSeries: one point per workout, the best set of that workout, unrounded', () => {
  const g = gym(wk('a', 5, [item([set(), set({ reps: 1, weight: 100 })])]));
  const s = e1rmSeries(g, 'bench-press');
  assert.equal(s.length, 1);
  assert.deepEqual({ ...s[0], e1rm: undefined }, { workoutId: 'a', date: '2026-10-05', startedAt: T(5), e1rm: undefined });
  near(s[0].e1rm, 101 + 1 / 3); // 80x8 beats 100x1
  assert.notEqual(s[0].e1rm, 101.3);
});

test('e1rmSeries: oldest first by startedAt, whatever the list order or the date field says', () => {
  const g = gym(
    wk('d', 12, [item([set({ reps: 3, weight: 100 })])]),
    wk('b', 7, [item([set({ reps: 5, weight: 90 })])], { date: '2026-10-20' }), // edited date must not reorder
    wk('a', 5, [item([set()])]),
  );
  const s = e1rmSeries(g, 'bench-press');
  assert.deepEqual(s.map(p => p.workoutId), ['a', 'b', 'd']);
  assert.equal(s[1].date, '2026-10-20');
  assert.equal(s[1].startedAt, T(7));
  near(s[0].e1rm, 101 + 1 / 3); near(s[1].e1rm, 105); near(s[2].e1rm, 110);
});

test('e1rmSeries: warm-ups, undone sets, no weight and sets over 10 reps never count', () => {
  const g = gym(wk('a', 5, [item([
    set({ reps: 5, weight: 200, warmup: true }), set({ reps: 5, weight: 150, done: false }),
    set({ reps: 5, weight: 0 }), set({ reps: 12, weight: 120 }), set({ reps: 10, weight: 60 }),
  ])]));
  const s = e1rmSeries(g, 'bench-press');
  assert.equal(s.length, 1);
  near(s[0].e1rm, 80); // only 60x10 qualifies
});

test('e1rmSeries: a workout with no qualifying set of the exercise gives no point', () => {
  const g = gym(
    wk('a', 5, [item([set({ reps: 12 })])]),
    wk('b', 6, [item([set()], 'squat')]),
    wk('c', 7, [item([set({ warmup: true })])]),
  );
  assert.deepEqual(e1rmSeries(g, 'bench-press'), []);
});

test('e1rmSeries: unfinished workouts are left out', () => {
  const g = gym(wk('a', 5, [item([set()])]), wk('o', 6, [item([set({ reps: 1, weight: 300 })])], { finishedAt: null }));
  assert.deepEqual(e1rmSeries(g, 'bench-press').map(p => p.workoutId), ['a']);
});

test('e1rmSeries: the same exercise in two items of one workout is one point, the better set wins', () => {
  const g = gym(wk('a', 5, [item([set()]), item([set({ reps: 5, weight: 90 })], 'squat'), item([set({ reps: 3, weight: 100 })])]));
  const s = e1rmSeries(g, 'bench-press');
  assert.equal(s.length, 1);
  near(s[0].e1rm, 110);
});

test('e1rmSeries: empty gym, unknown exercise, missing input', () => {
  assert.deepEqual(e1rmSeries(gym(), 'bench-press'), []);
  assert.deepEqual(e1rmSeries(gym(wk('a', 5, [item([set()])])), 'nope'), []);
  assert.deepEqual(e1rmSeries(undefined, 'bench-press'), []);
});

test('e1rmSeries does not change its input', () => {
  const g = gym(wk('b', 7, [item([set()])]), wk('a', 5, [item([set()])]));
  e1rmSeries(g, 'bench-press'); // a frozen input would throw on any write
  assert.deepEqual(g.workouts.map(w => w.id), ['b', 'a']);
});
