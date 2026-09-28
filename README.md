# Łowca Pokémonów

Gra dla dzieci: wpisz imię Pokémona, rzuć Poké Ballem, złap go do Pokédexu, wystaw na arenę.
Wersja Pokémon [Łowcy Dinozaurów](https://dawidcrivelli.github.io/lowca-dinozaurow/) (gałąź `pokemon`).

**Zagraj:** https://dawidcrivelli.github.io/lowca-pokemonow/

## Co jest w środku

- **151 Pokémonów z Kanto** (Red/Blue, seria Indigo) — niezłapane to czarne sylwetki: „Kto to za Pokémon?”.
- **Polskie podpowiedzi i ciekawostki** z Pokédexu; filtr po typach; wyszukiwarka odporna na literówki.
- **Poké Ball wg rzadkości**: Poké / Great / Ultra / Master Ball (legendarne).
- **Arena** — statystyki bazowe z gier i prawdziwa tabela typów (Wodny ×2 na Ognistego…); teren daje premię swoim typom
  (Wyspa Cynamonowa: 🔥, Góra Księżycowa: 🪨🪽🧚…). Tryby ▶️ oglądam / 👆 walczę, widok 2D albo 3D.
- **Oryginalne okrzyki** z Red/Blue.
- **Tryb rodzica** — przytrzymaj ⚙️ przez sekundę: ukrywanie Pokémonów, zapis/odczyt pliku, reset.

## Uruchomienie

Otwórz `index.html` w przeglądarce — bez budowania. Obrazki i głosy ładują się z repozytoriów [PokeAPI](https://github.com/PokeAPI) (potrzebny internet przy pierwszym obejrzeniu).

## Struktura

| plik | co robi |
|---|---|
| `js/species.js` | Pokédex (generowany: `node tmp/fetch.js && node tmp/build_species.js`; polskie teksty w `tmp/pl.json`) |
| `js/battle.js` | typy, tereny, silnik walki, bez DOM; strojenie: `TUNE`, potem `node tmp/sim.js` |
| `js/app.js` | interfejs: łowy, Pokédex, karty, arena, tryb rodzica |
| `js/arena3d.js`, `vendor/three.min.js` | widok walki 3D: wytłoczone grafiki Pokémonów na terenie low-poly |
| `js/voices.js`, `sounds/` | okrzyki (PokeAPI) i odgłosy walki (CC0) |

Zrzuty ekranu: `node tmp/ui_shot.js [tmp/ui_steps_3d.json]`.

Pokémon © Nintendo / Game Freak / The Pokémon Company. Fanowska, niekomercyjna gra dla dzieci.
