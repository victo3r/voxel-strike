startMap('workshop', {
  name: 'Toy Workshop', size: 'medium', half: 36, surf: 'snow', winter: true,
  env: { sky: 0xbcd8ee, fog: 0xdbe8f3, fogNear: 42, fogFar: 150, hemiSky: 0xffffff, hemiGround: 0xa9b9d2, hemi: 1.05, sunColor: 0xfff1d8, sun: 1.25, sunDir: [13, 15, -12] }, // a bright winter morning
  pads: [[0, 17.5], [5, -3], [-26, 5], [25, -8, 1.05], [-5, -17], [22, -19]],
  crates: [],
}, () => {
const M = MAPS.workshop, rnd = seeded(1225), r16 = () => Math.random() * 16 | 0;

// materials
const dots = (g, col, n, w = 1, h = 1) => { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(r16(), r16(), w, h); };
const snowDraw = g => { noise(g, [236, 241, 248], 7); dots(g, 'rgba(176,198,230,.5)', 5); };
const snow = surf(lam({ map: tex(snowDraw) }), 'snow');
const bricks = (rgb, mortar) => surf(lam({ map: tex(g => { noise(g, rgb, 16); g.fillStyle = mortar; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[3, 0], [11, 0], [7, 4], [15, 4], [3, 8], [11, 8], [7, 12], [15, 12]]) g.fillRect(x, y, 1, 3); }) }), 'stone');
const brick = bricks([168, 62, 52], 'rgba(236,222,200,.6)'), brickD = bricks([98, 88, 92], 'rgba(40,36,40,.5)');
const planks = (rgb, v, vert) => tex(g => { noise(g, rgb, v); g.fillStyle = 'rgba(30,20,12,.4)'; for (const k of [0, 5, 10]) vert ? g.fillRect(k, 0, 1, 16) : g.fillRect(0, k, 16, 1); dots(g, 'rgba(0,0,0,.14)', 4, 1, 2); });
const siding = rgb => surf(lam({ map: planks(rgb, 12, true) }), 'wood');
const W_GREEN = siding([54, 112, 76]), W_RED = siding([172, 56, 48]), W_CREAM = siding([228, 214, 188]), W_BROWN = siding([126, 92, 62]), W_BLUE = siding([70, 110, 160]);
const deck = surf(lam({ map: planks([150, 112, 74], 16) }), 'wood');
const beam = surf(lam({ map: tex(g => { noise(g, [104, 74, 50], 14); g.fillStyle = 'rgba(40,24,12,.35)'; for (const y of [4, 11]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const shingle = surf(lam({ map: tex(g => { noise(g, [92, 68, 58], 12); g.fillStyle = 'rgba(0,0,0,.3)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const stone = surf(lam({ map: tex(g => { noise(g, [152, 154, 164], 14); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); }) }), 'stone');
const iron = surf(lam({ color: 0x30343c }), 'metal'), steel = surf(lam({ color: 0x8e98a6 }), 'metal'), gold = surf(lam({ color: 0xe0b040, emissive: 0x3a2a08 }), 'metal');
const paint = c => surf(lam({ color: c }), 'metal'), P_RED = paint(0xc8322c), P_GREEN = paint(0x2f8a4c), P_BLUE = paint(0x3a6ec0), P_TEAL = paint(0x3aa39a);
const candy = (k = 1) => surf(lam({ map: tex(g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = ((x + y) >> 2) % 2 ? '#f4f0ec' : '#d2312c'; g.fillRect(x, y, 1, 1); } }, k, k) }), 'metal');
const cane = surf(lam({ map: tex(g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = ((x + y) >> 1) % 2 ? '#f4f0ec' : '#d2312c'; g.fillRect(x, y, 1, 1); } }) }), 'metal'), caneBig = candy(2); // thin stripes for posts, broad ones for the big pipe
const ballMat = lam({ map: tex(g => { ['#d2312c', '#f4f0ec', '#3a6ec0', '#f4f0ec', '#e0a020', '#f4f0ec', '#2f8a4c', '#f4f0ec'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 2, 0, 2, 16); }); }) });
const drumMat = surf(lam({ map: tex(g => { g.fillStyle = '#c8322c'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f4f0ec'; for (let x = 0; x < 16; x++) g.fillRect(x, 3 + Math.abs(x % 8 - 4) * 2, 1, 2); }, 4, 1) }), 'wood');
const jackMat = surf(lam({ map: tex(g => { noise(g, [58, 106, 190], 8); g.fillStyle = '#e0b040'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); for (let i = 0; i < 4; i++) { g.fillRect(7 - i, 4 + i, 2 + i * 2, 1); g.fillRect(7 - i, 11 - i, 2 + i * 2, 1); } }) }), 'wood');
const glowMat = lam({ color: 0xffe2a4, emissive: 0xffb04a, emissiveIntensity: 1.2 }), fireMat = lam({ color: 0xffb060, emissive: 0xff6a18, emissiveIntensity: 1.4 });
const black = lam({ color: 0x1a1a1e }), white = lam({ color: 0xf2f2f4 }), orange = lam({ color: 0xf08a2a }), scarf = lam({ color: 0xc8322c });
const coal = surf(lam({ map: tex(g => { noise(g, [42, 42, 48], 18); dots(g, 'rgba(120,124,136,.5)', 5); }) }), 'stone');
const hay = surf(lam({ map: tex(g => { noise(g, [212, 178, 96], 26); dots(g, 'rgba(120,90,30,.45)', 14, 3, 1); }) }), 'grass');
const needle = surf(lam({ map: tex(g => { noise(g, [42, 98, 66], 18); dots(g, 'rgba(16,44,28,.4)', 10, 2, 1); }) }), 'grass');
const fur = lam({ color: 0x8c5c3a }), furD = lam({ color: 0x5e3c26 }), cream = lam({ color: 0xead9b8 }), antler = lam({ color: 0xd9c9a2 }), teddy = surf(lam({ map: tex(g => { noise(g, [176, 124, 76], 16); }) }), 'grass');
const pathMat = kitDecal({ map: tex(g => { noise(g, [204, 210, 222], 8); g.fillStyle = 'rgba(120,128,146,.35)'; for (const [x, y, w] of [[1, 2, 5], [9, 4, 6], [3, 9, 6], [11, 12, 4], [0, 14, 3]]) g.fillRect(x, y, w, 2); }) });
const floorMat = kitDecal({ map: planks([168, 130, 90], 12) }), stoneFloor = kitDecal({ map: stone.map }), strawFloor = kitDecal({ map: tex(g => { noise(g, [150, 122, 82], 16); dots(g, 'rgba(226,196,110,.6)', 16, 3, 1); }) });
const ice = kitDecal({ color: 0xc4e2f2, emissive: 0x1a3442 });
const beltTex = tex(g => { g.fillStyle = '#2e3138'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#4a4f5a'; for (const x of [0, 8]) for (let y = 0; y < 16; y++) g.fillRect(x + (y < 8 ? y : 15 - y) % 8 >> 1, y, 2, 1); });
const beltTop = lam({ map: beltTex });
const glass = kitDecal({ color: 0x20303c, emissive: 0x0a1218 });
const bulbMat = new THREE.MeshBasicMaterial(), BULBS = [0xff4a3a, 0xffd23a, 0x4ad86a, 0x4a9aff, 0xff7ae0];
// wrapped presents and letter blocks: one picture a side
const GIFT = [[202, 48, 44, '#f4e8c0'], [46, 130, 80, '#e8c040'], [58, 106, 190, '#f2f2f2'], [228, 182, 60, '#c8302a'], [152, 72, 164, '#f0d060'], [240, 240, 244, '#c8302a']]
  .map(([r, g, b, rib]) => { const m = surf(lam({ map: tex(c => { noise(c, [r, g, b], 10); c.fillStyle = rib; c.fillRect(7, 0, 2, 16); c.fillRect(0, 7, 16, 2); }) }), 'wood'); m.userData.rib = lam({ color: rib }); return m; });
const blockMats = {}, blockMat = (ch, col) => blockMats[ch + col] ??= surf(lam({ map: tex(g => {
  noise(g, [230, 200, 152], 8); g.fillStyle = col; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2); g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
  const f = KIT_FONT[ch]; for (let k = 0; k < 15; k++) if (f[k] === '1') g.fillRect(5 + (k % 3) * 2, 3 + (k / 3 | 0) * 2, 2, 2);
}) }), 'wood');

const K = mapKit({ beam, deck, roof: shingle, T: .3, snow }), { T, piece, onWall, slab, solid, flat, wall, house, upper, gable, stairs, ramp, railing, stairRail, sign, star, lights, frame, barrel, crate, logs, stool, sled, postbox } = K;
const UP = 3.6; // every upstairs
const cylX = (r, len, m, x, y, z, n = 14) => { const c = new THREE.Mesh(pxCyl(r, r, len, n), m); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); add(c); return c; };
const cylZ = (r, len, m, x, y, z, n = 14) => { const c = new THREE.Mesh(pxCyl(r, r, len, n), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); add(c); return c; };
const cylY = (r0, r1, h, m, x, y, z, n = 12) => { const c = new THREE.Mesh(pxCyl(r0, r1, h, n), m); c.position.set(x, y, z); add(c); return c; };
function gift(x, z, w, h = w, d = w, y0 = 0, k = rnd() * GIFT.length | 0) {
  const b = box(w, h, d, GIFT[k]); b.position.set(x, y0 + h / 2, z); add(b); building.cover.push(b); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h);
  for (const e of [-1, 1]) { const l = detail(box(w * .26, w * .12, w * .1, GIFT[k].userData.rib)); l.position.set(x + e * w * .13, y0 + h + w * .05, z); l.rotation.z = e * .5; add(l); } // the bow
  return y0 + h;
}
function toyBlock(x, z, s, ch, col, y0 = 0) { const b = box(s, s, s, blockMat(ch, col)); b.position.set(x, y0 + s / 2, z); add(b); building.cover.push(b); solid(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y0, y0 + s); return y0 + s; }
// a snow cap on a flat top
const capped = (x0, x1, z0, z1, bot, top, m, th = .14) => { slab(x0, x1, z0, z1, bot, top - th, m); slab(x0, x1, z0, z1, top - th, top, snow); };
// a candy cane lamp post, its lantern out toward (dx, dz)
function caneLamp(x, z, dx = 1, dz = 0) {
  slab(x - .09, x + .09, z - .09, z + .09, 0, 3.1, cane);
  piece(dx ? .62 : .18, .18, dz ? .62 : .18, cane, x + dx * .22, 3.19, z + dz * .22); piece(.18, .3, .18, cane, x + dx * .44, 2.95, z + dz * .44);
  piece(.3, .34, .3, glowMat, x + dx * .44, 2.63, z + dz * .44); piece(.38, .06, .38, iron, x + dx * .44, 2.83, z + dz * .44);
}
function snowman(x, z, ry = 0) {
  slab(x - .5, x + .5, z - .5, z + .5, 0, .95, snow); slab(x - .38, x + .38, z - .38, z + .38, .95, 1.65, snow); slab(x - .28, x + .28, z - .28, z + .28, 1.65, 2.2, snow);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; add(g);
  const put = (w, h, d, m, px, py, pz, det) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (det) detail(b); else meshSolids(b, 'snow'); return b; };
  put(.74, .07, .74, black, 0, 2.23, 0); put(.44, .4, .44, black, 0, 2.46, 0); put(.46, .08, .46, scarf, 0, 2.31, 0, true);
  put(.1, .1, .3, orange, 0, 1.92, .4, true); for (const e of [-1, 1]) put(.08, .08, .04, black, e * .12, 2.02, .29, true);
  for (const y of [1.15, 1.4]) put(.08, .08, .04, black, 0, y, .39, true);
  put(.6, .14, .6, scarf, 0, 1.68, 0, true); put(.14, .4, .08, scarf, .16, 1.45, .4, true);
  for (const e of [-1, 1]) { const a = put(.7, .06, .06, beam, e * .68, 1.45, 0); a.rotation.z = e * .5; }
}
// a reindeer facing +z before its turn (quarter turns only, so its hitboxes fit)
function reindeer(x, z, q, bell = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = q * Math.PI / 2; add(g);
  const put = (w, h, d, m, px, py, pz, hit) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (hit) { meshSolids(b, 'grass'); building.cover.push(b); } return b; };
  put(.56, .62, 1.3, fur, 0, 1.12, 0, true); put(.5, .2, 1.1, cream, 0, .86, 0);
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) { put(.15, .82, .15, furD, ex * .19, .41, ez * .5, true); put(.17, .1, .17, black, ex * .19, .05, ez * .5); }
  put(.32, .66, .32, fur, 0, 1.62, .58, true); put(.36, .36, .56, fur, 0, 2.02, .78, true); put(.24, .2, .14, furD, 0, 1.96, 1.1); put(.12, .1, .05, black, 0, 2, 1.18);
  for (const e of [-1, 1]) { put(.06, .06, .04, black, e * .14, 2.1, 1.05); put(.14, .1, .06, fur, e * .24, 2.16, .6); put(.07, .46, .07, antler, e * .13, 2.42, .62); put(.26, .07, .07, antler, e * .26, 2.5, .62); put(.07, .2, .07, antler, e * .36, 2.62, .62); put(.07, .07, .2, antler, e * .13, 2.36, .74); }
  put(.14, .16, .14, cream, 0, 1.3, -.7);
  if (bell) { put(.6, .1, .14, scarf, 0, 1.44, .5); put(.12, .12, .12, gold, 0, 1.3, .68); }
}

// the ground, snow all round
addGround(160, lam({ map: tex(snowDraw, 160, 160) }));
for (const [x, z, w, d] of [[0, -35.6, 76, .3], [0, 35.6, 76, .3], [-35.6, 0, .3, 76], [35.6, 0, .3, 76]]) addWall(x, z, w, d);

// --- the works: a brick hall with a walkway round the inside, a bridge across it and doors on every side ---
const HX0 = -14, HX1 = 14, HZ0 = -8, HZ1 = 10, HH = 7, I0 = HX0 + T, I1 = HX1 - T, J0 = HZ0 + T, J1 = HZ1 - T, MZ = 2.6;
const WH = {
  w: [[1, 4, 0, 3.3], [-5, 1.4, UP, 5.9], [5.6, 1.6, 4.6, 5.9]],
  e: [[1, 4, 0, 3.3], [6, 1.4, UP, 5.9], [-5, 1.6, 4.6, 5.9]],
  s: [[-8, 2, 0, 2.6], [8, 2, 0, 2.6], [-11.4, 1.6, 4.6, 5.9], [-4, 1.6, 4.6, 5.9], [0, 1.6, 4.6, 5.9], [4, 1.6, 4.6, 5.9], [11.4, 1.6, 4.6, 5.9]],
  n: [[0, 5, 0, 3.3], [-9, 1.6, 1.2, 2.6], [9, 1.6, 1.2, 2.6], [-8, 1.6, 4.6, 5.9], [-3, 1.6, 4.6, 5.9], [3, 1.6, 4.6, 5.9], [8, 1.6, 4.6, 5.9]],
};
house(HX0, HX1, HZ0, HZ1, HH, brick, WH, { tr: false }); frame(HX0, HX1, HZ0, HZ1, 0, HH, WH, { timber: false, mid: [UP], m: stone, plinth: stone, corners: false });
for (const x of [HX0, HX1]) for (const z of [HZ0, HZ1]) capped(x + (x < 0 ? -.18 : -.42), x + (x < 0 ? .42 : .18), z + (z < 0 ? -.18 : -.42), z + (z < 0 ? .42 : .18), 0, HH, brickD, .1); // a pier at each corner
gable('x', HX0, HX1, HZ0, HZ1, HH, 10, brick, { snow, o: .4 });
flat(I0, I1, J0, J1, floorMat, .012, 2);
for (const [x0, x1, z0, z1] of [[I0, I1, J0, J0 + MZ], [I0, I1, J1 - MZ, J1], [I0, I0 + MZ, J0 + MZ, J1 - MZ], [I1 - MZ, I1, J0 + MZ, J1 - MZ], [-1.2, 1.2, J0 + MZ, J1 - MZ]]) slab(x0, x1, z0, z1, UP - .25, UP, deck);
slab(HX0, I0, -5.7, -4.3, UP - .25, UP, deck); slab(I1, HX1, 5.3, 6.7, UP - .25, UP, deck); // the sills of the two doors upstairs
const SA = J0 + MZ, NA = J1 - MZ, WA = I0 + MZ, EA = I1 - MZ; // the walkway's inside edges
stairs('x', -4, -9.4, SA, SA + 1.3, 0, UP); slab(WA, -9.4, SA, SA + 1.3, UP - .25, UP, deck); stairRail('x', -4, -9.4, SA + 1.3, 0, UP);
stairs('x', 4, 9.4, NA - 1.3, NA, 0, UP); slab(9.4, EA, NA - 1.3, NA, UP - .25, UP, deck); stairRail('x', 4, 9.4, NA - 1.3, 0, UP);
railing(WA, SA + 1.3, WA, NA, UP); railing(WA, SA + 1.3, -9.4, SA + 1.3, UP, [false, false]);
railing(-9.4, SA, -1.2, SA, UP); railing(1.2, SA, EA, SA, UP, [true, false]);
railing(EA, SA, EA, NA - 1.3, UP); railing(9.4, NA - 1.3, EA, NA - 1.3, UP, [false, false]);
railing(WA, NA, -1.2, NA, UP, [false, true]); railing(1.2, NA, 9.4, NA, UP);
for (const e of [-1, 1]) railing(e * 1.2, SA, e * 1.2, NA, UP, [false, false]);
for (const [x, z] of [[WA + .15, SA + .15], [EA - .15, NA - .15], [WA + .15, NA - .15], [EA - .15, SA + .15], [-1.05, 1], [1.05, 1]]) slab(x - .13, x + .13, z - .13, z + .13, 0, UP - .25, beam); // what holds it up
sign('THE WORKS', 3.6, 0, 5.25, HZ1 + .1, 0, '#fff0c8', '#7a1e18'); // between the two middle windows
// two belts through the middle, a press over one and a painter over the other
const belts = [], toys = [];
function belt(x0, x1, z) {
  slab(x0, x1, z - .7, z + .7, 0, .8, iron); const top = live(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - .1, 1.2), beltTop)); top.rotation.x = -Math.PI / 2; top.position.set((x0 + x1) / 2, .812, z);
  const uv = top.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (x1 - x0)); add(top);
  for (const x of [x0 + .06, x1 - .06]) detail(cylZ(.3, 1.5, steel, x, .5, z));
  for (let k = 0; k < 4; k++) { // what's on it: a present, a ball, a block, a drum
    const t = live(detail([box(.4, .4, .4, GIFT[(k + belts.length) % 6]), new THREE.Mesh(pxSphere(.22, 10, 8), ballMat), box(.4, .4, .4, blockMat('ABCT'[k], '#c8302a')), new THREE.Mesh(pxCyl(.21, .21, .34, 12), drumMat)][k])); add(t); toys.push({ t, x0: x0 + .3, x1: x1 - .3, z, k: k / 4 });
  }
  belts.push(z);
}
belt(-9, -2.2, 1); belt(2.2, 9, 1);
slab(-10.9, -9, -.2, 2.2, 0, 2.6, P_GREEN); cylY(.5, .8, .7, steel, -9.95, 2.95, 1); slab(-10.6, -9.3, .35, 1.65, 2.6, 2.62, iron); // the hopper the toys come out of
slab(9, 10.9, -.2, 2.2, 0, 2.6, P_RED); onWall(piece(.06, .9, 1, glowMat, 8.98, 1.5, 1));
for (const z of [-.05, 2.05]) slab(-6.2, -5.8, z - .15, z + .15, 0, 3, steel);
slab(-6.5, -5.5, -.2, 2.2, 3, 3.34, P_BLUE);
const press = live(new THREE.Group()); press.position.set(-6, 0, 1); add(press); { const rod = box(.22, 1.3, .22, steel); rod.position.y = 2.35; press.add(rod); const head = box(.9, .22, .9, iron); head.position.y = 1.6; press.add(head); }
for (const z of [-.05, 2.05]) slab(5.8, 6.2, z - .15, z + .15, 0, 2.3, steel);
slab(5.5, 6.5, -.2, 2.2, 2.3, 2.7, P_TEAL);
const brushes = [-.5, 0, .5].map(dz => { const b = live(new THREE.Group()); b.position.set(6, 2.3, 1 + dz); add(b); for (const [c, a] of [[0xc8322c, 0], [0xf2f2f4, Math.PI / 2]]) { const s = box(.3, .5, .08, lam({ color: c })); s.position.y = -.25; s.rotation.y = a; b.add(s); } return b; });
// the big bear, blocks and presents waiting to go
{
  const bx = -6.2, bz = 5.2, put = (w, h, d, x, y, z, m = teddy) => { slab(bx + x - w / 2, bx + x + w / 2, bz + z - d / 2, bz + z + d / 2, y, y + h, m); };
  put(1.5, 1.5, 1.1, 0, 0, 0); put(1.15, 1.05, 1, 0, 1.5, 0); for (const e of [-1, 1]) { put(.36, .34, .2, e * .48, 2.5, 0); put(.44, .44, .9, e * .52, 0, -.9); put(.4, .95, .44, e * .95, .55, -.1); }
  onWall(piece(.5, .34, .1, cream, bx, 1.78, bz - .55)); onWall(piece(.16, .12, .06, black, bx, 1.86, bz - .62)); for (const e of [-1, 1]) onWall(piece(.12, .12, .05, black, bx + e * .26, 2.14, bz - .52));
  onWall(piece(.8, .8, .05, cream, bx, .75, bz - .57)); for (const e of [-1, 1]) onWall(piece(.3, .3, .05, cream, bx + e * .52, .22, bz - 1.37));
  onWall(piece(.34, .16, .12, scarf, bx, 1.5, bz - .58)); // its bow tie
}
toyBlock(5.6, -4.6, 1.2, 'A', '#c8302a'); toyBlock(6.9, -4.4, 1.2, 'B', '#2f8a4c'); toyBlock(6.2, -4.5, 1.2, 'C', '#3a6ec0', 1.2);
jackBox(-3.6, -1.7); drum(10.3, 4.4); robot(-11.6, 5.6, 1);
gift(-11.6, -2.6, 1.2, 1); gift(-11.9, -3.9, .9); gift(3.4, 5, 1.3, 1.1); gift(-9.5, 8.2, 1, .9, 1.3); gift(-10.8, 8.3, .8); gift(12.4, -5.6, 1, 1.3); gift(12.3, 7.6, .9);
for (const [x0, x1] of [[-7, -2.4], [2.4, 7]]) { slab(x0, x1, J0, J0 + .85, 0, .95, beam); for (let x = x0 + .5; x < x1; x += 1.1) detail(piece(.3, .22 + rnd() * .2, .3, [P_RED, P_GREEN, P_BLUE, gold][rnd() * 4 | 0], x, 1.06 + rnd() * .08, J0 + .42)); } // work benches
for (const x of [-9.3, -4.65, 0, 4.65, 9.3]) { // the roof's beams, lamps hanging from them
  piece(.3, .3, J1 - J0, beam, x, 6.8, 1); piece(.2, 2.72, .2, beam, x, 8.31, 1);
  if (x) for (const z of [-3.4, 5.4]) { piece(.04, .75, .04, iron, x, 6.28, z); piece(.6, .1, .6, iron, x, 5.92, z); piece(.4, .26, .4, glowMat, x, 5.74, z); }
}
lights(I0 + .1, 3.2, SA, I1 - .1, 3.2, SA); lights(I0 + .1, 3.2, NA, I1 - .1, 3.2, NA);

// --- the boiler house to the west: stairs up its side, its roof, and a pipe across to the works ---
const BX0 = -31, BX1 = -22, BZ0 = -10, BZ1 = 0, BR = 3.85;
{ const h = { e: [[-2, 1.6, 0, 2.5]], s: [[-26.5, 1.4, 1.2, 2.4]], w: [[-5, 1.4, 1.2, 2.4]] }; house(BX0, BX1, BZ0, BZ1, UP, brickD, h, { tr: false }); frame(BX0, BX1, BZ0, BZ1, 0, UP, h, { timber: false, m: stone, plinth: stone, corners: false }); }
slab(BX0 - .15, BX1 + .15, BZ0 - .15, BZ1 + .15, UP, UP + .11, stone); slab(BX0 - .15, BX1 + .15, BZ0 - .15, BZ1 + .15, UP + .11, BR, snow);
flat(BX0 + T, BX1 - T, BZ0 + T, BZ1 - T, stoneFloor, .012, 1);
stairs('x', -24.4, -30, BZ1 + .15, BZ1 + 1.45, 0, BR, deck); slab(BX0 - .15, -30, BZ1 + .15, BZ1 + 1.45, UP, BR, stone); stairRail('x', -24.4, -30, BZ1 + 1.45, 0, BR);
railing(BX0 - .08, BZ1 + 1.45, -30, BZ1 + 1.45, BR, [true, false]); railing(BX0 - .08, BZ1 + .2, BX0 - .08, BZ1 + 1.45, BR, [true, false]);
slab(-30.7, -28.4, -9.7, -7.2, 0, 2.7, iron); onWall(piece(.06, .8, 1.2, fireMat, -28.37, .9, -8.45));
{ // its plinth, riveted bands, the fire door standing open with its bars and ash pan, a steam dome and valve on top, the flue up through the roof
  slab(-30.82, -28.28, -9.82, -7.08, 0, .28, brickD); for (const y of [.5, 1.9, 2.5]) slab(-30.74, -28.36, -9.74, -7.16, y, y + .14, steel);
  for (const y of [.57, 1.97, 2.57]) for (const z of [-9.3, -8.7, -8.1, -7.5]) onWall(piece(.05, .06, .06, gold, -28.345, y, z)); // rivets
  onWall(piece(.07, .14, 1.48, steel, -28.36, 1.37, -8.45)); onWall(piece(.07, .14, 1.48, steel, -28.36, .43, -8.45)); for (const z of [-9.12, -7.78]) onWall(piece(.07, .8, .14, steel, -28.36, .9, z)); // the door's frame
  for (const z of [-8.9, -8.6, -8.3, -8]) onWall(piece(.04, .8, .05, black, -28.33, .9, z)); onWall(piece(.05, .16, 1.1, black, -28.37, .19, -8.45)); // fire bars, the ash pan under them
  slab(-28.34, -27.5, -7.8, -7.72, .46, 1.34, steel); onWall(piece(.1, .1, .1, gold, -27.62, .9, -7.66)); // the door, swung open
  { const dome = cylY(.5, .5, .5, steel, -29.3, 2.95, -7.75, 14); building.cover.push(dome); solid(-29.75, -28.85, -8.2, -7.3, 2.7, 3.2, 'metal', { round: .5 }); detail(cylY(.53, .53, .08, gold, -29.3, 2.78, -7.75, 14)); detail(cylY(.3, .5, .12, steel, -29.3, 3.26, -7.75, 14)); piece(.1, .22, .1, gold, -29.3, 3.42, -7.75); }
  slab(-30.4, -29.2, -9.4, -8.2, 2.7, UP, brickD); // the flue: the chimney comes down to it
  { const d = cylX(.2, .06, white, -28.37, 2.2, -7.62, 14); detail(d); detail(cylX(.24, .04, gold, -28.385, 2.2, -7.62, 14)); onWall(piece(.02, .16, .03, P_RED, -28.33, 2.26, -7.62)); onWall(piece(.05, .22, .66, gold, -28.37, 2.2, -8.6)); } // a gauge and its maker's plate
} slab(-30.5, -29.1, -9.5, -8.1, BR, 11, brickD); slab(-30.62, -28.98, -9.62, -7.98, 9.2, 9.9, caneBig); slab(-30.62, -28.98, -9.62, -7.98, 11, 11.25, stone); // the furnace and its chimney
for (const [x, z, w, h] of [[-23.4, -8.6, 1.6, .7], [-24.6, -9, 1.2, .45], [-23.2, -7.2, 1, .4]]) slab(x - w / 2, x + w / 2, z - w / 2, z + w / 2, 0, h, coal);
{ // the boiler against the north wall, the pipe coming in overhead and down to it, gauges, a bench of tools, the coal in its bin
  const tx = -28.2, tz = -1.25, tank = cylX(.85, 3.6, steel, tx, 1.25, tz, 16); building.cover.push(tank); solid(tx - 1.8, tx + 1.8, tz - .8, tz + .8, .3, 2.1, 'metal');
  for (const x of [tx - 1.5, tx, tx + 1.5]) detail(cylX(.88, .12, gold, x, 1.25, tz, 16)); for (const x of [tx - 1.2, tx + 1.2]) slab(x - .2, x + .2, tz - .7, tz + .7, 0, .5, brickD); // bands, and the saddles it sits on
  { const d = cylZ(.26, .06, white, tx + .6, 1.5, tz - .86, 14); detail(d); detail(cylZ(.3, .04, gold, tx + .6, 1.5, tz - .84, 14)); onWall(piece(.03, .2, .02, P_RED, tx + .6, 1.6, tz - .9)); } // a gauge on its face
  const up = cylY(.5, .5, 1.1, caneBig, -27.4, 2.6, tz, 16); building.cover.push(up); const along = cylZ(.5, 4.3, caneBig, -27.4, 3.1, -3.1, 16); building.cover.push(along); const inx = cylX(.5, 5.4, caneBig, -24.7, 3.1, -5, 16); building.cover.push(inx);
  solid(-27.9, -26.9, -5.4, tz + .5, 2.6, UP, 'metal'); solid(-27.9, BX1, -5.42, -4.58, 2.6, UP, 'metal');
  for (const [x, z] of [[-27.4, tz], [-27.4, -5]]) { const e = box(1.16, 1.16, 1.16, steel); e.position.set(x, 3.1, z); add(e); building.cover.push(e); } // the elbows
  const feed = cylZ(.16, 5.2, steel, -30.5, .7, -4.6, 10); building.cover.push(feed); solid(-30.66, -30.34, -7.2, -2, .54, .86, 'metal'); const fe = cylX(.16, 1.2, steel, -30.1, .7, -2, 10); building.cover.push(fe); detail(cylY(.24, .24, .06, P_RED, -30.5, .9, -5.9, 10)); // the feed from the furnace along the wall, a valve on it
  slab(-23, -22.3, -6.1, -3.4, 0, .95, beam); slab(-23.06, -22.3, -6.16, -3.34, .95, 1.02, deck); slab(-22.52, -22.3, -6, -3.5, 1.7, 1.78, deck); // a bench by the door and a shelf over it
  for (const [z, c, w] of [[-5.6, P_RED, .5], [-4.9, steel, .34], [-4.3, gold, .26], [-3.8, P_BLUE, .4]]) detail(piece(.16, .12, w, c, -22.65, 1.08, z)); for (const [z, c] of [[-5.6, steel], [-4.8, P_GREEN], [-3.9, P_RED]]) detail(piece(.16, .3, .24, c, -22.41, 1.93, z));
  for (const [a, b, c, d] of [[-25.5, -22.4, -6.5, -6.3], [-25.5, -25.3, -9, -6.5]]) slab(a, b, c, d, 0, .6, beam); { const sh = box(.1, 1.3, .1, beam); sh.position.set(-25.1, .66, -6.05); sh.rotation.x = -.25; add(sh); const bl = box(.34, .36, .05, steel); bl.position.set(-25.1, .2, -5.86); bl.rotation.x = -.25; add(bl); } // the bin's boards, a shovel against them
  stool(-23.7, -4.8); piece(.04, .8, .04, iron, -26.6, 3.2, -6.2); piece(.5, .08, .5, iron, -26.6, 2.82, -6.2); piece(.34, .24, .34, glowMat, -26.6, 2.66, -6.2);
  { const pl = new THREE.PointLight(0xff9a50, 7, 11, 1.4); pl.position.set(-27, 1.6, -7); add(pl); }
}
{ const p = cylX(.5, 8.3, caneBig, -18.15, 3.1, -5, 16); building.cover.push(p); solid(-22.05, HX0, -5.42, -4.58, 2.6, UP, 'metal'); // the pipe you can walk, from wall to wall
  for (const x of [-21.9, -14.12]) detail(cylX(.62, .2, steel, x, 3.1, -5, 16)); // a collar where it goes in
  for (const x of [-21.6, -18, -14.4]) detail(cylX(.58, .16, steel, x, 3.1, -5, 16));
  slab(-18.15, -17.85, -5.15, -4.85, 0, 2.6, steel); }
for (const [x, z, w, h] of [[-19.6, -11.6, 1.9, .9], [-18, -12.2, 1.3, .55], [-20.9, -12.3, 1, .4]]) slab(x - w / 2, x + w / 2, z - w / 2, z + w / 2, 0, h, coal); // the coal heap, a cart by it
slab(-17.3, -15.7, -11.3, -10.1, .35, 1.05, iron); slab(-17.2, -15.8, -11.2, -10.2, 1.05, 1.2, coal); for (const e of [-1, 1]) { const w = cylZ(.32, .1, iron, -16.5 + e * .5, .32, -11.36); meshSolids(w, 'metal'); const v = cylZ(.32, .1, iron, -16.5 + e * .5, .32, -10.04); meshSolids(v, 'metal'); }

// --- the loading dock to the east: a platform, a shed whose roof has a bridge to the works, and the train ---
const PX0 = 20, PX1 = 31, PZ0 = -12, PZ1 = 10, PY = 1.05;
slab(PX0, PX1, PZ0, PZ1, 0, PY, stone);
{ const drift = kitDecal({ map: snow.map }), line = kitDecal({ color: 0xe8c03a }); // snow blown over it, a line along the track
  for (const [x0, x1, z0, z1] of [[20, 23.5, -12, -9.4], [26.5, 30.4, -1.6, -.2], [20, 21, 2.6, 10], [27.75, 30.2, 8.6, 10], [24, 28.5, -7.2, -5.8], [20, 22.4, -5.2, -3.4]]) flat(x0, x1, z0, z1, drift, PY + .012, 2);
  flat(PX1 - .5, PX1 - .32, PZ0, PZ1, line, PY + .014, 1); }
stairs('x', 18.2, PX0, -4, 2, 0, PY, stone); ramp('z', -16, PZ0, 22, 24.5, 0, PY, deck, .18);
{ const h = { s: [[24.3, 2.2, PY, 3]], e: [[4, 2.2, PY, 3]], w: [[4, 1.4, 2, 2.9]] }; house(21, 27.6, 0, 8, 2.35, W_GREEN, h, { base: PY, tr: false }); frame(21, 27.6, 0, 8, PY, PY + 2.35, h, { timber: false, m: W_CREAM, corners: true }); }
slab(20.85, 27.75, -.15, 8.15, 3.4, 3.48, deck); slab(20.85, 27.75, -.15, 8.15, 3.48, UP, snow);
stairs('x', 27.6, 22.8, 8.15, 9.35, PY, UP); slab(20.85, 22.8, 8.15, 9.35, UP - .2, UP, deck); stairRail('x', 27.6, 22.8, 9.35, PY, UP);
railing(20.92, 9.35, 22.8, 9.35, UP, [true, false]); railing(20.92, 8.2, 20.92, 9.35, UP, [true, false]);
slab(HX1, 20.85, 5.3, 6.7, UP - .16, UP, deck); for (const z of [5.3, 6.7]) railing(HX1 + .1, z, 20.8, z, UP); for (const z of [5.42, 6.58]) slab(17.3, 17.5, z - .1, z + .1, 0, UP - .16, beam); // the bridge
sign('LOADING', 3, 24.3, 4.14, -.05, Math.PI, '#fff0c8', '#1e4a30'); for (const x of [23, 25.6]) slab(x - .06, x + .06, -.11, .01, UP, 3.74, beam); // up on the roof's edge, over the door
gift(22, 6.9, 1.1, .9, 1.1, PY); gift(23.2, 7, .9, .9, .9, PY); gift(22.3, 6.9, .8, .7, .8, PY + .9); gift(26.8, 1.2, 1, 1.1, 1, PY); gift(26.7, 6.8, 1.1, .8, 1.1, PY);
gift(29.4, -9.6, 1.3, 1.1, 1.3, PY); gift(29.6, -8.3, 1, .9, 1, PY); toyBlock(21.3, -10.4, 1.2, 'O', '#c8302a', PY); toyBlock(21.3, -9.1, 1.2, 'K', '#2f8a4c', PY); gift(29.2, 7.6, 1.2, 1.3, 1.2, PY);
// the track and the train: three wagons you can walk onto from the platform, the engine at the north end
const TX = 32.3;
slab(PX1, 33.6, -36, 36, 0, .1, surf(lam({ map: tex(g => { noise(g, [150, 150, 160], 20); g.fillStyle = '#5a4030'; g.fillRect(0, 5, 16, 5); }) }), 'stone'));
for (const e of [-1, 1]) { const r = piece(.12, .12, 72, steel, TX + e * .7, .16, 0); void r; }
function wagon(z0, z1, m) {
  slab(PX1, 33.6, z0, z1, .62, PY, deck); slab(PX1 + .15, 33.45, z0 + .2, z1 - .2, .34, .62, m);
  slab(33.5, 33.6, z0, z1, PY, PY + .5, m); for (const z of [z0, z1 - .1]) slab(PX1 + 1.4, 33.6, z, z + .1, PY, PY + .5, m);
  for (const e of [-1, 1]) for (const z of [z0 + .8, z1 - .8]) meshSolids(cylX(.3, .12, iron, TX + e * .7, .46, z), 'metal');
  piece(.16, .14, .7, iron, TX, .5, z1 + .3);
}
wagon(-11.6, -7.2, P_RED); wagon(-6.6, -2.2, P_GREEN); wagon(-1.6, 2.8, P_BLUE);
gift(32.6, -10.6, 1.2, 1, 1.2, PY); gift(32.7, -9.3, 1, .8, 1, PY); gift(32.5, -10.4, .8, .7, .8, PY + 1); toyBlock(32.7, -4.9, 1.3, 'J', '#e0a020', PY); gift(32.6, -3.4, 1.1, 1.2, 1.1, PY);
for (const [x, z, w, h] of [[32.5, .2, 1.5, .5], [32.7, 1.5, 1.2, .35], [32.2, -.8, 1, .3]]) slab(x - w / 2, x + w / 2, z - w / 2, z + w / 2, PY, PY + h, coal);
{ // the engine
  slab(PX1 + .15, 33.45, 3.6, 10.5, .5, .95, P_RED); slab(PX1 + .1, 33.5, 3.7, 5.9, .95, 2.9, P_RED); slab(PX1 - .1, 33.7, 3.5, 6.1, 2.9, 3.02, P_GREEN); slab(PX1 - .1, 33.7, 3.5, 6.1, 3.02, 3.14, snow);
  for (const x of [PX1 + .09, 33.51]) onWall(piece(.04, .8, 1.1, glass, x, 2.2, 4.8));
  const b = cylZ(.85, 4.4, P_GREEN, TX, 1.8, 8.1, 16); building.cover.push(b); solid(TX - .7, TX + .7, 5.9, 10.3, .95, 2.65, 'metal');
  for (const z of [6.4, 8.1, 9.8]) detail(cylZ(.88, .14, gold, TX, 1.8, z, 16));
  meshSolids(cylY(.24, .24, .9, iron, TX, 3.05, 9.5), 'metal'); meshSolids(cylY(.4, .26, .3, gold, TX, 3.6, 9.5), 'metal'); meshSolids(cylY(.3, .34, .4, gold, TX, 2.8, 7.4), 'metal');
  piece(1.9, .5, .5, iron, TX, .6, 10.75); piece(1.3, .3, .4, iron, TX, .4, 11.15);
  for (const e of [-1, 1]) { for (const z of [6.6, 8, 9.4]) meshSolids(cylX(.5, .14, iron, TX + e * .82, .66, z, 16), 'metal'); meshSolids(cylX(.34, .14, iron, TX + e * .82, .5, 4.6), 'metal'); piece(.08, .1, 3, gold, TX + e * .9, .66, 8); }
  onWall(piece(.3, .3, .06, glowMat, TX, 1.8, 10.33));
}
// a gantry over the middle wagon, a present on its hook
for (const x of [30.2, 34.4]) slab(x - .16, x + .16, -4.56, -4.24, x < 31 ? PY : 0, 5.6, steel);
piece(4.7, .3, .3, steel, 32.3, 5.75, -4.4);
const hook = live(new THREE.Group()); hook.position.set(TX, 5.6, -4.4); add(hook); { const c = box(.05, 1.5, .05, iron); c.position.y = -.75; hook.add(c); const p = box(.9, .8, .9, GIFT[4]); p.position.y = -1.9; hook.add(p); }
// the tunnels the track comes out of
for (const e of [-1, 1]) { const z = e * 35.2; for (const x of [PX1 - .5, 34.1]) slab(x - .4, x + .4, z - .5, z + .5, 0, 3.6, stone); capped(PX1 - .9, 34.5, z - .6, z + .6, 3.6, 4.5, stone); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.6), kitDecal({ color: 0x0c0e12 })); m.position.set(TX, 1.8, z - e * .4); m.rotation.y = e > 0 ? Math.PI : 0; add(m); }

