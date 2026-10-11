# Lock In v2 — Build Plan v3

Supersedes the **design, stack and tab sections** of `PM-Challenge-App-Build-Plan-v2.md` (that plan was written for "The Forge": React + Supabase + navy/blue). Its scoring rules (§5), check-in rules (§6), pipeline logic (§8) and Recovery Protocol stay valid and are not repeated here.

## 0. Decisions only you can make (nothing gets built until these are answered)
| # | Decision | My recommendation | What it changes |
|---|---|---|---|
| D1 | **Stack.** Stay in the existing `lockin` repo: vanilla ES modules, localStorage, GitHub Pages, no server. | Yes | Drops React/Vite/Tailwind/Supabase/Vercel/Web Push/Edge Functions from plan v2. The "nightly pipeline" becomes a pure function that runs on the phone when you close the night check-in. No sync between devices. Reminders stay Shortcuts-based. Backup stays export/import. |
| D2 | **Rule reversal.** Today's `CLAUDE.md` forbids streaks, gamification, Top G / Bottom G, morning/night screens and a wake-time setting. v2 needs all of them (streaks, check-ins, Top G / Bottom G, wake protocol). | Amend `CLAUDE.md` and the spec explicitly, in one reviewed commit, before code | Without this, Claude Code will refuse or "fix" the new screens. |
| D3 | **Apple HIG deviations.** Custom serif fonts, gold-on-dark, glass tab bar, ornamental background. | Accept; keep the existing rules that still apply (tap ≥ 44, text ≥ 11, contrast ≥ 4.5/3 — all measured as passing, see DESIGN-SPEC §4; zoom lock stays) | Record each deviation in spec §2 like the zoom lock. |
| D4 | **Existing v1 data.** What happens to blocks, goals and the Won/Partial log you already have? | Unknown to me — tell me what you actually use | Decides migration vs. fresh start. I did not assume. |

## 1. What changed from plan v2 because of the design
| Area | Plan v2 | Approved design |
|---|---|---|
| Tabs | Today · Challenge · Tasks · Journal · Stats | **Today · Tasks · Challenge · Analytics · Settings** |
| Visual system | "The Forge": navy `#0B1120`, electric blue, Inter, Linear-style | **Iron / Spartan**: `#0A0A0B`, gold gradient, crimson for Reset, Cinzel + Cormorant Garamond italic + Alegreya Sans |
| Background | radial navy | Ancient temple seen from outside: weathered masonry, 3 stone steps at the bottom, Greek-key frieze at the top, even and quiet |
| Tab bar | plain | Floating glass pill, gold border; active tab = glow + light bar (no marker) |
| Tasks | Todoist-style list | **One full-day list with time ranges** (no morning/afternoon/evening groups), week strip, habits with 7-day shield dots |
| Completion control | checkbox | Shield toggle with Λ (gold when done), tick animation |
| Section headings | plain | Sword ornament, then the heading |
| Journal / War Log | its own tab | Reached from the **Challenge** tab (mission → "Open mission", "War Log") |
| Check-ins | specified in text | Night check-in screen designed (task force-resolve, protocols, red lines, Top G win, Bottom G tactic, suggested result, override with reason). Morning/Afternoon follow the same pattern but are **not drawn yet** |
| Reset aftermath | text only | Recovery screen designed |
| Day 0 | text only | Onboarding screen designed (Day 1 = oath = setup) |
| Settings | many pages | Protocols, Red lines, Challenge (Day 1 date, Zero Day threshold 2–5, MED days/week, pack import), Reminders (Shortcuts), Data (backup) |
| Analytics | many widgets | Range switch, overview, PM challenge (results, pass rate, per-protocol, what caused the Reset, enemy tactics), habits (weekday, 4-week heatmap), tasks |

## 2. In plan v2 but NOT in the approved design (cut from the first release unless you say otherwise)
XP and XP log · Accolades / medals · Goals Engine · Mission Library editor · Prayer times · Journal templates (Mindset guide) · Weekly Review · Web push · cloud sync. Each of these would need a design first. `CLAUDE.md` already says "no features that are not in the spec", so Claude Code will not add them on its own.

## 3. Screens missing from the design (needed before or during build)
Morning check-in · Afternoon check-in · Mission detail ("Open mission") · War Log list + entry editor (Contract, Funeral, Code, Week-1 red lines) · Add/edit task sheet · Task ⋯ action sheet · Add protocol / Add red line sheet · Declare-Redo confirmation · Day-30 graduation. **Recommended next design round: Morning check-in, Mission detail + War Log entry, Add/edit task sheet, ⋯ menu, Declare Redo.** The rest can reuse the Kit patterns.

## 4. Build stages (revised)
| Stage | Scope | Test/verify | Device checkpoint |
|---|---|---|---|
| S0 | Import the design package into `docs/design/lockin-v2/`; reconcile `CLAUDE.md` + spec with v2 (needs D1–D4) | Docs only | ⛔ you approve the diff |
| S1 | Foundation: self-hosted fonts, tokens, background layers, app shell, glass tab bar, 5 empty routes | Contrast test extended to new tokens; screenshot of the empty shell | ⛔ iPhone: bar, background, fonts |
| S2 | Domain model + scoring engine (TDD, pure functions): day result (Passed/MED/Redo/Reset), streaks, MED weekly cap, declared Redo, forced full pass, Recovery deadline | `node --test`, three time zones | — |
| S3 | Tasks + Today (shared task row, shield toggle, add/edit sheet) | Pixel diff vs `reference/Main.png`, `Tasks.png` | ⛔ iPhone |
| S4 | Challenge tab + Day 0 | vs `Challenge.png`, `Onboarding.png` | — |
| S5 | Check-ins (morning/afternoon/night) + Recovery | vs `CheckIn.png`, `Recovery.png`; engine tests drive the UI | ⛔ iPhone: a full day |
| S6 | Analytics (computed from real logs, no fixtures) | vs `Analytics.png` using the dev fixture | — |
| S7 | Settings + backup/import | vs `Settings.png` | — |
| S8 | Service worker/offline: add fonts + background assets to `ASSETS`, version equality test | Offline run | ⛔ airplane-mode test |
| S9 | HIG/visual audit + one code review; 14-day trial | `mattpocock-skills:code-review` | Trial |

## 5. Rules for Claude Code across all stages
- The design package is the visual source of truth; `reference/*.png` is the judge. Deviations are reported, not silently chosen.
- Sample content in the boards is mock data. No personal data in the repo (public).
- No Google Fonts or any CDN: fonts and background images are local files, listed in the service worker.
- Files < 300 lines; styles split into tokens, components, screens; one commit per stage; version bump on every shipped change; never edit tests to pass them.
