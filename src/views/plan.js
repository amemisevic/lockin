// Plan: week strip, the selected day's blocks, Add Block, Copy Day.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet } from '../sheet.js';
import { openBlockSheet } from './blockSheet.js';
import { blockRow } from './blockRow.js';
import { addDays, weekStart, keyToDate, occurrencesOn, nowNext, copyDay, uid } from '../logic.js';

let selected = null; // ephemeral, never saved

const fmt = (key, opts) => keyToDate(key).toLocaleDateString('en-GB', opts);

export function renderPlan(app) {
  const today = app.today();
  selected ??= today;
  const select = (key, focusId) => { // local view state only
    selected = key;
    section.replaceWith(renderPlan(app));
    document.getElementById(focusId)?.focus();
  };
  const monday = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const occs = occurrencesOn(app.state, selected);
  const now = new Date();
  const nowMin = selected < today ? 1440 : selected === today ? now.getHours() * 60 + now.getMinutes() : -1;
  const missed = new Set(nowNext(occs, nowMin).missed.map(o => o.occId));

  const section = h('section', null,
    h('div', { class: 'toolbar' },
      h('button', { type: 'button', class: 'icon-btn', id: 'plan-add', 'aria-label': 'Add Block',
        onClick: () => openBlockSheet(app, { mode: 'new', date: selected }) }, icon('plus'))),
    h('h1', { class: 'large-title' }, 'Plan'),
    h('div', { class: 'week-nav' },
      h('button', { type: 'button', class: 'icon-btn', id: 'week-prev', 'aria-label': 'Previous Week', onClick: () => select(addDays(selected, -7), 'week-prev') }, icon('chevronLeft')),
      h('p', { class: 'headline week-label' }, `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`),
      h('button', { type: 'button', class: 'icon-btn', id: 'week-next', 'aria-label': 'Next Week', onClick: () => select(addDays(selected, 7), 'week-next') }, icon('chevronRight'))),
    h('div', { class: 'day-strip', role: 'group', 'aria-label': 'Day' }, days.map(d =>
      h('button', { type: 'button', class: 'day', id: `day-${d}`, 'aria-pressed': String(d === selected), 'aria-current': d === today ? 'date' : null,
        'aria-label': fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }) + (d === today ? ', today' : ''), onClick: () => select(d, `day-${d}`) },
        h('span', { class: 'caption2' }, fmt(d, { weekday: 'narrow' })),
        h('span', { class: 'day-num' }, fmt(d, { day: 'numeric' }))))),
    h('h2', { class: 'section-header footnote' }, fmt(selected, { weekday: 'long', day: 'numeric', month: 'long' })),
    occs.length
      ? h('div', { class: 'group rail' }, occs.map(o => blockRow(app, o, { missed: missed.has(o.occId) })))
      : h('div', { class: 'group' }, h('div', { class: 'row empty' }, h('p', { class: 'row-main subhead' }, 'Nothing planned. Add a block.'),
        h('button', { type: 'button', class: 'btn btn-text', onClick: () => openBlockSheet(app, { mode: 'new', date: selected }) }, 'Add Block'))),
    occs.length > 0 && h('div', { class: 'section-actions' },
      h('button', { type: 'button', class: 'btn btn-text', id: 'plan-copy', onClick: () => openCopyDay(app, selected) }, 'Copy Day')));
  return section;
}

function openCopyDay(app, from) {
  const to = h('input', { type: 'date', value: addDays(from, 1), required: true, onInput: () => check() });
  const check = () => { sheet.actionButton.disabled = !to.value || to.value === from; };
  const sheet = openSheet({ title: 'Copy Day', action: 'Copy',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' }, h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, 'Copy to'), to)),
      h('p', { class: 'footnote section-footer' }, `Copies the blocks of ${fmt(from, { weekday: 'short', day: 'numeric', month: 'short' })} as one-off blocks. Moved blocks are skipped.`)),
    onAction: () => {
      if (!to.value || to.value === from) return false;
      selected = to.value;
      app.set(s => copyDay(s, from, to.value, uid));
    } });
}
