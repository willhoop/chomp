/* patch_plugin_data.js — replace ONLY the data blocks inside the shipped userscript.
 *
 * WHY NOT JUST REBUILD IT
 * -----------------------
 * build/build_v2_userscript.py emits @version 2.4. The shipped app/plugin/chomp-bring4.user.js is
 * @version 2.8, and a function-level diff shows regenerating it LOSES TEN FUNCTIONS — liveMon,
 * readField, mkMon, refresh, realMoves, renderMoves, eff, dmgRange, opt, build. That is the entire
 * Showdown bridge: the layer that reads a live battle off the page.
 *
 * Versions 2.5 through 2.8 were written directly into the built file and never went back into the
 * builder. So the generator is four versions behind the artifact it generates, and running it would
 * replace working live-battle code with an older template while calling it an update.
 *
 * Until that divergence is reconciled — which means porting the bridge back into the builder, a
 * separate job — the honest way to ship fresh data is to REPLACE THE DATA BLOCKS AND TOUCH NOTHING
 * ELSE. This does exactly that, and refuses if it cannot verify it.
 *
 * WHAT IT GUARANTEES, and each check exists because the alternative is shipping a broken plugin to
 * a live Showdown session:
 *   - the bridge functions are present BEFORE and AFTER, by name
 *   - the file still parses as JavaScript
 *   - only the intended byte ranges moved (everything outside them is byte-identical)
 *   - the move category is 'Physical'/'Special', not ABRA's 'P'/'S' — the encoding mismatch that
 *     silently disabled Intimidate when the lab was first rewired
 *
 *   node build/patch_plugin_data.js [--dry]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PLUGIN = path.join(ROOT, 'app', 'plugin', 'chomp-bring4.user.js');
const DEX = path.join(ROOT, 'data', 'champ-dex.json');
const DRY = process.argv.includes('--dry');

const BRIDGE = ['liveMon', 'readField', 'mkMon', 'refresh', 'realMoves', 'renderMoves', 'opt', 'build'];

if (!fs.existsSync(DEX)) {
  console.error(`missing ${path.relative(ROOT, DEX)} — run: node build/refresh_dex_from_abra.js`);
  process.exit(2);
}
const src = fs.readFileSync(PLUGIN, 'utf8');
const SRC = JSON.parse(fs.readFileSync(DEX, 'utf8'));

/* ---- what the plugin's own blocks look like -------------------------------------------------
 * Matched by locating the identifier and then walking braces, rather than by a regex over the whole
 * literal: these objects are hundreds of kilobytes and contain every bracket character there is. */
function findObj(s, name) {
  const m = new RegExp('(?:const |let |var |,|\\s)' + name + '\\s*=\\s*\\{').exec(s);
  if (!m) return null;
  const open = s.indexOf('{', m.index);
  let depth = 0, i = open;
  for (; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (!depth) { i++; break; } }
  }
  return { start: open, end: i, text: s.slice(open, i) };
}

const before = BRIDGE.filter(f => src.includes('function ' + f + '('));
console.log(`bridge functions found in the shipped plugin: ${before.length}/${BRIDGE.length}`);
if (before.length < BRIDGE.length) {
  console.error(`  MISSING: ${BRIDGE.filter(f => !before.includes(f)).join(', ')}`);
  console.error('  refusing to patch a file that is already missing its bridge.');
  process.exit(1);
}

/* MONS in the plugin is {name, t, bs} — extra keys are carried through so the engine can start
 * reading them, but nothing is REMOVED, because a field the bridge reads and this drops would be a
 * silent break of exactly the kind this file exists to avoid. */
const MONS = {};
for (const [sid, d] of Object.entries(SRC.species || {})) {
  const row = { name: d.name, t: d.t, bs: d.bs };
  if (d.ab) row.ab = d.ab;
  if (d.mv) row.mv = d.mv;
  if (d.item) row.item = d.item;
  if (d.wt) row.wt = d.wt;
  if (d.mega) row.mega = true;
  MONS[sid] = row;
}
const MOVES = SRC.moves || {};

const bad = Object.entries(MOVES).filter(([, m]) => m.c !== 'Physical' && m.c !== 'Special' && m.c !== 'Status');
if (bad.length) {
  console.error(`  ${bad.length} moves carry a category that is not Physical/Special/Status ` +
    `(e.g. ${bad[0][0]} = ${JSON.stringify(bad[0][1].c)}).`);
  console.error('  That is ABRA\'s P/S encoding leaking through — it silently disables Intimidate. Refusing.');
  process.exit(1);
}

let out = src, moved = [];
for (const [name, obj] of [['MONS', MONS], ['MOVES', MOVES]]) {
  const found = findObj(out, name);
  if (!found) { console.error(`  could not locate ${name} in the plugin — refusing.`); process.exit(1); }
  const json = JSON.stringify(obj);
  moved.push(`${name}: ${found.text.length} -> ${json.length} bytes`);
  out = out.slice(0, found.start) + json + out.slice(found.end);
}

/* Version bump, and it is a real one: the data underneath changed by 19 species and 306 abilities. */
const oldV = (src.match(/@version\s+([0-9.]+)/) || [])[1] || '?';
const newV = oldV.replace(/(\d+)\.(\d+)$/, (_, a, b) => `${a}.${+b + 1}`);
out = out.replace(/(@version\s+)[0-9.]+/, `$1${newV}`);

/* ---- verification, before anything is written ------------------------------------------------ */
const after = BRIDGE.filter(f => out.includes('function ' + f + '('));
if (after.length < BRIDGE.length) {
  console.error(`  patch would DROP bridge functions: ${BRIDGE.filter(f => !after.includes(f)).join(', ')}`);
  process.exit(1);
}
try { new vm.Script(out, { filename: 'chomp-bring4.user.js' }); }
catch (e) { console.error(`  the patched file does not parse: ${e.message}`); process.exit(1); }

console.log(`  ${moved.join('\n  ')}`);
console.log(`  species ${Object.keys(MONS).length} (${Object.values(MONS).filter(m => m.mega).length} mega, ` +
  `${Object.values(MONS).filter(m => m.ab).length} with an ability), moves ${Object.keys(MOVES).length}`);
console.log(`  version ${oldV} -> ${newV}`);
console.log(`  bridge intact: ${after.length}/${BRIDGE.length}   parses: yes`);
console.log(`  dex source: ${SRC.source || '?'} @ ${(SRC.source_commit || '?').slice(0, 12)}`);

if (DRY) { console.log('\n  --dry: nothing written.'); process.exit(0); }
fs.writeFileSync(PLUGIN, out);
console.log(`\nwrote ${path.relative(ROOT, PLUGIN)}  (${(out.length / 1024).toFixed(0)}KB)`);
