import test from 'node:test';
import assert from 'node:assert/strict';
import { El, all, texts, fire, byText, byLabel, hasClass } from './fakedom.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout, addExercise, editWorkout } from '../src/core/workouts.js';
import { begin } from '../src/views/gymWorkoutLogic.js';
import { renderWorkout, resetWorkoutView, pickExercise } from '../src/views/gymWorkout.js';

// Gym G9, the active workout screen. Same fake-DOM shims as tests/gym-views.test.js.
El.prototype.replaceChildren = function replaceChildren(...cs) { this.children = []; this.append(...cs); };
Object.defineProperty(El.prototype, 'classList', {
  configurable: true,
  get() {
    return {
      add: c => { this.className = `${this.className} ${c}`.trim(); },
      toggle: (c, on) => {
        const has = this.className.split(/\s+/).includes(c);
        const want = on === undefined ? !has : on;
        const rest = this.className.split(/\s+/).filter(x => x && x !== c);
        this.className = (want ? [...rest, c] : rest).join(' ');
      },
    };
  },
});

const T = new Date(2026, 9, 12, 10, 0, 0).getTime(); // Monday 12 October 2026, 10:00 local
const DAY = 86_400_000;
const set = (reps, weight, extra = {}) => ({ reps, weight, warmup: false, done: true, ...extra });
const HIST = { id: 'h1', date: '2026-10-10', startedAt: T - 2 * DAY, finishedAt: T - 2 * DAY + 3_600_000, name: '', routineId: null,
  items: [{ exerciseId: 'bench', sets: [set(10, 40, { warmup: true }), set(8, 80), set(8, 80), set(7, 77.5)] }] };
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'row', name: 'Bent Over Row', equipment: 'barbell', muscle: 'middle back', category: 'strength' },
  ],
  muscles: ['chest', 'middle back', 'other'], equipment: ['barbell', 'other'],
};
// Last time bench was 80 x 8, 80 x 8, 77.5 x 7; the open workout starts with those three rows, nothing done.
const openGym = (exercises = ['bench']) => {
  let g = { ...emptyGym(), workouts: [HIST] };
  const id = begin(g, T).id;
  g = begin(g, T).state;
  for (const e of exercises) g = addExercise(g, id, e).state;
  return g;
};

let asked = null;
function fresh() { resetWorkoutView(); asked = null; document.activeElement = null; }
const mkApp = gym => {
  const a = { gym, saves: 0, navs: [], redirects: [], today: () => '2026-10-12', nav: p => a.navs.push(p), redirect: p => a.redirects.push(p),
    setGym(fn) { const n = fn(a.gym); if (n === a.gym) return true; a.gym = n; a.saves++; return true; } };
  return a;
};
const screen = (app, opts = {}) => renderWorkout(app, { data: DATA, load() {}, confirm: (items, o) => { asked = { items, o }; }, ...opts });
const cur = app => openWorkout(app.gym);
const setOf = (app, ii, si) => cur(app).items[ii].sets[si];
const click = el => fire(el, 'click');

// ---- frame ----
test('no open workout: redirect to Gym home, nothing drawn', () => {
  fresh();
  const app = mkApp(emptyGym());
  assert.deepEqual(screen(app), []);
  assert.deepEqual(app.redirects, ['#gym']);
});

test('header: back button, default title Workout, Finish and Discard (G9c: no clock)', () => {
  fresh();
  const app = mkApp(openGym());
  const out = screen(app);
  assert.ok(byLabel(out, 'Back'));
  assert.ok(texts(out).includes('Workout'));
  assert.equal(texts(out).includes('Elapsed'), false);
  assert.ok(byText(out, 'button', 'Finish'));
  assert.ok(byText(out, 'button', 'Discard'));
});

test('header: a named workout shows its name; an old open workout says which day it started', () => {
  fresh();
  let g = openGym();
  g = editWorkout(g, openWorkout(g).id, { name: 'Pull day' }).state;
  assert.ok(texts(screen(mkApp(g))).includes('Pull day'));
  assert.equal(texts(screen(mkApp(g))).some(t => t.startsWith('Started')), false);
  const old = editWorkout(g, openWorkout(g).id, { date: '2026-10-09' }).state;
  assert.ok(texts(screen(mkApp(old))).includes('Started Friday 9 October'));
});

test('empty workout: a designed empty line and the Add exercise link to the picker', () => {
  fresh();
  const out = screen(mkApp(openGym([])));
  assert.ok(texts(out).includes('No exercises yet. Add one to start.'));
  const add = all(out).find(n => n.tagName === 'A');
  assert.equal(add.getAttribute('href'), '#gym/pick');
  assert.equal(add.textContent, 'Add exercise');
});

