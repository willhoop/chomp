#!/usr/bin/env python3
# Assemble chomp-bring4.user.js: real damage-calc engine + Showdown bridge
# that reads your real saved sets and infers the opponent's.
import re, io

OUT='/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/app/plugin/chomp-bring4.user.js'
lab=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/engine/champions-damage-lab.html',encoding='utf8').read()
model=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/engine/champ-model.js',encoding='utf8').read()

def grab(name):
    m=re.search(r'(?:const |,|\s)'+name+r'=\{', lab)
    i=m.end()-1; depth=0; start=i
    while i<len(lab):
        c=lab[i]
        if c=='{':depth+=1
        elif c=='}':
            depth-=1
            if depth==0: i+=1; break
        i+=1
    return lab[start:i]

MONS=grab('MONS'); MOVES=grab('MOVES'); C=grab('C')
LEGAL=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/data/champions-legal-moves.json',encoding='utf8').read()

# engine = champ-model.js from `const byName` up to (excluding) module.exports, minus the fs loader
i0=model.index('const FORMAT')   # was 'const byName', which dropped FORMAT/isBannedItem/canLearn
i1=model.index('module.exports')
engine=model[i0:i1].strip()

HEADER='''// ==UserScript==
// @name         CHOMP — Bring 4 (Real Damage Model)
// @namespace    willhoop.vgc
// @version      2.0
// @description  Damage-calc bring/lead for Champions Reg M-B. Reads your real saved sets, infers the foe, real KO math + weather.
// @match        https://play.pokemonshowdown.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function(){
"use strict";
const MONS=%s,MOVES=%s,C=%s,CHOMP_LEGAL=%s;
'''%(MONS,MOVES,C,LEGAL)

