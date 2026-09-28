// Dumps working table: species.json order (re-sorted) + Opus hint/fact/rarity + GPT hint, for writing js/species.js
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '../..');
const S = require(path.join(ROOT, 'tmp/review/species.json'));
const opus = Object.fromEntries(require(path.join(ROOT, 'js/data.js')).SPECIES.map(s => [s.id, s]));
const html = fs.readFileSync(path.join(ROOT, 'dino_lapacz_chatgpt.html'), 'utf8');
const js = html.slice(html.indexOf('const raw = [];'), html.indexOf('const creaturesBase'));
const gptRaw = new Function(js.replace(/\n\s*const creaturesBase[\s\S]*/, '') + ';return raw;')();
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const gpt = Object.fromEntries(gptRaw.map(x => [slug(x.latin || x.name), x]));
for (const s of S) {
  const o = opus[s.legacy.opus] || {}, g = gpt[s.legacy.gpt] || {};
  console.log(`## ${s.id} ${s.name_pl} [${s.category}/${s.group}]\n O-h: ${o.h || ''}\n O-f: ${o.f || ''}  r=${o.r || ''}\n G-h: ${g.hint || ''}`);
}
