// Measured red lines (spec §1.5): an amount per day, judged against the limit frozen when it was logged.
import { addDays, redStatus } from './logic.js';

// "1,5", "1.5" or a number; null for anything that is not a finite amount >= 0.
export function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null;
  const t = String(v ?? '').trim();
  return /^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null;
}

// Freezes the line's limit, unit and name into the entry so later edits or deletion never rewrite history.
export const logAmount = (state, date, line, amount) => ({ ...state, red: { ...state.red,
  [date]: { ...state.red[date], [line.id]: { amount, limit: line.limit, unit: line.unit, name: line.name } } } });

// Removes one day's entry so the day is "not logged" again (never Held); drops the day when it empties.
export function clearAmount(state, date, id) {
  if (!state.red[date] || !(id in state.red[date])) return state;
  const { [id]: _, ...day } = state.red[date];
  const { [date]: __, ...red } = state.red;
  return { ...state, red: Object.keys(day).length ? { ...red, [date]: day } : red };
}

const sum = xs => xs.reduce((a, b) => a + b, 0);
const avg = xs => (xs.length ? sum(xs) / xs.length : null);

export function redLineStats(state, id, endDate, days = 30) {
  const entry = date => state.red[date]?.[id];
  const measured = e => e && typeof e === 'object';
  const series = Array.from({ length: days }, (_, i) => { const date = addDays(endDate, i - days + 1); return { date, e: entry(date) }; });
  const logged = series.filter(d => d.e);
  const m = logged.filter(d => measured(d.e)).map(d => ({ date: d.date, amount: d.e.amount, limit: d.e.limit, over: d.e.amount - d.e.limit, name: d.e.name, unit: d.e.unit }));
  const slips = m.filter(x => x.over > 0), held = m.filter(x => x.over <= 0);
  const worst = slips.reduce((w, x) => (!w || x.over > w.over ? x : w), null);
  const weekAvg = end => avg(Array.from({ length: 7 }, (_, i) => entry(addDays(end, -i))).filter(measured).map(e => e.amount));
  const line = state.redLines.find(l => l.id === id), latest = m.at(-1);
  return {
    name: line?.name ?? latest?.name ?? null, limit: line?.limit ?? null, unit: line?.unit ?? latest?.unit ?? null,
    logged: logged.length,
    held: logged.filter(d => redStatus(d.e) === 'held').length,
    slipped: logged.filter(d => redStatus(d.e) === 'slipped').length,
    unlogged: days - logged.length,
    totalOver: sum(slips.map(x => x.over)), avgOver: avg(slips.map(x => x.over)),
    worst: worst && { date: worst.date, amount: worst.amount, over: worst.over },
    avgMargin: avg(held.map(x => -x.over)),
    used: sum(m.map(x => x.amount)), allowed: sum(m.map(x => x.limit)),
    last7Avg: weekAvg(endDate), prev7Avg: weekAvg(addDays(endDate, -7)),
    days: series.map(d => ({ date: d.date, status: d.e ? redStatus(d.e) : null,
      amount: measured(d.e) ? d.e.amount : null, limit: measured(d.e) ? d.e.limit : null })),
  };
}
