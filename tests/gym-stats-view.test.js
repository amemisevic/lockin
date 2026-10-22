import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byLabel, hasClass, headings, events } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { emptyGym } from '../src/core/gym.js';
import { renderGymStats, resetStatsView } from '../src/views/gymStats.js';
import { renderGymHome, resetGymHome } from '../src/views/gymHome.js';

// Gym G11s Stats screen: pushed route #gym/stats. Charts are inline SVG built with createElementNS (as Analytics does), text is HTML.
// Chart conventions this file pins (the code must produce them):
// - every chart sits in a div[role=img][aria-label = model label]; the svg inside is aria-hidden; the bar charts have no <text> (numbers are HTML).
// - bar charts (visits per week / month): svg viewBox "0 0 n max", preserveAspectRatio "none", one rect.an-tb track and (if the value is above 0)
//   one rect.an-bar per column, bar y = max - value, height = value; the week chart also has line.gs-target at y = max - target with
//   vector-effect non-scaling-stroke. Under it div.gs-nums holds one span per column (the number) and div.gs-cap two spans (first, last).
// - the weight chart (G11w): svg viewBox "0 0 W 218" (no stretching; W = 320, wider past 17 workouts), polyline.gs-line, line.gs-axis / .gs-tick /
//   .gs-grid, text.gs-tx (ticks, axis titles) and text.gs-lbl (kg labels), rect.gs-end (first), polygon.gs-end (latest), circle.gs-dot5 (every 5th),
//   circle.gs-pt (others). Only this chart has <text>; every number is also HTML (p.gs-sum, p.gs-dates, ul.gs-wl).
El.prototype.replaceChildren = function replaceChildren(...cs) { this.children = []; this.append(...cs); };

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = (y, m, d, hh = 10) => new Date(y, m - 1, d, hh).getTime();
const ws = (reps, weight, o = {}) => ({ reps, weight, warmup: false, done: true, ...o });
const A = (exerciseId, sets) => ({ exerciseId, sets });
const wk = (id, date, items, o = {}) => {
  const [y, m, d] = date.split('-').map(Number), s = T(y, m, d);
  return { id, date, startedAt: s, finishedAt: s + 3_600_000, name: id, routineId: null, items, ...o };
};
const g = (workouts, o = {}) => ({ ...emptyGym(), workouts, ...o });
const DATA = { exercises: [
  { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
  { id: 'pushdown', name: 'Triceps Pushdown', equipment: 'cable', muscle: 'triceps', category: 'strength' },
  { id: 'row', name: 'Barbell Row', equipment: 'barbell', muscle: 'back', category: 'strength' },
], muscles: ['chest', 'other'], equipment: ['barbell', 'other'] };
const R = [A('row', [ws(12, 0)])]; // a done working set with no weight (bodyweight), so filler visits add no weight points

// Visits (hand count): weeks from 27 Jul = 0 0 1 0 0 0 0 0 0 1 3 1; months from Nov 2025 = 0 x8, 1 1 1 4.
// Muscles this week (12 Oct): chest 3 (+ a warm-up that does not count), triceps 3, back 2.
// Bench weight (heaviest working set): 80 (10 Aug), 60 (30 Sep), 82.5 (5 Oct), 80 (12 Oct); the two early days are also visit days above. Row: 50 on 12 Oct. Pushdown: 30.
const GYM = g([
  wk('a1', '2026-07-20', R), wk('a2', '2026-08-10', R), wk('a3', '2026-09-30', R),
  wk('b1', '2026-10-05', [A('bench', [ws(5, 82.5)])]), wk('b2', '2026-10-07', R), wk('b3', '2026-10-07', R), wk('b4', '2026-10-11', R),
  wk('p1', '2026-08-10', [A('bench', [ws(5, 80)])]), wk('p2', '2026-09-30', [A('bench', [ws(1, 100, { warmup: true }), ws(10, 60), ws(12, 50)])]),
  wk('m1', '2026-10-12', [
    A('bench', [ws(10, 40, { warmup: true }), ws(5, 80), ws(5, 80), ws(5, 80)]),
    A('pushdown', [ws(12, 30), ws(12, 30), ws(12, 30)]),
    A('row', [ws(10, 50), ws(10, 50), ws(10, 50, { done: false })]),
  ]),
  wk('open', '2026-10-13', R, { finishedAt: null }),
]);
const mkApp = gym => ({ gym, gymCorrupt: false, today: () => '2026-10-12', nav() {}, redirect() {}, setGym() { return true; } });
const harness = (o = {}) => { const log = { loads: [], retries: [] }; return { log, opts: { data: DATA, load: fn => log.loads.push(fn), failed: false, retry: fn => log.retries.push(fn), ...o } }; };
const screen = (gym = GYM, o) => { const h = harness(o); return { out: renderGymStats(mkApp(gym), h.opts), log: h.log }; };
const sections = out => all(out).filter(n => n.tagName === 'SECTION');
const section = (out, title) => sections(out).find(s => headings([s])[0] === title);
const imgs = out => all(out).filter(n => n.getAttribute('role') === 'img');
const kids = (n, tag, cls) => all([n]).filter(x => x !== n && x.tagName === tag.toUpperCase() && (!cls || hasClass(x, cls)));

test.beforeEach(() => resetStatsView());

// ---- route and entry ----
test('router: #gym/stats is a pushed screen under Gym; look-alikes fall to Today', () => {
  assert.deepEqual(parseRoute('#gym/stats'), { name: 'gym', params: ['stats'], tab: 'gym', pushed: true });
  assert.deepEqual(parseRoute('#gym/stats/'), { name: 'gym', params: ['stats'], tab: 'gym', pushed: true });
  for (const bad of ['#gym/stats/x', '#gym/stat', '#gym/Stats', '#stats']) assert.equal(parseRoute(bad).name, 'today', bad);
});

test('app.js routes #gym/stats to the Stats screen', () => {
  const src = read('src/app.js');
  assert.match(src, /import \{ renderGymStats \} from '\.\/views\/gymStats\.js'/);
  assert.match(src, /p === 'stats'\) return renderGymStats\(app\)/);
});

