import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, validateState } from '../src/core/model.js';
import { validateImport, backupStatus } from '../src/core/store.js';

// Task 19 core edits (owner-authorised a-c): setup storage, damaged days / war log keys, non-string import, future backup.
const P = { id: 'p1', title: 'Protocol A', med: null };
const R = { id: 'r1', name: 'Red line A' };
const withSetup = setup => ({ ...defaultState(), setup });
const day = patch => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...patch });

test('setup: absent is valid and defaultState has no setup key', () => {
  assert.equal(validateState(defaultState()), null);
  assert.equal('setup' in defaultState(), false);
});

test('setup: valid protocols and red lines pass', () => {
  assert.equal(validateState(withSetup({ protocols: [P, { id: 'p2', title: 'Protocol B', med: 'Short version' }], redLines: [R] })), null);
  assert.equal(validateState(withSetup({ protocols: [], redLines: [] })), null);
});

test('setup: damaged shapes are refused with a plain sentence', () => {
  const bad = [null, [], 'x', {}, { protocols: [], redLines: 'x' }, { protocols: [{ id: 'p' }], redLines: [] },
    { protocols: [], redLines: [{ id: 'r', name: 5 }] }, { protocols: [{ ...P, med: 5 }], redLines: [] }];
  for (const s of bad) assert.equal(validateState(withSetup(s)), "The backup's setup is damaged.", JSON.stringify(s));
});

test('days: closedAt set with result null is refused', () => {
  const s = { ...defaultState(), days: { '2026-10-01': day({ closedAt: 5, result: null }) } };
  assert.equal(validateState(s), "The backup's days are damaged.");
});

test('days: closed with a result, open, and result without closedAt are still valid', () => {
  assert.equal(validateState({ ...defaultState(), days: { '2026-10-01': day({ closedAt: 5, result: 'passed' }) } }), null);
  assert.equal(validateState({ ...defaultState(), days: { '2026-10-01': day() } }), null);
  assert.equal(validateState({ ...defaultState(), days: { '2026-10-01': day({ result: 'redo' }) } }), null);
});

test('warLog: only the known keys are accepted', () => {
  const e = { text: 'x', updatedAt: 1 };
  const ok = ['contract', 'funeral', 'code', 'redlines-w1', 'autopsy-2026-10-01', 'day-1', 'day-30'];
  assert.equal(validateState({ ...defaultState(), warLog: Object.fromEntries(ok.map(k => [k, e])) }), null);
  for (const k of ['secret', 'autopsy-2026-1-1', 'autopsy-', 'day-', 'day-x', 'day-1x', 'Contract', 'redlines-w2', '__proto__x'])
    assert.equal(validateState({ ...defaultState(), warLog: { [k]: e } }), "The backup's war log is damaged.", k);
});

test('validateImport: non-string input never throws', () => {
  for (const x of [undefined, null, 5, {}, [], true, () => 1]) {
    const r = validateImport(x);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, 'string');
    assert.ok(r.error.length > 0);
  }
});

test('validateImport: v2 file with a day closed without a result is refused with the exact sentence', () => {
  const s = { ...defaultState(), days: { '2026-10-01': day({ closedAt: 5 }) } };
  assert.deepEqual(validateImport(JSON.stringify(s)), { ok: false, error: "The backup's days are damaged." });
});

test('backupStatus: a future lastBackup is overdue with days null, never negative', () => {
  const s = { ...defaultState(), settings: { ...defaultState().settings, lastBackup: '2026-10-20' } };
  assert.deepEqual(backupStatus(s, '2026-10-15'), { days: null, overdue: true });
  const same = { ...s, settings: { ...s.settings, lastBackup: '2026-10-15' } };
  assert.deepEqual(backupStatus(same, '2026-10-15'), { days: 0, overdue: false });
});
