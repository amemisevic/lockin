import test from 'node:test';
import assert from 'node:assert/strict';
import { El, all, fire, byText, hasClass, texts } from './fakedom.js';
import { HELP } from '../src/views/helpCopy.js';
import { renderChallenge } from '../src/views/challenge.js';
import { renderDay0 } from '../src/views/day0.js';
import { renderMorning } from '../src/views/checkinMorning.js';
import { renderNight } from '../src/views/checkinNight.js';
import { renderRecovery } from '../src/views/recovery.js';
import { renderToday } from '../src/views/today.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Task H1b: one "?" button per approved Challenge help entry, at the placement named in help-copy-draft.md.
// Each opens the existing action sheet (message + Close). Fake DOM from tests/fakedom.js, plus what native <dialog> adds.
El.prototype.showModal = function () { this.attrs.open = ''; };
El.prototype.close = function () { delete this.attrs.open; };
El.prototype.cloneNode = undefined; // no exit ghost in the fake DOM (src/motion.js skips it)
Object.defineProperty(El.prototype, 'isConnected', { get() { return this.parent != null; } });
globalThis.matchMedia = () => ({ matches: false });
globalThis.document.body.parent = {}; // document.body counts as connected

const at = (key, hr, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, hr, mi).getTime(); };
let NOW = 0;
Date.now = () => NOW;
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const D1 = '2026-10-12', D2 = '2026-10-13';
const PROTOCOLS = [{ id: 'p1', title: 'Protocol A', med: 'MED A' }, { id: 'p2', title: 'Protocol B', med: 'MED B' }];

