import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/views/settingsLogic.js';
import { defaultState, validateState } from '../src/core/model.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { validatePack } from '../src/core/pack.js';
import { exportJson } from '../src/core/store.js';

// Task 19 settings logic: DOM-free state transforms. 2026-10-12 is a Monday.
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14';
const at = (offset, h) => new Date(2026, 9, 12 + offset, h).getTime();
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const ids = (...v) => { let i = 0; return () => v[i++] ?? `id${i}`; };
const P = { id: 'p1', title: 'Protocol A', med: null };
const R = { id: 'r1', name: 'Red line A' };
const pre = (protocols = [], redLines = []) => deepFreeze({ ...defaultState(), setup: { protocols, redLines } });
const live = () => deepFreeze(startChallenge(defaultState(), MON, { protocols: [P, { id: 'p2', title: 'Protocol B', med: 'Short B' }],
  redLines: [R, { id: 'r2', name: 'Red line B' }], oathComplete: true }).state);
const form = (extra = {}) => ({ protocols: { p1: 'held', p2: 'held', ...extra.p }, redLines: { r1: 'held', r2: 'held' }, win: 'w' });
const close = (s, date, h, f = form()) => {
  const r = closeNight(s, date, f, at(Number(date.slice(8)) - 12, h));
  assert.equal(r.ok, true, r.error);
  return r.state;
};

test('lists: before Day 1 they come from setup, during the challenge from the challenge', () => {
  assert.deepEqual(L.lists(defaultState()), { protocols: [], redLines: [] });
  assert.deepEqual(L.lists(pre([P], [R])), { protocols: [P], redLines: [R] });
  assert.deepEqual(L.lists(live()).protocols.map(p => p.id), ['p1', 'p2']);
});

test('saveProtocol before Day 1 writes state.setup, never the challenge, and validates', () => {
  const r = L.saveProtocol(defaultState(), { title: '  Protocol A  ', med: '  ' }, null, ids('p1'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.setup, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [] });
  assert.equal(r.state.challenge, null);
  assert.equal(validateState(r.state), null);
  const m = L.saveProtocol(r.state, { title: 'Protocol B', med: ' Short ' }, null, ids('p2'));
  assert.deepEqual(m.state.setup.protocols[1], { id: 'p2', title: 'Protocol B', med: 'Short' });
  assert.deepEqual(L.saveProtocol(r.state, { title: '   ', med: '' }, null), { ok: false, error: 'Give the protocol a title.' });
  assert.deepEqual(L.saveProtocol(r.state, { title: 'X', med: '' }, 'nope'), { ok: false, error: 'That protocol no longer exists.' });
});

test('saveProtocol rename keeps the id and position', () => {
  const s = pre([P, { id: 'p2', title: 'B', med: null }]);
  const r = L.saveProtocol(s, { title: 'Protocol A2', med: 'Short A' }, 'p1');
  assert.deepEqual(r.state.setup.protocols, [{ id: 'p1', title: 'Protocol A2', med: 'Short A' }, { id: 'p2', title: 'B', med: null }]);
});

test('red lines: add, rename, delete before Day 1', () => {
  let r = L.saveRedLine(defaultState(), { name: ' Red line A ' }, null, ids('r1'));
  assert.deepEqual(r.state.setup.redLines, [R]);
  r = L.saveRedLine(r.state, { name: 'Red line A2' }, 'r1');
  assert.deepEqual(r.state.setup.redLines, [{ id: 'r1', name: 'Red line A2' }]);
  assert.deepEqual(L.saveRedLine(r.state, { name: '' }, null), { ok: false, error: 'Give the red line a name.' });
  assert.deepEqual(L.saveRedLine(r.state, { name: 'X' }, 'nope'), { ok: false, error: 'That red line no longer exists.' });
  r = L.deleteRedLine(r.state, 'r1');
  assert.deepEqual(r.state.setup.redLines, []);
});

test('during a challenge the edits go to challenge.protocols / redLines, not setup', () => {
  const s = live();
  const a = L.saveProtocol(s, { title: 'Protocol C', med: '' }, null, ids('p3'));
  assert.equal(a.state.challenge.protocols.length, 3);
  assert.equal('setup' in a.state, false);
  const b = L.saveRedLine(s, { name: 'Red line C' }, null, ids('r3'));
  assert.equal(b.state.challenge.redLines.length, 3);
  assert.equal(validateState(b.state), null);
});

