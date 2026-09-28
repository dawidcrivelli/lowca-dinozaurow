#!/usr/bin/env node
/* Skleja index.html + css/app.css + js/*.js w jeden plik: dist/lowca-dinozaurow.html
   Użycie:  node build.js  [--no-fonts]
   --no-fonts  usuwa <link> do Google Fonts (dla pracy offline / w artefakcie) */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const noFonts = process.argv.includes('--no-fonts');

const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html');

// CSS
html = html.replace(/<link rel="stylesheet" href="css\/app\.css">/,
  '<style>\n' + read('css/app.css') + '\n</style>');

// JS (kolejność jak w index.html)
html = html.replace(/[ \t]*<script src="js\/(\w+)\.js"><\/script>\n?/g,
  (_, name) => '<script>\n' + read('js/' + name + '.js') + '\n</script>\n');

if (noFonts) {
  html = html.replace(/<link rel="preconnect"[^>]*>\n?/g, '')
             .replace(/<link href="https:\/\/fonts\.googleapis[^>]*>\n?/g, '');
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'lowca-dinozaurow.html');
fs.writeFileSync(out, html);
console.log('->', path.relative(root, out), (html.length / 1024).toFixed(0) + ' kB',
  noFonts ? '(bez Google Fonts)' : '');
