import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byText, byLabel, hasClass } from './fakedom.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout, addExercise, editWorkout } from '../src/core/workouts.js';
import { begin, parseMinutes, parseName, finishTime, DEFAULT_MINUTES, NAME_MAX } from '../src/views/gymWorkoutLogic.js';
import { renderWorkout, resetWorkoutView } from '../src/views/gymWorkout.js';
import { openNameSheet } from '../src/views/gymNameSheet.js';
import { recentWorkouts } from '../src/views/gymHomeLogic.js';

// Gym G9c: no live timers on the workout screen; Finish takes a length in minutes; the name is asked at Start and
// editable on the workout screen. Expected values by hand.
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

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = new Date(2026, 9, 12, 10, 0, 0).getTime(); // Monday 12 October 2026, 10:00 local
const MIN = 60_000;
const set = (reps, weight, extra = {}) => ({ reps, weight, warmup: false, done: true, ...extra });
const DATA = { exercises: [{ id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' }], muscles: ['chest', 'other'], equipment: ['barbell', 'other'] };
const openGym = (name = '') => {
  const r = begin(emptyGym(), T, { name });
  return addExercise(r.state, r.id, 'bench').state;
};
const mkApp = gym => {
  const a = { gym, saves: 0, navs: [], redirects: [], today: () => '2026-10-12', nav: p => a.navs.push(p), redirect: p => a.redirects.push(p),
    setGym(fn) { const n = fn(a.gym); if (n === a.gym) return true; a.gym = n; a.saves++; return true; } };
  return a;
};
const screen = app => renderWorkout(app, { data: DATA, load() {}, confirm() {} });
const cur = app => openWorkout(app.gym);
const click = el => fire(el, 'click');
const type = (el, value) => { el.value = value; fire(el, 'input'); };
const doneFirst = app => click(byLabel(screen(app), 'Set 1 done'));
const alertText = out => all(out).filter(n => n.getAttribute('role') === 'alert').map(n => n.textContent).join('|');

// ---- logic ----
test('constants: default length 60 minutes, name limit 60', () => {
  assert.equal(DEFAULT_MINUTES, 60);
  assert.equal(NAME_MAX, 60);
});

test('parseMinutes: whole minutes 1 to 600; anything else is null', () => {
  const ok = { '60': 60, ' 1 ': 1, '600': 600, '045': 45, '90': 90 };
  for (const [text, v] of Object.entries(ok)) assert.equal(parseMinutes(text), v, text);
  for (const bad of ['', ' ', '0', '601', '1000', '1.5', '60,5', '-5', 'x', '1e2', null, undefined, 60]) assert.equal(parseMinutes(bad), null, String(bad));
});

test('parseName: trimmed, blank allowed, 60 UTF-16 units at most; non-strings are null', () => {
  assert.equal(parseName(''), '');
  assert.equal(parseName('   '), '');
  assert.equal(parseName(' Push day '), 'Push day');
  assert.equal(parseName('x'.repeat(60)), 'x'.repeat(60));
  assert.equal(parseName(`  ${'x'.repeat(60)}  `), 'x'.repeat(60));
  assert.equal(parseName('x'.repeat(61)), null);
  for (const bad of [null, undefined, 5, {}]) assert.equal(parseName(bad), null);
});

test('finishTime: startedAt plus the minutes, in ms', () => {
  assert.equal(finishTime(1000, 90), 1000 + 5_400_000);
  assert.equal(finishTime(T, 1), T + 60_000);
});

test('begin with a name: the workout carries it; default empty; Repeat ignores it', () => {
  assert.equal(openWorkout(begin(emptyGym(), T, { name: 'Push day' }).state).name, 'Push day');
  assert.equal(openWorkout(begin(emptyGym(), T).state).name, '');
  const hist = { id: 'h1', date: '2026-10-10', startedAt: T - 1e8, finishedAt: T - 1e8 + 3_600_000, name: '', routineId: null, items: [{ exerciseId: 'bench', sets: [set(8, 80)] }] };
  const r = begin({ ...emptyGym(), workouts: [hist] }, T, { repeat: true, name: 'Ignored' });
  assert.equal(openWorkout(r.state).name, '');
});

test('recentWorkouts: the summary ends with the length in whole minutes once it is a minute or more', () => {
  const w = (ms, id = 'a') => ({ id, date: '2026-10-05', startedAt: 1000, finishedAt: 1000 + ms, name: '', routineId: null,
    items: [{ exerciseId: 'bench', sets: [set(8, 80)] }] });
  const sum = ms => recentWorkouts({ ...emptyGym(), workouts: [w(ms)] })[0].summary;
  assert.equal(sum(60 * MIN), '1 exercise · 1 set · 60 min');
  assert.equal(sum(90 * MIN), '1 exercise · 1 set · 90 min');
  assert.equal(sum(MIN), '1 exercise · 1 set · 1 min');
  assert.equal(sum(90_000), '1 exercise · 1 set · 2 min');
  assert.equal(sum(29_999), '1 exercise · 1 set');
  assert.equal(sum(1), '1 exercise · 1 set');
  assert.equal(sum(600 * MIN), '1 exercise · 1 set · 600 min');
});

// ---- name sheet ----
const sheetOf = onDone => {
  let opts = null;
  openNameSheet(onDone, o => { opts = o; return { actionButton: {} }; });
  return opts;
};

test('name sheet: titled Start workout, a 60-character optional name field', () => {
  const o = sheetOf(() => {});
  assert.equal(o.title, 'Start workout');
  assert.equal(o.action, 'Start');
  const input = all([o.content]).find(n => n.tagName === 'INPUT');
  assert.equal(input.getAttribute('maxlength'), '60');
  assert.equal(input.getAttribute('aria-label'), 'Workout name (optional)');
});

test('name sheet: blank starts unnamed, a name is passed trimmed', () => {
  const got = [];
  const o = sheetOf(n => got.push(n));
  const input = all([o.content]).find(n => n.tagName === 'INPUT');
  assert.notEqual(o.onAction(), false);
  type(input, '  Push day ');
  assert.notEqual(o.onAction(), false);
  assert.deepEqual(got, ['', 'Push day']);
});

test('name sheet: 61 characters keeps the sheet open with a message and starts nothing', () => {
  const got = [];
  const o = sheetOf(n => got.push(n));
  const input = all([o.content]).find(n => n.tagName === 'INPUT');
  type(input, 'x'.repeat(61));
  assert.equal(o.onAction(), false);
  assert.deepEqual(got, []);
  assert.ok(texts([o.content]).includes('Name must be 60 characters or fewer.'));
});

// ---- rename on the workout screen ----
test('workout screen: a name field shows the current name; a blank name shows Workout in the header', () => {
  const out = screen(mkApp(openGym('Push day')));
  assert.equal(byLabel(out, 'Workout name').getAttribute('value'), 'Push day');
  assert.ok(texts(out).includes('Push day'));
  const blank = screen(mkApp(openGym()));
  assert.equal(byLabel(blank, 'Workout name').getAttribute('value'), '');
  assert.equal(byLabel(blank, 'Workout name').getAttribute('maxlength'), '60');
  assert.ok(texts(blank).includes('Workout'));
});

test('rename: every valid keystroke saves through editWorkout, trimmed, and the header follows', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  const out = screen(app);
  const input = byLabel(out, 'Workout name');
  type(input, 'Leg ');
  assert.equal(cur(app).name, 'Leg');
  type(input, 'Leg day');
  assert.equal(cur(app).name, 'Leg day');
  assert.ok(texts(out).includes('Leg day'));
  type(input, '');
  assert.equal(cur(app).name, '');
  assert.ok(texts(out).includes('Workout'));
});

test('rename: 61 characters changes nothing and says why; sets are untouched', () => {
  resetWorkoutView();
  const app = mkApp(openGym('Push day'));
  const out = screen(app);
  const before = app.saves;
  type(byLabel(out, 'Workout name'), 'x'.repeat(61));
  assert.equal(app.saves, before);
  assert.equal(cur(app).name, 'Push day');
  assert.equal(alertText(out).includes('Name must be 60 characters or fewer.'), true);
  assert.equal(cur(app).items.length, 1);
});

// ---- finish with a length ----
test('Workout length field: labelled, numeric, default 60', () => {
  resetWorkoutView();
  const out = screen(mkApp(openGym()));
  const f = byLabel(out, 'Workout length (minutes)');
  assert.equal(f.getAttribute('value'), '60');
  assert.equal(f.getAttribute('inputmode'), 'numeric');
  assert.ok(texts(out).includes('Workout length (minutes)'));
});

test('Finish: finishedAt = startedAt + minutes; the default is 60', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  const id = cur(app).id;
  doneFirst(app);
  click(byText(screen(app), 'button', 'Finish'));
  const w = app.gym.workouts.find(x => x.id === id);
  assert.equal(w.finishedAt, T + 60 * MIN);
  assert.deepEqual(app.navs, ['#gym']);
});

test('Finish with 90 typed: finishedAt = startedAt + 5 400 000', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  const id = cur(app).id;
  doneFirst(app);
  const out = screen(app);
  type(byLabel(out, 'Workout length (minutes)'), '90');
  click(byText(out, 'button', 'Finish'));
  assert.equal(app.gym.workouts.find(x => x.id === id).finishedAt, T + 5_400_000);
});

