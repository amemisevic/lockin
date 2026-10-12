import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as S from '../src/core/scoring.js';
import * as C from '../src/core/challenge.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// 2026-10-12 is a Monday and Day 1 below. Expected values are hand-computed from the plan's Rules.
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14', THU = '2026-10-15';

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
const task = (id, o) => ({ id, title: `Task ${id}`, note: '', start: null, end: null, date: null,
  repeat: { type: 'none', days: [] }, skip: [], archived: false, ...o });
const TASKS = [task('ta', { date: MON }), task('tb', { repeat: { type: 'daily', days: [] } }), task('tc', { date: TUE })];

// A 3-protocol, 2-red-line challenge started through the real startChallenge, plus extra top-level keys.
function started(startDate = MON, extra = {}) {
  const r = C.startChallenge(defaultState(), startDate, { protocols: PROTOCOLS, redLines: RED_LINES, oathComplete: true });
  assert.equal(r.ok, true);
  return deepFreeze({ ...r.state, ...extra });
}
const day = (o = {}) => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...o });
const morning = (med = []) => ({ at: 1, target: 'Target A', risk: '', med });
const form = (o = {}) => ({ tasks: {}, protocols: { pa: 'held', pb: 'held', pc: 'held' }, redLines: { ra: 'held', rb: 'held' },
  win: 'Win A', bottomG: { archetype: null, tactic: null, text: '' }, slipNote: '', override: null, ...o });
const close = (s, date, f, nowMs) => {
  const r = S.closeNight(s, date, f, nowMs);
  assert.equal(r.ok, true, r.error);
  assert.equal(validateState(r.state), null);
  return deepFreeze(r.state);
};
const err = (s, date, f, nowMs) => S.closeNight(s, date, f, nowMs).error;

// ---- suggestResult ----

const prot = (missed, med = 0, held = 0) => [...Array(missed).fill('missed'), ...Array(med).fill('med'), ...Array(held).fill('held')]
  .map(status => ({ status }));
const rls = (crossed, held = 2 - crossed) => [...Array(crossed).fill('crossed'), ...Array(held).fill('held')].map(status => ({ status }));
const sr = o => S.suggestResult({ morningDone: true, protocols: prot(0, 0, 3), redLines: rls(0), zeroDay: 3, declaredRedo: false, ...o });

test('suggestResult table (first matching rule wins; reasons list every rule that applies)', () => {
  // "Passed: 0 missed, no red line crossed, no declared Redo" (+ morning done).
  assert.deepEqual(sr({}), { result: 'passed', reasons: [] });
  // zeroDay 3, missed 1: "Redo: 1 ≤ missed < zeroDay" → 1 ≤ 1 < 3 → redo.
  assert.deepEqual(sr({ protocols: prot(1, 0, 2) }), { result: 'redo', reasons: ['1 protocol missed'] });
  // zeroDay 3, missed 2: "Redo: 1 ≤ missed < zeroDay" → 1 ≤ 2 < 3 → redo.
  assert.deepEqual(sr({ protocols: prot(2, 0, 1) }), { result: 'redo', reasons: ['2 protocols missed'] });
  // zeroDay 3, missed 3: "Reset: missed protocols ≥ settings.zeroDay" → 3 ≥ 3 → reset.
  assert.deepEqual(sr({ protocols: prot(3) }), { result: 'reset', reasons: ['3 protocols missed'] });
  // zeroDay 2, missed 2: "missed protocols ≥ settings.zeroDay" → 2 ≥ 2 → reset.
  assert.deepEqual(sr({ protocols: prot(2, 0, 1), zeroDay: 2 }), { result: 'reset', reasons: ['2 protocols missed'] });
  // zeroDay 5, missed 4: "Redo: 1 ≤ missed < zeroDay" → 1 ≤ 4 < 5 → redo.
  assert.deepEqual(sr({ protocols: prot(4, 0, 1), zeroDay: 5 }), { result: 'redo', reasons: ['4 protocols missed'] });
  // zeroDay 5, missed 5: "missed protocols ≥ settings.zeroDay" → 5 ≥ 5 → reset.
  assert.deepEqual(sr({ protocols: prot(5), zeroDay: 5 }), { result: 'reset', reasons: ['5 protocols missed'] });
  // 1 crossed, 0 missed: "Reset (any one): any red line crossed" → reset.
  assert.deepEqual(sr({ redLines: rls(1) }), { result: 'reset', reasons: ['Red line crossed'] });
  // declaredRedo, 0 missed: "Redo: … or a pre-declared Redo for that date" → redo.
  assert.deepEqual(sr({ declaredRedo: true }), { result: 'redo', reasons: ['Declared Redo'] });
  // declaredRedo + crossed: "Declared Redo … Never covers a red line"; "any red line crossed" → reset.
  assert.deepEqual(sr({ declaredRedo: true, redLines: rls(1) }), { result: 'reset', reasons: ['Red line crossed', 'Declared Redo'] });
  // no morning, 0 missed: "Morning missing → result cannot be passed; minimum redo" → redo.
  assert.deepEqual(sr({ morningDone: false }), { result: 'redo', reasons: ['No morning check-in'] });
});

