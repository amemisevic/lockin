import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout, addExercise } from '../src/core/workouts.js';
import {
  begin, parseWeight, parseReps, stepWeight, stepReps, fmtClock, elapsedSec, restState, lastTimeText, REST_CHOICES, DEFAULT_REST,
} from '../src/views/gymWorkoutLogic.js';

// Gym G9, workout screen logic. Pure and DOM-free. Expected values worked out by hand.
const T = new Date(2026, 9, 12, 10, 0, 0).getTime(); // Monday 12 October 2026, 10:00 local
const DAY = 86_400_000;
const set = (reps, weight, extra = {}) => ({ reps, weight, warmup: false, done: true, ...extra });
const hist = (id, startedAt, items) => ({ id, date: '2026-10-10', startedAt, finishedAt: startedAt + 3_600_000, name: '', routineId: null, items });
const BENCH = [set(10, 40, { warmup: true }), set(8, 80), set(8, 80), set(7, 77.5)];
const gymWith = (...workouts) => ({ ...emptyGym(), workouts });

test('constants: rest choices and the default', () => {
  assert.deepEqual(REST_CHOICES, [60, 90, 120, 180]);
  assert.equal(DEFAULT_REST, 90);
});

// ---- begin: start or repeat, on a day that is a parameter ----
test('begin: the date defaults to the local date of now; startedAt = now; one open workout', () => {
  const r = begin(emptyGym(), T);
  assert.equal(r.ok, true);
  const w = openWorkout(r.state);
  assert.equal(w.id, r.id);
  assert.equal(w.date, '2026-10-12');
  assert.equal(w.startedAt, T);
  assert.equal(w.finishedAt, null);
});

test('begin: a date parameter puts the workout on that day, startedAt still = now', () => {
  const r = begin(emptyGym(), T, { date: '2026-10-09' });
  assert.equal(r.ok, true);
  const w = openWorkout(r.state);
  assert.equal(w.date, '2026-10-09');
  assert.equal(w.startedAt, T);
});

test('begin: an impossible date is refused with the core code and nothing is added', () => {
  const g = emptyGym();
  const r = begin(g, T, { date: '2026-02-30' });
  assert.deepEqual(r, { ok: false, reason: 'date' });
  assert.equal(g.workouts.length, 0);
});

test('begin: a second start is refused with workout-open', () => {
  const first = begin(emptyGym(), T).state;
  assert.deepEqual(begin(first, T + 1000), { ok: false, reason: 'workout-open' });
  assert.deepEqual(begin(first, T + 1000, { date: '2026-10-09' }), { ok: false, reason: 'workout-open' });
});

test('begin repeat: same exercises as the latest finished workout, prefilled, nothing done', () => {
  const g = gymWith(hist('h1', T - 2 * DAY, [{ exerciseId: 'bench', sets: BENCH }, { exerciseId: 'row', sets: [set(10, 60)] }]));
  const r = begin(g, T, { repeat: true });
  assert.equal(r.ok, true);
  const w = openWorkout(r.state);
  assert.deepEqual(w.items.map(i => i.exerciseId), ['bench', 'row']);
  assert.deepEqual(w.items[0].sets.map(s => [s.reps, s.weight, s.done]), [[8, 80, false], [8, 80, false], [7, 77.5, false]]);
  assert.equal(w.date, '2026-10-12');
});

test('begin repeat with a date parameter, and with no history', () => {
  const g = gymWith(hist('h1', T - 2 * DAY, [{ exerciseId: 'bench', sets: BENCH }]));
  assert.equal(openWorkout(begin(g, T, { repeat: true, date: '2026-10-08' }).state).date, '2026-10-08');
  assert.deepEqual(begin(emptyGym(), T, { repeat: true }), { ok: false, reason: 'no-history' });
});

// ---- typed values ----
test('parseWeight: 0 to 1000, comma or point, at most two decimals; anything else is null', () => {
  const ok = { '80': 80, '77,5': 77.5, ' 82.5 ': 82.5, '0': 0, '1000': 1000, '12.25': 12.25, '007': 7 };
  for (const [text, v] of Object.entries(ok)) assert.equal(parseWeight(text), v, text);
  for (const bad of ['', ' ', 'abc', '-1', '1000.5', '1001', '1e2', '80.', '.5', '1,2,3', '8 0', '12.345', null, undefined, 80]) assert.equal(parseWeight(bad), null, String(bad));
});

test('parseReps: whole numbers 1 to 999; anything else is null', () => {
  const ok = { '8': 8, ' 12 ': 12, '1': 1, '999': 999, '08': 8 };
  for (const [text, v] of Object.entries(ok)) assert.equal(parseReps(text), v, text);
  for (const bad of ['', '0', '1000', '8.5', '8,5', '-3', 'x', '1e1', null, undefined, 8]) assert.equal(parseReps(bad), null, String(bad));
});

