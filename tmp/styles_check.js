/* Sprawdza wybór stylów ataku: kolejne ciosy T-rexa i triceratopsa w walce automatycznej + dziennik.
   użycie: node tmp/styles_check.js [idA] [idB] */
global.ART = require('../js/artspec.js').ART;
const { SPECIES } = require('../js/species.js'), { newBattle, playRound } = require('../js/battle.js');
const [a = 'tyrannosaurus-rex', b = 'triceratops-horridus'] = process.argv.slice(2), sp = id => SPECIES.find(s => s.id === id);
const B = newBattle(sp(a), sp(b)), seq = {};
while (!B.winner) for (const e of playRound(B)) if (e.att) { (seq[e.att] ||= []).push(e.style); console.log(e.text); }
console.log(seq);
