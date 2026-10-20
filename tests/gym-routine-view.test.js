import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byText, byLabel, hasClass } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout } from '../src/core/workouts.js';
import { renderGymHome } from '../src/views/gymHome.js';
import { renderRoutine, pickRoutineExercise } from '../src/views/gymRoutine.js';
import { openNameSheet } from '../src/views/gymNameSheet.js';

// Gym G10 routine screens (the sheets are <dialog>s, checked in the browser pane). Expected values by hand.
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
const T = new Date(2026, 9, 12, 10, 0, 0).getTime();
const set = (reps, weight) => ({ reps, weight });
const DATA = { exercises: [
  { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
  { id: 'row', name: 'Barbell Row', equipment: 'barbell', muscle: 'back', category: 'strength' },
  { id: 'squat', name: 'Squat', equipment: 'barbell', muscle: 'quadriceps', category: 'strength' },
], muscles: ['chest', 'other'], equipment: ['barbell', 'other'] };
const routine = (id, name, items) => ({ id, name, createdAt: 1, items });
const BENCH = { exerciseId: 'bench', sets: [set(8, 80), set(8, 80), set(7, 77.5)] };
const ROW = { exerciseId: 'row', sets: [set(10, 50)] };
const g = (routines, workouts = []) => ({ ...emptyGym(), routines, workouts });
const mkApp = gym => {
  const a = { gym, saves: 0, navs: [], redirects: [], gymCorrupt: false, today: () => '2026-10-12', nav: p => a.navs.push(p), redirect: p => a.redirects.push(p),
    setGym(fn) { const n = fn(a.gym); if (n === a.gym) return true; a.gym = n; a.saves++; return true; } };
  return a;
};
const click = el => fire(el, 'click');
const type = (el, value) => { el.value = value; fire(el, 'input'); };
const dis = el => el.getAttribute('disabled') !== null;
const alertText = out => all(out).filter(n => n.getAttribute('role') === 'alert').map(n => n.textContent).join('|');
const stored = (app, id = 'r-1') => app.gym.routines.find(r => r.id === id);

// Records what the sheets would show; `answer` is what the user types or picks.
const harness = (answer = {}) => {
  const log = { confirms: [], asks: [] };
  return { log, opts: {
    data: DATA, load() {}, now: () => T,
    confirm: (items, o) => { log.confirms.push({ items, o }); if (answer.confirm) items[0].onSelect(); },
    askName: (onDone, placeholder) => { log.asks.push(placeholder); if (answer.name !== undefined) onDone(answer.name); },
  } };
};
const screen = (app, id = 'r-1', h = harness()) => renderRoutine(app, id, h.opts);

// ---- router ----
test('router: #gym/routine/<id> and #gym/routine/<id>/pick are pushed screens under Gym; look-alikes fall to Today', () => {
  assert.deepEqual(parseRoute('#gym/routine/r-1'), { name: 'gym', params: ['routine', 'r-1'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/routine/r-1/'), { name: 'gym', params: ['routine', 'r-1'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/routine/r-1/pick'), { name: 'gym', params: ['routine', 'r-1', 'pick'], tab: 'gym', pushed: true });
  for (const bad of ['#gym/routine', '#gym/routine/', '#gym/routine/r-1/x', '#gym/routine/r-1/pick/y', '#gym/Routine/r-1']) assert.equal(parseRoute(bad).name, 'today', bad);
});

// ---- name sheet options ----
const sheetOf = (onDone, opts) => {
  let o = null;
  openNameSheet(onDone, x => { o = x; return { actionButton: {} }; }, opts);
  return o;
};

test('name sheet: default stays Start workout; options give New routine with a required name', () => {
  const d = sheetOf(() => {});
  assert.equal(d.title, 'Start workout');
  const got = [];
  const o = sheetOf(n => got.push(n), { title: 'New routine', action: 'Create', required: true, label: 'Name' });
  assert.equal(o.title, 'New routine');
  assert.equal(o.action, 'Create');
  const input = all([o.content]).find(n => n.tagName === 'INPUT');
  assert.equal(input.getAttribute('maxlength'), '60');
  assert.equal(o.onAction(), false); // blank is refused
  assert.match(texts([o.content]).join('|'), /Name must be 1 to 60 characters\./);
  type(input, '  Pull day ');
  assert.notEqual(o.onAction(), false);
  assert.deepEqual(got, ['Pull day']);
});

test('name sheet: a placeholder option shows the routine name; blank is still allowed there', () => {
  const got = [];
  const o = sheetOf(n => got.push(n), { placeholder: 'Push' });
  const input = all([o.content]).find(n => n.tagName === 'INPUT');
  assert.equal(input.getAttribute('placeholder'), 'Push');
  assert.notEqual(o.onAction(), false);
  assert.deepEqual(got, ['']);
});

// ---- home ----
const home = (gym, extra = {}) => { const app = mkApp(gym); return { app, out: renderGymHome(app, { load() {}, now: () => T, ...extra }) }; };

test('home: every routine row is a link to its routine, showing name and exercise count', () => {
  const { out } = home(g([routine('r-1', 'Push', [BENCH, ROW]), routine('r-2', 'Legs', [ROW])]));
  const links = all(out).filter(n => n.tagName === 'A' && (n.getAttribute('href') ?? '').startsWith('#gym/routine/'));
  assert.deepEqual(links.map(l => l.getAttribute('href')), ['#gym/routine/r-1', '#gym/routine/r-2']);
  assert.deepEqual(texts([links[0]]).filter(t => t !== ''), ['Push', '2 exercises']);
  assert.deepEqual(texts([links[1]]).filter(t => t !== ''), ['Legs', '1 exercise']);
});

test('home: with no routines it still says "No routines yet" and offers New routine', () => {
  const { out } = home(emptyGym());
  assert.ok(texts(out).includes('No routines yet'));
  assert.ok(byText(out, 'button', 'New routine'));
});

test('home: New routine asks for a name, saves the routine and opens it', () => {
  let ask = null;
  const { app, out } = home(emptyGym(), { askNewRoutine: onDone => { ask = onDone; } });
  click(byText(out, 'button', 'New routine'));
  assert.equal(app.saves, 0);
  ask('Pull');
  assert.equal(app.gym.routines.length, 1);
  assert.deepEqual(app.gym.routines[0], { id: `r-${T}`, name: 'Pull', createdAt: T, items: [] });
  assert.deepEqual(app.navs, [`#gym/routine/r-${T}`]);
});

test('home: a refused routine name saves nothing and does not navigate', () => {
  let ask = null;
  const { app, out } = home(emptyGym(), { askNewRoutine: onDone => { ask = onDone; } });
  click(byText(out, 'button', 'New routine'));
  ask('');
  ask('x'.repeat(61));
  assert.equal(app.saves, 0);
  assert.deepEqual(app.navs, []);
});

test('home: Repeat last workout still starts a copy of the latest finished workout', () => {
  const w = { id: 'w1', date: '2026-10-05', startedAt: 1, finishedAt: 2, name: 'Old', routineId: null,
    items: [{ exerciseId: 'bench', sets: [{ reps: 8, weight: 80, warmup: false, done: true }] }] };
  const { app, out } = home(g([], [w]));
  const btn = byText(out, 'button', 'Repeat last workout');
  assert.equal(dis(btn), false);
  click(btn);
  const open = openWorkout(app.gym);
  assert.deepEqual(open.items.map(i => i.exerciseId), ['bench']);
  assert.equal(open.name, '');
  assert.deepEqual(app.navs, ['#gym/workout']);
});

// ---- routine screen ----
test('unknown routine id (also toString, __proto__): redirects to Gym home and draws nothing', () => {
  for (const id of ['nope', 'toString', '__proto__', 'constructor']) {
    const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
    assert.deepEqual(screen(app, id), [], id);
    assert.deepEqual(app.redirects, ['#gym'], id);
  }
});

test('routine screen: name field, a card per exercise with its set count, Add exercise link, Start and Delete', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH, ROW])]));
  const out = screen(app);
  const t = texts(out);
  assert.equal(all(out).find(n => n.id === 'gr-name').getAttribute('value'), 'Push');
  for (const s of ['Barbell Bench Press', '3 sets', 'Barbell Row', '1 set']) assert.ok(t.includes(s), s);
  assert.equal(byText(out, 'a', 'Add exercise').getAttribute('href'), '#gym/routine/r-1/pick');
  assert.ok(byText(out, 'button', 'Start workout'));
  assert.ok(byText(out, 'button', 'Delete routine'));
});

