/* ================= ARENA 3D (widok opcjonalny) =================
   Tylko prezentacja: te same zdarzenia z playRound() co widok 2D, paski życia i dziennik zostają w HTML.
   Teropody i czworonogi dostają bryły low-poly z kolorami z palety rysunku; reszta stoi jako płaski rysunek SVG.
   Three.js ładowany dopiero przy pierwszej walce 3D. Brak WebGL / pliku → zostaje widok 2D.
   Usunięcie: skasuj ten plik, vendor/three.min.js oraz linie z „Arena3D” w app.js, index.html, sw.js i css.

        kamera (lekko krąży, trzęsie się przy mocnym ciosie)
             \
      [ A ] ---GAP--- · ---GAP--- [ B ]      A patrzy w +x, B w −x, obaj lekko obróceni do kamery
      ~~~~~~~~~~~~ teren wg ARENAS ~~~~~~~~~~~~ */
window.Arena3D = (() => {
  const THREE_SRC = 'vendor/three.min.js';
  const ok = (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();
  const GAP = 2.2, YAW = 0.35;                    // połowa dystansu między zawodnikami; obrót 3/4 do kamery
  const H_MAX = 2.4, RATIO_MIN = 0.5, LEN_K = 0.65; // wysokość większego; najmniejszy ułamek; ile długości liczy się jak wysokość
  const SHIELD = { color: 0x2FA8FF, alpha: .38, pad: .62, flashMs: 500 };  // bańka obrony: kolor, przezroczystość, zapas wokół ciała
  const DODGE = { back: .9, up: 1.1 };  // unik: odskok do tyłu i w górę z obrotem
  const ANIM_MS = 440, HIT_DELAY = 170, BIG_HIT = 24, SHAKE = 0.22, LUNGE = 0.9;
  const ORBIT = 0.32, ORBIT_MS = 9000, CAM_Y = 2.7, CAM_D = 7.8, LOOK_Y = 1.3;
  const PIXEL_RATIO_MAX = 2, SHADOW_MAP = 1024, PROP_SEED = 7;
  const THEMES = {
    plains: { sky: 0xCFE8F7, ground: 0xC9B56E, props: 'hills' },
    forest: { sky: 0xB9DCC0, ground: 0x5E8A45, props: 'trees' },
    swamp: { sky: 0xBCCBA8, ground: 0x6C7447, water: 0x4F7466, props: 'reeds' },
    coast: { sky: 0xBDE7F7, ground: 0xE6D39C, water: 0x3F9FCB, props: 'rocks' },
    deep: { sky: 0x0E4A6E, ground: 0x2A4F63, props: 'weed', under: 1 },
    cliffs: { sky: 0xE3CFAE, ground: 0x9A8670, props: 'cliffs' },
  };
  const BIPED = ['thero'], QUAD = ['sauro', 'cerat', 'armor', 'stego', 'mammal', 'sloth'];
  // typ głowy (jak w art.js) → [długość, wysokość]
  const HEADS = { rex: [.95, .5], tyr: [.8, .42], allo: [.8, .38], long: [.9, .36], croc: [1, .26], slim: [.7, .3], short: [.55, .42],
    rap: [.6, .26], beak: [.35, .2], bird: [.55, .4], small: [.3, .2], duck: [.65, .3], iguano: [.5, .28], dome: [.45, .36], ovi: [.4, .36] };
  // czworonogi: tułów [rx, ry, rz], nogi [dł., promień], szyja [dx, dy], głowa [dł., wys.], ogon
  const QUADS = {
    sauro: { b: [1.1, .6, .55], leg: [1.3, .2], neck: [1.5, 2.3], head: [.42, .24], tail: 2.6 },
    cerat: { b: [.95, .55, .5], leg: [.55, .17], neck: [.45, .05], head: [.9, .5], tail: 1.1 },
    armor: { b: [1, .42, .65], leg: [.45, .16], neck: [.4, 0], head: [.45, .3], tail: 1.4 },
    stego: { b: [.95, .55, .45], leg: [.7, .16], neck: [.5, -.15], head: [.35, .2], tail: 1.4 },
    mammal: { b: [.8, .42, .36], leg: [.75, .12], neck: [.45, .35], head: [.55, .32], tail: .7 },
    sloth: { b: [.8, .62, .5], leg: [.7, .2], neck: [.35, .45], head: [.45, .3], tail: .4 },
  };
  let loading = null, S = null;
  const load = () => loading = loading || new Promise((res, rej) => window.THREE ? res()
    : document.head.append(Object.assign(document.createElement('script'), { src: THREE_SRC, onload: res, onerror: rej })));

  /* ---------- klocki ---------- */
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const phong = c => new THREE.MeshPhongMaterial({ color: c, flatShading: true, shininess: 6, side: THREE.DoubleSide });
  let SPH;
  function mesh(g, geo, m, p, s) {
    const o = new THREE.Mesh(geo, m); o.position.copy(p); if (s) o.scale.set(...s);
    o.castShadow = true; g.add(o); return o;
  }
  const ell = (g, m, p, rx, ry, rz) => mesh(g, SPH, m, p, [rx, ry, rz]);
  // walec/stożek od punktu a do b, promienie r0 (w a) i r1 (w b)
  function limb(g, m, a, b, r0, r1 = r0) {
    const d = b.clone().sub(a), o = mesh(g, new THREE.CylinderGeometry(r1, r0, d.length(), 6), m, a.clone().addScaledVector(d, .5));
    o.quaternion.setFromUnitVectors(V(0, 1), d.normalize()); return o;
  }
  // płaski wielokąt (płyty, kryzy, pióra, żagle) w płaszczyźnie xy, potem obrót
  function flat(g, m, pts, p, rot = [0, 0, 0]) {
    const o = mesh(g, new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))), m, p);
    o.rotation.set(...rot); return o;
  }
  const feather = (len, w) => [[0, 0], [len * .5, w], [len, 0], [len * .5, -w * .3]];

  /* ---------- głowa (patrzy w +x, początek w miejscu szyi) ---------- */
  function head(g, M, p, [hl, hh], o, carn) {
    const h = new THREE.Group(); h.position.copy(p); g.add(h);
    ell(h, M.skin, V(hl * .35, 0), hl * .55, hh * .5, hh * .45);
    const jaw = new THREE.Group(); jaw.position.set(-hl * .1, -hh * .15, 0); h.add(jaw);
    ell(jaw, M.belly, V(hl * .5, -hh * .1), hl * .5, hh * .2, hh * .34);
    if (carn) ell(jaw, M.ivory, V(hl * .5, 0), hl * .44, hh * .07, hh * .38); // rząd zębów widoczny przy otwartym pysku
    for (const s of [-1, 1]) ell(h, M.dark, V(hl * .12, hh * .18, s * hh * .38), .055, .06, .04);
    return { h, jaw };
  }

  /* ---------- teropody i spółka: thero/raptor/hadro/orni/… (presety z art.js) ---------- */
  function biped(g, M, o, carn) {
    const bw = (o.bw || 31) / 31, bh = (o.bh || 20) / 20, lg = o.lg || 1, hy = 1.25 * lg, tl = o.tl || 1;
    const fz = o.fz || o.wg || o.bat, nk = o.nk || [26, -28], K = .03;
    ell(g, M.skin, V(0, hy + .1), .85 * bw, .45 * bh, .38 * bh);
    ell(g, M.belly, V(.12, hy - .04), .68 * bw, .34 * bh, .3 * bh);
    for (const s of [-1, 1]) {
      const z = .24 * s * bh;
      ell(g, M.skin, V(-.1, hy - .08, z), .3, .38 * lg, .17);
      limb(g, M.skin, V(-.05, hy - .35 * lg, z), V(-.22, .12, z), .12, .07);
      ell(g, M.dark, V(0, .06, z), .24, .06, .1);
      const al = (o.arm || 12) * .035, sh = V(.55 * bw, hy + .02, s * .24 * bh), hand = V(.55 * bw + al * .5, hy - al, s * .32 * bh);
      limb(g, M.skin, sh, hand, .07, .045);
      if (o.clw) limb(g, M.dark, hand, hand.clone().add(V(.1, -.1)), .03, .005);
      if (fz) for (let i = 0; i < 4; i++) flat(g, i % 2 ? M.belly : M.skin, feather(.35 + al * .6, .08),  // skrzydełka z lotek
        sh.clone().lerp(hand, .3 + i * .2), [0, 0, -2.2 - i * .18]);
    }
    const t0 = V(-.75 * bw, hy + .15), t1 = V(-1.6 * bw * tl, hy + .05), t2 = V(-2.4 * bw * tl, hy - .1 + (o.td || 0) * -.01);
    limb(g, M.skin, t0, t1, .3 * bh, .15); const tail = limb(g, M.skin, t1, t2, .15, .03);
    if (fz) for (let i = 0; i < 5; i++) flat(g, i % 2 ? M.belly : M.skin, feather(.55, .12), t2.clone().lerp(t1, i * .12), [0, 0, Math.PI + (i - 2) * .22]);
    if (o.sail) flat(g, M.belly, [[-.9, 0], [-.5, .75], [.2, .95], [.7, .5], [.9, 0]], V(0, hy + .45, 0));
    const n0 = V(.6 * bw, hy + .25), n1 = V(.6 * bw + nk[0] * K, hy + .25 - nk[1] * K);
    limb(g, M.skin, n0, n1, .28 * (o.nw || 20) / 20, .18 * (o.nw || 20) / 20);
    if (fz) for (let i = 0; i < 6; i++) flat(g, M.dark, feather(.3, .07), n0.clone().lerp(t0, i / 5).add(V(0, .25 * bh)), [0, 0, 2.2]); // grzywa na karku i plecach
    const hd = o.hs ? [o.hs[0] * .02, o.hs[1] * .02] : HEADS[o.hd] || [.75, .36], H = head(g, M, n1, hd, o, carn);
    H.h.rotation.z = -.15;
    if (o.herb && o.bk) ell(H.h, o.hd === 'duck' ? M.belly : M.dark, V(hd[0] * .85, -hd[1] * .1), hd[0] * .28, hd[1] * .16, hd[1] * .42); // dziób
    if (o.hd === 'dome') ell(H.h, M.belly, V(hd[0] * .15, hd[1] * .45), hd[1] * .5, hd[1] * .42, hd[1] * .45);
    if (o.hrn || o.nose) for (const [x, y] of [[hd[0] * .7, hd[1] * .45], [hd[0] * .1, hd[1] * .5]].slice(o.nose ? 0 : 1)) limb(H.h, M.belly, V(x, y * .6), V(x + .05, y + .12), .06, .005);
    if (fz) for (let i = 0; i < 3; i++) flat(H.h, M.dark, feather(.28, .06), V(hd[0] * (.1 - i * .15), hd[1] * .4), [0, 0, 2 + i * .25]); // czubek
    return { jaw: H.jaw, head: H.h, tail };
  }

  /* ---------- czworonogi: zauropody, ceratopsy, ankylozaury, stegozaury, ssaki, leniwce ---------- */
  function quad(g, M, base, o, carn) {
    const Q = QUADS[base], [rx, ry, rz] = Q.b, y = Q.leg[0] + ry * .6, ele = o.hd === 'ele', lr = Q.leg[1] * (ele ? 1.6 : 1), hs = ele ? 1.5 : 1;
    ell(g, M.skin, V(0, y), rx, ry, rz); ell(g, M.belly, V(.05, y - ry * .3), rx * .85, ry * .6, rz * .9);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = V(sx * rx * .6, 0, sz * rz * .6);
      limb(g, M.skin, p.clone().setY(y - ry * .3), p.clone().setY(.08), lr, lr * .85);
      ell(g, M.dark, p.clone().setY(.05), lr * 1.2, .06, lr * 1.2);
    }
    const n0 = V(rx * .8, y + .1), n1 = V(rx * .8 + Q.neck[0], y + Q.neck[1]);
    limb(g, M.skin, n0, n1, base === 'sauro' ? .32 : .26, base === 'sauro' ? .14 : .22);
    const t0 = V(-rx * .85, y), t2 = V(-rx * .85 - Q.tail, y - (base === 'sauro' ? .7 : .35));
    const tail = limb(g, M.skin, t0, t2, base === 'mammal' ? .09 : .28, .03);
    const H = head(g, M, n1, Q.head.map(v => v * hs), o, carn);
    if (base === 'cerat') {
      flat(H.h, M.belly, [[0, -.3], [-.5, .1], [-.3, .6], [0, .8], [.3, .6], [.5, .1]].map(([a, b]) => [a * (o.fr === 'long' ? 1.3 : 1), b]),
        V(-.05, .1)).rotation.set(0, Math.PI / 2, .7, 'ZYX'); // kryza odchylona do tyłu
      for (const s of [-1, 1]) limb(H.h, M.ivory, V(.2, .2, s * .15), V(.7, .55, s * .2), .07, .005); // rogi nad oczami
      if (o.nose) limb(H.h, M.ivory, V(.6, .1), V(.72, .35), .06, .005);
      ell(H.h, M.dark, V(.85, -.08), .12, .1, .08); // dziób
    }
    if (base === 'armor') {
      for (let i = 0; i < 12; i++) limb(g, M.dark, V(-rx * .7 + i * rx * .13, y + ry * .7, (i % 3 - 1) * rz * .5), V(-rx * .7 + i * rx * .13, y + ry + .12, (i % 3 - 1) * rz * .55), .07, .005);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) limb(g, M.dark, V(-.4 + i * .3, y, s * rz * .9), V(-.4 + i * .3, y + .05, s * (rz + .3)), .08, .005);
      if (o.club !== 0) ell(g, M.dark, t2, .22, .16, .26);
    }
    if (base === 'stego') {
      for (let i = 0; i < 7; i++) { const x = -rx * .9 + i * rx * .3, h = .35 + .25 * Math.sin(i / 6 * Math.PI);
        flat(g, M.belly, [[-h * .5, 0], [0, h], [h * .5, 0]], V(x, y + ry * .85, (i % 2 ? .06 : -.06))); }
      for (const s of [-1, 1]) for (const k of [0, 1]) limb(g, M.ivory, t2.clone().add(V(.15 + k * .3, .05)), t2.clone().add(V(.1 + k * .35, .3, s * .4)), .05, .005);
    }
    if (base === 'mammal') {
      for (const s of [-1, 1]) ell(H.h, M.skin, V(0, Q.head[1] * .5, s * .14), .08, ele ? .3 : .12, ele ? .22 : .06); // uszy
      if (o.hd === 'cat') for (const s of [-1, 1]) limb(H.h, M.ivory, V(Q.head[0] * .65, -.05, s * .07), V(Q.head[0] * .7, -.35, s * .07), .035, .005); // szable
      if (ele) {
        let a = V(Q.head[0] * .8, 0); for (let i = 0; i < 3; i++) { const b = a.clone().add(V(.08 - i * .06, -.3)); limb(H.h, M.skin, a, b, .1 - i * .02); a = b; } // trąba
        for (const s of [-1, 1]) limb(H.h, M.ivory, V(Q.head[0] * .6, -.15, s * .12), V(Q.head[0] * 1.1, -.2, s * .25), .05, .01); // ciosy
      }
    }
    if (base === 'sloth') for (const s of [-1, 1]) limb(g, M.ivory, V(rx * .6, .15, s * rz * .6), V(rx * .6 + .25, .02, s * rz * .6), .05, .005);
    return { jaw: H.jaw, head: H.h, tail };
  }

  /* ---------- rysunek SVG jako płaska tablica (pozostałe archetypy) ---------- */
  function billboard(g, sp, H) {
    const cv = Object.assign(document.createElement('canvas'), { width: 400, height: 280 }), img = new Image(), tex = new THREE.CanvasTexture(cv);
    img.onload = () => { cv.getContext('2d').drawImage(img, 0, 0, 400, 280); tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      (sp.custom ? drawCustom(sp.arch, sp.opts, 'color') : drawSpecies(sp.id, 'color')).replace('<svg ', '<svg width="400" height="280" '));
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide });
    const o = mesh(g, new THREE.PlaneGeometry(H * 200 / 140, H), m, V(0, H * .5)); o.castShadow = false;
    return { plane: o };
  }

  /* ---------- zawodnik ---------- */
  function fighter(sp, side, H, theme) {
    const spec = sp.custom ? [sp.arch, sp.opts] : ART[sp.id] || ['thero', {}], [key, own] = spec;
    const [base, def] = PRESET[key] || [key, {}], o = { ...def, ...own }, P = PAL[o.p ?? hash(String(key)) % PAL.length] || PAL[0];
    const M = { skin: phong(P[0]), belly: phong(P[1]), dark: phong(P[2]), ivory: phong(0xF4ECD8) };
    const root = new THREE.Group(), inner = new THREE.Group(), body = new THREE.Group(), carn = sp.diet === 'M' || sp.diet === 'Ry';
    root.add(inner); inner.add(body);
    const kind = BIPED.includes(base) ? 'biped' : QUAD.includes(base) ? 'quad' : 'bill';
    const water = sp.cat === 'marine' || sp.loco === 'swim', fly = sp.loco === 'fly';
    const parts = kind === 'biped' ? biped(body, M, o, carn) : kind === 'quad' ? quad(body, M, base, o, carn) : billboard(body, sp, H);
    if (kind !== 'bill') {   // wyśrodkuj i przeskaluj bryłę do docelowej wysokości
      const box = new THREE.Box3().setFromObject(body), sz = box.getSize(V(0, 0)), s = H / Math.max(sz.y, sz.x * LEN_K);
      body.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, 0); body.scale.setScalar(s);
    }
    const dir = side === 'a' ? 1 : -1, lift = fly ? 1.2 : water && theme.under ? .5 : water ? .15 : 0;
    root.position.set(-dir * GAP, lift, 0);
    if (kind === 'bill') body.scale.x = dir; else root.rotation.y = side === 'a' ? -YAW : Math.PI + YAW;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(H * .45, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(-dir * GAP, .02, 0); S.scene.add(shadow, root);
    const mats = []; root.traverse(c => c.material && mats.push(c.material));
    root.updateMatrixWorld(true);   // bańka obrony: elipsoida wokół ciała, poza `mats` (nie miga przy trafieniu)
    const bb = new THREE.Box3().setFromObject(inner), bz = bb.getSize(V(0, 0)), w = Math.max(bz.x, bz.z) * SHIELD.pad;
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: SHIELD.color, transparent: true, opacity: 0, depthWrite: false }));
    shield.position.copy(root.worldToLocal(bb.getCenter(V(0, 0)))); shield.scale.set(w, bz.y * SHIELD.pad, w); root.add(shield);
    return { root, inner, shadow, shield, kind, dir, lift, ...parts, mats, x0: -dir * GAP, anim: null, ko: false, won: false, phase: Math.random() * 6, swim: water || fly };
  }

  /* ---------- teren ---------- */
  function terrain(theme, rnd, marineSide) {
    const sc = S.scene, add = (geo, c, p, s, r = 0) => { const o = new THREE.Mesh(geo, phong(c)); o.position.copy(p); if (s) o.scale.set(...s); o.rotation.y = r; o.castShadow = o.receiveShadow = true; sc.add(o); return o; };
    const ground = add(new THREE.CircleGeometry(40, 24), theme.ground, V(0, 0)); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    if (theme.water) { const w = add(new THREE.PlaneGeometry(marineSide ? 40 : 3.5, marineSide ? 30 : 2.2), theme.water, V(marineSide * 20.5 || -1.5, .03, marineSide ? 0 : -3.5));
      w.rotation.x = -Math.PI / 2; w.material.transparent = true; w.material.opacity = .85; w.castShadow = false; }
    const spot = () => V((rnd() - .5) * 26, 0, -4 - rnd() * 12), SPH = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 16; i++) {
      const p = spot(), k = .7 + rnd();
      if (theme.props === 'trees') { add(new THREE.CylinderGeometry(.12, .18, 1.4, 5), 0x6E4B33, p.clone().setY(.7), [k, k, k]); add(new THREE.ConeGeometry(.9, 2.2, 6), 0x3F6E3A, p.clone().setY(1.4 + k), [k, k, k]); }
      if (theme.props === 'hills') add(SPH, 0x9DB36A, p.clone().setZ(p.z - 8), [3.5 * k, 1.1 * k, 2.5 * k]);
      if (theme.props === 'reeds') add(new THREE.ConeGeometry(.06, 1.4, 4), 0x7C8A4A, p.clone().setY(.7), [k, k, k]);
      if (theme.props === 'rocks' || theme.props === 'cliffs') add(SPH, theme.props === 'cliffs' ? 0x8C7A66 : 0xA89A80, theme.props === 'cliffs' ? p.setZ(p.z - 4) : p, theme.props === 'cliffs' ? [2.2 * k, 2.6 * k, 2 * k] : [.6 * k, .45 * k, .6 * k], rnd() * 6);
      if (theme.props === 'weed') add(new THREE.ConeGeometry(.12, 2.4, 4), 0x2F7A5A, p.clone().setY(1.2), [k, k, k]);
    }
    if (theme.under) S.bubbles = Array.from({ length: 24 }, () => add(SPH, 0xDDF3FF, V((rnd() - .5) * 12, rnd() * 6, (rnd() - .5) * 6 - 1), [.05, .05, .05]));
  }

  /* ---------- start / stop ---------- */
  async function start(grid, B) {
    const host = grid.closest('.arena'), stage = Object.assign(document.createElement('div'), { className: 'stage3d' });
    host.classList.add('v3d'); grid.before(stage); stage.append(grid);
    try { await load(); } catch { host.classList.remove('v3d'); stage.before(grid); stage.remove(); return; } // brak pliku → 2D
    if (!stage.isConnected) return;
    stop();
    const key = Object.keys(ARENAS).find(k => ARENAS[k] === B.arena), theme = THEMES[key] || THEMES.plains;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(PIXEL_RATIO_MAX, devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(theme.sky); scene.fog = new THREE.Fog(theme.sky, theme.under ? 6 : 10, theme.under ? 20 : 30);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
    S = { renderer, scene, camera, stage, theme, parts: [], todo: [], shake: 0, t0: performance.now() };
    SPH = new THREE.SphereGeometry(1, 8, 6);
    scene.add(new THREE.HemisphereLight(0xFFFFFF, theme.ground, theme.under ? .6 : .75));
    const sun = new THREE.DirectionalLight(0xFFFFFF, theme.under ? .45 : .7); sun.position.set(4, 9, 6); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -3 }); sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP); sun.shadow.radius = 4;
    scene.add(sun);
    let seed = PROP_SEED; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cube = s => Math.cbrt(s.kg || 100), big = Math.max(cube(B.a.s), cube(B.b.s));
    const Hof = s => H_MAX * Math.max(RATIO_MIN, cube(s) / big);
    S.byId = { [B.a.id]: fighter(B.a.s, 'a', Hof(B.a.s), theme), [B.b.id]: fighter(B.b.s, 'b', Hof(B.b.s), theme) };
    const sea = [B.a, B.b].map((p, i) => p.s.cat === 'marine' ? (i ? 1 : -1) : 0).find(Boolean) || 0;
    terrain(theme, rnd, key === 'coast' ? sea : 0);
    S.ro = new ResizeObserver(() => { const { clientWidth: w, clientHeight: h } = stage; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    S.ro.observe(stage);
    S.raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.ro.disconnect();
    S.scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); } });
    S.renderer.dispose(); S.renderer.forceContextLoss(); S.renderer.domElement.remove(); S = null;
  }

  /* ---------- animacje ---------- */
  const play = (f, k, ms = ANIM_MS) => { if (!f.ko) f.anim = { k, t0: performance.now(), ms }; };
  const soon = (ms, fn) => S.todo.push([performance.now() + ms, fn]);
  function burst(f, n, color) {
    const m = new THREE.MeshBasicMaterial({ color }), geo = new THREE.IcosahedronGeometry(.09, 0), p = f.root.position;
    for (let i = 0; i < n; i++) {
      const o = new THREE.Mesh(geo, m); o.position.set(p.x + (Math.random() - .5) * .8, .2 + p.y + Math.random() * .8, (Math.random() - .5) * .8);
      S.scene.add(o); S.parts.push({ o, v: V((Math.random() - .5) * 3, 1 + Math.random() * 2.5, (Math.random() - .5) * 2), t: 0 });
    }
  }
  function animate(f, now, dt) {
    const a = f.anim, t = a ? Math.min(1, (now - a.t0) / a.ms) : 1, s = Math.sin(Math.PI * t);
    let dx = 0, dy = 0, dz = 0, rz = 0, ry = 0, sy = 1, flash = 0, glow = 0;
    const lean = f.kind === 'bill' ? f.dir : 1;
    if (a) ({
      lunge: () => { dx = f.dir * LUNGE * s; rz = -lean * .18 * s; if (f.jaw) f.jaw.rotation.z = -.5 * s; },
      hit: () => { dx = -f.dir * .35 * s; flash = 1 - t; },
      dodge: () => { dx = -f.dir * DODGE.back * s; dy = DODGE.up * s; ry = 2 * Math.PI * t; },
      guard: () => { sy = 1 - .16 * s; glow = s; },
      ko: () => { rz = lean * Math.PI / 2 * t; dy = -f.lift * t; flash = 1 - t; },
    })[a.k]();
    if (a && t >= 1 && a.k !== 'ko') f.anim = null;
    f.ko = f.ko || (a && a.k === 'ko' && t >= 1);
    if (f.ko) { rz = lean * Math.PI / 2; dy = -f.lift; }
    const tm = now / 1000 + f.phase;
    if (!f.ko) sy *= 1 + .025 * Math.sin(tm * 3);
    if (f.swim && !f.ko) dy += .12 * Math.sin(tm * 2);
    if (f.won) dy += Math.abs(Math.sin(tm * 5)) * .25;
    if (f.tail) f.tail.rotation.x = .08 * Math.sin(tm * 2);
    f.root.position.set(f.x0 + dx, f.lift + dy, dz); f.shadow.position.set(f.x0 + dx, .02, dz);
    if (f.kind === 'bill') f.inner.rotation.z = rz; else [f.inner.rotation.x, f.inner.rotation.z] = a?.k === 'ko' || f.ko ? [rz, 0] : [0, rz];
    f.inner.scale.y = sy; f.inner.rotation.y = ry;
    const blk = Math.max(0, 1 - (now - (f.blockT || 0)) / SHIELD.flashMs);   // błysk bańki przy zablokowanym ciosie
    f.shield.material.opacity = f.ko ? 0 : f.guarding ? SHIELD.alpha * (1 + .2 * Math.sin(tm * 6)) : blk * .8;
    f.shield.visible = f.shield.material.opacity > .01;
    for (const m of f.mats) m.emissive ? m.emissive.setRGB(flash * .8, glow * .35, 0) : m.color.setRGB(1, 1 - flash * .6, 1 - flash * .6);
    if (f.kind === 'bill') f.root.quaternion.copy(S.camera.quaternion);
    if (a?.k === 'ko' || f.ko) {   // przewrócony obraca się wokół stóp → podnieś, żeby leżał NA ziemi, nie pod nią
      f.root.updateMatrixWorld(true);
      f.root.position.y -= Math.min(0, new THREE.Box3().setFromObject(f.inner).min.y);
    }
  }
  function loop(now) {
    if (!S) return;
    if (!S.stage.isConnected) return stop();
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (S.last || now)) / 1000); S.last = now;
    S.todo = S.todo.filter(([at, fn]) => at > now || void fn());
    const th = ORBIT * Math.sin((now - S.t0) / ORBIT_MS * 2 * Math.PI), c = S.camera;
    const d = CAM_D / Math.min(1, c.aspect / 1.5);  // wąski ekran telefonu → kamera dalej
    c.position.set(d * Math.sin(th) + (Math.random() - .5) * S.shake, CAM_Y + (Math.random() - .5) * S.shake, d * Math.cos(th));
    c.lookAt(0, LOOK_Y, 0); S.shake *= .88;
    for (const f of Object.values(S.byId)) animate(f, now, dt);
    S.parts = S.parts.filter(p => { p.t += dt; p.v.y -= 6 * dt; p.o.position.addScaledVector(p.v, dt); p.o.scale.setScalar(Math.max(.01, 1 - p.t * 1.6));
      return p.t < .6 || void S.scene.remove(p.o); });
    for (const b of S.bubbles || []) { b.position.y += dt * .8; if (b.position.y > 6) b.position.y = 0; }
    S.renderer.render(S.scene, c);
  }

  /* ---------- zdarzenia z silnika walki ---------- */
  function event(ev) {
    const a = S?.byId[ev.att], d = S?.byId[ev.def];
    if (!a || !d) return;
    const dust = S.theme.water || S.theme.under ? 0xE8F6FF : S.theme.ground;
    if (ev.move === 'guard') { a.guarding = true; return play(a, 'guard', ANIM_MS * 1.5); }
    play(a, 'lunge');
    if (ev.dodge) soon(HIT_DELAY / 2, () => { play(d, 'dodge', ANIM_MS * 1.4); burst(d, 8, 0xFFFFFF); });
    if (ev.guarded) soon(HIT_DELAY, () => { d.guarding = false; d.blockT = performance.now(); burst(d, 12, SHIELD.color); });
    else if (ev.damage) soon(HIT_DELAY, () => { play(d, ev.hpDef === 0 ? 'ko' : 'hit', ev.hpDef === 0 ? ANIM_MS * 2 : ANIM_MS);
      burst(d, ev.damage >= BIG_HIT ? 14 : 7, dust); if (ev.damage >= BIG_HIT) S.shake = SHAKE; });
  }
  function win(id) {
    if (!S) return;
    for (const [k, f] of Object.entries(S.byId)) k === id ? f.won = true : f.ko || play(f, 'ko', ANIM_MS * 2);
  }
  return { ok, start, stop, event, win, get S() { return S; } };   // S: stan sceny dla testów (tmp/steps_ko.js)
})();
