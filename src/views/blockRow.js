// One block row + Log Minutes sheet + delete flow (shared by Plan and Today).
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet, openActionSheet } from '../sheet.js';
import { openBlockSheet, TAGS, tagName } from './blockSheet.js';
import { keyToDate, minutesFor, completeOcc, uncompleteOcc, removeBlock, deleteOccurrence, deleteFuture } from '../logic.js';

export const shortDate = key => keyToDate(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const domId = occ => occ.occId.replace(/[^\w-]/g, '_');

export function blockRow(app, occ, { missed }) {
  const [, tagIcon] = TAGS.find(t => t[0] === occ.tag) ?? TAGS[4];
  const moved = occ.movedTo && app.state.blocks.find(b => b.id === occ.movedTo);
  const minutes = occ.actualMin !== undefined ? `${occ.actualMin} / ${occ.plannedMin} min` : `${occ.plannedMin} min`;
  const status = occ.movedTo
    ? h('p', { class: 'subhead' }, moved ? `Moved to ${shortDate(moved.date)}, ${moved.start}` : 'Moved')
    : missed && h('p', { class: 'subhead missed' }, 'Missed');

  const toggle = occ.movedTo ? h('span', { class: 'toggle-spacer' }) : h('button', {
    type: 'button', class: 'done-toggle', id: `done-${domId(occ)}`, 'aria-pressed': String(occ.done), 'aria-label': `Done: ${occ.title}`,
    onClick: () => app.set(s => occ.done ? uncompleteOcc(s, occ.occId) : completeOcc(s, occ)),
  }, icon('check'));

  const more = h('button', { type: 'button', class: 'icon-btn', id: `more-${domId(occ)}`, 'aria-label': `Actions for ${occ.title}`,
    onClick: () => openActionSheet([
      !occ.orphan && { label: 'Edit', onSelect: () => openBlockSheet(app, { mode: 'edit', occ }) },
      { label: 'Log Minutes', onSelect: () => openLogMinutes(app, occ) },
      !occ.done && !occ.movedTo && { label: 'Move', onSelect: () => openBlockSheet(app, { mode: 'move', occ }) },
      { label: 'Delete', destructive: true, onSelect: () => openDeleteFlow(app, occ) },
    ].filter(Boolean)) }, icon('ellipsis'));

  return h('div', { class: `row block-row g-${occ.tag}${occ.done ? ' is-done' : ''}` },
    toggle,
    h('div', { class: 'row-main' },
      h('p', { class: 'subhead' }, `${occ.start}–${occ.end}`),
      h('p', { class: 'block-title' }, occ.title),
      h('p', { class: 'subhead block-meta' }, h('span', { class: 'tag-icon' }, icon(tagIcon)), `${tagName(app.state, occ.tag)} · ${minutes}`),
      status),
    more);
}

export function openLogMinutes(app, occ) {
  const start = String(occ.actualMin ?? occ.plannedMin);
  const field = h('input', { type: 'number', inputmode: 'numeric', min: '0', max: '720', step: '1', value: start, 'aria-label': 'Minutes',
    onInput: () => check() });
  const error = h('p', { class: 'form-error', role: 'status' });
  const valid = () => /^\d+$/.test(field.value) && +field.value <= 720;
  const check = () => { error.textContent = valid() ? '' : 'Enter 0 to 720 minutes.'; sheet.actionButton.disabled = !valid(); };
  const sheet = openSheet({ title: 'Log Minutes', action: 'Done',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' }, h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, occ.title), field)),
      h('p', { class: 'footnote section-footer' }, `Planned ${occ.plannedMin} min. Logging marks the block done.`),
      error),
    isDirty: () => field.value !== start,
    onAction: () => {
      if (!valid()) return false;
      app.set(s => completeOcc(s, occ, +field.value));
    } });
}

export function openDeleteFlow(app, occ) {
  const block = app.state.blocks.find(b => b.id === occ.blockId);
  if (occ.orphan || !block) {
    openActionSheet([{ label: 'Remove Log', destructive: true, onSelect: () => app.set(s => uncompleteOcc(s, occ.occId)) }]);
  } else if (block.repeat.type !== 'none') {
    openActionSheet([
      { label: 'Delete This Day', destructive: true, onSelect: () => app.set(s => deleteOccurrence(s, occ.blockId, occ.date)) },
      { label: 'Delete This and Future', destructive: true, onSelect: () => app.set(s => deleteFuture(s, occ.blockId, occ.date)) },
    ]);
  } else {
    openActionSheet([{ label: 'Delete Block', destructive: true, onSelect: () => app.set(s => removeBlock(s, occ.blockId)) }],
      { message: 'This also removes its log.' });
  }
}
