import test from 'node:test';
import assert from 'node:assert/strict';
import { resultCounts, passRate, protocolRates, resetCauses, tacticCounts, weekdayRates, heatmap, taskTotals }
  from '../src/core/stats.js';
import { defaultState } from '../src/core/model.js';

// Task 7. Expected values computed by hand from owner calls 1-11 and controller rulings R1-R5 (task-7-context.md).
// 2026-10-01 is a Thursday: 10-01..10-07 run Thu Fri Sat Sun Mon Tue Wed (weekdayIdx 3,4,5,6,0,1,2).
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

const prots = (a, b, c) => [
  { id: 'p1', title: 'Protocol A', status: a },
  { id: 'p2', title: 'Protocol B', status: b },
  { id: 'p3', title: 'Protocol C', status: c },
];
// A closed day, written by hand in the closeNight shape (night snapshot of protocols and red lines).
const closedDay = (result, protocols, crossed, archetype, tactic) => ({
  morning: { at: 1000, target: 'Target A', risk: '', med: [] }, afternoon: null,
  declaredRedo: false, slipNote: '', incompleteMorning: false, auto: null,
  night: { at: 2000, protocols, redLines: [{ id: 'r1', name: 'Red line A', status: crossed ? 'crossed' : 'held' }],
    win: '', bottomG: { archetype, tactic, text: '' }, suggested: result, override: null },
  result, closedAt: 2000,
});
const habit = { id: 'h1', title: 'Habit A', note: '', start: null, end: null, date: null,
  repeat: { type: 'daily', days: [] }, skip: [], archived: false };
const oneOff = { id: 't1', title: 'Task A', note: '', start: null, end: null, date: '2026-10-03',
  repeat: { type: 'none', days: [] }, skip: [], archived: false };

const S = deepFreeze({
  v: 2,
  settings: { zeroDay: 3, medPerWeek: 2, lastBackup: null },
  tasks: [habit, oneOff],
  taskLog: {
    '2026-10-01': { h1: 'done' },
    '2026-10-02': { h1: 'done' },
    '2026-10-03': { h1: 'failed', t1: 'done' },
    '2026-10-04': { h1: 'done' },
    '2026-10-05': { h1: 'stalled' },
  },
  challenge: { startDate: '2026-10-01', length: 30,
    protocols: [{ id: 'p1', title: 'Protocol A', med: 'Med A' }, { id: 'p2', title: 'Protocol B', med: null },
      { id: 'p3', title: 'Protocol C', med: null }],
    redLines: [{ id: 'r1', name: 'Red line A' }], redoUsed: null },
  days: {
    '2026-10-01': closedDay('passed', prots('held', 'held', 'held'), false, 'negotiator', 'Tactic A'),
    '2026-10-02': closedDay('passed', prots('med', 'held', 'held'), false, 'negotiator', 'Tactic A'),
    '2026-10-03': closedDay('redo', prots('held', 'missed', 'held'), false, 'assassin', 'Tactic B'),
    '2026-10-04': closedDay('reset', prots('held', 'held', 'held'), true, '', ''),
    '2026-10-05': closedDay('reset', prots('missed', 'missed', 'missed'), false, '', ''),
  },
  recovery: {}, warLog: {}, pack: null,
});

const END = '2026-10-07';
const R7 = { endDate: END, n: 7 };
const wk = (...pairs) => pairs.map(([done, total]) => ({ done, total }));
const ZERO_COUNTS = { passed: 0, redo: 0, reset: 0, open: 0 };
const ZERO_CAUSES = { redLine: 0, protocols: 0, byProtocol: [] };
const ZERO_WEEK = wk([0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]);
const ZERO_TOTALS = { done: 0, failed: 0, stalled: 0, open: 0 };
// The 28 heatmap dates ending 10-07: 09-10..09-30 (21 days) then 10-01..10-07 (7 days).
const DATES28 = [...Array.from({ length: 21 }, (_, i) => `2026-09-${String(10 + i).padStart(2, '0')}`),
  ...Array.from({ length: 7 }, (_, i) => `2026-10-0${1 + i}`)];
