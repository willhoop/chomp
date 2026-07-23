# CHOMP — Technical Documentation

**Version 1.1 · Last updated 2026-07-22**
Written in ASD-STE100 Simplified Technical English. Organised with the Diátaxis model.

---

## 0. About this document

### 0.1 Purpose
This document tells you how to install, operate, and change CHOMP. A new engineer can use this
document to start work without help.

### 0.2 Structure
This document has four parts:
- **Part 1 — Tutorial.** Learn CHOMP. Get your first recommendation.
- **Part 2 — How-to guides.** Do one specific task.
- **Part 3 — Reference.** Find facts: files, formulas, and settings.
- **Part 4 — Explanation.** Understand why the design is like this.

### 0.3 Terms
Use these terms with these meanings only.

| Term | Meaning |
|---|---|
| the engine | The file `engine/champ-model.js`. It calculates damage and matchups. |
| the plugin | The userscript. It shows the panel in the battle. |
| the analyzer | The file `app/chomp-replay-app.html`. It reads your replays. |
| a set | The moves, the item, the ability, the nature, and the stat spread of one Pokémon. |
| the bring | The four Pokémon that you take into a game. |
| the lead | The two Pokémon that you send out first. |
| pKO | The probability of a knockout. The engine calculates it from 16 damage rolls. |
| SP | The stat points of the Champions format. |

---

# PART 1 — TUTORIAL
*Learn CHOMP. Do these steps one time.*

## 1.1 Install the plugin
Do these steps:

1. Install the Tampermonkey extension in your browser.
2. Open the file `app/plugin/chomp-plugin-COPY-ME.txt`.
3. Select all of the text. Copy the text.
4. Click the Tampermonkey icon. Click **Dashboard**.
5. Click the **+** tab to make a new script.
6. Select all of the template text. Delete the text.
7. Paste the text that you copied.
8. Press **Ctrl+S** to save the script.
9. Reload the Pokémon Showdown page.

The plugin is now active.

## 1.1a Update the plugin to a new build
The panel header shows the version, for example **CHOMP — BRING 4 · v2.1**. The plugin does not
update itself, because you install it by paste and not from a web address. To update:

1. Open the file `app/plugin/chomp-plugin-COPY-ME.txt`.
2. Select all of the text. Copy the text.
3. Click the Tampermonkey icon. Click **Dashboard**.
4. Open the **CHOMP** script.
5. Select all of the old text. Delete the text.
6. Paste the new text. Press **Ctrl+S**.
7. Reload the Pokémon Showdown page.
8. Start a battle. Check that the panel shows the new version number.

If the panel shows `read 0 mine / 0 foe` while a battle is open, the installed script is old. Do
the update steps above.

## 1.2 Get your first recommendation
Do these steps:

1. Start a Champions battle.
2. Wait for the team preview screen.
3. Look at the panel in the top right corner.

The panel shows the bring, the lead, the weather, and a knockout percentage for each opponent
Pokémon. If the panel is empty, it shows a diagnostic message. Read Part 2.5 for the messages.

## 1.3 Analyse your games
Do these steps:

1. Open the file `app/chomp-replay-app.html` in your browser.
2. Type your Showdown username in the **User** box.
3. Click **Pull & analyze**.

The analyzer shows your record. It shows the Pokémon that you play against most. It shows the
bring that CHOMP recommends for each game.

---

# PART 2 — HOW-TO GUIDES
*Do one task.*

## 2.1 How to update CHOMP for a new regulation
1. Open the file `engine/champ-model.js`.
2. Find the block `FORMAT` at the top of the file.
3. Change the format name and the Pikalytics slug.
4. Change the SP budget, the SP cap, and the level if the format changes them.
5. Add the new banned items to `bannedItems`.
6. Add the new banned Pokémon to `bannedMons`.
7. Save the file.
8. Do the steps in Part 2.2.

## 2.2 How to rebuild the plugin and the analyzer
The plugin and the analyzer contain a copy of the engine. You must rebuild them after you change
the engine.

1. Open a terminal in the folder `build/`.
2. Run `python3 build_v2_userscript.py`.
3. Run `python3 build_replay_app.py`.
4. Install the new plugin again. Do the steps in Part 1.1.

**Caution:** If you do not rebuild, the plugin keeps the old engine.

## 2.3 How to add a Pokémon or a move
The engine reads the Pokémon data and the move data from `engine/champions-damage-lab.html`.

1. Open `engine/champions-damage-lab.html`.
2. Find the object `MONS` for a Pokémon, or the object `MOVES` for a move.
3. Add the new entry. Use the same format as the entries near it.
4. Save the file.
5. Do the steps in Part 2.2.

