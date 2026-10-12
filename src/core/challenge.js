// Challenge core (plan Task 3): start, morning, afternoon, MED, declared Redo, next action. Pure: returns new state.
import { dateKey, addDays, daysBetween, weekStart } from '../logic.js';

export const NIGHT_FROM = 18;
export const AFTERNOON_FROM = 12;

const NOT_ACTIVE = 'The challenge is not active today.';
const CLOSED = 'This day is already closed.';

const newDay = old => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...old });
const putDay = (state, date, patch) => ({ ...state, days: { ...state.days, [date]: newDay({ ...state.days[date], ...patch }) } });
const isClosed = d => d?.closedAt != null || d?.result != null;

export function dayNo(state, date) {
  if (!state.challenge) return null;
  const n = daysBetween(state.challenge.startDate, date) + 1;
  return n >= 1 ? n : null;
}

export function phase(state, date) {
  if (!state.challenge) return 'none';
  const n = dayNo(state, date);
  return n === null ? 'before' : n > state.challenge.length ? 'finished' : 'active';
}

export function startChallenge(state, today, { protocols, redLines, oathComplete }) {
  if (state.challenge !== null) return { ok: false, error: 'The challenge has already started.' };
  if (!oathComplete) return { ok: false, error: 'Write your Contract, Funeral and Code first.' };
  if (!protocols?.length) return { ok: false, error: 'Add at least one protocol.' };
  if (!redLines?.length) return { ok: false, error: 'Add at least one red line.' };
  return { ok: true, state: { ...state, challenge: {
    startDate: today, length: 30, protocols: [...protocols], redLines: [...redLines], redoUsed: null,
  } } };
}

export function forcedFullPass(state, date) {
  const prev = state.days[addDays(date, -1)];
  return prev?.result === 'reset' || prev?.declaredRedo === true;
}

export function medUsedInWeek(state, date) {
  const mon = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) n += state.days[addDays(mon, i)]?.morning?.med.length ?? 0;
  return n;
}

// pending = MED ids already counted in the same submit.
function medCheckWith(state, date, protocolId, pending) {
  const p = state.challenge?.protocols.find(x => x.id === protocolId);
  if (!p) return { ok: false, reason: 'no-protocol' };
  if (!p.med?.trim()) return { ok: false, reason: 'no-med' };
  if (forcedFullPass(state, date)) return { ok: false, reason: 'forced' };
  if (medUsedInWeek(state, date) + pending >= state.settings.medPerWeek) return { ok: false, reason: 'cap' };
  return { ok: true };
}

export const medCheck = (state, date, protocolId) => medCheckWith(state, date, protocolId, 0);

const medError = (state, date, reason) => {
  if (reason === 'cap') return 'Weekly limit reached.';
  if (reason !== 'forced') return 'This protocol has no MED version.';
  return state.days[addDays(date, -1)]?.result === 'reset'
    ? 'No MED today. Yesterday was a Reset.' : 'No MED today. Yesterday was a declared Redo.';
};

// Owner ruling: before 04:00 yesterday's night can still close (as a Reset), so today's morning waits for it.
export function yesterdayOpen(state, today, nowMs) {
  const now = new Date(nowMs), y = addDays(today, -1);
  return today === dateKey(now) && now.getHours() < 4 && phase(state, y) === 'active' && state.days[y]?.result == null;
}

export function submitMorning(state, today, { target, risk, med }, nowMs = Date.now()) {
  if (phase(state, today) !== 'active') return { ok: false, error: NOT_ACTIVE };
  const d = state.days[today];
  if (isClosed(d)) return { ok: false, error: CLOSED };
  if (d?.morning) return { ok: false, error: 'Morning check-in is already filed.' };
  if (yesterdayOpen(state, today, nowMs)) return { ok: false, error: 'Close yesterday first.' };
  if (typeof target !== 'string' || target.trim() === '') return { ok: false, error: 'Write today\'s #1 target.' };
  const ids = [...new Set(med ?? [])];
  for (const [i, id] of ids.entries()) {
    const c = medCheckWith(state, today, id, i);
    if (!c.ok) return { ok: false, error: medError(state, today, c.reason) };
  }
  return { ok: true, state: putDay(state, today, { morning: { at: nowMs, target, risk: risk ?? '', med: ids } }) };
}

export function submitAfternoon(state, today, { onTrack, friction }, nowMs = Date.now()) {
  if (phase(state, today) !== 'active' || isClosed(state.days[today])) return state;
  if (!['yes', 'no', 'struggling'].includes(onTrack)) return state;
  const f = onTrack === 'struggling' ? friction ?? '' : '';
  return putDay(state, today, { afternoon: { at: nowMs, onTrack, friction: f } });
}

// nowMs optional: when given, only its local date can be declared.
export function declareRedo(state, today, nowMs) {
  if (state.challenge?.redoUsed) return { ok: false, error: 'Your one declared Redo is already used.' };
  if (nowMs !== undefined && today !== dateKey(new Date(nowMs))) return { ok: false, error: 'You can only declare a Redo for today.' };
  if (phase(state, today) !== 'active') return { ok: false, error: NOT_ACTIVE };
  if (isClosed(state.days[today])) return { ok: false, error: CLOSED };
  const next = putDay(state, today, { declaredRedo: true });
  return { ok: true, state: { ...next, challenge: { ...next.challenge, redoUsed: today } } };
}

export function nextAction(state, nowMs) {
  if (Object.values(state.recovery).some(r => !r.filedAt)) return 'recovery';
  const now = new Date(nowMs);
  const today = dateKey(now), hour = now.getHours();
  const d = state.days[today];
  if (phase(state, today) !== 'active' || isClosed(d)) return 'none';
  if (!d?.morning) return 'morning';
  if (hour >= NIGHT_FROM) return 'night';
  if (hour >= AFTERNOON_FROM && !d.afternoon) return 'afternoon';
  return 'none';
}
