# Wycinek z kilku zrzutów obok siebie, powiększony: python3 tmp/pup/crop.py x0 y0 x1 y1 scale out.png in1.png in2.png ...
import sys
from PIL import Image
x0,y0,x1,y1=map(int,sys.argv[1:5]); sc=float(sys.argv[5]); out=sys.argv[6]; fs=sys.argv[7:]
ims=[Image.open(f).crop((x0,y0,x1,y1)) for f in fs]; w,h=int((x1-x0)*sc),int((y1-y0)*sc)
o=Image.new('RGB',(w*len(ims),h),'white')
for i,im in enumerate(ims): o.paste(im.resize((w,h)),(i*w,0))
o.save(out)
