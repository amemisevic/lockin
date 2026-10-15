// DOM-free helpers of the Tasks tab (plan Task 11): week strip labels, add/edit form <-> task draft.
import { addDays, daysBetween, weekStart, weekdayIdx } from '../logic.js';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; // Mon=0 (weekdayIdx)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parts = key => key.split('-').map(Number);

export const weekOf = key => Array.from({ length: 7 }, (_, i) => addDays(weekStart(key), i));

// ISO-8601: the week belongs to the year of its Thursday; week 1 holds that year's first Thursday.
export function weekLabel(key) {
  const thu = addDays(weekStart(key), 3);
  const week = Math.floor(daysBetween(`${thu.slice(0, 4)}-01-01`, thu) / 7) + 1;
  return `${MONTHS[parts(key)[1] - 1]} · week ${week}`;
}

export const dayLabel = key => `${DAY_NAMES[weekdayIdx(key)]} ${parts(key)[2]} ${MONTHS[parts(key)[1] - 1]}`;

export const formFromTask = (task, date) => (task
  ? { title: task.title, note: task.note, start: task.start ?? '', end: task.end ?? '', repeat: task.repeat.type,
    days: [...task.repeat.days], date: task.date ?? date }
  : { title: '', note: '', start: '', end: '', repeat: 'none', days: [], date });

export const draftFromForm = f => ({
  title: f.title.trim(), note: f.note.trim(), start: f.start || null, end: f.end || null,
  repeat: { type: f.repeat, days: f.repeat === 'custom' ? [...f.days].sort((a, b) => a - b) : [] },
  date: f.repeat === 'none' ? f.date : null,
});

export const toggleDay = (days, i) => (days.includes(i) ? days.filter(d => d !== i) : [...days, i]).sort((a, b) => a - b);
