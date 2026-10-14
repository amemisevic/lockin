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

// Task 17 (Recovery screen) view. Fake DOM copied from tests/checkin-night-view.test.js (frozen), plus
// replaceChildren (in-place nudge / error updates) and an input's value attribute.
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
const DECISION = 'Picked up the phone and kept scrolling the feed';
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

// Each test uses its own date (module-level drafts are keyed by date).
test('header, effect chips, countdown and the five questions as the board', () => {
  const day = '2027-05-13';
  const app = fakeApp(reset(day, 22, 7, 12));
  const nodes = renderRecovery(app, [day]);
  const t = text(nodes);
  for (const s of ['Recovery Protocol', 'DAY 13: RESET', 'Streak back to 0', `Day 14 of ${CHALLENGE_LENGTH} continues`, 'Day 14: no MED',
    '23h 0m left', 'File your autopsy', 'What state were you in?', 'What time was it?', 'Where were you?',
    'The first small decision that opened the door', 'One concrete change that breaks the chain']) assert.ok(t.includes(s), s);
  for (const s of ['Tired', 'Stressed', 'Bored', 'Triggered', 'Bed', 'Desk', 'Kitchen', 'Out', 'File the autopsy']) assert.ok(button(nodes, s), s);
  assert.ok(!t.includes('Overdue'));
});

test('time defaults to the local HH:MM of that day\'s closedAt', () => {
  const day = '2027-05-01';
  const app = fakeApp(reset(day, 21, 4));
  assert.equal(byId(renderRecovery(app, [day]), 'rc-time').value, '21:04');
});

test('draft survives chip taps and the tick; tap again clears; nothing saved', () => {
  const day = '2027-05-02';
  const app = fakeApp(reset(day));
  const s0 = app.state;
  let nodes = renderRecovery(app, [day]);
  type(nodes, 'rc-decision', 'Decision A');
  type(nodes, 'rc-change', 'Change A');
  type(nodes, 'rc-time', '23:30');
  events.length = 0;
  tap(nodes, 'Stressed');
  assert.deepEqual(events, ['hashchange']);
  nodes = renderRecovery(app, [day]);
  tap(nodes, 'Kitchen');
  nodes = renderRecovery(app, [day]);
  NOW += 30_000;
  nodes = renderRecovery(app, [day]); // the 30 s tick
  assert.equal(byId(nodes, 'rc-decision').value, 'Decision A');
  assert.equal(byId(nodes, 'rc-change').value, 'Change A');
  assert.equal(byId(nodes, 'rc-time').value, '23:30');
  assert.equal(button(nodes, 'Stressed').getAttribute('aria-pressed'), 'true');
  assert.equal(button(nodes, 'Kitchen').getAttribute('aria-pressed'), 'true');
  tap(nodes, 'Stressed');
  nodes = renderRecovery(app, [day]);
  assert.equal(button(nodes, 'Stressed').getAttribute('aria-pressed'), 'false');
  assert.equal(app.state, s0);
  assert.equal(app.sets, 0);
});

test('File the autopsy is disabled until all five fields are non-blank; typing updates it in place', () => {
  const day = '2027-05-03';
  const app = fakeApp(reset(day));
  let nodes = renderRecovery(app, [day]);
  assert.ok(isDisabled(gold(nodes)));
  nodes = fillAll(app, day);
  const btn = gold(nodes);
  assert.ok(!isDisabled(btn));
  type(nodes, 'rc-change', '   ');
  assert.ok(isDisabled(btn));
  type(nodes, 'rc-change', CHANGE);
  type(nodes, 'rc-time', '');
  assert.ok(isDisabled(btn));
  type(nodes, 'rc-time', '22:07');
  assert.ok(!isDisabled(btn));
});

for (const [field, id] of [['change', 'rc-change'], ['decision', 'rc-decision']]) {
  test(`vague ${field}: the exact core nudge after the first blur, then live`, () => {
    const day = field === 'change' ? '2027-05-04' : '2027-05-05';
    const app = fakeApp(reset(day));
    let nodes = renderRecovery(app, [day]);
    type(nodes, id, 'Be stronger');
    assert.ok(!text(nodes).includes(NUDGE));
    fire(byId(nodes, id), 'blur');
    assert.ok(text(nodes).includes(NUDGE));
    assert.ok(hasClass(byId(nodes, id), 'bad'));
    type(nodes, id, CHANGE);
    assert.ok(!text(nodes).includes(NUDGE));
    assert.ok(!hasClass(byId(nodes, id), 'bad'));
    type(nodes, id, 'Be stronger');
    assert.ok(text(nodes).includes(NUDGE));
    nodes = renderRecovery(app, [day]); // survives a re-render
    assert.ok(text(nodes).includes(NUDGE));
  });
}

