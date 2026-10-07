# Łowca Dinozaurów

Gra dla dzieci: wpisz nazwę prehistorycznego zwierzaka, rzuć w niego jajem, złap go do kolekcji, wystaw na arenę.

**Zagraj:** https://dawidcrivelli.github.io/lowca-dinozaurow/

## Co jest w środku

- **155 gatunków** — dinozaury, pterozaury, gady morskie, ssaki epoki lodowcowej i inni, w tym znaleziska z Polski
  (Smok wawelski, Silezaur, Polonozuch, Lisowicja). Zwierzęta, które nie są dinozaurami, mają to napisane na karcie.
- **Prawdziwe rozmiary** — długość, wysokość, waga i epoka według aktualnych szacunków naukowych.
- **Wyszukiwarka** odporna na literówki i brak polskich znaków; łapie dopiero po wpisaniu większości nazwy.
- **Arena** — walka rundami z paskami życia, terenami, atakami specjalnymi i unikami. Statystyki wynikają z masy,
  uzbrojenia, pancerza i prędkości zwierzęcia. Zawodników wybiera się obrazkami, więc nie trzeba umieć czytać.
  Dwa tryby: ▶️ oglądam (walka automatyczna) i 👆 walczę (co rundę atak / specjalny / obrona).
- **Tryb rodzica** — przytrzymaj ⚙️ przez sekundę: własne zwierzęta, ukrywanie gatunków, zapis/odczyt pliku, reset.
  Wczytuje też zapisy z poprzednich wersji (Opus i ChatGPT).
- Działa offline po pierwszym otwarciu i da się dodać do ekranu głównego.

## Uruchomienie

Otwórz `index.html` w przeglądarce — bez budowania i zależności. `node build.js` skleja wszystko w `dist/lowca-dinozaurow.html`.

## Struktura

| plik | co robi |
|---|---|
| `js/species.js` | dane gatunków (generowane: `node tmp/build_species.js` z `tmp/review/species.json`) |
| `js/battle.js` | statystyki z prawdziwych danych + silnik walki, bez DOM |
| `js/art.js`, `js/artspec.js` | proceduralne rysunki SVG; `artspec.js` przypisuje rysunek do gatunku |
| `js/app.js` | interfejs: łowy, kolekcja, karty, arena, tryb rodzica, zapis |
| `js/arena3d.js`, `vendor/three.min.js` | opcjonalny widok walki 3D (przełącznik 🖼️/🧊 w arenie); usunięcie = skasuj oba pliki i linie z `Arena3D` |
| `sw.js` | pamięć podręczna offline |

## Strojenie walki

Zmień `TUNE` w `js/battle.js`, potem `node tmp/sim.js` — pokazuje wyniki kontrolnych pojedynków (np. tyranozaur vs triceratops)
i średnią skuteczność kategorii i diet na tym samym silniku, którego używa gra.
Ulubieńcy z ręcznie wpisanymi statystykami: `STARS` w `js/battle.js` (np. Albertozaur). Arkusz wszystkich rysunków: `node tmp/art/sheet.js`.
