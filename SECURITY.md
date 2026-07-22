# Security and Privacy

**Version 1.0 · Last updated 2026-07-22**

## What data the software reads
| Component | Reads | Leaves your machine? |
|---|---|---|
| Plugin (userscript) | The two teams shown on the battle-preview screen. Your saved teams from the Showdown client's local storage. | **No.** All calculation is local. |
| Replay analyzer | Public replay data from `replay.pokemonshowdown.com`. | Only the request to that public API. |
| Engine | Local data files only. | **No.** |

## What the software does not do
- It does not transmit your teams, results, or account data to any server.
- It does not read your password or your session token.
- It does not modify your Showdown account, teams, or battles.
- It does not automate play. It only displays a recommendation.

## Local storage
The replay analyzer caches downloaded replays in your browser's local storage so
repeat runs are fast. Clear your browser storage to remove the cache.

## Permissions
The userscript requests `@grant none`. It runs with no elevated browser permissions.

## Reporting an issue
Open an issue in the repository with steps to reproduce.
