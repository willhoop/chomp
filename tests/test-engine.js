// Regression tests for the CHOMP engine. Run: node tests/test-engine.js
const M=require('../engine/champ-model.js');
const P=s=>M.buildMon(M.parsePaste(s)[0]);
let pass=0,fail=0;
const ok=(name,cond)=>{cond?pass++:fail++;console.log((cond?'PASS  ':'FAIL  ')+name);};

const chomp=P("Garchomp @ Life Orb\nAbility: Rough Skin\nJolly Nature\nEVs: 2 HP / 32 Atk / 32 Spe\n- Earthquake\n- Dragon Claw");
const rotom=P("Rotom-Wash @ Sitrus Berry\nAbility: Levitate\nModest Nature\nEVs: 32 HP / 32 SpA\n- Hydro Pump");
ok('Levitate blocks Ground moves', M.bestDamage(chomp,rotom,{}).pKO===0);

const kanga=P("Kangaskhan @ Life Orb\nAbility: Scrappy\nAdamant Nature\nEVs: 2 HP / 32 Atk\n- Double-Edge");
const intim=P("Charizard @ Leftovers\nAbility: Intimidate\nModest Nature\nEVs: 32 HP\n- Air Slash");
const plain=P("Charizard @ Leftovers\nAbility: Blaze\nModest Nature\nEVs: 32 HP\n- Air Slash");
ok('Intimidate lowers physical damage', M.bestDamage(kanga,intim,{}).pct < M.bestDamage(kanga,plain,{}).pct);

const av=P("Milotic @ Assault Vest\nAbility: Competitive\nModest Nature\nEVs: 32 HP / 32 SpA\n- Scald");
ok('Illegal item is removed', av.item==='');

const d=M.bestDamage(chomp,plain,{});
ok('pKO is a probability between 0 and 1', d.pKO>=0 && d.pKO<=1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
