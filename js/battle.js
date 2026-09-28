/* ================= ARENA – silnik walki (bez DOM) =================
   Statystyki bazowe z gier (js/species.js) + prawdziwa tabela typów (CHART): Wodny ×2 na Ognistego itd.
   Strojenie: node tmp/sim.js */
const TUNE = {
  hp: [50, 1.2],         // hp  = a + b·bazowe HP
  dmg: [7, .26, .11], roll: [.7, .45],   // obrażenia = a + b·atak − c·obrona, potem × typ × losowo [od, +zakres]
  immune: .25,           // „nie działa” (×0) → prawie nie działa, inaczej Gastly i Rattata nie mogą się trafić
  dodge: [.04, .002, .04, .03, .25],  // unik = a + b·(przewaga szybkości) + c·latający, w granicach [d, e]
  crit: [.08, 1.5], arena: 1.2, special: .2,   // cios krytyczny: szansa, mnożnik; premia terenu; jak często automat używa ruchu specjalnego
};
const ROUNDS = 8;
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// typ → [nazwa, ikona, kolor, ruch specjalny]
const TYPES = {
  normal: ['Normalny', '⚪', '#A8A77A', 'Ciało-cios'], fire: ['Ognisty', '🔥', '#EE8130', 'Miotacz ognia'],
  water: ['Wodny', '💧', '#6390F0', 'Wodna armata'], grass: ['Trawiasty', '🌿', '#7AC74C', 'Liściaste ostrze'],
  electric: ['Elektryczny', '⚡', '#F7D02C', 'Piorun'], ice: ['Lodowy', '❄️', '#96D9D6', 'Lodowy promień'],
  fighting: ['Walczący', '🥊', '#C22E28', 'Karate-cios'], poison: ['Trujący', '☠️', '#A33EA1', 'Trujące żądło'],
  ground: ['Ziemny', '🏜️', '#E2BF65', 'Trzęsienie ziemi'], flying: ['Latający', '🪽', '#A98FF3', 'Powietrzne cięcie'],
  psychic: ['Psychiczny', '🔮', '#F95587', 'Psychopromień'], bug: ['Robaczy', '🐛', '#A6B91A', 'Rój żądeł'],
  rock: ['Kamienny', '🪨', '#B6A136', 'Lawina kamieni'], ghost: ['Duch', '👻', '#735797', 'Kula cienia'],
  dragon: ['Smoczy', '🐉', '#6F35FC', 'Smoczy gniew'], dark: ['Mroczny', '🌑', '#705746', 'Chrupnięcie'],
  steel: ['Stalowy', '⚙️', '#B7B7CE', 'Stalowy ogon'], fairy: ['Wróżkowy', '🧚', '#D685AD', 'Blask księżyca'],
};
// klucze jak THEMES w arena3d.js; types: kto dostaje premię ×TUNE.arena
const ARENAS = {
  plains: { name: 'Wielka łąka', icon: '🌾', types: ['normal', 'electric', 'psychic'] },
  forest: { name: 'Las Viridian', icon: '🌲', types: ['grass', 'bug'] },
  swamp: { name: 'Trujące bagna', icon: '🪷', types: ['poison', 'ghost'] },
  coast: { name: 'Plaża', icon: '🏝️', types: ['water', 'flying'] },
  deep: { name: 'Głębiny', icon: '🌊', types: ['water', 'dragon'] },
  cliffs: { name: 'Góra Księżycowa', icon: '⛰️', types: ['rock', 'flying', 'fairy'] },
  desert: { name: 'Pustynia', icon: '🏜️', types: ['ground', 'fighting'] },
  volcano: { name: 'Wyspa Cynamonowa', icon: '🌋', types: ['fire', 'dragon'] },
  tundra: { name: 'Lodowe wyspy', icon: '❄️', types: ['ice', 'psychic'] },
};
for (const a of Object.values(ARENAS)) a.desc = `Premia dla: ${a.types.map(t => TYPES[t][1] + ' ' + TYPES[t][0]).join(', ')}.`;
// ruchy gracza w trybie „ty wybierasz”: pewniejszy cios, ryzykowny atak specjalny, obrona
const MOVES = {
  bite: { icon: '👊', label: 'Atak' },
  special: { icon: '⚡', label: 'Specjalny', mult: 1.5, miss: .35 },
  guard: { icon: '🛡️', label: 'Obrona', block: .5, heal: .08 },
};

