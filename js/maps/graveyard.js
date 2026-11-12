startMap('graveyard', {
  name: 'The Graveyard', size: 'small', half: 26, surf: 'grass',
  env: { sky: 0x121828, fog: 0x1a2030, fogNear: 12, fogFar: 58, hemiSky: 0x93a6d6, hemiGround: 0x1c2118, hemi: .8, sunColor: 0xbccbf2, sun: .55, sunDir: [.4, 1, -.6] }, // sun = moon
  pads: [[-13, 12.5], [12.5, 12.5], [-13, -13], [16, -5, -2.7]],
  crates: [],
});
{
const M = MAPS.graveyard, GA = M.half, rnd = seeded(6661);
// the chapel, its bell tower, the crypt and its two stairways
const CH = [-5, 5, -22, -10.05], TX = 0, TZ = -7.45, // stair edges kept off the nav grid's cell centres
  TO = 2.6, TI = 2.25, CELL = 1.1, E0 = TI - CELL, DECK = 6.3, RISE = DECK / 4, PAR = .75; // parapet: low enough to see the ground near the tower
const CRYPT = [11, 21, -9, -1], CF = -2.7, WT = [5, 11, -3.6, -1.6], ST = [15, 17, -1, 5];
const inR = ([x0, x1, z0, z1], x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
const PATHS = [[-1.6, 1.6, TZ + TO, 26], [-24, 24, 5, 7.4], [1.6, 5, -3.6, -1.6]];

// materials
const stoneTex = rgb => tex(g => { noise(g, rgb, 14); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); });
const stone = surf(lam({ map: stoneTex([112, 112, 120]) }), 'stone'), darkStone = surf(lam({ map: stoneTex([74, 74, 82]) }), 'stone');
const slate = lam({ map: tex(g => { noise(g, [50, 54, 68], 10); g.fillStyle = 'rgba(0,0,0,.35)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) });
const wood = surf(lam({ map: tex(g => { noise(g, [96, 70, 44], 16); g.fillStyle = 'rgba(40,22,10,.5)'; g.fillRect(0, 0, 16, 2); }) }), 'wood');
const iron = surf(lam({ color: 0x24272c }), 'metal'), bronze = surf(lam({ color: 0x8a6a32, emissive: 0x1a1206 }), 'metal');
const dirtMat = lam({ map: tex(g => noise(g, [66, 52, 38], 22)) });
const decal = o => lam({ ...o, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const pathMat = decal({ map: tex(g => { noise(g, [84, 70, 52], 22); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const holeMat = decal({ color: 0x0c0a08 }), moundMat = lam({ map: tex(g => { noise(g, [58, 70, 44], 24); g.fillStyle = 'rgba(70,52,36,.6)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 2); }) });
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const piece = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); add(b); return b; };
const flat = (w, d, m, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); add(p); return p; };
const slab = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);

// ground, with holes for the crypt stairs
{
  const G = 140, S = new THREE.Shape([[-G, -G], [G, -G], [G, G], [-G, G]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const [x0, x1, z0, z1] of [WT, ST]) S.holes.push(new THREE.Path([[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]].map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.Mesh(new THREE.ShapeGeometry(S), lam({ map: tex(g => { noise(g, [44, 64, 38], 22); g.fillStyle = 'rgba(20,30,14,.35)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }) }));
  g.rotation.x = -Math.PI / 2; add(g); building.ground = g;
}
M.floor = (x, z) => inR(CRYPT, x, z) || inR(WT, x, z) || inR(ST, x, z) ? CF : 0;
M.surfAt = (x, z, y, b, s) => s || y > -1 ? b : 'stone';
// a path leaves out where it crosses an earlier one, or the two flicker there
const cutOut = (r, [a0, a1, b0, b1]) => {
  const [x0, x1, z0, z1] = r; if (a0 >= x1 || a1 <= x0 || b0 >= z1 || b1 <= z0) return [r];
  const m0 = Math.max(z0, b0), m1 = Math.min(z1, b1), out = [];
  if (b0 > z0) out.push([x0, x1, z0, b0]); if (b1 < z1) out.push([x0, x1, b1, z1]);
  if (a0 > x0) out.push([x0, a0, m0, m1]); if (a1 < x1) out.push([a1, x1, m0, m1]);
  return out;
};
const pathParts = [];
PATHS.forEach((r, i) => {
  let parts = [r]; for (const o of PATHS.slice(0, i)) parts = parts.flatMap(q => cutOut(q, o));
  pathParts.push(...parts);
  for (const [x0, x1, z0, z1] of parts) flat(x1 - x0, z1 - z0, pathMat, (x0 + x1) / 2, .012, (z0 + z1) / 2).userData.uvk = 2; // world-aligned, so the pieces meet
});

// iron fence with stone pillars, the gate to the south
addWall(0, -GA, GA * 2 + .3, .3); addWall(0, GA, GA * 2 + .3, .3); addWall(-GA, 0, .3, GA * 2 + .3); addWall(GA, 0, .3, GA * 2 + .3);
const FH = 2.1;
const barMat = (rx) => { const m = seeThru(tex(g => { g.fillStyle = '#1c1f24'; for (const x of [1, 5, 9, 13]) { g.fillRect(x, 3, 1, 13); g.fillRect(x - 1, 2, 3, 1); g.fillRect(x, 0, 1, 2); } g.fillRect(0, 6, 16, 1); g.fillRect(0, 14, 16, 1); }, rx, 1)); return m; };
const posts = new Set();
const fenceRun = (x1, z1, x2, z2) => {
  const len = Math.hypot(x2 - x1, z2 - z1), p = new THREE.Mesh(new THREE.PlaneGeometry(len, FH), barMat(len / 1.2));
  p.position.set((x1 + x2) / 2, FH / 2, (z1 + z2) / 2); p.rotation.y = Math.atan2(-(z2 - z1), x2 - x1); add(p);
  const n = Math.max(1, Math.round(len / 4.4));
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n, k = x.toFixed(1) + ',' + z.toFixed(1);
    if (posts.has(k)) continue; posts.add(k);
    building.cover.push(piece(.5, FH + .3, .5, stone, x, (FH + .3) / 2, z)); piece(.64, .16, .64, darkStone, x, FH + .38, z);
  }
};
fenceRun(-GA, -GA, GA, -GA); fenceRun(-GA, -GA, -GA, GA); fenceRun(GA, -GA, GA, GA);
fenceRun(-GA, GA, -2.4, GA); fenceRun(2.4, GA, GA, GA);
for (const s of [-1, 1]) { building.cover.push(piece(.8, 3.2, .8, stone, s * 2.4, 1.6, GA)); piece(.95, .2, .95, darkStone, s * 2.4, 3.3, GA); addSolid(s * 2.4, GA, .8, .8, 3.4); }
{ const gate = new THREE.Mesh(new THREE.PlaneGeometry(4, FH + .2), barMat(4 / 1.2)); gate.position.set(0, (FH + .2) / 2, GA); add(gate); piece(4, .12, .08, iron, 0, FH * .55, GA); }

// --- the chapel ---
const [cx0, cx1, cz0, cz1] = CH, WH = 4.45, RT = DECK + PAR, ET = 4.6, RL = cx1 + .4; // walls, the roof's top at the ridge and the eaves, half its width
slab(cx0, cx1, cz0, cz1, 0, WH, stone);
for (const z of [-20.5, -16, -11.5]) for (const s of [-1, 1]) slab(s > 0 ? cx1 : cx0 - .45, s > 0 ? cx1 + .45 : cx0, z - .3, z + .3, 0, 3.2, darkStone); // buttresses
// stained glass
const glass = [0x8a50d8, 0xd89a3a, 0x3a8ad8].map(c => new THREE.MeshBasicMaterial({ color: c }));
for (const [z, k] of [[-18.2, 0], [-13.8, 1]]) for (const s of [-1, 1]) {
  const x = s * (cx1 + .025);
  for (let i = 0; i < 4; i++) piece(.04, .55, 1 - Math.abs(i - 1.5) * .25, glass[(k + i) % 3], x, 1.4 + i * .55, z);
  piece(.1, .1, 1.2, darkStone, s * (cx1 + .05), 1.1, z); piece(.1, .1, .5, darkStone, s * (cx1 + .05), 3.65, z);
}
{ for (const [dx, dy, c] of [[0, 0, 1], [-.45, 0, 0], [.45, 0, 0], [0, .45, 2], [0, -.45, 2]]) piece(.42, .42, .04, glass[c], dx, 5.6 + dy, cz0 - .03); } // rose window
// stepped gables and the slate roof, which you can walk on (up the steps in the belfry and over its north wall)
const GS = (RT - WH) / 6;
for (const [z0, z1] of [[cz0, cz0 + .5], [cz1 - .5, cz1]]) for (let k = 0; k < 6; k++) { const w = (cx1 - cx0) * (1 - k / 6) / 2; slab(-w, w, z0, z1, WH + k * GS, WH + (k + 1) * GS, stone); }
{
  const a = Math.atan2(RT - ET, RL), T = .28, rz0 = cz0 - .4, rz1 = cz1 - .04; // the back ends inside the gable
  for (const s of [-1, 1]) { const r = box(Math.hypot(RL, RT - ET), T, rz1 - rz0, slate); r.position.set(s * (RL / 2 - T / 2 * Math.sin(a)), (RT + ET) / 2 - T / 2 * Math.cos(a), (rz0 + rz1) / 2); r.rotation.z = -s * a; add(r); building.cover.push(r); }
  building.solids.push({ mesh: null, minX: -RL, maxX: RL, minZ: rz0, maxZ: cz1, bot: WH - .1, top: RT, peak: { x: 0, z: 0, rx: RL, rz: 1e6, edge: ET }, surf: 'stone' });
  slab(-.16, .16, rz0 - .03, cz1 - .02, RT - .32, RT + .1, darkStone); // the ridge cap, over where the two sides meet
}

// --- the bell tower: stairs wind up the inside walls to the belfry ---
const tw = (u0, u1, v0, v1, bot, top, m = stone, cover = true) => slab(TX + u0, TX + u1, TZ + v0, TZ + v1, bot, top, m, cover);
const DOOR = .7, DOOR_H = 2.5;
tw(-TO, TO, -TO, -TI, 0, DECK + PAR); // north wall
tw(-TO, -TI, -TI, TI, 0, DECK + PAR); tw(TI, TO, -TI, TI, 0, DECK + PAR); // west and east walls
tw(-TO, -DOOR, TI, TO, 0, DECK + PAR); tw(DOOR, TO, TI, TO, 0, DECK + PAR); tw(-DOOR, DOOR, TI, TO, DOOR_H, DECK + PAR); // south wall and door
for (const s of [-1, 1]) piece(.16, .2, .16, darkStone, TX + s * (DOOR + .08), DOOR_H - .1, TZ + TO + .08);
piece(DOOR * 2 + .5, .3, .22, darkStone, TX, DOOR_H + .15, TZ + TO + .11);
for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tw(u * TO - (u > 0 ? .55 : 0), u * TO + (u < 0 ? .55 : 0), v * TO - (v > 0 ? .55 : 0), v * TO + (v < 0 ? .55 : 0), DECK + PAR, DECK + 3); // belfry pillars
for (const s of [-1, 1]) { piece(TO * 2, .3, .55, darkStone, TX, DECK + 3.15, TZ + s * (TO - .275)); piece(.55, .3, TO * 2 - 1.1, darkStone, TX + s * (TO - .275), DECK + 3.15, TZ); }
{ const roof = new THREE.Mesh(new THREE.ConeGeometry(TO * 1.45, 3.2, 4), slate); roof.rotation.y = Math.PI / 4; roof.position.set(TX, DECK + 4.9, TZ); add(roof); building.cover.push(roof); }
piece(.12, 1.2, .12, iron, TX, DECK + 7.1, TZ); piece(.7, .1, .1, iron, TX, DECK + 7.2, TZ);
// the bell
piece(.2, .2, TO * 2 - .5, wood, TX, DECK + 3.15, TZ); // the yoke rests in the belfry's beams
for (const [w, y] of [[.5, 2.9], [.8, 2.7], [.95, 2.45], [1.1, 2.25]]) { const b = piece(w, .25, w, bronze, TX, DECK + y, TZ); building.cover.push(b); }
building.solids.push({ mesh: null, minX: TX - .55, maxX: TX + .55, minZ: TZ - .55, maxZ: TZ + .55, bot: DECK + 2.15, top: DECK + 3.1 }); // high enough to hop under
// stair runs: E (0 to RISE), N, W, then S over the door to the deck; a landing in each corner on the way
const RUNS = [
  { r: [E0, TI, -E0, E0], ax: 'z', a: E0, b: -E0, fill: false },
  { r: [-E0, E0, -TI, -E0], ax: 'x', a: E0, b: -E0, fill: true },
  { r: [-TI, -E0, -E0, E0], ax: 'z', a: -E0, b: E0, fill: true },
  { r: [-E0, E0, E0, TI], ax: 'x', a: -E0, b: E0, fill: false },
];
const LANDINGS = [[E0, TI, -TI, -E0], [-TI, -E0, -TI, -E0], [-TI, -E0, E0, TI]];
RUNS.forEach(({ r: [u0, u1, v0, v1], ax, a, b, fill }, j) => {
  const bot = j * RISE, o = ax === 'x' ? TX : TZ;
  building.solids.push({ mesh: null, minX: TX + u0, maxX: TX + u1, minZ: TZ + v0, maxZ: TZ + v1, bot, top: bot + RISE, ramp: { ax, a: o + a, b: o + b }, surf: 'wood' });
  if (fill) tw(u0, u1, v0, v1, 0, bot, darkStone);
  const n = 5;
  for (let s = 0; s < n; s++) { // treads
    const p0 = a + (b - a) * s / n, p1 = a + (b - a) * (s + 1) / n, lo = Math.min(p0, p1), hi = Math.max(p0, p1), y = bot + RISE * (s + .5) / n;
    const m = ax === 'z' ? box(u1 - u0, .16, hi - lo, wood) : box(hi - lo, .16, v1 - v0, wood);
    m.position.set(TX + (ax === 'z' ? (u0 + u1) / 2 : (lo + hi) / 2), y - .08, TZ + (ax === 'z' ? (lo + hi) / 2 : (v0 + v1) / 2)); add(m); building.cover.push(m);
  }
  if (!fill && j) { // a beam under the run
    const len = Math.hypot(Math.abs(b - a), RISE), m = ax === 'z' ? box(u1 - u0 - .3, .2, len, wood) : box(len, .2, v1 - v0 - .3, wood);
    m.position.set(TX + (ax === 'z' ? (u0 + u1) / 2 : (a + b) / 2), bot + RISE / 2 - .25, TZ + (ax === 'z' ? (a + b) / 2 : (v0 + v1) / 2));
    if (ax === 'z') m.rotation.x = -Math.atan(RISE / (b - a)); else m.rotation.z = Math.atan(RISE / (b - a)); add(m);
  }
  if (j < 3) { const [l0, l1, k0, k1] = LANDINGS[j]; tw(l0, l1, k0, k1, 0, bot + RISE, darkStone); }
});
// the deck, open over the last two runs so you don't bang your head
for (const [u0, u1, v0, v1] of [[-E0, TI, -TI, E0], [E0, TI, E0, TI], [-TI, -E0, -TI, -E0]]) tw(u0, u1, v0, v1, DECK - .3, DECK, wood);
for (let k = 0; k < 3; k++) tw(-.7, .7, -TI + (2 - k) * .37, -TI + (3 - k) * .37, DECK, DECK + PAR * (k + 1) / 3, wood); // steps up onto the north wall, then the chapel roof
// a lantern in the stairwell
const lanternMat = lam({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2 });
piece(.04, .9, .04, iron, TX, DECK - .75, TZ); piece(.3, .4, .3, lanternMat, TX, DECK - 1.4, TZ); piece(.38, .07, .38, iron, TX, DECK - 1.17, TZ);
{ const pl = new THREE.PointLight(0xffb35a, 6, 8, 1.6); pl.position.set(TX, DECK - 1.8, TZ); add(pl); }

// --- the crypt: a room under the ground with a stairway at each end ---
const [kx0, kx1, kz0, kz1] = CRYPT, KT = .4, ROOF = -.02;
slab(kx0, kx1, kz0, kz1, -.4, ROOF, darkStone); // ceiling
slab(kx0, kx1, kz0, kz1, CF - .3, CF, darkStone, false); // floor
slab(kx0 - KT, kx0, kz0 - KT, WT[2] - KT, CF, ROOF, darkStone); slab(kx0 - KT, kx0, WT[3] + KT, kz1 + KT, CF, ROOF, darkStone); // west wall, the stairs come in
slab(kx1, kx1 + KT, kz0 - KT, kz1 + KT, CF, ROOF, darkStone); slab(kx0, kx1, kz0 - KT, kz0, CF, ROOF, darkStone); // east and north
slab(kx0, ST[0] - KT, kz1, kz1 + KT, CF, ROOF, darkStone); slab(ST[1] + KT, kx1, kz1, kz1 + KT, CF, ROOF, darkStone); // south, the stairs come in
for (const x of [14.3, 17.7]) slab(x - .3, x + .3, -5.3, -4.7, CF, -.4, stone);
// stairways down, with low walls round them up top
const stairway = ([x0, x1, z0, z1], ax, top) => {
  const lo = ax === 'x' ? (top === x0 ? x1 : x0) : (top === z0 ? z1 : z0), len = Math.abs(top - lo);
  building.solids.push({ mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot: CF, top: 0, ramp: { ax, a: lo, b: top }, surf: 'stone' });
  const n = 6;
  for (let s = 0; s < n; s++) {
    const p = top + (lo - top) * (s + .5) / n, h = CF * (s + .5) / n - CF;
    const m = ax === 'x' ? tbox(len / n, h, z1 - z0, stone) : tbox(x1 - x0, h, len / n, stone);
    m.position.set(ax === 'x' ? p : (x0 + x1) / 2, CF + h / 2, ax === 'x' ? (z0 + z1) / 2 : p); add(m); building.cover.push(m);
  }
  if (ax === 'x') for (const [z0w, z1w] of [[z0 - KT, z0], [z1, z1 + KT]]) slab(x0, x1, z0w, z1w, CF, .7, stone);
  else for (const [x0w, x1w] of [[x0 - KT, x0], [x1, x1 + KT]]) slab(x0w, x1w, z0, z1, CF, .7, stone);
  // an arch over the top step
  const [ax0, az0] = ax === 'x' ? [top, z0 - KT / 2] : [x0 - KT / 2, top], [ax1, az1] = ax === 'x' ? [top, z1 + KT / 2] : [x1 + KT / 2, top];
  for (const [x, z] of [[ax0, az0], [ax1, az1]]) slab(x - .3, x + .3, z - .3, z + .3, 0, 2.6, stone);
  slab(Math.min(ax0, ax1) - .3, Math.max(ax0, ax1) + .3, Math.min(az0, az1) - .3, Math.max(az0, az1) + .3, 2.6, 3.05, darkStone);
};
stairway(WT, 'x', WT[0]); stairway(ST, 'z', ST[3]);
// coffins, candles and cobwebs
const coffin = (x, z, along) => {
  const [w, d] = along === 'x' ? [2.1, .95] : [.95, 2.1];
  slab(x - w / 2, x + w / 2, z - d / 2, z + d / 2, CF, CF + .75, stone);
  slab(x - w / 2 - .05, x + w / 2 + .05, z - d / 2 - .05, z + d / 2 + .05, CF + .75, CF + .89, darkStone); // the lid
};
coffin(13.2, -7.6, 'x'); coffin(18.8, -7.6, 'x'); coffin(19.6, -3.6, 'z');
const candleMat = lam({ color: 0xf2e6c8, emissive: 0x3a3020 }), flameMat = new THREE.MeshBasicMaterial({ color: 0xffc860 });
const flameAt = [];
const candles = (x, y, z) => { for (const [dx, dz, h] of [[0, 0, .3], [.14, .08, .2], [-.12, .1, .24]]) { piece(.07, h, .07, candleMat, x + dx, y + h / 2, z + dz); flameAt.push([x + dx, y + h + .05, z + dz]); } };
candles(13.2, CF + .89, -7.6); candles(18.8, CF + .89, -7.6); candles(19.6, CF + .89, -3.6); candles(12, CF, -1.6); candles(20.4, CF, -8.4);
const flames = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .09, .05), flameMat, flameAt.length), flameM = new THREE.Matrix4(); add(flames); // one draw for every flame
for (const [x, z] of [[13.5, -6.2], [18.6, -4]]) { const pl = new THREE.PointLight(0xffa24a, 5, 9, 1.6); pl.position.set(x, CF + 1.4, z); add(pl); }
const webMat = seeThru(tex(g => { // hangs from the top edge: spokes and rings round the middle of it
  g.fillStyle = 'rgba(220,226,232,.9)';
  for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI; for (let r = 0; r < 15; r++) g.fillRect(7.5 + Math.cos(a) * r | 0, Math.sin(a) * r | 0, 1, 1); }
  for (const r of [4, 8, 12]) for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI; g.fillRect(7.5 + Math.cos(a) * r | 0, Math.sin(a) * r * .9 | 0, 1, 1); }
}));
for (const [x, z, ry] of [[kx0 + .5, kz0 + .5, Math.PI / 4], [kx1 - .5, kz0 + .5, -Math.PI / 4], [kx1 - .5, kz1 - .5, -3 * Math.PI / 4]]) {
  const w = detail(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), webMat)); w.position.set(x, -1.1, z); w.rotation.y = ry; add(w);
}

// --- graves ---
const GRAVE_STONE = [[150, 150, 156], [128, 128, 134], [140, 136, 126]].map(c => surf(lam({ map: tex(g => { noise(g, c, 16); g.fillStyle = 'rgba(70,96,50,.45)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, 10 + Math.random() * 6 | 0, 2, 1); }) }), 'stone'));
const LAMPS = [[2.5, 21], [-2.5, 13.5], [2.5, 2.5], [-8, 8.3], [9, 4.1], [-19, 4.1], [19.5, 8.3], [-2.5, -3.3]];
const clearOf = (x, z, m) => !PATHS.some(p => inR(p, x, z, m)) && !inR(CH, x, z, m + 1) && !inR([TX - TO, TX + TO, TZ - TO, TZ + TO], x, z, m + 1.2)
  && !inR([WT[0] - 1.5, CRYPT[1] + .5, CRYPT[2] - .5, ST[3] + .5], x, z, m) && !M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.2 + m)
  && !LAMPS.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 1 + m) && Math.max(Math.abs(x), Math.abs(z)) < GA - 1.4 - m;
const graves = [], open = [];
for (let z = -23; z <= 23.5; z += 3.3) for (let x = -23.2; x <= 23.2; x += 2.35) {
  if (rnd() < .18) continue;
  const gx = x + (rnd() - .5) * .3, gz = z + (rnd() - .5) * .3;
  if (!clearOf(gx, gz, .9) || !clearOf(gx, gz - 1.1, .5) || !clearOf(gx, gz + 1.1, .5)) continue;
  graves.push([gx, gz]);
}
const tilt = () => (rnd() - .5) * .12;
for (const [x, z] of graves) {
  const m = GRAVE_STONE[rnd() * GRAVE_STONE.length | 0], kind = rnd(), hz = z - 1.05, isOpen = rnd() < .26;
  // the headstone: a rounded slab, a tall one, an obelisk or a cross
  let h; const parts = [], pc = (...a) => { const b = piece(...a); parts.push(b); return b; };
  if (kind < .5) {
    h = .8 + rnd() * .3; const g = new THREE.Group(); g.position.set(x, 0, hz); g.rotation.z = tilt(); add(g);
    for (const [w, y0, y1] of [[.8, 0, h - .14], [.56, h - .14, h]]) { const b = box(w, y1 - y0, .22, m); b.position.y = (y0 + y1) / 2; g.add(b); parts.push(b); }
  }
  else if (kind < .75) { h = 1.25; pc(.7, 1.1, .24, m, x, .55, hz); pc(.5, .15, .24, m, x, 1.18, hz); pc(.9, .12, .36, m, x, .06, hz); }
  else if (kind < .9) { h = 1.7; pc(.36, 1.4, .36, m, x, .7, hz); pc(.24, .3, .24, m, x, 1.55, hz); pc(.6, .2, .6, m, x, .1, hz); }
  else { h = 1.25; pc(.2, 1.25, .2, m, x, .62, hz); pc(.7, .2, .24, m, x, .9, hz); }
  building.solids.push({ mesh: null, minX: x - .42, maxX: x + .42, minZ: hz - .16, maxZ: hz + .16, top: h, surf: 'stone' });
  building.cover.push(...parts);
  if (isOpen) { // dug up: a dark hole and the dirt beside it
    flat(.9, 1.8, holeMat, x, .014, z + .05); open.push([x, z + .05]);
    piece(.5, .35, 1.6, dirtMat, x + .78, .175, z + .05); piece(.36, .2, 1.2, dirtMat, x + .78, .45, z + .05);
    addSolid(x + .78, z + .05, .5, 1.6, .35, 'grass'); addSolid(x + .78, z + .05, .36, 1.2, .55, 'grass');
  } else { piece(.92, .16, 1.85, moundMat, x, .08, z + .05); addSolid(x, z + .05, .92, 1.85, .16, 'grass'); }
}
M.graves = open;

// --- lanterns, dead trees, mist and the moon ---
const LAMP_C = 0xffb35a;
const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false });
const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
LAMPS.forEach(([x, z], i) => {
  piece(.2, 2.9, .2, iron, x, 1.45, z); addSolid(x, z, .3, .3, 3.4);
  piece(.34, .44, .34, lanternMat, x, 3.1, z); piece(.44, .08, .44, iron, x, 3.36, z);
  const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(1.8); halo.position.set(x, 3.1, z); add(halo);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, .03, z); add(pool);
  if (i % 2 === 0) { const pl = new THREE.PointLight(LAMP_C, 8, 12, 1.4); pl.position.set(x, 2.9, z); add(pl); }
});
const deadBark = surf(lam({ map: tex(g => { noise(g, [58, 50, 44], 14); g.fillStyle = 'rgba(0,0,0,.3)'; for (const x of [3, 9, 13]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const deadTree = (x, z, s, solid) => {
  const h = 3.4 * s, ry = rnd() * Math.PI;
  const t = piece(.45 * s, h, .45 * s, deadBark, x, h / 2, z); t.rotation.y = ry;
  for (let k = 0; k < 4; k++) {
    const a = ry + k * 1.7 + rnd() * .6, y = h * (.5 + k * .13), l = (1.2 + rnd() * .8) * s;
    const b = box(.16 * s, l, .16 * s, deadBark); b.position.set(x + Math.cos(a) * l * .35, y + l * .3, z + Math.sin(a) * l * .35);
    b.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); add(b);
  }
  if (solid) { addSolid(x, z, .5 * s, .5 * s, h); building.cover.push(t); }
};
const onGrave = (x, z, m) => graves.some(([gx, gz]) => Math.abs(gx - x) < .5 + m && Math.abs(gz - z) < 1.1 + m);
for (const [x, z] of [[-21, -2], [21.5, -20], [-9, 22.5], [10, -14]]) if (clearOf(x, z, .2) && !onGrave(x, z, .4)) deadTree(x, z, 1 + rnd() * .3, true);
for (let n = 0; n < 60;) {
  const x = (rnd() * 2 - 1) * 70, z = (rnd() * 2 - 1) * 70;
  if (Math.max(Math.abs(x), Math.abs(z)) < GA + 3) continue;
  deadTree(x, z, .9 + rnd() * .8, false); n++;
}
grassTufts(Array.from({ length: 900 }, () => [(rnd() * 2 - 1) * 60, 0, (rnd() * 2 - 1) * 60]).filter(([x, , z]) => Math.max(Math.abs(x), Math.abs(z)) > GA + 1 || clearOf(x, z, .4) && !onGrave(x, z, .2))
  .map(([x, , z]) => { const s = .6 + rnd() * .5; return [x, 0, z, s, .7 * s, 1, rnd() * Math.PI, [0x8a9a70, 0x9aa080, 0x7a8a68][rnd() * 3 | 0]]; }));
// mist drifting low over the graves
const mistTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const x = 12 + Math.random() * 40, y = 12 + Math.random() * 40, r = 10 + Math.random() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const mistMat = new THREE.MeshBasicMaterial({ map: mistTex, color: 0x9aa8c8, transparent: true, opacity: .32, depthWrite: false, fog: true });
const mists = Array.from({ length: 14 }, () => {
  const m = detail(new THREE.Mesh(new THREE.PlaneGeometry(9, 9), mistMat)); m.rotation.x = -Math.PI / 2;
  const o = { m, x: (rnd() * 2 - 1) * GA, z: (rnd() * 2 - 1) * GA, v: .3 + rnd() * .3, y: .25 + rnd() * .4 };
  m.position.set(o.x, o.y, o.z); add(m); return o;
});
const MOON = new THREE.Vector3(...M.env.sunDir).normalize();
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(g => {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7.2) continue; g.fillStyle = d > 6.2 ? '#c9d2df' : '#eef2f8'; g.fillRect(x, y, 1, 1); }
  g.fillStyle = '#c3ccd9'; for (const [x, y, w, h] of [[4, 4, 3, 2], [9, 3, 2, 2], [10, 8, 3, 3], [5, 10, 2, 2]]) g.fillRect(x, y, w, h);
}), fog: false, transparent: true }));
moon.material.map.wrapS = moon.material.map.wrapT = THREE.ClampToEdgeWrapping; moon.scale.setScalar(7);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcfdcff, fog: false, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
moonGlow.scale.setScalar(30); add(moonGlow); add(moon);
for (const o of [moon, moonGlow]) { o.frustumCulled = false; o.onBeforeRender = (r, sc, cam) => { o.position.copy(cam.position).addScaledVector(MOON, 100); o.updateMatrixWorld(); }; } // far off from whatever camera looks, inside the low setting's view

// --- zombies climb out of the open graves, and follow you up the tower and down into the crypt ---
const NV = makeNav(M, [0, 0, 12]);
M.nav = NV.nav; M.around = NV.around;
M.debug = { nav: NV.data, nodeNear: NV.nodeNear, build: NV.ready, TX, TZ, TI, DECK, PAR, CRYPT, CF, CH, RT, flames, PATHS, pathParts };
M.tick = dt => {
  const t = performance.now() / 1000;
  flameAt.forEach(([x, y, z], k) => flames.setMatrixAt(k, flameM.makeScale(1, .8 + .3 * Math.sin(t * 11 + k * 1.7), 1).setPosition(x, y, z))); flames.instanceMatrix.needsUpdate = true;
  if (!gfxQ().detail) return;
  for (const o of mists) { o.x += o.v * dt; if (o.x > GA + 6) o.x = -GA - 6; o.m.position.set(o.x, o.y + Math.sin(t * .3 + o.z) * .08, o.z); }
};
}
