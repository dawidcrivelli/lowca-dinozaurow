#!/usr/bin/env node
/* Testy silnika walki.  użycie: node tmp/battle_test.js */
const assert = require('assert');
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { newBattle, playRound, TUNE } = require('../js/battle.js');
const by = x => SPECIES.find(s => s.name === x), slot = (f, k) => f.moves.findIndex(x => x.k === k);

// Prastara Moc podnosi 5 statystyk: jedna ⬆️ na scenie, nie pięć
let B = newBattle(by('Articuno'), by('Slowpoke'), () => 0);
const ev = playRound(B, slot(B.a, 'ancient-power')).filter(e => e.stat && e.on === 'a');
assert.strictEqual(ev.length, 1, `zdarzeń stat: ${ev.length}`);
assert.deepStrictEqual(B.a.stage, { atk: 1, def: 1, satk: 1, sdef: 1, spd: 1, acc: 0, eva: 0 });

// leczenie jak w grach: % życia bez mnożnika TUNE.hp
B = newBattle(by('Zapdos'), by('Articuno'), () => 0);
B.a.hp = 100;
const heal = playRound(B, slot(B.a, 'roost')).find(e => e.heal)?.heal;
assert.strictEqual(heal, Math.floor(B.a.hp0 / TUNE.hp / 2), `leczenie ${heal}`);

// zamrożenie najwyżej TUNE.freeze tur, nawet bez szczęścia do odmarzania
B = newBattle(by('Mewtwo'), by('Articuno'), () => .99);
B.a.status = 'freeze'; B.a.sleep = TUNE.freeze;
for (let i = 0; i < 6 && !B.winner; i++) playRound(B, 0);
const frozen = B.events.filter(e => e.skip === 'freeze').length;
assert.ok(frozen <= TUNE.freeze, `zamrożony ${frozen} tur`);
console.log('ok');
