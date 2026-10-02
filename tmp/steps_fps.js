/* FPS sceny 3D w trakcie walki (swiftshader, więc liczy się porównanie, nie wartość).
   użycie: node tmp/steps_fps.js && node tmp/shot.js tmp/steps_fps.json file://$PWD/index.html 430 → tmp/fps.txt */
const fs = require('fs'), path = require('path'), [a, b] = ['tyrannosaurus-rex', 'triceratops-horridus'];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify({ caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: '3d' } }))});location.reload()`;
const fps = `new Promise(r => { let n = 0; const t0 = performance.now(), f = () => performance.now() - t0 < 3000 ? (n++, requestAnimationFrame(f)) : r('FPS ' + (n / 3).toFixed(1)); f(); })`;
fs.writeFileSync(path.join(__dirname, 'steps_fps.json'), JSON.stringify([{ js: state, wait: 1500 }, { js: 'btnArena.click()', wait: 300 },
  { js: "document.querySelector('[data-fight]').click()", wait: 2500 }, { js: fps, out: 'fps.txt' }]));
