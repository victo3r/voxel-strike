startMap('town', {
  name: 'Christmas Town', size: 'large', half: 42, surf: 'snow', winter: true,
  env: { sky: 0x1b2748, fog: 0x2b3962, fogNear: 34, fogFar: 135, hemiSky: 0xc6d2f6, hemiGround: 0x5c668e, hemi: .95, sunColor: 0xcfd8ff, sun: .55, sunDir: [-10, 17, 9] }, // dusk, the moon up (sun = moon)
  pads: [[0, 16], [-21.5, 4], [18, 4], [-12, -21], [14, -21], [0, -34], [-33, 29], [25, 30]],
  crates: [],
}, () => {
const M = MAPS.town, rnd = seeded(2512), r16 = () => Math.random() * 16 | 0;

// materials
const dots = (g, col, n, w = 1, h = 1) => { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(r16(), r16(), w, h); };
const snowDraw = g => { noise(g, [226, 232, 244], 7); dots(g, 'rgba(168,188,226,.5)', 5); };
const snow = surf(lam({ map: tex(snowDraw) }), 'snow');
const timber = rgb => surf(lam({ map: tex(g => { noise(g, rgb, 7); dots(g, 'rgba(255,255,255,.16)', 7, 2, 1); dots(g, 'rgba(70,50,30,.1)', 6, 1, 2); }) }), 'stone'); // plaster: its timbers are real beams (frame)
const T_CREAM = timber([232, 220, 196]), T_YELLOW = timber([232, 204, 136]), T_PINK = timber([226, 176, 168]), T_BLUE = timber([166, 190, 216]), T_SAGE = timber([170, 196, 160]), T_WHITE = timber([240, 238, 232]);
const bricks = (rgb, mortar) => surf(lam({ map: tex(g => { noise(g, rgb, 16); g.fillStyle = mortar; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[3, 0], [11, 0], [7, 4], [15, 4], [3, 8], [11, 8], [7, 12], [15, 12]]) g.fillRect(x, y, 1, 3); }) }), 'stone');
const brick = bricks([158, 66, 54], 'rgba(230,214,194,.55)'), brickB = bricks([126, 100, 88], 'rgba(226,214,196,.5)');
const rubble = surf(lam({ map: tex(g => { noise(g, [138, 134, 136], 16); g.fillStyle = 'rgba(30,28,36,.34)'; for (const [x, y, w, h] of [[0, 0, 16, 1], [0, 5, 16, 1], [0, 11, 16, 1], [4, 1, 1, 4], [11, 1, 1, 4], [7, 6, 1, 5], [14, 6, 1, 5], [2, 12, 1, 4], [9, 12, 1, 4]]) g.fillRect(x, y, w, h); dots(g, 'rgba(255,255,255,.1)', 6, 2, 1); }) }), 'stone');
const stone = surf(lam({ map: tex(g => { noise(g, [150, 152, 164], 14); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); }) }), 'stone');
const stoneL = surf(lam({ map: tex(g => { noise(g, [196, 194, 198], 12); g.fillStyle = 'rgba(60,60,80,.2)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(4, 0, 1, 8); g.fillRect(12, 8, 1, 8); }) }), 'stone');
const planks = (rgb, v, vert) => tex(g => { noise(g, rgb, v); g.fillStyle = 'rgba(30,20,12,.4)'; for (const k of [0, 5, 10]) vert ? g.fillRect(k, 0, 1, 16) : g.fillRect(0, k, 16, 1); dots(g, 'rgba(0,0,0,.14)', 4, 1, 2); });
const deck = surf(lam({ map: planks([146, 108, 72], 16) }), 'wood');
const boards = rgb => surf(lam({ map: planks(rgb, 12, true) }), 'wood'), B_SAGE = boards([98, 144, 112]), B_BLUE = boards([88, 124, 170]), B_RED = boards([166, 64, 56]);
const staves = surf(lam({ map: tex(g => { noise(g, [132, 92, 56], 14); g.fillStyle = 'rgba(40,24,12,.4)'; for (const x of [0, 4, 8, 12]) g.fillRect(x, 0, 1, 16); }) }), 'wood'), crateM = crate1;
const logM = surf(lam({ map: tex(g => { noise(g, [112, 80, 52], 18); for (const [x, y] of [[1, 1], [6, 0], [11, 1], [3, 6], [9, 6], [0, 11], [6, 11], [12, 11]]) { g.fillStyle = '#c9a070'; g.fillRect(x, y, 4, 4); g.fillStyle = '#a57c4e'; g.fillRect(x + 1, y + 1, 2, 2); } }) }), 'wood');
const sack = surf(lam({ map: tex(g => { noise(g, [206, 190, 156], 12); dots(g, 'rgba(120,100,70,.3)', 8, 2, 1); }) }), 'grass'), crust = lam({ color: 0x8a5a34 }), steelM = lam({ color: 0x9aa4b2 }), iceTop = lam({ color: 0xbfdcee, emissive: 0x16283a });
const shelfOf = (bg, cols) => surf(lam({ map: tex(g => { g.fillStyle = bg; g.fillRect(0, 0, 16, 16); for (const y of [7, 15]) { g.fillStyle = '#7a5434'; g.fillRect(0, y, 16, 1); for (let x = 0; x < 16; x += 2) { g.fillStyle = cols[Math.random() * cols.length | 0]; g.fillRect(x, y - 5 + (Math.random() * 2 | 0), 2, 5); } } }) }), 'wood');
const ledgers = shelfOf('#3e2818', ['#7a2e24', '#2e4a6a', '#3e5a34', '#8a6a3a', '#4a3a5a']), bottles = shelfOf('#33241a', ['#2f6a44', '#7a4a20', '#b89a50', '#33241a', '#5a2a2a']), loaves = shelfOf('#4a3020', ['#c8964e', '#b07a3a', '#e0b470', '#4a3020']);
const beam = surf(lam({ map: tex(g => { noise(g, [92, 64, 44], 14); g.fillStyle = 'rgba(30,18,10,.35)'; for (const y of [4, 11]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const slate = surf(lam({ map: tex(g => { noise(g, [74, 72, 88], 12); g.fillStyle = 'rgba(0,0,0,.3)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); }) }), 'stone');
const iron = surf(lam({ color: 0x2a2c34 }), 'metal'), gold = surf(lam({ color: 0xe0b040, emissive: 0x4a3408 }), 'metal');
const glowMat = lam({ color: 0xffe2a4, emissive: 0xffb04a, emissiveIntensity: 1.3 }), fireMat = lam({ color: 0xffb060, emissive: 0xff6a18, emissiveIntensity: 1.5 });
const black = lam({ color: 0x1a1a1e }), orange = lam({ color: 0xf08a2a }), scarf = lam({ color: 0xc8322c }), red = surf(lam({ color: 0xc8322c }), 'wood'), green = surf(lam({ color: 0x2f8a4c }), 'wood'), white = lam({ color: 0xf2f2f4 }), cream = lam({ color: 0xead9b8 });
const needle = surf(lam({ map: tex(g => { noise(g, [38, 90, 62], 18); dots(g, 'rgba(14,40,26,.4)', 10, 2, 1); }) }), 'grass');
const paneTex = on => tex(g => { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, 16, 16); g.fillStyle = on ? '#ffd27a' : '#232e46'; for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) g.fillRect(x, y, 5, 5); if (on) { g.fillStyle = '#fff2c0'; g.fillRect(3, 3, 2, 2); g.fillRect(10, 10, 2, 2); } });
const litTex = paneTex(true), winLit = lam({ map: litTex, emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: .9 }), winDark = lam({ map: paneTex(false) });
const doorMat = lam({ map: tex(g => { noise(g, [112, 58, 40], 10); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); g.fillStyle = '#2f8a4c'; for (let y = 2; y < 9; y++) for (let x = 4; x < 12; x++) { const d = Math.hypot(x - 7.5, y - 5); if (d < 3.6 && d > 1.6) g.fillRect(x, y, 1, 1); } g.fillStyle = '#d2312c'; g.fillRect(7, 8, 2, 1); g.fillStyle = '#e0b040'; g.fillRect(12, 9, 1, 2); }) });
const cobble = kitDecal({ map: tex(g => { noise(g, [108, 112, 132], 12); g.fillStyle = 'rgba(30,32,48,.45)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); for (const [x, y] of [[5, 0], [11, 0], [2, 8], [8, 8], [13, 8]]) g.fillRect(x, y, 1, 8); dots(g, 'rgba(226,232,244,.55)', 9, 2, 1); }) });
const floorMat = kitDecal({ map: planks([160, 122, 84], 12) }), ice = kitDecal({ map: tex(g => { noise(g, [150, 190, 220], 10); g.fillStyle = 'rgba(236,246,255,.28)'; for (const [x, y] of [[1, 3], [2, 4], [3, 4], [4, 5], [10, 10], [11, 11], [12, 11], [6, 13], [7, 14], [14, 2], [13, 3]]) g.fillRect(x, y, 1, 1); }), emissive: 0x16283a });
const rug = kitDecal({ map: tex(g => { noise(g, [138, 44, 44], 8); g.fillStyle = '#d8b060'; for (const [x, y] of [[7, 0], [8, 0], [7, 15], [8, 15], [0, 7], [0, 8], [15, 7], [15, 8], [7, 7], [8, 8], [7, 8], [8, 7]]) g.fillRect(x, y, 1, 1); g.fillStyle = '#5a1c20'; for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) g.fillRect(x, y, 1, 1); }) }, -3);
const runner = kitDecal({ map: tex(g => { noise(g, [142, 40, 44], 8); g.fillStyle = '#d8b060'; g.fillRect(1, 0, 1, 16); g.fillRect(14, 0, 1, 16); }) }, -3);
const stripes = (a, b) => surf(lam({ map: tex(g => { for (let x = 0; x < 16; x++) { g.fillStyle = (x >> 2) % 2 ? a : b; g.fillRect(x, 0, 1, 16); } }) }), 'grass');
const CLOTH = [stripes('#d2312c', '#f4f0ec'), stripes('#2f8a4c', '#f4f0ec'), stripes('#3a6ec0', '#f4f0ec'), stripes('#e0a020', '#f4f0ec')];

const SHUT = [0x2f6a44, 0x8a2e28, 0x34507c, 0x5a3c28].map(c => surf(lam({ color: c }), 'wood')); // shutters
const GIFT = [[202, 48, 44, '#f4e8c0'], [46, 130, 80, '#e8c040'], [58, 106, 190, '#f2f2f2'], [228, 182, 60, '#c8302a'], [152, 72, 164, '#f0d060'], [240, 240, 244, '#c8302a']]
  .map(([r, g, b, rib]) => { const m = surf(lam({ map: tex(c => { noise(c, [r, g, b], 10); c.fillStyle = rib; c.fillRect(7, 0, 2, 16); c.fillRect(0, 7, 16, 2); }) }), 'wood'); m.userData.rib = lam({ color: rib }); return m; });

const K = mapKit({ beam, deck, roof: slate, T: .3, snow }), { T, piece, onWall, slab, solid, flat, wall, house, upper, gable, stairs, ramp, railing, stairRail, sign, star, lights, onFace, faceAt, frame, gableFrame, barrel, crate, logs, stool, sled, postbox } = K;
const UP = 3.6;
const cylY = (r0, r1, h, m, x, y, z, n = 12) => { const c = new THREE.Mesh(pxCyl(r0, r1, h, n), m); c.position.set(x, y, z); add(c); return c; };
const capped = (x0, x1, z0, z1, bot, top, m, th = .14) => { slab(x0, x1, z0, z1, bot, top - th, m); slab(x0, x1, z0, z1, top - th, top, snow); };
function gift(x, z, w, h = w, d = w, y0 = 0, k = rnd() * GIFT.length | 0) {
  const b = box(w, h, d, GIFT[k]); b.position.set(x, y0 + h / 2, z); add(b); building.cover.push(b); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h);
  for (const e of [-1, 1]) { const l = detail(box(w * .26, w * .12, w * .1, GIFT[k].userData.rib)); l.position.set(x + e * w * .13, y0 + h + w * .05, z); l.rotation.z = e * .5; add(l); }
}
// a street lamp; the first few get a real light
let lampN = 0;
function lamp(x, z) {
  slab(x - .08, x + .08, z - .08, z + .08, 0, 3, iron); slab(x - .16, x + .16, z - .16, z + .16, 0, .3, iron); piece(.5, .08, .5, iron, x, 3.04, z); piece(.34, .4, .34, glowMat, x, 3.28, z); piece(.46, .08, .46, iron, x, 3.52, z); piece(.5, .08, .5, snow, x, 3.6, z);
  if (lampN++ < 8) { const pl = new THREE.PointLight(0xffb35a, 8, 13, 1.4); pl.position.set(x, 3.2, z); add(pl); }
}
function snowman(x, z, ry = 0) {
  slab(x - .5, x + .5, z - .5, z + .5, 0, .95, snow); slab(x - .38, x + .38, z - .38, z + .38, .95, 1.65, snow); slab(x - .28, x + .28, z - .28, z + .28, 1.65, 2.2, snow);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; add(g);
  const put = (w, h, d, m, px, py, pz, det) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (det) detail(b); else meshSolids(b, 'snow'); return b; };
  put(.74, .07, .74, black, 0, 2.23, 0); put(.44, .4, .44, black, 0, 2.46, 0); put(.46, .08, .46, scarf, 0, 2.31, 0, true);
  put(.1, .1, .3, orange, 0, 1.92, .4, true); for (const e of [-1, 1]) put(.08, .08, .04, black, e * .12, 2.02, .29, true);
  for (const y of [1.15, 1.4]) put(.08, .08, .04, black, 0, y, .39, true);
  put(.6, .14, .6, scarf, 0, 1.68, 0, true); put(.14, .4, .08, scarf, .16, 1.45, .4, true);
  for (const e of [-1, 1]) { const a = put(.7, .06, .06, beam, e * .5, 1.42, 0); a.rotation.z = e * .5; } // its arms, out of its sides
}
// a house you can go into, in two storeys: lo below, hi above with its timber showing
function twoStorey(x0, x1, z0, z1, h, lo, hi, holes) {
  const part = low => Object.fromEntries(Object.entries(holes).map(([f, l]) => [f, l.filter(q => low ? q[2] < UP - .01 : q[2] >= UP - .01)]));
  house(x0, x1, z0, z1, UP, lo, part(true)); house(x0, x1, z0, z1, h - UP, hi, part(false), { base: UP, tr: false });
  frame(x0, x1, z0, z1, UP, h, part(false));
}
// a house nobody goes into: lit windows on the faces named, a door with a step and a lantern, a chimney, a roof you can stand on. style: timber (plaster and beams), brick or board
function block(x0, x1, z0, z1, h, m, ax, y1, faces, door, style = 'timber') {
  slab(x0, x1, z0, z1, 0, h, m); gable(ax, x0, x1, z0, z1, h, y1, m, { snow, o: .35 });
  const two = h > 5, holes = {}, sh = SHUT[rnd() * SHUT.length | 0];
  for (const f of faces) {
    const [a0, a1] = f === 's' || f === 'n' ? [x0, x1] : [z0, z1], n = Math.max(1, Math.floor((a1 - a0 - 1.4) / 2.3)); holes[f] = [];
    for (let i = 0; i < n; i++) for (const y of two ? [1.75, 4.45] : [1.75]) {
      const along = a0 + .7 + (a1 - a0 - 1.4) * (i + .5) / n;
      if (door && door[0] === f && Math.abs(along - door[1]) < 1.3 && y < 3) continue;
      onFace(f, x0, x1, z0, z1, along, y, .9, 1.1, rnd() < .72 ? winLit : winDark); holes[f].push([along, .9, y - .55, y + .55]);
      if (style !== 'timber') for (const e of [-1, 1]) onFace(f, x0, x1, z0, z1, along + e * .8, y, .3, 1.1, sh, .03); // shutters
    }
    if (door && door[0] === f) holes[f].push([door[1], 1, 0, 2]);
  }
  frame(x0, x1, z0, z1, 0, h, holes, { mid: two ? [3.05] : [], timber: style === 'timber', plinth: stone, m: style === 'timber' ? beam : stoneL, corners: style !== 'brick' });
  if (style === 'timber') gableFrame(ax, x0, x1, z0, z1, h, y1);
  if (door) {
    const [f, a] = door, [dx, dz] = faceAt(f, x0, x1, z0, z1, a, .3), [lx, lz] = faceAt(f, x0, x1, z0, z1, a + .9, .1), along = f === 's' || f === 'n';
    onFace(f, x0, x1, z0, z1, a, 1, 1, 2, doorMat);
    capped(dx - (along ? .7 : .3), dx + (along ? .7 : .3), dz - (along ? .3 : .7), dz + (along ? .3 : .7), 0, .16, stoneL, .05); // the step
    onWall(piece(.2, .3, .2, glowMat, lx, 2.3, lz)); onWall(piece(.26, .05, .26, iron, lx, 2.475, lz)); onWall(piece(.26, .05, .26, iron, lx, 2.125, lz));
  }
  const cx = ax === 'x' ? x0 + 1.2 : (x0 + x1) / 2 + (x1 - x0) * .22, cz = ax === 'x' ? (z0 + z1) / 2 + (z1 - z0) * .22 : z0 + 1.2; capped(cx - .35, cx + .35, cz - .35, cz + .35, h, y1 + .7, brick, .1);
}
// a market stall facing (fx, fz): a counter under a striped roof on four posts
function stall(x, z, fx, fz, k) {
  const w = fz ? 2.8 : 1.5, d = fz ? 1.5 : 2.8;
  const cx = x + fx * .45, cz = z + fz * .45, cw = fz ? 2.8 : .6, cd = fz ? .6 : 2.8;
  slab(cx - cw / 2, cx + cw / 2, cz - cd / 2, cz + cd / 2, 0, 1, beam);
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) slab(x + ex * (w / 2 - .08) - .07, x + ex * (w / 2 - .08) + .07, z + ez * (d / 2 - .08) - .07, z + ez * (d / 2 - .08) + .07, 0, 2.3, beam);
  slab(x - w / 2 - .2, x + w / 2 + .2, z - d / 2 - .2, z + d / 2 + .2, 2.3, 2.42, CLOTH[k % 4]); slab(x - w / 2 - .2, x + w / 2 + .2, z - d / 2 - .2, z + d / 2 + .2, 2.42, 2.52, snow);
  for (let i = 0; i < 4; i++) { const u = (i - 1.5) * .6; detail(piece(.3, .2 + rnd() * .25, .3, [red, green, gold, cream][rnd() * 4 | 0], cx + (fz ? u : 0), 1.12, cz + (fz ? 0 : u))); }
  if (fz) lights(x - w / 2 - .2, 2.26, z + fz * (d / 2 + .22), x + w / 2 + .2, 2.26, z + fz * (d / 2 + .22)); else lights(x + fx * (w / 2 + .22), 2.26, z - d / 2 - .2, x + fx * (w / 2 + .22), 2.26, z + d / 2 + .2);
}
// a mast for the strings of lights
function mast(x, z, h = 6.9) { slab(x - .1, x + .1, z - .1, z + .1, 0, h, beam); slab(x - .2, x + .2, z - .2, z + .2, 0, .4, stone); piece(.3, .1, .3, iron, x, h + .05, z); piece(.16, .16, .16, gold, x, h + .18, z); }

// the ground: snow, the square and its streets cobbled, the river frozen
addGround(170, lam({ map: tex(snowDraw, 170, 170) }));
for (const [x, z, w, d] of [[0, -41.6, 88, .3], [0, 41.6, 88, .3], [-41.6, 0, .3, 88], [41.6, 0, .3, 88]]) addWall(x, z, w, d);
for (const [x0, x1, z0, z1] of [[-12, 12, -8, 14], [-2.5, 2.5, 14, 19], [-2.5, 2.5, -11.5, -8], [-41, -12, 1.5, 6.5], [12, 41, 1.5, 6.5], [-2.5, 2.5, -41, -30.5]]) flat(x0, x1, z0, z1, cobble, .01, 2);
const RZ0 = -24, RZ1 = -18;
flat(-42, 42, RZ0, RZ1, ice, .012, 4);
for (const [x0, x1] of [[-41.4, -13.5], [-10.5, -2.6], [2.6, 12.5], [15.5, 30], [32.2, 41.4]]) { capped(x0, x1, RZ1, RZ1 + .4, 0, .55, stone, .1); capped(x0, x1, RZ0 - .4, RZ0, 0, .55, stone, .1); } // the banks, a way down here and there

// --- the square: the tree on its plinth, stalls round it, masts at its corners for the lights ---
const TREE = [0, 3], MASTS = [[-12, -8], [12, -8], [-12, 14], [12, 14]];
{
  const [tx, tz] = TREE;
  capped(tx - 2.6, tx + 2.6, tz - 2.6, tz + 2.6, 0, .5, stoneL, .1); slab(tx - .6, tx + .6, tz - .6, tz + .6, .5, 2.2, barkMat);
  [8.4, 7, 5.6, 4.2, 2.8, 1.4].forEach((w, i) => {
    const y = 2.2 + i * 1.5; capped(tx - w / 2, tx + w / 2, tz - w / 2, tz + w / 2, y, y + 1.5, needle);
    for (const e of [-1, 1]) { lights(tx - w / 2, y + .62, tz + e * (w / 2 + .03), tx + w / 2, y + .62, tz + e * (w / 2 + .03)); lights(tx + e * (w / 2 + .03), y + .62, tz - w / 2, tx + e * (w / 2 + .03), y + .62, tz + w / 2); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i, b = detail(box(.3, .3, .3, [red, gold, green, white][(k + i) % 4])); b.position.set(tx + Math.cos(a) * w * .36, y + 1, tz + (k % 2 ? 1 : -1) * (w / 2 + .12)); add(b); }
  });
  star(tx, 11.2 + 4.5 * .13, tz, .13);
  { const pl = new THREE.PointLight(0xffd890, 10, 22, 1.2); pl.position.set(tx, 6, tz - 5.5); add(pl); }
  gift(-3.4, .2, 1.2, 1); gift(3.5, 1, 1, 1.2); gift(3.3, 5.6, 1.3, 1.1); gift(-3.5, 5.4, .9); gift(-1, -.4, .8, .7); gift(1.4, 6.5, 1, .9);
  for (const [mx, mz] of MASTS) { mast(mx, mz); lights(tx + Math.sign(mx) * 1.4, 9.1, tz + Math.sign(mz - tz) * 1.4, mx, 6.85, mz, 1.1); } // from the tree out to each mast
}
stall(-8.5, -4.5, 0, 1, 0); stall(8.5, -4.5, 0, 1, 1); stall(-9.5, 11, 0, -1, 2); stall(9.5, 11, 0, -1, 3); stall(-10, 3.2, 1, 0, 1); stall(10, 3.2, -1, 0, 0);
for (const [x, z] of [[-6, -7], [6, -7], [-11, 7.5], [11, 7.5], [-4.5, 13.2], [4.5, 13.2]]) lamp(x, z);
for (const [x, z, ax] of [[-5.5, 8.6, 'x'], [5.5, 8.6, 'x'], [-5.2, -1.8, 'z'], [5.2, -1.8, 'z']]) { // benches, a back on each
  const [w, d] = ax === 'x' ? [1.8, .5] : [.5, 1.8], [bx, bz] = ax === 'x' ? [0, .22] : [x < 0 ? -.22 : .22, 0];
  slab(x - w / 2, x + w / 2, z - d / 2, z + d / 2, .38, .5, deck); slab(x + bx - (ax === 'x' ? w / 2 : .05), x + bx + (ax === 'x' ? w / 2 : .05), z + bz - (ax === 'x' ? .05 : d / 2), z + bz + (ax === 'x' ? .05 : d / 2), .5, 1, deck);
  for (const e of [-1, 1]) ax === 'x' ? slab(x + e * .7 - .08, x + e * .7 + .08, z - .2, z + .2, 0, .38, iron) : slab(x - .2, x + .2, z + e * .7 - .08, z + e * .7 + .08, 0, .38, iron); // a leg under each end, across the seat
}
barrel(-7.2, -5.6); barrel(10.3, -5.4); crate(-11.5, 11.6, .8); crate(7.5, 12, .8); crate(7.55, 11.95, .6, .8); barrel(-11.3, 2);

// --- the town hall on the north side: dressed stone below and timber above, a balcony over its door, a clock up on the roof ---
{
  const x0 = -9, x1 = 9, z0 = 19, z1 = 31, h = 7.4;
  twoStorey(x0, x1, z0, z1, h, stoneL, T_CREAM, {
    s: [[0, 2.4, 0, 2.8], [-5.6, 1.5, 1.2, 2.6], [5.6, 1.5, 1.2, 2.6], [0, 1.6, UP, 5.9], [-5.6, 1.5, 4.7, 6], [5.6, 1.5, 4.7, 6]],
    w: [[22.5, 1.5, 1.2, 2.6], [27.5, 1.5, 1.2, 2.6], [25, 1.5, 4.7, 6]], e: [[29, 1.5, 1.2, 2.6], [23, 1.5, 4.7, 6], [28.5, 1.5, 4.7, 6]], n: [[-4.5, 1.6, 0, 2.6], [4, 1.5, 4.7, 6], [-4, 1.5, 4.7, 6]],
  });
  upper(x0 + T, x1 - T, z0 + T, z1 - T, UP, [7.4, x1 - T, z0 + T, 26.4]); stairs('z', 21, 26.4, 7.4, x1 - T, 0, UP); railing(7.4, z0 + T, 7.4, 26.4, UP);
  slab(-.8, .8, z0, z0 + T, UP - .25, UP, deck); flat(x0 + T, x1 - T, z0 + T, z1 - T, floorMat, .012, 2);
  gable('x', x0, x1, z0, z1, h, 10.2, T_CREAM, { snow }); gableFrame('x', x0, x1, z0, z1, h, 10.2);
  slab(-3.2, 3.2, 17.3, z0, UP - .2, UP, deck); for (const x of [-3, 3]) { slab(x - .14, x + .14, 17.4, 17.68, 0, UP - .2, stoneL); slab(x - .22, x + .22, 17.32, 17.76, 0, .4, stone); } // the balcony on two stone pillars
  railing(-3.2, 17.36, 3.2, 17.36, UP); railing(-3.2, 17.36, -3.2, z0, UP, [false, false]); railing(3.2, 17.36, 3.2, z0, UP, [false, false]);
  for (const x of [-1.9, 1.9]) capped(x - .5, x + .5, 18, z0, 0, .32, stoneL, .06); capped(-1.4, 1.4, 18.3, z0, 0, .16, stoneL, .05); // its steps
  slab(-1.9, 1.9, 23.1, 26.9, 8.3, 12.6, T_WHITE); slab(-2.1, 2.1, 22.9, 27.1, 12.6, 12.8, stoneL);
  for (const x of [-1.9, 1.9]) for (const z of [23.1, 26.9]) onWall(piece(.24, 4.3, .24, beam, x - Math.sign(x) * .08, 10.45, z - Math.sign(z - 25) * .08));
  { const c = new THREE.Mesh(pxCone(2.2 * Math.SQRT2, 2.6, 4), snow); c.rotation.y = Math.PI / 4; c.position.set(0, 14.1, 25); add(c); building.cover.push(c); solid(-2.2, 2.2, 22.8, 27.2, 12.8, 15.4, 'snow', { peak: { x: 0, z: 25, rx: 2.2, rz: 2.2, edge: 12.8 } }); piece(.12, .8, .12, gold, 0, 15.7, 25); }
  const face = (() => { const t = tex(g => { g.fillStyle = '#2a2c3a'; g.fillRect(0, 0, 16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 7) { g.fillStyle = '#ffeab0'; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#2a2a30'; for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]]) g.fillRect(x, y, 2, 2); g.fillRect(7, 3, 1, 5); g.fillRect(8, 7, 3, 1); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return lam({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .8 }); })();
  onWall(piece(2.6, 2.6, .06, face, 0, 10.9, 23.07)); onWall(piece(2.6, 2.6, .06, face, 0, 10.9, 26.93));
  sign('TOWN HALL', 4.6, 0, 6.72, z0 - .11, Math.PI, '#ffe9b0', '#2a3a5c');
  // inside: a desk facing the door with the clerk's stool, shelves of ledgers along the west wall, a bench by the stairs; a long table upstairs
  slab(-2.2, 2.2, 24.2, 25, 0, 1, beam); slab(-2.3, 2.3, 24.1, 25.1, 1, 1.07, deck); stool(0, 25.8); stool(-1.6, 23.3); stool(1.6, 23.3);
  slab(x0 + T, x0 + T + .5, 23.5, 26.5, 0, 2.3, ledgers); slab(x0 + T, x0 + T + .5, 28.5, 30.4, 0, 2.3, ledgers); slab(4.4, 6.6, 29.8, 30.5, .38, .5, deck); for (const x of [4.6, 6.4]) slab(x - .08, x + .08, 29.9, 30.4, 0, .38, beam);
  flat(-2, 2, 20.4, 23.4, rug, .016, 1); gift(5, 28.2, 1.2, 1); gift(-7.6, 21, 1, 1.2);
  slab(-3, 3, 24.4, 25.6, UP, UP + .9, beam); slab(-3.1, 3.1, 24.3, 25.7, UP + .9, UP + .96, deck); for (const x of [-2, 0, 2]) { stool(x, 23.8, UP); stool(x, 26.2, UP); } gift(5.2, 22, 1, 1, 1, UP);
  slab(x0 + T, x0 + T + .5, 21, 24.2, UP, UP + 2.2, ledgers);
  for (const [x, z] of [[-6, 22], [5, 26], [-5, 28], [2.6, 21.4]]) { piece(.04, 1.1, .04, iron, x, 6.7, z); piece(.44, .3, .44, glowMat, x, 6.05, z); }
  { const pl = new THREE.PointLight(0xffc880, 6, 14, 1.4); pl.position.set(0, 2.9, 25); add(pl); }
  lights(x0 + .2, 7.08, z0 - .11, x1 - .2, 7.08, z0 - .11); lights(-3.2, 3.52, 17.3, 3.2, 3.52, 17.3);
}

// --- the inn on the west side: rough stone below, a balcony over the square, a fire inside ---
{
  const x0 = -28, x1 = -15, z0 = 9, z1 = 21, h = 7.2;
  twoStorey(x0, x1, z0, z1, h, rubble, T_YELLOW, {
    e: [[15, 2, 0, 2.6], [11.4, 1.5, 1.2, 2.6], [18.6, 1.5, 1.2, 2.6], [15, 1.6, UP, 5.9], [11.4, 1.5, 4.7, 6], [18.6, 1.5, 4.7, 6]],
    s: [[-21.5, 1.8, 0, 2.6], [-25.4, 1.5, 1.2, 2.6], [-17.6, 1.5, 1.2, 2.6], [-25, 1.5, 4.7, 6], [-21.5, 1.5, 4.7, 6], [-18, 1.5, 4.7, 6]],
    w: [[17.6, 1.5, 1.2, 2.6], [10.8, 1.5, 4.7, 6], [17.6, 1.5, 4.7, 6]], n: [[-23, 1.5, 4.7, 6], [-18, 1.5, 4.7, 6]],
  });
  upper(x0 + T, x1 - T, z0 + T, z1 - T, UP, [x0 + T, -20.6, 19.4, z1 - T]); stairs('x', -26, -20.6, 19.4, z1 - T, 0, UP); railing(x0 + T, 19.4, -20.6, 19.4, UP);
  slab(x1 - T, x1, 14.2, 15.8, UP - .25, UP, deck); flat(x0 + T, x1 - T, z0 + T, z1 - T, floorMat, .012, 2);
  gable('x', x0, x1, z0, z1, h, 9.8, T_YELLOW, { snow }); gableFrame('x', x0, x1, z0, z1, h, 9.8);
  slab(x1, -13.2, 11, 19, UP - .2, UP, deck); for (const z of [11.2, 18.8]) { slab(-13.5, -13.22, z - .14, z + .14, 0, UP - .2, beam); slab(-13.58, -13.14, z - .22, z + .22, 0, .4, stone); }
  railing(-13.26, 11, -13.26, 19, UP); railing(x1, 11, -13.26, 11, UP, [false, false]); railing(x1, 19, -13.26, 19, UP, [false, false]);
  sign('INN', 1.8, x1 + .05, 3.05, 15, Math.PI / 2, '#ffe9b0', '#5a2a1a');
  slab(-27.7, -26.4, 11.5, 14.5, 0, 2.4, brick); onWall(piece(.06, 1, 1.6, fireMat, -26.37, .9, 13)); slab(-27.7, -26.8, 12.4, 13.6, 2.4, h - .1, brick); slab(-26.4, -26.1, 11.4, 14.6, 2.3, 2.42, beam); // the fireplace and its mantel
  { const pl = new THREE.PointLight(0xff9a50, 8, 12, 1.4); pl.position.set(-25, 1.4, 13); add(pl); }
  slab(-20.4, -19.6, 10.4, 15.6, 0, 1.1, beam); slab(-20.52, -19.48, 10.3, 15.7, 1.1, 1.18, deck); for (const z of [11.2, 12.6, 14, 15.2]) stool(-18.9, z); // the bar and its stools
  slab(-20.2, -18.45, 9.32, 9.75, 0, 2.2, bottles); barrel(-21.6, 13, 0, null); barrel(-21.6, 13.8, 0, null); barrel(-16, 10.1, 0, null); // what's behind it
  for (const [x, z] of [[-23.4, 16.6], [-17.4, 17.4], [-24.2, 10.6]]) { slab(x - .55, x + .55, z - .55, z + .55, .85, .95, deck); slab(x - .1, x + .1, z - .1, z + .1, 0, .85, beam); for (const [dx, dz] of [[-.95, 0], [.95, 0], [0, .95]]) if (x + dx > x0 + .7 && z + dz < 19) stool(x + dx, z + dz); }
  flat(-26, -23, 11.6, 14.6, rug, .016, 1);
  slab(-27.6, -25.4, 9.5, 11, UP, UP + .55, scarf); slab(-27.6, -27.1, 9.5, 11, UP + .55, UP + .75, white); slab(-18.4, -15.5, 16.4, 20.6, UP, UP + .55, green); slab(-18.4, -15.5, 20, 20.6, UP + .55, UP + .75, white); // beds, a pillow on each
  slab(-27.6, -26.6, 15, 16.6, UP, UP + 1.6, beam); slab(-23, -22.2, 9.4, 10.1, UP, UP + .7, beam); crate(-16.2, 10.2, .8, UP, false); // a wardrobe, a chest
  capped(-27.6, -26.8, 12.6, 13.4, h, 10.6, brick, .1);
  lights(x1 + .11, 7, z0 + .2, x1 + .11, 7, z1 - .2);
  barrel(-14.5, 12.2); barrel(-14.4, 17.7); logs(-26.4, 8.7, 'x', 2.4); logs(-28.3, 12.6, 'z', 2.6); sled(-14.2, 9.6, 0); // out front and round the side
}
// the houses south of it: one with a roof terrace, stairs up its back
block(-28, -21.5, -11, -1, 6.4, T_PINK, 'x', 8.6, 'nsw', ['n', -24.8]);
{
  const x0 = -21.5, x1 = -15, z0 = -11, z1 = -1, holes = {};
  slab(x0, x1, z0, z1, 0, 5.2, brickB); slab(x0, x1, z0, z1, 5.2, 5.34, snow);
  for (const [f, list] of [['n', [-19.6, -16.9]], ['e', [-8.5, -6, -3.5]], ['s', [-19.6, -16.9]]]) {
    holes[f] = [];
    for (const a of list) for (const y of [1.7, 3.9]) { if (f === 'n' && a < -19 && y < 3) continue; onFace(f, x0, x1, z0, z1, a, y, .9, 1.1, rnd() < .75 ? winLit : winDark); holes[f].push([a, .9, y - .55, y + .55]); for (const e of [-1, 1]) onFace(f, x0, x1, z0, z1, a + e * .8, y, .3, 1.1, SHUT[1], .03); }
  }
  holes.n.push([-19.6, 1, 0, 2]); frame(x0, x1, z0, z1, 0, 5.2, holes, { timber: false, plinth: stone, m: stoneL, corners: false });
  onFace('n', x0, x1, z0, z1, -19.6, 1, 1, 2, doorMat); capped(-20.3, -18.9, -1, -.4, 0, .16, stoneL, .05);
  for (const [a, b, c, d] of [[-21.5, -15, -1.3, -1], [-15.3, -15, -11, -1.3], [-21.5, -21.2, -11, -1.3], [-20.2, -15.3, -11, -10.7]]) capped(a, b, c, d, 5.34, 6.2, brickB, .08); // the parapet, open where the stairs come up
  stairs('x', -13.4, -20.2, -12.3, -11, 0, 5.34, deck); slab(-21.5, -20.2, -12.3, -11, 5.14, 5.34, deck); stairRail('x', -13.4, -20.2, -12.3, 0, 5.34); railing(-21.44, -12.3, -20.2, -12.3, 5.34, [true, false]); railing(-21.44, -12.3, -21.44, -11.06, 5.34, [false, true]);
  slab(-21.4, -21.1, -12.3, -12, 0, 5.14, beam); slab(-17, -16.7, -12.3, -12, 0, 2.6, beam);
  capped(-17.6, -16.2, -5.4, -4, 5.34, 6.5, brick, .1); gift(-19.4, -8.4, 1, .9, 1, 5.34); crate(-16.4, -9.6, .8, 5.34); slab(-20.6, -19, -3.6, -3.1, 5.72, 5.84, deck); for (const x of [-20.4, -19.2]) slab(x - .07, x + .07, -3.55, -3.15, 5.34, 5.72, iron); // a chimney, a bench up there
}

// --- the bakery and the toy shop on the east side, a bridge between their upstairs over the street ---
{
  const x0 = 15, x1 = 27, z0 = 9, z1 = 20, h = 7.2;
  twoStorey(x0, x1, z0, z1, h, brick, T_PINK, {
    w: [[14.5, 2, 0, 2.6], [11, 1.5, 1.2, 2.6], [18, 1.5, 1.2, 2.6], [11.4, 1.5, 4.7, 6], [14.5, 1.5, 4.7, 6], [17.6, 1.5, 4.7, 6]],
    s: [[24, 1.8, 0, 2.6], [17.4, 2.4, 1.1, 2.6], [21.1, 1.6, UP, 5.9], [25, 1.5, 4.7, 6], [17.4, 1.5, 4.7, 6]], e: [[16.5, 1.5, 4.7, 6]], n: [[18, 1.5, 4.7, 6], [24, 1.5, 4.7, 6]],
  });
  upper(x0 + T, x1 - T, z0 + T, z1 - T, UP, [19.6, 25, 18.4, z1 - T]); stairs('x', 25, 19.6, 18.4, z1 - T, 0, UP); railing(19.6, 18.4, 25, 18.4, UP, [true, false]); railing(25, 18.4, 25, z1 - T, UP, [true, false]);
  slab(20.3, 21.9, z0, z0 + T, UP - .25, UP, deck); flat(x0 + T, x1 - T, z0 + T, z1 - T, floorMat, .012, 2);
  gable('z', x0, x1, z0, z1, h, 10, T_PINK, { snow }); gableFrame('z', x0, x1, z0, z1, h, 10);
  sign('BAKERY', 3.2, x0 - .05, 3.05, 14.5, -Math.PI / 2, '#ffe9b0', '#6a2a3a');
  slab(25.2, 26.7, 11, 14, 0, 2.6, brick); onWall(piece(.06, .8, 1.4, fireMat, 25.17, 1, 12.5)); capped(25.4, 26.5, 11.8, 13.2, h, 10.8, brick, .1); // the oven and its chimney
  { const pl = new THREE.PointLight(0xff9a50, 7, 12, 1.4); pl.position.set(23.6, 1.6, 12.5); add(pl); }
  // the counter stands clear of both doors, loaves on it and on the shelves behind; a kneading table by the oven, sacks of flour
  slab(18, 18.8, 10.4, 13.2, 0, 1, beam); slab(17.9, 18.9, 10.3, 13.3, 1, 1.08, deck); for (let z = 10.8; z < 13.2; z += .8) detail(piece(.36, .18, .36, [cream, orange, crust][rnd() * 3 | 0], 18.4, 1.17, z));
  slab(19.4, 22.4, z0 + T, z0 + T + .5, 0, 2.2, loaves); slab(21, 23, 13.4, 14.4, 0, .95, beam); slab(20.9, 23.1, 13.3, 14.5, .95, 1.02, deck);
  for (const [x, z, s] of [[25.9, 15, .8], [26, 16, .7], [25.1, 15.6, .6]]) slab(x - s / 2, x + s / 2, z - s / 2, z + s / 2, 0, s * .8, sack);
  slab(15.4, 16.2, 18.5, 19.6, UP, UP + 1.5, beam); gift(25.6, 10.4, 1, 1, 1, UP); slab(22, 24.2, 13, 14.6, UP, UP + .55, scarf); slab(23.7, 24.2, 13, 14.6, UP + .55, UP + .75, white);
  capped(16, 18.8, 8, z0, 2.75, 2.9, CLOTH[0], .06); for (const x of [16.1, 18.7]) { const b = box(.07, .07, 1.15, iron); b.position.set(x, 2.45, 8.5); b.rotation.x = .62; add(b); } // an awning over the window
  crate(14.5, 17.3, .9); crate(14.6, 16.4, .7); barrel(14.55, 11.6); postbox(13.6, 8.3);
}
{
  const x0 = 15, x1 = 27, z0 = -11, z1 = -1, h = 7.2, holes = {
    w: [[-6, 2, 0, 2.6], [-9, 1.6, 1.1, 2.6], [-3, 1.6, 1.1, 2.6], [-8.6, 1.5, 4.7, 6], [-6, 1.5, 4.7, 6], [-3.4, 1.5, 4.7, 6]],
    n: [[24, 1.8, 0, 2.6], [17.4, 2.4, 1.1, 2.6], [21.1, 1.6, UP, 5.9], [25, 1.5, 4.7, 6], [17.4, 1.5, 4.7, 6]], e: [[-6, 1.5, 1.2, 2.6], [-6, 1.5, 4.7, 6]], s: [[18, 1.5, 4.7, 6], [24, 1.5, 4.7, 6], [17.4, 1.5, 1.2, 2.6]],
  };
  house(x0, x1, z0, z1, h, B_SAGE, holes, { tr: false }); frame(x0, x1, z0, z1, 0, h, holes, { timber: false, m: T_WHITE, corners: true, plinth: stone }); // green boards, white trim
  for (const [f, a0, a1, at, ox, oz] of [['s', x0, x1, z0, 0, -1], ['n', x0, x1, z1, 0, 1], ['w', z0, z1, x0, -1, 0], ['e', z0, z1, x1, 1, 0]]) { // a white band at the floor between
    const cuts = holes[f].filter(q => q[2] < UP + .1 && q[3] > UP - .1).map(([c, w]) => [c - w / 2, c + w / 2]).sort((p, q) => p[0] - q[0]); let from = a0 + .23;
    for (const [c0, c1] of [...cuts, [a1 - .23, a1]]) { if (c0 - from > .05) onWall(ox ? piece(.06, .2, c0 - from, T_WHITE, at + ox * .03, UP, (from + c0) / 2) : piece(c0 - from, .2, .06, T_WHITE, (from + c0) / 2, UP, at + oz * .03)); from = Math.max(from, c1); }
  }
  upper(x0 + T, x1 - T, z0 + T, z1 - T, UP, [19.6, 25, z0 + T, -9.4]); stairs('x', 25, 19.6, z0 + T, -9.4, 0, UP); railing(19.6, -9.4, 25, -9.4, UP, [true, false]); railing(25, z0 + T, 25, -9.4, UP, [false, true]);
  slab(20.3, 21.9, z1 - T, z1, UP - .25, UP, deck); flat(x0 + T, x1 - T, z0 + T, z1 - T, floorMat, .012, 2);
  gable('z', x0, x1, z0, z1, h, 10, B_SAGE, { snow });
  sign('TOYS', 2.2, x0 - .05, 3.05, -6, -Math.PI / 2, '#ffe9b0', '#1e4a30');
  const shelf = surf(lam({ map: tex(g => { g.fillStyle = '#3e2818'; g.fillRect(0, 0, 16, 16); for (const y of [7, 15]) { g.fillStyle = '#7a5434'; g.fillRect(0, y, 16, 1); for (let x = 1; x < 15; x += 3) { g.fillStyle = ['#d2312c', '#3a6ec0', '#e0a020', '#2f8a4c', '#f2f2f4'][Math.random() * 5 | 0]; g.fillRect(x, y - 4, 2, 4); } } }) }), 'wood');
  slab(26, 26.7, -8.6, -6.95, 0, 2.4, shelf); slab(26, 26.7, -5.05, -3.4, 0, 2.4, shelf); slab(16.4, 19, -2.1, -1.4, 0, 1, beam); slab(16.3, 19.1, -2.2, -1.35, 1, 1.06, deck);
  for (const [x, c, h] of [[16.8, red, .34], [17.5, gold, .26], [18.1, green, .4], [18.7, white, .3]]) detail(piece(.3, h, .3, c, x, 1.06 + h / 2, -1.8)); // toys in the window slab(20.4, 22.4, -6.6, -5.4, 0, .95, beam); slab(20.3, 22.5, -6.7, -5.3, .95, 1.02, deck); stool(21.4, -4.7);
  for (const [x, c] of [[20.8, red], [21.4, gold], [22, green]]) detail(piece(.3, .3, .3, c, x, 1.17, -6)); // toys on the counter
  gift(17, -9.6, 1.2, 1); gift(17.3, -4, 1, 1.2); gift(16.4, -5.6, 1, 1, 1, UP); gift(25.8, -2.4, 1.2, 1, 1.2, UP); crate(16.3, -8.4, .8, UP, false); slab(22.4, 24.6, -4.6, -3, UP, UP + .9, beam); // a work bench upstairs
  flat(17.6, 19.6, -7.6, -4.6, rug, .016, 1);
  { const pl = new THREE.PointLight(0xffc880, 6, 12, 1.4); pl.position.set(21, 2.8, -6); add(pl); }
  capped(16.4, 17.3, -4.4, -3.5, h, 10.4, brick, .1);
  capped(16, 18.8, z1, 0, 2.75, 2.9, CLOTH[1], .06); for (const x of [16.1, 18.7]) { const b = box(.07, .07, 1.15, iron); b.position.set(x, 2.45, -.5); b.rotation.x = -.62; add(b); }
  sled(14.2, -9.2, 0); crate(14.4, -2.6, .9); gift(14.3, -3.7, .8, .7);
}
slab(20.3, 21.9, -1, 9, UP - .16, UP, deck); for (const x of [20.3, 21.9]) railing(x, -.94, x, 8.94, UP); for (const x of [20.42, 21.78]) { slab(x - .1, x + .1, 3.9, 4.1, 0, UP - .16, beam); slab(x - .18, x + .18, 3.82, 4.18, 0, .35, stone); } lights(20.3, 4.56, -.94, 20.3, 4.56, 8.94, .12);

// --- the church in the north-east corner: stairs up inside its tower to the belfry ---
{
  const x0 = 31, x1 = 37, z0 = 17, z1 = 23, TOP = 10.4, B1 = UP, B2 = 7.2, ix0 = x0 + T, ix1 = x1 - T, iz0 = z0 + T, iz1 = z1 - T;
  house(x0, x1, z0, z1, TOP, stoneL, {
    w: [[20, 1.6, 0, 2.5], [20, 1, 4.6, 5.8], [20, 2.2, 7.9, 9.6]], n: [[34, 2.4, 0, 3]], s: [[34, 1, 1.4, 2.6], [34, 1, 4.6, 5.8], [34, 2.2, 7.9, 9.6]], e: [[20, 1, 1.4, 2.6], [20, 1, 4.6, 5.8], [20, 2.2, 7.9, 9.6]],
  });
  flat(ix0, ix1, iz0, iz1, floorMat, .012, 2);
  stairs('z', 17.6, 21.7, 35.4, ix1, 0, B1); slab(35.4, ix1, 21.7, iz1, B1 - .2, B1, deck); slab(ix0, 35.4, iz0, iz1, B1 - .2, B1, deck); railing(35.4, iz0, 35.4, 21.7, B1, [false, true]);
  stairs('z', 22.4, 18.3, ix0, 32.6, B1, B2); slab(ix0, 32.6, iz0, 18.3, B2 - .2, B2, deck); slab(32.6, ix1, iz0, iz1, B2 - .2, B2, deck); railing(32.6, 18.3, 32.6, iz1, B2, [true, false]);
  for (const [b0, b1] of [[x0 - .6, x0], [x1, x1 + .6]]) capped(b0, b1, z0, z0 + 1, 0, 4.6, stoneL, .1); // buttresses on its south corners
  slab(x0 - .25, x1 + .25, z0 - .25, z1 + .25, TOP, TOP + .2, stoneL);
  { const c = new THREE.Mesh(pxCone(3.25 * Math.SQRT2, 5, 4), snow); c.rotation.y = Math.PI / 4; c.position.set(34, TOP + 2.7, 20); add(c); building.cover.push(c); solid(x0 - .25, x1 + .25, z0 - .25, z1 + .25, TOP + .2, TOP + 5.2, 'snow', { peak: { x: 34, z: 20, rx: 3.25, rz: 3.25, edge: TOP + .2 } }); piece(.14, 1.3, .14, gold, 34, TOP + 5.8, 20); piece(.7, .14, .14, gold, 34, TOP + 6.05, 20); }
  { const pl = new THREE.PointLight(0xffc880, 5, 10, 1.4); pl.position.set(34, 9.4, 20); add(pl); piece(.08, .5, .08, iron, 34, 10.15, 20); piece(.6, .5, .6, gold, 34, 9.65, 20); piece(.8, .14, .8, gold, 34, 9.36, 20); } // the bell, hung from the roof
  // the nave: its roof stops against the tower
  const nx0 = 29.5, nx1 = 38.5, nz0 = 23, nz1 = 36, nh = 5.5;
  house(nx0, nx1, nz0, nz1, nh, stoneL, { s: [[34, 2.4, 0, 3]], w: [[26, 1, 1.5, 4.2], [29.5, 1, 1.5, 4.2], [33, 1, 1.5, 4.2]], e: [[26, 1, 1.5, 4.2], [29.5, 1, 1.5, 4.2], [33, 1, 1.5, 4.2]], n: [[34, 1.6, 2.4, 4.4]] });
  gable('z', nx0, nx1, nz0, nz1, nh, 9, stoneL, { snow, o0: 0 }); flat(nx0 + T, nx1 - T, nz0 + T, nz1 - T, floorMat, .012, 2);
  for (const z of [24.3, 27.75, 31.25, 34.7]) for (const [x, sx] of [[nx0, -1], [nx1, 1]]) { capped(x + (sx < 0 ? -.55 : 0), x + (sx < 0 ? 0 : .55), z - .3, z + .3, 0, 3.4, stoneL, .1); } // buttresses between its windows
  onWall(piece(.14, 1.5, .08, gold, 34, 7.4, nz1 + .04)); onWall(piece(.8, .14, .08, gold, 34, 7.7, nz1 + .04)); // a cross on the far gable
  for (const z of [26, 28, 30, 32]) for (const e of [-1, 1]) { slab(34 + e * 2.1 - 1.2, 34 + e * 2.1 + 1.2, z - .25, z + .15, 0, .5, beam); slab(34 + e * 2.1 - 1.2, 34 + e * 2.1 + 1.2, z + .15, z + .27, 0, 1, beam); } // pews, their backs behind
  flat(33.5, 34.5, 24, 33.6, runner, .016, 1);
  slab(33, 35, 34.3, 35.1, 0, 1.1, stoneL); slab(32.9, 35.1, 34.2, 35.2, 1.1, 1.17, white); for (const dx of [-.7, .7]) { piece(.08, .3, .08, cream, 34 + dx, 1.32, 34.7); piece(.06, .08, .06, glowMat, 34 + dx, 1.51, 34.7); }
  for (const x of [30.6, 37.4]) { slab(x - .08, x + .08, 34.8, 34.96, 0, 1.5, iron); piece(.3, .06, .3, iron, x, 1.53, 34.88); piece(.1, .26, .1, cream, x, 1.69, 34.88); piece(.06, .08, .06, glowMat, x, 1.86, 34.88); } // candle stands either side
  { const pl = new THREE.PointLight(0xffc880, 6, 13, 1.4); pl.position.set(34, 3.6, 30); add(pl); }
  for (const [x, z] of [[27, 33.5], [28, 30], [26.5, 36.5], [27.4, 26.4]]) { slab(x - .3, x + .3, z - .1, z + .1, 0, .9, stone); slab(x - .32, x + .32, z - .12, z + .12, .9, 1, snow); } // old stones in the yard
}

// --- the park in the north-west corner: a bandstand, a snowman, pines ---
{
  const gx = -24, gz = 32;
  capped(gx - 3, gx + 3, gz - 3, gz + 3, 0, .5, stoneL, .08); stairs('z', gz - 4, gz - 3, gx - 1.2, gx + 1.2, 0, .5, stoneL);
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) slab(gx + ex * 2.7 - .13, gx + ex * 2.7 + .13, gz + ez * 2.7 - .13, gz + ez * 2.7 + .13, .5, 3.3, beam);
  slab(gx - 3.2, gx + 3.2, gz - 3.2, gz + 3.2, 3.3, 3.5, deck);
  { const c = new THREE.Mesh(pxCone(3.4 * Math.SQRT2, 2.2, 4), snow); c.rotation.y = Math.PI / 4; c.position.set(gx, 4.6, gz); add(c); building.cover.push(c); solid(gx - 3.4, gx + 3.4, gz - 3.4, gz + 3.4, 3.5, 5.7, 'snow', { peak: { x: gx, z: gz, rx: 3.4, rz: 3.4, edge: 3.5 } }); piece(.14, .5, .14, gold, gx, 5.9, gz); }
  railing(gx - 2.7, gz + 2.7, gx + 2.7, gz + 2.7, .5, [false, false]); railing(gx - 2.7, gz - 2.7, gx - 2.7, gz + 2.7, .5, [false, false]); railing(gx + 2.7, gz - 2.7, gx + 2.7, gz + 2.7, .5, [false, false]);
  railing(gx - 2.7, gz - 2.7, gx - 1.2, gz - 2.7, .5, [false, true]); railing(gx + 1.2, gz - 2.7, gx + 2.7, gz - 2.7, .5, [true, false]);
  lights(gx - 3.2, 3.27, gz - 3.23, gx + 3.2, 3.27, gz - 3.23); lights(gx - 3.23, 3.27, gz - 3.2, gx - 3.23, 3.27, gz + 3.2); lights(gx + 3.23, 3.27, gz - 3.2, gx + 3.23, 3.27, gz + 3.2); lights(gx - 3.2, 3.27, gz + 3.23, gx + 3.2, 3.27, gz + 3.23);
  for (const x of [-1.4, 1.4]) stool(gx + x, gz + 1.6, .5); slab(gx - .06, gx + .06, gz + .34, gz + .46, .5, 1.6, iron); slab(gx - .4, gx + .4, gz + .3, gz + .5, 1.6, 2.1, beam); // a music stand and two stools
  snowman(-31.5, 25.4, 1.2); snowman(-15.5, 27.6, -.6); lamp(-28.6, 27); lamp(-18.6, 36.4);
  for (const [x, z] of [[-30, 33], [-18, 26.4]]) { slab(x - .9, x + .9, z - .25, z + .25, .38, .5, deck); slab(x - .9, x + .9, z + .2, z + .3, .5, 1, deck); for (const e of [-1, 1]) slab(x + e * .7 - .08, x + e * .7 + .08, z - .2, z + .2, 0, .38, iron); }
}

// --- the bridges over the river: stone on the main street, planks to the east ---
stairs('z', -11.5, -16.5, -2.6, 2.6, 0, 2.6, stone, true); slab(-2.6, 2.6, -25.5, -16.5, 2.1, 2.6, stone); slab(-2.6, 2.6, -17.7, -16.5, 0, 2.1, stone); slab(-2.6, 2.6, -25.5, -24.3, 0, 2.1, stone); stairs('z', -30.5, -25.5, -2.6, 2.6, 0, 2.6, stone, true);
for (const e of [-1, 1]) { capped(e * 2.6 - (e > 0 ? .3 : 0), e * 2.6 + (e > 0 ? 0 : .3), -25.5, -16.5, 2.6, 3.5, stone, .1); stairRail('z', -11.5, -16.5, e * 2.45, 0, 2.6); stairRail('z', -30.5, -25.5, e * 2.45, 0, 2.6); }
for (const [x, z] of [[-2.45, -16.7], [2.45, -16.7], [-2.45, -25.3], [2.45, -25.3]]) { piece(.3, .4, .3, glowMat, x, 3.7, z); piece(.4, .08, .4, iron, x, 3.94, z); }
ramp('z', -12.5, -17.5, 30, 32.2, 0, 2.4, deck, .18); slab(30, 32.2, -24.5, -17.5, 2.24, 2.4, deck); ramp('z', -29.5, -24.5, 30, 32.2, 0, 2.4, deck, .18);
for (const x of [30, 32.2]) { stairRail('z', -12.5, -17.5, x, 0, 2.4); railing(x, -17.5, x, -24.5, 2.4, [false, false]); stairRail('z', -29.5, -24.5, x, 0, 2.4); }
for (const x of [30.12, 32.08]) for (const z of [-17.7, -24.3]) slab(x - .1, x + .1, z - .1, z + .1, 0, 2.24, beam);
// --- the south bank: a little rink round a small tree, a skate hut, a row of houses, the gate ---
const RINK = [-29, -19, -37.5, -29];
{
  const [x0, x1, z0, z1] = RINK, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  flat(x0, x1, z0, z1, ice, .014, 4);
  for (const [a, b, c, d] of [[x0 - .2, x1 + .2, z0 - .2, z0], [x0 - .2, x0, z0, z1], [x0 - .2, cx - 1.1, z1, z1 + .2], [cx + 1.1, x1 + .2, z1, z1 + .2], [x1, x1 + .2, z0, cz - 1.1], [x1, x1 + .2, cz + 1.1, z1]]) capped(a, b, c, d, 0, .6, B_RED, .07); // boards round it, a way in on the north and the east
  for (const x of [x0 - .1, x1 + .1]) for (const z of [z0 - .1, z1 + .1]) { slab(x - .14, x + .14, z - .14, z + .14, 0, 3, beam); piece(.36, .1, .36, iron, x, 3.05, z); } // a post at each corner, lights strung between them
  for (const [a, b, c, d] of [[x0 - .1, z0 - .1, x1 + .1, z0 - .1], [x0 - .1, z1 + .1, x1 + .1, z1 + .1], [x0 - .1, z0 - .1, x0 - .1, z1 + .1], [x1 + .1, z0 - .1, x1 + .1, z1 + .1]]) lights(a, 2.9, b, c, 2.9, d, .4);
  capped(cx - .9, cx + .9, cz - .9, cz + .9, 0, .3, stoneL, .06); slab(cx - .2, cx + .2, cz - .2, cz + .2, .3, 1, barkMat); // the tree in the middle, on its plinth
  [2.6, 2, 1.4, .8].forEach((w, i) => {
    const y = 1 + i * .8; capped(cx - w / 2, cx + w / 2, cz - w / 2, cz + w / 2, y, y + .8, needle, .08);
    for (const e of [-1, 1]) { lights(cx - w / 2, y + .36, cz + e * (w / 2 + .03), cx + w / 2, y + .36, cz + e * (w / 2 + .03), 0, .4); lights(cx + e * (w / 2 + .03), y + .36, cz - w / 2, cx + e * (w / 2 + .03), y + .36, cz + w / 2, 0, .4); }
  });
  star(cx, 4.2 + 4.5 * .07, cz, .07);
  gift(cx - .62, cz + .62, .44, .4, .44, .3); gift(cx + .6, cz - .6, .4, .44, .4, .3);
  { const pl = new THREE.PointLight(0xffd890, 8, 13, 1.3); pl.position.set(cx + 2.4, 2.6, cz + 2.4); add(pl); }
  for (const x of [cx - 3.2, cx + 3.2]) { slab(x - .9, x + .9, z1 + 1.05, z1 + 1.55, .38, .5, deck); slab(x - .9, x + .9, z1 + 1.5, z1 + 1.6, .5, 1, deck); for (const e of [-1, 1]) slab(x + e * .7 - .08, x + e * .7 + .08, z1 + 1.1, z1 + 1.5, 0, .38, iron); } // benches to lace up on
}
{ // the skate hut by the ice: blue boards, a rack of skates
  const holes = { n: [[11.5, 1.8, 0, 2.5]], w: [[-29.2, 1.4, 1.2, 2.4]], e: [[-29.2, 1.4, 1.2, 2.4]] };
  house(8, 15, -32, -26.5, 3, B_BLUE, holes, { tr: false }); frame(8, 15, -32, -26.5, 0, 3, holes, { timber: false, m: T_WHITE, corners: true });
  gable('x', 8, 15, -32, -26.5, 3, 4.8, B_BLUE, { snow }); flat(8 + T, 15 - T, -32 + T, -26.5 - T, floorMat, .012, 2);
  slab(8.5, 9.1, -31.6, -30.1, 0, 1.3, beam); for (let z = -31.3; z < -30.2; z += .5) { detail(piece(.2, .22, .34, [white, black, red][rnd() * 3 | 0], 9.2, 1.02, z)); detail(piece(.04, .06, .4, steelM, 9.2, .88, z)); } // skates hung along it
  slab(13.4, 14.6, -31.6, -30.8, .38, .5, deck); for (const x of [13.5, 14.5]) slab(x - .07, x + .07, -31.5, -30.9, 0, .38, beam); stool(12.6, -30.4);
  sign('SKATES', 2.6, 11.5, 3.4, -26.45, 0, '#ffe9b0', '#2a3a5c');
  { const pl = new THREE.PointLight(0xffc880, 5, 9, 1.4); pl.position.set(11.5, 2.4, -29.4); add(pl); }
  sled(15.7, -27.4, 1); barrel(7.5, -27.2);
}
block(17, 24, -40.5, -34, 6.2, T_CREAM, 'x', 8.4, 'nwe', ['n', 20.5]); block(24, 30.5, -40.5, -34.5, 5, brick, 'x', 7.4, 'n', ['n', 27], 'brick'); block(30.5, 38, -40.5, -33.5, 6.6, B_SAGE, 'x', 9, 'nwe', ['n', 34], 'board');
block(-14, -6.5, -40.5, -34, 6, T_YELLOW, 'x', 8.2, 'nwe', ['n', -10.4]); block(-40.5, -33, -34, -27, 5.6, T_WHITE, 'z', 7.8, 'ens', ['e', -30.6]);
for (const e of [-1, 1]) { capped(e * 4.6 - 1.2, e * 4.6 + 1.2, -41.4, -39, 0, 6, stone); onWall(piece(.9, 1.1, .05, winLit, e * 4.6, 4, -38.97)); onWall(piece(1.06, .12, .1, stoneL, e * 4.6, 3.39, -38.95)); slab(e * 4.6 - 1.3, e * 4.6 + 1.3, -41.5, -38.9, 0, .5, stone); }
slab(-3.4, 3.4, -40.8, -39.6, 4.2, 5.2, stone); slab(-3.4, 3.4, -40.8, -39.6, 5.2, 5.32, snow); sign('MERRY CHRISTMAS', 6.2, 0, 4.7, -39.55, 0, '#ffe9b0', '#7a1e18'); lights(-3.4, 4.12, -39.5, 3.4, 4.12, -39.5, .3);
for (const [x, z] of [[-6, -31.5], [6, -31.5], [-14.5, -27.6], [22, -27.4], [36, -27.4], [-31, -38]]) lamp(x, z);
snowman(4.8, -36.4, -.4); snowman(-36.6, -21.2, .8); gift(-5, -36.6, 1.2, 1); gift(-3.9, -37.4, .9); gift(25.4, -30.6, 1.2, 1.1); gift(-15.6, -30, 1, 1.2); gift(34, -30.4, 1, .9);
barrel(-7.4, -33.4); crate(-8.4, -33.4, .8); logs(29.3, -34.2, 'x', 1.8); barrel(31.2, -33); crate(-32.4, -29.2, .9); crate(-32.5, -28.2, .7); logs(22.4, -33.7, 'x', 2);

// --- houses round the edge, the far ends of the streets ---
block(-40.5, -33, 9, 17, 6, T_SAGE, 'z', 8.4, 'es', ['e', 13]); block(-40.5, -33, 18.5, 24, 5, brickB, 'z', 7.2, 'e', ['e', 21], 'brick'); block(-40.5, -33, -9, -1, 6.4, T_YELLOW, 'z', 8.8, 'en', ['e', -5]); block(-40.5, -33.5, -16, -10.5, 5, B_BLUE, 'z', 7, 'e', ['e', -13.2], 'board');
block(32, 40.5, 8, 15, 6, T_YELLOW, 'z', 8.4, 'ws', ['w', 11.5]); block(32, 40.5, -9, -1, 6.4, brick, 'z', 8.8, 'wn', ['w', -5], 'brick'); block(32.5, 40.5, -16.5, -10.5, 5, T_PINK, 'z', 7, 'w', ['w', -13.4]);
block(-14, -10.5, 33, 40.5, 5, T_PINK, 'z', 7, 'sew', ['s', -12.2]); block(11, 19, 33.5, 40.5, 6, B_RED, 'x', 8.2, 'sw', ['s', 15], 'board'); block(19.5, 26, 34.5, 40.5, 5, T_WHITE, 'x', 7.2, 's', ['s', 22.6]);
for (const [x, z] of [[-30, 7.6], [-37, .4], [30, 7.6], [37, .4], [-14.5, -6], [13.4, 21.6], [-12.6, 22.6], [28.6, -12.6], [-31, -12.4]]) lamp(x, z);
barrel(-32.5, 15.6); logs(-32.7, 19.4, 'z', 1.4); crate(-32.5, -7.4, .9); barrel(31.5, 13.8); crate(31.55, -2.4, .8); crate(31.5, -3.4, .9); logs(32.2, -15.4, 'z', 1.6); barrel(-10.9, 32.5); crate(17.4, 33, .8); sled(24, 33.8, 1);
// a well between the town hall and the bakery
{
  const wx = 11.8, wz = 28.6;
  for (const [a, b, c, d] of [[-1, 1, -1, -.7], [-1, 1, .7, 1], [-1, -.7, -.7, .7], [.7, 1, -.7, .7]]) capped(wx + a, wx + b, wz + c, wz + d, 0, .9, stone, .08);
  slab(wx - .7, wx + .7, wz - .7, wz + .7, 0, .5, stone); onWall(piece(1.4, .04, 1.4, iceTop, wx, .52, wz));
  for (const e of [-1, 1]) slab(wx + e * .85 - .08, wx + e * .85 + .08, wz - .08, wz + .08, .9, 2.4, beam);
  slab(wx - 1.2, wx + 1.2, wz - .6, wz + .6, 2.4, 2.52, deck); slab(wx - 1.2, wx + 1.2, wz - .6, wz + .6, 2.52, 2.62, snow); piece(1.6, .1, .1, beam, wx, 2.1, wz); piece(.04, .9, .04, iron, wx, 1.6, wz); piece(.3, .3, .3, staves, wx, 1.05, wz);
}
// lights strung from fixing to fixing: mast to mast along the square, corner to corner over the streets, lamp to lamp, along the bridge
lights(-12, 6.85, -8, 12, 6.85, -8, .9); lights(-12, 6.85, 14, 12, 6.85, 14, .9);
lights(-14.93, 6.9, 9, -14.93, 6.1, -1, .7); lights(14.93, 6.9, 9, 14.93, 6.9, -1, .7); lights(-28.07, 6, 9, -28.07, 5.6, -1, .7); lights(27.07, 6.6, 9, 27.07, 6.6, -1, .7);
for (const e of [-1, 1]) lights(e * 2.64, 3.4, -16.5, e * 2.64, 3.4, -25.5);
lights(-11, 3.5, 7.5, -6, 3.5, -7, .5); lights(11, 3.5, 7.5, 6, 3.5, -7, .5); lights(-11, 3.5, 7.5, -4.5, 3.5, 13.2, .4); lights(11, 3.5, 7.5, 4.5, 3.5, 13.2, .4);
gift(-36.4, 5.6, 1.2, 1); gift(-35.3, 6, .9); gift(36.4, 2.4, 1.2, 1.1); gift(29, 22.4, 1, 1.2); gift(-12.8, 16.6, 1.2, 1); gift(12.6, -12.4, 1.1, 1.2); gift(-9.6, -12.6, 1, .9); gift(12.4, 24.6, 1.3, 1.1); gift(13.5, 25.2, .9);
capped(-12.4, -9.6, -15.4, -14.6, 0, 1, snow, .1); capped(9.4, 12.6, -14.2, -13.4, 0, 1, snow, .1); capped(-34, -31, 34.4, 35.2, 0, 1, snow, .1); // snow piled up

K.finish(m => m.material === glowMat || m.material === fireMat);

// --- a wall round it all, pines and hills past it, lit windows on the far hillsides ---
for (const [x0, x1, z0, z1] of [[-41.5, -5.8, -41.5, -40.9], [5.8, 41.5, -41.5, -40.9], [-41.5, 41.5, 40.9, 41.5], [-41.5, -40.9, -40.9, 40.9], [40.9, 41.5, -40.9, 40.9]]) capped(x0, x1, z0, z1, 0, 1.4, stone);
{
  const r = seeded(909), trunks = [], greens = [], caps = [];
  const pine = (x, z, s) => { trunks.push([x, s * 2.2, z, .5 * s, 4.4 * s, .5 * s, 0]); [[3, 1.4], [2.2, 2.7], [1.3, 4]].forEach(([w, y], i) => { greens.push([x, s * (y + .55), z, w * s, 1.1 * s, w * s, 0, [0xffffff, 0xdceedc, 0xc6dcc8][i]]); caps.push([x, s * (y + 1.17), z, w * s, .14 * s, w * s, 0]); }); };
  for (let k = 0; k < 170; k++) { const a = r() * 6.283, d = 46 + r() * 34, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.max(Math.abs(x), Math.abs(z)) < 44.5 || Math.abs(x) < 4 && z < 0) continue; pine(x, z, 1 + r() * 1.3); }
  for (const [x, z, s] of [[-37, 36, 1.5], [-33, 38.4, 1.1], [-38.4, 31, 1.2], [-29, 38, .9], [-17.4, 31.5, 1], [-16, 37.8, 1.2], [39, 38, 1.3], [22.6, 26, .9]]) { pine(x, z, s); solid(x - .25 * s, x + .25 * s, z - .25 * s, z + .25 * s, 0, 1.4 * s, 'wood'); [[3, 1.4], [2.2, 2.7], [1.3, 4]].forEach(([w, y]) => solid(x - w * s / 2, x + w * s / 2, z - w * s / 2, z + w * s / 2, s * y, s * (y + 1.24), 'snow')); } // the ones in town are solid
  instanced(unit, barkMat, trunks); instanced(unit, needle, greens); instanced(unit, snow, caps);
  const hills = []; for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283 + r() * .2, d = 66 + r() * 26, w = 18 + r() * 18, h = 3 + r() * 7; hills.push([w, h, w * (.6 + r() * .5), Math.cos(a) * d, h / 2 - .4, Math.sin(a) * d, r() * 3]); }
  boxesMesh(hills, snow, 2);
}
// the sky: the last light low in the west, stars, the moon
const MOON = new THREE.Vector3(...M.env.sunDir).normalize();
const moon = skyCube(moonFaces([238, 242, 248], [195, 204, 217]), MOON.clone().negate().add(new THREE.Vector3(-.5, .6, 0)), { amb: .3 }); moon.scale.setScalar(4.4); moon.position.copy(MOON).multiplyScalar(120);
const moonGlow = skyBack(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, color: 0xcfdcff, fog: false, opacity: .4, blending: THREE.AdditiveBlending }))); moonGlow.scale.setScalar(34);
for (const [o, k] of [[moon, 120], [moonGlow, 121]]) { const own = o.onBeforeRender; o.onBeforeRender = (rr, sc, cam, ...a) => { o.position.copy(cam.position).addScaledVector(MOON, k); o.updateMatrixWorld(); own.call(o, rr, sc, cam, ...a); }; }
add(moonGlow); add(moon);
add(skyDome(90, [[-1, 0x2b3962], [0, 0x2b3962], [.04, 0x6a5a86], [.12, 0x3c3c72], [.3, 0x1f2a54], [.55, 0x121a3a], [.8, 0x0a1026], [1, 0x070b1c]]));
{
  const pos = [], s = [], c = [], C = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * Math.PI * 2, y = Math.random(), rr = Math.sqrt(1 - y * y); v.set(rr * Math.cos(a), y, rr * Math.sin(a)); if (v.y < .08) continue;
    const q = Math.random(), big = q > .99 ? 3 : q > .93 ? 2 : 1;
    pos.push(v.x * 85, v.y * 85, v.z * 85); s.push(big * .17, big > 1 ? .8 + Math.random() * .2 : .4 + Math.random() * .5, .15 + Math.random() * .4, Math.random());
    C.set([0xffffff, 0xe4ecff, 0xd0dcff, 0xfff4e0][Math.random() * 4 | 0]); c.push(C.r, C.g, C.b);
  }
  add(camStars(pos, s, c, 14));
}
{
  const F = 0x2b3962, fr = seeded(61);
  const near = farRange(120, fr, { lo: 6, hi: 15, mat: farMat(0x56628e, F, .35) });
  farRange(134, fr, { lo: 14, hi: 30, peaks: 5, peak: 14, mat: farMat(0x3a4674, F, .3), snow: farMat(0xb6c2e6, F, .2), snowAt: 20 });
  const n = near.length, wins = []; for (let i = 0; i < n; i++) if (near[i] > 7 && fr() < .16) { const a = (i + .5) / n * 6.283; wins.push([.7, .7, .3, Math.cos(a) * 119, 2 + fr() * (near[i] - 4), Math.sin(a) * 119, -a - Math.PI / 2]); } // windows lit on the far hills
  farOff(boxesMesh(wins, new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })));
}
const flakes = snowFall(1800, roofMap(M), { fall: 1.7, wind: [.3, .2] }); add(flakes);
// smoke from the chimneys
const puffMat = new THREE.MeshLambertMaterial({ color: 0xc8cee0, transparent: true, opacity: .7, depthWrite: false });
const puffs = [[-27.2, 10.7, 13], [-27.2, 10.7, 13], [-27.2, 10.7, 13], [25.95, 10.9, 12.5], [25.95, 10.9, 12.5], [25.95, 10.9, 12.5]].map(([x, y, z], i) => { const m = live(detail(new THREE.Mesh(unit, puffMat.clone()))); add(m); return { m, x, y, z, t: i * .37 % 1 }; });

// --- bots find the stairs; floors indoors sound like floors ---
const NV = makeNav(M, [0, 0, -10]);
M.nav = NV.nav; M.around = NV.around;
M.debug = { nav: NV.data, nodeNear: NV.nodeNear, build: NV.ready, UP, doors: K.doors, windows: K.windows };
const INDOORS = [[-9, 9, 19, 31], [-28, -15, 9, 21], [15, 27, 9, 20], [15, 27, -11, -1], [31, 37, 17, 23], [29.5, 38.5, 23, 36], [8, 15, -32, -26.5]];
M.surfAt = (x, z, feet, base, s) => !s && feet < .2 && (z > RZ0 && z < RZ1 || x > RINK[0] && x < RINK[1] && z > RINK[2] && z < RINK[3] ? 'stone' : INDOORS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1) ? 'wood' : null) || base;
M.ice = (x, z, y) => y < .3 && (z > RZ0 && z < RZ1 || x > RINK[0] && x < RINK[1] && z > RINK[2] && z < RINK[3]); // the river and the rink
M.tick = dt => {
  const t = performance.now() / 1000, k = Math.min(dt, .05);
  if (!gfxQ().detail) return;
  for (const p of puffs) { p.t = (p.t + k * .14) % 1; const s = .4 + p.t * 1.3; p.m.scale.setScalar(s); p.m.position.set(p.x + p.t * 2.2 + Math.sin(p.t * 9 + p.x) * .2, p.y + p.t * 4.5, p.z + p.t * 1.2); p.m.material.opacity = .6 * (1 - p.t) * Math.min(1, p.t * 6); }
};
});