## 2.4 How to check that a move is legal
1. Open the Champions learnsets data from HoopaDex.
2. Find the Pokémon.
3. Make sure that the move is in the list, and that the list includes `reg-mb`.

Do not recommend a move that fails this check.

## 2.5 How to read the plugin diagnostic messages
The panel shows a message when it cannot read the teams.

| Message | Meaning | Action |
|---|---|---|
| `no battle open` | The plugin cannot find a battle. | Open a battle. Reload the page. |
| `read 0 mine / 0 foe` | The plugin found a battle, but the battle log is empty. | The page-text fallback runs automatically. If the message stays, report it. |
| `read from page text` | The plugin read the teams from the page. | No action. This is normal on the BETA client. |
| `read 6 mine / 6 foe` | The plugin read both teams correctly. | No action. |

## 2.6 How to change the recommendation logic
1. Open `engine/champ-model.js`.
2. To change how one Pokémon scores against one opponent, edit the function `monVsFoe`.
3. To change how the engine picks the four, edit the function `teamVs`.
4. To change how the engine picks the two, edit the function `bring4`.
5. Save the file. Do the steps in Part 2.2.

---

# PART 3 — REFERENCE
*Facts. Read this when you need a specific detail.*

## 3.1 Folder structure
```
CHOMP/
  README.md            What CHOMP is. Install steps. Quick start.
  CHANGELOG.md         All changes. Newest first.
  CLAUDE.md            Project-specific instructions.
  docs/                White paper, this document, referee report, guides.
  engine/              champ-model.js, champ-iterate.js, champions-damage-lab.html
  app/                 chomp-replay-app.html, dashboards
    plugin/            The userscript.
    calc/              The damage calculator.
  build/               The scripts that build the plugin and the analyzer.
  data/                Game logs, replay index, team pastes.
  tests/               Test scripts.
  assets/              Images and exports.
```

## 3.2 Architecture
```
champions-damage-lab.html   (Pokémon data, move data, type chart)
HoopaDex learnsets          (move legality)
Pikalytics Reg M-B          (opponent set priors)
            |
            v
      engine/champ-model.js
   (stats -> damage -> pKO -> matchup -> bring and lead)
            |
   +--------+--------+----------------+
   v                 v                v
plugin           analyzer        champ-iterate.js
(live panel)     (replays)       (team optimiser)
```

The plugin and the analyzer contain a copy of the engine. The build scripts make the copy.

## 3.3 Stat formulas
The Champions format uses the SP system. The engine uses these formulas:

```
statL50(base, sp, nature) = floor((floor((2 x base + 31) x 50 / 100) + 5 + sp) x nature)
hpL50(base, sp)           = floor((2 x base + 31) x 50 / 100) + 60 + sp
```

The nature multiplier is 1.1, 1.0, or 0.9. Apply the nature multiplier **after** you add the SP.
The SP budget is 66 points. The maximum for one stat is 32 points. The level is 50. The IVs are 31.

## 3.4 Damage formula
```
base = floor(floor(22 x power x attack / defence) / 50) + 2
```
Then apply these steps in this order:
1. Spread damage: multiply by 0.75.
2. Weather: multiply by 1.5 or 0.5.
3. Critical hit: multiply by 1.5.
4. For each roll from 85 to 100:
   a. Multiply the base by the roll. Divide by 100. Take the floor.
   b. Apply STAB. Use `pokeRound`.
   c. Apply type effectiveness. Take the floor.
   d. Apply the item, the abilities, the screens, and the support modifiers. Use `pokeRound`.

`pokeRound(x)` gives `ceil(x)` if the fraction is more than 0.5. If not, it gives `floor(x)`.

**pKO** is the number of rolls that reach the target HP, divided by 16.

## 3.5 The FORMAT configuration block
This block is at the top of `engine/champ-model.js`. It holds all of the values that change
between regulations.

| Field | Meaning |
|---|---|
| `name` | The format name. |
| `pikalyticsSlug` | The slug for the usage data. |
| `level` | The Pokémon level. |
| `sp.budget`, `sp.cap`, `sp.autoIV` | The SP rules. |
| `megasAllowed`, `oneMegaPerBattle`, `teraAllowed` | The format switches. |
| `bannedItems` | The items that the format does not allow. |
| `legalChoiceItems` | The Choice items that the format allows. |
| `bannedMons` | The Pokémon that the format does not allow. |

