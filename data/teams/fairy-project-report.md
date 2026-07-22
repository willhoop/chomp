# Fairy Aura Team — Simulation Project Report
*Heuristic matchup model built from all 45 opponent teams in your 55 logged games. NOT a true battle sim — Champions' engine isn't public — but every scoring rule comes from a lesson you paid rating for (Defiant/Contrary/inversion punishing Intimidate, Queenly vs priority, TR/Taunt structure, sun needing Rock/Electric, etc.).*

## Model validation (why trust it directionally)
- It scored **Lure C's worst matchups as sun/dual-weather** — exactly your real 0-2 there.
- Baseline fairy team's worst = **EQ cores and TR bulk** — matching the structural holes we predicted by hand.
- It independently rediscovered "Incineroar's Intimidate is a liability" — removing Incin was its first improvement in every run.

## Results
| Team | Mean score | Worst matchups |
|---|---|---|
| Baseline fairy (Floette/Sylveon/Whimsi/Chomp/Gambit/Incin) | 11.95 | EQ cores, TR bulk, IlBurto rain |
| **Constrained optimum (aura identity locked)** | **14.36** | TR bulk, EQ cores (improved), sun |
| Unconstrained optimum | 16.28 | (drifts off-theme — see below) |
| Lure C (reference) | 13.80 | sun, dual-weather |

## The two tweak rounds
**Round 1 (identity kept):** swap **Kingambit → Gholdengo** and **Incineroar → Tsareena**.
- Ghold covers everything Gambit did vs fairies/steels but adds the Sneasler/Staraptor walls and the Trick/closer role — and doesn't hand sun teams a 2x Heat Wave target.
- Tsareena adds Taunt (the TR hole, fixed), Queenly (priority denial), and the proven HJK executioner.
- Cutting Incin removes the Intimidate donation vs the Defiant/Contrary/inversion crowd — the single most repeated loss cause in your 55 games.

**FINAL: Floette-Mega / Sylveon / Whimsicott / Garchomp / Gholdengo / Tsareena**

**Round 2 finding (honest):** unconstrained, the optimizer abandons the fairy-spam thesis and converges toward your proven Lure-mons (Tsareena/Ghold/Meow + Talonflame). Translation: *the aura gimmick costs ~2 points of matchup equity vs just playing your best six mons.* You're paying that for the fun and the Garchomp-deletion button. Worth knowing, not necessarily worth obeying.

## Recursive improvement template (the ongoing project)
1. **After each ladder session:** send replays → tracker logs result + enemy six.
2. New enemy sixes get appended to `TEAMS` in `vgc_sim.py`; new mechanics become scoring rules (one line each).
3. **Re-run `python3 vgc_sim.py`** → re-optimized roster + fresh worst-matchup list.
4. Worst 5 matchups → cheat-card rows get rewritten first.
5. Any real result that contradicts the model → adjust that rule's weight (ground truth beats heuristics, always).
Selection pressure = fewest likely-loss matchups first, then highest mean. Over sessions this evolves the roster against YOUR ladder, not the global meta.

## Final paste
```
=== [gen9championsvgc2026regmb] Fairy Aura v2 ===

Floette-Eternal (F) @ Floettite
Ability: Flower Veil
Level: 50
Modest Nature
EVs: 32 HP / 32 SpA / 2 SpD
- Light of Ruin
- Moonblast
- Dazzling Gleam
- Protect

Sylveon (M) @ Fairy Feather
Ability: Pixilate
Level: 50
Modest Nature
EVs: 32 HP / 32 SpA / 2 SpD
- Hyper Voice
- Moonblast
- Helping Hand
- Protect

Whimsicott (F) @ Focus Sash
Ability: Prankster
Level: 50
Timid Nature
EVs: 2 HP / 32 SpA / 32 Spe
- Tailwind
- Encore
- Moonblast
- Protect

Garchomp (M) @ Life Orb
Ability: Rough Skin
Level: 50
Jolly Nature
EVs: 2 HP / 32 Atk / 32 Spe
- Earthquake
- Rock Slide
- Dragon Claw
- Protect

Gholdengo @ Choice Scarf
Ability: Good as Gold
Level: 50
Timid Nature
EVs: 2 HP / 32 SpA / 32 Spe
- Make It Rain
- Shadow Ball
- Thunderbolt
- Trick

Tsareena (F) @ Wide Lens
Ability: Queenly Majesty
Level: 50
Adamant Nature
EVs: 2 HP / 32 Atk / 32 Spe
- High Jump Kick
- Trop Kick
- Triple Axel
- Taunt
```
Notes: Sylveon Fairy Feather (your correction, kept). Tsareena on Wide Lens since Life Orb went to Chomp — HJK/Triple Axel accuracy has cost you 3 games; this trades ~10% damage for reliability. EQ discipline: Chomp's spread EQ hits Ghold/Floette partners — position or Protect accordingly (Sylveon/Whimsi/Tsareena are the safe EQ partners... Whimsi/Tsareena grounded-neutral, Floette takes it — check before clicking).
