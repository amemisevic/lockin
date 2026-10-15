import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/core/tasks.js';
import { defaultState, validateState } from '../src/core/model.js';

// 2026-10-12 is a Monday.
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14', SAT = '2026-10-17', SUN = '2026-10-18';

const task = (o = {}) => ({ id: 'a', title: 'Task A', note: '', start: null, end: null, date: null,
  repeat: { type: 'none', days: [] }, skip: [], archived: false, ...o });
const withTasks = (tasks, taskLog = {}) => ({ ...defaultState(), tasks, taskLog });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

test('isDue: none is due only on its date', () => {
  const t = task({ date: MON });
  assert.equal(T.isDue(t, MON), true);
  assert.equal(T.isDue(t, TUE), false);
});

test('isDue: daily is due every day', () => {
  const t = task({ repeat: { type: 'daily', days: [] } });
  for (const d of [MON, TUE, WED, SAT, SUN]) assert.equal(T.isDue(t, d), true);
});

test('isDue: weekdays is Mon-Fri, not Saturday or Sunday', () => {
  const t = task({ repeat: { type: 'weekdays', days: [] } });
  assert.equal(T.isDue(t, MON), true);
  assert.equal(T.isDue(t, '2026-10-16'), true);
  assert.equal(T.isDue(t, SAT), false);
  assert.equal(T.isDue(t, SUN), false);
});

test('isDue: custom [0,2] is due Mon and Wed only', () => {
  const t = task({ repeat: { type: 'custom', days: [0, 2] } });
  const due = [MON, TUE, WED, '2026-10-15', '2026-10-16', SAT, SUN].map(d => T.isDue(t, d));
  assert.deepEqual(due, [true, false, true, false, false, false, false]);
});

test('isDue: a skipped date is not due; archived is never due', () => {
  assert.equal(T.isDue(task({ repeat: { type: 'daily', days: [] }, skip: [TUE] }), TUE), false);
  assert.equal(T.isDue(task({ repeat: { type: 'daily', days: [] }, skip: [TUE] }), MON), true);
  assert.equal(T.isDue(task({ repeat: { type: 'daily', days: [] }, archived: true }), MON), false);
  assert.equal(T.isDue(task({ date: MON, archived: true }), MON), false);
});

test('tasksOn: only due tasks, 09:00 before 14:00 before untimed, ties by title; done reports done', () => {
  const s = withTasks([
    task({ id: 'u', title: 'Task U', repeat: { type: 'daily', days: [] } }),
    task({ id: 'p', title: 'Task P', date: MON, start: '14:00' }),
    task({ id: 'b', title: 'Task B', date: MON, start: '09:00' }),
    task({ id: 'a', title: 'Task A', date: MON, start: '09:00' }),
    task({ id: 'x', title: 'Task X', date: TUE, start: '08:00' }),
  ], { [MON]: { p: 'done' } });
  const v = T.tasksOn(s, MON);
  assert.deepEqual(v.map(x => x.task.id), ['a', 'b', 'p', 'u']);
  assert.deepEqual(v.map(x => x.status), ['open', 'open', 'done', 'open']);
});

test('validateTask: messages in order', () => {
  const base = { title: 'Task A', repeat: { type: 'none', days: [] } };
  assert.equal(T.validateTask({ title: '  ' }), 'Add a title.');
  assert.equal(T.validateTask({ ...base, start: '10:00', end: '09:00' }), 'End must be after start.');
  assert.equal(T.validateTask({ ...base, start: '10:00', end: '10:00' }), 'End must be after start.');
  assert.equal(T.validateTask({ ...base, start: '25:00' }), 'Enter a valid time.');
  assert.equal(T.validateTask({ ...base, start: '09:00', end: '9:5' }), 'Enter a valid time.');
  assert.equal(T.validateTask({ ...base, repeat: { type: 'custom', days: [] } }), 'Pick at least one day.');
  assert.equal(T.validateTask({ title: '', start: '25:00' }), 'Add a title.');
});

test('validateTask: valid drafts return null, absent times allowed, partial draft does not throw', () => {
  assert.equal(T.validateTask({ title: 'Task A' }), null);
  assert.equal(T.validateTask({ title: 'Task A', start: '', end: undefined }), null);
  assert.equal(T.validateTask({ title: 'Task A', start: null, end: '09:00' }), null);
  assert.equal(T.validateTask({ title: 'Task A', start: '09:00', end: '10:00', repeat: { type: 'custom', days: [1] } }), null);
});

