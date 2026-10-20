# PROGRESS-GYM

Progress log for the Gym tab (v2.1). Plan: `v2.1-gym-plan.md`. Draft task breakdown: `gym-plan-draft.md`. Branch `gym`, cut from `v2` at `04622a3`. This is the only progress file for the Gym work; `PROGRESS.md` stays the v2 log.

## Decisions (owner rulings, G0)
1. Exercise data lives at `src/data/exercises.json`.
2. App state is `app.gym` / `app.setGym`. Release is 2.1.0. One progress file: `PROGRESS-GYM.md`.
3. G6 strips `gym` from the backup before `app.set`. Importing a backup without `gym` keeps the existing gym data.
4. Active tab icon = CSS `fill-opacity`, no new art.
5. A PR marker is allowed as plain text "PR", no badge or celebration. One per exercise per workout, on its best set.
6. A 1 s view-local timer is allowed (rest, elapsed). G9 also guards a focused INPUT from the 30 s re-render.
7. Editing a finished workout may change its date. Removing its last working set is refused with `no-sets`.
8. G1: Code downloads free-exercise-db at a pinned commit and records the hash in `SOURCE.md`. Null/empty muscle or equipment becomes "other". The list loads on first Gym open.
9. G2: API shapes accepted as in the G2 STATUS (`validateGym`, `loadGym`, `saveGym`). Fixture fix `be748cb` kept.
10. A new set defaults to reps 1, weight 0 (the 1-999 rule stays). In an OPEN workout any set can be removed, even the last one. In a finished workout the last working set cannot be removed (ruling 7, `no-sets`). G3 must include `removeSet`.
11. `app.gym` / `app.setGym` wiring waits for G7.
12. G3: `removeExercise` is added. In an open workout any exercise can be removed. In a finished workout it is refused with `no-sets` if it would leave no done working set.
13. G3: Volume stays in G5.
14. G3: Prefill may use last time's undone sets (no `done` requirement).
15. G4: defaults accepted as in the G4 STATUS "Needs ruling" items 1-7. Routine name 1-60 after trim, duplicates allowed. Ids `r-<nowMs>`. A routine item with no sets is refused (`set-count`). Save-as-routine counts all non-warm-up sets, done or not, and drops warm-up-only exercises. `editRoutine` replaces the whole item list. `startRoutine` names the workout after the routine; `repeatLast` leaves the name empty. Refusal codes: `name-length`, `set-count`, `unknown-routine`, `unknown-workout`, `not-finished`, `no-history`.
16. G5: accepted as in the G5 STATUS "Needs ruling" items 1-5. (1) PR baseline = the whole first workout with a qualifying set; no markers come from it. (2) PR is per set. (3) Only finished workouts feed PRs and muscle sets. (4) Visits use the workout `date` field. (5) Defaults 12 weeks / 12 months; months with no visit are listed. Output shapes as in the G5 STATUS. Item 6 (1RM time series) answered by `e1rmSeries` in G5.
17. G6: accepted as in the G6 STATUS items 1-4. File = v2 state plus one top-level `gym` key; `exportJson(state, gym?)`; `validateImport` -> `{ok, state, gym?}` (no `gym` = file had no section, keep existing gym data); check order v1, v2, gym; one `lastBackup` stamp covers both. Item 5 is a G7 REQUIREMENT: the import wiring writes gym first and aborts on failure; if the v2 write then fails, it restores the previous gym text. The export wiring passes gym to `exportJson`. G7 needs a test for both paths.

## Entries

### G0 — plan, branch, rulings
- Branch `gym` from `v2` (`04622a3`). Docs only, no code, nothing pushed.
- Added `v2.1-gym-plan.md`, `gym-plan-draft.md`, this file; `CLAUDE.md` points to the plan and this file.
- Next: G1.

