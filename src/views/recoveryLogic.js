// Recovery screen logic (plan Task 17), DOM-free: route, draft, effect chips, countdown, gate, form, error sentences.
import { checkVague } from '../core/recovery.js';
import { dayNo } from '../core/challenge.js';
import { CHALLENGE_LENGTH } from './challengeLogic.js';
import { timeLeft } from './todayLogic.js';

export const STATES = ['Tired', 'Stressed', 'Bored', 'Triggered'];
export const PLACES = ['Bed', 'Desk', 'Kitchen', 'Out'];
const FIELDS = ['state', 'time', 'place', 'decision', 'change'];

const entry = (state, date) => (Object.hasOwn(state.recovery, date ?? '') ? state.recovery[date] : null);

export function recoveryRoute(state, date) {
  const r = entry(state, date);
  if (!r) return 'redirect';
  return r.filedAt != null ? 'filed' : 'form';
}

// Local wall clock of the day's closedAt (never UTC); '' when missing, so core refuses as 'incomplete'.
export function closedTime(state, date) {
  const ms = state.days[date]?.closedAt;
  if (ms == null) return '';
  const d = new Date(ms), pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const newDraft = (state, date) => ({ state: '', time: closedTime(state, date), place: '', decision: '', change: '',
  touched: {}, error: null });

export function effects(state, date) {
  const next = dayNo(state, date) + 1;
  return next > CHALLENGE_LENGTH ? ['Streak back to 0']
    : ['Streak back to 0', `Day ${next} of ${CHALLENGE_LENGTH} continues`, `Day ${next}: no MED`];
}

// This date's dueAt. fill = elapsed share of the window (closedAt → dueAt), 1 when overdue or closedAt is missing.
export function countdown(state, date, nowMs) {
  const { dueAt } = state.recovery[date];
  const overdue = nowMs > dueAt;
  const msLeft = Math.max(0, dueAt - nowMs);
  const closedAt = state.days[date]?.closedAt;
  const span = closedAt == null ? 0 : dueAt - closedAt;
  const fill = span > 0 ? Math.min(1, Math.max(0, 1 - msLeft / span)) : 1;
  return { label: overdue ? 'Overdue' : timeLeft(msLeft), overdue, fill };
}

export const canFile = d => FIELDS.every(k => (d[k] ?? '').trim() !== '');
export const autopsyForm = d => Object.fromEntries(FIELDS.map(k => [k, d[k] ?? '']));

const NUDGE = checkVague('');
const ERRORS = {
  incomplete: 'Answer all five questions.',
  'vague-change': NUDGE,
  'no-recovery': 'There is no Recovery for this day.',
  'already-filed': 'This autopsy is already filed.',
};
export const errorText = code => ERRORS[code] ?? code;
