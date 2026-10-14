import test from 'node:test';
import assert from 'node:assert/strict';
import { dayParam, missionView, warLogGroups, entryView, saveEntry } from '../src/views/warlogLogic.js';
import { startChallenge } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { validatePack, importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, warEntries, OATH_KEYS, OATH_TITLES } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { dayLabel } from '../src/views/tasksLogic.js';
import { addDays } from '../src/logic.js';

// Plan Task 14 + brief contract (rulings R1-R4). States built with core functions; local timestamps only.
const D1 = '2026-10-13', D2 = addDays(D1, 1); // Tuesday, Wednesday
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const CROSSED = { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } };
const AUTOPSY = { state: 'Tired after work', time: 'Evening', place: 'Room A',
  decision: 'I will block the app after work', change: 'I will delete the app from the phone' };

function started(key = D1) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(key, 7));
  return ok(startChallenge(s, key, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const PACK = validatePack(JSON.stringify({ v: 1, missions: [
  { day: 1, title: 'Mission A', body: 'Body A one\n\nBody A two' },
  { day: 3, title: 'Mission B', body: '  Body B one\nBody B line two\n \nBody B two\n\n\n' },
  { day: 30, title: 'Mission C', body: 'Body C one' },
] })).pack;
const withPack = s => importPack(s, PACK);
// Reset on D1 and D2 (red line crossed), both autopsies filed.
function withAutopsies() {
  let s = started(D1);
  s = ok(closeNight(s, D1, CROSSED, at(D1, 21)));
  s = ok(closeNight(s, D2, CROSSED, at(D2, 21)));
  s = ok(fileAutopsy(s, D1, AUTOPSY, at(D2, 8)));
  return ok(fileAutopsy(s, D2, AUTOPSY, at(D2, 22)));
}

test('dayParam: canonical integers 1..30 only (R1)', () => {
  const table = [['9', 9], ['1', 1], ['30', 30], ['09', null], ['1e1', null], ['', null], ['-1', null], ['0', null],
    ['31', null], ['NaN', null], [NaN, null], ['9.0', null], [' 9', null], [undefined, null]];
  for (const [p, want] of table) assert.equal(dayParam(p), want, String(p));
});

test('missionView: invalid param redirects', () => {
  const s = withPack(started());
  for (const p of ['09', '1e1', '', '-1', '0', '31', 'NaN', undefined]) assert.deepEqual(missionView(s, D1, p), { kind: 'redirect' }, String(p));
});

test('missionView: no challenge and before start lock every day (R2)', () => {
  assert.deepEqual(missionView(withPack(defaultState()), D1, '1'), { kind: 'locked', n: 1 });
  assert.deepEqual(missionView(withPack(started(D1)), addDays(D1, -1), '1'), { kind: 'locked', n: 1 });
});

test('missionView: n === dayNo readable, n = dayNo + 1 locked before the mission lookup', () => {
  const s = withPack(started(D1)), today = addDays(D1, 2); // Day 3
  assert.equal(missionView(s, today, '3').kind, 'mission');
  assert.equal(missionView(s, today, '1').kind, 'mission');
  assert.deepEqual(missionView(s, addDays(D1, 1), '3'), { kind: 'locked', n: 3 }); // Day 2: mission 3 exists, still locked
  assert.deepEqual(missionView(s, today, '4'), { kind: 'locked', n: 4 });
});

test('missionView: readable day without a mission is none', () => {
  assert.deepEqual(missionView(withPack(started(D1)), addDays(D1, 2), '2'), { kind: 'none', n: 2 });
  assert.deepEqual(missionView(started(D1), addDays(D1, 2), '3'), { kind: 'none', n: 3 }); // no pack
});

test('missionView: finished challenge reads every day', () => {
  const s = withPack(started(D1)), today = addDays(D1, 40);
  assert.equal(missionView(s, today, '30').kind, 'mission');
  assert.deepEqual(missionView(s, today, '29'), { kind: 'none', n: 29 });
});

test('missionView: mission shape and paragraph split', () => {
  const s = withPack(started(D1)), today = addDays(D1, 5);
  assert.deepEqual(missionView(s, today, '1'), { kind: 'mission', n: 1, title: 'Mission A',
    paragraphs: ['Body A one', 'Body A two'], href: '#warlog/day-1' });
  // '\n \n' separates; a single newline stays inside its paragraph; trimmed; empty tail dropped.
  assert.deepEqual(missionView(s, today, '3').paragraphs, ['Body B one\nBody B line two', 'Body B two']);
});

const emptyOath = k => ({ key: k, title: OATH_TITLES[k], date: null, preview: 'Not written yet', href: `#warlog/${k}`, empty: true });

test('warLogGroups: empty log is only Oath with four unwritten rows (R3)', () => {
  assert.deepEqual(warLogGroups(defaultState()), [{ group: 'Oath', rows: OATH_KEYS.map(emptyOath) }]);
});

test('warLogGroups: written row keeps warEntries title and preview, date is the local day label', () => {
  const text = `${'A'.repeat(79)}💪${'B'.repeat(10)}`; // 90 code points, emoji is the 80th
  const s = setWarEntry(defaultState(), 'funeral', text, at(D2, 0, 30)); // 00:30 local on Wednesday
  const [oath, ...rest] = warLogGroups(s);
  assert.equal(rest.length, 0);
  const row = oath.rows[1];
  const e = warEntries(s)[0];
  assert.deepEqual(row, { key: 'funeral', title: e.title, date: dayLabel(D2), preview: e.preview, href: '#warlog/funeral', empty: false });
  assert.equal(row.date, 'Wednesday 14 October');
  assert.equal(row.preview, `${'A'.repeat(79)}💪`); // not re-cut (a UTF-16 slice would split the emoji)
  assert.deepEqual([oath.rows[0], oath.rows[2], oath.rows[3]], ['contract', 'code', 'redlines-w1'].map(emptyOath));
});

test('warLogGroups: Autopsies omitted when empty, Days in warEntries order', () => {
  let s = setWarEntry(defaultState(), 'day-12', 'Text A', at(D1, 20));
  s = setWarEntry(s, 'day-2', 'Text B', at(D1, 21));
  const groups = warLogGroups(s);
  assert.deepEqual(groups.map(g => g.group), ['Oath', 'Days']);
  assert.deepEqual(groups[1].rows.map(r => r.key), ['day-2', 'day-12']);
  assert.deepEqual(groups[1].rows.map(r => r.title), ['Day 2 notes', 'Day 12 notes']);
  assert.deepEqual(groups[1].rows.map(r => r.href), ['#warlog/day-2', '#warlog/day-12']);
});

test('warLogGroups: Oath, Autopsies, Days in order; rows follow warEntries', () => {
  const s = setWarEntry(withAutopsies(), 'day-1', 'Text A', at(D1, 22));
  const groups = warLogGroups(s);
  assert.deepEqual(groups.map(g => g.group), ['Oath', 'Autopsies', 'Days']);
  const by = g => warEntries(s).filter(e => e.group === g).map(e => e.key);
  assert.deepEqual(groups[1].rows.map(r => r.key), by('Autopsies'));
  assert.deepEqual(groups[1].rows.map(r => r.key), [`autopsy-${D2}`, `autopsy-${D1}`]);
  assert.deepEqual(groups[2].rows.map(r => r.key), by('Days'));
  assert.deepEqual(groups[0].rows.map(r => r.empty), [false, false, false, false]);
  assert.equal(groups[1].rows[0].date, dayLabel(D2));
});

test('entryView: unwritten oath and unwritten valid day keys are editable (R4)', () => {
  const s = defaultState();
  assert.deepEqual(entryView(s, 'contract'), { key: 'contract', title: 'Contract', text: '', readOnly: false });
  assert.deepEqual(entryView(s, 'day-5'), { key: 'day-5', title: 'Day 5 notes', text: '', readOnly: false });
  const w = setWarEntry(s, 'day-5', 'Text A', at(D1, 20));
  assert.deepEqual(entryView(w, 'day-5'), { key: 'day-5', title: 'Day 5 notes', text: 'Text A', readOnly: false });
});

test('entryView: invalid or unfiled keys are null', () => {
  let s = started(D1);
  s = ok(closeNight(s, D1, CROSSED, at(D1, 21))); // recovery pending, autopsy not filed
  for (const k of ['day-09', 'day-31', 'day-0', 'day-', 'foo', `autopsy-${D1}`, 'constructor', undefined]) {
    assert.equal(entryView(s, k), null, String(k));
  }
});

test('entryView: filed autopsy is read-only with the stored text', () => {
  const s = withAutopsies(), key = `autopsy-${D1}`;
  const v = entryView(s, key);
  assert.deepEqual(v, { key, title: `Autopsy · ${D1}`, text: s.warLog[key].text, readOnly: true });
  assert.ok(v.text.includes('\n'));
});

test('saveEntry: always stores a string', () => {
  const T = at(D1, 20);
  const s = saveEntry(defaultState(), 'day-5', 5, T);
  assert.deepEqual(s.warLog['day-5'], { text: '5', updatedAt: T });
  const u = saveEntry(s, 'day-5', 'Text B', T + 1);
  assert.deepEqual(u.warLog['day-5'], { text: 'Text B', updatedAt: T + 1 });
});

test('saveEntry: unchanged text, blank on unwritten and autopsy keys return the same object', () => {
  const s = setWarEntry(defaultState(), 'day-5', 'Text A', at(D1, 20));
  assert.equal(saveEntry(s, 'day-5', 'Text A', at(D1, 21)), s);
  assert.equal(saveEntry(s, 'contract', '', at(D1, 21)), s);
  const a = withAutopsies(), key = `autopsy-${D1}`;
  assert.equal(saveEntry(a, key, 'Text B', at(D2, 23)), a);
});