// --- the sleigh run to the south: a ramp up to the launch deck, the sleigh shed beside it ---
ramp('x', -12, 4, -27.5, -24.5, 0, 4.8, deck, .2);
for (const z of [-27.5, -24.5]) stairRail('x', -12, 4, z, 0, 4.8);
for (const [x, y] of [[-5.6, 1.72], [.4, 3.5]]) for (const z of [-27.3, -24.7]) slab(x - .12, x + .12, z - .12, z + .12, 0, y, beam);
slab(4, 11, -29, -23, 4.6, 4.8, deck); for (const x of [4.2, 10.8]) for (const z of [-28.8, -23.2]) slab(x - .16, x + .16, z - .16, z + .16, 0, 4.6, beam);
railing(4, -29, 11, -29, 4.8); railing(4, -23, 11, -23, 4.8); railing(4, -29, 4, -27.5, 4.8, [false, false]); railing(4, -24.5, 4, -23, 4.8, [false, false]);
{ const run = 16, rise = 4.8, L = Math.hypot(run, rise), ang = Math.atan2(rise, run);
  for (const z of [-26.75, -25.25]) { // the two rails its runners ride: up the ramp, along the deck, up the kicker
    const r = box(L, .07, .1, gold); r.position.set(-4, 2.4 + .05, z); r.rotation.z = ang; add(r); slab(4, 9.5, z - .05, z + .05, 4.8, 4.87, gold);
    const k = box(Math.hypot(1.5, .5), .07, .1, gold); k.position.set(10.25, 5.1, z); k.rotation.z = Math.atan2(.5, 1.5); add(k);
  }
  ramp('x', 9.5, 11, -27.1, -24.9, 4.8, 5.3, deck, .14); slab(10.8, 11, -27.1, -24.9, 4.8, 5.16, beam); // the kicker: off the end and over the shed
  for (const z of [-27.5, -24.5]) lights(-12, 1.02, z, 4, 5.82, z); // lights up both rails
  for (const z of [-28.1, -23.9]) { slab(-12.52, -12.28, z - .12, z + .12, 0, 3.5, cane); slab(-12.56, -12.24, z - .16, z + .16, 0, .3, stone); } // the gate: two striped posts, a beam, the name standing on it
  slab(-12.55, -12.25, -28.3, -23.7, 3.5, 3.7, beam); sign('SLEIGH RUN', 3.4, -12.4, 3.7 + 3.4 * 9 / 43 / 2 + .06, -26, -Math.PI / 2, '#fff0c8', '#7a1e18', true);
  slab(10.74, 10.86, -23.14, -23.02, 4.8, 7.6, beam); { const f = box(.04, .46, .9, P_RED); f.position.set(10.8, 7.3, -22.56); add(f); } // a flag for the wind
}
const GX0 = 14, GX1 = 30, GZ0 = -33, GZ1 = -23;
wall('z', GX0, GX0 + T, GZ0, GZ1, 0, 4, [[-28, 1.6, 1.2, 2.6]], W_RED); wall('z', GX1 - T, GX1, GZ0, GZ1, 0, 4, [[-28, 1.6, 1.2, 2.6]], W_RED);
wall('x', GZ0, GZ0 + T, GX0 + T, GX1 - T, 0, 4, [[18, 1.6, 1.2, 2.6], [26, 1.6, 1.2, 2.6]], W_RED);
slab(GX0, GX1, GZ1 - T, GZ1, 3.4, 4, beam); slab(21.85, 22.15, GZ1 - T, GZ1, 0, 3.4, beam);
gable('x', GX0, GX1, GZ0, GZ1, 4, 6.2, W_RED, { snow }); frame(GX0, GX1, GZ0, GZ1, 0, 4, { w: [[-28, 1.6, 1.2, 2.6]], e: [[-28, 1.6, 1.2, 2.6]], s: [[18, 1.6, 1.2, 2.6], [26, 1.6, 1.2, 2.6]] }, { timber: false, m: W_CREAM, corners: true });
flat(GX0 + T, GX1 - T, GZ0 + T, GZ1, floorMat, .012, 2);
{ // the sleigh, loaded
  const sx = 22.6, sz = -28.6, put = (w, h, d, m, x, y, z) => piece(w, h, d, m, sx + x, y, sz + z);
  for (const e of [-1, 1]) { put(4.6, .1, .12, gold, 0, .1, e * .8); put(.12, .5, .12, gold, -1.3, .4, e * .8); put(.12, .5, .12, gold, 1.3, .4, e * .8); const c = box(.9, .1, .12, gold); c.position.set(sx - 2.6, .42, sz + e * .8); c.rotation.z = -.8; add(c); meshSolids(c, 'metal'); }
  slab(sx - 1.9, sx + 1.9, sz - .9, sz + .9, .6, 1, P_RED); slab(sx - 1.9, sx + 1.9, sz - .9, sz - .76, 1, 1.7, P_RED); slab(sx - 1.9, sx + 1.9, sz + .76, sz + .9, 1, 1.7, P_RED);
  slab(sx + 1.76, sx + 1.9, sz - .76, sz + .76, 1, 2.3, P_RED); slab(sx - 1.9, sx - 1.76, sz - .76, sz + .76, 1, 1.5, P_RED);
  slab(sx - .9, sx - .3, sz - .76, sz + .76, 1, 1.45, P_GREEN); // the seat
  slab(sx + .2, sx + 1.7, sz - .7, sz + .7, 1, 2.1, W_GREEN); slab(sx + .45, sx + 1.45, sz - .5, sz + .5, 2.1, 2.5, W_GREEN); onWall(piece(1.52, .1, 1.42, gold, sx + .95, 2, sz)); // the sack
  for (const e of [-1, 1]) onWall(piece(3.84, .08, .03, gold, sx, 1.66, sz + e * .915));
}
slab(GX0 + T, 17.4, GZ0 + T, GZ0 + 1.2, 0, .95, beam); slab(24.6, 28.6, GZ0 + T, GZ0 + 1.2, 0, .95, beam); gift(27.6, -24.6, 1.2, 1.1); gift(28.6, -25.6, .9); gift(15.4, -24.5, 1, 1.2); toyBlock(16.2, -30.6, 1.2, 'S', '#c8302a');
lights(GX0, 3.9, GZ1 + .06, GX1, 3.9, GZ1 + .06, .3);

