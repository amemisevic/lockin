# Help button inventory (task H0, read-only)
Candidates for a "?" help button, per tab. Nothing here is a ruling. "unclear" = plan and spec say nothing usable (see Needs ruling).
PLAN = `2026-10-12-lockin-v2-app.md`; SPEC = `docs/design/lockin-v2/DESIGN-SPEC.md`; GYM = `v2.1-gym-plan.md`; PG = `PROGRESS-GYM.md` Decisions. Code read: `src/views/*`, `src/core/challenge.js`, `scoring.js`. "On screen": yes / partly / no.

## Today
| Feature | Rule as written | On screen |
|---|---|---|
| Streak (`N-day streak`) | PLAN Rules: "Streak = consecutive `passed` days ending at the latest closed day; computed from `days`, never stored. `redo`/`reset` end it." | no: pill only, hidden at 0 |
| Night opens 20:00 | SPEC §8: "Night opens at 20:00." PLAN Task 3 says 18:00 (stale; code uses 20:00) | yes: "Night opens 20:00" before 20:00 |
| Close yesterday | PLAN Rules: "when the 04:00 grace after the day ends passes, the day auto-closes as `redo`... No late filing." | partly: "Close yesterday first."; 04:00 not shown |
| `No MED today. Yesterday was a Reset.` | PLAN Rules MED: "refused if the day is a forced full pass" | partly: says why, not what a forced full pass is |
| Gym card `Gym 3/4 this week` | GYM Rules, Weekly target: "there is no streak and no penalty" | no |

## Tasks
| Feature | Rule as written | On screen |
|---|---|---|
| Shield toggle, Stalled | SPEC §5: "Task states: open / done ... / failed / stalled"; "stalled is visually distinct and counts for nothing." | partly: icon only; Stalled caption on Night only |
| Habits, 7-day dots, past days | PLAN Task 11: "habits section with 7-day dots"; "Past dates are read-only except the shield toggle" | no |
| Skip today / Move to tomorrow / Delete task | PLAN Task 11: "`Delete task` (destructive; archives, history kept)" | no: labels only |

## Challenge (includes the three check-ins and Recovery)
| Feature | Rule as written | On screen |
|---|---|---|
| Day 0 / Begin Day 1 | PLAN Rules: "Begin Day 1 requires: War Log entries `contract`, `funeral`, `code`, `redlines-w1` non-empty; >= 1 protocol; >= 1 red line." | yes: checklist, first missing reason |
| Oath entries | PLAN Rules/Task 5: keys and titles only; what to write is silent | no. unclear |
| Protocol | PLAN Data model: `Protocol { id, title, med }`; missed ones drive Redo/Reset. No definition | no. unclear |
| Red line | PLAN Rules, Reset: "any red line crossed"; Redo "Never covers a red line"; MED "never on red lines" | yes: "crossing one = Reset"; Night "A crossed red line is a Reset by itself." |
| Passed / Redo / Reset | PLAN Rules: Passed "0 missed, no red line crossed, no declared Redo"; Redo "`1 <= missed < zeroDay`"; Reset "red line crossed; or missed protocols >= `settings.zeroDay`" | partly: legend words, Night reasons; Redo band not shown |
| Reset effects | PLAN Rules: "streak -> 0; day count keeps going; Recovery due 24 h after close; next day is a forced full pass (no MED)" | yes: three chips on Recovery |
| Declared Redo | PLAN Rules: "once per challenge ... only for today, before the day closes. Never covers a red line." "Breaks the streak. Next day ... forced full pass." | partly: sheet has once, today, red line; not streak or no-MED |
| Auto Redo (no night filed) | PLAN Rules: "auto-closes as `redo` with `auto:'no-night'`. No late filing." | no |
| Check-in gating | PLAN Rules: "A day counts only if Morning and Night are both submitted. Afternoon is optional, zero penalty." Morning missing: "minimum `redo`" | partly: Night reason "No morning check-in"; Afternoon "Provisional — finalizes tonight" |
| MED (declare) | PLAN Rules: "declared only inside the Morning submit, per protocol ... uses one of `settings.medPerWeek` slots in the Mon-Sun week; refused if the day is a forced full pass; ... not retroactive. A MED protocol counts as held at night." | partly: "N of M MED used this week", disabled reasons, `MED (declared this morning)`. Meaning of MED: unclear |
| `Red line at risk today?` | PLAN Task 15: optional text, stored as `risk`; no scoring rule | no. unclear |
| Top G win / Bottom G's move | PLAN Task 16 item 4: "Top G win text; Bottom G tactic: archetype chips (5) -> tactic chips ... -> `Something else`". CLAUDE.md points to Rules; Rules has no entry | partly: "Which tactic did your enemy use? Optional on a clean day."; "One sentence". Terms unclear |
| Slipped without knowing | PLAN Rules: "note only (`slipNote`); no effect on result or streak." | no: label "Optional." |
| Override / `Close the day` | PLAN Rules: "requires a non-empty reason; stored on the day." Task 16: "This is final." | yes: Reason field, "cannot be overridden" for red lines, final sheet |
| Recovery Protocol | PLAN Rules: "five fields (state, time, place, decision, change). `change` and `decision` go through `checkVague`. Pending Recovery is a non-blocking banner; overdue ... turns crimson, nothing else changes." | partly: "File within 24 hours", countdown, nudge; not "non-blocking" |
| Vague check | PLAN Task 5: trimmed length >= 15, >= 3 words, one action verb (a ◆ call, overrulable) | partly: nudge `Too vague...` only |
| Forced full pass | PLAN Rules (Reset/Redo): "next day is a forced full pass (no MED)" | partly: `No MED today...` lines |
| Graduation | PLAN Rules: "Day 30 closed (any result) -> graduation plate ... No new-challenge flow in v2" | partly: `YOU FINISHED`; no "no restart" line |

