import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/challenge.js';
import * as S from '../src/core/scoring.js';
import { pendingRecovery, fileAutopsy } from '../src/core/recovery.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { exportJson, validateImport } from '../src/core/store.js';
import { resultCounts, passRate } from '../src/core/stats.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 8: one whole challenge through the public core, with a fake local clock.
// FLOW_START (tz.test.js) moves Day 4 onto a 25-hour DST day. nextAction is only asked at 08:00:
// Task 12 moves the night start (18 -> 20), so nothing here may depend on it between 12:00 and 23:59.
const START = process.env.FLOW_START ?? '2026-10-12'; // a Monday
const D = n => addDays(START, n - 1);
const at = (key, h, mi = 0, s = 0, ms = 0) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, h, mi, s, ms).getTime();
};
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

const PROTOCOLS = [
  { id: 'p1', title: 'Protocol A', med: 'Light A' },
  { id: 'p2', title: 'Protocol B', med: null },
  { id: 'p3', title: 'Protocol C', med: null },
];
const RED_LINES = [{ id: 'r1', name: 'Red Line A' }];
const HELD = { p1: 'held', p2: 'held', p3: 'held' };
const nightForm = (protocols = HELD, r1 = 'held') => ({ protocols, redLines: { r1 } });

// Every transition: valid state, then frozen so later refusals prove they do not mutate.
const keep = s => { assert.equal(validateState(s), null); return deepFreeze(s); };
const ok = r => { assert.equal(r.ok, true, r.error); return keep(r.state); };
const refused = (s, call, error) => {
  assert.ok(Object.isFrozen(s));
  const before = JSON.stringify(s);
  assert.deepEqual(call(s), { ok: false, error });
  assert.equal(JSON.stringify(s), before);
};

const morning = (s, n, med = []) => ok(C.submitMorning(s, D(n), { target: 'Target A', risk: '', med }, at(D(n), 8)));
const night = (s, n, form = nightForm()) => ok(S.closeNight(s, D(n), form, at(D(n), 21)));
function fullDay(s, n, form) {
  s = morning(s, n);
  s = keep(C.submitAfternoon(s, D(n), { onTrack: 'yes' }, at(D(n), 14)));
  return night(s, n, form);
}

let s = deepFreeze(defaultState());

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('FLOW_START: Day 4 is a 25-hour local day when set', () => {
  if (process.env.FLOW_START === undefined) return;
  const [y, m, d] = D(4).split('-').map(Number);
  assert.equal(new Date(y, m - 1, d + 1).getTime() - new Date(y, m - 1, d).getTime(), 25 * 3600000);
});

test('Day 1: start refused until the oath is written, then the challenge starts on Day 1', () => {
  const setup = st => ({ protocols: PROTOCOLS, redLines: RED_LINES, oathComplete: oathComplete(st) });
  assert.deepEqual([s.settings.zeroDay, s.settings.medPerWeek], [3, 2]); // the scenario relies on these defaults
  assert.equal(oathComplete(s), false);
  refused(s, st => C.startChallenge(st, D(1), setup(st)), 'Write your Contract, Funeral and Code first.');
  for (const [key, text] of [['contract', 'Contract A'], ['funeral', 'Funeral A'], ['code', 'Code A'], ['redlines-w1', 'Lines A']]) {
    s = keep(setWarEntry(s, key, text, at(D(1), 7)));
  }
  assert.equal(oathComplete(s), true);
  s = ok(C.startChallenge(s, D(1), setup(s)));
  assert.equal(C.dayNo(s, D(1)), 1);
  assert.equal(C.phase(s, D(1)), 'active');
});

test('Days 1-3: morning, afternoon and night all held pass; streak 3', () => {
  for (const n of [1, 2, 3]) {
    s = fullDay(s, n);
    assert.equal(s.days[D(n)].result, 'passed');
  }
  assert.equal(S.currentStreak(s), 3);
});

test('Day 4: MED declared for p1 counts as held at night; streak 4; one MED used this week', () => {
  s = morning(s, 4, ['p1']);
  s = night(s, 4, nightForm({ p2: 'held', p3: 'held' })); // MED protocol needs no answer
  assert.equal(s.days[D(4)].night.protocols.find(p => p.id === 'p1').status, 'med');
  assert.equal(s.days[D(4)].result, 'passed');
  assert.equal(S.currentStreak(s), 4);
  assert.equal(C.medUsedInWeek(s, D(4)), 1);
});

