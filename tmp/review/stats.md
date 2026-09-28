# Species merge + battle stats review

Files: `real_data.js` (hand-entered real data) → `derive_stats.js` (formula + simulation in the unmodified ChatGPT battle engine) → `species.json`, `stats_generated.md`. `extract.js` pulls both current lists into `extracted.json`.

```
node tmp/review/extract.js && node tmp/review/derive_stats.js 3000   # re-tune: edit K in derive_stats.js
node tmp/review/dbg.js tyrannosaurus-rex quetzalcoatlus-northropi    # one matchup, with battle logs
```

## 1. Current lists

| | Opus (`js/data.js`) | ChatGPT (`dino_lapacz_chatgpt.html`) |
|---|---|---|
| entries | 116 | 100 |
| fields | pl, lat, archetype, hint, fact, rarity, arena type, group (dino/ptero/morskie/inne), diet, length, aliases | name, latin, category (dino/ptero/marine/other), body, diet, era, hint, aliases |
| period | **missing** | coarse (Trias/Jura/Kreda/Perm) |
| battle | `pw = 2 + 4·log10(len+1)` + type bonus, 1d6 + 5-type cycle | per-`body` template + diet + 5 size classes + hash jitter; 8-round HP sim with dodge, crits, pack, arena |

Overlap: 84 genera. Opus-only (32): Tarbosaurus, Troodon, Mamenchisaurus, Alamosaurus, Massospondylus, Kosmoceratops, Einiosaurus, Psittacosaurus, Sauropelta, Polacanthus, Gastonia, Scelidosaurus, Miragaia, Hesperosaurus, Hadrosaurus, Dracorex, Homalocephale, Cryptoclidus, Megalodon, Dunkleosteus, Kaprosuchus, Lystrosaurus, Moschops, Eryops, Diplocaulus, Meganeura, Arthropleura, Trilobita, Mammoth, Smilodon, Archaeopteryx, Microraptor.
ChatGPT-only (16): Carcharodontosaurus, Ornithomimus, Majungasaurus, Dreadnoughtus, Europasaurus, Dryosaurus, Camptosaurus, Ornitholestes, Dromaeosaurus, Eoraptor, Torvosaurus, Muttaburrasaurus, Anhanguera, Hatzegopteryx, Pliosaurus, Tanystropheus.

### Errors found

ChatGPT:
- `body` mislabels: Plateosaurus = `sauropod` (bipedal sauropodomorph); Iguanodon, Hypsilophodon, Tenontosaurus, Dryosaurus, Camptosaurus, Muttaburrasaurus, Ouranosaurus = `hadrosaur` (non-hadrosaur ornithopods).
- Size classes are hand-lists: Ichthyosaurus (2.5 m, ~150 kg) = size 4 → ATK 87, HP 179; Protosuchus (1 m) = size 3; Plateosaurus = 4; Velociraptor, Deinonychus (75 kg) and Compsognathus (3 kg) all size 1 with identical HP 72.
- Pack chance = any carnivore: Mosasaurus, Liopleurodon, Sarcosuchus, Quetzalcoatlus get "atak grupowy" 16 %; Velociraptor 68 % (no pack evidence for it).
- Polish names: "Edafosaurus" (→ Edafozaur), "Mosasaurus" (→ Mozazaur), "Elazmozaur" (→ Elasmozaur), "Tyranozaur rex" mixes PL/LAT.
- Facts: Ophthalmosaurus eyes "bigger than basketballs" – no (~22 cm vs 24 cm). Everything else looks sane.

Opus:
- No period field at all.
- `length` mixes body length and wingspan (Kecalkoatl 11, Pteranodon 7); Tapejara 3 m (real wingspan ~1.5 m).
- Outdated sizes: Mosasaurus 17 m (→ ~12), Sarcosuchus 12 m (→ 9.5), Dunkleosteus 8 m (→ ~4, Engelman 2023), Saltasaurus 12 m (→ 8.5).
- Postosuchus hint: "Krokodyl … przed dinozaurami … największym drapieżnikiem triasu, zanim pojawiły się dinozaury" – wrong: it lived alongside early dinosaurs and is a crocodile *relative*, not a crocodile.
- Leedsichthys diet W → filter feeder. Therizinosaurus arena type `drap` (+2 power) although herbivore.
- Duplicates / doubtful taxa: Dracorex + Stygimoloch are probably juvenile Pachycephalosaurus; Hesperosaurus ≈ Stegosaurus; Gastonia ≈ Polacanthus; Troodon is a nomen dubium (kept – kids know the name).
- `power()` uses length only: Argentinosaurus 9 > T. rex 8; Mammoth 6 = Smilodon 6; Quetzalcoatlus scored by wingspan.

Both label non-dinosaurs correctly as separate groups (good). Neither marks birds as dinosaurs explicitly; merged list does (`is_dinosaur: true`, group "Ptak — żyjący dinozaur"), and marks Smok wawelski / Silesaurus `is_dinosaur: "?"`.

## 2. Merged list — 154 entries

Kept: union (132) minus 16 obscure/duplicate: Dracorex, Homalocephale, Hadrosaurus, Gastonia, Polacanthus, Hesperosaurus, Sauropelta, Scelidosaurus, Einiosaurus, Protosuchus, Camptosaurus, Dryosaurus, Muttaburrasaurus, Ornitholestes, Dromaeosaurus, Cryptoclidus.

