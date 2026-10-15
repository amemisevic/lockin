import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/core/recovery.js';
import * as W from '../src/core/warlog.js';
import * as C from '../src/core/challenge.js';
import * as S from '../src/core/scoring.js';
import { defaultState, validateState } from '../src/core/model.js';

// Expected values are hand-derived from the plan's Rules, Task 5 text and the owner calls (quoted per assertion).
const NUDGE = 'Too vague. Name something you will block, delete or move.';
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14';
const DAY_MS = 86400000;
const DUE = new Date(2026, 9, 14, 21, 0).getTime(); // local clock, used as a dueAt

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const at = (dayOffset, h, min = 0) => new Date(2026, 9, 12 + dayOffset, h, min).getTime();
const entry = (dueAt, filedAt = null) => ({ dueAt, filedAt, state: '', time: '', place: '', decision: '', change: '' });
const st = (recovery = {}, warLog = {}) => deepFreeze({ ...defaultState(), recovery, warLog });
// Neutral answers. decision and change each pass the plan's checkVague rule (length, words, keyword 'leave' / 'delete').
const VALID = { state: 'Tired and restless after a long day', time: 'late evening', place: '  Living room sofa  ',
  decision: 'Leave the phone in the hallway at night', change: 'Delete the app and charge my phone in the kitchen' };
const FIELDS = ['state', 'time', 'place', 'decision', 'change'];

// Refusal helper: the error code, and state byte-identical (owner call 1: "leaves state unchanged").
function refused(s, date, form, nowMs) {
  const before = JSON.stringify(s);
  const r = R.fileAutopsy(s, date, form, nowMs);
  assert.equal(JSON.stringify(s), before);
  assert.equal(r.ok, false);
  return r.error;
}

// ---- checkVague ----

test('checkVague: the plan\'s listed strings', () => {
  // Plan: "checkVague('Be stronger') → the exact nudge" (11 chars, 2 words, no keyword).
  assert.equal(R.checkVague('Be stronger'), NUDGE);
  // Plan: "'stronger', 'try harder', '  ', 'ok' → nudge".
  for (const t of ['stronger', 'try harder', '  ', 'ok']) assert.equal(R.checkVague(t), NUDGE, t);
  // Plan: "'Delete the app and charge my phone in the kitchen' → null" (49 chars, 10 words, 'delete').
  assert.equal(R.checkVague('Delete the app and charge my phone in the kitchen'), null);
  // Plan: "'Block the site on my router' → null" (27 chars, 6 words, 'block').
  assert.equal(R.checkVague('Block the site on my router'), null);
});

test('checkVague: length boundary is on the trimmed text', () => {
  // "trimmed length ≥ 15": 'Block the phone' = 5+1+3+1+5 = 15, 3 words, 'block' → null.
  assert.equal(R.checkVague('Block the phone'), null);
  // Same 15 chars with outer spaces: trimmed length 15 → null.
  assert.equal(R.checkVague('   Block the phone   '), null);
  // 'Block the apps' = 5+1+3+1+4 = 14 < 15 → nudge.
  assert.equal(R.checkVague('Block the apps'), NUDGE);
});

test('checkVague: needs 3 words', () => {
  // "≥ 3 words": 'Uninstall everything' = 20 chars, keyword 'uninstall', but 2 words → nudge.
  assert.equal(R.checkVague('Uninstall everything'), NUDGE);
});

test('checkVague: keyword must be a whole word, any case', () => {
  // "word match": 'blocking' is not 'block' (24 chars, 4 words, no keyword) → nudge.
  assert.equal(R.checkVague('Stop blocking the screen'), NUDGE);
  // 'Settle' contains 'set' but is not the word 'set' (30 chars, 5 words, no keyword) → nudge.
  assert.equal(R.checkVague('Settle down every single night'), NUDGE);
  // Long enough, enough words, no keyword at all → nudge.
  assert.equal(R.checkVague('I will try much harder tomorrow'), NUDGE);
  // "case-insensitive": 'BLOCK' matches 'block' → null.
  assert.equal(R.checkVague('BLOCK THE SITE ON MY ROUTER'), null);
});

