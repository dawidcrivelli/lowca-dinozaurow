/* Generuje tmp/steps_3d.json: walki 3D dla par różnych archetypów/terenów + kontrola 2D.
   użycie: node tmp/steps3d.js && node tmp/shot.js tmp/steps_3d.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const PAIRS = [
  ['tyrannosaurus-rex', 'triceratops-horridus', 'auto'], ['velociraptor-mongoliensis', 'stegosaurus-stenops', 'auto'],
  ['argentinosaurus-huinculensis', 'ankylosaurus-magniventris', 'auto'], ['smilodon-fatalis', 'mosasaurus-hoffmannii', 'auto'],
  ['plesiosaurus-dolichodeirus', 'otodus-megalodon', 'auto'], ['mammuthus-primigenius', 'quetzalcoatlus-northropi', 'auto'],
  ['parasaurolophus-walkeri', 'compsognathus-longipes', 'play'],
];
const state = (a, b, mode, view) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode, view } }))});location.reload()`;
const fight = [{ js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 2200 }];
const steps = [{ js: 'localStorage.clear()', wait: 200 }];
for (const [a, b, mode] of PAIRS) {
  const n = a.split('-')[0] + '_' + b.split('-')[0];
  steps.push({ js: state(a, b, mode, '3d'), wait: 1200 }, { js: 'btnArena.click()', wait: 300, shot: `3d_${n}_setup.png`, h: 700 }, fight[1]);
  if (mode === 'play') steps.push({ shot: `3d_${n}_ask.png`, h: 1000 }, { js: "document.querySelector('[data-move=special]').click()", wait: 250, shot: `3d_${n}_move.png`, h: 1000 },
    { js: "document.querySelector('[data-move=guard]')?.click()", wait: 1500 });
  else steps.push({ shot: `3d_${n}_a.png`, h: 1000 }, { wait: 9000, shot: `3d_${n}_end.png`, h: 1100 });
  steps.push({ js: "JSON.stringify([document.querySelectorAll('canvas').length, !!window.THREE])", wait: 50 }, { js: 'modalClose.click()', wait: 200 });
}
steps.push({ js: state('tyrannosaurus-rex', 'triceratops-horridus', 'auto', '2d'), wait: 1200 }, ...fight, { shot: '2d_check.png', h: 1000 },
  { js: "if (document.querySelector('canvas')) throw new Error('canvas in 2D')" });
fs.writeFileSync(path.join(__dirname, 'steps_3d.json'), JSON.stringify(steps, null, 1));
