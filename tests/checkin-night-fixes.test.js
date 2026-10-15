import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNight } from '../src/views/checkinNight.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';

// Task 16 fix round 1 (scratch/t16/review.md finding 1): iOS keeps a textarea focused when the gold button is tapped.
// src/sheet.js records document.activeElement as the opener and refocuses it on close, before confirm runs; app.js's R8
// guard then skips the post-save render. The view must blur the textarea before opening the sheet.
// Fake DOM: tests/checkin-night-flow.test.js, plus a focus model (focus/blur move document.activeElement) and
// showModal recording what was focused when the dialog opened.
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
  showModal() { this.open = true; shownWith.push(document.activeElement); }
  close() { this.open = false; }
  focus() { document.activeElement = this; }
  blur() { if (document.activeElement === this) document.activeElement = null; }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  get value() { return this._value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
const shownWith = [];
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  importNode: n => n, getElementById: id => all(document.body.children).find(n => n.id === id) ?? null };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
globalThis.history = { back() {} };
globalThis.window = { dispatchEvent() { return true; } };

const all = nodes => [...walk(nodes)];
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);
const byId = (nodes, id) => all(nodes).find(n => n.id === id);
const row = (nodes, title) => all(nodes).filter(n => n.textContent.includes(title)
  && all([n]).filter(x => x.getAttribute('role') === 'group').length === 1).sort((a, b) => all([a]).length - all([b]).length)[0];
const pick = (nodes, title, label) => fire(button([row(nodes, title)], label), 'click');
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
function ready(day) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(day, 7));
  s = ok(startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }],
    oathComplete: oathComplete(s) }));
  return ok(submitMorning(s, day, { target: 'Target Z', risk: '', med: [] }, at(day, 8)));
}
// Answers everything, re-renders, focuses #ci-win (iOS: the tapped button does not take focus), taps the gold button.
function tapGoldWithWinFocused(app, day) {
  const first = renderNight(app, [day]);
  pick(first, 'Protocol A', 'Held');
  pick(first, 'Red Line A', 'I held the line');
  document.body.children = [];
  shownWith.length = 0;
  const nodes = renderNight(app, [day]);
  const ta = byId(nodes, 'ci-win');
  ta.focus();
  fire(byId(nodes, 'ci-closeday'), 'click');
  return ta;
}

test('fix 1: the gold button blurs a focused textarea before the sheet opens; Keep editing does not refocus it', () => {
  const day = '2027-11-01';
  NOW = at(day, 21);
  const ta = tapGoldWithWinFocused(fakeApp(ready(day)), day);
  assert.equal(shownWith.length, 1, 'sheet opened');
  assert.notEqual(shownWith[0], ta, 'textarea still focused when the sheet opened');
  fire(button(sheet(), 'Keep editing'), 'click');
  assert.notEqual(document.activeElement, ta);
});

test('fix 1: confirming leaves no textarea focused, so the post-save render is not skipped', () => {
  const day = '2027-11-08';
  NOW = at(day, 21);
  const app = fakeApp(ready(day));
  const ta = tapGoldWithWinFocused(app, day);
  fire(button(sheet(), 'Close the day'), 'click');
  assert.equal(app.sets, 1);
  assert.deepEqual(app.navs, ['#today']);
  assert.notEqual(document.activeElement, ta);
  assert.notEqual(document.activeElement?.tagName, 'TEXTAREA');
});
