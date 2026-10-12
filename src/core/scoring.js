// Scoring core (plan Task 4): suggested result, night close, 04:00 auto-settle, streaks. Pure: returns new state.
import { dateKey, addDays, keyToDate } from '../logic.js';
import { tasksOn, openTasks, setTaskStatus } from './tasks.js';
import { phase } from './challenge.js';

const GRACE_HOUR = 4;
const RESULTS = ['passed', 'redo', 'reset'];
const TASK_DONE = ['done', 'failed', 'stalled'];

const newDay = old => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...old });
const isClosed = d => d?.closedAt != null || d?.result != null;
const fail = error => ({ ok: false, error });

// Local 04:00 of the day after key: when its night grace ends. DST-safe (local wall clock, not +28 h).
function graceEnd(key) {
  const d = keyToDate(key);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, GRACE_HOUR).getTime();
}

// Result = first rule that matches, in the plan's order; reasons = every rule that applies. 'med' counts as held.
export function suggestResult({ morningDone, protocols, redLines, zeroDay, declaredRedo }) {
  const missed = protocols.filter(p => p.status === 'missed').length;
  const crossed = redLines.some(r => r.status === 'crossed');
  const reasons = [];
  if (crossed) reasons.push('Red line crossed');
  if (missed >= 1) reasons.push(`${missed} protocol${missed === 1 ? '' : 's'} missed`);
  if (declaredRedo) reasons.push('Declared Redo');
  if (!morningDone) reasons.push('No morning check-in');
  const result = crossed || missed >= zeroDay ? 'reset'
    : declaredRedo || missed >= 1 || !morningDone ? 'redo' : 'passed';
  return { result, reasons };
}

// Open active days whose night can be filed now, ascending: yesterday (before 04:00 only), then today.
export function nightTargets(state, nowMs) {
  const now = new Date(nowMs);
  const today = dateKey(now), yesterday = addDays(today, -1);
  const open = d => phase(state, d) === 'active' && !isClosed(state.days[d]);
  return [yesterday, today].filter(d => open(d) && (d === today || now.getHours() < GRACE_HOUR));
}

const validOverride = o => o === null || (RESULTS.includes(o?.result) && typeof o.reason === 'string' && o.reason.trim() !== '');

export function closeNight(state, date, form, nowMs) {
  const old = state.days[date];
  if (isClosed(old)) return fail('closed');
  if (phase(state, date) !== 'active') return fail('not-active');
  if (!nightTargets(state, nowMs).includes(date)) return fail('not-closable');
  const tasks = form.tasks ?? {};
  if (openTasks(state, date).some(v => !TASK_DONE.includes(tasks[v.task.id]))) return fail('tasks-open');

  const day = newDay(old);
  const med = day.morning?.med ?? [];
  const { protocols, redLines } = state.challenge;
  // MED protocols from that day's morning are forced to 'med' and need no answer.
  const pStatus = p => (med.includes(p.id) ? 'med' : form.protocols?.[p.id]);
  if (protocols.some(p => !med.includes(p.id) && !['held', 'missed'].includes(pStatus(p)))) return fail('protocols-unanswered');
  if (redLines.some(r => !['held', 'crossed'].includes(form.redLines?.[r.id]))) return fail('redlines-unanswered');
  const override = form.override ?? null;
  if (!validOverride(override)) return fail('override-reason');

  let next = state;
  for (const { task } of tasksOn(state, date)) {
    if (TASK_DONE.includes(tasks[task.id])) next = setTaskStatus(next, date, task.id, tasks[task.id]);
  }
  // Snapshots of titles/names, so later rule edits never rewrite this day.
  const nightProtocols = protocols.map(p => ({ id: p.id, title: p.title, status: pStatus(p) }));
  const nightRedLines = redLines.map(r => ({ id: r.id, name: r.name, status: form.redLines[r.id] }));
  const suggested = suggestResult({ morningDone: !!day.morning, protocols: nightProtocols, redLines: nightRedLines,
    zeroDay: state.settings.zeroDay, declaredRedo: day.declaredRedo }).result;
  const result = override?.result ?? suggested;
  const bottomG = { archetype: form.bottomG?.archetype ?? '', tactic: form.bottomG?.tactic ?? '', text: form.bottomG?.text ?? '' };
  const night = { at: nowMs, protocols: nightProtocols, redLines: nightRedLines, win: form.win ?? '', bottomG, suggested,
    override: override && { result: override.result, reason: override.reason } };
  const closed = { ...day, slipNote: form.slipNote ?? '', incompleteMorning: !day.morning, auto: null, night, result, closedAt: nowMs };
  next = { ...next, days: { ...next.days, [date]: closed } };
  if (result === 'reset') {
    next = { ...next, recovery: { ...next.recovery,
      [date]: { dueAt: nowMs + 86400000, filedAt: null, state: '', time: '', place: '', decision: '', change: '' } } };
  }
  return { ok: true, state: next };
}

// Auto-closes every open challenge day whose 04:00 grace has passed as a Redo. Idempotent; same object if nothing changes.
export function settleMissed(state, nowMs) {
  const c = state.challenge;
  if (!c) return state;
  let days = state.days;
  for (let i = 0; i < c.length; i++) {
    const d = addDays(c.startDate, i);
    const due = graceEnd(d);
    if (due > nowMs) break;
    if (isClosed(days[d])) continue;
    const old = newDay(days[d]);
    days = { ...days, [d]: { ...old, result: 'redo', night: null, auto: 'no-night', incompleteMorning: !old.morning, closedAt: due } };
  }
  return days === state.days ? state : { ...state, days };
}

// Closed days (stored result) in ascending date order. Streaks read only these, never current rules.
export const dayResults = state => Object.keys(state.days).sort()
  .filter(date => state.days[date].result != null)
  .map(date => ({ date, result: state.days[date].result }));

export function currentStreak(state) {
  const r = dayResults(state);
  let n = 0;
  while (n < r.length && r[r.length - 1 - n].result === 'passed') n++;
  return n;
}

export function longestStreak(state) {
  let run = 0, best = 0;
  for (const { result } of dayResults(state)) {
    run = result === 'passed' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