test('suggestResult: MED counts as held; all reasons in rule order', () => {
  // 2 MED + 1 held: "A MED protocol counts as held at night" → 0 missed → passed.
  assert.deepEqual(sr({ protocols: prot(0, 2, 1) }), { result: 'passed', reasons: [] });
  // 1 missed + no morning: "1 ≤ 1 < 3" → redo; morning missing also applies → listed after.
  assert.deepEqual(sr({ protocols: prot(1, 1, 1), morningDone: false }),
    { result: 'redo', reasons: ['1 protocol missed', 'No morning check-in'] });
  // Everything at once: "any red line crossed" → reset; the missed count is one reason, listed once.
  assert.deepEqual(sr({ protocols: prot(3), redLines: rls(2), declaredRedo: true, morningDone: false }),
    { result: 'reset', reasons: ['Red line crossed', '3 protocols missed', 'Declared Redo', 'No morning check-in'] });
});

// ---- closeNight ----

test('closeNight: tasks-open while a due task is unresolved; resolved statuses written to taskLog', () => {
  const s = started(MON, { tasks: TASKS, days: { [MON]: day({ morning: morning() }) } });
  assert.deepEqual(S.closeNight(s, MON, form(), at(0, 22)), { ok: false, error: 'tasks-open' });
  assert.equal(err(s, MON, form({ tasks: { ta: 'done' } }), at(0, 22)), 'tasks-open');
  assert.equal(err(s, MON, form({ tasks: { ta: 'done', tb: 'open' } }), at(0, 22)), 'tasks-open');
  // tc is due on TUE, zz is unknown: both ignored.
  const r = close(s, MON, form({ tasks: { ta: 'done', tb: 'stalled', tc: 'done', zz: 'done' } }), at(0, 22));
  assert.deepEqual(r.taskLog, { [MON]: { ta: 'done', tb: 'stalled' } });
  // A status already in the log counts as resolved and is kept.
  const s2 = started(MON, { tasks: TASKS, taskLog: { [MON]: { ta: 'failed' } } });
  assert.deepEqual(close(s2, MON, form({ tasks: { tb: 'done' } }), at(0, 22)).taskLog, { [MON]: { ta: 'failed', tb: 'done' } });
});

test('closeNight: unanswered protocol refused; MED protocol needs no answer and is stored as med', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  assert.deepEqual(S.closeNight(s, MON, form({ protocols: { pa: 'held', pb: 'held' } }), at(0, 22)),
    { ok: false, error: 'protocols-unanswered' });
  assert.equal(err(s, MON, form({ protocols: { pa: 'med', pb: 'held', pc: 'held' } }), at(0, 22)), 'protocols-unanswered');
  const med = started(MON, { days: { [MON]: day({ morning: morning(['pa']) }) } });
  for (const protocols of [{ pb: 'held', pc: 'held' }, { pa: 'missed', pb: 'held', pc: 'held' }]) {
    const d = close(med, MON, form({ protocols }), at(0, 22)).days[MON];
    assert.deepEqual(d.night.protocols, [{ id: 'pa', title: 'Protocol A', status: 'med' },
      { id: 'pb', title: 'Protocol B', status: 'held' }, { id: 'pc', title: 'Protocol C', status: 'held' }]);
    // "A MED protocol counts as held at night" → 0 missed, morning done → passed.
    assert.equal(d.night.suggested, 'passed');
    assert.equal(d.result, 'passed');
  }
});

