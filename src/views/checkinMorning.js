// Morning check-in (plan Task 15 step 1): target, red line at risk, MED switches, Start the day.
// Layout = the Recovery board's numbered .fq questions. The draft lives here, keyed by date (owner decision 1):
// never in app.state, so the 30 s tick re-render rebuilds the form from it. Text nodes only via h().
import { h } from '../dom.js';
import { addDays } from '../logic.js';
import { dayNo, phase, medCheck, medUsedInWeek, submitMorning } from '../core/challenge.js';
import { pendingRecovery } from '../core/recovery.js';
import { pushedHeader, question, rerender } from '../ui/chrome.js';
import { switchControl, goldButton } from '../ui/controls.js';
import { timeLeft } from './todayLogic.js';

const drafts = {};

const field = (id, d, key) => h('textarea', { id, class: 'ta', onInput: e => { d[key] = e.target.value; } }, d[key]);

// core's medError is not exported: the same strings, mapped from medCheck's reason codes.
function medReason(state, today, p, d, used) {
  if (d.med.includes(p.id)) return null; // on: can always be turned off
  const c = medCheck(state, today, p.id);
  if (c.ok) return used >= state.settings.medPerWeek ? 'Weekly limit reached.' : null;
  if (c.reason === 'cap') return 'Weekly limit reached.';
  return state.days[addDays(today, -1)]?.result === 'reset'
    ? 'No MED today. Yesterday was a Reset.' : 'No MED today. Yesterday was a declared Redo.';
}

function medQuestion(state, today, d) {
  const ps = state.challenge.protocols.filter(p => p.med?.trim());
  if (!ps.length) return null;
  const used = medUsedInWeek(state, today) + d.med.length;
  const rows = ps.map(p => {
    const reason = medReason(state, today, p, d, used);
    const sw = switchControl({ on: d.med.includes(p.id), label: p.title, onToggle: () => {
      d.med = d.med.includes(p.id) ? d.med.filter(id => id !== p.id) : [...d.med, p.id];
      rerender();
    } });
    sw.id = `ci-med-${p.id}`;
    if (reason) sw.setAttribute('disabled', '');
    return h('div', { class: 'ci-mr' },
      h('div', { class: 'ci-mt' }, h('b', null, p.title), h('div', { class: 't2' }, p.med), reason && h('div', { class: 't2 ci-why' }, reason)),
      sw);
  });
  return question(3, 'Declare MED', null,
    h('p', { class: 't2 ci-hl' }, `${used} of ${state.settings.medPerWeek} MED used this week`),
    h('div', { class: 'plate list' }, rows));
}

export function renderMorning(app) {
  const { state } = app;
  const today = app.today();
  const day = state.days[today];
  if (phase(state, today) !== 'active' || day?.closedAt != null || day?.result != null || day?.morning) {
    app.redirect('#today');
    return [];
  }
  const d = drafts[today] ??= { target: '', risk: '', med: [], error: null };
  const rec = pendingRecovery(state, Date.now());

  // The error stays until the next tap (simplest; typing does not clear it).
  const start = goldButton('Start the day', () => {
    if (today !== app.today()) return rerender(); // past midnight: never file on the render-time date
    const r = submitMorning(app.state, today, { target: d.target, risk: d.risk, med: d.med }, Date.now());
    if (!r.ok) { d.error = r.error; rerender(); return; }
    delete drafts[today];
    app.set(() => r.state);
    app.nav('#today');
  });
  start.id = 'ci-start';

  return [
    pushedHeader({ title: `Morning · Day ${dayNo(state, today)}`, onBack: () => history.back() }),
    rec && h('a', { href: `#recovery/${rec.date}`, id: 'ci-rec', class: 'plate warn td-link ci-rec' },
      h('div', { class: 'td-chb' }, h('div', { class: 'td-ct' }, 'Recovery due'),
        h('p', { class: 't2 td-cl' }, rec.overdue ? 'Overdue' : timeLeft(rec.msLeft)))),
    question(1, 'Today\'s #1 target', 'ci-target', field('ci-target', d, 'target')),
    question(2, 'Red line at risk today?', 'ci-risk', field('ci-risk', d, 'risk')),
    medQuestion(state, today, d),
    h('div', { class: 'ci-go' }, start,
      d.error && h('p', { class: 'form-error', role: 'alert' }, d.error),
      d.error === 'Close yesterday first.' && h('a', { href: `#checkin/night/${addDays(today, -1)}`, id: 'ci-close', class: 'btn-ghost' }, 'Close yesterday')),
  ].filter(Boolean);
}