// --- the mail room and the clock tower to the north-east ---
const MH = {
  s: [[17.5, 2, 0, 2.6], [14, 1.4, 1.2, 2.4], [21, 1.4, 1.2, 2.4], [14, 1.4, 4.7, 5.9], [17.5, 1.4, 4.7, 5.9], [21, 1.4, 4.7, 5.9]],
  w: [[22.6, 1.6, 0, 2.6], [20.4, 1.4, 4.7, 5.9], [25, 1.4, 4.7, 5.9]], n: [[15, 1.4, 4.7, 5.9], [20, 1.4, 4.7, 5.9]], e: [[25.6, 1.2, UP, 5.8]],
};
house(12, 23, 18, 28, 7.2, W_CREAM, MH, { tr: false }); frame(12, 23, 18, 28, 0, 7.2, MH, { timber: false, mid: [UP], m: W_BROWN, plinth: stone, corners: true });
upper(12 + T, 23 - T, 18 + T, 28 - T, UP, [12 + T, 19.4, 26.4, 28 - T]); stairs('x', 14, 19.4, 26.4, 28 - T, 0, UP); railing(12 + T, 26.4, 19.4, 26.4, UP);
gable('x', 12, 23, 18, 28, 7.2, 9.6, W_CREAM, { snow });
flat(12 + T, 23 - T, 18 + T, 28 - T, floorMat, .012, 2); slab(23 - T, 23, 25, 26.2, UP - .25, UP, deck);
sign('MAIL', 2.2, 17.5, 3.5, 17.9, Math.PI, '#fff0c8', '#7a1e18');
slab(13.4, 17, 20.2, 21.2, 0, 1, beam); slab(12.3, 12.75, 18.5, 21.5, 0, 2.3, surf(lam({ map: tex(g => { g.fillStyle = '#4a3020'; g.fillRect(0, 0, 16, 16); for (const y of [0, 4, 8, 12]) for (const x of [0, 4, 8, 12]) { g.fillStyle = Math.random() < .7 ? '#f0e8d8' : '#c8302a'; g.fillRect(x + 1, y + 1, 3, 3); } }) }), 'wood')); // the sorting desk, pigeonholes
for (const [x, z, w, h] of [[20.6, 20, 1.1, .9], [21.5, 21, .9, .7], [14.4, 24.6, 1, .8], [20.4, 24.2, 1.2, 1]]) slab(x - w / 2, x + w / 2, z - w / 2, z + w / 2, 0, h, W_BROWN); // sacks of letters
slab(13.4, 15.4, 19.2, 20.4, UP, UP + .9, beam); gift(21.4, 19.6, 1.1, 1, 1.1, UP); gift(21.6, 20.8, .8, .8, .8, UP);
// the tower: a brick shaft, stairs up its outside from the mail room's upstairs door, a look-out under its roof
const CX0 = 23, CX1 = 28, CZ0 = 20, CZ1 = 25, LO = 7.2;
slab(CX0, CX1, CZ0, CZ1, 0, 7, brick); slab(CX0 - .2, CX1, CZ0 - .2, CZ1, 7, LO, stone);
slab(23, 24.2, CZ1, 26.2, UP - .2, UP, deck); stairs('x', 24.2, 28, CZ1, 26.2, UP, 5.4); slab(28, 29.2, CZ1, 26.2, 5.2, 5.4, deck); stairs('z', CZ1, 21.8, 28, 29.2, 5.4, LO); slab(28, 29.2, 20.4, 21.8, 7, LO, deck);
railing(23.06, 26.2, 24.2, 26.2, UP, [true, false]); stairRail('x', 24.2, 28, 26.2, UP, 5.4); railing(28, 26.2, 29.2, 26.2, 5.4, [false, true]); railing(29.2, 26.2, 29.2, CZ1, 5.4, [false, false]);
stairRail('z', CZ1, 21.8, 29.2, 5.4, LO); railing(29.2, 21.8, 29.2, 20.4, LO, [false, true]); railing(29.2, 20.4, 28.06, 20.4, LO, [false, false]);
slab(28.9, 29.2, 25.9, 26.2, 0, 5.2, beam); slab(28.9, 29.2, 20.4, 20.7, 0, 7, beam);
for (const [x, z] of [[CX0, CZ0], [CX1 - .5, CZ0], [CX0, CZ1 - .5], [CX1 - .5, CZ1 - .5]]) slab(x, x + .5, z, z + .5, LO, 9.6, brick);
slab(CX0 + .5, CX1 - .5, CZ0, CZ0 + .25, LO, 8.1, brick); slab(CX0 + .5, CX1 - .5, CZ1 - .25, CZ1, LO, 8.1, brick); slab(CX0, CX0 + .25, CZ0 + .5, CZ1 - .5, LO, 8.1, brick); slab(CX1 - .25, CX1, 21.7, CZ1 - .5, LO, 8.1, brick);
slab(CX0 - .3, CX1 + .3, CZ0 - .3, CZ1 + .3, 9.6, 9.8, stone);
{ const c = new THREE.Mesh(pxCone(2.8 * Math.SQRT2, 3, 4), snow); c.rotation.y = Math.PI / 4; c.position.set(25.5, 11.3, 22.5); add(c); building.cover.push(c);
  solid(22.7, 28.3, 19.7, 25.3, 9.8, 12.8, 'snow', { peak: { x: 25.5, z: 22.5, rx: 2.8, rz: 2.8, edge: 9.8 } }); piece(.14, .9, .14, gold, 25.5, 13.2, 22.5); piece(.44, .44, .1, gold, 25.5, 13.75, 22.5); }
{ const face = kitDecal({ map: (() => { const t = tex(g => { g.fillStyle = '#7a1e18'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f4ecd8'; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 7) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#2a2a30'; for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]]) g.fillRect(x, y, 2, 2); g.fillRect(7, 4, 1, 4); g.fillRect(8, 7, 4, 1); g.fillStyle = '#c8a030'; g.fillRect(7, 7, 2, 2); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })() });
  for (const [x, z, ry] of [[25.5, CZ0 - .01, Math.PI]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), face); m.position.set(x, 5.2, z); m.rotation.y = ry; add(m); } }

