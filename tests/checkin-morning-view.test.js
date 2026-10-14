import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMorning } from '../src/views/checkinMorning.js';
import { startChallenge, submitMorning, declareRedo } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 15 step 1 (morning check-in) against a tiny fake DOM, same shape as tests/mission-warlog-view.test.js.
// Owner decisions: draft in one module-level object keyed by date (never app.state), re-render via a
// 'hashchange' event; MED rows and reasons; 'Close yesterday first.' with a link; Recovery banner; redirects.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) this.children.push(typeof c === 'string' ? new Text(c) : c); }
  appendChild(c) { this.append(c); return c; }
  remove() {}
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  get value() { return this._value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
globalThis.document = { createElement: t => new El(t), createElementNS: (_, t) => new El(t), importNode: n => n };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
globalThis.history = { back() {} };
const events = [];
globalThis.window = { dispatchEvent(e) { events.push(e.type); return true; } };

const all = nodes => [...walk(nodes)];
const text = nodes => nodes.map(n => n.textContent).join(' ');
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);
const byId = (nodes, id) => all(nodes).find(n => n.id === id);
const sw = (nodes, title) => all(nodes).find(n => n.getAttribute('role') === 'switch' && n.getAttribute('aria-label') === title);
const isDisabled = n => n.getAttribute('disabled') !== null || n.disabled === true;
const type = (nodes, id, value) => { const ta = byId(nodes, id); ta.value = value; fire(ta, 'input'); };

function fakeApp(state, today) {
  const a = { state, sets: 0, navs: [], redirects: [], today: () => today,
    set(fn) { const n = fn(this.state); if (n !== this.state) { this.state = n; this.sets++; } } };
  a.nav = p => a.navs.push(p);
  a.redirect = p => a.redirects.push(p);
  return a;
}

const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
let NOW = 0;
Date.now = () => NOW;
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const PROTOCOLS = [{ id: 'p1', title: 'Protocol A', med: 'MED A' }, { id: 'p2', title: 'Protocol B', med: 'MED B' },
  { id: 'p3', title: 'Protocol C', med: null }];
