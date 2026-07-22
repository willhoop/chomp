// Matchup guide generator — effectiveness computed from the VERIFIED chart, not hand-typed.
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
function e1(a,d){return (rows[a]&&rows[a][d]!==undefined)?rows[a][d]:1;}
function eff(mt,dt){let e=1;for(const t of dt)e*=e1(mt,t);return e;}
// FLOOD THE ZONE damaging moves: [mon, move, type, STAB?]
const TEAM=[
 ['Pelipper','Hydro Pump','Water',true],['Pelipper','Hurricane','Flying',true],
 ['Swampert','Wave Crash','Water',true],['Swampert','High Horsepower','Ground',true],['Swampert','Ice Punch','Ice',false],
 ['Sneasler','Close Combat','Fighting',true],['Sneasler','Dire Claw','Poison',true],
 ['Meowscarada','Flower Trick','Grass',true],['Meowscarada','Knock Off','Dark',true],['Meowscarada','Sucker Punch','Dark',true],
 ['Rotom-Wash','Hydro Pump','Water',true],['Rotom-Wash','Thunderbolt','Electric',true],
 ['Sinistcha','Matcha Gotcha','Grass',true],['Sinistcha','Hex','Ghost',true]];
// top-30 threats: name -> types (verified)
const T={
 Garchomp:['Dragon','Ground'],Sinistcha:['Grass','Ghost'],Basculegion:['Water','Ghost'],Whimsicott:['Grass','Fairy'],
 Kingambit:['Dark','Steel'],'Charizard-Y':['Fire','Flying'],Incineroar:['Fire','Dark'],Gholdengo:['Steel','Ghost'],
 'Staraptor-M':['Fighting','Flying'],Tsareena:['Grass'],Farigiraf:['Normal','Psychic'],Torkoal:['Fire'],
 Pelipper:['Water','Flying'],Archaludon:['Steel','Dragon'],Sneasler:['Fighting','Poison'],Metagross:['Steel','Psychic'],
 Dragonite:['Dragon','Flying'],Talonflame:['Fire','Flying'],Sylveon:['Fairy'],Tyranitar:['Rock','Dark'],
 'Rotom-Wash':['Electric','Water'],Mawile:['Steel','Fairy'],Mudsdale:['Ground'],'Ninetales-A':['Ice','Fairy'],
 Excadrill:['Ground','Steel'],Sableye:['Dark','Ghost'],Gengar:['Ghost','Poison'],Milotic:['Water'],
 Annihilape:['Fighting','Ghost'],Maushold:['Normal']};
console.log('| Threat | Types | Best answer (computed ×eff) |');
console.log('|---|---|---|');
for(const [name,ty] of Object.entries(T)){
 let best=null;
 for(const [mon,mv,mt,stab] of TEAM){
  const e=eff(mt,ty); const power=e*(stab?1.5:1); // rank by eff then STAB
  if(!best||power>best.power||(power===best.power&&e>best.e)) best={mon,mv,mt,e,stab,power};
 }
 // also list all >=2x answers
 const se=TEAM.filter(([m,mv,mt])=>eff(mt,ty)>=2).map(([m,mv,mt])=>m+' '+mv+' '+eff(mt,ty)+'x');
 const label = best.e===0? (best.mon+' '+best.mv+' — but check: some immunities') : (best.mon+' '+best.mv+' ('+best.e+'x)');
 const seTxt = se.length? se.join('; ') : 'no super-effective — best neutral: '+best.mon+' '+best.mv;
 console.log('| '+name+' | '+ty.join('/')+' | '+seTxt+' |');
}
