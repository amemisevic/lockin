import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELP } from '../src/views/helpCopy.js';
import { icons } from '../src/icons.js';

// Task H1b: the approved Challenge help copy (docs/superpowers/plans/help-copy-draft.md, entries 2-16; entry 1 has no text).
// Entry 5 and 16 carry the owner's rewrites. Names are the draft's headings and become the "Help: <name>" aria-labels.
const EXPECTED = {
  topWin: ['Top G win', 'The Top G is the version of you that keeps his word. Write today\'s win in your own words; it does not change the result.'],
  bottomMove: ['Bottom G\'s move', 'The Bottom G is the part of you that negotiates and makes excuses. Pick an archetype, then a tactic, or choose Something else and write your own.'],
  med: ['MED', 'MED is Minimum Effective Dose: a shorter fallback version of a protocol for a bad day. Declare it in the morning only; it counts as held and uses one weekly slot.'],
  contract: ['Contract', 'Your written commitment to the 30 days: promise to show up every day and tell the truth in your check-ins, then sign and date it.'],
  funeral: ['Funeral', 'A funeral speech for the weak man you become if you never change: the same excuses and habits for 10, 20, 30 years. Be honest and specific.'],
  code: ['Code', 'Your personal code: five to seven clear laws you will live by in this challenge. Write standards, not vague words like success.'],
  redLines1: ['Week 1 red lines', 'The things you will not do for the next 7 days, written as a short list.'],
  protocol: ['Protocol', 'A protocol is a standing daily commitment that you mark Held or Missed each night. How many you miss decides whether the day is a Redo or a Reset.'],
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
  // H1f: gaps G1 to G14 of help-gap-draft.md (G5, G7, G9 with the owner's overrides).
  addProtocols: ['Protocols', 'Protocols are the daily commitments you mark Held or Missed each night. Add at least one before you can begin Day 1.'],
  addRedLines: ['Red lines', 'Red lines are things you will not do; crossing one makes the day a Reset, and MED or a declared Redo never covers it. Add at least one before Day 1.'],
  nightProtocols: ['Night protocols', 'Mark each protocol Held or Missed. One you declared as MED this morning shows as MED and cannot be changed tonight.'],
  nightRedLines: ['Night red lines', 'Mark each red line held or crossed, and be exact. One crossed line makes the day a Reset by itself, and it cannot be overridden.'],
  tasks: ['Settle your tasks', 'Every task still open must be marked Done, Failed or Stalled before you can close the day. Stalled counts for nothing and against nothing.'],
  result: ['Suggested result', 'The app suggests Passed, Redo or Reset from your answers and lists the reasons. You can override it with a written reason saved on the day; a crossed red line cannot be overridden.'],
  declaredRedo: ['Declared Redo', 'You get one declared Redo per challenge, for today only and before the day closes. It makes today a Redo, which ends your streak and makes tomorrow a forced full pass; a red line is never covered.'],
  mission: ['Mission', 'Each day has one mission from the pack you imported in Settings. The button opens your War Log entry for that day.'],
  target: ['Today\'s #1 target', 'Write the one target that matters most today. It is required to start the day.'],
  afternoon: ['Afternoon check-in', 'Afternoon is optional and costs nothing if you skip it. Tasks shown here stay provisional until you close the day tonight.'],
  recoveryProtocol: ['Recovery Protocol', 'The Recovery Protocol is the autopsy you file after a Reset: how it happened, and one change that breaks the chain. It has five short questions.'],
  change: ['Concrete change', 'A specific change that breaks the chain: something you will block, delete or move. A vague answer gets a warning.'],
  warLog: ['War Log', 'The War Log holds your four oath entries, your autopsies and one entry per mission day. You can edit oath and Day entries; autopsies are read-only.'],
  strip: ['30-day strip', 'Each square is one day of the 30: marked Passed, Redo or Reset once closed, with today outlined and later days dim. A bronze ring on today means a declared Redo.'],
};

test('HELP holds exactly the 32 approved entries (H1b/H1d 18, H1f gaps G1 to G14)', () => {
  assert.deepEqual(Object.keys(HELP).sort(), Object.keys(EXPECTED).sort());
  for (const [key, [name, text]] of Object.entries(EXPECTED)) assert.deepEqual(HELP[key], { name, text }, key);
});

test('H1d: the four oath entries have their own text; there is no combined oath entry', () => {
  assert.equal('oath' in HELP, false);
  assert.equal(HELP.funeral.text, 'A funeral speech for the weak man you become if you never change: the same excuses and habits for 10, 20, 30 years. Be honest and specific.');
  assert.equal(HELP.redLines1.text, 'The things you will not do for the next 7 days, written as a short list.');
});

test('entry 16 keeps the owner\'s rewritten text', () => {
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
