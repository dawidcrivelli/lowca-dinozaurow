/* Build tmp/review/chatgpt_sheet.html: all 100 ChatGPT SVG drawings in a grid. usage: node tmp/review/sheet.js */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../dino_lapacz_chatgpt.html'),'utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);return src.slice(i,j)};
const code=[cut('const raw = [];','function defaultState'),cut('function normalize','function allCreatures'),
 cut('function hashString','const palettes'),cut('const palettes','function makeArt'),'return {creaturesBase,buildArt};'].join('\n');
const {creaturesBase:C,buildArt}=new Function(code)();
const cells=C.map(c=>`<div class=c>${buildArt(c)}<b>#${c.number} ${c.name}</b></div>`).join('');
fs.writeFileSync(path.join(__dirname,'chatgpt_sheet.html'),`<!doctype html><meta charset=utf-8><style>body{margin:0;background:#eef3ee;font:12px sans-serif}.g{display:grid;grid-template-columns:repeat(5,240px);gap:4px;padding:4px}.c{background:#fff;text-align:center}.c svg{width:240px;height:160px;display:block}</style><div class=g>${cells}</div>`);
