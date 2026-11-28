// kill effects: what becomes of whoever you take down, for everyone to see (angels when none is on)
// chest: only from golden chests (price: its worth to the save check, unlock: when bots start using it)
const KILL_FX = [
  { id: 'ghost', name: 'Ghost', rar: 'rare', unlock: 5, price: 200 },
  { id: 'tombstone', name: 'Tombstone', rar: 'rare', unlock: 9, price: 300 },
  { id: 'chicken', name: 'Chicken', rar: 'epic', unlock: 13, price: 450 },
  { id: 'shatter', name: 'Shatter', rar: 'epic', unlock: 18, price: 600 },
  { id: 'frozen', name: 'Frozen', rar: 'legend', unlock: 24, price: 800 },
  { id: 'fireworks', name: 'Fireworks', rar: 'legend', unlock: 20, price: 1000, chest: 1 },
  { id: 'lightning', name: 'Lightning', rar: 'legend', unlock: 26, price: 1000, chest: 1 },
  { id: 'blackhole', name: 'Black Hole', rar: 'mythic', unlock: 34, price: 1400, chest: 1 },
  { id: 'confetti', name: 'Confetti', rar: 'rare', unlock: 7, price: 250 },
  // a season's own (season.js): from its presents, or only from its chests (chest)
  { id: 'snowman', name: 'Snowman', rar: 'epic', unlock: 15, price: 600, season: 'xmas26' },
  { id: 'present', name: 'Present', rar: 'legend', unlock: 20, price: 1000, season: 'xmas26', chest: 1 },
];
const ANGEL_FX = { id: '', name: 'Angel', rar: 'common' };
const kfxOf = id => KILL_FX.find(K => K.id === id);
const wornKfx = () => prof.kfx?.[prof.kfxOn] && kfxOf(prof.kfxOn) ? prof.kfxOn : '';
// bots: angels about half the time, else one they could have
function botKfx() {
  const list = KILL_FX.filter(K => prof.kfx?.[K.id] || prof.lv >= K.unlock && (!K.season || seasonOn(K.season))); // a season's only in its month
  return list.length && Math.random() < .5 ? pickRare(list).id : '';
}

// ---- bits the effects share
const _kv = new THREE.Vector3(), _kv2 = new THREE.Vector3(), _kc = new THREE.Color(), _kq = new THREE.Quaternion(), _ke = new THREE.Euler(), _km = new THREE.Matrix4(), _ks = new THREE.Vector3();
const KZ = new THREE.Vector3(0, 0, 1);
const flatMat = (c, map = PUFF_TEX) => new THREE.SpriteMaterial({ color: c, map, depthWrite: false, fog: false, blending: THREE.NormalBlending });
const SMOKE_MATS = [0x3a3633, 0x55504a, 0x6e6860].map(c => flatMat(c)), DUST_MATS = [0x8a7356, 0xa48c6a, 0x6e5a42].map(c => flatMat(c));
const FEATHER_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const a = (x - y) * .7, b = (x + y - 7) * .7; if (a * a / 1.4 + b * b / 10 > 1) continue; g.fillStyle = Math.abs(a) < .5 ? '#d6d0c4' : '#fff'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})();
const FEATHER_MATS = [0xffffff, 0xf4efe4, 0xe8dfcf].map(c => flatMat(c, FEATHER_TEX)), GHOST_MATS = puffMats([0xd8f4ff, 0x9fd8ff, 0xffffff]);
const FW_MATS = [0xff3a5a, 0xffc830, 0x30c8ff, 0x5aff4a, 0xff5ad0, 0xa060ff, 0xff7a2a].map(c => flatMat(c, STAR_MATS[0].map));
const kPick = a => a[Math.random() * a.length | 0];
// n bits from p in every direction (sp fast, lifted by up)
function kBits(mats, sc, p, n, sp, up, life, size, g = 0) {
  for (let i = fxN(n); i > 0; i--) {
    const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(sp * (.4 + Math.random() * .6)); v.y += up;
    fxBit(kPick(mats), sc, p, size * (.7 + Math.random() * .6), v, life * (.7 + Math.random() * .6), g);
  }
}
const kSnd = (b, k, name) => k.mute ? null : k.lobby ? sfx(name, { v: .8 }) : sfx(name, { at: b.g.position, far: 45 });
const glowSprite = (sc, color, at, size) => { const m = new THREE.SpriteMaterial({ map: haloMap(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }), s = new THREE.Sprite(m); s.position.copy(at); s.scale.setScalar(size); sc.add(s); return s; };

// pieces that outlast the body: { sc, tick(dt) -> true when done, end() }
const kfxLive = [];
const kfxKeep = o => (kfxLive.push(o), o);
// a flash that fades
function kFlash(sc, color, at, size, life) {
  const s = glowSprite(sc, color, at, size); let t = 0;
  return kfxKeep({ sc, tick(dt) { t += dt; s.material.opacity = Math.max(0, 1 - t / life); s.scale.setScalar(size * (1 + t / life * .4)); return t >= life; }, end() { sc.remove(s); s.material.dispose(); } });
}

// cubes a body breaks into: one draw for each look and scene
const KFX_BOX = new THREE.BoxGeometry(1, 1, 1), CUBE_CAP = 400, kCubes = [], cubeLayers = new Map();
const CUBE_MATS = { solid: lam({}), ice: new THREE.MeshLambertMaterial({ transparent: true, opacity: .8, emissive: 0x24506a, depthWrite: false }) };
function cubeLayer(sc, kind) {
  let L = cubeLayers.get(sc); if (!L) cubeLayers.set(sc, L = {});
  if (!L[kind]) { const im = L[kind] = new THREE.InstancedMesh(KFX_BOX, CUBE_MATS[kind], CUBE_CAP); im.count = 0; im.frustumCulled = false; im.userData.shared = true; im.setColorAt(0, _kc.setRGB(1, 1, 1)); sc.add(im); }
  return L[kind];
}
function addCube(k, kind, p, v, s, c, life) {
  if (kCubes.length >= CUBE_CAP * 2) return;
  cubeLayer(k.sc, kind);
  kCubes.push({ sc: k.sc, kind, p: p.clone(), v, s, c: c.clone(), life, floor: k.floor, fl: k.floor(p.x, p.z, p.y), q: new THREE.Quaternion().setFromEuler(_ke.set(Math.random() * 6, Math.random() * 6, 0)),
    w: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(16) });
}
function cubeTick(dt) {
  for (const L of cubeLayers.values()) for (const kind in L) L[kind].count = 0;
  for (let i = kCubes.length - 1; i >= 0; i--) {
    const c = kCubes[i];
    if ((c.life -= dt) <= 0) { kCubes[i] = kCubes[kCubes.length - 1]; kCubes.pop(); continue; }
    c.v.y -= 16 * dt; c.p.addScaledVector(c.v, dt);
    const h = c.s / 2;
    if (c.p.y - h < c.fl) {
      if (c.v.y < -.5) { const g = c.floor(c.p.x, c.p.z, c.fl + .05); if (g < c.fl - .05) c.fl = g; } // off an edge: on down
      if (c.p.y - h < c.fl) { c.p.y = c.fl + h; c.v.y = c.v.y < -1.2 ? -c.v.y * .32 : 0; c.v.x *= .6; c.v.z *= .6; c.w.multiplyScalar(.55); }
    }
    c.q.multiply(_kq.setFromEuler(_ke.set(c.w.x * dt, c.w.y * dt, c.w.z * dt)));
    const im = cubeLayers.get(c.sc)[c.kind]; if (im.count >= CUBE_CAP) continue;
    im.setMatrixAt(im.count, _km.compose(c.p, c.q, _ks.setScalar(c.s * Math.min(1, c.life / .35)))); im.setColorAt(im.count++, c.c);
  }
  for (const L of cubeLayers.values()) for (const kind in L) { const im = L[kind]; im.visible = im.count > 0; if (im.count) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } }
}

