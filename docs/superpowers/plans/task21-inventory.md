# Task 21 inventory (T21-0, read-only)

Branch `help`, HEAD `ec5f864` (v2.5.0). Sources: plan Task 21 (lines 596 to 603), `docs/backlog.md` (the real consolidated list), the per-task "Deferred" bullets in PROGRESS.md, `docs/HANDOFF.md` §E, `ROADMAP.md`.

**Tags:** CODE-AUDIT = Code can check or fix alone. OWNER-TRIAL = needs Armin on the iPhone. DECISION = needs Armin's ruling.
**Flags:** NEEDS RULING (core) = would change `src/core`. FROZEN-TEST = would edit a frozen test (CLAUDE.md: never, without an owner ruling).

**Findings that change the picture**
- ROADMAP says the list is "in PROGRESS.md under 'Deferred, Task 21'". No such heading exists. The list is `docs/backlog.md` (17 v2 rows plus 16 v1-era rows).
- Checked against the code at HEAD: the `.rn` rule is gone (T11-6 done). The app.js guard already covers a focused INPUT (T17-1 half done). Day 1 date input still exists (`src/views/settings.js:93`). No `safe-area` / `env()` anywhere in the CSS although `viewport-fit=cover` is set (T9-4 still open).
- `setStartDate`, `deleteProtocol`, `deleteRedLine` live in `src/views/settingsLogic.js`, `weekLabel` in `src/views/tasksLogic.js`: not `src/core`. Only `tasks.js`, `challenge.js`, `scoring.js`, `pack.js` items are core.
- Backlog was written before the six-tab icons-only bar, Gym, Motion and Help. Rows that touch the tab bar or the 440 px layout need a re-check, not a blind fix.

## A. Plan steps

| ID | Item | Tag | Flag |
|---|---|---|---|
| S1 | `mattpocock-skills:code-review` over the whole branch; fix Critical/High, log Medium/Low in backlog (branch now includes Gym, Motion, Help) | CODE-AUDIT | any fix inside `src/core` = NEEDS RULING |
| S2 | Visual pass, all screens vs `reference/*.png` at 390x844; fix deviations > 4 px (plan width 390, owner phone 440, bar and Gym differ from the PNGs by ruling) | CODE-AUDIT | which width counts = DECISION (below) |
| S3a | Tap-target script over `.btn, .chip, .tab, button` (>= 44) | CODE-AUDIT | |
| S3b | VoiceOver order on Night | OWNER-TRIAL | |
| S3c | Focus return after each sheet (fakedom proof, then VoiceOver) | CODE-AUDIT + OWNER-TRIAL | |
| S4 | Start the 14-day trial; friction notes only, no building until day 14 | OWNER-TRIAL | |

## B. Backlog rows (v2, Tasks 2 to 19)

