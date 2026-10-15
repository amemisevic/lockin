import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../src/core/warlog.js';
import { defaultState } from '../src/core/model.js';

// Task 5 fix round 2. Expected values follow the owner ruling on Minor 4 (quoted per assertion).
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const st = warLog => deepFreeze({ ...defaultState(), warLog });
const e = (text, updatedAt) => ({ text, updatedAt });

test('setWarEntry: non-string text returns the same state', () => {
  const s = st({ contract: e('Contract text', 1) });
  // Owner ruling: "any non-string text (undefined, null, number, object) returns the state unchanged (same reference)".
  for (const [label, text] of [['undefined', undefined], ['null', null], ['5', 5], ['{}', {}]]) {
    const n = W.setWarEntry(s, 'contract', text, 9);
    assert.equal(n, s, label);
    assert.deepEqual(n.warLog.contract, e('Contract text', 1), label);
  }
});

test('setWarEntry: whitespace-only string still deletes the key', () => {
  const s = st({ contract: e('Contract text', 1) });
  // Owner ruling: "Only a real string that is empty or whitespace-only deletes the key".
  assert.deepEqual(W.setWarEntry(s, 'contract', ' \t\n ', 9).warLog, {});
});