// points on a body with their colours, for what it breaks into
const pxCache = new WeakMap(), _kta = new THREE.Vector3(), _ktb = new THREE.Vector3(), _ktc = new THREE.Vector3();
function pxOf(img) {
  if (pxCache.has(img)) return pxCache.get(img);
  let d = null;
  try {
    let c = img; if (!c.getContext) { c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); }
    d = { w: c.width, h: c.height, px: c.getContext('2d').getImageData(0, 0, c.width, c.height).data };
  } catch {}
  pxCache.set(img, d); return d;
}
const triCache = new WeakMap(); // each geometry's triangles, their areas added up
function triAreas(G) {
  let c = triCache.get(G); if (c) return c;
  const P = G.attributes.position, I = G.index, n = (I ? I.count : P.count) / 3 | 0, cum = new Float32Array(n);
  let sum = 0;
  for (let t = 0; t < n; t++) {
    const i0 = I ? I.getX(t * 3) : t * 3, i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1, i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
    _kta.fromBufferAttribute(P, i0); _ktb.fromBufferAttribute(P, i1).sub(_kta); _ktc.fromBufferAttribute(P, i2).sub(_kta);
    cum[t] = sum += _ktb.cross(_ktc).length() / 2;
  }
  triCache.set(G, c = { cum, sum }); return c;
}
function bodyPoints(b, n) {
  const ms = []; let sum = 0;
  b.g.updateMatrixWorld(true);
  b.g.traverseVisible(o => { if (o.isMesh && b.mats.includes(o.material)) { const a = triAreas(o.geometry).sum * o.matrixWorld.getMaxScaleOnAxis() ** 2; if (a > 0) ms.push([sum += a, o]); } });
  const out = [];
  const find = (a, r, at) => { let lo = 0, hi = a.length - 1; while (lo < hi) { const m = lo + hi >> 1; if (at(m) < r) lo = m + 1; else hi = m; } return lo; };
  for (let tries = 0; out.length < n && ms.length && tries < n * 4; tries++) {
    const o = ms[find(ms, Math.random() * sum, m => ms[m][0])][1], G = o.geometry, T = triAreas(G), t = find(T.cum, Math.random() * T.sum, m => T.cum[m]);
    const I = G.index, i0 = I ? I.getX(t * 3) : t * 3, i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1, i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
    const P = G.attributes.position, C = G.attributes.color, UV = G.attributes.uv;
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v, c = new THREE.Color();
    if (C) { c.fromBufferAttribute(C, i0); if (c.r + c.g + c.b < .03) continue; } // not the outline
    else {
      const map = o.material.map, d = map?.image && UV && pxOf(map.image);
      if (!d) c.setRGB(.6, .6, .6);
      else {
        const su = UV.getX(i0) * w + UV.getX(i1) * u + UV.getX(i2) * v, sv = UV.getY(i0) * w + UV.getY(i1) * u + UV.getY(i2) * v;
        const x = Math.min(d.w - 1, Math.max(0, su * d.w | 0)), y = Math.min(d.h - 1, Math.max(0, (map.flipY ? 1 - sv : sv) * d.h | 0)), j = (y * d.w + x) * 4;
        if (d.px[j + 3] < 128) continue;
        c.setRGB(d.px[j] / 255, d.px[j + 1] / 255, d.px[j + 2] / 255, THREE.SRGBColorSpace);
      }
    }
    const p = new THREE.Vector3().fromBufferAttribute(P, i0).multiplyScalar(w).addScaledVector(_kta.fromBufferAttribute(P, i1), u).addScaledVector(_ktb.fromBufferAttribute(P, i2), v).applyMatrix4(o.matrixWorld);
    out.push([p, c]);
  }
  return out;
}
// the body bursts into cubes of its own colours
function bodyCubes(b, k, n, speed, lift, kind = 'solid', tint = null) {
  const mid = _kv2.set(k.pos.x, k.y0 + 1, k.pos.z).clone();
  for (const [p, c] of bodyPoints(b, n)) {
    const v = p.clone().sub(mid); v.y = 0; v.normalize().multiplyScalar(speed * (.4 + Math.random() * .8)); v.y = lift * (.5 + Math.random() * .8);
    if (tint) c.lerp(tint, .5);
    addCube(k, kind, p, v, k.u * (2.1 + Math.random() * 1.5), c, 1.3 + Math.random() * 1.1);
  }
}

