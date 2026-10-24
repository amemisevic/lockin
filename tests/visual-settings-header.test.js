import test from 'node:test';
import assert from 'node:assert/strict';
import { all, hasClass } from './fakedom.js';
import { renderSettings } from '../src/views/settings.js';
import { defaultState } from '../src/core/model.js';

// T21-6: the Settings board has no eyebrow above the title (title at y 60); the app's extra "Lock In" eyebrow pushed it to y 78.
globalThis.matchMedia = () => ({ matches: false });
test('Settings starts with the title, no eyebrow line above it', () => {
  const out = renderSettings({ state: defaultState(), today: () => '2026-10-12', version: '2.4.1', set() {} });
  assert.equal(all(out).filter(n => n.tagName === 'P' && hasClass(n, 'eyebrow')).length, 0);
});
