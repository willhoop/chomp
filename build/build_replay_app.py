#!/usr/bin/env python3
# Build olme-replay-app.html: a standalone page that auto-pulls your Showdown
# replays and runs each through OLME (embedded damage-calc engine).
import re
lab=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/engine/champions-damage-lab.html',encoding='utf8').read()
model=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/engine/champ-model.js',encoding='utf8').read()
def grab(name):
    m=re.search(r'(?:const |,|\s)'+name+r'=\{',lab); i=m.end()-1; d=0; st=i
    while i<len(lab):
        c=lab[i]
        if c=='{':d+=1
        elif c=='}':
            d-=1
            if d==0:i+=1;break
        i+=1
    return lab[st:i]
MONS=grab('MONS'); MOVES=grab('MOVES'); C=grab('C')
LEGAL=open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/data/champions-legal-moves.json',encoding='utf8').read()
engine=model[model.index('const byName'):model.index('module.exports')].strip()

APP=r'''
/* ===== Showdown replay parser ===== */
function parseLog(text, me){
  const L=text.split('\n');
  const roster={p1:[],p2:[]}, names={p1:'',p2:''}, brought={p1:new Set(),p2:new Set()};
  let winner=null, rA=null,rB=null, ratedTag=false;
  for(const line of L){
    let m;
    if(m=line.match(/^\|player\|(p[12])\|([^|]*)/)){ if(m[2])names[m[1]]=m[2]; }
    else if(m=line.match(/^\|poke\|(p[12])\|([^,|]+)/)){ const k=norm(m[2].trim()); if(k)roster[m[1]].push(k); }
    else if(m=line.match(/^\|(?:switch|drag)\|(p[12])[ab]: [^|]*\|([^,|]+)/)){ const k=norm(m[2].trim()); if(k)brought[m[1]].add(k); }
    else if(m=line.match(/^\|win\|(.+)/)){ winner=m[1].trim(); }
    else if(m=line.match(/rating: (\d+) &rarr; <strong>(\d+)/)){ if(rA===null){rA=[+m[1],+m[2]];} else {rB=[+m[1],+m[2]];} }
  }
  const meSide = names.p1.toLowerCase()===me.toLowerCase()?'p1':(names.p2.toLowerCase()===me.toLowerCase()?'p2':'p1');
  const foeSide = meSide==='p1'?'p2':'p1';
  return { meName:names[meSide], foeName:names[foeSide],
    mySix:roster[meSide], foeSix:roster[foeSide],
    myBrought:[...brought[meSide]], foeBrought:[...brought[foeSide]],
    won: winner && winner.toLowerCase()===me.toLowerCase() };
}
/* ===== generic set builder for analysis (both sides) ===== */
const ABIL={pelipper:'Drizzle',politoed:'Drizzle',torkoal:'Drought',charizard:'Drought',tyranitar:'Sand Stream','ninetales-alola':'Snow Warning',abomasnow:'Snow Warning',incineroar:'Intimidate',gyarados:'Intimidate',staraptor:'Intimidate',archaludon:'Stamina',meowscarada:'Protean',greninja:'Protean',kingambit:'Defiant',whimsicott:'Prankster',basculegion:'Adaptability',dragonite:'Multiscale',blastoise:'Mega Launcher',sylveon:'Pixilate',garchomp:'Rough Skin',sinistcha:'Hospitality',grimmsnarl:'Prankster',excadrill:'Sand Rush'};
const MEGA_ITEM={blastoise:'Blastoisinite',charizard:'Charizardite Y',tyranitar:'Tyranitarite',gyarados:'Gyaradosite',metagross:'Metagrossite',gengar:'Gengarite',staraptor:'Staraptite',venusaur:'Venusaurite',sceptile:'Sceptilite',aerodactyl:'Aerodactylite'};
function norm(sf){ const f=findMon(sf); return f?f.key:null; }
function autoMon(key){
  const mon=MONS[key]; if(!mon)return null;
  const phys=mon.bs.atk>=mon.bs.spa, cat=phys?'Physical':'Special';
  const cand=Object.values(MOVES).filter(m=>m.c===cat&&m.bp&&!BAD_AUTO.has(m.n.toLowerCase())&&canLearn(key,m.n)); const mv=[];
  mon.t.forEach(ty=>{const b=cand.filter(m=>m.t===ty).sort((a,b)=>b.bp-a.bp)[0];if(b&&!mv.includes(b.n))mv.push(b.n);});
  const cov=cand.filter(m=>!mon.t.includes(m.t)).sort((a,b)=>b.bp-a.bp)[0];if(cov&&mv.length<3)mv.push(cov.n);
  let gi=0;while(mv.length<2){const x=cand.sort((a,b)=>b.bp-a.bp)[gi++];if(!x)break;if(!mv.includes(x.n))mv.push(x.n);}
  const it=MEGA_ITEM[key]||'Life Orb', nat=phys?'Adamant':'Modest', sp=phys?'2 HP / 32 Atk / 32 Spe':'2 HP / 32 SpA / 32 Spe';
  return buildMon(parsePaste(mon.name+' @ '+it+'\nAbility: '+(ABIL[key]||'Pressure')+'\n'+nat+' Nature\nEVs: '+sp+'\n'+mv.map(x=>'- '+x).join('\n'))[0]);
}
/* ===== fetch + analyze ===== */
const API='https://replay.pokemonshowdown.com/';
async function listReplays(user){ const r=await fetch(API+'search.json?user='+encodeURIComponent(user)); return await r.json(); }
async function fetchLog(id){ const r=await fetch(API+id+'.log'); return await r.text(); }
function analyze(text,user){
  const g=parseLog(text,user);
  if(g.mySix.length<4||g.foeSix.length<4) return {g, err:'incomplete'};
  const my6=g.mySix.map(autoMon).filter(Boolean), foe6=g.foeSix.map(autoMon).filter(Boolean);
  const r=bring4(my6,foe6);
  // did my actual bring match OLME's rec? (by set overlap)
  const rec=new Set(r.bring.map(x=>x.toLowerCase()));
  const mine=g.myBrought.map(k=>MONS[k]?MONS[k].name:k);
  const overlap=mine.filter(n=>rec.has(n.toLowerCase())).length;
  return {g, rec:r, mineNames:mine, overlap};
}
/* ===== UI ===== */
const store=JSON.parse(localStorage.getItem('olme_games')||'{}');
function saveStore(){ localStorage.setItem('olme_games', JSON.stringify(store)); }
function pill(w){ return '<span class="pill '+(w?'win':'loss')+'">'+(w?'W':'L')+'</span>'; }
async function run(){
  const user=document.getElementById('user').value.trim()||'willhoop';
  const n=+document.getElementById('count').value||15;
  const st=document.getElementById('status'); st.textContent='Pulling replay list…';
  let list; try{ list=await listReplays(user); }catch(e){ st.textContent='Could not reach replay API (CORS?). '+e.message; return; }
  list=list.slice(0,n);
  const tbody=document.getElementById('rows'); tbody.innerHTML='';
  let wins=0,total=0,diffs=0; window.META=[]; const threat={};
  for(let i=0;i<list.length;i++){
    const rep=list[i]; st.textContent='Analyzing '+(i+1)+'/'+list.length+' …';
    let text = store[rep.id];
    if(!text){ try{ text=await fetchLog(rep.id); store[rep.id]=text; }catch(e){ continue; } }
    const a=analyze(text,user); if(a.err)continue;
    total++; if(a.g.won)wins++;
    window.META.push(a.g.foeSix); a.g.foeSix.forEach(k=>{threat[k]=(threat[k]||0)+1;});
    const diff = a.overlap<4; if(diff)diffs++;
    const foe=a.g.foeName||rep.players.find(p=>p.toLowerCase()!==user.toLowerCase())||'?';
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+pill(a.g.won)+'</td>'
      +'<td class="foe">'+foe+'</td>'
      +'<td>'+(rep.rating||'')+'</td>'
      +'<td class="wx">'+a.rec.weather+'</td>'
      +'<td class="mine">'+a.mineNames.join(', ')+'</td>'
      +'<td class="rec'+(diff?' diff':'')+'">'+a.rec.bring.join(', ')+'</td>'
      +'<td class="note">'+(a.rec.notes[0]||'')+'</td>';
    tr.onclick=()=>showDetail(a,foe);
    tbody.appendChild(tr);
    saveStore();
  }
  document.getElementById('kpis').innerHTML =
    kpi(total,'games analyzed')+kpi(wins+'-'+(total-wins),'record')+kpi(total?Math.round(100*wins/total)+'%':'—','win rate')+kpi(diffs,'brings CHOMP would change');
  const tt=Object.entries(threat).sort((a,b)=>b[1]-a[1]).slice(0,14);
  document.getElementById('threats').innerHTML='<h3>Meta threats you actually face</h3>'+tt.map(([k,c])=>'<span class="chip">'+(MONS[k]?MONS[k].name:k)+' <b>'+c+'</b></span>').join('');
  document.getElementById('tune').style.display='block';
  st.textContent='Done. Click any row for the matchup breakdown — or tune your team below.';
}
/* ===== flywheel: optimize a team vs YOUR personal meta ===== */
const POOL=['pelipper','politoed','whimsicott','blastoise','archaludon','meowscarada','kingambit','basculegion','greninja','sinistcha','incineroar','garchomp','tsareena','sylveon','gholdengo','talonflame','dragonite','tyranitar','excadrill','rotom-wash','farigiraf','grimmsnarl','mamoswine','glimmora'];
function metaScore(keys){ const t6=keys.map(autoMon).filter(Boolean); if(t6.length<4||!window.META||!window.META.length)return null;
  let tot=0,n=0; for(const foe of window.META){ const f6=foe.map(autoMon).filter(Boolean); if(f6.length<4)continue; tot+=bring4(t6,f6).score; n++; } return n?tot/n:null; }
function tuneTeam(){
  const raw=document.getElementById('teamin').value.trim();
  const keys = raw? raw.split(/[\n,]+/).map(s=>norm(s.trim())).filter(Boolean).slice(0,6) : ['pelipper','whimsicott','blastoise','archaludon','meowscarada','kingambit'];
  const base=metaScore(keys);
  const out=document.getElementById('tuneout');
  if(base===null){ out.innerHTML='<div class="drow">Pull your replays first — the optimizer scores against the teams you actually faced.</div>'; return; }
  const sugg=[];
  for(let i=0;i<keys.length;i++)for(const c of POOL){ if(keys.includes(c))continue; const t=keys.slice(); t[i]=c; if(new Set(t).size!==t.length)continue; const s=metaScore(t); if(s!==null&&s>base+0.1)sugg.push({out:keys[i],in:c,gain:+(s-base).toFixed(2),score:+s.toFixed(2)}); }
  sugg.sort((a,b)=>b.score-a.score);
  const nm=k=>MONS[k]?MONS[k].name:k;
  let h='<div class="drow"><b>Your six vs YOUR meta:</b> '+base.toFixed(2)+' &nbsp;('+window.META.length+' opponent teams)</div>';
  h+='<div class="drow"><b>Team:</b> '+keys.map(nm).join(', ')+'</div>';
  if(sugg.length){ h+='<h4 style="margin:12px 0 6px">Swaps that raise your score vs the teams you face</h4>';
    sugg.slice(0,6).forEach(x=>{h+='<div class="drow">− '+nm(x.out)+' &nbsp;→&nbsp; <span class="rec">+ '+nm(x.in)+'</span> &nbsp;<span style="color:#2E9E6B">('+x.score+', +'+x.gain+')</span></div>';}); }
  else h+='<div class="drow">No single swap improves you — your six already fits your meta.</div>';
  out.innerHTML=h;
}
function kpi(v,l){ return '<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>'; }
function showDetail(a,foe){
  const d=document.getElementById('detail');
  d.style.display='block';
  let h='<h3>vs '+foe+' — '+(a.g.won?'WIN':'LOSS')+'</h3>';
  h+='<div class="drow"><b>OLME lead:</b> '+a.rec.lead.join(' + ')+'  ·  <b>weather:</b> '+a.rec.weather+'  ·  <b>score:</b> '+a.rec.score+'</div>';
  h+='<div class="drow"><b>You brought:</b> '+a.mineNames.join(', ')+'</div>';
  h+='<div class="drow"><b>OLME bring:</b> <span class="rec">'+a.rec.bring.join(', ')+'</span></div>';
  if(a.rec.notes.length)h+='<div class="drow warn">▲ '+a.rec.notes.join('<br>▲ ')+'</div>';
  h+='<table class="mini"><tr><th>Their mon</th><th>Your answer</th><th>KO%</th></tr>';
  a.rec.detail.forEach(x=>{h+='<tr><td>'+x.foe+'</td><td>'+x.answer+'</td><td>'+x.myHit+'%</td></tr>';});
  h+='</table>';
  d.innerHTML=h;
  d.scrollIntoView({behavior:'smooth'});
}
window.addEventListener('DOMContentLoaded',()=>{ document.getElementById('go').onclick=run; const tb=document.getElementById('tunebtn'); if(tb)tb.onclick=tuneTeam; });
'''

