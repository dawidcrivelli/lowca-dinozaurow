/* ================= ŁOWCA DINOZAURÓW – logika ================= */
(function () {
'use strict';

/* ---------------- pamięć ----------------
   localStorage, a jeśli niedostępny (np. artefakt) – window.storage lub pamięć w RAM. */
const Store = (function () {
  const KEY = 'dinoTracker.v1';
  let mem = null;
  function backend() {
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; }
    catch (e) { return (typeof window !== 'undefined' && window.storage) || null; }
  }
  const be = backend();
  return {
    load() {
      if (mem) return mem;
      let raw = null;
      try { raw = be && be.getItem(KEY); } catch (e) {}
      try { mem = raw ? JSON.parse(raw) : null; } catch (e) { mem = null; }
      if (!mem || typeof mem !== 'object') mem = {};
      mem.caught = mem.caught || {};   // id -> {t: timestamp, pal:[..]}
      mem.added = mem.added || [];     // własne gatunki (tryb rodzica)
      mem.removed = mem.removed || []; // ukryte gatunki
      mem.wins = mem.wins || {};       // id -> liczba zwycięstw w arenie
      return mem;
    },
    save() {
      try { be && be.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    },
    reset() { mem = null; try { be && be.removeItem(KEY); } catch (e) {} }
  };
})();

const DB = Store.load();

/* ---------------- normalizacja i wyszukiwanie ---------------- */
const PL_MAP = { 'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z' };
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[ąćęłńóśźż]/g, c => PL_MAP[c])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 9;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}
function keysOf(sp) {
  if (!sp._k) sp._k = [sp.pl, sp.lat, ...(sp.alias || [])].map(norm).filter(Boolean);
  return sp._k;
}
/* zwraca posortowaną listę trafień: 0 = dokładne, 1 = początek, 2 = zawiera, 3+ = literówka */
function search(qRaw, pool) {
  const q = norm(qRaw);
  if (q.length < 2) return [];
  const out = [];
  for (const sp of pool) {
    let best = 99;
    for (const k of keysOf(sp)) {
      if (k === q) { best = 0; break; }
      if (k.startsWith(q) && q.length >= 3) best = Math.min(best, 1);
      else if (k.includes(q) && q.length >= 4) best = Math.min(best, 2);
      else {
        const d = lev(q, k);
        const tol = q.length <= 5 ? 1 : (q.length <= 9 ? 2 : 3);
        if (d <= tol) best = Math.min(best, 2 + d);
      }
    }
    if (best < 99) out.push({ sp, score: best });
  }
  out.sort((a, b) => a.score - b.score || a.sp.pl.localeCompare(b.sp.pl, 'pl'));
  return out;
}

/* ---------------- lista gatunków (z uwzględnieniem edycji rodzica) ---------------- */
function customToSpecies(c) {
  return {
    id: c.id, pl: c.pl, lat: c.lat || '', a: c.a, o: c.o || {},
    h: c.h || 'Zwierzak dodany przez rodzica', f: c.f || 'Ten gatunek dodaliście sami — opowiedzcie o nim własną historię!',
    r: c.r || 2, t: c.t || 'zwinny', g: c.g || 'dino', d: c.d || 'R', sz: c.sz || 5,
    pw: c.pw || 6, alias: c.alias || [], custom: true
  };
}
function activeSpecies() {
  const removed = new Set(DB.removed);
  const base = SPECIES.filter(s => !removed.has(s.id));
  const extra = DB.added.filter(c => !removed.has(c.id)).map(customToSpecies);
  return base.concat(extra);
}
let LIST = activeSpecies();
function refreshList() { LIST = activeSpecies(); }
function byId(id) { return LIST.find(s => s.id === id); }

