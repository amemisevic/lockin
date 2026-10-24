// Analytics tab (plan Task 18, task-18-rulings R1, R6). Layout = static/Analytics.html; numbers = analyticsLogic.js.
// The range lives in module memory (not state, not storage); a tap re-renders through the shared hashchange.
import { h } from '../dom.js';
import { screenTitle, eyebrow, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { segmented } from '../ui/controls.js';
import { analytics, RANGES, DEFAULT_RANGE } from './analyticsLogic.js';
import { empty, sub, tiles, strip, protocolRows, resetBlock, tacticRows, weekdayCols, heatGrid } from './analyticsParts.js';

let n = DEFAULT_RANGE;
let play = false; // a range tap sets it: the next render staggers its items in once (M4). Data edits and ticks never do.

const section = (title, ...body) => h('section', { class: play ? 'an-sec an-play' : 'an-sec' }, sectionHeading(title), plate(body));
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

// Range control: each button carries a stable id so the toggle replay in app.js finds it again after the rebuild.
function range() {
  const seg = segmented({ options: RANGES, value: n, onPick: v => { if (v === n) return; n = v; play = true; rerender(); }, id: 'an-range' });
  [...seg.children].forEach((b, i) => b.setAttribute('data-tg', `range/${RANGES[i].label}`));
  return h('div', { class: 'an-range' }, seg);
}

// Items (.an-i) get --i in document order, capped at 4; analytics.css turns it into a delay.
const stagger = nodes => nodes.flatMap(x => [...x.querySelectorAll('.an-i')]).forEach((el, i) => el.setAttribute('style', `--i:${Math.min(i, 4)}`));

export function renderAnalytics(app) {
  const m = analytics(app.state, app.today(), n);
  const nodes = [
    eyebrow('Lock In'),
    screenTitle('Analytics'),
    range(),
    section('Overview', or(m.overview, overview)),
    section('PM Challenge', or(m.challenge, challenge)),
    section('Habits', sub('By weekday'), or(m.habits.weekdays, weekdayCols), sub('Last 28 days'), or(m.habits.heatmap, heatGrid)),
    section('Tasks', or(m.tasks, tasks)),
  ];
  stagger(nodes);
  play = false;
  return nodes;
}
