startMap('resort', {
  name: 'The Resort', size: 'large', half: 42,
  env: { sky: 0x8fd4ff, fog: 0xc4e8ff, fogNear: 50, fogFar: 160, hemiSky: 0xffffff, hemiGround: 0xd9c38e, hemi: 1.05, sunColor: 0xfff0d8, sun: 1.4, sunDir: [14, 22, 9] },
  pads: [[24, -22], [26, 4], [-18, 14], [-18, -14], [0, 30], [2, -30], [-36, 0], [12, 14]],
  crates: [[4.5, -12.5, 0], [5.9, -12.9, 1], [-5, -12.6, 0], [20.5, 15.8, 0], [21.8, 16.2, 1], [20.8, 8.4, 0],
    [24.6, -31, 1], [24.4, -29.6, 0], [2.5, 6, 0], [-3.5, 8.5, 1], [10, -4, 0], [-10, 26, 0], [-11.4, 26.6, 1],
    [-20, -26, 0], [-21.3, -25.2, 1], [-37, 12, 0], [14, -36, 0], [-2, -34, 0], [30, 26, 0]],
});
{
const M = MAPS.resort, RA = M.half, rnd = seeded(777);
const G = 200;
const SHORE = 33.5; // where the sand meets the sea. You can wade out to the edge of the map
addGround(G, lam({ map: tex(g => {
  noise(g, [226, 206, 156], 16);
  for (let i = 0; i < 7; i++) { g.fillStyle = ['rgba(170,140,95,.45)', 'rgba(255,245,215,.6)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }
}, G * 2, G * 2) }));
addWall(0, -RA, RA * 2 + .3, .3); addWall(0, RA, RA * 2 + .3, .3);
addWall(-RA, 0, .3, RA * 2 + .3); addWall(RA, 0, .3, RA * 2 + .3);

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const flatPlane = (w, d, m, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); add(p); return p; };
const decal = o => lam({ ...o, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const rectSlab = ([x0, x1, z0, z1], bot, top, m, cover, k) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover, k);
// a rectangle [x0, x1, z0, z1] with a hole cut out of it, as up to 4 rectangles
const rectMinus = ([x0, x1, z0, z1], [h0, h1, k0, k1]) =>
  [[x0, x1, z0, k0], [x0, x1, k1, z1], [x0, h0, k0, k1], [h1, x1, k0, k1]].filter(([a, b, c, d]) => b - a > .01 && d - c > .01);
const plain = c => lam({ color: c });

// --- grass over most of the map, with a strip of beach round the walls (wider on the sea side) ---
const GR = [-34, 19, -34, 34], gw = GR[1] - GR[0], gd = GR[3] - GR[2];
const drawGrass = g => {
  noise(g, [104, 168, 72], 20);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['rgba(55,105,35,.5)', 'rgba(175,215,115,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }
};
flatPlane(gw, gd, decal({ map: tex(drawGrass, gw, gd) }), (GR[0] + GR[1]) / 2, .01, (GR[2] + GR[3]) / 2);
// a ragged edge one block wide along each side, so the grass doesn't end in a straight line. The top of the texture faces the grass
function grassEdge(len, x, z, rot) {
  const t = tex(g => { drawGrass(g); for (let i = 0; i < 16; i++) { const d = 2 + (Math.random() * 10 | 0); g.clearRect(i, d, 1, 16 - d); } }, len, 1);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1), decal({ map: t, alphaTest: .5 }));
  p.rotation.set(-Math.PI / 2, 0, rot); p.position.set(x, .01, z); add(p);
}
grassEdge(gw, (GR[0] + GR[1]) / 2, GR[3] + .5, 0); grassEdge(gw, (GR[0] + GR[1]) / 2, GR[2] - .5, Math.PI);
grassEdge(gd, GR[1] + .5, (GR[2] + GR[3]) / 2, Math.PI / 2); grassEdge(gd, GR[0] - .5, (GR[2] + GR[3]) / 2, -Math.PI / 2);

// --- the sea ---
const WET = SHORE - 4;
flatPlane(SHORE - WET + 1, G * 2, decal({ map: tex(g => noise(g, [204, 182, 136], 12), 2, G) }), (WET + SHORE + 1) / 2, .012, 0);
const waterMat = (rgb, op, rx, ry) => new THREE.MeshLambertMaterial({ transparent: true, opacity: op, depthWrite: false, map: tex(g => {
  noise(g, rgb, 14); g.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 14 | 0, Math.random() * 16 | 0, 3, 1);
}, rx, ry) });
const SHALLOW_W = 12;
const shallow = flatPlane(SHALLOW_W, G * 2, waterMat([70, 200, 205], .55, SHALLOW_W / 3, G * 2 / 3), SHORE + SHALLOW_W / 2, .06, 0);
const deepW = G - SHORE - SHALLOW_W;
const deep = flatPlane(deepW, G * 2, waterMat([30, 125, 175], .93, deepW / 3, G * 2 / 3), SHORE + SHALLOW_W + deepW / 2, .06, 0);
const foam = flatPlane(1.4, G * 2, new THREE.MeshBasicMaterial({ transparent: true, opacity: .75, depthWrite: false, alphaTest: .2, map: tex(g => {
  g.clearRect(0, 0, 16, 16); g.fillStyle = '#ffffff';
  for (let y = 0; y < 16; y++) { const w = 3 + (Math.random() * 6 | 0); g.fillRect(0, y, w, 1); if (Math.random() < .4) g.fillRect(w + 2, y, 2, 1); }
}, 1, G) }), SHORE, .07, 0);

// --- the lighthouse ---
// Four floors and a gallery on top. The stairs wind up round the inside walls, half a floor per wall,
// with a landing in each corner, so every floor has its stairs on two walls and a hole above them.
// Local coords: u = x - LX, v = z - LZ (north is -v). The inside splits into a 3x3 grid: corners, a strip along each wall, the middle.
const LX = 29, LZ = -31, LH = 3.6, FLOORS = 4, HALF = LH / 2, RUNS = FLOORS * 2;
const LO = 2.8, LI = 2.3, CELL = 1.1, GA = 3.6; // half-widths: outside of the walls, inside, gallery. CELL = stair width
const GY = FLOORS * LH; // gallery floor
const paint = rgb => lam({ map: tex(g => { noise(g, rgb, 12); g.fillStyle = 'rgba(0,0,0,.07)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) });
const white = paint([240, 238, 232]), red = paint([200, 52, 44]);
const plank = lam({ map: tex(g => { noise(g, [150, 108, 66], 18); g.fillStyle = 'rgba(60,35,15,.45)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); g.fillRect(5, 1, 1, 3); g.fillRect(11, 5, 1, 3); g.fillRect(3, 9, 1, 3); g.fillRect(13, 13, 1, 3); }) });
const ironMat = plain(0x3a3f45);
const lh = (u0, u1, v0, v1, bot, top, m, cover = true) => addSlab(LX + (u0 + u1) / 2, LZ + (v0 + v1) / 2, u1 - u0, v1 - v0, bot, top, m, cover);
const LEVEL_MAT = [white, red, white, red];
const G3 = [-LI, -LI + CELL, LI - CELL, LI], E0 = LI - CELL;
const cellR = (i, j) => [G3[i], G3[i + 1], G3[j], G3[j + 1]];
const SIDES = ['W', 'N', 'E', 'S'];
const CORNER = [cellR(0, 2), cellR(0, 0), cellR(2, 0), cellR(2, 2)]; // SW, NW, NE, SE
const EDGE = [cellR(0, 1), cellR(1, 0), cellR(2, 1), cellR(1, 2)];   // along the W, N, E, S walls
// stair run j climbs along wall j % 4 from corner j % 4 to corner (j + 1) % 4, from height j * HALF to (j + 1) * HALF
const RUN = [{ ax: 'z', a: E0, b: -E0 }, { ax: 'x', a: -E0, b: E0 }, { ax: 'z', a: -E0, b: E0 }, { ax: 'x', a: E0, b: -E0 }];

// walls. Openings: [centre along the wall, width, bottom, top] (heights from that floor).
// Each floor gets a window in the middle of every wall except the one its upper stair run climbs past
const DOOR = [0, 1.4, 0, 2.4], WIN = [0, 1, 1, 2.3];
for (let k = 0; k < FLOORS; k++) {
  const y0 = k * LH, y1 = y0 + LH - (k === FLOORS - 1 ? .3 : 0), m = LEVEL_MAT[k % LEVEL_MAT.length];
  SIDES.forEach((side, w) => {
    const holes = k === 0 && side === 'S' ? [DOOR] : w === (2 * k + 1) % 4 ? [] : [WIN];
    const end = side === 'N' || side === 'S' ? LO : LI; // N and S run the full width so they cover the corners
    const piece = (a0, a1, b, t) => {
      if (a1 - a0 < .01 || t - b < .01) return;
      if (side === 'N') lh(a0, a1, -LO, -LI, b, t, m); else if (side === 'S') lh(a0, a1, LI, LO, b, t, m);
      else if (side === 'W') lh(-LO, -LI, a0, a1, b, t, m); else lh(LI, LO, a0, a1, b, t, m);
    };
    let a = -end;
    for (const [c, ow, ob, ot] of holes) {
      piece(a, c - ow / 2, y0, y1); piece(c - ow / 2, c + ow / 2, y0, y0 + ob); piece(c - ow / 2, c + ow / 2, y0 + ot, y1); a = c + ow / 2;
    }
    piece(a, end, y0, y1);
  });
}
// stairs. You collide with a smooth slope (so you walk straight up), the steps are just what you see
const STEPS = 6, stairMat = lam({ map: tex(g => { noise(g, [120, 84, 50], 16); g.fillStyle = 'rgba(40,22,10,.5)'; g.fillRect(0, 0, 16, 2); }) });
for (let j = 0; j < RUNS; j++) {
  const [u0, u1, v0, v1] = EDGE[j % 4], f = RUN[j % 4], fl = Math.floor(j / 2) * LH, bot = j * HALF, o = f.ax === 'x' ? LX : LZ;
  const rect = { mesh: null, minX: LX + u0, maxX: LX + u1, minZ: LZ + v0, maxZ: LZ + v1 };
  building.solids.push({ ...rect, bot, top: bot + HALF, ramp: { ax: f.ax, a: o + f.a, b: o + f.b } });
  if (bot > fl) building.solids.push({ ...rect, bot: fl, top: bot }); // filled in underneath, so you can't walk under the upper run
  for (let s = 0; s < STEPS; s++) {
    const p0 = f.a + (f.b - f.a) * s / STEPS, p1 = f.a + (f.b - f.a) * (s + 1) / STEPS, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    const h = bot + HALF * (s + 1) / STEPS - fl;
    const m = f.ax === 'z' ? tbox(u1 - u0, h, hi - lo, stairMat) : tbox(hi - lo, h, v1 - v0, stairMat);
    m.position.set(LX + (f.ax === 'z' ? (u0 + u1) / 2 : (lo + hi) / 2), fl + h / 2, LZ + (f.ax === 'z' ? (lo + hi) / 2 : (v0 + v1) / 2));
    add(m); building.cover.push(m);
  }
  if (j % 2 === 0) { const [c0, c1, d0, d1] = CORNER[(j + 1) % 4]; lh(c0, c1, d0, d1, fl, fl + HALF, stairMat); } // the landing halfway up
}
// floors 1 to 3 and the gallery deck. Floor k has a hole over the two runs (and the landing) that come up to it
const holeOf = k => [EDGE[(2 * k + 2) % 4], EDGE[(2 * k + 3) % 4], CORNER[(2 * k + 3) % 4]];
for (let k = 1; k <= FLOORS; k++) {
  const hole = holeOf(k), cells = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const c = cellR(i, j); if (!hole.some(h => h.every((x, n) => x === c[n]))) cells.push(c); }
  if (k === FLOORS) cells.push(...rectMinus([-GA, GA, -GA, GA], [-LI, LI, -LI, LI]));
  for (const [u0, u1, v0, v1] of cells) lh(u0, u1, v0, v1, k * LH - .3, k * LH, k < FLOORS ? plank : ironMat);
}
flatPlane(LI * 2, LI * 2, decal({ map: tex(g => { noise(g, [150, 145, 135], 14); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }, LI, LI) }), LX, .02, LZ);
for (const s of [-1, 1]) for (let i = -2.4; i <= 2.41; i += 1.2) { // brackets under the overhang
  const b1 = box(.8, .5, .25, ironMat); b1.position.set(LX + s * (LO + .4), GY - .55, LZ + i); add(b1);
  const b2 = box(.25, .5, .8, ironMat); b2.position.set(LX + i, GY - .55, LZ + s * (LO + .4)); add(b2);
}
// railing: drawn about waist high, but the invisible part goes higher so you can't jump off. Bullets go over it
for (const s of [-1, 1]) {
  building.solids.push({ mesh: null, minX: LX - GA, maxX: LX + GA, minZ: LZ + s * GA - .15, maxZ: LZ + s * GA + .15, bot: GY, top: GY + 1.9 });
  building.solids.push({ mesh: null, minX: LX + s * GA - .15, maxX: LX + s * GA + .15, minZ: LZ - GA, maxZ: LZ + GA, bot: GY, top: GY + 1.9 });
  for (const y of [GY + .5, GY + 1]) {
    const r1 = box(GA * 2, .07, .07, ironMat); r1.position.set(LX, y, LZ + s * (GA - .05)); add(r1);
    const r2 = box(.07, .07, GA * 2, ironMat); r2.position.set(LX + s * (GA - .05), y, LZ); add(r2);
  }
  for (let i = 0; i <= 8; i++) {
    const q = -GA + .05 + i * (GA * 2 - .1) / 8;
    const p1 = box(.08, 1, .08, ironMat); p1.position.set(LX + q, GY + .5, LZ + s * (GA - .05)); add(p1);
    const p2 = box(.08, 1, .08, ironMat); p2.position.set(LX + s * (GA - .05), GY + .5, LZ + q); add(p2);
  }
}
// lantern room in the middle: a red base, glass all round (you can shoot through it, not walk through it)
const LR = 1.1;
lh(-LR, LR, -LR, LR, GY, GY + .6, red);
building.solids.push({ mesh: null, minX: LX - LR, maxX: LX + LR, minZ: LZ - LR, maxZ: LZ + LR, bot: GY + .6, top: GY + 2.4 });
const glass = box(LR * 2 - .1, 1.8, LR * 2 - .1, new THREE.MeshLambertMaterial({ color: 0xcdeeff, transparent: true, opacity: .3, depthWrite: false }));
glass.position.set(LX, GY + 1.5, LZ); add(glass);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = box(.1, 1.8, .1, ironMat); p.position.set(LX + sx * (LR - .04), GY + 1.5, LZ + sz * (LR - .04)); add(p); }
const CY = GY + 2.9; // underside of the canopy
const chimney = box(1.3, CY - GY - 2.4, 1.3, ironMat); chimney.position.set(LX, (GY + 2.4 + CY) / 2, LZ); add(chimney);
// the canopy: a red roof over the whole gallery, held up by a post in each corner
for (const sx of [-1, 1]) for (const sz of [-1, 1]) addSlab(LX + sx * (GA - .12), LZ + sz * (GA - .12), .16, .16, GY, CY, ironMat);
const CW = GA + .3;
addSlab(LX, LZ, CW * 2, CW * 2, CY, CY + .25, red);
const roofM = new THREE.Mesh(new THREE.ConeGeometry(CW * Math.SQRT2, 2.2, 4), red); roofM.rotation.y = Math.PI / 4; roofM.position.set(LX, CY + .25 + 1.1, LZ); add(roofM);
const knob = box(.3, .45, .3, ironMat); knob.position.set(LX, CY + .25 + 2.2 + .15, LZ); add(knob);
const LAMP_Y = GY + 1.4;
const lampM = box(.7, .7, .7, new THREE.MeshLambertMaterial({ color: 0xfff0b0, emissive: 0xffd060, emissiveIntensity: 1.3 })); lampM.position.set(LX, LAMP_Y, LZ); add(lampM);
const lampHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a0, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
lampHalo.scale.setScalar(2.8); lampHalo.position.set(LX, LAMP_Y, LZ); add(lampHalo);

// rocks round the point it stands on (kept clear of the door on the south side)
const rockMat = lam({ map: tex(g => { noise(g, [128, 122, 112], 30); g.fillStyle = 'rgba(70,60,50,.5)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
for (const [x, z, w, d, h] of [[26, -36.5, 3, 2.5, 1.2], [30, -37, 3.5, 2.2, 1.6], [33.5, -35, 2.6, 3, 1.4], [35.5, -31, 2.4, 3.2, 1.1],
  [34.5, -27.5, 2, 2, .8], [37.5, -34, 2.2, 2.4, .7], [23.5, -36, 1.8, 1.6, .9], [36.5, -38.5, 3, 2.6, 1.8], [32, -39.5, 2.4, 2, 1]]) addBlock(x, z, w, d, h, rockMat);

// how bots and zombies get between the floors: the door, then round the corners.
// Stop j is corner j % 4 at height j * HALF: even j = on floor j / 2, odd j = the landing halfway up
const CN = CORNER.map(([u0, u1, v0, v1]) => ({ x: LX + (u0 + u1) / 2, z: LZ + (v0 + v1) / 2 }));
const stop = j => CN[j % 4];
const DOOR_IN = { x: LX, z: LZ + 1.6 }, DOOR_OUT = { x: LX, z: LZ + LO + 1.4 };
const inRect = (p, [u0, u1, v0, v1]) => p.x > LX + u0 && p.x < LX + u1 && p.z > LZ + v0 && p.z < LZ + v1;
function placeOf(p) { // -1 = outside, j = at stop j's floor or landing, j + .5 = on stair run j
  const g = GA + .2;
  if (!inRect(p, p.y > GY - 1 ? [-g, g, -g, g] : [-LI, LI, -LI, LI])) return -1;
  for (let j = 0; j < RUNS; j++) if (inRect(p, EDGE[j % 4]) && p.y > j * HALF + .1 && p.y < (j + 1) * HALF + .05) return j + .5;
  for (let j = 1; j < RUNS; j += 2) if (inRect(p, CORNER[j % 4]) && Math.abs(p.y - j * HALF) < .3) return j;
  return Math.max(0, Math.min(FLOORS, Math.round(p.y / LH))) * 2;
}
const near = (p, q) => Math.hypot(p.x - q.x, p.z - q.z) < .9;
// from p, which spot to walk to next to get to where t is, or null if it can just head straight there
M.nav = (p, t) => {
  const a = placeOf(p), b = placeOf(t);
  if (a === b) return null;
  if (a === -1) return inRect(p, [-.6, .6, LI - .2, LO + 1.9]) ? DOOR_IN : DOOR_OUT;
  if (a % 1) return b > a ? stop(a + .5) : stop(a - .5); // on the stairs: keep going up or down
  if (b > a) return near(p, stop(a)) ? stop(a + 1) : stop(a);
  if (a === 0) return near(p, DOOR_IN) ? DOOR_OUT : DOOR_IN;
  return near(p, stop(a)) ? stop(a - 1) : stop(a);
};

// --- the pool: a raised deck with a step all round, a ledge inside so you can climb out anywhere ---
const tile = lam({ map: tex(g => { noise(g, [234, 226, 208], 9); g.fillStyle = '#c8bca6'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(8, 0, 1, 16); }) });
const drawPoolTile = g => { noise(g, [72, 172, 214], 10); g.fillStyle = '#e4f4fb'; for (const i of [0, 4, 8, 12]) { g.fillRect(0, i, 16, 1); g.fillRect(i, 0, 1, 16); } };
const poolTile = lam({ map: tex(drawPoolTile) });
const POOL = [-24, -12, -5, 5], POOL_FLOOR = [-23.2, -12.8, -4.2, 4.2], DECK = [-27, -9, -8, 8], DECK_STEP = [-28, -8, -9, 9];
const DECK_Y = 1;
rectMinus(DECK, POOL).forEach(r => rectSlab(r, 0, DECK_Y, tile, true, 2));
rectMinus(DECK_STEP, DECK).forEach(r => rectSlab(r, 0, .5, tile, true, 2));
rectMinus(POOL, POOL_FLOOR).forEach(r => rectSlab(r, 0, .5, poolTile, true, 2));
flatPlane(POOL_FLOOR[1] - POOL_FLOOR[0], POOL_FLOOR[3] - POOL_FLOOR[2], decal({ map: tex(drawPoolTile, (POOL_FLOOR[1] - POOL_FLOOR[0]) / 2, (POOL_FLOOR[3] - POOL_FLOOR[2]) / 2) }), (POOL_FLOOR[0] + POOL_FLOOR[1]) / 2, .02, 0);
const poolWater = flatPlane(POOL[1] - POOL[0], POOL[3] - POOL[2], waterMat([95, 205, 235], .6, 4, 3), (POOL[0] + POOL[1]) / 2, .85, 0);

// loungers and umbrellas. y0 = what they stand on, along = 'x' or 'z' (which way they lie), dir = which end the back is at
const towelCols = [0xe8505a, 0x3ab0e0, 0xf2c94c, 0x5cc48a, 0xf08bb4];
const umbCols = [['#e8505a', '#ffffff'], ['#2a8fd6', '#ffffff'], ['#f2a33a', '#fff3d0'], ['#3bb27a', '#ffffff']];
const loungeMat = plain(0xf4f1ea), legMat = plain(0x9aa0a6);
function lounger(x, z, y0, along, dir, c) {
  const L = 1.9, W = .75, ax = along === 'x';
  building.solids.push({ mesh: null, minX: x - (ax ? L : W) / 2, maxX: x + (ax ? L : W) / 2, minZ: z - (ax ? W : L) / 2, maxZ: z + (ax ? W : L) / 2, bot: y0, top: y0 + .45 });
  const seat = box(ax ? L : W, .1, ax ? W : L, loungeMat); seat.position.set(x, y0 + .4, z); add(seat); building.cover.push(seat);
  const towel = box(ax ? L * .7 : W * .8, .02, ax ? W * .8 : L * .7, plain(c)); towel.position.set(x + (ax ? -dir * .2 : 0), y0 + .46, z + (ax ? 0 : -dir * .2)); add(towel);
  const back = box(ax ? .1 : W, .75, ax ? W : .1, loungeMat);
  back.position.set(x + (ax ? dir * (L / 2 - .2) : 0), y0 + .72, z + (ax ? 0 : dir * (L / 2 - .2)));
  if (ax) back.rotation.z = -dir * .55; else back.rotation.x = dir * .55;
  add(back); building.cover.push(back);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { const leg = box(.06, .35, .06, legMat); leg.position.set(x + (ax ? a * .8 : b * .3), y0 + .175, z + (ax ? b * .3 : a * .8)); add(leg); }
}
function umbrella(x, z, y0, cols) {
  addSlab(x, z, .12, .12, y0, y0 + 2.7, plain(0xf0ece2));
  const t = tex(g => { for (let i = 0; i < 16; i++) { g.fillStyle = cols[(i >> 1) % 2]; g.fillRect(i, 0, 1, 16); } });
  t.repeat.set(2, 1);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.7, .55, 16, 1, true), lam({ map: t, side: THREE.DoubleSide }));
  top.position.set(x, y0 + 2.55, z); add(top);
}
let uc = 0;
for (const z of [-6.5, 6.5]) {
  for (const x of [-25.5, -22.5, -16.5, -13.5]) lounger(x, z, DECK_Y, 'z', z < 0 ? -1 : 1, towelCols[uc++ % towelCols.length]);
  umbrella(-19.5, z, DECK_Y, umbCols[uc % umbCols.length]); uc++;
}
for (const [x, z] of [[22, -7], [27, -7], [22, -1.5], [27, -1.5]]) {
  lounger(x, z - .95, 0, 'x', -1, towelCols[uc++ % towelCols.length]);
  lounger(x, z + .95, 0, 'x', -1, towelCols[uc++ % towelCols.length]);
  umbrella(x - 1.6, z, 0, umbCols[uc++ % umbCols.length]);
}

// --- tiki bar ---
const wood = lam({ map: tex(g => { noise(g, [140, 96, 58], 18); g.fillStyle = 'rgba(50,28,12,.4)'; for (const x of [0, 5, 10]) g.fillRect(x, 0, 1, 16); }) });
const thatch = lam({ map: tex(g => { noise(g, [200, 164, 92], 26); g.fillStyle = 'rgba(120,85,40,.55)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 4); }) });
const BX = 0, BZ = -18;
addSlab(BX, BZ + 2, 6.4, .6, 0, 1.1, wood);
for (const s of [-1, 1]) addSlab(BX + s * 2.9, BZ + .4, .6, 2.6, 0, 1.1, wood); // gap at the back on both sides so you (and bots) can walk behind it
const counterTop = box(7, .1, 1, plain(0x6a4428)); counterTop.position.set(BX, 1.15, BZ + 2); add(counterTop);
addSlab(BX, BZ - 2.2, 6.4, .5, 0, 1.6, wood);
const bottleCols = [0x3a7a3a, 0x8a3a1a, 0xd8d0b0, 0x2a5a8a, 0xb04a2a, 0x5a3a7a];
for (let i = 0; i < 11; i++) { const b = box(.12, .32 + (i % 3) * .06, .12, plain(bottleCols[i % bottleCols.length])); b.position.set(BX - 2.7 + i * .54, 1.76 + (i % 3) * .03, BZ - 2.2); add(b); }
for (const sx of [-1, 1]) for (const sz of [-1, 1]) addSlab(BX + sx * 3.3, BZ + .1 + sz * 2.55, .3, .3, 0, 3, wood);
const barRoof = box(8, .35, 6.6, thatch); barRoof.position.set(BX, 3.15, BZ); add(barRoof); building.cover.push(barRoof);
const barCone = new THREE.Mesh(new THREE.ConeGeometry(5.6, 1.8, 4), thatch); barCone.rotation.y = Math.PI / 4; barCone.scale.set(1, 1, .82); barCone.position.set(BX, 4.2, BZ); add(barCone);
for (const x of [-2.2, -.7, .8, 2.3]) { addSlab(BX + x, BZ + 3, .45, .45, 0, .6, wood); const seat = box(.55, .08, .55, plain(0xc0392b)); seat.position.set(BX + x, .64, BZ + 3); add(seat); }

// --- beach huts ---
function hut(x, z, face) { // face = which way the door looks: [dx, dz]
  addSlab(x, z, 3.2, 3.2, 0, 2.6, wood);
  const r = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.7, 4), thatch); r.rotation.y = Math.PI / 4; r.position.set(x, 3.45, z); add(r); building.cover.push(r);
  const door = box(face[0] ? .04 : 1, 1.9, face[0] ? 1 : .04, plain(0x4a2e18)); door.position.set(x + face[0] * 1.61, .95, z + face[1] * 1.61); add(door);
  for (const s of [-1, 1]) { // a window either side of the door
    const w = box(face[0] ? .04 : .6, .6, face[0] ? .6 : .04, plain(0x2c4a5a));
    w.position.set(x + face[0] * 1.61 + (face[0] ? 0 : s * 1), 1.6, z + face[1] * 1.61 + (face[0] ? s * 1 : 0)); add(w);
  }
}
hut(-37.5, 30, [1, 0]); hut(-37.5, -31, [1, 0]); hut(6, 38.2, [0, -1]);

// --- volleyball court: a sand pit in the grass with a low wooden border ---
const PIT = [.5, 15.5, 16.5, 27.5];
flatPlane(PIT[1] - PIT[0], PIT[3] - PIT[2], decal({ map: tex(g => noise(g, [226, 206, 156], 16), PIT[1] - PIT[0], PIT[3] - PIT[2]) }), 8, .016, 22);
for (const [w, d, x, z] of [[15.2, .2, 8, PIT[2]], [15.2, .2, 8, PIT[3]], [.2, 11.2, PIT[0], 22], [.2, 11.2, PIT[1], 22]]) {
  const b = box(w, .12, d, wood); b.position.set(x, .06, z); add(b);
}
const lineMat = decal({ color: 0xffffff });
for (const [w, d, x, z] of [[12, .12, 8, 18], [12, .12, 8, 26], [.12, 8, 2, 22], [.12, 8, 14, 22]]) flatPlane(w, d, lineMat, x, .022, z);
for (const z of [18, 26]) addSlab(8, z, .15, .15, 0, 2.6, plain(0xdcdcdc));
const net = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), seeThru(tex(g => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 16, 2); for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); } }, 8, 1)));
net.rotation.y = Math.PI / 2; net.position.set(8, 2, 22); add(net);
const ball = box(.3, .3, .3, plain(0xf4f0e0)); ball.position.set(10.5, .15, 20.4); add(ball);

// --- pier and boats ---
const PZ = 12, PX0 = 18, PX1 = 60, PW = 3;
building.solids.push({ mesh: null, minX: PX0, maxX: PX1, minZ: PZ - PW / 2, maxZ: PZ + PW / 2, bot: 0, top: .5 });
const pierDeck = tbox(PX1 - PX0, .12, PW, plank); pierDeck.position.set((PX0 + PX1) / 2, .44, PZ); add(pierDeck); building.cover.push(pierDeck);
for (let x = PX0 + .4; x < PX1; x += 3) for (const s of [-1, 1]) { const p = box(.26, .9, .26, wood); p.position.set(x, .05, PZ + s * (PW / 2 - .15)); add(p); building.cover.push(p); }
for (const x of [26, 34, 40]) for (const s of [-1, 1]) addSlab(x, PZ + s * 1.25, .3, .3, .5, .85, ironMat); // bollards
const hullBlue = plain(0x1f4e8c), hullWhite = plain(0xf6f6f2), seatMat = plain(0xd8cfb8);
// speedboat tied up on the south side of the pier. Its deck is a step up from the pier, so you can walk onto it
const SB = { x0: 35, x1: 40.6, z: 15.25, w: 2.4 };
const sbx = (SB.x0 + SB.x1) / 2, sbL = SB.x1 - SB.x0;
building.solids.push({ mesh: null, minX: SB.x0, maxX: SB.x1, minZ: SB.z - SB.w / 2, maxZ: SB.z + SB.w / 2, bot: 0, top: 1 });
building.solids.push({ mesh: null, minX: SB.x1, maxX: SB.x1 + 1, minZ: SB.z - .7, maxZ: SB.z + .7, bot: 0, top: 1 });
for (const [m, y0, y1] of [[hullBlue, 0, .55], [hullWhite, .55, 1]]) {
  const h = box(sbL, y1 - y0, SB.w, m); h.position.set(sbx, (y0 + y1) / 2, SB.z); add(h); building.cover.push(h);
  const bow = box(1, y1 - y0, 1.4, m); bow.position.set(SB.x1 + .5, (y0 + y1) / 2, SB.z); add(bow); building.cover.push(bow);
  const tip = box(.5, y1 - y0, .6, m); tip.position.set(SB.x1 + 1.2, (y0 + y1) / 2, SB.z); add(tip);
}
addSlab(sbx + .9, SB.z - .4, .8, .7, 1, 1.85, hullWhite); // steering console
const wheel = box(.06, .35, .35, plain(0x222222)); wheel.position.set(sbx + .48, 1.75, SB.z - .4); add(wheel);
const shield = box(.06, .5, SB.w - .3, new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: .4, depthWrite: false }));
shield.position.set(sbx + 1.45, 1.4, SB.z); add(shield);
addSlab(sbx - 1.4, SB.z, .8, SB.w - .5, 1, 1.4, seatMat);
const motor = box(.5, 1, .6, plain(0x2a2a2e)); motor.position.set(SB.x0 - .25, .8, SB.z); add(motor); building.cover.push(motor);
// a yacht moored past the end of the pier, out of reach
const yx = 53, yz = 7, yL = 12, yW = 4;
const yHull = box(yL, 1.6, yW, hullWhite); yHull.position.set(yx, .6, yz); add(yHull);
const yStripe = box(yL + .02, .25, yW + .02, hullBlue); yStripe.position.set(yx, .45, yz); add(yStripe);
const yBow = box(2.4, 1.6, 2.4, hullWhite); yBow.position.set(yx + yL / 2 + 1, .6, yz); add(yBow);
const yCab = box(6, 1.4, 3, hullWhite); yCab.position.set(yx - .8, 2.1, yz); add(yCab);
const yWin = box(6.05, .5, 3.05, plain(0x1b2a3a)); yWin.position.set(yx - .8, 2.25, yz); add(yWin);
const yTop = box(3.4, 1, 2.4, hullWhite); yTop.position.set(yx - 1.5, 3.3, yz); add(yTop);
const yMast = box(.12, 2.4, .12, ironMat); yMast.position.set(yx - 1.5, 5, yz); add(yMast);
// an old rowboat turned upside down on the sand
for (const [w, d, y0, y1] of [[4, 1.6, 0, .5], [3.4, 1, .5, .8]]) addSlab(16, 38.5, w, d, y0, y1, lam({ map: tex(g => { noise(g, [150, 62, 40], 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 7, 16, 1); }) }), true, 1);

// --- the hotel behind the west wall (scenery) ---
const hotelMat = lam({ map: tex(g => {
  g.fillStyle = '#f2e6cf'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#5fa6c9'; g.fillRect(3, 4, 4, 6); g.fillRect(10, 4, 4, 6);
  g.fillStyle = '#e0d2b4'; g.fillRect(0, 12, 16, 2);
  g.fillStyle = '#c8b894'; g.fillRect(0, 15, 16, 1);
}) });
const hotel = tbox(14, 13, 72, hotelMat, 4); hotel.position.set(-57, 6.5, 0); add(hotel);
const hotelRoof = box(15, .6, 73, plain(0xc06a4a)); hotelRoof.position.set(-57, 13.3, 0); add(hotelRoof);
for (const z of [-30, 30]) { const wing = tbox(30, 10, 10, hotelMat, 4); wing.position.set(-58, 5, z + Math.sign(z) * 10); add(wing); }

// --- palm trees ---
const trunkMat = lam({ map: tex(g => { noise(g, [158, 124, 84], 16); g.fillStyle = 'rgba(80,55,30,.55)'; for (const y of [0, 5, 10]) g.fillRect(0, y, 16, 2); }) });
const frondMat = seeThru(tex(g => {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    const w = y < 2 ? 2 : y > 13 ? 3 : 7; // narrow near the trunk and at the tip
    for (let x = 8 - w; x < 8 + w; x++) {
      if ((x + y) % 3 === 0 && Math.abs(x - 7.5) > 1) continue; // gaps between the leaflets
      g.fillStyle = Math.abs(x - 7.5) < 1 ? '#5a7a2a' : `rgb(${60 + (x * 7 + y * 3) % 30},${130 + (x * 5 + y * 11) % 40},${40 + (x * 3) % 20})`;
      g.fillRect(x, y, 1, 1);
    }
  }
}));
const frondGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, 0, .5); // lies flat, sticks out along +z
const PALM_TINTS = [0xffffff, 0xe6f2c8, 0xd4e8b0, 0xf2ffe0];
function inst(geo, mat, list) { // like instanced(), but things can tip as well: [x, y, z, sx, sy, sz, rx, ry, color]
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); o.rotation.order = 'YXZ';
  list.forEach(([x, y, z, sx, sy, sz, rx, ry, c], i) => {
    o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix();
    m.setMatrixAt(i, o.matrix); m.setColorAt(i, tint.setHex(c ?? 0xffffff));
  });
  m.computeBoundingSphere(); add(m); return m;
}
const trunksIn = [], trunksOut = [], fronds = [], nuts = [], palms = [];
function palm(x, z, inside) {
  const h = 5.5 + rnd() * 3, a = rnd() * 6.28, lean = .8 + rnd() * 1.6, n = 9, out = inside ? trunksIn : trunksOut;
  let tx = x, tz = z;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), s = .6 - f * .2;
    tx = x + Math.cos(a) * lean * f * f; tz = z + Math.sin(a) * lean * f * f;
    out.push([tx, h * (i + .5) / n, tz, s, h / n + .03, s, 0, 0, 0xffffff]);
  }
  if (inside) addSolid(x, z, .7, .7, 99);
  const k = 8 + (rnd() * 3 | 0), spin = rnd() * 6.28, c = PALM_TINTS[rnd() * PALM_TINTS.length | 0];
  for (let i = 0; i < k; i++) {
    const ry = spin + i * 6.28 / k + (rnd() - .5) * .3, L1 = 1.4 + rnd() * .5, L2 = 1.5 + rnd() * .7, p1 = -.25 + rnd() * .3, p2 = .7 + rnd() * .4;
    fronds.push([tx, h, tz, 1.1, 1, L1, p1, ry, c]);
    const ex = tx + Math.sin(ry) * Math.cos(p1) * L1, ey = h - Math.sin(p1) * L1, ez = tz + Math.cos(ry) * Math.cos(p1) * L1;
    fronds.push([ex, ey, ez, 1, 1, L2, p2, ry, c]);
  }
  for (let i = 0; i < 3; i++) { const b = i * 2.1 + a; nuts.push([tx + Math.cos(b) * .3, h - .35, tz + Math.sin(b) * .3, .3, .3, .3, 0, 0, 0x6a4a28]); }
  palms.push([x, z]);
}
const padSpots = M.pads.map(([x, z]) => [x, z, 2.4]).concat(M.crates.map(([x, z]) => [x, z, 1.2]));
const free = (x, z, r) => !building.solids.some(s => x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ)
  && padSpots.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + r);
