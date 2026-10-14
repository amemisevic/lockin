// Afternoon check-in (plan Task 15 step 2): still on track, friction when struggling, today's open tasks, Log it.
// Same .fq questions and date-keyed draft as the morning check-in (owner decision 1). Re-submit replaces the stored answer.
import { h } from '../dom.js';
import { dayNo, phase, submitAfternoon } from '../core/challenge.js';
import { openTasks } from '../core/tasks.js';
import { pushedHeader, sectionHeading } from '../ui/chrome.js';
import { segmented, goldButton } from '../ui/controls.js';
import { taskRow } from '../ui/taskRow.js';
import { openTaskMenu } from './tasks.js';

const drafts = {};
const rerender = () => window.dispatchEvent(new Event('hashchange')); // app.js re-renders on hashchange; no state write
const TRACK = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'struggling', label: 'Struggling' }];

const question = (n, label, forId, ...body) =>
  h('div', { class: 'fq' }, h(forId ? 'label' : 'div', { class: 'n', for: forId }, h('i', null, String(n)), label), body);

export function renderAfternoon(app) {
  const { state } = app;
  const today = app.today();
  const day = state.days[today];
  if (phase(state, today) !== 'active' || day?.closedAt != null || day?.result != null || !day?.morning) {
    app.redirect('#today');
    return [];
  }
  const a = day.afternoon;
  const d = drafts[today] ??= { onTrack: a?.onTrack ?? null, friction: a?.friction ?? '' };
  const tasks = openTasks(state, today);

  const log = goldButton('Log it', () => {
    if (!d.onTrack) return; // disabled in the browser; guard anyway
    const { onTrack, friction } = d;
    delete drafts[today];
    app.set(s => submitAfternoon(s, today, { onTrack, friction }, Date.now()));
    app.nav('#today');
  }, { disabled: !d.onTrack });
  log.id = 'ci-log';

  return [
    pushedHeader({ title: `Afternoon · Day ${dayNo(state, today)}`, onBack: () => history.back() }),
    question(1, 'Still on track?', null, segmented({ options: TRACK, value: d.onTrack, onPick: v => { d.onTrack = v; rerender(); } })),
    d.onTrack === 'struggling' && question(2, 'What is the friction?', 'ci-friction',
      h('textarea', { id: 'ci-friction', class: 'ta', onInput: e => { d.friction = e.target.value; } }, d.friction)),
    tasks.length > 0 && h('section', { class: 'ci-tk' },
      sectionHeading('Open tasks'),
      h('p', { class: 't2 ci-hl' }, 'Provisional — finalizes tonight'),
      h('div', { class: 'plate list' }, tasks.map(v => taskRow(app, v, today, { onMenu: view => openTaskMenu(app, view, today) })))),
    h('div', { class: 'ci-go' }, log),
  ].filter(Boolean);
}
