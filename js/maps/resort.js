startMap('resort', {
  name: 'The Resort', size: 'large', half: 42,
  env: { sky: 0x8fd4ff, fog: 0xc4e8ff, fogNear: 50, fogFar: 160, hemiSky: 0xffffff, hemiGround: 0xd9c38e, hemi: 1.05, sunColor: 0xfff0d8, sun: 1.4, sunDir: [14, 22, 9] },
  pads: [[24, -22], [26, 4], [-18, 14], [-18, -14], [0, 30], [2, -30], [-33.5, -3], [12, 14]], // one pad is inside the hotel
  crates: [], // crates don't suit a resort
});
{
const M = MAPS.resort, RA = M.half, rnd = seeded(777);
const G = 200;
const LX = 29, LZ = -31; // the lighthouse
const HUTS = [[-34, 27, [1, 0]], [-34, -27, [1, 0]], [6, 36, [0, -1]]];
// the deep sea drowns you, the pool is safe
const SEA_D = 3, POOL = [-21, -9, -5, 5], POOL_Y = .7, POOL_F = -1.5; // pool water level and floor
const inPool = (x, z, r = 0) => x + r > POOL[0] && x - r < POOL[1] && z + r > POOL[2] && z - r < POOL[3];
const drawSeabed = g => {
  noise(g, [200, 182, 136], 16);
  for (let i = 0; i < 7; i++) { g.fillStyle = ['rgba(150,125,85,.45)', 'rgba(235,225,195,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }
};
// deep sea floor
addGround(G, lam({ map: tex(drawSeabed, G * 2, G * 2) })).position.y = -SEA_D;
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
// rectangle minus a hole, as up to 4 rectangles
const rectMinus = ([x0, x1, z0, z1], [h0, h1, k0, k1]) =>
  [[x0, x1, z0, k0], [x0, x1, k1, z1], [x0, h0, k0, k1], [h1, x1, k0, k1]].filter(([a, b, c, d]) => b - a > .01 && d - c > .01);
const plain = c => lam({ color: c });
// tops you can stand on (roofs, umbrellas, palm crowns)
const later = [];
function standOn(x, z, rx, rz, bot, edge, peak, round, surf) {
  later.push({ mesh: null, minX: x - rx, maxX: x + rx, minZ: z - rz, maxZ: z + rz, bot, top: peak, surf, round: round ? rx : 0,
    peak: peak > edge ? { x, z, rx, rz, edge } : null });
}

// --- the island ---
// hills step up half a block at a time so you can walk up them
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, z, f, s) => { // smooth noise, -1 to 1
  x *= f; z *= f; const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv) * 2 - 1;
};
const N = 84, O = 42, LAND_Y = .06, WATER_Y = .035; // grid size and offset
const ci = x => Math.floor(x + O), inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N, at = (i, j) => j * N + i;
const SEA = 0, WETS = 1, SAND = 2, GRASS = 3;
const kind = new Uint8Array(N * N), H = new Float32Array(N * N), dSea = new Int16Array(N * N);
const SF = new Float32Array(N * N); // sea floor height per cell
const isLand = (x, z) => ((x + 3.5) / 37) ** 4 + ((z - .5) / 40) ** 4 <= 1 + .12 * vnoise(x, z, .12, 1) || Math.hypot(x - LX, z - LZ) < 7.5 + vnoise(x, z, .3, 2);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (isLand(i - O + .5, j - O + .5)) kind[at(i, j)] = GRASS;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const seaAt = (i, j) => !inGrid(i, j) || kind[at(i, j)] === SEA;
{ // distance to the sea, for the beach
  const q = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (kind[at(i, j)] && D4.some(([a, b]) => seaAt(i + a, j + b))) { dSea[at(i, j)] = 1; q.push([i, j]); }
  for (let k = 0; k < q.length; k++) {
    const [i, j] = q[k];
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (!seaAt(i + a, j + b) && !dSea[n]) { dSea[n] = dSea[at(i, j)] + 1; q.push([i + a, j + b]); } }
  }
}
{ // sea floor gets deeper in steps
  const dL = new Int16Array(N * N), q = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!kind[at(i, j)] && D4.some(([a, b]) => !seaAt(i + a, j + b))) { dL[at(i, j)] = 1; q.push([i, j]); }
  for (let k = 0; k < q.length; k++) {
    const [i, j] = q[k];
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && seaAt(i + a, j + b) && !dL[n]) { dL[n] = dL[at(i, j)] + 1; q.push([i + a, j + b]); } }
  }
  for (let c = 0; c < N * N; c++) if (!kind[c]) SF[c] = !dL[c] ? -SEA_D : dL[c] <= 2 ? -1 : dL[c] <= 5 ? -2 : -SEA_D;
}
const seaFloor = (i, j) => inGrid(i, j) ? SF[at(i, j)] : -SEA_D;
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x = i - O + .5, z = j - O + .5;
  if (!kind[c]) continue;
  // wider beach on the east side
  kind[c] = dSea[c] === 1 ? WETS : dSea[c] <= 3 + 1.5 * vnoise(x, z, .15, 3) || x > 18.5 + 2 * vnoise(x, z, .1, 4) ? SAND : GRASS;
}
// hills: [x, z, radius, height]
const HILLS = [[-28, -22, 10, 5], [-24, 25, 10, 5.5], [12, -26, 8, 4], [0, -6, 5.5, 2.5]];
const KEEP_R = [[-25, -5, -9, 9, 2], [-38.5, -28.5, -7.5, 6.5, 1.5],[-4.5, 4.5, -21, -14.5, 2.5], [.5, 15.5, 16.5, 27.5, 2], ...HUTS.map(([x, z]) => [x - 1.6, x + 1.6, z - 1.6, z + 1.6, 2])];
const KEEP_C = [...M.pads.map(([x, z]) => [x, z, 3]), ...M.crates.map(([x, z]) => [x, z, 2.2])];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x0 = i - O, z0 = j - O, x = x0 + .5, z = z0 + .5;
  if (kind[c] !== GRASS) continue;
  if (KEEP_R.some(([a, b, e, f, m]) => x0 + 1 > a - m && x0 < b + m && z0 + 1 > e - m && z0 < f + m)) continue;
  if (KEEP_C.some(([px, pz, r]) => Math.hypot(Math.max(x0 - px, 0, px - x0 - 1), Math.max(z0 - pz, 0, pz - z0 - 1)) < r)) continue;
  let raw = 0;
  for (const [hx, hz, r, h] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < r) raw = Math.max(raw, h * (1 - (d / r) ** 2) + .25 * vnoise(x, z, .25, 5)); }
  H[c] = Math.max(0, Math.floor(raw * 2) / 2);
}
for (let changed = true; changed;) { // no cell more than half a block above a neighbour
  changed = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j); if (!H[c]) continue;
    let lim = H[c];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) lim = Math.min(lim, (inGrid(i + a, j + b) ? H[at(i + a, j + b)] : 0) + .5);
    if (lim < H[c]) { H[c] = lim; changed = true; }
  }
}
const kindAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? kind[at(i, j)] : SEA; };
const hAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? H[at(i, j)] : 0; };
M.land = (x, z) => kindAt(x, z) !== SEA;
// paved paths
const ROUTES = [
  [[19, 12], [13, 11], [6, 9.8], [-1, 10.6], [-7, 10.6], [-13, 11.4], [-21, 11.4], [-26.6, 10.6], [-29, 7.5], [-29, 0]], // pier to hotel door
  [[-29, 0], [-25.4, 0]],                                                                                            // hotel to pool deck
  [[-29, 0], [-29, -7.8], [-27, -10.6], [-21, -11.4], [-13, -11.4], [-6, -11.2], [-2, -13.8], [2, -14.2]],             // to the tiki bar
  [[2, -14.2], [8, -13.4], [15, -15.2], [21, -19.6], [25.5, -24.4], [29, -27.4]],                                    // to the lighthouse
  [[6, 9.8], [7.2, 4], [6.4, -4], [4.4, -10], [2, -14.2]],                                                             // across the middle
  [[-1, 10.6], [-2.6, 17], [-2.2, 24], [1, 30], [5.6, 33.4]],                                                          // south hut
  [[-27.6, 10.9], [-29.6, 17], [-30.6, 23], [-31.8, 27]],                                                              // south-west hut
  [[-27.6, -10.9], [-29.6, -17], [-30.6, -23], [-31.8, -27]],                                                          // north-west hut
];
const PATH = new Uint8Array(N * N);
{
  const segs = [];
  for (const r of ROUTES) {
    const P = k => r[Math.max(0, Math.min(r.length - 1, k))], pts = [];
    for (let k = 0; k < r.length - 1; k++) for (let s = 0; s < 8; s++) { // Catmull-Rom through the points
      const t = s / 8, [p0, p1, p2, p3] = [P(k - 1), P(k), P(k + 1), P(k + 2)], t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
    }
    pts.push(r[r.length - 1]);
    for (let k = 0; k < pts.length - 1; k++) segs.push([pts[k], pts[k + 1]]);
  }
  const dist = (x, z, [a, b]) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i - O + .5, z = j - O + .5;
    if (kind[at(i, j)] >= SAND && segs.some(s => dist(x, z, s) < 1.05)) PATH[at(i, j)] = 1;
  }
}
const onPath = (x, z, r = 0) => { // paving within r?
  for (let j = ci(z - r); j <= ci(z + r); j++) for (let i = ci(x - r); i <= ci(x + r); i++) if (inGrid(i, j) && PATH[at(i, j)]) return true;
  return false;
};
const drawPaving = g => {
  noise(g, [214, 196, 162], 12);
  g.fillStyle = 'rgba(120,98,70,.55)'; // gaps between stones
  g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(9, 0, 1, 8); g.fillRect(4, 8, 1, 8); g.fillRect(12, 8, 1, 8);
  g.fillStyle = 'rgba(255,248,228,.45)'; for (const [x, y] of [[2, 2], [11, 3], [6, 11], [14, 12], [1, 13]]) g.fillRect(x, y, 2, 1);
};
const paving = tex(drawPaving);

