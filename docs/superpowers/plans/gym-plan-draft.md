# Gym v2.1 draft plan (G0 output, uncommitted). Assumes the plan's 11 defaults. Source: v2.1-gym-plan.md, PROGRESS.md (to Task 20), src/, sw.js, tests/.

## 1. Files per task (all new unless marked; each ≤ 300 lines)
- G0: branch `gym`; copy plan into repo; `PROGRESS-GYM.md`; CLAUDE.md pointer to the v2.1 plan (its rules name the v2 plan only). No code.
- G1: `scripts/build-exercises.mjs`; `src/data/exercises.json` (+ `SOURCE.md`); `src/core/exercises.js` (search, filters, recents, custom); `tests/exercises.test.js`; sw ASSETS.
- G2: `src/core/gym.js` (`emptyGym`, `validateGym`, `loadGym`, `saveGym`; keys `lockin.v2.gym` / `.corrupt`); `tests/gym-store.test.js`; sw. Also `app.gym` + `app.setGym` in `src/app.js` (117 lines).
- G3: `src/core/workouts.js` (start, add exercise, set edits, done, finish, discard, edit, delete, prefill); `tests/workouts.test.js`; sw.
- G4: `src/core/routines.js`; `tests/routines.test.js`; sw.
- G5: `src/core/gymStats.js` (visits, volume, muscle sets, 1RM, PR); `tests/gym-stats.test.js` + `tests/gym-stats-tz.test.js` (spawnSync); sw.
- G6: `src/core/gymBackup.js` (wraps `validateImport`, splits/joins the gym section); edit `src/views/settingsLogic.js` (`runExport` optional 4th arg) and `settings.js` (import writes both keys); `tests/gym-backup.test.js`; sw.
- G7: edit `index.html`, `src/app.js` (tab loop), `src/router.js`, `screens.css`, `src/icons.js`, `CLAUDE.md`, `src/views/today.js`; new `src/views/gym.js` (shell), `src/gym.css`, `tests/router.test.js` (add cases), `tests/gym-tabs.test.js`.
- G8: `src/views/gymHome.js`, `gymPicker.js`, `gymExerciseForm.js` + `*Logic.js`; tests per Logic file.
- G9: `src/views/gymWorkout.js`, `gymWorkoutLogic.js`, `src/ui/stepper.js` if the Task 10 stepper does not fit; tests.
- G10: `src/views/gymRoutines.js` + Logic; tests.
- G11: `src/views/gymHistory.js`, `gymStats.js` (view), Logic files; reuse the Analytics chart parts; tests.
- G12: `sw.js` + `src/version.js` → 2.1.0; `docs` audit; sw.test.js passes unchanged.

## 2. G7: six icon-only tabs
- `index.html`: six `<a class="tab" href="#…" aria-label="Today|Tasks|Challenge|Analytics|Gym|Settings">`, no text. The tab loop in `app.js` already prepends `icon(hash)`.
- Reused icons: `today`, `tasks`, `challenge`, `analytics`, `settings` from `src/icons.js`. New `gym` dumbbell: inline, 24 viewBox, stroke 1.7 round, same attributes. Listed in PROGRESS-GYM.md (CLAUDE.md rule).
- `router.js` TABS gains `gym` after `analytics`; pushed `gym/…` routes get `tab: 'gym'`. Order: Today, Tasks, Challenge, Analytics, Gym, Settings.
- Active vs inactive: inactive = current outline. Active = `fill: currentColor; fill-opacity: .28` plus gold stroke and the existing glow and top bar. No new art for the five old icons. Gym and Analytics differ (bars vs dumbbell).
- `.tab` CSS: drop the label font rules; keep the 44 pt+ target. Contrast: idle icon `#BDB6AA` must pass 3:1 graphics (extend a contrast test).
- CLAUDE.md line: "Tab bar (owner decision <date>): v2.1 uses six icon-only tabs. aria-label keeps the exact names. This overrides the labelled bar in DESIGN-SPEC §2 and the PNGs."

