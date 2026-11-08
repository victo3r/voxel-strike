startMap('sky', {
  name: 'Sky Islands', size: 'large', half: 50,
  env: { sky: 0x9ed8ff, fog: 0xcfeaff, fogNear: 55, fogFar: 175, hemiSky: 0xffffff, hemiGround: 0x8fa7c0, hemi: 1.1, sunColor: 0xfff2dc, sun: 1.35, sunDir: [-12, 22, 10] },
  pads: [[-30, 14, 0], [-17, 1, 0], [24, -9, 3], [35, 2, 3], [0, 3, 1.5], [3, -31, 5], [6, 33, 1], [-38, -30, 3]],
  crates: [[-35, 15, 0], [-25, -5, 1], [22, -14, 0], [37, -3, 1], [4, -34, 0], [8, 37, 0], [41, 30, 1]],
  void: true,
});
{
const M = MAPS.sky, SA = M.half, rnd = seeded(2077);
const N = 100, O = 50; // grid size and offset
const ci = x => Math.floor(x + O), inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N, at = (i, j) => j * N + i;
const VOID = 0, GRASS = 1, BRIDGE = 2, WATER = 3;
const kind = new Uint8Array(N * N), H = new Float32Array(N * N), isle = new Int8Array(N * N).fill(-1);
const hard = new Uint8Array(N * N), top = new Uint8Array(N * N); // hard: cliffs allowed; top: 0 grass, 1 path, 2 rock
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, z, f, s) => {
  x *= f; z *= f; const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv) * 2 - 1;
};
const land = c => kind[c] === GRASS || kind[c] === WATER;
// islands: x, z, radius x, radius z, height
const ISLES = [[-28, 5, 15, 15, 0], [27, -4, 14, 13, 3], [0, 2, 6.5, 6, 1.5], [-2, -33, 9.5, 7, 5], [4, 34, 9, 7, 1], [-38, -31, 6.5, 5.5, 3], [39, 29, 6.5, 5.5, 2]];
const LIFT = ISLES.map(s => s[4]);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = i - O + .5, z = j - O + .5;
  ISLES.forEach(([cx, cz, rx, rz], k) => {
    if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1 + .2 * vnoise(x, z, .16, k + 1) && Math.abs(x) < SA - 1 && Math.abs(z) < SA - 1) { kind[at(i, j)] = GRASS; isle[at(i, j)] = k; }
  });
}
// streams: a pond, then straight to a cut edge where it falls
const FALLS = [{ k: 1, pond: [31, -8, 2.6], x: 31, dir: -1 }, { k: 3, pond: [-6, -33, 2.4], x: -6, dir: 1 }];
const W_Y = -.15, W_F = -.5; // water level and floor, above the island's height
for (const f of FALLS) {
  const ic = ci(f.x), pj = ci(f.pond[1]);
  let j = pj; while (inGrid(ic, j + f.dir) && isle[at(ic, j + f.dir)] === f.k) j += f.dir;
  f.jE = j; f.edge = f.dir < 0 ? j - O : j + 1 - O; f.x0 = ic - 1 - O; f.x1 = ic + 1 - O;
  for (let i = ic - 3; i <= ic + 2; i++) {
    for (let r = pj; r !== j + f.dir; r += f.dir) if (!kind[at(i, r)]) { kind[at(i, r)] = GRASS; isle[at(i, r)] = f.k; }
    for (let r = j + f.dir, n = 0; n < 6; r += f.dir, n++) if (isle[at(i, r)] === f.k) { kind[at(i, r)] = VOID; isle[at(i, r)] = -1; }
  }
  for (let jj = 0; jj < N; jj++) for (let i = 0; i < N; i++) {
    const c = at(i, jj), x = i - O + .5, z = jj - O + .5;
    if (isle[c] !== f.k) continue;
    if (Math.hypot(x - f.pond[0], z - f.pond[1]) < f.pond[2] || (i === ic || i === ic - 1) && (jj - pj) * f.dir >= 0 && (jj - j) * f.dir <= 0) kind[c] = WATER;
  }
}
// bridges: from, to, how jumpy
const BRIDGES = [[[-19, 4], [0, 2], .7], [[0, 2], [16, -3], .25], [[0, 2], [-1, -30], 0], [[0, 2], [3, 32], .25],
  [[-20, -4], [-37, -30], .7], [[32, 4], [38, 28], 0], [[4, -30], [20, -12], .25], [[-2, 32], [-24, 18], .6]];
