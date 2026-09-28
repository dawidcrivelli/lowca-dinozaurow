/* Contact sheet + viewBox overflow check for js/art.js.
   usage: node tmp/art/sheet.js [regex|from-to] [out.png] [cols] [px per col]
   Renders color+ghost of each species (tmp/review/species.json), screenshots via headless Chrome,
   and reports drawings whose stroked bbox leaves the 200x140 viewBox (measured with getBBox). */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const { spawn } = require('child_process');
const WS = require('../ws.js');
const ROOT = path.join(__dirname, '../..');
for (const f of ['js/artspec.js', 'js/art.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const SP = require(path.join(ROOT, 'tmp/review/species.json'));
const [sel = '', out = 'sheet.png', cols = '8', px] = process.argv.slice(2);
const rng = sel.match(/^(\d+)-(\d+)$/);
const list = SP.map((s, i) => ({ ...s, n: i + 1 })).filter((s, i) => rng ? i + 1 >= +rng[1] && i + 1 <= +rng[2] : new RegExp(sel).test(s.id));
const missing = SP.filter(s => !ART[s.id]).map(s => s.id);
if (missing.length) console.log('NO ART ENTRY:', missing.join(' '));
const cells = list.map(s => `<div class="c" data-id="${s.id}"><div class="p">${drawSpecies(s.id, 'color')}${drawSpecies(s.id, 'ghost')}</div>
  <b>${s.n}. ${s.name_pl}</b><i>${(ART[s.id] || ['?'])[0]} · ${s.id}</i></div>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#EDE3D0;font:13px/1.2 system-ui;margin:0;padding:6px}
.g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:5px}.c{background:#fff;border-radius:8px;padding:3px;text-align:center}
.p{display:flex}.p svg{width:50%;height:auto;display:block;outline:1px dashed #ddd}.p svg+svg{background:#F4EEE2}
b{display:block}i{color:#888;font-size:10px}</style><div class="g">${cells}</div>`;
const htmlFile = path.join(__dirname, 'sheet.html');
fs.writeFileSync(htmlFile, html);

/* Overflow check: every path of each ghost svg, bbox grown by half its stroke, mapped to viewBox units. */
const CHECK = `(()=>{const r=[];for(const c of document.querySelectorAll('.c')){const svg=c.querySelectorAll('svg')[1];
 const m0=svg.getScreenCTM().inverse();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(const p of svg.querySelectorAll('path')){const b=p.getBBox(),h=(+p.getAttribute('stroke-width')||0)/2,
  m=m0.multiply(p.getScreenCTM());for(const [x,y] of [[b.x-h,b.y-h],[b.x+b.width+h,b.y-h],[b.x-h,b.y+b.height+h],[b.x+b.width+h,b.y+b.height+h]]){
  const q=new DOMPoint(x,y).matrixTransform(m);x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);}}
 if(x0<-.5||y0<-.5||x1>200.5||y1>140.5)r.push(c.dataset.id+' '+[x0,y0,x1,y1].map(v=>v.toFixed(1)).join(','));}return r;})()`;

const PORT = 9800 + Math.floor(Math.random() * 150), prof = path.join(__dirname, 'prof_' + PORT);
const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
(async () => {
  let tabs; for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await get('/json/list'); } catch (e) { await sleep(250); } }
  const ws = new WS(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await ws.open();
  await ws.send('Page.enable'); await ws.send('Runtime.enable');
  const W = (+px || (+cols <= 4 ? 400 : 250)) * +cols;
  await ws.send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false });
  await ws.send('Page.navigate', { url: 'file://' + htmlFile }); await sleep(1200);
  const bad = (await ws.send('Runtime.evaluate', { expression: CHECK, returnByValue: true })).result.value;
  console.log(bad.length ? 'OVERFLOW:\n' + bad.join('\n') : 'overflow: none');
  const h = (await ws.send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight' })).result.value;
  await ws.send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const r = await ws.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, out), Buffer.from(r.data, 'base64'));
  console.log('->', out, list.length, 'species', W + 'x' + h);
  ws.close(); chrome.kill(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 800);
})();
