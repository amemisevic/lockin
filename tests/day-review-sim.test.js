import test from 'node:test';
import assert from 'node:assert/strict';
import { texts } from './fakedom.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addTask, setTaskStatus } from '../src/core/tasks.js';
import { stripCells } from '../src/views/challengeLogic.js';
import { dayRecord } from '../src/views/dayReviewLogic.js';
import { reviewBody } from '../src/views/dayReview.js';

// DR3: a fake 30-day challenge in the real state shape (checked by validateState), every strip kind.
// Day 12 is "today". Day 1 passed (all fields), 2 passed (some fields), 3 reset (unfiled recovery), 4 redo (no night),
// 5 open with data, 6 open and empty, 7-11 passed (result only), 13-30 future.
const START = '2026-10-01';
const TODAY = '2026-10-12';
const d = n => `2026-10-${String(n).padStart(2, '0')}`;
const day = over => ({ morning: null, afternoon: null, night: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, result: null, closedAt: null, ...over });
const draft = (title, date) => ({ title, note: '', start: null, end: null, repeat: { type: 'none', days: [] }, date });
const night = (status, result) => ({ at: 3, protocols: [{ id: 'p', title: 'Prot', status }], redLines: [{ id: 'r', name: 'Line', status: result === 'reset' ? 'crossed' : 'held' }],
  win: 'Won it', bottomG: { archetype: 'a', tactic: 't', text: 'Slip text' }, suggested: result, override: null });

function fake() {
  let s = { ...defaultState(), challenge: { startDate: START, length: 30, protocols: [{ id: 'p', title: 'Prot', med: null }], redLines: [{ id: 'r', name: 'Line' }], redoUsed: null } };
  s = addTask(s, draft('Write report', d(1)), 't1');
  s = setTaskStatus(s, d(1), 't1', 'done');
  s = addTask(s, draft('Call back', d(12)), 't2');
  s = setTaskStatus(s, d(12), 't2', 'done');
  s = addTask(s, draft('Still open', d(5)), 't3');
  s.days[d(1)] = day({ morning: { at: 1, target: 'Ship it', risk: 'Phone', med: [] }, afternoon: { at: 2, onTrack: 'struggling', friction: 'Noise' },
    night: night('held', 'passed'), slipNote: 'Snacked', result: 'passed', closedAt: 4 });
  s.warLog[`autopsy-${d(1)}`] = { text: 'State: tired', updatedAt: 5 };
  s.recovery[d(1)] = { dueAt: 1, filedAt: 6, state: 'tired', time: '', place: '', decision: '', change: '' };
  s.days[d(2)] = day({ morning: { at: 1, target: 'Only morning', risk: '', med: [] }, result: 'passed', closedAt: 4 });
  s.days[d(3)] = day({ night: night('missed', 'reset'), result: 'reset', closedAt: 4 });
  s.recovery[d(3)] = { dueAt: 1, filedAt: null, state: '', time: '', place: '', decision: '', change: '' };
  s.days[d(4)] = day({ auto: 'no-night', result: 'redo', closedAt: 4 });
  s.days[d(5)] = day({ morning: { at: 1, target: 'Left open', risk: '', med: [] } });
  for (let n = 7; n <= 11; n++) s.days[d(n)] = day({ result: 'passed', closedAt: 4 });
  s.days[d(12)] = day({ morning: { at: 1, target: 'Today target', risk: '', med: [] } });
  return s;
}
const S = fake();
const seen = date => texts(reviewBody(dayRecord(S, date))).join('|');
const has = (date, ...xs) => xs.forEach(x => assert.ok(seen(date).includes(x), `${date} shows ${x}`));
const lacks = (date, ...xs) => xs.forEach(x => assert.ok(!seen(date).includes(x), `${date} hides ${x}`));

test('the fake state is valid and the strip has every kind', () => {
  assert.equal(validateState(S), null);
  const cells = stripCells(S, TODAY);
  assert.equal(cells.length, 30);
  const k = n => cells[n - 1].kind;
  assert.deepEqual([k(1), k(3), k(4), k(5), k(6), k(12), k(13), k(30)], ['passed', 'reset', 'redo', 'open', 'open', 'today', 'future', 'future']);
});

test('passed day with every field', () => {
  const r = dayRecord(S, d(1));
  assert.equal(r.empty, false);
  assert.equal(r.dayNo, 1);
  assert.equal(r.result, 'passed');
  assert.deepEqual(r.tasks, ['Write report']);
  assert.equal(r.autopsy, 'State: tired');
  assert.equal(r.recoveryPending, false);
  has(d(1), 'Passed', 'Ship it', 'Phone', 'Struggling', 'Noise', 'Prot: held', 'Line: held', 'Won it', 'Slip text', 'Snacked',
    'State: tired', 'Write report', 'Task names show today\'s titles.');
  lacks(d(1), 'Nothing logged.', 'Autopsy not filed.');
});

test('passed day with only some fields', () => {
  has(d(2), 'Passed', 'Only morning');
  lacks(d(2), 'Afternoon', 'Night', 'Slipped', 'Autopsy', 'Tasks done', 'Nothing logged.');
  has(d(7), 'Passed');
  lacks(d(7), 'Morning', 'Tasks done', 'Nothing logged.');
});

test('reset day with unfiled recovery', () => {
  assert.equal(dayRecord(S, d(3)).recoveryPending, true);
  has(d(3), 'Reset', 'Prot: missed', 'Line: crossed', 'Autopsy not filed.');
});

test('redo day without a night check-in', () => {
  has(d(4), 'Redo', 'No night check-in');
  lacks(d(4), 'Nothing logged.');
});

test('open day with data, open day empty, today', () => {
  const o = dayRecord(S, d(5));
  assert.equal(o.empty, false);
  assert.deepEqual(o.tasks, []); // the open task is not listed
  has(d(5), 'Left open');
  lacks(d(5), 'Result', 'Tasks done', 'Still open');
  const e = dayRecord(S, d(6));
  assert.equal(e.empty, true);
  assert.equal(e.dayNo, 6);
  assert.equal(seen(d(6)), 'Nothing logged.');
  assert.equal(dayRecord(S, TODAY).dayNo, 12);
  has(TODAY, 'Today target', 'Call back');
});

test('future day returns nothing', () => {
  for (const n of [13, 20, 30]) {
    const r = dayRecord(S, d(n));
    assert.equal(r.empty, true);
    assert.equal(r.result, null);
    assert.deepEqual(r.tasks, []);
    assert.equal(seen(d(n)), 'Nothing logged.');
  }
});
