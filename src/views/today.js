// Today: date switcher, Now card (today only), blocks, goals, red lines. Past days are fully editable.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openBlockSheet, TAGS, tagName } from './blockSheet.js';
import { blockRow, shortDate } from './blockRow.js';
import { addDays, keyToDate, fromMin, toMin, formatClock, occurrencesOn, nowNext, completeOcc, elapsedMin, copyDay, uid,
  goalMinutes, dayStatus, weekSummary, isWeekend, unsortedMinutes, redStatus } from '../logic.js';
import { measuredRow } from './redLineLog.js';

const SLIP = 'Costs one day, not the month.';
const longDate = key => keyToDate(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const clock = ms => { const d = new Date(ms); return fromMin(d.getHours() * 60 + d.getMinutes()); };
const occById = (state, occId) => occurrencesOn(state, occId.slice(-10)).find(o => o.occId === occId);
const setIn = (s, key, date, id, value) => ({ ...s, [key]: { ...s[key], [date]: { ...s[key][date], [id]: value } } });

// ---- Timer (one at a time; elapsed always comes from the stored start)
export const startTimer = (app, occId) => app.set(s => ({ ...s, timer: { occId, startedAt: Date.now() } }));
export const cancelTimer = app => app.set(s => ({ ...s, timer: null }));
export function finishTimer(app) {
  const t = app.state.timer;
  if (!t) return;
  app.set(s => {
    const occ = occById(s, t.occId);
    // Adds to the stored total, so time logged while the timer ran is kept.
    return { ...(occ ? completeOcc(s, occ, (occ.actualMin ?? 0) + elapsedMin(t.startedAt, Date.now())) : s), timer: null };
  });
}

// Running-timer clock: one interval updating two text nodes, never a re-render. It stops when the
// view is replaced or the page is hidden; the app re-renders on return, which restarts it from startedAt.
let ticker = null;
const stopTicker = () => { clearInterval(ticker); ticker = null; };
globalThis.document?.addEventListener('visibilitychange', () => { if (document.hidden) stopTicker(); });

// Announce only when the Now state changes (block starts/ends), never on the 30 s tick.
let live = null, lastNowKey = null;
function announce(key, text) {
  live ??= document.body.appendChild(h('p', { class: 'visually-hidden', 'aria-live': 'polite' }));
  if (lastNowKey !== null && key !== lastNowKey) live.textContent = text;
  lastNowKey = key;
}

export function renderToday(app) {
  stopTicker();
  const today = app.today(), date = app.viewDate(), isToday = date === today;
  const occs = occurrencesOn(app.state, date);
  const now = new Date();
  const nn = nowNext(occs, isToday ? now.getHours() * 60 + now.getMinutes() : 1440);
  const missed = new Set(nn.missed.map(o => o.occId));
  return h('section', null,
    h('h1', { class: 'large-title' }, 'Today'),
    switcher(app, date, today),
    !isToday && h('div', { class: 'banner' },
      h('p', { class: 'headline' }, `Editing ${shortDate(date)}`),
      h('button', { type: 'button', class: 'btn btn-text', id: 'back-today', onClick: () => app.setViewDate(null) }, 'Back to Today')),
    isToday && nowCard(app, occs, nn, today),
    (occs.length > 0 || !isToday) && [
      h('h2', { class: 'section-header footnote' }, 'Blocks'),
      h('div', { class: 'group rail' }, occs.length
        ? occs.map(o => blockRow(app, o, { missed: missed.has(o.occId), canLog: true }))
        : h('div', { class: 'row' }, h('p', { class: 'row-main subhead' }, 'Nothing was planned.')))],
    goals(app, date),
    redLines(app, date));
}

function switcher(app, date, today) {
  const go = key => app.setViewDate(key >= today ? null : key); // null follows "today" across midnight
  return h('div', { class: 'date-switcher' },
    h('button', { type: 'button', class: 'icon-btn', id: 'day-prev', 'aria-label': 'Previous Day', onClick: () => go(addDays(date, -1)) }, icon('chevronLeft')),
    h('p', { class: 'headline date-label' }, longDate(date)),
    h('button', { type: 'button', class: 'icon-btn', id: 'day-next', 'aria-label': 'Next Day', disabled: date >= today, onClick: () => go(addDays(date, 1)) }, icon('chevronRight')),
    h('button', { type: 'button', class: 'btn btn-text', id: 'day-today', disabled: date === today, onClick: () => go(today) }, 'Today'));
}

const tagIcon = tag => (TAGS.find(t => t[0] === tag) ?? TAGS[4])[1];
const label = (state, tag) => h('p', { class: 'card-label footnote' }, h('span', { class: 'tag-icon' }, icon(tagIcon(tag))), tagName(state, tag));
const primary = (text, onClick, id) => h('button', { type: 'button', class: 'btn btn-primary', id, onClick }, text);

function nowCard(app, occs, nn, today) {
  const s = app.state;
  const running = s.timer && occById(s, s.timer.occId);
  let key, say, card;
  if (running) {
    const { startedAt } = s.timer, endMs = keyToDate(running.date).setHours(0, toMin(running.end));
    const elapsed = h('span', { role: 'timer', 'aria-label': 'Elapsed' }), left = h('span', { role: 'timer' });
    const paint = () => { const now = Date.now(); elapsed.textContent = formatClock(now - startedAt); left.textContent = formatClock(endMs - now); };
    paint();
    if (!document.hidden) ticker = setInterval(() => (document.hidden || !elapsed.isConnected ? stopTicker() : paint()), 1000);
    [key, say] = [`timer:${running.occId}`, `Timer running for ${running.title}`];
    card = h('div', { class: `card now-card g-${running.tag}` }, label(s, running.tag),
      h('p', { class: 'title3' }, running.title),
      h('p', { class: 'subhead' }, `Started ${clock(startedAt)} · planned ${running.plannedMin} min`),
      h('p', { class: 'title1 clock' }, elapsed),
      h('p', { class: 'subhead clock' }, 'Left in block: ', left),
      h('div', { class: 'card-actions' }, primary('Finish', () => finishTimer(app), 'now-action'),
        h('button', { type: 'button', class: 'btn btn-text', onClick: () => cancelTimer(app) }, 'Cancel Timer')));
  } else if (nn.current) {
    const o = nn.current, spent = o.plannedMin - nn.minsLeft;
    [key, say] = [`cur:${o.occId}`, `Now: ${o.title}, ${nn.minsLeft} minutes left`];
    card = h('div', { class: `card now-card g-${o.tag}` }, label(s, o.tag),
      h('p', { class: 'title3' }, o.title),
      o.desc && h('p', { class: 'subhead now-desc' }, o.desc),
      h('p', { class: 'subhead' }, `${o.start}–${o.end}`),
      h('p', { class: 'now-hero' }, h('span', { class: 'hero-num' }, String(nn.minsLeft)), ' min left'),
      h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Block progress', 'aria-valuemin': '0', 'aria-valuemax': String(o.plannedMin),
        'aria-valuenow': String(spent), 'aria-valuetext': `${nn.minsLeft} min left` }, h('span', { style: `--p:${(100 * spent) / o.plannedMin}%` })),
      h('div', { class: 'card-actions' }, primary('Start', () => startTimer(app, o.occId), 'now-action')));
  } else if (nn.next) {
    const o = nn.next;
    [key, say] = [`free:${o.occId}`, `Free until ${o.start}`];
    card = h('div', { class: 'card now-card now-free' },
      h('p', { class: 'title3' }, `Free until ${o.start}`),
      h('p', { class: 'subhead' }, h('span', { class: `tag-icon g-${o.tag}` }, icon(tagIcon(o.tag))), `Next: ${o.title}, ${o.start}–${o.end}`),
      h('div', { class: 'card-actions' }, primary('Start Now', () => startTimer(app, o.occId), 'now-action')));
  } else if (occs.length) {
    [key, say] = ['done', 'No more blocks today'];
    card = h('div', { class: 'card now-card now-free' }, h('p', { class: 'title3' }, 'No more blocks today.'),
      h('div', { class: 'card-actions' }, h('button', { type: 'button', class: 'btn btn-text', onClick: () => openBlockSheet(app, { mode: 'new', date: today }) }, 'Add Block')));
  } else {
    const yesterday = addDays(today, -1);
    const canCopy = occurrencesOn(s, yesterday).some(o => !o.movedTo);
    [key, say] = ['empty', 'Nothing planned'];
    card = h('div', { class: 'card now-card now-free' }, h('p', { class: 'title3' }, 'Nothing planned.'),
      h('div', { class: 'card-actions' },
        primary('Add Block', () => openBlockSheet(app, { mode: 'new', date: today }), 'now-action'),
        h('button', { type: 'button', class: 'btn btn-text', id: 'copy-yesterday', disabled: !canCopy,
          onClick: () => app.set(st => copyDay(st, yesterday, today, uid)) }, "Copy Yesterday's Plan")));
  }
  announce(key, say);
  return [card, nn.missed.length > 0 && !running && [
    h('h2', { class: 'section-header footnote' }, 'Missed'),
    h('div', { class: 'group' }, nn.missed.map(o => h('div', { class: 'row' },
      h('div', { class: 'row-main' }, h('p', { class: 'block-title' }, o.title), h('p', { class: 'subhead' }, `${o.start}–${o.end}`)),
      h('button', { type: 'button', class: 'btn btn-text', 'aria-label': `Move ${o.title}`, onClick: () => openBlockSheet(app, { mode: 'move', occ: o }) }, 'Move'))))]];
}

