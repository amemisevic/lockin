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

// Task 16 (night check-in) view, part 1: the form (scratch/t16/brief.md "Screen"). Part 2: tests/checkin-night-flow.test.js.
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

// Each test uses its own date (module-level drafts are keyed by date).
test('draft survives choice taps and a tick re-render; nothing is saved', () => {
  const day = '2027-03-01';
  NOW = at(day, 21);
  const app = fakeApp(withTask(morning(started(day), day), day, 't1', 'Task A'));
  const s0 = app.state;
  let nodes = renderNight(app, [day]);
  assert.ok(text(nodes).includes('Night · Day 1'));
  type(nodes, 'ci-win', 'Win A');
  type(nodes, 'ci-slip', 'Slip A');
  events.length = 0;
  pick(nodes, 'Protocol A', 'Held');
  assert.deepEqual(events, ['hashchange']);
  pick(nodes, 'Task A', 'Stalled');
  tap(nodes, 'Negotiator'); // no pack: #ci-other shows directly
  nodes = renderNight(app, [day]);
  type(nodes, 'ci-other', 'Text A');
  tap(nodes, 'Override');
  nodes = renderNight(app, [day]);
  type(nodes, 'ci-reason', 'Reason A');
  nodes = renderNight(app, [day]);
  NOW = at(day, 21, 1);
  nodes = renderNight(app, [day]); // the 30 s tick
  assert.equal(byId(nodes, 'ci-win').value, 'Win A');
  assert.equal(byId(nodes, 'ci-slip').value, 'Slip A');
  assert.equal(byId(nodes, 'ci-other').value, 'Text A');
  assert.equal(byId(nodes, 'ci-reason').value, 'Reason A');
  assert.equal(button([row(nodes, 'Protocol A')], 'Held').getAttribute('aria-pressed'), 'true');
  assert.equal(button([row(nodes, 'Task A')], 'Stalled').getAttribute('aria-pressed'), 'true');
  assert.equal(button(nodes, 'Negotiator').getAttribute('aria-pressed'), 'true');
  assert.ok(button(nodes, 'Cancel override'));
  assert.equal(app.state, s0);
  assert.equal(app.sets, 0);
});

test('Close the day stays disabled until every task, protocol and red line is answered', () => {
  const day = '2027-03-08';
  NOW = at(day, 21);
  const app = fakeApp(withTask(withTask(morning(started(day), day), day, 't1', 'Task A'), day, 't2', 'Task B'));
  let nodes = renderNight(app, [day]);
  assert.ok(isDisabled(gold(nodes)));
  pick(nodes, 'Task A', 'Done');
  pick(nodes, 'Task B', 'Failed');
  assert.ok(isDisabled(gold(nodes = renderNight(app, [day]))));
  pick(nodes, 'Protocol A', 'Held');
  pick(nodes, 'Protocol B', 'Missed');
  assert.ok(isDisabled(gold(nodes = renderNight(app, [day]))));
  pick(nodes, 'Red Line A', 'I held the line');
  assert.ok(!isDisabled(gold(renderNight(app, [day]))));
});

test('with the override open, Close the day needs a result and a non-blank reason', () => {
  const day = '2027-03-15';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  let nodes = renderNight(app, [day]);
  answerAll(nodes);
  tap(nodes, 'Override');
  nodes = renderNight(app, [day]);
  assert.ok(isDisabled(gold(nodes)));
  for (const r of ['Passed', 'Redo', 'Reset']) assert.ok(button(nodes, r), r);
  tap(nodes, 'Redo');
  assert.ok(isDisabled(gold(nodes = renderNight(app, [day]))));
  type(nodes, 'ci-reason', '   ');
  assert.ok(isDisabled(gold(nodes = renderNight(app, [day]))));
  type(nodes, 'ci-reason', 'Reason A');
  assert.ok(!isDisabled(gold(nodes = renderNight(app, [day]))));
  tap(nodes, 'Cancel override'); // closing the override drops its gate
  nodes = renderNight(app, [day]);
  assert.ok(button(nodes, 'Override'));
  assert.ok(!isDisabled(gold(nodes)));
});

test('a MED protocol shows "MED (declared this morning)" with no Held/Missed control and needs no answer', () => {
  const day = '2027-03-22';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day, ['p1']));
  let nodes = renderNight(app, [day]);
  const t = text(nodes);
  assert.equal(t.split('MED (declared this morning)').length - 1, 1);
  assert.ok(t.includes('Protocol A') && t.includes('Protocol B'));
  assert.equal(all(nodes).filter(n => n.tagName === 'BUTTON' && n.textContent === 'Held').length, 1);
  const medRow = all(nodes).filter(n => n.textContent.includes('Protocol A') && n.textContent.includes('MED (declared this morning)'))
    .sort((a, b) => size(a) - size(b))[0];
  assert.ok(!button([medRow], 'Held') && !button([medRow], 'Missed'));
  pick(nodes, 'Protocol B', 'Held');
  pick(nodes, 'Red Line A', 'I held the line');
  nodes = renderNight(app, [day]);
  assert.ok(!isDisabled(gold(nodes)));
  fire(gold(nodes), 'click');
  fire(button(sheet(), 'Close the day'), 'click');
  assert.equal(app.state.days[day].night.protocols.find(p => p.id === 'p1').status, 'med');
  assert.equal(app.state.days[day].result, 'passed');
});

