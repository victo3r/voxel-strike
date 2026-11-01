startMap('forest', {
  name: 'The Forest', size: 'medium', half: 36,
  env: { sky: 0x0f2a22, fog: 0x15342b, fogNear: 10, fogFar: 62, hemiSky: 0xa8e0c0, hemiGround: 0x1c2a16, hemi: .8, sunColor: 0xbccdf0, sun: .45, sunDir: [-.45, 1, .3] }, // the "sun" here is the moon
  pads: [[-5, 26], [6, -25], [-26, 4], [26, -2], [19, 19], [-19, -19]],
  crates: [[4.8, 4.2, 0], [5.4, 5.6, 0], [-5.2, -4.4, 1], [-6, 4.4, 0], [5.6, -4.8, 0],
    [16.8, 16.6, 0], [17.2, 15.2, 1], [21.6, 20.8, 0], [15.6, 21, 0], [22.4, 16.4, 0],
    [-21.2, -16.8, 1], [-16.4, -20.8, 0], [-17.8, -21.8, 0], [-21.6, -21.4, 0]],
});
{
const M = MAPS.forest, FA = M.half, rnd = seeded(4242);
const G = 140;
addGround(G, lam({ map: tex(g => {
  noise(g, [58, 84, 40], 28);
  for (let i = 0; i < 9; i++) { g.fillStyle = ['#5a4628', '#6b5430', '#3e5a26'][i % 3]; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }
}, G * 2, G * 2) }));
addWall(0, -FA, FA * 2 + .3, .3); addWall(0, FA, FA * 2 + .3, .3);
addWall(-FA, 0, .3, FA * 2 + .3); addWall(FA, 0, .3, FA * 2 + .3);

// they carry on past the edge of the map so they look like they lead somewhere
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
    if (i) { const j = new THREE.Mesh(scaleUV(new THREE.CircleGeometry(PW / 2, 14), PW / 2.5, PW / 2.5), dirtMat); j.rotation.x = -Math.PI / 2; j.position.set(ax, .045, az); add(j); }
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
// open spaces the trees stay out of: the middle clearing, the camp, the stash, and room round each pad
const CLEARINGS = [[0, 0, 8.5], [19, 18.5, 5.5], [-19, -19, 5], ...M.pads.map(([x, z]) => [x, z, 2.6])];
const inClearing = (x, z, r) => CLEARINGS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r);
// fallen logs [x, z, length, runs along x?] and mossy rocks [x, z, w, d, h], placed by hand (built further down)
const LOGS = [[-12, 13, 5, 1], [13, -12, 4.5, 0], [-26, -9, 5, 0], [25, 10, 4.4, 1], [-11, -27, 4.6, 1], [11, 28, 4.2, 0]];
const ROCKS = [[-9, 21, 1.8, 1.5, 1.3], [-7.8, 22.2, 1.1, 1, .7], [21, -19, 2, 1.6, 1.5], [10, 12, 1.4, 1.3, 1], [-23, 18, 1.6, 1.8, 1.2],
  [28, 24, 1.5, 1.3, 1.1], [-29, -26, 1.8, 1.5, 1.3], [-12, -3.5, 1.3, 1.2, .9], [14, -30, 1.6, 1.4, 1.2], [31, -14, 1.4, 1.6, 1]];
