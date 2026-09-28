#!/usr/bin/env node
/* Pobiera z PokeAPI dane 1. generacji + Pokémonów z Horyzontów (tmp/horizons.json) i tabelę typów,
   a z pokemon-tcg-data karty z zestawów SERIES (tmp/pick_cards.js) do tmp/pokeapi/
   (cache: ponowne uruchomienie nic nie pobiera). */
const fs = require('fs'), path = require('path');
const API = 'https://pokeapi.co/api/v2/', DIR = path.join(__dirname, 'pokeapi'), LAST = 151, TYPES = 18;
const TCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/';   // api.pokemontcg.io bywa niedostępne
const { SERIES } = require('./pick_cards.js'), { learnset } = require('./moves.js'), HZ = require('./horizons.json'), IDS = [...Array.from({ length: LAST }, (_, i) => i + 1), ...HZ.hz, ...HZ.family].filter((v, i, a) => a.indexOf(v) === i);
const load = p => JSON.parse(fs.readFileSync(path.join(DIR, p.replace(/\//g, '_') + '.json')));
async function get(p, url = API + p) {
  const f = path.join(DIR, p.replace(/\//g, '_') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f));
  const j = await (await fetch(url)).json();
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const i of IDS) { await get(`pokemon/${i}`); await get(`pokemon-species/${i}`); }
  const moves = new Set(['tackle', ...IDS.flatMap(i => learnset(load(`pokemon/${i}`)).moves.map(m => m.name))]);   // ruchy do areny: tmp/moves.js
  for (const m of moves) await get(`move/${m}`);
  for (let i = 1; i <= TYPES; i++) await get(`type/${i}`);
  const sets = (await get('tcg_sets', TCG + 'sets/en.json')).filter(s => SERIES.includes(s.series));
  for (const s of sets) await get(`tcg_${s.id}`, `${TCG}cards/en/${s.id}.json`);
  console.log('ok', fs.readdirSync(DIR).length);
})();
