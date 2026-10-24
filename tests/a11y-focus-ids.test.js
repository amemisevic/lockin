import test from 'node:test';
import assert from 'node:assert/strict';
import { all } from './fakedom.js';
import { chips, segmented, helpButton } from '../src/ui/controls.js';
import { taskRow } from '../src/ui/taskRow.js';

// T10-2: app.js render() puts focus back on the focused control by id, so every control that causes a re-render needs a stable id.
const OPTS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
const buttons = group => group.children.filter(c => c.tagName === 'BUTTON');

test('segmented and chips: an id prefix gives each button a stable id by position', () => {
  for (const make of [segmented, chips]) {
    const g = make({ options: OPTS, value: 'a', onPick() {}, id: 'grp' });
    assert.deepEqual(buttons(g).map(b => b.id), ['grp-0', 'grp-1']);
  }
});

test('segmented and chips: no id given, no id set (in-place groups keep working)', () => {
  assert.deepEqual(buttons(segmented({ options: OPTS, value: 'a', onPick() {} })).map(b => b.id), ['', '']);
});

test('help "?" button has an id from its key', () => {
  assert.equal(helpButton('begin').id, 'help-begin');
});

test('task row: the ⋯ button has an id from the task id; the shield id is different', () => {
  const view = { task: { id: 't7', title: 'Task A', repeat: { type: 'none' } }, status: 'open' };
  const row = taskRow({ state: {}, set() {} }, view, '2027-06-14', { onMenu() {} });
  const more = all([row]).find(n => n.getAttribute('aria-label') === 'Task options');
  assert.equal(more.id, 'mo-t7');
  assert.equal(all([row]).find(n => n.getAttribute('aria-label') === 'Task A').id, 'sh-t7');
});
