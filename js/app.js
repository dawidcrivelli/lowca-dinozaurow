/* ================= ŁOWCA POKÉMONÓW – logika aplikacji =================
   Dane: js/species.js · walka: js/battle.js · głosy: js/voices.js */
(function () {
'use strict';

/* ---------------- zapis ----------------
   caught: id → {t}   rec: id → {w, l}   removed: ukryte id */
const KEY = 'pokeTracker.v1';
const blank = () => ({ caught: {}, rec: {}, removed: [], settings: { sound: true, mode: 'auto' } });
const load = j => { const db = blank(); for (const k of Object.keys(db)) if (j?.[k]) db[k] = k === 'settings' ? { ...db[k], ...j[k] } : j[k]; return db; };
let DB = (() => { try { return load(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return blank(); } })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }

/* ---------------- wyszukiwanie: wielkość liter, znaki (Mr. Mime, Farfetch'd), literówki ---------------- */
const norm = s => String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1]));
    prev = cur;
  }
  return prev[b.length];
}
const keysOf = sp => sp._k || (sp._k = [norm(sp.name)]);
/* 0 = dokładnie, 1 = początek (min. połowa nazwy – „char” nic nie złapie), 2+ = literówka; Nidoran♀ i ♂ łapie ten sam wpis → wybór w podpowiedziach */
function search(q) {
  q = norm(q);
  if (q.length < 3) return [];
  const tol = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3, out = [];
  for (const sp of LIST) {
    const best = Math.min(...keysOf(sp).map(k => k === q ? 0 : k.startsWith(q) && q.length >= Math.max(4, k.length / 2) ? 1
      : (d => d <= tol ? 2 + d : 99)(lev(q, k))));
    if (best < 99) out.push({ sp, score: best });
  }
  return out.sort((a, b) => a.score - b.score || a.sp.id - b.sp.id);
}

/* ---------------- lista Pokémonów ---------------- */
let LIST = [];
const refreshList = () => { const rm = new Set(DB.removed); LIST = SPECIES.filter(s => !rm.has(s.id)); };
refreshList();
const byId = id => LIST.find(s => s.id === +id);
const isCaught = id => !!DB.caught[id];
// ghost = czarna sylwetka; small = pikselowy sprite z gier do siatki (lekki), inaczej duża grafika
const art = (sp, mode = 'color', small) => `<img src="${(small ? SPRITE_URL : ART_URL)(sp.id)}" crossorigin="anonymous" alt="" loading="lazy" draggable="false" class="${small ? 'px' : ''} ${mode}">`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const typeTag = t => `<span class="tag type" style="background:${TYPES[t][2]}">${TYPES[t][1]} ${TYPES[t][0]}</span>`;
const dexNo = sp => '#' + String(sp.id).padStart(3, '0');
const mass = kg => kg >= 1000 ? `${+(kg / 1000).toFixed(1)} t` : `${+kg.toFixed(1)} kg`;
const evolutions = sp => SPECIES.filter(s => s.from === sp.id);

/* ---------------- Poké Ball: rzadkość 1–4 → Poké / Great / Ultra / Master Ball ---------------- */
const BALLS = [['#D8262E'], ['#3B6FD8', '#D8262E'], ['#2A2A2A', '#FFCB05'], ['#7B3FB5', '#E85AA8']];   // [góra, ozdoby]
function drawBall(r, open) {
  const [top, deco] = BALLS[Math.max(0, Math.min(3, (r || 1) - 1))], O = 'stroke="#1F2A44" stroke-width="6"';
  const marks = !deco ? '' : r === 2 ? `<path d="M24 30 14 44M76 30 86 44" stroke="${deco}" stroke-width="8" stroke-linecap="round"/>`
    : r === 3 ? `<path d="M30 12v24M70 12v24" stroke="${deco}" stroke-width="9"/>` : `<circle cx="28" cy="34" r="7" fill="${deco}"/><circle cx="72" cy="34" r="7" fill="${deco}"/><text x="50" y="30" font-size="20" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">M</text>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="ball-svg">
    <g class="${open ? 'ball-top' : ''}"><path d="M4 50a46 46 0 0 1 92 0z" fill="${top}" ${O}/>${marks}</g>
    <g class="${open ? 'ball-bot' : ''}"><path d="M4 50a46 46 0 0 0 92 0z" fill="#fff" ${O}/></g>
    <circle cx="50" cy="50" r="12" fill="#fff" ${O}/><path d="M22 24c6-7 14-10 22-11" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".5"/>
  </svg>`;
}

