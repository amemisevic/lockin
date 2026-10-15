// War Log list and entry editor (plan Task 14 steps 2-3). DOM via h(), text nodes only.
import { h } from '../dom.js';
import { pushedHeader, sectionHeading } from '../ui/chrome.js';
import { goldButton } from '../ui/controls.js';
import { warLogGroups, entryView, saveEntry } from './warlogLogic.js';

// Task-row markup (.row/.rb/.rt/.rtm/.rn from styles.css) as a link; date only when written.
const row = r => h('a', { href: r.href, class: 'row wl-row' }, h('div', { class: 'rb' },
  h('div', { class: 'rt' }, r.title),
  r.date === null ? null : h('div', { class: 'rtm' }, r.date),
  h('div', { class: 'rn' }, r.preview)));

export function renderWarLog(app) {
  return [pushedHeader({ title: 'War Log', onBack: () => history.back() }),
    ...warLogGroups(app.state).flatMap(g => [sectionHeading(g.group), h('div', { class: 'plate list' }, g.rows.map(row))])];
}

// Autopsies are read-only. Editable: saves on blur, Done and Back (R6); mousedown is prevented on
// Done/Back so focus stays in the textarea and the blur re-render cannot swallow the click (R7).
export function renderWarEntry(app, [key] = []) {
  const v = entryView(app.state, key);
  if (!v) { app.redirect('#warlog'); return []; }
  if (v.readOnly) {
    return [pushedHeader({ title: v.title, onBack: () => history.back() }), h('div', { class: 'wl' }, h('div', { class: 'plate wl-ro' }, v.text))];
  }
  const ta = h('textarea', { id: 'wl-text', class: 'ta wl-ta', 'aria-label': v.title, onBlur: () => save(), onInput: () => save() }, v.text);
  const save = () => app.set(s => saveEntry(s, key, ta.value, Date.now()));
  const leave = () => { save(); history.back(); };
  const keepFocus = e => e.preventDefault();
  const header = pushedHeader({ title: v.title, onBack: leave });
  const done = goldButton('Done', leave);
  header.querySelector('.ph-back').addEventListener('mousedown', keepFocus);
  done.addEventListener('mousedown', keepFocus);
  return [header, h('div', { class: 'wl' }, ta, done)];
}