## 3. Tests for G1-G6 (all expected values by hand, written first, frozen WIP commit)
- Every id-taking function (exercise lookup, workout/routine id, `exerciseId`) gets `toString` and `__proto__` as ids: refused or "Unknown", state byte-identical, no throw. Lookups via `Map`.
- G1: every typed word must match; null equipment → "other"; custom name 1-60 after trim, case-insensitive duplicate vs bundled and custom; `custom-N` ids; rename ok, no delete; recents (last 10) first. Fixture list, not the real file.
- G2: each validate rule one pass and one fail (reps 0/1/999/1000/1.5, weight -1/0/1000/NaN, date 2026-02-30, finishedAt < startedAt, two open workouts, finished with only a warm-up, duplicate ids); unknown exercise id valid; corrupt → `.corrupt`, notice, never throws; `lockin.v2` untouched.
- G3: Volume 80×8, 80×8, 77.5×7 = 1822.5; Finish with only a done warm-up → `no-sets`; start twice → `workout-open`, state identical; Prefill bench 4 sets → 80×8, 80×8, 77.5×7, 77.5×7 (done=false); no history → template, else one empty set; stale open workout stays open.
- G4: save-as-routine (3 exercises, 4+3+3 working sets, warm-ups dropped); repeat last = same exercises, nothing done.
- G5: visits: Oct 5, 7, 7, 11, 12 → week of 10-05 = 3, week of 10-12 = 1, October = 4; unfinished never counts; muscle sets chest 3 / triceps 3; 1RM 80×5 = 93.3, 60×10 = 80.0, 100×1 = 100, 50×12 and 0×15 excluded; PR 82.5×5 = 96.25 yes, 80×5 again no, first ever no.
- G5 TZ (`spawnSync`, `TZ=Europe/Sarajevo`, `EXPECT_OFFSET=-60` like `tz.test.js`, exact pass count): week of Sun 2026-10-25 has 7 keys 10-19..10-25; workout at 23:59 Sun vs 00:00 Mon lands in different weeks; also `America/Los_Angeles` as in v2.
- G6: round trip export → import equal; a v2.0.0 backup without `gym` imports; bad gym section refused with both keys byte-identical; non-string input; `__proto__` key in gym JSON.

## 4. Conflicts with v2 code or Task 19
- `tests/sw.test.js` requires ASSETS = `src/` + `icons/` only. The plan's `data/exercises.json` would fail it → ship at `src/data/exercises.json`.
- Export is `JSON.stringify(wholeState)` (v:2). `validateState` ignores unknown top-level keys, so `app.set(() => r.state)` would copy a `gym` key into `lockin.v2`, defeating the separate key. G6 must strip it before `app.set`.
- `runExport(state, today, io)` has no gym input; `lastBackup` lives in `lockin.v2`. Backup reminder counts days only.
- Two `setItem` writes on import are not atomic (quota). Needs write order + rollback.
- Plan: "no direct Date use in core". v2 core uses `dateKey(new Date(nowMs))` (challenge.js:99). Follow that; the grep bans only the four forbidden APIs.
- Plan says tabs are 62-65 pt wide. Real bar (18 pt margins, 6 pt padding): 54 pt at 375, 57 at 390. Still ≥ 44.
- CLAUDE.md bans "accolades"; PR markers (G11) may count. CLAUDE.md names PROGRESS.md; plan names PROGRESS-GYM.md.
- `app.js` tick re-renders every 30 s and guards only TEXTAREA. A weight or reps `<input>` mid-typing would be rebuilt (G9).

## 5. Ambiguities (ask, don't guess)
1. Gym state at runtime: `app.gym` / `app.setGym` in app.js (my pick) or a separate module?
2. Import of a backup with no `gym`: keep existing gym data (my pick) or clear it?
3. "Filled" active icon via CSS fill-opacity (my pick) or new filled art per icon?
4. PR markers allowed despite "accolades" ban?
5. Edit finished workout: may it change the date, and may it remove the last working set (refuse `no-sets`)?
6. Dataset download at G1: who fetches `exercises.json`, from which commit; muscle null/empty → "other"?
7. Exercise list load: fetch on first Gym open (my pick) or at boot?
8. PR per set or per workout when two sets beat the baseline in one workout?
9. Rest countdown and elapsed time need a 1 s view-local timer. OK given "no timers" in v2 views?
10. Release version 2.1.0 and one `PROGRESS-GYM.md` only?
