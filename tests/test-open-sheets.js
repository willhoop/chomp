/* OPEN TEAM SHEETS — does the plugin read the sets the format publishes?
 *
 * Champions Reg M-B Bo3 runs Force Open Team Sheets, so the server sends |showteam| declaring the
 * FULL set of all six for BOTH players. The plugin read |poke| for the species and stopped, so
 * mkMon fell back to ORB.mons' MODAL values — the ladder's most common item, ability and moveset for
 * that species. CHOMP was guessing sets that were printed on the screen.
 *
 * That matters because it is the likeliest cause of a MEASURED failure: ABRA's chomp_ev harness puts
 * CHOMP's bring advice at held-out log-loss 0.6923 against a coin's 0.6931, LOSING to the naive
 * "bring your most-brought four" prior at 0.6919. Coverage computed against an averaged opponent is
 * coverage against a Pokemon nobody brought.
 *
 * The parser is lifted OUT OF THE SHIPPED PLUGIN rather than reimplemented here. A copy in this file
 * would test the copy. The fixture is a real |showteam| line taken from ABRA's raw replay archive,
 * not one written to match the parser.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PLUGIN = path.join(__dirname, '..', 'app', 'plugin', 'chomp-bring4.user.js');
const src = fs.readFileSync(PLUGIN, 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { cond ? pass++ : fail++; console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (detail ? '   ' + detail : '')); };

/* Lift readSheets and its one dependency (idn) out of the plugin by brace-matching. */
function lift(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('cannot find function ' + name + ' in the shipped plugin');
  const open = src.indexOf('{', m.index);
  let depth = 0, i = open;
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (!depth) { i++; break; } } }
  return src.slice(m.index, i);
}
const idnSrc = (src.match(/const idn\s*=\s*[^;]+;/) || [])[0];
if (!idnSrc) throw new Error('cannot find idn in the shipped plugin');

const ctx = vm.createContext({});
vm.runInContext([idnSrc, 'const DECLARED={};let DECLARED_N=0,DECLARED_CONFLICTS=0;', lift('readSheets')].join('\n'), ctx);

/* A REAL line, from data/games.ladder.raw-logs.jsonl. Two entries trimmed for width; the shape,
 * the empty nickname field and the empty EV field are exactly as Showdown emits them. */
const REAL = '|showteam|p1|Barbaracle||Barbaracite|ToughClaws|CloseCombat,RockSlide,ShellSmash,Protect|Adamant||F|||50|]'
  + 'Farigiraf||SitrusBerry|ArmorTail|TrickRoom,TwinBeam,HelpingHand,Protect|Relaxed||F|||50|]'
  + 'Sneasler||IronBall|Unburden|FakeOut,CloseCombat,DireClaw,Fling|Brave||M|||50|]'
  + 'Sinistcha||LifeOrb|Hospitality|MatchaGotcha,ShadowBall,RagePowder,TrickRoom|Relaxed|||||50';

console.log('OPEN TEAM SHEETS — reading what the format publishes\n');

const n = vm.runInContext(`readSheets(${JSON.stringify([REAL])})`, ctx);
const D = vm.runInContext('DECLARED', ctx);

ok('a real |showteam| line parses', n === 4, `${n} sets`);
ok('item is read', D.barbaracle && D.barbaracle.item === 'barbaracite', D.barbaracle && D.barbaracle.item);
ok('ability is read', D.farigiraf && D.farigiraf.ab === 'armortail', D.farigiraf && D.farigiraf.ab);
ok('all FOUR moves are read, not a modal guess',
  D.sneasler && D.sneasler.mv.length === 4 && D.sneasler.mv.includes('direclaw'),
  D.sneasler && D.sneasler.mv.join(','));
ok('nature is read', D.sinistcha && D.sinistcha.nature === 'Relaxed', D.sinistcha && D.sinistcha.nature);

/* An empty EV field and an empty gender field must not shift the columns — the two places a naive
 * split() gets this wrong. Sinistcha's entry has both. */
ok('empty gender/EV fields do not shift the columns',
  D.sinistcha && D.sinistcha.item === 'lifeorb' && D.sinistcha.ab === 'hospitality',
  D.sinistcha && (D.sinistcha.item + '/' + D.sinistcha.ab));

/* THE CASE WORTH REFUSING. In a mirror the same species carries two different declared sets, and
 * this map is keyed by species. Guessing one would be confidently wrong on every calc for that
 * Pokemon, so the entry is dropped and the modal fallback is used instead. */
const MIRROR = ['|showteam|p1|Farigiraf||SitrusBerry|ArmorTail|TrickRoom,TwinBeam,HelpingHand,Protect|Relaxed||F|||50',
  '|showteam|p2|Farigiraf||AssaultVest|ArmorTail|Psychic,FoulPlay,HelpingHand,TrickRoom|Sassy||M|||50'];
vm.runInContext('for(const k in DECLARED) delete DECLARED[k]; DECLARED_CONFLICTS=0;', ctx);
vm.runInContext(`readSheets(${JSON.stringify(MIRROR)})`, ctx);
const D2 = vm.runInContext('DECLARED', ctx);
const conflicts = vm.runInContext('DECLARED_CONFLICTS', ctx);
ok('a MIRROR match drops the ambiguous species rather than guessing', !D2.farigiraf, JSON.stringify(Object.keys(D2)));
ok('and the conflict is counted, not swallowed', conflicts === 1, String(conflicts));

/* Same species, IDENTICAL sets, is not a conflict — both players running the stock set is common
 * and must still be usable. */
vm.runInContext('for(const k in DECLARED) delete DECLARED[k]; DECLARED_CONFLICTS=0;', ctx);
const SAME = [MIRROR[0], MIRROR[0].replace('|p1|', '|p2|')];
vm.runInContext(`readSheets(${JSON.stringify(SAME)})`, ctx);
ok('identical sets on both sides are NOT a conflict',
  !!vm.runInContext('DECLARED', ctx).farigiraf && vm.runInContext('DECLARED_CONFLICTS', ctx) === 0);

/* Robustness: the panel must never be taken down by a malformed sheet. */
vm.runInContext('for(const k in DECLARED) delete DECLARED[k];', ctx);
let threw = false;
try { vm.runInContext(`readSheets(${JSON.stringify(['|showteam|p1|', '|showteam|p1|||||', 'garbage', ''])})`, ctx); }
catch (e) { threw = true; }
ok('malformed sheets do not throw', !threw);

/* And a closed-sheet battle simply yields nothing, rather than something wrong. */
vm.runInContext('for(const k in DECLARED) delete DECLARED[k];', ctx);
const none = vm.runInContext(`readSheets(${JSON.stringify(['|poke|p1|Garchomp, M|', '|turn|1'])})`, ctx);
ok('a closed-sheet battle declares nothing', none === 0, String(none));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
