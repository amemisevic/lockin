import test from 'node:test';
import assert from 'node:assert/strict';
import './fakedom.js';
import { exportBackup, importBackupFile } from '../src/views/settings.js';
import { runExport, applyImport } from '../src/views/settingsLogic.js';
import { defaultState } from '../src/core/model.js';
import { emptyGym, GYM_KEY } from '../src/core/gym.js';
import { KEY, save, validateImport, exportJson } from '../src/core/store.js';
import { saveGym } from '../src/core/gym.js';

// Gym G7, owner ruling 17: export passes gym to exportJson; import writes gym first and aborts on failure;
// if the v2 write then fails, the previous gym TEXT is restored. Invented sample data only.
// The fake app mirrors app.js: set/setGym keep the new value in memory, write through save/saveGym, record saveFailed.
const TODAY = '2026-10-14';
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const wk = (id, date) => ({ id, date, startedAt: 1000, finishedAt: 2000, name: 'Session', routineId: null, items: [{ exerciseId: 'bench-press', sets: [set()] }] });
const gymA = () => ({ ...emptyGym(), workouts: [wk('w1', '2026-10-12')] });
const gymB = () => ({ ...emptyGym(), settings: { weeklyTarget: 2 }, workouts: [wk('x1', '2026-10-05'), wk('x2', '2026-10-06')] });
const v2A = () => ({ ...defaultState(), settings: { ...defaultState().settings, medPerWeek: 1 } });
const v2B = () => ({ ...defaultState(), settings: { ...defaultState().settings, medPerWeek: 3 } });

