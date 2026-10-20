import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, texts, fire, byText, byLabel } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout, addExercise } from '../src/core/workouts.js';
import { renderGymHome, resetGymHome } from '../src/views/gymHome.js';
import { renderPicker, resetPicker } from '../src/views/gymPicker.js';
import { begin } from '../src/views/gymWorkoutLogic.js';

// Gym G9 wiring: Gym home starts, resumes and repeats workouts; the picker can pick; routes; app.js guard; CSS floors.
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
const done = { reps: 8, weight: 80, warmup: false, done: true };
const FIN = { id: 'h1', date: '2026-10-10', startedAt: T - 172_800_000, finishedAt: T - 172_800_000 + 3_600_000, name: '', routineId: null,
  items: [{ exerciseId: 'bench', sets: [done, done] }, { exerciseId: 'row', sets: [done] }] };
const withHistory = () => ({ ...emptyGym(), workouts: [FIN] });
const mkApp = gym => {
  const a = { gym, gymCorrupt: false, saves: 0, navs: [], today: () => '2026-10-12', nav: p => a.navs.push(p),
    setGym(fn) { const n = fn(a.gym); if (n === a.gym) return true; a.gym = n; a.saves++; return true; } };
  return a;
};
const home = (app, extra = {}) => { resetGymHome(); return renderGymHome(app, { load() {}, now: () => T, ...extra }); };
const click = el => fire(el, 'click');
const off = b => b.getAttribute('disabled') !== null;

// ---- Gym home buttons ----
test('home: Start workout is enabled; a tap asks for a name (G9c), then opens a workout dated today and goes to the workout screen', () => {
  const app = mkApp(emptyGym());
  let asked = 0, answer = null;
  const b = byText(home(app, { askName: cb => { asked++; answer = cb; } }), 'button', 'Start workout');
  assert.equal(off(b), false);
  click(b);
  assert.equal(asked, 1);
  assert.equal(openWorkout(app.gym), null);
  answer('');
  const w = openWorkout(app.gym);
  assert.equal(w.date, '2026-10-12');
  assert.equal(w.startedAt, T);
  assert.deepEqual(app.navs, ['#gym/workout']);
});

test('home: Repeat last workout is disabled with no finished workout, enabled with one', () => {
  assert.equal(off(byText(home(mkApp(emptyGym())), 'button', 'Repeat last workout')), true);
  assert.equal(off(byText(home(mkApp(withHistory())), 'button', 'Repeat last workout')), false);
});

test('home: Repeat last workout copies the exercises into a new open workout and opens it', () => {
  const app = mkApp(withHistory());
  click(byText(home(app), 'button', 'Repeat last workout'));
  assert.deepEqual(openWorkout(app.gym).items.map(i => i.exerciseId), ['bench', 'row']);
  assert.equal(openWorkout(app.gym).items[0].sets.every(s => s.done === false), true);
  assert.deepEqual(app.navs, ['#gym/workout']);
});

test('home: with an open workout the first button reads Resume workout, opens it, starts nothing; Repeat is disabled', () => {
  const app = mkApp(begin(withHistory(), T).state);
  const out = home(app);
  assert.equal(byText(out, 'button', 'Start workout'), undefined);
  const resume = byText(out, 'button', 'Resume workout');
  assert.equal(off(resume), false);
  assert.equal(off(byText(out, 'button', 'Repeat last workout')), true);
  const before = app.gym;
  click(resume);
  assert.equal(app.gym, before);
  assert.deepEqual(app.navs, ['#gym/workout']);
});

test('home: an open workout is not listed under Recent workouts', () => {
  const t = texts(home(mkApp(begin(emptyGym(), T).state)));
  assert.ok(t.includes('No workouts yet'));
});

// ---- picker in pick mode ----
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'row', name: 'Bent Over Row', equipment: 'barbell', muscle: 'middle back', category: 'strength' },
  ],
  muscles: ['chest', 'middle back', 'other'], equipment: ['barbell', 'other'],
};

