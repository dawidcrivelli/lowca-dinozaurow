/* Pełne walki automatyczne z efektami: widok 3D, wycinanki (mix) i 3D bez rigów (stare bryły, build → null). Błędy JS → „EXC”.
   użycie: node tmp/steps_fxauto.js && timeout 240 node tmp/shot.js tmp/steps_fxauto.json file://$PWD/index.html 430 */
const fs = require('fs'), path = require('path');
const [a = 'dilophosaurus-wetherilli', b = 'argentinosaurus-huinculensis', only] = process.argv.slice(2);
const state = view => `localStorage.setItem('dinoTracker.v2',${JSON.stringify(JSON.stringify(
  { caught: { [a]: { t: 1 }, [b]: { t: 1 } }, rec: {}, added: [], removed: [], settings: { sound: false, mode: 'auto', view } }))});location.reload()`;
const steps = [];
for (const [view, norig] of [['3d'], ['mix'], ['3d', 1]].filter(([v]) => !only || v === only)) steps.push({ js: state(view), wait: 1800 },
  { js: norig ? 'Rig3D.build = Puppet2D.build = () => null' : '1' }, { js: 'btnArena.click()', wait: 300 },
  { js: "document.querySelector('[data-fight]').click()", wait: 4000, shot: `fxauto_${view}${norig ? '_norig' : ''}_mid.png`, h: 800 },
  { wait: 12000, shot: `fxauto_${view}${norig ? '_norig' : ''}_end.png`, h: 1000 }, { js: 'modalClose.click()', wait: 200 });
fs.writeFileSync(path.join(__dirname, 'steps_fxauto.json'), JSON.stringify(steps, null, 1));