/* ---------------- dźwięk (WebAudio, bez plików) ---------------- */
let AC = null;
function audio() {
  if (!DB.settings.sound) return null;
  if (AC === null) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC || null;
}
function tone(type, f0, f1, dur, vol, filter) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let n = o; if (filter) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filter, t0); o.connect(f); n = f; }
  n.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const blip = (f, d = .1) => tone('triangle', f, f, d, .13);
const cry = (sp, mode) => DB.settings.sound && voice(sp, mode);   // głos gatunku i odgłosy walki: js/voices.js
const fx = name => DB.settings.sound && sfx(name);
const thud = () => tone('sine', 140, 50, .18, .3);
function crack() {
  const ac = audio(); if (!ac) return;
  const len = 0.22, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf; f.type = 'highpass'; f.frequency.value = 900; g.gain.value = .35;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
}

/* ---------------- elementy ---------------- */
const $ = s => document.querySelector(s);
const el = Object.fromEntries(['q', 'huntForm', 'sugg', 'huntMsg', 'grid', 'emptyMsg', 'chips', 'onlyMissing', 'pcCount', 'pcRank', 'pcBall',
  'rockFill', 'rockMarks', 'brandBall', 'scene', 'sceneTarget', 'sceneBall', 'sceneFlash', 'sceneName', 'confetti', 'modal', 'modalBody',
  'modalClose', 'btnArena', 'btnEdit'].map(id => [id, document.getElementById(id)]));
el.pill = $('.search-pill'); el.main = $('main.wrap');
let filter = 'all', editing = false;

const RANKS = [[0, 'Początkujący'], [5, 'Trener'], [15, 'Tropiciel'], [30, 'Zdobywca odznak'], [60, 'Lider sali'], [100, 'Elitarna Czwórka'], [151, 'Mistrz Pokémon']];
const rankFor = n => RANKS.filter(([k]) => n >= k).pop()[1];

/* ================= SIATKA ================= */
function tileHTML(sp) {
  const got = isCaught(sp.id);
  return `<button class="tile ${got ? '' : 'ghost'}" data-id="${sp.id}">
    <span class="no">${dexNo(sp)}</span>
    <span class="rar">${'<i></i>'.repeat(sp.rarity)}</span>
    <span class="art">${art(sp, got ? 'color' : 'ghost', 'small')}</span>
    <span class="nm">${got ? esc(sp.name) : '???'}</span>
    <span class="grp" style="background:${TYPES[sp.types[0]][2]}"></span>
    <span class="del" data-del="${sp.id}" title="Usuń z listy">✕</span></button>`;
}
function renderGrid(freshId) {
  const list = LIST.filter(s => (filter === 'all' || s.types.includes(filter)) && !(el.onlyMissing.checked && isCaught(s.id)));
  el.grid.innerHTML = list.map(tileHTML).join('');
  el.emptyMsg.hidden = list.length > 0;
  const t = freshId && el.grid.querySelector(`[data-id="${CSS.escape(freshId)}"]`);
  if (t) { t.classList.add('fresh'); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function renderChips() {
  const n = (k, got) => LIST.filter(s => (k === 'all' || s.types.includes(k)) && (!got || isCaught(s.id))).length;
  const chip = (k, emo, label) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}"><span class="emo">${emo}</span> ${label}<b>${n(k, 1)}/${n(k)}</b></button>`;
  el.chips.innerHTML = chip('all', '⭐', 'Wszystkie') + Object.entries(TYPES).filter(([k]) => n(k)).map(([k, t]) => chip(k, t[1], t[0])).join('');
}
function renderProgress() {
  const total = LIST.length, n = LIST.filter(s => isCaught(s.id)).length, pct = total ? n / total : 0;
  el.pcCount.textContent = `${n}/${total}`;
  el.pcRank.textContent = rankFor(n);
  el.rockFill.style.width = `calc(${(pct * 100).toFixed(1)}% - 4px)`;
  el.pcBall.innerHTML = drawBall(Math.min(4, Math.floor(pct * 4) + 1));
  el.rockMarks.innerHTML = [.25, .5, .75, 1].map((m, i) =>
    `<i class="${pct >= m - 0.001 ? 'hit' : ''}" style="left:${m * 100}%">${drawBall(i + 1)}</i>`).join('');
}
function renderAll(freshId) { renderChips(); renderProgress(); renderGrid(freshId); }

el.grid.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del && editing) { e.stopPropagation(); return removeSpecies(del.dataset.del); }
  const sp = byId(e.target.closest('.tile')?.dataset.id); if (!sp) return;
  blip(isCaught(sp.id) ? 620 : 380, .07);
  openCard(sp);
});
el.chips.addEventListener('click', e => { const c = e.target.closest('[data-f]'); if (c) { filter = c.dataset.f; renderChips(); renderGrid(); } });
el.onlyMissing.addEventListener('change', () => renderGrid());

