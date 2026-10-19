# Lock In — project rules for Claude Code

Single-user iPhone web app (PWA): the 5-tab PM Challenge app (Today · Tasks · Challenge · Analytics · Settings) as specified in `docs/superpowers/plans/2026-10-12-lockin-v2-app.md`. One user, phone only, hosted on GitHub Pages.

## Read first, in this order
1. Read docs/superpowers/plans/PROGRESS.md first. At the end of every task, append an entry (task number, commit hash, commands run with exit codes, ambiguities and choices, next task) and commit it with the task.
2. `docs/superpowers/plans/2026-10-12-lockin-v2-app.md`
3. `docs/design/lockin-v2/DESIGN-SPEC.md`

Gym work (v2.1, branch `gym`): also read `docs/superpowers/plans/v2.1-gym-plan.md` (plan) and `docs/superpowers/plans/gym-plan-draft.md` (task breakdown). Log it in `docs/superpowers/plans/PROGRESS-GYM.md` (not PROGRESS.md); its Decisions section holds the owner rulings.

## Hard rules
- Follow the plan task by task. Do not add features, screens, settings, abstractions or libraries that are not in the spec or plan. If something seems missing or ambiguous, ask the user.
- Vanilla HTML/CSS/JS (ES modules). No frameworks, no bundler, no runtime dependencies, no `npm install` into the project.
- `tests/` were written and verified before coding. **Never edit them to make them pass.** If a test looks wrong, stop and explain.
- Local dates only (`YYYY-MM-DD`). Never `toISOString`, `getUTC*`, `Date.parse`, or `new Date('YYYY-MM-DD')` on date keys.
- All asset paths are relative (GitHub Pages sub-path). No leading `/`.
- **No personal data anywhere in the repo** (public): no weights, no red-line names, no schedules, no real names. Red lines and weight target are typed into the app at runtime. Exception: mockup sample data inside docs/design/lockin-v2/ stays there. Never copy it into src/, tests, defaults or seeds.
- Exact copy that must not change: Recovery nudge `Too vague. Name something you will block, delete or move.`; tab names `Today`, `Tasks`, `Challenge`, `Analytics`, `Settings`.
- Streaks, check-ins, Top G / Bottom G, MED / Redo / Reset and the Recovery Protocol exist only as specified in docs/superpowers/plans/2026-10-12-lockin-v2-app.md (Rules). Still forbidden: XP, stars, accolades, in-app notifications, panic button, cloud sync, web push.
- Design: the Iron/Spartan design in docs/design/lockin-v2/DESIGN-SPEC.md; HIG minimums (tap, text, contrast, dark only, zoom lock) still apply. Use only the icons in docs/design/lockin-v2/assets/icons and the inline SVGs already used in docs/design/lockin-v2/static/. If the plan needs one that exists in neither, draw it inline in the same stroke style and list it in PROGRESS.md. Color is never the only signal. Tap targets ≥ 44 pt, text ≥ 11 pt, contrast ≥ 4.5:1 text / 3:1 graphics. Dark appearance only (owner decision 2026-10-09): no light theme, no `prefers-color-scheme` branches, no appearance toggle.
- Files stay small and single-purpose (target < 300 lines).

## Design skills
Design skills (design-taste-*, high-end-visual-design, redesign-existing-projects, gpt-taste, minimalist-ui, industrial-brutalist-ui, stitch-design-taste, image-to-code, frontend-design, web-artifacts-builder, apple-design, animate) are AUDIT-ONLY. Never apply their suggestions to code unless I explicitly approve each change. DESIGN-SPEC.md and the reference PNGs in docs/design/lockin-v2/ always win over any design skill. No React, no build step, no new dependencies.

## Commands
- Test: `npm test` (runs `node --test`)
- Preview: `npx serve -l 5173`, then Chrome DevTools device mode, custom 440×956, DPR 3

## Workflow
- One commit per task using the message in the plan. Never commit failing tests. Never force-push.
- Stop at every ⛔ CHECKPOINT in the plan and tell the user exactly what to test on the iPhone.
- **Release rule:** Bump VERSION only in the plan's release task (Task 20), not per task. `VERSION` in `sw.js` and `src/version.js` must match (a test enforces it). Users must fully close and reopen the Home Screen app twice to get an update.

## Platform facts
- A Home Screen web app has its own storage, separate from Safari. Real data is entered only in the installed app.
- Deleting the Home Screen icon deletes the data. Export (Settings) is the only backup.
