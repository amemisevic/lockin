import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/views/todayLogic.js'; // namespace: a missing export fails per test, by name
import { NIGHT_FROM, startChallenge, submitMorning, declareRedo } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';

// Task 12 owner rulings: Q3 the "Night opens" line hides from NIGHT_FROM on; Q5 the "No MED today" line hides
// while a Recovery is pending (same source as todayCards: pendingRecovery).
const at = (key, h, mi = 0, s = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi, s).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const D1 = '2026-10-13', D2 = '2026-10-14';

function begin() {
  let s = defaultState();
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1']) s = setWarEntry(s, k, `Text ${k}`, at(D1, 7));
  s = ok(startChallenge(s, D1, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
  return ok(submitMorning(s, D1, { target: 'Target A', risk: '', med: [] }, at(D1, 8)));
}
const resetD1 = () => ok(closeNight(begin(), D1, { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } }, at(D1, 21)));

test('night line: shown one second before NIGHT_FROM', () => {
  assert.equal(L.nightLineVisible(at(D1, NIGHT_FROM) - 1000), true);
});

test('night line: hidden exactly at NIGHT_FROM', () => {
  assert.equal(L.nightLineVisible(at(D1, NIGHT_FROM)), false);
});

test('night line: hidden after NIGHT_FROM (23:59)', () => {
  assert.equal(L.nightLineVisible(at(D1, 23, 59)), false);
});

test('MED line: hidden while the Recovery from yesterday\'s Reset is pending', () => {
  assert.equal(L.medLine(resetD1(), D2, at(D2, 8)), null);
});

test('MED line: Reset yesterday, Recovery filed → "No MED today. Yesterday was a Reset."', () => {
  const form = { state: 'Tired', time: '22:00', place: 'Home', decision: 'I will move the phone out of the bedroom',
    change: 'I will delete the app from my phone' };
  const s = ok(fileAutopsy(resetD1(), D1, form, at(D2, 7)));
  assert.equal(L.medLine(s, D2, at(D2, 8)), 'No MED today. Yesterday was a Reset.');
});

test('MED line: declared Redo yesterday, no Recovery → "No MED today. Yesterday was a declared Redo."', () => {
  let s = ok(declareRedo(begin(), D1, at(D1, 9)));
  s = ok(closeNight(s, D1, { protocols: { p1: 'held' }, redLines: { r1: 'held' } }, at(D1, 21)));
  assert.equal(L.medLine(s, D2, at(D2, 8)), 'No MED today. Yesterday was a declared Redo.');
});

test('MED line: no forced full pass → null', () => {
  const s = ok(closeNight(begin(), D1, { protocols: { p1: 'held' }, redLines: { r1: 'held' } }, at(D1, 21)));
  assert.equal(L.medLine(s, D2, at(D2, 8)), null);
});
