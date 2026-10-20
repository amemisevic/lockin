import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExerciseData, ensureExerciseData, retryExerciseData, exerciseData, exerciseDataFailed } from '../src/views/gymData.js';

// Gym G8: the bundled list loads on first Gym open (ruling 8). Sequential tests share the module cache on purpose.
const GOOD = { exercises: [{ id: 'a', name: 'A', equipment: 'other', muscle: 'other', category: 'strength' }], muscles: ['other'], equipment: ['other'] };
const okFetch = async () => ({ ok: true, json: async () => GOOD });
const tick = () => new Promise(r => setTimeout(r, 5));

test('loadExerciseData fetches the relative path and returns the parsed list', async () => {
  let url = null;
  const data = await loadExerciseData(async u => { url = u; return { ok: true, json: async () => GOOD }; });
  assert.equal(url, 'src/data/exercises.json');
  assert.deepEqual(data, GOOD);
});

test('loadExerciseData rejects: HTTP error, wrong shape, network error, bad JSON', async () => {
  await assert.rejects(loadExerciseData(async () => ({ ok: false, json: async () => GOOD })));
  await assert.rejects(loadExerciseData(async () => ({ ok: true, json: async () => ({ exercises: {}, muscles: [], equipment: [] }) })));
  await assert.rejects(loadExerciseData(async () => ({ ok: true, json: async () => null })));
  await assert.rejects(loadExerciseData(async () => { throw new Error('offline'); }));
  await assert.rejects(loadExerciseData(async () => ({ ok: true, json: async () => { throw new Error('bad json'); } })));
});

test('ensure: nothing loaded yet; two callers share one fetch and both hear about a failure', async () => {
  assert.equal(exerciseData(), null);
  assert.equal(exerciseDataFailed(), false);
  let calls = 0, heard = 0;
  const failing = async () => { calls++; throw new Error('offline'); };
  ensureExerciseData(() => heard++, failing);
  ensureExerciseData(() => heard++, failing);
  await tick();
  assert.equal(calls, 1);
  assert.equal(heard, 2);
  assert.equal(exerciseDataFailed(), true);
  assert.equal(exerciseData(), null);
});

test('ensure after a failure does not retry on its own', async () => {
  let calls = 0;
  ensureExerciseData(() => {}, async () => { calls++; throw new Error('x'); });
  await tick();
  assert.equal(calls, 0);
});

test('retry loads again; the data is cached and the failure flag clears', async () => {
  let heard = 0;
  retryExerciseData(() => heard++, okFetch);
  await tick();
  assert.deepEqual(exerciseData(), GOOD);
  assert.equal(exerciseDataFailed(), false);
  assert.equal(heard, 1);
});

test('ensure with data cached does not fetch; the listener argument is optional', async () => {
  let calls = 0;
  ensureExerciseData(undefined, async () => { calls++; return { ok: true, json: async () => GOOD }; });
  await tick();
  assert.equal(calls, 0);
});
