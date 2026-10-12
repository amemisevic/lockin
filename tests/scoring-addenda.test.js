import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/core/scoring.js';
import * as C from '../src/core/challenge.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Owner rulings A and B on closeNight, plus Afternoon and streak cases. 2026-10-12 is a Monday and Day 1 below.
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14';

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
// Local wall-clock time, dayOffset days after MON.
const at = (dayOffset, h, min = 0) => new Date(2026, 9, 12 + dayOffset, h, min).getTime();
const DAY_MS = 86400000;

const PROTOCOLS = [
  { id: 'pa', title: 'Protocol A', med: 'Short version A' },
  { id: 'pb', title: 'Protocol B', med: null },
  { id: 'pc', title: 'Protocol C', med: null },
];
const RED_LINES = [{ id: 'ra', name: 'Red line A' }, { id: 'rb', name: 'Red line B' }];
const DAILY = { id: 'ta', title: 'Task A', note: '', start: null, end: null, date: null,
  repeat: { type: 'daily', days: [] }, skip: [], archived: false };

function started(extra = {}) {
  const r = C.startChallenge(defaultState(), MON, { protocols: PROTOCOLS, redLines: RED_LINES, oathComplete: true });
  assert.equal(r.ok, true);
  return deepFreeze({ ...r.state, ...extra });
}
const day = (o = {}) => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...o });
const morning = () => ({ at: 1, target: 'Target A', risk: '', med: [] });
const form = (o = {}) => ({ tasks: {}, protocols: { pa: 'held', pb: 'held', pc: 'held' }, redLines: { ra: 'held', rb: 'held' },
  win: 'Win A', bottomG: { archetype: null, tactic: null, text: '' }, slipNote: '', override: null, ...o });
const close = (s, date, f, nowMs) => {
  const r = S.closeNight(s, date, f, nowMs);
  assert.equal(r.ok, true, r.error);
  assert.equal(validateState(r.state), null);
  return deepFreeze(r.state);
};
const refused = (s, date, f, nowMs, error) => {
  const before = JSON.stringify(s);
  assert.deepEqual(S.closeNight(s, date, f, nowMs), { ok: false, error });
  assert.equal(JSON.stringify(s), before);
};

// ---- Ruling A: today's night waits while yesterday is open before 04:00 ----

test('A: closing today at 00:40 while yesterday is open is refused, state unchanged', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  refused(s, TUE, form(), at(1, 0, 40), 'yesterday-open');
  assert.equal(S.NIGHT_TEXT['yesterday-open'], 'Close yesterday first.');
});

test('A: at 04:00 exact the same close is not refused for that reason', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  assert.equal(S.closeNight(s, TUE, form(), at(1, 4, 0)).ok, true);
});

test('A: yesterday closed, or not an active day, → closing today at 00:40 is allowed', () => {
  assert.equal(S.closeNight(started({ days: { [MON]: day({ result: 'passed', closedAt: 1 }) } }), TUE, form(), at(1, 0, 40)).ok, true);
  // Real flow: close yesterday at 00:20, then today at 00:40.
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  close(close(s, MON, form(), at(1, 0, 20)), TUE, form(), at(1, 0, 40));
  // Day 1: yesterday is before startDate, not an active day.
  assert.equal(S.closeNight(started(), MON, form(), at(0, 0, 40)).ok, true);
});

test('A: error order — after closed / not-active, before tasks, answers and override', () => {
  const bad = form({ tasks: {}, protocols: {}, redLines: {}, override: { result: 'passed', reason: '' } });
  const s = started({ tasks: [DAILY] });
  refused(s, TUE, bad, at(1, 0, 40), 'yesterday-open');
  refused(started({ days: { [TUE]: day({ result: 'passed', closedAt: 1 }) } }), TUE, bad, at(1, 0, 40), 'closed');
  // Day 31 is finished while day 30 is still open.
  refused(s, addDays(MON, 30), bad, at(30, 0, 40), 'not-active');
});

// ---- Ruling B: a crossed red line cannot be overridden to passed or redo ----

const crossed = { ra: 'crossed', rb: 'held' };

test('B: crossed red line + override passed or redo is refused, state unchanged', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  for (const result of ['passed', 'redo']) {
    refused(s, MON, form({ redLines: crossed, override: { result, reason: 'Reason A' } }), at(0, 22), 'red-line-override');
  }
  assert.equal(S.NIGHT_TEXT['red-line-override'], 'A crossed red line cannot be overridden.');
});

