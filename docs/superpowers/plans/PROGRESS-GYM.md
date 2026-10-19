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
10. A new set defaults to reps 1, weight 0 (the 1-999 rule stays). Sets can be removed any time, including the last one. G3 must include `removeSet`; the finished-workout rule stays "at least one done non-warm-up set".
11. `app.gym` / `app.setGym` wiring waits for G7.

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
