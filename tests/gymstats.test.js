import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/core/gymstats.js';
import { emptyGym } from '../src/core/gym.js';

// Invented sample data only. Expected values are written by hand from the plan (Rules: Gym visit, Week, Volume,
// Sets per muscle, Estimated 1RM, PR), never copied from the code's output.
const T = (day, h = 10, m = 0) => new Date(2026, 9, day, h, m).getTime(); // local time, Oct 2026
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const item = (sets = [set()], exerciseId = 'bench-press') => ({ exerciseId, sets });
const wk = (id, day, o = {}) => ({ id, date: `2026-10-${String(day).padStart(2, '0')}`, startedAt: T(day), finishedAt: T(day, 11), name: '', routineId: null, items: [item()], ...o });
const open = (id, day, o = {}) => wk(id, day, { finishedAt: null, ...o });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const gym = (...workouts) => deepFreeze({ ...emptyGym(), workouts });
const ex = (id, muscle) => ({ id, name: id, equipment: 'other', muscle, category: 'strength' });
const DATA = deepFreeze({ exercises: [ex('bench-press', 'chest'), ex('pushdown', 'triceps'), ex('mystery', 'other')], muscles: ['chest', 'triceps', 'other'], equipment: ['other'] });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

// Rules, Gym visit: finished Mon 10-05, Wed 10-07 (two), Sun 10-11, Mon 10-12.
const VISITS = gym(wk('a', 5), wk('b', 7), wk('c', 7, { startedAt: T(7, 18), finishedAt: T(7, 19) }), wk('d', 11), wk('e', 12), open('f', 8));

// ---------- visits ----------
test('visitDates: finished days only, unique, ascending', () => {
  assert.deepEqual(S.visitDates(VISITS), ['2026-10-05', '2026-10-07', '2026-10-11', '2026-10-12']);
  assert.deepEqual(S.visitDates(gym()), []);
  assert.deepEqual(S.visitDates(gym(open('x', 3))), []);
});

test('visitDates uses the workout date, not the time of day', () => {
  assert.deepEqual(S.visitDates(gym(wk('a', 9, { date: '2026-10-06' }))), ['2026-10-06']);
});

