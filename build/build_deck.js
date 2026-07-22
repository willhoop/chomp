// Builds docs/CHOMP-deck-plain-english.pptx — the layman's-terms deck.
// Rule: the final slide always links the white paper.
const pptxgen = require('pptxgenjs');
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';                    // 13.3 x 7.5
const W = 13.3, H = 7.5;
const NAVY='1E2761', INK='16203F', ICE='CADCFC', WHITE='FFFFFF', GOLD='E8B33D',
      SLATE='5B6B8C', PAPER='F4F7FC', GREEN='2E9E6B', RED='D2544B';
const HF='Cambria', BF='Calibri';
const sh=()=>({type:'outer',color:'8090B0',blur:8,offset:3,angle:90,opacity:0.28});
const bg=(s,c)=>{s.background={color:c};};
const kicker=(s,t)=>s.addText(t.toUpperCase(),{x:0.62,y:0.28,w:12,h:0.3,fontFace:BF,fontSize:12,bold:true,color:GOLD,charSpacing:2});
const title=(s,t)=>s.addText(t,{x:0.6,y:0.42,w:12.1,h:0.95,fontFace:HF,fontSize:33,bold:true,color:NAVY});

/* 1 TITLE */
let s=p.addSlide(); bg(s,NAVY);
s.addText('CHOMP',{x:0.85,y:2.0,w:11.6,h:1.5,fontFace:HF,fontSize:96,bold:true,color:WHITE});
s.addText('A coach for the 30 seconds before a Pokémon match',{x:0.9,y:3.45,w:11.5,h:0.7,fontFace:HF,fontSize:28,color:ICE});
s.addText('How a computer picks a better team than a gut feeling — explained in plain English',
  {x:0.95,y:4.25,w:11,h:0.5,fontFace:BF,fontSize:16,italic:true,color:'A8B6DC'});
s.addShape(p.ShapeType.roundRect,{x:0.95,y:5.4,w:2.6,h:0.62,rectRadius:0.31,fill:{color:GOLD}});
s.addText('PLAIN ENGLISH',{x:0.95,y:5.4,w:2.6,h:0.62,align:'center',valign:'middle',fontFace:BF,fontSize:12,bold:true,color:INK,charSpacing:1.5});
s.addText('willhoop · July 2026',{x:3.8,y:5.55,w:6,h:0.4,fontFace:BF,fontSize:13,color:'A8B6DC'});

/* 2 THE DECISION */
s=p.addSlide(); bg(s,PAPER); kicker(s,'The moment'); title(s,'Every match starts with one rushed decision');
s.addText('You build a team of six Pokémon. But you only take four into the match, and only two start on the field. You choose — while a clock runs down.',
  {x:0.62,y:1.45,w:7.1,h:1.2,fontFace:BF,fontSize:16,color:'33415C',lineSpacingMultiple:1.15});
const stg=[['6','you own','C7D4EC',3.0,3.0],['4','you take','8AA6D8',2.5,2.45],['2','you start',NAVY,2.0,1.9]];
let fx=0.95;
stg.forEach((v,i)=>{
  const y=3.35-(v[4]-1.9)/2;
  s.addShape(p.ShapeType.roundRect,{x:fx,y:y,w:v[3],h:v[4],rectRadius:0.14,fill:{color:v[2]},shadow:sh()});
  s.addText(v[0],{x:fx,y:y+0.15,w:v[3],h:v[4]-0.95,align:'center',valign:'middle',fontFace:HF,fontSize:[78,68,58][i],bold:true,color:i===2?WHITE:INK});
  s.addText(v[1],{x:fx,y:y+v[4]-0.72,w:v[3],h:0.5,align:'center',fontFace:BF,fontSize:15,bold:true,color:i===2?ICE:INK});
  fx+=v[3]+0.55;
  if(i<2)s.addText('▶',{x:fx-0.5,y:3.5,w:0.5,h:0.9,align:'center',valign:'middle',fontFace:BF,fontSize:22,color:SLATE});
});
s.addText('Pick well and you are ahead before the first move. Pick badly and the match is decided already.',
  {x:0.62,y:6.55,w:12,h:0.5,fontFace:BF,fontSize:14,italic:true,color:SLATE});