// Every test uses its own Monday, so the module-level drafts (keyed by date) never meet across tests.
function started(mon) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(mon, 7));
  return ok(startChallenge(s, mon, { protocols: PROTOCOLS, redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const morning = (s, date, med) => ok(submitMorning(s, date, { target: 'Target Z', risk: '', med }, at(date, 8)));

test('draft survives a MED toggle and a tick re-render; nothing is saved', () => {
  const mon = '2026-10-12';
  NOW = at(mon, 8);
  const app = fakeApp(started(mon), mon);
  const s0 = app.state;
  let nodes = renderMorning(app);
  assert.equal(byId(nodes, 'ci-target').value, '');
  type(nodes, 'ci-target', 'Target A');
  type(nodes, 'ci-risk', 'Risk A');
  const before = events.length;
  fire(sw(nodes, 'Protocol A'), 'click');
  assert.deepEqual(events.slice(before), ['hashchange']);
  nodes = renderMorning(app); // the switch re-render
  assert.equal(sw(nodes, 'Protocol A').getAttribute('aria-checked'), 'true');
  NOW = at(mon, 8, 1);
  nodes = renderMorning(app); // the 30 s tick
  assert.equal(byId(nodes, 'ci-target').value, 'Target A');
  assert.equal(byId(nodes, 'ci-risk').value, 'Risk A');
  assert.equal(sw(nodes, 'Protocol A').getAttribute('aria-checked'), 'true');
  assert.equal(app.state, s0);
  assert.equal(app.sets, 0);
});

test('empty target: the core error shows (also after a re-render), no nav, nothing saved', () => {
  const mon = '2026-10-19';
  NOW = at(mon, 8);
  const app = fakeApp(started(mon), mon);
  const s0 = app.state;
  let nodes = renderMorning(app);
  type(nodes, 'ci-target', '   ');
  fire(button(nodes, 'Start the day'), 'click');
  nodes = renderMorning(app);
  assert.ok(text(nodes).includes('Write today\'s #1 target.'));
  assert.equal(app.state, s0);
  assert.deepEqual(app.navs, []);
  assert.ok(!all(nodes).some(n => n.tagName === 'A' && (n.getAttribute('href') ?? '').startsWith('#checkin/night/')));
});

test('Start the day files target, risk and MED, goes to #today, clears the draft; a second visit redirects', () => {
  const mon = '2026-10-26';
  NOW = at(mon, 8);
  const app = fakeApp(started(mon), mon);
  const nodes = renderMorning(app);
  type(nodes, 'ci-target', 'Target A');
  type(nodes, 'ci-risk', 'Risk A');
  fire(sw(nodes, 'Protocol B'), 'click');
  fire(button(renderMorning(app), 'Start the day'), 'click');
  const m = app.state.days[mon].morning;
  assert.deepEqual([m.target, m.risk, m.med], ['Target A', 'Risk A', ['p2']]);
  assert.deepEqual(app.navs, ['#today']);
  assert.equal(app.sets, 1);
  // Second visit: morning filed → redirect, nothing rendered.
  assert.deepEqual(renderMorning(app), []);
  assert.deepEqual(app.redirects, ['#today']);
  // The draft was cleared: the same date on a fresh state starts empty.
  const fresh = renderMorning(fakeApp(started(mon), mon));
  assert.equal(byId(fresh, 'ci-target').value, '');
  assert.equal(sw(fresh, 'Protocol B').getAttribute('aria-checked'), 'false');
});

test('MED: only protocols with MED text, header counts the week plus this form, cap disables the others', () => {
  const mon = '2026-11-02', tue = addDays(mon, 1);
  NOW = at(tue, 10);
  const app = fakeApp(morning(started(mon), mon, ['p1']), tue);
  let nodes = renderMorning(app);
  let t = text(nodes);
  assert.ok(t.includes('1 of 2 MED used this week'));
  for (const s of ['Protocol A', 'Protocol B', 'MED A', 'MED B']) assert.ok(t.includes(s), s);
  for (const s of ['Protocol C', 'Red Line A']) assert.ok(!t.includes(s), s);
  assert.equal(all(nodes).filter(n => n.getAttribute('role') === 'switch').length, 2);
  assert.ok(!isDisabled(sw(nodes, 'Protocol A')) && !isDisabled(sw(nodes, 'Protocol B')));
  assert.ok(!t.includes('Weekly limit reached.'));

  fire(sw(nodes, 'Protocol A'), 'click');
  nodes = renderMorning(app);
  t = text(nodes);
  assert.ok(t.includes('2 of 2 MED used this week'));
  assert.ok(isDisabled(sw(nodes, 'Protocol B')));
  assert.ok(t.includes('Weekly limit reached.'));
  assert.ok(!isDisabled(sw(nodes, 'Protocol A'))); // an on switch can always be turned off
  assert.equal(sw(nodes, 'Protocol A').getAttribute('aria-checked'), 'true');

  fire(sw(nodes, 'Protocol A'), 'click');
  nodes = renderMorning(app);
  assert.ok(text(nodes).includes('1 of 2 MED used this week'));
  assert.ok(!isDisabled(sw(nodes, 'Protocol B')));
  assert.ok(!text(nodes).includes('Weekly limit reached.'));
  assert.equal(app.sets, 0);
});

test('MED: weekly limit already used on earlier days disables every switch', () => {
  const mon = '2026-11-09', tue = addDays(mon, 1), wed = addDays(mon, 2);
  NOW = at(wed, 9);
  const app = fakeApp(morning(morning(started(mon), mon, ['p1']), tue, ['p2']), wed);
  const nodes = renderMorning(app);
  assert.ok(text(nodes).includes('2 of 2 MED used this week'));
  assert.ok(isDisabled(sw(nodes, 'Protocol A')) && isDisabled(sw(nodes, 'Protocol B')));
  assert.equal(text(nodes).split('Weekly limit reached.').length - 1, 2);
});

test('MED: the day after a declared Redo every switch is disabled with the Redo reason', () => {
  const mon = '2026-11-16', tue = addDays(mon, 1);
  NOW = at(tue, 9);
  const app = fakeApp(ok(declareRedo(started(mon), mon)), tue);
  const nodes = renderMorning(app);
  assert.ok(isDisabled(sw(nodes, 'Protocol A')) && isDisabled(sw(nodes, 'Protocol B')));
  assert.equal(text(nodes).split('No MED today. Yesterday was a declared Redo.').length - 1, 2);
  assert.ok(!all(nodes).some(n => (n.getAttribute('href') ?? '').startsWith('#recovery/')));
});

test('after a Reset: the Reset reason on the switches and a crimson Recovery banner at the top', () => {
  const mon = '2026-11-23', tue = addDays(mon, 1);
  NOW = at(tue, 9);
  const s = ok(closeNight(started(mon), mon, { protocols: { p1: 'held', p2: 'held', p3: 'held' }, redLines: { r1: 'crossed' } }, at(mon, 21)));
  const nodes = renderMorning(fakeApp(s, tue));
  assert.equal(text(nodes).split('No MED today. Yesterday was a Reset.').length - 1, 2);
  const els = all(nodes);
  const banner = els.findIndex(n => n.tagName === 'A' && n.getAttribute('href') === `#recovery/${mon}`);
  assert.ok(banner >= 0, 'banner link');
  assert.ok(hasClass(els[banner], 'warn'));
  assert.ok(banner < els.findIndex(n => n.id === 'ci-target'), 'banner above the form');
  // Filed autopsy → no banner.
  const filed = ok(fileAutopsy(s, mon, { state: 'Tired after work', time: 'Evening', place: 'Room A',
    decision: 'I will block the app after work', change: 'I will delete the app from the phone' }, at(tue, 8)));
  assert.ok(!all(renderMorning(fakeApp(filed, tue))).some(n => (n.getAttribute('href') ?? '').startsWith('#recovery/')));
});

test('before 04:00 with yesterday open: "Close yesterday first." with a link to yesterday\'s night, nothing saved', () => {
  const mon = '2026-11-30', tue = addDays(mon, 1);
  NOW = at(tue, 1, 30);
  const app = fakeApp(started(mon), tue);
  const s0 = app.state;
  const nodes = renderMorning(app);
  type(nodes, 'ci-target', 'Target A');
  fire(button(nodes, 'Start the day'), 'click'); // an action sheet would need document.body: it must not open
  const after = renderMorning(app);
  assert.ok(text(after).includes('Close yesterday first.'));
  assert.ok(all(after).some(n => n.tagName === 'A' && n.getAttribute('href') === `#checkin/night/${mon}`));
  assert.equal(byId(after, 'ci-target').value, 'Target A');
  assert.equal(app.state, s0);
  assert.deepEqual(app.navs, []);
});

test('redirects to #today: no challenge, before the start, finished, day closed, morning filed', () => {
  const mon = '2026-12-07';
  NOW = at(mon, 9);
  const closed = ok(closeNight(started(mon), mon, { protocols: { p1: 'held', p2: 'held', p3: 'held' }, redLines: { r1: 'held' } }, at(mon, 21)));
  const cases = [
    [defaultState(), mon],
    [started(mon), addDays(mon, -1)],
    [started(mon), addDays(mon, 30)],
    [closed, mon],
    [morning(started(mon), mon, []), mon],
  ];
  for (const [s, today] of cases) {
    const app = fakeApp(s, today);
    assert.deepEqual(renderMorning(app), [], today);
    assert.deepEqual(app.redirects, ['#today'], today);
    assert.deepEqual(app.navs, []);
  }
});
