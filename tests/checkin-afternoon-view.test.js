import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAfternoon } from '../src/views/checkinAfternoon.js';
import { startChallenge, submitMorning, submitAfternoon } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { addTask, setTaskStatus } from '../src/core/tasks.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 15 step 2 (afternoon check-in) against a tiny fake DOM, same shape as tests/mission-warlog-view.test.js.
// Owner decisions: draft in a module-level object keyed by date; Log it disabled until a choice (submitAfternoon
// ignores an invalid onTrack); friction only for Struggling; open tasks via taskRow; redirects.
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
// Every test uses its own start date, so the module-level drafts (keyed by date) never meet across tests.
function started(day) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(day, 7));
  return ok(startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const withMorning = day => ok(submitMorning(started(day), day, { target: 'Target Z', risk: '', med: [] }, at(day, 8)));

test('Log it is disabled until a choice; Struggling shows friction, Yes hides it and drops it', () => {
  const day = '2026-10-12';
  NOW = at(day, 13);
  const app = fakeApp(withMorning(day), day);
  let nodes = renderAfternoon(app);
  assert.ok(isDisabled(button(nodes, 'Log it')));
  for (const l of ['Yes', 'No', 'Struggling']) assert.equal(button(nodes, l).getAttribute('aria-pressed'), 'false', l);
  assert.equal(byId(nodes, 'ci-friction'), undefined);
  fire(button(nodes, 'Log it'), 'click'); // disabled in the browser; must not file anything here either
  assert.equal(app.sets, 0);
  assert.deepEqual(app.navs, []);

  const before = events.length;
  fire(button(nodes, 'Struggling'), 'click');
  assert.deepEqual(events.slice(before), ['hashchange']);
  nodes = renderAfternoon(app);
  assert.equal(button(nodes, 'Struggling').getAttribute('aria-pressed'), 'true');
  assert.ok(!isDisabled(button(nodes, 'Log it')));
  type(nodes, 'ci-friction', 'Friction A');
  nodes = renderAfternoon(app); // tick re-render keeps the draft
  assert.equal(byId(nodes, 'ci-friction').value, 'Friction A');
  assert.equal(app.sets, 0);

  fire(button(nodes, 'Yes'), 'click');
  nodes = renderAfternoon(app);
  assert.equal(byId(nodes, 'ci-friction'), undefined);
  fire(button(nodes, 'Log it'), 'click');
  const a = app.state.days[day].afternoon;
  assert.deepEqual([a.onTrack, a.friction], ['yes', '']);
  assert.deepEqual(app.navs, ['#today']);
});

test('Struggling keeps the friction text', () => {
  const day = '2026-10-19';
  NOW = at(day, 14);
  const app = fakeApp(withMorning(day), day);
  fire(button(renderAfternoon(app), 'Struggling'), 'click');
  const nodes = renderAfternoon(app);
  type(nodes, 'ci-friction', 'Friction A');
  fire(button(renderAfternoon(app), 'Log it'), 'click');
  const a = app.state.days[day].afternoon;
  assert.deepEqual([a.onTrack, a.friction], ['struggling', 'Friction A']);
  assert.deepEqual(app.navs, ['#today']);
});

test('re-visit shows the stored answer and Log it replaces it', () => {
  const day = '2026-10-26';
  NOW = at(day, 15);
  const app = fakeApp(submitAfternoon(withMorning(day), day, { onTrack: 'yes', friction: '' }, at(day, 13)), day);
  let nodes = renderAfternoon(app);
  assert.equal(button(nodes, 'Yes').getAttribute('aria-pressed'), 'true');
  assert.ok(!isDisabled(button(nodes, 'Log it')));
  fire(button(nodes, 'No'), 'click');
  nodes = renderAfternoon(app);
  fire(button(nodes, 'Log it'), 'click');
  assert.equal(app.state.days[day].afternoon.onTrack, 'no');
  assert.deepEqual(app.navs, ['#today']);
});

test('open tasks with shield toggles and the provisional caption; done tasks are not listed', () => {
  const day = '2026-11-02';
  NOW = at(day, 13);
  let s = addTask(withMorning(day), { title: 'Task A', date: day }, 'tA');
  s = setTaskStatus(addTask(s, { title: 'Task B', date: day }, 'tB'), day, 'tB', 'done');
  const app = fakeApp(s, day);
  const nodes = renderAfternoon(app);
  const t = text(nodes);
  assert.ok(t.includes('Task A'));
  assert.ok(!t.includes('Task B'));
  assert.ok(t.includes('Provisional — finalizes tonight'));
  const shield = all(nodes).find(n => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Task A');
  fire(shield, 'click');
  assert.equal(app.state.taskLog[day].tA, 'done');
  assert.ok(!text(renderAfternoon(fakeApp(withMorning(addDays(day, 7)), addDays(day, 7)))).includes('Provisional'));
});

test('redirects to #today: no challenge, morning not filed, day closed, finished', () => {
  const day = '2026-11-16';
  NOW = at(day, 13);
  const closed = ok(closeNight(withMorning(day), day, { protocols: { p1: 'held' }, redLines: { r1: 'held' } }, at(day, 21)));
  const cases = [[defaultState(), day], [started(day), day], [closed, day], [started(day), addDays(day, 30)]];
  for (const [s, today] of cases) {
    const app = fakeApp(s, today);
    assert.deepEqual(renderAfternoon(app), [], today);
    assert.deepEqual(app.redirects, ['#today'], today);
    assert.deepEqual(app.navs, []);
  }
});
