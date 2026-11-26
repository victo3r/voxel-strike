startMap('temple', {
  name: 'Temple Courtyard', size: 'small', half: 28, surf: 'grass',
  env: { sky: 0xf0e2e6, fog: 0xf0e2e6, fogNear: 38, fogFar: 135, hemiSky: 0xfff6f4, hemiGround: 0x8c9868, hemi: 1, sunColor: 0xfff1e2, sun: 1.3, sunDir: [11, 20, 15] }, // a spring morning
  pads: [[-17, -20.9, 2.4], [20, -7, 1.5], [-17, 16.6, 0.45], [0, 25.3, 3.6]],
  crates: [],
}, () => {
const M = MAPS.temple, rnd = seeded(1204);
let gongA = 0, gongV = 0;
// duels (js/duel.js): where the two stand off and first spawn, the gong to start (it swings) and a puff of petals
M.duel = { stand: [[0, -5.2], [0, 5.2]], ends: [[0, -8.4], [0, 21]], go: 'templeGong', puff: 0xf4bfd2, onGo: () => { gongV += 1.6; } };

// materials
const plaster = surf(lam({ map: tex(g => { noise(g, [234, 228, 214], 7); g.fillStyle = 'rgba(160,140,120,.12)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) }), 'stone');
const red = surf(lam({ map: tex(g => { noise(g, [178, 50, 36], 12); g.fillStyle = 'rgba(90,12,6,.22)'; for (const x of [3, 10]) g.fillRect(x, 0, 1, 16); }) }), 'wood');
const deck = surf(lam({ map: tex(g => { noise(g, [136, 98, 66], 14); g.fillStyle = 'rgba(50,30,18,.4)'; for (const y of [0, 5, 10]) g.fillRect(0, y, 16, 1); g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 4; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }) }), 'wood');
const dark = surf(lam({ map: tex(g => { noise(g, [86, 62, 46], 12); g.fillStyle = 'rgba(30,18,10,.3)'; for (const y of [5, 11]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const tileTex = rows => tex(g => { noise(g, [84, 92, 104], 10); for (const k of [1, 5, 9, 13]) { g.fillStyle = 'rgba(18,22,30,.5)'; rows ? g.fillRect(0, k, 16, 1) : g.fillRect(k, 0, 1, 16); g.fillStyle = 'rgba(255,255,255,.12)'; rows ? g.fillRect(0, k + 2, 16, 1) : g.fillRect(k + 2, 0, 1, 16); } });
const tileX = surf(lam({ map: tileTex(false) }), 'stone'), tileZ = surf(lam({ map: tileTex(true) }), 'stone'); // the rows run down a roof whose ridge is along x, or along z
const capMat = surf(lam({ color: 0x4e5662 }), 'stone');
const stone = surf(lam({ map: tex(g => { noise(g, [160, 156, 148], 14); g.fillStyle = 'rgba(70,66,60,.22)'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(5, 0, 1, 7); g.fillRect(12, 8, 1, 7); }) }), 'stone');
const rock = surf(lam({ map: tex(g => { noise(g, [130, 128, 118], 22); g.fillStyle = 'rgba(88,118,60,.35)'; for (let i = 0; i < 7; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) }), 'stone');
const bronze = surf(lam({ color: 0x8a6a3a, emissive: 0x1a1006 }), 'metal'), gongMat = surf(lam({ color: 0xc89a48, emissive: 0x3a260a }), 'metal'), gold = lam({ color: 0xd8a640, emissive: 0x3a2808 });
const bark = surf(lam({ map: tex(g => { noise(g, [80, 58, 50], 16); g.fillStyle = 'rgba(30,18,14,.35)'; for (const y of [3, 9, 13]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const blooms = [[246, 194, 212], [238, 168, 194], [250, 216, 228]].map(c => lam({ map: tex(g => { noise(g, c, 22); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); g.fillStyle = 'rgba(196,86,128,.4)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }) }));
const pine = lam({ map: tex(g => { noise(g, [52, 92, 62], 20); g.fillStyle = 'rgba(20,40,24,.35)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const moss = lam({ map: tex(g => { noise(g, [96, 132, 66], 18); g.fillStyle = 'rgba(60,90,40,.4)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }) });
const glowMat = lam({ color: 0xffe0a8, emissive: 0xffb050, emissiveIntensity: 1.2 });
const lanternRed = lam({ color: 0xd8402c, emissive: 0xb02410, emissiveIntensity: .8 });
const black = lam({ color: 0x1c1814 }), white = lam({ color: 0xf2eee6 }), cloth = lam({ color: 0x8a2a24 }), orange = lam({ color: 0xf0902a });
const decal = (o, k = -2) => lam({ ...o, polygonOffset: true, polygonOffsetFactor: k, polygonOffsetUnits: k });
const paveMat = decal({ map: tex(g => { noise(g, [184, 178, 166], 10); g.fillStyle = 'rgba(96,88,76,.35)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); }) });
const gravelMat = decal({ map: tex(g => { noise(g, [224, 218, 204], 16); g.fillStyle = 'rgba(150,140,120,.4)'; for (const y of [1, 5, 9, 13]) g.fillRect(0, y, 16, 1); }) });
const mossMat = decal({ map: moss.map }, -4), bedMat = decal({ map: tex(g => { noise(g, [70, 82, 64], 18); g.fillStyle = 'rgba(30,36,28,.4)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }) });
const water = lam({ color: 0x4a9894, emissive: 0x0a2422, transparent: true, opacity: .66, depthWrite: false });
const lattice = seeThru(tex(g => { g.fillStyle = '#5a3a26'; for (const k of [0, 4, 8, 12]) { g.fillRect(k, 0, 1, 16); g.fillRect(0, k, 16, 1); } }));
lattice.polygonOffset = true; lattice.polygonOffsetFactor = lattice.polygonOffsetUnits = -2;
const petalDots = seeThru(tex(g => { g.clearRect(0, 0, 16, 16); for (let i = 0; i < 22; i++) { g.fillStyle = Math.random() < .5 ? '#f4b8cc' : '#fbd8e4'; g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); } }));
petalDots.polygonOffset = true; petalDots.polygonOffsetFactor = petalDots.polygonOffsetUnits = -3;

// helpers
const FL = 1.5, T = .3; // the hall, the walkway and the bridges stand this high
const pieces = [], cyls = []; // they get their hitboxes once everything's placed and turned
const piece = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); add(b); pieces.push(b); return b; };
const tpiece = (w, h, d, m, x, y, z) => { const b = tbox(w, h, d, m); b.position.set(x, y, z); add(b); pieces.push(b); return b; };
const own = b => { pieces.splice(pieces.lastIndexOf(b), 1); return b; }; // has a hitbox of its own
const cyl = (r0, r1, h, m, x, y, z, n = 10) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n), m); c.position.set(x, y, z); add(c); cyls.push(c); return c; };
const slab = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);
const solid = (x0, x1, z0, z1, bot, top, s = 'stone', more) => { const o = { mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot, top, surf: s, ...more }; building.solids.push(o); return o; };
const flat = (x0, x1, z0, z1, m, y = .012, k = 2) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / k, uv.getY(i) * (z1 - z0) / k); add(p); return p;
};
const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
// a beam of thickness th from a to b (branches, struts)
const strut = (a, b, th, m) => { _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _d.length(), s = box(th, L, th, m); s.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); s.quaternion.setFromUnitVectors(UP, _d.normalize()); add(s); return s; };
// a post that stops you and bullets
const post = (x, z, y0, y1, w = .3, m = red) => { const p = own(tpiece(w, y1 - y0, w, m, x, (y0 + y1) / 2, z)); building.cover.push(p); solid(x - w / 2, x + w / 2, z - w / 2, z + w / 2, y0, y1, 'wood'); return p; };
// a wall along ax from lo to hi, across c0 to c1, with holes [middle, width, bottom, top]
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
// window and door frames on a wall's face, out toward (ox, oz), and a lattice in the windows
function trim(ax, face, holes, ox, oz, mid0) {
  for (const [mid, w, y0, y1] of holes) {
    const at = (along, y, dw, dh, dd) => ax === 'z' ? piece(dd, dh, dw, dark, face + ox * dd / 2, y, along) : piece(dw, dh, dd, dark, along, y, face + oz * dd / 2);
    detail(at(mid, y1 + .06, w + .24, .12, .1));
    for (const e of [-1, 1]) detail(at(mid + e * (w / 2 + .06), (y0 + y1) / 2, .12, y1 - y0, .08));
    if (y0 > FL + .1) {
      detail(at(mid, y0 - .04, w + .3, .08, .16));
      const l = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), lattice); l.position.set(ax === 'z' ? mid0 : mid, (y0 + y1) / 2, ax === 'z' ? mid : mid0); if (ax === 'z') l.rotation.y = Math.PI / 2;
      const uv = l.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / .5, uv.getY(i) * (y1 - y0) / .5); add(l);
    }
  }
}
// a gable roof on walls h high over [x0, x1] x [z0, z1]: the ridge along ax at y1, the eaves out past the walls by o (past the ends by oe), the ends filled in with m
function gable(ax, x0, x1, z0, z1, h, y1, m, o, th, rm, oe = [o, o]) {
  const AX = ax === 'x', [l0, l1, c0, c1] = AX ? [x0, x1, z0, z1] : [z0, z1, x0, x1], mid = (c0 + c1) / 2, hw = (c1 - c0) / 2;
  let a = Math.atan2(y1 - h, hw); for (let k = 0; k < 3; k++) a = Math.atan2(y1 - h - th / Math.cos(a), hw); // the underside meets the wall tops
  const t = Math.tan(a), yw = y1 - hw * t, H = hw + o, ye = y1 - H * t, len = l1 - l0 + oe[0] + oe[1], cl = (l0 - oe[0] + l1 + oe[1]) / 2;
  for (const e of [-1, 1]) {
    const r = AX ? tbox(len, th, H / Math.cos(a), rm) : tbox(H / Math.cos(a), th, len, rm), cc = mid + e * (H / 2 - th / 2 * Math.sin(a)), cy = (y1 + ye) / 2 - th / 2 * Math.cos(a);
    if (AX) { r.position.set(cl, cy, cc); r.rotation.x = e * a; } else { r.position.set(cc, cy, cl); r.rotation.z = -e * a; }
    add(r); building.cover.push(r);
  }
  const rc = AX ? box(len + .2, .2, .34, capMat) : box(.34, .2, len + .2, capMat); rc.position.set(AX ? cl : mid, y1 + .05, AX ? mid : cl); add(rc); meshSolids(rc, 'stone'); // the ridge
  for (const e of [-1, 1]) { const tip = box(.3, .34, .3, capMat); tip.position.set(AX ? cl + e * (len / 2 + .1) : mid, y1 + .2, AX ? mid : cl + e * (len / 2 + .1)); tip.rotation[AX ? 'z' : 'x'] = e * .5 * (AX ? -1 : 1); detail(tip); add(tip); } // its ends turn up
  const d = th / 2 / Math.cos(a), sh = new THREE.Shape([[c0, h], [c1, h], [c1, yw - d], [mid, y1 - d], [c0, yw - d]].map(([p, q]) => new THREE.Vector2(p, q)));
  for (const at of [l0, l1 - T]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), m); g.userData.uvk = 1;
    if (AX) { g.rotation.y = -Math.PI / 2; g.position.x = at + T; } else g.position.z = at;
    add(g); building.cover.push(g);
  }
  for (const e of [-1, 1]) for (const s of slopeSolids(AX ? 'z' : 'x', mid + e * H, mid, ye, y1, l0 - oe[0], l1 + oe[1], th / Math.cos(a), 'stone')) { // each side, the ends filled up to it
    const [u0, u1] = AX ? [Math.max(s.minZ, c0), Math.min(s.maxZ, c1)] : [Math.max(s.minX, c0), Math.min(s.maxX, c1)];
    if (s.bot > h && u1 > u0) for (const at of [l0, l1 - T]) building.solids.push({ mesh: null, minX: AX ? at : u0, maxX: AX ? at + T : u1, minZ: AX ? u0 : at, maxZ: AX ? u1 : at + T, bot: h, top: s.bot, surf: 'stone' });
  }
}
// stairs: a ramp you walk from a (y0) to b (y1) along ax, across c0..c1, and the steps you see; at(p) is the tread under a spot along them
function stairs(ax, a, b, c0, c1, y0, y1, m = stone) {
  const n = Math.max(2, Math.round((y1 - y0) / .3)), lo = Math.min(a, b), hi = Math.max(a, b), len = (hi - lo) / n, mid = (c0 + c1) / 2;
  building.solids.push({ mesh: null, minX: ax === 'x' ? lo : c0, maxX: ax === 'x' ? hi : c1, minZ: ax === 'x' ? c0 : lo, maxZ: ax === 'x' ? c1 : hi, bot: y0, top: y1, ramp: { ax, a, b }, surf: m.userData.surf });
  for (let k = 0; k < n; k++) {
    const p = a + (b - a) * (k + .5) / n, top = y0 + (y1 - y0) * (k + .5) / n;
    const st = ax === 'x' ? tbox(len, top - y0, c1 - c0, m) : tbox(c1 - c0, top - y0, len, m);
    st.position.set(ax === 'x' ? p : mid, (top + y0) / 2, ax === 'x' ? mid : p); add(st); building.cover.push(st);
  }
  return p => y0 + (y1 - y0) * (Math.min(n - 1, Math.max(0, Math.floor((p - a) / (b - a) * n))) + .5) / n;
}
// a red railing from (x0, y0, z0) to (x1, y1, z1): posts at the ends (when ends says so) and between, standing on foot(x, z) if given, rails post to post
function rail(x0, y0, z0, x1, y1, z1, ends = [true, true], foot = null, hh = .9) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 1.7)), ang = Math.atan2(-(z1 - z0), x1 - x0), sl = Math.atan2(y1 - y0, L);
  const at = k => [x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, z0 + (z1 - z0) * k / n];
  for (let i = 0; i <= n; i++) {
    if (i === 0 && !ends[0] || i === n && !ends[1]) continue;
    const [x, y, z] = at(i), f = foot ? foot(x, z) : y, top = y + hh + .04;
    building.cover.push(piece(.12, top - f, .12, red, x, (f + top) / 2, z)); detail(piece(.08, .08, .08, gold, x, top + .04, z)); // a brass cap
  }
  for (const [ry, th] of [[hh - .04, .09], [hh * .42, .06]]) {
    const r = box(Math.hypot(L, y1 - y0) + .1, th, .07, red); r.position.set((x0 + x1) / 2, (y0 + y1) / 2 + ry, (z0 + z1) / 2); r.rotation.set(0, ang, sl); add(r);
  }
  for (let i = 0; i < n; i++) { const [ax, ay, az] = at(i), [bx, by, bz] = at(i + 1); solid(Math.min(ax, bx) - .07, Math.max(ax, bx) + .07, Math.min(az, bz) - .07, Math.max(az, bz) + .07, Math.min(ay, by), Math.max(ay, by) + hh, 'wood'); }
}
// a stone lantern
function lantern(x, z, s = 1) {
  const P = (w, h, d, m, y) => { const b = piece(w * s, h * s, d * s, m, x, y * s, z); return b; };
  P(.62, .22, .62, stone, .11); building.cover.push(P(.26, .85, .26, stone, .645), P(.56, .14, .56, stone, 1.14));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piece(.08 * s, .36 * s, .08 * s, stone, x + dx * .18 * s, 1.39 * s, z + dz * .18 * s);
  P(.3, .3, .3, glowMat, 1.38); building.cover.push(P(.8, .1, .8, stone, 1.62), P(.56, .1, .56, stone, 1.72)); P(.14, .16, .14, stone, 1.85);
}
// a rock, solid where you see it
const stoneAt = (x, z, w, h, d, y0 = 0, m = rock) => { slab(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h, m); };
// a cherry tree in bloom: a crooked trunk, branches out to clumps of blossom; its clumps feed the falling petals
const crowns = [];
function blossom(x, z, s = 1) {
  const r = seeded(Math.round(x * 131 + z * 71) & 0xffff | 1), lean = r() * 6.28, lx = Math.cos(lean) * .35 * s, lz = Math.sin(lean) * .35 * s;
  building.cover.push(tpiece(.46 * s, 1.5 * s, .46 * s, bark, x, .75 * s, z));
  const top = [x + lx, 2.5 * s, z + lz], up = strut([x, 1.4 * s, z], top, .4 * s, bark); building.cover.push(up); meshSolids(up, 'wood');
  const ends = [top.slice()], lv = [];
  for (let k = 0, n = 3 + (r() * 2 | 0); k < n; k++) {
    const a = k / n * 6.28 + r() * .8, L = (1.3 + r() * .8) * s, e = [top[0] + Math.cos(a) * L, top[1] + (.5 + r() * .7) * s, top[2] + Math.sin(a) * L];
    meshSolids(strut([top[0], top[1] - .1, top[2]], e, .18 * s, bark), 'wood'); ends.push(e);
  }
  ends[0][1] += 1.2 * s;
  for (const [ex, ey, ez] of ends) {
    for (let k = 0; k < 4; k++) {
      const w = (1 + r() * .8) * s, h = (.7 + r() * .5) * s, b = box(w, h, w * (.8 + r() * .4), blooms[r() * 3 | 0]);
      b.position.set(ex + (r() - .5) * .9 * s, ey + (r() - .3) * .6 * s, ez + (r() - .5) * .9 * s); r(); // square to the world, so it fits its hitbox
      const y0 = b.position.y, near = y => lv.some(v => Math.abs(v - y + h / 2) < .008 || Math.abs(v - y - h / 2) < .008); // no two clumps level, they'd flicker
      for (let t = 1; t < 20 && near(b.position.y); t++) b.position.y = y0 + (t & 1 ? 1 : -1) * Math.ceil(t / 2) * .011;
      lv.push(b.position.y - h / 2, b.position.y + h / 2); add(b); building.cover.push(b); meshSolids(b, 'grass'); // you can stand in the blossom
    }
    crowns.push([ex, ey, ez, 1.1 * s]);
  }
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(5 * s, 5 * s), petalDots); fall.rotation.x = -Math.PI / 2; fall.position.set(x + lx, .02 + crowns.length * .0015, z + lz); // each tree's a hair above the last, where two overlap
  const uv = fall.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.5 * s, uv.getY(i) * 2.5 * s); detail(fall); add(fall);
}
// a small pine, for the raised garden and the hill
function pineTree(x, z, y0, s = 1) {
  tpiece(.22 * s, 1.2 * s, .22 * s, bark, x, y0 + .6 * s, z);
  for (const [w, y, h] of [[1.8, 1, .55], [1.3, 1.5, .5], [.8, 1.95, .45]]) piece(w * s, h * s, w * s, pine, x, y0 + y * s, z);
}

// --- the ground, the paths, the outer walls ---
addGround(150, lam({ map: tex(g => { noise(g, [116, 148, 80], 16); g.fillStyle = 'rgba(70,100,46,.35)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); g.fillStyle = 'rgba(250,220,230,.6)'; for (let i = 0; i < 3; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }, 150, 150) }));
const PATHS = [[-2, 2, -13.4, 27.4], [-7.4, -2, -1.1, 1.1], [2, 15.4, -1.1, 1.1]], GRAVEL = [[3.6, 13.8, -12.6, -3.2], [3.6, 13.8, 3.2, 12.6]];
for (const [x0, x1, z0, z1] of PATHS) flat(x0, x1, z0, z1, paveMat, .012, 2);
for (const [x0, x1, z0, z1] of GRAVEL) {
  flat(x0, x1, z0, z1, gravelMat, .012, 2);
  for (const [a0, a1, b0, b1] of [[x0 - .14, x1 + .14, z0 - .14, z0], [x0 - .14, x1 + .14, z1, z1 + .14], [x0 - .14, x0, z0, z1], [x1, x1 + .14, z0, z1]]) slab(a0, a1, b0, b1, 0, .1, stone, false);
}
function outer(x0, x1, z0, z1) { // plaster on a stone footing under a tiled cap
  const along = x1 - x0 > z1 - z0, w = .2;
  slab(x0 - .06, x1 + .06, z0 - .06, z1 + .06, 0, .4, stone); slab(x0, x1, z0, z1, .4, 3, plaster);
  slab(x0 - (along ? 0 : w), x1 + (along ? 0 : w), z0 - (along ? w : 0), z1 + (along ? w : 0), 3, 3.16, capMat);
  slab(x0 + (along ? 0 : .15), x1 - (along ? 0 : .15), z0 + (along ? .15 : 0), z1 - (along ? .15 : 0), 3.16, 3.32, capMat);
}
outer(-22.6, 22.6, -27.7, -27.1); outer(22, 22.6, -27.7, 27.1); outer(-22.6, -22, -27.7, 27.1); outer(5.48, 22.6, 26.5, 27.1); outer(-22.6, -5.48, 26.5, 27.1);
addWall(0, -27.9, 60, .6); addWall(0, 27.7, 60, .6); addWall(25.3, 0, 5.4, 60); addWall(-25.3, 0, 5.4, 60);

// --- the hall on its stone podium, a veranda all round, its big roof ---
const HW = 6.5, HZ0 = -24.6, HZ1 = -18.4, HH = 5.6, FRONT = [[0, 3.4, FL, 4.4], [-4.5, 1.6, 2.5, 3.9], [4.5, 1.6, 2.5, 3.9]], SIDE = [[-21.5, 1.8, FL, 4.1]];
slab(-9, 9, -27.1, -16, 0, 1.3, stone); slab(-9, 9, -27.1, -16, 1.3, FL, deck);
wall('x', HZ1 - T, HZ1, -HW, HW, FL, HH, FRONT, plaster); wall('x', HZ0, HZ0 + T, -HW, HW, FL, HH, [], plaster);
trim('x', HZ1, FRONT, 0, 1, HZ1 - T / 2);
for (const s of [-1, 1]) { const [c0, c1] = s > 0 ? [HW - T, HW] : [-HW, -HW + T]; wall('z', c0, c1, HZ0 + T, HZ1 - T, FL, HH, SIDE, plaster); trim('z', s * HW, SIDE, s, 0, s * (HW - T / 2)); }
for (const x of [-HW + T / 2, -1.9, 1.9, HW - T / 2]) building.cover.push(tpiece(.44, HH - FL, .44, red, x, (FL + HH) / 2, HZ1 - T / 2)); // the door posts stand 2 cm into the doorway: flush with the wall's end they flickered
for (const x of [-HW + T / 2, HW - T / 2]) building.cover.push(tpiece(.44, HH - FL, .44, red, x, (FL + HH) / 2, HZ0 + T / 2));
for (const z of [HZ0, HZ1]) detail(piece(2 * (HW - T / 2 + .2), .22, .08, dark, 0, 4.65, z + (z === HZ1 ? .04 : -.04))); // a beam along the front and back, ending in the corner posts
gable('x', -HW, HW, HZ0, HZ1, HH, 8, dark, 1.7, .28, tileX);
// inside: the altar, a painting of the mountains, candles
slab(-2.4, 2.4, HZ0 + T, HZ0 + T + 1.1, FL, FL + .9, dark);
for (const x of [-1.8, 1.8]) { piece(.12, .34, .12, white, x, FL + 1.07, HZ0 + .8); piece(.06, .1, .06, glowMat, x, FL + 1.29, HZ0 + .8); }
cyl(.28, .2, .22, bronze, 0, FL + 1.01, HZ0 + .85, 12); for (const dx of [-.12, 0, .12]) detail(piece(.02, .3, .02, cloth, dx, FL + 1.25, HZ0 + .85));
for (const [dx, dz] of [[-.9, .1], [-.75, .25], [-.62, .08]]) piece(.16, .16, .16, orange, dx, FL + .98, HZ0 + .8 + dz);
piece(.6, .12, .6, cloth, .9, FL + .96, HZ0 + .85); cyl(.24, .2, .22, gold, .9, FL + 1.13, HZ0 + .85, 12);
{
  const c = document.createElement('canvas'); c.width = 32; c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#efe3c8'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#d84a30'; g.fillRect(21, 2, 4, 4);
  for (const [x0, w, h, col] of [[0, 14, 9, '#8aa0b0'], [9, 16, 12, '#6a8494'], [20, 12, 8, '#9ab0bc']]) { g.fillStyle = col; for (let i = 0; i < w; i++) { const y = 16 - h * (1 - Math.abs(i - w / 2) / (w / 2)); g.fillRect(x0 + i, y | 0, 1, 16); } }
  g.fillStyle = '#5a3a26'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 15, 32, 1); g.fillRect(0, 0, 1, 16); g.fillRect(31, 0, 1, 16);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), decal({ map: t })); p.position.set(0, 3.9, HZ0 + T + .01); add(p);
}
// the big lantern in the doorway
{ const y = 3.92, z = HZ1 - T / 2; cyl(.46, .46, .8, lanternRed, 0, y, z, 12); for (const dy of [-.43, .43]) cyl(.35, .35, .08, black, 0, y + dy, z, 12); piece(.04, .3, .04, black, 0, 4.4 - .07, z); } // over the heads of anyone in the doorway
// the front stairs, their rails, and rails round the veranda
const hallSt = stairs('z', -13.4, -16, -3, 3, 0, FL);
for (const s of [-1, 1]) {
  rail(s * 3, 0, -13.45, s * 3, FL, -16.1, [true, false], (x, z) => hallSt(z));
  rail(s * 3, FL, -16.1, s * 8.9, FL, -16.1); rail(s * 8.9, FL, -16.1, s * 8.9, FL, -19.7, [false, true]);
}
rail(-8.9, FL, -21.9, -8.9, FL, -27.05);

// --- the storehouse in the north-east corner ---
slab(9, 22, -27.1, -22, 0, 4.4, plaster);
for (const [x0, x1, z0, z1] of [[9, 22, -22, -21.94], [8.94, 9, -27.1, -22]]) slab(x0, x1, z0, z1, FL, 2.3, dark, false);
gable('z', 9, 22, -27.1, -22, 4.4, 6.2, dark, .35, .2, tileZ, [.3, .04]);
detail(piece(.9, .7, .06, dark, 15.5, 3.4, -21.97)); detail(piece(.06, .7, .9, dark, 8.97, 3.4, -24.5));
for (const k of [-.3, -.1, .1, .3]) { detail(piece(.05, .62, .04, black, 15.5 + k, 3.4, -21.92)); detail(piece(.04, .62, .05, black, 8.93, 3.4, -24.5 + k)); } // bars in its little windows

// --- the covered walkway down the east side, the bridge over to the hall ---
slab(9, 18, -22, -19.6, 0, 1.3, stone); slab(9, 18, -22, -19.6, 1.3, FL, deck);
slab(18, 21.98, -22, 14, 0, 1.3, stone); slab(18, 21.98, -22, 14, 1.3, FL, deck);
const CZ = [...[...Array(7)].map((_, k) => -21.7 + k * 20.2 / 6), ...[...Array(5)].map((_, k) => 1.5 + k * 12.2 / 4)]; // a post each side of the middle stairs
for (const z of CZ) for (const x of [18.35, 21.65]) post(x, z, FL, 3.85, .26);
for (const x of [18.35, 21.65]) piece(.3, .15, 36, dark, x, 3.925, -4);
for (const z of CZ) piece(3.6, .14, .16, dark, 20, 3.93, z);
for (const k of [1, 3, 5, 8, 10]) { // paper lanterns on arms out under the eaves, clear of the walk and its sight lines
  const z = CZ[k], y = 3.15; piece(.55, .08, .08, dark, 18.1, 3.5, z); piece(.03, .15, .03, black, 17.9, 3.425, z);
  cyl(.19, .19, .38, lanternRed, 17.9, y, z, 8); for (const dy of [-.2, .2]) cyl(.13, .13, .04, black, 17.9, y + dy, z, 8);
}
gable('z', 18.35, 21.65, -22, 14, 4, 5.1, dark, 1.05, .2, tileZ, [0, .5]);
rail(8.9, FL, -19.7, 18.1, FL, -19.7, [false, true]); rail(18.1, FL, -19.7, 18.1, FL, -1.3, [false, true]); rail(18.1, FL, 1.3, 18.1, FL, 14);
const midSt = stairs('x', 15.4, 18, -1.3, 1.3, 0, FL);
for (const s of [-1, 1]) rail(15.45, 0, s * 1.3, 18.1, FL, s * 1.3, [true, false], x => midSt(x));
const endSt = stairs('z', 16.6, 14, 18.2, 22, 0, FL);
rail(18.15, 0, 16.55, 18.1, FL, 14, [true, false], (x, z) => endSt(z));
for (const s of [-1, 1]) lantern(14.4, s * 2.4);

// --- the gong tower in the north-west corner, its bridge to the hall, a raised moss garden between ---
const TX = -15.2, TY = 2.4;
slab(-22, TX, -27.1, -19.6, 0, TY, stone);
for (const x of [-21.5, -15.6]) for (const z of [-26.6, -20]) post(x, z, TY, 5.3, .3);
for (const x of [-21.5, -15.6]) piece(.34, .16, 7, dark, x, 5.22, -23.3);
for (const z of [-26.6, -20]) piece(6.3, .16, .34, dark, -18.55, 5.22, z);
gable('z', -21.5, -15.6, -26.6, -20, 5.3, 6.9, dark, .9, .22, tileZ);
// the gong in its frame, its mallet
for (const z of [-24.4, -21.6]) { post(-18.55, z, TY, 4.95, .22, dark); detail(piece(.6, .12, .3, dark, -18.55, TY + .06, z)); }
piece(.22, .2, 3, dark, -18.55, 5.05, -23); solid(-18.65, -18.41, -23.86, -22.14, 3.04, 4.76, 'metal'); // the gong where it hangs (it only sways)
const gong = live(new THREE.Group()); gong.position.set(-18.55, 4.95, -23); add(gong);
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .08, 28), gongMat); disc.rotation.z = Math.PI / 2; disc.position.y = -1.05; gong.add(disc);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .16, 28, 1, true), bronze); rim.rotation.z = Math.PI / 2; rim.position.y = -1.05; gong.add(rim);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, .16, 16), bronze); boss.rotation.z = -Math.PI / 2; boss.position.set(.06, -1.05, 0); gong.add(boss);
  for (const z of [-.45, .45]) { const r = box(.03, .4, .03, black); r.position.set(0, -.2, z); gong.add(r); }
}
detail(piece(.18, .05, .05, dark, -18.35, TY + 2, -21.6)); detail(piece(.02, .2, .02, black, -18.3, TY + 1.88, -21.6)); detail(piece(.05, .7, .05, dark, -18.3, TY + 1.43, -21.6)); detail(cyl(.13, .13, .24, cloth, -18.3, TY + .96, -21.6, 8)); // the mallet hangs on a peg
// stairs up its south side, rails round the top and down the bridge
const towSt = stairs('z', -15.6, -19.6, -22, -19.85, 0, TY);
rail(-19.85, 0, -15.65, -19.85, TY, -19.7, [true, false], (x, z) => towSt(z));
rail(-19.85, TY, -19.7, -15.3, TY, -19.7); rail(-15.3, TY, -21.9, -15.3, TY, -27.05);
{
  const sh = new THREE.Shape([[TX, 0], [-9, 0], [-9, FL - .2], [TX, TY - .2]].map(([a, b]) => new THREE.Vector2(a, b)));
  const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false }), stone); g.position.z = -22; g.userData.uvk = 1; add(g); building.cover.push(g);
  solid(TX, -9, -22, -19.6, 0, FL); solid(TX, -9, -22, -19.6, FL, TY, 'wood', { ramp: { ax: 'x', a: -9, b: TX } });
  const a = Math.atan2(TY - FL, -9 - TX), L = Math.hypot(-9 - TX, TY - FL), d = tbox(L, .2, 2.46, deck); // a hair wider than the stone under it
  d.position.set((TX - 9) / 2 - .1 * Math.sin(a), (TY + FL) / 2 - .1 * Math.cos(a), -20.8); d.rotation.z = -a; add(d); building.cover.push(d);
  rail(-15.3, TY, -19.7, -8.9, FL, -19.7, [false, false]); rail(-15.3, TY, -21.9, -8.9, FL, -21.9, [false, false]);
}
slab(TX, -9, -27.1, -22, 0, 1.25, stone); flat(TX, -9, -27.1, -22, mossMat, 1.262, 2);
pineTree(-12.8, -25.2, 1.25, .9); pineTree(-10.4, -23.4, 1.25, .6); stoneAt(-14, -23.3, .7, .45, .6, 1.25); stoneAt(-11, -26, .9, .35, .5, 1.25); lantern(-10.2, -26, .7);
for (const [x, z, s] of [[-11.8, -11.2, .95]]) blossom(x, z, s);

// --- the koi pond and its arched bridge ---
const POND = [[-19.6, -5.4], [-16.4, -6.8], [-12.6, -6.6], [-9.6, -4.8], [-8.4, -1.6], [-8.8, 2.2], [-10.4, 5.4], [-13.4, 7.2], [-17, 6.9], [-19.4, 4.6], [-20.2, .6]];
const inPond = (x, z) => { let c = false; for (let i = 0, j = POND.length - 1; i < POND.length; j = i++) { const [xi, zi] = POND[i], [xj, zj] = POND[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
{
  const sh = new THREE.Shape(POND.map(([x, z]) => new THREE.Vector2(x, -z)));
  const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), water); w.rotation.x = -Math.PI / 2; w.position.y = .22; w.renderOrder = 1; add(w);
  const bed = new THREE.Mesh(new THREE.ShapeGeometry(sh), bedMat); bed.rotation.x = -Math.PI / 2; bed.position.y = .015; add(bed);
  const uv = bed.geometry.attributes.uv, P = bed.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) / 2, P.getY(i) / 2);
  const r = seeded(33);
  for (let i = 0; i < POND.length; i++) { // stones round the edge
    const [ax, az] = POND[i], [bx, bz] = POND[(i + 1) % POND.length], L = Math.hypot(bx - ax, bz - az), n = Math.round(L / .8);
    for (let k = 0; k < n; k++) {
      const x = ax + (bx - ax) * (k + .5) / n, z = az + (bz - az) * (k + .5) / n;
      if (Math.abs(z) < 1.5 && (x < -19 || x > -9.4)) continue; // where the bridge comes down
      const w = .5 + r() * .3, h = .24 + r() * .16; stoneAt(x, z, w, h, .45 + r() * .2);
    }
  }
  for (const [x, z, rr] of [[-11.2, -3.4, .4], [-12, -2.6, .3], [-16.8, 3.2, .45], [-10.6, 3.4, .35], [-15.2, -4.8, .32]]) { const p = cyl(rr, rr, .02, decal({ color: 0x4e8a3c }, -3), x, .235, z, 9); p.rotation.y = rr * 9; detail(p); }
  for (const [x, z] of [[-11.1, -3.3], [-16.6, 3.3]]) { const f = piece(.14, .1, .14, lam({ color: 0xf6b6c8 }), x, .3, z); f.rotation.y = .7; detail(f); }
  // an island with a snow-viewing lantern
  stoneAt(-17.4, 3.6, 1.3, .32, 1.1); stoneAt(-17.2, 3.4, .8, .2, .7, .32);
  for (const [dx, dz] of [[-.32, -.25], [.32, -.25], [0, .35]]) piece(.08, .6, .08, stone, -17.2 + dx, .82, 3.4 + dz);
  piece(.36, .3, .36, glowMat, -17.2, 1.25, 3.4); building.cover.push(piece(1.3, .1, 1.3, stone, -17.2, 1.45, 3.4), piece(.7, .1, .7, stone, -17.2, 1.55, 3.4)); piece(.14, .14, .14, stone, -17.2, 1.67, 3.4);
}
// the bridge: up and over in ten straight runs, red beams under the deck, rails along both sides
{
  const XA = -20.8, XB = -7.4, N = 10, PEAK = 1.5, yAt = x => PEAK * Math.sin(Math.PI * (x - XA) / (XB - XA)), xs = [...Array(N + 1)].map((_, k) => XA + (XB - XA) * k / N);
  for (let k = 0; k < N; k++) {
    const a = xs[k], b = xs[k + 1], ya = yAt(a), yb = yAt(b), lo = Math.min(ya, yb), hi = Math.max(ya, yb), ang = Math.atan2(yb - ya, b - a), L = Math.hypot(b - a, yb - ya);
    solid(a, b, -1.1, 1.1, lo, hi, 'wood', { ramp: { ax: 'x', a: ya < yb ? a : b, b: ya < yb ? b : a } });
    const dk = tbox(L + .04, .14, 2.2, deck); dk.position.set((a + b) / 2 - .07 * Math.sin(-ang), (ya + yb) / 2 - .07 * Math.cos(ang), 0); dk.rotation.z = ang; add(dk); building.cover.push(dk);
    for (const s of [-1, 1]) { const bm = box(L + .06, .3, .12, red); bm.position.set((a + b) / 2, (ya + yb) / 2 - .24, s * 1.16); bm.rotation.z = ang; add(bm); meshSolids(bm, 'wood', .5); }
  }
  for (const s of [-1, 1]) for (let k = 0; k < N; k += 2) rail(xs[k], yAt(xs[k]), s * 1.06, xs[k + 2], yAt(xs[k + 2]), s * 1.06, [true, k + 2 === N]);
  for (const s of [-1, 1]) lantern(-6.9, s * 2.3);
}
// koi: four boxes each [size, offset], all of them in one instanced mesh
const KOI_PARTS = [[.42, .1, .16, 0, 0, 0], [.14, .09, .13, .24, 0, 0], [.16, .03, .17, -.02, .06, 0], [.16, .08, .02, -.27, 0, 0]];
const koi = [[0xf08a2a, 0xf8f2ea], [0xf8f2ea, 0xe0402a], [0xe8b040, 0xe8b040], [0x2a2622, 0xf08a2a], [0xf8f2ea, 0xf08a2a], [0xe0402a, 0xf8f2ea], [0xf0a030, 0x2a2622]].map(([c1, c2], i) =>
  ({ cols: [c1, c2, c2, c1], a: i * .9, w: (.18 + (i % 3) * .06) * (i % 2 ? 1 : -1), rx: 2.6 + (i % 4) * .55, rz: 2 + ((i + 2) % 4) * .6, cx: -14.3 + (i % 3 - 1) * .5, cz: .2 + (i % 2 - .5) * .6 }));
const koiM = live(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam({ color: 0xffffff }), koi.length * 4)); koiM.frustumCulled = false; detail(koiM); add(koiM);
koi.forEach((f, i) => f.cols.forEach((c, k) => koiM.setColorAt(i * 4 + k, tint.setHex(c))));

// --- the courtyard: the incense burner, lanterns, gravel gardens with their rocks, trees ---
{
  const X = 0, Z = -10.6;
  slab(X - .7, X + .7, Z - .7, Z + .7, 0, .3, stone, false);
  building.cover.push(cyl(.8, .55, .75, bronze, X, .675, Z, 14)); cyl(.86, .86, .08, bronze, X, 1.09, Z, 14); cyl(.76, .76, .02, lam({ color: 0xb8a88a }), X, 1.13, Z, 14);
  for (const s of [-1, 1]) piece(.12, .22, .3, bronze, X + s * .9, 1.02, Z);
  for (let i = 0; i < 7; i++) { const a = i * .9, rr = .15 + (i % 3) * .14; detail(piece(.025, .34, .025, cloth, X + Math.cos(a) * rr, 1.3, Z + Math.sin(a) * rr)); detail(piece(.03, .03, .03, glowMat, X + Math.cos(a) * rr, 1.48, Z + Math.sin(a) * rr)); }
}
for (const [x, z] of [[-3.6, -11.6], [3.6, -11.6], [-3.6, 19.4], [3.6, 19.4]]) lantern(x, z);
for (const [x, z, rr] of [[6.4, -9.4, 1], [10.8, -5.6, .8], [7.6, 9.6, .9], [11.6, 5.4, 1.1]]) { // rocks set in the gravel, moss round their feet
  stoneAt(x, z, 1.3 * rr, .9 * rr, 1 * rr); stoneAt(x + .5 * rr, z + .3 * rr, .7 * rr, 1.4 * rr, .6 * rr); stoneAt(x - .9 * rr, z - .2 * rr, .6 * rr, .5 * rr, .7 * rr);
  flat(x - 1.6 * rr, x + 1.4 * rr, z - 1.1 * rr, z + 1.2 * rr, mossMat, .016, 1);
}
for (const [x, z, s] of [[-6.6, 12.5, 1.1], [-15.5, 11, 1], [11.6, 18.4, 1], [13.2, -15.4, .95], [-8.2, 20.4, .8], [8.2, 20.4, .8]]) blossom(x, z, s);
stoneAt(-9.2, -9, 1, .7, .9); stoneAt(-8.7, -8.6, .6, 1.1, .5); stoneAt(-5.6, -14.6, .8, .5, .7);

// --- the south-west: a tea pavilion and a rack of wishes ---
{
  const X0 = -19.5, X1 = -14.5, Z0 = 15, Z1 = 20;
  slab(X0, X1, Z0, Z1, 0, .25, stone); slab(X0, X1, Z0, Z1, .25, .45, deck);
  for (const x of [X0 + .2, X1 - .2]) for (const z of [Z0 + .2, Z1 - .2]) post(x, z, .45, 2.9, .24, dark);
  for (const z of [Z0 + .2, Z1 - .2]) piece(4.84, .14, .28, dark, -17, 2.97, z);
  for (const x of [X0 + .2, X1 - .2]) piece(.28, .14, 4.84, dark, x, 2.97, 17.5);
  gable('x', X0 + .2, X1 - .2, Z0 + .2, Z1 - .2, 3.04, 4.3, dark, .8, .18, tileX);
  slab(-17.7, -16.3, 18.2, 19.2, .45, .8, dark); for (const z of [17.7, 19.7]) detail(piece(.6, .08, .5, cloth, -17, .49, z)); // a low table, cushions
  cyl(.1, .12, .16, lam({ color: 0x3a5a4a }), -17.2, .88, 18.7, 8); for (const dx of [.15, .35]) cyl(.05, .04, .07, white, -17 + dx, .835, 18.6, 8);
}
{ // the rack of little wooden wishes
  const X = -11.4, Z = 16.2;
  for (const dx of [-1.1, 1.1]) post(X + dx, Z, 0, 1.9, .14, dark);
  for (const y of [1.2, 1.7]) piece(2.4, .08, .08, dark, X, y, Z);
  piece(2.8, .12, .5, dark, X, 1.96, Z);
  const r = seeded(9);
  for (const y of [1.2, 1.7]) for (let k = 0; k < 9; k++) { const p = piece(.18, .14, .02, deck, X - .9 + k * .225 + (r() - .5) * .05, y - .12, Z + (k % 2 ? .05 : -.05)); p.rotation.z = (r() - .5) * .3; detail(p); }
}

// --- the south-east: a stone pagoda, a water basin, a bamboo clump ---
{
  const X = 15.6, Z = 22.4;
  slab(X - .8, X + .8, Z - .8, Z + .8, 0, .35, stone);
  let y = .35;
  for (let k = 0; k < 5; k++) { const w = 1 - k * .12; building.cover.push(tpiece(w * .7, .45, w * .7, stone, X, y + .225, Z)); y += .45; building.cover.push(tpiece(w * 1.5, .14, w * 1.5, stone, X, y + .07, Z)); y += .14; }
  piece(.12, .5, .12, bronze, X, y + .25, Z);
}
{
  const X = 9, Z = 16;
  slab(X - .5, X + .5, Z - .5, Z + .5, 0, .55, stone); flat(X - .38, X + .38, Z - .38, Z + .38, decal({ color: 0x4a8a88 }), .556, 1);
  const bam = lam({ color: 0x7aa04a }); detail(strut([X + .9, 0, Z], [X + .9, 1.1, Z], .09, bam)); detail(strut([X + .9, 1, Z], [X + .25, .85, Z], .07, bam)); detail(piece(.03, .28, .03, lam({ color: 0xa8d8de, emissive: 0x2a4a4e }), X + .26, .7, Z)); // its trickle detail(piece(.32, .04, .06, dark, X + .1, .61, Z + .2));
}
{
  const X0 = 18.4, X1 = 22, Z0 = 20.5, Z1 = 26.5, r = seeded(51), bam = [0x7aa04a, 0x6a9442, 0x8ab05a].map(c => lam({ color: c }));
  for (let i = 0; i < 26; i++) { const h = 5 + r() * 3, x = X0 + .2 + r() * (X1 - X0 - .4), z = Z0 + .2 + r() * (Z1 - Z0 - .4), s = piece(.12, h, .12, bam[i % 3], x, h / 2, z); building.cover.push(s); detail(piece(.9, .4, .9, pine, x, h, z)); }
  for (const [a, b] of [[[X0, Z0], [X1, Z0]], [[X0, Z0], [X0, Z1]]]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / .5); for (let k = 0; k <= n; k++) piece(.07, .85, .07, bam[0], a[0] + (b[0] - a[0]) * k / n, .425, a[1] + (b[1] - a[1]) * k / n); for (const y of [.35, .75]) piece(b[0] - a[0] + .05, .05, b[1] - a[1] + .05, dark, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); }
}
for (const [x, z, w, d] of [[-21.2, 9, 1.4, 2.6], [-14, 25.6, 2.6, 1.6], [14.2, 25.6, 2.2, 1.6], [-21.2, -12, 1.4, 2.4]]) { const r = seeded(x * 7 + z | 1); stoneAt(x, z, w, .7, d, 0, lam({ color: 0x4e7a3e })); for (let k = 0; k < 5; k++) { const f = piece(.24, .2, .24, lam({ color: r() < .5 ? 0xe86a8a : 0xf2a2b6 }), x + (r() - .5) * w * .8, .72, z + (r() - .5) * d * .8); f.rotation.y = r(); detail(f); } } // azaleas

// --- the gate: a passage under a gallery you climb to from either side ---
{
  const XS = [-5.25, -1.95, 1.95, 5.25], ZS = [23.85, 26.85];
  for (const x of XS) for (const z of ZS) { post(x, z, 0, 3.35, .46); post(x, z, 3.6, 6, .34); }
  for (const s of [-1, 1]) { // the side bays, walled in, a lattice window each
    slab(s > 0 ? 1.95 : -5.25, s > 0 ? 5.25 : -1.95, 23.85, 26.85, 0, 3.35, plaster);
    detail(piece(1.8, 1.2, .05, dark, s * 3.6, 1.9, 23.825)); const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), lattice); l.position.set(s * 3.6, 1.9, 23.79); add(l);
    const uv = l.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.2, uv.getY(i) * 2);
    const door = piece(.1, 3, 1.5, dark, s * 1.9, 1.55, 25.3); building.cover.push(door); // the doors stand open against the bays
    for (const y of [.6, 1.55, 2.5]) for (const dz of [-.45, 0, .45]) detail(piece(.04, .07, .07, gold, s * 1.83, y, 25.3 + dz));
  }
  piece(3.5, .12, .3, dark, 0, .06, 26.85); // the sill
  slab(-5.6, 5.6, 23.5, 27.1, 3.35, 3.6, deck);
  for (const z of ZS) piece(10.84, .16, .38, dark, 0, 6.08, z);
  for (const x of XS) piece(.38, .16, 3.38, dark, x, 6.08, 25.35);
  gable('x', -5.25, 5.25, 23.85, 26.85, 6.16, 8, dark, 1.3, .24, tileX);
  rail(-5.55, 3.6, 23.55, 5.55, 3.6, 23.55); rail(-5.55, 3.6, 27.05, 5.55, 3.6, 27.05);
  for (const s of [-1, 1]) {
    rail(s * 5.55, 3.6, 23.55, s * 5.55, 3.6, 24.7, [false, true]); rail(s * 5.55, 3.6, 26.5, s * 5.55, 3.6, 27.05, [true, false]);
    const st = stairs('x', s * 11.5, s * 5.6, 24.7, 26.5, 0, 3.6);
    rail(s * 11.45, 0, 24.75, s * 5.55, 3.6, 24.75, [true, false], x => st(x));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.95, .36), decal({ map: tex(g => { g.fillStyle = '#2a1c14'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#d8a640'; g.fillRect(1, 1, 14, 1); g.fillRect(1, 14, 14, 1); g.fillRect(1, 1, 1, 14); g.fillRect(14, 1, 1, 14); g.fillRect(5, 4, 6, 1); g.fillRect(7, 4, 2, 9); g.fillRect(4, 8, 8, 1); g.fillRect(5, 12, 6, 1); }) }));
  sign.position.set(0, 5.78, 23.62); sign.rotation.y = Math.PI; add(sign); detail(piece(1.1, .44, .06, dark, 0, 5.78, 23.66)); // hung from the beam
}
// a path out of the gate between lanterns and pines, mountains in the haze
flat(-2, 2, 27.4, 60, paveMat, .012, 2);
for (let z = 31; z < 58; z += 5) for (const s of [-1, 1]) { lantern(s * 3, z, .9); pineTree(s * (6 + (z % 3)), z + 1.5, 0, 1.3); }

const inside = o => Math.max(Math.abs(o.position.x), Math.abs(o.position.z)) < M.half;
propSolids(pieces.filter(inside), m => m.material === glowMat && m.geometry.parameters.width < .1); // every piece inside the walls, now they're all placed (flames aside)
for (const c of cyls) if (inside(c) && !detailObjs.includes(c)) { // cylinders stand round
  const { radiusTop: a, radiusBottom: b, height: h } = c.geometry.parameters, R = Math.max(a, b), [x, y, z] = c.position.toArray();
  if (c.rotation.x || c.rotation.z) meshSolids(c); else solid(x - R, x + R, z - R, z + R, y - h / 2, y + h / 2, c.material.userData?.surf, { round: R });
}

// --- outside the walls: bamboo east and west, the hill behind with a pagoda, mountains round ---
{
  const r = seeded(808), stalks = [], tops = [];
  for (let i = 0; i < 360; i++) {
    const s = i % 2 ? 1 : -1, x = s * (23.4 + r() * 18), z = -30 + r() * 62, h = 6 + r() * 6;
    stalks.push([x, h / 2, z, 1, h, 1, 0, [0x8ab05a, 0x7aa04a, 0x6a9442][i % 3]]); tops.push([x, h, z, 1, 1, 1, r() * 3, [0xffffff, 0xd8e8c8, 0xc8dcb4][i % 3]]);
  }
  instanced(new THREE.BoxGeometry(.13, 1, .13), lam({ color: 0xffffff }), stalks);
  instanced(new THREE.BoxGeometry(1.3, .6, 1.3), pine, tops);
  const hill = lam({ map: moss.map });
  const TER = [[-28.4, -38, 3.5], [-34, -48, 7], [-44, -62, 12], [-58, -80, 18], [-76, -100, 25]], ridge = x => 1 + .22 * Math.sin(x * .055 + 1.3) + .1 * Math.sin(x * .16 + .4);
  const terH = (k, x) => k < 2 ? TER[k][2] : TER[k][2] * ridge(Math.max(-60, Math.min(60, Math.round(x / 10) * 10))); // the upper terraces roll
  boxesMesh(TER.flatMap(([z0, z1], k) => (k < 2 ? [0] : [...Array(13)].map((_, i) => -60 + i * 10)).map(x => [k < 2 ? 130 : 10, terH(k, x), z0 - z1, x, terH(k, x) / 2, (z0 + z1) / 2, 0])), hill, 4);
  const pines = [], tips = []; // two tiers each, so they read as pines from afar
  for (let i = 0; i < 140; i++) {
    const z = -30 - r() * 60, x = (r() - .5) * 110, k = z > -34 ? 0 : z > -44 ? 1 : z > -58 ? 2 : z > -76 ? 3 : 4, h = terH(k, x), sc = .8 + r() * .5, ry = r() * 3, col = [0xffffff, 0xd0e0c8, 0xb8ccb0][i % 3];
    if (Math.abs(x - 15) < 4.5 && z < -36 && z > -46) continue;
    pines.push([x, h + .8 * sc, z, sc, sc, sc, ry, col]); tips.push([x, h + 2.3 * sc, z, sc, sc, sc, ry + .4, col]);
  }
  instanced(new THREE.BoxGeometry(1.9, 1.6, 1.9), pine, pines); instanced(new THREE.BoxGeometry(1.1, 1.5, 1.1), pine, tips);
  let y = 7; // the pagoda up the hill, on the second terrace
  for (let k = 0; k < 5; k++) { const w = 4.2 - k * .5; tpiece(w, 2.2, w, red, 15, y + 1.1, -41); tpiece(w, 2.2, w, plaster, 15, y + 1.1, -41).scale.set(.94, .9, 1.02); y += 2.2; piece(w + 2.4, .4, w + 2.4, capMat, 15, y + .2, -41); y += .4; }
  piece(.3, 3, .3, gold, 15, y + 1.5, -41);
  const r2 = seeded(5); // ridges in layers, paler the farther they are
  for (const [d, h0, h1, col] of [[80, 6, 17, 0x5f7e72], [102, 10, 27, 0x7a948e], [126, 16, 38, 0x93a6a8]]) {
    const n = Math.round(d * 6.28 / 4), ph = [r2() * 6, r2() * 6, r2() * 6], w = d * 6.28 / n + .6, list = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, u = (Math.sin(a * 3 + ph[0]) + Math.sin(a * 7 + ph[1]) * .5 + Math.sin(a * 13 + ph[2]) * .25 + 1.75) / 3.5;
      const h = h0 + (h1 - h0) * u ** 1.6 * (.96 + r2() * .08);
      list.push([w, h, 14, Math.cos(a) * d, h / 2, Math.sin(a) * d, -a - Math.PI / 2]);
    }
    boxesMesh(list, lam({ color: col }));
  }
}

// --- the sky: soft blue to a pink haze, the sun, two cranes ---
const skyMat = new THREE.MeshBasicMaterial({ map: (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  for (const [k, col] of [[0, '#7eb0de'], [.26, '#acc8e4'], [.42, '#e6dce6'], [.5, '#f0e2e6'], [1, '#e2d2d6']]) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})(), side: THREE.BackSide, fog: false, depthWrite: false });
const dome = live(new THREE.Mesh(new THREE.SphereGeometry(58, 24, 16), skyMat)); dome.renderOrder = -2; add(dome);
const SUN = new THREE.Vector3(...M.env.sunDir).normalize();
const sunS = skyCube(sunFaces([255, 207, 84], [255, 227, 135], [255, 239, 195]), SUN.clone().negate().add(new THREE.Vector3(-.4, .5, 0)), { amb: .6 }); // a block
const sunG = skyBack(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, color: 0xffe8d8, fog: false, opacity: .8, blending: THREE.AdditiveBlending })));
sunS.scale.setScalar(3); sunG.scale.setScalar(22); add(sunG); add(sunS);
for (const [o, d] of [[dome, 0], [sunG, 52], [sunS, 53]]) { const own = o.onBeforeRender; o.frustumCulled = false; o.onBeforeRender = (rr, sc, cam, ...a) => { o.position.copy(cam.position).addScaledVector(SUN, d); o.updateMatrixWorld(); own.call(o, rr, sc, cam, ...a); }; } // round whatever camera looks
// two cranes, their boxes [size, offset, colour, wing] in one instanced mesh
const CRANE_PARTS = [[.36, .28, 1.1, 0, 0, 0, 0xf2eee6], [.12, .12, .8, 0, .06, .9, 0xf2eee6], [.14, .14, .2, 0, .06, 1.36, 0xf2eee6], [.1, .04, .1, 0, .15, 1.34, 0xd02a20], [.06, .06, .9, 0, -.04, -.95, 0x1c1814],
  ...[-1, 1].flatMap(e => [[1.6, .05, .6, e * .8, 0, 0, 0xf2eee6, e], [.6, .055, .5, e * 1.8, 0, -.05, 0x1c1814, e]])];
