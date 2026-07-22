# CHOMP: The Champions Head-to-head Optimizer for Matchup Prediction
### A fast, interpretable damage-calculus algorithm for team-preview decisions in Pokémon Champions VGC (Reg M-B)

**Author:** Will (willhoop) · Operation Ladder project
**Version:** 1.0 · July 2026

---

## Abstract

Competitive Pokémon Video Game Championships (VGC) is a simultaneous-move, imperfect-information game with an astronomically large strategy space (~10^139 legal team configurations — larger than Chess, Go, Poker, StarCraft, or Dota combined) [2]. Most published work attacks the *full-battle policy* with heavy machinery: minimax language agents (PokéChamp [1]), root-parallelized Monte-Carlo Tree Search (Foul Play [4]), and multi-agent reinforcement learning with game-theoretic solvers (VGC-Bench [2], Metamon [3]). These systems are powerful but require a battle simulator, training compute, and seconds-to-minutes of search per decision.

This paper isolates a smaller, higher-leverage sub-problem that a human ladder player actually faces under a clock: **at team preview, given both six-Pokémon rosters, which four do I bring and which two do I lead?** We present **CHOMP**, the Champions Head-to-head Optimizer for Matchup Prediction — a single-ply, fully deterministic algorithm that (1) reads the player's own exact sets from the client and infers the opponent's from usage priors, (2) computes an exact game-accurate damage matrix using the validated Gen-9 Champions damage formula, (3) layers in the mechanics that actually decide games (weather boosts + chip, items, abilities, speed control, priority), (4) selects the best four via exhaustive subset search, and (5) selects the lead pair by turn-one knockout pressure rather than risk-averse averaging. CHOMP runs in milliseconds in the browser, is fully interpretable (every recommendation is backed by a concrete KO percentage), and was tuned and validated against real ranked ladder games.

---

## 1. Problem statement

### 1.1 The decision
In VGC doubles, both players build a team of six but bring only four to each game, revealed simultaneously at *team preview*. The player must choose:
- a **bring set** B ⊂ Roster, |B| = 4, and
- a **lead pair** L ⊂ B, |L| = 2 (the two sent out on turn one),

using only the two rosters of species (moves, items, EVs, and abilities of the opponent are hidden).

### 1.2 Why it is hard
- **Combinatorics.** For a fixed roster there are C(6,4) = 15 brings and, per bring, C(4,2) = 6 leads — small on its own, but the *quality* of each depends on a 4×6 (bring × opponent) interaction lattice whose entries are themselves damage computations under contextual modifiers.
- **Imperfect information.** The opponent's sets are unknown. VGC-Bench frames team preview as two joint switch-in actions and approaches it with double-oracle / fictitious-play Nash approximations; we instead resolve the uncertainty with a *usage prior* over sets.
- **Simultaneous moves.** There is no "correct" deterministic answer; the true solution is a mixed (Nash) strategy. We adopt a deterministic best-response as a pragmatic, interpretable approximation and document the exploitability trade-off (§6).
- **Time budget.** A human has ~30–90 seconds at preview. This rules out deep search and favors a fast evaluator.

### 1.3 Design goals
1. **Real-time** (< 50 ms, runs client-side).
2. **Interpretable** — every call is justified by an explicit KO number a player can verify.
3. **Game-accurate** — exact damage math, not learned or hand-waved effectiveness.
4. **Self-improving offline** — able to refine a whole team against the metagame, not just react.

---

## 2. Related work

| System | Approach | Scope | Compute |
|---|---|---|---|
| **PokéChamp** (Karten et al., 2025) | Minimax with an LLM proposing/pruning moves and modeling the opponent | Full battle | LLM inference per node |
| **Foul Play** (pmariglia) | Root-parallelized MCTS over a custom engine, guided by a hand-built evaluation | Full battle | Many rollouts/turn |
| **VGC-Bench** (Aristidou et al., 2025) | Self-play, fictitious play, and double-oracle over PPO actor-critics; 700k-log human dataset | Full battle + team design | GPU training |
| **Metamon** (2025) | Offline RL with transformers on human replays | Full battle | GPU training |
| **LSA lead prediction** (J. Geek Studies, 2025) | Latent Semantic Analysis over 5,000 logs to predict lead pairs | Team preview leads | Light |
| **Championship regression** (Dilworth, MSU) | Multiple linear regression on base-stat totals and coverage | Team building | Light |
| **CHOMP (this work)** | Deterministic damage-calculus matchup evaluator + exhaustive bring search + KO-pressure lead | Team preview only | Milliseconds, client-side |

CHOMP's niche is the **light, interpretable, real-time preview solver**. It borrows the *evaluation-function* idea from Foul Play (but computes exact damage rather than heuristics), the *usage-prior* idea implicit in human play and in LSA lead work, and the *best-response-over-a-team-pool* idea from double-oracle (but as an offline hill-climb rather than a full Nash solve).

---

## 3. The algorithm

