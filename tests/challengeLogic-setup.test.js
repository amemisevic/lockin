import test from 'node:test';
import assert from 'node:assert/strict';
import { setupLists, beginStatus, begin } from '../src/views/challengeLogic.js';
import { defaultState } from '../src/core/model.js';
import { setWarEntry } from '../src/core/warlog.js';

// Task 19: setupLists is the single seam between Day 0 and the pre-Day-1 storage state.setup.
const oath = s => ['contract', 'funeral', 'code', 'redlines-w1'].reduce((a, k) => setWarEntry(a, k, 'x', 1), s);
const P = { id: 'p1', title: 'Protocol A', med: null };
const R = { id: 'r1', name: 'Red line A' };
const D1 = '2026-10-15';

test('setupLists reads state.setup', () => {
  const s = { ...defaultState(), setup: { protocols: [P], redLines: [R] } };
  assert.deepEqual(setupLists(s), { protocols: [P], redLines: [R] });
});

test('setupLists falls back to empty lists when setup is absent', () => {
  assert.deepEqual(setupLists(defaultState()), { protocols: [], redLines: [] });
});

test('Begin Day 1 enables only with the oath and both lists, decided by the core', () => {
  const base = oath(defaultState());
  assert.deepEqual(beginStatus({ ...base, setup: { protocols: [P], redLines: [] } }, D1),
    { enabled: false, reason: 'Add at least one red line.' });
  assert.deepEqual(beginStatus({ ...base, setup: { protocols: [], redLines: [R] } }, D1),
    { enabled: false, reason: 'Add at least one protocol.' });
  const ready = { ...base, setup: { protocols: [P], redLines: [R] } };
  assert.deepEqual(beginStatus(ready, D1), { enabled: true, reason: null });
  assert.deepEqual(beginStatus({ ...ready, warLog: {} }, D1), { enabled: false, reason: 'Write your Contract, Funeral and Code first.' });
});

test('begin copies the setup lists into the challenge', () => {
  const r = begin({ ...oath(defaultState()), setup: { protocols: [P], redLines: [R] } }, D1);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.challenge.protocols, [P]);
  assert.deepEqual(r.state.challenge.redLines, [R]);
  assert.equal(r.state.challenge.startDate, D1);
});

test('begin drops the pre-Day-1 setup once the challenge owns the lists', () => {
  const r = begin({ ...oath(defaultState()), setup: { protocols: [P], redLines: [R] } }, D1);
  assert.equal('setup' in r.state, false);
});
