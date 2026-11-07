// Precomputes walking routes on the new town map so the browser never has to
// build the 3px navigation grid. Output: town-routes.js (window.HM_ROUTES).
// Run: node tools/build-routes.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const scope = { console, Math };
scope.window = scope;
scope.globalThis = scope;
vm.createContext(scope);
vm.runInContext(fs.readFileSync(root + '/map-data.js', 'utf8'), scope);
vm.runInContext(fs.readFileSync(__dirname + '/hm-engine.cjs', 'utf8').replace("typeof window==='undefined'?globalThis:window", 'window'), scope);
const map = scope.window.HM_MAP, { Navigation } = scope.window.HMEngine;
const t0 = Date.now(), nav = new Navigation(map);
console.log('nav nodes', nav.nodes.size, (Date.now() - t0) + 'ms');

const door = (id) => map.buildings.find((b) => b.id === id).entrance;
const P = {
  farm: door('farm'), nails: door('nails'), research: door('research'), restaurant: door('restaurant'),
  gym: door('gym'), hall: door('city-hall'), hardaway: door('hardaway'), gibbons: door('gibbons'),
  house3: door('house-3'), jones: door('jones'),
  fountain: [999, 546], parkEast: [1112, 562], parkSouth: [1020, 606], court: [1229, 446],
  dogPark: [1400, 652], plaza: [600, 340], hallWest: [451, 578], bridge: [664, 760], northEast: [964, 218],
  pond: [420, 447]
};

// Line-of-sight smoothing so routes are diagonal strokes, not 3px staircases.
function simplify(pts) {
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !nav.clear(pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out.map(([x, y]) => [Math.round(x), Math.round(y)]);
}
function leg(a, b) {
  const r = nav.route(P[a] || a, P[b] || b, 30);
  if (!r) throw new Error('No route ' + a + ' -> ' + b);
  return simplify(r);
}
function chain(names) {
  const pts = [];
  for (let i = 0; i < names.length - 1; i++) pts.push(...leg(names[i], names[i + 1]).slice(i ? 1 : 0));
  return pts;
}
const routes = {
  'farm-nails': leg('farm', 'nails'),
  'farm-research': leg('farm', 'research'),
  // Riley's walk: farmhouse -> dog park -> park loop -> home
  'dog-loop': chain(['farm', 'hallWest', 'bridge', 'dogPark', 'parkEast', 'fountain', 'hall', 'farm']),
  // Ralph & Alisa: out from the Gibbons Residence and back, one leg per stop
  'gibbons-legs': [['gibbons', 'fountain'], ['fountain', 'hall'], ['hall', 'restaurant'], ['restaurant', 'nails'], ['nails', 'gym'], ['gym', 'court'], ['court', 'gibbons']].map(([a, b]) => leg(a, b)),
  // Madi, Blair & Nick: out from the Hardaway Household and back
  // The Joneses: out from the Jones Residence and back
  'jones-legs': [['jones', 'parkSouth'], ['parkSouth', 'restaurant'], ['restaurant', 'gym'], ['gym', 'court'], ['court', 'parkEast'], ['parkEast', 'jones']].map(([a, b]) => leg(a, b)),
  'hardaway-legs': [['hardaway', 'parkEast'], ['parkEast', 'court'], ['court', 'northEast'], ['northEast', 'research'], ['research', 'plaza'], ['plaza', 'hall'], ['hall', 'hardaway']].map(([a, b]) => leg(a, b))
};
// Wednesday bike ride: walk across the bridge to the bikes parked on the south trail, then ride the
// perimeter trail all the way around the map (closed loop that starts at the bottom of the bridge).
P.bridgeTop = [664, 640];
P.bridgeBottom = [664, 989];
routes['farm-bridge'] = chain(['farm', 'bridgeTop', 'bridgeBottom']);
routes['nails-bridge'] = chain(['nails', 'bridgeTop', 'bridgeBottom']);
routes['research-bridge'] = chain(['research', 'bridgeTop', 'bridgeBottom']);
routes['gibbons-bridge'] = chain(['gibbons', 'bridgeTop', 'bridgeBottom']);
routes['hardaway-bridge'] = chain(['hardaway', 'bridgeTop', 'bridgeBottom']);
routes['jones-bridge'] = chain(['jones', 'bridgeTop', 'bridgeBottom']);
// Hayden & Annie's weekend stroll: a loop from the farmhouse through the shops, park and neighbourhood.
// Annie's weekday gym trip (Mon, Tue, Thu, Fri 6-7 PM)
routes['nails-gym'] = leg('nails', 'gym');
routes['gym-farm'] = leg('gym', 'farm');
routes['weekend-stroll'] = chain(['farm', 'nails', 'restaurant', 'gym', 'court', 'parkEast', 'fountain', 'gibbons', 'jones', 'bridge', 'hall', 'farm']);
// The painted dirt trail, traced from the artwork by tools/trace-trail.py.
routes['ride-loop'] = JSON.parse(fs.readFileSync(__dirname + '/ride-loop.json', 'utf8'));
// Points along the walkable paths, used for rain splashes.
const surfaces = [];
for (const p of map.paths) for (let i = 1; i < p.points.length; i++) {
  const [a, b] = [p.points[i - 1], p.points[i]], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 24));
  for (let k = 0; k < n; k++) surfaces.push([Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n)]);
}
routes.surfaces = surfaces;
for (const [k, v] of Object.entries(routes)) if (k !== 'surfaces') console.log(k, Array.isArray(v[0][0]) ? v.map((l) => l.length).join('/') : v.length);
fs.writeFileSync(root + '/town-routes.js', '// Generated by tools/build-routes.cjs from map-data.js. Do not edit by hand.\nwindow.HM_ROUTES=' + JSON.stringify(routes) + ';\n');
console.log('wrote town-routes.js', fs.statSync(root + '/town-routes.js').size, 'bytes');