Added (38):
- Polish finds: **Smok wawelski**, **Silezaur** (Silesaurus), **Polonozuch** (Polonosuchus), **Lisowicja** (9 t dicynodont), **Metopozaur** (Krasiejów). Polish-Mongolian expedition links noted on Tarbosaurus, Gallimimus, Deinocheirus, Protoceratops/Velociraptor ("Walczące dinozaury", 1971). Notozaur also from Silesia; cave bear from Jaskinia Niedźwiedzia; woolly rhino from Starunia (Kraków museum).
- Famous dinosaurs: Patagotytan, Jutyran (Yutyrannus), Deinocheir, Sinozauropteryks, Mononyk, Nigerzaur, Pachyrinozaur, Sinoceratops, Szantungozaur, Heterodontozaur (several appear in Jurassic World Dominion).
- Sea: Liwiatan, Bazylozaur, Helikoprion, Anomalokaris, Jaekelopterus (sea scorpion), Amonit.
- Reptiles: Tytanoboa, Megalania, Purusaurus, Inostrancewia.
- Birds (= dinosaurs): Gastornis, Forusrak (terror bird).
- Ice Age / Cenozoic mammals: Nosorożec włochaty, Niedźwiedź jaskiniowy, Lew jaskiniowy, Wilk straszny, Jeleń olbrzymi, Megaterium, Gliptodont, Diprotodon, Indrikoterium, Deinoterium, Andrewsarch.

Composition: 87 dinosaurs (incl. 3 birds) + 2 "maybe dinosaurs", 10 pterosaurs, 12 marine reptiles, 4 fish/sharks, 13 land mammals + 2 whales, 9 crocodile relatives/squamates/other reptiles, 6 synapsids, 3 amphibians, 6 invertebrates.

Each `species.json` entry: `id` (latin kebab), `name_pl`, `name_lat`, `group`, `group_pl`, `is_dinosaur`, `period_pl`, `ma`, `diet`, `length_m`, `height_m`, `wingspan_m`, `mass_kg`, `locomotion`, `speed_kmh_est`, `weapons` (0–3 scores), `weapons_pl`, `social`, `uncertainty` (L/M/H), `note` (sources/debates), `legacy` {opus, gpt} ids for save migration, `aliases` (union of both apps), `category`/`body` (engine), `stats`.

Caveats: masses are single best estimates from the literature (ranges in `note`); **all speeds of extinct animals are speculative**; masses flagged H (e.g. Argentinosaurus, Spinosaurus, Mamenchisaurus, most marine reptiles, Smok) can be off by ×2. PL names marked "coined" in `note` have no established Polish form (verify before shipping).

## 3. Stat formula

Everything flows from `m = clamp((log10(mass_kg) + 2) / 7, 0, 1)` (10 g → 0, 100 t → 1), weapon scores and speed.

```
W    = max(weapon·wt) + 0.25·Σ(other weapons·wt)      wt: bite 1, claw .8, squeeze .9, horn .8, tail .8, ram .7
HP   = 60 + 160·m^2.2                                 → 72 … 212
ATK  = 10 + 70·m^1.5 + 7·W + diet                     diet: M +6, Ry +3, W +1, P −20
DEF  = 14 + 40·m + 8·armor                            armored flag (engine −16 % dmg) if armor ≥ 2
SPD  = 18 + 0.75·km/h + 16·(1−m) + (flier ? 5 : 0)
evade = 0.14·(1−m)² + (flier ? 0.04 : 0)              engine adds speed-difference dodge; caps at .26
pack  = carnivores only: pack .45, pack? .25, solo 0
size  = 1..5 at 30 kg / 500 kg / 5 t / 25 t          fortress = ≥20 t quadruped herbivore
```

Why: log-mass keeps a 70 t sauropod from being 10 000× a raptor; the exponents (2.2 on HP, 1.5 on ATK) are needed because the engine's damage `14 + ATK·.34 − DEF·.17` is very flat — a 3 kg animal still deals ~60 % of a T. rex hit. Small animals get their niche from speed/dodge, packs and terrain (forest: +speed/dodge for size ≤ 2).

## 4. Sanity checks (3000 fights per pair, random arena, engine unchanged)

Highlights (full matrices in the generated section below):
- T. rex beats Triceratops 62 %, Ankylosaurus 50 %, Spinosaurus 78 %, Mammoth 68 %, Smilodon 92 %, Compsognathus 100 %.
- Argentinosaurus beats T. rex 78 %, Giganotosaurus 84 % — size wins, realistic (predators hunted juveniles).
- Mosasaurus beats T. rex 75 % – only because every land-vs-sea fight is on the coast with a marine bonus (engine rule).
- Kecalkoatl vs T. rex 15 % (dive + dodge on cliffs); Kecalkoatl vs Velociraptor 99 %.
- Small niches: Velociraptor vs Protoceratops 56 % (the famous fossil – both died), Deinonychus vs 13× heavier Tenontosaurus 55 % (pack), Velociraptor vs Compsognathus 90 %, Compsognathus vs anything > 20 kg ≈ 0 %.

## 5. Where ChatGPT stats disagree most with reality

1. **Ichthyosaurus beats T. rex 97 %** (size class 4 + marine template ATK 87/HP 179 for a 150 kg dolphin-sized fish-eater). Same template makes every marine animal a monster: Mosasaurus wins 93–100 % vs every land animal.
2. **Sauropod defense 91–99** (> Ankylosaurus 97) and Plateosaurus DEF 90 / HP 204 (700 kg biped). Real sauropods had no armor; their strength is mass → HP/ATK.
3. **Attack barely tracks mass** (Spearman ρ vs mass 0.28; derived 0.83). Herbivores are capped low: Triceratops ATK 57 vs Dilophosaurus 83; so T. rex beats Triceratops 85 % and Triceratops loses to Spinosaurus.
4. **Compressed small end**: Compsognathus, Velociraptor, Deinonychus identical (HP 72); Velociraptor vs Compsognathus 54 % (should be ~90 %).
5. **Speed inverted for bulky ornithopods** (hadrosaurs 63–73 – faster than Carnotaurus) and Gallimimus HP 74 (440 kg).
6. **Pack attack for solitary animals** (Mosasaurus, Sarcosuchus, Quetzalcoatlus).

