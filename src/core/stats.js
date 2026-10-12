// Analytics selectors (plan Task 7): counts for the Analytics tab. Pure: reads state, returns plain data.
import { addDays, daysBetween, weekdayIdx } from '../logic.js';
import { isDue, tasksOn } from './tasks.js';
import { phase } from './challenge.js';

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byTitle = (a, b) => cmp(a.title, b.title);
const isText = s => typeof s === 'string' && s.trim() !== '';

// Owner call 1: n null = from start; n a positive integer = last n days; anything else, or start > endDate, = [].
function windowDates(endDate, n, start) {
  const from = n === null ? start : Number.isInteger(n) && n > 0 ? addDays(endDate, -(n - 1)) : undefined;
  if (!from || from > endDate) return [];
  return Array.from({ length: daysBetween(from, endDate) + 1 }, (_, i) => addDays(from, i));
}

const challengeDates = (state, { endDate, n }) => windowDates(endDate, n, state.challenge?.startDate);
// Calls 2 and 11: closed days (stored result) in the window, oldest first.
const closedDays = (state, range) => challengeDates(state, range).map(d => state.days[d]).filter(d => d?.result != null);

// ponytail: Task has no created date, so task functions count only from the first taskLog date (owner call 7).
// A habit created after that still gets its earlier days counted; add Task.created if rates look wrong (Task 18).
const firstLog = state => Object.keys(state.taskLog).sort()[0];
function taskDates(state, { endDate, n }) {
  const first = firstLog(state);
  if (!first) return [];
  return windowDates(endDate, n, state.challenge ? state.challenge.startDate : first).filter(d => d >= first);
}

const habitsDue = (state, date) => state.tasks.filter(t => t.repeat.type !== 'none' && isDue(t, date));
const isDone = (state, date, t) => state.taskLog[date]?.[t.id] === 'done';

export function resultCounts(state, range) {
  const r = { passed: 0, redo: 0, reset: 0, open: 0 };
  for (const d of challengeDates(state, range)) {
    const result = state.days[d]?.result;
    if (result != null) r[result]++;
    else if (phase(state, d) === 'active') r.open++;
  }
  return r;
}

export function passRate(state, range) {
  const { passed, redo, reset } = resultCounts(state, range);
  const closed = passed + redo + reset;
  return closed === 0 ? null : passed / closed;
}

// Call 4: id -> title from the latest closed day in the window that has it.
function latestTitles(days) {
  const t = new Map();
  for (const day of days) for (const p of day.night?.protocols ?? []) t.set(p.id, p.title);
  return t;
}

export function protocolRates(state, range) {
  const days = closedDays(state, range), titles = latestTitles(days), m = new Map();
  for (const day of days) for (const p of day.night?.protocols ?? []) {
    const e = m.get(p.id) ?? { title: titles.get(p.id), held: 0, missed: 0, med: 0 };
    e[p.status]++;
    m.set(p.id, e);
  }
  return [...m.values()].sort((a, b) => b.missed - a.missed || byTitle(a, b));
}

export function resetCauses(state, range) {
  const days = closedDays(state, range), titles = latestTitles(days), counts = new Map();
  let redLine = 0, protocols = 0;
  for (const day of days) {
    if (day.result !== 'reset') continue;
    if (day.night?.redLines.some(r => r.status === 'crossed')) { redLine++; continue; }
    protocols++;
    for (const p of day.night?.protocols ?? []) if (p.status === 'missed') counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  }
  const byProtocol = [...counts].map(([id, count]) => ({ title: titles.get(id), count }))
    .sort((a, b) => b.count - a.count || byTitle(a, b));
  return { redLine, protocols, byProtocol };
}

export function tacticCounts(state, range) {
  const m = new Map();
  for (const day of closedDays(state, range)) {
    const g = day.night?.bottomG;
    if (!isText(g?.archetype) || !isText(g?.tactic)) continue;
    const key = JSON.stringify([g.archetype, g.tactic]);
    const e = m.get(key) ?? { archetype: g.archetype, tactic: g.tactic, count: 0 };
    e.count++;
    m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || cmp(a.archetype, b.archetype) || cmp(a.tactic, b.tactic));
}

export function weekdayRates(state, range) {
  const r = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (const d of taskDates(state, range)) {
    const w = r[weekdayIdx(d)];
    for (const t of habitsDue(state, d)) { w.total++; if (isDone(state, d, t)) w.done++; }
  }
  return r;
}

export function heatmap(state, endDate) {
  const first = firstLog(state);
  return Array.from({ length: 28 }, (_, i) => {
    const date = addDays(endDate, i - 27);
    if (!first || date < first) return { date, done: 0, due: 0 };
    const due = habitsDue(state, date);
    return { date, done: due.filter(t => isDone(state, date, t)).length, due: due.length };
  });
}

export function taskTotals(state, range) {
  const r = { done: 0, failed: 0, stalled: 0, open: 0 };
  for (const d of taskDates(state, range)) for (const { status } of tasksOn(state, d)) r[status]++;
  return r;
}
