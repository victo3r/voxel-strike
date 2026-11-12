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
// moves every frame, so bakeMap leaves it alone
const live = o => { o.userData.live = true; return o; };
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
  const seen = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const live = o => { for (let p = o; p; p = p.parent) if (p.userData.live) return true; return false; };
  // the black copy of the map for the enemy glow's mask: whatever can hide an enemy (not glass, water, wire fences or the sky), in 40 m chunks
  const solid = mt => !mt.transparent && !mt.alphaTest && mt.depthWrite && mt.visible, side = mt => mt.side === THREE.FrontSide ? 1 : 2;
  const occ = new Map(), occAdd = (g, w, f) => { // f: 1 front faces, 2 both sides, or one of those per triangle
    if (!g.boundingBox) g.computeBoundingBox();
    bb.copy(g.boundingBox); if (w) bb.applyMatrix4(w); bb.getCenter(c);
    const k = Math.floor(c.x / 40) + ':' + Math.floor(c.z / 40);
    (occ.get(k) || occ.set(k, []).get(k)).push({ g, w, f });
  };
  const look = mt => { // identical materials can share a mesh
    const k = [mt.type, mt.color?.getHex(), mt.emissive?.getHex(), mt.emissiveIntensity, mt.map?.uuid, mt.side, mt.alphaTest, mt.fog].join();
    return sig.get(k) || sig.set(k, mt).get(k);
  };
  m.root.traverse(o => {
    if (o.isLight) o.layers.enableAll();
    if (!o.isMesh || !seen(o)) return;
    const mt = o.material, g = o.geometry, mts = Array.isArray(mt) ? mt : [mt];
    if (o.isInstancedMesh) { if (!live(o) && mts.every(solid) && !detailObjs.includes(o)) o.layers.enable(OCC_LAYER); return; } // trees still hide enemies
    if (live(o)) { if (!g.boundingSphere) g.computeBoundingSphere(); if (mts.every(solid) && g.boundingSphere.radius > .4) o.layers.enable(OCC_LAYER); return; } // moving parts bigger than a chicken
    if (Array.isArray(mt)) { // cliffs and islands: each material's triangles
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3 | 0, f = new Uint8Array(n);
      for (const gr of g.groups) { const x = mt[gr.materialIndex]; if (x && solid(x)) f.fill(side(x), gr.start / 3, Math.min(n, (gr.start + gr.count) / 3)); }
      if (f.some(Boolean)) occAdd(g, o.matrixWorld, f);
      return;
    }
    if (mt.transparent || mt.vertexColors || mt.blending !== THREE.NormalBlending || !g.attributes.normal || g.morphAttributes.position) { if (solid(mt)) occAdd(g, o.matrixWorld, side(mt)); return; }
    if (!g.boundingBox) g.computeBoundingBox();
    bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld).getCenter(c);
    const lm = look(mt), key = lm.uuid + ':' + Math.floor(c.x / C) + ':' + Math.floor(c.z / C);
    if (!groups.has(key)) groups.set(key, { mt: lm, list: [] });
    groups.get(key).list.push(o);
  });
  const p = new THREE.Vector3(), nm = new THREE.Matrix3(), baked = new THREE.Group();
  for (const { mt, list } of groups.values()) {
    if (list.length < 2) { if (solid(mt)) occAdd(list[0].geometry, list[0].matrixWorld, side(mt)); continue; }
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
    const merged = new THREE.Mesh(geo, mt); merged.matrixAutoUpdate = false; baked.add(merged);
    if (solid(mt)) occAdd(geo, null, side(mt));
  }
  m.root.add(baked);
  const occG = new THREE.Group();
  for (const list of occ.values()) {
    const pos = [], idx = [];
    for (const { g, w, f } of list) {
      const P = g.attributes.position, I = g.index, n = (I ? I.count : P.count) / 3 | 0, v = pos.length / 3, flip = w && w.determinant() < 0;
      for (let k = 0; k < P.count; k++) { p.fromBufferAttribute(P, k); if (w) p.applyMatrix4(w); pos.push(p.x, p.y, p.z); }
      for (let t = 0; t < n; t++) {
        const s = typeof f === 'number' ? f : f[t]; if (!s) continue;
        const a = v + (I ? I.getX(t * 3) : t * 3), b = v + (I ? I.getX(t * 3 + 1) : t * 3 + 1), d = v + (I ? I.getX(t * 3 + 2) : t * 3 + 2);
        if (s === 2 || !flip) idx.push(a, b, d);
        if (s === 2 || flip) idx.push(a, d, b); // mirrored, or seen from both sides
      }
    }
    if (!idx.length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeBoundingSphere();
    const o = new THREE.Mesh(geo, maskBlack); o.matrixAutoUpdate = false; o.layers.set(OCC_LAYER); occG.add(o);
  }
  m.root.add(occG);
  m.baked = true;
}

