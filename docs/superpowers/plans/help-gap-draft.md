# Help gap audit and copy draft: Challenge flow (task H1e, text only)
Goal: a "?" for everything in the Challenge flow a first-time user could misread. PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `DESIGN-SPEC.md`; BP = The Forge `BUILD-PLAN.md`; SEED = The Forge Day 1 mission seed (cited by section only, paraphrased); H1b/H1d = `help-copy-draft.md`, `help-terms-draft.md`. "Code" = what `src/views` does today.
Built so far (H1b, H1d): 18 help entries, 19 buttons. "Explained" = copy on screen already says it. Gap = needs a "?" (entry number below). No weekly review exists in the app (no route, no code; PLAN has none), so nothing to audit there.

## 1. Audit
| Control / plate / screen | "?" now | Explained on screen | Gap |
|---|---|---|---|
| Day 0: laurel, Begin Day 1, reason line | yes | yes (reason line) | none |
| Day 0: four oath rows | yes (each) | partly (Written / Not written yet) | none |
| Day 0: `Protocols` and `Red lines` rows (open Settings, "N added") | no | partly | G1, G2 |
| Settings: Protocols and Red lines sections, Add rows, sheet Title / Name | no | no | G1, G2 |
| Settings: protocol sheet `MED version`, Delete | no | hint, confirm text | Settings draft 5, 6 |
| Challenge: streak pill | yes | yes | none |
| Challenge: day number and 30-day strip (rings, glyphs) | no | cell labels only | G14 |
| Challenge: Passed / Redo / Reset legend | yes (Redo band) | words | none |
| Challenge: Today's mission plate, Open mission, War Log | no | partly | G8 |
| Challenge: Declared Redo plate and its sheet | no | sheet: once, today, red line; not streak or next day | G7 |
| Challenge: Protocols list | yes | no | none |
| Challenge: Red lines list | no | caption `crossing one = Reset` | G2 |
| Challenge: graduation plate and stats | yes | partly | none (stat names are plain) |
| Morning: title, Q2 risk, Q3 MED, forced-pass line | yes | yes | none |
| Morning: Recovery due banner, Start the day, errors | no | yes | none |
| Morning: Q1 `Today's #1 target` | no | no | G9 (UNCLEAR) |
| Afternoon: title, Still on track?, friction, Open tasks `Provisional`, Log it | no | partly | G10 |
| Night: title, Top G win, Bottom G's move, Slipped | yes | yes | none |
| Night: Settle your tasks (Done / Failed / Stalled) | no | Stalled caption only | G5 |
| Night: Protocols Held / Missed, MED read-only row | no | partly | G3 |
| Night: Red lines held / crossed rows | no | helper line, `This is a Reset.` | G4 |
| Night: Suggested result, Override, Reason | no | partly | G6 |
| Night: Close the day, `This is final.` | no | yes | none |
| Recovery: header, Reset plate, three effect chips | no | words only | G11 |
| Recovery: countdown plate | yes | yes | none |
| Recovery: Q1 to Q4 (state, time, place, first decision) | no | hint on Q4 | none |
| Recovery: Q5 change, vague nudge | no | nudge after first blur | G12 |
| War Log list, rows, entry editor | no | previews only | G13 |
| Mission detail (title, body, Write the War Log entry, Locked / none plates) | no | plates yes | G8 |
| Today: Close yesterday card | yes | yes | none |