test('stepWeight: 2.5 kg steps, clamped to 0 and 1000, no float drift', () => {
  assert.equal(stepWeight(80, 1), 82.5);
  assert.equal(stepWeight(80, -1), 77.5);
  assert.equal(stepWeight(1, -1), 0);
  assert.equal(stepWeight(0, -1), 0);
  assert.equal(stepWeight(999, 1), 1000);
  assert.equal(stepWeight(1000, 1), 1000);
  assert.equal(stepWeight(77.3, 1), 79.8);
  assert.equal(stepWeight(0.1, 1), 2.6);
});

test('stepReps: 1 rep steps, clamped to 1 and 999', () => {
  assert.equal(stepReps(8, 1), 9);
  assert.equal(stepReps(8, -1), 7);
  assert.equal(stepReps(1, -1), 1);
  assert.equal(stepReps(999, 1), 999);
});

// ---- clocks ----
test('fmtClock: m:ss under an hour, h:mm:ss from one hour, never negative', () => {
  const cases = [[0, '0:00'], [5, '0:05'], [59, '0:59'], [60, '1:00'], [90, '1:30'], [3599, '59:59'], [3600, '1:00:00'], [3725, '1:02:05'], [-4, '0:00']];
  for (const [s, text] of cases) assert.equal(fmtClock(s), text, String(s));
});

test('elapsedSec: whole seconds since the start, from timestamps; a clock set back gives 0', () => {
  assert.equal(elapsedSec(1000, 62_999), 61);
  assert.equal(elapsedSec(1000, 1000), 0);
  assert.equal(elapsedSec(5000, 1000), 0);
  assert.equal(elapsedSec(T, T + 3_725_000), 3725);
});

test('restState: from the stored end time. None = idle; seconds round up; at or past the end = over', () => {
  assert.deepEqual(restState(null, T), { kind: 'idle' });
  assert.deepEqual(restState(T + 90_000, T), { kind: 'running', secs: 90, text: '1:30' });
  assert.deepEqual(restState(T + 90_000, T + 1), { kind: 'running', secs: 90, text: '1:30' }); // 89.999 s left
  assert.deepEqual(restState(T + 90_000, T + 30_000), { kind: 'running', secs: 60, text: '1:00' });
  assert.deepEqual(restState(T + 90_000, T + 89_999), { kind: 'running', secs: 1, text: '0:01' });
  assert.deepEqual(restState(T + 90_000, T + 90_000), { kind: 'over', text: 'Rest over' });
  assert.deepEqual(restState(T + 90_000, T + 600_000), { kind: 'over', text: 'Rest over' }); // the phone slept ten minutes
});

// ---- last time ----
test('lastTimeText: the latest finished workout with a working set, warm-ups left out', () => {
  const older = hist('h0', T - 9 * DAY, [{ exerciseId: 'bench', sets: [set(5, 60)] }]);
  const g = gymWith(older, hist('h1', T - 2 * DAY, [{ exerciseId: 'bench', sets: BENCH }]));
  assert.equal(lastTimeText(g, 'bench', null), '80 × 8 · 80 × 8 · 77.5 × 7');
});

test('lastTimeText: ignores open workouts and the excluded one; empty when there is no history', () => {
  const open = { ...hist('o', T, [{ exerciseId: 'bench', sets: [set(3, 100)] }]), finishedAt: null };
  const done = hist('h1', T - 2 * DAY, [{ exerciseId: 'bench', sets: BENCH }]);
  assert.equal(lastTimeText(gymWith(done, open), 'bench', null), '80 × 8 · 80 × 8 · 77.5 × 7');
  assert.equal(lastTimeText(gymWith(open), 'bench', null), '');
  assert.equal(lastTimeText(gymWith(done), 'bench', 'h1'), '');
  assert.equal(lastTimeText(gymWith(done), 'row', null), '');
  assert.equal(lastTimeText(emptyGym(), 'bench', null), '');
});

test('lastTimeText: a warm-up-only history is no history; ids like toString and __proto__ do not throw', () => {
  const g = gymWith(hist('h1', T - DAY, [{ exerciseId: 'bench', sets: [set(10, 40, { warmup: true })] }]));
  assert.equal(lastTimeText(g, 'bench', null), '');
  assert.equal(lastTimeText(g, 'toString', null), '');
  assert.equal(lastTimeText(g, '__proto__', null), '');
});

test('begin + addExercise uses the same last-time sets that lastTimeText prints', () => {
  const g = gymWith(hist('h1', T - 2 * DAY, [{ exerciseId: 'bench', sets: BENCH }]));
  const s = begin(g, T).state;
  const w = openWorkout(s);
  const withBench = addExercise(s, w.id, 'bench').state;
  assert.deepEqual(openWorkout(withBench).items[0].sets.map(x => `${x.weight} × ${x.reps}`), ['80 × 8', '80 × 8', '77.5 × 7']);
});
