# Session handoff — Lock In

Written 2026-10-09. Read `CLAUDE.md`, then the spec and plan in `docs/superpowers/`, then this page.

## 1. State (checked with `git status`, `git log -3`, `npm test`)
- Version **1.0.12** (`src/version.js` = `sw.js`). Last code commit: "feat: offline service worker" (Task 10).
- **86 tests, 86 pass, 0 fail** (`npm test`). Also passed under `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland`.
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
| Task 10 offline service worker | feat: offline service worker |

## 3. In progress
Nothing.

## 4. Next, in order
- [x] **a. Clear a measured red-line log** — done (owner approved 2026-10-09; spec §3.10).
- [x] **b. Task 10** done (1.0.12). `tests/sw.test.js` keeps `ASSETS` equal to the shipped files: add a file → add it to `ASSETS`. ⛔ Checkpoint: owner tests airplane mode on the iPhone.
- [ ] **c. Task 11** HIG audit + code review (backlog item: at ~300 % browser zoom the 4-tab bar clips "Settings").
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
Owner confirmed on 2026-10-09 that all earlier checks pass (zoom lock, timer seconds, measured red lines incl. Clear, Log time, Reduce Transparency, Increase Contrast, landscape). Open: Task 10 offline (two close/reopen cycles, Settings shows 1.0.12, airplane mode opens all four tabs with data intact).

## 7. Gotchas
- **Release rule:** any change to a shipped file bumps `VERSION` (`src/version.js`, and `sw.js` once it exists). Two separate changes = two bumps.
- **Updating the phone:** fully close and reopen the Home Screen app. Since Task 10 (service worker) it takes **two** close/reopen cycles (first installs, second runs).
- **Files < 300 lines.** `logic.js` is at 241 → new logic goes in its own module (as `redlines.js` did). Styles: tokens/components in `styles.css`, screens in `screens.css`; the contrast test reads tokens from `styles.css` only.
- **Git author:** set in this repo's local config only (GitHub noreply address). Never commit with a personal email. Stage explicit paths, never `git add -A`.
- **Gitignored:** `PROMPT.md`, `START-HERE.md`, root `*.png` screenshots, and `.superpowers/` (the work ledger is `.superpowers/sdd/2026-10-08-lockin-app/progress.md`, local only).
- Local preview: `npx serve -l 5173`.
