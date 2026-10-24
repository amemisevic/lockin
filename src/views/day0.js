// Day 0 (plan Task 13 step 1, rulings R2-R5): shown while there is no challenge. Layout = static/Onboarding.html.
// Lists come only from setupLists (state.setup, edited in Settings); the rows go to Settings.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { screenTitle, eyebrow, sectionHeading } from '../ui/chrome.js';
import { goldButton, shieldSvg, helpButton } from '../ui/controls.js';
import { CHALLENGE_LENGTH, setupLists, beginStatus, begin, oathRows } from './challengeLogic.js';

// R2: the board's outline laurel = the gold laurel without gradients and veins; screens.css strokes every part.
function outlineLaurel() {
  const svg = icon('laurel');
  svg.querySelector('defs')?.remove();
  svg.querySelector('g[stroke-opacity]')?.remove();
  svg.setAttribute('class', 'ch-d0l');
  return svg;
}

// R4: done = gold shield + lambda, empty = outline shield (shape differs, not colour only).
const oathGlyph = done => h('div', { class: done ? 'ch-sh on' : 'ch-sh', 'aria-hidden': 'true' },
  shieldSvg([22, 25], done ? ['b', 'hl', 'lam'] : ['b']));

// H1d: one "?" per row, beside the link (a button inside an <a> is invalid).
const OATH_HELP = { contract: 'contract', funeral: 'funeral', code: 'code', 'redlines-w1': 'redLines1' };
const oathRow = r => h('div', { class: 'ch-or' },
  h('a', { href: r.href, id: `ch-oath-${r.key}`, class: 'st ch-row' }, oathGlyph(r.done),
    h('div', null, h('b', null, r.title), h('span', null, r.done ? 'Written' : 'Not written yet'))),
  helpButton(OATH_HELP[r.key]));

const listRow = (id, title, items, help) => h('div', { class: 'ch-or' }, h('a', { href: '#settings', id, class: 'st ch-row' },
  h('div', null, h('b', null, title), h('span', null, items.length ? `${items.length} added` : 'None yet'))), helpButton(help));

export function renderDay0(app) {
  const { state } = app;
  const today = app.today();
  const lists = setupLists(state);
  const status = beginStatus(state, today, lists);
  const btn = goldButton('Begin Day 1', () => {
    const r = begin(app.state, app.today(), setupLists(app.state));
    if (r.ok) app.set(() => r.state);
  }, { disabled: !status.enabled });
  btn.id = 'ch-begin';
  btn.classList.add('ch-wide');
  if (status.reason) btn.setAttribute('aria-describedby', 'ch-why');
  const of = `of ${CHALLENGE_LENGTH}`;

  return [
    h('div', null, eyebrow('PM Challenge · before Day 1'), screenTitle('Challenge')),
    h('div', { class: 'plate rim ch-hero' },
      h('div', { class: 'ch-lw' }, outlineLaurel(),
        h('div', { class: 'ch-num', role: 'img', 'aria-label': `Day 0 ${of}` },
          h('div', { class: 'ch-day', 'aria-hidden': 'true' }, 'DAY'),
          h('div', { class: 'ch-n ch-d0n', 'aria-hidden': 'true' }, '0'),
          h('div', { class: 't2 ch-of', 'aria-hidden': 'true' }, of))),
      h('div', { class: 'ch-bw' }, btn, helpButton('begin')),
      h('p', { class: 't2 ch-why', id: 'ch-why', 'aria-live': 'polite' }, status.reason ?? '')),
    h('section', null,
      h('div', { class: 'tk-sh' }, sectionHeading('Day 1, your oath')),
      h('div', { class: 'plate list' }, oathRows(state).map(oathRow))),
    h('div', { class: 'plate list ch-setup' },
      listRow('ch-protocols', 'Protocols', lists.protocols, 'addProtocols'),
      listRow('ch-redlines', 'Red lines', lists.redLines, 'addRedLines')),
  ];
}