test('visitsInWeek: week of 10-05 = 3 visits, week of 10-12 = 1, from any day of the week', () => {
  for (const d of ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-11']) assert.equal(S.visitsInWeek(VISITS, d), 3, d);
  for (const d of ['2026-10-12', '2026-10-18']) assert.equal(S.visitsInWeek(VISITS, d), 1, d);
  assert.equal(S.visitsInWeek(VISITS, '2026-09-28'), 0);
  assert.equal(S.visitsInWeek(VISITS, '2026-10-19'), 0);
});

test('visitsInMonth: October so far = 4, other months 0', () => {
  assert.equal(S.visitsInMonth(VISITS, '2026-10'), 4);
  assert.equal(S.visitsInMonth(VISITS, '2026-09'), 0);
  assert.equal(S.visitsInMonth(VISITS, '2026-11'), 0);
});

test('weekKeys: Monday to Sunday, across a month end', () => {
  assert.deepEqual(S.weekKeys('2026-10-11'), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  assert.deepEqual(S.weekKeys('2026-09-30'), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
});

test('weeklyVisits: last 12 weeks, oldest first, the week of the given day last', () => {
  const r = S.weeklyVisits(VISITS, '2026-10-14');
  assert.equal(r.length, 12);
  assert.deepEqual(r[0], { start: '2026-07-27', visits: 0 }); // Mon 10-12 minus 77 days
  assert.deepEqual(r.slice(-3), [{ start: '2026-09-28', visits: 0 }, { start: '2026-10-05', visits: 3 }, { start: '2026-10-12', visits: 1 }]);
  assert.equal(r.reduce((n, w) => n + w.visits, 0), 4);
});

test('weeklyVisits: a custom length', () => {
  assert.deepEqual(S.weeklyVisits(VISITS, '2026-10-14', 2), [{ start: '2026-10-05', visits: 3 }, { start: '2026-10-12', visits: 1 }]);
  assert.deepEqual(S.weeklyVisits(VISITS, '2026-10-14', 1), [{ start: '2026-10-12', visits: 1 }]);
});

test('monthlyVisits: last months oldest first, labels cross the year', () => {
  assert.deepEqual(S.monthlyVisits(VISITS, '2026-10-14', 3), [{ month: '2026-08', visits: 0 }, { month: '2026-09', visits: 0 }, { month: '2026-10', visits: 4 }]);
  assert.deepEqual(S.monthlyVisits(VISITS, '2026-01-15', 3).map(m => m.month), ['2025-11', '2025-12', '2026-01']);
  const r = S.monthlyVisits(VISITS, '2026-10-14');
  assert.equal(r.length, 12);
  assert.equal(r[0].month, '2025-11');
});

// ---------- volume ----------
const bench3 = [set(), set(), set({ reps: 7, weight: 77.5 })];

test('workoutVolume: 80x8, 80x8, 77.5x7 = 1822.5 kg; warm-up and undone sets add nothing', () => {
  assert.equal(S.workoutVolume(wk('a', 5, { items: [item(bench3)] })), 1822.5);
  const noisy = [...bench3, set({ reps: 10, weight: 40, warmup: true }), set({ reps: 5, weight: 100, done: false })];
  assert.equal(S.workoutVolume(wk('a', 5, { items: [item(noisy)] })), 1822.5);
  assert.equal(S.workoutVolume(wk('a', 5, { items: [] })), 0);
});

test('workoutVolume adds every exercise; bodyweight (0 kg) adds 0', () => {
  const push = [set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 })]; // 1080
  assert.equal(S.workoutVolume(wk('a', 5, { items: [item(bench3), item(push, 'pushdown'), item([set({ reps: 15, weight: 0 })], 'plank')] })), 2902.5);
});

test('volumeByExercise: per exercise in first-seen order; a repeated exercise is merged', () => {
  const push = [set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 })];
  const w = wk('a', 5, { items: [item(bench3), item(push, 'pushdown'), item([set()], 'bench-press')] }); // bench 1822.5 + 640
  assert.deepEqual(S.volumeByExercise(w), [{ exerciseId: 'bench-press', volume: 2462.5 }, { exerciseId: 'pushdown', volume: 1080 }]);
  assert.deepEqual(S.volumeByExercise(wk('a', 5, { items: [] })), []);
});

test('volumeByExercise: ids like toString and __proto__ are plain ids', () => {
  const w = wk('a', 5, { items: [item([set()], '__proto__'), item([set({ reps: 5, weight: 20 })], 'toString'), item([set()], '__proto__')] });
  assert.deepEqual(S.volumeByExercise(w), [{ exerciseId: '__proto__', volume: 1280 }, { exerciseId: 'toString', volume: 100 }]);
});

// ---------- sets per muscle ----------
// Rules: bench 3 working sets + 1 warm-up, pushdown 3 sets: chest 3, triceps 3.
const push3 = [set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 }), set({ reps: 12, weight: 30 })];
const bench4 = [set({ reps: 10, weight: 40, warmup: true }), set(), set(), set()];

test('setsPerMuscle: chest 3 / triceps 3 (warm-up not counted), same answer from any day of the week', () => {
  const g = gym(wk('a', 7, { items: [item(bench4), item(push3, 'pushdown')] }));
  for (const d of ['2026-10-05', '2026-10-07', '2026-10-11']) assert.deepEqual(S.setsPerMuscle(DATA, g, d), [{ muscle: 'chest', sets: 3 }, { muscle: 'triceps', sets: 3 }], d);
});

test('setsPerMuscle: primary muscle only, custom exercises included, unknown id counted as "other", sorted by sets then name', () => {
  const custom = { id: 'custom-1', name: 'Cable Curl', muscle: 'biceps', equipment: 'cable' };
  const g = deepFreeze({ ...emptyGym(), customExercises: [custom], workouts: [wk('a', 7, { items: [
    item(bench4), item(push3, 'pushdown'), item([set(), set()], 'custom-1'), item([set(), set()], 'gone'), item([set()], 'mystery'),
  ] })] });
  // chest 3, triceps 3, other 3 (gone 2 + mystery 1), biceps 2: ties by name
  assert.deepEqual(S.setsPerMuscle(DATA, g, '2026-10-07'), [{ muscle: 'chest', sets: 3 }, { muscle: 'other', sets: 3 }, { muscle: 'triceps', sets: 3 }, { muscle: 'biceps', sets: 2 }]);
});

