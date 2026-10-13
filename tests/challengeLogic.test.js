import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_LENGTH, setupLists, beginStatus, begin, oathRows, challengeEnd, graduated, stripCells, legend,
  redoStatus, confirmRedo, missionInfo, graduation, rateLabel } from '../src/views/challengeLogic.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight, settleMissed, longestStreak } from '../src/core/scoring.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { importPack } from '../src/core/pack.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 13 (task-13-rulings.md, challengeLogic.js contract): Challenge tab, Day 0, Declared Redo, graduation.
// States are built only with core functions; expected values are hand-computed. challengeLogic-tz.test.js runs this
// file in three time zones; the DST days below are DST changes in one of them each.
const at = (key, h, mi = 0, s = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi, s).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const LISTS = { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }] };
const HELD = { protocols: { p1: 'held' }, redLines: { r1: 'held' } };
const CROSSED = { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } };
const OATH = ['contract', 'funeral', 'code', 'redlines-w1'];
const kinds = cells => cells.map(c => c.kind);

const D1 = '2026-10-13';
const DST_DAYS = ['2026-10-25', '2026-11-01', '2026-09-27']; // Europe ends, Los Angeles ends, Auckland starts

function oath(s, key, keys = OATH) {
  for (const k of keys) s = setWarEntry(s, k, `Text ${k}`, at(key, 7));
  return s;
}
function started(startKey) {
  const s = oath(defaultState(), startKey);
  return ok(startChallenge(s, startKey, { ...LISTS, oathComplete: oathComplete(s) }));
}
const morning = (s, key) => ok(submitMorning(s, key, { target: 'Task A', risk: '', med: [] }, at(key, 8)));
const passDay = (s, key) => ok(closeNight(morning(s, key), key, HELD, at(key, 21))); // morning + all held = passed
const redoDay = (s, key) => ok(closeNight(s, key, HELD, at(key, 21))); // no morning = redo
const resetDay = (s, key) => ok(closeNight(s, key, CROSSED, at(key, 21))); // red line crossed = reset

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('CHALLENGE_LENGTH is the length the core gives a started challenge', () => {
  const s = started(D1);
  assert.equal(CHALLENGE_LENGTH, s.challenge.length);
  assert.ok(Number.isInteger(CHALLENGE_LENGTH) && CHALLENGE_LENGTH > 0);
});

test('setupLists: no protocols and no red lines until Task 19', () => {
  assert.deepEqual(setupLists(defaultState()), { protocols: [], redLines: [] });
  assert.deepEqual(setupLists(oath(defaultState(), D1)), { protocols: [], redLines: [] });
});

test('beginStatus: oath not written → oath reason first, also with lists', () => {
  const reason = 'Write your Contract, Funeral and Code first.';
  assert.deepEqual(beginStatus(defaultState(), D1), { enabled: false, reason });
  assert.deepEqual(beginStatus(defaultState(), D1, LISTS), { enabled: false, reason });
  const three = oath(defaultState(), D1, ['contract', 'funeral', 'code']);
  assert.deepEqual(beginStatus(three, D1, LISTS), { enabled: false, reason });
});

test('beginStatus: all four oath entries + default lists → "Add at least one protocol."', () => {
  const s = oath(defaultState(), D1);
  assert.deepEqual(beginStatus(s, D1), { enabled: false, reason: 'Add at least one protocol.' });
  assert.deepEqual(beginStatus(s, D1, setupLists(s)), { enabled: false, reason: 'Add at least one protocol.' });
});

test('beginStatus: protocols but no red lines → "Add at least one red line."', () => {
  const s = oath(defaultState(), D1);
  assert.deepEqual(beginStatus(s, D1, { protocols: LISTS.protocols, redLines: [] }),
    { enabled: false, reason: 'Add at least one red line.' });
});

test('beginStatus: oath + protocols + red lines → enabled, no reason', () => {
  const s = oath(defaultState(), D1);
  assert.deepEqual(beginStatus(s, D1, LISTS), { enabled: true, reason: null });
});

test('beginStatus: challenge already started → refused', () => {
  const s = started(D1);
  assert.deepEqual(beginStatus(s, D1, LISTS), { enabled: false, reason: 'The challenge has already started.' });
  assert.deepEqual(beginStatus(s, addDays(D1, 1)), { enabled: false, reason: 'The challenge has already started.' });
});

