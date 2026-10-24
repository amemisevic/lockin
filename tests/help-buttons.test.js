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
import { renderAfternoon } from '../src/views/checkinAfternoon.js';
import { renderWarLog } from '../src/views/warlog.js';
import { renderMission } from '../src/views/mission.js';
import { renderSettings } from '../src/views/settings.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { addTask } from '../src/core/tasks.js';
import { importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Tasks H1b, H1d, H1f: one "?" button per approved Challenge help entry, at the placement named in help-copy-draft.md.
// Each opens the existing action sheet (message + Close). Fake DOM from tests/fakedom.js, plus what native <dialog> adds.
El.prototype.showModal = function () { this.attrs.open = ''; };
El.prototype.close = function () { delete this.attrs.open; };
El.prototype.replaceChildren = function (...cs) { this.children = []; this.append(...cs); };
Object.defineProperty(El.prototype, 'style', { get() { return { setProperty() {} }; } }); // for the exit ghost (src/motion.js)
Object.defineProperty(El.prototype, 'isConnected', { get() { return this.parent != null; } });
globalThis.DOMParser = class { // icons with the parts Today's watermark strips
  parseFromString() { const s = new El('svg'); for (const c of ['b', 'hl', 'lam']) { const p = new El('path'); p.className = c; s.append(p); } return { documentElement: s }; }
};
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
const sheets = () => document.body.children.filter(n => n.tagName === 'DIALOG' && !hasClass(n, 'ghost')); // a closing sheet leaves an exit ghost

test('Day 0: one "?" per oath row (none on the heading) and Begin Day 1', () => {
  const out = renderDay0(fakeApp(defaultState(), D1));
  assert.deepEqual(labels(out), want('contract', 'funeral', 'code', 'redLines1', 'begin', 'addProtocols', 'addRedLines'));
  for (const [help, id] of [['addProtocols', 'ch-protocols'], ['addRedLines', 'ch-redlines']]) { // H1f: G1, G2
    const row = all(out).find(n => n.id === id);
    assert.equal(row.tagName, 'A');
    assert.ok(btn(out, help).parent.children.includes(row), `${help} sits beside its row`);
    assert.equal(helps([row]).length, 0, 'never a button inside the link');
  }
  for (const [help, oath] of [['contract', 'contract'], ['funeral', 'funeral'], ['code', 'code'], ['redLines1', 'redlines-w1']]) {
    const row = all(out).find(n => n.id === `ch-oath-${oath}`);
    assert.equal(row.tagName, 'A');
    assert.ok(btn(out, help).parent.children.includes(row), `${help} sits beside its row`);
    assert.equal(helps([row]).length, 0, 'never a button inside the link');
  }
  assert.equal(all(out).some(n => n.tagName === 'H2' && n.parent.children.some(c => hasClass(c, 'help'))), false, 'no "?" on the oath heading');
  const begin = all(out).find(n => n.id === 'ch-begin');
  assert.ok(begin.parent.children.includes(btn(out, 'begin')), '? sits beside the Begin Day 1 button');
});

test('Challenge: streak pill (from 1), Redo legend, Protocols, Red lines, mission, Declared Redo, strip', () => {
  const out = renderChallenge(fakeApp(passedD1(), D2));
  assert.deepEqual(labels(out), want('streak', 'redoBand', 'protocol', 'addRedLines', 'mission', 'declaredRedo', 'strip'));
  for (const [key, title] of [['addRedLines', 'Red lines'], ['mission', "Today's mission"]]) {
    assert.ok(btn(out, key).parent.children.some(n => n.tagName === 'H2' && n.textContent === title), key);
  }
  assert.ok(btn(out, 'declaredRedo').parent.children.some(n => n.textContent === 'Declared Redo'), 'beside the eyebrow');
  assert.ok(hasClass(btn(out, 'strip').parent, 'ch-hero'), 'on the hero plate');
  assert.ok(btn(out, 'redoBand').parent.children.some(n => texts([n]).join('').startsWith('Redo')), 'legend row');
  assert.ok(btn(out, 'streak').parent.children.some(n => hasClass(n, 'ch-pill')), 'next to the pill');
});

test('Challenge on day 1 (streak 0): no pill, so no streak button', () => {
  assert.deepEqual(labels(renderChallenge(fakeApp(started(), D1))), want('redoBand', 'protocol', 'addRedLines', 'mission', 'declaredRedo', 'strip'));
});

test('Challenge graduation: one button, beside YOU FINISHED', () => {
  const out = renderChallenge(fakeApp(started(), addDays(D1, 40)));
  assert.deepEqual(labels(out), want('graduation'));
  assert.ok(btn(out, 'graduation').parent.children.some(n => n.textContent === 'YOU FINISHED'));
});

test('Morning: title, questions 1 to 3', () => {
  NOW = at(D1, 8);
  const out = renderMorning(fakeApp(started(), D1));
  assert.deepEqual(labels(out), want('gating', 'target', 'risk', 'med'));
  assert.ok(btn(out, 'target').parent.children.some(n => n.textContent.includes('#1 target')));
  assert.ok(btn(out, 'risk').parent.children.some(n => n.textContent.includes('Red line at risk today?')));
  assert.ok(btn(out, 'med').parent.children.some(n => n.textContent.includes('Declare MED')));
});

test('Morning after a Reset: one forced-full-pass button, next to the No MED line', () => {
  NOW = at(D2, 8);
  const out = renderMorning(fakeApp(resetD1(), D2));
  const lines = all(out).filter(n => hasClass(n, 'ci-why') && n.textContent === 'No MED today. Yesterday was a Reset.');
  assert.equal(lines.length, 2, 'two protocols, two lines');
  assert.deepEqual(labels(out), want('gating', 'target', 'risk', 'med', 'forcedPass'));
  assert.ok(btn(out, 'forcedPass').parent.children.includes(lines[0]));
});

test('Night: title, protocols, red lines, Top G win, Bottom G\'s move, Slipped, suggested result (7; 8 with open tasks)', () => {
  NOW = at(D1, 21);
  const out = renderNight(fakeApp(started(), D1), [D1]);
  assert.deepEqual(labels(out), want('autoRedo', 'nightProtocols', 'nightRedLines', 'topWin', 'bottomMove', 'slip', 'result'));
  assert.ok(btn(out, 'result').parent.children.some(n => n.textContent === 'Suggested result'), 'beside the eyebrow');
  for (const [key, title] of [['nightProtocols', 'Protocols'], ['nightRedLines', 'Red lines'], ['topWin', 'Today\'s Top G win'], ['bottomMove', 'The Bottom G\'s move'], ['slip', 'Slipped without knowing?']]) {
    assert.ok(btn(out, key).parent.children.some(n => n.tagName === 'H2' && n.textContent === title), key);
  }
});

test('Night with an open task: Settle your tasks gets the eighth button', () => {
  NOW = at(D1, 21);
  const out = renderNight(fakeApp(addTask(started(), { title: 'Task A', date: D1 }, 't1'), D1), [D1]);
  assert.equal(helps(out).length, 8);
  assert.ok(btn(out, 'tasks').parent.children.some(n => n.tagName === 'H2' && n.textContent === 'Settle your tasks'));
});

test('Afternoon: header', () => {
  NOW = at(D1, 13);
  const s = ok(submitMorning(started(), D1, { target: 'Target Z', risk: '', med: [] }, at(D1, 8)));
  const out = renderAfternoon(fakeApp(s, D1));
  assert.deepEqual(labels(out), want('afternoon'));
  assert.ok(hasClass(btn(out, 'afternoon').parent, 'ph'), 'in the header');
});

test('War Log list: header', () => {
  const out = renderWarLog(fakeApp(started(), D1));
  assert.deepEqual(labels(out), want('warLog'));
  assert.ok(hasClass(btn(out, 'warLog').parent, 'ph'));
});

test('Mission detail: eyebrow, only when a mission is loaded', () => {
  const s = importPack(started(), { missions: [{ day: 1, title: 'Mission A', body: 'Body A' }], tactics: [] });
  const out = renderMission(fakeApp(s, D1), ['1']);
  assert.deepEqual(labels(out), want('mission'));
  assert.ok(btn(out, 'mission').parent.children.some(n => n.textContent === 'Mission'));
  assert.deepEqual(labels(renderMission(fakeApp(started(), D1), ['1'])), [], 'no pack: no "?"');
});

test('Settings: Protocols and Red lines headings', () => {
  const out = renderSettings({ state: defaultState(), today: () => D1, version: '2.2.0', set() {} });
  assert.deepEqual(labels(out), want('addProtocols', 'addRedLines'));
  for (const [key, title] of [['addProtocols', 'Protocols'], ['addRedLines', 'Red lines']]) {
    assert.ok(btn(out, key).parent.children.some(n => n.tagName === 'H2' && n.textContent === title), key);
  }
});

test('Recovery: header, countdown plate and question 5', () => {
  NOW = at(D1, 22);
  const out = renderRecovery(fakeApp(resetD1(), D1), [D1]);
  assert.deepEqual(labels(out), want('recovery', 'recoveryProtocol', 'change'));
  assert.ok(hasClass(btn(out, 'recoveryProtocol').parent, 'ph'));
  assert.ok(btn(out, 'change').parent.children.some(n => n.textContent.includes('One concrete change')));
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