// voxel models: the tombstone, the chicken and the armory's pictures
const vb = (x0, y0, z0, x1, y1, z1, k) => [x1 - x0, y1 - y0, z1 - z0, k, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
// pieces from rows of letters, top row first (pal: letter -> colour), d deep from z0
function artPieces(rows, pal, d = 2, z0 = -1, y0 = 0) {
  const out = [], h = rows.length;
  rows.forEach((row, r) => {
    const y = y0 + h - 1 - r, x0 = -(row.length >> 1);
    for (let x = 0; x < row.length;) {
      const ch = row[x]; if (!pal[ch]) { x++; continue; }
      let e = x; while (row[e] === ch) e++;
      out.push(vb(x0 + x, y, z0, x0 + e, y + 1, z0 + d, pal[ch])); x = e;
    }
  });
  return out;
}
const fine = (pieces, k = 2) => pieces.map(([w, h, d, m, x, y, z]) => [w * k, h * k, d * k, m, x * k, y * k, z * k]); // twice the cells: a thinner outline
const voxMesh = (g, geos) => { for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow]]) if (geo) { const o = new THREE.Mesh(geo, mat); o.userData.shared = true; g.add(o); } return g; };
const kGeo = {};
function tombPieces(mound = true) {
  const S = palIdx(0x8e9199), D = palIdx(0x4c4f57), P = palIdx(0x6d7078), M = palIdx(0x5d8a3c), E = palIdx(0x6e4b2f), E2 = palIdx(0x84603e);
  const out = [vb(-5, 1, -2, 5, 12, 0, S), vb(-4, 12, -2, 4, 13, 1, S), vb(-2, 13, -2, 2, 14, 1, S), vb(-6, 0, -3, 6, 1, 2, P)]; // the stone on its plinth, a rounded top
  for (const [x0, y0, x1, y1] of [[-5, 1, -3, 12], [3, 1, 5, 12], [-3, 1, 3, 3], [-3, 11, 3, 12], [-3, 3, -1, 7], [1, 3, 3, 7], [-3, 9, -1, 11], [1, 9, 3, 11]]) out.push(vb(x0, y0, 0, x1, y1, 1, S)); // its face, round the cross
  out.push(vb(-1, 3, -1, 1, 11, 0, D), vb(-3, 7, -1, 3, 9, 0, D)); // the cross cut into it
  out.push(vb(3, 11, -2, 5, 12, 1, M), vb(-5, 1, -2, -3, 2, 1, M)); // moss
  if (mound) out.push(vb(-4, 0, 2, 4, 1, 15, E), vb(-3, 1, 3, 3, 2, 14, E2)); // the grave
  return out;
}
const CHICK_PX = .044;
function chickPieces() {
  const W = palIdx(0xf4f1ea), W2 = palIdx(0xd8d2c6), R = palIdx(0xe0302a), K = palIdx(0x1a1a1a), O = palIdx(0xf0a020);
  return [vb(-3, 4, -4, 3, 9, 4, W), vb(-2, 3, -3, 2, 4, 3, W), vb(-2, 7, -6, 2, 11, -4, W), vb(-1, 11, -6, 1, 12, -5, W2), // body and tail
    vb(-4, 5, -3, -3, 8, 3, W2), vb(3, 5, -3, 4, 8, 3, W2), vb(-2, 9, 0, 2, 14, 4, W), // wings and head
    vb(-1, 14, 0, 1, 15, 4, R), vb(-1, 15, 1, 1, 16, 3, R), vb(-1, 11, 4, 1, 12, 6, O), vb(-1, 9, 4, 1, 11, 5, R), vb(-2, 12, 2, -1, 13, 3, K), vb(1, 12, 2, 2, 13, 3, K)]; // comb, beak, wattle, eyes
}
const chickLeg = () => [vb(0, -3, 0, 1, 0, 1, palIdx(0xf0a020)), vb(-1, -4, 0, 2, -3, 2, palIdx(0xf0a020))];
function chickModel(g) {
  voxMesh(g, kGeo.chick ??= voxelGeos(fine(chickPieces()), CHICK_PX / 2));
  const legs = [-2, 1].map(x => { const l = voxMesh(new THREE.Group(), kGeo.leg ??= voxelGeos(fine(chickLeg()), CHICK_PX / 2)); l.position.set(x * CHICK_PX, 4 * CHICK_PX, 0); g.add(l); return l; });
  return legs;
}
// the armory's pictures
const PIC_ART = {
  '': () => { const W = palIdx(0xffffff), G = palIdx(0xffe27a, true), wing = ['WWWWWWW.', '.WWWWWWW', '..WWWWWW', '....WWWW', '......WW'];
    const out = artPieces(wing.map(r => r + '..' + [...r].reverse().join('')), { W }, 2, 0);
    for (let x = -6; x < 6; x++) for (let z = -6; z < 6; z++) { const d = Math.hypot(x + .5, z + .5); if (d > 3.4 && d < 5.6) out.push(vb(x, 8, z, x + 1, 9, z + 1, G)); } // the halo
    return out; },
  ghost: () => artPieces(['....WWWW....', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WWKKWWKKWW.', 'WWWKKWWKKWWW', 'WWWWWWWWWWWW', 'WWWWWKKWWWWW', 'WWWWWKKWWWWW', 'WWWWWWWWWWWW', 'WWWWWWWWWWWW', 'WWW.WWWW.WWW', '.W...WW...W.'],
    { W: palIdx(0xeaf6ff), K: palIdx(0x2a2a3a) }, 6, -3),
  tombstone: () => tombPieces(),
  snowman: () => snowmanPieces(), present: () => [...presentPieces(), ...presentLid().map(([w, h, d, m, x, y, z]) => [w, h, d, m, x + 3, y + 3, z])],
  shatter: () => { const [S, B, P, H, L, W] = [0xf0c8a0, 0x3a6ad8, 0x3a3a4e, 0x7a4a2a, 0x6fb8ff, 0xe8e8e8].map(c => palIdx(c));
    return [[-6, 4, -2, H], [-1, 6, 1, S], [3, 3, -1, B], [-5, -2, 1, B], [0, 0, -2, L], [4, -3, 2, P], [-3, -7, -1, P], [2, -8, 0, W], [-8, 8, 2, S], [7, 7, -2, H], [8, -8, 1, L]]
      .map(([x, y, z, c], i) => vb(x - (i < 8 ? 2 : 1), y - (i < 8 ? 2 : 1), z - (i < 8 ? 2 : 1), x + 2, y + 2, z + 2, c)); },
  frozen: () => { const I = palIdx(0xa8e0f8), T = palIdx(0xe4f8ff), S = palIdx(0xf6fdff, true), D = palIdx(0x7cc4e8);
    const out = [vb(-5, 0, -4, 5, 13, 4, I), vb(-5, 12, -4, 5, 13, 4, T), vb(-5, 0, -4, -4, 13, 4, D)];
    for (let k = 0; k < 4; k++) out.push(vb(-3 + k, 7 + k, 3, -2 + k, 8 + k, 4, S), vb(k, 2 + k, 3, 1 + k, 3 + k, 4, S)); // a glint across its face
    return out; },
  fireworks: () => { const cs = [0xff4a6a, 0xffd04a, 0x4ad8ff, 0x7aff6a].map(c => palIdx(c, true)), out = [vb(-1, -1, -1, 1, 1, 1, palIdx(0xffffff, true))];
    for (let a = 0; a < 8; a++) for (const [r, s] of [[3, 2], [5, 2], [7, 1]]) { const x = Math.round(Math.cos(a * Math.PI / 4) * r), y = Math.round(Math.sin(a * Math.PI / 4) * r); out.push(vb(x - s / 2 | 0, y - s / 2 | 0, -1, (x - s / 2 | 0) + s, (y - s / 2 | 0) + s, 1, cs[(a + r) % 4])); }
    return out; },
  lightning: () => artPieces(['.....YYYYY', '....YYYYY.', '...YYYYY..', '..YYYYY...', '.YYYYYYYYY', '.....YYYY.', '....YYYY..', '...YYYY...', '...YYY....', '..YYY.....', '..YY......', '.YY.......', '.Y........'], { Y: palIdx(0xffe14a, true) }, 2, -1),
  confetti: () => { const G = palIdx(0xffc830), P = palIdx(0xff4a8a), out = [], cs = [0xff3a5a, 0x30c8ff, 0x5aff4a, 0xffc830, 0xff5ad0, 0xa060ff, 0xff7a2a].map(c => palIdx(c));
    for (let y = 0; y < 11; y++) { const rr = .8 + y * .42; for (let x = -6; x < 6; x++) for (let z = -6; z < 6; z++) if (Math.hypot(x + .5, z + .5) < rr) out.push(vb(x, y - 11, z, x + 1, y - 10, z + 1, y % 4 === 3 ? P : G)); } // the popper
    [[-2, 1, 0], [2, 3, 1], [-6, 4, -1], [5, 6, 0], [-1, 7, 0], [-8, 9, 1], [3, 11, -1], [8, 11, 0], [-4, 12, 0], [0, 15, 1], [-9, 15, 0], [6, 16, -1]]
      .forEach(([x, y, z], i) => out.push(vb(x, y, z, x + (i & 1 ? 2 : 3), y + (i & 1 ? 3 : 2), z + 2, cs[i % 7]))); // confetti flying out
    return out; },
  blackhole: () => { const K = palIdx(0x140c1c), E = palIdx(0x4a2a7a), out = [];
    for (let x = -5; x < 5; x++) for (let y = -5; y < 5; y++) for (let z = -5; z < 5; z++) { const r = Math.hypot(x + .5, y + .5, z + .5); if (r < 4.6) out.push(vb(x, y, z, x + 1, y + 1, z + 1, r > 3.8 ? E : K)); }
    for (let x = -9; x < 9; x++) for (let z = -9; z < 9; z++) { const r = Math.hypot(x + .5, z + .5); if (r > 5.6 && r < 8.8) out.push(vb(x, 0, z, x + 1, 1, z + 1, palIdx((x + z) & 2 ? 0xc07aff : 0xff7ad8, true))); }
    return out; },
};
function kfxModel(id, g) {
  if (id === 'chicken') { chickModel(g); return; }
  voxMesh(g, kGeo['pic' + id] ??= voxelGeos(fine(PIC_ART[id]()), 1 / 32));
}
const kfxPic = id => modelPic('kfx:' + id, g => kfxModel(id, g), { yaw: id === 'chicken' || id === 'tombstone' ? .7 : .45, tilt: id ? .3 : .55, w: 200, h: 180 });

// ---- deaths
const KFX = {};
// a body that just died: the killer's effect, or angels
function killFx(b, id) {
  const E = KFX[id];
  if (!E) { angel(b); return; }
  if (b.gunM) b.gunM.visible = false;
  const p = b.g.position, s0 = b.g.scale.x;
  const k = b.kfx = { E, sc: b.sc ?? scene, lobby: !!b.lobby, mute: !!b.show, s0, u: BOT_U * s0, pos: p.clone(), y0: p.y, yaw: b.g.rotation.y, last: 0, mats: [], ms: [],
    floor: b.floorAt ?? ((x, z, y) => groundAt(x, z, .05, y)) };
  b.g.rotation.x = b.g.rotation.z = 0;
  if (b.aim) { b.aim.rotation.set(0, 0, 0); b.aim.position.z = 0; b.aim.children.forEach(a => { if (a !== b.gunM) a.rotation.set(0, 0, 0); }); }
  b.pivR.rotation.set(0, 0, -LEG_SPREAD); b.pivL.rotation.set(0, 0, LEG_SPREAD); b.headPiv.rotation.set(0, 0, 0);
  E.start(b, k);
}
function kfxTick(b, t) { const k = b.kfx, dt = Math.max(0, t - k.last); k.last = t; k.E.tick(b, k, t, dt); }
function kfxGone(b) {
  const k = b.kfx; b.kfx = null;
  k.E.gone?.(b, k);
  for (const m of k.ms) m.parent?.remove(m);
  k.mats.forEach(m => m.dispose());
  const bm = beams.get(b); if (bm) { scene.remove(bm.g); beams.delete(b); }
}
// once a frame, in matches and the lobby
function kfxFrame(dt) {
  for (let i = kfxLive.length - 1; i >= 0; i--) { const o = kfxLive[i]; if (o.tick(dt)) { o.end(); kfxLive.splice(i, 1); } }
  cubeTick(dt); kfxShowTick(dt);
}
// a new match: nothing left lying about
function kfxClear(sc) {
  for (let i = kfxLive.length - 1; i >= 0; i--) if (kfxLive[i].sc === sc) { kfxLive[i].end(); kfxLive.splice(i, 1); }
  for (let i = kCubes.length - 1; i >= 0; i--) if (kCubes[i].sc === sc) kCubes.splice(i, 1);
}
const ease = f => f * f * (3 - 2 * f), clamp01 = f => Math.max(0, Math.min(1, f));

// ghost: pale and see-through, arms out, swaying up and away
KFX.ghost = {
  start(b, k) {
    for (const m of b.mats) { m.transparent = true; m.opacity = .55; m.depthWrite = false; m.color.setHex(0xcfeeff); m.emissive.setHex(0x4a7f99); m.needsUpdate = true; }
    b.armR.rotation.x = b.armL.rotation.x = -1.35;
    b.pivR.rotation.set(.4, 0, -.03); b.pivL.rotation.set(.4, 0, .03); b.headPiv.rotation.x = .12;
    k.side = Math.random() < .5 ? 1 : -1; k.puff = 0;
    kSnd(b, k, 'kfx_ghost');
  },
  tick(b, k, t, dt) {
    const g = b.g, sw = Math.sin(t * 3.4) * .22 * k.side;
    g.position.set(k.pos.x + Math.cos(k.yaw) * sw, k.y0 + t * .95 + Math.min(t, .3) * .5, k.pos.z - Math.sin(k.yaw) * sw);
    g.rotation.x = .14; g.rotation.z = -Math.sin(t * 3.4) * .1 * k.side;
    b.pivR.scale.y = b.pivL.scale.y = Math.max(.35, 1 - t * .5); // the legs thin into a tail
    b.armR.rotation.z = Math.sin(t * 5) * .1; b.armL.rotation.z = -Math.sin(t * 5 + 1) * .1;
    const o = .55 * clamp01((DIE_T - t) / .6);
    for (const m of b.mats) m.opacity = o;
    for (k.puff -= dt; k.puff < 0; k.puff += .06) { _kv.set(0, .35, 0); b.pivR.localToWorld(_kv); fxBit(kPick(GHOST_MATS), k.sc, _kv, .2 * o / .55, new THREE.Vector3((Math.random() - .5) * .3, -.4, (Math.random() - .5) * .3), .5, 0); }
  },
  gone(b) { b.pivR.scale.y = b.pivL.scale.y = 1; },
};
// shatter: a pile of their own blocks
KFX.shatter = {
  start(b, k) {
    bodyCubes(b, k, 46, 2, 3.2);
    b.g.visible = false;
    kBits(TI_MATS, k.sc, _kv.set(k.pos.x, k.y0 + 1, k.pos.z), 8, 4, .5, .35, .14);
    kSnd(b, k, 'kfx_shatter');
  },
  tick() {},
};
// frozen: an ice block grows round them, then it all smashes
const ICE_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'), col = (r, gr, b) => `rgb(${r | 0},${gr | 0},${b | 0})`;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = Math.random() * 18 + (Math.sin(x * .9 + y * .4) + 1) * 6; g.fillStyle = col(150 + n, 208 + n * .6, 238 + n * .3); g.fillRect(x, y, 1, 1); }
  g.fillStyle = '#7bbde4'; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.random() < .05) g.fillRect(x, y, 1, 1); // bubbles
  g.fillStyle = '#f2fcff'; for (const [x0, y0, n] of [[3, 2, 5], [5, 2, 2], [9, 8, 4], [11, 8, 2]]) for (let i = 0; i < n; i++) g.fillRect(x0 + i, y0 + i, 1, 1); // glints
  g.fillStyle = '#e4f7ff'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillStyle = '#6fb2dc'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); // each block's edge
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
CUBE_MATS.ice.map = ICE_TEX;
const ICE_TILE = 13, ICE_MAT = new THREE.MeshLambertMaterial({ map: ICE_TEX, transparent: true, opacity: .68, emissive: 0x1a4058, depthWrite: false });
// one row of the block, two blocks wide, its texture a block a tile; no faces where rows meet
const ICE_ROW = (() => {
  const geo = new THREE.BoxGeometry(2 * ICE_TILE * BOT_U, ICE_TILE * BOT_U, ICE_TILE * BOT_U), uv = geo.attributes.uv;
  [[1, 1], [1, 1], [2, 1], [2, 1], [2, 1], [2, 1]].forEach(([su, sv], f) => { for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); });
  ICE_TEX.wrapS = ICE_TEX.wrapT = THREE.RepeatWrapping; return geo;
})();
const ICE_ROW_MATS = [[ICE_MAT, ICE_MAT, null, null, ICE_MAT, ICE_MAT], [ICE_MAT, ICE_MAT, ICE_MAT, null, ICE_MAT, ICE_MAT]];
const ICE_COLS = [0xdaf6ff, 0xa8e0ff, 0xffffff, 0x7cc8f0].map(c => new THREE.Color(c)), ICY = new THREE.Color(0xbfe8ff);
KFX.frozen = {
  start(b, k) {
    for (const m of b.mats) { m.color.setHex(0xa8dcff); m.emissive.setHex(0x1d4a66); m.needsUpdate = true; }
    b.armR.rotation.set(-.3, 0, -.25); b.armL.rotation.set(-.2, 0, .3); b.headPiv.rotation.set(-.15, .25, 0); b.pivR.rotation.x = -.2;
    const ice = new THREE.Group(), rows = [0, 1, 2].map(i => { const m = new THREE.Mesh(ICE_ROW, ICE_ROW_MATS[i === 2 ? 1 : 0]); m.position.y = (i + .5) * ICE_TILE * BOT_U; m.scale.setScalar(.01); ice.add(m); return m; });
    b.g.add(ice);
    Object.assign(k, { ice, rows, frost: 0, cracked: false }); k.ms.push(ice);
    kSnd(b, k, 'kfx_frozen');
  },
  tick(b, k, t, dt) {
    if (k.cracked) return;
    k.rows.forEach((m, i) => { const f = clamp01((t - i * .08) / .12); m.scale.setScalar(Math.max(.01, f < 1 ? ease(f) * (1 + Math.sin(f * Math.PI) * .1) : 1)); }); // a row at a time, from the feet up
    b.g.rotation.z = t > .7 ? Math.sin(t * 80) * .012 * (t - .7) * 4 : 0; // a shiver before it goes
    for (k.frost -= dt; k.frost < 0; k.frost += .07) fxBit(kPick(ICE_MATS), k.sc, _kv.set(k.pos.x + (Math.random() - .5) * .9, k.y0 + Math.random() * 2 * clamp01(t / .3), k.pos.z + (Math.random() - .5) * .9), .12, new THREE.Vector3(0, .3, 0), .4, 0);
    if (t < .95) return;
    k.cracked = true;
    bodyCubes(b, k, 14, 2.6, 3, 'solid', ICY);
    b.g.visible = false;
    for (let i = fxN(26); i > 0; i--) {
      const p = new THREE.Vector3(k.pos.x + (Math.random() - .5) * 26 * k.u, k.y0 + Math.random() * 39 * k.u, k.pos.z + (Math.random() - .5) * 13 * k.u), v = p.clone().sub(_kv.set(k.pos.x, k.y0 + 1, k.pos.z));
      v.y = 0; v.normalize().multiplyScalar(1.5 + Math.random() * 3); v.y = 1 + Math.random() * 3.5;
      addCube(k, 'ice', p, v, k.u * (1.6 + Math.random() * 2.4), kPick(ICE_COLS), 1.2 + Math.random() * .8);
    }
    kBits(ICE_MATS, k.sc, _kv.set(k.pos.x, k.y0 + 1.1, k.pos.z), 16, 5, 1, .5, .16, 4);
  },
};
// tombstone: flat on their back, into the ground, and up comes a headstone
KFX.tombstone = {
  start(b, k) {
    b.armR.rotation.z = -.5; b.armL.rotation.z = .5;
    Object.assign(k, { dust: 0, landed: false, stone: false });
    kSnd(b, k, 'kfx_tomb');
  },
  tick(b, k, t, dt) {
    const f = clamp01(t / .32), sink = ease(clamp01((t - .5) / .8)), g = b.g;
    g.rotation.x = -f * f * Math.PI / 2;
    g.position.y = k.y0 + f * 2.5 * k.u - sink * 1.2 * k.u;
    g.scale.z = k.s0 * Math.max(.02, 1 - sink);
    const back = _kv2.set(-Math.sin(k.yaw), 0, -Math.cos(k.yaw));
    if (f >= 1 && !k.landed) { k.landed = true; for (let i = 0; i < 5; i++) kBits(DUST_MATS, k.sc, _kv.copy(k.pos).addScaledVector(back, i * .4).setY(k.y0 + .1), 2, 1.2, .3, .6, .25); }
    if (t > .5 && t < 1.3) for (k.dust -= dt; k.dust < 0; k.dust += .08) fxBit(kPick(DUST_MATS), k.sc, _kv.copy(k.pos).addScaledVector(back, Math.random() * 1.6).setY(k.y0 + .05), .24, new THREE.Vector3((Math.random() - .5) * .8, .6, (Math.random() - .5) * .8), .5, 0);
    if (t > .55 && !k.stone) { k.stone = true; tombRise(k, back); }
  },
  gone(b, k) { b.g.scale.z = k.s0; },
};
function tombRise(k, back) {
  const g = voxMesh(new THREE.Group(), kGeo.tomb ??= voxelGeos(fine(tombPieces()), BOT_U / 2)), s = k.s0, sc = k.sc;
  const at = k.pos.clone().addScaledVector(back, 1.75 * s); at.y = k.floor(at.x, at.z, k.y0 + .4);
  g.position.copy(at); g.rotation.y = k.yaw + (Math.random() - .5) * .16; g.scale.set(s, .01, s); sc.add(g);
  let t = 0, puff = 0;
  kfxKeep({ sc, tick(dt) {
    t += dt;
    const up = t < .45 ? ease(t / .45) : t < 3.4 ? 1 : 1 - ease(clamp01((t - 3.4) / .5));
    g.scale.y = s * Math.max(.01, up * (t < .45 ? 1 + Math.sin(t / .45 * Math.PI) * .08 : 1));
    g.rotation.z = t < .5 ? Math.sin(t * 30) * .03 * (1 - t / .5) : 0;
    if (t < .45 || t > 3.4) for (puff -= dt; puff < 0; puff += .06) fxBit(kPick(DUST_MATS), sc, _kv.set(at.x + (Math.random() - .5) * .7, at.y + .05, at.z + (Math.random() - .5) * .7), .26, new THREE.Vector3((Math.random() - .5), .7, (Math.random() - .5)), .5, 0);
    return t >= 3.9;
  }, end() { sc.remove(g); } });
}
// a snowman: they're gone in a puff of snow and one stands where they stood, then the snow melts from under what it wore
function snowmanParts() {
  const W = palIdx(0xf6f9fd), S = palIdx(0xdce6f2), K = palIdx(0x1e1e24), R = palIdx(0xc8322c), O = palIdx(0xf08a2a), B = palIdx(0x5e3c26);
  const snow = [vb(-6, 0, -6, 6, 10, 6, W), vb(-6, 0, -6, 6, 2, 6, S), vb(-5, 10, -5, 5, 18, 5, W), vb(-4, 18, -4, 4, 25, 4, W)]; // three balls of snow
  const wear = [ // at: where it sits on the snow (its foot); sx: slides aside as it comes down, lay: tips over, on: comes to rest on the scarf
    { p: [vb(-5, 25, -5, 5, 26, 5, K), vb(-3, 26, -3, 3, 31, 3, K), vb(-3, 26, -3, 3, 28, 3, R)], at: [0, 25, 0], on: 1 }, // a top hat with a red band
    { p: [vb(-3, 21, 3, -1, 23, 4, K), vb(1, 21, 3, 3, 23, 4, K)], at: [0, 21, 4] }, { p: [vb(-1, 19, 4, 1, 21, 8, O)], at: [0, 19, 4] }, // coal eyes, a carrot
    { p: [vb(-1, 15, 4, 1, 17, 5, K)], at: [0, 15, 5], sx: -2 }, { p: [vb(-1, 11, 4, 1, 13, 5, K)], at: [0, 11, 5], sx: 2 }, // buttons
    { p: [vb(-5, 17, -5, 5, 19, 5, R)], at: [0, 17, 0] }, { p: [vb(2, 12, 5, 4, 18, 6, R)], at: [3, 12, 5], lay: 1 }, // a scarf and its tail
    { p: [vb(5, 13, -1, 12, 15, 1, B), vb(10, 15, -1, 12, 18, 1, B)], at: [5, 13, 0] }, { p: [vb(-12, 13, -1, -5, 15, 1, B), vb(-12, 15, -1, -10, 18, 1, B)], at: [-5, 13, 0] }, // stick arms
  ];
  return { snow, wear };
}
const snowmanPieces = () => { const P = snowmanParts(); return [...P.snow, ...P.wear.flatMap(w => w.p)]; };
const SNOWBIT_MATS = puffMats([0xffffff, 0xe6f2ff, 0xcfe6fa]), WEAR_MAT = Object.assign(gunLit.clone(), { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }); // what it wears wins where it lies flush in the snow
KFX.snowman = {
  start(b, k) {
    const at = _kv.set(k.pos.x, k.y0 + .9, k.pos.z);
    kBits(SNOWBIT_MATS, k.sc, at, 18, 2.6, 1.2, .8, .22, 3);
    b.g.visible = false;
    const P = snowmanParts(), G = kGeo.snowman ??= { snow: voxelGeos(fine(P.snow), BOT_U / 2), wear: P.wear.map(w => voxelGeos(fine(w.p.map(([a, h, d, m, x, y, z]) => [a, h, d, m, x - w.at[0], y - w.at[1], z - w.at[2]])), BOT_U / 2).lit) };
    const g = new THREE.Group(), snow = voxMesh(new THREE.Group(), G.snow), s = k.s0, sc = k.sc;
    const wear = G.wear.map(geo => { const o = new THREE.Mesh(geo, WEAR_MAT); o.userData.shared = true; g.add(o); return o; }); // each its own piece: only the snow changes shape
    g.add(snow); g.position.copy(k.pos).setY(k.y0); g.rotation.y = k.yaw; g.scale.setScalar(.01); sc.add(g);
    let t = 0, drip = 0;
    kfxKeep({ sc, tick(dt) {
      t += dt;
      const up = t < .35 ? ease(t / .35) : 1, melt = ease(clamp01((t - 2.3) / 1.2)), w = 1 + melt * .7, f = 1 - melt * .97, left = Math.max(.01, 1 - ease(clamp01((t - 3.55) / .4)));
      g.scale.setScalar(s * Math.max(.01, up * (1 + (t < .35 ? Math.sin(t / .35 * Math.PI) * .12 : 0))));
      g.rotation.z = t > .35 && t < 2.3 ? Math.sin(t * 5) * .03 : 0;
      snow.scale.set(w * left, f, w * left);
      P.wear.forEach((W, i) => {
        const o = wear[i];
        o.position.set((W.at[0] * w + (W.sx || 0) * melt) * BOT_U, (Math.max(W.at[1] * f, W.on ? 17 * f + 2 : 0) + (W.lay ? melt : 0)) * BOT_U, W.at[2] * w * BOT_U);
        o.rotation.x = W.lay ? melt * Math.PI / 2 : 0; o.scale.setScalar(left);
      });
      if (t > 2.3 && t < 3.6) for (drip -= dt; drip < 0; drip += .07) fxBit(kPick(SNOWBIT_MATS), sc, _kv.set(k.pos.x + (Math.random() - .5) * .9, k.y0 + .1 + Math.random() * .5 * (1 - melt), k.pos.z + (Math.random() - .5) * .9), .16, new THREE.Vector3((Math.random() - .5) * .6, .3, (Math.random() - .5) * .6), .5, 2);
      return t >= 3.95;
    }, end() { sc.remove(g); } });
    kSnd(b, k, 'kfx_snowman');
  },
  tick() {},
};
// a present: they're wrapped up in a big gift, it shakes, and off comes the lid in a burst of ribbon
const GIFT_IN = 0x7a1c1a; // the dark inside of the box and its lid (a piece of colour 0 cuts a hole)
function presentPieces() { const R = palIdx(0xc8322c), G = palIdx(0xf0c040), D = palIdx(GIFT_IN); return [vb(-7, 0, -7, 7, 12, 7, R), vb(-1, 0, -7, 1, 12, 7, G), vb(-7, 0, -1, 7, 12, 1, G), vb(-6, 1, -6, 6, 12, 6, D), vb(-5, 2, -5, 5, 12, 5, 0)]; }
function presentLid() { const R = palIdx(0xdc4038), G = palIdx(0xf0c040), D = palIdx(GIFT_IN); return [vb(-8, 12, -8, 8, 15, 8, R), vb(-1, 12, -8, 1, 15, 8, G), vb(-8, 12, -1, 8, 15, 1, G), vb(-5, 15, -1, -1, 19, 1, G), vb(1, 15, -1, 5, 19, 1, G), vb(-1, 15, -1, 1, 17, 1, G), vb(-7, 12, -7, 7, 14, 7, D), vb(-6, 12, -6, 6, 13.5, 6, 0)]; }
KFX.present = {
  start(b, k) {
    const s = k.s0, sc = k.sc, g = new THREE.Group(), boxM = voxMesh(new THREE.Group(), kGeo.present ??= voxelGeos(fine(presentPieces()), BOT_U / 2)), lid = voxMesh(new THREE.Group(), kGeo.presentLid ??= voxelGeos(fine(presentLid()), BOT_U / 2));
    const S0 = s * 1.9, Y0 = 13.5 * BOT_U, pv = new THREE.Group(); pv.position.y = Y0; lid.position.y = -Y0; pv.add(lid); // the lid turns about its own middle
    g.add(boxM, pv); g.position.copy(k.pos).setY(k.y0); g.rotation.y = k.yaw; g.scale.setScalar(.01); sc.add(g);
    const vy = 5.2 / S0, G = 13 / S0, rest = 1.5 * BOT_U, Tf = (vy + Math.sqrt(vy * vy + 2 * G * (Y0 - rest))) / G, far = 2.1 / S0; // up, over and down beside it
    let t = 0, popped = false, lt = 0;
    kfxKeep({ sc, tick(dt) {
      t += dt;
      if (t > .16) b.g.visible = false; // wrapped
      const up = t < .28 ? ease(t / .28) * (1 + Math.sin(t / .28 * Math.PI) * .15) : t < 2.6 ? 1 : 1 - ease(clamp01((t - 2.6) / .4));
      g.scale.setScalar(S0 * Math.max(.01, up));
      g.rotation.z = t > .4 && t < 1.25 ? Math.sin(t * 34) * .05 * (t - .4) / .85 : 0;
      if (t >= 1.25 && !popped) {
        popped = true;
        const at = _kv.set(k.pos.x, k.y0 + 1.1 * s, k.pos.z);
        kBits(FW_MATS, sc, at, 26, 3.4, 3.4, 1.2, .2, 5); kBits(SNOWBIT_MATS, sc, at, 8, 2, 1.5, .6, .18, 2); kFlash(sc, 0xffe08a, at, 2.2, .2);
        kSnd(b, k, 'kfx_presentPop');
      }
      if (popped) {
        lt += dt; const q = Math.min(1, lt / Tf), tt = Math.min(lt, Tf), hop = lt > Tf && lt < Tf + .22 ? Math.sin((lt - Tf) / .22 * Math.PI) * .1 / S0 : 0;
        pv.position.set(far * q, Math.max(rest, Y0 + vy * tt - G * tt * tt / 2) + hop, 0); pv.rotation.set(0, q * .7, -q * Math.PI * 2); // once right round, so it lands the right way up
      }
      return t >= 3;
    }, end() { sc.remove(g); } });
    kSnd(b, k, 'kfx_present');
  },
  tick() {},
};
// fireworks: up they go in a trail of sparks and burst in colour
KFX.fireworks = {
  start(b, k) {
    b.armR.rotation.set(-Math.PI, 0, -.2); b.armL.rotation.set(-Math.PI, 0, .2); b.pivR.rotation.x = .15; b.pivL.rotation.x = -.15;
    const cs = FW_MATS.slice().sort(() => Math.random() - .5);
    Object.assign(k, { cs: cs.slice(0, 3), top: k.lobby ? 2.4 : 4.6, spark: 0, boom: false, spin: (Math.random() < .5 ? -1 : 1) * 10 });
    kSnd(b, k, 'kfx_fireworks');
  },
  tick(b, k, t, dt) {
    if (k.boom) return;
    const T = .8, f = clamp01(t / T), g = b.g;
    g.position.y = k.y0 + f * f * k.top; g.rotation.y += k.spin * dt * (.3 + f);
    for (k.spark -= dt; k.spark < 0; k.spark += .018) fxBit(kPick(Math.random() < .6 ? EMBER_MATS : SPARK_MATS), k.sc, g.position, .13, new THREE.Vector3((Math.random() - .5) * .8, -2 - Math.random() * 2, (Math.random() - .5) * .8), .45, 3);
    if (t < T) return;
    k.boom = true;
    const c = new THREE.Vector3(g.position.x, g.position.y + 1, g.position.z);
    bodyCubes(b, k, 10, 3, 2);
    g.visible = false;
    for (const m of k.cs) for (let i = fxN(18); i > 0; i--) fxBit(m, k.sc, c, .34, new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(6.5 + Math.random() * 2), 1.1 + Math.random() * .5, 1.4);
    kBits([k.cs[0]], k.sc, c, 10, 3, 0, .8, .2, 1);
    kFlash(k.sc, 0xfff4e0, c, 4, .3);
    let t2 = 0, n = 0; const sc = k.sc; // glitter popping round where it burst
    kfxKeep({ sc, tick(dt) { t2 += dt; while (n < 14 && t2 > .35 + n * .05) { n++; fxBit(STAR_MATS[1], sc, _kv.copy(c).add(_kv2.set(Math.random() - .5, Math.random() - .7, Math.random() - .5).multiplyScalar(3.4)), .16, new THREE.Vector3(), .18, 0); } return n >= 14; }, end() {} });
  },
};
// black hole: it opens in them, pulls them in spinning and snaps shut
const HOLE_GEO = pxSphere(1), DISC_GEO = pxTorus(1, .1);
KFX.blackhole = {
  start(b, k) {
    const c = new THREE.Vector3(k.pos.x, k.y0 + 17 * k.u, k.pos.z), g = new THREE.Group();
    const core = new THREE.MeshBasicMaterial({ color: 0x050208, fog: false }), ring = new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), ring2 = ring.clone(); ring2.color.setHex(0xff7ad8);
    const ball = new THREE.Mesh(HOLE_GEO, core), d1 = new THREE.Mesh(DISC_GEO, ring), d2 = new THREE.Mesh(DISC_GEO, ring2);
    d1.scale.setScalar(1.7); d2.scale.setScalar(2.3); d1.rotation.x = d2.rotation.x = Math.PI / 2 - .35; d2.rotation.y = .3;
    const glow = glowSprite(g, 0x8a3aff, _kv.set(0, 0, 0), 5); glow.material.opacity = .7;
    g.add(ball, d1, d2); g.position.copy(c); g.scale.setScalar(.01); k.sc.add(g);
    Object.assign(k, { c, g, d1, d2, glow, swirl: 0, pop: false });
    k.mats.push(core, ring, ring2, glow.material); k.ms.push(g);
    kSnd(b, k, 'kfx_blackhole');
  },
  tick(b, k, t, dt) {
    if (k.pop) return;
    const open = ease(clamp01(t / .3)), shut = t > 1.1 ? clamp01((t - 1.1) / .12) : 0, pull = ease(clamp01((t - .15) / .9)), u = k.u / BOT_U;
    k.g.scale.setScalar(Math.max(.01, .32 * u * open * (1 - shut) * (1 + Math.sin(t * 40) * .04)));
    k.d1.rotation.z += dt * 7; k.d2.rotation.z -= dt * 5; k.g.rotation.y += dt * 2;
    const s = Math.max(.002, 1 - pull), g = b.g;
    g.scale.set(k.s0 * s * (1 - pull * .35), k.s0 * s * (1 + pull * .6), k.s0 * s * (1 - pull * .35));
    g.rotation.y += dt * (1 + pull * 24); g.rotation.x = pull * .5;
    g.position.set(k.c.x, k.c.y - 17 * BOT_U * g.scale.y, k.c.z);
    for (k.swirl -= dt; k.swirl < 0 && t < 1.05; k.swirl += .03) { // bits spiral in
      const a = Math.random() * 6.28, r = 1.3 + Math.random() * .5, p = _kv.set(k.c.x + Math.cos(a) * r, k.c.y + (Math.random() - .5) * .8, k.c.z + Math.sin(a) * r), hole = k.c;
      const bit = fxBit(kPick(VOID_MATS), k.sc, p, .14, new THREE.Vector3(-Math.sin(a) * 3, 0, Math.cos(a) * 3), .9, 0);
      bit.tick = (q, d) => { q.v.addScaledVector(_kv2.subVectors(hole, q.p), d * 16); if (q.p.distanceToSquared(hole) < .02) q.life = 0; };
    }
    if (t < 1.22) return;
    k.pop = true; g.visible = false; k.g.visible = false;
    kFlash(k.sc, 0xd8b8ff, k.c, 3, .25);
    for (let i = fxN(20); i > 0; i--) { const a = i / 20 * 6.28; fxBit(kPick(VOID_MATS), k.sc, k.c, .2, new THREE.Vector3(Math.cos(a) * 6, (Math.random() - .5) * 1.5, Math.sin(a) * 6), .5, 0); }
    kBits(STAR_MATS, k.sc, k.c, 6, 3, 0, .4, .14);
  },
  gone(b, k) { b.g.scale.setScalar(k.s0); },
};
// lightning: a bolt from the sky, a flash, scorched black and crumbling to ash
const BOLT_MATS = [new THREE.MeshBasicMaterial({ color: 0x8ac8ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })];
const ASH_COLS = [0x1e1c1a, 0x2e2b28, 0x45403a, 0x5a544c, 0x6e675e].map(c => new THREE.Color(c)), EMBER_COL = new THREE.Color(0xff6a1a);
function strike(sc, from, to) {
  const n = 12, pts = [from.clone()], d = to.clone().sub(from), segs = [];
  for (let i = 1; i < n; i++) { const f = i / n, a = 1.3 * Math.sin(f * Math.PI) + .15, p = from.clone().addScaledVector(d, f); p.x += (Math.random() - .5) * 2 * a; p.z += (Math.random() - .5) * 2 * a; pts.push(p); }
  pts.push(to.clone());
  for (let i = 0; i < n; i++) segs.push([pts[i], pts[i + 1], 1]);
  for (const j of [3, 7]) { let p = pts[j]; for (let s = 0; s < 3; s++) { const q = p.clone().add(new THREE.Vector3((Math.random() - .5) * 1.8, -1 - Math.random(), (Math.random() - .5) * 1.8)); segs.push([p, q, .5]); p = q; } }
  const g = new THREE.Group(), ims = BOLT_MATS.map((m, j) => {
    const im = new THREE.InstancedMesh(KFX_BOX, m, segs.length); im.frustumCulled = false;
    segs.forEach(([a, b, w], i) => { const l = a.distanceTo(b), th = (j ? .06 : .24) * w; _kq.setFromUnitVectors(KZ, _kv2.subVectors(b, a).normalize()); im.setMatrixAt(i, _km.compose(_kv.lerpVectors(a, b, .5), _kq, _ks.set(th, th, l + th))); });
    g.add(im); return im;
  });
  sc.add(g); let t = 0;
  kfxKeep({ sc, tick(dt) { t += dt; g.visible = t < .07 || (t > .11 && t < .3); return t >= .3; }, end() { sc.remove(g); ims.forEach(im => im.dispose()); } });
}
KFX.lightning = {
  start(b, k) {
    const top = new THREE.Vector3(k.pos.x + (Math.random() - .5) * 3, k.y0 + (k.lobby ? 9 : 22), k.pos.z + (Math.random() - .5) * 3);
    strike(k.sc, top, _kv.set(k.pos.x, k.y0 + 34 * k.u, k.pos.z).clone());
    kFlash(k.sc, 0xd8eeff, _kv.set(k.pos.x, k.y0 + 1.2, k.pos.z), 7, .35);
    b.armR.rotation.set(-.3, 0, -.9); b.armL.rotation.set(-.3, 0, .9); b.headPiv.rotation.x = -.35; // a jolt
    for (const m of b.mats) { m.emissive.setHex(0xffffff); m.needsUpdate = true; }
    Object.assign(k, { burnt: false, smoke: 0, ash: false });
    kSnd(b, k, 'kfx_lightning');
  },
  tick(b, k, t, dt) {
    if (k.ash) return;
    if (!k.burnt && t > .1) { k.burnt = true; for (const m of b.mats) { m.color.setHex(0x2a2622); m.emissive.setHex(0); } }
    b.g.rotation.z = t < .5 ? Math.sin(t * 70) * .03 : 0;
    for (k.smoke -= dt; k.smoke < 0; k.smoke += .05) {
      fxBit(kPick(SMOKE_MATS), k.sc, _kv.set(k.pos.x + (Math.random() - .5) * .5, k.y0 + .4 + Math.random() * 1.4, k.pos.z + (Math.random() - .5) * .5), .28, new THREE.Vector3((Math.random() - .5) * .3, 1, (Math.random() - .5) * .3), .7, 0);
      if (Math.random() < .4) fxBit(kPick(EMBER_MATS), k.sc, _kv, .08, new THREE.Vector3((Math.random() - .5), 1.4, (Math.random() - .5)), .5, 0);
    }
    if (t < .8) return;
    k.ash = true;
    for (const [p] of bodyPoints(b, 30)) { const v = new THREE.Vector3((Math.random() - .5) * 1.4, Math.random() * 1.2, (Math.random() - .5) * 1.4); addCube(k, 'solid', p, v, k.u * (1.4 + Math.random() * 1.4), Math.random() < .12 ? EMBER_COL : kPick(ASH_COLS), 1.2 + Math.random() * .8); }
    b.g.visible = false;
    kBits(SMOKE_MATS, k.sc, _kv.set(k.pos.x, k.y0 + .8, k.pos.z), 8, 1.4, .6, .8, .4);
  },
};
// chicken: poof, and a chicken runs for it
KFX.chicken = {
  start(b, k) {
    const at = _kv.set(k.pos.x, k.y0 + .9, k.pos.z);
    kBits(FEATHER_MATS, k.sc, at, 14, 3, 1, 1.1, .16, 2);
    kBits(SMOKE_MATS.slice(1), k.sc, at, 8, 2, .4, .45, .45);
    b.g.visible = false;
    chickenRun(k);
    kSnd(b, k, 'kfx_chicken');
  },
  tick() {},
};
function chickenRun(k) {
  const g = new THREE.Group(), body = new THREE.Group(), s = k.s0, sc = k.sc, pos = k.pos.clone(), seed = Math.random() * 6;
  const legs = chickModel(body); g.add(body); g.scale.setScalar(s); g.position.copy(pos); sc.add(g);
  let t = 0, dir = k.yaw + Math.PI + (Math.random() - .5) * 1.4, vy = 0;
  kfxKeep({ sc, tick(dt) {
    t += dt;
    if (t < 2.6) {
      if (k.lobby) { const a = seed + t * 2.8, R = .6 * Math.min(1, t / .3); pos.x = k.pos.x + Math.sin(a) * R; pos.z = k.pos.z + Math.cos(a) * R; dir = a + Math.PI / 2; } // round and round the stand
      else {
        dir += Math.sin(t * 2.3 + seed) * 1.6 * dt;
        const v = 3.4 * Math.min(1, t * 6), grounded = vy === 0;
        if (!walkTo(pos, pos.x + Math.sin(dir) * v * dt, pos.z + Math.cos(dir) * v * dt, .15, grounded)) dir += Math.PI * (.6 + Math.random() * .8); // a wall: turn round
        const gy = groundAt(pos.x, pos.z, .15, pos.y);
        if (pos.y > gy + .01) { vy -= 20 * dt; pos.y = Math.max(gy, pos.y + vy * dt); if (pos.y === gy) vy = 0; } else { pos.y = gy; vy = 0; }
      }
      g.position.copy(pos); g.rotation.y = dir;
      const ph = t * 17; legs[0].rotation.x = Math.sin(ph) * .8; legs[1].rotation.x = -Math.sin(ph) * .8;
      body.position.y = Math.abs(Math.sin(ph)) * .03; body.rotation.x = .12 + Math.sin(ph * 2) * .04;
      return false;
    }
    const at = _kv.copy(g.position).setY(g.position.y + .3);
    kBits(FEATHER_MATS, sc, at, 10, 2.5, 1, 1, .14, 2); kBits(SMOKE_MATS.slice(1), sc, at, 5, 1.5, .4, .4, .35);
    if (!k.mute) k.lobby ? sfx('kfx_poof', { v: .8 }) : sfx('kfx_poof', { at: g.position, far: 40 });
    return true;
  }, end() { sc.remove(g); } });
}
// confetti: a squeeze, a pop, a shower of confetti and their party hat flying off
const CONF_TEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 6; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(1, 2, 4, 2); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; })();
const CONF_MATS = [0xff3a5a, 0xffc830, 0x30c8ff, 0x5aff4a, 0xff5ad0, 0xa060ff, 0xff7a2a].map(c => flatMat(c, CONF_TEX));
function confetti(sc, at, n, cols, up) {
  for (let i = fxN(n); i > 0; i--) {
    const a = Math.random() * 6.28, sp = 1 + Math.random() * 3.2, v = new THREE.Vector3(Math.cos(a) * sp, up * (.5 + Math.random() * .7), Math.sin(a) * sp);
    const q = fxBit(kPick(cols), sc, at, .1 + Math.random() * .05, v, 2.2 + Math.random() * 1.3, 1.5), k0 = q.k, f = 7 + Math.random() * 6, ph = Math.random() * 6, sw = 1.8 + Math.random() * 2.4;
    let t = 0; q.spin = (Math.random() - .5) * 8;
    q.tick = (b, d) => { t += d; b.k = k0 * (.3 + .7 * Math.abs(Math.cos(t * f + ph))); b.v.x += Math.cos(t * 3 + ph) * sw * d; b.v.z += Math.sin(t * 2.6 + ph) * sw * d; }; // flutters and flips as it falls
  }
}
const PHAT_PX = .034, PHAT_H = 12;
function partyHatPieces() {
  const cs = [palIdx(0xff4a8a), palIdx(0xffd04a)], out = [];
  for (let y = 0; y < 10; y++) { const rr = 4.3 * (1 - y / 10.5); for (let x = -5; x < 5; x++) for (let z = -5; z < 5; z++) if (Math.hypot(x + .5, z + .5) < rr + .3) out.push(vb(x, y, z, x + 1, y + 1, z + 1, cs[y === 2 || y === 3 || y === 6 ? 1 : 0])); }
  out.push(vb(-1, 10, -1, 1, 12, 1, palIdx(0xffffff))); // the pom-pom
  return out;
}
KFX.confetti = {
  start(b, k) {
    Object.assign(k, { cols: CONF_MATS.slice().sort(() => Math.random() - .5).slice(0, 4), pop: false });
    kSnd(b, k, 'kfx_confetti');
  },
  tick(b, k, t) {
    if (k.pop) return;
    const f = clamp01(t / .16), g = b.g; // squeezed like a balloon about to go
    g.scale.set(k.s0 * (1 + f * .18), k.s0 * (1 - f * .14), k.s0 * (1 + f * .18));
    if (t < .16) return;
    k.pop = true; g.visible = false;
    const at = _kv.set(k.pos.x, k.y0 + 1, k.pos.z);
    confetti(k.sc, at, 80, k.cols, k.lobby ? 4.2 : 6);
    kBits(SMOKE_MATS.slice(2).concat(FEATHER_MATS.slice(0, 1)), k.sc, at, 6, 2, .3, .3, .4);
    kFlash(k.sc, 0xffffff, at, 2.2, .18);
    partyHat(k);
  },
  gone(b, k) { b.g.scale.setScalar(k.s0); },
};
function partyHat(k) {
  const g = new THREE.Group(), hat = voxMesh(new THREE.Group(), kGeo.hat ??= voxelGeos(fine(partyHatPieces()), PHAT_PX / 2)), s = k.s0, sc = k.sc, h = PHAT_H / 2 * PHAT_PX * s;
  hat.position.y = -PHAT_H / 2 * PHAT_PX; g.add(hat); g.scale.setScalar(s); g.rotation.order = 'YXZ';
  const p = new THREE.Vector3(k.pos.x, k.y0 + 34 * k.u, k.pos.z), v = new THREE.Vector3((Math.random() - .5) * 1, k.lobby ? 3 : 4 + Math.random(), (Math.random() - .5) * 1);
  const w = new THREE.Vector3((Math.random() - .5) * 12, (Math.random() - .5) * 6, (Math.random() - .5) * 12);
  g.position.copy(p); sc.add(g);
  let t = 0, down = -1;
  kfxKeep({ sc, tick(dt) {
    t += dt;
    if (down < 0) {
      v.y -= 14 * dt; p.addScaledVector(v, dt);
      g.rotation.x += w.x * dt; g.rotation.y += w.y * dt; g.rotation.z += w.z * dt;
      const fl = k.floor(p.x, p.z, p.y + .3);
      if (p.y - h <= fl && v.y < 0) { p.y = fl + h; if (v.y < -3) { v.y *= -.3; v.x *= .4; v.z *= .4; w.multiplyScalar(.4); } else down = t; } // a bounce, then it settles
      g.position.copy(p);
    } else {
      const f = clamp01((t - down) / .18); g.rotation.x *= 1 - f; g.rotation.z *= 1 - f; // lands upright
      const gone = clamp01((t - down - 1.6) / .3); g.scale.setScalar(s * Math.max(.01, 1 - ease(gone)));
      if (gone >= 1) return true;
    }
    return t > 5;
  }, end() { sc.remove(g); } });
}

