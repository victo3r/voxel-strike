// lobbies: what's behind you in the menus, picked with the lobby button (prof.lobby); the ones with a price are bought or come from golden chests (chest), owned in prof.lobbies
const LOBBIES = [
  { id: 'show', name: 'SHOWCASE', ic: 'isle' },
  { id: 'forest', name: 'FOREST', ic: 'pine' },
  { id: 'castle', name: 'CASTLE', ic: 'castle', unlock: 10, price: 250 },
  { id: 'canyon', name: 'CANYON', ic: 'cactus', unlock: 15, price: 300 },
  { id: 'volcano', name: 'VOLCANO', ic: 'volcano', unlock: 20, price: 400 },
  { id: 'pirate', name: 'PIRATE SHIP', ic: 'ship', unlock: 25, price: 500 },
  { id: 'mansion', name: 'HAUNTED', ic: 'ghost', unlock: 30, price: 600 },
  { id: 'moon', name: 'MOON BASE', ic: 'rocket', unlock: 40, price: 750 },
  { id: 'aurora', name: 'AURORA', ic: 'aurora', unlock: 50, price: 1000 },
  { id: 'reef', name: 'REEF', ic: 'fish', chest: 1, price: 750, rar: 'legend' },
  { id: 'candy', name: 'CANDY', ic: 'candy', chest: 1, price: 750, rar: 'legend' },
];
const lobbyOwn = L => !L.price || !!prof.lobbies?.[L.id];
const lobbyById = id => LOBBIES.find(L => L.id === id);
const lobbyOf = id => { const L = lobbyById(id); return L && lobbyOwn(L) ? L : LOBBIES[0]; }; // yours, or the showcase
let lobbyCur = LOBBIES[0];

// ---- pixels that never stretch: boxes sized and placed in whole pixels, textures laid on at TX to the metre (like your skin and the maps)
const TX = 16;
function pxTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = Math.min(gfxQ().aniso, renderer.capabilities.getMaxAnisotropy());
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; allTex.push(t);
  return t;
}
const pxMat = map => lam({ map, vertexColors: true });
// boxes { x, y, z, w, h, d, c: tint, r: turn about y, o: where the texture starts ('c': the box's middle) } as one mesh; faces across `end` ('x' or 'y') take the second material
function pxBoxes(list, mats, { tw = 16, th = tw, end = '', ew = 16, eh = ew } = {}) {
  const pos = [], nor = [], uv = [], col = [], ix = [[], []], C = new THREE.Color();
  const span = (m, s) => { let lo = Math.round((m - s / 2) * TX), hi = Math.round((m + s / 2) * TX); if (hi <= lo) { lo = Math.floor(m * TX); hi = lo + 1; } return [(lo + hi) / 2 / TX, (hi - lo) / TX]; }; // middle and size, each edge on the pixel grid so boxes that meet still meet
  for (const b of list) {
    const [cx, w] = span(b.x, b.w), [cy, h] = span(b.y, b.h), [cz, d] = span(b.z, b.d), cr = Math.cos(b.r || 0), sr = Math.sin(b.r || 0);
    const [ox, oy, oz] = b.o === 'c' ? [cx, cy, cz] : b.o || [0, 0, 0];
    C.set(b.c ?? 0xffffff);
    const g = new THREE.BoxGeometry(w, h, d), P = g.attributes.position, N = g.attributes.normal, I = g.index.array, v0 = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      const lx = P.getX(i), ly = P.getY(i), lz = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      const e = end === 'x' ? nx !== 0 : end === 'y' && ny !== 0, su = (e ? ew : tw) / TX, sv = (e ? eh : th) / TX;
      const ux = lx + cx - ox, uy = ly + cy - oy, uz = lz + cz - oz; // unturned, so the texture turns with the box
      if (nx) uv.push(-nx * uz / su, uy / sv); else if (nz) uv.push(nz * ux / su, uy / sv); else uv.push(ux / su, -ny * uz / sv);
      pos.push(cx + lx * cr + lz * sr, cy + ly, cz - lx * sr + lz * cr); nor.push(nx * cr + nz * sr, ny, -nx * sr + nz * cr); col.push(C.r, C.g, C.b);
    }
    for (let f = 0; f < 6; f++) { const e = end === 'x' ? f < 2 : end === 'y' && (f === 2 || f === 3); for (let k = 0; k < 6; k++) ix[e ? 1 : 0].push(v0 + I[f * 6 + k]); }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(ix[0].concat(ix[1]));
  if (Array.isArray(mats)) { geo.addGroup(0, ix[0].length, 0); geo.addGroup(ix[0].length, ix[1].length, 1); }
  return new THREE.Mesh(geo, mats);
}
// the rows of pixels between r0 and r1 pixels from the middle (a disc when r0 is 0), from y0 to y1, as boxes
function pxRing(r1, r0, y0, y1, o = {}) {
  const out = [], half = (r, z) => r > Math.abs(z) ? Math.round(Math.sqrt(r * r - z * z)) : 0, y = (y0 + y1) / 2, h = y1 - y0;
  for (let j = -r1; j < r1; j++) {
    const z = j + .5, a = half(r1, z), b = half(r0, z), row = (x, w) => out.push({ x: x / TX, y, z: z / TX, w: w / TX, h, d: 1 / TX, ...o });
    if (a > b) { if (b) { row(-(a + b) / 2, a - b); row((a + b) / 2, a - b); } else row(0, 2 * a); }
  }
  return out;
}
// a rough lump: the pixels within R(angle) of the middle, from y0 to y1, as rows of boxes
function pxBlob(R, y0, y1) {
  const out = [], y = (y0 + y1) / 2, h = y1 - y0; let n = 0;
  for (let i = 0; i < 64; i++) n = Math.max(n, Math.ceil(R(i / 64 * Math.PI * 2)) + 1);
  for (let j = -n; j < n; j++) for (let i = -n, run = null; i <= n; i++) {
    const x = i + .5, z = j + .5;
    if (i < n && Math.hypot(x, z) < R(Math.atan2(z, x))) run ??= i;
    else if (run !== null) { out.push({ x: (run + i) / 2 / TX, y, z: z / TX, w: (i - run) / TX, h, d: 1 / TX }); run = null; }
  }
  return out;
}
const lumpy = (base, amp, p) => a => base * (1 + amp * (.5 * Math.sin(3 * a + p[0]) + .3 * Math.sin(5 * a + p[1]) + .2 * Math.sin(8 * a + p[2]))); // a radius with bulges
// rings drawn round the texture's corner, so a face laid on from its middle ('o') has them in its middle
function ringsTex(n, draw) { return pxTex(n, n, g => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = draw(Math.hypot((x + n / 2) % n - n / 2 + .5, (y + n / 2) % n - n / 2 + .5), Math.atan2((y + n / 2) % n - n / 2 + .5, (x + n / 2) % n - n / 2 + .5)); dot(g, rgb(c, (Math.random() - .5) * 14), x, y); } }); }
const lPick = a => a[Math.random() * a.length | 0];
const snap = v => Math.round(v * TX) / TX, even = v => Math.max(2, Math.round(v * TX / 2) * 2) / TX; // on the grid; a whole even number of pixels

