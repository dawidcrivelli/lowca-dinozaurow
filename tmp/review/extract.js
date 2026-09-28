// Extracts both species lists + ChatGPT battle profiles into tmp/review/extracted.json
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const opus = require(path.join(ROOT, 'js/data.js')).SPECIES.map(s => ({ id: s.id, pl: s.pl, lat: s.lat, group: s.g, type: s.t, diet: s.d, len: s.sz, pw: s.pw, rarity: s.r, alias: s.alias }));
const html = fs.readFileSync(path.join(ROOT, 'dino_lapacz_chatgpt.html'), 'utf8');
const js = html.slice(html.indexOf("const raw = [];"), html.indexOf('const creaturesBase'));
const battle = html.slice(html.indexOf('const bodyBattleStats'), html.indexOf('function battleRecord'));
const code = `${js}
function normalize(s=''){return String(s).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9]+/g,' ').trim();}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
${battle}
return raw.map(x => { const c = {...x, id: slug(x.latin||x.name)}; const p = battleProfile(c);
  return { id: c.id, name: c.name, latin: c.latin, alias: c.aliases, category: c.category, body: c.body, diet: c.diet, era: c.era,
    size: p.size, attack: p.attack, defense: p.defense, speed: p.speed, hp: p.hp, pack: p.packChance, evade: p.evadeBonus, armored: p.armored, fortress: p.giantSauropod }; });`;
const gpt = new Function(code)();
fs.writeFileSync(path.join(__dirname, 'extracted.json'), JSON.stringify({ opus, gpt }, null, 1));
console.log(opus.length, gpt.length);
