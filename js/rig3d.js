/* ================= BRYŁY 3D Z KOŚĆMI (tryb 'model') — kontrakt RIG w js/arena3d.js =================
   Jeden SkinnedMesh na zawodnika: tułów to rurka od czubka ogona do nosa, nogi/ręce/płetwy to rurki, żagle i błony to płachty,
   a rogi, zęby, pazury, płyty, oczy i powieki to sztywne bryły przypięte do jednej kości. Kolory w wierzchołkach
   (grzbiet → brzuch, pręgi, ziarno łusek) → 1 materiał, 1 rysowanie, kilka tys. trójkątów.

        ogon t5 … t0 ── miednica ── tułów ── pierś ── szyja n0 … nN ── głowa ─┬─ żuchwa (zęby)
                           │                  │                              ├─ oko + powieka (×2)
                 udo─goleń─śródstopie─palce   ramię─przedramię─dłoń /        └─ rogi, kryza, grzebień, trąba
                                              przednia noga (czworonogi)
   Ruch = klucze póz (kanały niżej) + oddech, kołysanie, mruganie, wzrok na przeciwnika.
   Stopy: IK dwóch kości w płaszczyźnie boku (kości nóg obracają się tylko wokół z); gdy ciało jedzie (wypad), stopy stoją
   w miejscu i przestawiają się krokami. Kości w spoczynku nie są obrócone → kąt kości = suma obrotów w łańcuchu. */
