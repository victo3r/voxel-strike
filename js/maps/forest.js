startMap('forest', {
  name: 'The Forest', size: 'medium', half: 36,
  env: { sky: 0x0f2a22, fog: 0x15342b, fogNear: 10, fogFar: 62, hemiSky: 0xa8e0c0, hemiGround: 0x1c2a16, hemi: .8, sunColor: 0xbccdf0, sun: .45, sunDir: [-.45, 1, .3] }, // sun = moon
  pads: [[-5, 26], [6, -25], [-26, 4], [26, -2], [19, 19], [-19, -19]],
  crates: [[4.8, 4.2, 0], [5.4, 5.6, 0], [-5.2, -4.4, 1], [-6, 4.4, 0], [5.6, -4.8, 0],
    [16.8, 16.6, 0], [17.2, 15.2, 1], [21.6, 20.8, 0], [15.6, 21, 0], [22.4, 16.4, 0],
    [-21.2, -16.8, 1], [-16.4, -20.8, 0], [-17.8, -21.8, 0], [-21.6, -21.4, 0]],
}, () => {
const M = MAPS.forest, FA = M.half, rnd = seeded(4242);
const G = 140;
addGround(G, lam({ map: tex(g => {
  noise(g, [58, 84, 40], 28);
  for (let i = 0; i < 9; i++) { g.fillStyle = ['#5a4628', '#6b5430', '#3e5a26'][i % 3]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }
}, G * 2, G * 2) }));
addWall(0, -FA, FA * 2 + .3, .3); addWall(0, FA, FA * 2 + .3, .3);
addWall(-FA, 0, .3, FA * 2 + .3); addWall(FA, 0, .3, FA * 2 + .3);

// paths run past the edge so they lead somewhere
const PATHS = [
  [[-3, 70], [-3, 40], [-5, 28], [1, 18], [3, 9], [0, 0], [-4, -9], [-1, -19], [6, -27], [5, -40], [5, -70]],
  [[-70, 7], [-40, 7], [-27, 5], [-17, 1], [-8, 2], [0, 0], [9, -2], [18, 3], [27, -3], [40, -1], [70, -1]],
];
const PW = 3.4;
const dirtMat = lam({ map: tex(g => { noise(g, [118, 92, 60], 26); g.fillStyle = 'rgba(60,45,25,.5)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const scaleUV = (geo, su, sv) => { const uv = geo.attributes.uv.array; for (let i = 0; i < uv.length; i += 2) { uv[i] *= su; uv[i + 1] *= sv; } return geo; };
PATHS.forEach((pts, p) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(PW, len), PW / 2.5, len / 2.5), dirtMat);
    m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(-dx, -dz), 0);
    m.position.set((ax + bx) / 2, .02 + p * .012, (az + bz) / 2); add(m);
    if (i) { const j = new THREE.Mesh(scaleUV(pxDisc(PW / 2, 14), PW / 2.5, PW / 2.5), dirtMat); j.rotation.x = -Math.PI / 2; j.position.set(ax, .045, az); add(j); }
  }
});
function pathDist(x, z) {
  let best = Infinity;
  for (const pts of PATHS) for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// clearings with no trees
const CLEARINGS = [[0, 0, 8.5], [19, 18.5, 5.5], [-19, -19, 5], ...M.pads.map(([x, z]) => [x, z, 2.6])];
const inClearing = (x, z, r) => CLEARINGS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r);
// fallen logs and mossy rocks
const LOGS = [[-9, 11, 5, 1], [13, -12, 4.5, 0], [-26, -9, 5, 0], [25, 10, 4.4, 1], [-11, -27, 4.6, 1], [11, 28, 4.2, 0]];
const ROCKS = [[-9, 21, 1.8, 1.5, 1.3], [-7.8, 22.2, 1.1, 1, .7], [21, -19, 2, 1.6, 1.5], [10, 12, 1.4, 1.3, 1], [28, 24, 1.5, 1.3, 1.1], [-29, -26, 1.8, 1.5, 1.3], [-12, -3.5, 1.3, 1.2, .9], [14, -30, 1.6, 1.4, 1.2], [31, -14, 1.4, 1.6, 1]];
const FIXED = [...LOGS.map(([x, z, len]) => [x, z, len / 2 + .5]), ...ROCKS.map(([x, z, w, d]) => [x, z, Math.max(w, d) / 2 + .3]), ...M.crates.map(([x, z]) => [x, z, 1])];
const hitsFixed = (x, z, r) => FIXED.some(([fx, fz, fr]) => Math.hypot(fx - x, fz - z) < fr + r);
const rockMat = surf(lam({ map: tex(g => { noise(g, [112, 116, 108], 34); g.fillStyle = 'rgba(70,120,50,.7)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 6 | 0, 2, 1); }) }), 'stone');
// height: a rock hill (north west) and two treehouses joined by a bridge (south east)
const hr = seeded(77), HC = 1, HX = -32, HZ = 7, HN = 24, LV = .45; // hill height map: 1 m cells, .45 m steps
const MOUNDS = [[-21, 18, 8.5, 7.5, 4.3], [-14.5, 13, 4, 3.6, 2.1], [-26.5, 12.5, 3.8, 3.2, 1.9], [-16, 23.5, 3.6, 3, 2.2]].map(m => [...m, hr() * 6.3, hr() * 6.3]);
const hillLv = [];
for (let i = 0; i < HN; i++) { hillLv[i] = []; for (let j = 0; j < HN; j++) {
  const x = HX + (i + .5) * HC, z = HZ + (j + .5) * HC;
  let h = 0;
  for (const [cx, cz, rx, rz, pk, p1, p2] of MOUNDS) { // wobbly outlines so it isn't a pyramid
    const dx = (x - cx) / rx, dz = (z - cz) / rz, an = Math.atan2(dz, dx), d = Math.hypot(dx, dz) / (1 + .2 * Math.sin(3 * an + p1) + .12 * Math.sin(5 * an + p2));
    if (d < 1) h = Math.max(h, pk * (1 - d * d * .35 - d * .65));
  }
  h += (hr() - .5) * .4;
  hillLv[i][j] = h < .3 || pathDist(x, z) < PW / 2 + .8 || M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3) ? 0 : Math.max(1, Math.round(h / LV));
} }
for (let n = 0; n < 2; n++) for (let i = 1; i < HN - 1; i++) for (let j = 1; j < HN - 1; j++) { // no lone spikes or pits
  const L = hillLv, nb = [L[i - 1][j], L[i + 1][j], L[i][j - 1], L[i][j + 1]];
  if (nb.every(v => v < L[i][j])) L[i][j] = Math.max(...nb); else if (nb.every(v => v > L[i][j])) L[i][j] = Math.min(...nb);
}
const hillTop = (x, z) => { const i = Math.floor((x - HX) / HC), j = Math.floor((z - HZ) / HC); return i >= 0 && j >= 0 && i < HN && j < HN ? hillLv[i][j] * LV : 0; };
const TH = [{ x: 15, z: -17, y: 3.2, wall: [[0, 1], [-1, 0]] }, { x: 27, z: -17, y: 3.8, wall: [[0, -1], [1, 0]] }], TH_R = 3; // treehouse platforms (centre, height), half size
FIXED.push(...MOUNDS.map(([x, z, rx, rz]) => [x, z, Math.max(rx, rz) * 1.25 + .5]), ...TH.map(t => [t.x, t.z, TH_R + 1]), [15, -22, 2.2], [15, -25, 1.5], [27, -12, 2.2], [27, -8.5, 1.5], [21, -17, 2]);

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const LAMP_C = 0xffb35a, LIGHTS = 8; // only a few lanterns get a real light
const postMat = lam({ map: tex(g => { noise(g, [70, 50, 32], 20); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 0, 1, 16); g.fillRect(11, 0, 1, 16); }) });
const ironMat = lam({ color: 0x2b2f33 });
const lanternMat = lam({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2 });
const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false });
const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
const poolGeo = pxDisc(4.2, 24);
const lamps = [], lampLights = [];
PATHS.forEach((pts, p) => {
  let next = 4 + p * 5, walked = 0, side = p ? -1 : 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    while (next <= walked + len) {
      const t = next - walked, x = ax + ux * t + uz * 2.5 * side, z = az + uz * t - ux * 2.5 * side;
      next += 10.5;
      if (Math.max(Math.abs(x), Math.abs(z)) > FA - 1.2 || lamps.some(l => Math.hypot(l.x - x, l.z - z) < 6)) continue;
      if (M.pads.some(([px, pz]) => Math.hypot(px - x, pz - z) < 2) || hitsFixed(x, z, .6)) continue;
      lamps.push({ x, z, ax: -uz * side, az: ux * side });
      side = -side;
    }
    walked += len;
  }
});
lamps.forEach((l, i) => {
  const post = box(.22, 3.1, .22, postMat); post.position.set(l.x, 1.55, l.z); add(post);
  building.cover.push(post); addSolid(l.x, l.z, .22, .22, 3.1);
  const ax = Math.abs(l.ax) > Math.abs(l.az) ? Math.sign(l.ax) : 0, az = ax ? 0 : Math.sign(l.az); // the arm points straight along x or z, so its hitbox fits
  const arm = box(.1, .1, .9, postMat); arm.position.set(l.x + ax * .4, 3, l.z + az * .4); arm.rotation.y = Math.atan2(ax, az); add(arm);
  const hx = l.x + ax * .8, hz = l.z + az * .8;
  const lan = box(.32, .42, .32, lanternMat); lan.position.set(hx, 2.55, hz); add(lan);
  const cap = box(.42, .07, .42, ironMat); cap.position.set(hx, 2.8, hz); add(cap);
  solidBox(l.x + ax * .4, 3, l.z + az * .4, ax ? .9 : .1, .1, ax ? .1 : .9); solidBox(hx, 2.55, hz, .32, .42, .32); solidBox(hx, 2.8, hz, .42, .07, .42);
  const hook = box(.04, .14, .04, ironMat); hook.position.set(hx, 2.88, hz); add(hook);
  const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(1.8); halo.position.set(hx, 2.55, hz); add(halo);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(hx, .06, hz); add(pool);
  if (i % 2 === 0 && lampLights.length < LIGHTS) {
    const pl = new THREE.PointLight(LAMP_C, 9, 13, 1.4); pl.position.set(hx, 2.4, hz); add(pl); lampLights.push(pl);
  }
});
for (let k = 0; k < 4; k++) {
  const a = Math.PI / 8 + k * Math.PI / 2, x = Math.cos(a) * 6.8, z = Math.sin(a) * 6.8;
  if (M.crates.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 1.6)) continue;
  const post = box(.22, 3.1, .22, postMat); post.position.set(x, 1.55, z); add(post); building.cover.push(post); addSolid(x, z, .22, .22, 3.1);
  const lan = box(.32, .42, .32, lanternMat); lan.position.set(x, 3.3, z); add(lan);
  const cap = box(.42, .07, .42, ironMat); cap.position.set(x, 3.55, z); add(cap);
  solidBox(x, 3.3, z, .32, .42, .32); solidBox(x, 3.55, z, .42, .07, .42);
  const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(1.8); halo.position.set(x, 3.3, z); add(halo);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, .06, z); add(pool);
  lamps.push({ x, z });
}

