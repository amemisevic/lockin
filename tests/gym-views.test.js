import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byText, byLabel, hasClass, headings } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { renderGymHome } from '../src/views/gymHome.js';
import { renderPicker, resetPicker } from '../src/views/gymPicker.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G8 views: Gym home and the exercise picker (the create sheet is a <dialog>, checked in the browser pane).
// The fake DOM has no replaceChildren or classList.toggle; the code uses both (as src/views/taskSheet.js does).
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
const fin = (date, id, startedAt, extra = {}) => ({ id, date, startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items: [], ...extra });
const g = (workouts = [], routines = []) => ({ ...emptyGym(), workouts, routines });
const EX = [fin('2026-10-05', 'a', 1), fin('2026-10-07', 'b', 2), fin('2026-10-07', 'c', 3), fin('2026-10-11', 'd', 4), fin('2026-10-12', 'e', 5)];
const app = (gym, extra = {}) => ({ gym, gymCorrupt: false, today: () => '2026-10-11', nav() {}, ...extra });
const home = (gym, extra) => renderGymHome(app(gym, extra), { load() {} });

test('router: #gym/exercises is a pushed screen under the Gym tab; look-alikes fall back to Today', () => {
  assert.deepEqual(parseRoute('#gym/exercises'), { name: 'gym', params: ['exercises'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/exercises/'), { name: 'gym', params: ['exercises'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym'), { name: 'gym', params: [], tab: 'gym', pushed: false });
  for (const bad of ['#gym/exercises/x', '#gym/Exercises', '#gym/x']) assert.equal(parseRoute(bad).name, 'today', bad);
});

test('home, empty gym: title, 0 of 4 visits, three sections with their empty lines, no notice', () => {
  const out = home(emptyGym());
  const t = texts(out);
  for (const s of ['Lock In', 'Gym', '0 of 4 visits', 'No routines yet', 'No workouts yet']) assert.ok(t.includes(s), s);
  assert.deepEqual(headings(out), ['This week', 'Routines', 'Recent workouts']);
  assert.equal(t.includes('Gym data could not be read. A copy was kept.'), false);
});

test('home: the corrupt notice shows once, exact copy, only when app.gymCorrupt is set', () => {
  const on = texts(home(emptyGym(), { gymCorrupt: true })).filter(s => s === 'Gym data could not be read. A copy was kept.');
  assert.equal(on.length, 1);
  assert.equal(texts(home(emptyGym(), { gymCorrupt: false })).includes('Gym data could not be read. A copy was kept.'), false);
  assert.equal(texts(home(emptyGym(), { gymCorrupt: undefined })).includes('Gym data could not be read. A copy was kept.'), false);
});

test('home: week strip has 7 tiles; visits on 05, 07 and 11 carry the check mark and the label says so', () => {
  const out = home(g(EX));
  const tiles = all(out).filter(n => hasClass(n, 'wk'));
  assert.equal(tiles.length, 7);
  assert.deepEqual(tiles.map(t => t.getAttribute('aria-label')), [
    'Monday 5 October, gym visit', 'Tuesday 6 October, no visit', 'Wednesday 7 October, gym visit', 'Thursday 8 October, no visit',
    'Friday 9 October, no visit', 'Saturday 10 October, no visit', 'Sunday 11 October, gym visit, today']);
  assert.ok(tiles.every(t => t.getAttribute('role') === 'img'));
  const marked = tiles.map(t => hasClass(t, 'sel') && all([t]).some(n => n.tagName === 'SVG'));
  assert.deepEqual(marked, [true, false, true, false, false, false, true]);
  assert.ok(texts(out).includes('3 of 4 visits'));
  assert.equal(byLabel(out, 'Gym visits this week').getAttribute('role'), 'group');
});

test('home: Start workout and Repeat last workout are shown but disabled until the workout screen exists (G9)', () => {
  const out = home(g(EX));
  for (const label of ['Start workout', 'Repeat last workout']) {
    const b = byText(out, 'button', label);
    assert.ok(b, label);
    assert.notEqual(b.getAttribute('disabled'), null, label);
  }
});

test('home: the Exercises row is a link to #gym/exercises', () => {
  const link = all(home(emptyGym())).find(n => n.tagName === 'A');
  assert.equal(link.getAttribute('href'), '#gym/exercises');
  assert.ok(link.textContent.startsWith('Exercises'));
});

test('home: routines and the five newest finished workouts are listed', () => {
  const routines = [{ id: 'r-1', name: 'Pull', createdAt: 1, items: [{ exerciseId: 'row', sets: [{ reps: 8, weight: 60 }] }] }];
  const ws = [1, 2, 3, 4, 5, 6].map(n => fin(`2026-09-0${n}`, `w${n}`, n * 10, { name: `Day ${n}` }));
  const t = texts(home(g(ws, routines)));
  assert.ok(t.includes('Pull') && t.includes('1 exercise'));
  assert.equal(t.includes('No routines yet'), false);
  assert.equal(t.includes('No workouts yet'), false);
  for (const n of [6, 5, 4, 3, 2]) assert.ok(t.includes(`Day ${n}`), `Day ${n}`);
  assert.equal(t.includes('Day 1'), false);
});

test('home asks for the exercise list on first open (ruling 8) without waiting for it', () => {
  let asked = 0;
  renderGymHome(app(emptyGym()), { load: () => { asked++; } });
  assert.equal(asked, 1);
});

// ---- picker ----
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'row', name: 'Bent Over Row', equipment: 'barbell', muscle: 'middle back', category: 'strength' },
    { id: 'curl', name: 'Dumbbell Curl', equipment: 'dumbbell', muscle: 'biceps', category: 'strength' },
    { id: 'pushup', name: 'Push-Up', equipment: 'body only', muscle: 'chest', category: 'strength' },
  ],
  muscles: ['biceps', 'chest', 'middle back', 'other'],
  equipment: ['barbell', 'body only', 'dumbbell', 'other'],
};
const rows = out => all(out).filter(n => hasClass(n, 'gm-ex'));
const rowNames = out => rows(out).map(r => r.children[0].textContent);
const picker = (gym = emptyGym()) => renderPicker(app(gym), { data: DATA, load() {} });

