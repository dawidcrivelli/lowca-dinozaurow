/* Symulacja walk na prawdziwym silniku gry (js/battle.js). Strojenie: zmień TUNE i uruchom.
   użycie: node tmp/sim.js [walk=2000]   (bierze js/species.js, a gdy go brak – tmp/review/species.json) */
const fs = require('fs'), path = require('path');
const { autoBattle, statsOf } = require('../js/battle.js');
const N = +process.argv[2] || 2000;
const SP = fs.existsSync(path.join(__dirname, '../js/species.js')) ? require('../js/species.js').SPECIES
  : require('./review/species.json').map(s => ({ id: s.id, name: s.name_pl, cat: s.category, body: s.body, kg: s.mass_kg,
      weapons: s.weapons, diet: s.diet, loco: s.locomotion, kmh: s.speed_kmh_est, social: s.social }));
const by = Object.fromEntries(SP.map(s => [s.id, s]));
const win = (a, b) => { let w = 0; for (let i = 0; i < N; i++) w += autoBattle(by[a], by[b]).winner.id === a; return Math.round(100 * w / N); };
const PAIRS = [['tyrannosaurus-rex', 'triceratops-horridus'], ['tyrannosaurus-rex', 'ankylosaurus-magniventris'], ['tyrannosaurus-rex', 'spinosaurus-aegyptiacus'],
  ['argentinosaurus-huinculensis', 'tyrannosaurus-rex'], ['mosasaurus-hoffmannii', 'tyrannosaurus-rex'], ['ichthyosaurus-communis', 'tyrannosaurus-rex'],
  ['quetzalcoatlus-northropi', 'tyrannosaurus-rex'], ['mammuthus-primigenius', 'tyrannosaurus-rex'], ['smilodon-fatalis', 'tyrannosaurus-rex'],
  ['compsognathus-longipes', 'tyrannosaurus-rex'], ['velociraptor-mongoliensis', 'protoceratops-andrewsi'], ['deinonychus-antirrhopus', 'tenontosaurus-tilletti'],
  ['velociraptor-mongoliensis', 'compsognathus-longipes'], ['stegosaurus-stenops', 'allosaurus-fragilis'], ['otodus-megalodon', 'livyatan-melvillei'],
  ['mosasaurus-hoffmannii', 'otodus-megalodon'], ['titanoboa-cerrejonensis', 'smilodon-fatalis'], ['mammuthus-primigenius', 'smilodon-fatalis'],
  ['albertosaurus-sarcophagus', 'tyrannosaurus-rex'], ['albertosaurus-sarcophagus', 'triceratops-horridus'], ['albertosaurus-sarcophagus', 'giganotosaurus-carolinii']];
for (const [a, b] of PAIRS) if (by[a] && by[b]) console.log(`${String(win(a, b)).padStart(3)}%  ${by[a].name} vs ${by[b].name}`);
// średni % wygranych w kategorii i wg diety (M mięso, Ry ryby, R rośliny, W wszystko, P plankton) (każdy z każdym, N/20 walk na parę)
const cats = {}, M = Math.max(20, N / 20 | 0);
for (const a of SP) for (const b of SP) if (a !== b) { let w = 0; for (let i = 0; i < M; i++) w += autoBattle(a, b).winner.id === a.id;
  for (const k of [a.cat, 'dieta ' + a.diet]) (cats[k] = cats[k] || []).push(w / M); }
console.log(Object.entries(cats).map(([k, v]) => `${k} ${Math.round(100 * v.reduce((x, y) => x + y) / v.length)}%`).join(' · '));
