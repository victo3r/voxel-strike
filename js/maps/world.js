// pickup pads per map size
const PAD_COUNT = { small: 4, medium: 6, large: 8 };
// max players per map size
const MAX_PLAYERS = { small: 4, medium: 8, large: 8 };
const MAPS = {};
// the loaded map
let MAP = null, A = 24, solids = [], ground = null, crateMeshes = [];

let building = null;
function startMap(id, def) {
  building = MAPS[id] = { id, root: new THREE.Group(), solids: [], cover: [], ground: null, ...def };
  return building;
}
const add = (...objs) => building.root.add(...objs);
// footstep sound for a material
const surf = (m, s) => { m.userData.surf = s; return m; };
function addBlock(x, z, w, d, h, m) { // solid box, stops bullets
  const mesh = box(w, h, d, m); mesh.position.set(x, h / 2, z); add(mesh);
  building.solids.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h, surf: m.userData.surf });
  building.cover.push(mesh);
  return mesh;
}
// box with a tiled texture
function tbox(w, h, d, m, k = 1) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv.array;
  const size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = (f * 4 + i) * 2; uv[j] *= size[f][0] / k; uv[j + 1] *= size[f][1] / k; }
  const mesh = new THREE.Mesh(geo, m); mesh.userData.uvk = k;
  return mesh;
}
// line tiled textures up with the world so tiles match across boxes
const uvP = new THREE.Vector3(), uvN = new THREE.Vector3(), uvM = new THREE.Matrix3();
function alignUV(o) {
  const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, k = o.userData.uvk;
  uvM.getNormalMatrix(o.matrixWorld);
  for (let i = 0; i < P.count; i++) {
    uvP.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); uvN.fromBufferAttribute(N, i).applyMatrix3(uvM);
    const ax = Math.abs(uvN.x), ay = Math.abs(uvN.y), az = Math.abs(uvN.z);
    if (ax >= ay && ax >= az) U.setXY(i, -Math.sign(uvN.x) * uvP.z / k, uvP.y / k);
    else if (az >= ay) U.setXY(i, Math.sign(uvN.z) * uvP.x / k, uvP.y / k);
    else U.setXY(i, uvP.x / k, -Math.sign(uvN.y) * uvP.z / k);
  }
  U.needsUpdate = true;
}
// solid box from bot to top (floors, stairs)
function addSlab(x, z, w, d, bot, top, m, cover = true, k = 1) {
  const mesh = tbox(w, top - bot, d, m, k); mesh.position.set(x, (bot + top) / 2, z); add(mesh);
  building.solids.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bot, top, surf: m.userData.surf });
  if (cover) building.cover.push(mesh);
  return mesh;
}
// solid area with no mesh
const addSolid = (x, z, w, d, top, surf) => { const s = { mesh: null, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top, surf }; building.solids.push(s); return s; };
// invisible wall, bullets go through
const addWall = (x, z, w, d) => addSolid(x, z, w, d, 99);
function addGround(G, mat) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(G * 2, G * 2), mat);
  g.rotation.x = -Math.PI / 2; add(g); building.ground = g;
  return g;
}