test('closeNight: unanswered or invalid red line refused', () => {
  const s = started(MON);
  assert.deepEqual(S.closeNight(s, MON, form({ redLines: { ra: 'held' } }), at(0, 22)), { ok: false, error: 'redlines-unanswered' });
  assert.equal(err(s, MON, form({ redLines: { ra: 'held', rb: 'missed' } }), at(0, 22)), 'redlines-unanswered');
});

test('closeNight: override needs a real result and a non-blank reason; suggested stays computed', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  const oneMissed = { pa: 'held', pb: 'missed', pc: 'held' };
  assert.deepEqual(S.closeNight(s, MON, form({ protocols: oneMissed, override: { result: 'passed', reason: '  ' } }), at(0, 22)),
    { ok: false, error: 'override-reason' });
  assert.equal(err(s, MON, form({ override: { result: 'great', reason: 'Reason A' } }), at(0, 22)), 'override-reason');
  const d = close(s, MON, form({ protocols: oneMissed, override: { result: 'passed', reason: 'Reason A' } }), at(0, 22)).days[MON];
  // zeroDay 3, missed 1: "1 ≤ 1 < 3" → suggested redo; "result = override?.result ?? suggested" → passed.
  assert.equal(d.night.suggested, 'redo');
  assert.deepEqual(d.night.override, { result: 'passed', reason: 'Reason A' });
  assert.equal(d.result, 'passed');
});

test('closeNight: a reset day creates recovery[date] due 24 h after close; other days do not', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  const crossed = { ra: 'crossed', rb: 'held' };
  const r = close(s, MON, form({ redLines: crossed }), at(0, 22));
  // "Reset (any one): any red line crossed"; "Recovery due 24 h after close".
  assert.equal(r.days[MON].result, 'reset');
  assert.deepEqual(r.recovery, { [MON]: { dueAt: at(0, 22) + DAY_MS, filedAt: null,
    state: '', time: '', place: '', decision: '', change: '' } });
  // Passed: no recovery.
  assert.deepEqual(close(s, MON, form(), at(0, 22)).recovery, {});
  // Owner ruling B: a crossed red line cannot be overridden to redo; state unchanged.
  const before = JSON.stringify(s);
  assert.deepEqual(S.closeNight(s, MON, form({ redLines: crossed, override: { result: 'redo', reason: 'Reason A' } }), at(0, 22)),
    { ok: false, error: 'red-line-override' });
  assert.equal(S.NIGHT_TEXT['red-line-override'], 'A crossed red line cannot be overridden.');
  assert.equal(JSON.stringify(s), before);
});

test('closeNight success path: day fields, snapshots, validateState', () => {
  const afternoon = { at: 2, onTrack: 'yes', friction: '' };
  const s = started(MON, { days: { [MON]: day({ morning: morning(), afternoon }) } });
  const f = form({ protocols: { pa: 'held', pb: 'held', pc: 'held', zz: 'missed' }, redLines: { ra: 'held', rb: 'held', zz: 'crossed' },
    slipNote: 'Note A', bottomG: { archetype: 'negotiator', tactic: 'Tactic A', text: 'Text A' } });
  const r = S.closeNight(s, MON, f, at(0, 22, 15));
  assert.equal(r.ok, true);
  assert.equal(validateState(r.state), null);
  // Unknown ids zz ignored → 0 missed, 0 crossed, morning done → passed.
  assert.deepEqual(r.state.days[MON], day({ morning: morning(), afternoon, slipNote: 'Note A', result: 'passed', closedAt: at(0, 22, 15),
    night: { at: at(0, 22, 15),
      protocols: [{ id: 'pa', title: 'Protocol A', status: 'held' }, { id: 'pb', title: 'Protocol B', status: 'held' },
        { id: 'pc', title: 'Protocol C', status: 'held' }],
      redLines: [{ id: 'ra', name: 'Red line A', status: 'held' }, { id: 'rb', name: 'Red line B', status: 'held' }],
      win: 'Win A', bottomG: { archetype: 'negotiator', tactic: 'Tactic A', text: 'Text A' }, suggested: 'passed', override: null } }));
  // Null Bottom G fields are stored as '' (validator requires strings).
  assert.deepEqual(close(s, MON, form(), at(0, 22)).days[MON].night.bottomG, { archetype: '', tactic: '', text: '' });
});

