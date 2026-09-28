#!/usr/bin/env node
/* Kontrolne pojedynki i ranking na silniku z js/battle.js.  użycie: node tmp/sim.js */
const { CHART, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART });
const { autoBattle } = require('../js/battle.js');
const N = 400, by = n => SPECIES.find(s => s.name === n);
const winRate = (a, b) => { let w = 0; for (let i = 0; i < N; i++) w += autoBattle(a, b).winner.id === a.id; return w / N; };
for (const [a, b] of [['Pikachu', 'Squirtle'], ['Charizard', 'Blastoise'], ['Mewtwo', 'Magikarp'], ['Snorlax', 'Gengar'], ['Gastly', 'Rattata'],
  ['Onix', 'Pikachu'], ['Gyarados', 'Dragonite'], ['Bulbasaur', 'Charmander'], ['Mew', 'Mewtwo'], ['Caterpie', 'Weedle']])
  console.log(`${a} vs ${b}: ${(100 * winRate(by(a), by(b))).toFixed(0)}%`);
// ranking: średnia skuteczność przeciw wszystkim
const R = SPECIES.map(a => [a.name, SPECIES.reduce((t, b) => t + (a === b ? 0 : autoBattle(a, b).winner.id === a.id), 0) / (SPECIES.length - 1)]).sort((x, y) => y[1] - x[1]);
console.log('top', R.slice(0, 8).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(', '));
console.log('dół', R.slice(-5).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(', '));
const rounds = []; for (let i = 0; i < 2000; i++) { const B = autoBattle(SPECIES[i % 151], SPECIES[(i * 7) % 151]); rounds.push(B.round - 1); }
console.log('średnio rund', (rounds.reduce((a, b) => a + b) / rounds.length).toFixed(1), 'limit czasu', rounds.filter(r => r >= 8).length / 20 + '%');
