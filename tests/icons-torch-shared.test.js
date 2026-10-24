import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './fakedom.js';
import { all, hasClass } from './fakedom.js';
import { torch } from '../src/icons.js';

// T12-1: Today and Challenge drew the same torch twice; it lives in icons.js now.
test('torch: lit and unlit, flame plus stand', () => {
  const lit = torch(true), off = torch(false);
  assert.equal(all([lit]).filter(n => n.tagName === 'PATH').length, 2);
  assert.ok(hasClass(lit, 'td-torch') && !hasClass(lit, 'off'));
  assert.ok(hasClass(off, 'td-torch') && hasClass(off, 'off'));
  assert.equal(lit.getAttribute('viewBox'), '0 0 10 16');
});

test('today.js and challenge.js define no torch of their own', () => {
  for (const f of ['today', 'challenge']) {
    const src = readFileSync(new URL(`../src/views/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /(?:function|const) torch\b/, f);
  }
});
