import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAnalytics } from '../src/views/analytics.js';
import { analytics, EMPTY } from '../src/views/analyticsLogic.js';
import { CHALLENGE_LENGTH } from '../src/views/challengeLogic.js';
import { defaultState } from '../src/core/model.js';

// Task 18 Analytics view (task-18-rulings R1, R4-R6). DOM conventions this file pins (the code must produce them):
// - header: segmented() buttons '7d' / '30d' / 'All' with aria-pressed; sections = h2.sec via sectionHeading, in order
//   Overview, PM Challenge, Habits, Tasks; a null block renders the text EMPTY ('No data yet.') once.
// - tiles: div.an-tile > .an-n (number) + .an-l (label); overview tiles then task tiles. The element wrapping the overview
//   tiles has role="img" + aria-label = overview.label; same for the task tiles with tasks.label.
// - every role="img" has a non-empty aria-label. Chart wrappers (role="img", aria-label = model label):
//   strip (stripLabel, holds CHALLENGE_LENGTH .dy cells, legend outside it); per protocol (protocol label): <svg viewBox
//   "0 0 sum 1"> with <rect> .an-held / .an-med / .an-miss, width = count; resets (resets.label): rects .an-red (red line)
//   and .an-miss (missed protocols), width = count; per tactic (tactic label): <svg viewBox "0 0 1 1"> rect.an-bar
//   width = share; weekdays (weekdays.label): 7 <svg viewBox "0 0 1 1">, each rect.an-bar y = 1 - share, height = share;
//   heatmap (heatmap.label): 28 <circle class="hm-<kind>">, oldest first, cx = i%7+.5, cy = floor(i/7)+.5, r per R5.
// Fake DOM: tests/checkin-night-view.test.js plus cloneNode and an <svg><path/></svg> DOMParser result
// (src/views/challenge.js redoGlyph edits the parsed path), and window.addEventListener.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new Text(c) : c; n.parent = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  cloneNode() { const c = new El(this.tagName); c.attrs = { ...this.attrs }; return c; }
  focus() {}
  blur() {}
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  importNode: n => n };
globalThis.DOMParser = class { parseFromString() { const s = new El('svg'); s.append(new El('path')); return { documentElement: s }; } };
const events = [];
globalThis.window = { dispatchEvent(e) { events.push(e.type); return true; }, addEventListener() {} };

const all = nodes => [...walk(nodes)];
const texts = nodes => { const r = []; const go = ns => { for (const n of ns) if (n instanceof Text) r.push(n.data); else go(n.children); }; go(nodes); return r; };
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);
const imgs = nodes => all(nodes).filter(n => n.getAttribute('role') === 'img');
const img = (nodes, label) => { const f = imgs(nodes).filter(n => n.getAttribute('aria-label') === label); assert.equal(f.length >= 1, true, `no role=img "${label}"`); return f[0]; };
const tagged = (el, tag) => all([el]).filter(n => n.tagName === tag.toUpperCase());
const num = (n, a) => Number(n.getAttribute(a));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);
const tiles = nodes => all(nodes).filter(n => hasClass(n, 'an-tile'))
  .map(t => [all([t]).find(x => hasClass(x, 'an-l')).textContent, all([t]).find(x => hasClass(x, 'an-n')).textContent]);
const pressed = nodes => ['7d', '30d', 'All'].map(l => button(nodes, l).getAttribute('aria-pressed'));

// Hand state: copy of tests/analytics-logic.test.js (challenge 08-25..09-23, endDate after its end, renamed p1).
const E = '2026-09-27';
const P = (a, b, t1 = 'Protocol A') => [{ id: 'p1', title: t1, status: a }, { id: 'p2', title: 'Protocol B', status: b }];
const closed = (result, protocols, { crossed = false, archetype = '', tactic = '' } = {}) => ({
  morning: { at: 1, target: 'Target A', risk: '', med: [] }, afternoon: null, declaredRedo: false, slipNote: '',
  incompleteMorning: false, auto: null,
  night: { at: 2, protocols, redLines: [{ id: 'r1', name: 'Red Line A', status: crossed ? 'crossed' : 'held' }], win: '',
    bottomG: { archetype, tactic, text: '' }, suggested: result, override: null },
  result, closedAt: 2,
});
const tA = { archetype: 'negotiator', tactic: 'Tactic A' }, tB = { archetype: 'assassin', tactic: 'Tactic B' };
const task = (id, title, repeat, date = null) => ({ id, title, note: '', start: null, end: null, date, repeat, skip: [], archived: false });
const TASKS = [task('h1', 'Task A', { type: 'weekdays', days: [] }), task('h2', 'Task B', { type: 'custom', days: [0, 2] }),
  task('t1', 'Task C', { type: 'none', days: [] }, '2026-09-22')];
