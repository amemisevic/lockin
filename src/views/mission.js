// Mission detail (plan Task 14 step 1): pushed screen #mission/<n>. Locked days and missing missions show a plate.
import { h } from '../dom.js';
import { pushedHeader, eyebrow, plate, screenTitle } from '../ui/chrome.js';
import { goldButton, helpButton } from '../ui/controls.js';
import { missionView } from './warlogLogic.js';

function body(app, v) {
  if (v.kind === 'locked') return plate(h('p', { class: 'ms-p' }, `Locked until Day ${v.n}.`));
  if (v.kind === 'none') {
    return plate(h('p', { class: 'ms-p' }, `No mission loaded for Day ${v.n}.`), h('p', { class: 'ms-p t2' }, 'Import a pack in Settings.'));
  }
  return [h('div', { class: 'hlp-row' }, eyebrow('Mission'), helpButton('mission')), screenTitle(v.title), v.paragraphs.map(t => h('p', { class: 'ms-p' }, t)),
    goldButton('Write the War Log entry', () => app.nav(v.href))];
}

export function renderMission(app, [p] = []) {
  const v = missionView(app.state, app.today(), p);
  if (v.kind === 'redirect') { app.redirect('#challenge'); return []; }
  return [pushedHeader({ title: `Day ${v.n}`, onBack: () => history.back() }), h('div', { class: 'ms' }, body(app, v))];
}