test('routine screen: an exercise that is not in the list shows Unknown exercise; while loading it shows Loading…', () => {
  const app = mkApp(g([routine('r-1', 'Push', [{ exerciseId: 'gone', sets: [set(5, 5)] }])]));
  assert.ok(texts(screen(app)).includes('Unknown exercise'));
  const h = harness();
  h.opts.data = null;
  assert.ok(texts(renderRoutine(app, 'r-1', h.opts)).includes('Loading…'));
});

test('empty routine: designed empty line, Start disabled with the reason', () => {
  const app = mkApp(g([routine('r-1', 'Push', [])]));
  const out = screen(app);
  assert.ok(texts(out).includes('No exercises yet. Add one to start.'));
  assert.equal(dis(byText(out, 'button', 'Start workout')), true);
  assert.ok(texts(out).includes('Add an exercise to start.'));
});

test('set count: More repeats the last set, Fewer drops it; the routine is saved each time', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
  click(byLabel(screen(app), 'More sets of Barbell Bench Press'));
  assert.deepEqual(stored(app).items[0].sets, [set(8, 80), set(8, 80), set(7, 77.5), set(7, 77.5)]);
  click(byLabel(screen(app), 'Fewer sets of Barbell Bench Press'));
  click(byLabel(screen(app), 'Fewer sets of Barbell Bench Press'));
  assert.deepEqual(stored(app).items[0].sets, [set(8, 80), set(8, 80)]);
  assert.equal(app.saves, 3);
});

