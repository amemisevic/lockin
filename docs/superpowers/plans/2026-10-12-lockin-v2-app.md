# Lock In v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Lock In into the 5-tab PM-Challenge app (Today · Tasks · Challenge · Analytics · Settings) that installs from Safari "Add to Home Screen" exactly like v1.

**Architecture:** Same shape as v1: static files, vanilla ES modules, one `app.state` object saved to `localStorage`, GitHub Pages, no build step, no server. All rules live in pure functions under `src/core/` (state in, state out, tested with `node --test`); views are thin and only call `app.set(s => core.fn(s, ...))`. The old "nightly pipeline" is one pure function (`closeNight`) that runs on the phone when the night check-in is submitted.

**Tech Stack:** HTML/CSS/JS ES modules, `node --test`, service worker cache. No new dependencies. Fonts are self-hosted WOFF2 (Cinzel, Cormorant Garamond italic, Alegreya Sans, all SIL OFL).

**Spec:** `docs/design/lockin-v2/DESIGN-SPEC.md` (look and components), `docs/design/lockin-v2/PLAN-v3.md` (decisions, scope), `docs/design/lockin-v2/reference/*.png` (pixel judge), and the **Rules** section of this plan (scoring, check-ins, Recovery). Imported in Task 0.

## Global Constraints

Every task includes these. Copied from `CLAUDE.md` and the approved design.

- Vanilla HTML/CSS/JS (ES modules). No frameworks, no bundler, no runtime dependencies, no `npm install` into the project. Install stays: Safari → Share → Add to Home Screen.
- `tests/` are never edited to make them pass. A test may be deleted only where Task 9 lists it (its feature is removed). New behaviour gets new tests, written first.
- Local dates only (`YYYY-MM-DD`). Never `toISOString`, `getUTC*`, `Date.parse`, or `new Date('YYYY-MM-DD')` on date keys. Use `dateKey`, `addDays`, `daysBetween`, `weekStart` from `src/logic.js`.
- All asset paths relative (GitHub Pages sub-path). No leading `/`. No CDN, no Google Fonts.
- **No personal data and no program content in the repo** (it is public): no real red lines, weights, schedules, names, mission text, or Bottom G tactic text. Sample content in the mockups is mock data and is never a default. Missions and tactics reach the phone only through Settings → Import pack.
- Files stay under 300 lines, one responsibility each. One commit per task. Stage explicit paths only. Never force-push. Commit trailers as given by the session.
- Release rule: every file under `src/`, `icons/`, `index.html`, `styles.css`, `screens.css`, `manifest.webmanifest` must be listed in `sw.js` `ASSETS` (test-enforced). `VERSION` is bumped in both `sw.js` and `src/version.js` exactly once, in Task 20 (v2 lives on branch `v2`; Pages keeps serving `main` = v1 until the merge).
- Design: tap targets ≥ 44, text ≥ 11, contrast ≥ 4.5 text / 3 graphics, colour never the only signal, dark only, zoom lock stays (owner choice, spec §2). Inline SVG icons of our own. `h()` from `src/dom.js` for DOM; never `innerHTML`.
- Exact copy that must not change: Recovery nudge `Too vague. Name something you will block, delete or move.`; tab names `Today`, `Tasks`, `Challenge`, `Analytics`, `Settings`.
- Still forbidden (unchanged from v1): XP, stars, accolades, in-app notifications, panic button, cloud sync, web push.
- Preview: `npx serve -l 5173`; verify at 390×844, DPR 2. Test: `npm test`.

## Review Focus

Inputs the spec is silent on that will bite a real user, most likely first. Each has a test in the task named.

1. **Night check-in after midnight, and DST/time zones.** Closing the day at 00:40 must close *yesterday*, not mark it missed; a 23- or 25-hour day must not shift anything. Task 4 (`settleMissed` 04:00 grace, `nightTargets`), Task 8 (three time zones).
2. **App not opened for several days.** Three silent days must settle as three Redo days in order, once, and never touch days before `startDate`. Task 4.
3. **Double tap / second submit.** Closing the same night twice must not double the streak, duplicate the Recovery item, or lose data. Task 4, Task 5.
4. **Editing rules mid-challenge.** Changing the Zero Day threshold or deleting/renaming a protocol must not rewrite finished days. Task 3, Task 4.
5. **Wrong or damaged file / failed save.** Importing a v1 backup, a half-written JSON, or a bad pack must be refused with a plain sentence and leave state untouched; a failed `localStorage` write shows the banner and keeps working in memory; corrupt stored JSON is copied to `lockin.v2.corrupt`, never overwritten. Task 1, Task 6, Task 19.

---

## Rules (the scoring contract; from Build Plan v2 §5, §6, §8, with my calls marked ◆)

- **Day result** is `passed | redo | reset`. A day counts only if Morning and Night are both submitted. Afternoon is optional, zero penalty.
- **Reset** (any one): any red line crossed; or missed protocols ≥ `settings.zeroDay` (default 3, range 2–5). Effects: streak → 0; day count keeps going; Recovery due 24 h after close; next day is a forced full pass (no MED).
- **Redo**: `1 ≤ missed < zeroDay` ◆ (equals "1–2" at the default 3); or a pre-declared Redo for that date. Breaks the streak. Next day after a declared Redo is a forced full pass. No Recovery.
- **Passed**: 0 missed, no red line crossed, no declared Redo.
- **Morning missing** → result cannot be `passed`; minimum `redo`, flag `incompleteMorning`; override with a written reason is allowed.
- **Night missing** → ◆ when the 04:00 grace after the day ends passes, the day auto-closes as `redo` with `auto:'no-night'`. No late filing.
- **MED**: declared only inside the Morning submit, per protocol (`protocol.med` text must exist), ◆ each declaration uses one of `settings.medPerWeek` (default 2) slots in the Mon–Sun week; refused if the day is a forced full pass; never on red lines; not retroactive. A MED protocol counts as held at night and is shown read-only.
- **Declared Redo**: once per challenge (`challenge.redoUsed = date`), only for today, before the day closes. Never covers a red line.
- **Slipped without knowing**: note only (`slipNote`); no effect on result or streak.
- **Streak** = consecutive `passed` days ending at the latest closed day; computed from `days`, never stored. `redo`/`reset` end it.
- **Override** of the suggested result requires a non-empty reason; stored on the day.
- **Autopsy**: five fields (state, time, place, decision, change). `change` and `decision` go through `checkVague`. Pending Recovery is a non-blocking banner; overdue (past `dueAt`) turns crimson, nothing else changes ◆.
- **Day 1 = onboarding.** Begin Day 1 requires: War Log entries `contract`, `funeral`, `code`, `redlines-w1` non-empty; ≥ 1 protocol; ≥ 1 red line.
- **Day 30** closed (any result) → graduation plate on Challenge. No new-challenge flow in v2 ◆.
- Unit for MED cap and "week" = Monday-start, `weekStart()`.

## How everything connects (read this before any task)

```
localStorage 'lockin.v2'
      │ load/save (src/core/store.js)
      ▼
app.state ──────────────── app.set(updater) ── saves, shows banner on failure, notifies
  ▲   │                         ▲
  │   └─ read via selectors     │ one call per user action
  │      (core/*.js, pure)      │
  │                       ┌─────┴──────┐
  │   hash router ──────► │  views     │  src/views/*.js  (thin: build DOM, call core)
  │   (src/router.js)     └────────────┘
  │
  └─ clock: app.today(), rerender on focus/visibility/30 s;
     on every load and day change: app.set(s => settleMissed(s, Date.now()))
```

