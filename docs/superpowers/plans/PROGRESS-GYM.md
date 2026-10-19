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

## Entries

### G0 — plan, branch, rulings
- Branch `gym` from `v2` (`04622a3`). Docs only, no code, nothing pushed.
- Added `v2.1-gym-plan.md`, `gym-plan-draft.md`, this file; `CLAUDE.md` points to the plan and this file.
- Next: G1.
