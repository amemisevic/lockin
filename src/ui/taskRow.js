// One task row (plan Task 10, owner call 6): shield toggle, title, time, ⋯ button; habits add 7 dots.
// The note is not shown in the row (owner, Task 11 fix round): the ⋯ menu shows it.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { setTaskStatus, habitDots } from '../core/tasks.js';
import { shieldToggle, shieldSvg } from './controls.js';

// "HH:MM–HH:MM" (en dash) when both exist, the start alone, else nothing.
const timeText = t => (t.start && t.end ? `${t.start}–${t.end}` : t.start || '');

// Seven small shields, oldest first; done = gold, today = dashed gold outline, off (not due) = muted; open/failed/stalled = plain.
const dots = statuses => h('div', { class: 'dots', 'aria-hidden': 'true' },
  statuses.map((s, i) => h('span', { class: ['mini', s === 'done' && 'on', s === 'off' && 'off', i === 6 && 'td'].filter(Boolean).join(' ') },
    shieldSvg([22, 25], ['b']))));

export function taskRow(app, view, date, { onMenu }) {
  const { task, status } = view;
  const time = timeText(task);
  // open → done; done, failed or stalled → null (un-do / reopen). Never closes the day.
  const onToggle = () => app.set(s => setTaskStatus(s, date, task.id, status === 'open' ? 'done' : null));
  return h('div', { class: status === 'done' ? 'row dn' : 'row' },
    shieldToggle({ status, onToggle, label: task.title }),
    h('div', { class: 'rb' },
      h('div', { class: 'rt' }, task.title),
      time && h('div', { class: 'rtm' }, time),
      status === 'done' && h('div', { class: 'okt' }, 'Completed'),
      task.repeat.type !== 'none' && dots(habitDots(app.state, task.id, date))),
    h('button', { type: 'button', class: 'more', 'aria-label': 'Task options', onClick: () => onMenu(view) }, icon('more')));
}
