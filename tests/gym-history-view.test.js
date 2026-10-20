import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byLabel, hasClass, headings } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { emptyGym } from '../src/core/gym.js';
import { renderGymHome } from '../src/views/gymHome.js';
import { renderHistory } from '../src/views/gymHistory.js';
import { renderWorkoutDetail, resetDetailView } from '../src/views/gymWorkoutDetail.js';
import { historyHref } from '../src/views/gymHistoryLogic.js';
import { routineHref } from '../src/views/gymRoutineLogic.js';

// Gym G11 History: list, detail, edits, delete, save as routine (the sheets are <dialog>s, checked in the browser pane).
El.prototype.replaceChildren = function replaceChildren(...cs) { this.children = []; this.append(...cs); };

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = (y, m, d, hh = 10) => new Date(y, m - 1, d, hh).getTime();
const NOW = T(2026, 10, 12, 21);
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const wk = (id, date, startedAt, items, o = {}) => ({ id, date, startedAt, finishedAt: startedAt + 75 * 60_000, name: id, routineId: null, items, ...o });
const A = (exerciseId, sets) => ({ exerciseId, sets });
const DATA = { exercises: [
  { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
  { id: 'row', name: 'Barbell Row', equipment: 'barbell', muscle: 'back', category: 'strength' },
  { id: 'squat', name: 'Squat', equipment: 'barbell', muscle: 'quadriceps', category: 'strength' },
], muscles: ['chest', 'other'], equipment: ['barbell', 'other'] };
const BENCH = 'Barbell Bench Press', ROW = 'Barbell Row';

// Baseline 80 x 5 on 20 Sep. Push on 12 Oct: bench warm-up 40 x 10, 82.5 x 5, 85 x 5 (the PR), 80 x 5; row 50 x 10 done and 50 x 10 not done.
const BASE = wk('w0', '2026-09-20', T(2026, 9, 20), [A('bench', [ws(5, 80)])], { name: 'Old day' });
const PUSH = () => wk('a', '2026-10-12', T(2026, 10, 12), [
  A('bench', [ws(10, 40, { warmup: true }), ws(5, 82.5), ws(5, 85), ws(5, 80)]),
  A('row', [ws(10, 50), ws(10, 50, { done: false })]),
], { name: 'Push' });
const ONE = () => wk('c', '2026-10-10', T(2026, 10, 10), [A('row', [ws(10, 50)])], { name: 'Single' }); // one done working set: nothing may take it away
const g = (workouts, o = {}) => ({ ...emptyGym(), workouts, ...o });
const mkApp = gym => {
  const a = { gym, saves: 0, navs: [], redirects: [], gymCorrupt: false, today: () => '2026-10-12', nav: p => a.navs.push(p), redirect: p => a.redirects.push(p),
    setGym(fn) { const n = fn(a.gym); if (n === a.gym) return true; a.gym = n; a.saves++; return true; } };
  return a;
};
const click = el => fire(el, 'click');
const type = (el, value) => { el.value = value; fire(el, 'input'); };
const pickDate = (el, value) => { el.value = value; fire(el, 'change'); };
const alertText = out => all(out).filter(n => n.getAttribute('role') === 'alert').map(n => n.textContent).join('|');
const wOf = (app, id = 'a') => app.gym.workouts.find(w => w.id === id);
const harness = (answer = {}) => {
  const log = { confirms: [], asks: [] };
  return { log, opts: {
    data: DATA, load() {}, now: () => NOW,
    confirm: (items, o) => { log.confirms.push({ items, o }); if (answer.confirm) items[0].onSelect(); },
    askName: (onDone, placeholder) => { log.asks.push(placeholder); if (answer.name !== undefined) onDone(answer.name); },
  } };
};
const detail = (app, id = 'a', h = harness()) => renderWorkoutDetail(app, id, h.opts);
const links = (out, prefix) => all(out).filter(n => n.tagName === 'A' && (n.getAttribute('href') ?? '').startsWith(prefix));
const setLabels = out => all(out).filter(n => hasClass(n, 'gw-n')).map(n => n.textContent);

// ---- router ----
test('router: #gym/history and #gym/history/<id> are pushed screens under Gym; look-alikes fall to Today', () => {
  assert.deepEqual(parseRoute('#gym/history'), { name: 'gym', params: ['history'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/history/'), { name: 'gym', params: ['history'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/history/w-1'), { name: 'gym', params: ['history', 'w-1'], tab: 'gym', pushed: true });
  for (const bad of ['#gym/history/w-1/x', '#gym/History', '#gym/history//x']) assert.equal(parseRoute(bad).name, 'today', bad);
  assert.equal(parseRoute('#gym/workout').pushed, true); // the open workout keeps its route
});

// ---- list ----
test('history list: header, a heading per month newest first, one link per finished workout', () => {
  const app = mkApp(g([BASE, PUSH(), ONE(), { ...wk('o', '2026-10-12', T(2026, 10, 12, 20), []), finishedAt: null }]));
  const out = renderHistory(app);
  assert.deepEqual(headings(out), ['October 2026', 'September 2026']);
  assert.deepEqual(links(out, '#gym/history/').map(l => l.getAttribute('href')), [historyHref('a'), historyHref('c'), historyHref('w0')]);
  assert.ok(texts(out).includes('History'));
  assert.ok(texts(out).includes('Push'));
  assert.ok(texts(out).includes('2 exercises · 4 sets · 75 min'));
  assert.ok(links(out, '#gym/history/').every(l => hasClass(l, 'gm-rw') && hasClass(l, 'gm-rl')));
});

test('history list: empty state is a sentence, not a blank page', () => {
  const out = renderHistory(mkApp(g([])));
  assert.ok(texts(out).includes('No workouts yet'));
  assert.equal(links(out, '#gym/history/').length, 0);
});

test('history list worst case: 100 workouts and a 60-character name draw 100 links, nothing dropped', () => {
  const long = 'N'.repeat(60);
  const ws100 = Array.from({ length: 100 }, (_, i) => { const d = new Date(2026, 5, 1 + i); return wk(`w${i}`, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, d.getTime(), [A('bench', [ws(5, 80)])], { name: i === 7 ? long : `Day ${i}` }); });
  const out = renderHistory(mkApp(g(ws100)));
  assert.equal(links(out, '#gym/history/').length, 100);
  assert.equal(texts(out).filter(t => t === long).length, 1);
  assert.deepEqual(headings(out), ['September 2026', 'August 2026', 'July 2026', 'June 2026']);
});

// ---- home ----
test('home: every Recent workouts row opens its detail; a History row opens the list and counts the workouts', () => {
  const app = mkApp(g([BASE, PUSH()]));
  const out = renderGymHome(app, { load() {}, now: () => NOW });
  assert.deepEqual(links(out, '#gym/history/').map(l => l.getAttribute('href')), [historyHref('a'), historyHref('w0')]);
  const row = links(out, '#gym/history').find(l => l.getAttribute('href') === '#gym/history');
  assert.ok(row, 'History row');
  assert.match(texts([row]).join('|'), /History/);
  assert.match(texts([row]).join('|'), /2 workouts/);
});

test('home: History row with no workouts says so; recent empty state stays', () => {
  const out = renderGymHome(mkApp(g([])), { load() {}, now: () => NOW });
  const row = links(out, '#gym/history').find(l => l.getAttribute('href') === '#gym/history');
  assert.match(texts([row]).join('|'), /No workouts yet/);
  assert.ok(texts(out).includes('No workouts yet'));
});

// ---- detail: what it shows ----
test('detail: name, date (not after today), length, and every set with its weight and reps', () => {
  const app = mkApp(g([BASE, PUSH()]));
  const out = detail(app);
  assert.equal(byLabel(out, 'Workout name').getAttribute('value'), 'Push');
  const date = byLabel(out, 'Workout date');
  assert.equal(date.getAttribute('type'), 'date');
  assert.equal(date.getAttribute('value'), '2026-10-12');
  assert.equal(date.getAttribute('max'), '2026-10-12');
  assert.ok(texts(out).includes('Length: 75 min'));
  assert.deepEqual(all(out).filter(n => n.tagName === 'H2' && hasClass(n, 'gw-en')).map(n => n.textContent), [BENCH, ROW]);
  assert.equal(byLabel(out, `${BENCH}, set 2 weight (kg)`).getAttribute('value'), '82.5');
  assert.equal(byLabel(out, `${BENCH}, set 2 reps`).getAttribute('value'), '5');
  assert.equal(byLabel(out, `${ROW}, set 2 weight (kg)`).getAttribute('value'), '50');
  assert.equal(all(out).filter(n => n.tagName === 'INPUT' && /weight/.test(n.getAttribute('aria-label') ?? '')).length, 6);
});

test('detail: warm-up, PR and not-done are written in the set label (text, not colour), PR only on the best set', () => {
  const out = detail(mkApp(g([BASE, PUSH()])));
  assert.deepEqual(setLabels(out), ['Set 1 · warm-up', 'Set 2', 'Set 3 · PR', 'Set 4', 'Set 1', 'Set 2 · not done']);
  const wu = byLabel(out, `${BENCH}, set 1 warm-up`);
  assert.equal(wu.getAttribute('aria-pressed'), 'true');
  assert.equal(byLabel(out, `${BENCH}, set 2 warm-up`).getAttribute('aria-pressed'), 'false');
});

test('detail: an exercise the list no longer has is "Unknown exercise"; while the list loads it says Loading…', () => {
  const w = wk('a', '2026-10-12', T(2026, 10, 12), [A('gone', [ws(5, 80)])]);
  assert.ok(texts(detail(mkApp(g([w])))).includes('Unknown exercise'));
  const h = harness();
  let loads = 0;
  const out = renderWorkoutDetail(mkApp(g([w])), 'a', { ...h.opts, data: null, load: () => { loads++; } });
  assert.equal(loads, 1);
  assert.ok(texts(out).includes('Loading…'));
});

test('detail: an unknown id, an open workout or an inherited key redirects to the list and draws nothing', () => {
  const open = { ...wk('o', '2026-10-12', T(2026, 10, 12), []), finishedAt: null };
  for (const id of ['nope', 'o', '__proto__', 'toString']) {
    const app = mkApp(g([PUSH(), open]));
    assert.deepEqual(detail(app, id), [], id);
    assert.deepEqual(app.redirects, ['#gym/history'], id);
  }
});

// ---- detail: edits, each saved at once ----
test('rename: every valid keystroke saves; blank is allowed; 61 characters are refused and nothing is saved', () => {
  const app = mkApp(g([PUSH()]));
  const out = detail(app);
  const name = byLabel(out, 'Workout name');
  type(name, ' Pull ');
  assert.equal(wOf(app).name, 'Pull');
  assert.equal(app.saves, 1);
  type(name, '   ');
  assert.equal(wOf(app).name, '');
  type(name, 'x'.repeat(61));
  assert.equal(wOf(app).name, '');
  assert.equal(app.saves, 2);
  assert.equal(alertText(out), 'Name must be 60 characters or fewer.');
  type(name, 'x'.repeat(60));
  assert.equal(wOf(app).name, 'x'.repeat(60));
  assert.equal(alertText(out), '');
});

test('date: a past or today date saves at once; a future, empty or impossible date is refused with a message and nothing changes', () => {
  const app = mkApp(g([PUSH()]));
  const out = detail(app);
  const date = byLabel(out, 'Workout date');
  pickDate(date, '2026-10-10');
  assert.equal(wOf(app).date, '2026-10-10');
  assert.equal(app.saves, 1);
  pickDate(date, '2026-10-13');
  assert.equal(wOf(app).date, '2026-10-10');
  assert.equal(alertText(out), "The date can't be in the future.");
  pickDate(date, '');
  assert.equal(alertText(out), 'Enter a valid date.');
  pickDate(date, '2026-02-30');
  assert.equal(wOf(app).date, '2026-10-10');
  assert.equal(alertText(out), 'Enter a valid date.');
  pickDate(date, '2026-10-12');
  assert.equal(wOf(app).date, '2026-10-12');
  assert.equal(alertText(out), '');
  assert.equal(app.saves, 2);
});

test('weight and reps: a valid number saves on the keystroke (comma allowed); half-typed or out-of-range values do not', () => {
  const app = mkApp(g([PUSH()]));
  const out = detail(app);
  const w = byLabel(out, `${BENCH}, set 3 weight (kg)`), r = byLabel(out, `${BENCH}, set 3 reps`);
  type(w, '87,5');
  assert.equal(wOf(app).items[0].sets[2].weight, 87.5);
  type(w, '');
  type(w, '1001');
  type(w, 'abc');
  assert.equal(wOf(app).items[0].sets[2].weight, 87.5);
  type(r, '6');
  assert.equal(wOf(app).items[0].sets[2].reps, 6);
  type(r, '0');
  type(r, '1000');
  assert.equal(wOf(app).items[0].sets[2].reps, 6);
  assert.equal(app.saves, 2);
  assert.deepEqual(wOf(app).items[0].sets[1], ws(5, 82.5)); // the other sets are untouched
});

test('warm-up toggle saves at once; making the only done working set a warm-up is refused with the reason', () => {
  const app = mkApp(g([PUSH(), ONE()]));
  click(byLabel(detail(app), `${BENCH}, set 4 warm-up`));
  assert.equal(wOf(app).items[0].sets[3].warmup, true);
  assert.equal(app.saves, 1);
  const before = JSON.stringify(app.gym);
  const out = detail(app, 'c');
  click(byLabel(out, `${ROW}, set 1 warm-up`));
  assert.equal(JSON.stringify(app.gym), before);
  assert.equal(alertText(out), 'A workout needs at least one done working set.');
});

test('add set: a new set counts (reps 1, weight 0, working, done) and goes at the end of that exercise', () => {
  const app = mkApp(g([PUSH()]));
  click(byLabel(detail(app), `Add set to ${ROW}`));
  assert.deepEqual(wOf(app).items[1].sets.at(-1), { reps: 1, weight: 0, warmup: false, done: true });
  assert.equal(wOf(app).items[1].sets.length, 3);
  assert.equal(wOf(app).items[0].sets.length, 4);
  assert.equal(app.saves, 1);
});

test('remove set: saves at once; removing the last done working set is refused with the reason', () => {
  const app = mkApp(g([PUSH(), ONE()]));
  click(byLabel(detail(app), `${ROW}, remove set 2`));
  assert.equal(wOf(app).items[1].sets.length, 1);
  assert.equal(app.saves, 1);
  const before = JSON.stringify(app.gym);
  const out = detail(app, 'c');
  click(byLabel(out, `${ROW}, remove set 1`));
  assert.equal(JSON.stringify(app.gym), before);
  assert.equal(alertText(out), 'A workout needs at least one done working set.');
});

test('remove exercise: asks first and only then deletes it; the only exercise with a done set cannot go', () => {
  const app = mkApp(g([PUSH(), ONE()]));
  const no = harness();
  click(byLabel(detail(app, 'a', no), `Remove ${ROW}`));
  assert.equal(no.log.confirms.length, 1);
  assert.match(no.log.confirms[0].o.message, /Barbell Row/);
  assert.equal(no.log.confirms[0].items[0].destructive, true);
  assert.equal(wOf(app).items.length, 2);
  const yes = harness({ confirm: true });
  click(byLabel(detail(app, 'a', yes), `Remove ${ROW}`));
  assert.deepEqual(wOf(app).items.map(i => i.exerciseId), ['bench']);
  assert.equal(app.saves, 1);
  const before = JSON.stringify(app.gym);
  const out = detail(app, 'c', yes);
  click(byLabel(out, `Remove ${ROW}`));
  assert.equal(JSON.stringify(app.gym), before);
  assert.equal(alertText(out), 'A workout needs at least one done working set.');
});

// ---- delete ----
test('delete workout: asks first; only the confirm removes it; other workouts and routines stay', () => {
  const routine = { id: 'r-1', name: 'R', createdAt: 1, items: [] };
  const app = mkApp(g([BASE, PUSH()], { routines: [routine] }));
  const no = harness();
  click(byLabel(detail(app, 'a', no), 'Delete workout'));
  assert.equal(no.log.confirms.length, 1);
  assert.equal(no.log.confirms[0].items[0].label, 'Delete workout');
  assert.equal(no.log.confirms[0].items[0].destructive, true);
  assert.match(no.log.confirms[0].o.message, /Push/);
  assert.equal(app.gym.workouts.length, 2);
  const yes = harness({ confirm: true });
  click(byLabel(detail(app, 'a', yes), 'Delete workout'));
  assert.deepEqual(app.gym.workouts.map(w => w.id), ['w0']);
  assert.deepEqual(app.gym.routines, [routine]);
  assert.ok(app.navs.includes('#gym/history'));
});

// ---- save as routine ----
test('save as routine: asks for a name (placeholder = workout name), saves working sets per exercise, then says so with a link', () => {
  resetDetailView();
  const app = mkApp(g([PUSH()]));
  const h = harness({ name: 'Push A' });
  click(byLabel(detail(app, 'a', h), 'Save as routine'));
  assert.deepEqual(h.log.asks, ['Push']);
  assert.equal(app.gym.routines.length, 1);
  const r = app.gym.routines[0];
  assert.equal(r.name, 'Push A');
  assert.equal(r.id, `r-${NOW}`);
  assert.equal(r.createdAt, NOW);
  // warm-ups left out; the undone row set still counts (ruling 14)
  assert.deepEqual(r.items, [
    { exerciseId: 'bench', sets: [{ reps: 5, weight: 82.5 }, { reps: 5, weight: 85 }, { reps: 5, weight: 80 }] },
    { exerciseId: 'row', sets: [{ reps: 10, weight: 50 }, { reps: 10, weight: 50 }] },
  ]);
  assert.equal(wOf(app).items.length, 2); // the workout is not changed
  const again = detail(app, 'a', harness());
  assert.ok(texts(again).includes('Saved as routine "Push A".'));
  assert.ok(links(again, '#gym/routine/').some(l => l.getAttribute('href') === routineHref(r.id)));
  resetDetailView();
  assert.ok(!texts(detail(app, 'a', harness())).includes('Saved as routine "Push A".'));
});

test('save as routine: cancelling the name sheet saves nothing; with no name asked the placeholder falls back to "Routine name"', () => {
  resetDetailView();
  const app = mkApp(g([PUSH(), wk('b', '2026-10-11', T(2026, 10, 11), [A('bench', [ws(5, 80)])], { name: '' })]));
  const h = harness();
  click(byLabel(detail(app, 'a', h), 'Save as routine'));
  click(byLabel(detail(app, 'b', h), 'Save as routine'));
  assert.deepEqual(h.log.asks, ['Push', 'Routine name']);
  assert.equal(app.gym.routines.length, 0);
  assert.equal(app.saves, 0);
});

// ---- worst case and rules ----
test('worst case: a 20-exercise workout with 60-character names draws 20 cards and every control is labelled', () => {
  const long = 'E'.repeat(60);
  const customs = Array.from({ length: 20 }, (_, i) => ({ id: `custom-${i + 1}`, name: i === 0 ? long : `Move ${i + 1}`, muscle: 'chest', equipment: 'barbell' }));
  const items = customs.map(c => A(c.id, [ws(8, 60), ws(8, 60), ws(8, 60, { warmup: true })]));
  const app = mkApp(g([wk('big', '2026-10-12', T(2026, 10, 12), items, { name: 'W'.repeat(60) })], { customExercises: customs }));
  const out = detail(app, 'big');
  assert.equal(all(out).filter(n => n.tagName === 'H2' && hasClass(n, 'gw-en')).length, 20);
  assert.equal(all(out).filter(n => n.tagName === 'INPUT' && /weight/.test(n.getAttribute('aria-label') ?? '')).length, 60);
  assert.equal(all(out).filter(n => n.tagName === 'INPUT' && /reps/.test(n.getAttribute('aria-label') ?? '')).length, 60);
  assert.equal(byLabel(out, 'Workout name').getAttribute('value').length, 60);
  assert.ok(texts(out).includes(long));
  const unlabeled = all(out).filter(n => (n.tagName === 'BUTTON' || n.tagName === 'INPUT') && !n.getAttribute('aria-label') && !n.textContent);
  assert.equal(unlabeled.length, 0);
});

test('the new view files have no timers and no forbidden date APIs', () => {
  for (const f of ['src/views/gymHistoryLogic.js', 'src/views/gymHistory.js', 'src/views/gymWorkoutDetail.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /setInterval|setTimeout|requestAnimationFrame/, f);
    assert.doesNotMatch(src, /toISOString|getUTC|Date\.parse|new Date\(['"`]/, f);
  }
  assert.doesNotMatch(read('src/gym.css'), /transition|animation|@keyframes/);
});

test('app.js routes history, and sw.js caches the three new files', () => {
  const app = read('src/app.js');
  assert.match(app, /renderHistory/);
  assert.match(app, /renderWorkoutDetail/);
  const sw = read('sw.js');
  for (const f of ['src/views/gymHistory.js', 'src/views/gymHistoryLogic.js', 'src/views/gymWorkoutDetail.js']) assert.ok(sw.includes(`'${f}'`), f);
});