HTML=f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CHOMP — Replay Analyzer</title>
<style>
 :root{{--nav:#1E2761;--ice:#CADCFC;--gold:#E8B33D;--ink:#0f1320;--pap:#f4f7fc;--slate:#5B6B8C;--green:#2E9E6B;--red:#D2544B;}}
 *{{box-sizing:border-box}} body{{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:var(--pap);color:#1b2440}}
 header{{background:var(--nav);color:#fff;padding:22px 26px}}
 header h1{{margin:0;font-size:22px;letter-spacing:.5px}} header p{{margin:4px 0 0;color:#aebbdd;font-size:13px}}
 .bar{{display:flex;gap:10px;align-items:center;padding:16px 26px;flex-wrap:wrap;background:#fff;border-bottom:1px solid #e2e8f4}}
 .bar input{{padding:9px 11px;border:1px solid #cdd7ea;border-radius:8px;font-size:14px}}
 .bar input#user{{width:150px}} .bar input#count{{width:70px}}
 .bar button{{padding:9px 18px;background:var(--nav);color:#fff;border:0;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px}}
 .bar button:hover{{background:#28337a}}
 #status{{color:var(--slate);font-size:13px;margin-left:6px}}
 #kpis{{display:flex;gap:14px;padding:18px 26px;flex-wrap:wrap}}
 .kpi{{background:#fff;border:1px solid #e2e8f4;border-radius:12px;padding:14px 20px;min-width:130px;box-shadow:0 4px 14px rgba(30,39,97,.05)}}
 .kpi b{{display:block;font-size:30px;color:var(--nav)}} .kpi span{{font-size:12px;color:var(--slate)}}
 .wrap{{padding:0 26px 40px}}
 table.main{{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(30,39,97,.05)}}
 table.main th{{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--slate);padding:11px 12px;border-bottom:2px solid #eef2fa}}
 table.main td{{padding:10px 12px;font-size:13px;border-bottom:1px solid #f0f3fa;vertical-align:top}}
 table.main tr:hover{{background:#f7faff;cursor:pointer}}
 .pill{{display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:6px;color:#fff;font-weight:800;font-size:12px}}
 .pill.win{{background:var(--green)}} .pill.loss{{background:var(--red)}}
 .foe{{font-weight:600}} .wx{{color:#3b7ad0}} .mine{{color:#55607a}} .rec{{font-weight:600;color:var(--nav)}}
 .rec.diff{{color:#b5810f}} .note{{color:#b5810f;font-size:12px}}
 #detail{{display:none;background:#fff;border:1px solid #e2e8f4;border-radius:12px;padding:18px 22px;margin-top:18px}}
 #detail h3{{margin:0 0 10px}} .drow{{margin:5px 0;font-size:14px}} .drow.warn{{color:#b5810f}}
 #threats h3,#tune h3{{margin:0 0 10px;font-size:17px;color:var(--nav)}}
 .chip{{display:inline-block;background:#eef3fc;border:1px solid #d8e1f0;border-radius:20px;padding:6px 12px;margin:0 8px 8px 0;font-size:13px;color:#33415c}}
 .chip b{{color:var(--nav)}}
 table.mini{{margin-top:12px;border-collapse:collapse}} table.mini th,table.mini td{{padding:5px 14px 5px 0;font-size:13px;text-align:left;border-bottom:1px solid #f0f3fa}}
</style></head><body>
<header><h1>CHOMP — Replay Analyzer</h1><p>Champions Head-to-head Optimizer for Matchup Prediction · auto-pulls your Showdown replays and scores each one.</p></header>
<div class="bar">
 <label style="font-size:13px;color:#55607a">User</label><input id="user" value="willhoop">
 <label style="font-size:13px;color:#55607a">Games</label><input id="count" type="number" value="15" min="1" max="50">
 <button id="go">Pull &amp; analyze</button>
 <span id="status">Enter your username and click Pull.</span>
</div>
<div id="kpis"></div>
<div class="wrap">
 <table class="main"><thead><tr><th></th><th>Opponent</th><th>Rating</th><th>Weather</th><th>You brought</th><th>CHOMP would bring</th><th>Flag</th></tr></thead><tbody id="rows"></tbody></table>
 <div id="detail"></div>
 <div id="threats" style="margin-top:26px"></div>
 <div id="tune" style="display:none;margin-top:22px;background:#fff;border:1px solid #e2e8f4;border-radius:12px;padding:18px 22px">
   <h3 style="margin:0 0 4px">Team tune-up — optimize against the teams you actually face</h3>
   <p style="margin:0 0 12px;color:#5B6B8C;font-size:13px">Paste six species (one per line), or leave blank for your rain six. CHOMP scores it against every opponent team from your pulled replays and suggests swaps.</p>
   <textarea id="teamin" placeholder="Pelipper&#10;Whimsicott&#10;Blastoise&#10;Archaludon&#10;Meowscarada&#10;Kingambit" style="width:100%;max-width:520px;height:120px;padding:10px;border:1px solid #cdd7ea;border-radius:8px;font-family:inherit;font-size:13px"></textarea><br>
   <button id="tunebtn" style="margin-top:10px;padding:9px 18px;background:#1E2761;color:#fff;border:0;border-radius:8px;font-weight:700;cursor:pointer">Score &amp; suggest swaps</button>
   <div id="tuneout" style="margin-top:14px"></div>
 </div>
</div>
<script>
const MONS={MONS},MOVES={MOVES},C={C};
{engine}
{APP}
</script></body></html>'''

open('/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/app/chomp-replay-app.html','w',encoding='utf8').write(HTML)
print('wrote chomp-replay-app.html', len(HTML),'bytes')