const F_TINTS = [0x9cbf88, 0x86a876, 0xa9c890, 0x7b9b6c, 0x94b07e];
const pick = a => a[rnd() * a.length | 0];
const trunks = [], edgeTrunks = [], leaves = [], spots = [];
const roomFor = (x, z, gap) => spots.every(([a, b]) => Math.hypot(a - x, b - z) > gap) && lamps.every(l => Math.hypot(l.x - x, l.z - z) > 2.8);
function bigTree(x, z, inside) {
  const w = 1.3 + rnd() * .9, h = 7.5 + rnd() * 3, s = 8 + rnd() * 3.5, c = pick(F_TINTS), turn = rnd() * Math.PI, over = inside || Math.max(Math.abs(x), Math.abs(z)) < FA + 9, ry = over ? 0 : turn; // ones whose leaves reach over the map sit square, so their hitboxes fit
  const base = [x, .3, z, w * 1.4, .6, w * 1.4, 0], clumps = [[x, h + .6, z, s, 3, s, ry, c], [x, h + 2.8, z, s * .62, 2, s * .62, ry, c]];
  (inside ? trunks : edgeTrunks).push([x, h / 2, z, w, h, w, 0], base);
  if (rnd() < .6) { const a = rnd() * 6.28; clumps.push([x + Math.cos(a) * s * .3, h - 1, z + Math.sin(a) * s * .3, s * .5, 1.8, s * .5, ry, c]); }
  leaves.push(...clumps);
  if (inside) boxSolids([[x, (h - .9) / 2, z, w, h - .9, w], base], 'wood'); // the trunk up to its leaves
  if (over) boxSolids(clumps, 'grass'); // leaves you can stand on
  spots.push([x, z]);
}
{
  const mossTop = lam({ map: tex(g => { noise(g, [62, 92, 44], 26); }) });
  const used = hillLv.map(r => r.map(() => false));
  let top = [0, 0, 0];
  for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) { // merge equal cells into boxes
    const lv = hillLv[i][j]; if (!lv || used[i][j]) continue;
    let w = 1, d = 1;
    while (i + w < HN && hillLv[i + w][j] === lv && !used[i + w][j]) w++;
    while (j + d < HN && [...Array(w).keys()].every(k => hillLv[i + k][j + d] === lv && !used[i + k][j + d])) d++;
    for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) used[i + a][j + b] = true;
    const x = HX + (i + w / 2) * HC, z = HZ + (j + d / 2) * HC, y = lv * LV;
    addSlab(x, z, w * HC, d * HC, 0, y, rockMat);
    const cap = box(w * HC, .04, d * HC, mossTop); cap.position.set(x, y + .015, z); add(cap);
    if (y > top[2]) top = [HX + (i + .5) * HC, HZ + (j + .5) * HC, y];
  }
  addBlock(top[0], top[1], .9, .8, top[2] + .7, rockMat); // a boulder on top
  for (const [x, z, w, d, h] of [[-27.6, 15, 1.2, 1, .8], [-13, 18.5, 1, 1.3, .7], [-19, 10, 1.4, 1, .6], [-23.5, 23.6, 1.1, 1, .9], [-12.6, 11.2, .9, .9, .5]]) addBlock(x, z, w, d, Math.max(h, hillTop(x, z) + h * .6), rockMat); // and loose ones round the bottom
  // treehouses: a big tree through each platform, stairs up, a plank bridge between
  const planks = surf(lam({ map: tex(g => { noise(g, [128, 92, 56], 18); g.fillStyle = 'rgba(50,30,15,.55)'; for (const y of [0, 5, 10, 15]) g.fillRect(0, y, 16, 1); }) }), 'wood');
  const deck = (x, z, w, d, top, th = .3) => addSlab(x, z, w, d, top - th, top, planks);
  for (const t of TH) {
    bigTree(t.x, t.z, true);
    deck(t.x, t.z, TH_R * 2, TH_R * 2, t.y);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addSlab(t.x + ox * (TH_R - .2), t.z + oz * (TH_R - .2), .3, .3, 0, t.y - .3, postMat); // corner posts
    for (const [ox, oz] of t.wall) addSlab(t.x + ox * (TH_R - .1), t.z + oz * (TH_R - .1), ox ? .2 : TH_R * 2, ox ? 2.4 : .2, t.y, t.y + .7, planks); // low walls to duck behind, away from the stairs and bridge
  }
  const [A, B] = TH, steps = 7;
  const stairs = (x, edge, dir, y, n) => { // open wooden steps on two side boards
    for (let k = 0; k < n; k++) deck(x, edge + dir * (n - k - .5) * .5, 1.4, .5, y * (k + 1) / n, .12);
    const run = n * .5, k = y / run, end = run - Math.min(.3 / k, .5), start = -(y / n - .1) / k, c = (start + end) / 2; // the boards' top edge runs under the front of every step, from the ground to just short of the top
    const len = (end - start) * Math.hypot(1, k), mid = y / n - .1 + k * c - .15 * Math.hypot(1, k);
    const f = dir * Math.atan2(y, run), ez = edge + dir * (run - c), hy = len / 2 * Math.sin(f), hz = len / 2 * Math.cos(f);
    for (const ox of [-.76, .76]) { const r = box(.12, .3, len, postMat); r.position.set(x + ox, mid, ez); r.rotation.x = f; add(r); tiltSolids([x + ox, mid + hy, ez - hz], [x + ox, mid - hy, ez + hz], .12, .3, 'wood'); }
  };
  stairs(A.x, A.z - TH_R, -1, A.y, steps); // up the south side of the first
  stairs(B.x, B.z + TH_R, 1, B.y, steps + 1); // and the north side of the second
  for (let k = 0; k < 6; k++) deck(A.x + TH_R + .5 + k, A.z, 1.05, 1.3, A.y + (B.y - A.y) * (k + .5) / 6, .15); // the bridge
  const xa = A.x + TH_R - .1, xb = B.x - TH_R + .1, rope = lam({ color: 0xc8b48a }); // a post on each deck's edge, a rope from top to top
  for (const oz of [-.75, .75]) {
    for (const [x, y] of [[xa, A.y], [xb, B.y]]) { const p = box(.12, 1, .12, postMat); p.position.set(x, y + .5, A.z + oz); add(p); solidBox(x, y + .5, A.z + oz, .12, 1, .12, 'wood'); }
    const r = box(Math.hypot(xb - xa, B.y - A.y), .05, .05, rope); r.position.set((xa + xb) / 2, (A.y + B.y) / 2 + .95, A.z + oz); r.rotation.z = Math.atan2(B.y - A.y, xb - xa); add(r);
    tiltSolids([xa, A.y + .95, A.z + oz], [xb, B.y + .95, A.z + oz], .05, .05); // a rope rail you can't walk through
  }
  // grass on the hill
  const ht = [];
  for (let k = 0; k < 170; k++) { const x = HX + hr() * HN * HC, z = HZ + hr() * HN * HC, y = hillTop(x, z); if (y) { const s = .6 + hr() * .5; ht.push([x, y, z, 1.1 * s, .9 * s, 1, hr() * Math.PI, pick([0x8fb07a, 0x7a9c6a, 0xa0bf86])]); } }
  grassTufts(ht);
}
for (let tries = 0, k = 0; k < 60 && tries < 4000; tries++) {
  const x = (rnd() * 2 - 1) * (FA - 1.5), z = (rnd() * 2 - 1) * (FA - 1.5);
  if (pathDist(x, z) < PW / 2 + 2.2 || inClearing(x, z, 1.4) || hitsFixed(x, z, 2.2) || !roomFor(x, z, 6.2)) continue;
  bigTree(x, z, true); k++;
}
for (let tries = 0, k = 0; k < 170 && tries < 6000; tries++) {
  const x = (rnd() * 2 - 1) * 75, z = (rnd() * 2 - 1) * 75, e = Math.max(Math.abs(x), Math.abs(z));
  if (e < FA + 1.6 || pathDist(x, z) < PW / 2 + 1.6 || !roomFor(x, z, e < FA + 8 ? 3.6 : 6)) continue;
  bigTree(x, z, false); k++;
}
const trunkMesh = instanced(unit, barkMat, trunks); building.cover.push(trunkMesh);
instanced(unit, barkMat, edgeTrunks); instanced(unit, leafMat, leaves);

