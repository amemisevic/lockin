// Gym Stats chart builders (gym plan G11 Stats). Same way as analyticsParts.js: DOM via h(), SVG via createElementNS, text nodes only.
// Geometry is the data in the viewBox, colours are classes (analytics.css bars and tracks, gym.css marks). Every number is also HTML
// text (only the weight chart also draws its axis text and kg labels in the svg), and every chart wrapper is a role=img whose label spells the numbers.
import { h } from '../dom.js';

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

const SQ = 6, DR = 8; // half the first-point square, half the latest-point diamond
const diamond = p => `${p.x},${p.y - DR} ${p.x + DR},${p.y} ${p.x},${p.y + DR} ${p.x - DR},${p.y}`;

// Weight progress (G11w): axes, ticks, light gridlines and axis titles, a line through every workout, and a mark per point. First = square,
// latest = diamond, every 5th workout = big dot, the rest = small dot. kg labels only on first, latest and every 5th (the latest sits beside
// its dot, the others above). This is the one svg with <text>; every number is also HTML (the list under the chart). Past 17 workouts the svg
// is drawn 1:1 at its full width and the box scrolls sideways.
export function weightChart(m) {
  const { plot, points } = m, line = (cls, x1, y1, x2, y2) => s('line', { class: cls, x1, y1, x2, y2 });
  const text = (cls, x, y, anchor, str, more = {}) => s('text', { class: cls, x, y, 'text-anchor': anchor, ...more }, str);
  const marks = [];
  for (const t of m.yTicks) marks.push(line('gs-grid', plot.left, t.y, plot.right, t.y));
  marks.push(line('gs-axis', plot.left, plot.bottom, plot.right, plot.bottom), line('gs-axis', plot.left, plot.top, plot.left, plot.bottom));
  for (const t of m.yTicks) marks.push(line('gs-tick', plot.left - 6, t.y, plot.left, t.y));
  for (const t of m.xTicks) marks.push(line('gs-tick', t.x, plot.bottom, t.x, plot.bottom + 6));
  for (const t of m.yTicks) marks.push(text('gs-tx', plot.left - 8, t.y + 4, 'end', t.text));
  for (const t of m.xTicks) marks.push(text('gs-tx', t.x, plot.bottom + 20, 'middle', String(t.n)));
  const mid = (plot.top + plot.bottom) / 2;
  marks.push(text('gs-tx', 12, mid, 'middle', 'kg', { transform: `rotate(-90 12 ${mid})` }), text('gs-tx', (plot.left + plot.right) / 2, m.height - 6, 'middle', 'Workout number'));
  if (points.length > 1) marks.push(s('polyline', { class: 'gs-line', points: points.map(p => `${p.x},${p.y}`).join(' ') }));
  for (const p of points) {
    if (p.last) marks.push(s('polygon', { class: 'gs-end', points: diamond(p) }));
    else if (p.first) marks.push(s('rect', { class: 'gs-end', x: p.x - SQ, y: p.y - SQ, width: 2 * SQ, height: 2 * SQ }));
    else marks.push(s('circle', { class: p.fifth ? 'gs-dot5' : 'gs-pt', cx: p.x, cy: p.y, r: p.fifth ? 5 : 3 }));
  }
  for (const p of points) if (p.show) marks.push(p.last ? text('gs-lbl', p.x + 10, p.y + 4, 'start', p.text) : text('gs-lbl', p.first ? p.x - 2 : p.x, p.y - 10, p.first ? 'start' : 'middle', p.text));
  const svg = s('svg', { viewBox: `0 0 ${m.width} ${m.height}`, width: m.wide ? m.width : '100%', 'aria-hidden': 'true', ...(m.wide ? { height: m.height } : {}) }, ...marks);
  return h('div', { class: 'gs-wchart', role: 'img', 'aria-label': m.label }, svg);
}
