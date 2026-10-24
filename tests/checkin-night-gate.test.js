import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNight } from '../src/views/checkinNight.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { NIGHT_TEXT } from '../src/core/scoring.js';
import { addTask } from '../src/core/tasks.js';
import { importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Backlog T16-3 (Task 21): in-place Close gating. Fake DOM and helpers copied from tests/checkin-night-view.test.js, with a reflecting disabled property.
// Fake DOM: tests/checkin-fixes.test.js plus document.body, parent links, isConnected and <dialog> methods,
// so src/sheet.js openActionSheet runs; the sheet's buttons are found in document.body.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get disabled() { return 'disabled' in this.attrs; }
  set disabled(v) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled; }
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

// Each test uses its own date (module-level drafts are keyed by date).
test('typing the Reason flips Close the day in place: same button node, no re-render', () => {
  const day = '2027-04-05';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  let nodes = renderNight(app, [day]);
  answerAll(nodes);
  tap(nodes, 'Override');
  nodes = renderNight(app, [day]);
  tap(nodes, 'Redo');
  nodes = renderNight(app, [day]); // the rendered tree the user is looking at
  const close = gold(nodes);
  const renders = events.length;
  assert.ok(isDisabled(close), 'Redo chosen, reason empty');
  type(nodes, 'ci-reason', 'Reason A');
  assert.ok(!isDisabled(close), 'enabled on the node already on screen');
  type(nodes, 'ci-reason', '   ');
  assert.ok(isDisabled(close), 'blank again: disabled again');
  type(nodes, 'ci-reason', 'Reason B');
  assert.ok(!isDisabled(close));
  assert.equal(events.length, renders, 'typing dispatched no re-render');
  assert.equal(gold(nodes), close);
});

test('the in-place gate reads the draft: a result tap after the reason re-renders with the gate still correct', () => {
  const day = '2027-04-06';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  let nodes = renderNight(app, [day]);
  answerAll(nodes);
  tap(nodes, 'Override');
  nodes = renderNight(app, [day]);
  type(nodes, 'ci-reason', 'Reason A'); // reason first, no result yet
  assert.ok(isDisabled(gold(nodes)), 'a reason alone is not enough');
  tap(nodes, 'Redo');
  assert.ok(!isDisabled(gold(renderNight(app, [day]))), 'reason + result: enabled after the re-render');
});