test('B: crossed red line + override reset is accepted; recovery created', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  const r = close(s, MON, form({ redLines: crossed, override: { result: 'reset', reason: 'Reason A' } }), at(0, 22));
  // "Reset (any one): any red line crossed" → suggested reset; override reset → reset; "Recovery due 24 h after close".
  assert.equal(r.days[MON].night.suggested, 'reset');
  assert.equal(r.days[MON].result, 'reset');
  assert.equal(r.recovery[MON].dueAt, at(0, 22) + DAY_MS);
});

test('B: order — a blank or invalid override on a crossed red line is still override-reason', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  refused(s, MON, form({ redLines: crossed, override: { result: 'passed', reason: '  ' } }), at(0, 22), 'override-reason');
  refused(s, MON, form({ redLines: crossed, override: { result: 'great', reason: 'Reason A' } }), at(0, 22), 'override-reason');
});

test('B: missed ≥ zeroDay with no red line crossed can still be overridden to passed', () => {
  const s = started({ days: { [MON]: day({ morning: morning() }) } });
  const f = form({ protocols: { pa: 'missed', pb: 'missed', pc: 'missed' }, override: { result: 'passed', reason: 'Reason A' } });
  const r = close(s, MON, f, at(0, 22));
  // zeroDay 3, missed 3: "missed protocols ≥ settings.zeroDay" → suggested reset; "result = override?.result ?? suggested" → passed.
  assert.equal(r.days[MON].night.suggested, 'reset');
  assert.equal(r.days[MON].result, 'passed');
  assert.deepEqual(r.recovery, {});
});

// ---- Afternoon ----

test('Afternoon struggling has zero penalty: real morning + afternoon, all held → passed', () => {
  const m = C.submitMorning(started(), MON, { target: 'Target A', risk: '', med: [] }, at(0, 8));
  assert.equal(m.ok, true);
  const a = C.submitAfternoon(m.state, MON, { onTrack: 'struggling', friction: 'Friction A' }, at(0, 14));
  const r = close(deepFreeze(a), MON, form(), at(0, 22));
  // "Afternoon is optional, zero penalty"; 0 missed, none crossed, no declared Redo, morning done → "Passed".
  assert.equal(r.days[MON].result, 'passed');
  assert.deepEqual(r.days[MON].afternoon, { at: at(0, 14), onTrack: 'struggling', friction: 'Friction A' });
});

// ---- Streaks ----

// Closed days from MON in order.
const withResults = results => started({ days: Object.fromEntries(results
  .map((result, i) => [addDays(MON, i), day({ result, closedAt: at(i, 22) })])) });
const streaks = s => [S.currentStreak(s), S.longestStreak(s)];

test('streaks: hand-derived from the Rules', () => {
  // "Streak = consecutive passed days ending at the latest closed day … redo/reset end it":
  // P, redo, P, P, P → run after the redo is 3 and ends at the latest day → current 3; no longer run → longest 3.
  assert.deepEqual(streaks(withResults(['passed', 'redo', 'passed', 'passed', 'passed'])), [3, 3]);
  // P, P, P, P, reset, P → the reset ends the run of 4; one passed after it → current 1, longest 4.
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'passed', 'passed', 'reset', 'passed'])), [1, 4]);
  // P, P, redo → the latest closed day is a redo → current 0; earlier run of 2 → longest 2.
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'redo'])), [0, 2]);
});

test('streaks: an override to passed counts as passed (stored result)', () => {
  let s = started({ days: { [MON]: day({ morning: morning() }), [TUE]: day({ morning: morning() }), [WED]: day({ morning: morning() }) } });
  s = close(s, MON, form(), at(0, 22));
  s = close(s, TUE, form({ protocols: { pa: 'missed', pb: 'held', pc: 'held' }, override: { result: 'passed', reason: 'Reason A' } }), at(1, 22));
  s = close(s, WED, form(), at(2, 22));
  // MON passed; TUE "1 ≤ 1 < 3" → suggested redo, override passed is "stored on the day"; WED passed.
  // Streak reads stored results → P, P, P → current 3, longest 3.
  assert.equal(s.days[TUE].night.suggested, 'redo');
  assert.deepEqual(streaks(s), [3, 3]);
});
