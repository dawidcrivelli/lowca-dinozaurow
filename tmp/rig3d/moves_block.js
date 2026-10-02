  /* ---------- ruchy: [ms, ułamek trafienia, ...klucze [t, {kanał: wartość}]] — brak kanału w kluczu = 0, gładko między kluczami
     styl = jeden ruch albo lista wariantów [[ms, hit, …], …]; przy każdym wypadzie losowy wariant, strona (lustro) i rozrzut ±JIT
     korzeń (arena): fwd, up [m], pit, yaw · miednica: by (przysiad × biodro), bp (dęba), sr (przechył) · kręgosłup: sb, sy
     szyja nk, ny · głowa hp, hy, hr · jw pysk · ogon tl (unieś), tw (zamach, z opóźnieniem w dół ogona)
     ar ręce/łapy w przód · al ręka wiodąca (+ jedna w przód, druga w tył) · ax ręce w bok · af machanie rękami
     lf przednie nogi w powietrzu · kk kopnięcie · st tupnięcie · fold podkulenie · sh potrząsanie · bl powieki
     wb chwianie (trucizna) · jk szarpanie (ofiara się wyrywa) · sq zgniecenie (− ściśnięcie) · cl zwinięcie ogona (wąż) · tn sięgnięcie macek/szczypiec */
  const CH = 'fwd up pit yaw by bp sr sb sy nk ny hp hy hr jw tl tw ar al ax af lf kk st fold sh bl wg fp tr wb jk sq cl tn'.split(' ');
  const MIR = new Set('yaw sr sy ny hy hr tw al'.split(' ')), FIX = new Set(['fwd', 'yaw']);   // kanały odbijane lustrem; bez rozrzutu amplitudy (zasięg, pełne obroty)
  const JIT = .15, MS_MAX = 720;             // rozrzut amplitudy i tempa; górny limit czasu ataku [ms]
  // teropody: kłapnięcie z góry / z boku nisko / podwójne; szarpanie łbem / całym ciałem / podrzut; pazury z góry / z boku / dwa razy
  const BITE2 = [700, .62, [.2, { fwd: -.1, bp: .15, nk: .35, hp: .3, jw: 1, ar: -.3 }], [.36, { fwd: .65, bp: -.1, nk: -.2, hp: -.2, jw: 0, ny: -.25 }],
    [.48, { fwd: .55, nk: .15, hp: .2, jw: 1, ny: .1, bp: .05 }], [.62, { fwd: 1.05, bp: -.18, nk: -.35, hp: -.3, jw: 0, ny: .3, by: -.1, ar: .3 }], [.8, { fwd: .8, jw: .2, nk: -.1 }]];
  const BI = {
    bite: [[620, .5, [.3, { fwd: -.15, bp: .3, by: .04, nk: .55, hp: .45, jw: 1.1, tl: .35, ar: -.5, ax: .3 }], [.5, { fwd: 1, bp: -.28, by: -.12, nk: -.5, hp: -.45, jw: 0, tl: -.15, ar: .5 }],
      [.72, { fwd: .8, bp: -.1, nk: -.2, hp: -.15, jw: .2, sh: .6 }]],
      [600, .48, [.3, { fwd: -.1, by: -.16, bp: -.05, sy: .5, yaw: .25, ny: -.7, hy: -.3, hr: .35, jw: 1, nk: -.1, tl: .2, sr: .12, al: .5 }],
        [.48, { fwd: 1.05, by: -.14, sy: -.35, yaw: -.2, ny: .45, hy: .25, hr: .5, nk: -.25, hp: -.1, jw: 0, sr: -.15, al: -.5 }], [.7, { fwd: .8, by: -.08, sy: -.15, ny: .2, hr: .25, jw: .15 }]], BITE2],
    shake: [[700, .4, [.25, { fwd: -.2, bp: .15, nk: .55, hp: .4, jw: 1, tl: .35, by: -.1 }], [.4, { fwd: 1.05, bp: -.15, nk: -.3, hp: -.3, jw: 0 }],
      [.85, { fwd: .75, bp: .05, nk: .15, hp: .1, jw: .05, sh: 1.8, af: .8 }]],
      [700, .38, [.22, { fwd: -.2, bp: .12, nk: .45, hp: .35, jw: 1, tl: .3, by: -.08 }], [.38, { fwd: 1.05, bp: -.15, nk: -.3, hp: -.3, jw: 0 }],
        [.52, { fwd: .9, sy: .6, yaw: .3, ny: .7, sr: .2, tw: .8, af: 1 }], [.68, { fwd: .85, sy: -.6, yaw: -.3, ny: -.7, sr: -.2, tw: -.8, af: 1 }], [.84, { fwd: .75, sy: .4, yaw: .15, ny: .4, tw: .5, sh: .6 }]],
      [700, .4, [.25, { fwd: -.15, by: -.12, nk: -.2, hp: -.1, jw: 1, bp: -.05 }], [.4, { fwd: 1, by: -.15, bp: -.18, nk: -.45, hp: -.35, jw: 0 }],
        [.65, { fwd: .7, by: .04, bp: .3, nk: .6, hp: .55, sh: 1.4, tl: -.2, af: .8, ny: .3 }], [.85, { fwd: .5, bp: .15, nk: .3, hp: .4, jw: .9, hy: .5 }]]],
    claw: [[620, .5, [.3, { fwd: .1, bp: .35, ar: -1.3, ax: .5, nk: .3, hp: .25, jw: .6, tl: -.15 }], [.5, { fwd: .85, bp: .02, ar: 1.4, ax: -.2, nk: -.15, jw: .8, by: -.06 }], [.72, { fwd: .6, ar: .5, jw: .3 }]],
      [620, .5, [.3, { sy: -.55, yaw: -.3, sr: .15, ar: -.4, al: -.9, ax: .7, ny: .3, jw: .5, tl: .2 }], [.5, { fwd: .85, sy: .55, yaw: .3, sr: -.15, ar: .6, al: 1.1, ax: -.4, ny: -.3, jw: .8 }],
        [.72, { fwd: .6, sy: .2, yaw: .1, al: .4 }]],
      [700, .62, [.22, { fwd: .05, bp: .25, ar: -.8, al: -.6, ax: .4, jw: .6, nk: .25 }], [.4, { fwd: .7, bp: .05, ar: .6, al: 1, jw: .8, sr: .1 }],
        [.62, { fwd: .95, bp: .08, ar: .6, al: -1, jw: .9, sr: -.1, by: -.06 }], [.8, { fwd: .6, ar: .3 }]]],
    tail: [[700, .55, [.28, { yaw: -.45, sy: -.4, tw: -.8, by: -.06, nk: .15, ax: .3 }], [.55, { yaw: 2.3, fwd: .4, sy: .5, tw: 1.2, nk: .25, hy: -.3, ax: .5 }], [.8, { yaw: 1.1, fwd: .2, tw: .3 }]],
      [700, .55, [.25, { yaw: -.6, sy: -.5, tw: -1, by: -.18, tl: -.3, nk: -.1, ax: .5, sr: -.1 }], [.55, { yaw: 2.1, fwd: .35, up: .18, sy: .6, tw: 1.4, tl: -.35, sr: .15, ax: .6, hy: -.3 }],
        [.8, { yaw: .9, fwd: .15, tw: .3, by: -.08 }]]],
    kick: [[620, .5, [.3, { by: -.15, bp: .2, kk: -.3, ar: -.6, nk: .25, tl: .2 }], [.5, { fwd: .9, up: .35, bp: .4, kk: 1, ar: .8, tl: .45, jw: .7 }], [.72, { fwd: .5, kk: .2, up: .05 }]],
      [660, .6, [.22, { by: -.2, bp: .15, kk: -.4, ar: -.4, ax: .3 }], [.38, { fwd: .6, kk: .8, bp: .3, up: .15, sr: .1 }], [.48, { fwd: .55, kk: -.2 }],
        [.6, { fwd: .95, up: .3, bp: .45, kk: 1.1, ar: .6, jw: .7, tl: .45, sr: -.1 }], [.78, { fwd: .5, kk: .2 }]]],
    pounce: [[700, .55, [.3, { by: -.28, bp: -.1, nk: -.15, ar: -.6, tl: .25 }], [.55, { fwd: 1.2, up: .75, pit: .15, kk: .9, ar: 1.1, jw: 1, tl: .45 }], [.78, { fwd: .8, kk: .3, jw: .2, by: -.1 }]],
      [680, .55, [.3, { by: -.22, sy: .3, nk: -.2, ar: -.3, ax: .7, tl: .2 }], [.55, { fwd: 1.15, up: .4, pit: -.05, sy: -.2, ar: 1, ax: -.3, jw: 1, kk: .6, nk: -.2, hp: -.2 }],
        [.78, { fwd: .85, ar: .7, ax: -.4, jw: .3, by: -.12, sh: .4 }]]],
    peck: [560, .5, [.32, { fwd: -.1, nk: .5, hp: .35, jw: .5, bp: .1 }], [.5, { fwd: .8, nk: -.55, hp: -.45, jw: .1, bp: -.25 }], [.66, { fwd: .6, nk: -.3, jw: .4 }]],
    headbutt: [[620, .5, [.3, { fwd: -.2, nk: .3, hp: .2, by: -.1, bp: .12 }], [.5, { fwd: 1.1, nk: -.5, hp: -.7, bp: -.25, by: -.12 }], [.66, { fwd: .75, nk: -.3, hp: -.3 }]],
      [640, .5, [.3, { fwd: -.15, bp: .3, nk: .5, hp: .5, by: .02, ax: .4 }], [.5, { fwd: 1.05, bp: -.35, nk: -.6, hp: -.8, by: -.12, ar: .4 }], [.68, { fwd: .7, bp: -.15, nk: -.3, hp: -.3 }]]],
    charge: [700, .52, [.22, { fwd: -.25, nk: .15, by: -.1 }], [.52, { fwd: 1.3, nk: -.55, hp: -.7, bp: -.3, by: -.12, tl: .2 }], [.68, { fwd: .9, nk: -.2, hp: .1 }]],
    stomp: [660, .55, [.35, { fwd: .2, bp: .4, by: .04, nk: .45, hp: .3, st: 1, jw: .6, ar: -.5 }], [.55, { fwd: .75, bp: -.12, nk: -.15, jw: .3, by: -.08 }], [.72, { fwd: .6, by: -.04 }]],
    thumb: [600, .5, [.3, { fwd: .05, bp: .2, ar: -1, nk: .2 }], [.5, { fwd: .85, bp: .05, ar: 1.4, nk: -.1, hp: -.1 }], [.72, { fwd: .6, ar: .4 }]],
  };
  BI.fire = BI.shake;
  /* czworonogi: ar = przednia łapa w przód (zamach), lf = przednie nogi w górę (dęba), tr = trąba
     ceratopsy: róg — podrzut / prosty taran / szarpanie łbem; łeb — dęba i w dół / zamach kryzą / dwa pchnięcia; tupnięcie — raz / dwa / grzebanie; szarża — galop / skok / zamach rogami */
  const QU = {
    gore: [[660, .5, [.3, { fwd: -.2, by: -.14, bp: .05, nk: -.25, hp: -.45 }], [.5, { fwd: 1.05, by: -.12, bp: -.1, nk: -.4, hp: -.6 }],
      [.66, { fwd: .9, by: .02, bp: .25, lf: .5, nk: .35, hp: .55, jw: .4, sr: .1 }], [.85, { fwd: .6, bp: .1, nk: .15, hp: .25 }]],
      [600, .45, [.28, { fwd: -.3, by: -.16, bp: -.05, nk: -.5, hp: -.6, tl: .25 }], [.45, { fwd: 1.15, by: -.14, bp: -.15, nk: -.55, hp: -.7, tl: .3 }], [.6, { fwd: .85, bp: .05, nk: -.3, hp: -.4 }]],
      [700, .45, [.25, { fwd: -.15, by: -.1, nk: -.3, hp: -.4, ny: -.4, hy: -.2 }], [.45, { fwd: 1, by: -.12, nk: -.4, hp: -.55, ny: .3, hr: .4, sr: .12 }],
        [.6, { fwd: .9, nk: -.3, hp: -.45, ny: -.45, hr: -.5, sr: -.12, sy: -.2 }], [.75, { fwd: .85, nk: -.3, hp: -.4, ny: .4, hr: .45, sr: .1, sy: .2 }], [.9, { fwd: .6, nk: -.1, hp: -.1 }]]],
    headbutt: [[700, .55, [.35, { fwd: -.05, bp: .4, lf: 1, nk: .3, hp: .35, tl: -.2 }], [.55, { fwd: 1, bp: -.15, by: -.14, nk: -.5, hp: -.75 }], [.72, { fwd: .75, by: -.08, nk: -.25, hp: -.3 }]],
      [660, .52, [.3, { fwd: -.05, yaw: .4, sy: .4, ny: -.9, hy: -.5, hr: -.3, by: -.08, sr: .1 }], [.52, { fwd: .8, yaw: -.5, sy: -.5, ny: .9, hy: .5, hr: .35, sr: -.15, nk: -.2 }],
        [.72, { fwd: .6, yaw: -.2, ny: .35, hy: .2 }]],
      [700, .66, [.2, { fwd: -.15, by: -.1, nk: -.3, hp: -.4 }], [.35, { fwd: .6, by: -.12, nk: -.4, hp: -.55, bp: -.1 }], [.48, { fwd: .35, nk: -.15, hp: -.2, bp: .05 }],
        [.66, { fwd: 1.1, by: -.14, nk: -.5, hp: -.7, bp: -.15 }], [.82, { fwd: .75, nk: -.25, hp: -.3 }]]],
    charge: [[700, .55, [.2, { fwd: -.25, by: -.08, nk: -.2, hp: -.3 }], [.32, { fwd: .15, by: -.14, bp: .06, nk: -.35, hp: -.5 }], [.44, { fwd: .6, by: -.04, bp: -.06, nk: -.45, hp: -.6 }],
      [.55, { fwd: 1.3, by: -.14, bp: -.12, nk: -.55, hp: -.75, tl: .3 }], [.72, { fwd: .9, nk: -.2, hp: .1 }]],
      [700, .55, [.25, { fwd: -.3, by: -.18, nk: -.2, hp: -.3, tl: .2 }], [.45, { fwd: .8, up: .25, pit: .08, lf: .5, nk: -.35, hp: -.5 }], [.55, { fwd: 1.25, pit: -.08, by: -.12, nk: -.55, hp: -.75 }],
        [.72, { fwd: .9, nk: -.25, hp: -.1 }]],
      [700, .52, [.22, { fwd: -.25, by: -.1, nk: -.2, ny: -.5, hy: -.3 }], [.52, { fwd: 1.25, by: -.12, bp: -.15, nk: -.5, hp: -.6, ny: .6, hy: .4, yaw: -.25, sr: -.1 }], [.7, { fwd: .9, ny: .2, nk: -.2 }]]],
    pounce: BI.pounce,
    stomp: [[700, .58, [.38, { fwd: .15, bp: .45, lf: 1, nk: .35, hp: .2, jw: .5, tl: -.2 }], [.58, { fwd: .7, bp: -.05, by: -.1, nk: -.1, jw: .2 }], [.75, { fwd: .55 }]],
      [720, .7, [.22, { fwd: .1, bp: .35, lf: .9, nk: .3, hp: .2, jw: .4 }], [.38, { fwd: .4, bp: -.05, by: -.06, nk: -.1 }], [.55, { fwd: .5, bp: .45, lf: 1, nk: .35, hp: .25, jw: .6, sr: .1 }],
        [.7, { fwd: .75, bp: -.1, by: -.1, nk: -.15, jw: .2 }], [.85, { fwd: .55 }]],
      [720, .62, [.15, { ar: -.5, nk: -.2, hp: -.2, by: -.05 }], [.28, { ar: .3, nk: -.25 }], [.4, { ar: -.5, nk: -.2 }], [.5, { fwd: .4, st: 1, bp: .25, nk: .25, hp: .15, jw: .4, sr: -.12 }],
        [.62, { fwd: .75, bp: -.1, by: -.1, nk: -.1, jw: .2 }], [.8, { fwd: .55 }]]],
    rear: [700, .55, [.4, { fwd: .1, bp: .7, lf: 1, nk: -.35, hp: .2, tl: -.3, jw: .5 }], [.55, { fwd: .8, bp: .1, nk: -.2, by: -.06 }], [.75, { fwd: .6 }]],
    tail: [[700, .55, [.28, { yaw: .45, sy: .4, tw: .8, nk: .1 }], [.55, { yaw: -2.4, fwd: .35, sy: -.5, tw: -1.4, ny: .4 }], [.8, { yaw: -1.2, fwd: .2, tw: -.3 }]],
      [700, .55, [.3, { yaw: .3, sy: .3, tw: .6, tl: .8, by: -.06, nk: .1 }], [.55, { yaw: -2, fwd: .3, sy: -.5, tw: -1.6, tl: -.2, ny: .4, sr: .15 }], [.8, { yaw: -1, fwd: .15, tw: -.4 }]]],
    neck: [700, .52, [.3, { fwd: -.1, ny: -1.2, nk: .2, hy: -.3 }], [.52, { fwd: .55, ny: 1.1, nk: -.5, hy: .4, hp: -.2 }], [.75, { fwd: .4, ny: .3 }]],
    club: [[680, .56, [.3, { yaw: .5, sy: .5, tw: 1.2, tl: .4, by: -.08 }], [.56, { yaw: -2.6, fwd: .3, sy: -.6, tw: -1.8, tl: .2 }], [.8, { yaw: -1.3, fwd: .15, tw: -.4 }]],
      [700, .55, [.32, { yaw: .3, sy: .6, tw: 1.6, tl: .9, by: -.1, sr: -.1 }], [.55, { yaw: -1.8, fwd: .3, sy: -.7, tw: -2.2, tl: -.1, sr: .2 }], [.8, { yaw: -.9, tw: -.6 }]]],
    roll: [720, .55, [.3, { fwd: -.1, by: -.15, sr: .35, tw: .5 }], [.55, { yaw: -2.2, fwd: .5, sr: -.4, tw: -1.6, tl: .3 }], [.8, { yaw: -1, fwd: .3, tw: -.3 }]],
    spin: [720, .6, [.25, { yaw: .3, by: -.08, tw: .5, tl: .3 }], [.6, { yaw: -3.6, fwd: .35, tw: -1.8, tl: .4 }], [1, { yaw: -2 * Math.PI }]],
    bite: [[620, .48, [.3, { fwd: -.15, nk: .35, hp: .3, jw: 1, by: -.06 }], [.48, { fwd: .95, nk: -.3, hp: -.25, jw: 0, by: -.1 }], [.7, { fwd: .75, sh: .8, jw: .1 }]],
      [600, .48, [.3, { fwd: -.1, ny: -.6, hy: -.3, hr: .4, jw: 1.1, sy: .3, by: -.05 }], [.48, { fwd: 1, ny: .4, hy: .25, hr: .4, jw: 0, sy: -.3, nk: -.2 }], [.7, { fwd: .75, ny: .15, jw: .15, sh: .5 }]], BITE2],
    claw: [640, .5, [.3, { bp: .3, lf: .6, ar: -1, nk: .2, jw: .6 }], [.5, { fwd: .85, bp: .1, lf: .4, ar: 1.2, jw: .8 }], [.72, { fwd: .6, ar: .3 }]],
    tusk: [[660, .52, [.3, { fwd: -.15, nk: .4, hp: .4, tr: .6, by: -.05 }], [.52, { fwd: 1, nk: -.4, hp: -.55, ny: .3, tr: -.4 }], [.72, { fwd: .7, nk: .2, hp: .3, tr: .3 }]],
      [660, .5, [.3, { fwd: -.15, nk: -.3, hp: -.4, by: -.1, tr: .8 }], [.5, { fwd: 1, nk: .3, hp: .5, bp: .2, lf: .3, tr: -.6, sr: .1 }], [.72, { fwd: .7, nk: .1, hp: .2 }]]],
    trunk: [660, .5, [.32, { fwd: 0, nk: .3, hp: .4, tr: 1.6, jw: .4 }], [.5, { fwd: .75, nk: -.1, hp: -.2, tr: -1.2 }], [.72, { fwd: .55, tr: .4 }]],
  };
  QU.croll = [760, .5, [.3, { fwd: .9, jw: 1, nk: -.1 }], [.42, { fwd: .9, jw: 0 }], [.75, { fwd: .7, sr: Math.PI * .9, tw: 1 }], [1, { fwd: 0, sr: 0 }]];
  // reakcje (wspólne): trafienie, unik, nokaut — klucz 1 nokautu zostaje (leży)
  const REACT = {
    hit: [[0, 0, [.18, { nk: .4, hp: .5, hy: .25, jw: .7, by: -.08, bp: .15, sr: .12, tl: .45, sy: .3, bl: .8, ar: -.4 }]],
      [0, 0, [.18, { nk: -.3, hp: -.4, ny: .4, hy: .3, jw: .6, by: -.1, sr: -.15, bl: .8, sy: -.3, tl: .3, ax: .4 }]]],
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