const FIXED = [...LOGS.map(([x, z, len]) => [x, z, len / 2 + .5]), ...ROCKS.map(([x, z, w, d]) => [x, z, Math.max(w, d) / 2 + .3]), ...M.crates.map(([x, z]) => [x, z, 1])];
const hitsFixed = (x, z, r) => FIXED.some(([fx, fz, fr]) => Math.hypot(fx - x, fz - z) < fr + r);

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const LAMP_C = 0xffb35a, LIGHTS = 8; // lantern color, how many lanterns get a real light (the rest just glow, it's cheaper)
const postMat = lam({ map: tex(g => { noise(g, [70, 50, 32], 20); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 0, 1, 16); g.fillRect(11, 0, 1, 16); }) });
const ironMat = lam({ color: 0x2b2f33 });
const lanternMat = lam({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2 });
const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false });
const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: LAMP_C, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
const poolGeo = new THREE.CircleGeometry(4.2, 24);
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
      lamps.push({ x, z, ax: -uz * side, az: ux * side }); // arm points back over the path
      side = -side;
    }
    walked += len;
  }
});
lamps.forEach((l, i) => {
  const post = box(.22, 3.1, .22, postMat); post.position.set(l.x, 1.55, l.z); add(post);
  building.cover.push(post); addSolid(l.x, l.z, .3, .3, 99);
  const arm = box(.1, .1, .9, postMat); arm.position.set(l.x + l.ax * .4, 3, l.z + l.az * .4); arm.rotation.y = Math.atan2(l.ax, l.az); add(arm);
  const hx = l.x + l.ax * .8, hz = l.z + l.az * .8;
  const lan = box(.32, .42, .32, lanternMat); lan.position.set(hx, 2.55, hz); add(lan);
  const cap = box(.42, .07, .42, ironMat); cap.position.set(hx, 2.8, hz); add(cap);
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
  const post = box(.22, 3.1, .22, postMat); post.position.set(x, 1.55, z); add(post); building.cover.push(post); addSolid(x, z, .3, .3, 99);
  const lan = box(.32, .42, .32, lanternMat); lan.position.set(x, 3.3, z); add(lan);
  const cap = box(.42, .07, .42, ironMat); cap.position.set(x, 3.55, z); add(cap);
  const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(1.8); halo.position.set(x, 3.3, z); add(halo);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, .06, z); add(pool);
  lamps.push({ x, z });
}

const F_TINTS = [0x9cbf88, 0x86a876, 0xa9c890, 0x7b9b6c, 0x94b07e];
const pick = a => a[rnd() * a.length | 0];
const trunks = [], edgeTrunks = [], leaves = [], spots = [];
const roomFor = (x, z, gap) => spots.every(([a, b]) => Math.hypot(a - x, b - z) > gap) && lamps.every(l => Math.hypot(l.x - x, l.z - z) > 2.8);
function bigTree(x, z, inside) {
  const w = 1.3 + rnd() * .9, h = 7.5 + rnd() * 3, s = 8 + rnd() * 3.5, c = pick(F_TINTS), ry = rnd() * Math.PI;
  (inside ? trunks : edgeTrunks).push([x, h / 2, z, w, h, w, 0]);
  (inside ? trunks : edgeTrunks).push([x, .3, z, w * 1.4, .6, w * 1.4, 0]);
  if (inside) addSolid(x, z, w * 1.4, w * 1.4, 99);
  leaves.push([x, h + .6, z, s, 3, s, ry, c], [x, h + 2.8, z, s * .62, 2, s * .62, ry, c]);
  if (rnd() < .6) { const a = rnd() * 6.28; leaves.push([x + Math.cos(a) * s * .3, h - 1, z + Math.sin(a) * s * .3, s * .5, 1.8, s * .5, ry, c]); }
  spots.push([x, z]);
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
const trunkMesh = instanced(unit, barkMat, trunks); building.cover.push(trunkMesh); // bullets stop on the trunks inside the map
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
  const stub = box(.4, .4, .4, barkMat); stub.position.set(x + (alongX ? len * .2 : .5), .9, z + (alongX ? .5 : len * .2)); add(stub);
}
const rockMat = surf(lam({ map: tex(g => { noise(g, [112, 116, 108], 34); g.fillStyle = 'rgba(70,120,50,.7)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 6 | 0, 2, 1); }) }), 'stone');
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
  const cp = box(.3, .12, .3, capMats[i % 2]); cp.position.set(x, .25, z); add(cp);
}

// everything uses one direction (MOON): the moon sits that way in the sky, the main light shines from there,
// and every shaft leans the same way, so they all look like they come from the moon
const MOON = new THREE.Vector3(...M.env.sunDir).normalize(), MOON_C = 0xcfdcff;
const moonTex = tex(g => {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7.2) continue;
    g.fillStyle = d > 6.2 ? '#c9d2df' : '#eef2f8'; g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#c3ccd9'; for (const [x, y, w, h] of [[4, 4, 3, 2], [9, 3, 2, 2], [10, 8, 3, 3], [5, 10, 2, 2], [3, 7, 1, 1], [8, 12, 2, 1]]) g.fillRect(x, y, w, h);
});
moonTex.wrapS = moonTex.wrapT = THREE.ClampToEdgeWrapping;
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, transparent: true }));
moon.scale.setScalar(9);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: MOON_C, fog: false, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
moonGlow.scale.setScalar(42);
add(moonGlow); add(moon); // they follow the camera (see M.tick) so the moon always looks infinitely far away

