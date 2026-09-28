/* Generuje js/species.js z danych już policzonych:
   tmp/review/species.json (prawdziwe rozmiary) + podpowiedzi/ciekawostki z wersji Opus (js/data.js) i ChatGPT.
   Nowe gatunki bez tekstu dostają podpowiedź z grupy/epoki i ciekawostkę z opisu uzbrojenia.
   użycie: node tmp/build_species.js */
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const S = require('./review/species.json');
const opus = Object.fromEntries(require('../js/data.js').SPECIES.map(s => [s.id, s]));
const html = fs.readFileSync(path.join(ROOT, 'dino_lapacz_chatgpt.html'), 'utf8');
const gptRaw = new Function(html.slice(html.indexOf('const raw = [];'), html.indexOf('const creaturesBase')) + ';return raw;')();
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const gpt = Object.fromEntries(gptRaw.map(x => [slug(x.latin || x.name), x]));
const dsrc = fs.readFileSync(path.join(__dirname, 'review/derive_stats.js'), 'utf8');
const GROUPS = new Function(dsrc.slice(dsrc.indexOf('const GROUPS'), dsrc.indexOf('const DIETS')) + ';return GROUPS;')();

// poprawki błędów wskazanych w recenzjach (tmp/review/opus.md, stats.md)
const FIX = [[/tropi tam/, 'tropił tam'], [/w setkach egzemplarzy/, 'w ponad 40 egzemplarzach'],
  [/Najdłuższa szyja w historii[^.]*\./i, 'Jedna z najdłuższych szyj w historii zwierząt.']];
const fix = t => FIX.reduce((s, [a, b]) => s.replace(a, b), t || '');
const norm = s => slug(s).replace(/-/g, '');
const leaks = (t, s) => [s.name_pl, s.name_lat.split(' ')[0]].some(n => norm(t).includes(norm(n).slice(0, 6)));
const size = kg => kg < 30 ? 'mały' : kg < 1000 ? 'średni' : kg < 10000 ? 'duży' : 'olbrzym';
const cap = t => t && t[0].toUpperCase() + t.slice(1);

const out = S.map(s => {
  const o = opus[s.legacy.opus] || {}, g = gpt[s.legacy.gpt] || {};
  const hints = [fix(o.h), g.hint, `${GROUPS[s.group][0].split(' (')[0]} (${s.period_pl}), ${size(s.mass_kg)}`];
  const hint = hints.find(h => h && !leaks(h, s));
  const fact = fix(o.f) || cap(s.weapons_pl) + '.';
  const rarity = o.r || (s.mass_kg < 30 ? 1 : s.mass_kg < 1000 ? 2 : s.mass_kg < 10000 ? 3 : 4);
  return { id: s.id, name: s.name_pl, latin: s.name_lat, cat: s.category, group: s.group, body: s.body, ma: s.ma, diet: s.diet,
    len: s.length_m, h: s.height_m, wing: s.wingspan_m, kg: s.mass_kg, loco: s.locomotion, kmh: s.speed_kmh_est, weapons: s.weapons,
    social: s.social, rarity, hint, fact, weaponsTxt: s.weapons_pl, aliases: s.aliases, legacy: s.legacy, unc: s.uncertainty, note: s.note };
});

const CATS = { dino: { label: 'Dinozaury', emo: '🦖' }, ptero: { label: 'Latające gady', emo: '🪽' }, marine: { label: 'Morskie', emo: '🌊' },
  mammal: { label: 'Ssaki', emo: '🦣' }, other: { label: 'Inne', emo: '🦎' } };
const src = `/* ================= BAZA GATUNKÓW (${out.length}) =================
   Wygenerowane: node tmp/build_species.js  (źródło: tmp/review/species.json + teksty z obu wersji)
   kg, len (m), h (wysokość m), wing (rozpiętość m), kmh (szacunek), ma = [od, do] mln lat temu
   weapons: bite/claw/horn/tail/ram/squeeze/armor 1–3 → statystyki walki (js/battle.js)
   unc: niepewność danych L/M/H · legacy: stare id z wersji Opus / ChatGPT (import zapisów) */
const GROUPS = ${JSON.stringify(GROUPS)}; // grupa → [etykieta, czy dinozaur: true|false|'?']
const CATS = ${JSON.stringify(CATS)};
const SPECIES = [
${out.map(o => '  ' + JSON.stringify(o)).join(',\n')}
];
if (typeof module !== 'undefined') module.exports = { GROUPS, CATS, SPECIES };
`;
fs.writeFileSync(path.join(ROOT, 'js/species.js'), src);
const gen = out.filter(o => !opus[S.find(s => s.id === o.id).legacy.opus]);
console.log(`js/species.js: ${out.length} gatunków, ${gen.length} bez tekstu z Opus (podpowiedź z GPT lub generowana)`);
