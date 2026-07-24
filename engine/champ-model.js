// ===================================================================
// CHAMP-MODEL  —  real damage-calc matchup engine for Champions Reg M-B
// Built on the validated stat + damage formulas from champions-damage-lab.
// Models: real KO ranges, weather (boost + chip + war), items, abilities,
// speed with modifiers, priority. Plus a bring/lead optimizer and a
// self-iteration hill-climber over a set library.
// ===================================================================
const fs = require('fs');

// ---- load validated data (MONS / MOVES / C) from the damage lab ----
const lab = fs.readFileSync(__dirname + '/champions-damage-lab.html', 'utf8');
function grabObj(name){
  const re = new RegExp('(?:const |,|\\s)' + name + '=\\{');
  const mm = re.exec(lab);
  if (!mm) throw new Error('no ' + name);
  let j = mm.index + mm[0].length - 1, depth = 0, start = j;
  for (; j < lab.length; j++){
    const ch = lab[j];
    if (ch === '{') depth++;
    else if (ch === '}'){ depth--; if (depth === 0){ j++; break; } }
  }
  return eval('(' + lab.slice(start, j) + ')');
}
const MONS = grabObj('MONS');     // key -> {name, t:[types], bs:{hp,atk,def,spa,spd,spe}}
const MOVES = grabObj('MOVES');   // key -> {n, t, c:Physical/Special/Status, bp}
const C = grabObj('C');           // type chart C[atk][def]
// ============ REGULATION CONFIG — EDIT THIS ONE BLOCK EACH NEW REG ============
const FORMAT = {
  name: '[Gen 9] Champions VGC 2026 Reg M-B',
  pikalyticsSlug: 'battledataregmbs3',      // usage-scrape slug
  level: 50,
  sp: { budget: 66, cap: 32, autoIV: 31 },  // Champions SP stat system
  megasAllowed: true, oneMegaPerBattle: true, teraAllowed: false,
  bannedItems: ['choice specs','choice band','assault vest','safety goggles'],
  legalChoiceItems: ['choice scarf'],
  bannedMons: [],                            // restricted legends etc. (add per Reg)
  regulation: 'reg-mb',                      // key into the legality oracle below
};
const isBannedItem = it => FORMAT.bannedItems.includes((it||'').toLowerCase());

/* ── Move legality oracle ──────────────────────────────────────────────────
   Source: HoopaDex champions-learnsets.json (github.com/willhoop/hoopadex),
   compacted to one bitmask per species by build/build_legal_moves.py.

   Before this existed, a synthesized opponent set could pick ANY move of the
   right category. That is how Charizard was once given Eruption, which it
   cannot learn in Champions.

   SAFETY RULE, and it matters: this oracle answers "is this pair recorded as
   legal", not "is this pair illegal". Five moves in the legal pool (spore,
   softboiled, milkdrink, powershift, struggle) are absent from the export.
   Anything the export does not know about is treated as ALLOWED, never as
   banned. A missing datum must not silently delete a real move.            */
