# STATUS
- Task: T21-6 visual pass (step 5a). Branch `help`. Not pushed. No VERSION bump.
- Result: 2 fixed (3 commits with docs), 12 deviations logged in docs/backlog.md (V-01 to V-12), 2 need a ruling. Screens measured at 440 and 390: no overflow, no clipped text.
- HEAD: see `git log -1` (docs commit on top of 431e6f4).
- Tests: precheck 1329 (1328 pass, 0 fail, 1 skipped); after 1332 (1331 pass, 0 fail, 1 skipped), exit 0. 3 new tests.
- Changed: settings.js, recovery.css, 2 new tests, backlog.md, PROGRESS.md.
- Per screen: Today deviation (strip 110 vs 133, no pips, rows with dots) logged. Tasks pass (rows match, `.more` 44 vs 40 HIG). Challenge deviation 56 px at 390 logged, pass at 440. Analytics deviation (range 54 vs 48, padding, tiles) logged. Settings title 18 px FIXED, order differs logged. Day 0 deviation (hero text, button 52 px narrower) logged. Night deviation 13 px logged. Recovery time field 210 px and answers 8 px FIXED, countdown plate 52 px logged. War Log, Mission, hatch, editor: no board, not measured.
- Needs ruling: V-01 Challenge "?" and pill wrap at 390; V-07 30-day buttons 29 wide.
- Phone check: Settings title higher (no "Lock In" line); Recovery form time field short, answers a bit taller. Not run: iPhone.
- Next: owner phone check, then step 5b.