/* ================= ŁOWY ================= */
function showSugg() {
  const hits = search(el.q.value).slice(0, 6);
  el.sugg.hidden = !hits.length;
  el.sugg.innerHTML = hits.map(({ sp }) => `<button type="button" data-pick="${sp.id}">
    <span class="s-art">${art(sp, isCaught(sp.id) ? 'color' : 'ghost')}</span>
    <span>${esc(sp.name)} <span class="s-lat">${dexNo(sp)}</span></span>
    ${isCaught(sp.id) ? '<span class="s-got">✓ masz</span>' : ''}</button>`).join('');
}
let suggTimer;
el.q.addEventListener('input', () => { clearTimeout(suggTimer); suggTimer = setTimeout(showSugg, 90); });
el.q.addEventListener('focus', showSugg);
el.q.addEventListener('blur', () => setTimeout(() => { el.sugg.hidden = true; }, 160));
el.sugg.addEventListener('mousedown', e => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  e.preventDefault(); el.sugg.hidden = true; el.q.value = '';
  attempt(byId(b.dataset.pick));
});
el.huntForm.addEventListener('submit', e => {
  e.preventDefault(); el.sugg.hidden = true;
  const hit = search(el.q.value)[0];
  if (!hit) return fail(`Nie ma Pokémona „${el.q.value.trim()}”. Spróbuj jeszcze raz!`);
  el.q.value = '';
  attempt(hit.sp);
});
function say(html, cls = '') { el.huntMsg.innerHTML = html; el.huntMsg.className = 'hunt-msg ' + cls; }
function fail(text) {
  say(esc(text), 'bad');
  el.pill.classList.remove('shake'); void el.pill.offsetWidth; el.pill.classList.add('shake');
  tone('sawtooth', 160, 120, .18, .1);
}
function attempt(sp) {
  if (!sp) return;
  audio();
  if (isCaught(sp.id)) { say(`${esc(sp.name)} jest już w Twojej kolekcji!`, 'good'); return openCard(sp); }
  say('');
  runCatch(sp);
}