const bushes = [];
for (let tries = 0, k = 0; k < 30 && tries < 3000; tries++) {
  const x = (rnd() * 2 - 1) * (FA - 2), z = (rnd() * 2 - 1) * (FA - 2), w = 1.4 + rnd() * .9, d = 1.3 + rnd() * .9, h = 1 + rnd() * .35;
  if (pathDist(x, z) < PW / 2 + 1.2 || inClearing(x, z, 1) || hitsFixed(x, z, 1.4) || !roomFor(x, z, 3) || Math.max(Math.abs(x), Math.abs(z)) > FA - 2) continue;
  bushes.push([x, h / 2, z, w, h, d, 0, pick(F_TINTS)]); addSolid(x, z, w, d, h, 'grass'); spots.push([x, z]); k++;
}
building.cover.push(instanced(unit, leafMat, bushes));
for (const [x, z, len, alongX] of LOGS) {
  const logW = alongX ? len : .85, logD = alongX ? .85 : len;
  addBlock(x, z, logW, logD, .85, barkMat);
  const stub = box(.4, .4, .4, barkMat); stub.position.set(x + (alongX ? len * .2 : .5), .9, z + (alongX ? .5 : len * .2)); add(stub); solidBox(stub.position.x, .9, stub.position.z, .4, .4, .4, 'wood');
}
for (const [x, z, w, d, h] of ROCKS) addBlock(x, z, w, d, h, rockMat);
addCrates(M.crates);

