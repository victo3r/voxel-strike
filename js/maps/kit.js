// what maps made of buildings share: walls with holes, roofs you can stand on, stairs, railings, painted signs, falling snow
const KIT_FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011',
  H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 5: '111100110001110', '.': '000000000000010', '&': '010101010101011',
};
function kitSignTex(text, fg, bg) {
  const w = text.length * 4 + 3, c = document.createElement('canvas'); c.width = w; c.height = 9;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, 9); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 8, w, 1);
  g.fillStyle = fg; [...text].forEach((ch, i) => { const f = KIT_FONT[ch]; if (f) for (let k = 0; k < 15; k++) if (f[k] === '1') g.fillRect(2 + i * 4 + k % 3, 2 + (k / 3 | 0), 1, 1); });
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// strings of lights: bulbs [x, y, z, colour] and the wire's pieces [[x, y, z], [x, y, z]], each one draw
const WIRE_MAT = new THREE.MeshLambertMaterial({ color: 0x1c3024 }), BULB_MAT = new THREE.MeshBasicMaterial(), BULB_COLS = [0xff4a3a, 0xffd23a, 0x4ad86a, 0x4a9aff, 0xff7ae0];
function kitStrings(bulbs, wires) {
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), a = new THREE.Vector3(), b = new THREE.Vector3(), sc = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), c = new THREE.Color();
  const bm = new THREE.InstancedMesh(unit, BULB_MAT, bulbs.length), wm = new THREE.InstancedMesh(unit, WIRE_MAT, wires.length);
  bulbs.forEach(([x, y, z, col], i) => { bm.setMatrixAt(i, M4.compose(a.set(x, y, z), q.identity(), sc.set(.11, .13, .11))); bm.setColorAt(i, c.setHex(col)); });
  wires.forEach(([p, r], i) => { a.set(...p); b.set(...r); const len = a.distanceTo(b); q.setFromUnitVectors(X, sc.copy(b).sub(a).normalize()); wm.setMatrixAt(i, M4.compose(a.add(b).multiplyScalar(.5), q, sc.set(len + .02, .035, .035))); });
  bm.computeBoundingSphere(); wm.computeBoundingSphere(); bm.userData.thin = wm.userData.thin = true; // too slight to hide anyone's outline
  return [bm, wm];
}
const KIT_IRON = surf(lam({ color: 0x2a2c34 }), 'metal'), KIT_RED = surf(lam({ color: 0xc8322c }), 'wood'), KIT_GOLD = surf(lam({ color: 0xe0b040, emissive: 0x4a3408 }), 'metal'), KIT_BLACK = lam({ color: 0x1a1a1e }), KIT_SNOW = surf(lam({ color: 0xe6ecf6 }), 'snow');
const KIT_STAR = lam({ color: 0xfff3d2, emissive: 0xffd58a, emissiveIntensity: .8 }); // a warm pale gold, not yellow
const KIT_STAVES = surf(lam({ map: tex(g => { noise(g, [132, 92, 56], 14); g.fillStyle = 'rgba(40,24,12,.4)'; for (const x of [0, 4, 8, 12]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const KIT_LOGS = surf(lam({ map: tex(g => { noise(g, [112, 80, 52], 18); for (const [x, y] of [[1, 1], [6, 0], [11, 1], [3, 6], [9, 6], [0, 11], [6, 11], [12, 11]]) { g.fillStyle = '#c9a070'; g.fillRect(x, y, 4, 4); g.fillStyle = '#a57c4e'; g.fillRect(x + 1, y + 1, 2, 2); } }) }), 'wood');
const kitDecal = (o, k = -2) => lam({ ...o, polygonOffset: true, polygonOffsetFactor: k, polygonOffsetUnits: k });
// K: the map's own beam, deck (floors and stairs) and roof materials, and T, how thick its walls are
function mapKit(K) {
  const T = K.T ?? .25, pieces = [], icicles = [], ir = seeded(77), bulbs = [], wires = [], doors = [], windows = [];
  // a string of lights from one fixing to the other, sagging in the middle: the wire, and a bulb hanging under it every gap
  function lights(x0, y0, z0, x1, y1, z1, sag = 0, gap = .5) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0, y1 - y0) / gap)), P = k => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * sag, z0 + (z1 - z0) * k];
    for (let i = 0; i < n; i++) { wires.push([P(i / n), P((i + 1) / n)]); const [x, y, z] = P((i + .5) / n); bulbs.push([x, y - .09, z, BULB_COLS[bulbs.length % BULB_COLS.length]]); }
  }
  const piece = (w, h, d, m, x, y, z) => { const b = m.map && m.userData.surf ? tbox(w, h, d, m) : box(w, h, d, m); b.position.set(x, y, z); add(b); pieces.push(b); return b; }; // each gets a hitbox once it's placed and turned
  const tpiece = (w, h, d, m, x, y, z) => { const b = tbox(w, h, d, m); b.position.set(x, y, z); add(b); pieces.push(b); return b; };
  const onWall = b => { pieces.splice(pieces.lastIndexOf(b), 1); return b; }; // trim flat on a wall needs none
  const slab = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);
  const solid = (x0, x1, z0, z1, bot, top, s = 'wood', more) => { const o = { mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot, top, surf: s, ...more }; building.solids.push(o); return o; };
  const flat = (x0, x1, z0, z1, m, y = .012, k = 2) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / k, uv.getY(i) * (z1 - z0) / k); add(p); return p;
  };
  // a wall along ax from lo to hi, across c0 to c1, with holes [middle, width, bottom, top] (a window can sit over a door)
  function wall(ax, c0, c1, lo, hi, bot, top, holes, m) {
    const put = (a, b, y0, y1) => { if (y1 - y0 > .01) ax === 'z' ? slab(c0, c1, a, b, y0, y1, m) : slab(a, b, c0, c1, y0, y1, m); };
    const cuts = [...new Set([lo, hi, ...holes.flatMap(([mid, w]) => [mid - w / 2, mid + w / 2])])].filter(v => v >= lo && v <= hi).sort((p, q) => p - q);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1], c = (a + b) / 2; if (b - a < .01) continue;
      let y = bot;
      for (const [y0, y1] of holes.filter(([mid, w]) => Math.abs(c - mid) < w / 2).map(h => [h[2], h[3]]).sort((p, q) => p[0] - q[0])) { put(a, b, y, y0); y = Math.max(y, y1); }
      put(a, b, y, top);
    }
  }
  // window and door trim on a wall's outside, out toward (ox, oz)
  function trim(ax, face, holes, ox, oz, m = K.trim || K.beam) {
    for (const [mid, w, y0, y1] of holes) {
      const at = (along, y, dw, dh, dd) => ax === 'z' ? piece(dd, dh, dw, m, face + ox * dd / 2, y, along) : piece(dw, dh, dd, m, along, y, face + oz * dd / 2);
      detail(at(mid, y1 + .06, w + .24, .12, .1));
      for (const e of [-1, 1]) detail(at(mid + e * (w / 2 + .06), (y0 + y1) / 2, .12, y1 - y0, .08));
      if (y1 - y0 < 2) detail(at(mid, y0 - .04, w + .3, .08, .16)); // a sill, not under a door
    }
  }
  // four walls h high round [x0, x1] x [z0, z1] standing on base, a floor fl thick, holes per side (w and e: middle along z; s and n: along x)
  function house(x0, x1, z0, z1, h, m, holes = {}, { base = 0, fl = 0, floor = K.deck, tr = true } = {}) {
    const w = holes.w || [], e = holes.e || [], s = holes.s || [], n = holes.n || [], top = base + h;
    for (const [f, list] of [['w', w], ['e', e], ['s', s], ['n', n]]) for (const [mid, wd, a, b] of list) (a <= base + fl + .05 && b - a >= 1.9 ? doors : windows).push({ f, mid, w: wd, y: base + fl, y0: a, y1: b, at: f === 'w' ? x0 : f === 'e' ? x1 : f === 's' ? z0 : z1 });
    wall('z', x0, x0 + T, z0, z1, base, top, w, m); wall('z', x1 - T, x1, z0, z1, base, top, e, m);
    wall('x', z0, z0 + T, x0 + T, x1 - T, base, top, s, m); wall('x', z1 - T, z1, x0 + T, x1 - T, base, top, n, m);
    if (fl) {
      slab(x0 + T, x1 - T, z0 + T, z1 - T, base, base + fl, floor);
      for (const [mid, wd, a] of w) if (a <= base + fl) slab(x0, x0 + T, mid - wd / 2, mid + wd / 2, base, base + fl, floor);
      for (const [mid, wd, a] of e) if (a <= base + fl) slab(x1 - T, x1, mid - wd / 2, mid + wd / 2, base, base + fl, floor);
      for (const [mid, wd, a] of s) if (a <= base + fl) slab(mid - wd / 2, mid + wd / 2, z0, z0 + T, base, base + fl, floor);
      for (const [mid, wd, a] of n) if (a <= base + fl) slab(mid - wd / 2, mid + wd / 2, z1 - T, z1, base, base + fl, floor);
    }
    if (tr) { trim('z', x0, w, -1, 0); trim('z', x1, e, 1, 0); trim('x', z0, s, 0, -1); trim('x', z1, n, 0, 1); }
  }
  // a floor at y over [x0, x1] x [z0, z1], open over a stairwell [x0, x1, z0, z1]
  function upper(x0, x1, z0, z1, y, hole, m = K.deck, th = .25) {
    const out = [];
    if (!hole) out.push([x0, x1, z0, z1]);
    else {
      const [a0, a1, b0, b1] = hole;
      if (b0 > z0) out.push([x0, x1, z0, b0]); if (b1 < z1) out.push([x0, x1, b1, z1]);
      if (a0 > x0) out.push([x0, a0, Math.max(z0, b0), Math.min(z1, b1)]); if (a1 < x1) out.push([a1, x1, Math.max(z0, b0), Math.min(z1, b1)]);
    }
    for (const [a, b, c, d] of out) slab(a, b, c, d, y - th, y, m);
  }
  // a gable roof on walls h high over [x0, x1] x [z0, z1]: the ridge along ax at y1, the eaves out past the walls by o, both ends filled in with m
  function gable(ax, x0, x1, z0, z1, h, y1, m, { o = .3, o0 = o, o1 = o, th = .2, roof = K.roof, ridge = K.beam, ends = true, snow = null, sn = .12 } = {}) { // o: how far the eaves hang out; o0, o1: past each end
    const AX = ax === 'x', [l0, l1, c0, c1] = AX ? [x0, x1, z0, z1] : [z0, z1, x0, x1], mid = (c0 + c1) / 2, hw = (c1 - c0) / 2;
    let a = Math.atan2(y1 - h, hw); for (let k = 0; k < 3; k++) a = Math.atan2(y1 - h - th / Math.cos(a), hw); // the underside meets the wall tops
    const t = Math.tan(a), yw = y1 - hw * t, H = hw + o, ye = y1 - H * t, len = l1 - l0 + o0 + o1, cl = (l0 - o0 + l1 + o1) / 2;
    for (const e of [-1, 1]) {
      const r = AX ? tbox(len, th, H / Math.cos(a), roof) : tbox(H / Math.cos(a), th, len, roof), cc = mid + e * (H / 2 - th / 2 * Math.sin(a)), cy = (y1 + ye) / 2 - th / 2 * Math.cos(a);
      if (AX) { r.position.set(cl, cy, cc); r.rotation.x = e * a; } else { r.position.set(cc, cy, cl); r.rotation.z = -e * a; }
      add(r); building.cover.push(r);
      if (snow) { // snow lying on it
        const w = AX ? tbox(len + .1, sn, H / Math.cos(a) + .06, snow) : tbox(H / Math.cos(a) + .06, sn, len + .1, snow), sc = mid + e * (H / 2 + sn / 2 * Math.sin(a)), sy = (y1 + ye) / 2 + sn / 2 * Math.cos(a);
        if (AX) { w.position.set(cl, sy, sc); w.rotation.x = e * a; } else { w.position.set(sc, sy, cl); w.rotation.z = -e * a; }
        add(w);
        const ce = mid + e * (H - .03); // icicles along the eave
        for (let p = l0 - o0 + .15; p < l1 + o1 - .15; p += .25 + ir() * .6) { const ih = .1 + ir() * ir() * .55; icicles.push([AX ? p : ce, ye - .06 - ih / 2, AX ? ce : p, .07, ih, .07, 0]); }
      }
    }
    const up = snow ? sn / Math.cos(a) : 0;
    const rc = snow ? (AX ? box(len + .1, .22, .5, snow) : box(.5, .22, len + .1, snow)) : AX ? box(len, .14, .28, ridge) : box(.28, .14, len, ridge); rc.position.set(AX ? cl : mid, y1 + (snow ? up - .05 : .03), AX ? mid : cl); add(rc); meshSolids(rc, snow ? 'snow' : 'wood');
    const d = th / 2 / Math.cos(a), sh = new THREE.Shape([[c0, h], [c1, h], [c1, yw - d], [mid, y1 - d], [c0, yw - d]].map(([p, q]) => new THREE.Vector2(p, q))); // the ends stop inside the roof: level with its face they flickered through it
    if (ends) for (const at of [l0 + (o0 < .02 ? .02 : 0), l1 - T - (o1 < .02 ? .02 : 0)]) {
      const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), m); g.userData.uvk = 1;
      if (AX) { g.rotation.y = -Math.PI / 2; g.position.x = at + T; } else g.position.z = at;
      add(g); building.cover.push(g);
    }
    for (const e of [-1, 1]) for (const s of slopeSolids(AX ? 'z' : 'x', mid + e * H, mid, ye + up, y1 + up, l0 - o0, l1 + o1, th / Math.cos(a) + up, snow ? 'snow' : 'wood')) { // each side, the ends filled up to it
      const [u0, u1] = AX ? [Math.max(s.minZ, c0), Math.min(s.maxZ, c1)] : [Math.max(s.minX, c0), Math.min(s.maxX, c1)];
      if (ends && s.bot > h && u1 > u0) for (const at of [l0, l1 - T]) building.solids.push({ mesh: null, minX: AX ? at : u0, maxX: AX ? at + T : u1, minZ: AX ? u0 : at, maxZ: AX ? u1 : at + T, bot: h, top: s.bot, surf: 'wood' });
    }
    return { a, ye, yw };
  }
  // stairs you walk from a (y0) to b (y1) along ax, across c0..c1: open treads on two stringers with room underneath, posts under the top.
  // full: a solid block of steps instead (masonry, or just a step or two)
  function stairs(ax, a, b, c0, c1, y0, y1, m = K.deck, full = y1 - y0 <= 1.2) {
    const n = Math.max(2, Math.round((y1 - y0) / .3)), lo = Math.min(a, b), hi = Math.max(a, b), len = (hi - lo) / n, mid = (c0 + c1) / 2, X = ax === 'x', dir = Math.sign(b - a), surf = m.userData.surf || 'wood';
    if (full) {
      building.solids.push({ mesh: null, minX: X ? lo : c0, maxX: X ? hi : c1, minZ: X ? c0 : lo, maxZ: X ? c1 : hi, bot: y0, top: y1, ramp: { ax, a, b }, surf });
      for (let k = 0; k < n; k++) {
        const p = a + (b - a) * (k + .5) / n, top = y0 + (y1 - y0) * (k + .5) / n;
        const st = X ? tbox(len, top - y0, c1 - c0, m) : tbox(c1 - c0, top - y0, len, m);
        st.position.set(X ? p : mid, (top + y0) / 2, X ? mid : p); add(st); building.cover.push(st);
      }
      return;
    }
    const run = hi - lo, rise = y1 - y0, ang = Math.atan2(rise, run), L = Math.hypot(run, rise);
    slopeSolids(ax, a, b, y0, y1, c0, c1, .4, surf); // strips with flat bottoms: you can walk under them
    for (let k = 0; k < n; k++) { // treads
      const p = a + (b - a) * (k + .5) / n, top = y0 + rise * (k + .5) / n, t = X ? tbox(len + .06, .09, c1 - c0, m) : tbox(c1 - c0, .09, len + .06, m);
      t.position.set(X ? p : mid, top - .045, X ? mid : p); add(t); building.cover.push(t);
    }
    for (const c of [c0 + .06, c1 - .06]) { // stringers under them
      const st = X ? tbox(L, .22, .09, K.beam) : tbox(.09, .22, L, K.beam); st.position.set(X ? (a + b) / 2 : c, (y0 + y1) / 2 - .2, X ? c : (a + b) / 2);
      if (X) st.rotation.z = dir * ang; else st.rotation.x = -dir * ang;
      add(st); building.cover.push(st);
      // a post under the top, down to whatever it stands on
      const pa = b - dir * .12, px = X ? pa : c, pz = X ? c : pa, top = y1 - .34;
      let foot = 0; for (const q of building.solids) if (q.top < top - .5 && q.top > foot && px > q.minX && px < q.maxX && pz > q.minZ && pz < q.maxZ && !q.ramp) foot = q.top;
      if (top - foot > .5) addSlab(px, pz, .12, .12, foot, top, K.beam);
    }
  }
  // a smooth ramp from a (y0) to b (y1) along ax, across c0..c1, th thick: one tilted board
  function ramp(ax, a, b, c0, c1, y0, y1, m = K.deck, th = .16) {
    const run = Math.abs(b - a), L = Math.hypot(run, y1 - y0), ang = Math.atan2(y1 - y0, run), mid = (c0 + c1) / 2;
    const r = ax === 'x' ? tbox(L, th, c1 - c0, m) : tbox(c1 - c0, th, L, m); r.position.set(ax === 'x' ? (a + b) / 2 : mid, (y0 + y1) / 2 - th / 2 * Math.cos(ang), ax === 'x' ? mid : (a + b) / 2);
    if (ax === 'x') r.rotation.z = Math.sign(b - a) * ang; else r.rotation.x = -Math.sign(b - a) * ang;
    add(r); building.cover.push(r);
    slopeSolids(ax, a, b, y0, y1, c0, c1, th / Math.cos(ang), m.userData.surf || 'wood'); // strips with flat bottoms, so you can walk under it
  }
  // a railing from (x0, z0) to (x1, z1) on y: posts at the ends (when ends says so) and between, rails post to post
  function railing(x0, z0, x1, z1, y, ends = [true, true], hh = .95, m = K.beam) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 1.6)), ang = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i <= n; i++) { if (i === 0 && !ends[0] || i === n && !ends[1]) continue; building.cover.push(onWall(piece(.12, hh, .12, m, x0 + (x1 - x0) * i / n, y + hh / 2, z0 + (z1 - z0) * i / n))); }
    for (const [ry, th] of [[hh - .05, .1], [hh * .45, .07]]) { const r = tbox(len + .12, th, .08, m); r.position.set((x0 + x1) / 2, y + ry, (z0 + z1) / 2); r.rotation.y = ang; add(r); }
    solid(Math.min(x0, x1) - .07, Math.max(x0, x1) + .07, Math.min(z0, z1) - .07, Math.max(z0, z1) + .07, y, y + hh);
  }
  // a railing up the side of stairs from a (y0) to b (y1) along ax, at c across
  function stairRail(ax, a, b, c, y0, y1, hh = .95, m = K.beam) {
    const run = Math.abs(b - a), n = Math.max(1, Math.ceil(run / 1.4)), rise = y1 - y0, P = (k, v) => ax === 'x' ? [k, v] : [v, k];
    for (let i = 0; i <= n; i++) { const [x, z] = P(a + (b - a) * i / n, c); building.cover.push(piece(.12, hh, .12, m, x, y0 + rise * i / n + hh / 2, z)); }
    const ang = Math.atan2(rise, run), [mx, mz] = P((a + b) / 2, c), L = Math.hypot(run, rise) + .12;
    for (const [ry, th] of [[hh - .05, .1], [hh * .45, .07]]) {
      const r = ax === 'x' ? tbox(L, th, .08, m) : tbox(.08, th, L, m); r.position.set(mx, (y0 + y1) / 2 + ry, mz);
      if (ax === 'x') r.rotation.z = Math.sign(b - a) * ang; else r.rotation.x = -Math.sign(b - a) * ang;
      add(r); if (th < .1) meshSolids(r, 'wood', .5);
    }
    const [x0, z0] = P(Math.min(a, b), c - .07), [x1, z1] = P(Math.max(a, b), c + .07);
    building.solids.push({ mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot: y0 + hh, top: y1 + hh, ramp: { ax, a, b }, surf: 'wood' });
  }
  const beam = K.beam, deck = K.deck, snow = K.snow || KIT_SNOW, iron = KIT_IRON, red = KIT_RED, gold = KIT_GOLD, black = KIT_BLACK, staves = KIT_STAVES, logM = KIT_LOGS, crateM = crate1, rnd = seeded(31);
  const cylY = (r0, r1, h, m, x, y, z, n = 12) => { const c = new THREE.Mesh(pxCyl(r0, r1, h, n), m); c.position.set(x, y, z); add(c); return c; };
  // a window pane or a door flat on a wall: face s, n, e or w of the box it's on
  const onFace = (f, x0, x1, z0, z1, along, y, w, h, m, out = .025) => f === 's' ? onWall(piece(w, h, .05, m, along, y, z0 - out)) : f === 'n' ? onWall(piece(w, h, .05, m, along, y, z1 + out)) : f === 'w' ? onWall(piece(.05, h, w, m, x0 - out, y, along)) : onWall(piece(.05, h, w, m, x1 + out, y, along));
  const faceAt = (f, x0, x1, z0, z1, along, out) => f === 's' ? [along, z0 - out] : f === 'n' ? [along, z1 + out] : f === 'w' ? [x0 - out, along] : [x1 + out, along];
  // what shows on the outside of a building's walls from y0 to y1. Timber: corner posts, a beam at each level, a stud either side of every opening with a lintel over it and a sill under a window, more studs across a bare stretch and a brace in the end panels.
  // Otherwise just the surrounds of its openings. A plinth is a band of stone along the bottom
  function frame(x0, x1, z0, z1, y0, y1, holes = {}, { mid = [], m = beam, timber = true, braces = true, plinth = null, corners = timber } = {}) {
    const D = .07, B = .2, levels = [y0, ...mid, y1];
    if (corners) for (const cx of [x0, x1]) for (const cz of [z0, z1]) onWall(piece(.3, y1 - y0, .3, m, cx + (cx === x0 ? .15 - D : D - .15), (y0 + y1) / 2, cz + (cz === z0 ? .15 - D : D - .15)));
    for (const [f, a0, a1, at, ox, oz] of [['s', x0, x1, z0, 0, -1], ['n', x0, x1, z1, 0, 1], ['w', z0, z1, x0, -1, 0], ['e', z0, z1, x1, 1, 0]]) {
      const hs = holes[f] || [], lo = a0 + .3 - D, hi = a1 - .3 + D; // between the corner posts
      const put = (along, y, w, h, deep = D, mat = m) => onWall(ox ? piece(deep, h, w, mat, at + ox * deep / 2, y, along) : piece(w, h, deep, mat, along, y, at + oz * deep / 2));
      const runs = (yy, hh, fn) => { // along the face at a height, broken where an opening crosses
        let from = lo;
        for (const [c0, c1] of hs.filter(h => h[2] < yy + hh / 2 - .01 && h[3] > yy - hh / 2 + .01).map(([c, w]) => [c - w / 2, c + w / 2]).sort((p, q) => p[0] - q[0])) { if (c0 - from > .05) fn((from + c0) / 2, c0 - from); from = Math.max(from, c1); }
        if (hi - from > .05) fn((from + hi) / 2, hi - from);
      };
      if (plinth) runs(y0 + .3, .6, (c, w) => put(c, y0 + .3, w, .6, .1, plinth));
      if (timber) levels.forEach((y, k) => { if (!k && plinth) return; const yy = !k ? y + B / 2 : k === levels.length - 1 ? y - B / 2 : y; runs(yy, B, (c, w) => put(c, yy, w, B)); });
      for (let k = 0; k + 1 < levels.length; k++) {
        const b0 = levels[k] + (k ? B / 2 : plinth ? .6 : B), b1 = levels[k + 1] - (k + 2 === levels.length ? B : B / 2), posts = [lo, hi];
        const sh = hs.filter(h => h[2] < b1 - .05 && h[3] > b0 + .05), over = (p, q) => sh.some(([c, w]) => c + w / 2 > p && c - w / 2 < q);
        for (const [c, w, a, b] of sh) {
          const door = a <= levels[k] + .05, j0 = timber ? b0 : Math.max(a, y0), j1 = timber ? b1 : b; // a timber wall's studs run the whole storey
          for (const e of [-1, 1]) { const p = c + e * (w / 2 + .08); if (p > lo + .1 && p < hi - .1) { put(p, (j0 + j1) / 2, .16, j1 - j0); posts.push(p); } }
          if (b < b1 - .1 || !timber) put(c, b + .08, w + (timber ? 0 : .32), .16);
          if (!door) { put(c, a - .07, w + (timber ? 0 : .32), .14, timber ? D : .12); detail(put(c, a + .03, w + .12, .06, .2, snow)); }
        }
        if (!timber) continue;
        let ps = [...new Set(posts)].sort((p, q) => p - q);
        for (let i = ps.length - 2; i >= 0; i--) { // studs across a long bare stretch
          const gap = ps[i + 1] - ps[i]; if (gap < 3.3 || over(ps[i], ps[i + 1])) continue;
          for (let n = Math.round(gap / 2.1), q = 1; q < n; q++) { const p = ps[i] + gap * q / n; put(p, (b0 + b1) / 2, .16, b1 - b0); posts.push(p); }
        }
        ps = [...new Set(posts)].sort((p, q) => p - q);
        if (braces && ps.length > 2) for (const [i, dir] of [[0, 1], [ps.length - 2, -1]]) {
          const w = ps[i + 1] - ps[i] - .18, h = b1 - b0; if (w < .9 || w > 2.6 || over(ps[i], ps[i + 1])) continue;
          const br = put((ps[i] + ps[i + 1]) / 2, (b0 + b1) / 2, Math.hypot(w, h) - .06, .15, D * .8), ang = Math.atan2(h, w) * dir;
          if (ox) br.rotation.x = -ang; else br.rotation.z = ang;
        }
      }
    }
  }
  // the timber in a gable end: a post up the middle and a collar across
  function gableFrame(ax, x0, x1, z0, z1, h, y1) {
    const D = .07, rise = y1 - h;
    for (const e of [-1, 1]) {
      if (ax === 'x') { const x = (e < 0 ? x0 : x1) + e * D / 2, z = (z0 + z1) / 2; onWall(piece(D, rise - .35, .18, beam, x, h + (rise - .35) / 2, z)); onWall(piece(D, .16, (z1 - z0) * .46, beam, x, h + rise * .5, z)); }
      else { const z = (e < 0 ? z0 : z1) + e * D / 2, x = (x0 + x1) / 2; onWall(piece(.18, rise - .35, D, beam, x, h + (rise - .35) / 2, z)); onWall(piece((x1 - x0) * .46, .16, D, beam, x, h + rise * .5, z)); }
    }
  }
  // things standing about: a barrel, a crate, a stack of firewood along a wall, a stool, a sled, a pillar box, a mast for the strings of lights
  function barrel(x, z, y0 = 0, lid = snow) {
    const b = cylY(.36, .36, .9, staves, x, y0 + .45, z, 10); building.cover.push(b); solid(x - .33, x + .33, z - .33, z + .33, y0, y0 + .9, 'wood', { round: .36 });
    for (const y of [.18, .72]) detail(cylY(.375, .375, .07, iron, x, y0 + y, z, 10)); if (lid) detail(cylY(.33, .33, .06, lid, x, y0 + .93, z, 10));
  }
  const crate = (x, z, s = .9, y0 = 0, top = true) => { slab(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y0, y0 + s, crateM); if (top) detail(piece(s + .04, .06, s + .04, snow, x, y0 + s + .03, z)); };
  function logs(x, z, ax, len = 2.4) { // split logs stacked three high, their ends showing
    const [w, d] = ax === 'x' ? [len, .55] : [.55, len]; slab(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, .85, logM); detail(piece(w + .06, .07, d + .06, snow, x, .885, z));
    for (const e of [-1, 1]) slab(x + (ax === 'x' ? e * (len / 2 + .06) : 0) - .06, x + (ax === 'x' ? e * (len / 2 + .06) : 0) + .06, z + (ax === 'x' ? 0 : e * (len / 2 + .06)) - .06, z + (ax === 'x' ? 0 : e * (len / 2 + .06)) + .06, 0, 1, beam);
  }
  const stool = (x, z, y0 = 0) => { slab(x - .2, x + .2, z - .2, z + .2, y0 + .4, y0 + .48, deck); slab(x - .07, x + .07, z - .07, z + .07, y0, y0 + .4, beam); };
  function sled(x, z, q) { // quarter turns
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = q * Math.PI / 2; add(g);
    const put = (w, h, d, m, px, py, pz) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); meshSolids(b, 'wood'); building.cover.push(b); return b; };
    for (const e of [-1, 1]) { put(.07, .07, 1.5, iron, e * .26, .035, 0); for (const pz of [-.45, .45]) put(.06, .2, .06, beam, e * .26, .17, pz); put(.07, .22, .07, iron, e * .26, .14, .78); }
    put(.66, .06, 1.2, red, 0, .3, -.05); put(.66, .05, .07, beam, 0, .26, .78);
  }
  function postbox(x, z) { slab(x - .24, x + .24, z - .24, z + .24, 0, 1.25, red); slab(x - .28, x + .28, z - .28, z + .28, 1.25, 1.35, red); slab(x - .28, x + .28, z - .28, z + .28, 1.35, 1.43, snow); onWall(piece(.3, .05, .02, black, x, 1, z + .25)); onWall(piece(.2, .14, .02, gold, x, .72, z + .25)); }
  // a five-pointed star in pixels for the top of a tree, y its middle, px the size of a pixel
  function star(x, y, z, px = .12) {
    const rows = [[[4, 1]], [[4, 1]], [[3, 3]], [[0, 9]], [[1, 7]], [[2, 5]], [[2, 5]], [[1, 3], [5, 3]], [[1, 1], [7, 1]]], g = new THREE.Group(); g.position.set(x, y, z); add(g);
    rows.forEach((runs, r) => { for (const [c, n] of runs) { const b = box(n * px, px, px * 1.4, KIT_STAR); b.position.set((c + n / 2 - 4.5) * px, (4 - r) * px, 0); g.add(b); } });
    solid(x - 4.5 * px, x + 4.5 * px, z - px * .7, z + px * .7, y - 4.5 * px, y + 4.5 * px, 'metal');
    return g;
  }
  // a painted board w wide facing ry (0: toward +z), painted on both sides when two
  function sign(text, w, x, y, z, ry, fg = '#f2e4c2', bg = '#4a2c1a', two = false, parent = null) {
    const h = w * 9 / (text.length * 4 + 3), g = new THREE.Group(), mat = kitDecal({ map: kitSignTex(text, fg, bg) }); g.position.set(x, y, z); g.rotation.y = ry; (parent || building.root).add(g);
    const bd = box(w + .12, h + .12, .06, K.beam); g.add(bd); if (!parent) meshSolids(bd, 'wood');
    for (const e of two ? [1, -1] : [1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.z = e * .035; p.rotation.y = e > 0 ? 0 : Math.PI; g.add(p); }
    return g;
  }
  // every piece gets its hitbox, now they're all placed (skip: glows and the like)
  const finish = (skip = () => false, keep = () => true) => {
    propSolids(pieces.filter(keep), skip);
    if (icicles.length) detail(instanced(unit, lam({ color: 0xd4ecfa, emissive: 0x24404e }), icicles));
    if (bulbs.length) for (const m of kitStrings(bulbs, wires)) { add(m); detail(m); }
  };
  return { T, pieces, doors, windows, piece, tpiece, onWall, slab, solid, flat, wall, trim, house, upper, gable, stairs, ramp, railing, stairRail, sign, star, lights, onFace, faceAt, frame, gableFrame, barrel, crate, logs, stool, sled, postbox, finish };
}
// the highest thing to stand on over each metre of a map (its ground where there's nothing): what snow lands on
function roofMap(m) {
  const H = m.half + 4, N = Math.ceil(H * 2), d = new Float32Array(N * N).fill(m.ground?.visible ? m.ground.position.y : -80), cl = v => Math.max(0, Math.min(N - 1, v));
  for (const s of m.solids) {
    if (s.top > 90) continue;
    for (let z = cl(Math.floor(s.minZ + H)); z <= cl(Math.ceil(s.maxZ + H) - 1); z++) for (let x = cl(Math.floor(s.minX + H)); x <= cl(Math.ceil(s.maxX + H) - 1); x++) if (s.top > d[z * N + x]) d[z * N + x] = s.top;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RedFormat, THREE.FloatType); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true;
  return { t, d, N, H, at: (x, z) => d[cl(Math.floor(z + H)) * N + cl(Math.floor(x + H))] };
}
// snow falling round whoever looks: n flakes in a box that follows the camera, one draw, none under a roof (wind: how far they drift a second, size in metres)
function snowFall(n, roof, { box: B = [64, 30], fall = 2.2, wind = [.5, .25], size = .07, color = 0xffffff } = {}) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), r = seeded(4242);
  for (let i = 0; i < n; i++) { pos[i * 3] = r() * B[0]; pos[i * 3 + 1] = r() * B[1]; pos[i * 3 + 2] = r() * B[0]; ph[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const u = { t: { value: 0 }, B: { value: new THREE.Vector2(B[0], B[1]) }, v: { value: new THREE.Vector3(wind[0], fall, wind[1]) }, s: { value: size }, h: { value: 720 }, c: { value: new THREE.Color(color) }, roof: { value: roof.t }, H: { value: roof.H } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, vertexShader: `uniform float t, s, h, H; uniform vec2 B; uniform vec3 v; uniform sampler2D roof; attribute float ph; varying float a;
    void main() {
      vec3 p = position + vec3(v.x * t + sin(t * (.6 + ph) + ph * 40.) * .5, -v.y * (.7 + ph * .6) * t, v.z * t + cos(t * (.5 + ph) + ph * 23.) * .5);
      vec3 q = vec3(B.x, B.y, B.x), o = cameraPosition - q * .5;
      p = o + mod(p - o, q); // wrapped round the camera
      vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
      float d = -mv.z, px = s * (.6 + ph * .8) * h * .5 * projectionMatrix[1][1] / max(d, .5);
      float far = length(mv.xyz); a = smoothstep(B.x * .5, B.x * .34, far) * smoothstep(.25, .9, far) * min(1., px / 1.5);
      vec2 uv = (p.xz + H) / (2. * H);
      if (uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1. && p.y < texture2D(roof, uv).r + .05) a = 0.; // under cover
      gl_PointSize = max(px, 1.5);
    }`, fragmentShader: `uniform vec3 c; varying float a; void main() { if (a < .02) discard; gl_FragColor = vec4(c, a * .9); }` });
  const pts = live(detail(new THREE.Points(g, m))); pts.frustumCulled = false; pts.renderOrder = 5;
  pts.onBeforeRender = r2 => { u.h.value = r2.getDrawingBufferSize(_snowV).y; u.t.value = performance.now() / 1000 % 3600; };
  return pts;
}
const _snowV = new THREE.Vector2();
// ---- winter (a season with snow) on a map that isn't a winter map itself: snow lying on whatever faces the sky, the ground, grass buried, snow falling. A look only: nothing you stand on changes
const SNOW_LAY = new THREE.MeshLambertMaterial({ color: 0xf0f5fb, emissive: 0x1a232e }), SNOW_T = .06, SNOW_G = .07; // how deep it lies on things, and on the ground
function winterMap(m) {
  const hasG = !!m.ground && m.ground.visible && Math.abs(m.ground.position.y) < .5; // the sky's ground is a long way down, there to stop shots
  const R = roofMap(m), H = m.half + 4, N = Math.ceil(H * 2), cells = Array.from({ length: N * N }, () => []), ci = v => Math.max(0, Math.min(N - 1, v)), V = () => new THREE.Vector3();
  const topAt = (s, x, z) => { // how high a solid stands just there
    if (s.ramp) { const p = s.ramp.ax === 'x' ? x : z, k = Math.max(0, Math.min(1, (p - s.ramp.a) / (s.ramp.b - s.ramp.a))); return (s.bot ?? 0) + (s.top - (s.bot ?? 0)) * k; }
    if (s.peak) return s.peak.edge + (s.top - s.peak.edge) * Math.max(0, 1 - Math.max(Math.abs(x - s.peak.x) / s.peak.rx, Math.abs(z - s.peak.z) / s.peak.rz));
    return s.top;
  };
  for (const s of m.solids) if (s.top < 90) for (let j = ci(Math.floor(s.minZ + H)); j <= ci(Math.ceil(s.maxZ + H) - 1); j++) for (let i = ci(Math.floor(s.minX + H)); i <= ci(Math.ceil(s.maxX + H) - 1); i++) cells[j * N + i].push(s);
  // indoors: every patch of the map with something overhead (a roof, a floor, a crown), and whether walls stand round its edge. A house does; trees, bridges and decks on posts don't
  const cov = new Uint8Array(N * N), wal = new Uint8Array(N * N), indoor = new Uint8Array(N * N);
  for (const s of m.solids) {
    if (s.top > 90) continue;
    const over = (s.bot || 0) > 1.2, wall = (s.bot || 0) < .6 && s.top > 1; if (!over && !wall) continue; // a wall counts under its windows too
    for (let j = ci(Math.floor(s.minZ + H)); j <= ci(Math.ceil(s.maxZ + H) - 1); j++) for (let i = ci(Math.floor(s.minX + H)); i <= ci(Math.ceil(s.maxX + H) - 1); i++) { if (over) cov[j * N + i] = 1; else wal[j * N + i] = 1; }
  }
  const wrun = new Uint8Array(N * N); // a wall is three cells or more in a row: a trunk or a standing stone isn't one
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!wal[j * N + i]) continue;
    let a = i, b = i; while (a > 0 && wal[j * N + a - 1]) a--; while (b < N - 1 && wal[j * N + b + 1]) b++;
    let c = j, d = j; while (c > 0 && wal[(c - 1) * N + i]) c--; while (d < N - 1 && wal[(d + 1) * N + i]) d++;
    if (b - a >= 2 || d - c >= 2) wrun[j * N + i] = 1;
  }
  for (let c0 = 0; c0 < N * N; c0++) {
    if (cov[c0] !== 1) continue;
    const q = [c0], walls = new Set(); cov[c0] = 2; let edge = 0, inner = 0;
    for (let k = 0; k < q.length; k++) {
      const c = q[k], i = c % N, j = c / N | 0; let out = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N || !cov[b * N + a]) out = true; else if (cov[b * N + a] === 1) { cov[b * N + a] = 2; q.push(b * N + a); } }
      if (!out) inner++;
      if (out) { edge++; for (let b = Math.max(0, j - 1); b <= Math.min(N - 1, j + 1); b++) for (let a = Math.max(0, i - 1); a <= Math.min(N - 1, i + 1); a++) if (wrun[b * N + a]) walls.add(b * N + a); }
    }
    if (inner >= 2 && walls.size >= edge * .45) for (const c of q) indoor[c] = 1; // room inside and walls most of the way round: not a trunk under a crown, nor a beam on two pillars
  }
  const low = s => s.top - (s.bot || 0) < .6; // a thin cover: an awning, a porch roof, a deck
  // is a spot on a face open to the sky: nothing standing on it or round it, and no roof over it
  const open = (x, y, z, tol, rest = true) => { // rest: does something standing on the spot count (not for the lie of the land: it just stands in the snow)
    if (Math.abs(x) >= H || Math.abs(z) >= H) return true;
    for (const s of cells[ci(Math.floor(z + H)) * N + ci(Math.floor(x + H))]) {
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ || s.round && Math.hypot(x - (s.minX + s.maxX) / 2, z - (s.minZ + s.maxZ) / 2) > s.round) continue;
      if (topAt(s, x, z) <= y + tol) continue; // under it, or its own
      const gap = (s.bot ?? 0) - y; if (gap < 1.2 && !rest) continue;
      if (gap < 1.2 || low(s) && gap < 3.4 || indoor[ci(Math.floor(z + H)) * N + ci(Math.floor(x + H))]) return false; // standing on it or close over it, a low roof, or indoors
    }
    return true;
  };
  const tint = mt => { // a material's colour, its picture averaged in
    if (mt.userData.tint) return mt.userData.tint;
    const c = mt.color || { r: 1, g: 1, b: 1 }, im = mt.map?.image; let r = c.r, g = c.g, b = c.b;
    if (im?.getContext) { const d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data; let Rr = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { Rr += d[i]; G += d[i + 1]; B += d[i + 2]; } const n = d.length / 4 * 255; r *= Rr / n; g *= G / n; b *= B / n; }
    return mt.userData.tint = [r, g, b];
  };
  const green = mt => { const [r, g, b] = tint(mt); return g > r * 1.08 && g > b * 1.12; }; // grass, moss, leaves
  const mat1 = o => [o.material].flat()[0], det = new Set(detailObjs), inDet = o => { for (let p = o; p; p = p.parent) if (det.has(p)) return true; return false; }, isLive = o => { for (let p = o; p; p = p.parent) if (p.userData.live) return true; return false; };
  m.root.updateMatrixWorld(true);
  const bb = new THREE.Box3(), gone = [], flats = [], decals = [];
  m.root.traverse(o => {
    if (!o.isMesh) return;
    const mt = mat1(o), gt = o.geometry?.type;
    if (o.userData.far) { if (mt.color && !mt.userData.frost && green(mt)) { mt.userData.frost = true; const [r, g, b] = tint(mt); if (mt.map) { mt.map = null; mt.needsUpdate = true; } mt.color.setRGB(r, g, b).lerp(new THREE.Color(0xe4ecf4), .8); } return; } // the hills and tree lines far off, frosted
    if (det.has(o) && (o.geometry === grassGeo || green(mt) && (bb.setFromObject(o), bb.max.y - bb.min.y < .12))) gone.push(o); // tall grass and moss are under it
    if (o !== m.ground && !o.isInstancedMesh && !o.userData.snow && !isLive(o)) { bb.setFromObject(o); if (bb.max.y - bb.min.y < .06 && bb.max.x - bb.min.x > .3 && bb.max.z - bb.min.z > .3) (hasG && bb.max.y < .5 ? flats : mt.polygonOffset ? decals : []).push([o, mt, bb.clone()]); }
  });
  for (const o of gone) { o.removeFromParent(); detailObjs.splice(detailObjs.indexOf(o), 1); }
  // ---- the pieces of it: triangles, flat shaded
  const out = { main: [], det: [] }, e1 = V(), e2 = V(), nn = V();
  const quad = (L, a, b, c, d, n) => { // facing n
    e1.subVectors(b, a); e2.subVectors(c, a); if (nn.crossVectors(e1, e2).dot(n) < 0) [b, d] = [d, b];
    L.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  };
  // a box: a cap on whichever face looks up (flat or sloping), a little wider than the face and hanging a lip down its edges; where something covers part of it, only the open part
  const ax = [V(), V(), V()], ctr = V(), sz = V(), lb = new THREE.Box3();
  function capBox(L, W, g) {
    if (!g.boundingBox) g.computeBoundingBox();
    lb.copy(g.boundingBox); lb.getSize(sz); lb.getCenter(ctr).applyMatrix4(W); W.extractBasis(ax[0], ax[1], ax[2]);
    const half = [sz.x, sz.y, sz.z].map((v, i) => v * ax[i].length() / 2); for (const a of ax) a.normalize();
    let k = 0, up = 0; for (let i = 0; i < 3; i++) if (Math.abs(ax[i].y) > Math.abs(up)) { up = ax[i].y; k = i; }
    if (Math.abs(up) < .5) return;
    const n = ax[k].clone().multiplyScalar(Math.sign(up)), u = ax[(k + 1) % 3].clone(), v = ax[(k + 2) % 3].clone(), hu = half[(k + 1) % 3], hv = half[(k + 2) % 3], hn = half[k];
    if (Math.min(hu, hv) < .07 || hu * hv < .012) return; // rails and the like
    const C = ctr.clone().addScaledVector(n, hn); if (hasG && C.y < SNOW_G - .005) return; // the ground's own snow is over it
    const nu = Math.min(64, Math.ceil(hu * 4)), nv = Math.min(64, Math.ceil(hv * 4)), du = hu * 2 / nu, dv = hv * 2 / nv, keep = new Uint8Array(nu * nv);
    const tol = .1 + Math.abs(u.y) * du + Math.abs(v.y) * dv + (Math.abs(up) < .98 ? .3 : 0), P = (a, b, h) => C.clone().addScaledVector(u, a).addScaledVector(v, b).addScaledVector(n, h);
    let any = 0;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const p = P(-hu + (i + .5) * du, -hv + (j + .5) * dv, 0); if (open(p.x, p.y, p.z, tol)) { keep[j * nu + i] = 1; any++; } }
    if (!any) return;
    if (any === nu * nv) { keep.fill(0); keep[0] = 1; any = -1; } // wholly open: one piece
    const lip = Math.min(.09, hn * 1.2), o = lip < .03 ? .012 : .03, t = SNOW_T, K = (i, j) => i >= 0 && i < nu && j >= 0 && j < nv && keep[j * nu + i];
    if (any < 0) { quad(L, P(-hu - o, -hv - o, t), P(hu + o, -hv - o, t), P(hu + o, hv + o, t), P(-hu - o, hv + o, t), n); for (const [a0, b0, a1, b1, dir] of [[-hu - o, -hv - o, -hu - o, hv + o, u.clone().negate()], [hu + o, -hv - o, hu + o, hv + o, u], [-hu - o, -hv - o, hu + o, -hv - o, v.clone().negate()], [-hu - o, hv + o, hu + o, hv + o, v]]) quad(L, P(a0, b0, t), P(a1, b1, t), P(a1, b1, -lip), P(a0, b0, -lip), dir); return; }
    const U = i => i <= 0 ? -hu - o : i >= nu ? hu + o : -hu + i * du, Vv = j => j <= 0 ? -hv - o : j >= nv ? hv + o : -hv + j * dv; // the cell lines, pushed out at the face's own edges
    const side = (a0, b0, a1, b1, edge, dir) => quad(L, P(a0, b0, t), P(a1, b1, t), P(a1, b1, edge ? -lip : 0), P(a0, b0, edge ? -lip : 0), dir);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (!keep[j * nu + i]) continue;
      let i1 = i; while (i1 + 1 < nu && keep[j * nu + i1 + 1]) i1++; // a run along u
      quad(L, P(U(i), Vv(j), t), P(U(i1 + 1), Vv(j), t), P(U(i1 + 1), Vv(j + 1), t), P(U(i), Vv(j + 1), t), n);
      side(U(i), Vv(j), U(i), Vv(j + 1), i === 0, u.clone().negate()); side(U(i1 + 1), Vv(j), U(i1 + 1), Vv(j + 1), i1 === nu - 1, u);
      for (let q = i; q <= i1; q++) {
        if (!K(q, j - 1)) side(U(q), Vv(j), U(q + 1), Vv(j), j === 0, v.clone().negate());
        if (!K(q, j + 1)) side(U(q), Vv(j + 1), U(q + 1), Vv(j + 1), j === nv - 1, v);
      }
      i = i1;
    }
  }
  // anything else (cones, drums, cliffs): its upward faces lifted along their normals
  const pa = V(), pb = V(), pc = V(), na = V(), nb = V(), nc = V(), fn = V(), nm = new THREE.Matrix3();
  function capAny(L, W, g) {
    const Pp = g.attributes.position, Nr = g.attributes.normal, I = g.index?.array, cnt = I ? I.length : Pp.count; if (!Nr || cnt > 600000) return;
    nm.getNormalMatrix(W);
    const read = q => { // a triangle and its corners' normals, in the world
      const ia = I ? I[q] : q, ib = I ? I[q + 1] : q + 1, ic = I ? I[q + 2] : q + 2;
      pa.fromBufferAttribute(Pp, ia).applyMatrix4(W); pb.fromBufferAttribute(Pp, ib).applyMatrix4(W); pc.fromBufferAttribute(Pp, ic).applyMatrix4(W);
      na.fromBufferAttribute(Nr, ia).applyMatrix3(nm).normalize(); nb.fromBufferAttribute(Nr, ib).applyMatrix3(nm).normalize(); nc.fromBufferAttribute(Nr, ic).applyMatrix3(nm).normalize();
      fn.crossVectors(e1.subVectors(pb, pa), e2.subVectors(pc, pa));
      return { ny: (na.y + nb.y + nc.y) / 3, up: fn.length() / 2 >= .004 && (na.y + nb.y + nc.y) / 3 >= .5, x: (pa.x + pb.x + pc.x) / 3, y: (pa.y + pb.y + pc.y) / 3, z: (pa.z + pb.z + pc.z) / 3, ia, ib, ic }; // up by its own normals: some are wound the other way
    };
    const clear = (x, y, z, ny) => open(x, y, z, ny > .98 ? .12 : .45, false) && !(hasG && y < SNOW_G - .005);
    const E = new Map(), ek = v => Math.round(v.x * 400) + ',' + Math.round(v.y * 400) + ',' + Math.round(v.z * 400);
    const edge = (a, b, c, n) => { const ka = ek(a), kb = ek(b), k = ka < kb ? ka + '|' + kb : kb + '|' + ka, e = E.get(k); if (e) e.n++; else E.set(k, { n: 1, a: a.clone(), b: b.clone(), c: c.clone(), up: n.clone() }); };
    const emit = q => { read(q); const back = fn.dot(na) < 0; pa.addScaledVector(na, SNOW_T); pb.addScaledVector(nb, SNOW_T); pc.addScaledVector(nc, SNOW_T);
      if (back) L.push(pa.x, pa.y, pa.z, pc.x, pc.y, pc.z, pb.x, pb.y, pb.z); else L.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z, pc.x, pc.y, pc.z);
      edge(pa, pb, pc, na); edge(pb, pc, pa, nb); edge(pc, pa, pb, nc); };
    for (let q = 0; q < cnt; q += 3) {
      const A = read(q);
      if (I && q + 3 < cnt && [I[q + 3], I[q + 4], I[q + 5]].filter(i => i === A.ia || i === A.ib || i === A.ic).length === 2) { // the other half of a square: both or neither
        const B = read(q + 3);
        if (A.up && B.up) { if (clear((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, Math.min(A.ny, B.ny))) { emit(q); emit(q + 3); } q += 3; continue; }
      }
      if (A.up && clear(A.x, A.y, A.z, A.ny)) emit(q);
    }
    for (const e of E.values()) { // wherever its snow stops, a lip hangs over the edge (an island's grassy rim, a round roof's eave)
      if (e.n !== 1) continue;
      const out = e1.subVectors(e.b, e.a).cross(e.up).normalize().clone(); if (out.dot(e2.subVectors(e.c, e.a)) > 0) out.negate();
      const along = e2.subVectors(e.b, e.a).normalize().multiplyScalar(.025); // a little past each end, so two lips meet round a corner with nothing showing between them
      const aT = e.a.clone().addScaledVector(out, .025).sub(along), bT = e.b.clone().addScaledVector(out, .025).add(along), dn = e.up.clone().multiplyScalar(-(SNOW_T + .2));
      quad(L, aT, bT, bT.clone().add(dn), aT.clone().add(dn), out);
      quad(L, e.a, e.b, bT, aT, e.up);
    }
  }
  const W = new THREE.Matrix4(), IM = new THREE.Matrix4();
  m.root.traverse(o => {
    if (!o.isMesh || o === m.ground || o.userData.far || o.userData.snow || o.renderOrder < 0 || isLive(o) || !o.parent) return;
    const mt = mat1(o), g = o.geometry, gt = g.type;
    if (!mt || mt.transparent || mt.alphaTest || mt.polygonOffset || mt.isMeshBasicMaterial || mt.isShaderMaterial || !mt.visible) return;
    if (mt.emissive && (mt.emissive.r + mt.emissive.g + mt.emissive.b) * (mt.emissiveIntensity ?? 1) > .6) return; // lamps stay clear
    if (o.geometry === grassGeo) return;
    if (gt === 'PlaneGeometry' || gt === 'CircleGeometry' || gt === 'ShapeGeometry') { if (!(mt.color && green(mt)) || hasG && (bb.setFromObject(o), bb.max.y < .5)) return; } // only grass laid up on something: an island's top
    const L = inDet(o) ? out.det : out.main, cap = gt === 'BoxGeometry' ? capBox : capAny;
    if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, IM); cap(L, W.multiplyMatrices(o.matrixWorld, IM), g); } }
    else cap(L, o.matrixWorld, g);
  });
  for (const [o, , b] of decals) if (open((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2, .1)) { o.removeFromParent(); const k = detailObjs.indexOf(o); if (k >= 0) detailObjs.splice(k, 1); }
  // ---- the ground: half metre cells, clear of paths, water and indoors, with a little bank wherever it stops
  if (hasG) {
    const clear = [], kept = new Set(), tv = V();
    for (const [o, mt, b] of flats) { // paths and other narrow strips stay clear, and water; snow lies over yards, fields and lawns, and whatever is only a shadow or a glow
      const pl = o.geometry.type === 'PlaneGeometry' ? o.geometry.parameters : null; let w = b.max.x - b.min.x, d = b.max.z - b.min.z, inside = () => true;
      if (pl) { // by its own shape: a path laid at an angle isn't the square round it
        const inv = o.matrixWorld.clone().invert(), y = (b.min.y + b.max.y) / 2; o.matrixWorld.extractBasis(e1, e2, nn); w = pl.width * e1.length(); d = pl.height * e2.length();
        inside = (x, z) => { tv.set(x, y, z).applyMatrix4(inv); return Math.abs(tv.x) < pl.width / 2 + .05 && Math.abs(tv.y) < pl.height / 2 + .05; };
      }
      else { // a pond's own outline, triangle by triangle
        const g = o.geometry, Pp = g.attributes.position, I = g.index?.array, cnt = I ? I.length : Pp.count, T2 = [];
        if (cnt <= 3000) { for (let q = 0; q < cnt; q++) { tv.fromBufferAttribute(Pp, I ? I[q] : q).applyMatrix4(o.matrixWorld); T2.push(tv.x, tv.z); }
          const sg = (ax, az, bx, bz, x, z) => (x - bx) * (az - bz) - (ax - bx) * (z - bz);
          inside = (x, z) => { for (let q = 0; q < T2.length; q += 6) { const d1 = sg(T2[q], T2[q + 1], T2[q + 2], T2[q + 3], x, z), d2 = sg(T2[q + 2], T2[q + 3], T2[q + 4], T2[q + 5], x, z), d3 = sg(T2[q + 4], T2[q + 5], T2[q], T2[q + 1], x, z); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true; } return false; }; }
      }
      if (!(mt.color && green(mt)) && (mt.transparent ? mt.opacity >= .5 && !mt.map && mt.color && mt.color.r + mt.color.g + mt.color.b > .6 : Math.min(w, d) <= 6.5 && Math.max(w, d) >= 5 && w * d >= 8)) { clear.push({ b: [b.min.x - .05, b.max.x + .05, b.min.z - .05, b.max.z + .05], inside }); kept.add(o); }
    }
    const nPath = clear.length; // (pickup pads aren't cleared: a pickup hangs over the snow, and a bare patch under it read as a mistake)
    const G = m.half + 3, S = 2, NG = G * 2 * S, ok = new Uint8Array(NG * NG).fill(1), path = new Uint8Array(NG * NG), gi2 = v => Math.max(0, Math.min(NG - 1, v));
    const mark = (x0, x1, z0, z1) => { for (let j = gi2(Math.floor((z0 + G) * S)); j <= gi2(Math.ceil((z1 + G) * S) - 1); j++) for (let i = gi2(Math.floor((x0 + G) * S)); i <= gi2(Math.ceil((x1 + G) * S) - 1); i++) ok[j * NG + i] = 0; };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (indoor[j * N + i]) mark(i - H, i - H + 1, j - H, j - H + 1);
    for (const s of m.solids) if (s.top < 90 && (s.bot || 0) > 1.2 && (s.bot || 0) < 3.4 && !s.ramp && low(s)) mark(s.minX, s.maxX, s.minZ, s.maxZ); // and under a porch roof or an awning
    clear.forEach((c, k) => { for (let j = gi2(Math.floor((c.b[2] + G) * S)); j <= gi2(Math.ceil((c.b[3] + G) * S) - 1); j++) for (let i = gi2(Math.floor((c.b[0] + G) * S)); i <= gi2(Math.ceil((c.b[1] + G) * S) - 1); i++) if (c.inside((i + .5) / S - G, (j + .5) / S - G)) { ok[j * NG + i] = 0; if (k < nPath) path[j * NG + i] = 1; } });
    const under = flats.filter(([o, mt, b]) => !kept.has(o) && b.max.y < (mt.color && green(mt) ? .5 : SNOW_G)); // what the snow lies over
    if (m.floor) for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) if ((m.floor((i + .5) / S - G, (j + .5) / S - G) || 0) < -.05) ok[j * NG + i] = 0;
    // a decal under the snow shows through it from low down, a patch that shifts as you move. So none is left under any: one the snow mostly covers goes, and the snow keeps off whatever stays
    const decs = under.filter(([, mt]) => mt.polygonOffset || mt.transparent || !mt.depthWrite || !mt.depthTest).map(([o, mt, b]) => ({ o, b, soft: mt.transparent || mt.color && green(mt), keep: false })); // soft: a shadow, a glow, a patch of grass
    const cover = b => { if (b.min.x >= G || b.max.x <= -G || b.min.z >= G || b.max.z <= -G) return 1; let n = 0, on = 0; for (let j = gi2(Math.floor((b.min.z + G) * S)); j <= gi2(Math.ceil((b.max.z + G) * S) - 1); j++) for (let i = gi2(Math.floor((b.min.x + G) * S)); i <= gi2(Math.ceil((b.max.x + G) * S) - 1); i++) { n++; on += ok[j * NG + i] | path[j * NG + i]; } return on / n; }; // under snow, or under a path drawn over it
    for (let again = true; again;) { again = false; for (const d of decs) if (!d.keep && cover(d.b) < (d.soft ? .15 : .9)) { d.keep = again = true; mark(d.b.min.x, d.b.max.x, d.b.min.z, d.b.max.z); } }
    for (const d of decs) if (!d.keep) { d.o.removeFromParent(); const k = detailObjs.indexOf(d.o); if (k >= 0) detailObjs.splice(k, 1); }
    const L = out.main, t = SNOW_G, Kk = (i, j) => i < 0 || i >= NG || j < 0 || j >= NG || ok[j * NG + i], X = i => i / S - G, up = new THREE.Vector3(0, 1, 0), p4 = (x, y, z) => new THREE.Vector3(x, y, z);
    const bank = (x0, z0, x1, z1, dx, dz) => quad(L, p4(x0, t, z0), p4(x1, t, z1), p4(x1, 0, z1), p4(x0, 0, z0), p4(dx, 0, dz));
    for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
      if (!ok[j * NG + i]) continue;
      let i1 = i; while (i1 + 1 < NG && ok[j * NG + i1 + 1]) i1++;
      quad(L, p4(X(i), t, X(j)), p4(X(i1 + 1), t, X(j)), p4(X(i1 + 1), t, X(j + 1)), p4(X(i), t, X(j + 1)), up);
      if (!Kk(i - 1, j)) bank(X(i), X(j), X(i), X(j + 1), -1, 0); if (!Kk(i1 + 1, j)) bank(X(i1 + 1), X(j), X(i1 + 1), X(j + 1), 1, 0);
      for (let q = i; q <= i1; q++) { if (!Kk(q, j - 1)) bank(X(q), X(j), X(q + 1), X(j), 0, -1); if (!Kk(q, j + 1)) bank(X(q), X(j + 1), X(q + 1), X(j + 1), 0, 1); }
      i = i1;
    }
    bb.setFromObject(m.ground); // and on out to wherever the ground ends
    for (const [x0, x1, z0, z1] of [[bb.min.x, bb.max.x, bb.min.z, -G], [bb.min.x, bb.max.x, G, bb.max.z], [bb.min.x, -G, -G, G], [G, bb.max.x, -G, G]]) if (x1 - x0 > .01 && z1 - z0 > .01) quad(L, p4(x0, t, z0), p4(x1, t, z0), p4(x1, t, z1), p4(x0, t, z1), up);
  }
  for (const [k, L] of Object.entries(out)) {
    if (!L.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L), 3)); g.computeVertexNormals();
    const lay = live(new THREE.Mesh(g, SNOW_LAY)); lay.userData.snow = true; m.root.add(lay); if (k === 'det') detail(lay);
  }
  m.root.add(snowFall(1200, R));
  if (seasonNow()?.lights && hasG) eaveLights(m);
}
// a string of coloured lights under the edge of every flat roof and big box you can see: fixed along it, stopping where something stands against it
function eaveLights(m) {
  const H = m.half, bulbs = [], wires = [], inside = (s, x, y, z) => m.solids.some(o => o !== s && o.top < 90 && o.top > y - .05 && (o.bot || 0) < y && x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ);
  for (const s of m.solids) {
    const w = s.maxX - s.minX, d = s.maxZ - s.minZ, y = s.top - .1;
    if (!s.mesh || s.top > 14 || s.top < 2.2 || s.ramp || s.peak || s.round || w < 2.2 || d < 2.2 || s.top - (s.bot || 0) < .3 || Math.abs(s.minX + w / 2) > H || Math.abs(s.minZ + d / 2) > H) continue;
    const run = (n, f) => { // along one edge: the wire runs on wherever the edge is clear, bulbs under it
      const pts = Array.from({ length: n + 1 }, (_, i) => f(i / n)), clear = pts.map(([x, z]) => !inside(s, x, y, z));
      for (let i = 0; i < n; i++) if (clear[i] && clear[i + 1]) { wires.push([[pts[i][0], y, pts[i][1]], [pts[i + 1][0], y, pts[i + 1][1]]]); bulbs.push([(pts[i][0] + pts[i + 1][0]) / 2, y - .09, (pts[i][1] + pts[i + 1][1]) / 2, BULB_COLS[bulbs.length % BULB_COLS.length]]); }
    };
    for (const z of [s.minZ - .04, s.maxZ + .04]) run(Math.round(w / .6), k => [s.minX + w * k, z]);
    for (const x of [s.minX - .04, s.maxX + .04]) run(Math.round(d / .6), k => [x, s.minZ + d * k]);
    if (bulbs.length > 2400) break;
  }
  if (bulbs.length) for (const o of kitStrings(bulbs, wires)) { live(o); o.userData.bulbs = true; m.root.add(o); detail(o); }
}
