// Analytics tab view model (plan Task 18, task-18-rulings R1-R3). Pure and DOM-free: today is a parameter.
// Numbers become display strings here; a null block renders EMPTY.
import { resultCounts, passRate, protocolRates, resetCauses, tacticCounts, weekdayRates, heatmap, taskTotals } from '../core/stats.js';
import { currentStreak, longestStreak } from '../core/scoring.js';
import { stripCells, legend, rateLabel } from './challengeLogic.js';

export const RANGES = [{ value: 7, label: '7d' }, { value: 30, label: '30d' }, { value: null, label: 'All' }];
export const DEFAULT_RANGE = 30;
export const EMPTY = 'No data yet.';
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const S = String;

function overview(state, range) {
  const { passed, redo, reset } = resultCounts(state, range);
  if (passed + redo + reset === 0) return null;
  const rate = rateLabel(passRate(state, range));
  return { passed: S(passed), redo: S(redo), reset: S(reset), rate,
    current: S(currentStreak(state)), longest: S(longestStreak(state)),
    label: `Passed ${passed}, redo ${redo}, reset ${reset}, pass rate ${rate}` };
}

function protocols(state, range) {
  const rows = protocolRates(state, range);
  return rows.length ? rows.map(({ title, held, med, missed }) => ({ title, held: S(held), med: S(med), missed: S(missed),
    counts: [held, med, missed], label: `${title}: held ${held}, MED ${med}, missed ${missed}` })) : null;
}

function resets(state, range) {
  const { redLine, protocols: p, byProtocol } = resetCauses(state, range);
  if (redLine + p === 0) return null;
  return { redLine: S(redLine), protocols: S(p), counts: [redLine, p],
    byProtocol: byProtocol.map(({ title, count }) => ({ title, count: S(count), label: `${title}: ${count}` })),
    label: `Red line ${redLine}, missed protocols ${p}` };
}

function tactics(state, range) {
  const rows = tacticCounts(state, range);
  if (!rows.length) return null;
  const max = Math.max(...rows.map(r => r.count));
  return rows.map(({ archetype, tactic, count }) => ({ archetype, tactic, count: S(count), share: count / max,
    label: `${tactic} (${archetype}): ${count}` }));
}

function challenge(state, today, range) {
  if (!state.challenge) return null;
  const lg = legend(state);
  return { strip: stripCells(state, today), legend: lg,
    stripLabel: `Day results: passed ${lg.passed}, redo ${lg.redo}, reset ${lg.reset} of ${state.challenge.length} days`,
    protocols: protocols(state, range), resets: resets(state, range), tactics: tactics(state, range) };
}

function weekdays(state, range) {
  const w = weekdayRates(state, range);
  if (w.every(x => x.total === 0)) return null;
  const days = w.map(({ done, total }, i) => ({ day: WEEKDAYS[i], rate: rateLabel(total ? done / total : null),
    done: S(done), total: S(total), share: total ? done / total : 0 }));
  return { days, label: days.map(d => `${d.day} ${d.rate} (${d.done} of ${d.total})`).join(', ') };
}

const kindOf = ({ done, due }) => (due === 0 ? 'none' : done === due ? 'all' : done === 0 ? 'missed' : 'part');

function heat(state, today) {
  const raw = heatmap(state, today);
  if (raw.every(c => c.due === 0)) return null;
  const cells = raw.map(c => ({ ...c, kind: kindOf(c) }));
  const k = kind => cells.filter(c => c.kind === kind).length;
  return { cells, label: `Last 28 days: ${k('all')} all done, ${k('part')} partly done, ${k('missed')} missed, ${k('none')} nothing due` };
}

function tasks(state, range) {
  const { done, failed, stalled, open } = taskTotals(state, range);
  if (done + failed + stalled + open === 0) return null;
  return { done: S(done), failed: S(failed), stalled: S(stalled), open: S(open),
    label: `Done ${done}, failed ${failed}, stalled ${stalled}, open ${open}` };
}

// n: 7 | 30 | null (All). The strip and the heatmap ignore the range; streaks cover the whole history.
export function analytics(state, today, n) {
  const range = { endDate: today, n };
  return {
    overview: overview(state, range),
    challenge: challenge(state, today, range),
    habits: { weekdays: weekdays(state, range), heatmap: heat(state, today) },
    tasks: tasks(state, range),
  };
}