// --- the stables to the north-west and their paddock ---
{ const h = { s: [[-25, 4, 0, 3]], e: [[24, 1.4, 1.2, 2.4]], w: [[24, 1.4, 1.2, 2.4]], n: [[-28, 1.4, 1.2, 2.4], [-22, 1.4, 1.2, 2.4]] }; house(-31, -19, 19, 29, 3.4, W_BROWN, h, { tr: false }); frame(-31, -19, 19, 29, 0, 3.4, h, { timber: false, m: beam, plinth: stone, corners: true }); }
gable('x', -31, -19, 19, 29, 3.4, 5.6, W_BROWN, { snow });
flat(-31 + T, -19 - T, 19 + T, 29 - T, strawFloor, .012, 2);
for (const x of [-27.1, -22.9]) slab(x - .08, x + .08, 24.4, 29 - T, 0, 1.4, beam);
for (const [x, z] of [[-30, 20.2], [-29.9, 21.2], [-19.9, 20.3]]) slab(x - .55, x + .55, z - .4, z + .4, 0, .8, hay); slab(-30.45, -29.55, 20.3, 21.1, .8, 1.6, hay);
slab(-25.9, -24.1, 28, 28.6, 0, .6, beam); reindeer(-29.2, 26.6, 2); reindeer(-21, 26.4, 2, false);
railing(-31, 10.5, -19, 10.5, 0, [true, true], 1.1); railing(-19, 10.5, -19, 13.4, 0, [false, true], 1.1); railing(-19, 16, -19, 19, 0, [true, false], 1.1); railing(-31, 10.5, -31, 19, 0, [false, false], 1.1);
reindeer(-24.4, 13.4, 1); reindeer(-28.2, 16, 0, false); slab(-30.4, -29, 11.2, 12, 0, .8, hay);
sign('STABLES', 3.4, -25, 3.9, 18.96, Math.PI, '#fff0c8', '#4a2c1a');

