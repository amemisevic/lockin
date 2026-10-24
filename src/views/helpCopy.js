// Challenge help copy (task H1b), approved in docs/superpowers/plans/help-copy-draft.md. Plain text only: ui/controls.js
// puts it in the action sheet as a text node. name = the entry's heading, used in the "?" aria-label.
export const HELP = {
  topWin: { name: 'Top G win', text: 'Write today\'s win in your own words. It does not change the day\'s result.' },
  bottomMove: { name: 'Bottom G\'s move', text: 'Pick an archetype, then a tactic, or choose Something else and write your own. Tactics come from the pack you imported in Settings.' },
  med: { name: 'MED', text: 'Declare MED in the morning only, one protocol at a time; each uses one slot of your weekly limit (the week runs Monday to Sunday). It is not available the day after a Reset or a declared Redo, and never for red lines.' },
  oath: { name: 'Contract, Funeral, Code, Week 1 red lines', text: 'Four entries you write once before Day 1: Contract, Funeral, Code and your Week 1 red lines. They are kept in your War Log.' },
  protocol: { name: 'Protocol', text: 'At night you mark each protocol Held or Missed. How many you miss decides whether the day is a Redo or a Reset.' },
  risk: { name: 'Red line at risk today?', text: 'An optional note about a red line you think may be at risk today. It is saved with the day and does not change the result.' },
  redoBand: { name: 'Redo band', text: 'Redo: at least 1 protocol missed but fewer than your Zero Day threshold (default 3, so 1 or 2). Reset: any red line crossed, or missed protocols reach the threshold.' },
  autoRedo: { name: '04:00 auto-Redo', text: 'You can close yesterday until 04:00 the next morning. After that the day closes itself as a Redo and cannot be filed late.' },
  recovery: { name: 'Recovery: non-blocking', text: 'File your autopsy within 24 hours of the Reset. Until you do, a banner shows, but the rest of the app stays open and being overdue only turns it crimson.' },
  slip: { name: 'Slipped without knowing', text: 'A note for something that happened without your knowing. It does not change the result or your streak.' },
  forcedPass: { name: 'Forced full pass', text: 'The day after a Reset or a declared Redo is a forced full pass: you cannot declare MED.' },
  streak: { name: 'Streak', text: 'Your streak counts Passed days in a row, up to your latest closed day. A Redo or a Reset ends it.' },
  gating: { name: 'Check-in gating', text: 'A day counts only if both Morning and Night are filed; Afternoon is optional and costs nothing. Without a Morning check-in the day cannot be Passed.' },
  begin: { name: 'Begin Day 1', text: 'To begin, write all four oath entries and add at least one protocol and one red line. The line under the button shows what is still missing.' },
  graduation: { name: 'Graduation', text: 'The challenge ends when Day 30 is closed, whatever its result. This version cannot start a new one.' },
};
