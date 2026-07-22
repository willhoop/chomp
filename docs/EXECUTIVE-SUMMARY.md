# CHOMP — Executive Summary
**One page · Version 1.0 · 2026-07-22**

### The problem
Competitive Pokémon (VGC) opens with a hidden-information decision under a 30-second clock:
you build six, but bring only four and start only two. That single choice heavily shapes the
match. The strategy space is roughly 10^139 team configurations — larger than chess, Go, poker,
StarCraft and Dota combined. Players make the call on instinct.

### The approach
CHOMP replaces instinct with arithmetic. It reads both teams the moment a match opens, runs the
game's real damage formula across all 24 attacker/defender pairings, and returns the four to
bring and the two to lead — in under 50 milliseconds, entirely in the browser.

Unlike published work in this space (minimax agents, Monte-Carlo tree search, reinforcement
learning), CHOMP does not attempt to play the match. It solves only the opening decision. That
scope is what makes it fast, interpretable, and usable by a human under a clock: every
recommendation is backed by a number the player can verify.

### Evidence
Measured over 50 real ranked games (`docs/VALIDATION-REPORT.md`):
- Agreed with at least 3 of the player's 4 picks in **74%** of games; never diverged on more than two.
- Win rate was **57%** when the player's bring matched CHOMP versus **46%** when it did not —
  directionally positive, but **not statistically significant** at this sample size.
- In the specific failure mode it was built to catch (sandstorm attrition), it made the correct
  call in **2 of 2** available cases.

### Status
Working and in daily use: a browser plugin (live recommendation), a replay analyzer that learns
the player's personal metagame, and a standalone damage calculator. The engine is regression-tested
and the mathematics are validated against the official calculator.

### Honest limitations
CHOMP evaluates one turn. It does not model recoil, flinch, status over time, or redirection.
Opponent sets are inferred from usage statistics, not known. Output is deterministic, so a
repeat opponent could learn the pattern. Scores are relative and not yet calibrated to win
probability. All of this is documented, not hidden.

### Next
1. Turn simulator (multi-turn lookahead) — the largest accuracy gain.
2. Usage-weighted opponent modelling — replaces estimated sets with measured distributions.
3. Mixed-strategy recommendations — removes predictability.
4. Prospective trial at n > 200 to convert the directional result into evidence.
