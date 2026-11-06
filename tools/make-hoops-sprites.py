# Cuts the uploaded basketball sheets into assets/hoops/*.png (one sheet per player, one row per move,
# 4 frames per row, feet on a shared baseline). Usage:
#   python3 tools/make-hoops-sprites.py <okc sheet.png> <spurs sheet.png> <ball.png> assets/hoops
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
okc, spurs, ballf, OUT = sys.argv[1:5]
SCALE = 0.45
def mask_of(im):
    f = im.astype(float) / 255
    rgb = f[..., :3]; mx = rgb.max(2); mn = rgb.min(2); s = (mx - mn) / np.maximum(mx, 1e-3)
    fg = ((mx < 0.42) | ((s > 0.5) & (mx > 0.35))) & (f[..., 3] > 0.6)
    return ndimage.binary_fill_holes(ndimage.binary_closing(fg, iterations=1))
def cut(path, bands, centers, names, prefix):
    im = np.array(Image.open(path).convert('RGBA'))
    m = mask_of(im)
    meta = {}
    for who, (y0, y1) in bands:
        lab, n = ndimage.label(m[y0:y1])
        objs = ndimage.find_objects(lab)
        frames = {}
        for i, sl in enumerate(objs, 1):
            area = (lab[sl] == i).sum()
            if area < 250 or sl[1].stop - sl[1].start > 140 or sl[0].start == 0: continue
            cx = (sl[1].start + sl[1].stop) / 2
            if cx < 120: continue  # portrait
            k = int(np.argmin([abs(cx - c) for c in centers]))
            if abs(cx - centers[k]) > 60: continue
            frames.setdefault(k, []).append(i)
        crops = []
        for k in range(len(centers)):
            if k not in frames: raise SystemExit(f'{who}: missing frame {k}')
            keep = np.isin(lab, frames[k])
            ys, xs = np.where(keep)
            crops.append((keep, xs.min(), xs.max() + 1, ys.min(), ys.max() + 1))
        # one baseline per move (4 frames): the lowest foot in the group
        rows = []
        for r in range(len(names)):
            grp = crops[r * 4:(r + 1) * 4]
            base = max(c[4] for c in grp)
            rows.append([(c, base) for c in grp])
        W = max(c[2] - c[1] for c in crops) + 4
        H = max(base - c[3] for row in rows for c, base in row) + 4
        sheet = Image.new('RGBA', (W * 4, H * len(names)), (0, 0, 0, 0))
        for r, row in enumerate(rows):
            for f, ((keep, x0, x1, ty, by), base) in enumerate(row):
                crop = im[y0 + ty:y0 + by, x0:x1].copy()
                crop[..., 3] = np.where(keep[ty:by, x0:x1], 255, 0)
                pi = Image.fromarray(crop)
                sheet.alpha_composite(pi, (f * W + (W - (x1 - x0)) // 2, r * H + H - 2 - (base - ty)))
        sw, sh = round(W * SCALE), round(H * SCALE)
        sheet = sheet.resize((sw * 4, sh * len(names)), Image.LANCZOS)
        sheet.save(f'{OUT}/{prefix}_{who}.png', optimize=True)
        meta[prefix + '_' + who] = dict(cw=sw, ch=sh, rows=names)
    return meta
meta = {}
meta.update(cut(okc, [('2', (150, 372)), ('7', (400, 640)), ('5', (665, 910))],
                [160, 240, 320, 400, 505, 595, 675, 760, 860, 945, 1025, 1105, 1240, 1325, 1395, 1475],
                ['run', 'dribble', 'pass', 'shoot'], 'okc'))
meta.update(cut(spurs, [('1', (100, 330)), ('22', (425, 655)), ('5', (755, 985))],
                [190, 305, 430, 550, 675, 780, 880, 975, 1105, 1225, 1350, 1475],
                ['shuffle', 'block', 'steal'], 'opp'))
b = np.array(Image.open(ballf).convert('RGBA')).astype(float)
mx = b[..., :3].max(2) / 255
ys, xs = np.where(mx > 0.12)
ball = Image.fromarray(b.astype('uint8')).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
a = np.array(ball); a[..., 3] = np.where(a[..., :3].max(2) > 40, 255, 0); ball = Image.fromarray(a).resize((24, 24), Image.LANCZOS)
ball.save(f'{OUT}/ball.png', optimize=True)
print(json.dumps(meta))
