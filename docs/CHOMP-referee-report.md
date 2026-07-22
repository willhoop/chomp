# Referee Report — Doctoral Thesis Review
## "CHOMP: A Damage-Calculus Engine for Team-Preview Decisions in Competitive Pokémon"

**Reviewer:** [Committee member — modeling of competitive Pokémon; computational methods]
**Recommendation:** *Major revisions.* The thesis makes a sound and useful contribution (a fast, interpretable preview solver) and the candidate is commendably honest about scope. However, several modeling claims are stronger than the mathematics supports, and — critically — I found **implementation defects where the code does not compute the mathematics the thesis claims.** These must be corrected before the work can be defended as a *model*, as opposed to a well-engineered heuristic.

I organize comments as: (A) foundational modeling concerns, (B) damage-mathematics concerns, (C) software-implementation audit (does the code implement the stated math?), and (D) required corrections.

---

## A. Foundational modeling concerns

**A1. The objective is a static heuristic, not an expected value.**
The thesis repeatedly calls CHOMP a "model" of the bring/lead decision, but the scoring function is a hand-weighted sum of features evaluated at a *single* time slice. A battle is a finite-horizon stochastic game; the quantity a decision-theoretic model should estimate is *E[win | bring, lead, policies]*. CHOMP estimates a proxy with no stated relationship to win probability. **The candidate should either (i) reframe the contribution as a heuristic evaluation function (honest, and still valuable), or (ii) calibrate the score against realized win rates** (logistic regression of outcome on score) so the units mean something. As written, "score 17.8" is uninterpretable.

**A2. Deterministic best-response is the wrong solution concept for a simultaneous-move game.**
Team preview is a one-shot simultaneous game; its solution is a *mixed* (Nash) strategy. CHOMP returns `argmax`. The thesis acknowledges exploitability in a sentence but does not quantify it. A referee expects at least a worst-case analysis: against an opponent who knows the policy, how much value is lost? The roadmap item "mixed-strategy leads" is not optional polish — it is the difference between a game-theoretic model and a lookup table.

**A3. Single-ply evaluation cannot see the object it is scoring.**
Setup, momentum (pivoting), positional trades, and weather/terrain *cycles* are multi-turn phenomena. A one-ply damage sum is structurally blind to them. The candidate's own Blaziken example (Speed Boost + Swords Dance) is a counterexample the model failed until a *patch* multiplier was bolted on (see B6). Bolting linear multipliers onto a static score is not a substitute for lookahead; it is curve-fitting to known failures.

**A4. Weights are unprincipled and probably double-count.**
The bring objective mixes terms of different provenance: `+3` for a KO, `−1.0` for "no speed control," `−0.6` per negative pairing, `−0.7×exposed` for sand. These magnitudes are asserted, not fit. Worse, there is plausible **double-counting**: a Tailwind user both raises per-pair speed scores *and* removes the "no speed control" penalty, so speed control is rewarded twice. A referee wants the weights either (i) fit by regression to game outcomes, or (ii) justified by a stated utility model.

---

## B. Damage-mathematics concerns

**B1. Use of extreme rolls instead of the roll distribution — KO probability is never computed.**
Gen-9 damage is uniform over 16 integer multipliers (85–100). CHOMP computes only the 85 and 100 rolls and declares "≥100% ⇒ KO." This conflates *possible* KO with *guaranteed* KO. The correct quantity is **P(KO) = |{r ∈ 85..100 : dmg(r) ≥ HP}| / 16**, further composed with move accuracy and crit probability (1/24). Reporting a single "KO %" that is actually the *max-roll fraction of HP* is a category error the thesis should fix: a "154%" and a "101%" are treated identically as "KO," but the latter is often a 10/16 roll.

**B2. Modifier chain ordering and rounding deviate from the cartridge formula.**
The reference damage pipeline applies weather, crit, STAB, type, burn, and the "final" modifiers (item, ability, screens, Tinted Lens, etc.) as an ordered sequence of 4096-denominator fixed-point multiplications, each with its own round-half-down. CHOMP collapses the ability/item/screen/support terms into a single float `M` applied with one `pokéRound` at the end. Because rounding does not commute with multiplication, **this can be off by 1 HP at exactly the thresholds that matter** (the KO boundary). For a thesis whose selling point is "exact damage," this is the most important technical correction: implement the chained-4096 rounding, or drop the word "exact."

**B3. Ability-based type immunities are specified but not enforced (see C1) — and several are missing.**
Levitate/Volt Absorb/Water Absorb/Flash Fire/Sap Sipper are named, but Wonder Guard, Bulletproof, Soundproof, Overcoat, Sap Sipper's stat effect, and Prankster-vs-Dark (a *move-legality* immunity, not damage) are absent. The strong-winds handling is a local hack that only neutralizes Flying's *weaknesses* and does not handle the interaction with Delta Stream ending.

**B4. Turn order is modeled as a total order with ties resolved in the actor's favor.**
`myFast = speed_me ≥ speed_foe` treats a speed *tie* (a genuine 50/50 in-game) as a win. Priority brackets, Trick Room inversion (in the pair scorer, not just as a flag), and in-battle paralysis (−50% speed) are not represented. Speed ties should contribute 0.5, and priority should be bracketed before base speed.

