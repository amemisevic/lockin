import test from 'node:test';
import assert from 'node:assert/strict';
import { El, windowListeners } from './fakedom.js';
import { focusHeading, headingOnRouteChange } from '../src/focus.js';

// T9-1: on a route change or Back, focus moves to the new screen's heading.
const heading = tag => { const e = new El(tag); e.append('Tasks'); e.focused = 0; e.focus = () => { e.focused++; }; return e; };

test('the first h1 in the view becomes focusable (tabindex -1) and takes focus', () => {
  const view = new El('main');
  const h1 = heading('h1');
  view.append(new El('div'), h1);
  assert.equal(focusHeading(view), true);
  assert.equal(h1.getAttribute('tabindex'), '-1');
  assert.equal(h1.focused, 1);
});

test('no h1 (a redirect left the view empty): nothing happens', () => {
  assert.equal(focusHeading(new El('main')), false);
});

test('a hashchange with a new hash moves focus to the heading; the same hash (a re-render request) does not', () => {
  const view = new El('main');
  const h1 = heading('h1');
  view.append(h1);
  location.hash = '#tasks';
  headingOnRouteChange(view);
  const fire = () => windowListeners.hashchange.at(-1)();
  fire();
  assert.equal(h1.focused, 0, 'same hash: no focus move');
  location.hash = '#gym/stats';
  fire();
  assert.equal(h1.focused, 1);
  fire();
  assert.equal(h1.focused, 1, 'still the same hash');
  location.hash = '#tasks'; // Back
  fire();
  assert.equal(h1.focused, 2);
});