// ---- the forest: a clearing at dusk, you on an old tree stump
const forestG = new THREE.Group(); forestG.visible = false; lobbyScene.add(forestG);
const forestSky = (() => {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#061a1e'); gr.addColorStop(.35, '#0f4d50'); gr.addColorStop(.55, '#22786a'); gr.addColorStop(.72, '#173f37'); gr.addColorStop(1, '#0e2a24');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const forestFog = new THREE.Fog(0x173f37, 16, 62);
const fBark = pxTex(16, 32, g => { // standing bark: grooves up and down
  fillN(g, 16, 32, [92, 66, 42], 24);
  for (const x of [1, 4, 7, 10, 13]) for (let y = 0; y < 32; y++) if (Math.random() < .8) dot(g, rgb([62, 43, 27], (Math.random() - .5) * 18), x, y);
  for (let i = 0; i < 3; i++) { const x = Math.random() * 15 | 0, y = Math.random() * 30 | 0; dot(g, rgb([52, 36, 22]), x, y, 2, 2); }
});
const fStumpBark = pxTex(16, 32, g => { // the stump's: moss over its cut edge (its side shows rows 24 to 31)
  fillN(g, 16, 32, [92, 66, 42], 24);
  for (const x of [1, 4, 7, 10, 13]) for (let y = 0; y < 32; y++) if (Math.random() < .8) dot(g, rgb([62, 43, 27], (Math.random() - .5) * 18), x, y);
  const top = [24, 24, 25, 24, 24, 26, 25, 24, 24, 24, 27, 26, 24, 24, 25, 24]; // how far down it creeps
  for (let x = 0; x < 16; x++) for (let y = 24; y <= top[x]; y++) dot(g, rgb(y === 24 ? [92, 160, 62] : [70, 132, 50], (Math.random() - .5) * 16), x, y);
});
const fBarkH = pxTex(32, 16, g => { // lying bark: grooves along it
  fillN(g, 32, 16, [92, 66, 42], 24);
  for (const y of [1, 4, 7, 10, 13]) for (let x = 0; x < 32; x++) if (Math.random() < .8) dot(g, rgb([62, 43, 27], (Math.random() - .5) * 18), x, y);
});
const fLeaf = pxTex(32, 32, g => {
  fillN(g, 32, 32, [72, 142, 52], 34);
  for (let i = 0; i < 56; i++) dot(g, 'rgba(10,40,10,.45)', Math.random() * 31 | 0, Math.random() * 32 | 0, 2, 1);
  for (let i = 0; i < 18; i++) dot(g, 'rgba(200,240,140,.22)', Math.random() * 32 | 0, Math.random() * 32 | 0);
});
const RINGS = (r, rim) => r > rim ? [70, 48, 30] : r > rim - 1 ? [118, 84, 52] : r < 1 ? [120, 84, 50] : r % 2.4 < .8 ? [172, 132, 86] : [204, 166, 116]; // bark, its inner edge, the pith, the rings
const fEnds = ringsTex(16, r => RINGS(r, 5.5)); // a 12 pixel log's cut ends
const fStumpTop = ringsTex(64, (r, a) => Math.abs(Math.sin(a * 3 + 1)) < .05 && r > 3 && r < 15 ? [130, 96, 60] : RINGS(r, 16.5)); // the stump's top, with a few cracks
const fStumpBarkM = pxMat(fStumpBark), fBarkM = pxMat(fBark), fBarkHM = pxMat(fBarkH), fLeafM = pxMat(fLeaf), fEndsM = pxMat(fEnds), fStumpM = pxMat(fStumpTop);
const fFlies = [], fRays = [], fLamps = [];
{
  const add = o => forestG.add(o);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam({ map: tex(g => {
    noise(g, [86, 150, 56], 30); g.fillStyle = 'rgba(25,70,20,.35)';
    for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2);
  }, 200, 200) }));
  ground.rotation.x = -Math.PI / 2; add(ground);
  // trees all round, none in the way of the camera
  const OAK = [0xffffff, 0xe2f5d0, 0xcfe8b8, 0xbad9a8], PINE = [0x8fb59a, 0x7fa58c, 0x9cc4a3];
  const trunks = [], leaves = [], spots = [];
  const free = (x, z, gap) => spots.every(([a, b]) => (a - x) ** 2 + (b - z) ** 2 > gap * gap);
  const inView = (x, z) => Math.hypot(x, z) < 8.5 || (z > -4 && Math.abs(x) < 12);
  function tree(x, z) {
    x = snap(x); z = snap(z);
    if (Math.random() < .3) { // a pine in layers
      const h = 2 + Math.random() * 1.5, layers = 3 + (Math.random() * 2 | 0), c = lPick(PINE);
      trunks.push({ x, y: (h + layers) / 2, z, w: .75, h: h + layers, d: .75 });
      for (let k = 0; k < layers; k++) { const s = even(4 - k * (3 / layers)); leaves.push({ x, y: h + .6 + k * 1.1, z, w: s, h: 1.25, d: s, c }); }
      leaves.push({ x, y: h + .6 + layers * 1.1, z, w: .75, h: .75, d: .75, c });
    } else { // an oak
      const big = Math.random() < .35, h = 3.5 + Math.random() * 4 + (big ? 2 : 0), w = big ? 1.375 : 1, s = even((big ? 5.5 : 4) + Math.random()), c = lPick(OAK);
      trunks.push({ x, y: (h + 1) / 2, z, w, h: h + 1, d: w });
      leaves.push({ x, y: h + .9, z, w: s, h: 2.625, d: s, c });
      leaves.push({ x, y: h + 2.8, z, w: even(s * .6), h: 1.375, d: even(s * .6), c });
      if (Math.random() < .5) leaves.push({ x: snap(x + (Math.random() - .5) * s * .5), y: h - .3, z: snap(z + (Math.random() - .5) * s * .5), w: even(s * .55), h: 1.25, d: even(s * .55), c });
    }
  }
  for (let tries = 0, k = 0; k < 240 && tries < 6000; tries++) {
    const x = (Math.random() - .5) * 150, z = 25 - Math.random() * 105;
    if (inView(x, z) || !free(x, z, 2.6)) continue;
    spots.push([x, z]); tree(x, z); k++;
  }
  for (let tries = 0, k = 0; k < 70 && tries < 3000; tries++) {
    const a = Math.random() * Math.PI * 2, d = 6.5 + Math.random() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
    if ((z > -3 && Math.abs(x) < 9) || !free(x, z, 1.6)) continue;
    const s = .9 + Math.random() * .9; leaves.push({ x: snap(x), y: s * .4, z: snap(z), w: even(s * 1.3), h: s * .8, d: even(s * 1.1), c: lPick(OAK) }); k++;
  }
  // and the two near the stump
  for (const [x, z, h] of [[-4.6, -4.2, 3], [4.9, -3.2, 2]]) {
    trunks.push({ x, y: h / 2, z, w: 1, h, d: 1 });
    leaves.push({ x, y: h + .5, z, w: 3, h: 2, d: 3 }, { x, y: h + 2, z, w: 1.625, h: 1, d: 1.625 });
  }
  add(pxBoxes(trunks, fBarkM, { th: 32 })); add(pxBoxes(leaves, fLeafM, { tw: 32 }));
  add(pxBoxes([{ x: -6.2, y: .375, z: -6.5, w: 3.625, h: .75, d: .75, r: .5, o: 'c' }], [fBarkHM, fEndsM], { tw: 32, th: 16, end: 'x' })); // a fallen log
  const stem = lam({ color: 0xeee3cf }), cap = lam({ color: 0xd8322e });
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (.1 + Math.random() * .8), d = 5 + Math.random() * 2.5, x = Math.cos(a) * d, z = Math.sin(a) * d - 1;
    const st = box(.125, .25, .125, stem); st.position.set(x, .125, z); add(st);
    const cp = box(.375, .125, .375, cap); cp.position.set(x, .3125, z); add(cp);
  }
  for (const [x, z, r] of [[-7, -14, .3], [3, -18, .25], [11, -12, .35], [-15, -22, .28]]) { // light through the trees
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), new THREE.MeshBasicMaterial({ color: 0xc8ffe8, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, 9, z); m.rotation.z = r; fRays.push(m); add(m);
  }
  for (const [x, y, z, r] of [[-3.2, .5, -2.4, .2], [-4.2, .5, -1.5, -.3], [-3.5, 1.5, -2.1, .6], [3.8, .5, -2.8, .4]]) {
    const c = box(1, 1, 1, crateMat(1)); c.position.set(x, y, z); c.rotation.y = r; add(c);
  }
  for (const x of [-3.1, 3.1]) { // lamps
    const post = box(.125, 2.25, .125, lam({ color: 0x2b2f33 })); post.position.set(x, 1.125, -1.8); add(post);
    const lan = box(.375, .4375, .375, lam({ color: 0xffc66b, emissive: 0xffa53a })); lan.position.set(x, 2.375, -1.8); add(lan);
    const lid = box(.5, .0625, .5, lam({ color: 0x2b2f33 })); lid.position.set(x, 2.625, -1.8); add(lid);
    const pl = new THREE.PointLight(0xffb45a, 6, 7); pl.position.set(x, 2.3, -1.4); add(pl); fLamps.push(pl);
  }
  // flowers
  const COLS = [[0xff4d6d, 0xffd23f], [0xffd23f, 0xc0641a], [0xb48cff, 0xfff0a0], [0xffffff, 0xffc82e], [0xff8a3d, 0x7a3a10]];
  const stemM = lam({ color: 0x3f8f3a }), leafM = lam({ color: 0x4fa844 }), mats = new Map(), fm = c => { if (!mats.has(c)) mats.set(c, lam({ color: c })); return mats.get(c); };
  function flower(x, z, tulip, [petal, mid]) {
    const g = new THREE.Group(), h = (tulip ? .38 : .3) * (.8 + Math.random() * .4);
    const head = new THREE.Group(); head.position.y = h;
    const part = (to, w, ht, d, m, px, py, pz) => { const b = box(w, ht, d, m); b.position.set(px, py, pz); to.add(b); return b; };
    part(g, .035, h, .035, stemM, 0, h / 2, 0);
    for (const s of Math.random() < .5 ? [1] : [1, -1]) part(g, .12, .025, .05, leafM, s * .06, h * (.25 + Math.random() * .2), 0).rotation.z = s * .5;
    const pm = fm(petal);
    if (tulip) {
      for (const [px, pz] of [[.045, 0], [-.045, 0], [0, .045], [0, -.045]]) part(head, px ? .035 : .1, .12, pz ? .035 : .1, pm, px, .06, pz);
      part(head, .06, .07, .06, fm(mid), 0, .035, 0);
    } else {
      part(head, .07, .04, .07, fm(mid), 0, .015, 0);
      for (const [px, pz] of [[.075, 0], [-.075, 0], [0, .075], [0, -.075]]) part(head, px ? .08 : .065, .025, pz ? .08 : .065, pm, px, 0, pz);
      head.rotation.x = .35 + Math.random() * .3; // tipped toward the camera
    }
    g.add(head);
    g.position.set(x, 0, z); g.scale.setScalar(1.25); g.rotation.y = tulip ? Math.random() * 6.3 : (Math.random() - .5) * .8;
    add(g);
  }
  for (let c = 0; c < 6; c++) {
    const a = Math.random() * Math.PI * 2, d = 2.4 + Math.random() * 3, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const col = COLS[c % COLS.length], tulip = c % 3 === 1;
    for (let k = 0, n = 2 + (Math.random() * 3 | 0); k < n; k++) flower(cx + (Math.random() - .5) * .7, cz + (Math.random() - .5) * .7, tulip, col);
  }
  for (let i = 0; i < 45; i++) { // fireflies
    const s = .07 + Math.random() * .07;
    const m = box(s, s, s, new THREE.MeshBasicMaterial({ color: i % 4 ? 0xd8ff6a : 0xffe27a, transparent: true, fog: false }));
    const x = (Math.random() - .5) * 36, y = .3 + Math.random() * 3.5, z = 3 - Math.random() * 26;
    m.position.set(x, y, z); add(m);
    fFlies.push({ m, x, y, z, p: Math.random() * 6.3, s: .4 + Math.random() * .8 });
  }
  { // stars
    const pts = [];
    for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI - Math.PI, e = .25 + Math.random() * 1.1; pts.push(Math.cos(a) * 110 * Math.cos(e), 110 * Math.sin(e), Math.sin(a) * 110 * Math.cos(e)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 })));
  }
  // the stump you stand on: 36 pixels across, its roots in the grass, moss over its edge
  add(pxBoxes(pxRing(18, 0, -.0625, .5), [fStumpBarkM, fStumpM], { th: 32, end: 'y', ew: 64 }));
  const roots = [];
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2566 + .4 + (Math.random() - .5) * .3;
    roots.push({ x: Math.cos(a) * 1.25, y: .125, z: Math.sin(a) * 1.25, w: .875, h: .25, d: .3125, r: -a, o: 'c' });
    roots.push({ x: Math.cos(a) * 1.875, y: .0625, z: Math.sin(a) * 1.875, w: .625, h: .125, d: .25, r: -a - (Math.random() - .5) * .3, o: 'c' });
  }
  add(pxBoxes(roots, fBarkHM, { tw: 32, th: 16 }));
}