**B5. Opponent-set inference is a biased point estimate with no variance.**
Two defects: (i) the synthesizer picks the highest-base-power STAB move *per type from the global move list without a learnset filter*, so it assigns moves the species cannot learn (observed: Eruption/Water Spout on Charizard); (ii) even corrected, a BP-greedy point estimate is a biased estimator of what opponents actually run and carries no uncertainty. The statistically correct object is a **posterior distribution over sets given the species and usage prior**, propagated into the score as an expectation. The thesis's own roadmap item #2 (usage-weighted belief) is the fix and should be promoted from "future work" to "method."

**B6. Setup valuation approximates a nonlinear, sequential quantity with a linear factor.**
`boosted ≈ turn1_pct × mult` assumes damage is linear in the attacking stat. It is not — the base-damage step floors `⌊⌊22·bp·A/D⌋/50⌋`, so scaling A does not scale output exactly, and the error is largest near KO thresholds. It also ignores (a) the turn spent setting up (opportunity cost), (b) the probability of surviving to swing, modeled as a boolean, and (c) that the *opponent moves too*. This term will systematically overrate frail setup sweepers.

**B7. Weather war as a coin flip.**
"Both sides can set weather ⇒ neutral" is a binary collapse of a temporal contest that depends on speed, switch initiative, and mega timing. The sand-chip constant (0.6 contested vs 0.75) was tuned to **n = 2 games** (the two Tyranitar losses) — textbook overfitting. At minimum, report this as a tuned hyperparameter with the sample size, and prefer a mechanism (expected turns of your weather up) over a fitted constant.

**B8. Survivability ignores chip economies.**
Life Orb recoil, sandstorm/【weather】chip, hazards, and consumable items (Sitrus, Focus Sash) change who wins a 2–3 turn exchange. CHOMP's pair score is HP-full, single-hit. The sand *bring* penalty is a partial, ad-hoc acknowledgment of exactly this gap.

---

## C. Software-implementation audit (does the code compute the stated math?)

This is where the thesis is weakest, and where a software-methods committee member must insist on corrections. Several stated mechanics are **present in the code as data but never executed**, or **executed differently than described.**

**C1. Ability immunities: dead table.** `IMMUNE_ABIL` is defined, but the immunity check was never inserted at the top of `moveDamage`; the function still begins its effectiveness computation with `eff(moveType, defenderTypes)`, which only knows *type* immunities. **Consequence:** Levitate does not stop Earthquake; Volt Absorb does not stop Thunderbolt. The model silently deals full damage through documented immunities. *This is a correctness bug, not an approximation.*

**C2. Intimidate: dormant.** `moveDamage` reads `ctx.foeIntimidate`, but no caller in the matchup path ever sets it. Intimidate — one of the format's most impactful abilities — is modeled in principle and applied never. Either wire it (the defender side brings the flag) or remove the claim.

**C3. `Sheer Force` is a no-op.** The line `if(ab==='sheer force') M*=1.0;` multiplies by one. It is a placeholder that was never implemented but reads, to a casual reviewer, as "handled."

**C4. Max-roll drives the decision.** `bestDamage` returns `pct` (the 100-roll). Every downstream comparison (`≥100`, `≥50`) uses this best case. The min roll is computed and discarded. So the reported "KO%" is the *most optimistic* outcome, and the bring logic is correspondingly optimistic. This contradicts A1/B1 and should be replaced with P(KO) or at least expected damage.

**C5. Speed-modifying abilities never fire in scoring.** `speed()` honors Speed Boost and Tailwind via `ctx`, but the matchup path calls it at `turn:0` with no tailwind set, so Swift Swim/Sand Rush aside, Speed Boost is inert in the pair scorer even though it is credited in the *setup* term (C-inconsistency: two code paths disagree on whether Speed Boost matters).

**C6. Legality is enforced on damage but not on construction.** Choice Specs/Band/AV multipliers were removed (good), but `buildMon` will still happily construct a set holding an illegal item or an unlearnable move; nothing rejects it. `isBannedItem`/`isBannedMon` (from the new FORMAT block) are defined but **not called** anywhere. Config exists; enforcement does not.

**C7. Combined-modifier rounding (per B2) is a deliberate deviation** from the documented "validated exact formula." The thesis should not claim exactness for a path it knowingly approximates.

---

## D. Required corrections (priority order)

1. **Wire the dead code (C1, C2, C6).** Insert the ability-immunity check at the top of `moveDamage`; set `foeIntimidate` from the defending side; call `isBannedItem`/`isBannedMon` in `buildMon`/`parsePaste`. *(Correctness — mandatory.)*
2. **Replace max-roll KO with P(KO)** over the 16 rolls × accuracy × crit (B1, C4). Report probabilities, not a single fraction.
3. **Implement the chained-4096 rounding** or retract "exact" (B2, C7).
4. **Learnset-filter and usage-weight opponent inference** (B5) — promote roadmap #2 into the method.
5. **Calibrate the score to win rate** (A1) and **de-duplicate the speed-control terms** (A4).
6. **Treat speed ties as 0.5 and bracket priority** (B4).
7. **Report tuned constants with their sample size** and prefer mechanisms to fitted magic numbers (B7).
8. Remove or implement the `Sheer Force` no-op (C3); reconcile the two Speed-Boost code paths (C5).

## Summary
A promising, honest, and genuinely useful engineering artifact whose **empirical claims outrun its formalism** and whose **code contains several mechanics that are declared but not executed.** None of the defects is fatal; all are fixable. With the dead-code corrections (C1–C3, C6), a probabilistic KO treatment (B1), and either calibration or a reframing as a heuristic (A1), this would be a strong thesis. **Major revisions.**
