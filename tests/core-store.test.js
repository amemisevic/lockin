import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/core/store.js';
import { defaultState, validateState } from '../src/core/model.js';

const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), m }; };
const V1 = 'This is a Lock In v1 backup. v2 cannot import it.';

// A state that uses every nested field of the data model (neutral sample values only).
const full = () => ({
  ...defaultState(),
  settings: { zeroDay: 4, medPerWeek: 1, lastBackup: '2026-10-01' },
  tasks: [
    { id: 't1', title: 'Task A', note: '', start: '09:00', end: '10:30', date: '2026-10-12',
      repeat: { type: 'none', days: [] }, skip: [], archived: false },
    { id: 't2', title: 'Habit A', note: 'n', start: null, end: null, date: null,
      repeat: { type: 'custom', days: [0, 2, 6] }, skip: ['2026-10-13'], archived: true },
  ],
  taskLog: { '2026-10-12': { t1: 'done', t2: 'stalled' }, '2026-10-11': { t2: 'failed' } },
  challenge: { startDate: '2026-10-01', length: 30, redoUsed: null,
    protocols: [{ id: 'p1', title: 'Protocol A', med: 'Short A' }, { id: 'p2', title: 'Protocol B', med: null }],
    redLines: [{ id: 'r1', name: 'Line A' }] },
  days: {
    '2026-10-10': {
      morning: { at: 1, target: 'Target A', risk: '', med: ['p1'] },
      afternoon: { at: 2, onTrack: 'struggling', friction: 'x' },
      declaredRedo: false, slipNote: '', incompleteMorning: false, auto: null,
      night: { at: 3, protocols: [{ id: 'p1', title: 'Protocol A', status: 'med' }, { id: 'p2', title: 'Protocol B', status: 'missed' }],
        redLines: [{ id: 'r1', name: 'Line A', status: 'held' }], win: 'w',
        bottomG: { archetype: 'negotiator', tactic: 'Tactic A', text: '' },
        suggested: 'redo', override: { result: 'passed', reason: 'r' } },
      result: 'passed', closedAt: 4 },
    '2026-10-11': { morning: null, afternoon: null, declaredRedo: true, slipNote: '', incompleteMorning: true,
      auto: 'no-night', night: null, result: 'redo', closedAt: null },
  },
  recovery: { '2026-10-09': { dueAt: 10, filedAt: null, state: 's', time: 't', place: 'p', decision: 'd', change: 'c' } },
  warLog: { contract: { text: 'x', updatedAt: 5 }, 'day-3': { text: '', updatedAt: 6 } },
  pack: { missions: [{ day: 1, title: 'Mission A', body: 'b' }], tactics: [{ archetype: 'assassin', name: 'Tactic A' }] },
});

test('defaultState is v2, valid, empty', () => {
  const d = defaultState();
  assert.equal(d.v, 2);
  assert.equal(validateState(d), null);
  assert.deepEqual(d.settings, { zeroDay: 3, medPerWeek: 2, lastBackup: null });
  assert.deepEqual(d.tasks, []);
  assert.equal(d.challenge, null);
  assert.equal(d.pack, null);
  assert.equal(T.KEY, 'lockin.v2');
  assert.equal(T.CORRUPT, 'lockin.v2.corrupt');
});

test('the full sample state is valid', () => { assert.equal(validateState(full()), null); });

test('load with nothing stored returns defaults; save/load round-trips', () => {
  const st = mem();
  assert.deepEqual(T.load(st, '2026-10-12'), defaultState());
  assert.equal(T.save(st, full()), true);
  assert.deepEqual(T.load(st, '2026-10-12'), full());
});

test('load of corrupt text returns defaults and keeps a copy; save leaves the copy alone', () => {
  for (const raw of ['{not json', '{"v":1}', 'null', JSON.stringify({ ...full(), v: 3 })]) {
    const st = mem(); st.setItem(T.KEY, raw);
    assert.deepEqual(T.load(st, '2026-10-12'), defaultState());
    assert.equal(st.getItem(T.CORRUPT), raw);
    assert.equal(T.save(st, defaultState()), true);
    assert.equal(st.getItem(T.CORRUPT), raw);
  }
});

test('storage that throws: save returns false, load returns defaults', () => {
  const boom = () => { throw new Error('QuotaExceededError'); };
  assert.equal(T.save({ getItem: () => null, setItem: boom }, full()), false);
  assert.deepEqual(T.load({ getItem: boom, setItem: boom }, '2026-10-12'), defaultState());
});

test('validateImport messages', () => {
  assert.deepEqual(T.validateImport(JSON.stringify({ v: 1, goals: [] })), { ok: false, error: V1 });
  assert.deepEqual(T.validateImport(''), { ok: false, error: 'The file is empty.' });
  assert.deepEqual(T.validateImport('   '), { ok: false, error: 'The file is empty.' });
  assert.deepEqual(T.validateImport('{nope'), { ok: false, error: 'The file is not valid JSON. Choose a Lock In backup file.' });
  for (const t of ['null', '[]', '5', '{"v":3}', JSON.stringify({ ...full(), v: undefined })])
    assert.deepEqual(T.validateImport(t), { ok: false, error: 'This is not a Lock In v2 backup.' }, t);
  const bad = T.validateImport(JSON.stringify({ ...full(), tasks: [{ id: 'x' }] }));
  assert.equal(bad.ok, false); assert.ok(bad.error.length > 0); assert.equal(bad.state, undefined);
});

