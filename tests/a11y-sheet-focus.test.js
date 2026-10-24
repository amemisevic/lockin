import test from 'node:test';
import assert from 'node:assert/strict';

// S3c: focus returns to the opener after every sheet closes (src/sheet.js present/refocus), also when a re-render
// replaced the opener meanwhile (found again by id). Own small fake: parent links, isConnected, focus, <dialog> methods.
class Text { constructor(t) { this.data = t; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; }
  get className() { return this.attrs.class ?? ''; }
  set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id ?? ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new Text(c) : c; n.parent = this; this.children.push(n); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  get isConnected() { for (let n = this; n; n = n.parent) if (n === document.body) return true; return false; }
  showModal() {}
  close() {}
  focus() { document.activeElement = this; }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
}
function* walk(nodes) { for (const n of nodes) if (n instanceof El) { yield n; yield* walk(n.children); } }
globalThis.document = { activeElement: null, body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t),
  getElementById: id => [...walk(document.body.children)].find(n => n.id === id) ?? null };
globalThis.matchMedia = () => ({ matches: true });
const { openSheet, openActionSheet } = await import('../src/sheet.js');

const button = (id, label = id) => { const b = new El('button'); b.setAttribute('id', id); b.append(label); document.body.append(b); return b; };
const click = el => { for (const fn of el.listeners.click ?? []) fn({ target: el }); };
const inSheet = label => [...walk(document.body.children)].find(n => n.tagName === 'BUTTON' && n.textContent === label && n.parent && n.parent.tagName !== 'BODY');
const reset = () => { document.body.children = []; document.activeElement = null; };

test('action sheet: Cancel returns focus to the opener', () => {
  reset();
  const opener = button('op'); opener.focus();
  openActionSheet([{ label: 'Go', onSelect() {} }]);
  click(inSheet('Cancel'));
  assert.equal(document.activeElement, opener);
});

test('action sheet: choosing an item returns focus first, then onSelect runs', () => {
  reset();
  const opener = button('op'); opener.focus();
  let during = null;
  openActionSheet([{ label: 'Go', onSelect: () => { during = document.activeElement; } }]);
  click(inSheet('Go'));
  assert.equal(during, opener);
});

test('help-style sheet (Close button, no items): focus returns to the opener', () => {
  reset();
  const opener = button('help-begin'); opener.focus();
  openActionSheet([], { message: 'Text', cancel: 'Close' });
  click(inSheet('Close'));
  assert.equal(document.activeElement, opener);
});

test('opener replaced by a re-render while the sheet was open: focus goes to its replacement with the same id', () => {
  reset();
  const opener = button('mo-t1'); opener.focus();
  openActionSheet([{ label: 'Go', onSelect() {} }]);
  opener.remove(); // the 30 s tick rebuilt the screen
  const replacement = button('mo-t1');
  click(inSheet('Cancel'));
  assert.equal(document.activeElement, replacement);
});

test('bottom sheet: Cancel and the action button both return focus to the opener', () => {
  for (const which of ['Cancel', 'Save']) {
    reset();
    const opener = button('add-task'); opener.focus();
    openSheet({ title: 'New', action: 'Save', content: new El('div'), onAction: () => {} });
    click(inSheet(which));
    assert.equal(document.activeElement, opener, which);
  }
});
