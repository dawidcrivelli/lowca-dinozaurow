/* ================= ARENA – silnik walki (bez DOM) =================
   Statystyki liczone z prawdziwych danych (masa, broń, pancerz, prędkość),
   silnik rund z wersji ChatGPT. Strojenie: node tmp/sim.js
   m = log-masa w skali 0..1 (10 g → 0, 100 t → 1): 70-tonowy zauropod nie jest 10 000× silniejszy od raptora. */
const TUNE = {
  logMassMin: -2, logMassSpan: 7,
  hp: [60, 160, 2.2],                        // hp  = a + b·m^c
  atk: [10, 70, 7, 0.25, 1.5],               // atk = a + b·m^e + c·W,  W = najlepsza broń + d·Σ pozostałych
  wt: { bite: 1, claw: 0.8, squeeze: 0.9, horn: 0.8, tail: 0.8, ram: 0.7 },
  atkDiet: { M: 10, Ry: 5, W: 1, P: -20 },   // łowcy umieją walczyć, filtratorzy nie
  def: [14, 40, 8],                          // def = a + b·m + c·pancerz
  spd: [18, 0.75, 16], spdFly: 5,            // spd = a + b·km/h + c·(1-m)   (mały = zwinny)
  evade: [0.14, 0.04],                       // unik = a·(1-m)² + b·lotnik
  pack: { pack: 0.45, 'pack?': 0.25 },       // tylko mięsożercy
  fortressKg: 20000,
  sizeKg: [30, 500, 5000, 25000],            // progi klas rozmiaru 1..5
};
// ulubieńcy: statystyki wpisane ręcznie, nadpisują wyliczone (reszta pól bez zmian)
const STARS = {
  'albertosaurus-sarcophagus': { tag: '⭐ Dinozaur Alberta', hp: 160, attack: 86, speed: 60, evade: .07 }, // zwinny jak raptor, gryzie jak T. rex
};
const ROUNDS = 8;
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const ARENAS = {
  plains: { name: 'Wielka równina', icon: '🌾', desc: 'Dużo miejsca na szarże i rozpęd.' },
  forest: { name: 'Gęsty las', icon: '🌲', desc: 'Mniejsze i szybsze zwierzęta łatwiej się ukrywają.' },
  swamp: { name: 'Pradawne mokradła', icon: '🪷', desc: 'Krokodyle i ziemno-wodne drapieżniki czują się tu świetnie.' },
  coast: { name: 'Płytkie wybrzeże', icon: '🏝️', desc: 'Równe szanse dla zwierząt lądowych i wodnych.' },
  deep: { name: 'Głębokie morze', icon: '🌊', desc: 'Wodne drapieżniki mogą wykorzystać pełnię szybkości.' },
  cliffs: { name: 'Skaliste urwiska', icon: '⛰️', desc: 'Latające gady zyskują przestrzeń do pikowania.' },
  desert: { name: 'Gorąca pustynia', icon: '🏜️', desc: 'Upał męczy olbrzymy – małe i szybkie zwierzęta mają przewagę.' },
  volcano: { name: 'Wulkaniczna dolina', icon: '🌋', desc: 'Lecą kamienie! Pancerz chroni lepiej niż zwykle.' },
  tundra: { name: 'Mroźna tundra', icon: '❄️', desc: 'Zimno! Ssaki w grubym futrze czują się tu jak w domu.' },
};
const LAND = ['plains', 'forest', 'swamp', 'desert', 'volcano', 'tundra'];
// body → [nazwa, mnożnik, szansa]
const SPECIALS = {
  ankylosaur: ['🔨 Młot ogonowy', 1.30, .20], stegosaur: ['🦔 Kolczasty ogon', 1.27, .19], ceratopsian: ['📯 Szarża rogami', 1.25, .18],
  pachy: ['💥 Uderzenie kopułą', 1.24, .19], sauropod: ['🦶 Grzmiące tupnięcie', 1.22, .12], pterosaur: ['🪽 Atak z pikowania', 1.24, .20],
  marine: ['🌊 Atak z głębin', 1.25, .14], 'marine-long': ['🌊 Zamach płetwą', 1.18, .15], croc: ['🐊 Błyskawiczne ugryzienie', 1.25, .19],
  theropod: ['🦖 Potężne ugryzienie', 1.22, .16], smalltheropod: ['🗡️ Sierpowaty pazur', 1.22, .18], turtle: ['🐢 Taranująca skorupa', 1.18, .13],
  mammal: ['🐾 Szarża z pazurami', 1.22, .17], bug: ['🦂 Szczypce', 1.20, .15], fish: ['🐟 Błyskawiczny zwrot', 1.18, .14],
};
const SPECIAL_DEFAULT = ['⚡ Mocny cios', 1.17, .12];
// ruchy gracza w trybie „ty wybierasz”: pewniejszy cios, ryzykowny atak specjalny, obrona
const MOVES = {
  bite: { icon: '🦷', label: 'Atak' },
  special: { icon: '⚡', label: 'Specjalny', mult: 1.5, miss: .35 },
  guard: { icon: '🛡️', label: 'Obrona', block: .5, heal: .08 },
};

