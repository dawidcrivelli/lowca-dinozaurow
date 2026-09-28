/* ================= GŁOSY ZWIERZĄT – nagrania CC0 (sounds/, źródła: sounds/CREDITS.md) =================
   Nikt nie wie, jak brzmiały dinozaury: jak w filmach, każdy typ ciała dostaje głos prawdziwego zwierzęcia,
   a większe zwierzę odtwarza go wolniej i niżej: tempo = (kg / kg nagranego zwierzęcia)^-0.15
   (T. rex z lwa: ×0.57, Sinozauropteryks z orła: ×1.4).  voice(sp, 'call' | 'attack' | 'ko'),  sfx('hit' | 'whoosh' | 'splash' | 'bubble')
   Nowe nagrania: tmp/voices/fetch.py (kandydaci) → tmp/voices/make.py (wybór, przycięcie). */
const SOUND_DIR = 'sounds/';
const SOUNDS = {   // głos → [liczba wariantów (losowany), masa nagranego zwierzęcia kg]
  bigroar: [3, 250], roar: [3, 190], growl: [3, 250], screech: [3, 5], shriek: [3, .5], bellow: [3, 900], honk: [3, 4], grunt: [3, 100],
  hiss: [3, 5], whale: [4, 30000], trumpet: [3, 5000], moo: [3, 600], click: [3, .01], bubble: [3, 1], splash: [2, 1], hit: [3, 1], whoosh: [3, 1],
};
const VOICE_MODES = { call: { rate: 1, vol: 1 }, attack: { rate: 1.08, vol: .7, ms: 900 }, ko: { rate: .75, vol: .8 } };
const VOICE_PITCH = { exp: -.15, min: .4, max: 1.6 };
const BIG_ROAR_KG = 1000;   // od tony w górę teropody ryczą „potworem”
const FADE_STEP = .1;       // ucinanie krótkiego głosu: −10% głośności co 20 ms zamiast trzasku
const BODY_VOICE = { smalltheropod: 'screech', sauropod: 'bellow', hadrosaur: 'honk', ceratopsian: 'grunt', stegosaur: 'grunt',
  ankylosaur: 'grunt', pachy: 'grunt', pterosaur: 'shriek', marine: 'whale', 'marine-long': 'whale', croc: 'hiss', reptile: 'hiss',
  turtle: 'bubble', fish: 'bubble', bug: 'click' };

function voiceOf(sp) {
  if (typeof ART !== 'undefined' && ART[sp.id]?.[0] === 'ele') return 'trumpet';
  if (sp.body === 'mammal' || sp.body === 'synapsid') return sp.diet === 'R' ? 'moo' : 'growl';
  if (sp.body === 'theropod') return sp.kg >= BIG_ROAR_KG ? 'bigroar' : 'roar';
  return BODY_VOICE[sp.body] || (sp.diet === 'R' ? 'grunt' : 'roar');
}
/* odtwarza losowy wariant; <audio> zamiast WebAudio, bo działa też z file:// */
function sfx(name, rate = 1, vol = 1, ms = 0) {
  const a = new Audio(`${SOUND_DIR}${name}_${Math.floor(Math.random() * SOUNDS[name][0])}.mp3`);
  a.preservesPitch = a.webkitPreservesPitch = false;   // wolniej = niżej, jak płyta
  a.playbackRate = Math.min(VOICE_PITCH.max, Math.max(VOICE_PITCH.min, rate)); a.volume = vol;
  a.play().catch(() => {});
  if (ms) setTimeout(() => { const f = setInterval(() => { a.volume = Math.max(0, a.volume - FADE_STEP); if (!a.volume) { clearInterval(f); a.pause(); } }, 20); }, ms);
}
function voice(sp, mode = 'call') {
  const v = voiceOf(sp), M = VOICE_MODES[mode];
  sfx(v, M.rate * ((sp.kg || SOUNDS[v][1]) / SOUNDS[v][1]) ** VOICE_PITCH.exp, M.vol, M.ms);
}
if (typeof module !== 'undefined') module.exports = { SOUND_DIR, SOUNDS, voiceOf, voice, sfx };
