# Help copy draft: Challenge tab (task H1a, text only)
Scope ruled: Challenge. Each entry: where the "?" sits, help text (max 2 short sentences, what the app does), sources. UNCLEAR = sources silent, no text.
PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `docs/design/lockin-v2/DESIGN-SPEC.md`; INV = `help-inventory.md`; BP = the Forge BUILD-PLAN (outside the repo; cited by section only, nothing copied). Texts follow PLAN where BP differs (see Conflicts).

## 1. Top G / Bottom G (the terms)
- UNCLEAR. PLAN Task 16 item 4 and BP §6 name the fields only; no source says what the terms mean. No text.

## 2. Top G win (field)
- "?": Night check-in, heading `Today's Top G win`.
- Text: "Write today's win in your own words. It does not change the day's result."
- Source: PLAN Task 16 item 4 ("Top G win text"); Task 4 `suggestResult` takes no win input.

## 3. Bottom G's move (field)
- "?": Night check-in, heading `The Bottom G's move`.
- Text: "Pick an archetype, then a tactic, or choose Something else and write your own. Tactics come from the pack you imported in Settings."
- Source: PLAN Task 16 item 4 ("hidden when the pack has none"); Data model ("names/tactics come from the pack"); BP §6.

## 4. MED
- "?": Morning check-in, question 3 heading `Declare MED`.
- Text: "Declare MED in the morning only, one protocol at a time; each uses one slot of your weekly limit (the week runs Monday to Sunday). It is not available the day after a Reset or a declared Redo, and never for red lines."
- Source: PLAN Rules, MED and Reset/Redo; Rules last line (Monday-start week). What MED stands for: UNCLEAR, not expanded.

## 5. Contract, Funeral, Code, Week 1 red lines
- UNCLEAR. PLAN Rules and Task 5 give keys and titles only (`contract funeral code redlines-w1`); no source says what to write. No text. (The gate they create is under Begin Day 1.)

## 6. Protocol
- "?": Challenge, heading `Protocols`.
- Text: "At night you mark each protocol Held or Missed. How many you miss decides whether the day is a Redo or a Reset."
- Source: PLAN Task 16 item 2; Rules (Redo, Reset). What a protocol is or should contain: UNCLEAR, not described.

## 7. Red line at risk today?
- "?": Morning check-in, question 2.
- Text: "An optional note about a red line you think may be at risk today. It is saved with the day and does not change the result."
- Source: PLAN Task 15 step 1 ("optional text"), Data model (`morning.risk`); Task 4 `suggestResult` takes no risk input. BP §6 ("Optional red-line-at-risk note").

## 8. Redo band
- "?": Challenge, the Passed / Redo / Reset legend under the 30-day strip.
- Text: "Redo: at least 1 protocol missed but fewer than your Zero Day threshold (default 3, so 1 or 2). Reset: any red line crossed, or missed protocols reach the threshold."
- Source: PLAN Rules (Reset, Redo, Passed; Zero Day default 3, range 2–5). Not covered here: declared Redo consequences (streak, next-day MED), already in the Declare Redo sheet only in part (INV row 3).

## 9. 04:00 auto-Redo
- "?": Night check-in title, and Today's `Close yesterday` card.
- Text: "You can close yesterday until 04:00 the next morning. After that the day closes itself as a Redo and cannot be filed late."
- Source: PLAN Rules (Night missing); Task 4 `nightTargets` ("yesterday if `hour < 4`") and `settleMissed`.

## 10. Recovery: non-blocking
- "?": Recovery screen, countdown plate `File within 24 hours`.
- Text: "File your autopsy within 24 hours of the Reset. Until you do, a banner shows, but the rest of the app stays open and being overdue only turns it crimson."
- Source: PLAN Rules (Reset effects; Autopsy: "non-blocking banner; overdue ... turns crimson, nothing else changes"); BP §5 Recovery Protocol.

## 11. Slipped without knowing
- "?": Night check-in, heading `Slipped without knowing?`.
- Text: "A note for something that happened without your knowing. It does not change the result or your streak."
- Source: PLAN Rules (Slipped without knowing: "note only (`slipNote`); no effect on result or streak"); BP §5.

## 12. Forced full pass
- "?": Morning check-in, next to the line `No MED today. Yesterday was a Reset.` (or `...a declared Redo.`).
- Text: "The day after a Reset or a declared Redo is a forced full pass: you cannot declare MED."
- Source: PLAN Rules (Reset effects, Redo, MED "refused if the day is a forced full pass").

## 13. Streak
- "?": Challenge header, pill `N-day streak` (pill shows from 1).
- Text: "Your streak counts Passed days in a row, up to your latest closed day. A Redo or a Reset ends it."
- Source: PLAN Rules (Streak; Redo "Breaks the streak"; Reset "streak → 0").

## 14. Check-in gating
- "?": Morning check-in, title.
- Text: "A day counts only if both Morning and Night are filed; Afternoon is optional and costs nothing. Without a Morning check-in the day cannot be Passed."
- Source: PLAN Rules (Day result; Morning missing: "minimum `redo`"); BP §6.

## 15. Begin Day 1
- "?": Challenge before Day 1 (Day 0), beside the `Begin Day 1` button.
- Text: "To begin, write all four oath entries and add at least one protocol and one red line. The line under the button shows what is still missing."
- Source: PLAN Rules ("Day 1 = onboarding. Begin Day 1 requires ..."); Task 13 step 1.

## 16. Graduation
- "?": Challenge, plate `YOU FINISHED`.
- Text: "The challenge ends when Day 30 is closed, whatever its result. This version has no way to start a new one."
- Source: PLAN Rules ("Day 30 closed (any result) → graduation plate ... No new-challenge flow in v2").

## Conflicts and needs ruling
1. MED limit: BP §5 reads "2 MED days per week, TOTAL across all protocols"; PLAN says each declaration uses one slot ("◆"). Entry 4 follows PLAN and avoids the word "days".
2. Onboarding: BP says the Day 1 mission creates the protocol rows; PLAN requires them before Begin Day 1. Entry 15 follows PLAN.
3. Archetype names differ (BP vs PLAN ids); entry 3 names none, they come from the pack.
4. UNCLEAR, no text: entry 1 (Top G / Bottom G terms), entry 5 (oath contents). Partly unclear: entry 4 (MED), entry 6 (Protocol).
5. Entries 2 and 7 say "does not change the result": taken from the inputs of `suggestResult` (PLAN Task 4), not from a Rules sentence. Confirm.