test('picker, list not loaded: asks for it once and shows a loading line, no search field', () => {
  resetPicker();
  let asked = 0;
  const out = renderPicker(app(emptyGym()), { data: null, load: () => { asked++; } });
  assert.equal(asked, 1);
  assert.ok(texts(out).includes('Loading exercises…'));
  assert.equal(all(out).some(n => n.tagName === 'INPUT'), false);
  assert.ok(byLabel(out, 'Back'));
});

test('picker: Back, search field, Muscle and Equipment chip groups, Create exercise, all four rows', () => {
  resetPicker();
  const out = picker();
  assert.ok(byLabel(out, 'Back'));
  const q = byLabel(out, 'Search exercises');
  assert.equal(q.tagName, 'INPUT');
  assert.equal(q.getAttribute('type'), 'search');
  assert.equal(q.getAttribute('id'), 'gm-q');
  assert.equal(byLabel(out, 'Muscle').children.length, 4);
  assert.equal(byLabel(out, 'Equipment').children.length, 4);
  assert.deepEqual(byLabel(out, 'Muscle').children.map(b => b.textContent), ['Biceps', 'Chest', 'Middle back', 'Other']);
  assert.ok(byText(out, 'button', 'Create exercise'));
  assert.deepEqual(rowNames(out), ['Barbell Bench Press', 'Bent Over Row', 'Dumbbell Curl', 'Push-Up']);
  assert.ok(texts(out).includes('4 exercises'));
});

