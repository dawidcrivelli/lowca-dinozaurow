/* ================= ŁOWCA DINOZAURÓW – logika aplikacji =================
   Dane: js/species.js · rysunki: js/art.js · walka: js/battle.js */
(function () {
'use strict';

/* ---------------- zapis ----------------
   caught: id → {t}   rec: id → {w, l}   added: własne gatunki   removed: ukryte id
   Stare zapisy (Opus v1, ChatGPT) są przepisywane na nowe id przez legacy. */
const KEY = 'dinoTracker.v2', KEY_OPUS = 'dinoTracker.v1', KEY_GPT = 'prehistoric_catcher_v1';
const blank = () => ({ caught: {}, rec: {}, added: [], removed: [], settings: { sound: true, mode: 'auto' } });
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }

const LEGACY = {};
for (const s of SPECIES) for (const v of Object.values(s.legacy || {})) if (v) LEGACY[v] = s.id;
const mapId = id => SPECIES.some(s => s.id === id) ? id : LEGACY[id];
/* przyjmuje zapis dowolnej wersji: nowy, Opus ({caught, wins, added, removed}) lub ChatGPT ({state:{caught, battles}}) */
function migrate(j) {
  const src = (j && j.state) || j || {}, db = blank();
  for (const [id, v] of Object.entries(src.caught || {})) { const n = mapId(id); if (n) db.caught[n] = { t: v.t || Date.parse(v.caughtAt) || Date.now() }; }
  for (const [id, w] of Object.entries(src.wins || {})) { const n = mapId(id); if (n) db.rec[n] = { w, l: 0 }; }
  for (const [id, r] of Object.entries((src.battles && src.battles.records) || src.rec || {})) {
    const n = mapId(id); if (n) db.rec[n] = { w: r.wins ?? r.w ?? 0, l: r.losses ?? r.l ?? 0 };
  }
  db.removed = (src.removed || src.hidden || []).map(mapId).filter(Boolean);
  db.added = (src.added || []).filter(c => c.kg);
  Object.assign(db.settings, src.settings);
  return db;
}
let DB = read(KEY) ? migrate(read(KEY)) : migrate(read(KEY_OPUS) || read(KEY_GPT));
save();

/* ---------------- wyszukiwanie: polskie znaki, aliasy, literówki ---------------- */
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
const keysOf = sp => sp._k || (sp._k = [sp.name, sp.latin, ...(sp.aliases || [])].map(norm).filter(Boolean));
/* 0 = dokładnie, 1 = początek (min. połowa nazwy – „zaur” nic nie złapie), 2+ = literówka */
function search(q) {
  q = norm(q);
  if (q.length < 3) return [];
  const tol = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3, out = [];
  for (const sp of LIST) {
    const best = Math.min(...keysOf(sp).map(k => k === q ? 0 : k.startsWith(q) && q.length >= Math.max(4, k.length / 2) ? 1
      : (d => d <= tol ? 2 + d : 99)(lev(q, k))));
    if (best < 99) out.push({ sp, score: best });
  }
  return out.sort((a, b) => a.score - b.score || a.sp.name.localeCompare(b.sp.name, 'pl'));
}

/* ---------------- lista gatunków ---------------- */
let LIST = [];
const refreshList = () => { const rm = new Set(DB.removed); LIST = SPECIES.concat(DB.added).filter(s => !rm.has(s.id)); };
refreshList();
const byId = id => LIST.find(s => s.id === id);
const isCaught = id => !!DB.caught[id];
const art = (sp, mode = 'color') => sp.custom ? drawCustom(sp.arch, sp.opts, mode) : drawSpecies(sp.id, mode);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIETS = { M: 'Mięsożerca', R: 'Roślinożerca', W: 'Wszystkożerca', Ry: 'Rybożerca', P: 'Planktonożerca', O: 'Owadożerca' };
const EPOCHS = [[0.0117, 'Holocen'], [2.58, 'Plejstocen'], [5.33, 'Pliocen'], [23.03, 'Miocen'], [33.9, 'Oligocen'], [56, 'Eocen'], [66, 'Paleocen'],
  [100.5, 'Kreda późna'], [145, 'Kreda wczesna'], [161.5, 'Jura późna'], [174.7, 'Jura środkowa'], [201.4, 'Jura wczesna'], [237, 'Trias późny'],
  [247.2, 'Trias środkowy'], [251.9, 'Trias wczesny'], [298.9, 'Perm'], [358.9, 'Karbon'], [419.2, 'Dewon'], [443.8, 'Sylur'], [485.4, 'Ordowik'], [538.8, 'Kambr']];
const epoch = ma => (EPOCHS.find(([lo]) => ma < lo) || EPOCHS[EPOCHS.length - 1])[1];
const period = sp => sp.ma ? (epoch(sp.ma[0]) === epoch(sp.ma[1]) ? epoch(sp.ma[0]) : `${epoch(sp.ma[0])} – ${epoch(sp.ma[1])}`) : '';
const groupLabel = sp => (GROUPS[sp.group] || ['Własny zwierzak'])[0];
const mass = kg => kg >= 1000 ? `${+(kg / 1000).toFixed(kg < 10000 ? 1 : 0)} t` : kg >= 1 ? `${Math.round(kg)} kg` : `${Math.round(kg * 1000)} g`;

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
const cry = (sp, mode) => { const ac = audio(); if (ac) voice(ac, sp, mode); };   // głos gatunku: js/voices.js
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
const el = Object.fromEntries(['q', 'huntForm', 'sugg', 'huntMsg', 'grid', 'emptyMsg', 'chips', 'onlyMissing', 'pcCount', 'pcRank', 'pcEgg',
  'rockFill', 'rockMarks', 'brandEgg', 'scene', 'sceneTarget', 'sceneEgg', 'sceneFlash', 'sceneName', 'confetti', 'modal', 'modalBody',
  'modalClose', 'btnArena', 'btnEdit'].map(id => [id, document.getElementById(id)]));
el.pill = $('.search-pill'); el.main = $('main.wrap');
let filter = 'all', editing = false;

const RANKS = [[0, 'Praktykant'], [5, 'Poszukiwacz'], [15, 'Tropiciel'], [30, 'Paleontolog'], [60, 'Łowca kości'], [100, 'Mistrz wykopalisk'], [150, 'Legenda prehistorii']];
const rankFor = n => RANKS.filter(([k]) => n >= k).pop()[1];

/* ================= SIATKA ================= */
function tileHTML(sp) {
  const got = isCaught(sp.id);
  return `<button class="tile ${got ? '' : 'ghost'}" data-id="${sp.id}">
    <span class="no">${String(LIST.indexOf(sp) + 1).padStart(3, '0')}</span>
    <span class="rar">${'<i></i>'.repeat(sp.rarity)}</span>
    <span class="art">${art(sp, got ? 'color' : 'ghost')}</span>
    <span class="nm">${got ? esc(sp.name) : '???'}</span>
    <span class="grp cat-${sp.cat}"></span>
    <span class="del" data-del="${sp.id}" title="Usuń z listy">✕</span></button>`;
}
function renderGrid(freshId) {
  const list = LIST.filter(s => (filter === 'all' || s.cat === filter) && !(el.onlyMissing.checked && isCaught(s.id)));
  el.grid.innerHTML = list.map(tileHTML).join('');
  el.emptyMsg.hidden = list.length > 0;
  const t = freshId && el.grid.querySelector(`[data-id="${CSS.escape(freshId)}"]`);
  if (t) { t.classList.add('fresh'); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function renderChips() {
  const n = (k, got) => LIST.filter(s => (k === 'all' || s.cat === k) && (!got || isCaught(s.id))).length;
  const chip = (k, emo, label) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}"><span class="emo">${emo}</span> ${label}<b>${n(k, 1)}/${n(k)}</b></button>`;
  el.chips.innerHTML = chip('all', '⭐', 'Wszystkie') + Object.entries(CATS).filter(([k]) => n(k)).map(([k, c]) => chip(k, c.emo, c.label)).join('');
}
function renderProgress() {
  const total = LIST.length, n = LIST.filter(s => isCaught(s.id)).length, pct = total ? n / total : 0;
  el.pcCount.textContent = `${n}/${total}`;
  el.pcRank.textContent = rankFor(n);
  el.rockFill.style.width = `calc(${(pct * 100).toFixed(1)}% - 4px)`;
  el.pcEgg.innerHTML = drawEgg(Math.min(4, Math.floor(pct * 4) + 1), 'progress');
  el.rockMarks.innerHTML = [.25, .5, .75, 1].map((m, i) =>
    `<i class="${pct >= m - 0.001 ? 'hit' : ''}" style="left:${m * 100}%">${drawEgg(i + 1, 'mark' + i)}</i>`).join('');
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
    <span>${esc(sp.name)} <span class="s-lat">${esc(sp.latin)}</span></span>
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
  if (!hit) return fail(`Nie znam nikogo takiego jak „${el.q.value.trim()}”. Spróbuj jeszcze raz!`);
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

/* ================= ANIMACJA ŁAPANIA: rzut jajem, kołysanie, pęknięcie, ryk ================= */
let busy = false;
function runCatch(sp) {
  if (busy) return; busy = true;
  Object.assign(el.scene, { hidden: false });
  el.sceneTarget.className = 'scene-target idle'; el.sceneTarget.innerHTML = art(sp, 'ghost');
  el.sceneName.className = 'scene-name'; el.sceneName.textContent = '';
  el.sceneFlash.className = 'scene-flash'; el.confetti.innerHTML = '';
  el.sceneEgg.className = 'scene-egg'; el.sceneEgg.innerHTML = drawEgg(sp.rarity, sp.id);
  const steps = [
    [120, () => { el.sceneEgg.className = 'scene-egg throw'; blip(520); }], [640, () => blip(300, .08)],
    [760, () => { el.sceneEgg.className = 'scene-egg wobble'; }], [900, () => blip(400, .07)], [1320, () => blip(430, .07)], [1740, () => blip(460, .07)],
    [2060, () => { crack(); el.sceneEgg.innerHTML = drawEggCracked(sp.rarity, sp.id); el.sceneEgg.className = 'scene-egg gone'; el.sceneFlash.className = 'scene-flash on'; }],
    [2320, () => {
      el.sceneTarget.innerHTML = art(sp); el.sceneTarget.className = 'scene-target show';
      el.sceneName.textContent = sp.name; el.sceneName.className = 'scene-name show';
      cry(sp, 'call'); confettiBurst();
      DB.caught[sp.id] = { t: Date.now() }; save();
    }],
    [3900, () => { el.scene.hidden = true; busy = false; renderAll(sp.id); say(`Złapany! <b>${esc(sp.name)}</b> dołącza do kolekcji.`, 'good'); openCard(sp); }],
  ];
  steps.forEach(([ms, fn]) => setTimeout(fn, ms));
}
function confettiBurst() {
  const colors = ['#F5A524', '#FFF3D0', '#7FA86B', '#4E9C93', '#D2764A'];
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
const STAT_ICONS = [['hp', '❤️', 'Życie', 220], ['attack', '🦷', 'Atak', 99], ['defense', '🛡️', 'Obrona', 99], ['speed', '💨', 'Szybkość', 99]];
const statBars = st => `<div class="sbars">${STAT_ICONS.map(([k, ico, lbl, max]) =>
  `<div class="sbar" title="${lbl}"><span>${ico}</span><i><b style="width:${Math.round(100 * st[k] / max)}%"></b></i><em>${st[k]}</em></div>`).join('')}</div>`;
const record = id => DB.rec[id] || { w: 0, l: 0 };

function caughtCard(sp) {
  const st = statsOf(sp), r = record(sp.id), dino = (GROUPS[sp.group] || [])[1];
  const size = [sp.len && `${sp.len} m długości`, sp.wing && `${sp.wing} m rozpiętości skrzydeł`, sp.h && `${sp.h} m wysokości`].filter(Boolean).join(' · ');
  return `
  <div class="m-hero"><div class="art">${art(sp)}</div></div>
  <div class="m-body">
    <h2>${esc(sp.name)}</h2><p class="m-lat">${esc(sp.latin || '')}</p>
    <div class="m-tags">
      <span class="tag cat-${sp.cat}">${esc(groupLabel(sp))}</span>
      ${dino === false ? '<span class="tag light">NIE dinozaur</span>' : ''}
      <span class="tag light">${DIETS[sp.diet] || ''}</span>
      ${period(sp) ? `<span class="tag light">${period(sp)}</span>` : ''}
      <span class="tag light">${'★'.repeat(sp.rarity)}${'☆'.repeat(4 - sp.rarity)}</span>
    </div>
    <div class="m-fact"><b>CZY WIESZ, ŻE…</b>${esc(sp.fact)}</div>
    <div class="m-stats">
      <div class="stat"><span>WAGA</span><b>${mass(sp.kg)}</b></div>
      <div class="stat"><span>WIELKOŚĆ</span><b class="small">${size || '?'}</b></div>
      ${sp.weaponsTxt ? `<div class="stat wide"><span>BROŃ</span><b class="small">${esc(sp.weaponsTxt)}</b></div>` : ''}
    </div>
    ${statBars(st)}
    <p class="traits">${traitsOf(st, sp).join(' · ')} <span class="record">⚔️ ${r.w} wygranych · ${r.l} przegranych</span></p>
    <div class="m-actions">
      <button class="btn amber big" data-arena="${sp.id}">⚔️ Do areny</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
      ${editing ? `<button class="btn danger" data-release="${sp.id}">Uwolnij</button>` : ''}
    </div>
  </div>`;
}
function hintCard(sp) {
  const size = sp.kg >= 10000 ? 'olbrzym' : sp.kg >= 1000 ? 'duży' : sp.kg >= 30 ? 'średni' : 'mały';
  return `
  <div class="m-hero"><div class="art">${art(sp, 'ghost')}</div></div>
  <div class="m-body">
    <div class="m-hint">
      <p class="q">? ? ?</p><div class="lbl">PODPOWIEDŹ</div><p>${esc(sp.hint)}</p>
      <div class="hint-fields"><span>${CATS[sp.cat]?.emo || ''} ${esc(groupLabel(sp))}</span><span>${DIETS[sp.diet] || ''}</span>
        <span>${size}${sp.len ? ` (${sp.len} m)` : ''}</span><span>${'★'.repeat(sp.rarity)}</span></div>
      <p class="more">Wpisz jego nazwę w wyszukiwarce, żeby go złapać!</p>
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
function stopBattle() { A.timers.forEach(clearTimeout); A.timers = []; A.token++; window.Arena3D?.stop(); }
const later = (ms, fn) => { const t = A.token; A.timers.push(setTimeout(() => t === A.token && fn(), ms)); };
const roster = () => LIST.filter(s => isCaught(s.id));
const randomOther = id => { const p = roster().filter(s => s.id !== id); return p[Math.floor(Math.random() * p.length)]; };

function openArena(preId) {
  stopBattle();
  if (roster().length < 2) return openModal(`<div class="m-body"><h2>⚔️ Arena</h2>
    <p class="m-lat">Najpierw złap co najmniej dwa zwierzaki.</p>
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
        `<button class="${(DB.settings.view || '2d') === v ? 'on' : ''}" data-view="${v}">${i}<small>${v.toUpperCase()}</small></button>`).join('')}</div>` : ''}
      <button class="btn ghost icon" data-random="1" title="Losuj rywala">🎲</button>
      <button class="btn amber big" data-fight="1">⚔️ Walka!</button>
    </div>
    <div class="ar-pick">${roster().map(s => `<button data-pick="${s.id}" class="${s === A.a ? 'is-a' : s === A.b ? 'is-b' : ''}">
      <span class="art">${art(s)}</span><span class="nm">${esc(s.name)}</span></button>`).join('')}</div>
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
  if (DB.settings.view === '3d' && window.Arena3D?.ok) Arena3D.start($('.fight-grid'), B);
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
      if (ev.move !== 'guard') cry(who(ev.att), 'attack');
      if (ev.hpDef === 0) later(250, () => cry(who(ev.def), 'ko'));
      f.classList.remove('attacking'); void f.offsetWidth; f.classList.add('attacking');
      if (ev.damage) { g.classList.remove('hit'); void g.offsetWidth; g.classList.add('hit'); tone('square', 220, 90, .15, .12); navigator.vibrate?.(18); }
      else blip(ev.heal ? 880 : 760, .08);
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
  if (!confirm('Usunąć ten gatunek z listy?')) return;
  DB.removed.push(id); delete DB.caught[id]; save(); refreshList(); renderAll();
}
/* własny zwierzak: archetyp rysunku → ciało do walki, ruch, dieta, broń */
const ARCH_BODY = {
  thero: ['theropod', 'biped', 'M', { bite: 2 }], raptor: ['smalltheropod', 'biped', 'M', { claw: 2, bite: 1 }], ornimim: ['smalltheropod', 'biped', 'W', {}],
  tbird: ['theropod', 'biped', 'M', { bite: 2 }], dragon: ['theropod', 'biped', 'M', { bite: 2, claw: 1 }], prosauro: ['sauropod', 'biped', 'R', { claw: 1 }],
  sauro: ['sauropod', 'quad', 'R', { tail: 1 }], cerat: ['ceratopsian', 'quad', 'R', { horn: 2 }], armor: ['ankylosaur', 'quad', 'R', { tail: 2, armor: 3 }],
  stego: ['stegosaur', 'quad', 'R', { tail: 2, armor: 1 }], hadro: ['hadrosaur', 'quad', 'R', {}], orni: ['hadrosaur', 'biped', 'R', {}],
  dome: ['pachy', 'biped', 'R', { ram: 2 }], ptero: ['pterosaur', 'fly', 'Ry', { bite: 1 }], bird: ['pterosaur', 'fly', 'W', { claw: 1 }],
  plesio: ['marine-long', 'swim', 'Ry', { bite: 1 }], mosa: ['marine', 'swim', 'M', { bite: 2 }], ichthyo: ['marine', 'swim', 'Ry', { bite: 1 }],
  shark: ['marine', 'swim', 'M', { bite: 3 }], whale: ['marine', 'swim', 'M', { bite: 2 }], fish: ['fish', 'swim', 'M', { bite: 1 }],
  croc: ['croc', 'amphib', 'M', { bite: 2, armor: 1 }], lizard: ['reptile', 'quad', 'M', { bite: 1 }], snake: ['reptile', 'crawl', 'M', { squeeze: 2 }],
  turtle: ['turtle', 'swim', 'W', { armor: 3 }], sail: ['synapsid', 'quad', 'M', { bite: 1 }], synap: ['synapsid', 'quad', 'M', { bite: 1 }],
  amphib: ['reptile', 'amphib', 'M', { bite: 1 }], bug: ['bug', 'crawl', 'W', {}], ammo: ['bug', 'swim', 'M', {}], scorp: ['bug', 'swim', 'M', { claw: 2 }],
  mammal: ['mammal', 'quad', 'M', { bite: 2 }], cat: ['mammal', 'quad', 'M', { bite: 2, claw: 1 }], ele: ['mammal', 'quad', 'R', { horn: 2 }],
  sloth: ['mammal', 'quad', 'R', { claw: 2 }],
};
const SIZES = [['Mały jak kura', 3], ['Jak człowiek', 80], ['Jak słoń', 5000], ['Olbrzym', 30000]];
function addSpecies(name, latin, arch, cat, kg) {
  const [body, loco, diet, weapons] = ARCH_BODY[arch] || ['reptile', 'quad', 'W', {}];
  const sp = { id: 'own-' + norm(name) + '-' + Date.now().toString(36), name, latin, arch, opts: { p: Math.floor(Math.random() * PAL.length) }, cat, group: 'own', body, loco, diet, weapons, kg: +kg,
    kmh: 20, social: 'solo', rarity: 2, custom: true, hint: 'Ten zwierzak został dodany przez rodzica', fact: 'Dopisaliście go sami — wymyślcie o nim własną ciekawostkę!' };
  DB.added.push(sp); save(); refreshList(); renderAll();
  return sp;
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
    <p>Dodaj brakującego ulubieńca albo usuń gatunek z listy (✕ na kafelku). Zapis z wersji ChatGPT wczytasz przyciskiem „Wczytaj z pliku”.</p>
    <div class="eb-row">
      <input id="ebName" placeholder="Nazwa po polsku, np. Ultrazaur"><input id="ebLat" placeholder="Nazwa łacińska (opcjonalnie)">
    </div>
    <div class="eb-row">
      <select id="ebArch">${ARCH_LIST.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="ebCat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.emo} ${c.label}</option>`).join('')}</select>
      <select id="ebKg">${SIZES.map(([l, kg]) => `<option value="${kg}">${l}</option>`).join('')}</select>
      <button class="btn amber" data-eb="add">Dodaj</button>
    </div>
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
      add() {
        if (v('#ebName').length < 2) return alert('Wpisz nazwę zwierzaka.');
        openCard(addSpecies(v('#ebName'), v('#ebLat'), v('#ebArch'), v('#ebCat'), v('#ebKg')));
        editBar.querySelector('#ebName').value = editBar.querySelector('#ebLat').value = '';
      },
      restore() { DB.removed = []; save(); refreshList(); renderAll(); b.textContent = 'Przywróć usunięte (0)'; },
      export() { download(DB, `lowca-dinozaurow-${new Date().toISOString().slice(0, 10)}.json`); },
      import() {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
        inp.onchange = async () => {
          try {
            const db = migrate(JSON.parse(await inp.files[0].text()));
            if (!confirm(`Wczytać zapis? ${Object.keys(db.caught).length} złapanych zwierząt. Obecny postęp zostanie zastąpiony.`)) return;
            DB = db; save(); refreshList(); renderAll();
          } catch (err) { alert('Nie udało się wczytać tego pliku.'); }
        };
        inp.click();
      },
      sound() { DB.settings.sound = !DB.settings.sound; save(); b.textContent = `Dźwięk: ${DB.settings.sound ? 'wł.' : 'wył.'}`; },
      all() { LIST.forEach(s => { DB.caught[s.id] = DB.caught[s.id] || { t: Date.now() }; }); save(); renderAll(); },
      reset() { if (confirm('Na pewno wyzerować cały postęp (złapane, dodane, usunięte, walki)?')) { DB = blank(); save(); refreshList(); renderAll(); } },
    })[b.dataset.eb]();
  });
}

/* ================= START ================= */
el.brandEgg.innerHTML = drawEgg(3, 'brand');
renderAll();
if (!Object.keys(DB.caught).length) say('Zacznij od czegoś łatwego — spróbuj wpisać „tyranozaur”.');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
