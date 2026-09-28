/* Zrzuty wytłoczonych rysunków (tryb 🏞️) z bliska: stoją, unik (obrót), leżą po KO.
   użycie: node tmp/steps_slab.js && node tmp/shot.js tmp/steps_slab.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const [a, b] = ['tyrannosaurus-rex', 'triceratops-horridus'];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'auto', view: 'mix' } }))});location.reload()`;
const steps = [{ js: state, wait: 1200 }, { js: 'btnArena.click()', wait: 300 },
  { js: "document.querySelector('[data-fight]').click()", wait: 2500, shot: 'slab_0.png', h: 620 },
  { wait: 1500, shot: 'slab_1.png', h: 620 }, { wait: 12000, shot: 'slab_ko.png', h: 620 }];
fs.writeFileSync(path.join(__dirname, 'steps_slab.json'), JSON.stringify(steps, null, 1));
