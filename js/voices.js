/* ================= GŁOSY – oryginalne okrzyki z Red/Blue (CRY_URL) + odgłosy walki CC0 (sounds/, źródła: sounds/CREDITS.md) =================
   voice(sp, 'call' | 'attack' | 'ko'),  sfx('hit' | 'whoosh' | 'splash' | 'bubble') */
const SOUND_DIR = 'sounds/';
const SOUNDS = { bubble: 3, splash: 2, hit: 3, whoosh: 3 };   // odgłos → liczba wariantów (losowany)
const VOICE_MODES = { call: { rate: 1, vol: .8 }, attack: { rate: 1.15, vol: .5 }, ko: { rate: .7, vol: .7 } };   // KO: wolniej = niżej, jak w grach
/* <audio> zamiast WebAudio, bo działa też z file:// */
function play(src, rate = 1, vol = 1) {
  const a = new Audio(src);
  a.preservesPitch = a.webkitPreservesPitch = false;
  a.playbackRate = rate; a.volume = vol;
  a.play().catch(() => {});
}
const sfx = name => play(`${SOUND_DIR}${name}_${Math.floor(Math.random() * SOUNDS[name])}.mp3`);
const voice = (sp, mode = 'call') => play(CRY_URL(sp.id), VOICE_MODES[mode].rate, VOICE_MODES[mode].vol);
if (typeof module !== 'undefined') module.exports = { SOUND_DIR, SOUNDS, voice, sfx };