test('Finish with a bad length is refused with a message; the workout stays open', () => {
  for (const bad of ['', '0', '601', '1.5', 'abc', '-3']) {
    resetWorkoutView();
    const app = mkApp(openGym());
    doneFirst(app);
    const out = screen(app);
    type(byLabel(out, 'Workout length (minutes)'), bad);
    click(byText(out, 'button', 'Finish'));
    assert.ok(cur(app), bad);
    assert.deepEqual(app.navs, [], bad);
    assert.equal(alertText(out), 'Enter whole minutes, 1 to 600.', bad);
  }
});

test('Finish: a good length with no done working set still says so', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  const out = screen(app);
  click(byText(out, 'button', 'Finish'));
  assert.ok(cur(app));
  assert.equal(alertText(out), 'Mark at least one working set done to finish.');
});

test('the typed length survives a repaint (logging a set must not reset it to 60)', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  type(byLabel(screen(app), 'Workout length (minutes)'), '45');
  click(byLabel(screen(app), 'Set 1 done'));
  assert.equal(byLabel(screen(app), 'Workout length (minutes)').getAttribute('value'), '45');
});

test('after a finish the next workout starts with 60 again', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  doneFirst(app);
  const out = screen(app);
  type(byLabel(out, 'Workout length (minutes)'), '45');
  click(byText(out, 'button', 'Finish'));
  assert.equal(byLabel(screen(mkApp(openGym())), 'Workout length (minutes)').getAttribute('value'), '60');
});