test('setsPerMuscle: only that week, only finished workouts, only done sets; two workouts add up', () => {
  const g = gym(
    wk('a', 7, { items: [item([set(), set({ done: false })])] }), // chest 1
    wk('b', 9, { items: [item([set()])] }),                       // chest +1, same week
    wk('c', 12, { items: [item([set(), set()])] }),               // next week
    open('d', 8, { items: [item([set(), set(), set()])] }),       // unfinished
  );
  assert.deepEqual(S.setsPerMuscle(DATA, g, '2026-10-05'), [{ muscle: 'chest', sets: 2 }]);
  assert.deepEqual(S.setsPerMuscle(DATA, g, '2026-10-12'), [{ muscle: 'chest', sets: 2 }]);
  assert.deepEqual(S.setsPerMuscle(DATA, g, '2026-10-19'), []);
});

test('setsPerMuscle: ids like toString and __proto__ land in "other"', () => {
  const g = gym(wk('a', 7, { items: [item([set(), set()], 'toString'), item([set()], '__proto__')] }));
  assert.deepEqual(S.setsPerMuscle(DATA, g, '2026-10-07'), [{ muscle: 'other', sets: 3 }]);
});

// ---------- estimated 1RM ----------
test('est1RM: Epley, 1 rep is the weight itself', () => {
  near(S.est1RM(set({ reps: 5, weight: 80 })), 93.3333333333);
  assert.equal(S.est1RM(set({ reps: 10, weight: 60 })), 80);
  assert.equal(S.est1RM(set({ reps: 1, weight: 100 })), 100);
  assert.equal(S.est1RM(set({ reps: 5, weight: 82.5 })), 96.25);
});

test('display1RM rounds to 0.1: 93.3 / 80.0 / 100', () => {
  assert.equal(S.display1RM(S.est1RM(set({ reps: 5, weight: 80 }))), 93.3);
  assert.equal(S.display1RM(S.est1RM(set({ reps: 10, weight: 60 }))), 80);
  assert.equal(S.display1RM(S.est1RM(set({ reps: 1, weight: 100 }))), 100);
});

test('est1RM is null for 50x12 and 0x15, and for every non-qualifying set', () => {
  assert.equal(S.est1RM(set({ reps: 12, weight: 50 })), null);
  assert.equal(S.est1RM(set({ reps: 15, weight: 0 })), null);
  assert.equal(S.est1RM(set({ reps: 11, weight: 50 })), null); // 11 reps: out
  assert.equal(S.est1RM(set({ reps: 10, weight: 50 })) !== null, true); // 10 reps: in
  assert.equal(S.est1RM(set({ reps: 5, weight: 0 })), null); // bodyweight
  assert.equal(S.est1RM(set({ warmup: true })), null);
  assert.equal(S.est1RM(set({ done: false })), null);
});

// ---------- PR ----------
const bench = (reps, weight, o = {}) => item([set({ reps, weight, ...o })]);

test('prMarkers: 80x5 baseline (93.3), 82.5x5 = 96.25 is a PR, 80x5 again = 93.3 is not', () => {
  const g = gym(wk('w1', 5, { items: [bench(5, 80)] }), wk('w2', 12, { items: [bench(5, 82.5)] }), wk('w3', 19, { items: [bench(5, 80)] }));
  assert.deepEqual(S.prMarkers(g, 'bench-press'), [{ workoutId: 'w2', itemIndex: 0, setIndex: 0, date: '2026-10-12', startedAt: T(12), e1rm: 96.25 }]);
});

test('prMarkers: ordered by startedAt, not by list order; the first performance has no marker', () => {
  const w1 = wk('w1', 5, { items: [bench(5, 80)] }), w2 = wk('w2', 12, { items: [bench(5, 82.5)] }), w3 = wk('w3', 19, { items: [bench(5, 80)] });
  assert.deepEqual(S.prMarkers(gym(w3, w2, w1), 'bench-press').map(m => m.workoutId), ['w2']);
  assert.deepEqual(S.prMarkers(gym(w1), 'bench-press'), []);
  assert.deepEqual(S.prMarkers(gym(), 'bench-press'), []);
});

