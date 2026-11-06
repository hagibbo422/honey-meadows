# Traces the painted dirt trail that rings the town (assets/town/day.jpg) and writes
# tools/ride-loop.json: a closed loop starting at the bottom of the bridge, heading west.
# Run: python3 tools/trace-trail.py   (then node tools/build-routes.cjs)
import json, math, os
import numpy as np
from PIL import Image
from scipy import ndimage
root = os.path.join(os.path.dirname(__file__), '..')
hsv = np.array(Image.open(os.path.join(root, 'assets/town/day.jpg')).convert('HSV')).astype(float)
h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
m = (h > 22) & (h < 40) & (s > 0.42) & (s < 0.8) & (v > 0.82)
m = ndimage.binary_opening(ndimage.binary_closing(m, iterations=2), iterations=2)
# keep only big dirt regions (the trail is long and thin; stray specks are small)
lab, n = ndimage.label(m)
areas = ndimage.sum(m, lab, range(1, n + 1))
ring = np.isin(lab, 1 + np.where(areas > 800)[0])
H, W = ring.shape
cx, cy = 768, 520
pts = []
for k in range(1440):
    a = k / 1440 * 2 * math.pi
    dx, dy = math.cos(a), math.sin(a)
    runs, inrun, start = [], False, 0
    for r in range(150, 900):
        x, y = int(cx + dx * r), int(cy + dy * r)
        if not (0 <= x < W and 0 <= y < H):
            break
        on = ring[y, x]
        if on and not inrun: inrun, start = True, r
        if not on and inrun:
            inrun = False
            runs.append((start, r))
    if inrun: runs.append((start, r))
    runs = [ru for ru in runs if ru[1] - ru[0] >= 6]
    pts.append((cx + dx * (runs[-1][0] + runs[-1][1]) / 2, cy + dy * (runs[-1][0] + runs[-1][1]) / 2) if runs else None)
# Work in radius-per-angle. Where trees hide the trail the outermost dirt is an inner path, giving
# inward spikes: drop samples well inside the local (circular) median, then interpolate gaps.
R = np.array([math.hypot(p[0] - cx, p[1] - cy) if p else np.nan for p in pts])
for _ in range(3):
    med = np.array([np.nanmedian(np.take(R, range(i - 20, i + 21), mode='wrap')) for i in range(1440)])
    R[np.abs(R - med) > 18] = np.nan
good = np.where(~np.isnan(R))[0]
R = np.interp(np.arange(1440), np.concatenate([good - 1440, good, good + 1440]), np.concatenate([R[good]] * 3))
ang = np.arange(1440) / 1440 * 2 * math.pi
pts = list(zip(cx + np.cos(ang) * R, cy + np.sin(ang) * R))
P = np.array(pts)
for _ in range(6):  # smooth
    P = (np.roll(P, 1, 0) + 2 * P + np.roll(P, -1, 0)) / 4
P = (np.roll(P, 3, 0) + np.roll(P, -3, 0) + P) / 3
# start at the point nearest the bottom of the bridge, then head west (increasing angle)
i0 = int(np.argmin((P[:, 0] - 664) ** 2 + (P[:, 1] - 990) ** 2))
P = np.roll(P, -i0, 0)
out, last = [], None
for x, y in P:
    if last is None or math.hypot(x - last[0], y - last[1]) >= 10:
        out.append([round(x), round(y)]); last = (x, y)
out.append(out[0])
json.dump(out, open(os.path.join(root, 'tools/ride-loop.json'), 'w'))
print(len(out), 'points, start', out[0], 'next', out[1])
