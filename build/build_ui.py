import re,io
src=open('/sessions/kind-fervent-sagan/mnt/outputs/operation-ladder.html',encoding='utf-8').read()
# extract engine script (between first <script> and last </script>)
s0=src.index('<script>')+len('<script>')
s1=src.rindex('</script>')
script=src[s0:s1]
# keep engine up to the old UI runtime glue (cut at old tab())
cut=script.index('function tab(id,el){')
engine=script[:cut]

NEW_UI = r'''
/* ================= TOURNAMENT UI ================= */
const META30=['garchomp','kingambit','incineroar','gholdengo','tsareena','basculegion','charizard','staraptor','sinistcha','whimsicott','farigiraf','torkoal','pelipper','archaludon','sneasler','metagross','dragonite','talonflame','sylveon','tyranitar','rotom-wash','mawile','ninetales-a','excadrill','sableye','gengar','milotic','annihilape','maushold','mudsdale'];
const ALLNAMES=Object.keys(M).sort();
let ACTIVE=[];            // your active six (set from PICK or TEAMS)
function disp(n){return (n||'').split('-').map(w=>w? w[0].toUpperCase()+w.slice(1):'').join('-');}
function tcol(n){return M[n]?(TYPECOL[M[n][0][0]]||'#8b93a3'):'#8b93a3';}
function spr(n,cls){cls=cls||'';const code=(n||'').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase();
 return `<span class="spr ${cls}"><img src="${spriteUrl(n)}" alt="${disp(n)}" loading="lazy" onerror="this.style.display='none';this.parentNode.classList.add('nf');this.parentNode.style.setProperty('--c','${tcol(n)}');this.parentNode.setAttribute('data-c','${code}')"></span>`;}
function conf(v){return v>=13?'#2fbf6b':v>=9.5?'#7fce4c':v>=6?'#f5a623':'#e5484d';}
function tab(id,btn){document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById(id).classList.add('on');
 if(id==='scout')drawScout();if(id==='teams')drawTeams();}

/* ---------- PICK ---------- */
function sixInputs(pfx){let h='';for(let i=0;i<6;i++)h+=`<div class="slot"><span class="thumb" id="${pfx}t${i}"></span><input id="${pfx}${i}" list="allmons" autocomplete="off" spellcheck="false" oninput="thumb('${pfx}',${i})" placeholder="–"></div>`;return h;}
function thumb(pfx,i){const v=(document.getElementById(pfx+i).value||'').trim().toLowerCase().replace(/\s+/g,'-');const n=ALIAS[v]||v;const t=document.getElementById(pfx+'t'+i);t.innerHTML=M[n]?spr(n):'';}
function readSix(pfx){const a=[];for(let i=0;i<6;i++){const v=(document.getElementById(pfx+i).value||'').trim().toLowerCase().replace(/\s+/g,'-');const n=ALIAS[v]||v;if(M[n]&&!a.includes(n))a.push(n);}return a;}
function computePick(){
 const mine=readSix('me'),foe=readSix('fo');ACTIVE=mine.slice();
 const out=document.getElementById('pickout');
 if(mine.length<4||foe.length<1){out.innerHTML=`<p class="hint">Enter your team (≥4) and the opponent's team.</p>`;return;}
 const r=bring4(mine,foe);
 const lead=new Set(r.lead), brought=new Set(r.best.sub);
 let h=`<div class="brings">`;
 r.best.sub.forEach(n=>{h+=`<div class="bcard ${lead.has(n)?'lead':''}">${spr(n,'big')}<span class="bn">${disp(n)}</span>${lead.has(n)?'<span class="tag lead">LEAD</span>':'<span class="tag">BRING</span>'}</div>`;});
 mine.filter(n=>!brought.has(n)).forEach(n=>{h+=`<div class="bcard bench">${spr(n,'big')}<span class="bn">${disp(n)}</span><span class="tag bench">BENCH</span></div>`;});
 h+=`</div>`;
 // coverage matrix — each enemy -> your answer, bar colored by confidence
 h+=`<div class="cov">`;
 r.best.detail.forEach(d=>{const c=conf(d.best);h+=`<div class="covrow">${spr(d.foe)}<span class="cn">${disp(d.foe)}</span><span class="cbar"><span style="width:${Math.max(6,Math.min(100,d.best*6))}%;background:${c}"></span></span>${spr(d.answer)}</div>`;});
 h+=`</div>`;
 if(r.best.notes&&r.best.notes.length)h+=`<p class="warn">${r.best.notes.join(' · ')}</p>`;
 out.innerHTML=h;
}

/* ---------- SCOUT ---------- */
let SCSEL=null;
function drawScout(){
 const g=document.getElementById('scgrid');
 g.innerHTML=META30.filter(n=>M[n]).map(n=>`<button class="gcell ${SCSEL===n?'on':''}" onclick="scoutOne('${n}')" title="${disp(n)}">${spr(n)}</button>`).join('');
 if(!SCSEL)document.getElementById('scdetail').innerHTML=`<p class="hint">Pick a threat. Your answers are colored green (handles it) to red (loses).</p>`;
 else scoutOne(SCSEL);
}
function scoutOne(n){
 SCSEL=n;document.querySelectorAll('#scgrid .gcell').forEach(b=>b.classList.remove('on'));
 drawScout._noredraw||document.querySelectorAll('#scgrid .gcell').forEach(b=>{if(b.title===disp(n))b.classList.add('on');});
 const foe=buildMon(n);const ctx={myWx:null,foeWx:null,myPrioBlock:false,foePrioBlock:false};
 const roster=(ACTIVE.length?ACTIVE:META30.slice(0,6));
 const ans=roster.filter(m=>M[m]).map(m=>({m,v:pairV5(buildMon(m),foe,ctx)})).sort((a,b)=>b.v-a.v);
 const types=M[n][0].map(t=>`<span class="tpill" style="background:${TYPECOL[t]}">${t.toUpperCase()}</span>`).join('');
 let h=`<div class="schead">${spr(n,'big')}<div><div class="scname">${disp(n)}</div><div>${types}</div></div></div>`;
 h+=`<div class="scnote">${ACTIVE.length?'Your team’s answers:':'Set your team in PICK for tailored answers — showing sample:'}</div>`;
 h+=`<div class="anslist">`+ans.map(a=>`<div class="ansrow"><span class="dot" style="background:${conf(a.v+8)}"></span>${spr(a.m)}<span class="an">${disp(a.m)}</span></div>`).join('')+`</div>`;
 document.getElementById('scdetail').innerHTML=h;
}

/* ---------- TEAMS ---------- */
function buildPaste(team){
 return team.map(n=>{const set=SETDB[n];if(set)return set;const nm=disp(SPRNAME[n]||n);return nm+' @ (item)\nAbility: (—)\n- (sets not on file)';}).join('\n\n');
}
function drawTeams(){
 const saved=savedTeams();const list=Object.entries(MYTEAMS).concat(saved.map((t,i)=>['★ '+(t.name||('Saved '+i)),t.team.join(' ')]));
 const el=document.getElementById('tmlist');
 el.innerHTML=list.map(([name,six],i)=>{const arr=six.split(' ').filter(x=>M[x]);
  return `<button class="tmrow" onclick="showTeam(${i})"><span class="tmname">${name}</span><span class="tmmini">${arr.map(n=>spr(n,'mini')).join('')}</span></button>`;}).join('');
 window._TMLIST=list;
 if(list.length&&!document.getElementById('tmdetail').dataset.loaded)showTeam(0);
}
function showTeam(i){
 const [name,six]=window._TMLIST[i];const arr=six.split(' ').filter(x=>M[x]);
 document.querySelectorAll('.tmrow').forEach((b,j)=>b.classList.toggle('on',j===i));
 const paste=buildPaste(arr);
 const d=document.getElementById('tmdetail');d.dataset.loaded='1';
 d.innerHTML=`<div class="tmhead"><span class="tmh">${name}</span><span class="tmacts"><button class="btn" onclick="loadToPick(${i})">USE IN PICK</button><button class="btn ghost" onclick="copyPasteTxt(this)">COPY</button></span></div>
 <div class="tmteam">${arr.map(n=>`<div class="tmslot">${spr(n,'big')}<span>${disp(n)}</span></div>`).join('')}</div>
 <pre class="paste">${paste.replace(/</g,'&lt;')}</pre>`;
}
function copyPasteTxt(btn){const pre=btn.closest('#tmdetail').querySelector('.paste');navigator.clipboard&&navigator.clipboard.writeText(pre.textContent);btn.textContent='COPIED';setTimeout(()=>btn.textContent='COPY',1200);}
function loadToPick(i){const arr=window._TMLIST[i][1].split(' ').filter(x=>M[x]);ACTIVE=arr.slice();for(let k=0;k<6;k++){document.getElementById('me'+k).value=arr[k]?disp(arr[k]):'';thumb('me',k);}document.querySelector('.tabbtn').click();}

/* ---------- ANALYZE ---------- */
function computeAnalyze(){
 const {mons}=parsePasteRich(document.getElementById('anin').value||'');
 const names=mons.length?mons.map(m=>m.name):parsePaste(document.getElementById('anin').value||'').team;
 const out=document.getElementById('anout');
 if(names.length<4){out.innerHTML=`<p class="hint">Paste a team (Showdown export or six names).</p>`;return;}
 ACTIVE=names.slice(0,6);
 const rows=Object.entries(allTeams()).map(([nm,six])=>{const foes=six.split(' ').filter(x=>M[x]);const r=teamVs(names,foes);return{nm,score:r.score};}).sort((a,b)=>a.score-b.score);
 const mean=(rows.reduce((s,r)=>s+r.score,0)/rows.length).toFixed(1);
 let h=`<div class="anteam">${names.map(n=>spr(n,'big')).join('')}</div>`;
 h+=`<div class="anmeanrow"><span class="anmean" style="color:${conf(+mean)}">${mean}</span><span class="anlbl">avg matchup vs ${rows.length} teams</span></div>`;
 h+=`<div class="spread">`+rows.map(r=>`<span class="seg" style="background:${conf(r.score)}" title="${r.nm}: ${r.score}"></span>`).join('')+`</div>`;
 h+=`<div class="worst"><div class="wlbl">Weakest matchups</div>`+rows.slice(0,5).map(r=>`<div class="wrow"><span class="dot" style="background:${conf(r.score)}"></span><span>${r.nm}</span><span class="ws">${r.score}</span></div>`).join('')+`</div>`;
 out.innerHTML=h;
}

/* ---------- boot ---------- */
document.getElementById('meslots').innerHTML=sixInputs('me');
document.getElementById('foslots').innerHTML=sixInputs('fo');
document.getElementById('allmons').innerHTML=ALLNAMES.map(n=>`<option value="${disp(n)}">`).join('');
'''