// meshes made of cell faces
function cellMesh(quads, mats) {
  quads.sort((p, q) => p[0] - q[0]);
  const pos = [], nor = [], uv = [], col = [], ind = [], geo = new THREE.BufferGeometry();
  let start = 0;
  quads.forEach(([m, vs, n], k) => {
    const [a, b, c] = vs, cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) vs = [...vs].reverse(); // face outwards
    const base = pos.length / 3;
    for (const v of vs) { pos.push(v[0], v[1], v[2]); nor.push(...n); uv.push(v[3], v[4]); const k = v[5] ?? 1; col.push(k, k, k); }
    ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (k === quads.length - 1 || quads[k + 1][0] !== m) { geo.addGroup(start * 6, (k + 1 - start) * 6, m); start = k + 1; }
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(ind); geo.computeBoundingSphere(); geo.computeBoundingBox();
  const mesh = new THREE.Mesh(geo, mats); add(mesh); return mesh;
}
// darker corners at the foot of each step
const occ = (x, z, h) => { let n = 0; for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const i = x + O + a, j = z + O + b; if (inGrid(i, j) && H[at(i, j)] > h + .01) n++; } return 1 - .14 * n; };
const topQuad = (m, x0, z0, y, h = y) => [m, [[x0, y, z0, 0, 1, occ(x0, z0, h)], [x0 + 1, y, z0, 1, 1, occ(x0 + 1, z0, h)], [x0 + 1, y, z0 + 1, 1, 0, occ(x0 + 1, z0 + 1, h)], [x0, y, z0 + 1, 0, 0, occ(x0, z0 + 1, h)]], [0, 1, 0]];
const drawGrass = g => {
  noise(g, [104, 168, 72], 20);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['rgba(55,105,35,.5)', 'rgba(175,215,115,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }
};
const drawSand = g => {
  noise(g, [226, 206, 156], 16);
  for (let i = 0; i < 7; i++) { g.fillStyle = ['rgba(170,140,95,.45)', 'rgba(255,245,215,.6)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }
};
const lawn = tex(drawGrass);
// ground, shore and sea floor
{
  const wet = tex(g => noise(g, [198, 176, 130], 12));
  const mats = [decal({ map: wet, vertexColors: true }), decal({ map: tex(drawSand), vertexColors: true }), decal({ map: lawn, vertexColors: true }),
    lam({ vertexColors: true, map: tex(g => { noise(g, [176, 156, 112], 16); g.fillStyle = 'rgba(120,100,70,.4)'; for (const y of [3, 9, 14]) g.fillRect(0, y, 16, 1); }) }),
    lam({ vertexColors: true, map: tex(drawSeabed) }), decal({ map: paving, vertexColors: true })];
  const CH = 14;
  // side of a cell, from y0 up to y1
  const side = (quads, x0, z0, a, b, y0, y1) => {
    const ex = a > 0 ? x0 + 1 : x0, ez = b > 0 ? z0 + 1 : z0, v = y1 - y0;
    quads.push([3, a ? [[ex, y0, z0, 0, 0, .6], [ex, y0, z0 + 1, 1, 0, .6], [ex, y1, z0 + 1, 1, v], [ex, y1, z0, 0, v]]
      : [[x0, y0, ez, 0, 0, .6], [x0 + 1, y0, ez, 1, 0, .6], [x0 + 1, y1, ez, 1, v], [x0, y1, ez, 0, v]], [a, 0, b]]);
  };
  for (let cj = 0; cj < N; cj += CH) for (let cii = 0; cii < N; cii += CH) {
    const quads = [];
    for (let j = cj; j < cj + CH; j++) for (let i = cii; i < cii + CH; i++) {
      const c = at(i, j), x0 = i - O, z0 = j - O;
      if (!kind[c]) { // sea cell
        if (SF[c] <= -SEA_D) continue;
        quads.push(topQuad(4, x0, z0, SF[c], 0));
        for (const [a, b] of D4) if (seaAt(i + a, j + b) && seaFloor(i + a, j + b) < SF[c]) side(quads, x0, z0, a, b, seaFloor(i + a, j + b), SF[c]);
        continue;
      }
      if (inPool(x0 + .5, z0 + .5)) continue;
      if (!H[c]) quads.push(topQuad(PATH[c] ? 5 : kind[c] - 1, x0, z0, LAND_Y, 0));
      for (const [a, b] of D4) if (seaAt(i + a, j + b)) side(quads, x0, z0, a, b, seaFloor(i + a, j + b), LAND_Y);
    }
    if (quads.length) building.cover.push(cellMesh(quads, mats));
  }
}
// hills, in chunks so shots only check nearby ones
{
  const mats = [lam({ map: lawn, vertexColors: true }), lam({ vertexColors: true, map: tex(g => {
    noise(g, [128, 92, 60], 22); g.fillStyle = 'rgba(70,45,25,.4)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, 4 + Math.random() * 12 | 0, 2, 1);
    for (let x = 0; x < 16; x++) { const d = 2 + (Math.random() * 3 | 0); for (let y = 0; y < d; y++) { g.fillStyle = `rgb(${96 + (x * 7 + y * 5) % 20},${160 + (x * 3) % 20},${66})`; g.fillRect(x, y, 1, 1); } }
  }) }), lam({ map: paving, vertexColors: true })];
  const CH = 14;
  for (let cj = 0; cj < N; cj += CH) for (let cii = 0; cii < N; cii += CH) {
    const quads = [];
    for (let j = cj; j < cj + CH; j++) for (let i = cii; i < cii + CH; i++) {
      const c = at(i, j), h = H[c], x0 = i - O, z0 = j - O;
      if (!h) continue;
      quads.push(topQuad(PATH[c] ? 2 : 0, x0, z0, h));
      for (const [a, b] of D4) {
        const nh = inGrid(i + a, j + b) ? H[at(i + a, j + b)] : 0;
        if (nh >= h) continue;
        // step faces: paving, or earth with a grass lip
        const paved = !!PATH[c], v0 = paved ? 0 : 1 - (h - nh), v1 = paved ? h - nh : 1;
        const ex = a > 0 ? x0 + 1 : x0, ez = b > 0 ? z0 + 1 : z0;
        const lo = nh ? .78 : .72; // shadow at the foot of a step
        const corners = a ? [[ex, nh, z0, 0, v0, lo], [ex, nh, z0 + 1, 1, v0, lo], [ex, h, z0 + 1, 1, v1], [ex, h, z0, 0, v1]]
          : [[x0, nh, ez, 0, v0, lo], [x0 + 1, nh, ez, 1, v0, lo], [x0 + 1, h, ez, 1, v1], [x0, h, ez, 0, v1]];
        quads.push([paved ? 2 : 1, corners, [a, 0, b]]);
      }
    }
    if (quads.length) building.cover.push(cellMesh(quads, mats));
  }
}

// --- the sea ---
const waterMat = (rgb, op, rx, ry) => new THREE.MeshLambertMaterial({ transparent: true, opacity: op, depthWrite: false, map: tex(g => {
  noise(g, rgb, 14); g.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 14 | 0, Math.random() * 16 | 0, 3, 1);
}, rx, ry) });
// shallows fade into deep water
const REEF = 56, FADE = 3.5, RINGS = 8;
const waters = [new THREE.Mesh(new THREE.CircleGeometry(REEF, 48), waterMat([70, 200, 205], .55, REEF * 2 / 3, REEF * 2 / 3))];
for (let k = 1; k <= RINGS; k++) {
  const f = k / (RINGS + 1), r0 = REEF + (k - 1) * FADE, r1 = r0 + FADE, mix = (a, b) => Math.round(a + (b - a) * f);
  const g = new THREE.RingGeometry(r0, r1, 48, 1);
  waters.push(new THREE.Mesh(g, waterMat([mix(70, 30), mix(200, 125), mix(205, 175)], .55 + (.93 - .55) * f, r1 * 2 / 3, r1 * 2 / 3)));
}
waters.push(new THREE.Mesh(new THREE.RingGeometry(REEF + RINGS * FADE, G * 1.5, 48, 1), waterMat([30, 125, 175], .93, G, G)));
for (const w of waters) { w.rotation.x = -Math.PI / 2; w.position.set(-3, WATER_Y, 0); add(w); }
// shoreline foam
let foam;
{
  const quads = [], W = .6, y = WATER_Y + .01;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!kind[at(i, j)]) continue;
    const x0 = i - O, z0 = j - O;
    for (const [a, b] of D4) {
      if (!seaAt(i + a, j + b)) continue;
      const e = a > 0 ? x0 + 1 : a < 0 ? x0 : b > 0 ? z0 + 1 : z0, s = a + b; // which way the sea is
      quads.push([0, a ? [[e, y, z0, 0, 1], [e + s * W, y, z0, 0, 0], [e + s * W, y, z0 + 1, 1, 0], [e, y, z0 + 1, 1, 1]]
        : [[x0, y, e, 0, 1], [x0, y, e + s * W, 0, 0], [x0 + 1, y, e + s * W, 1, 0], [x0 + 1, y, e, 1, 1]], [0, 1, 0]]);
    }
  }
  foam = cellMesh(quads, [new THREE.MeshBasicMaterial({ transparent: true, opacity: .75, depthWrite: false, map: tex(g => {
    g.clearRect(0, 0, 16, 16); g.fillStyle = '#ffffff';
    for (let x = 0; x < 16; x++) { const h = 3 + (Math.random() * 7 | 0); g.fillRect(x, 0, 1, h); if (Math.random() < .4) g.fillRect(x, h + 2, 1, 2); }
  }) })]);
}

