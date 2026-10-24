# Help copy draft: Settings tab (task H1a-S, text only)
Scope ruled: Settings. Each entry: where the "?" sits, help text (max 2 short sentences, what the app does), sources. UNCLEAR = sources silent, no text.
PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `docs/design/lockin-v2/DESIGN-SPEC.md`; INV = `help-inventory.md` (Settings rows); GYM = `v2.1-gym-plan.md`; PG = `PROGRESS-GYM.md`; CLAUDE = `CLAUDE.md` Platform facts; BP = the Forge BUILD-PLAN (outside the repo; cited by section only, nothing copied). Texts follow PLAN where BP differs (see Conflicts). "Code" = what `src/views/settings*.js` does today, cited only where PLAN is silent.

## 1. Zero Day threshold
- "?": Settings, Challenge section, row `Zero Day threshold` (beside the stepper).
- Text: "The number of missed protocols in one day that makes it a Reset; you can set 2 to 5 (default 3). Changing it does not change days you have already closed."
- Source: PLAN Rules (Reset: "`settings.zeroDay` (default 3, range 2-5)"); PLAN Global Constraints item 4 and Task 3 Review Focus 4 (changing it must not rewrite finished days); BP §5 (Reset, the "Zero Day" threshold).

## 2. MED per week
- "?": Settings, Challenge section, row `MED per week` (beside the stepper).
- Text: "How many MED declarations you can make in a Monday to Sunday week; each protocol you declare uses one. You can set 0 to 3 (default 2), and MED is declared in the morning only."
- Source: PLAN Rules (MED: "each declaration uses one of `settings.medPerWeek` (default 2) slots in the Mon-Sun week"; "declared only inside the Morning submit"; last line, Monday-start week); PLAN Task 19 step 1 (stepper 0-3). What MED stands for: UNCLEAR, not expanded.

## 3. Day 1 date
- "?": Settings, Challenge section, row `Day 1` (`The day the 30 days count from`).
- Text: "The day your 30 days count from. You can change it only until the first day is closed."
- Source: PLAN Task 19 step 1 ("editable only while no day is closed, otherwise read-only"); PLAN Calls ("Day 1 date locked after the first closed day"). Code also refuses a future date and a move that leaves a filed day outside the 30 days; PLAN does not say so, so the text does not.

## 4. Challenge pack (import)
- "?": Settings, Challenge section, row `Challenge pack`, beside `Import pack` / `Re-import`.
- Text: "A pack is a file of daily missions (Day 1 to 30) and optional Bottom G tactics; it is the only way they get into the app. Importing replaces the current pack."
- Source: PLAN Task 6 (`{v:1, missions:[{day 1..30, title, body}], tactics}`, `tactics` optional, `importPack` replaces `state.pack`); PLAN Global Constraints ("Missions and tactics reach the phone only through Settings -> Import pack"); PLAN Task 19 step 1 (`Replace the current pack?`).

## 5. MED version (protocol sheet)
- "?": New / Edit Protocol sheet, field `MED version (optional)`.
- Text: "A shorter version of this protocol that you may declare in the morning, using one of your weekly MED slots. A protocol with no MED version cannot be declared."
- Source: PLAN Rules (MED: "per protocol (`protocol.med` text must exist)"); PLAN Task 15 step 1 (a switch row only for protocols that have `med` text); PLAN Task 19 step 1 (optional `MED version` text). The sheet's own hint says "once"; the Rules say one slot per declaration, so "once" is not repeated (see Conflicts).

## 6. Delete protocol / Delete red line
- "?": Edit Protocol and Edit Red Line sheets, beside the `Delete protocol` / `Delete red line` button.
- Text: "Delete removes it from your list. Days you already closed keep the name they were filed with."
- Source: PLAN Task 19 step 1 ("delete = archive: past days keep their snapshot titles"); PLAN Global Constraints item 4 (deleting or renaming must not rewrite finished days). The confirm sheet already shows the second sentence (INV, Settings row "partly").

## 7. Weekly gym target
- "?": Settings, Gym section, row `Weekly gym target` (beside the switch).
- Text: "A switch and a number for your weekly gym goal, from 1 to 7 visits (default 4); off hides it everywhere. The Gym tab compares each week's visits with it, with no streak and no penalty."
- Source: GYM Rules (Weekly target: "Integer 1 to 7, default 4 ... there is no streak and no penalty"); PG ruling 18 / G13 (switch and number in Settings; off shows no target text anywhere; shown only inside the Gym tab).

## 8. Data: where your data lives
- "?": Settings, `Data` section heading.
- Text: "Your data is stored inside this Home Screen app, separate from Safari, and deleting the Home Screen icon deletes all of it. Export is the only backup."
- Source: CLAUDE Platform facts ("A Home Screen web app has its own storage, separate from Safari"; "Deleting the Home Screen icon deletes the data. Export (Settings) is the only backup."). Same facts as the on-screen footnote under Data.

## 9. Export backup
- "?": Settings, Data section, row `Export backup`.
- Text: "Saves everything, gym data included, as one file through the share sheet, or downloads it when sharing is not available. Last backup changes only after the file is shared or downloaded."
- Source: PLAN Data model ("Backup = the whole state as JSON"); PLAN Task 19 (`exportBackup`: share sheet, falls back to download; `markBackup`); PG ruling 17 and the G6 entry (one export stamps `lastBackup` and writes both parts into the same file). "Changes only after" is from code (`settings.js` `exportBackup`, a cancelled share is not a backup); PLAN is silent.

## 10. Import backup
- "?": Settings, Data section, row `Import backup`.
- Text: "Choosing a backup file replaces the data in the app with the file's, after you confirm. A file that is not a Lock In v2 backup, or is damaged, is refused and nothing changes."
- Source: PLAN Task 19 step 1 (`Import backup` with `Replace everything?` confirmation); PLAN Task 1 (`validateImport`: v1 backups, empty and invalid files refused); PLAN Global Constraints item 5 (refused with a plain sentence, state untouched). A file with no gym section replaces only the challenge data (PG ruling 3), so the text says "the file's" and not "everything".

## 11. What to put in Protocols and Red lines
- "?": Settings, `Protocols` and `Red lines` section headings.
- UNCLEAR. PLAN Rules, Task 19 and SPEC give the mechanics (a missed protocol counts toward the Zero Day threshold, a crossed red line is a Reset) but never say what a protocol or a red line should contain; SPEC §7 says they are typed by the user at runtime. No text. What MED stands for is also UNCLEAR.

## Not included
- Reminders (INV: explained on screen by the sheet steps and footnote), `Last backup` line and overdue warning (explained on screen), version line, Today's Gym card (removed in G13).

## Conflicts and needs ruling
1. MED per week: BP §5 reads "Maximum 2 MED days per week, TOTAL across all protocols"; PLAN says each declaration uses one slot (◆). Entries 2 and 5 follow PLAN (as approved for Challenge entry 4) and avoid the word "days".
2. The protocol sheet hint ("A shorter version you may declare once in the morning") does not say a declaration uses a weekly slot. Owner may want the hint aligned; this draft does not change it.
3. Entry 3 omits code-only refusals (future date, a filed day falling outside the 30 days). Entry 9's "changes only after" and entry 10's "the file's" come from code and PG, not PLAN.
4. Entry 6 repeats a sentence the delete confirm sheet already shows; owner may drop it.
5. UNCLEAR, no text: entry 11 (what a protocol or red line contains, what MED stands for).
