# Help copy draft: Settings tab (task H1a-S, text only)
Scope ruled: Settings. Each entry follows the `src/views/helpCopy.js` format: a key, `name` (heading, used in the "?" aria-label), `text` (max 2 short plain sentences, what the app does), plus where the "?" sits and the sources. UNCLEAR = sources silent, no text.
PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `docs/design/lockin-v2/DESIGN-SPEC.md`; INV = `help-inventory.md` (Settings rows); GYM = `v2.1-gym-plan.md`; PG = `PROGRESS-GYM.md`; CLAUDE = `CLAUDE.md` Platform facts; TERMS = `help-terms-draft.md` (approved, now in `helpCopy.js`); GAP = `help-gap-draft.md`; BP = The Forge `BUILD-PLAN.md` and FCLAUDE = The Forge `CLAUDE.md` (outside the repo, cited by section only, nothing copied). Texts follow PLAN where BP differs (see Conflicts). "Code" = what `src/views/settings*.js` does today, cited only where PLAN is silent.
Review pass: entries reworded to the Challenge tone and length. Owner rulings applied (see Conflicts and rulings): the Data entry is deleted and the entries renumbered; entry 2's definition of MED is the shipped `med` sentence copied verbatim; entries 5 and 6 are unchanged. The Protocols and Red lines headings are already covered (GAP G1, G2, built in H1f), so they have no entry here.

## 1. Zero Day threshold (`zeroDay`)
- "?": Settings, Challenge section, row `Zero Day threshold` (beside the stepper).
- name: `Zero Day threshold`
- text: "Missing this many protocols in one day makes it a Reset. Choose 2 to 5 (default 3); days you already closed do not change."
- Source: PLAN Rules, Reset ("missed protocols ≥ `settings.zeroDay` (default 3, range 2–5)"); PLAN Task 3 Review Focus 4 and Global Constraints item 4 (changing it must not rewrite finished days); BP §5 (Reset, "Zero Day" threshold, configurable in Settings, default 3). Same rule as the approved `redoBand`.

## 2. MED per week (`medPerWeek`)
- "?": Settings, Challenge section, row `MED per week` (beside the stepper).
- name: `MED per week`
- text: "MED is Minimum Effective Dose: a shorter fallback version of a protocol for a bad day. Each protocol you declare uses one slot in a Monday to Sunday week; choose 0 to 3 slots (default 2)."
- Source: first sentence = the first sentence of the shipped `src/views/helpCopy.js` `med` entry, copied verbatim (the approved TERMS 5 text as shipped; TERMS 5 sources: FCLAUDE "Important decisions", SEED Days 5, 6, 8, PLAN Rules MED). Second sentence: PLAN Rules, MED ("each declaration uses one of `settings.medPerWeek` (default 2) slots in the Mon–Sun week"; Monday-start week, last Rules line); PLAN Task 19 step 1 (stepper 0–3). Ruling 4 (updated): the definition stays only while it matches the shipped `med` entry word for word; if it is changed, the first sentence is dropped and the definition is UNCLEAR.

## 3. Day 1 date
- "?": Settings, Challenge section, row `Day 1` (`The day the 30 days count from`).
- name: `Day 1 date`
- text: "The day your 30 days count from. You can change it only until the first day is closed."
- Source: PLAN Task 19 step 1 ("editable only while no day is closed, otherwise read-only"); PLAN Calls ("Day 1 date locked after the first closed day"). Code also refuses a future date and a move that leaves a filed day outside the 30 days; PLAN does not say so, so the text does not.

## 4. Challenge pack (import)
- "?": Settings, Challenge section, row `Challenge pack`, beside `Import pack` / `Re-import`.
- name: `Challenge pack`
- text: "A pack is a file with your daily missions for Day 1 to 30 and, optionally, Bottom G tactics. It is the only way they get into the app, and importing replaces the current pack."
- Source: PLAN Task 6 (`{v:1, missions:[{day 1..30, title, body}], tactics}`, `tactics` optional, `importPack` replaces `state.pack`); PLAN Global Constraints ("Missions and tactics reach the phone only through Settings → Import pack"); PLAN Task 19 step 1 (confirm `Replace the current pack?`). "Bottom G" as a term: see TERMS 8 (approved, `helpCopy.js` `bottomMove`).