test('set count: Fewer is disabled at 1 set, More at 20 sets', () => {
  const one = mkApp(g([routine('r-1', 'Push', [ROW])]));
  assert.equal(dis(byLabel(screen(one), 'Fewer sets of Barbell Row')), true);
  assert.equal(dis(byLabel(screen(one), 'More sets of Barbell Row')), false);
  const full = mkApp(g([routine('r-1', 'Push', [{ exerciseId: 'row', sets: Array.from({ length: 20 }, () => set(5, 5)) }])]));
  assert.equal(dis(byLabel(screen(full), 'More sets of Barbell Row')), true);
  assert.equal(dis(byLabel(screen(full), 'Fewer sets of Barbell Row')), false);
});

test('order: Move down and Move up swap neighbours; the first cannot go up, the last cannot go down', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH, ROW])]));
  const out = screen(app);
  assert.equal(dis(byLabel(out, 'Move Barbell Bench Press up')), true);
  assert.equal(dis(byLabel(out, 'Move Barbell Row down')), true);
  click(byLabel(out, 'Move Barbell Bench Press down'));
  assert.deepEqual(stored(app).items.map(i => i.exerciseId), ['row', 'bench']);
  click(byLabel(screen(app), 'Move Barbell Bench Press up'));
  assert.deepEqual(stored(app).items.map(i => i.exerciseId), ['bench', 'row']);
});

test('remove exercise: asks first, then drops it; its siblings keep their sets', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH, ROW])]));
  const h = harness();
  click(byLabel(screen(app, 'r-1', h), 'Remove Barbell Bench Press'));
  assert.equal(h.log.confirms.length, 1);
  assert.equal(stored(app).items.length, 2); // nothing yet
  assert.equal(h.log.confirms[0].items[0].destructive, true);
  h.log.confirms[0].items[0].onSelect();
  assert.deepEqual(stored(app).items, [ROW]);
});

