import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/views/settingsLogic.js';
import { defaultState } from '../src/core/model.js';
import { startChallenge } from '../src/core/challenge.js';

// T19-3: deleting an id that is not in the list changes nothing; app.set skips the save when the state is the same object.
const P = { id: 'p1', title: 'Protocol A', med: null };
const R = { id: 'r1', name: 'Red line A' };
const pre = { ...defaultState(), setup: { protocols: [P], redLines: [R] } };
const live = startChallenge(defaultState(), '2026-10-12', { protocols: [P], redLines: [R], oathComplete: true }).state;

for (const [name, s] of [['before Day 1', pre], ['during the challenge', live]]) {
  test(`deleteProtocol / deleteRedLine with an unknown id return the same state (${name})`, () => {
    assert.deepEqual(L.deleteProtocol(s, 'nope'), { ok: true, state: s });
    assert.equal(L.deleteProtocol(s, 'nope').state, s);
    assert.equal(L.deleteRedLine(s, 'nope').state, s);
  });
}

test('a known id still deletes', () => {
  const s = { ...pre, setup: { protocols: [P, { id: 'p2', title: 'B', med: null }], redLines: [R] } };
  assert.deepEqual(L.deleteProtocol(s, 'p2').state.setup.protocols, [P]);
});