const all = (s, range) => JSON.stringify([resultCounts(s, range), passRate(s, range), protocolRates(s, range),
  resetCauses(s, range), tacticCounts(s, range), weekdayRates(s, range), heatmap(s, range.endDate), taskTotals(s, range)]);
const assertEmptyWindow = (s, range, label) => {
  // R1: "Empty challenge stats" and empty task window values.
  assert.deepEqual(resultCounts(s, range), ZERO_COUNTS, label);
  assert.equal(passRate(s, range), null, label);
  assert.deepEqual(protocolRates(s, range), [], label);
  assert.deepEqual(resetCauses(s, range), ZERO_CAUSES, label);
  assert.deepEqual(tacticCounts(s, range), [], label);
  assert.deepEqual(weekdayRates(s, range), ZERO_WEEK, label);
  assert.deepEqual(taskTotals(s, range), ZERO_TOTALS, label);
};

test('resultCounts and passRate over the 7-day state', () => {
  // Call 3: passed/redo/reset count closed days in the window (10-01, 10-02 passed; 10-03 redo; 10-04, 10-05 reset);
  // open = active, not-closed dates in the window (10-06, 10-07; "today counts as open").
  assert.deepEqual(resultCounts(S, R7), { passed: 2, redo: 1, reset: 2, open: 2 });
  // Call 3: passRate = passed / (passed + redo + reset) = 2 / 5.
  assert.equal(passRate(S, R7), 2 / 5);
});

test('protocolRates: grouped by id, missed desc then title', () => {
  // Call 4: p1 held 10-01,03,04, med 10-02, missed 10-05; p2 held 10-01,02,04, missed 10-03,05;
  // p3 held 10-01..04, missed 10-05. Order missed desc (B 2), then title ascending (A < C).
  assert.deepEqual(protocolRates(S, R7), [
    { title: 'Protocol B', held: 3, missed: 2, med: 0 },
    { title: 'Protocol A', held: 3, missed: 1, med: 1 },
    { title: 'Protocol C', held: 4, missed: 1, med: 0 },
  ]);
});

test('resetCauses: red line vs protocols, byProtocol only from protocol resets', () => {
  // Call 5: 10-04 has r1 'crossed' -> redLine (never feeds byProtocol); 10-05 has no crossed line -> protocols,
  // and p1, p2, p3 are 'missed' there -> 1 each; order count desc then title ascending.
  assert.deepEqual(resetCauses(S, R7), { redLine: 1, protocols: 1, byProtocol: [
    { title: 'Protocol A', count: 1 }, { title: 'Protocol B', count: 1 }, { title: 'Protocol C', count: 1 },
  ] });
});

test('tacticCounts: blank bottomG skipped, count desc', () => {
  // Call 6: 10-04 and 10-05 have '' archetype/tactic -> skipped; negotiator/Tactic A twice, assassin/Tactic B once.
  assert.deepEqual(tacticCounts(S, R7), [
    { archetype: 'negotiator', tactic: 'Tactic A', count: 2 },
    { archetype: 'assassin', tactic: 'Tactic B', count: 1 },
  ]);
});

test('weekdayRates: habits only, Monday = 0', () => {
  // Call 8: h1 due every day; done 10-01 (Thu), 10-02 (Fri), 10-04 (Sun); failed 10-03 (Sat), stalled 10-05 (Mon),
  // open 10-06 (Tue), 10-07 (Wed) count as not done. The one-off t1 (done on Sat 10-03) is not a habit: Sat stays 0/1.
  assert.deepEqual(weekdayRates(S, R7), wk([0, 1], [0, 1], [0, 1], [1, 1], [1, 1], [0, 1], [1, 1]));
});

test('taskTotals: all tasks due, from each status', () => {
  // Call 10: h1 done x3, failed x1, stalled x1, open x2 (10-06, 10-07); t1 done on 10-03 -> done 4.
  assert.deepEqual(taskTotals(S, R7), { done: 4, failed: 1, stalled: 1, open: 2 });
});

