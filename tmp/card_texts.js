/* przegląd opisów ataków na naszych kartach → jakie efekty warto obsłużyć w js/cards.js.  użycie: node tmp/card_texts.js */
const fs = require('fs'), path = require('path'), pick = require('./pick_cards.js');
const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'pokeapi', f + '.json')));
const TCG = Object.fromEntries(load('tcg_sv3pt5').map(c => [c.number, c])), E = require('./en.json');
const texts = E.flatMap(e => ((e.id <= 151 ? TCG[e.id] : pick(e.id, e.name))?.attacks || []).filter(a => a.text).map(a => a.text));
const PAT = { poison: /is now Poisoned/, burn: /is now Burned/, paralyze: /is now Paralyzed/, sleep: /is now Asleep/, confuse: /is now Confused/,
  coin: /^Flip a coin\. If heads/, heal: /Heal \d+ damage from this Pokémon/, bench: /damage to 1 of your opponent's Benched/, self: /damage to itself/,
  discard: /Discard (an|\d+|all) Energy/, noAtk: /can't attack/, less: /takes \d+ less damage/, draw: /Draw|search your deck/i, attachDeck: /from your deck/ };
const n = Object.fromEntries(Object.keys(PAT).map(k => [k, texts.filter(t => PAT[k].test(t)).length]));
console.log('ataków z opisem', texts.length, n);
console.log(texts.filter(t => !Object.values(PAT).some(r => r.test(t))).slice(0, 40).join('\n'));
