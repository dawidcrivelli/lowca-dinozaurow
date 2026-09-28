/* ================= GŁOSY ZWIERZĄT – syntezowane WebAudio, bez plików =================
   Nikt nie wie, jak brzmiały dinozaury: każdy typ ciała ma własny „przepis”, a wysokość głosu zależy od masy
   (10 kg piszczy, 50 t dudni).  voice(ac, sp, 'call' | 'attack' | 'ko')
   Przepis = warstwy: w = fala ('sawtooth', 'sine', 'square', 'noise'), f = [start, szczyt, koniec] Hz dla 1 t,
   d = długość s, v = głośność, at = opóźnienie s, flt = [filtr, Hz, Q], am = warczenie (Hz drżenia głośności),
   vib = [Hz, głębokość] drżenia wysokości. */
const VOICE_MODES = { call: { t: 1, k: 1, v: 1 }, attack: { t: .5, k: 1.1, v: .8 }, ko: { t: 1.3, k: .7, v: .8 } };
const VOICE_PITCH = { kgRef: 1000, exp: -.12, min: .4, max: 2.5 };   // k = (kg / 1 t)^-0.12
const chirps = (ats, L) => ats.map(at => ({ at, ...L }));
const VOICES = {
  roar: [{ w: 'sawtooth', f: [90, 130, 55], d: 1.1, v: .3, flt: ['lowpass', 900, 1], am: 28 },
    { w: 'noise', d: 1, v: .18, flt: ['bandpass', 500, 1.5] }, { w: 'square', f: [45, 65, 30], d: 1.1, v: .12, flt: ['lowpass', 300, 1] }],
  screech: [{ w: 'sawtooth', f: [900, 1400, 600], d: .45, v: .16, flt: ['bandpass', 1800, 2], vib: [35, .05] },
    { w: 'noise', d: .4, v: .1, flt: ['highpass', 3000, 1] }, { at: .5, w: 'sawtooth', f: [1000, 1500, 700], d: .3, v: .14, flt: ['bandpass', 1800, 2], vib: [35, .05] }],
  shriek: [{ w: 'sawtooth', f: [700, 900, 400], d: .7, v: .28, flt: ['bandpass', 1500, 3], vib: [12, .08] }, { w: 'noise', d: .6, v: .08, flt: ['highpass', 2500, 1] }],
  bellow: [{ w: 'sawtooth', f: [60, 80, 45], d: 1.6, v: .3, flt: ['lowpass', 400, 1], vib: [3, .03] }, { w: 'sine', f: [30, 40, 25], d: 1.6, v: .35 }],
  honk: [{ w: 'sawtooth', f: [180, 200, 170], d: .5, v: .6, flt: ['bandpass', 450, 6] }, { at: .6, w: 'sawtooth', f: [200, 220, 160], d: .7, v: .6, flt: ['bandpass', 450, 6] }],
  grunt: [{ w: 'square', f: [110, 90, 70], d: .3, v: .2, flt: ['lowpass', 500, 1], am: 40 }, { w: 'noise', d: .25, v: .15, flt: ['lowpass', 800, 1] },
    { at: .4, w: 'square', f: [120, 100, 75], d: .45, v: .2, flt: ['lowpass', 500, 1], am: 40 }],
  hiss: [{ w: 'noise', d: .9, v: .2, flt: ['highpass', 2500, 1] }, { w: 'sawtooth', f: [70, 80, 60], d: .9, v: .14, flt: ['lowpass', 250, 1], am: 18 }],
  whale: [{ w: 'sine', f: [300, 500, 200], d: 1.4, v: .25, vib: [5, .04] }, { w: 'noise', d: 1.2, v: .08, flt: ['lowpass', 400, 1] }],
  growl: [{ w: 'sawtooth', f: [120, 160, 80], d: 1, v: .28, flt: ['bandpass', 700, 1.2], am: 35 }, { w: 'noise', d: .9, v: .14, flt: ['bandpass', 1200, 1.5] }],
  trumpet: [{ w: 'sawtooth', f: [500, 700, 550], d: .9, v: .32, flt: ['bandpass', 1400, 3], vib: [7, .05] }, { w: 'square', f: [250, 350, 275], d: .9, v: .08, flt: ['lowpass', 1500, 1] }],
  moo: [{ w: 'sawtooth', f: [110, 140, 90], d: 1, v: .25, flt: ['lowpass', 600, 1], vib: [4, .02] }],
  click: chirps([0, .12, .24, .36], { w: 'noise', d: .06, v: .3, flt: ['bandpass', 3000, 4] }),
  bubble: chirps([0, .15, .3], { w: 'sine', f: [300, 600, 900], d: .1, v: .2 }),
};
const BODY_VOICE = { theropod: 'roar', smalltheropod: 'screech', sauropod: 'bellow', hadrosaur: 'honk', ceratopsian: 'grunt', stegosaur: 'grunt',
  ankylosaur: 'grunt', pachy: 'grunt', pterosaur: 'shriek', marine: 'whale', 'marine-long': 'whale', croc: 'hiss', reptile: 'hiss',
  turtle: 'bubble', fish: 'bubble', bug: 'click' };

