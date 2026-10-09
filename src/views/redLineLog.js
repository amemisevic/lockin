// Measured red line on Today: result (icon + text) and the Log Amount sheet (spec §1.5).
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet } from '../sheet.js';
import { redStatus } from '../logic.js';
import { parseAmount, logAmount, clearAmount } from '../redlines.js';

export const fmtAmount = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Held = check + "Held"; Slipped = cross + "Slipped" (red). Never color alone.
export const statusLabel = status => h('span', { class: `red-status ${status}` }, icon(status === 'held' ? 'check' : 'xmark'), status === 'held' ? 'Held' : 'Slipped');

export function measuredRow(app, line, date) {
  const e = app.state.red[date]?.[line.id];
  const detail = e && typeof e === 'object' ? ` · ${fmtAmount(e.amount)} of ${fmtAmount(e.limit)} ${e.unit}` : '';
  return h('div', { class: 'row red-row' },
    h('div', { class: 'row-main' },
      h('p', null, line.name),
      h('p', { class: 'subhead' }, e ? [statusLabel(redStatus(e)), detail] : `Limit ${fmtAmount(line.limit)} ${line.unit} · not logged`)),
    h('button', { type: 'button', class: 'btn btn-text', id: `log-${line.id}`, onClick: () => openLogAmount(app, line, date) }, 'Log amount'));
}

export function openLogAmount(app, line, date) {
  const prev = app.state.red[date]?.[line.id];
  // Editing a measured entry keeps the limit it was judged by; a new entry freezes today's limit.
  const basis = prev && typeof prev === 'object' ? { ...line, limit: prev.limit, unit: prev.unit, name: prev.name } : line;
  const start = prev && typeof prev === 'object' ? fmtAmount(prev.amount) : '';
  const amount = h('input', { type: 'text', inputmode: 'decimal', value: start, placeholder: '0', autocomplete: 'off',
    'aria-label': `Amount in ${basis.unit}`, onInput: () => check() });
  const error = h('p', { class: 'form-error', role: 'status' });
  const save = v => app.set(s => logAmount(s, date, basis, v));
  const check = () => {
    const ok = parseAmount(amount.value) !== null;
    error.textContent = amount.value.trim() && !ok ? 'Enter an amount like 15 or 1,5.' : '';
    sheet.actionButton.disabled = !ok;
  };
  const sheet = openSheet({ title: 'Log Amount', action: 'Done',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' }, h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, `${basis.name} (${basis.unit})`), amount)),
      h('div', { class: 'none-row' }, h('button', { type: 'button', class: 'btn btn-primary', id: 'log-none', onClick: () => { save(0); sheet.close(); } }, 'None'),
        // Secondary, not destructive red: the day just goes back to "not logged".
        prev !== undefined && h('button', { type: 'button', class: 'btn btn-text', id: 'log-clear',
          onClick: () => { app.set(s => clearAmount(s, date, line.id)); sheet.close(); } }, 'Clear')),
      h('p', { class: 'footnote section-footer' }, `Limit ${fmtAmount(basis.limit)} ${basis.unit}. At or under the limit is Held. None logs 0.${prev !== undefined ? " Clear removes this day's entry." : ''}`),
      error),
    isDirty: () => amount.value !== start,
    onAction: () => {
      const v = parseAmount(amount.value);
      if (v === null) return false;
      save(v);
    } });
  check();
}
