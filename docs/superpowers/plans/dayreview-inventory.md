# DR0: Day review inventory (read-only)

Ruling (Armin, A): Day review is read-only. Tapping a day on the 30-day strip shows what was written that day. Field names only, no real data. Gym data is out of scope.

All state is one object saved under localStorage key `lockin.v2` (`src/core/store.js` `KEY`), shape and validator in `src/core/model.js`. Every write goes through `app.set(updater)` in `src/app.js`, which saves the whole state.

## 1. Per-day fields

### `state.days[YYYY-MM-DD]` (object keyed by date; `dayOk` in model.js)

| Field | Shape | Writer (file, function) |
|---|---|---|
| `morning` | `null` or `{ at: ms, target: str, risk: str, med: [protocolId] }` | `core/challenge.js` `submitMorning` |
| `afternoon` | `null` or `{ at: ms, onTrack: 'yes'/'no'/'struggling', friction: str }` (friction only kept when `struggling`) | `core/challenge.js` `submitAfternoon` |
| `declaredRedo` | bool | `core/challenge.js` `declareRedo` (also sets `challenge.redoUsed` to the date) |
| `night` | `null` or `{ at, protocols: [{id, title, status: held/missed/med}], redLines: [{id, name, status: held/crossed}], win: str, bottomG: {archetype, tactic, text}, suggested: result, override: null or {result, reason} }`. Titles and names are snapshots. | `core/scoring.js` `closeNight` |
| `slipNote` | str (the "Slipped without knowing?" box) | `closeNight` |
| `incompleteMorning` | bool | `closeNight`, `settleMissed` |
| `auto` | `null` or `'no-night'` | `core/scoring.js` `settleMissed` |
| `result` | `null` or `passed`/`redo`/`reset` | `closeNight` (override wins over `suggested`), `settleMissed` (always `redo`) |
| `closedAt` | `null` or ms | `closeNight`, `settleMissed` (the 04:00 grace end) |

"Result" in the task text means `result`; there is no separate autopsy in `days`.

### Other per-day records outside `days`

| Record | Key and shape | Writer |
|---|---|---|
| Task statuses | `state.taskLog[date][taskId]` = `done`/`failed`/`stalled`. Absent id = open. | `core/tasks.js` `setTaskStatus` (Tasks tab, and `closeNight` for the settle step) |
| Recovery (autopsy form) | `state.recovery[date]` = `{ dueAt, filedAt (null until filed), state, time, place, decision, change }`. Created on a `reset` close with empty strings. | created by `closeNight`; filled by `core/recovery.js` `fileAutopsy` |
| Autopsy War Log copy | `state.warLog['autopsy-YYYY-MM-DD']` = `{ text, updatedAt }`; text is the five answers as `Label: value` lines | `fileAutopsy` via `core/warlog.js` `setWarEntry` |
| Day notes | `state.warLog['day-N']` = `{ text, updatedAt }`. Keyed by challenge day NUMBER 1 to 30, not by date. | `views/warlogLogic.js` `saveEntry` -> `setWarEntry` |

Not per-day: `challenge.protocols/redLines` (current lists), `setup`, `pack`, `settings`.

## 2. Day key and how the strip finds a day

- Key = local date `YYYY-MM-DD`, built by `dateKey(new Date())` (`src/logic.js`); `app.today()` wraps it. `addDays(key, n)` walks keys. No UTC.
- Day number: `dayNo(state, date)` (`core/challenge.js`) = `daysBetween(startDate, date) + 1`, `null` before the start. Inverse: `addDays(challenge.startDate, n - 1)`.
- Strip: `stripCells(state, today)` (`views/challengeLogic.js:41`) returns 30 cells `{ n, date, kind }`. `date = addDays(startDate, i)`; `kind` = `state.days[date].result`, else `today` / `future` / `open` (past, no result). So each cell already carries its date key.

## 3. A day with nothing logged

No key at all: `state.days[date]` is `undefined`. Days are created lazily by `putDay` (first morning, afternoon or Redo declaration) or by `closeNight` / `settleMissed`. A past day with no entry is auto-closed by `settleMissed` once its 04:00 grace has passed: then it holds the default shape with `result: 'redo'`, `auto: 'no-night'`, `night: null`, `morning: null`, `incompleteMorning: true`, `closedAt` set. A future day, or today before anything is filed, stays `undefined`. `taskLog[date]`, `recovery[date]`, the `autopsy-` and `day-N` entries are likewise absent when unused.

## 4. The 30-day strip

- Challenge tab: `src/views/challenge.js`, `hero()` (line 68) builds `div.ch-strip` from `cells.map(c => cell(c, dr))`; `cell` (line 61) is a plain `div` with `role="img"` and an `aria-label`. **No tap handler, no button.** It can reach nothing today.
- Analytics tab: `views/analyticsParts.js` `strip()` reuses the same `cell` inside a `role="img"` container, also not interactive.
- Both consume `stripCells`. The `app` object is available in `challenge.js` (`app.nav`, `app.state`, `app.today()`), so wiring a tap needs no new plumbing. Routes are hash based (`app.nav('#warlog')`, `#mission/N`).

## 5. Can one day's full record come from existing core exports?

**Yes. No `src/core` change is needed.** From `app.state` and the date key:

- `state.days[date]` (direct read of the plain object): morning, afternoon, declaredRedo, night, slipNote, incompleteMorning, auto, result, closedAt.
- `dayNo(state, date)` from `core/challenge.js`: the day number, for the `warLog['day-N']` note.
- `state.warLog['autopsy-' + date]` and `state.warLog['day-' + n]`: plain reads; `warEntries(state)` from `core/warlog.js` also lists them.
- `state.recovery[date]`: plain read (autopsy answers and `filedAt`).
- `tasksOn(state, date)` from `core/tasks.js`: the tasks due that day with status. Caveat: it reads the CURRENT task list, so edited or archived tasks show their current title and repeat rules. `state.taskLog[date]` gives only ids and statuses.
- `stripCells(state, today)` gives `date` per cell for the tap target.

Gaps, for the owner to know (no code needed, only a display decision): task titles are not snapshotted per day (see caveat); protocol and red-line names ARE snapshotted inside `night`. A day with no `days[date]` entry has nothing to show beyond optional task statuses.

NEEDS RULING: none for src/core. If the owner wants a single helper (for example `dayRecord(state, date)`) it would live in `src/views/` (a new Logic file), not in core; not proposed, since the reads above are one line each.
