import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T16-5: the Night row class .q must not be a global selector.
test('night.css: every selector that names .q is scoped under .nt-sec', () => {
  const css = readFileSync(new URL('../src/night.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const bad = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(sel => /\.q\b/.test(sel) && !/^\.nt-sec \.q\b/.test(sel));
  assert.deepEqual(bad, []);
});