| ID | Item | Tag | Flag |
|---|---|---|---|
| T2-1 | `setTaskStatus` clears only on `null`, not `undefined` | CODE-AUDIT | NEEDS RULING (core, `tasks.js`) |
| T2-2 | `addTask` stores the title untrimmed (sheet trims) | CODE-AUDIT | NEEDS RULING (core, `tasks.js`) |
| T2-3 | No direct test for the tie-break of two untimed tasks | CODE-AUDIT | new test file only |
| T34-1 | `challenge.test.js` (378) and `scoring.test.js` (418) exceed 300 lines; split? | DECISION | FROZEN-TEST |
| T34-2 | `submitMorning` / `closeNight` trust form field types | CODE-AUDIT | NEEDS RULING (core); views already control input, suggest leave |
| T34-3 | DST not in older test files (Task 8 and addenda cover it) | CODE-AUDIT | close, no change |
| T5-1 | Keyword test proves only the listed words (extra keyword unnoticed) | CODE-AUDIT | new test file only |
| T5-2 | Plan table line 124 names `recoveryStatus`, code uses `pendingRecovery` | CODE-AUDIT | doc only |
| T6-1 | `importPack` with an invalid pack not asserted; `missionFor` NaN/Infinity untested | CODE-AUDIT | new test file only |
| T6-2 | `isObj` copy of model.js's; `\|\|` default where `??` reads plainer | CODE-AUDIT | NEEDS RULING (core, `pack.js`); cosmetic, suggest drop |
| T7-1 | `stats` test gaps (pre-start taskLog n:null, title reading, `{}` key, archived/skip/weekdays habits) | CODE-AUDIT | new test file only |
| T7-2 | Early-days task rates (Task has no created date); ruled leave | OWNER-TRIAL | watch real data during trial |
| T9-1 | Focus does not move to the new screen's h1 on route change or Back | CODE-AUDIT | `app.js` / router, not core; VoiceOver confirm |
| T9-2 | Reduce Transparency ~50 % wall fade not built | DECISION | M5 found `prefers-reduced-transparency` unsupported on iOS Safari; suggest drop |
| T9-3 | Fixed px text, no Dynamic Type; tab label 11 px = minimum | DECISION | |
| T9-4 | Tab bar bottom 22 vs home-indicator zone, no safe-area inset in CSS | OWNER-TRIAL | re-check on the six-icon bar |
| T9-5 | 440 px wall tile fractional (~812.3 px): faint seam? | OWNER-TRIAL | |
| T10-1 | Open / failed / stalled shields share `aria-pressed=false` and one label; add state as hidden text or `aria-describedby` | CODE-AUDIT | |
| T10-2 | Focus drops to body after a tap that re-renders (also T11-m5 `⋯`) | CODE-AUDIT | VoiceOver confirm |
| T10-3 | `icon()` id rewrite follows `fill`/`stroke` `url()` only (not `href`, `clip-path`, `mask`, `filter`) | CODE-AUDIT | check no shipped icon needs it, else close |
| T10-4 | Contrast test `decl` reads first matching rule; shield drop-shadow not modelled (3.116 vs 3.1) | CODE-AUDIT | new test only; stalled shield look = OWNER-TRIAL |
| T10-5 | Chip / segmented groups with no accessible name at call sites | CODE-AUDIT | |
| T11-1 | Error live region: `role=alert` error rebuilt per re-render, sentence persists, VoiceOver re-reads (T11, T15, T16, T17 share it) | CODE-AUDIT | VoiceOver confirm |
| T11-2 | Targets < 390 px (week days 42.7 at 375, 7 chips overflow ~9 px; header overlaps Today icon at 360) | DECISION | is < 390 supported? owner phone is 440 |
| T11-3 | No undo for Delete (archive) | DECISION | |
| T11-4 | Destructive item order in `⋯` menu (HIG first, plan last) | DECISION | |
| T11-5 | Non-breaking space in "week N" eyebrow (wraps at 375) | DECISION | FROZEN-TEST (`weekLabel` tests) |
| T11-6 | Unused `.rn` rule in styles.css | CODE-AUDIT | already gone at HEAD, close |
| T12-1 | Icon re-path helper (3 copies) and torch helper duplicated | CODE-AUDIT | |
| T12-2 | Mission plate leaves a gap when a pack lacks the day | CODE-AUDIT | |
| T12-3 | Refusal and stub messages are action sheets with OK; apple-design prefers inline | DECISION | |
| T12-4 | Challenge board sections Check-ins, MED this week, Know your enemy not built | DECISION | CLAUDE.md: no new screens without spec |
| T12-5 | No MED state on the 30-cell strip | DECISION | |
| T14-1 | Router: `#mission/1e1`, `/abc`, `/-1`, `''` land on Today, not Challenge | DECISION | FROZEN-TEST (`router.test.js` pins `/abc`) |
| T14-2 | app.js textarea/input guard has no automated test | CODE-AUDIT | new test file only |
| T14-3 | Polish: War Log header spacing, two h1 on Mission, row chevrons, editor prompt, autopsy ISO title | CODE-AUDIT | |
| T15-1 | Stale afternoon draft after Back shows instead of stored answer | DECISION | ruled "deferred": reseed on entry or accept |
| T15-2 | Hint text / "optional" marking; MED counter after a Reset (apple-design) | DECISION | |
| T15-3 | Afternoon shield tap with friction field focused redraws only after blur | OWNER-TRIAL | |
| T16-1 | Textareas named by helper line; use `aria-labelledby` with the heading | CODE-AUDIT | |
| T16-2 | VoiceOver loses its place on each choice tap (whole view rebuilt) | OWNER-TRIAL | decide the fix after hearing it |
| T16-3 | No test for in-place Close gating; stale-draft and midnight guards unobservable | CODE-AUDIT | new tests |
| T16-4 | Stalled / crossed colours chosen by `:nth-child` (option class in `controls.js`) | CODE-AUDIT | |
| T16-5 | Global `.q` class in `night.css` | CODE-AUDIT | |
| T16-6 | `ARCHETYPES` duplicated from core: add drift-guard test | CODE-AUDIT | test only; a core export = NEEDS RULING |
| T16-7 | Comment at `app.js` "Tasks 16 to 19" | CODE-AUDIT | not found at line 59 any more; verify, likely done |
| T16-8 | Stale "This is final." sheet after 04:00 auto-close (no data harm) | CODE-AUDIT | |
| T16-9 | A second open tab with stale state could re-close a day (no storage listener) | DECISION | Home Screen app is single-window |
| T16-10 | Merge `night.css` into `screens.css` | DECISION | size rule (< 300 lines) |
| T17-1 | Time field loses focus/keyboard on the 30 s tick | CODE-AUDIT | `app.js:158` already guards INPUT; verify with test, check `chrome.js:36`; keyboard check on phone |
| T17-2 | Double-tap test passes without the view guard; `already-filed` not tested through view | CODE-AUDIT | new tests |
| T17-3 | `recovery.js` overwrites class names of the shared header / plate | CODE-AUDIT | |
| T17-4 | `dayNo` null not guarded (`DAY null: RESET`, unreachable) | CODE-AUDIT | view; core would be NEEDS RULING |
| T17-5 | `#recovery/garbage` keeps its hash, renders Today | DECISION | with T14-1 (router) |
| T18-1 | Reset bar both crimson; hatched or dashed bronze for "missed protocols" | CODE-AUDIT | owner already named the fix; DESIGN-SPEC wins, look = OWNER-TRIAL |
| T18-2 | Heatmap positional, no weekday labels, calendar rows only when `endDate` is Sunday | DECISION | |
| T18-3 | Pixel literals beyond tokens (bar 8, column 96, tile 32, `minmax(88px,1fr)`, 16 px marks) | CODE-AUDIT | |
| T18-4 | `Not due` legend dot ~2.6 px at 16 px | CODE-AUDIT | |
| T18-5 | Tasks tiles wrap 3 + 1 at phone widths (4 cols or 2 + 2) | DECISION | |
| T19-1 | Replace the Day 1 date input with a plain text row (ruled 2026-10-15). Also retires the `min`-after-04:00, picker-closes-on-tick and two-line-date items | DECISION | a text row cannot edit the date: confirm read-only vs tap-to-edit; not core |
| T19-2 | Pack refusal and backup refusal can read the same sentence (`The file is empty.`) | DECISION | copy change |
| T19-3 | `deleteProtocol` / `deleteRedLine` of an unknown id saves a new state | CODE-AUDIT | `settingsLogic.js`, not core |
| T19-4 | `setStartDate` refuses even the unchanged date when stored `startDate` is in the future | CODE-AUDIT | `settingsLogic.js`; moot if T19-1 removes it |
| T19-5 | File input `cancel` event needs iOS 16.4+ | OWNER-TRIAL | state the phone's iOS version |
| T19-6 | Settings has no new contrast test (token pairs already covered) | CODE-AUDIT | close |
| T19-7 | Confirm sheet copy repeats the button; chevron rows open sheets (apple-design) | DECISION | |
| CF-1 | Core-fix minors (unused `aria-describedby` gone, `touched` key, redundant `d >= first`, All >= 30d fixture) | CODE-AUDIT | informational, close |
| V1-1 | 16 v1-era rows at the top of backlog (AX5 icons, timeLog, `blockSheet`, smells, ...) | CODE-AUDIT | stale-check against v2, drop what no longer exists |

