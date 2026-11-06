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
  paths: [
    { id: "upper-plaza", surface: "stone", width: 28, points: [[204, 307], [503, 307], [518, 340], [785, 340], [841, 310], [947, 310]] },
    { id: "shop-front", surface: "stone", width: 24, points: [[338, 300], [465, 300], [518, 300], [518, 340]] },
    { id: "restaurant-door", surface: "stone", width: 20, points: [[662, 294], [662, 311], [638, 311], [638, 340]] },
    { id: "north-east", surface: "stone", width: 24, points: [[947, 310], [951, 264], [964, 218], [972, 148], [962, 112], [836, 94], [784, 61], [760, 61], [790, 108], [785, 134]] },
    { id: "west-hall", surface: "stone", width: 23, points: [[505, 340], [460, 363], [425, 409], [420, 447], [448, 478], [451, 578], [452, 641], [438, 688], [430, 723]] },
    { id: "farm-door", surface: "stone", width: 16, points: [[248, 535], [360, 535], [397, 546], [447, 546]] },
    { id: "hall-south", surface: "stone", width: 28, points: [[451, 618], [532, 620], [598, 635], [664, 633], [733, 623], [848, 621], [856, 634], [1237, 644], [1280, 652], [1434, 652]] },
    { id: "hall-east", surface: "stone", width: 20, points: [[841, 310], [840, 371], [828, 406], [854, 458], [851, 533], [848, 621]] },
    { id: "main-bridge", surface: "stone-bridge", width: 30, points: [[664, 620], [664, 699], [664, 835], [664, 1005]] },
    { id: "neighborhood-upper", surface: "stone", width: 20, points: [[664, 839], [747, 839], [788, 807], [1e3, 807], [1238, 807]] },
    { id: "neighborhood-spine", surface: "stone", width: 18, points: [[1e3, 644], [1e3, 965]] },
    { id: "neighborhood-lower", surface: "stone", width: 20, points: [[784, 807], [784, 963], [1239, 963], [1246, 807], [1246, 647]] },
    { id: "hardaway-door", surface: "stone", width: 14, points: [[902, 788], [902, 807]] },
    { id: "gibbons-door", surface: "stone", width: 14, points: [[1128, 788], [1128, 807]] },
    { id: "house3-door", surface: "stone", width: 14, points: [[886, 946], [886, 963]] },
    { id: "jones-door", surface: "stone", width: 14, points: [[1128, 948], [1128, 963]] },
    { id: "court-front", surface: "stone", width: 20, points: [[1229, 446], [1228, 477], [1255, 526], [1253, 642]] },
    { id: "park-walk", surface: "stone", width: 14, points: [[855, 582], [903, 583], [940, 562], [977, 549], [999, 546], [1014, 540], [1082, 540], [1120, 568], [1118, 589], [1073, 606], [971, 606], [903, 583]] },
    { id: "perimeter", surface: "dirt", width: 15, points: [[664, 989], [557, 990], [412, 974], [267, 966], [173, 943], [70, 916], [34, 859], [24, 776], [27, 684], [34, 612], [21, 536], [24, 452], [25, 367], [35, 309], [50, 266], [32, 217], [48, 174], [95, 153], [165, 153], [224, 125], [279, 102], [411, 102], [483, 84], [590, 73], [667, 73], [760, 61], [835, 94], [950, 94], [1017, 77], [1120, 65], [1264, 66], [1395, 84], [1474, 131], [1491, 214], [1505, 274], [1480, 351], [1500, 433], [1490, 491], [1495, 555], [1516, 614], [1492, 663], [1513, 732], [1519, 810], [1499, 881], [1466, 935], [1398, 966], [1263, 974], [1239, 963]] },
    { id: "west-exit", surface: "stone", width: 16, points: [[204, 307], [163, 307], [103, 294], [50, 266]] },
    { id: "south-link", surface: "stone", width: 16, points: [[664, 989], [784, 989], [784, 963]] },
    { id: "east-link", surface: "stone", width: 16, points: [[1434, 652], [1492, 663]] }
  ],
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
