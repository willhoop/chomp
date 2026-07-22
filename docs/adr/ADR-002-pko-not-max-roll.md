# ADR-002 — Report P(KO) across all 16 rolls, not the maximum roll
**Status:** Accepted · **Date:** 2026-07 · **Supersedes:** the original max-roll behaviour

## Context
Pokémon damage is uniform across 16 possible rolls. The first implementation used the maximum
roll and labelled any result at or above the target's HP a "knockout". A hit that knocks out on
1 roll in 16 was therefore reported identically to a guaranteed knockout.

## Decision
The engine computes damage for all 16 rolls and returns `pKO`, the fraction that reach the
target's HP. Selection logic ranks by `pKO`, then by damage.

## Consequences
**Positive.** Recommendations reflect real probability. Optimistic "KO" claims are removed.
**Negative.** Slightly more computation per move. Reported percentages are lower than before,
which reads as a regression to anyone who remembers the old numbers.
**Note.** Accuracy and critical-hit probability are not yet folded into `pKO`. The hook exists.
