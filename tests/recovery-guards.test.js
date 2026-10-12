import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/core/recovery.js';
import * as W from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';

// Task 5 fix round 1. Expected values are hand-derived from the plan's Rules and the owner calls (quoted per assertion).
const TUE = '2026-10-13';
const DUE = new Date(2026, 9, 14, 21, 0).getTime(); // local clock, used as a dueAt
const HOUR_MS = 3600000;

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const entry = (dueAt, filedAt = null) => ({ dueAt, filedAt, state: '', time: '', place: '', decision: '', change: '' });
const st = (recovery = {}, warLog = {}) => deepFreeze({ ...defaultState(), recovery, warLog });
// Neutral answers; decision and change each pass checkVague (length, words, keyword 'leave' / 'delete').
const VALID = { state: 'Tired and restless after a long day', time: 'late evening', place: 'Living room sofa',
  decision: 'Leave the phone in the hallway at night', change: 'Delete the app and charge my phone in the kitchen' };

test('fileAutopsy: inherited object keys are not recovery entries', () => {
  const s = st({ [TUE]: entry(DUE) });
  for (const key of ['toString', 'constructor', '__proto__']) {
    const before = JSON.stringify(s);
    // Owner call 1: no stored recovery[date] → "no-recovery"; "Any refusal … leaves state unchanged".
    assert.deepEqual(R.fileAutopsy(s, key, VALID, DUE - HOUR_MS), { ok: false, error: 'no-recovery' }, key);
    assert.equal(JSON.stringify(s), before, key);
  }
});

test('fileAutopsy: filing after dueAt still succeeds', () => {
  const now = DUE + HOUR_MS;
  const r = R.fileAutopsy(st({ [TUE]: entry(DUE) }), TUE, VALID, now);
  // Rules: "overdue (past dueAt) turns crimson, nothing else changes" → filing is still accepted; filedAt = nowMs.
  assert.equal(r.ok, true, r.error);
  assert.equal(r.state.recovery[TUE].filedAt, now);
  assert.equal(validateState(r.state), null);
});

test('warEntries: out-of-pattern day and autopsy keys are skipped', () => {
  // Built by hand, as from an import. Owner call 5 patterns: day-([1-9]|[12]\d|30), autopsy-\d{4}-\d{2}-\d{2}.
  // 'day-31' > 30 and 'autopsy-2026-1-1' lacks two-digit month/day → match no group → skipped (owner answer).
  const s = st({}, { 'day-31': { text: 'Day text', updatedAt: 1 }, 'autopsy-2026-1-1': { text: 'Autopsy text', updatedAt: 2 },
    'day-3': { text: 'Day three', updatedAt: 3 } });
  assert.deepEqual(W.warEntries(s), [{ key: 'day-3', title: 'Day 3 notes', group: 'Days', updatedAt: 3, preview: 'Day three' }]);
});
