/* Test głosów: każdy przepis renderowany offline w Chrome (OfflineAudioContext) → nie może być cisza ani przester.
   Zapisuje tmp/voices/<głos>_<gatunek>.wav do odsłuchu.
   użycie: node tmp/voices_test.js  (uruchamia tmp/shot.js) */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { SPECIES } = require('../js/species.js'), { VOICES, voiceOf } = require('../js/voices.js');
global.ART = require('../js/artspec.js').ART;
const RATE = 22050, SECS = 2.5, MIN_PEAK = .05, MAX_PEAK = 1;
// po jednym (najlżejszym i najcięższym) gatunku na głos – słychać zakres wysokości
const pick = {};
for (const s of [...SPECIES].sort((a, b) => a.kg - b.kg)) (pick[voiceOf(s)] = pick[voiceOf(s)] || []).push(s.id);
const ids = Object.values(pick).flatMap(l => [...new Set([l[0], l.at(-1)])]);
const miss = Object.keys(VOICES).filter(v => !pick[v]);
if (miss.length) console.log('głosy bez gatunku:', miss.join(', '));
const js = `(async () => { const out = {};
  for (const id of ${JSON.stringify(ids)}) { const sp = SPECIES.find(s => s.id === id);
    const ac = new OfflineAudioContext(1, ${RATE * SECS}, ${RATE}); voice(ac, sp, 'call');
    const d = (await ac.startRendering()).getChannelData(0); let pk = 0; for (const x of d) pk = Math.max(pk, Math.abs(x));
    out[voiceOf(sp) + '_' + id] = { pk, pcm: Array.from(d, x => Math.round(Math.max(-1, Math.min(1, x)) * 32767)) }; }
  return JSON.stringify(out); })()`;
const steps = path.join(__dirname, 'voices', 'steps.json');
fs.writeFileSync(steps, JSON.stringify([{ js, out: 'voices/out.json' }]));
execFileSync('node', [path.join(__dirname, 'shot.js'), steps, 'file://' + path.join(__dirname, '../index.html')], { stdio: 'inherit' });
let bad = 0;
for (const [name, { pk, pcm }] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'voices/out.json'))))) {
  const ok = pk >= MIN_PEAK && pk <= MAX_PEAK; bad += !ok;
  console.log(`${ok ? 'OK ' : 'BAD'} ${name.padEnd(45)} peak ${pk.toFixed(2)}`);
  const h = Buffer.alloc(44), n = pcm.length * 2;   // nagłówek WAV PCM 16-bit mono
  h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40);
  fs.writeFileSync(path.join(__dirname, 'voices', name + '.wav'), Buffer.concat([h, Buffer.from(Int16Array.from(pcm).buffer)]));
}
process.exit(bad ? 1 : 0);
