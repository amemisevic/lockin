# STATUS
- Task: fix failed/missed selected colour. Branch help.
- Result: DONE. Failed (task) and Missed (protocol) now carry `opt-failed`, which shares the Crossed crimson-dk fill with white label (5.7:1). Labels unchanged; no Reset text touched.
- Root cause: segmented() adds a class only if the option has `cls`; Failed and Missed had none, so `.seg button.on` painted them gold.
- HEAD: see `git log -1` on help (commit "fix: failed/missed selected colour"). Tests: npm test 1331 pass, 0 fail, 1 skipped.
- Changed files: src/views/checkinNight.js, src/night.css, tests/css-option-class.test.js (assertions appended to the existing T16-4 test; no existing assertion changed), docs/STATUS.md.
- Deviations: Recovery form has no failed/missed options (neutral chips), so nothing to fix there. Not reproduced in the browser, no src/core change, no VERSION bump.
- Needs ruling: none.
- Phone check: Night at #checkin/night/2026-10-24: select Failed and Missed, expect crimson with white label; Done/Held stay gold; Stalled slate, Crossed crimson as before.
- Next: owner iPhone check.