## 6. Engine suggestions (optional, not needed for the new stats)
- Terrain for land vs sea: choose coast only 50 %, else plains ("land fight") – currently marine animals always get their bonus.
- Add a `mammal` category/body (special move e.g. "🦣 Szarża" / "🐾 Skok z pazurami"); `species.json` already emits `category: "mammal"`, mapped to `other` in the sim.
- Pack as extra small attacks (e.g. 2 bonus hits at 40 % ATK) instead of one ×1.34 hit — gives raptors/wolves a clearer niche.
- Lower the flat `14` in damage to ~6 and raise ATK weight to ~.45 if you want size to matter more; then HP exponent can drop.

---

<!-- generated by derive_stats.js (3000 fights/pair) -->
### Macierz: nowe statystyki (silnik GPT bez zmian)
| A \ B (% A wins) | Tyranoza | Tricerat | Ankyloza | Spinozau | Welocira | Argentyn | Mozazaur | Kecalkoa | Mamut | Smilodon | Kompsogn |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tyranoza | — | 62 | 50 | 78 | 100 | 19 | 25 | 84 | 68 | 92 | 100 |
| Tricerat | 38 | — | 39 | 68 | 100 | 12 | 17 | 79 | 59 | 91 | 100 |
| Ankyloza | 49 | 62 | — | 78 | 100 | 22 | 35 | 92 | 77 | 97 | 100 |
| Spinozau | 23 | 32 | 20 | — | 99 | 7 | 9 | 70 | 38 | 84 | 100 |
| Welocira | 0 | 0 | 0 | 1 | — | 0 | 0 | 1 | 0 | 6 | 89 |
| Argentyn | 78 | 88 | 76 | 94 | 100 | — | 71 | 96 | 93 | 99 | 100 |
| Mozazaur | 75 | 82 | 64 | 92 | 100 | 29 | — | 98 | 87 | 98 | 100 |
| Kecalkoa | 15 | 20 | 8 | 30 | 99 | 4 | 3 | — | 29 | 77 | 100 |
| Mamut | 33 | 40 | 21 | 63 | 100 | 6 | 13 | 70 | — | 83 | 100 |
| Smilodon | 7 | 10 | 3 | 17 | 95 | 1 | 3 | 23 | 16 | — | 100 |
| Kompsogn | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | — |

### Macierz: obecne statystyki GPT (tylko gatunki obecne w GPT)
| A \ B (% A wins) | Tyranoza | Tricerat | Ankyloza | Spinozau | Welocira | Argentyn | Mozazaur | Kecalkoa | Kompsogn |
|---|---|---|---|---|---|---|---|---|---|
| Tyranoza | — | 85 | 61 | 62 | 99 | 35 | 7 | 76 | 99 |
| Tricerat | 16 | — | 12 | 45 | 100 | 7 | 0 | 85 | 100 |
| Ankyloza | 37 | 87 | — | 75 | 100 | 33 | 2 | 95 | 100 |
| Spinozau | 38 | 55 | 27 | — | 98 | 12 | 3 | 61 | 99 |
| Welocira | 1 | 0 | 0 | 2 | — | 0 | 0 | 4 | 54 |
| Argentyn | 66 | 92 | 68 | 89 | 100 | — | 6 | 97 | 100 |
| Mozazaur | 94 | 100 | 98 | 98 | 100 | 95 | — | 99 | 100 |
| Kecalkoa | 25 | 16 | 4 | 39 | 96 | 3 | 1 | — | 97 |
| Kompsogn | 1 | 0 | 0 | 1 | 47 | 0 | 0 | 3 | — |

### Pary kontrolne (nisze)
| A | B | nowe: % A wygrywa | GPT: % A wygrywa |
|---|---|---|---|
| Kompsognat | Tyranozaur | 0 | 1 |
| Welociraptor | Protoceratops | 56 | 0 |
| Deinonych | Tenontozaur | 55 | 27 |
| Welociraptor | Kompsognat | 90 | 54 |
| Stegozaur | Allozaur | 40 | 61 |
| Triceratops | Tyranozaur | 39 | 15 |
| Ankylozaur | Tyranozaur | 51 | 39 |
| Megalodon | Liwiatan | 49 | brak |
| Smilodon | Wilk straszny | 78 | brak |
| Mamut włochaty | Smilodon | 84 | brak |
| Ichtiozaur | Tyranozaur | 0 | 97 |
| Meganeura | Trylobit | 39 | brak |
| Smok wawelski | Silezaur | 99 | brak |
| Spinozaur | Sarkozuch | 18 | 16 |
| Argentynozaur | Giganotozaur | 84 | 60 |
| Pachycefalozaur | Welociraptor | 86 | 86 |
| Kecalkoatl | Welociraptor | 99 | 96 |
| Tytanoboa | Smilodon | 37 | brak |