/* ================= ANIMACJA ŁAPANIA: rzut Poké Ballem, 3 kołysania, otwarcie, okrzyk ================= */
let busy = false;
function runCatch(sp) {
  if (busy) return; busy = true;
  Object.assign(el.scene, { hidden: false });
  el.sceneTarget.className = 'scene-target idle'; el.sceneTarget.innerHTML = art(sp, 'ghost');
  el.sceneName.className = 'scene-name'; el.sceneName.textContent = '';
  el.sceneFlash.className = 'scene-flash'; el.confetti.innerHTML = '';
  el.sceneBall.className = 'scene-ball'; el.sceneBall.innerHTML = drawBall(sp.rarity);
  const steps = [
    [120, () => { el.sceneBall.className = 'scene-ball throw'; blip(520); }], [640, () => blip(300, .08)],
    [760, () => { el.sceneBall.className = 'scene-ball wobble'; }], [900, () => blip(400, .07)], [1320, () => blip(430, .07)], [1740, () => blip(460, .07)],
    [2060, () => { crack(); el.sceneBall.innerHTML = drawBall(sp.rarity, 'open'); el.sceneBall.className = 'scene-ball gone'; el.sceneFlash.className = 'scene-flash on'; }],
    [2320, () => {
      el.sceneTarget.innerHTML = art(sp); el.sceneTarget.className = 'scene-target show';
      el.sceneName.textContent = sp.name; el.sceneName.className = 'scene-name show';
      cry(sp, 'call'); confettiBurst(sp);
      DB.caught[sp.id] = { t: Date.now() }; save();
    }],
    [3900, () => { el.scene.hidden = true; busy = false; renderAll(sp.id); say(`Złapany! <b>${esc(sp.name)}</b> dołącza do kolekcji.`, 'good'); openCard(sp); }],
  ];
  steps.forEach(([ms, fn]) => setTimeout(fn, ms));
}
function confettiBurst(sp) {
  const colors = ['#FFCB05', '#FFFFFF', '#D8262E', '#3B6FD8', ...sp.types.map(t => TYPES[t][2])].slice(0, 5);
  el.confetti.innerHTML = Array.from({ length: 46 }, (_, i) => {
    const a = i / 46 * Math.PI * 2 + Math.random(), d = 120 + Math.random() * 260;
    return `<i style="left:50%;top:48%;background:${colors[i % 5]};--dx:${(Math.cos(a) * d) | 0}px;--dy:${(Math.sin(a) * d + 140) | 0}px;--rot:${(Math.random() * 900 - 450) | 0}deg;animation-delay:${(Math.random() * .12).toFixed(2)}s"></i>`;
  }).join('');
  requestAnimationFrame(() => el.confetti.querySelectorAll('i').forEach(n => n.classList.add('go')));
}

