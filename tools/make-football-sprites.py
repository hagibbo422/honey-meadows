# Cuts the uploaded OSU football sheet into assets/football/*.png: one sheet per player, one row per
# move, frames on a shared baseline, plus the football. Usage:
#   python3 tools/make-football-sprites.py <sheet.png> assets/football
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
src, OUT = sys.argv[1:3]
SCALE = 0.6
im = np.array(Image.open(src).convert('RGBA'))
hsv = np.array(Image.open(src).convert('HSV')).astype(float) / 255
h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
fg = (v < 0.2) | (v > 0.56) | ((s > 0.75) & (v > 0.45))
fg = ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=1))
# the small IDLE labels sit right on top of the idle frames; blank them out
for x0, y0, x1, y1 in [(210, 46, 321, 82), (379, 234, 479, 270), (379, 401, 479, 437), (379, 576, 479, 612), (379, 727, 479, 763), (379, 874, 479, 910)]:
    fg[y0:y1, x0:x1] = False
QB = dict(idle=[168, 233, 298, 363], run=[465, 545, 620, 700], dropback=[810, 885, 965, 1050], pass_=[1180, 1270, 1355, 1445])
WR = dict(idle=[298, 372, 443, 515], run=[625, 705, 783, 853, 925], catch=[1035, 1115, 1195, 1283, 1388])
DB = dict(idle=[323, 392, 458, 525], run=[620, 700, 773, 850], defend=[962, 1045, 1135, 1235])
PLAYERS = [('qb12', (70, 198), QB), ('wr88', (255, 375), WR), ('wr84', (425, 545), WR),
           ('db23', (595, 712), DB), ('db37', (750, 865), DB), ('db41', (900, 1020), DB)]
meta = {}
for name, (y0, y1), moves in PLAYERS:
    lab, n = ndimage.label(fg[y0:y1])
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if hh < 55 or ww > 140 or (lab[sl] == i).sum() < 700: continue
        comps.append((i, sl[1].start, sl[1].stop))
    rows = []
    for mv, centers in moves.items():
        row = []
        for j, c in enumerate(centers):
            # frames that touch each other are split halfway between neighbouring frame centres
            lo = (centers[j - 1] + c) / 2 if j else c - 45
            hi = (centers[j + 1] + c) / 2 if j + 1 < len(centers) else c + 45
            ids = [i for i, a, b in comps if a < hi and b > lo and min(b, hi) - max(a, lo) > 15]
            if not ids: raise SystemExit(f'{name} {mv}: nothing near x={c}')
            keep = np.isin(lab, ids)
            xs_all = np.arange(keep.shape[1])
            keep &= ((xs_all >= lo) & (xs_all < hi))[None, :]
            ys, xs = np.where(keep)
            row.append((keep, xs.min(), xs.max() + 1, ys.min(), ys.max() + 1))
        rows.append((mv.rstrip('_'), row))
    W = max(c[2] - c[1] for _, r in rows for c in r) + 4
    H = max(max(c[4] for c in r) - c[3] for _, r in rows for c in r) + 4
    nf = max(len(r) for _, r in rows)
    sheet = Image.new('RGBA', (W * nf, H * len(rows)), (0, 0, 0, 0))
    for ri, (mv, row) in enumerate(rows):
        base = max(c[4] for c in row)
        for fi, (keep, x0, x1, ty, by) in enumerate(row):
            crop = im[y0 + ty:y0 + by, x0:x1].copy()
            crop[..., 3] = np.where(keep[ty:by, x0:x1], 255, 0)
            sheet.alpha_composite(Image.fromarray(crop), (fi * W + (W - (x1 - x0)) // 2, ri * H + H - 2 - (base - ty)))
    sw, sh = round(W * SCALE), round(H * SCALE)
    sheet.resize((sw * nf, sh * len(rows)), Image.LANCZOS).save(f'{OUT}/{name}.png', optimize=True)
    meta[name] = dict(cw=sw, ch=sh, rows=[m for m, _ in rows], frames=[len(r) for _, r in rows])
# football (bottom-right corner)
box = (1320, 870, 1500, 1010)
lab, n = ndimage.label(fg[box[1]:box[3], box[0]:box[2]])
big = max(range(1, n + 1), key=lambda i: (lab == i).sum())
keep = lab == big
ys, xs = np.where(keep)
crop = im[box[1] + ys.min():box[1] + ys.max() + 1, box[0] + xs.min():box[0] + xs.max() + 1].copy()
crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
Image.fromarray(crop).resize((30, round(30 * crop.shape[0] / crop.shape[1])), Image.LANCZOS).save(f'{OUT}/football.png', optimize=True)
print(json.dumps(meta))