### Największe rozbieżności GPT vs dane realne (top 20)
| gatunek | masa kg | GPT HP/ATK/DEF/SPD | nowe HP/ATK/DEF/SPD | największa różnica |
|---|---|---|---|---|
| Ichtiozaur | 150 | 179/87/64/72 | 111/52/38/51 | attack za wysokie w GPT |
| Plateozaur | 700 | 204/51/90/25 | 131/62/42/34 | defense za wysokie w GPT |
| Diplodok | 13000 | 220/58/94/18 | 179/80/49/29 | defense za wysokie w GPT |
| Brachiozaur | 35000 | 220/57/99/18 | 198/83/51/27 | defense za wysokie w GPT |
| Brontozaur | 15000 | 214/58/92/18 | 181/82/49/27 | defense za wysokie w GPT |
| Apatozaur | 22000 | 218/58/91/18 | 189/84/50/27 | defense za wysokie w GPT |
| Dreadnoughtus | 35000 | 212/57/99/18 | 198/84/51/26 | defense za wysokie w GPT |
| Amargazaur | 2600 | 190/48/90/23 | 151/64/45/31 | defense za wysokie w GPT |
| Archelon | 2200 | 126/42/93/23 | 148/72/61/33 | defense za wysokie w GPT |
| Argentynozaur | 70000 | 214/56/92/18 | 212/92/53/24 | defense za wysokie w GPT |
| Korytozaur | 3500 | 119/42/61/71 | 156/64/46/44 | speed za wysokie w GPT |
| Oftalmozaur | 950 | 161/84/69/68 | 136/62/42/49 | defense za wysokie w GPT |
| Triceratops | 9000 | 148/57/87/46 | 172/86/56/39 | defense za wysokie w GPT |
| Edmontozaur | 6000 | 131/40/61/63 | 165/67/47/43 | attack za niskie w GPT |
| Iguanodon | 3500 | 125/45/53/67 | 156/72/46/40 | attack za niskie w GPT |
| Lambeozaur | 3000 | 121/37/56/67 | 153/63/45/44 | attack za niskie w GPT |
| Protoceratops | 85 | 148/57/84/45 | 105/55/36/44 | defense za wysokie w GPT |
| Majazaura | 3000 | 133/38/60/68 | 153/63/45/44 | attack za niskie w GPT |
| Gallimim | 440 | 74/47/29/99 | 125/49/41/65 | speed za wysokie w GPT |
| Kamarazaur | 20000 | 194/56/84/19 | 187/81/50/27 | defense za wysokie w GPT |

