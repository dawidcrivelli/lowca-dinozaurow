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
  const RN = 16, SG = 4, HRN = [6, 2], U = 1 / 38, BODY = .78;    // wierzchołki pierścienia; próbki między kluczami rurki (HRN: rogi, palce, pazury); jednostka rysunku SVG (noga 2D = 38) → wysokość biodra; tusza względem 2D
  const COL = { mouth: 0xB0414A, eye: 0xFFFFFF, pupil: 0x141010, ivory: 0xF6EEDA, claw: 0x2E241B, horn: 0x5A4A3A, gum: 0xD86A72 };
  /* tekstura wzoru (szara, mnoży kolor wierzchołków; też mapa wypukłości): u = długość wzdłuż rurki / TEX.uvl, v = obwód 0 grzbiet → .5 brzuch → 1 grzbiet;
     pasek v > TEX.white jest biały (części bez wzoru: zęby, oczy, rogi) */
  const TEX = { size: 512, white: 15 / 16, uvl: 1.6 }, WHITE = [.5, .955], GLOSS = [.5, .995];   // pasek białego tekstu: matowy / błyszczący (roughnessMap)
  const MAT = { rough: .66, gloss: .22, bump: .045, ink: .55, outline: .013, sheet: .022 };   // szorstkość skóry / połysku, wypukłość, jasność konturu (× tusz), grubość konturu (× wysokość), grubość płachty
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
  // pływacy (fp = płetwy) i lotnicy (wg = zamach skrzydeł)
  const SWM = { bite: QU.bite, shake: BI.shake, tail: QU.tail, neck: QU.neck,
    ram: [680, .5, [.28, { fwd: -.3, nk: .15, tw: .5 }], [.5, { fwd: 1.3, pit: -.1, nk: -.2, hp: -.15, tw: -.5, jw: .3 }], [.7, { fwd: .8 }]],
    flipper: [660, .52, [.3, { fwd: .1, sr: .35, fp: -1 }], [.52, { fwd: .85, sr: -.25, fp: 1.2, jw: .4 }], [.75, { fwd: .6, fp: .3 }]] };
  const FLY = { peck: BI.peck,
    wing: [640, .5, [.3, { fwd: -.1, up: .3, wg: 1.3, nk: .2 }], [.5, { fwd: .9, wg: -1.1, jw: .6 }], [.7, { fwd: .6, wg: .4 }]],
    dive: [720, .58, [.35, { fwd: -.2, up: .7, pit: .4, wg: 1, nk: .2 }], [.58, { fwd: 1.1, up: -.5, pit: -.5, nk: -.3, hp: -.3, jw: 1, wg: -.6 }], [.78, { fwd: .7, up: -.2 }]] };
  const MOVES = { biped: BI, quad: QU, swim: SWM, fly: FLY }, REAC = {};
  for (const tab of [...Object.values(MOVES), REACT]) for (const k in tab) tab[k] = comp(tab[k]);
  Object.assign(REAC, REACT);
  const curve = (A, c, t) => { const v = A.ch[c]; if (!v) return 0; const ts = A.ts; t = Math.min(1, Math.max(0, t));
    let i = 0; while (i < ts.length - 2 && t > ts[i + 1]) i++;
    return v[i] + (v[i + 1] - v[i]) * sm(ts[i], ts[i + 1], t); };

  /* ---------- geometria: wierzchołki z kolorem i wagami kości ---------- */
  /* ---------- wzór skóry na płótnie (wspólny dla gatunków o tym samym kluczu) ----------
     k: { sc: łuski 0/1, st: pręgi (liczba na powtórzenie), sp: cętki, ro: rozety, os: osteodermy, fe: pióra, fu: futro, se: ziarno } */
  const TEXC = {};
  function pattern(k) {
    const id = JSON.stringify(k); if (TEXC[id]) return TEXC[id];
    const N = TEX.size, H = N * TEX.white, cv = document.createElement('canvas'), g = cv.getContext('2d');
    cv.width = cv.height = N; g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
    let s = k.se || 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, gray = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
    g.save(); g.beginPath(); g.rect(0, 0, N, H); g.clip();
    const wrap = fn => { for (const dx of [-N, 0, N]) for (const dy of [-H, 0, H]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };   // rysunek bez szwów (u i obwód się zawijają)
    const blob = (x, y, rx, ry, c, rot = 0) => wrap(() => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); });
    const side = () => (rnd() < .5 ? .08 : .58) + rnd() * .34;   // wysokość na boku (nie na grzbiecie ani brzuchu)
    for (let i = 0; i < 1400; i++) blob(rnd() * N, rnd() * H, 2 + rnd() * 5, 2 + rnd() * 4, gray(rnd() < .5 ? 205 : 255, .25));   // ziarno
    if (k.sc) { const c = N / 40;   // łuski: plaster miodu, jasny środek (wypukły), ciemne szczeliny; na brzuchu poprzeczne tarczki
      for (let y = 0; y < H / c + 1; y++) for (let x = 0; x < N / c + 1; x++) { const px = (x + (y % 2) * .5) * c, py = y * c * .86, belly = Math.abs(py / H - .5) < .1;
        if (belly) { if (y % 2 === 0) wrap(() => { g.fillStyle = gray(200, .55); g.fillRect(px - c * .5, py - 1, c * 1.02, 2.5); }); continue; }
        blob(px, py, c * .48, c * .42, gray(196, .7)); blob(px - c * .06, py - c * .08, c * .3, c * .26, gray(255, .75)); } }
    if (k.os) for (let i = 0; i < k.os; i++) { const x = (i % 12 + (Math.floor(i / 12) % 2) * .5) / 12 * N, y = (Math.floor(i / 12) - 1.5) * N * .07 + (Math.floor(i / 12) > 1 ? H * .02 : 0);   // osteodermy: rzędy guzów na grzbiecie
      blob(x, y, N * .033, N * .028, gray(120, .85)); blob(x - 2, y - 3, N * .022, N * .018, gray(250, .95)); }
    if (k.st) for (let i = 0; i < k.st; i++) { const x = (i + .5) / k.st * N + (rnd() - .5) * N / k.st * .3, w = N / k.st * (.18 + rnd() * .12), L = H * (.26 + rnd() * .1);
      wrap(() => { g.fillStyle = gray(70, .55); g.beginPath(); g.moveTo(x - w, -L); g.quadraticCurveTo(x + w * 1.6, 0, x - w, L); g.lineTo(x + w * .2, L * .9);
        g.quadraticCurveTo(x + w * 2.6, 0, x + w * .2, -L * .9); g.fill(); }); }
    if (k.sp) for (let i = 0; i < k.sp; i++) { const x = rnd() * N, y = side() * H, r = N * (.012 + rnd() * .018);
      if (k.ro) { blob(x, y, r * 1.5, r * 1.3, gray(80, .6)); blob(x, y, r * .9, r * .75, gray(230, .9)); } else blob(x, y, r, r * .8, gray(75, .55), rnd() * 3); }
    if (k.fe) for (let y = 0; y < H; y += N / 26) for (let x = 0; x < N; x += N / 22) { const px = x + (y / (N / 26) % 2) * N / 44, w = N / 40;   // pióra: łuski-dachówki z jaśniejszym brzegiem
      wrap(() => { g.fillStyle = gray(150, .55); g.beginPath(); g.moveTo(px + w * 1.2, y); g.quadraticCurveTo(px, y - w * 1.1, px - w * 1.3, y); g.quadraticCurveTo(px, y + w * 1.1, px + w * 1.2, y); g.fill();
        g.strokeStyle = gray(255, .6); g.lineWidth = 2; g.beginPath(); g.moveTo(px - w * 1.2, y); g.lineTo(px + w, y); g.stroke(); }); }
    if (k.fu) for (let i = 0; i < 5200; i++) { const x = rnd() * N, y = rnd() * H, l = 6 + rnd() * 10;   // futro: krótkie kosmyki skierowane do tyłu i w dół
      wrap(() => { g.strokeStyle = gray(rnd() < .5 ? 110 : 255, .35); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y + (y < H / 2 ? l : -l) * .35); g.stroke(); }); }
    g.restore();
    const t = new T.CanvasTexture(cv); t.flipY = false; t.wrapS = T.RepeatWrapping; t.anisotropy = 4;
    return TEXC[id] = t;
  }
  // szorstkość wzdłuż v: wszystko matowe, tylko górny pasek (GLOSS: oczy, zęby, pazury, rogi) błyszczy — jeden materiał na zwierzę
  const roughTex = () => TEXC.rough ||= (() => { const N = 64, cv = Object.assign(document.createElement('canvas'), { width: 1, height: N }), g = cv.getContext('2d'), v = r => `rgb(0,${r * 255 | 0},0)`;
    g.fillStyle = v(MAT.rough); g.fillRect(0, 0, 1, N); g.fillStyle = v(MAT.gloss); g.fillRect(0, N - 2, 1, 2);
    const t = new T.CanvasTexture(cv); t.flipY = false; return t; })();

  /* ---------- geometria: wierzchołki z kolorem, uv, wagą konturu i wagami kości; dwie grupy materiałów (skóra, połysk) ---------- */
  function maker(ctx) {
    const bones = [], pos = [], col = [], uv = [], ow = [], si = [], sw = [], idx = [], seams = [];
    const [SKIN, BELLY, DARK] = ctx.P.map(c => new T.Color(c)), C = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, new T.Color(v)]));
    const tmp = new T.Color(), Z = new T.Vector3(0, 0, 1), Y = new T.Vector3(0, 1, 0), V = (x, y, z = 0) => new T.Vector3(x, y, z);
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), S3 = new T.Vector3();
    // stan pędzla: gl 1 = materiał z połyskiem (oczy, zęby, pazury, rogi), ow waga konturu, tx = części z teksturą skóry
    const m = { bones, SKIN, BELLY, DARK, C, V, tmp, gl: 0, ow: 1, tx: 0, pat: { sc: 1 } };
    m.with = (st, fn) => { const o = { gl: m.gl, ow: m.ow, tx: m.tx }; Object.assign(m, st); fn(); Object.assign(m, o); };
    const vert = (p, c, b0, b1 = b0, w = 1, t = WHITE) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); uv.push(...m.gl ? GLOSS : t); ow.push(m.ow);
      si.push(b0.userData.i, b1.userData.i, 0, 0); sw.push(w, 1 - w, 0, 0); return pos.length / 3 - 1; };
    const tri = (a, b, c) => idx.push(a, b, c);
    // skóra: brzuch jasny → grzbiet w kolorze → ciemny pas na szczycie (wzór z tekstury)
    m.skin = h => tmp.copy(BELLY).lerp(SKIN, sm(-.55, .1, h)).lerp(DARK, Math.max(0, h - .55) * .55);
    m.bone = (par, p) => { const b = new T.Bone(); b.userData = { i: bones.length, w: p.clone() };
      b.position.copy(p); if (par) { b.position.sub(par.userData.w); par.add(b); } bones.push(b); return b; };
    /* rurka po kluczach [x, y, z, rGóra, rBok, kość, rDół?]; paint(h, p, u): h 1 grzbiet … -1 spód, u 0‥1 wzdłuż */
    m.tube = (keys, paint = m.skin, RING = RN, SEG = SG) => {
      const cp = new T.CatmullRomCurve3(keys.map(k => V(k[0], k[1], k[2]))), cr = new T.CatmullRomCurve3(keys.map(k => V(k[3], k[4], k[6] ?? k[3])));
      const N = (keys.length - 1) * SEG, base = pos.length / 3, R1 = RING + 1; let len = 0, last = cp.getPoint(0);
      for (let s = 0; s <= N; s++) {
        const u = s / N, i = Math.min(keys.length - 2, Math.floor(s / SEG)), f = s / SEG - i;
        const c = cp.getPoint(u), t = cp.getTangent(u), up = Z.clone().cross(t).normalize(), side = t.clone().cross(up), r = cr.getPoint(u);
        len += c.distanceTo(last); last = c;
        for (let j = 0; j <= RING; j++) {
          const a = j / RING * 2 * Math.PI, h = Math.cos(a), p = c.clone().addScaledVector(up, h * (h > 0 ? r.x : r.z)).addScaledVector(side, Math.sin(a) * r.y);
          vert(p, paint(h, p, u), keys[i][5], keys[i + 1][5], 1 - sm(0, 1, f), [len / TEX.uvl, j / RING * TEX.white]);
        }
        seams.push([base + s * R1, base + s * R1 + RING]);
      }
      for (let s = 0; s < N; s++) for (let j = 0; j < RING; j++) { const a = base + s * R1 + j, b = a + 1; tri(a, b, a + R1); tri(b, b + R1, a + R1); }
      const c0 = vert(cp.getPoint(0), paint(0, cp.getPoint(0), 0), keys[0][5]), c1 = vert(cp.getPoint(1), paint(0, cp.getPoint(1), 1), keys.at(-1)[5]);
      for (let j = 0; j < RING; j++) { tri(base + j + 1, base + j, c0); tri(base + N * R1 + j, base + N * R1 + j + 1, c1); }
    };
    // gotowa geometria three w układzie ciała po macierzy M4, sztywno na kości b; c: kolor albo (p, l) => kolor (l = punkt przed przekształceniem)
    const part = (g, b, c) => {
      const base = pos.length / 3, a = g.attributes.position, gu = g.attributes.uv, p = V(0, 0), l = V(0, 0), k = S3.length() * 4 / TEX.uvl;
      for (let i = 0; i < a.count; i++) { l.fromBufferAttribute(a, i); p.copy(l).applyMatrix4(M4);
        vert(p, c.isColor ? c : c(p, l), b, b, 1, m.tx ? [gu.getX(i) * k, gu.getY(i) * TEX.white] : WHITE); }
      const ix = g.index ? g.index.array : [...Array(a.count).keys()]; for (let i = 0; i < ix.length; i += 3) tri(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
      g.dispose();
    };
    const at = (p, rot, s) => M4.compose(p, Q.setFromEuler(E.set(...rot || [0, 0, 0])), S3.set(...s));
    m.ball = (b, p, r, c, rot, seg = [10, 7]) => { at(p, rot, r); part(new T.SphereGeometry(1, ...seg), b, c); };
    // stożek od a do tip (róg, ząb, pazur, kolec); kolor c0 u podstawy → c1 na czubku; rz: spłaszczenie w bok; bend: wygięcie czubka (pazur, kieł)
    m.spike = (b, a, tip, r, c0, c1 = c0, n = 6, rz = 1) => {
      const d = tip.clone().sub(a), L = d.length(); d.divideScalar(L);
      M4.compose(a.clone().addScaledVector(d, L / 2), Q.setFromUnitVectors(Y, d), S3.set(1, 1, rz));
      part(new T.ConeGeometry(r, L, n, 1), b, (p, l) => tmp.copy(c0).lerp(c1, sm(-.2, .5, l.y / L)));
    };
    // zakrzywiony róg/pazur/kieł: rurka po łuku od a do tip, wygięta o bend w kierunku n
    m.horn = (b, a, tip, r, c0, c1 = c0, bend = .25, n = Y) => {
      const d = tip.clone().sub(a), L = d.length(), k = [0, .35, .7, 1].map(f => a.clone().lerp(tip, f).addScaledVector(n, Math.sin(Math.PI * f * .9) * bend * L * (1 - f * .3)));
      m.with({ ow: Math.min(1, r * 12) }, () => m.tube(k.map((p, i) => [p.x, p.y, p.z, r * (1 - i / 3.2), r * (1 - i / 3.2), b]), (h, p, u) => tmp.copy(c0).lerp(c1, sm(.2, .9, u)), ...HRN));
    };
    // płetwa/kość skrzydła: spłaszczona elipsoida od a do tip, szerokość w, grubość th wzdłuż normalnej n
    m.fin = (b, a, tip, w, th, c, n = Y) => {
      const d = tip.clone().sub(a), L = d.length(); d.divideScalar(L); const z = n.clone().addScaledVector(d, -n.dot(d)).normalize();
      M4.makeBasis(d.clone().cross(z).multiplyScalar(w), d.clone().multiplyScalar(L / 2), z.multiplyScalar(th)).setPosition(a.clone().addScaledVector(d, L / 2));
      S3.set(w, L / 2, th); part(new T.SphereGeometry(1, 12, 8), b, c.isColor ? c : (p, l) => tmp.copy(SKIN).lerp(DARK, sm(-.3, 1, l.y) * .45));
    };
    // czasza (powieka): górna półkula promienia r
    m.cap = (b, p, r, c, rot) => { at(p, rot, [r, r, r]); part(new T.SphereGeometry(1, 10, 4, 0, 2 * Math.PI, 0, Math.PI / 2), b, c); };
    /* płachta (żagiel, płetwa, błona, kryza) jako płyta grubości th (zamknięta → ma kontur): wiersze punktów [x, y, z, kość, kość2?, w?]; paint(i, j) ∈ 0‥1 */
    m.sheet = (rows, paint, th = MAT.sheet) => {
      const nr = rows.length, nc = rows[0].length, P = rows.map(r => r.map(k => V(k[0], k[1], k[2]))), base = pos.length / 3, n = V(0, 0), a = V(0, 0), b = V(0, 0);
      for (const sd of [1, -1]) rows.forEach((r, i) => r.forEach((k, j) => {
        a.subVectors(P[Math.min(nr - 1, i + 1)][j], P[Math.max(0, i - 1)][j]); b.subVectors(P[i][Math.min(nc - 1, j + 1)], P[i][Math.max(0, j - 1)]);
        n.crossVectors(b, a).normalize().multiplyScalar(sd * th / 2 * (1 - .5 * i / (nr - 1)));
        vert(P[i][j].clone().add(n), paint(i / (nr - 1), j / (nc - 1)), k[3], k[4] || k[3], k[5] ?? 1); }));
      const L = nr * nc, at2 = (i, j) => base + i * nc + j;
      for (let i = 0; i < nr - 1; i++) for (let j = 0; j < nc - 1; j++) { const q = at2(i, j); tri(q, q + 1, q + nc); tri(q + 1, q + nc + 1, q + nc);
        tri(L + q, L + q + nc, L + q + 1); tri(L + q + 1, L + q + nc, L + q + nc + 1); }
      const ring = [...Array(nc).keys()].map(j => at2(0, j)).concat([...Array(nr).keys()].slice(1).map(i => at2(i, nc - 1)),
        [...Array(nc - 1).keys()].reverse().map(j => at2(nr - 1, j)), [...Array(nr - 1).keys()].reverse().slice(0, -1).map(i => at2(i, 0)));   // brzeg płyty
      ring.forEach((q, i) => { const r = ring[(i + 1) % ring.length]; tri(q, L + q, r); tri(r, L + q, L + r); });
    };
    m.mesh = () => {
      const g = new T.BufferGeometry(), A = (n, a, k) => g.setAttribute(n, new (k || T.Float32BufferAttribute)(a, a === pos || a === col ? 3 : a === uv ? 2 : a === ow ? 1 : 4));
      A('position', pos); A('color', col); A('uv', uv); A('ow', ow); A('skinIndex', si, T.Uint16BufferAttribute); A('skinWeight', sw);
      g.setIndex(idx);
      g.computeVertexNormals(); g.computeBoundingBox();
      const nm = g.attributes.normal; for (const [a, b] of seams) { const v = V(nm.getX(a) + nm.getX(b), nm.getY(a) + nm.getY(b), nm.getZ(a) + nm.getZ(b)).normalize(); nm.setXYZ(a, v.x, v.y, v.z); nm.setXYZ(b, v.x, v.y, v.z); }
      const tex = pattern(m.pat), std = o => new T.MeshStandardMaterial({ vertexColors: true, skinning: true, metalness: 0, ...o });
      const mesh = new T.SkinnedMesh(g, std({ map: tex, bumpMap: tex, bumpScale: MAT.bump, roughnessMap: roughTex(), roughness: 1 }));
      // kontur: ta sama siatka od tyłu, napompowana wzdłuż normalnych (waga ow) — gruba kreska jak w rysunkach 2D
      const ol = new T.MeshLambertMaterial({ color: DARK.clone().multiplyScalar(MAT.ink), side: T.BackSide, skinning: true });
      ol.onBeforeCompile = sh => { sh.uniforms.owk = ol.userData; sh.vertexShader = 'attribute float ow; uniform float owk;\n'
        + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ow * owk;'); };
      const go = new T.BufferGeometry(); for (const k in g.attributes) go.setAttribute(k, g.attributes[k]); go.setIndex(g.index);
      const out = new T.SkinnedMesh(go, ol);
      mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = out.frustumCulled = false; mesh.userData.out = out; return mesh;
    };
    return m;
  }

  /* ---------- głowa ---------- */
  const PROF = {   // [x/l, y/h, góra, bok, dół] × h — od potylicy do czubka pyska (ostatni = czubek)
    thero: [[-.12, .12, .46, .5, .4], [.2, .1, .52, .47, .42], [.48, .0, .42, .36, .35], [.76, -.08, .32, .27, .26], [.96, -.11, .2, .2, .16]],
    duck: [[-.15, .08, .42, .42, .4], [.3, .05, .45, .38, .4], [.7, -.1, .26, .32, .22], [.97, -.16, .15, .36, .11]],
    cerat: [[-.1, .12, .5, .42, .45], [.35, .05, .52, .4, .5], [.7, -.08, .4, .27, .38], [.95, -.25, .2, .12, .16]],
    mammal: [[-.2, .15, .55, .48, .42], [.15, .12, .6, .48, .45], [.5, -.05, .4, .36, .32], [.82, -.16, .27, .28, .23], [.95, -.2, .18, .2, .16]],
    shark: [[-.15, .05, .45, .42, .45], [.3, .06, .46, .38, .42], [.7, .08, .32, .26, .26], [.97, .1, .11, .09, .08]],
    beak: [[-.1, .05, .45, .38, .4], [.25, 0, .38, .3, .35], [.6, -.05, .22, .18, .2], [.97, -.08, .04, .04, .04]],
    sauro: [[-.15, .1, .45, .42, .4], [.3, .14, .55, .44, .4], [.7, -.02, .32, .34, .26], [.95, -.08, .21, .27, .16]],
  };
  /* głowa: czaszka = koniec rurki tułowia (kość głowy), żuchwa z językiem, zęby, oczy (białko, źrenica, blik, powieka), nozdrza, policzki, łuki brwiowe
     o: { l, h: długość/wysokość, pr: pochylenie (rad, − = nos w dół), prof: kształt (PROF), w: szerokość pyska, teeth, brow, cheek, eye, ex, ez }
     c.hp(dx, dy, dz) → punkt w układzie głowy (dx wzdłuż pyska) — do ozdób; c.hw(f) → półszerokość czaszki w ułamku długości */
  function head(m, c, h0, o) {
    const { V, C } = m, l = o.l, hh = o.h, w = o.w || 1, pr = o.pr ?? -.12, ca = Math.cos(pr), sa = Math.sin(pr), hd = m.bone(c.neck.at(-1), h0);
    const P = c.hp = (dx, dy, dz = 0) => V(h0.x + dx * ca - dy * sa, h0.y + dx * sa + dy * ca, dz), lx = p => (p.x - h0.x) * ca + (p.y - h0.y) * sa;
    const K = (dx, dy, t, sd, b, bn = hd) => { const p = P(dx, dy); return [p.x, p.y, 0, t, sd, bn, b]; }, prof = PROF[o.prof || 'thero'];
    const pf = (f, k) => { let i = 0; while (i < prof.length - 2 && f > prof[i + 1][0]) i++; const a = prof[i], b = prof[i + 1], t = Math.min(1, Math.max(0, (f - a[0]) / (b[0] - a[0]))); return (a[k] + (b[k] - a[k]) * t) * hh; };
    const hw = c.hw = f => pf(f, 3) * w, low = c.low = f => pf(f, 1) - pf(f, 4);   // półszerokość; dolna / górna krawędź czaszki
    c.top = f => pf(f, 1) + pf(f, 2);
    c.mouth = (h, p) => o.teeth && h < -.55 && lx(p) > l * .16 && lx(p) < l * .93;
    const jy = -hh * .3, jaw = m.bone(hd, P(l * .05, jy)), tc = o.teeth ? C.ivory : m.DARK.clone().lerp(m.BELLY, .4);
    // żuchwa: masywna z tyłu (mięśnie), zwęża się ku przodowi; wnętrze różowe
    m.tube([K(-l * .02, jy + hh * .06, hh * .24, hw(0) * .85, hh * .2, jaw), K(l * .3, jy - hh * .08, hh * .17, hw(.3) * .82, hh * .18, jaw),
      K(l * .65, jy - hh * .08, hh * .12, hw(.65) * .85, hh * .12, jaw), K(l * .9, jy - hh * .04, hh * .07, hw(.9) * .8, hh * .07, jaw), K(l * .97, jy - hh * .02, .01, .01, .01, jaw)],
      (h, p) => h > .45 && lx(p) > l * .12 ? C.mouth : m.skin(-.8));
    m.with({ gl: 1, ow: .3 }, () => {
      m.ball(jaw, P(l * .45, jy + hh * .04), [l * .3, hh * .05, hw(.45) * .5], C.gum);   // język
      if (o.teeth) { const n = Math.max(4, Math.min(7, Math.round(l / hh * 3.2))), th = hh * .2 * o.teeth;   // zęby: wielkie, wyraźne (jak w 2D), środkowe najdłuższe
        for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const f = .22 + i * .7 / n, tl = th * (1 - Math.abs(f - .45) * .9), z = s * hw(f) * .78;
          m.spike(hd, P(l * f, low(f) + hh * .04, z), P(l * f + tl * .15, low(f) - tl, z * .97), hh * .045, C.ivory);
          if (i < n - 1) m.spike(jaw, P(l * (f + .05), jy + hh * .04, z * .9), P(l * (f + .05) + tl * .1, jy + hh * .04 + tl * .8, z * .87), hh * .04, C.ivory); } }
    });
    // oczy: białko, duża ciemna źrenica, blik (jak w 2D); powieka na osobnej kości (mruganie)
    const er = hh * .17 * (o.eye || 1), ex = o.ex ?? .22, ink = m.DARK.clone().multiplyScalar(.5);
    c.eyes = [-1, 1].map(s => {
      const p = P(l * ex, hh * .2, s * (o.ez ? hh * o.ez * w : hw(ex) * .78)), ball = m.bone(hd, p), lid = m.bone(hd, p);
      m.with({ gl: 1, ow: .5 }, () => { m.ball(ball, p, [er, er, er], C.eye);
        m.ball(ball, p.clone().add(V(er * .2, 0, s * er * .62)), [er * .55, er * .62, er * .45], ink);
        m.with({ ow: 0 }, () => m.ball(ball, p.clone().add(V(er * .05, er * .3, s * er * .98)), [er * .17, er * .17, er * .1], C.eye, 0, [6, 4])); });
      m.with({ ow: .4 }, () => m.cap(lid, p, er * 1.12, m.SKIN.clone().lerp(m.DARK, .25)));
      if (o.brow) m.with({ tx: 1 }, () => m.ball(hd, p.clone().add(V(er * .1, er * .85, -s * er * .15)), [er * 1.5, er * .5, er * .8], m.SKIN, [0, 0, pr - .25]));   // łuk brwiowy: groźne spojrzenie
      return { ball, lid, s };
    });
    for (const s of [-1, 1]) {
      m.ball(hd, P(l * .9, pf(.9, 1) + pf(.9, 2) * .55, s * hw(.9) * .55), [hh * .06, hh * .035, hh * .04], m.DARK, [0, 0, .3], [6, 4]);   // nozdrza
      if (o.cheek) m.with({ tx: 1 }, () => m.ball(hd, P(l * .2, -hh * .12, s * hw(.2) * .72), [l * .2, hh * .26, hh * .2], m.SKIN.clone().lerp(m.BELLY, .2)));   // policzek (mięsień żuchwy)
    }
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
    return { pel, mid, ch, h0, P: c.hp, hd: s.head };
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
    bird: (m, r, sick) => (b, ball, tip) => {   // trzy grube palce z zakrzywionymi pazurami + paluch; raptor: wielki sierpowy pazur w górze
      const { V, C } = m, l = tip.x - ball.x, toe = m.SKIN.clone().lerp(m.DARK, .15), dn = V(0, -1, 0);
      for (const a of [-.42, 0, .42]) { const e = ball.clone().add(V(Math.cos(a) * l, -r * .4, Math.sin(a) * l * 1.2));
        m.horn(b, ball.clone().add(V(0, r * .1)), e, r * .75, toe, toe, .08);
        m.with({ gl: 1 }, () => m.horn(b, e, e.clone().add(V(l * .28 * Math.cos(a), -r * .35, Math.sin(a) * l * .15)), r * .42, C.claw, C.claw, .35, dn)); }
      m.horn(b, ball, ball.clone().add(V(-l * .35, -r * .3, 0)), r * .45, toe);
      if (sick) m.with({ gl: 1 }, () => m.horn(b, ball.clone().add(V(l * .12, r * .4, 0)), ball.clone().add(V(l * .55, r * 2.6, 0)), r * .55, C.claw, C.ivory, .45, V(1, 0, 0)));
    },
    pad: (m, r) => (b, ball) => { const { V, C } = m;
      m.ball(b, ball.clone().add(V(.02, -ball.y * .3)), [r * 1.15, ball.y * .9, r * 1.1], m.SKIN.clone().lerp(m.DARK, .25));
      for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .45; m.ball(b, ball.clone().add(V(Math.cos(a) * r * 1.05, -ball.y * .55, Math.sin(a) * r)), [r * .14, r * .1, r * .12], C.ivory, 0, [5, 3]); } },
    hoof: (m, r) => (b, ball, tip) => m.ball(b, ball.clone().lerp(tip, .4).setY(r * .4), [r * 1.1, r * .45, r * .9], m.DARK),
    paw: (m, r, claws) => (b, ball, tip) => { const { V, C } = m;
      for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .32, p = ball.clone().lerp(tip, .55).add(V(0, 0, Math.sin(a) * r * 1.2)).setY(r * .4);
        m.ball(b, p, [r * .42, r * .38, r * .32], m.SKIN, 0, [6, 4]); if (claws) m.spike(b, p.clone().add(V(r * .3, 0)), p.clone().add(V(r * .8, -r * .35)), r * .14, C.claw); } },
    liz: (m, r) => (b, ball, tip) => { const { V, C } = m, l = tip.x - ball.x;
      for (const a of [-.7, -.25, .2, .65]) { const e = ball.clone().add(V(Math.cos(a) * l, -r * .4, Math.sin(a) * l * Math.sign(ball.z)));
        m.spike(b, ball, e, r * .45, m.SKIN); m.spike(b, e, e.clone().add(V(l * .2, -r * .3)), r * .25, C.claw); } },
  };

  /* ---------- teropod i inne dwunożne (thero, raptor, ornimim, tbird, dragon, prosauro, hadro, orni, dome) ---------- */
  const HEADS = { rex: [44, 28], tyr: [40, 23], long: [50, 21], allo: [38, 20], short: [28, 24], croc: [54, 15], slim: [34, 15], rap: [30, 13], beak: [20, 11],
    ovi: [19, 18], tiny: [16, 10], bird: [34, 24], gast: [30, 30], duck: [36, 17], iguano: [32, 18], dome: [24, 20], parrot: [18, 18], small: [20, 12], deino: [34, 13] };
  function biped(m, c, o, sp) {   // wymiary wprost z rysunku 2D (A_thero w art.js): bw/bh tułów, lw udo, nk szyja, hs głowa, tl/td/tw ogon, arm/aw ręka
    const { V, C } = m, lg = o.lg || 1, hy = lg, rx = o.bw || 33, ry = o.bh || 22, L = (rx * .76 + 4) * U, D = ry * U * BODY, W = D * .82, carn = !o.herb;
    const nk = o.nk || [28, -28], [hl, hh] = (o.hs || HEADS[o.hd] || HEADS.allo).slice(0, 2).map(v => v * U * .9), nw = (o.nw || ry * 1.2) / 2 * U * .9, lw = (o.lw || 22) * U * .5;
    const big = ['rex', 'tyr', 'long', 'allo', 'short'].includes(o.hd) || o.hs;
    const { pel, ch, P } = trunk(m, c, { hy, L, D, W, Db: D * 1.05, n0: V(L * .9, hy + D * .45), nv: V(nk[0], -nk[1]).multiplyScalar(U * .9), nn: 3, ex: 1.7, ey: .55,
      nw0: nw, nw1: nw * .8, tl: (o.tl ?? 1) * 68 * U * .95, td: (o.td ?? 18) * U, tr: (o.tw || ry * 1.2) / 2 * U * .95, tp: 1.15,
      head: { l: hl, h: hh, teeth: carn ? (o.hd === 'rex' ? 1.25 : 1) : 0, brow: carn, cheek: carn && big, w: o.hd === 'duck' ? 1.4 : 1, eye: (o.ey || 1) * (o.hd === 'rap' ? 1.2 : 1), prof: o.hd === 'duck' ? 'duck' : 'thero' } });
    // nogi: muskularne udo w przód, goleń w tył, długie śródstopie (palcochodne)
    for (const s of [-1, 1]) {
      const z = s * W * .62, j = [V(0, hy - .05, z), V(.26 * lg, hy * .5, z * 1.1), V(-.08 * lg, hy * .2, z * 1.1), V(.08, .05, z * 1.1), V(.3 * lg, .02, z * 1.15)];
      leg(m, c, pel, j, [lw, lw * .62, lw * .42, lw * .36], FEET.bird(m, lw * .3, o.sick), false);
    // ręce: ramię → przedramię → dłoń z pazurami (FK)
      const al = (o.arm || 10) * U * 1.2, sh = V(L * .95, hy - D * .15, s * W * .8), el = sh.clone().add(V(al * .1, -al * .45, s * .03)), wr = el.clone().add(V(al * .45, -al * .1, 0));
      const a = [sh, el, wr].reduce((l, p) => [...l, m.bone(l.at(-1) || ch, p)], []), ar = (o.aw || 9) / 2 * U * .9;
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
    m.pat = { sc: 1, st: carn ? 5 + sp.id.length % 4 : 0, fe: o.fz ? 1 : 0 };
    Object.assign(c, { kind: 'biped', hy, jawMax: carn ? .75 : .4 });
  }
  // żagiel na grzbiecie (spinozaur, dimetrodon): jasna błona na kolcach kręgów, ciemniejsza u nasady, wygina się z kręgosłupem
  function sail(m, c, x0, len, y0, h, n = 9) {
    const bn = x => x < len * .2 ? c.pelvis : x < len * .6 ? c.spine[0] : c.spine[1], top = f => h * Math.sin(Math.PI * (f * .86 + .07)) ** .7, bone = m.DARK.clone().lerp(m.SKIN, .35);
    m.sheet([0, .5, 1].map(k => [0, .2, .4, .6, .8, 1].map(f => { const x = x0 + f * len; return [x - k * h * .1, y0 + k * top(f), 0, bn(x - x0)]; })),
      i => m.tmp.copy(m.SKIN).lerp(m.BELLY, .35 + i * .4).lerp(m.DARK, i > .9 ? .2 : 0), .035);
    for (let i = 0; i < n; i++) { const f = (i + .5) / n, x = x0 + f * len; m.horn(bn(x - x0), m.V(x, y0 - h * .05), m.V(x - h * .12, y0 + top(f) * 1.06), h * .022, bone, bone, .05); }   // kolce kręgów
  }

  /* ---------- czworonogi: zauropody, ceratopsy, ankylozaury, stegozaury, ssaki (słoń, kot, niedźwiedź…), synapsydy, krokodyle, płazy ----------
     typ nogi → stawy [x, y, z] w ułamkach wysokości biodra h: tylna / przednia (kolano/łokieć, kostka/nadgarstek, podstawa palców, czubek) */
  const LEGS = {
    col: [[[.06, .5], [-.03, .12], [.04, .05], [.14, 0]], [[-.05, .52], [.01, .12], [.05, .05], [.14, 0]]],
    semi: [[[.16, .55], [-.1, .2], [.05, .04], [.2, 0]], [[-.12, .55], [.02, .18], [.06, .04], [.2, 0]]],
    digi: [[[.18, .62], [-.16, .28], [-.02, .05], [.12, 0]], [[-.1, .6], [0, .2], [.05, .05], [.14, 0]]],
    sprawl: [[[.1, .6, .55], [.04, .14, .7], [.2, .04, .8], [.36, 0, .85]], [[-.06, .6, .55], [.04, .14, .7], [.18, .04, .78], [.34, 0, .82]]],
  };
  /* wymiary w jednostkach rysunku 2D (A_* w art.js): hy/sy biodro/bark, L biodro→bark, ry/rb/rw promień grzbietu/brzucha/boku, nv szyja [dx, w górę], nw grubość,
     tl/td/tw ogon (długość, opadanie, grubość u nasady), leg/lr typ i grubość nogi, foot, hd głowa { l, h, … jak head() } */
  const MHEAD = { ele: [34, 36], cat: [27, 21], bear: [38, 28], dog: [42, 22], rhino: [46, 24], deer: [36, 18], indri: [40, 22], andrew: [50, 24], diproto: [40, 28] };
  const QSPEC = {
    cerat: o => ({ hy: 44, sy: 42, L: 42, ry: 25, rb: 27, rw: 23, nv: [16, 6], nw: 32, tl: 52, td: 14, tw: 22, leg: 'semi', lr: 22, foot: 'hoof', hd: { l: 56, h: 30, pr: -.45, prof: 'cerat', ex: .4 } }),
    armor: o => ({ hy: 34, sy: 32, L: 48, ry: 25, rb: 18, rw: 36, nv: [12, -2], nw: 26, tl: 56, td: 4, tw: 20, tp: 1.3, leg: 'semi', lr: 20, foot: 'pad', hd: { l: 32, h: 22, w: 1.45, pr: -.25, prof: 'sauro', ez: .5 } }),
    stego: o => ({ hy: 42, sy: 30, L: 42, ry: 27, rb: 26, rw: 19, nv: o.nk ? [36, 18] : [24, -8], nn: 3, nw: 21, nt: .6, tl: 58, td: -8, tw: 22, leg: 'semi', lr: 19, foot: 'hoof', hd: { l: 26, h: 15, pr: -.35, prof: 'sauro' } }),
    sauro: o => { const a = (o.na ?? 38) * Math.PI / 180, nl = (o.nl || 72) * 1.15, ry = o.bh || 26, hd = o.hd || 'std';
      return { hy: (o.hl || 38) + 6, sy: (o.fl || 38) + 6, L: (o.bw || 42) * 1.15, ry, rb: ry * 1.15, rw: ry * .95, nv: [Math.cos(a) * nl, Math.sin(a) * nl], nn: 6, ex: 1.15, ey: .85, nw: o.nw || 24, nt: .42,
        tl: 72 * (o.tl || 1) * (o.whip ? 1.4 : 1), td: 26, tw: ry * .95, tp: 1.7, tn: 8, leg: 'col', lr: (o.lw || 20) * 1.15, foot: 'pad',
        hd: { l: hd === 'long' || hd === 'mower' ? 32 : 26, h: hd === 'brach' || hd === 'box' ? 21 : 16, pr: hd === 'mower' ? -1.1 : -.45, prof: 'sauro', w: hd === 'mower' ? 1.4 : 1 } }; },
    croc: o => o.liz ? { hy: 30, sy: 30, L: 46, ry: 17, rb: 15, rw: 20, nv: [(o.nkl || 10) * .8 + 6, (o.nkl || 0) * .3], nn: o.nkl ? 4 : 2, nw: 20, tl: 80, td: 8, tw: 18, leg: 'sprawl', lr: 15, foot: 'liz',
        hd: { l: o.sn || 26, h: 18, pr: -.08, prof: 'thero', teeth: .6, ex: .25 } }
      : { hy: o.up ? 36 : 26, sy: o.up ? 36 : 26, L: 52, ry: 18, rb: 14, rw: 24, nv: [8, 0], nw: 26, tl: 82, td: 6, tw: 22, leg: o.up ? 'semi' : 'sprawl', lr: 17, foot: 'liz',
        hd: { l: o.sn || 42, h: 20 * (o.hh || 1), pr: -.04, prof: (o.sn || 42) > 36 ? 'duck' : 'thero', teeth: 1, ex: .14 } },
    sail: o => ({ hy: 28, sy: 28, L: 52, ry: 16, rb: 15, rw: 18, nv: [6, 3], nw: 22, tl: 72, td: 8, tw: 19, leg: 'sprawl', lr: 17, foot: 'liz', hd: { l: o.short ? 32 : 42, h: 22, pr: -.05, prof: 'thero', teeth: o.short ? 0 : 1.1, cheek: !o.short } }),
    synap: o => ({ hy: 34, sy: 34, L: 44, ry: 22, rb: 22, rw: 21, nv: [12, o.hd === 'thick' ? 10 : 4], nw: 28, tl: o.hd === 'gorgon' ? 66 : 34, td: 10, tw: 17, leg: o.up || o.hd === 'gorgon' ? 'semi' : 'sprawl', lr: 18, foot: o.up || o.hd === 'gorgon' ? 'paw' : 'liz',
      hd: { l: o.hd === 'gorgon' ? 50 : 42, h: o.hd === 'thick' ? 32 : 26, pr: -.1, prof: 'thero', teeth: o.hd === 'gorgon' ? 1 : .5, cheek: 1 } }),
    amphib: o => ({ hy: 22, sy: 22, L: 54, ry: 18, rb: 15, rw: 26, nv: [8, 0], nw: 26, tl: 54, td: 8, tw: 20, leg: 'sprawl', lr: 13, foot: 'liz', hd: { l: 50, h: 17, w: 1.6, pr: 0, prof: 'duck', teeth: .6, ex: .3 } }),
    mammal: o => { const hd = o.hd || 'cat', ele = hd === 'ele', ry = o.bh || 22, lh = o.lh || 30, [l, h] = MHEAD[hd] || MHEAD.cat, nk = o.nk || (hd === 'cat' ? [12, -8] : [22, -10]);
      return { hy: lh + ry * .45, sy: lh + ry * (ele ? .7 : .5), L: (o.bw || 40) * 1.1, ry, rb: ry * 1.05, rw: ry * .88, nv: [nk[0], -nk[1]], nn: 2, nw: o.nw || ry * 1.15, nt: .85,
        tl: { none: 2, short: 14, long: 44, tuft: 36, bush: 34 }[o.tail] ?? 30, td: 22, tw: o.tail === 'bush' ? 16 : o.tail === 'none' ? 4 : 9, tp: .7, tn: 5,
        leg: ele || hd === 'indri' ? 'col' : hd === 'bear' || hd === 'diproto' ? 'semi' : 'digi', lr: o.lw || 14, foot: ele ? 'pad' : o.ft === 'hoof' ? 'hoof' : 'paw',
        hd: { l, h, pr: ele ? -.4 : -.12, prof: 'mammal', teeth: hd === 'dog' || hd === 'andrew' ? .8 : hd === 'cat' || hd === 'bear' ? .5 : 0, ex: ele ? .35 : .3, eye: ele ? .7 : 1.1 } }; },
  };
  QSPEC.sloth = o => ({ ...QSPEC.mammal({ hd: 'bear', bw: 38, bh: 30, lh: 26, lw: 20, tail: 'short' }), tw: 22, tl: 26 });
  function quad(m, c, o, sp, key, base) {
    const { V, C } = m, ele = o.hd === 'ele', liz = ['croc', 'sail', 'synap', 'amphib'].includes(base), mam = base === 'mammal' || base === 'sloth';
    const q = QSPEC[base](o), k = U * BODY, hy = q.hy * U, sy = q.sy * U, L = q.L * U, D = q.ry * k, W = q.rw * k, nw = q.nw / 2 * k;
    if (base === 'croc' && !o.liz) c.alias = { roll: 'croll' };
    const t = trunk(m, c, { hy, sy, L, D, Db: q.rb * k, W, n0: V(L * .98, sy + D * .3), nv: V(...q.nv).multiplyScalar(U), nn: q.nn || 2, ex: q.ex, ey: q.ey, nw0: nw, nw1: nw * (q.nt || .85),
      tl: q.tl * U, td: q.td * U, tr: q.tw / 2 * k, tp: q.tp || 1.2, tn: q.tn || 7,
      head: { ...q.hd, l: q.hd.l * U * .9, h: q.hd.h * U * .9, brow: q.hd.teeth > .7 } }), [hind, front] = LEGS[q.leg], lr = q.lr / 2 * U * .95;
    for (const side of [-1, 1]) for (const [par, x0, y0, J, r] of [[t.pel, 0, hy - D * .15, hind, lr], [t.ch, L * .94, sy - D * .25, front, lr * .92]]) {
      const z = side * W * (liz ? .7 : .62), j = [V(x0, y0, z), ...J.map(([a, b, w = 0]) => V(x0 + a * y0, b * y0, z + side * w * y0 * .5))];
      leg(m, c, par, j, q.leg === 'col' ? [r * 1.1, r * .9, r * .82, r * .86] : [r * 1.15, r * .72, r * .52, r * .5], FEET[q.foot](m, q.leg === 'col' ? r * .86 : r * .55, o.sab || base === 'sloth' ? 2 : 1), J === front);
    }
    const H = c.head, P = t.P, { l, h: hk } = t.hd, hw = c.hw, ivory = (b, a, z, r, bend, n) => m.with({ gl: 1 }, () => m.horn(b, a, z, r, C.ivory, C.horn.clone().lerp(C.ivory, .5), bend, n));
    if (base === 'cerat') {   // kryza (płyta z jasnym środkiem i ciemnym brzegiem, guzki/kolce na obwodzie), rogi nad oczami i na nosie, dziób
      const R = { huge: 1.3, tall: 1.25, spiky: 1, round: 1.08, plain: .8, hook: 1, curly: 1, ring: 1.05 }[o.fr] ?? 1, rows = [], N = 11;
      for (const rr of [.15, .6, 1]) rows.push([...Array(N)].map((_, i) => { const a = (i / (N - 1) - .5) * 3.3, d = rr * hk * 1.35 * R * (o.fr === 'tall' ? 1 + .3 * Math.cos(a) : 1);
        const p = P(-hk * .2 - Math.cos(a) * d * .8 + (1 - Math.cos(a)) * d * .3, hk * .35 + Math.cos(a) * d * .75, Math.sin(a) * d * 1.05); return [p.x, p.y, p.z, H]; }));
      m.with({ ow: .8 }, () => m.sheet(rows, i => m.tmp.copy(m.SKIN).lerp(m.BELLY, .2 + i * .35).lerp(m.DARK, i > .9 ? .25 : 0), .05));
      rows[2].slice(1, N - 1).forEach(([x, y, z], i) => { const p = V(x, y, z), out = p.clone().sub(P(-hk * .1, hk * .4)).normalize(), long = o.fr === 'spiky' || (o.fspk && i > 2 && i < 7);
        m.with({ gl: 1 }, () => m.horn(H, p.clone().addScaledVector(out, -hk * .05), p.clone().addScaledVector(out, hk * (long ? .55 + (i % 2) * .15 : .16)), hk * (long ? .07 : .06), m.BELLY, long ? C.horn : m.DARK, long ? .1 : 0)); });
      const br = Array.isArray(o.brow) ? V(o.brow[0], -o.brow[1]).multiplyScalar(U * .75) : null;   // rogi brwiowe: od czoła w przód i w górę
      if (br && br.length() > .1) for (const sd of [-1, 1]) ivory(H, P(l * .32, hk * .38, sd * hw(.32) * .55), P(l * .32 + br.x, hk * .38 + br.y, sd * hw(.32) * .75), hk * .1, -.12);
      if (o.nose) ivory(H, P(l * .78, c.top(.78)), P(l * .8 + o.nose * U * .3, c.top(.78) + o.nose * U * .85), hk * (.06 + o.nose * .003), -.15);
      if (o.boss) m.ball(H, P(l * .72, c.top(.72)), [hk * .22, hk * .12, hk * .16], m.BELLY.clone().lerp(m.DARK, .2));
      m.with({ gl: 1 }, () => m.ball(H, P(l * .96, -hk * .14), [l * .1, hk * .2, hw(.95) * .9], m.DARK.clone().lerp(m.BELLY, .2), [0, 0, -.6]));   // dziób
    }
    if (base === 'armor') {   // pancerz: osteodermy (tekstura) + guzy na grzbiecie, kolce po bokach, maczuga, rożki z tyłu głowy
      const nod = m.DARK.clone().lerp(m.SKIN, .45), bn = x => x < L * .3 ? t.pel : x < L * .7 ? t.mid : t.ch;
      for (let i = 0; i < 7; i++) for (const j of [-1.1, -.45, .45, 1.1]) { const x = -L * .1 + i * L * .19, a = j, y = hy + Math.cos(a) * D * .92, z = Math.sin(a) * W * .92;
        m.spike(bn(x), V(x, y - .02, z), V(x, y + D * .16, z * 1.03), D * .1, nod, m.DARK, 5); }
      if (o.spk || o.shd) for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const x = -L * .15 + i * L * .27, big = o.shd && i > 2;
        ivory(bn(x), V(x, hy - D * .1, sd * W * .85), V(x - D * .15, hy + (big ? D * .3 : 0), sd * (W + D * (big ? .9 : .5))), D * .12, .1); }
      c.tail.slice(0, 4).forEach((b, i) => { const p = b.userData.w, tr = q.tw / 2 * k * (1 - i / 6); for (const sd of [-1, 1]) ivory(b, V(p.x, p.y, sd * tr * .7), V(p.x - D * .2, p.y, sd * (tr + D * .3)), D * .07, .1); });
      if (o.club) { const b = c.tail.at(-1), p = b.userData.w.clone().add(V(-D * .3, 0)), cl = m.SKIN.clone().lerp(m.DARK, .35);
        m.with({ tx: 1 }, () => { for (const sd of [-1, 1]) m.ball(b, p.clone().add(V(0, 0, sd * D * .22)), [D * .45, D * .3, D * .32], cl); m.ball(b, p.clone().add(V(-D * .35, 0)), [D * .3, D * .25, D * .25], cl); }); }
      for (const sd of [-1, 1]) ivory(H, P(-hk * .05, hk * .3, sd * hw(0) * .8), P(-hk * .35, hk * .35, sd * hw(0) * 1.3), hk * .1, .1);
      if (o.glyp) m.with({ tx: 1 }, () => m.ball(t.mid, V(L * .45, hy + D * .1), [L * .85, D * 1.25, W * 1.15], m.SKIN.clone().lerp(m.BELLY, .2)));   // kopuła gliptodonta
    }
    if (base === 'stego') {   // dwa naprzemienne rzędy płyt (zaokrąglone romby, jaśniejsze z czerwonawym brzegiem) od karku po ogon, kolce na końcu ogona
      const n = o.n || 7, bones = [c.pelvis, ...c.spine, ...c.neck.slice(0, 2), ...c.tail.slice(0, 5)], bx = bones.map(b => b.userData.w.x), x0 = L * 1.1, x1 = -q.tl * U * .55;
      for (let i = 0; i < n * 2; i++) { const f = i / (n * 2 - 1), x = x0 + (x1 - x0) * f, b = bones[bx.reduce((bi, v, j) => Math.abs(v - x) < Math.abs(bx[bi] - x) ? j : bi, 0)];
        const top = b.userData.w.y + (b === c.pelvis || c.spine.includes(b) ? D * .85 : D * .45 * (1 - f * .3)), hgt = D * (.35 + .8 * Math.sin(Math.PI * Math.min(1, f * 1.1 + .05))) * (o.ph || 1), w = hgt * .75, z = (i % 2 ? 1 : -1) * D * .12;
        if (o.pl === 'spike' && f > .5) ivory(b, V(x, top - .05, z), V(x - hgt * .4, top + hgt, z * 3), D * .1, .05);
        else m.with({ ow: .8 }, () => m.sheet([[x + w * .45, x - w * .45], [x + w * .45, x - w * .55], [x + w * .05, x - w * .3], [x - w * .1, x - w * .12]].map((r, k2) =>
          r.map(px => [px, top - .05 + hgt * [0, .45, .85, 1][k2], z * (1 + k2 * .15), b])), i2 => m.tmp.copy(m.BELLY).lerp(m.SKIN, .25).lerp(C.mouth, i2 * .35), .04)); }
      const tb = c.tail.at(-2), tp = tb.userData.w;
      for (const sd of [-1, 1]) for (const k2 of [0, 1]) ivory(tb, V(tp.x - k2 * .2, tp.y + .03, sd * .05), V(tp.x - k2 * .2 + .1 - k2 * .2, tp.y + D * .5, sd * D * 1.2), D * .09, .05);
      if (o.shd) for (const sd of [-1, 1]) ivory(t.ch, V(L * .9, sy, sd * W * .8), V(L * .7, sy + D * .4, sd * (W + D * 1.1)), D * .12, .1);
    }
    if (base === 'sauro') {
      if (o.spn) c.neck.forEach(b => { const p = b.userData.w; for (const sd of [-1, 1]) ivory(b, V(p.x, p.y + nw * .6, sd * nw * .2), V(p.x - nw * 1.2, p.y + nw * 4, sd * nw * .5), nw * .12, .1); });
      if (o.hd === 'brach') m.with({ tx: 1 }, () => m.ball(H, P(l * .35, hk * .45), [l * .3, hk * .4, hw(.35) * .8], m.SKIN));   // garb nosowy brachiozaura
    }
    if (base === 'croc' && !o.liz) for (let i = 0; i < 12; i++) { const b = i < 4 ? t.ch : i < 8 ? t.mid : t.pel, x = L * (1 - i / 11) * .95, y = (i < 4 ? sy : hy) + D * .9;   // dwa rzędy płytek na grzbiecie
      for (const sd of [-1, 1]) m.spike(b, V(x, y - .02, sd * W * .25), V(x, y + D * .25, sd * W * .25), D * .12, m.SKIN.clone().lerp(m.DARK, .3), m.DARK, 4); }
    if (o.tsk) for (const sd of [-1, 1]) ivory(H, P(l * .6, c.low(.6), sd * hw(.6) * .8), P(l * .62, c.low(.6) - hk * .55, sd * hw(.6) * .85), hk * .07, .1);
    if (o.bulla) m.ball(H, P(l * .9, c.top(.9)), [hk * .3, hk * .25, hk * .3], m.SKIN);
    if (key === 'sail') sail(m, c, -L * .05, L * 1.05, hy + D * .7, (o.short ? 32 : 58) * U);
    if (mam) {
      for (const sd of [-1, 1]) {   // uszy (słoń: wielkie płaty), szable kota, ciosy mamuta
        if (ele) m.sheet([[P(-hk * .05, hk * .25, sd * hw(0) * .9), P(-hk * .45, hk * .3, sd * hw(0) * .9)], [P(0, -hk * .1, sd * hw(0) * 1.4), P(-hk * .5, -hk * .05, sd * hw(0) * 1.3)],
          [P(-hk * .1, -hk * .45, sd * hw(0) * 1.2), P(-hk * .4, -hk * .4, sd * hw(0) * 1.1)]].map(r => r.map(p => [p.x, p.y, p.z, H])), i => m.SKIN.clone().lerp(m.DARK, .15 + i * .1), .04);
        else { const pt = o.hd === 'dog' || o.hd === 'deer' || o.hd === 'rhino' || o.hd === 'indri', e = P(-hk * .05, hk * .48, sd * hw(0) * .55);
          if (pt) m.spike(H, e, e.clone().add(V(-hk * .15, hk * .35, sd * hk * .1)), hk * .14, m.SKIN, m.DARK, 6, .45);
          else { m.ball(H, e, [hk * .16, hk * .18, hk * .08], m.SKIN, [0, -sd * .3, 0]); m.ball(H, e.clone().add(V(hk * .02, 0, sd * hk * .03)), [hk * .1, hk * .12, hk * .05], C.gum, [0, -sd * .3, 0]); } }
        if (o.sab) ivory(H, P(l * .62, c.low(.62) + hk * .05, sd * hw(.62) * .6), P(l * .6, c.low(.62) - hk * 1.05, sd * hw(.62) * .55), hk * .09, -.15, V(1, 0, 0));
        if (ele) { const up = o.tu !== 'down', a = P(l * .55, -hk * .25, sd * hw(.55) * .7);   // ciosy: mamut zakręca w górę i do środka, deinoterium w dół i pod siebie
          m.with({ gl: 1 }, () => m.tube((up ? [[0, 0, 0], [.35, -.55, .15], [.95, -.75, .35], [1.45, -.3, .3], [1.5, .05, .12]] : [[0, 0, 0], [.1, -.4, 0], [-.05, -.7, 0], [-.3, -.85, 0]])
            .map(([x, y, z], i, A) => { const r = hk * .17 * (1 - i / A.length * .8); return [a.x + x * l, a.y + y * l, a.z + sd * z * l, r, r, H]; }), () => C.ivory, 8, 3)); }
      }
      if (ele) { c.trunk = []; let p = P(l * .9, -hk * .1);   // trąba: łańcuch 5 kości w dół, pierścieniowana
        for (let i = 0; i < 5; i++) { c.trunk.push(m.bone(c.trunk[i - 1] || H, p)); p = p.clone().add(V(.03 - i * .02, -hk * .38)); }
        m.tube([...c.trunk.map((b, i) => { const q2 = b.userData.w, r = hk * (.3 - i * .045); return [q2.x, q2.y, 0, r, r, b]; }), [p.x, p.y, 0, hk * .1, hk * .1, c.trunk[4]], [p.x + .03, p.y - .02, 0, .01, .01, c.trunk[4]]],
          (h, q2) => m.skin(h).multiplyScalar(Math.sin(q2.y / hk * 30) > .5 ? .82 : 1)); }
      if (o.hump || ele) m.with({ tx: 1 }, () => m.ball(H, P(-hk * .1, hk * .45), [hk * .5, hk * .45, hw(0) * .9], m.SKIN));   // kopuła czaszki / garb
      if (o.hump && !ele) m.with({ tx: 1 }, () => m.ball(t.ch, V(L * .85, sy + D * .55), [L * .35, D * .55, W * .7], m.SKIN));
      if (o.hd === 'rhino') { ivory(H, P(l * .85, c.top(.85)), P(l * 1.05, c.top(.85) + hk * 1.1), hk * .2, -.2); ivory(H, P(l * .6, c.top(.6)), P(l * .6, c.top(.6) + hk * .5), hk * .13, -.1); }
      if (o.hd === 'deer') for (const sd of [-1, 1]) { const a = P(-hk * .05, hk * .5, sd * hw(0) * .4), e = a.clone().add(V(-hk * .6, hk * 1.4, sd * hk * 1.6));   // łopaty poroża
        m.horn(H, a, e, hk * .07, C.horn, C.horn, .1); m.sheet([[a.clone().lerp(e, .45), e], [a.clone().lerp(e, .5).add(V(hk * .5, hk * .5, sd * hk * .2)), e.clone().add(V(hk * .3, hk * .6, sd * hk * .3))]].map(r => r.map(p => [p.x, p.y, p.z, H])), () => C.horn, .03); }
      if (o.fur) { const bs = [c.pelvis, ...c.spine], sh = m.SKIN.clone().lerp(m.DARK, .35);   // sierść: długie kosmyki zwisające z boków, brzucha i szyi
        for (let i = 0; i < 30; i++) { const f = (i % 15) / 14, sd = i < 15 ? -1 : 1, x = -L * .15 + f * L * 1.2, b = bs[Math.min(2, Math.floor(f * 3))], y = hy - D * (.35 + .25 * Math.sin(i * 2.3) ** 2), z = sd * W * (.85 - Math.abs(f - .5) * .3);
          m.with({ ow: .5 }, () => m.spike(b, V(x, y + D * .25, z), V(x - D * .15, y - D * .75, z * 1.05), D * .2, m.SKIN, sh, 5, .5)); }
        c.neck.forEach(b => { const p = b.userData.w; for (const sd of [-1, 0, 1]) m.with({ ow: .5 }, () => m.spike(b, V(p.x, p.y - nw * .3, sd * nw * .6), V(p.x - nw * .3, p.y - nw * 2, sd * nw * .7), nw * .4, m.SKIN, sh, 5, .5)); }); }
      if (base === 'sloth') for (const a of c.legs.filter(L2 => L2.front)) { const b = a.b[3], p = b.userData.w; for (const dz of [-1, 0, 1]) m.with({ gl: 1 }, () => m.horn(b, p.clone().add(V(lr * .3, 0, dz * lr * .35)), p.clone().add(V(lr * 1.8, -lr * .5, dz * lr * .5)), lr * .2, C.claw, C.ivory, .3, V(0, -1, 0))); }
    }
    const dino = base === 'cerat' || base === 'stego' || base === 'sauro' || base === 'armor';
    m.pat = mam ? { fu: 1, sp: key === 'cat' ? 26 : 0, ro: key === 'cat' } : { sc: 1, sp: liz && !o.liz && base !== 'croc' ? 34 : o.liz ? 50 : dino && o.p % 3 === 0 ? 24 : 0, os: base === "armor" ? 48 : o.arm2 ? 30 : base === 'croc' && !o.liz ? 36 : 0, st: dino && o.p % 3 === 1 ? 5 : 0 };
    Object.assign(c, { kind: 'quad', hy, jawMax: o.sab ? 1.1 : t.hd.teeth ? .7 : .35 });
  }
  /* ---------- pływacy: mozazaur, plezjozaur/pliozaur, ichtiozaur, rekin/ryba pancerna, wieloryb ----------
     tułów jak u lądowych (rurka), zamiast nóg płetwy (sztywne elipsoidy na własnych kościach), ogon faluje,
     płetwa ogonowa pionowa (ryby, gady) albo pozioma (wieloryb: ogon faluje góra-dół) */
  function swim(m, c, o, sp, key, base) {
    const { V, C } = m, plio = o.plio, nl = { long: 1.6, xlong: 2.3 }[o.nk] || 1.3, eel = o.k === 'eel';
    const S = {   // L, D, W, ogon [długość, grubość, zwężanie], szyja [x, y, kości, grubość], głowa [l, h, profil, zęby], płetwy [przód, tył], ogonowa, grzbietowa
      mosa: plio ? [1.1, .32, .4, [.6, .25, 1], [.2, 0, 2, .27], [.95, .6, 'thero', 1], [.7, .65], 0, 0] : [1.3, .26, .24, [2.1, .2, 1], [.25, 0, 2, .2], [.75, .48, 'thero', 1], [.45, .35], 'down', 0],
      plesio: [1, .3, .42, [.7, .2, 1.2], [nl * .9, nl * .35, 8, .17], [.32, .15, 'thero', .9], [.75, .7], 0, 0],
      ichthyo: [1, .34, .28, [1.1, .25, 1.4], [.15, 0, 1, .27], [.75, .55, 'beak', .5], [.4, .2], 'moon', .35],
      fish: [1.2, .36, .3, [1, .28, 1.3], [.1, 0, 1, .3], [.6, .7, 'shark', o.k === 'shark' ? 1 : .5], [.5, .15], 'shark', .45],
      whale: eel ? [2.2, .26, .24, [1.4, .2, 1.2], [.15, 0, 1, .22], [.7, .45, 'mammal', .8], [.3, 0], 'flat', 0] : [1.6, .42, .38, [1.2, .3, 1.3], [.12, 0, 1, .36], [.85, .8, 'mammal', .8], [.45, 0], 'flat', .2],
    }[base];
    const [L, D, W, [tl, tr, tp], [nx, ny, nn, nw], [hl, hh, prof, teeth], fins, fluke, dorsal] = S, hy = D * 1.05;
    const t = trunk(m, c, { hy, sy: hy, L, D, Db: D * 1.05, W, n0: V(L * 1.02, hy + D * .05), nv: V(nx, ny), nn, ex: 1.2, ey: .7, nw0: nw, nw1: nn > 2 ? nw * .45 : nw,
      tl, td: 0, tr, tp, tn: 7, head: { l: hl, h: hh, pr: 0, prof, teeth, eye: base === 'ichthyo' ? 1.15 : 1, brow: base === 'mosa', ex: prof === 'shark' ? .3 : .22 } });
    c.fins = [];
    for (const s of [-1, 1]) [[t.ch, L * .85, fins[0]], [t.pel, L * .05, fins[1]]].forEach(([par, x, len], i) => { if (!len) return;
      const a = V(x, hy - D * .45, s * W * .8), b = m.bone(par, a), tip = a.clone().add(V(-len * .55, -len * .3, s * len * .78));
      m.fin(b, a, tip, len * (prof === 'shark' ? .3 : .22), .035, m.SKIN.clone().lerp(m.DARK, .3)); c.fins.push({ b, s, ph: i * 1.3 }); });
    const tb = c.tail.at(-1), tp0 = tb.userData.w, x0 = tp0.x - tl / 7, y0 = tp0.y, k = D * 1.6, vert = fluke === 'flat';
    const F = (dx, dy) => vert ? [x0 + dx * k, y0, dy * k, tb] : [x0 + dx * k, y0 + dy * k, 0, tb];   // płetwa ogonowa w płaszczyźnie pionowej albo poziomej
    if (fluke) { const up = fluke === 'down' ? .35 : fluke === 'shark' ? 1.1 : 1, lo = fluke === 'shark' ? .6 : 1;
      m.sheet([[F(.05, .06), F(-.45 * up, .65 * up)], [F(.12, 0), F(-.22, 0)], [F(.05, -.06), F(-.4 * lo, -.6 * lo)]], (i, j) => m.tmp.copy(m.SKIN).lerp(m.DARK, j * .4)); }
    c.undul = vert ? 0 : .09; c.vert = vert ? .07 : 0;
    if (dorsal) { const x = L * .45, y = hy + D * .9, h = dorsal * (base === 'fish' ? 1.4 : 1);
      m.sheet([[[x + .2, y - .05, 0, t.mid], [x - .2, y - .05, 0, t.mid]], [[x - .12, y + h * .7, 0, t.mid], [x - .26, y + h, 0, t.mid]]], (i) => m.tmp.copy(m.SKIN).lerp(m.DARK, .2 + i * .3)); }
    if (base === 'fish' && o.k !== 'shark') m.ball(c.head, t.P(hl * .3, hh * .1), [hl * .45, hh * .55, hh * .5], m.DARK.clone().lerp(m.SKIN, .4));   // pancerz głowy (dunkleosteus)
    m.pat = { sc: base === 'fish' || base === 'whale' ? 0 : 1, sp: base === 'mosa' ? 30 : 0 };
    Object.assign(c, { kind: 'swim', hy, float: true, jawMax: teeth ? .8 : .4 });
  }
  /* ---------- pterozaur w locie: skrzydło = ramię → przedramię → nadgarstek → palec skrzydłowy, błona do miednicy ---------- */
  function ptero(m, c, o) {
    const { V, C } = m, hy = .5, L = .45, D = .13, W = .12, sy = hy + .04, bl = (o.bl || 50) * U * .7;
    const t = trunk(m, c, { hy, sy, L, D, Db: D * 1.1, W, n0: V(L * 1.02, sy + D * .3), nv: V(.32, .14), nn: 3, ex: 1.2, ey: .8, nw0: .07, nw1: .055,
      tl: .15, td: 0, tr: .05, tn: 2, head: { l: bl, h: .17, pr: -.12, prof: 'beak', eye: .9 } });
    const H = c.head, P = t.P, k = .17, bc = m.SKIN.clone().lerp(m.BELLY, .4), mem = (i, j) => m.tmp.copy(m.SKIN).lerp(m.BELLY, .35 + i * .2).lerp(m.DARK, (j > .9) * .3);
    if (o.cr === 'back') m.sheet([[P(bl * .2, k * .4), P(-bl * .1, k * .45)], [P(-bl * .55, k * 1.2), P(-bl * .6, k * 1.1)]].map(r => r.map(p => [p.x, p.y, p.z, H])), mem);
    if (o.cr === 'quetz') m.sheet([[P(bl * .45, k * .3), P(bl * .05, k * .4)], [P(bl * .3, k * .9), P(bl * .1, k * .95)]].map(r => r.map(p => [p.x, p.y, p.z, H])), mem);
    c.wings = [];
    for (const s of [-1, 1]) {
      const pts = [V(L * .9, sy, s * W * .8), V(L * .7, sy + .05, s * .4), V(L * .95, sy + .03, s * .78), V(L * .55, sy, s * 1.3), V(L * .15, sy - .04, s * 1.8)];
      const b = pts.slice(0, 4).reduce((l, p, i) => [...l, m.bone(l[i - 1] || t.ch, p)], []);
      pts.slice(0, 4).forEach((p, i) => m.fin(b[i], p, pts[i + 1], [.045, .04, .025, .018][i], [.045, .04, .025, .018][i], bc));
      for (let f = 0; f < 3; f++) m.spike(b[2], pts[2], pts[2].clone().add(V(.08, -.02, s * (f - 1) * .04)), .012, C.claw);
      const tr = [V(-L * .05, hy, s * W), V(L * .05, hy - .02, s * .45), V(L * .1, sy - .03, s * .85), V(0, sy - .05, s * 1.3), pts[4]];
      m.sheet([pts.map((p, i) => [p.x, p.y, p.z, [t.ch, ...b][i]]), tr.map((p, i) => [p.x, p.y, p.z, [t.pel, ...b][i]])], mem);
      const hip = V(-.02, hy - .05, s * .07); m.fin(t.pel, hip, hip.clone().add(V(-.32, -.08, s * .1)), .03, .03, bc);   // nogi wyciągnięte w tył
      c.wings.push({ b, s });
    }
    Object.assign(c, { kind: 'fly', hy, float: true, jawMax: .5 });
  }
  /* ---------- budowa i animacja ---------- */
  const BUILD = { thero: biped, raptor: biped, ornimim: biped, tbird: biped, dragon: biped, prosauro: biped, hadro: biped, orni: biped, dome: biped,
    sauro: quad, cerat: quad, armor: quad, stego: quad, mammal: quad, cat: quad, ele: quad, croc: quad, lizard: quad, sail: quad, synap: quad, amphib: quad, sloth: quad,
    mosa: swim, plesio: swim, ichthyo: swim, fish: swim, whale: swim, ptero };
  function build(ctx) {
    const fn = BUILD[ctx.key] || BUILD[ctx.base]; if (!fn) return null;
    T = ctx.THREE;
    const m = maker(ctx), c = { legs: [], arms: [], eyes: [], neck: [], tail: [], spine: [] };
    fn(m, c, ctx.o, ctx.sp, ctx.key, ctx.base);
    const mesh = m.mesh(), out = mesh.userData.out, body = ctx.body, bb = mesh.geometry.boundingBox, sk = new T.Skeleton(m.bones);
    body.add(m.bones[0], mesh, out); body.updateMatrixWorld(true); mesh.bind(sk); out.bind(sk, mesh.bindMatrix);
    const s = ctx.H / Math.max(bb.max.y - Math.min(0, bb.min.y), (bb.max.x - bb.min.x) * LEN_K);
    out.material.userData.value = MAT.outline * ctx.H / s;
    body.scale.setScalar(s); body.position.set(-(bb.min.x + bb.max.x) / 2 * s, c.float ? -bb.min.y * s : 0, 0);
    // kotwice dla efektów (zęby, plucie, ryk): puste węzły na kościach — czubek pyska (żuchwa) i środek czaszki
    const anchor = (b, p) => { const a = new T.Object3D(); a.position.copy(p ?? b.userData.w).sub(b.userData.w); b.add(a); return a; }, H = c.head || m.bones.at(-1);
    return Object.assign(rig(c, ctx, s), { anchors: { mouth: anchor(c.jaw || H, c.hp?.(c.hl * .95, -c.hh * .2)), head: anchor(H, c.hp?.(c.hl * .35, c.hh * .1)) } });
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
          const u = Math.sin(tm * 2.6 + ph - i * .7) * (.3 + f) * idle;   // falowanie pływaka: bok-bok (ryby, gady) albo góra-dół (wieloryb)
          b.rotation.set(0, (tw * 1.4 + ch.sy * .5) / nt + Math.sin(tm * 1.3 + ph - i * .55) * .05 * (.4 + f) * idle + u * (c.undul || 0),
            -(ch.tl + .1 * Math.sin(tm * .9 + ph - i * .4) * idle) / nt - (i ? 0 : ch.bp * .75) + (ch.fold > .5 ? .05 : 0) + u * (c.vert || 0));
        });
        c.arms.forEach(a => { const r = ch.ar, j = Math.sin(tm * 1.6 + ph + a.s) * .05 * idle;
          a.b[0].rotation.set(0, 0, r * .9 + j); a.b[1].rotation.set(0, 0, -.3 * Math.max(0, -r) + r * .4 - j); a.b[2].rotation.set(0, 0, -r * .3); });
        c.fins?.forEach(F => F.b.rotation.set(-F.s * (Math.sin(tm * 2.6 + ph + F.ph) * .25 * idle + ch.fp * .8), F.s * ch.fp * .4, Math.sin(tm * 2.6 + ph + F.ph + 1) * .15 * idle));
        c.wings?.forEach(W => { const f = (Math.sin(tm * 5 + ph) * .55 + .1) * idle + ch.wg;   // machanie: ramię w górę/dół, dłoń i palec dociągają z opóźnieniem
          W.b[0].rotation.set(-W.s * f, 0, 0); W.b[1].rotation.set(-W.s * f * .3, 0, 0); W.b[2].rotation.set(-W.s * (Math.sin(tm * 5 + ph - .8) * .2 * idle + ch.wg * .2), 0, 0); W.b[3].rotation.set(-W.s * f * .2, 0, 0); });
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