const TASK_LOG = { '2026-08-20': { h1: 'done' }, '2026-08-26': { h1: 'failed', h2: 'done' }, '2026-08-31': { h1: 'done', h2: 'done' },
  '2026-09-02': { h1: 'done' }, '2026-09-21': { h1: 'done', h2: 'done' }, '2026-09-22': { h1: 'done', t1: 'done' },
  '2026-09-23': { h2: 'done' }, '2026-09-25': { h1: 'failed' } };
const STATE = { ...defaultState(), tasks: TASKS, taskLog: TASK_LOG,
  challenge: { startDate: '2026-08-25', length: 30, protocols: [{ id: 'p1', title: 'Protocol A3', med: null },
    { id: 'p2', title: 'Protocol B', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }], redoUsed: null },
  days: {
    '2026-08-25': closed('passed', P('held', 'held'), tA),
    '2026-08-26': closed('reset', P('held', 'missed'), { crossed: true, ...tB }),
    '2026-09-01': closed('passed', P('med', 'held'), tA),
    '2026-09-03': closed('reset', P('missed', 'missed'), tB),
    '2026-09-21': closed('passed', P('held', 'held'), tA),
    '2026-09-22': closed('redo', P('held', 'missed', 'Protocol A2'), tB),
    '2026-09-23': closed('reset', P('held', 'held', 'Protocol A2'), { crossed: true }),
  } };
const fakeApp = state => ({ state, today: () => E, nav() {} });
const render = state => renderAnalytics(fakeApp(state));
const tap = (nodes, label) => fire(button(nodes, label), 'click');

function assertScreen(nodes, m) {
  const o = m.overview, t = m.tasks;
  assert.deepEqual(tiles(nodes), [['Passed', o.passed], ['Redo', o.redo], ['Reset', o.reset], ['Pass rate', o.rate],
    ['Current streak', o.current], ['Longest streak', o.longest], ['Done', t.done], ['Failed', t.failed], ['Stalled', t.stalled],
    ['Open', t.open]]);
  for (const l of [o.label, m.challenge.stripLabel, m.challenge.resets.label, m.habits.weekdays.label, m.habits.heatmap.label, t.label,
    ...m.challenge.protocols.map(p => p.label), ...m.challenge.tactics.map(x => x.label)]) img(nodes, l);
  assert.ok(all([img(nodes, o.label)]).filter(n => hasClass(n, 'an-tile')).length === 6, 'overview tiles inside its role=img');
  assert.ok(all([img(nodes, t.label)]).filter(n => hasClass(n, 'an-tile')).length === 4, 'task tiles inside its role=img');
}

test('first render: 30d pressed, four section headings, every role=img labelled, tiles = 30d model', () => {
  const nodes = render(STATE);
  assert.ok(Array.isArray(nodes) && nodes.every(n => n instanceof El), 'a flat array of elements (app.js spreads it)');
  assert.deepEqual(pressed(nodes), ['false', 'true', 'false']);
  assert.deepEqual(all(nodes).filter(n => n.tagName === 'H2' && hasClass(n, 'sec')).map(n => n.textContent),
    ['Overview', 'PM Challenge', 'Habits', 'Tasks']);
  for (const n of imgs(nodes)) assert.ok((n.getAttribute('aria-label') ?? '').trim() !== '', 'role=img without aria-label');
  assertScreen(nodes, analytics(STATE, E, 30));
  assert.equal(texts(nodes).filter(x => x === EMPTY).length, 0);
});

test('tapping 7d re-renders via hashchange and shows the 7d model; nothing written', () => {
  const app = fakeApp(STATE);
  let nodes = renderAnalytics(app);
  events.length = 0;
  tap(nodes, '7d');
  assert.deepEqual(events, ['hashchange']);
  assert.equal(app.state, STATE);
  nodes = renderAnalytics(app);
  assert.deepEqual(pressed(nodes), ['true', 'false', 'false']);
  const m7 = analytics(STATE, E, 7);
  assert.notEqual(m7.overview.label, analytics(STATE, E, 30).overview.label);
  assertScreen(nodes, m7);
  tap(nodes, 'All');
  nodes = renderAnalytics(app);
  assert.deepEqual(pressed(nodes), ['false', 'false', 'true']);
  assertScreen(nodes, analytics(STATE, E, null));
  tap(nodes, '30d'); // reset the module-level range for the next tests
  assert.deepEqual(pressed(renderAnalytics(app)), ['false', 'true', 'false']);
});