// ---- the showcase: your platform floats in front of every map in turn (the lobby music's order and timing), with bots fighting on it
const showG = new THREE.Group(); lobbyScene.add(showG);
const sTop = ringsTex(64, (r, a) => { // paving in rings round the middle, a gold ring inlaid
  if (r > 11.6 && r < 13.2) return r < 12.4 ? [246, 204, 84] : [214, 164, 52];
  const [k, off, c] = r < 12 ? [8, 0, [186, 184, 178]] : [12, .5, [166, 164, 158]];
  const d = ((a / (Math.PI * 2 / k) + off) % 1 + 1) % 1, near = Math.min(d, 1 - d) * Math.PI * 2 / k * r; // pixels to the nearest joint
  return near < .55 && r > 4 ? [98, 98, 100] : c;
});
const sSide = pxTex(16, 16, g => { fillN(g, 16, 16, [150, 148, 142], 26); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(5, 0, 1, 7); g.fillRect(12, 8, 1, 7); });
const sRock = pxTex(16, 16, g => { fillN(g, 16, 16, [84, 82, 96], 30); for (let i = 0; i < 9; i++) dot(g, rgb([60, 58, 72], (Math.random() - .5) * 14), Math.random() * 15 | 0, Math.random() * 15 | 0, 2, 1); for (let i = 0; i < 5; i++) dot(g, rgb([120, 96, 70]), Math.random() * 16 | 0, Math.random() * 16 | 0); });
const sSideM = pxMat(sSide), sTopM = pxMat(sTop), sRockM = pxMat(sRock);
const sGold = lam({ color: 0xffd23f, emissive: 0x6a4d00 }), sGlow = new THREE.MeshBasicMaterial({ color: 0x3ff0e0 }), sCrystal = new THREE.MeshBasicMaterial({ color: 0x6ff8ea });
const sRocks = [], sMotes = [];
{
  const add = o => showG.add(o);
  add(pxBoxes(pxRing(20, 0, .25, .5), [sSideM, sTopM], { end: 'y', ew: 64 })); // 40 pixels across
  add(pxBoxes(pxRing(21, 20, .4375, .5), sGold)); // a gold lip
  add(pxBoxes(pxRing(21, 20, .25, .3125), sGlow)); // and a glowing band under it
  const p = [0, 1, 2].map(() => Math.random() * 6.3), tiers = Array.from({ length: 15 }, (_, t) => lumpy(2 + 15 * (1 - t / 14) ** 1.25, .12 + t * .01, p.map(q => q + t * .12))); // rock tapering down beneath it, ridges running down
  const under = [], gems = [];
  tiers.forEach((R, t) => under.push(...pxBlob(R, .125 - t * .125, .25 - t * .125)));
  add(pxBoxes(under, sRockM));
  for (let i = 0, k = 0; i < 40 && k < 6; i++) { // crystals hanging under the slab's rim, clear of the rock, and one from its tip
    const a = i / 40 * Math.PI * 2 + Math.random() * .1;
    if (tiers[0](a) > 17 || tiers[1](a) > 16.5 || Math.random() < .55) continue;
    const x = Math.round(Math.cos(a) * 18.5 - .5) + .5, z = Math.round(Math.sin(a) * 18.5 - .5) + .5, n = 2 + (Math.random() * 4 | 0);
    gems.push({ x: x / TX, y: .25 - n / 2 / TX, z: z / TX, w: 1 / TX, h: n / TX, d: 1 / TX }); k++;
  }
  gems.push({ x: 0, y: -1.625 - 3 / TX, z: 0, w: 2 / TX, h: 6 / TX, d: 2 / TX }, { x: .5 / TX, y: -1.625 - 7 / TX, z: .5 / TX, w: 1 / TX, h: 2 / TX, d: 1 / TX });
  add(pxBoxes(gems, sCrystal));
  for (const [a, r, y, s] of [[2.6, 3.1, .9, 5], [3.5, 3.4, -.5, 7], [5.9, 3, .2, 4], [.2, 3.5, -.9, 6]]) { // little rocks drifting round it
    const q = [0, 1, 2].map(() => Math.random() * 6.3), rock = [s, s - 1, s - 3].flatMap((b, t) => pxBlob(lumpy(b, .2, q), -t * .125, .125 - t * .125));
    const m = pxBoxes(rock, sRockM); if (s > 5) m.add(pxBoxes([{ x: .5 / TX, y: .125 + 1.5 / TX, z: .5 / TX, w: 2 / TX, h: 3 / TX, d: 2 / TX }], sCrystal));
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); add(m); sRocks.push({ m, a, r, y, p: Math.random() * 6.3, s: .15 + Math.random() * .2 });
  }
  for (let i = 0; i < 16; i++) { // motes rising past it
    const m = box(.0625, .0625, .0625, new THREE.MeshBasicMaterial({ color: 0x9ffcf2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    add(m); sMotes.push({ m, a: Math.random() * 6.3, r: .8 + Math.random() * 1.6, t: Math.random(), s: .12 + Math.random() * .12 });
  }
}

function forestTick(dt, t) {
  for (const f of fFlies) {
    f.m.position.set(f.x + Math.sin(t * f.s * .7 + f.p) * .6, f.y + Math.sin(t * f.s + f.p * 2) * .35, f.z + Math.cos(t * f.s * .5 + f.p) * .6);
    f.m.material.opacity = .2 + .8 * Math.max(0, Math.sin(t * f.s * 2 + f.p));
  }
  for (const r of fRays) r.material.opacity = .055 + Math.sin(t * .5 + r.position.x) * .02;
  for (const l of fLamps) l.intensity = 5.5 + Math.sin(t * 9 + l.position.x) * .4 + Math.sin(t * 23) * .2;
}
// each lobby's world, made the first time it's shown: { g, sky, fog, tick(dt, t), lit: how you're lit there (the lobby's own if none), hey(): a moment when it's bought }
const LOBBY_MAKE = { forest: () => ({ g: forestG, sky: forestSky, fog: forestFog, tick: forestTick }) }, lobbyMade = {};
const lobbyWorld = id => lobbyMade[id] ??= (W => (W.g.visible = false, W))(LOBBY_MAKE[id]()); // made hidden: lobbyUse shows yours
// the lobby's own life, every frame
function lobbyTick(dt, t) {
  if (lobbyCur.id !== 'show') {
    const W = lobbyMade[lobbyCur.id]; W.tick(dt, t);
    if (W.lit) litPut(litMix(W.lit, LIT0, plainTo(dt), litM));
    return;
  }
  for (const k of sRocks) { k.m.position.set(Math.cos(k.a + t * .04) * k.r, k.y + Math.sin(t * .7 + k.p) * .12, Math.sin(k.a + t * .04) * k.r); k.m.rotation.y = t * k.s + k.p; }
  for (const o of sMotes) {
    o.t += dt * o.s; if (o.t > 1) { o.t -= 1; o.a = Math.random() * 6.3; o.r = .8 + Math.random() * 1.6; }
    o.m.position.set(Math.cos(o.a) * o.r, -1.6 + o.t * 2.6, Math.sin(o.a) * o.r); o.m.material.opacity = Math.sin(o.t * Math.PI) * .8;
  }
  sGlow.color.setHSL(.48, .85, .5 + Math.sin(t * 2) * .08);
}

// ---- the showcase's map: bots fighting in the game's own world, seen through the lobby's camera carried round it
const SHOW_MAPS = LOBBY_SONGS;
const SHOW_T = 8 * 16 * 15 / 84, SHOW_FADE = 1.4; // a map's turn when there's no music to follow (the lobby music's 8 bars), the crossfade
const SHOW_K = { low: .5, medium: .6, high: .75 }; // how sharp it's drawn
const SHOW_CAM = { forest: { gain: 1.3, h: 6, under: 6.5 }, graveyard: { gain: 1.35 } }; // by map: where it flies (the forest's under its leaves) and how bright
const SHOW_V = .55, SHOW_OFF = .2; // how fast it glides (m/s), how far it looks to one side of the middle
const SHOW_TAG = new THREE.SpriteMaterial({ visible: false });
const SHOW = { on: false, i: -1, next: Math.max(0, SHOW_MAPS.indexOf('yard')), clock: 0, age: 0, last: 0, fade: 1, ready: true, gen: 0, recs: [], rig: null, plain: 0,
  cam: new THREE.PerspectiveCamera(), tex: [], vw: 2, vh: 2, drawn: false }; // drawn as a match is drawn, then copied: this frame and the last map's
muLobbyAt = () => lobbyCur.id !== 'show' ? 0 : SHOW.i >= 0 ? SHOW.i : SHOW.next;
const SHOW_BG = new THREE.Color(0x081416); // before a map is up
const showMat = new THREE.ShaderMaterial({
  uniforms: { a: { value: null }, b: { value: null }, k: { value: 1 }, ga: { value: 1 }, gb: { value: 1 }, dark: { value: 1 }, bg: { value: SHOW_BG }, px: { value: new THREE.Vector2(.001, .001) } },
  vertexShader: glowQuadVS, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D a, b; uniform float k, ga, gb, dark; uniform vec3 bg; uniform vec2 px; varying vec2 vUv;
    vec3 lin(sampler2D t, vec2 o) { return pow(texture2D(t, vUv + o).rgb, vec3(2.2)); }
    vec3 soft(sampler2D t) { return (lin(t, vec2(0.)) * 2. + lin(t, px) + lin(t, -px) + lin(t, vec2(px.x, -px.y)) + lin(t, vec2(-px.x, px.y))) / 6.; }
    void main() {
      vec3 c = mix(soft(a) * ga, mix(soft(b) * gb, bg, dark), k);
      vec2 d = (vUv - .5) * vec2(1.2, 1.);
      gl_FragColor = vec4(pow(c * (.9 - .7 * dot(d, d)), vec3(1. / 2.2)), 1.);
    }`,
});
const showQS = new THREE.Scene(), showQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), showMat); showQuad.frustumCulled = false; showQS.add(showQuad);
// the match's world as the showcase's own: free for all, you nowhere in it, silent
function showCtx(fn) {
  const was = [mode, MR, respawnT], py = P.pos.y;
  mode = 'dm'; MR = RULES.dm; respawnT = 1e9; sfxOff = true; P.pos.y = -1e4; camera.position.copy(SHOW.cam.position); // the forest's moon follows the camera
  try { fn(); } finally { [mode, MR, respawnT] = was; sfxOff = false; P.pos.y = py; }
}
const showMake = r => { const b = makeBot(r); b.show = true; b.tag.visible = false; r.wait = 1 + Math.random() * 2; };
let showLooks = null; // its people: ten looks made once and dealt out, so their skins are made once too
function showBots() {
  showLooks ??= Array.from({ length: 10 }, (_, k) => { const L = BOT_LOOKS[k % BOT_LOOKS.length], [r, g, b] = L.shirt; return { css: L.css, look: randomLook('show' + k + Math.random(), r << 16 | g << 8 | b) }; });
  const n = Math.min(gfx.q === 'low' ? 4 : 6, { small: 4, medium: 5, large: 6 }[MAP.size] || 4), deal = [...showLooks].sort(() => Math.random() - .5), next = nameMaker([]);
  SHOW.recs = deal.slice(0, n).map(L => ({ name: next().name, css: L.css, look: L.look, tag: SHOW_TAG, tagW: 1, quiet: true, score: 0, kills: 0, deaths: 0, streak: 0, b: null, wait: 0,
    skill: Math.random() < .6 ? 3 : 2, ...botLoadout(false, LV_MAX) })); // any gun in the armory
  for (const r of SHOW.recs) showMake(r);
}
// the tallest thing in each 2 m square of a map (its ground, what you stand on, trees, anything drawn), worked out once a map
function showHeights(M, under = 99) {
  if (M.showH) return M.showH;
  const E = M.half + 8, S = 2, n = Math.ceil(E * 2 / S), H = new Float32Array(n * n), ci = v => Math.max(0, Math.min(n - 1, Math.floor((v + E) / S)));
  const mark = (x0, z0, x1, z1, top) => {
    if (top > 60 || x1 < -E || z1 < -E || x0 > E || z0 > E) return; // the walls round it, the sky
    for (let j = ci(z0); j <= ci(z1); j++) for (let i = ci(x0); i <= ci(x1); i++) if (H[j * n + i] < top) H[j * n + i] = top;
  };
  for (const s of M.solids) mark(s.minX, s.minZ, s.maxX, s.maxZ, s.top);
  M.root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), w = new THREE.Matrix4(), bb = new THREE.Box3();
  M.root.traverse(o => {
    if (!o.isMesh || [o.material].flat().every(m => m.transparent)) return; // glass, water, clouds
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const one = mw => {
      bb.copy(g.boundingBox).applyMatrix4(mw);
      if (bb.min.x < -E - 12 || bb.max.x > E + 12 || bb.min.z < -E - 12 || bb.max.z > E + 12 || bb.min.y > under) return; // the sky, hills on the horizon, leaves it flies under
      if (bb.max.x - bb.min.x < 8 && bb.max.z - bb.min.z < 8) { // small: its box, unless it's up out of the way (birds, lanterns)
        if (bb.min.y > 6 && bb.max.y - bb.min.y < 3 && bb.max.x - bb.min.x < 3 && bb.max.z - bb.min.z < 3) return;
        return mark(bb.min.x, bb.min.z, bb.max.x, bb.max.z, bb.max.y);
      }
      const P = g.attributes.position; // the baked map: every corner in it
      for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k).applyMatrix4(mw); mark(v.x, v.z, v.x, v.z, v.y); }
    };
    if (o.isInstancedMesh) for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, w); one(w.premultiply(o.matrixWorld)); }
    else one(o.matrixWorld);
  });
  if (M.top) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) H[j * n + i] = Math.max(H[j * n + i], M.top(-E + (i + .5) * S, -E + (j + .5) * S) ?? 0); // the ground's rise and fall
  return M.showH = (x, z) => H[ci(z) * n + ci(x)];
}
// its way round: near the map's edge looking in across it, at one height a turn, as low as it can be with nothing between it and your platform
const SHOW_SEE = [[0, 0], [.2, 0], [-.35, 0], [0, .35], [0, -.35], [-.6, .3], [-.6, -.3]]; // spots it should see, in half-maps
const _lobPlat = new THREE.Vector3(0, .5, 0);
function showRig() {
  const A = MAP.half, o = SHOW_CAM[MAP.id] || {}, hf = showHeights(MAP, o.under), cl = THREE.MathUtils.clamp, TAU = Math.PI * 2, N = 24, F = 8, M = N * F;
  const D = cl(lobbyCam.position.distanceTo(_lobPlat), 5, 20), sl = (lobbyCam.position.y - _lobPlat.y + 2.1) / D; // how far ahead your platform is (20 m on an upright phone), the slope down to its rock's tip
  const h0 = o.h ?? cl(4 + A * .06, 5.5, 8), S = o.under ? D - 1 : D + 1; // under leaves only what's in front of it counts
  const need = (r, th, off) => { // how high it must be here: nothing between it and your platform comes up across it
    const x = Math.cos(th) * r, z = Math.sin(th) * r, ang = th + Math.PI + off, dx = Math.cos(ang), dz = Math.sin(ang);
    let h = 0;
    for (let s = 0; s <= S; s++) {
      const W = .5 + s * 2 / D, K = Math.ceil(W); // as wide as your platform where it is
      for (let u = -K; u <= K; u++) { const wd = u / K * W; h = Math.max(h, hf(x + dx * s - dz * wd, z + dz * s + dx * wd) + .3 + s * sl); }
    }
    return h;
  };
  const sees = (ax, ay, az, bx, by, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az)); for (let i = 1; i < n; i++) if (hf(ax + (bx - ax) * i / n, az + (bz - az) * i / n) > ay + (by - ay) * i / n) return false; return true; };
  const all = [];
  for (const r of o.under ? [.9, .8, .7, .6, .5, .4, .3].map(k => A * k) : [o.r ?? A * .85]) { // under leaves it looks harder for a way between the trunks
    const w = cl(SHOW_V / r, .008, .03), steps = Math.ceil(w * SHOW_T * 1.3 / TAU * M);
    const nd = [SHOW_OFF, -SHOW_OFF].map(off => Array.from({ length: M }, (_, m) => need(r, m / M * TAU, off)));
    const see = Array.from({ length: N }, (_, k) => { // how much of the map it sees from each place round
      const a = k / N * TAU, ca = Math.cos(a), sa = Math.sin(a); let n = 0;
      for (const [u, v] of SHOW_SEE) { const x = (u * ca - v * sa) * A, z = (u * sa + v * ca) * A; if (sees(ca * r, h0 + 2, sa * r, x, hf(x, z) + 1.2, z)) n++; }
      return n;
    });
    for (let m0 = 0; m0 < M; m0 += o.under ? 1 : F) for (const dir of [1, -1]) for (const oi of [0, 1]) {
      let h = h0, n = 0, bad = 0;
      for (let j = 0; j <= steps; j++) { const v = nd[oi][((m0 + dir * j) % M + M) % M]; if (v > h0) { bad++; h = Math.max(h, v); } }
      for (let j = 0; j <= 3; j++) n += see[(Math.round((m0 + dir * steps * j / 3) / F) % N + N) % N];
      const sc = n / 4 - (o.under ? bad / (steps + 1) * 30 + h - h0 : (h - h0) * .5) + Math.random(); // under leaves it can't rise, so the less of the turn anything is in the way the better
      all.push({ sc, r, w, a: m0 / M * TAU, dir, off: oi ? -SHOW_OFF : SHOW_OFF, h: o.under ? h0 : h, miss: h - h0, bad: bad / (steps + 1) });
    }
  }
  all.sort((p, q) => q.sc - p.sc);
  const drawn = [], many = [], bb = new THREE.Box3(), v = new THREE.Vector3(), sp = new THREE.Sphere(); MAP.root.updateMatrixWorld(true);
  const low = h0 - .1 + Math.min(...SHOW_RAYS.map(([x, y]) => { v.set(x - lobbyCam.position.x, _lobPlat.y + y - lobbyCam.position.y, -lobbyCam.position.z); const L = v.length(); return v.y * (L - 1.4) / L; })); // where its lowest ray ends
  MAP.root.traverse(m => { // what's drawn, but not the sky or far off (all round the camera, so slow to cast at) nor anything lower than that
    if (!m.isMesh || m.renderOrder < 0 || ![m.material].flat().some(t => t.visible && !t.transparent)) return;
    const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingSphere) g.computeBoundingSphere();
    if (!m.isInstancedMesh) { if (bb.copy(g.boundingBox).applyMatrix4(m.matrixWorld).max.y > low) drawn.push(m); return; }
    const one = { m, s: [], w: [] }; // each copy on its own, so a ray only looks closely at the ones it passes
    for (let i = 0; i < m.count; i++) { const w = new THREE.Matrix4(); m.getMatrixAt(i, w); w.premultiply(m.matrixWorld); if (bb.copy(g.boundingBox).applyMatrix4(w).max.y > low) { one.w.push(w); one.s.push(sp.copy(g.boundingSphere).applyMatrix4(w).clone()); } }
    if (one.w.length) many.push(one);
  });
  SHOW.rig = { ...all.slice(0, 12).find(c => showClear(c, drawn, many)) || all[0], yaw: 0, gain: o.gain ?? 1 }; // the grid is coarse, so the best few are checked for real
}
// nothing drawn between the camera and your platform's top, rim and rock or your head, all through its turn (lobbies.mjs casts the same rays)
const SHOW_RAYS = [[0, 0], [-1.2, 0], [1.2, 0], [0, -2.1], [-.8, -1.2], [.8, -1.2], [0, 2.1]], _src = new THREE.Raycaster(), _sro = new THREE.Vector3(), _srd = new THREE.Vector3(), _srp = new THREE.Vector3(), _srm = new THREE.Mesh(), _srh = [];
function showClear(c, drawn, many) {
  const bx = -lobbyCam.position.x, by = _lobPlat.y - lobbyCam.position.y, bz = -lobbyCam.position.z;
  for (let k = 0; k <= 10; k++) {
    const th = c.a + c.dir * c.w * SHOW_T * 1.15 * k / 10, ang = th + Math.PI + c.off, yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
    _sro.set(Math.cos(th) * c.r, c.h, Math.sin(th) * c.r);
    for (const [x, y] of SHOW_RAYS) {
      _srd.set(bx + x, by + y, bz).applyAxisAngle(_up, yaw); const L = _srd.length();
      _src.set(_sro, _srd.normalize()); _src.far = L - 1.4;
      if (_src.intersectObjects(drawn, false).length) return false;
      for (const { m, s, w } of many) for (let i = 0; i < s.length; i++) {
        const t = THREE.MathUtils.clamp(_srp.subVectors(s[i].center, _sro).dot(_srd), 0, _src.far); // the ray's nearest point to it
        if (_srp.copy(_srd).multiplyScalar(t).add(_sro).distanceToSquared(s[i].center) > s[i].radius ** 2) continue;
        _srm.geometry = m.geometry; _srm.material = m.material; _srm.matrixWorld.copy(w[i]); _srh.length = 0; _srm.raycast(_src, _srh);
        if (_srh.length) return false;
      }
    }
  }
  return true;
}
// you're lit as the map behind you is: its sky, its sun from where it is there, brighter on the dark maps; plainly in the armory and the wardrobe
const LOB_LIGHTS = [[lHemi, 'color'], [lHemi, 'groundColor'], [lKey, 'color'], [lRim, 'color'], [lBounce, 'color']], LOB_LAMPS = [lHemi, lKey, lRim, lBounce];
const litSet = () => ({ c: LOB_LIGHTS.map(() => new THREE.Color()), i: LOB_LAMPS.map(() => 0), d: new THREE.Vector3() });
const litRead = s => { LOB_LIGHTS.forEach(([l, k], j) => s.c[j].copy(l[k])); LOB_LAMPS.forEach((l, j) => s.i[j] = l.intensity); s.d.copy(lKey.position).normalize(); return s; };
const litPut = s => { LOB_LIGHTS.forEach(([l, k], j) => l[k].copy(s.c[j])); LOB_LAMPS.forEach((l, j) => l.intensity = s.i[j]); lKey.position.copy(s.d).multiplyScalar(10); };
function litMix(a, b, t, out) {
  out.c.forEach((c, j) => c.copy(a.c[j]).lerp(b.c[j], t)); out.i.forEach((_, j) => out.i[j] = a.i[j] + (b.i[j] - a.i[j]) * t);
  if (out.d.copy(a.d).lerp(b.d, t).lengthSq() < 1e-4) out.d.copy(b.d); // suns that face each other
  out.d.normalize(); return out;
}
const LIT0 = litRead(litSet()), litA = litSet(), litB = litSet(), litM = litSet(); // the lobby's own, the last map's, this map's, now
function litMap(e, g, s) {
  [e.hemiSky, e.hemiGround, e.sunColor, e.fog, e.hemiGround].forEach((c, j) => s.c[j].setHex(c));
  s.i[0] = Math.max(e.hemi * g, LIT0.i[0] * .75); s.i[1] = Math.max(e.sun * g * 1.15, LIT0.i[1] * .55); s.i[2] = .6 * g; s.i[3] = .45 * g;
}
const _up = new THREE.Vector3(0, 1, 0);
function plainTo(dt) { // plain light while you choose colours (the armory, the wardrobe, DRAW)
  const to = armOpen || drawOpen() || $('lobby').classList.contains('cust') ? 1 : 0;
  return SHOW.plain = Math.abs(to - SHOW.plain) < .002 ? to : SHOW.plain + (to - SHOW.plain) * Math.min(1, dt * 4);
}
function showLight(dt) {
  const e = MAP.env;
  litB.d.set(...(e.sunDir || [10, 20, 5])).normalize().applyAxisAngle(_up, -SHOW.rig.yaw); // the map's sun, seen from where you are in it
  litPut(litMix(litMix(litA, litB, 1 - smooth(SHOW.fade), litM), LIT0, plainTo(dt), litM));
}
// the next map: the last frame of this one stays to fade from (the dark the first time)
const _showNav = { x: 0, y: 0, z: 0 };
function showGo(i) {
  showSize();
  const u = showMat.uniforms;
  if (SHOW.i < 0 || !SHOW.drawn) u.dark.value = 1;
  else { SHOW.tex.reverse(); u.gb.value = SHOW.rig?.gain ?? 1; u.dark.value = 0; }
  SHOW.drawn = false;
  SHOW.i = i; SHOW.next = (i + 1) % SHOW_MAPS.length; SHOW.clock = 0; SHOW.age = 0; SHOW.fade = 1;
  litRead(litA); // the lights fade from what they are
  showCtx(() => { worldClear(); useMap(SHOW_MAPS[i]); MAP.nav?.(_showNav, _showNav); setupPads(); emptyPads(); showRig(); showBots(); }); // the bots' walk grid made now, while the last map still shows
  litMap(MAP.env, SHOW.rig.gain, litB);
  showCamTick();
  showWarm(++SHOW.gen);
}
// its shaders made first (off the main thread where the browser can), then it fades in; something freed meanwhile is just skipped
function showWarm(g) {
  SHOW.ready = false; camera.visible = false;
  const ms = renderer.compile(scene, SHOW.cam), t0 = performance.now(); // the match's own shaders, so a match after it has them ready
  camera.visible = true;
  const check = () => {
    if (g !== SHOW.gen) return;
    for (const m of ms) { const p = renderer.properties.get(m).currentProgram; if (!p || p.isReady()) ms.delete(m); }
    if (!ms.size || performance.now() - t0 > 2500) SHOW.ready = true; else setTimeout(check, 30);
  };
  check();
}
// the camera: the lobby's own (its tilt, its lens, where it puts you on screen), carried round the map at one steady speed
function showCamTick() {
  const R = SHOW.rig, cam = SHOW.cam, th = R.a + R.dir * R.w * SHOW.age, ang = th + Math.PI + R.off;
  R.yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
  cam.position.set(Math.cos(th) * R.r, R.h, Math.sin(th) * R.r);
  cam.quaternion.setFromAxisAngle(_up, R.yaw).multiply(lobbyCam.quaternion);
  cam.projectionMatrix.copy(lobbyCam.projectionMatrix); cam.projectionMatrixInverse.copy(lobbyCam.projectionMatrixInverse);
}
const _ssz = new THREE.Vector2(), _svp = new THREE.Vector4(), _s0 = new THREE.Vector2();
function showSize() { // drawn in a corner of the screen at this size, then copied out
  renderer.getDrawingBufferSize(_ssz);
  const pr = renderer.getPixelRatio(), k = SHOW_K[gfx.q] ?? .6, T = SHOW.tex;
  SHOW.vw = Math.max(2, Math.round(_ssz.x * k)) / pr; SHOW.vh = Math.max(2, Math.round(_ssz.y * k)) / pr;
  const w = Math.floor(SHOW.vw * pr), h = Math.floor(SHOW.vh * pr); // as three rounds the view
  if (T[0]?.image.width === w && T[0]?.image.height === h) return;
  T.forEach(t => t.dispose());
  SHOW.tex = [0, 1].map(() => { const t = new THREE.FramebufferTexture(w, h); t.minFilter = t.magFilter = THREE.LinearFilter; return t; });
  showMat.uniforms.px.value.set(.8 / w, .8 / h); showMat.uniforms.dark.value = 1; SHOW.drawn = false; // the last map's frame is gone
}
function showRender(dt) {
  showSize();
  if (SHOW.ready) {
    const f = scene.fog, n = f.near, fr = f.far; f.near = Math.max(n, 30); f.far = Math.max(fr, 150); // seen from further off than you play it
    camera.visible = false; // your own gun hangs off the game's camera
    renderer.getViewport(_svp); renderer.setViewport(0, 0, SHOW.vw, SHOW.vh);
    shadowTick(dt, SHOW.cam); renderer.render(scene, SHOW.cam); renderer.copyFramebufferToTexture(_s0, SHOW.tex[0]);
    renderer.setViewport(_svp);
    camera.visible = true;
    f.near = n; f.far = fr;
    SHOW.drawn = true; SHOW.fade = Math.max(0, SHOW.fade - dt / SHOW_FADE);
  }
  const u = showMat.uniforms; u.a.value = SHOW.tex[0]; u.b.value = SHOW.tex[1]; u.k.value = smooth(SHOW.fade); u.ga.value = SHOW.rig?.gain ?? 1;
  renderer.render(showQS, glowCam);
}
function showOn() { SHOW.on = true; SHOW.i = -1; SHOW.last = 0; }
function showOff() {
  if (SHOW.i >= 0) SHOW.next = (SHOW.i + 1) % SHOW_MAPS.length;
  SHOW.on = false; SHOW.i = -1; SHOW.gen++; litPut(LIT0);
  if (inLobby && zombies.some(z => z.show)) showCtx(worldClear); // another lobby picked: its bots go (a match's own start clears them)
}
let lobShadowT = 0;
function lobbyShadow(dt) { // you and what's round you cast shadows from the lobby's key light, on high
  if (!lKey.castShadow) return;
  if ((lobShadowT -= dt) < 0) { lobShadowT = .3; shadowFlags(lobbyScene); }
  renderer.shadowMap.needsUpdate = true;
}
// draw the lobby (main.js): the showcase's map first, then you on your platform over it
function lobbyDraw(dt) {
  if (lobbyCur.id !== 'show' || !SHOW.on || bootFrames >= 0 || typeof net !== 'object' || net.on) { lobbyShadow(dt); renderer.render(lobbyScene, lobbyCam); return; } // loaded first; never with a room open
  const now = performance.now(), rdt = Math.min(.1, (now - (SHOW.last || now)) / 1000); SHOW.last = now; // the camera keeps to the clock, not the game's capped steps
  const mp = musicLobbyPos(), want = mp ? mp.i : SHOW.i < 0 ? SHOW.next : (SHOW.clock += dt) >= SHOW_T ? SHOW.next : SHOW.i;
  if (want !== SHOW.i) showGo(want);
  showTick(dt);
  SHOW.age += rdt; showCamTick(); showLight(dt); showRender(dt);
  renderer.autoClear = false; lobbyScene.background = null; lobbyShadow(dt); renderer.render(lobbyScene, lobbyCam); lobbyScene.background = SHOW_BG; renderer.autoClear = true;
}
function showTick(dt) {
  showCtx(() => {
    for (const r of SHOW.recs) if ((!r.b || r.b.dead) && (r.wait -= dt) <= 0) showMake(r);
    worldTick(dt, true);
  });
}

// ---- picking one: yours at once; one you haven't bought stays behind you until you buy it or close the picker
function lobbyUse(id) {
  lobbyCur = lobbyById(id) ?? LOBBIES[0];
  const show = lobbyCur.id === 'show', W = show ? null : lobbyWorld(lobbyCur.id);
  showG.visible = show;
  for (const k in lobbyMade) lobbyMade[k].g.visible = lobbyMade[k] === W;
  lobbyScene.background = show ? SHOW_BG : W.sky; lobbyScene.fog = show ? null : W.fog;
  if (show && inLobby) showOn(); else showOff();
  if (W?.lit) litPut(litMix(W.lit, LIT0, SHOW.plain, litM));
  renderLobbies();
}
const lobbyMine = () => lobbyOf(prof.lobby);
function lobbyBack() { if (lobbyCur !== lobbyMine()) lobbyUse(lobbyMine().id); else renderLobbies(); } // back to yours from one you were looking at
function lobbySeen(on) { lobbyBack(); if (lobbyCur.id === 'show') on ? showOn() : showOff(); } // the lobby opened or shut (showLobby)
const lobPickOpen = () => $('lobPick').style.display === 'flex';
function renderLobbies() {
  if (!lobPickOpen()) return;
  const mine = lobbyMine(), L = lobbyCur, lock = X => !lobbyOwn(X) && prof.lv < X.unlock;
  const tag = X => X === mine ? ico('check') : lobbyOwn(X) ? '' : X.chest ? ico('key') : lock(X) ? ico('lock') + X.unlock : COIN + X.price;
  const buy = lobbyOwn(L) ? '' : L.chest ? `<button id="lobChest">${ico('key')} IN GOLDEN CHESTS</button>` : lock(L) ? `<button disabled>${ico('lock')} LVL ${L.unlock}</button>` : `<button id="lobBuy"${prof.coins < L.price ? ' disabled' : ''}>BUY ${COIN}${L.price}</button>`;
  const at = $('lobBox').querySelector('.lobL')?.scrollTop | 0;
  $('lobBox').innerHTML = `<div class="lbTop"><h1>${ico('lobby')} LOBBY</h1><span class="lobCo">${COIN}${prof.coins}</span></div><div class="lobL">` +
    LOBBIES.map(X => `<button class="lobC${X === L ? ' on' : ''}${lock(X) ? ' lk' : ''}" data-lob="${X.id}"><span class="lobI">${ico(X.ic)}</span>` +
      `<span class="lobT"><b${X.name.length > 9 ? ' class="sm"' : ''}>${X.name}</b></span><span class="lobS">${tag(X)}</span></button>`).join('') +
    `</div><div class="lbFoot">${buy}<button id="lobX">${ico('close')} DONE</button></div>`;
  $('lobBox').querySelector('.lobL').scrollTop = at; // the list stays where you scrolled it
}
function lobbyPick(on) {
  $('lobPick').style.display = on ? 'flex' : 'none'; $('lobbyUI').style.display = on ? 'none' : '';
  if (!on) return lobbyBack();
  renderLobbies();
  const l = $('lobBox').querySelector('.lobL'), c = l.querySelector('.lobC.on'); // yours in view
  if (c) l.scrollTop = c.offsetTop - l.offsetTop - (l.clientHeight - c.offsetHeight) / 2;
}
function lobbyBuy() {
  const L = lobbyCur;
  if (lobbyOwn(L) || L.chest || prof.lv < L.unlock || prof.coins < L.price) return;
  prof.coins -= L.price; prof.lobbies = { ...prof.lobbies, [L.id]: 1 }; prof.lobby = L.id;
  sfx('buy'); saveProf(); showProf(); renderLobbies(); lobbyMade[L.id].hey?.();
}
$('lobBtn').innerHTML = ico('lobby');
$('lobBtn').addEventListener('click', e => { e.stopPropagation(); sfx('ui'); lobbyPick(true); });
$('lobPick').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.lob) {
    const L = lobbyById(b.dataset.lob);
    if (lobbyOwn(L) && L.id !== prof.lobby) { prof.lobby = L.id; saveProf(); }
    if (L !== lobbyCur) lobbyUse(L.id); else renderLobbies();
    sfx('ui'); return;
  }
  if (b.id === 'lobBuy') lobbyBuy();
  if (b.id === 'lobChest') { // only golden chests have these: to the golden chest, its card in view
    const name = lobbyCur.name; lobbyPick(false); chestSel = CHESTS.findIndex(c => c.id === 'gold'); openChests();
    [...document.querySelectorAll('#chestBox .lootRow .loot b')].find(e => e.textContent === name)?.parentElement.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  if (b.id === 'lobX') { sfx('ui'); lobbyPick(false); }
});
$('lobPick').addEventListener('pointerdown', e => e.stopPropagation()); // not a click on the stage
addEventListener('keydown', e => { if (e.code === 'Escape' && inLobby && lobPickOpen()) { e.stopImmediatePropagation(); lobbyPick(false); } });
// lobbyscenes.js has the bought ones' worlds, and puts you in yours once it's loaded
