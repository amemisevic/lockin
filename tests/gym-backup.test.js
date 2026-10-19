import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/core/model.js';
import { emptyGym } from '../src/core/gym.js';
import { exportJson, validateImport, markBackup, backupStatus } from '../src/core/store.js';

// Invented sample data only. Format: the v2 state object plus one extra top-level key `gym` (the whole gym state).
const GYM_BAD = "The backup's gym data is damaged.";
const V1 = 'This is a Lock In v1 backup. v2 cannot import it.';
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const wk = (o = {}) => ({ id: 'w1', date: '2026-10-12', startedAt: 1000, finishedAt: 2000, name: 'Session A', routineId: null,
  items: [{ exerciseId: 'bench-press', sets: [set(), set({ reps: 7, weight: 77.5 })] }], ...o });
const gym = () => ({
  ...emptyGym(),
  settings: { weeklyTarget: 3 },
  customExercises: [{ id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' }],
  routines: [{ id: 'r1', name: 'Routine A', createdAt: 500, items: [{ exerciseId: 'bench-press', sets: [{ reps: 8, weight: 80 }] }] }],
  workouts: [wk(), wk({ id: 'w2', date: '2026-10-13', startedAt: 3000, finishedAt: null, items: [{ exerciseId: 'squat', sets: [set({ done: false })] }] })],
});
const v2 = () => ({ ...defaultState(), settings: { ...defaultState().settings, lastBackup: '2026-10-01' } });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const refused = (text, error) => assert.deepEqual(validateImport(text), { ok: false, error });
const withGym = g => JSON.stringify({ ...v2(), gym: g });

test('exportJson without gym is the old file: no gym key', () => {
  assert.equal(exportJson(v2()), JSON.stringify(v2(), null, 2));
  assert.equal('gym' in JSON.parse(exportJson(v2())), false);
});

test('exportJson with gym adds exactly one top-level key, v2 keys unchanged', () => {
  const file = JSON.parse(exportJson(v2(), gym()));
  assert.deepEqual(file.gym, gym());
  const { gym: _g, ...rest } = file;
  assert.deepEqual(rest, v2());
});

test('round trip: state and gym come back equal, gym is not left inside state', () => {
  const s = v2(), g = gym();
  deepFreeze(s); deepFreeze(g);
  const r = validateImport(exportJson(s, g));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, v2());
  assert.equal('gym' in r.state, false);
  assert.deepEqual(r.gym, gym());
});

test('round trip with an empty gym', () => {
  const r = validateImport(exportJson(v2(), emptyGym()));
  assert.equal(r.ok, true);
  assert.deepEqual(r.gym, emptyGym());
});

test('v2-only file (no gym section): imports, and the result carries no gym so the caller leaves gym data alone', () => {
  const r = validateImport(exportJson(v2()));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, v2());
  assert.equal('gym' in r, false);
});

test('bad gym section: whole import refused, no state, no gym in the result', () => {
  const badWorkout = gym(); badWorkout.workouts[0].items[0].sets[0].reps = 0;
  const dup = gym(); dup.workouts[1].id = 'w1';
  const twoOpen = gym(); twoOpen.workouts[0].finishedAt = null;
  const target = gym(); target.settings.weeklyTarget = 9;
  const old = gym(); old.v = 2;
  for (const g of [null, [], 'x', 5, {}, { v: 1 }, badWorkout, dup, twoOpen, target, old]) {
    const r = validateImport(withGym(g));
    assert.deepEqual(r, { ok: false, error: GYM_BAD }, JSON.stringify(g));
  }
});

test('v2 problem wins over gym problem (checked first)', () => {
  const text = JSON.stringify({ ...v2(), tasks: [{ id: 'x' }], gym: null });
  const r = validateImport(text);
  assert.equal(r.ok, false);
  assert.notEqual(r.error, GYM_BAD);
});

test('v1 file is still refused, with or without a gym section', () => {
  refused(JSON.stringify({ v: 1, goals: [] }), V1);
  refused(JSON.stringify({ v: 1, goals: [], gym: gym() }), V1);
});

test('non-string, empty and broken input still behave as before', () => {
  for (const x of [undefined, null, 5, {}, [], '', '  ']) refused(x, 'The file is empty.');
  refused('{nope', 'The file is not valid JSON. Choose a Lock In backup file.');
  refused(JSON.stringify({ v: 3, gym: gym() }), 'This is not a Lock In v2 backup.');
});

test('extra keys are kept: top level of the file, and inside the gym section', () => {
  const g = gym(); g.future = { a: 1 }; g.workouts[0].extra = true; g.settings.extra = 'x';
  const r = validateImport(JSON.stringify({ ...v2(), futureKey: [1, 2], gym: g }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, { ...v2(), futureKey: [1, 2] });
  assert.deepEqual(r.gym, g);
});

test('a __proto__ key inside the gym JSON is plain data and pollutes nothing', () => {
  const text = exportJson(v2(), gym()).replace('"v": 1,', '"v": 1,\n    "__proto__": { "polluted": 1 },');
  assert.ok(text.includes('"__proto__"'));
  const r = validateImport(text);
  assert.equal(r.ok, true);
  assert.equal({}.polluted, undefined);
  assert.equal(r.state.polluted, undefined);
  assert.equal(Object.hasOwn(r.gym, '__proto__'), true);
});

test('a workout id of "__proto__" or "toString" is an ordinary id', () => {
  const g = gym(); g.workouts[0].id = '__proto__'; g.workouts[1].id = 'toString';
  const r = validateImport(exportJson(v2(), g));
  assert.equal(r.ok, true);
  assert.deepEqual(r.gym.workouts.map(w => w.id), ['__proto__', 'toString']);
});

test('one backup made today covers both: the stamp and the gym data are in the same file', () => {
  const today = '2026-10-20';
  const file = exportJson(markBackup(v2(), today), gym());
  const r = validateImport(file);
  assert.equal(r.state.settings.lastBackup, today);
  assert.deepEqual(r.gym, gym());
  assert.deepEqual(backupStatus(r.state, today), { days: 0, overdue: false });
});