/* ---------- statystyki z prawdziwych danych ---------- */
function statsOf(s) {
  const K = TUNE, m = clampN((Math.log10(s.kg) - K.logMassMin) / K.logMassSpan, 0, 1);
  const { armor = 0, ...offense } = s.weapons || {};
  const vals = Object.entries(offense).map(([k, v]) => v * (K.wt[k] || 0.7)), top = Math.max(0, ...vals);
  const W = top + K.atk[3] * (vals.reduce((a, b) => a + b, 0) - top);
  const flier = s.loco === 'fly', carn = s.diet === 'M' || s.diet === 'Ry';
  return {
    hp: clampN(Math.round(K.hp[0] + K.hp[1] * m ** K.hp[2]), 72, 220),
    attack: clampN(Math.round(K.atk[0] + K.atk[1] * m ** K.atk[4] + K.atk[2] * W + (K.atkDiet[s.diet] || 0)), 24, 99),
    defense: clampN(Math.round(K.def[0] + K.def[1] * m + K.def[2] * armor), 24, 99),
    speed: clampN(Math.round(K.spd[0] + K.spd[1] * (s.kmh || 10) + K.spd[2] * (1 - m) + (flier ? K.spdFly : 0)), 18, 99),
    evade: K.evade[0] * (1 - m) ** 2 + (flier ? K.evade[1] : 0),
    pack: carn ? K.pack[s.social] || 0 : 0,
    size: 1 + K.sizeKg.filter(t => s.kg >= t).length,
    armored: armor >= 2,
    fortress: s.kg >= K.fortressKg && s.diet === 'R' && s.loco === 'quad',
    ...STARS[s.id],
  };
}
function traitsOf(st, s) {
  const t = st.tag ? [st.tag] : [];
  if (st.pack) t.push(`🐾 Atak grupowy ${Math.round(st.pack * 100)}%`);
  if (st.fortress) t.push('🏔️ Żywa forteca');
  if (st.armored) t.push('🛡️ Pancerz');
  if (s.loco === 'fly') t.push('🌪️ Unik w locie');
  if (s.cat === 'marine') t.push('🌊 Premia w wodzie');
  return t;
}

/* ---------- teren ---------- */
function pickArena(a, b, rnd = Math.random) {
  const sea = [a, b].filter(p => p.s.cat === 'marine').length;
  if (sea === 2) return ARENAS.deep;
  if (sea === 1) return ARENAS.coast;
  if (a.s.loco === 'fly' || b.s.loco === 'fly') return ARENAS.cliffs;
  return ARENAS[LAND[Math.floor(rnd() * LAND.length)]];
}
function arenaMods(p, arena) {
  const m = { attack: 0, defense: 0, speed: 0, dodge: 0 }, body = p.s.body;
  if (arena === ARENAS.deep && p.s.cat === 'marine') { m.attack += 12; m.speed += 13; }
  // wybrzeże: bez premii dla wodnych – inaczej Mozazaur wygrywał z każdym zwierzęciem lądowym
  if (arena === ARENAS.cliffs && p.s.loco === 'fly') { m.speed += 13; m.dodge += .09; m.attack += 4; }
  if (arena === ARENAS.forest) { if (p.size <= 2) { m.speed += 7; m.dodge += .05; } else if (p.size >= 5) m.speed -= 5; }
  if (arena === ARENAS.plains) { if (body === 'sauropod') m.defense += 8; if (/theropod/.test(body)) m.speed += 4; }
  if (arena === ARENAS.swamp && (body === 'croc' || body === 'synapsid')) { m.attack += 9; m.defense += 7; }
  if (arena === ARENAS.desert) { if (p.size <= 2) m.speed += 6; else if (p.size >= 5) m.speed -= 6; }
  if (arena === ARENAS.volcano && p.armored) m.defense += 8;
  if (arena === ARENAS.tundra && p.s.cat === 'mammal') { m.attack += 5; m.defense += 6; }
  return m;
}