for (let tries = 0, k = 0; k < 26 && tries < 4000; tries++) {
  const x = (rnd() * 2 - 1) * (RA - 2), z = (rnd() * 2 - 1) * (RA - 2);
  if (x > SHORE - 2 || Math.hypot(x, z) < 5 || !free(x, z, 1.4) || palms.some(([a, b]) => Math.hypot(a - x, b - z) < 5.5)) continue;
  if (Math.abs(x - LX) < 6.5 && Math.abs(z - LZ) < 6.5) continue; // not under the gallery
  palm(x, z, true); k++;
}
for (let tries = 0, k = 0; k < 90 && tries < 6000; tries++) {
  const x = -110 + rnd() * (SHORE - 2 + 110), z = (rnd() * 2 - 1) * 110;
  if (Math.max(Math.abs(x), Math.abs(z)) < RA + 2.5 || (x < -48 && x > -74 && Math.abs(z) < 46) || palms.some(([a, b]) => Math.hypot(a - x, b - z) < 4.5)) continue;
  palm(x, z, false); k++;
}
building.cover.push(inst(unit, trunkMat, trunksIn)); // bullets stop on the trunks inside the map, not on the leaves
inst(unit, trunkMat, trunksOut); inst(frondGeo, frondMat, fronds); inst(unit, plain(0xffffff), nuts);

