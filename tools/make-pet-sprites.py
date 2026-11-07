# Cuts the Nov 7 transparent animation sheets into game sprite sheets.
#   grid(): finds each sprite (alpha), groups them into rows x cols by position, crops each cell.
# Usage: python3 tools/make-pet-sprites.py <attachments dir> assets
import sys, os
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage
A, OUT = sys.argv[1:3]
def grid(path, rows, cols, xmin=0, thr=100, clean=True):
    im = np.array(Image.open(path).convert('RGBA'))
    m = im[..., 3] > thr
    # opaque patches of the dark backdrop caught between legs: very dark blobs bigger than an outline
    v = im[..., :3].max(2)
    dl, dn = ndimage.label(m & (v < 45) & clean)
    ds = ndimage.sum(m, dl, range(1, dn + 1))
    m &= ~np.isin(dl, 1 + np.where(ds > 500)[0])
    im[..., 3] = np.where(m, im[..., 3], 0)
    m[:, :xmin] = False
    lab, n = ndimage.label(ndimage.binary_closing(m, iterations=2))
    objs = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        if area < 150: continue
        objs.append((i, (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, area))
    big = max(o[3] for o in objs)
    objs = [o for o in objs if o[3] > 0.08 * big]
    def clusters(vals, k):
        v = np.sort(np.array(vals))
        gaps = np.argsort(np.diff(v))[-(k - 1):] if k > 1 else []
        edges = sorted(v[g] for g in gaps)
        return lambda x: sum(x > e for e in edges)
    ry, cx = clusters([o[1] for o in objs], rows), clusters([o[2] for o in objs], cols)
    cells = {}
    for i, y, x, a in objs:
        cells.setdefault((ry(y), cx(x)), []).append(i)
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            ids = cells.get((r, c))
            if not ids: raise SystemExit(f'{path}: empty cell {r},{c}')
            keep = np.isin(lab, ids) & (im[..., 3] > 0)
            ys, xs = np.where(keep)
            crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
            crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[..., 3], 0)
            row.append(Image.fromarray(crop))
        out.append(row)
    return out
def sheet(rows, cw, ch, path, fit=0.96):
    k = min(cw * fit / max(f.width for r in rows for f in r), ch * fit / max(f.height for r in rows for f in r))
    sh = Image.new('RGBA', (cw * max(len(r) for r in rows), ch * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            g = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
            sh.alpha_composite(g, (c * cw + (cw - g.width) // 2, r * ch + ch - 1 - g.height))
    sh.save(path, optimize=True)
mirror = lambda row: [ImageOps.mirror(f) for f in row]
P = lambda h: os.path.join(A, h + '-image.png')
# Pets in the old 72x72 pet layout used by drawPet: rows down, left, right, up, rest.
for name, h in (('dog_sprite', 'cd9fadc3'), ('cat_sprite', '81ac75e3')):
    walk, sit, lay = grid(P(h), 3, 4, xmin=290 if name == 'dog_sprite' else 0)
    sheet([walk, mirror(walk), walk, walk, lay], 72, 72, f'{OUT}/{name}.png')
    sheet([walk, sit, lay], 96, 96, f'{OUT}/{name.split("_")[0]}_anim.png')  # for the Characters panel
# Apollo & Peanut in the neighbours' dog layout: rows idle, walkR, walkL, runR, runL, sit, lay, getup, bark.
for name, h in (('apollo', 'b394ee1c'), ('peanut', 'e12fcc79')):
    walk, sit, lay = grid(P(h), 3, 4)
    sheet([sit, walk, mirror(walk), walk, mirror(walk), sit, lay, lay[::-1], sit], 60, 52, f'{OUT}/dogs/{name}.png')
# Hayden: sheet rows down, up, left, right -> companion_avatar rows down, left, right, up (52x84).
down, up, left, right = grid(P('a23079f4'), 4, 4, xmin=230)
sheet([down, left, right, up], 52, 84, f'{OUT}/companion_avatar.png', fit=0.94)
# Annie (Nov 7): walk rows up, right, down, left -> annie_walk rows down, left, right, up, idle (64x96)
up, right, down, left = grid(P('f0522d15'), 4, 4, xmin=320, thr=200, clean=False)
sheet([down, left, right, up, [down[0]] * 4], 64, 96, f'{OUT}/annie_walk.png', fit=0.98)
# bike rows up, down, left, right -> ride_annie rows right, left, down, up (90x100)
bu, bd, bl, br = grid(P('baf21ffe'), 4, 4, xmin=320, thr=200, clean=False)
sheet([br, bl, bd, bu], 90, 100, f'{OUT}/bikes/ride_annie.png', fit=0.98)
# dumbbell curls, 2 rows of 5 -> one row of 10 (80x100)
r1, r2 = grid(P('1913bbcc'), 2, 5, thr=200, clean=False)
sheet([r1 + r2], 80, 100, f'{OUT}/annie_gym.png', fit=0.98)
# Hayden leg press, 2 rows of 4 -> one row of 8 (120x105)
lp1, lp2 = grid(P('903c57f8'), 2, 4, thr=200, clean=False)
sheet([lp1 + lp2], 120, 105, f'{OUT}/hayden_legpress.png', fit=0.98)
print('ok')
