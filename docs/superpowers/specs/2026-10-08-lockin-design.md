# Lock In — Design Spec

Single-user iPhone web app (PWA) for one person. Built around Hamza's video (https://www.youtube.com/watch?v=BhiXGbjyrdE): **lower the bar for a good day, hit it on ~90% of days, no streaks, consistency = volume over time, a bad day is a U-turn not a reset.** Locked by the user in chat on 2026-10-08.

## 0. Intent and success

- **Intent:** tell the user what to do *right now*, make planning/logging cost seconds, and show whether he is hitting the low daily bar often enough.
- **Success (his words: "improving consistently, like Hamza explained"):** Progress shows (a) **Good days: X of the last 30, target 90% = 27**, and (b) the last 7 days vs. the 7 before them (Business min, Uni min, gym sessions, social reps). Day 14 counts as success if week 2 ≥ week 1 on those numbers. There is **no streak anywhere**.
- **Users/devices:** one user, iPhone 17 Pro Max, installed from Safari to the Home Screen. Phone only; no sync. Built on Windows via Claude Code; hosted free on GitHub Pages (public repo).

## 1. Product rules

### 1.1 Screens
Today, Plan, Progress, Settings (4 tabs).

### 1.2 Goals (exactly four, fixed set; rename and retune only)
| Goal id | Name | Daily rule (decides "won") | Weekly target (never fails a day) |
|---|---|---|---|
| `biz` | Business | ≥ 60 min Mon–Fri, ≥ 240 min Sat–Sun | — |
| `uni` | Uni | ≥ 120 min Mon–Fri, ≥ 240 min Sat–Sun | — |
| `body` | Body & Health | daily check "Calories on target" (id `cal`) | Gym sessions: 4 per week, any days |
| `social` | Socializing | none | Social reps: 3 per week |

Plus tag `unsorted` (never feeds any goal; its minutes are shown on their own line).

### 1.3 Day status (the locked rule)
- **Won** = Business minimum met **and** Uni minimum met **and** the Calories check ticked (every goal that has a daily rule is met). Weekly goals and red lines never decide it.
- **Partial** = not won, but some work is logged: any goal minutes > 0, any daily check ticked, any weekly count > 0, or any manual tick. Unsorted minutes and red lines do not count.
- **Empty** = nothing logged.
- Partial is shown as the text "Partial" with a half-filled marker (never color alone). It is not a failure and not a win.
- A missed day changes nothing else: no reset, no counter to zero. The next day is the U-turn.
- Weekend minimums total 8 h (4 + 4). User chose to keep them from day 1. At 90% of 30 days, about 3 non-won days a month are allowed; Progress shows the count so the user can lower them later.

### 1.4 Minutes counting
An occurrence's minutes = `actualMin` (whole minutes, no seconds) if a timer or **Log time** set it (even 0), else its planned minutes if it is ticked done, else 0. **Minutes and tag are frozen on the day when the occurrence is completed** (snapshot), so later edits to a block never rewrite history.

