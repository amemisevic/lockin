import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGym, validateGym, loadGym, saveGym, GYM_KEY, GYM_CORRUPT, WEEKLY_TARGET, weeklyTarget, setWeeklyTarget, setWeeklyTargetOn } from '../src/core/gym.js';
import { defaultState } from '../src/core/model.js';
import { exportJson, validateImport } from '../src/core/store.js';

// G13: the gym weekly target has a number (1 to 7) and an on/off switch, both stored in gym.settings (weeklyTarget, weeklyTargetOn).
// Absent weeklyTargetOn (data written before G13) means on. Off keeps the number, so switching back on restores it.
// weeklyTarget(gym) is what every screen reads: the number, or null when off. Invented data only.
const GYM_BAD = "The backup's gym data is damaged.";
const gym = settings => ({ ...emptyGym(), settings });
const mem = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } }; };
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

test('defaults: target 4 and on; the bounds are 1 to 7', () => {
  assert.deepEqual(emptyGym().settings, { weeklyTarget: 4, weeklyTargetOn: true });
  assert.equal(weeklyTarget(emptyGym()), 4);
  assert.deepEqual(WEEKLY_TARGET, { min: 1, max: 7 });
});

test('weeklyTarget: the number when on or when the switch is missing (old data), null when off', () => {
  assert.equal(weeklyTarget(gym({ weeklyTarget: 3, weeklyTargetOn: true })), 3);
  assert.equal(weeklyTarget(gym({ weeklyTarget: 3 })), 3);
  assert.equal(weeklyTarget(gym({ weeklyTarget: 3, weeklyTargetOn: false })), null);
  assert.equal(weeklyTarget(undefined), 4);
  assert.equal(weeklyTarget({}), 4);
});

test('validateGym: the switch is a boolean or absent; anything else is a settings problem', () => {
  for (const weeklyTargetOn of [true, false, undefined]) assert.deepEqual(validateGym(gym({ weeklyTarget: 4, weeklyTargetOn })), { ok: true });
  assert.deepEqual(validateGym(gym({ weeklyTarget: 4 })), { ok: true });
  for (const weeklyTargetOn of ['yes', 'false', 1, 0, null, {}, []]) {
    assert.deepEqual(validateGym(gym({ weeklyTarget: 4, weeklyTargetOn })), { ok: false, reason: 'settings' }, String(weeklyTargetOn));
  }
});

test('validateGym: the number is still checked while the switch is off', () => {
  for (const weeklyTarget of [1, 7]) assert.deepEqual(validateGym(gym({ weeklyTarget, weeklyTargetOn: false })), { ok: true });
  for (const weeklyTarget of [0, 8, 4.5, '4', NaN, null, undefined, -1]) {
    assert.deepEqual(validateGym(gym({ weeklyTarget, weeklyTargetOn: false })), { ok: false, reason: 'settings' }, String(weeklyTarget));
  }
});

test('setWeeklyTarget: 1 to 7 are stored, anything else returns the same object, the input is never changed', () => {
  const g = deepFreeze(emptyGym());
  for (const n of [1, 2, 3, 5, 6, 7]) {
    const r = setWeeklyTarget(g, n);
    assert.equal(r.settings.weeklyTarget, n);
    assert.deepEqual(validateGym(r), { ok: true });
  }
  for (const n of [0, 8, 4.5, '5', NaN, Infinity, null, undefined, -1, [], {}]) assert.equal(setWeeklyTarget(g, n), g, String(n));
  assert.equal(setWeeklyTarget(g, 4), g); // unchanged value: same object, so nothing is saved
});

test('setWeeklyTargetOn: true and false are stored, anything else returns the same object', () => {
  const g = deepFreeze(emptyGym());
  const off = setWeeklyTargetOn(g, false);
  assert.equal(off.settings.weeklyTargetOn, false);
  assert.equal(weeklyTarget(off), null);
  assert.equal(setWeeklyTargetOn(off, false), off);
  assert.equal(weeklyTarget(setWeeklyTargetOn(off, true)), 4);
  for (const v of ['false', 0, 1, null, undefined, {}]) assert.equal(setWeeklyTargetOn(g, v), g, String(v));
});

test('old data without the switch: setting it on writes the flag, off keeps the number, on again restores it', () => {
  const old = deepFreeze(gym({ weeklyTarget: 3 }));
  const off = setWeeklyTargetOn(old, false);
  assert.deepEqual(off.settings, { weeklyTarget: 3, weeklyTargetOn: false });
  assert.deepEqual(setWeeklyTargetOn(off, true).settings, { weeklyTarget: 3, weeklyTargetOn: true });
  assert.equal(setWeeklyTarget(off, 6).settings.weeklyTargetOn, false); // changing the number does not switch it on
});

