var HM_MAP = window.HM_MAP = {
  version: 1,
  id: "honey-meadows-expanded",
  width: 1536,
  height: 1024,
  tileSize: 16,
  navStep: 3,
  actorRadius: 4,
  spawn: [660, 650],
  buildings: [
    ["nails", "Nail Salon", [[264, 211], [282, 170], [291, 134], [310, 137], [338, 119], [395, 176], [396, 284], [269, 284]], [338, 300], 284, "nails"],
    ["research", "Research", [[405, 200], [459, 127], [513, 167], [528, 205], [514, 205], [514, 285], [408, 285]], [465, 310], 285, "research"],
    ["restaurant", "Restaurant", [[523, 185], [540, 148], [565, 148], [566, 118], [586, 117], [588, 145], [620, 116], [657, 111], [710, 147], [743, 157], [770, 208], [758, 278], [530, 278]], [662, 304], 282, null],
    ["gym", "Gym", [[767, 194], [786, 140], [836, 139], [840, 122], [860, 123], [862, 141], [902, 147], [927, 203], [911, 204], [911, 289], [778, 289]], [847, 310], 289, null],
    ["farm", "Farmhouse", [[130, 411], [151, 375], [151, 340], [171, 340], [171, 369], [242, 319], [339, 414], [340, 519], [133, 519]], [248, 535], 523, "farm"],
    ["city-hall", "City Hall", [[517, 437], [535, 422], [559, 422], [559, 387], [633, 389], [638, 344], [663, 319], [687, 344], [693, 389], [751, 389], [759, 417], [787, 422], [813, 448], [813, 553], [739, 571], [710, 571], [710, 607], [625, 607], [625, 573], [546, 562], [518, 550]], [666, 626], 608, "headquarters"],
    ["hardaway", "Hardaway Residence", [[808, 710], [839, 672], [883, 671], [922, 639], [970, 676], [991, 715], [978, 716], [978, 781], [815, 781]], [902, 804], 788, null],
    ["gibbons", "Gibbons Residence", [[1031, 710], [1048, 685], [1077, 685], [1116, 646], [1152, 666], [1153, 645], [1169, 647], [1169, 686], [1193, 711], [1181, 714], [1181, 783], [1036, 783]], [1128, 804], 788, null],
    ["house-3", "House 3", [[806, 875], [840, 835], [881, 801], [914, 833], [960, 878], [947, 880], [947, 942], [818, 942]], [886, 960], 946, null],
    ["jones", "Jones Residence", [[1032, 872], [1073, 831], [1116, 810], [1164, 837], [1165, 809], [1181, 809], [1183, 849], [1210, 877], [1201, 881], [1201, 942], [1041, 942]], [1128, 960], 948, null],
    ["gazebo", "Park Gazebo", [[951, 465], [966, 443], [1003, 424], [1039, 445], [1054, 468], [1038, 478], [1038, 525], [1015, 534], [971, 525], [968, 478]], [999, 546], 532, null]
  ].map(([id, name, polygon, entrance, depth, legacyId]) => ({ id, name, polygon, entrance, depth, legacyId, interiorId: legacyId || id, chunk: "town-core" })),
  // Narrow, conservative corridor centers. Width is total walkable width.
  paths: [{ "id": "walk-0", "surface": "stone", "width": 30, "points": [[662, 990], [662, 842]] }, { "id": "walk-1", "surface": "stone", "width": 20, "points": [[780, 823], [763, 828], [742, 841], [663, 841]] }, { "id": "walk-2", "surface": "stone", "width": 30, "points": [[663, 1004], [662, 993]] }, { "id": "walk-3", "surface": "stone", "width": 28, "points": [[512, 336], [523, 341], [635, 341]] }, { "id": "walk-4", "surface": "stone", "width": 20, "points": [[781, 822], [784, 812], [788, 809], [900, 809]] }, { "id": "walk-5", "surface": "stone", "width": 18, "points": [[999, 810], [999, 964]] }, { "id": "walk-6", "surface": "stone", "width": 28, "points": [[844, 624], [854, 634], [866, 637], [998, 640]] }, { "id": "walk-7", "surface": "stone", "width": 16, "points": [[885, 964], [884, 949]] }, { "id": "walk-8", "surface": "stone", "width": 23, "points": [[1248, 649], [1245, 658], [1251, 664]] }, { "id": "walk-9", "surface": "stone", "width": 28, "points": [[836, 319], [818, 322], [794, 336], [776, 341], [637, 341]] }, { "id": "walk-10", "surface": "stone", "width": 22, "points": [[660, 298], [660, 308], [657, 311], [643, 311], [637, 315], [636, 340]] }, { "id": "walk-11", "surface": "stone", "width": 18, "points": [[999, 641], [999, 808]] }, { "id": "walk-12", "surface": "stone", "width": 20, "points": [[998, 965], [886, 965]] }, { "id": "walk-13", "surface": "stone", "width": 14, "points": [[1493, 665], [1513, 735], [1518, 815], [1499, 882], [1468, 934], [1463, 939], [1394, 969], [1260, 972], [1243, 969], [1238, 965]] }, { "id": "walk-14", "surface": "stone", "width": 20, "points": [[1126, 965], [1e3, 965]] }, { "id": "walk-15", "surface": "stone", "width": 15, "points": [[1127, 790], [1127, 808]] }, { "id": "walk-16", "surface": "stone", "width": 24, "points": [[451, 620], [448, 548]] }, { "id": "walk-17", "surface": "stone", "width": 28, "points": [[946, 311], [847, 311], [837, 318]] }, { "id": "walk-18", "surface": "stone", "width": 17, "points": [[1127, 964], [1128, 951]] }, { "id": "walk-19", "surface": "stone", "width": 10, "points": [[964, 102], [956, 95]] }, { "id": "walk-20", "surface": "stone", "width": 16, "points": [[46, 269], [30, 217], [43, 178], [49, 171], [94, 153], [167, 151], [224, 123], [278, 102], [404, 102], [484, 83], [585, 73], [676, 72], [767, 59], [774, 60], [840, 95], [916, 101], [955, 94]] }, { "id": "walk-21", "surface": "stone", "width": 15, "points": [[901, 792], [901, 808]] }, { "id": "walk-22", "surface": "stone", "width": 20, "points": [[1128, 965], [1237, 965]] }, { "id": "walk-23", "surface": "stone", "width": 23, "points": [[511, 336], [505, 342], [460, 362], [422, 414], [419, 444], [422, 453], [443, 476], [446, 486], [448, 546]] }, { "id": "walk-24", "surface": "stone", "width": 20, "points": [[884, 965], [800, 965], [785, 958], [781, 823]] }, { "id": "walk-25", "surface": "stone", "width": 28, "points": [[47, 270], [58, 272], [104, 296], [161, 307], [506, 306], [512, 314], [512, 335]] }, { "id": "walk-26", "surface": "stone", "width": 30, "points": [[662, 636], [662, 840]] }, { "id": "walk-27", "surface": "stone", "width": 27, "points": [[1248, 647], [1e3, 640]] }, { "id": "walk-28", "surface": "stone", "width": 15, "points": [[868, 589], [861, 584], [850, 584]] }, { "id": "walk-29", "surface": "stone", "width": 19, "points": [[663, 992], [675, 992], [685, 998]] }, { "id": "walk-30", "surface": "stone", "width": 20, "points": [[1228, 450], [1229, 480], [1252, 522], [1254, 531], [1253, 640], [1249, 646]] }, { "id": "walk-31", "surface": "stone", "width": 16, "points": [[165, 539], [353, 536], [396, 547], [447, 547]] }, { "id": "walk-32", "surface": "stone", "width": 21, "points": [[844, 623], [847, 620], [849, 585]] }, { "id": "walk-33", "surface": "stone", "width": 22, "points": [[1244, 801], [1244, 808]] }, { "id": "walk-34", "surface": "stone", "width": 15, "points": [[1493, 663], [1513, 622], [1514, 610], [1494, 552], [1490, 490], [1499, 433], [1481, 350], [1504, 274], [1473, 131], [1395, 84], [1259, 65], [1116, 65], [1019, 76], [956, 94]] }, { "id": "walk-35", "surface": "stone", "width": 28, "points": [[1249, 649], [1286, 654], [1430, 653], [1492, 664]] }, { "id": "walk-36", "surface": "stone", "width": 15, "points": [[46, 271], [30, 314], [22, 366], [18, 539], [29, 600], [30, 625], [24, 677], [21, 784], [31, 861], [64, 914], [70, 919], [95, 926], [267, 969], [406, 975], [540, 991], [661, 991]] }, { "id": "walk-37", "surface": "stone", "width": 27, "points": [[661, 635], [603, 637], [521, 621], [452, 620]] }, { "id": "walk-38", "surface": "stone", "width": 21, "points": [[451, 621], [450, 629], [460, 640]] }, { "id": "walk-39", "surface": "stone", "width": 30, "points": [[663, 633], [663, 625]] }, { "id": "walk-40", "surface": "stone", "width": 28, "points": [[663, 633], [740, 624], [843, 624]] }, { "id": "walk-41", "surface": "stone", "width": 20, "points": [[1243, 809], [1128, 809]] }, { "id": "walk-42", "surface": "stone", "width": 20, "points": [[1238, 964], [1244, 810]] }, { "id": "walk-43", "surface": "stone", "width": 20, "points": [[998, 809], [902, 809]] }, { "id": "walk-44", "surface": "stone", "width": 20, "points": [[1126, 809], [1e3, 809]] }, { "id": "walk-45", "surface": "stone", "width": 20, "points": [[837, 319], [840, 323], [839, 367], [828, 405], [852, 462], [849, 583]] }, { "id": "walk-46", "surface": "stone", "width": 16, "points": [[46, 270], [46, 270]] }, { "id": "walk-47", "surface": "stone", "width": 30, "points": [[662, 992], [662, 992]] }, { "id": "walk-48", "surface": "stone", "width": 22, "points": [[885, 965], [885, 965]] }, { "id": "walk-49", "surface": "stone", "width": 22, "points": [[849, 584], [849, 584]] }, { "id": "walk-50", "surface": "stone", "width": 30, "points": [[662, 635], [662, 635]] }, { "id": "walk-51", "surface": "stone", "width": 30, "points": [[636, 341], [636, 341]] }, { "id": "walk-52", "surface": "stone", "width": 30, "points": [[662, 991], [662, 991]] }, { "id": "walk-53", "surface": "stone", "width": 24, "points": [[448, 547], [448, 547]] }, { "id": "walk-54", "surface": "stone", "width": 28, "points": [[999, 640], [999, 640]] }, { "id": "walk-55", "surface": "stone", "width": 30, "points": [[1249, 647], [1249, 647]] }, { "id": "walk-56", "surface": "stone", "width": 24, "points": [[1244, 809], [1244, 809]] }, { "id": "walk-57", "surface": "stone", "width": 30, "points": [[662, 841], [662, 841]] }, { "id": "walk-58", "surface": "stone", "width": 16, "points": [[1493, 664], [1493, 664]] }, { "id": "walk-59", "surface": "stone", "width": 30, "points": [[999, 809], [999, 809]] }, { "id": "walk-60", "surface": "stone", "width": 23, "points": [[999, 965], [999, 965]] }, { "id": "walk-61", "surface": "stone", "width": 22, "points": [[1127, 809], [1127, 809]] }, { "id": "walk-62", "surface": "stone", "width": 30, "points": [[1249, 648], [1249, 648]] }, { "id": "walk-63", "surface": "stone", "width": 22, "points": [[1127, 965], [1127, 965]] }, { "id": "walk-64", "surface": "stone", "width": 22, "points": [[901, 809], [901, 809]] }],
  blockers: [
    // Furniture interrupting broad plaza connections.
    [[538, 278], [588, 278], [588, 331], [538, 331]],
    [[580, 280], [622, 280], [622, 330], [580, 330]],
    [[695, 277], [753, 277], [753, 333], [695, 333]]
  ],
  trees: [
    [481, 467, 40, 69],
    [496, 381, 24, 52],
    [869, 408, 32, 67],
    [788, 409, 29, 58],
    [914, 471, 27, 52],
    [966, 378, 56, 87],
    [1288, 556, 50, 87],
    [1361, 581, 48, 79],
    [1440, 582, 49, 82],
    [1319, 487, 48, 72],
    [1450, 484, 53, 85],
    [998, 905, 53, 76],
    [1216, 751, 43, 69],
    [791, 918, 30, 60],
    [766, 736, 31, 53],
    [520, 706, 29, 55],
    [383, 597, 26, 65],
    [366, 176, 22, 44],
    [734, 119, 26, 62],
    [274, 891, 54, 76],
    [133, 884, 34, 63],
    [1351, 989, 42, 59]
  ].map(([x, y, rx, h], i) => ({ id: "tree-" + i, depth: y, polygon: [[x - rx, y - h * 0.48], [x - rx * 0.75, y - h * 0.85], [x, y - h], [x + rx * 0.8, y - h * 0.78], [x + rx, y - h * 0.35], [x + 9, y - 12], [x + 7, y], [x - 8, y], [x - 9, y - 12]] })),
  layers: [{ id: "ground", type: "image", src: "assets/town-clean.png" }, { id: "navigation", type: "corridors" }, { id: "actors", type: "dynamic" }, { id: "foreground", type: "depth-polygons" }],
  chunks: [{ id: "town-core", bounds: [0, 0, 1536, 1024], neighbors: [], expansionPorts: [{ id: "north", position: [760, 61] }, { id: "south", position: [664, 1005] }] }]
};
HM_MAP.props = [[208, 302, 52], [465, 350, 53], [835, 350, 50], [406, 493, 54], [486, 652, 57], [622, 711, 55], [703, 710, 54], [845, 625, 48], [964, 629, 49], [1082, 539, 52], [1280, 631, 53], [1018, 807, 50], [1018, 953, 50], [1370, 809, 56], [209, 790, 52], [583, 842, 52], [710, 842, 49], [629, 982, 55], [697, 983, 56]].map(([x, y, h], i) => ({ id: "lamp-" + i, depth: y, polygon: [[x - 9, y - h + 4], [x - 5, y - h], [x + 5, y - h], [x + 9, y - h + 4], [x + 5, y - h + 17], [x + 3, y - 6], [x + 6, y - 2], [x + 5, y], [x - 5, y], [x - 6, y - 2], [x - 3, y - 6], [x - 5, y - h + 17]], footprint: [[x - 3, y - 3], [x + 3, y - 3], [x + 3, y + 2], [x - 3, y + 2]] }));
HM_MAP.blockers.push(...HM_MAP.props.map((p) => p.footprint));
const wallBoxes = [[274, 230, 390, 282], [410, 229, 513, 285], [535, 222, 754, 279], [778, 224, 912, 288], [139, 443, 333, 521], [522, 471, 811, 555], [816, 727, 978, 784], [1037, 719, 1181, 785], [820, 879, 945, 944], [1044, 882, 1200, 945], [968, 481, 1038, 525]];
HM_MAP.buildings.forEach((b, i) => {
  const [x, y, r, d] = wallBoxes[i];
  b.collision = [[x, y], [r, y], [r, d], [x, d]];
});
HM_MAP.trees.push(...[[17, 158, 24, 73], [144, 144, 26, 69], [216, 164, 24, 55], [19, 338, 21, 70], [48, 421, 24, 66], [20, 598, 24, 60], [37, 740, 25, 74], [80, 863, 40, 80], [148, 863, 36, 65], [230, 938, 53, 82], [394, 951, 38, 64], [471, 943, 32, 58], [574, 969, 26, 52], [1514, 165, 21, 68], [1515, 324, 25, 70], [1506, 398, 22, 52], [1530, 529, 22, 70], [1506, 597, 25, 66], [1520, 728, 20, 65], [1530, 842, 20, 65], [1466, 985, 47, 69], [1257, 998, 36, 70], [734, 122, 25, 68], [800, 384, 24, 60], [1064, 699, 22, 49], [850, 835, 20, 47]].map(([x, y, rx, h], i) => ({ id: "edge-tree-" + i, depth: y, polygon: [[x - rx, y - h * 0.48], [x - rx * 0.75, y - h * 0.85], [x, y - h], [x + rx * 0.8, y - h * 0.78], [x + rx, y - h * 0.35], [x + 7, y - 10], [x + 6, y], [x - 7, y], [x - 8, y - 10]] })));
HM_MAP.blockers.push(...HM_MAP.trees.map((t) => {
  const bottom = t.polygon.filter((p) => p[1] === t.depth), x = (bottom[0][0] + bottom[1][0]) / 2, y = t.depth;
  return [[x - 4, y - 5], [x + 4, y - 5], [x + 4, y + 2], [x - 4, y + 2]];
}));
HM_MAP.presentation = { sprites: false };
HM_MAP.buildings.forEach((b) => b.interactive = b.id !== "gazebo");
HM_MAP.venues = [
  { id: "football-field", name: "Football Field", type: "sports", polygon: [[1107, 159], [1365, 159], [1365, 246], [1107, 246]], interactive: true },
  { id: "basketball-court", name: "Basketball Court", type: "sports", polygon: [[1118, 327], [1337, 327], [1337, 413], [1118, 413]], interactive: true }
];
HM_MAP.presentation.weatherVariants = { day: "assets/town-clean.png", night: "assets/town-night.png", rain: "assets/town-rain.png" };
HM_MAP.presentation.lightsOffVariants = { day: "assets/town-day-lights-off.png", night: "assets/town-night-lights-off.png", rain: "assets/town-rain-lights-off.png" };
HM_MAP.presentation.sportsLighting = {
  football: { fixtureCount: 4, fixtures: [[1055, 53], [1389, 51], [1039, 244], [1423, 245]], polygon: [[997, 18], [1466, 18], [1466, 288], [997, 288]] },
  basketball: { fixtureCount: 2, fixtures: [[1101, 333], [1356, 333]], polygon: [[1080, 289], [1380, 289], [1380, 451], [1080, 451]] }
};
HM_MAP.interiors = { gym: { src: "assets/interiors/gym.png", title: "Gym", embeddedBack: true }, restaurant: { src: "assets/interiors/restaurant.png", title: "Restaurant", embeddedBack: true }, gibbons: { src: "assets/interiors/gibbons.png", title: "Gibbons Residence", embeddedBack: true }, hardaway: { src: "assets/interiors/hardaway.png", title: "Hardaway Household", embeddedBack: false } };
HM_MAP.buildings.find((b) => b.id === "hardaway").name = "Hardaway Household";
Object.values(HM_MAP.interiors).forEach((room) => room.embeddedBack = false);
