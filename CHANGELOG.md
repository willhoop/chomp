# CHANGELOG — CHOMP
Newest first. Every change to code or documents is logged here.

## 2026-07-22
- **Restructured** to the standard project layout (`docs/ engine/ app/ build/ data/ tests/ assets/`).
- **Technical documentation rewritten** in ASD-STE100 Simplified Technical English, organised by Diataxis.
- **Trimmed `CLAUDE.md`** to project-specific context only; universal rules moved to global instructions.
- **Plugin: fixed team reading.** The panel showed nothing at team preview. Cause: the BETA client uses
  the `PS` global, not `app`; the battle log was also empty. Fix: detect both clients, and fall back to
  reading the "<user>'s team:" lines from the page. Verified on a real preview (6 mine / 6 foe).
- **Plugin: added a diagnostic line** so a failed read reports the reason instead of showing an empty panel.
- **Plugin: auto-close** the News popup and collapse the rooms sidebar (one-shot, cannot loop).
- **Engine: burn** now halves physical damage (activates in the turn simulator).
- **Engine: removed Choice Specs / Choice Band / Assault Vest** modifiers. They are not legal in Reg M-B.
- **Engine: `BAD_AUTO` blacklist** stops inferred sets from using Blast Burn, Hydro Cannon, Explosion, etc.
- **Engine: `FORMAT` config block** added. A new regulation is now a one-file edit.
- **Engine: referee-report fixes** - ability immunities now execute (Levitate stops Earthquake);
  Intimidate now applies; format legality is enforced in `buildMon`; KO is now `pKO` across all 16 rolls
  instead of the max roll only.
- **Engine: setup-sweeper valuation** added, after Speed Boost + Swords Dance sweepers scored too low.
- **Engine: full field layer** - terrain, extended weather, screens, Wonder Room, doubles support abilities.
- **Engine: contested weather war** - neutral boosts when both sides can set weather; sand chip
  re-calibrated so sand-immune Steels are preferred against Tyranitar.
- **Added** the referee report (self-critique of the math and the implementation).
- **Added** the replay analyzer with personal-meta threat ranking and team tune-up.

## 2026-07-22 — synthesized opponent sets now respect the Champions legal-move list
**Roadmap item 2, partly closed.** The engine invented an opponent's moves by taking the strongest
move of the right category from the whole move table. It never checked whether the species could
learn it. This is how Charizard was once given Eruption.

- Added `data/champions-legal-moves.json` (49 KB), generated from the HoopaDex export
  `champions-learnsets.json`. One bitmask per species over 496 moves, for each regulation. The
  bitmask form keeps the table small enough to inline in the userscript.
- Added `canLearn(species, move, regulation)` to `engine/champ-model.js`, and wired it into the
  synthesis filter in both build scripts.
- **Safety rule.** The oracle answers "is this pair recorded as legal", not "is this pair illegal".
  Five moves in the legal pool (spore, softboiled, milk drink, power shift, struggle) are absent
  from the export. Anything the export does not know about is ALLOWED. A missing datum must never
  delete a real move. Pinned by five tests.
- Measured effect: Charizard's synthesized set changed from Eruption to
  `Overheat / Hurricane / Focus Blast`. Every synthesized set checked is now learnset-legal.

**Separate defect found and fixed during this work.** The built userscript called `isBannedItem`
but never defined it. The build script sliced the engine from `const byName`, which starts after
that definition, so fix C6 (banned-item enforcement) would have thrown a ReferenceError as soon as
a set was parsed. The slice now starts at `const FORMAT`. Verified by loading the built file and
calling the function.

**Domain note.** Champions has no level-up movesets and no TM items; a species can learn a move or
it cannot. The `methods` field in the export holds `["TM"]` for all 14,192 pairs and carries no
information. A Scarlet/Violet moveset is not a guide to Champions legality — Garchomp learns Surf
in Champions but not Waterfall.

Added `tests/test-legality.js` (16 tests). `test-damage-golden.js` (16) and `test-engine.js` (4)
still pass.
