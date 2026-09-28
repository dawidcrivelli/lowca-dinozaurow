#!/usr/bin/env node
/* Pobiera z PokeAPI dane 1. generacji i tabelę typów, a z pokemon-tcg-data karty z zestawu „151” (sv3pt5) do tmp/pokeapi/
   (cache: ponowne uruchomienie nic nie pobiera). */
const fs = require('fs'), path = require('path');
const API = 'https://pokeapi.co/api/v2/', DIR = path.join(__dirname, 'pokeapi'), LAST = 151, TYPES = 18;
const TCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/sv3pt5.json';   // api.pokemontcg.io bywa niedostępne
async function get(p, url = API + p) {
  const f = path.join(DIR, p.replace(/\//g, '_') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f));
  const j = await (await fetch(url)).json();
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (let i = 1; i <= LAST; i++) { await get(`pokemon/${i}`); await get(`pokemon-species/${i}`); }
  for (let i = 1; i <= TYPES; i++) await get(`type/${i}`);
  await get('tcg_sv3pt5', TCG);
  console.log('ok', fs.readdirSync(DIR).length);
})();
