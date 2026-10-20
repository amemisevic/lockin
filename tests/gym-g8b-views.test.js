import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byText, byLabel, hasClass, headings, events } from './fakedom.js';
import { renderGymHome, resetGymHome } from '../src/views/gymHome.js';
import { renderPicker, resetPicker } from '../src/views/gymPicker.js';
import { emptyGym } from '../src/core/gym.js';

// G8b views: week navigation and the Today button on Gym home, the highlighted today tile, Delete on custom picker rows.
// Same fake-DOM shims as tests/gym-views.test.js.
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
const g = (workouts = []) => ({ ...emptyGym(), workouts });
const app = gym => ({ gym, gymCorrupt: false, today: () => '2026-10-11', nav() {} });
const home = gym => renderGymHome(app(gym), { load() {} });
const tiles = out => all(out).filter(n => hasClass(n, 'wk'));
const labels = out => tiles(out).map(t => t.getAttribute('aria-label'));
const WEEKS = [fin('2026-09-29', 'a', 1, { name: 'Old push' }), fin('2026-10-05', 'b', 2, { name: 'Pull day' })];

// ---- week navigation ----
test('home: Previous week and Next week buttons sit in the header, Tasks style, in that order', () => {
  resetGymHome();
  const out = home(g(WEEKS));
  const prev = byLabel(out, 'Previous week'), next = byLabel(out, 'Next week');
  assert.equal(prev.tagName, 'BUTTON');
  assert.equal(next.tagName, 'BUTTON');
  assert.ok(hasClass(prev, 'more') && hasClass(next, 'more'));
  const nav = all(out).find(n => hasClass(n, 'tk-nav'));
  assert.deepEqual(nav.children.filter(c => c.getAttribute('aria-label')).map(c => c.getAttribute('aria-label')), ['Previous week', 'Next week']);
});

test('home: Previous week shows the week before; strip, visits line, heading and recent list follow it', () => {
  resetGymHome();
  const before = events.length;
  fire(byLabel(home(g(WEEKS)), 'Previous week'), 'click');
  assert.equal(events.length, before + 1); // asked for a re-render, nothing saved
  const out = home(g(WEEKS));
  assert.deepEqual(labels(out)[0], 'Monday 28 September, no visit');
  assert.deepEqual(labels(out)[1], 'Tuesday 29 September, gym visit');
  assert.ok(texts(out).includes('1 of 4 visits'));
  assert.deepEqual(headings(out), ['September · week 40', 'Routines', 'Recent workouts']);
  const t = texts(out);
  assert.ok(t.includes('Old push'));
  assert.equal(t.includes('Pull day'), false);
  assert.equal(labels(out).some(l => l.endsWith('today')), false);
  assert.equal(byLabel(out, 'Gym visits this week'), undefined);
  assert.equal(byLabel(out, 'Gym visits, September · week 40').getAttribute('role'), 'group');
});

test('home: Next week from the current week shows the coming week (no visits); two Previous clicks go two weeks back', () => {
  resetGymHome();
  fire(byLabel(home(g(WEEKS)), 'Next week'), 'click');
  let out = home(g(WEEKS));
  assert.equal(labels(out)[0], 'Monday 12 October, no visit');
  assert.ok(texts(out).includes('0 of 4 visits'));
  resetGymHome();
  fire(byLabel(home(g(WEEKS)), 'Previous week'), 'click');
  fire(byLabel(home(g(WEEKS)), 'Previous week'), 'click');
  out = home(g(WEEKS));
  assert.equal(labels(out)[0], 'Monday 21 September, no visit');
});

test('home: the shown week is view state only — nothing is written to the gym data', () => {
  resetGymHome();
  const gym = g(WEEKS);
  const snapshot = JSON.stringify(gym);
  const a = { ...app(gym), setGym() { throw new Error('setGym called'); }, set() { throw new Error('set called'); } };
  fire(byLabel(renderGymHome(a, { load() {} }), 'Previous week'), 'click');
  renderGymHome(a, { load() {} });
  assert.equal(JSON.stringify(gym), snapshot);
});

