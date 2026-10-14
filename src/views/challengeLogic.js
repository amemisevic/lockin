// Challenge tab and Day 0 logic (plan Task 13, task-13-rulings contract). Pure and DOM-free: today/nowMs are parameters.
import { startChallenge, declareRedo, phase, dayNo } from '../core/challenge.js';
import { oathComplete, OATH_KEYS, OATH_TITLES } from '../core/warlog.js';
import { longestStreak } from '../core/scoring.js';
import { resultCounts, passRate } from '../core/stats.js';
import { missionFor } from '../core/pack.js';
import { addDays } from '../logic.js';

// The core exports no length constant: read it from a throwaway start (used by Day 0's "of <n>" only).
export const CHALLENGE_LENGTH = startChallenge({ challenge: null }, '',
  { protocols: [0], redLines: [0], oathComplete: true }).state.challenge.length;

// Owner ruling 2026-10-13: pre-Day-1 protocols / red lines are deferred; Task 19 replaces this with the real lists.
export const setupLists = () => ({ protocols: [], redLines: [] });

export const begin = (state, today, lists = setupLists(state)) =>
  startChallenge(state, today, { ...lists, oathComplete: oathComplete(state) });

// The core decides; the first missing reason is its error (oath, protocols, red lines).
export function beginStatus(state, today, lists = setupLists(state)) {
  const r = begin(state, today, lists);
  return { enabled: r.ok, reason: r.ok ? null : r.error };
}

const written = e => typeof e?.text === 'string' && e.text.trim() !== '';
export const oathRows = state => OATH_KEYS.map(key =>
  ({ key, title: OATH_TITLES[key], done: written(state.warLog[key]), href: `#warlog/${key}` }));

export const challengeEnd = state => addDays(state.challenge.startDate, state.challenge.length - 1);
const whole = state => ({ endDate: challengeEnd(state), n: null });

export const graduated = (state, today) =>
  phase(state, today) === 'finished' || state.days[challengeEnd(state)]?.result != null;

// kind: stored result, else today / future / open (past, not closed yet).
export const stripCells = (state, today) => Array.from({ length: state.challenge.length }, (_, i) => {
  const date = addDays(state.challenge.startDate, i);
  const kind = state.days[date]?.result ?? (date === today ? 'today' : date > today ? 'future' : 'open');
  return { n: i + 1, date, kind };
});

export function legend(state) {
  const { passed, redo, reset } = resultCounts(state, whole(state));
  return { passed, redo, reset };
}

const closed = d => d?.closedAt != null || d?.result != null;
export function redoStatus(state, today) {
  const used = state.challenge.redoUsed;
  if (used) return { kind: 'used', day: dayNo(state, used) };
  return phase(state, today) === 'active' && !closed(state.days[today]) ? { kind: 'available' } : { kind: 'closed' };
}

export const confirmRedo = (state, today, nowMs) => declareRedo(state, today, nowMs);

// Fix round 2 (owner): today carries a declared Redo and is not closed yet (the night stores the result).
export const redoDeclaredToday = (state, today) => state.days[today]?.declaredRedo === true && !closed(state.days[today]);

export function missionInfo(state, today) {
  const n = dayNo(state, today) ?? 0;
  return { n, mission: missionFor(state, n), href: `#mission/${n}` };
}

export const graduation = state =>
  ({ ...legend(state), longest: longestStreak(state), rate: passRate(state, whole(state)) });

export const rateLabel = rate => (rate == null ? '—' : `${Math.round(rate * 100)}%`);
