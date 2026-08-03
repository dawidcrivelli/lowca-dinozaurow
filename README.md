# Łowca Dinozaurów

Interaktywny tracker prehistorycznych zwierząt dla dzieci — odpowiednik googlowego
„Catch Pokémon", tylko z mezozoikiem. Dziecko wpisuje nazwę zwierzaka, rzuca w niego
jajem, a złapany gatunek trafia do kolekcji jako kolorowy rysunek.

## Co jest w środku

- **116 gatunków** — teropody, zauropody, ceratopsy, ankylozaury, stegozaury,
  hadrozaury, pachycefalozaury, pterozaury, gady morskie, krokodylomorfy plus
  kilku słynnych gości z innych epok (Dimetrodon, Meganeura, Dunkleosteus,
  Megalodon, Mamut, Smilodon, Trylobit). Nazwy polskie jako główne, łacina obok.
  Dobór pod kątem tego, co dzieci znają z książek — bez egzotycznych nazw.
- **Wyszukiwarka odporna na literówki** — Levenshtein + normalizacja polskich
  znaków + aliasy (`trex`, `t rex`, `rex`, `tyranozaur`… wszystko trafia w T. rexa).
  Podpowiedzi pojawiają się w trakcie pisania.
- **Animacja łapania** — jajo leci po łuku, kołysze się, pęka, błysk, confetti
  i ryk generowany przez WebAudio. Rodzaj jaja (kolor i grubość skorupy) zależy
  od rzadkości gatunku: zwykłe → mszyste → bursztynowe → ogniste.
- **Rysunki proceduralne** — każdy gatunek to deterministyczny SVG budowany
  z archetypu i palety. Nie ma generowania obrazów przez API, więc rysunki
  **nigdy się nie zmieniają** między sesjami. Przy złapaniu paleta jest dodatkowo
  zapisywana w stanie, więc kolory przetrwają nawet zmianę silnika.
- **Podpowiedzi** — niezłapane gatunki są wyszarzonymi sylwetkami. Kliknięcie
  pokazuje relacyjną podpowiedź w stylu *„Kuzyn ankylozaura — też pancerz
  i maczuga"*, grupę, dietę, rozmiar i rzadkość. Jest też przycisk
  „Pokaż pierwszą literę".
- **Pasek postępu jako warstwa skalna** z jajami odkrywanymi na 25/50/75/100%,
  plus rangi od Praktykanta do Legendy mezozoiku.
- **Tryb rodzica** (⚙️ w nagłówku) — dodawanie brakującego ulubieńca (wybór
  archetypu rysunku i grupy), usuwanie gatunków z listy, przywracanie usuniętych,
  eksport/import postępu do JSON, reset.
- **Arena** (⚔️) — pojedynki w stylu Pokémona. Pięć typów w pięciokącie:
  **Drapieżnik → Olbrzym → Pancerz → Zwinny → Wodniak → Drapieżnik**, każdy bije
  dwa następne w kółku. Wynik = siła (z rozmiaru i typu) + rzut kostką + bonus
  za przewagę typu. Każde starcie dostaje krótkie uzasadnienie po polsku
  („Pancerz maczugą trafia nawet zwinnych").

Pterozaury, gady morskie i dimetrodon mają **własne etykiety grupy**, żeby dzieci
nie utrwaliły sobie, że to dinozaury.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Bez budowania, bez zależności.

## Wersja jednoplikowa

```bash
node build.js              # -> dist/lowca-dinozaurow.html
node build.js --no-fonts   # to samo, ale bez linku do Google Fonts (offline/artefakt)
```

Wynik to jeden plik HTML (~118 kB) z całym CSS-em i JS-em w środku.

## Struktura

| plik | co robi |
|---|---|
| `index.html` | szkielet strony |
| `css/app.css` | design system: warstwy skalne, płyty z odciskiem, bursztyn + petrol green |
| `js/data.js` | 116 gatunków + palety + słowniki grup/diet/typów |
| `js/art.js` | silnik rysunków SVG (21 archetypów) + jaja |
| `js/app.js` | logika: wyszukiwanie, łapanie, kolekcja, tryb rodzica, arena |
| `build.js` | sklejanie do jednego pliku |
| `tmp/` | narzędzia QA (podgląd wszystkich gatunków, zrzuty UI przez headless Chrome) |

## Silnik rysunków

`drawSpecies(sp, mode, pal)` renderuje SVG 200×140, zwierzę patrzy w prawo.
Render jest dwuprzebiegowy: najpierw **wspólny ciemny kontur** wszystkich części,
potem wypełnienia w jego środku — dzięki temu nie ma szwów wewnątrz ciała.
Szyje, nogi i ogony to grube kreski z okrągłymi końcami (`TAP`), więc zawsze
łączą się z korpusem. Tryb `'ghost'` rysuje tylko pierwszy przebieg, czyli
prawdziwą sylwetkę zwierzęcia — to pomaga dziecku zgadywać.

Dodanie gatunku: dopisz wiersz do `RAW` w `js/data.js`:

```js
['id','Polska nazwa','Latina','archetyp',{p:6,/*opcje*/},
 'podpowiedź','ciekawostka', rzadkość1_4, 'typArena', 'grupa', 'dieta', długośćM, ['aliasy']],
```

## Narzędzia QA

```bash
node tmp/render_all.js            # arkusz ze wszystkimi gatunkami -> tmp/sheet.html
node tmp/render_all.js thero      # tylko jeden archetyp / id
tmp/shot.sh tmp/sheet.html tmp/sheet.png 1500 1900
node tmp/ui_shot.js               # zrzuty ekranu UI (headless Chrome przez CDP)
```

## Zapis stanu

`localStorage` pod kluczem `dinoTracker.v1`, z fallbackiem na `window.storage`
(dla środowisk typu artefakt) i na pamięć RAM. Trzymane są: złapane gatunki
(z paletą), gatunki dodane i usunięte przez rodzica oraz licznik zwycięstw w arenie.
