import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './fakedom.js';
import { all, hasClass } from './fakedom.js';
import { renderMission } from '../src/views/mission.js';
import { renderWarLog, renderWarEntry } from '../src/views/warlog.js';
import { startChallenge } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { validatePack, importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// T14-3 polish: one h1 on Mission, a prompt in the empty editor, no ISO date in an autopsy title, room under the War Log header.
const D1 = '2026-10-13', D2 = addDays(D1, 1);
const at = (key, h) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h).getTime(); };
const app = (state, today) => ({ state, today: () => today, set() {}, nav() {}, redirect() {} });
function started() {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(D1, 7));
  return startChallenge(s, D1, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }).state;
}
const PACK = validatePack(JSON.stringify({ v: 1, missions: [{ day: 3, title: 'Mission A', body: 'Body A' }] })).pack;
const css = readFileSync(new URL('../screens.css', import.meta.url), 'utf8');

test('Mission has exactly one h1 (the pushed header); the title is an h2', () => {
  const els = all(renderMission(app(importPack(started(), PACK), addDays(D1, 2)), ['3']));
  assert.equal(els.filter(n => n.tagName === 'H1').length, 1);
  const title = els.find(n => hasClass(n, 'ttl'));
  assert.equal(title.tagName, 'H2');
  assert.equal(title.textContent, 'Mission A');
});

test('the empty War Log editor has a prompt, and its colour is set', () => {
  const ta = all(renderWarEntry(app(started(), D1), ['day-1'])).find(n => n.tagName === 'TEXTAREA');
  assert.ok(ta.getAttribute('placeholder'));
  assert.match(css, /\.wl-ta::placeholder\{[^}]*color:var\(--text-3\)/);
});

test('an autopsy title shows a long date, not the ISO key', () => {
  let s = closeNight(started(), D1, { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } }, at(D1, 21)).state;
  s = fileAutopsy(s, D1, { state: 'Tired after work', time: 'Evening', place: 'Room A',
    decision: 'I will block the app after work', change: 'I will delete the app from the phone' }, at(D2, 8)).state;
  const head = all(renderWarEntry(app(s, D2), [`autopsy-${D1}`])).find(n => n.tagName === 'H1');
  assert.doesNotMatch(head.textContent, /\d{4}-\d{2}-\d{2}/);
  assert.match(head.textContent, /Autopsy · Tuesday 13 October/);
  const row = all(renderWarLog(app(s, D2))).find(n => hasClass(n, 'rt') && n.textContent.startsWith('Autopsy'));
  assert.doesNotMatch(row.textContent, /\d{4}-\d{2}-\d{2}/);
});

test('War Log: the first section heading has room under the header', () => {
  const nodes = renderWarLog(app(started(), D1));
  assert.ok(hasClass(nodes[0], 'wl-hd'));
  assert.match(css, /\.wl-hd\+\.sec\{margin-top:\d+px\}/);
});
