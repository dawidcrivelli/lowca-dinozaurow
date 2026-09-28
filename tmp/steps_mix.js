/* Zrzuty tła 3D w trybie 🏞️ (rysunki 2D na scenie 3D): kilka walk lądowych (losowy teren i układ), wybrzeże, urwiska, jedna walka 🧊.
   użycie: node tmp/steps_mix.js && node tmp/shot.js tmp/steps_mix.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const FIGHTS = [['tyrannosaurus-rex', 'triceratops-horridus', 'mix'], ['albertosaurus-sarcophagus', 'stegosaurus-stenops', 'mix'],
  ['velociraptor-mongoliensis', 'protoceratops-andrewsi', 'mix'], ['allosaurus-fragilis', 'ankylosaurus-magniventris', 'mix'],
  ['spinosaurus-aegyptiacus', 'parasaurolophus-walkeri', 'mix'], ['smilodon-fatalis', 'mosasaurus-hoffmannii', 'mix'],
  ['mammuthus-primigenius', 'quetzalcoatlus-northropi', 'mix'], ['tyrannosaurus-rex', 'triceratops-horridus', '3d']];
const state = (a, b, view) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view } }))});location.reload()`;
const steps = FIGHTS.flatMap(([a, b, v], i) => [{ js: state(a, b, v), wait: 1200 }, { js: 'btnArena.click()', wait: 300 },
  { js: "document.querySelector('[data-fight]').click()", wait: 3000, shot: `mix_${i}_${a.split('-')[0]}.png`, h: 620 }]);
fs.writeFileSync(path.join(__dirname, 'steps_mix.json'), JSON.stringify(steps, null, 1));
