/* ================= WYCINANKI 2D (tryb 'bill') — kontrakt RIG w js/arena3d.js =================
   Rysunek z art.js (drawParts) pocięty na regiony: każdy region to osobny kartonik z własnym konturem i wytłoczonymi
   ściankami (jak billboard() w arena3d.js), przypięty pinezką w przegubie do rodzica. Dolna szczęka = głowa przycięta linią pyska.
   Ogony, szyje, trąby i tułowia pływaków gną się: gęsta siatka, wierzchołek obracany wokół przegubu o kąt rosnący z odległością.
   Każdy przegub to sprężyna (kąt, zgięcie) → cel z pozy skacze, kartonik dobija z przestrzałem i chybocze się jak guma.

      pup (obrót: przewrotka, beczka) → pose (stanie dęba, zgniecenie, odbicie z−: strona B)
        └ body ─┬─ neck ── head ─┬─ jaw (+ wnętrze pyska)      warstwy w z: kolejność rysowania w art.js
                ├─ tail          ├─ teeth, fire, trunk
                └─ hl hl2 fl fl2 arm wing wing2 sail …                                                          */
window.Puppet2D = (() => {
  const PX = 2.6;                                  // px tekstury na jednostkę viewBox (cały rysunek ≈ 480×320)
  const WALL = { cell: 4, inset: 3, shade: .62 };  // ścianki: komórka konturu [px], próbka koloru w głąb, jasność (jak SLAB)
  const DEPTH = .012, LAYER = .03, EPS = .5;        // pół-grubość kartonika i odstęp warstw (× H); szczęka/zęby o pół grubości obok głowy
  const MESH_PX = 18;                              // oczko siatki części giętkich [px]
  const VB_H = 140;                                // wysokość viewBox rysunku = H
  const JAW_MAX = 1.1, MOUTH = 0x5A1620;           // największe otwarcie pyska [rad] (wnętrze pyska), kolor gardła
  const JAW_LONG = .25, MOUTH_R = .75;              // długi pysk: otwarcie ≤ JAW_LONG·H/długość; promień wnętrza pyska (× długość)
  const FOLLOW = 1.5;                                // dziecko na końcu giętkiej części obraca się mocniej niż sam łuk (styczna)
  const PARENT = { head: 'neck', jaw: 'head', teeth: 'head', fire: 'head', trunk: 'head' };   // reszta → body
  // sprężyny [sztywność, tłumienie]: mniejsze = bardziej gumowe, dłużej się chybocze
  const SPRING = { tail: [120, 7], neck: [170, 10], trunk: [110, 6], sail: [160, 5], head: [330, 15], jaw: [900, 26],
    wing: [260, 12], wing2: [260, 12], def: [380, 19], q: [300, 10], pitch: [140, 11] };
  const LIMP = .25;                                // po nokaucie sprężyny miękną (× sztywność)
  const WALK = 5, STEP = .13, BOB = .012;          // dreptanie w miejscu: [rad/s], wymach nóg, podskok tułowia (× H)

  /* ---------- pozy ataków: kanał → [przy zamachu W, przy ciosie S]; fx = dodatki (drżenie, obroty) ----------
     a: kąty przegubów (+ = przeciwnie do zegara: głowa w górę, noga do przodu, ogon w dół, szczęka − = otwarta)
     b: zgięcie (ogon/szyja/trąba), s: powiększenie części (nadęte policzki), sq: wysokość (<1 zgniecenie), pitch: dęba (+) / pochylenie,
     fwd: [cofnięcie × H, doskok × zasięg do przeciwnika], up: podskok × H, hold: jak długo trzyma cios, flip: t → odbicie lustrzane (zwrot ogonem) */
  const M = {
    bite: { a: { body: [.14, -.12], neck: [.3, -.2], head: [.35, -.12], jaw: [-1.15, 0], tail: [.1, -.1] }, b: { tail: [.5, -.3], neck: [.25, 0] }, sq: [-.08, .08], fwd: [-.5, 1] },
    claw: { a: { arm: [1.6, -.9], arm2: [1.4, -.7], fl: [1.3, -.8], body: [.1, -.25], head: [.25, -.1], jaw: [-.5, 0] }, b: { tail: [.4, -.5] }, pitch: [.25, -.05], fwd: [-.4, .95] },
    kick: { a: { hl: [-.7, 1.5], body: [.3, .35], arm: [.6, .4], head: [.1, .2], tail: [0, -.3] }, b: { tail: [.4, -.7] }, fwd: [-.3, .85], up: [0, .3] },
    pounce: { a: { hl: [.3, -.9], hl2: [.3, -.9], fl: [-.3, 1.1], fl2: [-.3, 1.1], arm: [0, 1.2], head: [-.3, .2], jaw: [-.3, -1] }, b: { tail: [.8, -.6] }, sq: [-.3, .15], fwd: [-.5, 1.05], up: [0, .9] },
    slash: { a: { hl: [-.8, 2], hl2: [-.4, .7], body: [.2, .25], arm: [.8, .9], tail: [.3, -.7], head: [.2, .15], jaw: [-.4, -.6] }, b: { tail: [.5, -1] }, sq: [-.25, .15], pitch: [-.05, .2], fwd: [-.4, .95], up: [0, .7] },
    grab: { a: { arm: [1.5, -1.1], arm2: [1.4, -1], fl: [1.2, -.9], head: [.3, -.15], jaw: [-1, -.2] }, b: { arm: [.4, -1.3], arm2: [-.4, 1.3], neck: [.3, -.2], tail: [.4, -.4] }, fwd: [-.4, 1], hold: .22,
      fx: (T, t) => { const k = ss((t - .6) / .2); T.pitch += .3 * k; legs(T, t * 30, .35 * k); } },   // chwyta i ciągnie do siebie
    thumb: { a: { arm: [-.5, 1.4], body: [.2, -.2], head: [.2, 0] }, b: { tail: [.4, -.5] }, fwd: [-.4, .9] },
    // ogon: zwrot tyłem (odbicie wycinanki), zamach i chlast, zwrot z powrotem
    tail: { a: { tail: [-.5, .35], head: [.3, 0], body: [.05, -.15] }, b: { tail: [-1.2, 1.4] }, fwd: [0, .9], flip: t => Math.cos(Math.PI * ss((t - .04) / .16) * (1 - ss((t - .8) / .14))) },
    stomp: { a: { fl: [.7, -.1], fl2: [.5, -.1], arm: [.8, 0], hl: [0, 0], head: [.3, -.2], jaw: [-.6, 0] }, b: { tail: [.6, -.7] }, pitch: [.42, -.06], sq: [.05, -.2], fwd: [-.3, .6] },
    headbutt: { a: { neck: [.35, -.55], head: [.2, -.7], body: [.08, -.18] }, b: { tail: [.4, -.6] }, sq: [-.12, -.1], fwd: [-.6, 1.05] },
    gore: { a: { neck: [-.4, .35], head: [-.6, .6], body: [-.08, .12] }, b: { tail: [.5, -.6] }, pitch: [-.12, .1], fwd: [-.5, 1] },
    neck: { a: { neck: [.6, -.8], head: [.3, -.4], tail: [0, .1] }, b: { neck: [.5, -.6], tail: [.3, -.4] }, pitch: [.1, -.04], fwd: [-.3, .6] },
    peck: { a: { neck: [.5, -.6], head: [.35, -.5], jaw: [-.7, 0], body: [.05, -.1] }, b: { neck: [.3, -.3] }, fwd: [-.4, .95] },
    wing: { a: { wing: [-.9, 1.1], wing2: [.8, -1], neck: [.3, -.2], head: [.3, -.2], jaw: [-.6, 0] }, fwd: [-.4, .9], up: [.4, .15] },
    dive: { a: { wing: [-.7, .5], wing2: [.6, -.4], neck: [.3, -.3], head: [.2, -.4], jaw: [0, -.8] }, pitch: [.25, -.4], fwd: [-.5, 1], up: [1, -.2] },
    flipper: { a: { fl: [1.4, -1.4], hl: [-.6, .6], head: [.2, -.2], jaw: [-.4, 0] }, b: { body: [.3, -.3], tail: [.4, -.5] }, fwd: [-.4, .9] },
    ram: { a: { head: [.15, -.1], jaw: [-.4, 0], fl: [-.5, -.8], hl: [-.4, -.6] }, b: { body: [.3, 0], tail: [.6, -.3] }, sq: [.06, -.18], fwd: [-.7, 1.05] },
    tusk: { a: { neck: [-.3, .3], head: [-.55, .55], trunk: [.4, -.4] }, b: { trunk: [.8, -.5], tail: [.4, -.4] }, pitch: [-.1, .12], fwd: [-.5, .95] },
    trunk: { a: { trunk: [1.3, -.5], head: [.35, -.25], jaw: [-.4, 0] }, b: { trunk: [1.4, -.8], tail: [.3, -.3] }, pitch: [.15, -.05], fwd: [-.3, .75] },
    fire: { a: { neck: [.5, -.3], head: [.5, -.2], jaw: [-.5, -1], body: [.12, -.1] }, b: { tail: [.6, -.5] }, fwd: [-.3, .2] },
    // jad: groźne kołysanie z rozwartą paszczą (kły), błyskawiczne ukąszenie i przytrzymanie
    venom: { a: { body: [.12, -.15], neck: [.5, -.3], head: [.55, -.25], jaw: [-1.15, -1], tail: [.2, -.2] }, b: { body: [.6, -.3], neck: [.4, -.2], tail: [.6, -.4] }, fwd: [-.6, 1], hold: .25,
      fx: (T, t, W) => { const k = Math.sin(t * 24) * W; add(T.a, 'body', .12 * k); add(T.a, 'neck', .3 * k); add(T.a, 'head', -.25 * k); add(T.b, 'body', .3 * k); } },
    // plucie: głowa w tył, policzki nadęte, wyrzut do przodu (pocisk rysuje arena3d.js)
    spit: { a: { neck: [.2, -.45], head: [.25, -.4], jaw: [.05, -1], body: [.05, -.1] }, b: { tail: [.5, -.4], neck: [.3, -.3] }, s: { head: [.32, -.08] }, sq: [.1, -.12], fwd: [-.5, .2] },
    roar: { a: { neck: [-.2, .45], head: [-.3, .6], jaw: [-.2, -1.2], body: [-.05, .12], arm: [.3, 1.1], tail: [.2, .4] }, b: { tail: [.3, .9] }, sq: [-.12, .25], fwd: [-.5, .15], hold: .35,
      fx: (T, t, W, S) => { T.jit += .03 * S; add(T.a, 'head', .1 * S * Math.sin(t * 90)); } },
    // dwa razy staje dęba i wali przednimi nogami
    trample: { a: { fl: [.7, -.1], fl2: [.5, -.1], arm: [.8, 0], head: [.3, -.2], jaw: [-.6, 0] }, b: { tail: [.6, -.7] }, fwd: [-.3, .6],
      fx: (T, t) => { const r = (a, b) => ss((t - a) / .14) * (1 - ss((t - b) / .06)); T.pitch += .6 * r(.04, .3) + .5 * r(.42, .65);
        T.sq -= .25 * (r(.32, .4) + r(.67, .76)); add(T.a, 'fl', .8 * (r(.04, .3) + r(.42, .65))); } },
    coil: { a: { head: [.5, -.5], jaw: [-1, -.4], neck: [.3, -.3] }, b: { body: [.8, -2.3], tail: [.6, -1.4] }, fwd: [-.4, 1], hold: .3, fx: (T, t, W, S) => { T.sq += .1 * S * Math.sin(t * 30); } },
    // żądło: ogon łukiem nad grzbietem, pchnięcie do przodu
    sting: { a: { tail: [-.3, -1], body: [.05, -.12], head: [.15, -.2] }, b: { tail: [-.6, -2.4] }, pitch: [.05, -.12], fwd: [-.4, .7], hold: .2 },
    pincer: { a: { arm: [-.5, .3], arm2: [.5, -.3], fl: [.6, -.5], head: [.15, -.1], jaw: [-.5, 0] }, fwd: [-.4, .95],
      fx: (T, t, W, S) => { const k = Math.sin(t * 48) * (W + S) * .45; add(T.a, 'arm', k); add(T.a, 'arm2', -k); add(T.a, 'jaw', -Math.abs(k)); } },
    tentacle: { a: { trunk: [.5, -.9], head: [.2, -.2], body: [-.1, .1] }, b: { trunk: [1, -1.6] }, fwd: [-.5, .95], fx: (T, t) => add(T.b, 'trunk', .4 * Math.sin(t * 30)) },
    shell: { a: { head: [-.6, -.3], fl: [.4, -.6], hl: [.4, -.6] }, sq: [-.2, .1], fwd: [-.6, 1.05] },
  };
  Object.assign(M, {   // warianty: ta sama poza + dodatek fx(T, t, W, S)
    shake: { ...M.bite, fx: (T, t) => { const k = Math.sin(t * 60) * ss((t - .48) / .1) * (1 - ss((t - .6) / .35));
      add(T.a, 'head', .5 * k); add(T.a, 'neck', .35 * k); add(T.a, 'body', .1 * k); add(T.b, 'tail', .6 * k); } },
    crush: { ...M.bite, hold: .3, fx: (T, t, W, S) => { const k = S * ss((t - .56) / .06), c = Math.sin(t * 50);   // zaciska i miele
      add(T.a, 'jaw', -.35 * k * (1 + c)); add(T.a, 'head', .12 * k * c); T.sq -= .06 * k * c; } },
    charge: { ...M.headbutt, fwd: [-.4, 1.1], fx: (T, t, W, S) => legs(T, t * 22, .45 * (1 - S * .6)) },
    rear: { ...M.stomp, pitch: [.68, -.08], fwd: [-.3, .7] },
    club: { ...M.tail, b: { tail: [-1.5, 1.8] } },
    spin: { ...M.tail, b: { tail: [-.8, 1.2] }, flip: t => Math.cos(4 * Math.PI * ss((t - .04) / .86)) },   // dwa piruety
    roll: { ...M.bite, sq: [-.2, -.15], fwd: [-.4, 1] },
  });
  const ROLLS = { roll: 1 };                     // beczka wokół osi tułowia (krokodyl), przewrotka (pancerny)
  const HIT = { pounce: .6, stomp: .52, rear: .52, dive: .58, tail: .55, club: .55, spin: .55, slash: .55, venom: .5, spit: .55, roar: .5, trample: .37, sting: .52 };   // ułamek t trafienia
  const MS = { charge: 700, spin: 700, rear: 700, roll: 700, pounce: 680, slash: 680, venom: 700, crush: 700, grab: 700, roar: 700, trample: 700, coil: 700, tail: 680, club: 680, sting: 680 };
  const THUMP = { stomp: [.52], rear: [.52], trample: [.37, .71] };   // chwile uderzenia o ziemię (drżenie kamery)
  const HIT_AT = .48, ATTACK_MS = 620;
  const H_REF = 2.4, FOE = .6, REACH_MIN = .15;   // wysokość największego (H_MAX w arena3d.js); pół tułowia przeciwnika; najmniejszy doskok (× H)
  /* ---------- reakcje trafionego wg stylu ciosu: RX[rodzaj](T, t, s = sin πt) ---------- */
  const REACT = Object.fromEntries(Object.entries({ jerk: 'bite crush shake peck pincer', flinch: 'claw slash thumb', woozy: 'venom sting spit',
    flat: 'stomp trample rear pounce dive shell roll', fling: 'headbutt ram charge gore neck kick tusk', spin: 'tail club spin flipper wing trunk',
    squeeze: 'coil grab tentacle', cower: 'roar', hot: 'fire' }).flatMap(([r, l]) => l.split(' ').map(s => [s, r])));
  const DIZZY = { woozy: 2, spin: 1 }, FLAT = .42;   // ile s trwa oszołomienie; wysokość naleśnika
  const GAP0 = 4.4, WIN_CYCLE = 2.6, WIN_ROAR = 1.5, WIN_HOP = .25;   // odstęp na start (2×GAP); zwycięstwo: cykl [s], od kiedy ryk, podskok z arena3d.js
  const RX = {
    jerk: (T, t, s) => { const k = Math.sin(t * 45) * s;   // ugryziony: szarpie się i wyrywa
      add(T.a, 'head', .6 * k); add(T.a, 'neck', .4 * k); add(T.a, 'jaw', -.6 * s); add(T.a, 'arm', 1.4 * k); legs(T, t * 45, .5 * s); add(T.b, 'tail', 1.2 * k); T.sq -= .15 * s; T.pitch += .12 * k; },
    flinch: (T, t, s) => { T.sq -= .28 * s; T.pitch += .25 * s; T.jit += .02 * s;   // podrapany: kuli się i odchyla
      add(T.a, 'head', -.5 * s); add(T.a, 'neck', -.3 * s); add(T.a, 'arm', 1.2 * s); add(T.b, 'tail', .9 * s); add(T.a, 'jaw', -.4 * s); },
    woozy: (T, t, s) => { T.sq -= .12 * s; add(T.a, 'jaw', -.5 * s); add(T.a, 'head', .3 * s); },   // dalej oszołomienie (dizzy w update)
    flat: (T, t) => { const f = 1 - ss((t - .5) / .08); T.sq = 1 - (1 - FLAT) * f; T.sw = 1 + .6 * f; legs(T, Math.PI / 2, 1.1 * f); },   // naleśnik, potem pyk!
    fling: (T, t, s) => { T.spin += .9 * s; T.lift += .3 * s; legs(T, Math.PI / 2, .9 * s); add(T.a, 'arm', 1.3 * s); add(T.a, 'jaw', -.7 * s); add(T.b, 'tail', -.8 * s); },
    spin: (T, t, s) => { T.m = Math.cos(2 * Math.PI * ss(t)); add(T.b, 'tail', 1.2 * s); add(T.a, 'arm', s); },   // okręcony wokół siebie
    squeeze: (T, t, s) => { T.sq += .3 * s; T.sw = 1 - .4 * s; legs(T, t * 50, .5 * s); add(T.a, 'jaw', -.6 * s); add(T.a, 'head', .3 * s); },   // ściśnięty na patyk
    cower: (T, t, s) => { T.sq -= .2 * s; T.jit += .03 * s; add(T.a, 'head', -.5 * s); add(T.a, 'neck', -.4 * s); add(T.b, 'tail', s); add(T.a, 'arm', s); },
    hot: (T, t, s) => { T.lift += .35 * Math.abs(Math.sin(t * 3 * Math.PI)) * (1 - t); legs(T, t * 40, .8 * s); add(T.a, 'jaw', -.8 * s); add(T.a, 'tail', -.6 * s); },
  };

  const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const pop = x => { x = Math.min(1, Math.max(0, x)) - 1; return 1 + 2.7 * x * x * x + 1.7 * x * x; };   // z przestrzałem (easeOutBack)
  const bounce = x => { const n = 7.5625, d = 2.75; return x < 1 / d ? n * x * x : x < 2 / d ? n * (x -= 1.5 / d) * x + .75 : x < 2.5 / d ? n * (x -= 2.25 / d) * x + .9375 : n * (x -= 2.625 / d) * x + .984375; };
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  const legs = (T, ph, amp) => { for (const [n, s] of [['hl', 1], ['hl2', -1], ['fl', -1], ['fl2', 1]]) add(T.a, n, s * amp * Math.sin(ph)); };
  // obwiednie ataku przesunięte tak, by cios (koniec zamachu, szczyt S) wypadał w h = hitAt
  const env = (t, h, hold = .14) => { const k = h / HIT_AT, W = ss(t / (.3 * k)) * (1 - ss((t - .38 * k) / (.1 * k))),
    S = pop((t - .36 * k) / (.12 * k)) * (1 - ss((t - h - hold) / (1 - h - hold))); return [W, S]; };

  function build(ctx) {
    const { THREE, body, key, o, P, H } = ctx;
    if (typeof drawParts !== 'function') return null;
    const D = drawParts(key, o, P), K = H / VB_H, d = DEPTH * H, V = (x, y) => [(x - 100) * K, (D.ground - y) * K];
    const by = Object.fromEntries(D.pieces.map((p, i) => [p.g, { ...p, z: i * LAYER * H }]));
    const J = g => D.j[g] && V(...D.j[g]);
    if (D.j.jaw && !by.jaw && (by.head || by.body)) {   // szczęka: ta sama głowa, przycięta poniżej linii pyska (chyba że narysowana osobno — kaszalot)
      const src = by.head || by.body, [hx, hy, tx, ty] = D.j.jaw, L = Math.hypot(tx - hx, ty - hy), ux = (tx - hx) / L, uy = (ty - hy) / L;
      const [nx, ny] = ux > 0 ? [-uy, ux] : [uy, -ux], q = [[hx - ux * 2, hy - uy * 2], [tx + ux * 30, ty + uy * 30]];
      const poly = 'M' + [...q, ...q.slice().reverse().map(([x, y]) => [x + nx * 80, y + ny * 80])].map(v => v.join(',')).join(' L') + ' Z';
      by.jaw = { ...src, g: 'jaw', clip: poly, z: src.z - EPS * d * 2, of: src.g };
      src.clip = 'M-999,-999 H999 V999 H-999 Z ' + poly;
      if (by.teeth) by.teeth.z = src.z + EPS * d * 2;
    }
    const pup = new THREE.Group(), pose = new THREE.Group(), mats = [];
    body.add(pup); pup.add(pose);
    const bodyBox = by.body?.box || D.pieces[0].box, P0 = J('body') || V((bodyBox[0] + bodyBox[2]) / 2, bodyBox[3]);
    const pcs = Object.values(by).map(p => {
      const piv = J(p.g) || null, jt = D.j[p.g] || [];
      return { ...p, piv, tip: p.g !== 'jaw' && jt.length > 2 ? V(jt[2], jt[3]) : null, a: { x: 0, v: 0 }, b: { x: 0, v: 0 }, w: 0, wp: 0 };
    });
    const get = g => pcs.find(p => p.g === g);
    for (const p of pcs) {   // rodzic: PARENT albo najbliższy istniejący przodek, w końcu body
      let g = p.g === 'body' ? null : PARENT[p.g] || 'body';
      while (g && !get(g)) g = PARENT[g] || (g === 'body' ? null : 'body');
      p.parent = g && get(g);
      p.piv = p.piv || p.parent?.piv || P0;
    }
    for (const p of [...pcs].sort((a, b) => depth(a) - depth(b))) {
      p.grp = new THREE.Group();
      const pp = p.parent;
      (pp ? pp.grp : pose).add(p.grp);
      p.c0 = [p.piv[0] - (pp ? pp.piv[0] : 0), p.piv[1] - (pp ? pp.piv[1] : 0)];
      p.grp.position.set(...p.c0, p.z - (pp ? pp.z : 0));
      if (pp?.tip) { const ax = pp.tip[0] - pp.piv[0], ay = pp.tip[1] - pp.piv[1], l2 = ax * ax + ay * ay; p.s = (p.c0[0] * ax + p.c0[1] * ay) / l2; }
      if (p.tip) { p.ax = [p.tip[0] - p.piv[0], p.tip[1] - p.piv[1]]; p.len = Math.hypot(...p.ax); p.ax = p.ax.map(v => v / p.len); }
      slab(THREE, p, K, d, D.ground, mats);
    }
    const jaw = get('jaw');
    let mouth = () => {}, jawMax = JAW_MAX;
    if (jaw) {   // wnętrze pyska: ciemny wachlarz od linii pyska do szczęki, rozpinany co klatkę wg otwarcia (kolor w wierzchołkach — błysk trafienia zmienia color)
      const [hx, hy, tx, ty] = D.j.jaw, h = V(hx, hy), t = V(tx, ty), L = Math.hypot(t[0] - h[0], t[1] - h[1]), r = L * MOUTH_R, a0 = Math.atan2(t[1] - h[1], t[0] - h[0]);
      jawMax = Math.min(JAW_MAX, JAW_LONG * H / L);   // długi pysk (mozazaur, krokodyl) otwiera się mniej — wachlarz nie wystaje poza szczęki
      const g = new THREE.BufferGeometry(), N = 8, pos = new Float32Array(N * 9), c = new THREE.Color(MOUTH);
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Array(N * 3).fill([c.r, c.g, c.b]).flat(), 3));
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), w = new THREE.Mesh(g, m); w.frustumCulled = false;
      w.position.set(h[0] - jaw.parent.piv[0], h[1] - jaw.parent.piv[1], jaw.z - jaw.parent.z - d * 1.2); jaw.parent.grp.add(w); mats.push(m);
      mouth = open => { for (let i = 0; i < N; i++) for (const [k, f] of [[3, i / N], [6, (i + 1) / N]]) {
        pos[i * 9 + k] = Math.cos(a0 + open * f) * r; pos[i * 9 + k + 1] = Math.sin(a0 + open * f) * r; } g.attributes.position.needsUpdate = true; };
    }
    // kotwice dla efektów (arena3d.js): czubek pyska na górnej szczęce, środek głowy — puste Object3D jadące z kartonikami
    const anchor = (p, [x, y]) => { const o = new THREE.Object3D(); o.position.set(x - p.piv[0], y - p.piv[1], 0); p.grp.add(o); return o; };
    const hp = get('head') || get('body') || pcs[0], hb = hp.box, hc = V((hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2);
    const anchors = { head: anchor(hp, hc), mouth: D.j.jaw ? anchor(jaw ? jaw.parent : hp, V(D.j.jaw[2], D.j.jaw[3])) : anchor(hp, V(hb[2], (hb[1] + hb[3]) / 2)) };
    const S = { q: { x: 1, v: 0 }, w: { x: 1, v: 0 }, pitch: { x: 0, v: 0 } }, feet = ['hl', 'hl2', 'fl', 'fl2'].map(J).filter(Boolean).map(v => v[0]);
    const back = feet.length ? Math.min(...feet) : P0[0], front = feet.length ? Math.max(...feet) : P0[0], mid = (bodyBox[1] + bodyBox[3]) / 2;
    const cy = (D.ground - mid) * K, top = Math.max(...pcs.map(p => (D.ground - p.box[1]) * K)), swim = D.water || ctx.sp.loco === 'swim', fly = D.fly;
    // zasięg: nos / koniec ogona od środka; oś odbicia lustrzanego; małe zwierzaki ruszają się przesadnie (ex, G)
    const xs = pcs.flatMap(p => [p.box[0], p.box[2]]).map(x => (x - 100) * K), nose = Math.max(...xs), rear = -Math.min(...xs), cx = ((bodyBox[0] + bodyBox[2]) / 2 - 100) * K;
    const ex = Math.min(2, Math.max(1, H_REF / H)), G = 1 + (ex - 1) * .5;
    let prev = null, gap0 = GAP0, dizzy = 0, koT = 0;

    function update(st) {
      const dt = Math.min(st.dt || .016, .05), tm = st.tm, T = { a: {}, b: {}, s: {}, w: {}, sq: 1, sw: 1, pitch: 0, lift: 0, fire: 0, spin: 0, m: 1, jit: 0 };
      let roll = 0, spin = 0, stiff = st.ko ? LIMP : 1;
      /* spoczynek: oddech, dreptanie, kołysanie ogona (podąża z opóźnieniem dzięki sprężynom) */
      T.sq += .02 * Math.sin(tm * 2.2);
      if (fly) { add(T.a, 'wing', -.5 * Math.sin(tm * 7)); add(T.a, 'wing2', .45 * Math.sin(tm * 7)); add(T.a, 'hl', .1 * Math.sin(tm * 3)); }
      else if (swim) { T.w.body = .12; T.w.tail = .25; add(T.a, 'tail', .25 * Math.sin(tm * 4)); add(T.a, 'fl', .35 * Math.sin(tm * 3)); add(T.a, 'hl', .35 * Math.sin(tm * 3 + 1));
        add(T.a, 'fl2', .3 * Math.sin(tm * 3 + 2)); add(T.a, 'hl2', .3 * Math.sin(tm * 3 + 3)); }
      else { legs(T, tm * WALK, STEP); T.lift += BOB * Math.abs(Math.cos(tm * WALK)); }
      add(T.a, 'tail', .06 * Math.sin(tm * 1.7)); add(T.b, 'tail', .2 * Math.sin(tm * 1.7 - 1)); add(T.b, 'trunk', .25 * Math.sin(tm * 1.3));
      add(T.a, 'neck', .05 * Math.sin(tm * 2.2 + 1)); add(T.a, 'head', .07 * Math.sin(tm * 2.2 + .4)); add(T.a, 'arm', .12 * Math.sin(tm * 3));
      add(T.a, 'jaw', -.06 - .06 * Math.sin(tm * 2.2)); T.fire = .25 + .1 * Math.sin(tm * 9);
      const k = st.k, t = st.t, rx = REACT[st.style] || 'jerk', flat = rx === 'flat';
      if (k !== prev && k === 'hit') { kick({ head: 7, neck: 5, jaw: -6, arm: 6, tail: -3 }, { tail: -8, neck: 3 }, -3); if (DIZZY[rx]) dizzy = tm + DIZZY[rx]; }
      if (k !== prev && k === 'ko') { koT = tm; for (const p of pcs) { p.a.v += (Math.random() - .5) * 16; p.b.v += (Math.random() - .5) * 12; } }   // pinezki puszczają
      if (k !== 'lunge' && st.gap) gap0 = st.gap;
      prev = k;
      if (k === 'lunge') {
        const m = M[st.style] || M.bite, [W, Sx] = env(t, hitAt(st.style), m.hold);
        for (const c of ['a', 'b', 's']) for (const [n, [w, s]] of Object.entries(m[c] || {})) add(T[c], n, (w * W + s * Sx) * G);
        if (m.sq) T.sq += (m.sq[0] * W + m.sq[1] * Sx) * ex;
        if (m.pitch) T.pitch += (m.pitch[0] * W + m.pitch[1] * Sx) * G;
        m.fx?.(T, t, W, Sx);
        if (m.flip) T.m = m.flip(t);
        if (st.style === 'fire') T.fire = .25 + 1.6 * Sx;
        if (ROLLS[st.style]) { const r = 2 * Math.PI * ss((t - .25) / .5); if (ctx.base === 'armor') spin = -r; else roll = r; }
        thump(t, THUMP[st.style]);
      } else if (k === 'hit' || k === 'ko') { const u = Math.min(1, k === 'ko' ? t * 2 : t); RX[rx](T, u, Math.sin(Math.PI * u)); }
      else if (k === 'dodge') { const s = Math.sin(Math.PI * t); T.sq += .15 * s; legs(T, 0, 0); for (const n of ['hl', 'hl2']) add(T.a, n, -.8 * s);
        for (const n of ['fl', 'fl2', 'arm']) add(T.a, n, .9 * s); add(T.b, 'tail', .9 * s); add(T.a, 'head', .3 * s); }
      if (tm < dizzy && !st.ko) { const d = Math.min(1, (dizzy - tm) / .6), w = Math.sin(tm * 4.5);   // oszołomiony: chwieje się na nogach, głowa opada
        T.pitch += .2 * d * w; add(T.a, 'head', -.45 * d + .25 * d * w); add(T.a, 'neck', -.35 * d); add(T.a, 'jaw', -.3 * d); T.sq -= .08 * d; legs(T, tm * 6, .2 * d); }
      if (st.guarding || k === 'guard') { const s = k === 'guard' ? Math.sin(Math.PI * Math.min(1, t * 2)) : 1;   // kulenie się: głowa w dół, ogon owinięty
        T.sq -= .12 * s; add(T.a, 'head', -.45 * s); add(T.a, 'neck', -.35 * s); add(T.b, 'tail', 1 * s); add(T.a, 'arm', 1 * s); add(T.a, 'jaw', .06 * s); }
      if (st.ko) { for (const [n, v] of Object.entries({ hl: 1, hl2: -.7, fl: 1.2, fl2: -.6, head: -.9, neck: -.7, jaw: -.8, arm: -1.3, wing: .9, wing2: -.9, tail: .4, trunk: .5 })) T.a[n] = v;
        T.b.tail = -.7; T.b.neck = -.5; T.lift = 0; T.sq = 1; T.fire = 0;
        const tw = Math.exp(-(tm - koT) * 1.2) * Math.sin((tm - koT) * 22);   // nogi w górze jeszcze fikają
        for (const n of ['hl', 'hl2', 'fl', 'fl2', 'arm']) add(T.a, n, .6 * tw); }
      if (flat && (st.ko || k === 'ko')) { T.sq = FLAT; T.sw = .9; }   // rozdeptany zostaje naleśnikiem
      if (st.won && !st.ko) { const b = Math.abs(Math.sin(tm * 5)), w = Math.sin(tm * 5), ph = tm % WIN_CYCLE, r = ss((ph - WIN_ROAR) / .15) * (1 - ss((ph - WIN_CYCLE + .15) / .12)), d = 1 - r;
        // taniec zwycięstwa: podskoki (z arena3d.js) z przechyłem na boki, wymach nóg i łap; potem ryk z wypiętą piersią — wycinanka drży i rośnie
        T.sq += .25 * (b - .5) * (1 - b * .3) * d; T.pitch += .18 * w * d; legs(T, tm * 10, .6 * d); add(T.a, 'arm', 1.3 + .5 * Math.sin(tm * 10) * d);
        add(T.a, 'tail', .3 * Math.sin(tm * 10)); add(T.b, 'tail', .6 * Math.sin(tm * 10 - 1)); add(T.a, 'wing', -.8 * Math.sin(tm * 12)); add(T.a, 'wing2', .8 * Math.sin(tm * 12));
        add(T.a, 'head', .2 * w * d + .5 * r); add(T.a, 'jaw', -.4 - .8 * r); add(T.a, 'neck', .4 * r); T.sq += .14 * r; T.sw = 1 + .25 * r; T.jit += .025 * r; T.lift -= WIN_HOP / H * b * r; }
      /* sprężyny → przeguby */
      const sub = dt > .02 ? 2 : 1, h = dt / sub;
      for (let i = 0; i < sub; i++) {
        for (const p of pcs) { const [kk, c] = SPRING[p.g] || SPRING.def; spring(p.a, T.a[p.g] || 0, kk * stiff, c * Math.sqrt(stiff), h); if (p.tip) spring(p.b, T.b[p.g] || 0, kk * stiff * .8, c * Math.sqrt(stiff), h); }
        spring(S.q, T.sq, ...SPRING.q, h); spring(S.w, T.sw / Math.sqrt(Math.max(.2, T.sq)), ...SPRING.q, h); spring(S.pitch, T.pitch, ...SPRING.pitch, h);
      }
      const bodyA = get('body')?.a.x || 0;
      for (const p of pcs) {
        let r = p.a.x;
        if (/^(hl|fl)/.test(p.g)) r -= bodyA * (st.ko ? 0 : .8);   // nogi trzymają pion, gdy tułów się pochyla
        if (p.g === 'jaw') { r = Math.max(-jawMax, Math.min(.05, r)); mouth(Math.min(0, r)); }
        p.grp.scale.setScalar(1 + (T.s[p.g] || 0));
        if (p.g === 'fire') { const f = Math.max(.01, T.fire); p.grp.scale.set(f, f, 1); }
        const pp = p.parent;
        if (pp?.tip && p.s > 0) { const th = curve(pp, p.s), c = Math.cos(th), s = Math.sin(th);
          p.grp.position.x = p.c0[0] * c - p.c0[1] * s; p.grp.position.y = p.c0[0] * s + p.c0[1] * c; r += th * FOLLOW; }
        p.grp.rotation.z = r;
        if (p.tip) { p.w = T.w[p.g] || 0; p.wp = tm * 5; bend(p); }
      }
      const sy = Math.max(FLAT * .8, Math.min(1.6, S.q.x)), pr = S.pitch.x, px = pr >= 0 ? back : front, c = Math.cos(pr), s = Math.sin(pr);
      const flip = body.matrixWorld.elements[10] < 0 ? -1 : 1;   // strona B patrzy tyłem do kamery → odwróć kolejność warstw
      pose.scale.set(Math.max(.4, Math.min(2, S.w.x)), sy, flip);
      pose.rotation.z = pr; pose.position.set(px - px * c + T.jit * H * Math.sin(tm * 97), -px * s + T.lift * H, 0);
      /* nokaut: arena3d.js kładzie figurę obrotem wokół x — cofamy go i przewracamy wycinankę do góry nogami w jej płaszczyźnie (z odbiciem) */
      const ko = st.ko ? 1 : k === 'ko' ? t : 0, pcy = ko ? top / 2 : cy;
      if (ko && !flat) spin = Math.PI * bounce(ko);
      pup.scale.x = T.m; pup.position.set(cx * (1 - T.m), pcy, 0); pose.position.y -= pcy; pup.rotation.set(roll - ko * Math.PI / 2, 0, spin + T.spin);
    }
    function kick(a, b, q) { for (const [n, v] of Object.entries(a)) { const p = get(n); if (p) p.a.v += v; }
      for (const [n, v] of Object.entries(b)) { const p = get(n); if (p) p.b.v += v; } S.q.v += q; }
    let thumped = 0;
    function thump(t, l) { if (!l) return; if (t < l[0]) thumped = 0;
      for (; thumped < l.length && t >= l[thumped]; thumped++) { const A = window.Arena3D?.S; if (A) A.shake = Math.max(A.shake, .12); } }
    const hitAt = sty => HIT[sty] || HIT_AT;
    return {
      update, anchors,
      ms: sty => MS[sty] || ATTACK_MS, hitAt,
      root: (k, sty, t) => { const m = M[sty] || M.bite, [W, Sx] = env(t, hitAt(sty), m.hold), f = m.fwd || [0, 0];
        const reach = Math.max(REACH_MIN * H, gap0 - (m.flip ? rear : nose) - FOE);   // ogonem sięga tyłem
        return { fwd: f[0] * W * H * .3 + f[1] * Sx * reach, up: m.up ? (m.up[0] * W + m.up[1] * Sx) * H * .4 * ex : 0 }; },
    };
  }
  const depth = p => p.parent ? 1 + depth(p.parent) : 0;
  function spring(s, x, k, c, h) { s.v += (k * (x - s.x) - c * s.v) * h; s.x += s.v * h; }
  const curve = (p, s) => { s = Math.min(s, 1.3); return p.b.x * s * s + p.w * Math.sin(p.wp - 3 * s) * s; };
  function bend(p) {
    const g = p.mesh.geometry, pos = g.attributes.position, B = p.base;
    if (Math.abs(p.b.x) + Math.abs(p.w) < 1e-4 && !p.bent) return;
    p.bent = Math.abs(p.b.x) + Math.abs(p.w) >= 1e-4;
    for (let i = 0; i < B.length; i += 3) { const x = B[i], y = B[i + 1], s = (x * p.ax[0] + y * p.ax[1]) / p.len;
      if (s <= 0) { pos.array[i] = x; pos.array[i + 1] = y; continue; }
      const th = curve(p, s), c = Math.cos(th), sn = Math.sin(th); pos.array[i] = x * c - y * sn; pos.array[i + 1] = x * sn + y * c; }
    pos.needsUpdate = true;
  }

  /* ---------- kartonik: tekstura z SVG regionu, przód+tył (siatka), ścianki wzdłuż konturu maski alfa ---------- */
  function slab(THREE, p, K, d, ground, mats) {
    const [x0, y0, x1, y1] = p.box, cw = Math.ceil((x1 - x0) * PX), ch = Math.ceil((y1 - y0) * PX);
    const cv = Object.assign(document.createElement('canvas'), { width: cw, height: ch }), tex = new THREE.CanvasTexture(cv);
    const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: .4, side: THREE.DoubleSide }); mats.push(m);
    const R = { cw, ch, wx: (x0 - 100) * K - p.piv[0], wy: (ground - y0) * K - p.piv[1], sx: (x1 - x0) * K / cw, sy: (y1 - y0) * K / ch };
    const geo = px => geom(THREE, R, d, p.tip ? MESH_PX : 0, px);
    p.mesh = new THREE.Mesh(geo(null), m); p.mesh.frustumCulled = false; p.grp.add(p.mesh); p.base = p.mesh.geometry.attributes.position.array.slice();
    const img = new Image();
    img.onload = () => {
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, cw, ch); tex.needsUpdate = true;
      p.mesh.geometry.dispose(); p.mesh.geometry = geo(c.getImageData(0, 0, cw, ch).data); p.base = p.mesh.geometry.attributes.position.array.slice(); p.bent = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">`
      + (p.clip ? `<defs><clipPath id="k"><path d="${p.clip}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#k)">${p.svg}</g>` : p.svg) + '</svg>');
  }
  // u,v w px płótna → lokalne xyz (względem przegubu); ścianka bierze kolor z próbki kilka komórek w głąb (su, sv), przyciemniony
  function geom(THREE, R, d, seg, px) {
    const pos = [], uv = [], col = [], { cw, ch } = R;
    const put = (u, v, z, k, su = u, sv = v) => { pos.push(R.wx + u * R.sx, R.wy - v * R.sy, z); uv.push(su / cw, 1 - sv / ch); col.push(k, k, k); };
    const nx = seg ? Math.ceil(cw / seg) : 1, ny = seg ? Math.ceil(ch / seg) : 1;
    for (const z of [-d, d]) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const u0 = i / nx * cw, u1 = (i + 1) / nx * cw, v0 = j / ny * ch, v1 = (j + 1) / ny * ch;
      for (const [u, v] of [[u0, v0], [u0, v1], [u1, v1], [u0, v0], [u1, v1], [u1, v0]]) put(u, v, z, 1);
    }
    if (px) {
      const C = WALL.cell, gx = Math.floor(cw / C), gy = Math.floor(ch / C), I = WALL.inset;
      const full = (i, j) => i >= 0 && j >= 0 && i < gx && j < gy && px[((j * C + C / 2) * cw + i * C + C / 2) * 4 + 3] > 100;
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) if (full(i, j))
        for (const [di, dj, a0, b0, a1, b1] of [[1, 0, i + 1, j, i + 1, j + 1], [-1, 0, i, j, i, j + 1], [0, 1, i, j + 1, i + 1, j + 1], [0, -1, i, j, i + 1, j]]) {
          if (full(i + di, j + dj)) continue;
          const [si, sj] = full(i - di * I, j - dj * I) ? [i - di * I, j - dj * I] : [i, j], su = (si + .5) * C, sv = (sj + .5) * C;
          for (const [a, b, z] of [[a0, b0, -d], [a1, b1, -d], [a1, b1, d], [a0, b0, -d], [a1, b1, d], [a0, b0, d]]) put(a * C, b * C, z, WALL.shade, su, sv);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  }
  return { build };
})();
