/* Pełne walki automatyczne do końca: widok mix (wycinanki) i kontrolnie model; zrzut po zakończeniu.
   użycie: node tmp/pup/auto.js && timeout 240 node tmp/shot.js tmp/pup/auto.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const PAIRS = [['tyrannosaurus-rex', 'triceratops-horridus', 'mix'], ['quetzalcoatlus-northropi', 'mosasaurus-hoffmannii', 'mix'], ['stegosaurus-stenops', 'smilodon-fatalis', '3d']];
const state = (a, b, view) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'auto', view } }))});location.reload()`;
const steps = [];
for (const [a, b, v] of PAIRS) {
  const n = `pup_auto_${v}_${a.split('-')[0]}`;
  steps.push({ js: state(a, b, v), wait: 1200 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 6000, shot: `${n}_mid.png`, h: 1000 },
    { wait: 40000, shot: `${n}_end.png`, h: 1100 }, { js: 'modalClose.click()', wait: 300 });
}
fs.writeFileSync(path.join(__dirname, 'auto.json'), JSON.stringify(steps, null, 1));