// terrain: a mountain with a path round it, flat-topped mesas, soft hills
const MT = { x: -34, z: -1, r: 10, h: 9 };
const MESAS = [[25, 6, 4, 1.5], [-1, 37, 3.5, 1.5]];
const HILLS = [[-19, 17, 4.5, 2], [10, 31, 3.5, 1.5], [36, -13, 3.5, 1], [-40, -34, 3, 1]];
const PATH = [];
{
  let s = 0, px = 0, pz = 0;
  for (let k = 0; k <= 500; k++) {
    const th = 7.4 * k / 500, r = 9.2 - 6.9 * k / 500, x = MT.x + r * Math.cos(th), z = MT.z + r * Math.sin(th);
    if (k) s += Math.hypot(x - px, z - pz);
    PATH.push([x, z, s]); px = x; pz = z;
  }
}
const PL = PATH[PATH.length - 1][2];
const KEEP = [...M.pads.map(([x, z]) => [x, z, 2.6]), ...M.crates.map(([x, z]) => [x, z, 2]), ...BRIDGES.flatMap(([a, b]) => [[...a, 2.5], [...b, 2.5]]),
  [-21, 10, 7], [2, -36, 4], ...FALLS.map(f => [f.pond[0], f.pond[1], f.pond[2] + 1.5])]; // pads, crates, bridge ends, the ruin, the arch, ponds
const kept = (x0, z0) => KEEP.some(([px, pz, r]) => Math.hypot(Math.max(x0 - px, 0, px - x0 - 1), Math.max(z0 - pz, 0, pz - z0 - 1)) < r);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x0 = i - O, z0 = j - O, x = x0 + .5, z = z0 + .5;
  if (!land(c)) continue;
  const base = LIFT[isle[c]];
  if (kind[c] === WATER) { H[c] = base + W_F; hard[c] = 1; continue; }
  let t = 0;
  const md = Math.hypot(x - MT.x, z - MT.z) * (1 + .1 * vnoise(x, z, .3, 21));
  if (md < MT.r + 1) {
    const raw = MT.h * (MT.r - md) / (MT.r - 2.5);
    t = Math.max(0, Math.min(MT.h, Math.floor(raw / 1.5) * 1.5));
    let best = 9, bs = 0;
    for (const [px, pz, s] of PATH) { const d = Math.hypot(x - px, z - pz); if (d < best) { best = d; bs = s; } }
    if (best < 1.25) { t = Math.min(MT.h, Math.floor(bs / PL * MT.h * 2) / 2); top[c] = 1; }
    if (t > 0 || top[c]) hard[c] = 1;
    if (t >= 4.5 && !top[c]) top[c] = 2;
  }
  for (const [mx, mz, r, h] of MESAS) if (Math.hypot(x - mx, z - mz) < r + .8 * vnoise(x, z, .4, 22)) { t = h; hard[c] = 1; }
  if (!hard[c] && dEdgeOk(i, j) && !kept(x0, z0)) {
    let raw = 0;
    for (const [hx, hz, r, h] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < r) raw = Math.max(raw, h * (1 - (d / r) ** 2) + .25 * vnoise(x, z, .25, 5)); }
    t = Math.max(0, Math.floor(raw * 2) / 2);
  }
  if (kept(x0, z0) && !hard[c]) t = 0;
  H[c] = base + t;
}
function dEdgeOk(i, j) { for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (!inGrid(i + a, j + b) || !land(at(i + a, j + b))) return false; return true; }
for (let changed = true; changed;) { // soft ground: no cell more than half a block above a neighbour
  changed = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j); if (!land(c) || hard[c]) continue;
    let lim = H[c];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && land(n)) lim = Math.min(lim, H[n] + .5); }
    lim = Math.max(lim, LIFT[isle[c]]);
    if (lim < H[c]) { H[c] = lim; changed = true; }
  }
}
const cellAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? at(i, j) : -1; };
const kindAt = (x, z) => { const c = cellAt(x, z); return c < 0 ? VOID : kind[c]; };
const hAt = (x, z) => { const c = cellAt(x, z); return c >= 0 && land(c) ? H[c] : -60; };
// distance to the edge, for the rocky undersides
const dEdge = new Int16Array(N * N);
{
  const q = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (land(at(i, j)) && D4.some(([a, b]) => !inGrid(i + a, j + b) || !land(at(i + a, j + b)))) { dEdge[at(i, j)] = 1; q.push([i, j]); }
  for (let k = 0; k < q.length; k++) {
    const [i, j] = q[k];
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && land(n) && !dEdge[n]) { dEdge[n] = dEdge[at(i, j)] + 1; q.push([i + a, j + b]); } }
  }
}
const UNDER = new Float32Array(N * N); // underside depth
for (let c = 0; c < N * N; c++) if (land(c)) {
  const i = c % N, j = c / N | 0;
  UNDER[c] = LIFT[isle[c]] - Math.min(30, Math.round(2 + dEdge[c] * 1.9 + 2.4 * (1 + vnoise(i, j, .3, 9))));
}
M.land = (x, z) => kindAt(x, z) === GRASS;
addGround(200, lam({})).position.y = -60; building.ground.visible = false; // nothing down there, but shots need something to land on
addWall(0, -SA, SA * 2 + .3, .3); addWall(0, SA, SA * 2 + .3, .3);
addWall(-SA, 0, .3, SA * 2 + .3); addWall(SA, 0, .3, SA * 2 + .3);

