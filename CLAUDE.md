# Lock In — project rules for Claude Code

Single-user iPhone web app (PWA): a time-block planner + four goals + daily Won/Partial status + red lines, built on Hamza's system (low daily bar, ~90% of days, no streaks, volume over time). One user, phone only, hosted on GitHub Pages.

## Read first, in this order
1. `docs/superpowers/specs/2026-10-08-lockin-design.md` (what to build and the Apple HIG design)
2. `docs/superpowers/plans/2026-10-08-lockin-app.md` (how, task by task)

## Hard rules
- Follow the plan task by task. Do not add features, screens, settings, abstractions or libraries that are not in the spec or plan. If something seems missing or ambiguous, ask the user.
- Vanilla HTML/CSS/JS (ES modules). No frameworks, no bundler, no runtime dependencies, no `npm install` into the project.
- `tests/` were written and verified before coding. **Never edit them to make them pass.** If a test looks wrong, stop and explain.
- Local dates only (`YYYY-MM-DD`). Never `toISOString`, `getUTC*`, `Date.parse`, or `new Date('YYYY-MM-DD')` on date keys.
- All asset paths are relative (GitHub Pages sub-path). No leading `/`.
- **No personal data anywhere in the repo** (public): no weights, no red-line names, no schedules, no real names. Red lines and weight target are typed into the app at runtime.
- Exact copy that must not change: slip message `Costs one day, not the month.`; the three reminder texts in the plan's Global Constraints.
- No streaks, no stars, no gamification, no in-app notifications, no wake-time setting, no panic button, no Top G/Bottom G lines, no morning/night screens.
- Design: Apple HIG as written in spec §3. Inline SVG icons of our own (do not copy SF Symbols). Color is never the only signal. Tap targets ≥ 44 pt, text ≥ 11 pt, contrast ≥ 4.5:1 text / 3:1 graphics, both appearances, no appearance toggle.
- Files stay small and single-purpose (target < 300 lines).

## Commands
- Test: `npm test` (runs `node --test`)
- Preview: `npx serve -l 5173`, then Chrome DevTools device mode, custom 440×956, DPR 3

## Workflow
- One commit per task using the message in the plan. Never commit failing tests. Never force-push.
- Stop at every ⛔ CHECKPOINT in the plan and tell the user exactly what to test on the iPhone.
- **Release rule:** any change to a shipped file bumps `VERSION` in both `sw.js` and `src/version.js` (a test enforces they match). Users must fully close and reopen the Home Screen app twice to get an update.

## Platform facts
- A Home Screen web app has its own storage, separate from Safari. Real data is entered only in the installed app.
- Deleting the Home Screen icon deletes the data. Export (Settings) is the only backup.