### 3.1 Notation
- A **set** s = (species, item, ability, nature, SP-spread, moves).
- `build(s)` → a battle mon with computed stats using the validated Champions stat formula:
  - `statL50(base, sp, nat) = ⌊(⌊(2·base+31)·50/100⌋ + 5 + sp)·nat⌋`
  - `hpL50(base, sp) = ⌊(2·base+31)·50/100⌋ + 60 + sp`
  - nature multiplier ∈ {0.9, 1.0, 1.1} applied **after** the SP addition (validated against in-game screenshots).

### 3.2 Damage model (the core primitive)
For attacker A, defender D, move m, and context ctx, `dmg(A,D,m,ctx)` returns the max-roll damage as a percentage of D's HP, using the exact Gen-9 pipeline:

```
base = ⌊⌊22·bp·Aeff/Deff⌋/50⌋ + 2
apply spread (×0.75), weather (×1.5 / ×0.5), then per-roll:
  x = ⌊base·roll/100⌋ ; ×STAB (pokéRound) ; ×typeEff (floor) ; ×item ; ×choice
```

with `pokéRound(x) = ⌈x⌉ if frac(x) > 0.5 else ⌊x⌋`. Modifiers layered in:
- **STAB** ×1.5, or ×2 with Adaptability; Protean grants STAB on any move.
- **Weather** — Rain: Water ×1.5, Fire ×0.5. Sun: Fire ×1.5, Water ×0.5.
- **Abilities** — Mega Launcher (+50% pulse/aura), Technician, Multiscale (½ at full HP), Thick Fat, Intimidate (−1 foe Atk).
- **Items** — Life Orb (×5324/4096), Expert Belt (×1.2 on super-effective), type gems (×1.2), Wise Glasses / Muscle Band (×1.1), Choice Specs (×1.5).

This primitive is validated exactly against the community damage calculator.

### 3.3 Opponent inference (handling imperfect information)
- **Own side:** exact. CHOMP reads the player's real saved team from the Showdown client's local storage and matches it to the six at preview — so *every* team the player owns is scored with its true moves/items/EVs.
- **Opponent side:** a **usage prior**. Where a common set is known (Pikalytics Reg M-B usage), it is used; otherwise a *generic best-response set* is synthesized — the highest-base-power STAB move of each of the mon's types, a coverage move, and the offensively-correct nature/EVs. This is a deliberately pessimistic-but-plausible estimate, not a claim of certainty.

### 3.4 Pairwise matchup score
For each of my mons `me` versus each foe `foe`:
```
s = 0
myKO  = bestDamage(me → foe)        // % of foe HP, max roll
foeKO = bestDamage(foe → me)
if myKO ≥ 100:  s += 3     elif ≥ 50: s += 1.2   elif ≥ 33: s += 0.4   else s −= 0.5
if foeKO ≥ 100: s −= (fasterThanFoe ? 1.0 : 2.2)  elif ≥ 50: s −= 0.6
if myKO ≥ 100 and fasterThanFoe: s += 1.0        // clean, faster KO
```
Speed uses modifiers: Choice Scarf ×1.5, Tailwind ×2, weather-speed abilities (Swift Swim/Sand Rush/Chlorophyll ×2), Speed Boost.

### 3.5 Team (bring) objective
For a candidate bring B (|B|=4) versus the opponent six F:
```
score(B,F) = Σ_{foe∈F} max_{me∈B} pair(me,foe)      // best answer to each threat
           − liabilities(B,F)
```
Liabilities encode the mechanics that lose games:
- **Weather chip.** If the opponent sets sand and my mon is not Rock/Ground/Steel, penalize per exposed mon. *Contested* if my bring also has a weather setter (halved, because I can flip it) — but sand is treated as sticky (re-sets on switch), so the penalty remains meaningful and correctly favors sand-immune Steels.
- **Contested weather war.** If both sides can set weather, damage boosts are neutralized for scoring (you can flip it) rather than handing the opponent their weather unconditionally — this fixed a real mis-call (§5).
- **Speed control.** Penalize a bring with no Tailwind / Prankster / Trick Room presence.

The best bring is `argmax_B score(B,F)` over all 15 subsets — an exhaustive search, tractable because the space is tiny.

### 3.6 Lead selection
The lead is **not** the two safest mons (which biases toward passive support). It is the pair maximizing **turn-one pressure**:
```
pressure(me) = Σ_{foe∈F} [ myKO(me,foe) ≥ 100 ? (faster ? 2 : 1.2) : (myKO ≥ 50 ? 0.4 : 0) ]
lead = top-2 of B by pressure
```
This is a deterministic proxy for the joint team-preview action that LSA-based lead predictors approximate statistically.