test('checkVague: every listed keyword passes as a whole word', () => {
  // Plan keyword list: "block delete move remove uninstall unplug charge lock leave turn put set install change cancel".
  const kws = 'block delete move remove uninstall unplug charge lock leave turn put set install change cancel'.split(' ');
  // '<kw> the thing tonight': ≥ 3 + 1 + 3 + 1 + 5 + 1 + 7 = 21 chars, 4 words, contains <kw> → null.
  for (const kw of kws) assert.equal(R.checkVague(`${kw} the thing tonight`), null, kw);
});

// ---- fileAutopsy: errors and order ----

test('fileAutopsy: no-recovery when the date has no entry', () => {
  const s = st({ [TUE]: entry(DUE) });
  // Owner call 1 order starts with "no-recovery".
  assert.equal(refused(s, WED, VALID, at(1, 9)), 'no-recovery');
  // no-recovery and incomplete both apply: "no-recovery" comes first.
  assert.equal(refused(s, WED, { ...VALID, state: '' }, at(1, 9)), 'no-recovery');
  // Empty recovery map → no-recovery.
  assert.equal(refused(st(), TUE, VALID, at(1, 9)), 'no-recovery');
});

test('fileAutopsy: already-filed beats incomplete', () => {
  const s = st({ [TUE]: entry(DUE, at(1, 8)) });
  // Owner call 1: "no-recovery, already-filed, …".
  assert.equal(refused(s, TUE, VALID, at(1, 9)), 'already-filed');
  // already-filed and incomplete both apply: "already-filed" comes before "incomplete".
  assert.equal(refused(s, TUE, { ...VALID, change: '' }, at(1, 9)), 'already-filed');
});

test('fileAutopsy: a second file of the same date is already-filed, state byte-identical (Review Focus 3)', () => {
  const r = R.fileAutopsy(st({ [TUE]: entry(DUE) }), TUE, VALID, at(1, 9));
  assert.equal(r.ok, true);
  const filed = deepFreeze(r.state);
  // Review Focus 3: "second file → 'already-filed'", nothing duplicated or lost.
  assert.equal(refused(filed, TUE, VALID, at(1, 10)), 'already-filed');
  assert.equal(refused(filed, TUE, { ...VALID, change: 'Move the charger to the kitchen tonight' }, at(1, 10)), 'already-filed');
});

test('fileAutopsy: incomplete for each field blank, whitespace-only or not a string', () => {
  const s = st({ [TUE]: entry(DUE) });
  for (const k of FIELDS) {
    // Owner call 2: "'incomplete' = any of the five fields blank after trim".
    assert.equal(refused(s, TUE, { ...VALID, [k]: '' }, at(1, 9)), 'incomplete', `${k} empty`);
    assert.equal(refused(s, TUE, { ...VALID, [k]: '   ' }, at(1, 9)), 'incomplete', `${k} spaces`);
    // Controller note: "A non-string form field counts as blank → 'incomplete'".
    assert.equal(refused(s, TUE, { ...VALID, [k]: 42 }, at(1, 9)), 'incomplete', `${k} number`);
    assert.equal(refused(s, TUE, { ...VALID, [k]: null }, at(1, 9)), 'incomplete', `${k} null`);
    const { [k]: _, ...missing } = VALID;
    assert.equal(refused(s, TUE, missing, at(1, 9)), 'incomplete', `${k} missing`);
  }
});