### 1.5 Today
- **Date switcher** under the title: previous/next day and a "Today" button. Any **past** day is fully editable (so forgotten logging can be fixed after midnight); **future** days cannot be viewed on Today (use Plan). The ephemeral viewed date is not saved.
- **Today (viewed date = today):** *Now card* reads the clock and the Plan: inside a block → title, description, time range, minutes left, **Start**; between blocks → "Free until HH:MM" + next block; unfinished past blocks → "Missed" with **Move**; no blocks → "Nothing planned." with **Add Block** and **Copy Yesterday's Plan**.
- **Past day:** no Now card and no timer. A banner "Editing Tue 6 Oct" with **Back to Today**. Everything else works, and unfinished blocks show "Missed".
- **Blocks group** (any viewed day): that day's blocks as rows with a done toggle, time, title, a **Log time** text button with its own stopwatch icon on a line under the title (44 pt; beside the title the row is too narrow at 375 px), and a "…" menu (Edit, Move, Delete).
- **Log time** (added 2026-10-09, owner request; replaces Log Minutes): a sheet like Log Amount with **Hours** and **Minutes** text fields (`inputmode="numeric"`, blank = 0, minutes over 59 are fine and are normalized), a segmented control **Add to total** (default) | **Replace total**, and Cancel / **Save**. Whole numbers ≥ 0 only; anything else shows inline text "Enter whole hours and minutes, like 1 and 30." Save is disabled for 0 with Add; Replace with 0 resets the block to 0. Add = `actualMin` (or 0) + entered; Replace = entered. Saving marks the block done (snapshot as in §1.4) and counts on the viewed day. A running timer is left running.
- **Goals group:** the four goals with a thin progress bar and text ("45 / 60 min"). Business/Uni auto-show met when minutes reach the minimum, and also allow a manual tick. Body & Health: Calories toggle and a gym stepper "n of 4 this week". Socializing: stepper "n of 3 this week".
- **Day status line** at the top of the Goals group: "Won", "Partial" or nothing.
- **Red lines:** none ship in the code (public repo). First launch shows "Add your red lines" linking to Settings. Each plain line has a **Held | Slipped** control; a slip shows exactly `Costs one day, not the month.` once under the list.
- **Measured red lines** (added 2026-10-09, owner request): a line may have an optional **limit** (number ≥ 0) and **unit** (≤ 12 characters, e.g. min, times, drinks); both set or both absent. Today shows **Log amount** for it, opening a sheet with a decimal field (comma or point) and a prominent **None** button that logs 0. The status is derived, never chosen: `amount ≤ limit` → **Held** (exactly at the limit is held), otherwise **Slipped**, shown as icon + text. A logged entry freezes the line's limit, unit and name at that moment (like `snap` on occurrences), so editing a limit never rewrites history and a deleted line's history keeps its name. Past days stay editable. Data is additive under `lockin.v1`: a plain entry stays `'held' | 'slipped'`; a measured entry is `{amount, limit, unit, name}`.

### 1.6 Plan (time-block list)
- Day strip Mon–Sun with previous/next week, and the selected day's blocks. Any date, past or future, can be selected and edited.
- Block fields: title, description, date, start, duration (chips **15, 30, 45, 60, 90, 120, 180** + slider 5–240 step 5), optional custom end time, repeat (Never / Daily / Weekdays / Weekends / Custom days), tag (Business, Uni, Body & Health, Socializing, Unsorted).
- **Start/Finish timer** lives on the Today Now card (today only). **Finish adds** the elapsed whole minutes to the block's stored total, so time logged with **Log time** while the timer ran is kept (Replace sets the base the timer adds to). **Log time** on Today (any day) enters time manually; Plan rows have no Log time.
- **Move** (unfinished blocks): opens the full block form with title, description, tag and duration kept, date = tomorrow, time empty for the user to choose. Original shows persistent text "Moved to Fri 9 Oct, 18:00" and counts as neither missed nor done.
- **Copy Day:** copies the day's blocks (except moved ones) to a chosen date as separate one-off, not-done blocks.
- **Edit** a repeating block edits the whole series (ceiling). **Delete** a repeating block offers **Delete This Day** and **Delete This and Future**; past days and their logs stay. Deleting a one-off block removes it and its log (confirmed).
- No overnight blocks (end must be after start on the same day).

### 1.7 Progress
- **Headline:** "Good days: X of last 30 (target 27)" and 90-day equivalent, with Partial count.
- **Last 7 days vs. previous 7:** Business min, Uni min, gym sessions, social reps, each with the difference.
- **This week per goal:** bar vs. target (Business 780 = 5×60+2×240, Uni 1080 = 5×120+2×240, gym 4, social 3), Unsorted minutes on its own line, lifetime totals (hours and counts).
- **Red lines:** held/slipped counts, last 30 days (counts only lines that still exist; a measured entry counts by its derived status).
- **Measured red line cards** (one per existing measured line, below the Red lines section, last 30 days): held, slipped and not-logged days; total and average amount over the limit on slipped days and the worst day; average margin under the limit on held days; used vs. allowed (sums over logged days); average per logged day for the last 7 days vs. the 7 before. A 30-day bar chart with a dashed limit line; over-limit bars differ by **shape and an icon**, not color alone. Empty state: "Log an amount on Today to see this." 
- **Weigh-in** (optional): kg entries, line chart with dashed target line; the weight target is typed into the app at runtime (never in the repo).
- **Backup status:** "Last backup: N days ago" (or "Never backed up"), highlighted when > 7 days or never.

