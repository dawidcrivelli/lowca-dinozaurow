/* Pomiar tempa walki: zapisuje chwile startu każdego zdarzenia (Arena3D.event) i ataków w scenie → tmp/timing_<view>.json.
   użycie: node tmp/steps_timing.js <3d|mix> [idA] [idB] && timeout 240 node tmp/shot.js tmp/steps_timing.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const [view = '3d', a = 'tyrannosaurus-rex', b = 'triceratops-horridus'] = process.argv.slice(2);
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'auto', view } }))});location.reload()`;
const hook = `window.T0 = performance.now(); window.LOG = []; const e = Arena3D.event; Arena3D.event = ev => { LOG.push([Math.round(performance.now() - T0), ev.att?.split('-')[0], ev.style || ev.move || 'x']); return e(ev); }`;
fs.writeFileSync(path.join(__dirname, 'steps_timing.json'), JSON.stringify([{ js: state, wait: 1800 }, { js: hook }, { js: 'btnArena.click()', wait: 300 },
  { js: "T0 = performance.now(); document.querySelector('[data-fight]').click()", wait: 1500, shot: `timing_${view}_start.png`, h: 800 },
  { wait: 22000 }, { js: 'JSON.stringify(LOG)', out: `timing_${view}.json` }], null, 1));
