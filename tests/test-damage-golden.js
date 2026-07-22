// Golden tests: assert the engine reproduces the DOCUMENTED formulas exactly.
// Run: node tests/test-damage-golden.js
const M=require('../engine/champ-model.js');
let pass=0,fail=0;
const ok=(n,c,got)=>{c?pass++:fail++;console.log((c?'PASS  ':'FAIL  ')+n+(c?'':'   got: '+got));};
const P=s=>M.buildMon(M.parsePaste(s)[0]);

/* ---- 1. Stat formulas, hand-computed from the documented equations ----
   statL50(base,sp,nat) = floor((floor((2*base+31)*50/100) + 5 + sp) * nat)
   hpL50(base,sp)       = floor((2*base+31)*50/100) + 60 + sp                */
const statL50=(b,sp,n)=>Math.floor((Math.floor((2*b+31)*50/100)+5+sp)*n);
const hpL50=(b,sp)=>Math.floor((2*b+31)*50/100)+60+sp;
ok('statL50(100,0,1.0) = 120', statL50(100,0,1.0)===120, statL50(100,0,1.0));
ok('statL50(100,0,1.1) = 132  (nature applied AFTER sp)', statL50(100,0,1.1)===132, statL50(100,0,1.1));
ok('statL50(100,0,0.9) = 108', statL50(100,0,0.9)===108, statL50(100,0,0.9));
ok('statL50(100,32,1.0) = 152  (SP cap)', statL50(100,32,1.0)===152, statL50(100,32,1.0));
ok('hpL50(100,0) = 175', hpL50(100,0)===175, hpL50(100,0));

const venu=P("Venusaur @ Leftovers\nAbility: Overgrow\nHardy Nature\nEVs: 0 HP\n- Giga Drain");
const b=M.MONS['venusaur'].bs;
ok('engine stat matches formula (SpA)', venu.st.spa===statL50(b.spa,0,1.0), venu.st.spa+' vs '+statL50(b.spa,0,1.0));
ok('engine HP matches formula',        venu.st.hp ===hpL50(b.hp,0),        venu.st.hp+' vs '+hpL50(b.hp,0));

/* ---- 2. Damage invariants ---- */
const atk    =P("Garchomp @ Leftovers\nAbility: Rough Skin\nHardy Nature\nEVs: 32 Atk\n- Earthquake\n- Rock Slide");
const neutral=P("Kangaskhan @ Leftovers\nAbility: Scrappy\nHardy Nature\nEVs: 32 HP\n- Body Slam");   // Normal: Ground neutral
const weak   =P("Heliolisk @ Leftovers\nAbility: Dry Skin\nHardy Nature\nEVs: 32 HP\n- Thunderbolt"); // Electric/Normal: Ground 2x
const immune =P("Rotom-Wash @ Leftovers\nAbility: Levitate\nHardy Nature\nEVs: 32 HP\n- Hydro Pump"); // Levitate

const eqN=M.moveDamage(atk,neutral,M.mvByName['earthquake'],{spread:false});
const eqW=M.moveDamage(atk,weak,   M.mvByName['earthquake'],{spread:false});
const eqI=M.moveDamage(atk,immune, M.mvByName['earthquake'],{spread:false});
ok('Levitate immunity gives exactly 0',        eqI.pKO===0&&eqI.pct===0, eqI.pct);
ok('super-effective exceeds neutral',          eqW.pct>eqN.pct, eqW.pct.toFixed(1)+' vs '+eqN.pct.toFixed(1));
ok('min roll never exceeds max roll',          eqN.minPct<=eqN.pct, eqN.minPct+'>'+eqN.pct);
ok('pKO within [0,1]',                         eqN.pKO>=0&&eqN.pKO<=1, eqN.pKO);
ok('85% roll is ~0.85 of the 100% roll',       Math.abs(eqN.minPct/eqN.pct-0.85)<0.02, (eqN.minPct/eqN.pct).toFixed(3));

const rsS=M.moveDamage(atk,neutral,M.mvByName['rock slide'],{spread:false});
const rsD=M.moveDamage(atk,neutral,M.mvByName['rock slide'],{spread:true});
ok('spread move is reduced in doubles (0.75x)', rsD.pct<rsS.pct, rsD.pct.toFixed(1)+' vs '+rsS.pct.toFixed(1));

const pel=P("Pelipper @ Leftovers\nAbility: Drizzle\nHardy Nature\nEVs: 32 SpA\n- Hydro Pump");
const wR=M.moveDamage(pel,neutral,M.mvByName['hydro pump'],{weather:'rain',spread:false});
const wS=M.moveDamage(pel,neutral,M.mvByName['hydro pump'],{weather:'sun', spread:false});
const wN=M.moveDamage(pel,neutral,M.mvByName['hydro pump'],{spread:false});
ok('rain boosts Water',  wR.pct>wN.pct, wR.pct.toFixed(1)+' vs '+wN.pct.toFixed(1));
ok('sun weakens Water',  wS.pct<wN.pct, wS.pct.toFixed(1)+' vs '+wN.pct.toFixed(1));

ok('banned item stripped at build time',
   P("Milotic @ Assault Vest\nAbility: Competitive\nHardy Nature\nEVs: 32 HP\n- Scald").item==='');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
