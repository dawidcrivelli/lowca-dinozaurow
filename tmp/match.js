#!/usr/bin/env node
/* Pełny zapis walki jak na ekranie.  użycie: node tmp/match.js Zapdos Articuno [ile walk] */
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { newBattle, playRound } = require('../js/battle.js');
const [a, b, n = 1] = process.argv.slice(2), by = x => SPECIES.find(s => s.name === x);
for (let i = 0; i < n; i++) {
  const B = newBattle(by(a), by(b));
  console.log(`--- ${a} (${B.a.hp0}) vs ${b} (${B.b.hp0}) · ${B.arena.name}`);
  while (!B.winner) playRound(B);
  B.events.forEach(e => console.log(`${String(e.round).padStart(2)} ${e.text}  [${e.hp?.a ?? ''}/${e.hp?.b ?? ''}]`));
  console.log('=>', B.winner.name);
}
