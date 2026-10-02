import re
p = 'js/rig3d.js'; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
rep("""    crush: [700, .45, [.28, { fwd: -.15, nk: .4, hp: .4, jw: 1.1, by: -.05, bp: .1 }], [.45, { fwd: 1, nk: -.35, hp: -.3, jw: 0, by: -.1 }], [.65, { fwd: .9, nk: -.5, hp: -.45, by: -.16, sh: .5 }], [.85, { fwd: .6, jw: .25 }]],""",
"""    // zgniecenie: docisk w dół / szarpnięcie i miażdżenie z obrotem łba / przydepnięcie łapą i gryz z góry
    crush: [[700, .45, [.28, { fwd: -.15, nk: .4, hp: .4, jw: 1.1, by: -.05, bp: .1 }], [.45, { fwd: 1, nk: -.35, hp: -.3, jw: 0, by: -.1 }], [.65, { fwd: .9, nk: -.5, hp: -.45, by: -.16, sh: .5 }], [.85, { fwd: .6, jw: .25 }]],
      [700, .42, [.26, { fwd: -.15, nk: .4, hp: .4, jw: 1.15, bp: .12 }], [.42, { fwd: 1, nk: -.3, hp: -.3, jw: 0, by: -.1 }], [.6, { fwd: .6, bp: .15, by: -.05, nk: -.1, hr: .45, jk: .6, af: .6 }],
        [.8, { fwd: .5, hr: -.35, jk: .5, nk: -.1 }]],
      [700, .55, [.3, { fwd: .2, bp: .35, st: 1, nk: .5, hp: .4, jw: 1, ar: -.4 }], [.55, { fwd: .95, bp: -.3, by: -.16, nk: -.55, hp: -.45, jw: 0, st: .3 }],
        [.75, { fwd: .85, bp: -.25, by: -.18, nk: -.5, hp: -.4, sh: .6, jw: .1 }]]],""")
rep("""    roar: [700, .5, [.25, { fwd: -.15, bp: .2, nk: .5, hp: .55, jw: .3, tl: .2 }], [.5, { fwd: .3, bp: .05, nk: -.05, hp: .15, jw: 1.2, sh: .5, tl: .5, ar: -.5 }], [.82, { fwd: .25, hp: .1, jw: 1, sh: .35, tl: .4 }]],""",
"""    // ryk: łeb w górę / nisko ku wrogowi / omiecenie łbem na boki; ręce machają
    roar: [[700, .5, [.25, { fwd: -.15, bp: .25, nk: .6, hp: .6, jw: .3, tl: .2, ar: -.3 }], [.5, { fwd: .25, bp: .15, nk: .45, hp: .7, jw: 1.25, sh: .45, tl: .5, af: 1, ax: .4 }],
      [.82, { fwd: .2, bp: .1, nk: .3, hp: .5, jw: 1.1, sh: .35, tl: .4, af: .7 }]],
      [700, .5, [.25, { fwd: -.2, by: -.05, bp: .1, nk: .3, hp: .3, jw: .4 }], [.5, { fwd: .4, by: -.16, bp: -.2, nk: -.4, hp: -.05, jw: 1.3, sh: .6, ny: .2, tl: .6, af: .8, ax: .3, sr: .1 }],
        [.82, { fwd: .35, by: -.12, bp: -.15, nk: -.3, jw: 1.1, sh: .45, tl: .5, af: .6 }]],
      [700, .45, [.2, { fwd: -.1, bp: .15, nk: .4, hp: .4, jw: .5, ny: -.8, sy: -.3, hy: -.3 }], [.45, { fwd: .2, bp: .1, nk: .3, hp: .4, jw: 1.25, sh: .3, af: .9 }],
        [.75, { fwd: .2, nk: .3, hp: .4, jw: 1.2, ny: .8, sy: .3, hy: .3, sh: .3, af: .6, tl: .4 }]]],""")
RX2 = {
 'grip': "[0, 0, [.15, { nk: -.3, hp: -.2, ny: .6, hy: .3, jw: .8, by: -.12, sr: -.2, bl: .8, jk: 1 }], [.6, { ny: .3, jk: .7, jw: .5, by: -.06 }]]",
 'flinch': "[0, 0, [.12, { bp: .25, nk: .5, hp: .5, bl: 1, ar: -.8, ax: .5, jw: .5, tl: .5, by: .03 }], [.35, { bp: .1, nk: .2, bl: .6 }]]",
 'poison': "[0, 0, [.2, { sr: .3, ny: .5, bl: .6, jw: .5 }], [.55, { sr: -.25, ny: -.4, by: -.1, wb: 1, nk: -.4, bl: .8 }], [.85, { sr: .1, wb: .6, by: -.05 }]]",
 'squash': "[0, 0, [.15, { fold: .5, by: -.3, nk: -.6, hp: -.4, bl: 1, jw: .6, sq: .6 }], [.45, { fold: .3, by: -.15, sq: -.2 }], [.7, { sq: .1 }]]",
 'knock': "[0, 0, [.12, { sr: .35, sy: .6, ny: .8, hy: .4, hr: .3, jw: .8, bl: 1, tl: .4, ar: -.5, ax: .6 }], [.4, { sr: .12, sy: .2, ny: .3 }]]",
 'spun': "[0, 0, [.15, { sy: -1.4, sr: -.2, ny: -1, hy: -.4, tw: -1.2, bl: 1, jw: .7, by: -.1 }], [.4, { sy: .5, ny: .4, wb: .6 }], [.7, { sy: -.15 }]]",
 'squeeze': "[0, 0, [.2, { sq: -.5, bp: .25, nk: .7, hp: .6, jw: 1.1, bl: 1, jk: .5, af: .6 }], [.65, { sq: -.35, bp: .12, nk: .4, jk: .4, jw: .8 }]]",
 'scare': "[0, 0, [.18, { bp: .3, lf: .7, nk: .4, hp: .4, jw: .7, bl: 1, ar: -.6, af: .5 }], [.55, { by: -.15, nk: -.35, hp: -.3, tl: -.4, bl: .6, jk: .3 }]]",
}
for k, v in RX2.items():
    m = re.search(r"\n    %s: (\[0, 0, .*?\]\]),\n" % k, s)
    assert m, k
    s = s[:m.start(1)] + "[" + m.group(1) + ",\n      " + v + "]" + s[m.end(1):]
open(p, 'w').write(s)
