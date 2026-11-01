// useMap(id) swaps which one is in the scene and points the globals the rest of the game uses
// (A, solids, ground, crateMeshes, MAP) at that map.
// Each map has a fixed layout: same pads, crates and trees every game.
// Pad count depends on map size. Each map's pads list must have exactly that many spots.
const PAD_COUNT = { small: 4, medium: 6, large: 8 };
// most players a match can have on a map this size
const MAX_PLAYERS = { small: 4, medium: 8, large: 8 };
const MAPS = {};
// the map that's loaded right now. A = arena half-size, solids = things you bump into,
// crateMeshes = things that stop bullets and block line of sight (besides the ground)
let MAP = null, A = 24, solids = [], ground = null, crateMeshes = [];

let building = null;
function startMap(id, def) {
  building = MAPS[id] = { id, root: new THREE.Group(), solids: [], cover: [], ground: null, ...def };
  return building;
}
const add = (...objs) => building.root.add(...objs);
// what a material sounds like to walk on: 'grass', 'sand', 'wood', 'stone', 'metal' or 'water'. Solids built from it pick it up
const surf = (m, s) => { m.userData.surf = s; return m; };
function addBlock(x, z, w, d, h, m) { // a solid box you can stand on; stops bullets
  const mesh = box(w, h, d, m); mesh.position.set(x, h / 2, z); add(mesh);
  building.solids.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h, surf: m.userData.surf });
  building.cover.push(mesh);
  return mesh;
}
// a box whose texture repeats every k units instead of stretching over the whole face
function tbox(w, h, d, m, k = 1) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv.array;
  const size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x, -x, +y, -y, +z, -z
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = (f * 4 + i) * 2; uv[j] *= size[f][0] / k; uv[j + 1] *= size[f][1] / k; }
  return new THREE.Mesh(geo, m);
}
// a solid box from height bot up to top, so it can float (upper floors, the wall above a window, stairs)
function addSlab(x, z, w, d, bot, top, m, cover = true, k = 1) {
  const mesh = tbox(w, top - bot, d, m, k); mesh.position.set(x, (bot + top) / 2, z); add(mesh);
  building.solids.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bot, top, surf: m.userData.surf });
  if (cover) building.cover.push(mesh);
  return mesh;
}
// a solid area with no mesh of its own (tree trunks drawn by an instanced mesh, invisible walls)
const addSolid = (x, z, w, d, top, surf) => { const s = { mesh: null, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top, surf }; building.solids.push(s); return s; };
// invisible wall: stops players and zombies (even jumping off a tall crate) but bullets go through
const addWall = (x, z, w, d) => addSolid(x, z, w, d, 99);
function addGround(G, mat) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(G * 2, G * 2), mat);
  g.rotation.x = -Math.PI / 2; add(g); building.ground = g;
  return g;
}

const dummy = new THREE.Object3D(), tint = new THREE.Color(), unit = new THREE.BoxGeometry(1, 1, 1);
function instanced(geo, mat, list) { // list of [x, y, z, sx, sy, sz, rotY, color]
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach(([x, y, z, sx, sy, sz, ry, c], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setHex(c ?? 0xffffff));
  });
  m.computeBoundingSphere(); // so bullets and line of sight checks can hit it
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
const grassGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
function grassTufts(tufts) {
  instanced(grassGeo, grassMat, tufts);
  instanced(grassGeo, grassMat, tufts.map(t => { const u = [...t]; u[6] += Math.PI / 2; return u; }));
}
const crate1 = surf(crateMat(1), 'wood'), crate2 = surf(crateMat(2), 'wood');
const addCrates = list => { for (const [x, z, tall] of list) addBlock(x, z, 1.2, 1.2, tall ? 2.4 : 1.2, tall ? crate2 : crate1); };
// fixed random numbers: the same seed gives the same layout every game
const seeded = s => () => (s = s * 16807 % 2147483647) / 2147483647;

// what's under your feet at x, z (for footsteps): the thing you're standing on, or the map's ground there
function surfaceAt(x, z, r, feet) {
  const keep = [groundRamp, groundSolid]; // don't disturb what the movement code just read
  groundAt(x, z, r, feet + .05);
  const s = groundSolid, base = s ? s.surf || 'stone' : MAP.surf || 'grass';
  [groundRamp, groundSolid] = keep;
  return MAP.surfAt ? MAP.surfAt(x, z, feet, base, s) : base;
}

function useMap(id) {
  const m = MAPS[id];
  if (MAP === m) return;
  if (MAP) scene.remove(MAP.root);
  MAP = m; scene.add(m.root);
  A = m.half; solids = m.solids; ground = m.ground; crateMeshes = m.cover;
  const e = m.env;
  scene.background.setHex(e.sky); scene.fog.color.setHex(e.fog); scene.fog.near = e.fogNear; scene.fog.far = e.fogFar;
  hemi.color.setHex(e.hemiSky); hemi.groundColor.setHex(e.hemiGround); hemi.intensity = e.hemi;
  sun.color.setHex(e.sunColor); sun.intensity = e.sun; sun.position.set(...(e.sunDir || [10, 20, 5]));
  if (m.pads.length !== PAD_COUNT[m.size]) console.warn(`${id} has ${m.pads.length} pads, ${m.size} maps should have ${PAD_COUNT[m.size]}`);
}
