/* CHOMP — move-legality oracle tests.  Run: node tests/test-legality.js
 * Pins the fix of 2026-07-22: synthesized opponent sets must respect the
 * Champions learnset, and an unknown datum must never delete a legal move. */
const M = require('../engine/champ-model.js');
let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); }
                        else   { fail++; console.log('FAIL  ' + m); } };

chk(M.legalityLoaded(), 'legality export loads');

// The defect this exists for.
chk(M.canLearn('charizard', 'Eruption')     === false, 'Charizard cannot learn Eruption');
chk(M.canLearn('charizard', 'Hydro Cannon') === false, 'Charizard cannot learn Hydro Cannon');
chk(M.canLearn('charizard', 'Flamethrower') === true,  'Charizard can learn Flamethrower');
chk(M.canLearn('charizard', 'Heat Wave')    === true,  'Charizard can learn Heat Wave');

// Champions has its own flat legal-move list. It is NOT the Scarlet/Violet list.
// Garchomp gets Surf here; asserting otherwise from SV knowledge was wrong.
chk(M.canLearn('garchomp', 'Surf')      === true,  'Garchomp learns Surf (Champions legal-move list)');
chk(M.canLearn('garchomp', 'Waterfall') === false, 'Garchomp does not learn Waterfall');

// Forms resolve.
chk(M.canLearn('rotom-wash', 'Hydro Pump')      === true, 'form key rotom-wash resolves');
chk(M.canLearn('ninetales-alola', 'Aurora Veil')=== true, 'form key ninetales-alola resolves');

// SAFETY: absent data means UNKNOWN, never ILLEGAL. These five moves are in the
// legal pool but missing from the export; filtering them out would be a bug.
['Spore','Softboiled','Milk Drink','Power Shift','Struggle'].forEach(mv =>
  chk(M.canLearn('charizard', mv) === true, 'unknown move "' + mv + '" is allowed, not filtered'));
chk(M.canLearn('not-a-real-species', 'Eruption') === true, 'unknown species is allowed');
chk(M.canLearn('charizard', 'Eruption', 'reg-zz') === true, 'unknown regulation is allowed');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
