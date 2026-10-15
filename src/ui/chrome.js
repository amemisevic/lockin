// Screen chrome (plan Task 10): titles, section heading, plates, pushed-screen header. DOM via h().
import { h } from '../dom.js';
import { icon } from '../icons.js';

export const screenTitle = text => h('h1', { class: 'ttl' }, text);
export const eyebrow = text => h('p', { class: 'eyebrow' }, text);
// Sword ornament first, then the words, vertically centred (DESIGN-SPEC §3).
export const sectionHeading = text => h('h2', { class: 'sec' }, icon('sword'), text);

export const plate = (...children) => h('div', { class: 'plate' }, children);
plate.warn = (...children) => h('div', { class: 'plate warn' }, children);

// Board header of pushed screens (static/Recovery.html): 44 px round back button, title, 44 px spacer.
export const pushedHeader = ({ title, onBack }) => h('div', { class: 'ph' },
  h('button', { type: 'button', class: 'ph-back', 'aria-label': 'Back', onClick: onBack }, icon('back')),
  h('h1', { class: 'eyebrow' }, title),
  h('span', { class: 'ph-sp' }));

// Board .fq (Recovery board): label with the gold number badge, then the control(s).
export const question = (n, label, forId, ...body) =>
  h('div', { class: 'fq' }, h(forId ? 'label' : 'div', { class: 'n', for: forId }, h('i', null, String(n)), label), body);

// Check-in re-render without a state write: app.js re-renders on hashchange. Blur first: iOS keeps a textarea focused
// on a button tap, and the R8 guard skips the re-render while one is focused.
export const rerender = () => {
  const a = document.activeElement;
  if (a?.tagName === 'TEXTAREA') a.blur();
  window.dispatchEvent(new Event('hashchange'));
};