## C. Owner iPhone checks already queued (`docs/HANDOFF.md` §E, Tasks 9 to 19)

| ID | Item | Tag |
|---|---|---|
| E1 | Shell and Today: tab bar vs home indicator, wall edge and seam, frieze, stalled shield, last row clear of bar | OWNER-TRIAL |
| E2 | Challenge, Mission, War Log: typed text kept on Back/Done/30 s tick; today / future / no-mission day | OWNER-TRIAL |
| E3 | Morning and Afternoon: MED switch with keyboard up, empty target error, friction field behaviour | OWNER-TRIAL |
| E4 | Night: keyboard and Close sheet, Reset plate, Override reason, reset close to Recovery | OWNER-TRIAL |
| E5 | Recovery and Analytics: typed text kept, time-field keyboard, nudge, range kept, VoiceOver tiles | OWNER-TRIAL |
| E6 | Settings: add protocol/red line, backup export/import, Reminders copy, Day 1 picker, VoiceOver refusal | OWNER-TRIAL |

## D. Open but not Task 21 (do not mix in)

M5 NEEDS RULING (`pop` 500 ms and `rip` 650 ms over the 450 ms cap; colour fades; `.tab` curve; Reduce Transparency fallback), H-series rulings, and the unchecked phone checks of v2.2.0 to v2.5.0 live in ROADMAP "Open owner decisions" and PROGRESS. They stay there.