// meshes made of cell faces
function cellMesh(quads, mats) {
  quads.sort((p, q) => p[0] - q[0]);
  const pos = [], nor = [], uv = [], col = [], ind = [], geo = new THREE.BufferGeometry();
  let start = 0;
  quads.forEach(([m, vs, n], k) => {
    const [a, b, c] = vs, cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) vs = [...vs].reverse();
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
const occ = (x, z, h) => { let n = 0; for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const i = x + O + a, j = z + O + b; if (inGrid(i, j) && land(at(i, j)) && H[at(i, j)] > h + .01) n++; } return 1 - .14 * n; };
const topQuad = (m, x0, z0, y, h = y) => [m, [[x0, y, z0, 0, 1, occ(x0, z0, h)], [x0 + 1, y, z0, 1, 1, occ(x0 + 1, z0, h)], [x0 + 1, y, z0 + 1, 1, 0, occ(x0 + 1, z0 + 1, h)], [x0, y, z0 + 1, 0, 0, occ(x0, z0 + 1, h)]], [0, 1, 0]];
const lawn = tex(g => { noise(g, [104, 176, 76], 20); for (let i = 0; i < 6; i++) { g.fillStyle = ['rgba(55,105,35,.5)', 'rgba(185,225,125,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); } });
const lipTex = tex(g => {
  noise(g, [128, 96, 64], 22); g.fillStyle = 'rgba(70,45,25,.4)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, 4 + Math.random() * 12 | 0, 2, 1);
  for (let x = 0; x < 16; x++) { const d = 2 + (Math.random() * 3 | 0); for (let y = 0; y < d; y++) { g.fillStyle = `rgb(${96 + (x * 7 + y * 5) % 20},${168 + (x * 3) % 20},${70})`; g.fillRect(x, y, 1, 1); } }
});
const dirtTex = tex(g => { noise(g, [122, 92, 62], 22); g.fillStyle = 'rgba(70,45,25,.35)'; for (let i = 0; i < 7; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); });
const rockTex = tex(g => { noise(g, [118, 116, 124], 18); g.fillStyle = 'rgba(40,40,52,.35)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); g.fillStyle = 'rgba(200,200,215,.25)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); });
const sandTex = tex(g => { noise(g, [176, 138, 96], 16); g.fillStyle = 'rgba(120,80,50,.4)'; for (let y = 2; y < 16; y += 5) g.fillRect(0, y, 16, 1); });
const deepTex = tex(g => { noise(g, [74, 72, 88], 16); g.fillStyle = 'rgba(25,25,40,.4)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); });
const pathTex = tex(g => { noise(g, [150, 128, 96], 20); g.fillStyle = 'rgba(95,80,60,.5)'; for (let i = 0; i < 9; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 2); });
const stoneTex = tex(g => { noise(g, [170, 168, 160], 12); g.fillStyle = 'rgba(70,70,70,.45)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); });
const stone = surf(lam({ map: stoneTex }), 'stone'), rock = surf(lam({ map: rockTex }), 'stone');
// island tops, cliffs and banded undersides, in chunks so shots only check nearby ones
{
  const vc = map => lam({ map, vertexColors: true });
  const mats = [vc(lawn), vc(lipTex), vc(dirtTex), vc(rockTex), vc(tex(g => noise(g, [120, 140, 150], 12))), vc(pathTex), vc(sandTex), vc(deepTex)];
  const CH = 20;
  const wall = (quads, m, x0, z0, a, b, y0, y1, k = 1) => { // one side of a cell from y0 to y1, facing (a, b)
    if (y1 - y0 < .01) return;
    const ex = a > 0 ? x0 + 1 : x0, ez = b > 0 ? z0 + 1 : z0, v0 = m === 1 ? 1 - (y1 - y0) : y0, v1 = m === 1 ? 1 : y1;
    quads.push([m, a ? [[ex, y0, z0, 0, v0, .75 * k], [ex, y0, z0 + 1, 1, v0, .75 * k], [ex, y1, z0 + 1, 1, v1, k], [ex, y1, z0, 0, v1, k]]
      : [[x0, y0, ez, 0, v0, .75 * k], [x0 + 1, y0, ez, 1, v0, .75 * k], [x0 + 1, y1, ez, 1, v1, k], [x0, y1, ez, 0, v1, k]], [a, 0, b]]);
  };
  // rock layers under an island: dirt, sandstone, grey rock, a thin sandstone stripe, dark rock
  const BANDS = [[-2.5, 2], [-5, 6], [-10, 3], [-11.5, 6], [-17, 3], [-99, 7]];
  const bands = (quads, x0, z0, a, b, y0, y1, base) => {
    const w = Math.round(vnoise(x0 + a * .5, z0 + b * .5, .35, 13) * 2) * .5;
    let hi = y1;
    for (const [rel, m] of BANDS) {
      const lo = Math.max(y0, base + rel + w);
      if (lo < hi) { wall(quads, m, x0, z0, a, b, lo, hi, m === 7 ? .8 : .9); hi = lo; }
      if (hi <= y0) break;
    }
  };
  for (let cj = 0; cj < N; cj += CH) for (let cii = 0; cii < N; cii += CH) {
    const quads = [];
    for (let j = cj; j < cj + CH; j++) for (let i = cii; i < cii + CH; i++) {
      const c = at(i, j), x0 = i - O, z0 = j - O;
      if (!land(c)) continue;
      const h = H[c], u = UNDER[c], base = LIFT[isle[c]], wet = kind[c] === WATER;
      quads.push(topQuad(wet ? 4 : top[c] === 1 ? 5 : top[c] === 2 ? 3 : 0, x0, z0, h));
      quads.push([7, [[x0, u, z0, 0, 0, .5], [x0 + 1, u, z0, 1, 0, .5], [x0 + 1, u, z0 + 1, 1, 1, .5], [x0, u, z0 + 1, 0, 1, .5]], [0, -1, 0]]); // underside
      const grassy = !wet && top[c] !== 2;
      for (const [a, b] of D4) {
        const ni = i + a, nj = j + b, n = inGrid(ni, nj) ? at(ni, nj) : -1;
        if (n < 0 || !land(n)) { // island edge: lip, then the rock layers
          const lipLo = Math.min(h, base) - 1;
          if (h > base) wall(quads, grassy ? 1 : 3, x0, z0, a, b, Math.max(base, h - 1), h);
          if (h - 1 > base) wall(quads, top[c] ? 3 : 2, x0, z0, a, b, base, h - 1);
          wall(quads, h > base ? (top[c] === 2 ? 3 : 2) : grassy || wet ? 1 : 3, x0, z0, a, b, lipLo, Math.min(h, base));
          bands(quads, x0, z0, a, b, u, lipLo, base);
          continue;
        }
        const nt = H[n];
        if (nt < h) { // a step or a cliff down to the neighbour
          if (h - nt <= .5) wall(quads, grassy ? 1 : 3, x0, z0, a, b, nt, h);
          else { const lip = grassy ? Math.min(.6, h - nt) : 0; if (lip) wall(quads, 1, x0, z0, a, b, h - lip, h); wall(quads, 3, x0, z0, a, b, nt, h - lip, .9); }
        }
        if (UNDER[n] > u) bands(quads, x0, z0, a, b, u, Math.min(UNDER[n], h - 1), base); // the underside steps up
      }
    }
    if (quads.length) building.cover.push(cellMesh(quads, mats));
  }
}
// hanging rock spikes and roots under the islands
{
  const spikes = [], roots = [];
  for (let c = 0; c < N * N; c++) {
    if (!land(c)) continue;
    const i = c % N, j = c / N | 0, x = i - O + .5, z = j - O + .5, u = UNDER[c];
    if (dEdge[c] >= 3 && hash(i, j, 31) < .05) {
      const s = .7 + hash(i, j, 32) * .6, L = 1.5 + hash(i, j, 33) * 3, sh = 0x8a8a9a;
      spikes.push([x, u - L * .25, z, s, L * .5, s, 0, sh], [x, u - L * .7, z, s * .6, L * .5, s * .6, 0, sh], [x, u - L * 1.05, z, s * .3, L * .3, s * .3, 0, sh]);
    }
    if (dEdge[c] === 1 && hash(i, j, 34) < .12) {
      const d = D4.find(([a, b]) => !inGrid(i + a, j + b) || !land(at(i + a, j + b)));
      const L = 1 + hash(i, j, 35) * 2.2, rx = x + d[0] * .52, rz = z + d[1] * .52, y = Math.min(H[c], LIFT[isle[c]]) - .2;
      roots.push([rx, y - L / 2, rz, .12, L, .12, 0, hash(i, j, 36) < .5 ? 0x4f7a34 : 0x6b4a2c]);
    }
  }
  instanced(unit, lam({ map: deepTex }), spikes);
  detail(instanced(unit, lam({}), roots));
}
// the bridges: floating slabs, some close enough to walk, some you jump
const laneDir = new Float32Array(N * N * 2);
const bridgeSlabs = [];
{
  const slab = surf(lam({ map: stoneTex }), 'stone'), moss = lam({ map: tex(g => { noise(g, [86, 140, 64], 22); }) });
  const hitsLand = (x0, x1, z0, z1) => { for (let j = ci(z0 + .02); j <= ci(z1 - .02); j++) for (let i = ci(x0 + .02); i <= ci(x1 - .02); i++) if (inGrid(i, j) && land(at(i, j))) return true; return false; };
  for (const [[ax, az], [bx, bz], jumpy] of BRIDGES) {
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, pt = s => [ax + ux * s, az + uz * s];
    let s0 = 0; while (s0 < L && land(cellAt(...pt(s0)))) s0 += .05;
    let s1 = s0; while (s1 < L && !land(cellAt(...pt(s1)))) s1 += .05;
    const hA = hAt(...pt(s0 - .3)), hB = hAt(...pt(s1 + .3));
    // the lane, for bots finding their way
    for (let s = s0 - 1; s < s1 + 1; s += .25) {
      const [x, z] = pt(s);
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
        const c = cellAt(x + a, z + b);
        if (c >= 0 && !land(c) && Math.hypot(ci(x + a) - O + .5 - x, ci(z + b) - O + .5 - z) < 1.3) { kind[c] = BRIDGE; laneDir[c * 2] = ux; laneDir[c * 2 + 1] = uz; }
      }
    }
    // gaps first, then share what's left between the slabs
    const along = Math.max(Math.abs(ux), Math.abs(uz)), Lv = s1 - s0;
    let n = Math.max(1, Math.round(Lv / 2.9)), gaps;
    for (let tries = 0; tries < 20; tries++) {
      gaps = Array.from({ length: n + 1 }, (_, k) => k && k < n && rnd() < jumpy ? 1.1 + rnd() * .8 : .15 + rnd() * .45 * (jumpy ? 1 : .4));
      const len = (Lv - gaps.reduce((a, g) => a + g, 0)) / n;
      if (len < 1.5 && n > 1) n--; else if (len > 3.3) n++; else break;
    }
    const len = (Lv - gaps.reduce((a, g) => a + g, 0)) / n;
    let s = s0 + gaps[0];
    for (let k = 0; k < n; k++) {
      let c = s + len / 2;
      const w = (ux * ux >= uz * uz ? [len * along, 2.4] : [2.4, len * along]), side = (rnd() - .5) * .3;
      let [cx, cz] = pt(c); cx += -uz * side; cz += ux * side;
      // never inside an island: slide toward the middle, then shrink
      let sw = w[0], sd = w[1];
      const back = k < n / 2 ? 1 : -1, inLand = () => hitsLand(cx - sw / 2, cx + sw / 2, cz - sd / 2, cz + sd / 2);
      for (let m = 0; m < 12 && inLand(); m++) { cx += ux * back * .05; cz += uz * back * .05; }
      while (inLand() && sw > .8 && sd > .8) { sw -= .1; sd -= .1; }
      const y = hA + (hB - hA) * (k + 1) / (n + 1) + (gaps[k] > 1 ? .2 : 0), th = .5 + rnd() * .35;
      addSlab(cx, cz, sw, sd, y - th, y, slab);
      bridgeSlabs.push([cx, cz, sw, sd, y]);
      const under = box(sw * .7, .7, sd * .7, rock); under.position.set(cx, y - th - .35, cz); add(under);
      if (rnd() < .55) { // moss, kept on top
        const mw = Math.min(sw - .3, .7 + rnd() * .8), md = Math.min(sd - .3, .7 + rnd() * .8);
        const mo = box(mw, .05, md, moss); mo.position.set(cx + (rnd() - .5) * (sw - mw - .2), y + .025, cz + (rnd() - .5) * (sd - md - .2)); detail(mo); add(mo);
      }
      s += len + gaps[k + 1];
    }
  }
}
// water: the ponds, the streams and the waterfalls
const waters = [];
{
  const wt = tex(g => { noise(g, [96, 180, 230], 14); g.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); }, 1, 1);
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  const wm = new THREE.MeshLambertMaterial({ map: wt, transparent: true, opacity: .78, depthWrite: false });
  const quads = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j); if (kind[c] !== WATER) continue;
    const x0 = i - O, z0 = j - O, y = LIFT[isle[c]] + W_Y;
    quads.push([0, [[x0, y, z0, x0, -z0], [x0 + 1, y, z0, x0 + 1, -z0], [x0 + 1, y, z0 + 1, x0 + 1, -z0 - 1], [x0, y, z0 + 1, x0, -z0 - 1]], [0, 1, 0]]);
  }
  const surface = cellMesh(quads, [wm]); surface.renderOrder = 1;
  waters.push(wm);
  const ft = tex(g => { noise(g, [150, 210, 245], 18); g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x < 16; x += 3) g.fillRect(x + (Math.random() * 2 | 0), Math.random() * 16 | 0, 1, 5); }, 1, 1);
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  const fm = new THREE.MeshLambertMaterial({ map: ft, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, emissive: 0x2a4a5a });
  M.fall = fm;
  const mist = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
  for (const f of FALLS) {
    // one sheet: bends over the edge, then straight down
    const y0 = LIFT[f.k] + W_Y, bottom = -48, R = .45, pts = [];
    for (let a = 0; a <= 6; a++) { const t = a / 6 * Math.PI / 2; pts.push([f.edge + f.dir * R * Math.sin(t), y0 - R * (1 - Math.cos(t))]); }
    pts.push([f.edge + f.dir * R, bottom]);
    const pos = [], uv = [], ind = [];
    let v = 0;
    pts.forEach(([z, y], k) => {
      if (k) v += Math.hypot(z - pts[k - 1][0], y - pts[k - 1][1]) / 3.3;
      pos.push(f.x0, y, z, f.x1, y, z); uv.push(0, v, (f.x1 - f.x0) / 2.4, v);
      if (k) { const b = k * 2; ind.push(b - 2, b - 1, b + 1, b - 2, b + 1, b); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ind); geo.computeVertexNormals();
    const sheet = new THREE.Mesh(geo, fm); sheet.renderOrder = 2; add(sheet);
    for (let k = 0; k < 6; k++) { const s = 2 + rnd() * 3, mm = box(s, s * .7, s, mist); mm.position.set((f.x0 + f.x1) / 2 + (rnd() - .5) * 4, bottom + 4 + rnd() * 3, f.edge + f.dir * (1 + rnd() * 2)); add(mm); }
  }
}
// things standing on the ground
const gy = (x, z) => hAt(x, z);
// the ruin on the west island: snapped pillars, broken walls, what's left of the roof (climb the steps, jump the gaps)
{
  const RX = -21, RZ = 10, y = gy(RX, RZ), R = y + 4.2;
  const moss = lam({ map: tex(g => { noise(g, [86, 140, 64], 22); }) });
  const mossOn = (x, z, w, d, top) => { const m = box(w, .05, d, moss); m.position.set(RX + x, top + .025, RZ + z); detail(m); add(m); };
  for (const [x, z, h] of [[-4, -3, 4.2], [4, -3, 4.2], [4, 3, 4.2], [-4, 3, 2.3], [0, -3, 1.4], [0, 3, .9]]) {
    addSlab(RX + x, RZ + z, 1, 1, y, y + h, stone);
    if (h > 4) addSlab(RX + x, RZ + z, 1.4, 1.4, R - .35, R, stone); // capstone
    else addSlab(RX + x + .1, RZ + z - .1, .7, .7, y + h, y + h + .3, rock); // jagged break
  }
  addSlab(RX - 2.6, RZ - 2.6, 4, 2, R, R + .5, stone); mossOn(-3, -2.4, 1.6, 1.2, R + .5); // roof left on the west pillar
  addSlab(RX + 1.6, RZ - 3, 1.6, 1.2, R, R + .4, stone); // a chunk of beam, a jump either side
  addSlab(RX + 4, RZ, 1.6, 7.6, R, R + .5, stone); addSlab(RX + 4, RZ + 2.6, 1.2, 1.4, R + .5, R + .9, rock); mossOn(4, -1.5, 1, 2.4, R + .5); // the east beam, some rubble on it
  // broken walls, stepping down where they crumbled
  for (const [x, z, w, d, h] of [[-2.6, -3, 1.6, .8, 1.8], [-1.1, -3, 1.4, .8, 1.1], [2.6, 3, 1.4, .8, 1.5], [1.6, 3, .8, .8, .7], [4, -.6, .8, 1.6, 1.2], [4, .9, .8, 1.4, .6]]) addSlab(RX + x, RZ + z, w, d, y, y + h, stone);
  // fallen roof slabs and rubble
  for (const [x, z, w, d, h, r] of [[.6, .4, 2.6, 1.8, .45, .3], [-1.8, 1.6, 1.4, 1, .35, -.5], [2.2, -1.2, 1, .8, .5, .8]]) addSlab(RX + x, RZ + z, w, d, y, y + h, stone).rotation.y = r;
  for (let k = 0; k < 9; k++) addSlab(RX - 5.5, RZ + 3 - k * .75, 1, .75, y, y + .5 + k * .5, stone); // steps up to it
  for (const [x, z, s] of [[-6.5, 5, .9], [6, -4.5, .8], [-2, 6, .7]]) addSlab(RX + x, RZ + z, s, s, y, y + s, rock);
}
// standing stones on the middle island, a broken arch on the north one
for (const [x, z, h] of [[-3, -1, 2.6], [4, 4, 2], [-3, 5, 2.4]]) { const y = gy(x, z); addSlab(x, z, 1, 1.2, y, y + h, stone); }
{ const y = gy(2, -36); addSlab(-.5, -36, 1, 1, y, y + 3.2, stone); addSlab(4.5, -36, 1, 1, y, y + 3.2, stone); addSlab(2, -36, 6, 1, y + 3.2, y + 3.9, stone); }
// walls and boulders for cover
for (const [x, z, w, d, h] of [[-22, -2, 4, .8, 1.5], [-34, 10, .8, 3, 1.4], [20, -7, .8, 4, 1.6], [29, 2, 3.5, .8, 1.4], [5, 29, 3.5, .8, 1.4], [-38, -27, 2.8, .8, 1.3], [37, 32, .8, 2.8, 1.3]]) { const y = gy(x, z); addSlab(x, z, w, d, y, y + h, stone); }
const boulders = [[-27, 9, 1.4], [16, -9, 1.5], [33, -1, 1.6], [-9, -37, 1.2], [42, 27, 1.1], [-41, -30, 1.1]];
for (const [x, z, s] of boulders) { const y = gy(x, z), b = addSlab(x, z, s, s * .9, y, y + s * .9, rock); b.rotation.y = rnd(); }
for (const [x, z, tall] of M.crates) { const y = gy(x, z); addSlab(x, z, 1.2, 1.2, y, y + (tall ? 2.4 : 1.2), tall ? crate2 : crate1); }
// trees: solid trunks, leaves you can stand on but shoot through
const flat = (x, z, r = 1) => { const h = gy(x, z); for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const c = cellAt(x + a, z + b); if (c < 0 || kind[c] !== GRASS || H[c] !== h) return false; } return true; };
{
  const leaves = [];
  const TREES = [[-37, 11], [-27, 18], [-15, 13], [-13, -1], [-22, -6], [-29, -6], [-40, 5], [15, -5], [30, 6], [38, -9], [25, -15], [40, 6], [17, 3], [-7, -38], [-4, -29], [-3, 29], [12, 36], [-41, -29], [36, 30]];
  for (const [x, z] of TREES) {
    if (!flat(x, z) || KEEP.some(([px, pz, r]) => r < 3 && Math.hypot(px - x, pz - z) < 2.2)) continue;
    const s = .85 + rnd() * .5, h = 2.8 * s, y = gy(x, z), c = LEAF_TINTS[rnd() * LEAF_TINTS.length | 0];
    addSlab(x, z, .7 * s, .7 * s, y, y + h, barkMat);
    const L = [[x, y + h + 1 * s, z, 3.2 * s, 2.4 * s, 3.2 * s, 0, c], [x, y + h + 2.6 * s, z, 1.9 * s, 1.3 * s, 1.9 * s, 0, c]];
    for (const [lx, ly, lz, w, t, d] of L) building.solids.push({ mesh: null, minX: lx - w / 2, maxX: lx + w / 2, minZ: lz - d / 2, maxZ: lz + d / 2, bot: ly - t / 2, top: ly + t / 2, surf: 'grass' });
    leaves.push(...L); rnd(); rnd(); // keeps the random layout after this the same
  }
  instanced(unit, leafMat, leaves);
}
// grass tufts
{
  const tufts = [];
  for (let tries = 0; tufts.length < 750 && tries < 14000; tries++) {
    const x = (rnd() * 2 - 1) * SA, z = (rnd() * 2 - 1) * SA, c = cellAt(x, z);
    if (c < 0 || kind[c] !== GRASS || top[c] || dEdge[c] < 2) continue;
    if (M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.8)) continue;
    const s = .6 + rnd() * .6, hw = .5 * s;
    if (building.solids.some(o => x + hw > o.minX && x - hw < o.maxX && z + hw > o.minZ && z - hw < o.maxZ)) continue;
    tufts.push([x, H[c], z, 1.1 * s, .8 * s, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]);
  }
  grassTufts(tufts);
}
// far islands, just scenery
{
  const far = [], farLeaves = [];
  for (let k = 0; k < 14; k++) {
    const a = rnd() * 6.28, r = 80 + rnd() * 70, x = Math.cos(a) * r, z = Math.sin(a) * r, y = -10 + rnd() * 30, s = 4 + rnd() * 7;
    for (let l = 0; l < 4; l++) far.push([x, y - l * s * .35, z, s * 2 * (1 - l * .22), s * .4, s * 1.7 * (1 - l * .22), a, l ? 0x9a9aa6 : 0x7cc05a]);
    if (rnd() < .7) farLeaves.push([x + s * .3, y + s * .5, z, s * .6, s * .5, s * .6, a, 0x5ca04a]);
  }
  instanced(unit, lam({}), far); instanced(unit, lam({}), farLeaves);
}
// clouds above and below
addSky(rnd, [-12, 17, 32], 14, 50, 160, 40, 56);
for (let k = 0; k < 40; k++) {
  const a = rnd() * 6.28, r = rnd() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r, y = -24 - rnd() * 26, w = 12 + rnd() * 22, d = 8 + rnd() * 12;
  const c = box(w, 3 + rnd() * 3, d, cloudMat); c.position.set(x, y, z); add(c);
}
// ground solids, added last: columns of cells at the same height
{
  const used = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j); if (!land(c) || used[c]) continue;
    const h = H[c], k = isle[c], same = (a, b) => inGrid(a, b) && land(at(a, b)) && !used[at(a, b)] && H[at(a, b)] === h && isle[at(a, b)] === k;
    let w = 1; while (same(i + w, j)) w++;
    let d = 1; while ((() => { for (let a = 0; a < w; a++) if (!same(i + a, j + d)) return false; return true; })()) d++;
    for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) used[at(i + a, j + b)] = 1;
    building.solids.push({ mesh: null, minX: i - O, maxX: i - O + w, minZ: j - O, maxZ: j - O + d, bot: LIFT[k] - 2, top: h, surf: top[c] ? 'stone' : 'grass' });
  }
}
// walking: one region per island and per bridge, and a distance field to each, so bots find the bridges
const region = new Int16Array(N * N).fill(-1);
let regions = 0;
for (let c = 0; c < N * N; c++) {
  if (!kind[c] || region[c] >= 0) continue;
  const br = kind[c] === BRIDGE, q = [c]; region[c] = regions;
  for (let k = 0; k < q.length; k++) {
    const i = q[k] % N, j = q[k] / N | 0;
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && kind[n] && region[n] < 0 && (kind[n] === BRIDGE) === br) { region[n] = regions; q.push(n); } }
  }
  regions++;
}
const fields = [];
const fieldTo = r => fields[r] ??= (() => {
  const d = new Int16Array(N * N).fill(-1), q = [];
  for (let c = 0; c < N * N; c++) if (region[c] === r) { d[c] = 0; q.push(c); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k] % N, j = q[k] / N | 0;
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && kind[n] && d[n] < 0) { d[n] = d[q[k]] + 1; q.push(n); } }
  }
  return d;
})();
const regionAt = (x, z) => { const c = cellAt(x, z); return c < 0 ? -1 : region[c]; };
M.nav = (p, t) => {
  const rp = regionAt(p.x, p.z), rt = regionAt(t.x, t.z);
  if (rp < 0 || rt < 0 || rp === rt) return null;
  const d = fieldTo(rt);
  let i = ci(p.x), j = ci(p.z);
  for (let s = 0; s < 3; s++) { // a few cells down the field
    let best = null, bv = d[at(i, j)];
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const n = at(i + a, j + b);
      if (inGrid(i + a, j + b) && d[n] >= 0 && d[n] < bv && (!a || !b || (kind[at(i + a, j)] && kind[at(i, j + b)]))) { bv = d[n]; best = [i + a, j + b]; }
    }
    if (!best) break;
    [i, j] = best;
  }
  return { x: i - O + .5, y: 0, z: j - O + .5 };
};
// bots: jump a bridge gap, aiming for the middle of the next slab
M.leap = (p, mx, mz) => {
  const l = Math.hypot(mx, mz); if (l < 1e-6) return null;
  const dx = mx / l, dz = mz / l, here = cellAt(p.x, p.z), ahead = cellAt(p.x + dx, p.z + dz);
  if (!(here >= 0 && kind[here] === BRIDGE || ahead >= 0 && kind[ahead] === BRIDGE)) return null;
  if (groundAt(p.x + dx * .6, p.z + dz * .6, .05, p.y + .1) > p.y - 2.5) return null; // no gap here
  let best = null, bd = 9;
  for (const [cx, cz, w, d, y] of bridgeSlabs) {
    const ox = cx - p.x, oz = cz - p.z, dist = Math.hypot(ox, oz);
    if (dist > 4.2 || y > p.y + 1 || y < p.y - 2 || ox * dx + oz * dz < dist * .6) continue;
    if (Math.abs(ox) < w / 2 && Math.abs(oz) < d / 2) continue; // the one it's on
    if (dist < bd) { bd = dist; best = [cx, cz, y]; }
  }
  if (!best) for (let d = .7; d <= 2.8; d += .1) { // the island at the end
    const tx = p.x + dx * (d + 1), tz = p.z + dz * (d + 1), g = groundAt(p.x + dx * d, p.z + dz * d, 0, p.y + .9);
    if (g > p.y - 2 && groundAt(tx, tz, .35, p.y + .9) > p.y - 2 && hAt(tx, tz) > p.y - 2) { best = [tx, tz, g]; break; }
  }
  if (!best) return null;
  const ox = best[0] - p.x, oz = best[1] - p.z, dist = Math.hypot(ox, oz), t = (9 + Math.sqrt(Math.max(0, 81 - 50 * (best[2] - p.y)))) / 25;
  return { x: ox / dist, z: oz / dist, s: Math.min(7.5, dist / t) };
};
M.top = (x, z) => hAt(x, z);
M.floor = () => -60; // the ground is all solids; off the edge it's a long way down
M.water = (x, z, feet) => feet < -2.5; // fell off
M.wet = (x, z, y) => { const c = cellAt(x, z); return c >= 0 && kind[c] === WATER && y < LIFT[isle[c]] + W_Y; };
M.sink = 14;
M.edgeR = .2; // bots step over small bridge gaps
M.surfAt = (x, z, y, base, s) => s ? base : 'grass';
M.debug = { kind, H, isle, N, O, bridgeSlabs, hard };
M.tick = () => {
  const t = performance.now() / 1000;
  for (const w of waters) w.map.offset.set(t * .05, t * .02);
  M.fall.map.offset.set(0, -t * 1.6);
};
}
