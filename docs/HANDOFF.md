# Session handoff — Lock In

Written 2026-10-09. Read `CLAUDE.md`, then the spec and plan in `docs/superpowers/`, then this page.

## 1. State (checked with `git status`, `git log -3`, `npm test`)
- Version **1.0.17** (`src/version.js` = `sw.js`). Last code commit: "feat: Spartan helmet app icons" (icon part of redesign step 5, done early at the owner's request). Before it: "style: dark only" (1.0.15), "copy: sentence case section names" (1.0.16).
- **Section names and headers are sentence case** ("Red lines", "Daily checks", "Limit (optional)"); buttons, tabs and sheet titles stay Title-style (spec §3.8).
- **87 tests, 87 pass, 0 fail** (`npm test`). Also passed under `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland` (set `TZ` from PowerShell: Git Bash on Windows does not pass it to Node).
- Working tree clean, `main` pushed (`origin/main` = `d5b8ecc` before this commit). Live on GitHub Pages.

## 2. Done
| Work | Commit |
|---|---|
| Task 1 dates · 2 blocks · 3 goals · 4 store | `fdcbc6c` · `d5f385c` · `8a22eed` · `81d83b3` |
| Task 5 shell, tokens, PWA, Pages | `c54e647` |
| Task 6 sheets, block form, Plan | `23ce0bf` (+ `ba69952` tag required, `4fb8be5` sheet fix) |
| Task 7 Today | `874a103` |
| Zoom lock · timer seconds | `9b92022` · `1f89ea3` |
| Task 8 Progress · Task 9 Settings | `a325d02` · `5e101f9` |
| Measured red lines (data/logic/tests · UI) | `054c121` · `d5b8ecc` |
| Clear a measured red-line log | `443182d` |
| Log time on Today blocks (replaces Log Minutes) | `126b050` |
| Task 10 offline service worker | `03a31ac` |
| Task 11 HIG audit + code review fixes | fix: HIG audit and device test findings |

## 3. In progress
**Visual redesign "Iron"** (owner-approved 2026-10-09; spec §3.1, §3.3, §3.4 updated). Visual only, no logic changes, copy unchanged. Five steps, one commit each, each version-bumped, ⛔ owner checks on the iPhone after each:
1. [x] Tokens, self-hosted fonts (`src/fonts/`, OFL texts beside them), base type, materials, tab bar, sheet chrome, list/menu components (1.0.14).
2. [ ] Today. 3. [ ] Progress (dataviz rules), then Plan. 4. [ ] Settings and every remaining sheet. 5. [x] App icons (1.0.17): `python scripts/make-icons.py` (Pillow, dev-only) writes `icons/` from `design-reference/lockin-logo-gray.png` (never shipped); 32/16 favicons use the gold outline variant. [ ] In-app logo tile + wordmark go with step 4 (Settings).
**Dark only (1.0.15, owner decision 2026-10-09):** the light theme is removed for good: one token set after `/* tokens:dark */`, `color-scheme: dark`, no `prefers-color-scheme` anywhere (asserted by `tests/contrast.test.js`), dark PWA chrome (`#0A0A0B`, status bar `black-translucent`). Never re-add light tokens or appearance branches.
Rules: gold text only via solid `--accent`; gradients only for fills/edges/bars; every change measured (contrast from rendered pixels, 44 pt targets, AX5, 147 px, landscape, dark, Reduce Transparency and Increase Contrast emulated). Shipped files must sit under `src/` or `icons/` (the ASSETS test only scans those). `design-prototypes/` and `design-reference/` are never committed.

## 4. Next, in order
- [x] **a. Clear a measured red-line log** — done (owner approved 2026-10-09; spec §3.10).
- [x] **b. Task 10** done (1.0.12). `tests/sw.test.js` keeps `ASSETS` equal to the shipped files: add a file → add it to `ASSETS`. ⛔ Checkpoint: owner tests airplane mode on the iPhone.
- [x] **c. Task 11** done (1.0.13): 6 High fixed, Medium/Low listed in §8 and `docs/backlog.md`. ⛔ Checkpoint: owner runs the iPhone checks (plan Task 11 Step 2).
- [ ] **d. 14-day trial** (plan Checkpoint D).

## 5. Decisions a fresh session could get wrong
- **Zoom is locked on purpose** (owner's choice; spec §2). Do not "fix" it. Form controls stay ≥ 16 px.
- **Goal rule changes** (minimums, weekly target, daily checks) ask for confirmation inside the 30-day window and restart the 30 days; **renames never ask** (spec §1.10 says "rules").
- **Comma decimals are accepted** everywhere a decimal is typed (`78,4` = `78.4`); fields are text + `inputmode="decimal"`, not `type=number`.
- **Amount equal to the limit = Held** (`amount <= limit`).
- **Unlogged days are not Held**; they count as "not logged".
- **A deleted red line stays hidden on Progress** (owner confirmed); its history stays in the data with its frozen name.
- **Editing a past measured day keeps that day's frozen limit**; only a new log uses the current limit.
- **Tracked time is whole minutes** (`actualMin`), never seconds (owner). **Finish adds** elapsed minutes to the stored total (owner). Log Minutes is gone; Log time on Today rows replaces it.

## 6. Open phone checks (untested on the iPhone)
Owner confirmed on 2026-10-09 that all earlier checks pass (zoom lock, timer seconds, measured red lines incl. Clear, Log time, Reduce Transparency, Increase Contrast, landscape). Task 10 offline: open (two close/reopen cycles, airplane mode opens all four tabs with data intact). Task 11: open (plan Step 2: largest Larger Text, Bold Text, Reduce Motion, Reduce Transparency, Increase Contrast, light/dark, portrait/landscape, VoiceOver through Today and the block sheet, sheet swipe-dismiss and Cancel, tab bar always visible; Settings shows 1.0.13).

## 7. Gotchas
- **Release rule:** any change to a shipped file bumps `VERSION` (`src/version.js`, and `sw.js` once it exists). Two separate changes = two bumps.
- **Updating the phone:** fully close and reopen the Home Screen app. Since Task 10 (service worker) it takes **two** close/reopen cycles (first installs, second runs).
- **Files < 300 lines.** `logic.js` is at 241 → new logic goes in its own module (as `redlines.js` did). Styles: tokens/components in `styles.css`, screens in `screens.css`; the contrast test reads tokens from `styles.css` only.
- **Git author:** set in this repo's local config only (GitHub noreply address). Never commit with a personal email. Stage explicit paths, never `git add -A`.
- **Gitignored:** `PROMPT.md`, `START-HERE.md`, root `*.png` screenshots, and `.superpowers/` (the work ledger is `.superpowers/sdd/2026-10-08-lockin-app/progress.md`, local only).
- Local preview: `npx serve -l 5173`.

## 8. Task 11 findings listed, not fixed (owner decides; same list in `docs/backlog.md`)
Fixed in 1.0.13 (High): tab bar off screen at large text/zoom (wraps to a 2nd row) · Held|Slipped and Add|Replace clipped at large text (stack) · Large Title off screen at AX5 (`calc(1em + 17px)`) · sheet Cancel/action off screen at AX5 (title column gives way) · Log time on a moved original counted minutes on the old day · Settings overdue backup was red only (adds "Back up now.").

| Sev | Where | Finding |
|---|---|---|
| Medium | all icons | Icons stay 24 px at AX5; HIG asks meaningful icons to grow with text (`typography.md › Supporting Dynamic Type`). |
| Medium | `timeLog.js` | Add on a block ticked done without logged minutes starts from 0 (ledgered owner ruling); a ticked 60-min block + Add 30 = 30. |
| Low | `#view` padding | At AX5 the last row sits 6 px under the 2-row tab bar at max scroll (Copy Day bottom 790, bar top 784). |
| Low | sheet headers | At AX5 titles wrap in a ~100–130 px column and break mid-word ("Log Tim/e"). |
| Low | tab bar glass | Theoretical worst case (no blur, solid black directly behind, light) selected label 4.03:1; blur and the scroll-edge fade raise it; opaque fallback 4.71 light / 5.06 dark. |
| Low | 300 % zoom only | Zoom is locked on the phone: long words clip in block meta, Settings goal rows, Progress "Socializing"; Log Amount "Clear" off screen; large title breaks mid-word. AX5 emulation shows none of these. |
| Low | `index.html:19` | Banner says "…Export a backup in Settings." vs spec §2 "Couldn't save. Export a backup." |
| Low | `blockSheet.js:60` | Weekday chips have no checkmark (spec §3.6 chip rule); selection = fill + `aria-pressed`. |
| Low | `blockSheet.js:49` | `aria-live` on the duration text announces every slider step (spec §3.9 limits live regions to the Now card). |
| Low | `logic.js:122` | Unticking a block drops its logged `actualMin`. |
| Low | `icons.js:36` / `store.js:34` | An imported goal with an unknown icon name renders the text "undefined". |
| Low | `today.js:139` | Daily-check DOM id from the label with non-word chars stripped; near-identical labels collide (focus restore only). |
| Low | `tests/export-1.0.7.json` | Holds weight 72.5 / target 70: confirm these are made up (no personal data rule). |
| Low | history | `4fb8be5` changed `src/sheet.js` without a VERSION bump (HEAD consistent). |
| Low | smells | Duplicated: backup text (`settings.js`/`progress.js`), weight parse, progress-bar builder, tag lookup, segmented control, en-GB formatters, form-row helper; `finishTimer` repeats `logTime`'s add rule; `occId.slice(-10)` bypasses `occDate`; measured-entry `typeof` check in 3 files; `whole` defined twice; views import helpers from other views; lines > 200 chars. |
