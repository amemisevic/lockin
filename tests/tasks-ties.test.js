import test from 'node:test';
import assert from 'node:assert/strict';
import { tasksOn } from '../src/core/tasks.js';
import { defaultState } from '../src/core/model.js';

// Backlog T2-3 (Task 21): order of tasks that share a start key (two untimed tasks, or equal start times).
const DAY = '2026-10-12';
const task = (id, title, start = null) => ({ id, title, note: '', start, end: null, date: DAY,
  repeat: { type: 'none', days: [] }, skip: [], archived: false });
const order = tasks => tasksOn({ ...defaultState(), tasks }, DAY).map(v => v.task.id);

test('two untimed tasks sort by title, whatever the insertion order', () => {
  assert.deepEqual(order([task('b', 'Beta'), task('a', 'Alpha')]), ['a', 'b']);
  assert.deepEqual(order([task('a', 'Alpha'), task('b', 'Beta')]), ['a', 'b']);
});

test('untimed tasks come after timed ones; each group is title-ordered', () => {
  assert.deepEqual(order([task('u2', 'Alpha'), task('t', 'Zulu', '09:00'), task('u1', 'Aardvark')]), ['t', 'u1', 'u2']);
});

test('equal start times fall back to the title too', () => {
  assert.deepEqual(order([task('b', 'Beta', '08:00'), task('a', 'Alpha', '08:00')]), ['a', 'b']);
});

test('same title and same start keep their insertion order (stable sort)', () => {
  assert.deepEqual(order([task('x', 'Same'), task('y', 'Same')]), ['x', 'y']);
});