## 3.6 Engine functions
| Function | Purpose |
|---|---|
| `parsePaste(text)` | Reads a pokepaste. Gives a list of sets. |
| `buildMon(set)` | Makes a battle-ready Pokémon. Calculates the stats. Removes banned items. |
| `moveDamage(att, def, move, ctx)` | Gives the damage percentage and the pKO for one move. |
| `bestDamage(att, def, ctx)` | Gives the best move by pKO, then by damage. |
| `monVsFoe(me, foe, ctx)` | Gives a score for one Pokémon against one opponent. |
| `teamVs(my4, foe6, opts)` | Gives a score for one bring against the opponent team. |
| `bring4(my6, foe6, opts)` | Gives the best four and the best two. |
| `resolveWeather(my, foe)` | Gives the weather and tells you if the weather is contested. |

## 3.7 Modelled mechanics
The engine models these mechanics:
- Weather: rain, sun, sandstorm, snow, heavy rain, harsh sun, strong winds. Sandstorm chip damage.
- Terrain: Electric, Grassy, Psychic, Misty. Grassy Terrain halves Earthquake. Misty Terrain halves Dragon.
- Screens: Reflect, Light Screen, Aurora Veil. The engine uses the doubles value.
- Rooms: Wonder Room.
- Immunities from abilities: Levitate, Volt Absorb, Water Absorb, Flash Fire, Sap Sipper.
- Offensive abilities: Adaptability, Mega Launcher, Protean, Technician, Tough Claws, Iron Fist,
  Sharpness, Water Bubble, Transistor, Tinted Lens, Sand Force, and others.
- Defensive abilities: Multiscale, Filter, Solid Rock, Thick Fat, Ice Scales, Fur Coat, Fluffy, Heatproof.
- Intimidate.
- Items: Life Orb, Expert Belt, type items, Wise Glasses, Muscle Band, Punching Glove.
- Support abilities for doubles: Helping Hand, Battery, Power Spot, Friend Guard, Flower Gift, Steely Spirit.
- Burn.
- Speed changes: Choice Scarf, Tailwind, Swift Swim, Sand Rush, Chlorophyll, Speed Boost.

## 3.8 Data sources
| Source | Use | Authority |
|---|---|---|
| Showdown damage calculator (Champions) | Stat and damage formulas | Highest. |
| HoopaDex Champions learnsets | Move legality | Highest for legality. |
| Pikalytics Reg M-B | Opponent set priors | A prior. Not certain. |
| Showdown replay API | Game data | Highest for results. |

---

# PART 4 — EXPLANATION
*Why the design is like this.*

## 4.1 Why the engine looks at one turn only
The engine calculates the matchup at team preview. It does not simulate the battle. A one-turn
model is fast and easy to understand. Every recommendation has a number that you can check.

The cost is real. The engine cannot see multi-turn effects. It does not model recoil, flinch,
status damage over time, or redirection.

## 4.2 Why the engine uses pKO and not a single roll
Damage has 16 possible rolls. An earlier version used the maximum roll only. That version called a
hit a "knockout" when only one roll in 16 gave a knockout. The engine now counts the rolls that
give a knockout. This number is honest.

## 4.3 Why a contested weather war scores as neutral
Both players can set weather. If the engine gives the weather to the opponent, it makes bad
recommendations. In one game the engine removed a water attacker against a sun team. The player
won that game because he changed the weather to rain.

The engine now treats the weather as neutral when both sides can set it. Sandstorm is different.
Sand Stream sets the sandstorm again after each switch. Therefore the engine keeps a penalty for
Pokémon that take sandstorm damage.

## 4.4 Why the lead uses knockout pressure
An earlier version chose the lead with the best average matchup. Support Pokémon win that test,
because they lose no matchups. The lead was too passive. The engine now chooses the two Pokémon
that threaten the most immediate knockouts.

## 4.5 Known limitations
- The engine looks at one turn. It is not a battle AI.
- The engine does not model recoil, flinch, status over time, PP, or redirection.
- The opponent sets are estimates. The engine does not check them against the learnsets.
- The engine gives one answer. It does not use a mixed strategy. A skilled opponent can learn it.
- The score is relative. It is not calibrated against a win rate.
- The engine combines some damage modifiers into one multiplier. The result can differ by 1 HP.

## 4.6 Roadmap
1. **Turn simulator.** This gives recoil, flinch, status, redirection, and switch logic.
2. **Usage-weighted opponent sets.** This uses the full Pikalytics distribution. It also removes
   illegal moves from the estimated sets.
3. **Mixed-strategy leads.** This makes the recommendation harder to predict.
4. **Synergy in the team builder.** This scores cores, not single matchups.

---

## References
1. ASD-STE100 Simplified Technical English. ASD. https://www.asd-ste100.org/
2. Procida, D. *Diátaxis: A systematic framework for technical documentation.* https://diataxis.fr/
3. Pokémon Showdown damage calculator (Champions mode). https://calc.pokemonshowdown.com/champions.html
4. Pokémon Showdown replay API. https://replay.pokemonshowdown.com/
