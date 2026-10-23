// Exit and list motion (M3, DESIGN-SPEC §10). The real node is always removed synchronously (focus return, id shadowing);
// a non-modal ghost clone plays the exit: ids stripped, aria-hidden, inert, no pointer events (.ghost in screens.css).

// Plays a clone of el out in place of a node that is gone. cls and style (custom properties or left/top/width) go on the clone.
// A DOM that cannot clone (the test fakes) gets no ghost.
export function ghostOut(el, cls = '', style = {}) {
  const g = el.cloneNode?.(true);
  if (!g?.querySelectorAll) return;
  for (const n of [g, ...g.querySelectorAll('[id]')]) n.removeAttribute('id');
  g.className = `${g.className} ghost ${cls}`.trim();
  g.setAttribute('aria-hidden', 'true');
  g.setAttribute('inert', '');
  for (const [k, v] of Object.entries(style)) g.style.setProperty(k, v);
  const done = () => { clearTimeout(t); g.remove(); };
  const t = setTimeout(done, 400); // animationend never fires if the tab is hidden or the animation is off
  g.addEventListener('animationend', e => { if (e.target === g) done(); });
  document.body.append(g);
}

const keyed = nodes => {
  const m = new Map();
  for (const n of nodes) for (const e of [n, ...(n.querySelectorAll?.('[data-k]') ?? [])]) if (e.getAttribute?.('data-k')) m.set(e.getAttribute('data-k'), e);
  return m;
};

// Replaces view's children with next. Rows opt in with data-k="<stable key>"; on a re-render of the same screen (animate)
// a new key fades in and a missing key leaves as a ghost at its old spot. Opacity and transform only, no layout animation.
// ponytail: more than 3 changes at once is a different list (day stepped, filter), not an add or remove, and is not animated;
// set rows are keyed by position, so removing one fades out the last row, which looks the same once the rows renumber.
export function swapRows(view, next, animate) {
  const before = animate ? keyed(view.children) : new Map();
  const after = keyed(next);
  const gone = [...before].filter(([k]) => !after.has(k));
  const added = [...after].filter(([k]) => !before.has(k));
  const play = animate && gone.length + added.length <= 3;
  const spots = play ? gone.map(([, el]) => [el, el.getBoundingClientRect()]) : [];
  const y = window.scrollY;
  view.replaceChildren(...next);
  if (!play) return;
  for (const [, el] of added) el.className += ' k-in';
  for (const [el, r] of spots) ghostOut(el, 'k-out', { left: `${r.left}px`, top: `${r.top + y}px`, width: `${r.width}px` });
}