# MYTEAMS: the built-in rosters shown in TEAMS tab (reuse TEAMS + a few named)
MYTEAMS_JS = "\nconst MYTEAMS=Object.assign({},{"+"'Flood the Zone':'pelipper swampert sneasler meowscarada rotom-wash sinistcha','Ponzi Scheme':'espathra alcremie kingambit tsareena charizard gholdengo','Diabolical Rain':'pelipper blastoise archaludon whimsicott ariados grimmsnarl','Lure C':'tsareena gholdengo incineroar basculegion whimsicott garchomp'},TEAMS);\n"

HEAD = '''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Operation Ladder</title><style>
:root{color-scheme:dark}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0e1013;color:#e6e9ef;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:18px 20px 40px}
header{display:flex;align-items:baseline;gap:12px;padding:2px 0 14px}
header h1{font-size:15px;font-weight:700;letter-spacing:2.5px}
header .sub{font-size:11px;color:#6c7480;letter-spacing:1px}
.tabbar{display:flex;gap:2px;border-bottom:1px solid #23272f;margin-bottom:20px}
.tabbtn{background:none;border:none;color:#7c8492;font:inherit;font-size:12px;font-weight:600;letter-spacing:1.5px;padding:11px 18px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.tabbtn:hover{color:#c3c9d4}
.tabbtn.on{color:#fff;border-bottom-color:#3a86ff}
.view{display:none}.view.on{display:block}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.tcol h2{font-size:11px;letter-spacing:2px;color:#7c8492;margin-bottom:10px;font-weight:600}
.tcol.opp h2{color:#e5686d}
.slot{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.slot .thumb{width:34px;height:30px;flex:0 0 34px;display:flex;align-items:center;justify-content:center}
.slot input{flex:1;background:#171a20;border:1px solid #262b36;border-radius:7px;color:#e6e9ef;font:inherit;font-size:13px;padding:8px 11px}
.slot input:focus{outline:none;border-color:#3a86ff}
.go{display:block;width:100%;margin:20px 0 6px;background:#3a86ff;color:#04122e;border:none;border-radius:9px;font:inherit;font-size:13px;font-weight:800;letter-spacing:2px;padding:14px;cursor:pointer}
.go:hover{filter:brightness(1.08)}
.hint{color:#6c7480;font-size:13px;padding:14px 0}
.warn{color:#f5a623;font-size:12px;margin-top:12px}
/* sprite */
.spr{display:inline-flex;align-items:center;justify-content:center;width:40px;height:34px;position:relative;vertical-align:middle}
.spr img{max-width:56px;max-height:44px;image-rendering:-webkit-optimize-contrast}
.spr.big{width:72px;height:58px}.spr.big img{max-width:96px;max-height:74px}
.spr.mini{width:26px;height:22px}.spr.mini img{max-width:34px;max-height:28px}
.spr.nf::after{content:attr(data-c);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--c);color:#0e1013;font-size:9px;font-weight:800;border-radius:6px;letter-spacing:.5px}
.spr.big.nf::after{font-size:12px}
/* PICK result */
.brings{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 22px}
.bcard{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 14px;background:#161a21;border:1px solid #262b36;border-radius:11px;min-width:96px}
.bcard.lead{border-color:#2fbf6b;box-shadow:0 0 0 1px #2fbf6b inset}
.bcard.bench{opacity:.4}
.bcard .bn{font-size:11px;color:#c3c9d4}
.tag{font-size:9px;font-weight:800;letter-spacing:1px;color:#7c8492;background:#0e1013;border:1px solid #262b36;border-radius:4px;padding:1px 6px}
.tag.lead{color:#0e1013;background:#2fbf6b;border-color:#2fbf6b}
.cov{display:flex;flex-direction:column;gap:6px;max-width:620px}
.covrow{display:flex;align-items:center;gap:10px}
.covrow .cn{flex:1;font-size:12px;color:#9aa1ad}
.cbar{width:130px;height:8px;background:#1c2028;border-radius:5px;overflow:hidden;flex:0 0 130px}
.cbar span{display:block;height:100%;border-radius:5px}
/* SCOUT */
.scoutgrid{display:grid;grid-template-columns:2fr 1.1fr;gap:24px}
#scgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:4px;align-content:start}
.gcell{background:#161a21;border:1px solid #23272f;border-radius:8px;padding:4px;cursor:pointer}
.gcell:hover{border-color:#3a4150}.gcell.on{border-color:#3a86ff;background:#182234}
#scdetail{background:#141821;border:1px solid #23272f;border-radius:11px;padding:16px;align-self:start;position:sticky;top:14px}
.schead{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.scname{font-size:16px;font-weight:700}
.tpill{font-size:9px;font-weight:800;letter-spacing:1px;color:#0e1013;border-radius:4px;padding:2px 7px;margin-right:4px}
.scnote{font-size:11px;color:#7c8492;margin-bottom:8px;letter-spacing:.3px}
.anslist,.tmteam{display:flex;flex-direction:column;gap:5px}
.ansrow{display:flex;align-items:center;gap:9px;font-size:12px;color:#c3c9d4}
.dot{width:9px;height:9px;border-radius:50%;flex:0 0 9px}
/* TEAMS */
.teamsgrid{display:grid;grid-template-columns:300px 1fr;gap:22px}
.tmrow{display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;background:#161a21;border:1px solid #23272f;border-radius:9px;padding:11px 13px;cursor:pointer;margin-bottom:7px}
.tmrow:hover{border-color:#3a4150}.tmrow.on{border-color:#3a86ff}
.tmname{font-size:12px;font-weight:600;color:#e6e9ef}
.tmmini{display:flex;gap:1px}
#tmdetail{background:#141821;border:1px solid #23272f;border-radius:11px;padding:18px}
.tmhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.tmh{font-size:15px;font-weight:700}
.btn{background:#3a86ff;color:#04122e;border:none;border-radius:7px;font:inherit;font-size:11px;font-weight:800;letter-spacing:1px;padding:8px 13px;cursor:pointer;margin-left:6px}
.btn.ghost{background:none;border:1px solid #3a4150;color:#c3c9d4}
.tmteam{flex-direction:row;flex-wrap:wrap;gap:14px;margin-bottom:16px}
.tmslot{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:#9aa1ad}
.paste{background:#0c0e12;border:1px solid #23272f;border-radius:8px;padding:14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#c3c9d4;white-space:pre-wrap;overflow:auto;max-height:420px}
/* ANALYZE */
#anin{width:100%;height:150px;background:#171a20;border:1px solid #262b36;border-radius:9px;color:#e6e9ef;font-family:ui-monospace,monospace;font-size:12px;padding:12px}
.anteam{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0 10px}
.anmeanrow{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}
.anmean{font-size:34px;font-weight:800}
.anlbl{font-size:12px;color:#7c8492}
.spread{display:flex;gap:2px;height:26px;border-radius:6px;overflow:hidden;margin-bottom:18px}
.spread .seg{flex:1}
.worst .wlbl{font-size:11px;letter-spacing:1px;color:#7c8492;margin-bottom:8px}
.wrow{display:flex;align-items:center;gap:10px;font-size:13px;padding:5px 0;border-bottom:1px solid #1a1e26}
.wrow span:nth-child(2){flex:1;color:#c3c9d4}
.ws{font-weight:700;font-family:ui-monospace,monospace}
.foot{margin-top:34px;padding-top:14px;border-top:1px solid #1a1e26;font-size:11px;color:#5b6270;line-height:1.6}
label.big2{font-size:11px;letter-spacing:2px;color:#7c8492;display:block;margin-bottom:8px;font-weight:600}
</style></head><body><div class="wrap">
<header><h1>OPERATION LADDER</h1><span class="sub">Champions Reg M-B</span></header>
<div class="tabbar">
 <button class="tabbtn on" onclick="tab('pick',this)">PICK 4</button>
 <button class="tabbtn" onclick="tab('scout',this)">SCOUT</button>
 <button class="tabbtn" onclick="tab('teams',this)">TEAMS</button>
 <button class="tabbtn" onclick="tab('analyze',this)">ANALYZE</button>
</div>

<div id="pick" class="view on">
 <div class="grid2">
  <div class="tcol"><h2>YOUR TEAM</h2><div id="meslots"></div></div>
  <div class="tcol opp"><h2>OPPONENT</h2><div id="foslots"></div></div>
 </div>
 <button class="go" onclick="computePick()">COMPUTE BEST 4</button>
 <div id="pickout"><p class="hint">Enter both teams. The engine tests all 15 possible brings and shows the four that cover the opponent best, plus your lead. Each threat gets a colored bar to your answer — green means you handle it, red means you don’t.</p></div>
</div>

<div id="scout" class="view">
 <div class="scoutgrid">
  <div id="scgrid"></div>
  <div id="scdetail"></div>
 </div>
</div>

<div id="teams" class="view">
 <div class="teamsgrid">
  <div id="tmlist"></div>
  <div id="tmdetail"></div>
 </div>
</div>

<div id="analyze" class="view">
 <label class="big2">PASTE A TEAM</label>
 <textarea id="anin" placeholder="Showdown export, or six names one per line"></textarea>
 <button class="go" onclick="computeAnalyze()">ANALYZE</button>
 <div id="anout"><p class="hint">Scores the team across every logged opponent. The bar runs worst (red, left) to best (green, right); the list names your five weakest matchups.</p></div>
</div>

<div class="foot">Matchup scores are a coverage/interaction heuristic, not a win predictor — game-level prediction tested at chance. Use it to build and to make preview reads, then trust the ladder. Sprites: Pokémon Showdown.</div>

<datalist id="allmons"></datalist>
</div>
'''

out = HEAD + '<script>' + engine + MYTEAMS_JS + NEW_UI + '</script></body></html>'
open('/sessions/kind-fervent-sagan/mnt/outputs/operation-ladder.html','w',encoding='utf-8').write(out)
print('written',len(out),'bytes')