// --- the yard to the north: the tree, presents under it, a snowman or two ---
{
  const tx = 0, tz = 24;
  slab(tx - .5, tx + .5, tz - .5, tz + .5, 0, 1.6, barkMat);
  [6.4, 5, 3.6, 2.4, 1.2].forEach((w, i) => {
    const y = 1.6 + i * 1.4; capped(tx - w / 2, tx + w / 2, tz - w / 2, tz + w / 2, y, y + 1.4, needle);
    for (const e of [-1, 1]) { lights(tx - w / 2, y + .5, tz + e * (w / 2 + .05), tx + w / 2, y + .5, tz + e * (w / 2 + .05)); lights(tx + e * (w / 2 + .05), y + .5, tz - w / 2, tx + e * (w / 2 + .05), y + .5, tz + w / 2); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + i, b = detail(box(.26, .26, .26, [P_RED, gold, P_BLUE, P_TEAL][(k + i) % 4])); b.position.set(tx + Math.cos(a) * w * .36, y + .95, tz + (k % 2 ? 1 : -1) * (w / 2 + .1)); add(b); }
  });
  star(tx, 8.6 + 4.5 * .11, tz, .11);
  solid(tx - .45, tx + .45, tz - .1, tz + .1, 8.6, 9.6, 'metal');
  gift(-2.6, 19.6, 1.3, 1.1); gift(-1.2, 19.9, .9); gift(2.4, 19.8, 1.1, 1.3); gift(3.6, 20.4, .8, .7); gift(-4.2, 22.4, 1, .9, 1.2); gift(4.2, 23.6, 1.2, 1); gift(3.9, 22.2, .8); gift(-3.9, 25.8, 1.1, 1.2); gift(2.2, 28.2, 1.3, 1, 1); gift(-1.6, 28.3, .9);
}
snowman(-8.5, 26.5, -.6); snowman(9, 20.5, .5); snowman(-15.5, -18.5, .9);
function drum(x, z, y0 = 0, r = .55) {
  const b = cylY(r, r, r * 1.3, drumMat, x, y0 + r * .65, z, 14); building.cover.push(b); solid(x - r * .92, x + r * .92, z - r * .92, z + r * .92, y0, y0 + r * 1.3, 'wood', { round: r });
  for (const y of [.08, 1.22]) detail(cylY(r + .03, r + .03, r * .14, gold, x, y0 + r * y, z, 14)); detail(cylY(r - .04, r - .04, .04, cream, x, y0 + r * 1.31, z, 14));
}
function ball(x, z, r = .5, y0 = 0) { const b = new THREE.Mesh(pxSphere(r, 12, 9), ballMat); b.position.set(x, y0 + r, z); b.rotation.y = rnd() * 6; add(b); building.cover.push(b); solid(x - r * .8, x + r * .8, z - r * .8, z + r * .8, y0, y0 + r * 1.9, 'wood', { round: r }); }
function rocker(x, z, q, c = white) { // a rocking horse, facing +z before its quarter turns
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = q * Math.PI / 2; add(g);
  const put = (w, h, d, m, px, py, pz, hit = true) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (hit) { meshSolids(b, 'wood'); building.cover.push(b); } return b; };
  for (const e of [-1, 1]) { put(.1, .12, 1.5, P_RED, e * .28, .06, 0); put(.1, .14, .3, P_RED, e * .28, .18, .86); put(.1, .14, .3, P_RED, e * .28, .18, -.86); for (const pz of [-.38, .38]) put(.12, .6, .12, c, e * .2, .42, pz); }
  put(.46, .46, 1.05, c, 0, .92, 0); put(.3, .56, .3, c, 0, 1.36, .44); put(.3, .28, .46, c, 0, 1.66, .62); put(.5, .1, .4, P_BLUE, 0, 1.19, -.05, false); put(.1, .4, .08, furD, 0, 1.4, .26, false); put(.1, .36, .1, furD, 0, .9, -.58, false);
  for (const e of [-1, 1]) put(.06, .06, .04, black, e * .1, 1.72, .86, false);
}
function toyTrain(x, z, q) { // an engine and two trucks, running +z before its quarter turns
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = q * Math.PI / 2; add(g);
  const put = (w, h, d, m, px, py, pz, hit = true) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (hit) { meshSolids(b, 'wood'); building.cover.push(b); } return b; };
  const wheel = (px, pz) => { const w = new THREE.Mesh(pxCyl(.14, .14, .08, 10), black); w.rotation.z = Math.PI / 2; w.position.set(px, .14, pz); g.add(w); };
  put(.6, .14, 1.2, P_RED, 0, .3, 1.3); put(.5, .4, .7, P_GREEN, 0, .57, 1.5); put(.56, .6, .44, P_RED, 0, .67, .92); put(.6, .06, .5, gold, 0, 1, .92, false); put(.16, .3, .16, black, 0, .92, 1.66); put(.22, .08, .22, gold, 0, 1.1, 1.66, false);
  for (const [pz, m, load] of [[0, P_BLUE, GIFT[1]], [-1.2, P_TEAL, GIFT[3]]]) { put(.6, .14, 1, m, 0, .3, pz); put(.6, .24, .08, m, 0, .49, pz + .46); put(.6, .24, .08, m, 0, .49, pz - .46); for (const e of [-1, 1]) put(.08, .24, 1, m, e * .26, .49, pz); put(.4, .34, .5, load, 0, .54, pz); put(.08, .06, .22, iron, 0, .3, pz + .6, false); }
  for (const pz of [1.72, 1.2, .82, .3, -.3, -.9, -1.5]) for (const e of [-1, 1]) wheel(e * .32, pz);
}
function jackBox(x, z, q = 0) { // sprung, its lid thrown back
  slab(x - .5, x + .5, z - .5, z + .5, 0, 1, jackMat);
  const g = new THREE.Group(); g.position.set(x, 1, z); g.rotation.y = q * Math.PI / 2; add(g);
  const put = (w, h, d, m, px, py, pz, hit = true) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (hit) { meshSolids(b, 'wood'); building.cover.push(b); } return b; };
  const lid = put(1, .08, 1, jackMat, 0, .46, -.58); lid.rotation.x = -1.35; for (let k = 0; k < 5; k++) put(.3 - (k % 2) * .08, .08, .3 - (k % 2) * .08, steel, 0, .06 + k * .14, 0, false);
  put(.5, .5, .46, cream, 0, 1, 0); put(.56, .14, .5, P_RED, 0, .72, 0, false); put(.5, .12, .48, P_GREEN, 0, 1.31, 0, false); put(.3, .3, .3, P_RED, 0, 1.5, 0, false); put(.14, .14, .14, gold, 0, 1.72, 0, false);
  put(.12, .12, .06, P_RED, 0, .98, .25, false); for (const e of [-1, 1]) put(.07, .07, .04, black, e * .12, 1.1, .24, false);
}
function robot(x, z, q = 0) { // a tin robot with a key in its back
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = q * Math.PI / 2; add(g);
  const put = (w, h, d, m, px, py, pz, hit = true) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); if (hit) { meshSolids(b, 'metal'); building.cover.push(b); } return b; };
  for (const e of [-1, 1]) { put(.26, .56, .3, steel, e * .2, .28, 0); put(.3, .12, .4, P_BLUE, e * .2, .06, .05, false); put(.18, .7, .2, steel, e * .52, 1.05, 0); put(.2, .18, .22, P_RED, e * .52, .64, 0, false); }
  put(.74, .8, .46, P_TEAL, 0, .96, 0); put(.5, .46, .44, steel, 0, 1.6, 0); put(.3, .2, .03, glowMat, 0, 1.04, .24, false); put(.06, .22, .06, iron, 0, 1.94, 0, false); put(.12, .12, .12, P_RED, 0, 2.1, 0, false);
  for (const e of [-1, 1]) put(.1, .1, .04, glowMat, e * .12, 1.66, .23, false); put(.24, .05, .03, black, 0, 1.48, .23, false); put(.06, .06, .2, gold, 0, 1, -.32, false); put(.3, .2, .05, gold, 0, 1, -.44, false);
}
function rings(x, z) { slab(x - .5, x + .5, z - .5, z + .5, 0, .14, beam); slab(x - .06, x + .06, z - .06, z + .06, .14, 1.5, beam); [[.46, P_RED], [.39, gold], [.32, P_GREEN], [.25, P_BLUE], [.18, P_TEAL]].forEach(([r, m], k) => { const c = cylY(r, r, .22, m, x, .26 + k * .23, z, 12); building.cover.push(c); solid(x - r, x + r, z - r, z + r, .15 + k * .23, .37 + k * .23, 'wood', { round: r }); }); }
rocker(13.6, 12.3, 3); drum(-13.6, 12.6); toyTrain(-7.4, 18.4, 1); ball(15.3, -10.5); jackBox(5.6, -21.8, 2); robot(-15.2, -22.6, 1); rings(17.4, 12.5); ball(-19.6, 7.6, .4); drum(29.4, -5.4, PY, .45); ball(28.6, -1.2, .4, PY); rocker(-12.8, 18.6, 1, cream);
function soldier(x, z, coat) { // a nutcracker as tall as the door, facing north
  capped(x - .5, x + .5, z - .4, z + .4, 0, .3, stone, .06);
  for (const e of [-1, 1]) { slab(x + e * .2 - .15, x + e * .2 + .15, z - .17, z + .17, .3, .62, black); slab(x + e * .2 - .13, x + e * .2 + .13, z - .14, z + .14, .62, 1.5, white); slab(x + e * .5 - .1, x + e * .5 + .1, z - .12, z + .12, 1.55, 2.4, coat); onWall(piece(.2, .14, .24, white, x + e * .5, 1.48, z)); }
  slab(x - .4, x + .4, z - .22, z + .22, 1.5, 2.45, coat); slab(x - .26, x + .26, z - .24, z + .24, 2.45, 2.95, cream); slab(x - .28, x + .28, z - .26, z + .26, 2.95, 3.5, black); slab(x - .3, x + .3, z - .28, z + .28, 2.95, 3.06, gold);
  onWall(piece(.82, .12, .46, gold, x, 1.66, z)); for (const y of [1.9, 2.1, 2.3]) onWall(piece(.1, .1, .04, gold, x, y, z + .23)); onWall(piece(.3, .26, .06, white, x, 2.5, z + .25)); onWall(piece(.34, .08, .05, black, x, 2.7, z + .25));
  for (const e of [-1, 1]) onWall(piece(.07, .07, .04, black, x + e * .11, 2.82, z + .25));
}
soldier(-3.7, 10.75, P_RED); soldier(3.7, 10.75, P_BLUE);
barrel(-12.6, 10.5); crate(-11.5, 10.6, .9); barrel(12.5, 10.5); crate(-12.4, -8.6, .9); crate(-11.5, -8.5, .7); barrel(3, -8.5); barrel(3.8, -8.6); logs(-31.4, -7.5, 'z', 2);
postbox(19.3, 17.5); crate(13.2, 17.45, .8); barrel(-18.5, 20.2); sled(-18.3, 23.4, 0); crate(13.4, -26, .9); barrel(13.45, -27.2); barrel(20.7, -6.6, PY); crate(20.8, -7.7, .8, PY); sled(9.6, 12.2, 1); logs(-18.4, 26.6, 'z', 2);
toyBlock(8.2, 13.6, 1.2, 'X', '#3a6ec0'); toyBlock(9.5, 13.8, 1.2, 'M', '#c8302a'); toyBlock(8.9, 13.7, 1.2, 'A', '#e0a020', 1.2); toyBlock(-9.4, 14.6, 1.2, 'S', '#2f8a4c'); gift(-8.1, 14.4, 1, 1.2);
toyBlock(-17.6, 5.2, 1.2, 'E', '#c8302a'); toyBlock(-18.4, 6.5, 1.2, 'L', '#3a6ec0'); toyBlock(-17.9, 5.8, 1.2, 'F', '#e0a020', 1.2); gift(16.8, -6.4, 1.2, 1); gift(17.2, 9.6, 1, 1.3); toyBlock(16.4, -7.7, 1.1, 'N', '#2f8a4c');

