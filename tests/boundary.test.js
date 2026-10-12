import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/challenge.js';
import * as S from '../src/core/scoring.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Night close on DST-change days and at the exact 04:00 grace edge. Runs in three zones via tz.test.js.
const at = (key, h, mi = 0, s = 0, ms = 0) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, h, mi, s, ms).getTime();
};
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

const FORM = { protocols: { p1: 'held' }, redLines: { r1: 'held' } };
const DATES = [
  ['2026-03-08', 'US spring'], ['2026-03-29', 'EU spring'], ['2026-09-27', 'NZ spring'],
  ['2026-10-25', 'EU fall'], ['2026-11-01', 'US fall'], ['2027-04-04', 'NZ fall'],
];

// Challenge starts on D; D's morning is filed at 08:00.
function startedOn(D) {
  const r = C.startChallenge(defaultState(), D, { oathComplete: true,
    protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }] });
  assert.equal(r.ok, true, r.error);
  const m = C.submitMorning(r.state, D, { target: 'Target A', risk: '', med: [] }, at(D, 8));
  assert.equal(m.ok, true, m.error);
  return deepFreeze(m.state);
}

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

for (const [D, label] of DATES) {
  test(`${D} (${label}): night closes until 03:59:59.999, settles as redo at 04:00, closes after midnight`, () => {
    const s = startedOn(D), next = addDays(D, 1);

    // a. last millisecond of the grace: still closable.
    const last = at(next, 3, 59, 59, 999);
    assert.ok(S.nightTargets(s, last).includes(D));
    const a = S.closeNight(s, D, FORM, last);
    assert.equal(a.ok, true, a.error);
    assert.equal(a.state.days[D].result, 'passed');
    assert.equal(a.state.days[D].closedAt, last);
    assert.equal(validateState(a.state), null);

    // b. 04:00: no longer closable; settleMissed closes it as redo at exactly 04:00.
    const grace = at(next, 4);
    assert.ok(!S.nightTargets(s, grace).includes(D));
    const before = JSON.stringify(s);
    assert.deepEqual(S.closeNight(s, D, FORM, grace), { ok: false, error: 'not-closable' });
    assert.equal(JSON.stringify(s), before);
    const b = S.settleMissed(s, grace);
    assert.equal(b.days[D].result, 'redo');
    assert.equal(b.days[D].auto, 'no-night');
    assert.equal(b.days[D].closedAt, grace);
    assert.equal(validateState(b), null);

    // c. 00:40 the next day closes D (Review Focus 1).
    const c = S.closeNight(s, D, FORM, at(next, 0, 40));
    assert.equal(c.ok, true, c.error);
    assert.equal(c.state.days[D].result, 'passed');
    assert.equal(validateState(c.state), null);
  });
}
