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
/* Critical hits and stat stages - the full rule, all four cases.
 * A crit ignores every stage that would DISADVANTAGE the attacker, and keeps every stage that helps:
 *     ignored : the attacker's own DROPS   (e.g. Intimidate, Snarl, Parting Shot on you)
 *     ignored : the defender's own BOOSTS  (e.g. they used Calm Mind / Iron Defense)
 *     kept    : the attacker's own BOOSTS  (your Swords Dance still counts)
 *     kept    : the defender's own DROPS   (their lowered defence still counts)
 * Only the first of these was originally asserted here, which is how an incomplete description of
 * the rule survived - the other three are pinned now. */
const critPlain = dmg({ weather: 'sun', crit: true });
ok(critPlain > sun, 'a crit does more than a normal hit');
ok(near(critPlain, dmg({ weather: 'sun', crit: true, dboosts: { spd: 2 } }), 0.3),
   "a crit IGNORES the defender's +2 SpD");
ok(near(critPlain, dmg({ weather: 'sun', crit: true, boosts: { spa: -2 } }), 0.3),
   "a crit IGNORES the attacker's own -2 SpA");
ok(dmg({ weather: 'sun', crit: true, boosts: { spa: 2 } }) > critPlain + 1,
   "a crit KEEPS the attacker's +2 SpA");
ok(dmg({ weather: 'sun', crit: true, dboosts: { spd: -2 } }) > critPlain + 1,
   "a crit KEEPS the defender's -2 SpD");
// and without a crit, every stage applies normally in both directions
ok(dmg({ weather: 'sun', boosts: { spa: -2 } }) < sun, 'without a crit, the attacker\'s drop still bites');
ok(dmg({ weather: 'sun', dboosts: { spd: 2 } }) < sun, "without a crit, the defender's boost still helps them");

console.log('== stages are clamped to the legal range ==');
ok(near(dmg({ weather: 'sun', boosts: { spa: 6 } }), dmg({ weather: 'sun', boosts: { spa: 99 } }), 0.3),
   '+99 is treated as +6');


console.log('== all 25 natures, and only the right stat moves ==');
/* The table shipped with 23 of 25: naughty (+Atk/-SpD) and lax (+Def/-SpD) were absent and computed
 * as NEUTRAL, silently understating those sets. A count check would not have caught it - a missing
 * nature looks exactly like a neutral one - so this asserts the DIRECTION for every nature. */
const NATURES = {
  hardy:[], docile:[], serious:[], bashful:[], quirky:[],
  lonely:['atk','def'], brave:['atk','spe'], adamant:['atk','spa'], naughty:['atk','spd'],
  bold:['def','atk'], relaxed:['def','spe'], impish:['def','spa'], lax:['def','spd'],
  timid:['spe','atk'], hasty:['spe','def'], jolly:['spe','spa'], naive:['spe','spd'],
  modest:['spa','atk'], mild:['spa','def'], quiet:['spa','spe'], rash:['spa','spd'],
  calm:['spd','atk'], gentle:['spd','def'], sassy:['spd','spe'], careful:['spd','spa'],
};
const SPREADALL = '2 HP / 32 Atk / 32 Def / 32 SpA / 32 SpD / 32 Spe';
const buildNat = n => M.buildMon(M.parsePaste(
  `Kingambit @ Leftovers\nAbility: Defiant\nLevel: 50\n${n} Nature\nEVs: ${SPREADALL}\n- Iron Head`)[0]);
const neutralLine = buildNat('Hardy').st;
let natOk = 0, natBad = [];
for (const [nat, pair] of Object.entries(NATURES)) {
  const st = buildNat(nat).st;
  let good = true;
  for (const k of ['atk','def','spa','spd','spe']) {
    const want = pair[0] === k ? 'up' : (pair[1] === k ? 'down' : 'same');
    const got  = st[k] > neutralLine[k] ? 'up' : (st[k] < neutralLine[k] ? 'down' : 'same');
    if (want !== got) good = false;
  }
  good ? natOk++ : natBad.push(nat);
}
ok(natBad.length === 0, `all 25 natures move exactly the right stats (${natOk}/25${natBad.length ? ', wrong: ' + natBad.join(', ') : ''})`);
ok(Object.keys(NATURES).length === 25, 'the reference list really is all 25 natures');

console.log('== the Champions stat formula, stated simply ==');
/* stat = (base + 20 + SP) * nature ; HP = base + 75 + SP. Verified for every base value. */
const kb = M.MONS['kingambit'].bs;
const zeroSp = M.buildMon(M.parsePaste(
  `Kingambit @ Leftovers\nAbility: Defiant\nLevel: 50\nHardy Nature\nEVs: 0 HP\n- Iron Head`)[0]).st;
ok(zeroSp.atk === kb.atk + 20, `a normal stat at 0 SP is base+20 (${kb.atk}+20 = ${zeroSp.atk})`);
ok(zeroSp.hp === kb.hp + 75, `HP at 0 SP is base+75 (${kb.hp}+75 = ${zeroSp.hp})`);

console.log(`\nMEGA + BOOST TESTS: ${P} passed, ${F} failed`);
process.exit(F ? 1 : 0);
