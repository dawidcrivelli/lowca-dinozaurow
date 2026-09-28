#!/usr/bin/env node
/* Pobiera z PokeAPI dane 1. generacji i tabelę typów do tmp/pokeapi/ (cache: ponowne uruchomienie nic nie pobiera). */
const fs = require('fs'), path = require('path');
const API = 'https://pokeapi.co/api/v2/', DIR = path.join(__dirname, 'pokeapi'), LAST = 151, TYPES = 18;
async function get(p) {
  const f = path.join(DIR, p.replace(/\//g, '_') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f));
  const j = await (await fetch(API + p)).json();
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (let i = 1; i <= LAST; i++) { await get(`pokemon/${i}`); await get(`pokemon-species/${i}`); }
  for (let i = 1; i <= TYPES; i++) await get(`type/${i}`);
  console.log('ok', fs.readdirSync(DIR).length);
})();
