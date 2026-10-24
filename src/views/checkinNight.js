// Night check-in (plan Task 16): settle tasks, protocols, red lines, Top G win, Bottom G move, suggested result, Close the day.
// Sections follow reference/CheckIn.png. The draft lives here, keyed by date (never in app.state), so the 30 s tick re-render
// rebuilds the form from it. Logic is checkinNightLogic.js. Text nodes only via h().
import { h } from '../dom.js';
import { dayNo } from '../core/challenge.js';
import { closeNight, nightTargets, NIGHT_TEXT } from '../core/scoring.js';
import { openTasks } from '../core/tasks.js';
import { tacticsFor } from '../core/pack.js';
import { openActionSheet } from '../sheet.js';
import { pushedHeader, sectionHeading, rerender } from '../ui/chrome.js';
import { segmented, chips, goldButton, helpButton } from '../ui/controls.js';
import { ARCHETYPES, NIGHT_ERRORS, newDraft, nightRoute, medIds, liveSuggestion, overrideOptions, canClose, nightForm }
  from './checkinNightLogic.js';

const drafts = {};
const cap = s => s[0].toUpperCase() + s.slice(1);
const opts = (values, labels = values.map(cap)) => values.map((value, i) => ({ value, label: labels[i] }));
const TASK = opts(['done', 'failed', 'stalled']);
const PROTOCOL = opts(['held', 'missed']);
const RED = opts(['held', 'crossed'], ['I held the line', 'I crossed it']);
const OTHER = {}; // the Something else chip's value: never equal to a pack tactic name
const STALLED = 'Genuinely couldn\'t act on this today. Won\'t count for or against you.';

// Board section: sword heading, optional helper line (.t2), then the body.
// title may be [text, help] (H1b)
const section = (title, helper, ...body) => h('section', { class: 'nt-sec' }, sectionHeading(...[].concat(title)),
  helper && h('p', { class: 't2 nt-help' }, helper), body);
// Board .q row: the title (and extras) above its segmented control, in one element.
const q = (title, extra, control, ...after) => h('div', { class: 'q' }, h('div', { class: 'h' }, h('b', null, title), extra), control, after);
const area = (id, d, key, onInput) => h('textarea', { id, class: 'ta', onInput: e => { d[key] = e.target.value; onInput?.(); } }, d[key]);
// Choice tap: update the draft, then re-render from it.
const tap = fn => v => { fn(v); rerender(); };

function tasksSection(state, date, d) {
  const open = openTasks(state, date);
  if (!open.length) return null;
  return section(['Settle your tasks', 'tasks'], 'Anything still open has to be resolved before you can close the day.',
    h('div', { class: 'plate list nt-tasks' }, open.map(({ task }) =>
      q(task.title, task.start ? h('span', { class: 't3' }, task.start) : null,
        segmented({ options: TASK, value: d.tasks[task.id] ?? null, onPick: tap(v => { d.tasks[task.id] = v; }) }),
        h('p', { class: 's' }, STALLED)))));
}

function protocolsSection(state, date, d) {
  const med = medIds(state, date);
  return section(['Protocols', 'nightProtocols'], null, h('div', { class: 'plate list' }, state.challenge.protocols.map(p => (med.includes(p.id)
    ? q(p.title, null, h('p', { class: 'nt-med' }, 'MED (declared this morning)'))
    : q(p.title, null, segmented({ options: PROTOCOL, value: d.protocols[p.id] ?? null, onPick: tap(v => { d.protocols[p.id] = v; }) }))))));
}

function redLinesSection(state, d) {
  const lines = state.challenge.redLines;
  const anyCrossed = lines.some(r => d.redLines[r.id] === 'crossed');
  return section(['Red lines', 'nightRedLines'], 'Be exact. A crossed line is a Reset by itself.',
    h('div', { class: `plate list nt-red${anyCrossed ? ' warn' : ''}` }, lines.map(r =>
      q(r.name, null, segmented({ options: RED, value: d.redLines[r.id] ?? null, onPick: tap(v => { d.redLines[r.id] = v; }) }),
        d.redLines[r.id] === 'crossed' && h('p', { class: 's nt-reset' }, 'This is a Reset.')))));
}

