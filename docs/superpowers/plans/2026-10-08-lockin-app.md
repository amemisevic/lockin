# Lock In Implementation Plan

> **For agentic workers:** Execute in ONE Claude Code session, task by task (use superpowers:executing-plans if installed; otherwise follow the steps literally). Steps use checkbox (`- [ ]`) syntax. Stop at every **⛔ CHECKPOINT** and wait for the user.

**Goal:** Build a single-user iPhone web app (PWA) that combines a time-block planner with four goals, daily "won" status and red lines, following Hamza's "low bar daily, ~90% of days, no streaks, volume over time" system, styled to Apple's Human Interface Guidelines.

**Architecture:** Static site, vanilla ES modules, no build step, no runtime dependencies. Every rule (dates, repeats, Now/Next, goal ticks, day status, window totals, commitment friction, import validation) is a pure function in `src/logic.js` or `src/store.js`, covered by the **pre-written tests in `tests/`**. Views render state into the DOM with a tiny `h()` helper. State lives in `localStorage`. Hosted free on GitHub Pages, installed from Safari ("Add to Home Screen"). Reminders are iOS Shortcuts automations the user sets up by hand (no code).

**Tech Stack:** HTML, CSS, JavaScript (ES2022 modules), Node 20+ for tests only (`node:test`), service worker, GitHub Pages. Developed on Windows.

**Spec:** `docs/superpowers/specs/2026-10-08-lockin-design.md` (product rules §1, platform facts §2, Apple HIG design §3). **Read it fully before Task 1.** Where this plan and the spec disagree, stop and ask.

## Global Constraints

- Primary device: iPhone 17 Pro Max, 440×956 pt portrait. Must not break at 375 pt width or in landscape.
- Built on Windows, no Mac. Hosted on GitHub Pages under a sub-path (`https://<user>.github.io/lockin/`), so **every asset path is relative** (no leading `/`).
- No accounts, no server, no analytics, no network calls. Data in `localStorage` key `lockin.v1`; corrupt-data backup key `lockin.v1.corrupt`; JSON export/import.
- **No personal data in the repo** (public repo): no weights, no red-line names, no schedules, no names in code, tests, docs or commits.
- Zero runtime dependencies, no bundler, no framework, no `npm install` of anything into the project. Tests use `node --test` only. (`npx serve` for local preview is allowed; it is not a project dependency.)
- **Dates:** local `YYYY-MM-DD` keys only. Never use `toISOString`, `getUTC*`, `Date.parse` or `new Date('YYYY-MM-DD')` on date keys (the only allowed UTC use is inside `daysBetween` with `Date.UTC`). Times are `HH:MM`. Weekday index Mon=0…Sun=6; weekend = Sat+Sun; week starts Monday.
- Duration chips are exactly **15, 30, 45, 60, 90, 120, 180** minutes. Slider 5–240, step 5.
- Tags exactly: **Business, Uni, Body & Health, Socializing, Unsorted** (ids `biz`, `uni`, `body`, `social`, `unsorted`). `unsorted` never feeds a goal.
- Locked goal rules: Business ≥ 60 min weekday / ≥ 240 min weekend; Uni ≥ 120 / ≥ 240; Body & Health daily check "Calories on target" (id `cal`) + weekly gym target 4; Socializing weekly target 3. **Won** = Business and Uni minimums met and Calories ticked. **Partial** = not won but something logged. No streaks, no stars.
- Slip message, exact text: `Costs one day, not the month.`
- Reminder texts, exact (shown in Settings): 09:00 `Lock in. Open the plan, put today's blocks in, start the first one.` · 13:00 `Midday check. Log what you did, then do the next block.` · 21:00 `Log today, including the red lines. Then reset for tomorrow.`
- Not built (user rejected / out of scope): wake-time setting, `.ics`, in-app notifications, panic button, Top G/Bottom G lines, morning/night screens, Screen Time passcode, streaks, stars, sync, add/delete goals, goal color picker, overnight blocks.
- HIG floors: body text 17 pt default, nothing under 11 pt; tap targets ≥ 44×44 pt; contrast text ≥ 4.5:1, graphics ≥ 3:1 in both appearances; follows system light/dark (no toggle); Reduce Motion / Reduce Transparency / Increase Contrast respected; color never the only signal.
- Commitment friction: changing a goal's rules before `committedUntil` asks for confirmation; default 30 days.
- Tests must pass in any machine time zone.

## Working rules for the executor

1. The tests in `tests/` were written and verified (45 tests, passing in UTC, Europe/Berlin, America/Los_Angeles, Pacific/Auckland) against a reference implementation. **Do not edit them to make them pass.** If you believe one is wrong, stop and tell the user why.
2. Do not add features, screens, settings, libraries or abstractions that are not in the spec or this plan. If something seems missing, ask.
3. One commit per task (message given). Never commit with failing tests. Never `git push --force`.
4. At each ⛔ CHECKPOINT: summarize what to test on the phone, then stop.
5. Keep files small and single-purpose (see File Structure). No file over ~300 lines.

## Review Focus

Failure modes the feature list never mentions; each has a test or an explicit verification step.