for (const [code, opts] of [['vague-change', { change: 'Be stronger' }], ['vague-decision', { decision: 'Be stronger' }]]) {
  test(`${code}: core refuses, the sentence shows under the button as an alert`, () => {
    const day = code === 'vague-change' ? '2027-05-06' : '2027-05-07';
    const app = fakeApp(reset(day));
    const s0 = app.state;
    let nodes = fillAll(app, day, opts);
    fire(gold(nodes), 'click');
    nodes = renderRecovery(app, [day]);
    const err = all(nodes).find(n => n.getAttribute('role') === 'alert');
    assert.equal(err.textContent, errorText(code));
    assert.equal(app.state, s0);
    assert.deepEqual(app.navs, []);
  });
}

test('Recovery gone between render and tap (no-recovery): no write, no nav, then the redirect', () => {
  const day = '2027-05-08';
  const app = fakeApp(reset(day));
  let nodes = fillAll(app, day);
  const btn = gold(nodes);
  const pending = app.state;
  app.state = { ...pending, recovery: {} };
  fire(btn, 'click');
  assert.deepEqual(app.navs, []);
  assert.equal(app.sets, 0);
  assert.deepEqual(renderRecovery(app, [day]), []);
  assert.deepEqual(app.redirects, ['#today']);
});

test('success: core files it, War Log entry exists, nav to the entry; Back and later visits show read-only', () => {
  const day = '2027-05-09';
  const app = fakeApp(reset(day));
  let nodes = fillAll(app, day);
  fire(gold(nodes), 'click');
  assert.deepEqual(app.navs, [`#warlog/autopsy-${day}`]);
  assert.equal(app.sets, 1);
  assert.equal(validateState(app.state), null);
  assert.equal(app.state.recovery[day].filedAt, NOW);
  assert.equal(app.state.recovery[day].change, CHANGE);
  assert.ok(app.state.warLog[`autopsy-${day}`].text.includes(CHANGE));
  nodes = renderRecovery(app, [day]);
  const t = text(nodes);
  for (const s of ['Tired', '22:07', 'Bed', DECISION, CHANGE]) assert.ok(t.includes(s), s);
  assert.equal(all(nodes).filter(n => ['TEXTAREA', 'INPUT'].includes(n.tagName)).length, 0);
  assert.equal(gold(nodes), undefined);
  assert.equal(button(nodes, 'Tired'), undefined);
  assert.ok(!t.includes('left'));
});

test('double tap files once', () => {
  const day = '2027-05-10';
  const app = fakeApp(reset(day));
  const btn = gold(fillAll(app, day));
  fire(btn, 'click');
  fire(btn, 'click');
  assert.equal(app.sets, 1);
  assert.deepEqual(app.navs, [`#warlog/autopsy-${day}`]);
});

test('unknown date redirects to Today', () => {
  const app = fakeApp(reset('2027-05-11'));
  assert.deepEqual(renderRecovery(app, ['2027-05-12']), []);
  assert.deepEqual(renderRecovery(app, []), []);
  assert.deepEqual(app.redirects, ['#today', '#today']);
});

test('a Reset on the last day shows only the streak chip', () => {
  const day = '2027-08-30';
  const app = fakeApp(reset(day, 22, 7, CHALLENGE_LENGTH - 1));
  const t = text(renderRecovery(app, [day]));
  assert.ok(t.includes(`DAY ${CHALLENGE_LENGTH}: RESET`));
  assert.ok(t.includes('Streak back to 0'));
  assert.ok(!t.includes('continues'));
  assert.ok(!t.includes('no MED'));
});

test('Overdue: crimson text instead of the time left once past dueAt', () => {
  const day = '2027-05-14';
  const app = fakeApp(reset(day));
  NOW = app.state.recovery[day].dueAt + 1;
  const nodes = renderRecovery(app, [day]);
  const left = byId(nodes, 'rc-left');
  assert.equal(left.textContent, 'Overdue');
  assert.ok(hasClass(left, 'over'));
  assert.ok(!text(nodes).includes('m left'));
  NOW = app.state.recovery[day].dueAt;
  assert.equal(byId(renderRecovery(app, [day]), 'rc-left').textContent, '0m left');
});