test('deleting the last protocol or red line of a running challenge is refused; before Day 1 it is allowed', () => {
  const one = deepFreeze(startChallenge(defaultState(), MON, { protocols: [P], redLines: [R], oathComplete: true }).state);
  assert.deepEqual(L.deleteProtocol(one, 'p1'), { ok: false, error: 'A challenge needs at least one protocol.' });
  assert.deepEqual(L.deleteRedLine(one, 'r1'), { ok: false, error: 'A challenge needs at least one red line.' });
  assert.deepEqual(L.deleteProtocol(pre([P]), 'p1').state.setup.protocols, []);
});

test('Review Focus 4: rename and delete never rewrite a finished day', () => {
  let s = live();
  s = close(s, MON, 22);
  const before = JSON.stringify(s.days[MON]);
  s = L.saveProtocol(s, { title: 'Renamed', med: '' }, 'p1').state;
  s = L.deleteProtocol(s, 'p2').state;
  s = L.saveRedLine(s, { name: 'Renamed line' }, 'r1').state;
  s = L.deleteRedLine(s, 'r2').state;
  assert.equal(JSON.stringify(s.days[MON]), before);
  assert.deepEqual(s.days[MON].night.protocols.map(p => p.title), ['Protocol A', 'Protocol B']);
  assert.deepEqual(s.days[MON].night.redLines.map(r => r.name), ['Red line A', 'Red line B']);
  assert.deepEqual(s.challenge.protocols.map(p => p.title), ['Renamed']);
});

test('a protocol added mid-challenge applies from the next close only', () => {
  let s = live();
  s = close(s, MON, 22);
  s = L.saveProtocol(s, { title: 'Protocol C', med: '' }, null, ids('p3')).state;
  assert.equal(s.days[MON].night.protocols.length, 2);
  assert.equal(closeNight(s, TUE, form(), at(1, 22)).error, 'protocols-unanswered');
  const t = close(s, TUE, 22, form({ p: { p3: 'missed' } }));
  assert.deepEqual(t.days[TUE].night.protocols.map(p => p.id), ['p1', 'p2', 'p3']);
  assert.equal(t.days[MON].night.protocols.length, 2);
});

test('a protocol deleted after its MED was declared still closes the night', () => {
  let s = live();
  s = submitMorning(s, MON, { target: 't', risk: '', med: ['p2'] }, at(0, 8)).state;
  s = L.deleteProtocol(s, 'p2').state;
  const t = close(s, MON, 22, { protocols: { p1: 'held' }, redLines: { r1: 'held', r2: 'held' }, win: '' });
  assert.equal(t.days[MON].result, 'passed');
});

test('bounds come from the core validator', () => {
  assert.deepEqual(L.SETTING_BOUNDS.zeroDay, { min: 2, max: 5 });
  assert.deepEqual(L.SETTING_BOUNDS.medPerWeek, { min: 0, max: 3 });
});

test('setZeroDay / setMedPerWeek stay inside the bounds and leave days alone', () => {
  let s = close(live(), MON, 22);
  const days = JSON.stringify(s.days);
  assert.equal(L.setZeroDay(s, 4).settings.zeroDay, 4);
  assert.equal(L.setZeroDay(s, 1), s);
  assert.equal(L.setZeroDay(s, 6), s);
  assert.equal(L.setZeroDay(s, 3), s);
  assert.equal(L.setMedPerWeek(s, 0).settings.medPerWeek, 0);
  assert.equal(L.setMedPerWeek(s, 3).settings.medPerWeek, 3);
  assert.equal(L.setMedPerWeek(s, 4), s);
  assert.equal(L.setMedPerWeek(s, -1), s);
  s = L.setZeroDay(L.setMedPerWeek(s, 3), 5);
  assert.equal(JSON.stringify(s.days), days);
  assert.equal(validateState(s), null);
});

test('startEditable: only with a challenge and no closed day', () => {
  assert.equal(L.startEditable(defaultState()), false);
  assert.equal(L.startEditable(live()), true);
  assert.equal(L.startEditable(submitMorning(live(), MON, { target: 't', risk: '', med: [] }, at(0, 8)).state), true);
  assert.equal(L.startEditable(close(live(), MON, 22)), false);
  const odd = { ...live(), days: { [MON]: { ...close(live(), MON, 22).days[MON], closedAt: null, result: 'redo' } } };
  assert.equal(L.startEditable(odd), false);
});