/* ---------------- stan złapania ---------------- */
function isCaught(id) { return !!DB.caught[id]; }
function palOf(sp) {
  const rec = DB.caught[sp.id];
  if (rec && Array.isArray(rec.pal) && rec.pal.length === 3) return rec.pal;
  return PAL[(sp.o && sp.o.p) || 0] || PAL[0];
}
function markCaught(sp) {
  DB.caught[sp.id] = { t: Date.now(), pal: palOf(sp) };
  Store.save();
}
function release(id) { delete DB.caught[id]; Store.save(); }

/* ---------------- dźwięk ---------------- */
let AC = null;
function audio() {
  if (AC === null) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC || null;
}
function roar(rarity) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime, dur = 0.85;
  const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
  o.type = 'sawtooth'; o2.type = 'square';
  const base = 150 - rarity * 18;
  o.frequency.setValueAtTime(base * 1.7, t0);
  o.frequency.exponentialRampToValueAtTime(base * .55, t0 + dur);
  o2.frequency.setValueAtTime(base * .85, t0);
  o2.frequency.exponentialRampToValueAtTime(base * .34, t0 + dur);
  f.type = 'lowpass'; f.frequency.setValueAtTime(1500, t0);
  f.frequency.exponentialRampToValueAtTime(320, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination);
  o.start(t0); o2.start(t0); o.stop(t0 + dur); o2.stop(t0 + dur);
}
function blip(freq, dur, type) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.12));
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + (dur || 0.12) + 0.02);
}
function crack() {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime, len = 0.22;
  const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = 0.35;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t0);
}

/* ---------------- elementy ---------------- */
const $ = s => document.querySelector(s);
const el = {
  q: $('#q'), form: $('#huntForm'), sugg: $('#sugg'), msg: $('#huntMsg'),
  pill: document.querySelector('.search-pill'),
  grid: $('#grid'), empty: $('#emptyMsg'), chips: $('#chips'), onlyMissing: $('#onlyMissing'),
  pcCount: $('#pcCount'), pcRank: $('#pcRank'), pcEgg: $('#pcEgg'),
  rockFill: $('#rockFill'), rockMarks: $('#rockMarks'), brandEgg: $('#brandEgg'),
  scene: $('#scene'), sceneTarget: $('#sceneTarget'), sceneEgg: $('#sceneEgg'),
  sceneFlash: $('#sceneFlash'), sceneName: $('#sceneName'), confetti: $('#confetti'),
  modal: $('#modal'), modalBody: $('#modalBody'), modalClose: $('#modalClose'),
  btnEdit: $('#btnEdit'), btnArena: $('#btnArena'), main: document.querySelector('main.wrap')
};

let filter = 'all';
let editing = false;

/* ---------------- rangi ---------------- */
const RANKS = [
  [0, 'Praktykant'], [5, 'Poszukiwacz'], [15, 'Tropiciel'], [30, 'Paleontolog'],
  [50, 'Łowca kości'], [75, 'Mistrz wykopalisk'], [100, 'Legenda mezozoiku']
];
function rankFor(n) { let r = RANKS[0][1]; for (const [k, v] of RANKS) if (n >= k) r = v; return r; }

/* ================= RENDER ================= */
function eggIcon(r, id) { return drawEgg(r, id); }