test('closeNight: no morning → redo + incompleteMorning; declared Redo → redo', () => {
  // "Morning missing → result cannot be passed; minimum redo, flag incompleteMorning".
  const d = close(started(MON), MON, form(), at(0, 22)).days[MON];
  assert.equal(d.night.suggested, 'redo');
  assert.equal(d.result, 'redo');
  assert.equal(d.incompleteMorning, true);
  // "Redo: … or a pre-declared Redo for that date".
  const s = started(MON, { days: { [MON]: day({ morning: morning(), declaredRedo: true }) } });
  const d2 = close(s, MON, form(), at(0, 22)).days[MON];
  assert.equal(d2.result, 'redo');
  assert.equal(d2.declaredRedo, true);
  assert.equal(d2.incompleteMorning, false);
});

test('closeNight error order: closed, not-active, not-closable, tasks-open, protocols, red lines, override', () => {
  const bad = { tasks: {}, protocols: {}, redLines: {}, override: { result: 'passed', reason: '' } };
  const s = started(MON, { tasks: TASKS });
  const closedS = started(MON, { tasks: TASKS, days: { [MON]: day({ result: 'passed', closedAt: 1 }) } });
  assert.equal(err(closedS, MON, form(bad), at(3, 12)), 'closed');
  assert.equal(err(deepFreeze(defaultState()), MON, form(bad), at(0, 22)), 'not-active');
  assert.equal(err(s, addDays(MON, -1), form(bad), at(-1, 22)), 'not-active');
  assert.equal(err(s, addDays(MON, 30), form(bad), at(30, 22)), 'not-active');
  assert.equal(err(s, TUE, form(bad), at(0, 22)), 'not-closable'); // future date
  assert.equal(err(s, MON, form(bad), at(1, 4, 0)), 'not-closable'); // grace over at TUE 04:00
  assert.equal(err(s, MON, form(bad), at(2, 1)), 'not-closable'); // two days back
  assert.equal(err(s, MON, form(bad), at(1, 3, 59)), 'tasks-open'); // still inside the grace
  const tasks = { ta: 'done', tb: 'done' };
  assert.equal(err(s, MON, form({ ...bad, tasks }), at(0, 22)), 'protocols-unanswered');
  assert.equal(err(s, MON, form({ ...bad, tasks, protocols: { pa: 'held', pb: 'held', pc: 'held' } }), at(0, 22)), 'redlines-unanswered');
  assert.equal(err(s, MON, form({ tasks, override: bad.override }), at(0, 22)), 'override-reason');
});

test('Review Focus 3: second closeNight on the same date → closed, state and streak unchanged', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  for (const redLines of [{ ra: 'held', rb: 'held' }, { ra: 'crossed', rb: 'held' }]) {
    const once = close(s, MON, form({ redLines }), at(0, 22));
    const before = JSON.stringify(once), streak = S.currentStreak(once);
    const again = S.closeNight(once, MON, form({ protocols: { pa: 'missed', pb: 'missed', pc: 'missed' }, win: 'Win B' }), at(0, 23));
    assert.deepEqual(again, { ok: false, error: 'closed' });
    assert.equal(JSON.stringify(once), before);
    assert.equal(S.currentStreak(once), streak);
  }
  // An auto-closed day cannot be filed late either.
  const auto = S.settleMissed(started(MON), at(1, 4));
  assert.equal(err(auto, MON, form(), at(1, 4)), 'closed');
});

test('Task 3 deferred: real reset close at 00:20 → next morning MED refused as forced pass, plain morning accepted', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  const r = close(s, MON, form({ redLines: { ra: 'crossed', rb: 'held' } }), at(1, 0, 20));
  // "Reset (any one): any red line crossed"; "next day is a forced full pass (no MED)".
  assert.equal(r.days[MON].result, 'reset');
  assert.equal(r.days[MON].closedAt, at(1, 0, 20));
  assert.equal(r.recovery[MON].dueAt, at(1, 0, 20) + DAY_MS);
  const m = { target: 'Target A', risk: '' };
  assert.deepEqual(C.submitMorning(r, TUE, { ...m, med: ['pa'] }, at(1, 0, 30)), { ok: false, error: 'No MED today. Yesterday was a Reset.' });
  const ok = C.submitMorning(r, TUE, { ...m, med: [] }, at(1, 0, 30));
  assert.equal(ok.ok, true);
  assert.equal(validateState(ok.state), null);
});

// ---- nightTargets / settleMissed ----

