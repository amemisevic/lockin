// Gym Stats (gym plan G11 Stats), a pushed route #gym/stats: visits per week (with the target) and per month, sets per muscle this
// week, and the estimated 1RM of one exercise over time with its PRs. Read-only; model in gymStatsLogic.js, charts in gymStatsCharts.js.
// No timers: the app has no live timers. The picked exercise is view state, not saved.
import { h } from '../dom.js';
import { pushedHeader, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData, retryExerciseData } from './gymData.js';
import { statsModel } from './gymStatsLogic.js';
import { barChart, shareRow, lineChart } from './gymStatsCharts.js';

const view = { picked: null };
export const resetStatsView = () => { view.picked = null; };

const section = (title, ...body) => h('section', { class: 'an-sec' }, sectionHeading(title), plate(body));
const none = text => h('p', { class: 't2 an-empty' }, text);

export function renderGymStats(app, { data = exerciseData(), load = ensureExerciseData, failed = exerciseDataFailed(), retry = retryExerciseData } = {}) {
  const header = pushedHeader({ title: 'Stats', onBack: () => history.back() });
  const settled = !!data || failed;
  const m = statsModel(data, app.gym, app.today(), { picked: view.picked, settled });
  if (m.empty) return [header, h('p', { class: 'tk-empty' }, 'No workouts yet')];
  if (!settled) load(rerender);

  const muscles = m.muscles
    ? (m.muscles.length ? m.muscles.map(shareRow) : none('No sets this week yet'))
    : failed
      ? [none('The exercise list could not be loaded.'), h('button', { type: 'button', class: 'btn-ghost gm-retry', onClick: () => retry(rerender) }, 'Try again')]
      : none('Loading exercises…');

  const e = m.exercise;
  const pick = e && [
    h('label', { class: 't2', for: 'gs-ex' }, 'Exercise'),
    h('select', { id: 'gs-ex', class: 'in gs-sel', onChange: ev => { view.picked = ev.target.value; rerender(); } },
      e.options.map(o => h('option', { value: o.id, selected: o.id === e.id }, o.name))),
  ];
  const prs = e && e.prs.length ? h('ul', { class: 'gs-prs' }, e.prs.map(p => h('li', null, p.text))) : null;
  const oneRm = e
    ? [pick, lineChart(e), e.note && h('p', { class: 't2 gs-note' }, e.note),
      h('div', { class: 'an-tiles gs-tiles' }, e.tiles.map(([l, n]) => h('div', { class: 'an-tile' }, h('div', { class: 'an-n' }, n), h('div', { class: 'an-l' }, l)))), prs]
    : none('No sets to chart yet. Log a done working set of 1 to 10 reps with a weight.');

  return [
    header,
    section('Visits per week', h('p', { class: 't2 gs-tg' }, `Target ${m.weeks.target} a week`), barChart(m.weeks)),
    section('Visits per month', barChart(m.months)),
    section('Sets per muscle this week', muscles),
    section('Estimated 1RM', oneRm),
  ];
}
