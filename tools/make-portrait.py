# Cuts a single character picture on a dark glowing background into a transparent portrait,
# keeping every bit of the character: the background is flood-filled in from the edges through
# dark pixels only, so bright hair/skin/clothes can never be removed; the character's dark outline
# is then added back.
# Usage: python3 tools/make-portrait.py <picture.png> <out.png>
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1:3]
im = np.array(Image.open(src).convert('RGBA'))
v = im[..., :3].max(2).astype(float) / 255
rgb = im[..., :3].astype(float) / 255
gm = np.zeros(v.shape)
for c in range(3):
    gm = np.maximum(gm, np.hypot(ndimage.sobel(rgb[..., c], 1), ndimage.sobel(rgb[..., c], 0)))
# background + its soft glow: darkish and smooth (no pixel-art edges)
soft = (v < 0.62) & (ndimage.maximum_filter(gm, 3) < 0.35)
lab, n = ndimage.label(soft)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
fg = ndimage.binary_fill_holes(~bg)
# large enclosed patches of background (e.g. the gap between the legs) are background too
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    if i in edge or sl is None: continue
    reg = lab[sl] == i
    warm = (rgb[sl][..., 0] - rgb[sl][..., 2])[reg].mean()
    if reg.sum() > 800 and v[sl][reg].mean() < 0.35 and warm > 0.05:
        fg[sl][reg] = False
# pixel-level glow left between body parts: dark, warm, perfectly smooth, in blobs of 60+ px
glow = (v < 0.3) & ((rgb[..., 0] - rgb[..., 2]) > 0.04) & (ndimage.maximum_filter(gm, 3) < 0.2) & fg
gl, gn = ndimage.label(glow)
gs = ndimage.sum(glow, gl, range(1, gn + 1))
fg &= ~np.isin(gl, 1 + np.where(gs >= 600)[0])
fg = ndimage.binary_opening(fg, iterations=1)
lab2, n2 = ndimage.label(fg)
sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
fg = lab2 == 1 + int(np.argmax(sizes))
ys, xs = np.where(fg)
crop = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
crop[..., 3] = np.where(fg[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 255, 0)
Image.fromarray(crop).save(out, optimize=True)
print(crop.shape)