let LEGAL = (typeof CHOMP_LEGAL !== 'undefined') ? CHOMP_LEGAL : null;
if (!LEGAL && typeof require !== 'undefined') {
  try { LEGAL = require('../data/champions-legal-moves.json'); } catch (e) { LEGAL = null; }
}
let _legalIdx = null;
function _moveKey(n){ return (n||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function _b64bytes(s){
  if (typeof Buffer !== 'undefined') return Buffer.from(s,'base64');
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
/** True unless the export positively says this species cannot learn this move. */
function canLearn(sid, moveName, reg){
  if (!LEGAL) return true;                                   // no data loaded
  if (!_legalIdx){ _legalIdx = new Map(); LEGAL.moves.forEach((m,i)=>_legalIdx.set(m,i)); }
  const mi = _legalIdx.get(_moveKey(moveName));
  if (mi === undefined) return true;                         // move unknown -> allow
  const table = LEGAL.regs[reg || FORMAT.regulation];
  if (!table) return true;                                   // regulation unknown -> allow
  const mask = table[sid];
  if (!mask) return true;                                    // species unknown -> allow
  const bytes = _b64bytes(mask);
  return (bytes[mi >> 3] & (1 << (mi & 7))) !== 0;
}
const legalityLoaded = () => !!LEGAL;
const isBannedMon  = k  => FORMAT.bannedMons.includes(k);
// =============================================================================
const byName = {}; for (const m of Object.values(MONS)) byName[m.name.toLowerCase()] = m;
const mvByName = {}; for (const k in MOVES) mvByName[MOVES[k].n.toLowerCase()] = MOVES[k];

// ---- validated math ----
const pokeRound = x => (x % 1 > 0.5) ? Math.ceil(x) : Math.floor(x);
const statL50 = (b, sp, n) => Math.floor((Math.floor((2*b+31)*50/100)+5+(+sp)) * n);
const hpL50   = (b, sp)    => Math.floor((2*b+31)*50/100)+50+10+(+sp);
const eff = (mt, dt) => dt.reduce((e,t)=> e * C[mt][t], 1);

// ---- aux tables ----
const NAT = { // nature -> [boostStat, dropStat]
  adamant:['atk','spa'], jolly:['spe','spa'], modest:['spa','atk'], timid:['spe','atk'],
  bold:['def','atk'], calm:['spd','atk'], careful:['spd','spa'], impish:['def','spa'],
  relaxed:['def','spe'], sassy:['spd','spe'], quiet:['spa','spe'], brave:['atk','spe'],
  naive:['spe','spd'], hasty:['spe','def'], lonely:['atk','def'], mild:['spa','def'],
  rash:['spa','spd'], gentle:['spd','def'], hardy:[], docile:[], serious:[], bashful:[], quirky:[]
};
const natMul = (nat, stat) => { const n=NAT[(nat||'').toLowerCase()]||[]; if(n[0]===stat)return 1.1; if(n[1]===stat)return 0.9; return 1; };

const PRIORITY = { 'fake out':3,'first impression':2,'aqua jet':1,'bullet punch':1,'sucker punch':1,
  'shadow sneak':1,'extreme speed':2,'quick attack':1,'ice shard':1,'mach punch':1,'vacuum wave':1,
  'grassy glide':1,'jet punch':1,'thunderclap':1,'accelerock':1 };
const SPREAD = new Set(['rock slide','heat wave','hyper voice','earthquake','water spout','eruption',
  'discharge','dazzling gleam','blizzard','muddy water','make it rain','snarl','icy wind','electroweb',
  'bulldoze','glacial lance','sludge wave','lava plume','surf','breaking swipe','struggle bug','parabolic charge']);
const WEATHER_SETTER = { drizzle:'rain', 'sand stream':'sand', drought:'sun', 'snow warning':'snow',
  'orichalcum pulse':'sun' };
const SPEED_ABIL = { 'swift swim':'rain', chlorophyll:'sun', 'sand rush':'sand', 'slush rush':'snow' };
// items
const TYPEBOOST = { 'mystic water':'Water','charcoal':'Fire','magnet':'Electric','miracle seed':'Grass',
  'never-melt ice':'Ice','black belt':'Fighting','poison barb':'Poison','soft sand':'Ground',
  'sharp beak':'Flying','twisted spoon':'Psychic','silver powder':'Bug','hard stone':'Rock',
  'spell tag':'Ghost','dragon fang':'Dragon','black glasses':'Dark','metal coat':'Steel','fairy feather':'Fairy',
  'sea incense':'Water','odd incense':'Psychic','rock incense':'Rock','wave incense':'Water' };
// ---- full field / terrain / ability / item modifier tables ----
const TERRAIN_BOOST={electric:'Electric',grassy:'Grass',psychic:'Psychic'};
const TERRAIN_SETTER={'electric surge':'electric','grassy surge':'grassy','psychic surge':'psychic','misty surge':'misty'};
const SOUND=new Set(['hyper voice','boomburst','overdrive','snarl','bug buzz','disarming voice','sparkling aria','clanging scales','echoed voice','round','relic song','uproar','clangorous soul','torch song','alluring voice','psychic noise']);
const PUNCH=new Set(['ice punch','fire punch','thunder punch','drain punch','mach punch','bullet punch','close combat','power-up punch','sucker punch','shadow punch','dizzy punch','comet punch','dynamic punch','focus punch','hammer arm','meteor mash','plasma fists','rage fist','jet punch','double iron bash']);
const SLICING=new Set(['leaf blade','sacred sword','psycho cut','night slash','x-scissor','cross poison','air slash','slash','fury cutter','solar blade','bitter blade','ceaseless edge','stone axe','population bomb','aqua cutter','kowtow cleave','razor shell','behemoth blade','aerial ace']);
const CONTACT_EXCLUDE=new Set(['earthquake','rock slide','heat wave','hyper voice','flamethrower','thunderbolt','ice beam','surf','water spout','eruption','make it rain','shadow ball','dazzling gleam','moonblast','draco meteor','electro shot','sludge bomb','dark pulse','aura sphere','air slash','discharge','bug buzz','snarl','muddy water','earth power','power gem','energy ball','giga drain','scald','hydro pump','weather ball','last respects','matcha gotcha','pollen puff']);
// setup moves -> approximate post-setup offense multiplier (for snowball valuation)
const SETUP={'swords dance':2,'nasty plot':2,'calm mind':2,'shell smash':2,'belly drum':2.5,'victory dance':2,'geomancy':2,
  'dragon dance':1.5,'quiver dance':1.5,'bulk up':1.5,'coil':1.5,'work up':1.5,'clangorous soul':1.5,'no retreat':1.5,
  'tidy up':1.5,'take heart':1.5,'howl':1.4,'hone claws':1.4,'growth':1.5};
// moves NEVER to auto-pick for a synthesized set (recharge / charge / self-KO gimmicks nobody runs)
const BAD_AUTO=new Set(['hyper beam','giga impact','blast burn','hydro cannon','frenzy plant','roar of time','rock wrecker','prismatic laser','eternabeam','meteor assault','self-destruct','selfdestruct','explosion','misty explosion','solar beam','solar blade','sky attack','skull bash','razor wind','freeze shock','ice burn','bounce','fly','dig','dive','phantom force','shadow force','hyperspace hole','synchronoise']);
function airborne(m){ return m.types.includes('Flying')||m.ability==='levitate'||m.item==='air balloon'; }
function grounded(m,ctx){ if(ctx&&ctx.gravity)return true; return !airborne(m); }
// type-immunity abilities: moveType -> ability that grants immunity
const IMMUNE_ABIL={ Ground:['levitate','earth eater'], Electric:['volt absorb','lightning rod','motor drive'], Water:['water absorb','storm drain','dry skin'], Fire:['flash fire','well-baked body'], Grass:['sap sipper'] };

// ---- parse a pokepaste block into a set ----
function toKey(name){
  let n=(name||'').toLowerCase().trim().replace(/[’'.]/g,'').replace(/\s+/g,'-');
  n=n.replace(/-mega(-[xy])?$/,'').replace(/-gmax$/,'');
  const alias={'floette':'floette-eternal'};
  return alias[n]||n;
}
function findMon(name){
  const k=toKey(name); if(MONS[k])return {key:k,mon:MONS[k]};
  const lc=(name||'').toLowerCase().replace(/-mega(-[xy])?$/,'').trim();
  if(byName[lc])return {key:lc.replace(/\s+/g,'-'),mon:byName[lc]};
  const base=lc.split(/[- ]/)[0]; if(byName[base])return {key:base,mon:byName[base]};
  return null;
}
function parsePaste(text){
  const sets=[];
  for(const block of text.split(/\n\s*\n/)){
    const lines=block.trim().split('\n').map(l=>l.trim()).filter(Boolean);
    if(!lines.length)continue;
    let head=lines[0]; if(/^(===|\[)/.test(head))continue;
    let item=null; const at=head.split(' @ '); if(at.length>1){item=at[1].trim();}
    let namePart=at[0].trim();
    const par=namePart.match(/\(([^)]+)\)\s*$/);
    let species=namePart;
    if(par && !['M','F'].includes(par[1])) species=par[1];
    species=species.replace(/\s*\((M|F)\)\s*$/,'').trim();
    const set={species,item,ability:null,nature:null,level:50,sp:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},moves:[],teraOff:true};
    for(let i=1;i<lines.length;i++){
      const L=lines[i];
      if(/^Ability:/i.test(L))set.ability=L.split(':')[1].trim();
      else if(/^Level:/i.test(L))set.level=+L.split(':')[1].trim()||50;
      else if(/Nature/i.test(L))set.nature=L.replace(/Nature/i,'').trim();
      else if(/^EVs:/i.test(L)){ L.split(':')[1].split('/').forEach(p=>{const m=p.trim().match(/(\d+)\s*(\w+)/);if(m){const map={hp:'hp',atk:'atk',def:'def',spa:'spa',spd:'spd',spe:'spe'};const k=map[m[2].toLowerCase()];if(k)set.sp[k]=+m[1];}}); }
      else if(/^-\s/.test(L))set.moves.push(L.replace(/^-\s*/,'').split('/')[0].trim());
    }
    const fm=findMon(species); if(!fm)continue;
    set.key=fm.key; set.base=fm.mon;
    sets.push(set);
  }
  return sets;
}

// ---- build a battle-ready mon (stats + typing + flags) ----
/* Mega formes, keyed by the STONE.
 *
 * This used to be a two-entry hardcoded table (staraptor, clefable) that swapped TYPES only. Every
 * other mega was therefore computed with its BASE form's stats: Mega Charizard Y attacked with
 * Charizard's 109 Special Attack instead of 159, and Mega Tyranitar defended with 110 Defence
 * instead of 150 - silently, on some of the most common Pokemon in the format (Charizard-Mega-Y
 * alone appears in ~900 stored sets).
 *
 * data/mega-formes.json now carries the real base stats, typing and ability for all 95 stones,
 * sourced from Showdown's own pokedex (the data the server runs this format on). It is keyed by the
 * stone because the stone decides the forme - Charizardite X and Y are different Pokemon.
 *
 * The declared ability still wins if the set names one, so a paste that says "Ability: Drought" is
 * respected; the table only fills in what the set did not state. */
let MEGA_FORMES = null;
function megaFormes(){
  if(MEGA_FORMES) return MEGA_FORMES;
  MEGA_FORMES = {};
  try{
    const j = JSON.parse(fs.readFileSync(__dirname + '/../data/mega-formes.json','utf8'));
    MEGA_FORMES = j.by_item || {};
  }catch(e){ /* absent -> behave as before */ }
  return MEGA_FORMES;
}
function buildMon(set){
  const mon=set.base, nat=set.nature||'Hardy';
  let item=(set.item||'').toLowerCase(); if(isBannedItem(item)){ set.itemIllegal=item; item=''; }   // [FIX C6] enforce format item legality
  let ab=(set.ability||'').toLowerCase();
  let types=mon.t.slice();
  let bs=mon.bs;
  /* Holding the stone is not the same as having used it. Before it megas, the Pokemon has its BASE
     stats, base typing and base ability - Charizard is Blaze with 109 Special Attack until the turn
     it becomes Drought with 159. We model it as already megad because in practice a mega happens on
     turn one (it is free and there is no reason to wait), so it is the state that holds for almost
     the whole battle. Pass premega:true on the set to get the un-evolved numbers instead. */
  const holdsStone = item.includes('ite') && !item.includes('white') || /-mega/i.test(set.species);
  const isMega = holdsStone && !set.premega;
  const mf = isMega ? megaFormes()[item.replace(/[^a-z0-9]/g,'')] : null;
  if(mf){
    bs    = mf.bs || bs;                       // the mega's REAL base stats
    types = (mf.t && mf.t.length) ? mf.t.slice() : types;
    if(!ab && mf.ab) ab = mf.ab.toLowerCase(); // fill the ability only if the set did not name one
  }
  const st={
    hp: hpL50(bs.hp,set.sp.hp),
    atk: statL50(bs.atk,set.sp.atk,natMul(nat,'atk')),
    def: statL50(bs.def,set.sp.def,natMul(nat,'def')),
    spa: statL50(bs.spa,set.sp.spa,natMul(nat,'spa')),
    spd: statL50(bs.spd,set.sp.spd,natMul(nat,'spd')),
    spe: statL50(bs.spe,set.sp.spe,natMul(nat,'spe')),
  };
  return { key:set.key, name:(mf&&mf.name)||mon.name, types, st, item, ability:ab, moves:set.moves.slice(),
           sets:set, isMega, holdsStone, megaForme:(mf&&mf.forme)||null, setsWeather: WEATHER_SETTER[ab]||null };
}

// ---- speed with modifiers ----
function speed(m, ctx){
  let s=m.st.spe;
  if(m.item==='choice scarf')s=Math.floor(s*1.5);
  if(SPEED_ABIL[m.ability]&&ctx.weather===SPEED_ABIL[m.ability])s*=2;
  if(ctx.tailwind&&ctx.tailwind.has(m.side))s*=2;
  if(m.ability==='speed boost'&&ctx.turn>0)s=Math.floor(s*stageBoostMul(Math.min(6,ctx.turn)));
  return s;
}
function stageBoostMul(st){return st>=0?(2+st)/2:2/(2-st);}

// ---- best-move damage of attacker vs defender (returns max % of def HP) ----
function bestDamage(att, def, ctx){
  let best=null;
  for(const mvName of att.moves){
    const mv=mvByName[(mvName||'').toLowerCase()]; if(!mv||mv.c==='Status'||!mv.bp)continue;
    const dmg=moveDamage(att,def,mv,ctx);
    if(!best || dmg.pKO>best.pKO || (dmg.pKO===best.pKO && dmg.pct>best.pct)) best=dmg;   // [FIX C4] rank by P(KO) then damage
  }
  return best || {pct:0,minPct:0,pKO:0,move:null};
}
function moveDamage(att,def,mv,ctx){
  const phys=mv.c==='Physical';
  let A = phys? att.st.atk : att.st.spa;
  let D = phys? def.st.def : def.st.spd;
  // [FIX C1] ability-based immunities (Levitate / Volt Absorb / Water Absorb / Flash Fire / Sap Sipper) + Ground vs airborne
  const _imm=IMMUNE_ABIL[mv.t]; if(_imm && _imm.includes(def.ability)) return {pct:0,minPct:0,pKO:0,move:mv.n};
  if(mv.t==='Ground' && airborne(def) && !ctx.gravity && (mv.n||'').toLowerCase()!=='thousand arrows') return {pct:0,minPct:0,pKO:0,move:mv.n};
  // [FIX C2] Intimidate now actually fires — from the defending mon's ability (was dead ctx flag)
  if(phys && (def.ability==='intimidate')) A=Math.floor(A*stageBoostMul(-1));
  /* Stat stages. stageBoostMul already existed but was only reachable via Speed Boost and
     Intimidate, so a calculator that has a "setup / sweeper" role in its own taxonomy could not
     represent +2 from Swords Dance, Nasty Plot or Calm Mind - the single most important thing a
     sweeper does. ctx.boosts applies to the ATTACKER, ctx.dboosts to the DEFENDER, both as stage
     numbers in [-6,+6], e.g. {atk:2} or {spd:1}. A critical hit ignores the defender's positive
     defensive stages and the attacker's negative offensive ones, as in game. */
  const _clamp=v=>Math.max(-6,Math.min(6,+v||0));
  const aSt=_clamp((ctx.boosts||{})[phys?'atk':'spa']);
  const dSt=_clamp((ctx.dboosts||{})[phys?'def':'spd']);
  if(aSt) A=Math.floor(A*stageBoostMul(ctx.crit? Math.max(0,aSt) : aSt));
  if(dSt) D=Math.floor(D*stageBoostMul(ctx.crit? Math.min(0,dSt) : dSt));
  const e=eff(mv.t, def.types); if(e===0)return {pct:0,minPct:0,pKO:0,move:mv.n};
  // STAB
  let stab=1; if(att.types.includes(mv.t)) stab = att.ability==='adaptability'?2:1.5;
  if(att.ability==='protean') stab = 1.5; // protean guarantees STAB on any move
  // weather
  let wx=1;
  if(ctx.weather==='rain'){ if(mv.t==='Water')wx=1.5; if(mv.t==='Fire')wx=0.5; }
  if(ctx.weather==='sun'){ if(mv.t==='Fire')wx=1.5; if(mv.t==='Water')wx=0.5; }
  const nm=(mv.n||'').toLowerCase();
  // terrain (grounded attacker boosts its type; grassy halves EQ; misty halves Dragon)
  if(ctx.terrain && grounded(att,ctx) && TERRAIN_BOOST[ctx.terrain]===mv.t) wx*=1.3;
  if(ctx.terrain==='grassy' && grounded(def,ctx) && (nm==='earthquake'||nm==='bulldoze'||nm==='magnitude')) wx*=0.5;
  if(ctx.terrain==='misty' && grounded(def,ctx) && mv.t==='Dragon') wx*=0.5;
  if(ctx.weather==='heavyrain' && mv.t==='Fire') return {pct:0,minPct:0,move:mv.n};
  if(ctx.weather==='harshsun' && mv.t==='Water') return {pct:0,minPct:0,move:mv.n};
  // combined final modifier (abilities, items, screens, doubles support)
  let M=1; const ab=att.ability, db=def.ability;
  if(ab==='mega launcher' && /pulse|aura sphere/.test(nm)) M*=1.5;
  if(ab==='technician' && mv.bp<=60) M*=1.5;
  if(ab==='tough claws' && !CONTACT_EXCLUDE.has(nm)) M*=1.3;
  if(ab==='iron fist' && PUNCH.has(nm)) M*=1.2;
  if(ab==='reckless' && /wood hammer|brave bird|flare blitz|head smash|wild charge|double-edge|take down|high jump kick|jump kick|light of ruin|head charge|volt tackle/.test(nm)) M*=1.2;
  if(ab==='sharpness' && SLICING.has(nm)) M*=1.5;
  if(ab==='punk rock' && SOUND.has(nm)) M*=1.3;
  if(ab==='water bubble' && mv.t==='Water') M*=2;
  if(ab==='transistor' && mv.t==='Electric') M*=1.3;
  if((ab==='dragons maw'||ab==="dragon's maw") && mv.t==='Dragon') M*=1.5;
  if(ab==='rocky payload' && mv.t==='Rock') M*=1.5;
  if((ab==='steelworker'||ab==='steely spirit') && mv.t==='Steel') M*=1.5;
  if(ab==='sand force' && ctx.weather==='sand' && ['Rock','Ground','Steel'].includes(mv.t)) M*=1.3;
  if(ab==='analytic' && ctx.movesLast) M*=1.3;
  if(ab==='tinted lens' && e<1) M*=2;
  if(ab==='neuroforce' && e>1) M*=1.25;
  if((db==='multiscale'||db==='shadow shield') && ctx.defFullHP) M*=0.5;
  if((db==='filter'||db==='solid rock'||db==='prism armor') && e>1) M*=0.75;
  if(db==='thick fat' && (mv.t==='Fire'||mv.t==='Ice')) M*=0.5;
  if(db==='heatproof' && mv.t==='Fire') M*=0.5;
  if(db==='ice scales' && !phys) M*=0.5;
  if(db==='fur coat' && phys) M*=0.5;
  if(db==='fluffy'){ if(!CONTACT_EXCLUDE.has(nm) && mv.t!=='Fire') M*=0.5; if(mv.t==='Fire') M*=2; }
  if(db==='punk rock' && SOUND.has(nm)) M*=0.5;
  if(db==='dry skin' && mv.t==='Fire') M*=1.25;
  // items
  let lo=false, choice=1;
  if(att.item==='life orb') lo=true;
  if(att.item==='expert belt' && e>1) M*=1.2;
  if(att.item==='wise glasses' && !phys) M*=1.1;
  if(att.item==='muscle band' && phys) M*=1.1;
  if(att.item==='punching glove' && PUNCH.has(nm)) M*=1.1;
  if(TYPEBOOST[att.item]===mv.t) M*=1.2;
  // Reg M-B item pool: no Choice Specs / Choice Band / Assault Vest (Choice Scarf is the only legal Choice item, handled in speed())
  // screens (0.5 single / 2732-4096 doubles; ignored on crit)
  if(ctx.screens && !ctx.crit){ const dbl=ctx.doubles?2732/4096:0.5;
    if((ctx.screens==='reflect'||ctx.screens==='auroraveil') && phys) M*=dbl;
    if((ctx.screens==='lightscreen'||ctx.screens==='auroraveil') && !phys) M*=dbl; }
  // doubles support
  if(ctx.helpingHand) M*=1.5;
  if(ctx.battery && !phys) M*=1.3;
  if(ctx.powerSpot) M*=1.3;
  if(ctx.flowerGift && phys && (ctx.weather==='sun'||ctx.weather==='harshsun')) M*=1.5;
  if(ctx.friendGuard) M*=0.75;
  if(ctx.weather==='snow' && def.types.includes('Ice') && phys) M*=1/1.5;
  if(ctx.attackerBurned && phys && att.ability!=='guts') M*=0.5;   // burn halves physical (activates inside the turn simulator)
  const spread = SPREAD.has(nm) && ctx.spread!==false;
  const crit = ctx.crit?1.5:1;
  let d=Math.floor(Math.floor(22*mv.bp*A/D)/50)+2;
  if(spread)d=pokeRound(d*0.75);
  if(wx!==1)d=pokeRound(d*wx);
  if(crit!==1)d=pokeRound(d*crit);
  const roll=r=>{let x=Math.floor(d*r/100);if(stab!==1)x=pokeRound(x*stab);x=Math.floor(x*e);if(lo)x=pokeRound(x*5324/4096);if(choice!==1)x=pokeRound(x*choice);if(M!==1)x=pokeRound(x*M);return x;};
  // [FIX C4] full 16-roll damage distribution -> P(KO) instead of a single max-roll "KO%"
  let koRolls=0, dmgMax=0, dmgMin=1e9; const HP=def.st.hp;
  for(let r=85;r<=100;r++){ const x=roll(r); if(x>dmgMax)dmgMax=x; if(x<dmgMin)dmgMin=x; if(x>=HP)koRolls++; }
  const acc=(mv.acc&&mv.acc>0&&mv.acc<=100)?mv.acc/100:1;   // accuracy hook (not in current data -> 1)
  const pKO=(koRolls/16)*acc;
  return {pct:100*dmgMax/HP, minPct:100*dmgMin/HP, pKO, move:mv.n};
}

// ---- weather resolution for a matchup (who ends up setting) ----
function resolveWeather(myMons, foeMons){
  const mine=myMons.filter(m=>m.setsWeather), foe=foeMons.filter(m=>m.setsWeather);
  if(!mine.length && !foe.length) return {weather:null, owner:null, contested:false};
  if(mine.length && foe.length){
    // both sides can set -> contested weather war (you can flip it): neutral for scoring
    const all=[...mine.map(m=>({m,s:'me'})),...foe.map(m=>({m,s:'foe'}))].sort((a,b)=>(b.m.isMega?1:0)-(a.m.isMega?1:0)||a.m.st.spe-b.m.st.spe);
    return {weather:all[0].m.setsWeather, owner:all[0].s, contested:true};
  }
  const arr=mine.length?mine:foe, side=mine.length?'me':'foe';
  arr.sort((a,b)=>(b.isMega?1:0)-(a.isMega?1:0)||a.st.spe-b.st.spe);
  return {weather:arr[0].setsWeather, owner:side, contested:false};
}
function sandExposed(m){ return !m.types.some(t=>['Rock','Ground','Steel'].includes(t)); }

// ---- score one of my mons vs the foe six (KO-trade based) ----
function monVsFoe(me, foe, ctx){
  const myFast = speed({...me,side:'me'},{...ctx,tailwind:ctx.tw})>=speed({...foe,side:'foe'},{...ctx,tailwind:ctx.tw});
  const myHit = bestDamage({...me,side:'me'}, {...foe,side:'foe'}, {...ctx,defFullHP:true});
  const foeHit= bestDamage({...foe,side:'foe'}, {...me,side:'me'}, {...ctx,defFullHP:true});
  let s=0;
  const myKO=myHit.pKO||0, foeKO=foeHit.pKO||0;   // [FIX C4] probabilities, not max-roll
  // do I KO / 2HKO?
  if(myKO>=0.99)s+=3; else if(myKO>=0.5)s+=2.2; else if(myHit.pct>=50)s+=1.2; else if(myHit.pct>=33)s+=0.4; else s-=0.5;
  // do they KO me?
  if(foeKO>=0.99)s-= myFast?1.0:2.2; else if(foeKO>=0.5)s-=(myFast?0.7:1.5); else if(foeHit.pct>=50)s-=0.6;
  // speed edge on a likely KO
  if(myKO>=0.5 && myFast)s+=1.0;
  // setup-sweeper valuation (single-ply blind spot): reward mons that snowball
  const setupMv=me.moves.map(m=>SETUP[(m||'').toLowerCase()]).filter(Boolean);
  if(setupMv.length && myHit.pct<100){
    const boosted=myHit.pct*Math.max(...setupMv);
    // can it realistically get the boost off? faster, or bulky enough to survive, or Speed Boost, or Protect/Sub
    const mvlc=me.moves.map(x=>(x||'').toLowerCase());
    const canSetup = myFast || foeHit.pct<65 || me.ability==='speed boost' || mvlc.includes('protect') || mvlc.includes('substitute');
    if(boosted>=100 && canSetup) s += (me.ability==='speed boost'?1.6:1.1);
    else if(boosted>=100) s += 0.4;
  }
  return {s, myHit, foeHit, myFast, setup:setupMv.length>0};
}

// ---- team (my 4) vs foe (6) ----
function teamVs(my4, foe6, opts={}){
  const w=resolveWeather(my4, foe6);
  // contested weather war -> neutral for damage boosts (you can flip it with your own setter)
  const boostWx = w.contested ? null : w.weather;
  const ctx={weather:boostWx, tw:opts.tw||{has:()=>false}, turn:0, spread:true};
  const detail=[]; let total=0;
  for(const foe of foe6){
    let best=-99, who=null, br=null;
    for(const me of my4){ const r=monVsFoe(me,foe,ctx); if(r.s>best){best=r.s;who=me;br=r;} }
    total+=best; if(best<0)total-=0.6;
    detail.push({foe:foe.name, answer:who.name, s:+best.toFixed(2), myHit:br?+br.myHit.pct.toFixed(0):0});
  }
  // weather chip liability (only their weather; halved if you brought a setter to contest it)
  const notes=[];
  if(w.weather==='sand' && w.owner==='foe'){
    const exp=my4.filter(sandExposed);
    if(exp.length){ const pen=(w.contested?0.6:0.75)*exp.length; total-=pen;
      notes.push(exp.length+' mon(s) chipped by their sand'+(w.contested?' (sand re-sets — Steels safer)':'')+': '+exp.map(m=>m.name).join(', ')); }
  }
  if(w.weather==='sun' && w.owner==='foe' && !w.contested){
    const waters=my4.filter(m=>m.moves.some(mv=>{const x=mvByName[(mv||'').toLowerCase()];return x&&x.t==='Water';}));
    if(waters.length){ total-=0.5*waters.length; notes.push('Water attackers halved by their sun (no rain setter in this 4)'); }
  }
  // speed control presence
  const hasTW=my4.some(m=>m.moves.map(x=>x.toLowerCase()).includes('tailwind')||m.ability==='prankster');
  if(!hasTW){ total-=1.0; notes.push('No speed control in this 4'); }
  return {score:+total.toFixed(2), detail, notes, weather:w};
}

// ---- bring 4 of 6 + lead ----
function combos4(a){const r=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)for(let k=j+1;k<a.length;k++)for(let l=k+1;l<a.length;l++)r.push([a[i],a[j],a[k],a[l]]);return r;}
function bring4(mine6, foe6, opts={}){
  const subs=combos4(mine6).map(sub=>({sub, r:teamVs(sub,foe6,opts)})).sort((a,b)=>b.r.score-a.r.score);
  const best=subs[0];
  // lead = pair with the most turn-1 pressure (KO threats + speed), not safe average
  const w=best.r.weather;
  const ctx={weather:w.contested?null:w.weather, tw:opts.tw||{has:()=>false}, turn:0, spread:true};
  const pressure={};
  for(const me of best.sub){ let p=0; for(const foe of foe6){ const r=monVsFoe(me,foe,ctx); if(r.myHit.pct>=100)p+=r.myFast?2:1.2; else if(r.myHit.pct>=50)p+=0.4; } pressure[me.name]=p; }
  const lead=[...best.sub].sort((a,b)=>pressure[b.name]-pressure[a.name]).slice(0,2).map(m=>m.name);
  return {bring:best.sub.map(m=>m.name), lead, score:best.r.score, detail:best.r.detail, notes:best.r.notes,
          weather:w.weather?(w.weather+(w.contested?' (contested)':' ('+w.owner+')')):'none', subs:subs.slice(0,3).map(s=>({t:s.sub.map(m=>m.name),score:s.r.score}))};
}

module.exports = { MONS, MOVES, C, FORMAT, parsePaste, buildMon, teamVs, bring4, moveDamage, bestDamage, resolveWeather, findMon, mvByName, canLearn, legalityLoaded, BAD_AUTO };