// --- the yard to the south: a snow fort, more blocks; the pond and the elves' cottages in the corner ---
capped(.5, 6.5, -19.3, -18.6, 0, 1, snow, .1); capped(.5, 1.2, -18.6, -14.6, 0, 1, snow, .1); capped(5.8, 6.5, -18.6, -14.6, 0, 1, snow, .1);
for (const [x, z] of [[2.2, -17.9], [2.5, -17.9], [2.35, -17.65], [4.6, -17.8]]) { const b = detail(box(.24, .24, .24, snow)); b.position.set(x, x === 2.35 ? .34 : .12, z); add(b); }
toyBlock(-8.4, -13.4, 1.2, 'P', '#8a3aa0'); toyBlock(-7.1, -13.7, 1.2, 'L', '#c8302a'); toyBlock(-7.8, -13.5, 1.2, 'A', '#2f8a4c', 1.2); toyBlock(10.6, -14.2, 1.2, 'Y', '#3a6ec0'); gift(11.9, -14.6, 1, 1.2); gift(9.8, -19.6, 1.3, 1.1); toyBlock(-13.8, -30.6, 1.2, 'G', '#e0a020'); gift(-3, -31.4, 1.2, 1); gift(-1.7, -31.2, .9);
{ const p = new THREE.Mesh(pxDisc(5.4, 0, .3, 3.6), ice); p.rotation.x = -Math.PI / 2; p.position.set(-20.5, .014, -15.5); add(p);
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + .3, w = 1 + rnd() * .8; const x = -20.5 + Math.cos(a) * 5.9, z = -15.5 + Math.sin(a) * 4.1; slab(x - w / 2, x + w / 2, z - w / 2, z + w / 2, 0, .22 + rnd() * .2, snow); } }
function cottage(x0, x1, z0, z1, m, ax, front) { // an elf's cottage: too small to go in
  slab(x0, x1, z0, z1, 0, 2.5, m); gable(ax, x0, x1, z0, z1, 2.5, 4.2, m, { snow, o: .35 }); 
  const [fx, fz, ox, oz] = front === 'n' ? [(x0 + x1) / 2, z1, 0, 1] : front === 'e' ? [x1, (z0 + z1) / 2, 1, 0] : front === 's' ? [(x0 + x1) / 2, z0, 0, -1] : [x0, (z0 + z1) / 2, -1, 0];
  const on = (w, h, m2, along, y, out = .03) => onWall(piece(ox ? .06 : w, h, oz ? .06 : w, m2, fx + ox * out + (oz ? along : 0), y, fz + oz * out + (ox ? along : 0)));
  on(.8, 1.5, W_RED, 0, .75); on(.12, .12, gold, .26, .8, .07); for (const e of [-1, 1]) { on(.7, .7, glowMat, e * 1.35, 1.5); on(.06, .7, beam, e * 1.35, 1.5, .05); on(.7, .06, beam, e * 1.35, 1.5, .05); } // a door, two lit windows with their bars
  const mid = ox ? fz : fx; frame(x0, x1, z0, z1, 0, 2.5, { [front]: [[mid, .8, 0, 1.5], [mid - 1.35, .7, 1.15, 1.85], [mid + 1.35, .7, 1.15, 1.85]] }, { timber: false, m: W_CREAM === m ? W_BROWN : W_CREAM, plinth: stone, corners: true });
  if (ox) capped(fx + ox * .3 - .3, fx + ox * .3 + .3, fz - .6, fz + .6, 0, .14, stone, .05); else capped(fx - .6, fx + .6, fz + oz * .3 - .3, fz + oz * .3 + .3, 0, .14, stone, .05); // its step
  const cx = ax === 'x' ? x0 + 1 : (x0 + x1) / 2 + .9, cz = ax === 'x' ? (z0 + z1) / 2 + .9 : z0 + 1; capped(cx - .3, cx + .3, cz - .3, cz + .3, 3, 4.7, brickD, .1);
}
cottage(-32.5, -27.5, -23, -18.5, W_BLUE, 'z', 'e'); cottage(-26, -21, -33, -28.5, W_GREEN, 'x', 'n'); cottage(-33.5, -28.5, -32.5, -27.8, W_CREAM, 'x', 'n');

