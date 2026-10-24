// Challenge tab (plan Task 13 steps 2-3, rulings R6-R13): active screen and graduation. Layout = static/Challenge.html.
// Date.now() and app.today() are read only in renderChallenge and when the Redo sheet opens / confirms.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openActionSheet } from '../sheet.js';
import { dayNo } from '../core/challenge.js';
import { currentStreak } from '../core/scoring.js';
import { screenTitle, eyebrow, sectionHeading } from '../ui/chrome.js';
import { goldButton, helpButton } from '../ui/controls.js';
import { graduated, stripCells, legend, redoStatus, confirmRedo, redoDeclaredToday, missionInfo, graduation, rateLabel } from './challengeLogic.js';

const LABEL = { passed: 'passed', redo: 'redo', reset: 'reset', today: 'today', open: 'not closed', future: 'upcoming' };
const CELL = { passed: 'dy p', redo: 'dy r', reset: 'dy x', today: 'dy t', open: 'dy', future: 'dy' };

// Redo glyph (new, listed in PROGRESS): counter-clockwise arrow, 2 px round stroke like the control icons.
function redoGlyph() {
  const svg = icon('check');
  const p = svg.querySelector('path');
  p.setAttribute('d', 'M5.6 14.5a7.5 7.5 0 1 0 1.8-7.9L4 10');
  const head = p.cloneNode();
  head.setAttribute('d', 'M4 5v5h5');
  svg.append(head);
  return svg;
}
const GLYPH = { passed: () => icon('check'), reset: () => icon('xmark'), redo: redoGlyph };

// Torch (board streak pill): flame + stand, styled by Today's .td-torch rules (no new colours).
function torch() {
  const svg = icon('plus');
  for (const [k, v] of [['viewBox', '0 0 10 16'], ['width', 9], ['height', 15], ['class', 'td-torch']]) svg.setAttribute(k, v);
  const p = svg.querySelector('path'), stand = p.cloneNode();
  p.setAttribute('d', 'M5 0l2 9H3z');
  stand.setAttribute('d', 'M1 9.5h8M5 9.5V15');
  svg.append(stand);
  return svg;
}

function header(streak) {
  return h('div', { class: 'ch-hd' },
    h('div', null, eyebrow('PM Challenge'), screenTitle('Challenge')),
    streak >= 1 && h('div', { class: 'hlp-row' }, h('div', { class: 'ch-pill' }, torch(), h('span', null, `${streak}-day streak`)), helpButton('streak')));
}

function laurel() {
  const svg = icon('laurel');
  svg.setAttribute('class', 'ch-gl');
  return svg;
}

function dayMark(n, length) {
  const of = `of ${length}`;
  return h('div', { class: 'ch-lw' }, laurel(),
    h('div', { class: 'ch-num', role: 'img', 'aria-label': `Day ${n} ${of}` },
      h('div', { class: 'ch-day', 'aria-hidden': 'true' }, 'DAY'),
      h('div', { class: 'ch-n goldtxt', 'aria-hidden': 'true' }, String(n)),
      h('div', { class: 't2 ch-of', 'aria-hidden': 'true' }, of)));
}

// R8: closed cells show the glyph instead of the number; every cell is labelled.
// Fix round 2 (owner): an open today with a declared Redo gets the bronze ring (.dr); number, result and legend stay.
export const cell = (c, dr) => h('div', { class: dr && c.kind === 'today' ? `${CELL.today} dr` : CELL[c.kind], role: 'img',
  'aria-label': `Day ${c.n}, ${LABEL[c.kind]}${dr && c.kind === 'today' ? ', Redo declared' : ''}` },
  GLYPH[c.kind] ? GLYPH[c.kind]() : h('span', { 'aria-hidden': 'true' }, String(c.n)));

export const legendItem = (kind, label, count) => h('span', { class: 'lg' },
  h('i', { class: CELL[kind], 'aria-hidden': 'true' }, GLYPH[kind]()), `${label} ${count}`);

function hero(state, n, cells, counts, dr) {
  return h('div', { class: 'plate rim ch-hero' }, dayMark(n, state.challenge.length),
    h('div', { class: 'ch-strip' }, cells.map(c => cell(c, dr))),
    h('div', { class: 'ch-lgs' },
      legendItem('passed', 'Passed', counts.passed), legendItem('redo', 'Redo', counts.redo),
      legendItem('reset', 'Reset', counts.reset), helpButton('redoBand')));
}