function voiceOf(sp) {
  if (typeof ART !== 'undefined' && ART[sp.id]?.[0] === 'ele') return 'trumpet';
  if (sp.body === 'mammal' || sp.body === 'synapsid') return sp.diet === 'R' ? 'moo' : 'growl';
  return BODY_VOICE[sp.body] || (sp.diet === 'R' ? 'grunt' : 'roar');
}
let voiceNoise = null;   // 1 s białego szumu, wspólny dla wszystkich głosów
function voice(ac, sp, mode = 'call') {
  const M = VOICE_MODES[mode], P = VOICE_PITCH, k = M.k * Math.min(P.max, Math.max(P.min, ((sp.kg || P.kgRef) / P.kgRef) ** P.exp));
  if (voiceNoise?.sampleRate !== ac.sampleRate) {
    voiceNoise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    voiceNoise.getChannelData(0).forEach((_, i, a) => a[i] = Math.random() * 2 - 1);
  }
  const out = ac.createDynamicsCompressor(); out.connect(ac.destination);   // kilka warstw naraz nie przesteruje
  for (const L of VOICES[voiceOf(sp)]) {
    const t0 = ac.currentTime + (L.at || 0) * M.t, d = L.d * M.t, lfo = (hz, gain, target) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hz; g.gain.value = gain;
      o.connect(g).connect(target); o.start(t0); o.stop(t0 + d);
    };
    let src;
    if (L.w === 'noise') { src = ac.createBufferSource(); src.buffer = voiceNoise; src.loop = true; }
    else {
      const [a, b, c] = L.f.map(f => f * k); src = ac.createOscillator(); src.type = L.w;
      src.frequency.setValueAtTime(a, t0); src.frequency.linearRampToValueAtTime(b, t0 + d * .3); src.frequency.exponentialRampToValueAtTime(c, t0 + d);
      if (L.vib) lfo(L.vib[0], b * L.vib[1], src.frequency);
    }
    let n = src;
    if (L.flt) { const f = ac.createBiquadFilter(); f.type = L.flt[0]; f.frequency.value = L.flt[1] * Math.sqrt(k); f.Q.value = L.flt[2]; n = n.connect(f); }
    const env = ac.createGain(), v = L.v * M.v;
    env.gain.setValueAtTime(.0001, t0); env.gain.exponentialRampToValueAtTime(v, t0 + Math.min(.05, d * .2)); env.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    n = n.connect(env);
    if (L.am) { const g = ac.createGain(); g.gain.value = .6; lfo(L.am, .4, g.gain); n = n.connect(g); }
    n.connect(out); src.start(t0); src.stop(t0 + d + .02);
  }
}
if (typeof module !== 'undefined') module.exports = { VOICES, VOICE_MODES, voiceOf, voice };
