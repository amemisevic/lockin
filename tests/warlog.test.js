import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';

// Expected values are hand-derived from the plan's Data model, Task 5 text and the owner calls (quoted per assertion).
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const st = (warLog = {}) => deepFreeze({ ...defaultState(), warLog });
const e = (text, updatedAt) => ({ text, updatedAt });

test('OATH_KEYS and OATH_TITLES exact values', () => {
  // Plan: "OATH_KEYS = ['contract','funeral','code','redlines-w1']".
  assert.deepEqual(W.OATH_KEYS, ['contract', 'funeral', 'code', 'redlines-w1']);
  // Owner answer: "OATH_TITLES = { contract:'Contract', funeral:'The Funeral', code:'The Code', 'redlines-w1':'Week 1 red lines' }".
  assert.deepEqual(W.OATH_TITLES, { contract: 'Contract', funeral: 'The Funeral', code: 'The Code', 'redlines-w1': 'Week 1 red lines' });
});

// ---- setWarEntry ----

test('setWarEntry: stores text as given with updatedAt = nowMs', () => {
  const s = st({ code: e('Code text', 1) });
  const n = W.setWarEntry(s, 'contract', '  Contract text  ', 500);
  // Owner call 6 pattern / Data model "warLog: { [key]: { text, updatedAt: ms } }" → updatedAt = nowMs.
  assert.deepEqual(n.warLog, { code: e('Code text', 1), contract: e('  Contract text  ', 500) });
  // Overwrite: new text, new updatedAt.
  assert.deepEqual(W.setWarEntry(n, 'contract', 'New text', 900).warLog.contract, e('New text', 900));
  assert.equal(validateState(n), null);
});

test('setWarEntry: every allowed key pattern is accepted', () => {
  // Owner call 5: "the four OATH_KEYS, /^autopsy-\d{4}-\d{2}-\d{2}$/, /^day-([1-9]|[12]\d|30)$/".
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1', 'autopsy-2026-10-13', 'day-1', 'day-9', 'day-10', 'day-29', 'day-30']) {
    assert.deepEqual(W.setWarEntry(st(), k, 'Text', 7).warLog, { [k]: e('Text', 7) }, k);
  }
});

test('setWarEntry: an invalid key returns the same state', () => {
  const s = st({ code: e('Code text', 1) });
  // Owner call 5: "Any other key returns the state unchanged".
  // 'day-31' and 'day-0' are outside 1–30; 'day-01' fails ([1-9]|[12]\d|30); 'autopsy-2026-1-1' fails \d{2}.
  for (const k of ['notes', 'day-31', 'day-0', 'day-01', 'autopsy-2026-1-1', 'autopsy-', 'Contract', '']) {
    assert.equal(W.setWarEntry(s, k, 'Text', 7), s, k);
  }
});

test('setWarEntry: empty or whitespace-only text deletes the key', () => {
  const s = st({ contract: e('Contract text', 1), code: e('Code text', 2) });
  // Plan: "setWarEntry(...,'') removes the key".
  assert.deepEqual(W.setWarEntry(s, 'contract', '', 9).warLog, { code: e('Code text', 2) });
  // Owner call 5: "text that is empty after trim deletes the key".
  assert.deepEqual(W.setWarEntry(s, 'contract', ' \n\t ', 9).warLog, { code: e('Code text', 2) });
  assert.equal('contract' in W.setWarEntry(s, 'contract', '   ', 9).warLog, false);
});

// ---- oathComplete ----

test('oathComplete: false until all four oath entries are non-blank', () => {
  let s = st({ 'day-1': e('Day text', 1) });
  // Plan: "oathComplete false until all four oath keys non-empty"; a day entry does not count.
  assert.equal(W.oathComplete(s), false);
  for (const [i, k] of W.OATH_KEYS.entries()) {
    assert.equal(W.oathComplete(s), false, `before ${k}`);
    s = W.setWarEntry(s, k, `Text ${i}`, i + 1);
  }
  // All four set → true.
  assert.equal(W.oathComplete(s), true);
});

test('oathComplete: a whitespace-only stored entry does not count', () => {
  // Owner answer: "each of the four oath entries must be non-blank after trim" (state built by hand, as from an import).
  const s = st({ contract: e('Contract text', 1), funeral: e('   ', 2), code: e('Code text', 3), 'redlines-w1': e('Red text', 4) });
  assert.equal(W.oathComplete(s), false);
});

// ---- warEntries ----

test('warEntries: groups, order, titles, preview; unknown keys skipped', () => {
  const long = 'a'.repeat(80) + 'b'.repeat(20);
  // Insertion order scrambled on purpose.
  const s = st({
    'day-10': e('Day ten', 10), [`autopsy-2026-10-13`]: e('Autopsy one', 13), code: e('Code text', 3),
    'day-2': e('Day two', 2), notes: e('Unknown', 99), 'redlines-w1': e('Red text', 4),
    'autopsy-2026-10-20': e(long, 20), contract: e('Contract text', 1), funeral: e('Funeral text', 2), 'day-1': e('Day one', 11),
  });
  // Owner call 7: "group order Oath (fixed key order), Autopsies (newest date first), Days (by number ascending).
  // Titles exactly as in the plan. preview = first 80 chars of the text." Owner answer: unknown keys skipped.
  assert.deepEqual(W.warEntries(s), [
    { key: 'contract', title: 'Contract', group: 'Oath', updatedAt: 1, preview: 'Contract text' },
    { key: 'funeral', title: 'The Funeral', group: 'Oath', updatedAt: 2, preview: 'Funeral text' },
    { key: 'code', title: 'The Code', group: 'Oath', updatedAt: 3, preview: 'Code text' },
    { key: 'redlines-w1', title: 'Week 1 red lines', group: 'Oath', updatedAt: 4, preview: 'Red text' },
    // 2026-10-20 newer than 2026-10-13 → first. Its 100-char text → the 80 'a's.
    { key: 'autopsy-2026-10-20', title: 'Autopsy · 2026-10-20', group: 'Autopsies', updatedAt: 20, preview: 'a'.repeat(80) },
    { key: 'autopsy-2026-10-13', title: 'Autopsy · 2026-10-13', group: 'Autopsies', updatedAt: 13, preview: 'Autopsy one' },
    // By NUMBER: 1 < 2 < 10 (a string sort would give day-1, day-10, day-2).
    { key: 'day-1', title: 'Day 1 notes', group: 'Days', updatedAt: 11, preview: 'Day one' },
    { key: 'day-2', title: 'Day 2 notes', group: 'Days', updatedAt: 2, preview: 'Day two' },
    { key: 'day-10', title: 'Day 10 notes', group: 'Days', updatedAt: 10, preview: 'Day ten' },
  ]);
});

test('warEntries: missing oath keys are left out, order kept; empty log → []', () => {
  const s = st({ code: e('Code text', 3), contract: e('Contract text', 1) });
  // Fixed oath order: contract before code.
  assert.deepEqual(W.warEntries(s).map(x => x.key), ['contract', 'code']);
  assert.deepEqual(W.warEntries(st()), []);
});