// lamp posts and lights
for (const [x, z, dx, dz] of [[2.4, 12.4, -1, 0], [-2.4, 12.4, 1, 0], [-12, 16.9, 0, -1], [10.5, 16.9, 0, -1], [-16.4, 3.6, 0, -1], [16.4, 3.6, 0, -1], [-10, -10.4, 1, 0], [10, -10.4, -1, 0], [-9, -21.6, 0, -1], [12.6, -21.4, 0, 1], [-22, 8.6, 1, 0], [19, 15.6, -1, 0]]) caneLamp(x, z, dx, dz);
lights(HX0, 6.86, HZ0 - .05, HX1, 6.86, HZ0 - .05); lights(HX0, 6.86, HZ1 + .05, HX1, 6.86, HZ1 + .05); lights(12, 7.06, 17.95, 23, 7.06, 17.95); lights(-31, 3.26, 18.95, -19, 3.26, 18.95); // along the walls under the eaves
lights(2.18, 3.28, 12.4, 10.5, 3.28, 16.68, .5); lights(-2.18, 3.28, 12.4, -12, 3.28, 16.68, .5); // lamp arm to lamp arm

// paths trodden through the snow
for (const [x0, x1, z0, z1] of [[-1.5, 1.5, HZ1, 14.4], [-19, 18.6, 14.4, 16.4], [16.5, 18.5, 16.4, 18], [-1.5, 1.5, 16.4, 19], [-22, HX0, 0, 2], [HX1, 18.2, -1, 1], [-9, -7, -12, HZ0], [7, 9, -12, HZ0], [-13, 21, -14, -12], [-13, -11, -24.5, -14], [19, 21, -23, -14]]) flat(x0, x1, z0, z1, pathMat, .01, 2);

