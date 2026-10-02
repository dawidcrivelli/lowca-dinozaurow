/* Arkusze wariantów ataków: wiersz = wariant (0‥2), kolumna = chwila t; jeden plik na styl.
   node tmp/rig3d/varsheet.js <id> <styl,styl…> [k=lunge] [m=1]  →  tmp/shots/var/<id>_<styl>.png */
const { execFileSync } = require('child_process'), path = require('path');
const [id, styles, k = 'lunge', m = '1'] = process.argv.slice(2), TS = k === 'hit' ? [.1, .2, .4, .7] : [.25, .45, .6, .8], VS = [0, 1, 2];
const args = styles.split(',').flatMap(s => [`ids=${id}&cols=${TS.length}&w=300&h=220&yaw=.5&poses=` + VS.flatMap(v => TS.map(t => `${k}:${s}:${t}:${v}:${m}`)).join('|'),
  path.join(__dirname, `../shots/var/${id.split('-')[0]}_${k}_${s}.png`)]);
execFileSync('node', [path.join(__dirname, 'vshot.js'), ...args], { stdio: 'inherit' });
