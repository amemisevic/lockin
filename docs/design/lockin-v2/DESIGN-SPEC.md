# Lock In v2 — design spec for implementation

Status: mockup approved by the owner (2026-10-12). Everything here was measured from the 9 boards, not guessed.

## 0. Source of truth, in priority order
1. `static/*.html` — each screen rendered to plain HTML+CSS (open in a browser; inspect any element for exact px/colors). Same DOM/classes as the boards.
2. `reference/*.png` — screenshot of each screen at 390 px wide, @2x. Final visual judge.
3. `source/*.dc.html` — the original editable boards (needs the design host's runtime; read for the template logic and the state each screen has).
4. `css/<Board>.css` — the exact `<style>` of every board. `css/tokens.css` — the tokens. Rules shared by all boards are identical copies; dedupe them.
5. This file — meaning, structure, rules, and what is NOT in the pictures.

If the pictures and this file disagree, the pictures win. Report the disagreement, don't pick silently.
Exception (owner decision 2026-10-23): motion, and the liquid-glass active tab in section 10, are approved changes. They win over the static PNGs and over the active-tab description in section 2.

## 1. Screens → tabs
| Tab (order) | Board | Notes |
|---|---|---|
| Today | `Main` | next-up hero, challenge strip, today's task list, red-line chips |
| Tasks | `Tasks` | week strip + ONE full-day list with time ranges (no morning/afternoon/evening sections) + habits |
| Challenge | `Challenge` | day wreath, day tiles, mission, check-in cards, MED/Redo, red lines, enemy card |
| Analytics | `Analytics` | range switch, overview, PM challenge, habits, tasks (SAMPLE DATA label is mockup-only) |
| Settings | `Settings` | protocols, red lines, challenge, reminders, data |
| (no tab) | `Onboarding` | Day 0: before Day 1 + empty states |
| (no tab) | `CheckIn` | night check-in (morning is the same pattern; afternoon optional) |
| (no tab) | `Recovery` | after a Reset: file the autopsy within 24 h |
| reference | `Kit` | control kit: every control in every state |

## 2. Layout
- Artboard 390 wide. Side gutter 20. Content is fluid (it must also look right at 440). Top padding 56–60 (status bar). Bottom: leave room for the floating tab bar (content ends ≥ 110 above the bottom).
- Cards (`.plate`): radius 24, 1 px gold-tint border, vertical gradient `#1c1b20→#141317`, inset top highlight.
- Tab bar: floating glass pill, `left/right 18, bottom 22, height 72, radius 36, padding 6`, `backdrop-filter: blur(26px) saturate(170%)`, gold border `rgba(242,190,92,.30)`. Active tab: soft gold radial glow + 3 px light bar on top + gold icon/label; **no marker shape above it** (removed on purpose). 5 tabs, icon 24 + 11 px label.
- Tap targets ≥ 44. Gold button height 54. Chips 44. Switch 60×34.

## 3. Type
| Role | Font | Spec |
|---|---|---|
| Screen title | Cinzel 600 | 32/38, uppercase, letter-spacing .16em, bone, faint gold text-shadow |
| Eyebrow | Alegreya Sans 600 | 11/14, uppercase, .2em, `#D9A646` |
| Section heading | Cormorant Garamond italic 700 | 27/30, bone; **sword ornament first, then the words, vertically centered** (flex `align-items:center`, no offsets) |
| Big numerals / stats | Cinzel 600 | tabular |
| Quote / mission titles | Cormorant Garamond italic 700 | 25/28 |
| Body | Alegreya Sans 400/500/700 | 15/20; secondary 13/17 in `--t2`/`--t3` |
Self-host: Cinzel 500/600/700, Cormorant Garamond italic 600/700, Alegreya Sans 400/500/700 (all SIL OFL). Files are in `assets/fonts/` with `fonts.css`. **No Google Fonts link** (the app must work offline).

## 4. Color use
See `css/tokens.css`. Gold = primary/active/earned. Crimson = Reset/red line/danger. Bronze = MED. Borders are gold-tinted, never neutral grey. Color is never the only signal (shield glyphs, words and shapes carry state too).
Measured contrast (on #141317): bone 16.0, text-2 8.9, text-3 6.9, gold 10.8, eyebrow gold 8.4, crimson-lt 7.8, crimson 5.2; button ink on the gold gradient 5.5 (dark end) to 14.6 (light end); shield outline `#85795f` 4.3 (graphic needs 3). All pass 4.5/3.

## 5. Components (class names are in the CSS; behavior notes)
- `.shield` completion toggle (48×48 hit area, 30×34 shield). Off: outline `#85795f`. On: gold fill + dark lambda (Λ), glow. Tick animation `pop` .5 s + ripple `rip` .65 s. `aria-pressed`.
- `.sw` switch with a shield thumb (on = gold, lambda visible). `role="switch"`.
- `.chip`/`.chip.on`, `.seg` (segmented control), `.stp` stepper, `.pill`, `.tile`, `.wk` (week day), `.mini` (7-day shield dots), `.dy` (30 day tiles: `.p` passed, `.m` MED, `.t` today), `.px` (30 pips: `P` passed, `X` reset, `R` redo; plain = future), `.trk`+`i` (progress track), `.col` (weekday bars), `.hm` heat cells (levels `l0`–`l4`) (heatmap), `.row` (task row), `.sr` (settings row), `.fq` (numbered form question), `.ta`/`.in` (fields), `.btn-gold`, `.btn-ghost`, `.more` (⋯ button).
- Task states: open / done (gold shield, "COMPLETED", row tinted) / failed / stalled. Night check-in force-resolves open tasks (Done · Failed · Stalled; stalled is visually distinct and counts for nothing).
- Laurel wreath (`assets/icons/laurel-wreath.svg`) frames the day number on Challenge (gold fill) and Day 0 (outline only = not earned yet).
- Subtle glow on lines, boxes, circles, bars (box-shadows in the CSS). Keep it subtle; it was toned down twice on purpose.

## 6. Background (every screen)
An ancient temple seen from outside, deliberately quiet.
- Stack (top → bottom): dark overlay `rgba(4,3,2,.27)` + 4 small corner vignettes (top two .4, bottom two .45); **steps** (3 big stone steps, `assets/bg/steps.svg`, 390×142, anchored bottom, ending just above the tab bar); **frieze** (Greek key, `frieze.svg`, 390×34, top, opacity .5); **wall** (irregular weathered masonry, `wall-tile.svg`, 390×720, `repeat-y`, centered); the page's own gold glow at top.
- Brightness is deliberately even from top to tab bar. No helmet, no wreath in the background (both were removed).
- Use `assets/bg/*@2x.webp` in the app (SVG `feTurbulence` grain is expensive on long scrolling pages). Keep the SVGs as the editable source.
- It lives on a `::before` with `z-index:-1` inside an `isolation:isolate` screen so it never covers content.
- Reduce Transparency / Increase Contrast: drop the glass blur to a solid `#1a181c` bar and fade the wall to ~50 % (needs checking on device).

## 7. Sample content in the boards is NOT product content
Names like the three red lines, "Wake at 06:30", "Gym", "Finish Module 1", dates, "Day 9", the Analytics numbers are **mockup sample data**. The repo is public: never commit them as defaults. Red lines, protocols and tasks are typed by the user at runtime. Seed only what the product needs: the 30-mission pack and the tactics list (`Settings → Challenge pack`) once the owner supplies them.

## 8. States and behavior that are not visible in a still
- Check-in gating: Morning + Night mandatory, Afternoon optional (zero penalty). Night opens at 20:00. MED can only be declared at the Morning check-in.
- Reset: any red line crossed = Reset; or ≥ Zero-Day threshold (default 3) protocols missed. Streak → 0, day count continues, Recovery within 24 h, next day no MED.
- Redo: 1–2 protocols missed, or one pre-declared Redo per challenge.
- Recovery vague-text nudge: "Be stronger" → "Too vague. Name something you will block, delete or move."
- Full rules: `PLAN-v3.md` §4 (and the original v2 plan §5, which this keeps).

## 9. How to verify (pixel by pixel)
1. Add a dev-only sample-data fixture that reproduces each reference screen (Day 9, 5 tasks, etc.). Do not ship it in the production bundle.
2. Open the app at 390×(board height), DPR 2, take a screenshot per screen, run `tools/compare.py reference/Main.png shot.png` (needs Pillow; run it from outside the repo — the repo takes no dependencies).
3. Target: ≤ 1.5 % of pixels differing beyond a tolerance of 12/255 per channel on layout areas; the background grain is excluded (compare with `--ignore-bg`). Any larger diff is a bug or a reported deviation.
4. Also check 440×956 (the repo's preview size) for no clipping, and 4 text sizes at the tab bar.

## 10. Motion (owner decision 2026-10-23)
Static screens stay as in the PNGs. Motion and the glass tab bar are added on top.
- Tokens in `styles.css`: `--dur-press` 100 ms, `--dur-ui` 280 ms (UI, exits), `--dur-screen` 400 ms (screens, tab pill), `--dur-sheet` 450 ms (sheet enter), `--ease-out` cubic-bezier(.32,.72,0,1), `--ease-spring`. Use tokens only, no raw durations.
- Press: every button and row gives instant feedback on `:active` (scale about .97 and/or opacity, under 120 ms). Release eases back.
- Toggles (`.sw`, `.shield`, `.chip`, `.seg`): the thumb or fill slides, the color fades (`--dur-ui`). No jump between states. Keep the existing `pop` and `rip` on shield tick.
- Tab bar: stays the floating glass pill. Content scrolling under it shows through the blur. The active tab is a liquid-glass pill (translucent fill, soft inner highlight, thin gold edge, gold icon that fills) that slides between tabs. Replaces the glow and 3 px bar from section 2. iPhone Safari ignores SVG `backdrop-filter`: use `backdrop-filter` plus `-webkit-backdrop-filter` with `blur()` and `saturate()` only.
- Screens: short fade and 8 px rise on tab switch (`--dur-screen`).
- Sheets and modals: slide or scale in, fade out. List add and remove: height-free fade and slide (no layout animation).
- Analytics: stat cards, bars and numbers stagger in (about 40 ms apart, max 8 items), once per range change.
- Performance: animate `transform`, `opacity`, `filter` only. Never `width`, `height`, `top`, `left`. No lingering `will-change`. Nothing blocks input. No animation longer than 450 ms (owner decision 2026-10-24: 200 ms with the old curve read as instant).
- Accessibility: `prefers-reduced-motion` turns movement into fades of 1 ms to 100 ms. Reduce Transparency: tab bar and sheets fall back to a solid `#1a181c` (as in section 6). Motion never carries state alone.
