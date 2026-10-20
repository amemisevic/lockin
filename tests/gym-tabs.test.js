import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { all, texts, byLabel } from './fakedom.js';
import { parseRoute } from '../src/router.js';
import { icons } from '../src/icons.js';
import { renderGym } from '../src/views/gym.js';
import { gymLine } from '../src/views/todayLogic.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G7: six icon-only tabs (gym plan "Navigation", decision 11), Gym shell, Today card. Expected values by hand.
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('screens.css');
const NAMES = ['Today', 'Tasks', 'Challenge', 'Analytics', 'Gym', 'Settings'];

test('index.html: six tab links in plan order, each with an aria-label and no visible text', () => {
  const links = [...html.matchAll(/<a class="tab" href="#(\w+)" aria-label="([^"]*)">([^<]*)<\/a>/g)];
  assert.deepEqual(links.map(m => m[1]), ['today', 'tasks', 'challenge', 'analytics', 'gym', 'settings']);
  assert.deepEqual(links.map(m => m[2]), NAMES);
  assert.deepEqual(links.map(m => m[3].trim()), ['', '', '', '', '', '']);
  assert.equal((html.match(/class="tab"/g) ?? []).length, 6);
});

test('every tab hash has an icon (app.js prepends icon(hash))', () => {
  for (const m of html.matchAll(/class="tab" href="#(\w+)"/g)) assert.equal(typeof icons[m[1]], 'string', m[1]);
});

test('gym icon: same 24 box and 1.7 round stroke as the other tab icons, different shape from analytics', () => {
  for (const name of ['today', 'tasks', 'challenge', 'analytics', 'settings', 'gym']) {
    const s = icons[name];
    assert.match(s, /viewBox="0 0 24 24"/, name);
    assert.match(s, /stroke-width="1\.7"/, name);
    assert.match(s, /stroke-linecap="round"/, name);
    assert.match(s, /stroke="currentColor"/, name);
  }
  assert.notEqual(icons.gym, icons.analytics);
  assert.match(icons.gym, /aria-hidden="true"/);
});

test('router: #gym is the sixth tab; sub-paths and look-alikes fall back to Today', () => {
  assert.deepEqual(parseRoute('#gym'), { name: 'gym', params: [], tab: 'gym', pushed: false });
  assert.deepEqual(parseRoute('#gym/'), { name: 'gym', params: [], tab: 'gym', pushed: false });
  assert.deepEqual(parseRoute('#gym/x'), { name: 'today', params: [], tab: 'today', pushed: false });
  assert.deepEqual(parseRoute('#Gym'), { name: 'today', params: [], tab: 'today', pushed: false });
  assert.deepEqual(parseRoute('#settings'), { name: 'settings', params: [], tab: 'settings', pushed: false });
});

test('tab bar CSS: no label text rules left; a tab is at least 44 pt wide at 375 pt and tall', () => {
  const tab = css.match(/\n\.tab \{([^}]*)\}/)[1];
  assert.doesNotMatch(tab, /font-size|font-weight|letter-spacing|line-height/);
  const bar = css.match(/\n\.tabs \{([^}]*)\}/)[1];
  const px = re => Number(bar.match(re)[1]);
  const inner = 375 - px(/left: (\d+)px/) - px(/right: (\d+)px/) - 2 * px(/padding: (\d+)px/);
  assert.ok(inner / 6 >= 44, `${inner / 6} pt per tab at 375`);
  assert.ok(px(/height: (\d+)px/) - 2 * px(/padding: (\d+)px/) >= 44);
});

test('active tab is not colour only: fill-opacity on the icon, a heavier stroke, the top bar', () => {
  const on = css.match(/\.tab\[aria-current="page"\] svg \{([^}]*)\}/g).join(' ');
  assert.match(on, /fill: currentColor/);
  assert.match(on, /fill-opacity: \.28/);
  assert.match(on, /stroke-width: 2/);
  assert.match(css, /\.tab\[aria-current="page"\]::before \{/);
});

// Contrast helpers as in tests/contrast-today.test.js.
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('idle tab icon colour passes 3:1 (graphics) on the bar, including the solid fallback', () => {
  const idle = css.match(/\n\.tab \{[^}]*color: (#[0-9A-Fa-f]{6})/)[1];
  assert.equal(idle.toUpperCase(), '#BDB6AA');
  for (const bg of ['#1a181c', '#3E372C', '#0E0D10']) assert.ok(ratio(rgb(idle), rgb(bg)) >= 3, bg);
});

test('active icon colour #FCE29A passes 3:1 on the bar', () => {
  assert.match(css, /\.tab\[aria-current="page"\] \{[^}]*color: #FCE29A/);
  for (const bg of ['#1a181c', '#3E372C', '#0E0D10']) assert.ok(ratio(rgb('#FCE29A'), rgb(bg)) >= 3, bg);
});

test('CLAUDE.md records the six icon-only tabs override', () => {
  const md = read('CLAUDE.md');
  assert.match(md, /six tabs/i);
  assert.match(md, /Gym is the sixth/i);
  assert.match(md, /icons only/i);
});

test('Gym shell: eyebrow, title Gym, one empty-state line; nothing else', () => {
  const app = { gym: emptyGym() };
  const out = renderGym(app);
  assert.deepEqual(texts(out), ['Lock In', 'Gym', 'No workouts yet']);
  assert.equal(all(out).some(n => n.tagName === 'BUTTON' || n.tagName === 'A' || n.tagName === 'INPUT'), false);
  assert.equal(byLabel(out, 'Gym'), undefined);
});

const fin = (date, id) => ({ id, date, startedAt: 1, finishedAt: 2, name: '', routineId: null, items: [] });
const open = (date, id) => ({ ...fin(date, id), finishedAt: null });
const g = (workouts, weeklyTarget = 4) => ({ ...emptyGym(), settings: { weeklyTarget }, workouts });
// Plan example: finished Mon 2026-10-05, Wed 10-07 (two), Sun 10-11, Mon 10-12.
const EX = [fin('2026-10-05', 'a'), fin('2026-10-07', 'b'), fin('2026-10-07', 'c'), fin('2026-10-11', 'd'), fin('2026-10-12', 'e')];

test('Gym shell with workouts on file does not claim "No workouts yet"', () => {
  assert.deepEqual(texts(renderGym({ gym: g(EX) })), ['Lock In', 'Gym']);
});

test('gymLine: Sunday 2026-10-11 is week 10-05..10-11 = 3 visits of 4', () => {
  assert.equal(gymLine(g(EX), '2026-10-11'), 'Gym 3/4 this week');
});

test('gymLine: Wednesday 2026-10-14 is the week of 10-12 = 1 visit', () => {
  assert.equal(gymLine(g(EX), '2026-10-14'), 'Gym 1/4 this week');
});

test('gymLine: target comes from the gym settings; unfinished workouts and an empty history count 0', () => {
  assert.equal(gymLine(g(EX, 3), '2026-10-11'), 'Gym 3/3 this week');
  assert.equal(gymLine(g([open('2026-10-14', 'o')]), '2026-10-14'), 'Gym 0/4 this week');
  assert.equal(gymLine(emptyGym(), '2026-10-14'), 'Gym 0/4 this week');
});

test('gymLine: more visits than the target shows the honest number', () => {
  const wk = ['05', '06', '07', '08', '09'].map(d => fin(`2026-10-${d}`, d)); // Mon-Fri of the week of 10-05
  assert.equal(gymLine(g(wk, 4), '2026-10-09'), 'Gym 5/4 this week');
});