test('setters keep everything else in the gym state', () => {
  const g = { ...emptyGym(), customExercises: [{ id: 'c1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' }], extra: { a: 1 } };
  const r = setWeeklyTargetOn(setWeeklyTarget(g, 2), false);
  assert.deepEqual({ ...r, settings: null }, { ...g, settings: null });
  assert.equal(r.customExercises, g.customExercises);
});

test('save then load keeps the switch (off) and the number; the text holds both keys', () => {
  const st = mem(), g = gym({ weeklyTarget: 5, weeklyTargetOn: false });
  assert.deepEqual(saveGym(st, g), { ok: true });
  assert.match(st.getItem(GYM_KEY), /"weeklyTarget":5,"weeklyTargetOn":false/);
  assert.deepEqual(loadGym(st), { state: g, corrupt: false });
});

test('load: data written before G13 (no switch) loads as it is and reads as on', () => {
  const st = mem(), old = gym({ weeklyTarget: 3 });
  st.setItem(GYM_KEY, JSON.stringify(old));
  const r = loadGym(st);
  assert.deepEqual(r, { state: old, corrupt: false });
  assert.equal(weeklyTarget(r.state), 3);
});

test('corrupt path: a bad switch keeps a copy under the corrupt key, loads an empty gym with the flag, leaves the main text alone', () => {
  for (const weeklyTargetOn of ['no', 1, null]) {
    const st = mem(), raw = JSON.stringify(gym({ weeklyTarget: 4, weeklyTargetOn }));
    st.setItem(GYM_KEY, raw);
    assert.deepEqual(loadGym(st), { state: emptyGym(), corrupt: true }, String(weeklyTargetOn));
    assert.equal(st.getItem(GYM_CORRUPT), raw);
    assert.equal(st.getItem(GYM_KEY), raw);
  }
});

test('saveGym refuses a bad switch or number and writes nothing', () => {
  for (const settings of [{ weeklyTarget: 4, weeklyTargetOn: 'x' }, { weeklyTarget: 9, weeklyTargetOn: true }, { weeklyTarget: 4, weeklyTargetOn: null }]) {
    const st = mem();
    assert.deepEqual(saveGym(st, gym(settings)), { ok: false, reason: 'settings' });
    assert.equal(st.m.size, 0);
  }
});

// ---- export and import ----
const v2 = () => ({ ...defaultState(), settings: { ...defaultState().settings, lastBackup: '2026-10-01' } });

test('export carries the new settings: a fresh gym has both keys, an off target is written as false', () => {
  assert.deepEqual(JSON.parse(exportJson(v2(), emptyGym())).gym.settings, { weeklyTarget: 4, weeklyTargetOn: true });
  const off = JSON.parse(exportJson(v2(), gym({ weeklyTarget: 6, weeklyTargetOn: false })));
  assert.deepEqual(off.gym.settings, { weeklyTarget: 6, weeklyTargetOn: false });
});

test('import round trip: number and switch come back as they were, on and off', () => {
  for (const settings of [{ weeklyTarget: 6, weeklyTargetOn: false }, { weeklyTarget: 1, weeklyTargetOn: true }]) {
    const r = validateImport(exportJson(v2(), gym(settings)));
    assert.equal(r.ok, true);
    assert.deepEqual(r.gym.settings, settings);
    assert.equal(weeklyTarget(r.gym), settings.weeklyTargetOn ? settings.weeklyTarget : null);
  }
});

test('old backup: a gym section without the switch imports and reads as on with its own number', () => {
  const r = validateImport(JSON.stringify({ ...v2(), gym: gym({ weeklyTarget: 3 }) }));
  assert.equal(r.ok, true);
  assert.equal(weeklyTarget(r.gym), 3);
});

test('old backup: a file with no gym section still imports and carries no gym (the app then keeps its gym settings)', () => {
  const r = validateImport(exportJson(v2()));
  assert.equal(r.ok, true);
  assert.equal('gym' in r, false);
});

test('import refuses a bad switch or number in the gym section, as a damaged gym section', () => {
  for (const settings of [{ weeklyTarget: 4, weeklyTargetOn: 'yes' }, { weeklyTarget: 4, weeklyTargetOn: null }, { weeklyTarget: 4, weeklyTargetOn: 1 }, { weeklyTarget: 0, weeklyTargetOn: false }, { weeklyTargetOn: true }]) {
    assert.deepEqual(validateImport(JSON.stringify({ ...v2(), gym: gym(settings) })), { ok: false, error: GYM_BAD }, JSON.stringify(settings));
  }
});