// ---- no live timers, no rest ----
test('the workout screen has no clock, no rest bar, no rest length picker', () => {
  resetWorkoutView();
  const app = mkApp(openGym());
  doneFirst(app);
  const out = screen(app);
  const classes = all(out).map(n => n.className).join(' ');
  assert.doesNotMatch(classes, /gw-clock|gw-rest|gw-rt/);
  assert.equal(texts(out).some(t => /\brest\b|elapsed|skip rest|dismiss/i.test(t)), false);
  assert.equal(byLabel(out, 'Rest length'), undefined);
  assert.equal(all(out).some(n => n.getAttribute('role') === 'timer'), false);
});

test('source: no timer, clock or rest code left in the workout views, the CSS or the logic', () => {
  for (const f of ['src/views/gymWorkout.js', 'src/views/gymWorkoutLogic.js', 'src/views/gymNameSheet.js']) {
    assert.doesNotMatch(read(f), /setInterval|setTimeout|requestAnimationFrame|Date\.now|fmtClock|elapsedSec|restState|REST_CHOICES|DEFAULT_REST|rest\.end/, f);
  }
  assert.doesNotMatch(read('src/gym.css'), /gw-rest|gw-clock|gw-rt|gw-bar/);
});

test('old open workout still shows the day it started', () => {
  resetWorkoutView();
  let g = openGym();
  g = editWorkout(g, openWorkout(g).id, { date: '2026-10-09' }).state;
  assert.ok(texts(screen(mkApp(g))).includes('Started Friday 9 October'));
  assert.ok(all(screen(mkApp(g))).every(n => !hasClass(n, 'gw-clock')));
});
