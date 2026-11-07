# Cuts Annie's new sheet into game sprites (alpha >= 240 keeps the sprite and drops the soft halo):
#   assets/annie_walk.png     64x96 cells; rows down(1), left(6), right(6), up(1), idle(5)
#   assets/bikes/ride_annie.png   cells 90x100; rows right(4), left(4)
#   assets/annie_portrait.png full standing picture
# Usage: python3 tools/make-annie-sprites.py <sheet.png> assets
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
src, OUT = sys.argv[1:3]
a = np.array(Image.open(src).convert('RGBA'))
fg = a[..., 3] >= 240
fg = ndimage.binary_opening(fg, iterations=1)
BANDS = {'static': (30, 290), 'idle': (295, 430), 'walkR': (430, 552), 'walkL': (552, 672),
         'runR': (672, 785), 'runL': (785, 898), 'bikeR': (898, 1070), 'bikeL': (1075, 1250)}
def comps(y0, y1, x0=300):
    lab, n = ndimage.label(fg[y0:y1, x0:])
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (lab[sl] == i).sum(); h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if area < 600 or w > 2.2 * h: continue  # specks and the label pills
        out.append((sl[1].start, i, sl))
    out.sort()
    frames = []
    for _, i, sl in out:
        keep = lab[sl] == i
        crop = a[y0 + sl[0].start:y0 + sl[0].stop, x0 + sl[1].start:x0 + sl[1].stop].copy()
        crop[..., 3] = np.where(keep, 255, 0)
        frames.append(Image.fromarray(crop))
    return frames
F = {k: comps(*v) for k, v in BANDS.items()}
print({k: len(v) for k, v in F.items()})
def sheet(rows, cw, ch, target_h, path):
    tallest = max(f.height for row in rows for f in row)
    k = target_h / tallest
    n = max(len(r) for r in rows)
    sh = Image.new('RGBA', (cw * n, ch * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            g = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
            if g.width > cw: g = g.resize((cw, round(g.height * cw / g.width)), Image.LANCZOS)
            sh.alpha_composite(g, (c * cw + (cw - g.width) // 2, r * ch + ch - 1 - g.height))
    sh.save(path, optimize=True)
st = F['static']  # front, side (right), back, side (left)
# walking rows: scale so the walking frames are ~94px like the neighbours' 64x96 sheets
walk_rows = [[st[0]], F['walkL'], F['walkR'], [st[2]], F['idle']]
# statics are taller in the source than the walk frames; normalise each row to the walk height
wh = max(f.height for f in F['walkR'])
walk_rows[0] = [st[0].resize((round(st[0].width * wh / st[0].height), wh), Image.LANCZOS)]
walk_rows[3] = [st[2].resize((round(st[2].width * wh / st[2].height), wh), Image.LANCZOS)]
sheet(walk_rows, 64, 96, 94, f'{OUT}/annie_walk.png')
# Bikes: thin wheel outlines need the un-opened mask; split each row into 4 frames at column gaps.
raw = a[..., 3] >= 60
def bike_row(y0, y1, x0=335, n=4):
    m = raw[y0:y1, x0:]
    prof = m.sum(0)
    cols = np.where(prof > 0)[0]
    b0, b1 = int(cols[0]), int(cols[-1]) + 1
    w = (b1 - b0) / n
    cuts = [b0]
    for k in range(1, n):
        lo, hi = int(b0 + k * w - w * 0.3), int(b0 + k * w + w * 0.3)
        seg = prof[lo:hi]; idx = np.where(seg == seg.min())[0]
        cuts.append(lo + int(idx[len(idx) // 2]))
    cuts.append(b1)
    out = []
    for k in range(n):
        cm = m[:, cuts[k]:cuts[k + 1]]
        lab, nn = ndimage.label(cm, structure=np.ones((3, 3)))
        sizes = ndimage.sum(cm, lab, range(1, nn + 1))
        keep = np.isin(lab, 1 + np.where(sizes > 40)[0])
        ys, xs = np.where(keep)
        crop = a[y0 + ys.min():y0 + ys.max() + 1, x0 + cuts[k] + xs.min():x0 + cuts[k] + xs.max() + 1].copy()
        kk = keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        # the dark brown 'sticker' halo fills the wheels; clear it below the rider's waist
        r, g, b = crop[..., 0].astype(int), crop[..., 1].astype(int), crop[..., 2].astype(int)
        mx = np.maximum(np.maximum(r, g), b)
        halo = (mx > 26) & (mx < 88) & (r >= b)
        top = int(crop.shape[0] * 0.55)
        halo[:top] = False
        kk &= ~halo
        # drop the loose specks left behind in the wheels
        low = kk[top:]
        lab2, n2 = ndimage.label(low)
        sz = ndimage.sum(low, lab2, range(1, n2 + 1))
        low &= np.isin(lab2, 1 + np.where(sz >= 6)[0])
        crop[..., 3] = np.where(kk, 255, 0)
        out.append(Image.fromarray(crop))
    return out
sheet([bike_row(*BANDS['bikeR']), bike_row(*BANDS['bikeL'])], 90, 100, 98, f'{OUT}/bikes/ride_annie.png')
lab, n = ndimage.label(fg[30:650, 0:300])
sizes = ndimage.sum(fg[30:650, 0:300], lab, range(1, n + 1))
i = 1 + int(np.argmax(sizes)); ys, xs = np.where(lab == i)
crop = a[30 + ys.min():30 + ys.max() + 1, xs.min():xs.max() + 1].copy()
crop[..., 3] = np.where((lab == i)[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
Image.fromarray(crop).save(f'{OUT}/annie_portrait.png', optimize=True)