// --- the lighthouse ---
// four floors and a gallery, stairs wind up the inside walls
const LH = 3.6, FLOORS = 4, HALF = LH / 2, RUNS = FLOORS * 2;
const LO = 2.8, LI = 2.3, CELL = 1.1, GA = 3.6; // wall and gallery half-widths, stair width
const GY = FLOORS * LH; // gallery floor
const paint = rgb => lam({ map: tex(g => { noise(g, rgb, 12); g.fillStyle = 'rgba(0,0,0,.07)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) });
const white = surf(paint([240, 238, 232]), 'stone'), red = surf(paint([200, 52, 44]), 'stone');
const plank = surf(lam({ map: tex(g => { noise(g, [150, 108, 66], 18); g.fillStyle = 'rgba(60,35,15,.45)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); g.fillRect(5, 1, 1, 3); g.fillRect(11, 5, 1, 3); g.fillRect(3, 9, 1, 3); g.fillRect(13, 13, 1, 3); }) }), 'wood');
const ironMat = surf(plain(0x3a3f45), 'metal');
const lh = (u0, u1, v0, v1, bot, top, m, cover = true) => addSlab(LX + (u0 + u1) / 2, LZ + (v0 + v1) / 2, u1 - u0, v1 - v0, bot, top, m, cover);
const LEVEL_MAT = [white, red, white, red];
const G3 = [-LI, -LI + CELL, LI - CELL, LI], E0 = LI - CELL;
const cellR = (i, j) => [G3[i], G3[i + 1], G3[j], G3[j + 1]];
const SIDES = ['W', 'N', 'E', 'S'];
const CORNER = [cellR(0, 2), cellR(0, 0), cellR(2, 0), cellR(2, 2)]; // SW, NW, NE, SE
const EDGE = [cellR(0, 1), cellR(1, 0), cellR(2, 1), cellR(1, 2)];   // W, N, E, S
// stair run j climbs along wall j % 4
const RUN = [{ ax: 'z', a: E0, b: -E0 }, { ax: 'x', a: -E0, b: E0 }, { ax: 'z', a: -E0, b: E0 }, { ax: 'x', a: E0, b: -E0 }];

// walls with doors and windows
const DOOR = [0, 1.4, 0, 2.4], WIN = [0, 1, 1, 2.3];
for (let k = 0; k < FLOORS; k++) {
  const y0 = k * LH, y1 = y0 + LH - (k === FLOORS - 1 ? .3 : 0), m = LEVEL_MAT[k % LEVEL_MAT.length];
  SIDES.forEach((side, w) => {
    const holes = k === 0 && side === 'S' ? [DOOR] : w === (2 * k + 1) % 4 ? [] : [WIN];
    const end = side === 'N' || side === 'S' ? LO : LI; // N and S walls cover the corners
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
// stairs: you walk on a smooth slope
const STEPS = 6, stairMat = surf(lam({ map: tex(g => { noise(g, [120, 84, 50], 16); g.fillStyle = 'rgba(40,22,10,.5)'; g.fillRect(0, 0, 16, 2); }) }), 'wood');
for (let j = 0; j < RUNS; j++) {
  const [u0, u1, v0, v1] = EDGE[j % 4], f = RUN[j % 4], fl = Math.floor(j / 2) * LH, bot = j * HALF, o = f.ax === 'x' ? LX : LZ;
  const rect = { mesh: null, minX: LX + u0, maxX: LX + u1, minZ: LZ + v0, maxZ: LZ + v1 };
  building.solids.push({ ...rect, bot, top: bot + HALF, ramp: { ax: f.ax, a: o + f.a, b: o + f.b }, surf: 'wood' });
  if (bot > fl) building.solids.push({ ...rect, bot: fl, top: bot, surf: 'wood' }); // filled in underneath
  for (let s = 0; s < STEPS; s++) {
    const p0 = f.a + (f.b - f.a) * s / STEPS, p1 = f.a + (f.b - f.a) * (s + 1) / STEPS, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    const h = bot + HALF * (s + 1) / STEPS - fl;
    const m = f.ax === 'z' ? tbox(u1 - u0, h, hi - lo, stairMat) : tbox(hi - lo, h, v1 - v0, stairMat);
    m.position.set(LX + (f.ax === 'z' ? (u0 + u1) / 2 : (lo + hi) / 2), fl + h / 2, LZ + (f.ax === 'z' ? (lo + hi) / 2 : (v0 + v1) / 2));
    add(m); building.cover.push(m);
  }
  if (j % 2 === 0) { const [c0, c1, d0, d1] = CORNER[(j + 1) % 4]; lh(c0, c1, d0, d1, fl, fl + HALF, stairMat); } // landing
}
// upper floors with holes for the stairs
const holeOf = k => [EDGE[(2 * k + 2) % 4], EDGE[(2 * k + 3) % 4], CORNER[(2 * k + 3) % 4]];
for (let k = 1; k <= FLOORS; k++) {
  const hole = holeOf(k), cells = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const c = cellR(i, j); if (!hole.some(h => h.every((x, n) => x === c[n]))) cells.push(c); }
  if (k === FLOORS) cells.push(...rectMinus([-GA, GA, -GA, GA], [-LI, LI, -LI, LI]));
  for (const [u0, u1, v0, v1] of cells) lh(u0, u1, v0, v1, k * LH - .3, k * LH, k < FLOORS ? plank : ironMat);
}
flatPlane(LI * 2, LI * 2, decal({ map: tex(g => { noise(g, [150, 145, 135], 14); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }, LI, LI) }), LX, LAND_Y + .01, LZ);
for (const s of [-1, 1]) for (let i = -2.4; i <= 2.41; i += 1.2) { // brackets under the overhang
  const b1 = box(.8, .5, .25, ironMat); b1.position.set(LX + s * (LO + .4), GY - .55, LZ + i); add(b1);
  const b2 = box(.25, .5, .8, ironMat); b2.position.set(LX + i, GY - .55, LZ + s * (LO + .4)); add(b2);
}
// railing, too high to jump off
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
// lantern room, you can shoot through the glass
const LR = 1.1;
lh(-LR, LR, -LR, LR, GY, GY + .6, red);
building.solids.push({ mesh: null, minX: LX - LR, maxX: LX + LR, minZ: LZ - LR, maxZ: LZ + LR, bot: GY + .6, top: GY + 2.4 });
const glass = box(LR * 2 - .1, 1.8, LR * 2 - .1, new THREE.MeshLambertMaterial({ color: 0xcdeeff, transparent: true, opacity: .3, depthWrite: false }));
glass.position.set(LX, GY + 1.5, LZ); add(glass);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = box(.1, 1.8, .1, ironMat); p.position.set(LX + sx * (LR - .04), GY + 1.5, LZ + sz * (LR - .04)); add(p); }
const CY = GY + 2.9; // underside of the canopy
const chimney = box(1.3, CY - GY - 2.4, 1.3, ironMat); chimney.position.set(LX, (GY + 2.4 + CY) / 2, LZ); add(chimney);
// red canopy
for (const sx of [-1, 1]) for (const sz of [-1, 1]) addSlab(LX + sx * (GA - .12), LZ + sz * (GA - .12), .16, .16, GY, CY, ironMat);
const CW = GA + .3;
addSlab(LX, LZ, CW * 2, CW * 2, CY, CY + .25, red);
const roofM = new THREE.Mesh(new THREE.ConeGeometry(CW * Math.SQRT2, 2.2, 4), red); roofM.rotation.y = Math.PI / 4; roofM.position.set(LX, CY + .25 + 1.1, LZ); add(roofM);
standOn(LX, LZ, CW, CW, CY + .25, CY + .25, CY + 2.45, false, 'metal');
const knob = box(.3, .45, .3, ironMat); knob.position.set(LX, CY + .25 + 2.2 + .15, LZ); add(knob);
const LAMP_Y = GY + 1.4;
const stand = box(.36, LAMP_Y - .35 - (GY + .6), .36, ironMat); stand.position.set(LX, (GY + .6 + LAMP_Y - .35) / 2, LZ); add(stand); // the lamp sits on this
const standTop = box(.56, .08, .56, ironMat); standTop.position.set(LX, LAMP_Y - .39, LZ); add(standTop);
const lampM = box(.7, .7, .7, new THREE.MeshLambertMaterial({ color: 0xfff0b0, emissive: 0xffd060, emissiveIntensity: 1.3 })); lampM.position.set(LX, LAMP_Y, LZ); add(lampM);
const lampHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a0, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
lampHalo.scale.setScalar(2.8); lampHalo.position.set(LX, LAMP_Y, LZ); add(lampHalo);

// rocks round the lighthouse
const rockMat = surf(lam({ map: tex(g => { noise(g, [128, 122, 112], 30); g.fillStyle = 'rgba(70,60,50,.5)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) }), 'stone');
for (const [x, z, w, d, h] of [[26, -36.5, 3, 2.5, 1.2], [30, -37, 3.5, 2.2, 1.6], [33.5, -35, 2.6, 3, 1.4], [35.5, -31, 2.4, 3.2, 1.1],
  [34.5, -27.5, 2, 2, .8], [37.5, -34, 2.2, 2.4, .7], [23.5, -36, 1.8, 1.6, .9], [36.5, -38.5, 3, 2.6, 1.8], [32, -39.5, 2.4, 2, 1]]) addSlab(x, z, w, d, -SEA_D, h, rockMat); // down to the sea floor

// how bots and zombies get between floors
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
// next spot to walk to, or null to go straight there
M.nav = (p, t) => {
  const a = placeOf(p), b = placeOf(t);
  if (a === b) return null;
  if (a === -1) return inRect(p, [-.6, .6, LI - .2, LO + 1.9]) ? DOOR_IN : DOOR_OUT;
  if (a % 1) return b > a ? stop(a + .5) : stop(a - .5); // on the stairs: keep going up or down
  if (b > a) return near(p, stop(a)) ? stop(a + 1) : stop(a);
  if (a === 0) return near(p, DOOR_IN) ? DOOR_OUT : DOOR_IN;
  return near(p, stop(a)) ? stop(a - 1) : stop(a);
};

// --- the pool ---
const tile = surf(lam({ map: tex(g => { noise(g, [234, 226, 208], 9); g.fillStyle = '#c8bca6'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(8, 0, 1, 16); }) }), 'stone');
const drawPoolTile = g => { noise(g, [72, 172, 214], 10); g.fillStyle = '#e4f4fb'; for (const i of [0, 4, 8, 12]) { g.fillRect(0, i, 16, 1); g.fillRect(i, 0, 1, 16); } };
const poolTile = surf(lam({ map: tex(drawPoolTile) }), 'stone');
const DECK = [-24, -6, -8, 8], DECK_STEP = [-25, -5, -9, 9], RIM = .25, POOL_O = [POOL[0] - RIM, POOL[1] + RIM, POOL[2] - RIM, POOL[3] + RIM];
const DECK_Y = 1, DECK_STEP_Y = .5;
rectMinus(DECK, POOL_O).forEach(r => rectSlab(r, 0, DECK_Y, tile, true, 2));
rectMinus(DECK_STEP, DECK).forEach(r => rectSlab(r, 0, DECK_STEP_Y, tile, true, 2));
// pool walls
rectMinus(POOL_O, POOL).forEach(r => { rectSlab(r, POOL_F, POOL_Y - .1, poolTile, true, 2); rectSlab(r, POOL_Y - .1, DECK_Y, tile, true, 2); });
flatPlane(POOL[1] - POOL[0], POOL[3] - POOL[2], decal({ map: tex(drawPoolTile, (POOL[1] - POOL[0]) / 2, (POOL[3] - POOL[2]) / 2) }), (POOL[0] + POOL[1]) / 2, POOL_F + .01, 0);
const poolWater = flatPlane(POOL[1] - POOL[0], POOL[3] - POOL[2], waterMat([95, 205, 235], .6, 4, 3), (POOL[0] + POOL[1]) / 2, POOL_Y, 0);
// pool steps
const PS = { x0: POOL[0], x1: POOL[0] + 4, z0: -1.25, z1: 1.25 }, PSTEPS = 5;
building.solids.push({ mesh: null, minX: PS.x0, maxX: PS.x1, minZ: PS.z0, maxZ: PS.z1, bot: POOL_F, top: DECK_Y, ramp: { ax: 'x', a: PS.x1, b: PS.x0 }, surf: 'stone' });
for (let s = 0; s < PSTEPS; s++) {
  const w = (PS.x1 - PS.x0) / PSTEPS, h = (DECK_Y - POOL_F) * (PSTEPS - s) / PSTEPS;
  const m = tbox(w, h, PS.z1 - PS.z0, tile, 2); m.position.set(PS.x0 + w * (s + .5), POOL_F + h / 2, 0); add(m); building.cover.push(m);
}
const chrome = surf(plain(0xd6dde3), 'metal');
for (const z of [PS.z0 - .12, PS.z1 + .12]) { // handrails
  const up = box(.07, 1, .07, chrome); up.position.set(PS.x0 - .55, DECK_Y + .5, z); add(up);
  const top = box(.9, .07, .07, chrome); top.position.set(PS.x0 - .1, DECK_Y + 1, z); add(top);
  const down = box(.07, 1.3, .07, chrome); down.position.set(PS.x0 + .35, DECK_Y + .35, z); add(down);
}
// down in the pool
const POOL_LOW = p => inPool(p.x, p.z) && p.y < DECK_Y - .05;
const POOL_BOT = { x: PS.x1 + .7, z: 0 }, POOL_UP = { x: PS.x0 - 1.6, z: 0 };
const onSteps = p => p.x > PS.x0 && p.x < PS.x1 && p.z > PS.z0 && p.z < PS.z1;
// in the pool: head for the steps to get out
const poolNav = (p, t) => POOL_LOW(t) ? null : POOL_LOW(p) ? (Math.abs(p.z) < .8 && p.x < POOL_BOT.x + .2 ? POOL_UP : POOL_BOT) : onSteps(p) ? POOL_UP : null;
// out of the pool: walk round it
const ROUND = .7, CROSS = .4;
const PC = [[POOL_O[0] - ROUND, POOL_O[2] - ROUND], [POOL_O[1] + ROUND, POOL_O[2] - ROUND], [POOL_O[1] + ROUND, POOL_O[3] + ROUND], [POOL_O[0] - ROUND, POOL_O[3] + ROUND]].map(([x, z]) => ({ x, z }));
function crossesPool(a, b) { // does a to b pass over the water?
  const lo = [POOL[0] - CROSS, POOL[2] - CROSS], hi = [POOL[1] + CROSS, POOL[3] + CROSS], d = [b.x - a.x, b.z - a.z], s = [a.x, a.z];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 2; k++) {
    if (Math.abs(d[k]) < 1e-9) { if (s[k] <= lo[k] || s[k] >= hi[k]) return false; continue; }
    let u = (lo[k] - s[k]) / d[k], v = (hi[k] - s[k]) / d[k]; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 >= t1) return false;
  }
  return true;
}
function poolAround(p, t) {
  if (POOL_LOW(p) || onSteps(p)) return null;
  if (inPool(p.x, p.z, CROSS)) { // at the edge heading in: back off first
    const ds = [p.x - POOL[0] + CROSS, POOL[1] + CROSS - p.x, p.z - POOL[2] + CROSS, POOL[3] + CROSS - p.z], k = ds.indexOf(Math.min(...ds));
    const n = [[-1, 0], [1, 0], [0, -1], [0, 1]][k];
    if ((t.x - p.x) * n[0] + (t.z - p.z) * n[1] >= 0) return null;
    return { x: n[0] ? (n[0] < 0 ? POOL[0] : POOL[1]) + n[0] * 1.2 : p.x, z: n[1] ? (n[1] < 0 ? POOL[2] : POOL[3]) + n[1] * 1.2 : p.z };
  }
  if (!crossesPool(p, t)) return null;
  let best = null, bd = Infinity;
  for (const c of PC) {
    const dc = Math.hypot(c.x - p.x, c.z - p.z);
    if (dc < .5 || crossesPool(p, c)) continue; // already there, or blocked by the pool
    const d = dc + Math.hypot(t.x - c.x, t.z - c.z) + (crossesPool(c, t) ? 6 : 0);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// loungers and umbrellas
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
  standOn(x, z, 1.7, 1.7, y0 + 2.275, y0 + 2.275, y0 + 2.825, true);
}
let uc = 0;
for (const z of [-6.5, 6.5]) {
  for (const x of [-22.5, -19.5, -13.5, -10.5]) lounger(x, z, DECK_Y, 'z', z < 0 ? -1 : 1, towelCols[uc++ % towelCols.length]);
  umbrella(-16.5, z, DECK_Y, umbCols[uc % umbCols.length]); uc++;
}
for (const [x, z] of [[22, -7], [27, -7], [22, -1.5], [27, -1.5]]) {
  lounger(x, z - .95, 0, 'x', -1, towelCols[uc++ % towelCols.length]);
  lounger(x, z + .95, 0, 'x', -1, towelCols[uc++ % towelCols.length]);
  umbrella(x - 1.6, z, 0, umbCols[uc++ % umbCols.length]);
}

// open steps on two side boards, from the ground up to an edge
function openSteps(x, z, ax, dir, y, n, m, side) {
  const run = n * .5, k = y / run, end = run - Math.min(.3 / k, .5), len = end * Math.hypot(1, k), mid = y / n - .1 + k * end / 2 - .15 * Math.hypot(1, k); // the boards' top edge runs under the front of every step, stopping short of the top
  for (let k = 0; k < n; k++) { const o = dir * (n - k - .5) * .5, t = y * (k + 1) / n; addSlab(x + (ax ? o : 0), z + (ax ? 0 : o), ax ? .5 : 1.4, ax ? 1.4 : .5, t - .12, t, m); }
  for (const s of [-.76, .76]) {
    const r = box(ax ? len : .12, .3, ax ? .12 : len, side); r.position.set(x + (ax ? dir * (run - end / 2) : s), mid, z + (ax ? s : dir * (run - end / 2)));
    if (ax) r.rotation.z = -dir * Math.atan2(y, run); else r.rotation.x = dir * Math.atan2(y, run); add(r);
  }
}
// --- water slide ---
let slideFilm = null, slideAt = null;
const SL = { x0: -12, x1: -4.4, z0: 3, z1: 4.2, y0: 1, y1: 4.2 }, slideH = x => SL.y0 + (SL.y1 - SL.y0) * (x - SL.x0) / (SL.x1 - SL.x0);
{
  const TX = -3.2, TZ = 3.6, TY = SL.y1, R = 1.2, teal = surf(plain(0x2fb5b0), 'metal'), slideMat = surf(plain(0x3a8fe0), 'metal'), rim = plain(0xf2c230);
  addSlab(TX, TZ, R * 2, R * 2, TY - .2, TY, tile, true, 2);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addSlab(TX + a * (R - .1), TZ + b * (R - .1), .2, .2, 0, TY - .2, teal);
  for (const [x0, x1, z0, z1] of [[-R, R, -R, -R + .1], [-R, R, R - .1, R], [-R, -R + .1, -R, -.6], [-R, -R + .1, .6, R], [R - .1, R, -R, -.7], [R - .1, R, .7, R]]) // rails, open for the slide and the steps
    addSlab(TX + (x0 + x1) / 2, TZ + (z0 + z1) / 2, x1 - x0, z1 - z0, TY, TY + 1, rim);
  umbrella(TX, TZ - .6, TY, umbCols[0]);
  openSteps(TX + R, TZ, true, 1, TY, 10, plank, teal);
  const n = 10, w = (SL.x1 - SL.x0) / n; // the chute, in pieces so you can walk under its high end
  for (let k = 0; k < n; k++) {
    const a = SL.x0 + k * w, b = a + w, ya = slideH(a), yb = slideH(b);
    for (const [z0, z1, up] of [[SL.z0, SL.z1, 0], [SL.z0 - .15, SL.z0, .6], [SL.z1, SL.z1 + .15, .6]]) building.solids.push({ mesh: null, minX: a, maxX: b, minZ: z0, maxZ: z1, bot: ya + up, top: yb + up, ramp: { ax: 'x', a, b }, surf: 'metal' });
  }
  const len = Math.hypot(SL.x1 - SL.x0, SL.y1 - SL.y0), tilt = Math.atan2(SL.y1 - SL.y0, SL.x1 - SL.x0), mx = (SL.x0 + SL.x1) / 2, my = (SL.y0 + SL.y1) / 2;
  for (const [d, h, z, y, m] of [[SL.z1 - SL.z0, .1, (SL.z0 + SL.z1) / 2, -.05, slideMat], [.15, .7, SL.z0 - .075, .25, rim], [.15, .7, SL.z1 + .075, .25, rim]]) {
    const c = box(len, h, d, m); c.position.set(mx, my + y, z); c.rotation.z = tilt; add(c); building.cover.push(c);
  }
  const film = box(len, .02, SL.z1 - SL.z0 - .1, waterMat([150, 225, 245], .55, len / 2, 1)); film.position.set(mx, my + .01, (SL.z0 + SL.z1) / 2); film.rotation.z = tilt; add(film); slideFilm = film;
  for (const x of [-7, -9.8]) addSlab(x, (SL.z0 + SL.z1) / 2, .2, .2, x < -9 ? POOL_F : DECK_Y, slideH(x) - .12, teal); // legs
}
// sliding: pushes you down the chute, up to a speed the server allows
function slideTick(dt) {
  const p = P.pos, on = !dead && P.onGround && p.x > SL.x0 - .4 && p.x < SL.x1 && p.z > SL.z0 && p.z < SL.z1 && Math.abs(p.y - slideH(Math.max(p.x, SL.x0))) < .4; // till you're off the end
  if (!on || !dt) { slideAt = null; return; }
  const walk = slideAt === null ? 0 : (slideAt - p.x) / dt, push = Math.max(0, Math.min(8.5, 8.5 - walk));
  walkTo(p, p.x - push * dt, p.z, .35, true);
  if (p.x > SL.x0) p.y = slideH(Math.min(p.x + .35, SL.x1)); // ramps hold you at your uphill edge
  slideAt = p.x;
}
// --- lifeguard tower ---
{
  const GX = 27.5, GZ = -13, GY = 2.6, R = 1.3, rim = surf(paint([240, 238, 232]), 'wood');
  addSlab(GX, GZ, R * 2, R * 2, GY - .2, GY, plank);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addSlab(GX + a * (R - .15), GZ + b * (R - .15), .22, .22, 0, GY - .2, red);
  for (const [x0, x1, z0, z1] of [[-R, R, -R, -R + .1], [-R, R, R - .1, R], [R - .1, R, -R, R], [-R, -R + .1, -R, -.7], [-R, -R + .1, .7, R]])
    addSlab(GX + (x0 + x1) / 2, GZ + (z0 + z1) / 2, x1 - x0, z1 - z0, GY, GY + .9, rim);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addSlab(GX + a * (R - .05), GZ + b * (R - .05), .1, .1, GY + .9, GY + 2.3, rim, false);
  addSlab(GX, GZ, R * 2 + .4, R * 2 + .4, GY + 2.3, GY + 2.5, red); // flat roof
  openSteps(GX - R, GZ, true, -1, GY, 6, plank, red);
}

// --- tiki bar ---
const wood = surf(lam({ map: tex(g => { noise(g, [140, 96, 58], 18); g.fillStyle = 'rgba(50,28,12,.4)'; for (const x of [0, 5, 10]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const thatch = lam({ map: tex(g => { noise(g, [200, 164, 92], 26); g.fillStyle = 'rgba(120,85,40,.55)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 4); }) });
// a pyramid roof with its texture at the usual pixel size (a stretched cone looked blurry and low detail)
function pyramid(w, d, h, m, k = 1) {
  const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], pos = [], uv = [];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = c[i], [bx, bz] = c[(i + 1) % 4], e = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / e, uz = (bz - az) / e;
    const tu = -ax * ux - az * uz, sl = Math.hypot(Math.abs(ax * uz - az * ux), h); // apex along the edge, slope length
    pos.push(bx, 0, bz, ax, 0, az, 0, h, 0); uv.push(e / k, 0, 0, 0, tu / k, sl / k);
  }
  pos.push(-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2); // underside
  uv.push(0, 0, w / k, 0, w / k, d / k, 0, 0, w / k, d / k, 0, d / k);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}
const BX = 0, BZ = -18;
addSlab(BX, BZ + 2, 6.4, .6, 0, 1.1, wood);
for (const s of [-1, 1]) addSlab(BX + s * 2.9, BZ + .4, .6, 2.6, 0, 1.1, wood); // gaps so you can walk behind the bar
const counterTop = box(7, .1, 1, plain(0x6a4428)); counterTop.position.set(BX, 1.15, BZ + 2); add(counterTop);
addSlab(BX, BZ - 2.2, 6.4, .5, 0, 1.6, wood);
const bottleCols = [0x3a7a3a, 0x8a3a1a, 0xd8d0b0, 0x2a5a8a, 0xb04a2a, 0x5a3a7a];
for (let i = 0; i < 11; i++) { const b = box(.12, .32 + (i % 3) * .06, .12, plain(bottleCols[i % bottleCols.length])); b.position.set(BX - 2.7 + i * .54, 1.76 + (i % 3) * .03, BZ - 2.2); add(b); }
for (const sx of [-1, 1]) for (const sz of [-1, 1]) addSlab(BX + sx * 3.3, BZ + .1 + sz * 2.55, .3, .3, 0, 3, wood);
const barRoof = tbox(8, .25, 6.6, thatch); barRoof.position.set(BX, 3.125, BZ); add(barRoof); building.cover.push(barRoof);
const barTop = pyramid(8.6, 7.2, 1.9, thatch); barTop.position.set(BX, 3.25, BZ); add(barTop);
standOn(BX, BZ, 4.3, 3.6, 3, 3.25, 5.15, false, 'wood'); // the thatch, up to its peak
for (const x of [-2.2, -.7, .8, 2.3]) { addSlab(BX + x, BZ + 3, .45, .45, 0, .6, wood); const seat = box(.55, .08, .55, plain(0xc0392b)); seat.position.set(BX + x, .64, BZ + 3); add(seat); }

// --- beach huts ---
function hut(x, z, face) { // face = door direction
  addSlab(x, z, 3.2, 3.2, 0, 2.6, wood);
  const r = pyramid(4.1, 4.1, 1.7, thatch); r.position.set(x, 2.6, z); add(r); building.cover.push(r);
  standOn(x, z, 2.9 / Math.SQRT2, 2.9 / Math.SQRT2, 2.6, 2.6, 4.3, false, 'wood');
  const door = box(face[0] ? .04 : 1, 1.9, face[0] ? 1 : .04, plain(0x4a2e18)); door.position.set(x + face[0] * 1.61, .95, z + face[1] * 1.61); add(door);
  for (const s of [-1, 1]) { // windows
    const w = box(face[0] ? .04 : .6, .6, face[0] ? .6 : .04, plain(0x2c4a5a));
    w.position.set(x + face[0] * 1.61 + (face[0] ? 0 : s * 1), 1.6, z + face[1] * 1.61 + (face[0] ? s * 1 : 0)); add(w);
  }
}
for (const [x, z, face] of HUTS) hut(x, z, face);

// --- the hotel ---
const HX0 = -38, HX1 = -30, HZ0 = -6, HZ1 = 6, HT = .3, RH = 3.4, RT = 3.7; // footprint, walls, ceiling, roof
const stucco = surf(lam({ map: tex(g => { noise(g, [244, 238, 226], 10); g.fillStyle = 'rgba(0,0,0,.05)'; for (const y of [5, 11]) g.fillRect(0, y, 16, 1); }) }), 'stone');
const teal = plain(0x2fb5a8);
// walls, windows too short to climb through
const H_DOOR = [0, 2.4, 0, 2.6], hWin = c => [c, 1.6, 1, 2.4];
const H_WALLS = { E: [hWin(-3.6), H_DOOR, hWin(3.6)], W: [hWin(-3), hWin(3)], N: [], S: [hWin(-35.5), hWin(-32.5)] };
for (const [side, holes] of Object.entries(H_WALLS)) {
  const ns = side === 'N' || side === 'S', lo = ns ? HX0 : HZ0 + HT, hi = ns ? HX1 : HZ1 - HT; // N and S walls cover the corners
  const piece = (a0, a1, b, t) => {
    if (a1 - a0 < .01 || t - b < .01) return;
    if (side === 'N') addSlab((a0 + a1) / 2, HZ0 + HT / 2, a1 - a0, HT, b, t, stucco); else if (side === 'S') addSlab((a0 + a1) / 2, HZ1 - HT / 2, a1 - a0, HT, b, t, stucco);
    else addSlab(side === 'W' ? HX0 + HT / 2 : HX1 - HT / 2, (a0 + a1) / 2, HT, a1 - a0, b, t, stucco);
  };
  let a = lo;
  for (const [c, ow, ob, ot] of holes) { piece(a, c - ow / 2, 0, RH); piece(c - ow / 2, c + ow / 2, 0, ob); piece(c - ow / 2, c + ow / 2, ot, RH); a = c + ow / 2; }
  piece(a, hi, 0, RH);
}
addSlab((HX0 + HX1) / 2, (HZ0 + HZ1) / 2, HX1 - HX0, HZ1 - HZ0, RH, RT, stucco); // the roof
for (const s of [-1, 1]) { // teal trim
  const bx = box(HX1 - HX0 + .06, .22, .04, teal); bx.position.set((HX0 + HX1) / 2, RH - .3, s < 0 ? HZ0 - .01 : HZ1 + .01); add(bx);
  const bz = box(.04, .22, HZ1 - HZ0 + .06, teal); bz.position.set(s < 0 ? HX0 - .01 : HX1 + .01, RH - .3, (HZ0 + HZ1) / 2); add(bz);
}
flatPlane(HX1 - HX0 - HT * 2, HZ1 - HZ0 - HT * 2, decal({ map: tex(g => { noise(g, [226, 214, 190], 8); g.fillStyle = '#bfae8e'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }, 4, 6) }), (HX0 + HX1) / 2, LAND_Y + .01, (HZ0 + HZ1) / 2);
// door canopy you can stand on
{
  const X0 = HX1, X1 = -27.25, CZ = 2.6, BOT = 2.95, TOP = 3.2, cx = (X0 + X1) / 2, w = X1 - X0;
  addSlab(cx, 0, w, CZ * 2, BOT, TOP, stucco);
  const stripes = tex(g => { for (let i = 0; i < 16; i++) { g.fillStyle = (i >> 1) % 2 ? '#f6f3ea' : '#2fb5a8'; g.fillRect(0, i, 16, 1); } }, 1, CZ);
  flatPlane(w - .1, CZ * 2 - .1, decal({ map: stripes }), cx, TOP + .005, 0);
  const fascia = box(.08, .34, CZ * 2 + .16, teal); fascia.position.set(X1 + .04, (BOT + TOP) / 2, 0); add(fascia);
  for (const s of [-1, 1]) { const f = box(w + .08, .34, .08, teal); f.position.set(cx + .04, (BOT + TOP) / 2, s * (CZ + .04)); add(f); }
  for (const z of [-1.1, 1.1]) { // lights
    const l = box(.32, .04, .32, new THREE.MeshLambertMaterial({ color: 0xfff4d0, emissive: 0xffe2a0, emissiveIntensity: .9 })); l.position.set(cx + .2, BOT - .02, z); add(l);
  }
  const PY = 0;
  for (const s of [-1, 1]) {
    const px = X1 - .32, pz = s * (CZ - .32);
    addSlab(px, pz, .3, .3, PY, BOT, stucco);
    const base = box(.46, .18, .46, stucco); base.position.set(px, PY + .09, pz); add(base);
    const cap = box(.46, .16, .46, stucco); cap.position.set(px, BOT - .08, pz); add(cap);
    const band = box(.34, .1, .34, teal); band.position.set(px, BOT - .26, pz); add(band);
  }
}
// reception desk, sofa and plants
addSlab(-36.6, 0, .7, 3, 0, 1.05, wood);
const desk = box(.9, .08, 3.2, plain(0x6a4428)); desk.position.set(-36.6, 1.09, 0); add(desk);
const keyBoard = box(.04, .9, 2.2, teal); keyBoard.position.set(HX0 + HT + .02, 1.9, 0); add(keyBoard);
for (let i = 0; i < 8; i++) { const k = box(.03, .1, .06, plain(0xe8c860)); k.position.set(HX0 + HT + .05, 1.7 + (i >> 2) * .35, -.75 + (i % 4) * .5); add(k); }
const sofaMat = plain(0x3a7fa8);
addSlab(-33.5, 5.1, 2.6, .9, 0, .45, sofaMat); addSlab(-33.5, 5.55, 2.6, .3, .45, 1, sofaMat);
for (const z of [-4.9, 4.9]) {
  addSlab(HX1 - HT - .45, z, .5, .5, 0, .55, surf(plain(0xb5653a), 'stone'));
  const leaves = box(.8, .9, .8, leafMat); leaves.position.set(HX1 - HT - .45, 1, z); add(leaves);
  standOn(HX1 - HT - .45, z, .4, .4, .55, 1.45, 1.45, false, 'grass');
}
// roof terrace
const PH = .8, PT = .25, H_GAP = -36;
addSlab(HX1 - PT / 2, (HZ0 + HZ1) / 2, PT, HZ1 - HZ0, RT, RT + PH, stucco);
addSlab(HX0 + PT / 2, (HZ0 + HZ1) / 2, PT, HZ1 - HZ0, RT, RT + PH, stucco);
addSlab((HX0 + HX1) / 2, HZ1 - PT / 2, HX1 - HX0 - PT * 2, PT, RT, RT + PH, stucco);
addSlab((H_GAP + HX1) / 2, HZ0 + PT / 2, HX1 - PT - H_GAP, PT, RT, RT + PH, stucco);
lounger(-33, 3.2, RT, 'x', -1, towelCols[0]); lounger(-33, 1.2, RT, 'x', -1, towelCols[1]);
umbrella(-35.4, 2.2, RT, umbCols[1]);
addSlab(-33.5, -3, 1.6, 1.2, RT, RT + 1.1, surf(plain(0x9aa0a6), 'metal'));
// stairs up the north wall
const HS = { x0: H_GAP, x1: -29, z0: -7.4, z1: HZ0 }, HSTEPS = 10;
addSlab((HX0 + H_GAP) / 2, (HS.z0 + HS.z1) / 2, H_GAP - HX0, HS.z1 - HS.z0, 0, RT, stucco); // the landing
building.solids.push({ mesh: null, minX: HS.x0, maxX: HS.x1, minZ: HS.z0, maxZ: HS.z1, bot: 0, top: RT, ramp: { ax: 'x', a: HS.x1, b: HS.x0 }, surf: 'stone' });
for (let s = 0; s < HSTEPS; s++) {
  const w = (HS.x1 - HS.x0) / HSTEPS, h = RT * (HSTEPS - s) / HSTEPS;
  const m = tbox(w, h, HS.z1 - HS.z0, stucco); m.position.set(HS.x0 + w * (s + .5), h / 2, (HS.z0 + HS.z1) / 2); add(m); building.cover.push(m);
}
// how bots and zombies get in and up
const H_IN = { x: HX1 - 1.3, z: 0 }, H_OUT = { x: HX1 + 1, z: 0 };
const H_SB = { x: HS.x1 + .6, z: (HS.z0 + HS.z1) / 2 }, H_ST = { x: (HX0 + H_GAP) / 2, z: (HS.z0 + HS.z1) / 2 }, H_RE = { x: (HX0 + H_GAP) / 2, z: HZ0 + 1.4 };
const inside = (x, z) => x > HX0 + HT && x < HX1 - HT && z > HZ0 + HT && z < HZ1 - HT;
function hotelPlace(p) {
  if (inside(p.x, p.z) && p.y < RH - 1) return 'in';
  if (p.x > HX0 - .3 && p.x < HX1 + .3 && p.z > HZ0 - .3 && p.z < HZ1 + .3 && p.y > RT - .6) return 'roof';
  if (p.x > HX0 && p.x < HS.x1 && p.z > HS.z0 && p.z < HS.z1 && p.y > .3) return 'stair';
  return 'out';
}
function hotelNav(p, t) {
  const a = hotelPlace(p), b = hotelPlace(t);
  if (a === b) return null;
  if (a === 'in') return near(p, H_IN) ? H_OUT : H_IN;
  if (a === 'out') return b === 'in' ? (near(p, H_OUT) ? H_IN : H_OUT) : near(p, H_SB) ? H_ST : H_SB;
  if (a === 'stair') return b === 'roof' ? (p.x < H_GAP + .5 ? H_RE : H_ST) : H_SB;
  return H_ST; // on the roof: to the stairs
}

// --- volleyball court ---
const PIT = [.5, 15.5, 16.5, 27.5];
flatPlane(PIT[1] - PIT[0], PIT[3] - PIT[2], decal({ map: tex(drawSand, PIT[1] - PIT[0], PIT[3] - PIT[2]) }), 8, LAND_Y + .01, 22);
for (const [w, d, x, z] of [[15.2, .2, 8, PIT[2]], [15.2, .2, 8, PIT[3]], [.2, 11.2, PIT[0], 22], [.2, 11.2, PIT[1], 22]]) {
  const b = box(w, .12, d, wood); b.position.set(x, .06, z); add(b);
}
const lineMat = decal({ color: 0xffffff });
for (const [w, d, x, z] of [[12, .12, 8, 18], [12, .12, 8, 26], [.12, 8, 2, 22], [.12, 8, 14, 22]]) flatPlane(w, d, lineMat, x, LAND_Y + .015, z);
for (const z of [18, 26]) addSlab(8, z, .15, .15, 0, 2.6, plain(0xdcdcdc));
const net = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), seeThru(tex(g => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 16, 2); for (let i = 0; i < 16; i += 4) { g.fillRect(i, 0, 1, 16); g.fillRect(0, i, 16, 1); } }, 8, 1)));
net.rotation.y = Math.PI / 2; net.position.set(8, 2, 22); add(net);
const ball = box(.3, .3, .3, plain(0xf4f0e0)); ball.position.set(10.5, .15, 20.4); add(ball);

// --- pier and boats ---
const PZ = 12, PX0 = 18, PX1 = 60, PW = 3;
building.solids.push({ mesh: null, minX: PX0, maxX: PX1, minZ: PZ - PW / 2, maxZ: PZ + PW / 2, bot: 0, top: .5, surf: 'wood' });
const pierDeck = tbox(PX1 - PX0, .12, PW, plank); pierDeck.position.set((PX0 + PX1) / 2, .44, PZ); add(pierDeck); building.cover.push(pierDeck);
for (let x = PX0 + .4; x < PX1; x += 3) for (const s of [-1, 1]) { const p = box(.26, SEA_D + .5, .26, wood); p.position.set(x, (.5 - SEA_D) / 2, PZ + s * (PW / 2 - .15)); add(p); building.cover.push(p); } // posts
for (const x of [26, 34, 40]) for (const s of [-1, 1]) addSlab(x, PZ + s * 1.25, .3, .3, .5, .85, ironMat); // bollards
const hullBlue = plain(0x1f4e8c), hullWhite = plain(0xf6f6f2), seatMat = plain(0xd8cfb8), navy = plain(0x14284a), glassDark = plain(0x1b2a3a);
const chromeM = plain(0xdfe5ea), blackM = plain(0x222326), accentM = plain(0xe8505a);
// boat hull outline from above
function hullShape(L, W, bow, stern = 0, ox = 0, hole = false) {
  const s = hole ? new THREE.Path() : new THREE.Shape(), h = W / 2;
  s.moveTo(ox + stern, -h); s.lineTo(ox + L - bow, -h);
  s.quadraticCurveTo(ox + L - bow * .15, -h, ox + L, 0);
  s.quadraticCurveTo(ox + L - bow * .15, h, ox + L - bow, h);
  s.lineTo(ox + stern, h);
  if (stern) { s.quadraticCurveTo(ox + stern * .15, h, ox, 0); s.quadraticCurveTo(ox + stern * .15, -h, ox + stern, -h); }
  else s.lineTo(ox, -h);
  return s;
}
// hull piece from y0 to y1
function hullPiece(shape, y0, y1, m, x, z, cover = true) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 12 }).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y0, z); add(mesh);
  if (cover) building.cover.push(mesh);
  return mesh;
}
const rim = (L, W, bow, t) => { const s = hullShape(L, W, bow); s.holes.push(hullShape(L - t * 2.5, W - t * 2, bow - t * 1.5, 0, t, true)); return s; };
// a thin rod from a to b ([x, y, z])
function rod(a, b, m, t = .05) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), r = box(t, t, L, m);
  r.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); r.lookAt(b[0], b[1], b[2]); add(r); return r;
}
// bow rail
function bowRail(L, W, bow, x, z, y0, y, from) {
  const pts = hullShape(L, W, bow).getPoints(8).filter((p, k, all) => p.x >= from && !(k && p.distanceTo(all[k - 1]) < .01)).map(p => [x + p.x, z - p.y]);
  for (let k = 0; k < pts.length - 1; k++) rod([pts[k][0], y, pts[k][1]], [pts[k + 1][0], y, pts[k + 1][1]], chromeM, .045);
  pts.forEach(([px, pz], k) => { if (k % 2 === 0 || k === pts.length - 1) rod([px, y0, pz], [px, y, pz], chromeM, .045); });
}

// speedboat you can walk onto
const SB = { x0: 35, x1: 40.6, z: 15.25, w: 2.4 };
const sbx = (SB.x0 + SB.x1) / 2, sL = 6.45, sBow = 2.1;
building.solids.push({ mesh: null, minX: SB.x0, maxX: SB.x1, minZ: SB.z - SB.w / 2, maxZ: SB.z + SB.w / 2, bot: 0, top: 1 });
building.solids.push({ mesh: null, minX: SB.x1, maxX: SB.x1 + 1, minZ: SB.z - .7, maxZ: SB.z + .7, bot: 0, top: 1 });
// hull
hullPiece(hullShape(sL - .35, SB.w - .6, sBow - .1), -.4, .15, hullBlue, SB.x0 + .15, SB.z);
hullPiece(hullShape(sL, SB.w, sBow), .15, .56, hullBlue, SB.x0, SB.z);
hullPiece(hullShape(sL + .1, SB.w + .1, sBow + .05), .56, .65, navy, SB.x0 - .05, SB.z, false);
hullPiece(hullShape(sL, SB.w, sBow), .65, 1, hullWhite, SB.x0, SB.z);
hullPiece(hullShape(sL + .04, SB.w + .04, sBow + .02), .8, .86, accentM, SB.x0 - .02, SB.z, false);
hullPiece(rim(sL, SB.w, sBow, .16), 1, 1.15, hullWhite, SB.x0, SB.z, false);
hullPiece(hullShape(sL - .4, SB.w - .32, sBow - .24, 0, .16), 1, 1.01, plank, SB.x0, SB.z, false); // teak floor
hullPiece(hullShape(sBow + .1, SB.w, sBow), 1, 1.13, hullWhite, SB.x0 + sL - sBow - .1, SB.z, false); // the foredeck
bowRail(sL - .24, SB.w - .2, sBow - .14, SB.x0 + .1, SB.z, 1.13, 1.42, sL - sBow - .5);
// steering console
addSlab(sbx + .9, SB.z - .4, .8, .7, 1, 1.75, hullWhite);
const dash = box(.5, .08, .66, blackM); dash.rotation.z = .5; dash.position.set(sbx + .95, 1.79, SB.z - .4); add(dash);
const wheel = new THREE.Mesh(new THREE.TorusGeometry(.17, .03, 6, 14), blackM); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = .5; wheel.position.set(sbx + .44, 1.78, SB.z - .4); add(wheel);
rod([sbx + .44, 1.78, SB.z - .4], [sbx + .6, 1.7, SB.z - .4], blackM, .05);
rod([sbx + .7, 1.75, SB.z - .02], [sbx + .6, 1.92, SB.z - .02], chromeM, .05);
{
  const ws = new THREE.Group(), pane = box(.04, .5, SB.w - .5, new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: .4, depthWrite: false }));
  pane.position.y = .25; ws.add(pane);
  const top = box(.06, .06, SB.w - .44, chromeM); top.position.y = .51; ws.add(top);
  for (const s of [-1, 1]) { const p = box(.06, .52, .06, chromeM); p.position.set(0, .26, s * (SB.w / 2 - .22)); ws.add(p); }
  ws.position.set(sbx + 1.5, 1.13, SB.z); ws.rotation.z = .45; add(ws);
}
for (const s of [-1, 1]) { // seats
  const z = SB.z + s * .45, sx = sbx + .05;
  const post = box(.18, .3, .18, chromeM); post.position.set(sx, 1.15, z); add(post);
  const cush = box(.55, .14, .5, hullWhite); cush.position.set(sx, 1.37, z); add(cush);
  const back = box(.14, .5, .5, hullWhite); back.position.set(sx - .27, 1.67, z); add(back);
  const pip = box(.56, .03, .4, hullBlue); pip.position.set(sx, 1.45, z); add(pip);
}
// back bench
addSlab(sbx - 1.4, SB.z, .8, SB.w - .5, 1, 1.32, hullWhite);
const benchC = box(.78, .1, SB.w - .52, seatMat); benchC.position.set(sbx - 1.4, 1.37, SB.z); add(benchC);
const benchB = box(.16, .42, SB.w - .52, seatMat); benchB.position.set(SB.x0 + .3, 1.62, SB.z); add(benchB);
// outboard motor
{
  const mx = SB.x0 - .38, motorM = plain(0x2a2a2e);
  const bracket = box(.3, .3, .5, motorM); bracket.position.set(SB.x0 - .1, .95, SB.z); add(bracket);
  const cowl = box(.62, .56, .56, motorM); cowl.position.set(mx, 1.35, SB.z); add(cowl); building.cover.push(cowl);
  const cap = box(.5, .12, .46, motorM); cap.position.set(mx, 1.69, SB.z); add(cap);
  const band = box(.64, .08, .58, hullWhite); band.position.set(mx, 1.2, SB.z); add(band);
  const leg = box(.22, 1.5, .18, motorM); leg.position.set(mx + .05, .32, SB.z); add(leg);
  const plate = box(.55, .04, .32, motorM); plate.position.set(mx + .05, -.2, SB.z); add(plate);
  for (let i = 0; i < 3; i++) { const b = box(.04, .34, .1, chromeM); b.position.set(mx - .14, -.36, SB.z); b.rotation.x = i * 2.094; add(b); }
}
// lights, cleats, fenders and ropes
for (const [s, c] of [[-1, 0xe03a3a], [1, 0x3ad06a]]) { const l = box(.12, .08, .04, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: .6 })); l.position.set(SB.x0 + sL - sBow + .1, 1.06, SB.z + s * (SB.w / 2 + .01)); add(l); }
for (const [cx, cz] of [[SB.x0 + .3, SB.z - SB.w / 2 + .12], [SB.x0 + .3, SB.z + SB.w / 2 - .12], [SB.x0 + sL - .9, SB.z - .2]]) { const c = box(.22, .06, .07, chromeM); c.position.set(cx, 1.18, cz); add(c); }
for (const fx of [36.6, 39.2]) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .5, 8), hullWhite); f.position.set(fx, .55, SB.z - SB.w / 2 - .1); add(f);
  rod([fx, .8, SB.z - SB.w / 2 - .1], [fx, 1.15, SB.z - SB.w / 2 + .05], plain(0xe8dcc0), .03);
}
const ropeM = plain(0xd8c8a0);
rod([SB.x0 + sL - .9, 1.2, SB.z - .2], [40, .85, PZ + 1.25], ropeM, .04);
rod([SB.x0 + .3, 1.2, SB.z - SB.w / 2 + .12], [34, .85, PZ + 1.25], ropeM, .04);

// yacht, out of reach
{
  const X0 = 46.6, Z = 7, L = 14.6, W = 4, BOW = 5;
  hullPiece(hullShape(L - .6, W - .8, BOW - .4), -.4, .3, navy, X0 + .3, Z, false);
  hullPiece(hullShape(L, W, BOW), .3, 1.7, hullWhite, X0, Z, false);
  hullPiece(hullShape(L + .04, W + .04, BOW + .02), .32, .52, hullBlue, X0 - .02, Z, false); // stripes
  hullPiece(hullShape(L + .03, W + .03, BOW + .01), 1.5, 1.56, hullBlue, X0 - .015, Z, false);
  hullPiece(rim(L, W, BOW, .2), 1.7, 1.9, hullWhite, X0, Z, false);
  hullPiece(hullShape(L - .5, W - .4, BOW - .3, 0, .2), 1.7, 1.72, plank, X0, Z, false);
  for (const s of [-1, 1]) { // windows and portholes
    const win = box(4.2, .26, .02, glassDark); win.position.set(X0 + 4, 1.12, Z + s * (W / 2 + .01)); add(win);
    for (const px of [7.1, 7.9, 8.7]) { const p = new THREE.Mesh(new THREE.CircleGeometry(.12, 10), glassDark); p.position.set(X0 + px, 1.12, Z + s * (W / 2 + .012)); if (s < 0) p.rotation.y = Math.PI; add(p); }
    const anchor = box(.3, .34, .04, blackM); anchor.position.set(X0 + L - 1.6, 1.25, Z + s * (W / 2 - .25 + .02)); add(anchor);
  }
  // swim platform
  const plat = box(1, .12, W - .6, plank); plat.position.set(X0 - .5, .55, Z); add(plat);
  for (const s of [-1, 1]) rod([X0 - .8, .1, Z + s * .3], [X0 - .8, .95, Z + s * .3], chromeM, .045);
  for (const y of [.25, .45]) rod([X0 - .8, y, Z - .3], [X0 - .8, y, Z + .3], chromeM, .04);
  // cabin
  hullPiece(hullShape(7.6, 3.2, 2.4), 1.72, 3, hullWhite, X0 + 1.8, Z, false);
  hullPiece(hullShape(7.64, 3.24, 2.42), 2.15, 2.7, glassDark, X0 + 1.78, Z, false);
  hullPiece(hullShape(8.6, 3.6, 2.6), 3, 3.14, hullWhite, X0 + 1, Z, false);
  // flybridge and radar arch
  hullPiece(hullShape(4.4, 3, 1.4), 3.14, 3.7, hullWhite, X0 + 2, Z, false);
  hullPiece(hullShape(4.44, 3.04, 1.42), 3.45, 3.62, glassDark, X0 + 1.98, Z, false);
  bowRail(4.4, 3, 1.4, X0 + 2, Z, 3.7, 4.1, 1.2);
  for (const s of [-1, 1]) { const leg = rod([X0 + 2.2, 3.7, Z + s * 1.3], [X0 + 2.6, 5, Z + s * 1.15], hullWhite, .26); }
  const bar = box(.45, .24, 2.6, hullWhite); bar.position.set(X0 + 2.6, 5.05, Z); add(bar);
  const radar = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .26, 14), hullWhite); radar.position.set(X0 + 2.6, 5.3, Z - .5); add(radar);
  rod([X0 + 2.6, 5.15, Z + .7], [X0 + 2.6, 6.6, Z + .7], blackM, .04);
  rod([X0 + 2.6, 5.15, Z + .95], [X0 + 2.6, 6.1, Z + .95], blackM, .04);
  // bow rail, flag, table, life ring
  bowRail(L - .3, W - .25, BOW - .2, X0 + .12, Z, 1.9, 2.4, L - BOW - 1.6);
  rod([X0 + .2, 1.9, Z + 1.4], [X0 + .2, 3.1, Z + 1.4], chromeM, .04);
  const flag = box(.6, .36, .02, accentM); flag.position.set(X0 - .1, 2.9, Z + 1.4); add(flag);
  const flagW = box(.6, .12, .025, hullWhite); flagW.position.set(X0 - .1, 2.9, Z + 1.4); add(flagW);
  const table = box(.9, .06, .9, plank); table.position.set(X0 + 1, 2.45, Z); add(table);
  rod([X0 + 1, 1.72, Z], [X0 + 1, 2.42, Z], chromeM, .08);
  const bench = box(.5, .4, W - 1, seatMat); bench.position.set(X0 + .4, 1.92, Z); add(bench);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.28, .08, 6, 14), plain(0xff7a2a)); ring.rotation.y = Math.PI / 2; ring.position.set(X0 + 1.76, 2.45, Z + 1.05); add(ring);
}

