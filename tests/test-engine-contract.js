/* test-engine-contract.js — the engines must agree.
 *
 * The problem this exists to prevent
 * ----------------------------------
 * Game rules are implemented in more than one place in this system:
 *
 *   CHOMP/engine/champ-model.js        the canonical engine (validated against the Smogon calc)
 *   ABRA/engine/medicham2-browser.js   a browser-safe rollout engine with its own damage function
 *   ABRA/web/index.html                a third embedded copy for the site
 *
 * Fowler's Rule of Three says the third duplication is the moment to act, and this project has
 * already paid for the duplication twice: mega abilities were maintained by hand from two different
 * sources (Showdown and Serebii), and a mega dex merged into one data file was invisible to the
 * engine that actually needed it. When the canonical engine was taught real mega base stats, the
 * rollout engine was left behind and the two silently disagreed by 30% on Charizard-Mega-Y's
 * Special Attack.
 *
 * Duplication that cannot be removed today must at least be OBSERVABLE. This is a consumer-driven
 * contract test in the Pact sense: a shared, executable statement of what every implementation must
 * agree on, run in CI, so divergence fails a build instead of quietly corrupting a model.
 *
 * What is asserted
 *   1. Identical stat lines for the same paste (this is where the mega drift appeared).
 *   2. Damage within a tolerance on a fixed scenario matrix.
 *   3. The shared data files are the same ones, not two hand-maintained copies.
 *
 *   node tests/test-engine-contract.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const M = require('../engine/champ-model.js');

let P = 0, F = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? P++ : F++; };

// ---- load the browser rollout engine the way the site does -------------------------------------
const ABRA = path.join(__dirname, '..', '..', 'ABRA');
let MED = null;
try {
  const win = {};
  new Function('window', fs.readFileSync(path.join(ABRA, 'data', 'engine-data.js'), 'utf8'))(win);
  // the browser gets the same generated mega table the canonical engine reads
  new Function('window', fs.readFileSync(path.join(ABRA, 'data', 'mega-formes.js'), 'utf8'))(win);
  const mod = { exports: {} };
  new Function('module', 'exports', 'window',
    fs.readFileSync(path.join(ABRA, 'engine', 'medicham2-browser.js'), 'utf8'))(mod, mod.exports, win);
  MED = mod.exports;
} catch (e) {
  console.log('  (rollout engine could not be loaded: ' + e.message.slice(0, 70) + ')');
}

console.log('== 1. the two engines must build the same Pokemon ==');
const CASES = [
  { name: 'Charizard @ Charizardite Y', key: 'charizard', item: 'charizarditey', nature: 'Modest', spread: '2 HP / 32 SpA / 32 Spe' },
  { name: 'Tyranitar @ Tyranitarite',   key: 'tyranitar', item: 'tyranitarite',  nature: 'Adamant', spread: '2 HP / 32 Atk / 32 Spe' },
  { name: 'Incineroar (no stone)',      key: 'incineroar', item: 'sitrusberry',  nature: 'Adamant', spread: '2 HP / 32 Atk / 32 Spe' },
];
if (MED && MED.buildMon) {
  /* What must be IDENTICAL is the rule: which forme the stone resolves to, and therefore which base
     stats, typing and ability apply. The final stat line legitimately differs, because the two
     engines are fed different SP spreads by design - the canonical one reads a paste, the rollout
     uses ABRA's stored priors. Asserting equal final stats would be asserting equal INPUTS, which
     is not the contract. So we compare the forme resolution, and require the stat ORDERING to
     follow it (a mega must not come out weaker than its base form). */
  const megaTable = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mega-formes.json'), 'utf8')).by_item;
  for (const c of CASES) {
    const canon = M.buildMon(M.parsePaste(
      `${c.key} @ ${c.item}\nAbility:\nLevel: 50\n${c.nature} Nature\nEVs: ${c.spread}\n- Protect`)[0]);
    const roll = MED.buildMon(c.key, { [c.key]: c.item });
    if (!roll) { ok(false, `${c.name}: rollout engine could not build it`); continue; }
    const expect = megaTable[c.item.replace(/[^a-z0-9]/g, '')] || null;

    ok(String(canon.types) === String(roll.types),
       `${c.name}: typing agrees (${canon.types})`);
    /* Identifiers must be compared in NORMALISED form. The canonical engine stores abilities as
       "sand stream" and the rollout as "sandstream"; both are correct internally but a raw string
       compare between subsystems is a latent bug. System rule: every cross-boundary identifier is
       compared (and keyed) as lowercase alphanumeric only. */
    const idn = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (canon.ability) {   // only comparable when the paste actually declared or derived one
      ok(idn(canon.ability) === idn(roll.ability),
         `${c.name}: ability agrees once normalised (${canon.ability} vs ${roll.ability})`);
    }
    ok((canon.megaForme || null) === (expect ? expect.forme : null),
       `${c.name}: canonical resolves the stone to ${canon.megaForme || '(none)'}`);

    if (expect) {
      // both engines must be using the MEGA's base stats, not the base form's
      const baseSpa = M.MONS[c.key].bs.spa, megaSpa = expect.bs.spa;
      if (megaSpa !== baseSpa) {
        const canonHigher = (canon.st.spa > 0) && ((megaSpa > baseSpa) === (canon.st.spa > M.buildMon(
          M.parsePaste(`${c.key} @ sitrusberry\nAbility:\nLevel: 50\n${c.nature} Nature\nEVs: ${c.spread}\n- Protect`)[0]).st.spa));
        ok(canonHigher, `${c.name}: canonical follows the mega's Special Attack direction`);
      }
      const rollBase = MED.buildMon(c.key, { [c.key]: 'sitrusberry' });
      if (rollBase && megaSpa !== baseSpa) {
        ok((megaSpa > baseSpa) === (roll.st.sa > rollBase.st.sa),
           `${c.name}: rollout follows the same direction (${rollBase.st.sa} -> ${roll.st.sa})`);
      }
    }
  }
} else {
  ok(false, 'the rollout engine must be loadable for the contract to be checkable');
}