/* ================= KARTY ================= */
function openModal(html, cls = '') { el.modalBody.innerHTML = html; el.modal.className = 'modal ' + cls; el.modal.hidden = false; }
function closeModal() { el.modal.hidden = true; stopBattle(); }
el.modalClose.addEventListener('click', closeModal);
el.modal.addEventListener('click', e => { if (e.target === el.modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const openCard = sp => openModal(isCaught(sp.id) ? caughtCard(sp) : hintCard(sp));

/* paski statystyk z ikonami – czytelne bez umiejętności czytania */
const STAT_ICONS = [['hp', '❤️', 'Życie', 250], ['attack', '👊', 'Atak', 160], ['defense', '🛡️', 'Obrona', 160], ['speed', '💨', 'Szybkość', 150]];
const statBars = st => `<div class="sbars">${STAT_ICONS.map(([k, ico, lbl, max]) =>
  `<div class="sbar" title="${lbl}"><span>${ico}</span><i><b style="width:${Math.round(100 * st[k] / max)}%"></b></i><em>${st[k]}</em></div>`).join('')}</div>`;
const record = id => DB.rec[id] || { w: 0, l: 0 };

function caughtCard(sp) {
  const st = statsOf(sp), r = record(sp.id), pre = byId(sp.from), next = evolutions(sp);
  const evo = [pre && `z ${esc(pre.name)}`, next.length && `w ${next.map(s => isCaught(s.id) ? esc(s.name) : '???').join(' / ')}`].filter(Boolean).join(' → ');
  return `
  <div class="m-hero"><div class="art">${art(sp)}</div></div>
  <div class="m-body">
    <h2>${esc(sp.name)}</h2><p class="m-lat">${dexNo(sp)} · ${esc(sp.kind || '')}</p>
    <div class="m-tags">
      ${sp.types.map(typeTag).join('')}
      ${sp.legend ? '<span class="tag light">⭐ Legendarny</span>' : ''}
      <span class="tag light">${'★'.repeat(sp.rarity)}${'☆'.repeat(4 - sp.rarity)}</span>
    </div>
    <div class="m-fact"><b>CZY WIESZ, ŻE…</b>${esc(sp.fact || '')}</div>
    <div class="m-stats">
      <div class="stat"><span>WAGA</span><b>${mass(sp.kg)}</b></div>
      <div class="stat"><span>WZROST</span><b>${sp.m} m</b></div>
      ${evo ? `<div class="stat wide"><span>EWOLUCJA</span><b class="small">${evo}</b></div>` : ''}
    </div>
    ${statBars(st)}
    <p class="traits"><span class="record">⚔️ ${r.w} wygranych · ${r.l} przegranych</span></p>
    <div class="m-actions">
      <button class="btn amber big" data-arena="${sp.id}">⚔️ Do areny</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
      ${editing ? `<button class="btn danger" data-release="${sp.id}">Wypuść</button>` : ''}
    </div>
  </div>`;
}
function hintCard(sp) {
  const size = sp.m >= 3 ? 'olbrzym' : sp.m >= 1.5 ? 'duży' : sp.m >= .7 ? 'średni' : 'mały';
  return `
  <div class="m-hero"><div class="art">${art(sp, 'ghost')}</div></div>
  <div class="m-body">
    <div class="m-hint">
      <p class="q">Kto to za Pokémon?</p><div class="lbl">PODPOWIEDŹ</div><p>${esc(sp.hint || '')}</p>
      <div class="hint-fields">${sp.types.map(typeTag).join('')}<span>${size} (${sp.m} m)</span><span>${'★'.repeat(sp.rarity)}</span></div>
      <p class="more">Wpisz jego imię w wyszukiwarce, żeby go złapać!</p>
    </div>
    <div class="m-actions">
      <button class="btn" data-letter="${sp.id}">Pokaż pierwszą literę</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
      ${editing ? `<button class="btn danger" data-del="${sp.id}">Usuń z listy</button>` : ''}
    </div>
  </div>`;
}
el.modalBody.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.close) closeModal();
  if (d.release) { delete DB.caught[d.release]; save(); closeModal(); renderAll(); }
  if (d.del) { closeModal(); removeSpecies(d.del); }
  if (d.arena) openArena(d.arena);
  if (d.letter) {
    const sp = byId(d.letter);
    b.outerHTML = `<span class="tag light letter">Zaczyna się na <b>${esc(sp.name[0])}</b>, ma ${sp.name.length} liter</span>`;
    el.q.value = sp.name[0]; blip(660);
  }
});

/* ================= ARENA =================
   Wybór zawodników obrazkami (młodszy nie musi czytać), tryb ▶️ oglądam / 👆 walczę. */
const A = { a: null, b: null, slot: 'a', B: null, timers: [], token: 0 };
/* widok areny: '3d' scena 3D (domyślny, jeśli jest WebGL) | '2d' same obrazki */
const view3d = () => window.Arena3D?.ok && DB.settings.view !== '2d';
function stopBattle() { A.timers.forEach(clearTimeout); A.timers = []; A.token++; window.Arena3D?.stop(); }
const later = (ms, fn) => { const t = A.token; A.timers.push(setTimeout(() => t === A.token && fn(), ms)); };
const roster = () => LIST.filter(s => isCaught(s.id));
const randomOther = id => { const p = roster().filter(s => s.id !== +id); return p[Math.floor(Math.random() * p.length)]; };

