# Champions Reg M-B — Verified Status Rules
*Source: serebii.net/pokemonchampions/statusconditions.shtml (authoritative). Confirmed in-game: Espathra thawed same-turn off Blizzard, game #60.*

Champions rebalanced status durations/rates vs the main series:

| Status | Champions rule | vs main series |
|---|---|---|
| **Freeze** | 25% thaw each turn it tries to move, **guaranteed thaw on the 3rd turn** (max 2 frozen turns). Fire-type moves and self-thaw moves (Flare Blitz, Scald, Scorching Sands, Pyro Ball, etc.) thaw instantly. Fire-types can't be frozen. | Was 20%/turn, no hard cap. |
| **Paralysis** | **12.5% full-para** chance; speed still halved to 50%. | Full-para was 25%. |
| **Sleep** | Can't move; **33.3% wake on turn 2, 100% wake on turn 3** (max 2 turns asleep). | Was random 2–4 turns. |

## Play implications
- **Paralysis is now the premium status to spread**: only 1-in-8 skip a turn, but the **50% speed cut is unchanged** — that's the real speed-control value (Thunder Wave, Nuzzle, Glare, Stun Spore). Great to inflict, low downside to receive.
- **Sleep and Freeze are both hard-capped at ~2 turns** — reliable short-term disables, no more 4-turn sleep lockouts or infinite freeze griefs. Plan for the wake/thaw on turn 3.
- Freeze self-thaw clicks (Scald/Scorching Sands/Flare Blitz) still break you out early; a Fire move on a frozen ally-target thaws it.

## To fold into the vgc-coach plugin
Add this table to `skills/live-call/references/format-rules.md` next time the plugin is rebuilt (current installed copy still has the old "unverified" note).