const dummy = new THREE.Object3D(), tint = new THREE.Color(), unit = new THREE.BoxGeometry(1, 1, 1);
function instanced(geo, mat, list) { // [x, y, z, sx, sy, sz, rotY, color]
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach(([x, y, z, sx, sy, sz, ry, c], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setHex(c ?? 0xffffff));
  });
  m.computeBoundingSphere(); // so bullets can hit it
  add(m); return m;
}
const seeThru = t => new THREE.MeshLambertMaterial({ map: t, alphaTest: .3, side: THREE.DoubleSide });
const leafMat = lam({ map: tex(g => { noise(g, [60, 130, 45], 35); g.fillStyle = 'rgba(0,40,0,.35)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const barkMat = surf(lam({ map: tex(g => { noise(g, [95, 70, 45], 25); g.fillStyle = 'rgba(0,0,0,.3)'; for (const x of [3, 8, 12]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const LEAF_TINTS = [0xffffff, 0xddeecc, 0xc8dca8, 0xeaffd8, 0xb8d098];
const grassMat = seeThru(tex(g => {
  for (let x = 0; x < 16; x++) {
    if (Math.random() < .25) continue;
    const top = 1 + Math.random() * 9 | 0, k = Math.random() * 40 - 20 | 0;
    for (let y = top; y < 16; y++) { g.fillStyle = `rgb(${70 + k + (16 - y) * 2},${140 + k + (16 - y) * 3},${45 + k})`; g.fillRect(x, y, 1, 1); }
  }
}));
grassMat.alphaTest = .5;
grassMat.map.wrapS = grassMat.map.wrapT = THREE.ClampToEdgeWrapping; // no lines where the edges would wrap
const grassGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
// decoration, hidden on low graphics
const detailObjs = [];
const detail = o => { detailObjs.push(o); o.visible = gfxQ().detail; return o; };
function grassTufts(tufts) {
  detail(instanced(grassGeo, grassMat, tufts));
  detail(instanced(grassGeo, grassMat, tufts.map(t => { const u = [...t]; u[6] += Math.PI / 2; return u; })));
}
const crate1 = surf(crateMat(1), 'wood'), crate2 = surf(crateMat(2), 'wood');
const addCrates = list => { for (const [x, z, tall] of list) addBlock(x, z, 1.2, 1.2, tall ? 2.4 : 1.2, tall ? crate2 : crate1); };
// seeded random, same layout every game
const seeded = s => () => (s = s * 16807 % 2147483647) / 2147483647;

// daytime sky: pixel sun and blocky clouds
const sunTex = tex(g => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const e = Math.min(x, y, 15 - x, 15 - y), v = e < 1 ? 0 : e < 2 ? 1 : 2;
    if (v) { g.fillStyle = v === 1 ? '#ffd65c' : e < 4 ? '#ffeb94' : '#fff8d6'; g.fillRect(x, y, 1, 1); }
  }
});
const sunGlowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,215,.75)'); gr.addColorStop(1, 'rgba(255,248,215,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa8b8, fog: false });
function addSky(rnd, skyDir, n, r0, r1, y0, y1) {
  const d = new THREE.Vector3(...skyDir).normalize().multiplyScalar(150);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false }));
  sun.scale.setScalar(14); sun.position.copy(d); add(sun);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(46); glow.position.copy(d).multiplyScalar(1.01); add(glow);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, r = r0 + rnd() * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r, y = y0 + rnd() * (y1 - y0);
    const w = 12 + rnd() * 18, dd = 7 + rnd() * 10;
    const c1 = box(w, 3 + rnd() * 2, dd, cloudMat); c1.position.set(x, y, z); add(c1);
    const c2 = box(w * .55, 2.5, dd * .6, cloudMat); c2.position.set(x + (rnd() - .5) * w * .3, y + 2.4, z + (rnd() - .5) * dd * .3); add(c2);
  }
}

// what's under your feet, for footsteps
function surfaceAt(x, z, r, feet) {
  const keep = [groundRamp, groundSolid]; // movement code just read these
  groundAt(x, z, r, feet + .05);
  const s = groundSolid, base = s ? s.surf || 'stone' : MAP.surf || 'grass';
  [groundRamp, groundSolid] = keep;
  return MAP.surfAt ? MAP.surfAt(x, z, feet, base, s) : base;
}

