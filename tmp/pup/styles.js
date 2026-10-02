/* Zrzuty wybranych stylów ataku i reakcji wycinanek (styl wstrzykiwany wprost do f.anim, bez losowania z STYLES).
   użycie: node tmp/pup/styles.js 'A:B:bite,venom:r=bite,stomp' [...] && timeout 240 node tmp/pup/shot.js tmp/pup/styles.json file://$PWD/index.html
   A atakuje B każdym stylem (zrzuty w MOMENTS ms wirtualnych); r= — B obrywa danym stylem (reakcja A nieistotna); ko=styl, win=1
   zrzuty → tmp/shots/pup/<prefiks A>_<styl>_<n>.png, reakcje <prefiks B>_r_<styl>_<n>.png */
const fs = require('fs'), path = require('path');
const MOM = (process.env.MOMENTS || '170,130,170').split(',').map(Number), RMOM = [110, 130, 200];
const state = (a, b) => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'play', view: 'mix' } }))});location.reload()`;
const HELP = `__atk = (a, b, sty, k) => { const S = Arena3D.S, A = S.byId[a], D = S.byId[b], now = performance.now();
  if (k === 'r') return D.anim = { k: 'hit', t0: now, ms: 440, style: sty };
  if (k === 'ko') return D.anim = { k: 'ko', t0: now, ms: 880, style: sty };
  const ms = A.rig?.ms?.(sty) || 440; A.anim = { k: 'lunge', t0: now, ms, style: sty };
  S.todo.push([now + ms * (A.rig?.hitAt?.(sty) ?? .39), () => D.anim = { k: 'hit', t0: performance.now(), ms: 440, style: sty }]); }`;
const steps = [];
for (const arg of process.argv.slice(2)) {
  const [a, b, list = 'bite', ...opt] = arg.split(':'), o = Object.fromEntries(opt.map(s => s.split('='))), n = a.split('-')[0], m = b.split('-')[0];
  const call = (x, y, s, k = '') => ({ js: `__atk(${JSON.stringify(x)}, ${JSON.stringify(y)}, ${JSON.stringify(s)}, ${JSON.stringify(k)})` });
  steps.push({ js: state(a, b), wait: 1500 }, { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 3500, clock: 1 },
    { js: HELP }, { run: 0, shot: `${n}_0idle.png` });
  for (const s of list.split(',').filter(Boolean)) { steps.push(call(a, b, s)); MOM.forEach((ms, k) => steps.push({ run: ms, shot: `${n}_${s}_${k}.png` })); steps.push({ run: 500 }); }
  for (const s of (o.r || '').split(',').filter(Boolean)) { steps.push(call(a, b, s, 'r')); RMOM.forEach((ms, k) => steps.push({ run: ms, shot: `${m}_r_${s}_${k}.png` })); steps.push({ run: 900 }); }
  if (o.ko) { steps.push(call(a, b, o.ko, 'ko')); [300, 600, 900].forEach((ms, k) => steps.push({ run: ms, shot: `${m}_zko_${o.ko}_${k}.png` })); }
  if (o.win) { steps.push({ js: `Arena3D.win(${JSON.stringify(a)})` }); [400, 500, 600].forEach((ms, k) => steps.push({ run: ms, shot: `${n}_zwin_${k}.png` })); }
  steps.push({ js: '__clk.free(); modalClose.click()', wait: 300 });
}
fs.writeFileSync(path.join(__dirname, 'styles.json'), JSON.stringify(steps, null, 1));
