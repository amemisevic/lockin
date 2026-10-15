// Analytics tab (plan Task 18, task-18-rulings R1, R6). Layout = static/Analytics.html; numbers = analyticsLogic.js.
// The range lives in module memory (not state, not storage); a tap re-renders through the shared hashchange.
import { h } from '../dom.js';
import { screenTitle, eyebrow, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { segmented } from '../ui/controls.js';
import { analytics, RANGES, DEFAULT_RANGE } from './analyticsLogic.js';
import { empty, sub, tiles, strip, protocolRows, resetBlock, tacticRows, weekdayCols, heatGrid } from './analyticsParts.js';

let n = DEFAULT_RANGE;

const section = (title, ...body) => h('section', { class: 'an-sec' }, sectionHeading(title), plate(body));
const or = (block, build) => (block ? build(block) : empty());

function overview(o) {
  return tiles(o.label, [['Passed', o.passed], ['Redo', o.redo], ['Reset', o.reset], ['Pass rate', o.rate],
    ['Current streak', o.current], ['Longest streak', o.longest]]);
}

const challenge = c => [
  sub('Day results'), strip(c),
  sub('Protocols'), or(c.protocols, protocolRows),
  sub('What caused the Reset'), or(c.resets, resetBlock),
  sub('Your enemy\'s favorite tactics'), or(c.tactics, tacticRows),
];

const tasks = t => tiles(t.label, [['Done', t.done], ['Failed', t.failed], ['Stalled', t.stalled], ['Open', t.open]]);

export function renderAnalytics(app) {
  const m = analytics(app.state, app.today(), n);
  return [
    eyebrow('Lock In'),
    screenTitle('Analytics'),
    h('div', { class: 'an-range' }, segmented({ options: RANGES, value: n, onPick: v => { n = v; rerender(); } })),
    section('Overview', or(m.overview, overview)),
    section('PM Challenge', or(m.challenge, challenge)),
    section('Habits', sub('By weekday'), or(m.habits.weekdays, weekdayCols), sub('Last 28 days'), or(m.habits.heatmap, heatGrid)),
    section('Tasks', or(m.tasks, tasks)),
  ];
}