test('setTaskStatus then null clears the key and keeps the date entry', () => {
  let s = T.setTaskStatus(withTasks([task({ date: MON })]), MON, 'a', 'failed');
  assert.deepEqual(s.taskLog, { [MON]: { a: 'failed' } });
  s = T.setTaskStatus(s, MON, 'a', null);
  assert.deepEqual(s.taskLog, { [MON]: {} });
  assert.equal('a' in s.taskLog[MON], false);
});

test('habitDots: daily task done 3 of last 7 days', () => {
  const s = withTasks([task({ repeat: { type: 'daily', days: [] } })],
    { [MON]: { a: 'done' }, [WED]: { a: 'done' }, [SUN]: { a: 'done' } });
  assert.deepEqual(T.habitDots(s, 'a', SUN), ['done', 'open', 'done', 'open', 'open', 'open', 'done']);
});

test('habitDots: custom [0] has six off entries', () => {
  const s = withTasks([task({ repeat: { type: 'custom', days: [0] } })], { [MON]: { a: 'stalled' } });
  assert.deepEqual(T.habitDots(s, 'a', SUN), ['stalled', 'off', 'off', 'off', 'off', 'off', 'off']);
});

test('habitDots: unknown id gives seven off', () => {
  assert.deepEqual(T.habitDots(withTasks([]), 'zz', SUN), Array(7).fill('off'));
});

test('moveToTomorrow: one-off moves a day, repeating returns state unchanged', () => {
  const s = withTasks([task({ date: MON }), task({ id: 'h', repeat: { type: 'daily', days: [] } })]);
  assert.equal(T.moveToTomorrow(s, 'a', MON).tasks[0].date, TUE);
  assert.equal(T.moveToTomorrow(s, 'h', MON), s);
  assert.equal(T.moveToTomorrow(s, 'zz', MON), s);
});

test('archiveTask keeps taskLog history', () => {
  const log = { [MON]: { a: 'done' } };
  const s = T.archiveTask(withTasks([task({ date: MON })], log), 'a');
  assert.equal(s.tasks[0].archived, true);
  assert.deepEqual(s.taskLog, log);
});

test('addTask builds a full valid task with the given id', () => {
  const s = T.addTask(defaultState(), { title: 'Task A', date: MON, start: '09:00' }, 'id1');
  assert.deepEqual(s.tasks, [task({ id: 'id1', date: MON, start: '09:00' })]);
  assert.equal(validateState(s), null);
  assert.equal(typeof T.addTask(defaultState(), { title: 'Task B' }).tasks[0].id, 'string');
});

test('updateTask merges and keeps id; skipOn is idempotent; unknown ids leave state unchanged', () => {
  const s = withTasks([task({ repeat: { type: 'daily', days: [] } })]);
  const u = T.updateTask(s, 'a', { title: 'Task B', id: 'other' });
  assert.equal(u.tasks[0].title, 'Task B');
  assert.equal(u.tasks[0].id, 'a');
  const k = T.skipOn(T.skipOn(s, 'a', TUE), 'a', TUE);
  assert.deepEqual(k.tasks[0].skip, [TUE]);
  assert.equal(T.isDue(k.tasks[0], TUE), false);
  assert.equal(T.updateTask(s, 'zz', { title: 'x' }), s);
  assert.equal(T.archiveTask(s, 'zz'), s);
  assert.equal(T.skipOn(s, 'zz', TUE), s);
});

test('openTasks returns only due tasks without a status', () => {
  const s = withTasks([task({ date: MON }), task({ id: 'b', title: 'Task B', date: MON }), task({ id: 'c', date: TUE })],
    { [MON]: { b: 'failed' } });
  assert.deepEqual(T.openTasks(s, MON).map(v => [v.task.id, v.status]), [['a', 'open']]);
});

test('mutating functions never change the input state', () => {
  const s = deepFreeze(withTasks([task({ date: MON }), task({ id: 'h', repeat: { type: 'daily', days: [] } })],
    { [MON]: { a: 'done' } }));
  const before = structuredClone(s);
  T.addTask(s, { title: 'Task C' }, 'c');
  T.updateTask(s, 'a', { title: 'Task Z' });
  T.archiveTask(s, 'h');
  T.skipOn(s, 'h', TUE);
  T.moveToTomorrow(s, 'a', MON);
  T.setTaskStatus(s, MON, 'a', null);
  T.setTaskStatus(s, TUE, 'h', 'done');
  assert.deepEqual(s, before);
});
