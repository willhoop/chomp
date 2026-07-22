import json
d=json.load(open('/tmp/champ-learn.json'))
def can(mon,mv):
    m=d.get(mv.replace(' ','').replace('-','').replace("'",'').lower())
    return bool(m) and any(e['sid']==mon and 'reg-mb' in e.get('legalIn',[]) for e in m['learnedBy'])
# name -> (Display, item, ability, nature, [4 moves])
SETS={
 'charizard':('Charizard','Charizardite Y','Blaze','Timid',['Heat Wave','Solar Beam','Air Slash','Protect']),
 'staraptor':('Staraptor','Staraptite','Intimidate','Jolly',['Brave Bird','Close Combat','Final Gambit','Protect']),
 'farigiraf':('Farigiraf','Sitrus Berry','Armor Tail','Quiet',['Psychic','Hyper Voice','Trick Room','Protect']),
 'torkoal':('Torkoal','Charcoal','Drought','Quiet',['Eruption','Heat Wave','Solar Beam','Protect']),
 'sneasler':('Sneasler','Life Orb','Poison Touch','Jolly',['Close Combat','Dire Claw','Fake Out','U-turn']),
 'metagross':('Metagross','Metagrossite','Clear Body','Jolly',['Meteor Mash','Psychic Fangs','Bullet Punch','Protect']),
 'dragonite':('Dragonite','Dragonitite','Multiscale','Adamant',['Dragon Claw','Ice Punch','Extreme Speed','Protect']),
 'tyranitar':('Tyranitar','Tyranitarite','Sand Stream','Adamant',['Rock Slide','Crunch','Low Kick','Protect']),
 'excadrill':('Excadrill','Excadrilite','Sand Rush','Adamant',['Iron Head','High Horsepower','Rock Slide','Protect']),
 'sableye':('Sableye','Focus Sash','Prankster','Careful',['Will-O-Wisp','Fake Out','Foul Play','Protect']),
 'gengar':('Gengar','Gengarite','Levitate','Timid',['Shadow Ball','Sludge Bomb','Perish Song','Protect']),
 'milotic':('Milotic','Leftovers','Competitive','Modest',['Hydro Pump','Ice Beam','Chilling Water','Protect']),
 'mudsdale':('Mudsdale','Leftovers','Stamina','Adamant',['High Horsepower','Rock Slide','Body Press','Heavy Slam']),
 'ariados':('Ariados','Sitrus Berry','Insomnia','Adamant',['Rage Powder','Sticky Web','First Impression','Poison Jab']),
 'blastoise':('Blastoise','Blastoisinite','Mega Launcher','Modest',['Water Spout','Aura Sphere','Dark Pulse','Protect']),
 'dragalge':('Dragalge','Dragalgite','Regenerator','Quiet',['Sludge Bomb','Draco Meteor','Flip Turn','Protect']),
 'eelektross':('Eelektross','Eelektite','Levitate','Adamant',['Wild Charge','Drain Punch','Knock Off','Protect']),
 'scovillain':('Scovillain','Scovillite','Moody','Modest',['Flamethrower','Energy Ball','Rage Powder','Protect']),
 'raichu':('Raichu','Raichunite X','Lightning Rod','Jolly',['Volt Switch','Fake Out','Nuzzle','Protect']),
 'clefable':('Clefable','Clefablite','Magic Bounce','Modest',['Moonblast','Dazzling Gleam','Follow Me','Protect']),
 'gyarados':('Gyarados','Gyaradosite','Intimidate','Adamant',['Waterfall','Crunch','Dragon Dance','Protect']),
 'camerupt':('Camerupt','Cameruptite','Sheer Force','Quiet',['Eruption','Earth Power','Heat Wave','Protect']),
 'glimmora':('Glimmora','Focus Sash','Toxic Debris','Timid',['Power Gem','Sludge Bomb','Earth Power','Protect']),
 'espathra':('Espathra','Focus Sash','Speed Boost','Timid',['Lumina Crash','Calm Mind','Baton Pass','Protect']),
 'alcremie':('Alcremie','Sitrus Berry','Aroma Veil','Bold',['Decorate','Dazzling Gleam','Helping Hand','Protect']),
 'venusaur':('Venusaur','Venusaurite','Chlorophyll','Modest',['Sludge Bomb','Giga Drain','Sleep Powder','Protect']),
 'toxapex':('Toxapex','Leftovers','Regenerator','Calm',['Toxic','Infestation','Baneful Bunker','Recover']),
 'vivillon':('Vivillon','Focus Sash','Compound Eyes','Timid',['Hurricane','Sleep Powder','Bug Buzz','Protect']),
 'mamoswine':('Mamoswine','Life Orb','Thick Fat','Adamant',['Icicle Crash','High Horsepower','Ice Shard','Protect']),
 'aerodactyl':('Aerodactyl','Aerodactylite','Unnerve','Jolly',['Rock Slide','Dual Wingbeat','Tailwind','Protect']),
 'lopunny':('Lopunny','Lopunnite','Scrappy','Jolly',['Close Combat','Fake Out','Ice Punch','Protect']),
 'greninja':('Greninja','Greninjite','Protean','Timid',['Hydro Pump','Dark Pulse','Ice Beam','Protect']),
 'chandelure':('Chandelure','Chandelurite','Flame Body','Modest',['Heat Wave','Shadow Ball','Trick Room','Protect']),
 'crabominable':('Crabominable','Crabominite','Iron Fist','Brave',['Close Combat','Ice Hammer','Rock Slide','Protect']),
 'pyroar':('Pyroar','Pyroarite','Fire Mane','Timid',['Heat Wave','Hyper Voice','Dark Pulse','Protect']),
 'ceruledge':('Ceruledge','Focus Sash','Weak Armor','Adamant',['Bitter Blade','Shadow Sneak','Swords Dance','Protect']),
 'houndstone':('Houndstone','Wide Lens','Sand Rush','Adamant',['Last Respects','Play Rough','Shadow Sneak','Protect']),
 'heliolisk':('Heliolisk','Life Orb','Solar Power','Timid',['Thunderbolt','Weather Ball','Hyper Voice','Protect']),
 'sceptile':('Sceptile','Sceptilite','Lightning Rod','Timid',['Leaf Storm','Dragon Pulse','Giga Drain','Protect']),
 'slowbro':('Slowbro','Slowbronite','Regenerator','Relaxed',['Scald','Psychic','Trick Room','Protect']),
}
lines=[]; bad={}
for name,(disp,item,abil,nat,moves) in SETS.items():
    ill=[mv for mv in moves if not can(name,mv)]
    if ill: bad[name]=ill
    mv='\n'.join('- '+m for m in moves)
    block=f"{disp} @ {item}\\nAbility: {abil}\\n{nat} Nature\\nEVs: 2 HP / 32 Atk / 32 Spe\\n{mv}".replace('\n','\\n')
    lines.append(f'"{name}":"{block}"')
print("=== ILLEGAL (fix these) ===")
for k,v in bad.items(): print(k,v)
print("=== count:",len(SETS),"| clean:",len(SETS)-len(bad),"===")
open('/tmp/setdb_add.txt','w').write(",\n".join(lines))