test('rename: every valid keystroke is saved trimmed; blank and 61 characters are refused with a message and nothing saved', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
  const out = screen(app);
  const input = all(out).find(n => n.id === 'gr-name');
  type(input, '  Pull day ');
  assert.equal(stored(app).name, 'Pull day');
  const saves = app.saves;
  type(input, '');
  assert.equal(stored(app).name, 'Pull day');
  assert.match(alertText(out), /Name must be 1 to 60 characters\./);
  type(input, 'x'.repeat(61));
  assert.equal(stored(app).name, 'Pull day');
  assert.equal(app.saves, saves);
  type(input, 'x'.repeat(60));
  assert.equal(stored(app).name, 'x'.repeat(60));
  assert.equal(alertText(out), '');
  assert.equal(input.getAttribute('maxlength'), '60');
});

test('delete: asks first; confirmed it removes only that routine and goes back to Gym home', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH]), routine('r-2', 'Legs', [ROW])]));
  const h = harness();
  click(byText(screen(app, 'r-1', h), 'button', 'Delete routine'));
  assert.equal(app.gym.routines.length, 2);
  assert.equal(h.log.confirms[0].items[0].destructive, true);
  assert.match(h.log.confirms[0].o.message, /Push/);
  h.log.confirms[0].items[0].onSelect();
  assert.deepEqual(app.gym.routines.map(r => r.id), ['r-2']);
  assert.deepEqual(app.navs, ['#gym']);
});

test('delete keeps finished workouts that came from the routine', () => {
  const w = { id: 'w1', date: '2026-10-05', startedAt: 1, finishedAt: 2, name: 'Push', routineId: 'r-1', items: [] };
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])], [w]));
  click(byText(screen(app, 'r-1', harness({ confirm: true })), 'button', 'Delete routine'));
  assert.equal(app.gym.routines.length, 0);
  assert.equal(app.gym.workouts.length, 1);
});

test('start: asks for the optional name with the routine name as the placeholder', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
  const h = harness();
  click(byText(screen(app, 'r-1', h), 'button', 'Start workout'));
  assert.deepEqual(h.log.asks, ['Push']);
  assert.equal(openWorkout(app.gym), null); // nothing started until the sheet is done
});

test('start: blank name = the routine name; items follow the routine; goes to the workout screen', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH, ROW])]));
  click(byText(screen(app, 'r-1', harness({ name: '' })), 'button', 'Start workout'));
  const w = openWorkout(app.gym);
  assert.equal(w.name, 'Push');
  assert.equal(w.routineId, 'r-1');
  assert.deepEqual(w.items.map(i => i.sets.length), [3, 1]);
  assert.equal(w.startedAt, T);
  assert.deepEqual(app.navs, ['#gym/workout']);
});

test('start: a typed name is used instead', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
  click(byText(screen(app, 'r-1', harness({ name: 'Heavy day' })), 'button', 'Start workout'));
  assert.equal(openWorkout(app.gym).name, 'Heavy day');
});

test('start: with a workout already open the button is disabled with the reason', () => {
  const open = { id: 'w9', date: '2026-10-12', startedAt: T - 1, finishedAt: null, name: '', routineId: null, items: [] };
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])], [open]));
  const out = screen(app);
  assert.equal(dis(byText(out, 'button', 'Start workout')), true);
  assert.ok(texts(out).includes('Finish or discard your open workout first.'));
});

// ---- adding exercises through the picker ----
test('pickRoutineExercise: appends the exercise with sets from last time, then goes back', () => {
  const w = { id: 'w1', date: '2026-10-05', startedAt: 1, finishedAt: 2, name: '', routineId: null,
    items: [{ exerciseId: 'squat', sets: [{ reps: 5, weight: 100, warmup: false, done: true }, { reps: 5, weight: 100, warmup: false, done: true }] }] };
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])], [w]));
  let back = 0;
  pickRoutineExercise(app, 'r-1', 'squat', () => { back++; });
  assert.deepEqual(stored(app).items[1], { exerciseId: 'squat', sets: [set(5, 100), set(5, 100)] });
  pickRoutineExercise(app, 'r-1', 'row', () => { back++; });
  assert.deepEqual(stored(app).items[2], { exerciseId: 'row', sets: [set(1, 0)] });
  assert.equal(back, 2);
});

