# Arkusz zrzutów wycinanek: siatka miniatur z podpisami (oszczędza czytanie wielu plików).
# użycie: python3 tmp/pup/sheet.py <prefiks> [kolumny] [szerokość miniatury]  → tmp/shots/pup/sheet_<prefiks>.png
import sys, glob, os
from PIL import Image, ImageDraw
pre, cols, w = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4, int(sys.argv[3]) if len(sys.argv) > 3 else 400
d = os.path.join(os.path.dirname(__file__), '../shots/pup')
fs = sorted(f for f in glob.glob(os.path.join(d, pre + '_*.png')) if 'sheet_' not in f)
ims = [Image.open(f) for f in fs]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
out = Image.new('RGB', (cols * w, rows * (h + 16)), 'white')
dr = ImageDraw.Draw(out)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = i % cols * w, i // cols * (h + 16)
    out.paste(im.resize((w, h)), (x, y + 16)); dr.text((x + 4, y + 2), os.path.basename(f)[len(pre) + 1:-4], fill='black')
out.save(os.path.join(d, 'sheet_' + pre + '.png')); print(len(ims), 'frames')