const cranes = [0, 1].map(i => ({ r: 18 + i * 7, y: 24 + i * 5, a: i * 2.6, v: .16 - i * .03, cx: -6 + i * 10, cz: -10 + i * 6, ph: i * 1.7 }));
const craneM = live(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam({ color: 0xffffff, emissive: 0x4a4a48 }), 2 * CRANE_PARTS.length)); craneM.frustumCulled = false; add(craneM);
cranes.forEach((c, i) => CRANE_PARTS.forEach((p, k) => craneM.setColorAt(i * CRANE_PARTS.length + k, tint.setHex(p[6]))));
// petals falling from the trees, incense smoke
const PET_N = 70, petals = live(new THREE.InstancedMesh(new THREE.PlaneGeometry(.11, .08), lam({ color: 0xf6c0d2, side: THREE.DoubleSide }), PET_N)), pet = [];
petals.frustumCulled = false; detail(petals); add(petals);
const petalAt = (p, any) => { const c = crowns[Math.random() * crowns.length | 0]; p.x = c[0] + (Math.random() - .5) * c[3] * 2; p.z = c[2] + (Math.random() - .5) * c[3] * 2; p.y = any ? Math.random() * c[1] : c[1] - .3; p.v = .45 + Math.random() * .35; p.ph = Math.random() * 6; p.s = .8 + Math.random() * .5; };
for (let i = 0; i < PET_N; i++) { const p = {}; petalAt(p, true); pet.push(p); }
const smokeMat = new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })(), color: 0xd8d4d0, transparent: true, depthWrite: false });
const smoke = [...Array(6)].map((_, i) => { const s = live(new THREE.Sprite(smokeMat.clone())); detail(s); add(s); return { s, t: i / 6 * 4 }; });

