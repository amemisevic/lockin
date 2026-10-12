// Recovery core (plan Task 5): vague check, pending Recovery, autopsy filing. Pure: returns new state.
import { setWarEntry } from './warlog.js';

const NUDGE = 'Too vague. Name something you will block, delete or move.';
const KEYWORD = /\b(block|delete|move|remove|uninstall|unplug|charge|lock|leave|turn|put|set|install|change|cancel)\b/i;
const FIELDS = [['state', 'State'], ['time', 'Time'], ['place', 'Place'], ['decision', 'Decision'], ['change', 'Change']];
const fail = error => ({ ok: false, error });

// Plan rule: trimmed length ≥ 15, ≥ 3 words, and one whole keyword (any case). Else the nudge.
export function checkVague(text) {
  const t = (text ?? '').trim();
  return t.length >= 15 && t.split(/\s+/).length >= 3 && KEYWORD.test(t) ? null : NUDGE;
}

// Oldest unfiled entry by date key. overdue is strict (nowMs > dueAt); msLeft never below 0.
export function pendingRecovery(state, nowMs) {
  const date = Object.keys(state.recovery).sort().find(d => state.recovery[d].filedAt == null);
  if (!date) return null;
  const { dueAt } = state.recovery[date];
  return { date, dueAt, msLeft: Math.max(0, dueAt - nowMs), overdue: nowMs > dueAt };
}

// Error order (owner call 1): no-recovery, already-filed, incomplete, vague-change, vague-decision.
// Answers are stored as given; the War Log copy goes through setWarEntry.
export function fileAutopsy(state, date, form, nowMs) {
  const r = Object.hasOwn(state.recovery, date) ? state.recovery[date] : undefined; // not 'toString' etc.
  if (!r) return fail('no-recovery');
  if (r.filedAt != null) return fail('already-filed');
  if (FIELDS.some(([k]) => typeof form?.[k] !== 'string' || form[k].trim() === '')) return fail('incomplete');
  if (checkVague(form.change)) return fail('vague-change');
  if (checkVague(form.decision)) return fail('vague-decision');
  const answers = Object.fromEntries(FIELDS.map(([k]) => [k, form[k]]));
  const next = { ...state, recovery: { ...state.recovery, [date]: { ...r, ...answers, filedAt: nowMs } } };
  const text = FIELDS.map(([k, label]) => `${label}: ${form[k]}`).join('\n');
  return { ok: true, state: setWarEntry(next, `autopsy-${date}`, text, nowMs) };
}
