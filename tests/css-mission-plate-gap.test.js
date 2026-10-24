import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T12-2: a pack without the day's mission leaves the actions row first in the plate; it must not keep its 16 px top margin.
test('screens.css: .ch-acts drops its top margin when it is the first child of the mission plate', () => {
  const css = readFileSync(new URL('../screens.css', import.meta.url), 'utf8');
  assert.match(css, /\.ch-mp>\.ch-acts:first-child\{margin-top:0\}/);
});
