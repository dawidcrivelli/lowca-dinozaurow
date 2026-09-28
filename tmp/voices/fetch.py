"""Kandydaci na głosy zwierząt z Freesound, TYLKO licencja CC0 (bez przypisania, wolno hostować publicznie).
Dla każdego głosu: kilka zapytań → wyniki z długością MIN..MAX s → ranking po pobraniach × ocena → TOP_N plików hq mp3.
użycie: python3 tmp/voices/fetch.py   → tmp/voices/cand/<głos>_<n>.mp3 + cand.json"""
import json, re, os, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
TOP_N, MIN_S, MAX_S = 4, 0.8, 12
QUERIES = {   # głos → zapytania (prawdziwe zwierzęta, potem obniżane/podwyższane wg masy)
    'roar': ['lion roar', 'tiger roar'], 'growl': ['tiger growl', 'bear growl'],
    'screech': ['hawk screech', 'eagle scream'], 'shriek': ['seagull call', 'crow caw'],
    'bellow': ['elephant rumble', 'bull bellow'], 'honk': ['goose honk'], 'grunt': ['pig grunt', 'rhino'],
    'hiss': ['alligator hiss', 'snake hiss'], 'whale': ['whale song', 'humpback whale'], 'trumpet': ['elephant trumpet'],
    'moo': ['cow moo'], 'click': ['insect click', 'cicada'], 'bubble': ['underwater bubbles'],
    'hit': ['punch impact', 'body hit'], 'whoosh': ['whoosh swing'],
}
UA = {'User-Agent': 'Mozilla/5.0'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()

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
out = {}
for voice, qs in QUERIES.items():
    seen, res = set(), []
    for q in qs:
        for r in search(q):
            if r['id'] not in seen and MIN_S <= r['dur'] <= MAX_S: seen.add(r['id']); res.append(r)
    res.sort(key=lambda r: -r['dl'] * r['rating'])
    out[voice] = res[:TOP_N]
    for i, r in enumerate(out[voice]):
        r['file'] = f'cand/{voice}_{i}.mp3'
        open(os.path.join(HERE, r['file']), 'wb').write(get(r['mp3']))
        print(f"{voice:8} {i} {r['dur']:5.1f}s {r['dl']:6} dl {r['rating']:.1f}★  {r['title'][:50]}  ({r['author']})")
json.dump(out, open(os.path.join(HERE, 'cand.json'), 'w'), indent=1)
