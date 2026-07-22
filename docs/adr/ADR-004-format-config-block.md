# ADR-004 — Keep all regulation rules in one configuration block
**Status:** Accepted · **Date:** 2026-07

## Context
Competitive formats change every few months. Legal Pokémon, legal items, and stat rules all
change. Format assumptions were previously spread across the engine, the generators, and the
inference tables.

## Decision
All regulation-specific values live in a single `FORMAT` block at the top of
`engine/champ-model.js`. Item legality is enforced centrally in `buildMon`.

## Consequences
**Positive.** Updating for a new regulation is a one-file edit plus a rebuild.
**Negative.** The plugin and analyzer embed a copy of the engine, so a rebuild is mandatory.
This is documented in the how-to guide and listed as risk R9.
