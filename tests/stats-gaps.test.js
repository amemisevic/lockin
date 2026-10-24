import test from 'node:test';
import assert from 'node:assert/strict';
import { resultCounts, protocolRates, weekdayRates, heatmap, taskTotals } from '../src/core/stats.js';
import { defaultState } from '../src/core/model.js';

// Backlog T7-1 (Task 21): gaps left by tests/stats.test.js. 2026-10-01 is a Thursday (weekdayIdx 3).
const task = (id, repeat, o = {}) => ({ id, title: `Task ${id}`, note: '', start: null, end: null, date: null,
  repeat: { type: repeat, days: [] }, skip: [], archived: false, ...o });
const closed = title => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false, auto: null,
  night: { at: 2, protocols: [{ id: 'p1', title, status: 'held' }], redLines: [], win: '', bottomG: { archetype: '', tactic: '', text: '' },
    suggested: 'passed', override: null }, result: 'passed', closedAt: 2 });
const challenge = startDate => ({ startDate, length: 30, protocols: [{ id: 'p1', title: 'x', med: null }], redLines: [], redoUsed: null });

test('n:null with a taskLog older than the challenge: tasks count from the first log, results from the start', () => {
  const s = { ...defaultState(), tasks: [task('h1', 'daily')], challenge: challenge('2026-10-06'),
    taskLog: { '2026-10-05': { h1: 'done' }, '2026-10-06': { h1: 'failed' } } };
  const range = { endDate: '2026-10-07', n: null };
  assert.deepEqual(taskTotals(s, range), { done: 1, failed: 1, stalled: 0, open: 1 });
  assert.deepEqual(resultCounts(s, range), { passed: 0, redo: 0, reset: 0, open: 2 }); // 10-06, 10-07 only
});

test('n:null with no challenge: results are empty, tasks still counted', () => {
  const s = { ...defaultState(), tasks: [task('h1', 'daily')], taskLog: { '2026-10-05': { h1: 'done' } } };
  const range = { endDate: '2026-10-06', n: null };
  assert.deepEqual(resultCounts(s, range), { passed: 0, redo: 0, reset: 0, open: 0 });
  assert.deepEqual(taskTotals(s, range), { done: 1, failed: 0, stalled: 0, open: 1 });
});

test('protocolRates title: the latest closed day in the window wins; a window before the rename keeps the old one', () => {
  const s = { ...defaultState(), challenge: challenge('2026-10-01'),
    days: { '2026-10-01': closed('Old name'), '2026-10-02': closed('New name') } };
  assert.deepEqual(protocolRates(s, { endDate: '2026-10-02', n: null }), [{ title: 'New name', held: 2, missed: 0, med: 0 }]);
  assert.deepEqual(protocolRates(s, { endDate: '2026-10-01', n: 1 }), [{ title: 'Old name', held: 1, missed: 0, med: 0 }]);
});

test('an empty {} taskLog day counts as the earliest log', () => {
  const s = { ...defaultState(), tasks: [task('h1', 'daily')], taskLog: { '2026-10-03': {}, '2026-10-05': { h1: 'done' } } };
  assert.deepEqual(taskTotals(s, { endDate: '2026-10-05', n: null }), { done: 1, failed: 0, stalled: 0, open: 2 });
  const hm = heatmap(s, '2026-10-05');
  const at = d => hm.find(x => x.date === d);
  assert.deepEqual([at('2026-10-02').due, at('2026-10-03').due, at('2026-10-05').done], [0, 1, 1]);
});

test('archived habits never count; a skipped day and weekdays habits drop out of the weekday and heatmap numbers', () => {
  const s = { ...defaultState(), taskLog: { '2026-10-01': { W: 'done', K: 'done' } }, tasks: [
    task('W', 'weekdays'), task('A', 'daily', { archived: true }), task('K', 'daily', { skip: ['2026-10-03'] })] };
  const w = weekdayRates(s, { endDate: '2026-10-07', n: 7 }); // Thu 10-01 .. Wed 10-07
  assert.deepEqual(w.map(x => x.total), [2, 2, 2, 2, 2, 0, 1]); // Mon..Sun; Sat 10-03 skipped, Sun 10-04 only K
  assert.deepEqual(w.map(x => x.done), [0, 0, 0, 2, 0, 0, 0]);
  const hm = heatmap(s, '2026-10-07');
  assert.equal(hm.find(x => x.date === '2026-10-03').due, 0);
  assert.equal(hm.find(x => x.date === '2026-10-04').due, 1);
  assert.equal(hm.find(x => x.date === '2026-10-01').done, 2);
});
