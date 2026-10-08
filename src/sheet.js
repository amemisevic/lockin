// Bottom sheet and action sheet on native <dialog> (showModal traps focus; Esc fires `cancel`).
import { h } from './dom.js';

let currentSheet = null;
let currentActions = null;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Return focus to the opener; if a re-render replaced it, to its replacement with the same id.
function refocus(opener) {
  const el = opener?.isConnected ? opener : opener?.id && document.getElementById(opener.id);
  el?.focus?.();
}

// Shows the dialog modally; returns its dismiss function. Removal is synchronous so a closed
// dialog never lingers in the DOM (its title id would shadow the next sheet's aria-labelledby).
function present(dialog, onCancel) {
  const opener = document.activeElement;
  dialog.addEventListener('cancel', e => { e.preventDefault(); onCancel(); });
  document.body.append(dialog);
  dialog.showModal();
  return () => {
    if (!dialog.isConnected) return;
    dialog.close();
    dialog.remove();
    refocus(opener);
  };
}

export function openSheet({ title, action, content, isDirty = () => false, onAction }) {
  currentActions?.close();
  currentSheet?.close();
  const titleId = 'sheet-title';
  const close = () => { dismiss(); if (currentSheet === api) currentSheet = null; };
  const requestClose = () => {
    if (!isDirty()) return close();
    openActionSheet([{ label: 'Discard Changes', destructive: true, onSelect: close }], { cancel: 'Keep Editing' });
  };
  const actionButton = h('button', { type: 'button', class: 'btn btn-text sheet-action',
    onClick: () => { if (onAction() !== false) close(); } }, action);
  const header = h('header', { class: 'sheet-header' },
    h('div', { class: 'grabber', 'aria-hidden': 'true' }),
    h('button', { type: 'button', class: 'btn btn-text', onClick: requestClose }, 'Cancel'),
    h('h2', { class: 'title3', id: titleId }, title),
    actionButton);
  const dialog = h('dialog', { class: 'sheet', 'aria-labelledby': titleId }, header, h('div', { class: 'sheet-body' }, content));
  swipeToDismiss(dialog, header, requestClose);
  const api = { close, actionButton };
  currentSheet = api;
  const dismiss = present(dialog, requestClose);
  return api;
}

// Drag down from the grabber/header: past 100 px asks to close, otherwise springs back.
function swipeToDismiss(dialog, handle, requestClose) {
  let startY = null;
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', e => {
    if (startY === null || reduceMotion()) return;
    dialog.style.transition = 'none';
    dialog.style.transform = `translateY(${Math.max(0, e.clientY - startY)}px)`;
  });
  const end = e => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;
    dialog.style.transition = '';
    dialog.style.transform = '';
    if (dy > 100) requestClose();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

// items: {label, destructive?, onSelect}[]; opts: {message?, cancel? = 'Cancel'}
export function openActionSheet(items, { message, cancel = 'Cancel' } = {}) {
  currentActions?.close();
  const close = () => { dismiss(); if (currentActions === api) currentActions = null; };
  const choose = onSelect => () => {
    close(); // focus is back on the opener before onSelect may open the next sheet
    onSelect();
  };
  const dialog = h('dialog', { class: 'action-sheet', 'aria-label': message ?? 'Actions' },
    h('div', { class: 'group' },
      message && h('p', { class: 'footnote action-message' }, message),
      items.map(it => h('button', { type: 'button', class: `action-row${it.destructive ? ' destructive' : ''}`, onClick: choose(it.onSelect) }, it.label))),
    h('div', { class: 'group' }, h('button', { type: 'button', class: 'action-row action-cancel', onClick: close }, cancel)));
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); }); // tap on the dimmed backdrop
  const api = { close };
  currentActions = api;
  const dismiss = present(dialog, close);
}
