/* Kroki zrzutów wycinanek: dla każdej pary A:B — spoczynek, każdy styl ataku A (zamach / cios / po ciosie), trafienie A, obrona, unik, nokaut, wygrana.
   użycie: node tmp/pup/steps.js tyrannosaurus-rex:triceratops-horridus [...] && timeout 240 node tmp/pup/shot.js tmp/pup/steps.json file://$PWD/index.html
   NSTY=4 (ile stylów: Math.random podstawiony, by wybrać kolejny styl z listy STYLES), MOMENTS=190,120,160 (ms wirtualne między zrzutami) */
const fs = require('fs'), path = require('path');
const pairs = process.argv.slice(2).map(p => p.split(':')), NSTY = +(process.env.NSTY || 4), MOM = (process.env.MOMENTS || '190,120,160').split(',').map(Number);
const state = (a, b) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: 'mix' } }))});location.reload()`;
const ev = (att, def, move, o = {}) => `Arena3D.event(${JSON.stringify({ att, def, move, damage: 15, hpDef: 80, ...o })})`;
const steps = [];
for (const [a, b] of pairs) {
  const n = a.split('-')[0];
  steps.push({ js: state(a, b), wait: 1500 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 3500, clock: 1 },
    { run: 0, shot: `${n}_idle.png` }, { run: 700, shot: `${n}_idle2.png` });
  for (let i = 0; i < NSTY; i++) {   // styl i: Math.random tak dobrany, by style() w arena3d.js wybrał i-ty (ostatni = special)
    const last = i === NSTY - 1;
    steps.push({ js: `__r = Math.random; Math.random = () => (${i} + .5) / ${NSTY - 1}; ${ev(a, b, last ? 'special' : 'attack')}; Math.random = __r` });
    MOM.forEach((ms, k) => steps.push({ run: ms, shot: `${n}_s${i}_${k}.png` }));
    steps.push({ run: 600 });
  }
  steps.push({ js: ev(b, a, 'attack', { damage: 30 }) }, { run: 330, shot: `${n}_hit.png` }, { run: 600 },
    { js: ev(a, b, 'guard') }, { run: 300, shot: `${n}_guard.png` },
    { js: ev(b, a, 'attack', { dodge: true, damage: 0 }) }, { run: 260, shot: `${n}_dodge.png` }, { run: 700 },
    { js: ev(b, a, 'attack', { damage: 40, hpDef: 0 }) }, { run: 1500, shot: `${n}_ko.png` },
    { js: `Arena3D.win(${JSON.stringify(b)})` }, { run: 500, shot: `${n}_lose_win.png` }, { js: '__clk.free(); modalClose.click()', wait: 300 });
}
fs.writeFileSync(path.join(__dirname, 'steps.json'), JSON.stringify(steps, null, 1));