test('round trip: validateImport(exportJson(s)).state deep-equals s', () => {
  for (const s of [defaultState(), full()]) {
    const r = T.validateImport(T.exportJson(s));
    assert.equal(r.ok, true);
    assert.deepEqual(r.state, s);
  }
});

test('unknown extra keys are kept', () => {
  const s = full(); s.extra = 1; s.settings.extra = 'a'; s.days['2026-10-10'].extra = true;
  assert.equal(validateState(s), null);
  assert.deepEqual(T.validateImport(T.exportJson(s)).state, s);
});

// Each mutation must make the full sample invalid.
const bad = {
  'zeroDay 1': s => { s.settings.zeroDay = 1; },
  'zeroDay 6': s => { s.settings.zeroDay = 6; },
  'zeroDay 2.5': s => { s.settings.zeroDay = 2.5; },
  'medPerWeek -1': s => { s.settings.medPerWeek = -1; },
  'medPerWeek 4': s => { s.settings.medPerWeek = 4; },
  'medPerWeek 1.5': s => { s.settings.medPerWeek = 1.5; },
  'medPerWeek string': s => { s.settings.medPerWeek = '2'; },
  'lastBackup bad': s => { s.settings.lastBackup = '2026-1-1'; },
  'settings missing': s => { delete s.settings; },
  'days result bad': s => { s.days['2026-10-10'].result = 'failed'; },
  'days key bad': s => { s.days['2026-10-1'] = s.days['2026-10-10']; },
  'taskLog key bad': s => { s.taskLog['12-10-2026'] = {}; },
  'recovery key bad': s => { s.recovery.today = s.recovery['2026-10-09']; },
  'taskLog value bad': s => { s.taskLog['2026-10-12'].t1 = 'open'; },
  'tasks not array': s => { s.tasks = {}; },
  'task start bad': s => { s.tasks[0].start = '9:00'; },
  'task date bad': s => { s.tasks[0].date = 'today'; },
  'task repeat type bad': s => { s.tasks[0].repeat.type = 'weekly'; },
  'task repeat day 7': s => { s.tasks[1].repeat.days = [7]; },
  'task skip bad': s => { s.tasks[1].skip = [1]; },
  'task archived bad': s => { s.tasks[0].archived = 'no'; },
  'task note missing': s => { delete s.tasks[0].note; },
  'challenge length': s => { s.challenge.length = 31; },
  'challenge startDate': s => { s.challenge.startDate = null; },
  'challenge redoUsed': s => { s.challenge.redoUsed = 'x'; },
  'protocol med': s => { s.challenge.protocols[0].med = 1; },
  'redLine name': s => { delete s.challenge.redLines[0].name; },
  'morning med': s => { s.days['2026-10-10'].morning.med = 'p1'; },
  'morning at': s => { s.days['2026-10-10'].morning.at = '1'; },
  'afternoon onTrack': s => { s.days['2026-10-10'].afternoon.onTrack = 'maybe'; },
  'declaredRedo': s => { s.days['2026-10-10'].declaredRedo = 0; },
  'auto': s => { s.days['2026-10-10'].auto = 'late'; },
  'closedAt': s => { s.days['2026-10-10'].closedAt = 'now'; },
  'night protocol status': s => { s.days['2026-10-10'].night.protocols[0].status = 'crossed'; },
  'night redLine status': s => { s.days['2026-10-10'].night.redLines[0].status = 'missed'; },
  'night bottomG': s => { s.days['2026-10-10'].night.bottomG = null; },
  'night suggested': s => { s.days['2026-10-10'].night.suggested = null; },
  'night override result': s => { s.days['2026-10-10'].night.override.result = 'x'; },
  'recovery filedAt': s => { s.recovery['2026-10-09'].filedAt = '1'; },
  'recovery change': s => { delete s.recovery['2026-10-09'].change; },
  'warLog entry': s => { s.warLog.contract = 'x'; },
  'warLog updatedAt': s => { s.warLog.contract.updatedAt = null; },
  'pack mission day': s => { s.pack.missions[0].day = '1'; },
  'pack tactic name': s => { delete s.pack.tactics[0].name; },
};
for (const [name, mutate] of Object.entries(bad)) {
  test(`validateState rejects: ${name}`, () => {
    const s = full(); mutate(s);
    const e = validateState(s);
    assert.equal(typeof e, 'string'); assert.ok(e.length > 0);
  });
}

test('markBackup sets settings.lastBackup without mutating', () => {
  const s = defaultState();
  const m = T.markBackup(s, '2026-10-12');
  assert.equal(m.settings.lastBackup, '2026-10-12');
  assert.equal(s.settings.lastBackup, null);
  assert.equal(m.settings.zeroDay, 3);
});

test('backupStatus', () => {
  assert.deepEqual(T.backupStatus({ settings: { lastBackup: null } }, '2026-10-12'), { days: null, overdue: true });
  assert.deepEqual(T.backupStatus({ settings: { lastBackup: '2026-10-04' } }, '2026-10-12'), { days: 8, overdue: true });
  assert.deepEqual(T.backupStatus({ settings: { lastBackup: '2026-10-05' } }, '2026-10-12'), { days: 7, overdue: false });
});
