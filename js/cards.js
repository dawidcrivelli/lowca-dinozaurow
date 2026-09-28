/* ================= KARTY – uproszczona gra karciana (bez DOM) =================
   Zasady jak w Battle Academy, bez talii do dociągania:
   - drużyna: do 3 Pokémonów Podstawowych (Basic); pierwszy walczy (aktywny), reszta czeka na ławce
   - w swojej turze: 1× dołącz energię do aktywnego, 1× ewoluuj go (nie w turze, w której wszedł), 1× odwrót (zapłać energią),
     na koniec atak (koszt = liczba energii) — atak kończy turę
   - słabość ×2, odporność −30; „×” = obrażenia za każdego orła z 2 rzutów, „+” = orzeł dokłada drugie tyle
   - pokonany Pokémon daje 1 nagrodę (ex: 2); wygrywa, kto zbierze PRIZES albo pokona wszystkich
   Stan:  D = { me, cpu, who: 'me'|'cpu', n: nr tury, winner }   strona = { team: [{ sp, dmg, en, since }], prizes, did: {energy, evolve, retreat} } */
const PRIZES = 3, TEAM = 3;
const RESIST = 30, WEAK = 2, FLIPS = 2;
const ENERGY_ICON = { G: '🌿', R: '🔥', W: '💧', L: '⚡', P: '🔮', F: '👊', D: '🌑', M: '⚙️', C: '⚪', N: '🐉' };

const FIRST_EVOLVE_TURN = 3;   // nikt nie ewoluuje w swojej pierwszej turze (tury 1 i 2)
const cardsSide = team => ({ team: team.map(sp => ({ sp, dmg: 0, en: 0, since: FIRST_EVOLVE_TURN - 1 })), prizes: 0, did: {} });
const newDuel = (mine, theirs) => ({ me: cardsSide(mine), cpu: cardsSide(theirs), who: 'me', n: 1, winner: null });
const foe = (D, who = D.who) => D[who === 'me' ? 'cpu' : 'me'];
const active = (D, who = D.who) => D[who].team[0];
const canPay = (m, cost) => m.en >= cost.length;
// ewolucje aktywnego; have = czy gracz ma tego Pokémona (CPU: wszystkie)
const evolutionsOf = (D, have = () => true) => {
  const m = active(D);
  return D[D.who].did.evolve || m.since >= D.n ? [] : SPECIES.filter(s => s.from === m.sp.id && have(s));
};

function attachEnergy(D) {
  const s = D[D.who]; if (s.did.energy) return null;
  s.did.energy = true; active(D).en++;
  return { text: `${ENERGY_ICON[active(D).sp.card.t]} ${active(D).sp.name} dostaje energię (${active(D).en}).` };
}
function evolve(D, to) {
  const m = active(D), from = m.sp;
  if (!evolutionsOf(D).includes(to)) return null;
  Object.assign(m, { sp: to, since: D.n }); D[D.who].did.evolve = true;
  return { evolve: true, text: `🧬 ${from.name} ewoluuje w ${to.name}!` };
}
function retreat(D, i) {
  const s = D[D.who], m = s.team[0], cost = m.sp.card.ret;
  if (s.did.retreat || !s.team[i] || m.en < cost) return null;
  m.en -= cost; [s.team[0], s.team[i]] = [s.team[i], s.team[0]]; s.did.retreat = true;
  return { text: `↩️ ${m.sp.name} wraca na ławkę, walczy ${s.team[0].sp.name}.` };
}
/* atak: obrażenia z karty × słabość − odporność; pokonany schodzi, atakujący bierze nagrody */
function cardAttack(D, k, rnd = Math.random) {
  const m = active(D), [name, cost, base, kind] = m.sp.card.atk[k] || [], def = foe(D), t = def.team[0];
  if (!name || !canPay(m, cost)) return null;
  const heads = kind ? Array.from({ length: FLIPS }, () => rnd() < .5).filter(Boolean).length : 0;
  let dmg = kind === '×' ? base * heads : kind === '+' ? base * (1 + Math.min(1, heads)) : base;
  const notes = kind ? [`🪙 ${heads}× orzeł`] : [];
  if (dmg && t.sp.card.weak === m.sp.card.t) { dmg *= WEAK; notes.push('💥 słabość ×2'); }
  if (dmg && t.sp.card.res === m.sp.card.t) { dmg = Math.max(0, dmg - RESIST); notes.push(`🛡️ odporność −${RESIST}`); }
  t.dmg += dmg;
  const ev = { attack: true, dmg, text: `${m.sp.name}: ${name}${notes.length ? ' (' + notes.join(', ') + ')' : ''} — ${dmg} obrażeń.` };
  if (t.dmg >= t.sp.card.hp) {
    const won = t.sp.card.ex ? 2 : 1;
    D[D.who].prizes += won; def.team.shift();
    ev.ko = t.sp; ev.text += ` ${t.sp.name} pokonany! +${won} 🎴`;
    if (D[D.who].prizes >= PRIZES || !def.team.length) D.winner = D.who;
    else ev.text += ` Wchodzi ${def.team[0].sp.name}.`;
  }
  return ev;
}
function endTurn(D) {
  if (D.winner) return;
  D.who = D.who === 'me' ? 'cpu' : 'me'; D[D.who].did = {}; D.n++;
}
/* tura komputera: ewolucja, energia, najmocniejszy atak, na który go stać → lista zdarzeń */
function cpuTurn(D, rnd = Math.random) {
  const evs = [], push = e => e && evs.push(e), evo = evolutionsOf(D);
  if (evo.length) push(evolve(D, evo[Math.floor(rnd() * evo.length)]));
  push(attachEnergy(D));
  const atk = active(D).sp.card.atk.map((a, k) => [a, k]).filter(([a]) => canPay(active(D), a[1])).sort((x, y) => y[0][2] - x[0][2])[0];
  if (atk) push(cardAttack(D, atk[1], rnd));
  endTurn(D);
  return evs;
}

if (typeof module !== 'undefined') module.exports = { PRIZES, TEAM, ENERGY_ICON, newDuel, active, foe, canPay, evolutionsOf, attachEnergy, evolve, retreat, cardAttack, endTurn, cpuTurn };