function openArena(preId) {
  stopBattle();
  if (roster().length < 2) return openModal(`<div class="m-body"><h2>⚔️ Arena</h2>
    <p class="m-lat">Najpierw złap co najmniej dwa Pokémony.</p>
    <div class="m-actions"><button class="btn ghost" data-close="1">Rozumiem</button></div></div>`);
  if (preId) { A.a = byId(preId); A.b = randomOther(preId); A.slot = 'b'; }
  if (!A.a || !isCaught(A.a.id)) { A.a = roster()[0]; A.slot = 'a'; }
  if (!A.b || !isCaught(A.b.id) || A.b === A.a) A.b = randomOther(A.a.id);
  renderSetup();
}
function slotHTML(k) {
  const sp = A[k];
  return `<button class="ar-slot ${A.slot === k ? 'active' : ''} side-${k}" data-slot="${k}">
    <span class="who">${k === 'a' ? '🙂 Ty' : '🎯 Rywal'}</span>
    <span class="art">${art(sp)}</span><span class="nm">${esc(sp.name)}</span>${statBars(statsOf(sp))}</button>`;
}
function renderSetup() {
  const mode = DB.settings.mode;
  openModal(`<div class="m-body arena">
    <div class="ar-slots">${slotHTML('a')}<div class="ar-vs">VS</div>${slotHTML('b')}</div>
    <div class="ar-bar">
      <div class="seg" role="group" aria-label="Tryb walki">
        <button class="${mode === 'auto' ? 'on' : ''}" data-mode="auto" title="Oglądam walkę">▶️<small>Oglądam</small></button>
        <button class="${mode === 'play' ? 'on' : ''}" data-mode="play" title="Sam wybieram ruchy">👆<small>Walczę</small></button>
      </div>
      ${window.Arena3D?.ok ? `<div class="seg" role="group" aria-label="Widok">${[['2d', '🖼️'], ['3d', '🧊']].map(([v, i]) =>
        `<button class="${view3d() === (v === '3d') ? 'on' : ''}" data-view="${v}">${i}<small>${v.toUpperCase()}</small></button>`).join('')}</div>` : ''}
      <button class="btn ghost icon" data-random="1" title="Losuj rywala">🎲</button>
      <button class="btn amber big" data-fight="1">⚔️ Walka!</button>
    </div>
    <div class="ar-pick">${roster().map(s => `<button data-pick="${s.id}" class="${s === A.a ? 'is-a' : s === A.b ? 'is-b' : ''}">
      <span class="art">${art(s, 'color', 'small')}</span><span class="nm">${esc(s.name)}</span></button>`).join('')}</div>
  </div>`, 'wide');
}
function onArenaClick(e) {
  const b = e.target.closest('button'); if (!b || !el.modalBody.querySelector('.arena')) return;
  const d = b.dataset;
  if (d.slot) { A.slot = d.slot; blip(500, .05); renderSetup(); }
  if (d.pick) {
    const sp = byId(d.pick), other = A.slot === 'a' ? 'b' : 'a';
    if (A[other] === sp) A[other] = A[A.slot];
    A[A.slot] = sp; A.slot = other; cry(sp, 'attack'); renderSetup();
  }
  if (d.random) { A.b = randomOther(A.a.id); cry(A.b, 'attack'); renderSetup(); }
  if (d.mode) { DB.settings.mode = d.mode; save(); renderSetup(); }
  if (d.view) { DB.settings.view = d.view; save(); renderSetup(); }
  if (d.fight || d.rematch) startFight();
  if (d.newfoe) { A.b = randomOther(A.a.id); startFight(); }
  if (d.change) renderSetup();
  if (d.move) playerMove(d.move);
}
el.modalBody.addEventListener('click', onArenaClick);

