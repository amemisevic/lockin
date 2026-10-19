import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../src/core/gym.js';

// Invented sample data only. Expected values are written by hand from the plan (Data model, validateGym rules, Load path).
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const item = (sets = [set()], exerciseId = 'bench-press') => ({ exerciseId, sets });
const wk = (o = {}) => ({ id: 'w1', date: '2026-10-12', startedAt: 1000, finishedAt: 2000, name: 'Session A', routineId: null, items: [item()], ...o });
const routine = (o = {}) => ({ id: 'r1', name: 'Routine A', createdAt: 500, items: [{ exerciseId: 'bench-press', sets: [{ reps: 8, weight: 80 }] }], ...o });
const custom = (o = {}) => ({ id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable', ...o });
const gym = (o = {}) => ({ ...G.emptyGym(), ...o });
const withSet = o => gym({ workouts: [wk({ items: [item([set(o)])] })] });
const withTemplate = o => gym({ routines: [routine({ items: [{ exerciseId: 'bench-press', sets: [{ reps: 8, weight: 80, ...o }] }] })] });
const ok = { ok: true };
const no = reason => ({ ok: false, reason });
const check = (obj, expected) => assert.deepEqual(G.validateGym(obj), expected, JSON.stringify(obj));
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const spy = () => { const st = mem(); const writes = []; return { ...st, writes, setItem: (k, v) => { writes.push(k); st.setItem(k, v); } }; };
const boom = () => { throw new Error('QuotaExceededError'); };

// A state that uses every field.
const full = () => gym({
  settings: { weeklyTarget: 3 },
  customExercises: [custom(), custom({ id: 'custom-2', name: 'Sled Push', muscle: 'quadriceps', equipment: 'other' })],
  routines: [routine(), routine({ id: 'r2', name: 'Routine B', items: [] })],
  workouts: [
    wk({ items: [item([set({ warmup: true, weight: 40 }), set(), set({ reps: 7, weight: 77.5 })]), item([set({ weight: 0 })], 'gone-from-dataset')] }),
    wk({ id: 'w2', date: '2026-10-13', startedAt: 3000, finishedAt: null, name: '', routineId: 'r1', items: [item([set({ done: false })])] }),
  ],
});

// ---------- shape, constants ----------
test('keys are separate from the main state', () => {
  assert.equal(G.GYM_KEY, 'lockin.v2.gym');
  assert.equal(G.GYM_CORRUPT, 'lockin.v2.gym.corrupt');
});

test('emptyGym is the plan shape, valid, and a fresh object each call', () => {
  assert.deepEqual(G.emptyGym(), { v: 1, settings: { weeklyTarget: 4 }, customExercises: [], routines: [], workouts: [] });
  check(G.emptyGym(), ok);
  assert.notEqual(G.emptyGym(), G.emptyGym());
  assert.notEqual(G.emptyGym().workouts, G.emptyGym().workouts);
});

test('the full sample state is valid', () => check(full(), ok));

// ---------- validateGym: one pass and one fail per rule ----------
test('not an object', () => {
  for (const x of [null, undefined, [], 'x', 5, true]) check(x, no('shape'));
});

test('v must be 1', () => {
  check(gym({ v: 1 }), ok);
  for (const v of [2, 0, '1', null, undefined]) check(gym({ v }), no('version'));
});

test('settings.weeklyTarget is an integer 1 to 7', () => {
  for (const weeklyTarget of [1, 4, 7]) check(gym({ settings: { weeklyTarget } }), ok);
  for (const weeklyTarget of [0, 8, 4.5, '4', NaN, null, undefined, -1]) check(gym({ settings: { weeklyTarget } }), no('settings'));
  for (const settings of [null, [], 4, undefined]) check(gym({ settings }), no('settings'));
});

test('every collection is an array', () => {
  for (const key of ['customExercises', 'routines', 'workouts']) {
    for (const bad of [{}, null, undefined, 'x', 0]) check(gym({ [key]: bad }), no('collection'));
  }
});

test('ids are non-empty strings, unique within their collection', () => {
  const make = { customExercises: custom, routines: routine, workouts: wk };
  for (const [key, fn] of Object.entries(make)) {
    check(gym({ [key]: [fn({ id: 'a' }), fn({ id: 'b' })] }), ok);
    for (const id of ['', 5, null, undefined]) check(gym({ [key]: [fn({ id })] }), no('id'));
    check(gym({ [key]: [fn({ id: 'a' }), fn({ id: 'a' })] }), no('duplicate-id'));
  }
  check(gym({ customExercises: [custom({ id: 'x' })], routines: [routine({ id: 'x' })], workouts: [wk({ id: 'x' })] }), ok); // same id in different collections is fine
});

test('inherited-key ids are plain ids: valid, and duplicates still caught', () => {
  for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf']) {
    check(gym({ customExercises: [custom({ id })], routines: [routine({ id })], workouts: [wk({ id, routineId: id, items: [item([set()], id)] })] }), ok);
    check(gym({ workouts: [wk({ id }), wk({ id })] }), no('duplicate-id'));
    check(gym({ workouts: [wk({ id }), wk({ id: 'other' })] }), ok);
  }
});

test('reps is an integer from 1 to 999', () => {
  for (const reps of [1, 8, 999]) { check(withSet({ reps }), ok); check(withTemplate({ reps }), ok); }
  for (const reps of [0, 1000, 1.5, -1, '8', NaN, Infinity, null, undefined]) { check(withSet({ reps }), no('reps')); check(withTemplate({ reps }), no('reps')); }
});

test('weight is a finite number from 0 to 1000', () => {
  for (const weight of [0, 77.5, 1000]) { check(withSet({ weight }), ok); check(withTemplate({ weight }), ok); }
  for (const weight of [-1, -0.5, 1000.5, NaN, Infinity, -Infinity, '80', null, undefined]) { check(withSet({ weight }), no('weight')); check(withTemplate({ weight }), no('weight')); }
});

test('date is a real calendar date', () => {
  for (const date of ['2026-02-28', '2028-02-29', '2026-12-31', '2026-10-12']) check(gym({ workouts: [wk({ date })] }), ok);
  for (const date of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-10-32', '2026-10-00', '2026-2-3', '2026-10-9', '26-10-09', '2026/10/09', 20261009, null, undefined, '']) {
    check(gym({ workouts: [wk({ date })] }), no('date'));
  }
});

test('finishedAt is null or a number at least startedAt', () => {
  for (const finishedAt of [null, 1000, 1001, 99999.5]) check(gym({ workouts: [wk({ finishedAt })] }), ok);
  for (const finishedAt of [999, -1, '2000', NaN, Infinity, undefined]) check(gym({ workouts: [wk({ finishedAt })] }), no('finish-time'));
  for (const startedAt of ['1000', NaN, null, undefined, Infinity]) check(gym({ workouts: [wk({ startedAt, finishedAt: null })] }), no('shape'));
});

test('at most one workout is open', () => {
  const open = o => wk({ finishedAt: null, ...o });
  check(gym({ workouts: [wk({ id: 'a' }), wk({ id: 'b' })] }), ok); // none open
  check(gym({ workouts: [wk({ id: 'a' }), open({ id: 'b' }), wk({ id: 'c' })] }), ok); // one open
  check(gym({ workouts: [open({ id: 'a' }), open({ id: 'b' })] }), no('open-workouts'));
  check(gym({ workouts: [open({ id: 'a' }), wk({ id: 'b' }), open({ id: 'c' })] }), no('open-workouts'));
});

test('a finished workout needs a done, non-warm-up set', () => {
  const finished = sets => gym({ workouts: [wk({ items: [item(sets)] })] });
  check(finished([set()]), ok);
  check(finished([set({ warmup: true }), set()]), ok);
  check(finished([set({ done: false }), set()]), ok);
  check(finished([set({ warmup: true })]), no('no-sets')); // done warm-up only
  check(finished([set({ done: false })]), no('no-sets')); // working set not done
  check(finished([set({ warmup: true, done: false })]), no('no-sets'));
  check(finished([]), no('no-sets'));
  check(gym({ workouts: [wk({ items: [] })] }), no('no-sets'));
  // the same contents are fine while the workout is open
  check(gym({ workouts: [wk({ finishedAt: null, items: [item([set({ warmup: true })])] })] }), ok);
  check(gym({ workouts: [wk({ finishedAt: null, items: [] })] }), ok);
});

test('an exercise id that is not in the bundled list is valid; an empty or non-string one is not', () => {
  check(gym({ workouts: [wk({ items: [item([set()], 'no-such-exercise')] })] }), ok);
  check(gym({ routines: [routine({ items: [{ exerciseId: 'no-such-exercise', sets: [] }] })] }), ok);
  for (const exerciseId of ['', 5, null, undefined]) {
    check(gym({ workouts: [wk({ items: [{ exerciseId, sets: [set()] }] })] }), no('id')); // not item(): its default would swallow undefined
    check(gym({ routines: [routine({ items: [{ exerciseId, sets: [] }] })] }), no('id'));
  }
});

test('other fields have the right type', () => {
  check(gym({ workouts: [wk({ routineId: 'gone' })] }), ok); // a deleted routine is not invalid
  check(gym({ routines: [routine({ createdAt: 'x' })] }), no('shape'));
  for (const bad of [5, undefined, {}]) check(gym({ workouts: [wk({ routineId: bad })] }), no('shape'));
  for (const name of [5, null, undefined]) {
    check(gym({ workouts: [wk({ name })] }), no('shape'));
    check(gym({ routines: [routine({ name })] }), no('shape'));
    check(gym({ customExercises: [custom({ name })] }), no('shape'));
  }
  for (const key of ['muscle', 'equipment']) check(gym({ customExercises: [custom({ [key]: 5 })] }), no('shape'));
  for (const bad of ['yes', 1, null, undefined]) { check(withSet({ warmup: bad }), no('shape')); check(withSet({ done: bad }), no('shape')); }
  check(gym({ workouts: [wk({ items: {} })] }), no('shape'));
  check(gym({ workouts: [wk({ items: [item({})] })] }), no('shape'));
  check(gym({ workouts: [wk({ items: [null] })] }), no('shape'));
  check(gym({ workouts: [wk({ items: [item([null])] })] }), no('shape'));
  check(gym({ workouts: [null] }), no('shape'));
  check(gym({ routines: [routine({ items: [{ exerciseId: 'a', sets: [null] }] })] }), no('shape'));
});

test('unknown keys are accepted; validate does not change or throw on its input', () => {
  const g = deepFreeze({ ...full(), future: { a: 1 }, workouts: [{ ...wk(), note: 'extra' }] });
  check(g, ok);
  check(deepFreeze(gym({ workouts: [wk({ items: [item([set({ reps: 0 })])] })] })), no('reps'));
});

// ---------- loadGym ----------
test('nothing stored: empty state, no corrupt flag, nothing written', () => {
  const st = spy();
  assert.deepEqual(G.loadGym(st), { state: G.emptyGym(), corrupt: false });
  assert.deepEqual(st.writes, []);
});

test('saveGym then loadGym round-trips, unknown keys included', () => {
  const st = mem();
  const g = { ...full(), future: { a: [1, 2] } };
  assert.deepEqual(G.saveGym(st, g), ok);
  assert.equal(st.getItem(G.GYM_KEY), JSON.stringify(g));
  assert.deepEqual(G.loadGym(st), { state: g, corrupt: false });
});

test('loading text with __proto__ and constructor keys does not pollute or fail', () => {
  const st = mem();
  const raw = '{"v":1,"settings":{"weeklyTarget":4},"customExercises":[],"routines":[],"workouts":[],"__proto__":{"polluted":true},"constructor":{"x":1}}';
  st.setItem(G.GYM_KEY, raw);
  const r = G.loadGym(st);
  assert.equal(r.corrupt, false);
  assert.equal({}.polluted, undefined);
  assert.equal(r.state.workouts.length, 0);
});

test('corrupt text: empty state, flag set, copy kept, main key left as it was', () => {
  const bad = ['{not json', '', '{"v":2}', 'null', '[]', '"x"', '7',
    JSON.stringify(gym({ workouts: [wk({ date: '2026-02-30' })] })),
    JSON.stringify(withSet({ reps: 0 })),
    JSON.stringify({ ...gym(), workouts: undefined }),
    JSON.stringify(gym({ workouts: [wk({ finishedAt: null, id: 'a' }), wk({ finishedAt: null, id: 'b' })] }))];
  for (const raw of bad) {
    const st = mem(); st.setItem(G.GYM_KEY, raw);
    assert.deepEqual(G.loadGym(st), { state: G.emptyGym(), corrupt: true }, raw);
    assert.equal(st.getItem(G.GYM_CORRUPT), raw);
    assert.equal(st.getItem(G.GYM_KEY), raw);
  }
});

test('the corrupt copy survives a later save', () => {
  const st = mem(); st.setItem(G.GYM_KEY, '{not json');
  G.loadGym(st);
  assert.deepEqual(G.saveGym(st, full()), ok);
  assert.equal(st.getItem(G.GYM_CORRUPT), '{not json');
  assert.deepEqual(G.loadGym(st), { state: full(), corrupt: false });
});

test('storage that throws never makes loadGym throw', () => {
  assert.deepEqual(G.loadGym({ getItem: boom, setItem: boom }), { state: G.emptyGym(), corrupt: false });
  const st = { getItem: () => '{not json', setItem: boom }; // cannot keep a copy, still empty and flagged
  assert.deepEqual(G.loadGym(st), { state: G.emptyGym(), corrupt: true });
});

test('every load returns a fresh empty state', () => {
  const a = G.loadGym(mem()).state, b = G.loadGym(mem()).state;
  assert.notEqual(a, b);
  a.workouts.push(wk());
  assert.deepEqual(b.workouts, []);
});

// ---------- saveGym ----------
test('saveGym refuses invalid state with the validate code and writes nothing', () => {
  const st = spy();
  const bad = withSet({ reps: 0 });
  const before = JSON.stringify(bad);
  assert.deepEqual(G.saveGym(st, bad), no('reps'));
  assert.deepEqual(G.saveGym(st, null), no('shape'));
  assert.deepEqual(st.writes, []);
  assert.equal(JSON.stringify(bad), before);
});

test('saveGym returns "storage" when the write fails, and never throws', () => {
  assert.deepEqual(G.saveGym({ getItem: () => null, setItem: boom }, full()), no('storage'));
  const cyclic = { ...full() }; cyclic.self = cyclic; // unknown key that cannot be serialised
  assert.deepEqual(G.saveGym(mem(), cyclic), no('storage'));
});

test('gym load and save touch only the two gym keys', () => {
  const st = spy();
  st.setItem('lockin.v2', 'MAIN'); st.setItem('lockin.v2.corrupt', 'OLD');
  st.writes.length = 0;
  st.setItem(G.GYM_KEY, '{not json'); G.loadGym(st); G.saveGym(st, full()); G.loadGym(st);
  assert.ok(st.writes.every(k => k === G.GYM_KEY || k === G.GYM_CORRUPT), st.writes.join());
  assert.equal(st.getItem('lockin.v2'), 'MAIN');
  assert.equal(st.getItem('lockin.v2.corrupt'), 'OLD');
});

// ---------- source guards ----------
test('gym.js is pure: no DOM, no storage global, no forbidden date APIs', () => {
  const src = readFileSync(new URL('../src/core/gym.js', import.meta.url), 'utf8');
  assert.ok(!/\b(document|window|localStorage|location|navigator)\b/.test(src));
  assert.ok(!/toISOString|getUTC|Date\.parse|new Date\(\s*['"`]/.test(src));
});