test('nightTargets: today, plus yesterday before 04:00 while open; ascending', () => {
  const s = started(MON);
  assert.deepEqual(S.nightTargets(s, at(0, 0, 40)), [MON]); // Day 1: yesterday is before the start
  assert.deepEqual(S.nightTargets(s, at(0, 22)), [MON]);
  assert.deepEqual(S.nightTargets(s, at(1, 3, 59)), [MON, TUE]);
  assert.deepEqual(S.nightTargets(s, at(1, 4, 0)), [TUE]);
  assert.deepEqual(S.nightTargets(started(MON, { days: { [MON]: day({ result: 'passed', closedAt: 1 }) } }), at(1, 0, 40)), [TUE]);
  assert.deepEqual(S.nightTargets(started(MON, { days: { [TUE]: day({ result: 'passed', closedAt: 1 }) } }), at(1, 0, 40)), [MON]);
  assert.deepEqual(S.nightTargets(s, at(30, 0, 40)), [addDays(MON, 29)]); // day 31 is finished, day 30 open
  assert.deepEqual(S.nightTargets(s, at(-1, 22)), []);
  assert.deepEqual(S.nightTargets(deepFreeze(defaultState()), at(0, 22)), []);
});

test('Review Focus 1: at 00:40 yesterday is closable and not settled; at 04:00 it auto-closes as redo', () => {
  const s = started(MON, { days: { [MON]: day({ morning: morning() }) } });
  const t = new Date(2026, 9, 13, 0, 40).getTime();
  assert.deepEqual(S.nightTargets(s, t), ['2026-10-12', '2026-10-13']);
  assert.equal(S.settleMissed(s, t), s);
  assert.equal(S.settleMissed(s, at(1, 3, 59)), s);
  // Closing at 00:40 closes yesterday with its own result: 0 missed, morning done → passed.
  const c = close(s, MON, form(), t);
  assert.equal(c.days[MON].result, 'passed');
  assert.equal(c.days[MON].closedAt, t);
  // "Night missing → when the 04:00 grace after the day ends passes, the day auto-closes as redo with auto:'no-night'".
  const four = new Date(2026, 9, 13, 4, 0).getTime();
  const r = S.settleMissed(s, four);
  assert.deepEqual(r.days, { [MON]: day({ morning: morning(), result: 'redo', auto: 'no-night', closedAt: four }) });
  assert.deepEqual(r.recovery, {});
  assert.equal(validateState(r), null);
});

test('Review Focus 2: four silent days settle once, in order, as redo; never before startDate', () => {
  const s = started('2026-10-01');
  const now = new Date(2026, 9, 5, 5, 0).getTime();
  const r = deepFreeze(S.settleMissed(s, now));
  // 10-04 closes at 10-05 04:00 ≤ 05:00; 10-05 closes at 10-06 04:00 > now.
  assert.deepEqual(Object.keys(r.days).sort(), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(r.days[`2026-10-0${i + 1}`], day({ result: 'redo', auto: 'no-night', incompleteMorning: true,
      closedAt: new Date(2026, 9, 2 + i, 4).getTime() }));
  }
  assert.equal(validateState(r), null);
  assert.equal(S.settleMissed(r, now), r);
  assert.equal(JSON.stringify(S.settleMissed(r, now)), JSON.stringify(r));
  // A pre-existing open day before startDate is never touched.
  const pre = started('2026-10-01', { days: { '2026-09-30': day() } });
  assert.deepEqual(S.settleMissed(pre, now).days['2026-09-30'], day());
});

test('settleMissed skips closed days, keeps existing fields, stops after day 30', () => {
  const kept = day({ morning: morning(), afternoon: { at: 2, onTrack: 'no', friction: '' }, declaredRedo: true, slipNote: 'Note A' });
  const s = started(MON, { days: { [MON]: kept, [TUE]: day({ result: 'passed', closedAt: 5 }) } });
  const r = S.settleMissed(s, at(3, 5));
  assert.deepEqual(r.days[MON], { ...kept, result: 'redo', auto: 'no-night', incompleteMorning: false, closedAt: at(1, 4) });
  assert.deepEqual(r.days[TUE], day({ result: 'passed', closedAt: 5 }));
  assert.equal(r.days[WED].result, 'redo');
  assert.equal(r.days[THU], undefined);
  const all = S.settleMissed(started(MON), at(45, 5));
  assert.equal(Object.keys(all.days).length, 30);
  assert.equal(all.days[addDays(MON, 30)], undefined);
  assert.equal(validateState(all), null);
  const none = deepFreeze(defaultState());
  assert.equal(S.settleMissed(none, at(3, 5)), none);
});