// merge static meshes into chunks to cut draw calls
function bakeMap(m) {
  m.root.updateMatrixWorld(true);
  m.root.traverse(o => { if (o.isMesh && o.userData.uvk) alignUV(o); });
  const C = 20, groups = new Map(), sig = new Map(), bb = new THREE.Box3(), c = new THREE.Vector3();
  const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const look = mt => { // identical materials can share a mesh
    const k = [mt.type, mt.color?.getHex(), mt.emissive?.getHex(), mt.emissiveIntensity, mt.map?.uuid, mt.side, mt.alphaTest, mt.fog].join();
    return sig.get(k) || sig.set(k, mt).get(k);
  };
  m.root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !shown(o)) return;
    const mt = o.material, g = o.geometry;
    if (mt.transparent || mt.vertexColors || mt.blending !== THREE.NormalBlending || !g.attributes.normal || g.morphAttributes.position) return;
    if (!g.boundingBox) g.computeBoundingBox();
    bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld).getCenter(c);
    const lm = look(mt), key = lm.uuid + ':' + Math.floor(c.x / C) + ':' + Math.floor(c.z / C);
    if (!groups.has(key)) groups.set(key, { mt: lm, list: [] });
    groups.get(key).list.push(o);
  });
  const p = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const { mt, list } of groups.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let v = 0, i = 0;
    for (const o of list) {
      const g = o.geometry, P = g.attributes.position, Nr = g.attributes.normal, U = g.attributes.uv, n = P.count, w = o.matrixWorld;
      const flip = w.determinant() < 0; // mirrored mesh, flip its triangles
      nm.getNormalMatrix(w);
      for (let k = 0; k < n; k++) {
        p.fromBufferAttribute(P, k).applyMatrix4(w); pos[(v + k) * 3] = p.x; pos[(v + k) * 3 + 1] = p.y; pos[(v + k) * 3 + 2] = p.z;
        p.fromBufferAttribute(Nr, k).applyMatrix3(nm).normalize(); nor[(v + k) * 3] = p.x; nor[(v + k) * 3 + 1] = p.y; nor[(v + k) * 3 + 2] = p.z;
        if (U) { uv[(v + k) * 2] = U.getX(k); uv[(v + k) * 2 + 1] = U.getY(k); }
      }
      const src = g.index?.array, cnt = src ? src.length : n;
      for (let k = 0; k < cnt; k += 3) {
        const a = src ? src[k] : k, b = src ? src[k + 1] : k + 1, d = src ? src[k + 2] : k + 2;
        idx[i++] = v + a; idx[i++] = v + (flip ? d : b); idx[i++] = v + (flip ? b : d);
      }
      v += n;
      o.removeFromParent();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
    const merged = new THREE.Mesh(geo, mt); merged.matrixAutoUpdate = false; m.root.add(merged);
  }
  m.baked = true;
}

// fog distance, closer on low graphics
function applyView() {
  if (!MAP) return;
  const e = MAP.env, k = gfxQ().view;
  scene.fog.near = e.fogNear * k; scene.fog.far = e.fogFar * k;
  camera.far = Math.max(60, 200 * k); camera.updateProjectionMatrix();
}
// apply graphics settings
function applyGfx() {
  renderer.setPixelRatio(pixelRatio()); renderer.setSize(innerWidth, innerHeight);
  const an = Math.min(gfxQ().aniso, renderer.capabilities.getMaxAnisotropy());
  for (const t of allTex) if (t.anisotropy !== an) { t.anisotropy = an; t.needsUpdate = true; }
  for (const o of detailObjs) o.visible = gfxQ().detail;
  applyView();
}

function useMap(id) {
  const m = MAPS[id];
  if (MAP === m) return;
  if (!m.baked) bakeMap(m);
  if (MAP) scene.remove(MAP.root);
  MAP = m; scene.add(m.root);
  A = m.half; solids = m.solids; ground = m.ground; crateMeshes = m.cover;
  const e = m.env;
  scene.background.setHex(e.sky); scene.fog.color.setHex(e.fog); applyView();
  hemi.color.setHex(e.hemiSky); hemi.groundColor.setHex(e.hemiGround); hemi.intensity = e.hemi;
  sun.color.setHex(e.sunColor); sun.intensity = e.sun; sun.position.set(...(e.sunDir || [10, 20, 5]));
  if (m.pads.length !== PAD_COUNT[m.size]) console.warn(`${id} has ${m.pads.length} pads, ${m.size} maps should have ${PAD_COUNT[m.size]}`);
}
