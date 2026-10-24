import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T17-3: recovery.js adds its classes to the shared header / plate / heading; it never assigns className over them.
// (No classList: tests/recovery-view.test.js is frozen and its fake DOM has none.)
test('recovery.js does not assign className over a shared element', () => {
  const src = readFileSync(new URL('../src/views/recovery.js', import.meta.url), 'utf8');
  const hits = src.split('\n').filter(l => /className\s*[:=]/.test(l) && !/ta\.className/.test(l));
  assert.deepEqual(hits, []);
});