test('prMarkers: strictly higher only; an equal 1RM is not a PR, a lower one after a PR is not either', () => {
  const g = gym(wk('w1', 5, { items: [bench(10, 60)] }), // 80.0 baseline
    wk('w2', 12, { items: [bench(1, 80)] }),             // 80 == 80.0, not a PR
    wk('w3', 19, { items: [bench(1, 81)] }),             // 81 PR
    wk('w4', 26, { items: [bench(1, 80.5)] }));          // below 81
  assert.deepEqual(S.prMarkers(g, 'bench-press').map(m => m.workoutId), ['w3']);
});

test('prMarkers: filters per Rules (warm-up, undone, 50x12, 0x15 and unfinished workouts never count)', () => {
  const g = gym(wk('w1', 5, { items: [bench(5, 80)] }),
    wk('w2', 12, { items: [item([set({ reps: 1, weight: 200, warmup: true }), set({ reps: 1, weight: 200, done: false }), set({ reps: 12, weight: 50 }), set({ reps: 15, weight: 0 }), set({ reps: 5, weight: 80 })])] }),
    open('w3', 19, { items: [bench(1, 300)] }));
  assert.deepEqual(S.prMarkers(g, 'bench-press'), []);
});

test('prMarkers: the baseline is the first workout with a qualifying set; all of its sets are baseline', () => {
  const g = gym(wk('w1', 5, { items: [item([set({ reps: 12, weight: 50 })])] }), // nothing qualifies, not the baseline
    wk('w2', 12, { items: [item([set({ reps: 10, weight: 60 }), set({ reps: 5, weight: 80 })])] }), // baseline 80.0 then 93.3: no marker
    wk('w3', 19, { items: [bench(5, 82.5)] }));
  assert.deepEqual(S.prMarkers(g, 'bench-press').map(m => m.workoutId), ['w3']);
});

test('prMarkers: later sets in one workout are compared with earlier sets of the same workout', () => {
  const g = gym(wk('w1', 5, { items: [bench(5, 80)] }),
    wk('w2', 12, { items: [item([set({ reps: 1, weight: 100 }), set({ reps: 1, weight: 100 }), set({ reps: 1, weight: 102.5 }), set({ reps: 1, weight: 101 })])] }));
  assert.deepEqual(S.prMarkers(g, 'bench-press').map(m => [m.setIndex, m.e1rm]), [[0, 100], [2, 102.5]]);
});

test('prMarkers: per exercise, the same exercise in two items of one workout, other exercises ignored', () => {
  const g = gym(wk('w1', 5, { items: [bench(5, 80), item([set({ reps: 5, weight: 90 })], 'pushdown')] }),
    wk('w2', 12, { items: [item([set({ reps: 1, weight: 95 })], 'pushdown'), bench(5, 82.5), bench(5, 85)] }));
  assert.deepEqual(S.prMarkers(g, 'bench-press').map(m => [m.workoutId, m.itemIndex, m.setIndex]), [['w2', 1, 0], ['w2', 2, 0]]);
  assert.deepEqual(S.prMarkers(g, 'pushdown'), []); // baseline 90x5 = 105, so 95x1 is below it
});

test('prMarkers: ids like toString and __proto__ are plain ids', () => {
  const g = gym(wk('w1', 5, { items: [item([set({ reps: 5, weight: 80 })], '__proto__')] }), wk('w2', 12, { items: [item([set({ reps: 5, weight: 82.5 })], '__proto__')] }));
  assert.deepEqual(S.prMarkers(g, 'toString'), []);
  assert.deepEqual(S.prMarkers(g, 'bench-press'), []);
  assert.deepEqual(S.prMarkers(g, '__proto__').map(m => m.workoutId), ['w2']);
});

test('nothing mutates its input (inputs are deep-frozen) and calls repeat to the same answer', () => {
  const g = gym(wk('w1', 5, { items: [bench(5, 80)] }), wk('w2', 12, { items: [bench(5, 82.5)] }));
  const run = () => JSON.stringify([S.visitDates(g), S.weeklyVisits(g, '2026-10-14'), S.monthlyVisits(g, '2026-10-14'), S.setsPerMuscle(DATA, g, '2026-10-12'), S.prMarkers(g, 'bench-press'), S.workoutVolume(g.workouts[0])]);
  assert.equal(run(), run());
});
