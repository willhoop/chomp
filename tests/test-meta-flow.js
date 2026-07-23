/* CHOMP — ABRA meta flow-back test.  Run: node tests/test-meta-flow.js
 * Pins the loop: the ABRA usage model (CHOMP_META) is embedded in the built
 * plugin, and likelyFoe4() focuses the pick on the opponent's most-brought four.
 * Slices the shipped userscript so it cannot drift from what ships. */
const fs = require('fs'), path = require('path'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'plugin', 'chomp-bring4.user.js'), 'utf8');
const i = src.indexOf('const MONS='), j = src.indexOf('function render');

const tmp = path.join(os.tmpdir(), 'chomp-metaflow.js');
fs.writeFileSync(tmp,
  "global.window={};global.document={body:{innerText:''}};\n" +
  src.slice(i, j) +
  "\nmodule.exports={CHOMP_META,likelyFoe4,metaBring,MONS};\n");
const M = require(tmp);

let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); } else { fail++; console.log('FAIL  ' + m); } };

// 1. ABRA's model is actually embedded in the plugin.
chk(M.CHOMP_META && Array.isArray(M.CHOMP_META.threats) && M.CHOMP_META.threats.length > 20,
    'ABRA meta model embedded (' + (M.CHOMP_META.threats||[]).length + ' threats)');

// 2. likelyFoe4 restricts a six to the four highest ladder bring-rates.
const six = ['basculegion','sneasler','chandelure','dragonite','annihilape','gholdengo']
              .map(k => ({ key: k }));
const four = M.likelyFoe4(six);
chk(four.length === 4, 'likelyFoe4 returns four');
const worst = six.map(m=>m.key).sort((a,b)=>M.metaBring(a)-M.metaBring(b))[0];
chk(!four.map(m=>m.key).includes(worst),
    'likelyFoe4 drops the least-brought mon (' + worst + ')');
chk(four.every(m => six.includes(m)), 'likelyFoe4 only returns members of the six');

// 3. Fallback: with no meta for a team, return all six unchanged (never delete data).
const unknown = ['aaa','bbb','ccc','ddd','eee','fff'].map(k=>({key:k}));
chk(M.likelyFoe4(unknown).length === 6, 'no-meta team -> all six kept (safe fallback)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