/* 3 WHY HARD */
s=p.addSlide(); bg(s,PAPER); kicker(s,'Why it is hard'); title(s,'More possible teams than atoms you can count');
s.addShape(p.ShapeType.roundRect,{x:0.62,y:1.55,w:5.4,h:4.6,rectRadius:0.16,fill:{color:NAVY},shadow:sh()});
s.addText('10',{x:0.95,y:2.35,w:3,h:1.5,fontFace:HF,fontSize:118,bold:true,color:WHITE});
s.addText('139',{x:3.2,y:2.4,w:2.5,h:0.8,fontFace:HF,fontSize:42,bold:true,color:GOLD});
s.addText('possible team combinations',{x:0.95,y:4.05,w:4.5,h:0.5,fontFace:BF,fontSize:17,color:ICE});
s.addText('That is more than chess, Go, poker, StarCraft and Dota put together.',
  {x:0.95,y:4.7,w:4.6,h:1.0,fontFace:BF,fontSize:15,italic:true,color:'A8B6DC',lineSpacingMultiple:1.1});
[['You cannot see their cards','You never learn the opponent’s exact moves or items until they use them.'],
 ['You both move at once','There is no "best" answer — only better odds against what they might do.'],
 ['The clock is running','About 30 seconds. No time to work it out by hand.']].forEach((c,i)=>{
  const y=1.6+i*1.53;
  s.addShape(p.ShapeType.roundRect,{x:6.35,y:y,w:6.35,h:1.35,rectRadius:0.12,fill:{color:WHITE},line:{color:'D8E1F0',width:1},shadow:sh()});
  s.addShape(p.ShapeType.ellipse,{x:6.6,y:y+0.42,w:0.5,h:0.5,fill:{color:ICE}});
  s.addText(c[0],{x:7.3,y:y+0.2,w:5.2,h:0.5,fontFace:BF,fontSize:17,bold:true,color:NAVY});
  s.addText(c[1],{x:7.3,y:y+0.66,w:5.2,h:0.6,fontFace:BF,fontSize:13,color:'44506B'});
});

/* 4 GUT vs MATH */
s=p.addSlide(); bg(s,PAPER); kicker(s,'The idea'); title(s,'Replace the gut feeling with arithmetic');
s.addShape(p.ShapeType.roundRect,{x:0.62,y:1.6,w:5.9,h:4.5,rectRadius:0.16,fill:{color:WHITE},line:{color:'E3B9B6',width:1.5},shadow:sh()});
s.addText('How players decide today',{x:0.95,y:1.85,w:5,h:0.5,fontFace:HF,fontSize:21,bold:true,color:RED});
['"Fire beats grass, so I’ll bring this one."','Rules of thumb learned from experience.','No time to check whether an attack actually knocks the target out.','Easy to miss that the weather is quietly draining your team.']
 .forEach((t,i)=>s.addText('•  '+t,{x:0.95,y:2.5+i*0.78,w:5.3,h:0.7,fontFace:BF,fontSize:14,color:'44506B'}));
s.addShape(p.ShapeType.roundRect,{x:6.8,y:1.6,w:5.9,h:4.5,rectRadius:0.16,fill:{color:NAVY},shadow:sh()});
s.addText('How CHOMP decides',{x:7.1,y:1.85,w:5,h:0.5,fontFace:HF,fontSize:21,bold:true,color:WHITE});
[['Does this attack actually knock it out?','It runs the real damage formula from the game.'],
 ['How likely is it?','Damage varies. It counts all 16 possible outcomes.'],
 ['What is the weather doing?','Sandstorm quietly chips your team every turn.'],
 ['Who moves first?','Speed, items and abilities all change the order.']].forEach((r,i)=>{
  const y=2.5+i*0.88;
  s.addShape(p.ShapeType.ellipse,{x:7.1,y:y,w:0.4,h:0.4,fill:{color:GOLD}});
  s.addText(r[0],{x:7.7,y:y-0.06,w:4.9,h:0.4,fontFace:BF,fontSize:14.5,bold:true,color:WHITE});
  s.addText(r[1],{x:7.7,y:y+0.32,w:4.9,h:0.4,fontFace:BF,fontSize:12,color:'AEBBDD'});
});

