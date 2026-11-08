startMap('sky', {
  name: 'Sky Islands', size: 'large', half: 50,
  env: { sky: 0x9ed8ff, fog: 0xcfeaff, fogNear: 55, fogFar: 175, hemiSky: 0xffffff, hemiGround: 0x8fa7c0, hemi: 1.1, sunColor: 0xfff2dc, sun: 1.35, sunDir: [-12, 22, 10] },
  pads: [[-27, 0], [-15, 13], [17, -11], [27, 3], [2, 4], [-1, -31], [5, 31], [-36, -27]],
  crates: [[-30, 7, 0], [-9, 9, 1], [11, -14, 0], [30, -9, 1], [-4, -29, 0], [8, 34, 0], [37, 25, 1]],
  void: true,
});
{
const M = MAPS.sky, SA = M.half, rnd = seeded(2077);
const N = 100, O = 50; // grid size and offset
const ci = x => Math.floor(x + O), inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N, at = (i, j) => j * N + i;
const VOID = 0, GRASS = 1, BRIDGE = 2, WATER = 3;
const kind = new Uint8Array(N * N), H = new Float32Array(N * N), isle = new Int8Array(N * N).fill(-1);
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, z, f, s) => {
  x *= f; z *= f; const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv) * 2 - 1;
};
// islands: [x, z, radius x, radius z]
const ISLES = [[-22, 6, 17, 15], [22, -4, 16, 14], [0, 2, 6.5, 6], [-2, -33, 9, 7], [3, 33, 9, 7], [-36, -27, 6.5, 6], [37, 27, 6.5, 6]];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = i - O + .5, z = j - O + .5;
  ISLES.forEach(([cx, cz, rx, rz], k) => {
    if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1 + .2 * vnoise(x, z, .16, k + 1) && Math.abs(x) < SA - 1 && Math.abs(z) < SA - 1) { kind[at(i, j)] = GRASS; isle[at(i, j)] = k; }
  });
}
// bridges between island centres, over the gaps only
const BRIDGES = [[0, 2], [2, 1], [2, 3], [2, 4], [0, 5], [1, 6], [3, 1], [4, 0]];
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
for (const [a, b] of BRIDGES) {
  const [ax, az] = ISLES[a], [bx, bz] = ISLES[b];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!kind[at(i, j)] && segDist(i - O + .5, j - O + .5, ax, az, bx, bz) < 1.6) kind[at(i, j)] = BRIDGE;
}
// the pond and its stream, which runs off the north edge of the east island
const POND = [25, -8, 3.6], STREAM = [[25, -8], [26.5, -14], [27.5, -30]];
const inPond = (x, z) => Math.hypot(x - POND[0], z - POND[1]) < POND[2];
let fallAt = null; // where the stream goes over the edge
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x = i - O + .5, z = j - O + .5;
  if (kind[c] !== GRASS) continue;
  if (inPond(x, z) || segDist(x, z, ...STREAM[0], ...STREAM[1]) < 1.1 || segDist(x, z, ...STREAM[1], ...STREAM[2]) < 1.1) kind[c] = WATER;
}
for (let z = -14; z > -40; z -= .25) { const x = 26.5 + (z + 14) / -16, k = kind[at(ci(x), ci(z))]; if (k !== WATER) { fallAt = [x, z + .25]; break; } }
const W_Y = -.15, W_F = -.6; // water level and pond floor
// distance to the edge, for the rocky undersides
const dEdge = new Int16Array(N * N);
{
  const q = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (kind[at(i, j)] && kind[at(i, j)] !== BRIDGE && D4.some(([a, b]) => !inGrid(i + a, j + b) || kind[at(i + a, j + b)] === VOID || kind[at(i + a, j + b)] === BRIDGE)) { dEdge[at(i, j)] = 1; q.push([i, j]); }
  for (let k = 0; k < q.length; k++) {
    const [i, j] = q[k];
    for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && kind[n] && kind[n] !== BRIDGE && !dEdge[n]) { dEdge[n] = dEdge[at(i, j)] + 1; q.push([i + a, j + b]); } }
  }
}
const UNDER = new Float32Array(N * N); // underside depth (negative)
for (let c = 0; c < N * N; c++) if (kind[c] && kind[c] !== BRIDGE) {
  const i = c % N, j = c / N | 0;
  UNDER[c] = -Math.min(22, Math.round(1.5 + dEdge[c] * 1.35 + 2.2 * (1 + vnoise(i, j, .3, 9))));
}
// hills: [x, z, radius, height]
const HILLS = [[-30, 13, 7, 3.5], [-17, -5, 4.5, 1.5], [14, 5, 5.5, 2.5], [-3, -36, 4, 2], [6, 35, 4, 1.5]];
const KEEP = [...M.pads.map(([x, z]) => [x, z, 2.6]), ...M.crates.map(([x, z]) => [x, z, 2]), [-12, 2, 6]]; // pads, crates, the ruin
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x0 = i - O, z0 = j - O, x = x0 + .5, z = z0 + .5;
  if (kind[c] !== GRASS || dEdge[c] < 3) continue;
  if (KEEP.some(([px, pz, r]) => Math.hypot(Math.max(x0 - px, 0, px - x0 - 1), Math.max(z0 - pz, 0, pz - z0 - 1)) < r)) continue;
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
const kindAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? kind[at(i, j)] : VOID; };
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
const occ = (x, z, h) => { let n = 0; for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const i = x + O + a, j = z + O + b; if (inGrid(i, j) && H[at(i, j)] > h + .01) n++; } return 1 - .14 * n; };
const topQuad = (m, x0, z0, y, h = y) => [m, [[x0, y, z0, 0, 1, occ(x0, z0, h)], [x0 + 1, y, z0, 1, 1, occ(x0 + 1, z0, h)], [x0 + 1, y, z0 + 1, 1, 0, occ(x0 + 1, z0 + 1, h)], [x0, y, z0 + 1, 0, 0, occ(x0, z0 + 1, h)]], [0, 1, 0]];
const lawn = tex(g => { noise(g, [104, 176, 76], 20); for (let i = 0; i < 6; i++) { g.fillStyle = ['rgba(55,105,35,.5)', 'rgba(185,225,125,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); } });
const lipTex = tex(g => {
  noise(g, [128, 96, 64], 22); g.fillStyle = 'rgba(70,45,25,.4)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, 4 + Math.random() * 12 | 0, 2, 1);
  for (let x = 0; x < 16; x++) { const d = 2 + (Math.random() * 3 | 0); for (let y = 0; y < d; y++) { g.fillStyle = `rgb(${96 + (x * 7 + y * 5) % 20},${168 + (x * 3) % 20},${70})`; g.fillRect(x, y, 1, 1); } }
});
const dirtTex = tex(g => { noise(g, [122, 92, 62], 22); g.fillStyle = 'rgba(70,45,25,.35)'; for (let i = 0; i < 7; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); });
const rockTex = tex(g => { noise(g, [118, 116, 124], 18); g.fillStyle = 'rgba(40,40,52,.35)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); g.fillStyle = 'rgba(200,200,215,.25)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); });
const stoneTex = tex(g => { noise(g, [170, 168, 160], 12); g.fillStyle = 'rgba(70,70,70,.45)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); });
const stone = surf(lam({ map: stoneTex }), 'stone'), rock = surf(lam({ map: rockTex }), 'stone');
// island tops, sides and rocky undersides, in chunks so shots only check nearby ones
{
  const mats = [lam({ map: lawn, vertexColors: true }), lam({ map: lipTex, vertexColors: true }), lam({ map: dirtTex, vertexColors: true }), lam({ map: rockTex, vertexColors: true }),
    lam({ map: tex(g => noise(g, [120, 140, 150], 12)), vertexColors: true })];
  const CH = 20;
  const wall = (quads, m, x0, z0, a, b, y0, y1, k = 1) => { // one side of a cell from y0 to y1, facing (a, b)
    if (y1 - y0 < .01) return;
    const ex = a > 0 ? x0 + 1 : x0, ez = b > 0 ? z0 + 1 : z0, v0 = m === 1 ? 1 - (y1 - y0) : y0, v1 = m === 1 ? 1 : y1;
    quads.push([m, a ? [[ex, y0, z0, 0, v0, .75 * k], [ex, y0, z0 + 1, 1, v0, .75 * k], [ex, y1, z0 + 1, 1, v1, k], [ex, y1, z0, 0, v1, k]]
      : [[x0, y0, ez, 0, v0, .75 * k], [x0 + 1, y0, ez, 1, v0, .75 * k], [x0 + 1, y1, ez, 1, v1, k], [x0, y1, ez, 0, v1, k]], [a, 0, b]]);
  };
  for (let cj = 0; cj < N; cj += CH) for (let cii = 0; cii < N; cii += CH) {
    const quads = [];
    for (let j = cj; j < cj + CH; j++) for (let i = cii; i < cii + CH; i++) {
      const c = at(i, j), k = kind[c], x0 = i - O, z0 = j - O;
      if (!k || k === BRIDGE) continue;
      const h = H[c], top = k === WATER ? W_F : h, u = UNDER[c];
      quads.push(topQuad(k === WATER ? 4 : 0, x0, z0, top, h));
      quads.push([3, [[x0, u, z0, 0, 0, .55], [x0 + 1, u, z0, 1, 0, .55], [x0 + 1, u, z0 + 1, 1, 1, .55], [x0, u, z0 + 1, 0, 1, .55]], [0, -1, 0]]); // underside
      for (const [a, b] of D4) {
        const ni = i + a, nj = j + b, n = inGrid(ni, nj) ? at(ni, nj) : -1, nk = n < 0 ? VOID : kind[n];
        if (nk === VOID || nk === BRIDGE) { // island edge: grass lip, earth, then rock
          if (top > 0) wall(quads, 1, x0, z0, a, b, Math.max(0, top - 1), top);
          if (top > 1) wall(quads, 2, x0, z0, a, b, 0, top - 1);
          wall(quads, 1, x0, z0, a, b, Math.min(top, 0) - 1, Math.min(top, 0));
          wall(quads, 3, x0, z0, a, b, u, Math.min(top, 0) - 1, .85);
          continue;
        }
        const nt = nk === WATER ? W_F : H[n];
        if (nt < top) wall(quads, nt < 0 ? 2 : 1, x0, z0, a, b, nt, top); // a step down to the neighbour
        if (UNDER[n] > u) wall(quads, 3, x0, z0, a, b, u, UNDER[n], .8); // the underside steps up
      }
    }
    if (quads.length) building.cover.push(cellMesh(quads, mats));
  }
}
// the bridges: floating slabs
{
  const slab = surf(lam({ map: stoneTex }), 'stone'), moss = lam({ map: tex(g => { noise(g, [86, 140, 64], 22); }) });
  const P = 2.6, groups = new Map(); // cells grouped into slabs of about P x P
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (kind[at(i, j)] !== BRIDGE) continue;
    const key = Math.floor((i - O) / P) + ',' + Math.floor((j - O) / P), g = groups.get(key) || groups.set(key, { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }).get(key);
    g.x0 = Math.min(g.x0, i - O); g.x1 = Math.max(g.x1, i - O + 1); g.z0 = Math.min(g.z0, j - O); g.z1 = Math.max(g.z1, j - O + 1);
  }
  const list = [...groups.values()];
  for (const s of list) {
    const w = s.x1 - s.x0 - .14, d = s.z1 - s.z0 - .14, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, th = .5 + rnd() * .4;
    const m = tbox(w, th, d, slab); m.position.set(cx, -th / 2, cz); add(m); building.cover.push(m);
    const under = box(w * .7, .6, d * .7, rock); under.position.set(cx, -th - .3, cz); add(under);
    if (rnd() < .5) { const mo = box(Math.min(w, .9 + rnd()), .06, Math.min(d, .9 + rnd()), moss); mo.position.set(cx + (rnd() - .5) * w * .4, .03, cz + (rnd() - .5) * d * .4); detail(mo); add(mo); }
  }
}
// water: the pond, the stream and the waterfall
const waters = [];
{
  const wt = tex(g => { noise(g, [96, 180, 230], 14); g.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); }, 1, 1);
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  const wm = new THREE.MeshLambertMaterial({ map: wt, transparent: true, opacity: .78, depthWrite: false });
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (kind[at(i, j)] !== WATER) continue;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wm); p.rotation.x = -Math.PI / 2; p.position.set(i - O + .5, W_Y, j - O + .5); add(p);
  }
  waters.push(wm);
  if (fallAt) {
    const ft = tex(g => { noise(g, [150, 210, 245], 18); g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x < 16; x += 3) g.fillRect(x + (Math.random() * 2 | 0), Math.random() * 16 | 0, 1, 5); }, 1, 14);
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    const fm = new THREE.MeshLambertMaterial({ map: ft, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, emissive: 0x2a4a5a });
    const FH = 46, fall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, FH), fm);
    fall.position.set(fallAt[0], W_Y - FH / 2, fallAt[1] - .15); add(fall);
    const lip = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), fm); lip.rotation.x = -Math.PI / 4; lip.position.set(fallAt[0], W_Y - .35, fallAt[1] - .05); add(lip);
    M.fall = fm;
    const mist = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
    for (let k = 0; k < 6; k++) { const s = 2 + rnd() * 3, mm = box(s, s * .7, s, mist); mm.position.set(fallAt[0] + (rnd() - .5) * 4, -FH + 4 + rnd() * 3, fallAt[1] - 1 + (rnd() - .5) * 4); add(mm); }
  }
}
// the ruin on the west island: pillars, broken walls, a roof you can climb on
{
  const RX = -12, RZ = 2;
  for (const [x, z, h] of [[-4, -3, 4.2], [4, -3, 4.2], [-4, 3, 3.1], [4, 3, 4.2], [0, -3, 2.2]]) addSlab(RX + x, RZ + z, 1, 1, 0, h, stone);
  addSlab(RX - 1, RZ - 3, 4, .8, 0, 1.6, stone); addSlab(RX + 2.4, RZ + 3, 2.2, .8, 0, 1.2, stone); addSlab(RX - 4, RZ, .8, 3, 0, 1.1, stone);
  addSlab(RX, RZ - 1.5, 9, 4, 4.2, 4.7, stone); // the roof
  for (let k = 0; k < 9; k++) addSlab(RX + 5.5, RZ + 3 - k * .75, 1, .75, 0, .5 + k * .5, stone); // steps up to it
  // a few fallen blocks
  for (const [x, z, s] of [[-6.5, 4.5, .9], [6.5, -4.5, .8], [-2, 6, .7]]) addBlock(RX + x, RZ + z, s, s, s, stone);
}
// standing stones on the middle island, a broken arch on the north one
for (const [x, z, h] of [[-3, -1, 2.6], [3, -.5, 2], [.5, 5.5, 2.4]]) addBlock(x, z, 1, 1.2, h, stone);
addBlock(-5, -34, 1, 1, 3.2, stone); addBlock(1.5, -34, 1, 1, 3.2, stone); addSlab(-1.75, -34, 7.5, 1, 3.2, 3.9, stone);
// walls and boulders for cover
for (const [x, z, w, d, h] of [[18, 0, 4, .8, 1.5], [32, -12, .8, 3.5, 1.4], [10, -6, .8, 4, 1.6], [-30, -4, 4, .8, 1.5], [-22, 16, .8, 3.5, 1.4], [5, 29, 3.5, .8, 1.4], [-36, -24, 2.8, .8, 1.3], [35, 30, .8, 2.8, 1.3]]) addSlab(x, z, w, d, 0, h, stone);
const boulders = [[-25, -6, 1.6], [-8, 14, 1.4], [16, -18, 1.5], [31, -2, 1.7], [21, 8, 1.3], [-35, 10, 1.4], [8, 38, 1.2], [-6, -29, 1.3], [39, 23, 1.2], [-39, -30, 1.1]];
for (const [x, z, s] of boulders) { const b = addBlock(x, z, s, s * .9, s * .9, rock); b.rotation.y = rnd(); }
addCrates(M.crates);
// trees: solid trunks, leaves you can shoot through
{
  const leaves = [];
  const TREES = [[-33, 2], [-26, 17], [-15, 18], [-8, -6], [-20, -7], [-31, -7], [13, -12], [20, 3], [31, -12], [28, 8], [15, 9], [-3, -37], [7, 36], [-1, 31], [-38, -24], [36, 30]];
  for (const [x, z] of TREES) {
    if (kindAt(x, z) !== GRASS) continue;
    const s = .85 + rnd() * .5, h = 2.8 * s, y = H[at(ci(x), ci(z))], c = LEAF_TINTS[rnd() * LEAF_TINTS.length | 0];
    addSlab(x, z, .7 * s, .7 * s, y, y + h, barkMat);
    leaves.push([x, y + h + 1 * s, z, 3.2 * s, 2.4 * s, 3.2 * s, rnd() * Math.PI, c], [x, y + h + 2.6 * s, z, 1.9 * s, 1.3 * s, 1.9 * s, rnd() * Math.PI, c]);
  }
  instanced(unit, leafMat, leaves);
}
// grass tufts and flowers
{
  const tufts = [];
  for (let tries = 0; tufts.length < 700 && tries < 12000; tries++) {
    const x = (rnd() * 2 - 1) * SA, z = (rnd() * 2 - 1) * SA, i = ci(x), j = ci(z);
    if (!inGrid(i, j) || kind[at(i, j)] !== GRASS || dEdge[at(i, j)] < 2) continue;
    if (M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.8)) continue;
    const s = .6 + rnd() * .6, hw = .5 * s;
    if (building.solids.some(o => x + hw > o.minX && x - hw < o.maxX && z + hw > o.minZ && z - hw < o.maxZ)) continue;
    tufts.push([x, H[at(i, j)], z, 1.1 * s, .8 * s, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]);
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
  const a = rnd() * 6.28, r = rnd() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r, y = -22 - rnd() * 26, w = 12 + rnd() * 22, d = 8 + rnd() * 12;
  const c = box(w, 3 + rnd() * 3, d, cloudMat); c.position.set(x, y, z); add(c);
}
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
const regionAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? region[at(i, j)] : -1; };
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
// ground height; off the edge it's a long way down
M.floor = (x, z) => { const k = kindAt(x, z); return k === VOID ? -60 : k === WATER ? W_F : 0; };
M.water = (x, z, feet) => feet < -2.5; // fell off
M.wet = (x, z, y) => kindAt(x, z) === WATER && y < W_Y;
M.sink = 14;
M.surfAt = (x, z, y, base, s) => s ? base : kindAt(x, z) === BRIDGE ? 'stone' : 'grass';
M.tick = () => {
  const t = performance.now() / 1000;
  for (const w of waters) w.map.offset.set(t * .05, t * .02);
  if (M.fall) M.fall.map.offset.set(0, t * 1.6);
};
}
