startMap('farm', {
  name: 'The Farm', size: 'small', half: 30, surf: 'grass',
  env: { sky: 0x9ccbe6, fog: 0xd4e2e2, fogNear: 45, fogFar: 140, hemiSky: 0xfff0d2, hemiGround: 0x7a6a3a, hemi: 1.05, sunColor: 0xffd49a, sun: 1.4, sunDir: [-18, 12, 10] },
  pads: [[-3.4, -13, 2.7], [17, 17], [-16.6, 14, 2.9], [-20, -4]],
  crates: [],
});
{
const M = MAPS.farm, GA = M.half, rnd = seeded(4242);
const inR = ([x0, x1, z0, z1], x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;

// materials
const planks = (rgb, v, line, vert) => tex(g => { noise(g, rgb, v); g.fillStyle = line; for (const k of [0, 5, 10]) vert ? g.fillRect(k, 0, 1, 16) : g.fillRect(0, k, 16, 1); });
const barnRed = surf(lam({ map: planks([150, 42, 34], 16, 'rgba(60,10,8,.45)', true) }), 'wood');
const trim = surf(lam({ map: tex(g => noise(g, [232, 226, 212], 8)) }), 'wood');
const wood = surf(lam({ map: planks([150, 112, 70], 18, 'rgba(70,40,15,.45)') }), 'wood');
const oldWood = surf(lam({ map: planks([116, 96, 74], 16, 'rgba(50,34,20,.45)') }), 'wood');
const tin = surf(lam({ map: tex(g => { noise(g, [124, 128, 132], 10); g.fillStyle = 'rgba(0,0,0,.25)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); g.fillStyle = 'rgba(150,80,40,.35)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) }), 'metal');
const hay = surf(lam({ map: tex(g => { noise(g, [212, 178, 92], 26); g.fillStyle = 'rgba(120,90,30,.45)'; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); g.fillStyle = 'rgba(80,50,20,.6)'; g.fillRect(4, 0, 1, 16); g.fillRect(11, 0, 1, 16); }) }), 'grass');
const concrete = surf(lam({ map: tex(g => { noise(g, [176, 172, 162], 12); g.fillStyle = 'rgba(0,0,0,.12)'; for (const x of [0, 8]) g.fillRect(x, 0, 1, 16); g.fillStyle = 'rgba(40,40,44,.6)'; g.fillRect(0, 7, 16, 1); }, 10, 6) }), 'stone');
const steel = surf(lam({ map: tex(g => { noise(g, [178, 184, 188], 10); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, 16, 1); }) }), 'metal');
const siding = surf(lam({ map: planks([228, 220, 198], 10, 'rgba(90,80,60,.3)') }), 'wood');
const shingle = surf(lam({ map: tex(g => { noise(g, [104, 62, 50], 14); g.fillStyle = 'rgba(0,0,0,.3)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) }), 'wood');
const brick = surf(lam({ map: tex(g => { noise(g, [150, 72, 54], 18); g.fillStyle = 'rgba(220,210,190,.5)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[3, 0], [11, 0], [7, 4], [15, 4], [3, 8], [11, 8], [7, 12], [15, 12]]) g.fillRect(x, y, 1, 3); }) }), 'stone');
const stone = surf(lam({ map: tex(g => { noise(g, [128, 126, 120], 20); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); }) }), 'stone');
const iron = surf(lam({ color: 0x3a3c40 }), 'metal'), rubber = surf(lam({ color: 0x24221f }), 'stone');
const paint = c => surf(lam({ color: c }), 'metal');
const glass = lam({ color: 0x8ab8d0, emissive: 0x1a2a34 }), dark = lam({ color: 0x2a1e16 }), shutter = paint(0x2f5a3a);
const decal = o => lam({ ...o, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const dirtMat = decal({ map: tex(g => { noise(g, [134, 104, 70], 22); g.fillStyle = 'rgba(84,60,38,.35)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const furrowMat = decal({ map: tex(g => { noise(g, [112, 86, 56], 18); g.fillStyle = 'rgba(62,42,24,.5)'; for (const x of [2, 3, 10, 11]) g.fillRect(x, 0, 1, 16); }) });
const waterMat = decal({ color: 0x3a6a8a, emissive: 0x0a1a24 });

// helpers
const piece = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); add(b); return b; };
const slab = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);
const solid = (x0, x1, z0, z1, bot, top, s) => { const o = { mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot, top, surf: s }; building.solids.push(o); return o; };
const flat = (x0, x1, z0, z1, m, y = .012) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 2, uv.getY(i) * (z1 - z0) / 2); add(p); return p;
};
// an outline in (z, y) pushed along x, or in (x, y) pushed along z
const prism = (geo, m) => { const o = new THREE.Mesh(geo, m); add(o); building.cover.push(o); return o; };
const prismX = (pts, x0, x1, m) => { const o = prism(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y))), { depth: x1 - x0, bevelEnabled: false }), m); o.rotation.y = Math.PI / 2; o.position.x = x0; return o; };
const prismZ = (pts, z0, z1, m) => { const o = prism(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: z1 - z0, bevelEnabled: false }), m); o.position.z = z0; return o; };
// strips of slope from a (height y0) to b (y1), each raised by lift and filled down to its low end, so there's headroom under it
const strips = (x0, x1, z0, z1, ax, a, b, y0, y1, n, s, lift = 0, thick = 0) => {
  for (let k = 0; k < n; k++) {
    const p0 = a + (b - a) * k / n, p1 = a + (b - a) * (k + 1) / n, h0 = y0 + (y1 - y0) * k / n, h1 = y0 + (y1 - y0) * (k + 1) / n, up = h1 >= h0, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    building.solids.push({ mesh: null, minX: ax === 'x' ? lo : x0, maxX: ax === 'x' ? hi : x1, minZ: ax === 'z' ? lo : z0, maxZ: ax === 'z' ? hi : z1,
      bot: Math.min(h0, h1) + lift - thick, top: Math.max(h0, h1) + lift, ramp: { ax, a: up ? p0 : p1, b: up ? p1 : p0 }, surf: s });
  }
};
const slope = (x0, x1, z0, z1, ax, a, b, y0, y1, n, s = 'wood') => strips(x0, x1, z0, z1, ax, a, b, y0, y1, n, s);
// open treads up a slope, on two stringers
const treads = (x0, x1, z0, z1, ax, a, b, y0, y1, n, m = wood) => {
  const len = Math.abs(b - a), w = ax === 'x' ? z1 - z0 : x1 - x0, ang = Math.atan2(y1 - y0, len);
  for (let k = 0; k < n; k++) {
    const p = a + (b - a) * (k + .5) / n, y = y0 + (y1 - y0) * (k + .5) / n;
    const t = ax === 'x' ? box(len / n, .08, w - .04, m) : box(w - .04, .08, len / n, m);
    t.position.set(ax === 'x' ? p : (x0 + x1) / 2, y - .04, ax === 'z' ? p : (z0 + z1) / 2); add(t); building.cover.push(t);
  }
  for (const e of [.1, w - .1]) {
    const L = Math.hypot(len, y1 - y0), sg = ax === 'x' ? box(L, .26, .12, oldWood) : box(.12, .26, L, oldWood);
    sg.position.set(ax === 'x' ? (a + b) / 2 : x0 + e, (y0 + y1) / 2 - .2, ax === 'z' ? (a + b) / 2 : z0 + e);
    if (ax === 'x') sg.rotation.z = Math.sign(b - a) * ang; else sg.rotation.x = -Math.sign(b - a) * ang;
    add(sg);
  }
};
const postAt = [], newPost = (x, y, z) => !postAt.some(([a, b, c]) => Math.hypot(a - x, c - z) < .25 && Math.abs(b - y) < .3) && postAt.push([x, y, z]);
// a rail along an edge from height y0 to y1: posts and two bars, a wall from .9 to 1 m over the walk so it stops bodies but not people underneath
const rail = (x0, x1, z0, z1, y0, y1 = y0, m = wood) => {
  const ax = x1 - x0 > z1 - z0 ? 'x' : 'z', a = ax === 'x' ? x0 : z0, b = ax === 'x' ? x1 : z1, len = b - a, n = Math.max(1, Math.round(len / 1.4));
  if (y1 === y0) solid(x0, x1, z0, z1, y0, y0 + 1, 'wood');
  else strips(x0, x1, z0, z1, ax, a, b, y0, y1, Math.ceil(len / .5), 'wood', 1, .1);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ang = Math.atan2(y1 - y0, len);
  for (let k = 0; k <= n; k++) { const p = a + len * k / n, y = y0 + (y1 - y0) * k / n, px = ax === 'x' ? p : cx, pz = ax === 'z' ? p : cz; if (newPost(px, y, pz)) building.cover.push(piece(.1, 1, .1, m, px, y + .5, pz)); }
  const L = Math.hypot(len, y1 - y0) - .04;
  for (const h of [.95, .5]) { const bar = ax === 'x' ? box(L, .08, .07, m) : box(.07, .08, L, m); bar.position.set(cx, (y0 + y1) / 2 + h, cz); if (ax === 'x') bar.rotation.z = ang; else bar.rotation.x = -ang; add(bar); building.cover.push(bar); }
};
const bale = (x, y, z, along) => {
  const [w, d] = along === 'x' ? [1.2, .6] : [.6, 1.2];
  building.cover.push(piece(w, .5, d, hay, x, y + .25, z)); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + .5, 'grass');
};
const trough = (x0, x1, z0, z1, m = waterMat) => {
  slab(x0, x1, z0, z1, 0, .5, oldWood); flat(x0, x1, z0, z1, m, .5);
  for (const [a, b, c, d] of [[x0, x1, z0, z0 + .08], [x0, x1, z1 - .08, z1], [x0, x0 + .08, z0 + .08, z1 - .08], [x1 - .08, x1, z0 + .08, z1 - .08]]) piece(b - a, .1, d - c, oldWood, (a + b) / 2, .55, (c + d) / 2);
  solid(x0, x1, z0, z1, .5, .6, 'wood');
};

// ground: grass, a dirt yard and the lane to the gate
addGround(160, lam({ map: tex(g => { noise(g, [96, 150, 62], 30); g.fillStyle = 'rgba(40,80,20,.3)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }, 320, 320) }));
const YARD = [[-16, 18, -10, 3.6], [-4, 3.6, 3.6, 30], [-16, -10, 3.6, 10], [-20, -16, 4, 10]];
for (const [x0, x1, z0, z1] of YARD) flat(x0, x1, z0, z1, dirtMat);
M.surfAt = (x, z, y, b, s) => s || y > .1 || !YARD.some(r => inR(r, x, z)) && !inR([-14, 0, -20, -10], x, z) ? b : 'sand';

// wood rail fence round the farm, a closed gate to the south
addWall(0, -GA, GA * 2 + .3, .3); addWall(0, GA, GA * 2 + .3, .3); addWall(-GA, 0, .3, GA * 2 + .3); addWall(GA, 0, .3, GA * 2 + .3);
{
  const posts = [], rails = [];
  const run = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.round(len / 3), ry = Math.atan2(-(z2 - z1), x2 - x1);
    for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n; if (Math.abs(Math.abs(x) - 2) > .01 || Math.abs(z - GA) > .01) if (newPost(x, 0, z)) posts.push([x, .7, z, .22, 1.4, .22, 0, 0xffffff]); }
    for (const y of [.55, 1.1]) rails.push([(x1 + x2) / 2, y, (z1 + z2) / 2, len - .22, .14, .06, ry, 0xffffff]);
  };
  run(-GA, -GA, GA, -GA); run(-GA, -GA, -GA, GA); run(GA, -GA, GA, GA); run(-GA, GA, -2, GA); run(2, GA, GA, GA);
  building.cover.push(instanced(unit, oldWood, posts), instanced(unit, oldWood, rails));
  for (const s of [-1, 1]) building.cover.push(piece(.3, 1.8, .3, oldWood, s * 2, .9, GA));
  for (const y of [.4, .8, 1.2]) building.cover.push(piece(3.7, .14, .06, wood, 0, y, GA));
  const brace = piece(4, .14, .06, wood, 0, .8, GA - .06); brace.rotation.z = Math.atan2(.8, 3.7); building.cover.push(brace);
}

// --- the barn: a hayloft over the east half, stairs up the north wall, a hay door out to the silo ---
const BX0 = -14, BX1 = 0, BZ0 = -20, BZ1 = -10, BT = .3, WH = 4.85, LOFT = 2.7, BC = (BZ0 + BZ1) / 2;
const EAVE = 4.6, KNEE = 6.9, RIDGE = 8.1, KD = 2.6, ED = 5.3, OV = .4; // roof heights; knee and eave distance from the ridge line
const ES = 5.02, HS = EAVE + (KNEE - EAVE) * (ED - ES) / (ED - KD); // the south eave stops at the wall, where the lean-to roof carries on down
const HD = [-15.8, -14.2]; // the hay door
// walls: two doors on the south side, one on the west, the hay door on the east
slab(BX0, BX1, BZ0, BZ0 + BT, 0, WH, barnRed);
for (const [x0, x1] of [[BX0, -11], [-7, -4], [-2, BX1]]) slab(x0, x1, BZ1 - BT, BZ1, 0, WH, barnRed);
slab(-11, -7, BZ1 - BT, BZ1, 3.6, WH, barnRed); slab(-4, -2, BZ1 - BT, BZ1, 2.4, WH, barnRed);
slab(BX0, BX0 + BT, BZ0 + BT, -16, 0, WH, barnRed); slab(BX0, BX0 + BT, -14, BZ1 - BT, 0, WH, barnRed); slab(BX0, BX0 + BT, -16, -14, 3.6, WH, barnRed);
slab(BX1 - BT, BX1, BZ0 + BT, HD[0], 0, WH, barnRed); slab(BX1 - BT, BX1, HD[1], BZ1 - BT, 0, WH, barnRed); slab(BX1 - BT, BX1, HD[0], HD[1], 0, LOFT, barnRed);
// gambrel roof you can walk on, and gables whose tops tuck inside it
const outer = [[BC - ED, EAVE], [BC - KD, KNEE], [BC, RIDGE], [BC + KD, KNEE], [BC + ES, HS]];
prismX([...outer, ...[...outer].reverse().map(([z, y]) => [z, y - .3])], BX0 - OV, BX1 + OV, tin);
const G0 = KD + (KNEE - WH - .15) / (KNEE - EAVE) * (ED - KD);
for (const x of [BX0, BX1 - BT]) prismX([[BC - G0, WH], [BC + G0, WH], [BC + KD, KNEE - .15], [BC, RIDGE - .15], [BC - KD, KNEE - .15]], x, x + BT, barnRed);
slope(BX0 - OV, BX1 + OV, 0, 0, 'z', BC - ED, BC - KD, EAVE, KNEE, 4, 'metal'); slope(BX0 - OV, BX1 + OV, 0, 0, 'z', BC + ES, BC + KD, HS, KNEE, 4, 'metal');
building.solids.push({ mesh: null, minX: BX0 - OV, maxX: BX1 + OV, minZ: BC - KD, maxZ: BC + KD, bot: KNEE - .2, top: RIDGE, peak: { x: 0, z: BC, rx: 1e6, rz: KD, edge: KNEE }, surf: 'metal' });
slab(BX0 - OV - .02, BX1 + OV + .02, BC - .25, BC + .25, RIDGE - .2, RIDGE + .1, trim); // ridge cap
// white trim: corners, sliding doors with an X, the hay hook
for (const [x, z] of [[BX0, BZ0], [BX1, BZ0], [BX0, BZ1], [BX1, BZ1]]) piece(.24, WH - .05, .24, trim, x, (WH - .05) / 2, z);
const leaf = (x, z, w, h, nx) => { // a plank door leaf against a wall facing x (nx) or z
  const p = (a, b, c, m, dx, dy, o) => piece(nx ? c : a, b, nx ? a : c, m, x + (nx ? nx * o : dx), dy, z + (nx ? dx : o));
  building.cover.push(p(w, h, .1, barnRed, 0, h / 2 + .02, .08));
  for (const s of [-1, 1]) { const b = p(Math.hypot(w, h) - .3, .14, .04, trim, 0, h / 2, .165 + s * .005); if (nx) b.rotation.x = s * Math.atan2(h, w); else b.rotation.z = s * Math.atan2(h, w); }
  p(w + .1, .14, .04, trim, 0, h - .05, .15); p(w + .1, .14, .04, trim, 0, .12, .15);
};
leaf(-12.05, BZ1, 2, 3.6, 0); leaf(-5.95, BZ1, 2, 3.6, 0); leaf(-1.05, BZ1, 1.9, 2.4, 0); leaf(BX0, -17.05, 2, 3.6, -1);
piece(9.2, .12, .12, iron, -9, 3.74, BZ1 + .08); piece(3.8, .12, .12, iron, -2.1, 2.54, BZ1 + .08); piece(.12, .12, 4.2, iron, BX0 - .08, 3.74, -16);
for (const z of [HD[0] - .45, HD[1] + .45]) building.cover.push(piece(.06, WH - LOFT - .1, .8, barnRed, BX1 + .05, (WH + LOFT) / 2, z + (z < BC ? -.05 : .05)));
piece(.9, .16, .16, oldWood, BX1 + .45, WH + .55, BC); piece(.04, .4, .04, iron, BX1 + .8, WH + .27, BC);
const FLOOR = [BX0 + BT, BX1 - BT, BZ0 + BT, BZ1 - BT];
flat(...FLOOR, decal({ map: tex(g => { noise(g, [120, 96, 62], 20); g.fillStyle = 'rgba(214,180,96,.7)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); }) }));
// the loft, its posts, and stairs up the north wall
slab(-7, BX1 - BT, BZ0 + BT, BZ1 - BT, LOFT - .25, LOFT, wood);
for (const z of [-17, -13.2]) slab(-7, -6.7, z - .15, z + .15, 0, LOFT - .25, oldWood);
piece(.26, .3, BZ1 - BZ0 - .6, oldWood, -6.85, LOFT - .41, BC);
slope(-12.5, -7, BZ0 + BT, -18.6, 'x', -12.5, -7, 0, LOFT, 6); treads(-12.5, -7, BZ0 + BT, -18.6, 'x', -12.5, -7, 0, LOFT, 9);
// inside: a stall, hay, a trough
slab(-11.2, -11, -14, BZ1 - BT, 0, 1.3, oldWood); slab(BX0 + BT, -12.6, -14, -13.8, 0, 1.3, oldWood); // a stall, open to the north
for (const [x, z, y, a] of [[-12.6, -11.3, 0, 'x'], [-12.6, -11.3, .5, 'x'], [-4.6, -18.6, LOFT, 'x'], [-3.4, -18.6, LOFT, 'x'], [-4, -18.6, LOFT + .5, 'x'], [-1.2, -11.6, LOFT, 'z'], [-6, -11.3, LOFT, 'x']]) bale(x, y, z, a);
trough(-13.6, -12.9, -18.2, -16.4, decal({ map: hay.map }));

// --- a lean-to on the south side, its roof running on from the barn's, and hay bales up onto it ---
const LT = [-5.5, -.5, BC + ES, -6.6], LLO = 2.7, LHI = HS;
slope(LT[0], LT[1], 0, 0, 'z', LT[3], LT[2], LLO, LHI, 3, 'metal');
prismX([[LT[3], LLO], [LT[2], LHI], [LT[2], LHI - .2], [LT[3], LLO - .2]], LT[0], LT[1], tin);
for (const x of [LT[0] + .2, LT[1] - .2]) { building.cover.push(piece(.2, LLO - .1, .2, oldWood, x, (LLO - .1) / 2, -6.75)); solid(x - .1, x + .1, -6.85, -6.65, 0, LLO - .1, 'wood'); }
piece(LT[1] - LT[0] - .1, .18, .16, oldWood, (LT[0] + LT[1]) / 2, LLO - .2, -6.75);
for (let k = 0; k < 5; k++) for (let j = 0; j <= k; j++) bale(-1.3, j * .5, LT[3] + .6 * (4 - k) + .3, 'x');

// --- the silo, its catwalk, a bridge from the hay door and stairs down the east side ---
const SX = 8.5, SZ = -15, SR = 2.2, SH = 10, CAT = 6, CW = [5.2, 11.8, -18.3, -11.7];
{
  const s = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, SH, 24), concrete); s.position.set(SX, SH / 2, SZ); add(s); building.cover.push(s);
  const d = new THREE.Mesh(new THREE.SphereGeometry(SR + .05, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel); d.position.set(SX, SH, SZ); add(d); building.cover.push(d);
  piece(.5, .4, .5, steel, SX, SH + SR + .1, SZ);
  for (const y of [.3, 3.3, SH - .3]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(SR + .06, SR + .06, .18, 24), iron); r.position.set(SX, y, SZ); add(r); }
  building.solids.push({ mesh: null, minX: SX - SR, maxX: SX + SR, minZ: SZ - SR, maxZ: SZ + SR, top: SH + SR, round: SR, surf: 'stone' });
  piece(.1, 1.8, .9, dark, SX - SR - .02, CAT + .9, SZ); // a hatch onto the catwalk
}
slab(CW[0], CW[1], CW[2], CW[3], CAT - .2, CAT, wood);
for (const [x, z] of [[CW[0] + .3, CW[2] + .3], [CW[0] + .3, CW[3] - .3], [CW[1] - .3, CW[2] + .3], [CW[1] - .3, CW[3] - .3]]) slab(x - .14, x + .14, z - .14, z + .14, 0, CAT - .2, oldWood);
rail(CW[0], CW[1], CW[2], CW[2] + .1, CAT); rail(CW[0], CW[1], CW[3] - .1, CW[3], CAT);
rail(CW[0], CW[0] + .1, CW[2] + .1, HD[0], CAT); rail(CW[0], CW[0] + .1, HD[1], CW[3] - .1, CAT);
rail(CW[1] - .1, CW[1], CW[2] + .1, -12.8, CAT);
// the bridge: flat out of the hay door so you don't bump your head, then up to the catwalk
slab(BX1, .5, HD[0] + .1, HD[1] - .1, LOFT - .15, LOFT, wood);
slope(.5, CW[0], HD[0] + .1, HD[1] - .1, 'x', .5, CW[0], LOFT, CAT, 6); treads(.5, CW[0], HD[0] + .1, HD[1] - .1, 'x', .5, CW[0], LOFT, CAT, 12);
rail(.5, CW[0], HD[0], HD[0] + .1, LOFT, CAT); rail(.5, CW[0], HD[1] - .1, HD[1], LOFT, CAT);
for (const x of [2.2, 3.8]) for (const z of [HD[0] + .2, HD[1] - .2]) slab(x - .1, x + .1, z - .1, z + .1, 0, LOFT + (CAT - LOFT) * (x - .6) / (CW[0] - .5) - .3, oldWood);
// stairs: up the east side to a landing, then back up to the catwalk's corner
const MID = CAT / 2, LZ = -17.2;
slope(13.4, 15, 0, 0, 'z', CW[3], LZ, 0, MID, 6); treads(13.4, 15, LZ, CW[3], 'z', CW[3], LZ, 0, MID, 9);
slab(CW[1], 15, CW[2], LZ, MID - .2, MID, wood);
slope(CW[1], 13.4, 0, 0, 'z', LZ, -12.8, MID, CAT, 5); treads(CW[1], 13.4, LZ, -12.8, 'z', LZ, -12.8, MID, CAT, 9);
slab(CW[1], 13.4, -12.8, CW[3], CAT - .2, CAT, wood);
rail(14.9, 15, LZ, CW[3], MID, 0); rail(13.3, 13.4, LZ, -12.8, MID, CAT); rail(CW[1], CW[1] + .1, LZ, -12.8, MID, CAT);
rail(CW[1], 15, CW[2], CW[2] + .1, MID); rail(14.9, 15, CW[2] + .1, LZ, MID); rail(CW[1], CW[1] + .1, CW[2] + .1, LZ, MID);
rail(CW[1], 13.4, CW[3] - .1, CW[3], CAT); rail(13.3, 13.4, -12.8, CW[3] - .1, CAT);
for (const [x, z, h] of [[14.9, CW[2] + .1, MID - .2], [CW[1] + .1, CW[2] + .1, MID - .2], [13.3, -12.7, CAT - .2], [13.3, -11.8, CAT - .2], [14.9, LZ - .1, MID - .2]]) slab(x - .1, x + .1, z - .1, z + .1, 0, h, oldWood);

// --- the farmhouse: a porch with a balcony on top, stairs up to it, and a roof you can climb ---
const HX0 = -26, HX1 = -18, HZ0 = 10, HZ1 = 18, HW = 3.1, HR = 5.6, HE = 3.15, HO = .3, HC = (HX0 + HX1) / 2;
prismZ([[HX0, 0], [HX1, 0], [HX1, HW], [HC, HR - .15], [HX0, HW]], HZ0, HZ1, siding);
solid(HX0, HX1, HZ0, HZ1, 0, HW, 'wood');
{
  const out = [[HX0 - HO, HE], [HC, HR], [HX1 + HO, HE]];
  prismZ([...out, ...[...out].reverse().map(([x, y]) => [x, y - .3])], HZ0 - HO, HZ1 + HO, shingle);
  building.solids.push({ mesh: null, minX: HX0 - HO, maxX: HX1 + HO, minZ: HZ0 - HO, maxZ: HZ1 + HO, bot: HW - .1, top: HR, peak: { x: HC, z: 0, rx: HC - HX0 + HO, rz: 1e6, edge: HE }, surf: 'wood' });
  slab(HC - .2, HC + .2, HZ0 - HO - .02, HZ1 + HO + .02, HR - .2, HR + .08, dark);
  slab(-24.6, -23.6, 15, 16, HW, HR + .8, brick); piece(1.2, .2, 1.2, brick, -24.1, HR + .9, 15.5); // the chimney
}
const win = (x, z, dx, dz, w = 1, h = 1.2, y = 1.6) => { // a window with shutters on a wall facing (dx, dz)
  const p = (u, v, o, sw, sh, sd, m) => piece(dx ? sd : sw, sh, dx ? sw : sd, m, x + (dx ? dx * o : u), y + v, z + (dz ? dz * o : u));
  p(0, 0, .02, w, h, .04, glass);
  p(0, h / 2 + .04, .04, w + .12, .12, .06, trim); p(0, -h / 2 - .04, .04, w + .12, .12, .06, trim); p(0, 0, .04, .08, h - .04, .06, trim);
  for (const s of [-1, 1]) p(s * (w / 2 + .25), 0, .03, .32, h + .1, .05, shutter);
};
for (const z of [11.6, 16.4]) win(HX1, z, 1, 0); for (const z of [11.6, 14, 16.4]) win(HX0, z, -1, 0);
for (const x of [-24, -20]) { win(x, HZ0, 0, -1); win(x, HZ1, 0, 1); }
piece(.05, 2.2, 1.1, paint(0x6a3a26), HX1 + .03, 1.5, 14); piece(.08, .1, .1, iron, HX1 + .08, 1.4, 14.35);
// porch, a balcony on its roof, stairs up the north end
const PO = [HX1, -15.4, 10.6, 17.4], BAL = 2.9;
slab(PO[0], PO[1], PO[2], PO[3], 0, .4, wood);
slab(PO[0], PO[1], PO[2], PO[3], BAL - .2, BAL, wood);
for (const z of [PO[2] + .1, 14, PO[3] - .1]) slab(PO[1] - .2, PO[1], z - .1, z + .1, .4, BAL - .2, trim);
rail(PO[1] - .1, PO[1], PO[2], PO[3], BAL, BAL, trim); rail(HX1 + HO + .1, PO[1] - .1, PO[3] - .1, PO[3], BAL, BAL, trim); rail(-16.3, PO[1] - .1, PO[2], PO[2] + .1, BAL, BAL, trim);
slope(-17.9, -16.4, 0, 0, 'z', 5.6, PO[2], 0, BAL, 6); treads(-17.9, -16.4, 5.6, PO[2], 'z', 5.6, PO[2], 0, BAL, 9);
rail(-16.4, -16.3, 5.6, PO[2], 0, BAL, trim);
slab(-17.7, -17.2, 15.2, 17, .4, .85, oldWood); piece(.1, .5, 1.8, oldWood, -17.75, 1.1, 16.1); // a bench

// --- the chicken coop, its run, and hay bales up onto its roof ---
const CO = [-27.5, -22.5, -26.5, -23];
const CE = CO[3] + .3; // the roof's low edge, where the bales meet it
prismX([[CO[2], 0], [CO[3], 0], [CO[3], 1.8], [CO[2], 2.4]], CO[0], CO[1], barnRed);
solid(CO[0], CO[1], CO[2], CO[3], 0, 1.8, 'wood');
prismX([[CE, 1.9], [CO[2] - .2, 2.5], [CO[2] - .2, 2.32], [CE, 1.72]], CO[0] - .2, CO[1] + .2, tin);
slope(CO[0] - .2, CO[1] + .2, 0, 0, 'z', CE, CO[2] - .2, 1.9, 2.5, 2, 'metal');
piece(.44, .6, .04, dark, -24, .45, CO[3] + .02); { const r = piece(.5, .05, 1.3, oldWood, -24, .3, CO[3] + .6); r.rotation.x = .45; }
for (let k = 0; k < 3; k++) for (let j = 0; j <= 2 - k; j++) bale(-25.8, j * .5, CE + .3 + .6 * k, 'x');
const wire = seeThru(tex(g => { g.fillStyle = '#9aa0a4'; for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); } }, 4, 1));
const RUN = [CO[1], -18.5, CO[2], CO[3] + 1.6];
for (const [x0, z0, x1, z1] of [[RUN[0], RUN[3], -20.8, RUN[3]], [-19.6, RUN[3], RUN[1], RUN[3]], [RUN[1], RUN[2], RUN[1], RUN[3]], [RUN[0], RUN[2], RUN[1], RUN[2]], [RUN[0], CO[3], RUN[0], RUN[3]]]) {
  const len = Math.hypot(x1 - x0, z1 - z0), p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.2), wire); p.position.set((x0 + x1) / 2, .6, (z0 + z1) / 2); p.rotation.y = x0 === x1 ? Math.PI / 2 : 0; add(p);
  solid(Math.min(x0, x1) - .05, Math.max(x0, x1) + .05, Math.min(z0, z1) - .05, Math.max(z0, z1) + .05, 0, 1.2, 'wood');
  const n = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (newPost(x, 0, z)) building.cover.push(piece(.12, 1.3, .12, oldWood, x, .65, z)); }
}
const chickens = [], white = lam({ color: 0xf2efe6 }), beak = lam({ color: 0xf0a020 }), comb = lam({ color: 0xd02020 });
for (let i = 0; i < 5; i++) {
  const c = live(new THREE.Group()), body = box(.3, .24, .4, white), head = box(.16, .18, .16, white);
  body.position.y = .26; head.position.set(0, .44, .2); c.add(body, head);
  const bk = box(.06, .05, .08, beak), cb = box(.04, .08, .08, comb); bk.position.set(0, -.01, .1); cb.position.set(0, .1, .02); head.add(bk, cb);
  for (const s of [-1, 1]) { const l = box(.04, .14, .04, beak); l.position.set(s * .08, .07, 0); c.add(l); }
  c.position.set(-21.9 + rnd() * 2.8, 0, -25.8 + rnd() * 3); c.rotation.y = rnd() * 6.28; add(c);
  chickens.push({ c, head, t: rnd() * 5 });
}

// --- the cornfields: zombies come out of them ---
const CORN = [[4, 28.6, 4, 28.6], [18, 28.6, -28.6, -2.5]], LANES = [[3, 30, 10.1, 11.5], [9.6, 11, 3, 30], [17, 30, -14.1, -12.7]];
const CLEAR = [[17, 17, 4.2], [24, -7.5, 3.6], [21.2, -4.6, 2]];
const inCorn = (x, z, m = 0) => CORN.some(r => inR(r, x, z, -m)) && !LANES.some(r => inR(r, x, z, m)) && !CLEAR.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + m);
{
  const cornMat = seeThru(tex(g => {
    g.clearRect(0, 0, 16, 16);
    g.fillStyle = '#5f8a30'; g.fillRect(7, 2, 2, 14);
    g.fillStyle = '#78a83a'; for (const [x, y, w] of [[2, 4, 5], [9, 6, 5], [1, 9, 6], [9, 11, 6], [3, 13, 4]]) { g.fillRect(x, y, w, 1); g.fillRect(x < 7 ? x : x + w - 1, y - 1, 1, 1); }
    g.fillStyle = '#e8c040'; g.fillRect(9, 7, 2, 3); g.fillStyle = '#c8b060'; g.fillRect(6, 0, 1, 2); g.fillRect(9, 0, 1, 2); g.fillRect(7, 1, 2, 1);
  }));
  cornMat.alphaTest = .5; cornMat.map.wrapS = cornMat.map.wrapT = THREE.ClampToEdgeWrapping;
  const plants = [], TINTS = [0xffffff, 0xeef2d8, 0xdfe8c0, 0xf4e8c8];
  for (const [x0, x1, z0, z1] of CORN) {
    flat(x0, x1, z0, z1, furrowMat);
    for (let x = x0 + .5; x < x1 - .3; x += 1) for (let z = z0 + .35; z < z1 - .2; z += .7) {
      const px = x + (rnd() - .5) * .2, pz = z + (rnd() - .5) * .2;
      if (inCorn(px, pz, .3)) plants.push([px, 0, pz, 1.1, 2.2 + rnd() * .5, 1, rnd() * Math.PI, TINTS[rnd() * TINTS.length | 0]]);
    }
  }
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), cross = l => l.map(p => { const q = [...p]; q[6] += Math.PI / 2; return q; });
  instanced(geo, cornMat, plants); instanced(geo, cornMat, cross(plants));
  // more corn outside the fence to the east
  const far = [];
  for (let x = 31; x < 52; x += 1.1) for (let z = -40; z < 32; z += .9) far.push([x + (rnd() - .5) * .3, 0, z + (rnd() - .5) * .3, 1.1, 2.2 + rnd() * .4, 1, rnd() * Math.PI, TINTS[rnd() * 4 | 0]]);
  detail(instanced(geo, cornMat, far)); detail(instanced(geo, cornMat, cross(far)));
  flat(30.5, 52, -40, 32, furrowMat);
}
M.spawns = [];
for (let x = 5.5; x < 28; x += 3) for (let z = -27.5; z < 28; z += 3) if (inCorn(x, z, 1)) M.spawns.push([x, z]);
// the scarecrow
{
  const [x, z] = [19.4, 18.6];
  piece(.14, 2.4, .14, oldWood, x, 1.2, z); piece(1.8, .12, .12, oldWood, x, 1.8, z);
  piece(.6, .8, .34, paint(0x4a6a9a), x, 1.55, z); piece(1.5, .2, .2, paint(0x8a3a2a), x, 1.8, z);
  piece(.42, .42, .42, paint(0xd8c890), x, 2.2, z); piece(.8, .06, .8, paint(0x7a5a2a), x, 2.44, z); piece(.44, .26, .44, paint(0x7a5a2a), x, 2.6, z);
  for (const s of [-1, 1]) piece(.12, .16, .15, hay, x + s * .95, 1.74, z);
  solid(x - .3, x + .3, z - .2, z + .2, 0, 1.95, 'wood');
}

// --- the windmill pump and its tank ---
const WM = [24, -7.5], WT = 9;
{
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const bx = WM[0] + sx * 1.4, bz = WM[1] + sz * 1.4, tx = WM[0] + sx * .3, tz = WM[1] + sz * .3, L = Math.hypot(bx - tx, WT, bz - tz);
    const l = box(.14, L, .14, steel); l.position.set((bx + tx) / 2, WT / 2, (bz + tz) / 2); l.lookAt(tx, WT, tz); l.rotateX(Math.PI / 2); add(l); building.cover.push(l);
    solid(bx - .12, bx + .12, bz - .12, bz + .12, 0, 1.2, 'metal');
  }
  for (const y of [2.5, 5, 7.4]) { const w = 2.8 * (1 - y / WT * .79); for (const s of [-1, 1]) { piece(w, .08, .08, steel, WM[0], y, WM[1] + s * w / 2); piece(.08, .08, w, steel, WM[0] + s * w / 2, y + .08, WM[1]); } }
  piece(.8, .4, .8, steel, WM[0], WT, WM[1]);
  const fan = live(new THREE.Group()); fan.position.set(WM[0], WT + .3, WM[1] + .5); add(fan);
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, b = box(.3, 1.4, .03, steel); b.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0); b.rotation.set(0, .4, a - Math.PI / 2, 'ZYX'); fan.add(b); }
  fan.add(box(.3, .3, .3, iron));
  piece(.08, .08, 2.2, steel, WM[0], WT + .3, WM[1] - 1.1); piece(.04, 1, 1, paint(0xb03a2a), WM[0], WT + .3, WM[1] - 2.2);
  M.fan = fan;
  const T = [21.2, -4.6], tankMat = surf(lam({ map: steel.map, side: THREE.DoubleSide }), 'metal');
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.9, 20, 1, true), tankMat); tank.position.set(T[0], .95, T[1]); add(tank); building.cover.push(tank);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.29, 20), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(T[0], 1.75, T[1]); add(water);
  building.solids.push({ mesh: null, minX: T[0] - 1.3, maxX: T[0] + 1.3, minZ: T[1] - 1.3, maxZ: T[1] + 1.3, top: 1.9, round: 1.3, surf: 'metal' });
}

