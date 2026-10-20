import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteCustom } from '../src/core/exercises.js';
import { emptyGym, validateGym } from '../src/core/gym.js';

// G8b: delete a custom exercise. Built-in ids are never in customExercises, so they come back as 'unknown-id'.
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const fly = { id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' };
const raise = { id: 'custom-2', name: 'Side Raise', muscle: 'shoulders', equipment: 'dumbbell' };
const set = { reps: 8, weight: 20, done: true, warmup: false };
const workout = (id, finishedAt, ids) => ({ id, date: '2026-10-05', startedAt: 1, finishedAt, name: '', routineId: null, items: ids.map(exerciseId => ({ exerciseId, sets: [set] })) });
const routine = ids => ({ id: 'r-1', name: 'Push', createdAt: 1, items: ids.map(exerciseId => ({ exerciseId, sets: [{ reps: 8, weight: 20 }] })) });
const gym = (extra = {}) => deepFreeze({ ...emptyGym(), customExercises: [fly, raise], ...extra });

test('deleteCustom: removes the custom exercise, keeps the other one and everything else', () => {
  const g = gym({ workouts: [workout('w-1', 2, ['bench'])] });
  const r = deleteCustom(g, 'custom-1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.customExercises, [raise]);
  assert.equal(r.state.workouts, g.workouts);
  assert.equal(r.state.settings, g.settings);
  assert.equal(validateGym(r.state).ok, true);
});

test('deleteCustom: never mutates its input (frozen) and returns a new state', () => {
  const g = gym();
  const r = deleteCustom(g, 'custom-2');
  assert.notEqual(r.state, g);
  assert.deepEqual(g.customExercises, [fly, raise]);
});

test('deleteCustom: a built-in id is refused, state untouched', () => {
  const r = deleteCustom(gym(), 'bench-press');
  assert.deepEqual(r, { ok: false, reason: 'unknown-id' });
});

test('deleteCustom: unknown, empty and non-string ids are refused', () => {
  for (const id of ['custom-9', '', undefined, null, 5, {}]) assert.deepEqual(deleteCustom(gym(), id), { ok: false, reason: 'unknown-id' }, String(id));
});

test('deleteCustom: used in a finished workout is refused as in-use', () => {
  const r = deleteCustom(gym({ workouts: [workout('w-1', 2, ['bench', 'custom-1'])] }), 'custom-1');
  assert.deepEqual(r, { ok: false, reason: 'in-use' });
});

test('deleteCustom: used in an open workout is refused as in-use', () => {
  const r = deleteCustom(gym({ workouts: [workout('w-1', null, ['custom-1'])] }), 'custom-1');
  assert.deepEqual(r, { ok: false, reason: 'in-use' });
});

test('deleteCustom: used in a routine is refused as in-use', () => {
  const r = deleteCustom(gym({ routines: [routine(['custom-1'])] }), 'custom-1');
  assert.deepEqual(r, { ok: false, reason: 'in-use' });
});

test('deleteCustom: another exercise being in use does not block this one', () => {
  const g = gym({ workouts: [workout('w-1', 2, ['custom-2'])], routines: [routine(['custom-2'])] });
  const r = deleteCustom(g, 'custom-1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.customExercises, [raise]);
  assert.deepEqual(deleteCustom(g, 'custom-2'), { ok: false, reason: 'in-use' });
});

test('deleteCustom: tolerates a gym with no lists (missing workouts, routines, items)', () => {
  const r = deleteCustom({ v: 1, customExercises: [fly], workouts: [{ id: 'w', items: undefined }] }, 'custom-1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.customExercises, []);
});
