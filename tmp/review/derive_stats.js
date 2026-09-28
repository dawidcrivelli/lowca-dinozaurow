#!/usr/bin/env node
/* Derives battle stats from real-world data and sanity-checks them in the ChatGPT battle engine.
   Usage: node tmp/review/extract.js && node tmp/review/derive_stats.js [fights=2000]
   Outputs: species.json, stats_generated.md (tables + matchups).  Tune constants in K. */
const fs = require('fs'), path = require('path');
const { R, WINGSPAN } = require('./real_data.js');
const OUT = __dirname, ROOT = path.join(__dirname, '../..');
const FIGHTS = +process.argv[2] || 2000;

/* ---------- tunables ---------- */
const K = {
  logMassMin: -2, logMassSpan: 7,          // m = 0 at 10 g, 1 at 100 t
  hp: [60, 160, 2.2],                      // hp = a + b·m^c           → 70..220 (engine clamp 72..220)
  atk: [10, 70, 7, 0.25, 1.5],             // atk = a + b·m^e + c·W, W = max(weapon·wt) + d·Σ(other weapons·wt)
  wt: { bite: 1, claw: 0.8, squeeze: 0.9, horn: 0.8, tail: 0.8, ram: 0.7 }, // killing tools > defensive tools
  atkDiet: { M: 6, Ry: 3, W: 1, P: -20 },  // hunters know how to fight; filter feeders don't
  def: [14, 40, 8],                       // def = a + b·m + c·armor
  spd: [18, 0.75, 16],                     // spd = a + b·km/h + c·(1-m)   (small = nimble)
  spdFly: 5,
  evade: [0.14, 0.04],                     // evade = a·(1-m)² + b·flier     (engine caps total dodge at .26)
  pack: { pack: 0.45, 'pack?': 0.25, solo: 0, herd: 0 }, // carnivores only
  fortressMass: 20000,
  sizeClass: [30, 500, 5000, 25000],       // kg thresholds → size 1..5 (terrain modifiers)
};

/* ---------- labels ---------- */
// dino: true | false | '?'  · cat: engine category (dino/ptero/marine/other; 'mammal' proposed)
const GROUPS = {
  teropod: ['Teropod (drapieżny dinozaur)', true], 'dinozaur-wczesny': ['Wczesny dinozaur', true],
  prozauropod: ['Prazauropod', true], zauropod: ['Zauropod (długoszyi olbrzym)', true],
  ceratops: ['Ceratops (rogaty z kryzą)', true], stegozaur: ['Stegozaur (z płytami)', true],
  ankylozaur: ['Ankylozaur (pancerny)', true], ornitopod: ['Ornitopod', true], hadrozaur: ['Hadrozaur (kaczodzioby)', true],
  pachycefalozaur: ['Pachycefalozaur (twardogłowy)', true], ptak: ['Ptak — żyjący dinozaur', true],
  archozaur: ['Archozaur — może dinozaur', '?'], dinozaurokształtny: ['Dinozaurokształtny — prawie dinozaur', '?'],
  pterozaur: ['Pterozaur — latający gad, NIE dinozaur', false],
  notozaur: ['Notozaur — gad morski', false], plezjozaur: ['Plezjozaur — gad morski', false], pliozaur: ['Pliozaur — gad morski', false],
  ichtiozaur: ['Ichtiozaur — gad morski', false], mozazaur: ['Mozazaur — morska jaszczurka', false], zolw: ['Żółw', false],
  ryba: ['Ryba', false], ssak: ['Ssak', false], pseudozuch: ['Krewny krokodyli', false], krokodylomorf: ['Krokodylomorf', false],
  luskonosny: ['Łuskonośny (wąż/jaszczurka)', false], 'gad-inny': ['Inny gad', false],
  synapsyd: ['Synapsyd — prassak, NIE dinozaur', false], plaz: ['Płaz', false], stawonog: ['Stawonóg', false], mieczak: ['Mięczak', false],
};
const DIETS = { M: 'Mięsożerca', R: 'Roślinożerca', W: 'Wszystkożerca', Ry: 'Rybożerca', P: 'Planktonożerca', O: 'Owadożerca' };
const WEAP = { b: 'bite', c: 'claw', h: 'horn', t: 'tail', r: 'ram', s: 'squeeze', a: 'armor' };
// [Ma lower bound, PL label] — youngest first
const EPOCHS = [[0.0117, 'Holocen'], [2.58, 'Plejstocen'], [5.33, 'Pliocen'], [23.03, 'Miocen'], [33.9, 'Oligocen'], [56, 'Eocen'], [66, 'Paleocen'],
  [100.5, 'Kreda późna'], [145, 'Kreda wczesna'], [161.5, 'Jura późna'], [174.7, 'Jura środkowa'], [201.4, 'Jura wczesna'],
  [237, 'Trias późny'], [247.2, 'Trias środkowy'], [251.9, 'Trias wczesny'], [298.9, 'Perm'], [358.9, 'Karbon'], [419.2, 'Dewon'],
  [443.8, 'Sylur'], [485.4, 'Ordowik'], [538.8, 'Kambr']];