function tileHTML(sp, idx) {
  const got = isCaught(sp.id);
  const art = got ? drawSpecies(sp, 'full', palOf(sp)) : drawSpecies(sp, 'ghost');
  const dots = Array.from({ length: sp.r }, () => '<i></i>').join('');
  return `<button class="tile ${got ? '' : 'ghost'}" data-id="${sp.id}">
      <span class="no">${String(idx + 1).padStart(3, '0')}</span>
      <span class="rar">${dots}</span>
      <span class="art">${art}</span>
      <span class="nm">${got ? esc(sp.pl) : '???'}</span>
      <span class="grp" style="background:${GROUPS[sp.g].color}"></span>
      <span class="del" data-del="${sp.id}" title="Usuń z listy">✕</span>
    </button>`;
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function visible() {
  let out = LIST;
  if (filter !== 'all') out = out.filter(s => s.g === filter);
  if (el.onlyMissing.checked) out = out.filter(s => !isCaught(s.id));
  return out;
}
function renderGrid(freshId) {
  const list = visible();
  el.grid.innerHTML = list.map((s, i) => tileHTML(s, LIST.indexOf(s))).join('');
  el.empty.hidden = list.length > 0;
  if (freshId) {
    const t = el.grid.querySelector(`.tile[data-id="${CSS.escape(freshId)}"]`);
    if (t) { t.classList.add('fresh'); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
}
function renderChips() {
  const counts = { all: LIST.length };
  for (const k of Object.keys(GROUPS)) counts[k] = LIST.filter(s => s.g === k).length;
  const got = k => LIST.filter(s => (k === 'all' || s.g === k) && isCaught(s.id)).length;
  const mk = (k, label) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${label}<b>${got(k)}/${counts[k]}</b></button>`;
  el.chips.innerHTML = mk('all', 'Wszystkie') + Object.entries(GROUPS).map(([k, g]) => mk(k, g.label)).join('');
}
function renderProgress() {
  const total = LIST.length;
  const n = LIST.filter(s => isCaught(s.id)).length;
  el.pcCount.textContent = `${n}/${total}`;
  el.pcRank.textContent = rankFor(n);
  const pct = total ? n / total : 0;
  el.rockFill.style.width = `calc(${(pct * 100).toFixed(1)}% - 4px)`;
  el.pcEgg.innerHTML = drawEgg(Math.min(4, Math.floor(pct * 4) + 1), 'progress');
  const marks = [.25, .5, .75, 1];
  el.rockMarks.innerHTML = marks.map((m, i) =>
    `<i class="${pct >= m - 0.001 ? 'hit' : ''}" style="left:${m * 100}%">${drawEgg(i + 1, 'mark' + i)}</i>`).join('');
}
function renderAll(freshId) { renderChips(); renderProgress(); renderGrid(freshId); }

/* ================= WYSZUKIWANIE ================= */
let suggTimer = null;
el.q.addEventListener('input', () => {
  clearTimeout(suggTimer);
  suggTimer = setTimeout(showSugg, 90);
});
el.q.addEventListener('blur', () => setTimeout(() => { el.sugg.hidden = true; }, 160));
el.q.addEventListener('focus', showSugg);

function showSugg() {
  const hits = search(el.q.value, LIST).slice(0, 6);
  if (!hits.length) { el.sugg.hidden = true; return; }
  el.sugg.innerHTML = hits.map(({ sp }) => `
    <button type="button" data-pick="${sp.id}">
      <span>${esc(sp.pl)} <span class="s-lat">${esc(sp.lat)}</span></span>
      ${isCaught(sp.id) ? '<span class="s-got">✓ masz</span>' : ''}
    </button>`).join('');
  el.sugg.hidden = false;
}
el.sugg.addEventListener('mousedown', e => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  e.preventDefault();
  el.sugg.hidden = true;
  el.q.value = '';
  attempt(byId(b.dataset.pick));
});

el.form.addEventListener('submit', e => {
  e.preventDefault();
  el.sugg.hidden = true;
  const hits = search(el.q.value, LIST);
  if (!hits.length) {
    fail(`Nie znam nikogo takiego jak „${el.q.value.trim()}”. Spróbuj jeszcze raz!`);
    return;
  }
  el.q.value = '';
  attempt(hits[0].sp);
});

function fail(text) {
  el.msg.textContent = text;
  el.msg.className = 'hunt-msg bad';
  el.pill.classList.remove('shake'); void el.pill.offsetWidth; el.pill.classList.add('shake');
  blip(160, .18, 'sawtooth');
}

function attempt(sp) {
  if (!sp) return;
  audio();
  if (isCaught(sp.id)) {
    el.msg.textContent = `${sp.pl} jest już w Twojej kolekcji!`;
    el.msg.className = 'hunt-msg good';
    openModal(sp);
    return;
  }
  el.msg.textContent = '';
  runCatch(sp);
}

/* ================= ANIMACJA ŁAPANIA ================= */
let busy = false;
function runCatch(sp) {
  if (busy) return; busy = true;
  const pal = PAL[(sp.o && sp.o.p) || 0] || PAL[0];
  const S = el.scene;
  S.hidden = false;
  el.sceneTarget.className = 'scene-target idle';
  el.sceneTarget.innerHTML = drawSpecies(sp, 'ghost');
  el.sceneName.className = 'scene-name';
  el.sceneName.textContent = '';
  el.sceneFlash.className = 'scene-flash';
  el.confetti.innerHTML = '';
  el.sceneEgg.className = 'scene-egg';
  el.sceneEgg.innerHTML = drawEgg(sp.r, sp.id);

  const step = (fn, ms) => setTimeout(fn, ms);

  step(() => { el.sceneEgg.className = 'scene-egg throw'; blip(520, .1); }, 120);
  step(() => { blip(300, .08); }, 640);
  step(() => { el.sceneEgg.className = 'scene-egg wobble'; }, 760);
  step(() => blip(400, .07), 900);
  step(() => blip(430, .07), 1320);
  step(() => blip(460, .07), 1740);
  step(() => {
    crack();
    el.sceneEgg.innerHTML = drawEggCracked(sp.r, sp.id);
    el.sceneEgg.className = 'scene-egg gone';
    el.sceneFlash.className = 'scene-flash on';
  }, 2060);
  step(() => {
    el.sceneTarget.innerHTML = drawSpecies(sp, 'full', pal);
    el.sceneTarget.className = 'scene-target show';
    el.sceneName.textContent = sp.pl;
    el.sceneName.className = 'scene-name show';
    roar(sp.r);
    confettiBurst(pal);
    markCaught(sp);
  }, 2320);
  step(() => {
    S.hidden = true; busy = false;
    renderAll(sp.id);
    el.msg.innerHTML = `Złapany! <b>${esc(sp.pl)}</b> dołącza do kolekcji.`;
    el.msg.className = 'hunt-msg good';
    openModal(sp);
  }, 3900);
}
function confettiBurst(pal) {
  const colors = [pal[0], pal[1], '#F5A524', '#FFF3D0', '#7FA86B'];
  let html = '';
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + Math.random();
    const d = 120 + Math.random() * 260;
    html += `<i style="left:50%;top:48%;background:${colors[i % colors.length]};
      --dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d + 140).toFixed(0)}px;
      --rot:${(Math.random() * 900 - 450).toFixed(0)}deg;
      animation-delay:${(Math.random() * .12).toFixed(2)}s"></i>`;
  }
  el.confetti.innerHTML = html;
  requestAnimationFrame(() => el.confetti.querySelectorAll('i').forEach(n => n.classList.add('go')));
}
el.scene.addEventListener('click', () => { /* nie przerywamy – animacja jest krótka */ });

