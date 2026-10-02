/* Zrzuty wycinanek z wirtualnym zegarem: czas w przeglądarce stoi / płynie wolniej, więc klatka ataku wypada dokładnie w zadanej chwili.
   użycie: node tmp/pup/steps.js [pary…] && timeout 240 node tmp/pup/shot.js tmp/pup/steps.json file://$PWD/index.html
   kroki: {js?, wait?, run?: ms wirtualnego czasu, shot?: plik (wycinek .stage3d ×2)}; zrzuty → tmp/shots/pup/ */
const { spawn } = require('child_process'), http = require('http'), fs = require('fs'), path = require('path');
const WS = require('../ws.js');
const [stepsFile, url, width = '430'] = process.argv.slice(2);
const PORT = 9500 + Math.floor(Math.random() * 300), prof = path.join(__dirname, '../prof_' + PORT), OUT = path.join(__dirname, '../shots/pup');
const SCALE = 2, SPEED = .25;   // powiększenie zrzutu; tempo czasu wirtualnego podczas run
fs.mkdirSync(OUT, { recursive: true });
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${width},1000`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
// zegar: performance.now i rAF czytają czas wirtualny v; run(ms) puszcza go o ms (w tempie SPEED) i zatrzymuje
const CLOCK = `(() => { if (window.__clk) return; const now0 = performance.now.bind(performance), raf = requestAnimationFrame.bind(window);
  let real = now0(), v = real, target = Infinity, speed = 1;
  const tick = () => { const r = now0(); v = Math.min(target, v + (r - real) * speed); real = r; return v; };
  performance.now = tick; window.requestAnimationFrame = cb => raf(() => cb(tick()));
  window.__clk = { run: ms => { tick(); target = v + ms; speed = ${SPEED}; return new Promise(res => { const w = () => tick() >= target ? setTimeout(res, 120) : setTimeout(w, 15); w(); }); },
    free: () => { target = Infinity; speed = 1; } }; })()`;
(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await get('/json/list'); } catch (e) { await sleep(250); } }
  const ws = new WS(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await ws.open();
  await ws.send('Page.enable'); await ws.send('Runtime.enable');
  ws.on('Runtime.exceptionThrown', m => console.log('EXC', m.exceptionDetails.exception?.description || m.exceptionDetails.text));
  ws.on('Runtime.consoleAPICalled', m => m.type === 'error' && console.log('CONSOLE', m.args.map(a => a.value || a.description).join(' ')));
  await ws.send('Emulation.setDeviceMetricsOverride', { width: +width, height: 1000, deviceScaleFactor: SCALE, mobile: true });
  await ws.send('Page.navigate', { url }); await sleep(2000);
  const ev = async e => { const r = await ws.send('Runtime.evaluate', { expression: e, awaitPromise: true }); if (r.exceptionDetails) console.log('JS ERR', e.slice(0, 60), r.exceptionDetails.exception?.description); return r.result?.value; };
  for (const s of JSON.parse(fs.readFileSync(stepsFile, 'utf8'))) {
    if (s.js) await ev(s.js);
    if (s.clock) await ev(CLOCK);
    if (s.wait) await sleep(s.wait);
    if (s.run != null) await ev(`__clk.run(${s.run})`);
    if (s.shot) {
      const b = JSON.parse(await ev("JSON.stringify(document.querySelector('.stage3d canvas').getBoundingClientRect())"));
      const r = await ws.send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 } });
      fs.writeFileSync(path.join(OUT, s.shot), Buffer.from(r.data, 'base64')); console.log('->', s.shot);
    }
  }
  ws.close(); chrome.kill(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 800);
})();