### Pełna tabela statystyk (154 gatunków)
| id | PL | grupa | dino? | kg | HP | ATK | DEF | SPD | unik | stado | rozm | GPT HP/ATK/DEF/SPD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tyrannosaurus-rex | Tyranozaur | teropod | tak | 8400 | 171 | 92 | 48 | 39 | 0.003 | 0.25 | 4 | 140/94/56/59 |
| tarbosaurus-bataar | Tarbozaur | teropod | tak | 5000 | 162 | 88 | 47 | 40 | 0.005 | 0 | 4 |  |
| albertosaurus-sarcophagus | Albertozaur | teropod | tak | 2000 | 147 | 76 | 44 | 48 | 0.008 | 0.45 | 3 | 114/85/47/64 |
| daspletosaurus-torosus | Daspletozaur | teropod | tak | 3000 | 153 | 85 | 45 | 40 | 0.007 | 0.25 | 3 | 122/78/51/68 |
| yutyrannus-huali | Jutyran | teropod | tak | 1400 | 141 | 76 | 43 | 45 | 0.01 | 0.25 | 3 |  |
| giganotosaurus-carolinii | Giganotozaur | teropod | tak | 7000 | 168 | 90 | 47 | 43 | 0.004 | 0.25 | 4 | 152/89/59/53 |
| carcharodontosaurus-saharicus | Karcharodontozaur | teropod | tak | 6500 | 166 | 90 | 47 | 43 | 0.004 | 0 | 4 | 148/87/57/58 |
| spinosaurus-aegyptiacus | Spinozaur | teropod | tak | 7400 | 169 | 84 | 48 | 36 | 0.004 | 0 | 4 | 144/81/58/64 |
| baryonyx-walkeri | Barionyks | teropod | tak | 1700 | 144 | 79 | 44 | 45 | 0.009 | 0 | 3 | 118/74/49/72 |
| suchomimus-tenerensis | Suchomim | teropod | tak | 3000 | 153 | 78 | 45 | 44 | 0.007 | 0 | 3 | 120/75/47/70 |
| allosaurus-fragilis | Allozaur | teropod | tak | 1700 | 144 | 78 | 44 | 48 | 0.009 | 0.25 | 3 | 128/87/46/62 |
| acrocanthosaurus-atokensis | Akrokantozaur | teropod | tak | 6000 | 165 | 92 | 47 | 40 | 0.004 | 0 | 4 | 142/93/57/58 |
| torvosaurus-tanneri | Torwozaur | teropod | tak | 3500 | 156 | 89 | 46 | 40 | 0.006 | 0 | 3 | 122/78/51/64 |
| megalosaurus-bucklandii | Megalozaur | teropod | tak | 900 | 135 | 74 | 42 | 45 | 0.012 | 0 | 3 | 134/79/49/66 |
| ceratosaurus-nasicornis | Ceratozaur | teropod | tak | 700 | 131 | 79 | 42 | 45 | 0.013 | 0 | 3 | 124/85/44/64 |
| dilophosaurus-wetherilli | Dilofozaur | teropod | tak | 400 | 124 | 70 | 40 | 50 | 0.016 | 0 | 2 | 128/83/43/69 |
| cryolophosaurus-ellioti | Kriolofozaur | teropod | tak | 500 | 127 | 70 | 41 | 50 | 0.015 | 0 | 3 | 116/86/45/62 |
| carnotaurus-sastrei | Karnotaur | teropod | tak | 1350 | 141 | 77 | 43 | 58 | 0.01 | 0 | 3 | 114/80/53/71 |
| majungasaurus-crenatissimus | Majungazaur | teropod | tak | 1100 | 138 | 74 | 43 | 45 | 0.011 | 0 | 3 | 126/80/53/67 |
| herrerasaurus-ischigualastensis | Herrerazaur | teropod | tak | 300 | 120 | 69 | 40 | 50 | 0.018 | 0 | 2 | 130/84/44/64 |
| coelophysis-bauri | Celofyz | teropod | tak | 20 | 91 | 46 | 33 | 56 | 0.039 | 0.45 | 1 | 72/58/34/99 |
| eoraptor-lunensis | Eoraptor | dinozaur-wczesny | tak | 10 | 85 | 38 | 31 | 50 | 0.046 | 0 | 1 | 72/47/34/99 |
| compsognathus-longipes | Kompsognat | teropod | tak | 3 | 76 | 38 | 28 | 58 | 0.058 | 0 | 1 | 72/57/27/99 |
| velociraptor-mongoliensis | Welociraptor | teropod | tak | 20 | 91 | 52 | 33 | 56 | 0.039 | 0.25 | 1 | 72/60/25/99 |
| deinonychus-antirrhopus | Deinonych | teropod | tak | 75 | 104 | 65 | 36 | 55 | 0.028 | 0.45 | 2 | 72/54/35/99 |
| utahraptor-ostrommaysorum | Utahraptor | teropod | tak | 500 | 127 | 75 | 41 | 46 | 0.015 | 0.45 | 3 | 130/84/52/64 |
| troodon-formosus | Troodon | teropod | tak | 50 | 99 | 46 | 35 | 59 | 0.031 | 0 | 2 |  |
| microraptor-gui | Mikroraptor | teropod | tak | 1 | 72 | 35 | 25 | 64 | 0.111 | 0 | 1 |  |
| archaeopteryx-lithographica | Archeopteryks | ptak | tak | 0.8 | 72 | 34 | 25 | 65 | 0.114 | 0 | 1 |  |
| sinosauropteryx-prima | Sinozauropteryks | teropod | tak | 0.6 | 72 | 32 | 24 | 56 | 0.078 | 0 | 1 |  |
| mononykus-olecranus | Mononyk | teropod | tak | 3.5 | 77 | 31 | 29 | 62 | 0.057 | 0 | 1 |  |
| oviraptor-philoceratops | Owiraptor | teropod | tak | 35 | 96 | 45 | 34 | 56 | 0.034 | 0 | 2 | 72/56/29/99 |
| gallimimus-bullatus | Gallimim | teropod | tak | 440 | 125 | 49 | 41 | 65 | 0.016 | 0 | 2 | 74/47/29/99 |
| struthiomimus-altus | Strutiomim | teropod | tak | 150 | 111 | 43 | 38 | 66 | 0.023 | 0 | 2 | 72/50/28/99 |
| ornithomimus-velox | Ornitomim | teropod | tak | 170 | 113 | 44 | 38 | 66 | 0.022 | 0 | 2 | 74/52/30/99 |
| deinocheirus-mirificus | Deinocheir | teropod | tak | 6400 | 166 | 75 | 47 | 32 | 0.004 | 0 | 4 |  |
| therizinosaurus-cheloniformis | Terizinozaur | teropod | tak | 5000 | 162 | 78 | 47 | 32 | 0.005 | 0 | 4 | 134/74/58/62 |
| smok-wawelski | Smok wawelski | archozaur | ? | 500 | 127 | 75 | 41 | 42 | 0.015 | 0 | 3 |  |
| plateosaurus-engelhardti | Plateozaur | prozauropod | tak | 700 | 131 | 62 | 42 | 34 | 0.013 | 0 | 3 | 204/51/90/25 |
| massospondylus-carinatus | Massospondyl | prozauropod | tak | 350 | 122 | 52 | 40 | 35 | 0.017 | 0 | 2 |  |
| mamenchisaurus-sinocanadorum | Mamenchizaur | zauropod | tak | 25000 | 191 | 76 | 51 | 27 | 0.001 | 0 | 5F |  |
| brachiosaurus-altithorax | Brachiozaur | zauropod | tak | 35000 | 198 | 83 | 51 | 27 | 0.001 | 0 | 5F | 220/57/99/18 |
| diplodocus-carnegii | Diplodok | zauropod | tak | 13000 | 179 | 80 | 49 | 29 | 0.002 | 0 | 4 | 220/58/94/18 |
| apatosaurus-louisae | Apatozaur | zauropod | tak | 22000 | 189 | 84 | 50 | 27 | 0.001 | 0 | 4F | 218/58/91/18 |
| brontosaurus-excelsus | Brontozaur | zauropod | tak | 15000 | 181 | 82 | 49 | 27 | 0.002 | 0 | 4 | 214/58/92/18 |
| camarasaurus-supremus | Kamarazaur | zauropod | tak | 20000 | 187 | 81 | 50 | 27 | 0.001 | 0 | 4F | 194/56/84/19 |
| europasaurus-holgeri | Europazaur | zauropod | tak | 800 | 133 | 56 | 42 | 32 | 0.013 | 0 | 3 | 174/48/77/32 |
| amargasaurus-cazaui | Amargazaur | zauropod | tak | 2600 | 151 | 64 | 45 | 31 | 0.007 | 0 | 3 | 190/48/90/23 |
| nigersaurus-taqueti | Nigerzaur | zauropod | tak | 4000 | 158 | 65 | 46 | 30 | 0.006 | 0 | 3 |  |
| saltasaurus-loricatus | Saltazaur | zauropod | tak | 3500 | 156 | 64 | 62 | 30 | 0.006 | 0 | 3A | 192/53/86/18 |
| alamosaurus-sanjuanensis | Alamozaur | zauropod | tak | 38000 | 200 | 84 | 52 | 26 | 0.001 | 0 | 5F |  |
| argentinosaurus-huinculensis | Argentynozaur | zauropod | tak | 70000 | 212 | 92 | 53 | 24 | 0 | 0 | 5F | 214/56/92/18 |
| patagotitan-mayorum | Patagotytan | zauropod | tak | 57000 | 208 | 91 | 53 | 25 | 0 | 0 | 5F |  |
| dreadnoughtus-schrani | Dreadnoughtus | zauropod | tak | 35000 | 198 | 84 | 51 | 26 | 0.001 | 0 | 5F | 212/57/99/18 |
| psittacosaurus-mongoliensis | Psitakozaur | ceratops | tak | 20 | 91 | 40 | 33 | 49 | 0.039 | 0 | 1 |  |
| protoceratops-andrewsi | Protoceratops | ceratops | tak | 85 | 105 | 55 | 36 | 44 | 0.027 | 0 | 2 | 148/57/84/45 |
| triceratops-horridus | Triceratops | ceratops | tak | 9000 | 172 | 86 | 56 | 39 | 0.003 | 0 | 4 | 148/57/87/46 |
| torosaurus-latus | Torozaur | ceratops | tak | 7000 | 168 | 83 | 55 | 39 | 0.004 | 0 | 4 | 156/67/86/40 |
| styracosaurus-albertensis | Styrakozaur | ceratops | tak | 2700 | 152 | 77 | 45 | 44 | 0.007 | 0 | 3 | 148/63/79/41 |
| centrosaurus-apertus | Centrozaur | ceratops | tak | 2300 | 149 | 71 | 45 | 44 | 0.008 | 0 | 3 | 160/63/79/47 |
| pachyrhinosaurus-canadensis | Pachyrinozaur | ceratops | tak | 3000 | 153 | 75 | 45 | 40 | 0.007 | 0 | 3 |  |
| chasmosaurus-belli | Chasmozaur | ceratops | tak | 2000 | 147 | 63 | 44 | 44 | 0.008 | 0 | 3 | 152/65/81/39 |
| pentaceratops-sternbergii | Pentaceratops | ceratops | tak | 5000 | 162 | 81 | 47 | 40 | 0.005 | 0 | 4 | 140/66/80/43 |
| kosmoceratops-richardsoni | Kosmoceratops | ceratops | tak | 1500 | 142 | 67 | 44 | 45 | 0.01 | 0 | 3 |  |
| sinoceratops-zhuchengensis | Sinoceratops | ceratops | tak | 2000 | 147 | 70 | 44 | 41 | 0.008 | 0 | 3 |  |
| stegosaurus-stenops | Stegozaur | stegozaur | tak | 3500 | 156 | 76 | 54 | 33 | 0.006 | 0 | 3 | 154/63/76/25 |
| kentrosaurus-aethiopicus | Kentrozaur | stegozaur | tak | 1100 | 138 | 72 | 51 | 34 | 0.011 | 0 | 3 | 140/65/77/23 |
| miragaia-longicollum | Miragaia | stegozaur | tak | 2000 | 147 | 73 | 52 | 33 | 0.008 | 0 | 3 |  |
| ankylosaurus-magniventris | Ankylozaur | ankylozaur | tak | 6000 | 165 | 79 | 71 | 28 | 0.004 | 0 | 4A | 158/59/97/28 |
| euoplocephalus-tutus | Euoplocefal | ankylozaur | tak | 2500 | 150 | 74 | 69 | 29 | 0.007 | 0 | 3A | 152/55/99/27 |
| nodosaurus-textilis | Nodozaur | ankylozaur | tak | 3000 | 153 | 58 | 69 | 29 | 0.007 | 0 | 3A | 154/52/99/28 |
| edmontonia-rugosidens | Edmontonia | ankylozaur | tak | 3000 | 153 | 70 | 69 | 29 | 0.007 | 0 | 3A | 166/53/99/25 |
| heterodontosaurus-tucki | Heterodontozaur | ornitopod | tak | 3.5 | 77 | 33 | 29 | 58 | 0.057 | 0 | 1 |  |
| hypsilophodon-foxii | Hypsilofodon | ornitopod | tak | 20 | 91 | 33 | 33 | 56 | 0.039 | 0 | 1 | 135/39/61/68 |
| tenontosaurus-tilletti | Tenontozaur | ornitopod | tak | 1000 | 136 | 59 | 43 | 41 | 0.011 | 0 | 3 | 121/43/54/73 |
| iguanodon-bernissartensis | Iguanodon | ornitopod | tak | 3500 | 156 | 72 | 46 | 40 | 0.006 | 0 | 3 | 125/45/53/67 |
| ouranosaurus-nigeriensis | Ouranozaur | ornitopod | tak | 2200 | 148 | 62 | 45 | 41 | 0.008 | 0 | 3 | 131/42/61/65 |
| maiasaura-peeblesorum | Majazaura | hadrozaur | tak | 3000 | 153 | 63 | 45 | 44 | 0.007 | 0 | 3 | 133/38/60/68 |
| edmontosaurus-annectens | Edmontozaur | hadrozaur | tak | 6000 | 165 | 67 | 47 | 43 | 0.004 | 0 | 4 | 131/40/61/63 |
| parasaurolophus-walkeri | Parazaurolof | hadrozaur | tak | 2600 | 151 | 63 | 45 | 44 | 0.007 | 0 | 3 | 137/43/53/73 |
| corythosaurus-casuarius | Korytozaur | hadrozaur | tak | 3500 | 156 | 64 | 46 | 44 | 0.006 | 0 | 3 | 119/42/61/71 |
| lambeosaurus-lambei | Lambeozaur | hadrozaur | tak | 3000 | 153 | 63 | 45 | 44 | 0.007 | 0 | 3 | 121/37/56/67 |
| saurolophus-osborni | Zaurolof | hadrozaur | tak | 2500 | 150 | 62 | 45 | 44 | 0.007 | 0 | 3 | 133/38/57/67 |
| shantungosaurus-giganteus | Szantungozaur | hadrozaur | tak | 13000 | 179 | 77 | 49 | 39 | 0.002 | 0 | 4 |  |
| pachycephalosaurus-wyomingensis | Pachycefalozaur | pachycefalozaur | tak | 450 | 125 | 64 | 41 | 46 | 0.016 | 0 | 2 | 120/60/60/66 |
| stygimoloch-spinifer | Stygimoloch | pachycefalozaur | tak | 80 | 104 | 51 | 36 | 51 | 0.027 | 0 | 2 | 122/55/66/70 |
| silesaurus-opolensis | Silezaur | dinozaurokształtny | ? | 15 | 88 | 39 | 32 | 53 | 0.042 | 0 | 1 |  |
| dimorphodon-macronyx | Dimorfodon | pterozaur | NIE | 1.5 | 72 | 42 | 26 | 57 | 0.106 | 0 | 1 | 82/48/29/99 |
| rhamphorhynchus-muensteri | Ramforynch | pterozaur | NIE | 1 | 72 | 38 | 25 | 64 | 0.111 | 0 | 1 | 82/45/32/99 |
| pterodactylus-antiquus | Pterodaktyl | pterozaur | NIE | 1 | 72 | 31 | 25 | 61 | 0.111 | 0 | 1 | 72/49/36/99 |
| pteranodon-longiceps | Pteranodon | pterozaur | NIE | 35 | 96 | 45 | 34 | 68 | 0.074 | 0.25 | 2 | 76/45/37/99 |
| nyctosaurus-gracilis | Nyktozaur | pterozaur | NIE | 2 | 74 | 26 | 27 | 67 | 0.103 | 0 | 1 | 86/45/34/99 |
| tapejara-wellnhoferi | Tapejara | pterozaur | NIE | 1 | 72 | 29 | 25 | 61 | 0.111 | 0 | 1 | 84/44/35/99 |
| tropeognathus-mesembrinus | Tropeognat | pterozaur | NIE | 40 | 97 | 53 | 35 | 68 | 0.073 | 0 | 2 | 88/49/36/99 |
| anhanguera-santanae | Anhanguera | pterozaur | NIE | 12 | 86 | 47 | 32 | 66 | 0.084 | 0 | 1 | 72/49/39/99 |
| quetzalcoatlus-northropi | Kecalkoatl | pterozaur | NIE | 250 | 118 | 65 | 39 | 74 | 0.059 | 0 | 2 | 118/57/44/85 |
| hatzegopteryx-thambema | Hatzegopteryx | pterozaur | NIE | 250 | 118 | 72 | 39 | 74 | 0.059 | 0 | 2 | 116/63/40/92 |
| nothosaurus-mirabilis | Notozaur | notozaur | NIE | 150 | 111 | 59 | 38 | 36 | 0.023 | 0 | 2 | 126/53/55/73 |
| plesiosaurus-dolichodeirus | Plezjozaur | plezjozaur | NIE | 450 | 125 | 58 | 41 | 35 | 0.016 | 0 | 2 | 134/57/48/71 |
| elasmosaurus-platyurus | Elasmozaur | plezjozaur | NIE | 2000 | 147 | 73 | 44 | 33 | 0.008 | 0 | 3 | 136/58/57/72 |
| liopleurodon-ferox | Liopleurodon | pliozaur | NIE | 1700 | 144 | 82 | 44 | 37 | 0.009 | 0 | 3 | 161/93/63/59 |
| pliosaurus-funkei | Pliozaur | pliozaur | NIE | 12000 | 177 | 94 | 49 | 35 | 0.002 | 0 | 4 | 167/87/66/68 |
| kronosaurus-queenslandicus | Kronozaur | pliozaur | NIE | 11000 | 176 | 93 | 49 | 35 | 0.003 | 0 | 4 | 169/86/70/67 |
| ichthyosaurus-communis | Ichtiozaur | ichtiozaur | NIE | 150 | 111 | 52 | 38 | 51 | 0.023 | 0 | 2 | 179/87/64/72 |
| ophthalmosaurus-icenicus | Oftalmozaur | ichtiozaur | NIE | 950 | 136 | 62 | 42 | 49 | 0.012 | 0 | 3 | 161/84/69/68 |
| shonisaurus-popularis | Szonizaur | ichtiozaur | NIE | 30000 | 195 | 80 | 51 | 34 | 0.001 | 0 | 5 | 197/90/76/56 |
| mosasaurus-hoffmannii | Mozazaur | mozazaur | NIE | 10000 | 174 | 93 | 48 | 43 | 0.003 | 0 | 4 | 173/94/64/59 |
| tylosaurus-proriger | Tylozaur | mozazaur | NIE | 7000 | 168 | 92 | 47 | 43 | 0.004 | 0 | 4 | 169/94/62/59 |
| archelon-ischyros | Archelon | zolw | NIE | 2200 | 148 | 72 | 61 | 33 | 0.008 | 0 | 3A | 126/42/93/23 |
| dunkleosteus-terrelli | Dunkleosteus | ryba | NIE | 1000 | 136 | 79 | 59 | 38 | 0.011 | 0 | 3A |  |
| helicoprion-bessonovi | Helikoprion | ryba | NIE | 1000 | 136 | 72 | 43 | 41 | 0.011 | 0 | 3 |  |
| leedsichthys-problematicus | Leedsichthys | ryba | NIE | 45000 | 203 | 55 | 52 | 30 | 0 | 0 | 5 | 178/38/59/61 |
| otodus-megalodon | Megalodon | ryba | NIE | 50000 | 205 | 99 | 52 | 41 | 0 | 0 | 5 |  |
| livyatan-melvillei | Liwiatan | ssak | NIE | 50000 | 205 | 99 | 52 | 41 | 0 | 0 | 5 |  |
| basilosaurus-cetoides | Bazylozaur | ssak | NIE | 15000 | 181 | 95 | 49 | 39 | 0.002 | 0 | 4 |  |
| postosuchus-kirkpatricki | Postozuch | pseudozuch | NIE | 680 | 131 | 77 | 42 | 42 | 0.013 | 0 | 3 | 148/85/73/40 |
| polonosuchus-silesiacus | Polonozuch | pseudozuch | NIE | 700 | 131 | 77 | 42 | 42 | 0.013 | 0 | 3 |  |
| kaprosuchus-saharicus | Kaprozuch | krokodylomorf | NIE | 1000 | 136 | 79 | 51 | 38 | 0.011 | 0 | 3 |  |
| sarcosuchus-imperator | Sarkozuch | krokodylomorf | NIE | 4000 | 158 | 87 | 62 | 32 | 0.006 | 0 | 3A | 162/86/79/37 |
| deinosuchus-riograndensis | Deinozuch | krokodylomorf | NIE | 5000 | 162 | 88 | 63 | 32 | 0.005 | 0 | 4A | 158/84/85/36 |
| purussaurus-brasiliensis | Purusaurus | krokodylomorf | NIE | 7000 | 168 | 90 | 63 | 32 | 0.004 | 0 | 4A |  |
| titanoboa-cerrejonensis | Tytanoboa | luskonosny | NIE | 1100 | 138 | 79 | 43 | 28 | 0.011 | 0 | 3 |  |
| varanus-priscus | Megalania | luskonosny | NIE | 500 | 127 | 70 | 41 | 38 | 0.015 | 0 | 3 |  |
| tanystropheus-longobardicus | Tanystrof | gad-inny | NIE | 140 | 111 | 59 | 38 | 32 | 0.023 | 0 | 2 | 112/49/52/68 |
| dimetrodon-grandis | Dimetrodon | synapsyd | NIE | 250 | 118 | 65 | 39 | 35 | 0.019 | 0 | 2 | 116/74/48/46 |
| edaphosaurus-pogonias | Edafozaur | synapsyd | NIE | 300 | 120 | 46 | 40 | 31 | 0.018 | 0 | 2 | 128/66/58/47 |
| moschops-capensis | Moschops | synapsyd | NIE | 900 | 135 | 61 | 42 | 30 | 0.012 | 0 | 3 |  |
| inostrancevia-alexandri | Inostrancewia | synapsyd | NIE | 300 | 120 | 73 | 40 | 43 | 0.018 | 0 | 2 |  |
| lystrosaurus-murrayi | Lystrozaur | synapsyd | NIE | 50 | 99 | 42 | 35 | 33 | 0.031 | 0 | 2 |  |
| lisowicia-bojani | Lisowicja | synapsyd | NIE | 9000 | 172 | 76 | 48 | 32 | 0.003 | 0 | 4 |  |
| eryops-megacephalus | Eryops | plaz | NIE | 90 | 106 | 60 | 37 | 31 | 0.027 | 0 | 2 |  |
| diplocaulus-magnicornis | Diplokaulus | plaz | NIE | 5 | 80 | 40 | 29 | 34 | 0.053 | 0 | 1 |  |
| metoposaurus-krasiejowensis | Metopozaur | plaz | NIE | 60 | 101 | 58 | 36 | 31 | 0.03 | 0 | 2 |  |
| anomalocaris-canadensis | Anomalokaris | stawonog | NIE | 0.5 | 72 | 36 | 24 | 34 | 0.08 | 0 | 1 |  |
| trilobita | Trylobit | stawonog | NIE | 0.05 | 72 | 24 | 34 | 33 | 0.113 | 0 | 1A |  |
| ammonoidea | Amonit | mieczak | NIE | 2 | 74 | 36 | 43 | 32 | 0.063 | 0 | 1A |  |
| jaekelopterus-rhenaniae | Jaekelopterus | stawonog | NIE | 100 | 107 | 57 | 45 | 32 | 0.026 | 0 | 2 |  |
| meganeura-monyi | Meganeura | stawonog | NIE | 0.03 | 72 | 24 | 24 | 68 | 0.162 | 0 | 1 |  |
| arthropleura-armata | Artropleura | stawonog | NIE | 50 | 99 | 37 | 51 | 29 | 0.031 | 0 | 2A |  |
| gastornis-giganteus | Gastornis | ptak | tak | 175 | 113 | 57 | 38 | 43 | 0.022 | 0 | 2 |  |
| phorusrhacos-longissimus | Forusrak | ptak | tak | 130 | 110 | 70 | 38 | 62 | 0.024 | 0 | 2 |  |
| andrewsarchus-mongoliensis | Andrewsarch | ssak | NIE | 500 | 127 | 70 | 41 | 46 | 0.015 | 0 | 3 |  |
| paraceratherium-transouralicum | Indrikoterium | ssak | NIE | 17000 | 184 | 83 | 50 | 39 | 0.002 | 0 | 4 |  |
| deinotherium-giganteum | Deinoterium | ssak | NIE | 10000 | 174 | 83 | 48 | 39 | 0.003 | 0 | 4 |  |
| mammuthus-primigenius | Mamut włochaty | ssak | NIE | 6000 | 165 | 83 | 55 | 43 | 0.004 | 0 | 4 |  |
| coelodonta-antiquitatis | Nosorożec włochaty | ssak | NIE | 2500 | 150 | 77 | 53 | 52 | 0.007 | 0 | 3 |  |
| megaloceros-giganteus | Jeleń olbrzymi | ssak | NIE | 600 | 129 | 61 | 41 | 68 | 0.014 | 0 | 3 |  |
| ursus-spelaeus | Niedźwiedź jaskiniowy | ssak | NIE | 500 | 127 | 66 | 41 | 53 | 0.015 | 0 | 3 |  |
| panthera-spelaea | Lew jaskiniowy | ssak | NIE | 300 | 120 | 76 | 40 | 65 | 0.018 | 0.25 | 2 |  |
| smilodon-fatalis | Smilodon | ssak | NIE | 280 | 119 | 75 | 39 | 58 | 0.019 | 0.25 | 2 |  |
| aenocyon-dirus | Wilk straszny | ssak | NIE | 68 | 103 | 58 | 36 | 66 | 0.029 | 0.45 | 2 |  |
| megatherium-americanum | Megaterium | ssak | NIE | 4000 | 158 | 78 | 46 | 29 | 0.006 | 0 | 3 |  |
| glyptodon-clavipes | Gliptodont | ssak | NIE | 2000 | 147 | 67 | 68 | 29 | 0.008 | 0 | 3A |  |
| diprotodon-optatum | Diprotodon | ssak | NIE | 2700 | 152 | 68 | 45 | 37 | 0.007 | 0 | 3 |  |