// a walk grid for maps with levels: every height you can stand on per half-metre column, built the first time it's needed;
// zombies and bots follow nav(p, t) to the next step toward t. ref: a spot [x, y, z] in the main walkable area
function makeNav(M, ref0, sea = () => false) {
  const CA = M.half, NS = .5, NG = CA * 2 / NS, BR = .3, LV = .45, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), gx = i => -CA + (i + .5) * NS, colOf = (x, z) => clamp(Math.floor((z + CA) / NS), 0, NG - 1) * NG + clamp(Math.floor((x + CA) / NS), 0, NG - 1);
  let NAV = null;
  function buildNav() {
    const t0 = performance.now();
    // room for a body, a hair clear of walls (or they snag walking past), ground right under the middle (not just a thin edge), and not out in the sea
    const wall = (x, z, g, r = BR + .04) => solidsNear(x, z, r).some(s => hits(s, x, z, r, g) && topAt(s, x, z, r) > g + STEP);
    const stand = (x, z, g) => { if (blocked(x, z, BR, g) || wall(x, z, g) || sea(x, z, g)) return false; const g0 = groundAt(x, z, 0, g + .05); return g - g0 <= STEP && !sea(x, z, g0); };
    {
      const colStart = new Int32Array(NG * NG + 1), ys = [];
      for (let c = 0; c < NG * NG; c++) { // every level in each column, top down
        colStart[c] = ys.length;
        const x = gx(c % NG), z = gx(c / NG | 0);
        let feet = 60, last = 1e9;
        for (let k = 0; k < 8; k++) {
          const g = groundAt(x, z, BR, feet), s = groundSolid;
          if (g < last - .01) { if (stand(x, z, g)) ys.push(Math.round(g * 1000) / 1000); last = g; }
          if (!s) break;
          feet = (s.bot || 0) - .06;
        }
      }
      const NN = colStart[NG * NG] = ys.length, Y = Float32Array.from(ys), nodeCol = new Int32Array(NN);
      const levelIn = (c, y) => { for (let n = colStart[c]; n < colStart[c + 1]; n++) if (Math.abs(Y[n] - y) < .02) return n; return -1; };
      for (let c = 0; c < NG * NG; c++) for (let n = colStart[c]; n < colStart[c + 1]; n++) nodeCol[n] = c;
      // where you end up walking from each node into each neighbouring column
      const oS = new Int32Array(NN + 1), oT = [], oC = [], ok = new Uint8Array(8), lands = new Float64Array(8);
      for (let u = 0; u < NN; u++) {
        oS[u] = oT.length;
        const c = nodeCol[u], i = c % NG, j = c / NG | 0, y = Y[u];
        for (let d = 0; d < 8; d++) {
          ok[d] = 0;
          const [a, b] = DIRS[d], ni = i + a, nj = j + b, ax = a > 0 ? 0 : 1, az = b > 0 ? 2 : 3;
          if (ni < 0 || nj < 0 || ni >= NG || nj >= NG || d >= 4 && !(ok[ax] && ok[az] && Math.abs(lands[ax] - y) < .02 && Math.abs(lands[az] - y) < .02)) continue; // diagonals only on the flat
          const nc = nj * NG + ni, x = gx(ni), z = gx(nj);
          let land = null;
          if (!blocked(x, z, BR, y)) land = groundAt(x, z, BR, y);
          else { const up = groundAt(x, z, BR, y + STEP); if (up > y && !blocked(x, z, BR, up)) land = up; }
          if (land === null || d >= 4 && Math.abs(land - y) > .02) continue;
          let v = levelIn(nc, land), cost = (d < 4 ? 5 : 7) + (y - land > 1.4 ? 6 : 0);
          if (v < 0 && d < 4 && land < y + .01 && !sea(x, z, groundAt(x, z, 0, y + .05))) { // off a ledge edge: land a step further out
            const i2 = ni + a, j2 = nj + b, x2 = gx(i2), z2 = gx(j2);
            if (i2 < 0 || j2 < 0 || i2 >= NG || j2 >= NG) continue;
            if (blocked(x2, z2, BR, y)) continue;
            const l2 = groundAt(x2, z2, BR, y);
            v = y - l2 > STEP ? levelIn(j2 * NG + i2, l2) : -1; cost = 10 + (y - l2 > 1.4 ? 6 : 0);
          }
          if (v < 0) continue;
          ok[d] = 1; lands[d] = land; oT.push(v); oC.push(cost);
        }
      }
      oS[NN] = oT.length;
      const iS = new Int32Array(NN + 1), iF = new Int32Array(oT.length), iC = new Uint8Array(oT.length);
      for (const v of oT) iS[v + 1]++;
      for (let v = 0; v < NN; v++) iS[v + 1] += iS[v];
      const fill = iS.slice(0, NN);
      for (let u = 0; u < NN; u++) for (let e = oS[u]; e < oS[u + 1]; e++) { const k = fill[oT[e]]++; iF[k] = u; iC[k] = oC[e]; }
      NAV = { Y, colStart, nodeCol, oS, oT: Int32Array.from(oT), oC: Uint8Array.from(oC), iS, iF, iC, cache: new Map(), main: null };
      // the main area: everywhere you can walk to from the beach and back
      const ref = nodeNear(ref0[0], ref0[2], ref0[1], false, .6, 3), reach = (S, T) => { const seen = new Uint8Array(NN), q = [ref]; seen[ref] = 1; for (let k = 0; k < q.length; k++) for (let e = S[q[k]]; e < S[q[k] + 1]; e++) { const v = T[e]; if (!seen[v]) { seen[v] = 1; q.push(v); } } return seen; };
      const fw = reach(oS, NAV.oT), bw = reach(iS, iF);
      NAV.main = fw.map((f, n) => f & bw[n]);
      NAV.ms = performance.now() - t0;
    }
  }
  // the node nearest a spot, at most `up` above it and `down` below
  function nodeNear(x, z, y, mainOnly, up, down) {
    const i0 = clamp(Math.floor((x + CA) / NS), 0, NG - 1), j0 = clamp(Math.floor((z + CA) / NS), 0, NG - 1);
    let best = -1, bs = 1e9;
    for (let j = Math.max(0, j0 - 3); j <= Math.min(NG - 1, j0 + 3); j++) for (let i = Math.max(0, i0 - 3); i <= Math.min(NG - 1, i0 + 3); i++) {
      const c = j * NG + i;
      for (let n = NAV.colStart[c]; n < NAV.colStart[c + 1]; n++) {
        if (mainOnly && !NAV.main[n]) continue;
        const dy = NAV.Y[n] - y; if (dy > up || dy < -down) continue;
        const s = Math.hypot(gx(i) - x, gx(j) - z) + Math.abs(dy) * 2;
        if (s < bs) { bs = s; best = n; }
      }
    }
    return best;
  }
  // cost to reach a goal from every node (cached per 2 m square and level)
  function fieldTo(g) {
    const c = NAV.nodeCol[g], bi = (c % NG) >> 2, bj = (c / NG | 0) >> 2, key = (bj * 64 + bi) * 128 + Math.round(NAV.Y[g] / LV) + 20;
    let f = NAV.cache.get(key);
    if (f) { NAV.cache.delete(key); NAV.cache.set(key, f); return f; }
    const inB = n => { const cc = NAV.nodeCol[n]; return (cc % NG) >> 2 === bi && (cc / NG | 0) >> 2 === bj && Math.abs(NAV.Y[n] - NAV.Y[g]) < .5; };
    const seeds = [g], seen = new Set(seeds);
    for (let k = 0; k < seeds.length; k++) for (let e = NAV.oS[seeds[k]]; e < NAV.oS[seeds[k] + 1]; e++) { const v = NAV.oT[e]; if (!seen.has(v) && inB(v)) { seen.add(v); seeds.push(v); } }
    f = new Uint16Array(NAV.Y.length).fill(65535);
    const B = Array.from({ length: 16 }, () => []);
    for (const s of seeds) { f[s] = 0; B[0].push(s); }
    let left = seeds.length;
    for (let cur = 0; left > 0 && cur < 65000; cur++) {
      const q = B[cur & 15];
      while (q.length) {
        const v = q.pop(); left--;
        if (f[v] !== cur) continue;
        for (let e = NAV.iS[v]; e < NAV.iS[v + 1]; e++) { const u = NAV.iF[e], nd = cur + NAV.iC[e]; if (nd < f[u]) { f[u] = nd; B[nd & 15].push(u); left++; } }
      }
    }
    NAV.cache.set(key, f); if (NAV.cache.size > 48) NAV.cache.delete(NAV.cache.keys().next().value);
    return f;
  }
  // a straight walk from p to node v stays on v's level
  const straight = (p, v) => {
    const c = NAV.nodeCol[v], tx = gx(c % NG), tz = gx(c / NG | 0), n = Math.ceil(Math.hypot(tx - p.x, tz - p.z) / .25);
    for (let k = 1; k < n; k++) {
      const cc = colOf(p.x + (tx - p.x) * k / n, p.z + (tz - p.z) * k / n);
      let hit = false; for (let m = NAV.colStart[cc]; m < NAV.colStart[cc + 1]; m++) if (Math.abs(NAV.Y[m] - NAV.Y[v]) < .55) { hit = true; break; }
      if (!hit) return false;
    }
    return true;
  };
  const navReady = () => MAP === M && (NAV || buildNav(), true);
  const nav = (p, t) => {
    if (!navReady()) return null;
    const s = nodeNear(p.x, p.z, p.y, false, .6, 3), g = nodeNear(t.x, t.z, t.y ?? p.y, true, 99, 99);
    if (s < 0 || g < 0) return null;
    const f = fieldTo(g);
    if (f[s] === 0 || f[s] === 65535) return null; // there already, or no way there
    let u = s; const y0 = NAV.Y[s];
    for (let k = 0; k < 4; k++) { // a few cells down the field, stopping at a step
      let best = -1, bv = 1e9;
      for (let e = NAV.oS[u]; e < NAV.oS[u + 1]; e++) { const v = NAV.oT[e]; if (f[v] < f[u] && f[v] + NAV.oC[e] < bv) { bv = f[v] + NAV.oC[e]; best = v; } }
      if (best < 0 || k && (Math.abs(NAV.Y[best] - y0) > .05 || !straight(p, best))) break;
      u = best;
    }
    const c = NAV.nodeCol[u];
    return { x: gx(c % NG), y: NAV.Y[u], z: gx(c / NG | 0) };
  };
  const around = (p, t) => Math.abs(t.y - p.y) > 1.3 ? nav(p, t) : null; // someone up or down a level: take the way round
  const top = (x, z) => { if (!navReady()) return null; const c = colOf(x, z); for (let n = NAV.colStart[c]; n < NAV.colStart[c + 1]; n++) if (NAV.main[n]) return NAV.Y[n]; return null; };
  const land = (x, z, minY = -1e9) => { const c = colOf(x, z); for (let n = NAV.colStart[c]; n < NAV.colStart[c + 1]; n++) if (NAV.main[n] && NAV.Y[n] > minY) return true; return false; };
  return { nav, around, top, land, ready: navReady, data: () => NAV, nodeNear: (...a) => nodeNear(...a) };
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
// rays only test what they pass: the map's cover in a 4 m grid, and big meshes get a grid of their own (testing all of it was the bots' biggest cost)
const CG = 4, _cgOut = [], _cgBox = new THREE.Box3();
let _cgStamp = 0, _frStamp = 0;
// a 2D grid of lists, cells of size S over [lu, hu] x [lv, hv]
function grid2(lu, lv, hu, hv, S) {
  const nu = Math.max(1, Math.ceil((hu - lu) / S)), nv = Math.max(1, Math.ceil((hv - lv) / S));
  const G = { lu, lv, S, nu, nv, cells: Array.from({ length: nu * nv }, () => []) };
  G.iu = x => Math.max(0, Math.min(nu - 1, Math.floor((x - lu) / S))); G.iv = y => Math.max(0, Math.min(nv - 1, Math.floor((y - lv) / S)));
  G.add = (it, au, av, bu, bv) => { for (let j = G.iv(av); j <= G.iv(bv); j++) for (let i = G.iu(au); i <= G.iu(bu); i++) G.cells[j * nu + i].push(it); };
  return G;
}
// the cells a ray p + d t (t up to t1) crosses, in order
function walk2(G, pu, pv, du, dv, t1, visit) {
  let t0 = 0;
  for (const [p, d, lo, hi] of [[pu, du, G.lu, G.lu + G.nu * G.S], [pv, dv, G.lv, G.lv + G.nv * G.S]]) { // clip to the grid
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return; continue; }
    let a = (lo - p) / d, b = (hi - p) / d; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return;
  }
  let i = G.iu(pu + du * t0), j = G.iv(pv + dv * t0);
  const S = G.S, su = du > 0 ? 1 : -1, sv = dv > 0 ? 1 : -1, xu = Math.abs(du) > 1e-9, xv = Math.abs(dv) > 1e-9;
  const stu = xu ? S / Math.abs(du) : Infinity, stv = xv ? S / Math.abs(dv) : Infinity;
  let tu = xu ? (G.lu + (i + (du > 0)) * S - pu) / du : Infinity, tv = xv ? (G.lv + (j + (dv > 0)) * S - pv) / dv : Infinity;
  for (;;) {
    visit(G.cells[j * G.nu + i]);
    if (tu < tv) { if (tu > t1) break; i += su; tu += stu; } else { if (tv > t1) break; j += sv; tv += stv; }
    if (i < 0 || j < 0 || i >= G.nu || j >= G.nv) break;
  }
}
// a big mesh: its triangles in a grid over its two longest sides (same hits as three.js, multi-material too)
const _frRay = new THREE.Ray(), _frInv = new THREE.Matrix4(), _frS = new THREE.Sphere(), _frP = new THREE.Vector3(), _frA = new THREE.Vector3(), _frB = new THREE.Vector3(), _frC = new THREE.Vector3(), _frH = new THREE.Vector3(), _frO = [], _frD = [];
function fastRay(o) {
  if (o.userData.fr) return; o.userData.fr = 1;
  const g = o.geometry, P = g.attributes.position, I = g.index, n = (I ? I.count : P.count) / 3 | 0, mats = Array.isArray(o.material) ? o.material : null;
  if (mats && !g.groups.length) return;
  const tm = new Uint8Array(n).fill(mats ? 0 : 1); // each triangle's material + 1 (0: in no group, so never hit)
  if (mats) for (const gr of g.groups) for (let t = gr.start / 3; t < Math.min(n, (gr.start + gr.count) / 3); t++) tm[t] = gr.materialIndex + 1;
  if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingSphere) g.computeBoundingSphere();
  const bb = g.boundingBox, lo = bb.min.toArray(), hi = bb.max.toArray(), ext = hi.map((h, a) => h - lo[a]);
  const [u, v] = [0, 1, 2].sort((a, b) => ext[b] - ext[a]), G = grid2(lo[u], lo[v], hi[u], hi[v], Math.max(ext[u], ext[v], 1e-3) / Math.max(1, Math.ceil(Math.sqrt(n / 2))));
  const vi = k => I ? I.getX(k) : k, seen = new Uint32Array(n);
  for (let t = 0; t < n; t++) {
    let au = Infinity, bu = -Infinity, av = Infinity, bv = -Infinity;
    for (let k = 0; k < 3; k++) { const q = vi(t * 3 + k), x = P.getComponent(q, u), y = P.getComponent(q, v); au = Math.min(au, x); bu = Math.max(bu, x); av = Math.min(av, y); bv = Math.max(bv, y); }
    G.add(t, au, av, bu, bv);
  }
  o.raycast = function (rc, out) {
    const mw = this.matrixWorld, st = ++_frStamp;
    _frS.copy(g.boundingSphere).applyMatrix4(mw);
    if (!_frS.containsPoint(rc.ray.origin) && (!rc.ray.intersectSphere(_frS, _frP) || rc.ray.origin.distanceToSquared(_frP) > rc.far * rc.far)) return;
    _frInv.copy(mw).invert(); _frRay.copy(rc.ray).applyMatrix4(_frInv);
    if (!_frRay.intersectsBox(bb)) return;
    const O = _frRay.origin.toArray(_frO), D = _frRay.direction.toArray(_frD);
    walk2(G, O[u], O[v], D[u], D[v], Infinity, list => {
      for (const t of list) {
        if (seen[t] === st || !tm[t]) continue; seen[t] = st;
        const mt = mats ? mats[tm[t] - 1] : this.material; if (!mt) continue;
        const side = mt.side, a = vi(t * 3), b = vi(t * 3 + 1), c = vi(t * 3 + 2);
        _frA.fromBufferAttribute(P, a); _frB.fromBufferAttribute(P, b); _frC.fromBufferAttribute(P, c);
        const h = side === THREE.BackSide ? _frRay.intersectTriangle(_frC, _frB, _frA, true, _frH) : _frRay.intersectTriangle(_frA, _frB, _frC, side === THREE.FrontSide, _frH);
        if (!h) continue;
        const point = _frH.clone().applyMatrix4(mw), distance = rc.ray.origin.distanceTo(point);
        if (distance < rc.near || distance > rc.far) continue;
        const normal = new THREE.Vector3(); THREE.Triangle.getNormal(_frA, _frB, _frC, normal);
        out.push({ distance, point, object: this, face: { a, b, c, normal, materialIndex: tm[t] - 1 }, faceIndex: t });
      }
    });
  };
}
// many instances: only the ones near the ray (each tested like three.js does)
const _frMesh = new THREE.Mesh(), _frHits = [];
function fastInst(o) {
  if (o.userData.fr) return; o.userData.fr = 1;
  const g = o.geometry, n = o.count, ms = [], boxes = [];
  if (!g.boundingBox) g.computeBoundingBox();
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let k = 0; k < n; k++) {
    const M = new THREE.Matrix4(); o.getMatrixAt(k, M); M.premultiply(o.matrixWorld); ms.push(M);
    const { min: a, max: b } = _cgBox.copy(g.boundingBox).applyMatrix4(M); boxes.push([k, a.x, a.z, b.x, b.z]);
    x0 = Math.min(x0, a.x); z0 = Math.min(z0, a.z); x1 = Math.max(x1, b.x); z1 = Math.max(z1, b.z);
  }
  const G = grid2(x0, z0, x1, z1, CG), seen = new Uint32Array(n);
  for (const b of boxes) G.add(...b);
  o.raycast = function (rc, out) {
    const st = ++_frStamp, d = rc.ray.direction; _frMesh.geometry = g; _frMesh.material = this.material;
    walk2(G, rc.ray.origin.x, rc.ray.origin.z, d.x, d.z, rc.far, list => {
      for (const k of list) {
        if (seen[k] === st) continue; seen[k] = st;
        _frMesh.matrixWorld = ms[k]; _frMesh.raycast(rc, _frHits);
        for (const h of _frHits) { h.instanceId = k; h.object = this; out.push(h); }
        _frHits.length = 0;
      }
    });
  };
}
function coverGrid(m) {
  if (m.cg && m.cg.n === m.cover.length) return m.cg; // rebuilt if cover is added or removed
  const items = [], always = [];
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const o of m.cover) {
    const g = o.geometry; if (!g) { always.push(o); continue; }
    if (o.isInstancedMesh) { if (o.count > 16) fastInst(o); if (!o.boundingBox) o.computeBoundingBox(); _cgBox.copy(o.boundingBox); }
    else { if (o.isMesh && !g.morphAttributes.position && (g.index ? g.index.count : g.attributes.position.count) >= 300) fastRay(o); if (!g.boundingBox) g.computeBoundingBox(); _cgBox.copy(g.boundingBox); }
    _cgBox.applyMatrix4(o.matrixWorld); // baked pieces keep the world matrix they had in the map
    const { min: a, max: b } = _cgBox; items.push([o, a.x, a.z, b.x, b.z]);
    x0 = Math.min(x0, a.x); z0 = Math.min(z0, a.z); x1 = Math.max(x1, b.x); z1 = Math.max(z1, b.z);
  }
  const G = items.length ? grid2(x0, z0, x1, z1, CG) : null;
  for (const it of items) G.add(...it);
  return m.cg = { always, G, n: m.cover.length };
}
// the cover a ray from o along unit d might hit within far (a shared list, use it right away)
function coverAlong(o, d, far) {
  const C = coverGrid(MAP), out = _cgOut, st = ++_cgStamp; out.length = 0;
  for (const a of C.always) out.push(a);
  if (C.G) walk2(C.G, o.x, o.z, d.x, d.z, Math.min(far, 1e4), list => { for (const m of list) if (m.userData._cs !== st) { m.userData._cs = st; out.push(m); } });
  return out;
}
