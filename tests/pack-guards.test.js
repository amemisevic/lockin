import test from 'node:test';
import assert from 'node:assert/strict';
import { importPack, missionFor, validatePack } from '../src/core/pack.js';
import { defaultState } from '../src/core/model.js';

// Backlog T6-1 (Task 21): importPack does no validation of its own; missionFor on odd day numbers.
test('importPack stores whatever it is given (validation belongs to validatePack), without mutating the old state', () => {
  const s = Object.freeze(defaultState());
  const junk = { missions: 'nope', tactics: 7 };
  const next = importPack(s, junk);
  assert.equal(next.pack, junk);
  assert.equal(s.pack, null);
  assert.notEqual(next, s);
  assert.equal(validatePack(JSON.stringify({ v: 1, ...junk })).ok, false); // the same pack is refused at the gate
});

test('an imported empty pack gives no mission', () => {
  const s = importPack(defaultState(), { missions: [], tactics: [] });
  assert.equal(missionFor(s, 1), null);
});

test('missionFor returns null for NaN, Infinity, -Infinity, non-integers, strings, null and undefined', () => {
  const s = importPack(defaultState(), { missions: [{ day: 1, title: 'Title A', body: 'Body A' }], tactics: [] });
  assert.equal(missionFor(s, 1).title, 'Title A');
  for (const n of [NaN, Infinity, -Infinity, 1.5, 0, -1, '1', null, undefined]) assert.equal(missionFor(s, n), null, String(n));
});

test('missionFor with no pack is null even for a valid day', () => {
  assert.equal(missionFor(defaultState(), 1), null);
});
