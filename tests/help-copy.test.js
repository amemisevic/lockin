import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELP } from '../src/views/helpCopy.js';
import { icons } from '../src/icons.js';

// Task H1b: the approved Challenge help copy (docs/superpowers/plans/help-copy-draft.md, entries 2-16; entry 1 has no text).
// Entry 5 and 16 carry the owner's rewrites. Names are the draft's headings and become the "Help: <name>" aria-labels.
const EXPECTED = {
  topWin: ['Top G win', 'Write today\'s win in your own words. It does not change the day\'s result.'],
  bottomMove: ['Bottom G\'s move', 'Pick an archetype, then a tactic, or choose Something else and write your own. Tactics come from the pack you imported in Settings.'],
  med: ['MED', 'Declare MED in the morning only, one protocol at a time; each uses one slot of your weekly limit (the week runs Monday to Sunday). It is not available the day after a Reset or a declared Redo, and never for red lines.'],
  oath: ['Contract, Funeral, Code, Week 1 red lines', 'Four entries you write once before Day 1: Contract, Funeral, Code and your Week 1 red lines. They are kept in your War Log.'],
  protocol: ['Protocol', 'At night you mark each protocol Held or Missed. How many you miss decides whether the day is a Redo or a Reset.'],
  risk: ['Red line at risk today?', 'An optional note about a red line you think may be at risk today. It is saved with the day and does not change the result.'],
  redoBand: ['Redo band', 'Redo: at least 1 protocol missed but fewer than your Zero Day threshold (default 3, so 1 or 2). Reset: any red line crossed, or missed protocols reach the threshold.'],
  autoRedo: ['04:00 auto-Redo', 'You can close yesterday until 04:00 the next morning. After that the day closes itself as a Redo and cannot be filed late.'],
  recovery: ['Recovery: non-blocking', 'File your autopsy within 24 hours of the Reset. Until you do, a banner shows, but the rest of the app stays open and being overdue only turns it crimson.'],
  slip: ['Slipped without knowing', 'A note for something that happened without your knowing. It does not change the result or your streak.'],
  forcedPass: ['Forced full pass', 'The day after a Reset or a declared Redo is a forced full pass: you cannot declare MED.'],
  streak: ['Streak', 'Your streak counts Passed days in a row, up to your latest closed day. A Redo or a Reset ends it.'],
  gating: ['Check-in gating', 'A day counts only if both Morning and Night are filed; Afternoon is optional and costs nothing. Without a Morning check-in the day cannot be Passed.'],
  begin: ['Begin Day 1', 'To begin, write all four oath entries and add at least one protocol and one red line. The line under the button shows what is still missing.'],
  graduation: ['Graduation', 'The challenge ends when Day 30 is closed, whatever its result. This version cannot start a new one.'],
};

test('HELP holds exactly the 15 approved entries (entry 1, the Top G / Bottom G terms, has none)', () => {
  assert.deepEqual(Object.keys(HELP).sort(), Object.keys(EXPECTED).sort());
  for (const [key, [name, text]] of Object.entries(EXPECTED)) assert.deepEqual(HELP[key], { name, text }, key);
});

test('entry 5 and entry 16 use the owner\'s rewritten text', () => {
  assert.equal(HELP.oath.text, 'Four entries you write once before Day 1: Contract, Funeral, Code and your Week 1 red lines. They are kept in your War Log.');
  assert.equal(HELP.graduation.text, 'The challenge ends when Day 30 is closed, whatever its result. This version cannot start a new one.');
});

test('every entry is at most 2 sentences', () => {
  for (const [key, { text }] of Object.entries(HELP)) assert.ok((text.match(/[.!?](\s|$)/g) ?? []).length <= 2, key);
});

test('helpCopy.js is plain data: no imports, no markup', () => {
  const src = readFileSync(new URL('../src/views/helpCopy.js', import.meta.url), 'utf8');
  assert.equal(/^\s*import\s/m.test(src), false);
  assert.equal(/innerHTML|<[a-z]/i.test(src), false);
});

test('sw.js ASSETS lists helpCopy.js', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('\'src/views/helpCopy.js\''));
});

test('help icon: inline SVG in the 2 px control stroke style', () => {
  assert.match(icons.help, /^<svg [^>]*stroke="currentColor" stroke-width="2" stroke-linecap="round"/);
});

test('.help is a 44 x 44 tap target in styles.css', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const rule = css.match(/\.help\{[^}]*\}/)?.[0] ?? '';
  assert.match(rule, /width:44px/);
  assert.match(rule, /height:44px/);
});
