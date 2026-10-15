// Tasks and habits (plan Task 2). Pure: every function returns a new state. habit = repeat.type !== 'none'.
import { weekdayIdx, addDays, uid, toMin } from '../logic.js';

const absent = x => x === null || x === undefined || x === '';

// null = valid, else a plain sentence. Safe on partial drafts.
export function validateTask(t) {
  if (!t.title?.trim()) return 'Add a title.';
  if ([t.start, t.end].some(x => !absent(x) && Number.isNaN(toMin(x)))) return 'Enter a valid time.';
  if (!absent(t.start) && !absent(t.end) && toMin(t.end) <= toMin(t.start)) return 'End must be after start.';
  if (t.repeat?.type === 'custom' && !t.repeat.days?.length) return 'Pick at least one day.';
  return null;
}

export const addTask = (state, draft, id = uid()) => ({ ...state, tasks: [...state.tasks, {
  note: '', start: null, end: null, date: null, repeat: { type: 'none', days: [] }, skip: [], archived: false,
  ...draft, id,
}] });

// Applies f to the task with id; an unknown id (or f returning the same task) leaves state unchanged.
function edit(state, id, f) {
  const old = state.tasks.find(t => t.id === id);
  const next = old && f(old);
  return !next || next === old ? state : { ...state, tasks: state.tasks.map(t => (t === old ? next : t)) };
}

export const updateTask = (state, id, patch) => edit(state, id, t => ({ ...t, ...patch, id }));
export const archiveTask = (state, id) => edit(state, id, t => ({ ...t, archived: true }));
export const skipOn = (state, id, date) => edit(state, id, t => (t.skip.includes(date) ? t : { ...t, skip: [...t.skip, date] }));
export const moveToTomorrow = (state, id, date) =>
  edit(state, id, t => (t.repeat.type === 'none' ? { ...t, date: addDays(date, 1) } : t));

export function isDue(task, date) {
  if (task.archived || task.skip.includes(date)) return false;
  const wd = weekdayIdx(date);
  switch (task.repeat.type) {
    case 'daily': return true;
    case 'weekdays': return wd < 5;
    case 'custom': return task.repeat.days.includes(wd);
    default: return task.date === date;
  }
}

const statusOf = (state, date, id) => state.taskLog[date]?.[id] ?? 'open';
const startKey = t => (t.start ? toMin(t.start) : Infinity);

export const tasksOn = (state, date) => state.tasks.filter(t => isDue(t, date))
  .sort((a, b) => startKey(a) - startKey(b) || a.title.localeCompare(b.title))
  .map(task => ({ task, status: statusOf(state, date, task.id) }));

export const openTasks = (state, date) => tasksOn(state, date).filter(v => v.status === 'open');

export function setTaskStatus(state, date, taskId, status) {
  const day = { ...state.taskLog[date] };
  if (status === null) delete day[taskId]; else day[taskId] = status;
  return { ...state, taskLog: { ...state.taskLog, [date]: day } };
}

// Seven entries, oldest first, the last one is endDate.
export function habitDots(state, taskId, endDate) {
  const t = state.tasks.find(x => x.id === taskId);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(endDate, i - 6);
    return t && isDue(t, d) ? statusOf(state, d, taskId) : 'off';
  });
}
