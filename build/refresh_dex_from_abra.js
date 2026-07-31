/* refresh_dex_from_abra.js — re-source CHOMP's species table from ABRA's validated artifact.
 *
 * WHY THIS EXISTS
 * ---------------
 * build/build_lab.js reads its inputs from `/tmp/champ_dex.json`, `/tmp/champ_megas.json` and
 * `/tmp/champ_moves.json`. Those files are gone, and being in /tmp they were never version
 * controlled — so the species table underneath champions-damage-lab.html, engine/champ-model.js and
 * both shipped userscripts COULD NOT BE REGENERATED FROM ANYTHING. The build was not stale, it was
 * unrunnable, which is why nobody noticed the data ageing.
 *
 * Two consequences, both measured on 2026-07-31:
 *
 *   1. The shipped plugin carries 289 species and 57 mega formes. ABRA's dex, after repairing a
 *      builder whose key convention never matched, carries 308 and 75. CHOMP has been recommending
 *      brings against a dex missing 19 Pokemon.
 *   2. ABILITIES ARE STRUCTURALLY ABSENT. build_lab.js writes `{name, t, bs}` and nothing else, so
 *      no ability ever entered the pipeline. Every mega in the plugin is a stat block with no
 *      identity: no Drought on Charizard-Mega-Y, no Swift Swim on Swampert-Mega, no Contrary on
 *      Staraptor-Mega, no Intimidate anywhere. In a format where megas are 26.0% of usage and the
 *      weather cores ARE megas, that is not a rounding error.
 *
 * WHY ABRA IS THE SOURCE
 * ----------------------
 * `../ABRA/data/engine-data.js` is generated, version controlled, gated by ABRA's artifact audit,
 * and its damage numbers are validated against the Smogon calculator. It is a strict superset of
 * what CHOMP needs. Copying FROM it beats re-deriving beside it, which is how the two drifted apart.
 *
 * CHOMP STAYS STANDALONE. This writes a version-controlled file into CHOMP's own data/ directory
 * with its provenance stamped, and the build reads THAT. So a clone of CHOMP builds with no ABRA
 * present; only refreshing needs the sibling repo. That is the difference between a dependency and
 * a vendored input, and it is deliberate — CHOMP exists to be useful to people who do not have ABRA.
 *
 *   node build/refresh_dex_from_abra.js            -> data/champ-dex.json
 *   node build/refresh_dex_from_abra.js --abra ../ABRA
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ABRA = path.resolve(arg('abra', path.join(ROOT, '..', 'ABRA')));
const SRC = path.join(ABRA, 'data', 'engine-data.js');
const OUT = path.join(ROOT, 'data', 'champ-dex.json');

if (!fs.existsSync(SRC)) {
  console.error(`cannot find ABRA's engine data at ${SRC}`);
  console.error('pass --abra <path-to-ABRA> if the sibling repo lives elsewhere.');
  process.exit(2);
}

/* engine-data.js assigns globals rather than exporting, so it is required for its side effect —
 * the same way ABRA's own board.js loads it. */
require(SRC);
if (typeof MC === 'undefined' || !MC.mons) {
  console.error('engine-data.js loaded but MC.mons is not defined — the artifact shape changed.');
  process.exit(1);
}

/* Provenance travels with the data. A dex with no record of where it came from is how the /tmp
 * inputs became unfindable in the first place. */
