import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNight } from '../src/views/checkinNight.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight, NIGHT_TEXT } from '../src/core/scoring.js';
import { addTask } from '../src/core/tasks.js';
import { importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Task 16 (night check-in) view, part 2: confirm via the real action sheet, refusals, routes and redirects
// (scratch/t16/brief.md "Screen" and "confirm"). Part 1: tests/checkin-night-view.test.js.
// Fake DOM: tests/checkin-fixes.test.js plus document.body, parent links, isConnected and <dialog> methods,
// so src/sheet.js openActionSheet runs; the sheet's buttons are found in document.body.
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
  get isConnected() { for (let n = this; n; n = n.parent) if (n === document.body) return true; return false; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  blur() {}
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  get value() { return this._value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  importNode: n => n, getElementById: id => all(document.body.children).find(n => n.id === id) ?? null };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
globalThis.history = { back() {} };
const events = [];
globalThis.window = { dispatchEvent(e) { events.push(e.type); return true; } };

const all = nodes => [...walk(nodes)];
const text = nodes => nodes.map(n => n.textContent).join(' ');
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);
const byId = (nodes, id) => all(nodes).find(n => n.id === id);
const isDisabled = n => n.getAttribute('disabled') !== null || n.disabled === true;
const type = (nodes, id, value) => { const ta = byId(nodes, id); ta.value = value; fire(ta, 'input'); };
const size = n => all([n]).length;
// The smallest element holding the title and exactly one choice group: that item's row.
const row = (nodes, title) => all(nodes).filter(n => n.textContent.includes(title)
  && all([n]).filter(x => x.getAttribute('role') === 'group').length === 1).sort((a, b) => size(a) - size(b))[0];
const pick = (nodes, title, label) => fire(button([row(nodes, title)], label), 'click');
const tap = (nodes, label) => fire(button(nodes, label), 'click');
const gold = nodes => byId(nodes, 'ci-closeday');
const sheet = () => document.body.children;

function fakeApp(state) {
  const a = { state, sets: 0, navs: [], redirects: [],
    set(fn) { const n = fn(this.state); if (n !== this.state) { this.state = n; this.sets++; } } };
  a.nav = p => a.navs.push(p);
  a.redirect = p => a.redirects.push(p);
  return a;
}

const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
let NOW = 0;
Date.now = () => NOW;
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const PROTOCOLS = [{ id: 'p1', title: 'Protocol A', med: 'MED A' }, { id: 'p2', title: 'Protocol B', med: null }];
function started(day) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(day, 7));
  return ok(startChallenge(s, day, { protocols: PROTOCOLS, redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const morning = (s, day, med = []) => ok(submitMorning(s, day, { target: 'Target Z', risk: '', med }, at(day, 8)));
const withTask = (s, day, id, title) => addTask(s, { title, date: day }, id);
const PACK = { missions: [], tactics: [{ archetype: 'negotiator', name: 'Tactic A' }] };
// Answers both protocols and the red line on the given nodes (handlers write the shared draft).
function answerAll(nodes, red = 'I held the line') {
  pick(nodes, 'Protocol A', 'Held');
  pick(nodes, 'Protocol B', 'Held');
  pick(nodes, 'Red Line A', red);
}

// Fills every required answer, taps the gold button, returns the sheet's Close the day button.
function openConfirm(app, day, red) {
  const nodes = renderNight(app, [day]);
  answerAll(nodes, red);
  fire(gold(renderNight(app, [day])), 'click');
  return button(sheet(), 'Close the day');
}

// Each test uses its own date (module-level drafts are keyed by date).
test('Close the day opens the action sheet "This is final." with Close the day / Keep editing; Keep editing saves nothing', () => {
  const day = '2027-05-03';
  NOW = at(day, 21);
  document.body.children = [];
  const app = fakeApp(morning(started(day), day));
  openConfirm(app, day);
  assert.ok(text(sheet()).includes('This is final.'));
  assert.ok(button(sheet(), 'Close the day') && button(sheet(), 'Keep editing'));
  fire(button(sheet(), 'Keep editing'), 'click');
  assert.equal(sheet().length, 0);
  assert.equal(app.sets, 0);
  assert.deepEqual(app.navs, []);
  assert.ok(gold(renderNight(app, [day])), 'still on the form');
});

test('confirm on a clean day: closed as passed, nav #today, draft cleared, a second render redirects', () => {
  const day = '2027-05-10';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  type(renderNight(app, [day]), 'ci-win', 'Win A');
  fire(openConfirm(app, day), 'click');
  assert.equal(app.sets, 1);
  assert.deepEqual(app.navs, ['#today']);
  assert.equal(app.state.days[day].result, 'passed');
  assert.equal(app.state.days[day].closedAt, NOW);
  assert.equal(app.state.days[day].night.win, 'Win A');
  assert.deepEqual(renderNight(app, [day]), []); // Back cannot reopen the closed form
  assert.deepEqual(app.redirects, ['#today']);
  const fresh = renderNight(fakeApp(morning(started(day), day)), [day]);
  assert.equal(byId(fresh, 'ci-win').value, '');
  assert.equal(button([row(fresh, 'Protocol A')], 'Held').getAttribute('aria-pressed'), 'false');
});

test('confirm with a crossed red line: Reset, nav #recovery/<date>, recovery due 24 h after closing', () => {
  const day = '2027-05-17';
  NOW = at(day, 21, 30);
  const app = fakeApp(morning(started(day), day));
  fire(openConfirm(app, day, 'I crossed it'), 'click');
  assert.deepEqual(app.navs, [`#recovery/${day}`]);
  assert.equal(app.state.days[day].result, 'reset');
  assert.equal(app.state.recovery[day].dueAt, app.state.days[day].closedAt + 86400000);
  assert.deepEqual(renderNight(app, [day]), []);
  assert.deepEqual(app.redirects, ['#today']);
});

test('double confirm: one save, one nav, no throw', () => {
  const day = '2027-05-24';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  const first = openConfirm(app, day);
  fire(first, 'click');
  fire(first, 'click');
  assert.equal(app.sets, 1);
  assert.deepEqual(app.navs, ['#today']);
  // Two sheets opened from the same form (the second replaces the first), both confirmed.
  const day2 = '2027-05-31';
  NOW = at(day2, 21);
  const app2 = fakeApp(morning(started(day2), day2));
  const a = openConfirm(app2, day2);
  fire(gold(renderNight(app2, [day2])), 'click');
  const b = button(sheet(), 'Close the day');
  fire(b, 'click');
  fire(a, 'click');
  assert.equal(app2.sets, 1);
  assert.deepEqual(app2.navs, ['#today']);
});

test('midnight guard: confirming after the date stopped being a night target files nothing and re-renders', () => {
  const day = '2027-06-07';
  NOW = at(day, 23, 59);
  const app = fakeApp(morning(started(day), day));
  const s0 = app.state;
  const confirm = openConfirm(app, day);
  NOW = at(addDays(day, 1), 4, 1);
  events.length = 0;
  fire(confirm, 'click');
  assert.equal(app.state, s0);
  assert.equal(app.sets, 0);
  assert.deepEqual(app.navs, []);
  assert.deepEqual(events, ['hashchange']);
});

test('a refusal from closeNight shows its sentence in role="alert" and saves nothing', () => {
  const day = '2027-06-14';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  const confirm = openConfirm(app, day);
  app.state = withTask(app.state, day, 't9', 'Task B'); // a new open task appears before the confirm
  const s0 = app.state;
  events.length = 0;
  fire(confirm, 'click');
  assert.equal(app.state, s0);
  assert.equal(app.sets, 0);
  assert.deepEqual(app.navs, []);
  assert.deepEqual(events, ['hashchange']);
  const alert = all(renderNight(app, [day])).find(n => n.getAttribute('role') === 'alert');
  assert.ok(alert, 'alert element');
  assert.equal(alert.textContent, 'Settle every task first.');
});

test('nothing typed: the stored night has empty strings, never null', () => {
  const day = '2027-06-21';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  fire(openConfirm(app, day), 'click');
  const d = app.state.days[day];
  assert.equal(d.night.win, '');
  assert.deepEqual(d.night.bottomG, { archetype: '', tactic: '', text: '' });
  assert.equal(d.slipNote, '');
  assert.equal(d.night.override, null);
});

test('Bottom G stored: archetype + pack tactic; Something else stores the typed text and no tactic', () => {
  const day = '2027-06-28';
  NOW = at(day, 21);
  const app = fakeApp(importPack(morning(started(day), day), PACK));
  tap(renderNight(app, [day]), 'Negotiator');
  tap(renderNight(app, [day]), 'Tactic A');
  fire(openConfirm(app, day), 'click');
  assert.deepEqual(app.state.days[day].night.bottomG, { archetype: 'negotiator', tactic: 'Tactic A', text: '' });

  const day2 = '2027-07-05';
  NOW = at(day2, 21);
  const app2 = fakeApp(importPack(morning(started(day2), day2), PACK));
  tap(renderNight(app2, [day2]), 'Negotiator');
  tap(renderNight(app2, [day2]), 'Tactic A');
  tap(renderNight(app2, [day2]), 'Something else');
  type(renderNight(app2, [day2]), 'ci-other', 'Text A');
  type(renderNight(app2, [day2]), 'ci-slip', 'Slip A');
  fire(openConfirm(app2, day2), 'click');
  assert.deepEqual(app2.state.days[day2].night.bottomG, { archetype: 'negotiator', tactic: '', text: 'Text A' });
  assert.equal(app2.state.days[day2].slipNote, 'Slip A');
});

test('before 04:00 with yesterday open: today shows "Close yesterday first." and a link, no form; yesterday shows the form', () => {
  const mon = '2027-07-12', tue = addDays(mon, 1);
  NOW = at(tue, 1, 30);
  const app = fakeApp(started(mon));
  const nodes = renderNight(app, [tue]);
  assert.ok(text(nodes).includes(NIGHT_TEXT['yesterday-open']));
  assert.ok(all(nodes).some(n => n.tagName === 'A' && n.getAttribute('href') === `#checkin/night/${mon}`));
  assert.ok(!gold(nodes) && !button(nodes, 'Close the day'));
  assert.ok(!byId(nodes, 'ci-win'));
  const form = renderNight(app, [mon]);
  assert.ok(gold(form));
  assert.ok(text(form).includes('Night · Day 1'));
  assert.deepEqual(app.redirects, []);
  assert.deepEqual(app.navs, []);
});

test('redirects to #today: no challenge, before the start, closed, future, finished, yesterday after 04:00, bad or missing date', () => {
  const mon = '2027-07-19', tue = addDays(mon, 1), end = addDays(mon, 30);
  const closed = ok(closeNight(started(mon), mon, { protocols: { p1: 'held', p2: 'held' }, redLines: { r1: 'held' } }, at(mon, 21)));
  const cases = [
    ['no challenge', defaultState(), [mon], at(mon, 21)],
    ['before the start', started(mon), [addDays(mon, -1)], at(mon, 21)],
    ['closed', closed, [mon], at(mon, 22)],
    ['future', started(mon), [tue], at(mon, 21)],
    ['finished', started(mon), [end], at(end, 21)],
    ['yesterday after 04:00', started(mon), [mon], at(tue, 4, 1)],
    ['malformed', started(mon), ['2027-13-45'], at(mon, 21)],
    ['garbage', started(mon), ['x'], at(mon, 21)],
    ['absent', started(mon), [], at(mon, 21)],
  ];
  for (const [name, s, params, now] of cases) {
    NOW = now;
    const app = fakeApp(s);
    assert.deepEqual(renderNight(app, params), [], name);
    assert.deepEqual(app.redirects, ['#today'], name);
    assert.deepEqual(app.navs, [], name);
  }
});