addCrates(M.crates);

// grass tufts on the lawn (not in the volleyball pit)
const tufts = [];
for (let tries = 0; tufts.length < 450 && tries < 6000; tries++) {
  const x = GR[0] + rnd() * gw, z = GR[2] + rnd() * gd;
  if (x > PIT[0] - .5 && x < PIT[1] + .5 && z > PIT[2] - .5 && z < PIT[3] + .5 || !free(x, z, .4)) continue;
  const s = .6 + rnd() * .6; tufts.push([x, 0, z, 1.1 * s, .8 * s, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]);
}
grassTufts(tufts);

// --- sky ---
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa8b8, fog: false });
for (let i = 0; i < 16; i++) {
  const a = rnd() * 6.28, r = 50 + rnd() * 110, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 48 + rnd() * 18;
  const w = 12 + rnd() * 18, d = 7 + rnd() * 10;
  const c1 = box(w, 3 + rnd() * 2, d, cloudMat); c1.position.set(x, y, z); add(c1);
  const c2 = box(w * .55, 2.5, d * .6, cloudMat); c2.position.set(x + (rnd() - .5) * w * .3, y + 2.4, z + (rnd() - .5) * d * .3); add(c2);
}

M.tick = () => {
  const t = performance.now() / 1000;
  shallow.material.map.offset.set(t * .03, t * .015); deep.material.map.offset.set(t * .02, t * .01);
  poolWater.material.map.offset.set(t * .04, t * .025);
  foam.position.x = SHORE + Math.sin(t * .7) * .7; foam.material.opacity = .55 + Math.sin(t * .7 + 1.2) * .2;
  lampHalo.material.opacity = .55 + Math.sin(t * 2) * .1;
};
}