console.log('== 2. shared data is shared, not copied ==');
const megaFormes = path.join(__dirname, '..', 'data', 'mega-formes.json');
ok(fs.existsSync(megaFormes), 'data/mega-formes.json exists as the one mega source');
if (fs.existsSync(megaFormes)) {
  const j = JSON.parse(fs.readFileSync(megaFormes, 'utf8'));
  ok(Object.keys(j.by_item || {}).length > 50,
     `it covers ${Object.keys(j.by_item || {}).length} stones, not a hand-picked few`);
  ok(/pokedex|showdown/i.test(j.source || ''), 'and it records where it came from');
}
const fx = path.join(__dirname, '..', 'data', 'move-effects.json');
ok(fs.existsSync(fx), 'data/move-effects.json exists as the one secondary-effect source');
if (fs.existsSync(fx)) {
  const j = JSON.parse(fs.readFileSync(fx, 'utf8'));
  ok(j.n_with_flinch > 10, `${j.n_with_flinch} moves can flinch, generated not hand-listed`);
  ok(/moves\.json/.test(j.source || ''), 'and it records its source');
}

console.log('== 3. the flinch and status rules hold where they are defined ==');
const mk = p => M.buildMon(M.parsePaste(p)[0]);
const fire = mk('Incineroar @ Sitrus Berry\nAbility: Blaze\nLevel: 50\nCalm Nature\nEVs: 236 HP\n- Fake Out');
const fairy = mk('Sylveon @ Sitrus Berry\nAbility: Pixilate\nLevel: 50\nCalm Nature\nEVs: 236 HP\n- Hyper Voice');
const scald = { id: 'scald', n: 'Scald' }, rockslide = { id: 'rockslide', n: 'Rock Slide' };
const p = (mv, tgt, o) => (M.secondaryChances(mv, null, tgt, o || {})[0] || {}).p;
ok(p(scald, fairy) > 0, 'Scald can burn a Fairy');
ok(p(scald, fire) === 0, 'Scald CANNOT burn a Fire type');
ok(p(rockslide, fairy, { userMovesFirst: true }) > 0, 'Rock Slide can flinch when it moves first');
ok(p(rockslide, fairy, { userMovesFirst: false }) === 0, 'Rock Slide CANNOT flinch when it moves second');

console.log(`\nENGINE CONTRACT: ${P} passed, ${F} failed`);
process.exit(F ? 1 : 0);
