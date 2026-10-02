/* Zrzuty klatek ataków rigów: walka w trybie 👆, zdarzenia podane wprost do Arena3D.event, zrzut w kilku chwilach animacji.
   użycie: node tmp/steps_rig.js <bill|model> <idA> <idB> [styl...] && node tmp/shot.js tmp/steps_rig.json file://$PWD/index.html 430
   zrzuty → tmp/shots/rig_<view>_<a>_<n>.png */
const fs = require('fs'), path = require('path');
const [figures = 'model', a = 'tyrannosaurus-rex', b = 'triceratops-horridus'] = process.argv.slice(2);
const view = figures === 'bill' ? 'mix' : '3d', n = a.split('-')[0];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view } }))});location.reload()`;
const ev = (move, dmg = 15) => `Arena3D.event(${JSON.stringify({ att: a, def: b, move, damage: dmg, hpDef: 80 })})`;
const steps = [{ js: state, wait: 1500 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 3000 },
  { shot: `rig_${figures}_${n}_idle.png`, h: 800 }];
for (const [i, move] of ['attack', 'attack', 'special'].entries())
  steps.push({ js: ev(move), wait: 150, shot: `rig_${figures}_${n}_${i}a.png`, h: 800 }, { wait: 200, shot: `rig_${figures}_${n}_${i}b.png`, h: 800 }, { wait: 900 });
fs.writeFileSync(path.join(__dirname, 'steps_rig.json'), JSON.stringify(steps, null, 1));
