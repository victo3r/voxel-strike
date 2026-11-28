// swing trails: a breath of air behind a plain blade, a sweep of colour behind the special ones (medium and high graphics)
// a, b: the blade's root and tip in model pixels [y, z]; band: the stretch of a to b it covers; op: how strong; life: how long each bit of it lasts
// cols: from its newest edge to its tail; inner: how strong it is at the root end; edges: thin bright lines across it [where, how strong, how wide], the tip's at 1
const TRAILS = {
  knife: { a: [1.5, -8], b: [2.5, -24], band: [.5, 1.06], op: .45, life: .09, inner: 0, edges: [[1, .35]] },
  balisong: { a: [.5, -3], b: [0, -15], band: [.5, 1.06], op: .42, life: .08, inner: 0, edges: [[1, .35]] },
  herosword: { a: [1, -8], b: [1, -39], band: [.45, 1.04], op: .45, life: .1, inner: 0, edges: [[1, .35]] },
  cutlass: { a: [1, -8], b: [14, -52], band: [.45, 1.04], op: .45, life: .1, inner: 0, cols: [0xffffff, 0xcff8f2], edge: 0xd8fff8, edges: [[1, .4]], bits: 'drops' },
  warhammer: { a: [1, -11], b: [1, -26], band: [.1, 1.08], op: .32, life: .14, inner: .4, edges: [[1, .25, .1]], bits: 'stars' },
  blazesaber: { a: [1, -8], b: [1, -44], band: [.06, 1.03], op: .62, life: .1, inner: .45, cols: [0xff7a1a, 0xff4a12, 0xc8260a, 0x801005], edge: 0xffe8a0, edges: [[1, .9], [.7, .35, .025], [.4, .22, .02]] },
  windsaber: { a: [1, -8], b: [1, -44], band: [.06, 1.04], op: .32, life: .11, inner: .45, cols: [0xeefaff, 0xb8e4ff, 0x8fd0ff], edges: [[1, .85], [.75, .45, .025], [.5, .3, .02], [.25, .2, .02]] },
  tisword: { a: [2, -8], b: [5, -44], band: [.5, 1.03], op: .4, life: .09, inner: 0, cols: [0xdcecff, 0x8fc0ff, 0x4f9dff], edges: [[1, 1, .035]], bits: 'glint' },
  stunwand: { a: [0, -20], b: [0, -33], band: [.3, 1.12], op: .55, life: .1, inner: .15, cols: [0xfff6a0, 0xffd23a, 0xffa020], edge: 0xfffbe0, edges: [[1, 1, .08], [.6, .6, .06]], zap: true, bits: 'sparks' },
  scythe: { win: [.24, .3, .58, .66], a: [0, -24], b: [0, -42, 32], band: [0, 1], op: .5, life: .15, inner: .3, cols: [0xeee8ff, 0xc4b4ff, 0x8a6ee0, 0x4a3290], edge: 0xf6f2ff, edges: [[1, .7], [.55, .25, .03]] },
  candycane: { a: [1, -8], b: [1, -30], band: [.3, 1.05], op: .5, life: .11, inner: .2, cols: [0xffffff, 0xffb4b4, 0xe2403a], edge: 0xfff4f4, edges: [[1, .7], [.55, .3, .03]] },
  monarch: { a: [.5, -2], b: [.5, -16.5], band: [.4, 1.06], op: .5, life: .09, inner: .15, cols: [0xffd88a, 0xf9a23c, 0xf28c1e, 0xb8500a], edge: 0xfff4dc, edges: [[1, .6], [.62, .22, .03]], bits: 'fly' },
};
for (const T of Object.values(TRAILS)) { T.cols = (T.cols || [0xffffff]).map(c => new THREE.Color(c)); T.edge = new THREE.Color(T.edge ?? 0xffffff); }
const DROP_MATS = puffMats([0x9ff4ea, 0xe8fffb, 0x4fe0d0]);
// what flies off a trail: [mats, how many a swing, size, life, gravity, how much of the blade's speed they keep]
const TRAIL_BITS = { drops: [DROP_MATS, 3, .045, .45, 7, .3], stars: [STAR_MATS, 3, .07, .4, 0, .15], sparks: [SPARK_MATS, 4, .045, .2, 2, .4] };
const trailBits = () => gfx.q === 'high' ? 1 : .5;
// one batch per scene (or your view) and blend: every trail in it is one draw call
const TR_CAP = 6144, trLayers = new Map();
const TR_VS = `attribute vec4 tc; varying vec4 vC;
  void main() { vC = tc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const TR_FS = `varying vec4 vC;
  void main() { gl_FragColor = vC;
    #include <colorspace_fragment>
  }`;
function trLayer(sp, add) { // the sweep is laid over what's behind it (so it keeps its colour on a bright sky), the edge adds light
  const k = add ? 'add' : 'over'; let byK = trLayers.get(sp); if (!byK) trLayers.set(sp, byK = {});
  if (byK[k]) return byK[k];
  const g = new THREE.BufferGeometry(), at = (n, s) => { const a = new THREE.BufferAttribute(new Float32Array(TR_CAP * s), s).setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, a); return a; };
  const L = { pos: at('position', 3), tc: at('tc', 4), n: 0 };
  const mat = new THREE.ShaderMaterial({ vertexShader: TR_VS, fragmentShader: TR_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
  L.m = new THREE.Mesh(g, mat); L.m.frustumCulled = false; L.m.userData.shared = true; L.m.renderOrder = 4;
  sp.add(L.m); return byK[k] = L;
}
const trails = new Map(); // a weapon's group: its trail
const trSmooth = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const TRAIL_WIN = [.31, .36, .48, .56]; // a slash's trail fades in and out between these (the scythe's sweep has its own)
const trailE = (s, w = TRAIL_WIN) => s < 0 ? 0 : trSmooth(w[0], w[1], s) * (1 - trSmooth(w[2], w[3], s)); // only the slash itself, not the wind-up or the way back
// each frame a weapon is held: s is how far through its swing (-1 when it isn't), sp what the trail is drawn in (the camera for yours)
const trailAlts = {}, trailAlt = (id, i) => TRAILS[id] && (trailAlts[id] ??= { ...TRAILS[id], cols: TRAILS[id].cols.map(c => new THREE.Color(shotCol(i, 'alt', c.getHex()))), edge: new THREE.Color(shotCol(i, 'alt', TRAILS[id].edge.getHex())) }); // a trail in the colours of the blade's own skin
function bladeTrail(g, w, s, sp, alt = -1) { // alt: the weapon, when it wears its own skin
  const T = alt < 0 ? TRAILS[w.id] : trailAlt(w.id, alt); if (!T || gfx.q === 'low') return;
  let t = trails.get(g);
  if (!t || t.T !== T) trails.set(g, t = { T, pts: [], sp, s: -1, acc: 0, px: GPX * (GUN_SCALE[w.id] || 1), v: null });
  if (s >= 0 && (t.s < 0 || s < t.s)) { const R = Math.random; t.v = { op: .85 + R() * .3, life: .85 + R() * .3, b0: (R() - .5) * .08, ej: T.edges?.map((e, k) => k ? (R() - .5) * .14 : 0), glint: false }; t.acc = 0; t.shedT = null; } // each swing a little different
  t.s = s; t.sp = sp; t.seen = true; t.near = sp.isScene ? 1 : .45; // bits are smaller in your own view, where the blade is right in front of you
}
const _tm = new THREE.Matrix4(), _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), trFree = [];
function trailSample(t, g) {
  const T = t.T, v = t.v, px = t.px, P = t.pts;
  g.updateWorldMatrix(true, false);
  _tm.copy(t.sp.matrixWorld).invert().multiply(g.matrixWorld); // the weapon's frame, in the trail's
  _ta.set((T.a[2] || 0) * px, T.a[0] * px, T.a[1] * px).applyMatrix4(_tm); _tb.set((T.b[2] || 0) * px, T.b[0] * px, T.b[1] * px).applyMatrix4(_tm);
  const last = P[P.length - 1], before = P[P.length - 2], p = before && last.t - before.t < 1 / 120 ? last : trFree.pop() || { i: new THREE.Vector3(), o: new THREE.Vector3() }; // the newest follows the blade, the rest no more than 120 a second
  p.i.lerpVectors(_ta, _tb, T.band[0] + v.b0); p.o.lerpVectors(_ta, _tb, T.band[1]); p.t = fxClock; p.e = trailE(t.s, T.win);
  if (p !== last) P.push(p);
  if (T.bits && p.e > .3) trailShed(t, p, P[P.length - 2]);
}
const _bw = new THREE.Vector3(), _bv = new THREE.Vector3();
function trailShed(t, p, prev) { // bits off the blade as it slashes (sparks, drops, stars)
  const T = t.T, sc = t.sp.isScene ? t.sp : scene, toW = o => t.sp.isScene ? o : t.sp.localToWorld(o);
  if (T.bits === 'fly') { // now and then a little monarch flutters off the end of the slash
    if (t.v.glint || t.s < .46) return; t.v.glint = true; if (Math.random() > .3 * trailBits()) return;
    flyOff(sc, toW(_bw.lerpVectors(p.i, p.o, .55 + Math.random() * .4)), t.near);
    return;
  }
  if (T.bits === 'glint') { // one glint off the edge near the end of the slash
    if (t.v.glint || t.s < .46) return; t.v.glint = true; if (Math.random() > trailBits()) return;
    fxBit(STAR_MATS[1], sc, toW(_bw.lerpVectors(p.i, p.o, .7 + Math.random() * .3)), (.1 + Math.random() * .05) * t.near, new THREE.Vector3(), .22);
    return;
  }
  const [mats, n, sz, life, gr, keep] = TRAIL_BITS[T.bits], dt = prev ? p.t - prev.t : 0;
  t.acc += n * trailBits() * ((p.t - (t.shedT ?? prev?.t ?? p.t)) / .06) * p.e; t.shedT = p.t; // a slash is about .06 s at full strength, at any frame rate
  for (; t.acc >= 1; t.acc--) {
    const f = 1 - Math.random() ** 2 * .75; // mostly toward the tip
    toW(_bw.lerpVectors(p.i, p.o, f));
    _bv.set(0, 0, 0);
    if (prev && dt > 0) { _bv.lerpVectors(prev.i, prev.o, f); toW(_bv); _bv.subVectors(_bw, _bv).multiplyScalar(keep / dt); } // some of the blade's speed
    _bv.x += (Math.random() - .5) * 1.4; _bv.y += (Math.random() - .3) * 1.4; _bv.z += (Math.random() - .5) * 1.4;
    fxBit(mats[Math.random() * mats.length | 0], sc, _bw, sz * t.near * (.7 + Math.random() * .6), _bv.clone(), life * (.8 + Math.random() * .4), gr);
  }
}
// a tiny pixel monarch: its wings in three frames, open to edge on, flapping as it flutters up and away
const FLY_MATS = (() => {
  const W = ['.KKK...KKK.', 'KOOOK.KOOOK', 'KOKOOKOOKOK', 'KOOOOKOOOOK', '.KKOOKOOKK.', '..KOOKOOK..', '.KOOKKKOOK.', '.KWOK.KOWK.', '..KK...KK..'], C = { K: '#1d1712', O: '#f28c1e', W: '#f6f1e4' };
  return [1, .55, .2].map(f => {
    const c = document.createElement('canvas'); c.width = c.height = 11; const g = c.getContext('2d');
    for (let y = 0; y < 9; y++) for (let x = 0; x < 11; x++) { const ch = W[y][Math.round(5 + (x - 5) / f)]; if (C[ch]) { g.fillStyle = C[ch]; g.fillRect(x, y + 1, 1, 1); } }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false, blending: THREE.NormalBlending });
  });
})();
function flyTick(b, dt) { // each beat lifts it a little, and it wanders
  b.ph += dt * 20; const c = Math.abs(Math.cos(b.ph));
  b.mat = FLY_MATS[c > .7 ? 0 : c > .3 ? 1 : 2];
  b.v.y += (1.5 + Math.max(0, Math.sin(b.ph)) * 3) * dt;
  b.v.x += Math.sin(b.ph * .13 + b.seed) * 2.2 * dt; b.v.z += Math.cos(b.ph * .11 + b.seed * 1.7) * 2.2 * dt;
  b.rot = .3 * Math.sin(b.ph * .09 + b.seed);
}
function flyOff(sc, at, near) {
  const b = fxBit(FLY_MATS[0], sc, at, (.07 + Math.random() * .025) * (near < 1 ? .7 : 1), new THREE.Vector3((Math.random() - .5) * .8, .9, (Math.random() - .5) * .8), 1.5 + Math.random() * .5, 0);
  Object.assign(b, { tick: flyTick, spin: 0, rot: 0, ph: Math.random() * 6, seed: Math.random() * 6 });
}
// the ribbon between two blade positions, smoothed with the ones either side (so a slow frame still draws an arc)
const trCR = (a, b, c, d, u, out) => { const u2 = u * u, u3 = u2 * u;
  return out.set(.5 * (2 * b.x + (c.x - a.x) * u + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * u2 + (3 * b.x - a.x - 3 * c.x + d.x) * u3),
    .5 * (2 * b.y + (c.y - a.y) * u + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * u2 + (3 * b.y - a.y - 3 * c.y + d.y) * u3),
    .5 * (2 * b.z + (c.z - a.z) * u + (2 * a.z - 5 * b.z + 4 * c.z - d.z) * u2 + (3 * b.z - a.z - 3 * c.z + d.z) * u3)); };
const _ri = [new THREE.Vector3(), new THREE.Vector3()], _ro = [new THREE.Vector3(), new THREE.Vector3()], _rj = new THREE.Vector3(), _rk = new THREE.Vector3();
const _c0 = new THREE.Color(), _c1 = new THREE.Color(), _e0 = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _e3 = new THREE.Vector3();
function trailBuild(t) {
  const T = t.T, v = t.v, P = t.pts, L = trLayer(t.sp, false), E = T.edges && trLayer(t.sp, true), life = T.life * v.life, op = T.op * v.op, span = T.band[1] - T.band[0] - v.b0;
  const col = (f, c) => { const x = Math.min(.999, Math.max(0, 1 - f)) * (T.cols.length - 1), j = x | 0; return c.copy(T.cols[j]).lerp(T.cols[Math.min(T.cols.length - 1, j + 1)], x - j); };
  const vert = (L, p, c, a) => {
    const n = L.n++; if (T.zap) p = _rj.copy(p).addScaledVector(_rk.set(Math.random() - .5, Math.random() - .5, Math.random() - .5), t.zj);
    L.pos.setXYZ(n, p.x, p.y, p.z); L.tc.setXYZW(n, c.r, c.g, c.b, a);
  };
  const quad = (L, i0, o0, c0, a0, ai0, i1, o1, c1, a1, ai1) => {
    if (L.n + 6 > TR_CAP) return;
    vert(L, i0, c0, ai0); vert(L, o0, c0, a0); vert(L, o1, c1, a1);
    vert(L, i0, c0, ai0); vert(L, o1, c1, a1); vert(L, i1, c1, ai1);
  };
  if (T.zap) t.zj = P[P.length - 1].i.distanceTo(P[P.length - 1].o) * .12; // it crackles
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    if (p1.e <= 0 && p2.e <= 0) continue;
    const sub = Math.max(1, Math.min(4, Math.round((p2.t - p1.t) * 180)));
    for (let k = 0; k < sub; k++) {
      const f = [], e = [];
      for (let h = 0; h < 2; h++) {
        const u = (k + h) / sub, tt = p1.t + (p2.t - p1.t) * u;
        f[h] = Math.max(0, 1 - (fxClock - tt) / life); e[h] = (p1.e + (p2.e - p1.e) * u) * (T.zap ? .55 + Math.random() * .45 : 1);
        trCR(p0.i, p1.i, p2.i, p3.i, u, _ri[h]); trCR(p0.o, p1.o, p2.o, p3.o, u, _ro[h]);
      }
      const a0 = op * e[0] * f[0] ** 1.5, a1 = op * e[1] * f[1] ** 1.5;
      if (a0 > .002 || a1 > .002) quad(L, _ri[0], _ro[0], col(f[0], _c0), a0, a0 * T.inner, _ri[1], _ro[1], col(f[1], _c1), a1, a1 * T.inner);
      if (E) T.edges.forEach(([at, eo, w = .06], n) => { // the bright lines, gone a little sooner
        const b0 = eo * v.op * e[0] * f[0] ** 2.5, b1 = eo * v.op * e[1] * f[1] ** 2.5; if (b0 <= .002 && b1 <= .002) return;
        const k1 = Math.min(1, at + v.ej[n]), k0 = k1 - w / span;
        quad(E, _e0.lerpVectors(_ri[0], _ro[0], k0), _e1.lerpVectors(_ri[0], _ro[0], k1), T.edge, b0, b0 * .3, _e2.lerpVectors(_ri[1], _ro[1], k0), _e3.lerpVectors(_ri[1], _ro[1], k1), T.edge, b1, b1 * .3);
      });
    }
  }
}
// once a frame, just before the picture is drawn: follow every swinging blade and lay its trail down
function trailTick(dt) {
  fxClock += dt;
  for (const byK of trLayers.values()) for (const L of Object.values(byK)) L.n = 0;
  for (const [g, t] of trails) {
    if (t.seen && t.s >= 0) trailSample(t, g);
    const life = t.T.life * (t.v?.life || 1);
    while (t.pts.length && fxClock - t.pts[0].t > life) trFree.push(t.pts.shift());
    if (!t.seen && !t.pts.length) { trails.delete(g); continue; }
    t.seen = false;
    if (t.pts.length > 1) trailBuild(t);
  }
  for (const byK of trLayers.values()) for (const L of Object.values(byK)) {
    L.m.geometry.setDrawRange(0, L.n); L.m.visible = L.n > 0;
    if (L.n) for (const a of [L.pos, L.tc]) { a.clearUpdateRanges(); a.addUpdateRange(0, L.n * a.itemSize); a.needsUpdate = true; }
  }
}
