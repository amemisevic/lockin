import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGym, validateGym, loadGym, saveGym } from '../src/core/gym.js';
import { addSet, addExercise, editSet, toggleDone, finishWorkout, openWorkout } from '../src/core/workouts.js';
import { workoutVolume, est1RM } from '../src/core/gymstats.js';
import { validateImport, exportJson } from '../src/core/store.js';
import { defaultState } from '../src/core/model.js';

// True empty sets (owner, 2026-10-27): reps and weight are null on a set of an OPEN workout that has not been filled in.
// A finished workout, a routine template and a done set always have numbers.
const blank = (o = {}) => ({ reps: null, weight: null, warmup: false, done: false, ...o });
const num = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const wk = (o = {}) => ({ id: 'w9', date: '2026-10-12', startedAt: 1000, finishedAt: null, name: '', routineId: null, items: [{ exerciseId: 'bench', sets: [blank()] }], ...o });
const gym = (...workouts) => ({ ...emptyGym(), workouts });
const reason = g => validateGym(g).reason;
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('an open workout accepts null reps and null weight, together or one at a time', () => {
  for (const s of [blank(), blank({ reps: 8 }), blank({ weight: 80 }), blank({ reps: 8, weight: 0 })]) assert.deepEqual(validateGym(gym(wk({ items: [{ exerciseId: 'bench', sets: [s] }] }))), { ok: true });
});

test('a finished workout refuses null reps and null weight', () => {
  const fin = s => gym(wk({ finishedAt: 2000, items: [{ exerciseId: 'bench', sets: [num(), s] }] }));
  assert.equal(reason(fin(blank({ weight: 80 }))), 'reps');
  assert.equal(reason(fin(blank({ reps: 8 }))), 'weight');
  assert.equal(reason(fin(blank({ warmup: true }))), 'reps');
});

test('a done set must have numbers, even in an open workout', () => {
  assert.equal(reason(gym(wk({ items: [{ exerciseId: 'bench', sets: [blank({ done: true })] }] }))), 'reps');
  assert.equal(reason(gym(wk({ items: [{ exerciseId: 'bench', sets: [blank({ reps: 8, done: true })] }] }))), 'weight');
});

test('null is for sets of an open workout only: not in a routine, and other bad values still fail', () => {
  const r = sets => ({ ...emptyGym(), routines: [{ id: 'r1', name: 'A', createdAt: 1, items: [{ exerciseId: 'bench', sets }] }] });
  assert.equal(reason(r([{ reps: null, weight: 80 }])), 'reps');
  assert.equal(reason(r([{ reps: 8, weight: null }])), 'weight');
  for (const v of [undefined, NaN, '8', 0]) assert.equal(reason(gym(wk({ items: [{ exerciseId: 'bench', sets: [blank({ reps: v })] }] }))), 'reps');
});

test('addSet adds a blank set to an open workout and a 1 / 0 set to a finished one', () => {
  const o = addSet(gym(wk()), 'w9', 0);
  assert.deepEqual(o.state.workouts[0].items[0].sets[1], blank());
  const f = addSet(gym(wk({ finishedAt: 2000, items: [{ exerciseId: 'bench', sets: [num()] }] })), 'w9', 0);
  assert.deepEqual(f.state.workouts[0].items[0].sets[1], { reps: 1, weight: 0, warmup: false, done: false });
});

test('addExercise keeps its prefill rule: no history is still one 1 / 0 set (the screen blanks it)', () => {
  assert.deepEqual(addExercise(gym(wk({ items: [] })), 'w9', 'row').state.workouts[0].items[0].sets, [{ reps: 1, weight: 0, warmup: false, done: false }]);
});

test('editSet writes null to an open workout set and refuses it in a finished one', () => {
  const g = gym(wk({ items: [{ exerciseId: 'bench', sets: [num({ done: false })] }] }));
  assert.deepEqual(editSet(g, 'w9', 0, 0, { reps: null, weight: null }).state.workouts[0].items[0].sets[0], blank());
  const f = gym(wk({ finishedAt: 2000, items: [{ exerciseId: 'bench', sets: [num()] }] }));
  assert.deepEqual(editSet(f, 'w9', 0, 0, { reps: null }), { ok: false, reason: 'reps' });
  assert.deepEqual(editSet(f, 'w9', 0, 0, { weight: null }), { ok: false, reason: 'weight' });
});

test('a blank set cannot be ticked done until both numbers are there', () => {
  let g = gym(wk());
  assert.deepEqual(toggleDone(g, 'w9', 0, 0), { ok: false, reason: 'reps' });
  g = editSet(g, 'w9', 0, 0, { reps: 8 }).state;
  assert.deepEqual(toggleDone(g, 'w9', 0, 0), { ok: false, reason: 'weight' });
  g = editSet(g, 'w9', 0, 0, { weight: 80 }).state;
  assert.equal(toggleDone(g, 'w9', 0, 0).ok, true);
});

test('Finish is refused while any set is blank, a warm-up included, and works once it is filled', () => {
  const g = gym(wk({ items: [{ exerciseId: 'bench', sets: [num(), blank({ warmup: true })] }] }));
  assert.equal(finishWorkout(g, 'w9', 5000).ok, false);
  assert.equal(finishWorkout(g, 'w9', 5000).reason, 'reps');
  const filled = editSet(g, 'w9', 0, 1, { reps: 5, weight: 20 }).state;
  assert.equal(finishWorkout(filled, 'w9', 5000).ok, true);
});

test('null survives save and load (a reload)', () => {
  const st = mem();
  const g = gym(wk({ items: [{ exerciseId: 'bench', sets: [num({ done: false }), blank({ reps: 5 })] }] }));
  assert.equal(saveGym(st, g).ok, true);
  const back = loadGym(st);
  assert.equal(back.corrupt, false);
  assert.deepEqual(openWorkout(back.state).items[0].sets[1], blank({ reps: 5 }));
});

test('import accepts null in an open workout and refuses it in a finished one', () => {
  const text = g => exportJson(defaultState(), g);
  const open = gym(wk());
  const fin = gym(wk({ finishedAt: 2000, items: [{ exerciseId: 'bench', sets: [num(), blank()] }] }));
  assert.equal(validateImport(text(open)).ok, true);
  assert.equal(validateImport(text(fin)).ok, false);
});

// Readers: an open workout with blank sets never reaches a number as NaN.
test('volume and 1RM treat a blank set as not logged', () => {
  const w = wk({ items: [{ exerciseId: 'bench', sets: [blank(), blank({ reps: 5 }), num()] }] });
  assert.equal(workoutVolume(w), 640);
  assert.equal(est1RM(blank()), null);
  assert.equal(est1RM(blank({ reps: 5 })), null);
});