function bottomGSection(state, d) {
  const tactics = d.archetype ? tacticsFor(state, d.archetype) : [];
  const pickArchetype = tap(v => { Object.assign(d, { archetype: d.archetype === v ? '' : v, tactic: '', other: false, text: '' }); });
  const tacticOpts = [...tactics.map(t => ({ value: t.name, label: t.name })), { value: OTHER, label: 'Something else' }];
  const pickTactic = tap(v => {
    const other = v === OTHER;
    Object.assign(d, other ? { other: !d.other, tactic: '' } : { other: false, tactic: d.tactic === v ? '' : v });
  });
  const showText = d.archetype && (d.other || !tactics.length);
  return section(['The Bottom G\'s move', 'bottomMove'], 'Which tactic did your enemy use? Optional on a clean day.',
    chips({ options: opts(ARCHETYPES), value: d.archetype, onPick: pickArchetype }),
    tactics.length > 0 && chips({ options: tacticOpts, value: d.other ? OTHER : d.tactic, onPick: pickTactic }),
    showText && h('textarea', { id: 'ci-other', class: 'ta', 'aria-label': 'Something else, in your own words',
      onInput: e => { d.text = e.target.value; } }, d.text));
}

function resultSection(state, date, d, refreshGate) {
  const { result, reasons } = liveSuggestion(state, date, d);
  const crossed = state.challenge.redLines.some(r => d.redLines[r.id] === 'crossed');
  const toggle = h('button', { type: 'button', class: 'btn btn-text', onClick: () => { d.overrideOpen = !d.overrideOpen; rerender(); } },
    d.overrideOpen ? 'Cancel override' : 'Override');
  return h('div', { class: 'plate rim nt-res' },
    h('div', { class: 'hlp-row' }, h('p', { class: 'eyebrow' }, 'Suggested result'), helpButton('result')),
    h('p', { class: 'nt-word' }, cap(result)),
    reasons.map(r => h('p', { class: 't2' }, r)),
    toggle,
    d.overrideOpen && h('div', { class: 'nt-ovr' },
      crossed && h('p', { class: 't2' }, NIGHT_TEXT['red-line-override']),
      chips({ options: opts(overrideOptions(state, d)), value: d.overrideResult, onPick: tap(v => { d.overrideResult = v; }) }),
      h('label', { class: 't2 nt-lbl', for: 'ci-reason' }, 'Reason'),
      area('ci-reason', d, 'reason', refreshGate)));
}

function yesterdayOpen(state, date, href) {
  return [
    pushedHeader({ title: `Night · Day ${dayNo(state, date)}`, onBack: () => history.back() }),
    h('div', { class: 'ci-go' }, h('p', { class: 't2' }, NIGHT_TEXT['yesterday-open']),
      h('a', { href, class: 'btn-ghost' }, 'Close yesterday')),
  ];
}

export function renderNight(app, [date] = []) {
  const { state } = app;
  const route = nightRoute(state, date, Date.now());
  if (route.kind === 'redirect') { app.redirect('#today'); return []; }
  if (route.kind === 'yesterday-open') return yesterdayOpen(state, date, route.href);
  const d = drafts[date] ??= newDraft();

  const confirm = () => {
    if (drafts[date] !== d) return; // stale sheet or second tap: already filed
    if (!nightTargets(app.state, Date.now()).includes(date)) return rerender(); // grace over: never file
    const r = closeNight(app.state, date, nightForm(app.state, date, d), Date.now());
    if (!r.ok) { d.error = r.error; rerender(); return; }
    delete drafts[date];
    app.set(() => r.state);
    app.nav(r.state.days[date].result === 'reset' ? `#recovery/${date}` : '#today');
  };
  // Blur first (iOS keeps a textarea focused on a button tap): the sheet would record it as its opener and refocus it
  // before confirm runs, and app.js's R8 guard would then skip the post-save render.
  const close = goldButton('Close the day', () => {
    const a = document.activeElement;
    if (a?.tagName === 'TEXTAREA') a.blur();
    openActionSheet([{ label: 'Close the day', destructive: true, onSelect: confirm }], { message: 'This is final.', cancel: 'Keep editing' });
  }, { disabled: !canClose(state, date, d) });
  close.id = 'ci-closeday';
  // Typing the Reason re-renders nothing (keeps focus and the keyboard): update the gate in place.
  const refreshGate = () => { close.disabled = !canClose(app.state, date, d); };

  return [
    pushedHeader({ title: `Night · Day ${dayNo(state, date)}`, onBack: () => history.back(), help: 'autoRedo' }),
    tasksSection(state, date, d),
    protocolsSection(state, date, d),
    redLinesSection(state, d),
    section(['Today\'s Top G win', 'topWin'], null, h('label', { class: 't2 nt-lbl', for: 'ci-win' }, 'One sentence'), area('ci-win', d, 'win')),
    bottomGSection(state, d),
    section(['Slipped without knowing?', 'slip'], null, h('label', { class: 't2 nt-lbl', for: 'ci-slip' }, 'Optional.'), area('ci-slip', d, 'slipNote')),
    resultSection(state, date, d, refreshGate),
    h('div', { class: 'ci-go' }, close, d.error && h('p', { class: 'form-error', role: 'alert' }, NIGHT_ERRORS[d.error] ?? d.error)),
  ].filter(Boolean);
}
