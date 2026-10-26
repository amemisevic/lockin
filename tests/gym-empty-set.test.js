import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { El, all, fire, byText, byLabel } from './fakedom.js';
import { emptyGym, loadGym, saveGym } from '../src/core/gym.js';
import { openWorkout, addExercise } from '../src/core/workouts.js';
import { begin } from '../src/views/gymWorkoutLogic.js';
import { renderWorkout, resetWorkoutView, pickExercise, BLANK_SETS } from '../src/views/gymWorkout.js';

// Gym set entry, true empty sets (owner, 2026-10-27): a new set stores reps and weight as null, so it shows empty fields with a
// grey placeholder after a repaint or a reload, and its Done check stays disabled until reps and weight are typed.
El.prototype.replaceChildren = function replaceChildren(...cs) { this.children = []; this.append(...cs); };

const T = new Date(2026, 9, 12, 10, 0, 0).getTime();
const set = (reps, weight) => ({ reps, weight, warmup: false, done: true });
const HIST = { id: 'h1', date: '2026-10-10', startedAt: T - 86_400_000, finishedAt: T - 86_400_000 + 3_600_000, name: '', routineId: null,
  items: [{ exerciseId: 'bench', sets: [set(8, 80), set(8, 80)] }] };
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'row', name: 'Bent Over Row', equipment: 'barbell', muscle: 'middle back', category: 'strength' },
  ],
  muscles: ['chest', 'middle back', 'other'], equipment: ['barbell', 'other'],
};
const openGym = () => { const g = { ...emptyGym(), workouts: [HIST] }; const r = begin(g, T); return addExercise(r.state, r.id, 'bench').state; };
const mkApp = gym => {
  const a = { gym, today: () => '2026-10-12', nav() {}, redirect() {},
    setGym(fn) { const n = fn(a.gym); if (n !== a.gym) a.gym = n; return true; } };
  return a;
};
const screen = app => renderWorkout(app, { data: DATA, load() {}, confirm() {} });
const cur = app => openWorkout(app.gym);
const click = el => fire(el, 'click');
const type = (el, v) => { el.value = v; fire(el, 'input'); };
const val = (out, label) => byLabel(out, label).getAttribute('value');
const fresh = () => { resetWorkoutView(); document.activeElement = null; };
const withNewSet = () => { const app = mkApp(openGym()); click(byText(screen(app), 'button', 'Add set')); return app; };

// ---- view ----
test('a new set starts with empty fields and a placeholder; the stored set is unchanged', () => {
  fresh();
  const app = withNewSet();
  const out = screen(app);
  assert.equal(val(out, 'Set 3 reps'), '');
  assert.equal(val(out, 'Set 3 weight (kg)'), '');
  assert.equal(byLabel(out, 'Set 3 reps').getAttribute('placeholder'), '1');
  assert.deepEqual(cur(app).items[0].sets[2], { reps: null, weight: null, warmup: false, done: false });
});

test('prefilled sets keep their values and an enabled Done', () => {
  fresh();
  const out = screen(withNewSet());
  assert.equal(val(out, 'Set 1 reps'), '8');
  assert.equal(val(out, 'Set 1 weight (kg)'), '80');
  assert.equal(byLabel(out, 'Set 1 reps').getAttribute('placeholder'), null);
  assert.equal(byLabel(out, 'Set 1 done').getAttribute('disabled'), null);
});

test('an empty set is not logged: Done is disabled and a tap does nothing', () => {
  fresh();
  const app = withNewSet();
  const done = byLabel(screen(app), 'Set 3 done');
  assert.notEqual(done.getAttribute('disabled'), null);
  click(done);
  assert.equal(cur(app).items[0].sets[2].done, false);
});

test('typing a number in both fields enables Done and logs the set', () => {
  fresh();
  const app = withNewSet();
  const out = screen(app);
  type(byLabel(out, 'Set 3 reps'), '10');
  assert.notEqual(byLabel(out, 'Set 3 done').getAttribute('disabled'), null);
  type(byLabel(out, 'Set 3 weight (kg)'), '60');
  assert.equal(byLabel(out, 'Set 3 done').getAttribute('disabled'), null);
  assert.deepEqual(cur(app).items[0].sets[2], { reps: 10, weight: 60, warmup: false, done: false });
  const again = screen(app);
  assert.equal(val(again, 'Set 3 reps'), '10');
  click(byLabel(again, 'Set 3 done'));
  assert.equal(cur(app).items[0].sets[2].done, true);
});