test('picker: typing filters the list in place; no match shows the empty line', () => {
  resetPicker();
  const out = picker();
  const q = byLabel(out, 'Search exercises');
  fire(q, 'input', { target: { value: 'bench' } });
  assert.deepEqual(rowNames(out), ['Barbell Bench Press']);
  assert.ok(texts(out).includes('1 exercise'));
  fire(q, 'input', { target: { value: 'zzz' } });
  assert.deepEqual(rowNames(out), []);
  assert.ok(texts(out).includes('No exercises match.'));
  fire(q, 'input', { target: { value: '' } });
  assert.equal(rows(out).length, 4);
});

test('picker: a muscle chip filters and is marked pressed; tapping it again clears the filter', () => {
  resetPicker();
  const out = picker();
  const chest = byText(out, 'button', 'Chest');
  fire(chest, 'click');
  assert.deepEqual(rowNames(out), ['Barbell Bench Press', 'Push-Up']);
  assert.equal(chest.getAttribute('aria-pressed'), 'true');
  assert.ok(hasClass(chest, 'on'));
  fire(byText(out, 'button', 'Barbell'), 'click');
  assert.deepEqual(rowNames(out), ['Barbell Bench Press']);
  fire(chest, 'click');
  assert.equal(chest.getAttribute('aria-pressed'), 'false');
  assert.equal(hasClass(chest, 'on'), false);
  assert.deepEqual(rowNames(out), ['Barbell Bench Press', 'Bent Over Row']);
});

test('picker: a re-render (30 s tick) keeps the query and filters; resetPicker clears them', () => {
  resetPicker();
  const first = picker();
  fire(byLabel(first, 'Search exercises'), 'input', { target: { value: 'push' } });
  fire(byText(first, 'button', 'Chest'), 'click');
  const again = picker();
  assert.equal(byLabel(again, 'Search exercises').getAttribute('value'), 'push');
  assert.equal(byText(again, 'button', 'Chest').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(rowNames(again), ['Push-Up']);
  resetPicker();
  assert.equal(rows(picker()).length, 4);
});

test('picker: custom exercises show a "Custom" tag, bundled ones do not', () => {
  resetPicker();
  const gym = { ...emptyGym(), customExercises: [{ id: 'custom-1', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' }] };
  const out = picker(gym);
  const tagged = rows(out).filter(r => texts([r]).includes('Custom')).map(r => r.children[0].textContent);
  assert.deepEqual(tagged, ['Zottman Curl']);
  assert.equal(rows(out).length, 5);
});

test('picker: the capped list says how many matched', () => {
  resetPicker();
  const many = { ...DATA, exercises: Array.from({ length: 120 }, (_, i) => ({ id: `e${i}`, name: `Move ${String(i).padStart(3, '0')}`, equipment: 'other', muscle: 'other' })) };
  const out = renderPicker(app(emptyGym()), { data: many, load() {} });
  assert.equal(rows(out).length, 50);
  assert.ok(texts(out).includes('Showing 50 of 120. Search or filter to narrow down.'));
});

// ---- wiring and CSS floors ----
test('app.js routes #gym to the home and #gym/exercises to the picker; the 30 s re-render skips a focused search field', () => {
  const src = read('src/app.js');
  assert.match(src, /renderGymHome/);
  assert.match(src, /renderPicker/);
  assert.match(src, /type === 'search'/);
});

test('index.html links src/gym.css', () => {
  assert.match(read('index.html'), /<link rel="stylesheet" href="src\/gym\.css">/);
});

test('gym.css: text is 11px or more, link rows are 44px or more tall', () => {
  const css = read('src/gym.css');
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert.ok(Number(m[1]) >= 11, m[0]);
  const link = css.match(/\.gm-link\s*\{([^}]*)\}/)[1];
  assert.ok(Number(link.match(/min-height:\s*(\d+)px/)[1]) >= 44);
});

test('the new gym views use only icons that already exist in src/icons.js', async () => {
  const { icons } = await import('../src/icons.js');
  for (const f of ['gymHome', 'gymPicker', 'gymExerciseSheet']) {
    for (const m of read(`src/views/${f}.js`).matchAll(/icon\('(\w+)'\)/g)) assert.equal(typeof icons[m[1]], 'string', `${f}: ${m[1]}`);
  }
});
