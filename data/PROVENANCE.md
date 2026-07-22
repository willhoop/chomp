# Data Provenance

**Version 1.0 · Last updated 2026-07-22**
This file records where each dataset comes from, when it was captured, and how authoritative it is.

| Dataset | File | Source | Captured | Authority | Refresh |
|---|---|---|---|---|---|
| Pokémon base stats, types | `engine/champions-damage-lab.html` (`MONS`) | Pokémon Showdown damage calculator, Champions mode | 2026-07 | Authoritative for stats/types | On a new regulation |
| Move data (type, category, power) | `engine/champions-damage-lab.html` (`MOVES`) | Pokémon Showdown damage calculator | 2026-07 | Authoritative | On a new regulation |
| Type effectiveness chart | `engine/champions-damage-lab.html` (`C`) | Pokémon Showdown damage calculator | 2026-07 | Authoritative | Rarely changes |
| Move legality (Reg M-A / M-B) | `champions-learnsets.json` | HoopaDex — `raw.githubusercontent.com/willhoop/hoopadex/main/champions-learnsets.json` (~1.4 MB) | 2026-07 | **Authoritative for legality.** Schema documented in HoopaDex technical docs §3.6. Covers multiple regulations via `legalIn`. | On a new regulation |
| Usage statistics | Pikalytics `battledataregmbs3` | pikalytics.com | 2026-07 | **Prior only.** Aggregated ladder usage; not any single opponent's set. | Monthly |
| Game results | `data/replay-index.json`, `data/games.jsonl` | Showdown replay API | Continuous | Authoritative for outcomes | Continuous |

## Rules
1. Record the capture date whenever a dataset is refreshed.
2. If two sources disagree, the higher-authority source wins. See `CLAUDE.md`.
3. Never hand-edit derived data. Re-capture from the source and rebuild.
