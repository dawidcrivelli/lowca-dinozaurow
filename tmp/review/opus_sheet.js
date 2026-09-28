/* Contact sheet of all Opus species (full + ghost), grouped by archetype.
   usage: node tmp/review/opus_sheet.js -> tmp/review/opus_sheet.html */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
const D = require(path.join(root, 'js/data.js'));
global.PAL = D.PAL;
eval(fs.readFileSync(path.join(root, 'js/art.js'), 'utf8'));
const cells = D.SPECIES.map((s, i) => `<div class="c"><div>${drawSpecies(s, 'full')}</div>
  <b>${i + 1}. ${s.pl}</b><i>${s.a} · ${s.id}</i></div>`).join('');
fs.writeFileSync(path.join(__dirname, 'opus_sheet.html'), `<!doctype html><meta charset="utf-8">
<style>body{background:#EDE3D0;font:12px/1.2 system-ui;margin:0;padding:8px}
.g{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}
.c{background:#fff;border-radius:8px;padding:3px;text-align:center}
svg{width:100%;height:auto;display:block}b{display:block}i{color:#888;font-size:10px}</style>
<div class="g">${cells}</div>`);
console.log(D.SPECIES.length, 'species');
