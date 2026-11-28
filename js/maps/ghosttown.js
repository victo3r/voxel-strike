startMap('ghosttown', {
  name: 'Ghost Town', size: 'small', half: 28, surf: 'sand',
  env: { sky: 0xe4c9a0, fog: 0xe4c9a0, fogNear: 34, fogFar: 125, hemiSky: 0xfff1dc, hemiGround: 0x9a7650, hemi: 1, sunColor: 0xfff0d4, sun: 1.35, sunDir: [-14, 22, -8] }, // high noon
  pads: [[10.6, -5.2, 0.3], [-10.6, 5.2, 0.3], [22.5, 2.5], [-22.5, -2.5]],
  crates: [],
}, () => {
const M = MAPS.ghosttown, GA = M.half, rnd = seeded(1877);
// duels (js/duel.js): where the two stand off and first spawn, the chapel bell to start and a puff of dust
M.duel = { stand: [[0, -5.2], [0, 5.2]], ends: [[0, -20.5], [0, 20]], go: 'noonBell', puff: 0xcfae7e };

// materials
const planks = (rgb, v, vert) => tex(g => { noise(g, rgb, v); g.fillStyle = 'rgba(40,26,16,.45)'; for (const k of [0, 5, 10]) vert ? g.fillRect(k, 0, 1, 16) : g.fillRect(0, k, 16, 1); g.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 4; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); });
const siding = rgb => surf(lam({ map: planks(rgb, 14, true) }), 'wood');
const W_GREY = siding([134, 118, 100]), W_RED = siding([150, 82, 60]), W_TEAL = siding([94, 122, 114]), W_MUST = siding([170, 134, 78]), W_WHITE = siding([206, 198, 182]), W_DARK = siding([90, 78, 70]);
const deck = surf(lam({ map: planks([138, 104, 70], 16) }), 'wood');
const beam = surf(lam({ map: tex(g => { noise(g, [110, 80, 54], 14); g.fillStyle = 'rgba(40,24,12,.35)'; for (const y of [4, 11]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const shingle = surf(lam({ map: tex(g => { noise(g, [104, 84, 68], 12); g.fillStyle = 'rgba(0,0,0,.3)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) }), 'wood');
const brick = surf(lam({ map: tex(g => { noise(g, [158, 84, 62], 16); g.fillStyle = 'rgba(214,192,160,.55)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[3, 0], [11, 0], [7, 4], [15, 4], [3, 8], [11, 8], [7, 12], [15, 12]]) g.fillRect(x, y, 1, 3); }) }), 'stone');
const stone = surf(lam({ map: tex(g => { noise(g, [152, 134, 112], 18); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 1, 8); g.fillRect(8, 8, 1, 8); }) }), 'stone');
const adobe = surf(lam({ map: tex(g => { noise(g, [198, 156, 110], 12); g.fillStyle = 'rgba(120,80,50,.25)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); }) }), 'stone');
const rock = surf(lam({ map: tex(g => { noise(g, [182, 104, 66], 16); g.fillStyle = 'rgba(118,50,30,.4)'; for (const y of [2, 3, 9, 13]) g.fillRect(0, y, 16, 1); g.fillStyle = 'rgba(232,164,112,.25)'; for (const y of [6, 11]) g.fillRect(0, y, 16, 1); }) }), 'stone');
const iron = surf(lam({ color: 0x2c2a28 }), 'metal'), rust = surf(lam({ color: 0x7a4a2c }), 'metal');
const cloth = lam({ color: 0x8a3a2a }), felt = lam({ color: 0x2e5a36 }), white = lam({ color: 0xe8e0cc }), black = lam({ color: 0x18120e }), bone = lam({ color: 0xe6dcc4 });
const glowMat = lam({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2 });
const cactus = surf(lam({ map: tex(g => { noise(g, [84, 128, 70], 12); g.fillStyle = 'rgba(30,60,26,.45)'; for (const x of [2, 7, 12]) g.fillRect(x, 0, 1, 16); g.fillStyle = 'rgba(230,230,200,.5)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }) }), 'grass');
const hay = surf(lam({ map: tex(g => { noise(g, [210, 176, 94], 26); g.fillStyle = 'rgba(120,90,30,.45)'; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 3, 1); g.fillStyle = 'rgba(80,50,20,.6)'; g.fillRect(4, 0, 1, 16); g.fillRect(11, 0, 1, 16); }) }), 'grass');
// shelves full of tins, or of bottles
const shelfMat = (cols, tall) => surf(lam({ map: tex(g => {
  g.fillStyle = '#3e2818'; g.fillRect(0, 0, 16, 16);
  for (const y of [7, 15]) { g.fillStyle = '#7a5434'; g.fillRect(0, y, 16, 1); for (let x = 1; x < 15; x += 2 + (Math.random() * 2 | 0)) { const h = tall ? 4 + (Math.random() * 2 | 0) : 2 + (Math.random() * 2 | 0); g.fillStyle = cols[Math.random() * cols.length | 0]; g.fillRect(x, y - h, 1 + (tall ? 0 : Math.random() < .5), h); } }
}) }), 'wood');
const tins = shelfMat(['#c84a3a', '#e8d8a8', '#5a8a5a', '#d8a040', '#6a7aa8'], false), bottles = shelfMat(['#3a6a3a', '#6a4a22', '#2a4a5a', '#8a2a2a'], true);
const decal = (o, k = -2) => lam({ ...o, polygonOffset: true, polygonOffsetFactor: k, polygonOffsetUnits: k });
const roadMat = decal({ map: tex(g => { noise(g, [182, 140, 98], 14); g.fillStyle = 'rgba(120,84,52,.25)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const rutMat = decal({ color: 0x9a7048 }, -4), water = decal({ color: 0x4a6a6a, emissive: 0x0c1a1a });
const barMat = len => seeThru(tex(g => { g.fillStyle = '#26241f'; for (const x of [1, 5, 9, 13]) g.fillRect(x, 0, 1, 16); g.fillRect(0, 1, 16, 1); g.fillRect(0, 14, 16, 1); }, len / 1.2, 1));

// helpers
const pieces = [], piece = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); add(b); pieces.push(b); return b; }; // each gets a hitbox once it's placed and turned
const onWall = b => { pieces.splice(pieces.lastIndexOf(b), 1); return b; }; // trim flat on a wall needs none
const slab = (x0, x1, z0, z1, bot, top, m, cover = true) => addSlab((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, bot, top, m, cover);
const solid = (x0, x1, z0, z1, bot, top, s = 'wood') => { const o = { mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot, top, surf: s }; building.solids.push(o); return o; };
const flat = (x0, x1, z0, z1, m, y = .012, k = 2) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / k, uv.getY(i) * (z1 - z0) / k); add(p); return p;
};
// buildings stand along the street: s = 1 east of it, -1 west; u runs from the front on the boardwalk (0) to the back (DEEP)
const FL = .3, T = .25, FRONT = 7, DEEP = 8;
const X = (s, u) => s * (FRONT + u), xr = (s, u0, u1) => s > 0 ? [X(s, u0), X(s, u1)] : [X(s, u1), X(s, u0)];
const sl = (s, u0, u1, z0, z1, bot, top, m, cover) => { const [x0, x1] = xr(s, u0, u1); return slab(x0, x1, z0, z1, bot, top, m, cover); };
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
function trim(ax, face, holes, ox, oz) {
  for (const [mid, w, y0, y1] of holes) {
    const at = (along, y, dw, dh, dd) => ax === 'z' ? piece(dd, dh, dw, beam, face + ox * dd / 2, y, along) : piece(dw, dh, dd, beam, along, y, face + oz * dd / 2);
    detail(at(mid, y1 + .06, w + .24, .12, .1));
    for (const e of [-1, 1]) detail(at(mid + e * (w / 2 + .06), (y0 + y1) / 2, .12, y1 - y0, .08));
    if (y0 > .1 && y1 - y0 < 2) detail(at(mid, y0 - .04, w + .3, .08, .16)); // a sill (not under a door: it flickered in the balcony floor)
  }
}
// a building's walls h high with holes (front and back: middle along z; south and north: middle as u), its floor, the door sills
function house(s, z0, z1, h, m, holes) {
  const [fx0, fx1] = xr(s, 0, T), [bx0, bx1] = xr(s, DEEP - T, DEEP), [ix0, ix1] = xr(s, T, DEEP - T), fr = holes.front || [], bk = holes.back || [];
  const so = (holes.south || []).map(([u, ...r]) => [X(s, u), ...r]), no = (holes.north || []).map(([u, ...r]) => [X(s, u), ...r]);
  wall('z', fx0, fx1, z0, z1, 0, h, fr, m); wall('z', bx0, bx1, z0, z1, 0, h, bk, m);
  wall('x', z0, z0 + T, ix0, ix1, 0, h, so, m); wall('x', z1 - T, z1, ix0, ix1, 0, h, no, m);
  sl(s, T, DEEP - T, z0 + T, z1 - T, 0, FL, deck);
  for (const [mid, w, a] of fr) if (a === 0) slab(fx0, fx1, mid - w / 2, mid + w / 2, 0, FL, deck);
  for (const [mid, w, a] of bk) if (a === 0) slab(bx0, bx1, mid - w / 2, mid + w / 2, 0, FL, deck);
  for (const [x, w, a] of so) if (a === 0) slab(x - w / 2, x + w / 2, z0, z0 + T, 0, FL, deck);
  for (const [x, w, a] of no) if (a === 0) slab(x - w / 2, x + w / 2, z1 - T, z1, 0, FL, deck);
  trim('z', X(s, 0), fr, -s, 0); trim('z', X(s, DEEP), bk, s, 0); trim('x', z0, so, 0, -1); trim('x', z1, no, 0, 1);
}
// an upper floor at y over [u0, u1], open over a stairwell [u0, u1, z0, z1]
function upper(s, z0, z1, y, hole, u0 = T, u1 = DEEP - T) {
  const r = [u0, u1, z0 + T, z1 - T], out = [];
  if (!hole) out.push(r);
  else {
    const [a0, a1, b0, b1] = hole;
    if (b0 > r[2]) out.push([r[0], r[1], r[2], b0]); if (b1 < r[3]) out.push([r[0], r[1], b1, r[3]]);
    if (a0 > r[0]) out.push([r[0], a0, b0, b1]); if (a1 < r[1]) out.push([a1, r[1], b0, b1]);
  }
  for (const [a, b, c, d] of out) sl(s, a, b, c, d, y - .25, y, deck);
}
// a flat roof, and the false front above it: a stepped top with a cap along it
function roofTop(s, z0, z1, h, m, top, step = .6) {
  sl(s, T, DEEP, z0, z1, h, h + .2, shingle);
  const mid = (z0 + z1) / 2, inner = (z1 - z0) / 2 * .45;
  sl(s, 0, T, z0, z1, h, top, m); sl(s, 0, T, mid - inner, mid + inner, top, top + step, m);
  const cap = (za, zb, y) => { const [x0, x1] = xr(s, -.08, T + .08); detail(piece(x1 - x0, .14, zb - za + .16, beam, (x0 + x1) / 2, y + .07, (za + zb) / 2)); };
  cap(z0, mid - inner, top); cap(mid + inner, z1, top); cap(mid - inner, mid + inner, top + step);
}
// a gable roof on walls h high over [x0, x1] x [z0, z1]: the ridge along ax at y1, the eaves out past the walls by o, both ends filled in with m
function gable(ax, x0, x1, z0, z1, h, y1, m, o = .3, th = .2) {
  const AX = ax === 'x', [l0, l1, c0, c1] = AX ? [x0, x1, z0, z1] : [z0, z1, x0, x1], mid = (c0 + c1) / 2, hw = (c1 - c0) / 2;
  let a = Math.atan2(y1 - h, hw); for (let k = 0; k < 3; k++) a = Math.atan2(y1 - h - th / Math.cos(a), hw); // the underside meets the wall tops
  const t = Math.tan(a), yw = y1 - hw * t, H = hw + o, ye = y1 - H * t, len = l1 - l0 + 2 * o, cl = (l0 + l1) / 2;
  for (const e of [-1, 1]) {
    const r = AX ? tbox(len, th, H / Math.cos(a), shingle) : tbox(H / Math.cos(a), th, len, shingle), cc = mid + e * (H / 2 - th / 2 * Math.sin(a)), cy = (y1 + ye) / 2 - th / 2 * Math.cos(a);
    if (AX) { r.position.set(cl, cy, cc); r.rotation.x = e * a; } else { r.position.set(cc, cy, cl); r.rotation.z = -e * a; }
    add(r); building.cover.push(r);
  }
  const rc = AX ? box(len, .14, .28, beam) : box(.28, .14, len, beam); rc.position.set(AX ? cl : mid, y1 + .03, AX ? mid : cl); add(rc); meshSolids(rc, 'wood'); // the ridge
  const d = th / 2 / Math.cos(a), sh = new THREE.Shape([[c0, h], [c1, h], [c1, yw - d], [mid, y1 - d], [c0, yw - d]].map(([p, q]) => new THREE.Vector2(p, q))); // the ends stop inside the roof: level with its face they flickered through it
  for (const at of [l0, l1 - T]) {
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), m); g.userData.uvk = 1;
    if (AX) { g.rotation.y = -Math.PI / 2; g.position.x = at + T; } else g.position.z = at;
    add(g); building.cover.push(g);
  }
  for (const e of [-1, 1]) for (const s of slopeSolids(AX ? 'z' : 'x', mid + e * H, mid, ye, y1, l0 - o, l1 + o, th / Math.cos(a), 'wood')) { // each side, the ends filled up to it
    const [u0, u1] = AX ? [Math.max(s.minZ, c0), Math.min(s.maxZ, c1)] : [Math.max(s.minX, c0), Math.min(s.maxX, c1)];
    if (s.bot > h && u1 > u0) for (const at of [l0, l1 - T]) building.solids.push({ mesh: null, minX: AX ? at : u0, maxX: AX ? at + T : u1, minZ: AX ? u0 : at, maxZ: AX ? u1 : at + T, bot: h, top: s.bot, surf: 'wood' });
  }
}
// stairs: a ramp you walk from a (y0) to b (y1) along ax, across c0..c1, and the steps you see
function stairs(ax, a, b, c0, c1, y0, y1, m = deck) {
  const n = Math.max(2, Math.round((y1 - y0) / .3)), lo = Math.min(a, b), hi = Math.max(a, b), len = (hi - lo) / n, mid = (c0 + c1) / 2;
  building.solids.push({ mesh: null, minX: ax === 'x' ? lo : c0, maxX: ax === 'x' ? hi : c1, minZ: ax === 'x' ? c0 : lo, maxZ: ax === 'x' ? c1 : hi, bot: y0, top: y1, ramp: { ax, a, b }, surf: 'wood' });
  for (let k = 0; k < n; k++) {
    const p = a + (b - a) * (k + .5) / n, top = y0 + (y1 - y0) * (k + .5) / n;
    const st = ax === 'x' ? tbox(len, top - y0, c1 - c0, m) : tbox(c1 - c0, top - y0, len, m);
    st.position.set(ax === 'x' ? p : mid, (top + y0) / 2, ax === 'x' ? mid : p); add(st); building.cover.push(st);
  }
}
// a railing from (x0, z0) to (x1, z1) on y: posts at the ends (when ends says so) and between, rails post to post
function railing(x0, z0, x1, z1, y, ends = [true, true], hh = .95) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 1.6)), ang = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 0; i <= n; i++) { if (i === 0 && !ends[0] || i === n && !ends[1]) continue; building.cover.push(piece(.12, hh, .12, beam, x0 + (x1 - x0) * i / n, y + hh / 2, z0 + (z1 - z0) * i / n)); }
  for (const [ry, th] of [[hh - .05, .1], [hh * .45, .07]]) { const r = box(len + .12, th, .08, beam); r.position.set((x0 + x1) / 2, y + ry, (z0 + z1) / 2); r.rotation.y = ang; add(r); }
  solid(Math.min(x0, x1) - .07, Math.max(x0, x1) + .07, Math.min(z0, z1) - .07, Math.max(z0, z1) + .07, y, y + hh);
}
// a railing up the side of stairs from a (y0) to b (y1) along ax, at c across
function stairRail(ax, a, b, c, y0, y1, hh = .95) {
  const run = Math.abs(b - a), n = Math.max(1, Math.ceil(run / 1.4)), rise = y1 - y0, P = (k, v) => ax === 'x' ? [k, v] : [v, k];
  for (let i = 0; i <= n; i++) { const [x, z] = P(a + (b - a) * i / n, c); building.cover.push(piece(.12, hh, .12, beam, x, y0 + rise * i / n + hh / 2, z)); }
  const ang = Math.atan2(rise, run), [mx, mz] = P((a + b) / 2, c), L = Math.hypot(run, rise) + .12;
  for (const [ry, th] of [[hh - .05, .1], [hh * .45, .07]]) {
    const r = ax === 'x' ? box(L, th, .08, beam) : box(.08, th, L, beam); r.position.set(mx, (y0 + y1) / 2 + ry, mz);
    if (ax === 'x') r.rotation.z = Math.sign(b - a) * ang; else r.rotation.x = -Math.sign(b - a) * ang;
    add(r); if (th < .1) meshSolids(r, 'wood', .5);
  }
  const [x0, z0] = P(Math.min(a, b), c - .07), [x1, z1] = P(Math.max(a, b), c + .07);
  building.solids.push({ mesh: null, minX: x0, maxX: x1, minZ: z0, maxZ: z1, bot: y0 + hh, top: y1 + hh, ramp: { ax, a, b }, surf: 'wood' });
}
// a porch roof over the boardwalk on posts, or a balcony with a railing round it
function porch(s, z0, z1, y, rail) {
  const [x0, x1] = s > 0 ? [5, FRONT] : [-FRONT, -5], xp = s * 5.18;
  slab(x0, x1, z0, z1, y - .16, y, rail ? deck : shingle);
  const n = Math.max(1, Math.round((z1 - z0 - .36) / 3.4));
  for (let i = 0; i <= n; i++) { const z = z0 + .18 + (z1 - z0 - .36) * i / n; building.cover.push(piece(.2, y - .16 - FL, .2, beam, xp, (FL + y - .16) / 2, z)); solid(xp - .1, xp + .1, z - .1, z + .1, FL, y - .16); }
  if (rail) { const xa = s * 5.08, xb = s * 6.94; railing(xa, z0 + .06, xa, z1 - .06, y); railing(xa, z0 + .06, xb, z0 + .06, y, [false, true]); railing(xa, z1 - .06, xb, z1 - .06, y, [false, true]); }
}
// signs in pixel letters
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011',
  H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', W: '101101111111101', Y: '101101010010010',
  0: '111101101101111', '.': '000000000000010',
};
function signTex(text, fg, bg) {
  const w = text.length * 4 + 3, c = document.createElement('canvas'); c.width = w; c.height = 9;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, 9); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 8, w, 1);
  g.fillStyle = fg; [...text].forEach((ch, i) => { const f = FONT[ch]; if (f) for (let k = 0; k < 15; k++) if (f[k] === '1') g.fillRect(2 + i * 4 + k % 3, 2 + (k / 3 | 0), 1, 1); });
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a painted board w wide facing ry (0: toward +z), painted on both sides when two (as a decal: a hair off the board it flickered from far off)
function sign(text, w, x, y, z, ry, fg = '#f2e4c2', bg = '#4a2c1a', two = false, parent = null) {
  const h = w * 9 / (text.length * 4 + 3), g = new THREE.Group(), mat = decal({ map: signTex(text, fg, bg) }); g.position.set(x, y, z); g.rotation.y = ry; (parent || building.root).add(g);
  const bd = box(w + .12, h + .12, .06, beam); g.add(bd); if (!parent) meshSolids(bd, 'wood'); // a sign on a swinging bracket stays open
  for (const e of two ? [1, -1] : [1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.z = e * .035; p.rotation.y = e > 0 ? 0 : Math.PI; g.add(p); }
  return g;
}
const FACE = s => -s * Math.PI / 2; // a sign on a building's front faces the street
const barrel = (x, z, y0 = 0) => {
  const b = new THREE.Mesh(pxCyl(.32, .3, .9, 10), beam); b.position.set(x, y0 + .45, z); add(b); building.cover.push(b);
  building.solids.push({ mesh: null, minX: x - .32, maxX: x + .32, minZ: z - .32, maxZ: z + .32, bot: y0, top: y0 + .9, round: .32, surf: 'wood' });
  for (const y of [.2, .7]) { const h = detail(new THREE.Mesh(pxBand(.32, .05, .02), iron)); h.position.set(x, y0 + y, z); add(h); }
};
const chair = (x, z, ry) => { slab(x - .2, x + .2, z - .2, z + .2, FL, FL + .45, beam); const b = piece(.4, .5, .06, beam, x - Math.sin(ry) * .17, FL + .7, z - Math.cos(ry) * .17); b.rotation.y = ry; building.cover.push(b); };

// the ground, the street and its ruts, the boardwalks
addGround(150, lam({ map: tex(g => { noise(g, [204, 164, 116], 16); g.fillStyle = 'rgba(150,104,64,.35)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }, 150, 150) }));
flat(-5, 5, -27.4, 21.6, roadMat, .01, 2);
for (const x of [-2.7, -1.3, 1.3, 2.7]) flat(x - .14, x + .14, -27.4, 21.6, rutMat, .015, 1);
for (const s of [-1, 1]) { const [x0, x1] = s > 0 ? [5, FRONT] : [-FRONT, -5]; slab(x0, x1, -21, 21, 0, FL, deck); }
addWall(0, -27.6, 60, .3); addWall(0, 27.6, 60, .3); addWall(-27.6, 0, .3, 60); addWall(27.6, 0, .3, 60);

// --- east side: the store, the saloon, the hotel, the undertaker ---
// the general store
house(1, -21, -13, 4, W_MUST, { front: [[-17, 1.4, 0, 2.5], [-19.4, 1.4, 1.2, 2.3], [-14.6, 1.4, 1.2, 2.3]], back: [[-15.2, 1.2, 0, 2.5]], south: [[4, 1.4, 1.2, 2.3]] });
roofTop(1, -21, -13, 4, W_MUST, 5.6); porch(1, -21, -13, 3.3);
sign('GENERAL STORE', 5.6, 6.9, 4.9, -17, FACE(1));
slab(12.4, 13, -20.6, -17.8, FL, 1.3, beam); slab(12.35, 13.05, -20.65, -17.75, 1.3, 1.36, deck); // the counter
slab(14.3, 14.75, -20.75, -17.6, FL, 2.4, tins);
barrel(8.1, -20.3, FL); barrel(8.8, -20.35, FL); barrel(14.25, -13.8, FL);
addBlock(10.4, -13.9, 1.1, 1.1, FL + 1.1, crate1);
// the saloon: a balcony over the boardwalk, swinging doors, stairs up along its north wall
house(1, -10, 1, 6.8, W_RED, {
  front: [[-4.5, 1.6, 0, 2.5], [-8, 1.5, 1.2, 2.3], [-1.2, 1.5, 1.2, 2.3], [-7.4, 1.2, 3.6, 5.9], [-1.6, 1.2, 3.6, 5.9], [-4.5, 1.4, 4.6, 5.8]],
  back: [[-8.6, 1.2, 0, 2.5], [-6.8, 1.2, 4.6, 5.7], [-2.6, 1.2, 4.6, 5.7]], south: [[3, 1.4, 1.2, 2.3]], north: [[4, 1.2, 4.6, 5.7]],
});
upper(1, -10, 1, 3.6, [2, 6.5, -.6, .75]);
stairs('x', 9, 13.5, -.6, .75, FL, 3.6);
stairRail('x', 9, 13.5, -.6, FL, 3.6);
railing(9, -.6, 13.5, -.6, 3.6, [true, false]); railing(9, -.6, 9, .69, 3.6, [false, true]);
roofTop(1, -10, 1, 6.8, W_RED, 8.2, .8); porch(1, -10, 1, 3.6, true);
sign('SALOON', 4.4, 6.9, 7.5, -4.5, FACE(1), '#ffe6b0', '#6a1e14');
slab(12.2, 12.9, -9.2, -3.4, FL, 1.3, beam); slab(12.12, 12.98, -9.28, -3.32, 1.3, 1.38, deck); // the bar
slab(14.35, 14.75, -9.4, -3.6, FL, 2.4, bottles);
const table = (x, z) => {
  slab(x - .5, x + .5, z - .5, z + .5, .95, 1.03, felt); building.cover.push(piece(.12, .65, .12, beam, x, FL + .325, z)); solid(x - .1, x + .1, z - .1, z + .1, FL, .95);
  chair(x + .8, z, -Math.PI / 2); chair(x - .8, z, Math.PI / 2); chair(x, z + .8, Math.PI);
};
table(9.4, -7.6); table(9.6, -2.2);
slab(10, 11.7, -9.75, -9.1, FL, 1.5, black); piece(1.5, .06, .3, white, 10.85, 1.12, -9.02); // the piano
{ piece(1.3, .1, 1.3, beam, 10.9, 2.95, -5); piece(.04, .35, .04, iron, 10.9, 3.18, -5); for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) piece(.08, .16, .08, glowMat, 10.9 + dx, 3.08, -5 + dz); } // the lamp
slab(12.1, 14.75, -9.75, -8.1, 3.6, 4.15, cloth); slab(7.25, 8.6, -6.4, -5.8, 3.6, 4.6, beam); // a bed and a dresser upstairs
// the swinging doors
const doors = [];
for (const e of [-1, 1]) { const g = live(new THREE.Group()); g.position.set(7.12, 0, -4.5 + e * .8); add(g); const p = box(.06, 1.1, .76, beam); p.position.set(0, 1.55, -e * .38); g.add(p); doors.push({ g, e, a: 0, v: 0 }); }
// the hotel: a gable over two floors, its upstairs door at the top of the stairs out back
house(1, 4, 13, 6.6, W_TEAL, {
  front: [[8.5, 1.4, 0, 2.5], [5.7, 1.3, 1.2, 2.3], [11.3, 1.3, 1.2, 2.3], [5.7, 1.2, 4.6, 5.7], [8.5, 1.2, 4.6, 5.7], [11.3, 1.2, 4.6, 5.7]],
  back: [[6.2, 1.2, 0, 2.5], [11.4, 1.2, 3.6, 5.9]], north: [[3.5, 1.3, 1.2, 2.3], [4, 1.2, 4.6, 5.7]], south: [[4, 1.2, 4.6, 5.7]],
});
upper(1, 4, 13, 3.6); porch(1, 4, 13, 3.3);
gable('x', 7, 15, 4, 13, 6.6, 8.8, W_TEAL);
sign('HOTEL', 2.6, 6.9, 7.3, 8.5, FACE(1), '#e8f4ec', '#22423c');
slab(11.2, 11.8, 6.6, 10.4, FL, 1.2, beam); // the desk
slab(12.4, 14.75, 4.25, 5.6, 3.6, 4.1, cloth); slab(7.25, 9.6, 11.4, 12.75, 3.6, 4.1, cloth); // beds
stairs('z', 4.6, 9.9, 15, 16.4, 0, 3.6);
slab(15, 16.47, 9.9, 12.6, 3.4, 3.6, deck);
for (const z of [10, 12.5]) slab(16.27, 16.45, z - .09, z + .09, 0, 3.4, beam);
stairRail('z', 4.6, 9.9, 16.4, 0, 3.6); railing(16.4, 9.9, 16.4, 12.54, 3.6, [false, true]); railing(16.4, 12.54, 15.06, 12.54, 3.6, [false, true]);
const hang = live(new THREE.Group()); hang.position.set(5.6, 3.14, 6.2); add(hang); // a sign that creaks in the wind
for (const e of [-1, 1]) { const c = box(.03, .3, .03, iron); c.position.set(0, -.15, e * .45); hang.add(c); }
sign('ROOMS', 1.2, 0, -.55, 0, Math.PI / 2, '#22423c', '#e8dcc0', true, hang);
// the undertaker
house(1, 16, 21, 3.8, W_DARK, { front: [[19.6, 1.2, 0, 2.5], [17.4, 1.2, 1.2, 2.3]], back: [[18.5, 1.2, 1.2, 2.3]] });
roofTop(1, 16, 21, 3.8, W_DARK, 5); porch(1, 16, 21, 3.1);
sign('UNDERTAKER', 4, 6.9, 4.45, 18.5, FACE(1), '#d8d0c0', '#26201c');
const coffin = (x, z, y, ry, up) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; add(g);
  const b = box(.62, up ? 1.9 : .42, up ? .32 : 1.9, black); b.position.y = up ? .95 : .21; g.add(b); building.cover.push(b);
  const l = box(.7, up ? 1.98 : .06, up ? .06 : 1.98, beam); l.position.set(0, up ? .95 : .45, up ? .17 : 0); g.add(l);
};
coffin(6.8, 16.6, FL, Math.PI / 2, true); solid(6.6, 6.99, 16.25, 16.95, FL, FL + 1.9);
for (const z of [17.3, 19.7]) { slab(10.6, 12.9, z - .4, z + .4, FL, .85, beam); coffin(11.75, z, .85, Math.PI / 2, false); solid(10.8, 12.7, z - .32, z + .32, .85, 1.33); }

// --- west side: the barber, the bank, the stable, the sheriff ---
// the barber's
house(-1, -21, -16, 3.8, W_WHITE, { front: [[-19.6, 1.2, 0, 2.5], [-17.4, 1.2, 1.2, 2.3]], back: [[-18.5, 1.2, 1.2, 2.3]] });
roofTop(-1, -21, -16, 3.8, W_WHITE, 5); porch(-1, -21, -16, 3.1);
sign('BARBER', 3, -6.9, 4.45, -18.5, FACE(-1), '#30343c', '#e8e2d6');
{ const p = new THREE.Mesh(pxCyl(.11, .11, 1.3, 8), lam({ map: tex(g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = ((x + y) >> 2) % 2 ? '#e8e8e8' : '#c42a2a'; g.fillRect(x, y, 1, 1); } }, 1, 2) }));
  p.position.set(-6.82, 1.75, -20.4); add(p); building.cover.push(p); piece(.3, .12, .3, iron, -6.82, 2.46, -20.4); piece(.3, .12, .3, iron, -6.82, 1.04, -20.4); solid(-6.98, -6.66, -20.56, -20.24, FL, 2.52, 'metal'); }
slab(-12.2, -11.2, -18.2, -17.2, FL, .9, cloth); slab(-12.2, -11.9, -18.2, -17.2, .9, 1.7, cloth); // the chair
onWall(piece(.04, 1.1, 1.6, lam({ color: 0xb8c8cc, emissive: 0x2a3438 }), -14.73, 1.9, -17.7)); // the mirror
// the bank: brick, its flat roof up the stairs out back, a parapet round it
house(-1, -13, -4, 4.8, brick, { front: [[-8.5, 1.8, 0, 2.6], [-11.4, 1.2, 1.3, 2.5], [-5.6, 1.2, 1.3, 2.5]], north: [[4, 1.2, 1.3, 2.5]], south: [[4, 1.2, 1.3, 2.5]] });
sl(-1, 0, DEEP, -13, -4, 4.8, 5, stone);
sl(-1, 0, T, -13, -4, 5, 6.1, brick);
sl(-1, T, DEEP, -13, -12.75, 5, 5.75, brick); sl(-1, T, DEEP, -4.25, -4, 5, 5.75, brick);
sl(-1, DEEP - T, DEEP, -10.9, -4.25, 5, 5.75, brick); sl(-1, DEEP - T, DEEP, -12.75, -12.6, 5, 5.75, brick); // the back, open where the stairs come up
sign('BANK', 2.2, -6.9, 5.5, -8.5, FACE(-1), '#f0dca0', '#2a2a30');
for (const z of [-11.4, -5.6]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), barMat(1.2)); b.position.set(-6.98, 1.9, z); b.rotation.y = Math.PI / 2; add(b); }
for (const [z0, z1] of [[-12.6, -9.4], [-7.6, -4.4]]) {
  slab(-11.6, -11, z0, z1, FL, 1.2, beam); // the tellers' counter, barred
  const b = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 1.1), barMat(z1 - z0)); b.position.set(-11.3, 1.76, (z0 + z1) / 2); b.rotation.y = Math.PI / 2; add(b); solid(-11.35, -11.25, z0, z1, 1.2, 2.31, 'metal');
}
{ const v = new THREE.Mesh(pxCyl(1.1, 1.1, .18, 16), iron); v.rotation.z = Math.PI / 2; v.position.set(-14.66, 1.6, -8.5); add(v); building.cover.push(v); meshSolids(v, 'metal'); piece(.1, .5, .5, rust, -14.53, 1.6, -8.5); } // the vault
addBlock(-14.2, -12.2, .9, .9, FL + 1, iron); // the safe
stairs('z', -4.6, -10.9, -16.4, -15, 0, 5);
slab(-16.47, -15, -12.75, -10.9, 4.8, 5, deck);
for (const z of [-11, -12.65]) slab(-16.45, -16.27, z - .09, z + .09, 0, 4.8, beam);
stairRail('z', -4.6, -10.9, -16.4, 0, 5); railing(-16.4, -10.9, -16.4, -12.69, 5, [false, true]); railing(-16.4, -12.69, -15.06, -12.69, 5, [false, true]);
// the stable: barn doors swung open, a hay loft over the front half and its door out onto the porch roof
house(-1, -1, 10, 5.6, W_GREY, {
  front: [[4.5, 3, 0, 3], [.8, 1.2, 1.2, 2.3], [8.2, 1.2, 1.2, 2.3], [4.5, 2.2, 3.6, 5.4]],
  back: [[7.6, 1.6, 0, 2.6], [2, 1.2, 1.2, 2.3]], south: [[2, 1.2, 4, 5]],
});
upper(-1, -1, 10, 3.6, null, T, 3.6);
stairs('x', -14.75, -10.6, 8.45, 9.75, FL, 3.6);
stairRail('x', -14.75, -10.6, 8.45, FL, 3.6);
railing(-10.6, -.69, -10.6, 8.45, 3.6, [true, false]);
gable('x', -15, -7, -1, 10, 5.6, 8, W_GREY); porch(-1, -1, 10, 3.3);
sign('STABLE', 3.2, -6.9, 6.15, 4.5, FACE(-1));
piece(1.4, .2, .2, beam, -6.4, 7.3, 4.5); piece(.14, .3, .3, iron, -5.85, 7.05, 4.5); // the hay hoist
for (const [z0, z1] of [[1.5, 2.95], [6.05, 7.5]]) slab(-6.97, -6.89, z0, z1, FL, FL + 2.9, W_RED); // the barn doors, their edges tucked into the frame
for (const z of [3.2, 6.6]) slab(-14.75, -12.4, z - .08, z + .08, FL, 1.5, beam); // stalls
for (const [x, z] of [[-13.6, 1], [-14.2, 2.1], [-13.6, 7.8], [-8.3, 9.2]]) addBlock(x, z, 1.1, .8, FL + .8, hay);
addBlock(-9.3, 1.2, 1.1, .8, 3.6 + .8, hay); // hay up in the loft
{ addBlock(-8.4, -.2, 1, 1, FL + .9, stone); piece(.8, .1, .8, glowMat, -8.4, FL + .92, -.2); // the forge and the anvil
  slab(-9.6, -9.2, .1, .5, FL, .8, beam); slab(-9.75, -9.05, .15, .45, .8, 1.2, iron); }
// the sheriff's office and jail
house(-1, 13, 21, 4, adobe, { front: [[17, 1.4, 0, 2.5], [14.6, 1.3, 1.2, 2.3], [19.4, 1.3, 1.2, 2.3]], back: [[15.2, 1, 1.4, 2.2], [18.8, 1, 1.4, 2.2]], south: [[2.4, 1.2, 0, 2.5]] });
roofTop(-1, 13, 21, 4, adobe, 5.6); porch(-1, 13, 21, 3.3);
sign('SHERIFF', 3.6, -6.9, 4.85, 17, FACE(-1), '#f0dca0', '#3a2414');
{ // the cells: bars you can see and shoot through, their doors swung open
  const BX = X(-1, 4.6), bars = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), b = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.3), barMat(len)); b.position.set((x0 + x1) / 2, FL + 1.15, (z0 + z1) / 2); b.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); add(b);
    solid(Math.min(x0, x1) - .04, Math.max(x0, x1) + .04, Math.min(z0, z1) - .04, Math.max(z0, z1) + .04, FL, FL + 2.3, 'metal');
  };
  bars(BX, 13.25, BX, 14.6); bars(BX, 15.6, BX, 18.4); bars(BX, 19.4, BX, 20.75); bars(BX, 17, X(-1, DEEP - T), 17);
  for (const z of [14.6, 18.4]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), barMat(1)); d.position.set(BX + .32, FL + 1.1, z - .38); d.rotation.y = .7; add(d); meshSolids(d, 'metal'); }
  for (const z of [14.1, 19.9]) slab(-14.75, -13.3, z - .4, z + .4, FL, .7, cloth); // cots
  for (const z of [15.2, 18.8]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1, .8), barMat(1)); b.position.set(-15.02, 1.8, z); b.rotation.y = Math.PI / 2; add(b); }
}
slab(-10.4, -9.2, 18.6, 20.2, FL, 1.1, beam); chair(-8.7, 19.4, -Math.PI / 2); // the desk
// wanted posters
const posterMat = decal({ map: tex(g => { g.fillStyle = '#e2d2a4'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3a2a1a'; for (const x of [2, 5, 8, 11]) g.fillRect(x, 1, 2, 2); g.fillRect(5, 5, 6, 6); g.fillStyle = '#c89a70'; g.fillRect(6, 6, 4, 4); g.fillStyle = '#3a2a1a'; g.fillRect(6, 7, 1, 1); g.fillRect(9, 7, 1, 1); g.fillRect(3, 12, 10, 1); g.fillRect(4, 14, 8, 1); }) });
for (const [x, z, ry] of [[-6.98, 15.8, Math.PI / 2], [-6.98, 18.2, Math.PI / 2], [6.98, -6.3, -Math.PI / 2], [-15.02, 4.5, -Math.PI / 2], [15.02, -4, Math.PI / 2]]) {
  const p = detail(new THREE.Mesh(new THREE.PlaneGeometry(.55, .7), posterMat)); p.position.set(x, 1.7, z); p.rotation.y = ry; add(p);
}

// --- the chapel at the north end, its bell over the door ---
{
  const z0 = 21.8, z1 = 26.2, h = 3.8, door = [[0, 1.5, 0, 2.6]];
  wall('x', z0, z0 + T, -4, 4, 0, h, door, W_WHITE); wall('x', z1 - T, z1, -4, 4, 0, h, [[0, .7, 1.9, 3.1]], W_WHITE);
  for (const x0 of [-4, 4 - T]) wall('z', x0, x0 + T, z0 + T, z1 - T, 0, h, [[23.4, .9, 1.4, 2.9], [24.9, .9, 1.4, 2.9]], W_WHITE);
  slab(-4 + T, 4 - T, z0 + T, z1 - T, 0, FL, deck); slab(-.75, .75, z0, z0 + T, 0, FL, deck);
  trim('x', z0, door, 0, -1);
  gable('z', -4, 4, z0, z1, h, 6.4, W_WHITE);
  slab(-1.1, 1.1, z0 - .1, z0 + 2.1, h, 7.2, W_WHITE); // the bell tower
  for (const dx of [-.95, .95]) for (const dz of [.05, 1.95]) piece(.2, 1.4, .2, beam, dx, 7.9, z0 + dz);
  for (const [w, y] of [[.42, 8.35], [.62, 8.1], [.8, 7.85]]) piece(w, .25, w, lam({ color: 0x9a7a3a, emissive: 0x1a1206 }), 0, y, z0 + 1);
  piece(2.4, .2, 2.4, beam, 0, 8.7, z0 + 1);
  { const c = new THREE.Mesh(pxCone(1.75, 1.7, 4), shingle); c.rotation.y = Math.PI / 4; c.position.set(0, 9.65, z0 + 1); add(c); building.cover.push(c);
    const r = 1.75 / Math.SQRT2; building.solids.push({ mesh: null, minX: -r, maxX: r, minZ: z0 + 1 - r, maxZ: z0 + 1 + r, bot: 8.8, top: 10.5, peak: { x: 0, z: z0 + 1, rx: r, rz: r, edge: 8.8 }, surf: 'wood' }); } // up to its point
  piece(.1, 1, .1, beam, 0, 11, z0 + 1); piece(.55, .1, .1, beam, 0, 11.15, z0 + 1); // a cross on top
  for (const z of [23.6, 25]) for (const e of [-1, 1]) slab(e * 2 - .9, e * 2 + .9, z - .25, z + .25, FL, .75, beam); // pews
  slab(-.8, .8, 25.4, 25.95, FL, 1.2, beam); for (const dx of [-.5, .5]) { piece(.07, .25, .07, white, dx, 1.32, 25.67); piece(.05, .07, .05, glowMat, dx, 1.48, 25.67); }
}
// the town's arch at the south end
for (const e of [-1, 1]) slab(e * 5.6 - .23, e * 5.6 + .23, -24.73, -24.27, 0, 6.2, beam);
piece(12.2, .42, .42, beam, 0, 6.41, -24.5);
for (const e of [-1, 1]) piece(.05, .45, .05, lam({ color: 0x9a8058 }), e * 2.9, 5.95, -24.5); // the sign's ropes
sign('LONESOME GULCH', 6.2, 0, 5.08, -24.5, 0, undefined, undefined, true);
sign('POP. 0', 1.1, 5.6, 2.2, -24.77, Math.PI, '#2a1a10', '#d8c8a0');

// --- out on the street ---
{ // the well
  const w = new THREE.Mesh(pxCyl(.95, 1, .9, 12), stone); w.position.set(2.6, .45, 0); add(w); building.cover.push(w);
  building.solids.push({ mesh: null, minX: 1.65, maxX: 3.55, minZ: -.95, maxZ: .95, top: .9, round: .95, surf: 'stone' });
  const hole = new THREE.Mesh(pxDisc(.75, 12), decal({ color: 0x1a1410 })); hole.rotation.x = -Math.PI / 2; hole.position.set(2.6, .905, 0); add(hole);
  for (const e of [-1, 1]) slab(2.6 + e * .85 - .07, 2.6 + e * .85 + .07, -.07, .07, .9, 2.4, beam);
  piece(1.9, .12, .12, beam, 2.6, 2.34, 0);
  for (const e of [-1, 1]) { const r = tbox(2.3, .1, 1.3, shingle); r.position.set(2.6, 2.62, e * .5); r.rotation.x = e * .6; add(r); meshSolids(r, 'wood'); }
  piece(.03, .7, .03, lam({ color: 0xb8a070 }), 2.6, 1.93, 0); piece(.28, .3, .28, beam, 2.6, 1.45, 0);
}
const trough = (x, z, along) => { const [w, d] = along === 'z' ? [.7, 2.2] : [2.2, .7]; addBlock(x, z, w, d, .7, beam); flat(x - w / 2 + .08, x + w / 2 - .08, z - d / 2 + .08, z + d / 2 - .08, water, .64, 1); };
trough(3.4, -10.5, 'z'); trough(21.4, 13, 'x');
for (const [x, z] of [[-3.8, -15.6], [-3.3, -16.3], [-4.1, -16.6], [3.8, 15.6], [3.3, 16.3], [4.1, 16.6], [17.8, -18], [-17.8, 18], [18.2, 1.4], [-18.2, -1.4]]) barrel(x, z);
addBlock(3.9, 5.5, 1.2, 1.2, 1.2, crate1); addBlock(4.1, 6.8, 1, 1, 1, crate1);
addBlock(-3.9, -5.6, 1.3, .9, .9, hay); addBlock(-3.9, -6.5, 1.3, .9, .9, hay); slab(-4.55, -3.25, -6.5, -5.6, .9, 1.8, hay);
{ // a wagon with a broken wheel, down on one corner
  const g = new THREE.Group(); g.position.set(-3.2, 0, 10.6); g.rotation.set(0, 0, .08); add(g); // square to the street, so its hitboxes fit
  const bed = box(1.7, .5, 3.4, beam); bed.position.y = .85; g.add(bed); building.cover.push(bed); meshSolids(bed, 'wood');
  for (const e of [-1, 1]) { const sd = box(.08, .45, 3.4, deck); sd.position.set(e * .81, 1.32, 0); g.add(sd); building.cover.push(sd); meshSolids(sd, 'wood'); }
  const wheel = (x, y, z, rz = 0) => { const w = new THREE.Mesh(pxCyl(.55, .55, .1, 12), beam); w.rotation.set(0, 0, Math.PI / 2 + rz); w.position.set(x, y, z); g.add(w); meshSolids(w, 'wood'); };
  wheel(.95, .55, 1.1); wheel(.95, .55, -1.1); wheel(-.95, .55, 1.1); wheel(-1.5, .06, -1.7, 1.5);
}
for (const [x, z0, z1] of [[4.5, -8, -5.6], [4.5, -3.2, -.8], [-4.5, .8, 3.2], [-4.5, 5.8, 8.2]]) railing(x, z0, x, z1, 0, [true, true], 1); // hitching rails

// --- the lots behind ---
const tower = (cx, cz, dir) => { // a platform on legs, stairs up to it from dir's side (1: from the north)
  const P = 4.2, H = 2.1;
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) slab(cx + dx - .15, cx + dx + .15, cz + dz - .15, cz + dz + .15, 0, P - .2, beam);
  const ang = Math.atan2(3.2, 3.4), L = Math.hypot(3.2, 3.4); // braces from leg to leg, on every setting since they're solid
  for (const e of [-1, 1]) for (const f of [-1, 1]) { const b = box(.1, L, .1, beam); b.position.set(cx + e * 1.6, 2.1, cz); b.rotation.x = f * ang; add(b); const c = box(.1, L, .1, beam); c.position.set(cx, 2.1, cz + e * 1.6); c.rotation.z = f * ang; add(c); meshSolids(b, 'wood', .5); meshSolids(c, 'wood', .5); }
  slab(cx - H, cx + H, cz - H, cz + H, P - .2, P, deck);
  const zs = cz + dir * H, sx0 = cx - .5, sx1 = cx + .7, zr = zs - dir * .06;
  stairs('z', zs + dir * 5.5, zs, sx0, sx1, 0, P);
  stairRail('z', zs + dir * 5.5, zs, sx1 + .05, 0, P); stairRail('z', zs + dir * 5.5, zs, sx0 - .05, 0, P);
  const ez = cz - dir * H + dir * .06;
  railing(cx - H + .06, ez, cx + H - .06, ez, P); railing(cx - H + .06, ez, cx - H + .06, zr, P, [false, true]); railing(cx + H - .06, ez, cx + H - .06, zr, P, [false, true]);
  railing(cx - H + .06, zr, sx0 - .05, zr, P, [false, false]); railing(sx1 + .05, zr, cx + H - .06, zr, P, [false, false]);
  return P;
};
{ // the water tower
  const cx = 22.5, cz = -9, P = tower(cx, cz, 1);
  const tank = new THREE.Mesh(pxCyl(1.35, 1.35, 3, 16), lam({ map: planks([120, 92, 66], 14, true) })); tank.position.set(cx, P + 1.5, cz); add(tank); building.cover.push(tank);
  building.solids.push({ mesh: null, minX: cx - 1.35, maxX: cx + 1.35, minZ: cz - 1.35, maxZ: cz + 1.35, bot: P, top: P + 3, round: 1.35, surf: 'wood' });
  for (const y of [.5, 1.5, 2.5]) { const ring = detail(new THREE.Mesh(pxBand(1.35, .07, .04), iron)); ring.position.set(cx, P + y, cz); add(ring); }
  const top = new THREE.Mesh(pxCone(1.55, 1, 16), shingle); top.position.set(cx, P + 3.5, cz); add(top); building.cover.push(top);
  building.solids.push({ mesh: null, minX: cx - 1.55, maxX: cx + 1.55, minZ: cz - 1.55, maxZ: cz + 1.55, bot: P + 3, top: P + 4, round: 1.55, peak: { x: cx, z: cz, rx: 1.55, rz: 1.55, edge: P + 3 }, surf: 'wood' }); // the lid, up to its point
  piece(.16, 1.4, .16, iron, cx + 1, P + .8, cz + 1); // the spout
}
const blades = live(new THREE.Group());
{ // the windmill
  const cx = -22.5, cz = 9, P = tower(cx, cz, -1);
  for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) piece(.14, 4.6, .14, iron, cx + dx, P + 2.3, cz + dz);
  for (const y of [1.5, 3, 4.5]) for (const e of [-1, 1]) { piece(1.1, .08, .08, iron, cx, P + y, cz + e * .5); piece(.08, .08, 1.1, iron, cx + e * .5, P + y, cz); }
  building.solids.push({ mesh: null, minX: cx - .57, maxX: cx + .57, minZ: cz - .57, maxZ: cz + .57, bot: P, top: P + 4.6, surf: 'metal' });
  blades.position.set(cx, P + 5.1, cz - .7); add(blades);
  const vane = lam({ color: 0xd8d0c0 });
  for (let k = 0; k < 8; k++) { const b = box(.34, 1.5, .04, vane); const a = k * Math.PI / 4; b.position.set(Math.sin(a) * .95, Math.cos(a) * .95, 0); b.rotation.z = -a; blades.add(b); }
  blades.add(box(.3, .3, .3, iron));
  piece(.12, .12, 1.8, iron, cx, P + 5.1, cz + .2); piece(.04, .7, .9, vane, cx, P + 5.1, cz + 1.3); // the tail
}
{ // the corral
  const x0 = 19.6, x1 = 25.4, z0 = 10.2, z1 = 15.8;
  railing(x0, z0, x1, z0, 0, [true, true], 1.1); railing(x1, z0, x1, z1, 0, [false, true], 1.1); railing(x1, z1, x0, z1, 0, [false, true], 1.1);
  railing(x0, z1, x0, 14, 0, [false, true], 1.1); railing(x0, 12, x0, z0, 0, [true, false], 1.1);
  addBlock(24.4, 14.8, 1.1, .8, .8, hay); addBlock(24.4, 11.2, 1.1, .8, .8, hay);
}
{ // a stagecoach that didn't make it
  const g = new THREE.Group(); g.position.set(-22.5, 0, -13); g.rotation.set(0, 0, -.06); add(g); // square, so its hitboxes fit
  const body = box(1.7, 1.6, 2.8, W_RED); body.position.y = 1.5; g.add(body); building.cover.push(body); meshSolids(body, 'wood');
  const roof = box(1.9, .12, 3, beam); roof.position.y = 2.36; g.add(roof); meshSolids(roof, 'wood');
  for (const e of [-1, 1]) { const win = box(.02, .6, .7, black); win.position.set(e * .86, 1.75, 0); g.add(win); }
  const wheel = (x, z, r) => { const w = new THREE.Mesh(pxCyl(r, r, .1, 12), beam); w.rotation.z = Math.PI / 2; w.position.set(x, r, z); g.add(w); meshSolids(w, 'wood'); };
  wheel(.95, 1.1, .6); wheel(-.95, 1.1, .6); wheel(.95, -1.1, .75);
  const lost = new THREE.Mesh(pxCyl(.75, .75, .1, 12), beam); lost.position.set(-20.2, .05, -11.4); add(lost); building.solids.push({ mesh: null, minX: -20.95, maxX: -19.45, minZ: -12.15, maxZ: -10.65, top: .1, round: .75, surf: 'wood' }); // its wheel
}
{ // boot hill
  for (const [x, z] of [[11, 24.6], [13.2, 25.3], [15.4, 24.4], [17.6, 25.4], [19.8, 24.7], [22, 25.2], [12.2, 22.9], [20.8, 23]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set(0, (rnd() - .5) * .3, rnd() * .3 - .15); add(g);
    const p = box(.12, 1.3, .12, beam); p.position.y = .65; g.add(p); const c = box(.6, .1, .1, beam); c.position.y = .95; g.add(c); building.cover.push(p); meshSolids(p, 'wood'); meshSolids(c, 'wood');
    piece(.8, .22, 1.6, lam({ map: tex(g => noise(g, [168, 124, 84], 18)) }), x, .11, z - 1); solid(x - .4, x + .4, z - 1.8, z - .2, 0, .22, 'sand');
  }
}
{ // the old mine, dug into the cliff
  slab(-20.6, -13.4, -31, -26.8, 0, 6.6, rock); slab(-19.6, -15, -30, -27.6, 6.6, 8.4, rock);
  for (const e of [-1, 1]) slab(-17 + e * 1.4 - .18, -17 + e * 1.4 + .18, -26.78, -26.42, 0, 3, beam);
  piece(3.4, .36, .36, beam, -17, 3.18, -26.6);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(2.44, 3), decal({ color: 0x0e0a08 })); mouth.position.set(-17, 1.5, -26.79); add(mouth);
  for (const e of [-1, 1]) piece(.08, .06, 4, iron, -17 + e * .45, .03, -24.7);
  for (let k = 0; k < 6; k++) piece(1.2, .05, .16, beam, -17, .025, -26.4 + k * .7);
  addBlock(-17, -23.6, 1, 1.3, 1, rust); for (const dx of [-.4, .4]) for (const dz of [-.5, .5]) piece(.12, .3, .3, iron, -17 + dx * 1.3, .15, -23.6 + dz);
}
{ // an outhouse and a woodpile
  const x = -21, z = 24.6;
  slab(x - .65, x + .65, z - .65, z + .65, 0, 2.3, W_GREY); piece(1.5, .12, 1.5, shingle, x, 2.36, z);
  const moon = decal({ map: tex(g => { g.clearRect(0, 0, 16, 16); g.fillStyle = '#20160e'; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 8, y - 8) < 6 && Math.hypot(x - 10.5, y - 7) > 4.5) g.fillRect(x, y, 1, 1); }), alphaTest: .5 });
  moon.map.wrapS = moon.map.wrapT = THREE.ClampToEdgeWrapping;
  const mm = new THREE.Mesh(new THREE.PlaneGeometry(.35, .35), moon); mm.position.set(x, 1.9, z - .66); mm.rotation.y = Math.PI; add(mm);
  for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(pxCyl(.14, .14, 1.4, 8), beam); l.rotation.x = Math.PI / 2; l.position.set(-16.6 + (k < 3 ? k * .3 : .15 + (k - 3) * .3), k < 3 ? .14 : .39, 25); add(l); }
  solid(-16.8, -15.8, 24.3, 25.7, 0, .53);
}
// saguaros and rocks round the edge of town
const saguaro = (x, z, h, arms) => {
  slab(x - .25, x + .25, z - .25, z + .25, 0, h, cactus);
  for (const [e, y, l] of arms) { piece(.7, .36, .36, cactus, x + e * .55, y, z); piece(.36, l, .36, cactus, x + e * .9, y + l / 2 - .18, z); }
};
saguaro(24.6, -1.8, 3.2, [[1, 1.6, 1.1], [-1, 2.1, .8]]); saguaro(-24.6, 1.8, 3, [[-1, 1.5, 1.1]]); saguaro(24, 19.5, 2.6, [[-1, 1.3, .9]]); saguaro(-24, -19.5, 3.3, [[1, 1.8, 1], [-1, 1.4, .9]]);
saguaro(13.5, -24.8, 2.8, [[1, 1.4, 1]]); saguaro(-12.6, 23.4, 2.4, [[-1, 1.2, .8]]);
for (const [x, z, w, h] of [[19.6, -24.6, 2.2, 1.1], [22.8, -23.6, 1.6, .8], [-19.8, 22.4, 1.8, .9], [24.2, 6.5, 1.4, .7], [-24.2, -6.5, 1.4, .7]]) addBlock(x, z, w, w * .8, h, rock);
{ const sk = new THREE.Group(); sk.position.set(16.6, 0, -23.6); sk.rotation.y = .6; add(sk); for (const [w, h, d, x, y, z] of [[.4, .2, .5, 0, .1, 0], [.5, .08, .1, .3, .2, -.2], [.5, .08, .1, -.3, .2, -.2]]) { const b = box(w, h, d, bone); b.position.set(x, y, z); sk.add(b); meshSolids(b, 'stone'); } } // a cow's skull

propSolids(pieces.filter(b => Math.max(Math.abs(b.position.x), Math.abs(b.position.z)) < 27.6), m => m.material === glowMat); // every piece in town, now they're all placed (flames aside)

// --- red cliffs all round, a rockslide over the road out, mesas off in the haze ---
{
  const r = seeded(77);
  const run = (along, out, from, to, h0, h1, gaps = []) => {
    for (let p = from; p < to;) {
      const w = 3 + r() * 3, h = h0 + r() * (h1 - h0), inner = 26.8 + r() * .8, d = 6 + r() * 4, mid = p + w / 2;
      if (!gaps.some(([a, b]) => mid > a && mid < b)) {
        const [a0, a1] = out > 0 ? [inner, inner + d] : [-inner - d, -inner], [x0, x1, z0, z1] = along === 'x' ? [p - .3, p + w + .3, a0, a1] : [a0, a1, p - .3, p + w + .3];
        slab(x0, x1, z0, z1, 0, h, rock);
        if (r() < .6) { const k = .35 + r() * .3, back = out > 0 ? [a0 + d * k, a1] : [a0, a1 - d * k], [bx0, bx1, bz0, bz1] = along === 'x' ? [x0 + w * .2, x1 - w * .2, ...back] : [...back, z0 + w * .2, z1 - w * .2]; slab(bx0, bx1, bz0, bz1, h, h + 2 + r() * 4, rock); }
      }
      p += w;
    }
  };
  run('x', 1, -36, 36, 8, 15); run('x', -1, -36, 36, 6, 9, [[-6.5, 6.5], [-21, -13]]);
  run('z', 1, -27, 27, 6, 11); run('z', -1, -27, 27, 6, 11);
  for (const e of [-1, 1]) slab(e > 0 ? 6.2 : -9.5, e > 0 ? 9.5 : -6.2, -33, -26.8, 0, 7 + e * .8, rock);
  for (const [x0, x1, z0, z1, y0, y1] of [[-6.4, -2, -31, -27.2, 0, 2.6], [-2.4, 2.4, -32, -27.9, 0, 3.4], [1.8, 6.4, -30.6, -27.4, 0, 2.2], [-4.6, -.6, -30.4, -27.8, 2.6, 4], [.4, 4.2, -31, -28.2, 2.2, 4.6], [-1.6, 1.6, -32, -29.2, 3.4, 5.6], [-4.4, -3, -27.3, -26.3, 0, 1], [2.9, 4.1, -27.1, -26.2, 0, .8]]) slab(x0, x1, z0, z1, y0, y1, rock); // the rockslide
  const mesa = (x, z, w, d, h) => { for (const [k, y0, y1] of [[1, 0, h], [.72, h, h * 1.3], [.45, h * 1.3, h * 1.45]]) { const m = box(w * k, y1 - y0, d * k, rock); m.position.set(x + (1 - k) * w * .2, (y0 + y1) / 2, z - (1 - k) * d * .15); add(m); } };
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + r() * .3, d = 95 + r() * 25; mesa(Math.cos(a) * d, Math.sin(a) * d, 34 + r() * 26, 22 + r() * 16, 12 + r() * 9); }
}

// --- the sky: hazy blue going to dust at the horizon, the sun high up, buzzards ---
const skyMat = new THREE.MeshBasicMaterial({ map: (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  for (const [k, col] of [[0, '#7fa2c2'], [.24, '#a6bccb'], [.4, '#d4cbb2'], [.5, '#e4c9a0'], [1, '#d0ae86']]) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})(), side: THREE.BackSide, fog: false, depthWrite: false });
const dome = live(new THREE.Mesh(new THREE.SphereGeometry(58, 24, 16), skyMat)); dome.renderOrder = -2; add(dome);
const SUN = new THREE.Vector3(...M.env.sunDir).normalize();
const sunS = skyCube(sunFaces([255, 206, 80], [255, 226, 130], [255, 238, 186]), SUN.clone().negate().add(new THREE.Vector3(-.4, .5, 0)), { amb: .6 }); // a block
const sunG = skyBack(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, color: 0xffe0b0, fog: false, opacity: .85, blending: THREE.AdditiveBlending })));
sunS.scale.setScalar(3.3); sunG.scale.setScalar(24); add(sunG); add(sunS);
for (const [o, d] of [[dome, 0], [sunG, 52], [sunS, 53]]) { const own = o.onBeforeRender; o.frustumCulled = false; o.onBeforeRender = (rr, sc, cam, ...a) => { o.position.copy(cam.position).addScaledVector(SUN, d); o.updateMatrixWorld(); own.call(o, rr, sc, cam, ...a); }; } // round whatever camera looks
const buzzards = [0, 1, 2].map(i => {
  const g = live(new THREE.Group()), body = box(.4, .22, .9, black); g.add(body);
  for (const e of [-1, 1]) { const w = box(1.7, .05, .5, black); w.position.x = e * .95; w.rotation.z = e * .14; g.add(w); }
  add(g); return { g, r: 10 + i * 5, y: 27 + i * 4, a: i * 2.1, v: .2 - i * .03, cx: (rnd() - .5) * 12, cz: (rnd() - .5) * 12 };
});
// dust drifting up the street, and tumbleweeds
const dustMat = new THREE.MeshBasicMaterial({ map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { const x = 12 + Math.random() * 40, y = 12 + Math.random() * 40, rr = 10 + Math.random() * 14, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})(), color: 0xe8c08e, transparent: true, opacity: .3, depthWrite: false });
const dusts = Array.from({ length: 10 }, () => {
  const m = live(detail(new THREE.Mesh(new THREE.PlaneGeometry(8, 8), dustMat))); m.rotation.x = -Math.PI / 2;
  const o = { m, x: (rnd() * 2 - 1) * 5, z: (rnd() * 2 - 1) * GA, v: .8 + rnd() * .6, y: .2 + rnd() * .35 }; m.position.set(o.x, o.y, o.z); add(m); return o;
});
const weedMat = seeThru(tex(g => { g.clearRect(0, 0, 16, 16); g.fillStyle = '#8a6a40'; for (let i = 0; i < 26; i++) { const x = Math.random() * 16 | 0, y = Math.random() * 16 | 0, n = 2 + Math.random() * 4 | 0; Math.random() < .5 ? g.fillRect(x, y, n, 1) : g.fillRect(x, y, 1, n); } }));
const weeds = [0, 1, 2, 3].map(i => { const m = live(new THREE.Mesh(pxSphere(.42), weedMat)); add(m); return { m, x: -3 + rnd() * 6, z: -26 + i * 12, v: 2.4 + rnd() * 1.6, t: rnd() * 6 }; });

