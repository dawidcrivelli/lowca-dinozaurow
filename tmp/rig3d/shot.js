/* Zrzut arkusza brył: node tmp/rig3d/shot.js '<zapytanie view.html>' out.png [...kolejne pary zapytanie out]
   np. node tmp/rig3d/shot.js 'ids=tyrannosaurus-rex,triceratops-horridus&pose=lunge:bite:.45' tmp/shots/r3/a.png
   zrzuty → ścieżka podana; wypisuje EXC/CONSOLE i statystyki (trójkąty, czas budowy) */
const { spawn } = require('child_process'), http = require('http'), fs = require('fs'), path = require('path');
const WS = require('../ws.js');
const args = process.argv.slice(2), PORT = 9500 + Math.floor(Math.random() * 300), prof = path.join(__dirname, '../prof_' + PORT);
const VIEW = 'file://' + path.join(__dirname, 'view.html');
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await get('/json/list'); } catch (e) { await sleep(250); } }
  const ws = new WS(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await ws.open();
  await ws.send('Page.enable'); await ws.send('Runtime.enable');
  ws.on('Runtime.exceptionThrown', m => console.log('EXC', m.exceptionDetails.exception?.description || m.exceptionDetails.text));
  ws.on('Runtime.consoleAPICalled', m => ['error', 'warning'].includes(m.type) && console.log('CONSOLE', m.args.map(a => a.value || a.description).join(' ').slice(0, 300)));
  const ev = async e => (await ws.send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;
  for (let i = 0; i < args.length; i += 2) {
    await ws.send('Page.navigate', { url: VIEW + '?' + args[i] });
    let ok = false; for (let k = 0; k < 200 && !ok; k++) { await sleep(150); ok = await ev('window.__done === true'); }
    if (!ok) { console.log('TIMEOUT', args[i]); continue; }
    const [w, h] = await ev('[document.body.scrollWidth, document.body.scrollHeight]');
    await ws.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await sleep(200);
    const r = await ws.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(args[i + 1]), { recursive: true }); fs.writeFileSync(args[i + 1], Buffer.from(r.data, 'base64'));
    const st = await ev('JSON.stringify(__stats)');
    console.log('->', args[i + 1], JSON.parse(st).map(s => `${s.id.split('-')[0]}:${s.tris}△/${s.ms}ms`).join(' '));
  }
  ws.close(); chrome.kill(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 800);
})();
