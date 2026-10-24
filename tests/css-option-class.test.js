import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './fakedom.js';
import { segmented } from '../src/ui/controls.js';
import { all, hasClass } from './fakedom.js';

// T16-4: the Night stalled / crossed colours hang on an option class, not on button position.
test('segmented: an option cls lands on its button, with on when chosen', () => {
  const seg = segmented({ options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', cls: 'opt-x' }], value: 'b', onPick() {}, label: 'G' });
  const [a, b] = all([seg]).filter(n => n.tagName === 'BUTTON');
  assert.equal(hasClass(a, 'opt-x'), false);
  assert.ok(hasClass(b, 'opt-x') && hasClass(b, 'on'));
});

test('Night stalled / crossed options carry opt-stalled / opt-crossed; night.css has no :nth-child', () => {
  const view = readFileSync(new URL('../src/views/checkinNight.js', import.meta.url), 'utf8');
  assert.match(view, /cls: 'opt-stalled'/);
  assert.match(view, /cls: 'opt-crossed'/);
  assert.match(view, /value === 'failed' \? \{ \.\.\.o, cls: 'opt-failed' \}/);
  assert.match(view, /value === 'missed' \? \{ \.\.\.o, cls: 'opt-failed' \}/);
  assert.match(readFileSync(new URL('../src/night.css', import.meta.url), 'utf8'), /\.seg button\.opt-failed\.on\{color:#fff\}/);
  assert.doesNotMatch(readFileSync(new URL('../src/night.css', import.meta.url), 'utf8'), /nth-child/);
});
