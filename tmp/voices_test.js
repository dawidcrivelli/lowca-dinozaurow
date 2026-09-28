/* Test głosów: (1) każdy gatunek ma głos z istniejącym plikiem, sw.js cache'uje wszystkie nagrania;
   (2) walka z włączonym dźwiękiem w Chrome odtwarza głosy obu zawodników + uderzenia, bez błędów.
   użycie: node tmp/voices_test.js */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), { SPECIES } = require('../js/species.js');
Object.assign(global, require('../js/voices.js'), { ART: require('../js/artspec.js').ART });
const bad = SPECIES.filter(s => !fs.existsSync(path.join(ROOT, SOUND_DIR, voiceOf(s) + '_0.mp3'))).map(s => s.id);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
if (!sw.includes('SOUNDS')) bad.push('sw.js bez SOUNDS');
const [a, b] = ['tyrannosaurus-rex', 'velociraptor-mongoliensis'];
const state = `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: true, mode: 'auto', view: '2d' } }))});location.reload()`;
const steps = path.join(__dirname, 'voices', 'steps_fight.json');
fs.writeFileSync(steps, JSON.stringify([{ js: state, wait: 1200 },
  { js: "window.played = []; const p = Audio.prototype.play; Audio.prototype.play = function () { played.push(this.src.split('/').pop() + '@' + this.playbackRate.toFixed(2)); return p.call(this); }" },
  { js: 'btnArena.click()', wait: 300 }, { js: "document.querySelector('[data-fight]').click()", wait: 12000 },
  { js: 'JSON.stringify(played)', out: 'voices/played.json' }]));
execFileSync('node', [path.join(__dirname, 'shot.js'), steps, 'file://' + path.join(ROOT, 'index.html')], { stdio: 'inherit' });
const played = JSON.parse(fs.readFileSync(path.join(__dirname, 'voices/played.json')));
console.log('odtworzone:', played.join(' '));
for (const need of ['bigroar_', 'screech_', 'hit_']) if (!played.some(p => p.startsWith(need))) bad.push('brak ' + need);
console.log(bad.length ? 'FAIL ' + bad.join(', ') : 'OK');
process.exit(bad.length ? 1 : 0);