test('begin: returns the startChallenge result and leaves the input alone', () => {
  const s = oath(defaultState(), D1);
  const r = begin(s, D1, LISTS);
  assert.deepEqual(r, startChallenge(s, D1, { ...LISTS, oathComplete: true }));
  const next = ok(r);
  assert.equal(next.challenge.startDate, D1);
  assert.deepEqual(next.challenge.protocols, LISTS.protocols);
  assert.deepEqual(next.challenge.redLines, LISTS.redLines);
  assert.equal(s.challenge, null);
  assert.deepEqual(begin(s, D1), { ok: false, error: 'Add at least one protocol.' });
  assert.deepEqual(begin(next, D1, LISTS), { ok: false, error: 'The challenge has already started.' });
});

test('oathRows: fixed order, titles, links, done only for written entries', () => {
  const row = (key, title, done) => ({ key, title, done, href: `#warlog/${key}` });
  assert.deepEqual(oathRows(defaultState()), [
    row('contract', 'Contract', false), row('funeral', 'The Funeral', false),
    row('code', 'The Code', false), row('redlines-w1', 'Week 1 red lines', false),
  ]);
  const s = oath(defaultState(), D1, ['code', 'contract']);
  assert.deepEqual(oathRows(s), [
    row('contract', 'Contract', true), row('funeral', 'The Funeral', false),
    row('code', 'The Code', true), row('redlines-w1', 'Week 1 red lines', false),
  ]);
  assert.deepEqual(oathRows(oath(defaultState(), D1)).map(r => r.done), [true, true, true, true]);
});

test('oathRows: whitespace-only entry is not done', () => {
  // setWarEntry deletes blank text; a whitespace-only entry can still arrive in a valid imported backup.
  const s = oath(defaultState(), D1);
  assert.equal(setWarEntry(s, 'funeral', '   ', at(D1, 9)).warLog.funeral, undefined);
  assert.deepEqual(oathRows(setWarEntry(s, 'funeral', '   ', at(D1, 9))).map(r => r.done), [true, false, true, true]);
  const imported = { ...s, warLog: { ...s.warLog, code: { text: ' \n\t ', updatedAt: at(D1, 9) } } };
  assert.equal(validateState(imported), null);
  assert.deepEqual(oathRows(imported).map(r => r.done), [true, true, false, true]);
});

test('challengeEnd: start + length - 1', () => {
  const s = started(D1);
  assert.equal(challengeEnd(s), addDays(D1, s.challenge.length - 1));
});

test('stripCells: Day 1 of a fresh challenge = today, the rest upcoming', () => {
  const s = started(D1);
  const L = s.challenge.length;
  const cells = stripCells(s, D1);
  assert.equal(cells.length, L);
  assert.deepEqual(cells.map(c => c.n), Array.from({ length: L }, (_, i) => i + 1));
  assert.deepEqual(cells.map(c => c.date), Array.from({ length: L }, (_, i) => addDays(D1, i)));
  assert.deepEqual(kinds(cells), ['today', ...Array(L - 1).fill('future')]);
  assert.deepEqual(cells[0], { n: 1, date: D1, kind: 'today' });
});

test('stripCells: passed, redo, reset, open (past, not settled yet), today, future', () => {
  let s = started(D1);
  const L = s.challenge.length;
  s = passDay(s, D1);
  s = redoDay(s, addDays(D1, 1));
  s = resetDay(s, addDays(D1, 2));
  const d4 = addDays(D1, 3), d5 = addDays(D1, 4); // Day 4 never closed
  const expected = ['passed', 'redo', 'reset', 'open', 'today', ...Array(L - 5).fill('future')];
  assert.deepEqual(kinds(stripCells(s, d5)), expected);
  assert.equal(settleMissed(s, at(d5, 2)), s); // 02:00: Day 4's grace is not over, still open
  assert.deepEqual(kinds(stripCells(settleMissed(s, at(d5, 2)), d5)), expected);
  const settled = settleMissed(s, at(d5, 5));
  assert.equal(settled.days[d4].result, 'redo');
  assert.deepEqual(kinds(stripCells(settled, d5)), ['passed', 'redo', 'reset', 'redo', 'today', ...Array(L - 5).fill('future')]);
});

