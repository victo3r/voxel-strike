startMap('cove', {
  name: 'The Cove', size: 'medium', half: 36,
  env: { sky: 0x93c7ea, fog: 0xd2e2e8, fogNear: 45, fogFar: 150, hemiSky: 0xfff2e0, hemiGround: 0x7f8d84, hemi: 1.05, sunColor: 0xffdfb0, sun: 1.35, sunDir: [-22, 15, 9] },
  pads: [[-1, -26, 0], [1, -5, 0], [21, -31, 6.3], [-11.5, 28.4, 4.05], [-29, -6, 3.15], [29, 6, 3.6]],
  crates: [[-6.2, -13.6, 1], [-5, -12.9, 0], [4.6, -14.2, 0], [5.8, -13.5, 0], [-7.6, 2.6, 0], [-7.9, 3.9, 1], [14.4, -2.4, 0], [15.6, -2.2, 0], [-5, -26.8, 1], [-3.8, -27.6, 0], [3.4, -27.2, 0]],
});
{
const M = MAPS.cove, CA = M.half, rnd = seeded(1717);
const N = 72, O = 36, LV = .45, PLAT = 6.3, RIDGE = 3.15, HEAD = 3.6, WATER_Y = -.05, SEA_D = 3; // grid, step height, the three land levels, water
const ci = x => Math.floor(x + O), inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N, at = (i, j) => j * N + i;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], r2 = v => Math.round(v * 100) / 100, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, z, f, s) => {
  x *= f; z *= f; const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv) * 2 - 1;
};
const SEA = 0, SAND = 1, GRASS = 2, ROCK = 3, PATH = 4, STEPS = 5;
const kind = new Uint8Array(N * N), H = new Float64Array(N * N), SF = new Float64Array(N * N).fill(-SEA_D);
const base = new Float64Array(N * N), soft = new Uint8Array(N * N);
const cave = new Uint8Array(N * N), CF = new Float64Array(N * N), CC = new Float64Array(N * N); // cave floor and ceiling
const cellAt = (x, z) => { const i = ci(x), j = ci(z); return inGrid(i, j) ? at(i, j) : -1; };
const kindAt = (x, z) => { const c = cellAt(x, z); return c < 0 ? SEA : kind[c]; };
const hAt = (x, z) => { const c = cellAt(x, z); return c < 0 ? 0 : kind[c] === SEA ? SF[c] : H[c]; };

// where the land ends (straight where stairs and the tunnel meet a cliff)
const cliffZ = x => x > -17.5 && x < -7 ? -17 : -17.6 + 1.2 * vnoise(x, 0, .14, 1); // the plateau's south cliff
const ridgeX = z => z > -34.5 && z < -20.5 ? -22 : -22 + 1.2 * vnoise(0, z, .14, 2); // the west ridge's east cliff
const headX = z => z > -12.5 && z < -1.5 ? 22 : 22.6 + 1.2 * vnoise(0, z, .14, 3); // the headland's west cliff
const armEnd = x => 20.5 + 2 * vnoise(x, 0, .2, 4), headEnd = x => 25 + 2 * vnoise(x, 0, .2, 5);
const shoreZ = x => 10.5 - 4 * (x / 22) ** 2 + 1.2 * vnoise(x, 0, .12, 6);
const zone = (x, z) => x < ridgeX(z) ? (z < armEnd(x) ? 'ridge' : 'sea') : z < cliffZ(x) ? 'plat' : x > headX(z) ? (z < headEnd(x) ? 'head' : 'sea') : z < shoreZ(x) ? 'beach' : 'sea';
const ZH = { plat: PLAT, ridge: RIDGE, head: HEAD, beach: 0 };
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), zn = zone(i - O + .5, j - O + .5);
  if (zn === 'sea') continue;
  kind[c] = zn === 'beach' ? SAND : GRASS; H[c] = base[c] = ZH[zn];
}
// kept flat: pads, buildings, stair ends
const KEEP = [...M.pads.map(([x, z]) => [x, z, 2.6]), [14, -28, 5], [-10, -30, 4.2], [29, 8, 7], [-30, 4, 3.5], [-23.5, -24, 2.5], [-24, -32, 2.5], [-15, -32, 2],
  [-9, -18.5, 2], [23.5, -4.5, 2.5], [-23.5, 17, 2.5], [-23.5, 11, 2], [-6.5, -19, 1.6], [5.5, -19, 1.6], [7, 1, 2.5], [-10.5, 5.5, 2.5]];
const kept = (x0, z0) => KEEP.some(([px, pz, r]) => Math.hypot(Math.max(x0 - px, 0, px - x0 - 1), Math.max(z0 - pz, 0, pz - z0 - 1)) < r);
// soft slopes: up from the beach onto the ridge, and from the headland up to the plateau
const BLOBS = [[-21, -1, 5.5, 4.2, RIDGE, 0, ['ridge', 'beach']], [30, -16.5, 5, 4.5, PLAT, HEAD, ['plat', 'head']]];
BLOBS.forEach(([bx, bz, rx, rz, top, low, zs], k) => {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j), x = i - O + .5, z = j - O + .5;
    if (!zs.includes(zone(x, z)) || ((x - bx) / rx) ** 2 + ((z - bz) / rz) ** 2 > 1 + .25 * vnoise(x, z, .3, 11 + k)) continue;
    H[c] = top; base[c] = low; soft[c] = 1; kind[c] = GRASS;
  }
});
// low bumps on the tops, dunes at the foot of the cliffs
const MOUNDS = [[-14, -33, 4, .9], [3, -33, 3.5, .45], [28, -33, 3.5, .9], [-31, 9, 3.5, .9], [-30, -26, 3, .45], [-31, -15, 3, .45], [31, 18, 3.5, .9], [-17, -11, 2.6, .45], [16, -12, 2.4, .45]];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x0 = i - O, z0 = j - O, x = x0 + .5, z = z0 + .5;
  if (kind[c] === SEA || soft[c] || kept(x0, z0)) continue;
  let raw = 0;
  for (const [mx, mz, r, h] of MOUNDS) { const d = Math.hypot(x - mx, z - mz); if (d < r) raw = Math.max(raw, h * (1 - (d / r) ** 2) + .15 * vnoise(x, z, .3, 12)); }
  const add = Math.floor(raw / LV) * LV;
  if (add > 0) { H[c] = base[c] + add; soft[c] = 1; }
}
for (let changed = true; changed;) { // soft ground: never more than a step above a neighbour
  changed = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j); if (!soft[c]) continue;
    let lim = H[c];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && kind[n] !== SEA) lim = Math.min(lim, H[n] + LV); }
    lim = r2(Math.max(lim, base[c]));
    if (lim < H[c] - 1e-6) { H[c] = lim; changed = true; }
  }
}
for (let c = 0; c < N * N; c++) H[c] = r2(H[c]);
// rocks: on the beach, in the shallows, stacks out in the bay
const ROCKS = [[8, -7.5, 2.2, 1.6, .9], [8.6, -7.8, 1.2, .9, 1.8], [-12, -9, 1.6, 1.3, 1.35], [13, 11, 1.3, 1, .9], [10.5, 22, 1.7, 1.5, 5.4], [17, 28.5, 1.3, 1.2, 3.6], [24, 30, 2.2, 1.6, 2.7], [-26, 27, 2, 1.5, 1.8]];
ROCKS.forEach(([rx, rz, ax, az, h], k) => {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j), x = i - O + .5, z = j - O + .5;
    const dd = ((x - rx) / ax) ** 2 + ((z - rz) / az) ** 2;
    if (dd > 1 + .3 * vnoise(x, z, .5, 20 + k)) continue;
    const hh = Math.max(LV, Math.round((h * (1 - .35 * dd) + .7 * vnoise(x, z, .8, 40 + k) * Math.min(1, h / 2.7)) / LV) * LV); // lumpy tops
    H[c] = Math.max(kind[c] === SEA ? 0 : H[c], hh); kind[c] = ROCK; soft[c] = 0;
  }
});
// stone steps cut into the plateau, up from the ridge
for (let z0 = -33; z0 <= -31; z0++) for (let x0 = -22; x0 <= -16; x0++) { const c = at(x0 + O, z0 + O); H[c] = r2(RIDGE + LV * (x0 + 23)); kind[c] = STEPS; }
// dirt paths between the ways up and the buildings
const PATHS = [[[-23.5, -1], [-28, -4.5], [-27.5, -14], [-24.5, -22.5]], [[-27.5, -14], [-25.5, -27], [-23.5, -31]], [[-28, -4.5], [-28, 3], [-25, 9.5], [-23.8, 16.2]],
  [[-15, -32], [-11, -27.6], [-9, -19]], [[-9, -19.5], [0, -21], [9.6, -24.3]], [[13, -24.5], [21, -28.5], [28, -22], [30, -17]], [[30, -12], [29, 2.6]], [[23, -4.5], [24, 7]]];