/* 5 HOW IT WORKS */
s=p.addSlide(); bg(s,PAPER); kicker(s,'How it works'); title(s,'Four steps, finished before you can read them');
[['1','Read both teams','It sees your six and their six the moment the match opens.'],
 ['2','Guess their gear','It assumes the moves and items most players actually use.'],
 ['3','Do the maths','It calculates every attack against every target — 24 matchups.'],
 ['4','Give the answer','It names the four to take and the two to start.']].forEach((st,i)=>{
  const x=0.62+i*3.1, wc=2.95;
  s.addShape(p.ShapeType.roundRect,{x:x,y:1.8,w:wc,h:3.9,rectRadius:0.14,fill:{color:i===3?NAVY:WHITE},line:{color:'D8E1F0',width:1},shadow:sh()});
  s.addShape(p.ShapeType.ellipse,{x:x+wc/2-0.45,y:2.15,w:0.9,h:0.9,fill:{color:i===3?GOLD:ICE}});
  s.addText(st[0],{x:x+wc/2-0.45,y:2.15,w:0.9,h:0.9,align:'center',valign:'middle',fontFace:HF,fontSize:34,bold:true,color:INK});
  s.addText(st[1],{x:x+0.2,y:3.25,w:wc-0.4,h:0.6,align:'center',fontFace:BF,fontSize:16.5,bold:true,color:i===3?WHITE:NAVY});
  s.addText(st[2],{x:x+0.25,y:3.9,w:wc-0.5,h:1.6,align:'center',fontFace:BF,fontSize:13,color:i===3?'C6D2F0':'44506B',lineSpacingMultiple:1.12});
  if(i<3)s.addText('▶',{x:x+wc+0.02,y:3.4,w:0.35,h:0.6,align:'center',valign:'middle',fontFace:BF,fontSize:18,color:SLATE});
});
s.addText('The whole calculation finishes in under a twentieth of a second, on your own computer.',
  {x:0.62,y:6.15,w:12,h:0.5,fontFace:BF,fontSize:15,italic:true,bold:true,color:NAVY});

/* 6 PROOF */
s=p.addSlide(); bg(s,PAPER); kicker(s,'Does it work'); title(s,'A real mistake it now catches');
s.addShape(p.ShapeType.roundRect,{x:0.62,y:1.55,w:5.85,h:2.35,rectRadius:0.14,fill:{color:WHITE},line:{color:'E3B9B6',width:1.5},shadow:sh()});
s.addText('Before',{x:0.9,y:1.72,w:3,h:0.4,fontFace:BF,fontSize:14,bold:true,color:RED});
s.addText('Lost twice to sandstorm teams',{x:0.9,y:2.08,w:5.3,h:0.5,fontFace:HF,fontSize:19,bold:true,color:NAVY});
s.addText('A sandstorm damages most Pokémon every single turn. Two of mine were immune to it — and I left both on the bench, twice.',
  {x:0.9,y:2.62,w:5.3,h:1.1,fontFace:BF,fontSize:13.5,color:'44506B',lineSpacingMultiple:1.15});
s.addShape(p.ShapeType.roundRect,{x:0.62,y:4.15,w:5.85,h:2.35,rectRadius:0.14,fill:{color:WHITE},line:{color:'B6DCC7',width:1.5},shadow:sh()});
s.addText('After',{x:0.9,y:4.32,w:3,h:0.4,fontFace:BF,fontSize:14,bold:true,color:GREEN});
s.addText('It names them, and says why',{x:0.9,y:4.68,w:5.3,h:0.5,fontFace:HF,fontSize:19,bold:true,color:NAVY});
s.addText('“Bring Archaludon and Kingambit — 2 of your team are being worn down by their sandstorm.”',
  {x:0.9,y:5.22,w:5.3,h:1.1,fontFace:BF,fontSize:13.5,italic:true,color:'44506B',lineSpacingMultiple:1.15});
