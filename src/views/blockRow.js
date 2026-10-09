// One block row + Log Time sheet (Today only) + delete flow (shared by Plan and Today).
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet, openActionSheet } from '../sheet.js';
import { openBlockSheet, TAGS, tagName } from './blockSheet.js';
import { parseDuration, canSave, logTime } from '../timeLog.js';
import { keyToDate, minutesFor, completeOcc, uncompleteOcc, removeBlock, deleteOccurrence, deleteFuture } from '../logic.js';

export const shortDate = key => keyToDate(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const domId = occ => occ.occId.replace(/[^\w-]/g, '_');

export function blockRow(app, occ, { missed, canLog = false }) {
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
      !occ.done && !occ.movedTo && { label: 'Move', onSelect: () => openBlockSheet(app, { mode: 'move', occ }) },
      { label: 'Delete', destructive: true, onSelect: () => openDeleteFlow(app, occ) },
    ].filter(Boolean)) }, icon('ellipsis'));

  return h('div', { class: `row block-row g-${occ.tag}${occ.done ? ' is-done' : ''}` },
    toggle,
    h('div', { class: 'row-main' },
      h('p', { class: 'subhead' }, `${occ.start}–${occ.end}`),
      h('p', { class: 'block-title' }, occ.title),
      h('p', { class: 'subhead block-meta' }, h('span', { class: 'tag-icon' }, icon(tagIcon)), `${tagName(app.state, occ.tag)} · ${minutes}`),
      status,
      // On its own line under the title: beside it, the title column is too narrow at 375 px.
      canLog && h('button', { type: 'button', class: 'btn btn-text log-time', id: `log-time-${domId(occ)}`, 'aria-label': `Log time: ${occ.title}`,
        onClick: () => openLogTime(app, occ) }, icon('stopwatch'), 'Log time')),
    more);
}

export function openLogTime(app, occ) {
  let mode = 'add';
  const field = (label, unit) => h('input', { type: 'text', inputmode: 'numeric', placeholder: '0', autocomplete: 'off', 'aria-label': label,
    id: `log-${unit}`, onInput: () => check() });
  const hours = field('Hours', 'hours'), minutes = field('Minutes', 'minutes');
  const error = h('p', { class: 'form-error', role: 'status' });
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Mode' }, [['add', 'Add to total'], ['replace', 'Replace total']].map(([v, text]) =>
    h('button', { type: 'button', role: 'radio', id: `log-${v}`, 'aria-checked': String(v === mode),
      onClick: e => { mode = v; for (const b of seg.children) b.setAttribute('aria-checked', String(b === e.currentTarget)); check(); } }, text)));
  const total = () => parseDuration(hours.value, minutes.value);
  const check = () => {
    error.textContent = total() === null ? 'Enter whole hours and minutes, like 1 and 30.' : '';
    sheet.actionButton.disabled = !canSave(total(), mode);
  };
  const row = (text, input) => h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, text), input);
  const sheet = openSheet({ title: 'Log Time', action: 'Save',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' }, row('Hours', hours), row('Minutes', minutes)),
      seg,
      h('p', { class: 'footnote section-footer' },
        `${occ.title}: ${occ.actualMin ?? 0} min logged, ${occ.plannedMin} min planned. Minutes over 59 are fine. Saving marks the block done.`),
      error),
    isDirty: () => !!(hours.value.trim() || minutes.value.trim()) || mode !== 'add',
    onAction: () => {
      if (!canSave(total(), mode)) return false;
      app.set(s => logTime(s, occ, total(), mode));
    } });
  check();
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
