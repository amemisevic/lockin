// Screen chrome (plan Task 10): titles, section heading, plates, pushed-screen header. DOM via h().
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { helpButton } from './controls.js';

export const screenTitle = (text, tag = 'h1') => h(tag, { class: 'ttl' }, text);
export const eyebrow = text => h('p', { class: 'eyebrow' }, text);
// Sword ornament first, then the words, vertically centred (DESIGN-SPEC §3).
// help (H1b, a key of views/helpCopy.js): the heading and its "?" in one row. id (T16-1): lets a field name itself by it.
export const sectionHeading = (text, help, id) => {
  const el = h('h2', { class: 'sec', id }, icon('sword'), text);
  return help ? h('div', { class: 'hlp-row' }, el, helpButton(help)) : el;
};

export const plate = (...children) => h('div', { class: 'plate' }, children);
plate.warn = (...children) => h('div', { class: 'plate warn' }, children);

// Board header of pushed screens (static/Recovery.html): 44 px round back button, title, 44 px spacer.
export const pushedHeader = ({ title, onBack, help }) => h('div', { class: 'ph' },
  h('button', { type: 'button', class: 'ph-back', 'aria-label': 'Back', onClick: onBack }, icon('back')),
  h('h1', { class: 'eyebrow' }, title),
  help ? helpButton(help) : h('span', { class: 'ph-sp' })); // the "?" takes the spacer's 44 px

// Board .fq (Recovery board): label with the gold number badge, then the control(s).
// label may be [text, help] (H1b): the "?" sits outside the <label>.
export const question = (n, label, forId, ...body) => {
  const [text, help] = [].concat(label);
  const head = h(forId ? 'label' : 'div', { class: 'n', for: forId }, h('i', null, String(n)), text);
  return h('div', { class: 'fq' }, help ? h('div', { class: 'hlp-row' }, head, helpButton(help)) : head, body);
};

// A refusal sentence under a gold button (T11-1). role=alert only on its first display: every later render of the same
// refusal (choice taps, the 30 s tick) keeps the text but not the role, so VoiceOver does not read it again.
// The draft remembers it (d.errorShown); a handler that sets d.error also sets d.errorShown = false.
export const formError = (d, text) => {
  const role = d.errorShown ? null : 'alert';
  d.errorShown = true;
  return h('p', { class: 'form-error', role }, text);
};

// Check-in re-render without a state write: app.js re-renders on hashchange. Blur first: iOS keeps a textarea focused
// on a button tap, and the R8 guard skips the re-render while one is focused.
export const rerender = () => {
  const a = document.activeElement;
  if (a?.tagName === 'TEXTAREA') a.blur();
  window.dispatchEvent(new Event('hashchange'));
};