/* ---------- walka ---------- */
/* ---------- styl ataku (pokaz: animacja rigów, efekty, dziennik) ----------
   wg presetu rysunku (ART w artspec.js) albo gatunku (SIG); ostatni w liście = popisowy, gdy cios jest specjalny.
   Zwykłe ciosy z „worka”: losowo bez powtórzeń, dopóki worek się nie opróżni. */
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
// styl → [ikona, czasownik w dzienniku]
const VERB = { bite: ['🦷', 'gryzie'], crush: ['🦷', 'miażdży szczękami'], shake: ['🦷', 'chwyta i szarpie'], venom: ['🧪', 'kąsa jadem'],
  spit: ['🧪', 'pluje jadem'], fire: ['🔥', 'zieje ogniem'], claw: ['🐾', 'drapie'], slash: ['🗡️', 'tnie pazurem'], kick: ['🦶', 'kopie'],
  pounce: ['🐾', 'skacze na przeciwnika'], grab: ['✊', 'chwyta'], thumb: ['👍', 'dźga kolcem kciuka'], tail: ['🌀', 'uderza ogonem'],
  club: ['🔨', 'wali maczugą'], spin: ['🌀', 'obraca się z kolcami'], stomp: ['🦶', 'tupie'], rear: ['⬆️', 'staje dęba i spada'],
  trample: ['🦶', 'tratuje'], headbutt: ['💥', 'uderza głową'], gore: ['🦏', 'bodzie rogami'], charge: ['💨', 'szarżuje'],
  neck: ['🌀', 'smaga szyją'], roll: ['🌀', 'robi obrót'], coil: ['🐍', 'oplata i dusi'], shell: ['🐢', 'taranuje skorupą'],
  roar: ['📢', 'ryczy i atakuje'], flipper: ['🌊', 'bije płetwą'], ram: ['💨', 'taranuje'], peck: ['🐦', 'dziobie'], wing: ['🪽', 'bije skrzydłem'],
  dive: ['⬇️', 'pikuje'], sting: ['🦂', 'żądli'], pincer: ['🦀', 'szczypie'], tentacle: ['🐙', 'chwyta mackami'], tusk: ['🐘', 'wbija kły'], trunk: ['🐘', 'smaga trąbą'] };