const epoch = ma => (EPOCHS.find(([lo]) => ma < lo) || EPOCHS[EPOCHS.length - 1])[1];
const period = (a, b) => (epoch(a) === epoch(b) ? epoch(a) : `${epoch(a)} – ${epoch(b)}`);

/* ---------- derivation ---------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = Math.round;
function derive(s) {
  const m = clamp((Math.log10(s.mass_kg) - K.logMassMin) / K.logMassSpan, 0, 1);
  const w = s.weapons, { armor = 0, ...offense } = w;
  const vals = Object.entries(offense).map(([k, v]) => v * K.wt[k]), top = Math.max(0, ...vals);
  const W = top + K.atk[3] * (vals.reduce((a, b) => a + b, 0) - top);
  const flier = s.locomotion === 'fly', carn = s.diet === 'M' || s.diet === 'Ry';
  const stats = {
    hp: round(K.hp[0] + K.hp[1] * m ** K.hp[2]),
    attack: round(K.atk[0] + K.atk[1] * m ** K.atk[4] + K.atk[2] * W + (K.atkDiet[s.diet] || 0)),
    defense: round(K.def[0] + K.def[1] * m + K.def[2] * armor),
    speed: round(K.spd[0] + K.spd[1] * s.speed_kmh_est + K.spd[2] * (1 - m) + (flier ? K.spdFly : 0)),
    evade: +(K.evade[0] * (1 - m) ** 2 + (flier ? K.evade[1] : 0)).toFixed(3),
    pack: carn ? K.pack[s.social] : 0,
    size: 1 + K.sizeClass.filter(t => s.mass_kg >= t).length,
    armored: armor >= 2,
    fortress: s.mass_kg >= K.fortressMass && s.diet === 'R' && s.locomotion === 'quad',
  };
  // engine clamps
  stats.attack = clamp(stats.attack, 24, 99); stats.defense = clamp(stats.defense, 24, 99);
  stats.speed = clamp(stats.speed, 18, 99); stats.hp = clamp(stats.hp, 72, 220);
  return stats;
}
// engine body (special move + art) and category
function engineBody(s) {
  const g = s.group, id = s.id;
  if (['teropod', 'dinozaur-wczesny', 'ptak', 'archozaur', 'dinozaurokształtny'].includes(g)) return s.mass_kg < 100 ? 'smalltheropod' : 'theropod';
  const map = { prozauropod: 'sauropod', zauropod: 'sauropod', ceratops: 'ceratopsian', stegozaur: 'stegosaur', ankylozaur: 'ankylosaur',
    ornitopod: 'hadrosaur', hadrozaur: 'hadrosaur', pachycefalozaur: 'pachy', pterozaur: 'pterosaur', zolw: 'turtle', pseudozuch: 'croc',
    krokodylomorf: 'croc', synapsyd: 'synapsid', plaz: 'reptile', 'gad-inny': 'reptile', luskonosny: 'reptile', stawonog: 'bug', mieczak: 'bug' };
  if (g === 'zolw') return 'turtle';
  if (['notozaur', 'plezjozaur'].includes(g)) return 'marine-long';
  if (s.locomotion === 'swim') return s.diet === 'M' || /ichtio|pliozaur|mozazaur/.test(g) ? 'marine' : 'fish';
  if (g === 'ssak') return 'mammal';
  return map[g] || 'reptile';
}
const MARINE = ['notozaur', 'plezjozaur', 'pliozaur', 'ichtiozaur', 'mozazaur', 'zolw'];
function engineCategory(s) {
  if (GROUPS[s.group][1] === true || s.group === 'archozaur' || s.group === 'dinozaurokształtny') return 'dino';
  if (s.group === 'pterozaur') return 'ptero';
  if (s.locomotion === 'swim' || MARINE.includes(s.group)) return 'marine';
  return s.group === 'ssak' ? 'mammal' : 'other';
}

/* ---------- build ---------- */
const ex = fs.existsSync(path.join(OUT, 'extracted.json')) ? require('./extracted.json') : { opus: [], gpt: [] };
const genus = s => s.toLowerCase().split(/\s+/)[0];
const species = R.map(([id, pl, latin, group, maFrom, maTo, diet, len, h, mass, loco, kmh, weap, social, weapPl, unc, note]) => {
  const weapons = Object.fromEntries(weap.split(/\s+/).filter(Boolean).map(t => [WEAP[t[0]], +t.slice(1)]));
  const o = ex.opus.find(x => genus(x.lat) === genus(latin)), g = ex.gpt.find(x => genus(x.latin) === genus(latin));
  const s = { id, name_pl: pl, name_lat: latin, group, group_pl: GROUPS[group][0], is_dinosaur: GROUPS[group][1],
    period_pl: period(maFrom, maTo), ma: [maFrom, maTo], diet, diet_pl: DIETS[diet],
    length_m: len, height_m: h, wingspan_m: WINGSPAN[id] ?? null, mass_kg: mass, locomotion: loco, speed_kmh_est: kmh,
    weapons, weapons_pl: weapPl, social, uncertainty: unc, note,
    legacy: { opus: o?.id ?? null, gpt: g?.id ?? null }, aliases: [...new Set([...(o?.alias || []), ...(g?.alias || [])])] };
  s.category = engineCategory(s); s.body = engineBody(s);
  s.stats = derive(s);
  return s;
});
fs.writeFileSync(path.join(OUT, 'species.json'), JSON.stringify(species, null, 1));

