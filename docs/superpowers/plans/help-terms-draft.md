# Help terms draft: what the words mean (task H1c, text only)
Scope: the Day 1 oath "?" and the term "?" buttons. Each entry: where the term appears, help text (max 2 short plain sentences, paraphrased; no long quotes, the repo is public), source file + section. UNCLEAR = no source defines it, no text. Nothing invented.
PLAN = `2026-10-12-lockin-v2-app.md`; SEED = The Forge `supabase/migrations/20260908000000_seed_default_missions.sql` (the mission pack, Day 1 mission = day_number 1); TACT = The Forge `supabase/migrations/20260907000000_seed_bottom_g_tactics.sql`; FCLAUDE = The Forge `CLAUDE.md`; BP = The Forge `BUILD-PLAN.md`. The Forge is outside this repo: cited by file and section only, nothing copied beyond short paraphrase.
Not found: `src/data/missions.json` and `src/data/tactics.json` do not exist in this repo (`src/data` holds only `exercises.json` and `SOURCE.md`). By rule the pack is imported at runtime and never committed (CLAUDE.md "No personal data anywhere in the repo", PLAN Global Constraints). The only pack files on disk are git-ignored test fixtures (`scratch/`) with placeholder text ("Mission X1"), which define nothing.

## 1. Contract
- Where: Day 0 `Day 1, your oath`, row `Contract` (key `contract`).
- Text: "Your written commitment to the 30 days: promise to show up every day and tell the truth in your check-ins, then sign and date it."
- Source: SEED, Day 1 mission, Step 1 "Write the contract" ("The Enlistment Contract": a fixed commitment text copied out, signed and dated). BP §5 Onboarding row ("Contract, Funeral, Code, Week 1 red lines"). The mission has you copy a ready-made text by hand; the app's entry is free text, so "what to write" follows the mission.

## 2. Funeral
- Where: Day 0 `Day 1, your oath`, row `The Funeral` (key `funeral`).
- Text: "A funeral speech for the weak man you become if you never change. Write it honestly, at least one page."
- Source: SEED, Day 1 mission, Step 2 "The Funeral of the Bottom G" (same excuses and habits for 10, 20, 30 years; minimum one full page; "write the truth"). Note: the Day 1 mission also has a second, positive speech (the Legacy of the Top G, Step 3). The app has no Legacy entry (PLAN Task 5 keys: contract, funeral, code, redlines-w1), so the text covers the Funeral only.

## 3. Code
- Where: Day 0 `Day 1, your oath`, row `The Code` (key `code`).
- Text: "Your personal code: five to seven clear laws you will live by in this challenge. Write standards, not vague words like success."
- Source: SEED, Day 1 mission, Step 4 "Extract your Top G Code" (5 to 7 laws, clear standards, personal, the thing to come back to when the Bottom G negotiates).

## 4. Week 1 red lines
- Where: Day 0 `Day 1, your oath`, row `Week 1 red lines` (key `redlines-w1`).
- Text: "The things you will not do for the next 7 days, written as a short list."
- Source: SEED, Day 1 mission, Step 5 "Set your Week 1 rules" (a list headed "For the next 7 days, I will not:"). The mission's own list items are program content and are not copied. How this entry relates to the red lines you add in Settings: not stated in SEED; PLAN requires both (Rules, "Day 1 = onboarding").

## 5. MED
- Where: Morning check-in, question 3 `Declare MED`; Settings `MED per week` and `MED version`.
- Text: "MED stands for Minimum Effective Dose: a shorter fallback version of a protocol for a bad day. You declare it in the morning, and it counts as held."
- Source: FCLAUDE "Important decisions" ("MED (Minimum Effective Dose) can only be declared in the Morning check-in"); SEED Day 5 ("minimum effective dose"), Day 6 and Day 8 (each protocol's "MED version"; "the protocol shrinks, it never disappears"); PLAN Rules, MED ("A MED protocol counts as held at night"). The expansion appears in The Forge only; PLAN and DESIGN-SPEC never expand it.

## 6. Protocol
- Where: Challenge `Protocols`, Night check-in `Protocols`, Settings `Protocols`.
- Text: "A protocol is a standing daily commitment that you mark Held or Missed each night."
- Source: SEED Day 12 ("a standing daily protocol", logged every evening) and Day 1 ("the morning protocol"); FCLAUDE "Postgres RPC functions" (`complete_day_one_onboarding`: "red lines + daily protocols"); PLAN Task 16 (Held / Missed each night). No source states a definition: this is a paraphrase of how the sources use the word. Flagged for the owner (see Needs ruling).

## 7. Top G
- Where: Night check-in `Today's Top G win`; the word also appears in Settings and Analytics copy.
- Text: "The Top G is the version of you that keeps his word, the man you are working to become. Each day you feed either him or the Bottom G."
- Source: SEED, Day 1 mission, Step 3 ("The Top G is not some character outside of you. He is the version of you that keeps his word") and the Contract text ("every day I either feed the Top G or the Bottom G"). BP §1 "Naming" keeps the two terms and gives no definition.

## 8. Bottom G
- Where: Night check-in `The Bottom G's move`.
- Text: "The Bottom G is the weak voice in your head: the part of you that negotiates, makes excuses and drifts. At night you can name which of five archetypes' tactics it used."
- Source: SEED, Day 1 mission (Step 2 "The Funeral of the Bottom G": the man you become if you never change; "the weak voice winning inside your head"; Step 4: "When the Bottom G starts negotiating"); TACT header (five archetypes, twelve named tactics each, from the document "KNOW YOUR ENEMY"); PLAN Task 16 item 4 (archetype chips, then tactic chips). The archetype names are not repeated: they come from the pack (PLAN Data model).

## Needs ruling
1. Protocol (entry 6): no source defines it, only usage. Keep the paraphrase, reword, or mark UNCLEAR with no text.
2. Contract, Funeral, Code, Week 1 red lines (entries 1 to 4) are written for a handwritten War Log notebook in SEED; in the app they are typed entries. The "what to write" sentences follow SEED.
3. Funeral (entry 2): SEED's Day 1 also has a Legacy speech the app has no entry for; entry 2 says nothing about it.
4. How the four oath entries reach the screen: today H1b has one "?" on the `Day 1, your oath` heading with the approved four-entry sentence. Entries 1 to 4 could go into that sheet as four short lines, or become one "?" per row. Not decided here.
5. Entry 5 expands MED from The Forge only. Entry 5 and the Challenge entry 4 (what MED does) overlap; owner may merge them.
6. Entries 7 and 8 paraphrase the Day 1 mission (program content): wording kept short; owner to confirm it is acceptable for the public repo.