// ---- streaks / dayResults ----

// Closed days from MON in order; null = open day.
const withResults = (results, order = x => x) => started(MON, { days: Object.fromEntries(order(results
  .map((result, i) => [addDays(MON, i), day(result ? { result, closedAt: at(i, 22) } : {})]))) });
const streaks = s => [S.currentStreak(s), S.longestStreak(s)];

test('streaks: consecutive passed days ending at the latest closed day', () => {
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'passed'])), [3, 3]);
  // "redo/reset end it".
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'redo', 'passed'])), [1, 2]);
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'passed', 'reset', 'passed'])), [1, 3]);
  assert.deepEqual(streaks(withResults(['passed', 'passed', 'reset'])), [0, 2]);
  // Open days are not closed days.
  assert.deepEqual(streaks(withResults(['passed', 'passed', null])), [2, 2]);
  // Key insertion order does not matter.
  assert.deepEqual(streaks(withResults(['passed', 'redo', 'passed', 'passed'], e => e.reverse())), [2, 2]);
  assert.deepEqual(streaks(started(MON)), [0, 0]);
});

test('streaks: an auto-settled day ends the streak', () => {
  const s = withResults(['passed', 'passed']);
  const settled = deepFreeze(S.settleMissed(s, at(3, 5))); // WED closes at THU 04:00
  assert.equal(settled.days[WED].auto, 'no-night');
  assert.deepEqual(streaks(settled), [0, 2]);
  const thu = close(settled, THU, form(), at(3, 22));
  // THU: no morning → "Morning missing → … minimum redo" → still 0.
  assert.deepEqual(streaks(thu), [0, 2]);
  const thu2 = close(started(MON, { ...settled, days: { ...settled.days, [THU]: day({ morning: morning() }) } }), THU, form(), at(3, 22));
  // THU with morning, 0 missed → passed; trailing run after the auto Redo = 1.
  assert.deepEqual(streaks(thu2), [1, 2]);
});

test('dayResults: closed days ascending; three real closes give a streak of 3', () => {
  assert.deepEqual(S.dayResults(withResults(['redo', null, 'passed'], e => e.reverse())),
    [{ date: MON, result: 'redo' }, { date: WED, result: 'passed' }]);
  assert.deepEqual(S.dayResults(started(MON)), []);
  let s = started(MON, { days: { [MON]: day({ morning: morning() }), [TUE]: day({ morning: morning() }), [WED]: day({ morning: morning() }) } });
  // Each: 0 missed, no red line crossed, no declared Redo, morning done → "Passed".
  for (const [i, d] of [MON, TUE, WED].entries()) s = close(s, d, form(), at(i, 22));
  assert.deepEqual(streaks(s), [3, 3]);
  assert.deepEqual(S.dayResults(s).map(x => x.result), ['passed', 'passed', 'passed']);
});

test('Review Focus 4: editing protocols and zeroDay after closing does not rewrite finished days', () => {
  let s = started(MON, { days: { [MON]: day({ morning: morning() }), [TUE]: day({ morning: morning() }), [WED]: day({ morning: morning() }) } });
  s = close(s, MON, form(), at(0, 22)); // 0 missed, morning done → passed
  // zeroDay 3, missed 2: "1 ≤ 2 < 3" → redo (would be reset under zeroDay 2).
  s = close(s, TUE, form({ protocols: { pa: 'missed', pb: 'missed', pc: 'held' } }), at(1, 22));
  s = close(s, WED, form(), at(2, 22)); // 0 missed, morning done → passed
  const edited = deepFreeze({ ...s, settings: { ...s.settings, zeroDay: 2 },
    challenge: { ...s.challenge, protocols: [{ id: 'pa', title: 'Protocol A renamed', med: null }] } });
  assert.equal(validateState(edited), null);
  assert.deepEqual(S.dayResults(edited), [{ date: MON, result: 'passed' }, { date: TUE, result: 'redo' }, { date: WED, result: 'passed' }]);
  assert.deepEqual(S.dayResults(edited), S.dayResults(s));
  assert.deepEqual(streaks(edited), streaks(s));
  assert.deepEqual(edited.days, s.days);
  assert.equal(edited.days[TUE].night.protocols[1].title, 'Protocol B');
});

// ---- DST (Review Focus 1): run settleMissed in Europe/Sarajevo in a child process ----

