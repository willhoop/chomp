/* Operation Ladder — replay auto-ingest + usage model (backlog #2).
 * Pulls the user's replays, extracts each game, grows the threat DB.
 * Tested against the live Showdown replay API. */
const https = require('https');
const USER = 'willhoop';
const MAX = 30;

const get = (url) => new Promise((res, rej) => {
  https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }).on('error', rej);
});
const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');

function parseLog(text, me) {
  const L = text.split('\n');
  const names = {}, poke={p1:[],p2:[]}, brought={p1:new Set(),p2:new Set()}, lead={p1:[],p2:[]};
  let winner=null, myRating=null;
  for (const line of L) {
    let m;
    if (m=line.match(/^\|player\|(p[12])\|([^|]*)/)) names[m[1]]=m[2];
    else if (m=line.match(/^\|poke\|(p[12])\|([^,|]+)/)) poke[m[1]].push(norm(m[2]));
    else if (m=line.match(/^\|switch\|(p[12])[ab]: [^|]*\|([^,|]+)/)) {
      const sp=norm(m[2]); brought[m[1]].add(sp);
      if (lead[m[1]].length<2 && !lead[m[1]].includes(sp)) lead[m[1]].push(sp);
    }
    else if (m=line.match(/^\|win\|(.*)/)) winner=m[1].trim();
  }
  const mine = names.p1===me ? 'p1' : (names.p2===me ? 'p2' : null);
  if (!mine) return null;
  const foe = mine==='p1'?'p2':'p1';
  return {
    opponent: names[foe],
    result: winner ? (winner===me ? 'W' : 'L') : '?',
    theirSix: [...new Set(poke[foe])],
    theirBrought: [...brought[foe]],
    theirLead: lead[foe],
    myBrought: [...brought[mine]],
  };
}

(async () => {
  const list = JSON.parse(await get(`https://replay.pokemonshowdown.com/search.json?user=${USER}`));
  const games = list.slice(0, MAX);
  console.log(`Pulled ${list.length} replays; analyzing ${games.length}...\n`);

  const rows = [];
  for (const g of games) {
    try {
      const log = await get(`https://replay.pokemonshowdown.com/${g.id}.log`);
      const p = parseLog(log, USER);
      if (p && p.theirSix.length>=4) rows.push({id:g.id, ...p});
    } catch(e) {}
  }
  console.log(`Parsed ${rows.length} games from ${USER}'s perspective.\n`);

  // ---- usage model: how often each species is on a team, brought, led ----
  const stat = {};
  const bump = (sp,k)=>{ (stat[sp]=stat[sp]||{seen:0,brought:0,led:0,faced_W:0,faced_L:0})[k]++; };
  for (const r of rows) {
    for (const sp of r.theirSix)     bump(sp,'seen');
    for (const sp of r.theirBrought) bump(sp,'brought');
    for (const sp of r.theirLead)    bump(sp,'led');
    for (const sp of r.theirBrought) stat[sp][r.result==='W'?'faced_W':'faced_L']++;
  }
  const N = rows.length;
  const table = Object.entries(stat)
    .map(([sp,s])=>({sp, teamRate:s.seen/N, bringRate:s.brought/s.seen, leadRate:s.led/s.seen,
                     faced:s.brought, winVs: s.faced_W+s.faced_L ? s.faced_W/(s.faced_W+s.faced_L) : null}))
    .sort((a,b)=>b.teamRate-a.teamRate);

  console.log('YOUR LADDER — most-faced opponent Pokémon (from your real replays)');
  console.log('species          on-team  bring%  lead%   yourWin%  (n)');
  for (const t of table.slice(0,15)) {
    console.log(
      t.sp.padEnd(16),
      (100*t.teamRate).toFixed(0).padStart(5)+'%',
      (100*t.bringRate).toFixed(0).padStart(6)+'%',
      (100*t.leadRate).toFixed(0).padStart(5)+'%',
      (t.winVs==null?'  -  ':(100*t.winVs).toFixed(0).padStart(6)+'%'),
      ('('+t.faced+')').padStart(6));
  }
  const wins = rows.filter(r=>r.result==='W').length;
  console.log(`\nRecord in sample: ${wins}-${rows.length-wins}`);
})();
