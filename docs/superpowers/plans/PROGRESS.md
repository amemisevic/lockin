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
