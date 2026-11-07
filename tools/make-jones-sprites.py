# Cuts the Jones walking/biking sheet into game sprites:
#   assets/npc_jones_f.png, assets/npc_jones_m.png      4x4 walk sheets (64x96 cells; rows down,left,right,up)
#   assets/bikes/ride_jones_f.png, ride_jones_m.png      4x4 ride sheets (rows down,right,up,left)
# Usage: python3 tools/make-jones-sprites.py <sheet.png> assets
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
src, OUT = sys.argv[1:3]
im = np.array(Image.open(src).convert('RGBA'))
rgb = im[..., :3].astype(float) / 255
gm = np.zeros(rgb.shape[:2])
for c in range(3):
    gm = np.maximum(gm, np.hypot(ndimage.sobel(rgb[..., c], 1), ndimage.sobel(rgb[..., c], 0)))
closed = ndimage.binary_closing(gm > 0.25, iterations=2)
fg = ndimage.binary_fill_holes(closed)
# holes that are just background seen through the bike frame / between legs: flat and dark -> transparent
holes, nh = ndimage.label(fg & ~closed)
for i, sl in enumerate(ndimage.find_objects(holes), 1):
    reg = holes[sl] == i
    if reg.sum() < 20 or gm[sl][reg].mean() > 0.12: continue
    # compare the hole's colour with the background just outside this sprite
    y0_, x0_ = max(0, sl[0].start - 40), max(0, sl[1].start - 40)
    win = (slice(y0_, sl[0].stop + 40), slice(x0_, sl[1].stop + 40))
    bg = ~ndimage.binary_dilation(fg[win], iterations=2)
    if bg.sum() < 50: continue
    hc = rgb[sl][reg].mean(0); bc = np.median(rgb[win][bg], 0)
    if hc.max() > 0.13 and np.abs(hc - bc).max() < 0.035:
        fg[sl][reg] = False
fg = ndimage.binary_erosion(ndimage.binary_opening(fg, iterations=1), iterations=2)
GROUPS = [(178, 480), (480, 815), (815, 1165), (1165, 1520)]  # down, left, right, up (sheet order)
BANDS = {'f_walk': (22, 198), 'f_bike': (255, 447), 'm_walk': (515, 703), 'm_bike': (760, 953)}
def frames(band):
    y0, y1 = BANDS[band]
    out = []
    for gx0, gx1 in GROUPS:
        cols = np.where(fg[y0:y1, gx0:gx1].sum(0) > 2)[0]
        gx0, gx1 = gx0 + int(cols[0]), gx0 + int(cols[-1]) + 1
        w = (gx1 - gx0) / 4
        prof = fg[y0:y1, gx0:gx1].sum(0)
        cuts = [0]
        for k in (1, 2, 3):
            a, b = int(k * w - w * 0.35), int(k * w + w * 0.35)
            seg = prof[a:b]
            idx = np.where(seg == seg.min())[0]
            cuts.append(a + int(idx[len(idx) // 2]))
        cuts.append(gx1 - gx0)
        row = []
        for k in range(4):
            lo, hi = gx0 + cuts[k], gx0 + cuts[k + 1]
            m = fg[y0:y1, lo:hi]
            lab, n = ndimage.label(m)
            if not n: raise SystemExit(f'{band}: empty cell {gx0}+{k}')
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            keep = np.isin(lab, 1 + np.where(sizes > 0.15 * sizes.max())[0])
            # drop flat patches of backdrop trapped where two frames touch
            cell = rgb[y0:y1, lo:hi]
            bc = np.median(cell[~ndimage.binary_dilation(m, iterations=2)], 0)
            flat = ndimage.uniform_filter(gm[y0:y1, lo:hi], 5) < 0.08
            near = np.abs(cell - bc).max(2) < 0.045
            junk = ndimage.binary_opening(flat & near & keep, iterations=2)
            jl, jn = ndimage.label(junk)
            for jj, jsl in enumerate(ndimage.find_objects(jl), 1):
                if jsl[1].start <= 1 or jsl[1].stop >= junk.shape[1] - 1:  # only patches at the cut edges
                    keep[jl == jj] = False
            ys, xs = np.where(keep)
            crop = im[y0 + ys.min():y0 + ys.max() + 1, lo + xs.min():lo + xs.max() + 1].copy()
            crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
            row.append(Image.fromarray(crop))
        out.append(row)
    return out  # [down, left, right, up]
def sheet(rows, cw, ch, target_h, path):
    scale = target_h / max(f.height for f in rows[0])
    sh = Image.new('RGBA', (cw * 4, ch * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, f in enumerate(row):
            g = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
            if g.width > cw:
                k = cw / g.width
                g = g.resize((cw, max(1, round(g.height * k))), Image.LANCZOS)
            sh.alpha_composite(g, (c * cw + (cw - g.width) // 2, r * ch + ch - 1 - g.height))
    sh.save(path, optimize=True)
for who in ('f', 'm'):
    d, l, r, u = frames(who + '_walk')
    sheet([d, l, r, u], 64, 96, 94, f'{OUT}/npc_jones_{who}.png')
    d, l, r, u = frames(who + '_bike')
    sheet([d, r, u, l], 74, 101, 96, f'{OUT}/bikes/ride_jones_{who}.png')
print('ok')
# His two middle front-view bike frames touch in the source art and can't be cut cleanly;
# reuse the clean first and last frames for them (the pedal animation still alternates).
p = f'{OUT}/bikes/ride_jones_m.png'
sh = Image.open(p)
f0, f3 = sh.crop((0, 0, 74, 101)), sh.crop((222, 0, 296, 101))
sh.paste(f0, (74, 0)); sh.paste(f3, (148, 0))
sh.save(p, optimize=True)
# Full-size standing portraits (left column) for the Settings → Characters panel.
for who, (py0, py1) in (('f', (20, 490)), ('m', (505, 1010))):
    m = fg[py0:py1, 0:178]
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = lab == 1 + int(np.argmax(sizes))
    keep = ndimage.binary_dilation(keep, iterations=2) & ndimage.binary_fill_holes(ndimage.binary_closing(gm[py0:py1, 0:178] > 0.25, iterations=2))
    ys, xs = np.where(keep)
    crop = im[py0 + ys.min():py0 + ys.max() + 1, xs.min():xs.max() + 1].copy()
    crop[..., 3] = np.where(keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
    Image.fromarray(crop).save(f'{OUT}/portrait_jones_{who}.png', optimize=True)