test('suggested result is live: passed, 1 protocol missed → Redo, red line crossed → Reset; unanswered items left out', () => {
  const day = '2027-03-29';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  let nodes = renderNight(app, [day]);
  assert.ok(text(nodes).includes('Suggested result'));
  assert.ok(text(nodes).includes('Passed')); // nothing answered yet: nothing counts against
  answerAll(nodes);
  nodes = renderNight(app, [day]);
  assert.ok(text(nodes).includes('Passed'));
  pick(nodes, 'Protocol B', 'Missed');
  nodes = renderNight(app, [day]);
  let t = text(nodes);
  assert.ok(t.includes('Redo') && t.includes('1 protocol missed') && !t.includes('Passed'));
  pick(nodes, 'Red Line A', 'I crossed it');
  nodes = renderNight(app, [day]);
  t = text(nodes);
  assert.ok(t.includes('Reset') && t.includes('Red line crossed') && !t.includes('Passed'));
  assert.equal(app.sets, 0);
});

test('a crossed red line: plate .warn, "This is a Reset.", override offers only Reset with the core sentence', () => {
  const day = '2027-04-05';
  NOW = at(day, 21);
  const app = fakeApp(morning(started(day), day));
  const redPlate = nodes => all(nodes).filter(n => hasClass(n, 'plate') && n.textContent.includes('Red Line A'))
    .sort((a, b) => size(a) - size(b))[0];
  let nodes = renderNight(app, [day]);
  answerAll(nodes);
  tap(nodes, 'Override');
  nodes = renderNight(app, [day]);
  assert.ok(!hasClass(redPlate(nodes), 'warn'));
  assert.ok(!text(nodes).includes('This is a Reset.'));
  assert.ok(!text(nodes).includes(NIGHT_TEXT['red-line-override']));
  assert.ok(button(nodes, 'Passed') && button(nodes, 'Redo'));
  pick(nodes, 'Red Line A', 'I crossed it');
  nodes = renderNight(app, [day]);
  assert.ok(hasClass(redPlate(nodes), 'warn'));
  assert.ok(text(nodes).includes('This is a Reset.'));
  assert.ok(text(nodes).includes(NIGHT_TEXT['red-line-override']));
  assert.ok(button(nodes, 'Reset'));
  assert.ok(!button(nodes, 'Passed') && !button(nodes, 'Redo'));
});

test('Bottom G: five archetype chips → pack tactics + Something else → #ci-other; changing or clearing resets', () => {
  const day = '2027-04-12';
  NOW = at(day, 21);
  const app = fakeApp(importPack(morning(started(day), day), PACK));
  let nodes = renderNight(app, [day]);
  for (const a of ['Negotiator', 'Assassin', 'Seducer', 'Escapist', 'Authority']) assert.ok(button(nodes, a), a);
  assert.ok(!button(nodes, 'Tactic A') && !byId(nodes, 'ci-other'));
  tap(nodes, 'Negotiator');
  nodes = renderNight(app, [day]);
  assert.ok(button(nodes, 'Tactic A') && button(nodes, 'Something else'));
  assert.ok(!byId(nodes, 'ci-other'));
  tap(nodes, 'Something else');
  nodes = renderNight(app, [day]);
  assert.equal(button(nodes, 'Something else').getAttribute('aria-pressed'), 'true');
  type(nodes, 'ci-other', 'Text A');
  tap(nodes, 'Assassin'); // the pack has no tactics for it: no chip row, the text field directly, cleared
  nodes = renderNight(app, [day]);
  assert.ok(!button(nodes, 'Tactic A') && !button(nodes, 'Something else'));
  assert.equal(byId(nodes, 'ci-other').value, '');
  tap(nodes, 'Assassin'); // tap the chosen one again: cleared
  nodes = renderNight(app, [day]);
  assert.equal(button(nodes, 'Assassin').getAttribute('aria-pressed'), 'false');
  assert.ok(!byId(nodes, 'ci-other'));
});

test('tasks: each open task gets Done / Failed / Stalled and the Stalled caption; no open tasks → no section', () => {
  const cap = 'Genuinely couldn\'t act on this today. Won\'t count for or against you.';
  const day = '2027-04-19';
  NOW = at(day, 21);
  let nodes = renderNight(fakeApp(withTask(withTask(morning(started(day), day), day, 't1', 'Task A'), day, 't2', 'Task B')), [day]);
  assert.ok(text(nodes).includes('Settle your tasks'));
  assert.equal(text(nodes).split(cap).length - 1, 2);
  for (const t of ['Task A', 'Task B']) for (const l of ['Done', 'Failed', 'Stalled']) assert.ok(button([row(nodes, t)], l), `${t} ${l}`);
  const next = addDays(day, 1);
  NOW = at(next, 21);
  nodes = renderNight(fakeApp(morning(started(next), next)), [next]);
  assert.ok(!text(nodes).includes('Settle your tasks'));
  assert.ok(!text(nodes).includes(cap));
});