test('stripCells: a closed today shows its result, not "today"', () => {
  const s = started(D1);
  assert.equal(stripCells(passDay(s, D1), D1)[0].kind, 'passed');
  assert.equal(stripCells(resetDay(s, D1), D1)[0].kind, 'reset');
  assert.equal(stripCells(redoDay(s, D1), D1)[0].kind, 'redo');
});

test('legend: passed / redo / reset counts over the whole challenge', () => {
  let s = started(D1);
  assert.deepEqual(legend(s), { passed: 0, redo: 0, reset: 0 });
  s = passDay(s, D1);
  s = passDay(s, addDays(D1, 1));
  s = redoDay(s, addDays(D1, 2));
  s = resetDay(s, addDays(D1, 3));
  assert.deepEqual(legend(s), { passed: 2, redo: 1, reset: 1 });
  assert.deepEqual(legend(settleMissed(s, at(addDays(D1, 6), 5))), { passed: 2, redo: 3, reset: 1 }); // Days 5, 6 settled
});

test('redoStatus: available while active and today is open', () => {
  const s = started(D1);
  assert.deepEqual(redoStatus(s, D1), { kind: 'available' });
  assert.deepEqual(redoStatus(passDay(s, D1), addDays(D1, 1)), { kind: 'available' });
});

test('redoStatus: declared on Day 3 → used, day 3, on every later day', () => {
  let s = started(D1);
  s = passDay(s, D1);
  s = passDay(s, addDays(D1, 1));
  const d3 = addDays(D1, 2);
  s = ok(confirmRedo(s, d3, at(d3, 9)));
  assert.equal(s.challenge.redoUsed, d3);
  assert.deepEqual(redoStatus(s, d3), { kind: 'used', day: 3 });
  s = redoDay(s, d3);
  assert.deepEqual(redoStatus(s, d3), { kind: 'used', day: 3 });
  assert.deepEqual(redoStatus(s, addDays(D1, 4)), { kind: 'used', day: 3 });
  assert.deepEqual(redoStatus(s, addDays(D1, s.challenge.length)), { kind: 'used', day: 3 });
});

test('redoStatus: unused but today closed, before start, or finished → closed', () => {
  const s = started(D1);
  assert.deepEqual(redoStatus(passDay(s, D1), D1), { kind: 'closed' });
  assert.deepEqual(redoStatus(s, addDays(D1, s.challenge.length)), { kind: 'closed' });
  assert.deepEqual(redoStatus(started(addDays(D1, 1)), D1), { kind: 'closed' });
});

test('confirmRedo: today, with nowMs on that local date → declared', () => {
  const s = started(D1);
  const next = ok(confirmRedo(s, D1, at(D1, 9)));
  assert.equal(next.challenge.redoUsed, D1);
  assert.equal(next.days[D1].declaredRedo, true);
  assert.equal(ok(confirmRedo(s, D1, at(D1, 23, 59))).challenge.redoUsed, D1);
});

test('confirmRedo: nowMs on another local date → refused (the sheet stayed open past midnight)', () => {
  const s = started(D1);
  assert.deepEqual(confirmRedo(s, D1, at(addDays(D1, 1), 0, 15)), { ok: false, error: 'You can only declare a Redo for today.' });
  assert.deepEqual(confirmRedo(s, addDays(D1, 1), at(D1, 23, 59)), { ok: false, error: 'You can only declare a Redo for today.' });
});

test('confirmRedo: second declaration → already used', () => {
  const s = ok(confirmRedo(started(D1), D1, at(D1, 9)));
  const d2 = addDays(D1, 1);
  assert.deepEqual(confirmRedo(s, d2, at(d2, 9)), { ok: false, error: 'Your one declared Redo is already used.' });
  assert.deepEqual(confirmRedo(s, D1, at(D1, 10)), { ok: false, error: 'Your one declared Redo is already used.' });
});

test('missionInfo: with a pack → that day\'s mission, null on a day the pack lacks', () => {
  const s = importPack(started(D1), { missions: [{ day: 1, title: 'Mission A', body: 'Body A' }], tactics: [] });
  assert.equal(validateState(s), null);
  assert.deepEqual(missionInfo(s, D1), { n: 1, mission: { day: 1, title: 'Mission A', body: 'Body A' }, href: '#mission/1' });
  assert.deepEqual(missionInfo(s, addDays(D1, 1)), { n: 2, mission: null, href: '#mission/2' });
});

