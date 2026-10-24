// Recovery Protocol screen (plan Task 17): file the autopsy of a Reset day, or read it once filed. Board: static/Recovery.html.
// The draft lives here, keyed by date (never in app.state), so chip taps and the 30 s tick rebuild the form from it.
// Typing updates the gate and the vague nudges in place (no re-render: keeps focus and the keyboard). Text nodes only via h().
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { dayNo } from '../core/challenge.js';
import { checkVague, fileAutopsy } from '../core/recovery.js';
import { pushedHeader, plate, question, sectionHeading, rerender } from '../ui/chrome.js';
import { chips, goldButton, helpButton } from '../ui/controls.js';
import { STATES, PLACES, recoveryRoute, newDraft, effects, countdown, canFile, autopsyForm, errorText } from './recoveryLogic.js';

const drafts = {};
const QUOTE = 'A man who resets and recovers properly is more dangerous than one who was never tested.';
const Q = { state: 'What state were you in?', time: 'What time was it?', place: 'Where were you?',
  decision: 'The first small decision that opened the door', change: 'One concrete change that breaks the chain' };
const opts = values => values.map(v => ({ value: v, label: v }));
const heading = t => Object.assign(sectionHeading(t), { className: 'sec rc-sec' });
// Board header: the shared pushed header with the title in crimson.
function header() {
  const el = pushedHeader({ title: 'Recovery Protocol', onBack: () => history.back(), help: 'recoveryProtocol' });
  el.querySelector('.eyebrow').className = 'eyebrow rc-ttl';
  return el;
}

function resetPlate(state, date) {
  return Object.assign(plate.warn(
    h('div', { class: 'rc-hd' }, icon('resetShield'), h('h2', { class: 'rc-day' }, `DAY ${dayNo(state, date)}: RESET`)),
    h('p', { class: 'rc-quote' }, QUOTE),
    h('div', { class: 'rc-fx' }, effects(state, date).map(t => h('span', null, t)))), { className: 'plate warn rc-top' });
}

function countdownPlate(state, date) {
  const c = countdown(state, date, Date.now());
  return h('div', { class: 'plate rc-cd' },
    h('div', { class: 'rc-cdr' }, h('div', { class: 'hlp-row' }, h('span', { class: 'eyebrow' }, 'File within 24 hours'), helpButton('recovery')),
      h('span', { id: 'rc-left', class: c.overdue ? 'rc-left over' : 'rc-left' }, c.label)),
    h('div', { class: 'rc-bar', 'aria-hidden': 'true' },
      h('i', { class: c.overdue ? 'over' : null, style: `width:${Math.round(c.fill * 100)}%` })));
}

// Filed: the five stored answers, no form.
function readOnly(state, date) {
  const r = state.recovery[date];
  return [
    header(),
    resetPlate(state, date),
    heading('Your autopsy'),
    ...Object.keys(Q).map((k, i) => question(i + 1, Q[k], null, h('p', { class: 'rc-ans' }, r[k]))),
  ];
}

// Textarea with the core's vague nudge: hidden until its first blur, then live.
function vagueField(id, key, d, refreshGate) {
  const nudge = h('div', { id: `${id}-nudge`, class: 'rc-nudge', 'aria-live': 'polite' });
  const ta = h('textarea', { id, class: 'ta', 'aria-describedby': `${id}-nudge`,
    onInput: e => { d[key] = e.target.value; refresh(); refreshGate(); },
    onBlur: () => { d.touched[key] = true; refresh(); } }, d[key]);
  function refresh() {
    const msg = d.touched[key] ? checkVague(d[key]) : null;
    ta.className = msg ? 'ta bad' : 'ta';
    nudge.replaceChildren(...(msg ? [icon('warn'), msg] : []));
  }
  refresh();
  return [ta, nudge];
}

export function renderRecovery(app, [date] = []) {
  const { state } = app;
  const route = recoveryRoute(state, date);
  if (route === 'redirect') { app.redirect('#today'); return []; }
  if (route === 'filed') return readOnly(state, date);
  const d = drafts[date] ??= newDraft(state, date);
  const tap = key => v => { d[key] = d[key] === v ? '' : v; rerender(); };

  const file = () => {
    if (drafts[date] !== d) return; // second tap: already filed
    const r = fileAutopsy(app.state, date, autopsyForm(d), Date.now());
    if (!r.ok) { d.error = r.error; rerender(); return; }
    delete drafts[date];
    app.set(() => r.state);
    app.nav(`#warlog/autopsy-${date}`);
  };
  const btn = goldButton('File the autopsy', file, { disabled: !canFile(d) });
  btn.id = 'rc-file';
  const refreshGate = () => { btn.disabled = !canFile(d); };
  const time = h('input', { id: 'rc-time', class: 'in rc-time', type: 'text', value: d.time,
    onInput: e => { d.time = e.target.value; refreshGate(); } });

  return [
    header(),
    resetPlate(state, date),
    countdownPlate(state, date),
    heading('File your autopsy'),
    question(1, Q.state, null, chips({ options: opts(STATES), value: d.state, onPick: tap('state') })),
    question(2, Q.time, 'rc-time', time),
    question(3, Q.place, null, chips({ options: opts(PLACES), value: d.place, onPick: tap('place') })),
    question(4, Q.decision, 'rc-decision', h('p', { class: 'rc-hint' }, 'Not "I was weak." The exact sequence.'),
      h('textarea', { id: 'rc-decision', class: 'ta', onInput: e => { d.decision = e.target.value; refreshGate(); } }, d.decision)),
    question(5, [Q.change, 'change'], 'rc-change', vagueField('rc-change', 'change', d, refreshGate)),
    h('div', { class: 'ci-go' }, btn, d.error && h('p', { class: 'form-error', role: 'alert' }, errorText(d.error))),
    h('p', { class: 'rc-foot' }, `Your autopsy and fix go into the War Log under Day ${dayNo(state, date)}.`),
  ];
}