// ---- cards ----
test('card: exercise name, last time\'s sets, one row per prefilled set; no history says so', () => {
  fresh();
  const out = screen(mkApp(openGym(['bench', 'row'])));
  const t = texts(out);
  assert.ok(t.includes('Barbell Bench Press') && t.includes('Bent Over Row'));
  assert.ok(t.includes('Last time: 80 × 8 · 80 × 8 · 77.5 × 7'));
  assert.ok(t.includes('No history yet'));
  assert.equal(all(out).filter(n => hasClass(n, 'gw-set')).length, 3 + 1);
});

test('card: an id missing from the list reads Unknown exercise; while the list loads it reads Loading and load runs', () => {
  fresh();
  let g = openGym([]);
  g = addExercise(g, openWorkout(g).id, 'gone').state;
  assert.ok(texts(screen(mkApp(g))).includes('Unknown exercise'));
  let loaded = 0;
  const out = screen(mkApp(g), { data: null, load: () => { loaded++; } });
  assert.ok(texts(out).includes('Loading…'));
  assert.equal(loaded, 1);
});

test('set row: prefilled weight and reps, labelled controls, done not pressed', () => {
  fresh();
  const out = screen(mkApp(openGym()));
  assert.equal(byLabel(out, 'Set 1 weight (kg)').getAttribute('value'), '80');
  assert.equal(byLabel(out, 'Set 3 weight (kg)').getAttribute('value'), '77.5');
  assert.equal(byLabel(out, 'Set 3 reps').getAttribute('value'), '7');
  assert.equal(byLabel(out, 'Set 1 weight (kg)').getAttribute('inputmode'), 'decimal');
  assert.equal(byLabel(out, 'Set 1 reps').getAttribute('inputmode'), 'numeric');
  const done = byLabel(out, 'Set 1 done');
  assert.equal(done.getAttribute('aria-pressed'), 'false');
  assert.equal(all([done]).some(n => n.tagName === 'SVG'), false);
});

// ---- logging ----
test('one tap on the done check logs a prefilled set; values stay, the check mark appears', () => {
  fresh();
  const app = mkApp(openGym());
  click(byLabel(screen(app), 'Set 1 done'));
  assert.deepEqual(setOf(app, 0, 0), { reps: 8, weight: 80, warmup: false, done: true });
  assert.equal(app.saves, 1);
  const done = byLabel(screen(app), 'Set 1 done');
  assert.equal(done.getAttribute('aria-pressed'), 'true');
  assert.equal(all([done]).some(n => n.tagName === 'SVG'), true);
  click(done);
  assert.equal(setOf(app, 0, 0).done, false);
});

test('warm-up toggle flips the flag and shows its state without colour', () => {
  fresh();
  const app = mkApp(openGym());
  const btn = byLabel(screen(app), 'Set 2 warm-up');
  assert.equal(btn.textContent, 'Warm-up');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
  click(btn);
  assert.equal(setOf(app, 0, 1).warmup, true);
  assert.equal(byLabel(screen(app), 'Set 2 warm-up').getAttribute('aria-pressed'), 'true');
});

test('steppers: weight moves 2.5 kg, reps move 1, in the stored workout', () => {
  fresh();
  const app = mkApp(openGym());
  click(byLabel(screen(app), 'Set 1 weight up'));
  assert.equal(setOf(app, 0, 0).weight, 82.5);
  click(byLabel(screen(app), 'Set 1 weight down'));
  click(byLabel(screen(app), 'Set 1 weight down'));
  assert.equal(setOf(app, 0, 0).weight, 77.5);
  click(byLabel(screen(app), 'Set 1 reps up'));
  assert.equal(setOf(app, 0, 0).reps, 9);
  click(byLabel(screen(app), 'Set 1 reps down'));
  click(byLabel(screen(app), 'Set 1 reps down'));
  assert.equal(setOf(app, 0, 0).reps, 7);
});

test('steppers stop at the limits: a disabled button at 1 rep and at 0 kg', () => {
  fresh();
  let g = openGym();
  const id = openWorkout(g).id;
  g = { ...g, workouts: g.workouts.map(w => (w.id === id ? { ...w, items: [{ exerciseId: 'bench', sets: [{ reps: 1, weight: 0, warmup: false, done: false }] }] } : w)) };
  const out = screen(mkApp(g));
  assert.notEqual(byLabel(out, 'Set 1 reps down').getAttribute('disabled'), null);
  assert.notEqual(byLabel(out, 'Set 1 weight down').getAttribute('disabled'), null);
  assert.equal(byLabel(out, 'Set 1 reps up').getAttribute('disabled'), null);
});

test('typing a weight with a comma or point saves it on every valid keystroke; no re-render is needed', () => {
  fresh();
  const app = mkApp(openGym());
  const input = byLabel(screen(app), 'Set 1 weight (kg)');
  input.value = '82,5';
  fire(input, 'input');
  assert.equal(setOf(app, 0, 0).weight, 82.5);
  input.value = '85';
  fire(input, 'input');
  assert.equal(setOf(app, 0, 0).weight, 85);
});