test('missionInfo: without a pack → mission null; no day number → n 0', () => {
  assert.deepEqual(missionInfo(started(D1), D1), { n: 1, mission: null, href: '#mission/1' });
  assert.deepEqual(missionInfo(started(D1), addDays(D1, 4)), { n: 5, mission: null, href: '#mission/5' });
  assert.deepEqual(missionInfo(started(addDays(D1, 1)), D1), { n: 0, mission: null, href: '#mission/0' });
});

test('graduated: false mid-challenge and on an open last day', () => {
  const s = started(D1);
  const end = addDays(D1, s.challenge.length - 1);
  assert.equal(graduated(s, D1), false);
  assert.equal(graduated(passDay(s, D1), D1), false);
  assert.equal(graduated(s, addDays(D1, 9)), false);
  assert.equal(graduated(settleMissed(s, at(end, 5)), end), false); // every day but the last closed
});

test('graduated: true once the phase is finished, even with nothing closed', () => {
  const s = started(D1);
  assert.equal(graduated(s, addDays(D1, s.challenge.length)), true);
  assert.equal(graduated(s, addDays(D1, s.challenge.length + 5)), true);
});

test('graduated: true on the last day once that day is closed', () => {
  const s = started(D1);
  const end = addDays(D1, s.challenge.length - 1);
  const open = settleMissed(s, at(end, 5));
  assert.equal(graduated(passDay(open, end), end), true);
  assert.equal(graduated(resetDay(open, end), end), true);
});

test('graduation: counts, longest streak, pass rate over the whole challenge', () => {
  let s = started(D1);
  const L = s.challenge.length;
  for (const i of [0, 1]) s = passDay(s, addDays(D1, i));
  s = redoDay(s, addDays(D1, 2));
  for (const i of [3, 4, 5]) s = passDay(s, addDays(D1, i));
  s = resetDay(s, addDays(D1, 6));
  s = settleMissed(s, at(addDays(D1, L), 5)); // Days 8..L settled as redo
  assert.equal(longestStreak(s), 3);
  assert.deepEqual(graduation(s), { passed: 5, redo: 1 + (L - 7), reset: 1, longest: 3, rate: 5 / L });
});

test('graduation: zero closed days → rate null, label "—"', () => {
  const s = started(D1);
  assert.equal(graduated(s, addDays(D1, s.challenge.length)), true);
  const g = graduation(s);
  assert.deepEqual(g, { passed: 0, redo: 0, reset: 0, longest: 0, rate: null });
  assert.equal(rateLabel(g.rate), '—');
});

test('rateLabel: whole percent, null = em dash, never NaN', () => {
  assert.equal(rateLabel(0.5), '50%');
  assert.equal(rateLabel(2 / 3), '67%');
  assert.equal(rateLabel(0), '0%');
  assert.equal(rateLabel(1), '100%');
  assert.equal(rateLabel(null), '—');
  for (const r of [0, 0.5, 2 / 3, 1, null]) assert.ok(!rateLabel(r).includes('NaN'));
});

for (const DST of DST_DAYS) {
  test(`DST day ${DST}: strip passed / today / upcoming, then open at 02:00 and settled at 05:00`, () => {
    const y = addDays(DST, -1), next = addDays(DST, 1);
    let s = passDay(started(y), y);
    const L = s.challenge.length;
    assert.deepEqual(stripCells(s, DST).slice(0, 3), [
      { n: 1, date: y, kind: 'passed' }, { n: 2, date: DST, kind: 'today' }, { n: 3, date: next, kind: 'future' },
    ]);
    s = settleMissed(s, at(next, 2));
    assert.deepEqual(kinds(stripCells(s, next)), ['passed', 'open', 'today', ...Array(L - 3).fill('future')]);
    s = settleMissed(s, at(next, 5));
    assert.deepEqual(kinds(stripCells(s, next)), ['passed', 'redo', 'today', ...Array(L - 3).fill('future')]);
    assert.deepEqual(kinds(stripCells(passDay(started(y), DST), DST)).slice(0, 2), ['open', 'passed']);
  });

  test(`DST day ${DST}: confirmRedo at 23:45 declared, at 00:15 the next day refused`, () => {
    const s = started(DST);
    assert.equal(ok(confirmRedo(s, DST, at(DST, 23, 45))).challenge.redoUsed, DST);
    assert.deepEqual(confirmRedo(s, DST, at(addDays(DST, 1), 0, 15)), { ok: false, error: 'You can only declare a Redo for today.' });
  });
}