BRIDGE=r'''
/* ================= inference tables ================= */
const ABIL={pelipper:'Drizzle',politoed:'Drizzle',torkoal:'Drought',charizard:'Drought',tyranitar:'Sand Stream','ninetales-alola':'Snow Warning',abomasnow:'Snow Warning',incineroar:'Intimidate',gyarados:'Intimidate',staraptor:'Intimidate',archaludon:'Stamina',meowscarada:'Protean',greninja:'Protean',kingambit:'Defiant',whimsicott:'Prankster',basculegion:'Adaptability',dragonite:'Multiscale',blastoise:'Mega Launcher',sylveon:'Pixilate',garchomp:'Rough Skin',sinistcha:'Hospitality',grimmsnarl:'Prankster'};
const MEGA_ITEM={blastoise:'Blastoisinite',charizard:'Charizardite Y',tyranitar:'Tyranitarite',gyarados:'Gyaradosite',metagross:'Metagrossite',gengar:'Gengarite',staraptor:'Staraptite',venusaur:'Venusaurite',sceptile:'Sceptilite',aerodactyl:'Aerodactylite'};

function autoFoe(key){
  const mon=MONS[key]; if(!mon)return null;
  const phys=mon.bs.atk>=mon.bs.spa, cat=phys?'Physical':'Special';
  const cand=Object.values(MOVES).filter(m=>m.c===cat&&m.bp&&!BAD_AUTO.has(m.n.toLowerCase())&&canLearn(key,m.n));
  const moves=[];
  mon.t.forEach(ty=>{const b=cand.filter(m=>m.t===ty).sort((a,b)=>b.bp-a.bp)[0]; if(b&&!moves.includes(b.n))moves.push(b.n);});
  const cov=cand.filter(m=>!mon.t.includes(m.t)).sort((a,b)=>b.bp-a.bp)[0]; if(cov&&moves.length<3)moves.push(cov.n);
  let gi=0; while(moves.length<2){const x=cand.sort((a,b)=>b.bp-a.bp)[gi++]; if(!x)break; if(!moves.includes(x.n))moves.push(x.n);}
  const item=MEGA_ITEM[key]||'Life Orb', nat=phys?'Adamant':'Modest', sp=phys?'2 HP / 32 Atk / 32 Spe':'2 HP / 32 SpA / 32 Spe';
  return mon.name+' @ '+item+'\nAbility: '+(ABIL[key]||'Pressure')+'\nLevel: 50\n'+nat+' Nature\nEVs: '+sp+'\n'+moves.map(x=>'- '+x).join('\n');
}
function normSF(sf){ const f=findMon(sf); return f?f.key:null; }

/* ================= Showdown bridge ================= */
function getBattle(){try{
  const c=[];
  if(window.app){ if(app.curRoom&&app.curRoom.battle)c.push(app.curRoom.battle);
    if(app.rooms)for(const k in app.rooms){const r=app.rooms[k]; if(r&&r.battle)c.push(r.battle);} }
  if(window.PS){ if(PS.curRoom&&PS.curRoom.battle)c.push(PS.curRoom.battle);
    if(PS.rooms)for(const k in PS.rooms){const r=PS.rooms[k]; if(r&&r.battle)c.push(r.battle);} }
  if(window.room&&window.room.battle)c.push(window.room.battle);
  let best=null,bn=-1;
  for(const b of c){ const n=((b.stepQueue||b.log||[]).length)||0; if(n>bn){bn=n;best=b;} }
  return best;
}catch(e){return null;}}
// bulletproof fallback: read the "<user>'s team: A / B / C" lines the client prints at preview
function readTeamsFromDOM(){try{
  const txt=(document.body&&document.body.innerText)||'';
  const me=((window.app&&app.user&&app.user.get&&app.user.get('name'))||(window.PS&&PS.user&&PS.user.name)||'').trim();
  const re=/([^\n]{1,30}?)[’‘'`]s team:\s*([^\n]+)/gi; let m; const teams=[];
  while((m=re.exec(txt))!==null){ const list=m[2].split('/').map(s=>s.trim()).filter(Boolean); if(list.length>=3)teams.push({who:m[1].trim(),list}); }
  if(teams.length<2)return null;
  let mineT=teams.find(t=>me&&t.who.toLowerCase()===me.toLowerCase())||teams[0];
  const foeT=teams.find(t=>t!==mineT);
  const mine=[...new Set(mineT.list.map(normSF).filter(Boolean))];
  const foe =[...new Set(foeT.list.map(normSF).filter(Boolean))];
  if(mine.length>=3&&foe.length>=3)return {mine:mine.slice(0,6),foe:foe.slice(0,6)};
  return null;
}catch(e){return null;}}
function sideSpecies(side){if(!side)return[];const a=side.pokemon||side.team||[];return a.map(p=>p&&(p.speciesForme||p.species||p.name)).filter(Boolean);}
function readTeams(){
  const b=getBattle();
  if(!b){ const dom=readTeamsFromDOM(); if(dom){ window.__chompDiag='read from page text'; return dom; }
    window.__chompDiag='no battle open'; return null; }
  // PRIMARY: parse |poke| lines from the battle log/stepQueue — populated at team preview
  const q=b.stepQueue||b.log||(b.battle&&b.battle.stepQueue)||[];
  const poke={p1:[],p2:[]}, names={p1:'',p2:''};
  for(let i=0;i<q.length;i++){ const line=''+q[i]; let m;
    if(m=line.match(/^\|player\|(p[12])\|([^|]*)/)){ if(m[2])names[m[1]]=m[2]; }
    else if(m=line.match(/^\|poke\|(p[12])\|([^,|]+)/)){ poke[m[1]].push(m[2].trim()); }
  }
  let mySide=(b.mySide&&(b.mySide.sideid||b.mySide.id))||null;
  if(!mySide){ const me=((window.app&&app.user&&app.user.get&&app.user.get('name'))||'').toLowerCase();
    mySide = names.p1.toLowerCase()===me?'p1':(names.p2.toLowerCase()===me?'p2':'p1'); }
  const foeSide = mySide==='p1'?'p2':'p1';
  let mine=[...new Set(poke[mySide].map(normSF).filter(Boolean))];
  let foe =[...new Set(poke[foeSide].map(normSF).filter(Boolean))];
  // FALLBACK: live side arrays (mid-battle)
  if(mine.length<3||foe.length<3){
    let near=b.mySide||b.nearSide||(b.sides&&b.sides[0]), far=b.farSide||(b.sides&&b.sides[1]);
    if(b.mySide&&far===b.mySide){const t=near;near=far;far=t;}
    const m2=[...new Set(sideSpecies(near).map(normSF).filter(Boolean))], f2=[...new Set(sideSpecies(far).map(normSF).filter(Boolean))];
    if(m2.length>mine.length)mine=m2; if(f2.length>foe.length)foe=f2;
  }
  // if the battle object didn't give us teams (BETA client), fall back to the page text
  if(mine.length<3||foe.length<3){
    const dom=readTeamsFromDOM();
    if(dom){ window.__chompDiag='read from page text'; return dom; }
    window.__chompDiag='read '+mine.length+' mine / '+foe.length+' foe';
    return null;
  }
  window.__chompDiag='read '+mine.length+' mine / '+foe.length+' foe';
  return {mine:mine.slice(0,6), foe:foe.slice(0,6)};
}
// pull my REAL set for each species from Showdown's saved teams (matches the 6 I brought)
function myRealSets(mineKeys){
  try{
    const S=window.Storage; if(!S||!S.teams)return {};
    let best=null, bestHit=0;
    for(const t of S.teams){
      if(typeof t.team!=='string')continue;
      let arr; try{arr=S.unpackTeam(t.team);}catch(e){continue;}
      const keys=arr.map(s=>normSF(s.species||s.name)).filter(Boolean);
      const hit=mineKeys.filter(k=>keys.includes(k)).length;
      if(hit>bestHit){bestHit=hit; best=arr;}
    }
    if(!best||bestHit<Math.min(4,mineKeys.length))return {};
    const paste=window.Storage.exportTeam?window.Storage.exportTeam(best):null;
    if(!paste)return {};
    const map={}; parsePaste(paste).forEach(s=>{const b=buildMon(s); if(b)map[b.key]=b;});
    return map;
  }catch(e){return {};}
}
function buildSides(t){
  const real=myRealSets(t.mine);
  const my6=t.mine.map(k=> real[k] || buildMon(parsePaste(autoFoe(k))[0]) ).filter(Boolean);
  const foe6=t.foe.map(k=> buildMon(parsePaste(autoFoe(k))[0]) ).filter(Boolean);
  return {my6, foe6, usedReal:Object.keys(real).length};
}

/* ================= panel ================= */
let panel;
function ensure(){
  if(panel)return panel;
  panel=document.createElement('div'); panel.id='olv2';
  panel.innerHTML='<div id="olv2h">CHOMP — BRING 4 <span id="olv2m">–</span></div><div id="olv2b"></div>';
  document.body.appendChild(panel);
  const css=document.createElement('style'); css.textContent=`
  #olv2{position:fixed;top:64px;right:12px;width:288px;z-index:99999;background:#0f1216;border:1px solid #2a2f3a;border-radius:10px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e6e9ef;box-shadow:0 8px 30px rgba(0,0,0,.55)}
  #olv2h{font-size:10px;letter-spacing:1px;font-weight:700;color:#9aa1ad;padding:9px 11px;border-bottom:1px solid #23272f;display:flex;justify-content:space-between;cursor:move;user-select:none}
  #olv2m{cursor:pointer;color:#5b6270}
  #olv2b{padding:11px} #olv2.min #olv2b{display:none}
  .v2lead{font-size:15px;font-weight:800;color:#fff;margin-bottom:2px}
  .v2br{font-size:12px;color:#c3c9d4;margin-bottom:4px}
  .v2wx{font-size:11px;color:#7fb5ff;margin-bottom:8px}
  .v2row{display:flex;align-items:center;gap:7px;font-size:11px;margin:3px 0}
  .v2row .fn{flex:1;color:#9aa1ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .v2bar{width:46px;height:6px;border-radius:4px;background:#1c2028;overflow:hidden;flex:0 0 46px}
  .v2bar>span{display:block;height:100%}
  .v2ans{color:#e6e9ef;flex:0 0 92px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .v2note{font-size:10px;color:#e5a54b;margin-top:8px;line-height:1.35}
  .v2wait{font-size:12px;color:#6c7480}`;
  document.head.appendChild(css);
  const h=panel.querySelector('#olv2h');let dx=0,dy=0,drag=false;
  h.addEventListener('mousedown',e=>{if(e.target.id==='olv2m')return;drag=true;dx=e.clientX-panel.offsetLeft;dy=e.clientY-panel.offsetTop;});
  document.addEventListener('mousemove',e=>{if(drag){panel.style.left=(e.clientX-dx)+'px';panel.style.top=(e.clientY-dy)+'px';panel.style.right='auto';}});
  document.addEventListener('mouseup',()=>drag=false);
  panel.querySelector('#olv2m').addEventListener('click',()=>panel.classList.toggle('min'));
  return panel;
}
function col(pct){return pct>=100?'#2fbf6b':pct>=50?'#7fce4c':pct>=33?'#f5a623':'#e5484d';}
function disp(k){return (MONS[k]&&MONS[k].name)|| k;}
let lastKey='';
function render(){
  const p=ensure(), body=p.querySelector('#olv2b'), t=readTeams();
  if(!t){ body.innerHTML='<div class="v2wait">'+((window.__chompDiag)||'Open a Champions battle.')+'</div>'; lastKey=''; return; }
  const key=t.mine.join(',')+'|'+t.foe.join(',');
  if(key===lastKey)return; lastKey=key;
  const {my6,foe6,usedReal}=buildSides(t);
  if(my6.length<4||foe6.length<4){body.innerHTML='<div class="v2wait">Reading teams…</div>';lastKey='';return;}
  const r=bring4(my6,foe6);
  let h='<div class="v2lead">'+r.lead.join(' + ')+'</div>';
  h+='<div class="v2br">Bring: '+r.bring.join(', ')+'</div>';
  h+='<div class="v2wx">Weather: '+r.weather+'  ·  score '+r.score+'  ·  '+usedReal+'/6 real sets</div>';
  r.detail.forEach(d=>{h+='<div class="v2row"><span class="fn">'+d.foe+'</span><span class="v2bar"><span style="width:'+Math.max(8,Math.min(100,d.myHit))+'%;background:'+col(d.myHit)+'"></span></span><span class="v2ans">'+d.answer+' '+d.myHit+'%</span></div>';});
  if(r.notes&&r.notes.length)h+='<div class="v2note">▲ '+r.notes.join('<br>▲ ')+'</div>';
  body.innerHTML=h;
}
/* ===== auto-close the News popup + collapse the rooms (Hide) — one-shot Hide so it can't loop ===== */
let _chompHid=false;
function chompAutoClose(){ try{
  // News box: click its close, else hide the container
  [...document.querySelectorAll('h3,.title,.roomtab,strong')].forEach(h=>{
    if(/^\s*News\s*$/i.test((h.textContent||'').trim())){
      const box=h.closest('.readme,.ps-popup,.news,.mainmenu,div');
      const cx=box&&box.querySelector('button[name="close"],.closebutton,button.closebutton');
      if(cx)cx.click(); else if(box)box.style.display='none';
    }
  });
  document.querySelectorAll('.readme .closebutton,.news .closebutton,.pmbox .closebutton').forEach(b=>b.click());
  // Hide the rooms sidebar exactly once
  if(!_chompHid){
    const hb=[...document.querySelectorAll('button,.roomtab')].find(b=>{
      const t=(b.textContent||'').trim(); return t==='Hide'||b.getAttribute('name')==='toggleRoomList'||b.getAttribute('name')==='roomlist'; });
    if(hb){ hb.click(); _chompHid=true; }
  }
}catch(e){} }
chompAutoClose(); setInterval(chompAutoClose,1500);
setInterval(render,900);
console.log('[CHOMP] real damage model active — '+Object.keys(MONS).length+' mons, '+Object.keys(MOVES).length+' moves.');
})();
'''

out=HEADER+engine+'\n'+BRIDGE
open(OUT,'w',encoding='utf8').write(out)
print('wrote',OUT,len(out),'bytes')