K.finish(m => m.material === glowMat || m.material === fireMat);

// --- a wall round it all, pines and hills past it, mountains far off ---
for (const [x0, x1, z0, z1] of [[-35.5, PX1 - .9, -35.5, -34.9], [-35.5, PX1 - .9, 34.9, 35.5], [-35.5, -34.9, -34.9, 34.9], [34.5, 35.1, -34.7, 34.7]]) capped(x0, x1, z0, z1, 0, 1.4, stone);
{
  const r = seeded(808), trunks = [], greens = [], caps = [];
  const pine = (x, z, s) => { trunks.push([x, s * 2.2, z, .5 * s, 4.4 * s, .5 * s, 0]); [[3, 1.4], [2.2, 2.7], [1.3, 4]].forEach(([w, y], i) => { greens.push([x, s * (y + .55), z, w * s, 1.1 * s, w * s, 0, [0xffffff, 0xdceedc, 0xc6dcc8][i]]); caps.push([x, s * (y + 1.17), z, w * s, .14 * s, w * s, 0]); }); };
  for (let k = 0; k < 150; k++) { const a = r() * 6.283, d = 40 + r() * 34, x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d; if (Math.max(Math.abs(x), Math.abs(z)) < 38.5 || Math.abs(x - TX) < 3) continue; pine(x, z, 1 + r() * 1.3); }
  instanced(unit, barkMat, trunks); instanced(unit, needle, greens); instanced(unit, snow, caps);
  const hills = []; for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283 + r() * .2, d = 58 + r() * 26, w = 16 + r() * 18; hills.push([w, 2 + r() * 5, w * (.6 + r() * .5), Math.cos(a) * d, 0, Math.sin(a) * d, r() * 3]); }
  boxesMesh(hills.map(([w, h, d, x, , z, ry]) => [w, h, d, x, h / 2 - .4, z, ry]), snow, 2);
}
addSky(seeded(1225), [13, 15, -12], 12, 45, 140, 38, 52);
{
  const F = 0xdbe8f3, fr = seeded(60);
  farRange(118, fr, { lo: 5, hi: 12, mat: farMat(0xc4d2e2, F, .35) });
  farRange(132, fr, { lo: 12, hi: 26, peaks: 5, peak: 12, mat: farMat(0x7f93b2, F, .45), snow: farMat(0xffffff, F, .12), snowAt: 16 });
}
const flakes = snowFall(1500, roofMap(M)); add(flakes);
// smoke from the chimney and the engine
const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false });
const puffs = [[-29.8, 11.3, -8.8, 1], [-29.8, 11.3, -8.8, 1], [-29.8, 11.3, -8.8, 1], [-29.8, 11.3, -8.8, 1], [TX, 3.8, 9.5, .5], [TX, 3.8, 9.5, .5], [TX, 3.8, 9.5, .5]].map(([x, y, z, s], i) => { const m = live(detail(new THREE.Mesh(unit, puffMat.clone()))); add(m); return { m, x, y, z, s, t: i * .37 % 1 }; });

// --- bots find the stairs; floors indoors sound like floors ---
const NV = makeNav(M, [0, 0, 14]);
M.nav = NV.nav; M.around = NV.around;
M.debug = { nav: NV.data, nodeNear: NV.nodeNear, build: NV.ready, UP, PY, LO, doors: K.doors, windows: K.windows };
const INDOORS = [[I0, I1, J0, J1], [GX0, GX1, GZ0, GZ1], [12, 23, 18, 28], [-31, -19, 19, 29]];
M.surfAt = (x, z, feet, base, s) => !s && feet < .2 && INDOORS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1) ? 'wood' : base;
M.ice = (x, z, y) => y < .3 && ((x + 20.5) / 5.4) ** 2 + ((z + 15.5) / 3.6) ** 2 < 1; // the pond
M.tick = dt => {
  const t = performance.now() / 1000, k = Math.min(dt, .05);
  beltTex.offset.x = -(t * .9) % 1;
  for (const o of toys) { const u = (o.k + t * .9 / (o.x1 - o.x0)) % 1; o.t.position.set(o.x0 + (o.x1 - o.x0) * u, 1.02, o.z); }
  press.position.y = -(Math.max(0, Math.sin(t * 2.4)) ** 4) * .55;
  for (const b of brushes) b.rotation.y += k * 7;
  hook.rotation.z = Math.sin(t * .8) * .05; hook.rotation.x = Math.sin(t * .63 + 1) * .04;
  if (!gfxQ().detail) return;
  for (const p of puffs) { p.t = (p.t + k * .16) % 1; const s = p.s * (.5 + p.t * 1.6); p.m.scale.setScalar(s); p.m.position.set(p.x + p.t * 3.2 * p.s + Math.sin(p.t * 9 + p.x) * .2, p.y + p.t * 5 * p.s, p.z + p.t * 1.6 * p.s); p.m.material.opacity = .75 * (1 - p.t) * Math.min(1, p.t * 6); }
};
});
