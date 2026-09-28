# Opus version review (`index.html` + `js/*.js` + `css/app.css`)

Tooling: `tmp/review/opus_shot.js` (CDP runner, steps JSON), `opus_steps*.json`, `opus_sheet.js` (contact sheet), `opus_crop.py`.
Shots: `tmp/review/shots/opus_*.png` (home, suggest, catch1-3, caught_card, hint, collection, arena0/1/fight, parent, tablet, tablet_arena, all_species + sheet_rows crops). No JS errors captured.

Size: app.js 681, art.js 599, data.js 348, app.css 407, index.html 118 LOC. Vanilla, no deps (Google Fonts only), `build.js` inlines to one file.

## 1. Feature inventory
- Search: Polish-diacritic normalization, aliases, Levenshtein (tol 1/2/3 by length), prefix/substring match, live suggestions (6), "✓ masz" marker.
- Catch scene: fullscreen, ghost silhouette sways, egg (4 rarity skins) thrown on arc, wobbles 3x, cracks, flash, 46-piece confetti, WebAudio roar/blips/crack noise, then card modal. ~3.9 s, non-interactive (always succeeds).
- Collection grid: numbered tiles, rarity dots, group dot, ghost silhouette "fossil slab" tiles for uncaught, filter chips per group with counts, "tylko brakujące".
- Hint card for uncaught: silhouette, relational hint, group/diet/size/rarity chips, "Pokaż pierwszą literę".
- Caught card: art, latin, tags (group, arena type, diet, rarity), "Czy wiesz, że…" fact, length/power/arena wins/hint.
- Progress: counter, 7 ranks (Praktykant→Legenda mezozoiku), "rock layer" bar with 4 egg milestones.
- Parent mode (ungated toggle): add custom species (name, latin, archetype, group), delete (✕ on tiles), restore deleted, export/import JSON, "catch all (test)", reset, release caught.
- Arena: pick 2 caught, one-shot dice duel, win counter.
- Persistence: localStorage `dinoTracker.v1` (caught w/ frozen palette, added, removed, wins).

## 2. Arena
Mechanics: 5-type cycle (drap→olbrzym→pancerz→zwinny→wodny→drap, each beats next two). Score = pw + d6 + 3 if type advantage. pw = 2+4·log10(len+1) + type bonus, clamped 1..12. Tie → higher pw. Result text + 0.5 s shake + roar. Only wins recorded.