function started() {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text ${k}`, at(D1, 7));
  return ok(startChallenge(s, D1, { protocols: PROTOCOLS, redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const passedD1 = () => {
  const s = ok(submitMorning(started(), D1, { target: 'Target Z', risk: '', med: [] }, at(D1, 8)));
  return ok(closeNight(s, D1, { protocols: { p1: 'held', p2: 'held' }, redLines: { r1: 'held' } }, at(D1, 21)));
};
const resetD1 = () => ok(closeNight(started(), D1, { protocols: { p1: 'held', p2: 'held' }, redLines: { r1: 'crossed' } }, at(D1, 21)));
const fakeApp = (state, today) => ({ state, today: () => today, nav() {}, redirect() {}, set(fn) { this.state = fn(this.state); } });

const helps = nodes => all(nodes).filter(n => hasClass(n, 'help'));
const labels = nodes => helps(nodes).map(n => n.getAttribute('aria-label')).sort();
const want = (...keys) => keys.map(k => `Help: ${HELP[k].name}`).sort();
const btn = (nodes, key) => helps(nodes).find(n => n.getAttribute('aria-label') === `Help: ${HELP[key].name}`);
const sheets = () => document.body.children.filter(n => n.tagName === 'DIALOG');

test('Day 0: oath entries heading and Begin Day 1', () => {
  const out = renderDay0(fakeApp(defaultState(), D1));
  assert.deepEqual(labels(out), want('oath', 'begin'));
  const begin = all(out).find(n => n.id === 'ch-begin');
  assert.ok(begin.parent.children.includes(btn(out, 'begin')), '? sits beside the Begin Day 1 button');
});

test('Challenge: streak pill (from 1), Redo legend, Protocols heading', () => {
  const out = renderChallenge(fakeApp(passedD1(), D2));
  assert.deepEqual(labels(out), want('streak', 'redoBand', 'protocol'));
  assert.ok(btn(out, 'redoBand').parent.children.some(n => texts([n]).join('').startsWith('Redo')), 'legend row');
  assert.ok(btn(out, 'streak').parent.children.some(n => hasClass(n, 'ch-pill')), 'next to the pill');
});

test('Challenge on day 1 (streak 0): no pill, so no streak button', () => {
  assert.deepEqual(labels(renderChallenge(fakeApp(started(), D1))), want('redoBand', 'protocol'));
});

test('Challenge graduation: one button, beside YOU FINISHED', () => {
  const out = renderChallenge(fakeApp(started(), addDays(D1, 40)));
  assert.deepEqual(labels(out), want('graduation'));
  assert.ok(btn(out, 'graduation').parent.children.some(n => n.textContent === 'YOU FINISHED'));
});

test('Morning: title, question 2 and MED question 3', () => {
  NOW = at(D1, 8);
  const out = renderMorning(fakeApp(started(), D1));
  assert.deepEqual(labels(out), want('gating', 'risk', 'med'));
  assert.ok(btn(out, 'risk').parent.children.some(n => n.textContent.includes('Red line at risk today?')));
  assert.ok(btn(out, 'med').parent.children.some(n => n.textContent.includes('Declare MED')));
});

test('Morning after a Reset: one forced-full-pass button, next to the No MED line', () => {
  NOW = at(D2, 8);
  const out = renderMorning(fakeApp(resetD1(), D2));
  const lines = all(out).filter(n => n.textContent === 'No MED today. Yesterday was a Reset.');
  assert.equal(lines.length, 2, 'two protocols, two lines');
  assert.deepEqual(labels(out), want('gating', 'risk', 'med', 'forcedPass'));
  assert.ok(btn(out, 'forcedPass').parent.children.includes(lines[0]));
});

test('Night: title, Top G win, Bottom G\'s move, Slipped without knowing', () => {
  NOW = at(D1, 21);
  const out = renderNight(fakeApp(started(), D1), [D1]);
  assert.deepEqual(labels(out), want('autoRedo', 'topWin', 'bottomMove', 'slip'));
  for (const [key, title] of [['topWin', 'Today\'s Top G win'], ['bottomMove', 'The Bottom G\'s move'], ['slip', 'Slipped without knowing?']]) {
    assert.ok(btn(out, key).parent.children.some(n => n.tagName === 'H2' && n.textContent === title), key);
  }
});

test('Recovery: countdown plate', () => {
  NOW = at(D1, 22);
  const out = renderRecovery(fakeApp(resetD1(), D1), [D1]);
  assert.deepEqual(labels(out), want('recovery'));
  assert.ok(btn(out, 'recovery').parent.children.some(n => n.textContent === 'File within 24 hours'));
});

test('Today: the Close yesterday card has the 04:00 button; the Morning card has none', () => {
  NOW = at(D2, 0, 30);
  const out = renderToday(fakeApp(started(), D2));
  assert.deepEqual(labels(out), want('autoRedo'));
  assert.ok(btn(out, 'autoRedo').parent.children.includes(byText(out, 'button', 'Close yesterday')));
  NOW = at(D2, 8);
  assert.deepEqual(labels(renderToday(fakeApp(passedD1(), D2))), []);
});

test('a "?" is a typed button with the Help aria-label (never a link or bare icon)', () => {
  NOW = at(D1, 21);
  const b = helps(renderNight(fakeApp(started(), D1), [D1]))[0];
  assert.equal(b.tagName, 'BUTTON');
  assert.equal(b.getAttribute('type'), 'button');
  assert.match(b.getAttribute('aria-label'), /^Help: .+/);
});

test('tapping a "?" opens the action sheet with the text and a Close button; Close removes it', () => {
  NOW = at(D1, 21);
  const out = renderNight(fakeApp(started(), D1), [D1]);
  fire(btn(out, 'topWin'), 'click');
  assert.equal(sheets().length, 1);
  const [sheet] = sheets();
  assert.ok(hasClass(sheet, 'action-sheet'));
  assert.ok(texts([sheet]).includes(HELP.topWin.text));
  const close = byText([sheet], 'button', 'Close');
  assert.ok(close);
  fire(close, 'click');
  assert.equal(sheets().length, 0);
});

test('a second "?" tap replaces the first sheet', () => {
  NOW = at(D1, 21);
  const out = renderNight(fakeApp(started(), D1), [D1]);
  fire(btn(out, 'slip'), 'click');
  fire(btn(out, 'bottomMove'), 'click');
  assert.equal(sheets().length, 1);
  assert.ok(texts(sheets()).includes(HELP.bottomMove.text));
  fire(byText(sheets(), 'button', 'Close'), 'click');
});
