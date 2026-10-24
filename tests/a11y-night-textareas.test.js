import test from 'node:test';
import assert from 'node:assert/strict';
import { all } from './fakedom.js';
import { renderNight } from '../src/views/checkinNight.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';

// T16-1: the Night textareas were named by their helper line ("One sentence", "Optional."); the section heading names them.
const day = '2027-07-12';
const at = (h) => new Date(2027, 6, 12, h).getTime();
Date.now = () => at(21);
globalThis.history = { back() {} };

let s = defaultState();
for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(7));
s = startChallenge(s, day, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }).state;
s = submitMorning(s, day, { target: 'Target Z', risk: '', med: [] }, at(8)).state;

const nodes = renderNight({ state: s, redirect() {}, nav() {}, set() {} }, [day]);
const byId = id => all(nodes).find(n => n.id === id);

for (const [ta, heading] of [['ci-win', 'Today\'s Top G win'], ['ci-slip', 'Slipped without knowing?']]) {
  test(`${ta}: named by the section heading, helper line is the description`, () => {
    const named = byId(byId(ta).getAttribute('aria-labelledby'));
    assert.ok(named, 'aria-labelledby target');
    assert.equal(named.tagName, 'H2');
    assert.equal(named.textContent, heading);
    const helper = byId(byId(ta).getAttribute('aria-describedby'));
    assert.equal(helper.getAttribute('for'), ta); // the visible helper <label> keeps its for=
  });
}
