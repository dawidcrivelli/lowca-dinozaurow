/* Wpisuje ręcznie napisane podpowiedzi/ciekawostki z tmp/review/texts.json do js/species.js
   (dla gatunków bez tekstu z wersji Opus; build_species.js wymaga już usuniętego js/data.js).
   użycie: node tmp/apply_texts.js */
const fs = require('fs'), path = require('path'), F = path.join(__dirname, '../js/species.js');
const T = require('./review/texts.json');
let n = 0;
const src = fs.readFileSync(F, 'utf8').replace(/^  (\{"id":.*\})(,?)$/gm, (line, j, comma) => {
  const s = JSON.parse(j), t = T[s.id];
  if (!t) return line;
  n++; [s.hint, s.fact] = t;
  return '  ' + JSON.stringify(s) + comma;
});
fs.writeFileSync(F, src);
console.log(`js/species.js: ${n}/${Object.keys(T).length} tekstów`);
