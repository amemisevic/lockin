# Lock In v2 — progress

Plan: `docs/superpowers/plans/2026-10-12-lockin-v2-app.md`. One entry per task, appended at the end of the task and committed with it.

## Task 0: Branch, import the design, amend the rules
- Commits: `961ac76` docs: import v2 design, amend rules; `0e4d200` docs: align CLAUDE.md with v2 plan; `70af5a0` docs: add progress ledger; "docs: fix CLAUDE.md icons, copy and sample-data rules" (the commit that adds this line; a commit cannot contain its own hash, see `git log`).
- Commands:
  - `npm test` → exit 0, 87/87 pass (before, after `961ac76`, after `0e4d200`).
  - Python `zipfile` byte compare of `docs/design/lockin-v2/` against the design zip → 65 files compared, 0 differ.
  - `git grep -n -E "<sample mockup strings>" f791613` → exit 1 (no hits in the already-pushed commit).
  - `git ls-remote origin v2` → `f791613` (nothing pushed).
- Ambiguities and choices:
  - `git switch -c v2`: branch already existed on origin; checked it out in a separate worktree instead.
  - Zip root folder is `lockin-v2-design/`; stripped it on extract. The zip itself is not committed.
  - `README.md` and `CLAUDE-CODE-PROMPTS.md` from the zip not imported (not in the plan's list; superseded prompts).
  - Owner's "Design skills" block placed as its own section after "Hard rules".
  - v1 spec §1.11 (in the Files list but no step): one line saying the v2 items are now built.
  - v1 spec §1.1–1.8: one "superseded" line under §1 rather than one per subsection.
  - Mockups contain sample red-line and schedule strings: owner confirmed they are sample, not real; kept as is.
  - CLAUDE.md aligned (owner request): intro, reminder pointer → plan Task 19, VERSION bump only in Task 20, icons only from `docs/design/lockin-v2/assets/icons`.
  - v1 spec §1.9 (times/texts differ from Task 19) and §3.1–3.8, §3.10 (replaced by DESIGN-SPEC) marked superseded; §3.9 kept (Task 21 uses it).
  - Icons rule widened to the inline SVGs in `docs/design/lockin-v2/static/` (plus, ⋯, back chevron and row chevron all exist there); missing ones are drawn inline and listed here.
  - Exact copy: slip message removed (`grep -n "Costs one day"` on the plan → exit 1); now the plan's fixed strings (Recovery nudge, tab names) plus the Task 19 reminder texts.
  - No-personal-data rule: mockup sample data stays in `docs/design/lockin-v2/`, never copied into src/, tests, defaults or seeds.
  - PROGRESS.md instruction moved to item 1 of "Read first"; plan item 2, DESIGN-SPEC item 3.
  - Exact copy limited to the plan's fixed strings; reminder texts are overrulable (◆).
- Next: Task 1.

## Task 1: State model and store (`lockin.v2`)
- Commit: "feat(core): v2 state model and store" (code, tests and this entry in one commit; a commit cannot contain its own hash, see `git log`). Base `bba5b0a`.
- Files: `src/core/model.js` (75 lines), `src/core/store.js` (43), `tests/core-store.test.js` (170, new, written first), `sw.js` (ASSETS += the two files; VERSION unchanged).
- Model: explicit `claude-sonnet-5-5` was rejected by the Agent tool (allowed: sonnet/opus/haiku/fable); implementer and reviewer ran on the session model (Opus 5.5). No retry.
- Commands:
  - `node --test tests/core-store.test.js` before code → exit 1 (ERR_MODULE_NOT_FOUND, expected RED).
  - `node --test tests/core-store.test.js` after code → exit 0, 54/54 pass.
  - `npm test` → exit 0, 141/141 pass (87 v1 + 54 new).
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 4 Minor (deferred, listed for the owner).
- Ambiguities and choices:
  - `load(storage, today)` keeps the plan signature; `today` unused (v2 `defaultState()` takes no date).
  - Import of `v === 1` → the plan's v1 sentence; any other non-object or `v !== 2` → "This is not a Lock In v2 backup."; other damage → "The backup's <section> is/are damaged."
  - Implementer did not commit; one task commit made after review so this entry ships with it.
  - `zeroDay` integer 2–5 (Rules range); `medPerWeek` integer 0–3 (Task 1 test).
  - Archetype ids validated as strings only, not against the 5 fixed ids (an over-strict load would send real data to the corrupt copy).
  - `night.bottomG` must be an object (model has no null); Task 16 stores empty strings or the model gains `null` then.
  - v1 `fill` step dropped: v2 has no optional fields yet.
  - `task.skip` = string[], `pack.missions[].day` = finite number, warLog keys = any string (not pattern-checked).
- Deferred:
  - Task 19: import must guard non-string input (`typeof text !== 'string'`); `backupStatus` treats a future `lastBackup` (days < 0) as overdue.
  - Task 16: `night.bottomG` cannot be null in the model; decide there (empty strings or allow null).
  - Skipped: format-only `isDate`/`isTime` checks (matches the plan's regex rule).
  - Model: the Agent tool accepts only sonnet/opus/haiku/fable; `sonnet` 404s; all subagents run on the session model (Opus). Do not try model names again.
- Next: Task 2 (Tasks core).

## Task 2: Tasks core
- Commits: `1f2bdfa` test(core): tasks and habits (failing, WIP) — test file only, never edited afterwards (`git diff --quiet 1f2bdfa -- tests/tasks.test.js` → exit 0); "feat(core): tasks and habits" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `57bfabb`.
- Files: `src/core/tasks.js` (66 lines, new), `tests/tasks.test.js` (152, new, written first), `sw.js` (ASSETS += `src/core/tasks.js`; VERSION unchanged).
- Commands:
  - `node --test tests/tasks.test.js` before code → exit 1 (ERR_MODULE_NOT_FOUND, expected RED; reproduced by the controller).
  - `node --test tests/tasks.test.js` after code → exit 0, 18/18 pass.
  - `npm test` → exit 0, 159/159 pass (141 + 18 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\(" src/core/tasks.js` → exit 1.
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 3 Minor (all skipped, below).
- Ambiguities and choices:
  - Owner asked for the failing tests as a separate WIP commit first; that overrides CLAUDE.md "never commit failing tests" for this task.
  - `validateTask` order: title, times, end > start, custom days. Plan's literal `{start:'10:00',end:'09:00'}` has no title, so tests spread a valid base draft.
  - Times: null, undefined or '' = absent; each present time must pass `toMin`; end > start only when both set; end without start allowed; equal start/end refused.
  - `setTaskStatus(..., null)` deletes the key and keeps `taskLog[date]` (may be `{}`, which `validateState` accepts).
  - `addTask` fills defaults (`note:''`, times/date null, `repeat:{type:'none',days:[]}`, `skip:[]`, `archived:false`), then draft, then id; no validation inside (views call `validateTask`).
  - `habitDots` uses `isDue`: archived, skipped and unscheduled days are `'off'`; unknown id → seven `'off'`.
  - `skipOn` idempotent; `updateTask` never changes `id`; unknown ids return the same state; `tasksOn` returns due tasks only, ties broken by title (`localeCompare`).
- Deferred:
  - Task 10/11/16: `setTaskStatus` clears only on `null`; callers must never pass `undefined` (would store an invalid status). Skipped: contract is `status|null`, and a fix needs a new test.
  - Task 11: `addTask` stores the title untrimmed; the sheet trims before saving. Skipped: spec does not require it.
  - Skipped: no direct test for the tie-break between two untimed tasks (correct by inspection; test file frozen after WIP commit).
  - Tasks 10/11/16 briefs: pass null, never undefined, to setTaskStatus; trim titles in the Task 11 sheet before saving.
- Next: Task 3 (Challenge core).

## Task 3: Challenge core (start, morning, afternoon, MED, declared Redo)
- Commits: `dfaff3b` test(core): challenge, morning, MED, declared redo (failing, WIP) — test file only, never edited afterwards (`git diff --quiet dfaff3b -- tests/challenge.test.js` → exit 0); "feat(core): challenge, morning, MED, declared redo" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `894bee0`.
- Files: `src/core/challenge.js` (107 lines, new), `tests/challenge.test.js` (378, new, written first), `sw.js` (ASSETS += `src/core/challenge.js`; VERSION unchanged).
- Commands:
  - `node --test tests/challenge.test.js` at `dfaff3b` (before code) → exit 1 (ERR_MODULE_NOT_FOUND, expected RED; reproduced by the controller in a temporary worktree).
  - `node --test tests/challenge.test.js` after code → exit 0, 32/32 pass.
  - `npm test` → exit 0, 191/191 pass (159 + 32 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" src/core/challenge.js` → exit 1.
- Review: spec ✅, quality Approved; 0 Critical, 1 Important (plan gap, escalated to the owner, below), 5 Minor (all skipped, below). Every Rules clause Task 3 touches has a test except "Declared Redo only for today" (enforced by the caller passing `today`).
- Ambiguities and choices:
  - Time source: `submitMorning(state, today, form, nowMs = Date.now())` and `submitAfternoon(..., nowMs = Date.now())`; the model needs `at: ms`, the plan signature has no clock. Tests pass `nowMs`.
  - Error sentences the plan does not give: not active `The challenge is not active today.`; closed `This day is already closed.`; second start `The challenge has already started.`; MED refusals in `submitMorning` reuse plan strings (`No MED today. Yesterday was a Reset.` / `…a declared Redo.`, `Weekly limit reached.`) plus `This protocol has no MED version.`
  - Check order: `startChallenge` existing → oath → protocols → red lines (counts only); `submitMorning` not active → closed → already filed → target → MED; `declareRedo` redoUsed → not active → closed.
  - `medCheck` order no-protocol → no-med (null or blank) → forced → cap; red line ids are `no-protocol` (how "never on red lines" holds).
  - `submitMorning` dedupes MED ids; each counts the earlier ids of the same submit; the first failure refuses the whole submit.
  - `forcedFullPass`: previous calendar day `reset` or `declaredRedo`; a plain `redo` does not force.
  - `submitAfternoon` returns the same state when not active, closed, or `onTrack` invalid; no morning needed; `friction` kept only for `struggling`.
  - `nextAction`: recovery in any phase; morning/afternoon/night only when today is active and not closed; follows the plan's order literally (no morning at 19:00 → `'morning'`).
  - `target` must be non-blank, stored untrimmed; `risk ?? ''`, `med ?? []`.
- Owner ruling on review Important #1 (a MED for D+1 filed after midnight while D is open; D then closes as Reset): `submitMorning` is refused with `Close yesterday first.` only when all hold: the submitted date equals the local date of `nowMs`, the local time of `nowMs` is before 04:00, and the previous calendar day is an active challenge day (1..30) with no result. Otherwise unchanged. Whole morning refused (with or without MED), no partial write; checked after "already filed", before the target. First version (any time of day) broke the frozen test `MED cap: two on Mon + Tue block a third on Wed; next Monday resets the count` (31/32, exit 1, shown to the owner); `tests/challenge.test.js` was not edited.
- Owner ruling on the "Declared Redo only for today" gap: `declareRedo(state, date, nowMs)`; when `nowMs` is given and `date` is not its local date → `You can only declare a Redo for today.` (checked after redoUsed). `nowMs` is optional so the frozen tests stay clock-independent.
- Fix commits: `738e6b8` test(core): morning blocked while yesterday is open (failing, WIP) — `tests/challenge-midnight.test.js` (75 lines, cases a–h); "fix(core): block morning while yesterday is open" (`src/core/challenge.js` 107 → 116 lines and this entry).
  - `node --test tests/challenge-midnight.test.js` before code → exit 1, 5/8 pass (a, b, f fail on AssertionError; c, d, e, g, h are guards that already held).
  - after code → exit 0, 8/8 pass. `npm test` → exit 0, 199/199 pass.
- Deferred:
  - Task 12/15: Today's morning button must route to yesterday's night while yesterday is open, and show 'Close yesterday first.'; nextAction should return 'night' for yesterday in that window.
  - Task 13: the Declare Redo confirm must pass `Date.now()` as `declareRedo`'s third argument (without it the today check is skipped).
  - Skipped: `submitMorning` accepts a past date that is still open when the clock date differs (case h; callers pass today; `settleMissed` runs first).
  - Task 4: add a test that runs the real closeNight with a Reset on day D, then submitMorning for D+1 at 00:30 with a MED, and expects the forced-pass refusal (case e currently uses a hand-built closed day).
  - Task 12: `nextAction` does not cover yesterday's open night after midnight; Today uses `nightTargets` for that card.
  - Skipped: a few success paths lack a `validateState` assert (sibling paths have it; Task 8 flow test covers).
  - Skipped: `tests/challenge.test.js` is 378 lines (> 300 target); frozen, splitting is an owner call.
  - Skipped: `submitMorning` trusts the form's shape (string `med`, non-string `risk`); the Task 15 view controls input.
- Next: Task 4 (Scoring, night close, settle, streaks).

## Task 4: Scoring, night close, settle, streaks
- Commits: `a7ae168` test(core): scoring, night close, settle, streaks (failing, WIP) — test file only, never edited afterwards (`git diff --quiet a7ae168 -- tests/scoring.test.js` → exit 0); "feat(core): scoring, night close, settle, streaks" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `81adaa5`.
- Files: `src/core/scoring.js` (120 lines, new), `tests/scoring.test.js` (417, new, written first), `sw.js` (ASSETS += `src/core/scoring.js`; VERSION unchanged).
- Commands:
  - `node --test tests/scoring.test.js` at `a7ae168` (before code) → exit 1 (ERR_MODULE_NOT_FOUND, expected RED; reproduced by the controller in a temporary worktree).
  - `node --test tests/scoring.test.js` after code → exit 0, 21/21 pass.
  - `npm test` → exit 0, 220/220 pass (199 + 21 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" src/core/scoring.js` → exit 1.
- Tests include: hand-computed expected values quoting the Rules on every scoring path; the Task 3 deferred end-to-end case (real `closeNight` Reset on D closed at D+1 00:20, then `submitMorning` D+1 00:30 with MED → `No MED today. Yesterday was a Reset.`; without MED accepted); a DST case for `settleMissed` run with `spawnSync` in `TZ=Europe/Sarajevo` (2026-10-25 25 h day, 2026-03-29 23 h day; each auto-close at local 04:00).
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 6 Minor (2 need an owner ruling, 4 skipped, below). Only Rules clause touched with no direct test: "Afternoon is optional, zero penalty" for a negative afternoon answer (scoring never reads `afternoon`).
- Ambiguities and choices (controller rulings R1–R11; none changes a result the plan defines):
  - `'not-closable'` = date not in `nightTargets(state, nowMs)` (future date, or past date after its 04:00 grace) — this is "No late filing". Error order: closed → not-active → not-closable → tasks-open → protocols-unanswered → redlines-unanswered → override-reason.
  - `suggestResult`: result = first matching rule in the plan's order; `reasons` lists every rule that applies, in order. Strings `Red line crossed`, `N protocol(s) missed` (singular for 1, listed once), `Declared Redo`, `No morning check-in`. `med` counts as held.
  - Override: result must be passed|redo|reset and reason non-blank, else `'override-reason'`; no restriction on direction (plan: `result = override?.result ?? suggested`). Recovery is created only when the final result is `reset`.
  - MED ids from the day's morning are stored `med` whatever the form says. Snapshots from current `challenge.protocols`/`redLines`; unknown form ids ignored.
  - Tasks: every open due task needs a valid status in `form.tasks`; valid statuses for due tasks are written with `setTaskStatus`.
  - `bottomG.archetype/tactic` null → `''` (model validator needs strings; Task 1 deferral settled for the core). `win`, `slipNote` default `''`.
  - `settleMissed` skips closed days (the plan's "while … no closedAt" read literally would stop at the first closed day); stops after day `length`; `closedAt` = that 04:00; keeps morning/afternoon/declaredRedo/slipNote; no Recovery; returns the same object when nothing changes.
  - `nightTargets` ascending (yesterday first). Streaks read closed days only, sorted by date; no calendar-gap check (plan: "only closed days").
- Owner rulings A and B resolved the two scoring questions this review raised (closing today while yesterday is open; overriding a red-line reset). See "Task 4 follow-up" below.
- Deferred:
  - Skipped: `tests/scoring.test.js` is 417 lines (> 300 target); frozen, splitting is an owner call.
  - Skipped: `nightTargets`/`closeNight` not exercised under DST, boundary tested to the minute, streak table rows lack per-row derivation — Task 8 flow/tz tests cover; `scoring.test.js` frozen. (The `struggling` afternoon and hand-derived streak cases are now in `tests/scoring-addenda.test.js`.)
  - Skipped: `closeNight` trusts the form's text field types (`win`, `slipNote`, `bottomG.*`); the Task 16 view controls input.
  - Skipped: the missed-protocol reason is listed once when both missed rules apply (text only).
  - Task 16: the night form must pass strings (never null) for `win`/`slipNote`, and route to yesterday while it is a night target.

## Task 4 follow-up: owner rulings A and B
- Commits: `497ed1e` test(core): red-line reset cannot be overridden (failing, WIP) - ruling B; `4a27a06` test(core): night-close ordering rulings (failing, WIP); "feat(core): night-close rulings A and B" (implementation and this entry; a commit cannot contain its own hash, see `git log`). Base `50084fb`.
- Ruling A (owner): `closeNight(state, date, form, nowMs)` refuses `{ok:false, error:'yesterday-open'}` ("Close yesterday first.") when `date` is the local date of `nowMs`, local time < 04:00, and the previous calendar day is an active challenge day with no result. It reuses Task 3's predicate: `yesterdayOpen` in `src/core/challenge.js` gained only the word `export`, and `submitMorning` still calls the same function. Closing today stays allowed when yesterday is closed or not an active day.
- Ruling B (owner): if any red line is answered crossed, an override with result `passed` or `redo` is refused `{ok:false, error:'red-line-override'}` ("A crossed red line cannot be overridden."). Override `reset` on a crossed red line stays allowed. Overrides in every other situation are unchanged. Intentionally still allowed: overriding a `missed >= zeroDay` reset (owner may revisit).
- Message texts are exported as `NIGHT_TEXT` from `src/core/scoring.js` (controller choice); the result shape stays `{ok:false, error:<code>}`.
- closeNight error order now: closed → not-active → not-closable → yesterday-open → tasks-open → protocols-unanswered → redlines-unanswered → override-reason → red-line-override.
- Sole authorized edit to a frozen test (owner): `tests/scoring.test.js`, the crossed-red-line override-to-redo block (old L149-153: comment plus four lines) now expects the ruling-B refusal. `git diff a7ae168 -- tests/scoring.test.js` is a single hunk `@@ -146,11 +146,12 @@`. No other existing test file changed.
- Files: `src/core/scoring.js` (120 → 126 lines), `src/core/challenge.js` (`export` only, 116 lines), `tests/scoring-addenda.test.js` (153, new, written first), `tests/scoring.test.js` (one block, above).
- Commands:
  - `node --test tests/scoring.test.js` at `497ed1e` → exit 1, 20/21 (only the edited ruling-B test fails). Reproduced by the controller in a temporary worktree.
  - `node --test tests/scoring-addenda.test.js` at `4a27a06` → exit 1, 8/11. Red: A refused, A order, B refused. Already green before the code (existing behaviour pinned): A at 04:00 exact, A yesterday closed / Day 1, B reset accepted, B blank-reason order, B missed >= zeroDay, afternoon `struggling`, two streak tests. Reproduced by the controller.
  - After the code: `node --test tests/scoring.test.js tests/scoring-addenda.test.js` → exit 0, 32/32. `npm test` → exit 0, 231/231 (220 + 11 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" src/core/scoring.js src/core/challenge.js` → exit 1.
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 4 Minor. Fixed: the `nightTargets` doc comment (it now says to close in order). Skipped: the next three entries under Deferred, and the implementer's report misprinting the grep command (the correct regex, above, exits 1).
- Deferred:
  - Task 16: route the night form to yesterday while it is open (`nightTargets(...)[0]`), and surface both refusal messages from `NIGHT_TEXT`.
  - Task 8: cover `closeNight` under DST and the exact 03:59:59.999 boundary.
  - Task 19: import validation must refuse a day with `closedAt` set and `result` null (the only way such a day can exist; `yesterdayOpen` and scoring's `isClosed` disagree on it). `yesterdayOpen` stays as is: Task 3 predicate, shared by `submitMorning` and `closeNight`.
  - Skipped: older streak cases in `tests/scoring.test.js` L311-322 have only a shared derivation comment; the file is frozen, and the addenda cases carry full derivations.
- Next: Task 5 (Recovery and War Log core).

## Task 5: Recovery and War Log core
- Commits: `62d7085` test(core): recovery and war log (failing, WIP) — `tests/recovery.test.js` and `tests/warlog.test.js` only, never edited afterwards (`git diff --quiet 62d7085 -- tests/recovery.test.js tests/warlog.test.js` → exit 0); `94adc0c` test(core): fileAutopsy refuses inherited keys (failing, WIP) — review fix round 1, `tests/recovery-guards.test.js` only; "feat(core): recovery protocol and war log" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `99c68f5`.
- Files: `src/core/recovery.js` (36 lines, new), `src/core/warlog.js` (32, new), `tests/recovery.test.js` (228, new), `tests/warlog.test.js` (107, new), `tests/recovery-guards.test.js` (44, new), `sw.js` (ASSETS += the two modules; VERSION unchanged).
- Commands:
  - `node --test tests/recovery.test.js tests/warlog.test.js` at `62d7085` → exit 1 (ERR_MODULE_NOT_FOUND for both modules, expected RED; reproduced by the controller in a temporary worktree).
  - `node --test tests/recovery-guards.test.js` at `94adc0c` with the pre-fix line `const r = state.recovery[date];` → exit 1, 2/3 pass (failing: "fileAutopsy: inherited object keys are not recovery entries"; the dueAt and warEntries-skip tests already passed). Reproduced by the controller.
  - After code: the three Task 5 test files → exit 0, 29/29. `npm test` → exit 0, 260/260 (231 + 29 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" src/core/recovery.js src/core/warlog.js` → exit 1.
- Owner calls (plan silent; implemented as given):
  1. fileAutopsy error order: no-recovery → already-filed → incomplete → vague-change → vague-decision; any refusal returns `{ok:false, error}` with state byte-identical (Review Focus 3).
  2. `incomplete` = any of the five fields blank after trim (a non-string field counts as blank); no format check on `time`.
  3. pendingRecovery = oldest unfiled by date key; `overdue = nowMs > dueAt` (strict); `msLeft = max(0, dueAt - nowMs)`.
  4. checkVague literal: trimmed length ≥ 15, ≥ 3 whitespace-separated words, one whole keyword from the plan's list (case-insensitive, `\b` boundaries; inflected forms such as "Moving" do not match). Returns the exact nudge or null.
  5. setWarEntry: text empty after trim deletes the key; allowed keys are the four OATH_KEYS, `autopsy-YYYY-MM-DD`, `day-1`…`day-30`; any other key returns the same state.
  6. Autopsy War Log text: labelled lines `State: …`, `Time: …`, `Place: …`, `Decision: …`, `Change: …` joined by newlines, answers verbatim; `updatedAt = nowMs`.
  7. warEntries: Oath (fixed key order) → Autopsies (newest first) → Days (by number); plan titles; preview = first 80 characters (counted by code point, so an emoji is never split).
- Owner answers (2026-10-12): fileAutopsy stores the five answers in `recovery[date]` exactly as given, plus `filedAt = nowMs`; `OATH_TITLES` is an object by key; warEntries skips stored keys that match no group; oathComplete needs each oath entry non-blank after trim.
- Review: spec ❌ → ✅ after fix round 1; 0 Critical, 1 Important (fixed), 9 Minor. Fixed: Important — fileAutopsy read `state.recovery[date]` through the prototype ('toString' returned ok with an invalid state); now `Object.hasOwn`. Minor 1 (filing after dueAt succeeds) and Minor 2 (warEntries skips `day-31` / malformed autopsy keys) are covered by `tests/recovery-guards.test.js`. Scoped re-review: addressed, no new breakage.
- Awaiting owner ruling (not scoring): `setWarEntry` with non-string text (e.g. `undefined`) deletes the key, like empty text. The alternative is to return the state unchanged. No current caller passes a non-string.
- Deferred:
  - Task 14: War Log screen passes strings to `setWarEntry`; shows the autopsy text (newline-separated labelled lines) and the code-point preview as is.
  - Task 17: Recovery screen passes textarea strings; `checkVague` throws on non-string, non-null input (fileAutopsy type-guards first).
  - Task 21: keyword test only proves the listed words pass (an extra keyword would go unnoticed); coverage polish.
  - Task 12: `nextAction` (Task 3) uses `!r.filedAt`, `pendingRecovery` uses `filedAt == null`; differ only for `filedAt === 0`, which real timestamps never are.
  - Owner: plan file table (plan line 124) still names `recoveryStatus`; Task 5 and the code use `pendingRecovery`. Doc only.
  - Skipped: re-review notes on `tests/recovery-guards.test.js` (one title not derived in a comment; sequential asserts in a key loop). The file is frozen.
- Next: Task 6 (Pack import).

## Task 5 fix round 2: owner ruling on Minor 4
- Commits: `9b71f8e` test(core): setWarEntry ignores non-string text (failing, WIP) — `tests/warlog-guards.test.js` only; `8183c14` fix(core): setWarEntry ignores non-string text; "docs: Task 5 fix round 2 ruling and plan table name" (this entry and the plan table fix; a commit cannot contain its own hash, see `git log`). Base `36ee169`.
- Ruling (owner, resolves "Awaiting owner ruling" above): `setWarEntry(state, key, text)` with any non-string text (undefined, null, number, object) returns the state unchanged (same reference), exactly like an invalid key. Only a real string that is empty or whitespace-only deletes the key.
- Pre-check: `grep -rnE "setWarEntry\([^)]*(undefined|null|[0-9]+\s*,\s*[0-9]|\{\}|\[\])" tests` → exit 1; no frozen test passes non-string text.
- Files: `src/core/warlog.js` (one guard added to `setWarEntry`, comment updated; 32 lines), `tests/warlog-guards.test.js` (25, new, written first), plan file line 124 (`recoveryStatus` → `pendingRecovery`, the only change in that file).
- Commands:
  - `node --test tests/warlog-guards.test.js` at `9b71f8e` → exit 1, 1/2 pass (failing: "setWarEntry: non-string text returns the same state", AssertionError on `undefined`; the whitespace-only delete test already passed, existing behaviour pinned).
  - After the fix: `node --test tests/warlog-guards.test.js` → exit 0, 2/2. `npm test` → exit 0, 262/262 (260 + 2 new).
  - `git diff --quiet 62d7085 -- tests/recovery.test.js tests/warlog.test.js` → exit 0; `git diff --quiet 94adc0c -- tests/recovery-guards.test.js` → exit 0.
- Deferred:
  - Task 19: `warEntries` skips unknown stored keys; Task 19 import must refuse them.
  - Owner check of earlier Task 5 deferrals: every entry has an owner (Minor 3 → Task 21, Minor 5 → Task 17, Minors 6 and 7 → Task 14, Minor 9 → Task 12). The plan-table item is done (above).
- Next: Task 6 (Pack import).

## Task 6: Pack import (missions and tactics)
- Commits: `8dc0767` test(core): mission and tactic pack (failing, WIP) — `tests/pack.test.js` only, never edited afterwards (`git diff --quiet 8dc0767 -- tests/pack.test.js` → exit 0); "feat(core): mission and tactic pack" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `933bf65`.
- Files: `src/core/pack.js` (42 lines, new; exports only `validatePack`, `importPack`, `missionFor`, `tacticsFor`), `tests/pack.test.js` (208, new, written first, 21 tests), `sw.js` (ASSETS += `src/core/pack.js`; VERSION unchanged).
- Commands:
  - `node --test tests/pack.test.js` at `8dc0767` (before code) → exit 1 (ERR_MODULE_NOT_FOUND, expected RED; reproduced by the controller in a temporary worktree).
  - After code: `node --test tests/pack.test.js` → exit 0, 21/21. `npm test` → exit 0, 283/283 (262 + 21 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" src/core/pack.js` → exit 1.
  - Personal-data grep on added lines (`armin|memisevic|@gmail|<n> kg/lbs|weigh|HH:MM`, case-insensitive) → exit 1. Test string literals cross-checked against `docs/design/lockin-v2/`: only `Negotiator` (an archetype id, case test) and `undefined` occur there.
- Owner calls (plan silent; implemented as given):
  1. validatePack order, first failure wins: a. not a string or blank → `The file is empty.`; b. UTF-8 bytes (TextEncoder) > 307200, before JSON.parse → `The pack is too large.`; c. invalid JSON → `The file is not valid JSON. Choose a Lock In pack file.`; d. not a plain object or `v !== 1` → `This is not a Lock In pack.`; e. missions not an array → `The pack's missions are damaged.`; f. tactics present and not an array → `The pack's tactics are damaged.`; g. per mission: shape/title/body → `Every mission needs a title and a body.`, day not integer 1–30 → `Mission days must be whole numbers from 1 to 30.`, duplicate → `Mission day N appears twice.`; empty missions allowed; h. per tactic: name → `Every tactic needs a name.`, archetype not one of the 5 ids → `Unknown archetype in the pack's tactics.` Success `{ok:true, pack:{missions, tactics}}`, strings verbatim, `v` and unknown keys dropped.
  2. A pack without `tactics` stores `tactics: []` (model `packOk` requires an array; otherwise the next launch would move the whole state to `lockin.v2.corrupt`). Tested with `validateState(importPack(defaultState(), pack)) === null`.
  3. `importPack` replaces `pack`, changes no other key, does not mutate (deepFreeze), does not validate.
  4. `missionFor(state, n)`: `n` must be a number (the string `'9'` → null); null when no pack or no match.
  5. `tacticsFor`: matches in file order; `[]` with no pack or no match.
  6. Pure: no Date APIs, DOM or storage.
- Controller rulings (plan and owner silent): R1 rules g/h run per element in file order (shape → day → duplicate for each mission, then the next; same for tactics), first failure wins across the array; R2 "unknown keys dropped" applies at every level: the pack is rebuilt as `{day,title,body}` / `{archetype,name}` only; R3 "plain object" = non-null, typeof object, not an array (model.js `isObj`). Cost if wrong: which error shows for a file with two faults; extra keys inside elements dropped rather than kept.
- Review Focus 5: end to end `validateImport(exportJson(importPack(defaultState(), pack))).ok === true` is tested.
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 4 Minor (all skipped, below).
- Deferred:
  - Task 14: `#mission/<n>` must `Number()` the route param and integer-check it before calling `missionFor` (a string `'9'` returns null).
  - Task 19: Import pack shows the exact `validatePack` error string and never calls `app.set` on a refusal; on success `importPack` after the `Replace the current pack?` confirm.
  - Task 21: coverage polish — `importPack` "no validation inside" is not asserted with an invalid pack (Minor 1); `missionFor` with `NaN`/`Infinity` untested (Minor 2; code returns null). Both pin behaviour that already holds, so no failing-first test exists for them; `tests/pack.test.js` is frozen.
  - Skipped: `isObj` is a one-line copy of model.js's (not exported; model.js out of scope) (Minor 3); `missionFor` uses `|| null` where `?? null` would read more plainly (Minor 4, cosmetic).
- Next: Task 7 (Analytics selectors).

## Task 7: Analytics selectors
- Commits: `ee845ff` test(core): analytics selectors (failing, WIP) — `tests/stats.test.js` only, never edited afterwards (`git diff --quiet ee845ff -- tests/stats.test.js` → exit 0); "feat(core): analytics selectors" (implementation, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `78f47ad`.
- Files: `src/core/stats.js` (116 lines, new; exports only `resultCounts`, `passRate`, `protocolRates`, `resetCauses`, `tacticCounts`, `weekdayRates`, `heatmap`, `taskTotals`), `tests/stats.test.js` (277, new, written first, 19 tests), `sw.js` (ASSETS += `src/core/stats.js` after `src/core/pack.js`; VERSION unchanged).
- Commands:
  - `node --test tests/stats.test.js` at `ee845ff` (before code) → exit 1 (ERR_MODULE_NOT_FOUND, expected RED).
  - After code: `node --test tests/stats.test.js` → exit 0, 19/19. `npm test` → exit 0, 302/302 (283 + 19 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\(" src/core/stats.js` → exit 1.
- Owner calls (plan silent; implemented as given):
  1. Window: `range = {endDate, n}`. n a positive integer → `addDays(endDate, -(n-1))`..endDate inclusive; n null → challenge.startDate..endDate (no challenge: empty for the challenge functions; task functions start at the first taskLog date); any other n (0, negative, 1.5, a string) or a start after endDate → empty window. Days outside the window never count.
  2. Closed day = `days[date].result` not null, date inside the window.
  3. resultCounts: passed/redo/reset = closed days; open = window dates with `phase === 'active'` and not closed (today counts). passRate = passed / (passed + redo + reset), null when the sum is 0.
  4. protocolRates: only `night.protocols` snapshots of closed days (night null contributes nothing); grouped by id; held/missed/med by status; title from the latest date with that id; order missed desc, then title by plain `<`; a protocol appears only if it is in some snapshot.
  5. resetCauses: reset days with a `crossed` red line in the night → redLine; every other reset (overridden, no night) → protocols. byProtocol counts `missed` protocols on the protocols-resets only, `{title (latest), count}`, count desc then title. Red-line resets never feed byProtocol.
  6. tacticCounts: `night.bottomG` of closed days, counted only when archetype and tactic are non-blank after trim; grouped by the pair; count desc, then archetype, then tactic by plain `<`.
  7. Task functions count a date only if it is ≥ the earliest taskLog date key and inside the window / heatmap span; empty taskLog → nothing counts. Marked `ponytail:` in the code (known ceiling: a habit created after the first log gets its earlier days counted).
  8. weekdayRates: 7 × `{done, total}`, Monday = 0; habits (`repeat.type !== 'none'`) with `isDue` true; done only for `'done'` (open, failed, stalled = not done); archived habits excluded via `isDue`.
  9. heatmap(state, endDate): exactly 28 entries, oldest first, last = endDate; due = habits due, done = those `'done'`; a non-counting date (call 7) → `{date, done:0, due:0}`.
  10. taskTotals: counting window dates, ALL tasks due (`tasksOn`), counted by view status done/failed/stalled/open.
  11. Results, protocols and tactics come only from stored closed-day data, never from current `challenge.protocols`, `redLines` or `settings.zeroDay` (Review Focus 4; tested by comparing JSON of all eight outputs before/after editing them).
- Controller rulings (owner calls silent):
  - R1 empty challenge stats = `{passed:0,redo:0,reset:0,open:0}`, passRate null, `[]`, `{redLine:0, protocols:0, byProtocol:[]}`, `[]`; empty task window = 7 × `{done:0,total:0}`, taskTotals all 0. Cost if wrong: the Analytics empty state renders differently (Task 18).
  - R2 heatmap ignores range (endDate only), always 28 entries; call 7 decides the zeros. Cost if wrong: heatmap would need a range argument; signature change.
  - R3 task functions with a challenge and n:null start at challenge.startDate, then call 7 filters further. Cost if wrong: pre-challenge task logs would be excluded/included differently in "since start".
  - R4 open days use `phase` imported from `./challenge.js` (not reimplemented). Cost if wrong: none expected; a single definition of "active".
  - R5 the auto no-night and Review Focus 4 tests use object-spread copies of the hand state. Cost if wrong: test style only.
- Implementer reading (flag for review): call 5's "title (latest title)" is read as call 4's definition (latest date in the window with that id, across all closed days, not only the counted reset days). The tests do not distinguish the two readings. Cost if wrong: a renamed protocol could show its newer name in byProtocol.
- Owner's verbatim deferred line named a real person; replaced by 'the owner' per CLAUDE.md no-real-names rule (controller ruling, awaiting owner).
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 3 Minor (all skipped or deferred):
  - M1: `r[result]++` / `e[p.status]++` would add a NaN key for an unknown string; validateState guards the data path. Skipped.
  - M2: `firstLog` re-sorts the taskLog keys on every call; skipped (k is small).
  - M3: test gaps (R3 pre-start taskLog with n:null, the C1 title reading, the C2 `{}` key, archived/skip/weekdays habits) → Task 21 coverage polish; `tests/stats.test.js` is frozen and stays untouched.
- Deferred:
  - Deferred: Task has no created date; revisit if the owner sees wrong early-days rates (owner: Task 18)
  - "Earliest taskLog date key" counts a key whose value is `{}` (left by clearing a status), per the call's literal wording. Owner: Task 18 (same revisit).
  - Owner ruling 2026-10-14 (Task 18): leave both items as they are (Task has no created date; a `{}` taskLog key counts as "earliest log"). Revisit in Task 21 only if real data shows wrong early-days rates.
- Next: Task 8.

## Task 8: Whole-challenge flow test and time zones
- Commits: "test: whole-challenge flow in three time zones" (the three test files and this entry; a commit cannot contain its own hash, see `git log`). Base `78770e3`. No failing-first commit is possible (the core already exists); the tests are proven able to fail by the mutations below instead.
- Files: `tests/flow.test.js` (180 lines, new, 13 tests), `tests/boundary.test.js` (67, new, 7 tests), `tests/tz.test.js` (30, new, 5 tests). Nothing under `src/` and `sw.js` changed.
- Commands:
  - `node --test tests/flow.test.js tests/boundary.test.js tests/tz.test.js` → exit 0, 25/25.
  - `npm test` → exit 0, 327/327 (302 + 25 new).
  - `grep -n -E "toISOString|getUTC|Date\.parse|new Date\('" tests/flow.test.js tests/tz.test.js tests/boundary.test.js` → exit 1.
  - Guard checks (manual, spawnSync): boundary.test.js with TZ Europe/Sarajevo and EXPECT_OFFSET 480 → exit 1 (`# pass 6`, `# fail 1`); flow.test.js with FLOW_START 2026-10-12 (not a DST day) → exit 1 (`# pass 12`, `# fail 1`).
  - Mutations, each alone in a throwaway detached worktree `../pm-v2-mut` at `78770e3` (removed afterwards with `git worktree remove --force`, never committed):
    - (i) scoring.js `GRACE_HOUR` 4 → 5: `node --test tests/boundary.test.js` → exit 1, 1/7 pass (all six date tests fail: D still in `nightTargets` at 04:00).
    - (ii) challenge.js `forcedFullPass` returns false: `node --test tests/flow.test.js` → exit 1, 10/13 pass (Day 6 `medCheck` returns `{ok:true}`; Day 8 `forcedFullPass` false; final results list differs).
    - (iii) scoring.js `currentStreak` counts `'redo'` as passed: `node --test tests/flow.test.js` → exit 1, 11/13 pass (Day 7 streak 2 not 0; final currentStreak 25 not 5).
- Owner calls (plan silent; implemented as given):
  1. Clock helper `at(key, h, mi, s, ms)` = local `new Date(y, m-1, d, h, mi, s, ms).getTime()` from the split key; date keys via `addDays`. Forbidden-API grep on all three files exits 1.
  2. flow.test.js start = `process.env.FLOW_START ?? '2026-10-12'` (Monday). Fixed times: oath/start 07:00, morning 08:00, afternoon 14:00, night 21:00. `nextAction` is called only at 08:00 (Day 6 → `'recovery'`): flow.test.js deliberately avoids `nextAction` between 12:00 and 23:59 because Task 12 changes the night start to 20:00 and this file is frozen by then.
  3. Invented content only: protocols p1 "Protocol A" (med "Light A"), p2 "Protocol B", p3 "Protocol C"; red line r1 "Red Line A"; oath "Contract A", "Funeral A", "Code A", "Lines A"; zeroDay 3, medPerWeek 2 (defaults); target "Target A".
  4. Scenario per plan steps 1–9 with `validateState(state) === null` after every transition; hand-written results D1–D4 passed, D5 reset, D6 passed, D7 redo, D8 passed, D9–D10 redo, D11–D24 passed, D25 redo, D26–D30 passed; longestStreak 14, currentStreak 5; `resultCounts` `{passed:25, redo:4, reset:1, open:0}`, `passRate` 25/30; export/import round-trip deep-equals. `medUsedInWeek(Day 4) === 1` holds for all three starts (2026-10-12, 2026-10-22, 2026-10-29).
  5. tz.test.js: Europe/Sarajevo (-60), America/Los_Angeles (480), Pacific/Auckland (-780) run flow + boundary (20 tests each); DST runs Sarajevo FLOW_START 2026-10-22 and Los Angeles FLOW_START 2026-10-29 run flow (13 tests each). Each child must exit 0, report exactly the expected `# pass N` and `# fail 0`. Both child files assert the offset when EXPECT_OFFSET is set; flow.test.js asserts Day 4 is 25 hours when FLOW_START is set.
  6. boundary.test.js: for 2026-03-08, 2026-03-29, 2026-09-27, 2026-10-25, 2026-11-01, 2027-04-04: close at D+1 03:59:59.999 ok/passed/closedAt = that ms; at D+1 04:00 not in `nightTargets`, `closeNight` → `not-closable`, `settleMissed` → redo/no-night closedAt = D+1 04:00; at D+1 00:40 close ok; `validateState` null each time.
  7. Refusals (start without oath, vague autopsy, MED after declared Redo, second Redo, not-closable) run on a deep-frozen state and leave its JSON unchanged.
- Implementer choices: the guard tests (offset, 25-hour day) always exist and return early when their variable is unset, so each file's pass count is constant (flow 13, boundary 7). tz.test.js spawns with `--test-reporter=tap` (the default reporter differs between TTY and pipe) and removes `NODE_TEST_CONTEXT` from the child env (set by the parent runner; it would switch the child's reporting protocol). Day 7's `declareRedo` is at 07:00. Day 4's night form answers only p2/p3 (the MED protocol needs no answer). Refused exact codes: `'Write your Contract, Funeral and Code first.'` (challenge.js) and `'vague-change'` (recovery.js).
- Controller rulings: none.
- Review: spec ✅, quality Approved; 0 Critical, 0 Important, 3 Minor. Fixed: M1 (tz child env no longer inherits FLOW_START/EXPECT_OFFSET), M3 (Day 1 asserts zeroDay 3 / medPerWeek 2). Skipped: M2 (shared scenario state makes later tests noisy after an early failure; node runs them in order, so nothing is hidden).
- Deferred: none.
- Next: Task 9.

## Task 9: Shell cutover
- Commits: `180ef6d` test(ui): router and v2 contrast tokens (failing, WIP) — `tests/router.test.js` and `tests/contrast.test.js` only, never edited afterwards (`git diff --quiet 180ef6d -- tests/router.test.js tests/contrast.test.js` → exit 0); "feat(ui): v2 shell, fonts, background, router" (implementation, deletions, `sw.js` and this entry; a commit cannot contain its own hash, see `git log`). Base `aa6247f`.
- Files (lines): new `src/router.js` (21), `tests/router.test.js` (50, 35 tests), `src/bg/{frieze,steps,wall-tile}@2x.webp` (copied from `docs/design/lockin-v2/assets/bg/`), 8 woff2 in `src/fonts/` (copied from `docs/design/lockin-v2/assets/fonts/`), `src/fonts/OFL-AlegreyaSans.txt` (93); replaced `tests/contrast.test.js` (20, 11 tests); modified `index.html` (35), `styles.css` (63), `screens.css` (56), `src/app.js` (90), `src/icons.js` (34), `src/logic.js` (28: lines 1–28 of the old file, nothing else changed), `src/fonts/fonts.css` (9), `sw.js` (65; ASSETS only, VERSION unchanged `1.0.23`). Deleted (git rm): `src/store.js`, `src/redlines.js`, `src/timeLog.js`, `src/views/*.js` (8), `tests/{blocks,clock,goalEdit,goals,movedLog,orphan,redlines,redlinesImport,store,timeLog,timer,weights}.test.js`, `tests/fixtures.js`, `tests/export-1.0.7.json`, `src/fonts/{archivo-latin,cinzel-600-latin,cormorant-garamond-700i-latin}.woff2`, `src/fonts/OFL-Archivo.txt`. Untouched: `tests/dates.test.js`, `tests/sw.test.js`, `src/dom.js`, `src/sheet.js` (`git diff --quiet aa6247f -- …` → exit 0).
- Commands:
  - Before deleting (at `aa6247f`), `node --test --test-reporter=tap tests/<f>.test.js`, all exit 0: blocks 17, clock 4, goalEdit 2, goals 12, movedLog 1, orphan 1, redlines 11, redlinesImport 3, store 7, timeLog 8, timer 4, weights 1 (= 71), old contrast 3 → 74. All 12 listed files existed.
  - RED: `node --test tests/router.test.js tests/contrast.test.js` on the v1 source → exit 1: router.test.js ERR_MODULE_NOT_FOUND (`src/router.js`); contrast 10 assertion failures (`--plate-bot` / v2 tokens missing), `dark only` passed.
  - GREEN: `node --test tests/router.test.js` → 35/35; `npm test` → exit 0, 299/299. Reconciliation: 327 − 74 + 35 + 11 = 299.
  - `grep -nE "toISOString|getUTC|Date\.parse|new Date\(" src/router.js src/app.js` → exit 0, one hit: `src/app.js:18 const today = () => dateKey(new Date());` (current time, not a date key; same line as v1). Strict `grep -nE "new Date\([^)]|new Date\('"` → exit 1.
  - `grep -rn innerHTML src index.html` → exit 0, one hit: the comment in untouched `src/dom.js:2` ("never innerHTML"). No innerHTML code anywhere.
  - Raw contrast on #141317: text 15.997, text-2 8.876, text-3 6.872, accent 10.830, eyebrow 8.362, crimson-lt 7.752, crimson 5.174, outline #85795f 4.314; ink #1a1205 on #FCE29A 14.554, #F2BE5C 10.856, #C99139 6.704, #B08539 5.527.
  - Preview `npx serve -l 5173`, playwright-cli 390×844 DPR 2 (+ 440×956): scrollWidth 390 (440 at 440); each tab 68×58 (78×58 at 440); back button 80×44; aria-current="page" on Today/Tasks/Challenge/Analytics/Settings for their routes and on Today for `#checkin/morning`; nav hidden (display none) on the pushed route; Back returns to the previous route; all 8 font faces load (`document.fonts.load` + `check` true); 0 console messages.
  - `compare.py` (top 240 and bottom 240 device rows vs `reference/Main.png`, tol 12; plain / `--ignore-bg`, %): Today top 5.21/5.21, bar 1.54/1.49; Tasks top 5.81/5.81, bar 7.71/7.66; Challenge top 7.83/7.83, bar 7.56/7.50; Analytics top 7.25/7.25, bar 7.61/7.56; Settings top 7.26/7.26, bar 7.53/7.48. Run with `python -E -P` (`python -I` cannot see the user-site Pillow: ModuleNotFoundError). CSS not tuned to the numbers.
- Owner calls (binding; implemented as given):
  1. `parseRoute(hash)` → `{name, params, tab, pushed}`; strip one leading `#`, then one trailing `/`; split on `/`; no decoding; the five tabs, `checkin/morning|afternoon`, `checkin/night/<date>`, `recovery/<date>`, `mission/<n>` (string), `warlog`, `warlog/<key>`; anything else → `{name:'today', params:[], tab:'today', pushed:false}`.
  2. Router tests hand-written: one case per table row plus unknown, empty, `#`, trailing slash, `#today/x`, `#mission/abc`, `#mission/9/`, `#checkin/night/2026-13-45` (accepted, commented), `#Today` (case-sensitive).
  3. Contrast tests: v1 helpers copied; v2 tokens under `/* tokens:dark */` on #141317 rounded to one decimal; ink ≥ 5.5 on every gold stop; outline ≥ 3; `dark only` kept.
  4. Deletions exactly the plan's list; counts and reconciliation above; dates/sw tests, dom.js, sheet.js untouched.
  5. `src/logic.js` keeps lines 1–28 (through `uid`).
  6. Fonts: 8 local `@font-face` (`font-display: swap`, relative urls, tokens.css family names); old Archivo/Cinzel/Cormorant files and OFL-Archivo deleted; OFL-Cinzel and OFL-CormorantGaramond kept; OFL-AlegreyaSans = google/fonts `ofl/alegreyasans/OFL.txt`.
  7. Background: three @2x.webp only; layer values copied; floating glass tab bar 18/18/22/72/36; five tabs; aria-current; ≥ 44; pushed → bar hidden, parent tab highlighted; back button `history.back()`; no horizontal scroll at 390.
  8. app.js keeps storage guard, gesturestart zoom lock, 30 s tick, visibility/focus re-render, `storage.persist`, SW registration; `load/save` from `src/core/store.js`; `settleMissed(state, Date.now())` through `app.set` on load and day change; failed save → `saveFailed` + `#save-banner`.
  9. `sw.js` ASSETS updated; VERSION unchanged in `sw.js` and `src/version.js`.
  10. Every file < 300 lines, no CDN, no external fonts, relative paths only.
- Controller rulings (each with its cost if wrong):
  - R1 logic.js lines 1–28 (keeps `resolveViewDate`). Cost: re-adding a helper.
  - R2 styles.css shell-only (tokens, base, .ttl, .eyebrow, #save-banner, .back); screens.css = .scr, background stack, tab bar, reduced-transparency rule. Cost: Task 10/11 add component and sheet rules.
  - R3 tokens.css names with --bone→--text, --t2→--text-2, --t3→--text-3, --gold→--accent; `--outline:#85795f` added; all hex 6-digit. Cost: later tasks map board hex literals to these names.
  - R4 icons via DOMParser + importNode; tab icons, sword, shield, lambda, laurel from assets (string-equal to the source files apart from the stated additions/removal); v1 controls kept. Cost: a later task re-adds a one-line icon.
  - R5 placeholder `main.scr > (back) + p.eyebrow + h1.ttl`; tab: "Lock In" + tab name; pushed: params joined by " · " (or "Lock In") + route name. Cost: placeholder text only.
  - R6 `<nav class="tabs" aria-label="Tabs">` with five `<a class="tab" href="#…">`, icon prepended by app.js; `.tab[aria-current="page"]` replaces `.tab.on`; position fixed. Cost: selector rename.
  - R7 `.scr` min-height 100dvh, padding 60 20 110; no safe-area insets. Cost: a padding change after the device check.
  - R8 `.scr` own background + `::before` stack exactly as the boards, data-URIs → `src/bg/*@2x.webp`, `isolation:isolate`. Cost: background sizing change if the owner wants 440 covered.
  - R9 reduced transparency/contrast → solid `#1a181c` bar, no blur; wall fade deferred to Task 21. Cost: one more declaration.
  - R10 `let day = today()`; boot settles; tick/visibility/focus settle on a date change, else render. Cost: none expected.
  - R11 v1 app API kept (`state, saveFailed, version, today, viewDate, setViewDate, set, subscribe`) + `nav`, `route`; `nav` lives in router.js. Cost: none expected.
  - R12 `<button type="button" class="back">` chevronLeft + "Back", 44 min, `history.back()`. Cost: Back on a deep link does nothing (known limitation).
  - R13 OFL re-fetched with `curl -sSfL` into an empty scratch dir outside the repo (exit 0), `cmp` with the controller's copy → identical (exit 0), copied verbatim. head -5: "Copyright 2013 The Alegreya Sans Project Authors (https://github.com/huertatipografica/Alegreya-Sans)" / "" / "This Font Software is licensed under the SIL Open Font License, Version 1.1." / "This license is copied below, and is also available with a FAQ at:" / "http://scripts.sil.org/OFL". sha256 `0677891e6a143f297350d260ad766ad33bfc18ed5fa4f213acf648d6b597ec1a`.
  - R14 commit 1 only; commit 2 staged for controller review.
- Implementer choices: `.eyebrow{margin:0}` and `.eyebrow + .ttl{margin-top:4px}` (board: div eyebrow + ttl margin-top 4); body carries the .scr font and colour so the fixed tab bar (outside `main`) inherits Alegreya Sans; `.back` is a pill with the boards' back-button border `rgba(242,190,92,.24)` and colour `#E9E3D6`; `aria-hidden`/`focusable="false"` added to the sword icon too; render keeps the scroll position only when the same route re-renders.
- Deviations (screenshots vs `reference/Main.png`):
  - Placeholder has no date eyebrow, no day badge, no content; the title sits 4 px higher than the board (board bottom-aligns the title column against the 60 px badge) → top-region diff 5–8 %.
  - Non-Today tabs highlight their own tab → bar diff ~7.5 % vs Main.png (Today: 1.54 % / 1.49 %).
  - `.scr` radial glows scale with the screen height (844 here vs 1260 on the board).
  - At 440 px the 390 px-wide wall, frieze and steps leave ~25 px dark bands on each side (R8: sizes unchanged).
  - No safe-area insets (R7): the bar's bottom 22 sits inside the home-indicator zone on Face ID iPhones; top padding 60 vs a ~59 pt Dynamic Island inset.
  - Eyebrow weight 600 renders with the 700 face (only 400/500/700 shipped, owner call 6; the boards use the same fonts.css).
  - Pushed placeholder title is the raw route name (`CHECKIN`).
  - Back button is icon + "Back" (R12); the boards use a 44 px icon-only circle.
  - `lambda` has no inline stroke (needs `.lam` CSS from Task 10); sword/laurel gradient ids (`g`, `lwo`, `lwi`) collide if several copies are inlined.
  - `sw.js` line 1 comment said "plan Task 10" (v1 numbering); fixed in review (M3).
- Review: spec ✅; 0 Critical, 1 Important, 5 Minor (reviewer model: `sonnet` alias returned HTTP 404 model_not_found for claude-sonnet-4-6; retried once with opus).
  - I1 Needs ruling (owner): settleMissed runs only on load and when today() changes (owner call 8 / R10), i.e. at midnight, while the just-ended day is still inside its 04:00 grace; a missed night therefore stays open until the next date change or a cold start if the app stays open or resumes on the same date. Proposed fix (not applied, contradicts call 8 as written): in tick, `const next = settleMissed(app.state, Date.now()); if (next !== app.state) app.set(() => next); else render();`. Owner: Task 12 if accepted.
  - M1 Needs ruling (owner): at 440 px the 390-wide wall/frieze/steps leave ~25 px dark bands each side; DESIGN-SPEC §2 says it must look right at 440, but any fix means inventing a size (owner call 7 forbids). Owner: Task 21 visual pass if not ruled sooner.
  - M2 Skip → Task 21: a route change does not move focus to the new screen's h1; after Back, focus drops to body.
  - M3 Fixed: sw.js comment "plan Task 10" → "plan Task 20".
  - M4 Skip → Task 10: gradient ids g/lwo/lwi in sword/laurel collide when inlined twice; lambda renders filled without .lam CSS.
  - M5 Skip → Tasks 14, 15, 17: Back on a deep link / cold start does nothing (plain history.back(), owner call 7).
  - Apple-design audit (no code change): tab bar bottom 22 with no safe-area inset puts ~12 pt of the tabs inside the 34 pt home-indicator zone → device check at the ⛔ checkpoint, Task 21; text is fixed px (no Dynamic Type), tab label 11 px = minimum → Task 21; top padding 60 clears the Dynamic Island; the frieze webp appears to have the board's opacity .5 baked into its alpha → confirm on device.
- Deferred:
  - Component CSS (.plate, .btn-gold, .shield, chips, .lam, sword/laurel id uniqueness, M4) → owner: Task 10.
  - Sheet (`src/sheet.js`) CSS restyle → owner: Task 11.
  - I1 settle on the 04:00 grace while open, if the owner accepts the fix → owner: Task 12.
  - Back on a deep link with no history does nothing (M5) → owners: Tasks 14, 15, 17.
  - Task 20: none.
  - Reduce Transparency ~50 % wall fade; focus to h1 on route change (M2); fixed px text (no Dynamic Type); safe areas; 440 px side bands (M1) → owner: Task 21.
- Next: Task 10.

## Task 9 fix round: settle on every tick, background scales to screen width
- Commit: "fix(ui): settle missed days on every tick, scale background to screen width" (a commit cannot contain its own hash, see `git log`). Base `b507c84`. Files: `src/app.js` (91), `screens.css` (57), this entry. `sw.js` unchanged (no file added). Frozen tests untouched (`git diff --quiet 180ef6d -- tests/router.test.js tests/contrast.test.js` → 0).
- Owner rulings (2026-10-13, recorded as given):
  1. Review I1 ACCEPTED: `settleMissed(state, Date.now())` runs through `app.set` on every 30 s tick and on visibilitychange/focus, in addition to load and date change. `app.set` saves and notifies only when the updater returns a different state object. No other trigger changes.
  2. Review M1 ACCEPTED as a fix now: wall, frieze and steps scale to the screen width keeping their aspect ratio (`100% auto`), same stacking and anchoring (frieze top, steps bottom, wall repeat-y); no other value invented. 390 px must be pixel-identical to before; no dark side bands at 440×956.
  3. M2 → Task 21. M3 fixed (in b507c84). M4 → Task 10. M5 → Tasks 14, 15, 17. Apple notes (tab bar bottom 22 vs the home-indicator zone; no Dynamic Type) → Task 21, but the owner checks the INSTALLED app at the Task 12 iPhone checkpoint.
  4. Token names: Tasks 10–19 use the names in `styles.css`, never the design package names. Mapping: `--bone` → `--text`, `--t2` → `--text-2`, `--t3` → `--text-3`, `--gold` → `--accent`; shield outline `#85795f` → `--outline` (new). All other tokens.css names are unchanged (`--bg`, `--plate-top`, `--plate-bot`, `--plate-alt`, `--field`, `--tab-idle`, `--gold-hi`, `--gold-mid`, `--gold-lo`, `--gold-ink`, `--eyebrow`, `--gold-grad`, `--bronze`, `--bronze-lt`, `--crimson`, `--crimson-lt`, `--crimson-dk`, `--line*`, `--r-plate`, `--r-pill`, `--gutter`, `--f-title`, `--f-serif`, `--f-body`). Never reintroduce `--bone`, `--t2`, `--t3`, `--gold`.
  5. Controller rulings R1–R14 accepted as reported.
- Implementation: `app.set` returns early when `updater(state) === state` (no save, no banner change, no notify). `tick()` = settle through `app.set`, then `render()` only if the state object did not change; it runs at boot, every 30 s, on visibilitychange (visible) and focus. The `day` bookkeeping is gone (every tick settles, which covers a date change). `.scr::before` image layers: `390px 142px` / `390px 34px` / `390px 720px` → `100% auto` (webp sizes 780×284, 780×68, 780×1440 = exactly 2× the board sizes, so 390 px renders the same).
- Proofs (scripts and output in the git-excluded `scratch/`; served with `npx --no-install serve -l 5173`):
  - I1 (`scratch/make-seed.mjs` builds a valid state with the core functions: invented oath text, "Protocol A", "Red Line A", challenge start 2026-10-13, morning 08:00, no night; `scratch/proof-i1.js` via `playwright-cli run-code`): fake clock 2026-10-14 03:59 local, no reload, `clock.fastForward('02:00')` + one 30 s tick → asserts `days['2026-10-13']` `result 'redo'`, `auto 'no-night'`; then resets a `localStorage.setItem` counter and runs one idle tick → 0 calls. At `b507c84` → exit 1 (`result null, auto null`, PASS false). After the fix → exit 0 (`result 'redo', auto 'no-night', closedAt 1791943200000` = 2026-10-14 04:00 local, idle-tick setItem calls 0).
  - M1 (`scratch/shots-*.js`, DPR 2, fresh context, fonts ready): screenshots are deterministic (two pre-fix runs: 0.00 % at tol 0). 390×844 before vs after: `compare.py --tol 0` → 0.00 %. 440×956 after: no side bands (edge 40 device-px columns mean luminance 18.3 / 19.6 vs centre 15.6; before 7.9 / 10.0 vs 15.7).
  - `npm test` → exit 0, 299/299. `grep -nE "toISOString|getUTC|Date\.parse|new Date\('" src/app.js src/router.js` → exit 1. Personal-data grep on added lines → exit 1.
- Review (one reviewer; `sonnet` alias → HTTP 404 model_not_found `claude-sonnet-4-6`, retried once with opus): spec ✅, 0 Critical, 0 Important, 5 Minor, Approved.
  - m1 Recorded: boot no longer saves unless a day settles, so with unwritable storage the save-banner first shows at the first real change (before: at boot); corrupt stored JSON stays under `lockin.v2` until then (the `lockin.v2.corrupt` copy is still written). This is what owner ruling 1 asks for; no change.
  - m2 Recorded, contract for Tasks 10–19: `app.set` updaters must return a NEW object to persist; a same-object return is a no-op (no save, no render). Core updaters already copy.
  - m3 No change: after a failed save an idle tick does not retry; the banner stays until the next real change (the data really is unsaved).
  - m4 → visual check at the Task 12 iPhone checkpoint and Task 21: at 440 px the wall tile is ~812.3 px tall (fractional), so Safari may show a faint seam between repeats.
  - m5 Fixed: this review line replaces a placeholder.
- Deferred: unchanged from the Task 9 entry, except I1 and M1 are now done; apple notes → Task 21 with the installed-app check at the Task 12 iPhone checkpoint.
- Next: Task 10.

## Task 10: Shared UI pieces
- Commit: "feat(ui): shared controls" (staged by the implementer, committed by the controller after review; a commit cannot contain its own hash, see `git log`). Base `f8b3a86`.
- Files (lines): new `src/ui/chrome.js` (17), `src/ui/controls.js` (58), `src/ui/taskRow.js` (29); modified `styles.css` (156), `src/icons.js` (53), `sw.js` (68; ASSETS += the three files, VERSION unchanged `1.0.23`). `src/app.js` and `tests/` unchanged (`git diff --quiet f8b3a86 -- src/app.js` → 0, `git diff --quiet f8b3a86 -- tests/` → 0). screens.css untouched.
- Commands:
  - RED before the components existed: `playwright-cli run-code --filename=kit-proofs.js` → exit 1 (`RED: no #kit page / no shield on the page`); `kit-rm.js` → exit 1 (same).
  - GREEN: `kit-proofs.js` → exit 0, PASS true, 0 failures, 0 console messages; `kit-rm.js` with `playwright-cli set-reduced-motion reduce` → exit 0, and with `clear-reduced-motion` (control) → exit 0.
  - `npm test` → exit 0, 299/299 (the sw ASSETS test lists the three new files).
  - `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(" src/ui` → exit 1. `grep -rn innerHTML src/ui` → exit 1.
  - Personal-data grep on added lines → exit 0 with 7 hits, all CSS font-boldness declarations whose property name contains the grep word (the Task 9 CSS has the same); no names, mail, units or times. The same grep after deleting that property name from each line → exit 1. Not rewritten (a CSS property cannot be renamed).
  - Served with `npx --no-install serve -l 5173` (stopped afterwards); playwright-cli 390×844 and 440×956, DPR 2.
- Owner calls (binding; implemented as given):
  1. CSS copied from css/Kit.css (+ the Tasks.css task-row rules), board compact format so each line diffs against its source; hex/rgba → token only where :root has the exact value; every rule is used by a component of this task.
  2. Pop survives the re-render (mechanism below); proven on the #kit page wired through a re-rendering set-like function.
  3. Reduced motion: pop, ripple, thumb transition (and the shield fill transition) off under `prefers-reduced-motion: reduce`.
  4. shieldToggle = `<button type="button">`, aria-pressed true only for done, aria-label = label; failed/stalled looks per R1; switch = button role="switch" aria-checked; chips/segmented = role="group" of buttons with aria-pressed; stepper = role="group" (aria-label = label) with "Fewer"/"More" buttons (board names), value visible, disabled at min/max; goldButton uses the disabled attribute; every target ≥ 44 measured.
  5. Icon fixes: `icon()` gives every id inside a parsed icon a per-call suffix (`g-i3`, `lwo-i7`, …) and rewrites the matching `url(#…)` fill/stroke refs; the `lambda` path carries the .lam values as attributes (fill none, stroke #1a1205, 2.6, round caps/joins).
  6. taskRow per the call: open → `setTaskStatus(…, 'done')`; done/failed/stalled → `null`; time "HH:MM–HH:MM" / start only / nothing; ⋯ = 44×44 "Task options" → `onMenu(view)`; habits add 7 `.mini` dots from `habitDots(state, task.id, date)`; done rows tinted with "Completed" (.okt). Never touches the day close.
  7. pushedHeader: 44 px round back button (aria-label "Back", R2 chevron) + title; built, not wired.
  8. Temporary #kit hook in `render()` before `app.route()`/parseRoute (saved as `scratch/kit-hook.patch`: one hunk, additions only), removed before staging.
- Owner rulings 2026-10-13 (recorded as given):
  - R1 Failed shield: outline --crimson with the Reset-badge X (`M3 3l8 8M11 3l-8 8`, 14 box) drawn inside, lambda stroke style (round caps/joins, 2.6). Stalled = Kit.html opacity .55 + dash 3 2.5.
  - R2 Missing rules copied from the boards: .seg (Analytics.css), .stp + the `.sw .th` transition (Settings.css), .warn (CheckIn.css), the icon-only back button (Recovery.html line 70).
  - R3 Tap targets: chips = Recovery.css values (44 / 0 16px / 15px); switch = 60×44 transparent button around the 60×34 track; segmented buttons 44 tall (container 54); ⋯ 44×44; gold button stays 48.
  - R4 Task row shows the note (13/18, text-2, margin-top 1px) under the time when non-empty.
- Pop mechanism: module-level `popKey` in controls.js. The shield's click handler sets `popKey = label`, calls `onToggle()` (app.set → notify → render, synchronous), then clears it in `finally`. A shield built while `popKey === label` and `status === 'done'` gets class `pop`. So first render, un-do, reopen and every later render never pop. `ponytail:` ceiling in code: keyed by label, two shields with the same label on one screen both pop. taskRow passes `task.title` (does not change with status). Second ceiling: a screen that re-rendered asynchronously after the tap would not pop.
- Focus ring: relied on the existing `:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }` (styles.css); no rule added. Also relied on `button:disabled { opacity: .4 }` and the body tap-highlight/touch-action rule.
- Drawn icon (CLAUDE.md): failed-shield X = the Kit.html Reset-badge X scaled ×1.125 into the lambda's box: `M10.5 13.25l9 9M19.5 13.25l-9 9` (viewBox 30×34), drawn by swapping the `d` of the shield's `.lam` path when the status is failed, stroke --crimson. Board inline SVGs added to icons.js (copied from static/, not drawn): `back` (Recovery.html chevron 10×16), `more` (Tasks.html ⋯ 18×4), `stpMinus`/`stpPlus` (Settings.html 16×16).
- Implementer choices: class names `.swb` (switch button), `.ph`/`.ph-back`/`.ph-sp` (pushed header), `.rb`/`.rt`/`.rtm`/`.rn` (row body, title, time, note; values from the row's inline styles in Tasks.html), `.chips` (Kit.html chip-row layout), `.dots` (display:flex only). Pushed header title is `h1.eyebrow` (Recovery board). `.ph-back`/`.ph-sp` get `flex:none` so a long title never shrinks the 44 px button. Row body order: title, time, note, "Completed", dots. Habit dots: done = `.mini.on`, today (last) = `.td`; open/failed/stalled/off = plain `.mini`; the dots row is `aria-hidden` (no invented copy). chips call `onPick(value)` for single and multi (the caller adds/removes). `.chip.on` and `.seg button.on` use `var(--gold-grad)` (the chip's board gradient omits the 0 %/100 % stops: same rendering). `.sec` sword = inline svg with the `.sec::before` box values (content/background/vertical-align dropped). `.seg span` → `.seg button`. The mini dot and the switch thumb reuse icons.js `shield` at 22×25 with the unused paths removed.
- Deviations (compare.py, tol 12, crops centred on each element at the board's size, @2x; reference/Kit.png unless noted; the board crops come from the reference PNGs, positions from the static/ renders, which match the PNGs at 1.2–2.2 %):
  - Same size, background only: shield open 0.55 %, switch off 0.11 %, switch on 1.04 %, mini done (Tasks.png) 0.49 %; shield done 7.14 % and stalled 3.19 % (glow over a different plate area); back button (Recovery.png) 7.45 % and stepper (Settings.png) 6.20 % (different wall behind); sec sword (Tasks.png) 4.26 %.
  - Size changed by R3: chip on 33.39 % / off 18.29 % (40 → 44, 14 → 15 px, padding 14 → 16); segmented (Analytics.png) 33.15 % (38 → 44 buttons, 48 → 54 container; kit width 304 vs board 350); ⋯ (Tasks.png) 13.31 % (40 → 44). Switch hit area 60×44 (track unchanged 60×34). Gold button 48 (DESIGN-SPEC §2 says 54; R3 keeps Kit's 48).
  - Text differs (neutral placeholders): gold button 17.94 % ("Button" vs board text); row done 7.02 % and row open+note 6.27 % (Tasks.png).
  - Time format "HH:MM–HH:MM" (call 6) vs the board's "HH:MM – HH:MM · duration" (no spaces, no duration).
  - Failed shield (R1) has no board: 12.71 % vs the board's open shield.
  - No `.row.first`: the first row in a plate shows its 1 px top border (done row 83 vs board 82) → Tasks 11, 12 (the task lists).
  - `.plate` keeps Kit's 22 px padding; task lists need padding 0 (Tasks board) → Tasks 11, 12.
  - Note line added (R4).
  - The thumb slide (.25 s) never plays in the real flow: app.set rebuilds the switch, so the new node starts in its end state (proved: switch tap → 0 animations; in-place class toggle → 1 transition). Making it play needs a mechanism like the pop; not asked → owner decision, Task 19 (Settings, where the switches live).
  - Contrast (board values, unchanged): open `.mini` outline #6b5a36 2.77:1 on #141317 (2.56 on #1c1b20), stalled shield outline at opacity .55 ≈ 2.1:1, both under 3:1 for graphics (state is also carried by fill/dash shape).
  - Keyboard: a shield tap re-renders the screen and focus drops to body (render restores focus by id only; controls have no ids) → Task 21 with M2.
  - chips/segmented groups have no accessible name (the plan interface has no label) → the screens that use them.
- Proofs (scripts and output in the git-excluded `scratch/`: `kit-proofs.js`, `kit-rm.js`, `kit-rects.js`, `compare-kit.py`, `smoke.js`, `kit/`):
  - Pop (element.getAnimations({subtree:true}) on the shield button, cross-checked with document.getAnimations() filtered to the shield): first render 0 on all 10 shields; tap open → new node, 2 animations (`pop` on the svg, `rip` on ::after), aria-pressed true; tap again (un-do) → 0; task row tap → 2, then switch tap → 0 and focus tick → 0 (still done); failed/stalled (kit shields and the Task E/F rows) → tap → open, 0.
  - Reduced motion: matchMedia true; tap → class `shield on pop`, 0 animations, computed animation-name none on the svg and ::after; thumb transition-property none / 0s. Control run: 2 animations, thumb `transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1)`.
  - 44 px: 36 interactive elements measured, all ≥ 44 (shields 48×48, switches 60×44, chips 83–85×44, segmented 95×44, stepper buttons 44×44, gold 48 tall, ⋯ 44×44, back 44×44). Keyboard Tab through the 33 enabled controls: all `solid 3px rgb(242, 190, 92)`, offset 2px, :focus-visible true.
  - Icons: 7 swords (5 headings + 2) and 2 laurels on one page, 11 svg ids all unique, 13 url(#…) refs all resolve inside their own svg; both standalone lambdas stroke rgb(26, 18, 5) 2.6px, fill none, no .lam rule in scope. Screenshot `scratch/kit/icons-two-copies-390-dpr2.png`.
  - Screenshots: `scratch/kit/kit-390x844-dpr2-full.png`, `scratch/kit/kit-440x956-dpr2-full.png` (scrollWidth 390 / 440). After removing the hook, `#kit` renders Today (smoke.js).
- Review (one reviewer; `sonnet` alias → HTTP 404 in this setup, opus used): spec ✅, 0 Critical, 0 Important, 7 Minor, Approved. Dispositions:
  - m1 Skip → Task 21: open, failed and stalled all expose aria-pressed false and the same label (the label stays status-free so the pop key survives the re-render); add the state as visually hidden text or aria-describedby.
  - m2 Needs ruling (owner): board graphics under 3:1 (open `.mini` outline #6b5a36 ≈ 2.6–2.8:1; stalled shield ≈ 2.1:1) vs CLAUDE.md 3:1; call 1 says copy exactly. Reviewer's fix if wanted: `.mini svg .b{stroke:var(--outline)}` (4.3:1).
  - m3 Skip → Task 19: the switch thumb slide never plays after a re-render.
  - m4 Skip → Task 21 (with Task 9 M2): focus drops to body after a tap that re-renders; affects VoiceOver too.
  - m5 No change: `.chip.on` uses `var(--gold-grad)` (board gradient lacks the 0 %/100 % stops; identical rendering; disclosed).
  - m6 Skip → Task 11: `.td` marks the row's `date` (the viewed day), not necessarily today; Task 11's week strip decides whether that is intended.
  - m7 Skip (no owner task; extend when needed): `icon()` id rewrite follows fill/stroke `url(#…)` only, not href/clip-path/mask/filter.
- Deferred:
  - `.row.first` (first-row border) and plate padding 0 for task lists → owners: Tasks 11, 12.
  - Accessible names for chip/segmented groups at their call sites → owners: Tasks 11, 15–19 (the screens that use them).
  - `.td` = viewed day vs today (m6) → owner: Task 11.
  - Switch thumb slide never visible after a re-render (m3) → owner: Task 19.
  - Focus after a tap re-render (m4); failed/stalled state for assistive tech (m1) → owner: Task 21.
  - `.mini`/stalled outline contrast under 3:1 (m2) → owner ruling needed.
  - Task 20: none.
- Next: Task 11.

## Task 10 fix round: graphic contrast for open dot and stalled shield
- Commits: `f746f81` test(ui): graphic contrast for open dot and stalled shield (failing, WIP) — new `tests/contrast-graphics.test.js` (31, 7 tests) only; "fix(ui): graphic contrast for open dot and stalled shield" (styles.css, src/ui/taskRow.js, this entry; a commit cannot contain its own hash, see `git log`). Base `00ba9dc`. `tests/contrast.test.js` and every other existing test untouched.
- Owner rulings (2026-10-13, recorded as given; the approved board wins except where it breaks the CLAUDE.md 3:1 graphics rule):
  1. Review m2 fixed now: (a) open habit-dot outline `.mini svg .b` stroke → `var(--outline)` (#85795f); (b) stalled shield keeps the dashed outline and muted look, opacity raised by the smallest amount giving ≥ 3.1:1 on the surface it sits on; (c) not-due (off) dots stay muted: inactive, exempt from 3:1.
  1c follow-up (owner, asked during the fix): off dots rendered as the same plain `.mini` as open dots, so CSS alone could not keep them muted. taskRow adds class `off` for 'off' dots and styles.css adds `.mini.off svg .b{stroke:#6b5a36}` (the old board value). Commit 2 therefore also contains `src/ui/taskRow.js` (one class token + its comment). A not-due today dot still gets the `.td` gold dashed outline (`.mini.td` comes later in the cascade).
  2. New test file `tests/contrast-graphics.test.js` (helpers copied from tests/contrast.test.js): resolves the stroke colour and opacity from styles.css for the outline token, open/done/failed/stalled shield, open/done habit dot, composites opacity over the surface, asserts ≥ 3 on both plate stops (`--plate-top` #1c1b20, `--plate-bot` #141317; the lighter stop is the binding one).
  3. Personal-data grep from now on: `grep -nPi` on added lines with the owner's name and surname, the mail domain, a digit followed by an optional space and kg/lbs at a word end, and the body-mass word stem only when not preceded by "font-" (negative lookbehind); font-weight is not a hit. (The literal pattern is kept out of this file so the grep does not match itself.)
  4. Gold button height stays 48 (Kit); Tasks 12 and 16 set it per screen board (DESIGN-SPEC §2 says 54) → owners: Tasks 12, 16.
  5. m1 → Task 21, m3 → Task 19, m4 → Task 21, m6 → Task 11 (already recorded in the Task 10 entry; confirmed).
- Ratios (same helpers as the tests; stroke composited over the surface; top = #1c1b20 / bot = #141317):
  - Before: stalled shield (#85795f at opacity .55) 2.115 / 2.147; open dot #6b5a36 2.560 / 2.767.
  - After: stalled shield opacity .82 (smallest two-decimal opacity with min ≥ 3.1) 3.116 / 3.316; open dot var(--outline) 3.991 / 4.314. Unchanged: outline 3.991 / 4.314, done 13.435 / 14.520, failed (--crimson) 4.788 / 5.174, done dot 13.435 / 14.520.
- Commands:
  - RED at `f746f81`: `node --test --test-reporter=tap tests/contrast-graphics.test.js` → exit 1, 5 pass / 2 fail: `.shield.stalled on --plate-top: 2.115 < 3`, `.mini svg .b on --plate-top: 2.560 < 3`.
  - GREEN: same command → exit 0, 7/7. `node --test "tests/**/*.test.js"` → exit 0, 306/306 (299 + 7). Bare `npm test` reports 605/605: `node --test` also discovers the 299 tests inside the git-excluded preview worktree `scratch/kit-preview` (at 00ba9dc); it returns to 306 once that worktree is removed.
  - `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(" src/ui` → exit 1. `grep -rn innerHTML src/ui` → exit 1. Personal-data grep (ruling 3) on added lines → exit 1.
- Visual: the stalled shield is slightly brighter (opacity .55 → .82, still dashed); open habit dots have the brighter shield outline; not-due dots unchanged.
- Deferred: gold button height per screen → Tasks 12, 16. Others unchanged from the Task 10 entry.
- Review (one reviewer, opus): spec ✅, 0 Critical, 0 Important, 4 Minor, Approved. Dispositions:
  - n1 Skip → Task 21: the test's `decl` reads the first rule with a matching selector, so a later duplicate overriding rule would go unseen; the stalled check assumes `.shield.stalled` has no stroke of its own (true today). Tests are not edited.
  - n2 Skip → Task 21: the faint gold drop-shadow behind the shield (alpha .14) is not modelled; margin is thin (3.116 vs 3.1) → check the stalled shield on the real iPhone.
  - n3 No change: open-today dot (`.mini.td`, 10.0:1) and the exempt off dot have no test; not required by the ruling.
  - n4 Owner action: bare `npm test` counts the preview worktree's tests (605 vs 306) until `scratch/kit-preview` is removed (owner's cleanup, before Task 11).
- Next: Task 11.

## Task 11: Tasks tab, add/edit sheet, ⋯ menu
- Commits: `11854a3` test(ui): tasks week strip and form helpers (failing, WIP) — `tests/tasksLogic.test.js` (157, 22 tests) and `tests/tasksLogic-tz.test.js` (24, 3 time-zone runs) only, never edited afterwards; "feat(ui): tasks tab" (implementation, `tests/contrast-tasks.test.js`, this entry; a commit cannot contain its own hash, see `git log`). Base `3506efb`.
- Files (lines): new `src/views/tasks.js` (67), `src/views/taskSheet.js` (77), `src/views/tasksLogic.js` (30, DOM-free helpers: `DAY_NAMES`, `weekOf`, `weekLabel`, `dayLabel`, `formFromTask`, `draftFromForm`, `toggleDay`), `tests/contrast-tasks.test.js` (58, 6 tests); modified `src/app.js` (93), `sw.js` (71; ASSETS += the 3 views, VERSION unchanged `1.0.23`), `screens.css` (122), `styles.css` (158; line 83 comment only: stalled opacity is .82 since the contrast fix). Untouched: `src/sheet.js`, `src/dom.js`, `src/ui/*`, `src/icons.js`, `src/core/*`, `src/logic.js`, every existing test.
- Commands:
  - RED at `11854a3`: `node --test tests/tasksLogic.test.js tests/tasksLogic-tz.test.js` → exit 1, 0/4 (ERR_MODULE_NOT_FOUND `src/views/tasksLogic.js`; the three TZ runs fail with it).
  - GREEN: same command → exit 0, 25/25 (22 + Europe/Sarajevo -60, America/Los_Angeles 480, Pacific/Auckland -780, each asserting `# pass 22`, `# fail 0`). `npm test` → exit 0, 337/337 (306 + 22 + 3 + 6).
  - `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(" src/ui src/views` → exit 1. `grep -rn innerHTML src/ui src/views` → exit 1. Personal-data grep (Task 10 ruling 3) on added lines, case-sensitive and -i → exit 1. Board sample strings grep → exit 1.
  - Contrast (tests/contrast-tasks.test.js, values read from screens.css): .wk label 8.80 / number 15.86 on #151418; .wk.sel label 7.53 / 8.81 and number 9.19 / 10.75 on #2a2214 / #17140f; .wk.sel border #7a5a24 3.12 and meander stroke #8a6a2c 3.94 on --bg; field text 16.39; labels 8.21 / 8.88; links 10.02 / 10.83; destructive and errors 7.17 / 7.75.
  - Browser (playwright-cli, `npx --no-install serve -l 5173`, 390×844 DPR 2 and 440×956; scripts and output in the git-excluded `scratch/t11/`): 3 tasks added through the sheet by UI clicks (neutral text), 93 flow checks, 0 FAIL, 0 console errors; every control ≥ 44 (week days 44.8×68, + 48×48, shields 48×48, ⋯ 44×44, sheet Cancel/Add 44 tall, inputs 48, chips 44, day chips 44.6×44); input font 18, textarea 16; scrollWidth = width at 440.
  - compare.py (`python -E -P`, tol 12) vs `reference/Tasks.png`: full 390×1280 13.96 % (3 tasks vs the board's 5 + 4 habits); header crop 0.85 %, header + week 2.98 %, week strip 6.69 % (dates differ, no dot). CSS not tuned to the numbers.
- Owner rulings 2026-10-13 (recorded as given):
  - R1 Deferred `.row.first` and plate padding 0 for task lists: settled per reference/Tasks.png as `.plate.list{padding:0;overflow:hidden}` and `.plate.list>.row:first-child{border-top:0}` in screens.css. **Task 12: build the Today task list as `plate(...)` + class `list` to reuse it.**
  - R2 Skip on a repeating task applies to the VIEWED date; label "Skip today" when viewDate is today, "Skip this day" otherwise. Deliberate deviation from the plan label "Skip today".
  - R3 (m6) The dashed `.td` habit dot marks the viewed day (the row's date), not necessarily today. reference/Tasks.png does not contradict it (the board's dashed dot is the selected day, which is also its today). Kept.
  - R4 Gold button height not touched (Tasks 12 and 16 own it).
- Controller rulings (each with its cost if wrong):
  - V1 `app.viewDate()` = `requestedDate ?? today()`: the old `resolveViewDate` clamp made future dates impossible, against the plan's "future dates allowed for planning". `resolveViewDate` stays in logic.js for its frozen test, unused in src. Cost: one-line revert; a requested date survives a resume (as in v1).
  - V2 `+` on a past day opens the sheet with today's date (past is read-only); the `+` stays visible. Cost: owner may prefer it hidden on past days.
  - V3 No week-strip dot (`.wk i`/`.wk i.d`): its meaning is not specified anywhere. Cost: visual deviation; today has no visual mark when another day is selected (aria-current only).
  - V4 Habits section = habits due on the viewed date (from `tasksOn`), drawn with the shared taskRow; no weekday-letter header and no "n of 7 · streak" line (no core selector). Cost: a habit not due that day is not listed; visual deviation.
  - V5 Once-only `Delete` → `archiveTask` (core has no hard delete; history kept). Cost: archived once-only tasks stay in state.
  - V6 An emptied date input is ignored (reset to the last date): core never sees '', no invented error copy.
  - Past days: ⋯ hidden by `.ro .more{visibility:hidden}` (keeps layout, leaves tab order and accessibility tree) plus an early return in `onMenu`; taskRow.js is not editable in this task.
  - The owner's brief names "src/core/dates.js helpers"; that file does not exist. The local-date helpers are in `src/logic.js` (plan Global Constraints) and were used.
  - Sheet copy: titles `New Task` / `Edit Task` (openSheet needs a title; the plan names only the actions Add / Done).
  - SDD ledger, brief, report and review for this task kept in `scratch/t11/` (owner rule: scratch output only in scratch\).
- Accessible names (the Deferred item owned by Task 11): Repeat chips `role=group` aria-label "Repeat"; Custom day chips `role=group` aria-label "Days", each chip aria-label Monday…Sunday; week-strip days aria-label like "Tuesday 20 October", aria-pressed, aria-current="date" on today.
- Deviations from reference/Tasks.png: no week-strip dot (V3, label and number ~4.5 px lower); habits use the shared taskRow layout (shield left, ⋯ present, dots under the title) instead of the board's habit row, no weekday header, no streak line (V4); time "09:00–10:00" without the board's " · 1h 30m" (Task 10 taskRow); ⋯ label "Task options" vs board "More actions"; "n of m done" counts once-only tasks only; the sheet and action sheet have no board (v1 layout, v2 tokens, fields = board `.in`/`.ta`).
- Review (one reviewer, opus): spec ✅, 0 Critical, 2 Important, 8 Minor, Approved. Dispositions:
  - I1 PROGRESS.md entry missing → fixed (this entry, controller).
  - I2 Manual check list missing from the commit body → fixed (commit message, controller).
  - m1 → Task 21: the `role=status` error `p` is `display:none` while empty (`.form-error:empty`), so VoiceOver may not announce the first error; keep it rendered.
  - m2 Needs ruling (owner): the Date input has no `min`, so a new or edited task can be dated in the past (plan and core silent). Fix if wanted: `min: app.today()` + the V6 reset.
  - m3 Needs ruling (owner): the meander's 1 px bottom line `#8a6a2c` at .6 is 2.12:1 on --bg (the stroke, 3.94, is asserted); treated as decorative (aria-hidden, masked), like `.mini.off`.
  - m4 → Task 21: below 390 css px the week days drop under 44 (42.7 at 375) and the 7 day chips overflow the sheet by ~9 px; the owner's phone is 440 (no impact now).
  - m5 → Task 21 (with Task 10 m4): focus drops to body after a ⋯ action (the ⋯ button has no id; taskRow.js is Task 10's).
  - m6 → owner at the Task 12 iPhone checkpoint: today has no visual mark when another day is selected (V3).
  - m7 → Task 12: viewDate is shared and no longer clamped; after picking a future day on Tasks, Today must use `app.today()` or reset the view date.
  - m8 No change: duplicate `.wk` rule (box-shadow line) copied from the board's CSS as is.
- Apple-design audit (audit only, no code change): Cancel leading / Add trailing, grabber, swipe-to-dismiss with the Discard Changes action sheet match `sheets.md`; `action-sheets.md › Best practices` puts destructive choices at the top, the plan orders Delete last → owner (no change); Delete (archive) has no undo but sits behind the action sheet with Cancel → Task 21.
- Deferred:
  - Error announcement (m1), < 390 px targets (m4), focus after ⋯ (m5), delete undo → owner: Task 21.
  - Today tab view date (m7) and `.plate.list` reuse (R1) → owner: Task 12.
  - Past-dated tasks via the Date input (m2), meander line contrast (m3), destructive item order → owner ruling needed.
  - Task 20: none.
- Next: Task 12.

## Task 11 fix round: sheet layout, notes behind the ⋯ menu
- Commit: "fix(ui): tasks sheet layout and hide notes behind the menu" (a commit cannot contain its own hash, see `git log`). Base `0c40e42`. Files: `screens.css` (124), `src/views/tasks.js` (76), `src/views/taskSheet.js` (79), `src/ui/taskRow.js` (29), this entry. `src/sheet.js`, `src/dom.js`, every test and `sw.js` VERSION untouched.
- Sheet layout: `.form`/`.fld` `grid-template-columns:minmax(0,1fr)` (+ `.fld` min-width 0), `.fld-2` `minmax(0,1fr) minmax(0,1fr)`, `.in` max-width 100% + appearance none, `.in::-webkit-date-and-time-value{text-align:left;min-width:0}`; `.sheet-body` overflow-x hidden as a safety net only.
- Proof (playwright-cli, Chromium, 360/390/440; `scratch/t11fix/`): before.txt and after.txt both show scrollWidth == clientWidth and every `.in` inside the 20 px gutter. Chromium does not reproduce the iPhone overflow with the old rules; WebKit is not installed (not downloaded). Stress test `stress.txt` (date/time inputs forced to 400 px, an input that ignores width:100%): old rules overflow (scrollWidth 585/600/625 vs 358/388/438), new rules with the safety net removed fit (358/388/438, right edges ≤ viewport − 20). Device check on the iPhone still needed.
- Time vs note: `.rtm` renders next to the note (Chromium, `row-time-note-before.png`: "09:00–10:00" above "Note N"); no root cause to fix.
- Notes: the row no longer shows the note (`.rn` line removed from taskRow; the `.rn` rule in styles.css is now unused, left for a later cleanup since styles.css was out of scope). The ⋯ action sheet shows the note as its message (no message when empty); items unchanged, one core call each; aria-label "Task options" kept.
- ⋯ on past days: shown only for tasks with a note, opens `openActionSheet([], { message: note, cancel: 'Close' })` (no Edit/Skip/Move/Delete; no change to src/sheet.js). Rows without a note get class `nn` (tasks.js); `.ro .nn .more{visibility:hidden}` replaces `.ro .more`. Shield still toggles.
- Owner rulings 2026-10-13:
  - m2: the Date input of a NEW task has `min` = today's local key (`app.today()`); a picked date before it is reset like the V6 empty date. Edit mode sets no min.
  - m3: the meander's bottom line (2.12:1) is accepted as decoration.
- Commands: `npm test` → exit 0, 337/337. Forbidden date grep and innerHTML grep on src/ui src/views → exit 1. Personal-data grep on added lines → exit 1. Proof scripts: `measure*.js`, `stress.js`, `notes.js` (15 PASS, 0 console errors).
- Deferred: unchanged from the Task 11 entry, minus m2 and m3 (ruled).

## Task 11 fix round 2: week navigation and today marker
- Commit: "feat(ui): week navigation and today marker on the tasks strip" (a commit cannot contain its own hash, see `git log`). Base `667f240`. Files: `src/views/tasks.js` (105), `screens.css` (133), `tests/contrast-tasks.test.js` (69; 2 tests ADDED, existing ones unchanged), this entry. `src/sheet.js`, `src/dom.js`, `src/app.js`, existing tests and `sw.js` untouched (no new file, so ASSETS unchanged; VERSION unchanged).
- Round 1 confirmed on the iPhone by the owner (sheet layout, notes in the menu, date minimum).
- m6 closed: today's week-strip button gets class `today`: gold number (`--accent`) and a 5 px gold dot under it (shape, not colour alone); kept when today is also selected (`.sel` look + dot). The board's `.wk i` box is now on every day (hidden except on today), so all seven numbers sit at the same y (measured 184 at 360/390/440); compared with Task 11 the label and number are back at the board's position (~3.5 px higher, the dot block restored). `aria-current="date"` kept; the dot is `aria-hidden`.
- Contrast (added to tests/contrast-tasks.test.js): `.wk.today i` dot `#F2BE5C` on `--plate-alt` #151418 = 10.737 (≥ 3); `.wk.today span` number = 10.737 (≥ 4.5); `.more.tdy` "Today" text `#F2BE5C` on the `.more` background #1d1c21 (read from styles.css) = 9.913 (≥ 4.5).
- Week navigation: header group ‹ › + ; ‹ and › are 44×44 `.more` ghost buttons (styles.css, no new colours) with `icon('chevronLeft'|'chevronRight')`, aria-label "Previous week" / "Next week", press = `app.setViewDate(addDays(viewDate, ∓7))` (logic.js), today stored as null (existing convention). The weekday is kept (Tue → Tue).
- "Today" text button (44 tall, `.more tdy`, `--accent` text): rendered only when `weekOf(viewDate)` does not contain today (absent from the DOM otherwise); press = `app.setViewDate(null)`. Ruling (owner fallback): next to ‹ › + it does not fit at 360 (+ right edge 368 > gutter 340, measured), and at 390 it left only 8 px beside "OCTOBER · WEEK 43"; so it sits under the eyebrow line at every width. Cost: when it appears or disappears the header grows/shrinks by 52 px and the page below shifts (see apple notes).
- Swipe: pointer events on the strip, `touch-action: pan-y` (vertical page scroll stays native); |dx| ≥ 48 px and |dx| > |dy| → swipe left = next week, right = previous week. The click that follows a swipe is swallowed in the capture phase on the swiped strip (the strip may already be detached by the re-render, its own subtree still sees the click), so a swipe never selects a day; a plain tap still selects. No animation, no new core state, no new files.
- Past weeks read-only and future weeks editable: unchanged (same `past` rule).
- Proof (playwright-cli, Chromium, 360/390/440, `scratch/t11fix2/proof.js` → `proof.txt`): 78 PASS, 0 FAIL, 0 console errors. Document scrollWidth == clientWidth everywhere; ‹ › 44×44, + 48×48, Today 62×44, all right edges ≤ viewport − 20, title/eyebrow never reach the nav group (also with the longest eyebrow, "September · week 39"). Flow: › → next week, label and 7 numbers change, Today shown, no dot; Today → current week, button gone; ‹‹ → no dot, Today shown; select a day there, back → dot still on today; mouse swipe left/right changes week and keeps the weekday (no day picked); synthetic 60 px swipe on one day button + its click → week changes, click swallowed; mostly vertical drag → no change; plain tap selects.
- Commands: `npm test` → exit 0, 339/339 (337 + 2). Forbidden date grep and innerHTML grep on src/ui src/views → exit 1. Personal-data grep on added lines → exit 1.
- Deferred: m7 still owned by Task 12 — `app.viewDate()` is shared and now also moves by whole weeks; Today must use `app.today()` (or reset the view date) so a Tasks-tab week never leaks into Today. Others unchanged.

## Task 11 fix round 3: Today icon button in the header
- Commit: "fix(ui): today icon button in the tasks header" (a commit cannot contain its own hash, see `git log`). Base `2cb812c`. Files: `src/views/tasks.js` (113), `screens.css` (135), this entry. `src/icons.js`, `src/sheet.js`, `src/dom.js`, `src/app.js`, every test and `sw.js` untouched.
- Round 2 confirmed on the iPhone by the owner (swipe, chevrons, today dot).
- Placement ruling (owner): the "Today" text button under the eyebrow is replaced by an icon button in the header's right-aligned group, directly LEFT of ‹: [Today] [‹] [›] [+], gap 6. The group is `flex:none` and right-aligned, so the icon grows it to the left and ‹ › + never move (measured: identical left/right with and without the icon at 360/375/390/440). The round-2 52 px header jump is gone.
- Style ruling: the icon reuses the `.more` ghost button (44×44, styles.css) with the glyph in `--accent` (`.more.tdy`, contrast 9.913 on #1d1c21, asserted since round 2); aria-label and title "Go to today", no visible text; rendered only when `weekOf(viewDate)` does not contain today (absent from the DOM otherwise); press = `app.setViewDate(null)`. No calendar/target icon exists in src/icons.js, so the glyph is `icon('plus')` re-pathed like `plusIcon()` (22 box, stroke 2.4): a rounded calendar outline with a dot drawn as a zero-length round-capped stroke. icons.js unchanged.
- Owner ruling on 360 px (replaces "one row in every state"): option 1, the eyebrow may wrap; NO media queries and NO fixed breakpoints for this header. The header may grow in height ONLY because the eyebrow text wraps; nothing may overlap, clip or overflow. 375 px is the narrowest supported width (360 is a stress width). Implementation: `.tk-hd{display:flex;align-items:flex-end;gap:8px}`, left block `flex:1 1 auto;min-width:0` (shrinks, eyebrow wraps), `.tk-nav{flex:none;gap:6px}`. No fallback or media-query code was ever added (diff has 0 `@media`).
- Measurements (`scratch/t11fix3/header.js` → `header.txt`, Chromium; longest eyebrow "September · week 39" with and without the icon):
  - 390 and 440: eyebrow never wraps; header 56 px in every state; strip y 157; clearance to the group ≥ 8 (390 with icon: 8.0 box / 9.6 to the eyebrow text).
  - 375: current week 56 px (= 390). With the icon and "September · week 39" the eyebrow wraps to 2 lines: header +14 px (70), strip y 171; with "October · week 43" it stays one line (56). Clearance 8.0 px (group l 157, left block r 149, text r 144.5).
  - 360 (stress, below the supported 375): current week 56 px; with the icon the eyebrow wraps (+14 px) AND "TASKS" (text r 144.5) no longer fits its block (r 134): 2.5 px past the group's left edge (142), clearance −2.5 → FAIL by design math: TASKS 124.5 + 2 × 20 gutter + 8 + group 198 = 370.5 px minimum. Title size kept (owner rule).
  - No horizontal overflow at any width or state; every button ≥ 44×44 inside the gutter.
- Re-runs: round-2 flow `scratch/t11fix2/proof.js` → 78 PASS, 0 FAIL; round-1 notes `scratch/t11fix/notes.js` → 15 PASS; round-1 sheet measurements → all OK; Task 11 `scratch/t11/flows.js` → 91 checks PASS, then stops at its past-day step because it creates a past-dated task through the New Task sheet, which the round-1 date minimum (m2) now blocks; that path is covered by round-1 notes.js.
- Commands: `npm test` → exit 0, 339/339. Forbidden date grep and innerHTML grep on src/ui src/views → exit 1. Personal-data grep on added lines → exit 1.
- Deferred: m7 still owned by Task 12 (viewDate must not leak into Today). 360 px overlap with the Today icon: below the supported width, no action unless the owner asks.
- Owner ruling 2026-10-13: Delete stays last in the ⋯ menu (Apple's action-sheet guidance puts destructive items first; the plan's order is kept). No change.
- Deferred, owner Task 21: keep "week N" together in the eyebrow with a non-breaking space so it never wraps as "SEPTEMBER · WEEK / 39" at 375 px (weekLabel is covered by frozen tests, so the change needs owner-authorised test edits).
- Deferred, owner Task 21: the `.rn` rule in styles.css is unused since round 1; delete it.

## Task 12: Today tab
- Commits: `cb2c064` test(ui): today tab logic and night at 20:00 (failing, WIP) — tests/challenge.test.js (the 3 owner-authorised spots only), tests/challenge-today.test.js (25), tests/todayLogic.test.js (153, 20 tests), tests/todayLogic-tz.test.js (24, 3 zone runs); never edited afterwards. "feat(ui): today tab" (implementation, tests/contrast-today.test.js, this entry; a commit cannot contain its own hash, see `git log`). Base `1b250f8`.
- Files (lines): new `src/views/today.js` (118), `src/views/todayLogic.js` (27, DOM-free: `todayCards`, `timeLeft`), `tests/contrast-today.test.js` (61, 4 tests); modified `src/core/challenge.js` (116; only `NIGHT_FROM` 18 → 20 and nextAction `r.filedAt == null`), `src/views/tasks.js` (117; only the exported `openTaskMenu(app, view, date)`, renderTasks calls it), `src/app.js` (95; only the today route), `screens.css` (177; Today block at the end), `sw.js` (73; ASSETS += today.js, todayLogic.js; VERSION unchanged `1.0.23`). Untouched: src/sheet.js, src/dom.js, src/icons.js, src/ui/*, every other core file and existing test.
- Commands:
  - RED at `cb2c064`: `npm test` → exit 1, 344 tests, 337 pass, 7 fail: "nextAction constants", "nextAction boundaries: … 19:59 afternoon, 20:00 night", the filedAt 0 test, tests/todayLogic.test.js (ERR_MODULE_NOT_FOUND), todayLogic-tz × 3. The "night at 21:00" edit cannot be red against 18 (21 ≥ 18): 2 of the 3 authorised edits were red.
  - GREEN: `npm test` → exit 0, 367/367 (339 + 1 filedAt + 20 todayLogic + 3 zone runs + 4 contrast). Zone runs: Europe/Sarajevo -60, America/Los_Angeles 480, Pacific/Auckland -780, each `# pass 20`; DST days 2026-10-25, 2026-11-01, 2026-09-27 in every zone.
  - Forbidden date grep and innerHTML grep on src/ui src/views → exit 1. viewDate/setViewDate/setInterval grep on today.js, todayLogic.js → exit 1. Personal-data grep on added lines → exit 1.
  - Contrast (tests/contrast-today.test.js; new colours #201d1a/#6e4f1f .rim, #2a2316 medallion, #5d4521 tile border, #7a5a24 medallion border = decorative edge): medallion number 9.11 / 10.83, "of 30" 7.46 / 8.88; tile icon 8.17; chevron 6.36 / 6.87, on .warn 6.44 / 6.87; recovery title 7.26 / 7.75; lit torch stand 6.19 / 6.69.
  - Browser (playwright-cli, fake clock, states built with the core functions in `scratch/t12/make-states.mjs`, 14 states at 390 and 440, measured at 375/390/440): 341 checks PASS, 0 FAIL, 0 console errors; no horizontal overflow, no overlap, every target ≥ 44, text ≥ 11. Flows 19 PASS (Today ↔ Tasks tick agreement both ways, ⋯ on Today shows the note as the message, m7, "Not now" leaves localStorage byte-identical).
  - compare.py (`python -E -P`, tol 12) vs reference/Main.png at 390×1260 @2x: 16.36 %. Header, medallion, meander and tab bar match; the rest is the not-built parts below (Up next card absent moves everything ~330 px up).
- Owner rulings (this task's prompt): NIGHT_FROM 20 (DESIGN-SPEC §8), AFTERNOON_FROM stays 12; filedAt 0 = filed (closes Task 5 Minor 9); Today counts ALL tasks due today, once-only and habits ("n of m done"), on purpose unlike the Tasks tab (once-only only); gold button stays 48 on Today (static/Main.html; the 54 of DESIGN-SPEC §2 is CheckIn, Tasks 15/16).
- Controller rulings (cost if wrong):
  - R1/R2 `todayCards(state, nowMs, { afternoonDismissed })` → `{ kind, href }` (recovery adds date, msLeft, overdue). Order: no challenge → [start] only; pending recovery first; closeYesterday when `yesterdayOpen` (replaces the morning card; shown even when today is day 31 so day 30 can close); then nextAction's card. Cost: one branch.
  - R3 `timeLeft` rounds minutes up ("1m left" for 30 s, never "0m" while time remains); "Overdue" comes from pendingRecovery's flag. Cost: one label.
  - R4 "Laurel with the day number" = the board's 60 px day medallion right of the title (Main.png; DESIGN-SPEC puts the laurel wreath on Challenge and Day 0). Cost: swap in `icon('laurel')`.
  - R5 Recovery and Start Day 1 are whole-plate links with a chevron (no button copy given); action cards = board hero `.plate.rim` with the shield watermark, title, line, gold button (+ ghost "Not now").
  - R6 "Not now" = module variable keyed by date, re-render via a `hashchange` event; never saved.
  - R7 `openTaskMenu` is the one shared ⋯ opener (no duplicate menu code).
  - Lining figures on the card line, status row and streak (Alegreya Sans old-style 0 read "7h om left").
  - Stable ids `td-*` on Today's buttons/links so the 30 s re-render keeps focus.
- Deviations from reference/Main.png (owner rulings, behaviour 8, unless marked): no "Up next" card (no selection rule); no mission title (pack content, Task 14) — the streak line sits in its slot; no "Red lines · n of n held today" section (no per-day data before the night); no 30-pip row (controller, not in the owner's list); rows have no note line (Task 11); time "10:00–11:30" (Task 10); ⋯ ≥ 44 (board ~39); card titles 30/34 (board hero 36/38); section gap 24 (board 26, reuses `.tk-sh`); medallion is not a link (the challenge plate is).
- Review (one reviewer, opus): spec ✅, quality Approved, 0 Critical, 0 Important, 7 Minor. Fix round 1 (scoped re-review: all addressed): m1 ids for focus, m2 sibling margin rules scoped to Today classes, m3 contrast gaps, m7 explicit `td-cl1` class, plus proof finding P1 (lining figures). m4 third copy of the icon re-path technique → Task 21. m5 stale screen() comment in app.js (owner allowed only the route there) → Task 13. m6 recorded above (21:00 edit never red).
- Closed: m7 (Today uses Date.now() and app.today() only; browser proof: Tasks on 28 Oct in the next week, Today still "Tuesday 20 October" with today's tasks), R1 `.plate.list` reuse, Task 5 Minor 9, gold button height for Task 12, NIGHT_FROM, the nextAction-yesterday notes (Task 3 Deferred "Task 12/15" and "Task 12": Today shows one "Close yesterday" card from `yesterdayOpen` with NIGHT_TEXT['yesterday-open']; nextAction itself is unchanged).
- Needs owner ruling (checkpoint): (1) medallion vs laurel (R4); (2) a pending Recovery hides the afternoon and night cards too, and while it stays overdue no check-in card appears on later days (nextAction returns 'recovery' first); (3) "Night opens 20:00" stays after 20:00; (4) medallion not a link; (5) the forced-full-pass line shows together with the crimson Recovery card.
- Deferred:
  - Icon re-path helper shared (m4) → owner: Task 21.
  - app.js screen() comment (m5) → owner: Task 13.
  - Task 3 Deferred "Task 12/15" second half (the morning check-in screen itself refusing while yesterday is open) → owner: Task 15.
  - Task 21: installed-app checks not done at the Task 12 checkpoint (owner tested in Safari only): tab bar against the home indicator, 440 px wall seam (Task 9 m4), Task 11 m6. Owner may report earlier.
- Next: Task 13.
- Owner rulings 2026-10-13 on the five "Needs owner ruling" items:
  - Q1 accepted: the day medallion (board) stands in for the laurel on Today.
  - Q2 accepted: a pending Recovery hides the afternoon and night cards too (nextAction returns 'recovery' first).
  - Q3 changed: "Night opens …" renders only before NIGHT_FROM; at or after it, nothing. `nightLineVisible(nowMs)` in todayLogic.js; renderToday passes one `Date.now()` to the plate.
  - Q4 accepted: the medallion is not a link; the challenge plate is.
  - Q5 changed: the "No MED today" line is not rendered while a Recovery is pending. `medLine(state, today, nowMs)` in todayLogic.js reads `pendingRecovery`, the same source as `todayCards`.
  - Fix commits: "test(ui): night line and MED line rulings (failing, WIP)" (tests/today-fixes.test.js, 7 tests; red 374/367/7, exit 1) and "fix(ui): today night line and MED line" (green 374/374). Browser re-run (scratch/t12/proof2.tpl.js, recovery pending, 19:59, 20:00, 21:00 at 375/390/440): 106 checks PASS, 0 FAIL, 0 console errors, no overflow, no overlap.

## Task 13: Challenge tab, Day 0, Declare Redo, graduation
- Commits: `96f0146` test(ui): challenge tab and day 0 (failing, WIP) — tests/challengeLogic.test.js (306, 36 tests), tests/challengeLogic-tz.test.js (24, 3 zone runs), tests/contrast-challenge.test.js (91, 6 tests); never edited afterwards. "feat(ui): challenge tab and day 0" (implementation + this entry; a commit cannot contain its own hash, see `git log`). Base `2521b96`.
- Files (lines): new `src/views/challengeLogic.js` (64, DOM-free: CHALLENGE_LENGTH, setupLists, begin, beginStatus, oathRows, challengeEnd, graduated, stripCells, legend, redoStatus, confirmRedo, missionInfo, graduation, rateLabel), `src/views/challenge.js` (136, renderChallenge: active + graduation), `src/views/day0.js` (63, renderDay0); modified `src/app.js` (98; challenge route + the stale screen() comment, closes Task 12 m5), `screens.css` (248; Challenge block at the end, +71), `sw.js` (76; ASSETS += 3 views, VERSION unchanged `1.0.23`). Untouched: every src/core file, src/ui/*, src/sheet.js, src/icons.js, src/dom.js, today*.js, tasks*.js, every existing test.
- Found in core (owner item 5): `challenge.redoUsed` is stored as the declared day's date `'YYYY-MM-DD'` (declareRedo sets `redoUsed: today`; model.js `orNull(isDate)`), so "Used on Day <n>" = `dayNo(state, redoUsed)`. declareRedo runs its today check only when the third argument is given; the view calls `confirmRedo(app.state, today, Date.now())` (challenge.js:95; tested: a nowMs on another local date is refused). startChallenge hard-codes length 30 and exports no constant → `CHALLENGE_LENGTH` is read from a throwaway startChallenge call (Day 0's "of n" only; active screens use `challenge.length`).
- Commands:
  - Preconditions: `git fetch origin` exit 0; HEAD `2521b96`; status empty; origin v2 `2521b96460250cab27140bf3875d4ceb1aedf810`; origin main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 374/374.
  - RED at `96f0146`: `npm test` → exit 1, 384 tests, 374 pass, 10 fail: tests\challengeLogic.test.js (ERR_MODULE_NOT_FOUND); "Europe/Sarajevo / America/Los_Angeles / Pacific/Auckland: tests/challengeLogic.test.js passes (36 tests)"; contrast: "strip: upcoming number, passed glyph on the gold stops, today number (board .dy / .dy.p / .dy.t)", "strip: redo cell (transparent, 1.5px ring) and reset cell (crimson fill), graphics >= 3", ".rim text: legend, DAY label, gold numeral stops, graduation title and stats >= 4.5", "Day 0 hero: numeral #9a8253 >= 4.5 and outline laurel #876126 >= 3 on both .rim stops", ".plate: oath shields (outline / gold + lambda), row subtitle, Declare and "Used on Day n"", "streak pill: text on accent @.08 over the page >= 4.5".
  - GREEN: `npm test` → exit 0, 419/419 (384 − 1 file-level failure + the 36 tests now running).
  - Greps on the three new views: forbidden-date exit 1; innerHTML exit 1; whole-word `30|20` exit 1 (added CSS lines: hits are px sizes and colour values only, no length); `@media` added 0; `confirmRedo(app.state, today, Date.now())` exit 0 (challenge.js:95). Personal-data grep on added lines: exit 0 only on `font-weight` and `background` ("kg") lines; with those lines excluded exit 1.
  - Browser (playwright-cli, fake clock, states from the core functions in scratch/t13/make-states.mjs, invented data, 8 states at 375/390/440): first run 311 PASS / 4 FAIL (today ring 1.5px rendered 1px in Chrome), 0 console/page errors; after fix round 1 (scratch/t13/proofs-fix1.txt) 316 PASS / 0 FAIL, 0 errors; no horizontal overflow, no overlaps, every target ≥ 44, min text 11 px. Glyph check at 375: closed cells hold an svg and no digit; today = number + 2px ring; upcoming = number + 1px hairline (scratch/t13/strip-375.png).
  - Flows (scratch/t13/flows.txt, all PASS): Declare Redo sheet message exact, actions "Declare Redo"/"Cancel", confirm → "Used on Day 9", redoUsed = today, focus lands on the "Used on Day 9" span; Cancel → localStorage byte-identical; sheet opened 23:59:30, clock past midnight, confirm → second sheet "You can only declare a Redo for today." + OK, storage identical (4421/4421); Begin Day 1 disabled with the first missing reason, click changes nothing; Day 0 Protocols / Red lines → "Available in Settings"; oath row → #warlog/contract, Open mission → #mission/9, War Log → #warlog.
  - compare.py (`python -E -P`, tol 12, --ignore-bg; same without): reference/Challenge.png 20.50 % → 15.48 % after fix round 1 (scratch/t13/compare-fix1.txt); reference/Onboarding.png 13.63 % (scratch/t13/compare.txt).
  - Serve: 5173 is held by an older serve (PID 36580, bound 0.0.0.0, serves this worktree; left running); proof runs used http://localhost:5173 (first run) and http://localhost:56971 (fix round 1).
- Owner rulings (this task's prompt): board decides on conflicts; declareRedo gets Date.now(); laurel owned here (Day 0 outline, Challenge gold, Today unchanged); strip glyph + colour; Day 0 stubs until Task 19; Used on Day derived from stored redoUsed; graduation from core counts, no NaN. Asked this session (2026-10-13): pre-Day-1 protocols / red lines have no storage in the data model → deferred to Task 19. Day 0 reads `setupLists(state)` = empty lists; Begin Day 1 stays disabled in the app ("Add at least one protocol." once the oath is written); the enabled state is proven only in tests/challengeLogic.test.js with injected lists.
- Controller rulings (cost if wrong):
  - R1 route: `challenge` → challenge ? renderChallenge : renderDay0; graduation inside renderChallenge; phase 'before' renders the active screen with n = 0. Cost: one branch.
  - R2 outline laurel = icon('laurel') restyled in day0.js (defs and vein group removed, one stroke); numeral #9a8253 (board #6b5a3a fails 4.5), outline #876126 (board #6b4d1e fails 3). Cost: two colours.
  - R3 Day 0 hero copy "The campaign starts tomorrow." + paragraph not rendered (startChallenge starts today; nothing sets protocols up automatically); button "Begin Day 1" (plan) not "Start Day 1: the Contract"; reason line under it. Cost: copy.
  - R4 oath rows: OATH_TITLES ("Contract", "The Code") not the board titles; subtitle "Written"/"Not written yet"; glyph = completion shield (gold + lambda / outline) via shieldSvg. Cost: copy + glyph.
  - R5 Day 0 Protocols / Red lines rows: second plate, "None yet"/"<n> added", stub sheet "Available in Settings". Board "Empty states" section not built. Cost: one plate.
  - R6 header streak pill "<n>-day streak" when currentStreak ≥ 1; fix round 1: text wraps to two lines (min-content), beside the title at 390/440, under it at 375 (338 > 335). Cost: header layout.
  - R8 strip: closed cells show the glyph instead of the number (check / redo arrow / X); today = number + 2px gold ring (board 1.5px; Chrome renders 1.5 as 1); future/open = number + hairline; aria-label per cell; legend Passed/Redo/Reset with glyphs. Board MED tile state not built. Cost: cell content.
  - R9 mission: title + body (pre-line), Open mission → #mission/<n>, War Log → #warlog; "Import a pack in Settings" only when no pack (fix round 1, m1; a pack lacking that day shows only War Log). Board quote / bullets / time line not built (pack has title + body only). Cost: one condition.
  - R11 Declared Redo plate full width; "1 left of 1" + Declare (13px, ≥ 44) / "Used on Day <n>" / Declare disabled when today is closed; `today` captured when the sheet opens, Date.now() at confirm; refusal = second action sheet with the core's error + OK. Cost: one flow.
  - R12 Protocols section (plan, not on the board); Red lines with "crossing one = Reset"; no "n days held". Cost: one section.
  - R13 graduation: gold laurel, "YOU FINISHED", Passed / Redo / Reset / Longest streak / Pass rate from graduation() (resultCounts, longestStreak, passRate); null rate → "—". Cost: layout.
  - New inline glyphs (CLAUDE.md icon rule): redo arrow (counter-clockwise, 2px round stroke, challenge.js redoGlyph, built on the check icon's svg); the streak-pill torch reuses the board's inline torch paths and Today's `.td-torch` style (second copy of today.js's helper; today.js is frozen in this task).
- Deviations from the board (compare.txt / compare-fix1.txt), all by the rulings above: Challenge — glyphs instead of numbers on closed cells; no MED tile or "MED 1" legend; mission quote, bullets, time line absent; Check-ins section, "MED this week" plate and "Know your enemy" card absent (R10, not assigned to Task 13); Declared Redo full width; Protocols section added; "n days held" absent; today ring 2px. Onboarding — hero copy absent (oath section ~129 px higher); "Begin Day 1" disabled vs "Start Day 1: the Contract"; reason line added; numeral and laurel colours; oath glyphs / titles / subtitles; extra Protocols / Red lines plate; no Empty states section.
- Review (one reviewer, opus): spec ✅, quality Approved, 0 Critical, 0 Important, 6 Minor. Fix round 1 (scoped re-review, opus: 6/6 addressed, no new breakage): m1 'before' + pack showed "Import a pack", m2 focus target after Declare, m4 dead class, m5 Declare 13px, plus proof findings P1 today ring 2px and P2 pill beside the title. m3 torch duplicate → Task 21. m6 disabled look of Begin Day 1 → checkpoint. Re-review minor: a pack without that day's mission leaves a 16px gap above War Log (cosmetic) → Task 21. Proof note P3: a finished challenge with zero closed days cannot be reached in the app (settleMissed closes every day as redo on load → "Pass rate 0%"); "—" is covered by the unit test only.
- apple-design audit (notes only, scratch/t13/apple-design-audit.md, no code changed): Medium — refusal and stub messages use action sheets with only OK (action-sheets.md "presents choices related to an action people initiate"; alerts.md "Avoid using an alert merely to provide information."); Medium — Begin Day 1 permanently disabled until Task 19; Low — tappable rows without chevrons.
- Deferred:
  - torch helper shared with today.js (m3) and the Task 12 m4 icon re-path helper → owner: Task 21.
  - mission plate gap when a pack lacks the day (re-review minor) → owner: Task 21.
  - #mission/<n> and #warlog/<key> land on the router placeholder → owner: Task 14.
  - pre-Day-1 storage of protocols / red lines, setupLists, the "Available in Settings" stub → owner: Task 19.
  - refusal / stub messages as inline text instead of action sheets (apple-design note) → owner: Task 21.
  - Challenge board sections Check-ins, MED this week, Know your enemy (R10) -> owner: Task 21, decide scope then.
  - MED cell state on the 30-cell strip -> owner: Task 21.
- Needs owner ruling: (1) R3 Day 0 hero copy dropped and button "Begin Day 1"; (2) R10 Check-ins section, MED this week and Know your enemy not built on Challenge; (3) R8 closed strip cells show a glyph instead of the day number, no MED tile state; (4) today ring 2px vs board 1.5px; (5) "Import a pack in Settings" hidden when a pack exists but lacks the day; (6) refusal / stub messages as action sheets with OK.
  - Owner rulings 2026-10-13:
    - (1) accepted: Day 0 hero copy dropped, button "Begin Day 1".
    - (2) accepted for now, not built on Challenge: Check-ins section, MED this week, Know your enemy.
    - (3) accepted: glyph instead of day number on closed strip cells; no MED tile state.
    - (4) accepted: today ring 2 px.
    - (5) accepted: "Import a pack in Settings" hidden when a pack lacks that day.
    - (6) action sheets with OK kept for the Day 0 stubs (deleted in Task 19) and the Redo refusal (plan text); revisit in Task 21.
- Fix round 2 (owner, 2026-10-14): today's strip cell gets a bronze ring while a Redo is declared; result and legend unchanged until the night check-in (Task 16).
- Fix round 3 (owner iPhone finding, 2026-10-14): gold today ring and bronze declared-Redo ring were hard to tell apart. Owner ruling: add a subtle non-colour cue. Done: `.dy.t.dr` gets `border-style:dashed` (screens.css:205), gold stays solid, 2 px unchanged. Commit 14b8acc, pushed to origin/v2 (2521b96..14b8acc). Owner confirmed on the iPhone (Safari): dashes look even.
- Process change: the step-4 forbidden-date grep is now the string-argument form over the WHOLE src: `` grep -rnE "toISOString|getUTC|Date\.parse|new Date\(\s*['\"\`]" src `` (expect exit 1). The old pattern also matched `new Date(ms)`, which CLAUDE.md allows (todayLogic.js lines 9 and 30). innerHTML grep stays over src/ui and src/views (dom.js:2 is a comment).
- Next: Task 14.

## Task 14: Mission detail and War Log
- Commits: `36f4584` docs: record Task 13 fix round 3 and close Task 13; `643a6a1` test(ui): mission and war log (failing, WIP) — tests/warlogLogic.test.js (163, 16 tests), tests/mission-warlog-view.test.js (227, 15 tests, fake DOM inside the file), never edited afterwards; `500bd74` feat(ui): mission and war log; this entry: "docs: record Task 14". Base `14b8acc`. Not pushed.
- Files (lines): new `src/views/warlogLogic.js` (56, DOM-free: dayParam, missionView, warLogGroups, entryView, saveEntry), `src/views/mission.js` (20, renderMission), `src/views/warlog.js` (35, renderWarLog, renderWarEntry); modified `src/app.js` (106: routes, `app.redirect`, R8 render guard), `screens.css` (258; Task 14 block, 9 rules, existing tokens only), `sw.js` (79; ASSETS += 3 views, VERSION unchanged `1.0.23`). Untouched: src/core, src/router.js, src/ui, every existing test.
- Commands:
  - Preconditions: status empty; HEAD = origin/v2 = `14b8accce00d7e9acd4ef22ec949df79127f1ba5`; origin/main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 423/423; no serve process, nothing on 5173.
  - RED at `643a6a1`: `npm test` exit 1, tests 425, pass 423, fail 2 (both file-level ERR_MODULE_NOT_FOUND: src/views/mission.js, src/views/warlogLogic.js).
  - GREEN at `500bd74`: `npm test` exit 0, tests 454, pass 454, fail 0.
  - `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(\s*['\"\`]" src` exit 1; `grep -rn innerHTML src/ui src/views` exit 1.
  - Browser (playwright-cli, 375×812 DPR 3, clock 2026-10-14 10:00, seeded by scratch/t14/seed + seed.mjs from core functions, invented data; scratch/t14/proof.raw): 7 screenshots, no overflow, no text < 11 px, every a/button/textarea ≥ 44, tab bar hidden; textarea computed font-size 16px, min-height 220px, line-height 22px; #mission/31, /09, /0 → #challenge; #warlog/foo, /day-09 → #warlog; Back after typing (no explicit blur) saved and left; Done saved and left; blur saved; tick (window focus + 31 s clock) kept unsaved text, focus and caret; Back after a redirect → #challenge (no bounce); 0 console/page errors.
- Controller rulings (cost if wrong):
  - R1 day param: Number + isInteger + 1..CHALLENGE_LENGTH AND canonical `String(n) === p`, so '09' and '1e1' are invalid (mission → #challenge, editor → #warlog). Why: core setWarEntry refuses `day-09`, so a non-canonical editor key would drop typed text silently. Cost: '#mission/09' redirects instead of showing Day 9.
  - R2 no challenge / before start: dayNo is null → every day locked; lock checked before missionFor (locked DOM has no title/body). Finished challenge (dayNo > length): all readable.
  - R3 War Log Oath group always lists the four oath keys ("Not written yet" when absent; warEntries leaves missing oath keys out); Autopsies / Days only when non-empty. Row date = dayLabel of updatedAt's local date ("Monday 12 October"); preview exactly warEntries'.
  - R4 valid editor keys: OATH_KEYS (even unwritten; Day 0 and the list link there), any key warEntries lists, or `day-<n>` per R1. Owner text said "warEntries lists it or legal day-<n>" — that would redirect unwritten oath keys.
  - R5 `app.redirect(path)` = `location.replace`, so Back never lands on the invalid URL.
  - R6 Done saves and leaves (history.back()); Back also saves first.
  - R7 mousedown preventDefault on Done and Back keeps focus in the textarea, so the blur → re-render cannot swallow the click; their click handlers save.
  - R8 app.js render() skips re-rendering while a TEXTAREA in #view has focus on the same route (the 30 s / focus tick would rebuild the editor from stored state, wipe unsaved typing and drop the iOS keyboard). Midnight rollover / settleMissed show on the first render after blur.
  - Mission CTA uses goldButton → app.nav('#warlog/day-<n>'); "Import a pack in Settings." in text-2 under the null plate's first line.
- Design choices (no mockup; patterns from Recovery.png / static/Recovery.html): pushed header = pushedHeader (44 px round back, eyebrow title: "Day <n>", "War Log", entry title); Mission = eyebrow "Mission" + Cinzel screenTitle + body paragraphs (16 px body, pre-line) + gold button; locked / null = one .plate; War Log = sectionHeading (sword + Cormorant italic) per group + `.plate.list` of task-style rows (.rt title, .rtm date, .rn preview, ≥ 44 px, wrap anywhere); editor = Recovery's `.ta` field (16 px, field token, line-strong border) at min-height 220 + gold "Done" left-aligned under it; autopsy = `.plate.wl-ro` with pre-wrap labelled lines, no field, no Done. No new colours, no new icons.
- Review (one reviewer, opus; scratch/t14/review.md): spec ✅ (deviations above need a ruling), quality Approved, 0 Critical, 0 Important, 8 Minor. No fix round.
- apple-design audit (notes only, scratch/t14/apple-design-audit.md, no code changed): Medium — War Log rows lack a disclosure chevron; Medium — empty editor has no prompt; Low — locked / null plates are dead ends; Low — first section heading tight under the War Log header; Low — autopsy title shows the ISO date; Low — Done placement.
- Deferred (owner):
  - M1 `#mission/1e1`, `/abc`, `/-1`, `''` land on Today (router.js regex; tests/router.test.js pins `#mission/abc` → Today), not #challenge → owner: Task 21 (decide whether the router changes).
  - M2 R8 guard applies to any textarea in #view, not only #wl-text → owner: Task 17 (Recovery form) decides whether to narrow it.
    - Owner ruling 2026-10-14 (Task 17 prompt): keep as is, NO narrowing (every form keeps a module draft and re-renders via the blur+hashchange helper). M2 closed.
  - M3 moved to Fixed (fix round 1, `fdd95ee`).
  - M4 R8 guard has no automated test (browser proof flow 4 only) → owner: Task 21.
  - M5 moved to Fixed (fix round 1, `fdd95ee`; needed by the round-1 whitespace test).
  - M6 autopsy fixtures use generic sentences ("I will block the app after work") because checkVague needs a keyword and ≥ 15 chars; no personal data; tests frozen → no action.
  - M8 polish: War Log header spacing, two h1 on Mission (header eyebrow + title), row chevrons, editor prompt, autopsy ISO title → owner: Task 21.
- Needs owner ruling: (1) R1 canonical day param ('09' redirects); (2) R3/R4 unwritten oath keys valid; (3) R6 Done also leaves; (4) R8 app-wide textarea render guard; (5) R5 app.redirect; (6) M1 non-digit mission params go to Today.
- iPhone checks (installed app; owner does them at Task 21, no server runs now): type in an entry, tap Back → text kept; type, tap Done → kept; type, wait > 30 s → keyboard stays and text stays; open #mission for today, a future day (locked) and a day with no mission.
- Owner rulings 2026-10-14: R1, R2, R3, R4, R5, R6 accepted as written above. M3 promoted to a fix now: the editor also saves on `input`.
- Fix round 1 (owner, 2026-10-14):
  - `25add48` test(ui): war log saves on input (failing, WIP) — new tests/warlog-input-save.test.js (2 tests, own minimal fake DOM; frozen tests untouched). RED: `npm test` exit 1, tests 456, pass 455, fail 1 (input saves without blur/Back/Done). The whitespace test passed only because no input handler existed yet.
  - `fdd95ee` fix(ui): war log saves on input — src/views/warlog.js: textarea `onInput: () => save()` (same save, no debounce; R8 guard unchanged). After that the whitespace test failed (tests 456, pass 455, fail 1): saveEntry returned a new, equal state for `   ` on an absent key (setWarEntry rebuilds warLog), so the owner premise did not hold. Controller ruling: one condition in src/views/warlogLogic.js saveEntry (blank on blank → same state; this is M5), outside the "warlog.js only" scope — Cost if wrong: one line to revert, M5 back to Deferred. GREEN: tests 456, pass 456, fail 0.
  - Browser (playwright-cli, 375×812 DPR 3, scratch/t14/proof-fix1.js): typing "Text A input" keystroke by keystroke → 12/12 with activeElement #wl-text, caret = length, value and stored text equal after each key; mid-text edit keeps caret (11) and focus; reload with no blur shows "Text A inpXut"; 0 console/page errors.
  - Fixed: M3 (swiped-away app keeps text: saved on every input), M5.
- Pushed to origin/v2 (14b8acc..b43d62a).
- Owner ruling 2026-10-14: the saveEntry change in src/views/warlogLogic.js (blank text on a blank entry returns the state unchanged) is ACCEPTED as the right place for the fix; M5 closed by it.
- Next: Task 15.

## Task 15: Morning and Afternoon check-ins
- Commits: `6b27f54` docs: record Task 14 push and Task 15 start; `6a3ce94` test(ui): morning and afternoon check-ins (failing, WIP) — tests/checkin-morning-view.test.js (233, 9 tests), tests/checkin-afternoon-view.test.js (158, 5 tests), fake DOM inside each file; `6c01736` feat(ui): morning and afternoon check-ins; `ad9d690` test(ui): check-in review fixes (failing, WIP) — tests/checkin-fixes.test.js (166, 7 tests); `35eecac` fix(ui): check-in review fixes; this entry: "docs: record Task 15". Tests never edited after their commit. Base `b43d62a`. Not pushed.
- Files (lines): new `src/views/checkinMorning.js` (92, renderMorning), `src/views/checkinAfternoon.js` (57, renderAfternoon); modified `src/app.js` (110; two imports, two route lines, the screen() comment), `sw.js` (81; ASSETS += both views, VERSION unchanged `1.0.23`), `screens.css` (278; "Check-ins (Task 15)" block, existing tokens + the Recovery.css badge colours, no media queries). Untouched: src/core, src/ui, src/router.js, every other view and existing test.
- Commands:
  - Preconditions: status empty; HEAD = origin/v2 = `b43d62a3379f3bc05e2dacbcbe6d634f387900d2`; origin/main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 456/456; no node serve process, nothing on 5173.
  - RED at `6a3ce94`: `npm test` exit 1, tests 458, pass 456, fail 2 (both file-level ERR_MODULE_NOT_FOUND: checkinAfternoon.js, checkinMorning.js).
  - GREEN at `6c01736`: `npm test` exit 0, tests 470, pass 470, fail 0.
  - Fix round RED at `ad9d690`: `npm test` exit 1, tests 477, pass 470, fail 7 (all assertion failures). GREEN at `35eecac`: exit 0, 477/477.
  - Forbidden-date string-argument grep over src exit 1; `grep -rn innerHTML src/ui src/views` exit 1 (at 6c01736 and 35eecac).
  - Browser (playwright-cli, 375×812 DPR 3, clock 2026-10-14, seeded by scratch/t15/seed.html + seed.mjs from core functions, invented data; scratch/t15/proof.raw and proof-fix1.raw): 8 screenshots (m-empty, m-target-med, m-cap, m-close-yesterday, m-recovery, a-yes, a-struggling, a-tasks), each: no horizontal overflow, no text < 11 px, every a/button/textarea/switch ≥ 44, tab bar hidden; textareas 16px / line-height 22px / min-height 76px; 0 console/page errors. Flows: typed target survives a MED toggle and a 31 s tick (also with the textarea focused: caret and focus kept), storage unchanged; Start the day → #today, revisit redirects (replace); empty target → "Write today's #1 target.", storage unchanged; 01:30 → "Close yesterday first." + link #checkin/night/<yesterday>, storage byte-identical; Log it disabled before a choice; Yes → #today, revisit shows Yes, No replaces it; Struggling shows friction, Yes hides it and stores friction ''; redirects (no morning → #today, no challenge → #today); Today's morning and afternoon card buttons land on #checkin/morning and #checkin/afternoon; a shield tap stores done and the row leaves the list. Fix round re-run: 17/17, 0 errors.
  - compare.py (`python -E -P`, tol 12) vs reference/CheckIn.png: refused, "size mismatch (780, 3720) vs (780, 1688)", exit 1 (the board is a long night check-in). Board cropped to its top 1688 px: 23.09 % (--ignore-bg), 23.33 % (without); content differs by design (scratch/t15/compare.txt).
  - Serve: started and stopped by the proof runs; afterwards no node serve process, nothing on 5173.
- Owner decisions (this task's prompt), all implemented: draft in one module-level object per view keyed by date, re-render via a `hashchange` event (Today's R6 pattern), cleared on success; submitMorning gets Date.now(); "Close yesterday first." as plain text under the gold button with a link to #checkin/night/<yesterday> (lands on the router placeholder until Task 16); MED rows only for protocols with MED text, header "<used> of <medPerWeek> MED used this week" incl. switches on in the form, reasons mapped from medCheck codes in the view (core medError is not exported; same strings), the cap disables the other off switches, an on switch can always be turned off, red lines never shown; pending Recovery = crimson banner at the top → #recovery/<date> (router placeholder until Task 17); afternoon Yes / No / Struggling, friction only for Struggling, open tasks via taskRow + openTaskMenu (Today's status setter), caption "Provisional — finalizes tonight", Log it disabled until a choice; redirects as listed.
- Closed: Task 3 Deferred "Task 12/15" second half (the morning screen refuses with "Close yesterday first." while yesterday is open, before 04:00).
- Controller rulings (cost if wrong):
  - R1 "Close yesterday first." and its link appear after a tap on Start the day (the refused submitMorning), not before; Today already replaces the morning card with "Close yesterday" in that window. Cost: one condition.
  - R2 The error stays until the next tap (typing does not clear it). Cost: one line.
  - R3 Header = pushedHeader "Morning · Day <n>" / "Afternoon · Day <n>" with the round back button; questions = Recovery board numbered `.fq` (plan: "numbered gold badges"). Cost: header layout.
  - R4 Recovery banner reuses Today's link-card classes, no chevron; morning only (plan Step 1). Cost: one element.
  - R5 "Declare MED" is hidden when no protocol has MED text. Cost: one condition.
  - R6 Afternoon draft starts from the stored afternoon (re-visit shows the filed answer). Open tasks = openTasks only: a ticked task leaves the list (undo via Today / Tasks). Section hidden when none. Invented copy: "Open tasks", "What is the friction?". Cost: copy + one list.
  - R7 Check-in gold button 54 px, full width (DESIGN-SPEC §2 / CheckIn.css), scoped `.ci-go .btn-gold`. Cost: one rule.
  - R8 The 4-line `question()` helper is duplicated in both views (src/ui frozen this task). Cost: Task 16 may share it.
  - R9 Fix round: both re-render helpers blur a focused textarea first (iOS keeps the textarea focused on a button tap, and app.js R8 would skip the redraw); Start the day / Log it re-render instead of filing when app.today() has moved past midnight; ids ci-rec, ci-close; afternoon draft deleted after app.set. Cost: the keyboard closes on a switch / choice tap.
- New inline icons: none.
- Deviations from reference/CheckIn.png (a night board; pattern deviations, scratch/t15/compare.txt). Needs owner ruling: (1) header has no large serif title, only the gold eyebrow line; (2) back chevron instead of the board's close X; (3) numbered `.fq` questions instead of sword + serif section headings; (4) textareas sit bare, not inside plates; (5) no helper line under the questions ("optional" not marked on the risk question); (6) MED counter line at the gutter, not under the label text; (7) MED switch rows have no board counterpart; (8) gold button not visible on the board image (54 px from the spec); (9) looser vertical spacing; (10) labels bold sans ~18 px instead of serif headings; (11) empty background below the button on short forms.
- Review (one reviewer, opus; scratch/t15/review.md): spec ✅, quality Approved, 0 Critical, 1 Important (finding 1: on iOS a tap leaves the textarea focused, so R8 skips the redraw), 5 Minor. Fix round 1 (findings 1, 2, 4, 5) → scoped re-review: all 4 ADDRESSED, no new Critical/Important.
- apple-design audit (notes only, scratch/t15/apple-design-audit.md, no code changed): Medium — empty textareas have no hint and the risk question is not marked optional; Medium — "0 of 2 MED used this week" while every switch is disabled after a Reset; Medium — the error sits under the gold button (may be hidden by the keyboard); Low — segmented letter-spacing (shared control); Low — no text saying why Log it is disabled.
- Deferred (owner):
  - m3 an abandoned afternoon draft (change the answer, Back) shows instead of the stored answer on the next visit → owner: checkpoint ruling (accept as draft-survives-Back, or reseed on entry).
  - m6 the role="alert" error is rebuilt on each re-render; VoiceOver may repeat it → owner: Task 21 (iPhone VoiceOver check).
  - Re-review minor: an afternoon task shield tap while the friction field is focused (iOS) saves but redraws only after blur → owner: Task 16 checkpoint (iPhone).
  - Re-review minor: after midnight the old day's typed morning text drops from view (kept in memory, unreachable) → no action.
  - `question()` helper shared between check-in views → owner: Task 16.
  - Hint text / "optional" marking, MED counter after a Reset (apple-design) → owner: checkpoint ruling.
- iPhone checks for later (installed app, active challenge needed, Task 19): type a target, tap a MED switch with the keyboard up → switch flips, keyboard closes, text kept; leave the app > 30 s while typing → text kept; Start the day with an empty target → error shown; afternoon: type friction, tap Yes → friction field gone; type friction, tap a task shield → row updates (after blur); Log it, reopen → answer shown.
- Pushed to origin/v2 (b43d62a..1bf4af7).
- Owner rulings 2026-10-14: R1..R6, R8, R9 accepted as reported; deviations 1..11 from CheckIn.png accepted (the board is the long night check-in, so the pixel diff was meaningless); m3 (stale afternoon draft after Back) deferred to Task 21; R8 helper duplication handed to Task 16.
- Next: Task 16.

## Task 16: Night check-in
- Checkpoint moved: the plan's "Owner on the iPhone: one full day (morning -> night)" happens after Task 19 (Begin Day 1 is disabled until Task 19 and the scratch seed pages need a local server). The owner's iPhone checks for Tasks 12-16 happen together once a local or deployed build is reachable.
- Commits: `5709066` docs: record Task 15 push and Task 16 start; `6eef9bc` test(ui): night check-in (failing, WIP) — tests/checkin-night-logic.test.js (186), tests/checkin-night-view.test.js (270), tests/checkin-night-flow.test.js (274), fake DOM inside each file; `bd62889` feat(ui): night check-in; `de40eff` test(ui): night check-in review fixes (failing, WIP) — tests/checkin-night-fixes.test.js (108, 2 tests); `ad6f832` fix(ui): night check-in review fixes; this entry: "docs: record Task 16". Tests never edited after their commit. Base `1bf4af7`. Not pushed.
- Files (lines): new `src/views/checkinNightLogic.js` (72, DOM-free: ARCHETYPES, NIGHT_ERRORS, newDraft, nightRoute, medIds, liveSuggestion, overrideOptions, canClose, nightForm), `src/views/checkinNight.js` (138, renderNight), `src/night.css` (30); modified `src/ui/chrome.js` (29; `question()` + `rerender` moved here), `src/views/checkinMorning.js` (81), `src/views/checkinAfternoon.js` (47) (both import the shared helpers; Task 15 tests green unedited), `src/app.js` (112; import + route line), `index.html` (36; one link), `sw.js` (84; ASSETS += night.css + both views, VERSION unchanged `1.0.23`). Untouched: src/core, src/router.js, src/sheet.js, every existing test.
- Commands:
  - Preconditions: status empty; HEAD = origin/v2 = `1bf4af765f2d8ef7ce7292fa427b04db8679b51f`; origin/main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 477/477; no node serve process, nothing on 5173.
  - RED at `6eef9bc`: `npm test` exit 1, tests 480, pass 477, fail 3 (all file-level ERR_MODULE_NOT_FOUND: checkinNightLogic.js, checkinNight.js x2).
  - GREEN at `bd62889`: exit 0, 509/509 (477 + 32 new).
  - Fix round RED at `de40eff`: exit 1, tests 511, pass 509, fail 2 (assertions: textarea still focused when the sheet opens / after confirm). GREEN at `ad6f832`: exit 0, 511/511.
  - Forbidden-date string-argument grep over src exit 1; `grep -rn innerHTML src/ui src/views` exit 1 (at bd62889 and ad6f832).
  - Browser (playwright-cli, 375x812 DPR 3, clock 2026-10-14 21:00, seeded by scratch/t16/seed.html + seed.mjs from core functions, invented data; scratch/t16/proof.raw, proof-r6.raw; run on bd62889, the fix round changed only the gold button's tap handler): 7 screenshots (n-pass, n-missed, n-crossed, n-override, n-override-crossed, n-sheet, n-yesterday), each: no horizontal overflow, no text < 11 px, no tap target < 44 (sheet dialog included), tab bar hidden, textareas 16px / lh 22px / min-h 76px, 0 console/page errors. Live suggestion: clean Passed / "1 protocol missed" Redo / "Red line crossed" Reset (plate warn + "This is a Reset."); override options Passed/Redo/Reset, crossed → Reset only + the NIGHT_TEXT sentence. Flows: typed win survives a chip tap and a 31 s tick (also focused: value, focus, caret kept), storage unchanged while editing; close → #today, taskLog written, goBack lands on #today (form gone); reset → #recovery/2026-10-14, dueAt 1792090889822 === closedAt 1792004489822 + 86400000 true; Keep editing saves nothing; Bottom G chips (Assassin → Tactic A + Something else; Seducer without tactics → #ci-other directly); Close enables on the first typed Reason character with focus kept; closed and future dates → #today; 01:30 → "Close yesterday first." + link #checkin/night/2026-10-14. Refusal screenshot skipped: no honest UI path reaches a closeNight refusal (gating + guards); the unit test covers it.
  - compare.py vs reference/CheckIn.png: refused, "size mismatch (780, 3720) vs (780, 4992)", exit 1 (both modes). Per-section crops (--ignore-bg / full): header 2.65/2.65 %, tasks 16.05/16.05, protocols 25.02/25.58, red lines 27.79/28.17, Top G 11.99/12.48, Bottom G 35.75/36.84 (scratch/t16/compare.txt; content differs by design).
  - Serve: a stray `serve -l 5173` (PID 21040) was left running by the feature implementer despite its report; the controller stopped it before the proofs. The proof run started and stopped its own; afterwards no node serve process, nothing on 5173.
- Owner decisions (this task's prompt), all implemented: one module-level draft keyed by date, re-render via the blur + hashchange helper, cleared on success; route date must be a night target, else redirect; yesterday-open before 04:00 on today's route shows NIGHT_TEXT['yesterday-open'] + link to nightTargets[0] (closes Task 4 Deferred "route the night form to yesterday"); exact closeNight form, win/slipNote/bottomG always strings (closes Task 4/5 Deferred); MED protocol read-only "MED (declared this morning)" and not sent; red line crossed → .warn + "This is a Reset."; Bottom G archetype → tactic chips → Something else; live suggestion over answered items; override reason required, Reset only when crossed + NIGHT_TEXT['red-line-override']; gated Close + action sheet "This is final." / Close the day / Keep editing; all 9 error codes mapped; success → #today or #recovery/<date> (router placeholder until Task 17); midnight guard; double tap harmless (stale-draft check).
- Controller rulings (cost if wrong):
  - R1 ARCHETYPES defined once in checkinNightLogic.js with a comment pointing to src/core/pack.js (not exported; core frozen). Needs owner ruling: export it from pack.js in a later task. Cost: one import.
  - R2 CSS at `src/night.css`, not root (the frozen tests/sw.test.js fixes the shipped root files; src/fonts/fonts.css is the precedent). Cost: git mv + 2 lines + an approved sw test change.
  - R3 Yesterday-open route shows header + sentence + link only, no form. Cost: one branch.
  - R4 Invented copy: the 7 own error sentences (This day is already closed. / This day is not part of the challenge. / Settle every task first. / Answer every protocol. / Answer every red line. / Write a reason for the override. / This day can no longer be closed.), "Cancel override", "Reason", "Optional.", "Suggested result", "Close yesterday"; section titles and helper lines from the board. Cost: copy.
  - R5 Stalled caption under every open task row (not only when chosen). Cost: one condition.
  - R6 Chosen "I crossed it" = solid --crimson-dk with white (5.7:1; board gradient 3.7:1); Stalled = board slate #8b98ad with --bg text (6.8:1). Picked by :nth-child under .nt-tasks / .nt-red (controls.js untouched). Cost: CSS.
  - R7 Re-tap clears a chosen archetype / tactic / Something else; changing archetype clears tactic and text. Cost: one handler.
  - R8 Live gate: typing the Reason updates the Close button's disabled in place (no re-render, focus kept). Cost: one handler.
  - R9 Fix round: blur a focused textarea before opening the action sheet (else the sheet refocuses it and app.js R8 skips the post-save redirect render). Cost: the keyboard closes when Close the day is tapped.
- New inline icons: none.
- Deviations from reference/CheckIn.png (scratch/t16/compare.txt). Needs owner ruling: (1) header: no large serif "NIGHT" title, only the eyebrow "NIGHT · DAY n"; (2) back chevron instead of the board's close X; (3) task caption = the owner's fixed sentence, not the board's per-row text; (4) no "N tasks already completed today" footer row; (5) task end time not shown (start only, as on the board); (6) MED pill copy "MED (declared this morning)" vs board "MED, declared this morning · counts as a pass"; (7) later sections shifted (tasks plate ~50 px shorter without the footer); (8) segmented labels ~1 px smaller (14 px); (9) Top G field close, lighter border on the board; (10) archetype names from the plan ids (board: mockup Nihilist, Arsonist); tactic chip row unlabelled, same style as the archetype row; tactics as chips, not the board's .tc rows; (11) Slipped / Suggested result / Close the day have no board image (gold button under the plate, not inside); (12) empty floor tail below the button.
- Review (one reviewer, opus; scratch/t16/review.md): spec ✅, quality Changes needed, 1 Important (iOS: focused textarea refocused by the sheet → R8 skips the post-save render → Back appears to do nothing once), 8 Minor. Fix round 1 → scoped re-review: ADDRESSED, no new Critical/Important.
- apple-design audit (notes only, scratch/t16/apple-design-audit.md, no code changed): nothing Critical. Medium — disabled Close the day does not say what is missing; Medium — the "This is final." sheet stays over Today after the 04:00 auto-close and its Close the day silently does nothing; Medium — Stalled caption repeated under every row; Low — no hints inside textareas, "Optional." terse; Low — tactic row unlabelled; Low — Override button same gold as the result word.
- Deferred (owner):
  - m2 an error sentence stays until success (also after the cause is fixed); VoiceOver re-reads it on each tap → owner: Task 21 (with Task 15 m6).
  - m3 textareas named by their helper line ("One sentence", "Optional.") for VoiceOver; aria-labelledby with the heading → owner: Task 21.
  - m4 VoiceOver loses its place on each choice tap (whole view rebuilt; Task 15 pattern) → owner: Task 21 / docs/backlog.md.
  - m5 no test for the in-place Close gating; the stale-draft and midnight guards are not observable from tests (core also refuses) → owner: Task 21.
  - m6 Stalled / crossed colours chosen by :nth-child → owner: Task 21 (an option class in controls.js if options are ever reordered).
  - m7 global `.q` class in night.css → owner: Task 21.
  - m8 ARCHETYPES duplicated from core (R1) → owner: checkpoint ruling.
  - m9 src/app.js:59 comment still says "Tasks 16–19" → owner: Task 17 (touches that line).
  - Stale action sheet after the 04:00 auto-close (apple-design Medium; no data harm) → owner: checkpoint ruling.
  - A second open tab with stale state could re-close a day (app.js has no storage listener; the Home Screen app is single-window) → owner: Task 21.
- iPhone checks for later (installed app, active challenge, after Task 19): keyboard up in Top G win, tap Close the day → keyboard closes, sheet opens; confirm → Today, one Back leaves Today; type win, tap a chip → text kept; leave the app > 30 s while typing → text kept; cross a red line → crimson plate + "This is a Reset."; open Override, type a Reason → Close enables while typing; reset close → Recovery placeholder.
- Pushed to origin/v2 (1bf4af7..0080e35).
- Owner rulings 2026-10-14:
  - R1 (archetype ids duplicated in checkinNightLogic.js) accepted for now; drift guard (a test that validatePack accepts a tactic for each of the five ids) → Task 21; core export only on owner authorisation.
  - R2 (src/night.css) accepted; merging into screens.css is a Task 21 option.
  - R3, R4, R5, R7, R8, R9 accepted.
  - R6 (solid crimson "I crossed it", 5.7:1, instead of the board gradient at 3.7:1) accepted.
  - Board deviations 1..12 accepted.
  - Stale "This is final." sheet after 04:00 → Task 21 (tapping either sheet button closes it first, no data harm).
  - iPhone checkpoint stays moved to after Task 19.
- Next: Task 17.

## Task 17: Recovery screen
- Commits: `a791dc2` docs: record Task 16 push and Task 17 start; `eed3922` test(ui): recovery screen (failing, WIP) — tests/recovery-logic.test.js (107), tests/recovery-view.test.js (270), fake DOM inside the view test; `4d9166d` feat(ui): recovery protocol screen; this entry: "docs: record Task 17". Base `0080e35`. Not pushed.
- Files (lines): new `src/views/recoveryLogic.js` (58, DOM-free), `src/views/recovery.js` (103, renderRecovery), `src/recovery.css` (24); modified `src/app.js` (114; import, route line, stale comment fixed = Task 16 m9 closed), `src/icons.js` (56; two board SVGs copied verbatim from static/Recovery.html: crimson Reset shield, warning triangle), `index.html` (37; one link), `sw.js` (87; ASSETS += 3 files, VERSION unchanged `1.0.23`). Untouched: src/core, src/router.js, src/ui, every existing test.
- Commands:
  - Preconditions: status empty; HEAD = origin/v2 = `0080e354a21075d2c8a77154aabae14aebbaaea6`; origin/main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 511/511; no node serve process, nothing on 5173.
  - RED at `eed3922`: `npm test` exit 1, tests 513, pass 511, fail 2 (file-level ERR_MODULE_NOT_FOUND: recoveryLogic.js, recovery.js).
  - GREEN at `4d9166d`: exit 0, 533/533.
  - Forbidden-date string-argument grep over src exit 1; `grep -rn innerHTML src/ui src/views` exit 1.
  - Browser (playwright-cli, 375x812 DPR 3, fixed clock, seeded by scratch/t17/seed.html + seed.mjs from core functions, invented data; scratch/t17/proof.raw): 5 screenshots (r-fresh, r-nudge, r-overdue, r-lastday, r-filed): no horizontal overflow, smallest text 11 px, no tap target < 44, textareas 16 px, time box inside its container, 0 console/page errors. 49 checks, 45 PASS, 4 FAIL = one item: `#rc-time` computed 18 px (shared `.in`, board 18 px) vs the brief's 16 px, see R6. Flows PASS: typed text and chosen chips survive a chip tap and focus + 31 s tick (focused textarea keeps value, focus, caret); button disabled until all five non-blank; file → `#warlog/autopsy-2026-10-14` with the five labelled lines; Back → read-only; reload → read-only; Today's Recovery card gone; unknown date and date without entry → #today (replace); time default = local HH:MM of closedAt; Overdue crimson text; last day → only `Streak back to 0`.
  - compare.py vs reference/Recovery.png: refused, "size mismatch (780, 2600) vs (780, 2748)", exit 1. Per-section crops (--ignore-bg / full, fresh form): header 2.33/2.33 %, reset plate + effect chips 9.21/9.44, countdown 11.80/11.80, section heading 7.83/7.83, Q1 16.98/17.33, Q2 9.36/9.76, Q3 14.46/14.75, Q4 10.93/11.25, Q5 13.62/14.48, button/footer 71.24/72.84 (board's dark bottom band and offset). Copy, order, icons, colours match (scratch/t17/compare-run.txt, crops/).
  - Serve: started and stopped by the proof run (a mistaken second launch on :50282 was killed before any proof); afterwards no serve process, nothing on 5173.
- Owner decisions (this task's prompt) 1-8: all implemented.
- Rulings (cost if wrong):
  - R1 Reset on the last day (n+1 > CHALLENGE_LENGTH) shows only `Streak back to 0`. Cost: one line.
  - R2 CSS in new `src/recovery.css` (screens.css at 278 lines). Cost: move 24 lines, drop one link.
  - R3 Countdown bar = elapsed share of closedAt → dueAt (window from dueAt - closedAt; core exports no 24 h constant; missing closedAt → full bar). Overdue → full crimson bar plus crimson `Overdue` text (text carries the signal). Cost: one line.
  - R4 Gate, time field and nudges update in place on input/blur (no re-render); chip taps and errors use the shared `rerender`. Nudge after the field's first blur, then live; survives re-renders.
  - R5 Read-only view = header, DAY n: RESET plate with quote and effect chips, section `Your autopsy`, the five stored answers; no countdown, no form, no button.
  - R6 Time field stays 18 px (shared `.in`, board value; ≥ 16 so iOS does not zoom). Cost: one CSS value.
  - R7 The two NEW test files changed after the WIP commit: the fixture decision lacked a core keyword (core rightly refused it), now "Picked up the phone and did not put it down"; the fake DOM gained a `disabled` getter/setter like a real DOM. No assertion removed or loosened (reviewer confirmed). Needs owner ruling. Cost: re-cut the WIP commit.
  - Board copy used verbatim (header `Recovery Protocol`, quote, `File within 24 hours`, `File your autopsy`, question labels, Q4 hint, footer `Your autopsy and fix go into the War Log under Day <n>.`). Invented copy: `Your autopsy`; errors `Answer all five questions.`, `There is no Recovery for this day.`, `This autopsy is already filed.`; vague-change / vague-decision = the core nudge.
- New inline icons: two, copied verbatim from static/Recovery.html (crimson Reset shield, warning triangle).
- Deviations from reference/Recovery.png. Needs owner ruling: (1) time field full width (board 140 px); (2) time field 18 px (= board; brief said 16); (3) textareas 76 px tall (board ~84); (4) nudge also under decision (owner decision 5); (5) button inline in the flow, not in the board's dark bottom band; ~74 px floor below the footer; (6) fresh form shows the disabled button (board shows enabled only); (7) effect chips and plate ~4 px shorter; (8) quote and countdown row 1-2 px lower; (9) at 375 `Triggered` wraps to a second row (fits at 390); (10) Overdue bar turns crimson; (11) last-day chips have no board; (12) read-only view has no board; (13) the board's own sample decision would be refused by core as `vague-decision` (no keyword), so real "exact sequence" answers get the nudge unless they contain block/delete/move/put/set/....
- Review (one reviewer, opus; .superpowers task-17-review.md): spec ✅, quality Approved, 0 Critical, 0 Important, 7 Minor. No fix round.
- apple-design audit (notes only, scratch/t17/apple-design-audit.md, no code changed): Medium — chip groups have no accessible name; Medium — Q4 hint not in aria-describedby; Medium — File stays enabled while a nudge shows (a tap only yields the error); Medium — disabled button does not say what is missing; Medium — the decision nudge's wording fits Q5 only; Low — time field opens the full keyboard (inputmode="numeric"); Low — time field width; Low — `Triggered` wraps at 375; Low — effect pills look tappable; Low — empty space under the footer; Low — read-only view shows no "filed" status.
- Deferred (owner):
  - m1 the time field (input, not textarea) loses focus and the iOS keyboard on the 30 s tick; text survives (app.js R8 guard and chrome.js rerender handle TEXTAREA only; both shared files must change together) → owner: Task 21 / iPhone check.
  - m2 the double-tap test passes without the view guard (core refuses the second file anyway) → owner: Task 21.
  - m3 `already-filed` not tested through the view (`incomplete` unreachable through the UI) → owner: Task 21.
  - m4 recovery.js overwrites the class names of the shared header / plate after building them → owner: Task 21.
  - m5 the error stays until the next tap and may disagree with the live nudge (Task 15 m6 / Task 16 m2 pattern) → owner: Task 21.
  - m6 core's decision rule (keyword required) vs the question "The exact sequence" → owner: ruling (a core change needs authorisation).
  - m7 `dayNo` null not guarded (`DAY null: RESET`; unreachable today) → owner: Task 21.
  - `#recovery/garbage` keeps its hash and renders Today without a redirect (existing router behaviour, Task 14 M1) → owner: Task 21.
- Pushed to origin/v2 (`0080e35..e8a1ec8`).
- Owner rulings 2026-10-14:
  - R1..R6 accepted as reported (last-day chips, `src/recovery.css`, bar fill with "Overdue" as the signal, in-place typing updates, filed view, time field 18 px).
  - R7 accepted (the two new test files were edited after the WIP commit to fix a keyword-less sample decision and make the fake DOM's `disabled` behave like a browser's; no existing test touched, nothing weakened).
  - The two icons, the wording and the 13 board differences accepted.
  - m1 (time field loses focus on the 30 s tick) → Task 21: extend the app.js render guard from TEXTAREA to a focused INPUT too, with its test.
  - Needs owner ruling (STILL OPEN): the vague-DECISION rule. Core refuses decisions without a keyword like block/delete/move; the board's own sample decision fails. Options: 1 drop the decision check, 2 keep, 3 length/word-count only. Any change edits `src/core/recovery.js` and the frozen `tests/recovery.test.js`, so it needs owner authorisation.
- iPhone checks for later (installed app, after Task 19): reset close → Recovery form; type in both textareas, tap a chip → text kept; leave > 30 s while typing → text kept; time field keyboard; vague change, tap elsewhere → nudge; file → War Log entry; Back → read-only; Today card gone.
- Next: Task 18.

## Task 18: Analytics tab
- Commits: `dacf37d` docs: record Task 17 push and Task 18 start; `52f090f` test(ui): analytics tab (failing, WIP); `8266e41` feat(ui): analytics tab; `8639dea` fix(ui): analytics overview label spells out the streaks (review fix round 1); this entry: "docs: record Task 18". Base `e8a1ec8`. Not pushed.
- Files (lines): new `src/views/analyticsLogic.js` (88, DOM-free view model: range → sections → display strings), `src/views/analyticsParts.js` (72, tiles / stacked bar / share bar / strip / weekday columns / heatmap, SVG via createElementNS), `src/views/analytics.js` (39, renderAnalytics, module range variable), `src/analytics.css` (34); tests `tests/analytics-logic.test.js` (292), `tests/analytics-view.test.js` (204, fake DOM inside), `tests/contrast-analytics.test.js` (65). Modified `src/app.js` (116; import, route line, placeholder comment now Settings / Task 19 only), `src/views/challenge.js` (138; `export` on `cell` and `legendItem`, nothing else), `sw.js` (91; ASSETS += 4, VERSION unchanged `1.0.23`), `index.html` (38; one link). Untouched: src/core, src/router.js, src/ui, every existing test.
- Commands:
  - Preconditions: status empty; HEAD = origin/v2 = `e8a1ec8836d6d0b65597b77e216ff8b4b0602919`; origin/main `556b55a161ba13105977270d8558e493a36d3556`; `npm test` 533/533; no node/serve process, nothing on 5173.
  - RED at `52f090f`: `npm test` exit 1, tests 539, pass 534, fail 5 (2 file-level ERR_MODULE_NOT_FOUND: analyticsLogic.js, analytics.js; 3 contrast ENOENT: src/analytics.css).
  - GREEN at `8266e41` and `8639dea`: exit 0, 554/554 (the two WIP files now run 11 + 6 tests instead of 1 each).
  - Forbidden-date string-argument grep over src exit 1; `grep -rn innerHTML src/ui src/views` exit 1.
  - Contrast (tests/contrast-analytics.test.js, on #1c1b20 / #141317): accent bars/held/all 10.02 / 10.83; bronze-lt MED/part 5.49 / 5.93; crimson missed/red line/missed ring/.dy.x/.dy.r 4.79 / 5.17; text-3 not-due dot 6.36 / 6.87; .lg text 8.21 / 8.88.
  - Numbers proof (scratch/t18: build.mjs from core functions, invented data; numbers.mjs → selectors.json; proof.js via playwright-cli → dom.json; diff.mjs derives the display strings from the raw selector output with its own formatting): on `8639dea` full / done / empty × 7d / 30d / All all MATCH (171, 171, 171 / 147, 169, 169 / 9, 9, 9). A one-character mutation (70% → 69%) is caught (exit 1).
  - 375 px (DPR 3, clock 2026-10-14 12:00, service workers blocked): an-7d / an-30d / an-all height 2191, an-empty 914; no horizontal overflow, min text 11 px (eyebrow), no tap target < 44 (segmented 106×44, tabs 65×58), console/page errors 0.
  - Flow: first render 30d pressed; 7d → 30d → All each change overview, tasks, weekday strings and aria-labels; reload → 30d; `#analytics` tab aria-current=page before and after reload.
  - compare.py vs reference/Analytics.png: whole image refused (780×4120 vs 780×4408). Per-section crops (ignore-bg / full): header 1.79 / 1.79 %, range 28.96 / 29.32, overview 20.51 / 21.00, PM challenge 27.96 / 28.48, habits 36.02 / 36.52, tasks 38.11 / 39.04 (structure differs, see deviations). No board sample name or number appears in our UI (grep exit 1).
  - Serve: started for the proof runs and stopped; afterwards no node process, nothing listening on 5173.
- Owner decisions (this task's prompt) 1-7: all implemented. Range default 30d.
- Rulings (cost if wrong):
  - R1 range in a module variable, `RANGES` 7d / 30d / All, default 30; endDate = `app.today()` at render; change → shared `rerender`. Cost: none.
  - R2 view model in analyticsLogic.js returns display strings and aria labels (exact strings in the code); strip, heatmap and streaks ignore the range. Cost: string edits.
  - R3 empty rules from selector output: Overview null ⇔ passed+redo+reset = 0 (open days are not data, so the overview never shows `—`; `—` is tested on weekday rates); PM Challenge null ⇔ no challenge, and inside it Protocols ⇔ `[]`, Reset ⇔ redLine+protocols = 0, Tactics ⇔ `[]` (each sub-block shows `No data yet.`); By weekday ⇔ all totals 0; Last 28 days ⇔ all due 0; Tasks ⇔ all four 0. Cost: one condition each.
  - R4 strip reuses `stripCells` / `legend` and the Challenge tab's `cell` / `legendItem` builders (exported, unchanged); wrapper role=img with `Day results: passed p, redo r, reset x of 30 days`. Cost: none.
  - R5 charts: SVG viewBox = data (stacked bar width = counts, share bar 0..1, weekday column height = rate, heatmap viewBox 7×4); heatmap marks by shape/size: all = big disc, part = small disc, missed = ring, not due = dot, plus a legend `All done · Partly · Missed · Not due`. Fixed CSS heights: bar 8 px, weekday column 96 px. Cost: CSS values.
  - R6 header eyebrow `Lock In` (board's `Sample data · day 24` is mock-only); sub-headings `Day results`, `Protocols`, `What caused the Reset`, `Your enemy's favorite tactics`, `By weekday`, `Last 28 days` (invented: `Protocols`, `Last 28 days`, `Missed protocols`, the heatmap legend words). Cost: copy.
  - R8 (review fix round 1) overview tiles sit inside one role=img whose label hid the streaks from VoiceOver; label now `Passed p, redo r, reset x, pass rate y, current streak c, longest streak l`. To do this, the NEW test file tests/analytics-logic.test.js changed after the WIP commit: three expected-label lines gained the two streaks, computed by the test's own walker; no assertion removed or loosened (scoped re-review confirmed). Needs owner ruling (as Task 17 R7). Cost: re-cut the WIP commit.
- Observation for the owner (frozen core behaviour, not a bug): with a challenge, "All" for habits and tasks starts at challenge.startDate (Task 7 R3), so All can show fewer task/habit counts than 30d (proof state: tasks 30d done 27 vs All 24). Needs owner ruling whether "All" should mean the whole task history (core change).
- Deviations from reference/Analytics.png. Needs owner ruling: (1) no 90D, labels `7d / 30d / All` lower case (board 7D / 30D / 90D / ALL); (2) no Completion % hero and no completion line chart; (3) no vs-prior / best-so-far pills; (4) Overview = six small tiles 3 + 3 (board two big tiles); (5) strip = the Challenge hero's 30 round cells in 3 rows with glyphs (board one row of squares, "24 of 30 days"); legend has no MED count; (6) no Pass rate / Red lines held tile pair; (7) protocols show held/MED/missed counts and a stacked bar (board "Pass rate by protocol" %, "softest wall" tag); (8) Reset causes = two-segment bar, both segments crimson, split shown by text only, plus per-protocol rows (board one bar, "Three misses in one day"); (9) tactics show archetype sub-line and a grey count (board bold count); (10) no MED days / Recovery filed on time tiles; (11) weekdays Mon..Sun with % underneath, all gold (board single letters, % above, weakest crimson, "best · weakest"); (12) no week-vs-week / time-of-day bars; (13) heatmap four mark shapes + legend (board graded discs, "fewer → more"); (14) Tasks tiles Done / Failed / Stalled / Open wrap 3 + 1 at 375 and 390 (board Done / Missed / Moved); (15) page 4408 px vs board 4120 at 780; (16) tile number 32 px (board 40), tile surface --plate-alt (board #17161a), tile grid `minmax(88px,1fr)`.
- Review (one reviewer, opus): spec ✅; quality Needs fixes → 1 Important (streaks hidden from VoiceOver) fixed in round 1 (`8639dea`), scoped re-review (opus): addressed, no new breakage. The reviewer re-derived by hand from the test state: pass rate 7d 1/3 = 33 %, 30d 3/8 = 38 %, All 5/11 = 45 %, streaks current 0 / longest 2; renamed protocol 7d `Protocol A2: held 3, MED 0, missed 0`; weekdays 7d Mon 2/2, Wed 1/2, Sat/Sun `—`; tasks 7d done 5 failed 1 stalled 0 open 2; heatmap kinds at indices 0, 1, 2, 5, 27 — all equal to the test and the code.
- apple-design audit (notes only, scratch/t18/apple-design-audit.md, no code changed): Medium — Tasks tiles wrap 3 + 1, `Open` alone; Medium — heatmap columns are not fixed weekdays and have no labels; Low — `Not due` dot small; Low — tactic counts grey; Low — whole-challenge strip under the range switch reads as filtered; Low — empty screen gives no next step (copy fixed by R3).
- Deferred (owner):
  - m1 reset bar: both segments crimson, split only in text → owner: ruling (e.g. --crimson-dk for one segment).
  - m2 heatmap grid is positional (oldest first), rows are calendar weeks only when endDate is a Sunday; no weekday labels → owner: ruling / Task 21.
  - m3 px literals beyond tokens (bar 8 px, column 96 px, tile 32 px, `minmax(88px,1fr)`, 16 px legend marks) → owner: Task 21 polish.
  - m4 `Not due` legend dot ~2.6 px at 16 px → owner: Task 21.
  - m5 Tasks tiles wrap 3 + 1 at phone widths → owner: ruling (4 columns or 2 + 2).
- New inline SVG shapes (own, same flat style, listed per CLAUDE.md): stacked/share bar rects, weekday column rects, heatmap disc / ring / dot circles and their legend marks. No new icon file.
- iPhone checks for later (installed app, after Task 19): Analytics tab opens on 30d; tap 7d / All → numbers change; leave and come back → still the chosen range until the app is closed; VoiceOver on the tiles reads every number including streaks; heatmap marks readable outdoors.
- Next: Task 19.

## Task 18 push and Task 19 start (docs only)

- Task 18 pushed to origin/v2 (`5ac90b1`); main untouched (`556b55a`).
- Owner rulings on Task 18: R8 accepted (three expected-label lines in tests/analytics-logic.test.js, same kind as Task 17 R7). Reset bar both crimson: Minor, deferred to Task 21, owner Armin (fix: hatched or dashed bronze for "missed protocols"). The 16 differences from the board accepted as listed; 90D range and the completion line chart are out of scope.
- STILL OPEN, owner has not ruled (both "Needs owner ruling", NOT part of Task 19; src/core/stats.js and src/core/recovery.js stay untouched): (1) "All" for habits/tasks starts at the challenge start, so All can show fewer than 30d (core stats.js taskDates + frozen tests); (2) the vague-DECISION keyword rule in core fileAutopsy.
- Task 19 starts. Owner-authorised core edits, exactly these: (a) model.js validates an optional top-level `setup: {protocols, redLines}` (absent = valid, not in defaultState); (b) model.js validateState refuses a day with closedAt set and result null, and a warLog key outside contract, funeral, code, redlines-w1, autopsy-YYYY-MM-DD, day-<n>; (c) store.js validateImport must not throw on non-string input, backupStatus treats a future lastBackup as overdue with days null.


## Task 19: Settings, backup/import, reminders, seed tool

- Commits (v2, not pushed): `21e235a` docs (Task 18 push, Task 19 start); `995aa9d` test WIP (red); `cefc1be` feat(ui): settings, backup, pack import; `cb78a0f` fix: one refusal plate at a time; `185c650` test WIP (red, review fixes); `c965f2c` fix: review fixes; `0c52556` fix: drop the date-input render guard; plus this docs commit.
- Red counts (`node --test`): `995aa9d` tests 570, pass 558, fail 12 (core-setup 6, challengeLogic-setup 4, settingsLogic and settings-view modules not found 2). `185c650` tests 612, pass 605, fail 7. Green: `npm test` tests 612, pass 612, fail 0 (554 frozen + 58 new).
- Greps (exit 1 both): `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(\s*['\"`]" src`; `grep -rn innerHTML src/ui src/views`.
- Plan Step 5: `node tools/seed.mjs && node -e "import('./src/core/store.js').then(m=>console.log(m.validateImport(require('fs').readFileSync('private/seed-30days.json','utf8')).ok))"` prints `true` (exit 0). Seed: Day 1 = today minus 29, 22 passed / 4 redo / 3 reset, 20 tasks, 30 missions, generic names only, `private/` gitignored.
- Core edits, exactly the authorised ones: model.js (optional `setup`, closed-without-result day, warLog key allow-list `day-<n>` = 1..30 like core warlog.js), store.js (non-string import, future lastBackup). Not touched: stats.js, recovery.js, any frozen test. `begin()` (views/challengeLogic.js, not core) drops `setup` once the challenge owns the lists.
- Files: src/views/settings.js 142, settingsLogic.js 122, settingsSheets.js 88, src/settings.css 23, tools/seed.mjs 72; sw.js ASSETS += 4 (VERSION unchanged 1.0.23); index.html one link; day0.js rows now `<a href="#settings">`; app.js Settings route (the unreachable placeholder branch removed). New tests: core-setup 67, challengeLogic-setup 44, settingsLogic 253, settings-view 229, helper tests/fakedom.js 42 (not a test file).
- Browser proof (scratch/t19, playwright-cli, 375x812 DPR 3, clock fixed 2026-10-15 12:00, invented data, real file chooser): no horizontal overflow, text >= 11 px, taps >= 44, inputs 16 px (sheet inputs 18), 0 console errors on every screenshot. Day 0: add protocol + red line in Settings, Begin Day 1 enabled and starts (startDate 2026-10-15, no `setup` key left). Seed imported through Settings (confirm "Replace everything?", storage untouched until the tap); Analytics (22 passed / 4 redo / 3 reset) and Challenge show data. Delete a protocol mid-challenge: live list loses it, Analytics still shows its snapshot name; rename and add work. Refusals (exact sentence, no confirm sheet, `lockin.v2` byte-identical, no `lockin.v2.corrupt`): empty `The file is empty.`; non-JSON `The file is not valid JSON. Choose a Lock In backup file.`; v1 `This is a Lock In v1 backup. v2 cannot import it.`; damaged settings `The backup's settings are damaged.`; closedAt with result null `The backup's days are damaged.`; unknown warLog key `The backup's war log is damaged.`; bad pack `Mission days must be whole numbers from 1 to 30.`. Valid pack: confirm `Replace the current pack?`, stored, Mission 30 shows new title. Export: share cancelled (AbortError) lastBackup unchanged; share ok marks 2026-10-15; no canShare -> download `lockin-2026-10-15.json` (validates, lastBackup 2026-10-15). Quota failure: `#save-banner` shown, steppers still change in memory, storage unchanged. Day 1 move back to 2026-10-14 and 2026-09-01 refused with `Day 1 cannot move back to a day that has already ended.`; refusal gone after leaving and returning.
- Review: the `opus` alias returned model_not_found (claude-opus-5), so did `fable`; the review ran on the session model (Sonnet 5.5). Needs owner ruling (deviation from "one opus reviewer"). Findings: 1 Critical (C1: Day 1 date accepted any past date, core then settled every skipped day as Redo and locked Day 1: fixed, setStartDate(state, today, date, nowMs) refuses what settleMissed would settle, input min = yesterday), 3 Important (I1 date picker rebuilt by the tick + alert re-announced every 30 s: alert role only on first display; the date-input render guard I added caused a stale screen in the scoped re-review and was reverted in `0c52556`; I2 refusal outlived navigation: cleared on leaving #settings; I3 non-Abort share failure silent: falls back to download), Minors M1 (WAR_KEY too loose: fixed), M2 (file inputs built per render: now created on tap in body), M3 (aria-label "Re-import pack"), M4 (vacuous assertion). Scoped re-review: all addressed, one new Important (stale screen under the date guard) fixed by removing the guard. Verified before acting: C1 reproduced in the browser (Day 1 moved to 10-14 became redo / no-night).
- Rulings (cost if wrong):
  - R1 the board's per-protocol pause switch is not built: the data model has no paused flag and the plan lists add/rename/delete only. Therefore Settings has no switch and the Task 10 m3 (thumb slide never plays after a re-render) stays deferred. Cost: a core field plus UI later.
  - R2 "Erase all data" (on the board, not in the plan or the task) is not built.
  - R3 deleting the last protocol or red line of a running challenge is refused (`A challenge needs at least one protocol.`), before Day 1 it is allowed. Cost: one condition.
  - R4 `MED per week` is a stepper (plan) not the board's static value.
  - R5 bounds of the steppers are probed from `validateState` (no core export exists to read them from); capped at -5..25. Cost: replace by an export if core ever gets one.
  - R6 one refusal plate at a time, kept in module memory tied to the state object, announced (role=alert) once.
  - R7 confirm sheets are action sheets with the message `Replace everything?` / `Replace the current pack?` (the pack one also on a first import).
  - R8 a share that fails for a reason other than AbortError falls back to download; only then is the backup marked.
- Needs owner ruling:
  1. Day 1 date control: after the C1 guard the only possible move is to yesterday before 04:00; effectively read-only. Options: keep, remove the control, or allow back-dating with a confirm plus a core change (settleMissed would otherwise settle the skipped days as Redo).
  2. The orphan refusal (filed day outside the new 30-day window) is practically unreachable in the live app (past days auto-settle on the next tick); covered by unit tests only.
  3. Board pause switch (R1), Erase all data (R2), the stepper-vs-static MED row (R4).
  4. Review ran on the session model, not opus (see above).
  5. STILL OPEN from Task 18, untouched: "All" for habits/tasks starts at the challenge start; the vague-DECISION keyword rule in core fileAutopsy (the seed's autopsy decision had to contain a keyword such as "leave").
- Deferred (owner Armin unless noted):
  - m1 input `min` = yesterday is exact only before 04:00; after that the picker offers yesterday and the logic refuses with the sentence (Task 21).
  - m2 a pack refusal and a backup refusal can read the same sentence (`The file is empty.`); only the position tells them apart (Task 21).
  - m3 `deleteProtocol` / `deleteRedLine` of an unknown id returns a new state and saves (harmless; Task 21).
  - m4 `setStartDate` refuses even the unchanged date when the stored startDate is in the future (clock-skewed backup; Task 21).
  - m5 file input `cancel` event needs iOS 16.4+, older versions leave a hidden input until the next pick (harmless; iPhone check).
  - m6 the 30 s tick re-render may close the iOS date picker while it is open (guard removed, see review); only two dates are selectable (iPhone check).
  - m7 no new contrast test: Settings uses --accent, --text-2, --crimson-lt on the plate, already covered by tests/contrast.test.js token pairs (Task 21).
  - m8 the long Day 1 date ("Wednesday 16 September") wraps the caption to two lines at 375 px (Task 21).
- apple-design audit (notes only, scratch/t19/apple-design-audit.md): Medium action-sheet confirm copy repeats the button; Medium Day 1 picker (now guarded); Low chevron rows open sheets; Low no Erase-all. No code changed from it.
- iPhone checks for later (installed app, after Task 19): Settings tab opens; add a protocol and a red line before Day 1, Challenge tab Begin Day 1 enables; tap Export backup -> share sheet -> Save to Files -> Last backup says Today; cancel the share sheet -> Last backup unchanged; Import backup with that file -> "Replace everything?" -> data back; import an empty file and a v1 backup -> plain sentence, nothing changed; Import pack with the owner's real pack -> `Replace the current pack?` -> Day 1 mission appears (the Task 19 checkpoint); Reminders sheet -> Copy puts the text on the clipboard; Day 1 date picker: open and dismiss, check the screen is not stuck; stepper taps while the Files sheet was just closed; VoiceOver reads a refusal once.
- Next: Task 20 (offline, version, release). The plan's ⛔ CHECKPOINT after Task 19 (owner imports the real pack on the phone) is the owner's step.

- Owner ruling on Task 19 (2026-10-15): Day 1 date control KEPT as is (effectively read-only: the only move is to yesterday before 04:00; earlier moves are refused with `Day 1 cannot move back to a day that has already ended.`). Needs-owner-ruling item 1 and 2 of the Task 19 entry are closed. Items 3 to 7 remain open.

## Core fixes: Task 18 / Task 19 open rulings (owner, 2026-10-15)

- Commits (v2, not pushed): `07a6fd2` test WIP (red); `dbea336` fix(core); plus this docs commit.
- Red counts (`node --test`, at `07a6fd2`): tests 614, pass 609, fail 5 (analytics-logic All walk, view decision-no-nudge, recovery order test, decision accepted, stats All-from-first-log). Green: `npm test` tests 614, pass 614, fail 0.
- Greps (exit 1 both): `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(\s*['\"`]" src`; `grep -rn innerHTML src/ui src/views`.
- Ruling A (owner option 1): `fileAutopsy` no longer vague-checks the Decision (the board's own sample decision failed it). `change` keeps the check and the exact nudge. Error `vague-decision` removed (core, `recoveryLogic.js` ERRORS); the Recovery view's Decision is a plain textarea with no nudge.
- Ruling B: "All" (n null) for habits and tasks (`weekdayRates`, `taskTotals`) starts at the first taskLog date. Challenge-bound selectors and the heatmap unchanged. ponytail comment above `taskDates` updated.
- Test assertions changed (frozen-test edits, only these):
  - tests/recovery.test.js:121 title `incomplete beats vague; vague-change beats vague-decision` -> `incomplete beats vague-change; the decision is never vague-checked`.
  - tests/recovery.test.js:128 `refused(..., decision: 'try harder' ...) === 'vague-decision'` -> `fileAutopsy(...).ok === true`; comment on :130 reworded (both keyword-less: only change refused; assertion unchanged).
  - tests/recovery-logic.test.js:95 deleted `errorText('vague-decision') === NUDGE`; test title now says `vague-change is the exact core nudge`.
  - tests/recovery-view.test.js:163 loop over `[change, decision]` -> `[change]`; :183 loop over `[vague-change, vague-decision]` -> `[vague-change]`.
  - tests/analytics-logic.test.js:74 oracle walker `cut(n) ?? (s.challenge ? s.challenge.startDate : first)` -> `cut(n) ?? first`; header comment updated. analytics-view and stats.test.js existing assertions unchanged (stats.js:167 comment reworded only).
- New tests: recovery.test.js x2 (decision without keyword accepted and stored; vague change still `vague-change`); recovery-view.test.js x1 (decision no nudge after blur, files OK); stats.test.js x1 (All from first log, All = 30d, resultCounts still from challenge start).
- Numbers (script over raw taskLog, not the selector; scratch only):
  - analytics-logic fixture, All task totals: before done 10 / failed 2 / stalled 2 / open 21 (from 08-25), after 11 / 2 / 2 / 24 (from first log 08-20). Weekdays Mon..Sun before [4,8] [2,5] [3,10] [0,5] [0,5] [0,0] [0,0], after [4,10] [2,5] [3,10] [1,6] [0,6] [0,0] [0,0]. 30d for reference: 8/1/1/19.
  - stats fixture with challenge start 10-05: All tasks before 0/0/1/2, after 4/1/1/2; weekdays before only Mon-Wed [0,1], after [0,1] [0,1] [0,1] [1,1] [1,1] [0,1] [1,1].
- Review: the `opus` alias returned model_not_found (HTTP 404); review ran on the session model (Sonnet 5.5). No Critical, no Important. Minors deferred (owner Armin): decision textarea lost its unused `aria-describedby` (correct); `touched` draft key now only used for change; `.filter(d => d >= first)` redundant for n null (kept for finite n); "All never smaller than 30d" test holds because the fixture's first log is inside the 30-day window.
- Closes Task 19 Needs-owner-ruling item 5 (both parts).
- Needs owner ruling: review model (opus unavailable, same as Task 19).

## Pushes recorded before Task 20 (2026-10-15)

- Task 19 pushed to origin/v2 (up to `29a3ffe`, the Day 1 control ruling).
- Core fix pushed to origin/v2 (`4f5d7fd`): the Decision field is no longer vague-checked (core `fileAutopsy`, `views/recovery.js`, `views/recoveryLogic.js` and the matching test assertions, listed in the "Core fixes" entry above); "All" for habits and tasks now covers the whole task history.
- Day 1 date control kept as is. Task 21 replaces the input with a plain text row.
- Pause switch and Erase all data not built. Task 10 m3 (thumb slide after a re-render) closed as moot, because there is no switch.

## Task 20: Offline, version, release

- Commits (v2, not pushed, not merged): `84c7cce` docs: record Task 19 and core-fix pushes; plus `chore: release 2.0.0` (this entry, `sw.js`, `src/version.js`, `docs/HANDOFF.md`, `docs/backlog.md`; a commit cannot contain its own hash, see `git log`).
- Preconditions (raw, before any change): `git status --short` empty; HEAD = origin/v2 = `4f5d7fd11a3d826a1e254971fb86101a2074f494`; origin/main = `556b55a161ba13105977270d8558e493a36d3556`; PM-App HEAD `556b55a`; `npm test` tests 614, pass 614, fail 0; no node/serve process.
- Step 1 `node --test tests/sw.test.js`: 4/4 pass (exit 0): ASSETS lists every shipped file and nothing else; every ASSETS path exists; paths relative; `sw.js` VERSION equals `src/version.js`.
- Step 2: `VERSION = '2.0.0'` in `sw.js` and `src/version.js` (the only version edit in v2; no other `1.0.23` left in `sw.js`, `src`, `tests`, `index.html`, `manifest.webmanifest`). `git diff origin/main -- manifest.webmanifest icons` is empty (exit 0). `git diff origin/main -- index.html`: lines 1 to 18 (the whole `<meta>` block, `<title>`, manifest and icon links, `fonts.css`, `styles.css`, `screens.css`) are unchanged; changed lines: +4 stylesheet links (`src/night.css`, `recovery.css`, `analytics.css`, `settings.css`), `<main id="view">` gains `class="scr"`, and the body tab bar: `<nav class="tabbar">` with four `<button data-tab>` (Today, Plan, Progress, Settings) becomes `<nav class="tabs">` with five `<a class="tab" href="#…">` (Today, Tasks, Challenge, Analytics, Settings). No `<meta>` change. The body edits are beyond "stylesheet/script links": they are the v2 five-tab shell (spec), not install-related. `sw.js` diff against main is only the header comment, VERSION and the ASSETS list; the install, activate and fetch handlers are byte-identical to v1.
- Step 3, offline proof (playwright-cli `run-code` against `npx serve -l 5180`, 390x844 DPR 2, service workers allowed; scripts and raw output in the git-excluded `scratch/t20/`: `phaseA.js`, `phaseB1.js`, `phaseB2.js` + `B2.raw`, `phaseB3.js` + `B3.raw`, `seed.json` from `build-seed.mjs`, invented data, Day 3 of a challenge with two passed days):
  - Cache upgrade, same origin, v1 files from `git archive origin/main` served first, then the v2 repo on the same port. v1 online: caches `{"lockin-1.0.23":39}`, tabs Today / Plan / Progress / Settings. After the server serves v2 and `registration.update()` runs: `{"lockin-1.0.23":39,"lockin-2.0.0":76}` while the new worker is `activating`. After closing every window and reopening: caches `{"lockin-2.0.0":76}` only (old cache deleted by `activate`), controller true, tabs Today / Tasks / Challenge / Analytics / Settings; second reopen identical; `lockin-2.0.0` holds `src/version.js` = `2.0.0`. The v1 page was not yet controlled by its worker (`controller:false`, first load), so the new worker had no controlled client to wait for and activated at once; the "waits for a full relaunch" path (no `skipWaiting`) is unchanged v1 code and was not exercised.
  - Offline reload, five tabs (clock fixed 2026-10-15 08:00, context set offline, `navigator.onLine` false, reload): controller true; Today, Tasks, Challenge, Analytics, Settings each render (view children 5 / 5 / 6 / 7 / 9, headings in Cinzel, body Alegreya Sans, `#0A0A0B` background, the three `src/bg/*@2x.webp` layers resolved on `.scr::before`, 5 of 8 font faces loaded because the other three are unused on these screens; all 8 are in the cache). 64 responses, all from the service worker, 0 from the network; `requestfailed` 0; HTTP >= 400: 0; console errors 0. Control after the counts: an uncached URL fails offline (`Failed to fetch`). Screenshots `scratch/t20/offline-*.png` (Today and Analytics viewed: wall, frieze, tab bar and fonts render).
  - Offline full day (seeded, offline for the whole run; the seed was loaded online first, then the context went offline before any listener attached): 08:00 Start morning, target and risk, Start the day: `morning` stored; 14:00 afternoon: Yes, Log it: `afternoon.onTrack` `yes`; 21:00 night: both tasks Done, both protocols Held, red line held, win text, suggested `Passed`, Close the day, confirm: `result` `passed`, `closedAt` set, Today shows 3-day streak and both tasks Completed. 184 responses, 0 from the network, `requestfailed` 0, console errors 0, still offline at the end.
  - Probe note: a first B2 run included a deliberate uncached `fetch` before the counts, which counted as one failed request and one console error; it was removed and the proof re-run clean (the numbers above are the clean run).
  - `npx serve` (cleanUrls) answers `/index.html` with a 301 to `/index`, and a cached redirected response served to a navigation fails (`net::ERR_FAILED`); opening `http://localhost:5180/` (the manifest `start_url` `./`) works. Dev-server artifact of `serve`; GitHub Pages serves `index.html` with 200. Not a v2 change (same handlers as v1).
- Step 4: `docs/HANDOFF.md` gets the 2.0.0 release checklist on top (plan's 6 steps with `git merge --no-ff v2` so the rollback has a merge commit to revert; rollback `git revert -m 1 <merge commit>`, v1 data in `lockin.v1` never touched: `grep` over `src` finds no read, write or remove of `lockin.v1`; first Day 1 steps incl. importing the real pack and confirming Day 1's mission; airplane checkpoint; the combined iPhone checks of Tasks 9 to 19). The previous v1 content stays below a "v1 history" heading. `docs/backlog.md`: 17 rows, one per task group, every deferred Minor of Tasks 2 to 19 still open, owner Armin (Task 21), plus the Task 21 item "replace the Day 1 input with a plain text row".
- Greps (exit 1 both): `grep -rnE "toISOString|getUTC|Date\.parse|new Date\(\s*['\"`]" src`; `grep -rn innerHTML src/ui src/views`.
- Cleanup: the v1 export `scratch/t20/v1` was deleted afterwards (its `tests/` made a bare `npm test` count 701; reproducible with `git archive origin/main`); serve processes listed before (npx 29500, serve 27596) and after (none); `.playwright-cli/` moved to `scratch/t20/playwright-cli-logs`; `git ls-files scratch` empty; PM-App HEAD `556b55a`.
- Needs owner ruling: (1) `index.html` body edits beyond links (five-tab nav and `class="scr"`), listed above; (2) the first name "Armin" now appears in `docs/backlog.md` as owner (the instruction named it; CLAUDE.md says no real names in the repo; PROGRESS.md already used it in the Task 18 and 19 entries); (3) the waiting-worker path of the upgrade was not exercised (see above); (4) HANDOFF step 2 says `--no-ff`: the plan only says "merge"; a fast-forward would leave no merge commit for `git revert -m 1`.
- Next: ⛔ CHECKPOINT (airplane mode) for the owner, then Task 21.

## M1: Motion foundation (ROADMAP.md, DESIGN-SPEC §10), branch `motion`

- Commits: `954da43` docs: motion scope (CLAUDE.md, ROADMAP.md, DESIGN-SPEC §10, edited by the owner); then `feat(M1): motion foundation` (this entry, `styles.css`, `src/night.css`, `src/app.js`). Branch `motion` from origin/main `193857d` (local `main` in the PM-App worktree is still `b6f7fb8`, not touched). Not pushed.
- Precheck: HEAD `193857d`, `npm test` 1212 pass, 0 fail (exit 0), tree clean apart from 2 untracked docs. After: `npm test` 1212 pass, 0 fail (exit 0). `src/core`, tests, `gym.css` and VERSION untouched.
- Tokens in `:root`: `--dur-press` 100ms, `--dur-ui` 200ms, `--dur-screen` 280ms, `--ease-out` cubic-bezier(.23,1,.32,1), `--ease-spring` = the existing thumb curve (.3,1.4,.5,1). The thumb (.25s) and shield fill (.2s) now use the tokens.
- Press: `:where(button, a[href]):active` scale .97 (tab bar excluded, M2); tappable list rows (`a`/`button` with `.row .st .gm-rw .sr .action-row`) dim to .6 instead. `:where` keeps it under every class rule. iOS needs a page touch listener for `:active`: one passive no-op `touchstart` in `app.js`.
- Toggles: the gold fills of `.chip`, `.seg button` and the `.sw` on-track moved to a `::before` layer that fades (gradients can't transition); text, border, thumb fill and lambda fade with it, thumb slides. `night.css` stalled / crossed colours now recolour that layer. Shield: fill, lambda and glow fade on untick; pop and rip kept unchanged.
- Re-render replay (`app.js`): most taps re-render synchronously, so a toggle came back rebuilt and no transition ran. A capture click listener records the tapped group's states; after the handlers, rebuilt toggles that changed are set back to the old state, one style pass, then forward again (transitions already started by the render are finished first; pop is an animation and stays). ponytail note: matched by position among the page's toggles.
- Reduced motion: one block in `styles.css` sets the tokens to 1ms / 100ms, drops pop, rip, thumb slide and press shrink (press dims instead). Replaces owner call 3 (instant) per DESIGN-SPEC §10. The sheet block in `screens.css` is M3.
- Browser pane (localhost, no seed data: the seed copy from `private/` was blocked): Settings switch rebuilt by the re-render plays 5 transitions at 200 ms; Gym picker chip (kept in place) fades; a re-rendered seg (injected test group, with and without a flush in the render) fades the old and the new choice; a re-rendered shield keeps pop + rip on tick and fades on untick. No `will-change` anywhere.
- Deviations: (1) colour fades use `color`, `border-color`, `fill`, `stroke` transitions (paint only, no layout); §10 says "the color fades" but also "transform, opacity, filter only". (2) `.seg` fill fades between options, it does not slide (a sliding pill needs a measured indicator). (3) pop (.5s) and rip (.65s) keep their raw durations, over 300 ms ("keep existing"). (4) Emil Kowalski skills not installed project-level: already installed for the user (`animate`, `emil-design-eng`, `review-animations`, ...); a project copy would add files to the public repo.
- Next: ⛔ phone check of M1, then M2 (tab bar).

## M2: Tab bar and screen transition (ROADMAP.md, DESIGN-SPEC §2 and §10), branch `motion`

- Commit: `feat(M2): glass tab pill and screen fade-in` (this entry, `screens.css`, `index.html`, `src/app.js`; hash in `git log`). Not pushed. `src/core`, tests, VERSION untouched.
- Precheck: HEAD `d916077`, tree clean apart from 2 untracked docs, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Bar: unchanged glass pill (`backdrop-filter` + `-webkit-backdrop-filter`, `blur(26px) saturate(170%)`, no SVG filter). New static `<span class="tab-pill">` in `index.html`; `render()` sets `--i` (active index) on `.tabs`; the pill is `translateX(calc(var(--i) * 100%))` over `--dur-ui` / `--ease-spring`. Glow and 3 px bar removed; gold filled icon kept. Tab press: icon shrinks to .86 (`--dur-press`). `.tabs` gets `overflow: hidden` so the spring overshoot stays inside the bar.
- Screens: `render()` toggles `.enter` on `#view` only when the route key changes (not first paint, not same-key re-render); `#view.enter > *` runs `scr-in` (opacity, 8 px rise, `--dur-screen`, `backwards` so nothing lingers). Children animate, not `#view`, because its `::before` is the wall.
- Reduce Transparency / Increase Contrast: existing solid `#1a181c` block kept. Reduce Motion: pill hidden, glass fill shown on the active tab's `::before` with a fade, no icon shrink, screen fade only.
- Browser pane (440 wide check, no seed data): route change animates the pill (200 ms transform) and 10 `scr-in` at 280 ms; focus/visibility re-render of the same route plays none and drops `.enter`; pill rect equals the active tab rect. Reduce Motion and Reduce Transparency were not run (no emulation in the pane).
- Deviations: (1) frozen `tests/gym-tabs.test.js` still requires a `.tab[aria-current="page"]::before {` rule, so that selector stays (`content: none`; it is the Reduce Motion fill). (2) `overflow: hidden` on `.tabs`.
- Next: ⛔ phone check of M2, then M3.

## M3: Sheets, modals and list motion (ROADMAP.md, DESIGN-SPEC §10), branch `motion`

- Commit: `feat(M3): sheet, modal and list motion` (this entry, `screens.css`, `sw.js`, `src/motion.js` new, `src/sheet.js`, `src/app.js`, `src/ui/taskRow.js`, `src/views/gymHistory.js`, `src/views/gymWorkout.js`; hash in `git log`). Not pushed. `src/core`, tests, VERSION untouched.
- Precheck: HEAD `641f544`, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Sheets: the raw 320 ms / cubic-bezier is gone. Enter `sheet-in` `--dur-screen` (280 ms) `--ease-out`; backdrop `fade-in` `--dur-ui` on `dialog[open]::backdrop`; swipe spring-back `--dur-ui`. Exit: `present()` clones the dialog (still `open`, so it renders non-modal) into `document.body` through `ghostOut` (`src/motion.js`: ids stripped, `aria-hidden`, `inert`, `pointer-events: none`), plus a `.ghost-bd` backdrop, then `dialog.close()`, `remove()` and `refocus()` run synchronously as before. The ghost slides down and fades (`--dur-ui`, `sheet-out`), removed on `animationend` with a 400 ms timeout. A swipe past 100 px passes its distance as `--from`, so the ghost continues from where the finger left it.
- Lists: rows opt in with `data-k` (tasks `t/<task id>`, history rows `h/<workout id>`, workout sets `s/<item>/<set>`). `app.js` render() calls `swapRows(view, screen(r), key === shown)`: only on a re-render of the same screen, a new key gets `.k-in` (`scr-in` rise, `--dur-ui`), a missing key leaves as a ghost clone at its old position (absolute, document coordinates, solid plate fill, slides 12 px left and fades). Existing rows are never touched, so a toggle or the clock tick animates nothing.
- Reduce Motion: sheet enter `fade-in`, exits `fade-out`, rows `scr-fade`, no spring-back (tokens already 100 ms). Reduce Transparency / Increase Contrast: `.sheet` and the action sheet groups are solid `#1a181c`.
- Browser pane (440x956; the pane paints no frames, so the animation clock stays at 0: values read by scrubbing `currentTime`): sheet enter 944 px at 0 ms, 32 px at 140 ms, 0 at 270 ms; exit ghost 0 px / opacity 1 at 0, 732 px at 50 ms, 944 px at 190 ms; ghost has no ids, `aria-hidden`, `inert`; after Cancel the live DOM has no `#sheet-title` and no non-ghost dialog (synchronous close); a swipe of 160 px gives `--from: 160px` and the ghost starts at 160 px; ghosts were removed by the timeout fallback. Added two tasks: only the new row got `k-in`. Deleted one: one `.ghost.k-out` clone at the old position (`left 21 top 290 width 398`), no ids, the other row untouched. Not run: Reduce Motion, Reduce Transparency, a real swipe on a touch screen, gym sets and history rows (same code path, keys only).
- Deviations: (1) new file `src/motion.js` (listed in `sw.js` ASSETS; the sw test requires it; no VERSION change). (2) Set rows have no id in the data (`src/core` untouched), so they are keyed by position: removing set 2 of 3 fades out the last row, which looks the same once the rows renumber. (3) More than 3 added or removed rows at once is not animated (a different list: day stepped, bulk change). (4) `screens.css` is now 316 lines (target 300); the M3 block is 22 lines. (5) `dialog::backdrop` fade needs `::backdrop` to inherit the tokens (iOS 17.4+ and current browsers); on older iOS the backdrop just appears.
- Frozen tests: none fought the change.
- Emil Kowalski skill (audit only): exits faster than enters (200 vs 280 ms), ease-out only, transform and opacity only, no `scale(0)`, nothing blocks input.
- Next: ⛔ phone check of M3, then M4 (Analytics).

## M3b: Slower motion curves and durations (owner decision 2026-10-24), branch `motion`

- Commit: `fix(M3b): slower motion curves and durations` (this entry, `styles.css`, `screens.css`, DESIGN-SPEC §10, ROADMAP.md; hash in `git log`). Not pushed. `src/core`, `src/*.js`, tests, VERSION untouched.
- Cause (owner): `--ease-out` cubic-bezier(.23,1,.32,1) finishes about 80 % of the travel in the first quarter, so 200 ms read as a teleport.
- Precheck: HEAD `136bbd9`, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Tokens: `--ease-out` cubic-bezier(.32,.72,0,1); `--dur-ui` 280 ms (UI and every exit); `--dur-screen` 400 ms; new `--dur-sheet` 450 ms (sheet enter); `--dur-press` 100 ms unchanged; `--ease-spring` unchanged. Reduce Motion block: `--dur-ui` and `--dur-screen` stay 100 ms, `--dur-sheet` added at 100 ms, fades only.
- Uses: tab pill slide `--dur-screen` with `--ease-spring`; screen rise and fade `--dur-screen`; sheet and action sheet enter `--dur-sheet`; backdrop in and out, exit ghosts and row add/remove `--dur-ui`. All other token users (toggles, shield, thumb, chips) slow down through the tokens.
- Exit ghost: the slide (`sheet-out`, transform only, `--ease-out`) and the fade (`fade-out`, linear) are now two animations of 280 ms, so the sheet is still visibly travelling while it fades; before, one eased animation had the opacity gone after about a third of the slide.
- Docs: DESIGN-SPEC §10 token list and cap (now 450 ms), ROADMAP.md performance rule (100 to 280 ms, screens 400, sheets 450, cap 450). CLAUDE.md holds no duration cap or token list (its motion paragraph points to §10), so nothing changed there.
- Browser pane (computed values; the pane paints no frames): tokens resolve as above; the sheet enter animation is 450 ms, the backdrop fade 280 ms, the Cancel exit ghost has `sheet-out` 280 ms ease-out and `fade-out` 280 ms linear, the ghost backdrop fades 280 ms, the pill transition is 0.4 s with the spring curve. Not run: a real iPhone, Reduce Motion.
- Kept: `rip` .65 s and `pop` (existing, over the cap before too, "keep existing"); the 400 ms timeout fallback in `src/motion.js` still outlasts the 280 ms exits (JS not touched).
- Next: ⛔ phone check of M3 and M3b, then M4 (Analytics).

## M4: Analytics motion (ROADMAP.md, DESIGN-SPEC §10), branch `motion`

- Commit: `feat(M4): analytics stagger and range fade` (this entry, `src/analytics.css`, `src/app.js`, `src/views/analytics.js`, `src/views/analyticsParts.js`; hash in `git log`). Not pushed. `src/core`, tests, VERSION untouched.
- Precheck: HEAD `e0a17ae`, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Stagger: stat tiles, protocol and tactic rows, weekday columns, the day strip, the heatmap and the reset track carry `.an-i`; `analytics.js` sets inline `--i` (0..4, document order, rest at 4) on them. CSS `scr-in` (fade + 8 px rise, `--dur-ui`, `--ease-out`) with `animation-delay: calc(var(--i) * 40ms)`. Plays under `#view.enter` (route change) or `.an-play` (set on the sections by a range tap, consumed by that render). Data edits, ticks and a tap on the already chosen range add neither, so nothing replays. The section frames fade (`scr-fade`) on entry instead of rising, so items do not rise twice.
- Bars: weekday bars `scaleY(0)` to 1, `transform-box: fill-box`, `transform-origin: bottom`, same delay and duration as their column. Horizontal tracks (protocol, tactic, reset) fade with their row; no scaleX added (not asked).
- Range control: segmented buttons get `data-tg="range/<label>"`; the replay in `app.js` now finds a rebuilt toggle by `data-tg` when it has one, else by position as before (ponytail note updated). Pane check: after a tap on 7d the old and new button each run `color` and `::before` `opacity` at 280 ms.
- Timing: last item ends at 4 x 40 + 280 = 440 ms (measured via getAnimations). Sequence under 450 ms. Reduce Motion: fades only (`scr-fade`, delay 0, bars no growth), tokens already 100 ms.
- Ruling (owner): the brief (about 40 ms apart, max 8, total under 450 ms) cannot all hold, since 8 x 40 + 280 = 600 ms. Owner chose 40 ms with 4 steps: `--i` caps at 4, `--stag` 40 ms in `src/analytics.css`, 440 ms total. No open ruling.
- Found while testing: the first version of `stagger` flattened NodeLists wrongly (`flatMap` over a NodeList); fixed with a spread before commit. The frozen fake-DOM tests do not exercise it, so only the pane run caught it.
- Browser pane (440 wide, invented state from the analytics-view test fixture, removed afterwards; the pane paints no frames, values read from `getAnimations`): entry: 13 items with `--i` 0..4, delays 0..160 ms, 7 `an-grow`, `#view.enter` set; range tap: same stagger, no `enter`; same-range tap and a same-route re-render: 0 animations. Not run: iPhone, Reduce Motion.
- Next: ⛔ phone check of M4, then M5 (audit, release).

## M4b: Slower Analytics motion (owner: still too fast), branch `motion`

- Commit: `fix(M4b): slower analytics stagger` (this entry and `src/analytics.css` only; hash in `git log`). Not pushed. JS, `src/core`, tests, VERSION untouched.
- Precheck: HEAD `66fe2be`, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Items: own keyframes `an-in` (fade, 16 px rise) at `--dur-screen` (400 ms), `--ease-out`, delay `--i` x 40 ms, `--i` still 0..4. Weekday bars `an-grow` (scaleY from the bottom) at `--dur-sheet` (450 ms), same delay as their column. Range buttons: `.an-range .seg button` colour and `::before` fill opacity at `--dur-screen`; press transitions (`--dur-press`) kept, the shared `.seg` rule in `styles.css` stays on `--dur-ui` for the other screens.
- Timing (pane, `getAnimations`): items 400 ms, bars 450 ms (the longest single animation, cap holds), range fade 400 ms, last end 160 + 450 = 610 ms; the brief allowed about 560 for the items (160 + 400), only the bars run to 610. Same-range tap: 0 animations. Reduce Motion block unchanged (fades only, no delay, no bar growth; `--dur-screen` is 100 ms there).
- Not run: iPhone, Reduce Motion.
- Next: ⛔ phone check of M4 and M4b, then M5.

## M5: Motion audit and release v2.2.0 (ROADMAP.md, DESIGN-SPEC §10), branch `motion`

- Commit: `release: v2.2.0 motion polish` (this entry, `sw.js`, `src/version.js`, ROADMAP.md; hash in `git log`). Not pushed. `src/core`, tests, CSS and view JS untouched.
- Precheck: HEAD `ffb4699`, `npm test` 1212 pass, 0 fail (exit 0). After: 1212 pass, 0 fail (exit 0).
- Audit scope: `styles.css`, `screens.css`, `src/*.css` (analytics, gym, night, recovery, settings), `index.html`, `src/app.js` (press listener, toggle replay, tab `--i`), `src/motion.js`, `src/sheet.js`. Emil Kowalski and apple-design used audit-only.
- Animated properties: only transform, opacity, filter, plus paint-only colour fades (`color`, `border-color`, `fill`, `stroke`) on toggles and the tab label (M1 deviation 1; §10 toggles line asks for "the color fades"). No width, height, top, left or margin animation. One box-shadow keyframe: `rip` (existing, kept by §10). The swipe sets inline `transform` (direct manipulation). The k-out ghost gets `left/top/width` once as a static position, not animated.
- Raw durations and curves: `pop` .5 s cubic-bezier(.2,1.5,.4,1) and `rip` .65 s ease-out (intentional, existing). `fade-out` linear on the sheet ghost (M3b, intentional). `--stag` 40 ms (analytics, a local stagger token). `.tab` `transition: color var(--dur-ui)` has no curve, so it runs the default `ease`; the Reduce Motion tab fill `scr-fade var(--dur-ui) both` likewise. JS: 400 ms ghost removal fallback (a timeout, not an animation).
- Over 450 ms: only `pop` (500 ms) and `rip` (650 ms). Analytics: the longest single animation is the bar at 450 ms; the staggered sequence ends at 610 ms (M4b, owner). `src/analytics.css` comment still says "about 560 ms" (left as is, comment only).
- will-change: none in CSS or JS. backdrop-filter: only `.tabs` (sheets use solid plates, no blur).
- Reduce Motion: every M1 to M4b animation has a fade-only path (tokens 1 / 100 ms; pop, rip, thumb slide, press shrink, pill slide, icon shrink, sheet slide, swipe spring-back, row slide, bar growth all off). Reduce Transparency / Increase Contrast: `.tabs`, `.sheet[open]` and `.action-sheet .group` solid `#1a181c` (sheet ghosts inherit `.sheet`). But `prefers-reduced-transparency` is not supported by iOS Safari (caniuse), so on the iPhone only Increase Contrast triggers it.
- Input: nothing waits on an animation. Sheets close and refocus synchronously; ghosts (sheet, backdrop, rows) are `inert`, `aria-hidden`, `pointer-events: none`; the tab pill is `pointer-events: none`; rows during `k-in` and analytics items during their delay stay tappable. The toggle replay forces one style pass (`getBoundingClientRect`) inside the click, synchronous, no wait.
- Fixes: none. No finding is a clear §10 violation that can be fixed without changing approved timing or look.
- NEEDS RULING: (1) `pop` 500 ms and `rip` 650 ms box-shadow vs the 450 ms cap and the transform/opacity/filter rule (§10 also says keep them). (2) Colour fades on toggles and the tab label are paint properties. (3) `.tab` colour fade and the Reduce Motion tab fill use the default `ease`, not `--ease-out` (adding the token would change the approved curve). (4) Reduce Transparency fallback never runs on iOS Safari; Increase Contrast does. (5) `src/gym.css:46` comment says the workout screen has no animation; shared press feedback and set-row add/remove (screens.css) now play there (the gym test only bans animation inside `gym.css`, still true).
- Release: VERSION 2.2.0 in `sw.js` and `src/version.js` (sw test passes). ASSETS: the only new shipped file since v2.1.0 is `src/motion.js`, already listed; the sw test checks ASSETS equals every shipped file. ROADMAP: v2.2.0 ready on `motion`, M5 done, open rulings listed.
- Not run: iPhone, Reduce Motion on device. Users must fully close and reopen the Home Screen app twice to get 2.2.0.
- Next: ⛔ owner iPhone check of 2.2.0, then push `motion`, merge to main, GitHub Pages.

## H0: Help button inventory (read-only), branch `help`

- Commit: `docs(H0): help button inventory` (this entry and `docs/superpowers/plans/help-inventory.md`; hash in `git log`). Not pushed. `src`, tests, styles untouched.
- Precheck: branch `help` created from `main` (6956506, same commit as `motion`). Tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone). `npm test` 1212 pass, 0 fail (exit 0). After: not re-run (docs only; `src`, tests and styles unchanged).
- Method: read PLAN Rules and Tasks 3-5, 7, 11-19, DESIGN-SPEC §5/§8, `v2.1-gym-plan.md` Rules, `PROGRESS-GYM.md` Decisions; grepped `src/views` and `src/core` for the on-screen copy of each item.
- Result: 6 tabs, 43 rows, each with the quoted rule (file + section) and yes/partly/no for on-screen explanation; 77 lines.
- Choices: "Check-ins" and "Recovery" sit under Challenge (the Today tab only links to them). Where the plan is silent the row says "unclear" instead of describing behaviour.
- Needs ruling: (1) Night time 18:00 (PLAN) vs 20:00 (SPEC §8, code). (2) Top G / Bottom G undefined in Rules. (3) MED expansion, oath entry content, "Protocol", `risk`. (4) Analytics range scope, heatmap levels. (5) Owner wording for rules the UI never shows.
- Next: owner picks the help scope from the inventory.

## H1a: Challenge help copy draft (text only), branch `help`

- Commit: `docs(H1a): challenge help copy draft` (this entry and `docs/superpowers/plans/help-copy-draft.md`; hash in `git log`). Not pushed. No code, no tests.
- Precheck: HEAD `b5cc9b4`, tracked tree clean. Tests not run (docs only; 1212 pass at H0).
- Sources read: the Forge BUILD-PLAN §5-6 (outside the repo, cited by section only, nothing copied), PLAN Rules and Tasks 4, 5, 13-17, DESIGN-SPEC, `help-inventory.md`.
- Result: 16 entries (where the "?" sits, text of at most 2 short sentences, source). Entries 1 (Top G / Bottom G terms) and 5 (oath contents) are UNCLEAR with no text; MED and Protocol give function text only, not a definition.
- Choices: Top G win and Bottom G's move are split from the term entry so the fields get text. No personal or course content in the draft; archetype names left out (they come from the pack).
- Needs ruling: (1) MED limit: BP "2 MED days per week, TOTAL" vs PLAN "each declaration uses one of `settings.medPerWeek` slots" (◆); draft follows PLAN. (2) Onboarding: BP says Day 1 mission creates protocol rows, PLAN requires them first; draft follows PLAN. (3) "Does not change the result" for Top G win and risk note is read from `suggestResult` inputs, not a Rules sentence. (4) UNCLEAR: Top G / Bottom G terms, oath contents, what MED stands for, what a protocol is.
- Next: owner rules on the list; then H1b (build the "?" buttons, Challenge only).

## H1b: Challenge help "?" buttons, branch `help`

- Commits: `test(H1b): WIP red tests for Challenge help buttons` (ad9eca9, red: `helpCopy.js` missing), then `feat(H1b): Challenge help buttons` (this entry; hash in `git log`). Not pushed. `src/core`, frozen tests and VERSION untouched.
- Precheck: branch `help`, HEAD `336e40b`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1212 pass, 0 fail (exit 0). After: 1231 pass, 0 fail (exit 0); the 19 new tests are `tests/help-copy.test.js` and `tests/help-buttons.test.js`.
- Copy: `src/views/helpCopy.js` (new, in `sw.js` ASSETS), plain data `HELP[key] = { name, text }`, 15 entries (draft entries 2 to 16; entry 1 skipped, no text). Entry 5 and 16 use the owner's rewrites (task brief). Shown as text nodes in the action sheet message.
- Button: `helpButton(key)` in `src/ui/controls.js`; `button.help`, `aria-label` "Help: <name>", 44 x 44 (styles.css `.help`, icon 22 px), tap opens `openActionSheet([], { message: text, cancel: 'Close' })`: the existing sheet, its motion tokens, no new CSS for the sheet. `.hlp-row`, `.hlp-c`, `.ch-bw` (styles.css) only place the button.
- Plumbing: `sectionHeading(text, help)`, `question(n, [label, help], ...)` and `pushedHeader({ ..., help })` in `src/ui/chrome.js` take an optional help key; without it their output is unchanged. Challenge `secHead` and Night `section` accept `[title, help]`.
- Placements (button, view): Top G win, Bottom G's move, Slipped without knowing = Night section headings; 04:00 auto-Redo = Night header (takes the 44 px spacer) and Today's Close yesterday card (beside the button); Check-in gating = Morning header; Red line at risk today? = Morning Q2; MED = Morning Q3; Forced full pass = beside the first `No MED today.` line; Streak = beside the pill (only when the pill shows, streak >= 1); Redo band = end of the legend row; Protocol = Challenge `Protocols` heading; Graduation = beside `YOU FINISHED`; Begin Day 1 = beside the button on Day 0; Contract, Funeral, Code, Week 1 red lines = `Day 1, your oath` heading on Day 0; Recovery: non-blocking = `File within 24 hours` row.
- New icon (inline SVG, 24 box, 2 px round stroke like the control icons; not in assets/icons): `help` in `src/icons.js`, a circle with a question mark.
- Choices / deviations: (1) Entry 5 had no stated "?" spot; I used the `Day 1, your oath` heading on Day 0, the heading over the four entries. (2) Forced full pass: one "?" per screen (first `No MED today.` line), not one per protocol row. (3) Entry 9 is on both the Night header and the Today card, as the draft says; the Today card is outside the Challenge tab. (4) The button inside a header, heading or question row is a sibling of the h2 / label, never inside it. (5) Begin Day 1 narrowed by 52 px to fit the "?" beside it.
- Checked in the browser pane at 440 x 956 (Day 0): both Day 0 buttons 44 x 44, no horizontal overflow, sheet opens with the text and Close. Not run: the other screens in the pane (covered by the fake-DOM tests only), iPhone, Reduce Motion.
- Next: ⛔ owner iPhone check, ruling on the choices above, then the next help scope.

## H1b: owner ruling, branch `help`

- Commit: `docs(H1b): owner ruling` (this entry; hash in `git log`). Not pushed. Docs only: `src`, tests, styles and VERSION untouched, tests not re-run (1231 pass, 0 fail at H1b).
- Owner ruling: H1b deviations 1 to 4 stand. (1) Oath "?" sits on the `Day 1, your oath` heading (Day 0). (2) One forced-full-pass "?" per screen (first `No MED today.` line). (3) Entry 9 (04:00 auto-Redo) also sits on Today's Close yesterday card. (4) Begin Day 1 is 52 px narrower beside its "?", pending the phone check.
- Still open: ⛔ owner iPhone check of H1b (not run), including the Begin Day 1 width.
- Next: owner picks the next help scope (Today, Tasks, Analytics, Settings or Gym, from `help-inventory.md`); then its copy draft.

## H1a-S: Settings help copy draft (text only), branch `help`

- Commit: `docs(H1a-S): settings help copy draft` (this entry and `docs/superpowers/plans/help-copy-settings-draft.md`; hash in `git log`). Not pushed. No code, no tests.
- Precheck: branch `help`, HEAD `ab090d9`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1231 pass, 0 fail (exit 0). After: not re-run (docs only).
- Sources read: `help-inventory.md` (Settings rows), PLAN Rules, Global Constraints, Tasks 1, 3, 6, 15, 19, DESIGN-SPEC §7, CLAUDE.md Platform facts, `v2.1-gym-plan.md` Rules, `PROGRESS-GYM.md` (rulings 3, 17, 18, G6, G13), HANDOFF.md, the Forge BUILD-PLAN §5 (outside the repo, cited by section only, nothing copied), and `src/views/settings*.js` for what is on screen.
- Result: 11 entries: Zero Day threshold, MED per week, Day 1 date, Challenge pack, MED version (protocol sheet), Delete protocol / red line, Weekly gym target, Data (Home Screen storage, Export is the only backup), Export backup, Import backup, and one UNCLEAR entry (what a protocol or red line contains, what MED stands for; no text). Each text is at most 2 short sentences. No personal data, no course content.
- Choices: Reminders and the Last backup line are left out (inventory: already explained on screen). The Home Screen storage and "Export is the only backup" facts sit on the `Data` heading, not repeated on Export. Code-only behaviour (future-date refusal, "changes only after the file is shared") is marked as code in the draft.
- Needs ruling: (1) MED per week: BP "2 MED days per week, TOTAL" vs PLAN slots; draft follows PLAN. (2) The protocol sheet hint says "once" and omits the weekly slot. (3) Entry 6 repeats a sentence the delete confirm sheet already shows. (4) UNCLEAR: what a protocol or red line contains, what MED stands for.
- Next: owner rules on the list; then H1b-S (build the Settings "?" buttons).

## H1c: terms copy draft (text only), branch `help`

- Commit: `docs(H1c): terms help copy draft` (this entry and `docs/superpowers/plans/help-terms-draft.md`; hash in `git log`). Not pushed. No code, no tests.
- Precheck: branch `help`, HEAD `0f272ef`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1231 pass, 0 fail (exit 0). After: not re-run (docs only).
- Sources read (The Forge is outside the repo, cited by file and section; nothing copied beyond short paraphrase): `supabase/migrations/20260908000000_seed_default_missions.sql` (Day 1 mission Steps 1 to 5, MED version lines of Days 5, 6, 8, 12), `20260907000000_seed_bottom_g_tactics.sql` header, `CLAUDE.md` (Important decisions, Postgres RPC functions), `BUILD-PLAN.md` §1, §4, §5, §9, §11, the v2 plan Rules and Tasks 5, 16.
- Not found: `src/data/missions.json` and `src/data/tactics.json` do not exist in the repo (by rule the pack is imported at runtime, never committed). The only pack files on disk are git-ignored placeholder fixtures in `scratch/`.
- Result: 8 entries (Contract, Funeral, Code, Week 1 red lines: one plain sentence each; MED; Protocol; Top G; Bottom G), each with where it appears, paraphrased text (max 2 short sentences) and file + section source. MED expands to Minimum Effective Dose (The Forge only). No entry is UNCLEAR, but Protocol has no stated definition, only usage.
- Needs ruling: (1) Protocol: keep the usage paraphrase, reword or drop it. (2) The four oath entries are written by hand in the source mission; the app's are typed. (3) The source Day 1 also has a Legacy speech the app has no entry for. (4) Placement: one H1b sheet with four short lines, or one "?" per oath row. (5) MED entry overlaps Challenge entry 4. (6) Entries 7 and 8 paraphrase program content: confirm it is fine for the public repo.
- Next: owner rules on the list; then H1d (build the term "?" buttons, text and placement as ruled).

## H1d: term help copy, branch `help`

- Commits: `test(H1d): WIP red tests for term help` (c375904, 3 red), then `feat(H1d): term help` (this entry; hash in `git log`). Not pushed. `src/core`, VERSION and libraries untouched; no frozen test touched (only the two H1b help test files, listed below).
- Precheck: branch `help`, HEAD `ab10c32`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1231 pass, 0 fail (exit 0). After: 1232 pass, 0 fail (exit 0).
- Copy (`src/views/helpCopy.js`): entries 1, 3, 4 of `help-terms-draft.md` as written (Contract, Code, Week 1 red lines); Funeral, MED, Protocol, Top G, Bottom G with the owner's overrides. The combined `oath` entry is gone, replaced by `contract`, `funeral`, `code`, `redLines1` (names Contract, Funeral, Code, Week 1 red lines). The `med` text (Morning Q3 only) replaces the Challenge entry 4 text; `protocol`, `topWin` and `bottomMove` texts are replaced, so the H1b sentences "Tactics come from the pack..." and "does not change the day's result" are gone.
- Build: `Day 1, your oath` heading lost its "?". Each oath row is now `div.ch-or` holding the `a.st.ch-row` link (id `ch-oath-<key>` unchanged) and its "?" beside it (a button inside the link would be invalid). CSS in `styles.css`: `.ch-or` rows carry the separator the `.st` rows had, `.ch-or .st` flex 1. No new icon.
- Checked in the browser pane at 440 x 956 (Day 0): four row buttons 44 x 44, rows unchanged at 348 x 70, no horizontal overflow, the Funeral sheet shows the override text with Close. Not run: iPhone, Reduce Motion.
- Next: ⛔ owner iPhone check of H1b and H1d, then the next help scope.

## H1e: Challenge help gap audit and copy draft (text only), branch `help`

- Commit: `docs(H1e): help gap audit and copy draft` (this entry and `docs/superpowers/plans/help-gap-draft.md`, 101 lines; hash in `git log`). Not pushed. No code, no tests.
- Precheck: branch `help`, HEAD `5aaa917`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1232 pass, 0 fail (exit 0). After: not re-run (docs only).
- Audit: 30 rows across Day 0, Settings add rows, Challenge, Morning, Afternoon, Night, Recovery, War Log, Mission detail, Declared Redo sheet, graduation and Today's Close yesterday card, each with "?" yes/no, explained on screen yes/no, and a gap number. No weekly review exists in the app (no route, no code, not in PLAN).
- Result: 14 gaps (G1 to G14). 13 have draft copy (max 2 short sentences, paraphrased, with file + section source): Protocols (Day 0 row, Settings heading), Red lines (Day 0 row, Settings and Challenge headings), Night Protocols, Night Red lines, Night Settle your tasks, Night Suggested result and Override, Declared Redo, Mission, Afternoon, Recovery Protocol, Recovery concrete change, War Log, 30-day strip. G9 (Morning `Today's #1 target`) is UNCLEAR, no text.
- Sources: PLAN Rules and Tasks 4 to 6, 13 to 17, 19; DESIGN-SPEC §5; Forge BUILD-PLAN §5, §6, §7 and the Day 1 mission seed (cited by section only); `src/views` for what is on screen.
- Needs ruling: (1) density: Night would go from 4 to 8 buttons; merge or drop some. (2) G8: BP says a badly done mission is redone within 24 h, PLAN does not; the text is silent on skipping. (3) G10: "does not change the result" for Afternoon is only implied, so not stated. (4) G1 and G2 supersede Settings draft entry 11 (UNCLEAR). (5) G7 and G14 state things the screen never shows (streak and next-day effects; the bronze ring).
- Next: owner rules on the list; then H1f (build the approved gap "?" buttons).

## H1f: Challenge gap help buttons, branch `help`

- Commits: `test(H1f): WIP red tests for Challenge gap help` (c68d35a, 13 red), then `feat(H1f): Challenge gap help` (this entry; hash in `git log`). Not pushed. `src/core`, VERSION and libraries untouched; no frozen test touched (only the two H1b help test files, listed in STATUS).
- Precheck: branch `help`, HEAD `ba9eacd`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1232 pass, 0 fail (exit 0). After: 1237 pass, 0 fail (exit 0).
- Copy (`src/views/helpCopy.js`): 14 new entries G1 to G14 of `help-gap-draft.md` as written, with the owner's overrides for G5 (Stalled counts for nothing and against nothing), G7 ("before the day closes") and G9 (text added, no longer UNCLEAR). 32 entries now.
- Placements, all existing spots, none missing: G1 Protocols = Day 0 `Protocols` row (beside the link) and Settings `Protocols` heading; G2 Red lines = Day 0 row, Settings heading, Challenge `Red lines` heading; G3 Night `Protocols` heading; G4 Night `Red lines` heading; G5 Night `Settle your tasks` heading (only with open tasks); G6 Night `Suggested result` eyebrow; G7 Challenge `Declared Redo` eyebrow; G8 Challenge `Today's mission` heading and Mission detail `Mission` eyebrow (loaded mission only); G9 Morning Q1; G10 Afternoon header; G11 Recovery header; G12 Recovery Q5; G13 War Log header; G14 Challenge hero plate, top right (`.ch-hr`). Day 0 rows reuse `.ch-or` from H1d. Settings draft entries 5 and 6 left out as ruled.
- Browser pane, seeded challenge (Day 2 after a Reset, one open task, a pack), 440 and 375 wide: Day 0 (7 buttons), Challenge (6), Morning (5), Afternoon (1, at 375), Night (8 with a task, 7 without), Recovery (3), War Log (1), Mission (1), Settings (2). Every button 44 x 44, none past the right edge, no element wider than the viewport, `scrollWidth` equal to the viewport. Not run: iPhone, Reduce Motion, Afternoon at 440 (same header as Morning), the Settings screen with a challenge running.
- Next: ⛔ owner iPhone check of H1b, H1d, H1f, then the next help scope.

## H-R: release v2.3.0 (help buttons), branch `help`

- Commit: `chore(release): v2.3.0 help buttons` (hash in `git log`). VERSION 2.2.0 to 2.3.0 in `sw.js` and `src/version.js` only. ROADMAP.md: Live v2.3.0, help scope for Settings, Today, Tasks, Gym, Analytics not started (the stale `Ready: v2.2.0 on motion` and `main = 193857d` lines removed; origin/main already held the motion work, 6956506).
- Precheck: branch `help`, HEAD `71cd900`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), origin/main is an ancestor (fast-forward), `npm test` 1237 pass, 0 fail (exit 0).
- Next: owner iPhone check (close and reopen the Home Screen app twice), then the next help scope.

## DR1: day review (read-only), branch `help`

- Commit: `feat(DR1): day review` (hash in `git log`). Not pushed. `src/core`, VERSION and frozen tests untouched; no new icon or library.
- Precheck: HEAD `9d35dd4`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1237 pass, 0 fail (exit 0). After: 1243 pass, 0 fail (exit 0).
- Build: `src/views/dayReviewLogic.js` `dayRecord(state, date)` (result, auto, declaredRedo, morning, afternoon, night, slipNote, autopsy `warLog['autopsy-DATE']`, unfiled recovery, done tasks via `tasksOn`); `src/views/dayReview.js` sheet (existing `openSheet`, scrollable body, shows only existing fields, empty day `Nothing logged.`, note `Task names show today's titles.` under the task list). `challenge.js`: past and today strip cells are `button.dy-btn` with label `Day N, <state>, <weekday d Mon>`; future cells stay inert `div`s. Analytics strip unchanged. sw.js caches the two files. CSS in `screens.css` (`.dy-btn`, `.dr-*`).
- Choices: `openSheet` always has Cancel + an action button; the action is `Close`, the Cancel button is hidden (visibility, kept for the grid layout), so one visible close control; Esc and swipe still dismiss. The 10-column strip is about 36 pt wide per cell, so the button is the column wide and 44 tall (margin -7 px keeps the strip height; neighbouring rows' hit areas overlap by 9 px). Day notes `day-N` not shown (not asked).
- Tests: `tests/day-review.test.js` (6: empty, no challenge, full, missing fields, open task + unfiled recovery, sw + wiring). Not run: browser pane, iPhone.
- Next: owner iPhone check of the strip taps and the sheet.

## DR1 + DR2: day review and release v2.4.0, branch `help`

- DR1: commit `ea00afb` (entry above). Ruling (Armin, option A): strip tap target ~36 x 44 with 9 px row overlap accepted.
- DR2 commit: `release: v2.4.0 day review` (hash in `git log`). VERSION 2.3.0 to 2.4.0 in `sw.js` and `src/version.js` only; ROADMAP.md Live line is v2.4.0.
- Precheck: HEAD `ea00afb`, origin/main is an ancestor (fast-forward), `npm test` 1243 pass, 0 fail (exit 0). After the bump: 1243 pass, 0 fail (exit 0).
- Push: `git push origin help:main` (ff-only), then `git -C C:/Users/Armin/PM-App merge --ff-only origin/main`.
- Next: owner closes and reopens the Home Screen app twice, then checks day review on the iPhone.

## DR2b: remove "1 of 30" counter from Today, branch `help`

- Commit: `fix(DR2b): remove 1 of 30 counter from Today` (hash in `git log`). Not pushed. No VERSION bump. `src/core` untouched.
- Change: `src/views/today.js` drops `medallion()` and its call in the header; the header now holds only the date eyebrow and title (`.tk-hd>div:first-child` is `flex:1`, so it spans the row, no gap). Rest element and everything else on Today unchanged.
- Ruling (Armin, option A): `.td-med` CSS in `screens.css` stays as dead code because frozen `tests/contrast-today.test.js` ("day medallion") asserts those rules. Test not edited.
- Precheck: HEAD `d0f32ae`, tracked tree clean. Browser pane at 440x956 (fresh state, no running challenge): header is one child spanning 20 to 420 px, no `.td-med` in the DOM, scrollWidth 440 = viewport. Not run: seeded active challenge, iPhone.
- Next: owner iPhone check of the Today header, then the next scope.

## DR2c: release v2.4.1 (Today counter removed), branch `help`

- Commit: `release: v2.4.1 today counter removed` (hash in `git log`). VERSION 2.4.0 to 2.4.1 in `sw.js` and `src/version.js` only; ROADMAP.md Live line is v2.4.1. No other changes.
- Precheck: HEAD `827ac3a`, origin/main is an ancestor (fast-forward), `npm test` 1243 pass, 0 fail (exit 0). After the bump: 1243 pass, 0 fail (exit 0).
- Push: `git push origin help:main` (ff-only), then `git -C C:/Users/Armin/PM-App merge --ff-only origin/main`.
- Next: owner closes and reopens the Home Screen app twice, then checks the Today header.

## DR3: day review self-test with simulated data, branch `help`

- Commit: `test(DR3): day review simulated data` (hash in `git log`). Not pushed. No `src/` change, no VERSION bump, no frozen test edited. Only `tests/day-review-sim.test.js` added (browser script and seed not kept).
- Precheck: HEAD `9852f08`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1243 pass, 0 fail (exit 0). After: 1250 pass, 0 fail (exit 0).
- Node test (7): fake 30-day state in the real shape (passes `validateState`), start 2026-10-01, today day 12. Strip kinds via `stripCells`: passed, reset, redo, open, today, future. `dayRecord` + `reviewBody` asserted for: full day (morning, afternoon, night, slip note, autopsy, filed recovery, done task), partial day, reset with unfiled recovery, redo with no night, open day with data (open task not listed), open empty day (`Nothing logged.`), today, future days 13/20/30 (empty, no tasks).
- Browser run (built-in browser pane, 440x956, `npx serve -l 5173`, seed in the pane's own localStorage, which was empty before; cleared after; server stopped): Day 1, 3, 5, 6, 7, 8, 9, 2, 12 each opened the right sheet with the right fields. Today with nothing logged shows `Nothing logged.`. Future cells 13, 23, 30 do nothing. Close button and Esc close the sheet. At 440x480 the sheet body scrolls (scrollTop 0 to 371, last footnote visible, page behind did not move). Hit-test sweep, 30 cells x 5 points each in the circle (150 points): every point resolves to its own button, none to a neighbour; real taps on days 7, 8, 9 and on 2 then 12 (same column, rows 1 and 2) opened the matching day.
- Observations (not defects): (1) the app settles past open days to Redo / `no-night` on load (core), so in the running app a past "open" cell becomes a redo cell and the seeded days 5 and 6 showed `Result Redo, No night check-in`; `Nothing logged.` is reachable on today before anything is logged (tested), not on a settled past day. The open kind is covered in the node test only. (2) In this pane the sheet sits off-screen for about 1 s before it slides in, so a Close tap at 1 s was missed twice; with 2 s waits Close worked every time. Looks like pane timing, not the sheet (`close` is synchronous); not checked on the iPhone. (3) Console: only `Failed to register a ServiceWorker` on each load in the pane (sw.js itself returns 200); no app errors. Not run: real wheel scroll, iPhone.
- Next: owner iPhone check of day review (strip taps, sheet scroll, Close).

## H1b-S: Settings help buttons, branch `help`

- Commit: `feat(H1b-S): settings help buttons` (hash in `git log`). Not pushed. No VERSION bump. `src/core`, frozen tests and libraries untouched; no new icon or component (`helpButton`, `.hlp-row`, `.ch-or`).
- Precheck: HEAD `4e2abfc`, tracked tree clean (untracked `HANDOFF-TEMPLATE.md` and `docs/STATUS.md` left alone), `npm test` 1250 pass, 0 fail (exit 0). After: 1257 pass, 0 fail (exit 0).
- Copy: 9 entries in `helpCopy.js`, generated from `help-copy-settings-draft.md` entries 1 to 9 (name and text word for word; keys `zeroDay`, `medPerWeek`, `startDate`, `packImport`, `medVersion`, `deleteItem`, `gymTarget`, `exportBackup`, `importBackup`). 41 entries now.
- Placements: Day 1 date, Zero Day threshold, MED per week, Challenge pack and Weekly gym target = the row, between label and control. Export / Import backup are whole-row buttons, so the "?" sits beside them in a `.ch-or` wrapper (as Day 0 rows; one CSS line `.ch-or .sr` in `styles.css`). `MED version` = beside the sheet field name (a `<label for>` + "?" row, since a button inside the `<label>` would take the input's place; the field gets an id only then). `Delete` = beside the Delete protocol / Delete red line button, edit sheets only (`.set-dr`, one line in `settings.css`).
- Tests: new `tests/help-settings.test.js` (7: text parsed from the draft file, Settings page set, row placements, no button-in-button, both sheets, tap opens text + Close). Two existing help tests had to change because they assert an exact set that this task enlarges: `help-copy.test.js` (exactly 32 entries, now 41) and `help-buttons.test.js` (Settings labels, now 9). No assertion weakened.
- Browser pane, 375 and 440 wide, no challenge and a started challenge (Day 1 date editable): 9 buttons, all 44 x 44, none past the right edge, `scrollWidth` equals the viewport. Protocol edit sheet: MED version and Delete buttons open their text and Close, the edit sheet stays open. Row heights grow (Zero Day threshold 113 px at 375 as its label wraps). Not run: iPhone, Reduce Motion, red line sheet in the browser (node test only).
- Next: owner iPhone check of Settings, then the release task.

## H1c-S: release v2.5.0 (Settings help buttons), branch `help`

- Commit: `release: v2.5.0 settings help` (hash in `git log`). VERSION 2.4.1 to 2.5.0 in `sw.js` and `src/version.js` only; ROADMAP.md Live line is v2.5.0. No other changes.
- Precheck: HEAD `e469419`, origin/main is an ancestor (fast-forward), `npm test` 1257 pass, 0 fail (exit 0). After the bump: 1257 pass, 0 fail.
- Already logged above, unchanged: DR3 (`tests/day-review-sim.test.js`, simulated data) and the dead `.td-med` CSS in `screens.css`, kept because frozen `tests/contrast-today.test.js` asserts those rules.
- Push: `git push origin help:main` (ff-only), then `git -C C:/Users/Armin/PM-App merge --ff-only origin/main`.
- Next: owner closes and reopens the Home Screen app twice, then checks the Settings help buttons on the iPhone.

## T21-2: Task 21 step 2, new tests only, branch `help`

- Commit: `test(T21-2): backlog test gaps` (hash in `git log`). Not pushed. No `src/` change (two temporary mutations of `src/views/recovery.js` and `src/app.js` to prove the new guard tests fail without the guard, both restored with `git checkout`), no frozen test edited, no VERSION bump.
- Precheck: HEAD `a26c3fb`, `npm test` 1257 pass, 0 fail (exit 0). After: 1289 tests, 1288 pass, 0 fail, 1 skipped (exit 0).
- New files (all `tests/`): `tasks-ties.test.js` (T2-3), `recovery-keywords.test.js` (T5-1, reads the KEYWORD regex from the source and pins it to the 15 plan words), `pack-guards.test.js` (T6-1), `stats-gaps.test.js` (T7-1), `contrast-shield-glow.test.js` (T10-4), `app-render-guard.test.js` (T14-2, `render()` is cut out of `src/app.js` and run with stubs), `checkin-night-gate.test.js` (T16-3, in-place Close gating), `archetypes-drift.test.js` (T16-6, reads `src/core/pack.js` source, no core export), `recovery-view-guards.test.js` (T17-2, the double tap is proved to be stopped by the view guard: no re-render event on the second tap; already-filed reached through the view).
- Finding, skipped test: T10-4 stalled shield. With the drop-shadow modelled (peak 0.43 of alpha .14 under a 1.7 px stroke) the stalled outline is 2.83:1 on `--plate-top` (3.12 without the glow); open and failed stay above 3. It is an estimate; the skip reason points at the iPhone look. CSS, not core.
- S3a tap-target sweep (browser pane 440x956, seeded Day 2 after a Reset, 20 routes plus Day 0 and the Add task sheet, selector `.btn, .chip, .tab, button`): only offenders are the Challenge day-strip cells `.dy-btn` (33.5 x 44, the known and accepted Day review cells). Not reached: Afternoon (redirects when not due), Workout and Routine (redirect without data), other sheets. Script, seed and server not kept.
- Next: step 3, S1 whole-branch code review.

## T21-3: Task 21 step 3, S1 whole-branch code review, branch `help`

- Commit: `docs(T21-3): code review findings` (hash in `git log`). Not pushed. No `src/` change, no test change, no VERSION bump, no fix commits (no Critical or High found).
- Precheck: HEAD `a4e9037`, `npm test` 1289 tests, 1288 pass, 0 fail, 1 skipped (exit 0). No test run after: only `docs/` changed.
- Scope: `mattpocock-skills:code-review`, fixed point `bba5b0a` (Task 1 base, the parent of the first v2 code commit `cc51aa7`) to HEAD: 235 files, about 5000 `src/` lines. Standards axis: CLAUDE.md plus the Fowler smell baseline. Spec axis: v2 plan, DESIGN-SPEC, gym plan and PROGRESS-GYM rulings, ROADMAP, help drafts. Two read-only subagents; I re-checked their line numbers against HEAD and ran the mechanical CLAUDE.md greps myself (forbidden date APIs, leading-slash paths, `prefers-color-scheme`, forbidden features, file sizes, `sw.js` ASSETS against disk and `src/`, VERSION match): only `screens.css` (318 lines) hit.
- Result: 0 Critical, 0 High, 4 Medium, 15 Low (S1-01 to S1-19 in `docs/backlog.md`, one row each). The review's "no `innerHTML`, guarded `JSON.parse`, DST-safe settle, gym PR/volume/e1RM, import order" checks came back clean.
- Needs ruling: S1-01 (`src/core/tasks.js:34`, archived habits vanish from past days; frozen `tests/tasks.test.js:39` pins it). S1-03 (shield pop/rip over the 450 ms motion cap) was already an open owner decision in ROADMAP.
- Added to backlog under the 14-day trial notes: T10-4 stalled shield outline ~2.83:1 with glow (estimate), iPhone look first.
- Ambiguity and choice: "first v2 commit" taken as the Task 1 base `bba5b0a`, so the Task 1 code commit is inside the range; Task 0 (design import and docs) is outside it.
- Next: Task 21 step 4 (Day 1 read-only text row), after the owner rules on S1-01.

## T21-3: review rulings, branch `help`

- Commit: `docs(T21-3): review rulings` (hash in `git log`). Docs only, not pushed; no `src/`, test or VERSION change, so no test run (last precheck 1289 tests, 1288 pass, 0 fail, 1 skipped, exit 0).
- Rulings from Armin (2026-10-24), recorded beside the rows in `docs/backlog.md`: S1-01 keep as is (archived tasks stay never due; known limit, a fix needs an `archivedOn` field, core + frozen test, not planned): CLOSED. S1-08 Day review owner-approved (read-only, option A): CLOSED. S1-03 stays open in ROADMAP.
- Next: Task 21 step 4 (Day 1 read-only text row).

## T21-4: Task 21 step 4a, Day 1 read-only row, branch `help`

- Commit: `feat(T21-4): day 1 read-only row` (hash in `git log`). Not pushed. No VERSION bump, no `src/core` change.
- Precheck: HEAD `951c7b2`, `npm test` 1289 tests, 1288 pass, 0 fail, 1 skipped (exit 0). After: 1289 tests (3 new, 3 deleted), 1288 pass, 0 fail, 1 skipped (exit 0).
- Stop first, then ruling: removing the input broke 4 frozen tests in `tests/settings-view.test.js`. Armin ruled 2026-10-24: delete the three input/refusal tests (orphan refusal, ended-day refusal, min/max), rewrite the fourth as "Day 1 is a plain text row, no input, once started", update the header comment. No other frozen test edited. The "Settings is the only place to set Day 1" stop did not apply: before Begin Day 1 the row already read "Starts when you begin".
- Settings: `startRow` is now one read-only `.sr` row (label, "?", text: long date, or "Starts when you begin"). No chevron, no tap. Removed the input, `onChange`, min/max, the `'start'` refusal key and its alert plate, the `addDays` import and the `.set-date` CSS rule.
- `setStartDate` and `startEditable` (settingsLogic.js): `tests/settingsLogic.test.js` imports both, so they stay as dead code in `src/` (not called by any view now).
- Help entry 3: text is now "The day your 30 days count from." in `help-copy-settings-draft.md` and `helpCopy.js`. The help tests read the draft file, so no help test needed an edit.
- T19-3: failing-first `tests/settings-delete-unknown.test.js` (2 red, 1 green), then `drop` in `settingsLogic.js` returns the same state for an unknown id, so `app.set` skips the save.
- Backlog: T19-1, T19-3, T19-4 closed in `docs/backlog.md`.
- Browser pane 440x956, seeded started challenge: row reads "Saturday 24 October" on one line, 0 inputs or buttons besides "?" (44 x 44), `scrollWidth` 440. Not run: iPhone, 375 width. Seed cleared afterwards.
- Side effect (ruled): after Begin Day 1 the date cannot be moved back one day.
- Next: Task 21 step 5 per the plan.

## T21-R: release v2.5.1 (Day 1 read-only row), branch `help`

- Commit: `release: v2.5.1 day 1 row` (hash in `git log`). Release rule applied: VERSION 2.5.0 to 2.5.1 in `sw.js` and `src/version.js` (match); ROADMAP "Live" line now v2.5.1. No other change.
- Commands: `npm test` after bump: 1289 tests, 1288 pass, 0 fail, 1 skipped (exit 0). Precheck is the same run (no code change since T21-4, last run 1288 pass).
- Push: `git push origin help:main` (ff-only), then `git -C C:/Users/Armin/PM-App merge --ff-only origin/main`; results in STATUS.md.
- Ambiguity and choice: none.
- Next: owner iPhone check (close and reopen the Home Screen app twice), then Task 21 step 5.

## T21-5a: Task 21 step 4b-1, accessibility group, branch `help`

- Commits (not pushed, no VERSION bump, no `src/core` change, no frozen test edited): `fix(T10-1)`, `fix(T10-2)`, `fix(T10-5)`, `fix(T16-1)`, `fix(T9-1)`, `fix(T11-1)`, `test(S3c)`, then `docs(T21-5a)`; hashes in `git log`.
- Precheck: HEAD `82d854c`, `npm test` 1289 tests, 1288 pass, 0 fail, 1 skipped (exit 0). After: 1312 tests (23 new, in 8 new `tests/a11y-*.test.js` files), 1311 pass, 0 fail, 1 skipped (exit 0). Each fix had its test red first (the S3c proof was green at once: no code change needed).
- T10-1: `shieldToggle` takes an `id`; open / failed / stalled get a hidden span `${id}-st` named by `aria-describedby`. Done keeps `aria-pressed=true` only.
- T10-2 (+ T11 m5): the existing mechanism is app.js `render()` restoring focus by id. Added ids: shield `sh-<task id>`, ⋯ `mo-<task id>`, chip / segmented buttons `${id}-${n}` (Night, Recovery, Afternoon, Analytics range), help "?" `help-<key>`. No new restore code.
- T10-5: `chips` / `segmented` take `label` (group aria-label); a source-scan test fails if a call site in `src/views` has none (Gym and the task sheet name theirs with setAttribute).
- T16-1: `sectionHeading(text, help, id)`; the Top G win and Slipped textareas use `aria-labelledby` the heading and `aria-describedby` their helper label (`for=` kept).
- T9-1: `src/focus.js` (added to sw.js ASSETS). A `hashchange` with a new `location.hash` focuses the screen's h1 (`tabindex=-1`, ring hidden by one rule in styles.css); the same hash (re-render request) does not. It is a separate listener, not inside `render()`: the frozen `tests/app-render-guard.test.js` cuts `render()` out and runs it with a fixed set of stubs, so a new identifier there breaks it.
- T11-1: `src/ui/live.js` (in sw.js ASSETS): one `role=alert` region in `<body>`, `.live` visually hidden in styles.css. Morning uses it; its drawn error has no role. SKIPPED Night and Recovery: frozen `tests/checkin-night-flow.test.js:198` and `tests/recovery-view.test.js:205` find a `role=alert` node in the render. Not changed.
- S3c: `tests/a11y-sheet-focus.test.js` proves refocus for the action sheet (Cancel, item, Close) and bottom sheet (Cancel, action), also when a re-render replaced the opener.
- Browser pane (http://localhost:5190, static server, then stopped): route change, Back and 10 routes put focus on the h1 (no outline); a seeded task showed the shield description "Open", focus back on the shield after a tap and on ⋯ after the sheet closed. Seed cleared. `gym/workout` with no workout has no h1 (focus stays on body). Not run: iPhone, VoiceOver.
- Ambiguities and choices: heading-focus lives outside `render()` (above). The live-region helper tolerates a DOM with no `body` or `replaceChildren` (older view test fakes), as `motion.js` does for clone. Help ids assume one "?" per key per screen.
- Next: owner rulings on Night / Recovery (T11-1), VoiceOver checks, then Task 21 step 4b-2 (CSS / markup group).

## T21-5a addendum: T11-1 Night and Recovery, ruled by Armin 2026-10-24

- Ruling: keep `role=alert` only on the first display after a refusal (as Settings does); frozen tests stay unchanged.
- `formError(d, text)` in `src/ui/chrome.js`: role=alert on the first display, none on later renders of the same refusal; a new refusal resets `d.errorShown`. Night and Recovery use it. Morning keeps the persistent region.
- New `tests/a11y-error-first-display.test.js` (helper + Recovery wiring; red first). `npm test`: 1314 tests, 1313 pass, 0 fail, 1 skipped (exit 0). `checkin-night-flow.test.js:198` and `recovery-view.test.js:205` pass unedited. Night wiring is covered by the helper test and that frozen test only.
- Not pushed. Next: step 4b-2.

## T21-5b: Task 21 step 4b-2, CSS and markup group, branch `help`

- Commits (not pushed, no VERSION bump, no `src/core` change, no existing test edited): `fix(T16-4)`, `fix(T16-5)`, `fix(T17-3)`, `refactor(T12-1)`, `fix(T12-2)`, `fix(T14-3)`, `fix(T18-1)`, `fix(T18-4)`, `test(T10-3)`, then `docs(T21-5b)`; hashes in `git log`.
- Precheck: HEAD `564b816`, `npm test` 1314 tests, 1313 pass, 0 fail, 1 skipped (exit 0). After: 1329 tests (15 new, in 9 new files), 1328 pass, 0 fail, 1 skipped (exit 0). Each fix had its test red first, except `tests/icons-id-refs.test.js` (T10-3 verification, green at once).
- T16-4: `choices` in `controls.js` adds an option's `cls`; Night gives `opt-stalled` / `opt-crossed`; `night.css` selects on those, no `:nth-child`.
- T16-5: every `.q` rule in `night.css` is `.nt-sec .q ...`.
- T17-3: `recovery.js` has `addClass` (appends to `className`); no `classList`, because the frozen `tests/recovery-view.test.js` fake DOM has none.
- T12-1: `torch` was identical in `today.js` and `challenge.js`; both copies are gone, one `torch` and the `redraw` helper live in `icons.js`. Left (not copies): Challenge `redoGlyph`, Tasks `todayIcon`, which set different attributes.
- T12-2: `.ch-mp>.ch-acts:first-child{margin-top:0}` (the actions row lost its 16 px top margin when it is the plate's first child).
- T14-3: `.wl-hd+.sec{margin-top:24px}` under the War Log header; Mission title is an h2 (`screenTitle(text, tag)`), the pushed header is the one h1; editor placeholder "Start writing." with `::placeholder` in `--text-3`; autopsy title shown as a long date in the entry header and the list row (view only: frozen `tests/warlogLogic.test.js:145` pins the ISO title in `entryView`). Row chevrons skipped as asked.
- T18-1: Reset bar gets `an-reset`: a bronze-lt hatch background, and `.an-reset .an-miss` goes transparent, so only the missed-protocols segment shows the hatch. The `.an-miss` crimson rule stays first (contrast test reads it).
- T18-3: no change. None of bar 8, column 96, tile 32, 88 px, 16 px has an exact token (tokens: `--r-plate` 24, `--r-pill`, `--gutter` 20).
- T18-4: the legend "Not due" dot uses the Partly radius (0.24, was 0.08); the grid keeps 0.08 (pinned by `tests/analytics-view.test.js`).
- T10-3: verified, no shipped icon uses href, clip-path, mask, filter, `<use>` or url(#) in style; `tests/icons-id-refs.test.js` guards it.
- Ambiguities and choices: T18-4 "same size as the other legend marks" (they differ): chose the Partly radius, needs a ruling. T14-3 editor prompt copy "Start writing." is mine. `screens.css` is 321 lines (was 318, over the 300 target before this task).
- Not run: browser pane, iPhone.
- Next: owner phone check, then Task 21 step 4b-3 / step 5 per the plan.
- Ruling (Armin, 2026-10-24): T18-4 keep the Partly size for the "Not due" legend dot. No code change.

## T21-6: Task 21 step 5a, visual pass, branch `help`

- Commits (not pushed, no VERSION bump, no `src/core` change, no frozen test edited): `fix(T21-6)` Settings title, `fix(T21-6)` Recovery fields, then `docs(T21-6)`; hashes in `git log`.
- Precheck: HEAD `8eb06db`, `npm test` 1329 tests, 1328 pass, 0 fail, 1 skipped (exit 0). After: 1332 tests (3 new), 1331 pass, 0 fail, 1 skipped (exit 0).
- Method: browser pane, static server on :5173, seeded Day 9 state (invented data, cleared afterwards). The PNGs are tall boards, not 844 high, so I measured the same classes in `static/*.html` (the PNGs' source) at 390 and in the app at 390 and 440, and looked at screenshots of Today, Challenge, Day 0, Recovery. 13 routes at both widths: no horizontal overflow, no clipped text.
- Fixed: Settings had an extra "Lock In" eyebrow, title at y 78, board 60 (new test `visual-settings-header`). Recovery time field was 350 wide, board 140; long answers min 84 high, board 84, was 76 (CSS in `recovery.css`; `visual-recovery-fields` reads the CSS, written after the fix, not red first).
- Logged V-01 to V-12 in `docs/backlog.md` (T21-6 section). Biggest: Challenge @390 plate 56 px lower (pill and "?" wrap), Recovery countdown plate 52 px taller, Analytics geometry (padding 22 vs 18, tiles 3 across), Day 0 hero, 30-day buttons 29 wide.
- Rulings (Armin 2026-10-24): V-01 leave the wrap at 390; V-07 leave the 30-day buttons (29 wide at 390, 33.5 at 440).
- Not run: iPhone; Day 0 and Recovery compared on structure only; Today "Up next" hero, Morning, Afternoon, War Log, Mission, Night "Stalled / crossed" colours, entry editor placeholder, Analytics Reset hatch were not measured against a board (no board exists for War Log, Mission, hatch, editor; Night and Today colours seen only in code, not on screen).
- Next: owner phone check, then Task 21 step 5b.