test('typing one field keeps Done disabled and stores the other as null', () => {
  fresh();
  const app = withNewSet();
  const out = screen(app);
  type(byLabel(out, 'Set 3 weight (kg)'), '60');
  assert.notEqual(byLabel(out, 'Set 3 done').getAttribute('disabled'), null);
  assert.deepEqual(cur(app).items[0].sets[2], { reps: null, weight: 60, warmup: false, done: false });
  assert.equal(val(screen(app), 'Set 3 reps'), '');
});

test('the empty state survives a reload', () => {
  fresh();
  const st = new Map();
  const storage = { getItem: k => st.get(k) ?? null, setItem: (k, v) => st.set(k, String(v)) };
  assert.equal(saveGym(storage, withNewSet().gym).ok, true);
  const app = mkApp(loadGym(storage).state);
  fresh();
  const out = screen(app);
  assert.equal(val(out, 'Set 3 reps'), '');
  assert.equal(byLabel(out, 'Set 3 reps').getAttribute('placeholder'), '1');
  assert.notEqual(byLabel(out, 'Set 3 done').getAttribute('disabled'), null);
});

test('a step on an empty field enters its placeholder value', () => {
  fresh();
  const app = withNewSet();
  click(byLabel(screen(app), 'Set 3 reps up'));
  assert.deepEqual(cur(app).items[0].sets[2], { reps: 1, weight: null, warmup: false, done: false });
  assert.equal(val(screen(app), 'Set 3 reps'), '1');
});

test('Finish is blocked with a message while a set is blank, and the workout stays open', () => {
  fresh();
  const app = withNewSet();
  app.nav = to => { app.went = to; };
  const out = screen(app);
  click(byText(out, 'button', 'Finish'));
  assert.ok(all(out).some(n => n.textContent === BLANK_SETS), 'message shown');
  assert.equal(app.went, undefined);
  assert.notEqual(cur(app), null);
});

test('the empty state follows its row when an earlier set is removed', () => {
  fresh();
  const app = withNewSet();
  screen(app);
  click(byLabel(screen(app), 'Remove set 1'));
  const out = screen(app);
  assert.equal(val(out, 'Set 2 reps'), '');
  assert.notEqual(byLabel(out, 'Set 2 done').getAttribute('disabled'), null);
  assert.equal(val(out, 'Set 1 reps'), '8');
});

test('an exercise with no history starts empty; one with history keeps its prefill', () => {
  fresh();
  const app = mkApp(openGym());
  pickExercise(app, 'row', () => {});
  const out = screen(app);
  assert.equal(val(out, 'Set 1 reps'), '8');
  assert.equal(val(out, 'Set 1 weight (kg)'), '80');
  assert.deepEqual(cur(app).items[1].sets, [{ reps: null, weight: null, warmup: false, done: false }]);
  const rowSet = all(out).filter(n => n.getAttribute('aria-label') === 'Set 1 reps');
  assert.equal(rowSet.length, 2);
  assert.equal(rowSet[1].getAttribute('value'), '');
  assert.equal(rowSet[1].getAttribute('placeholder'), '1');
});

test('inputs stay numeric / decimal', () => {
  fresh();
  const out = screen(withNewSet());
  assert.equal(byLabel(out, 'Set 3 reps').getAttribute('inputmode'), 'numeric');
  assert.equal(byLabel(out, 'Set 3 weight (kg)').getAttribute('inputmode'), 'decimal');
});

// Ruling C, focus: a focused empty field shows nothing (the placeholder comes back on blur, because the attribute stays).
test('the placeholder is hidden while a set field is focused', () => {
  const css = readFileSync(new URL('../src/gym.css', import.meta.url), 'utf8');
  assert.match(css, /\.gw-in:focus::placeholder\s*\{[^}]*color:\s*transparent/);
});
