// Measures CHOMP against real ladder games. Run: node tests/backtest-validation.js
const M=require('../engine/champ-model.js');
const BAD=new Set(["hyper beam","giga impact","blast burn","hydro cannon","frenzy plant","self-destruct","explosion","eruption","water spout","solar beam","last resort"]);
const ABIL={pelipper:"Drizzle",politoed:"Drizzle",torkoal:"Drought",charizard:"Drought",tyranitar:"Sand Stream","ninetales-alola":"Snow Warning",abomasnow:"Snow Warning",incineroar:"Intimidate",gyarados:"Intimidate",staraptor:"Intimidate",archaludon:"Stamina",meowscarada:"Protean",greninja:"Protean",kingambit:"Defiant",whimsicott:"Prankster",basculegion:"Adaptability",dragonite:"Multiscale",blastoise:"Mega Launcher",sylveon:"Pixilate",garchomp:"Rough Skin",sinistcha:"Hospitality",grimmsnarl:"Prankster",excadrill:"Sand Rush",swampert:"Swift Swim"};
const MEGA={blastoise:"Blastoisinite",charizard:"Charizardite Y",tyranitar:"Tyranitarite"};
const norm=s=>{const f=M.findMon(s);return f?f.key:null;};
function auto(k){const m=M.MONS[k];if(!m)return null;const ph=m.bs.atk>=m.bs.spa,c=ph?'Physical':'Special';
  const cand=Object.values(M.MOVES).filter(x=>x.c===c&&x.bp&&!BAD.has(x.n.toLowerCase()));const mv=[];
  m.t.forEach(t=>{const b=cand.filter(x=>x.t===t).sort((a,b)=>b.bp-a.bp)[0];if(b&&!mv.includes(b.n))mv.push(b.n);});
  const cv=cand.filter(x=>!m.t.includes(x.t)).sort((a,b)=>b.bp-a.bp)[0];if(cv&&mv.length<3)mv.push(cv.n);
  if(!mv.length)return null;
  return M.buildMon(M.parsePaste(m.name+' @ '+(MEGA[k]||'Life Orb')+'\nAbility: '+(ABIL[k]||'Pressure')+'\n'+(ph?'Adamant':'Modest')+' Nature\nEVs: 2 HP / 32 '+(ph?'Atk':'SpA')+' / 32 Spe\n'+mv.map(x=>'- '+x).join('\n'))[0]);}
function parseLog(t,me){const L=t.split('\n');const roster={p1:[],p2:[]},names={p1:'',p2:''},br={p1:new Set(),p2:new Set()};let win=null;
  for(const line of L){let m;
    if(m=line.match(/^\|player\|(p[12])\|([^|]*)/)){if(m[2])names[m[1]]=m[2];}
    else if(m=line.match(/^\|poke\|(p[12])\|([^,|]+)/)){const k=norm(m[2].trim());if(k)roster[m[1]].push(k);}
    else if(m=line.match(/^\|(?:switch|drag)\|(p[12])[ab]: [^|]*\|([^,|]+)/)){const k=norm(m[2].trim());if(k)br[m[1]].add(k);}
    else if(m=line.match(/^\|win\|(.+)/)){win=m[1].trim();}}
  const ms=names.p1.toLowerCase()===me.toLowerCase()?'p1':'p2', fs=ms==='p1'?'p2':'p1';
  return {mySix:roster[ms],foeSix:roster[fs],brought:[...br[ms]],won:win&&win.toLowerCase()===me.toLowerCase()};}
(async()=>{
  const USER='willhoop';
  const list=await fetch('https://replay.pokemonshowdown.com/search.json?user='+USER).then(r=>r.json());
  let n=0,agree=[0,0,0,0,0],winHi=0,nHi=0,winLo=0,nLo=0,wins=0,sandGames=0,sandSteel=0;
  for(const rep of list){
    let txt; try{ txt=await fetch('https://replay.pokemonshowdown.com/'+rep.id+'.log').then(r=>r.text()); }catch(e){ continue; }
    const g=parseLog(txt,USER);
    if(g.mySix.length<4||g.foeSix.length<4||g.brought.length<3)continue;
    const my6=g.mySix.map(auto).filter(Boolean), foe6=g.foeSix.map(auto).filter(Boolean);
    if(my6.length<4||foe6.length<4)continue;
    const r=M.bring4(my6,foe6);
    const rec=new Set(r.bring.map(x=>x.toLowerCase()));
    const mine=g.brought.map(k=>(M.MONS[k]?M.MONS[k].name:k).toLowerCase());
    const overlap=mine.filter(x=>rec.has(x)).length;
    n++; if(g.won)wins++;
    agree[Math.min(4,overlap)]++;
    if(overlap>=3){nHi++; if(g.won)winHi++;} else {nLo++; if(g.won)winLo++;}
    if(g.foeSix.includes('tyranitar')){ sandGames++; if(r.bring.some(b=>/Archaludon|Kingambit|Excadrill/.test(b)))sandSteel++; }
  }
  const pct=(a,b)=>b?((100*a/b).toFixed(0)+'%'):'n/a';
  console.log('=== CHOMP VALIDATION — real ladder games ===');
  console.log('games analysed          :',n);
  console.log('overall record          :',wins+'-'+(n-wins),'('+pct(wins,n)+')');
  console.log('');
  console.log('agreement with my bring (of 4):');
  agree.forEach((c,i)=>console.log('   '+i+' of 4 matched : '+c+'  ('+pct(c,n)+')'));
  console.log('');
  console.log('win rate when I brought >=3 of CHOMP\'s picks :',winHi+'/'+nHi,'='+pct(winHi,nHi));
  console.log('win rate when I brought  <3 of CHOMP\'s picks :',winLo+'/'+nLo,'='+pct(winLo,nLo));
  console.log('');
  console.log('games vs Tyranitar sand  :',sandGames,'| CHOMP recommended a sand-immune Steel in',sandSteel);
})();
