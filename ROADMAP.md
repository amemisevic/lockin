# Lock In roadmap (updated 2026-10-23)
Live: v2.1.0 (Gym tab) on GitHub Pages (amemisevic.github.io/lockin). main = 193857d.

## Now
Motion polish, whole app. Plan and tasks M1 to M5. Branch from main. Judged on the iPhone.
Goal: the app feels alive and instant. Nothing teleports, nothing waits, nothing is slow.
Scope (view and CSS only; src/core and frozen tests untouched; plain CSS, no Tailwind, no libraries):
- M1 Foundation: motion tokens in styles.css (duration, easing); press feedback on every button and row (under 120 ms); every toggle and switch slides and fades (no jump between on and off); one reduced-motion block.
- M2 Tab bar: glass bar reacts to scrolling content; active tab is a liquid-glass pill that slides to the new tab; tab switch transition between screens.
- M3 Sheets, modals, lists: enter and exit motion; list add and remove.
- M4 Analytics: stat cards, bars and numbers load in with a short staggered animation (first view of a range, not on every redraw).
- M5 Audit on iPhone, then release (VERSION bump only here).
Performance rules: animate transform, opacity and filter only; never layout properties; most motion 100 to 280 ms, screens 400 ms, sheets 450 ms, nothing longer than 450 ms; nothing blocks input; no lingering will-change; backdrop-filter only on the tab bar and sheets; stagger caps at about 8 items; works with reduced motion and Reduce Transparency.

## Later
- Task 21 audit and trial. List is in PROGRESS.md under "Deferred, Task 21".

## Open owner decisions
- None recorded. Add new ones here.