window.Rig3D = (() => {
  let T;
  const RING = 12, SEG = 4, U = 1 / 40;    // wierzchołki pierścienia; próbki między kluczami rurki; jednostka rysunku SVG → wysokość biodra
  const COL = { mouth: 0x8E3236, eye: 0xE8B53C, pupil: 0x151210, ivory: 0xF2E7CC, claw: 0x34291F, horn: 0x5A4A3A };
  const STEP = { len: .3, s: .16, h: .14 }; // krok: próg odjechania stopy, czas [s], uniesienie (× wysokość biodra)
  const BLINK = 3.3, LID = .5;               // średni odstęp mrugnięć [s]; uchylenie powieki (rad, 0 = pół-przymknięta)
  const LEN_K = .65;                         // jak w arena3d: ile długości liczy się jak wysokość
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- ruchy: [ms, ułamek trafienia, ...klucze [t, {kanał: wartość}]] — brak kanału w kluczu = 0, gładko między kluczami
     korzeń (arena): fwd, up [m], pit, yaw · miednica: by (przysiad × biodro), bp (dęba), sr (przechył) · kręgosłup: sb, sy
     szyja nk, ny · głowa hp, hy, hr · jw pysk · ogon tl (unieś), tw (zamach, z opóźnieniem w dół ogona)
     ar ręce/łapy w przód · lf przednie nogi w powietrzu · kk kopnięcie · st tupnięcie · fold podkulenie · sh potrząsanie · bl powieki */
  const CH = 'fwd up pit yaw by bp sr sb sy nk ny hp hy hr jw tl tw ar lf kk st fold sh bl wg fp tr'.split(' ');
  const BI = {
    bite: [640, .48, [.3, { fwd: -.15, bp: .12, nk: .4, hp: .35, jw: 1, tl: .25, by: -.05 }], [.48, { fwd: 1, bp: -.15, nk: -.3, hp: -.25, jw: 0, tl: -.1, by: -.08 }],
      [.7, { fwd: .8, bp: -.08, nk: -.15, hp: -.1, jw: .15, sh: 1 }]],
    shake: [700, .4, [.25, { fwd: -.2, bp: .15, nk: .55, hp: .4, jw: 1, tl: .35, by: -.1 }], [.4, { fwd: 1.05, bp: -.15, nk: -.3, hp: -.3, jw: 0 }],
      [.85, { fwd: .75, bp: .05, nk: .15, hp: .1, jw: .05, sh: 1.8 }]],
    claw: [620, .5, [.3, { fwd: .1, bp: .3, ar: -1.2, nk: .3, hp: .25, jw: .6, tl: -.15 }], [.5, { fwd: .85, bp: .05, ar: 1.3, nk: -.1, jw: .8 }], [.72, { fwd: .6, ar: .5, jw: .3 }]],
    tail: [700, .55, [.28, { yaw: -.45, sy: -.4, tw: -.8, by: -.06, nk: .15 }], [.55, { yaw: 2.3, fwd: .4, sy: .5, tw: 1.2, nk: .25, hy: -.3 }], [.8, { yaw: 1.1, fwd: .2, tw: .3 }]],
    kick: [620, .5, [.3, { by: -.15, bp: .2, kk: -.3, ar: -.6, nk: .25, tl: .2 }], [.5, { fwd: .9, up: .35, bp: .4, kk: 1, ar: .8, tl: .45, jw: .7 }], [.72, { fwd: .5, kk: .2, up: .05 }]],
    pounce: [700, .55, [.3, { by: -.28, bp: -.1, nk: -.15, ar: -.6, tl: .25 }], [.55, { fwd: 1.2, up: .75, pit: .15, kk: .9, ar: 1.1, jw: 1, tl: .45 }], [.78, { fwd: .8, kk: .3, jw: .2, by: -.1 }]],
    peck: [560, .5, [.32, { fwd: -.1, nk: .5, hp: .35, jw: .5, bp: .1 }], [.5, { fwd: .8, nk: -.55, hp: -.45, jw: .1, bp: -.25 }], [.66, { fwd: .6, nk: -.3, jw: .4 }]],
    headbutt: [620, .5, [.3, { fwd: -.2, nk: .3, hp: .2, by: -.1, bp: .12 }], [.5, { fwd: 1.1, nk: -.5, hp: -.7, bp: -.25, by: -.12 }], [.66, { fwd: .75, nk: -.3, hp: -.3 }]],
    charge: [700, .52, [.22, { fwd: -.25, nk: .15, by: -.1 }], [.52, { fwd: 1.3, nk: -.55, hp: -.7, bp: -.3, by: -.12, tl: .2 }], [.68, { fwd: .9, nk: -.2, hp: .1 }]],
    stomp: [660, .55, [.35, { fwd: .2, bp: .4, by: .04, nk: .45, hp: .3, st: 1, jw: .6, ar: -.5 }], [.55, { fwd: .75, bp: -.12, nk: -.15, jw: .3, by: -.08 }], [.72, { fwd: .6, by: -.04 }]],
    thumb: [600, .5, [.3, { fwd: .05, bp: .2, ar: -1, nk: .2 }], [.5, { fwd: .85, bp: .05, ar: 1.4, nk: -.1, hp: -.1 }], [.72, { fwd: .6, ar: .4 }]],
  };
  BI.fire = BI.shake;
  // czworonogi: ar = przednia łapa w przód (zamach), lf = przednie nogi w górę (dęba), tr = trąba
  const QU = {
    gore: [660, .5, [.3, { fwd: -.2, by: -.1, nk: .3, hp: .45, bp: .06 }], [.5, { fwd: 1.05, nk: -.35, hp: -.6, bp: -.1, by: -.12 }], [.68, { fwd: .8, nk: .1, hp: .35, jw: .3 }]],
    headbutt: BI.headbutt, charge: BI.charge, pounce: BI.pounce,
    stomp: [700, .58, [.38, { fwd: .15, bp: .45, lf: 1, nk: .35, hp: .2, jw: .5, tl: -.2 }], [.58, { fwd: .7, bp: -.05, by: -.08, nk: -.1, jw: .2 }], [.75, { fwd: .55 }]],
    rear: [700, .55, [.4, { fwd: .1, bp: .7, lf: 1, nk: -.35, hp: .2, tl: -.3, jw: .5 }], [.55, { fwd: .8, bp: .1, nk: -.2, by: -.06 }], [.75, { fwd: .6 }]],
    tail: [700, .55, [.28, { yaw: .45, sy: .4, tw: .8, nk: .1 }], [.55, { yaw: -2.4, fwd: .35, sy: -.5, tw: -1.4, ny: .4 }], [.8, { yaw: -1.2, fwd: .2, tw: -.3 }]],
    neck: [700, .52, [.3, { fwd: -.1, ny: -1.2, nk: .2, hy: -.3 }], [.52, { fwd: .55, ny: 1.1, nk: -.5, hy: .4, hp: -.2 }], [.75, { fwd: .4, ny: .3 }]],
    club: [680, .56, [.3, { yaw: .5, sy: .5, tw: 1.2, tl: .4, by: -.08 }], [.56, { yaw: -2.6, fwd: .3, sy: -.6, tw: -1.8, tl: .2 }], [.8, { yaw: -1.3, fwd: .15, tw: -.4 }]],
    roll: [720, .55, [.3, { fwd: -.1, by: -.15, sr: .35, tw: .5 }], [.55, { yaw: -2.2, fwd: .5, sr: -.4, tw: -1.6, tl: .3 }], [.8, { yaw: -1, fwd: .3, tw: -.3 }]],
    spin: [720, .6, [.25, { yaw: .3, by: -.08, tw: .5, tl: .3 }], [.6, { yaw: -3.6, fwd: .35, tw: -1.8, tl: .4 }], [1, { yaw: -2 * Math.PI }]],
    bite: [620, .48, [.3, { fwd: -.15, nk: .35, hp: .3, jw: 1, by: -.06 }], [.48, { fwd: .95, nk: -.3, hp: -.25, jw: 0, by: -.1 }], [.7, { fwd: .75, sh: .8, jw: .1 }]],
    claw: [640, .5, [.3, { bp: .3, lf: .6, ar: -1, nk: .2, jw: .6 }], [.5, { fwd: .85, bp: .1, lf: .4, ar: 1.2, jw: .8 }], [.72, { fwd: .6, ar: .3 }]],
    tusk: [660, .52, [.3, { fwd: -.15, nk: .4, hp: .4, tr: .6, by: -.05 }], [.52, { fwd: 1, nk: -.4, hp: -.55, ny: .3, tr: -.4 }], [.72, { fwd: .7, nk: .2, hp: .3, tr: .3 }]],
    trunk: [660, .5, [.32, { fwd: 0, nk: .3, hp: .4, tr: 1.6, jw: .4 }], [.5, { fwd: .75, nk: -.1, hp: -.2, tr: -1.2 }], [.72, { fwd: .55, tr: .4 }]],
  };
  QU.croll = [760, .5, [.3, { fwd: .9, jw: 1, nk: -.1 }], [.42, { fwd: .9, jw: 0 }], [.75, { fwd: .7, sr: Math.PI * .9, tw: 1 }], [1, { fwd: 0, sr: 0 }]];
  // reakcje (wspólne): trafienie, unik, nokaut — klucz 1 nokautu zostaje (leży)
  const REACT = {
    hit: [0, 0, [.18, { nk: .4, hp: .5, hy: .25, jw: .7, by: -.08, bp: .15, sr: .12, tl: .45, sy: .3, bl: .8, ar: -.4 }]],
    dodge: [0, 0, [.45, { fold: .8, nk: -.25, hp: -.2, tl: .4, ar: -.6, lf: 1 }]],
    ko: [0, 0, [.25, { nk: .5, hp: .55, jw: .9, bp: .12 }], [1, { fold: 1, lf: 1, nk: -.9, hp: -.35, jw: .45, tl: -.25, by: -.25, bl: 1, ar: .6, sr: .2 }]],
  };
  const GUARD = { by: -.13, nk: -.25, hp: -.2, jw: .35, ar: .6, tl: .25 };
  function comp([ms, hit, ...keys]) {   // klucze → tabele kanałów (tylko użyte)
    keys = [[0, {}], ...keys]; if (keys.at(-1)[0] < 1) keys.push([1, {}]);
    const ch = {}; for (const c of CH) if (keys.some(k => k[1][c])) ch[c] = keys.map(k => k[1][c] || 0);
    return { ms, hit, ts: keys.map(k => k[0]), ch };
  }
  const MOVES = { biped: BI, quad: QU }, REAC = {};
  for (const tab of [...Object.values(MOVES), REACT]) for (const k in tab) tab[k] = comp(tab[k]);
  Object.assign(REAC, REACT);
  const curve = (A, c, t) => { const v = A.ch[c]; if (!v) return 0; const ts = A.ts; t = Math.min(1, Math.max(0, t));
    let i = 0; while (i < ts.length - 2 && t > ts[i + 1]) i++;
    return v[i] + (v[i + 1] - v[i]) * sm(ts[i], ts[i + 1], t); };

  /* ---------- geometria: wierzchołki z kolorem i wagami kości ---------- */
  function maker(ctx) {
    const bones = [], pos = [], col = [], si = [], sw = [], idx = [];
    const [SKIN, BELLY, DARK] = ctx.P.map(c => new T.Color(c)), C = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, new T.Color(v)]));
    const tmp = new T.Color(), Z = new T.Vector3(0, 0, 1), Y = new T.Vector3(0, 1, 0), V = (x, y, z = 0) => new T.Vector3(x, y, z);
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), S3 = new T.Vector3();
    const m = { bones, SKIN, BELLY, DARK, C, V, tmp, stripes: 0, spots: 0 };
    const vert = (p, c, b0, b1 = b0, w = 1) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b);
      si.push(b0.userData.i, b1.userData.i, 0, 0); sw.push(w, 1 - w, 0, 0); return pos.length / 3 - 1; };
    const grain = p => Math.sin(p.x * 41 + Math.sin(p.z * 37 + p.y * 29) * 3) * Math.sin(p.y * 53 + p.x * 17);   // ziarno łusek
    // skóra: brzuch jasny → grzbiet w kolorze → ciemny pas na szczycie, opcjonalne pręgi/cętki, ziarno
    m.skin = (h, p) => {
      const dark = Math.max(0, h - .6) * .5 + (m.stripes && h > -.25 && Math.sin(p.x * m.stripes + Math.sin(p.z * 9) * .4) > .5 ? .38 : 0)
        + (m.spots && h > -.3 && grain(p.clone().multiplyScalar(m.spots)) > .45 ? .3 : 0);
      return tmp.copy(BELLY).lerp(SKIN, sm(-.5, .15, h)).lerp(DARK, dark).multiplyScalar(1 + .07 * grain(p));
    };
    m.flat = c => () => c;
    m.bone = (par, p) => { const b = new T.Bone(); b.userData = { i: bones.length, w: p.clone() };
      b.position.copy(p); if (par) { b.position.sub(par.userData.w); par.add(b); } bones.push(b); return b; };
    /* rurka po kluczach [x, y, z, rGóra, rBok, kość, rDół?]; paint(h, p, u): h 1 grzbiet … -1 spód, u 0‥1 wzdłuż */
    m.tube = (keys, paint = m.skin) => {
      const cp = new T.CatmullRomCurve3(keys.map(k => V(k[0], k[1], k[2]))), cr = new T.CatmullRomCurve3(keys.map(k => V(k[3], k[4], k[6] ?? k[3])));
      const N = (keys.length - 1) * SEG, base = pos.length / 3;
      for (let s = 0; s <= N; s++) {
        const u = s / N, i = Math.min(keys.length - 2, Math.floor(s / SEG)), f = s / SEG - i;
        const c = cp.getPoint(u), t = cp.getTangent(u), up = Z.clone().cross(t).normalize(), side = t.clone().cross(up), r = cr.getPoint(u);
        for (let j = 0; j < RING; j++) {
          const a = j / RING * 2 * Math.PI, h = Math.cos(a), p = c.clone().addScaledVector(up, h * (h > 0 ? r.x : r.z)).addScaledVector(side, Math.sin(a) * r.y);
          vert(p, paint(h, p, u), keys[i][5], keys[i + 1][5], 1 - sm(0, 1, f));
        }
      }
      for (let s = 0; s < N; s++) for (let j = 0; j < RING; j++) {
        const a = base + s * RING + j, b = base + s * RING + (j + 1) % RING; idx.push(a, b, a + RING, b, b + RING, a + RING); }
      const c0 = vert(cp.getPoint(0), paint(0, cp.getPoint(0), 0), keys[0][5]), c1 = vert(cp.getPoint(1), paint(0, cp.getPoint(1), 1), keys.at(-1)[5]);
      for (let j = 0; j < RING; j++) { const k = (j + 1) % RING; idx.push(base + k, base + j, c0, base + N * RING + j, base + N * RING + k, c1); }
    };
    // gotowa geometria three w układzie ciała po macierzy M4, sztywno na kości b; c: kolor albo (p, l) => kolor (l = punkt przed przekształceniem)
    const part = (g, b, c) => {
      const base = pos.length / 3, a = g.attributes.position, p = V(0, 0), l = V(0, 0);
      for (let i = 0; i < a.count; i++) { l.fromBufferAttribute(a, i); p.copy(l).applyMatrix4(M4); vert(p, c.isColor ? c : c(p, l), b); }
      if (g.index) for (const i of g.index.array) idx.push(base + i); else for (let i = 0; i < a.count; i++) idx.push(base + i);
      g.dispose();
    };
    const at = (p, rot, s) => M4.compose(p, Q.setFromEuler(E.set(...rot || [0, 0, 0])), S3.set(...s));
    m.ball = (b, p, r, c, rot, seg = [10, 7]) => { at(p, rot, r); part(new T.SphereGeometry(1, ...seg), b, c); };
    // stożek od a do tip (róg, ząb, pazur, kolec); kolor c0 u podstawy → c1 na czubku; rz: spłaszczenie w bok
    m.spike = (b, a, tip, r, c0, c1 = c0, n = 6, rz = 1) => {
      const d = tip.clone().sub(a), L = d.length(); d.divideScalar(L);
      M4.compose(a.clone().addScaledVector(d, L / 2), Q.setFromUnitVectors(Y, d), S3.set(1, 1, rz));
      part(new T.ConeGeometry(r, L, n, 1), b, (p, l) => tmp.copy(c0).lerp(c1, sm(-.2, .5, l.y / L)));
    };
    // czasza (powieka): górna półkula promienia r
    m.cap = (b, p, r, c, rot) => { at(p, rot, [r, r, r]); part(new T.SphereGeometry(1, 10, 4, 0, 2 * Math.PI, 0, Math.PI / 2), b, c); };
    /* płachta (żagiel, płetwa, błona, kryza): wiersze punktów [x, y, z, kość, kość2?, w?]; paint(i, j) ∈ 0‥1 */
    m.sheet = (rows, paint) => {
      const base = pos.length / 3, nr = rows.length, nc = rows[0].length;
      rows.forEach((r, i) => r.forEach((k, j) => vert(V(k[0], k[1], k[2]), paint(i / (nr - 1), j / (nc - 1)), k[3], k[4] || k[3], k[5] ?? 1)));
      for (let i = 0; i < nr - 1; i++) for (let j = 0; j < nc - 1; j++) { const a = base + i * nc + j; idx.push(a, a + 1, a + nc, a + 1, a + nc + 1, a + nc); }
    };
    m.mesh = () => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox();
      const mesh = new T.SkinnedMesh(g, new T.MeshPhongMaterial({ vertexColors: true, skinning: true, shininess: 14, specular: 0x2A2A2A, side: T.DoubleSide }));
      mesh.castShadow = true; mesh.frustumCulled = false; return mesh;
    };
    return m;
  }

  /* ---------- głowa: czaszka = koniec rurki tułowia (kość głowy), żuchwa, zęby, oczy z powiekami, nozdrza ----------
     o: { l, h: długość/wysokość, pr: pochylenie (rad, − = nos w dół), prof: kształt (PROF), w: szerokość pyska, teeth, brow, eye, ex, ez }
     c.hp(dx, dy, dz) → punkt w układzie głowy (dx wzdłuż pyska) — do ozdób */
  const PROF = {   // [x/l, y/h, góra, bok, dół] × h
    thero: [[-.15, .08, .42, .4, .4], [.3, .03, .5, .42, .45], [.66, -.07, .34, .32, .3], [.93, -.14, .2, .22, .15]],
    duck: [[-.15, .08, .42, .4, .4], [.3, .05, .45, .38, .4], [.7, -.1, .24, .3, .22], [.97, -.16, .14, .34, .1]],
    cerat: [[-.1, .12, .5, .42, .45], [.35, .05, .52, .4, .5], [.7, -.08, .4, .27, .38], [.95, -.25, .2, .12, .16]],
    mammal: [[-.2, .15, .55, .46, .42], [.15, .12, .6, .47, .45], [.5, -.05, .4, .36, .32], [.82, -.18, .26, .28, .22]],
    sauro: [[-.15, .1, .45, .4, .4], [.3, .12, .55, .42, .4], [.7, -.04, .3, .33, .26], [.95, -.1, .2, .26, .15]],
  };
  function head(m, c, h0, o) {
    const { V, C } = m, l = o.l, hh = o.h, w = o.w || 1, pr = o.pr ?? -.12, ca = Math.cos(pr), sa = Math.sin(pr), hd = m.bone(c.neck.at(-1), h0);
    const P = c.hp = (dx, dy, dz = 0) => V(h0.x + dx * ca - dy * sa, h0.y + dx * sa + dy * ca, dz), lx = p => (p.x - h0.x) * ca + (p.y - h0.y) * sa;
    const K = (dx, dy, t, sd, b, bn = hd) => { const p = P(dx, dy); return [p.x, p.y, 0, t, sd, bn, b]; }, prof = PROF[o.prof || 'thero'];
    c.mouth = (h, p) => o.teeth && h < -.55 && lx(p) > l * .14 && lx(p) < l * .93;
    const jaw = m.bone(hd, P(l * .1, -hh * .28)), jy = -hh * .28;
    m.tube([K(l * .05, jy + hh * .02, hh * .2, hh * .3 * w, hh * .2, jaw), K(l * .45, jy - hh * .12, hh * .15, hh * .27 * w, hh * .15, jaw),
      K(l * .85, jy - hh * .1, hh * .08, hh * .17 * w, hh * .08, jaw), K(l * .95, jy - hh * .07, .01, .01, .01, jaw)], (h, p) => h > .5 && lx(p) > l * .15 ? C.mouth : m.skin(-1, p));
    if (o.teeth) for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {  // zęby: górne na czaszce, dolne na żuchwie
      const f = .3 + i * .1, tl = hh * .17 * o.teeth * (1 - Math.abs(f - .5) * .8), zw = hh * (.36 - f * .16) * w, ty = -hh * (.3 + f * .02);
      m.spike(hd, P(l * f, ty, s * zw), P(l * f + tl * .2, ty - tl, s * zw * .95), hh * .035, C.ivory);
      if (i < 6) m.spike(jaw, P(l * (f + .04), jy - hh * .02, s * zw * .85), P(l * (f + .04) + tl * .15, jy - hh * .02 + tl * .8, s * zw * .8), hh * .03, C.ivory);
    }
    // oczy: gałka (tęczówka + źrenica) na kości oka, powieka na osobnej kości (mruganie)
    const er = hh * .13 * (o.eye || 1);
    c.eyes = [-1, 1].map(s => {
      const p = P(l * (o.ex ?? .22), hh * .2, s * hh * (o.ez ?? .3) * Math.max(1, w * .8)), ball = m.bone(hd, p), lid = m.bone(hd, p);
      m.ball(ball, p, [er, er, er], C.eye); m.ball(ball, p.clone().add(V(0, 0, s * er * .62)), [er * .2, er * .7, er * .45], C.pupil, 0, [8, 6]);
      m.cap(lid, p, er * 1.15, m.DARK.clone().lerp(m.SKIN, .4));
      if (o.brow) m.ball(hd, p.clone().add(V(-er * .2, er * .75, -s * er * .2)), [er * 1.6, er * .55, er * .9], m.SKIN, [0, 0, pr - .15]);   // łuk brwiowy: groźne spojrzenie
      return { ball, lid, s };
    });
    for (const s of [-1, 1]) m.ball(hd, P(l * .9, -hh * .05, s * hh * .1 * w), [hh * .05, hh * .03, hh * .03], m.DARK);
    Object.assign(c, { head: hd, jaw, hl: l, hh });
    return [...prof.map(([fx, fy, t, sd, b]) => K(fx * l, fy * hh, t * hh, sd * hh * w, b * hh)), K(l, (prof.at(-1)[1] - .03) * hh, .01, .01, .01)];
  }

  /* ---------- tułów: miednica → tułów → pierś, szyja, ogon i głowa; jedna rurka od czubka ogona do nosa ----------
     s: { hy: biodro, sy: bark, L: biodro→bark, D/Db/W: promień grzbietu/brzucha/boku, n0: nasada szyi, nv: wektor szyi, nn, ex, ey: wygięcie szyi,
          nw0/nw1: grubość szyi, tl/tn/td/tr/tp: długość, kości, opadanie, grubość, zwężanie ogona, head: dla head() } */
  function trunk(m, c, s) {
    const { V } = m, { hy, L, D, W } = s, sy = s.sy ?? hy + .04, Db = s.Db ?? D * 1.15, nn = s.nn || 3, tn = s.tn || 6;
    const pel = m.bone(null, V(0, hy)), mid = m.bone(pel, V(L * .5, (hy + sy) / 2)), ch = m.bone(mid, V(L, sy));
    c.pelvis = pel; c.spine = [mid, ch];
    for (let i = 0; i < nn; i++) { const f = i / nn; c.neck.push(m.bone(c.neck[i - 1] || ch, s.n0.clone().add(V(s.nv.x * f ** (s.ex || 1), s.nv.y * f ** (s.ey || 1))))); }
    for (let i = 0; i < tn; i++) { const f = i / tn; c.tail.push(m.bone(c.tail[i - 1] || pel, V(-L * .25 - s.tl * f, hy + D * .15 - s.td * f * f))); }
    const tip = V(-L * .25 - s.tl, hy + D * .15 - s.td), h0 = s.n0.clone().add(s.nv), sk = head(m, c, h0, s.head);
    const tr = i => s.tr * Math.pow(1 - i / tn, s.tp || 1.2) + .012, nr = i => s.nw0 + (s.nw1 - s.nw0) * i / Math.max(1, nn - 1);
    m.tube([[tip.x, tip.y, 0, .008, .008, c.tail[tn - 1]], ...c.tail.map((b, i) => { const p = b.userData.w; return [p.x, p.y, 0, tr(i), tr(i) * .9, b, tr(i) * 1.05]; }).reverse(),
      [0, hy + D * .05, 0, D * .95, W, pel, Db * .85], [L * .5, (hy + sy) / 2, 0, D, W * 1.08, mid, Db], [L * .92, sy + D * .05, 0, D * .9, W * .98, ch, Db * .92],
      ...c.neck.map((b, i) => { const p = b.userData.w; return [p.x, p.y, 0, nr(i), nr(i) * .85, b, nr(i) * 1.05]; }), ...sk], (h, p) => c.mouth(h, p) ? m.C.mouth : m.skin(h, p));
    return { pel, mid, ch, h0, P: c.hp };
  }

  /* ---------- noga: biodro → kolano → kostka → podstawa palców → czubek; IK w płaszczyźnie xy ----------
     j: 5 punktów, r: promienie w 4 pierwszych; foot(kość palców, podstawa, czubek) dokłada stopę */
  function leg(m, c, par, j, r, foot, front) {
    const b = []; j.slice(0, 4).forEach((p, i) => b.push(m.bone(b[i - 1] || par, p)));
    const mid = (a, z, f) => a.clone().lerp(z, f), K = (p, r0, bn, rz = r0 * .85) => [p.x, p.y, p.z, r0, rz, bn];
    m.tube([K(j[0].clone().add(m.V(-r[0] * .15, r[0] * 1.3)), r[0] * .45, b[0], r[0] * .3), K(j[0], r[0], b[0], r[0] * .7), K(mid(j[0], j[1], .45), r[0] * .85, b[0], r[0] * .7),
      K(j[1], r[1], b[1]), K(mid(j[1], j[2], .5), r[1] * .82, b[1]), K(j[2], r[2], b[2]), K(mid(j[2], j[3], .5), r[2] * .9, b[2]), K(j[3], r[3], b[3]),
      K(mid(j[3], j[4], .4), r[3] * .7, b[3], r[3]), K(j[4], .01, b[3])], (h, p) => m.skin(h * .5 + .25, p));
    foot?.(b[3], j[3], j[4]);
    const xy = j.map(p => [p.x, p.y]), d = k => [xy[k + 1][0] - xy[k][0], xy[k + 1][1] - xy[k][1]];
    const L = { b, par, front, j: xy, l: [0, 1, 2].map(k => Math.hypot(...d(k))), a: [0, 1, 2, 3].map(k => Math.atan2(d(k)[1], d(k)[0])),
      hip: [j[0].x - par.userData.w.x, j[0].y - par.userData.w.y], side: Math.sign(j[0].z), gx: xy[3][0], st: null };
    const [ax, ay] = [xy[2][0] - xy[0][0], xy[2][1] - xy[0][1]], [kx, ky] = d(0); L.bend = Math.sign(ax * ky - ay * kx) || 1;
    c.legs.push(L); return L;
  }
  // stopy: ptasia (3 palce + paluch, sierp raptora), słoniowa poduszka z paznokciami, kopyto, łapa z pazurami, jaszczurcza
  const FEET = {
    bird: (m, r, sick) => (b, ball, tip) => {
      const { V, C } = m, l = tip.x - ball.x;
      for (const a of [-.38, 0, .38]) { const e = ball.clone().add(V(Math.cos(a) * l, -r * .5, Math.sin(a) * l));
        m.spike(b, ball.clone().add(V(0, -r * .3)), e, r * .75, m.SKIN.clone().lerp(m.DARK, .3)); m.spike(b, e, e.clone().add(V(l * .25, -r * .4, Math.sin(a) * l * .1)), r * .4, C.claw); }
      m.spike(b, ball, ball.clone().add(V(-l * .35, -r * .4, 0)), r * .5, m.SKIN);
      if (sick) m.spike(b, ball.clone().add(V(l * .2, r * .3, 0)), ball.clone().add(V(l * .5, r * 2.2, 0)), r * .45, C.claw, C.ivory);   // sierpowy pazur raptora
    },
    pad: (m, r) => (b, ball) => { const { V, C } = m;
      m.ball(b, ball.clone().add(V(.02, -ball.y * .3)), [r * 1.15, ball.y * .9, r * 1.1], m.SKIN.clone().lerp(m.DARK, .25));
      for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .45; m.ball(b, ball.clone().add(V(Math.cos(a) * r * 1.05, -ball.y * .55, Math.sin(a) * r)), [r * .14, r * .1, r * .12], C.ivory); } },
    hoof: (m, r) => (b, ball, tip) => m.ball(b, ball.clone().lerp(tip, .4).setY(r * .4), [r * 1.1, r * .45, r * .9], m.DARK),
    paw: (m, r, claws) => (b, ball, tip) => { const { V, C } = m;
      for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .32, p = ball.clone().lerp(tip, .55).add(V(0, 0, Math.sin(a) * r * 1.2)).setY(r * .4);
        m.ball(b, p, [r * .42, r * .38, r * .32], m.SKIN); if (claws) m.spike(b, p.clone().add(V(r * .3, 0)), p.clone().add(V(r * .8, -r * .35)), r * .14, C.claw); } },
    liz: (m, r) => (b, ball, tip) => { const { V, C } = m, l = tip.x - ball.x;
      for (const a of [-.7, -.25, .2, .65]) { const e = ball.clone().add(V(Math.cos(a) * l, -r * .4, Math.sin(a) * l * Math.sign(ball.z)));
        m.spike(b, ball, e, r * .45, m.SKIN); m.spike(b, e, e.clone().add(V(l * .2, -r * .3)), r * .25, C.claw); } },
  };

  /* ---------- teropod i inne dwunożne (thero, raptor, ornimim, tbird, dragon, prosauro, hadro, orni, dome) ---------- */
  const HEADS = { rex: [44, 28], tyr: [40, 23], long: [50, 21], allo: [38, 20], short: [28, 24], croc: [54, 15], slim: [34, 15], rap: [30, 13], beak: [20, 11],
    ovi: [19, 18], tiny: [16, 10], bird: [34, 24], gast: [30, 30], duck: [36, 17], iguano: [32, 18], dome: [24, 20], parrot: [18, 18], small: [20, 12], deino: [34, 13] };
  function biped(m, c, o, sp) {
    const { V, C } = m, lg = o.lg || 1, hy = lg, L = (o.bw || 31) * U * 1.1, D = (o.bh || 20) * U * .5, W = D * .78, carn = !o.herb;
    const nk = o.nk || [26, -28], [hl, hh] = (o.hs || HEADS[o.hd] || HEADS.allo).slice(0, 2).map(v => v * U * .62), nw = (o.nw || 20) / 20 * D;
    const { pel, ch, P } = trunk(m, c, { hy, L, D, W, Db: D * 1.2, n0: V(L * 1.05, hy + D * .3), nv: V(nk[0] * U * .62, -nk[1] * U * .62).clampLength(0, L * .6), nn: 3, ex: 1.7, ey: .55,
      nw0: nw * .62, nw1: nw * .5, tl: (o.tl ?? 1) * L * 2, td: (o.td ?? 12) * U * .25, tr: D * .82, tp: 1.25,
      head: { l: hl, h: hh, teeth: carn ? (o.hd === 'rex' ? 1.3 : 1) : 0, brow: carn, w: o.hd === 'duck' ? 1.5 : 1, eye: o.hd === 'rap' ? 1.3 : 1, prof: o.hd === 'duck' ? 'duck' : 'thero' } });
    // nogi: udo w przód, goleń w tył, długie śródstopie (palcochodne)
    for (const s of [-1, 1]) {
      const z = s * W * .55, j = [V(0, hy - .05, z), V(.26 * lg, hy * .5, z * 1.1), V(-.08 * lg, hy * .2, z * 1.1), V(.08, .045, z * 1.1), V(.3 * lg, .02, z * 1.15)];
      leg(m, c, pel, j, [D * .78, D * .36, D * .2, D * .16], FEET.bird(m, D * .16, o.sick), false);
      // ręce: ramię → przedramię → dłoń z pazurami (FK)
      const al = (o.arm || 12) * U * 1.1, sh = V(L * 1.02, hy - D * .25, s * W * .75), el = sh.clone().add(V(al * .1, -al * .45, s * .03)), wr = el.clone().add(V(al * .45, -al * .1, 0));
      const a = [sh, el, wr].reduce((l, p) => [...l, m.bone(l.at(-1) || ch, p)], []), ar = D * .22 * Math.min(1.4, (o.arm || 12) / 12);
      m.tube([[sh.x, sh.y, sh.z, ar * 1.3, ar * 1.1, a[0]], [el.x, el.y, el.z, ar * .8, ar * .75, a[1]], [wr.x, wr.y, wr.z, ar * .6, ar * .5, a[2]], [wr.x + al * .12, wr.y - al * .04, wr.z, .01, .01, a[2]]]);
      for (let f = 0; f < (o.clw || 2); f++) { const q = wr.clone().add(V(al * .08, 0, (f - .5) * ar * .5)); m.spike(a[2], q, q.clone().add(V(al * .2, -al * .18, 0)), ar * .35, C.claw, C.ivory); }
      if (o.fz) m.sheet([0, 1].map(r => [0, .25, .5, .75, 1].map(f => { const p = el.clone().lerp(wr, f), b = a[f < .5 ? 1 : 2], L = al * (.35 + f * .3) * (f * 4 % 2 ? .8 : 1);
        return [p.x - r * L * .55, p.y - r * L, p.z + s * r * .02, b]; })), i => m.tmp.copy(m.SKIN).lerp(m.DARK, i * .55));   // lotki na przedramieniu
      if (o.thumb) m.spike(a[2], wr, wr.clone().add(V(.04, .12, 0)), .03, C.ivory);
      c.arms.push({ b: a, s });
    }
    if (o.fz) c.tail.slice(2).forEach((b, i) => { const p = b.userData.w, r = D * .82 * Math.pow(1 - (i + 2) / 6, 1.25), L = .1 + i * .05;   // wachlarz piór na ogonie
      for (const s of [-1, 1]) m.sheet([[[p.x + .06, p.y, s * r * .6, b], [p.x - .1, p.y, s * r * .6, b]], [[p.x + .02, p.y - .02, s * (r + L), b], [p.x - .14, p.y - .02, s * (r + L * .8), b]]],
        i2 => m.tmp.copy(m.SKIN).lerp(m.DARK, i2 * .6)); });
    if (o.sail) sail(m, c, -L * .2, L * 1.15, hy + D * .8, D * 2.2);
    // ozdoby głowy: rogi nad oczami, róg na nosie, rogi byka (karnotaur), kopuła, grzebienie, dziób
    const H = c.head, k = hh;
    if (o.hrn) for (const s of [-1, 1]) m.spike(H, P(hl * .18, k * .4, s * k * .2), P(hl * .15, k * .72, s * k * .22), k * .1, m.SKIN, m.DARK);
    if (o.nose) m.spike(H, P(hl * .7, k * .2), P(hl * .74, k * .5), k * .09, m.SKIN, m.DARK);
    if (o.bull) for (const s of [-1, 1]) m.spike(H, P(hl * .15, k * .35, s * k * .25), P(hl * .05, k * .7, s * k * .7), k * .14, m.SKIN, m.DARK);
    if (o.hd === 'dome') { m.ball(H, P(hl * .05, k * .2), [k * .58, k * .5 * (o.dm || 1), k * .48], m.SKIN.clone().lerp(m.BELLY, .45));
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m.spike(H, P(-k * .3 + Math.cos(a) * k * .1, k * .2, Math.sin(a) * k * .4), P(-k * .45, k * .3 + Math.cos(a) * k * .1, Math.sin(a) * k * .55), k * .06, m.SKIN, m.DARK); } }
    if (o.cr === 'tube') m.tube([[.25, .35], [-.25, .9], [-.8, 1.1], [-.9, 1.13]].map(([a, b], i) => { const p = P(hl * a, k * b); return [p.x, p.y, 0, i < 3 ? k * (.14 - i * .015) : .01, i < 3 ? k * (.12 - i * .01) : .01, H]; }),
      h => m.tmp.copy(m.SKIN).lerp(m.DARK, .2 + h * .2));
    if (o.cr === 'helm' || o.cr === 'hatch') m.ball(H, P(hl * .1, k * .5), [hl * .35, k * .5, k * .2], m.SKIN.clone().lerp(m.DARK, .25));
    if (o.cr2) for (const s of [-1, 1]) m.sheet([[P(hl * .7, k * .2, s * k * .12), P(-hl * .1, k * .35, s * k * .12)], [P(hl * .45, k * .7, s * k * .14), P(-hl * .05, k * .9, s * k * .14)]].map(r => r.map(p => [p.x, p.y, p.z, H])), () => m.BELLY);
    if (o.bk) m.ball(H, P(hl * .88, -k * .14), [hl * .2, k * .16, k * .25 * (o.hd === 'duck' ? 1.5 : 1)], m.DARK.clone().lerp(m.BELLY, .35));
    m.stripes = carn ? 9 + (sp.id.length % 5) * 2 : 0;
    Object.assign(c, { kind: 'biped', hy, jawMax: carn ? .75 : .4 });
  }
  // żagiel na grzbiecie (spinozaur, dimetrodon): płachta z ciemnymi promieniami, wygina się z kręgosłupem
  function sail(m, c, x0, len, y0, h) {
    const bn = x => x < len * .15 ? c.pelvis : x < len * .6 ? c.spine[0] : c.spine[1];
    m.sheet([0, 1].map(k => [0, .2, .4, .6, .8, 1].map(f => { const x = x0 + f * len; return [x, y0 + k * h * Math.sin(Math.PI * (f * .85 + .1)), 0, bn(x - x0)]; })),
      (i, j) => m.tmp.copy(m.SKIN).lerp(m.BELLY, i * .5).lerp(m.DARK, (j * 5 % 1 < .2) * .35 + i * .15));
  }

  /* ---------- czworonogi: zauropody, ceratopsy, ankylozaury, stegozaury, ssaki (słoń, kot, niedźwiedź…), synapsydy, krokodyle ----------
     typ nogi → stawy [x, y, z] w ułamkach wysokości biodra h: tylna / przednia (kolano/łokieć, kostka/nadgarstek, podstawa palców, czubek) */
  const LEGS = {
    col: [[[.06, .5], [-.03, .12], [.04, .05], [.14, 0]], [[-.05, .52], [.01, .12], [.05, .05], [.14, 0]]],
    semi: [[[.16, .55], [-.1, .2], [.05, .04], [.2, 0]], [[-.12, .55], [.02, .18], [.06, .04], [.2, 0]]],
    digi: [[[.18, .62], [-.16, .28], [-.02, .05], [.12, 0]], [[-.1, .6], [0, .2], [.05, .05], [.14, 0]]],
    sprawl: [[[.1, .6, .55], [.04, .14, .7], [.2, .04, .8], [.36, 0, .85]], [[-.06, .6, .55], [.04, .14, .7], [.18, .04, .78], [.34, 0, .82]]],
  };
  const MHEAD = { ele: [.55, .52], cat: [.3, .27], bear: [.42, .32], dog: [.42, .24], rhino: [.55, .3], deer: [.4, .2], indri: [.5, .26], andrew: [.6, .3], diproto: [.5, .32] };
  function quad(m, c, o, sp, key, base) {
    const { V, C } = m, ele = o.hd === 'ele', liz = ['croc', 'lizard', 'sail', 'synap', 'amphib'].includes(key) || ['croc', 'sail', 'synap', 'amphib'].includes(base);
    let s;   // wymiary wg archetypu
    if (base === 'sauro') { const D = (o.bh || 26) * U * .6, hy = (o.hl || 38) * U * 1.1, a = (o.na ?? 38) * Math.PI / 180, nl = (o.nl || 72) * U * 1.3;
      s = { hy, sy: (o.fl || 38) * U * 1.1 + .06, L: (o.bw || 42) * U * 1.3, D, Db: D * 1.3, W: D * .95, nv: V(Math.cos(a) * nl, Math.sin(a) * nl), nn: 6, ex: 1.15, ey: .85,
        nw0: (o.nw || 24) * U * .55, nw1: .1, tl: (o.tl || 1) * 2.8 * (o.whip ? 1.25 : 1), td: .5, tr: D * .8, tp: 1.6, tn: 8, leg: 'col', lr: D * .55, foot: 'pad',
        head: { l: .42 * (o.hd === 'long' || o.hd === 'mower' ? 1.25 : 1), h: .2 * (o.hd === 'brach' || o.hd === 'box' ? 1.3 : 1), pr: -.5, prof: 'sauro' } }; }
    else if (base === 'cerat') s = { hy: .78, sy: .72, L: 1.15, D: .34, Db: .44, W: .38, nv: V(.3, .1), nn: 2, nw0: .27, nw1: .25, tl: 1, td: .2, tr: .22, tn: 6, leg: 'semi', lr: .17, foot: 'hoof',
      head: { l: .78, h: .42, pr: -.5, prof: 'cerat', ex: .38 } };
    else if (base === 'armor') s = { hy: .55, sy: .5, L: 1.25, D: .28, Db: .28, W: .58, nv: V(.22, 0), nn: 2, nw0: .22, nw1: .2, tl: 1.4, td: .05, tr: .2, tp: 1.4, tn: 7, leg: 'semi', lr: .16, foot: 'hoof',
      head: { l: .3, h: .24, w: 1.5, pr: -.25, prof: 'sauro', ez: .38 } };
    else if (base === 'stego') s = { hy: .95, sy: .62, L: 1.1, D: .42, Db: .45, W: .32, nv: V(.42, -.12), nn: 3, nw0: .2, nw1: .1, tl: 1.5, td: -.25, tr: .25, tn: 7, leg: 'semi', lr: .15, foot: 'hoof',
      head: { l: .3, h: .15, pr: -.35, prof: 'sauro' } };
    else if (liz) { const sn = base === 'croc' && !o.liz; if (sn) c.alias = { roll: 'croll' }; s = { hy: .42, sy: .44, L: 1.0, D: .22, Db: .22, W: .3, nv: V(.22, .04), nn: 2, nw0: .17, nw1: .15, tl: 1.5, td: .15, tr: .2, tn: 7, leg: 'sprawl', lr: .1, foot: 'liz',
      head: { l: sn ? .75 : .45, h: sn ? .17 : .24, pr: -.05, prof: sn ? 'duck' : 'thero', teeth: 1, ex: sn ? .12 : .22 } }; }
    else { const [hl, hh] = MHEAD[o.hd] || MHEAD.cat, hy = (o.lh || 30) * U * 1.15, D = (o.bh || 22) * U * .6, nk = o.nk || (o.hd === 'cat' ? [12, -8] : [22, -10]);   // ssaki
      s = { hy, sy: hy * (ele ? 1.12 : 1.04), L: (o.bw || 40) * U * 1.1, D, Db: D * 1.05, W: D * .9, nv: V(nk[0] * U * .8, -nk[1] * U * .8), nn: 2, nw0: D * (ele ? .9 : .7), nw1: D * (ele ? .85 : .55),
        tl: { none: .05, short: .3, long: .9, tuft: .8, bush: .7 }[o.tail] ?? .7, td: .45, tr: o.tail === 'bush' ? .12 : .07, tp: .6, tn: 5, leg: ele || o.hd === 'indri' ? 'col' : o.hd === 'bear' || o.hd === 'diproto' ? 'semi' : 'digi',
        lr: (o.lw || 14) * U * .5, foot: ele ? 'pad' : o.ft === 'hoof' ? 'hoof' : 'paw', head: { l: hl, h: hh, pr: ele ? -.35 : -.15, prof: 'mammal', teeth: o.hd === 'dog' || o.hd === 'andrew' ? .8 : 0, ex: .3 } }; }
    const { hy, sy, L, D } = s;
    const t = trunk(m, c, { ...s, n0: V(L * 1.02, sy + D * .2) }), [hind, front] = LEGS[s.leg];
    for (const side of [-1, 1]) for (const [par, x0, y0, J, r] of [[t.pel, 0, hy - D * .1, hind, s.lr], [t.ch, L * .92, sy - D * .2, front, s.lr * .88]]) {
      const h = y0, z = side * s.W * (liz ? .6 : .55);
      const j = [V(x0, y0, z), ...J.map(([a, b, w = 0]) => V(x0 + a * h, b * h, z + side * w * h * .5))];
      leg(m, c, par, j, s.leg === 'col' ? [r * 1.1, r * .9, r * .8, r * .85] : [r * 1.1, r * .65, r * .45, r * .45], FEET[s.foot](m, s.leg === 'col' ? r * .85 : r * .5, true), J === front);
    }
    const H = c.head, P = t.P, { l, h: k } = s.head;
    if (base === 'cerat') {   // kryza z obramowaniem, rogi nad oczami i na nosie, dziób
      const R = { huge: 1.35, tall: 1.3, spiky: 1, round: 1.1, plain: .8, hook: 1, curly: 1, ring: 1.05 }[o.fr] ?? 1, rows = [];
      for (const rr of [.25, .7, 1]) rows.push([...Array(9)].map((_, i) => { const a = (i / 8 - .5) * 3.4, d = rr * k * 1.25 * R;
        const p = P(-k * .15 - Math.cos(a) * d * .55 + (1 - Math.cos(a)) * d * .25, k * .3 + Math.cos(a) * d * .85, Math.sin(a) * d); return [p.x, p.y, p.z, H]; }));
      m.sheet(rows, i => m.tmp.copy(m.SKIN).lerp(m.BELLY, i * .45).lerp(m.DARK, i > .9 ? .35 : 0));
      if (o.fr === 'spiky' || o.fspk) rows[2].slice(1, 8).forEach(([x, y, z], i) => m.spike(H, V(x, y, z), V(x - .1, y + .25 + (i % 2) * .1, z * 1.25), .04, m.BELLY, m.DARK));
      const br = Array.isArray(o.brow) ? V(o.brow[0] * U * .4, -o.brow[1] * U * .4) : null;
      if (br) for (const sd of [-1, 1]) m.spike(H, P(l * .3, k * .35, sd * k * .25), P(l * .3 + br.x, k * .35 + br.y, sd * k * .36), k * .1, C.ivory, C.horn);
      if (o.nose) m.spike(H, P(l * .78, k * .1), P(l * .82 + o.nose * U * .3, k * .1 + o.nose * U * .9), k * .08, C.ivory, C.horn);
      m.spike(H, P(l * .92, -k * .1), P(l * 1.05, -k * .32), k * .14, m.DARK);
    }
    if (base === 'armor') {   // pancerz: rzędy osteoderm, kolce po bokach, maczuga na ogonie, rożki z tyłu głowy
      for (let i = 0; i < 9; i++) for (let j = -2; j <= 2; j++) { const x = -L * .15 + i * L * .14, b = i < 3 ? t.pel : i < 6 ? t.mid : t.ch, a = j * .55, y = hy + Math.cos(a) * D * .95 + .01, z = Math.sin(a) * s.W * .95;
        m.spike(b, V(x, y - .02, z), V(x, y + .07, z * 1.04), .055, m.DARK.clone().lerp(m.SKIN, .5), m.DARK, 5); }
      if (o.spk) for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const x = -L * .1 + i * L * .25, b = i < 2 ? t.pel : i < 4 ? t.mid : t.ch;
        m.spike(b, V(x, hy - .02, sd * s.W * .9), V(x - .05, hy, sd * (s.W + .22)), .06, C.ivory, C.horn); }
      c.tail.slice(0, 5).forEach((b, i) => { const p = b.userData.w; for (const sd of [-1, 1]) m.spike(b, V(p.x, p.y, sd * .12 * (1 - i * .15)), V(p.x - .05, p.y, sd * (.24 - i * .025)), .04, C.ivory, C.horn); });
      if (o.club) { const b = c.tail.at(-1), p = b.userData.w.clone().add(V(-.12, 0)); for (const sd of [-1, 1]) m.ball(b, p.clone().add(V(0, 0, sd * .09)), [.17, .1, .13], m.DARK.clone().lerp(m.SKIN, .3)); }
      for (const sd of [-1, 1]) m.spike(H, P(-k * .05, k * .25, sd * k * .55), P(-k * .3, k * .3, sd * k * .8), k * .1, C.ivory, C.horn);
    }
    if (base === 'stego') {   // dwa naprzemienne rzędy płyt od karku po ogon, kolce na końcu ogona
      const n = o.n || 9, bones = [c.pelvis, ...c.spine, ...c.neck, ...c.tail], bx = bones.map(b => b.userData.w.x);
      for (let i = 0; i < n * 2; i++) { const f = i / (n * 2 - 1), x = L * 1.15 - f * (L * 1.15 + 1.25), b = bones[bx.reduce((bi, v, j) => Math.abs(v - x) < Math.abs(bx[bi] - x) ? j : bi, 0)];
        const top = b.userData.w.y + (b === c.pelvis || c.spine.includes(b) ? D * .9 : .1 * (1 - f * .3)), hgt = (.18 + .32 * Math.sin(Math.PI * Math.min(1, f * 1.15))) * (o.ph || 1), w = hgt * .7, z = (i % 2 ? 1 : -1) * .05;
        if (o.pl === 'spike' && f > .5) m.spike(b, V(x, top - .05, z), V(x - .15, top + hgt, z * 3), .05, C.ivory, C.horn);
        else m.sheet([[[x + w * .5, top - .06, z, b], [x - w * .5, top - .06, z, b]], [[x + w * .35, top + hgt * .55, z * 1.3, b], [x - w * .55, top + hgt * .6, z * 1.3, b]], [[x - w * .05, top + hgt, z * 1.4, b], [x - w * .1, top + hgt, z * 1.4, b]]],
          i2 => m.tmp.copy(m.SKIN).lerp(m.BELLY, .3 + i2 * .3).lerp(C.mouth, i2 * .25)); }
      const tb = c.tail.at(-1), tp = tb.userData.w;
      for (const sd of [-1, 1]) for (const k2 of [0, 1]) m.spike(tb, V(tp.x + .1 + k2 * .2, tp.y + .03, sd * .05), V(tp.x + k2 * .25 - .05, tp.y + .3, sd * .45), .05, C.ivory, C.horn);
    }
    if (base === 'sauro' && o.spn) c.neck.forEach(b => { const p = b.userData.w; for (const sd of [-1, 1]) m.spike(b, V(p.x, p.y + .05, sd * .04), V(p.x - .12, p.y + .5, sd * .07), .035, C.ivory); });
    if (base === 'mammal' || base === 'sloth') {
      for (const sd of [-1, 1]) {   // uszy, szable, ciosy
        if (ele) m.sheet([[P(-k * .05, k * .2, sd * k * .4), P(-k * .4, k * .2, sd * k * .4)], [P(-k * .05, -k * .25, sd * k * .55), P(-k * .5, -k * .3, sd * k * .5)]].map(r => r.map(p => [p.x, p.y, p.z, H])), () => m.SKIN.clone().lerp(m.DARK, .2));
        else m.spike(H, P(-k * .1, k * .4, sd * k * .3), P(-k * .2, k * .75, sd * k * .38), k * .14, m.SKIN, m.DARK, 5, .4);
        if (o.sab) m.spike(H, P(l * .62, -k * .32, sd * k * .13), P(l * .66, -k * 1.1, sd * k * .11), k * .07, C.ivory, C.ivory, 6, .45);
        if (ele) m.tube([[.6, -.35, .18, .075], [.85, -.8, .22, .07], [1.4, -.95, .3, .05], [1.85, -.55, .26, .03], [1.95, -.4, .22, .01]].map(([a, b, z, r]) => { const p = P(l * a, k * b, sd * k * z); return [p.x, p.y, p.z, r, r, H]; }), () => C.ivory);
      }
      if (ele) { c.trunk = []; let p = P(l * .82, -k * .1);   // trąba: łańcuch 5 kości w dół
        for (let i = 0; i < 5; i++) { c.trunk.push(m.bone(c.trunk[i - 1] || H, p)); p = p.clone().add(V(.03 - i * .015, -.2)); }
        m.tube([...c.trunk.map((b, i) => { const q = b.userData.w; return [q.x, q.y, 0, .13 - i * .018, .13 - i * .018, b]; }), [p.x, p.y, 0, .045, .045, c.trunk[4]], [p.x + .03, p.y - .02, 0, .01, .01, c.trunk[4]]],
          (h, q) => m.skin(h, q).multiplyScalar(Math.sin(q.y * 90) > .6 ? .85 : 1)); }
      if (o.hump || ele) m.ball(H, P(-k * .05, k * .45), [k * .48, k * .4, k * .42], m.SKIN);
      if (o.fur) { const bs = [c.pelvis, ...c.spine];   // sierść: kosmyki zwisające z boków i brzucha
        for (let i = 0; i < 28; i++) { const f = (i % 14) / 13, sd = i < 14 ? -1 : 1, x = -L * .1 + f * L * 1.1, b = bs[Math.min(2, Math.floor(f * 3))], y = hy - D * .5 + Math.sin(i * 7) * .05;
          m.spike(b, V(x, y, sd * s.W * .85), V(x - .04, y - D * .8, sd * s.W * .9), .05, m.SKIN, m.DARK.clone().lerp(m.SKIN, .4), 4, .5); } }
    }
    if (key === 'sail') sail(m, c, -L * .15, L * 1.1, hy + D * .7, o.short ? D * 2.5 : D * 4.5);
    m.spots = liz || key === 'cat' ? 7 : 0;
    Object.assign(c, { kind: 'quad', hy, jawMax: o.sab ? 1.1 : s.head.teeth ? .7 : .35 });
  }
  /* ---------- budowa i animacja ---------- */
  const BUILD = { thero: biped, raptor: biped, ornimim: biped, tbird: biped, dragon: biped, prosauro: biped, hadro: biped, orni: biped, dome: biped,
    sauro: quad, cerat: quad, armor: quad, stego: quad, mammal: quad, cat: quad, ele: quad, croc: quad, lizard: quad, sail: quad, synap: quad };
  function build(ctx) {
    const fn = BUILD[ctx.key] || BUILD[ctx.base]; if (!fn) return null;
    T = ctx.THREE;
    const m = maker(ctx), c = { legs: [], arms: [], eyes: [], neck: [], tail: [], spine: [] };
    fn(m, c, ctx.o, ctx.sp, ctx.key, ctx.base);
    const mesh = m.mesh(), body = ctx.body, bb = mesh.geometry.boundingBox;
    body.add(m.bones[0], mesh); body.updateMatrixWorld(true); mesh.bind(new T.Skeleton(m.bones));
    const s = ctx.H / Math.max(bb.max.y - Math.min(0, bb.min.y), (bb.max.x - bb.min.x) * LEN_K);
    body.scale.setScalar(s); body.position.set(-(bb.min.x + bb.max.x) / 2 * s, c.float ? -bb.min.y * s : 0, 0);
    return rig(c, ctx, s);
  }

  function rig(c, ctx, scale) {
    const ch = Object.fromEntries(CH.map(k => [k, 0])), R = { fwd: 0, up: 0, pitch: 0, yaw: 0 }, moves = MOVES[c.kind];
    const ph = Math.random() * 9, py0 = c.pelvis.position.y, hy = c.hy, spine2 = [{}, ...c.spine.map(() => ({}))];
    let g = 0, look = null, kx = 1, offX = 0, lastBlink = 0;
    const move = s => moves[c.alias?.[s] || s] || moves.bite || Object.values(moves)[0];
    const add = (A, t, k = 1) => { for (const n in A.ch) ch[n] += curve(A, n, t) * k; };
    function opp() {   // kierunek do przeciwnika w układzie ciała (przeciwnik leży na osi x areny)
      const root = ctx.body.parent?.parent; if (!root) return 0;
      const v = new T.Vector3(root.position.x < 0 ? 1 : -1, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), -root.rotation.y);
      kx = v.x / scale; return Math.atan2(-v.z, v.x);
    }
    // IK nogi: stopa (podstawa palców) w (fx, fy), śródstopie pochylone o tilt
    function solve(L, P, fx, fy, tilt, toe) {
      const ca = Math.cos(P.a), sa = Math.sin(P.a), hx = P.x + L.hip[0] * ca - L.hip[1] * sa, hyy = P.y + L.hip[0] * sa + L.hip[1] * ca;
      const [l1, l2, l3] = L.l, tm = L.a[2] + tilt, ax = fx - l3 * Math.cos(tm), ay = fy - l3 * Math.sin(tm);
      const dx = ax - hx, dy = ay - hyy, d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, Math.hypot(dx, dy)));
      const t1 = Math.atan2(dy, dx) + L.bend * Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
      const kx2 = hx + l1 * Math.cos(t1), ky2 = hyy + l1 * Math.sin(t1), t2 = Math.atan2(ay - ky2, ax - kx2);
      L.b[0].rotation.z = t1 - L.a[0] - P.a; L.b[1].rotation.z = t2 - L.a[1] - t1 + L.a[0];
      L.b[2].rotation.z = tm - L.a[2] - t2 + L.a[1]; L.b[3].rotation.z = toe - tm + L.a[2];
    }
    function legs(st, dt, plant) {
      // 2D: miednica i kolejne kości kręgosłupa (rodzice nóg)
      const P0 = spine2[0]; P0.x = c.pelvis.userData.w.x; P0.y = c.pelvis.position.y; P0.a = c.pelvis.rotation.z; P0.b = c.pelvis;
      c.spine.forEach((b, i) => { const p = spine2[i], q = spine2[i + 1], ca = Math.cos(p.a), sa = Math.sin(p.a);
        q.x = p.x + b.position.x * ca - b.position.y * sa; q.y = p.y + b.position.x * sa + b.position.y * ca; q.a = p.a + b.rotation.z; q.b = b; });
      for (const L of c.legs) {
        const P = spine2.find(p => p.b === L.par), home = L.j[3][0], free = Math.min(1, (L.front ? ch.lf : 0) + ch.fold);
        let fx = L.gx - offX, fy = L.j[3][1], tilt = 0;
        if (plant && !L.st && Math.abs(fx - home) > STEP.len * hy && !c.legs.some(o => o.st && o.front === L.front))
          L.st = { t: 0, a: L.gx, b: home + offX + (offX - (L.lo ?? offX)) / Math.max(dt, 1e-3) * STEP.s * .6 };
        if (!plant) L.gx = home + offX;
        if (L.st) { L.st.t = Math.min(1, L.st.t + dt / STEP.s); const e = sm(0, 1, L.st.t); L.gx = L.st.a + (L.st.b - L.st.a) * e;
          fx = L.gx - offX; fy += Math.sin(Math.PI * L.st.t) * STEP.h * hy; tilt = Math.sin(Math.PI * L.st.t) * .5; if (L.st.t >= 1) L.st = null; }
        L.lo = offX;
        // uniesienie: kopnięcie (pierwsza tylna), tupnięcie (pierwsza przednia lub tylna), wolna noga podąża za ciałem
        const kick = !L.front && L.side > 0 ? ch.kk : 0, stomp = L.side > 0 && L.front === c.legs.some(o => o.front) ? ch.st : 0, paw = L.front && L.side > 0 ? ch.ar : 0;
        if (free > 0 || kick || stomp || paw) {
          const ca = Math.cos(P.a), sa = Math.sin(P.a), rx = home - L.j[0][0], ry = fy - L.j[0][1], hx = P.x + L.hip[0] * ca - L.hip[1] * sa, hyy = P.y + L.hip[0] * sa + L.hip[1] * ca;
          const k = Math.max(free, Math.abs(kick), stomp, Math.abs(paw)), f = 1 - .45 * ch.fold;
          fx += (hx + (rx * ca - ry * sa) * f + (kick * .6 + paw * .45) * hy - fx) * k; fy += (hyy + (rx * sa + ry * ca) * f + (kick * .35 + stomp * .45 + Math.abs(paw) * .3) * hy - fy) * k;
          tilt += ch.fold * .9 + kick * .6;
        }
        solve(L, P, fx, Math.max(fy, L.front ? -1 : fy), tilt, Math.sin(Math.PI * Math.min(1, L.st?.t || 0)) * -.6 + ch.fold * .6);
      }
    }
    return {
      ms: s => move(s).ms, hitAt: s => move(s).hit,
      root(k, s, t) { const A = move(s); R.fwd = curve(A, 'fwd', t); R.up = curve(A, 'up', t); R.pitch = curve(A, 'pit', t); R.yaw = curve(A, 'yaw', t); return R; },
      update(st) {
        if (look === null) look = opp();
        const { k, t, tm, dt } = st, A = k === 'lunge' ? move(st.style) : k && REAC[k];
        for (const n in ch) ch[n] = 0;
        if (A) add(A, t);
        if (st.ko && !A) add(REAC.ko, 1);
        g += ((st.guarding && !st.ko ? 1 : 0) - g) * Math.min(1, dt * 8);
        for (const n in GUARD) ch[n] += GUARD[n] * g;
        if (st.won) { const r = Math.max(0, Math.sin(tm * 2.4)); ch.nk += .35; ch.hp += .35 + .2 * r; ch.jw += .2 + .8 * r; ch.tl += .3; ch.bp += .12; ch.ar -= .5; ch.sh += r * .3; }
        offX = k === 'lunge' ? ch.fwd * kx : 0;
        // spoczynek: oddech, przenoszenie ciężaru, kołysanie ogona, rozglądanie się
        const br = Math.sin(tm * 2.2 + ph), sw = Math.sin(tm * .7 + ph), idle = st.ko ? 0 : 1, glance = Math.sin(tm * .43 + ph * 2) * Math.sin(tm * .17);
        const shake = ch.sh * Math.sin(tm * 38), n = c.neck.length, nt = c.tail.length;
        c.pelvis.position.y = py0 + (ch.by + br * .008 * idle) * hy;
        c.pelvis.rotation.set(ch.sr + sw * .025 * idle, ch.sy * .25, ch.bp + br * .012 * idle);
        c.spine.forEach(b => b.rotation.set(0, ch.sy * .3 / c.spine.length, ch.sb / c.spine.length + br * .01 * idle));
        const ly = (look * .55 + glance * .25) * idle * (1 - Math.abs(ch.yaw) / 2);
        c.neck.forEach((b, i) => b.rotation.set(shake * .1, (ch.ny + ly) / n + shake * .12, (ch.nk + br * .03 * idle) / n));
        c.head.rotation.set(ch.hr + shake * .35, ch.hy + ly * .4 + shake * .25, ch.hp - br * .02 * idle);
        c.jaw.rotation.z = -c.jawMax * Math.min(1.2, ch.jw + (.04 + .03 * br) * idle);
        c.tail.forEach((b, i) => {
          const f = i / nt, tw = A ? curve(A, 'tw', t - i * .035) : 0;
          b.rotation.set(0, (tw * 1.4 + ch.sy * .5) / nt + Math.sin(tm * 1.3 + ph - i * .55) * .05 * (.4 + f) * idle,
            -(ch.tl + .1 * Math.sin(tm * .9 + ph - i * .4) * idle) / nt - (i ? 0 : ch.bp * .75) + (ch.fold > .5 ? .05 : 0));
        });
        c.arms.forEach(a => { const r = ch.ar, j = Math.sin(tm * 1.6 + ph + a.s) * .05 * idle;
          a.b[0].rotation.set(0, 0, r * .9 + j); a.b[1].rotation.set(0, 0, -.3 * Math.max(0, -r) + r * .4 - j); a.b[2].rotation.set(0, 0, -r * .3); });
        c.trunk?.forEach((b, i) => b.rotation.set(0, Math.sin(tm * 1.1 + ph - i * .5) * .06 * idle, ch.tr * (i + 1) * .12 + Math.sin(tm * .8 + ph - i * .6) * .08 * idle));
        // oczy: patrzą na przeciwnika; mruganie co kilka sekund
        const blink = Math.max(ch.bl, idle ? Math.max(0, 1 - Math.abs((tm + ph) % BLINK - .1) * 12) : 1);
        for (const e of c.eyes) { e.ball.rotation.set(0, (look - ly - ch.yaw * 0) * .6 - ch.hy * .5, -ch.hp * .3);
          e.lid.rotation.set(e.s * (-LID + blink * (Math.PI / 2 + LID)), 0, 0); }
        legs(st, dt, !st.ko && k !== 'ko' && k !== 'dodge' && !c.float);
        if (A && k === 'lunge' && st.style === 'stomp' && t >= A.hit && lastBlink < A.hit && window.Arena3D?.S) Arena3D.S.shake = .3;   // tupnięcie trzęsie ziemią
        lastBlink = k === 'lunge' ? t : 0;
      },
    };
  }
  return { build };
})();