const fileUrl = p => new URL(p, import.meta.url).href;
const CHILD = `
import { settleMissed } from ${JSON.stringify(fileUrl('../src/core/scoring.js'))};
import { startChallenge } from ${JSON.stringify(fileUrl('../src/core/challenge.js'))};
import { defaultState } from ${JSON.stringify(fileUrl('../src/core/model.js'))};
import { dateKey } from ${JSON.stringify(fileUrl('../src/logic.js'))};
const start = d => startChallenge(defaultState(), d, { oathComplete: true,
  protocols: [{ id: 'pa', title: 'Protocol A', med: null }], redLines: [{ id: 'ra', name: 'Red line A' }] }).state;
const run = (startDate, edgeDay, y, m, d) => {
  const s = start(startDate);
  const done = settleMissed(s, new Date(y, m, d + 2, 5).getTime());
  const closes = Object.keys(done.days).sort().map(k => {
    const c = new Date(done.days[k].closedAt);
    return { date: k, localDate: dateKey(c), hour: c.getHours(), min: c.getMinutes(), ms: done.days[k].closedAt };
  });
  return {
    closes,
    edgeAt0359: settleMissed(s, new Date(y, m, d, 3, 59).getTime()).days[edgeDay]?.result ?? null,
    edgeAt0400: settleMissed(s, new Date(y, m, d, 4, 0).getTime()).days[edgeDay]?.result ?? null,
    offsets: [new Date(y, m, d - 1, 12).getTimezoneOffset(), new Date(y, m, d + 1, 12).getTimezoneOffset()],
  };
};
console.log(JSON.stringify({
  fall: run('2026-10-22', '2026-10-24', 2026, 9, 25),
  spring: run('2026-03-27', '2026-03-28', 2026, 2, 29),
}));
`;

test('DST (Europe/Sarajevo): auto-close is the next day\'s local 04:00 on 25- and 23-hour days', () => {
  const p = spawnSync(process.execPath, ['--input-type=module', '-e', CHILD], { env: { ...process.env, TZ: 'Europe/Sarajevo' }, encoding: 'utf8' });
  assert.equal(p.stderr, '');
  assert.equal(p.status, 0);
  const { fall, spring } = JSON.parse(p.stdout);
  const gapsH = cs => cs.slice(1).map((c, i) => (c.ms - cs[i].ms) / 3600000);
  // Child really runs in Sarajevo: CEST (UTC+2 → -120) before each switch, CET (-60) after, and the reverse in spring.
  assert.deepEqual(fall.offsets, [-120, -60]);
  assert.deepEqual(spring.offsets, [-60, -120]);
  // Fall back 2026-10-25 03:00 CEST → 02:00 CET. Settled at 10-27 05:00: 10-22…10-26 closed, each at the next day's 04:00.
  assert.deepEqual(fall.closes.map(c => [c.date, c.localDate, c.hour, c.min]), [
    ['2026-10-22', '2026-10-23', 4, 0], ['2026-10-23', '2026-10-24', 4, 0], ['2026-10-24', '2026-10-25', 4, 0],
    ['2026-10-25', '2026-10-26', 4, 0], ['2026-10-26', '2026-10-27', 4, 0]]);
  // 10-24 04:00 CEST → 10-25 04:00 CET spans the extra hour: 25 h; all others 24 h.
  assert.deepEqual(gapsH(fall.closes), [24, 25, 24, 24]);
  // 10-24 closes at 10-25 04:00 local exactly: open at 03:59, redo at 04:00 (not an hour early or late).
  assert.deepEqual([fall.edgeAt0359, fall.edgeAt0400], [null, 'redo']);
  // Spring forward 2026-03-29 02:00 CET → 03:00 CEST. Settled at 03-31 05:00: 03-27…03-30 closed.
  assert.deepEqual(spring.closes.map(c => [c.date, c.localDate, c.hour, c.min]), [
    ['2026-03-27', '2026-03-28', 4, 0], ['2026-03-28', '2026-03-29', 4, 0], ['2026-03-29', '2026-03-30', 4, 0],
    ['2026-03-30', '2026-03-31', 4, 0]]);
  // 03-28 04:00 CET → 03-29 04:00 CEST loses an hour: 23 h; others 24 h.
  assert.deepEqual(gapsH(spring.closes), [23, 24, 24]);
  assert.deepEqual([spring.edgeAt0359, spring.edgeAt0400], [null, 'redo']);
});
