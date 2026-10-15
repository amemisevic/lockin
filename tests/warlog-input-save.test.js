import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWarEntry } from '../src/views/warlog.js';
import { defaultState } from '../src/core/model.js';

// Task 14 fix round 1 (owner, M3): the editor saves on `input`, so text survives the app being swiped away
// (iOS may fire no blur). Minimal fake DOM, same shape as tests/mission-warlog-view.test.js.
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) this.children.push(typeof c === 'string' ? { textContent: c } : c); }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  get value() { return this._value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => n.className.split(/\s+/).includes(sel.slice(1))); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
globalThis.document = { createElement: t => new El(t), createElementNS: (_, t) => new El(t), importNode: n => n };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
let backs = 0;
globalThis.history = { back() { backs++; } };
const fire = (el, type) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el }); };
const fakeApp = state => ({ state, sets: 0, today: () => '2026-10-14', nav() {}, redirect() {},
  set(fn) { const n = fn(this.state); if (n !== this.state) { this.state = n; this.sets++; } } });
const textarea = nodes => [...walk(nodes)].find(n => n.tagName === 'TEXTAREA');

test('input on the editor saves the text without blur, Back or Done', () => {
  const app = fakeApp(defaultState());
  const ta = textarea(renderWarEntry(app, ['day-5']));
  ta.value = 'Text A typed';
  fire(ta, 'input');
  assert.equal(app.sets, 1);
  assert.equal(app.state.warLog['day-5'].text, 'Text A typed');
  assert.equal(backs, 0);
});

test('whitespace-only input on an unwritten key leaves state unchanged', () => {
  const s = defaultState();
  const app = fakeApp(s);
  const ta = textarea(renderWarEntry(app, ['day-5']));
  ta.value = '   ';
  fire(ta, 'input');
  assert.equal(app.state, s);
  assert.equal(app.sets, 0);
});