test('heatmap: 28 entries ending at endDate, zero before the first log', () => {
  const h = heatmap(S, END);
  // Call 9: exactly 28 entries, oldest first, last date === endDate.
  assert.equal(h.length, 28);
  assert.equal(h[27].date, END);
  // Call 7: dates before the first taskLog key (10-01) count nothing -> {done:0, due:0}.
  // Call 9: due = habits due (h1 only; t1 is not a habit), done = those 'done'.
  assert.deepEqual(h, [
    ...DATES28.slice(0, 21).map(date => ({ date, done: 0, due: 0 })),
    { date: '2026-10-01', done: 1, due: 1 },
    { date: '2026-10-02', done: 1, due: 1 },
    { date: '2026-10-03', done: 0, due: 1 },
    { date: '2026-10-04', done: 1, due: 1 },
    { date: '2026-10-05', done: 0, due: 1 },
    { date: '2026-10-06', done: 0, due: 1 },
    { date: '2026-10-07', done: 0, due: 1 },
  ]);
});

test('n:3 covers 10-05..10-07 only', () => {
  const r = { endDate: END, n: 3 };
  // Call 1: dates addDays(endDate, -2)..endDate = 10-05, 10-06, 10-07. Call 3: 10-05 reset, 10-06/07 open.
  assert.deepEqual(resultCounts(S, r), { passed: 0, redo: 0, reset: 1, open: 2 });
  // Call 3: 0 / (0 + 0 + 1).
  assert.equal(passRate(S, r), 0);
  // Call 4: only 10-05, all missed; missed tie -> title ascending.
  assert.deepEqual(protocolRates(S, r), [
    { title: 'Protocol A', held: 0, missed: 1, med: 0 },
    { title: 'Protocol B', held: 0, missed: 1, med: 0 },
    { title: 'Protocol C', held: 0, missed: 1, med: 0 },
  ]);
  // Call 5: 10-04 (the red-line reset) is outside the window.
  assert.deepEqual(resetCauses(S, r), { redLine: 0, protocols: 1, byProtocol: [
    { title: 'Protocol A', count: 1 }, { title: 'Protocol B', count: 1 }, { title: 'Protocol C', count: 1 },
  ] });
  // Call 6: 10-05 bottomG blank.
  assert.deepEqual(tacticCounts(S, r), []);
  // Call 8: Mon 10-05 stalled, Tue 10-06 open, Wed 10-07 open; other weekdays outside the window.
  assert.deepEqual(weekdayRates(S, r), wk([0, 1], [0, 1], [0, 1], [0, 0], [0, 0], [0, 0], [0, 0]));
  // Call 10: h1 stalled once, open twice.
  assert.deepEqual(taskTotals(S, r), { done: 0, failed: 0, stalled: 1, open: 2 });
});

test('n:null starts at challenge.startDate (same as n:7 here)', () => {
  // Call 1: n null -> from challenge.startDate (10-01) to endDate; R3: task functions start there too.
  assert.equal(all(S, { endDate: END, n: null }), all(S, R7));
});

test('n:null for habits and tasks starts at the first taskLog date, not the challenge start', () => {
  // Challenge starts 10-05, history from 10-01. Recomputed by a raw loop over taskLog: All tasks 4/1/1/2, weekdays below.
  const L = deepFreeze({ ...S, challenge: { ...S.challenge, startDate: '2026-10-05' } });
  const r = { endDate: END, n: null };
  assert.deepEqual(taskTotals(L, r), { done: 4, failed: 1, stalled: 1, open: 2 });
  assert.deepEqual(weekdayRates(L, r), wk([0, 1], [0, 1], [0, 1], [1, 1], [1, 1], [0, 1], [1, 1]));
  // All is never smaller than 30d.
  assert.deepEqual(taskTotals(L, r), taskTotals(L, { endDate: END, n: 30 }));
  assert.deepEqual(weekdayRates(L, r), weekdayRates(L, { endDate: END, n: 30 }));
  // Challenge-bound selectors still start at the challenge start (10-05 reset, 10-06 and 10-07 open).
  assert.deepEqual(resultCounts(L, r), { passed: 0, redo: 0, reset: 1, open: 2 });
});

