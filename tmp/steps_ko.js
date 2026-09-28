/* Test: pokonane zwierzę w 3D leży NA ziemi (spód nie pod gruntem), a nie znika pod nią.
   użycie: node tmp/steps_ko.js && node tmp/shot.js tmp/steps_ko.json file://$PWD/index.html 430   → "KO FAIL" = błąd */
const fs = require('fs'), path = require('path');
const PAIRS = [['tyrannosaurus-rex', 'velociraptor-mongoliensis'], ['tyrannosaurus-rex', 'stegosaurus-stenops'], ['smilodon-fatalis', 'mosasaurus-hoffmannii'],
  ['mammuthus-primigenius', 'quetzalcoatlus-northropi']];
const MIN_BOTTOM = -0.01;   // najniższy punkt leżącego ciała nie może być pod gruntem
const state = (a, b, view) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'auto', view } }))});location.reload()`;
const check = `(() => { const S = Arena3D.S; if (!S) throw new Error('KO FAIL: brak sceny');
  const out = Object.entries(S.byId).filter(([, f]) => f.ko).map(([id, f]) => [id, +new THREE.Box3().setFromObject(f.inner).min.y.toFixed(2)]);
  if (!out.length) throw new Error('KO FAIL: nikt nie leży');
  for (const [id, low] of out) if (low < ${MIN_BOTTOM}) throw new Error('KO FAIL ' + id + ' bottom=' + low);
  console.log('KO OK', JSON.stringify(out)); })()`;
const steps = [];
for (const view of ['3d', 'mix']) for (const [a, b] of PAIRS) steps.push({ js: state(a, b, view), wait: 1200 }, { js: 'btnArena.click()', wait: 300 },
  { js: "document.querySelector('[data-fight]').click()", wait: 14000, shot: `ko_${view}_${a.split('-')[0]}_${b.split('-')[0]}.png`, h: 1100 }, { js: check }, { js: 'modalClose.click()', wait: 200 });
fs.writeFileSync(path.join(__dirname, 'steps_ko.json'), JSON.stringify(steps, null, 1));