const tufts = [];
for (let tries = 0; tufts.length < 650 && tries < 8000; tries++) {
  const x = (rnd() * 2 - 1) * (FA + 6), z = (rnd() * 2 - 1) * (FA + 6);
  if (pathDist(x, z) < PW / 2 + .2) continue;
  const s = .7 + rnd() * .7; tufts.push([x, 0, z, 1.1 * s, .9 * s, 1, rnd() * Math.PI, pick([0x8fb07a, 0x7a9c6a, 0xa0bf86, 0x6f9060])]);
}
grassTufts(tufts);
const stemMat = lam({ color: 0xeee3cf }), capMats = [lam({ color: 0xd8322e }), lam({ color: 0xc9a46a })];
for (let i = 0; i < 40; i++) {
  const [tx, tz] = spots[rnd() * spots.length | 0], a = rnd() * 6.28, d = 1.4 + rnd() * 1.4, x = tx + Math.cos(a) * d, z = tz + Math.sin(a) * d;
  if (pathDist(x, z) < PW / 2) continue;
  const st = box(.1, .2, .1, stemMat); st.position.set(x, .1, z); add(st);
  const cp = box(.3, .12, .3, capMats[i % 2]); cp.position.set(x, .25, z); add(cp); solidBox(x, .1, z, .1, .2, .1); solidBox(x, .25, z, .3, .12, .3, 'grass');
}