const badge = g => h('span', { class: 'badge' }, icon(g.icon));
const checkBtn = (pressed, name, onClick, locked = false) => h('button', { type: 'button', class: 'done-toggle', 'aria-pressed': String(pressed),
  'aria-label': name, 'aria-disabled': locked ? 'true' : null, id: `chk-${name.replace(/\W/g, '')}`, onClick: locked ? null : onClick }, icon('check'));
const bar = (g, done, target) => h('div', { class: 'bar goal-bar', role: 'progressbar', 'aria-label': `${g.name} progress`,
  'aria-valuemin': '0', 'aria-valuemax': String(target), 'aria-valuenow': String(Math.min(done, target)) },
  h('span', { style: `--p:${Math.min(100, (100 * done) / (target || 1))}%` }));

function stepper(app, g, date) {
  const n = app.state.counts[date]?.[g.id] ?? 0, what = g.weeklyCount.label.toLowerCase();
  const set = v => app.set(s => setIn(s, 'counts', date, g.id, v));
  return h('div', { class: 'stepper', role: 'group', 'aria-label': `${g.weeklyCount.label} on this day: ${n}` },
    h('button', { type: 'button', class: 'icon-btn', id: `minus-${g.id}`, 'aria-label': `Fewer ${what}`, disabled: n === 0, onClick: () => set(n - 1) }, icon('minus')),
    h('span', { class: 'stepper-value', 'aria-hidden': 'true' }, String(n)),
    h('button', { type: 'button', class: 'icon-btn', id: `plus-${g.id}`, 'aria-label': `More ${what}`, onClick: () => set(n + 1) }, icon('plus')));
}