for (const pts of PATHS) for (let k = 1; k < pts.length; k++) {
  const [ax, az] = pts[k - 1], [bx, bz] = pts[k], L = Math.hypot(bx - ax, bz - az);
  for (let s = 0; s <= L; s += .25) {
    const px = ax + (bx - ax) * s / L, pz = az + (bz - az) * s / L;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const c = cellAt(px + a, pz + b); if (c >= 0 && kind[c] === GRASS && Math.hypot(ci(px + a) - O + .5 - px, ci(pz + b) - O + .5 - pz) < .85) kind[c] = PATH; }
  }
}
// the sea floor: shallow off the sand, deep fast under the cliffs
{
  const dS = new Int16Array(N * N).fill(99), dR = new Int16Array(N * N).fill(99);
  for (const [d, src] of [[dS, k => k === SAND], [dR, k => k !== SAND]]) {
    const q = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (kind[at(i, j)] === SEA && D4.some(([a, b]) => inGrid(i + a, j + b) && kind[at(i + a, j + b)] !== SEA && src(kind[at(i + a, j + b)]))) { d[at(i, j)] = 1; q.push(at(i, j)); }
    for (let k = 0; k < q.length; k++) {
      const i = q[k] % N, j = q[k] / N | 0;
      for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && kind[n] === SEA && d[n] > d[q[k]] + 1) { d[n] = d[q[k]] + 1; q.push(n); } }
    }
  }
  for (let c = 0; c < N * N; c++) if (kind[c] === SEA) { const d = Math.min(dS[c], dR[c] + 2); SF[c] = d <= 2 ? -LV : d <= 4 ? -2 * LV : -SEA_D; }
}
// the smugglers' cave: a chamber under the plateau, a mouth onto the beach, a tunnel climbing west to the ridge
const part = new Uint8Array(N * N); // 1 chamber, 2 mouth, 3 tunnel
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const c = at(i, j), x0 = i - O, z0 = j - O, x = x0 + .5, z = z0 + .5;
  if (zone(x, z) !== 'plat') continue;
  if (((x + 1) / 6.5) ** 2 + ((z + 26) / 4.6) ** 2 <= 1 + .16 * vnoise(x, z, .35, 30)) { part[c] = 1; CF[c] = z0 <= -29 ? LV : 0; }
  else if (x0 >= -3 && x0 <= 0 && z0 >= -23) part[c] = 2;
  else if ((z0 === -25 || z0 === -24) && x0 >= -22 && x0 <= -7) { part[c] = 3; CF[c] = r2(LV * clamp(-11 - x0, 0, 7)); }
  if (part[c]) cave[c] = 1;
}
const caveK = new Float64Array(N * N); // light reaching in from the openings
{
  const dd = new Int16Array(N * N), q = [];
  for (let c = 0; c < N * N; c++) if (cave[c]) { const i = c % N, j = c / N | 0; if (D4.some(([a, b]) => !inGrid(i + a, j + b) || !cave[at(i + a, j + b)])) { dd[c] = 1; q.push(c); } }
  for (let k = 0; k < q.length; k++) { const i = q[k] % N, j = q[k] / N | 0; for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && cave[n] && !dd[n]) { dd[n] = dd[q[k]] + 1; q.push(n); } } }
  for (let c = 0; c < N * N; c++) if (cave[c]) CC[c] = part[c] === 3 ? r2(CF[c] + 2.25) : part[c] === 2 ? 2.7 : dd[c] >= 3 ? 3.6 : dd[c] === 2 ? 3.15 : 2.7;
  for (let c = 0; c < N * N; c++) if (cave[c]) { // head room over the floor next door too, so steps up and down never scrape the roof
    const i = c % N, j = c / N | 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      if (!inGrid(i + a, j + b)) continue;
      const n = at(i + a, j + b), f = cave[n] ? CF[n] : H[n];
      if (f < CC[c]) CC[c] = Math.max(CC[c], r2(f + 2.25)); // a body (1.8) and half a block
    }
  }
  const dl = new Int16Array(N * N).fill(-1), ql = [];
  for (let c = 0; c < N * N; c++) if (cave[c]) { const i = c % N, j = c / N | 0; if (D4.some(([a, b]) => { const n = inGrid(i + a, j + b) ? at(i + a, j + b) : -1; return n >= 0 && !cave[n] && hAt(i + a - O + .5, j + b - O + .5) < CC[c] - .3; })) { dl[c] = 0; ql.push(c); } }
  for (let k = 0; k < ql.length; k++) { const i = ql[k] % N, j = ql[k] / N | 0; for (const [a, b] of D4) { const n = at(i + a, j + b); if (inGrid(i + a, j + b) && cave[n] && dl[n] < 0) { dl[n] = dl[ql[k]] + 1; ql.push(n); } } }
  for (let c = 0; c < N * N; c++) if (cave[c]) caveK[c] = dl[c] < 0 ? .42 : Math.max(.42, .9 - .09 * dl[c]);
}

