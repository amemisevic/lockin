import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderMission } from '../src/views/mission.js';
import { renderWarLog, renderWarEntry } from '../src/views/warlog.js';
import { startChallenge } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { validatePack, importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 14 views against a tiny fake DOM (only what h(), icon(), chrome and controls use). Rulings R5-R7.
class Text { constructor(t) { this.data = t; this.parentNode = null; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parentNode = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new Text(c) : c; n.parentNode = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  // Textarea: value defaults to its text content until set.
  get value() { return this._value ?? this.textContent; }
  set value(v) { this._value = String(v); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => matches(n, sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
// Simple selectors only: .class, #id, tag. Anything else ('[id]', attribute selectors) matches nothing here.
const matches = (n, sel) => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : sel[0] === '#' ? n.id === sel.slice(1)
  : /^[a-z]+$/i.test(sel) && n.tagName === sel.toUpperCase());
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
const hasClass = (n, c) => n.className.split(/\s+/).includes(c);
globalThis.document = { createElement: t => new El(t), createElementNS: (_, t) => new El(t), importNode: n => n };
globalThis.DOMParser = class { parseFromString() { return { documentElement: new El('svg') }; } };
let backs = 0;
globalThis.history = { back() { backs++; } };

const all = nodes => [...walk(nodes)];
const text = nodes => nodes.map(n => n.textContent).join(' ');
const fire = (el, type) => {
  const e = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, target: el };
  for (const fn of el.listeners[type] ?? []) fn(e);
  return e;
};
const button = (nodes, label) => all(nodes).find(n => n.tagName === 'BUTTON' && n.textContent === label);

function fakeApp(state, today) {
  const a = { state, sets: 0, navs: [], redirects: [], today: () => today,
    set(fn) { const n = fn(this.state); if (n !== this.state) { this.state = n; this.sets++; } } };
  a.nav = p => a.navs.push(p);
  a.redirect = p => a.redirects.push(p);
  return a;
}

const D1 = '2026-10-13', D2 = addDays(D1, 1);
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
function started() {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(D1, 7));
  return ok(startChallenge(s, D1, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const PACK = validatePack(JSON.stringify({ v: 1, missions: [
  { day: 3, title: 'Mission A', body: 'Body A one\n\nBody A two' },
  { day: 12, title: 'Mission L', body: 'Body L one' },
] })).pack;
function withAutopsy() {
  const s = ok(closeNight(started(), D1, { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } }, at(D1, 21)));
  return ok(fileAutopsy(s, D1, { state: 'Tired after work', time: 'Evening', place: 'Room A',
    decision: 'I will block the app after work', change: 'I will delete the app from the phone' }, at(D2, 8)));
}

test('renderMission: invalid params redirect to #challenge (R5)', () => {
  for (const p of ['09', '1e1', '', '-1', '31', 'NaN', '0']) {
    const app = fakeApp(importPack(started(), PACK), addDays(D1, 20));
    assert.deepEqual(renderMission(app, [p]), [], p);
    assert.deepEqual(app.redirects, ['#challenge'], p);
    assert.deepEqual(app.navs, [], p);
  }
});

test('renderMission: a later day is locked and shows nothing of the mission', () => {
  const nodes = renderMission(fakeApp(importPack(started(), PACK), addDays(D1, 10)), ['12']); // Day 11
  const t = text(nodes);
  assert.ok(t.includes('Locked until Day 12.'));
  assert.ok(t.includes('Day 12'));
  for (const s of ['Mission L', 'Body L one', 'Write the War Log entry']) assert.ok(!t.includes(s), s);
  assert.ok(!all(nodes).some(n => hasClass(n, 'eyebrow') && n.textContent === 'Mission'));
  assert.equal(all(nodes).filter(n => n.tagName === 'BUTTON' && !hasClass(n, 'ph-back')).length, 0);
});

test('renderMission: no mission loaded', () => {
  const t = text(renderMission(fakeApp(started(), addDays(D1, 2)), ['3']));
  assert.ok(t.includes('No mission loaded for Day 3.'));
  assert.ok(t.includes('Import a pack in Settings.'));
});

test('renderMission: mission title, paragraphs and the War Log button', () => {
  const app = fakeApp(importPack(started(), PACK), addDays(D1, 2)); // Day 3
  const nodes = renderMission(app, ['3']);
  const els = all(nodes);
  assert.equal(els.find(n => hasClass(n, 'ph')).textContent, 'Day 3');
  assert.ok(els.some(n => hasClass(n, 'eyebrow') && n.textContent === 'Mission'));
  assert.ok(els.some(n => n.textContent === 'Mission A'));
  const ps = els.filter(n => n.tagName === 'P' && n.textContent.startsWith('Body A'));
  assert.deepEqual(ps.map(p => p.textContent), ['Body A one', 'Body A two']);
  for (const p of ps) assert.ok(p.children.every(c => c instanceof Text));
  fire(button(nodes, 'Write the War Log entry'), 'click');
  assert.deepEqual(app.navs, ['#warlog/day-3']);
});

test('renderWarLog: Oath and Days headings, rows are links, empty oath row says Not written yet', () => {
  let s = setWarEntry(defaultState(), 'contract', 'Text A', at(D1, 20));
  s = setWarEntry(s, 'day-2', 'Text B', at(D1, 21));
  const nodes = renderWarLog(fakeApp(s, D1), []);
  const els = all(nodes);
  assert.deepEqual(els.filter(n => hasClass(n, 'sec')).map(n => n.textContent), ['Oath', 'Days']);
  const rows = els.filter(n => n.tagName === 'A');
  assert.deepEqual(rows.map(r => r.getAttribute('href')), [...OATH_KEYS, 'day-2'].map(k => `#warlog/${k}`));
  for (const r of rows) assert.ok(hasClass(r, 'row'));
  assert.ok(rows[1].textContent.includes('Not written yet'));
  assert.ok(!rows[0].textContent.includes('Not written yet'));
  assert.ok(rows[0].textContent.includes('Tuesday 13 October'));
});

test('renderWarLog: Autopsies heading when an autopsy is filed', () => {
  const s = setWarEntry(withAutopsy(), 'day-1', 'Text A', at(D1, 22));
  const els = all(renderWarLog(fakeApp(s, D2), []));
  assert.deepEqual(els.filter(n => hasClass(n, 'sec')).map(n => n.textContent), ['Oath', 'Autopsies', 'Days']);
  assert.ok(els.some(n => n.tagName === 'A' && n.getAttribute('href') === `#warlog/autopsy-${D1}`));
});

const editor = (state, key) => {
  const app = fakeApp(state, D1);
  const nodes = renderWarEntry(app, [key]);
  const ta = all(nodes).find(n => n.tagName === 'TEXTAREA');
  return { app, nodes, ta };
};

test('renderWarEntry: editable textarea holds the text', () => {
  const { nodes, ta } = editor(setWarEntry(defaultState(), 'day-3', 'Text A', at(D1, 20)), 'day-3');
  assert.equal(ta.id, 'wl-text');
  assert.ok(hasClass(ta, 'ta') && hasClass(ta, 'wl-ta'));
  assert.equal(ta.value, 'Text A');
  assert.equal(ta.getAttribute('aria-label'), 'Day 3 notes');
  assert.ok(button(nodes, 'Done'));
});

test('renderWarEntry: blur saves the typed text as a string', () => {
  const { app, ta } = editor(defaultState(), 'day-3');
  ta.value = 'Text B';
  fire(ta, 'blur');
  assert.equal(app.state.warLog['day-3'].text, 'Text B');
  assert.equal(typeof app.state.warLog['day-3'].text, 'string');
});

test('renderWarEntry: Done saves and goes back once (R6)', () => {
  const { app, nodes, ta } = editor(defaultState(), 'contract');
  const before = backs;
  ta.value = 'Text B';
  fire(button(nodes, 'Done'), 'click');
  assert.equal(app.state.warLog.contract.text, 'Text B');
  assert.equal(backs - before, 1);
});

test('renderWarEntry: Back saves without any blur event, then goes back once', () => {
  const { app, nodes, ta } = editor(defaultState(), 'day-3');
  const before = backs;
  ta.value = 'Text C';
  fire(all(nodes).find(n => hasClass(n, 'ph-back')), 'click');
  assert.equal(app.state.warLog['day-3'].text, 'Text C');
  assert.equal(backs - before, 1);
});

test('renderWarEntry: mousedown on Done and Back is prevented (R7)', () => {
  const { nodes } = editor(defaultState(), 'day-3');
  assert.equal(fire(button(nodes, 'Done'), 'mousedown').defaultPrevented, true);
  assert.equal(fire(all(nodes).find(n => hasClass(n, 'ph-back')), 'mousedown').defaultPrevented, true);
});

test('renderWarEntry: blur with unchanged text changes no state', () => {
  const { app, ta } = editor(setWarEntry(defaultState(), 'day-3', 'Text A', at(D1, 20)), 'day-3');
  const s = app.state;
  fire(ta, 'blur');
  assert.equal(app.sets, 0);
  assert.equal(app.state, s);
});

test('renderWarEntry: filed autopsy is read-only', () => {
  const s = withAutopsy(), key = `autopsy-${D1}`;
  const { app, nodes, ta } = editor(s, key);
  assert.equal(ta, undefined);
  assert.equal(button(nodes, 'Done'), undefined);
  const ro = all(nodes).filter(n => hasClass(n, 'wl-ro'));
  assert.equal(ro.length, 1);
  assert.equal(ro[0].textContent, s.warLog[key].text);
  assert.ok(ro[0].textContent.includes('\n'));
  const before = backs;
  fire(all(nodes).find(n => hasClass(n, 'ph-back')), 'click');
  assert.equal(backs - before, 1);
  assert.equal(app.sets, 0);
});

test('renderWarEntry: unknown keys redirect to #warlog', () => {
  for (const key of ['foo', 'day-09', 'day-31']) {
    const app = fakeApp(defaultState(), D1);
    assert.deepEqual(renderWarEntry(app, [key]), [], key);
    assert.deepEqual(app.redirects, ['#warlog'], key);
  }
});

test('screens.css: editor min-height, 16 px text and pre-wrap read-only text', () => {
  const css = readFileSync(new URL('../screens.css', import.meta.url), 'utf8');
  const rule = sel => css.match(new RegExp(`(?:^|[\\n}])${sel.replace('.', '\\.')}\\{([^}]*)\\}`))?.[1] ?? '';
  assert.match(rule('.wl-ta'), /(?:^|;)min-height:220px(?:;|$)/);
  assert.match(rule('.ta'), /(?:^|;)font-size:16px(?:;|$)/);
  assert.match(rule('.wl-ro'), /(?:^|;)white-space:pre-wrap(?:;|$)/);
});