let commit = null;
try {
  commit = execFileSync('git', ['-C', ABRA, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch (e) { /* a clone without git history still produces usable data */ }

const title = sid => sid.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-');
const isMega = sid => /-(mega|primal)(-|$)/i.test(sid);

const species = {};
let withAbility = 0, megas = 0;
for (const [sid, m] of Object.entries(MC.mons)) {
  if (!m || !m.bs) continue;
  const row = { name: title(sid), t: m.t, bs: m.bs };
  /* THE FIELDS build_lab.js NEVER CARRIED. Kept even when empty so a consumer can tell "this
   * species has no declared ability" from "this pipeline does not know about abilities" — the
   * distinction that hid the mega hole for a week. */
  if (m.ab) { row.ab = m.ab; withAbility++; }
  if (m.mv && m.mv.length) row.mv = m.mv;
  if (m.item) row.item = m.item;
  if (m.st) row.st = m.st;              // level-50 stat line, so consumers need not re-derive it
  if (m.wt) row.wt = m.wt;              // Heavy Slam / Low Kick read this
  if (isMega(sid)) { row.mega = true; megas++; }
  species[sid] = row;
}

/* ---- MOVES, and where the display NAME comes from -------------------------------------------
 * MC.moves is keyed by id and carries {t, c, bp} — no printable name, because ABRA never needs one.
 * The lab and the plugin both show move names to a human, so they need `n`.
 *
 * Title-casing the id does not work: "highhorsepower" cannot be split back into "High Horsepower"
 * without a word list, and guessing produces "Highhorsepower" in the UI. ABRA's data/tags.json
 * carries the real name for all 500 moves, so it is read rather than reconstructed — the same rule
 * as everywhere else here. */
const moves = {};
let named = 0;
try {
  const TAGS = (JSON.parse(fs.readFileSync(path.join(ABRA, 'data', 'tags.json'), 'utf8')).moves) || {};
  for (const [id, m] of Object.entries(MC.moves || {})) {
    const n = (TAGS[id] && TAGS[id].name) || null;
    if (n) named++;
    /* CATEGORY IS TRANSLATED, NOT PASSED THROUGH, and forgetting to was a real bug caught by
     * tests/test-engine.js on 2026-07-31. ABRA encodes the category as 'P'/'S'; CHOMP's engine
     * tests `mv.c === 'Physical'`. Handing over ABRA's encoding meant `phys` was NEVER true, so
     * Intimidate silently stopped firing and every damage number was computed off the wrong
     * attacking stat — while the golden damage tests still passed 16/16, because none of them
     * distinguishes physical from special.
     *
     * Two artifacts agreeing on a field NAME while disagreeing on its VALUES is worse than not
     * sharing the field, because it type-checks and then lies. */
    const cat = m.c === 'P' ? 'Physical' : m.c === 'S' ? 'Special' : (m.c || 'Status');
    moves[id] = { n: n || id, t: m.t, c: cat, bp: m.bp };
  }
} catch (e) {
  console.error(`  could not read tags.json for move names: ${e.message}`);
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  by: 'build/refresh_dex_from_abra.js',
  source: 'ABRA data/engine-data.js + data/tags.json (move names)',
  source_commit: commit,
  note: 'Vendored from ABRA so CHOMP still builds standalone. Re-run this script to refresh; do not '
      + 'hand-edit. Replaces the /tmp/champ_dex.json + /tmp/champ_megas.json inputs of build_lab.js, '
      + 'which were never version controlled and no longer exist.',
  n: Object.keys(species).length,
  n_mega: megas,
  n_with_ability: withAbility,
  n_moves: Object.keys(moves).length,
  n_moves_named: named,
  species,
  moves,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

console.log(`refresh_dex_from_abra — ${out.n} species -> ${path.relative(ROOT, OUT)}`);
console.log(`  mega/primal formes   ${megas}`);
console.log(`  carrying an ability  ${withAbility}`);
console.log(`  moves                ${out.n_moves} (${named} with a real display name)`);
console.log(`  ABRA commit          ${commit ? commit.slice(0, 12) : '(no git history)'}`);
if (named < out.n_moves) console.error(`  WARNING: ${out.n_moves - named} moves fell back to their id as a name.`);
if (!megas) console.error('  WARNING: no mega formes found — the source dex looks wrong.');
if (!withAbility) console.error('  WARNING: no abilities found — this is the bug this script exists to fix.');
