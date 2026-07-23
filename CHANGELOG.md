# Changelog — CHOMP

All notable changes to CHOMP are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Rule.** Every change is logged here in the same pass as the code, together with the matching
updates to the white paper, the deck, and the technical documentation. A prior conclusion is never
silently rewritten; what changed and why is stated. The top version here must match the plugin
`@version` stamp.

---

## [2.4.0] — 2026-07-22

### Added
- **ABRA meta model wired into the pick (the flow-back loop).** The built plugin now embeds
  `CHOMP_META`, the ladder usage model produced by the separate **ABRA** project. The opponent's
  likely four is computed matchup-aware — `bring4(theirSix, yourSix)`, their best four *against your
  six* — with ABRA's ladder bring rate as a fallback prior only. CHOMP then optimises your bring
  against that likely four instead of all six. Pinned by `tests/test-meta-flow.js` (5 tests) and
  verified on a real battle. Because CHOMP auto-updates from GitHub, a fresher ABRA model reaches the
  live plugin with no manual step.

## [2.3.0] — 2026-07-22

### Added
- **Operation Ladder foundation — ladder-wide meta model.** `build/meta-ingest.js` pulls public
  replays for the format (any players, paginated) and aggregates both sides into `data/meta-usage.json`:
  team%, bring%, lead% and win% per species. Tested on 302 teams from 151 real ladder replays; the
  result reproduces the hand-curated threat list. This is the shared data layer that grows unattended
  and will feed the pick-4, the dashboard, and the team optimiser.

### Changed
- **Panel stripped to the decision only.** It now shows two lines — `LEAD` (the two to send out) and
  `BRING` (the four to pick) — and nothing else. Removed the per-Pokémon damage bars and percentages,
  the weather/score line, and the `6/6 real sets` line, on the user's request for the smallest
  possible panel. The full damage math still runs underneath to choose the four and the two; it is
  simply no longer printed.

---

## [2.2.0] — 2026-07-22

### Added
- **Governance and delivery files** to meet the portfolio's public-company documentation bar:
  `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `.gitignore`, and a GitHub Actions CI
  workflow that runs the test suite on every push and pull request.
- **Auto-update headers** (`@updateURL` / `@downloadURL` pointing at the raw GitHub script). Once the
  plugin is installed from that URL, Tampermonkey updates it automatically on every version bump — no
  more manual paste. Documented in the README.


## [2.1.0] — 2026-07-22

### Added
- **Version stamp in the plugin panel.** The header now reads `CHOMP — BRING 4 · v2.1`, so a stale
  install is visible at a glance. This was the recurring support problem: the code was correct on
  disk but an old build was installed, and there was no way to tell.
- `tests/test-team-read.js` (12 tests) pinning the team reader against curly, straight and left
  apostrophes on both the classic and BETA clients.

### Fixed
- **Broadened the page-text fallback** to accept curly, straight and left apostrophes. A real defect,
  though not the cause of the live failure — the battle object is the primary source and works.

### Verified
- Confirmed the reader against a real finished battle (stepQueue dumped from the live client): 12
  `|poke|` lines and both `sides` arrays present; the shipped `readTeams` returns the correct 6v6
  even after the team-sheet text has scrolled out of the log.

### Documented
- The update procedure is now in the README and the technical documentation, with a note that
  Tampermonkey does not auto-update a paste-installed script.

---

## [2.0.0] — 2026-07-22

### Added
- **Move-legality oracle.** `data/champions-legal-moves.json` (49 KB), generated from the HoopaDex
  export `champions-learnsets.json`: one bitmask per species over 496 moves, per regulation. Small
  enough to inline in the userscript.
- `canLearn(species, move, regulation)` in `engine/champ-model.js`, wired into the synthesis filter
  in both build scripts.
- `tests/test-legality.js` (16 tests).

### Changed
- **Synthesized opponent sets now respect the Champions legal-move list.** The engine used to take
  the strongest move of the right category from the whole table without checking the learnset — this
  is how Charizard was once given Eruption. Measured effect: Charizard's synthesized set changed from
  Eruption to `Overheat / Hurricane / Focus Blast`. Every synthesized set checked is now legal.

### Fixed
- **Undefined `isBannedItem` in the built userscript.** The build sliced the engine from `const
  byName`, which starts after that definition, so the banned-item check would throw a ReferenceError
  on the first parsed set. The slice now starts at `const FORMAT`. Verified by loading the built file.

### Notes
- **Safety rule.** The oracle answers "is this pair recorded as legal", not "is this pair illegal".
  Five moves in the legal pool (spore, softboiled, milk drink, power shift, struggle) are absent from
  the export. Anything absent is ALLOWED. A missing datum must never delete a real move.
- **Domain note.** Champions has no level-up movesets and no TM items. The `methods` field holds
  `["TM"]` for all 14,192 pairs and carries no information. A Scarlet/Violet moveset is not a guide
  to Champions legality — Garchomp learns Surf in Champions but not Waterfall.

---

## [1.0.0] — 2026-07-22

### Added
- **Replay analyzer** with personal-meta threat ranking and team tune-up.
- **Referee report** — self-critique of the math and its implementation.
- **`FORMAT` config block** — a new regulation is now a one-file edit.
- **`BAD_AUTO` blacklist** — inferred sets no longer use Blast Burn, Hydro Cannon, Explosion, etc.
- **Setup-sweeper valuation** — added after Speed Boost + Swords Dance sweepers scored too low.
- **Full field layer** — terrain, extended weather, screens, Wonder Room, doubles support abilities.
- **Contested weather war** — neutral boosts when both sides can set weather; sand chip re-calibrated
  so sand-immune Steels are preferred against Tyranitar.
- **Plugin diagnostic line** — a failed read reports the reason instead of showing an empty panel.
- **Plugin auto-close** of the News popup and the rooms sidebar (one-shot, cannot loop).

### Changed
- **Restructured** to the standard project layout (`docs/ engine/ app/ build/ data/ tests/ assets/`).
- **Technical documentation rewritten** in ASD-STE100, organised by Diátaxis.
- **`CLAUDE.md` trimmed** to project-specific context; universal rules moved to global instructions.
- **Engine: burn** now halves physical damage.
- **Plugin: team reading fixed.** The panel showed nothing at team preview. Cause: the BETA client
  uses the `PS` global, not `app`. Fix: detect both clients, fall back to page text. Verified 6v6.
- **Engine: referee-report fixes** — ability immunities now execute (Levitate stops Earthquake);
  Intimidate now applies; format legality enforced in `buildMon`; KO is now `pKO` across all 16 rolls
  instead of the max roll only.

### Removed
- **Choice Specs / Choice Band / Assault Vest** modifiers. They are not legal in Reg M-B.
