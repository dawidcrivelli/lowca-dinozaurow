// debug: node dbg.js <idA> <idB> — win rate, timeouts, sample battle log with derived stats
const { OUR, species } = require('./derive_stats.js');
const by = Object.fromEntries(species.map(s => [s.id, s]));
const [a, b] = process.argv.slice(2);
let w = 0, to = 0;
for (let i = 0; i < 2000; i++) { const r = OUR.simulateBattle(by[a], by[b]); w += r.winner.id === a; to += r.events.some(e => /Koniec/.test(e.text));
  if (i < 2) console.log(r.arena.name + '\n' + r.events.map(e => e.text).join('\n')); }
console.log('A wins', w / 2000, 'timeouts', to / 2000);
