p = 'tmp/rig3d/vview.html'; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
rep("<!-- Arkusz", "<!-- vview: jak view.html + &poses=k:styl:t:wariant:strona|… (komórka n = poza n; jeden id powtarzany)\n     Arkusz")
rep("const ids = Q.get('ids') === 'all' ? SPECIES.map(s => s.id) : (Q.get('ids') || 'tyrannosaurus-rex').split(',');\nconst [pk, sty = 'bite', pt = '.5'] = (Q.get('pose') || 'idle').split(':'),",
    "const PO = Q.get('poses')?.split('|') || [], ids0 = Q.get('ids') === 'all' ? SPECIES.map(s => s.id) : (Q.get('ids') || 'tyrannosaurus-rex').split(',');\nconst ids = PO.length > ids0.length ? PO.map((_, i) => ids0[i % ids0.length]) : ids0;\nconst")
rep("ids.forEach((id, n) => {\n", "ids.forEach((id, n) => {\n  const [pk, sty = 'bite', pt = '.5', pv, pm = '1'] = (PO[n] || Q.get('pose') || 'idle').split(':');\n")
rep("if (rig) {   //", "if (rig && pv != null) { rig.fv = +pv; rig.fm = +pm; }\n  if (rig) {   //")
rep("textContent: `${id.split('-')[0]} · ${key} · ${Math.round(tris)}△${rig ? '' : ' · NULL'}`", "textContent: `${id.split('-')[0]} · ${PO[n] || key}`")
open(p, 'w').write(s)