test('fileAutopsy: incomplete beats vague-change; the decision is never vague-checked', () => {
  const s = st({ [TUE]: entry(DUE) });
  // Plan: "change:'Be stronger' → 'vague-change'".
  assert.equal(refused(s, TUE, { ...VALID, change: 'Be stronger' }, at(1, 9)), 'vague-change');
  // incomplete and vague-change both apply: "incomplete, vague-change" order → incomplete.
  assert.equal(refused(s, TUE, { ...VALID, place: ' ', change: 'Be stronger' }, at(1, 9)), 'incomplete');
  // Owner ruling 2026-10-15: only `change` goes through `checkVague`; a keyword-less decision is accepted.
  assert.equal(R.fileAutopsy(s, TUE, { ...VALID, decision: 'try harder' }, at(1, 9)).ok, true);
  // Both keyword-less: only the change is refused.
  assert.equal(refused(s, TUE, { ...VALID, decision: 'try harder', change: 'Be stronger' }, at(1, 9)), 'vague-change');
});

test('fileAutopsy: a decision without a keyword is accepted and stored as typed', () => {
  const r = R.fileAutopsy(st({ [TUE]: entry(DUE) }), TUE, { ...VALID, decision: 'Picked up the phone' }, at(1, 9));
  assert.equal(r.ok, true);
  assert.equal(r.state.recovery[TUE].decision, 'Picked up the phone');
});

test('fileAutopsy: a vague change is still refused with vague-change', () => {
  assert.equal(refused(st({ [TUE]: entry(DUE) }), TUE, { ...VALID, change: 'Be stronger' }, at(1, 9)), 'vague-change');
});

test('fileAutopsy: time is free text (no format check)', () => {
  // Owner call 2: "No format check on `time`": 'late evening' (already in VALID) and 'around 9' are accepted.
  assert.equal(R.fileAutopsy(st({ [TUE]: entry(DUE) }), TUE, { ...VALID, time: 'around 9' }, at(1, 9)).ok, true);
});

// ---- fileAutopsy: success ----

test('fileAutopsy: stores the five answers untrimmed, filedAt, and a labelled War Log entry', () => {
  const now = at(1, 9);
  const s = st({ [TUE]: entry(DUE), [WED]: entry(DUE + DAY_MS) }, { contract: { text: 'Contract text', updatedAt: 5 } });
  const r = R.fileAutopsy(s, TUE, { ...VALID, extra: 'ignored' }, now);
  assert.equal(r.ok, true);
  // Owner answer: "stores the five answers in recovery[date] exactly as given (untrimmed), plus filedAt = nowMs";
  // dueAt is untouched (set by closeNight). Plan: "valid → filedAt === nowMs".
  assert.deepEqual(r.state.recovery[TUE], { dueAt: DUE, filedAt: now, ...VALID });
  // Other recovery entries untouched.
  assert.deepEqual(r.state.recovery[WED], entry(DUE + DAY_MS));
  // Owner call 6: War Log 'autopsy-<date>', "updatedAt = nowMs".
  const w = r.state.warLog[`autopsy-${TUE}`];
  assert.equal(w.updatedAt, now);
  // Owner call 6: "readable labelled lines for the five answers (State, Time, Place, Decision, Change)
  // and contains each answer verbatim" → one line per label, in that order, each with its answer.
  const lines = w.text.split('\n');
  const labels = [['State', VALID.state], ['Time', VALID.time], ['Place', VALID.place],
    ['Decision', VALID.decision], ['Change', VALID.change]];
  const idx = labels.map(([label, answer]) => lines.findIndex(l => l.startsWith(label) && l.includes(answer)));
  assert.ok(idx.every(i => i >= 0), w.text);
  assert.deepEqual([...idx].sort((a, b) => a - b), idx);
  // Existing War Log entries are kept.
  assert.deepEqual(r.state.warLog.contract, { text: 'Contract text', updatedAt: 5 });
  assert.equal(validateState(r.state), null);
});

// ---- pendingRecovery ----

test('pendingRecovery: null with no entries', () => {
  // Owner call 3: "the oldest unfiled entry" — none exists → null.
  assert.equal(R.pendingRecovery(st(), at(1, 9)), null);
});

