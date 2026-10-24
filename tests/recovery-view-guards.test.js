import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRecovery } from '../src/views/recovery.js';
import { checkVague } from '../src/core/recovery.js';
import { startChallenge } from '../src/core/challenge.js';
import { closeNight, settleMissed } from '../src/core/scoring.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { CHALLENGE_LENGTH } from '../src/views/challengeLogic.js';
import { errorText } from '../src/views/recoveryLogic.js';
import { addDays } from '../src/logic.js';

// Backlog T17-2 (Task 21): double tap and already-filed through the view. Fake DOM and helpers copied from tests/recovery-view.test.js.
// replaceChildren (in-place nudge / error updates) and an input's value attribute.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  get disabled() { return 'disabled' in this.attrs; } // reflects the attribute, as in a real DOM
  set disabled(v) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new Text(c) : c; n.parent = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; }
  replaceChildren(...cs) { this.children = []; this.append(...cs); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  focus() {}
  blur() {}
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  get value() { return this._value ?? this.attrs.value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  importNode: n => n };
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
const type = (nodes, id, value) => { const el = byId(nodes, id); el.value = value; fire(el, 'input'); };
const tap = (nodes, label) => fire(button(nodes, label), 'click');
const gold = nodes => byId(nodes, 'rc-file');

function fakeApp(state) {
  const a = { state, sets: 0, navs: [], redirects: [],
    set(fn) { const n = fn(this.state); if (n !== this.state) { this.state = n; this.sets++; } } };
  a.nav = p => a.navs.push(p);
  a.redirect = p => a.redirects.push(p);
  return a;
}

const NUDGE = checkVague('');
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
let NOW = 0;
Date.now = () => NOW;
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const FORM = { tasks: {}, protocols: { p1: 'held' }, redLines: { r1: 'crossed' }, win: '', bottomG: {}, slipNote: '', override: null };
function started(start) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(start, 7));
  return ok(startChallenge(s, start, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
// A Reset closed on `day` at h:mi local; the challenge started `back` days earlier. NOW = one hour later.
function reset(day, h = 22, mi = 7, back = 0) {
  const s = ok(closeNight(settleMissed(started(addDays(day, -back)), at(day, h, mi)), day, FORM, at(day, h, mi)));
  NOW = at(day, h + 1, mi);
  return s;
}
const DECISION = 'Picked up the phone and did not put it down';
const CHANGE = 'Block the app on my phone after work';
// Fills every field on the shared draft (chip taps re-render: fetch fresh nodes after each).
function fillAll(app, day, { decision = DECISION, change = CHANGE } = {}) {
  let nodes = renderRecovery(app, [day]);
  tap(nodes, 'Tired');
  nodes = renderRecovery(app, [day]);
  tap(nodes, 'Bed');
  nodes = renderRecovery(app, [day]);
  type(nodes, 'rc-decision', decision);
  type(nodes, 'rc-change', change);
  return nodes;
}

import { fileAutopsy } from '../src/core/recovery.js';

const OTHER_TAB = { state: 'Tired', time: '22:07', place: 'Bed', decision: DECISION, change: CHANGE };

// Each test uses its own date (module-level drafts are keyed by date).
test('double tap: the second tap is stopped by the view guard, not by the core (no error, no re-render)', () => {
  const day = '2027-06-10';
  const app = fakeApp(reset(day));
  const btn = gold(fillAll(app, day));
  const before = events.length;
  fire(btn, 'click');
  const afterFirst = events.length;
  fire(btn, 'click');
  assert.equal(app.sets, 1);
  assert.deepEqual(app.navs, [`#warlog/autopsy-${day}`]);
  // Without the guard the core would answer already-filed, the view would set the error and dispatch a re-render.
  assert.equal(events.length, afterFirst, 'second tap dispatched nothing');
  assert.ok(afterFirst >= before);
});

test('already-filed reached through the view: filed behind its back, the tap writes and navigates nothing, then it renders read-only', () => {
  const day = '2027-06-11';
  const app = fakeApp(reset(day));
  const btn = gold(fillAll(app, day)); // the form the user is looking at
  app.state = ok(fileAutopsy(app.state, day, OTHER_TAB, NOW)); // another tab filed the same date
  const sets = app.sets, before = events.length;
  fire(btn, 'click');
  assert.equal(app.sets, sets, 'no second write');
  assert.deepEqual(app.navs, [], 'no navigation');
  assert.equal(events.length, before + 1, 'the error path asks for one re-render');
  const nodes = renderRecovery(app, [day]);
  assert.equal(button(nodes, 'File the autopsy'), undefined);
  assert.equal(gold(nodes), undefined);
  assert.ok(text(nodes).includes('Your autopsy'));
});

test('the already-filed sentence is the one the view shows for that code', () => {
  assert.equal(errorText('already-filed'), 'This autopsy is already filed.');
});
