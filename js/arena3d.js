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
  const CV_W = 400, CV_H = 280;  // płótno rysunku (proporcje SVG 200×140)
  const SLAB = { depth: .035, cell: 4, inset: 3, shade: .62 };  // wytłoczony rysunek: grubość × wysokość, komórka konturu [px], próbka koloru w głąb [komórki], jasność boków
  const GROUND_EPS = .03;  // leżący nad gruntem, nie w nim (inaczej migocze)
  const ANIM_MS = 440, HIT_FRAC = .39, BIG_HIT = 24, SHAKE = 0.22, LUNGE = 0.9;
  const ORBIT = 0.32, ORBIT_MS = 9000, CAM_Y = 2.7, CAM_D = 7.8, LOOK_Y = 1.3;
  const PIXEL_RATIO_MAX = 2, SHADOW_MAP = 1024;
  const KB = { base: .2, k: .016, ko: .7 };    // odrzut trafionego: podstawa + obrażenia × k; ślizg przy nokaucie
  const POOL = 220, PRE_MS = 260;               // cząstki w puli (krąg, bez alokacji w klatce); o ile wcześniej startuje plwocina/ogień/ryk
  const HITSTOP_MS = 80, SLOW = { k: .3, ms: 900 }, PUNCH = .1;   // stop-klatka mocnego ciosu; zwolnienie przy nokaucie; skok zbliżenia
  const CAM = { ease: 3.5, intro: 1.6, win: .75, swing: .8, winMs: 8000 };  // płynność, odjazd na wejściu, zbliżenie i wahadło przy zwycięzcy
  const POISON_MS = 3200, POISON_EVERY = 140, DIZZY_MS = 1500, KO_DIZZY_MS = 30000, COWER_MS = 1000, SQUEEZE_MS = 500;
  const C = { star: 0xFFD84A, white: 0xFFFFFF, venom: 0x86E04A, sound: 0xFFF2B8, pincer: 0xF07A3A, smoke: 0x6A6460, crack: 0x3A2E24, splash: 0xE8F6FF,
    fire: [0xFFE45A, 0xFF9A2A, 0xFF5A1A], water: [0xCFF0FF, 0x7CCBF0, 0xFFFFFF] };
  /* Każdy teren z battle.js ma kilka wyglądów (biomów), losowanych na walkę.
     props: element tła → ile sztuk; far: dalekie tło → szansa; rock: kolory skał; herd/fly: typy ciał dalekich rysunków;
     fog: [od, do]; light: jasność; tint: false = bez zachodu/chmur na niebie */
  const B_ = (sky, ground, props, far, o = {}) => ({ sky, ground, props, far, ...o });
  const THEMES = {
    plains: [B_(0xCFE8F7, 0xC9B56E, { hill: 7, grass: 16, boulder: 5, cycad: 4, leafy: 3 }, { volcano: .5, herd: .7, flyer: .4, clouds: 1 }),
      B_(0xC4E4F5, 0x8DB860, { hill: 6, grass: 20, flower: 10, leafy: 4, nest: 1 }, { herd: .6, flyer: .5, clouds: 1, rainbow: .35 }),
      B_(0xE9D7B8, 0xB9926A, { mesa: 4, boulder: 8, bones: 2, grass: 6, dead: 2 }, { herd: .4, flyer: .4, clouds: .4 })],
    forest: [B_(0xB9DCC0, 0x5E8A45, { pine: 9, leafy: 7, fern: 10, log: 3, cycad: 3, mushroom: 4 }, { mountains: 1, clouds: .5, flyer: .2 }),
      B_(0x9FCFA0, 0x3F6E32, { jungle: 9, bigleaf: 10, horsetail: 8, fern: 8, flower: 4 }, { mist: 1, flyer: .4, rain: .3 }, { fog: [7, 24] }),
      B_(0xC8DCE8, 0x6E8A58, { pine: 8, boulder: 6, spire: 3, fern: 5 }, { mountains: 1, waterfall: .6, clouds: .8 }),
      B_(0xDCE6EE, 0xEEF3F6, { snowpine: 10, snowmound: 6, ice: 3, log: 2 }, { mountains: 1, snow: 1 })],
    swamp: [B_(0xBCCBA8, 0x6C7447, { pool: 5, reed: 16, dead: 4, fern: 6, cycad: 3 }, { volcano: .35, herd: .5, clouds: .6 }),
      B_(0xA9C7B0, 0x4E6B4A, { pool: 7, mangrove: 7, reed: 8, fern: 4 }, { fireflies: 1, mist: 1, flyer: .3 }),
      B_(0xA8B39A, 0x5C6440, { pool: 6, dead: 8, reed: 10, mushroom: 4 }, { dragonflies: 1, mist: 1, herd: .4, rain: .3 }, { fog: [6, 22] })],
    coast: [B_(0xBDE7F7, 0xE6D39C, { palm: 6, rock: 7, grass: 6, nest: 1 }, { flyer: .8, clouds: 1, waves: 1 }, { water: 0x3F9FCB }),
      B_(0xC9D6DE, 0x8F887C, { boulder: 8, spire: 4, tidepool: 4, grass: 4 }, { flyer: .6, waves: 1, clouds: .8 }, { water: 0x2F6F8F }),
      B_(0xC2EEF2, 0xF0E2B0, { palm: 4, cycad: 4, reed: 6, flower: 4 }, { flyer: .7, waves: 1, rainbow: .3, clouds: 1 }, { water: 0x2FC0C8 }),
      B_(0xDCE8F0, 0xEEF3F6, { snowmound: 6, ice: 6, icefloe: 7 }, { snow: 1, mountains: .8, waves: 1 }, { water: 0x3D6F8F })],
    deep: [B_(0x0E4A6E, 0x2A4F63, { weed: 16 }, { bubbles: 1, swimmers: .6 }),
      B_(0x1B7FA6, 0xD8C58E, { coral: 14, weed: 5, rock: 4 }, { bubbles: 1, fish: 1, swimmers: .5 }, { light: .8 }),
      B_(0x145C5E, 0x3A5A48, { kelp: 22, rock: 5 }, { bubbles: 1, fish: .7, swimmers: .6 }),
      B_(0x05182E, 0x101E2A, { crystal: 9, rock: 6 }, { jelly: 1, glow: 1 }, { light: .45 }),
      B_(0x0F5A7A, 0x5B6A6A, { rock: 8, shell: 6, weed: 6 }, { ammonites: 1, bubbles: 1 })].map(t => ({ ...t, under: 1, tint: false })),
    cliffs: [B_(0xE3CFAE, 0x9A8670, { spire: 9, boulder: 7, grass: 5 }, { mountains: 1, flyer: .9, volcano: .3, clouds: .7 }),
      B_(0xF0C9A0, 0xB8744A, { mesa: 5, spire: 6, boulder: 5 }, { flyer: .9, clouds: .5 }, { rock: [0xC0703E, 0xB0603A, 0xD08A5A] }),
      B_(0xD9E4EE, 0xDDE3E8, { spire: 8, snowmound: 5, boulder: 4 }, { mountains: 1, flyer: .7, snow: .7 }, { rock: [0xB8BEC6, 0xCDD3DA, 0xA8AFB8] }),
      B_(0xCFE3DA, 0x8A8A70, { spire: 6, fern: 6, pine: 4 }, { waterfall: 1, rainbow: .5, flyer: .8 })],
    desert: [B_(0xF3DDB0, 0xE3C18A, { dune: 8, bones: 2, boulder: 3, dead: 2 }, { flyer: .3, clouds: .2 }),
      B_(0xF0D2A8, 0xD09A62, { mesa: 6, boulder: 5, grass: 3, bones: 1 }, { herd: .4, flyer: .5 }, { rock: [0xC0703E, 0xB0603A, 0xD08A5A] })],
    volcano: [B_(0x6E4A48, 0x4A3C38, { lava: 6, blackrock: 8, vent: 3, dead: 3 }, { eruption: 1, embers: 1 }, { tint: false, fog: [8, 28] }),
      B_(0x8A7A74, 0x5E5550, { blackrock: 8, vent: 4, dead: 5, lava: 3 }, { volcano: 1, ash: 1 }, { tint: false })],
    tundra: [B_(0xDCE8F0, 0xF2F6F8, { snowmound: 8, ice: 5, snowpine: 4, boulder: 3 }, { mountains: 1, snow: 1, herd: .7 }, { herd: ['mammal'] }),
      B_(0xCFE0EC, 0xE4EEF4, { ice: 10, snowmound: 6 }, { mountains: 1, snow: .6, herd: .5 }, { herd: ['mammal'] })],
  };
  const SKY_TINTS = [0, 0, 0xF6B183, 0xDDE3EA], TINT_MIX = .45;   // zwykły dzień ×2, zachód słońca, pochmurno
  const HERD = ['sauropod', 'hadrosaur', 'ceratopsian'], FLYERS = ['pterosaur'], SWIMMERS = ['marine', 'marine-long', 'fish', 'turtle'];
  const RAINBOW = [0xE84A4A, 0xF29B38, 0xF5D547, 0x5DBB63, 0x4A8FE0, 0x8A5AC8];
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
  /* styl ataku wg presetu (art.js) albo gatunku (SIG); zwykły cios losuje z listy, specjalny = ostatni (popisowy).
     Słownik stylów (rigi js/puppet2d.js, js/rig3d.js muszą obsłużyć każdy; nieznany → najbliższy znany):
       paszcza: bite, crush (zaciska i miażdży), shake (chwyta i szarpie), venom (jadowite ugryzienie), spit (pluje jadem z dystansu), fire
       łapy:    claw (drapie), slash (pazur sierpowy), kick, pounce (skok na przeciwnika), grab (chwyta i przyciska), thumb (kolec kciuka)
       ciało:   tail, club, spin, stomp, rear, trample, headbutt, gore, charge, neck, roll, coil (oplata i dusi), shell, roar (zastrasza)
       morze/powietrze: flipper, ram, peck, wing, dive, sting (żądło z jadem), pincer (szczypce), tentacle, tusk, trunk */
  const STYLES = {
    thero: ['bite', 'claw', 'tail', 'roar', 'shake', 'crush'], raptor: ['claw', 'bite', 'kick', 'slash', 'pounce'], ornimim: ['kick', 'peck', 'claw', 'charge'],
    tbird: ['peck', 'kick', 'grab', 'crush'], dragon: ['bite', 'claw', 'tail', 'fire'], prosauro: ['claw', 'tail', 'thumb', 'stomp'],
    hadro: ['headbutt', 'tail', 'kick', 'roar', 'trample'], orni: ['tail', 'kick', 'thumb', 'stomp'], dome: ['headbutt', 'kick', 'charge'],
    sauro: ['stomp', 'tail', 'neck', 'trample', 'rear'], cerat: ['gore', 'headbutt', 'stomp', 'charge'], armor: ['club', 'tail', 'roll', 'club'],
    stego: ['tail', 'spin', 'stomp', 'spin'], ptero: ['peck', 'wing', 'grab', 'dive'], bird: ['peck', 'claw', 'wing', 'dive'],
    plesio: ['bite', 'flipper', 'neck', 'shake'], mosa: ['bite', 'tail', 'roll', 'crush'], ichthyo: ['bite', 'tail', 'ram'], fish: ['bite', 'tail', 'ram'],
    shark: ['bite', 'ram', 'tail', 'shake'], whale: ['bite', 'tail', 'ram', 'crush'], croc: ['bite', 'tail', 'shake', 'roll'], lizard: ['bite', 'claw', 'tail', 'venom'],
    snake: ['bite', 'venom', 'coil'], turtle: ['bite', 'flipper', 'shell'], sail: ['bite', 'claw', 'roar', 'charge'], synap: ['bite', 'claw', 'roar', 'pounce'],
    amphib: ['bite', 'tail', 'pounce'], bug: ['ram', 'roll'], ammo: ['tentacle', 'ram', 'tentacle'], scorp: ['pincer', 'tail', 'sting'],
    anomalo: ['grab', 'ram', 'grab'], mammal: ['bite', 'claw', 'roar', 'pounce'], cat: ['claw', 'bite', 'roar', 'pounce'], ele: ['tusk', 'stomp', 'trunk', 'trample', 'charge'],
    sloth: ['claw', 'grab', 'rear'],
  };
  // gatunki z własnym repertuarem (nadpisuje preset)
  const SIG = {
    'dilophosaurus-wetherilli': ['bite', 'claw', 'roar', 'spit'], 'varanus-priscus': ['bite', 'claw', 'tail', 'venom'],
    'titanoboa-cerrejonensis': ['bite', 'venom', 'coil'], 'therizinosaurus-cheloniformis': ['claw', 'slash', 'kick', 'slash'],
    'tyrannosaurus-rex': ['bite', 'tail', 'roar', 'shake', 'crush'], 'spinosaurus-aegyptiacus': ['bite', 'claw', 'tail', 'shake'],
    'deinonychus-antirrhopus': ['claw', 'bite', 'kick', 'slash'], 'utahraptor-ostrommaysorum': ['claw', 'bite', 'slash', 'pounce'],
    'inostrancevia-alexandri': ['bite', 'claw', 'roar', 'crush'], 'jaekelopterus-rhenaniae': ['pincer', 'tail', 'grab', 'sting'],
    'smilodon-fatalis': ['claw', 'bite', 'roar', 'grab', 'pounce'], 'mammuthus-primigenius': ['tusk', 'stomp', 'trunk', 'trample', 'charge'],
    'triceratops-horridus': ['gore', 'headbutt', 'stomp', 'charge'], 'velociraptor-mongoliensis': ['claw', 'bite', 'kick', 'pounce', 'slash'],
  };
  const style = (f, move) => { const l = SIG[f.id] || STYLES[f.key] || STYLES[f.base] || ['bite']; return move === 'special' ? l[l.length - 1] : l[Math.floor(Math.random() * (l.length - 1 || 1))]; };
  /* RIG — figura z ruchomymi częściami, budowana przez Puppet2D (wycinanka, tryb 'bill') albo Rig3D (bryła, tryb 'model'):
       build(ctx) → rig | null (null = stary kształt).  ctx = { THREE, body, sp, key, base, o, P, M, H, h: { V, mesh, ell, limb, flat, phong } }
         body: grupa do wypełnienia, patrzy w +x, stopy na y=0, docelowa wysokość H (fighter() NIE przeskalowuje bryły z rigiem)
       rig.update(st) co klatkę, st = { k: 'lunge'|'hit'|'dodge'|'guard'|'ko'|null, style, t: 0‥1, tm: s, dt, ko, won, guarding, gap }
         style przy 'lunge' = własny atak; przy 'hit'/'ko' = styl ataku, który trafił (reakcja: ugryziony szarpie się, otruty słabnie…)
         gap = odległość do przeciwnika wzdłuż +x (do sięgania szyją/łapą, chwytania)
       rig.root?(k, style, t) → { fwd, up, pitch, yaw, roll } nadpisuje ruch całej figury (fwd w kierunku przeciwnika, pitch + = nos w górę)
       rig.ms?(style) → czas animacji ataku [ms]; rig.hitAt?(style) → ułamek t, w którym cios trafia (przeciwnik reaguje) */
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

  /* ---------- rysunek SVG: płaska tablica, albo (depth > 0) bryła: rysunek z przodu i z tyłu + ścianki wzdłuż konturu ---------- */
  function billboard(g, sp, H, depth = 0) {
    const cv = Object.assign(document.createElement('canvas'), { width: CV_W, height: CV_H }), img = new Image(), tex = new THREE.CanvasTexture(cv);
    const W = H * CV_W / CV_H, d = depth / 2, walls = new THREE.BufferGeometry();
    const face = new THREE.MeshBasicMaterial({ map: tex, transparent: !depth, alphaTest: .4, side: THREE.DoubleSide });
    for (const z of depth ? [-d, d] : [0]) mesh(g, new THREE.PlaneGeometry(W, H), face, V(0, H * .5, z)).castShadow = false;
    if (depth) mesh(g, walls, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), V(0, 0)).castShadow = false;
    img.onload = () => {
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, CV_W, CV_H); tex.needsUpdate = true;
      if (depth) extrude(c.getImageData(0, 0, CV_W, CV_H).data, walls, W, H, d);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      (sp.custom ? drawCustom(sp.arch, sp.opts, 'color') : drawSpecies(sp.id, 'color')).replace('<svg ', `<svg width="${CV_W}" height="${CV_H}" `));
    return {};
  }
  /* ścianki boczne: siatka komórek maski alfa; tam, gdzie pełna komórka graniczy z pustą, stawiamy prostokąt w kolorze rysunku
     (brany kilka komórek w głąb, żeby nie był czarnym konturem), przyciemniony — jak wytłoczone przedmioty w Minecrafcie */
  function extrude(px, geo, W, H, d) {
    const C = SLAB.cell, nx = CV_W / C, ny = CV_H / C, k = (i, j) => ((j * C + C / 2) * CV_W + i * C + C / 2) * 4;
    const full = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && px[k(i, j) + 3] > 100;
    const X = u => (u / nx - .5) * W, Y = v => (1 - v / ny) * H, pos = [], col = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (full(i, j))
      for (const [di, dj, x0, y0, x1, y1] of [[1, 0, i + 1, j, i + 1, j + 1], [-1, 0, i, j, i, j + 1], [0, 1, i, j + 1, i + 1, j + 1], [0, -1, i, j, i + 1, j]]) {
        if (full(i + di, j + dj)) continue;
        const [si, sj] = full(i - di * SLAB.inset, j - dj * SLAB.inset) ? [i - di * SLAB.inset, j - dj * SLAB.inset] : [i, j];
        const [a, b] = [[X(x0), Y(y0)], [X(x1), Y(y1)]], rgb = [0, 1, 2].map(n => px[k(si, sj) + n] / 255 * SLAB.shade);
        for (const [p, z] of [[a, -d], [b, -d], [b, d], [a, -d], [b, d], [a, d]]) { pos.push(p[0], p[1], z); col.push(...rgb); }
      }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }

  /* ---------- zawodnik ---------- */
  function fighter(sp, side, H, theme, figures) {
    const spec = sp.custom ? [sp.arch, sp.opts] : ART[sp.id] || ['thero', {}], [key, own] = spec;
    const [base, def] = PRESET[key] || [key, {}], o = { ...def, ...own }, P = PAL[o.p ?? hash(String(key)) % PAL.length] || PAL[0];
    const M = { skin: phong(P[0]), belly: phong(P[1]), dark: phong(P[2]), ivory: phong(0xF4ECD8) };
    const root = new THREE.Group(), inner = new THREE.Group(), body = new THREE.Group(), carn = sp.diet === 'M' || sp.diet === 'Ry';
    root.add(inner); inner.add(body);
    const builder = figures === 'bill' ? window.Puppet2D : window.Rig3D;
    const rig = builder?.build({ THREE, body, sp, key, base, o, P, M, H, h: { V, mesh, ell, limb, flat, phong } }) || null;
    const kind = rig ? 'rig' : figures === 'bill' ? 'slab' : BIPED.includes(base) ? 'biped' : QUAD.includes(base) ? 'quad' : 'slab';
    const water = sp.cat === 'marine' || sp.loco === 'swim', fly = sp.loco === 'fly';
    const parts = rig ? {} : kind === 'biped' ? biped(body, M, o, carn) : kind === 'quad' ? quad(body, M, base, o, carn) : billboard(body, sp, H, H * SLAB.depth);
    if (kind === 'biped' || kind === 'quad') {   // wyśrodkuj i przeskaluj bryłę do docelowej wysokości
      const box = new THREE.Box3().setFromObject(body), sz = box.getSize(V(0, 0)), s = H / Math.max(sz.y, sz.x * LEN_K);
      body.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, 0); body.scale.setScalar(s);
    }
    const dir = side === 'a' ? 1 : -1, lift = fly ? 1.2 : water && theme.under ? .5 : water ? .15 : 0;
    root.position.set(-dir * GAP, lift, 0);
    root.rotation.y = side === 'a' ? -YAW : Math.PI + YAW;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(H * .45, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(-dir * GAP, .02, 0); S.scene.add(shadow, root);
    const mats = []; root.traverse(c => c.material && mats.push(c.material));
    root.updateMatrixWorld(true);   // bańka obrony: elipsoida wokół ciała, poza `mats` (nie miga przy trafieniu)
    const bb = new THREE.Box3().setFromObject(inner), bz = bb.getSize(V(0, 0)), w = Math.max(bz.x, bz.z) * SHIELD.pad;
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: SHIELD.color, transparent: true, opacity: 0, depthWrite: false }));
    shield.position.copy(root.worldToLocal(bb.getCenter(V(0, 0)))); shield.scale.set(w, bz.y * SHIELD.pad, w); root.add(shield);
    return { root, inner, shadow, shield, kind, dir, lift, ...parts, rig, key, base, id: sp.id, mats, x0: -dir * GAP, h: bz.y, len: bz.x, col: P, anim: null, ko: false, won: false, phase: Math.random() * 6, swim: water || fly };
  }

  /* ---------- teren ---------- */
  function terrain(theme, rnd, marineSide) {
    const sc = S.scene, pick = l => l[Math.floor(rnd() * l.length)];
    const add = (geo, c, p, s, r = 0, g = sc) => { const o = new THREE.Mesh(geo, phong(c)); o.position.copy(p); if (s) o.scale.set(...s); o.rotation.y = r; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const cone = (r, h, n = 6) => new THREE.ConeGeometry(r, h, n), cyl = (r0, r1, h) => new THREE.CylinderGeometry(r1, r0, h, 6);
    const ICO = new THREE.IcosahedronGeometry(1, 0), BLOB = new THREE.IcosahedronGeometry(1, 1), GREENS = [0x3F6E3A, 0x4E7F3C, 0x5F8F45, 0x6E9A3A];
    const ROCK = theme.rock || [0xA89A80, 0x9A9186, 0xB3A58C], SNOW = 0xF4F8FB, ICE = [0xBFE3F2, 0xA8D4EA, 0xD6EEF8];
    const see = (o, opacity, glow) => { Object.assign(o.material, { transparent: true, opacity, depthWrite: false }); o.castShadow = false; if (glow) o.material.emissive.setHex(glow); return o; };
    const flat = (geo, c, p, opacity = 1) => { const o = add(geo, c, p); o.rotation.x = -Math.PI / 2; o.castShadow = false; if (opacity < 1) see(o, opacity); return o; };
    flat(new THREE.CircleGeometry(40, 24), theme.ground, V(0, 0));
    if (theme.water) flat(new THREE.PlaneGeometry(marineSide ? 40 : 3.5, marineSide ? 30 : 2.2), theme.water, V(marineSide * 20.5 || -1.5, .03, marineSide ? 0 : -3.5), .85);
    // wachlarz liści/paproci: stożki odchylone od pionu dookoła p
    const fronds = (p, n, len, tilt, c) => { const g = new THREE.Group(); g.position.copy(p); sc.add(g);
      for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI + rnd(), f = add(cone(.1 * len, len, 4), c, V(Math.cos(a) * len * .45, 0, Math.sin(a) * len * .45), [1, 1, .35], 0, g);
        f.rotation.set(0, -a, 0); f.rotateZ(-tilt); } };
    const sway = (o, amp, speed) => { const r0 = o.rotation.z, ph = rnd() * 6; S.anims.push((dt, now) => { o.rotation.z = r0 + amp * Math.sin(now / speed + ph); }); };
    // pionowy „słupek” z geometrią zaczepioną u dołu (kołysze się od podstawy: wodorosty, skrzypy)
    const stalk = (geo, c, p) => { geo.translate(0, geo.parameters.height / 2, 0); return add(geo, c, p); };
    const PROPS = {
      hill: (p, k) => add(BLOB, pick([0x9DB36A, 0xAFBF6E, 0x8DA85E]), p.setZ(p.z - 8), [3.5 * k, 1.1 * k, 2.5 * k]),
      dune: (p, k) => add(BLOB, pick([0xE8C98E, 0xDDB97C, 0xF0D39C]), p.setZ(p.z - 4), [3 * k, .8 * k, 2 * k], rnd() * 6),
      grass: (p, k) => { for (let i = 0; i < 3; i++) add(cone(.05, .55 * k, 4), pick(GREENS), V(p.x + rnd() * .3, .27 * k, p.z + rnd() * .3)); },
      flower: (p, k) => { for (let i = 0; i < 4; i++) { const q = V(p.x + rnd(), 0, p.z + rnd()); add(cyl(.02, .02, .4), 0x4E7F3C, q.clone().setY(.2));
        add(BLOB, pick([0xF26D8C, 0xF5D547, 0xFFFFFF, 0xB07CE8, 0xF29B38]), q.setY(.42), [.09, .07, .09]); } },
      boulder: (p, k) => add(ICO, pick(ROCK), p.setY(.3 * k), [.8 * k, .55 * k, .7 * k], rnd() * 6),
      rock: (p, k) => add(ICO, pick(theme.under ? [0x6E7A80, 0x5E6A70] : [0x8E8A80, 0xA59D8E]), p.setY(.2 * k), [.5 * k, .4 * k, .5 * k], rnd() * 6),
      blackrock: (p, k) => add(ICO, pick([0x2E2826, 0x3A3230, 0x252020]), p.setY(.35 * k), [.9 * k, .6 * k, .8 * k], rnd() * 6),
      spire: (p, k) => add(cone(1.1 * k, 5 * k, 5), pick(ROCK), p.setZ(p.z - 4).setY(2.5 * k), null, rnd() * 6),
      mesa: (p, k) => { const q = p.setZ(p.z - 7), h = 2.5 * k; for (let i = 0; i < 3; i++) add(cyl(2.4 * k - i * .3, 2.2 * k - i * .3, h / 3), ROCK[i % ROCK.length], q.clone().setY(h / 6 + i * h / 3)); },
      pine: (p, k) => { add(cyl(.18, .12, 1.4), 0x6E4B33, p.clone().setY(.7), [k, k, k]); add(cone(.9, 2.2), pick(GREENS), p.clone().setY(1.5 + k), [k, k, k]); add(cone(.6, 1.6), pick(GREENS), p.clone().setY(2.3 + 1.4 * k), [k, k, k]); },
      snowpine: (p, k) => { add(cyl(.18, .12, 1.4), 0x6E4B33, p.clone().setY(.7), [k, k, k]); add(cone(.9, 2.2), 0x3F5E4A, p.clone().setY(1.5 + k), [k, k, k]);
        add(cone(.55, 1), SNOW, p.clone().setY(2.1 + 1.4 * k), [k, k, k]); add(cone(.6, 1.6), 0x3F5E4A, p.clone().setY(2.3 + 1.4 * k), [k * .8, k * .8, k * .8]); add(cone(.3, .6), SNOW, p.clone().setY(2.7 + 1.9 * k), [k, k, k]); },
      leafy: (p, k) => { add(cyl(.22, .14, 1.8), 0x6E4B33, p.clone().setY(.9 * k), [k, k, k]); for (let i = 0; i < 3; i++) add(BLOB, pick(GREENS), V(p.x + (rnd() - .5) * k, 2 * k + rnd() * .6 * k, p.z + (rnd() - .5) * k), [.9 * k, .75 * k, .9 * k]); },
      jungle: (p, k) => { const h = 4 * k; add(cyl(.3, .2, h), 0x5A4030, p.clone().setY(h / 2)); add(BLOB, pick(GREENS), p.clone().setY(h), [2 * k, .7 * k, 2 * k]);
        for (let i = 0; i < 3; i++) add(cyl(.02, .02, 1.5 * k), 0x4E7F3C, V(p.x + (rnd() - .5) * 2.4 * k, h - .8 * k, p.z + (rnd() - .5) * 1.5 * k)); },
      bigleaf: (p, k) => fronds(p.clone().setY(.05), 5, 1.4 * k, 1, pick(GREENS)),
      horsetail: (p, k) => { for (let i = 0; i < 3; i++) sway(stalk(cyl(.05, .04, 1.6 * k), pick([0x6E9A3A, 0x7EA84A]), V(p.x + rnd() * .5, 0, p.z + rnd() * .5)), .05, 900); },
      mangrove: (p, k) => { const top = p.clone().setY(1.4 * k); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rnd(); limb(sc, phong(0x5A4838), top, V(p.x + Math.cos(a) * k, 0, p.z + Math.sin(a) * k), .1, .06); }
        limb(sc, phong(0x5A4838), top, top.clone().setY(2.8 * k), .14, .1); add(BLOB, pick(GREENS), top.clone().setY(3 * k), [1.5 * k, .8 * k, 1.5 * k]); },
      cycad: (p, k) => { add(cyl(.3, .25, .9), 0x7A5A3A, p.clone().setY(.45 * k), [k, k, k]); fronds(p.clone().setY(.9 * k), 7, 1.3 * k, 1.1, pick(GREENS)); },
      fern: (p, k) => fronds(p.clone().setY(.05), 6, .8 * k, 1.2, pick(GREENS)),
      mushroom: (p, k) => { for (let i = 0; i < 3; i++) { const q = V(p.x + rnd() * .6, 0, p.z + rnd() * .6), s = .6 + rnd() * .6; add(cyl(.06, .05, .3 * s), 0xF2E8D8, q.clone().setY(.15 * s));
        add(new THREE.SphereGeometry(.2 * s, 8, 4, 0, 2 * Math.PI, 0, Math.PI / 2), pick([0xD8402E, 0xE08A3A, 0xB8865A]), q.setY(.28 * s)); } },
      palm: (p, k) => { const lean = (rnd() - .5) * .8, top = V(p.x + lean * 1.5 * k, 2.3 * k, p.z); limb(sc, phong(0x8A6A48), p.clone(), top, .16, .1);
        fronds(top, 7, 1.6 * k, 1.9, pick(GREENS)); },
      log: (p, k) => { const o = add(cyl(.22, .22, 2 * k), 0x6B4A30, p.setY(.2)); o.rotation.set(0, rnd() * 3, Math.PI / 2); },
      dead: (p, k) => { const c = phong(0x6D6457), top = p.clone().setY(2.6 * k); limb(sc, c, p.clone(), top, .16, .08);
        for (const s of [-1, 1]) limb(sc, c, top.clone().setY(top.y - .8 * k), V(p.x + s * .8 * k, top.y + .1, p.z + (rnd() - .5)), .07, .03); },
      reed: (p, k) => { for (let i = 0; i < 4; i++) add(cone(.05, 1.3 * k, 4), pick([0x7C8A4A, 0x8C9A52]), V(p.x + rnd() * .4, .65 * k, p.z + rnd() * .4)); },
      pool: (p, k) => { flat(new THREE.CircleGeometry(1.6 * k, 10), 0x4F7466, p.clone().setY(.03), .85);
        for (let i = 0; i < 3; i++) flat(new THREE.CircleGeometry(.25, 7), 0x5E9A4A, V(p.x + (rnd() - .5) * 1.8 * k, .05, p.z + (rnd() - .5) * 1.2 * k)); },
      tidepool: (p, k) => { flat(new THREE.CircleGeometry(1 * k, 9), 0x3F8FAF, p.clone().setY(.03), .8); for (let i = 0; i < 4; i++) add(ICO, pick(ROCK), V(p.x + (rnd() - .5) * 2 * k, .15, p.z + (rnd() - .5) * 2 * k), [.3, .25, .3]);
        add(BLOB, 0xE86A4A, V(p.x, .08, p.z), [.12, .05, .12]); },
      nest: (p, k) => { const t = add(new THREE.TorusGeometry(.5, .18, 6, 12), 0x8A6A40, p.clone().setY(.15)); t.rotation.x = -Math.PI / 2;
        for (let i = 0; i < 3; i++) add(BLOB, pick([0xF4ECD8, 0xE8DCC0, 0xDDE8D0]), V(p.x + (i - 1) * .22, .25, p.z + (rnd() - .5) * .2), [.14, .2, .14]); },
      bones: (p, k) => { for (let i = 0; i < 5; i++) { const r = add(new THREE.TorusGeometry(.6 * k, .05, 4, 10, Math.PI), 0xF2EBDD, V(p.x + i * .3 * k, 0, p.z)); r.rotation.y = Math.PI / 2; }
        add(BLOB, 0xF2EBDD, V(p.x - .6 * k, .3 * k, p.z), [.5 * k, .3 * k, .3 * k]); },
      snowmound: (p, k) => add(BLOB, SNOW, p.setY(0), [1.4 * k, .5 * k, 1.1 * k], rnd() * 6),
      ice: (p, k) => see(add(ICO, pick(ICE), p.setY(.4 * k), [.6 * k, .9 * k, .6 * k], rnd() * 6), .85),
      icefloe: (p, k) => { if (!marineSide) return; const o = flat(new THREE.CircleGeometry(.8 * k, 6), SNOW, V(marineSide * (3 + rnd() * 12), .06, p.z + 4 + rnd() * 4));
        S.anims.push((dt, now) => { o.position.y = .06 + .03 * Math.sin(now / 800 + p.x); }); },
      lava: (p, k) => { const o = flat(new THREE.CircleGeometry(1.2 * k, 9), 0xFF6A1A, p.clone().setY(.04)); o.material.emissive.setHex(0xC83A00);
        S.anims.push((dt, now) => o.material.emissive.setRGB(.8 + .2 * Math.sin(now / 300 + p.x), .25, 0)); },
      vent: (p, k) => { add(cone(.6 * k, .7 * k, 6), 0x3A3230, p.clone().setY(.35 * k)); smoke(p.clone().setY(.7 * k), 4, .3, 4, 0x9A9590); },
      weed: (p, k) => sway(stalk(cone(.12, 2.4 * k, 4), pick([0x2F7A5A, 0x3F8A4A]), p), .12, 1200),
      kelp: (p, k) => sway(stalk(cyl(.12, .06, 4 + 3 * k), pick([0x5A7A2A, 0x6A6A2A, 0x4A6A30]), p), .1, 1500 + rnd() * 600),
      coral: (p, k) => { const c = pick([0xF26D8C, 0xF29B38, 0xB07CE8, 0xF5D547, 0x4ACBC0]), q = p.setZ(p.z + 2);
        if (rnd() < .5) for (let i = 0; i < 4; i++) limb(sc, phong(c), q.clone(), V(q.x + (rnd() - .5) * 1.2 * k, (.6 + rnd()) * k, q.z + (rnd() - .5) * .6), .08, .04);
        else add(BLOB, c, q.setY(.25 * k), [.5 * k, .35 * k, .5 * k]); },
      crystal: (p, k) => { for (let i = 0; i < 3; i++) { const o = see(add(cone(.2 * k, 1.4 * k, 5), pick([0x7AE0FF, 0xB07CFF]), V(p.x + rnd() * .5, .6 * k, p.z + rnd() * .5)), .85, 0x3A6AA0); o.rotation.z = (rnd() - .5) * .6; } },
      shell: (p, k) => { const o = add(new THREE.TorusGeometry(.25 * k, .1 * k, 6, 12), 0xE8D8B8, p.setY(.1)); o.rotation.x = -Math.PI / 2 + .3; },
    };
    // unoszące się cząstki: dym, bąble, popiół, żar (dy > 0 w górę), śnieg/deszcz (dy < 0)
    function smoke(at, n, size, top, c) { const ps = Array.from({ length: n }, (_, i) => see(add(BLOB, c, at.clone().setY(at.y + i * top / n), [size, size, size]), .6));
      S.anims.push(dt => ps.forEach(o => { o.position.y += dt * .7; o.position.x += dt * .2; o.scale.addScalar(dt * size); if (o.position.y > at.y + top) { o.position.copy(at); o.scale.setScalar(size); } })); }
    const drift = (n, c, size, dy, glow = 0, box = [16, 9, 10]) => { const ps = Array.from({ length: n }, () => see(add(BLOB, c, V((rnd() - .5) * box[0], rnd() * box[1], 2 - rnd() * box[2]), [size, size * (dy < -2 ? 6 : 1), size]), .85, glow));
      S.anims.push((dt, now) => ps.forEach((o, i) => { o.position.y += dy * dt; o.position.x += Math.sin(now / 900 + i) * dt * .3; if (o.position.y > box[1]) o.position.y = 0; if (o.position.y < 0) o.position.y = box[1]; })); };
    const spot = () => { const x = (rnd() - .5) * 26; return V(marineSide ? -marineSide * Math.abs(x) : x, 0, theme.under ? -2 - rnd() * 9 : -4 - rnd() * 12); };   // wybrzeże: tylko po stronie lądu; pod wodą bliżej (mgła)
    for (const [name, n] of Object.entries(theme.props)) for (let i = 0; i < n; i++) PROPS[name](spot(), .7 + rnd());
    // rysunek gatunku jako daleka tablica (stado, latające, pływające); obracana do kamery w loop()
    const of = test => SPECIES.filter(test), body = l => of(s => l.includes(s.body));
    const cutout = (pool, p, H, dir) => { const g = new THREE.Group(); g.position.copy(p); g.scale.x = dir; sc.add(g); S.faces.push(g); billboard(g, pick(pool), H); return g; };
    const across = (pool, n, y, H, speed, bob) => { for (let i = 0; i < n; i++) { const dir = rnd() < .5 ? 1 : -1, y0 = y + rnd() * 2, g = cutout(pool, V((rnd() - .5) * 24, y0, -6 - rnd() * 8), H * (1 + rnd() * .6), dir);
      S.anims.push((dt, now) => { g.position.x += dir * dt * speed; g.position.y = y0 + bob * Math.sin(now / 600 + i); if (Math.abs(g.position.x) > 16) g.position.x = -dir * 16; }); } };
    const peak = (x, z, r, h, c) => { add(cone(r, h, 5), c, V(x, h / 2 - .5, z), null, rnd() * 6); add(cone(r * .32, h * .3, 5), SNOW, V(x, h * .85 - .5, z)); };
    const FAR = {
      volcano: () => { const x = (rnd() - .5) * 24; add(cone(6, 7, 8), 0x5A4A42, V(x, 3.5, -27)); add(cone(1.3, 1.5, 8), 0xD8572A, V(x, 6.4, -27)); smoke(V(x, 7, -27), 6, .8, 6, 0x8A8580); },
      eruption: () => { const x = (rnd() - .5) * 16; add(cone(8, 10, 8), 0x3A302C, V(x, 5, -28)); const top = add(cone(1.8, 1.2, 8), 0xFF5A10, V(x, 9.6, -28)); top.material.emissive.setHex(0xFF3A00);
        smoke(V(x, 10, -28), 8, 1.2, 8, 0x4A4240); },
      mountains: () => { for (let i = 0; i < 5; i++) peak((i - 2) * 9 + rnd() * 4, -30 - rnd() * 4, 5 + rnd() * 4, 8 + rnd() * 5, pick([0x7C8A9A, 0x8C96A2, 0x9AA3AA])); },
      clouds: () => { for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set((rnd() - .5) * 40, 8 + rnd() * 3, -14 - rnd() * 10); sc.add(g);
        for (let j = 0; j < 4; j++) add(BLOB, 0xFFFFFF, V(j * 1.1, rnd() * .6, rnd()), [1.2, .8, .9], 0, g).castShadow = false;
        S.anims.push(dt => { g.position.x += dt * .35; if (g.position.x > 24) g.position.x = -24; }); } },
      rainbow: () => RAINBOW.forEach((c, i) => { const o = see(add(new THREE.TorusGeometry(16 - i * .5, .25, 4, 40, Math.PI), c, V((rnd() - .5) * 4, -1, -32)), .45); o.material.fog = false; }),
      waterfall: () => { const x = (rnd() - .5) * 14; add(cone(4, 11, 5), pick(ROCK), V(x - 2.5, 5, -20)); add(cone(4, 10, 5), pick(ROCK), V(x + 2.5, 4.5, -20));
        for (let i = 0; i < 4; i++) { const o = see(add(new THREE.PlaneGeometry(.5, 9), 0xDFF4FF, V(x - .75 + i * .5, 4.5, -18.5)), .7);
          S.anims.push((dt, now) => { o.material.opacity = .5 + .3 * Math.sin(now / 150 + i * 1.7); }); }
        flat(new THREE.CircleGeometry(2.2, 10), 0x6FB5D5, V(x, .04, -17.5), .9); smoke(V(x, .2, -17.2), 5, .5, 1.5, 0xFFFFFF); },
      herd: () => { const dir = rnd() < .5 ? 1 : -1; for (let i = 0; i < 2 + rnd() * 3; i++) { const g = cutout(body(theme.herd || HERD), V((rnd() - .5) * 16, 0, -13 - rnd() * 5), 1.4 + rnd(), dir);
        S.anims.push(dt => { g.position.x += dir * dt * .12; }); } },
      flyer: () => across(body(FLYERS), 1 + rnd() * 2, 5, 1, 1.4, .4),
      dragonflies: () => across(of(s => s.body === 'bug' && s.loco === 'fly'), 2, 1.5, .5, 2, .3),
      swimmers: () => across(body(SWIMMERS), 1 + rnd() * 2, 2, 1, .8, .3),
      ammonites: () => across(of(s => s.id === 'ammonoidea'), 6, 1, .5, .5, .3),
      fish: () => { for (let s = 0; s < 2; s++) { const g = new THREE.Group(), c = pick([0xF5D547, 0xF29B38, 0x9AD8F0, 0xE8E8E8]), cx = (rnd() - .5) * 10, cy = 2 + rnd() * 3, cz = -5 - rnd() * 5; sc.add(g);
        for (let i = 0; i < 12; i++) { const f = add(cone(.08, .3, 4), c, V((rnd() - .5) * 1.5, (rnd() - .5) * .8, (rnd() - .5) * 1.5), null, 0, g); f.rotation.z = -Math.PI / 2; f.castShadow = false; }
        S.anims.push((dt, now) => { const t = now / 3000 + s * 3; g.position.set(cx + 4 * Math.cos(t), cy + .5 * Math.sin(t * 2), cz + 2 * Math.sin(t)); g.rotation.y = -t + Math.PI / 2; }); } },
      jelly: () => { for (let i = 0; i < 6; i++) { const g = new THREE.Group(), c = pick([0xFF7AD0, 0x7AE0FF, 0xB07CFF]), y0 = 1 + rnd() * 4; g.position.set((rnd() - .5) * 14, y0, -3 - rnd() * 8); sc.add(g);
        see(add(new THREE.SphereGeometry(.35, 10, 5, 0, 2 * Math.PI, 0, Math.PI / 2), c, V(0, 0, 0), null, 0, g), .7, c);
        for (let j = 0; j < 4; j++) see(add(cyl(.02, .01, .8), c, V((j - 1.5) * .12, -.4, 0), null, 0, g), .6, c);
        S.anims.push((dt, now) => { g.position.y = y0 + .4 * Math.sin(now / 1100 + i); }); } },
      glow: () => drift(30, 0x9AF0FF, .04, .15, 0x6AD8FF),
      bubbles: () => drift(24, 0xDDF3FF, .05, .8, 0, [12, 6, 6]),
      fireflies: () => drift(26, 0xFFF08A, .05, .05, 0xFFD84A, [16, 3, 10]),
      embers: () => drift(30, 0xFF7A2A, .06, .9, 0xFF4A00),
      ash: () => drift(40, 0x6A6260, .05, -.4),
      snow: () => drift(60, 0xFFFFFF, .06, -.7),
      rain: () => drift(60, 0xB8D4E8, .015, -9),
      mist: () => { for (let i = 0; i < 5; i++) { const o = see(add(BLOB, 0xFFFFFF, V((rnd() - .5) * 24, .4, -3 - rnd() * 10), [4, .5, 2]), .25);
        S.anims.push(dt => { o.position.x += dt * .2; if (o.position.x > 14) o.position.x = -14; }); } },
      waves: () => { if (!marineSide) return; for (let i = 0; i < 3; i++) { const o = flat(new THREE.PlaneGeometry(.18, 30), 0xFFFFFF, V(marineSide * (.8 + i * 1.2), .05, 0), .7);
        S.anims.push((dt, now) => { const t = now / 1400 + i * 2.1; o.position.x = marineSide * (.8 + i * 1.2 + .4 * Math.sin(t)); o.material.opacity = .35 + .35 * Math.sin(t); }); } },
    };
    for (const [name, p] of Object.entries(theme.far || {})) if (rnd() < p) FAR[name]();
  }

  /* ---------- start / stop ---------- */
  // figures: 'model' bryły 3D | 'bill' wytłoczone rysunki 2D; look: numer wyglądu terenu (testy), domyślnie losowy
  async function start(grid, B, figures = 'model', look) {
    const host = grid.closest('.arena'), stage = Object.assign(document.createElement('div'), { className: 'stage3d' });
    host.classList.add('v3d'); grid.before(stage); stage.append(grid);
    try { await load(); } catch { host.classList.remove('v3d'); stage.before(grid); stage.remove(); return; } // brak pliku → 2D
    if (!stage.isConnected) return;
    stop();
    const key = Object.keys(ARENAS).find(k => ARENAS[k] === B.arena), list = THEMES[key] || THEMES.plains, theme = list[look ?? Math.floor(Math.random() * list.length)];
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(PIXEL_RATIO_MAX, devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(renderer.domElement);
    const tint = theme.tint === false ? 0 : SKY_TINTS[Math.floor(Math.random() * SKY_TINTS.length)], sky = new THREE.Color(theme.sky);
    if (tint) sky.lerp(new THREE.Color(tint), TINT_MIX);
    const scene = new THREE.Scene(); scene.background = sky; scene.fog = new THREE.Fog(sky, ...(theme.fog || (theme.under ? [10, 28] : [10, 34])));
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
    S = { renderer, scene, camera, stage, theme, parts: [], todo: [], anims: [], faces: [], shake: 0, t0: performance.now() };
    SPH = new THREE.SphereGeometry(1, 8, 6);
    scene.add(new THREE.HemisphereLight(0xFFFFFF, theme.ground, theme.light || (theme.under ? .6 : .75)));
    const sun = new THREE.DirectionalLight(0xFFFFFF, theme.under ? .45 : .7); sun.position.set(4, 9, 6); sun.castShadow = true; if (tint) sun.color.lerp(new THREE.Color(tint), TINT_MIX);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -3 }); sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP); sun.shadow.radius = 4;
    scene.add(sun);
    let seed = 1 + Math.floor(Math.random() * 2147483646); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cube = s => Math.cbrt(s.kg || 100), big = Math.max(cube(B.a.s), cube(B.b.s));
    const Hof = s => H_MAX * Math.max(RATIO_MIN, cube(s) / big);
    S.byId = { [B.a.id]: fighter(B.a.s, 'a', Hof(B.a.s), theme, figures), [B.b.id]: fighter(B.b.s, 'b', Hof(B.b.s), theme, figures) };
    [S.byId[B.a.id].foe, S.byId[B.b.id].foe] = [S.byId[B.b.id], S.byId[B.a.id]];
    const sea = [B.a, B.b].map((p, i) => p.s.cat === 'marine' ? (i ? 1 : -1) : 0).find(Boolean) || 0;
    terrain(theme, rnd, key === 'coast' ? sea : 0);
    S.ro = new ResizeObserver(() => { const { clientWidth: w, clientHeight: h } = stage; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    S.ro.observe(stage); intro(figures);
    S.raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.ro.disconnect();
    S.scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); } });
    Object.values(S.geo || {}).forEach(g => g.dispose());
    S.renderer.dispose(); S.renderer.forceContextLoss(); S.renderer.domElement.remove(); S = null;
  }

  /* ---------- animacje ---------- */
  /* S.now: zegar gry (staje na stop-klatce, zwalnia przy nokaucie); kb: odrzut trafionego */
  const play = (f, k, ms = ANIM_MS, sty, kb) => { if (!f.ko) f.anim = { k, t0: S.now, ms, style: sty, kb }; };
  const soon = (ms, fn) => S.todo.push([S.now + ms, fn]);
  const cam = (x, k, ms) => Object.assign(S.cam, { tx: x, tk: k, until: S.now + ms });   // kamera płynie do: x patrzenia, krotność dystansu
  // wejście na arenę: kształty cząstek, pula, kamera z daleka najeżdża, obaj zawodnicy po kolei ryczą
  function intro(figures) {
    const T = THREE, v2 = pts => pts.map(([x, y]) => new T.Vector2(x, y)), r = i => i % 2 ? .45 : 1;
    S.geo = { blob: new T.IcosahedronGeometry(1, 0), chip: new T.CircleGeometry(1, 5), ring: new T.RingGeometry(.8, 1, 20), streak: new T.PlaneGeometry(1, .08),
      star: new T.ShapeGeometry(new T.Shape(v2(Array.from({ length: 10 }, (_, i) => [Math.sin(i * Math.PI / 5) * r(i), Math.cos(i * Math.PI / 5) * r(i)])))),
      tooth: new T.ConeGeometry(.07, .24, 4), arc: new T.TorusGeometry(1, .045, 3, 14, Math.PI * .7), feather: new T.ShapeGeometry(new T.Shape(v2(feather(1, .22).map(([x, y]) => [x - .5, y])))) };
    Object.assign(S, { paper: figures === 'bill', now: performance.now(), ix: 0, cam: { x: 0, k: CAM.intro, th: 0, tx: 0, tk: 1, until: 0 } });
    S.parts = Array.from({ length: POOL }, () => { const o = new T.Mesh(S.geo.blob, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide }));
      o.visible = false; S.scene.add(o); return { o, v: V(0, 0), on: false }; });
    Object.values(S.byId).forEach((f, i) => soon(i * 350, () => { play(f, 'lunge', f.rig?.ms?.('roar') || ANIM_MS * 1.5, 'roar'); PRE.roar(f); }));
  }
  /* cząstka z puli (krąg: najstarsza ustępuje). o: life [s], s: [rozmiar od, do], grow: część życia na wzrost, g: grawitacja, drag: opór,
     spin, face: przodem do kamery (rz: obrót w płaszczyźnie ekranu), r: obrót [x, y, z], op: krycie, fn(q, k): własny ruch */
  function part(g, c, p, v, o) {
    const q = S.parts[S.ix++ % POOL], m = q.o;
    Object.assign(q, { on: true, t: 0, life: .6, s: [.1, .03], grow: 1, g: 6, drag: 0, spin: 0, face: false, rz: 0, op: 1, fn: null }, o);
    m.geometry = S.geo[S.paper && g === 'blob' ? 'chip' : g];   // wycinanki: papierowe skrawki zamiast kulek
    m.material.color.setHex(c); m.position.copy(p); q.v.copy(v); m.rotation.set(...(o.r || [0, 0, 0])); m.visible = true;
  }
  const R = (a = 1) => (Math.random() - .5) * 2 * a, pick = l => [].concat(l)[Math.floor(Math.random() * [].concat(l).length)], V0 = () => V(0, 0);
  const at = (f, fy = .5, fx = 0) => V(f.root.position.x + f.dir * f.len * fx, f.root.position.y + f.h * fy, .35);  // punkt na zawodniku (ułamki wysokości i długości ku wrogowi), bliżej kamery
  const snout = f => at(f, .78, .4), sz = f => Math.min(1.3, Math.max(.6, f.h / 1.6));   // skala efektu do wielkości zawodnika
  const puff = (p, n, g, c, { sp = 2, up = 2, r = .25, ...o } = {}) => { for (let i = 0; i < n; i++)   // n cząstek rozsypanych z punktu p
    part(g, pick(c), V(p.x + R(r), p.y + R(r), p.z + R(r)), V(R(sp), up * Math.random(), R(sp)), { spin: R(9), ...o, life: (o.life || .6) * (.7 + Math.random() * .6) }); };
  const bubbles = (p, n) => puff(p, n, 'ring', C.water[0], { face: true, g: -3, s: [.06, .13], up: 1, sp: 1, life: 1 });
  function burst(f, n, color) {   // kurz spod trafionego; pod wodą bąble
    if (!color && S.theme.under) return bubbles(at(f, .35), n);
    puff(at(f, .35), n, 'blob', color ?? (S.theme.water ? C.splash : S.theme.ground), { up: 3, sp: 1.5, s: [.09, .02] });
  }
  const teeth = (d, c) => { const p = at(d, .6, .1), z = sz(d);   // dwa łuki zębów zamykają się na trafionym
    for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) part('tooth', c, V(p.x + i * .15 * z, p.y + s * (.55 - .05 * i * i) * z, p.z + .1), V(0, -s * 3 * z, 0),
      { life: .45, s: [z, z], g: 0, drag: 7, r: [0, 0, s > 0 ? Math.PI : 0] }); };
  const scratch = (a, d, n, len) => { const p = at(d, .55), rz = -.8 * a.dir, L = len * Math.max(.6, d.h * .45);   // n świecących rys pazurów
    for (let i = 0; i < n; i++) for (const [c, k, op] of [[C.star, 1.25, .5], [C.white, 1, 1]]) { const o = (i - (n - 1) / 2) * .24;
      part('streak', c, V(p.x - Math.sin(rz) * o, p.y + Math.cos(rz) * o, p.z + .2 * k), V0(), { face: true, rz, life: .6, s: [.1, L * k], grow: .2, g: 0, op }); } };
  const squeeze = (d, ms) => { const p = at(d, .55), r = d.h * .5; d.squeeze = S.now + ms;   // kreski ściskania zbiegają się do środka, ciało się zgniata
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      part('streak', C.white, V(p.x + c * r, p.y + s * r, p.z + .2), V(-c * 1.2, -s * 1.2, 0), { face: true, rz: a, life: .45, s: [.5, .25], g: 0 }); } };
  const dizzy = (f, ms) => { for (let i = 0; i < 3; i++) part('star', C.star, V0(), V0(), { face: true, life: ms / 1000, s: [.13, .13], g: 0, spin: 3,   // gwiazdki krążą nad głową
    fn: q => { const a = q.t * 5 + i * 2.1, p = f.root.position; q.o.position.set(p.x + f.dir * f.len * (f.ko ? 0 : .3) + Math.cos(a) * .35, p.y + f.h * (f.ko ? .4 : 1) + .1, Math.sin(a) * .35); } }); };
  const confetti = p => puff(p, 30, 'chip', RAINBOW, { up: 6, sp: 2.5, g: 4, drag: 1.5, s: [.09, .08], life: 1.8 });
  /* przed ciosem: plwocina leci łukiem, strumień ognia, fale ryku; T = czas lotu [s] */
  const PRE = {
    spit: (a, d, T) => { const p = snout(a), q = at(d, .6), G = 9;
      part('blob', C.venom, p, V((q.x - p.x) / T, (q.y - p.y) / T + G * T / 2, (q.z - p.z) / T), { life: T, s: [.16, .2], g: G, spin: 10 }); },
    fire: (a, d, T) => { for (let i = 0; i < 16; i++) soon(i * T * 50, () => { const p = snout(a);
      part('blob', pick(C.fire), p, V((d.root.position.x - p.x) / T * (.8 + R(.2)), R(.6), R(.6)), { life: T * 1.3, s: [.06, .4], g: -2, spin: 6 }); }); },
    roar: a => { for (let i = 0; i < 3; i++) soon(i * 110, () => part('ring', C.sound, snout(a), V(a.dir * 3.5, 0, 0), { r: [0, 1.1, 0], life: .7, s: [.15, 1.3], g: 0, op: .8 })); },
  };
  /* klocki efektów trafienia: (atakujący, trafiony, mocny cios) */
  const FXP = {
    chomp: (a, d) => teeth(d, C.white), fang: (a, d) => teeth(d, C.venom), snip: (a, d) => teeth(d, C.pincer),
    stars: (a, d, big) => { const p = at(d, .6, -.1); part('star', C.star, p, V0(), { face: true, life: .3, s: [.2, (big ? 1.1 : .7) * sz(d)], grow: .4, g: 0, spin: 3, op: .9 });   // „POW!”
      puff(p, big ? 8 : 4, 'star', C.star, { face: true, s: [.14, .06], sp: 3 }); },
    pop: (a, d) => part('ring', C.white, at(d, .5), V0(), { face: true, life: .4, s: [.2, d.h * .8], g: 0 }),
    dizzy: (a, d) => dizzy(d, DIZZY_MS),
    poison: (a, d) => { d.poison = S.now + POISON_MS; puff(at(d, .6), 8, 'ring', C.venom, { face: true, s: [.1, .18], g: -2, sp: 1.2, up: 1, life: .9 }); },
    splat: (a, d) => puff(at(d, .6), 12, 'blob', C.venom, { up: 3, s: [.12, .05] }),
    smoke: (a, d) => puff(at(d, .7), 8, 'blob', C.smoke, { up: 1, g: -1.5, s: [.12, .35], life: 1.1, spin: 1 }),
    scratch: (a, d) => scratch(a, d, 3, 1), slash: (a, d) => scratch(a, d, 3, 1.6), mark: (a, d) => scratch(a, d, 1, 1),
    whoosh: (a, d) => { for (let i = 0; i < 2; i++) part('arc', C.white, at(d, .55), V0(), { face: true, rz: a.dir > 0 ? 2 + i * .5 : -1 - i * .5, spin: -a.dir * 9, life: .35, s: [.5 + i * .2, .9 + i * .3], g: 0, op: .85 }); },
    rush: a => { const p = at(a, .5); for (let i = 0; i < 5; i++) part('streak', C.white, V(p.x - a.dir * .5, p.y + R(a.h * .35), p.z + R(.2)), V(-a.dir * 5, 0, 0), { face: true, life: .3, s: [.8, .4], g: 0, op: .7 }); },
    quake: (a, d) => { const p = V(d.root.position.x, .06, .3); S.shake = Math.max(S.shake, SHAKE);   // fala uderzeniowa, kamienie i pęknięcia; pod wodą bąble
      part('ring', S.theme.under ? C.water[0] : C.white, p, V0(), { r: [-Math.PI / 2, 0, 0], life: .6, s: [.3, 2.8], g: 0, op: .7 });
      if (S.theme.under) return bubbles(p, 14);
      puff(p, 10, 'blob', S.theme.rock?.[0] || 0x9A8A74, { up: 5, sp: 1.6, s: [.1, .07], g: 12 });
      for (let i = 0; i < 5; i++) part('streak', C.crack, p, V0(), { r: [-Math.PI / 2, 0, i * 1.25 + R(.3)], life: 1.4, s: [.2, .9], grow: .15, g: 0, op: .8 }); },
    squeeze: (a, d) => squeeze(d, SQUEEZE_MS), coil: (a, d) => squeeze(d, SQUEEZE_MS * 3),
    cower: (a, d) => { d.cower = S.now + COWER_MS; S.cam.k -= PUNCH; puff(at(d, .9), 4, 'blob', C.water[1], { up: 2, s: [.07, .05] }); },   // przestraszony kuli się, kropelki potu
    swirl: (a, d) => { for (let i = 0; i < 3; i++) part('arc', C.water[1], at(d, .5), V(0, .4 * i, 0), { face: true, rz: i * 2.1, spin: 10, life: .6, s: [.3, .8 + i * .2], g: 0 }); bubbles(at(d, .5), 8); },
    splash: (a, d) => { puff(at(d, .5), 12, 'blob', C.water, { up: 4, g: 9, s: [.1, .04] }); bubbles(at(d, .5), 6); },
    feathers: (a, d) => puff(at(d, .7), 6, 'feather', a.col, { s: [.35, .3], g: 1.2, drag: 2.5, up: 3, sp: 1.5, life: 1.4 }),
  };
  function animate(f, now, dt) {
    const a = f.anim, t = a ? Math.min(1, (now - a.t0) / a.ms) : 1, s = Math.sin(Math.PI * t);
    let dx = 0, dy = 0, dz = 0, rz = 0, ry = 0, sy = 1, flash = 0, glow = 0;
    if (a) ({
      lunge: () => { const m = f.rig?.root?.('lunge', a.style, t);
        if (m) { dx = f.dir * (m.fwd || 0); dy = m.up || 0; rz = m.pitch || 0; ry = m.yaw || 0; }
        else { dx = f.dir * LUNGE * s; rz = -.18 * s; if (f.jaw) f.jaw.rotation.z = -.5 * s; } },
      hit: () => { dx = -f.dir * (a.kb ?? .35) * Math.sin(Math.PI * Math.sqrt(t)); flash = 1 - t; },   // szybko w tył, powoli z powrotem
      dodge: () => { dx = -f.dir * DODGE.back * s; dy = DODGE.up * s; ry = 2 * Math.PI * t; },
      guard: () => { sy = 1 - .16 * s; glow = s; },
      ko: () => { rz = Math.PI / 2 * t; dy = -f.lift * t; dx = -f.dir * KB.ko * Math.min(1, 2 * t); flash = 1 - t; },
    })[a.k]();
    if (a && t >= 1 && a.k !== 'ko') f.anim = null;
    f.ko = f.ko || (a && a.k === 'ko' && t >= 1);
    if (f.ko) { rz = Math.PI / 2; dy = -f.lift; dx = -f.dir * KB.ko; }
    const tm = now / 1000 + f.phase;
    // stany: otruty (zielony puls + bąble), przestraszony (kuli się i cofa), ściśnięty (drga zgnieciony)
    const pz = f.poison > now ? .5 + .5 * Math.sin(now / 130) : 0, cw = Math.max(0, Math.min(1, ((f.cower || 0) - now) / 250)), sq = f.squeeze > now ? Math.abs(Math.sin(now / 45)) : 0;
    if (pz && now > (f.pb || 0)) { f.pb = now + POISON_EVERY; part('ring', C.venom, at(f, .2 + Math.random() * .7, R(.4)), V(R(.2), .8, 0), { face: true, s: [.06, .14], g: -.5, life: 1 }); }
    dx -= f.dir * .3 * cw; sy *= 1 - .15 * cw - .1 * sq;
    if (!f.ko) sy *= 1 + .025 * Math.sin(tm * 3);
    if (f.swim && !f.ko) dy += .12 * Math.sin(tm * 2);
    if (f.won) dy += Math.abs(Math.sin(tm * 5)) * .25;
    if (f.tail) f.tail.rotation.x = .08 * Math.sin(tm * 2);
    f.rig?.update({ k: a?.k || null, style: a?.style, t, tm, dt, ko: f.ko, won: f.won, guarding: f.guarding, gap: Math.abs((f.foe?.root.position.x ?? -f.x0) - f.root.position.x) });
    f.root.position.set(f.x0 + dx, f.lift + dy, dz); f.shadow.position.set(f.x0 + dx, .02, dz);
    [f.inner.rotation.x, f.inner.rotation.z] = a?.k === 'ko' || f.ko ? [rz, 0] : [0, rz];
    f.inner.scale.y = sy; f.inner.rotation.y = ry;
    const blk = Math.max(0, 1 - (now - (f.blockT || 0)) / SHIELD.flashMs);   // błysk bańki przy zablokowanym ciosie
    f.shield.material.opacity = f.ko ? 0 : f.guarding ? SHIELD.alpha * (1 + .2 * Math.sin(tm * 6)) : blk * .8;
    f.shield.visible = f.shield.material.opacity > .01;
    for (const m of f.mats) m.emissive ? m.emissive.setRGB(flash * .8, glow * .35 + pz * .3, 0) : m.color.setRGB(1 - pz * .45, 1 - flash * .6, 1 - flash * .6 - pz * .45);
    if (a?.k === 'ko' || f.ko) {   // przewrócony obraca się wokół stóp → podnieś, żeby leżał NA ziemi, nie pod nią
      f.root.updateMatrixWorld(true);
      f.root.position.y -= Math.min(0, new THREE.Box3().setFromObject(f.inner).min.y - GROUND_EPS);
    }
  }
  function loop(now) {
    if (!S) return;
    if (!S.stage.isConnected) return stop();
    S.raf = requestAnimationFrame(loop);
    const rdt = Math.min(.05, (now - (S.last || now)) / 1000); S.last = now;
    const dt = rdt * (now < (S.stop || 0) ? 0 : now < (S.slow || 0) ? SLOW.k : 1); S.now += dt * 1000;
    const due = S.todo; S.todo = []; for (const j of due) j[0] > S.now ? S.todo.push(j) : j[1]();   // zadania mogą dokładać nowe
    // kamera: wolno krąży; przy zwycięzcy wahadło i zbliżenie; cam() przesuwa cel na chwilę
    const cm = S.cam, W = S.won, e = Math.min(1, rdt * CAM.ease), c = S.camera;
    if (W) cm.tx = W.root.position.x * .6, cm.tk = Math.max(CAM.win, Math.max(W.h, W.len * LEN_K) / H_MAX); else if (S.now > cm.until) cm.tx = 0, cm.tk = 1;
    const th = W ? CAM.swing * Math.sin((now - W.wonAt) / CAM.winMs * 2 * Math.PI) : ORBIT * Math.sin((now - S.t0) / ORBIT_MS * 2 * Math.PI);
    cm.x += (cm.tx - cm.x) * e; cm.k += (cm.tk - cm.k) * e; cm.th += (th - cm.th) * e;
    const d = CAM_D * cm.k / Math.min(1, c.aspect / 1.5);  // wąski ekran telefonu → kamera dalej
    c.position.set(cm.x + d * Math.sin(cm.th) + (Math.random() - .5) * S.shake, LOOK_Y + (CAM_Y - LOOK_Y) * cm.k + (Math.random() - .5) * S.shake, d * Math.cos(cm.th));
    c.lookAt(cm.x, LOOK_Y, 0); S.shake *= .88;
    for (const f of Object.values(S.byId)) animate(f, S.now, dt);
    for (const q of S.parts) if (q.on) {
      const m = q.o, k = (q.t += dt) / q.life;
      if (k >= 1) { q.on = m.visible = false; continue; }
      q.v.y -= q.g * dt; q.v.multiplyScalar(1 - Math.min(1, q.drag * dt)); m.position.addScaledVector(q.v, dt);
      m.scale.setScalar(q.s[0] + (q.s[1] - q.s[0]) * Math.min(1, k / q.grow)); m.material.opacity = q.op * Math.min(1, 4 * (1 - k));
      if (q.face) { m.quaternion.copy(c.quaternion); m.rotateZ(q.rz + q.spin * q.t); } else if (q.spin) { m.rotation.x += q.spin * dt; m.rotation.z += q.spin * .6 * dt; }
      q.fn?.(q, k);
    }
    for (const fn of S.anims) fn(dt, S.now);
    for (const g of S.faces) g.quaternion.copy(c.quaternion);   // dalekie rysunki zawsze przodem do kamery
    S.renderer.render(S.scene, c);
  }

  /* ---------- zdarzenia z silnika walki ---------- */
  function event(ev) {
    const a = S?.byId[ev.att], d = S?.byId[ev.def];
    if (!a || !d) return;
    if (ev.move === 'guard') { a.guarding = true; return play(a, 'guard', ANIM_MS * 1.5); }
    const sty = style(a, ev.move), ms = a.rig?.ms?.(sty) || ANIM_MS, hit = ms * (a.rig?.hitAt?.(sty) ?? HIT_FRAC);
    const sp = ev.move === 'special', ko = ev.hpDef === 0, big = sp || ev.damage >= BIG_HIT, dx = f => f.root.position.x;
    play(a, 'lunge', ms, sty);
    if (PRE[sty]) soon(Math.max(0, hit - PRE_MS), () => PRE[sty](a, d, Math.min(hit, PRE_MS) / 1000));
    if (sp) cam(dx(a) * .3, .88, hit);   // specjalny: kamera najeżdża na atakującego w czasie zamachu
    if (ev.dodge) soon(hit / 2, () => { play(d, 'dodge', ANIM_MS * 1.4); burst(d, 8, C.white); FXP.whoosh(d, d); });
    if (ev.guarded) soon(hit, () => { d.guarding = false; d.blockT = S.now; burst(d, 12, SHIELD.color); });
    else if (ev.damage) soon(hit, () => {
      play(d, ko ? 'ko' : 'hit', ko ? ANIM_MS * 2 : ANIM_MS, sty, KB.base + ev.damage * KB.k);
      (FX[sty] || 'stars').split(' ').forEach(k => FXP[k](a, d, big)); burst(d, big ? 14 : 7);
      if (big) { S.shake = Math.max(S.shake, SHAKE); S.stop = performance.now() + HITSTOP_MS; S.cam.k -= PUNCH; cam(dx(d) * .4, .85, 500); }   // stop-klatka i skok kamery
      if (ko) { S.slow = performance.now() + SLOW.ms; cam(dx(d) * .5, .72, 2500); dizzy(d, KO_DIZZY_MS); }   // nokaut: zwolnienie, najazd, gwiazdki
    });
  }
  /* efekty trafienia wg stylu: lista klocków z FXP (nieznany styl → gwiazdki); kurz z burst() zawsze */
  const FX = { bite: 'chomp stars', crush: 'chomp squeeze', shake: 'chomp dizzy', venom: 'fang poison', spit: 'splat poison', fire: 'smoke stars',
    claw: 'scratch', slash: 'slash stars', kick: 'stars', pounce: 'scratch stars', grab: 'squeeze', thumb: 'mark stars',
    tail: 'whoosh stars', club: 'whoosh stars dizzy', spin: 'whoosh stars dizzy', neck: 'whoosh stars', stomp: 'quake', rear: 'quake stars', trample: 'quake rush',
    headbutt: 'rush stars dizzy', gore: 'rush stars dizzy', charge: 'rush stars dizzy', ram: 'rush stars dizzy', roll: 'rush dizzy', tusk: 'rush stars',
    coil: 'coil', shell: 'stars pop', roar: 'cower', flipper: 'swirl', tentacle: 'swirl squeeze', trunk: 'splash whoosh',
    peck: 'feathers stars', wing: 'feathers whoosh', dive: 'feathers stars', sting: 'stars poison', pincer: 'snip stars' };
  function win(id) {   // zwycięzca: konfetti i wahadło kamery; przegrany pada
    if (!S) return;
    for (const [k, f] of Object.entries(S.byId)) if (k !== String(id)) f.ko || play(f, 'ko', ANIM_MS * 2);   // klucze obiektu to napisy, id Pokémona to liczba
      else { Object.assign(f, { won: true, wonAt: performance.now() }); S.won = f; for (let i = 0; i < 3; i++) soon(i * 600, () => confetti(at(f, 1.2))); }
  }
  return { ok, start, stop, event, win, get S() { return S; } };   // S: stan sceny dla testów (tmp/steps_ko.js)
})();
