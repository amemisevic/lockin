import test from 'node:test';
import assert from 'node:assert/strict';
import { all, El } from './fakedom.js';
import { shieldToggle } from '../src/ui/controls.js';

// The shared fake's icon has no classed paths; the failed shield redraws the .lam path.
globalThis.DOMParser = class { parseFromString() { const s = new El('svg'); const p = new El('path'); p.setAttribute('class', 'lam'); s.append(p); return { documentElement: s }; } };

// T10-1: open / failed / stalled shields all have aria-pressed=false and the same name; the state is also a description.
const STATES = { open: 'Open', failed: 'Failed', stalled: 'Stalled' };

for (const [status, word] of Object.entries(STATES)) {
  test(`${status} shield: aria-describedby points at its state text "${word}"`, () => {
    const btn = shieldToggle({ status, onToggle() {}, label: 'Task A', id: 'sh-t1' });
    assert.equal(btn.getAttribute('aria-label'), 'Task A'); // name unchanged
    const target = all([btn]).find(n => n.id === btn.getAttribute('aria-describedby'));
    assert.ok(target, 'describedby target inside the button');
    assert.equal(target.textContent, word);
  });
}

test('done shield: aria-pressed is the state, no description', () => {
  const btn = shieldToggle({ status: 'done', onToggle() {}, label: 'Task A', id: 'sh-t1' });
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  assert.equal(btn.getAttribute('aria-describedby'), null);
});