test('pickRoutineExercise: a routine that is gone changes nothing but still goes back', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH])]));
  let back = 0;
  pickRoutineExercise(app, 'gone', 'row', () => { back++; });
  assert.equal(app.saves, 0);
  assert.equal(back, 1);
});

// ---- worst case ----
test('worst case: 30 routines, one with a 60-character name; every row is a link and no row text is cut', () => {
  const long = 'W'.repeat(60);
  const rs = Array.from({ length: 30 }, (_, i) => routine(`r-${i + 1}`, i === 7 ? long : `Routine ${i + 1}`, [BENCH, ROW]));
  const { out } = home(g(rs));
  const links = all(out).filter(n => n.tagName === 'A' && (n.getAttribute('href') ?? '').startsWith('#gym/routine/'));
  assert.equal(links.length, 30);
  assert.ok(texts([links[7]]).includes(long));
  assert.ok(links.every(l => hasClass(l, 'gm-rw') && hasClass(l, 'gm-rl')));
});

test('worst case: a routine of 20 exercises with a 60-character name draws 20 cards, each with six labelled controls', () => {
  const long = 'W'.repeat(60);
  const items = Array.from({ length: 20 }, () => ({ exerciseId: 'bench', sets: [set(8, 80), set(8, 80), set(7, 77.5)] }));
  const app = mkApp(g([routine('r-1', long, items)]));
  const out = screen(app);
  assert.equal(all(out).filter(n => n.tagName === 'SECTION').length, 20);
  for (const label of ['Move Barbell Bench Press up', 'Move Barbell Bench Press down', 'Fewer sets of Barbell Bench Press', 'More sets of Barbell Bench Press', 'Remove Barbell Bench Press']) {
    assert.equal(all(out).filter(n => n.getAttribute('aria-label') === label).length, 20, label);
  }
  assert.equal(all(out).find(n => n.id === 'gr-name').getAttribute('value'), long);
});

test('every button and link on the routine screen carries a 44 px class from gym.css or the shared controls', () => {
  const app = mkApp(g([routine('r-1', 'Push', [BENCH, ROW])]));
  const ok = ['gw-btn', 'gw-step', 'btn-ghost', 'btn-gold', 'ph-back'];
  for (const n of all(screen(app)).filter(x => x.tagName === 'BUTTON' || x.tagName === 'A')) {
    assert.ok(ok.some(c => hasClass(n, c)), `${n.tagName} ${n.getAttribute('aria-label') ?? n.textContent}`);
  }
});

// ---- wiring and CSS ----
test('app.js routes #gym/routine/<id> to the screen and /pick to the picker in pick mode', () => {
  const app = read('src/app.js');
  assert.match(app, /renderRoutine/);
  assert.match(app, /pickRoutineExercise/);
  assert.match(app, /routineIdFromParam/);
});

test('sw.js caches the two new views; the new files have no timers, sounds or notifications', () => {
  const sw = read('sw.js');
  assert.match(sw, /'src\/views\/gymRoutine\.js'/);
  assert.match(sw, /'src\/views\/gymRoutineLogic\.js'/);
  const src = read('src/views/gymRoutine.js') + read('src/views/gymRoutineLogic.js');
  assert.doesNotMatch(src, /setInterval|setTimeout|requestAnimationFrame|Audio|Notification|vibrate|PushManager/);
});

test('gym.css: the routine row and controls keep 44 px targets, text 11 px or more, no animation', () => {
  const css = read('src/gym.css');
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 11, m[0]);
  assert.doesNotMatch(css, /animation\s*:|transition\s*:|@keyframes/);
  const rl = css.match(/\.gm-rl\s*\{([^}]*)\}/);
  assert.ok(rl, 'gm-rl');
  assert.ok(Number(rl[1].match(/min-height:\s*(\d+)px/)?.[1]) >= 56);
});