// --- the yard: a tractor, the well, a hay wagon, troughs and bales ---
{
  const TR = [5, -4.6], body = paint(0xd86a1c), hub = paint(0xe8c040);
  const wheel = (x, z, r, w) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), rubber); t.rotation.x = Math.PI / 2; t.position.set(x, r, z); add(t); building.cover.push(t);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * .5, r * .5, w + .04, 10), hub); h.rotation.x = Math.PI / 2; h.position.set(x, r, z); add(h);
  };
  for (const s of [-1, 1]) { wheel(TR[0] - 1, TR[1] + s * .8, .72, .45); wheel(TR[0] + 1.7, TR[1] + s * .65, .42, .25); }
  building.cover.push(piece(2.2, .7, .8, body, TR[0] + 1.1, .95, TR[1]), piece(1.4, .5, 1.1, body, TR[0] - .9, .75, TR[1]));
  piece(2.24, .08, .84, iron, TR[0] + 1.1, 1.34, TR[1]); piece(.08, .5, .74, iron, TR[0] + 2.23, .95, TR[1]);
  for (const s of [-1, 1]) piece(1.3, .14, .5, body, TR[0] - 1, 1.5, TR[1] + s * .8);
  piece(.5, .12, .5, dark, TR[0] - 1.1, 1.06, TR[1]); piece(.12, .55, .5, dark, TR[0] - 1.38, 1.4, TR[1]);
  piece(.06, .5, .06, iron, TR[0] - .3, 1.25, TR[1]); { const w = new THREE.Mesh(new THREE.TorusGeometry(.2, .03, 6, 12), iron); w.position.set(TR[0] - .35, 1.52, TR[1]); w.rotation.y = Math.PI / 2; w.rotation.x = .5; add(w); }
  piece(.1, .9, .1, iron, TR[0] + 1.6, 1.75, TR[1] + .2);
  solid(TR[0] - 1.7, TR[0] + 2.2, TR[1] - 1.05, TR[1] + 1.05, 0, 1, 'metal'); solid(TR[0], TR[0] + 2.27, TR[1] - .42, TR[1] + .42, 0, 1.38, 'metal');
  for (const s of [-1, 1]) solid(TR[0] - 1.65, TR[0] - .35, TR[1] + s * .8 - .25, TR[1] + s * .8 + .25, 0, 1.57, 'metal');
}
{
  const W = [-8, 3.4];
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1, .9, 16), stone); ring.position.set(W[0], .45, W[1]); add(ring); building.cover.push(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.72, 16), decal({ color: 0x0c0e10 })); hole.rotation.x = -Math.PI / 2; hole.position.set(W[0], .9, W[1]); add(hole);
  building.solids.push({ mesh: null, minX: W[0] - 1, maxX: W[0] + 1, minZ: W[1] - 1, maxZ: W[1] + 1, top: .9, round: 1, surf: 'stone' });
  for (const s of [-1, 1]) { building.cover.push(piece(.14, 1.1, .14, oldWood, W[0] + s * .82, 1.45, W[1])); solid(W[0] + s * .82 - .07, W[0] + s * .82 + .07, W[1] - .07, W[1] + .07, .9, 2, 'wood'); }
  piece(1.8, .12, .12, oldWood, W[0], 1.95, W[1]); piece(.3, .3, .3, oldWood, W[0] - .15, 1.6, W[1]);
  piece(.04, .5, .04, iron, W[0], 1.65, W[1]); piece(.26, .26, .26, oldWood, W[0], 1.27, W[1]);
}
{
  const [x, z] = [-18.6, -6.2]; // the hay wagon
  slab(x - 1.5, x + 1.5, z - .8, z + .8, .6, .9, oldWood); solid(x - 1.5, x + 1.5, z - .8, z + .8, 0, .6, 'wood');
  for (const [dx, dz] of [[-1, -.86], [1, -.86], [-1, .86], [1, .86]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .12, 12), oldWood); w.rotation.x = Math.PI / 2; w.position.set(x + dx, .4, z + dz); add(w); }
  for (const [bx, bz, y, a] of [[-19.3, -6.5, .9, 'x'], [-19.3, -5.9, .9, 'x'], [-18, -6.2, .9, 'z'], [-19.3, -6.2, 1.4, 'x']]) bale(bx, y, bz, a);
  const tongue = piece(1.6, .1, .1, oldWood, x + 2.2, .5, z); tongue.rotation.z = .25;
}
trough(-15.8, -14.6, -13.6, -11); trough(-23, -20.6, 6.4, 7.2);
for (const [x, z, n, a] of [[2.4, 2.6, 2, 'x'], [-11, -3.4, 1, 'z'], [14.6, -2.4, 2, 'z'], [-3, 6.6, 1, 'x'], [8.2, 1.6, 1, 'x'], [-25, -12, 2, 'x']]) for (let j = 0; j < n; j++) bale(x, j * .5, z, a);
// round bales out in the pasture
for (const [x, z] of [[-23, -1.5], [-22.8, -9.6], [-26.6, -6], [-14.4, 1.8]]) {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 1.3, 14), hay); b.rotation.z = Math.PI / 2; b.position.set(x, .75, z); add(b); building.cover.push(b);
  solid(x - .65, x + .65, z - .7, z + .7, 0, 1.5, 'grass');
}
// pumpkins behind the house
const pumpkin = lam({ map: tex(g => { noise(g, [226, 120, 30], 18); g.fillStyle = 'rgba(140,60,10,.5)'; for (const x of [3, 8, 13]) g.fillRect(x, 0, 1, 16); }) }), stem = paint(0x4a6a2a);
flat(-27.5, -18.5, 20, 27.5, furrowMat);
for (let i = 0; i < 16; i++) {
  const x = -27 + rnd() * 8, z = 20.5 + rnd() * 6.5, s = .45 + rnd() * .3;
  piece(s, s * .75, s, pumpkin, x, s * .375, z).rotation.y = rnd(); piece(.06, .14, .06, stem, x, s * .75 + .05, z);
  solid(x - s / 2, x + s / 2, z - s / 2, z + s / 2, 0, s * .75, 'grass');
}