1. **Local date vs UTC** (00:30 in a UTC+2 time zone is still yesterday in UTC). "Today" is always the local date; the app follows midnight while open. → `tests/dates.test.js`, Task 5 (rollover), Task 7.
2. **Editing a block or deleting a series must not rewrite or erase history.** Minutes/tag/title are frozen when an occurrence is completed; "Delete This and Future" keeps the past. → `tests/blocks.test.js` (frozen history, orphan, deleteFuture).
3. **Timer left running** (phone sleeps, app closed, block deleted, garbage timestamp). Elapsed comes from the stored start; never negative; capped at 12 h; a stale timer is cleared on load. → `elapsedMin`, `sanitizeTimer` tests.
4. **Storage failure / corrupt data / bad import.** Corrupt data is preserved under a backup key and never overwritten silently; a failed save shows a persistent banner; a bad import changes nothing. → `tests/store.test.js`, Task 5 banner.
5. **Past-day editing and midnight.** Past days editable, future days not viewable on Today, viewing "today" follows midnight, a missed block on a past day shows "Missed". → `resolveViewDate` test, Tasks 5 and 7 verification.

## File Structure

| File | Responsibility |
|---|---|
| `index.html` | Shell: meta tags, save banner, view container, tab bar, dialog host |
| `styles.css` | Tokens (both appearances), text styles, components |
| `src/logic.js` | Pure rules: dates, blocks, occurrences, Now/Next, timer, move, copy, delete, goals, day status, windows |
| `src/store.js` | `defaultState`, `load`/`save`, `validateState`, `validateImport`, export, backup status |
| `src/version.js` | `export const VERSION` (also written in `sw.js`) |
| `src/dom.js` | `h()` element builder |
| `src/icons.js` | Inline SVG icon strings |
| `src/sheet.js` | Bottom sheet (`<dialog>`) and action sheet |
| `src/app.js` | App container (state, set, subscribe, viewDate), router, clock tick, mount |
| `src/views/blockRow.js` | One block row + Log Minutes sheet + delete flow (shared by Plan and Today) |
| `src/views/blockSheet.js` | New / Edit / Move block form |
| `src/views/today.js` `plan.js` `progress.js` `settings.js` | One screen each |
| `sw.js`, `manifest.webmanifest`, `icons/*.png`, `scripts/make-icons.mjs` | PWA |
| `tests/*.test.js`, `tests/fixtures.js` | Provided tests (+ `contrast.test.js`, `sw.test.js` you write) |
| `CLAUDE.md` | Project rules for Claude Code (provided) |

## Shared types

```js
// Dates 'YYYY-MM-DD' (local). Times 'HH:MM'. Weekday Mon=0…Sun=6. occId = `${blockId}:${date}` (blockId never contains ':').
/** Block: {id,title,desc,date,start,end,tag,repeat:{type:'none'|'daily'|'weekdays'|'weekends'|'custom',days:number[]},until:string|null,skip:string[]} */
/** Occ (derived): {occId,blockId,date,start,end,plannedMin,title,desc,tag,done:boolean,actualMin:number|undefined,movedTo:string|undefined} */
/** Goal: {id,name,icon,minutes:{weekday,weekend}|null,weeklyCount:{label,target}|null,checks:{id,label}[],committedUntil} */
/** State: {v:1,goals,redLines:{id,name}[],blocks,
 *   occ:Record<occId,{done?,actualMin?,movedTo?,snap?:{title,start,end,tag,plannedMin}}>,
 *   checks:Record<date,Record<checkId,boolean>>, manualMet:Record<date,Record<goalId,boolean>>,
 *   counts:Record<date,Record<goalId,number>>, red:Record<date,Record<redLineId,'held'|'slipped'>>,
 *   weights:{date,kg}[], targetWeightKg:number|null, timer:{occId,startedAt:number}|null, lastBackup:string|null} */
```

Pure functions never mutate their input; they return new objects.

---

## Tasks

### Task 1: Repo, provided tests, date helpers

**Files:** Create `src/logic.js`. Provided: `package.json`, `.gitignore`, `CLAUDE.md`, `docs/…`, `tests/*`.

**Interfaces (produces, in `src/logic.js`):**
`dateKey(d: Date): string` · `addDays(key: string, n: number): string` · `daysBetween(a: string, b: string): number` (b − a, DST-safe) · `weekdayIdx(key): number` · `isWeekend(key): boolean` · `weekStart(key): string` · `toMin(hhmm): number` (NaN if invalid) · `fromMin(min): string` · `resolveViewDate(requested: string|null, today: string): string` (null or future → today) · `uid(): string` (`crypto.randomUUID` when available, else a time+random fallback; never contains `:`)