- **One source of truth:** `app.state`. Views never keep their own copy of anything that is saved.
- **Day lifecycle:** Morning (`submitMorning`) → optional Afternoon (`submitAfternoon`) → Night (`closeNight`) → result stored on `days[date]` → if `reset`, `recovery[date]` is created with `dueAt = closedAt + 24 h` → next morning `forcedFullPass()` is true → Recovery screen (`fileAutopsy`) writes `recovery[date]` and a War Log entry `autopsy-<date>`. If nobody submits Night, `settleMissed` closes the day as Redo once the 04:00 grace has passed.
- **Tasks feed the night:** `taskLog[date][taskId]` is written by Tasks/Today toggles and Afternoon. `closeNight` refuses while any task due that date is still unresolved, and writes the final statuses back.
- **Challenge feeds Today:** Today shows CTAs from pure selectors: `nextAction(state, nowMs)` → `'morning' | 'afternoon' | 'night' | 'recovery' | 'none'`.
- **Routes** (hash): tabs `#today #tasks #challenge #analytics #settings`; pushed screens `#checkin/morning #checkin/afternoon #checkin/night/<date> #recovery/<date> #mission/<n> #warlog #warlog/<key>`. Pushed screens show a back button and hide the tab bar. The tab highlighted for a pushed screen is its parent (`checkin`→today, `mission|warlog|recovery`→challenge).
- **Rule edits never rewrite history:** a closed day stores snapshots (`title`, `name`) and its own `result`. Streak/stats read stored results.
- **Backup = the whole state** as JSON (export/import, same flow as v1). v1 backups are refused by v2 import.

## Data model (`src/core/model.js`)

```
State {
  v: 2,
  settings: { zeroDay: 3, medPerWeek: 2, lastBackup: 'YYYY-MM-DD'|null },
  tasks: Task[],
  taskLog: { [date]: { [taskId]: 'done'|'failed'|'stalled' } },   // missing key = open
  challenge: null | { startDate, length: 30, protocols: Protocol[], redLines: RedLine[],
                      redoUsed: 'YYYY-MM-DD'|null },
  days: { [date]: Day },
  recovery: { [date]: { dueAt: ms, filedAt: ms|null, state, time, place, decision, change } },
  warLog: { [key]: { text, updatedAt: ms } },
  pack: null | { missions: {day,title,body}[], tactics: {archetype,name}[] }
}
Protocol { id, title, med: string|null }     RedLine { id, name }
Task { id, title, note, start:'HH:MM'|null, end:'HH:MM'|null, date:'YYYY-MM-DD'|null,
       repeat:{type:'none'|'daily'|'weekdays'|'custom', days:number[]},  // Mon=0…Sun=6; date used when type='none'
       skip: string[], archived: boolean }   // habit = repeat.type !== 'none'
Day { morning: null | {at:ms, target, risk, med: string[]},
      afternoon: null | {at:ms, onTrack:'yes'|'no'|'struggling', friction},
      declaredRedo: boolean, slipNote: string, incompleteMorning: boolean, auto: null|'no-night',
      night: null | { at:ms, protocols:{id,title,status:'held'|'missed'|'med'}[],
                      redLines:{id,name,status:'held'|'crossed'}[], win, bottomG:{archetype,tactic,text},
                      suggested:'passed'|'redo'|'reset', override:null|{result,reason} },
      result: null|'passed'|'redo'|'reset', closedAt: ms|null }
```

