bak=open('/sessions/kind-fervent-sagan/mnt/outputs/operation-ladder.bak.html',encoding='utf-8').read()
s0=bak.index('<script>')+len('<script>'); s1=bak.rindex('</script>')
script=bak[s0:s1]
engine=script[:script.index('function tab(id,el){')]  # data + all engine layers + bring4

HEADER='''// ==UserScript==
// @name         Operation Ladder — Bring 4
// @namespace    willhoop.vgc
// @version      1.0
// @description  Reads both teams at Champions Reg M-B team preview and instantly shows the best 4 to bring + lead. No screenshot, no typing.
// @match        https://play.pokemonshowdown.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function(){
"use strict";
'''

FOOTER=r'''
/* ================= Showdown bridge + UI ================= */
function norm(sf){
 if(!sf) return null;
 let n=(''+sf).toLowerCase().replace(/[’'.]/g,'').replace(/-mega(-[xy])?$/,'').replace(/-gmax$/,'').replace(/\s+/g,'-');
 n=ALIAS[n]||n;
 if(M[n]) return n;
 // try a couple regional shortenings the engine uses
 const alt={'ninetales-alola':'ninetales-a','floette-eternal':'floette-e','rotom-wash':'rotom-wash','slowking-galar':'slowking-g','typhlosion-hisui':'typhlosion-h'};
 if(alt[n]&&M[alt[n]]) return alt[n];
 // strip any regional suffix as last resort
 const base=n.split('-')[0]; return M[base]?base:null;
}
function getBattle(){ try{ var r=window.app&&window.app.curRoom; return (r&&r.battle)||null; }catch(e){ return null; } }
function sideMons(side){ if(!side) return []; var arr=side.pokemon||side.team||[]; return arr.map(function(p){return p&&(p.speciesForme||p.getSpeciesForme&&p.getSpeciesForme()||p.species||p.name);}).filter(Boolean); }
function readTeams(){
 var b=getBattle(); if(!b) return null;
 var near = b.mySide||b.nearSide||(b.sides&&b.sides[0]);
 var far  = b.farSide||(b.sides&&b.sides[1]);
 // ensure "near" is actually mine
 if(b.mySide && far===b.mySide){ var t=near; near=far; far=t; }
 var mine=sideMons(near).map(norm).filter(Boolean);
 var foe =sideMons(far ).map(norm).filter(Boolean);
 if(mine.length<3||foe.length<3) return null;
 // dedupe preserving order
 mine=[...new Set(mine)]; foe=[...new Set(foe)];
 return {mine:mine.slice(0,6), foe:foe.slice(0,6), raw:{mine:sideMons(near),foe:sideMons(far)}};
}
function conf(v){return v>=13?"#2fbf6b":v>=9.5?"#7fce4c":v>=6?"#f5a623":"#e5484d";}
function disp(n){return (n||'').split('-').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join('-');}
function icon(n){ // Showdown picon via the loaded sprite sheet
 return '<span class="olspr" style="background:url(https://play.pokemonshowdown.com/sprites/gen5/'+(({"floette-e":"floette-eternal","ninetales-a":"ninetales-alola","rotom-wash":"rotom-wash","slowking-g":"slowking-galar","typhlosion-h":"typhlosion-hisui"})[n]||n)+'.png) center/contain no-repeat"></span>';
}
var panel;
function ensurePanel(){
 if(panel) return panel;
 panel=document.createElement('div'); panel.id='ol-panel';
 panel.innerHTML='<div id="ol-h">OPERATION LADDER — BRING 4 <span id="ol-min">–</span></div><div id="ol-b"></div>';
 document.body.appendChild(panel);
 var css=document.createElement('style'); css.textContent=`
 #ol-panel{position:fixed;top:64px;right:12px;width:270px;z-index:99999;background:#0f1216;border:1px solid #2a2f3a;border-radius:10px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e6e9ef;box-shadow:0 8px 30px rgba(0,0,0,.5)}
 #ol-h{font-size:10px;letter-spacing:1.2px;font-weight:700;color:#9aa1ad;padding:9px 11px;border-bottom:1px solid #23272f;display:flex;justify-content:space-between;cursor:move;user-select:none}
 #ol-min{cursor:pointer;color:#5b6270}
 #ol-b{padding:11px}
 #ol-panel.min #ol-b{display:none}
 .ol-lead{font-size:15px;font-weight:800;color:#fff;margin-bottom:2px}
 .ol-bring{font-size:12px;color:#c3c9d4;margin-bottom:10px}
 .ol-cov{display:flex;flex-direction:column;gap:4px}
 .ol-row{display:flex;align-items:center;gap:7px;font-size:11px}
 .ol-row .fn{flex:1;color:#9aa1ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ol-bar{width:52px;height:6px;border-radius:4px;background:#1c2028;overflow:hidden;flex:0 0 52px}
 .ol-bar>span{display:block;height:100%}
 .ol-ans{color:#e6e9ef;flex:0 0 74px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ol-wait{font-size:12px;color:#6c7480}
 .olspr{display:inline-block;width:22px;height:18px;vertical-align:middle}
 `;
 document.head.appendChild(css);
 // drag
 var h=panel.querySelector('#ol-h'),dx=0,dy=0,drag=false;
 h.addEventListener('mousedown',function(e){if(e.target.id==='ol-min')return;drag=true;dx=e.clientX-panel.offsetLeft;dy=e.clientY-panel.offsetTop;});
 document.addEventListener('mousemove',function(e){if(drag){panel.style.left=(e.clientX-dx)+'px';panel.style.top=(e.clientY-dy)+'px';panel.style.right='auto';}});
 document.addEventListener('mouseup',function(){drag=false;});
 panel.querySelector('#ol-min').addEventListener('click',function(){panel.classList.toggle('min');});
 return panel;
}
// use each mon's most-common known set (moves/ability/item) when available, else species default
function richOf(name){ try{ var s=SETDB[name]; if(s){ var pr=parsePasteRich(s); if(pr.mons&&pr.mons[0]) return pr.mons[0]; } }catch(e){} return name; }
function nameOf(e){ return (e&&e.name)?e.name:e; }
function bring4rich(mineNames, foeNames){
 var mineR=mineNames.map(richOf), foeR=foeNames.map(richOf);
 var idx=[]; for(var i=0;i<mineR.length;i++)idx.push(i);
 var best=null;
 combos4(idx).forEach(function(c){ var sub=c.map(function(i){return mineR[i];}); var r=teamVs(sub,foeR);
   if(!best||r.score>best.score) best={sub:sub,names:c.map(function(i){return mineNames[i];}),score:r.score,detail:r.detail,notes:r.notes}; });
 var ctx={myWx:null,foeWx:null,myPrioBlock:false,foePrioBlock:false},val={};
 best.sub.forEach(function(m,k){ var s=0; foeR.forEach(function(f){ s+=pairV5(buildMon(m),buildMon(f),ctx); }); val[best.names[k]]=s; });
 var lead=best.names.slice().sort(function(a,b){return val[b]-val[a];}).slice(0,2);
 // map detail foe/answer to display names
 best.detail=best.detail.map(function(d){return {foe:nameOf(d.foe),answer:nameOf(d.answer),best:d.best};});
 return {best:{sub:best.names,detail:best.detail,notes:best.notes},lead:lead};
}
var lastKey='';
function render(){
 var p=ensurePanel(), body=p.querySelector('#ol-b');
 var t=readTeams();
 if(!t){ if(lastKey!==''){lastKey='';body.innerHTML='<div class="ol-wait">Open a Champions battle. I read both teams at preview automatically.</div>';} return; }
 var key=t.mine.join(',')+'|'+t.foe.join(',');
 if(key===lastKey) return; lastKey=key;
 var r=bring4rich(t.mine,t.foe);
 var lead=new Set(r.lead);
 var h='<div class="ol-lead">'+r.lead.map(disp).join(' + ')+'</div>';
 h+='<div class="ol-bring">Bring: '+r.best.sub.map(function(n){return (lead.has(n)?'●':'')+disp(n);}).join(', ')+'</div>';
 h+='<div class="ol-cov">';
 r.best.detail.forEach(function(d){var c=conf(d.best);h+='<div class="ol-row"><span class="fn">'+disp(d.foe)+'</span><span class="ol-bar"><span style="width:'+Math.max(8,Math.min(100,d.best*6))+'%;background:'+c+'"></span></span><span class="ol-ans">'+disp(d.answer)+'</span></div>';});
 h+='</div>';
 var unread=(t.raw.mine.length+t.raw.foe.length)-(t.mine.length+t.foe.length);
 if(unread>0) h+='<div class="ol-wait" style="margin-top:8px">'+unread+' mon(s) not in DB — read may be partial.</div>';
 body.innerHTML=h;
}
setInterval(render,900);
console.log('[Operation Ladder] Bring-4 userscript active — '+Object.keys(M).length+' mons loaded.');
})();
'''

out=HEADER+engine+FOOTER
open('/sessions/kind-fervent-sagan/mnt/outputs/operation-ladder-bring4.user.js','w',encoding='utf-8').write(out)
print('userscript written',len(out),'bytes; engine chars',len(engine))
