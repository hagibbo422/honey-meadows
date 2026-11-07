# Turns tools/walk-mask.png (white = walkable, 1536x1024) into the `paths` list in map-data.js:
# the mask is thinned to centre lines, traced into polylines between junctions, simplified, and each
# polyline gets a width from the mask's thickness. Run: python3 tools/mask-to-paths.py && node tools/build-routes.cjs
import json, os, re
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
m = np.array(Image.open(os.path.join(root, 'tools/walk-mask.png')).convert('L')) > 128
m = ndimage.binary_closing(m, iterations=2)
lab, n = ndimage.label(m)
sizes = ndimage.sum(m, lab, range(1, n + 1))
m = np.isin(lab, 1 + np.where(sizes > 300)[0])
dist = ndimage.distance_transform_edt(m)
sk = skeletonize(m)
H, W = sk.shape
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def nbrs(y, x):
    return [(y + dy, x + dx) for dy, dx in N8 if 0 <= y + dy < H and 0 <= x + dx < W and sk[y + dy, x + dx]]
pts = set(zip(*np.where(sk)))
deg = {p: len(nbrs(*p)) for p in pts}
nodes = {p for p, d in deg.items() if d != 2}
seen_edges = set()
polys = []
def walk(start, first):
    line = [start, first]
    prev, cur = start, first
    while cur not in nodes:
        nxt = [q for q in nbrs(*cur) if q != prev and q not in line[-3:]]
        if not nxt: break
        prev, cur = cur, nxt[0]
        line.append(cur)
    return line
for s in nodes:
    for f in nbrs(*s):
        key = frozenset((s, f))
        if key in seen_edges: continue
        line = walk(s, f)
        for a, b in zip(line, line[1:]): seen_edges.add(frozenset((a, b)))
        if len(line) >= 4: polys.append(line)
# closed loops with no junctions
left = pts - {p for l in polys for p in l}
while left:
    s = left.pop(); nb = nbrs(*s)
    if not nb: continue
    line = walk(s, nb[0]); polys.append(line + [s]); left -= set(line)
def rdp(p, eps):
    if len(p) < 3: return p
    a, b = np.array(p[0], float), np.array(p[-1], float); ab = b - a; L = np.hypot(*ab) or 1
    d = [abs(ab[0] * (q[1] - a[1]) - ab[1] * (q[0] - a[0])) / L for q in p[1:-1]]
    i = int(np.argmax(d)) + 1
    return rdp(p[:i + 1], eps)[:-1] + rdp(p[i:], eps) if d[i - 1] > eps else [p[0], p[-1]]
paths = []
for i, l in enumerate(polys):
    xy = [(int(x), int(y)) for y, x in l]
    simp = rdp(xy, 2.0)
    w = float(np.median([dist[y, x] for y, x in l])) * 2
    if len(l) < 12 and w < 6: continue
    paths.append({'id': 'walk-%d' % i, 'surface': 'stone', 'width': max(10, min(30, round(w))), 'points': [list(p) for p in simp]})
print(len(paths), 'paths')
p = os.path.join(root, 'map-data.js'); s = open(p).read()
i = s.index('paths: [') + 1; depth = 0
for j in range(i + 7, len(s)):
    if s[j] == '[': depth += 1
    elif s[j] == ']':
        if depth == 0: break
        depth -= 1
s = s[:i - 1] + 'paths: ' + json.dumps(paths, separators=(',', ':')) + s[j + 1:]
open(p, 'w').write(s)