## Analytics
| Feature | Rule as written | On screen |
|---|---|---|
| Range 7d / 30d / All | PLAN Task 18: "Range segmented `7d · 30d · All`". Which sections ignore it: not in the plan | no. unclear |
| Pass rate, Reset causes, enemy tactics | PLAN Task 7: pass rate "passed / closed days; null when none"; `resetCauses`; `tacticCounts` | partly: headings; `NN%` or `—` |
| Held / MED / Missed bars | PLAN Task 7 `protocolRates` | yes: labelled counts |
| Weekday bars, 28-day heatmap, task totals | PLAN Task 7: "habit tasks, Mon=0"; heatmap 28 days; `taskTotals` (done, failed, stalled, open). Cell levels not defined | no. unclear |

## Settings
| Feature | Rule as written | On screen |
|---|---|---|
| Zero Day threshold | PLAN Rules: "default 3, range 2-5"; Redo band `1 <= missed < zeroDay` | partly: "Missed protocols in one day that make it a Reset"; Redo band not shown |
| MED per week | PLAN Rules: "default 2"; Task 19: stepper 0-3; Monday-start week | partly: "Declared in the morning only"; week start not shown |
| Protocol sheet: MED version, delete | PLAN Task 19: "optional `MED version` text"; delete = archive, "past days keep their snapshot titles" | partly: hint for MED version; delete: no |
| Day 1 date | PLAN Calls: "Day 1 date locked after the first closed day" | yes: error sentences, read-only row |
| Pack, Reminders, Backup | PLAN Rules/Task 19: missions and tactics only by pack import; Shortcuts reminders; CLAUDE.md "Export is the only backup" | yes: pack summary, steps, footnote, overdue line |
| Weekly gym target | GYM Rules: "Integer 1 to 7, default 4 ... no streak and no penalty" | partly: "Compare each week to a number of visits" |

## Gym
| Feature | Rule as written | On screen |
|---|---|---|
| Visit | GYM Rules: "A local calendar date with at least one finished workout. Unfinished workouts never count." Two on one day = 1 | no: `3 of 4 visits` |
| Warm-up set | GYM Rules: only "done, non-warm-up sets" count for Finish, Volume, Sets per muscle, 1RM | no: toggle only |
| Estimated 1RM | GYM Rules: "Epley, weight x (1 + reps / 30) ... only ... weight > 0 and 1 to 10 reps." | partly: name on Stats link; chart titled "Weight progress" |
| PR | GYM Rules: "strictly higher than every earlier qualifying set ... first ever performance is the baseline, not a PR." PG ruling 5: plain text "PR" | no: the word PR |
| Sets per muscle | GYM Rules: "credited to the exercise's primary muscle only" | no |
| Prefill, open workout from an earlier day | GYM Rules: set i takes last time's set i; open workout "Never auto-finished, never auto-deleted." | partly: last-time card, "Started <day>" |
| Finish needs a working set | GYM Rules: "otherwise refused with `no-sets`" | yes: error sentence |

## Needs ruling
1. Night time: PLAN Task 3 and Calls say 18:00; SPEC §8 and code say 20:00. Plan text is stale.
2. Top G / Bottom G: no definition in Rules, so help copy would be invented.
3. What MED stands for: not stated anywhere. Likewise Contract/Funeral/Code/Week 1 red lines content, "Protocol", `risk`.
4. Analytics: which sections ignore the range, what heatmap levels mean.
5. Help copy that states a rule the UI never shows (Redo band, 04:00 grace, non-blocking Recovery) needs the owner's wording.
