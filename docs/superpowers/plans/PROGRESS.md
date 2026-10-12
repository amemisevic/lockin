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
- Next: Task 8.
