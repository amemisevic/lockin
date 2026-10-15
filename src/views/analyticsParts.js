// Analytics chart and tile builders (plan Task 18, task-18-rulings R4-R6). DOM via h(), SVG via createElementNS,
// text nodes only. Geometry is the data in the viewBox; colours are classes in src/analytics.css.
import { h } from '../dom.js';
import { cell, legendItem } from './challenge.js';
import { EMPTY } from './analyticsLogic.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}
const chart = (viewBox, ...marks) => s('svg', { viewBox, preserveAspectRatio: 'none', width: '100%', 'aria-hidden': 'true' }, ...marks);
const img = (label, cls, ...children) => h('div', { class: cls, role: 'img', 'aria-label': label }, children);

export const empty = () => h('p', { class: 't2 an-empty' }, EMPTY);
export const sub = text => h('h3', { class: 'an-sub' }, text);

// Number above label (board .tile); the group carries the label that spells out every number.
export const tiles = (label, items) => img(label, 'an-tiles',
  items.map(([l, n]) => h('div', { class: 'an-tile' }, h('div', { class: 'an-n' }, n), h('div', { class: 'an-l' }, l))));

// Segments left to right, each rect as wide as its count (viewBox width = total).
function stacked(label, parts) {
  let x = 0;
  const rects = parts.map(([cls, w]) => { const r = s('rect', { class: cls, x, y: 0, width: w, height: 1 }); x += w; return r; });
  return img(label, 'an-trk', chart(`0 0 ${x} 1`, ...rects));
}

const share = (label, value) =>
  img(label, 'an-trk', chart('0 0 1 1', s('rect', { class: 'an-tb', width: 1, height: 1 }), s('rect', { class: 'an-bar', width: value, height: 1 })));

const head = (left, right) => h('div', { class: 'an-brh' }, h('span', null, left), h('span', { class: 't2' }, right));

// R4: the Challenge strip cells and legend, unchanged; no declared-Redo ring here.
export const strip = (c) => [
  img(c.stripLabel, 'ch-strip', c.strip.map(x => cell(x, false))),
  h('div', { class: 'ch-lgs' }, legendItem('passed', 'Passed', c.legend.passed), legendItem('redo', 'Redo', c.legend.redo),
    legendItem('reset', 'Reset', c.legend.reset)),
];

export const protocolRows = rows => rows.map(p => h('div', { class: 'an-br' },
  head(p.title, `Held ${p.held} · MED ${p.med} · Missed ${p.missed}`),
  stacked(p.label, [['an-held', p.counts[0]], ['an-med', p.counts[1]], ['an-miss', p.counts[2]]])));

export const resetBlock = r => [
  stacked(r.label, [['an-red', r.counts[0]], ['an-miss', r.counts[1]]]),
  h('div', { class: 'an-brh an-gap' }, h('span', null, `Red line ${r.redLine}`), h('span', null, `Missed protocols ${r.protocols}`)),
  r.byProtocol.map(b => h('div', { class: 'an-brh an-gap' }, h('span', { class: 't2' }, b.title), h('b', null, b.count))),
];

export const tacticRows = rows => rows.map(t => h('div', { class: 'an-br' },
  head(t.tactic, t.count), h('div', { class: 'an-t3' }, t.archetype), share(t.label, t.share)));

// Seven columns, Mon first; each bar rises from the bottom by its share. Day and rate are printed under it.
export const weekdayCols = w => img(w.label, 'an-cols', w.days.map(d => h('div', { class: 'an-col' },
  s('svg', { viewBox: '0 0 1 1', preserveAspectRatio: 'none', width: '100%', class: 'an-cs', 'aria-hidden': 'true' },
    s('rect', { class: 'an-tb', width: 1, height: 1 }), s('rect', { class: 'an-bar', y: 1 - d.share, width: 1, height: d.share })),
  h('b', null, d.day), h('span', null, d.rate))));

// R5 marks: size and shape differ by kind, not only hue.
const MARK = { all: { r: 0.4 }, part: { r: 0.24 }, missed: { r: 0.32, 'stroke-width': 0.08 }, none: { r: 0.08 } };
const mark = (kind, cx, cy) => s('circle', { class: `hm-${kind}`, cx, cy, ...MARK[kind] });

export const heatGrid = hm => [
  img(hm.label, 'an-hm', s('svg', { viewBox: '0 0 7 4', width: '100%', 'aria-hidden': 'true' },
    ...hm.cells.map((c, i) => mark(c.kind, (i % 7) + 0.5, Math.floor(i / 7) + 0.5)))),
  h('div', { class: 'ch-lgs', 'aria-hidden': 'true' }, [['all', 'All done'], ['part', 'Partly'], ['missed', 'Missed'], ['none', 'Not due']]
    .map(([k, l]) => h('span', { class: 'lg' }, s('svg', { viewBox: '0 0 1 1', width: 16, height: 16 }, mark(k, 0.5, 0.5)), l))),
];