/* ---------- statystyki ---------- */
const statsOf = s => ({ hp: Math.round(TUNE.hp[0] + TUNE.hp[1] * s.hp), attack: Math.max(s.atk, s.satk), defense: Math.round((s.def + s.sdef) / 2), speed: s.spd });
// mnożnik typu ataku t na obrońcę o typach def: Ognisty na Trawiasty/Robaczy = ×4
const typeMult = (t, def) => def.reduce((m, d) => m * ((CHART[t][d] ?? 1) || TUNE.immune), 1);
// najlepszy typ atakującego przeciw temu obrońcy
const bestType = (att, def) => att.types.reduce((a, b) => typeMult(b, def.types) > typeMult(a, def.types) ? b : a);

/* ---------- teren: losowy spośród pasujących do typów zawodników ---------- */
function pickArena(a, b, rnd = Math.random) {
  const types = [...a.s.types, ...b.s.types], fit = Object.values(ARENAS).filter(ar => ar.types.some(t => types.includes(t)));
  return fit.length ? fit[Math.floor(rnd() * fit.length)] : ARENAS.plains;
}

/* ---------- walka ---------- */
function fighter(s) {
  const st = statsOf(s);
  return { s, id: s.id, name: s.name, ...st, hp0: st.hp, guard: 0 };
}
function newBattle(sa, sb, rnd = Math.random) {
  const a = fighter(sa), b = fighter(sb);
  return { a, b, arena: pickArena(a, b, rnd), round: 1, events: [], winner: null, rnd };
}
function attack(B, att, def, move) {
  const rnd = B.rnd, K = TUNE, ev = { round: B.round, att: att.id, def: def.id, damage: 0, move };
  if (move === 'guard') {
    att.guard = MOVES.guard.block;
    const heal = Math.round(att.hp0 * MOVES.guard.heal);
    att.hp = Math.min(att.hp0, att.hp + heal);
    return { ...ev, heal, hpAtt: att.hp, text: `🛡️ ${att.name} broni się i odzyskuje ${heal} energii.` };
  }
  const t = bestType(att.s, def.s), [, icon, , moveName] = TYPES[t];
  if (move === 'special' && rnd() < MOVES.special.miss) return { ...ev, miss: true, text: `💨 ${att.name} próbuje: ${icon} ${moveName}… pudło!` };
  const dodge = clampN(K.dodge[0] + Math.max(0, def.speed - att.speed) * K.dodge[1] + (def.s.types.includes('flying') ? K.dodge[2] : 0), K.dodge[3], K.dodge[4]);
  if (move !== 'special' && rnd() < dodge) return { ...ev, dodge: true, hpDef: def.hp, text: `${def.name} wykonuje unik!` };
  const tm = typeMult(t, def.s.types), notes = [];
  let mult = (K.roll[0] + rnd() * K.roll[1]) * tm;
  if (move === 'special') { mult *= MOVES.special.mult; notes.push(`${icon} ${moveName}`); }
  if (B.arena.types.includes(t)) mult *= K.arena;
  if (rnd() < K.crit[0]) { mult *= K.crit[1]; notes.push('✨ cios krytyczny'); }
  if (tm >= 2) notes.push('💥 super skuteczny!'); else if (tm < 1) notes.push('😕 mało skuteczny');
  let dmg = Math.max(3, K.dmg[0] + att.attack * K.dmg[1] - def.defense * K.dmg[2]) * mult;
  if (def.guard) { dmg *= def.guard; def.guard = 0; notes.push('🛡️ obrona'); ev.guarded = true; }
  dmg = clampN(Math.round(dmg), 2, 90);
  def.hp = Math.max(0, def.hp - dmg);
  return { ...ev, damage: dmg, hpDef: def.hp, type: t, text: `${att.name}: ${notes.length ? notes.join(' + ') + ' — ' : ''}${dmg} obrażeń.` };
}
/* jedna runda; moveA = ruch gracza (tryb „ty wybierasz”) albo undefined (automat: czasem ruch specjalny) */
function playRound(B, moveA) {
  const { a, b, rnd } = B;
  const order = a.speed + rnd() * 18 >= b.speed + rnd() * 18 ? [a, b] : [b, a];
  const out = [];
  for (const att of order) {
    const def = att === a ? b : a;
    if (att.hp > 0 && def.hp > 0) out.push(attack(B, att, def, att === a && moveA || (rnd() < TUNE.special ? 'special' : 'bite')));
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

if (typeof module !== 'undefined') module.exports = { TUNE, TYPES, ARENAS, MOVES, statsOf, typeMult, bestType, newBattle, playRound, autoBattle };
