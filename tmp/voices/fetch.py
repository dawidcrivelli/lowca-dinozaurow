"""Kandydaci na głosy zwierząt z Freesound, TYLKO licencja CC0 (bez przypisania, wolno hostować publicznie).
Dla każdego głosu: kilka zapytań → wyniki z długością MIN..MAX s → ranking po pobraniach × ocena → TOP_N plików hq mp3.
użycie: python3 tmp/voices/fetch.py   → tmp/voices/cand/<głos>_<n>.mp3 + cand.json"""
import json, re, os, time, urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
TOP_N, MIN_S, MAX_S = 10, 0.5, 12
QUERIES = {   # głos → zapytania (prawdziwe zwierzęta, potem obniżane/podwyższane wg masy)
    'roar': ['lion roar', 'tiger roar', 'monster roar', 'bear roar'], 'growl': ['tiger growl', 'bear growl', 'wolf growl', 'dog growl'],
    'screech': ['hawk screech', 'eagle scream', 'owl screech', 'parrot squawk'], 'shriek': ['seagull call', 'crow caw', 'raven', 'heron'],
    'bellow': ['elephant rumble', 'bull bellow', 'bison', 'camel'], 'honk': ['goose honk', 'swan', 'emu'],
    'grunt': ['pig grunt', 'rhino', 'hippo', 'wild boar'], 'hiss': ['alligator hiss', 'snake hiss', 'crocodile growl'],
    'whale': ['whale song', 'humpback whale', 'sea lion', 'walrus', 'orca', 'dolphin'], 'trumpet': ['elephant trumpet'],
    'moo': ['cow moo', 'yak', 'ox'], 'click': ['insect click', 'cicada', 'cricket'], 'bubble': ['underwater bubbles', 'water splash'],
    'hit': ['punch impact', 'body hit'], 'whoosh': ['whoosh swing', 'swoosh'],
}
UA = {'User-Agent': 'Mozilla/5.0'}
PAUSE, RETRY_S = 2, 30   # Freesound odpowiada 429 przy szybkich zapytaniach
def get(u, tries=5):
    time.sleep(PAUSE)
    try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
    except urllib.error.HTTPError as e:
        if e.code != 429 or tries <= 1: raise
        time.sleep(RETRY_S); return get(u, tries - 1)

def search(q):
    u = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"'})
    h = get(u).decode('utf8', 'replace')
    for b in h.split('data-mp3=')[1:]:
        a = lambda k: (re.search(k + r'="([^"]*)"', b) or [None, ''])[1]
        link = re.search(r'href="(/people/([^/]+)/sounds/(\d+)/)"', b)
        rate = re.search(r'Average rating of ([\d.]+)', b)
        if not link or 'Creative Commons 0' not in b: continue
        yield dict(q=q, id=link[3], author=link[2], url='https://freesound.org' + link[1], title=a('data-title'),
                   mp3=b.split('"')[1].replace('-lq.mp3', '-hq.mp3'),
                   dur=float(a('data-duration') or 0), dl=int(a('data-num-downloads') or 0), rating=float(rate[1]) if rate else 3)

os.makedirs(os.path.join(HERE, 'cand'), exist_ok=True)
out = json.load(open(os.path.join(HERE, 'cand.json'))) if os.path.exists(os.path.join(HERE, 'cand.json')) else {}   # stare indeksy zostają (PICK w make.py)
for voice, qs in QUERIES.items():
    old = out.setdefault(voice, []); seen, res = {r['id'] for r in old}, []
    for q in qs:
        for r in search(q):
            if r['id'] not in seen and MIN_S <= r['dur'] <= MAX_S: seen.add(r['id']); res.append(r)
    res.sort(key=lambda r: -r['dl'] * r['rating'])
    for r in res[:max(0, TOP_N - len(old))]:
        r['file'] = f'cand/{voice}_{len(old)}.mp3'; old.append(r)
        open(os.path.join(HERE, r['file']), 'wb').write(get(r['mp3']))
        print(f"{voice:8} {len(old) - 1} {r['dur']:5.1f}s {r['dl']:6} dl {r['rating']:.1f}★  {r['title'][:50]}  ({r['author']})")
    json.dump(out, open(os.path.join(HERE, 'cand.json'), 'w'), indent=1)   # po każdym głosie: przerwanie nie gubi postępu
