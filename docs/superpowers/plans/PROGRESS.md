# Lock In v2 — progress

Plan: `docs/superpowers/plans/2026-10-12-lockin-v2-app.md`. One entry per task, appended at the end of the task and committed with it.

## Task 0: Branch, import the design, amend the rules
- Commits: `961ac76` docs: import v2 design, amend rules; `0e4d200` docs: align CLAUDE.md with v2 plan; `70af5a0` docs: add progress ledger; "docs: fix CLAUDE.md icons, copy and sample-data rules" (the commit that adds this line; a commit cannot contain its own hash, see `git log`).
- Commands:
  - `npm test` → exit 0, 87/87 pass (before, after `961ac76`, after `0e4d200`).
  - Python `zipfile` byte compare of `docs/design/lockin-v2/` against the design zip → 65 files compared, 0 differ.
  - `git grep -n -E "<sample mockup strings>" f791613` → exit 1 (no hits in the already-pushed commit).
  - `git ls-remote origin v2` → `f791613` (nothing pushed).
- Ambiguities and choices:
  - `git switch -c v2`: branch already existed on origin; checked it out in a separate worktree instead.
  - Zip root folder is `lockin-v2-design/`; stripped it on extract. The zip itself is not committed.
  - `README.md` and `CLAUDE-CODE-PROMPTS.md` from the zip not imported (not in the plan's list; superseded prompts).
  - Owner's "Design skills" block placed as its own section after "Hard rules".
  - v1 spec §1.11 (in the Files list but no step): one line saying the v2 items are now built.
  - v1 spec §1.1–1.8: one "superseded" line under §1 rather than one per subsection.
  - Mockups contain sample red-line and schedule strings: owner confirmed they are sample, not real; kept as is.
  - CLAUDE.md aligned (owner request): intro, reminder pointer → plan Task 19, VERSION bump only in Task 20, icons only from `docs/design/lockin-v2/assets/icons`.
  - v1 spec §1.9 (times/texts differ from Task 19) and §3.1–3.8, §3.10 (replaced by DESIGN-SPEC) marked superseded; §3.9 kept (Task 21 uses it).
  - Icons rule widened to the inline SVGs in `docs/design/lockin-v2/static/` (plus, ⋯, back chevron and row chevron all exist there); missing ones are drawn inline and listed here.
  - Exact copy: slip message removed (`grep -n "Costs one day"` on the plan → exit 1); now the plan's fixed strings (Recovery nudge, tab names) plus the Task 19 reminder texts.
  - No-personal-data rule: mockup sample data stays in `docs/design/lockin-v2/`, never copied into src/, tests, defaults or seeds.
  - PROGRESS.md instruction moved to item 1 of "Read first"; plan item 2, DESIGN-SPEC item 3.
- Next: Task 1.
