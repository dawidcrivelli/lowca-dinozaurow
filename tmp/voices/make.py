"""Wybrane nagrania CC0 (tmp/voices/cand) → sounds/<głos>.mp3: najgłośniejszy fragment, wyciszenie brzegów, normalizacja, mono.
Wybór kandydata (indeks z fetch.py) ręcznie po tytule/opisie – zmień PICK i uruchom ponownie. Tworzy też sounds/CREDITS.md.
użycie: python3 tmp/voices/make.py"""
import json, os, subprocess, array, math

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..'); OUT = os.path.join(ROOT, 'sounds')
RATE, FADE_IN, FADE_OUT, PEAK, WIN = 44100, .02, .25, .89, .05
TRIM, TAIL = .01, 3   # ~ −20 dB: cichsze brzegi to tło, nie zwierzę; +3 bloki (150 ms) naturalnego wygasania
PICK = {   # głos → [(kandydat, maks. długość s[, lista kandydatów gdy inna niż głos]), …]; warianty losowane, walka mniej się powtarza
    'bigroar': [(0, 3.5, 'roar'), (4, 3.5, 'roar'), (7, 3.0, 'roar')], 'roar': [(2, 2.2), (3, 1.2), (8, 1.5)],
    'growl': [(1, 2.2), (3, 2.2), (8, 2.2)], 'screech': [(2, 1.8), (1, 1.8), (8, 1.2, 'roar')], 'shriek': [(1, 1.8), (0, 1.8), (4, 1.8)],
    'bellow': [(0, 2.5), (5, 2.5, 'grunt'), (5, 2.5, 'trumpet')], 'honk': [(2, 1.8), (4, 1.0), (7, 1.8)],
    'grunt': [(2, 1.4), (6, 1.7), (1, 2.0)], 'hiss': [(1, 2.0), (0, 2.0), (5, 2.0)], 'whale': [(0, 3.0), (9, 2.5), (3, 2.0), (8, 1.0)],
    'trumpet': [(0, 2.0), (1, 2.5), (4, 1.2)], 'moo': [(0, 2.2), (2, 2.2), (8, 2.2)], 'click': [(0, 1.5), (3, 1.5), (1, 1.5)],
    'bubble': [(2, 1.5), (0, 1.5), (4, 1.2)], 'splash': [(5, .9, 'bubble'), (6, .9, 'bubble')],
    'hit': [(3, .7), (2, .6), (8, .5)], 'whoosh': [(1, .6), (8, .6), (2, .6)],
}
cand = json.load(open(os.path.join(HERE, 'cand.json')))
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
credits = ['# Dźwięki', '', 'Nagrania z [Freesound](https://freesound.org), licencja **CC0** (domena publiczna) — przycięte i znormalizowane przez `tmp/voices/make.py`.', '',
           '| plik | nagranie | autor |', '|---|---|---|']
for src, i, maxlen, name in [(p[2] if len(p) > 2 else v, p[0], p[1], f'{v}_{n}') for v, l in PICK.items() for n, p in enumerate(l)]:
    c = cand[src][i]
    pcm = array.array('h', subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, c['file']), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'],
                                          capture_output=True, check=True).stdout)
    # okno o maks. długości z największą energią (krok 50 ms)
    n, step = min(len(pcm), int(maxlen * RATE)), int(WIN * RATE)
    blocks = [sum(x * x for x in pcm[j:j + step:8]) for j in range(0, len(pcm), step)]
    k = max(1, n // step)
    j0 = max(range(max(1, len(blocks) - k + 1)), key=lambda j: sum(blocks[j:j + k]))
    # przytnij ciche brzegi okna (tło: szum ulicy/zoo): zostaw od pierwszego do ostatniego bloku ≥ TRIM energii najgłośniejszego
    win = blocks[j0:j0 + k]; loud = [i for i, e in enumerate(win) if e >= TRIM * max(win)]
    start, dur = (j0 + loud[0]) * step, min(n, (min(len(win), loud[-1] + 1 + TAIL) - loud[0]) * step) / RATE
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start / RATE:.3f}', '-t', f'{dur:.3f}', '-i', os.path.join(HERE, c['file']),
                    '-af', f'afade=t=in:d={FADE_IN},afade=t=out:st={max(0, dur - min(FADE_OUT, dur / 3)):.3f}:d={min(FADE_OUT, dur / 3):.3f},loudnorm=I=-16:TP=-1.5,alimiter=limit={PEAK}',
                    '-ac', '1', '-ar', str(RATE), '-b:a', '64k', os.path.join(OUT, name + '.mp3')], check=True)
    credits.append(f"| `{name}.mp3` | [{c['title']}]({c['url']}) | {c['author']} |")
    print(f"{name:10} ← {c['title'][:45]:45} {start / RATE:5.2f}s +{dur:.2f}s  {os.path.getsize(os.path.join(OUT, name + '.mp3')) // 1024} kB")
open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(credits) + '\n')
