/* Zrzut wszystkich SVG gatunków (kolor+sylwetka+presety) do pliku — porównanie przed/po zmianach w art.js (miniatury muszą być identyczne).
   użycie: node tmp/pup/svgdump.js out.txt && cmp tmp/pup/svg_before.txt out.txt */
const fs = require('fs'), path = require('path'), vm = require('vm'), ROOT = path.join(__dirname, '../..');
for (const f of ['js/artspec.js', 'js/art.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const out = [];
for (const id of Object.keys(ART)) for (const m of ['color', 'ghost']) out.push(id + ' ' + m + ' ' + drawSpecies(id, m));
for (const [k] of ARCH_LIST) out.push(k + ' ' + drawCustom(k, {}, 'color'));
fs.writeFileSync(process.argv[2] || path.join(__dirname, 'svg_before.txt'), out.join('\n'));
console.log(out.length, 'svgs');