### G1 — exercise database and core
- Commits: `6fa255b` failing WIP `tests/exercises.test.js` (frozen, untouched since); G1 implementation commit follows it on `gym`.
- Added `scripts/build-exercises.mjs` (exports pure `trimDataset`, downloads only when run), `src/data/exercises.json` (876 exercises, 18 muscles, 12 equipment), `src/data/SOURCE.md`, `src/core/exercises.js` (68 lines). `sw.js` ASSETS: the core file, the JSON and `SOURCE.md` (sw.test.js requires every file under `src/`). VERSION untouched (release rule).
- Dataset: free-exercise-db commit `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`, file `dist/exercises.json`. Size: 113,287 B raw, 14,646 B gzip -9 (14,833 B at default gzip). Budget 200 KB: OK.
- Red: `node --test tests/exercises.test.js` failed on the missing modules. Green: 23 new tests pass; `npm test` 637 pass, 0 fail (614 + 23); exit 0.
- Reviewer subagent: 0 critical, 1 important, minors. Fixed: a custom entry without a string `name` made search and add throw (now read as ""); a repeated id in `recents` now keeps its first place. Both checked with a throwaway probe, because the test file is frozen (no frozen test covers them).
- API: `exerciseMap`, `searchExercises(data, gym, {query, muscle, equipment, recents})`, `recentIds(workouts)`, `addCustom`, `renameCustom`. Refusal = `{ok:false, reason}` with `name-length`, `name-taken`, `bad-muscle`, `bad-equipment`, `unknown-id`; success = `{ok:true, state, id?}`. No delete export.
- Choices (plan was silent): muscle key is `muscle`; "other" is always in both lists; custom results carry `category: 'other'`, `custom: true`; `recentIds` = newest workout first, last exercise of a workout first, distinct, max 10; custom id = highest `custom-N` + 1; sort is lowercase code-unit order, ties by id; name length counts UTF-16 units.
- Deferred minors (nothing in today's data triggers them): `Math.max(...)` over 200k custom entries; a `custom-N` id beyond 2^53; a custom id duplicating an earlier one hides it from the unique-name check (corrupt state only); non-ASCII names sort by code unit, not locale; the build does not hash the downloaded file, only pins the commit.
- Next: G2.

### G2 — gym state, validation, load/save
- Commits: `adff02b` failing WIP `tests/gym.test.js`; `be748cb` one-line fixture fix in that file (see below); G2 implementation commit follows on `gym`.
- Added `src/core/gym.js` (`emptyGym`, `validateGym`, `loadGym`, `saveGym`, `GYM_KEY`, `GYM_CORRUPT`; about 105 lines) and `tests/gym.test.js` (29 tests). `sw.js` ASSETS: `src/core/gym.js`. Not done (not in the G2 scope given): `app.gym` / `app.setGym` in `src/app.js`; it was in the draft's G2 line and is still due, now with the first UI task or a G2b.
- Red: `node --test tests/gym.test.js` failed with ERR_MODULE_NOT_FOUND. Green: 29 pass; `npm test` 666 pass, 0 fail (637 + 29); exit 0.
- Frozen-test deviation: after the WIP commit one test passed `undefined` to a fixture helper whose default parameter replaced it, so the `exerciseId: undefined` case was never tested. Fixed in `be748cb` by building that item literally (one line, no assertion weakened or removed). Revert that commit if you disagree.
- Reviewer subagent: 0 critical, 2 important, minors. Fixed: `saveGym` now re-validates the serialised text (a `toJSON` returning `undefined` or another shape used to be written as `{ok:true}`); `loadGym` treats `undefined` like `null` for "nothing stored". Both checked with a throwaway probe because the test file is frozen. Important #1 (empty set vs `reps >= 1`) is a plan question, see Needs ruling.
- API (plan silent, chosen): `validateGym(obj)` = `{ok:true}` or `{ok:false, reason}`; reasons `shape version settings collection id duplicate-id reps weight date finish-time no-sets open-workouts`. `loadGym(storage)` = `{state, corrupt}`; never throws; corrupt text is copied to `lockin.v2.gym.corrupt`, the gym key is left as it was. `saveGym(storage, state)` = `{ok:true}` or `{ok:false, reason}` (validate code, or `storage`); invalid state writes nothing. Unknown extra keys are accepted and kept.
- Needs ruling: (a) can a set row be saved with blank/0 reps? The plan says reps 1 to 999 always, but Prefill says "else one empty set". Proposed: an empty set is reps 1, weight 0. (b) the API shapes above.
- Deferred minors: a custom exercise with empty name/muscle/equipment passes validate (limits live in `addCustom`); negative `startedAt` accepted; routine items with `sets: []` accepted; custom ids need not look like `custom-N`; `date` is not tied to `startedAt` (ruling 7); years 0000-0099 rejected by the round-trip check; an unserialisable unknown key (BigInt, cycle) reports `storage`; unknown keys holding NaN/undefined are altered on save; a second corrupt load overwrites the first `.corrupt` copy (same as v2 store), and `corrupt: true` repeats every launch until the first successful save, so the UI must cope; test gaps: routine `createdAt` NaN/null/undefined, custom exercise with missing muscle/equipment, second-corrupt overwrite, `getItem` throwing then save, a spy on `removeItem`.
- Next: G3 (after the rulings above).

### Minor (owner-noted, G2)
- A second corrupt load overwrites the earlier `GYM_CORRUPT` copy.

### G3 — workouts core
- Commits: `a641b6d` docs (ruling 10 reworded); `0343efb` failing WIP `tests/workouts.test.js` (frozen, untouched since); G3 implementation commit follows on `gym`. `src/core/gym.js` not edited.
- Added `src/core/workouts.js` (94 lines) and `tests/workouts.test.js` (54 tests). `sw.js` ASSETS: `src/core/workouts.js`. VERSION untouched.
- Red: `node --test tests/workouts.test.js` failed with ERR_MODULE_NOT_FOUND (exit 1). Green: 54 pass; `npm test` 720 pass, 0 fail (666 + 54); exit 0. Forbidden-date-API grep on the new file: no hits.
- API (plan silent, chosen): success `{ok:true, state, id?}`, refusal `{ok:false, reason}`. Workouts by id, items and sets by integer index. Every change is re-checked with `validateGym`, so its codes pass through (`no-sets`, `reps`, `weight`, `date`, `shape`, `id`). Own codes: `workout-open`, `unknown-workout`, `bad-index`, `already-finished`, `not-open`, `not-finished`. Exports: `openWorkout`, `startWorkout(gym, nowMs, name?)`, `prefillSets(gym, exerciseId, templateItem?, excludeId?)`, `addExercise`, `addSet`, `removeSet`, `editSet(patch {reps, weight})`, `toggleDone`, `toggleWarmup`, `finishWorkout`, `discardWorkout` (open only), `deleteWorkout` (finished only), `editWorkout(patch {name, date})`.
- Choices: id = `w-<nowMs>` (`-2`, `-3` if taken); date = local date of `nowMs`; `finishWorkout` clamps `finishedAt` up to `startedAt`; Prefill counts a workout "containing" the exercise only if it has a working set of it, and does not require `done` on last time's sets; a finished workout's own sets never feed its own Prefill; removing the last set of an exercise in an open workout leaves the exercise with `sets: []` (valid).
- Not done (not in the G3 scope given): Volume (plan Tasks table puts it in G5; the draft's G3 test line also lists it); Save as routine and Repeat last (G4); `app.gym` / `app.setGym` (G7, ruling 11).
- Needs ruling: (a) there is no way to remove an exercise from a workout (not in the task list); with `removeSet` an empty card stays. Add `removeExercise`? (b) Volume in G3 or G5? (c) Prefill: should last time's sets count only if `done`?
- Next: G4.

### G3 addendum — removeExercise (ruling 12)
- Commits: `465a5c9` docs (rulings 12-14); `b1b9e1d` failing removeExercise tests (7, appended to `tests/workouts.test.js`, frozen); implementation commit follows. Earlier G3 commits unchanged and pushed (`3ff57a8`).
- Added `removeExercise(gym, id, ii)` to `src/core/workouts.js` (97 lines): drops the item at index `ii`. Open workout: any item. Finished workout: `validateGym` refuses with `no-sets` when no done working set is left. Own refusals: `bad-index`, `unknown-workout`.
- Red: 7 fail (`removeExercise` not a function), 54 pass. Green: `npm test` 727 pass, 0 fail (720 + 7); exit 0.
- Rulings 13 (Volume stays in G5) and 14 (Prefill may use last time's undone sets) need no code: the G3 behaviour already matches.

### G4 — routines core
- Commits: `e58789f` failing WIP `tests/routines.test.js` (33 tests, frozen, untouched since); G4 implementation commit follows on `gym`. `gym.js` and `workouts.js` not edited.
- Added `src/core/routines.js` (101 lines). `sw.js` ASSETS: `src/core/routines.js`. VERSION untouched.
- Red: `node --test tests/routines.test.js` failed with ERR_MODULE_NOT_FOUND. Green: 33 pass; `npm test` 760 pass, 0 fail (727 + 33); exit 0. `sw.test.js` 4 pass. Forbidden-date-API grep on the new file: no hits. `origin/gym` is an ancestor of HEAD.
- API (plan silent, chosen): success `{ok:true, state, id?}`, refusal `{ok:false, reason}`; every result re-checked with `validateGym`. Exports: `createRoutine(gym, nowMs, name, items=[])`, `saveRoutineFromWorkout(gym, workoutId, nowMs, name)`, `editRoutine(gym, id, patch {name, items})`, `deleteRoutine(gym, id)`, `startRoutine(gym, id, nowMs)`, `repeatLastWorkout(gym, nowMs)`. Own codes: `name-length`, `set-count`, `unknown-routine`, `unknown-workout`, `not-finished`, `no-history`; `workout-open` comes from `startWorkout`.
- Choices: name = string, 1-60 UTF-16 units after trim, stored trimmed, duplicates allowed; id `r-<nowMs>` (`-2`, `-3` if taken); routine items keep only `exerciseId` and `{reps, weight}`; an item with no sets is refused (`set-count`); save-as-routine counts all non-warm-up sets (done or not, as ruling 14) and leaves out an exercise that was only warm-ups; `editRoutine` replaces the whole item list (order, counts, add, remove in one patch); `startRoutine` names the workout after the routine, sets `routineId`; `repeatLastWorkout` leaves name empty and `routineId` null, ties on `startedAt` go to the later workout in the list, an exercise that was only warm-ups in the latest workout stays in with older values or one empty set.
- Needs ruling: see docs/STATUS.md (name rules, ids, set-count, undone sets in save, whole-list edit, workout name).
- Next: G5.

### G5 — gym stats core
- Commits: `7248a1a` failing WIP tests (`tests/gymstats.test.js` 28, `tests/gymstats-edge.test.js` 5, `tests/gymstats-tz.test.js` 3 runs; frozen, untouched since); G5 implementation commit follows on `gym`. `src/core/stats.js` (v2) not touched.
- Added `src/core/gymstats.js` (about 95 lines). `sw.js` ASSETS: `src/core/gymstats.js`. VERSION untouched. No `Date` use in the file; weeks come from `weekStart` / `addDays` in `src/logic.js`.
- Red: all three files failed with ERR_MODULE_NOT_FOUND (exit 1). Green: 36 pass; `npm test` 796 pass, 0 fail (760 + 36); exit 0. TZ runs: Europe/Sarajevo, America/Los_Angeles, Pacific/Auckland, 5 tests each. Forbidden-date-API grep on the new file: no hits. `origin/gym` is an ancestor of HEAD.
- API (plan silent, chosen): `visitDates(gym)`, `weekKeys(key)`, `visitsInWeek(gym, key)`, `weeklyVisits(gym, todayKey, weeks=12)` -> `[{start, visits}]` oldest first, `visitsInMonth(gym, 'YYYY-MM')`, `monthlyVisits(gym, todayKey, months=12)` -> `[{month, visits}]`, `workoutVolume(w)`, `volumeByExercise(w)` -> `[{exerciseId, volume}]`, `setsPerMuscle(data, gym, key)` -> `[{muscle, sets}]` (sets desc, then name), `est1RM(set)` (unrounded, `null` if not qualifying), `display1RM(x)`, `prMarkers(gym, exerciseId)` -> `[{workoutId, itemIndex, setIndex, date, startedAt, e1rm}]`.
- Choices: only finished workouts count everywhere (volume functions take any workout); a visit is the workout's `date`; PR baseline = the first workout with a qualifying set (none of its sets is marked), later sets are marked per set against the running best, including earlier sets of the same workout.
- Needs ruling: see docs/STATUS.md.
- Next: G6.

### G5 addendum — e1rmSeries (ruling 16)
- Commits: red WIP `tests/gymstats-series.test.js` (8 tests, frozen), then implementation. Frozen G5 tests not edited.
- Added `e1rmSeries(gym, exerciseId)` to `src/core/gymstats.js` (86 lines): `[{workoutId, date, startedAt, e1rm}]`, one point per finished workout with a qualifying set, `e1rm` = best qualifying set of that workout (unrounded, merged across items), oldest first by `startedAt`.
- Red: ImportError (no export `e1rmSeries`). Green: 8 pass; `npm test` 804 pass, 0 fail (796 + 8); exit 0. TZ runs Sarajevo, Los Angeles, Auckland: 8 pass each. Forbidden-date-API grep: no hits.
- Next: G6.

### G6 — backup export and import with gym data
- Commits: `a0475b8` failing WIP `tests/gym-backup.test.js` (13 tests, frozen, untouched since); G6 implementation commit follows on `gym`. No existing test edited. `app.js`, views and `sw.js` not touched (no new file under `src/`).
- Edited `src/core/store.js` only (+9/-2, now 51 lines): `exportJson(state, gym)` (gym optional), `validateImport` returns `{ok, state, gym?}`; imports `validateGym` from `gym.js`.
- Format (backward compatible): the v2 state object plus one extra top-level key `gym` holding the whole gym state (`lockin.v2.gym` content). A v2.0.0 file has no `gym` and imports as before; v2.0.0 ignores the key if it ever reads a new file.
- Import rules: `validateState` runs first, then, only if the file has an own `gym` key, `validateGym`. Any failure returns `{ok:false, error}` with no state and no gym. Gym error text: `The backup's gym data is damaged.` On success `state` has `gym` stripped (so `lockin.v2` never gets the key); `gym` is absent from the result when the file has no section (caller leaves existing gym data alone, ruling 3).
- Backup status: unchanged. `lastBackup` stays in `lockin.v2` settings; one export stamps it and writes both parts into the same file, so a backup made today covers both.
- Red: 8 fail, 5 pass. Green: 13 pass; `npm test` 817 pass, 0 fail (804 + 13); exit 0. Forbidden-date-API grep on `store.js`: no hits. `origin/gym` is an ancestor of HEAD.
- Needs ruling: see docs/STATUS.md.
- Next: G7 (wires `runExport` 4th arg, the import write of both keys, `app.gym` / `app.setGym`).

### G7 — six icon-only tabs, Gym shell, Today card, backup wiring
- Commits: `6993cb9` failing WIP `tests/gym-tabs.test.js` (15 tests) and `tests/gym-import-wiring.test.js` (9 tests), frozen, untouched since; G7 implementation commit follows on `gym`. No existing test edited, `src/core` not edited. VERSION untouched.
- Tab bar: `index.html` six `<a class="tab" aria-label>` with no text (Today, Tasks, Challenge, Analytics, Gym, Settings); `router.js` TABS gains `gym` (`#gym` only, no pushed gym routes exist yet); `screens.css` `.tab` loses the label font rules; active = existing glow, top bar and border plus `fill: currentColor; fill-opacity: .28; stroke-width: 2.2` on the icon (ruling 4, no new art for the five old icons). Measured in the browser pane at 390 wide: 56.7 x 58 pt per tab (CSS arithmetic at 375: 54.5 pt). Idle `#BDB6AA` and active `#FCE29A` pass 3:1 on the bar (tested against the solid fallback and both gradient ends).
- New icon (not in `assets/icons`): `gym` dumbbell, drawn inline in `src/icons.js`, 24 box, stroke 1.7 round, same attributes as the tab icons; four closed plates plus a bar so the active fill shows. `src/views/gym.js` is the shell (eyebrow, title Gym, "No workouts yet" while there are no workouts); `sw.js` ASSETS gets it.
- CLAUDE.md: one line added under Hard rules (six tabs, Gym sixth, icons only; overrides the five-tab-name rule, DESIGN-SPEC §2 and the PNGs).
- Today card: `gymLine(gym, today)` in `todayLogic.js` ("Gym 3/4 this week", visits from `visitsInWeek`), shown as a whole-plate link to `#gym` after the action cards, always (also before Day 1).
- Wiring (ruling 11): `app.gym`, `app.gymCorrupt`, `app.storage`, `app.setGym(updater)` in `src/app.js` (136 lines). `setGym` follows `set`: the value stays in memory, the save banner shows on a failed write, returns whether it was saved.
- Backup (ruling 17): `runExport(state, today, io, gym)` passes gym to `exportJson`; `exportBackup` passes `app.gym`. `applyImport(app, r)` in `settingsLogic.js`: no gym in the file = v2 only (ruling 3); else gym is written first and a failure aborts with nothing changed; if the v2 write then fails the previous gym text is written back byte for byte (key removed if there was none) and the previous v2 state returns to memory. A failure shows `The backup could not be saved. Nothing was changed.`
- Red: both files failed with ERR_MODULE_NOT_FOUND / missing export. Green: 24 pass; `npm test` 841 pass, 0 fail (817 + 24); exit 0. Forbidden-date-API grep on the diff of `src/`: no hits.
- Choices (plan silent): Gym shell copy is only "Lock In", "Gym", "No workouts yet"; the Today card is shown even before Day 1; a failed gym save and a failed v2 save share the one `saveFailed` flag (a later successful write of the other key clears it, as in v2).
- Not done: the `gymCorrupt` notice (plan: one-line notice on the Gym tab; copy not given). The flag is exposed, nothing shows it yet.
- Next: G8 (after the iPhone checkpoint).

### G8 — Gym home, exercise picker, create-exercise
- Commits: `03f46b0` failing WIP tests (`gym-home-logic` 13, `gym-picker-logic` 10, `gym-exercise-form` 8, `gym-data` 6, `gym-views` 19; frozen, untouched since); G8 implementation commit follows on `gym`. `src/core`, `src/icons.js` and every earlier test untouched. VERSION untouched.
- Added (all under `src/views/` unless noted): `gymHome.js` + `gymHomeLogic.js` (week strip, "n of 4 visits", routine rows, last 5 finished workouts, corrupt notice copy), `gymPicker.js` + `gymPickerLogic.js` (search, muscle and equipment chips, 50-row cap, in-place repaint), `gymExerciseSheet.js` + `gymExerciseLogic.js` (create-exercise sheet; a blank name is refused in the view, `src/core/exercises.js` unchanged), `gymData.js` (fetches `src/data/exercises.json` on first Gym open, cached, retry button), `src/gym.css` (35 lines). Edited: `router.js` (`#gym/exercises` = pushed screen under the Gym tab), `app.js` (route to home and picker; the 30 s re-render now also skips a focused `type=search` field), `index.html` (gym.css link), `sw.js` (ASSETS).
- Gym home: corrupt notice (`Gym data could not be read. A copy was kept.`, warning plate with the existing `warn` icon) when `app.gymCorrupt`; This week (visits against target, Monday-Sunday tiles, a visit = gold tile + check mark + aria-label); Start workout and Repeat last workout shown DISABLED (no workout screen until G9); Exercises row linking to the picker; Routines and Recent workouts (read-only rows, designed empty states).
- Rulings applied: Today gym card stays visible before Day 1 (checked in the browser pane: "Start Day 1" and "Gym 0/4 this week" both show); one shared `saveFailed` flag for both keys (G7 wiring, no change needed).
- Red: all five files failed with ERR_MODULE_NOT_FOUND. Green: 56 pass; `npm test` 897 pass, 0 fail (841 + 56); exit 0. Forbidden-date-API grep on the new files: no hits. Icons used: `check`, `chevronRight`, `warn`, `back` (all existing; nothing new drawn).
- Browser pane checks at 390 and 375 wide (seeded invented data, removed afterwards): home with and without workouts, 60-character workout name wraps, picker search and chips, create sheet (blank and spaces refused with "Enter a name.", Add disabled; Chest + Cable saved as `custom-2` in `lockin.v2.gym`), corrupt notice, no horizontal overflow, every button, link and input in the picker 44 pt or more.
- Choices (plan silent): the picker is browse-only (no pick action) until G9 plugs in a callback; it is reached from an Exercises row on Gym home (not in the plan's home list); a new custom exercise becomes the search query so it is visible; chip rows scroll sideways; "Recent workouts" = finished only; start/repeat buttons disabled rather than hidden so the layout can be judged.
- Deviations: `src/views/gym.js` (the G7 shell) is no longer used by `app.js`; it stays because two frozen G7 tests render it. No reviewer subagent run (not asked).
- Needs ruling: see docs/STATUS.md.
- Next: G9 (after the iPhone checkpoint).
