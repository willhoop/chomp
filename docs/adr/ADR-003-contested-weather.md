# ADR-003 — Treat a contested weather war as neutral
**Status:** Accepted · **Date:** 2026-07 · **Supersedes:** unconditional opponent weather

## Context
The engine originally assigned weather to whichever side had a setter, preferring a mega
setter. Against a sun team this halved the player's Water attacks and caused the engine to
remove a strong Water attacker from the recommendation. The player had won that same matchup by
switching in his own weather setter and changing the weather to rain.

## Decision
When both sides can set weather, damage boosts are scored as neutral. Sandstorm is treated
differently: the chip-damage penalty remains, because Sand Stream re-applies on every switch-in.

## Consequences
**Positive.** Correct recommendation on the sun matchup, verified against the real game.
**Negative.** The sand penalty constant was tuned on 2 games. It is a fitted value on a tiny
sample and is recorded as such in the risk register.