// ---- Today button ----
test('home: no Today button on the current week', () => {
  resetGymHome();
  assert.equal(byText(home(g(WEEKS)), 'button', 'Today'), undefined);
});

test('home: a Today button appears on any other week and returns to the current week', () => {
  resetGymHome();
  fire(byLabel(home(g(WEEKS)), 'Previous week'), 'click');
  const btn = byText(home(g(WEEKS)), 'button', 'Today');
  assert.ok(btn);
  const nav = all(home(g(WEEKS))).find(n => hasClass(n, 'tk-nav'));
  assert.equal(nav.children[0].textContent, 'Today'); // grows to the left, so the arrows never move
  fire(btn, 'click');
  const out = home(g(WEEKS));
  assert.equal(labels(out)[0], 'Monday 5 October, gym visit');
  assert.equal(byText(out, 'button', 'Today'), undefined);
  assert.deepEqual(headings(out)[0], 'This week');
});

test('home: stepping forward onto the current week hides the Today button again', () => {
  resetGymHome();
  fire(byLabel(home(g(WEEKS)), 'Previous week'), 'click');
  fire(byLabel(home(g(WEEKS)), 'Next week'), 'click');
  const out = home(g(WEEKS));
  assert.equal(byText(out, 'button', 'Today'), undefined);
  assert.equal(labels(out)[6], 'Sunday 11 October, no visit, today');
});

// ---- today tile ----
test('home: today\'s tile is highlighted by shape and word — a TODAY label, aria-current, the today class — and no other tile is', () => {
  resetGymHome();
  const t = tiles(home(g(WEEKS)));
  const mark = t.filter(x => hasClass(x, 'today'));
  assert.equal(mark.length, 1);
  assert.equal(mark[0].getAttribute('aria-label'), 'Sunday 11 October, no visit, today');
  assert.ok(texts([mark[0]]).includes('TODAY'));
  assert.equal(mark[0].getAttribute('aria-current'), 'date');
  for (const x of t.filter(y => y !== mark[0])) {
    assert.equal(texts([x]).includes('TODAY'), false);
    assert.equal(x.getAttribute('aria-current'), null);
  }
});

test('home: today\'s tile keeps the check mark when today is a visit', () => {
  resetGymHome();
  const mark = tiles(home(g([fin('2026-10-11', 'z', 9)]))).find(x => hasClass(x, 'today'));
  assert.ok(hasClass(mark, 'sel'));
  assert.ok(all([mark]).some(n => n.tagName === 'SVG'));
  assert.ok(texts([mark]).includes('TODAY'));
});

test('gym.css: today tile has a ring (border width, not colour), the Today button is 44 high and 44 wide at least', () => {
  const css = read('src/gym.css');
  assert.match(css, /\.gm-wks \.wk\.today\{[^}]*(border-width:\s*[2-9]px|outline:\s*[2-9]px|box-shadow:[^;}]*0 0 0 [2-9]px)/);
  assert.match(css, /\.gm-today\{[^}]*min-width:\s*44px/);
  assert.match(css, /\.gm-today\{[^}]*(width:auto|padding)/);
});