// upside-down rowboat
{
  const X0 = 13.9, Z = 35.5, L = 4.2, W = 1.7;
  for (const [w, d, y0, y1] of [[4, 1.6, 0, .5], [3.4, 1, .5, .8]]) building.solids.push({ mesh: null, minX: 16 - w / 2, maxX: 16 + w / 2, minZ: Z - d / 2, maxZ: Z + d / 2, bot: y0, top: y1, surf: 'wood' });
  const boards = c => lam({ map: tex(g => { noise(g, c, 14); g.fillStyle = 'rgba(0,0,0,.2)'; for (const y of [0, 5, 10]) g.fillRect(0, y, 16, 1); }) });
  hullPiece(hullShape(L + .06, W + .06, 1.3, 1.1, -.03), 0, .12, plank, X0, Z);
  hullPiece(hullShape(L, W, 1.3, 1.1), .12, .42, boards([92, 168, 176]), X0, Z);
  hullPiece(hullShape(L - .2, W - .25, 1.2, 1, .1), .42, .62, boards([170, 64, 44]), X0, Z);
  hullPiece(hullShape(L - .6, W - .7, 1, .85, .3), .62, .78, boards([170, 64, 44]), X0, Z);
  const keel = box(L - .5, .08, .1, plain(0x4a2e18)); keel.position.set(X0 + L / 2, .82, Z); add(keel);
  for (const [oz, ry] of [[Z + 1.35, .08], [Z + 1.7, -.05]]) {
    const oar = new THREE.Group(), wd = plain(0xb08a58);
    const shaft = box(2.3, .07, .07, wd); oar.add(shaft);
    const blade = box(.6, .03, .2, wd); blade.position.x = 1.4; oar.add(blade);
    const grip = box(.25, .08, .08, plain(0x6a4428)); grip.position.x = -1.2; oar.add(grip);
    oar.position.set(X0 + L / 2, .045, oz); oar.rotation.y = ry; add(oar);
  }
}
// --- palm trees ---
const trunkMat = lam({ map: tex(g => { noise(g, [158, 124, 84], 16); g.fillStyle = 'rgba(80,55,30,.55)'; for (const y of [0, 5, 10]) g.fillRect(0, y, 16, 2); }) });
const frondMat = seeThru(tex(g => {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    const w = y < 2 ? 2 : y > 13 ? 3 : 7;
    for (let x = 8 - w; x < 8 + w; x++) {
      if ((x + y) % 3 === 0 && Math.abs(x - 7.5) > 1) continue;
      g.fillStyle = Math.abs(x - 7.5) < 1 ? '#5a7a2a' : `rgb(${60 + (x * 7 + y * 3) % 30},${130 + (x * 5 + y * 11) % 40},${40 + (x * 3) % 20})`;
      g.fillRect(x, y, 1, 1);
    }
  }
}));
const frondGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, 0, .5); // lies flat along +z
const PALM_TINTS = [0xffffff, 0xe6f2c8, 0xd4e8b0, 0xf2ffe0];
function inst(geo, mat, list) { // like instanced(), but things can tip
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); o.rotation.order = 'YXZ';
  list.forEach(([x, y, z, sx, sy, sz, rx, ry, c], i) => {
    o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix();
    m.setMatrixAt(i, o.matrix); m.setColorAt(i, tint.setHex(c ?? 0xffffff));
  });
  m.computeBoundingSphere(); add(m); return m;
}
const trunksIn = [], trunksOut = [], fronds = [], nuts = [], palms = [];
function palm(x, z, inside, y0 = 0) { // y0 = ground height
  const h = 5.5 + rnd() * 3, a = rnd() * 6.28, lean = .8 + rnd() * 1.6, n = 9, out = inside ? trunksIn : trunksOut, top = y0 + h;
  let tx = x, tz = z; const segs = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), s = .6 - f * .2;
    tx = x + Math.cos(a) * lean * f * f; tz = z + Math.sin(a) * lean * f * f;
    out.push([tx, y0 + h * (i + .5) / n, tz, s, h / n + .03, s, 0, 0, 0xffffff]);
    segs.push([tx, tz, y0 + h * i / n, y0 + h * (i + 1) / n, s]);
  }
  if (inside) {
    // trunk solids follow its lean, then the crown
    for (let i = 0; i < n;) {
      let j = i; const xs = [segs[i][0]], zs = [segs[i][1]];
      while (j + 1 < n && Math.max(...xs, segs[j + 1][0]) - Math.min(...xs, segs[j + 1][0]) <= .3 && Math.max(...zs, segs[j + 1][1]) - Math.min(...zs, segs[j + 1][1]) <= .3) { j++; xs.push(segs[j][0]); zs.push(segs[j][1]); }
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), w = segs[i][4] + .1;
      const sol = addSolid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + w, z1 - z0 + w, Math.min(segs[j][3], top - .25)); sol.bot = segs[i][2]; sol.palm = true;
      i = j + 1;
    }
    standOn(tx, tz, 1.6, 1.6, top - .25, top + .1, top + .1, true, 'grass');
  }
  const k = 8 + (rnd() * 3 | 0), spin = rnd() * 6.28, c = PALM_TINTS[rnd() * PALM_TINTS.length | 0];
  for (let i = 0; i < k; i++) {
    const ry = spin + i * 6.28 / k + (rnd() - .5) * .3, L1 = 1.4 + rnd() * .5, L2 = 1.5 + rnd() * .7, p1 = -.25 + rnd() * .3, p2 = .7 + rnd() * .4;
    fronds.push([tx, top, tz, 1.1, 1, L1, p1, ry, c]);
    const ex = tx + Math.sin(ry) * Math.cos(p1) * L1, ey = top - Math.sin(p1) * L1, ez = tz + Math.cos(ry) * Math.cos(p1) * L1;
    fronds.push([ex, ey, ez, 1, 1, L2, p2, ry, c]);
  }
  for (let i = 0; i < 3; i++) { const b = i * 2.1 + a; nuts.push([tx + Math.cos(b) * .3, top - .35, tz + Math.sin(b) * .3, .3, .3, .3, 0, 0, 0x6a4a28]); }
  palms.push([x, z]);
}
const padSpots = M.pads.map(([x, z]) => [x, z, 2.4]).concat(M.crates.map(([x, z]) => [x, z, 1.2]));
// spots kept clear of trees and grass
const NO_GROW = [[PIT[0] - 1, PIT[1] + 1, PIT[2] - 1, PIT[3] + 1]];
const overlaps = (x, z, r, s) => x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ;
const free = (x, z, r) => !inPool(x, z, r + .5) && !building.solids.some(s => overlaps(x, z, r, s))
  && !NO_GROW.some(([a, b, c, d]) => overlaps(x, z, r, { minX: a, maxX: b, minZ: c, maxZ: d }))
  && padSpots.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + r);