// --- bots and zombies find the stairs up ---
const NV = makeNav(M, [0, 0, 0]);
M.nav = NV.nav; M.around = NV.around;
let doorSide = 0; // the saloon doors swing away from whoever walks into them
const atDoors = q => Math.abs(q.x - 7.12) < 1.1 && Math.abs(q.z + 4.5) < .85;
M.tick = dt => {
  const t = performance.now() / 1000, k = Math.min(dt, .05);
  blades.rotation.z += k * 1.6;
  hang.rotation.x = Math.sin(t * 1.3) * .12 + Math.sin(t * .37) * .05;
  for (const w of weeds) { // they roll up the street on the wind, then start over at the south end
    w.z += w.v * k; w.t += k;
    if (w.z > 21) { w.z = -26; w.x = -3.5 + Math.random() * 7; }
    w.m.position.set(w.x + Math.sin(w.t * .7) * .4, .42 + Math.abs(Math.sin(w.t * 3.1)) * .35, w.z); w.m.rotation.x += w.v * k / .42;
  }
  for (const b of buzzards) { b.a += b.v * k; b.g.position.set(b.cx + Math.cos(b.a) * b.r, b.y + Math.sin(t * .5 + b.r) * .8, b.cz + Math.sin(b.a) * b.r); b.g.rotation.set(0, -b.a, .3); }
  let who = atDoors(P.pos) ? P.pos : null;
  if (!who) for (const z of zombies) if (!z.dead && atDoors(z.g.position)) { who = z.g.position; break; }
  doorSide = !who ? 0 : doorSide || (who.x < 7.12 ? -1 : 1);
  for (const d of doors) { d.v += (doorSide * 1.2 - d.a) * 40 * k - d.v * 5 * k; d.a += d.v * k; d.g.rotation.y = d.e * d.a; }
  if (!gfxQ().detail) return;
  for (const o of dusts) { o.z += o.v * k; if (o.z > GA + 4) { o.z = -GA - 4; o.x = (Math.random() * 2 - 1) * 5; } o.m.position.set(o.x + Math.sin(t * .4 + o.y * 9) * .8, o.y, o.z); }
};
});