test('pendingRecovery: returns the oldest unfiled entry by date key', () => {
  // WED inserted before TUE so insertion order differs from date order.
  const s = st({ [WED]: entry(DUE + DAY_MS), [TUE]: entry(DUE) });
  // Owner call 3: "oldest unfiled entry by date key" → TUE; msLeft = DUE - now; now < DUE → not overdue.
  const now = DUE - 5000;
  assert.deepEqual(R.pendingRecovery(s, now), { date: TUE, dueAt: DUE, msLeft: 5000, overdue: false });
  // Older entry filed → the next unfiled (WED). msLeft = (DUE + DAY_MS) - (DUE - 5000) = DAY_MS + 5000.
  const s2 = st({ [WED]: entry(DUE + DAY_MS), [TUE]: entry(DUE, at(1, 9)) });
  assert.deepEqual(R.pendingRecovery(s2, now), { date: WED, dueAt: DUE + DAY_MS, msLeft: DAY_MS + 5000, overdue: false });
});

test('pendingRecovery: overdue is strict, msLeft floors at 0', () => {
  const s = st({ [TUE]: entry(DUE) });
  // Owner call 3: "overdue = nowMs > dueAt (strict). msLeft = max(0, dueAt - nowMs)".
  // nowMs === dueAt → msLeft 0, overdue false.
  assert.deepEqual(R.pendingRecovery(s, DUE), { date: TUE, dueAt: DUE, msLeft: 0, overdue: false });
  // dueAt + 1 → max(0, -1) = 0, overdue true.
  assert.deepEqual(R.pendingRecovery(s, DUE + 1), { date: TUE, dueAt: DUE, msLeft: 0, overdue: true });
  // An hour late → still 0, overdue true.
  assert.deepEqual(R.pendingRecovery(s, DUE + 3600000), { date: TUE, dueAt: DUE, msLeft: 0, overdue: true });
});

test('pendingRecovery: null once filed', () => {
  const r = R.fileAutopsy(st({ [TUE]: entry(DUE) }), TUE, VALID, at(1, 9));
  // Plan: "null once filed".
  assert.equal(R.pendingRecovery(r.state, at(1, 10)), null);
});

// ---- end to end: closeNight reset → pendingRecovery → fileAutopsy ----

test('end to end: crossed red line → reset → recovery pending → filed', () => {
  let s = defaultState();
  for (const k of W.OATH_KEYS) s = W.setWarEntry(s, k, `Oath text ${k}`, 1);
  const started = C.startChallenge(s, MON, { protocols: [{ id: 'pa', title: 'Protocol A', med: null }],
    redLines: [{ id: 'ra', name: 'Red line A' }], oathComplete: W.oathComplete(s) });
  assert.equal(started.ok, true);
  const closeAt = at(0, 22);
  const form = { tasks: {}, protocols: { pa: 'held' }, redLines: { ra: 'crossed' }, win: '',
    bottomG: { archetype: '', tactic: '', text: '' }, slipNote: '', override: null };
  const closed = S.closeNight(deepFreeze(started.state), MON, form, closeAt);
  assert.equal(closed.ok, true, closed.error);
  // Rules: "Reset (any one): any red line crossed".
  assert.equal(closed.state.days[MON].result, 'reset');
  // closedAt = nowMs of the close; Rules: "Recovery due 24 h after close" → dueAt = closedAt + 86400000.
  const closedAt = closed.state.days[MON].closedAt;
  assert.equal(closedAt, closeAt);
  // One second after close: msLeft = 86400000 - 1000 = 86399000, not overdue.
  assert.deepEqual(R.pendingRecovery(closed.state, closedAt + 1000),
    { date: MON, dueAt: closedAt + 86400000, msLeft: 86399000, overdue: false });
  const filed = R.fileAutopsy(deepFreeze(closed.state), MON, VALID, at(1, 9));
  assert.equal(filed.ok, true, filed.error);
  // Filed → no pending Recovery; War Log 'autopsy-2026-10-12' exists.
  assert.equal(R.pendingRecovery(filed.state, at(1, 9)), null);
  assert.equal(filed.state.warLog[`autopsy-${MON}`].updatedAt, at(1, 9));
  assert.equal(validateState(filed.state), null);
});