// keep palms away from tall things
const tallThings = [...building.solids, ...later];
const roomAbove = (x, z, y0) => !tallThings.some(s => (s.top ?? 99) > y0 + 2.5 && overlaps(x, z, 3.5, s));
// palms need flat dry land
const flatDry = (x, z) => { const h = hAt(x, z); for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) { const k = kindAt(x + a, z + b); if (k < SAND || hAt(x + a, z + b) !== h) return false; } return true; };
for (let tries = 0, k = 0; k < 30 && tries < 4000; tries++) {
  const x = (rnd() * 2 - 1) * (RA - 2), z = (rnd() * 2 - 1) * (RA - 2);
  if (!flatDry(x, z) || Math.hypot(x, z) < 5 || !free(x, z, 1.4) || !roomAbove(x, z, hAt(x, z)) || onPath(x, z, 1.2) || palms.some(([a, b]) => Math.hypot(a - x, b - z) < 5.5)) continue;
  if (Math.abs(x - LX) < 6.5 && Math.abs(z - LZ) < 6.5) continue;
  palm(x, z, true, hAt(x, z)); k++;
}
// groves: [x, z, radius]
const GROVES = [[-16, -31, 7], [14, -34, 6], [-20, 30, 7.5], [-11, 22, 4.5], [26, 27, 4.5]];
for (const [gx, gz, gr] of GROVES) {
  for (let tries = 0, k = 0; k < Math.round(gr * 1.4) && tries < 900; tries++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * gr, x = gx + Math.cos(a) * d, z = gz + Math.sin(a) * d;
    if (!flatDry(x, z) || !free(x, z, 1.4) || !roomAbove(x, z, hAt(x, z)) || onPath(x, z, 1.2) || palms.some(([p, q]) => Math.hypot(p - x, q - z) < 3.6)) continue;
    palm(x, z, true, hAt(x, z)); k++;
  }
}
// little islands
const isleMat = lam({ map: tex(drawSand, 6, 6) });
for (const [x, z, r] of [[92, -48, 7], [-78, 74, 6], [-96, -36, 8], [34, 104, 5], [-30, -100, 6]]) {
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 2, SEA_D + .4, 12), isleMat); isle.position.set(x, (.4 - SEA_D) / 2, z); add(isle);
  const n = 2 + (r > 6 ? 2 : 1);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * (r - 2); palm(x + Math.cos(a) * d, z + Math.sin(a) * d, false, .4); }
}
M.palms = palms; M.trunks = trunksIn;
M.cell = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? { kind: kind[at(i, j)], h: H[at(i, j)], paved: !!PATH[at(i, j)] } : null; };
building.cover.push(inst(unit, trunkMat, trunksIn)); // bullets stop on trunks, not leaves
inst(unit, trunkMat, trunksOut); inst(frondGeo, frondMat, fronds); inst(unit, plain(0xffffff), nuts);