test('Gym home has a Stats row linking to #gym/stats (same whole-row link as History)', () => {
  resetGymHome();
  const out = renderGymHome({ ...mkApp(GYM), nav() {} }, { load() {}, now: () => T(2026, 10, 12) });
  const a = all(out).find(n => n.tagName === 'A' && n.getAttribute('href') === '#gym/stats');
  assert.ok(a, 'no Stats link');
  assert.equal(a.id, 'gm-stats');
  assert.ok(hasClass(a, 'gm-link'));
  assert.match(a.textContent, /^Stats/);
});

// ---- screen ----
test('header: pushed header titled Stats with a Back button', () => {
  const { out } = screen();
  assert.equal(all(out).find(n => n.tagName === 'H1').textContent, 'Stats');
  assert.ok(byLabel(out, 'Back'));
});

test('no finished workout: one empty message, no chart, no section', () => {
  const { out } = screen(emptyGym());
  assert.ok(texts(out).includes('No workouts yet'));
  assert.equal(imgs(out).length, 0);
  assert.equal(headings(out).length, 0);
});

test('four sections in order', () => {
  assert.deepEqual(headings(screen().out), ['Visits per week', 'Visits per month', 'Sets per muscle this week', 'Weight progress']);
});

test('every chart is a role=img with a spoken label and a hidden svg; the bar charts hold no <text>', () => {
  const { out } = screen();
  assert.ok(imgs(out).length >= 5);
  for (const i of imgs(out)) assert.ok(i.getAttribute('aria-label'), 'role=img without a label');
  for (const s of all(out).filter(n => n.tagName === 'SVG' && n.getAttribute('viewBox'))) assert.equal(s.getAttribute('aria-hidden'), 'true');
  for (const t of ['Visits per week', 'Visits per month', 'Sets per muscle this week']) assert.equal(all([section(out, t)]).filter(n => n.tagName === 'TEXT').length, 0, t);
});

