import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryRoute, closedTime, newDraft, effects, countdown, canFile, autopsyForm, errorText, STATES, PLACES }
  from '../src/views/recoveryLogic.js';
import { checkVague, fileAutopsy } from '../src/core/recovery.js';
import { startChallenge, dayNo } from '../src/core/challenge.js';
import { closeNight, settleMissed } from '../src/core/scoring.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';
import { CHALLENGE_LENGTH } from '../src/views/challengeLogic.js';
import { timeLeft } from '../src/views/todayLogic.js';
import { addDays } from '../src/logic.js';

// Task 17 (Recovery screen) logic, DOM-free. Generic fixture text only.
const NUDGE = checkVague('');
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); return r.state; };
const FORM = { tasks: {}, protocols: { p1: 'held' }, redLines: { r1: 'crossed' }, win: '', bottomG: {}, slipNote: '', override: null };
function started(start) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(start, 7));
  return ok(startChallenge(s, start, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
// A Reset closed on `day` at h:mi local; the challenge started `back` days earlier.
const reset = (day, h, mi, back = 0) =>
  ok(closeNight(settleMissed(started(addDays(day, -back)), at(day, h, mi)), day, FORM, at(day, h, mi)));
const GOOD = { state: 'Tired', time: '22:07', place: 'Bed', decision: 'Picked up the phone and kept scrolling the feed',
  change: 'Block the app on my phone after work' };

test('closedTime: local HH:MM of that day\'s closedAt, zero-padded; missing → empty string', () => {
  assert.equal(closedTime(reset('2027-04-01', 22, 7), '2027-04-01'), '22:07');
  assert.equal(closedTime(reset('2027-04-02', 0, 5), '2027-04-02'), '00:05');
  const s = reset('2027-04-03', 21, 0);
  const early = { ...s, days: { ...s.days, '2027-04-03': { ...s.days['2027-04-03'], closedAt: at('2027-04-03', 9, 5) } } };
  assert.equal(closedTime(early, '2027-04-03'), '09:05');
  const none = { ...s, days: { ...s.days, '2027-04-03': { ...s.days['2027-04-03'], closedAt: null } } };
  assert.equal(closedTime(none, '2027-04-03'), '');
  assert.equal(closedTime(s, '2027-05-01'), '');
});

test('newDraft: every field a string, time defaults to closedTime', () => {
  const s = reset('2027-04-04', 23, 10);
  const d = newDraft(s, '2027-04-04');
  assert.deepEqual(autopsyForm(d), { state: '', time: '23:10', place: '', decision: '', change: '' });
  const none = { ...s, days: {} };
  for (const v of Object.values(autopsyForm(newDraft(none, '2027-04-04')))) assert.equal(typeof v, 'string');
});

test('recoveryRoute: unknown date, inherited keys, filed, pending', () => {
  const s = reset('2027-04-05', 22, 0);
  assert.equal(recoveryRoute(s, '2027-04-05'), 'form');
  assert.equal(recoveryRoute(s, '2027-04-06'), 'redirect');
  assert.equal(recoveryRoute(s, 'toString'), 'redirect');
  assert.equal(recoveryRoute(s, undefined), 'redirect');
  const filed = ok(fileAutopsy(s, '2027-04-05', GOOD, at('2027-04-05', 23)));
  assert.equal(recoveryRoute(filed, '2027-04-05'), 'filed');
});

test('effects: three chips with n+1 and the challenge length; a Reset on the last day keeps only the streak chip', () => {
  const s = reset('2027-04-10', 22, 0, 12);
  const n = dayNo(s, '2027-04-10');
  assert.equal(n, 13);
  assert.deepEqual(effects(s, '2027-04-10'), ['Streak back to 0', `Day 14 of ${CHALLENGE_LENGTH} continues`, 'Day 14: no MED']);
  const last = reset('2027-06-30', 22, 0, CHALLENGE_LENGTH - 1);
  assert.equal(dayNo(last, '2027-06-30'), CHALLENGE_LENGTH);
  assert.deepEqual(effects(last, '2027-06-30'), ['Streak back to 0']);
});

test('countdown: this date\'s dueAt (not the oldest pending), timeLeft label, Overdue strictly after dueAt', () => {
  const s = reset('2027-04-12', 22, 0);
  const older = { ...s, recovery: { '2027-04-01': { ...s.recovery['2027-04-12'], dueAt: at('2027-04-02', 22) }, ...s.recovery } };
  const due = s.recovery['2027-04-12'].dueAt;
  const c = countdown(older, '2027-04-12', due - (19 * 60 + 12) * 60000);
  assert.equal(c.label, timeLeft((19 * 60 + 12) * 60000));
  assert.equal(c.label, '19h 12m left');
  assert.equal(c.overdue, false);
  assert.ok(Math.abs(c.fill - 0.2) < 1e-9, String(c.fill));
  assert.equal(countdown(s, '2027-04-12', due).overdue, false);
  const o = countdown(s, '2027-04-12', due + 1);
  assert.deepEqual([o.label, o.overdue, o.fill], ['Overdue', true, 1]);
});

test('canFile: all five fields non-blank after trim', () => {
  assert.equal(canFile(GOOD), true);
  for (const k of Object.keys(GOOD)) {
    assert.equal(canFile({ ...GOOD, [k]: '' }), false, k);
    assert.equal(canFile({ ...GOOD, [k]: '   ' }), false, k);
  }
  assert.equal(canFile({ ...GOOD, change: 'Be stronger' }), true); // vague is core's refusal, not the gate
});

test('errorText: a plain sentence for every fileAutopsy code; vague ones are the exact core nudge', () => {
  assert.equal(errorText('vague-change'), NUDGE);
  assert.equal(errorText('vague-decision'), NUDGE);
  for (const code of ['incomplete', 'no-recovery', 'already-filed']) {
    const t = errorText(code);
    assert.equal(typeof t, 'string');
    assert.ok(/^[A-Z].*\.$/.test(t), `${code}: ${t}`);
    assert.notEqual(t, code);
  }
});

test('chip options are the board\'s', () => {
  assert.deepEqual(STATES, ['Tired', 'Stressed', 'Bored', 'Triggered']);
  assert.deepEqual(PLACES, ['Bed', 'Desk', 'Kitchen', 'Out']);
});