// what's under your feet: the paths and the stone round the pond's edge, the gravel, wading in the pond
const inR = ([x0, x1, z0, z1], x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
M.surfAt = (x, z, y, b, s) => s || y > .1 ? b : PATHS.some(r => inR(r, x, z)) ? 'stone' : GRAVEL.some(r => inR(r, x, z)) || inPond(x, z) ? 'sand' : b;

// --- bots and zombies find the stairs up ---
const NV = makeNav(M, [0, 0, 0]);
M.nav = NV.nav; M.around = NV.around;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _o = new THREE.Object3D(), _w = new THREE.Object3D(), _c = new THREE.Object3D();
M.tick = dt => {
  const t = performance.now() / 1000, k = Math.min(dt, .05);
  gongV += (-gongA * 9 - gongV * .5) * k; gongA += gongV * k; gong.rotation.z = gongA * .25; // it swings when struck, and settles
  cranes.forEach((c, i) => { // they circle, flapping slowly
    c.a += c.v * k; _o.position.set(c.cx + Math.cos(c.a) * c.r, c.y + Math.sin(t * .4 + c.r) * .8, c.cz + Math.sin(c.a) * c.r); _o.rotation.set(0, -c.a, .25); _o.scale.setScalar(1); _o.updateMatrix();
    const f = Math.sin(t * 2.2 + c.ph);
    CRANE_PARTS.forEach(([sx, sy, sz, ox, oy, oz, , e], j) => {
      _w.position.set(e ? e * .18 : 0, 0, 0); _w.rotation.set(0, 0, e ? e * f * .35 : 0); _w.scale.setScalar(1); _w.updateMatrix();
      _c.position.set(ox, oy, oz); _c.rotation.set(0, 0, 0); _c.scale.set(sx, sy, sz); _c.updateMatrix();
      craneM.setMatrixAt(i * CRANE_PARTS.length + j, _m.multiplyMatrices(_o.matrix, _w.matrix).multiply(_c.matrix));
    });
  });
  craneM.instanceMatrix.needsUpdate = true;
  if (!gfxQ().detail) return;
  koi.forEach((f, i) => { // round the pond, tails wagging
    f.a += f.w * k; const ca = Math.cos(f.a), sa = Math.sin(f.a), vx = -sa * f.rx * f.w, vz = ca * f.rz * f.w;
    _o.position.set(f.cx + ca * f.rx, .14 + Math.sin(t + f.a) * .02, f.cz + sa * f.rz); _o.rotation.set(0, Math.atan2(-vz, vx), 0); _o.scale.setScalar(1); _o.updateMatrix();
    KOI_PARTS.forEach(([sx, sy, sz, ox, oy, oz], j) => { _c.position.set(ox, oy, oz); _c.rotation.set(0, j === 3 ? Math.sin(t * 6 + f.a * 3) * .5 : 0, 0); _c.scale.set(sx, sy, sz); _c.updateMatrix(); koiM.setMatrixAt(i * 4 + j, _m.multiplyMatrices(_o.matrix, _c.matrix)); });
  });
  koiM.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < PET_N; i++) {
    const p = pet[i]; p.y -= p.v * k; p.ph += k * 1.6;
    if (p.y < .03) petalAt(p);
    _p.set(p.x + Math.sin(p.ph) * .6, p.y, p.z + Math.cos(p.ph * .7) * .4); _q.setFromEuler(_e.set(p.ph * 1.3, p.ph, p.ph * .8)); _s.setScalar(p.s);
    petals.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  petals.instanceMatrix.needsUpdate = true;
  for (const o of smoke) { o.t = (o.t + k) % 4; const u = o.t / 4; o.s.position.set(Math.sin(t * .7 + o.t) * .15 * u, 1.5 + u * 2.6, -10.6 + Math.cos(t * .5 + o.t) * .1 * u); o.s.scale.setScalar(.25 + u * .9); o.s.material.opacity = Math.sin(u * Math.PI) * .45; }
};
});
