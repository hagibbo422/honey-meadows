# Cuts the Nov 6 uploads into game sprites:
#   Hayden sheet  -> assets/companion_avatar.png (4x4, 52x84 cells; rows down,left,right,up)
#                    assets/bikes/ride_hayden.png (90x100 cells; rows right,left,down,up; 4 frames)
#   Hayden single -> assets/hayden_portrait.png
#   Eat together  -> assets/jones_eat.png (6 frames, 170x150 cells)
#   Jones sheet   -> assets/jones_workout.png (rows: Bailey dumbbells, Bailey bench, Dakota dumbbells,
#                    Dakota bench; 6 cols, 120x120 cells) and assets/jones_couch.png (5 frames, 150x110)
# Usage: python3 tools/make-batch5-sprites.py <hayden sheet> <eat together> <jones activities> <hayden single> assets [<annie single>]
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
hs, eat, act, single, OUT = sys.argv[1:6]
def load(p):
    im = np.array(Image.open(p).convert('RGBA'))
    rgb = im[..., :3].astype(float) / 255
    gm = np.zeros(rgb.shape[:2])
    for c in range(3):
        gm = np.maximum(gm, np.hypot(ndimage.sobel(rgb[..., c], 1), ndimage.sobel(rgb[..., c], 0)))
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(gm > 0.25, iterations=2))
    fg = ndimage.binary_erosion(ndimage.binary_opening(fg, iterations=1), iterations=2)
    return im, fg
def band(im, fg, y0, y1, x0, x1, n, minfrac=0.15):
    m = fg[y0:y1, x0:x1]
    prof = m.sum(0)
    cols = np.where(prof > 2)[0]
    a, b = int(cols[0]), int(cols[-1]) + 1
    w = (b - a) / n
    cuts = [a]
    for k in range(1, n):
        lo, hi = int(a + k * w - w * 0.35), int(a + k * w + w * 0.35)
        seg = prof[lo:hi]; idx = np.where(seg == seg.min())[0]
        cuts.append(lo + int(idx[len(idx) // 2]))
    cuts.append(b)
    out = []
    for k in range(n):
        cm = m[:, cuts[k]:cuts[k + 1]]
        lab, nn = ndimage.label(cm)
        sizes = ndimage.sum(cm, lab, range(1, nn + 1))
        keep = np.isin(lab, 1 + np.where(sizes > minfrac * sizes.max())[0])
        ys, xs = np.where(keep)
        crop = im[y0 + ys.min():y0 + ys.max() + 1, x0 + cuts[k] + xs.min():x0 + cuts[k] + xs.max() + 1].copy()
        crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
        out.append(Image.fromarray(crop))
    return out
def sheet(rows, cw, ch, target_h, path, foot=0):
    tallest = max(f.height for row in rows for f in row)
    k = target_h / tallest
    n = max(len(r) for r in rows)
    sh = Image.new('RGBA', (cw * n, ch * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            g = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
            if g.width > cw: g = g.resize((cw, round(g.height * cw / g.width)), Image.LANCZOS)
            sh.alpha_composite(g, (c * cw + (cw - g.width) // 2, r * ch + ch - 1 - foot - g.height))
    sh.save(path, optimize=True)
# ---- Hayden
im, fg = load(hs)
W = {d: band(im, fg, y0, y1, 255, 700, 4) for d, (y0, y1) in
     {'right': (165, 340), 'left': (395, 570), 'down': (615, 780), 'up': (812, 975)}.items()}
B = {d: band(im, fg, y0, y1, 1000, 1515, 4) for d, (y0, y1) in
     {'right': (165, 345), 'left': (395, 575), 'down': (615, 785), 'up': (812, 980)}.items()}
sheet([W['down'], W['left'], W['right'], W['up']], 52, 84, 79, f'{OUT}/companion_avatar.png', foot=3)
sheet([B['right'], B['left'], B['down'], B['up']], 90, 100, 98, f'{OUT}/bikes/ride_hayden.png')
im, fg = load(single)
lab, n = ndimage.label(fg)
sizes = ndimage.sum(fg, lab, range(1, n + 1)); keep = np.isin(lab, 1 + np.where(sizes > 0.03 * sizes.max())[0])
keep = ndimage.binary_fill_holes(ndimage.binary_closing(keep, iterations=4))
ys, xs = np.where(keep)
crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
Image.fromarray(crop).save(f'{OUT}/hayden_portrait.png', optimize=True)
def portrait(path, dest):
    im, fg = load(path)
    lab, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, lab, range(1, n + 1)); keep = np.isin(lab, 1 + np.where(sizes > 0.03 * sizes.max())[0])
    keep = ndimage.binary_fill_holes(ndimage.binary_closing(keep, iterations=4))
    ys, xs = np.where(keep)
    crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
    Image.fromarray(crop).save(dest, optimize=True)
if len(sys.argv) > 6:
    portrait(sys.argv[6], f'{OUT}/annie_portrait.png')
# ---- Eating together: table+chairs+people part of each framed card (rug edges trimmed off)
e = Image.open(eat).convert('RGBA')
FR = [(37, 211), (252, 421), (458, 625), (661, 823), (859, 1020), (1053, 1219)]
strip = Image.new('RGBA', (170 * 6, 150), (0, 0, 0, 0))
for i, (x0, x1) in enumerate(FR):
    w = x1 - x0
    c = e.crop((x0 + int(w * 0.04), 165, x1 - int(w * 0.02), 322)).resize((170, 150), Image.LANCZOS)
    strip.paste(c, (i * 170, 0))
strip.save(f'{OUT}/jones_eat.png', optimize=True)
# ---- Bailey & Dakota activities
im, fg = load(act)
rows = [band(im, fg, 300, 490, 175, 720, 6), band(im, fg, 305, 492, 745, 1510, 5, 0.05),
        band(im, fg, 785, 995, 175, 720, 6), band(im, fg, 790, 990, 745, 1510, 5, 0.05)]
sheet(rows, 120, 120, 116, f'{OUT}/jones_workout.png')
sheet([band(im, fg, 80, 248, 740, 1515, 5, 0.05)], 150, 110, 106, f'{OUT}/jones_couch.png')
print('ok')