// grass tufts
const tufts = [];
function tuft(x, z, s, tall = 1) {
  if (kindAt(x, z) !== GRASS || x > PIT[0] - .5 && x < PIT[1] + .5 && z > PIT[2] - .5 && z < PIT[3] + .5 || !free(x, z, .4)) return;
  const h = hAt(x, z), hw = .55 * s, i0 = ci(x), j0 = ci(z);
  // skip tufts that hang off a step or reach the path
  for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
    const i = i0 + a, j = j0 + b, nx = i - O, nz = j - O;
    if (inGrid(i, j) && H[at(i, j)] === h && kind[at(i, j)] === GRASS && !PATH[at(i, j)]) continue;
    if (Math.hypot(Math.max(nx - x, 0, x - nx - 1), Math.max(nz - z, 0, z - nz - 1)) < hw) return;
  }
  tufts.push([x, h, z, 1.1 * s, .8 * s * tall, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]);
}
for (let tries = 0; tufts.length < 600 && tries < 9000; tries++) tuft(-O + rnd() * N, -O + rnd() * N, .6 + rnd() * .6);
for (const [gx, gz, gr] of GROVES) for (let k = 0; k < gr * 14; k++) { // ferns
  const a = rnd() * 6.28, d = Math.sqrt(rnd()) * gr;
  tuft(gx + Math.cos(a) * d, gz + Math.sin(a) * d, 1 + rnd() * .7, 1.35);
}
grassTufts(tufts);

