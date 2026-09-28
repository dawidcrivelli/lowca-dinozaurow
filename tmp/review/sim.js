/* Round-robin balance sim of ChatGPT battle system. usage: node tmp/review/sim.js [N] */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../dino_lapacz_chatgpt.html'),'utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);return src.slice(i,j)};
const code=[cut('const raw = [];','function defaultState'),
 cut('function normalize','function allCreatures'),
 cut('function hashString','function esc'),
 cut('const bodyBattleStats','function fighterPreviewHTML'),
 'return {creaturesBase,battleProfile,simulateBattle};'].join('\n');
const {creaturesBase:C,battleProfile,simulateBattle}=new Function(code)();
const N=+process.argv[2]||40;
const wins={},games={};
for(const a of C)for(const b of C){if(a===b)continue;for(let k=0;k<N;k++){const r=simulateBattle(a,b);games[a.id]=(games[a.id]||0)+1;games[b.id]=(games[b.id]||0)+1;wins[r.winner.id]=(wins[r.winner.id]||0)+1}}
const rows=C.map(c=>{const p=battleProfile(c);return {name:c.name,body:c.body,size:p.size,atk:p.attack,def:p.defense,spd:p.speed,hp:p.hp,pack:Math.round(p.packChance*100),wr:Math.round(1000*wins[c.id]/games[c.id])/10}}).sort((a,b)=>b.wr-a.wr);
console.log('count',C.length);
const byBody={};rows.forEach(r=>(byBody[r.body]=byBody[r.body]||[]).push(r.wr));
console.log('body avg winrate:',Object.entries(byBody).map(([k,v])=>[k,(v.reduce((a,b)=>a+b)/v.length).toFixed(1),v.length]).sort((a,b)=>b[1]-a[1]).map(x=>x.join(':')).join('  '));
console.table(rows);
// timeout frequency and avg rounds
let to=0,tot=0,ev=0;for(let k=0;k<3000;k++){const a=C[k%C.length],b=C[(k*7+3)%C.length];if(a===b)continue;const r=simulateBattle(a,b);tot++;ev+=r.events.length;if(r.events.at(-1).text.startsWith('⏱'))to++}
console.log('timeouts %',(100*to/tot).toFixed(1),'avg events',(ev/tot).toFixed(1));
// headline matchups
const f=n=>C.find(c=>c.name===n);
for(const [x,y] of [['Tyranozaur rex','Kompsognat'],['Argentynozaur','Tyranozaur rex'],['Kompsognat','Argentynozaur'],['Tyranozaur rex','Welociraptor'],['Spinozaur','Tyranozaur rex'],['Mosasaurus','Tyranozaur rex'],['Leedsichthys','Kompsognat'],['Archelon','Tyranozaur rex'],['Quetzalcoatlus','Tyranozaur rex'],['Ankylozaur','Tyranozaur rex']]){let w=0;for(let k=0;k<2000;k++)if(simulateBattle(f(x),f(y)).winner.name===x)w++;console.log(`${x} vs ${y}: ${(w/20).toFixed(1)}%`)}
