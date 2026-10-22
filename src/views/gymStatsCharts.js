// Gym Stats chart builders (gym plan G11 Stats). Same way as analyticsParts.js: DOM via h(), SVG via createElementNS, text nodes only.
// Geometry is the data in the viewBox, colours are classes (analytics.css bars and tracks, gym.css marks). Every number is also HTML
// text, never <text> in the svg, and every chart wrapper is a role=img whose label spells the numbers.
import { h } from '../dom.js';
import { W, H } from './gymStatsLogic.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}
const img = (label, cls, ...children) => h('div', { class: cls, role: 'img', 'aria-label': label }, children);
const caption = (a, b) => h('div', { class: 'gs-cap t2' }, h('span', null, a), h('span', null, b));

// Columns left to right, each on a track; a bar rises from the bottom by its value. Target (optional) is a dashed line across all columns.
export function barChart({ values, max, label, first, last, target }) {
  const n = values.length;
  const marks = values.map((_, i) => s('rect', { class: 'an-tb', x: i + 0.1, y: 0, width: 0.8, height: max }));
  values.forEach((v, i) => { if (v > 0) marks.push(s('rect', { class: 'an-bar', x: i + 0.1, y: max - v, width: 0.8, height: v })); });
  if (target != null) marks.push(s('line', { class: 'gs-target', x1: 0, x2: n, y1: max - target, y2: max - target, 'vector-effect': 'non-scaling-stroke' }));
  return [
    img(label, 'gs-chart', s('svg', { class: 'gs-bars', viewBox: `0 0 ${n} ${max}`, preserveAspectRatio: 'none', width: '100%', 'aria-hidden': 'true' }, ...marks)),
    h('div', { class: 'gs-nums', 'aria-hidden': 'true' }, values.map(v => h('span', null, String(v)))),
    caption(first, last),
  ];
}

// One muscle: name and count above a share bar (the Analytics tactic-row pattern).
export const shareRow = r => h('div', { class: 'an-br' },
  h('div', { class: 'an-brh' }, h('span', null, r.name), h('span', { class: 't2' }, String(r.sets))),
  img(r.label, 'an-trk', s('svg', { viewBox: '0 0 1 1', preserveAspectRatio: 'none', width: '100%', 'aria-hidden': 'true' },
    s('rect', { class: 'an-tb', width: 1, height: 1 }), s('rect', { class: 'an-bar', width: r.share, height: 1 }))));

const R = 7; // half the diamond; the padding in gymStatsLogic.js is 10
const diamond = p => `${p.x},${p.y - R} ${p.x + R},${p.y} ${p.x},${p.y + R} ${p.x - R},${p.y}`;

// Ordinary points are circles, a PR is a bigger diamond (shape, not only colour); the PR also appears as a line of text under the chart.
export function lineChart({ points, label, first, last }) {
  const marks = [];
  if (points.length > 1) marks.push(s('polyline', { class: 'gs-line', points: points.map(p => `${p.x},${p.y}`).join(' ') }));
  for (const p of points) marks.push(p.pr ? s('polygon', { class: 'gs-pr', points: diamond(p) }) : s('circle', { class: 'gs-pt', cx: p.x, cy: p.y, r: 4 }));
  return [img(label, 'gs-chart', s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', 'aria-hidden': 'true' }, ...marks)), caption(first, last)];
}