### 3.7 Offline team optimization (self-iteration)
Beyond reacting, CHOMP can **improve a team**. Given a starting six and a candidate set-library, it hill-climbs:
```
repeat until no improvement:
  for each roster slot i, for each candidate c not on the team:
     if gauntletScore(team with slot i → c) > current + ε:  accept swap
```
where `gauntletScore` is the mean bring-score against a fixed gauntlet of representative meta archetypes (Sun, Rain, Sand, Trick Room, Fairy, Goodstuff, Snow, Fast Offense, …). This is a lightweight, greedy analogue of double-oracle best-response.

---

## 4. Complexity and runtime
- Damage matrix: 4 × 6 × (moves) evaluations, each O(1). 
- Bring search: 15 subsets × matrix ≈ a few thousand O(1) ops.
- Total: **sub-millisecond to low-millisecond**, entirely client-side, no network, no training.

---

## 5. Iteration log (empirical tuning)
CHOMP was refined against real ranked games, not in a vacuum:

1. **v0 — type/flag heuristic.** Scored matchups by type effectiveness, speed tiers, and ~two-dozen ability flags. Fast but blind to real damage, items, and weather chip.
2. **v1 — damage-calculus core.** Replaced heuristics with the exact damage primitive (§3.2). Recommendations became KO-grounded.
3. **Weather chip + immunity.** Added after two losses to Tyranitar sand teams in which the frail rain core was chipped to death while two sand-immune Steel mons sat on the bench. CHOMP now flags the chip and recommends the Steels.
4. **Contested weather war.** Backtesting exposed a mis-call: CHOMP handed the opponent's Charizard-Y sun unconditionally and *benched the player's Blastoise* (Water halved in sun) — yet that was a game the player **won** by flipping sun→rain with his own Drizzle. Fix: when both sides can set weather, treat boosts as neutral (contestable). Re-validated: CHOMP now correctly keeps the rain setter and values the water attacker.
5. **Sand-chip calibration.** The contested rule initially over-corrected, letting CHOMP "just contest" Tyranitar sand and re-bench the Steels. Because Sand Stream re-applies on every switch, the sand penalty was re-tuned (0.6 contested / 0.75 uncontested per exposed mon) so the model still prefers Steels against sand — matching the lesson from the actual losses.
6. **KO-pressure leads.** Replaced risk-averse "safe average" lead selection (which over-picked double-support leads) with turn-one KO pressure.

---

## 6. Evaluation
Backtested on recent ranked ladder games (peak 1323):
- **Wins reproduced.** On a Charizard-Y sun game, CHOMP's contested-weather logic keeps Pelipper (to flip rain) and values the water core — the line that won.
- **Losses diagnosed.** On both Tyranitar sand losses, CHOMP recommends the sand-immune Steels (Archaludon + Kingambit) and explicitly flags the frail mons as chipped — the exact correction the player needed.
- **Interpretability.** Each recommendation ships with concrete numbers (e.g., "Blastoise → Tyranitar 154%", "2 mons chipped by their sand").

---

## 7. Limitations (honest)
- **Single-ply.** CHOMP evaluates the preview matchup, not multi-turn lines. It is not a battle policy; MCTS/RL systems remain superior *in-battle*.
- **Deterministic (exploitable).** A true solution is a mixed strategy; CHOMP's argmax can in principle be exploited by an opponent who knows it. It is a strong human-decision aid, not a Nash agent.
- **Opponent inference is a prior.** Hidden sets are estimated, not known; surprise sets (unusual items/abilities) can beat the estimate.
- **Ability/item coverage is partial.** High-impact mechanics are modeled; the long tail of ~300 abilities is not yet complete.

---

## 8. Future work
1. **Two-ply lead lookahead** (protect/switch/double-target) toward an MCTS-lite.
2. **Usage-weighted opponent belief** (full Pikalytics set distributions, not just the modal set).
3. **Mixed-strategy leads** (regret-matching over the top-k brings) to reduce exploitability.
4. **Synergy-aware team optimizer** (score cores, not just individual matchups) so self-iteration refines a team's identity instead of drifting to generic goodstuff.
5. **Broaden ability/field coverage** (terrains, hazards, Last Respects scaling, status turns).

---

## 9. References
1. S. Karten et al. *PokéChamp: an Expert-level Minimax Language Agent.* arXiv:2503.04094, 2025.
2. C. Aristidou et al. *VGC-Bench: Towards Mastering Diverse Team Strategies in Competitive Pokémon.* arXiv:2506.10326, 2025.
3. *Human-Level Competitive Pokémon via Scalable Offline Reinforcement Learning with Transformers* (Metamon). arXiv:2504.04395, 2025.
4. pmariglia. *Foul Play: A Competitive Pokémon Showdown Battle Bot.* pmariglia.github.io.
5. *Predicting competitive Pokémon VGC leads using Latent Semantic Analysis.* Journal of Geek Studies, 2025.
6. R. Dilworth. *Competitive Conquest: Charting the Climb to Pokémon Supremacy.* Mississippi State University.
7. *Nash equilibrium estimation in competitive Pokémon.* Radboud University thesis.
8. *Implementing Monte Carlo Tree Search in a Pokémon battle based environment.* Tilburg University.
