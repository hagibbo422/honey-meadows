# Cuts the two uploaded dog sheets into assets/dogs/<name>.png (rows: idle, walkR, walkL, runR, runL,
# sit, lay, getup, bark; frames left-aligned in equal cells, feet on the cell bottom) plus
# assets/dogs/<name>_portrait.png, and prints the frame counts.
# Usage: python3 tools/make-dog-sprites.py <sheet with Mylo & Sadie> <sheet with Sophie & Maggie> assets/dogs
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
s1, s2, OUT = sys.argv[1:4]
SCALE = 0.5
ROWS = ['idle', 'walkR', 'walkL', 'runR', 'runL', 'sit', 'lay', 'getup', 'bark']
# (band y0, y1), then per move: (x0, x1, frames)
TOP = {'bands': [(60, 150), (198, 285), (335, 440)],
       'moves': {'idle': (0, 250, 540, 4), 'walkR': (0, 580, 1050, 6), 'walkL': (0, 1080, 1530, 6),
                 'runR': (1, 300, 770, 5), 'runL': (1, 840, 1420, 6),
                 'sit': (2, 240, 460, 3), 'lay': (2, 470, 775, 4), 'getup': (2, 790, 1110, 4), 'bark': (2, 1150, 1525, 4)},
       'portrait': (0, 90, 250, 380)}
BOT = {'bands': [(535, 625), (676, 765), (826, 940)],
       'moves': {'idle': (0, 260, 590, 4), 'walkR': (0, 610, 1068, 5), 'walkL': (0, 1085, 1525, 5),
                 'runR': (1, 325, 785, 4), 'runL': (1, 855, 1440, 5),
                 'sit': (2, 240, 500, 3), 'lay': (2, 500, 810, 4), 'getup': (2, 815, 1145, 4), 'bark': (2, 1150, 1530, 4)},
       'portrait': (0, 600, 300, 830)}
def mask(rgb):
    gm = np.zeros(rgb.shape[:2])
    for c in range(3):
        gm = np.maximum(gm, np.hypot(ndimage.sobel(rgb[..., c], 1), ndimage.sobel(rgb[..., c], 0)))
    fg = ndimage.binary_fill_holes(ndimage.binary_closing(gm > 0.3, iterations=2))
    return ndimage.binary_erosion(ndimage.binary_opening(fg, iterations=1), iterations=2), gm
def cut(im, fg, y0, y1, x0, x1):
    m = fg[y0:y1, x0:x1]
    lab, n = ndimage.label(m)
    if not n: return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(sizes > 0.4 * sizes.max())[0])
    ys, xs = np.where(keep)
    crop = im[y0 + ys.min():y0 + ys.max() + 1, x0 + xs.min():x0 + xs.max() + 1].copy()
    crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
    return Image.fromarray(crop)
def frames(im, fg, y0, y1, x0, x1, n):
    prof = ndimage.uniform_filter1d(fg[y0:y1, x0:x1].sum(0).astype(float), 3)
    cols = np.where(prof > 2)[0]
    a, b = int(cols[0]), int(cols[-1]) + 1
    w = (b - a) / n
    cuts = [a]
    for k in range(1, n):
        lo, hi = int(a + k * w - w * 0.35), int(a + k * w + w * 0.35)
        seg = prof[lo:hi]
        idx = np.where(seg == seg.min())[0]
        cuts.append(lo + int(idx[len(idx) // 2]))
    cuts.append(b)
    return [cut(im, fg, y0, y1, x0 + cuts[k], x0 + cuts[k + 1]) for k in range(n)]
meta = {}
for path, halves in ((s1, (('mylo', TOP), ('sadie', BOT))), (s2, (('sophie', TOP), ('maggie', BOT)))):
    im = np.array(Image.open(path).convert('RGBA'))
    fg, gm = mask(im[..., :3].astype(float) / 255)
    # the little yellow "bark" marks are separate small blobs; cut() drops them by size
    for name, L in halves:
        rows = []
        for r in ROWS:
            bi, x0, x1, n = L['moves'][r]
            y0, y1 = L['bands'][bi]
            rows.append(frames(im, fg, y0, y1, x0, x1, n))
        rows = [[f.resize((max(1, round(f.width * SCALE)), max(1, round(f.height * SCALE))), Image.LANCZOS) for f in row] for row in rows]
        cw = max(f.width for row in rows for f in row) + 2
        ch = max(f.height for row in rows for f in row) + 2
        nf = max(len(row) for row in rows)
        sh = Image.new('RGBA', (cw * nf, ch * len(rows)), (0, 0, 0, 0))
        for ri, row in enumerate(rows):
            for fi, f in enumerate(row):
                sh.alpha_composite(f, (fi * cw + (cw - f.width) // 2, ri * ch + ch - 1 - f.height))
        sh.save(f'{OUT}/{name}.png', optimize=True)
        px0, py0, px1, py1 = L['portrait']
        cut(im, fg, py0, py1, px0, px1).save(f'{OUT}/{name}_portrait.png', optimize=True)
        meta[name] = dict(cw=cw, ch=ch, frames=[len(r) for r in rows])
print(json.dumps(meta))