function fighterHTML(p, side) {
  return `<div class="fighter side-${side}" id="f-${side}">
    <div class="art">${art(p.s)}</div><div class="nm">${esc(p.name)}</div>
    <div class="hp"><i id="hp-${side}"></i></div><div class="hpn" id="hpn-${side}">${p.hp}/${p.hp0}</div>
    <span class="dmg" id="dmg-${side}"></span></div>`;
}
function startFight() {
  stopBattle(); audio();
  const B = A.B = newBattle(A.a, A.b), play = DB.settings.mode === 'play';
  openModal(`<div class="m-body arena">
    <div class="arena-banner">${B.arena.icon} ${esc(B.arena.name)}<small>${esc(B.arena.desc)}</small></div>
    <div class="fight-grid">${fighterHTML(B.a, 'a')}<div class="ar-vs">VS</div>${fighterHTML(B.b, 'b')}</div>
    <div class="moves" id="moves" hidden>${Object.entries(MOVES).map(([k, m]) => `<button class="move" data-move="${k}">${m.icon}<small>${m.label}</small></button>`).join('')}</div>
    <div class="battle-log" id="log"><div><strong>Runda 1.</strong> Walka się zaczyna!</div></div>
    <div class="battle-result" id="result" hidden></div>
  </div>`, 'wide');
  if (view3d()) Arena3D.start($('.fight-grid'), B);
  thud();
  play ? later(500, askMove) : later(500, autoStep);
}
function autoStep() { showEvents(playRound(A.B), () => A.B.winner ? finish() : autoStep()); }
function askMove() { $('#moves').hidden = false; }
function playerMove(move) {
  if (!A.B || A.B.winner) return;
  $('#moves').hidden = true;
  showEvents(playRound(A.B, move), () => A.B.winner ? finish() : askMove());
}
/* odtwarza zdarzenia rundy z animacją: wypad atakującego, wstrząs trafionego, pasek życia, liczba obrażeń */
function showEvents(evs, done) {
  const B = A.B, side = id => id === B.a.id ? 'a' : 'b';
  evs.forEach((ev, i) => later(i * 560, () => {
    window.Arena3D?.event(ev);
    if (ev.att) {
      const as = side(ev.att), ds = as === 'a' ? 'b' : 'a', f = $(`#f-${as}`), g = $(`#f-${ds}`), who = id => (id === B.a.id ? B.a : B.b).s;
      const wet = B.arena === ARENAS.deep;   // pod wodą: plusk i bąble zamiast uderzeń i świstu
      if (ev.move !== 'guard') cry(who(ev.att), 'attack');
      if (ev.hpDef === 0) later(250, () => cry(who(ev.def), 'ko'));
      f.classList.remove('attacking'); void f.offsetWidth; f.classList.add('attacking');
      if (ev.damage) { g.classList.remove('hit'); void g.offsetWidth; g.classList.add('hit'); later(150, () => fx(wet ? 'splash' : 'hit')); navigator.vibrate?.(18); }
      else if (ev.heal) blip(880, .08); else fx(wet ? 'bubble' : 'whoosh');
      const dmg = $(`#dmg-${ev.heal ? as : ds}`);
      dmg.textContent = ev.damage ? `−${ev.damage}` : ev.heal ? `+${ev.heal}` : ev.dodge ? 'unik!' : 'pudło';
      dmg.className = 'dmg show ' + (ev.heal ? 'heal' : ''); void dmg.offsetWidth;
      for (const p of [B.a, B.b]) {
        const s = side(p.id), pct = 100 * p.hp / p.hp0;
        Object.assign($(`#hp-${s}`).style, { width: pct + '%', backgroundPosition: `${pct}% 0` });
        $(`#hpn-${s}`).textContent = `${p.hp}/${p.hp0}`;
      }
    }
    const log = $('#log');
    log.insertAdjacentHTML('beforeend', `<div><strong>Runda ${ev.round}.</strong> ${esc(ev.text)}</div>`);
    log.scrollTop = log.scrollHeight;
  }));
  later(evs.length * 560 + 150, done);
}
function finish() {
  const { winner: w, a, b } = A.B, l = w === a ? b : a;
  (DB.rec[w.id] = record(w.id)).w++; (DB.rec[l.id] = record(l.id)).l++; save();
  $(`#f-${w === a ? 'a' : 'b'}`).classList.add('won'); window.Arena3D?.win(w.id);
  const r = $('#result');
  r.innerHTML = `<div class="winner">🏆 ${esc(w.name)}!</div>
    <small>${w === a ? '🙂 Wygrywasz!' : '🎯 Wygrywa rywal'} · zostało ${w.hp}/${w.hp0} ❤️ · bilans ${DB.rec[w.id].w}–${DB.rec[w.id].l}</small>
    <div class="m-actions center">
      <button class="btn amber big" data-rematch="1">🔁 Rewanż</button>
      <button class="btn" data-newfoe="1">🎲 Nowy rywal</button>
      <button class="btn ghost" data-change="1">🔄 Zmień</button>
    </div>`;
  r.hidden = false; r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  cry(w.s, 'call'); navigator.vibrate?.([35, 45, 70]);
}
el.btnArena.addEventListener('click', () => openArena());