test('typing something invalid or half typed changes nothing; leaving the field puts the stored value back', () => {
  fresh();
  const app = mkApp(openGym());
  const w = byLabel(screen(app), 'Set 1 weight (kg)');
  const r = byLabel(screen(app), 'Set 1 reps');
  for (const bad of ['', '80.', 'abc', '1001', '-5']) { w.value = bad; fire(w, 'input'); }
  r.value = '0'; fire(r, 'input');
  r.value = '8.5'; fire(r, 'input');
  assert.equal(app.saves, 0);
  assert.equal(setOf(app, 0, 0).weight, 80);
  fire(w, 'blur');
  fire(r, 'blur');
  assert.equal(w.value, '80');
  assert.equal(r.value, '8');
  r.value = '12'; fire(r, 'input');
  assert.equal(setOf(app, 0, 0).reps, 12);
});

test('a tap on any button first blurs a focused input (iOS keeps focus, and the 30 s guard would skip the repaint)', () => {
  fresh();
  const app = mkApp(openGym());
  const out = screen(app);
  let blurred = 0;
  document.activeElement = Object.assign(new El('input'), { blur() { blurred++; document.activeElement = null; } });
  click(byLabel(out, 'Set 1 done'));
  assert.equal(blurred, 1);
  assert.equal(setOf(app, 0, 0).done, true);
  document.activeElement = null;
});

// ---- sets and exercises ----
test('Add set appends a row (reps 1, weight 0, ruling 10); Remove set drops one', () => {
  fresh();
  const app = mkApp(openGym());
  click(byText(screen(app), 'button', 'Add set'));
  assert.equal(cur(app).items[0].sets.length, 4);
  assert.deepEqual(setOf(app, 0, 3), { reps: 1, weight: 0, warmup: false, done: false });
  click(byLabel(screen(app), 'Remove set 1'));
  assert.equal(cur(app).items[0].sets.length, 3);
});

test('Remove exercise asks first (destructive), then drops the card', () => {
  fresh();
  const app = mkApp(openGym(['bench', 'row']));
  click(byLabel(screen(app), 'Remove Bent Over Row'));
  assert.equal(cur(app).items.length, 2);
  assert.equal(asked.items[0].label, 'Remove exercise');
  assert.equal(asked.items[0].destructive, true);
  assert.match(asked.o.message, /Bent Over Row/);
  asked.items[0].onSelect();
  assert.deepEqual(cur(app).items.map(i => i.exerciseId), ['bench']);
});

test('pickExercise adds the exercise with last time\'s values and then goes back', () => {
  fresh();
  const app = mkApp(openGym([]));
  let back = 0;
  pickExercise(app, 'bench', () => { back++; });
  assert.deepEqual(cur(app).items.map(i => i.exerciseId), ['bench']);
  assert.deepEqual(cur(app).items[0].sets.map(s => [s.reps, s.weight, s.done]), [[8, 80, false], [8, 80, false], [7, 77.5, false]]);
  assert.equal(back, 1);
});

test('pickExercise with no open workout changes nothing and still goes back', () => {
  fresh();
  const app = mkApp(emptyGym());
  let back = 0;
  pickExercise(app, 'bench', () => { back++; });
  assert.equal(app.saves, 0);
  assert.equal(back, 1);
});

// ---- finish and discard ----
test('Finish without a done working set is refused with a message; the workout stays open', () => {
  fresh();
  const app = mkApp(openGym());
  const out = screen(app);
  click(byText(out, 'button', 'Finish'));
  assert.ok(cur(app));
  assert.deepEqual(app.navs, []);
  const msg = all(out).find(n => n.getAttribute('role') === 'alert');
  assert.equal(msg.textContent, 'Mark at least one working set done to finish.');
});

test('Finish with a done working set closes the workout, goes to Gym home (G9c: the length field decides finishedAt, see gym-g9c)', () => {
  fresh();
  const app = mkApp(openGym());
  click(byLabel(screen(app), 'Set 1 done'));
  click(byText(screen(app), 'button', 'Finish'));
  assert.equal(cur(app), null);
  const w = app.gym.workouts.find(x => x.id !== 'h1');
  assert.equal(w.finishedAt, w.startedAt + 3_600_000);
  assert.deepEqual(app.navs, ['#gym']);
});

test('Discard asks first (destructive); confirming deletes the workout and goes to Gym home', () => {
  fresh();
  const app = mkApp(openGym());
  click(byText(screen(app), 'button', 'Discard'));
  assert.ok(cur(app));
  assert.equal(asked.items[0].label, 'Discard workout');
  assert.equal(asked.items[0].destructive, true);
  asked.items[0].onSelect();
  assert.equal(cur(app), null);
  assert.equal(app.gym.workouts.length, 1);
  assert.deepEqual(app.navs, ['#gym']);
});
