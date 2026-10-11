# Lock In — project rules for Claude Code

Single-user iPhone web app (PWA): a time-block planner + four goals + daily Won/Partial status + red lines, built on Hamza's system (low daily bar, ~90% of days, no streaks, volume over time). One user, phone only, hosted on GitHub Pages.

## Read first, in this order
1. `docs/superpowers/plans/2026-10-12-lockin-v2-app.md`
2. `docs/design/lockin-v2/DESIGN-SPEC.md`

## Hard rules
- Follow the plan task by task. Do not add features, screens, settings, abstractions or libraries that are not in the spec or plan. If something seems missing or ambiguous, ask the user.
- Vanilla HTML/CSS/JS (ES modules). No frameworks, no bundler, no runtime dependencies, no `npm install` into the project.
- `tests/` were written and verified before coding. **Never edit them to make them pass.** If a test looks wrong, stop and explain.
- Local dates only (`YYYY-MM-DD`). Never `toISOString`, `getUTC*`, `Date.parse`, or `new Date('YYYY-MM-DD')` on date keys.
- All asset paths are relative (GitHub Pages sub-path). No leading `/`.
- **No personal data anywhere in the repo** (public): no weights, no red-line names, no schedules, no real names. Red lines and weight target are typed into the app at runtime.
- Exact copy that must not change: slip message `Costs one day, not the month.`; the three reminder texts in the plan's Global Constraints.
- Streaks, check-ins, Top G / Bottom G, MED / Redo / Reset and the Recovery Protocol exist only as specified in docs/superpowers/plans/2026-10-12-lockin-v2-app.md (Rules). Still forbidden: XP, stars, accolades, in-app notifications, panic button, cloud sync, web push.
- Design: the Iron/Spartan design in docs/design/lockin-v2/DESIGN-SPEC.md; HIG minimums (tap, text, contrast, dark only, zoom lock) still apply. Inline SVG icons of our own (do not copy SF Symbols). Color is never the only signal. Tap targets ≥ 44 pt, text ≥ 11 pt, contrast ≥ 4.5:1 text / 3:1 graphics. Dark appearance only (owner decision 2026-10-09): no light theme, no `prefers-color-scheme` branches, no appearance toggle.
- Files stay small and single-purpose (target < 300 lines).

## Design skills
Design skills (design-taste-*, high-end-visual-design, redesign-existing-projects, gpt-taste, minimalist-ui, industrial-brutalist-ui, stitch-design-taste, image-to-code, frontend-design, web-artifacts-builder, apple-design, animate) are AUDIT-ONLY. Never apply their suggestions to code unless I explicitly approve each change. DESIGN-SPEC.md and the reference PNGs in docs/design/lockin-v2/ always win over any design skill. No React, no build step, no new dependencies.

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