[['1323','highest ranking reached',NAVY],['154%','damage it calculates exactly, not guesses',GOLD],['0.05s','to answer',SLATE]].forEach((v,i)=>{
  const y=1.55+i*1.68;
  s.addShape(p.ShapeType.roundRect,{x:6.8,y:y,w:5.9,h:1.55,rectRadius:0.12,fill:{color:v[2]},shadow:sh()});
  s.addText(v[0],{x:7.05,y:y+0.15,w:2.6,h:1.2,valign:'middle',fontFace:HF,fontSize:44,bold:true,color:WHITE});
  s.addText(v[1],{x:9.5,y:y,w:3.0,h:1.55,valign:'middle',fontFace:BF,fontSize:13,color:'EAF0FF'});
});

/* 7 HONEST LIMITS */
s=p.addSlide(); bg(s,PAPER); kicker(s,'Being honest'); title(s,'What it does not do');
[['It does not play the match','It advises on the opening choice only. After that, you play.'],
 ['It guesses the opponent’s gear','Those guesses come from what most players use. Someone unusual can beat the guess.'],
 ['It looks one move ahead','It does not yet follow a match several turns forward.'],
 ['It always gives the same answer','A sharp opponent could learn the pattern over time.']].forEach((r,i)=>{
  const x=0.62+(i%2)*6.25, y=1.7+Math.floor(i/2)*2.35;
  s.addShape(p.ShapeType.roundRect,{x:x,y:y,w:5.95,h:2.05,rectRadius:0.13,fill:{color:WHITE},line:{color:'D8E1F0',width:1},shadow:sh()});
  s.addShape(p.ShapeType.ellipse,{x:x+0.35,y:y+0.42,w:0.6,h:0.6,fill:{color:NAVY}});
  s.addText(String(i+1),{x:x+0.35,y:y+0.42,w:0.6,h:0.6,align:'center',valign:'middle',fontFace:HF,fontSize:22,bold:true,color:GOLD});
  s.addText(r[0],{x:x+1.15,y:y+0.35,w:4.6,h:0.5,fontFace:BF,fontSize:16.5,bold:true,color:NAVY});
  s.addText(r[1],{x:x+1.15,y:y+0.9,w:4.6,h:1.0,fontFace:BF,fontSize:13,color:'44506B',lineSpacingMultiple:1.12});
});

/* 8 BOTTOM LINE + WHITE PAPER LINK (required) */
s=p.addSlide(); bg(s,NAVY);
s.addText('THE BOTTOM LINE',{x:0.9,y:1.35,w:8,h:0.4,fontFace:BF,fontSize:13,bold:true,color:GOLD,charSpacing:2});
s.addText('A rushed guess,\nturned into arithmetic.',{x:0.9,y:1.95,w:11.5,h:1.9,fontFace:HF,fontSize:42,bold:true,color:WHITE,lineSpacingMultiple:1.05});
s.addText('It reads both teams, does the real damage maths, and tells you which four to bring and which two to start — before the clock matters.',
  {x:0.95,y:4.15,w:10.8,h:1.0,fontFace:BF,fontSize:17,color:ICE,lineSpacingMultiple:1.2});
s.addShape(p.ShapeType.roundRect,{x:0.95,y:5.45,w:11.4,h:1.15,rectRadius:0.12,fill:{color:'2A3570'}});
s.addText('Full technical detail and the mathematics:',{x:1.25,y:5.6,w:10.8,h:0.4,fontFace:BF,fontSize:13,color:'AEBBDD'});
s.addText('CHOMP White Paper — docs/CHOMP-whitepaper.md',
  {x:1.25,y:5.98,w:10.8,h:0.45,fontFace:BF,fontSize:15,bold:true,color:GOLD,
   hyperlink:{url:'https://github.com/', tooltip:'CHOMP white paper'}});

p.writeFile({fileName:'/sessions/kind-fervent-sagan/mnt/Projects/Pokemon/CHOMP/docs/CHOMP-deck-plain-english.pptx'})
 .then(f=>console.log('wrote',f));
