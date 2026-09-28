/* Zrzuty uniku i obrony w 3D: zdarzenia podane wprost do Arena3D.event (tryb 👆, więc walka czeka na ruch).
   użycie: node tmp/steps_moves.js && node tmp/shot.js tmp/steps_moves.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const [a, b] = ['tyrannosaurus-rex', 'triceratops-horridus'];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: '3d' } }))});location.reload()`;
const ev = e => `Arena3D.event(${JSON.stringify(e)})`;
const steps = [{ js: state, wait: 1200 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 2500 },
  { js: ev({ att: b, def: a, dodge: true }), wait: 330, shot: 'mv_dodge.png', h: 800 },
  { wait: 800 }, { js: ev({ att: a, def: a, move: 'guard' }), wait: 900, shot: 'mv_guard.png', h: 800 },
  { js: ev({ att: b, def: a, damage: 12, hpDef: 100, guarded: true }), wait: 260, shot: 'mv_block.png', h: 800 },
  { wait: 900, shot: 'mv_after.png', h: 800 }];
fs.writeFileSync(path.join(__dirname, 'steps_moves.json'), JSON.stringify(steps, null, 1));
