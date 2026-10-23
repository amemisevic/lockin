// History list (gym plan G11), a pushed route #gym/history: every finished workout, grouped by month, newest first.
// Each row opens the workout detail (gymWorkoutDetail.js). Logic in gymHistoryLogic.js. No timers.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pushedHeader, sectionHeading } from '../ui/chrome.js';
import { historyGroups, historyHref } from './gymHistoryLogic.js';

// One row is a link (the whole row is the target, 56 px or more): title and summary left, date and chevron right.
export const historyRow = w => h('li', { class: 'gm-rli', 'data-k': `h/${w.id}` }, h('a', { href: historyHref(w.id), class: 'gm-rw gm-rl' },
  h('div', null, h('div', { class: 'gm-rwn' }, w.title), h('div', { class: 'rn' }, w.summary)),
  h('span', { class: 'gm-rwd' }, w.date), icon('chevronRight')));

export function renderHistory(app) {
  const groups = historyGroups(app.gym);
  return [
    pushedHeader({ title: 'History', onBack: () => history.back() }),
    h('div', { class: 'gw' }, groups.length
      ? groups.map(x => h('section', null, sectionHeading(x.label), h('ul', { class: 'plate list gm-ul' }, x.rows.map(historyRow))))
      : h('p', { class: 'tk-empty' }, 'No workouts yet')),
  ];
}