test('n:10 reaches 09-28 but dates before the first log / the challenge add nothing', () => {
  // Call 1: 09-28..10-07. Call 3: 09-28..09-30 are phase 'before' -> not open. Call 7: those dates are before
  // the first taskLog key (10-01), so weekdayRates and taskTotals ignore them (Mon/Tue/Wed stay 0/1).
  const r = { endDate: END, n: 10 };
  assert.deepEqual(resultCounts(S, r), { passed: 2, redo: 1, reset: 2, open: 2 });
  assert.deepEqual(weekdayRates(S, r), wk([0, 1], [0, 1], [0, 1], [1, 1], [1, 1], [0, 1], [1, 1]));
  assert.deepEqual(taskTotals(S, r), { done: 4, failed: 1, stalled: 1, open: 2 });
  assert.equal(all(S, r), all(S, R7));
});

test('n not a positive integer gives the empty window', () => {
  // Call 1: "n anything else (0, negative, 1.5, a string): empty window".
  for (const n of [0, -1, 1.5, '7']) assertEmptyWindow(S, { endDate: END, n }, `n=${n}`);
});

test('a start after endDate gives the empty window', () => {
  // Call 1: n null, start 10-01 > endDate 09-30 -> empty.
  assertEmptyWindow(S, { endDate: '2026-09-30', n: null }, 'start after end');
});

test('empty defaultState: zeros, [], passRate null, 28 zero heatmap entries', () => {
  const E = deepFreeze(defaultState());
  // Call 1: no challenge -> challenge functions empty; call 7: empty taskLog -> nothing counts.
  assertEmptyWindow(E, R7, 'n:7');
  assertEmptyWindow(E, { endDate: END, n: null }, 'n:null');
  // Call 9 + call 7: 28 entries, all {done:0, due:0}.
  assert.deepEqual(heatmap(E, END), DATES28.map(date => ({ date, done: 0, due: 0 })));
});

test('no challenge and n:null: empty challenge stats, task functions start at the first log', () => {
  const N = deepFreeze({ ...S, challenge: null });
  // Call 1: "if there is no challenge, the window is empty for the challenge functions" (R1 values).
  assert.deepEqual(resultCounts(N, { endDate: END, n: null }), ZERO_COUNTS);
  assert.equal(passRate(N, { endDate: END, n: null }), null);
  assert.deepEqual(protocolRates(N, { endDate: END, n: null }), []);
  assert.deepEqual(resetCauses(N, { endDate: END, n: null }), ZERO_CAUSES);
  assert.deepEqual(tacticCounts(N, { endDate: END, n: null }), []);
  // Call 1 + call 7: task functions start at the first taskLog date (10-01): same as the 7-day values.
  assert.deepEqual(weekdayRates(N, { endDate: END, n: null }), wk([0, 1], [0, 1], [0, 1], [1, 1], [1, 1], [0, 1], [1, 1]));
  assert.deepEqual(taskTotals(N, { endDate: END, n: null }), { done: 4, failed: 1, stalled: 1, open: 2 });
});

test('Review Focus 4: editing protocols, red lines and zeroDay after closing changes nothing', () => {
  // Call 11: results, protocols and tactics come only from stored closed-day data.
  const edited = deepFreeze({ ...S, settings: { ...S.settings, zeroDay: 5 },
    challenge: { ...S.challenge, protocols: [{ id: 'p1', title: 'Protocol Z', med: null }], redLines: [] } });
  assert.equal(all(edited, R7), all(S, R7));
  assert.equal(all(edited, { endDate: END, n: null }), all(S, { endDate: END, n: null }));
});

test('frozen input does not throw', () => {
  // Owner: "All pure, read state only, never mutate it (deepFreeze the test state)". S is deep-frozen.
  assert.doesNotThrow(() => all(S, R7));
  assert.ok(Object.isFrozen(S.days['2026-10-01'].night.protocols[0]));
});

