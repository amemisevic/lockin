import test from 'node:test';
import assert from 'node:assert/strict';
import { all, byText, fire, hasClass } from './fakedom.js';
import { renderMorning } from '../src/views/checkinMorning.js';
import { startChallenge } from '../src/core/challenge.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';

// T11-1 on Morning: a refused Start the day is announced through the persistent region; the sentence drawn in the
// screen (rebuilt on every render) has no role=alert, so a re-render does not make VoiceOver read it again.
const day = '2027-07-19';
const at = h => new Date(2027, 6, 19, h).getTime();
Date.now = () => at(8);
globalThis.history = { back() {} };
const { El } = await import('./fakedom.js');
El.prototype.replaceChildren = function (...cs) { this.children = []; this.append(...cs); };

let s = defaultState();
for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(7));
s = startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }).state;
const app = { state: s, today: () => day, redirect() {}, nav() {}, set() {} };

test('refused Start the day: the persistent region says it, the drawn sentence has no role', () => {
  fire(byText(renderMorning(app), 'button', 'Start the day'), 'click');
  const region = all(document.body.children).filter(n => n.getAttribute('role') === 'alert');
  assert.equal(region.length, 1);
  assert.equal(region[0].textContent, 'Write today\'s #1 target.');
  const nodes = renderMorning(app);
  assert.deepEqual(all(nodes).filter(n => n.getAttribute('role') === 'alert'), []);
  assert.equal(all(nodes).find(n => hasClass(n, 'form-error')).textContent, 'Write today\'s #1 target.');
});