function goals(app, date) {
  const s = app.state, status = dayStatus(s, date), week = weekSummary(s, date), unsorted = unsortedMinutes(s, date);
  const rows = [status !== 'empty' && h('div', { class: 'row status-row' },
    h('span', { class: `status-icon ${status}` }, icon(status === 'won' ? 'check' : 'partial')),
    h('p', { class: 'headline' }, status === 'won' ? 'Won' : 'Partial'))];
  for (const g of s.goals) {
    const weekText = g.weeklyCount && `${week[g.id].done} of ${week[g.id].target} this week`;
    const inlineStepper = g.weeklyCount && !g.minutes && !g.checks.length;
    let text = weekText, trailing = inlineStepper && stepper(app, g, date), progress = g.weeklyCount && bar(g, week[g.id].done, week[g.id].target);
    if (g.minutes) {
      const min = g.minutes[isWeekend(date) ? 'weekend' : 'weekday'], done = goalMinutes(s, date, g.id), computed = done >= min;
      text = `${done} / ${min} min`;
      trailing = checkBtn(computed || !!s.manualMet[date]?.[g.id], `${g.name} met`,
        () => app.set(st => setIn(st, 'manualMet', date, g.id, !st.manualMet[date]?.[g.id])), computed);
      progress = bar(g, done, min);
    }
    rows.push(h('div', { class: `goal g-${g.id}` },
      h('div', { class: 'row goal-row' }, badge(g),
        h('div', { class: 'row-main' }, h('p', { class: 'goal-name' }, g.name), text && h('p', { class: 'subhead' }, text)), trailing),
      g.checks.map(c => h('div', { class: 'row sub-row' }, h('p', { class: 'row-main' }, c.label),
        checkBtn(!!s.checks[date]?.[c.id], c.label, () => app.set(st => setIn(st, 'checks', date, c.id, !st.checks[date]?.[c.id]))))),
      g.weeklyCount && !inlineStepper && h('div', { class: 'row sub-row' }, h('p', { class: 'row-main' }, g.weeklyCount.label), stepper(app, g, date)),
      progress));
  }
  if (unsorted > 0) rows.push(h('div', { class: 'row g-unsorted' }, h('span', { class: 'badge' }, icon('tray')),
    h('p', { class: 'row-main goal-name' }, 'Unsorted'), h('p', { class: 'subhead' }, `${unsorted} min`)));
  return [h('h2', { class: 'section-header footnote' }, 'Goals'), h('div', { class: 'group' }, rows)];
}

function redLines(app, date) {
  const s = app.state, day = s.red[date] ?? {};
  const header = h('h2', { class: 'section-header footnote' }, 'Red lines');
  if (!s.redLines.length) return [header, h('div', { class: 'group' }, h('div', { class: 'row' },
    h('p', { class: 'row-main subhead' }, 'None set yet.'),
    h('button', { type: 'button', class: 'btn btn-text', onClick: () => { location.hash = 'settings'; } }, 'Add your red lines')))];
  const mark = (id, v) => app.set(st => setIn(st, 'red', date, id, (st.red[date] ?? {})[id] === v ? undefined : v));
  return [header,
    h('div', { class: 'group' }, s.redLines.map(l => l.limit !== undefined ? measuredRow(app, l, date) : h('div', { class: 'row red-row' }, h('p', { class: 'row-main' }, l.name),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': l.name }, [['held', 'Held'], ['slipped', 'Slipped']].map(([v, text]) =>
        h('button', { type: 'button', role: 'radio', class: `seg-${v}`, id: `red-${l.id}-${v}`, 'aria-checked': String(day[l.id] === v), onClick: () => mark(l.id, v) }, text)))))),
    s.redLines.some(l => day[l.id] && redStatus(day[l.id]) === 'slipped') && h('p', { class: 'footnote section-footer slip' }, icon('xmark'), SLIP)];
}
