/* Screenshots of the ChatGPT version via headless Chrome CDP. usage: node tmp/review/shot.js */
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..'), out = path.join(__dirname, 'shots');
const PORT = 9341, W = 430;
const chrome = spawn('google-chrome', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${process.env.PROF || '/tmp/claude-1000/review-chatgpt-prof'}`, '--window-size=430,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { let d=''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
// caught set for collection shots
const CAUGHT = ['tyrannosaurus-rex','triceratops-horridus','stegosaurus-stenops','brachiosaurus-altithorax','velociraptor-mongoliensis','spinosaurus-aegyptiacus','ankylosaurus-magniventris','parasaurolophus-walkeri','pteranodon-longiceps','mosasaurus-hoffmannii','elasmosaurus-platyurus','dimetrodon-grandis','diplodocus-carnegii','carnotaurus-sastrei','pachycephalosaurus-wyomingensis','quetzalcoatlus-northropi','archelon-ischyros','sarcosuchus-imperator','styracosaurus-albertensis','therizinosaurus-cheloniformis','gallimimus-bullatus','amargasaurus-cazaui','liopleurodon-ferox','ichthyosaurus-communis','kentrosaurus-aethiopicus','dilophosaurus-wetherilli','iguanodon-bernissartensis','tanystropheus-longobardicus','leedsichthys-problematicus','compsognathus-longipes'];
(async () => {
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await get('/json/list'); break; } catch (e) { await sleep(250); } }
  const WS = require('../ws.js'); const ws = new WS(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await ws.open();
  await ws.send('Page.enable'); await ws.send('Runtime.enable');
  const size = (h, w = W, mobile = true) => ws.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  const js = async e => { const r = await ws.send('Runtime.evaluate', { expression: `{${e}}`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) console.log('JS ERR', e.slice(0, 60), r.exceptionDetails.exception?.description); return r.result?.value; };
  const shot = async (name, h, w) => { if (h) await size(h, w); await sleep(300); const r = await ws.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, `chatgpt_${name}.png`), Buffer.from(r.data, 'base64')); console.log('->', name); };
  const nav = async (file, ms = 1200) => { await ws.send('Page.navigate', { url: 'file://' + path.join(root, file) }); await sleep(ms); };
  await size(900);
  await nav('dino_lapacz_chatgpt.html');
  await js(`localStorage.clear()`); await nav('dino_lapacz_chatgpt.html');
  await shot('01_home_empty', 900);
  await js(`document.querySelector('.creature-card').click()`); await shot('02_hint', 900);
  await js(`document.querySelector('#secondHint').click()`); await shot('02b_hint2', 900);
  await js(`document.querySelector('[data-close=hintModal]').click(); const i=document.querySelector('#searchInput'); i.value='tri'; i.dispatchEvent(new Event('input'))`); await shot('03_search', 900);
  await js(`document.querySelector('.result').click()`); await shot('04_catch_before', 900);
  await js(`document.querySelector('#throwBtn').click()`); await sleep(450); await shot('05_catch_throw', 900);
  await sleep(700); await shot('06_catch_reveal', 900);
  await sleep(1200); await shot('07_detail', 900);
  // seed collection
  await js(`localStorage.setItem('prehistoric_catcher_v1', JSON.stringify({version:2,caught:Object.fromEntries(${JSON.stringify(CAUGHT)}.map(id=>[id,{caughtAt:new Date().toISOString(),egg:'lava'}])),hidden:[],custom:[],settings:{sound:false}}))`);
  await nav('dino_lapacz_chatgpt.html');
  await shot('08_collection_top', 900);
  await size(3200); await sleep(300); await shot('09_collection_full', 3200);
  await size(900);
  await js(`[...document.querySelectorAll('.chip')].find(b=>b.dataset.filter==='caught').click()`); await shot('10_filter_caught', 1400);
  await size(900);
  await js(`document.querySelector('#battleNav').click()`); await sleep(300);
  await js(`const a=document.querySelector('#battleASelect'); a.value='tyrannosaurus-rex'; a.dispatchEvent(new Event('change')); const b=document.querySelector('#battleBSelect'); b.value='triceratops-horridus'; b.dispatchEvent(new Event('change'))`);
  await shot('11_battle_setup', 1300);
  await size(900);
  await js(`document.querySelector('#startBattleBtn').click()`); await sleep(2300); await shot('12_battle_mid', 1100);
  await sleep(4500); await shot('13_battle_end', 1300);
  await js(`document.querySelector('#newBattleBtn').click(); const a=document.querySelector('#battleASelect'); a.value='velociraptor-mongoliensis'; a.dispatchEvent(new Event('change')); const b=document.querySelector('#battleBSelect'); b.value='mosasaurus-hoffmannii'; b.dispatchEvent(new Event('change')); document.querySelector('#startBattleBtn').click()`);
  await sleep(1600); await shot('14_battle2_mid', 1100); await sleep(5000); await shot('15_battle2_end', 1300);
  await js(`document.querySelector('[data-close=battleModal]').click(); document.querySelector('#parentBtn').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))`); await shot('16_parent', 1100);
  // tablet
  await js(`document.querySelector('[data-close=parentModal]').click()`); await size(1000, 1024, false); await shot('17_tablet', 1000, 1024);
  await js(`document.querySelector('#battleNav').click()`); await sleep(300); await js(`document.querySelector('#startBattleBtn').click()`); await sleep(2500); await shot('18_tablet_battle', 1000, 1024);
  // drawing sheet
  await size(3500, 1230, false); await nav('tmp/review/chatgpt_sheet.html', 800);
  await sleep(500);
  for (let k = 0; k < 5; k++) { const r = await ws.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: k * 828, width: 1230, height: Math.min(828, 3570 - k * 828), scale: 1 } }); fs.writeFileSync(path.join(out, `chatgpt_sheet_${k + 1}.png`), Buffer.from(r.data, 'base64')); console.log('-> sheet', k + 1); }
  console.log('errors:', await js('JSON.stringify(window.__errs||[])'));
  ws.close(); chrome.kill();
})();
