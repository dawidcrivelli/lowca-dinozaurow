/* Headless Chrome (CDP) screenshot runner for the app.
   usage: node tmp/review/opus_shot.js <steps.json> <url> [width]
   steps: [{js?, wait?, shot?, h?('full'|px), w?}] ; shots -> tmp/review/shots/ */
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const WS = require('./ws.js');
const [stepsFile, url, width = '430'] = process.argv.slice(2);
const PORT = 9500 + Math.floor(Math.random() * 300);
const prof = path.join(__dirname, 'prof_' + PORT);
const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${width},1000`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
}).on('error', rej));
(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await get('/json/list'); } catch (e) { await sleep(250); } }
  const ws = new WS(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await ws.open();
  await ws.send('Page.enable'); await ws.send('Runtime.enable');
  ws.on && ws.on('Runtime.exceptionThrown', m => console.log('EXC', m.exceptionDetails.exception?.description || m.exceptionDetails.text));
  const W = +width, mobile = W < 700;
  await ws.send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile });
  await ws.send('Page.navigate', { url }); await sleep(2000);
  for (const s of JSON.parse(fs.readFileSync(stepsFile, 'utf8'))) {
    if (s.js) { const r = await ws.send('Runtime.evaluate', { expression: s.js, awaitPromise: true });
      if (r.exceptionDetails) console.log('JS ERR', s.shot || s.js.slice(0, 40), r.exceptionDetails.exception?.description); }
    if (s.wait) await sleep(s.wait);
    if (s.shot) {
      let h = s.h;
      if (h === 'full') h = (await ws.send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight' })).result.value;
      await ws.send('Emulation.setDeviceMetricsOverride', { width: s.w || W, height: h || 1000, deviceScaleFactor: 1, mobile });
      await sleep(150);
      const r = await ws.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(__dirname, 'shots', s.shot), Buffer.from(r.data, 'base64'));
      console.log('->', s.shot, h);
    }
  }
  ws.close(); chrome.kill(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 800);
})();
