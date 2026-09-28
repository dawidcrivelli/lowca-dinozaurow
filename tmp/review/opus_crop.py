# Crop contact sheet rows into zoomed strips for inspection: python3 opus_crop.py
from PIL import Image
im = Image.open('shots/opus_all_species.png'); W, H = im.size; rh = H / 12
for r0 in range(0, 12, 3):
    im.crop((0, int(r0 * rh), W, int(min(H, (r0 + 3) * rh)))).save(f'shots/opus_sheet_rows{r0 + 1}-{r0 + 3}.png')