// ---- the armory: your character shows it off
let kfxShow = null;
function kfxPlay(id) {
  if (!inLobby || !heroCh) return;
  kfxStop();
  const ch = buildChar(prof.look, BOT_U, true), g = ch.g, s = (1 / 16) / BOT_U;
  dressArmor(ch, heroArmorN); dressBoots(ch, heroBootsB); dressHat(ch, heroHatH);
  g.rotation.order = 'YXZ'; g.position.copy(hero.position); g.rotation.y = hero.rotation.y; g.scale.setScalar(s);
  const aim = new THREE.Group(); aim.position.y = 22 * BOT_U; g.add(aim);
  for (const a of [ch.armR, ch.armL]) { aim.add(a); a.position.y = 0; }
  ch.headPiv.rotation.order = 'YXZ';
  lobbyScene.add(g); hero.visible = false;
  const fy = hero.position.y, b = { g, aim, headPiv: ch.headPiv, armR: ch.armR, armL: ch.armL, pivR: ch.legR, pivL: ch.legL, parts: ch.parts, mats: ch.mats, gunM: null, ch, dead: .0001, sc: lobbyScene, lobby: true, floorAt: () => fy };
  sfx('die', { v: .7 });
  killFx(b, id);
  kfxShow = { b, t: 0, pop: -1 };
}
function kfxDrop(b) { if (b.angel) angelGone(b); else if (b.kfx) kfxGone(b); lobbyScene.remove(b.g); b.ch.dispose(); }
function kfxStop() {
  if (!kfxShow) return;
  if (kfxShow.b) kfxDrop(kfxShow.b);
  kfxClear(lobbyScene); kfxShow = null; hero.visible = true; hero.scale.setScalar(1);
}
function kfxShowTick(dt) {
  const S = kfxShow; if (!S) return;
  if (!inLobby || !armOpen || armPage !== 'wear' || wearCat !== 'kfx') { kfxStop(); return; }
  S.t += dt;
  if (S.b) {
    if (S.b.angel) angelTick(S.b, S.t); else if (S.b.kfx) kfxTick(S.b, S.t);
    if (S.t > DIE_T) { kfxDrop(S.b); S.b = null; }
  } else if (S.pop < 0 && S.t > DIE_T + .3 && !kfxLive.some(o => o.sc === lobbyScene)) { // all done: he pops back
    S.pop = 0; hero.visible = true; kBits(WIND_MATS, lobbyScene, _kv.set(hero.position.x, hero.position.y + 1, hero.position.z), 10, 2, .5, .4, .2);
  }
  if (S.pop >= 0) { S.pop += dt; const f = clamp01(S.pop / .25); hero.scale.setScalar(Math.max(.01, f < 1 ? ease(f) * (1 + Math.sin(f * Math.PI) * .12) : 1)); if (f >= 1) kfxShow = null; }
}
