import test from 'node:test';
import assert from 'node:assert/strict';
import { El, all, fire, byText, byLabel } from './fakedom.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout, addExercise } from '../src/core/workouts.js';
import { begin, markBlank, dropBlankSet, dropBlankItem } from '../src/views/gymWorkoutLogic.js';
import { renderWorkout, resetWorkoutView, pickExercise } from '../src/views/gymWorkout.js';

// Gym set entry, ruling C (owner, 2026-10-27), view-only: a new set shows empty fields with a grey placeholder and its
// Done check stays disabled until reps and weight are typed. Stored values (reps 1, weight 0) are unchanged.
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

// ---- logic ----
test('markBlank / dropBlankSet / dropBlankItem keep the keys following the rows', () => {
  let b = markBlank(markBlank(new Set(), 0, 2), 1, 0);
  assert.deepEqual([...b].sort(), ['0/2/reps', '0/2/weight', '1/0/reps', '1/0/weight']);
  b = dropBlankSet(b, 0, 0);
  assert.deepEqual([...b].sort(), ['0/1/reps', '0/1/weight', '1/0/reps', '1/0/weight']);
  b = dropBlankSet(b, 0, 1);
  assert.deepEqual([...b].sort(), ['1/0/reps', '1/0/weight']);
  assert.deepEqual([...dropBlankItem(b, 0)].sort(), ['0/0/reps', '0/0/weight']);
});

// ---- view ----
test('a new set starts with empty fields and a placeholder; the stored set is unchanged', () => {
  fresh();
  const app = withNewSet();
  const out = screen(app);
  assert.equal(val(out, 'Set 3 reps'), '');
  assert.equal(val(out, 'Set 3 weight (kg)'), '');
  assert.equal(byLabel(out, 'Set 3 reps').getAttribute('placeholder'), '1');
  assert.deepEqual(cur(app).items[0].sets[2], { reps: 1, weight: 0, warmup: false, done: false });
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

test('the empty state survives a repaint and follows its row when an earlier set is removed', () => {
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
