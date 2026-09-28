# Jednorazowa łatka js/arena3d.js: warianty wyglądu (biomy) dla każdego terenu + nowe elementy tła
p = 'js/arena3d.js'; s = open(p).read()
a = s[s.index("  // props: element tła → ile sztuk;"):s.index("  const BIPED =")]
s = s.replace(a, r"""  /* Każdy teren z battle.js ma kilka wyglądów (biomów), losowanych na walkę.
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
""")
a = s[s.index("  function terrain(theme, rnd, marineSide) {"):s.index("  /* ---------- start / stop ---------- */")]
s = s.replace(a, r"""  function terrain(theme, rnd, marineSide) {
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
    const spot = () => { const x = (rnd() - .5) * 26; return V(marineSide ? -marineSide * Math.abs(x) : x, 0, -4 - rnd() * 12); };   // wybrzeże: tylko po stronie lądu
    for (const [name, n] of Object.entries(theme.props)) for (let i = 0; i < n; i++) PROPS[name](spot(), .7 + rnd());
    // rysunek gatunku jako daleka tablica (stado, latające, pływające); obracana do kamery w loop()
    const cutout = (bodies, p, H, dir) => { const l = SPECIES.filter(s => bodies.includes(s.body)), g = new THREE.Group(); g.position.copy(p); sc.add(g); S.faces.push(g);
      billboard(g, pick(l), H).plane.scale.x = dir; return g; };
    const across = (bodies, n, y, H, speed, bob) => { for (let i = 0; i < n; i++) { const dir = rnd() < .5 ? 1 : -1, y0 = y + rnd() * 2, g = cutout(bodies, V((rnd() - .5) * 24, y0, -6 - rnd() * 8), H * (1 + rnd() * .6), dir);
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
      herd: () => { const dir = rnd() < .5 ? 1 : -1; for (let i = 0; i < 2 + rnd() * 3; i++) { const g = cutout(theme.herd || HERD, V((rnd() - .5) * 16, 0, -13 - rnd() * 5), 1.4 + rnd(), dir);
        S.anims.push(dt => { g.position.x += dir * dt * .12; }); } },
      flyer: () => across(FLYERS, 1 + rnd() * 2, 5, 1, 1.4, .4),
      dragonflies: () => across(['bug'], 2, 1.5, .5, 2, .3),
      swimmers: () => across(SWIMMERS, 1 + rnd() * 2, 2, 1, .8, .3),
      ammonites: () => { for (let i = 0; i < 6; i++) { const g = cutout(['bug'], V(0, 0, 0), 1, 1); g.clear(); billboard(g, SPECIES.find(s => s.id === 'ammonoidea'), .5 + rnd() * .5);
        const dir = rnd() < .5 ? 1 : -1, y0 = 1 + rnd() * 4; g.position.set((rnd() - .5) * 20, y0, -4 - rnd() * 8);
        S.anims.push((dt, now) => { g.position.x += dir * dt * .5; g.position.y = y0 + .3 * Math.sin(now / 700 + i); if (Math.abs(g.position.x) > 14) g.position.x = -dir * 14; }); } },
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

""")
s = s.replace("theme = THEMES[key] || THEMES.plains;", "list = THEMES[key] || THEMES.plains, theme = list[Math.floor(Math.random() * list.length)];")
s = s.replace("const tint = theme.under ? 0 : SKY_TINTS", "const tint = theme.tint === false ? 0 : SKY_TINTS")
s = s.replace("scene.fog = new THREE.Fog(sky, theme.under ? 6 : 10, theme.under ? 20 : 34);", "scene.fog = new THREE.Fog(sky, ...(theme.fog || (theme.under ? [6, 20] : [10, 34])));")
s = s.replace("scene.add(new THREE.HemisphereLight(0xFFFFFF, theme.ground, theme.under ? .6 : .75));", "scene.add(new THREE.HemisphereLight(0xFFFFFF, theme.ground, theme.light || (theme.under ? .6 : .75)));")
open(p, 'w').write(s)