- [ ] **Step 1:** ⚠ USER (before this session, once): install Node.js LTS (v20+) and Git; make a folder `lockin` and put the handoff files in it (the zip already has the right layout). In that folder run `git init` and `git add -A && git commit -m "chore: spec, plan, provided tests"`.
- [ ] **Step 2:** Run `node --version` (must print v20 or higher) and `npm test`. Expected: FAIL (cannot find `src/logic.js`).
- [ ] **Step 3:** Implement the ten functions above in `src/logic.js` so `tests/dates.test.js` passes. Build dates with `new Date(y, m-1, d)` and local getters; `addDays` via `setDate`; `daysBetween` via `Date.UTC` day numbers.
- [ ] **Step 4:** Run `npm test`. Expected: `tests/dates.test.js` passes (blocks/goals/store still fail; fine).
- [ ] **Step 5 (time-zone check, if your shell allows it):** PowerShell `$env:TZ='America/Los_Angeles'; npm test` then `$env:TZ='Pacific/Auckland'; npm test`; the date tests must pass in each. Reset with `Remove-Item Env:TZ`.
- [ ] **Step 6:** `git add -A && git commit -m "feat: date and time helpers"`

### Task 2: Blocks, occurrences, Now/Next, completion, move, delete, copy, timer math

**Files:** Modify `src/logic.js`. Tests (provided): `tests/blocks.test.js`.