Warlog keys: `contract funeral code redlines-w1 autopsy-<date> day-<n>`. Bottom G archetypes (5, fixed ids): `negotiator assassin seducer escapist authority` ◆ (ids only; names/tactics come from the pack).

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/core/model.js` | `defaultState`, `validateState` | 1 |
| `src/core/store.js` | load/save/export/import/backup status for `lockin.v2` | 1 |
| `src/core/tasks.js` | task CRUD, `tasksOn`, statuses, habit dots | 2 |
| `src/core/challenge.js` | start, day number, morning/afternoon, MED, declared Redo, forced full pass, `nextAction` | 3 |
| `src/core/scoring.js` | `suggestResult`, `closeNight`, `settleMissed`, `nightTargets`, streaks | 4 |
| `src/core/recovery.js` | `checkVague`, `recoveryStatus`, `fileAutopsy` | 5 |
| `src/core/warlog.js` | War Log entries and oath keys | 5 |
| `src/core/pack.js` | pack validation and import | 6 |
| `src/core/stats.js` | Analytics selectors | 7 |
| `src/router.js` | hash → `{name, params}`, `nav()` | 9 |
| `src/ui/*.js` | shield, section heading, chips, plate, segmented, stepper, taskRow | 10 |
| `src/views/*.js` | one file per screen (see tasks) | 11–19 |
| `src/logic.js` | **trimmed** to the date/time helpers (keeps `tests/dates.test.js` untouched) | 9 |
| `tools/seed.mjs` | generates a fake 30-day backup for screenshots (not shipped) | 19 |

---

### Task 0: Branch, import the design, amend the rules (docs only)

**Files:**
- Create: `docs/design/lockin-v2/` (unzip of `lockin-v2-design.zip`: `DESIGN-SPEC.md`, `PLAN-v3.md`, `reference/`, `static/`, `css/`, `assets/`, `tools/`, `source/`)
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-08-lockin-design.md` (§1.11, §2)

**Interfaces:** Produces: the design files every later task reads.

- [ ] **Step 1:** `git switch -c v2`. Unzip the package into `docs/design/lockin-v2/`. Do not import `source/*.dc.html` into any shipped path.
- [ ] **Step 2:** In `CLAUDE.md` replace the line starting `- No streaks, no stars…` with: `- Streaks, check-ins, Top G / Bottom G, MED / Redo / Reset and the Recovery Protocol exist only as specified in docs/superpowers/plans/2026-10-12-lockin-v2-app.md (Rules). Still forbidden: XP, stars, accolades, in-app notifications, panic button, cloud sync, web push.` Replace "Read first" list with the v2 plan and `docs/design/lockin-v2/DESIGN-SPEC.md`. Replace "Apple HIG as written in spec §3" with "the Iron/Spartan design in docs/design/lockin-v2/DESIGN-SPEC.md; HIG minimums (tap, text, contrast, dark only, zoom lock) still apply".
- [ ] **Step 3:** In the v1 spec §2 add one line per deviation: custom serif fonts; gold-on-dark; floating glass tab bar; ornamental background; five tabs. Mark v1 §1.1–1.8 "superseded by v2 plan".
- [ ] **Step 4:** `npm test` → all v1 tests still pass (no code touched). Commit `docs: import v2 design, amend rules` (explicit paths).
- [ ] **⛔ CHECKPOINT:** Stop. Show the `CLAUDE.md` diff to the owner. Continue only after approval.

---

### Task 1: State model and store (`lockin.v2`)

**Files:**
- Create: `src/core/model.js`, `src/core/store.js`, `tests/core-store.test.js`
- Modify: `sw.js` (ASSETS += the two files)

**Interfaces:**
- Consumes: `addDays, daysBetween` from `src/logic.js`.
- Produces:
  - `KEY = 'lockin.v2'`, `CORRUPT = 'lockin.v2.corrupt'`
  - `defaultState(): State` (shape above, empty lists, `settings:{zeroDay:3,medPerWeek:2,lastBackup:null}`)
  - `validateState(obj): string|null` (null = valid, else a plain sentence)
  - `load(storage, today): State`, `save(storage, state): boolean`
  - `exportJson(state): string`, `validateImport(text): {ok:true,state}|{ok:false,error}`
  - `markBackup(state, today): State`, `backupStatus(state, today): {days:number|null, overdue:boolean}` (overdue when null or > 7)

- [ ] **Step 1: Write failing tests** in `tests/core-store.test.js` (use a Map-backed fake storage):
  - `defaultState().v === 2` and `validateState(defaultState()) === null`
  - `load` with nothing stored returns `defaultState()`
  - `load` with `'{not json'` returns default **and** `storage.getItem(CORRUPT) === '{not json'`; `save` afterwards does not touch `CORRUPT`
  - `validateImport(JSON.stringify({v:1,goals:[]}))` → `{ok:false, error:'This is a Lock In v1 backup. v2 cannot import it.'}`
  - `validateImport('')` → error `'The file is empty.'`; invalid JSON → `'The file is not valid JSON. Choose a Lock In backup file.'`
  - `validateState` rejects: `settings.zeroDay` of 1 or 6; `medPerWeek` not integer 0–3; a `days` result outside `passed|redo|reset|null`; a date key not matching `^\d{4}-\d{2}-\d{2}$`
  - round trip: `validateImport(exportJson(s)).state` deep-equals `s`
  - `save` with a storage whose `setItem` throws returns `false`; `load` with a storage whose `getItem` throws returns default
  - `backupStatus({settings:{lastBackup:null}}, '2026-10-12')` → `{days:null, overdue:true}`; 8 days ago → `overdue:true`; 7 → `false`
- [ ] **Step 2:** `node --test tests/core-store.test.js` → FAIL (modules missing).
- [ ] **Step 3:** Implement both files. Adapt the v1 patterns in `src/store.js` (guards `isObj/isStr/isNum/isDate`, corrupt copy, `fill`). Validate every nested field the model lists; unknown extra keys are kept.
- [ ] **Step 4:** `npm test` → PASS (v1 tests still pass; `sw.test.js` passes with ASSETS updated).
- [ ] **Step 5:** Commit `feat(core): v2 state model and store`.

---

### Task 2: Tasks core

**Files:**
- Create: `src/core/tasks.js`, `tests/tasks.test.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `weekdayIdx, addDays, uid, toMin` from `src/logic.js`; `State` from Task 1.
- Produces:
  - `validateTask(t): string|null` (`'Add a title.'`, `'Enter a valid time.'`, `'End must be after start.'`, `'Pick at least one day.'`)
  - `addTask(state, draft, id = uid()): State`, `updateTask(state, id, patch): State`, `archiveTask(state, id): State`, `skipOn(state, id, date): State`, `moveToTomorrow(state, id, date): State` (only `repeat.type==='none'`: sets `date` to `addDays(date,1)`)
  - `isDue(task, date): boolean` (not archived; `none` → `task.date===date`; `daily`; `weekdays` Mon–Fri; `custom` → `days` includes `weekdayIdx(date)`; not in `skip`)
  - `type TaskView = { task: Task, status: 'open'|'done'|'failed'|'stalled' }`; `tasksOn(state, date): TaskView[]` sorted by `start` (null last), then title
  - `setTaskStatus(state, date, taskId, status|null): State` (null clears)
  - `habitDots(state, taskId, endDate): ('done'|'failed'|'stalled'|'open'|'off')[]` length 7 ending `endDate`; `off` = not due that day
  - `openTasks(state, date): TaskView[]`

- [ ] **Step 1: Write failing tests** (`tests/tasks.test.js`):
  - `isDue` for each repeat type incl. Sunday not in `weekdays`, `custom:[0,2]` due Mon/Wed only, skipped date not due, archived never due
  - `tasksOn` ordering: `09:00` before `14:00` before untimed; a done task reports `'done'`
  - `validateTask({title:'  '})` → `'Add a title.'`; `{start:'10:00',end:'09:00'}` → `'End must be after start.'`; `{start:'25:00'}` → `'Enter a valid time.'`
  - `setTaskStatus` then `setTaskStatus(..., null)` leaves `taskLog[date]` without the key
  - `habitDots` for a daily task done 3 of last 7 days returns exactly those 3 `'done'`, the rest `'open'`; for a `custom:[0]` task the six non-Monday entries are `'off'`
  - `moveToTomorrow` on a repeating task returns state unchanged
  - `archiveTask` keeps `taskLog` history (stats read it)
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (pure; no mutation). **Step 4:** `npm test` → PASS. 
- [ ] **Step 5:** Commit `feat(core): tasks and habits`.

---

### Task 3: Challenge core (start, morning, afternoon, MED, declared Redo)

**Files:**
- Create: `src/core/challenge.js`, `tests/challenge.test.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: Task 1 model; `daysBetween, weekStart, addDays` from `src/logic.js`. Imports nothing from `recovery.js`/`warlog.js` (they come later): `startChallenge` receives `oathComplete` as an argument, and `nextAction` checks `Object.values(state.recovery).some(r => !r.filedAt)` itself.
- Produces (`type Result = {ok:true,state} | {ok:false,error:string}`):
  - `dayNo(state, date): number|null` (`daysBetween(startDate,date)+1`, null when no challenge or before start)
  - `phase(state, date): 'none'|'before'|'active'|'finished'` (`finished` when `date` is after day `length`)
  - `startChallenge(state, today, {protocols, redLines, oathComplete}): Result` — refuses with `'Write your Contract, Funeral and Code first.'`, `'Add at least one protocol.'`, `'Add at least one red line.'`
  - `forcedFullPass(state, date): boolean` (previous calendar date's `result==='reset'` or its `declaredRedo`)
  - `medUsedInWeek(state, date): number` (count of `morning.med` entries over `weekStart(date)…+6`)
  - `medCheck(state, date, protocolId): {ok:true}|{ok:false, reason:'forced'|'cap'|'no-med'|'no-protocol'}`
  - `submitMorning(state, today, {target, risk, med: string[]}): Result` — requires non-empty `target` (`'Write today\'s #1 target.'`), every `med` id passes `medCheck` counting the ids in this same submit, refuses a second morning (`'Morning check-in is already filed.'`) and a day not `active`
  - `submitAfternoon(state, today, {onTrack, friction}): State` (re-submit replaces; `friction` kept only when `struggling`)
  - `declareRedo(state, today): Result` — refuses when `challenge.redoUsed` (`'Your one declared Redo is already used.'`), day closed, or day not active
  - `nextAction(state, nowMs): 'recovery'|'morning'|'afternoon'|'night'|'none'` — `recovery` if a pending Recovery exists; else `morning` if active and no morning; else `night` if local hour ≥ 18 and not closed; else `afternoon` if 12 ≤ hour < 18 and morning done and no afternoon; else `none` ◆ (18:00 / 12:00 are constants `NIGHT_FROM`, `AFTERNOON_FROM`)

- [ ] **Step 1: Write failing tests:**
  - `startChallenge` refuses without protocols / red lines / oath; with all three sets `challenge.startDate === today`, `length === 30`, `redoUsed === null`, and `dayNo(state,today) === 1`, `dayNo(state, addDays(today,9)) === 10`
  - `phase` for day 31 is `'finished'`
  - `submitMorning`: needs `target`; second call refused; `days[today].morning.med` stored
  - MED: with `medPerWeek:2`, two MED declared Mon + Tue → third on Wed `{ok:false,reason:'cap'}`; next Monday resets the count; protocol with `med:null` → `'no-med'`; day after a `reset` day → `'forced'`; day after a `declaredRedo` day → `'forced'`
  - `submitMorning` with a `med` id that fails `medCheck` returns `{ok:false}` and leaves state unchanged (no partial write)
  - `declareRedo` sets `redoUsed = today` and `days[today].declaredRedo = true`; a second call (any day) refused; after the day is closed refused
  - **Review Focus 4:** closed day `D` (result stored) then `startChallenge`-independent edit `state.settings.zeroDay = 5` and `challenge.protocols = []` → `days[D].result` and `days[D].night.protocols` unchanged
  - `nextAction` with `nowMs` built from `new Date(2026,9,12,7,0)` → `'morning'`; after morning at 13:00 → `'afternoon'`; at 19:00 → `'night'`; with a pending Recovery → `'recovery'`
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. The view computes `oathComplete` with `warlog.oathComplete(state)` and passes it in. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(core): challenge, morning, MED, declared redo`.

---

### Task 4: Scoring, night close, settle, streaks

**Files:**
- Create: `src/core/scoring.js`, `tests/scoring.test.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: Tasks 1–3 (`tasksOn`/`openTasks`/`setTaskStatus`, `forcedFullPass`, `phase`).
- Produces:
  - `suggestResult({morningDone, protocols, redLines, zeroDay, declaredRedo}): {result:'passed'|'redo'|'reset', reasons:string[]}` where `protocols: {status:'held'|'missed'|'med'}[]`, `redLines: {status:'held'|'crossed'}[]`. Order of rules: any `crossed` → reset (`'Red line crossed'`); `missed ≥ zeroDay` → reset (`'N protocols missed'`); `declaredRedo` → redo; `missed ≥ 1` → redo; `!morningDone` → redo (`'No morning check-in'`); else passed.
  - `closeNight(state, date, form, nowMs): Result` with `form = { tasks: {[taskId]:'done'|'failed'|'stalled'}, protocols: {[id]:'held'|'missed'}, redLines: {[id]:'held'|'crossed'}, win: string, bottomG: {archetype:string|null, tactic:string|null, text:string}, slipNote: string, override: null|{result, reason} }`. Errors: `'closed'`, `'not-active'`, `'tasks-open'`, `'protocols-unanswered'`, `'redlines-unanswered'`, `'override-reason'`, `'not-closable'`. Protocols declared MED in that day's morning are forced to `'med'` and need no answer. On success: writes `taskLog` statuses, builds `night` with title/name snapshots, `suggested`, `override`, `result = override?.result ?? suggested`, `closedAt = nowMs`, `incompleteMorning`; when `result==='reset'` creates `recovery[date] = {dueAt: nowMs + 86400000, filedAt:null, state:'',time:'',place:'',decision:'',change:''}`.
  - `nightTargets(state, nowMs): string[]` — `[today]` if active and not closed; plus yesterday if `hour < 4`, yesterday active and not closed.
  - `settleMissed(state, nowMs): State` — for each date from `startDate` while `(d + 1 day at 04:00 local) ≤ nowMs` and `d` has no `closedAt` and `phase(d)==='active'`: close as `{result:'redo', night:null, auto:'no-night', incompleteMorning: !morning, closedAt: that 04:00 in ms}`. Idempotent.
  - `currentStreak(state): number`, `longestStreak(state): number` (only closed days; ascending date order; `passed` extends, anything else resets)
  - `dayResults(state): {date, result}[]` ascending

- [ ] **Step 1: Write failing tests** (`tests/scoring.test.js`; build state with a helper that starts a 3-protocol, 2-red-line challenge):
  - `suggestResult` table: 0 missed → passed; 1 missed (zeroDay 3) → redo; 2 → redo; 3 → reset; zeroDay 2 and 2 missed → reset; zeroDay 5 and 4 missed → redo; any crossed with 0 missed → reset; declaredRedo with 0 missed → redo; declaredRedo + crossed → reset; no morning, 0 missed → redo
  - `closeNight` refuses `'tasks-open'` while an open task is due; resolves when `form.tasks` covers all; statuses written to `taskLog`
  - `closeNight` unanswered protocol → `'protocols-unanswered'`; MED protocol needs no answer and is stored `status:'med'`
  - override `{result:'passed', reason:'  '}` → `'override-reason'`; with reason → `result==='passed'`, `suggested` still the computed one
  - reset day creates `recovery[date]` with `dueAt === nowMs + 86400000`, `filedAt === null`
  - **Review Focus 3:** second `closeNight` on same date → `{ok:false,error:'closed'}` and `JSON.stringify(state)` unchanged; `currentStreak` unchanged
  - **Review Focus 1:** with `nowMs = new Date(2026,9,13,0,40)`, `nightTargets` includes `'2026-10-12'` and `'2026-10-13'`; `settleMissed` at that time leaves `2026-10-12` open; at `new Date(2026,9,13,4,0)` it closes it as `redo/auto no-night`
  - **Review Focus 2:** challenge started 2026-10-01, `settleMissed` at 2026-10-05 05:00 closes 10-01…10-04 only, each `redo`; running it twice gives identical state; days before `startDate` never appear
  - streaks: P,P,P → 3; P,P,redo,P → current 1, longest 2; reset in middle ends streak; auto-settled day ends streak
  - **Review Focus 4:** change `challenge.protocols` and `settings.zeroDay` after closing; recomputed `currentStreak` and `dayResults` identical
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (pure; `nowMs` always an argument; compute local 04:00 with `new Date(y, m, d+1, 4)` from `keyToDate`, never string math). **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(core): scoring, night close, settle, streaks`.

---

### Task 5: Recovery and War Log core

**Files:**
- Create: `src/core/recovery.js`, `src/core/warlog.js`, `tests/recovery.test.js`, `tests/warlog.test.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: Task 3 `Result`; Task 4 `recovery[date]` shape.
- Produces:
  - `checkVague(text): string|null` — returns `'Too vague. Name something you will block, delete or move.'` or `null`
  - `pendingRecovery(state, nowMs): {date, dueAt, msLeft, overdue}|null` (oldest unfiled)
  - `fileAutopsy(state, date, form, nowMs): Result` with `form = {state, time, place, decision, change}`; errors: `'incomplete'` (any field blank), `'vague-change'`, `'vague-decision'`, `'no-recovery'`, `'already-filed'`. On success sets `filedAt` and writes War Log `autopsy-<date>` = readable text of the five answers.
  - `OATH_KEYS = ['contract','funeral','code','redlines-w1']`; `OATH_TITLES`
  - `setWarEntry(state, key, text, nowMs): State` (empty text deletes the key)
  - `oathComplete(state): boolean`
  - `warEntries(state): {key, title, group:'Oath'|'Autopsies'|'Days', updatedAt, preview}[]` (preview = first 80 chars; titles: `Contract`, `The Funeral`, `The Code`, `Week 1 red lines`, `Autopsy · <date>`, `Day <n> notes`)

- [ ] **Step 1: Write failing tests:**
  - `checkVague('Be stronger')` → the exact nudge; `'stronger'`, `'try harder'`, `'  '`, `'ok'` → nudge; `'Delete the app and charge my phone in the kitchen'` → `null`; `'Block the site on my router'` → `null`. Rule (◆, simple): trimmed length ≥ 15, ≥ 3 words, and contains one of `block delete move remove uninstall unplug charge lock leave turn put set install change cancel` (case-insensitive, word match).
  - `fileAutopsy` blank field → `'incomplete'`; `change:'Be stronger'` → `'vague-change'`; valid → `filedAt === nowMs` and `warLog['autopsy-2026-10-13'].text` contains each answer; second file → `'already-filed'` (Review Focus 3)
  - `pendingRecovery` returns `msLeft` ≈ `dueAt - now`, `overdue:true` after `dueAt`; `null` once filed
  - `oathComplete` false until all four oath keys non-empty; `setWarEntry(...,'')` removes the key
  - `warEntries` groups and orders: oath keys first (fixed order), autopsies newest first, days by number
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(core): recovery protocol and war log`.

---

### Task 6: Pack import (missions and tactics)

**Files:**
- Create: `src/core/pack.js`, `tests/pack.test.js`
- Modify: `sw.js`

**Interfaces:**
- Produces:
  - `validatePack(text): {ok:true,pack}|{ok:false,error}` for `{v:1, missions:[{day:1..30,title,body}], tactics:[{archetype,name}]}`; `tactics` optional; `archetype` ∈ the 5 ids; duplicate `day` refused; ≤ 300 KB text (`'The pack is too large.'`)
  - `importPack(state, pack): State` (replaces `state.pack`)
  - `missionFor(state, n): {day,title,body}|null`
  - `tacticsFor(state, archetype): {archetype,name}[]`

- [ ] **Step 1: Write failing tests (Review Focus 5):** empty string; `'[1,2]'`; `{v:2}`; mission `day: 31`; duplicate day; unknown archetype; a 400 KB string → each returns `{ok:false}` with a plain sentence and `importPack` is never reached; valid pack round-trips; `missionFor(state, 9)` null when absent; `tacticsFor` filters by archetype.
- [ ] **Step 2–4:** run FAIL → implement → PASS. **Step 5:** Commit `feat(core): mission and tactic pack`.

---

### Task 7: Analytics selectors

**Files:**
- Create: `src/core/stats.js`, `tests/stats.test.js`
- Modify: `sw.js`

**Interfaces:** `range` is `{endDate, n}` with `n:number|null` (null = since `startDate`). All return plain data, no DOM.
- `resultCounts(state, range): {passed, redo, reset, open}`
- `passRate(state, range): number|null` (passed ÷ closed days; null when none)
- `protocolRates(state, range): {title, held, missed, med}[]` (grouped by protocol id, latest title)
- `resetCauses(state, range): {redLine:number, protocols:number, byProtocol:{title,count}[]}`
- `tacticCounts(state, range): {archetype, tactic, count}[]` desc
- `weekdayRates(state, range): {done:number,total:number}[7]` (habit tasks, Mon=0)
- `heatmap(state, endDate): {date, done:number, due:number}[28]`
- `taskTotals(state, range): {done,failed,stalled,open}`

- [ ] **Step 1: Write failing tests** with a hand-built 7-day state (2 passed, 1 redo, 1 reset caused by a red line, 1 reset caused by 3 misses): assert exact counts for every function; `passRate === 2/5`; `heatmap` length 28 and last date equals `endDate`; `weekdayRates` counts only repeating tasks; `n:null` uses `startDate`; empty state returns zeros and `passRate === null`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(core): analytics selectors`.

---

### Task 8: Whole-challenge flow test and time zones

**Files:**
- Create: `tests/flow.test.js`, `tests/tz.test.js`

**Interfaces:** Consumes everything in `src/core/`. Produces: the safety net for the UI tasks.

- [ ] **Step 1: Write `tests/flow.test.js`** — one scenario through the public core functions only, with a fake clock (`nowMs` values built from local `new Date(y,m,d,h,min)`):
  1. Day 0: `startChallenge` refused; write the four oath entries; add protocols/red lines; start → Day 1.
  2. Days 1–3 passed (morning, afternoon, night) → `currentStreak === 3`.
  3. Day 4: declare MED for one protocol in the morning; night passes → streak 4; `medUsedInWeek === 1`.
  4. Day 5: red line crossed → `reset`; `pendingRecovery` non-null; `nextAction` at 08:00 on Day 6 is `'recovery'`; Day 6 `medCheck` → `forced`; streak 0.
  5. File the autopsy (vague first → refused, then valid) → `pendingRecovery === null`.
  6. Day 6 passes; Day 7: `declareRedo` OK, night closes `redo`; Day 8 `forcedFullPass`; second `declareRedo` refused.
  7. Skip Days 9–10 entirely, open the app on Day 11 at 09:00: `settleMissed` closes 9 and 10 as `redo`.
  8. Day 30 closed → `phase(day 31)==='finished'`; `longestStreak` equals the hand-computed value.
  9. `validateImport(exportJson(state))` round-trips the final state.
- [ ] **Step 2: Write `tests/tz.test.js`:** for `TZ` in `Europe/Sarajevo`, `America/Los_Angeles`, `Pacific/Auckland`, `spawnSync(process.execPath, ['--test','tests/flow.test.js'], {env:{...process.env, TZ}})` must exit 0. Add a case where the scenario's Day 4 is the local DST-change date (`2026-10-25` in Sarajevo; `2026-11-01` in Los Angeles) by parameterising the start date through `process.env.FLOW_START`.
- [ ] **Step 3:** `npm test` → PASS in all three zones (expected output: `tz.test.js` 3+ passing subtests). Fix core code, never the test, if a zone fails.
- [ ] **Step 4:** Commit `test: whole-challenge flow in three time zones`.
- [ ] **⛔ CHECKPOINT:** The rules are now proven without any UI. Tell the owner: "Rules engine done and tested; UI starts next." No device test needed yet.

---

### Task 9: Shell cutover (fonts, tokens, background, router, tab bar)

**Files:**
- Create: `src/router.js`, `src/bg/*.webp` (from `docs/design/lockin-v2/assets/bg/`), `src/fonts/*.woff2` (+ OFL texts) for the three families, `tests/router.test.js`, `tests/contrast.test.js` (replacement)
- Modify: `index.html`, `styles.css`, `screens.css`, `src/fonts/fonts.css`, `src/app.js`, `src/icons.js`, `src/logic.js` (trim to lines 1–33: date/time helpers and `uid`), `sw.js`
- Delete (v1, feature removed): `src/store.js`, `src/redlines.js`, `src/timeLog.js`, `src/views/*.js` (all eight), `tests/{blocks,clock,goalEdit,goals,movedLog,orphan,redlines,redlinesImport,store,timeLog,timer,weights}.test.js`, `tests/fixtures.js`, `tests/export-1.0.7.json`, old `tests/contrast.test.js` (replaced)
- Keep untouched: `tests/dates.test.js`, `tests/sw.test.js`, `src/dom.js`, `src/sheet.js`

**Interfaces:**
- Consumes: `load/save` (Task 1), `settleMissed` (Task 4), `h` from `dom.js`.
- Produces:
  - `parseRoute(hash): {name:string, params:string[], tab:'today'|'tasks'|'challenge'|'analytics'|'settings', pushed:boolean}`; unknown → `today`. Table: `#checkin/morning`→`{name:'checkin',params:['morning'],tab:'today',pushed:true}`; `#mission/9`→`{name:'mission',params:['9'],tab:'challenge'}`; etc. per "How everything connects".
  - `app` (same API as v1: `state, saveFailed, today(), set(updater), subscribe(fn)`) plus `nav(path)`, `route()`. `app.set` runs `settleMissed` first on load and whenever `today()` changes.
  - `icon(name)` gains: `today` (fortress), `tasks` (scroll), `challenge` (crossed swords), `analytics` (bars), `settings` (sliders), `sword`, `shield`, `lambda`, `laurel`; SVGs copied from `docs/design/lockin-v2/css|static` markup.

- [ ] **Step 1: Write failing tests** `tests/router.test.js` (parse table above, unknown hash → today, trailing slash) and `tests/contrast.test.js` (copy the v1 helper functions; assert on the v2 tokens in `DESIGN-SPEC.md` §4: `--text` 16.0, `--text-2` 8.9, `--text-3` 6.9, `--accent` 10.8, eyebrow 8.4, `--crimson-lt` 7.8 on `#141317`, button ink on gold ≥ 5.5, shield outline ≥ 3; keep the `dark only` test).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Delete the v1 files listed. Implement `router.js`; rewrite `app.js` around it (keep the existing storage guard, `gesturestart` zoom lock, 30 s tick, visibility/focus re-render, `navigator.storage.persist`, service-worker registration). `index.html`: five tabs, same `<meta>`/manifest/icons. `styles.css`: tokens from `css/tokens.css` under `/* tokens:dark */`, components from `css/*.css`; `screens.css`: background layers (`.scr::before` stack, copy exact values from `docs/design/lockin-v2/css/`), floating glass tab bar (`left/right 18, bottom 22, height 72, radius 36`). Fonts: Cinzel 500/600/700, Cormorant Garamond italic 600/700, Alegreya Sans 400/500/700 as local `@font-face` (`font-display: swap`).
- [ ] **Step 4:** `npm test` → PASS (dates, sw, router, contrast, core tests). Update `sw.js` ASSETS (fonts, bg, new files; remove deleted).
- [ ] **Step 5:** Serve, screenshot the five empty tabs at 390×844 DPR 2, compare each tab bar and background to `reference/Main.png`. List deviations.
- [ ] **Step 6:** Commit `feat(ui): v2 shell, fonts, background, router`.
- [ ] **⛔ CHECKPOINT:** Owner opens the preview on the iPhone in Safari (not yet installed): confirm fonts, background evenness, floating bar, five tabs switch. Fix before continuing.

---

### Task 10: Shared UI pieces

**Files:**
- Create: `src/ui/chrome.js`, `src/ui/controls.js`, `src/ui/taskRow.js`
- Modify: `styles.css`, `sw.js`

**Interfaces:**
- Produces (all return DOM nodes via `h`):
  - `screenTitle(text)`, `eyebrow(text)`, `sectionHeading(text)` (sword SVG then Cormorant text, `.sec` flex centred), `plate(...children)`, `plate.warn(...)`, `pushedHeader({title, onBack})`
  - `shieldToggle({status, onToggle, label})` — gold + `pop` animation when `done`; `aria-pressed`; 44 pt target
  - `chips({options:[{value,label}], value, onPick, multi?})`, `segmented({options, value, onPick})`, `stepper({value,min,max,onChange,label})`, `switchControl({on,onToggle,label})` (shield thumb), `goldButton(label, onClick, {disabled})`
  - `taskRow(app, view: TaskView, date, {onMenu})` — shield toggle + title + time range + ⋯ button; a habit also shows `habitDots` as 7 small shields
- Consumes: Task 2 `setTaskStatus`, `habitDots`.

- [ ] **Step 1:** Build each piece to match `static/Kit.html` and `reference/Kit.png`; no business logic, no state of their own.
- [ ] **Step 2:** Add a temporary route `#kit` (removed in Step 4) that renders every control in every state; screenshot against `reference/Kit.png`; list deviations and fix.
- [ ] **Step 3:** `npm test` → PASS (ASSETS test confirms the new files are listed).
- [ ] **Step 4:** Remove the `#kit` route. Commit `feat(ui): shared controls`.

---

### Task 11: Tasks tab, add/edit sheet, ⋯ menu

**Files:**
- Create: `src/views/tasks.js`, `src/views/taskSheet.js`
- Modify: `src/app.js` (register route), `sw.js`

**Interfaces:**
- Consumes: Task 2 (all), Task 10 (`taskRow`, `chips`, `sectionHeading`), `openSheet`/`openActionSheet` from `src/sheet.js`.
- Produces: `renderTasks(app)`, `openTaskSheet(app, {mode:'new'|'edit', task?, date})`.

- [ ] **Step 1: Behaviour (matches `reference/Tasks.png`).** Week strip (Mon–Sun, tap selects `viewDate`, future dates allowed for planning); one full-day list for the selected date from `tasksOn`; habits section with 7-day dots; `+` button opens `taskSheet`. Past dates are read-only except the shield toggle ◆. Empty state: one line `Nothing planned.`
- [ ] **Step 2: Add/edit sheet** (port the field layout and validation flow of v1 `blockSheet.js`, in git history of `main`): fields Title (required), Note, Start, End (native `<input type="time">`), Repeat chips `Never · Daily · Weekdays · Custom` (Custom reveals M T W T F S S chips), Date (`<input type="date">`, only when `Never`, default = selected date). Action `Add` / `Done`; errors from `validateTask` shown inline; dirty-cancel uses the existing `Discard Changes` action sheet.
- [ ] **Step 3: ⋯ menu** (`openActionSheet`): once-only task → `Edit`, `Move to tomorrow`, `Delete` (destructive); repeating → `Edit`, `Skip today`, `Delete task` (destructive; archives, history kept). Every item calls exactly one core function from Task 2.
- [ ] **Step 4:** Add a **manual check list** to the commit message body: add a daily habit, tick it, skip today, delete it; add a timed task 09:00–10:00, move to tomorrow.
- [ ] **Step 5:** Screenshot vs `reference/Tasks.png` (with seeded data from Task 19 once available; until then with 3 hand-added tasks). `npm test` → PASS. Commit `feat(ui): tasks tab`.

---

### Task 12: Today tab

**Files:**
- Create: `src/views/today.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `dayNo, phase, nextAction, forcedFullPass, medUsedInWeek` (Task 3), `currentStreak` (Task 4), `pendingRecovery` (Task 5), `tasksOn` + `taskRow`.
- Produces: `renderToday(app)`.

- [ ] **Step 1: Behaviour (matches `reference/Main.png`).** Top to bottom: date eyebrow; `TODAY` title; hero plate with `DAY n of 30` laurel and streak (from `currentStreak`); **action card** driven only by `nextAction(app.state, Date.now())` — `morning` → button to `#checkin/morning`; `afternoon` → `#checkin/afternoon` (dismissable per day, in memory); `night` → `#checkin/night/<date>`; `recovery` → crimson banner with time left → `#recovery/<date>`; plus, when `nightTargets` includes yesterday, a second card `Close yesterday` → `#checkin/night/<yesterday>`; today's tasks (same `taskRow`); with no challenge: a card `Start Day 1` → `#challenge`.
- [ ] **Step 2:** Also show the forced-full-pass line `No MED today. Yesterday was a Reset.` / `…a declared Redo.` when `forcedFullPass`.
- [ ] **Step 3:** Screenshot vs `reference/Main.png` for four states (no challenge, morning due, night due, recovery pending) by editing state through `#settings` import of a fixture. `npm test` → PASS. Commit `feat(ui): today tab`.
- [ ] **⛔ CHECKPOINT:** Owner on the iPhone: add two tasks, tick one, confirm Today and Tasks agree.

---

### Task 13: Challenge tab, Day 0, Declare Redo, graduation

**Files:**
- Create: `src/views/challenge.js`, `src/views/day0.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `phase, dayNo, startChallenge, declareRedo` (Task 3), `oathComplete, OATH_TITLES, warEntries` (Task 5), `dayResults, currentStreak, longestStreak` (Task 4), `resultCounts` (Task 7), `missionFor` (Task 6).
- Produces: `renderChallenge(app)`, `renderDay0(app)`.

- [ ] **Step 1: Day 0** (when `challenge === null`; matches `reference/Onboarding.png`): outline laurel `DAY 0`; checklist of the four oath items, each a row → `#warlog/<key>` showing done/empty; `Protocols` and `Red lines` rows → open the Settings sheets from Task 19 (`openProtocolSheet`, `openRedLineSheet`; until Task 19 exists, these call a stub that shows `Available in Settings` and Task 19 replaces it); `Begin Day 1` gold button disabled until `startChallenge`'s three conditions are met, showing the first missing reason under it.
- [ ] **Step 2: Active** (matches `reference/Challenge.png`): laurel `DAY n of 30`; 30-cell strip coloured by stored `result` (passed gold, redo bronze, reset crimson, today outlined, future dim; each cell also shows a glyph so colour is not the only signal); today's mission card (`missionFor`) with `Open mission` → `#mission/<n>` or `Import a pack in Settings` when null; protocols and red lines lists; links `War Log` → `#warlog`; **Declare Redo** row: enabled only when `challenge.redoUsed === null` and the day is open, else shows `Used on Day <n>`. Tapping opens an action sheet with message `One per challenge. Declare it before the event, today only. A red line is never covered.` and actions `Declare Redo` (destructive) / `Cancel`; confirm calls `declareRedo` and shows the error text if refused.
- [ ] **Step 3: Graduation** (`phase === 'finished'` or Day 30 closed): plate `YOU FINISHED` with passed / redo / reset counts, longest streak, pass rate; no further actions.
- [ ] **Step 4:** Screenshot all three states vs references. `npm test` → PASS. Commit `feat(ui): challenge tab and day 0`.

---

### Task 14: Mission detail and War Log

**Files:**
- Create: `src/views/mission.js`, `src/views/warlog.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `missionFor` (Task 6), `warEntries, setWarEntry, OATH_KEYS` (Task 5), `pushedHeader`, `goldButton`.
- Produces: `renderMission(app, [n])`, `renderWarLog(app, [])`, `renderWarEntry(app, [key])`.

- [ ] **Step 1: Mission** (`#mission/<n>`): pushed header `Day <n>`; eyebrow `Mission`; title; body paragraphs (split on blank lines, each as `<p>`); button `Write the War Log entry` → `#warlog/day-<n>`. If `missionFor` is null: plate `No mission loaded for Day <n>.` + `Import a pack in Settings.` Only `n ≤ dayNo(today)` is readable; later days show `Locked until Day <n>.`
- [ ] **Step 2: War Log list** (`#warlog`): groups from `warEntries` (`Oath`, `Autopsies`, `Days`), each row title + date + preview; oath rows with no text show `Not written yet`.
- [ ] **Step 3: Entry editor** (`#warlog/<key>`): multiline textarea (min-height 220, 16 px font), saves with `setWarEntry` on blur and on `Done`; autopsy entries are read-only. Unknown key → redirect to `#warlog`.
- [ ] **Step 4:** Screenshots (built from the plate, eyebrow and textarea patterns of `Recovery.png`; no mockup exists for these three screens, so report the choices made). `npm test` → PASS. Commit `feat(ui): mission and war log`.

---

### Task 15: Morning and Afternoon check-ins

**Files:**
- Create: `src/views/checkinMorning.js`, `src/views/checkinAfternoon.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `submitMorning, medCheck, medUsedInWeek, forcedFullPass, submitAfternoon` (Task 3), `openTasks`, `taskRow`, `switchControl`, `chips`, `textarea` styles from `Recovery.png`.
- Produces: `renderMorning(app)`, `renderAfternoon(app)`.

- [ ] **Step 1: Morning** (`#checkin/morning`; follows the question-list pattern of `reference/CheckIn.png` — numbered gold badges, plates, chips). Items: (1) `Today's #1 target` textarea, required; (2) `Red line at risk today?` optional text; (3) `Declare MED` — one switch row per protocol that has `med` text, showing the MED wording under it; header line `<used> of <medPerWeek> MED used this week`; each switch disabled with a reason line from `medCheck` (`No MED today. Yesterday was a Reset.` / `Weekly limit reached.`), and the count includes switches turned on in this form; red lines never appear here. Gold `Start the day` → `submitMorning`; on `{ok:false}` show the error under the button, on success `nav('#today')`. If a Recovery is pending, show the crimson banner at top (→ `#recovery/<date>`).
- [ ] **Step 2: Afternoon** (`#checkin/afternoon`): `Still on track?` segmented `Yes / No / Struggling`; friction textarea only for `Struggling`; today's open tasks with shield toggles and a caption `Provisional — finalizes tonight`; gold `Log it` → `submitAfternoon`, `nav('#today')`.
- [ ] **Step 3:** Both screens redirect to `#today` when the check-in is not allowed (`phase !== 'active'`, morning already filed). Screenshot vs the nearest reference; list deviations. `npm test` → PASS. Commit `feat(ui): morning and afternoon check-ins`.

---

### Task 16: Night check-in

**Files:**
- Create: `src/views/checkinNight.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `closeNight, suggestResult, nightTargets` (Task 4), `openTasks`, `tacticsFor` (Task 6), `segmented`, `chips`, `openActionSheet`.
- Produces: `renderNight(app, [date])`.

- [ ] **Step 1: Behaviour (matches `reference/CheckIn.png` section by section).** Route date must be in `nightTargets`; otherwise `nav('#today')`. Local form state lives in one object inside the view (not in `app.state`) and survives re-renders by being stored in a module variable keyed by date; it is cleared on success.
  1. **Force-resolve tasks:** every `openTasks(state,date)` row gets three big buttons `Done / Failed / Stalled`; `Stalled` is slate with caption `Genuinely couldn't act on this today. Won't count for or against you.` ◆
  2. **Protocols:** `Held / Missed` segmented per protocol; protocols declared MED this morning show `MED (declared this morning)` read-only.
  3. **Red lines:** per line `I held the line` / `I crossed it` buttons; selecting `I crossed it` turns the plate crimson (`.warn`) and shows `This is a Reset.`
  4. **Top G win** text; **Bottom G tactic:** archetype chips (5) → tactic chips from `tacticsFor` (hidden when the pack has none) → `Something else` text. `Slipped without knowing?` optional text.
  5. **Suggested result** plate: live `suggestResult(...)` with `reasons`; link `Override` reveals result chips and a required `Reason` field.
  6. Gold `Close the day` is disabled until tasks, protocols and red lines are all answered; tap opens an action sheet `This is final.` → `Close the day` / `Keep editing`; confirm calls `closeNight(state, date, form, Date.now())`; on `{ok:false}` show a plain sentence mapped from the error code; on success `nav('#today')` (or `nav('#recovery/<date>')` when the result is `reset`).
- [ ] **Step 2:** Screenshot the four states (clean pass, 1 missed, red line crossed, override open). Run the full flow once in the browser with two tasks, two protocols, one red line. `npm test` → PASS. Commit `feat(ui): night check-in`.
- [ ] **⛔ CHECKPOINT:** Owner on the iPhone: one full day (morning → night). Report any wording or ordering friction in `docs/backlog.md` (one line each); fix only blockers now.

---

### Task 17: Recovery screen

**Files:**
- Create: `src/views/recovery.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: `pendingRecovery, fileAutopsy, checkVague` (Task 5), `chips`, `goldButton`.
- Produces: `renderRecovery(app, [date])`.

- [ ] **Step 1: Behaviour (matches `reference/Recovery.png` exactly).** Header plate `DAY n: RESET` (crimson), the three effect chips (`Streak back to 0`, `Day <n+1> of 30 continues`, `Day <n+1>: no MED`), countdown plate (`<h>h <m>m left`, bar; turns crimson text `Overdue` when `overdue`), questions 1–5: state chips (`Tired Stressed Bored Triggered`), time (text, default = the closed time of that day, `HH:MM`), place chips (`Bed Desk Kitchen Out`), decision textarea, change textarea with the live nudge from `checkVague` shown after first blur. `File the autopsy` → `fileAutopsy(state,date,form,Date.now())`; success → `nav('#warlog/autopsy-<date>')`. If already filed show it read-only.
- [ ] **Step 2:** Screenshot vs `reference/Recovery.png`; test: vague `Be stronger` shows the exact nudge. `npm test` → PASS. Commit `feat(ui): recovery protocol screen`.

---

### Task 18: Analytics tab

**Files:**
- Create: `src/views/analytics.js`, `src/views/analyticsParts.js`
- Modify: `src/app.js`, `sw.js`

**Interfaces:**
- Consumes: all of `src/core/stats.js` (Task 7), `currentStreak, longestStreak`.
- Produces: `renderAnalytics(app)`.

- [ ] **Step 1: Behaviour (matches `reference/Analytics.png`).** Range segmented `7d · 30d · All` (stored in module memory); sections: Overview (passed/redo/reset counts, pass rate `NN%` or `—`, current/longest streak), PM Challenge (30-cell result strip, per-protocol held/missed/MED bars, Reset causes, enemy tactics list), Habits (weekday bars, 28-day heatmap), Tasks (done/failed/stalled totals). Charts are inline SVG built with `h`/`createElementNS`; every chart has a text summary for VoiceOver (`aria-label`). With no data: each section shows `No data yet.`
- [ ] **Step 2:** Screenshot with the Task 19 seed fixture. `npm test` → PASS. Commit `feat(ui): analytics tab`.

---

### Task 19: Settings, backup/import, reminders, seed tool

**Files:**
- Create: `src/views/settings.js`, `src/views/settingsSheets.js`, `tools/seed.mjs`
- Modify: `src/app.js`, `.gitignore` (+ `private/`), `sw.js`

**Interfaces:**
- Consumes: `validateImport, exportJson, markBackup, backupStatus` (Task 1), `validatePack, importPack` (Task 6), `startChallenge` data, `stepper`.
- Produces: `renderSettings(app)`, `openProtocolSheet(app, protocol?)`, `openRedLineSheet(app, line?)`, `exportBackup(app)` (port of v1 `exportBackup`: share sheet, falls back to download), `openRemindersSheet()`.

- [ ] **Step 1: Sections (matches `reference/Settings.png`).** Protocols (list, add/edit sheet: Title + optional `MED version` text; delete = archive: past days keep their snapshot titles); Red lines (add/edit/delete; same sheet with Name only); Challenge (Day 1 date shown; editable only while no day is closed, otherwise read-only; `Zero Day threshold` stepper 2–5; `MED per week` stepper 0–3; `Import pack` file picker → `validatePack` → confirm sheet `Replace the current pack?`); Reminders (sheet with Shortcuts steps copied from v1 `openRemindersSheet`; texts ◆: Morning 07:00 `Morning check-in. Open Lock In and file it.`, Afternoon 13:00 `Midday. Still on track? Log it.`, Night 21:30 `Night check-in. Close the day.`); Data (`Export backup`, `Import backup` with `Replace everything?` confirmation, last-backup line and overdue warning from `backupStatus`).
- [ ] **Step 2 (Review Focus 5):** import path shows the exact `error` string from `validateImport`/`validatePack` in an alert plate and never calls `app.set`; a quota-failure on `app.set` shows the existing `#save-banner`.
- [ ] **Step 3:** Replace the Day 0 stubs from Task 13 with the real sheets.
- [ ] **Step 4: `tools/seed.mjs`** — Node script that writes `private/seed-30days.json`: a valid v2 backup with generic names (`Protocol A`…, `Red line A`), a mix of passed/redo/reset days and ~20 tasks, built with the core functions. Never shipped (not under `src/`), output gitignored. Import it through Settings to screenshot Analytics/Challenge.
- [ ] **Step 5:** `node tools/seed.mjs && node -e "import('./src/core/store.js').then(m=>console.log(m.validateImport(require('fs').readFileSync('private/seed-30days.json','utf8')).ok))"` → prints `true`. `npm test` → PASS. Commit `feat(ui): settings, backup, pack import`.
- [ ] **⛔ CHECKPOINT:** Owner imports their real pack (made locally from their files, never committed) on the phone and confirms Day 1's mission appears.

---

### Task 20: Offline, version, release

**Files:**
- Modify: `sw.js`, `src/version.js`, `docs/HANDOFF.md`, `docs/backlog.md`

**Interfaces:** Consumes: everything. Produces: `VERSION = '2.0.0'` in both files.

- [ ] **Step 1:** `npm test` → PASS including `sw.test.js` (ASSETS equals every file under `src/` and `icons/` plus the five root files).
- [ ] **Step 2:** Bump `VERSION` to `2.0.0` in `sw.js` and `src/version.js`. Confirm `manifest.webmanifest`, `icons/` and the `<meta>` block in `index.html` are unchanged from v1 (install behaviour identical).
- [ ] **Step 3:** Serve, load once online, switch Chrome DevTools to Offline, reload: all five tabs, fonts and background render; one full morning → night run works.
- [ ] **Step 4: Release checklist** (write into `docs/HANDOFF.md`):
  1. On the phone, **in the v1 app: Settings → Export backup** (the v2 app does not read it, but keep the file).
  2. Merge `v2` into `main`; wait for the GitHub Pages deploy.
  3. Fully close the Home Screen app, reopen, close again, reopen (two cycles; same as v1 updates).
  4. v2 starts empty on its own key `lockin.v2`; the v1 data stays untouched in the phone's storage under `lockin.v1`.
  5. Settings → Import pack; write the four oath entries; add protocols and red lines; Begin Day 1.
  6. First install on a new phone is unchanged: Safari → open the site → Share → Add to Home Screen.
- [ ] **Step 5:** Commit `chore: release 2.0.0`. Do not merge; hand the checklist to the owner.
- [ ] **⛔ CHECKPOINT (airplane mode):** Owner installs from Safari on the phone, switches to airplane mode, opens the app, runs a morning check-in.

---

### Task 21: Audit and trial

**Files:** Modify: `docs/backlog.md`

- [ ] **Step 1:** Run `mattpocock-skills:code-review` over the whole branch; fix Critical/High, log Medium/Low in `docs/backlog.md`.
- [ ] **Step 2:** Visual pass: all 12 screens vs `reference/*.png` at 390×844; list remaining deviations with numbers (px differences), fix those > 4 px.
- [ ] **Step 3:** Accessibility pass (spec §3.9): VoiceOver order on Night, focus return after each sheet, tap targets ≥ 44 by script over `.btn, .chip, .tab, button`.
- [ ] **Step 4:** Start the 14-day trial; friction notes only, no building until day 14.

---

## Calls I made that you can overrule (also marked ◆ above)

D1 stack = existing vanilla/localStorage; D4 v1 data = fresh start, v1 key left untouched; Redo band `1 ≤ missed < zeroDay`; MED slot = one per declared protocol; no late night filing (04:00 grace only); wake-time confirmation and morning checkboxes dropped (a "Wake at …" protocol covers it); NIGHT CTA from 18:00, afternoon 12:00–17:59; missions and tactics only via pack import; Day 1 date locked after the first closed day; no new-challenge flow after Day 30; Recovery overdue = colour change only; reminder texts in Task 19.