/* ================= TRYB RODZICA =================
   Otwiera się przytrzymaniem przycisku przez 1 s – dzieci nie wejdą tam przypadkiem. */
const HOLD_MS = 1000;
let holdT;
el.btnEdit.addEventListener('pointerdown', () => { el.btnEdit.classList.add('holding'); holdT = setTimeout(toggleEdit, HOLD_MS); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.btnEdit.addEventListener(ev, () => { clearTimeout(holdT); el.btnEdit.classList.remove('holding'); }));
el.btnEdit.addEventListener('click', () => { if (!editing) say('Tryb rodzica: przytrzymaj ⚙️ przez sekundę.'); });
el.btnEdit.addEventListener('contextmenu', e => e.preventDefault());

function removeSpecies(id) {
  if (!confirm('Usunąć tego Pokémona z listy?')) return;
  DB.removed.push(+id); delete DB.caught[id]; save(); refreshList(); renderAll();
}
function download(obj, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
let editBar = null;
function toggleEdit() {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  el.btnEdit.classList.toggle('on', editing);
  if (!editing) { editBar?.remove(); editBar = null; return say(''); }
  blip(880, .15);
  editBar = document.createElement('section');
  editBar.className = 'edit-bar';
  editBar.innerHTML = `
    <h3>⚙️ Tryb rodzica</h3>
    <p>Usuń Pokémona z listy (✕ na kafelku) albo przenieś postęp na inne urządzenie przez plik.</p>
    <div class="eb-tools">
      <button class="btn ghost" data-eb="restore">Przywróć usunięte (${DB.removed.length})</button>
      <button class="btn ghost" data-eb="export">Zapisz do pliku</button>
      <button class="btn ghost" data-eb="import">Wczytaj z pliku</button>
      <button class="btn ghost" data-eb="sound">Dźwięk: ${DB.settings.sound ? 'wł.' : 'wył.'}</button>
      <button class="btn ghost" data-eb="all">Złap wszystkie (test)</button>
      <button class="btn danger" data-eb="reset">Wyzeruj postęp</button>
    </div>`;
  el.main.insertBefore(editBar, $('.filters'));
  editBar.addEventListener('click', e => {
    const b = e.target.closest('[data-eb]'); if (!b) return;
    const v = id => editBar.querySelector(id).value.trim();
    ({
      restore() { DB.removed = []; save(); refreshList(); renderAll(); b.textContent = 'Przywróć usunięte (0)'; },
      export() { download(DB, `lowca-pokemonow-${new Date().toISOString().slice(0, 10)}.json`); },
      import() {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
        inp.onchange = async () => {
          try {
            const db = load(JSON.parse(await inp.files[0].text()));
            if (!confirm(`Wczytać zapis? ${Object.keys(db.caught).length} złapanych Pokémonów. Obecny postęp zostanie zastąpiony.`)) return;
            DB = db; save(); refreshList(); renderAll();
          } catch (err) { alert('Nie udało się wczytać tego pliku.'); }
        };
        inp.click();
      },
      sound() { DB.settings.sound = !DB.settings.sound; save(); b.textContent = `Dźwięk: ${DB.settings.sound ? 'wł.' : 'wył.'}`; },
      all() { LIST.forEach(s => { DB.caught[s.id] = DB.caught[s.id] || { t: Date.now() }; }); save(); renderAll(); },
      reset() { if (confirm('Na pewno wyzerować cały postęp (złapane, usunięte, walki)?')) { DB = blank(); save(); refreshList(); renderAll(); } },
    })[b.dataset.eb]();
  });
}

/* ================= START ================= */
el.brandBall.innerHTML = drawBall(1);
renderAll();
if (!Object.keys(DB.caught).length) say('Zacznij od czegoś łatwego — spróbuj wpisać „Pikachu”.');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