// title may be [text, help] (H1b)
const secHead = (title, right) => h('div', { class: 'tk-sh' }, sectionHeading(...[].concat(title)), right && h('span', { class: 't2' }, right));

function missionPlate(app, m, hasPack) {
  const warLog = h('button', { type: 'button', id: 'ch-warlog', class: 'btn-ghost', onClick: () => app.nav('#warlog') }, 'War Log');
  let body;
  if (m.mission) {
    const open = goldButton('Open mission', () => app.nav(m.href));
    open.id = 'ch-mission';
    body = [h('div', { class: 'ch-mt' }, m.mission.title), h('p', { class: 'ch-mb' }, m.mission.body),
      h('div', { class: 'ch-acts' }, open, warLog)];
  } else {
    // A pack without this day's mission (or n = 0 before the start) shows only the War Log button.
    body = [!hasPack && h('p', { class: 't2 ch-mb' }, 'Import a pack in Settings'), h('div', { class: 'ch-acts' }, warLog)];
  }
  return h('section', null, secHead('Today\'s mission', m.n >= 1 && `Day ${m.n}`), h('div', { class: 'plate ch-mp' }, body));
}

// R11: today is captured when the sheet opens; confirm re-checks it against Date.now().
function openRedo(app) {
  const today = app.today();
  openActionSheet([{ label: 'Declare Redo', destructive: true, onSelect: () => {
    const r = confirmRedo(app.state, today, Date.now());
    if (r.ok) app.set(() => r.state);
    else openActionSheet([], { message: r.error, cancel: 'OK' });
  } }], { message: 'One per challenge. Declare it before the event, today only. A red line is never covered.' });
}

function redoPlate(app, st) {
  const row = st.kind === 'used'
    // Same id as the Declare button, so app.js restores focus here after a successful Declare.
    ? [h('span', { id: 'ch-redo', tabindex: '-1', class: 'ch-rd-used' }, `Used on Day ${st.day}`)]
    : [h('span', { class: 't2' }, '1 left of 1'),
      h('button', { type: 'button', id: 'ch-redo', class: 'btn ch-rd-btn', disabled: st.kind === 'closed',
        onClick: () => openRedo(app) }, 'Declare')];
  return h('div', { class: 'plate ch-rd' }, eyebrow('Declared Redo'), h('div', { class: 'ch-rdr' }, row));
}

const slots = (title, right, names) => h('section', null, secHead(title, right),
  h('div', { class: 'plate list' }, names.map(name => h('div', { class: 'slot' }, h('div', { class: 'ch-sn' }, name)))));

function graduationPlate(g) {
  const stat = (label, value) => h('div', { class: 'ch-gs' }, h('span', null, label), h('b', null, value));
  return h('div', { class: 'plate rim ch-hero' }, h('div', { class: 'ch-lw' }, laurel()),
    h('div', { class: 'hlp-row hlp-c' }, h('h2', { class: 'ch-gt' }, 'YOU FINISHED'), helpButton('graduation')),
    h('div', { class: 'ch-gss' },
      stat('Passed', String(g.passed)), stat('Redo', String(g.redo)), stat('Reset', String(g.reset)),
      stat('Longest streak', String(g.longest)), stat('Pass rate', rateLabel(g.rate))));
}

export function renderChallenge(app) {
  const { state } = app;
  const today = app.today();
  if (graduated(state, today)) return [header(0), graduationPlate(graduation(state))];
  const n = dayNo(state, today) ?? 0; // phase 'before' (clock moved back): Day 0 (R1)
  return [
    header(currentStreak(state)),
    hero(state, n, stripCells(state, today), legend(state), redoDeclaredToday(state, today)),
    missionPlate(app, missionInfo(state, today), !!state.pack),
    redoPlate(app, redoStatus(state, today)),
    slots(['Protocols', 'protocol'], null, state.challenge.protocols.map(p => p.title)),
    slots('Red lines', 'crossing one = Reset', state.challenge.redLines.map(r => r.name)),
  ];
}
