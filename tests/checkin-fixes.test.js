import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMorning } from '../src/views/checkinMorning.js';
import { renderAfternoon } from '../src/views/checkinAfternoon.js';
import { startChallenge, submitMorning, submitAfternoon } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Task 15 fix round 1 (review findings 1, 2, 4, 5). Fake DOM copied from tests/checkin-afternoon-view.test.js,
// plus document.activeElement (iOS Safari keeps a textarea focused when a <button> is tapped).
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
globalThis.document = { activeElement: null, createElement: t => new El(t), createElementNS: (_, t) => new El(t), importNode: n => n };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
globalThis.history = { back() {} };
const events = [];
// Records the focused element at dispatch time: the textarea must be blurred before the re-render request.
globalThis.window = { dispatchEvent(e) { events.push([e.type, document.activeElement?.id ?? null]); return true; } };

const all = nodes => [...walk(nodes)];
const text = nodes => nodes.map(n => n.textContent).join(' ');
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);
const byId = (nodes, id) => all(nodes).find(n => n.id === id);
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
function started(day) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(day, 7));
  return ok(startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: 'MED A' }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const withMorning = day => ok(submitMorning(started(day), day, { target: 'Target Z', risk: '', med: [] }, at(day, 8)));
// iOS: the tapped button does not take focus, the textarea keeps it.
function focus(ta) { document.activeElement = ta; ta.blur = () => { if (document.activeElement === ta) document.activeElement = null; }; }
const sw = (nodes, title) => all(nodes).find(n => n.getAttribute('role') === 'switch' && n.getAttribute('aria-label') === title);

// Each test uses its own dates (module-level drafts are keyed by date).
test('finding 1: a switch tap blurs a focused textarea before asking for the re-render', () => {
  const day = '2027-01-04';
  NOW = at(day, 9);
  const nodes = renderMorning(fakeApp(started(day), day));
  focus(byId(nodes, 'ci-target'));
  events.length = 0;
  fire(sw(nodes, 'Protocol A'), 'click');
  assert.deepEqual(events, [['hashchange', null]]);
});

test('finding 1: a refused Start the day blurs a focused textarea, so the error is drawn', () => {
  const day = '2027-01-11';
  NOW = at(day, 9);
  const nodes = renderMorning(fakeApp(started(day), day));
  focus(byId(nodes, 'ci-risk'));
  events.length = 0;
  fire(button(nodes, 'Start the day'), 'click');
  assert.deepEqual(events, [['hashchange', null]]);
});

test('finding 1: an afternoon choice blurs a focused friction field', () => {
  const day = '2027-01-18';
  NOW = at(day, 14);
  const app = fakeApp(withMorning(day), day);
  fire(button(renderAfternoon(app), 'Struggling'), 'click');
  const nodes = renderAfternoon(app);
  focus(byId(nodes, 'ci-friction'));
  events.length = 0;
  fire(button(nodes, 'Yes'), 'click');
  assert.deepEqual(events, [['hashchange', null]]);
});

test('finding 4: Start the day after midnight files nothing for the old date', () => {
  const day = '2027-01-25';
  NOW = at(day, 23, 58);
  const app = fakeApp(started(day), day);
  const nodes = renderMorning(app);
  type(nodes, 'ci-target', 'Target A');
  const s0 = app.state;
  app.today = () => addDays(day, 1);
  NOW = at(addDays(day, 1), 0, 1);
  events.length = 0;
  fire(button(nodes, 'Start the day'), 'click');
  assert.equal(app.state, s0);
  assert.deepEqual(app.navs, []);
  assert.equal(events.length, 1);
});

test('finding 4: Log it after midnight files nothing for the old date', () => {
  const day = '2027-02-01';
  NOW = at(day, 23, 58);
  const app = fakeApp(withMorning(day), day);
  fire(button(renderAfternoon(app), 'Yes'), 'click');
  const nodes = renderAfternoon(app);
  const s0 = app.state;
  app.today = () => addDays(day, 1);
  NOW = at(addDays(day, 1), 0, 1);
  events.length = 0;
  fire(button(nodes, 'Log it'), 'click');
  assert.equal(app.state, s0);
  assert.deepEqual(app.navs, []);
  assert.equal(events.length, 1);
});

test('finding 2: the afternoon draft stays cleared although app.set re-renders synchronously', () => {
  const day = '2027-02-08';
  NOW = at(day, 14);
  const app = fakeApp(withMorning(day), day);
  const set = app.set.bind(app);
  app.set = fn => { set(fn); renderAfternoon(app); }; // app.js notifies subscribers inside app.set
  fire(button(renderAfternoon(app), 'Yes'), 'click');
  fire(button(renderAfternoon(app), 'Log it'), 'click');
  assert.equal(app.state.days[day].afternoon.onTrack, 'yes');
  app.state = submitAfternoon(app.state, day, { onTrack: 'no', friction: '' }, at(day, 15)); // stored answer changes
  assert.equal(button(renderAfternoon(app), 'No').getAttribute('aria-pressed'), 'true');
});

test('finding 5: the Recovery banner and the Close yesterday link keep stable ids', () => {
  const mon = '2027-02-15', tue = addDays(mon, 1);
  NOW = at(tue, 1, 30);
  const s = ok(closeNight(started(mon), mon, { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } }, at(mon, 21)));
  // Reset yesterday (closed) → banner; Close yesterday needs an open yesterday: use the day after instead.
  const banner = all(renderMorning(fakeApp(s, tue))).find(n => (n.getAttribute('href') ?? '').startsWith('#recovery/'));
  assert.equal(banner.id, 'ci-rec');
  const wed = addDays(tue, 1);
  NOW = at(wed, 1, 30);
  const app = fakeApp(started(mon), wed);
  const nodes = renderMorning(app);
  type(nodes, 'ci-target', 'Target A');
  fire(button(nodes, 'Start the day'), 'click');
  const link = all(renderMorning(app)).find(n => n.getAttribute('href') === `#checkin/night/${tue}`);
  assert.equal(link.id, 'ci-close');
});
