import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/challenge.js';
import { defaultState, validateState } from '../src/core/model.js';

// Owner ruling (Task 3): before 04:00, a morning for today is refused while yesterday is an open challenge day.
// 2026-10-12 is a Monday and Day 1 below.
const MON = '2026-10-12', TUE = '2026-10-13';
const CLOSE_FIRST = 'Close yesterday first.';

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
// Local wall-clock time, dayOffset days after MON.
const at = (dayOffset, h, min = 0) => new Date(2026, 9, 12 + dayOffset, h, min).getTime();

const challenge = { startDate: MON, length: 30, redoUsed: null,
  protocols: [{ id: 'pa', title: 'Protocol A', med: 'Short version A' }], redLines: [{ id: 'ra', name: 'Red line A' }] };
const day = (o = {}) => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...o });
const st = (days = {}) => deepFreeze({ ...defaultState(), challenge, days });
const form = (o = {}) => ({ target: 'Target A', risk: '', med: [], ...o });
const openMon = () => st({ [MON]: day({ morning: { at: 1, target: 'Target A', risk: '', med: [] } }) });

test('a: yesterday open at 00:30, morning with MED refused, state unchanged', () => {
  const s = openMon();
  const before = JSON.stringify(s);
  assert.deepEqual(C.submitMorning(s, TUE, form({ med: ['pa'] }), at(1, 0, 30)), { ok: false, error: CLOSE_FIRST });
  assert.equal(JSON.stringify(s), before);
});

test('b: yesterday open at 00:30, morning without MED refused', () => {
  assert.deepEqual(C.submitMorning(openMon(), TUE, form(), at(1, 0, 30)), { ok: false, error: CLOSE_FIRST });
  // A day with no entry at all is open too.
  assert.deepEqual(C.submitMorning(st(), TUE, form(), at(1, 3, 59)), { ok: false, error: CLOSE_FIRST });
});

test('c: yesterday closed with any result, morning at 00:30 accepted', () => {
  for (const result of ['passed', 'redo', 'reset']) {
    const r = C.submitMorning(st({ [MON]: day({ result, closedAt: 1 }) }), TUE, form(), at(1, 0, 30));
    assert.equal(r.ok, true, result);
    assert.equal(validateState(r.state), null);
    assert.equal(r.state.days[TUE].morning.target, 'Target A');
  }
});

test('d: Day 1 at 00:30 is not blocked (previous day is before the start)', () => {
  const r = C.submitMorning(st(), MON, form({ med: ['pa'] }), at(0, 0, 30));
  assert.equal(r.ok, true);
  assert.equal(validateState(r.state), null);
});

test('e: yesterday closed as reset, MED at 00:30 refused for the forced-pass reason', () => {
  const s = st({ [MON]: day({ result: 'reset', closedAt: at(1, 0, 10) }) });
  assert.deepEqual(C.submitMorning(s, TUE, form({ med: ['pa'] }), at(1, 0, 30)),
    { ok: false, error: 'No MED today. Yesterday was a Reset.' });
});

test('f: declareRedo for a date that is not the local date of nowMs is refused', () => {
  const s = openMon();
  const r = C.declareRedo(s, MON, at(1, 0, 30));
  assert.deepEqual(r, { ok: false, error: 'You can only declare a Redo for today.' });
  const ok = C.declareRedo(s, TUE, at(1, 0, 30));
  assert.equal(ok.ok, true);
  assert.equal(ok.state.challenge.redoUsed, TUE);
  assert.equal(validateState(ok.state), null);
});

test('g: the same submit at 05:00 is not blocked by this rule', () => {
  const r = C.submitMorning(openMon(), TUE, form({ med: ['pa'] }), at(1, 5, 0));
  assert.equal(r.ok, true);
  assert.equal(validateState(r.state), null);
});

test('h: a submit for a date other than the clock date is not blocked, even before 04:00', () => {
  // Clock: Wednesday 00:30. Submitted date: Tuesday, with Monday open.
  const r = C.submitMorning(openMon(), TUE, form(), at(2, 0, 30));
  assert.equal(r.ok, true);
  assert.equal(validateState(r.state), null);
});
