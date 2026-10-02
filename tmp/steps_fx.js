/* Zrzuty efektów trafień (FX): dla każdego atakującego cios specjalny (= ostatni styl z repertuaru) i zwykły, oraz nokaut + zwycięstwo.
   użycie: node tmp/steps_fx.js <bill|model> <obrońca> <atakujący...> && timeout 240 node tmp/shot.js tmp/steps_fx.json file://$PWD/index.html 430
   zrzuty → tmp/shots/fx_<view>_<a>_<n>.png */
const fs = require('fs'), path = require('path');
const [figures = 'model', b = 'triceratops-horridus', ...atts] = process.argv.slice(2);
const view = figures === 'bill' ? 'mix' : '3d', ev = e => `Arena3D.event(${JSON.stringify(e)})`;
const state = a => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view } }))});location.reload()`;
const steps = [];
for (const a of atts.length ? atts : ['dilophosaurus-wetherilli']) {
  const n = `fx_${figures}_${a.split('-')[0]}`;
  steps.push({ js: state(a), wait: 1500 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 600, shot: `${n}_intro.png`, h: 800 },
    { wait: 1800 }, { js: ev({ att: a, def: b, move: 'special', damage: 30, hpDef: 60 }), wait: 120, shot: `${n}_sp1.png`, h: 800 }, { wait: 100, shot: `${n}_sp2.png`, h: 800 },
    { wait: 900 }, { js: ev({ att: a, def: b, move: 'attack', damage: 12, hpDef: 50 }), wait: 220, shot: `${n}_at.png`, h: 800 }, { wait: 900 },
    { js: ev({ att: a, def: b, move: 'special', damage: 40, hpDef: 0 }), wait: 500, shot: `${n}_ko.png`, h: 800 }, { js: `Arena3D.win(${JSON.stringify(a)})`, wait: 900, shot: `${n}_win.png`, h: 800 },
    { js: 'modalClose.click()', wait: 200 });
}
fs.writeFileSync(path.join(__dirname, 'steps_fx.json'), JSON.stringify(steps, null, 1));
