import test from 'node:test';
import assert from 'node:assert/strict';
import './fakedom.js';
import { all, hasClass } from './fakedom.js';
import { heatGrid } from '../src/views/analyticsParts.js';

// T18-4: the "Not due" legend dot is drawn at the Partly size (it was 2.6 px at 16 px); the grid's own dots stay as they are.
const hm = { label: 'Habits', cells: Array.from({ length: 28 }, (_, i) => ({ kind: i === 0 ? 'none' : 'part', date: `d${i}` })) };

test('heatGrid legend: the Not due dot is drawn at the Partly size', () => {
  const [grid, legend] = heatGrid(hm);
  const radius = (root, cls) => Number(all([root]).find(n => hasClass(n, cls)).getAttribute('r'));
  assert.equal(radius(legend, 'hm-none'), radius(legend, 'hm-part'));
  assert.equal(radius(grid, 'hm-none'), 0.08); // the grid keeps its tiny dot (R5, pinned by tests/analytics-view.test.js)
});
