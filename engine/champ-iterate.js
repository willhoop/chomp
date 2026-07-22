// CHAMP-ITERATE — self-improving team optimizer built on champ-model.
// Scores a 6 against a meta gauntlet and hill-climbs member swaps to raise it.
const M = require('./champ-model.js');
const fs = require('fs');
const movesBySid = JSON.parse(fs.readFileSync('/tmp/moves_by_sid.json','utf8'));

// minimal ability map (weather/intimidate/key) — else blank
const ABIL = { pelipper:'Drizzle', politoed:'Drizzle', torkoal:'Drought', charizard:'Drought',
  tyranitar:'Sand Stream', 'ninetales-alola':'Snow Warning', abomasnow:'Snow Warning',
  incineroar:'Intimidate', gyarados:'Intimidate', staraptor:'Intimidate', archaludon:'Stamina',
  meowscarada:'Protean', greninja:'Protean', kingambit:'Defiant', whimsicott:'Prankster',
  basculegion:'Adaptability', dragonite:'Multiscale', blastoise:'Mega Launcher', sylveon:'Pixilate',
  garchomp:'Rough Skin', sinistcha:'Hospitality', grimmsnarl:'Prankster' };
const MEGA_ITEM = { blastoise:'Blastoisinite', charizard:'Charizardite Y', tyranitar:'Tyranitarite',
  gyarados:'Gyaradosite', metagross:'Metagrossite', gengar:'Gengarite', staraptor:'Staraptite',
  venusaur:'Venusaurite', sceptile:'Sceptilite', aerodactyl:'Aerodactylite' };

function autoSet(key){
  const mon = M.MONS[key]; if(!mon) return null;
  const legal = (movesBySid[key]||[]).map(n=>M.mvByName[n.toLowerCase()]).filter(Boolean);
  const atkStat = mon.bs.atk, spaStat = mon.bs.spa;
  const phys = atkStat >= spaStat;
  const cat = phys ? 'Physical' : 'Special';
  // attacking moves of preferred category, ranked by effective bp (STAB counts)
  const atks = legal.filter(m=>m.c===cat && m.bp).sort((a,b)=>{
    const sa=(mon.t.includes(a.t)?1.5:1)*a.bp, sb=(mon.t.includes(b.t)?1.5:1)*b.bp; return sb-sa; });
  const picked=[]; const usedTypes=new Set();
  for(const m of atks){ if(picked.length>=3)break; if(usedTypes.has(m.t)&&picked.length>=1)continue; picked.push(m.n); usedTypes.add(m.t); }
  while(picked.length<3 && atks.length){ const m=atks.find(x=>!picked.includes(x.n)); if(!m)break; picked.push(m.n); }
  const hasProtect=(movesBySid[key]||[]).some(n=>n.toLowerCase()==='protect');
  const moves = picked.slice(0,3).concat(hasProtect?['Protect']:[]);
  const item = MEGA_ITEM[key] || 'Life Orb';
  const nature = phys ? 'Adamant' : 'Modest';
  const sp = phys ? '2 HP / 32 Atk / 32 Spe' : '2 HP / 32 SpA / 32 Spe';
  return `${mon.name} @ ${item}\nAbility: ${ABIL[key]||'Pressure'}\nLevel: 50\n${nature} Nature\nEVs: ${sp}\n`+moves.map(x=>'- '+x).join('\n');
}
function team6(keys){ return keys.map(autoSet).filter(Boolean).map(p=>M.buildMon(M.parsePaste(p)[0])); }

// meta gauntlet — representative Reg M-B archetypes (species)
const GAUNTLET = {
  'Sun (Zard-Y)': ['charizard','torkoal','venusaur','garchomp','incineroar','tyranitar'],
  'Rain': ['pelipper','archaludon','basculegion','sinistcha','kingambit','whimsicott'],
  'Sand (TTar)': ['tyranitar','garchomp','excadrill','pyroar','houndstone','gliscor'],
  'TR Bulk': ['farigiraf','torkoal','mudsdale','kingambit','sylveon','incineroar'],
  'Fairy Aura': ['floette','sylveon','whimsicott','garchomp','kingambit','tsareena'],
  'Zard+Gambit': ['charizard','whimsicott','basculegion','kingambit','sylveon','garchomp'],
  'Snow TR': ['ninetales-alola','abomasnow','sinistcha','incineroar','crabominable','milotic'],
  'Goodstuff': ['kingambit','garchomp','staraptor','whimsicott','basculegion','charizard'],
  'Fast Offense': ['tsareena','aerodactyl','greninja','lopunny','meowscarada','kingambit'],
  'Dragon EQ': ['garchomp','dragonite','rotom-wash','tsareena','tinkaton','sylveon'],
};
function gauntletScore(my6){
  let tot=0,n=0;
  for(const k in GAUNTLET){ const foe=team6(GAUNTLET[k]); if(foe.length<4)continue; const r=M.bring4(my6,foe); tot+=r.score; n++; }
  return tot/n;
}

// hill-climb: swap members from pool to raise gauntlet score
function iterate(startKeys, pool, passes=2){
  let team=startKeys.slice();
  let best=gauntletScore(team6(team));
  const log=[{step:'start',team:team.slice(),score:+best.toFixed(2)}];
  for(let p=0;p<passes;p++){
    let improved=false;
    for(let i=0;i<team.length;i++){
      for(const cand of pool){
        if(team.includes(cand))continue;
        const trial=team.slice(); trial[i]=cand;
        if(new Set(trial).size!==trial.length)continue;
        const sc=gauntletScore(team6(trial));
        if(sc>best+0.05){ log.push({step:'swap',out:team[i],in:cand,score:+sc.toFixed(2)}); team=trial; best=sc; improved=true; }
      }
    }
    if(!improved)break;
  }
  return {team, score:+best.toFixed(2), log};
}

// ---- run: optimize the current team ----
const CURRENT = ['pelipper','whimsicott','blastoise','archaludon','meowscarada','kingambit'];
const POOL = ['pelipper','politoed','whimsicott','blastoise','archaludon','meowscarada','kingambit',
  'basculegion','greninja','sinistcha','incineroar','garchomp','tsareena','sylveon','gholdengo',
  'talonflame','dragonite','tyranitar','excadrill','rotom-wash','farigiraf','grimmsnarl'];

console.log('=== BASELINE: current team vs meta gauntlet ===');
const base=gauntletScore(team6(CURRENT));
console.log('current:', CURRENT.join(', '));
console.log('gauntlet mean:', base.toFixed(2));
console.log('\nper-archetype:');
for(const k in GAUNTLET){ const foe=team6(GAUNTLET[k]); const r=M.bring4(team6(CURRENT),foe); console.log('  '+k.padEnd(16)+' '+r.score.toFixed(1)+'  bring: '+r.bring.join(', ')); }

console.log('\n=== SELF-ITERATE (hill-climb member swaps) ===');
const opt=iterate(CURRENT, POOL, 3);
console.log('changes:'); opt.log.forEach(l=> l.step==='swap' ? console.log('   - '+l.out+' -> '+l.in+'  (score '+l.score+')') : console.log('   start '+l.score));
console.log('\nOPTIMIZED:', opt.team.join(', '));
console.log('gauntlet mean:', opt.score, '(was', base.toFixed(2)+')');
