import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './fakedom.js';
import { hasClass } from './fakedom.js';
import { resetBlock } from '../src/views/analyticsParts.js';

// T18-1: the Reset bar's "missed protocols" segment is hatched bronze (shape, not only hue); the red-line segment stays solid crimson.
const css = readFileSync(new URL('../src/analytics.css', import.meta.url), 'utf8');

test('resetBlock: the bar carries an-reset, rects keep .an-red / .an-miss', () => {
  const [bar] = resetBlock({ label: 'Resets', counts: [1, 2], redLine: 1, protocols: 2, byProtocol: [] });
  assert.ok(hasClass(bar, 'an-reset'));
  assert.ok(hasClass(bar, 'an-trk'));
});

test('analytics.css: the missed segment is transparent over a bronze hatch; .an-miss keeps its crimson rule first', () => {
  assert.match(css, /\.an-reset\{[^}]*repeating-linear-gradient\([^}]*var\(--bronze-lt\)/);
  assert.match(css, /\.an-reset \.an-miss\{fill:transparent\}/);
  assert.ok(css.indexOf('.an-miss{fill:var(--crimson)}') < css.indexOf('.an-reset .an-miss'));
});
