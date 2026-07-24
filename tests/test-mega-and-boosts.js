/* Pins two damage-engine fixes made on 2026-07-24, both of which were silent wrongness rather than
 * crashes - the engine happily returned a number, it was just the wrong number.
 *
 *  1. MEGA FORMES. The engine held a two-entry hardcoded table (staraptor, clefable) that swapped
 *     TYPES only, so every other mega attacked and defended with its BASE form's stats. Mega
 *     Charizard Y used Charizard's 109 Special Attack instead of 159, on a Pokemon that appears in
 *     roughly 900 stored sets.
 *  2. STAT STAGES. stageBoostMul existed but was only reachable from Speed Boost and Intimidate, so
 *     there was no way to express +2 from Swords Dance / Nasty Plot / Calm Mind.
 *
 * Expected values are derived by hand from the game's own multipliers, not captured from output.
 *   node tests/test-mega-and-boosts.js
 */
'use strict';
const M = require('../engine/champ-model.js');
let P = 0, F = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? P++ : F++; };
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.6 : tol);

const mk = p => M.buildMon(M.parsePaste(p)[0]);
const ZARD = 'Charizard @ Charizardite Y\nAbility:\nLevel: 50\nModest Nature\nEVs: 2 HP / 32 SpA / 32 Spe\n- Heat Wave\n- Protect';
const TAR  = 'Tyranitar @ Tyranitarite\nAbility:\nLevel: 50\nAdamant Nature\nEVs: 2 HP / 32 Atk / 32 Spe\n- Rock Slide\n- Protect';
const FOE  = 'Incineroar @ Sitrus Berry\nAbility: Intimidate\nLevel: 50\nAdamant Nature\nEVs: 236 HP\n- Fake Out';

console.log('== megas get their own base stats, typing and ability ==');
const zard = mk(ZARD);
ok(zard.isMega, 'a Charizardite Y set is recognised as a mega');
ok(zard.megaForme === 'charizardmegay', `stone selects the FORME: ${zard.megaForme}`);
ok(zard.ability === 'drought', `unstated ability is filled from the forme: ${zard.ability}`);
ok(zard.setsWeather === 'sun', 'Drought therefore sets sun');
// base Charizard SpA is 109, Mega Y is 159 - the built stat must reflect the larger one
const zardBase = M.MONS['charizard'].bs.spa;
ok(zardBase === 109, `dex still stores the BASE species stat (${zardBase})`);
const preSet = M.parsePaste(ZARD)[0]; preSet.premega = true;
const zardPre = M.buildMon(preSet);
ok(zardPre.st.spa < zard.st.spa,
   `pre-mega Special Attack ${zardPre.st.spa} is lower than post-mega ${zard.st.spa}`);
ok(zardPre.setsWeather === null, 'before it megas it does not set the weather');
ok(zardPre.holdsStone === true, 'but it is still holding the stone');

const tar = mk(TAR);
ok(tar.megaForme === 'tyranitarmega', 'Tyranitarite selects Tyranitar-Mega');
ok(tar.ability === 'sand stream', 'Mega Tyranitar has Sand Stream');

console.log('== the multipliers, derived by hand ==');
const foe = mk(FOE), hw = M.mvByName['heat wave'];
const dmg = o => M.moveDamage(zard, foe, hw, o || {}).pct;
const sun = dmg({ weather: 'sun' });
// sun boosts Fire by 1.5, rain halves it
ok(near(dmg({}) * 1.5, sun, 0.8), `sun is x1.5 (${dmg({}).toFixed(1)} -> ${sun.toFixed(1)})`);
ok(near(dmg({}) * 0.5, dmg({ weather: 'rain' }), 0.8), 'rain is x0.5 on a Fire move');
// stat stages: +1 = 1.5x, +2 = 2x, -1 = 2/3
ok(near(sun * 1.5, dmg({ weather: 'sun', boosts: { spa: 1 } }), 0.8), '+1 SpA is x1.5');
ok(near(sun * 2.0, dmg({ weather: 'sun', boosts: { spa: 2 } }), 0.8), '+2 SpA is x2');
ok(near(sun * (2 / 3), dmg({ weather: 'sun', boosts: { spa: -1 } }), 0.8), '-1 SpA is x2/3');
ok(near(sun * 0.5, dmg({ weather: 'sun', dboosts: { spd: 2 } }), 0.8), "the foe's +2 SpD is x0.5");
// a critical hit ignores the defender's POSITIVE stages
const critPlain = dmg({ weather: 'sun', crit: true });
ok(near(critPlain, dmg({ weather: 'sun', crit: true, dboosts: { spd: 2 } }), 0.3),
   'a crit ignores the defender\'s +2 SpD');
ok(critPlain > sun, 'a crit does more than a normal hit');

console.log('== stages are clamped to the legal range ==');
ok(near(dmg({ weather: 'sun', boosts: { spa: 6 } }), dmg({ weather: 'sun', boosts: { spa: 99 } }), 0.3),
   '+99 is treated as +6');

console.log(`\nMEGA + BOOST TESTS: ${P} passed, ${F} failed`);
process.exit(F ? 1 : 0);
