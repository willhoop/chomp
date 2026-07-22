# Operation Ladder — Product Spec & Roadmap
*v1.0 · 2026-07-16 · owner: willhoop*

## Problem
Will plays ranked Pokémon Champions VGC (Reg M-B) and wants to climb. Fifty-four logged games show the two levers that actually move rating: eliminating repeated execution errors (8 of 23 losses are classified preventable), and avoiding bad team-vs-archetype matchups before queueing. Existing tooling (Pikalytics, damage calcs) covers neither.

## Product
A three-part system, all local and offline-capable:

1. **Operation Ladder app** (`operation-ladder` artifact) — matchup engine v6 with a verified 39-form mega database, GIGO-gated paste analysis, hill-climb team optimizer, animated battle theater, threat DB that grows with every game.
2. **Ladder Analytics dashboard** (`ladder-analytics` artifact) — the evidence layer: rating curve, per-team records, auto-classified loss causes, rolling win rate.
3. **VGC Coach plugin** (`vgc-coach.plugin`) — the protocol layer: live-call format, replay post-mortems, banned-clicks audit, so every session starts warm.

## Goals
- Cut preventable (execution) losses from ~35% of all losses toward 0 — this is the headline metric.
- Never queue a <10% archetype matchup blind: every LIVE call answered from the cheat card in one line.
- Grow the enemy-team database every session; engine scores stay honest (guidance, not win predictions — game-level validation showed r ≈ 0, and that finding stays published in THE LAB).

## Non-goals
- Simulating true battle outcomes (Champions engine is closed; the model is a coverage linter, not an oracle).
- Win-probability claims before ~190 prospective games.
- Any automation that plays the game for the pilot.

## Success metrics
- Banned-click recurrences per 10 games (target: 0; current run-rate ~1.5).
- Rating trend over next 50 games (target: net positive; currently 1132, −24 lifetime).
- Team keep/park decisions made on ≥10-game samples only.

## Roadmap
**Now**
- Log every game through replay-review; dashboard refresh per session.
- Retire Pivot Regen (1–4, park per rule); Lure C (3–0) gets the next 10-game block.

**Next**
- Engine v7: Electric Terrain + Rising Voltage layer; refreshed speed-tier card from verified mega speeds; Sash-vs-spread modeling.
- Dashboard: enemy-archetype dimension once 20+ games carry archetype tags at log time (stop inferring from notes).

**Later**
- Prospective validation rerun at n≥100 fresh games (Platt-scaled scores if signal appears).
- Optimizer outputs auto-queued as 10-game ladder hypotheses with accept/reject tracked in the dashboard.

## Build backlog (added 2026-07-17, ranked by expected rating gained)
1. **Turn-one drill trainer** — flash a random enemy six from the 45-team DB, 20s timer to click bring-4 + lead, grade vs the cheat card, track accuracy over time. The only build that trains the *pilot*, and execution errors are the largest documented loss cause (8+ of 24 losses). Highest priority.
2. **Replay auto-ingest** — app fetches a pasted replay .log itself, extracts enemy six + result + rating, appends to DB and dashboard in one click. Removes Claude as the data bottleneck; the project grows unattended.
3. **Real damage math** — wire the @smogon/calc engine (already bundled in HoopaDex) into the matchup scorer so scores use actual damage rolls vs verified Champions SP stats, not type-effectiveness proxies. The upgrade most likely to make game-level scores predictive.
4. **Verdict tracker** — log engine score vs actual result every new game; the Lab tab shows running correlation. At ~100 fresh games, an evidence-based verdict on whether the engine predicts outcomes.

## Risks
- Small samples keep lying: 3–0 Lure C is noise until ~10 games. The 30-game rule is the guardrail.
- Note-keyword loss classification is a heuristic; tag causes at log time going forward.