const dmgWord = n => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'obrażenia' : 'obrażeń';   // 22 obrażenia, 25 obrażeń
const artKey = s => s.custom ? s.arch : (typeof ART !== 'undefined' ? ART : {})[s.id]?.[0];
function styleOf(p, sig, rnd) {
  const l = SIG[p.id] || STYLES[artKey(p.s)] || ['bite'], n = Math.max(1, l.length - 1);
  if (sig) return l[l.length - 1];
  if (!p.bag?.length) { const b = p.bag = l.slice(0, n).sort(() => rnd() - .5);
    if (b[b.length - 1] === p.last) b.unshift(b.pop()); }   // nowy worek nie zaczyna od ciosu, którym skończył się poprzedni
  return p.last = p.bag.pop();
}
function fighter(s) {
  const st = statsOf(s);
  return { s, id: s.id, name: s.name, ...st, hp0: st.hp, packReady: true, fortressReady: st.fortress, guard: 0 };
}
function newBattle(sa, sb, rnd = Math.random) {
  const a = fighter(sa), b = fighter(sb);
  return { a, b, arena: pickArena(a, b, rnd), round: 1, events: [], winner: null, rnd };
}
function special(p, arena) {
  const x = SPECIALS[p.s.body] || SPECIAL_DEFAULT;
  const chance = p.s.body === 'sauropod' && p.size >= 5 ? .20 : p.s.body === 'marine' && arena === ARENAS.deep ? .24 : x[2];
  return { name: x[0], mult: x[1], chance };
}
function attack(B, att, def, move) {
  const rnd = B.rnd, am = arenaMods(att, B.arena), dm = arenaMods(def, B.arena);
  const ev = { round: B.round, att: att.id, def: def.id, damage: 0, move };
  if (move === 'guard') {
    att.guard = MOVES.guard.block;
    const heal = Math.round(att.hp0 * MOVES.guard.heal);
    att.hp = Math.min(att.hp0, att.hp + heal);
    return { ...ev, heal, hpAtt: att.hp, text: `🛡️ ${att.name} broni się i odzyskuje ${heal} energii.` };
  }
  if (move === 'special' && rnd() < MOVES.special.miss) return { ...ev, miss: true, style: styleOf(att, true, rnd), text: `💨 ${att.name} próbuje ciosu specjalnego… pudło!` };
  const dodge = clampN(.035 + Math.max(0, (def.speed + dm.speed) - (att.speed + am.speed)) * .0015 + def.evade + dm.dodge, .025, .26);
  if (move !== 'special' && rnd() < dodge) return { ...ev, dodge: true, style: styleOf(att, false, rnd), hpDef: def.hp, text: `${def.name} wykonuje unik!` };
  let mult = .82 + rnd() * .38;
  const notes = [];
  if (att.packReady && rnd() < att.pack) { att.packReady = false; mult *= 1.34; notes.push('🐾 atak grupowy'); }
  const sp = special(att, B.arena), sig = move === 'special' || rnd() < sp.chance, style = styleOf(att, sig, rnd), [ico, verb] = VERB[style] || VERB.bite;
  if (sig) { mult *= move === 'special' ? MOVES.special.mult : sp.mult; notes.push(sp.name); }
  if (rnd() < .105) { mult *= 1.48; notes.push('✨ cios krytyczny'); }
  let dmg = (14 + (att.attack + am.attack) * .34 - (def.defense + dm.defense) * .17) * mult;
  if (def.armored) { dmg *= .84; if (rnd() < .45) notes.push('🛡️ pancerz osłabił cios'); }
  if (def.fortressReady) { dmg *= .60; def.fortressReady = false; notes.push('🏔️ żywa forteca'); }
  if (def.guard) { dmg *= def.guard; def.guard = 0; notes.push('🛡️ obrona'); ev.guarded = true; }
  dmg = clampN(Math.round(dmg), 5, 58);
  def.hp = Math.max(0, def.hp - dmg);
  return { ...ev, style, damage: dmg, hpDef: def.hp, text: `${notes.length ? notes.join(' + ') + ' — ' : ''}${att.name} ${ico} ${verb}: ${dmg} ${dmgWord(dmg)}.` };
}
/* jedna runda; moveA = ruch gracza (tryb „ty wybierasz”) albo undefined (automat) */
function playRound(B, moveA) {
  const { a, b, rnd } = B, am = arenaMods(a, B.arena), bm = arenaMods(b, B.arena);
  // szybszy (z losem) zaczyna walkę, potem ciosy na zmianę — nikt nie atakuje dwa razy z rzędu na styku rund
  const first = B.last ? (B.last === a ? b : a) : a.speed + am.speed + rnd() * 18 >= b.speed + bm.speed + rnd() * 18 ? a : b, order = first === a ? [a, b] : [b, a];
  B.last = order[1];
  const out = [];
  for (const att of order) {
    const def = att === a ? b : a;
    if (att.hp > 0 && def.hp > 0) out.push(attack(B, att, def, att === a ? moveA : undefined));
  }
  B.round++;
  if (a.hp <= 0 || b.hp <= 0) B.winner = a.hp > 0 ? a : b;
  else if (B.round > ROUNDS) {
    const ar = a.hp / a.hp0, br = b.hp / b.hp0;
    B.winner = Math.abs(ar - br) < .001 ? (rnd() < .5 ? a : b) : ar > br ? a : b;
    out.push({ round: ROUNDS, timeout: true, text: `⏱️ Koniec czasu: ${B.winner.name} zachował więcej sił.` });
  }
  B.events.push(...out);
  return out;
}
function autoBattle(sa, sb, rnd) {
  const B = newBattle(sa, sb, rnd);
  while (!B.winner) playRound(B);
  return B;
}

if (typeof module !== 'undefined') module.exports = { TUNE, STARS, ARENAS, MOVES, statsOf, traitsOf, newBattle, playRound, autoBattle };