/* ================= MODAL ================= */
function openModal(sp) {
  const got = isCaught(sp.id);
  el.modalBody.innerHTML = got ? caughtCard(sp) : hintCard(sp);
  el.modal.hidden = false;
}
function closeModal() { el.modal.hidden = true; }
el.modalClose.addEventListener('click', closeModal);
el.modal.addEventListener('click', e => { if (e.target === el.modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeOverlays(); } });

function caughtCard(sp) {
  const g = GROUPS[sp.g], t = TYPES[sp.t];
  const wins = DB.wins[sp.id] || 0;
  return `
  <div class="m-hero"><div class="art">${drawSpecies(sp, 'full', palOf(sp))}</div></div>
  <div class="m-body">
    <h2>${esc(sp.pl)}</h2>
    <p class="m-lat">${esc(sp.lat)}</p>
    <div class="m-tags">
      <span class="tag" style="background:${g.color}">${esc(g.short)}</span>
      <span class="tag" style="background:${t.color}">${t.emo} ${t.label}</span>
      <span class="tag light">${DIETS[sp.d]}</span>
      <span class="tag light">rzadkość ${'★'.repeat(sp.r)}${'☆'.repeat(4 - sp.r)}</span>
    </div>
    <div class="m-fact"><b>CZY WIESZ, ŻE…</b>${esc(sp.f)}</div>
    <div class="m-stats">
      <div class="stat"><span>DŁUGOŚĆ</span><b>${sp.sz} m</b></div>
      <div class="stat"><span>SIŁA</span><b>${sp.pw}/12</b></div>
      <div class="stat"><span>WYGRANE W ARENIE</span><b>${wins}</b></div>
      <div class="stat"><span>PODPOWIEDŹ</span><b style="font-size:13px;font-family:var(--font-b)">${esc(sp.h)}</b></div>
    </div>
    <div class="m-actions">
      <button class="btn amber" data-arena="${sp.id}">⚔️ Do areny</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
      ${editing ? `<button class="btn danger" data-release="${sp.id}">Uwolnij</button>` : ''}
    </div>
  </div>`;
}
function hintCard(sp) {
  const g = GROUPS[sp.g];
  const era = sp.sz >= 15 ? 'olbrzym' : (sp.sz >= 6 ? 'duży' : (sp.sz >= 2 ? 'średni' : 'mały'));
  return `
  <div class="m-hero"><div class="art">${drawSpecies(sp, 'ghost')}</div></div>
  <div class="m-body">
    <div class="m-hint">
      <p class="q">? ? ?</p>
      <div class="lbl">PODPOWIEDŹ</div>
      <p>${esc(sp.h)}</p>
      <div class="hint-fields">
        <span>${esc(g.short)}</span>
        <span>${DIETS[sp.d]}</span>
        <span>${era} (${sp.sz} m)</span>
        <span>${'★'.repeat(sp.r)}</span>
      </div>
      <p class="more">Wpisz jego nazwę w wyszukiwarce, żeby go złapać!</p>
    </div>
    <div class="m-actions">
      <button class="btn" data-firstletter="${sp.id}">Pokaż pierwszą literę</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
      ${editing ? `<button class="btn danger" data-del2="${sp.id}">Usuń z listy</button>` : ''}
    </div>
  </div>`;
}

