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
// - every chart sits in a div[role=img][aria-label = model label]; the svg inside is aria-hidden and has no <text> (numbers are HTML).
// - bar charts (visits per week / month): svg viewBox "0 0 n max", preserveAspectRatio "none", one rect.an-tb track and (if the value is above 0)
//   one rect.an-bar per column, bar y = max - value, height = value; the week chart also has line.gs-target at y = max - target with
//   vector-effect non-scaling-stroke. Under it div.gs-nums holds one span per column (the number) and div.gs-cap two spans (first, last).
// - the 1RM chart: svg viewBox "0 0 320 120" (no stretching), polyline.gs-line, circle.gs-pt for every ordinary point, polygon.gs-pr (a diamond)
//   for every PR point; PRs are also listed as text ending in "PR". Tiles are div.an-tile (.an-n number, .an-l label).
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
const R = [A('row', [ws(10, 50)])];

// Visits (hand count): weeks from 27 Jul = 0 0 1 0 0 0 0 0 0 1 3 1; months from Nov 2025 = 0 x8, 1 1 1 4.
// Muscles this week (12 Oct): chest 3 (+ a warm-up that does not count), triceps 3, back 2.
// Bench 1RM: 93.3, 80.0, 96.3 (PR), 93.3. Row: 66.7 on 10 Oct.
const GYM = g([
  wk('a1', '2026-07-20', R), wk('a2', '2026-08-10', R), wk('a3', '2026-09-30', R),
  wk('b1', '2026-10-05', [A('bench', [ws(5, 82.5)])]), wk('b2', '2026-10-07', R), wk('b3', '2026-10-07', R), wk('b4', '2026-10-11', R),
  wk('p1', '2026-09-20', [A('bench', [ws(5, 80)])]), wk('p2', '2026-09-27', [A('bench', [ws(1, 100, { warmup: true }), ws(10, 60), ws(12, 50)])]),
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
  assert.deepEqual(headings(screen().out), ['Visits per week', 'Visits per month', 'Sets per muscle this week', 'Estimated 1RM']);
});

test('every chart is a role=img with a spoken label, its svg is hidden from VoiceOver and holds no <text>', () => {
  const { out } = screen();
  assert.ok(imgs(out).length >= 5);
  for (const i of imgs(out)) assert.ok(i.getAttribute('aria-label'), 'role=img without a label');
  for (const s of all(out).filter(n => n.tagName === 'SVG' && n.getAttribute('viewBox'))) assert.equal(s.getAttribute('aria-hidden'), 'true');
  assert.equal(all(out).filter(n => n.tagName === 'TEXT').length, 0);
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

// ---- 1RM chart ----
test('exercise picker: a labelled select of trained exercises, newest first, the first selected', () => {
  const sec = section(screen().out, 'Estimated 1RM');
  const sel = all([sec]).find(n => n.tagName === 'SELECT');
  assert.equal(sel.id, 'gs-ex');
  assert.ok(hasClass(sel, 'in'));
  const label = all([sec]).find(n => n.tagName === 'LABEL');
  assert.equal(label.getAttribute('for'), 'gs-ex');
  assert.equal(label.textContent, 'Exercise');
  const opts = sel.children;
  assert.deepEqual(opts.map(o => [o.getAttribute('value'), o.textContent]), [['bench', 'Barbell Bench Press'], ['row', 'Barbell Row']]);
  assert.deepEqual(opts.map(o => o.getAttribute('selected') !== null), [true, false]);
});

test('exercise picker: choosing another exercise redraws the chart for it', () => {
  const app = mkApp(GYM), h = harness();
  const out = renderGymStats(app, h.opts);
  const sel = all(out).find(n => n.tagName === 'SELECT');
  const before = events.length;
  sel.value = 'row';
  fire(sel, 'change');
  assert.ok(events.length > before, 'no re-render requested');
  const again = renderGymStats(app, h.opts);
  const sec = section(again, 'Estimated 1RM');
  assert.deepEqual(all([sec]).find(n => n.tagName === 'SELECT').children.map(o => o.getAttribute('selected') !== null), [false, true]);
  assert.ok(all([sec]).some(n => (n.getAttribute('aria-label') ?? '').startsWith('Estimated 1RM, Barbell Row, 1 workout, oldest first: 66.7 kg')));
});

test('1RM line chart: 320 x 120 box, polyline through the four points, a circle for each ordinary point, a diamond for the PR', () => {
  const sec = section(screen().out, 'Estimated 1RM');
  const wrap = all([sec]).find(n => (n.getAttribute('aria-label') ?? '').startsWith('Estimated 1RM, Barbell Bench Press'));
  assert.equal(wrap.getAttribute('aria-label'), 'Estimated 1RM, Barbell Bench Press, 4 workouts, oldest first: 93.3, 80.0, 96.3 PR, 93.3 kg');
  assert.equal(wrap.getAttribute('role'), 'img');
  const svg = kids(wrap, 'svg')[0];
  assert.equal(svg.getAttribute('viewBox'), '0 0 320 120');
  assert.equal(svg.getAttribute('preserveAspectRatio'), null, 'circles must stay round');
  assert.equal(kids(svg, 'polyline', 'gs-line')[0].getAttribute('points'), '10,27.95 110,110 210,10 310,27.95');
  const dots = kids(svg, 'circle', 'gs-pt');
  assert.deepEqual(dots.map(c => [c.getAttribute('cx'), c.getAttribute('cy')]), [['10', '27.95'], ['110', '110'], ['310', '27.95']]);
  const prs = kids(svg, 'polygon', 'gs-pr');
  assert.equal(prs.length, 1);
  const pts = prs[0].getAttribute('points').split(' ').map(p => p.split(',').map(Number));
  assert.equal(pts.length, 4, 'a diamond has four corners');
  assert.deepEqual([Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))], [420]); // centred on x = 210
  assert.deepEqual([Math.min(...pts.map(p => p[1])) + Math.max(...pts.map(p => p[1]))], [20]); // centred on y = 10
});

