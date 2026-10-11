#!/usr/bin/env python3
"""usage: compare.py reference.png actual.png [--ignore-bg] [--tol 12]
Prints % of differing pixels and writes diff.png. Resizes `actual` to the reference size if they differ by <=2px."""
import sys
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
tol=int(sys.argv[sys.argv.index('--tol')+1]) if '--tol' in sys.argv else 12
if a.size!=b.size:
    if abs(a.size[0]-b.size[0])<=2 and abs(a.size[1]-b.size[1])<=2: b=b.resize(a.size)
    else: sys.exit(f'size mismatch {a.size} vs {b.size}')
d=ImageChops.difference(a,b).convert('L')
mask=d.point(lambda v:255 if v>tol else 0)
if '--ignore-bg' in sys.argv:  # ignore the 20px gutters and the 142px steps zone at the bottom (background only)
    w,h=a.size; s=w/390
    from PIL import ImageDraw
    dr=ImageDraw.Draw(mask)
    dr.rectangle([0,0,int(14*s),h],fill=0); dr.rectangle([w-int(14*s),0,w,h],fill=0)
n=sum(1 for v in mask.getdata() if v)/(mask.size[0]*mask.size[1])*100
mask.save('diff.png'); print(f'{n:.2f}% pixels differ (tol {tol})'); sys.exit(0 if n<=1.5 else 1)
