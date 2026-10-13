import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAction, startChallenge } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { pendingRecovery, fileAutopsy } from '../src/core/recovery.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';

// Plan Task 12 (PROGRESS Task 5 Minor 9): a Recovery filed at filedAt === 0 counts as filed, as in pendingRecovery.
const D1 = '2026-10-13', D2 = '2026-10-14';
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };

test('nextAction: a Recovery with filedAt 0 is filed, so the morning is next', () => {
  let s = defaultState();
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1']) s = setWarEntry(s, k, `Text ${k}`, at(D1, 7));
  s = ok(startChallenge(s, D1, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
  s = ok(closeNight(s, D1, { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } }, at(D1, 21)));
  s = ok(fileAutopsy(s, D1, { state: 'Tired after work', time: 'Evening', place: 'Room A',
    decision: 'I will block the app after work', change: 'I will delete the app from the phone' }, 0));
  assert.equal(s.recovery[D1].filedAt, 0);
  assert.equal(pendingRecovery(s, at(D2, 8)), null);
  assert.equal(nextAction(s, at(D2, 8)), 'morning');
});
