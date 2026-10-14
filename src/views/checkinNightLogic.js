// Night check-in logic (plan Task 16), DOM-free: draft shape, gating, live suggestion, the closeNight form.
import { nightTargets, suggestResult, NIGHT_TEXT } from '../core/scoring.js';
import { openTasks } from '../core/tasks.js';
import { tacticsFor } from '../core/pack.js';

// Same five ids as src/core/pack.js ARCHETYPES (not exported; core frozen this task). Owner ruling pending.
export const ARCHETYPES = ['negotiator', 'assassin', 'seducer', 'escapist', 'authority'];

export const NIGHT_ERRORS = {
  ...NIGHT_TEXT,
  closed: 'This day is already closed.',
  'not-active': 'This day is not part of the challenge.',
  'tasks-open': 'Settle every task first.',
  'protocols-unanswered': 'Answer every protocol.',
  'redlines-unanswered': 'Answer every red line.',
  'override-reason': 'Write a reason for the override.',
  'not-closable': 'This day can no longer be closed.',
};

export const newDraft = () => ({ tasks: {}, protocols: {}, redLines: {}, win: '', archetype: '', tactic: '', other: false,
  text: '', slipNote: '', overrideOpen: false, overrideResult: null, reason: '', error: null });

export function nightRoute(state, date, nowMs) {
  const targets = nightTargets(state, nowMs);
  if (!targets.includes(date)) return { kind: 'redirect' };
  if (targets[0] !== date) return { kind: 'yesterday-open', href: `#checkin/night/${targets[0]}` };
  return { kind: 'form' };
}

export const medIds = (state, date) => state.days[date]?.morning?.med ?? [];

const crossed = (state, d) => state.challenge.redLines.some(r => d.redLines[r.id] === 'crossed');
// Non-MED protocols the draft has answered (held|missed).
const answered = (state, date, d) => state.challenge.protocols
  .filter(p => !medIds(state, date).includes(p.id) && ['held', 'missed'].includes(d.protocols[p.id]));

export function liveSuggestion(state, date, d) {
  const day = state.days[date] ?? {};
  const protocols = [...medIds(state, date).map(id => ({ id, status: 'med' })),
    ...answered(state, date, d).map(p => ({ id: p.id, status: d.protocols[p.id] }))];
  const redLines = state.challenge.redLines.filter(r => ['held', 'crossed'].includes(d.redLines[r.id]))
    .map(r => ({ id: r.id, status: d.redLines[r.id] }));
  return suggestResult({ morningDone: !!day.morning, protocols, redLines, zeroDay: state.settings.zeroDay,
    declaredRedo: !!day.declaredRedo });
}

export const overrideOptions = (state, d) => (crossed(state, d) ? ['reset'] : ['passed', 'redo', 'reset']);

export function canClose(state, date, d) {
  const med = medIds(state, date);
  const ok = openTasks(state, date).every(v => ['done', 'failed', 'stalled'].includes(d.tasks[v.task.id]))
    && answered(state, date, d).length === state.challenge.protocols.filter(p => !med.includes(p.id)).length
    && state.challenge.redLines.every(r => ['held', 'crossed'].includes(d.redLines[r.id]));
  if (!ok || !d.overrideOpen) return ok;
  return overrideOptions(state, d).includes(d.overrideResult) && d.reason.trim() !== '';
}

const pickKeys = (ids, from) => Object.fromEntries(ids.filter(id => from[id] !== undefined).map(id => [id, from[id]]));

export function nightForm(state, date, d) {
  const med = medIds(state, date);
  const freeText = d.other || !tacticsFor(state, d.archetype).length;
  return {
    tasks: pickKeys(openTasks(state, date).map(v => v.task.id), d.tasks),
    protocols: pickKeys(state.challenge.protocols.map(p => p.id).filter(id => !med.includes(id)), d.protocols),
    redLines: pickKeys(state.challenge.redLines.map(r => r.id), d.redLines),
    win: d.win,
    bottomG: { archetype: d.archetype, tactic: d.other ? '' : d.tactic, text: freeText ? d.text : '' },
    slipNote: d.slipNote,
    override: d.overrideOpen ? { result: d.overrideResult, reason: d.reason } : null,
  };
}
