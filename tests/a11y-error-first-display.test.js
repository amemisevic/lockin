import test from 'node:test';
import assert from 'node:assert/strict';
import { all, byText, fire, El } from './fakedom.js';
import { formError } from '../src/ui/chrome.js';
import { renderRecovery } from '../src/views/recovery.js';
import { startChallenge } from '../src/core/challenge.js';
import { closeNight, settleMissed } from '../src/core/scoring.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';

// T11-1 (owner ruling 2026-10-24): Night and Recovery keep a role=alert node, but only on the first display of a refusal,
// so the re-renders that follow (every choice tap, the 30 s tick) do not make VoiceOver read the sentence again.
El.prototype.replaceChildren = function (...cs) { this.children = []; this.append(...cs); };
globalThis.history = { back() {} };

test('formError: role=alert on the first display of a draft error, none on later ones; a new error alerts again', () => {
  const d = { error: 'x' };
  assert.equal(formError(d, 'One.').getAttribute('role'), 'alert');
  assert.equal(formError(d, 'One.').getAttribute('role'), null);
  assert.equal(formError(d, 'One.').textContent, 'One.');
  d.errorShown = false; // what a new refusal does
  assert.equal(formError(d, 'One.').getAttribute('role'), 'alert');
});

const day = '2027-08-02';
const at = (h, mi = 0) => new Date(2027, 7, 2, h, mi).getTime();
Date.now = () => at(23, 7);
let s = defaultState();
for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(7));
s = startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }).state;
const FORM = { tasks: {}, protocols: { p1: 'held' }, redLines: { r1: 'crossed' }, win: '', bottomG: {}, slipNote: '', override: null };
s = closeNight(settleMissed(s, at(22, 7)), day, FORM, at(22, 7)).state;
const app = { state: s, sets: 0, navs: [], redirect() {}, nav() {}, set() { this.sets++; } };
const alerts = nodes => all(nodes).filter(n => n.getAttribute('role') === 'alert');

test('Recovery: a refused autopsy alerts once; the next renders keep the sentence without the role', () => {
  const type = (id, v) => { const el = all(renderRecovery(app, [day])).find(n => n.id === id); el.value = v; fire(el, 'input'); };
  fire(byText(renderRecovery(app, [day]), 'button', 'Tired'), 'click');
  fire(byText(renderRecovery(app, [day]), 'button', 'Bed'), 'click');
  type('rc-decision', 'Picked up the phone and did not put it down');
  type('rc-change', 'Be stronger');
  fire(all(renderRecovery(app, [day])).find(n => n.id === 'rc-file'), 'click');
  const first = renderRecovery(app, [day]);
  assert.equal(alerts(first).length, 1);
  const second = renderRecovery(app, [day]);
  assert.deepEqual(alerts(second), []);
  assert.equal(all(second).find(n => n.getAttribute('class') === 'form-error').textContent, alerts(first)[0].textContent);
  fire(all(renderRecovery(app, [day])).find(n => n.id === 'rc-file'), 'click'); // refused again: announced again
  assert.equal(alerts(renderRecovery(app, [day])).length, 1);
});
