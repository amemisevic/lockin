// Progress: good days (no streaks), last 7 vs the 7 before, this week, all time, red lines, backup, weigh-in.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet } from '../sheet.js';
import { formatDuration } from './blockSheet.js';
import { exportBackup } from './settings.js';
import { backupStatus } from '../store.js';
import { addDays, daysBetween, keyToDate, weekStart, windowTotals, weekSummary, redLineSummary, lifetime, unsortedMinutes, setWeight } from '../logic.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, ...kids) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids.filter(k => k != null && k !== false));
  return el;
};
const short = key => keyToDate(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const header = text => h('h2', { class: 'section-header footnote' }, text);
const row = (main, value, cls = '') => h('div', { class: `row ${cls}` }, h('p', { class: 'row-main' }, main), value != null && h('p', { class: 'subhead stat' }, value));
const signed = (n, fmt) => n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '±0';
const kgText = kg => kg.toFixed(1);

export function renderProgress(app) {
  const s = app.state, today = app.today();
  return h('section', null,
    h('h1', { class: 'large-title' }, 'Progress'),
    headline(s, today), sevenVsSeven(s, today), thisWeek(s, today), allTime(s, today),
    redLines(s, today), backup(app, today), weighIn(app, today));
}

function headline(s, today) {
  const t30 = windowTotals(s, today, 30), t90 = windowTotals(s, today, 90);
  return h('div', { class: 'card now-free progress-head' },
    h('p', { class: 'title3' }, `Good days: ${t30.won} of last 30`),
    h('p', { class: 'subhead' }, 'Target 27 (90%)'),
    h('p', { class: 'subhead' }, `Last 90 days: ${t90.won} of 90 (target 81)`),
    h('p', { class: 'subhead' }, `Partial: ${t30.partial}`));
}

function sevenVsSeven(s, today) {
  const last = windowTotals(s, today, 7), prev = windowTotals(s, addDays(today, -7), 7);
  const items = s.goals.flatMap(g => [
    g.minutes && [g.name, last.minutes[g.id], prev.minutes[g.id], formatDuration],
    g.weeklyCount && [g.weeklyCount.label, last.counts[g.id], prev.counts[g.id], String]]).filter(Boolean);
  return [header('Last 7 Days vs the 7 Before'), h('div', { class: 'group' }, items.map(([name, a, b, fmt]) => {
    const d = a - b;
    return h('div', { class: 'row' },
      h('div', { class: 'row-main' }, h('p', null, name), h('p', { class: 'subhead' }, `${fmt(a)} · before ${fmt(b)}`)),
      h('p', { class: 'stat delta' }, d !== 0 && icon(d > 0 ? 'arrowUp' : 'arrowDown'), signed(d, fmt)));
  }))];
}

function bar(label, done, target) {
  return h('div', { class: 'bar', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': String(target), 'aria-valuenow': String(Math.min(done, target)) },
    h('span', { style: `--p:${Math.min(100, (100 * done) / (target || 1))}%` }));
}

function thisWeek(s, today) {
  const week = weekSummary(s, today), monday = weekStart(today);
  const unsorted = Array.from({ length: 7 }, (_, i) => unsortedMinutes(s, addDays(monday, i))).reduce((a, b) => a + b, 0);
  return [header('This Week'), h('div', { class: 'group' },
    s.goals.filter(g => week[g.id]).map(g => {
      const { done, target, unit } = week[g.id];
      const text = unit === 'min' ? `${formatDuration(done)} / ${formatDuration(target)}` : `${done} of ${target} ${g.weeklyCount.label.toLowerCase()}`;
      return h('div', { class: `row stack g-${g.id}` }, h('div', { class: 'row-split' }, h('p', { class: 'goal-label' }, h('span', { class: 'tag-icon' }, icon(g.icon)), g.name), h('p', { class: 'subhead stat' }, text)), bar(`${g.name} this week`, done, target));
    }),
    row('Unsorted', formatDuration(unsorted)))];
}

function allTime(s, today) {
  const l = lifetime(s, today), hours = m => `${(m / 60).toFixed(1)} h`;
  return [header('All Time'), h('div', { class: 'group' },
    s.goals.flatMap(g => [g.minutes && row(g.name, hours(l.minutes[g.id])), g.weeklyCount && row(g.weeklyCount.label, String(l.counts[g.id]))]),
    row('Unsorted', hours(l.unsorted)))];
}

function redLines(s, today) {
  const r = redLineSummary(s, today, 30);
  return [header('Red Lines, Last 30 Days'), h('div', { class: 'group' },
    s.redLines.length ? row(`Held ${r.held} · Slipped ${r.slipped}`) : row('No red lines yet.', null, 'subhead'))];
}

function backup(app, today) {
  const { days, overdue } = backupStatus(app.state, today);
  const text = days === null ? 'Never backed up' : days === 0 ? 'Last backup: today' : `Last backup: ${days} ${days === 1 ? 'day' : 'days'} ago`;
  return [header('Backup'), h('div', { class: 'group' }, h('div', { class: 'row' },
    h('p', { class: `row-main${overdue ? ' overdue' : ' subhead'}` }, text),
    overdue && h('button', { type: 'button', class: 'btn btn-text', id: 'backup-now', onClick: () => exportBackup(app) }, 'Back Up Now')))];
}

function weighIn(app, today) {
  const { weights, targetWeightKg: target } = app.state;
  const add = h('button', { type: 'button', class: 'btn btn-text', id: 'add-weigh-in', onClick: () => openWeighIn(app, today) }, 'Add Weigh-In');
  if (!weights.length) return [header('Weigh-In'), h('div', { class: 'group' }, h('div', { class: 'row' }, h('p', { class: 'row-main subhead' }, 'No weigh-ins yet. Add your first one.'), add))];
  const summary = `${kgText(weights[0].kg)} → ${kgText(weights.at(-1).kg)} kg${target != null ? `, target ${kgText(target)}` : ''}`;
  return [header('Weigh-In'), h('div', { class: 'group' },
    h('div', { class: 'row stack' }, chart(weights, target, summary), h('p', { class: 'subhead' }, summary),
      h('p', { class: 'footnote' }, target != null ? 'Solid line: weigh-ins. Dashed line: target.' : 'Line: weigh-ins. Set a target in Settings.')),
    h('div', { class: 'row' }, h('p', { class: 'row-main' }), add))];
}

// Inline SVG: solid line for weigh-ins, dashed line for the target (distinguishable without color).
function chart(weights, target, summary) {
  const W = 300, H = 160, L = 40, R = 10, T = 12, B = 26;
  const kgs = [...weights.map(w => w.kg), ...(target != null ? [target] : [])];
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const pad = Math.max(1, (max - min) * 0.15), lo = min - pad, hi = max + pad; // no line ever sits on the axis
  const first = weights[0].date, span = Math.max(1, daysBetween(first, weights.at(-1).date));
  const x = d => L + ((W - L - R) * daysBetween(first, d)) / span;
  const y = kg => T + ((H - T - B) * (hi - kg)) / (hi - lo);
  const text = (tx, ty, anchor, t) => svg('text', { x: tx, y: ty, 'text-anchor': anchor }, t);
  return svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Weight chart: ${summary}` },
    svg('line', { class: 'axis', x1: L, y1: H - B, x2: W - R, y2: H - B }),
    text(L - 6, y(max) + 4, 'end', kgText(max)), max !== min && text(L - 6, y(min) + 4, 'end', kgText(min)),
    text(L, H - 8, 'start', short(first)), weights.length > 1 && text(W - R, H - 8, 'end', short(weights.at(-1).date)),
    target != null && svg('line', { class: 'target', x1: L, y1: y(target), x2: W - R, y2: y(target) }),
    weights.length > 1 && svg('polyline', { class: 'logged', points: weights.map(w => `${x(w.date)},${y(w.kg)}`).join(' ') }),
    ...weights.map(w => svg('circle', { class: 'logged-dot', cx: x(w.date), cy: y(w.kg), r: 3.5 })));
}

function openWeighIn(app, today) {
  // Text field with a decimal keypad: iOS shows a comma in many regions, which type=number rejects.
  const date = h('input', { type: 'date', value: today, max: today, required: true, onInput: () => check() });
  const kg = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0.0', 'aria-label': 'Weight in kg', autocomplete: 'off', onInput: () => check() });
  const error = h('p', { class: 'form-error', role: 'status' });
  const value = () => { const v = Number(kg.value.trim().replace(',', '.')); return /^\d{2,3}([.,]\d)?$/.test(kg.value.trim()) && v >= 30 && v <= 300 ? v : null; };
  const valid = () => value() !== null && !!date.value && date.value <= today;
  const check = () => { error.textContent = kg.value && value() === null ? 'Enter a weight from 30 to 300 kg, like 78.4.' : ''; sheet.actionButton.disabled = !valid(); };
  const sheet = openSheet({ title: 'Add Weigh-In', action: 'Add',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' },
        h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, 'Date'), date),
        h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, 'Weight (kg)'), kg)),
      h('p', { class: 'footnote section-footer' }, 'One weigh-in per day. A new one replaces that day’s entry.'),
      error),
    isDirty: () => kg.value !== '' || date.value !== today,
    onAction: () => {
      if (!valid()) return false;
      app.set(s => setWeight(s, date.value, value()));
    } });
  sheet.actionButton.disabled = true;
}