test('Day 5: crossed red line resets; Recovery due 24 h after close; streak 0', () => {
  s = morning(s, 5);
  s = night(s, 5, nightForm(HELD, 'crossed'));
  const day = s.days[D(5)];
  assert.equal(day.result, 'reset');
  assert.equal(s.recovery[D(5)].dueAt, day.closedAt + 86400000);
  assert.equal(s.recovery[D(5)].filedAt, null);
  assert.notEqual(pendingRecovery(s, at(D(6), 8)), null);
  assert.equal(S.currentStreak(s), 0);
});

test('Day 6: Recovery first, forced full pass, vague autopsy refused, valid one filed, day passes', () => {
  const t = at(D(6), 8);
  assert.equal(C.nextAction(s, t), 'recovery');
  assert.deepEqual(C.medCheck(s, D(6), 'p1'), { ok: false, reason: 'forced' });
  assert.equal(C.forcedFullPass(s, D(6)), true);
  const autopsy = { state: 'Tired A', time: 'Time A', place: 'Place A',
    decision: 'I will block the app after dinner', change: 'Move the charger out of the room' };
  refused(s, st => fileAutopsy(st, D(5), { ...autopsy, change: 'Be stronger' }, t), 'vague-change');
  s = ok(fileAutopsy(s, D(5), autopsy, t));
  assert.equal(pendingRecovery(s, t), null);
  assert.ok(s.warLog[`autopsy-${D(5)}`]);
  s = fullDay(s, 6);
  assert.equal(s.days[D(6)].result, 'passed');
  assert.equal(S.currentStreak(s), 1);
});

test('Day 7: declared Redo closes the day as redo; streak 0', () => {
  s = ok(C.declareRedo(s, D(7), at(D(7), 7)));
  assert.equal(s.challenge.redoUsed, D(7));
  s = fullDay(s, 7);
  assert.equal(s.days[D(7)].result, 'redo');
  assert.equal(S.currentStreak(s), 0);
});

test('Day 8: forced full pass after the Redo; MED and a second Redo refused; day passes', () => {
  assert.equal(C.forcedFullPass(s, D(8)), true);
  refused(s, st => C.submitMorning(st, D(8), { target: 'Target A', risk: '', med: ['p1'] }, at(D(8), 8)),
    'No MED today. Yesterday was a declared Redo.');
  refused(s, st => C.declareRedo(st, D(8), at(D(8), 8)), 'Your one declared Redo is already used.');
  s = fullDay(s, 8);
  assert.equal(s.days[D(8)].result, 'passed');
});

test('Days 9-10 missed: on Day 11 at 09:00 settleMissed closes both as redo at 04:00, once', () => {
  const t = at(D(11), 9);
  s = keep(S.settleMissed(s, t));
  for (const n of [9, 10]) {
    const day = s.days[D(n)];
    assert.equal(day.result, 'redo');
    assert.equal(day.auto, 'no-night');
    assert.equal(day.closedAt, at(D(n + 1), 4));
  }
  assert.equal(S.settleMissed(s, t), s);
  s = ok(C.submitMorning(s, D(11), { target: 'Target A', risk: '', med: [] }, at(D(11), 9, 5)));
});

test('Days 11-30: all pass except Day 25 (one protocol missed = redo); Day 26 is not forced', () => {
  s = keep(C.submitAfternoon(s, D(11), { onTrack: 'yes' }, at(D(11), 14)));
  s = night(s, 11);
  for (let n = 12; n <= 30; n++) {
    if (n === 26) assert.equal(C.forcedFullPass(s, D(26)), false);
    s = fullDay(s, n, n === 25 ? nightForm({ ...HELD, p2: 'missed' }) : undefined);
  }
  assert.equal(s.days[D(25)].result, 'redo');
  assert.equal(C.phase(s, addDays(D(30), 1)), 'finished');
});

test('After Day 30: results by day, streaks, counts and pass rate match the hand-derived values', () => {
  const expected = [
    'passed', 'passed', 'passed', 'passed', 'reset', 'passed', 'redo', 'passed', 'redo', 'redo', // D1-D10
    'passed', 'passed', 'passed', 'passed', 'passed', 'passed', 'passed', 'passed', 'passed', 'passed', // D11-D20
    'passed', 'passed', 'passed', 'passed', 'redo', 'passed', 'passed', 'passed', 'passed', 'passed', // D21-D30
  ];
  assert.deepEqual(S.dayResults(s), expected.map((result, i) => ({ date: D(i + 1), result })));
  assert.equal(S.longestStreak(s), 14);
  assert.equal(S.currentStreak(s), 5);
  const range = { endDate: D(30), n: null };
  assert.deepEqual(resultCounts(s, range), { passed: 25, redo: 4, reset: 1, open: 0 });
  assert.equal(passRate(s, range), 25 / 30);
});

test('Export then import round-trips the final state', () => {
  const r = validateImport(exportJson(s));
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.state, s);
});