## E. Counts

80 items (A 6, B 68, C 6). By first tag: CODE-AUDIT 45, OWNER-TRIAL 14, DECISION 21. S3c counts as CODE-AUDIT (VoiceOver confirm follows). NEEDS RULING (core): 4 rows (T2-1, T2-2, T34-2, T6-2), plus the two conditional cases in section F.

## F. Needs a src/core change (all NEEDS RULING)

T2-1 `tasks.js` `setTaskStatus`; T2-2 `tasks.js` `addTask`; T34-2 `challenge.js` / `scoring.js` field-type trust; T6-2 `pack.js` `isObj` / `??`; T16-6 only if the drift guard becomes a core export; S1 any review finding inside `src/core`. Suggest: rule T2-1, T2-2, T34-2, T6-2 as "leave" (no defect today, views control input); that makes Task 21 core-free.

## G. Proposed order (smallest and safest first)

1. **Backlog clean-up, docs only.** Stale-check every row against HEAD (T11-6, T16-7, T17-1, V1-1, CF-1, T34-3, T19-6 close), fix the ROADMAP pointer to `docs/backlog.md`, send Armin the DECISION list in one batch. No src change.
2. **New tests only** (new files, no frozen test touched): T2-3, T5-1, T6-1, T7-1, T10-4, T14-2, T16-3, T16-6, T17-2; plus S3a tap-target script. Failing-first only where a real gap shows.
3. **S1 whole-branch code review.** Fix Critical/High, log Medium/Low in `docs/backlog.md`. Any core finding stops for a ruling.
4. **Non-core fixes in small commits, after the rulings:** accessibility group (T10-1, T10-2, T11-1, T16-1, T9-1, S3c), then CSS/markup group (T16-4, T16-5, T17-3, T12-1, T12-2, T14-3, T18-1, T18-3, T18-4), then T19-1/3/4 once T19-1 is ruled.
5. **S2 visual pass in the browser pane, then the owner's iPhone batch** (section C, T9-4, T9-5, T10-4 look, T15-3, T16-2, T19-5, S3b) and **S4 start the 14-day trial**. Release only through the release task (VERSION rule).

DECISION batch for Armin (step 1): T34-1, T9-2, T9-3, T11-2, T11-3, T11-4, T11-5, T12-3, T12-4, T12-5, T14-1/T17-5, T15-1, T15-2, T16-9, T16-10, T18-2, T18-5, T19-1, T19-2, T19-7, plus S2 width (390 per plan or 440 phone) and the four core rulings in F.
