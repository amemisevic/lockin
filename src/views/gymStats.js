// Gym Stats (gym plan G11 Stats), a pushed route #gym/stats: visits per week (with the target) and per month, sets per muscle this
// week, and the weight progress of one exercise over all its workouts. Read-only; model in gymStatsLogic.js, charts in gymStatsCharts.js.
// No timers: the app has no live timers. The picked exercise is view state, not saved.
import { h } from '../dom.js';
import { pushedHeader, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData, retryExerciseData } from './gymData.js';
import { statsModel } from './gymStatsLogic.js';
import { barChart, shareRow, weightChart } from './gymStatsCharts.js';

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

  const e = m.weight;
  const weightBlock = e
    ? [h('label', { class: 't2', for: 'gs-ex' }, 'Exercise'),
      h('select', { id: 'gs-ex', class: 'in gs-sel', onChange: ev => { view.picked = ev.target.value; rerender(); } },
        h('option', { value: '', selected: e.id === null }, 'Choose an exercise'),
        e.options.map(o => h('option', { value: o.id, selected: o.id === e.id }, o.name))),
      ...(e.id === null ? [none('Pick an exercise to see your weight progress.')] : [
        h('p', { class: 'gs-sum' }, e.summary), h('p', { class: 't2 gs-dates' }, e.dates), weightChart(e),
        e.wide && h('p', { class: 't2 gs-hint' }, `Swipe the chart sideways to see all ${e.points.length} workouts.`),
        h('ul', { class: 'gs-wl' }, e.rows.map(r => h('li', null, r)))])]
    : none('No sets with a weight yet. Log a done working set with a weight above 0.');

  return [
    header,
    section('Visits per week', h('p', { class: 't2 gs-tg' }, `Target ${m.weeks.target} a week`), barChart(m.weeks)),
    section('Visits per month', barChart(m.months)),
    section('Sets per muscle this week', muscles),
    section('Weight progress', weightBlock),
  ];
}
