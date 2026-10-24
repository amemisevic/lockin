// Shared controls (plan Task 10): shield toggle, chips, segmented, stepper, switch, gold button.
// Stateless DOM builders (h + icon); looks are styles.css, copied from the boards' CSS.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openActionSheet } from '../sheet.js';
import { HELP } from '../views/helpCopy.js';

// The shield path from icons.js at a given size, keeping only the listed parts (b = outline, hl, lam).
export function shieldSvg(size, keep) {
  const svg = icon('shield');
  if (size) { svg.setAttribute('width', size[0]); svg.setAttribute('height', size[1]); }
  for (const part of svg.querySelectorAll('path')) if (!keep.includes(part.getAttribute('class'))) part.remove();
  return svg;
}

// Pop survives the re-render (owner call 2): app.set re-renders synchronously inside the tap handler,
// so the tap names its shield here and the shield built during that render pops if it is now done.
// ponytail: keyed by label, two shields with the same label on one screen both pop; key by id if that matters.
let popKey = null;

// status: 'open' | 'done' | 'failed' | 'stalled'. aria-pressed is true only for done (call 4), so the other three also
// carry their state as a description (T10-1). id (the focus-restore id, app.js render) names the button; its state text is `${id}-st`.
const STATE_TEXT = { open: 'Open', failed: 'Failed', stalled: 'Stalled' };
export function shieldToggle({ status, onToggle, label, id }) {
  const done = status === 'done';
  const svg = shieldSvg(null, ['b', 'hl', 'lam']);
  // Failed (owner ruling R1): the Reset badge X (M3 3l8 8M11 3l-8 8, 14 box) drawn where the lambda sits.
  if (status === 'failed') svg.querySelector('.lam').setAttribute('d', 'M10.5 13.25l9 9M19.5 13.25l-9 9');
  const cls = ['shield', done && 'on', status === 'failed' && 'failed', status === 'stalled' && 'stalled', done && popKey === label && 'pop'];
  const state = id && STATE_TEXT[status];
  return h('button', {
    type: 'button', id, class: cls.filter(Boolean).join(' '), 'aria-pressed': String(done), 'aria-label': label,
    'aria-describedby': state ? `${id}-st` : null,
    onClick: () => { popKey = label; try { onToggle(); } finally { popKey = null; } },
  }, svg, state && h('span', { id: `${id}-st`, hidden: true }, state));
}

// Choice buttons in a group; aria-pressed marks the chosen one(s). multi: value is an array.
// onPick gets the tapped value; with multi the caller adds or removes it.
// id (T10-2): a group whose tap re-renders the screen gives its buttons ids `${id}-${n}`, so app.js can put focus back.
const choices = (cls, item, { options, value, onPick, multi, id }) => h('div', { class: cls, role: 'group' },
  options.map((o, i) => {
    const on = multi ? value.includes(o.value) : value === o.value;
    return h('button', { type: 'button', id: id && `${id}-${i}`, class: [item, on && 'on'].filter(Boolean).join(' ') || null, 'aria-pressed': String(on),
      onClick: () => onPick(o.value) }, o.label);
  }));

export const chips = opts => choices('chips', 'chip', opts);
export const segmented = ({ options, value, onPick, id }) => choices('seg', null, { options, value, onPick, id });

export function stepper({ value, min, max, onChange, label }) {
  return h('div', { class: 'stp', role: 'group', 'aria-label': label },
    h('button', { type: 'button', 'aria-label': 'Fewer', disabled: value <= min, onClick: () => onChange(value - 1) }, icon('stpMinus')),
    h('b', null, String(value)),
    h('button', { type: 'button', 'aria-label': 'More', disabled: value >= max, onClick: () => onChange(value + 1) }, icon('stpPlus')));
}

// A 60×44 button around the board's 60×34 track (owner ruling R3); the shield is the thumb.
export function switchControl({ on, onToggle, label }) {
  return h('button', { type: 'button', class: 'swb', role: 'switch', 'aria-checked': String(on), 'aria-label': label, onClick: onToggle },
    h('span', { class: on ? 'sw on' : 'sw' }, h('span', { class: 'th' }, shieldSvg([22, 25], ['b', 'lam']))));
}

export const goldButton = (label, onClick, { disabled } = {}) =>
  h('button', { type: 'button', class: 'btn-gold', onClick, disabled }, label);

// Help "?" (H1b): 44 px button that opens the action sheet with the entry's text and a Close button.
export const helpButton = key => h('button', { type: 'button', id: `help-${key}`, class: 'help', 'aria-label': `Help: ${HELP[key].name}`,
  onClick: () => openActionSheet([], { message: HELP[key].text, cancel: 'Close' }) }, icon('help'));