// moon and light shafts
const MOON = new THREE.Vector3(...M.env.sunDir).normalize(), MOON_C = 0xcfdcff;
const moon = skyCube(moonFaces([238, 242, 248], [195, 204, 217]), MOON.clone().negate().add(new THREE.Vector3(-.5, .6, 0)), { amb: .3 }); // full, a block
moon.scale.setScalar(4.4); moon.position.copy(MOON).multiplyScalar(120); // up in the sky from the start, so nothing takes it for part of the map
const moonGlow = skyBack(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: MOON_C, fog: false, opacity: .35, blending: THREE.AdditiveBlending })));
moonGlow.scale.setScalar(34);
add(moonGlow); add(moon); // follows the camera so it looks far away
// the night sky over the leaves: dark green down at the trees to deep blue overhead, stars thickest along a faint Milky Way, now and then a shooting star
add(skyDome(90, [[-1, 0x15342b], [0, 0x15342b], [.03, 0x2a4a43], [.18, 0x23413e], [.34, 0x162d33], [.52, 0x0b1829], [.75, 0x050c19], [1, 0x03060e]])); // a faint glow behind the far trees
{ // far off: tree lines on rolling hills, paler the farther they are, so the stars set behind trees
  const fr = seeded(606), F = M.env.fog, GLOW = 0x2a4a43, S = 1.5; // S: all of it moved out past the edge trees, the same seen from the middle
  for (const [R, mat, h0, hv, tw] of [[78, farMat(0x0e2419, F, 0, true), 13, 3, 7], [100, farMat(F, GLOW, .22), 17, 5, 6]]) { // the nearest in the fog, like the trees in front of it
    const n = Math.round(R * 6.28 / tw), ph = fr() * 6, top = [...Array(n)].map((_, i) => (h0 + hv * (rollAt((i + .5) / n * 6.28, ph) * 2 - 1) + fr() * 2.4) * S);
    skyline(R * S, n, i => top[i], mat); // the canopy, a crown at a time
    skyline((R - 1) * S, n, i => fr() < .5 ? [top[i] - .5 * S, top[i] + (1.4 + fr() * 2.2) * S, .55] : [0, 0], mat); // and smaller crowns on some
  }
  farRange(128 * S, fr, { lo: 19 * S, hi: 32 * S, peaks: 5, peak: 11 * S, n: 200, mat: farMat(F, GLOW, .45) }); // mountains behind it all, a few peaks standing up into the stars
}
const BAND = new THREE.Euler(1.1, .7, .2);
{
  const pos = [], s = [], c = [], C = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < 6000; i++) {
    const a = Math.random() * Math.PI * 2;
    if (i < 3800) { const y = Math.random() * 2 - 1, r = Math.sqrt(1 - y * y); v.set(r * Math.cos(a), y, r * Math.sin(a)); }
    else { const b = (Math.random() + Math.random() + Math.random() - 1.5) * .17; v.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).applyEuler(BAND); }
    if (v.y < .05) continue;
    const q = Math.random(), big = q > .99 ? 3 : q > .93 ? 2 : 1;
    pos.push(v.x * 85, v.y * 85, v.z * 85); s.push(big * .17, big > 1 ? .8 + Math.random() * .2 : .4 + Math.random() * .5, .15 + Math.random() * .4, Math.random());
    C.set([0xffffff, 0xe4ecff, 0xd0dcff, 0xfff4e0, 0xffe2c4][Math.random() * 5 | 0]); c.push(C.r, C.g, C.b);
  }
  add(camStars(pos, s, c, 16)); // fading out low down, into the haze
}
const band = skyBand(88, .4, BAND_FS, { h: { value: 16 } }); band.rotation.copy(BAND); band.onBeforeRender = (r, sc, cam) => band.matrixWorld.setPosition(cam.position); add(band);
const shoot = skyBack(box(.15, .15, 10, new THREE.MeshBasicMaterial({ color: 0xe8f0ff, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })), -1.4), shotP = new THREE.Vector3(), shotV = new THREE.Vector3(); add(shoot);
let shotAt = 0, shotT = -1, shotD = 1, lastT = 0;
shoot.visible = false; shoot.onBeforeRender = (r, sc, cam) => { const p = shoot.position.copy(cam.position).addScaledVector(shotP, 80).addScaledVector(shotV, shotT * 45); shoot.lookAt(p.x + shotV.x, p.y + shotV.y, p.z + shotV.z); shoot.updateMatrixWorld(); }; // across the sky of whoever looks