### 1.8 Settings
Goals (rename; weekday/weekend minimums; weekly targets; daily check labels; color is fixed), Red Lines (add/rename/delete; optional limit + unit with chips **min, times, drinks** or free text; no commitment friction, red lines are not goals; deleting hides a line from summaries, stored history is kept), Weight target, **Reminders** (setup instructions, see 1.9), Data (Export / Import / last backup), app version text.

### 1.9 Reminders (iOS Shortcuts, no code in the app)
A web app on iPhone cannot schedule its own notifications. Reminders are three **iOS Shortcuts personal automations** (Shortcuts › Automation › New › Time of Day › Daily › *Run Immediately* › action *Show Notification*). Settings › Reminders shows these steps and the texts with a Copy button each:

| Time | Text |
|---|---|
| 09:00 | Lock in. Open the plan, put today's blocks in, start the first one. |
| 13:00 | Midday check. Log what you did, then do the next block. |
| 21:00 | Log today, including the red lines. Then reset for tomorrow. |

Notifications will show "Shortcuts" as the sender. Ceiling: no tap-to-open; option B (real web push via a Cloudflare Worker) is out of scope for v1.

### 1.10 Commitment friction
Changing a goal's rules before its `committedUntil` asks for confirmation. `committedUntil` = creation date + 30 days (`2026-11-07` if created `2026-10-08`), reset to today + 30 on a confirmed change.

### 1.11 Not built (user rejected or out of scope)
Wake-time setting, `.ics`/Add to Calendar, in-app notifications, panic/Rut-Breaker button, Top G / Bottom G lines, morning and night screens, Screen Time passcode, streaks, stars/gamification, sync/accounts, adding or deleting goals, goal color picker, overnight blocks, "edit this and future" for series.

## 2. Platform facts the build must respect

