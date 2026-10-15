import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_NAMES, weekOf, weekLabel, dayLabel, formFromTask, draftFromForm, toggleDay } from '../src/views/tasksLogic.js';
import { daysBetween, weekdayIdx } from '../src/logic.js';
import { validateTask } from '../src/core/tasks.js';

// Plan Task 11: DOM-free helpers of the Tasks tab (week strip labels, add/edit form <-> task draft).

const week = (...keys) => keys;
const consecutive = keys => {
  assert.equal(keys.length, 7);
  assert.equal(new Set(keys).size, 7);
  keys.forEach((k, i) => assert.equal(weekdayIdx(k), i, k));
  for (let i = 1; i < 7; i++) assert.equal(daysBetween(keys[i - 1], keys[i]), 1, `${keys[i - 1]} -> ${keys[i]}`);
};

test('DAY_NAMES: Monday first, seven names', () => {
  assert.deepEqual(DAY_NAMES, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
});

test('weekOf: mid-week date gives Mon..Sun of its week', () => {
  assert.deepEqual(weekOf('2026-10-21'),
    week('2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'));
});

test('weekOf: a Monday starts and a Sunday ends its own week', () => {
  assert.equal(weekOf('2026-10-19')[0], '2026-10-19');
  assert.equal(weekOf('2026-10-19')[6], '2026-10-25');
  assert.equal(weekOf('2026-10-25')[0], '2026-10-19');
  assert.equal(weekOf('2026-10-25')[6], '2026-10-25');
});

test('weekOf: month boundary', () => {
  assert.deepEqual(weekOf('2026-11-01'),
    week('2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'));
});

test('weekOf: year boundary, both sides give the same week', () => {
  const w = week('2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03');
  assert.deepEqual(weekOf('2026-12-31'), w);
  assert.deepEqual(weekOf('2027-01-01'), w);
});

test('weekOf: DST weeks (EU and US fall back, EU and US spring forward)', () => {
  assert.deepEqual(weekOf('2026-10-25'),
    week('2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'));
  assert.equal(weekOf('2026-11-01')[0], '2026-10-26');
  assert.deepEqual(weekOf('2026-03-29'),
    week('2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29'));
  assert.deepEqual(weekOf('2026-03-08'),
    week('2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08'));
});

test('weekOf: every result is 7 distinct consecutive keys, weekdayIdx 0..6', () => {
  for (const k of ['2026-10-20', '2026-10-19', '2026-10-25', '2026-11-01', '2026-12-31', '2027-01-01',
    '2026-03-29', '2026-03-08', '2026-03-30', '2026-11-02']) consecutive(weekOf(k));
});

test('weekLabel: month name and ISO-8601 week number', () => {
  assert.equal(weekLabel('2026-10-20'), 'October · week 43');
  assert.equal(weekLabel('2026-12-31'), 'December · week 53');
  assert.equal(weekLabel('2027-01-01'), 'January · week 53');
  assert.equal(weekLabel('2027-01-04'), 'January · week 1');
  assert.equal(weekLabel('2026-01-01'), 'January · week 1');
  assert.equal(weekLabel('2026-10-25'), 'October · week 43');
});

test('dayLabel: weekday, day of month, month', () => {
  assert.equal(dayLabel('2026-10-20'), 'Tuesday 20 October');
  assert.equal(dayLabel('2027-01-03'), 'Sunday 3 January');
});

const task = over => ({ id: 't1', title: 'Task A', note: 'Note A', start: '09:00', end: '10:00', date: '2026-10-20',
  repeat: { type: 'none', days: [] }, skip: [], archived: false, ...over });

test('formFromTask: new form is empty with the given date', () => {
  assert.deepEqual(formFromTask(null, '2026-10-20'),
    { title: '', note: '', start: '', end: '', repeat: 'none', days: [], date: '2026-10-20' });
});

test('formFromTask: once-only task keeps its own date', () => {
  assert.deepEqual(formFromTask(task(), '2026-10-22'),
    { title: 'Task A', note: 'Note A', start: '09:00', end: '10:00', repeat: 'none', days: [], date: '2026-10-20' });
});

test('formFromTask: custom habit copies its days and takes the given date', () => {
  const t = task({ title: 'Habit A', date: null, repeat: { type: 'custom', days: [0, 2] } });
  const f = formFromTask(t, '2026-10-22');
  assert.deepEqual(f, { title: 'Habit A', note: 'Note A', start: '09:00', end: '10:00', repeat: 'custom', days: [0, 2], date: '2026-10-22' });
  f.days.push(4);
  assert.deepEqual(t.repeat.days, [0, 2]);
});

test('formFromTask: null start and end become empty strings', () => {
  const f = formFromTask(task({ start: null, end: null }), '2026-10-20');
  assert.equal(f.start, '');
  assert.equal(f.end, '');
});

const form = over => ({ title: 'Task A', note: '', start: '', end: '', repeat: 'none', days: [], date: '2026-10-20', ...over });

test('draftFromForm: trims title and note, empty times become null', () => {
  assert.deepEqual(draftFromForm(form({ title: '  Task A  ', note: '  Note A \n' })),
    { title: 'Task A', note: 'Note A', start: null, end: null, repeat: { type: 'none', days: [] }, date: '2026-10-20' });
});

test('draftFromForm: times are kept', () => {
  const d = draftFromForm(form({ start: '09:00', end: '10:00' }));
  assert.equal(d.start, '09:00');
  assert.equal(d.end, '10:00');
});

test('draftFromForm: Never keeps the date', () => {
  assert.equal(draftFromForm(form({ date: '2026-10-22' })).date, '2026-10-22');
});

test('draftFromForm: Daily and Weekdays drop the date and the days', () => {
  for (const repeat of ['daily', 'weekdays']) {
    const d = draftFromForm(form({ repeat, days: [1, 3] }));
    assert.deepEqual(d.repeat, { type: repeat, days: [] });
    assert.equal(d.date, null);
  }
});

test('draftFromForm: Custom gives a sorted copy of the days and no date', () => {
  const f = form({ repeat: 'custom', days: [4, 0, 2] });
  const d = draftFromForm(f);
  assert.deepEqual(d.repeat, { type: 'custom', days: [0, 2, 4] });
  assert.equal(d.date, null);
  assert.deepEqual(f.days, [4, 0, 2]);
  assert.notEqual(d.repeat.days, f.days);
});

test('draftFromForm feeds validateTask: valid form passes', () => {
  assert.equal(validateTask(draftFromForm(form({ start: '09:00', end: '10:00' }))), null);
  assert.equal(validateTask(draftFromForm(form({ repeat: 'custom', days: [1] }))), null);
});

test('draftFromForm feeds validateTask: core messages for bad forms', () => {
  assert.equal(validateTask(draftFromForm(form({ repeat: 'custom', days: [] }))), 'Pick at least one day.');
  assert.equal(validateTask(draftFromForm(form({ title: '   ' }))), 'Add a title.');
  assert.equal(validateTask(draftFromForm(form({ start: '10:00', end: '09:00' }))), 'End must be after start.');
});

test('toggleDay: adds sorted, removes, never mutates', () => {
  const days = [4, 1];
  assert.deepEqual(toggleDay(days, 2), [1, 2, 4]);
  assert.deepEqual(toggleDay(days, 4), [1]);
  assert.deepEqual(toggleDay([], 6), [6]);
  assert.deepEqual(toggleDay([0], 0), []);
  assert.deepEqual(days, [4, 1]);
});

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});
