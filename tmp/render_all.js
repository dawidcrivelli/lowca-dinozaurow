/* Renderuje wszystkie gatunki do jednego arkusza SVG/HTML do przeglądu.
   Użycie:  node tmp/render_all.js  ->  tmp/sheet.html  (+ tmp/sheet.png jeśli jest cairosvg) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const D = require(path.join(root, 'js/data.js'));
global.PAL = D.PAL;
eval(fs.readFileSync(path.join(root, 'js/art.js'), 'utf8'));

const only = process.argv[2];
const list = only ? D.SPECIES.filter(s => s.id.includes(only) || s.a === only) : D.SPECIES;

const cells = list.map(s => `
  <div class="c">
    <div class="art">${drawSpecies(s, 'full')}</div>
    <div class="gh">${drawSpecies(s, 'ghost')}</div>
    <b>${s.pl}</b><i>${s.a}</i>
  </div>`).join('');

fs.writeFileSync(path.join(__dirname, 'sheet.html'), `<!doctype html><meta charset="utf-8">
<style>body{background:#EDE3D0;font:13px/1.3 system-ui;margin:0;padding:16px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.c{background:#fff;border-radius:12px;padding:6px;text-align:center;box-shadow:0 1px 3px #0002}
.art,.gh{display:block}svg{width:100%;height:auto;display:block}
.gh{opacity:.9;background:#F4EEE1;border-radius:8px;margin-top:4px}
b{display:block}i{color:#888;font-size:11px}</style>
<div class="g">${cells}</div>`);
console.log('tmp/sheet.html:', list.length, 'gatunków');
