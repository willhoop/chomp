# ADR-001 — Evaluate one turn, not the whole battle
**Status:** Accepted · **Date:** 2026-07 · **Supersedes:** none

## Context
The decision to support is team preview: choose four of six, and two to lead. Published systems
(PokéChamp, Foul Play, VGC-Bench, Metamon) solve the full battle with search or learned policies.
Those need a simulator, training, and seconds to minutes per decision. A human at preview has
about 30 seconds.

## Decision
CHOMP evaluates the preview matchup only. It does not simulate turns.

## Consequences
**Positive.** Runs in under 50 ms in the browser. Every output is explainable by a concrete
number. No training, no server, no dependency on a battle simulator.
**Negative.** It is blind to multi-turn effects: recoil, flinch, status over time, redirection,
and setup sequencing. Setup value had to be added as an explicit correction term.
**Revisit when** a turn simulator exists (roadmap item 1).