/* ---------- ChatGPT engine (verbatim), with battleProfile swappable ---------- */
const html = fs.readFileSync(path.join(ROOT, 'dino_lapacz_chatgpt.html'), 'utf8');
const engineSrc = html.slice(html.indexOf('const bodyBattleStats'), html.indexOf('function battleRecord'))
  + html.slice(html.indexOf('function chooseBattleArena'), html.indexOf('function fighterPreviewHTML'));
const helpers = `function normalize(s=''){return String(s).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9]+/g,' ').trim();}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function battleRecord(){return {wins:0,losses:0}}`;
const makeEngine = override => new Function('OVR', `${helpers}\n${engineSrc}\n${override ? 'function battleProfile(c){return OVR(c)}' : ''}\nreturn {simulateBattle, battleProfile};`);
const ours = c => { const s = c.stats; return { c, id: c.id, name: c.name_pl, body: c.body, category: c.category === 'mammal' ? 'other' : c.category,
  size: s.size, attack: s.attack, defense: s.defense, speed: s.speed, hp: s.hp, packChance: s.pack, giantSauropod: s.fortress,
  armored: s.armored, evadeBonus: s.evade, traits: [], seed: 0 }; };
const OUR = makeEngine(true)(ours), GPT = makeEngine(false)();
const winRate = (eng, a, b) => { let w = 0; for (let i = 0; i < FIGHTS; i++) w += eng.simulateBattle(a, b).winner.id === a.id; return w / FIGHTS; };

module.exports = { OUR, GPT, K, derive, species };
if (require.main === module) report();
function report() {
const by = Object.fromEntries(species.map(s => [s.id, s]));
const gptRaw = Object.fromEntries(ex.gpt.map(g => [g.id, g]));
const toGpt = s => s.legacy.gpt && { name: gptRaw[s.legacy.gpt].name, latin: gptRaw[s.legacy.gpt].latin, category: gptRaw[s.legacy.gpt].category,
  body: gptRaw[s.legacy.gpt].body, diet: gptRaw[s.legacy.gpt].diet, id: s.legacy.gpt };
const SANITY = ['tyrannosaurus-rex', 'triceratops-horridus', 'ankylosaurus-magniventris', 'spinosaurus-aegyptiacus', 'velociraptor-mongoliensis',
  'argentinosaurus-huinculensis', 'mosasaurus-hoffmannii', 'quetzalcoatlus-northropi', 'mammuthus-primigenius', 'smilodon-fatalis', 'compsognathus-longipes'];
const short = id => by[id].name_pl.split(' ')[0].slice(0, 8);
function matrix(eng, pick) {
  const ids = SANITY.filter(id => pick(id));
  const rows = ids.map(a => `| ${short(a)} | ${ids.map(b => (a === b ? '—' : round(100 * winRate(eng, pick(a), pick(b))))).join(' | ')} |`);
  return [`| A \\ B (% A wins) | ${ids.map(short).join(' | ')} |`, `|${'---|'.repeat(ids.length + 1)}`, ...rows].join('\n');
}
const pad = (v, n) => String(v).padStart(n);
const table = ['| id | PL | grupa | dino? | kg | HP | ATK | DEF | SPD | unik | stado | rozm | GPT HP/ATK/DEF/SPD |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...species.map(s => { const t = s.stats, g = s.legacy.gpt && gptRaw[s.legacy.gpt];
    return `| ${s.id} | ${s.name_pl} | ${s.group} | ${s.is_dinosaur === true ? 'tak' : s.is_dinosaur === false ? 'NIE' : '?'} | ${s.mass_kg} | ${t.hp} | ${t.attack} | ${t.defense} | ${t.speed} | ${t.evade} | ${t.pack} | ${t.size}${t.fortress ? 'F' : ''}${t.armored ? 'A' : ''} | ${g ? `${g.hp}/${g.attack}/${g.defense}/${g.speed}` : ''} |`; })].join('\n');

