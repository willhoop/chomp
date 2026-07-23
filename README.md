# CHOMP
### Champions Head-to-head Optimizer for Matchup Prediction
A real-time team-preview assistant for **Pokémon Champions VGC (Reg M-B)** on Pokémon Showdown.

At team preview you get ~30 seconds to decide **which 4 of your 6 to bring and which 2 to lead**. CHOMP answers that with real damage math — not type-chart intuition — in under 50 ms, in your browser.

---

## What it does
- **Live bring/lead panel** — reads both teams at team preview and recommends the best 4 + lead pair, with a per-threat breakdown (`Blastoise → Tyranitar 154%`).
- **Real damage model** — exact Gen-9 damage pipeline with the Champions SP stat system, returning **P(KO) across all 16 damage rolls**, not a single optimistic roll.
- **Mechanics that decide games** — weather (incl. sandstorm chip and weather wars), terrain, screens, items, abilities, speed modifiers, Intimidate, immunities, setup sweepers.
- **Replay analyzer** — pulls your Showdown replays, scores what you brought vs what CHOMP would have brought, ranks the threats you actually face, and tunes your team against *your* metagame.
- **Damage calculator** — standalone lab with 289 formes and 299 moves.

## Install (userscript)
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open `plugin/chomp-plugin-COPY-ME.txt`, select all, copy.
3. Tampermonkey → **Dashboard** → **+** (new script) → select all, delete → paste → **Ctrl+S**.
4. Reload Pokémon Showdown and start a Champions battle.

### Auto-update (recommended — set up once)
Once CHOMP is pushed to `github.com/willhoop/chomp`, install it **from the URL** and Tampermonkey
keeps it current by itself:

1. Open the raw script:
   `https://raw.githubusercontent.com/willhoop/chomp/main/app/plugin/chomp-bring4.user.js`
2. Tampermonkey detects the `.user.js` and shows an **Install** page. Click **Install**.
3. Done. Tampermonkey now checks for updates automatically. Each time the `@version` is bumped and
   pushed, the panel updates on its own — no more pasting.

The panel header shows the version (`CHOMP — BRING 4 · v2.2`), so you can confirm the current build
is running.

### Updating to a new build
The plugin panel shows its version, e.g. **CHOMP — BRING 4 · v2.1**. If a battle shows
`read 0 mine / 0 foe` or an old version number, the installed script is stale:

1. Tampermonkey → **Dashboard** → open the **CHOMP** script.
2. Select all, delete.
3. Paste the current `plugin/chomp-plugin-COPY-ME.txt`. **Ctrl+S**.
4. Reload Showdown. Check the panel shows the new version.

Tampermonkey does not auto-update this script, because it is installed by paste, not from a URL.

Works on both the classic and BETA Showdown clients, with a page-text fallback if the client internals change.

## Replay analyzer
Open `app/chomp-replay-app.html` in any browser, enter a Showdown username, click **Pull & analyze**. It caches locally, so history accumulates.

## Repo layout
```
plugin/   the userscript (install this)
app/      replay analyzer + dashboards
calc/     standalone damage calculator
engine/   champ-model.js — the damage/matchup engine
docs/     white paper, technical docs, referee report
build/    generators that assemble plugin/app from the engine
teams/    example pokepastes
```

## Updating for a new regulation
Edit the single `FORMAT` block at the top of `engine/champ-model.js` (format name, Pikalytics slug, SP rules, banned items, mega/tera flags), then re-run the generators in `build/`. See `docs/CHOMP-technical-docs.md`.

## Honest limitations
CHOMP is a **single-ply evaluator**, not a battle AI. It does **not** model multi-turn play: no recoil, flinch, status-over-time, PP, or redirection (Lightning Rod / Follow Me). Opponent sets are **inferred**, not known — inference is a point estimate and is not yet learnset-filtered. Recommendations are deterministic (no mixed strategy), and scores are relative, not calibrated to win probability. See `docs/CHOMP-referee-report.md` for a full self-critique and `docs/CHOMP-whitepaper.md` for the method.

## Credits & data
- Damage/stat formulas validated against the **Pokémon Showdown damage calculator** (Champions mode)
- Move legality from **HoopaDex** Champions learnsets
- Usage priors from **Pikalytics** (Reg M-B)
- Replays via the public **Pokémon Showdown replay API**

Not affiliated with Nintendo, Game Freak, The Pokémon Company, or Smogon/Pokémon Showdown.

## License
Add your preferred license before public release (MIT is the common choice for userscripts).
