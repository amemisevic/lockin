# Backlog

## Task 11 audit and code review (2026-10-09, v1.0.13): Medium and Low, not fixed
Build nothing from this list without the owner's go-ahead. Critical/High were fixed in 1.0.13 (see `docs/HANDOFF.md` §8).

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

## 14-day trial friction notes (plan Checkpoint D)
Write one line per friction, dated. Build nothing from this list until day 14.