## 5. MED version (protocol sheet) — unchanged, ruling stands
- "?": New / Edit Protocol sheet, field `MED version (optional)`.
- name: `MED version`
- text: "A shorter version of this protocol that you may declare in the morning, using one of your weekly MED slots. A protocol with no MED version cannot be declared."
- Source: PLAN Rules (MED: "per protocol (`protocol.med` text must exist)"); PLAN Task 15 step 1 (a switch row only for protocols that have `med` text); PLAN Task 19 step 1 (optional `MED version` text). The sheet's own hint says "once"; the Rules say one slot per declaration, so "once" is not repeated (Conflicts and rulings 2).

## 6. Delete protocol / Delete red line — unchanged, ruling stands
- "?": Edit Protocol and Edit Red Line sheets, beside the `Delete protocol` / `Delete red line` button.
- name: `Delete`
- text: "Delete removes it from your list. Days you already closed keep the name they were filed with."
- Source: PLAN Task 19 step 1 ("delete = archive: past days keep their snapshot titles"); PLAN Global Constraints item 4 (deleting or renaming must not rewrite finished days). The confirm sheet already shows the second sentence (INV, Settings row "partly"); kept as is by ruling 3.

## 7. Weekly gym target
- "?": Settings, Gym section, row `Weekly gym target` (beside the switch).
- name: `Weekly gym target`
- text: "Your goal for gym visits each week, from 1 to 7 (default 4). The Gym tab compares each week with it, with no streak and no penalty; switched off, it shows nowhere."
- Source: GYM Rules, Weekly target ("Integer 1 to 7, default 4. Visits are compared to it; there is no streak and no penalty"); PG ruling 18 / G13 (switch and number in Settings; an off target shows no target text anywhere; shown only inside the Gym tab).

## 8. Export backup
- "?": Settings, Data section, row `Export backup`.
- name: `Export backup`
- text: "Saves all your data, gym included, as one file through the share sheet, or downloads it if sharing is not available. Last backup updates only after the file is shared or downloaded."
- Source: PLAN Data model ("Backup = the whole state as JSON"); PLAN Task 19 (`exportBackup`: share sheet, falls back to download; `markBackup`); PG ruling 17 and the G6 entry (one export stamps `lastBackup` and writes both parts into the same file). "Updates only after" is from code (`settings.js` `exportBackup`: a cancelled share is not a backup); PLAN is silent.

## 9. Import backup
- "?": Settings, Data section, row `Import backup`.
- name: `Import backup`
- text: "Choosing a backup file replaces the data in the app with the file's, after you confirm. A file that is not a Lock In v2 backup, or is damaged, is refused and nothing changes."
- Source: PLAN Task 19 step 1 (`Import backup` with `Replace everything?` confirmation); PLAN Task 1 (`validateImport`: v1 backups, empty and invalid files refused); PLAN Global Constraints item 5 (refused with a plain sentence, state untouched). A file with no gym section leaves the gym data alone (PG ruling 3), so the text says "the file's" and not "everything".

## Already covered (no entry)
- Settings `Protocols` and `Red lines` headings already have "?" buttons (`addProtocols`, `addRedLines`), approved in GAP G1 and G2 (sources: TERMS 6, PLAN Rules, Task 19). The earlier UNCLEAR entry is withdrawn; no new text here.

## Not included
- Reminders (INV: explained on screen by the sheet steps and footnote), `Last backup` line and overdue warning (explained on screen), version line, Today's Gym card (removed in G13).

## Conflicts and rulings
Owner rulings applied in this commit:
1. MED per week: PLAN wins over BP. BP §5 reads "Maximum 2 MED days per week, TOTAL across all protocols"; PLAN says each declaration uses one slot (◆). Entries 2 and 5 follow PLAN and avoid the word "days".
2. The protocol sheet hint ("A shorter version you may declare once in the morning") stays unchanged; entry 5 does not repeat "once".
3. The Data entry (old 8) is deleted; entries renumbered (old 9 and 10 are now 8 and 9). Entry 6 (Delete) stays as is, including its second sentence that the confirm sheet already shows.
4. Entry 2 may define MED only with the approved wording copied verbatim. The first ruling used TERMS 5 ("MED stands for ..."); the owner then ruled to match the shipped `helpCopy.js` `med` entry instead. Entry 2's first sentence is now that entry's first sentence, character for character: "MED is Minimum Effective Dose: a shorter fallback version of a protocol for a bad day."

Still noted (not ruled): entry 3 omits code-only refusals (future date, a filed day falling outside the 30 days); entry 8's "updates only after" and entry 9's "the file's" come from code and PG, not PLAN. UNCLEAR: none left in Settings.
