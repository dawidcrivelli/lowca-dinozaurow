/* Pomiar klatek: wycinanki vs stare płyty (Puppet2D wyłączony), ta sama para, 4 s realnego czasu każda.
   użycie: node tmp/pup/perf.js a b && timeout 240 node tmp/pup/shot.js tmp/pup/perf.json file://$PWD/index.html */
const fs = require('fs'), path = require('path');
const [a, b] = process.argv.slice(2);
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: 'mix' } }))});location.reload()`;
// liczba klatek i najdłuższa klatka oraz czas JS w update() wycinanek
const FPS = `new Promise(r => { let n = 0, mx = 0, t0 = performance.now(), last = t0; const f = () => { const t = performance.now(); mx = Math.max(mx, t - last); last = t; n++;
  t - t0 < 4000 ? requestAnimationFrame(f) : r(JSON.stringify({ fps: +(n / 4).toFixed(1), worst: Math.round(mx), pupMs: window.__pupT && +(window.__pupT / n).toFixed(2) })); }; requestAnimationFrame(f); })`;
const run = (off) => [{ js: state, wait: 1500 }, ...(off ? [{ js: 'window.Puppet2D.build = () => null' }] : []),
  { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 4000 },
  { js: FPS, log: off ? 'SLABS' : 'PUPPETS' }, { js: 'modalClose.click()', wait: 300 }];
fs.writeFileSync(path.join(__dirname, 'perf.json'), JSON.stringify([...run(0), ...run(1)], null, 1));