el.modalBody.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.close) return closeModal();
  if (b.dataset.release) { release(b.dataset.release); closeModal(); renderAll(); }
  if (b.dataset.del2) { removeSpecies(b.dataset.del2); closeModal(); }
  if (b.dataset.arena) { closeModal(); openArena(b.dataset.arena); }
  if (b.dataset.firstletter) {
    const sp = byId(b.dataset.firstletter);
    const n = sp.pl.length;
    b.outerHTML = `<span class="tag light" style="padding:11px 16px">Zaczyna się na <b>${esc(sp.pl[0].toUpperCase())}</b>, ma ${n} liter</span>`;
    el.q.value = sp.pl[0];
    blip(660, .1);
  }
});

/* ================= SIATKA – klikanie ================= */
el.grid.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del && editing) { e.stopPropagation(); removeSpecies(del.dataset.del); return; }
  const tile = e.target.closest('.tile'); if (!tile) return;
  const sp = byId(tile.dataset.id); if (!sp) return;
  blip(isCaught(sp.id) ? 620 : 380, .07);
  openModal(sp);
});
el.chips.addEventListener('click', e => {
  const c = e.target.closest('[data-f]'); if (!c) return;
  filter = c.dataset.f; renderChips(); renderGrid();
});
el.onlyMissing.addEventListener('change', renderGrid);