// ---- visits ----
test('weekly chart: 12 columns, bars for 1 1 3 1, a dashed target line at 4, scale 5', () => {
  const sec = section(screen().out, 'Visits per week');
  const wrap = sec && all([sec]).find(n => n.getAttribute('aria-label')?.startsWith('Visits per week for the last 12 weeks'));
  assert.ok(wrap);
  assert.equal(wrap.getAttribute('aria-label'), 'Visits per week for the last 12 weeks, oldest first, target 4: 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 1');
  const svg = kids(wrap, 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 12 5');
  assert.equal(svg.getAttribute('preserveAspectRatio'), 'none');
  assert.equal(kids(svg, 'rect', 'an-tb').length, 12);
  const bars = kids(svg, 'rect', 'an-bar');
  assert.deepEqual(bars.map(b => Number(b.getAttribute('height'))), [1, 1, 3, 1]);
  assert.deepEqual(bars.map(b => Number(b.getAttribute('y'))), [4, 4, 2, 4]);
  const xs = bars.map(b => Number(b.getAttribute('x')));
  assert.deepEqual([...xs].sort((a, b) => a - b), xs, 'bars run left to right');
  assert.deepEqual(xs.map(Math.floor), [2, 9, 10, 11]);
  const line = kids(svg, 'line', 'gs-target');
  assert.equal(line.length, 1);
  assert.equal(line[0].getAttribute('y1'), '1');
  assert.equal(line[0].getAttribute('y2'), '1');
  assert.equal(line[0].getAttribute('x1'), '0');
  assert.equal(line[0].getAttribute('x2'), '12');
  assert.equal(line[0].getAttribute('vector-effect'), 'non-scaling-stroke');
});

test('weekly chart: the numbers, the two captions and the target are printed as text (not colour or line style alone)', () => {
  const sec = section(screen().out, 'Visits per week');
  const nums = all([sec]).find(n => hasClass(n, 'gs-nums'));
  assert.deepEqual(nums.children.map(c => c.textContent), ['0', '0', '1', '0', '0', '0', '0', '0', '0', '1', '3', '1']);
  const cap = all([sec]).find(n => hasClass(n, 'gs-cap'));
  assert.deepEqual(cap.children.map(c => c.textContent), ['27 Jul', 'This week']);
  assert.ok(texts([sec]).includes('Target 4 a week'));
});

test('monthly chart: 12 columns, bars for 1 1 1 4, scale 4, no target line', () => {
  const sec = section(screen().out, 'Visits per month');
  const wrap = all([sec]).find(n => n.getAttribute('aria-label')?.startsWith('Visits per month for the last 12 months'));
  assert.ok(wrap);
  assert.equal(wrap.getAttribute('aria-label'), 'Visits per month for the last 12 months, oldest first: 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 4');
  const svg = kids(wrap, 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 12 4');
  assert.deepEqual(kids(svg, 'rect', 'an-bar').map(b => Number(b.getAttribute('height'))), [1, 1, 1, 4]);
  assert.equal(kids(svg, 'line', 'gs-target').length, 0);
  assert.deepEqual(all([sec]).find(n => hasClass(n, 'gs-cap')).children.map(c => c.textContent), ['Nov 2025', 'Oct 2026']);
});

test('a week target of 7 moves the line and the scale', () => {
  const sec = section(screen({ ...GYM, settings: { weeklyTarget: 7 } }).out, 'Visits per week');
  const svg = kids(all([sec]).find(n => n.getAttribute('role') === 'img'), 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 12 8');
  assert.equal(kids(svg, 'line', 'gs-target')[0].getAttribute('y1'), '1');
  assert.ok(texts([sec]).includes('Target 7 a week'));
});

// ---- muscles ----
test('muscles: one row per muscle with name, count and a share bar; the row is spoken as a whole', () => {
  const sec = section(screen().out, 'Sets per muscle this week');
  const rows = all([sec]).filter(n => hasClass(n, 'an-br'));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(r => r.children[0].textContent), ['Chest3', 'Triceps3', 'Back2']);
  const bars = rows.map(r => all([r]).find(n => hasClass(n, 'an-bar')));
  assert.deepEqual(bars.map(b => Number(b.getAttribute('width')).toFixed(4)), ['1.0000', '1.0000', '0.6667']);
  assert.deepEqual(rows.map(r => all([r]).find(n => n.getAttribute('role') === 'img').getAttribute('aria-label')), ['Chest: 3 sets', 'Triceps: 3 sets', 'Back: 2 sets']);
});

test('muscles: a week with no sets says so', () => {
  const sec = section(screen(g([wk('x', '2026-10-05', R)])).out, 'Sets per muscle this week');
  assert.ok(texts([sec]).includes('No sets this week yet'));
  assert.equal(all([sec]).filter(n => hasClass(n, 'an-br')).length, 0);
});

test('muscles: while the exercise list loads, a Loading line and a load call (no guessed muscles)', () => {
  const { out, log } = screen(GYM, { data: null });
  const sec = section(out, 'Sets per muscle this week');
  assert.ok(texts([sec]).includes('Loading exercises…'));
  assert.equal(all([sec]).filter(n => hasClass(n, 'an-br')).length, 0);
  assert.equal(log.loads.length, 1);
  assert.equal(typeof log.loads[0], 'function');
});

test('muscles: a failed load says so and offers Try again (44 px ghost button), which calls retry', () => {
  const { out, log } = screen(GYM, { data: null, failed: true });
  const sec = section(out, 'Sets per muscle this week');
  assert.ok(texts([sec]).includes('The exercise list could not be loaded.'));
  const btn = all([sec]).find(n => n.tagName === 'BUTTON');
  assert.equal(btn.textContent, 'Try again');
  assert.ok(hasClass(btn, 'btn-ghost'));
  assert.equal(log.loads.length, 0);
  fire(btn, 'click');
  assert.equal(log.retries.length, 1);
  assert.equal(typeof log.retries[0], 'function');
});

// ---- weight progress ----
const WSEC = out => section(out, 'Weight progress');
const wchart = sec => all([sec]).find(n => (n.getAttribute('aria-label') ?? '').startsWith('Weight progress,'));
const bench30 = g(Array.from({ length: 30 }, (_, i) => wk(`k${i}`, `2026-08-${String(1 + i).padStart(2, '0')}`, [A('bench', [ws(5, 50 + i)])])));

// G11w2: the section starts empty. picked(id) = the screen after choosing `id` in the select (the choice is view state, as in the app).
const picked = (id, gym = GYM, o) => {
  const app = mkApp(gym), h = harness(o), sel = all(renderGymStats(app, h.opts)).find(n => n.tagName === 'SELECT');
  sel.value = id;
  fire(sel, 'change');
  return renderGymStats(app, h.opts);
};
const EMPTY_LINE = 'Pick an exercise to see your weight progress.';

test('exercise picker: starts on a "Choose an exercise" placeholder, then the exercises with a weight, newest first', () => {
  const sec = WSEC(screen().out);
  const sel = all([sec]).find(n => n.tagName === 'SELECT');
  assert.equal(sel.id, 'gs-ex');
  assert.ok(hasClass(sel, 'in'));
  const label = all([sec]).find(n => n.tagName === 'LABEL');
  assert.equal(label.getAttribute('for'), 'gs-ex');
  assert.equal(label.textContent, 'Exercise');
  assert.deepEqual(sel.children.map(o => [o.getAttribute('value'), o.textContent]), [['', 'Choose an exercise'], ['bench', 'Barbell Bench Press'], ['pushdown', 'Triceps Pushdown'], ['row', 'Barbell Row']]);
  assert.deepEqual(sel.children.map(o => o.getAttribute('selected') !== null), [true, false, false, false]);
});

test('weight section on load: one short line and nothing else (no chart, no Start line, no dates, no list, no swipe hint)', () => {
  for (const gym of [GYM, bench30]) {
    const sec = WSEC(screen(gym).out);
    assert.ok(texts([sec]).includes(EMPTY_LINE));
    assert.equal(imgs([sec]).length, 0);
    assert.equal(all([sec]).filter(n => ['gs-sum', 'gs-dates', 'gs-wl', 'gs-hint', 'gs-wchart'].some(c => hasClass(n, c))).length, 0);
    assert.equal(all([sec]).filter(n => (n.tagName === 'SVG' && n.getAttribute('viewBox')) || n.tagName === 'UL').length, 0); // the heading's icon svg has no viewBox in the fake DOM
    assert.ok(!texts([sec]).some(t => /^(Start |First workout|Workout \d|Swipe)/.test(t)));
  }
});

test('picking an exercise shows the chart, the text and the list and drops the one-line prompt', () => {
  const sec = WSEC(picked('bench'));
  assert.ok(!texts([sec]).includes(EMPTY_LINE));
  assert.ok(wchart(sec));
  assert.ok(texts([sec]).includes('Start 80 kg, now 80 kg, +0 kg'));
  assert.equal(all([sec]).find(n => n.tagName === 'SELECT').children.map(o => o.getAttribute('selected') !== null).join(), 'false,true,false,false');
});

test('picking the placeholder again clears everything; the choice is view state: resetStatsView starts empty again', () => {
  const app = mkApp(GYM), h = harness(), sel = all(renderGymStats(app, h.opts)).find(n => n.tagName === 'SELECT');
  sel.value = 'row';
  fire(sel, 'change');
  assert.ok(wchart(WSEC(renderGymStats(app, h.opts))));
  sel.value = '';
  fire(sel, 'change');
  const cleared = WSEC(renderGymStats(app, h.opts));
  assert.equal(wchart(cleared), undefined);
  assert.ok(texts([cleared]).includes(EMPTY_LINE));
  assert.equal(all([cleared]).find(n => n.tagName === 'SELECT').children[0].getAttribute('selected') !== null, true);
  fire(sel, 'change', { target: { value: 'bench' } });
  assert.ok(wchart(WSEC(renderGymStats(app, h.opts))));
  resetStatsView();
  assert.equal(wchart(WSEC(renderGymStats(app, h.opts))), undefined);
});

test('the choice is not saved: the view never writes storage and the gym state is untouched', () => {
  const gym = structuredClone(GYM), before = JSON.stringify(gym), app = { ...mkApp(gym), setGym() { throw new Error('saved'); } };
  const h = harness(), sel = all(renderGymStats(app, h.opts)).find(n => n.tagName === 'SELECT');
  sel.value = 'bench';
  fire(sel, 'change');
  renderGymStats(app, h.opts);
  assert.equal(JSON.stringify(gym), before);
  assert.doesNotMatch(read('src/views/gymStats.js').replace(/\/\/.*$/gm, ''), /localStorage|sessionStorage|setGym/);
});

test('exercise picker: choosing another exercise redraws the chart for it', () => {
  const app = mkApp(GYM), h = harness();
  const out = renderGymStats(app, h.opts);
  const sel = all(out).find(n => n.tagName === 'SELECT');
  const before = events.length;
  sel.value = 'row';
  fire(sel, 'change');
  assert.ok(events.length > before, 'no re-render requested');
  const again = WSEC(renderGymStats(app, h.opts));
  assert.deepEqual(all([again]).find(n => n.tagName === 'SELECT').children.map(o => o.getAttribute('selected') !== null), [false, false, false, true]);
  assert.equal(wchart(again).getAttribute('aria-label'), 'Weight progress, Barbell Row, 1 workout, oldest first: 50 kg');
});

test('weight text above the chart: start, now and the change, then the first and latest date', () => {
  const sec = WSEC(picked('bench'));
  assert.ok(texts([sec]).includes('Start 80 kg, now 80 kg, +0 kg'));
  assert.ok(texts([sec]).includes('First workout 10 Aug 2026, latest 12 Oct 2026'));
  const ps = all([sec]).filter(n => n.tagName === 'P');
  assert.ok(hasClass(ps.find(p => p.textContent.startsWith('Start ')), 'gs-sum'));
  const order = all([sec]).filter(n => n === wchart(sec) || n.textContent === 'Start 80 kg, now 80 kg, +0 kg');
  assert.equal(order[0].textContent, 'Start 80 kg, now 80 kg, +0 kg', 'the text comes before the chart');
});

test('weight list under the chart: every workout, number, date and kg, as text, oldest first', () => {
  const sec = WSEC(picked('bench'));
  const ul = all([sec]).find(n => n.tagName === 'UL' && hasClass(n, 'gs-wl'));
  assert.deepEqual(ul.children.map(li => li.textContent), ['Workout 1 · 10 Aug 2026 · 80 kg', 'Workout 2 · 30 Sep 2026 · 60 kg', 'Workout 3 · 5 Oct 2026 · 82.5 kg', 'Workout 4 · 12 Oct 2026 · 80 kg']);
});

test('weight chart: role=img with the spoken numbers; svg 320 x 218, hidden from VoiceOver, round dots (no stretching), fits the screen', () => {
  const wrap = wchart(WSEC(picked('bench')));
  assert.equal(wrap.getAttribute('aria-label'), 'Weight progress, Barbell Bench Press, 4 workouts, oldest first: 80, 60, 82.5, 80 kg');
  assert.equal(wrap.getAttribute('role'), 'img');
  const svg = kids(wrap, 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 320 218');
  assert.equal(svg.getAttribute('aria-hidden'), 'true');
  assert.equal(svg.getAttribute('preserveAspectRatio'), null);
  assert.equal(svg.getAttribute('width'), '100%');
});

test('weight chart: one polyline through the four points; first is a square, latest a diamond, the others small circles', () => {
  const svg = kids(wchart(WSEC(picked('bench'))), 'svg')[0];
  assert.equal(kids(svg, 'polyline', 'gs-line')[0].getAttribute('points'), '44,54 119.33,174 194.67,39 270,54');
  const sq = kids(svg, 'rect', 'gs-end');
  assert.equal(sq.length, 1);
  assert.deepEqual(['x', 'y', 'width', 'height'].map(k => Number(sq[0].getAttribute(k))), [38, 48, 12, 12]); // centred on 44,54
  const di = kids(svg, 'polygon', 'gs-end');
  assert.equal(di.length, 1);
  assert.equal(di[0].getAttribute('points'), '270,46 278,54 270,62 262,54'); // centred on 270,54
  assert.deepEqual(kids(svg, 'circle', 'gs-pt').map(c => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')]), [['119.33', '174', '3'], ['194.67', '39', '3']]);
  assert.equal(kids(svg, 'circle', 'gs-dot5').length, 0);
});

test('weight chart: only the first and the latest point carry a kg label inside the chart', () => {
  const lbl = kids(kids(wchart(WSEC(picked('bench'))), 'svg')[0], 'text', 'gs-lbl');
  assert.deepEqual(lbl.map(t => t.textContent), ['80', '80']);
  assert.deepEqual(lbl.map(t => ['x', 'y', 'text-anchor'].map(k => t.getAttribute(k))), [['42', '44', 'start'], ['280', '58', 'start']]); // above the first, right of the latest
});

test('weight chart: every 5th workout is a bigger dot with its kg label (12 workouts: 5 and 10), other points have none', () => {
  const gym = g(Array.from({ length: 12 }, (_, i) => wk(`q${i}`, `2026-09-${String(1 + i).padStart(2, '0')}`, [A('bench', [ws(5, 50 + (i * 5) / 2)])])));
  const svg = kids(wchart(WSEC(picked('bench', gym))), 'svg')[0];
  assert.deepEqual(kids(svg, 'circle', 'gs-dot5').map(c => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')]), [['126.18', '124', '5'], ['228.91', '61.5', '5']]);
  assert.equal(kids(svg, 'circle', 'gs-pt').length, 12 - 2 - 2);
  const lbl = kids(svg, 'text', 'gs-lbl');
  assert.deepEqual(lbl.map(t => t.textContent), ['50', '60', '72.5', '77.5']);
  assert.deepEqual(lbl.slice(1, 3).map(t => [t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('text-anchor')]), [['126.18', '114', 'middle'], ['228.91', '51.5', 'middle']]);
});

test('weight chart: drawn axes, ticks, light gridlines and both axis titles', () => {
  const svg = kids(wchart(WSEC(picked('bench'))), 'svg')[0];
  const axes = kids(svg, 'line', 'gs-axis').map(l => ['x1', 'y1', 'x2', 'y2'].map(k => l.getAttribute(k)).join(' '));
  assert.deepEqual(axes, ['44 174 270 174', '44 24 44 174']); // x axis (workouts), y axis (kg)
  assert.equal(kids(svg, 'line', 'gs-grid').length, 6);
  assert.deepEqual(kids(svg, 'line', 'gs-grid').map(l => l.getAttribute('y1')), ['174', '144', '114', '84', '54', '24']);
  assert.equal(kids(svg, 'line', 'gs-tick').length, 6 + 2, '6 kg ticks and 2 workout ticks');
  const tx = kids(svg, 'text', 'gs-tx');
  assert.deepEqual(tx.map(t => t.textContent), ['60', '65', '70', '75', '80', '85', '1', '4', 'kg', 'Workout number']);
  assert.deepEqual(tx.slice(0, 2).map(t => [t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('text-anchor')]), [['36', '178', 'end'], ['36', '148', 'end']]);
  assert.deepEqual(tx.slice(6, 8).map(t => [t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('text-anchor')]), [['44', '194', 'middle'], ['270', '194', 'middle']]);
  assert.match(tx[8].getAttribute('transform'), /^rotate\(-90 /);
  assert.deepEqual([tx[9].getAttribute('x'), tx[9].getAttribute('y')], ['157', '212']);
});

test('weight chart: ALL workouts drawn, none cut; 30 workouts make a wider chart that scrolls inside its box, 1:1', () => {
  const sec = WSEC(picked('bench', bench30));
  const wrap = wchart(sec);
  const svg = kids(wrap, 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 500 218');
  assert.equal(svg.getAttribute('width'), '500');
  assert.ok(hasClass(wrap, 'gs-wchart'));
  assert.equal(kids(svg, 'polyline', 'gs-line')[0].getAttribute('points').split(' ').length, 30);
  assert.equal(all([sec]).find(n => n.tagName === 'UL' && hasClass(n, 'gs-wl')).children.length, 30);
  assert.equal(kids(svg, 'circle', 'gs-dot5').length, 5, 'workouts 5, 10, 15, 20, 25 (30 is the latest)');
  assert.ok(texts([sec]).includes('Start 50 kg, now 79 kg, +29 kg'));
});

test('weight chart: a wide chart says to swipe; a chart that fits does not', () => {
  assert.ok(texts([WSEC(picked('bench', bench30))]).includes('Swipe the chart sideways to see all 30 workouts.'));
  assert.ok(!texts([WSEC(picked('bench'))]).some(t => t.startsWith('Swipe')));
});

test('weight block: no weights yet says so and shows no select', () => {
  const only = g([wk('w', '2026-10-12', [A('bench', [ws(5, 80, { warmup: true }), ws(12, 0)])])]);
  const sec = WSEC(screen(only).out);
  assert.ok(texts([sec]).includes('No sets with a weight yet. Log a done working set with a weight above 0.'));
  assert.equal(all([sec]).filter(n => n.tagName === 'SELECT').length, 0);
  assert.equal(imgs([sec]).length, 0);
});

test('weight block while names load: bundled names read Loading… (the chart itself needs no list)', () => {
  const sec = WSEC(screen(GYM, { data: null }).out);
  assert.deepEqual(all([sec]).find(n => n.tagName === 'SELECT').children.map(o => o.textContent), ['Choose an exercise', 'Loading…', 'Loading…', 'Loading…']);
});

test('the 1RM chart is gone: no estimated 1RM text, no PR diamond, no tiles', () => {
  const out = screen().out;
  assert.ok(!headings(out).includes('Estimated 1RM'));
  assert.ok(!texts(out).some(t => /1RM|\bPR\b/.test(t)));
  assert.equal(all(out).filter(n => hasClass(n, 'an-tile') || hasClass(n, 'gs-pr')).length, 0);
});

// ---- worst case ----
test('worst case: 100 workouts, a 60-character exercise name and 60 exercises render without throwing, every number stays text', () => {
  const long = 'X'.repeat(60);
  const gym = g(Array.from({ length: 100 }, (_, i) => wk(`w${i}`, `2026-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, '0')}`,
    Array.from({ length: 60 }, (_, k) => A(k === 0 ? 'custom-1' : `e${k}`, [ws(5, 40 + i)])))), { customExercises: [{ id: 'custom-1', name: long, muscle: 'chest', equipment: 'other' }] });
  const { out } = screen(gym);
  const sel = all(out).find(n => n.tagName === 'SELECT');
  assert.ok(sel.children.length >= 60);
  assert.ok(sel.children.some(o => o.textContent === long));
  for (const i of imgs(out)) assert.ok(i.getAttribute('aria-label'));
});

// ---- source and style rules ----
const FILES = ['src/views/gymStats.js', 'src/views/gymStatsLogic.js', 'src/views/gymStatsCharts.js'];
test('new files: no timers, no animation frames, no forbidden date APIs, no clock, no libraries, no innerHTML', () => {
  for (const f of FILES) {
    const src = read(f).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /setInterval|setTimeout|requestAnimationFrame|toISOString|getUTC|Date\.parse|new Date\(|Date\.now|innerHTML/, f);
    for (const m of src.matchAll(/from '([^']+)'/g)) assert.match(m[1], /^\.\.?\//, `${f} imports ${m[1]}`);
  }
});

test('new files are small (under 300 lines) and in the service worker list', () => {
  const sw = read('sw.js');
  for (const f of FILES) {
    assert.ok(read(f).split('\n').length < 300, f);
    assert.ok(sw.includes(`'${f}'`), `${f} missing from sw.js ASSETS`);
  }
});

const css = read('src/gym.css');
test('gym.css: Stats rules exist, no animation or transition, every font size is 11 px or more', () => {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const sel of ['.gs-target', '.gs-line', '.gs-pt', '.gs-dot5', '.gs-end', '.gs-axis', '.gs-tick', '.gs-grid', '.gs-tx', '.gs-lbl', '.gs-nums', '.gs-cap', '.gs-wchart', '.gs-wl']) assert.ok(bare.includes(`${sel}{`) || bare.includes(`${sel} `), `no rule ${sel}`);
  assert.doesNotMatch(bare, /animation|transition|@keyframes|\.gs-pr\b/);
  for (const m of bare.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 11, `font-size ${m[1]}px`);
  assert.match(css, /\.gs-wchart\{[^}]*overflow-x:auto/, 'a wide chart scrolls inside its own box');
});

// Contrast >= 3 for the chart graphics and >= 4.5 for the chart text, on both plate stops (helpers as in tests/contrast-graphics.test.js).
const styles = read('styles.css');
const D0 = styles.indexOf('/* tokens:dark */');
const dark = Object.fromEntries([...styles.slice(D0, styles.indexOf('}', D0)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]));
const rgb = hx => [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16));
const lum = c => { const [r, gg, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * gg + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const decl = (sel, prop) => {
  const m = css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel} not found (one rule per line)`);
  const v = m[1].match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
  assert.ok(v, `${sel} has no ${prop}`);
  return v;
};
const checks = [['.gs-target', 'stroke', 3], ['.gs-line', 'stroke', 3], ['.gs-pt', 'fill', 3], ['.gs-dot5', 'fill', 3], ['.gs-end', 'fill', 3], ['.gs-end', 'stroke', 3],
  ['.gs-axis', 'stroke', 3], ['.gs-tick', 'stroke', 3], ['.gs-tx', 'fill', 4.5], ['.gs-lbl', 'fill', 4.5]];
for (const [sel, prop, min] of checks) {
  test(`contrast: ${sel} ${prop} is ${min}:1 on both plate stops`, () => {
    const token = decl(sel, prop).match(/^var\((--[\w-]+)\)$/)?.[1];
    assert.ok(token && dark[token], `${sel} ${prop} must be a colour token`);
    for (const st of ['--plate-top', '--plate-bot']) assert.ok(ratio(rgb(dark[token]), rgb(dark[st])) >= min, `${sel} ${prop} on ${st}`);
  });
}
test('the marks differ by shape, not only by colour: square first, diamond latest, big circle every 5th, small circle otherwise', () => {
  const src = read('src/views/gymStatsCharts.js');
  for (const shape of ["'rect'", "'polygon'", "'circle'"]) assert.ok(src.includes(shape), shape);
  assert.notEqual(decl('.gs-dot5', 'fill'), decl('.gs-pt', 'fill'));
});
