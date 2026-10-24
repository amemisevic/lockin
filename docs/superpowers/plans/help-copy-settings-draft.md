# Help copy draft: Settings tab (task H1a-S, text only)
Scope ruled: Settings. Each entry follows the `src/views/helpCopy.js` format: a key, `name` (heading, used in the "?" aria-label), `text` (max 2 short plain sentences, what the app does), plus where the "?" sits and the sources. UNCLEAR = sources silent, no text.
PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `docs/design/lockin-v2/DESIGN-SPEC.md`; INV = `help-inventory.md` (Settings rows); GYM = `v2.1-gym-plan.md`; PG = `PROGRESS-GYM.md`; CLAUDE = `CLAUDE.md` Platform facts; TERMS = `help-terms-draft.md` (approved, now in `helpCopy.js`); GAP = `help-gap-draft.md`; BP = The Forge `BUILD-PLAN.md` and FCLAUDE = The Forge `CLAUDE.md` (outside the repo, cited by section only, nothing copied). Texts follow PLAN where BP differs (see Conflicts). "Code" = what `src/views/settings*.js` does today, cited only where PLAN is silent.
Review pass (this commit): entries 1, 2, 4, 7, 9 reworded to the Challenge tone and length; entry 2 now says what MED is (approved in TERMS 5); entry 11 replaced (GAP G1 and G2 already cover the Protocols and Red lines headings, built in H1f). Entries 5 and 6 are unchanged: the owner rulings on the MED version and Delete entries stand.

## 1. Zero Day threshold (`zeroDay`)
- "?": Settings, Challenge section, row `Zero Day threshold` (beside the stepper).
- name: `Zero Day threshold`
- text: "Missing this many protocols in one day makes it a Reset. Choose 2 to 5 (default 3); days you already closed do not change."
- Source: PLAN Rules, Reset ("missed protocols ≥ `settings.zeroDay` (default 3, range 2–5)"); PLAN Task 3 Review Focus 4 and Global Constraints item 4 (changing it must not rewrite finished days); BP §5 (Reset, "Zero Day" threshold, configurable in Settings, default 3). Same rule as the approved `redoBand`.

## 2. MED per week (`medPerWeek`)
- "?": Settings, Challenge section, row `MED per week` (beside the stepper).
- name: `MED per week`
- text: "How many protocols you can declare as MED, the shorter fallback version, in a Monday to Sunday week. Choose 0 to 3 (default 2)."
- Source: PLAN Rules, MED ("each declaration uses one of `settings.medPerWeek` (default 2) slots in the Mon–Sun week"; Monday-start week, last Rules line); PLAN Task 19 step 1 (stepper 0–3). "Minimum Effective Dose" is not in PLAN or SPEC; it comes from FCLAUDE "Important decisions" and the TERMS 5 ruling (`helpCopy.js` `med`), so the expansion is left to that entry and this text says only "the shorter fallback version".

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
- Source: PLAN Rules (MED: "per protocol (`protocol.med` text must exist)"); PLAN Task 15 step 1 (a switch row only for protocols that have `med` text); PLAN Task 19 step 1 (optional `MED version` text). The sheet's own hint says "once"; the Rules say one slot per declaration, so "once" is not repeated (see Conflicts 2).

## 6. Delete protocol / Delete red line — unchanged, ruling stands
- "?": Edit Protocol and Edit Red Line sheets, beside the `Delete protocol` / `Delete red line` button.
- name: `Delete`
- text: "Delete removes it from your list. Days you already closed keep the name they were filed with."
- Source: PLAN Task 19 step 1 ("delete = archive: past days keep their snapshot titles"); PLAN Global Constraints item 4 (deleting or renaming must not rewrite finished days). The confirm sheet already shows the second sentence (INV, Settings row "partly").

## 7. Weekly gym target
- "?": Settings, Gym section, row `Weekly gym target` (beside the switch).
- name: `Weekly gym target`
- text: "Your goal for gym visits each week, from 1 to 7 (default 4). The Gym tab compares each week with it, with no streak and no penalty; switched off, it shows nowhere."
- Source: GYM Rules, Weekly target ("Integer 1 to 7, default 4. Visits are compared to it; there is no streak and no penalty"); PG ruling 18 / G13 (switch and number in Settings; an off target shows no target text anywhere; shown only inside the Gym tab).

## 8. Data: where your data lives
- "?": Settings, `Data` section heading.
- name: `Your data`
- text: "Your data is stored inside this Home Screen app, separate from Safari. Deleting the Home Screen icon deletes all of it, and Export is the only backup."
- Source: CLAUDE Platform facts ("A Home Screen web app has its own storage, separate from Safari"; "Deleting the Home Screen icon deletes the data. Export (Settings) is the only backup."). The second sentence is already the on-screen footnote under Data (`settings.js`); see Needs ruling 4.

## 9. Export backup
- "?": Settings, Data section, row `Export backup`.
- name: `Export backup`
- text: "Saves all your data, gym included, as one file through the share sheet, or downloads it if sharing is not available. Last backup updates only after the file is shared or downloaded."
- Source: PLAN Data model ("Backup = the whole state as JSON"); PLAN Task 19 (`exportBackup`: share sheet, falls back to download; `markBackup`); PG ruling 17 and the G6 entry (one export stamps `lastBackup` and writes both parts into the same file). "Updates only after" is from code (`settings.js` `exportBackup`: a cancelled share is not a backup); PLAN is silent.

## 10. Import backup
- "?": Settings, Data section, row `Import backup`.
- name: `Import backup`
- text: "Choosing a backup file replaces the data in the app with the file's, after you confirm. A file that is not a Lock In v2 backup, or is damaged, is refused and nothing changes."
- Source: PLAN Task 19 step 1 (`Import backup` with `Replace everything?` confirmation); PLAN Task 1 (`validateImport`: v1 backups, empty and invalid files refused); PLAN Global Constraints item 5 (refused with a plain sentence, state untouched). A file with no gym section leaves the gym data alone (PG ruling 3), so the text says "the file's" and not "everything".

## 11. Protocols and Red lines headings — already covered
- Settings `Protocols` and `Red lines` headings already have "?" buttons (`addProtocols`, `addRedLines`), approved in GAP G1 and G2 (sources: TERMS 6, PLAN Rules, Task 19). The earlier UNCLEAR entry is withdrawn; no new text here.

## Not included
- Reminders (INV: explained on screen by the sheet steps and footnote), `Last backup` line and overdue warning (explained on screen), version line, Today's Gym card (removed in G13).

## Conflicts and needs ruling
1. MED per week: BP §5 reads "Maximum 2 MED days per week, TOTAL across all protocols"; PLAN says each declaration uses one slot (◆). Entries 2 and 5 follow PLAN (as approved for Challenge entry 4) and avoid the word "days".
2. The protocol sheet hint ("A shorter version you may declare once in the morning") does not say a declaration uses a weekly slot. Owner may want the hint aligned; this draft does not change it.
3. Entry 3 omits code-only refusals (future date, a filed day falling outside the 30 days). Entry 9's "updates only after" and entry 10's "the file's" come from code and PG, not PLAN.
4. Entry 8's second sentence repeats the on-screen footnote under Data and entry 6's second sentence repeats the delete confirm. Owner may drop either, or drop the Data "?" entirely.
5. Entry 2 relies on the approved `med` entry for what MED is (source outside PLAN and SPEC). If that entry is changed, entry 2 should follow.
6. UNCLEAR: none left in Settings. (Withdrawn: old entry 11, now covered by GAP G1 and G2.)