test('strip reuses the Challenge cells; protocol, reset and tactic bars are drawn from the counts', () => {
  const nodes = render(STATE), m = analytics(STATE, E, 30);
  const strip = img(nodes, m.challenge.stripLabel);
  assert.equal(all([strip]).filter(n => hasClass(n, 'dy')).length, CHALLENGE_LENGTH);
  const widths = (el, classes) => classes.map(c => tagged(el, 'rect').filter(r => hasClass(r, c)).reduce((s, r) => s + num(r, 'width'), 0));
  for (const p of m.challenge.protocols) {
    const el = img(nodes, p.label);
    const sum = p.counts.reduce((a, b) => a + b, 0);
    assert.equal(tagged(el, 'svg')[0].getAttribute('viewBox'), `0 0 ${sum} 1`, p.label);
    assert.deepEqual(widths(el, ['an-held', 'an-med', 'an-miss']), p.counts, p.label);
  }
  const r = m.challenge.resets, rel = img(nodes, r.label);
  assert.equal(tagged(rel, 'svg')[0].getAttribute('viewBox'), `0 0 ${r.counts[0] + r.counts[1]} 1`);
  assert.deepEqual(widths(rel, ['an-red', 'an-miss']), r.counts);
  for (const x of m.challenge.tactics) {
    const el = img(nodes, x.label);
    assert.equal(tagged(el, 'svg')[0].getAttribute('viewBox'), '0 0 1 1', x.label);
    near(num(tagged(el, 'rect').find(n => hasClass(n, 'an-bar')), 'width'), x.share, x.label);
  }
  const text = texts(nodes).join(' ');
  for (const p of m.challenge.protocols) assert.ok(text.includes(`Held ${p.held} · MED ${p.med} · Missed ${p.missed}`), p.title);
  for (const s of [`Red line ${r.redLine}`, `Missed protocols ${r.protocols}`, 'Day results', 'Protocols', 'What caused the Reset',
    'Your enemy\'s favorite tactics', ...r.byProtocol.map(b => b.title)]) assert.ok(text.includes(s), s);
});

test('weekday columns and the 28-mark heatmap follow the model', () => {
  const nodes = render(STATE), m = analytics(STATE, E, 30);
  const wk = tagged(img(nodes, m.habits.weekdays.label), 'svg');
  assert.equal(wk.length, 7);
  m.habits.weekdays.days.forEach((d, i) => {
    assert.equal(wk[i].getAttribute('viewBox'), '0 0 1 1');
    const bar = tagged(wk[i], 'rect').find(n => hasClass(n, 'an-bar'));
    near(num(bar, 'height'), d.share, d.day);
    near(num(bar, 'y'), 1 - d.share, d.day);
  });
  const hm = img(nodes, m.habits.heatmap.label);
  assert.equal(tagged(hm, 'svg')[0].getAttribute('viewBox'), '0 0 7 4');
  const marks = tagged(hm, 'circle');
  assert.equal(marks.length, 28);
  const R = { all: 0.4, part: 0.24, missed: 0.32, none: 0.08 };
  m.habits.heatmap.cells.forEach((c, i) => {
    assert.equal(marks[i].getAttribute('class'), `hm-${c.kind}`, c.date);
    near(num(marks[i], 'cx'), (i % 7) + 0.5, c.date);
    near(num(marks[i], 'cy'), Math.floor(i / 7) + 0.5, c.date);
    near(num(marks[i], 'r'), R[c.kind], c.date);
  });
  const text = texts(nodes).join(' ');
  for (const s of ['By weekday', 'Last 28 days', 'All done', 'Partly', 'Missed', 'Not due', 'Mon', 'Sun']) assert.ok(text.includes(s), s);
});

test('empty state: "No data yet." once per null block, no charts', () => {
  const nodes = render(defaultState());
  assert.deepEqual(all(nodes).filter(n => n.tagName === 'H2' && hasClass(n, 'sec')).map(n => n.textContent),
    ['Overview', 'PM Challenge', 'Habits', 'Tasks']);
  assert.equal(texts(nodes).filter(x => x === EMPTY).length, 5); // overview, challenge, weekdays, heatmap, tasks
  assert.equal(all(nodes).filter(n => hasClass(n, 'an-tile') || hasClass(n, 'dy')).length, 0);
  assert.deepEqual(pressed(nodes), ['false', 'true', 'false']);
});

test('no challenge: PM Challenge (and Overview) show "No data yet.", habits and tasks render', () => {
  const s = { ...defaultState(), tasks: TASKS, taskLog: TASK_LOG };
  const nodes = render(s), m = analytics(s, E, 30);
  assert.equal(m.challenge, null);
  assert.equal(texts(nodes).filter(x => x === EMPTY).length, 2);
  assert.equal(all(nodes).filter(n => hasClass(n, 'dy')).length, 0);
  for (const l of [m.habits.weekdays.label, m.habits.heatmap.label, m.tasks.label]) img(nodes, l);
});
