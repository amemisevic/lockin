import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import './fakedom.js';
import { chips, segmented } from '../src/ui/controls.js';

// T10-5: a chip / segmented group is a role=group; without a name VoiceOver says only "group".
const OPTS = [{ value: 'a', label: 'A' }];

test('chips and segmented: label becomes the group aria-label', () => {
  assert.equal(chips({ options: OPTS, value: null, onPick() {}, label: 'Repeat' }).getAttribute('aria-label'), 'Repeat');
  assert.equal(segmented({ options: OPTS, value: null, onPick() {}, label: 'Range' }).getAttribute('aria-label'), 'Range');
});

test('every chips(/segmented( call site in src/views passes a label (Gym and the task sheet name the group right after)', () => {
  const dir = new URL('../src/views/', import.meta.url);
  const bad = [];
  for (const f of readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\b(?:chips|segmented)\(\{/g)) {
      let depth = 0, end = m.index + m[0].length - 2; // the call's own parentheses, so a neighbour's label: never counts
      for (let i = end; i < src.length; i++) { if (src[i] === '(') depth++; if (src[i] === ')' && --depth === 0) { end = i; break; } }
      const call = src.slice(m.index, end);
      const named = /label: [^'\s]|label: '/.test(call.replace(/\{ value: [^}]*\}/g, '')) || (/\.setAttribute\('aria-label'/.test(src));
      if (!named) bad.push(`${f}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(bad, []);
});
