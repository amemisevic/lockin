// Today tab (plan Task 12): date, day medallion, challenge plate, action cards, today's tasks.
// Layout = static/Main.html; cards come from todayLogic.js. Uses Date.now() and app.today() only, never the
// Tasks tab's view date (m7). No timer of its own: app.js re-renders on state change and on its 30 s tick.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { tasksOn } from '../core/tasks.js';
import { NIGHT_FROM, dayNo, phase } from '../core/challenge.js';
import { NIGHT_TEXT, currentStreak } from '../core/scoring.js';
import { screenTitle, eyebrow, sectionHeading, plate } from '../ui/chrome.js';
import { taskRow } from '../ui/taskRow.js';
import { goldButton, helpButton } from '../ui/controls.js';
import { dayLabel } from './tasksLogic.js';
import { openTaskMenu } from './tasks.js';
import { todayCards, timeLeft, nightLineVisible, medLine } from './todayLogic.js';

// Afternoon "Not now" (ruling R6): in memory only, for one date, never saved.
let dismissedOn = null;

// An icon redrawn as one of the board's inline SVGs (stroke style from screens.css). Extra paths are clones.
function redraw(name, cls, [vw, vh, w, ht], ...ds) {
  const svg = icon(name);
  for (const [k, v] of [['viewBox', `0 0 ${vw} ${vh}`], ['width', w], ['height', ht]]) svg.setAttribute(k, v);
  svg.setAttribute('class', cls);
  const p = svg.querySelector('path');
  ds.slice(1).forEach(() => svg.append(p.cloneNode()));
  svg.querySelectorAll('path').forEach((x, i) => x.setAttribute('d', ds[i]));
  return svg;
}
const chevron = () => redraw('chevronRight', 'td-chev', [9, 16, 9, 16], 'M1.5 1.5 7.5 8l-6 6.5');
// Torch (static/Main.html): flame + stand; lit = filled gold flame, unlit = outline (shape, not colour only).
const torch = lit => redraw('plus', lit ? 'td-torch' : 'td-torch off', [10, 16, 9, 15], 'M5 0l2 9H3z', 'M1 9.5h8M5 9.5V15');

// Board hero watermark: the shield, 150 px at 7 %.
function watermark() {
  const svg = icon('shield');
  svg.setAttribute('class', 'td-wm');
  svg.querySelector('.hl').remove();
  return svg;
}

function medallion(state, n) {
  const of = `of ${state.challenge.length}`;
  return h('div', { class: 'td-med', role: 'img', 'aria-label': `Day ${n} ${of}` },
    h('b', { 'aria-hidden': 'true' }, String(n)), h('span', { 'aria-hidden': 'true' }, of));
}

function challengePlate(state, today, n, nowMs) {
  const streak = currentStreak(state);
  const morning = state.days[today]?.morning;
  const night = nightLineVisible(nowMs) && `Night opens ${String(NIGHT_FROM).padStart(2, '0')}:00`;
  const forced = medLine(state, today, nowMs);
  return h('a', { href: '#challenge', id: 'td-ch', class: 'plate td-ch' },
    h('div', { class: 'td-chh' },
      h('div', { class: 'td-tile' }, icon('challenge')),
      h('div', { class: 'td-chb' },
        eyebrow(`PM Challenge · Day ${n}`),
        streak >= 1 && h('div', { class: 'td-stk' }, `${streak}-day streak`)),
      chevron()),
    h('div', { class: 'td-st' },
      h('span', morning ? null : { class: 't2' }, torch(!!morning), morning ? 'Morning done' : 'Morning pending'),
      night && h('span', { class: 't2' }, torch(false), night)),
    forced && h('p', { class: 't2 td-ff' }, forced));
}

// Gold-button card (board hero .plate.rim): title, line, button; afternoon adds "Not now".
// Ids td-<kind>: app.js restores focus by id across the 30 s re-render.
function actionCard(app, kind, title, line, label, href, extra) {
  const btn = goldButton(label, () => app.nav(href));
  btn.id = `td-${kind}`;
  return h('div', { class: 'plate rim td-card' }, watermark(),
    title && h('div', { class: 'td-ct' }, title),
    h('p', { class: title ? 't2 td-cl' : 't2 td-cl td-cl1' }, line),
    h('div', { class: 'td-acts' }, btn, extra));
}

// Whole-plate link (recovery, start): the owner gave no button copy for these.
const linkCard = (kind, cls, href, title, line) => h('a', { href, id: `td-${kind}`, class: `plate ${cls} td-link` },
  h('div', { class: 'td-chb' }, h('div', { class: 'td-ct' }, title), line && h('p', { class: 't2 td-cl' }, line)), chevron());

function card(app, c) {
  if (c.kind === 'start') return linkCard(c.kind, 'rim', c.href, 'Start Day 1');
  if (c.kind === 'recovery') return linkCard(c.kind, 'warn', c.href, 'Recovery due', c.overdue ? 'Overdue' : timeLeft(c.msLeft));
  if (c.kind === 'closeYesterday') return actionCard(app, c.kind, null, NIGHT_TEXT['yesterday-open'], 'Close yesterday', c.href, helpButton('autoRedo'));
  if (c.kind === 'morning') return actionCard(app, c.kind, 'Morning check-in', 'Set today\'s target.', 'Start morning', c.href);
  if (c.kind === 'night') return actionCard(app, c.kind, 'Night check-in', 'Close today.', 'Start night', c.href);
  const notNow = h('button', { type: 'button', id: 'td-notnow', class: 'btn-ghost', onClick: () => {
    dismissedOn = app.today();
    window.dispatchEvent(new Event('hashchange')); // app.js re-renders on hashchange; no state write
  } }, 'Not now');
  return actionCard(app, c.kind, 'Afternoon check-in', 'Are you on track?', 'Start afternoon', c.href, notNow);
}

export function renderToday(app) {
  const { state } = app;
  const today = app.today();
  const active = phase(state, today) === 'active';
  const n = dayNo(state, today);
  const now = Date.now();
  const cards = todayCards(state, now, { afternoonDismissed: dismissedOn === today });
  // Every task due today, once-only and habits (differs on purpose from the Tasks tab).
  const views = tasksOn(state, today);
  const done = views.filter(v => v.status === 'done').length;
  const list = plate(views.map(v => taskRow(app, v, today, { onMenu: view => openTaskMenu(app, view, today) })));
  list.classList.add('list');

  return [
    h('div', { class: 'tk-hd' },
      h('div', null, eyebrow(dayLabel(today)), screenTitle('Today')),
      active && medallion(state, n)),
    h('div', { class: 'mk', 'aria-hidden': 'true' }),
    active && challengePlate(state, today, n, now),
    ...cards.map(c => card(app, c)),
    h('section', null,
      h('div', { class: 'tk-sh' }, sectionHeading('Today\'s tasks'), views.length > 0 && h('span', { class: 't2' }, `${done} of ${views.length} done`)),
      views.length ? list : h('p', { class: 'tk-empty' }, 'Nothing planned.')),
  ].filter(Boolean);
}
