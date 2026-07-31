/* build_move_effects.js — generate the ONE move-effects rulebook.
 *
 * Why generated and not written by hand
 * -------------------------------------
 * "Every piece of knowledge must have a single, unambiguous, authoritative representation within a
 * system" (Hunt & Thomas, The Pragmatic Programmer, 1999). Where several representations are
 * unavoidable, DRY's own resolution is that ONE is definitive and the rest are GENERATED - never
 * hand-synchronised. This project had already been bitten twice by hand-synchronised tables:
 * mega abilities were maintained separately in champ-model.js (from Showdown) and in
 * medicham2-browser.js (from Serebii), and a mega dex merged into one data file was silently
 * invisible to the engine that needed it.
 *
 * So accuracy, secondary status chances and flinch come straight from Showdown's moves.json - the
 * same server data that runs the format - and are written to a single JSON that every engine reads.
 *
 * What it captures, per move:
 *   accuracy         - percent, or true for moves that cannot miss
 *   secondary status - brn / par / frz / psn / tox / slp and its chance
 *   flinch           - chance, and the fact that it ONLY applies if the user moves first
 *   confusion        - chance
 *   self/target stat drops - the stage changes a move applies as a side effect
 *   priority, target, drain, recoil, crit stage
 *
 *   node build/build_move_effects.js
 * Writes data/move-effects.json
 */
'use strict';
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'data', 'move-effects.json');

async function main() {
  const dex = await (await fetch('https://play.pokemonshowdown.com/data/moves.json')).json();

  const out = {};
  let withSecondary = 0, withFlinch = 0, withPrimaryStatus = 0;
  for (const [key, m] of Object.entries(dex)) {
    if (!m || !m.name) continue;
    const rec = { name: m.name, type: m.type, category: m.category, bp: m.basePower || 0 };

    // accuracy: Showdown uses `true` for "never misses"
    rec.accuracy = (m.accuracy === true) ? true : (typeof m.accuracy === 'number' ? m.accuracy : 100);
    if (m.priority) rec.priority = m.priority;
    if (m.target) rec.target = m.target;
    if (m.drain) rec.drain = m.drain;                 // [num, den] e.g. [1,2] for Drain Punch
    if (m.recoil) rec.recoil = m.recoil;
    if (m.critRatio && m.critRatio !== 1) rec.critRatio = m.critRatio;
    if (m.willCrit) rec.willCrit = true;
    if (m.multihit) rec.multihit = m.multihit;
    if (m.flags && m.flags.contact) rec.contact = true;

    /* PRIMARY effects of a status move. These were missing: the rulebook recorded only SECONDARY
     * effects, so all 271 status-category moves carried no indication of what they actually do.
     * ABRA's rollout engine, having nothing to read, applied a uniformly random status instead -
     * Thunder Wave burned a third of the time. A rulebook that omits the primary effect of a status
     * move is not a rulebook. */
    if (m.status) rec.status = m.status;                       // thunderwave -> par, willowisp -> brn
    if (m.volatileStatus) rec.volatile = m.volatileStatus;     // confusion (Confuse Ray), taunt, etc.
    if (m.weather) rec.weather = m.weather;                    // Sunny Day, Rain Dance, Sandstorm, Snow
    if (m.terrain) rec.terrain = m.terrain;
    if (m.pseudoWeather) rec.pseudoWeather = m.pseudoWeather;  // Trick Room, Gravity
    if (m.sideCondition) rec.sideCondition = m.sideCondition;  // Tailwind, Reflect, Light Screen
    if (m.heal) rec.heal = m.heal;                             // Recover, Roost

    // secondary effects: Showdown gives one `secondary` or a list of `secondaries`
    const secs = m.secondaries || (m.secondary ? [m.secondary] : []);
    const eff = [];
    for (const s of secs) {
      if (!s) continue;
      const e = { chance: s.chance == null ? 100 : s.chance };
      if (s.status) e.status = s.status;                       // brn par frz psn tox slp
      if (s.volatileStatus) e.volatile = s.volatileStatus;     // flinch, confusion
      if (s.boosts) e.targetBoosts = s.boosts;                 // stage drops on the TARGET
      if (s.self && s.self.boosts) e.selfBoosts = s.self.boosts;
      eff.push(e);
      if (e.volatile === 'flinch') withFlinch++;
    }
    if (eff.length) { rec.secondary = eff; withSecondary++; }
    // guaranteed self-boosts (Swords Dance, and the boost half of Torch Song / Scale Shot)
    if (m.self && m.self.boosts) rec.selfBoostsAlways = m.self.boosts;
    if (m.boosts) rec.targetBoostsAlways = m.boosts;           // Snarl, Charm, Icy Wind...

    if (rec.status) withPrimaryStatus++;
    out[key] = rec;
  }

  fs.writeFileSync(OUT, JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'https://play.pokemonshowdown.com/data/moves.json',
    authority: 'Authoritative — this is the server data the format runs on. Never hand-edit; re-run this generator.',
    rules: {
      flinch: 'A flinch only lands if the user moves BEFORE the target this turn, and it expires at the end of that turn. Any engine applying `volatile: flinch` must check move order and clear it on turn end.',
      status_immunity: 'A Pokemon already carrying a major status cannot take a second one. Type immunities apply: Fire cannot be burned, Electric cannot be paralysed, Ice cannot be frozen, Poison and Steel cannot be poisoned.',
      accuracy: 'accuracy === true means the move cannot miss. Otherwise it is a percentage.',
      stacking: 'A secondary chance is rolled once per hit that connects, after damage.',
      primary_status: 'A status-category move with a `status` field inflicts THAT status, not a random one. Engines must read this field rather than guessing.',
    },
    n_moves: Object.keys(out).length,
    n_with_secondary: withSecondary,
    n_with_flinch: withFlinch,
    n_with_primary_status: withPrimaryStatus,
    moves: out,
  }, null, 1));

  console.log(`build_move_effects — ${Object.keys(out).length} moves`);
  console.log(`  with a secondary effect: ${withSecondary}`);
  console.log(`  that can flinch:         ${withFlinch}`);
  console.log(`  with a PRIMARY status:   ${withPrimaryStatus}`);
  for (const k of ['rockslide', 'ironhead', 'scald', 'nuzzle', 'icebeam']) {
    const r = out[k]; if (!r) continue;
    console.log(`     ${k.padEnd(12)} acc ${String(r.accuracy).padEnd(5)} ${JSON.stringify(r.secondary || [])}`);
  }
}
main();