// shafts only where the moon shows through the leaves
const CANOPY = 34;
const blocked = (x, z) => leaves.some(([lx, ly, lz, s]) => {
  const t = ly / MOON.y;
  return Math.hypot(x + MOON.x * t - lx, z + MOON.z * t - lz) < s * .62;
});
const shaftLen = CANOPY / MOON.y, up = new THREE.Vector3(0, 1, 0);
const shaftTex = (() => {
  const c = document.createElement('canvas'); c.width = 2; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  const h = y => 1 - y / CANOPY;
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(h(20), 'rgba(255,255,255,.55)'); gr.addColorStop(h(11), 'rgba(255,255,255,1)');
  gr.addColorStop(h(4), 'rgba(255,255,255,.75)'); gr.addColorStop(h(.8), 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, color: MOON_C, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const moonPoolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: MOON_C, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false });
const shaftGeo = new THREE.CylinderGeometry(1.0, 1.5, shaftLen, 14, 1, true);
const shafts = [], srnd = seeded(91), gaps = [];
for (let x = -FA + 3; x <= FA - 3; x += 1.5) for (let z = -FA + 3; z <= FA - 3; z += 1.5) gaps.push([x, z, srnd()]);
gaps.sort((a, b) => a[2] - b[2]);
for (const [x, z] of gaps) {
  if (shafts.length >= 8) break;
  if (shafts.some(s => Math.hypot(s.x - x, s.z - z) < 8)) continue;
  if ([[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].some(([ox, oz]) => blocked(x + ox, z + oz))) continue; // gap too narrow
  const m = new THREE.Mesh(shaftGeo, shaftMat.clone());
  m.quaternion.setFromUnitVectors(up, MOON);
  m.position.set(x + MOON.x * shaftLen / 2, MOON.y * shaftLen / 2, z + MOON.z * shaftLen / 2); add(detail(m));
  const pool = new THREE.Mesh(poolGeo, moonPoolMat); pool.rotation.x = -Math.PI / 2; pool.scale.set(.55, .55, 1); pool.position.set(x, .05, z); add(pool);
  shafts.push({ m, x, z });
}

const flies = [];
for (let i = 0; i < 70; i++) {
  const s = .06 + rnd() * .06;
  const m = box(s, s, s, new THREE.MeshBasicMaterial({ color: i % 4 ? 0xd8ff6a : 0xffe27a, transparent: true }));
  const x = (rnd() * 2 - 1) * FA, y = .4 + rnd() * 3.2, z = (rnd() * 2 - 1) * FA;
  m.position.set(x, y, z); add(detail(m)); flies.push({ m, x, y, z, p: rnd() * 6.3, s: .4 + rnd() * .8 });
}
M.tick = () => { // every frame
  const t = performance.now() / 1000;
  for (const f of flies) {
    f.m.position.set(f.x + Math.sin(t * f.s * .7 + f.p) * .8, f.y + Math.sin(t * f.s + f.p * 2) * .4, f.z + Math.cos(t * f.s * .5 + f.p) * .8);
    f.m.material.opacity = .15 + .85 * Math.max(0, Math.sin(t * f.s * 2 + f.p));
  }
  for (const l of lampLights) l.intensity = 9 + Math.sin(t * 9 + l.position.x) * .7 + Math.sin(t * 23 + l.position.z) * .35;
  for (const s of shafts) s.m.material.opacity = .07 + Math.sin(t * .4 + s.x) * .02;
  moon.position.copy(camera.position).addScaledVector(MOON, 120); moonGlow.position.copy(moon.position);
  const dt = Math.min(.1, t - lastT); lastT = t;
  if (shotT < 0 && t > shotAt) { shotT = 0; shotD = .6 + Math.random() * .5; shotP.setFromSphericalCoords(1, .35 + Math.random() * .75, Math.random() * 6.3); shotV.set(Math.random() - .5, -.4, Math.random() - .5).projectOnPlane(shotP).normalize(); } // a shooting star every 5 to 15 s
  if (shotT >= 0) { const k = (shotT += dt) / shotD; shoot.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * .9; if (k > 1) { shotT = -1; shotAt = t + 5 + Math.random() * 10; } }
  shoot.visible = shotT >= 0;
};
});
useMap('yard'); // default map