// Day 1 may move back only to a day whose 04:00 grace has not passed at nowMs (core settleMissed would close it as Redo).
test('setStartDate: moves Day 1 to yesterday before 04:00, nothing is settled', () => {
  const s = live();
  const r = L.setStartDate(s, MON, '2026-10-11', at(0, 2));
  assert.equal(r.ok, true);
  assert.equal(r.state.challenge.startDate, '2026-10-11');
  assert.equal(validateState(r.state), null);
  assert.equal(L.setStartDate(s, WED, MON, at(2, 12)).state, s);
});

test('setStartDate refuses a move back that the core would settle as Redo days (the whole challenge could be lost)', () => {
  const err = 'Day 1 cannot move back to a day that has already ended.';
  assert.deepEqual(L.setStartDate(live(), WED, TUE, at(2, 12)), { ok: false, error: err });
  assert.deepEqual(L.setStartDate(live(), WED, '2026-09-01', at(2, 12)), { ok: false, error: err });
  assert.deepEqual(L.setStartDate(live(), MON, '2026-10-11', at(0, 5)), { ok: false, error: err });
});

test('setStartDate refuses: no challenge, closed day, bad date, future date', () => {
  assert.equal(L.setStartDate(defaultState(), WED, TUE, at(2, 12)).error, 'The challenge has not started.');
  assert.equal(L.setStartDate(close(live(), MON, 22), WED, TUE, at(2, 12)).error, 'Day 1 cannot change once a day is closed.');
  for (const d of ['', 'x', '2026-13-40', '2026-2-3', null]) assert.equal(L.setStartDate(live(), WED, d, at(2, 12)).error, 'Choose a valid date.', String(d));
  assert.equal(L.setStartDate(live(), WED, '2026-10-15', at(2, 12)).error, 'Day 1 cannot be in the future.');
});

test('setStartDate refuses a move that would orphan a filed day or the declared Redo', () => {
  const filed = submitMorning(live(), MON, { target: 't', risk: '', med: [] }, at(0, 8)).state;
  const err = 'Day 1 cannot move there: a day you already filed would fall outside the 30 days.';
  assert.deepEqual(L.setStartDate(filed, WED, TUE, at(2, 12)), { ok: false, error: err });
  assert.equal(L.setStartDate(filed, MON, '2026-10-11', at(0, 2)).ok, true);
  const late = { ...filed, days: { '2026-11-11': { ...filed.days[MON] } } };
  assert.equal(L.setStartDate(late, '2026-11-11', '2026-10-11', at(2, 12)).ok, false);
  const redo = { ...live(), challenge: { ...live().challenge, redoUsed: MON } };
  assert.deepEqual(L.setStartDate(redo, WED, TUE, at(2, 12)), { ok: false, error: err });
});

test('packSummary and backupLine', () => {
  assert.equal(L.packSummary(defaultState()), 'No pack imported');
  const pack = validatePack(JSON.stringify({ v: 1, missions: [{ day: 1, title: 'M', body: 'b' }, { day: 2, title: 'N', body: 'c' }],
    tactics: [{ archetype: 'assassin', name: 'T' }] })).pack;
  assert.equal(L.packSummary({ ...defaultState(), pack }), '2 missions · 1 tactic · imported');
  const bk = lastBackup => ({ ...defaultState(), settings: { ...defaultState().settings, lastBackup } });
  assert.deepEqual(L.backupLine(bk(null), WED), { text: 'No backup yet · export one weekly', overdue: true });
  assert.deepEqual(L.backupLine(bk(WED), WED), { text: 'Today · export one weekly', overdue: false });
  assert.deepEqual(L.backupLine(bk(TUE), WED), { text: 'Yesterday · export one weekly', overdue: false });
  assert.deepEqual(L.backupLine(bk('2026-10-07'), WED), { text: '7 days ago · export one weekly', overdue: false });
  assert.deepEqual(L.backupLine(bk('2026-10-06'), WED), { text: '8 days ago · export one weekly', overdue: true });
  assert.deepEqual(L.backupLine(bk('2026-12-01'), WED), { text: 'The last backup date is in the future · export one weekly', overdue: true });
});

test('reminders: the plan texts and times, exactly', () => {
  assert.deepEqual(L.REMINDERS, [
    ['Morning', '07:00', 'Morning check-in. Open Lock In and file it.'],
    ['Afternoon', '13:00', 'Midday. Still on track? Log it.'],
    ['Night', '21:30', 'Night check-in. Close the day.'],
  ]);
});

