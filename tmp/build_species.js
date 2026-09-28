#!/usr/bin/env node
/* tmp/pokeapi/ (node tmp/fetch.js) + tmp/pl.json (polskie podpowiedzi i ciekawostki) → js/species.js
   tmp/en.json: angielskie opisy z Pokédexu, źródło tłumaczeń do tmp/pl.json. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'pokeapi'), LAST = 151, TYPES = 18;
const load = p => JSON.parse(fs.readFileSync(path.join(DIR, p.replace(/\//g, '_') + '.json')));
const en = arr => arr.filter(x => x.language.name === 'en');
const clean = s => s.replace(/[\f\n­]+/g, ' ').replace(/\s+/g, ' ').trim();
// rzadkość 1–4: legendarne 4, reszta wg sumy statystyk bazowych
const rarity = (sp, bst) => sp.is_legendary || sp.is_mythical ? 4 : bst >= 480 ? 3 : bst >= 380 ? 2 : 1;

const mons = [];
for (let i = 1; i <= LAST; i++) {
  const p = load(`pokemon/${i}`), sp = load(`pokemon-species/${i}`);
  const st = Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat]));
  const bst = Object.values(st).reduce((a, b) => a + b, 0);
  const flav = en(sp.flavor_text_entries), red = flav.find(f => f.version.name === 'red') || flav[0];
  mons.push({
    id: i, name: en(sp.names)[0].name, types: p.types.map(t => t.type.name),
    hp: st.hp, atk: st.attack, def: st.defense, satk: st['special-attack'], sdef: st['special-defense'], spd: st.speed,
    m: p.height / 10, kg: p.weight / 10, rarity: rarity(sp, bst),
    from: (n => n <= LAST ? n : null)(+sp.evolves_from_species?.url.match(/(\d+)\/$/)[1]),   // Pichu & co. z 2. generacji pomijamy
    legend: sp.is_legendary || sp.is_mythical || undefined,
    genus: en(sp.genera)[0].genus, flavor: clean(red.flavor_text),
  });
}
// typ atakujący → {typ broniący: mnożnik}; tylko odstępstwa od 1
const CHART = {};
for (let i = 1; i <= TYPES; i++) {
  const t = load(`type/${i}`), r = t.damage_relations, row = CHART[t.name] = {};
  for (const [k, v] of [['double_damage_to', 2], ['half_damage_to', .5], ['no_damage_to', 0]]) for (const x of r[k]) row[x.name] = v;
}

fs.writeFileSync(path.join(__dirname, 'en.json'), JSON.stringify(mons.map(({ id, name, types, genus, flavor, from }) =>
  ({ id, name, types, genus, flavor, from: from && mons[from - 1].name })), null, 1));
const plFile = path.join(__dirname, 'pl.json'), PL = fs.existsSync(plFile) ? JSON.parse(fs.readFileSync(plFile)) : {};
const rows = mons.map(({ genus, flavor, ...m }) => JSON.stringify({ ...m, ...PL[m.id] }));
fs.writeFileSync(path.join(__dirname, '..', 'js', 'species.js'), `/* ================= POKÉDEX: 151 Pokémonów z 1. generacji =================
   Wygenerowane: node tmp/build_species.js  (dane: PokeAPI, teksty: tmp/pl.json)
   hp/atk/def/satk/sdef/spd = statystyki bazowe z gier · m = wzrost, kg = waga · from = z kogo ewoluuje
   CHART: typ ataku → {typ obrońcy: mnożnik}, brak wpisu = ×1
   Obrazki i głosy z repozytoriów PokeAPI na GitHubie (CORS dozwolony, potrzebny arenie 3D) */
const POKEAPI_RAW = 'https://raw.githubusercontent.com/PokeAPI/';
const ART_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/other/official-artwork/\${id}.png\`;   // duża grafika, ~100 kB
const SPRITE_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/\${id}.png\`;                     // piksele z gier, ~1 kB
const CRY_URL = id => \`\${POKEAPI_RAW}cries/main/cries/pokemon/legacy/\${id}.ogg\`;                        // głos z Red/Blue
const CHART = ${JSON.stringify(CHART)};
const SPECIES = [
  ${rows.join(',\n  ')},
];
if (typeof module !== 'undefined') module.exports = { CHART, SPECIES, ART_URL, SPRITE_URL, CRY_URL };
`);
console.log('-> js/species.js', mons.length);