/* ================= TRYB RODZICA ================= */
function removeSpecies(id) {
  if (!confirm('Usunąć ten gatunek z listy?')) return;
  if (!DB.removed.includes(id)) DB.removed.push(id);
  delete DB.caught[id];
  Store.save(); refreshList(); renderAll();
}
function addSpecies(name, arch, group, latin) {
  const id = 'own_' + norm(name) + '_' + Math.random().toString(36).slice(2, 6);
  const pal = Math.abs(hashStr(name)) % PAL.length;
  const rec = {
    id, pl: name.trim(), lat: (latin || '').trim(), a: arch, g: group,
    o: { p: pal }, r: 2, d: 'R', sz: 6, pw: 7,
    t: ({ dino: 'olbrzym', ptero: 'zwinny', morskie: 'wodny', inne: 'zwinny' })[group] || 'zwinny',
    h: 'Ten zwierzak został dodany przez rodzica', f: 'Dopisaliście go sami — wymyślcie o nim własną ciekawostkę!'
  };
  DB.added.push(rec); Store.save(); refreshList(); renderAll();
  return rec;
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

let editBar = null;
function toggleEdit() {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  el.btnEdit.classList.toggle('on', editing);
  if (editing) buildEditBar(); else if (editBar) { editBar.remove(); editBar = null; }
}
function buildEditBar() {
  editBar = document.createElement('section');
  editBar.className = 'edit-bar';
  const hidden = DB.removed.length;
  editBar.innerHTML = `
    <h3>⚙️ Tryb rodzica</h3>
    <p>Dodaj brakującego ulubieńca albo usuń gatunek z listy (✕ na kafelku). Zmiany zapisują się na stałe.</p>
    <div class="eb-row">
      <input id="ebName" placeholder="Nazwa po polsku, np. Ultrazaur">
      <input id="ebLat" placeholder="Nazwa łacińska (opcjonalnie)">
    </div>
    <div class="eb-row" style="margin-top:7px">
      <select id="ebArch">${ARCH_LIST.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="ebGroup">${Object.entries(GROUPS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('')}</select>
      <button class="btn amber" id="ebAdd">Dodaj</button>
    </div>
    <div class="eb-tools">
      <button class="btn ghost" id="ebRestore">Przywróć usunięte (${hidden})</button>
      <button class="btn ghost" id="ebExport">Zapisz do pliku</button>
      <button class="btn ghost" id="ebImport">Wczytaj z pliku</button>
      <button class="btn ghost" id="ebCatchAll">Złap wszystkie (test)</button>
      <button class="btn danger" id="ebReset">Wyzeruj postęp</button>
    </div>`;
  el.main.insertBefore(editBar, el.main.querySelector('.filters'));

  editBar.querySelector('#ebAdd').addEventListener('click', () => {
    const n = editBar.querySelector('#ebName').value.trim();
    if (n.length < 2) return alert('Wpisz nazwę zwierzaka.');
    const rec = addSpecies(n, editBar.querySelector('#ebArch').value, editBar.querySelector('#ebGroup').value,
      editBar.querySelector('#ebLat').value);
    editBar.querySelector('#ebName').value = ''; editBar.querySelector('#ebLat').value = '';
    blip(700, .12);
    openModal(byId(rec.id));
  });
  editBar.querySelector('#ebRestore').addEventListener('click', () => {
    DB.removed = []; Store.save(); refreshList(); renderAll();
    editBar.querySelector('#ebRestore').textContent = 'Przywróć usunięte (0)';
  });
  editBar.querySelector('#ebReset').addEventListener('click', () => {
    if (!confirm('Na pewno wyzerować cały postęp (złapane, dodane i usunięte)?')) return;
    Store.reset(); location.reload();
  });
  editBar.querySelector('#ebCatchAll').addEventListener('click', () => {
    LIST.forEach(s => { if (!isCaught(s.id)) DB.caught[s.id] = { t: Date.now(), pal: palOf(s) }; });
    Store.save(); renderAll();
  });
  editBar.querySelector('#ebExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lowca-dinozaurow.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  });
  editBar.querySelector('#ebImport').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(rd.result);
          Object.assign(DB, { caught: j.caught || {}, added: j.added || [], removed: j.removed || [], wins: j.wins || {} });
          Store.save(); refreshList(); renderAll();
          alert('Wczytano!');
        } catch (e) { alert('Nie udało się wczytać tego pliku.'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  });
}
el.btnEdit.addEventListener('click', toggleEdit);

/* ================= ARENA ================= */
/* pięciokąt: każdy typ wygrywa z dwoma następnymi w cyklu */
function typeAdv(a, b) {
  if (a === b) return 0;
  const i = TYPE_CYCLE.indexOf(a), j = TYPE_CYCLE.indexOf(b);
  const d = (j - i + 5) % 5;
  return (d === 1 || d === 2) ? 1 : -1;
}
const ADV_TEXT = {
  drap: { olbrzym: 'poluje w stadzie na olbrzymy', pancerz: 'znajduje szczelinę w pancerzu' },
  olbrzym: { pancerz: 'po prostu depcze pancerniki', zwinny: 'jednym ruchem ogona zmiata zwinnych' },
  pancerz: { zwinny: 'maczugą trafia nawet zwinnych', wodny: 'nie da się go ugryźć w wodzie' },
  zwinny: { wodny: 'ucieka na brzeg', drap: 'unika kłów i podgryza' },
  wodny: { drap: 'wciąga drapieżnika pod wodę', olbrzym: 'topi olbrzyma na głębinie' }
};
let arenaA = null, arenaB = null, arenaSlot = 'A';

function closeOverlays() { el.modal.hidden = true; }

function openArena(preId) {
  const got = LIST.filter(s => isCaught(s.id));
  if (got.length < 2) {
    el.modalBody.innerHTML = `<div class="m-body"><h2>Arena</h2>
      <p class="m-lat">Najpierw złap co najmniej dwa zwierzaki.</p>
      <div class="m-actions"><button class="btn ghost" data-close="1">Rozumiem</button></div></div>`;
    el.modal.hidden = false; return;
  }
  arenaA = preId ? byId(preId) : null;
  arenaB = null; arenaSlot = arenaA ? 'B' : 'A';
  drawArena('Wybierz zawodników i naciśnij Walka!');
  el.modal.hidden = false;
}
function slotHTML(sp, label) {
  if (!sp) return `<div class="ar-slot"><span class="ph">${label}</span></div>`;
  return `<div class="ar-slot filled" id="slot${label}">
    <div class="art">${drawSpecies(sp, 'full', palOf(sp))}</div>
    <div class="nm">${esc(sp.pl)}</div>
    <div style="font-size:11px;font-weight:800;color:${TYPES[sp.t].color}">${TYPES[sp.t].emo} ${TYPES[sp.t].label} · siła ${sp.pw}</div>
  </div>`;
}
function drawArena(logHTML) {
  const got = LIST.filter(s => isCaught(s.id));
  el.modalBody.innerHTML = `
  <div class="m-body arena">
    <h2>⚔️ Arena</h2>
    <p class="m-lat">Kliknij zwierzaka, żeby wstawić go na wolne miejsce</p>
    <div class="ar-slots">
      ${slotHTML(arenaA, 'A')}
      <div class="ar-vs">VS</div>
      ${slotHTML(arenaB, 'B')}
    </div>
    <div class="ar-log" id="arLog">${logHTML}</div>
    <div class="m-actions">
      <button class="btn amber" id="arFight" ${arenaA && arenaB ? '' : 'disabled style="opacity:.45"'}>Walka!</button>
      <button class="btn ghost" id="arClear">Wyczyść</button>
      <button class="btn ghost" data-close="1">Zamknij</button>
    </div>
    <div class="ar-pick">
      ${got.map(s => `<button data-pick2="${s.id}"><span class="art">${drawSpecies(s, 'full', palOf(s))}</span><span class="nm">${esc(s.pl)}</span></button>`).join('')}
    </div>
    <div class="type-legend">
      ${TYPE_CYCLE.map(t => `<span style="color:${TYPES[t].color}">${TYPES[t].emo} ${TYPES[t].label}</span>`).join('')}
      <span style="opacity:.7">każdy typ bije dwa następne w kółku</span>
    </div>
  </div>`;
  const f = el.modalBody.querySelector('#arFight');
  if (f) f.addEventListener('click', fight);
  const c = el.modalBody.querySelector('#arClear');
  if (c) c.addEventListener('click', () => { arenaA = arenaB = null; arenaSlot = 'A'; drawArena('Wybierz zawodników.'); });
  el.modalBody.querySelectorAll('[data-pick2]').forEach(b => b.addEventListener('click', () => {
    const sp = byId(b.dataset.pick2);
    if (arenaSlot === 'A') { arenaA = sp; arenaSlot = 'B'; } else { arenaB = sp; arenaSlot = 'A'; }
    if (arenaA && arenaB && arenaA.id === arenaB.id) { arenaB = null; arenaSlot = 'B'; }
    blip(560, .06);
    drawArena(arenaA && arenaB ? 'Gotowi? Naciśnij <b>Walka!</b>' : 'Wybierz drugiego zawodnika.');
  }));
}
function fight() {
  if (!arenaA || !arenaB) return;
  const rollA = 1 + Math.floor(Math.random() * 6), rollB = 1 + Math.floor(Math.random() * 6);
  const advA = typeAdv(arenaA.t, arenaB.t);
  const bonus = 3;
  const sA = arenaA.pw + rollA + (advA > 0 ? bonus : 0);
  const sB = arenaB.pw + rollB + (advA < 0 ? bonus : 0);
  const win = sA === sB ? (arenaA.pw >= arenaB.pw ? arenaA : arenaB) : (sA > sB ? arenaA : arenaB);
  const lose = win === arenaA ? arenaB : arenaA;

  let lines = [];
  if (advA !== 0) {
    const w = advA > 0 ? arenaA : arenaB, l = advA > 0 ? arenaB : arenaA;
    const txt = (ADV_TEXT[w.t] || {})[l.t] || 'ma przewagę typu';
    lines.push(`<span class="li">${TYPES[w.t].emo} <b>${esc(w.pl)}</b> ${txt} — przewaga +${bonus}!</span>`);
  } else {
    lines.push(`<span class="li">Oba to typy <b>${TYPES[arenaA.t].label}</b> — decyduje siła i szczęście.</span>`);
  }
  lines.push(`<span class="li">🎲 ${esc(arenaA.pl)}: ${arenaA.pw}+${rollA}${advA > 0 ? '+' + bonus : ''} = <b>${sA}</b> · ${esc(arenaB.pl)}: ${arenaB.pw}+${rollB}${advA < 0 ? '+' + bonus : ''} = <b>${sB}</b></span>`);
  if (sA === sB) lines.push(`<span class="li">Remis punktowy — rozstrzyga większa siła podstawowa.</span>`);
  lines.push(`<span class="li win">🏆 Wygrywa ${esc(win.pl)}!</span>`);

  DB.wins[win.id] = (DB.wins[win.id] || 0) + 1; Store.save();
  drawArena(lines.join(''));
  const slots = el.modalBody.querySelectorAll('.ar-slot.filled');
  slots.forEach(s => s.classList.add('ar-fight'));
  roar(win.r);
  setTimeout(() => blip(880, .18), 700);
}
el.btnArena.addEventListener('click', () => openArena(null));

/* ================= START ================= */
el.brandEgg.innerHTML = drawEgg(3, 'brand');
renderAll();
el.q.focus({ preventScroll: true });

/* podpowiedź na starcie */
if (Object.keys(DB.caught).length === 0) {
  el.msg.textContent = 'Zacznij od czegoś łatwego — spróbuj wpisać „tyranozaur”.';
  el.msg.className = 'hunt-msg';
}
})();