test('1RM block text: tiles Latest / Best / PRs, the PR as a line of text ending in PR, the two date captions', () => {
  const sec = section(screen().out, 'Estimated 1RM');
  const tiles = all([sec]).filter(n => hasClass(n, 'an-tile')).map(t => [t.children[1].textContent, t.children[0].textContent]);
  assert.deepEqual(tiles, [['Latest', '93.3 kg'], ['Best', '96.3 kg'], ['PRs', '1']]);
  assert.ok(texts([sec]).includes('5 Oct 2026 · 96.3 kg · PR'));
  assert.deepEqual(all([sec]).find(n => hasClass(n, 'gs-cap')).children.map(c => c.textContent), ['20 Sep 2026', '12 Oct 2026']);
});

test('1RM block: nothing to chart yet says so and shows no select', () => {
  const only = g([wk('w', '2026-10-12', [A('bench', [ws(5, 80, { warmup: true }), ws(12, 50)])])]);
  const sec = section(screen(only).out, 'Estimated 1RM');
  assert.ok(texts([sec]).includes('No sets to chart yet. Log a done working set of 1 to 10 reps with a weight.'));
  assert.equal(all([sec]).filter(n => n.tagName === 'SELECT').length, 0);
});

test('1RM block while names load: bundled names read Loading… (the chart itself needs no list)', () => {
  const sec = section(screen(GYM, { data: null }).out, 'Estimated 1RM');
  assert.deepEqual(all([sec]).find(n => n.tagName === 'SELECT').children.map(o => o.textContent), ['Loading…', 'Loading…']);
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
  for (const sel of ['.gs-target', '.gs-line', '.gs-pt', '.gs-pr', '.gs-nums', '.gs-cap']) assert.ok(bare.includes(`${sel}{`) || bare.includes(`${sel} `), `no rule ${sel}`);
  assert.doesNotMatch(bare, /animation|transition|@keyframes/);
  for (const m of bare.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 11, `font-size ${m[1]}px`);
});

// Graphic contrast >= 3 for the chart marks on both plate stops (helpers as in tests/contrast-graphics.test.js).
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
for (const [sel, prop] of [['.gs-target', 'stroke'], ['.gs-line', 'stroke'], ['.gs-pt', 'fill'], ['.gs-pr', 'fill'], ['.gs-pr', 'stroke']]) {
  test(`contrast: ${sel} ${prop} is 3:1 on both plate stops`, () => {
    const token = decl(sel, prop).match(/^var\((--[\w-]+)\)$/)?.[1];
    assert.ok(token && dark[token], `${sel} ${prop} must be a colour token`);
    for (const s of ['--plate-top', '--plate-bot']) assert.ok(ratio(rgb(dark[token]), rgb(dark[s])) >= 3, `${sel} ${prop} on ${s}`);
  });
}
test('the PR mark differs from an ordinary point by shape (diamond vs circle), not only by colour', () => {
  assert.notEqual(decl('.gs-pr', 'fill'), decl('.gs-pt', 'fill'));
  assert.ok(read('src/views/gymStatsCharts.js').includes("'polygon'") && read('src/views/gymStatsCharts.js').includes("'circle'"));
});
