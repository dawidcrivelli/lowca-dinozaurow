/* Zrzut każdego wyglądu każdego terenu (tryb 🏞️): Arena3D.start z wymuszonym terenem i numerem wyglądu.
   użycie: node tmp/steps_biomes.js && node tmp/shot.js tmp/steps_biomes.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const LOOKS = { plains: 3, forest: 4, swamp: 3, coast: 4, deep: 5, cliffs: 4, desert: 2, volcano: 2, tundra: 2 };
const PAIR = { coast: ['smilodon-fatalis', 'mosasaurus-hoffmannii'], deep: ['mosasaurus-hoffmannii', 'otodus-megalodon'], cliffs: ['quetzalcoatlus-northropi', 'tyrannosaurus-rex'],
  tundra: ['mammuthus-primigenius', 'smilodon-fatalis'] };
const DEF = ['tyrannosaurus-rex', 'triceratops-horridus'];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [DEF[0]]: { t: 1 }, [DEF[1]]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: 'mix' } }))});location.reload()`;
const steps = [{ js: state, wait: 1200 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 2500 }];
for (const [key, n] of Object.entries(LOOKS)) for (let i = 0; i < n; i++) {
  const [a, b] = PAIR[key] || DEF, by = id => `SPECIES.find(s => s.id === '${id}')`;
  steps.push({ js: `(() => { const B = newBattle(${by(a)}, ${by(b)}); B.arena = ARENAS.${key}; Arena3D.start(document.querySelector('.fight-grid'), B, 'bill', ${i}); })()`,
    wait: 2200, shot: `biome_${key}_${i}.png`, h: 620 });
}
fs.writeFileSync(path.join(__dirname, 'steps_biomes.json'), JSON.stringify(steps, null, 1));