// textures
const lawn = tex(g => { noise(g, [98, 162, 76], 20); for (let i = 0; i < 6; i++) { g.fillStyle = ['rgba(55,100,35,.5)', 'rgba(180,220,120,.45)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); } });
const lipT = tex(g => {
  noise(g, [124, 98, 70], 20); g.fillStyle = 'rgba(70,45,25,.4)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, 4 + Math.random() * 12 | 0, 2, 1);
  for (let x = 0; x < 16; x++) { const d = 2 + (Math.random() * 3 | 0); for (let y = 0; y < d; y++) { g.fillStyle = `rgb(${92 + (x * 7 + y * 5) % 20},${156 + (x * 3) % 20},70)`; g.fillRect(x, y, 1, 1); } }
});
const dirtT = tex(g => { noise(g, [120, 94, 66], 20); g.fillStyle = 'rgba(70,45,25,.35)'; for (let i = 0; i < 7; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); });
const rockT = tex(g => {
  noise(g, [132, 124, 112], 16); g.fillStyle = 'rgba(70,60,50,.35)'; for (const y of [3, 9, 14]) g.fillRect(0, y, 16, 1);
  g.fillStyle = 'rgba(40,35,30,.4)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2);
  g.fillStyle = 'rgba(210,200,185,.25)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1);
});
const sandT = tex(g => { noise(g, [216, 198, 152], 12); g.fillStyle = 'rgba(160,130,90,.35)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); g.fillStyle = 'rgba(255,250,235,.35)'; for (let i = 0; i < 4; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); });
const wetT = tex(g => { noise(g, [176, 154, 114], 12); g.fillStyle = 'rgba(110,85,60,.3)'; for (let y = 2; y < 16; y += 5) g.fillRect(0, y, 16, 1); });
const drawBed = g => { noise(g, [188, 170, 126], 14); for (let i = 0; i < 7; i++) { g.fillStyle = ['rgba(140,115,80,.45)', 'rgba(230,220,190,.5)'][i % 2]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); } };
const caveT = tex(g => { noise(g, [104, 96, 90], 18); g.fillStyle = 'rgba(30,26,24,.45)'; for (let i = 0; i < 9; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2 + (Math.random() * 2 | 0), 1); });
const gravelT = tex(g => { noise(g, [118, 110, 100], 22); g.fillStyle = 'rgba(40,36,32,.4)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); });
const pathT = tex(g => { noise(g, [150, 124, 90], 18); g.fillStyle = 'rgba(95,78,58,.5)'; for (let i = 0; i < 9; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 2); });
const blockT = tex(g => { noise(g, [156, 150, 140], 12); g.fillStyle = 'rgba(70,64,58,.5)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); });

// meshes made of cell faces
function cellMesh(quads, mats) {
  quads.sort((p, q) => p[0] - q[0]);
  const pos = [], nor = [], uv = [], col = [], ind = [], geo = new THREE.BufferGeometry();
  let start = 0;
  quads.forEach(([m, vs, n], k) => {
    const [a, b, c] = vs, cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) vs = [...vs].reverse();
    const b0 = pos.length / 3;
    for (const v of vs) { pos.push(v[0], v[1], v[2]); nor.push(...n); uv.push(v[3], v[4]); const k = v[5] ?? 1; col.push(k, k, k); }
    ind.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
    if (k === quads.length - 1 || quads[k + 1][0] !== m) { geo.addGroup(start * 6, (k + 1 - start) * 6, m); start = k + 1; }
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(ind); geo.computeBoundingSphere(); geo.computeBoundingBox();
  const mesh = new THREE.Mesh(geo, mats); add(mesh); return mesh;
}
// the land: tops, cliffs, cave walls and ceilings, the shallow sea floor, in chunks so shots only check nearby ones
{
  const vc = map => lam({ map, vertexColors: true });
  const mats = [lawn, lipT, dirtT, rockT, sandT, wetT, tex(drawBed), caveT, gravelT, pathT, blockT].map(vc);
  const TOP = { [SAND]: 4, [GRASS]: 0, [ROCK]: 3, [PATH]: 9, [STEPS]: 10 };
  const BOT = -SEA_D, CH = 18;
  // what's solid in a column
  const spans = c => c < 0 ? [] : kind[c] === SEA ? [[BOT, SF[c]]] : cave[c] ? [[BOT, CF[c]], [CC[c], H[c]]] : [[BOT, H[c]]];
  const minus = (A, B) => {
    let out = A;
    for (const [b0, b1] of B) { const next = []; for (const [a0, a1] of out) { if (b1 <= a0 || b0 >= a1) { next.push([a0, a1]); continue; } if (b0 > a0) next.push([a0, b0]); if (b1 < a1) next.push([b1, a1]); } out = next; }
    return out.filter(([a, b]) => b - a > .01);
  };
  const occ = (x, z, h) => { let n = 0; for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const i = x + O + a, j = z + O + b; if (inGrid(i, j) && kind[at(i, j)] !== SEA && H[at(i, j)] > h + .01) n++; } return 1 - .14 * n; };
  const top = (m, x0, z0, y, k, down) => [m, [[x0, y, z0, 0, 1, k ?? occ(x0, z0, y)], [x0 + 1, y, z0, 1, 1, k ?? occ(x0 + 1, z0, y)], [x0 + 1, y, z0 + 1, 1, 0, k ?? occ(x0 + 1, z0 + 1, y)], [x0, y, z0 + 1, 0, 0, k ?? occ(x0, z0 + 1, y)]], [0, down ? -1 : 1, 0]];
  const face = (quads, m, x0, z0, a, b, y0, y1, k0, k1, lip) => { // one side of a cell from y0 to y1, facing (a, b)
    const ex = a > 0 ? x0 + 1 : x0, ez = b > 0 ? z0 + 1 : z0, v0 = lip ? 1 - (y1 - y0) : y0, v1 = lip ? 1 : y1;
    quads.push([m, a ? [[ex, y0, z0, 0, v0, k0], [ex, y0, z0 + 1, 1, v0, k0], [ex, y1, z0 + 1, 1, v1, k1], [ex, y1, z0, 0, v1, k1]]
      : [[x0, y0, ez, 0, v0, k0], [x0 + 1, y0, ez, 1, v0, k0], [x0 + 1, y1, ez, 1, v1, k1], [x0, y1, ez, 0, v1, k1]], [a, 0, b]]);
  };
  for (let cj = 0; cj < N; cj += CH) for (let cii = 0; cii < N; cii += CH) {
    const quads = [];
    for (let j = cj; j < cj + CH; j++) for (let i = cii; i < cii + CH; i++) {
      const c = at(i, j), x0 = i - O, z0 = j - O, sea = kind[c] === SEA;
      if (sea) { if (SF[c] > BOT + .01) quads.push(top(6, x0, z0, SF[c], .85)); }
      else {
        quads.push(top(TOP[kind[c]], x0, z0, H[c]));
        if (cave[c]) { quads.push(top(8, x0, z0, CF[c], caveK[c])); quads.push(top(7, x0, z0, CC[c], caveK[c] * .8, true)); }
      }
      for (const [a, b] of D4) {
        const n = inGrid(i + a, j + b) ? at(i + a, j + b) : -1;
        for (const [y0, y1] of minus(spans(c), spans(n))) {
          if (sea) { face(quads, 6, x0, z0, a, b, y0, y1, .7, .85); continue; }
          if (n >= 0 && cave[n] && y0 >= CF[n] - .01 && y1 <= CC[n] + .01) { const k = caveK[n]; face(quads, 7, x0, z0, a, b, y0, y1, k * .8, k); continue; }
          const h = y1 - y0, kd = kind[c];
          if (Math.abs(y1 - H[c]) > .01 || kd === ROCK) { face(quads, 3, x0, z0, a, b, y0, y1, .75, .92); continue; }
          if (kd === SAND) { face(quads, 5, x0, z0, a, b, y0, y1, .75, .95); continue; }
          if (kd === STEPS) { face(quads, 10, x0, z0, a, b, y0, y1, .75, .95); continue; }
          if (h <= .55) face(quads, 1, x0, z0, a, b, y0, y1, .78, 1, true); // grass: a lip on top, earth or rock below
          else { face(quads, 1, x0, z0, a, b, y1 - .5, y1, .9, 1, true); face(quads, h > 1.4 ? 3 : 2, x0, z0, a, b, y0, y1 - .5, .72, .92); }
        }
      }
    }
    if (quads.length) building.cover.push(cellMesh(quads, mats));
  }
}
// the sea: lighter over the shallows, out to the horizon
const waterMat = (rgb, op) => new THREE.MeshLambertMaterial({ transparent: true, opacity: op, depthWrite: false, map: tex(g => {
  noise(g, rgb, 14); g.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 14 | 0, Math.random() * 16 | 0, 3, 1);
}) });
const WM = [waterMat([80, 205, 200], .5), waterMat([50, 165, 185], .7), waterMat([28, 118, 160], .9)];
let foam;
{
  const quads = [], y = WATER_Y, q = (m, x0, x1, z0, z1) => quads.push([m, [[x0, y, z0, x0 / 3, -z0 / 3], [x1, y, z0, x1 / 3, -z0 / 3], [x1, y, z1, x1 / 3, -z1 / 3], [x0, y, z1, x0 / 3, -z1 / 3]], [0, 1, 0]]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = at(i, j); if (kind[c] === SEA) q(SF[c] > -LV - .01 ? 0 : SF[c] > -SEA_D + .01 ? 1 : 2, i - O, i - O + 1, j - O, j - O + 1); }
  const G = 220;
  q(2, -G, G, -G, -CA); q(2, -G, G, CA, G); q(2, -G, -CA, -CA, CA); q(2, CA, G, -CA, CA);
  cellMesh(quads, WM).renderOrder = 1;
  const fq = [], W = .6, fy = WATER_Y + .01;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (kind[at(i, j)] === SEA) continue;
    const x0 = i - O, z0 = j - O;
    for (const [a, b] of D4) {
      if (!inGrid(i + a, j + b) || kind[at(i + a, j + b)] !== SEA) continue;
      const e = a > 0 ? x0 + 1 : a < 0 ? x0 : b > 0 ? z0 + 1 : z0, s = a + b;
      fq.push([0, a ? [[e, fy, z0, 0, 1], [e + s * W, fy, z0, 0, 0], [e + s * W, fy, z0 + 1, 1, 0], [e, fy, z0 + 1, 1, 1]]
        : [[x0, fy, e, 0, 1], [x0, fy, e + s * W, 0, 0], [x0 + 1, fy, e + s * W, 1, 0], [x0 + 1, fy, e, 1, 1]], [0, 1, 0]]);
    }
  }
  foam = cellMesh(fq, [new THREE.MeshBasicMaterial({ transparent: true, opacity: .7, depthWrite: false, map: tex(g => {
    g.clearRect(0, 0, 16, 16); g.fillStyle = '#ffffff';
    for (let x = 0; x < 16; x++) { const h = 3 + (Math.random() * 7 | 0); g.fillRect(x, 0, 1, h); if (Math.random() < .4) g.fillRect(x, h + 2, 1, 2); }
  }) })]);
  foam.renderOrder = 2;
}
addGround(220, lam({ map: tex(drawBed, 440, 440) })).position.y = -SEA_D;
addWall(0, -CA, CA * 2 + .3, .3); addWall(0, CA, CA * 2 + .3, .3);
addWall(-CA, 0, .3, CA * 2 + .3); addWall(CA, 0, .3, CA * 2 + .3);

// --- things built on it ---
const planks = surf(lam({ map: tex(g => { noise(g, [140, 102, 64], 18); g.fillStyle = 'rgba(50,30,15,.5)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); g.fillRect(6, 1, 1, 3); g.fillRect(12, 5, 1, 3); g.fillRect(3, 9, 1, 3); g.fillRect(10, 13, 1, 3); }) }), 'wood');
const darkWood = surf(lam({ map: tex(g => { noise(g, [92, 62, 40], 14); g.fillStyle = 'rgba(25,14,6,.5)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const trim = surf(lam({ map: tex(g => noise(g, [196, 156, 66], 14)) }), 'wood');
const postMat = surf(lam({ map: tex(g => { noise(g, [86, 62, 42], 16); g.fillStyle = 'rgba(0,0,0,.3)'; for (const x of [4, 11]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const stone = surf(lam({ map: blockT }), 'stone');
const mossy = surf(lam({ map: tex(g => {
  noise(g, [146, 144, 132], 14); g.fillStyle = 'rgba(70,64,58,.5)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8);
  g.fillStyle = 'rgba(80,120,55,.6)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 6 | 0, 2, 1);
}) }), 'stone');
const boulder = surf(lam({ map: rockT }), 'stone');
const iron = surf(lam({ color: 0x33373c }), 'metal');
const darkRope = lam({ color: 0x4a3a2a }), ropeMat = lam({ color: 0xc9b48a });
const barrelMat = surf(lam({ map: tex(g => { noise(g, [128, 86, 50], 16); g.fillStyle = 'rgba(40,25,10,.5)'; for (const x of [0, 5, 10]) g.fillRect(x, 0, 1, 16); g.fillStyle = '#3a3a3e'; g.fillRect(0, 2, 16, 2); g.fillRect(0, 12, 16, 2); }) }), 'wood');
const sailMat = lam({ side: THREE.DoubleSide, map: tex(g => { noise(g, [238, 230, 210], 8); g.fillStyle = 'rgba(120,100,70,.2)'; g.fillRect(0, 5, 16, 1); g.fillRect(0, 11, 16, 1); g.fillRect(7, 0, 1, 16); }) });
const lanternMat = lam({ color: 0xffe2a0, emissive: 0xffb050, emissiveIntensity: 1 });
const goldMat = lam({ color: 0xf2c440, emissive: 0x6a4a08 });
const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: .95 }), flameMat2 = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: .9 });
const glowMat = new THREE.SpriteMaterial({ map: sunGlowTex, color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const rect = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);
const deco = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); add(b); return b; };
const solid = (x0, x1, z0, z1, bot, top, sf, round) => { const s = { mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot, top, surf: sf }; if (round) s.round = round; building.solids.push(s); return s; };
const line = (a, b, m = darkRope, t = .04) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), r = box(t, t, L, m); r.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); r.lookAt(b[0], b[1], b[2]); add(r); return r; };
const glows = [], glow = (x, y, z, s = 2.2) => { const g = new THREE.Sprite(glowMat); g.scale.setScalar(s); g.position.set(x, y, z); add(g); glows.push(g); return g; };
// lowest and highest ground under a rectangle
const under = (x0, x1, z0, z1) => { let lo = 99, hi = -99; for (let j = ci(z0 + .01); j <= ci(z1 - .01); j++) for (let i = ci(x0 + .01); i <= ci(x1 - .01); i++) { const h = hAt(i - O + .5, j - O + .5); lo = Math.min(lo, h); hi = Math.max(hi, h); } return [lo, hi]; };
const onGround = (x, z, w, d, h, m) => { const [lo, hi] = under(x - w / 2, x + w / 2, z - d / 2, z + d / 2); return addSlab(x, z, w, d, lo, hi + h, m); };
const barrelGeo = new THREE.CylinderGeometry(.4, .4, 1, 10);
const barrel = (x, z, y) => { const m = new THREE.Mesh(barrelGeo, barrelMat); m.position.set(x, y + .5, z); add(m); building.cover.push(m); solid(x - .4, x + .4, z - .4, z + .4, y, y + 1, 'wood', .4); };
const crate = (x, z, y, tall) => addSlab(x, z, 1.2, 1.2, y, y + (tall ? 2.4 : 1.2), tall ? crate2 : crate1);
const flames = [];
function torch(x, z, y, h = 1.7) {
  deco(.14, h, .14, postMat, x, y + h / 2, z); solid(x - .1, x + .1, z - .1, z + .1, y, y + h, 'wood');
  deco(.28, .12, .28, iron, x, y + h, z);
  flames.push(deco(.2, .32, .2, flameMat, x, y + h + .2, z)); glow(x, y + h + .25, z, 2.6);
}
function lantern(x, y, z, hang = 0) {
  if (hang) line([x, y + .2, z], [x, y + .2 + hang, z], iron, .03);
  deco(.32, .06, .32, iron, x, y + .2, z); deco(.22, .3, .22, lanternMat, x, y, z); deco(.32, .06, .32, iron, x, y - .18, z); glow(x, y, z, 2.8);
}
// a cannon on its carriage, pointing along yaw
function cannon(x, z, y, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; add(g);
  const p = (w, h, d, m, px, py, pz) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); return b; };
  const cart = p(.8, .32, 1.3, planks, 0, .36, 0);
  for (const sx of [-.46, .46]) for (const sz of [-.42, .42]) p(.12, .44, .44, darkWood, sx, .22, sz);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.15, .21, 1.8, 10), iron); b.rotation.x = Math.PI / 2 - .1; b.position.set(0, .72, .25); g.add(b);
  p(.28, .28, .28, iron, 0, .7, -.72);
  building.cover.push(cart, b);
  solid(x - .7, x + .7, z - .7, z + .7, y, y + .9, 'metal');
}
// open wooden steps on two side boards; the foot at (x, z), climbing along ax in dir
function stairs(x, z, ax, dir, y0, y1, n, run = .8, w = 1.3, legs = 0) {
  const P = d => ax === 'x' ? [x + dir * d, z] : [x, z + dir * d];
  for (let k = 0; k < n; k++) {
    const [cx, cz] = P((k + .5) * run), t = y0 + (y1 - y0) * (k + 1) / n;
    addSlab(cx, cz, ax === 'x' ? run + .02 : w, ax === 'x' ? w : run + .02, t - .12, t, planks);
  }
  const L = n * run, a = Math.atan2(y1 - y0, L), k = (y1 - y0) / L, half = .16 / Math.cos(a);
  const top = d => y0 + k * d + (y1 - y0) / n - .1; // the side boards' top edge runs under the front of every tread
  const end = L - Math.min(.3 / k, run), len = end / Math.cos(a), [mx, mz] = P(end / 2); // and stops short of the top so it doesn't stick up past it
  for (const o of [-1, 1]) {
    const s = o * (w / 2 + .06), e = o * (w / 2 + .12), side = d => { const [px, pz] = P(d); return hAt(px + (ax === 'x' ? 0 : e), pz + (ax === 'x' ? e : 0)); };
    if ([.15, .35, .55, .75].some(f => side(L * f) > top(L * f) - 2 * half)) continue; // against a cliff: the treads run into the rock, no board or posts
    const b = box(ax === 'x' ? len : .12, .32, ax === 'x' ? .12 : len, postMat);
    b.position.set(mx + (ax === 'x' ? 0 : s), top(end / 2) - half, mz + (ax === 'x' ? s : 0));
    if (ax === 'x') b.rotation.z = dir * a; else b.rotation.x = -dir * a;
    add(b);
    if (legs) for (const f of [.4, .75, 1]) { // posts down to the ground
      const d = Math.min(L * f - .1, end - .1), [px, pz] = P(d), h = top(d) - 2 * half + .05 - legs[1], qx = px + (ax === 'x' ? 0 : s), qz = pz + (ax === 'x' ? s : 0);
      if (h > .2) building.cover.push(deco(.14, h, .14, postMat, qx, legs[1] + h / 2, qz));
    }
  }
}
// plank bridges: flat steps you walk on under a sloped deck
function bridge(x0, z0, y0, x1, z1, y1, w = 1.6, rails = true) {
  const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0, y1 - y0), n = Math.max(6, Math.ceil(Math.abs(y1 - y0) / .25)), hw = w / 2;
  for (let k = 0; k < n; k++) {
    const y = y0 + (y1 - y0) * (k + (y1 > y0 ? 1 : 0)) / n, u0 = k / n, u1 = (k + 1) / n;
    const xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1, za = z0 + (z1 - z0) * u0, zb = z0 + (z1 - z0) * u1;
    solid(Math.min(xa, xb) - (ax ? 0 : hw), Math.max(xa, xb) + (ax ? 0 : hw), Math.min(za, zb) - (ax ? hw : 0), Math.max(za, zb) + (ax ? hw : 0), y - .25, y, 'wood');
  }
  const d = tbox(ax ? len : w, .12, ax ? w : len, planks); d.position.set((x0 + x1) / 2, (y0 + y1) / 2 - .06, (z0 + z1) / 2);
  if (ax) d.rotation.z = Math.atan2(y1 - y0, x1 - x0); else d.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
  add(d); building.cover.push(d);
  if (!rails) return;
  for (const o of [-hw, hw]) {
    const ox = ax ? 0 : o, oz = ax ? o : 0;
    line([x0 + ox, y0 + .95, z0 + oz], [x1 + ox, y1 + .95, z1 + oz], ropeMat, .05);
    for (const [x, z, y] of [[x0, z0, y0], [x1, z1, y1]]) deco(.1, 1, .1, postMat, x + ox, y + .5, z + oz);
  }
}

// --- the beach ---
addCrates(M.crates);
const cliffFoot = x => { const i = ci(x); for (let j = ci(-5); j > 0; j--) if (H[at(i, j - 1)] >= PLAT - .01) return j - O; return -17; };
for (const x of [-3.7, 1.7]) torch(x, cliffFoot(x) + .5, 0);
barrel(-5.4, -15.6, 0); barrel(3.6, -15.8, 0); barrel(-6.4, -12.2, 0);
// campfire with log seats
{
  const FX = 7, FZ = 1;
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; deco(.3, .22, .3, boulder, FX + Math.cos(a) * .55, .11, FZ + Math.sin(a) * .55).rotation.y = a; }
  for (const a of [.3, 1.9]) deco(1, .14, .14, darkWood, FX, .14, FZ).rotation.y = a;
  solid(FX - .7, FX + .7, FZ - .7, FZ + .7, 0, .22, 'stone');
  flames.push(deco(.34, .5, .34, flameMat, FX, .42, FZ), deco(.2, .36, .2, flameMat2, FX + .08, .46, FZ - .05));
  glow(FX, .7, FZ, 4);
  for (const [x, z, alongX] of [[FX - 2, FZ, 0], [FX + 2, FZ, 0], [FX, FZ + 2, 1]]) { const w = alongX ? 1.6 : .42, d = alongX ? .42 : 1.6; building.cover.push(deco(w, .4, d, barkMat, x, .2, z)); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, .4, 'wood'); }
}
// a rowboat pulled up on the sand
{
  const BX = -10.5, BZ = 5.5, L = 3.6, W = 1.5, T = .14;
  rect(BX - L / 2 + .4, BX + L / 2 - .3, BZ - W / 2, BZ - W / 2 + T, 0, .7, darkWood); rect(BX - L / 2 + .4, BX + L / 2 - .3, BZ + W / 2 - T, BZ + W / 2, 0, .7, darkWood);
  rect(BX + L / 2 - .3, BX + L / 2, BZ - W / 2, BZ + W / 2, 0, .7, darkWood); // the stern
  rect(BX - L / 2, BX - L / 2 + .4, BZ - W / 2 + .35, BZ + W / 2 - .35, 0, .8, darkWood); // the bow
  rect(BX - L / 2 + .4, BX + L / 2 - .3, BZ - W / 2 + T, BZ + W / 2 - T, 0, .12, planks);
  rect(BX - .2, BX + .2, BZ - W / 2 + T, BZ + W / 2 - T, .12, .45, planks); // seat
  deco(L - .7, .1, .06, trim, BX + .05, .55, BZ - W / 2 - .01); deco(L - .7, .1, .06, trim, BX + .05, .55, BZ + W / 2 + .01);
  for (const s of [-1, 1]) deco(2.4, .06, .1, postMat, BX + .4, .5, BZ + s * .4).rotation.y = s * .15; // oars
}
// fishing nets drying on a frame
{
  const NX = 12.5, NZ = 5;
  for (const x of [NX - 1.4, NX + 1.4]) { building.cover.push(deco(.16, 2, .16, postMat, x, 1, NZ)); solid(x - .1, x + .1, NZ - .1, NZ + .1, 0, 2, 'wood'); }
  deco(3, .12, .12, postMat, NX, 1.95, NZ);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.6), seeThru(tex(g => { g.clearRect(0, 0, 16, 16); g.fillStyle = '#5a5040'; for (let k = 0; k < 16; k += 4) { g.fillRect(k, 0, 1, 16); g.fillRect(0, k, 16, 1); } }, 3, 2)));
  net.position.set(NX, 1.15, NZ); add(net);
}
// driftwood and stones
for (const [x, z, l, r] of [[-15, 8, 2.2, .4], [3, 8.4, 1.6, -.7], [17.5, 2, 2, 1.2], [-2, -9, 1.4, .2]]) deco(l, .22, .26, barkMat, x, .11, z).rotation.y = r;
for (const [x, z, s] of [[-18.5, 6, 1], [19, -14, 1.1], [-19.5, -14.5, .9]]) onGround(x, z, s, s * .9, s * .8, boulder).rotation.y = rnd();
// --- the cave ---
for (const [x, z] of [[-4, -24], [2.5, -27], [-1.5, -29.2], [-1, -20.5]]) { const c = cellAt(x, z); if (c >= 0 && cave[c]) lantern(x, CC[c] - .5, z, .3); }
for (const x of [-9.5, -14.5, -19.5]) { const c = cellAt(x, -24.5); if (c >= 0 && cave[c]) lantern(x, CF[c] + 1.7, -24.8); } // on the tunnel wall
{ // the stash: a chest of gold on the back ledge, a table with a map
  const cx = 1.5, cz = -29.4, y = LV;
  rect(cx - .55, cx + .55, cz - .35, cz + .35, y, y + .6, darkWood);
  deco(1.14, .08, .74, trim, cx, y + .45, cz); deco(.18, .2, .06, goldMat, cx, y + .32, cz + .37);
  for (let k = 0; k < 7; k++) deco(.18, .12, .18, goldMat, cx - .35 + (k % 4) * .24, y + .66 + (k > 3 ? .1 : 0), cz - .12 + (k % 2) * .2);
  for (let k = 0; k < 6; k++) deco(.2, .1, .2, goldMat, cx + .9 + (k % 3) * .22, y + .05 + (k > 2 ? .1 : 0), cz + .1 - (k % 2) * .2);
  const tx = -4.4, tz = -23.6;
  rect(tx - .75, tx + .75, tz - .45, tz + .45, .8, .92, planks);
  for (const [a, b] of [[-.6, -.32], [.6, -.32], [-.6, .32], [.6, .32]]) deco(.1, .8, .1, postMat, tx + a, .4, tz + b);
  solid(tx - .75, tx + .75, tz - .45, tz + .45, 0, .8, 'wood');
  deco(.7, .02, .5, lam({ map: tex(g => { noise(g, [220, 200, 150], 14); g.fillStyle = '#6a4a2a'; g.fillRect(3, 4, 6, 1); g.fillRect(8, 4, 1, 6); g.fillRect(5, 10, 4, 1); g.fillStyle = '#b02a20'; g.fillRect(10, 9, 2, 1); g.fillRect(11, 8, 1, 3); }) }), tx + .1, .94, tz);
  barrel(4.2, -24.4, 0); barrel(4.5, -25.4, 0); barrel(-6.2, -26.2, 0);
}

// --- the pier ---
const SX = -11.5, SW = 3, SZ0 = 12, SZ1 = 31, DECK = 2.25, QD = 4.05, FC = 3.15, QZ = 25, FZ = 16; // the ship
{
  const X0 = -5.5, X1 = -3, Z0 = 6.5, Z1 = 29.5, Y = .9;
  rect(X0, X1, Z0, Z1, Y - .25, Y, planks);
  rect(X0, X1, Z0 - 1, Z0, 0, LV, planks); // a step up from the sand
  for (let z = Z0 + 1.5; z < Z1; z += 2.5) for (const x of [X0 + .15, X1 - .15]) { const f = hAt(x, z); building.cover.push(deco(.26, Y - .25 - f, .26, postMat, x, (f + Y - .25) / 2, z)); solid(x - .13, x + .13, z - .13, z + .13, f - 1, Y - .25, 'wood'); }
  for (const [x, z] of [[X0 + .2, 12.2], [X1 - .2, 12.2], [X1 - .2, Z1 - .2], [X0 + .2, 20.8]]) { building.cover.push(deco(.28, .5, .28, postMat, x, Y + .25, z)); solid(x - .14, x + .14, z - .14, z + .14, Y, Y + .5, 'wood'); }
  torch(X0 + .2, Z1 - .2, Y, 1.6);
  crate(-4.6, 14.6, Y); barrel(-3.6, 24.4, Y); barrel(-4.5, 25.2, Y);
  bridge(X0, 19, Y, SX + SW, 19, DECK, 1.1, false); // the gangplank
}
// --- the ship: moored in the bay, bow to the beach ---
const hullWood = surf(lam({ map: tex(g => { noise(g, [92, 62, 40], 14); g.fillStyle = 'rgba(25,14,6,.55)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); g.fillStyle = 'rgba(25,14,6,.35)'; for (const [x, y] of [[3, 1], [11, 5], [6, 9], [14, 13]]) g.fillRect(x, y, 1, 3); }, .5) }), 'wood'); // long planks
const tarWood = surf(lam({ map: tex(g => { noise(g, [48, 37, 30], 10); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 8, 16, 1); }) }), 'wood');
const deckWood = surf(lam({ map: tex(g => { noise(g, [140, 102, 64], 18); g.fillStyle = 'rgba(50,30,15,.5)'; for (const x of [0, 4, 8, 12]) g.fillRect(x, 0, 1, 16); for (const [x, y] of [[1, 6], [5, 12], [9, 3], [13, 10]]) g.fillRect(x, y, 3, 1); }, 1, .5) }), 'wood'); // planks running fore and aft
const grate = surf(lam({ map: tex(g => { g.fillStyle = '#1c140e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#7a5838'; for (let k = 0; k < 16; k += 4) { g.fillRect(k, 0, 2, 16); g.fillRect(0, k, 16, 2); } }) }), 'wood');
const portMat = lam({ color: 0x100c0a });
const BOW = 15.5, TIP = .18, DEEP = FC + SEA_D;
const bowZ = y => SZ0 + 1.5 * clamp((FC - y) / DEEP, 0, 1) ** 1.5; // the stem leans out going up
const bowT = k => (k / 16) ** 1.6;
const halfW = (z, y = FC) => { const z0 = bowZ(y), t = clamp((z - z0) / (BOW - z0), 0, 1); return TIP + (SW - TIP) * (1 - (1 - t) ** (1.55 - .45 * clamp((FC - y) / DEEP, 0, 1))); }; // full at the deck, finer below
// a smooth surface through rows of points, facing away from `from`
const V3 = (...a) => new THREE.Vector3(...a);
function skin(rows, m, from, cover = true) {
  const C = rows[0].length, pos = rows.flat(2), idx = [];
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < C - 1; j++) { const a = i * C + j, b = a + C; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const k = idx.length / 2 - idx.length / 2 % 6, p = n => V3(pos[idx[k + n] * 3], pos[idx[k + n] * 3 + 1], pos[idx[k + n] * 3 + 2]);
  if (p(1).sub(p(0)).cross(p(2).sub(p(0))).dot(p(0).sub(V3(...from))) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  const o = new THREE.Mesh(g, m); o.userData.uvk = 1; add(o); if (cover) building.cover.push(o); return o;
}
// outward normals along a path of [x, z] points (outward is to the left of travel), mitred at the corners
const outN = P => P.map((p, i) => {
  const seg = (u, w) => { const dx = w[0] - u[0], dz = w[1] - u[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  const a = i > 0 && seg(P[i - 1], p), b = i < P.length - 1 && seg(p, P[i + 1]);
  if (!a || !b) return a || b;
  let mx = a[0] + b[0], mz = a[1] + b[1]; const l = Math.hypot(mx, mz) || 1, k = 1 / Math.max(.4, (mx * a[0] + mz * a[1]) / l);
  return [mx / l * k, mz / l * k];
});
// a strip along a path from y to y + h, from `a` to `b` out from it
function band(P, y, h, a, b, m, inner = true, cover = false) {
  const N = outN(P), at = (u, v) => P.map((p, i) => [p[0] + N[i][0] * u, v, p[1] + N[i][1] * u]);
  const ib = at(a, y), it = at(a, y + h), ob = at(b, y), ot = at(b, y + h), c = P.length >> 1, mid = (u, v) => [P[c][0] + N[c][0] * u, v, P[c][1] + N[c][1] * u];
  skin([ob, ot], m, mid(a - 5, y), cover); skin([it, ot], m, mid(a, y - 5), cover); skin([ib, ob], m, mid(a, y + h + 5), cover);
  if (inner) skin([ib, it], m, mid(b + 5, y), cover);
  for (const [e, f] of [[0, 1], [P.length - 1, P.length - 2]]) skin([[ib[e], ob[e]], [it[e], ot[e]]], m, [(P[f][0] + N[f][0] * (a + b) / 2), y + h / 2, P[f][1] + N[f][1] * (a + b) / 2], cover);
}
// a box that tiles its texture, no collision
const panel = (x0, x1, z0, z1, bot, top, m, cover = true) => { const b = tbox(x1 - x0, top - bot, z1 - z0, m); b.position.set((x0 + x1) / 2, (bot + top) / 2, (z0 + z1) / 2); add(b); if (cover) building.cover.push(b); return b; };
const along = (a, d, s) => a.map((v, i) => v + d[i] * s);
{
  // the hull: a curved bow (walked on as steps), then plain sides
  const YS = [-SEA_D, -2, -1, -.4, .2, .8, 1.4, 2, 2.6, FC];
  for (const s of [-1, 1]) skin(YS.map(y => { const z0 = bowZ(y); return Array.from({ length: 17 }, (_, k) => { const z = z0 + bowT(k) * (BOW - z0); return [SX + s * halfW(z, y), y, z]; }); }), hullWood, [SX, 0, 20]);
  skin(YS.map(y => [[SX - TIP, y, bowZ(y)], [SX + TIP, y, bowZ(y)]]), hullWood, [SX, 0, 20]);
  for (let z = SZ0; z < BOW - .01; z += .5) { const w = halfW(z + .25); solid(SX - w, SX + w, z, z + .5, -SEA_D, FC, 'wood'); }
  rect(SX - SW, SX + SW, BOW, FZ, -SEA_D, FC, hullWood);
  rect(SX - SW, SX + SW, FZ, QZ, -SEA_D, DECK, hullWood);
  rect(SX - SW, SX + SW, QZ, SZ1, -SEA_D, QD, hullWood); // the stern cabin, the quarterdeck on top
  // the bow's bulwark, cap rail and deck
  const top = [];
  for (let k = 16; k >= 0; k--) { const z = SZ0 + bowT(k) * (BOW - SZ0); top.push([SX + halfW(z), z]); }
  top.unshift([SX + SW, FZ]); const bulwark = [...top, ...top.map(([x, z]) => [2 * SX - x, z]).reverse()];
  band(bulwark, FC, .8, -.16, 0, hullWood, true, true);
  band(bulwark, FC + .8, .08, -.22, .05, deckWood);
  band(bulwark, FC - .1, .12, -.02, .045, trim, false);
  const BN = outN(bulwark), IN = bulwark.map((p, i) => [p[0] - BN[i][0] * .16, FC + .02, p[1] - BN[i][1] * .16]), n = IN.length >> 1;
  skin([IN.slice(0, n).reverse(), IN.slice(n)], deckWood, [SX, FC - 5, 14]);
  for (let z = SZ0; z < FZ - .01; z += .5) { const w = halfW(z + .25); for (const s of [-1, 1]) solid(Math.min(SX + s * w, SX + s * (w - .2)), Math.max(SX + s * w, SX + s * (w - .2)), z, z + .5, FC, FC + .8, 'wood'); }
  solid(SX - halfW(SZ0 + .25), SX + halfW(SZ0 + .25), SZ0 - .1, SZ0 + .2, FC, FC + .8, 'wood'); // the very front
  // wales and a gold stripe all the way round, the stem up the front
  const around = y => { const L = []; for (let k = 0; k <= 16; k++) { const z = bowZ(y) + bowT(k) * (BOW - bowZ(y)); L.push([SX - halfW(z, y), z]); } L.push([SX - SW, SZ1], [SX + SW, SZ1]); return [...L, ...L.slice(0, 17).reverse().map(([x, z]) => [2 * SX - x, z])]; };
  band(around(.3), .3, .2, -.03, .09, tarWood, false); band(around(1.9), 1.9, .2, -.03, .09, tarWood, false); band(around(1.42), 1.42, .14, -.03, .05, trim, false);
  band([[SX - SW, QZ], [SX - SW, SZ1], [SX + SW, SZ1], [SX + SW, QZ]], QD - .12, .12, -.02, .045, trim, false);
  const stem = y => [SX, y, bowZ(y) - .1], SY = [-SEA_D, -1.8, -.8, .2, 1.1, 1.9, 2.6, FC, FC + .8];
  for (let k = 0; k < SY.length - 1; k++) { const a = stem(SY[k]), b = stem(SY[k + 1]), l = Math.hypot(b[1] - a[1], b[2] - a[2]), d = [0, (b[1] - a[1]) / l, (b[2] - a[2]) / l]; line(along(a, d, -.16), along(b, d, .16), tarWood, .38); }
  deco(.46, .55, .5, postMat, SX, FC + .78, SZ0 + .1); deco(.52, .06, .56, trim, SX, FC + 1.08, SZ0 + .1); // the knighthead the bowsprit runs through
  // gun ports with their lids up and guns run out
  const muzzle = new THREE.CylinderGeometry(.1, .12, .5, 8), ring = new THREE.CylinderGeometry(.15, .15, .08, 8);
  for (const s of [-1, 1]) for (const z of [17.6, 20.6, 23.4]) {
    const x = SX + s * SW;
    deco(.04, .46, .56, portMat, x + s * .01, 1.05, z); deco(.06, .07, .7, tarWood, x + s * .02, 1.31, z); deco(.06, .07, .7, tarWood, x + s * .02, .79, z);
    const lid = deco(.06, .5, .62, hullWood, x + s * .23, 1.2, z); lid.rotation.z = s * 1.15;
    for (const [g, o] of [[muzzle, .2], [ring, .42]]) { const m = new THREE.Mesh(g, iron); m.rotation.z = Math.PI / 2; m.position.set(x + s * o, 1, z); add(m); }
  }
  // rails: a planked wall with a cap and posts inside, open at the gangway and for the deck guns
  const rail = (s, z0, z1, y, ports = [], skip = []) => {
    const x = SX + s * (SW - .1);
    solid(x - .1, x + .1, z0, z1, y, y + .9, 'wood');
    panel(x - .1, x + .1, z0, z1, y, y + .42, hullWood);
    let z = z0; for (const p of [...ports, z1 + .35]) { if (p - .35 > z) panel(x - .1, x + .1, z, p - .35, y + .42, y + .9, hullWood); z = p + .35; }
    panel(x - .15, x + .15, z0, z1, y + .9, y + .98, deckWood);
    for (let p = z0 + .25; p < z1 - .15; p += 1.4) if (![...ports, ...skip].some(q => Math.abs(q - p) < .55)) deco(.07, .9, .1, postMat, x - s * .135, y + .45, p);
  };
  rail(-1, FZ, 16.2, DECK); rail(-1, 17.8, QZ, DECK, [20.6], [17.9, 18.6, 22, 23, 24]); rail(1, FZ, 18.4, DECK, [], [16.8, 17.7]); rail(1, 19.6, QZ, DECK, [20.6], [19.7, 22, 23, 24]);
  rail(-1, QZ, SZ1, QD); rail(1, QZ, SZ1, QD);
  solid(SX - SW + .2, SX + SW - .2, SZ1 - .2, SZ1, QD, QD + .9, 'wood'); panel(SX - SW + .2, SX + SW - .2, SZ1 - .2, SZ1, QD, QD + .9, hullWood); panel(SX - SW + .15, SX + SW - .15, SZ1 - .25, SZ1 + .05, QD + .9, QD + .984, planks);
  for (const [s, z] of [[-1, 16.1], [-1, 17.9], [1, 18.3], [1, 19.7]]) { deco(.22, 1.3, .22, postMat, SX + s * (SW - .1), DECK + .65, z); deco(.26, .08, .26, trim, SX + s * (SW - .1), DECK + 1.34, z); } // gangway posts
  // along the front of the quarterdeck, between the stairs: posts and a cap
  solid(SX - 1.4, SX + 1.4, QZ, QZ + .2, QD, QD + .9, 'wood');
  panel(SX - 1.4, SX + 1.4, QZ, QZ + .2, QD, QD + .1, hullWood); panel(SX - 1.45, SX + 1.45, QZ - .03, QZ + .23, QD + .9, QD + .98, planks);
  for (let k = 0; k < 10; k++) deco(.08, .8, .08, postMat, SX - 1.26 + k * .28, QD + .5, QZ + .1);
  for (const s of [-1, 1]) deco(.16, .9, .16, postMat, SX + s * 1.36, QD + .45, QZ + .1);
  // decks: light planks, a hatch, a step up to the forecastle and stairs to the quarterdeck
  panel(SX - SW + .2, SX + SW - .2, FZ, QZ, DECK, DECK + .02, deckWood, false); panel(SX - SW + .2, SX + SW - .2, QZ, SZ1 - .2, QD, QD + .02, deckWood, false);
  panel(SX - .7, SX + .7, 21.1, 22.4, DECK, DECK + .04, grate, false); for (const z of [21.1, 22.4]) deco(1.5, .06, .1, tarWood, SX, DECK + .03, z); for (const s of [-1, 1]) deco(.1, .06, 1.4, tarWood, SX + s * .75, DECK + .03, 21.75);
  rect(SX - .7, SX + .7, FZ, FZ + .9, DECK, DECK + LV, planks);
  stairs(SX - SW + .2 + .65, QZ - 3.6, 'z', 1, DECK, QD, 4, .9); stairs(SX + SW - .2 - .65, QZ - 3.6, 'z', 1, DECK, QD, 4, .9);
  // the cabin's front: a door and two windows; the stern: windows in gold frames, mouldings, corner posts and the rudder
  deco(1, 1.5, .06, postMat, SX, DECK + .75, QZ - .03); deco(1.16, .08, .08, trim, SX, DECK + 1.54, QZ - .04);
  for (const s of [-1, 1]) deco(.5, .4, .06, lanternMat, SX + s * 1.7, DECK + 1.1, QZ - .03);
  for (const x of [-1.6, 0, 1.6]) { deco(.72, .6, .04, trim, SX + x, 3.05, SZ1 + .02); deco(.55, .45, .06, lanternMat, SX + x, 3.05, SZ1 + .03); }
  for (const y of [2.6, 3.5]) deco(SW * 2 - .2, .1, .1, trim, SX, y, SZ1 + .05);
  for (const s of [-1, 1]) { deco(.22, QD + .3, .22, postMat, SX + s * (SW - .08), QD / 2 + .75, SZ1 + .04); deco(.1, .36, .1, postMat, SX + s * 2.6, QD + 1.16, SZ1 - .1); lantern(SX + s * 2.6, QD + 1.3, SZ1 - .1); }
  panel(SX - .15, SX + .15, SZ1, SZ1 + .12, -SEA_D, 2.5, postMat); panel(SX - .12, SX + .12, SZ1 + .12, SZ1 + .95, -2.8, 1.7, hullWood);
  for (const y of [-.5, .4, 1.3]) deco(.3, .08, .5, iron, SX, y, SZ1 + .3);
  // masts with iron bands, a crow's nest, yards and sails
  const MASTS = [[13.6, FC, 12], [19.6, DECK, 14], [30.2, QD, 11.5]];
  for (const [z, y, t] of MASTS) { rect(SX - .22, SX + .22, z - .22, z + .22, y, t, postMat); for (const h of [y + 1.4, y + 2.6, t - 2]) deco(.5, .08, .5, iron, SX, h, z); }
  deco(1.4, .1, 1.4, planks, SX, 12.95, 19.6);
  for (const s of [-1, 1]) { deco(1.4, .5, .08, darkWood, SX, 13.25, 19.6 + s * .66); deco(.08, .5, 1.24, darkWood, SX + s * .66, 13.25, 19.6); }
  const sail = (z, y0, y1, w) => {
    const g = new THREE.PlaneGeometry(w, y1 - y0, 6, 4), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2), v = p.getY(i) / ((y1 - y0) / 2); p.setZ(i, -.5 * (1 - u * u) * (1 - .4 * v * v)); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, sailMat); m.position.set(SX, (y0 + y1) / 2, z - .35); add(m);
    deco(w + .6, .16, .16, postMat, SX, y1 + .06, z - .3);
  };
  sail(19.6, 6.4, 9.4, 5.2); sail(19.6, 9.9, 12.5, 4.2); sail(13.6, 5.6, 8.6, 4.6); sail(30.2, 6.4, 9.2, 3.4);
  // shrouds: the foremast's to the bow's rail, the mainmast's to channels on the hull, the mizzen's to the quarterdeck rail
  for (const s of [-1, 1]) {
    for (const z of [13.6, 14.2, 14.8]) line([SX, 10.6, 13.6], [SX + s * (halfW(z) - .08), FC + .88, z]);
    const cx = SX + s * (SW + .18); deco(.36, .1, 1.7, darkWood, cx, DECK + .45, 20.5);
    for (const z of [19.8, 20.2, 21.1]) { deco(.16, .18, .12, tarWood, cx + s * .04, DECK + .6, z); line([cx + s * .04, DECK + .5, z], [SX + s * (SW + .01), 1.7, z], iron, .04); line([SX, 12.6, 19.6], [cx + s * .04, DECK + .68, z]); }
    for (const z of [29.6, 30.2, 30.8]) line([SX, 10.1, 30.2], [SX + s * (SW - .1), QD + .98, z]);
  }
  line([SX, 13.6, 19.6], [SX, 11.6, 13.6]); line([SX, 11, 30.2], [SX, 13.4, 19.6]);
  // the bowsprit: its heel on deck, through the knighthead, lashed down to the stem, a jib boom and a jib
  const heel = [SX, FC + .16, 13.3], dir = [0, .3536, -.9354], upD = [0, .9354, .3536], cap = along(heel, dir, 4.28);
  for (const s of [-1, 1]) deco(.12, .55, .14, postMat, SX + s * .21, FC + .27, 13.2); deco(.6, .1, .18, postMat, SX, FC + .58, 13.2); // bitts
  line(heel, cap, postMat, .26); line(cap, along(cap, dir, .22), postMat, .38);
  for (const k of [1.6, 2.7]) line(along(heel, dir, k), along(heel, dir, k + .07), iron, .32);
  const j0 = along(along(heel, dir, 2.9), upD, .2), j1 = along(j0, dir, 4);
  line(j0, j1, postMat, .15);
  for (const k of [1.55, 1.75]) line(along(heel, dir, k), [SX, FC - .6, bowZ(FC - .6) - .3], darkRope, .08); // lashed to the stem
  line(along(along(heel, dir, 3.9), upD, -.1), [SX, .7, bowZ(.7) - .22], iron, .05); // the bobstay
  const foreTop = [SX, 11.95, 13.6];
  line([SX, 11.6, 13.6], along(cap, upD, .18)); line(foreTop, j1);
  { const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), A = lerp(j1, foreTop, .08), B = lerp(j1, foreTop, .42), C = [SX, FC + 1.9, 11], n = 5, pos = [], uv = [], idx = [], id = [];
    for (let i = 0; i <= n; i++) { id.push([]); for (let j = 0; j <= n - i; j++) { const u = i / n, v = j / n, p = [0, 1, 2].map(a => A[a] + (B[a] - A[a]) * u + (C[a] - A[a]) * v); p[0] += 3 * u * v * (1 - u - v); id[i].push(pos.length / 3); pos.push(...p); uv.push(p[2], p[1]); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { idx.push(id[i][j], id[i + 1][j], id[i][j + 1]); if (j < n - i - 1) idx.push(id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); add(new THREE.Mesh(g, sailMat)); } // the jib
  // the anchors: one down through the hawse, one stowed under the cathead
  { const y = 2.45, z = 12.9, x = SX + halfW(z, y); deco(.1, .24, .24, iron, x + .02, y, z); line([x + .05, y, z], [SX + 2.4, -1.2, 11.4], iron, .07); }
  { const z = 12.7, x = SX - halfW(z) - .5; line([SX - halfW(z) + .3, FC + .55, z + .05], [x - .1, FC + .55, z], postMat, .2);
    line([x, FC + .5, z], [x, 2.85, z], darkRope, .05); deco(.1, 1.3, .1, iron, x, 2.2, z); deco(.08, .08, .8, iron, x, 2.85, z);
    for (const s of [-1, 1]) line([x, 1.58, z], [x, 1.86, z + s * .42], iron, .1); }
  // on deck
  cannon(SX - SW + .9, 20.6, DECK, -Math.PI / 2); cannon(SX + SW - .9, 20.6, DECK, Math.PI / 2);
  barrel(SX + SW - .7, 16.8, DECK); barrel(SX + SW - .7, 17.7, DECK); barrel(SX - SW + .7, 18.6, DECK);
  crate(SX, 23.3, DECK);
  // the wheel
  { const y = QD, z = 26.4; building.cover.push(deco(.2, 1, .2, postMat, SX, y + .5, z)); solid(SX - .12, SX + .12, z - .12, z + .12, y, y + 1, 'wood');
    const wh = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 6, 12), darkWood); wh.position.set(SX, y + 1.05, z - .14); add(wh);
    for (let k = 0; k < 4; k++) deco(1.05, .05, .05, darkWood, SX, y + 1.05, z - .14).rotation.z = k * Math.PI / 4; }
}
// flags: a black flag with a white skull
const flagTex = tex(g => {
  g.fillStyle = '#16161a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f2efe6';
  g.fillRect(6, 3, 4, 1); g.fillRect(5, 4, 6, 3); g.fillRect(6, 7, 4, 1); g.fillStyle = '#16161a'; g.fillRect(6, 5, 1, 1); g.fillRect(9, 5, 1, 1);
  g.fillStyle = '#f2efe6'; for (let k = 0; k < 5; k++) { g.fillRect(4 + k * 2, 9 + (k % 2), 2, 1); g.fillRect(12 - k * 2, 9 + (k % 2), 2, 1); }
});
const flagMat = new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide, transparent: true });
const flags = [];
function flag(x, y, z, h) {
  deco(.1, h, .1, postMat, x, y + h / 2, z); solid(x - .06, x + .06, z - .06, z + .06, y, y + h, 'wood');
  const g = new THREE.PlaneGeometry(1.5, 1, 8, 1); g.translate(.75, 0, 0);
  const m = new THREE.Mesh(g, flagMat); m.position.set(x + .05, y + h - .55, z); m.rotation.y = -.4; add(m);
  flags.push({ m, x0: Float32Array.from(g.attributes.position.array), ph: rnd() * 6 });
}
flag(SX, 11.5, 30.2, 1.6);

// --- the west ridge ---
const ridgeEdge = (z0, z1) => { let e = 99; for (let j = ci(z0 + .01); j <= ci(z1 - .01); j++) { let i = 0; while (i + 1 < N && kind[at(i + 1, j)] !== SEA && H[at(i + 1, j)] >= RIDGE - .01) i++; e = Math.min(e, i + 1 - O); } return e; };
bridge(ridgeEdge(16.2, 17.8) - .3, 17, RIDGE, SX - SW, 17, DECK, 1.6); // over to the ship
{ // a shed for the smuggled goods
  const x0 = -32.6, x1 = -28.2, z0 = 2, z1 = 6.2, y = RIDGE, h = 2.6;
  rect(x0, x0 + .2, z0 + .2, z1 - .2, y, y + h, planks);
  rect(x0, x1, z0, z0 + .2, y, y + h, planks); rect(x0, x1, z1 - .2, z1, y, y + h, planks);
  rect(x0 - .3, x1 + .5, z0 - .3, z1 + .3, y + h, y + h + .2, darkWood);
  crate(-31.6, 3, y); crate(-31.6, 4.3, y, true); barrel(-29.4, 5.3, y);
  lantern(x1 + .2, y + h - .4, (z0 + z1) / 2, .2);
}
{ // a crane for hauling goods up from the boats
  const z = 11, x = ridgeEdge(10.6, 11.4) - .8, y = RIDGE, t = y + 4.6;
  rect(x - .2, x + .2, z - .2, z + .2, y, t, postMat);
  deco(4.4, .22, .22, postMat, x + 2, t - .2, z); line([x, y + 2.6, z], [x + 1.6, t - .3, z], postMat, .14);
  line([x + 3.9, t - .3, z], [x + 3.9, y + 1.6, z], ropeMat, .05);
  deco(1, .8, 1, crate1, x + 3.9, y + 1.2, z); line([x + 3.5, y + 1.6, z - .4], [x + 3.9, y + 2.1, z], ropeMat, .03); line([x + 4.3, y + 1.6, z + .4], [x + 3.9, y + 2.1, z], ropeMat, .03);
  rect(x - 1, x - .4, z - .5, z + .5, y, y + .7, darkWood); // the winch
}
for (const [x, z, s] of [[-33, -11, 1.3], [-26.5, 13.5, 1.1], [-33.5, -21, 1.2]]) onGround(x, z, s, s * .9, s * .85, boulder).rotation.y = rnd();
// --- the plateau ---
{ // the watchtower
  const X0 = 11.5, X1 = 16.5, Z0 = -30.5, Z1 = -25.5, y = PLAT, T = 9;
  rect(X0, X1, Z0, Z1, y, T, mossy);
  for (const [x, z] of [[11.8, -30.2], [14, -30.2], [16.2, -30.2], [16.2, -28], [16.2, -25.8], [14, -25.8], [11.8, -25.8], [11.8, -27.6]]) rect(x - .3, x + .3, z - .3, z + .3, T, T + .9, stone);
  for (let k = 0; k < 6; k++) { const z1 = -24.9 - k * .8; rect(10.2, 11.5, z1 - .8, z1, y, y + LV * (k + 1), stone); } // steps up the west side
  flag(15.4, T, -27, 3.4);
}
{ // the ruin of a cottage
  const X0 = -13, X1 = -7, Z0 = -32.5, Z1 = -27.5, y = PLAT, T = .5;
  for (const [a, b, c, d, lo, hi] of [[X0, X1, Z0, Z0 + T, 0, 2.4], [X0 + 1.5, X1 - 1.5, Z0, Z0 + T, 2.4, 3.2], [X0 + 2.4, X1 - 2.4, Z0, Z0 + T, 3.2, 3.8],
    [X0, X0 + T, Z0 + T, Z1 - 2, 0, 2.1], [X0, X0 + T, Z1 - 1.2, Z1 - T, 0, 1.1], [X1 - T, X1, Z0 + T, Z0 + 2.6, 0, 1.8], [X1 - T, X1, Z0 + 2.6, Z1 - T, 0, .9],
    [X0, X0 + 2.4, Z1 - T, Z1, 0, 1.5], [X1 - 2, X1, Z1 - T, Z1, 0, 2]]) rect(a, b, c, d, y + lo, y + hi, mossy);
  deco(5, .3, .3, darkWood, -10.4, y + 1.1, -30.4).rotation.set(0, .5, .42); // a fallen roof beam
  for (const [x, z, s] of [[-8.4, -31.3, .6], [-11.6, -29, .5], [-12, -31.4, .7]]) rect(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y, y + s * .7, mossy);
}
for (const x of [-6.5, 5.5]) cannon(x, cliffFoot(x) - 1.3, PLAT, 0); // over the beach
for (const [x, z, w, d, h] of [[-2, -33.5, 4.4, .7, 1.1], [27, -25.5, .7, 3.6, 1.2], [7.5, -26, 3.2, .7, 1]]) onGround(x, z, w, d, h, mossy);
for (const [x, z, s] of [[2, -34, 1.4], [33, -27, 1.2], [-19, -21.8, 1.1]]) onGround(x, z, s, s * .9, s * .85, boulder).rotation.y = rnd();
// --- the headland fort ---
{
  const y = HEAD, X0 = 24, X1 = 34, Z0 = 3, Z1 = 13, T = .6, h = 1.2;
  for (const [a, b, c, d, hh] of [[X0, X0 + T, Z0, 6, h], [X0, X0 + T, 8, Z1 - T, h], [X0 + T, 28, Z0, Z0 + T, h], [30, X1 - T, Z0, Z0 + T, h], [X1 - T, X1, Z0, 10.4, h],
    [X0, 26, Z1 - T, Z1, h], [26, 27.4, Z1 - T, Z1, .5], [27.4, 29, Z1 - T, Z1, h], [29, 30.4, Z1 - T, Z1, .5], [30.4, 31.4, Z1 - T, Z1, h]]) rect(a, b, c, d, y, y + hh, mossy);
  rect(31.4, X1, 10.4, Z1, y, y + 2.25, mossy); // the corner tower
  for (const [x, z] of [[33.7, 10.7], [33.7, 12.7], [31.7, 12.7], [32.7, 12.7], [33.7, 11.7]]) rect(x - .3, x + .3, z - .3, z + .3, y + 2.25, y + 2.85, stone);
  for (let k = 0; k < 5; k++) rect(31.7, X1 - T, 5.9 + k * .9, 6.8 + k * .9, y, y + LV * (k + 1), stone); // rubble steps up to it
  cannon(26.7, 11.8, y, 0); cannon(29.7, 11.8, y, 0);
  crate(32.6, 4.4, y); barrel(25.4, 4.3, y); barrel(25.4, 11.6, y);
}
for (const [x, z, s] of [[34, -6, 1.2], [26, 20, 1.3]]) onGround(x, z, s, s * .9, s * .85, boulder).rotation.y = rnd();
// beach to headland: wooden steps along the cliff; beach to plateau: a switchback against the cliff
stairs(21.35, -10.4, 'z', 1, 0, HEAD, 8, .8, 1.3, [1, 0]);
stairs(-8.6, -14.95, 'x', -1, 0, RIDGE, 7, .8, 1.3, [1, 0]);
rect(-16.2, -14.2, -17, -14.3, RIDGE - .2, RIDGE, planks); // the landing
for (const [x, z] of [[-16, -14.5], [-14.4, -14.5], [-16, -16.8]]) building.cover.push(deco(.16, RIDGE - .2, .16, postMat, x, (RIDGE - .2) / 2, z));
stairs(-14.2, -16.35, 'x', 1, RIDGE, PLAT, 7, .8, 1.3, [1, 0]);
line([-8.6, .95, -14.3], [-14.3, RIDGE + .95, -14.3], ropeMat, .05); // a rope handrail on two posts
deco(.1, 1, .1, postMat, -8.6, .5, -14.3); deco(.1, 1, .1, postMat, -14.3, RIDGE + .5, -14.3);

// pines on the tops
const pineMat = lam({ map: tex(g => { noise(g, [52, 104, 58], 26); g.fillStyle = 'rgba(15,40,20,.4)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
{
  const leaves = [], pines = [], hits = (x, z, r) => building.solids.some(o => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
  for (let tries = 0; pines.length < 24 && tries < 3000; tries++) {
    const x = (rnd() * 2 - 1) * (CA - 1.5), z = (rnd() * 2 - 1) * (CA - 1.5), [lo, hi] = under(x - 1.5, x + 1.5, z - 1.5, z + 1.5);
    if (lo !== hi || lo < RIDGE - .01 || kept(Math.floor(x), Math.floor(z)) || hits(x, z, 1.6) || pines.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4.5)) continue;
    let ok = true; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (kindAt(x + a, z + b) !== GRASS) ok = false;
    if (!ok) continue;
    const s = .8 + rnd() * .45, y = lo, c = LEAF_TINTS[rnd() * LEAF_TINTS.length | 0];
    pines.push([x, z]); addSlab(x, z, .45 * s, .45 * s, y, y + 1.5 * s, barkMat);
    for (const [k, w, t] of [[1.7, 2.6, .9], [2.5, 2, .8], [3.2, 1.4, .7], [3.8, .8, .6], [4.25, .35, .4]]) {
      const ry = rnd() * .6, hw = w * s / 2 / (Math.cos(ry) + Math.sin(ry)); // the square that fits inside the turned layer
      leaves.push([x, y + k * s, z, w * s, t * s, w * s, ry, c]);
      if (w > .5) { const sol = addSolid(x, z, hw * 2, hw * 2, y + (k + t / 2) * s, 'grass'); sol.bot = y + (k - t / 2) * s; } // you can stand on the layers, and shoot through them
    }
  }
  instanced(unit, pineMat, leaves);
  M.pines = pines;
}
// grass tufts
{
  const tufts = [];
  for (let tries = 0; tufts.length < 700 && tries < 12000; tries++) {
    const x = (rnd() * 2 - 1) * CA, z = (rnd() * 2 - 1) * CA, c = cellAt(x, z);
    if (c < 0 || (kind[c] !== GRASS && kind[c] !== SAND) || M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.8)) continue;
    if (kind[c] === SAND && !(hAt(x, z - 1.5) > 2 || hAt(x - 1.5, z) > 2 || hAt(x + 1.5, z) > 2)) continue; // sand grass only by the cliffs
    const s = .55 + rnd() * .55, hw = .5 * s, i = ci(x), j = ci(z);
    if (x - hw < i - O || x + hw > i - O + 1 || z - hw < j - O || z + hw > j - O + 1) continue; // inside its cell, so it never hangs over an edge
    if (building.solids.some(o => x + hw > o.minX && x - hw < o.maxX && z + hw > o.minZ && z - hw < o.maxZ)) continue;
    tufts.push([x, H[c], z, 1.1 * s, .8 * s, 1, rnd() * Math.PI, kind[c] === SAND ? 0xd8d090 : LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]);
  }
  grassTufts(tufts);
}
// beyond the walls: higher cliffs round three sides, open sea to the south
{
  const rockM = lam({ map: rockT }), capM = lam({ map: lawn }), trees = [];
  const cliff = (x0, x1, z0, z1, t) => {
    const b = tbox(x1 - x0, t - .3 + SEA_D, z1 - z0, rockM, 2); b.position.set((x0 + x1) / 2, (t - .3 - SEA_D) / 2, (z0 + z1) / 2); add(b);
    const c = tbox(x1 - x0, .3, z1 - z0, capM, 2); c.position.set((x0 + x1) / 2, t - .15, (z0 + z1) / 2); add(c);
    building.cover.push(b, c); // shots and rockets stop on them, past the invisible wall
    for (let k = 0; k < (x1 - x0) * (z1 - z0) / 60; k++) { const x = x0 + 1 + rnd() * (x1 - x0 - 2), z = z0 + 1 + rnd() * (z1 - z0 - 2), s = .8 + rnd() * .6; trees.push([x, t, z, s]); }
  };
  for (const [z0, z1, lo, hi] of [[-44, -36.2, PLAT + .45, PLAT + 1.8], [-58, -44, PLAT + 2.5, PLAT + 4.5], [-95, -58, PLAT + 5, PLAT + 9]]) for (let x = -110; x < 110;) { const w = 7 + rnd() * 8; cliff(x, x + w, z0 - rnd() * 2, z1, lo + rnd() * (hi - lo)); x += w; }
  for (const [x0, x1, lo, hi] of [[-44, -36.2, RIDGE + .9, RIDGE + 2.7], [-60, -44, RIDGE + 3, RIDGE + 5.5], [-100, -60, RIDGE + 6, RIDGE + 10]]) for (let z = -36.2; z < 19;) { const d = 6 + rnd() * 7; cliff(x0 - rnd() * 2, x1, z, Math.min(z + d, 19 + rnd() * 3), lo + rnd() * (hi - lo)); z += d; }
  for (const [x0, x1, lo, hi] of [[36.2, 44, HEAD + .9, HEAD + 2.7], [44, 60, HEAD + 3, HEAD + 5.5], [60, 100, HEAD + 6, HEAD + 10]]) for (let z = -36.2; z < 24;) { const d = 6 + rnd() * 7; cliff(x0, x1 + rnd() * 2, z, Math.min(z + d, 24 + rnd() * 3), lo + rnd() * (hi - lo)); z += d; }
  const far = [];
  for (const [x, z, s] of [[-70, 95, 9], [-20, 130, 6], [40, 110, 11], [95, 150, 8], [-120, 160, 10]]) for (let l = 0; l < 3; l++) far.push([x, -1 + l * s * .3, z, s * 2.4 * (1 - l * .25), s * .6, s * 1.6 * (1 - l * .25), .3, l === 2 ? 0x6f9a4a : 0x8a8478]);
  instanced(unit, lam({}), far);
  instanced(unit, pineMat, trees.flatMap(([x, y, z, s]) => [[x, y + 1.6 * s, z, 2.4 * s, 1.2 * s, 2.4 * s, 0, 0xffffff], [x, y + 2.7 * s, z, 1.6 * s, 1 * s, 1.6 * s, 0, 0xffffff], [x, y + 3.6 * s, z, .8 * s, .8 * s, .8 * s, 0, 0xffffff]]));
  instanced(unit, barkMat, trees.map(([x, y, z, s]) => [x, y + .6 * s, z, .4 * s, 1.2 * s, .4 * s, 0, 0xffffff]));
}
addSky(rnd, [-30, 11, 12], 14, 60, 170, 40, 58);
// gulls circling over the bay
const gulls = [];
{
  const gm = new THREE.MeshLambertMaterial({ color: 0xf6f6f2, transparent: true }), tipM = new THREE.MeshLambertMaterial({ color: 0x3a3a40, transparent: true });
  for (let k = 0; k < 7; k++) {
    const g = new THREE.Group(), wings = [];
    const head = box(.12, .12, .16, gm); head.position.set(0, .05, .3); g.add(box(.16, .14, .5, gm), head);
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.x = s * .07; const w = box(.7, .03, .26, gm); w.position.x = s * .35; const t = box(.2, .031, .2, tipM); t.position.x = s * .62; p.add(w, t); g.add(p); wings.push([p, s]); }
    add(detail(g));
    gulls.push({ g, wings, cx: -6 + rnd() * 20, cz: 8 + rnd() * 18, r: 6 + rnd() * 10, y: 13 + rnd() * 8, w: (.25 + rnd() * .2) * (rnd() < .5 ? -1 : 1), a0: rnd() * 6.28, ph: rnd() * 6 });
  }
}

// ground solids, added last: one column per same-height rectangle of cells (caves get a floor and a roof)
{
  const used = new Uint8Array(N * N), sig = c => kind[c] === SEA ? '' : cave[c] ? `c${CF[c]}/${CC[c]}/${H[c]}/${kind[c]}` : H[c] > 0 ? `${H[c]}/${kind[c]}` : '';
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = at(i, j), s = sig(c); if (!s || used[c]) continue;
    const same = (a, b) => inGrid(a, b) && !used[at(a, b)] && sig(at(a, b)) === s;
    let w = 1; while (same(i + w, j)) w++;
    let d = 1; while ((() => { for (let a = 0; a < w; a++) if (!same(i + a, j + d)) return false; return true; })()) d++;
    for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) used[at(i + a, j + b)] = 1;
    const sf = kind[c] === SAND ? 'sand' : kind[c] === ROCK || kind[c] === STEPS ? 'stone' : 'grass', x0 = i - O, z0 = j - O;
    if (cave[c]) { if (CF[c] > 0) solid(x0, x0 + w, z0, z0 + d, -SEA_D - 1, CF[c], 'stone'); solid(x0, x0 + w, z0, z0 + d, CC[c], H[c], sf); }
    else solid(x0, x0 + w, z0, z0 + d, -SEA_D - 1, H[c], sf);
  }
}

// --- water and footsteps ---
M.floor = (x, z) => { const c = cellAt(x, z); return c >= 0 && kind[c] === SEA ? SF[c] : 0; };
M.sea = (x, z, feet) => kindAt(x, z) === SEA && feet < WATER_Y - .5; // the shallows by the sand are walkable
M.water = (x, z, feet) => M.sea(x, z, feet) && SF[cellAt(x, z)] <= -SEA_D && feet < .3 - SEA_D; // sinking to the bottom of the deep water drowns you
M.wet = (x, z, y) => kindAt(x, z) === SEA && y < WATER_Y && !M.water(x, z, y);
M.surfAt = (x, z, y, b, s) => { if (s) return b; const c = cellAt(x, z); return c < 0 ? 'sand' : cave[c] ? 'stone' : kind[c] === SAND || kind[c] === SEA ? 'sand' : kind[c] === ROCK ? 'stone' : 'grass'; };

// --- bots and zombies: the walk grid (world.js), built the first time it's needed ---
const NV = makeNav(M, [1, 0, -5], M.sea);
M.nav = NV.nav; M.around = NV.around;
M.top = (x, z) => NV.top(x, z) ?? hAt(x, z);
M.land = (x, z) => NV.ready() ? NV.land(x, z, -.1) : kindAt(x, z) !== SEA;
M.debug = { kind, H, SF, cave, CF, CC, N, O, nav: NV.data, nodeNear: NV.nodeNear, build: NV.ready };

M.tick = dt => {
  const t = performance.now() / 1000;
  for (const w of WM) w.map.offset.set(t * .03, t * .015);
  foam.material[0].opacity = .5 + Math.sin(t * .7 + 1.2) * .22;
  flames.forEach((f, k) => { const s = .8 + .25 * Math.sin(t * 13 + k * 2.1) + .1 * Math.sin(t * 29 + k); f.scale.set(1, s, 1); });
  for (const { m, x0, ph } of flags) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = x0[i * 3]; p.setZ(i, Math.sin(x * 3.2 - t * 5 + ph) * .14 * x); }
    p.needsUpdate = true;
  }
  if (!gfxQ().detail) return;
  for (const G of gulls) {
    const a = G.a0 + t * G.w, vx = -Math.sin(a) * G.w, vz = Math.cos(a) * G.w;
    G.g.position.set(G.cx + Math.cos(a) * G.r, G.y + Math.sin(t * .6 + G.ph) * .8, G.cz + Math.sin(a) * G.r);
    G.g.rotation.set(0, Math.atan2(vx, vz), -Math.sign(G.w) * .25);
    const flap = Math.sin(t * .4 + G.ph) > .2 ? Math.sin(t * 9 + G.ph) * .55 : .12;
    for (const [p, s] of G.wings) p.rotation.z = s * flap;
  }
};
}