test('auto no-night redo counts in resultCounts, not in protocolRates', () => {
  const A = deepFreeze({ ...S, days: { ...S.days, '2026-10-06': { morning: null, afternoon: null, declaredRedo: false,
    slipNote: '', incompleteMorning: true, auto: 'no-night', night: null, result: 'redo', closedAt: 3000 } } });
  // Call 2/3: 10-06 is closed (result 'redo') -> redo 2, open only 10-07.
  assert.deepEqual(resultCounts(A, R7), { passed: 2, redo: 2, reset: 2, open: 1 });
  assert.equal(passRate(A, R7), 2 / 6);
  // Call 4: "days with night === null, i.e. auto-closed, contribute nothing".
  assert.deepEqual(protocolRates(A, R7), protocolRates(S, R7));
  assert.deepEqual(tacticCounts(A, R7), tacticCounts(S, R7));
});

test('latest title wins; resets without a red line (no night, overridden) count in protocols', () => {
  const noNightReset = { morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: true,
    auto: null, night: null, result: 'reset', closedAt: 3000 };
  const overridden = closedDay('reset', [{ id: 'p1', title: 'Protocol A2', status: 'missed' },
    { id: 'p2', title: 'Protocol B', status: 'held' }, { id: 'p3', title: 'Protocol C', status: 'held' }],
  false, 'authority', 'Tactic C');
  const L = deepFreeze({ ...S, days: { ...S.days,
    '2026-10-04': closedDay('reset', prots('held', 'held', 'held'), true, 'assassin', 'Tactic A'),
    '2026-10-06': noNightReset,
    '2026-10-07': { ...overridden, night: { ...overridden.night, suggested: 'redo',
      override: { result: 'reset', reason: 'Reason A' } } },
  } });
  // Call 4: p1's title comes from its latest date (10-07: 'Protocol A2'); p1 missed 10-05, 10-07 -> 2.
  // p2 missed 10-03, 10-05 -> 2; p3 missed 10-05 -> 1. Missed tie (2): 'Protocol A2' < 'Protocol B'.
  assert.deepEqual(protocolRates(L, R7), [
    { title: 'Protocol A2', held: 3, missed: 2, med: 1 },
    { title: 'Protocol B', held: 4, missed: 2, med: 0 },
    { title: 'Protocol C', held: 5, missed: 1, med: 0 },
  ]);
  // Call 5: 10-04 red line -> redLine; 10-05, 10-06 (no night) and 10-07 (overridden) -> protocols = 3.
  // byProtocol: p1 missed 10-05 and 10-07 -> 2 (latest title), p2 and p3 once (10-05); count desc then title.
  assert.deepEqual(resetCauses(L, R7), { redLine: 1, protocols: 3, byProtocol: [
    { title: 'Protocol A2', count: 2 }, { title: 'Protocol B', count: 1 }, { title: 'Protocol C', count: 1 },
  ] });
  // Call 6: count desc, then archetype, then tactic ascending: assassin/Tactic A < assassin/Tactic B < authority/Tactic C.
  assert.deepEqual(tacticCounts(L, R7), [
    { archetype: 'negotiator', tactic: 'Tactic A', count: 2 },
    { archetype: 'assassin', tactic: 'Tactic A', count: 1 },
    { archetype: 'assassin', tactic: 'Tactic B', count: 1 },
    { archetype: 'authority', tactic: 'Tactic C', count: 1 },
  ]);
});

test('tacticCounts: whitespace-only archetype or tactic is blank', () => {
  // Call 6: "count a day only when archetype and tactic are both non-blank strings after trim".
  const W = deepFreeze({ ...S, days: { ...S.days,
    '2026-10-04': closedDay('reset', prots('held', 'held', 'held'), true, 'negotiator', '   '),
    '2026-10-05': closedDay('reset', prots('missed', 'missed', 'missed'), false, ' ', 'Tactic A'),
  } });
  assert.deepEqual(tacticCounts(W, R7), tacticCounts(S, R7));
});
