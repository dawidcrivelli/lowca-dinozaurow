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
- **Karty** z zestawu „Pokémon 151” (Scarlet & Violet, 2023): u góry przełącznik 🎨 Pokémony / 🃏 Karty
  (siatka i karta Pokémona); dotknij karty lub obrazka → pełny ekran.
- **Walka kartami** (🃏 w nagłówku) — uproszczone zasady Battle Academy: drużyna 3 Pokémonów Podstawowych, co turę
  energia, ewolucja (tylko w złapane!), odwrót, ataki z prawdziwym kosztem i obrażeniami, słabość ×2, 3 nagrody (ex daje 2).
- **Oryginalne okrzyki** z Red/Blue.
- **Tryb rodzica** — przytrzymaj ⚙️ przez sekundę: ukrywanie Pokémonów, zapis/odczyt pliku, reset.

## Uruchomienie

Otwórz `index.html` w przeglądarce — bez budowania. Obrazki i głosy ładują się z repozytoriów [PokeAPI](https://github.com/PokeAPI), karty z [pokemontcg.io](https://pokemontcg.io) (potrzebny internet przy pierwszym obejrzeniu).

## Struktura

| plik | co robi |
|---|---|
| `js/species.js` | Pokédex (generowany: `node tmp/fetch.js && node tmp/build_species.js`; polskie teksty w `tmp/pl.json`, nazwy ataków w `tmp/attacks_pl.json`) |
| `js/battle.js` | typy, tereny, silnik walki, bez DOM; strojenie: `TUNE`, potem `node tmp/sim.js` |
| `js/cards.js` | zasady walki kartami, bez DOM; `node tmp/sim_cards.js` — długość gier komputer vs komputer |
| `js/app.js` | interfejs: łowy, Pokédex, karty, arena, walka kartami, tryb rodzica |
| `js/arena3d.js`, `vendor/three.min.js` | widok walki 3D: wytłoczone grafiki Pokémonów na terenie low-poly |
| `js/voices.js`, `sounds/` | okrzyki (PokeAPI) i odgłosy walki (CC0) |

Zrzuty ekranu: `node tmp/ui_shot.js [ui_steps_3d.json | ui_steps_cards.json]`.

Pokémon © Nintendo / Game Freak / The Pokémon Company. Fanowska, niekomercyjna gra dla dzieci.