## 2. Copy for the gaps
## G1 Protocols (adding)
- "?": Day 0 `Protocols` row (beside the link); Settings `Protocols` heading.
- Text: "Protocols are the daily commitments you mark Held or Missed each night. Add at least one before you can begin Day 1."
- Source: PLAN Rules (Day 1 = onboarding), Task 19 step 1; H1c Protocol (usage: SEED Day 12 "standing daily protocol").
## G2 Red lines
- "?": Day 0 `Red lines` row; Settings `Red lines` heading; Challenge `Red lines` heading.
- Text: "Red lines are things you will not do; crossing one makes the day a Reset, and MED or a declared Redo never covers it. Add at least one before Day 1."
- Source: PLAN Rules (Reset, MED, Declared Redo, Day 1); BP §5 (a crossing is a standalone Reset; MED Doctrine); SEED Day 1 Step 5 ("I will not" list).
## G3 Night: Protocols
- "?": Night `Protocols` heading.
- Text: "Mark each protocol Held or Missed. One you declared as MED this morning shows as MED and cannot be changed tonight."
- Source: PLAN Rules (MED counts as held, shown read-only), Task 16; BP §7 (Night check-in).
## G4 Night: Red lines
- "?": Night `Red lines` heading.
- Text: "Mark each red line held or crossed, and be exact. One crossed line makes the day a Reset by itself, and it cannot be overridden."
- Source: PLAN Rules (Reset), Task 16; code `NIGHT_TEXT` (red-line-override); BP §7 (red-line check).
## G5 Night: Settle your tasks
- "?": Night `Settle your tasks` heading (shown only when tasks are open).
- Text: "Every task still open must be marked Done, Failed or Stalled before you can close the day. Stalled means you genuinely could not act on it, so it counts for nothing and against nothing."
- Source: PLAN Task 16; SPEC §5 (stalled counts for nothing); BP §7 (force-resolve step).
## G6 Night: Suggested result and Override
- "?": Night `Suggested result` plate, beside the eyebrow.
- Text: "The app suggests Passed, Redo or Reset from your answers and lists the reasons. You can override it with a written reason saved on the day; a crossed red line cannot be overridden."
- Source: PLAN Rules (Override requires a reason), Task 4 `suggestResult`, Task 16; BP §7 (suggestion and override).
## G7 Declared Redo
- "?": Challenge `Declared Redo` plate, beside the eyebrow.
- Text: "You get one declared Redo per challenge, for today only and before the event. It makes today a Redo, which ends your streak and makes tomorrow a forced full pass; a red line is never covered."
- Source: PLAN Rules (Declared Redo, Redo), Task 13 step 2; BP §5 (Declared Redo).
## G8 Mission
- "?": Challenge `Today's mission` heading; Mission detail `Mission` eyebrow.
- Text: "Each day has one mission from the pack you imported in Settings. The button opens your War Log entry for that day."
- Source: PLAN Task 6, Task 13 step 2, Task 14 step 1. What happens if you skip a mission: UNCLEAR (PLAN silent; see Needs ruling 2), so no text on it.
## G9 Morning: Today's #1 target
- "?": Morning question 1.
- UNCLEAR. PLAN Task 15 step 1 says only "textarea, required"; BP §6 says "free text". No source says what a good target is. No text.
## G10 Afternoon
- "?": Afternoon header (takes the spacer).
- Text: "Afternoon is optional and costs nothing if you skip it. Tasks shown here stay provisional until you close the day tonight."
- Source: PLAN Rules (Afternoon optional, zero penalty), Task 15 step 2, How everything connects; BP §6 (afternoon, "Provisional — finalizes tonight").
## G11 Recovery Protocol
- "?": Recovery header (takes the spacer).
- Text: "The Recovery Protocol is the autopsy you file after a Reset: how it happened, and one change that breaks the chain. It has five short questions."
- Source: PLAN Rules (Autopsy: five fields), Task 17; BP §5 (Recovery Protocol).
## G12 Recovery: the concrete change
- "?": Recovery question 5.
- Text: "A specific change that breaks the chain: something you will block, delete or move. A vague answer gets a warning."
- Source: BP §5 (Recovery step 2); PLAN Task 5 (`checkVague`); `CLAUDE.md` (nudge wording).
## G13 War Log
- "?": War Log header (takes the spacer).
- Text: "The War Log holds your four oath entries, your autopsies and one entry per mission day. You can edit oath and Day entries; autopsies are read-only."
- Source: PLAN Task 5 (keys), Task 14 steps 2 and 3; code `warlog.js` (autopsies read-only).
## G14 30-day strip
- "?": Challenge hero plate, top right corner.
- Text: "Each square is one day of the 30: marked Passed, Redo or Reset once closed, with today outlined and later days dim. A bronze ring on today means a declared Redo."
- Source: PLAN Task 13 step 2; code `challenge.js` (declared-Redo ring, fix round 2).

## Needs ruling
1. Density: this adds 13 entries (Night alone goes from 4 buttons to 8). Merge G3 and G4, or drop G5, G6, G14, if it is too many.
2. G8: BP §5 says a badly done mission must be redone within 24 h; PLAN has no such rule, so the text says nothing about skipping.
3. G10: "costs nothing" is PLAN/BP; that the Afternoon answer does not change the result is only implied (`suggestResult` takes no afternoon input), so not stated.
4. G1, G2 supersede Settings draft entry 11 (UNCLEAR): H1c found sources. Settings entries 5 and 6 still stand.
5. G9 UNCLEAR, no text. G7 and G14 add two things the screen never shows (streak and next-day effects; the bronze ring).