function mkStorage() {
  const m = new Map();
  return {
    m, fail: new Set(),
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) { if (this.fail.has(k)) throw new Error('quota'); m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
}
function mkApp(storage, state, gym) {
  return {
    storage, state, gym, saveFailed: false, today: () => TODAY,
    set(fn) { const n = fn(this.state); if (n === this.state) return; this.state = n; this.saveFailed = !save(storage, n); },
    setGym(fn) { const n = fn(this.gym); if (n === this.gym) return true; this.gym = n; const ok = saveGym(storage, n).ok; this.saveFailed = !ok; return ok; },
  };
}
// A stored gym text that is NOT what JSON.stringify(gym) gives, so only a raw restore passes byte-identity.
const prettyA = () => JSON.stringify(gymA(), null, 2);
function setup({ gymText = prettyA(), failKeys = [] } = {}) {
  const st = mkStorage();
  save(st, v2A());
  if (gymText !== null) st.m.set(GYM_KEY, gymText);
  const app = mkApp(st, v2A(), gymText === null ? emptyGym() : gymA());
  st.fail = new Set(failKeys);
  return { st, app };
}
const imp = (state, gym) => { const r = validateImport(exportJson(state, gym)); assert.equal(r.ok, true); return r; };

test('runExport: a 4th argument adds the gym section; without it the file is the old v2 file', async () => {
  const files = [];
  const io = { makeFile: (name, text) => { files.push(text); return { name }; }, canShare: () => false, share: async () => {}, download: () => {} };
  await runExport(v2A(), TODAY, io, gymA());
  await runExport(v2A(), TODAY, io);
  assert.deepEqual(JSON.parse(files[0]).gym, gymA());
  assert.equal(JSON.parse(files[0]).settings.lastBackup, TODAY);
  assert.equal('gym' in JSON.parse(files[1]), false);
});

test('exportBackup writes the app gym into the file and stamps lastBackup in v2 only', async () => {
  const { app } = setup();
  const files = [];
  const io = { makeFile: (name, text) => { files.push(text); return { name }; }, canShare: () => false, share: async () => {}, download: () => {} };
  await exportBackup(app, io);
  assert.deepEqual(JSON.parse(files[0]).gym, gymA());
  assert.equal(app.state.settings.lastBackup, TODAY);
});

test('import ok: gym is written, then v2; lockin.v2 never holds a gym key; memory follows', () => {
  const { st, app } = setup();
  assert.equal(applyImport(app, imp(v2B(), gymB())), true);
  assert.deepEqual(JSON.parse(st.m.get(GYM_KEY)), gymB());
  assert.equal(JSON.parse(st.m.get(KEY)).settings.medPerWeek, 3);
  assert.equal('gym' in JSON.parse(st.m.get(KEY)), false);
  assert.deepEqual(app.gym, gymB());
  assert.equal(app.saveFailed, false);
});

test('import of a file with no gym section: v2 replaced, gym text and memory untouched (ruling 3)', () => {
  const { st, app } = setup();
  const before = st.m.get(GYM_KEY);
  assert.equal(applyImport(app, imp(v2B())), true);
  assert.equal(st.m.get(GYM_KEY), before);
  assert.deepEqual(app.gym, gymA());
  assert.equal(app.state.settings.medPerWeek, 3);
});

test('gym write fails: import aborts, v2 and gym text byte-identical, memory unchanged, nothing else written', () => {
  const { st, app } = setup({ failKeys: [GYM_KEY] });
  const v2Before = st.m.get(KEY), gymBefore = st.m.get(GYM_KEY), stateBefore = app.state, keys = [...st.m.keys()];
  assert.equal(applyImport(app, imp(v2B(), gymB())), false);
  assert.equal(st.m.get(KEY), v2Before);
  assert.equal(st.m.get(GYM_KEY), gymBefore);
  assert.deepEqual([...st.m.keys()], keys);
  assert.equal(app.state, stateBefore);
  assert.deepEqual(app.gym, gymA());
});

test('v2 write fails after the gym write: the previous gym TEXT is restored byte for byte, v2 text unchanged', () => {
  const { st, app } = setup({ failKeys: [KEY] });
  const v2Before = st.m.get(KEY), gymBefore = st.m.get(GYM_KEY);
  assert.notEqual(gymBefore, JSON.stringify(gymA())); // the fixture really is non-canonical text
  assert.equal(applyImport(app, imp(v2B(), gymB())), false);
  assert.equal(st.m.get(GYM_KEY), gymBefore);
  assert.equal(st.m.get(KEY), v2Before);
  assert.deepEqual(app.gym, gymA());
  assert.equal(app.state.settings.medPerWeek, 1);
});

test('v2 write fails and there was no gym key before: the key is removed again', () => {
  const { st, app } = setup({ gymText: null, failKeys: [KEY] });
  assert.equal(st.m.has(GYM_KEY), false);
  assert.equal(applyImport(app, imp(v2B(), gymB())), false);
  assert.equal(st.m.has(GYM_KEY), false);
  assert.deepEqual(app.gym, emptyGym());
});

test('v2 write fails with a corrupt gym text on file: that exact text comes back', () => {
  const { st, app } = setup({ gymText: '{not json', failKeys: [KEY] });
  app.gym = emptyGym(); // what loadGym gives for a corrupt text
  assert.equal(applyImport(app, imp(v2B(), gymB())), false);
  assert.equal(st.m.get(GYM_KEY), '{not json');
});

test('importBackupFile: a failed write shows a refusal and changes nothing; success writes both', async () => {
  const bad = setup({ failKeys: [GYM_KEY] });
  const asks = [];
  const file = text => ({ text: async () => text });
  await importBackupFile(bad.app, file(exportJson(v2B(), gymB())), (title, onYes) => { asks.push(title); onYes(); });
  assert.equal(asks.length, 1);
  assert.equal(bad.st.m.get(GYM_KEY), prettyA());
  assert.equal(bad.app.state.settings.medPerWeek, 1);

  const good = setup();
  await importBackupFile(good.app, file(exportJson(v2B(), gymB())), (title, onYes) => onYes());
  assert.deepEqual(JSON.parse(good.st.m.get(GYM_KEY)), gymB());
  assert.equal(good.app.state.settings.medPerWeek, 3);
});
