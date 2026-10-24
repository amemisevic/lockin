import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { texts } from './fakedom.js';
import { defaultState } from '../src/core/model.js';
import { addTask, setTaskStatus } from '../src/core/tasks.js';
import { dayRecord } from '../src/views/dayReviewLogic.js';
import { reviewBody } from '../src/views/dayReview.js';

const D = '2026-10-05';
const base = () => ({ ...defaultState(), challenge: { startDate: '2026-10-01', length: 30, protocols: [], redLines: [], redoUsed: null } });
const draft = title => ({ title, note: '', start: null, end: null, repeat: { type: 'none', days: [] }, date: D });
const seen = s => texts(reviewBody(dayRecord(s, D))).join('|');

test('empty day: no entries at all', () => {
  const r = dayRecord(base(), D);
  assert.equal(r.empty, true);
  assert.equal(r.dayNo, 5);
  assert.equal(seen(base()), 'Nothing logged.');
});

test('no challenge: dayNo is null and nothing throws', () => {
  assert.equal(dayRecord(defaultState(), D).dayNo, null);
});

test('full day: every field is read and shown', () => {
  let s = base();
  s = addTask(s, draft('Write report'), 't1');
  s = setTaskStatus(s, D, 't1', 'done');
  s.days[D] = { morning: { at: 1, target: 'Ship it', risk: 'Phone', med: [] }, afternoon: { at: 2, onTrack: 'struggling', friction: 'Noise' },
    declaredRedo: false, night: { at: 3, protocols: [{ id: 'p', title: 'Prot', status: 'held' }], redLines: [{ id: 'r', name: 'Line', status: 'held' }],
      win: 'Done', bottomG: { archetype: 'x', tactic: 'y', text: 'Slip text' }, suggested: 'passed', override: null },
    slipNote: 'Snacked', incompleteMorning: false, auto: null, result: 'passed', closedAt: 4 };
  s.warLog[`autopsy-${D}`] = { text: 'State: tired', updatedAt: 5 };
  const r = dayRecord(s, D);
  assert.equal(r.empty, false);
  assert.deepEqual(r.tasks, ['Write report']);
  const t = seen(s);
  for (const x of ['Ship it', 'Phone', 'Struggling', 'Noise', 'Prot: held', 'Line: held', 'Done', 'Slip text', 'Snacked', 'State: tired', 'Write report', 'Passed', 'Task names show today\'s titles.'])
    assert.ok(t.includes(x), x);
});

test('missing fields: only what exists is shown', () => {
  const s = base();
  s.days[D] = { morning: null, afternoon: null, night: null, slipNote: '', auto: 'no-night', result: 'redo', declaredRedo: false };
  const t = seen(s);
  assert.ok(t.includes('Redo') && t.includes('No night check-in'));
  for (const x of ['Morning', 'Afternoon', 'Night', 'Slipped', 'Autopsy', 'Tasks done', 'Nothing logged.']) assert.ok(!t.includes(x), x);
});

test('open tasks and unfiled recovery', () => {
  let s = addTask(base(), draft('Open one'), 't1');
  assert.equal(dayRecord(s, D).empty, true);
  s.recovery[D] = { dueAt: 1, filedAt: null, state: '', time: '', place: '', decision: '', change: '' };
  assert.ok(seen(s).includes('Autopsy not filed.'));
});

test('sw.js caches the two new files, challenge strip wires the review', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('src/views/dayReview.js') && sw.includes('src/views/dayReviewLogic.js'));
  const ch = readFileSync(new URL('../src/views/challenge.js', import.meta.url), 'utf8');
  assert.ok(ch.includes("c.kind === 'future'") && ch.includes('openDayReview'));
});
