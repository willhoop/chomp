/* CHOMP — team-sheet reader tests.  Run: node tests/test-team-read.js
 *
 * Pins the fix of 2026-07-22: the plugin reads the "<user>'s team: A / B / C"
 * lines the client prints at team preview. Pokémon Showdown prints a CURLY
 * apostrophe (U+2019); the reader must accept it, or the panel shows
 * "no battle open" while a battle is plainly in preview.
 *
 * The reader is sliced out of the shipped userscript, so the test cannot drift
 * from what ships.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'plugin', 'chomp-bring4.user.js'), 'utf8');
const i = src.indexOf('const MONS='), j = src.indexOf('function render');

const TXT = "Format:\n[Gen 9 Champions] VGC 2026 Reg M-B\n" +
            "APOS's team:\nPelipper / Swampert / Sneasler / Meowscarada / Rotom-Wash / Sinistcha\n" +
            "SoloLegend117APOSs team:\nDragonite / Annihilape / Gholdengo / Basculegion / Sneasler / Chandelure";

function harness(apos, client) {
  const tmp = path.join(os.tmpdir(), 'chomp-team-' + Buffer.from(apos+client).toString('hex') + '.js');
  const txt = TXT.replace(/APOS/g, apos);
  let setup = "global.document={body:{innerText:" + JSON.stringify(txt) + "}};\n";
  if (client === 'classic') setup += "global.app={user:{get:k=>k==='name'?'willhoop':''}};global.window={app:global.app};\n";
  else                      setup += "global.window={PS:{user:{name:'willhoop'}}};global.PS=global.window.PS;\n";
  fs.writeFileSync(tmp, setup + src.slice(i, j) + "\nmodule.exports=readTeamsFromDOM();\n");
  delete require.cache[tmp];
  return require(tmp);
}

let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); } else { fail++; console.log('FAIL  ' + m); } };

for (const [name, apos] of [['curly U+2019', '’'], ['straight ASCII', "'"], ['left U+2018', '‘']]) {
  for (const client of ['classic', 'BETA']) {
    const r = harness(apos, client);
    chk(r && r.mine.length === 6 && r.foe.length === 6,
        `${name} apostrophe, ${client} client -> 6v6`);
    if (r) chk(r.mine[0] === 'pelipper' && r.foe[0] === 'dragonite',
        `${name} apostrophe, ${client} client -> correct sides`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