// --- trees: big oaks you can stand in, one with a tire swing ---
const trunks = [], leaves = [];
const oak = (x, z, s, inside) => {
  const h = 4.6 * s, w = .9 * s, c = [0x9cc078, 0x88b068, 0xa8c888][rnd() * 3 | 0], ry = rnd() * Math.PI / 2;
  trunks.push([x, h / 2, z, w, h, w, 0, 0xffffff]);
  leaves.push([x, h + .9 * s, z, 6.4 * s, 2.4 * s, 6.4 * s, ry, c], [x, h + 2.6 * s, z, 4 * s, 1.6 * s, 4 * s, ry, c]);
  if (!inside) return;
  addSolid(x, z, w, w, h, 'wood');
  const fit = 1 / (Math.abs(Math.cos(ry)) + Math.abs(Math.sin(ry)));
  for (const [size, b, t] of [[6.4 * s, h - .3 * s, h + 2.1 * s], [4 * s, h + 1.8 * s, h + 3.4 * s]]) addSolid(x, z, size * fit, size * fit, t, 'grass').bot = b;
};
oak(-11, 16, 1.05, true); oak(-27, 3, 1, true); oak(-10, 25.5, .95, true);
for (let n = 0; n < 50;) {
  const a = rnd() * 6.28, r = 38 + rnd() * 30, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (x > 30 && x < 54 && Math.abs(z) < 42) continue;
  oak(x, z, .9 + rnd() * .6, false); n++;
}
building.cover.push(instanced(unit, barkMat, trunks.slice(0, 3)), instanced(unit, leafMat, leaves.slice(0, 6)));
instanced(unit, barkMat, trunks.slice(3)); instanced(unit, leafMat, leaves.slice(6));
const swing = live(new THREE.Group()); swing.position.set(-9.4, 4.6 * 1.05 - .1, 16); add(swing);
for (const s of [-1, 1]) { const r = box(.03, 3.3, .03, oldWood); r.position.set(0, -1.65, s * .2); swing.add(r); }
{ const t = new THREE.Mesh(new THREE.TorusGeometry(.32, .12, 6, 12), rubber); t.position.y = -3.4; t.rotation.y = Math.PI / 2; swing.add(t); }