- **Install first, then use only the Home Screen app.** On iPhone a Home Screen web app has its own storage, separate from Safari. Data typed in a Safari tab is not visible in the installed app.
- Deleting the Home Screen icon deletes the app's data. Export is the only backup.
- Request persistent storage at startup (`navigator.storage.persist?.()`); failure is ignored.
- **Zoom is locked (deliberate deviation, owner's choice on 2026-10-09):** pinch and double-tap zoom are disabled (`maximum-scale=1, user-scalable=no`, `touch-action: manipulation`, `gesturestart` prevented). This departs from the HIG/WCAG advice to allow zoom; iPhone Larger Text (Dynamic Type) still scales the text. Form controls stay at ≥ 16 px so iOS never zooms on focus.
- Service-worker updates apply after the app is fully closed and reopened. Each release bumps one version string; Settings shows it.
- **Offline (Task 10, `sw.js`):** precaches every shipped file (`ASSETS`, checked against the directories by `tests/sw.test.js`) in cache `lockin-<VERSION>`; cache-first for same-origin GETs, navigations fall back to `index.html`; old caches deleted on activate; no `skipWaiting`, so a new version needs **two** full close/reopen cycles (the first installs it, the second runs it). `VERSION` in `sw.js` must equal `src/version.js` (test). No push, no background sync.
- `localStorage` writes can fail (quota/private mode): the app must show a persistent banner "Couldn't save. Export a backup." and never silently drop data.
- iOS has no web haptics and no background timers; the Now card is correct only while the app is open, and recomputes from the clock on open.

## 3. Design spec (Apple HIG)

References read: `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `dark-mode.md`, `designing-for-ios.md`, `tab-bars.md`, `sheets.md`, `lists-and-tables.md`, `toggles.md`, `segmented-controls.md`, `sliders.md`, `entering-data.md`, `toolbars.md`, `motion.md`, `liquid-glass.md`. Framework translation: this is a web app, so SwiftUI/UIKit vocabulary maps to HTML/CSS (semantic colors → CSS custom properties, Dynamic Type → `-apple-system-*` fonts, Liquid Glass → `backdrop-filter`).

### 3.1 Thesis

- **Single job:** tell the user what to do *right now* and show that the day is moving.
- **Remembered by:** the Now card, the only large, goal-colored element on Today. Everything else is quiet system-style grouped lists. This is a deliberately quiet utility; identity comes from the Now card and the color+icon pairing per goal, not from decoration.
- **Not a template:** it follows the iOS platform look on purpose (`design-principles` Familiarity); no cream/serif, no neon-on-black, no hero stat.

### 3.2 Principles → decisions

| Principle | Decision |
|---|---|
| Purpose | Today answers "what now?" first; planning lives one tab away. |
| Simplicity | 4 tabs, no wake-time/panic/ritual screens; reminders live in iOS Shortcuts. One primary action per screen. |
| Agency | Everything editable; manual tick overrides; Move keeps your choice of time; nothing auto-dismisses. |
| Familiarity | Large titles, inset grouped lists, bottom tab bar, bottom sheets with grabber, native date/time/select controls. |
| Flexibility | Dynamic Type, Dark Mode, Reduce Motion/Transparency, Increase Contrast, portrait and landscape. |
| Craft | 44 pt targets, concentric corners, consistent copy, relative paths, offline. |

### 3.3 Color tokens (computed, WCAG 2.x)

Defined once in `styles.css` between the markers `/* tokens:light */ … /* tokens:dark */` so a test can read them. Dark values apply under `@media (prefers-color-scheme: dark)`. No app appearance toggle (`dark-mode.md › Best practices`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | screen background (grouped) |
| `--surface` | `#FFFFFF` | `#1C1C1E` | list/card cells |
| `--surface-2` | `#FFFFFF` | `#2C2C2E` | cells inside sheets (elevated) |
| `--text` | `#000000` | `#FFFFFF` | primary text (21.00 / 17.01 vs surface) |
| `--text-2` | `#5C5C63` | `#AEAEB4` | secondary (6.63 / 7.71 vs surface) |
| `--text-3` | `#6B6B72` | `#98989F` | hints, placeholder (5.29 / 5.94 vs surface) |
| `--accent` | `#0062CC` | `#4DA0FF` | links, primary buttons (5.80 / 6.31 vs surface) |
| `--on-accent` | `#FFFFFF` | `#000000` | label on accent fill (5.80 / 7.79) |
| `--red` | `#C4261D` | `#FF6961` | slip, missed, destructive (5.77 / 6.03) |
| `--outline` | `#767680` | `#8E8E93` | control borders (4.49 / 5.22 vs surface) |
| `--sep` | `rgba(60,60,67,.29)` | `rgba(84,84,88,.6)` | hairlines |
| `--g-biz` | `#0062CC` | `#4DA0FF` | Business (5.80 / 6.31 vs surface) |
| `--g-uni` | `#5E4DC7` | `#9A8CFF` | Uni (6.25 / 6.13) |
| `--g-body` | `#1D7A3A` | `#4CD27A` | Body & Health (5.39 / 8.76) |
| `--g-social` | `#B25000` | `#FFA94D` | Socializing (5.20 / 8.94) |
| `--g-unsorted` | `#6B6B72` | `#98989F` | Unsorted (5.29 / 5.94) |

Ratios above were computed with a script, not estimated. Dark `--surface-2` (`#2C2C2E`) results: text-2 6.31, text-3 4.86, accent 5.17, red 4.94, uni 5.02, unsorted 4.86 (all ≥ 4.5). Goal tints (`color-mix(in srgb, var(--g-x) 14%, var(--surface))`) are asserted by the Task 5 test, not assumed.

Rules (`color.md › Best practices`): one color = one meaning (accent = interactive only; goal colors = goal identity only; red = slip/missed only). **Color is never the only signal:** every goal color is paired with an icon and its name; Held/Slipped have text labels; selected chips show a checkmark.

### 3.4 Typography

System font only: `font-family: -apple-system, "SF Pro Text", system-ui, sans-serif` (resolves to SF Pro on iPhone; never embed fonts, `typography.md › Using system fonts`). Weights Regular / Medium / Semibold / Bold only (`typography.md › Ensuring legibility`: no Light/Thin).

Text styles (Large default sizes from `typography.md › iOS Dynamic Type sizes`):

| Style | pt / leading | Weight | Used for |
|---|---|---|---|
| Large Title | 34 / 41 | Bold | screen titles (Today, Plan…) |
| Title 1 | 28 / 34 | Bold | Now card "42 min" |
| Title 3 | 20 / 25 | Semibold | Now card block title, sheet title |
| Headline / Body | 17 / 22 | Semibold / Regular | row titles, inputs, buttons |
| Subhead | 15 / 20 | Regular, `--text-2` | row secondary lines |
| Footnote | 13 / 18 | Regular, `--text-2` | section headers, footers |
| Caption 2 | 11 / 13 | Medium | tab labels (minimum size) |

Dynamic Type on web: use `font: -apple-system-body` (and `-apple-system-headline`, `-subheadline`, `-footnote`, `-caption2`; title styles only if `CSS.supports('font','-apple-system-title1')`), with the fixed pt values above as fallbacks. Verify on the device which keywords resolve. At accessibility sizes, rows restack vertically instead of truncating (`typography.md › Supporting Dynamic Type`). Large Title is `calc(1em + 17px)` of Body (34 pt at the default size, 70 pt at AX5; `2em` gave 106 pt and ran off screen, Task 11).

### 3.5 Layout

- Side margins 16 pt; inset grouped cards, radius 20 pt; row min-height 52 pt (≥ 44); 12 pt padding around bezeled controls, 24 pt around unbordered ones (`accessibility.md › Mobility`).
- `viewport-fit=cover`; use `env(safe-area-inset-*)`; content extends under the status bar and above the tab bar (`layout.md › Best practices`); max content width 640 pt, centered.
- No full-width buttons; primary buttons are inset capsules (`layout.md › Phone (iOS)`).
- Scrolling content continues behind the tab bar with a small fade overlay (scroll-edge effect).

### 3.6 Components

- **Tab bar** (Today, Plan, Progress, Settings): single-word labels, filled icons, always visible, none disabled (`tab-bars.md › Best practices`). **The only glass element** in the app: `backdrop-filter: blur(24px) saturate(1.4)`, ~70% translucent fill, 1 px translucent border, floating capsule 16 pt from the sides. When the labels do not fit in one row (large text or zoom), the tabs wrap to a second row inside the bar instead of leaving the screen (Task 11). Fallback to opaque `--surface` under `prefers-reduced-transparency: reduce` and `prefers-contrast: more` (support varies by browser; check on the device). No glass in content (`liquid-glass.md › Review checklist`).
- **Icons:** inline SVG, 24 px, stroke/weight matched to text, `aria-hidden` when paired with text, `aria-label` when alone. Do not copy SF Symbols into the web app (licensed for Apple-platform use).
- **Now card:** goal-tinted surface, goal icon + goal name label, block title, 2-line description, time range, minutes left in Title 1, thin progress bar (`role="progressbar"` + text), one primary button (capsule, `--accent` fill). Boldness is spent here only.
- **Goal row:** 32 pt tinted badge (icon), name, progress text ("45 / 60 min"), 44×44 check button (`aria-pressed`). Body & Health expands to sub-rows (Calories, Gym − n +). A thin progress bar sits under each goal row.
- **Red line row:** name + two-segment control **Held | Slipped** (`role="radiogroup"`, equal widths, text only, `segmented-controls.md › Content`). Segments stack when their labels do not fit side by side (large text), never clip (Task 11). Unmarked = neither selected.
- **Chip** (duration, tag, weekday): ≥ 44 pt tall, capsule, `aria-pressed`, selected = filled + checkmark.
- **Switch** ("Custom end time"): native `<input type="checkbox" switch>` (Safari 17.4+), switch only inside a list row (`toggles.md › Mobile`).
- **Date / time / repeat:** native `<input type="date">`, `<input type="time">`, `<select>` (iOS shows system pickers; `entering-data.md › Best practices`: offer choices over typing).
- **Slider:** native `<input type="range">`, min on the leading side, shows the live value as text next to the chips (`sliders.md › Best practices`).
- **Sheet:** `<dialog>` presented bottom-up, large detent, visible grabber, **Cancel** (leading) + one trailing action (Add / Done / Move); never all of Cancel/Done/Back. Swipe down dismisses; if the form has changes, an action sheet asks "Discard Changes" / "Keep Editing" (`sheets.md › Best practices, Mobile`). A visible Cancel always exists as the non-gesture alternative. At large text the title column gives way (wraps) so Cancel and the action stay on screen (Task 11).
- **Row menu:** 44 pt "…" button opens an action sheet (Move, Delete, Cancel). No swipe-only actions (`accessibility.md › Offer alternatives to gestures`).

### 3.7 Wireframes (440 pt wide)

```
Today                                   Plan / New Block sheet
Thursday, 8 October                     Cancel      New Block        Add
┌───────────────────────────────┐       ────────────────────────────────
│ [briefcase] BUSINESS          │       [ Title                         ]
│ Deep work session 1           │       [ Description…                  ]
│ 20:30–21:50                   │        Date                8 Oct 2026
│ 42 min left  ▰▰▰▰▱▱▱▱         │        Start                    20:30
│      ( Start )                │        Duration            1 h 20 min
└───────────────────────────────┘        (15)(30)(45)(60)(90)(120)(180)
GOALS                                    ──────────●─────── slider
 [b] Business   45 / 60 min   ( ✓ )      Custom end time           (sw)
 [u] Uni         0 / 120 min  (   )      Tag  (Business)(Uni)(Body & Health)
 [h] Body & Health                             (Socializing)(Unsorted)
     Calories on target ( )              Repeat                 Never ▾
     Gym   − 1 +   1 of 4 this week
 [p] Socializing  − 0 +  0 of 3
RED LINES
 <your red line>     [ Held | Slipped ]
 <your red line>     [ Held | Slipped ]
 …                    Costs one day, not the month.
╭──── Today  Plan  Progress  Settings ────╮  (glass tab bar)
```

### 3.8 Motion, haptics, states

- Sheet: 320 ms slide-up, `cubic-bezier(.2,.8,.2,1)`. Tick: 120 ms fill. Nothing animates on frequent interactions (typing, timer digits). `prefers-reduced-motion: reduce` → 120 ms fades only (`motion.md › Best practices`).
- iOS Safari has no web haptics API; feedback is visual only. (Native `switch` inputs give the system haptic.)
- Nothing times out or auto-dismisses. Confirmations ("Moved to Fri 9 Oct, 18:00") are persistent inline text.
- Copy: Title-style capitalization for buttons/tabs/sheet titles, sentence style for helper text. Errors say what is wrong and how to fix it. Empty states invite the next action.

### 3.9 Accessibility checklist (applies to every UI task)

- Every icon-only control has an accessible name. `aria-live="polite"` only on Now-card *state changes* (start/end of a block), not on each minute tick.
- Sheet: focus moves in, is trapped, and returns to the opener on close; Esc closes.
- Test with iOS Larger Text at the largest accessibility size, Bold Text, Reduce Motion, Reduce Transparency, Increase Contrast, light and dark.
- VoiceOver pass on Today and the block sheet before Task 11 sign-off.


### 3.10 Additions from the final locked rules

- **Date switcher** (Today): previous/next chevrons (44 pt) and a text button **Today**; future days are not reachable. The past-day banner uses `--surface` with text, not color alone.
- **Partial** status: text "Partial" + half-filled circle icon in `--text-2`. No new color token.
- **Won** status: text "Won" + filled check icon in `--accent`. Never red; a non-won day is simply unmarked or Partial.
- **Blocks group on Today:** same row component as Plan (`src/views/blockRow.js`).
- **Backup status line** uses `--text-2`; turns `--red` text plus the words "Back up now" when overdue (> 7 days or never).
- **Reminders sheet:** numbered steps as plain text, three text rows each with a **Copy** button (44 pt).
- **Measured red lines:** Held = check icon + "Held"; Slipped = cross icon + "Slipped" in `--red`. Progress bar chart: held bars are flat-topped in `--text-3`; slipped bars are pointed (a different shape) in `--red` with a cross icon above; the limit is a dashed line; a logged 0 shows as a short baseline mark so it differs from "not logged". No new color tokens.
- **Clear a measured log** (added 2026-10-09, owner request): when the viewed day already has an entry, the Log Amount sheet shows a **Clear** text button (secondary, `--accent`, not red, 44 pt) beside **None**, and the footnote adds "Clear removes this day's entry." (so it is not read as emptying the field). It removes that day's entry, so the day is "not logged" again (not Held, per §1.8); stats equal the never-logged case. Works on past days and regardless of later limit changes.
