import test from 'node:test';
import assert from 'node:assert/strict';
import { all, El } from './fakedom.js';
import { announce } from '../src/ui/live.js';

El.prototype.replaceChildren = function (...cs) { this.children = []; this.append(...cs); }; // the shared fake lacks it

// T11-1: one persistent live region (outside the screen that is rebuilt on every render) whose text is updated.
const regions = () => all(document.body.children).filter(n => n.getAttribute('role') === 'alert');

test('announce: one region in <body>, the same node every time, its text replaced', () => {
  announce('First.');
  assert.equal(regions().length, 1);
  const el = regions()[0];
  assert.equal(el.textContent, 'First.');
  announce('Second.');
  assert.equal(regions().length, 1);
  assert.equal(regions()[0], el);
  assert.equal(el.textContent, 'Second.');
});

test('announce with no text clears the region', () => {
  announce('Something.');
  announce('');
  assert.equal(regions()[0].textContent, '');
});
