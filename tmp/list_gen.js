// Gatunki z tekstem generowanym: podpowiedź "Grupa (Epoka), rozmiar" albo ciekawostka = opis uzbrojenia
const { SPECIES } = require('../js/species.js');
const gen = SPECIES.filter(s => /\), (mały|średni|duży|olbrzym)$/.test(s.hint) || s.fact.toLowerCase() === s.weaponsTxt.toLowerCase() + '.');
for (const s of gen) console.log([s.id, s.name, s.latin, s.group, s.kg + 'kg', s.len + 'm', s.ma.join('-') + 'Ma', 'H: ' + s.hint, 'F: ' + s.fact].join(' | '));
