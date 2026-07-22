# CHOMP — Validation Report

**Version 1.0 · Last updated 2026-07-22**
Reproduce with: `node tests/backtest-validation.js`

---

## 1. Purpose
This report measures CHOMP against real ranked games. It replaces anecdote with numbers.
It also states plainly what the numbers do **not** prove.

## 2. Method
1. Pull every available public replay for the account `willhoop` from the Showdown replay API.
2. For each game, parse both six-Pokémon rosters, the four actually brought, and the result.
3. Run CHOMP on the two rosters, with no knowledge of the outcome.
4. Compare CHOMP's recommended four against the four actually brought.
5. Group games by agreement level and compare win rates.

**Blinding.** CHOMP receives only the two rosters. It never sees the result, the moves used,
or the final score. Opponent sets are inferred, exactly as they are in live use.

## 3. Results (n = 50 games)

**Overall record in the sample:** 27–23 (54%).

### 3.1 Agreement between CHOMP and the human choice
| Overlap with CHOMP's four | Games | Share |
|---|---|---|
| 4 of 4 | 6 | 12% |
| 3 of 4 | 31 | 62% |
| 2 of 4 | 13 | 26% |
| 1 of 4 | 0 | 0% |
| 0 of 4 | 0 | 0% |

**74% of the time CHOMP agreed with at least three of the four picks**, and it never disagreed
on more than two. CHOMP is therefore not proposing exotic teams. It largely confirms strong
human judgement and differs at the margin — which is where the value is claimed to be.

### 3.2 Win rate by agreement level
| Group | Games | Wins | Win rate |
|---|---|---|---|
| Brought ≥3 of CHOMP's picks | 37 | 21 | **57%** |
| Brought <3 of CHOMP's picks | 13 | 6 | **46%** |

Directionally, games that matched CHOMP's recommendation were won more often, by about
11 percentage points.

### 3.3 The failure case it was built for
Two games in the sample were against Tyranitar sandstorm teams. Both were losses, caused by
bringing Pokémon that sandstorm damages every turn while sand-immune Steel types stayed on the
bench. **CHOMP recommended a sand-immune Steel type in 2 of 2 of those games.**

## 4. Honest interpretation — what this does NOT prove

**The 57% vs 46% difference is not statistically significant.** With 37 and 13 games, a
two-proportion test gives a p-value near 0.5. This result is consistent with chance. It is
suggestive, not evidence.

Other limits on these numbers:
1. **Correlation, not causation.** Games where the human agreed with CHOMP may simply have been
   easier matchups. Agreement may be a symptom of a clear matchup, not a cause of the win.
2. **Small and unbalanced sample.** 50 games, split 37/13.
3. **Single player.** All games come from one account, one skill band, one set of teams.
4. **Inferred opponent sets.** Opponent movesets are estimated, so the recommendation being
   measured is itself built on estimates.
5. **Not a live trial.** These are retrospective. It does not measure whether *following*
   CHOMP in real time changes outcomes.

## 5. What would make this conclusive
1. A **prospective trial**: alternate between following and ignoring the recommendation for
   200+ games, recorded in advance.
2. A **larger, multi-player sample** from the public replay feed (`?format=` endpoint), which
   removes the single-player bias.
3. **Calibration**: fit the score against realized win rate, so a score maps to a probability.

## 6. Conclusion
CHOMP agrees with strong human judgement in 74% of games and never diverges wildly. In the
specific failure mode it was designed to catch — sandstorm chip damage — it made the correct
call in both available cases. The observed win-rate gap is **directionally positive but not
statistically significant at this sample size**, and should not be presented as proof.