// ---- Delete on custom picker rows ----
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'curl', name: 'Dumbbell Curl', equipment: 'dumbbell', muscle: 'biceps', category: 'strength' },
  ],
  muscles: ['biceps', 'chest', 'other'],
  equipment: ['barbell', 'cable', 'dumbbell', 'other'],
};
const fly = { id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' };
const used = [{ id: 'w1', date: '2026-10-05', startedAt: 1, finishedAt: 2, name: '', routineId: null, items: [{ exerciseId: 'custom-1', sets: [] }] }];
const pk = (extra = {}) => {
  const a = { gym: { ...emptyGym(), customExercises: [fly], ...extra }, today: () => '2026-10-11', saved: 0,
    setGym(u) { this.gym = u(this.gym); this.saved++; return true; } };
  const sheets = [];
  const confirm = (items, opts) => sheets.push({ items, opts });
  return { a, sheets, out: renderPicker(a, { data: DATA, load() {}, confirm }) };
};
const rowsOf = out => all(out).filter(n => hasClass(n, 'gm-ex'));

test('picker: only custom rows have a Delete button, labelled with the exercise name', () => {
  resetPicker();
  const { out } = pk();
  const rows = rowsOf(out);
  assert.equal(rows.length, 3);
  const withDelete = rows.filter(r => all([r]).some(n => n.tagName === 'BUTTON'));
  assert.equal(withDelete.length, 1);
  assert.ok(texts(withDelete).includes('Cable Fly'));
  const btn = all(withDelete).find(n => n.tagName === 'BUTTON');
  assert.equal(btn.textContent, 'Delete');
  assert.equal(btn.getAttribute('aria-label'), 'Delete Cable Fly');
  assert.equal(btn.getAttribute('type'), 'button');
});

test('picker: tapping Delete only asks — a destructive confirm with the name; nothing is deleted yet', () => {
  resetPicker();
  const { a, sheets, out } = pk();
  fire(byLabel(out, 'Delete Cable Fly'), 'click');
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].items.length, 1);
  assert.equal(sheets[0].items[0].label, 'Delete');
  assert.equal(sheets[0].items[0].destructive, true);
  assert.ok(sheets[0].opts.message.includes('Cable Fly'));
  assert.equal(a.saved, 0);
  assert.deepEqual(a.gym.customExercises, [fly]);
});

test('picker: confirming deletes the exercise, saves once and the row disappears', () => {
  resetPicker();
  const { a, sheets, out } = pk();
  fire(byLabel(out, 'Delete Cable Fly'), 'click');
  sheets[0].items[0].onSelect();
  assert.equal(a.saved, 1);
  assert.deepEqual(a.gym.customExercises, []);
  assert.deepEqual(rowsOf(out).map(r => r.children[0].textContent), ['Barbell Bench Press', 'Dumbbell Curl']);
  assert.ok(texts(out).includes('2 exercises'));
});

test('picker: a custom exercise used in a workout is refused with the notice; the row stays and nothing is saved', () => {
  resetPicker();
  const { a, sheets, out } = pk({ workouts: used });
  fire(byLabel(out, 'Delete Cable Fly'), 'click');
  sheets[0].items[0].onSelect();
  assert.equal(a.saved, 0);
  assert.deepEqual(a.gym.customExercises, [fly]);
  assert.equal(texts(out).filter(s => s === "Used in workouts, can't delete.").length, 1);
  const note = all(out).find(n => n.tagName === 'P' && n.textContent === "Used in workouts, can't delete.");
  assert.equal(note.getAttribute('role'), 'alert');
  assert.ok(texts(out).includes('Cable Fly'));
});

test('picker: the refusal notice is gone after the next search or chip tap', () => {
  resetPicker();
  const { sheets, out } = pk({ workouts: used });
  fire(byLabel(out, 'Delete Cable Fly'), 'click');
  sheets[0].items[0].onSelect();
  fire(byLabel(out, 'Search exercises'), 'input', { target: { value: 'fly' } });
  assert.equal(texts(out).includes("Used in workouts, can't delete."), false);
});

test('picker: Delete reads the current gym when confirmed, not the one from when it was drawn', () => {
  resetPicker();
  const { a, sheets, out } = pk();
  fire(byLabel(out, 'Delete Cable Fly'), 'click');
  a.gym = { ...a.gym, workouts: used }; // the exercise got used while the confirm was open
  sheets[0].items[0].onSelect();
  assert.equal(a.saved, 0);
  assert.deepEqual(a.gym.customExercises, [fly]);
});

test('gym.css: the Delete button is at least 44 x 44', () => {
  const css = read('src/gym.css');
  assert.match(css, /\.gm-del\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.gm-del\{[^}]*min-width:\s*44px/);
});
