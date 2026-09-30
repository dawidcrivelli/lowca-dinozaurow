#!/usr/bin/env node
/* Dziwne tury: ile ⬆️ w jednej rundzie, ile leczeń na walkę, najdłuższe zamrożenie/sen.  użycie: node tmp/match_stats.js [A B] */
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { autoBattle } = require('../js/battle.js');
const [a, b] = process.argv.slice(2), by = x => SPECIES.find(s => s.name === x), N = 3000, n = SPECIES.length;
const S = { multiStat: 0, heals: [], maxHeals: 0, skipRun: 0, fights: 0 };
for (let i = 0; i < N; i++) {
  const B = a ? autoBattle(by(a), by(b)) : autoBattle(SPECIES[i % n], SPECIES[(i * 7 + 3) % n]); S.fights++;
  const per = {}, runs = {};
  let h = 0;
  for (const e of B.events) {
    if (e.stat) per[e.round + e.on] = (per[e.round + e.on] || 0) + 1;
    if (e.heal) h++;
    if (['freeze', 'sleep'].includes(e.skip)) { runs[e.as] = (runs[e.as] || 0) + 1; S.skipRun = Math.max(S.skipRun, runs[e.as]); } else if (e.as && e.move) runs[e.as] = 0;
  }
  S.multiStat += Object.values(per).some(v => v > 1); S.heals.push(h); S.maxHeals = Math.max(S.maxHeals, h);
}
console.log(`walk z ≥2 ⬆️/⬇️ w rundzie: ${(100 * S.multiStat / N).toFixed(1)}% · leczeń/walkę śr ${(S.heals.reduce((x, y) => x + y) / N).toFixed(2)} max ${S.maxHeals} · najdłuższy sen/lód z rzędu ${S.skipRun}`);
