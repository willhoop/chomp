const fs=require('fs');
const dex=require('/tmp/champ_dex.json');
const megas=require('/tmp/champ_megas.json');
const moves=require('/tmp/champ_moves.json');
const MONS={};
function title(sid){ return sid.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join('-'); }
for(const [sid,d] of Object.entries(dex)) MONS[sid]={name:title(sid),t:d.t,bs:d.bs};
for(const [sid,d] of Object.entries(megas)) MONS[sid]={name:title(sid),t:d.t,bs:d.bs,mega:true};
const TYPES=["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
const rows={
Normal:{Rock:.5,Ghost:0,Steel:.5},
Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
Dragon:{Dragon:2,Steel:.5,Fairy:0},
Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}};
const C={};
for(const a of TYPES){ C[a]={}; for(const d of TYPES){ C[a][d]=(rows[a]&&rows[a][d]!==undefined)?rows[a][d]:1; } }

const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Champions Damage Lab</title><style>
:root{color-scheme:dark}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b1020;color:#e8ecf8;padding:14px;line-height:1.5}
.wrap{max-width:1100px;margin:0 auto}h1{font-size:18px;letter-spacing:2px}h1 span{color:#5aa2ff}
.sub{color:#8fa0c8;font-size:12px;margin:4px 0 14px}
.panel{background:#121a30;border:1px solid #22305a;border-radius:10px;padding:16px 18px;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
label{font-size:11px;color:#8fa0c8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
input,select{width:100%;padding:7px 9px;border:1px solid #22305a;border-radius:6px;background:#0e1530;color:#e8ecf8;font-size:13px}
.row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:8px}
.chk{display:flex;align-items:center;gap:5px;font-size:12px;color:#cdd6f0}.chk input{width:auto}
button{background:#5aa2ff;color:#04122e;border:none;border-radius:7px;padding:9px 16px;font-weight:800;font-size:13px;cursor:pointer;margin-top:12px}
button:hover{filter:brightness(1.08)}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
th{text-align:left;padding:7px 9px;border-bottom:2px solid #22305a;color:#8fa0c8;font-size:11px;text-transform:uppercase;cursor:pointer;position:sticky;top:0;background:#121a30}
td{padding:6px 9px;border-bottom:1px solid #1a2445}tr:hover td{background:#0e1530}
.ohko{color:#3ddc84;font-weight:800}.thko{color:#ffc24b;font-weight:700}.n3{color:#8fa0c8}.na{color:#ff5470}
.bar{height:7px;border-radius:4px;background:#1a2445;overflow:hidden;margin-top:2px}.barf{height:100%;background:linear-gradient(90deg,#5aa2ff,#3ddc84)}
.tag{font-size:10px;background:#0e1530;border:1px solid #22305a;border-radius:5px;padding:1px 6px;color:#8fa0c8}
.scroll{max-height:560px;overflow:auto}.note{font-size:11px;color:#6a7aa0;margin-top:8px}
</style></head><body><div class="wrap">
<h1>⚔️ CHAMPIONS <span>DAMAGE LAB</span></h1>
<div class="sub">Real damage vs the entire Champions roster — ${Object.keys(MONS).length} formes, ${Object.keys(moves).length} moves. Set your attacker, hit RUN, see what dies. Formula validated against calc.pokemonshowdown.com/champions.</div>
<div class="panel"><div class="grid">
<div><label>Attacker</label><input id="atk" list="monlist" placeholder="Blaziken-Mega"></div>
<div><label>Move</label><input id="move" list="movelist" placeholder="Flare Blitz"></div>
<div><label>Attacking nature</label><select id="nat"><option value="1.1">Boosting +10%</option><option value="1">Neutral</option><option value="0.9">Reducing −10%</option></select></div>
<div><label>Atk/SpA SP 0–32</label><input id="sp" type="number" value="32" min="0" max="32"></div>
<div><label>Boost stage</label><select id="boost"><option>0</option><option>1</option><option>2</option><option>3</option><option>-1</option><option>-2</option></select></div>
<div><label>Item</label><select id="item"><option value="1">None</option><option value="lo">Life Orb ×1.3</option><option value="1.5">Choice/×1.5</option></select></div>
<div><label>Weather</label><select id="wx"><option value="none">None</option><option value="sun">Sun</option><option value="rain">Rain</option></select></div>
<div><label>Defender HP SP</label><input id="dhp" type="number" value="0" min="0" max="32"></div>
<div><label>Defender Def/SpD SP</label><input id="ddef" type="number" value="0" min="0" max="32"></div>
</div><div class="row">
<span class="chk"><input type="checkbox" id="spread"> Spread ×0.75</span>
<span class="chk"><input type="checkbox" id="crit"> Crit</span>
<span class="chk"><input type="checkbox" id="stabtoggle" checked> Auto-STAB</span>
</div><button onclick="run()">RUN vs whole meta ▶</button><div class="note" id="moveinfo"></div></div>
<div class="panel"><div class="scroll"><table id="out"><thead></thead><tbody></tbody></table></div>
<div class="note">KO verdict uses the max roll; %s shown min–max. Defender nature neutral. Weather boosts matching-type STAB. Abilities beyond weather (Multiscale, Thick Fat, etc.) not auto-applied.</div></div>
<datalist id="monlist">${Object.values(MONS).map(m=>`<option value="${m.name}">`).join('')}</datalist>
<datalist id="movelist">${Object.values(moves).map(m=>`<option value="${m.n}">`).join('')}</datalist>
<script>
const MONS=${JSON.stringify(MONS)},MOVES=${JSON.stringify(moves)},C=${JSON.stringify(C)};
const byName={};for(const m of Object.values(MONS))byName[m.name.toLowerCase()]=m;
const mvByName={};for(const m of Object.values(MOVES))mvByName[m.n.toLowerCase()]=m;
function pokeRound(x){return (x%1>0.5)?Math.ceil(x):Math.floor(x);}
function statL50(b,sp,n){return Math.floor((Math.floor((2*b+31)*50/100)+5+(+sp))*n);}
function hpL50(b,sp){return Math.floor((2*b+31)*50/100)+50+10+(+sp);}
function stageMul(s){s=+s;return s>=0?(2+s)/2:2/(2-s);}
function eff(mt,dt){let e=1;for(const t of dt)e*=C[mt][t];return e;}
function calc(bp,A,D,stab,e,wx,spread,lo,choice,crit){
 let d=Math.floor(Math.floor(22*bp*A/D)/50)+2;
 if(spread)d=pokeRound(d*0.75); if(wx!==1)d=pokeRound(d*wx); if(crit)d=pokeRound(d*1.5);
 const roll=r=>{let x=Math.floor(d*r/100);if(stab)x=pokeRound(x*stab);x=Math.floor(x*e);if(lo)x=pokeRound(x*5324/4096);if(choice!==1)x=pokeRound(x*choice);return x;};
 return {min:roll(85),max:roll(100)};}
let lastRows=[],sortKey='pct',sortDir=-1;
function run(){
 const a=byName[(document.getElementById('atk').value||'').toLowerCase()],mv=mvByName[(document.getElementById('move').value||'').toLowerCase()];
 const info=document.getElementById('moveinfo');
 if(!a){info.textContent='Pick a valid attacker.';return;} if(!mv){info.textContent='Pick a valid move.';return;}
 info.innerHTML='<b>'+a.name+'</b> '+a.t.join('/')+' · <b>'+mv.n+'</b> ('+mv.t+' '+mv.c+' '+mv.bp+'BP)';
 const natM=+document.getElementById('nat').value,sp=document.getElementById('sp').value,boost=document.getElementById('boost').value;
 const itemV=document.getElementById('item').value,wxV=document.getElementById('wx').value,dhp=document.getElementById('dhp').value,ddef=document.getElementById('ddef').value;
 const spread=document.getElementById('spread').checked,crit=document.getElementById('crit').checked,autostab=document.getElementById('stabtoggle').checked;
 const atkBase=mv.c==='Physical'?a.bs.atk:a.bs.spa;
 const A=Math.floor(statL50(atkBase,sp,natM)*stageMul(boost));
 const stab=(autostab&&a.t.includes(mv.t))?1.5:0;
 let wx=1; if(wxV==='sun')wx=mv.t==='Fire'?1.5:(mv.t==='Water'?0.5:1); if(wxV==='rain')wx=mv.t==='Water'?1.5:(mv.t==='Fire'?0.5:1);
 const lo=itemV==='lo',choice=itemV==='1.5'?1.5:1;
 lastRows=[];
 for(const d of Object.values(MONS)){
  const D=mv.c==='Physical'?statL50(d.bs.def,ddef,1):statL50(d.bs.spd,ddef,1);
  const HP=hpL50(d.bs.hp,dhp),e=eff(mv.t,d.t);
  if(e===0){lastRows.push({name:d.name,t:d.t,hp:HP,min:0,max:0,pct:0,e:0});continue;}
  const r=calc(mv.bp,A,D,stab,e,wx,spread,lo,choice,crit);
  lastRows.push({name:d.name,t:d.t,hp:HP,min:r.min,max:r.max,pct:100*r.max/HP,e});}
 draw();}
function verdict(r){ if(r.e===0)return['IMMUNE','na']; const p=r.pct; if(p>=100)return['OHKO','ohko']; if(p>=50)return['2HKO','thko']; if(p>=33.4)return['3HKO','n3']; return[Math.ceil(100/p)+'HKO','n3']; }
function draw(){
 const rows=[...lastRows].sort((x,y)=>sortDir*((x[sortKey]<y[sortKey])?-1:(x[sortKey]>y[sortKey]?1:0)));
 const cols=[['name','Defender'],['t','Types'],['hp','HP'],['pct','Max %'],['v','Verdict']];
 document.querySelector('#out thead').innerHTML='<tr>'+cols.map(c=>'<th onclick="setSort(\\''+c[0]+'\\')">'+c[1]+'</th>').join('')+'</tr>';
 let h=''; for(const r of rows){const[vt,vc]=verdict(r); const pctTxt=r.e===0?'—':(100*r.min/r.hp).toFixed(0)+'–'+r.pct.toFixed(0)+'%';
  h+='<tr><td>'+r.name+'</td><td><span class="tag">'+r.t.join('/')+'</span></td><td>'+r.hp+'</td><td>'+pctTxt+'<div class="bar"><div class="barf" style="width:'+Math.min(100,r.pct)+'%"></div></div></td><td class="'+vc+'">'+vt+'</td></tr>';}
 document.querySelector('#out tbody').innerHTML=h;}
function setSort(k){if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=(k==='name'||k==='t')?1:-1;}draw();}
</script></div></body></html>`;
fs.writeFileSync('/sessions/kind-fervent-sagan/mnt/outputs/champions-damage-lab.html',html);
console.log('built champions-damage-lab.html',(html.length/1024).toFixed(0)+'KB');
