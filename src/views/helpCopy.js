// Challenge help copy (tasks H1b, H1d), approved in docs/superpowers/plans/help-copy-draft.md and help-terms-draft.md.
// Plain text only: ui/controls.js puts it in the action sheet as a text node. name = the entry's heading, used in the "?" aria-label.
export const HELP = {
  topWin: { name: 'Top G win', text: 'The Top G is the version of you that keeps his word. Write today\'s win in your own words; it does not change the result.' },
  bottomMove: { name: 'Bottom G\'s move', text: 'The Bottom G is the part of you that negotiates and makes excuses. Pick an archetype, then a tactic, or choose Something else and write your own.' },
  med: { name: 'MED', text: 'MED is Minimum Effective Dose: a shorter fallback version of a protocol for a bad day. Declare it in the morning only; it counts as held and uses one weekly slot.' },
  contract: { name: 'Contract', text: 'Your written commitment to the 30 days: promise to show up every day and tell the truth in your check-ins, then sign and date it.' },
  funeral: { name: 'Funeral', text: 'A funeral speech for the weak man you become if you never change: the same excuses and habits for 10, 20, 30 years. Be honest and specific.' },
  code: { name: 'Code', text: 'Your personal code: five to seven clear laws you will live by in this challenge. Write standards, not vague words like success.' },
  redLines1: { name: 'Week 1 red lines', text: 'The things you will not do for the next 7 days, written as a short list.' },
  protocol: { name: 'Protocol', text: 'A protocol is a standing daily commitment that you mark Held or Missed each night. How many you miss decides whether the day is a Redo or a Reset.' },
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