// outside: hills, a dirt road with power poles, plowed fields
{
  const hillMat = lam({ map: tex(g => noise(g, [104, 150, 70], 26)) });
  for (let k = 0; k < 18; k++) { // low hills in tiers, side on to the farm
    const a = k / 18 * 6.28 + rnd() * .2, r = 105 + rnd() * 25, w = 50 + rnd() * 30, h = 3 + rnd() * 4;
    for (let t = 0; t < 3; t++) { const b = box(w * (1 - t * .28), h, w * .5 * (1 - t * .3), hillMat); b.position.set(Math.cos(a) * r, h * (t + .5) - .6 - t * .02, Math.sin(a) * r); b.rotation.y = Math.PI / 2 - a; add(b); }
  }
  flat(-80, 80, 33, 37, dirtMat); flat(-2, 2, GA, 33, dirtMat);
  for (let x = -60; x <= 60; x += 15) { piece(.25, 7, .25, oldWood, x, 3.5, 38.5); piece(.16, .16, 2.2, oldWood, x, 6.6, 38.5); }
  for (const dz of [-.9, .9]) piece(120, .04, .04, dark, 0, 6.72, 38.5 + dz);
  flat(-60, -31, -45, 30, furrowMat); flat(-31, 30, -60, -31, furrowMat);
}

addSky(seeded(31), M.env.sunDir, 14, 60, 170, 40, 58);

// --- zombies walk out of the corn and follow you into the loft, onto the roofs and up to the catwalk ---
const NV = makeNav(M, [0, 0, 0]);
M.nav = NV.nav; M.around = NV.around;
M.debug = { nav: NV.data, nodeNear: NV.nodeNear, build: NV.ready, LOFT, CAT, MID, RIDGE, BC, BAL, HR, HC, LT, LHI, CO, swing, fan: M.fan, chickens };
M.tick = dt => {
  const t = performance.now() / 1000;
  M.fan.rotation.z -= dt * 1.6;
  swing.rotation.z = Math.sin(t * 1.3) * .12;
  for (const o of chickens) { o.t -= dt; o.head.rotation.x = o.t % 2.4 < .5 ? .9 : 0; if (o.t < 0) { o.t = 2 + Math.random() * 4; o.c.rotation.y += (Math.random() - .5) * 2; } }
};
}
