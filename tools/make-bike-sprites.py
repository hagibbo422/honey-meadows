# Cuts the uploaded bike-riding sheets into assets/bikes/ride_*.png and bike_*.png.
# Usage: python3 tools/make-bike-sprites.py <folder with the uploaded PNGs> assets/bikes
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
A = sys.argv[1]; OUT = sys.argv[2]
def load(f):
    im = np.array(Image.open(A + '/' + f).convert('RGBA'))
    return im
def comps(im, y0, y1, x0=0, x1=None, thr=200):
    a = im[y0:y1, x0:x1, 3] >= thr
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        ys, xs = sl
        if area < 25 or ys.stop - ys.start <= 5 or xs.stop - xs.start <= 3: continue
        out.append(dict(i=i, area=area, x0=xs.start + x0, x1=xs.stop + x0, y0=ys.start + y0, y1=ys.stop + y0, cx=(xs.start + xs.stop) / 2 + x0))
    return lab, out
def frame_from(im, lab, members, y0, x0):
    X0 = min(m['x0'] for m in members); X1 = max(m['x1'] for m in members)
    Y0 = min(m['y0'] for m in members); Y1 = max(m['y1'] for m in members)
    crop = im[Y0:Y1, X0:X1].copy()
    keep = np.zeros(crop.shape[:2], bool)
    for m in members:
        keep |= lab[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0] == m['i']
    # keep semi-transparent pixels adjacent to the sprite (wheel interiors, soft edges) but drop the haze
    grown = ndimage.binary_dilation(keep, iterations=1)
    alpha = crop[:, :, 3].astype(float)
    alpha = np.where(keep, 255, np.where(grown & (alpha > 120), alpha, 0))
    crop[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(crop)
def group(cs, centers):
    buckets = [[] for _ in centers]
    for c in cs:
        k = int(np.argmin([abs(c['cx'] - x) for x in centers])); buckets[k].append(c)
    return buckets
def sheet(name, frames_by_dir, dirs, scale):
    # frames_by_dir: list per dir of 4 PIL frames. Bottom-centre anchored cells.
    # The source frames drift in size from frame to frame; normalise each to the tallest frame of its direction.
    # Some source rows are squashed; resize every frame to the size of frame 1 of its direction.
    def norm(row):
        r0 = row[0]
        return [f.resize((max(1, round(r0.width * scale)), max(1, round(r0.height * scale))), Image.LANCZOS) for f in row]
    fr = [norm(row) for row in frames_by_dir]
    cw = max(f.width for r in fr for f in r) + 2; ch = max(f.height for r in fr for f in r) + 2
    sh = Image.new('RGBA', (cw * 4, ch * len(dirs)), (0, 0, 0, 0))
    for r, row in enumerate(fr):
        for c, f in enumerate(row):
            sh.alpha_composite(f, (c * cw + (cw - f.width) // 2, r * ch + ch - 1 - f.height))
    sh.save(OUT + '/ride_' + name + '.png', optimize=True)
    return dict(src='assets/bikes/ride_' + name + '.png', cw=cw, ch=ch, dirs=dirs)
SCALE = 0.74  # sheet pixels per source pixel; drawn at half size in map pixels
meta = {}
# ---- sheet 1: Annie (rows 0-3) and Hayden (rows 4-7), 8 directions per row = animation frame
im = load('1c4f2ad6-image.png')
colprof = (im[:, :, 3] >= 200).any(0)
xs = np.where(colprof)[0]
gaps = np.where(np.diff(xs) > 20)[0]
cols = np.split(xs, gaps + 1); centers = [(c[0] + c[-1]) / 2 for c in cols]
assert len(centers) == 8, centers
DIR8 = ['down', 'downright', 'right', 'upright', 'up', 'upleft', 'left', 'downleft']
APPROX = [163, 293, 421, 558, 698, 825, 932]
def cuts_for(x0, x1):
    prof = (im[:, x0:x1, 3] >= 200).sum(1)
    cs = [0]
    for a in APPROX:
        w = prof[a - 28:a + 28]
        idx = np.where(w == w.min())[0]
        cs.append(a - 28 + int(idx[len(idx) // 2]))
    return cs + [im.shape[0]]
for who, ri in [('annie', range(0, 4)), ('hayden', range(4, 8))]:
    per_dir = [[None] * 4 for _ in DIR8]
    for d, (c0, c1) in enumerate(zip([int(c[0]) for c in cols], [int(c[-1]) + 1 for c in cols])):
        cuts = cuts_for(c0, c1)
        for fi, r in enumerate(ri):
            y0, y1 = cuts[r], cuts[r + 1]
            lab, cs = comps(im, y0, y1, c0, c1)
            per_dir[d][fi] = frame_from(im, lab, cs, y0, c0)
    meta[who] = sheet(who, per_dir, DIR8, SCALE)
# ---- sheet 2: Alisa, Ralph, Nick, Madi (with Blair in trailer); 4 directions x 4 frames
im = load('562fe587-image.png')
bands = [(70, 218), (300, 452), (535, 692), (772, 930)]
C2 = [155, 232, 308, 385, 488, 585, 680, 775, 880, 962, 1042, 1124, 1226, 1312, 1402, 1490]
DIR4 = ['down', 'right', 'up', 'left']
for who, (y0, y1) in zip(['alisa', 'ralph', 'nick', 'madi'], bands):
    lab, cs = comps(im, y0, y1, 115)
    cs = [c for c in cs if c['area'] > 60]
    per_dir = [[None] * 4 for _ in DIR4]
    for k, members in enumerate(group(cs, C2)):
        per_dir[k // 4][k % 4] = frame_from(im, lab, members, y0, 115)
    meta[who] = sheet(who, per_dir, DIR4, SCALE)
# ---- static bikes
im = load('f5c7e1df-image.png')
lab, cs = comps(im, 0, im.shape[0], thr=150)
cs = sorted([c for c in cs if c['area'] > 400], key=lambda c: c['cx'])
colprof = (im[:, :, 3] >= 150).any(0); xs = np.where(colprof)[0]
gaps = np.where(np.diff(xs) > 6)[0]; cols = [c for c in np.split(xs, gaps + 1) if len(c) > 100]
print('bike cols', [(c[0], c[-1]) for c in cols])
bikes = []
names = ['blue', 'red', 'green', 'yellow', 'teal']
bcenters = [(c[0] + c[-1]) / 2 for c in cols]
lab, cs = comps(im, 0, im.shape[0], thr=150)
for k, members in enumerate(group([c for c in cs if c['area'] > 20], bcenters)):
    f = frame_from(im, lab, members, 0, 0)
    f = f.resize((round(f.width * 0.2), round(f.height * 0.2)), Image.LANCZOS)
    f.save(OUT + '/bike_' + names[k] + '.png', optimize=True)
    bikes.append(dict(id=names[k], src='assets/bikes/bike_' + names[k] + '.png', w=f.width, h=f.height))
meta['_bikes'] = bikes
json.dump(meta, open(OUT + '/meta.json', 'w'), indent=1)
print(json.dumps(meta)[:800])