// shafts only go where the moon can actually be seen through the leaves
const CANOPY = 34; // shafts start high above the leaves and fade in slowly, so they look like they reach up to the moon
const blocked = (x, z) => leaves.some(([lx, ly, lz, s]) => { // would a ray from this ground spot to the moon hit a leaf clump?
  const t = ly / MOON.y;
  return Math.hypot(x + MOON.x * t - lx, z + MOON.z * t - lz) < s * .62;
});
const shaftLen = CANOPY / MOON.y, up = new THREE.Vector3(0, 1, 0);
const shaftTex = (() => { // long soft fade-in up in the sky, full through the canopy, fades out just above the ground
  const c = document.createElement('canvas'); c.width = 2; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  const h = y => 1 - y / CANOPY; // height above the ground -> spot on the texture (0 = top, 1 = ground)
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
gaps.sort((a, b) => a[2] - b[2]); // check the spots in a fixed shuffled order so they spread over the map
for (const [x, z] of gaps) {
  if (shafts.length >= 8) break;
  if (shafts.some(s => Math.hypot(s.x - x, s.z - z) < 8)) continue;
  if ([[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].some(([ox, oz]) => blocked(x + ox, z + oz))) continue; // the gap has to be wide enough
  const m = new THREE.Mesh(shaftGeo, shaftMat.clone());
  m.quaternion.setFromUnitVectors(up, MOON);
  m.position.set(x + MOON.x * shaftLen / 2, MOON.y * shaftLen / 2, z + MOON.z * shaftLen / 2); add(m);
  const pool = new THREE.Mesh(poolGeo, moonPoolMat); pool.rotation.x = -Math.PI / 2; pool.scale.set(.55, .55, 1); pool.position.set(x, .05, z); add(pool);
  shafts.push({ m, x, z });
}

const flies = [];
for (let i = 0; i < 70; i++) {
  const s = .06 + rnd() * .06;
  const m = box(s, s, s, new THREE.MeshBasicMaterial({ color: i % 4 ? 0xd8ff6a : 0xffe27a, transparent: true }));
  const x = (rnd() * 2 - 1) * FA, y = .4 + rnd() * 3.2, z = (rnd() * 2 - 1) * FA;
  m.position.set(x, y, z); add(m); flies.push({ m, x, y, z, p: rnd() * 6.3, s: .4 + rnd() * .8 });
}
M.tick = () => { // runs every frame while this map is loaded
  const t = performance.now() / 1000;
  for (const f of flies) {
    f.m.position.set(f.x + Math.sin(t * f.s * .7 + f.p) * .8, f.y + Math.sin(t * f.s + f.p * 2) * .4, f.z + Math.cos(t * f.s * .5 + f.p) * .8);
    f.m.material.opacity = .15 + .85 * Math.max(0, Math.sin(t * f.s * 2 + f.p));
  }
  for (const l of lampLights) l.intensity = 9 + Math.sin(t * 9 + l.position.x) * .7 + Math.sin(t * 23 + l.position.z) * .35;
  for (const s of shafts) s.m.material.opacity = .07 + Math.sin(t * .4 + s.x) * .02;
  moon.position.copy(camera.position).addScaledVector(MOON, 150); moonGlow.position.copy(moon.position);
};
}
useMap('yard'); // the yard is loaded until you pick something else in the lobby