**Interfaces (produces):**
`validateBlock(b: Block): 'title-required'|'bad-time'|'ends-before-start'|null` ·
`occurrencesOn(state, date): Occ[]` — generated from blocks (respects `repeat`, `date` start, `until`, `skip`), overlaid with the frozen `snap` if the occurrence was completed, **plus orphans** (completed occurrences on that date that no block generates any more), sorted by `start` ·
`minutesFor(occ): number` (= `actualMin` if defined, else `plannedMin` if done, else 0) ·
`nowNext(occs, nowMin): {current,next,minsLeft,minsToNext,missed}` (current: `start ≤ now < end`; done and moved occurrences never appear; `missed` = not done, not moved, `end ≤ now`; pass 1440 for a past day) ·
`completeOcc(state, occ, actualMin?): State` (sets `done`, writes `snap`, sets `actualMin` only if given, even 0) · `uncompleteOcc(state, occId): State` ·
`setOcc(state, occId, patch): State` · `upsertBlock(state, block): State` · `removeBlock(state, blockId): State` (also its `occ` entries) ·
`deleteOccurrence(state, blockId, date): State` (non-repeating → remove block; repeating → add `date` to `skip` and drop that day's `occ` entry) ·
`deleteFuture(state, blockId, date): State` (`date ≤ block.date` → remove block; else set `until = date−1` and drop `occ` entries of that block dated ≥ `date`) ·
`rescheduleDraft(occ, today): {title,desc,tag,date,start:'',durationMin}` (date = tomorrow) · `moveOccurrence(state, occId, newBlock): State` ·
`elapsedMin(startedAt, nowMs): number` (0 for garbage/future, capped at 720) · `sanitizeTimer(state): State` (clears a timer whose occurrence no longer exists or whose `startedAt` is not finite) ·
`copyDay(state, fromDate, toDate, newId: ()=>string): State` (one-off, not-done copies of non-moved occurrences)

- [ ] **Step 1:** Run `node --test tests/blocks.test.js` (or `npm test`). Expected: FAIL (missing exports).
- [ ] **Step 2:** Implement the functions in `src/logic.js`. Notes the tests depend on: `plannedMin = toMin(end) − toMin(start)`; orphan blockId = occId minus its last 11 characters; an occurrence's date = last 10 characters of its occId.
- [ ] **Step 3:** Run `npm test`. Expected: `blocks.test.js` and `dates.test.js` pass.
- [ ] **Step 4:** `git add -A && git commit -m "feat: blocks, occurrences, now/next, completion, move, delete, copy"`

### Task 3: Goal ticks, day status, windows, progress numbers

**Files:** Modify `src/logic.js`. Tests (provided): `tests/goals.test.js`.

**Interfaces (produces):**
`goalMinutes(state, date, goalId): number` · `unsortedMinutes(state, date): number` ·
`goalMet(state, date, goal): boolean|null` (`null` if the goal has neither minutes nor checks; `manualMet` forces true; goals with minutes need `weekday`/`weekend` minimum by `isWeekend`; goals with checks need every check ticked) ·
`dayWon(state, date): boolean` (every non-null `goalMet` is true, and at least one exists) · `dayStatus(state, date): 'won'|'partial'|'empty'` (partial = any goal minutes > 0, any check ticked, any count > 0 or any manual tick; unsorted minutes and red lines don't count) ·
`weekSummary(state, date): Record<goalId,{done,target,unit:'min'|'count'}>` (Monday–Sunday of `date`; minute target = 5×weekday + 2×weekend → Business 780, Uni 1080) ·
`windowTotals(state, endDate, n): {won,partial,minutes:Record<goalId,number>,counts:Record<goalId,number>,unsorted:number}` (n days ending on `endDate`, both ends inclusive) ·
`redLineSummary(state, endDate, n): {held,slipped}` (only lines that still exist) · `lifetime(state, today): {minutes,counts,unsorted}` · `needsCommitConfirm(goal, today): boolean` (`today < committedUntil`)

- [ ] **Step 1:** Run `npm test`. Expected: `goals.test.js` FAIL.
- [ ] **Step 2:** Implement in `src/logic.js` reusing Task 2 functions.
- [ ] **Step 3:** Run `npm test`. Expected: all dates, blocks, goals tests pass.
- [ ] **Step 4:** `git add -A && git commit -m "feat: goal ticks, day status, window totals"`

### Task 4: Store, defaults, export/import

**Files:** Create `src/store.js`. Tests (provided): `tests/store.test.js`.

**Interfaces (produces):**
`KEY = 'lockin.v1'`, `CORRUPT = 'lockin.v1.corrupt'` · `defaultState(today): State` (four goals exactly as in the Global Constraints, `committedUntil = today + 30`, **no red lines**, no blocks, no weights) ·
`validateState(obj): string|null` (message or null; checks `v === 1`, list/object fields, goal/block/timer shapes) · `load(storage, today): State` (empty → defaults; invalid/corrupt → defaults and the raw text copied to `CORRUPT`; valid → normalized with missing optional fields filled) · `save(storage, state): boolean` (false on any exception) ·
`exportJson(state): string` · `validateImport(text): {ok:true,state}|{ok:false,error}` · `markBackup(state, today): State` · `backupStatus(state, today): {days:number|null, overdue:boolean}` (overdue if never or > 7 days)

- [ ] **Step 1:** Run `npm test`. Expected: `store.test.js` FAIL.
- [ ] **Step 2:** Implement `src/store.js` (imports `addDays`, `daysBetween` from `logic.js`). Error messages are plain sentences (e.g. "The file is empty.", "Unsupported version. Expected v1.").
- [ ] **Step 3:** Run `npm test`. Expected: all pass (45 tests).
- [ ] **Step 4:** `git add -A && git commit -m "feat: store with defaults, safe load/save, validated import"`

### Task 5: Design system, shell, PWA install, GitHub Pages, iPhone install

**Files:** Create `index.html`, `styles.css`, `src/dom.js`, `src/icons.js`, `src/version.js`, `src/app.js`, `src/views/{today,plan,progress,settings}.js` (stubs: each exports `renderToday|renderPlan|renderProgress|renderSettings(app)` returning an element with the large title), `manifest.webmanifest`, `scripts/make-icons.mjs`, `icons/icon-180.png`, `icons/icon-512.png`, `tests/contrast.test.js`.

**Interfaces (produces):**
`h(tag: string, props?: object, ...children): HTMLElement` (props: `class`, `on<Event>`, `aria-*`, `data-*`, other keys as attributes; strings become text nodes, never `innerHTML`) ·
`icons: Record<'today'|'plan'|'progress'|'settings'|'briefcase'|'book'|'heart'|'people'|'tray'|'plus'|'ellipsis'|'check'|'chevronLeft'|'chevronRight'|'partial', string>` (SVG strings, 24 px, own drawings; no SF Symbols copies) ·
`VERSION` in `src/version.js` (`'1.0.0'`) ·
`app` in `src/app.js`: `{ state, set(updater), subscribe(fn): ()=>void, today(): string, viewDate(): string, setViewDate(key|null): void, saveFailed: boolean, version: string }` — `set` runs the updater, saves via `save()`, notifies subscribers, and shows/hides `#save-banner` (`role="alert"`, text "Couldn't save. Export a backup in Settings.") from the boolean result; `today()` recomputes `dateKey(new Date())` on every call; `viewDate()` = `resolveViewDate(requested, today())`; on startup `state = sanitizeTimer(load(localStorage, today()))` and `navigator.storage?.persist?.()` is called and ignored on failure · hash routes `#today` (default), `#plan`, `#progress`, `#settings`.

- [ ] **Step 1:** Write `tests/contrast.test.js` first. It reads `styles.css`, extracts the `--token: #hex` pairs between `/* tokens:light */` … `/* tokens:dark */` and from the dark block, then asserts with the WCAG relative-luminance formula (inline): both appearances — `--text`, `--text-2`, `--text-3`, `--accent`, `--red` each ≥ 4.5 against `--bg` and `--surface`; `--on-accent` on `--accent` ≥ 4.5; `--outline` ≥ 3 against `--surface`; each `--g-*` ≥ 3 against `--surface` and against its own 14% tint over `--surface`; `--text-2` ≥ 4.5 against each goal's 14% tint. Dark only: `--text-2`, `--text-3`, `--accent`, `--red` ≥ 4.5 against `--surface-2`.
- [ ] **Step 2:** Run `npm test`. Expected: contrast test FAIL (no `styles.css`).
- [ ] **Step 3:** Write `styles.css` with the spec §3.3 tokens in the two marker blocks, text styles (§3.4), grouped list, card, chip, segmented, row and tab-bar components (§3.6), safe-area padding, and the reduced-motion / reduced-transparency / increased-contrast media queries. Light/dark via `@media (prefers-color-scheme: dark)`; no toggle.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. If a tint assertion fails, adjust that token (not the test) and re-run.
- [ ] **Step 5:** Write `index.html` (meta: `viewport` with `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title=Lock In`, light/dark `theme-color`, `<link rel="manifest">`, `<link rel="apple-touch-icon" href="icons/icon-180.png">`; `#save-banner` hidden; `<main id="view">`; a `<nav>` floating glass tab bar with four buttons — filled icons, single-word labels, `aria-current="page"` on the active one), `src/dom.js`, `src/icons.js`, `src/version.js`, `src/app.js`, and the four stub views. Rendering must preserve `window.scrollY`; re-render on state change, on `hashchange`, every 30 s, and on `visibilitychange`/`focus` (so "today" rolls over after midnight).
- [ ] **Step 6:** Write `scripts/make-icons.mjs` (Node stdlib `zlib` only): full-bleed square PNGs, no transparency, no baked-in rounded corners (iOS masks them), 180 and 512 px, flat `#0062CC` with a white checkmark made of two thick line segments. Run `node scripts/make-icons.mjs`; open both PNGs to confirm they look right. Write `manifest.webmanifest` (`name` "Lock In", `short_name` "Lock In", `display` "standalone", `start_url` "./", `scope` "./", `background_color`/`theme_color` from tokens, both icons, relative paths).
- [ ] **Step 7:** Verify locally: `npx serve -l 5173`; open `http://localhost:5173` in Chrome DevTools device mode, custom device 440×956, DPR 3. Expected: four tabs switch views; the active tab is marked by fill plus `aria-current` (not color alone); the bar floats as a capsule with the page visible through it; "Emulate prefers-color-scheme: dark" swaps all tokens; no horizontal scroll at 375 px. In the console, `localStorage.setItem('lockin.v1','garbage')` + reload keeps the page working and creates `lockin.v1.corrupt`. Then run `grep -rn 'href="/\|src="/' index.html src styles.css` — expected: no output (all paths relative).
- [ ] **Step 8:** ⚠ USER: on github.com create a new **empty public** repository named `lockin` (no README). Claude Code then runs `git remote add origin https://github.com/<user>/lockin.git`, `git branch -M main`, `git push -u origin main` (if a browser sign-in opens, complete it). ⚠ USER: repo Settings › Pages › Build and deployment › Deploy from a branch › `main` / `/ (root)` › Save. After about a minute `https://<user>.github.io/lockin/` must load the shell.
- [ ] **Step 9:** Confirm nothing personal is in the repo: `git grep -n -i "kg\b"` shows only generic UI text, and no names appear anywhere.
- [ ] **Step 10:** ⚠ USER on the iPhone: open the Pages URL in **Safari**, Share › **Add to Home Screen**, open **the Home Screen icon** (never use the Safari tab for real data: a Home Screen app has its own separate storage). Expected: no Safari bars, content under the status bar with safe-area padding, tab bar floats above the home indicator, light/dark follows the system.
- [ ] **Step 11:** `git add -A && git commit -m "feat: design tokens, shell, PWA manifest, Pages deploy" && git push`

**⛔ CHECKPOINT A:** user confirms the shell looks right on the iPhone (tab bar, safe areas, dark mode, icon). Stop.

### Task 6: Sheets, block form, block rows, Plan

**Files:** Create `src/sheet.js`, `src/views/blockSheet.js`, `src/views/blockRow.js`; replace the `plan.js` stub; modify `styles.css`.

**Interfaces:**
Consumes: logic functions from Tasks 1–3, `h`, `icons`, `app`.
Produces:
`openSheet({title:string, action:string, content:HTMLElement, isDirty:()=>boolean, onAction:()=>boolean|void}): {close():void}` and `openActionSheet(items:{label:string,destructive?:boolean,onSelect:()=>void}[]): void` in `src/sheet.js` ·
`openBlockSheet(app, opts:{mode:'new'|'edit'|'move', occ?:Occ, draft?:object, date?:string}): void` in `src/views/blockSheet.js` ·
`blockRow(app, occ, opts:{missed:boolean}): HTMLElement`, `openLogMinutes(app, occ): void`, `openDeleteFlow(app, occ): void` in `src/views/blockRow.js` ·
`renderPlan(app): HTMLElement`

- [ ] **Step 1:** `src/sheet.js`: `<dialog>` with `showModal()` (native focus trap), grabber, **Cancel** leading, one trailing action, swipe-down dismiss from the grabber/header (pointer events; under `prefers-reduced-motion` no movement, fade only), focus returned to the opener, Esc handled via the `cancel` event, and the dirty-confirm action sheet ("Discard Changes" / "Keep Editing") on swipe, Esc or Cancel when `isDirty()`. `openActionSheet` uses the same pattern: item rows plus a **Cancel** row. Only one sheet open at a time (close the first before opening another).
- [ ] **Step 2:** `blockSheet.js` per spec wireframe §3.7: title, description, native date and time inputs, duration readout, **chips 15/30/45/60/90/120/180** (`aria-pressed`, checkmark when selected), range slider 5–240 step 5 kept in sync with the chips, "Custom end time" switch (`<input type="checkbox" switch>`) revealing a native time input (end ⇄ duration in sync), **tag chips** (Business, Uni, Body & Health, Socializing, Unsorted — icon + name), Repeat `<select>` (Never/Daily/Weekdays/Weekends/Custom days) plus seven weekday chips (M T W T F S S with full-name `aria-label`s) for Custom. Run `validateBlock` on every change and show its message inline ("Add a title.", "Enter a valid time.", "Ends before it starts. Move the end time later."); the trailing action stays disabled until valid. Titles/actions: New → "New Block"/**Add**; Edit → "Edit Block"/**Done**; Move → "Move Block"/**Move**. Edit of a repeating block shows helper text "Changes apply to every day of this series." Move mode: `draft` from `rescheduleDraft`, start empty and required; **Move** calls `moveOccurrence`. New/Move generate ids with `uid()`.
- [ ] **Step 3:** `blockRow.js`: row = 44 pt done toggle (`aria-pressed`; on → `completeOcc`, off → `uncompleteOcc`), start–end, title, tag icon + name, "80 min" (planned vs. actual when logged), and a 44 pt "…" button opening an action sheet: **Edit** (hidden for orphans), **Log Minutes** (small sheet with a native number input, 0–720, calls `completeOcc(state, occ, n)`), **Move** (hidden when done or already moved; opens the Move sheet), **Delete**. Moved rows show persistent text "Moved to Fri 9 Oct, 18:00". `missed` rows show the text "Missed" (plus the `--red` token). Delete flow: repeating block → action sheet **Delete This Day** / **Delete This and Future** / Cancel; one-off → **Delete Block** (destructive, with the line "This also removes its log.") / Cancel; orphan occurrences → **Remove Log** (`uncompleteOcc`).
- [ ] **Step 4:** `renderPlan(app)`: large title, a "+" toolbar button (accessible name "Add Block"), Mon–Sun day strip with previous/next week buttons (not a segmented control: seven items exceed the guideline of about five), the selected day's blocks as grouped `blockRow`s (missed computed with `nowNext(occs, selectedDate < today ? 1440 : selectedDate === today ? nowMin : -1)`), a **Copy Day** action (opens a sheet with a native date input and **Copy**, using `copyDay` with `uid`), and the empty state "Nothing planned. Add a block." Any date, past or future, is selectable and editable.
- [ ] **Step 5:** Verify in DevTools at 440×956 (use the console `app` only if exposed; otherwise use the UI): create "Deep work session 1", 2026-10-08, 20:30, 1 h 20 min, tag Business — end auto-fills to 21:50; toggling Custom end time and moving the slider keep chips, duration text and end in sync; a 23:00→01:00 block shows the inline error and Add stays disabled; swipe-down with edits shows the discard action sheet, and Cancel works without any gesture; a Weekdays block ticked done on Friday does not tick Monday; editing that series' title afterwards leaves Friday's done row showing the old title; "Delete This and Future" keeps earlier days; Move opens the prefilled form dated tomorrow with no time, and after choosing a time the original shows "Moved to …"; Unsorted blocks add no goal minutes (check on Today after Task 7); Copy Day creates one-off copies.
- [ ] **Step 6:** `git add -A && git commit -m "feat: sheets, block form, block rows, Plan" && git push`

**⛔ CHECKPOINT B:** user plans a real day on the iPhone and reports friction. Stop.

### Task 7: Today screen

**Files:** Replace `src/views/today.js` stub; modify `styles.css`.

**Interfaces:**
Consumes: Tasks 1–3 logic, `blockRow`, `openBlockSheet`, `app` (Task 5).
Produces: `renderToday(app): HTMLElement`, `startTimer(app, occId): void`, `finishTimer(app): void`, `cancelTimer(app): void`.

- [ ] **Step 1:** Header: large title + date; **date switcher** (44 pt previous/next chevrons, a **Today** text button; next is disabled on today). Past day → banner "Editing Tue 6 Oct" with **Back to Today**, no Now card, no Start; `app.setViewDate(null)` returns to today. Day status line ("Won" with filled check icon, or "Partial" with half-filled icon; nothing when empty) at the top of the Goals group.
- [ ] **Step 2:** **Now card** (today only), from `nowNext(occurrencesOn(state, today), nowMin)`: inside a block → goal-tinted card with icon + goal name, title, 2-line description, time range, minutes left (Title 1), thin `role="progressbar"`, **Start**; between blocks → "Free until HH:MM" + next block with **Start Now**; `missed` list under it, each with a **Move** button; no blocks → "Nothing planned." with **Add Block** and **Copy Yesterday's Plan** (`copyDay(state, yesterday, viewDate, uid)`). `startTimer` stores `state.timer = {occId, startedAt: Date.now()}` (one at a time). While a timer runs the card shows that occurrence with elapsed minutes (`elapsedMin`), **Finish** (`completeOcc(state, occ, elapsedMin(...))`, clears the timer) and a text button **Cancel Timer** (clears without logging). `aria-live="polite"` only on block start/end changes.
- [ ] **Step 3:** **Blocks** group for the viewed date: `blockRow`s (missed via `nowNext` with 1440 for past days), so forgotten days can be fixed here.
- [ ] **Step 4:** **Goals** group: four rows with 32 pt tinted badge (icon), name, progress text ("45 / 60 min"), a thin progress bar and, for Business/Uni, a 44 pt check (shows checked when computed-met and ignores taps; otherwise toggles `manualMet`). Body & Health: Calories toggle (`state.checks[date].cal`) and a gym stepper "n of 4 this week" (`counts[date].body`, weekly total from `weekSummary`). Socializing: stepper "n of 3 this week". Weekday vs weekend minimum from `isWeekend(viewDate)`. Unsorted minutes appear as a plain row only when > 0.
- [ ] **Step 5:** **Red lines** group: when `state.redLines` is empty show "Add your red lines" (text button → `#settings`). Otherwise each line has the two-segment **Held | Slipped** control (`role="radiogroup"`, equal widths, text only; tapping the selected segment clears it) writing `state.red[date][id]`; the exact slip message appears once under the list when any line is slipped on the viewed date.
- [ ] **Step 6:** Verify in DevTools at 440×956 by planning blocks through the Plan tab: between-blocks, inside-block and missed states; Start → Finish adds the logged minutes and shows Business met at 60; reload mid-timer keeps it running; deleting the running block's series then reloading clears the stale timer; switching the viewed date to yesterday shows the banner and lets you tick yesterday's block, Calories, a red line; **simulate midnight**: in DevTools › Sensors or by temporarily changing the system clock, leave the app open across 00:00 and confirm "today" becomes the new date within 30 s and yesterday's data stays intact; every control measures ≥ 44×44 pt; at browser text zoom ~300% rows restack with no truncated goal names.
- [ ] **Step 7:** `git add -A && git commit -m "feat: Today with Now card, goals, red lines, past-day editing" && git push`

**⛔ CHECKPOINT C:** the app is now usable daily. User starts using it on the iPhone (installed copy) and may keep using it while Tasks 8–11 continue. Stop.

### Task 8: Progress screen with weigh-in

**Files:** Replace `src/views/progress.js` stub; modify `styles.css`.

**Interfaces:** Consumes `windowTotals`, `weekSummary`, `redLineSummary`, `lifetime`, `unsortedMinutes`, `backupStatus`, `addDays` (Tasks 1–4), `openSheet`. Produces `renderProgress(app): HTMLElement`.

- [ ] **Step 1:** **Headline card:** "Good days: X of last 30" with the target line "Target 27 (90%)", the 90-day equivalent, and "Partial: n". **No streak anywhere.**
- [ ] **Step 2:** **Last 7 days vs. the 7 before:** rows for Business min, Uni min, gym sessions, social reps using `windowTotals(state, today, 7)` and `windowTotals(state, addDays(today,-7), 7)`, each showing both numbers and the difference as text ("+45 min", "−1") with an arrow icon (never color alone).
- [ ] **Step 3:** **This week** per goal from `weekSummary`: bar (`role="progressbar"`) + text ("3 h 10 min / 13 h", "2 of 4"); Unsorted minutes on their own plain row; lifetime totals (hours, counts) from `lifetime`.
- [ ] **Step 4:** **Red lines (30 days):** "Held n · Slipped n" from `redLineSummary`. **Backup status line:** "Last backup: N days ago" / "Never backed up"; when `overdue`, `--red` text and a **Back Up Now** button that runs the same export as Settings (shared function, put it in `src/views/settings.js` and import it).
- [ ] **Step 5:** **Weigh-in:** "Add Weigh-In" opens a sheet with a native number input (`inputmode="decimal"`, step 0.1, live validation 30–300 kg, one entry per date, replacing a same-date entry); chart is inline SVG: logged line, dashed target line when `targetWeightKg` is set, axis labels ≥ 11 pt, plus a text summary ("80.0 → 78.4 kg, target 76.0"). Empty state: "No weigh-ins yet. Add your first one."
- [ ] **Step 6:** Verify at 440×956 in light and dark: numbers match a hand calculation for two seeded days; lines distinguishable without color (solid vs dashed); all empty states render.
- [ ] **Step 7:** `git add -A && git commit -m "feat: Progress with good days, 7-vs-7, weigh-in" && git push`

### Task 9: Settings screen

**Files:** Replace `src/views/settings.js` stub.

**Interfaces:** Consumes `needsCommitConfirm`, `addDays`, `uid` (Tasks 1–3); `exportJson`, `validateImport`, `markBackup`, `backupStatus`, `defaultState` (Task 4); `openSheet`, `openActionSheet`. Produces `renderSettings(app): HTMLElement` and `exportBackup(app): Promise<void>`.

- [ ] **Step 1:** Grouped lists. **Goals:** tap → edit sheet (name; weekday/weekend minimum or weekly target; daily check labels, add/remove checks; color is fixed; `committedUntil` shown as text). The four goals cannot be added or deleted. **Red Lines:** add, rename, delete via the "…" menu (deleting hides the line from summaries; stored history is kept). **Weight:** target kg (optional). **Reminders:** row opens a sheet with the Shortcuts steps and the three exact texts from Global Constraints, each with a **Copy** button (`navigator.clipboard.writeText`; if it fails, select the text). **Data:** Export, Import, backup status, **Erase All Data** (destructive action sheet; resets to `defaultState`). Footer: "Lock In v{VERSION}".
- [ ] **Step 2:** Commitment friction: saving a goal edit when `needsCommitConfirm(goal, today)` opens an action sheet "This goal is committed until {date}. Change it anyway?" with **Change Anyway** and **Keep Goal**; a confirmed change sets `committedUntil = addDays(today, 30)`.
- [ ] **Step 3:** Export: `navigator.canShare({files})` + `navigator.share` with a `lockin-YYYY-MM-DD.json` file, falling back to an `<a download>` Blob link; on success `app.set(markBackup)`. Import: file input → `validateImport`; on failure show the error inline and change nothing; on success show a "Replace all current data?" action sheet before applying.
- [ ] **Step 4:** Verify: editing Business minimums inside the 30-day window shows the confirmation and **Keep Goal** changes nothing; export then import round-trips; importing a text file shows the error and leaves data untouched; Erase All Data returns to a clean state; Copy buttons work on the iPhone.
- [ ] **Step 5:** `git add -A && git commit -m "feat: Settings with goals, red lines, reminders, backup" && git push`

### Task 10: Service worker and offline

**Files:** Create `sw.js`, `tests/sw.test.js`; modify `src/app.js`.

- [ ] **Step 1:** Write `tests/sw.test.js` first. It reads `sw.js` as text and asserts: (a) the array literal `ASSETS` (one quoted path per line) lists `./`, `index.html`, `styles.css`, `manifest.webmanifest`, every file under `src/` (recursive) and every file under `icons/`, and every listed path exists on disk; (b) the `VERSION` string in `sw.js` equals the one exported from `src/version.js`; (c) no path starts with `/`.
- [ ] **Step 2:** Run `npm test`. Expected: `sw.test.js` FAIL (no `sw.js`).
- [ ] **Step 3:** Write `sw.js`: `const VERSION = '1.0.0'`; `const ASSETS = [ … ]` (one path per line); cache `lockin-${VERSION}`; precache on `install` (no `skipWaiting`, so a new version waits for the next full relaunch); cache-first for same-origin GETs with `index.html` as navigation fallback; delete old caches on `activate`. Register from `src/app.js` with the relative path `sw.js`.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Locally: DevTools › Application shows the worker activated and the page loads offline.
- [ ] **Step 5:** Release rule (write it into `CLAUDE.md`): any change to a shipped file bumps `VERSION` in both `sw.js` and `src/version.js`; the test enforces they match.
- [ ] **Step 6:** `git add -A && git commit -m "feat: offline service worker" && git push`. ⚠ USER on the iPhone: close the Home Screen app completely, reopen it twice (the second launch runs the new version; Settings footer shows the version), then switch on airplane mode and confirm the app still opens.

### Task 11: HIG audit, device test, fixes

**Files:** Modify whatever the audit finds; create `docs/backlog.md`.

- [ ] **Step 1:** Capture screenshots (DevTools, 440×956) of Today (today and a past day), Plan, Block sheet (new and move), Progress, Settings in light, dark and with browser text zoom ~300%. If the `apple-design` skill is installed run its review on them (all five lenses); otherwise audit against spec §3 and the accessibility checklist §3.9. Fix every Critical and High finding; list Medium/Low in `docs/backlog.md`.
- [ ] **Step 2:** ⚠ USER on the iPhone with the installed app: Larger Text at the largest accessibility size, Bold Text, Reduce Motion, Reduce Transparency, Increase Contrast, light and dark, portrait and landscape, VoiceOver through Today and the block sheet (every control announces name and state), sheet swipe-dismiss and Cancel both work, tab bar always visible.
- [ ] **Step 3:** Run `npm test`. Expected: all pass. Run the time-zone check from Task 1 Step 5 again.
- [ ] **Step 4:** `git add -A && git commit -m "fix: HIG audit and device test findings" && git push`

**⛔ CHECKPOINT D (done):** 14-day trial. Use the app daily and write friction notes in `docs/backlog.md`; build nothing from the list until day 14. Success reading on day 14: Progress shows week 2 ≥ week 1 on Business min, Uni min, gym and social, and good days trend toward 27 of 30.

---

## Self-review

- **Spec coverage:** day rule/Partial (T3, T7), Hamza scoreboard without streak (T8), date switcher and past-day editing (T5, T7), reminders via Shortcuts (T9, Global Constraints), Calories-only daily check (T4), frozen history and delete choices (T2, T6), Copy Day and Copy Yesterday (T2, T6, T7), stale timer (T2, T5), backup status and Erase (T4, T8, T9), storage failure banner (T4, T5), separate Home Screen storage (T5 step 10, spec §2), offline + versioning (T10), nothing personal in repo (T4, T5), no red lines shipped (T4, T7).
- **Deliberate ceilings:** no overnight blocks; editing a repeating block edits the whole series (completed days stay frozen); one running timer; the Now card is only correct while the app is open; reminders show "Shortcuts" as sender with no tap-to-open; updates need a full relaunch; `localStorage` (~5 MB) is ample for years of blocks.
- **Open items to confirm on the device:** which `-apple-system-*` font keywords resolve in a Home Screen web app; `prefers-reduced-transparency` support; `<input switch>` rendering (Safari 17.4+); text zoom behavior of `-apple-system-*` fonts.
