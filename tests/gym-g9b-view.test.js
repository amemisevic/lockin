import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, fire, byLabel, hasClass } from './fakedom.js';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout } from '../src/core/workouts.js';
import { renderGymHome, resetGymHome } from '../src/views/gymHome.js';
import { noonOf } from '../src/views/gymHomeLogic.js';

// G9b view: Gym home day tiles open a day sheet (finished workouts of that day, Add workout / Resume workout).
// Same fake-DOM shims as tests/gym-g9-wiring.test.js. Today is Monday 2026-10-12: the shown week has 1 today tile and 6 future tiles.
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
const fin = (date, id, startedAt, extra = {}) => ({ id, date, startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items: [], ...extra });
const gymWith = workouts => ({ ...emptyGym(), workouts });
const mkApp = gym => {
  const a = { gym, gymCorrupt: false, navs: [], today: () => '2026-10-12', nav: p => a.navs.push(p),
    setGym(fn) { a.gym = fn(a.gym); return true; } };
  return a;
};
// Records the sheets instead of opening them. `render()` draws again without resetting the shown week (as the app does).
const rig = (gym = emptyGym()) => {
  const r = { app: mkApp(gym), sheets: [], answer: null, asked: 0 };
  r.render = () => { r.out = renderGymHome(r.app, { load() {}, now: () => T, openActions: (items, o) => r.sheets.push({ items, o }),
    askName: cb => { r.asked++; r.answer = cb; } }); return r.out; };
  resetGymHome();
  r.render();
  r.prev = () => { fire(byLabel(r.out, 'Previous week'), 'click'); r.render(); };
  r.next = () => { fire(byLabel(r.out, 'Next week'), 'click'); r.render(); };
  r.tiles = () => all(r.out).filter(n => hasClass(n, 'wk'));
  r.tap = label => fire(r.tiles().find(n => n.getAttribute('aria-label').startsWith(label)), 'click');
  r.last = () => r.sheets[r.sheets.length - 1];
  r.labels = () => r.last().items.map(i => i.label);
  r.choose = label => r.last().items.find(i => i.label === label).onSelect();
  return r;
};

test('tiles: today is a button (class wk, aria-label and aria-current kept, no role img); the six future tiles are inert', () => {
  const t = rig().tiles();
  assert.equal(t.length, 7);
  assert.equal(t[0].tagName, 'BUTTON');
  assert.equal(t[0].getAttribute('type'), 'button');
  assert.equal(t[0].getAttribute('aria-label'), 'Monday 12 October, no visit, today');
  assert.equal(t[0].getAttribute('aria-current'), 'date');
  assert.equal(t[0].getAttribute('role'), null);
  for (const f of t.slice(1)) {
    assert.notEqual(f.tagName, 'BUTTON');
    assert.equal(f.getAttribute('tabindex'), null);
    assert.equal(Object.keys(f.listeners).length, 0);
  }
});

test('tiles: every tile of the previous week is a button, none of the next week is', () => {
  const r = rig();
  r.prev();
  assert.deepEqual(r.tiles().map(n => n.tagName), Array(7).fill('BUTTON'));
  r.next();
  r.next();
  assert.equal(r.tiles().some(n => n.tagName === 'BUTTON'), false);
});

test('a future tile opens nothing', () => {
  const r = rig();
  r.tap('Tuesday 13 October');
  assert.equal(r.sheets.length, 0);
});

test('a past-day tile opens a sheet titled with the day label: its finished workouts, then Add workout', () => {
  const D = 86_400_000;
  const r = rig(gymWith([fin('2026-10-10', 'a', T - 2 * D, { name: 'Pull' }), fin('2026-10-10', 'b', T - 2 * D + 5000), fin('2026-10-09', 'c', 1, { name: 'No' })]));
  r.prev();
  r.tap('Saturday 10 October');
  assert.equal(r.sheets.length, 1);
  assert.equal(r.last().o.message, 'Saturday 10 October');
  assert.deepEqual(r.labels(), ['Pull', 'Workout', 'Add workout']);
  r.choose('Pull');
  assert.deepEqual(r.app.navs, ['#gym/history/a']);
});

test('today with no workout: the sheet holds only Add workout; Add asks for a name, then starts a workout now and opens it', () => {
  const r = rig();
  r.tap('Monday 12 October');
  assert.equal(r.last().o.message, 'Monday 12 October');
  assert.deepEqual(r.labels(), ['Add workout']);
  r.choose('Add workout');
  assert.equal(r.asked, 1);
  assert.equal(openWorkout(r.app.gym), null);
  r.answer('Push');
  const w = openWorkout(r.app.gym);
  assert.equal(w.name, 'Push');
  assert.equal(w.date, '2026-10-12');
  assert.equal(w.startedAt, T);
  assert.deepEqual(r.app.navs, ['#gym/workout']);
});

test('a past day: Add workout starts at local noon of that day (date and startedAt on the day)', () => {
  const r = rig(gymWith([fin('2026-10-07', 'x', 1)]));
  r.prev();
  r.tap('Wednesday 7 October');
  assert.deepEqual(r.labels(), ['Workout', 'Add workout']);
  r.choose('Add workout');
  assert.equal(openWorkout(r.app.gym), null);
  r.answer('');
  const w = openWorkout(r.app.gym);
  assert.equal(w.date, '2026-10-07');
  assert.equal(w.startedAt, noonOf('2026-10-07'));
  assert.equal(w.startedAt, new Date(2026, 9, 7, 12).getTime());
  assert.deepEqual(r.app.navs, ['#gym/workout']);
});

test('an open workout: the sheet offers Resume workout instead of Add workout, and starts nothing', () => {
  const open = { id: 'o', date: '2026-10-12', startedAt: T, finishedAt: null, name: '', routineId: null, items: [] };
  const r = rig(gymWith([open]));
  r.tap('Monday 12 October');
  assert.deepEqual(r.labels(), ['Resume workout']);
  r.choose('Resume workout');
  assert.equal(r.asked, 0);
  assert.equal(r.app.gym.workouts.length, 1);
  assert.deepEqual(r.app.navs, ['#gym/workout']);
});

test('cancelling the name sheet starts nothing (the callback is never called)', () => {
  const r = rig();
  r.tap('Monday 12 October');
  r.choose('Add workout');
  assert.equal(r.asked, 1);
  assert.equal(r.app.gym.workouts.length, 0);
  assert.deepEqual(r.app.navs, []);
});

test('CSS and source: tile buttons reset font and padding and stay 44 pt or taller; no date API on a date key', () => {
  const css = read('src/gym.css');
  assert.match(css, /\.gm-wks button\.wk\{[^}]*font-family:\s*inherit/);
  assert.match(css, /\.gm-wks button\.wk\{[^}]*padding:\s*0/);
  assert.ok(Number(css.match(/\.gm-wks \.wk\{height:(\d+)px/)[1]) >= 44);
  assert.doesNotMatch(read('src/views/gymHome.js') + read('src/views/gymHomeLogic.js'), /toISOString|getUTC|Date\.parse|new Date\(['"`]/);
});
