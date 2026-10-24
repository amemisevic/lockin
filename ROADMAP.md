# Lock In roadmap (updated 2026-10-24)
Live: v2.5.0 (Settings help buttons) on GitHub Pages (amemisevic.github.io/lockin). Includes v2.4.1 today counter removed, v2.3.0 help buttons and v2.2.0 motion polish.
Not started: help scope for the other tabs (Settings, Today, Tasks, Gym, Analytics).

## Now
Motion polish, whole app. Plan and tasks M1 to M5. Branch from main. Judged on the iPhone.
Goal: the app feels alive and instant. Nothing teleports, nothing waits, nothing is slow.
Scope (view and CSS only; src/core and frozen tests untouched; plain CSS, no Tailwind, no libraries):
- M1 Foundation: motion tokens in styles.css (duration, easing); press feedback on every button and row (under 120 ms); every toggle and switch slides and fades (no jump between on and off); one reduced-motion block.
- M2 Tab bar: glass bar reacts to scrolling content; active tab is a liquid-glass pill that slides to the new tab; tab switch transition between screens.
- M3 Sheets, modals, lists: enter and exit motion; list add and remove.
- M4 Analytics: stat cards, bars and numbers load in with a short staggered animation (first view of a range, not on every redraw).
- M5 Audit on iPhone, then release (VERSION bump only here). Done 2026-10-24: code audit, VERSION 2.2.0; iPhone check is the owner's.
Performance rules: animate transform, opacity and filter only; never layout properties; most motion 100 to 280 ms, screens 400 ms, sheets 450 ms, nothing longer than 450 ms; nothing blocks input; no lingering will-change; backdrop-filter only on the tab bar and sheets; stagger caps at about 8 items; works with reduced motion and Reduce Transparency.

## Later
- Task 21 audit and trial. List is `docs/backlog.md`; rulings of 2026-10-24 are recorded there (steps in `docs/superpowers/plans/task21-inventory.md`).

## Open owner decisions
- M5 audit, NEEDS RULING (details in PROGRESS.md, M5): shield `pop` (500 ms) and `rip` (650 ms, box-shadow keyframes) over the 450 ms cap and outside transform/opacity/filter; colour fades (color, border-color, fill, stroke) on toggles; `.tab` colour fade uses the default curve, not a token; `prefers-reduced-transparency` is not supported by iOS Safari (caniuse), so only Increase Contrast triggers the solid fallback.
