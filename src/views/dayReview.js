// Day review sheet (DR1): read-only record of one past or current day, opened from the 30-day strip.
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';
import { sectionHeading } from '../ui/chrome.js';
import { dayLabel } from './tasksLogic.js';
import { dayRecord } from './dayReviewLogic.js';

const cap = s => s[0].toUpperCase() + s.slice(1);
const block = (title, ...body) => h('section', null, sectionHeading(title), h('div', { class: 'plate dr-b' }, body));
const line = (label, value) => value ? h('p', { class: 'dr-l' }, h('span', { class: 't2' }, `${label} `), value) : null;
const items = rows => h('ul', { class: 'dr-ul' }, rows.map(r => h('li', null, r)));

export function reviewBody(r) {
  if (r.empty) return [h('p', { class: 't2' }, 'Nothing logged.')];
  const { morning: m, afternoon: a, night: n } = r;
  return [
    (r.result || r.declaredRedo || r.auto) && block('Result',
      line('Result', r.result && cap(r.result)), r.declaredRedo && h('p', { class: 'dr-l' }, 'Redo declared'),
      r.auto === 'no-night' && h('p', { class: 'dr-l' }, 'No night check-in')),
    m && block('Morning', line('Target', m.target), line('Risk', m.risk)),
    a && block('Afternoon', line('On track', a.onTrack && cap(a.onTrack)), line('Friction', a.friction)),
    n && block('Night',
      n.protocols?.length > 0 && items(n.protocols.map(p => `${p.title}: ${p.status}`)),
      n.redLines?.length > 0 && items(n.redLines.map(l => `${l.name}: ${l.status}`)),
      line('Win', n.win), line('Bottom G', n.bottomG?.text)),
    r.slipNote && block('Slipped without knowing', h('p', { class: 'dr-l' }, r.slipNote)),
    r.autopsy && block('Autopsy', h('p', { class: 'dr-l dr-pre' }, r.autopsy)),
    r.recoveryPending && block('Recovery', h('p', { class: 'dr-l' }, 'Autopsy not filed.')),
    r.tasks.length > 0 && block('Tasks done', items(r.tasks), h('p', { class: 'footnote' }, 'Task names show today\'s titles.')),
  ].filter(Boolean);
}

export function openDayReview(state, date) {
  const r = dayRecord(state, date);
  openSheet({ title: `${r.dayNo ? `Day ${r.dayNo} · ` : ''}${dayLabel(date)}`, action: 'Close', content: h('div', { class: 'dr' }, reviewBody(r)), onAction: () => {} });
  // One close control: the sheet's Cancel stays in place for layout but is hidden (the Close button and Esc remain).
  const cancel = document.getElementById('sheet-title')?.parentElement?.querySelector('button:not(.sheet-action)');
  cancel?.setAttribute('aria-hidden', 'true');
  cancel?.setAttribute('tabindex', '-1');
  if (cancel) cancel.style.visibility = 'hidden';
}