Why weaker than ChatGPT:
- One roll, instant verdict. No HP, rounds, turn order, hit/dodge animation, pacing. ChatGPT: 4 stats (atak/obrona/szybkość/życie), up to 8 rounds of animated attacks every 520 ms, HP bars, lunge/hit animations, vibration, scrolling round log.
- No specials. ChatGPT: per-body special moves (🔨 Młot ogonowy, 📯 Szarża rogami…), crits, dodges, pack attack, "żywa forteca" sauropod shield, armor reduction, 6 terrains with modifiers.
- Stats flat: actual pw range is 3..9 (8 at 3, 31 at 7), but UI says "/12". T-rex = 8, same as Karnotaur; d6 variance dominates. Kompsognat beats T-rex 17%, Welociraptor 28% (type advantage).
- 5-type cycle "bije dwa następne w kółku" is abstract for ~6-year-olds.
- UX: slot picking alternates A/B blindly (can't choose which slot), no random opponent, no rematch, no loss record/history, whole modal re-rendered each click (picker scroll lost), nested 230 px scroll in modal on phone.
Keep from Opus arena: nothing structural; ADV_TEXT flavor lines are reusable as log text.

## 3. Species (116)
Schema (positional array → object): `id, pl, lat, a` (archetype), `o` (draw opts; `o.p` palette idx + archetype flags), `h` hint, `f` fact, `r` rarity 1-4, `t` arena type, `g` group (dino/ptero/morskie/inne), `d` diet (M/R/W/Ry), `sz` length m, `alias[]`; derived `pw`. Missing: era/period (ChatGPT has it), weight, continent. Positional 13-field rows are fragile; convert to objects/JSON.

Split: dino 77, ptero 8, marine 12, other 19. Archetypes: thero 26, hadro 11, sauro 10, cerat 10, armor 8, ptero 8, rest 1-5.
Quality: good kid-level hints (relational, "kuzyn X"), mostly correct facts, non-dinosaurs labelled separately (pedagogically good), Archaeopteryx correctly in `dino`.

Errors:
- Contradiction: Mamenchizaur "najdłuższą szyję w historii — 15 m" vs Elasmozaur "najdłuższa szyja w historii Ziemi".
- Allozaur "w setkach egzemplarzy" (Cleveland-Lloyd ≈ 46 individuals).
- Akrokantozaur fact: "tropi tam zauropoda" → "tropił".
- Postozuch hint says bipedal, drawing is quadruped.
- Iguanodon, Hypsilofodon, Tenontozaur drawn with hadrosaur duck-bill (not hadrosaurs).
- Oftalmozaur "największe oczy ze wszystkich kręgowców" – relative size only.
Polish names: mostly sound. Questionable: "Gigantozaur" (should be Giganotozaur; alias exists), "Baryonyks" (Polish usage Barionyks), "Nothozaur" (Notozaur more common), "Kecalkoatl" (fine but children's books often use Kecalkoatl/Quetzalcoatlus – keep alias).
Omissions (well-known, several in ChatGPT's list): Karcharodontozaur, Majungazaur, Ornitomim, Dromeozaur, Eoraptor, Torwozaur, Dreadnoughtus, Europazaur, Dryozaur, Kamptozaur, Muttaburrazaur, Anhanguera, Hatzegopteryx, Pliozaur, Tanystrof; also Pachyrinozaur, Yutyrannus, Nigerzaur, Borealopelta, Titanoboa, Megaterium, Glyptodon, nosorożec włochaty, Helicoprion, Anomalokaris.
Search exploit: any ≥4-char substring matches (score 2), Enter catches `hits[0]` → typing "zaur"/"raptor" catches a species without knowing its name.

## 4. Graphics
Engine (`art.js`): 21 archetype functions return part lists (fill blobs, tapered stroke limbs `TAP`, detail layers m0-m3). `paint()` does 2 passes: shared dark outline of all parts, then fills, then detail strokes → seamless cartoon silhouette with thick ink outline. Ghost mode = outline pass only in beige → true silhouette. 18 hand-picked 3-tone palettes (base, light, ink); palette frozen into save on catch. Deterministic, ~36 KB, viewBox 200×140, faces right. Eggs: 4 rarity styles, hash-seeded speckles, cracked variant.

Per archetype (contact sheet `opus_all_species.png`):
- thero (26): good, consistent, readable. Weak: tyrannosaurids/Megalozaur/Herrerazaur differ only by palette; Terizinozaur arm reads as a third leg; Akrokantozaur/Suchomim ridge is a stray line; snouts touch right edge (T-rex, Utahraptor).
- sauro (10): OK silhouettes, but heads clipped by viewBox (Mamenchizaur, Brachiozaur top; Argentynozaur, Apatozaur, Diplodok right). All look alike except Amargazaur spines/Saltazaur dots.
- prosauro (2): fine.
- cerat (10): best archetype. Triceratops, Styrakozaur, Kosmoceratops distinct. Wrong: Psittakozaur (quadruped hornless blob; was bipedal, parrot beak).
- armor (8): good, readable; all near-identical except club/shoulder spikes.
- stego (4): good (Stegozaur, Kentrozaur distinct). Miragaia neck barely longer.
- hadro (11): weakest. Pale oval "clown nose" bill; crests read as donkey ears/buns (Lambeozaur, Majazaura, Saurolof, Korytozaur). Parazaurolof OK. Non-hadrosaurs use duck bill (wrong).
- dome (4): Pachycefalozaur dome = pale ball glued on head; Stygimoloch/Dracorex crown OK-ish.
- ptero (8): insect/leaf-like wings folded back; reads more dragonfly than pterosaur, but recognizable. Crests OK (Pteranodon, Tapejara).
- plesio (4): good. mosa (4): good (Mozazaur, Liopleurodon). ichthyo (3): good (swordfish-ish).
- fish (3): Megalodon good, Dunkleosteus good; Leedsichthys wrong (clone of Dunkleosteus armored jaws; was a filter feeder).
- croc (5): fine; Kaprozuch lacks boar tusks.
- sail (2): Dimetrodon/Edafozaur good.
- synap (2): Lystrozaur OK, Moschops featureless blob.
- amphib (2): Eryops OK; Diplokaulus boomerang head not visible (triangles read as fins on back/belly) – wrong.
- bug (3): Meganeura good, Artropleura OK (head clipped right), Trylobit reads as beetle.
- mammal (2): Mamut OK; Smilodon reads as walrus/otter – bad.
- turtle (1): OK. bird (2): OK, wings insect-like.

UI design system (`app.css`): coherent theme – petrol ink #123C38 + amber #F5A524 + paper/stone tokens on `:root`, Baloo 2 + Nunito, 3 px ink borders, chunky pill buttons with drop-shadow press, fossil-slab dashed ghost tiles, strata background, rock progress bar with eggs, modal cards. Looks polished and kid-friendly; clearly better than ChatGPT's. Issues: fixed strata bands cut visibly across the grid; last milestone egg overflows the bar; no dark mode (fine); first screen is 26 near-identical theropod silhouettes (grid sorted by clade) – poor hint value.

## 5. Code quality, bugs, mobile
Good: small, readable, IIFE, `esc()` everywhere, event delegation for grid/modal, deterministic art, build script.
Bad/bugs:
- `window.storage` fallback assumes sync `getItem/setItem`; the artifact storage API is async → fallback broken.
- Parent mode ungated: child can delete species/reset (only `confirm()`). ChatGPT uses long-press.
- Search substring exploit (above).
- Arena slot logic, "/12" mislabel, wins-only record.
- Dead code: `eggIcon`, `closeOverlays` (duplicate of closeModal), `el.scene` empty click handler, `.scene-hint`/`.silhouette` CSS, `BY_ID` unused.
- `alert/confirm` for UX; no focus trap in modal; first-letter button fills search but leaves modal open.
- data.js positional rows; art.js code-golfed (one-letter helpers, magic coordinates) – hard to maintain but works.
- Catch not interactive (no tap/throw); always succeeds.
Mobile (430 px): 3-col grid, 17 px input (no iOS zoom), sticky header, icon-only header buttons – good. Chips wrap to 3 rows; arena modal cramped with nested scroll; parent-mode placeholders truncated; ✕ delete targets 22 px. Tablet (820 px): 5-col grid, labels shown – good. Needs Google Fonts online; no manifest/service worker for offline tablet use.

## 6. Verdict
KEEP (base of merged app):
- Multi-file layout + `build.js`; CSS design system/tokens, header, search pill, progress rockbar, fossil ghost tiles, modals.
- Art engine `art.js` (2-pass outline, ghost silhouettes, palettes, eggs); fix hadro/dome/Psittakozaur/Leedsichthys/Diplokaulus/Smilodon and viewBox clipping.
- Search (normalize + alias + Levenshtein) – require exact/prefix for Enter-catch to close substring exploit.
- Catch scene + WebAudio; hint card; caught card; ranks; export/import.
- Species list (116) + hints/facts – convert to objects, add `era`, fix errors, merge ChatGPT extras (~16).
DROP / REPLACE:
- Arena entirely → port ChatGPT battle (stats from body+size+diet, rounds, HP bars, specials, terrain, records W/P, rematch, random opponent). Map Opus archetype → ChatGPT `body`; keep Opus `sz`.
- Ungated parent toggle → long-press gate. `window.storage` fallback. Dead code.
- Clade-sorted grid default – consider interleaving or sorting by popularity.