test('picker, pick mode: title Add exercise, an Add button per row, a tap hands the id to onPick', () => {
  resetPicker();
  const picked = [];
  const out = renderPicker(mkApp(emptyGym()), { data: DATA, load() {}, onPick: id => picked.push(id) });
  assert.ok(texts(out).includes('Add exercise'));
  const add = byLabel(out, 'Add Bent Over Row');
  assert.equal(add.textContent, 'Add');
  click(add);
  assert.deepEqual(picked, ['row']);
});

test('picker, pick mode: custom rows keep their tag but have no Delete button', () => {
  resetPicker();
  const gym = { ...emptyGym(), customExercises: [{ id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'other' }] };
  const out = renderPicker(mkApp(gym), { data: DATA, load() {}, onPick() {} });
  assert.ok(texts(out).includes('Custom'));
  assert.equal(byLabel(out, 'Delete Cable Fly'), undefined);
  assert.ok(byLabel(out, 'Add Cable Fly'));
});

test('picker, browse mode is unchanged: title Exercises, no Add buttons', () => {
  resetPicker();
  const out = renderPicker(mkApp(emptyGym()), { data: DATA, load() {} });
  assert.ok(texts(out).includes('Exercises'));
  assert.equal(byLabel(out, 'Add Bent Over Row'), undefined);
});

// ---- routes ----
test('router: #gym/workout and #gym/pick are pushed screens under the Gym tab; look-alikes fall back to Today', () => {
  assert.deepEqual(parseRoute('#gym/workout'), { name: 'gym', params: ['workout'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/pick/'), { name: 'gym', params: ['pick'], tab: 'gym', pushed: true });
  for (const bad of ['#gym/workout/x', '#gym/Workout', '#gym/pick/1', '#gym/picks']) assert.equal(parseRoute(bad).name, 'today', bad);
  assert.deepEqual(parseRoute('#gym/exercises'), { name: 'gym', params: ['exercises'], tab: 'gym', pushed: true });
});

// ---- app.js ----
test('app.js: routes the workout screen and the pick mode; the 30 s re-render skips ANY focused INPUT or TEXTAREA (ruling 6)', () => {
  const src = read('src/app.js');
  assert.match(src, /renderWorkout/);
  assert.match(src, /pickExercise/);
  assert.match(src, /tagName === 'TEXTAREA'/);
  assert.match(src, /tagName === 'INPUT'/);
  assert.doesNotMatch(src, /type === 'search'/);
});

// ---- source and CSS floors ----
test('the new views use only icons that already exist in src/icons.js', async () => {
  const { icons } = await import('../src/icons.js');
  for (const f of ['gymWorkout', 'gymHome', 'gymPicker']) {
    for (const m of read(`src/views/${f}.js`).matchAll(/icon\('(\w+)'\)/g)) assert.equal(typeof icons[m[1]], 'string', `${f}: ${m[1]}`);
  }
});

test('no Date.parse, toISOString, getUTC* or new Date(string) in the new files', () => {
  for (const f of ['src/views/gymWorkout.js', 'src/views/gymWorkoutLogic.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /toISOString|getUTC|Date\.parse|new Date\(\s*['"`]/, f);
  }
});

test('no sound, no notification, no vibration, no push in the workout screen', () => {
  const src = read('src/views/gymWorkout.js') + read('src/views/gymWorkoutLogic.js');
  assert.doesNotMatch(src, /Audio|AudioContext|Notification|vibrate|serviceWorker|PushManager|speechSynthesis/);
});

test('gym.css: text 11px or more; workout buttons and inputs 44px or more; no animation or transition at all', () => {
  const css = read('src/gym.css');
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 11, m[0]);
  assert.doesNotMatch(css, /animation\s*:|transition\s*:|@keyframes/);
  for (const cls of ['gw-btn', 'gw-in', 'gw-done']) {
    const rule = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, cls);
    assert.ok(Number(rule[1].match(/min-height:\s*(\d+)px/)?.[1]) >= 44, `${cls} min-height`);
  }
  assert.ok(Number(css.match(/\.gw-step\s*\{([^}]*)\}/)[1].match(/min-width:\s*(\d+)px/)[1]) >= 44);
});

test('sw.js caches the two new views', () => {
  const sw = read('sw.js');
  assert.match(sw, /'src\/views\/gymWorkout\.js'/);
  assert.match(sw, /'src\/views\/gymWorkoutLogic\.js'/);
});