// biggest disagreements: GPT stat vs derived, normalized by engine range
const diffs = species.filter(s => s.legacy.gpt).map(s => { const g = gptRaw[s.legacy.gpt], t = s.stats;
  const d = { hp: (g.hp - t.hp) / 148, attack: (g.attack - t.attack) / 75, defense: (g.defense - t.defense) / 75, speed: (g.speed - t.speed) / 81 };
  const [k, v] = Object.entries(d).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  return { s, g, t, score: Object.values(d).reduce((a, b) => a + Math.abs(b), 0), k, v }; }).sort((a, b) => b.score - a.score).slice(0, 20);
const diffTable = ['| gatunek | masa kg | GPT HP/ATK/DEF/SPD | nowe HP/ATK/DEF/SPD | największa różnica |', '|---|---|---|---|---|',
  ...diffs.map(({ s, g, t, k, v }) => `| ${s.name_pl} | ${s.mass_kg} | ${g.hp}/${g.attack}/${g.defense}/${g.speed} | ${t.hp}/${t.attack}/${t.defense}/${t.speed} | ${k} ${v > 0 ? 'za wysokie' : 'za niskie'} w GPT |`)].join('\n');

// extra niche checks
const PAIRS = [['compsognathus-longipes', 'tyrannosaurus-rex'], ['velociraptor-mongoliensis', 'protoceratops-andrewsi'], ['deinonychus-antirrhopus', 'tenontosaurus-tilletti'],
  ['velociraptor-mongoliensis', 'compsognathus-longipes'], ['stegosaurus-stenops', 'allosaurus-fragilis'], ['triceratops-horridus', 'tyrannosaurus-rex'],
  ['ankylosaurus-magniventris', 'tyrannosaurus-rex'], ['otodus-megalodon', 'livyatan-melvillei'], ['smilodon-fatalis', 'aenocyon-dirus'],
  ['mammuthus-primigenius', 'smilodon-fatalis'], ['ichthyosaurus-communis', 'tyrannosaurus-rex'], ['meganeura-monyi', 'trilobita'],
  ['smok-wawelski', 'silesaurus-opolensis'], ['spinosaurus-aegyptiacus', 'sarcosuchus-imperator'], ['argentinosaurus-huinculensis', 'giganotosaurus-carolinii'],
  ['pachycephalosaurus-wyomingensis', 'velociraptor-mongoliensis'], ['quetzalcoatlus-northropi', 'velociraptor-mongoliensis'], ['titanoboa-cerrejonensis', 'smilodon-fatalis']];
const pairTable = ['| A | B | nowe: % A wygrywa | GPT: % A wygrywa |', '|---|---|---|---|',
  ...PAIRS.map(([a, b]) => { const ga = toGpt(by[a]), gb = toGpt(by[b]);
    return `| ${by[a].name_pl} | ${by[b].name_pl} | ${round(100 * winRate(OUR, by[a], by[b]))} | ${ga && gb ? round(100 * winRate(GPT, ga, gb)) : 'brak'} |`; })].join('\n');

const md = `<!-- generated by derive_stats.js (${FIGHTS} fights/pair) -->
### Macierz: nowe statystyki (silnik GPT bez zmian)
${matrix(OUR, id => by[id])}

### Macierz: obecne statystyki GPT (tylko gatunki obecne w GPT)
${matrix(GPT, id => toGpt(by[id]))}

### Pary kontrolne (nisze)
${pairTable}

### Największe rozbieżności GPT vs dane realne (top 20)
${diffTable}

### Pełna tabela statystyk (${species.length} gatunków)
${table}
`;
fs.writeFileSync(path.join(OUT, 'stats_generated.md'), md);
console.log(md.split('### Największe')[0]);
}