building.solids.push(...later);
// hill solids, added last
for (let L = .5; L <= 8; L += .5) {
  const used = new Uint8Array(N * N), on = (i, j) => inGrid(i, j) && H[at(i, j)] >= L && !used[at(i, j)];
  let any = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!on(i, j)) continue;
    any = true;
    let w = 1; while (on(i + w, j)) w++;
    let d = 1; while ((() => { for (let a = 0; a < w; a++) if (!on(i + a, j + d)) return false; return true; })()) d++;
    for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) used[at(i + a, j + b)] = 1;
    building.solids.push({ mesh: null, minX: i - O, maxX: i - O + w, minZ: j - O, maxZ: j - O + d, top: L, surf: 'grass' });
  }
  if (!any) break;
}
// --- sky ---
addSky(rnd, [12, 17, -32], 16, 50, 160, 40, 58);

// ground height, the sea and pool drop to their floor
M.floor = (x, z) => inPool(x, z) ? POOL_F : kindAt(x, z) === SEA ? seaFloor(ci(x), ci(z)) : 0;
// only the deep sea drowns you
M.sea = (x, z, feet) => !inPool(x, z) && kindAt(x, z) === SEA && feet < WATER_Y - .5;
M.water = (x, z, feet) => M.sea(x, z, feet) && seaFloor(ci(x), ci(z)) <= -SEA_D;
// underwater, for the splash and blue tint
M.wet = (x, z, y) => inPool(x, z) ? y < POOL_Y : kindAt(x, z) === SEA && y < WATER_Y && !M.water(x, z, y);
M.trapped = POOL_LOW; // bots use the steps to get out
// routes through doors, stairs and pool steps
const lhNav = M.nav;
M.around = (p, t) => POOL_LOW(t) ? null : poolAround(p, t);
M.nav = (p, t) => {
  const w = poolNav(p, t) ?? (hotelPlace(p) !== 'out' ? hotelNav(p, t) : lhNav(p, t) ?? hotelNav(p, t));
  return (POOL_LOW(t) ? null : poolAround(p, w ?? t)) ?? w;
};
// footsteps
M.surfAt = (x, z, y, base, s) => {
  if (s) return base;
  if (Math.abs(x - LX) < LI && Math.abs(z - LZ) < LI || inPool(x, z) || inside(x, z)) return 'stone'; // stone floors
  if (x > PIT[0] && x < PIT[1] && z > PIT[2] && z < PIT[3]) return 'sand';
  if (onPath(x, z)) return 'stone';
  return kindAt(x, z) === GRASS ? 'grass' : 'sand';
};
M.tick = dt => {
  const t = performance.now() / 1000;
  slideTick(dt);
  slideFilm.material.map.offset.set(t * 1.2, 0); // flows down the slide
  for (const w of waters) w.material.map.offset.set(t * .03, t * .015);
  poolWater.material.map.offset.set(t * .04, t * .025);
  foam.material[0].opacity = .55 + Math.sin(t * .7 + 1.2) * .25;
  lampHalo.material.opacity = .55 + Math.sin(t * 2) * .1;
};
}