const io = (over = {}) => {
  const calls = [];
  return { calls, makeFile: (name, text) => ({ name, text }),
    canShare: f => { calls.push(['canShare', f.name]); return true; }, share: async f => { calls.push(['share', f.name]); },
    download: f => { calls.push(['download', f.name]); }, ...over };
};

test('backupName', () => assert.equal(L.backupName(WED), 'lockin-2026-10-14.json'));

test('runExport: share ok marks the backup', async () => {
  const i = io();
  const r = await L.runExport(defaultState(), WED, i);
  assert.equal(r.outcome, 'shared');
  assert.equal(r.state.settings.lastBackup, WED);
  assert.deepEqual(i.calls, [['canShare', 'lockin-2026-10-14.json'], ['share', 'lockin-2026-10-14.json']]);
});

const abort = () => Object.assign(new Error('cancelled'), { name: 'AbortError' });

test('runExport: a cancelled share (AbortError) does NOT mark a backup and does not download', async () => {
  const i = io({ share: async () => { throw abort(); } });
  const r = await L.runExport(defaultState(), WED, i);
  assert.deepEqual(r, { outcome: 'cancelled' });
  assert.deepEqual(i.calls.map(c => c[0]), ['canShare']);
});

test('runExport: a share that fails for another reason falls back to download and then marks', async () => {
  const i = io({ share: async () => { throw Object.assign(new Error('gesture expired'), { name: 'NotAllowedError' }); } });
  const r = await L.runExport(defaultState(), WED, i);
  assert.equal(r.outcome, 'downloaded');
  assert.equal(r.state.settings.lastBackup, WED);
  assert.deepEqual(i.calls.map(c => c[0]), ['canShare', 'download']);
  const bad = io({ share: async () => { throw new Error('x'); }, download: () => { throw new Error('y'); } });
  assert.deepEqual(await L.runExport(defaultState(), WED, bad), { outcome: 'cancelled' });
});

test('runExport: no share support falls back to download and then marks', async () => {
  const i = io({ canShare: () => false });
  const r = await L.runExport(defaultState(), WED, i);
  assert.equal(r.outcome, 'downloaded');
  assert.equal(r.state.settings.lastBackup, WED);
  assert.deepEqual(i.calls, [['download', 'lockin-2026-10-14.json']]);
});

test('runExport: a download that throws does not mark', async () => {
  const r = await L.runExport(defaultState(), WED, io({ canShare: () => false, download: () => { throw new Error('x'); } }));
  assert.deepEqual(r, { outcome: 'cancelled' });
});

test('runExport: the exported file is the marked state', async () => {
  let text;
  await L.runExport(defaultState(), WED, io({ makeFile: (n, t) => { text = t; return { name: n }; } }));
  assert.equal(JSON.parse(text).settings.lastBackup, WED);
  assert.equal(text, exportJson({ ...defaultState(), settings: { ...defaultState().settings, lastBackup: WED } }));
});

// Erase all data (owner ruling 2026-10-24): every key the app writes goes, nothing else.
const fakeStorage = (data, failOn = []) => ({
  data,
  removeItem(k) { if (failOn.includes(k)) throw new Error('blocked'); delete this.data[k]; },
});

test('eraseAll removes the four app keys and nothing else', () => {
  const s = fakeStorage({ 'lockin.v2': 'a', 'lockin.v2.gym': 'b', 'lockin.v2.corrupt': 'c', 'lockin.v2.gym.corrupt': 'd', other: 'e' });
  assert.equal(L.eraseAll(s), true);
  assert.deepEqual(s.data, { other: 'e' });
});

test('eraseAll on empty storage is fine', () => {
  assert.equal(L.eraseAll(fakeStorage({})), true);
});

test('eraseAll tries every key even when one removal throws, and then returns false', () => {
  const s = fakeStorage({ 'lockin.v2': 'a', 'lockin.v2.gym': 'b', 'lockin.v2.corrupt': 'c' }, ['lockin.v2']);
  assert.equal(L.eraseAll(s), false);
  assert.deepEqual(s.data, { 'lockin.v2': 'a' });
});

test('eraseAll returns false when the storage has no removeItem (blocked-storage stand-in)', () => {
  assert.equal(L.eraseAll({ getItem: () => null, setItem() { throw new Error('Storage blocked'); } }), false);
});
