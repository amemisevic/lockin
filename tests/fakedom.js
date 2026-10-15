// Minimal fake DOM shared by the Task 19 view tests (not a test file: node --test ignores it).
// Same conventions as tests/analytics-view.test.js: h(), icon() (DOMParser result is an <svg><path/></svg>), window events.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
export class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new Text(c) : c; n.parent = this; this.children.push(n); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  cloneNode() { const c = new El(this.tagName); c.attrs = { ...this.attrs }; return c; }
  click() {}
  focus() {}
  blur() {}
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  querySelectorAll(sel) { return [...walk(this.children)].filter(n => (sel[0] === '.' ? hasClass(n, sel.slice(1)) : n.tagName === sel.toUpperCase())); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
export const hasClass = (n, c) => n.className.split(/\s+/).includes(c);

export const events = [];
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  importNode: n => n };
globalThis.DOMParser = class { parseFromString() { const s = new El('svg'); s.append(new El('path')); return { documentElement: s }; } };
globalThis.window = { dispatchEvent(e) { events.push(e.type); return true; }, addEventListener() {} };
globalThis.Event = class { constructor(type) { this.type = type; } };

export const all = nodes => [...walk(nodes)];
export const texts = nodes => { const r = []; const go = ns => { for (const n of ns) if (n instanceof Text) r.push(n.data); else go(n.children); }; go(nodes); return r; };
export const fire = (el, type, extra = {}) => { for (const fn of el.listeners[type] ?? []) fn({ type, preventDefault() {}, target: el, ...extra }); };
export const byText = (nodes, tag, label) => all(nodes).find(n => n.tagName === tag.toUpperCase() && n.textContent === label);
export const byLabel = (nodes, label) => all(nodes).find(n => n.getAttribute('aria-label') === label);
export const headings = nodes => all(nodes).filter(n => n.tagName === 'H2' && hasClass(n, 'sec')).map(n => n.textContent);
