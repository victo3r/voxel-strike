startMap('roofs', {
  name: 'Rooftops', size: 'small', half: 24,
  env: { sky: 0xf2a878, fog: 0xe7a07c, fogNear: 30, fogFar: 110, hemiSky: 0xffd6b0, hemiGround: 0x5a4660, hemi: 1, sunColor: 0xffb47a, sun: 1.25, sunDir: [-22, 9, 14] },
  pads: [[-12, -11, 6], [9, -9, 3], [-12, 10, 4.5], [0, 14, 0]],
  crates: [[-20, 21.5, 1], [-18.8, 22, 0], [-8, 22.5, 0], [-12, -22.5, 0], [15, -22.5, 1], [16.2, -22.6, 0], [22.6, -15, 0], [22.6, -13.8, 0], [22.5, 12, 1]],
});
{
const M = MAPS.roofs, RA = M.half, rnd = seeded(5150);
const G = 140;
const wall = (rgb, k = 12, lines) => tex(g => { noise(g, rgb, k); if (lines) lines(g); });
addGround(G, lam({ map: tex(g => { noise(g, [72, 70, 74], 14); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }, G * 2, G * 2) }));
addWall(0, -RA, RA * 2 + .3, .3); addWall(0, RA, RA * 2 + .3, .3);
addWall(-RA, 0, .3, RA * 2 + .3); addWall(RA, 0, .3, RA * 2 + .3);

// materials
const brick = rgb => surf(lam({ map: wall(rgb, 14, g => { g.fillStyle = 'rgba(40,20,15,.35)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 0], [12, 4], [4, 8], [12, 12]]) g.fillRect(x, y, 1, 3); }) }), 'stone');
const plaster = rgb => surf(lam({ map: wall(rgb, 9) }), 'stone');
const tar = surf(lam({ map: tex(g => { noise(g, [58, 56, 60], 16); g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 1); }) }), 'stone');
const capMat = surf(plaster([196, 188, 176]), 'stone');
const metal = surf(lam({ map: tex(g => { noise(g, [86, 72, 66], 14); g.fillStyle = 'rgba(150,70,30,.35)'; for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 2); }) }), 'metal');
const plank = surf(lam({ map: tex(g => { noise(g, [146, 108, 70], 18); g.fillStyle = 'rgba(60,35,15,.45)'; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const steel = surf(lam({ color: 0x8b9298 }), 'metal'), dark = lam({ color: 0x2c2c30 });
const curb = surf(plaster([150, 148, 144]), 'stone');

// buildings: footprint, roof height, wall. The north-east block is an L round its tower
const BLD = [
  { r: 1, x0: -19, x1: -4.5, z0: -19, z1: -4.5, h: 6, m: brick([150, 66, 50]) },
  { r: 2, x0: 4.5, x1: 19.5, z0: -19, z1: -12, h: 3, m: plaster([214, 196, 160]) },
  { r: 2, x0: 4.5, x1: 12, z0: -12, z1: -4.5, h: 3, m: plaster([214, 196, 160]) },
  { r: 3, x0: 12, x1: 19.5, z0: -12, z1: -4.5, h: 7.5, m: plaster([150, 156, 164]) },
  { r: 4, x0: -19.5, x1: -4.5, z0: 4.5, z1: 16, h: 4.5, m: brick([118, 78, 58]) },
  { r: 5, x0: 4.5, x1: 18, z0: 4.5, z1: 19, h: 9, m: plaster([112, 130, 150]) },
];
const roofAt = (x, z) => BLD.reduce((b, B) => x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1 && (!b || B.h > b.h) ? B : b, null);
// stairs and bridges onto the roofs (they leave gaps in the parapets)
const GAPS = [];
for (const B of BLD) {
  addSlab((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2, B.x1 - B.x0, B.z1 - B.z0, 0, B.h, B.m, true, 2);
  const cap = tbox(B.x1 - B.x0, .04, B.z1 - B.z0, tar); cap.position.set((B.x0 + B.x1) / 2, B.h + .015, (B.z0 + B.z1) / 2); add(cap);
}

// fire escapes: open metal steps along a wall, a landing at the top, then a step sideways onto the roof
const CONNS = []; // for bots: [from region, to region, points along the way]
function steps(x, z, ax, dir, y0, y1, n, side) { // foot at (x, z), climbing along ax ('x' or 'z') in dir; side points at the wall
  const run = n * .5, P = (d, s = 0) => ax === 'x' ? [x + dir * d + side[0] * s, z + side[1] * s] : [x + side[0] * s, z + dir * d + side[1] * s];
  for (let k = 0; k < n; k++) { const [tx, tz] = P(.6 + k * .5), t = y0 + (y1 - y0) * (k + 1) / n; addSlab(tx, tz, ax === 'x' ? .5 : 1.4, ax === 'x' ? 1.4 : .5, t - .1, t, metal); }
  const [lx, lz] = P(.6 + run + .45); addSlab(lx, lz, 1.4, 1.4, y1 - .15, y1, metal); // landing
  const len = Math.hypot(run, y1 - y0), [mx, mz] = P(.35 + run / 2, -.76), r = box(ax === 'x' ? len : .1, .28, ax === 'x' ? .1 : len, metal); // the outer side board
  r.position.set(mx, (y0 + y1) / 2 - .14, mz); if (ax === 'x') r.rotation.z = dir * Math.atan2(y1 - y0, run); else r.rotation.x = -dir * Math.atan2(y1 - y0, run); add(r);
  const rail = box(ax === 'x' ? len : .06, .06, ax === 'x' ? .06 : len, dark); rail.position.set(mx, (y0 + y1) / 2 + .85, mz); rail.rotation.copy(r.rotation); add(rail);
  for (let k = 0; k <= n; k += 3) { const [px, pz] = P(.6 + k * .5, -.76), t = y0 + (y1 - y0) * k / n; const p = box(.06, .9, .06, dark); p.position.set(px, t + .45, pz); add(p); }
  if (y0 < .1) for (const f of [.45, .85]) { const [px, pz] = P(.6 + run * f, -.6), h = y0 + (y1 - y0) * f - .2, p = box(.12, h, .12, metal); p.position.set(px, h / 2, pz); add(p); } // legs
  const [ex, ez] = P(.6 + run + .45, 1.5);
  GAPS.push([lx + side[0] * .9, lz + side[1] * .9]);
  return { foot: [...P(-.3), y0], land: [lx, lz, y1], entry: [ex, ez, y1] };
}
{
  const s = steps(-16.6, 16.8, 'x', 1, 0, 4.5, 10, [0, -1]); CONNS.push([0, 4, [s.foot, s.land, s.entry]]); // south-west, up its south wall
  const s2 = steps(6.6, -19.8, 'x', 1, 0, 3, 7, [0, 1]); CONNS.push([0, 2, [s2.foot, s2.land, s2.entry]]); // north-east, from the back alley
  const s3 = steps(18.8, 18.6, 'z', -1, 0, 9, 20, [-1, 0]); CONNS.push([0, 5, [s3.foot, s3.land, s3.entry]]); // the tall one, from the east alley
  const s4 = steps(-19.8, -5.4, 'z', -1, 0, 6, 14, [1, 0]); CONNS.push([0, 1, [s4.foot, s4.land, s4.entry]]); // north-west, from the west alley
  const s5 = steps(12.5, -12.8, 'x', 1, 3, 7.5, 10, [0, 1]); CONNS.push([2, 3, [s5.foot, s5.land, s5.entry]]); // up the tower from the low roof
}
// plank bridges between roofs (they step, so you can walk under them)
function bridge(x0, z0, y0, x1, z1, y1) {
  const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0, y1 - y0), n = Math.max(6, Math.ceil(Math.abs(y1 - y0) / .3));
  for (let k = 0; k < n; k++) { // flat steps you walk on
    const y = y0 + (y1 - y0) * (k + (y1 > y0 ? 1 : 0)) / n, u0 = k / n, u1 = (k + 1) / n;
    const xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1, za = z0 + (z1 - z0) * u0, zb = z0 + (z1 - z0) * u1;
    building.solids.push({ mesh: null, minX: Math.min(xa, xb) - (ax ? 0 : .8), maxX: Math.max(xa, xb) + (ax ? 0 : .8), minZ: Math.min(za, zb) - (ax ? .8 : 0), maxZ: Math.max(za, zb) + (ax ? .8 : 0), bot: y - .25, top: y, surf: 'wood' });
  }
  for (const [o, deck] of [[0, 1], [.85, 0], [-.85, 0]]) { // a sloped deck and two rails
    const w = deck ? 1.6 : .06, d = box(ax ? len : w, deck ? .12 : .06, ax ? w : len, deck ? plank : dark);
    d.position.set((x0 + x1) / 2 + (ax ? 0 : o), (y0 + y1) / 2 + (deck ? -.06 : .95), (z0 + z1) / 2 + (ax ? o : 0));
    if (ax) d.rotation.z = Math.atan2(y1 - y0, x1 - x0); else d.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
    add(d); if (deck) building.cover.push(d);
  }
  for (const [x, z, y] of [[x0, z0, y0], [x1, z1, y1]]) for (const o of [-.85, .85]) { const p = box(.08, 1, .08, dark); p.position.set(x + (ax ? 0 : o), y + .5, z + (ax ? o : 0)); add(p); }
  GAPS.push([x0, z0], [x1, z1]);
}
bridge(-12, -4.5, 6, -12, 4.5, 4.5); CONNS.push([1, 4, [[-12, -6, 6], [-12, 6, 4.5]]]);
bridge(-4.5, -15, 6, 4.5, -15, 3); CONNS.push([1, 2, [[-6, -15, 6], [6, -15, 3]]]);
bridge(16, -4.5, 7.5, 16, 4.5, 9); CONNS.push([3, 5, [[16, -6, 7.5], [16, 6, 9]]]);
// parapets round the roofs, open where the stairs and bridges arrive
const PT = .25, PH = .8;
function parapet(x0, z0, x1, z1, y) {
  const ax = z0 === z1, a = ax ? x0 : z0, b = ax ? x1 : z1, c = ax ? z0 : x0;
  const cuts = GAPS.filter(([gx, gz]) => Math.abs((ax ? gz : gx) - c) < 1.2 && (ax ? gx : gz) > a - .5 && (ax ? gx : gz) < b + .5).map(([gx, gz]) => ax ? gx : gz).sort((p, q) => p - q);
  let s = a;
  for (const g of [...cuts, null]) {
    const e = g === null ? b : Math.max(s, g - .9);
    if (e - s > .3) { const m = (s + e) / 2; addSlab(ax ? m : c, ax ? c : m, ax ? e - s : PT, ax ? PT : e - s, y, y + PH, capMat); }
    if (g !== null) s = Math.min(b, g + .9);
  }
}
const inset = PT / 2;
parapet(-19, -19 + inset, -4.5, -19 + inset, 6); parapet(-19, -4.5 - inset, -4.5, -4.5 - inset, 6); parapet(-19 + inset, -19, -19 + inset, -4.5, 6); parapet(-4.5 - inset, -19, -4.5 - inset, -4.5, 6);
parapet(4.5, -19 + inset, 19.5, -19 + inset, 3); parapet(4.5 + inset, -19, 4.5 + inset, -4.5, 3); parapet(19.5 - inset, -19, 19.5 - inset, -12, 3); parapet(4.5, -4.5 - inset, 12, -4.5 - inset, 3);
parapet(12, -12 + inset, 19.5, -12 + inset, 7.5); parapet(12, -4.5 - inset, 19.5, -4.5 - inset, 7.5); parapet(12 + inset, -12, 12 + inset, -4.5, 7.5); parapet(19.5 - inset, -12, 19.5 - inset, -4.5, 7.5);
parapet(-19.5, 4.5 + inset, -4.5, 4.5 + inset, 4.5); parapet(-19.5, 16 - inset, -4.5, 16 - inset, 4.5); parapet(-19.5 + inset, 4.5, -19.5 + inset, 16, 4.5); parapet(-4.5 - inset, 4.5, -4.5 - inset, 16, 4.5);
parapet(4.5, 4.5 + inset, 18, 4.5 + inset, 9); parapet(4.5, 19 - inset, 18, 19 - inset, 9); parapet(4.5 + inset, 4.5, 4.5 + inset, 19, 9); parapet(18 - inset, 4.5, 18 - inset, 19, 9);

// windows: a grid on every outside wall, some lit
{
  const glass = [], lit = [], sills = [];
  for (const B of BLD) for (const [ax, c, a, b, out] of [['x', B.z0, B.x0, B.x1, -1], ['x', B.z1, B.x0, B.x1, 1], ['z', B.x0, B.z0, B.z1, -1], ['z', B.x1, B.z0, B.z1, 1]]) {
    const n = Math.floor((b - a - 1) / 2.2);
    for (let fl = 0; fl * 3 + 2.2 < B.h; fl++) for (let i = 0; i < n; i++) {
      const u = a + (b - a) / 2 + (i - (n - 1) / 2) * 2.2, y = fl * 3 + 1.5;
      if (roofAt(ax === 'x' ? u : c + out * .5, ax === 'x' ? c + out * .5 : u)) continue; // that side faces another part of the building
      const x = ax === 'x' ? u : c + out * .03, z = ax === 'x' ? c + out * .03 : u, w = ax === 'x' ? .9 : .06, d = ax === 'x' ? .06 : .9;
      (rnd() < .3 ? lit : glass).push([x, y, z, w, 1.2, d, 0, 0xffffff]);
      sills.push([ax === 'x' ? u : c + out * .08, y - .66, ax === 'x' ? c + out * .08 : u, ax === 'x' ? 1.1 : .16, .1, ax === 'x' ? .16 : 1.1, 0, 0xffffff]);
    }
  }
  instanced(unit, lam({ color: 0x2a3a4c }), glass);
  instanced(unit, new THREE.MeshBasicMaterial({ color: 0xffc879 }), lit);
  instanced(unit, lam({ color: 0xc8c0b4 }), sills);
}
// sidewalks along the streets
for (const [X0, X1, Z0, Z1] of [[-19, -4.5, -19, -4.5], [4.5, 19.5, -19, -4.5], [-19.5, -4.5, 4.5, 16], [4.5, 18, 4.5, 19]]) {
  const w = 1.4;
  for (const [x0, x1, z0, z1] of [[X0 - w, X1 + w, Z0 - w, Z0], [X0 - w, X1 + w, Z1, Z1 + w], [X0 - w, X0, Z0, Z1], [X1, X1 + w, Z0, Z1]]) {
    const cx = Math.max(-RA, x0), dx = Math.min(RA, x1), cz = Math.max(-RA, z0), dz = Math.min(RA, z1);
    addSlab((cx + dx) / 2, (cz + dz) / 2, dx - cx, dz - cz, 0, .15, curb, false, 2);
  }
}
// road markings
{
  const paint = (c) => lam({ color: c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const flat = (w, d, m, x, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, .02, z); add(p); };
  const yel = paint(0xe8c040), wht = paint(0xe8e6e0);
  for (let s = -60; s < 60; s += 3) { if (Math.abs(s + .9) > 6) { flat(.15, 1.8, yel, 0, s + .9); flat(1.8, .15, yel, s + .9, 0); } }
  for (const [x, z, ax] of [[0, -5.6, 1], [0, 5.6, 1], [-5.6, 0, 0], [5.6, 0, 0]]) for (let i = -3; i <= 3; i++) flat(ax ? .5 : 1.6, ax ? 1.6 : .5, wht, x + (ax ? i * .9 : 0), z + (ax ? 0 : i * .9));
}

// --- street things ---
function car(x, z, ry, col) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; add(g);
  const paintM = lam({ color: col }), glassM = lam({ color: 0x24323e });
  const part = (w, h, d, m, px, py, pz) => { const b = box(w, h, d, m); b.position.set(px, py, pz); g.add(b); return b; };
  part(1.9, .7, 4.2, paintM, 0, .65, 0); part(1.6, .6, 2.2, paintM, 0, 1.3, -.2); part(1.62, .42, 2.0, glassM, 0, 1.3, -.2);
  for (const sx of [-.9, .9]) for (const sz of [-1.35, 1.35]) { const w = part(.25, .6, .6, dark, sx, .3, sz); w.userData.wheel = 1; }
  for (const sx of [-.6, .6]) { part(.3, .15, .05, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), sx, .75, 2.11); part(.3, .15, .05, new THREE.MeshBasicMaterial({ color: 0xd8302a }), sx, .75, -2.11); }
  const c = Math.cos(ry), s = Math.sin(ry), ext = (hw, hd) => [Math.abs(c) * hw + Math.abs(s) * hd, Math.abs(s) * hw + Math.abs(c) * hd];
  const [ex, ez] = ext(.95, 2.1); building.solids.push({ mesh: null, minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez, top: 1, surf: 'metal' });
  const [cx, cz] = ext(.8, 1.1), ox = s * -.2, oz = c * -.2; building.solids.push({ mesh: null, minX: x + ox - cx, maxX: x + ox + cx, minZ: z + oz - cz, maxZ: z + oz + cz, bot: 1, top: 1.6, surf: 'metal' });
  g.traverse(o => { if (o.isMesh) building.cover.push(o); });
}
car(1.6, 9, 0, 0xc0392b); car(-1.6, -13, Math.PI, 0x2f6fb0); car(13, 1.6, Math.PI / 2, 0xe0b030); car(-20.5, -1.6, -Math.PI / 2, 0x5a8a4a);
// dumpsters, barriers, lamp posts
const green = surf(lam({ color: 0x2f6a46 }), 'metal'), concrete = surf(plaster([176, 172, 166]), 'stone');
for (const [x, z, ry] of [[-22, -17, 0], [21.8, -9.5, 0], [-6, 21.5, Math.PI / 2]]) {
  const r = Math.abs(ry) > .1; addBlock(x, z, r ? 1.9 : 1.2, r ? 1.2 : 1.9, 1.25, green);
  const lid = box(r ? 2 : 1.3, .08, r ? 1.3 : 2, dark); lid.position.set(x, 1.29, z); lid.rotation.z = r ? 0 : .08; add(lid);
}
for (const [x, z, ax] of [[-1.2, -21, 1], [9.5, -1.5, 0], [-10, 1.8, 0], [1.4, 20.5, 1]]) addBlock(x, z, ax ? 2.4 : .7, ax ? .7 : 2.4, .85, concrete);
const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
for (const [x, z] of [[-5.3, -5.3], [5.3, 5.3], [-5.3, 20], [20, -5.3]]) {
  addSlab(x, z, .16, .16, 0, 4.4, dark, false);
  const arm = box(.9, .08, .08, dark); arm.position.set(x + (x < 0 ? .45 : -.45), 4.35, z); add(arm);
  const head = box(.4, .18, .3, lampMat); head.position.set(x + (x < 0 ? .85 : -.85), 4.25, z); add(head);
}
addCrates(M.crates);

// --- rooftop things ---
const acMat = surf(lam({ map: tex(g => { noise(g, [196, 198, 200], 8); g.fillStyle = 'rgba(0,0,0,.35)'; for (const y of [3, 6, 9, 12]) g.fillRect(1, y, 14, 1); }) }), 'metal');
for (const [x, z, y, w, d, h] of [[-15, -16, 6, 1.6, 1.1, 1], [-8.5, -9, 6, 1.1, 1.6, 1], [17, -16.5, 3, 1.6, 1.1, 1], [-16, 13, 4.5, 1.6, 1.1, 1], [-8, 8.5, 4.5, 1.1, 1.6, 1], [8.5, 15.5, 9, 1.6, 1.2, 1.1], [14.5, -8.5, 7.5, 1.4, 1, .9]]) {
  addSlab(x, z, w, d, y, y + h, acMat);
  const fan = box(Math.min(w, d) * .7, .04, Math.min(w, d) * .7, dark); fan.position.set(x, y + h + .02, z); add(fan);
}
// stair houses: a door box you can hide behind
for (const [x, z, y, m] of [[-11, -16.5, 6, BLD[0].m], [11, 9, 9, BLD[5].m]]) {
  addSlab(x, z, 2.6, 2.2, y, y + 2.4, m, true, 2);
  addSlab(x, z, 2.9, 2.5, y + 2.4, y + 2.6, capMat);
  const door = box(.9, 1.8, .06, lam({ color: 0x4a3426 })); door.position.set(x, y + .9, z + 1.13); add(door);
}
// skylights on the low south-west roof
const glassTop = lam({ color: 0x9ec4d8, emissive: 0x1a2a34 });
for (const [x, z] of [[-13, 8], [-10, 12.5]]) { addSlab(x, z, 2, 1.4, 4.5, 5.05, capMat); const g2 = box(1.7, .06, 1.1, glassTop); g2.position.set(x, 5.08, z); add(g2); }
// the water tower on the tallest roof
{
  const X = 13.5, Z = 14.5, Y = 9, LH = 2.8;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addSlab(X + a * 1.1, Z + b * 1.1, .22, .22, Y, Y + LH, metal);
  addSlab(X, Z, 2.8, 2.8, Y + LH, Y + LH + .2, plank);
  const tankMat = surf(lam({ map: tex(g => { noise(g, [120, 84, 56], 14); g.fillStyle = 'rgba(30,18,8,.5)'; for (const x of [0, 4, 8, 12]) g.fillRect(x, 0, 1, 16); g.fillStyle = '#3a3a3e'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 12, 16, 1); }) }), 'wood');
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.4, 12), tankMat); tank.position.set(X, Y + LH + 1.4, Z); add(tank); building.cover.push(tank);
  building.solids.push({ mesh: null, minX: X - 1.35, maxX: X + 1.35, minZ: Z - 1.35, maxZ: Z + 1.35, bot: Y + LH + .2, top: Y + LH + 2.6, round: 1.35, surf: 'wood' });
  const lidM = new THREE.Mesh(new THREE.ConeGeometry(1.5, .8, 12), lam({ color: 0x5a3e2a })); lidM.position.set(X, Y + LH + 3, Z); add(lidM);
}
// a billboard on the north-west roof, facing the crossroads
{
  const X = -9, Z = -6.2, Y = 6;
  for (const s of [-2, 2]) addSlab(X + s, Z - .3, .2, .2, Y, Y + 2.8, dark);
  const art = tex(g => {
    g.fillStyle = '#e04a3a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#ffd25a'; g.fillRect(0, 12, 16, 4);
    g.fillStyle = '#fff'; for (const [x, y] of [[2, 3], [3, 3], [2, 4], [2, 5], [3, 5], [5, 3], [5, 4], [5, 5], [6, 5], [8, 3], [9, 3], [8, 4], [9, 4], [8, 5], [9, 5]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#2a1a14'; g.fillRect(12, 4, 2, 7); g.fillRect(12.5, 2, 1, 2); g.fillStyle = '#7ad0ff'; g.fillRect(12, 6, 2, 2);
  });
  art.wrapS = art.wrapT = THREE.ClampToEdgeWrapping;
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, .15), [steel, steel, steel, steel, lam({ map: art }), steel]); board.position.set(X, Y + 2.9, Z - .3); add(board); building.cover.push(board);
}
// antennas and a dish on the tower
for (const [x, z, h] of [[18, -10.5, 3], [17.2, -10.8, 2]]) { const a = box(.08, h, .08, dark); a.position.set(x, 7.5 + h / 2, z); add(a); }
{ const dish = new THREE.Mesh(new THREE.CylinderGeometry(.6, .1, .25, 10), steel); dish.position.set(13.5, 8.1, -11); dish.rotation.x = -.9; add(dish); }

// --- the city round the edge ---
{
  const skyline = (rgb, litA) => tex(g => { noise(g, rgb, 8); for (let y = 2; y < 16; y += 4) for (let x = 1; x < 16; x += 4) { g.fillStyle = Math.random() < litA ? '#ffcf86' : 'rgba(30,36,50,.85)'; g.fillRect(x, y, 2, 2); } });
  const mats = [[150, 90, 80], [190, 176, 150], [120, 128, 140], [96, 84, 96], [170, 120, 90]].map(c => lam({ map: skyline(c, .35) }));
  const r2 = seeded(31);
  for (let k = 0; k < 90; k++) {
    const a = r2() * Math.PI * 2, d = 40 + r2() * 32, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.max(Math.abs(x), Math.abs(z)) < 36 || Math.abs(x) < 7 || Math.abs(z) < 7) continue; // keep the roads clear
    const w = 6 + r2() * 8, dd = 6 + r2() * 8, h = 8 + r2() * 26, m = mats[k % mats.length];
    const b = tbox(w, h, dd, m, 4); b.position.set(x, h / 2, z); add(b);
  }
}
// sunset: a sky dome that fades from gold to purple, and the sun low over the roofs
const dome = (() => {
  const geo = new THREE.SphereGeometry(55, 24, 12), col = [], p = geo.attributes.position;
  const lo = new THREE.Color(0xffb070), mid = new THREE.Color(0xe88a8a), hi = new THREE.Color(0x5a4a8a), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 55; if (y < .15) c.copy(lo).lerp(mid, Math.max(0, y) / .15); else c.copy(mid).lerp(hi, Math.min(1, (y - .15) / .6)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1; m.frustumCulled = false; m.onBeforeRender = (r, sc, cam) => m.matrixWorld.setPosition(cam.position); add(m); return m;
})();
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(5, 20), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false, depthWrite: false, transparent: true }));
const SUN_D = new THREE.Vector3(-22, 6, 14).normalize();
sunDisc.renderOrder = -.5; sunDisc.frustumCulled = false; add(sunDisc);
sunDisc.onBeforeRender = (r, sc, cam) => { sunDisc.position.copy(cam.position).addScaledVector(SUN_D, 50); sunDisc.lookAt(cam.position); sunDisc.updateMatrixWorld(); };

// --- bots: which roof you're on, and the way between them ---
const SEGS = []; // every stretch of stairs or bridge
CONNS.forEach(([, , pts], w) => { for (let i = 1; i < pts.length; i++) SEGS.push([w, pts[i - 1], pts[i]]); });
const segD = (p, a, b) => { // points are [x, z, y]
  const vx = b[0] - a[0], vz = b[1] - a[1], vy = b[2] - a[2], L = vx * vx + vz * vz + vy * vy;
  const u = Math.max(0, Math.min(1, ((p.x - a[0]) * vx + (p.z - a[1]) * vz + (p.y - a[2]) * vy) / L));
  return Math.hypot(p.x - a[0] - vx * u, p.z - a[1] - vz * u, p.y - a[2] - vy * u);
};
const onWay = p => { let best = null, bd = 1.5; if (p.y > (roofAt(p.x, p.z)?.h ?? 0) + .6) for (const s of SEGS) { const d = segD(p, s[1], s[2]); if (d < bd) { bd = d; best = s; } } return best; };
const nearWay = p => { let best = null, bd = .9; for (const s of SEGS) { const d = segD(p, s[1], s[2]); if (d < bd) { bd = d; best = s; } } return best; }; // close to one, even on its roof end
const regionAt = p => { if (onWay(p)) return -1; const B = roofAt(p.x, p.z); return B && p.y > B.h - 1 ? B.r : 0; };
const NODES = []; // each end of each way
CONNS.forEach(([a, b, pts], w) => { NODES.push({ r: a, p: pts[0], w, e: 0 }, { r: b, p: pts[pts.length - 1], w, e: 1 }); });
const plen = pts => pts.reduce((s, q, i) => i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1], q[2] - pts[i - 1][2]) : 0, 0);
const hd = (n, p) => Math.hypot(n.p[0] - p.x, n.p[1] - p.z);
// the street: walkable cells and a distance field to any cell
const GN = RA * 2, cell = (x, z) => Math.max(0, Math.min(GN - 1, Math.floor(x + RA))) + Math.max(0, Math.min(GN - 1, Math.floor(z + RA))) * GN;
let walk = null; const fields = new Map();
function streetField(c0) {
  if (!walk) { walk = new Uint8Array(GN * GN); for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const x = i - RA + .5, z = j - RA + .5; walk[i + j * GN] = !roofAt(x, z) && !blocked(x, z, .6, .2) ? 1 : 0; } }
  if (fields.has(c0)) return fields.get(c0);
  if (fields.size > 300) fields.clear();
  const d = new Int16Array(GN * GN).fill(-1), q = [c0]; d[c0] = 0;
  if (!walk[c0]) { const i0 = c0 % GN, j0 = c0 / GN | 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i0 + a, jj = j0 + b, nc = ii + jj * GN; if (ii >= 0 && jj >= 0 && ii < GN && jj < GN && walk[nc]) { d[nc] = 1; q.push(nc); } } } // a stair foot against a wall
  for (let k = 0; k < q.length; k++) {
    const c = q[k], i = c % GN, j = c / GN | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b, nc = ii + jj * GN; if (ii >= 0 && jj >= 0 && ii < GN && jj < GN && walk[nc] && d[nc] < 0) { d[nc] = d[c] + 1; q.push(nc); } }
  }
  fields.set(c0, d); return d;
}
function streetStep(p, x, z) { // a few cells down the field toward (x, z)
  const d = streetField(cell(x, z)), c = cell(p.x, p.z); let i = c % GN, j = c / GN | 0;
  if (d[c] < 0) { // hugging a wall: step back to the nearest open cell
    let best = null, bv = 1e9;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GN || jj >= GN) continue; const v = d[ii + jj * GN]; if (v >= 0 && v + Math.hypot(a, b) * 2 < bv) { bv = v + Math.hypot(a, b) * 2; best = [ii, jj]; } }
    return best ? { x: best[0] - RA + .5, y: 0, z: best[1] - RA + .5 } : { x, y: 0, z };
  }
  if (d[c] <= 1) return null; // next door: walk straight there
  for (let s = 0; s < 3; s++) {
    let best = null, bv = d[i + j * GN];
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GN || jj >= GN) continue;
      const v = d[ii + jj * GN]; if (v >= 0 && v < bv && (!a || !b || d[i + a + j * GN] >= 0 && d[i + (j + b) * GN] >= 0)) { bv = v; best = [ii, jj]; }
    }
    if (!best) break; [i, j] = best;
  }
  return { x: i - RA + .5, y: 0, z: j - RA + .5 };
}
// cheapest way from region a to region b: the first end to head for, and the cost
function route(a, from, b, to) {
  const dist = NODES.map(() => Infinity), first = NODES.map(() => -1), done = NODES.map(() => false);
  NODES.forEach((n, k) => { if (n.r === a) { dist[k] = hd(n, from) * (a ? 1 : 1.3); first[k] = k; } });
  let best = Infinity, end = -1;
  for (;;) {
    let k = -1; for (let i = 0; i < NODES.length; i++) if (!done[i] && dist[i] < Infinity && (k < 0 || dist[i] < dist[k])) k = i;
    if (k < 0) break; done[k] = true;
    const n = NODES[k];
    if (n.r === b) { const t = dist[k] + hd(n, to) * (b ? 1 : 1.3); if (t < best) { best = t; end = k; } }
    const relax = (i, v) => { if (v < dist[i]) { dist[i] = v; first[i] = first[k]; } };
    relax(NODES.findIndex(m => m.w === n.w && m.e !== n.e), dist[k] + plen(CONNS[n.w][2]) * 1.2); // over the stairs or bridge
    NODES.forEach((m, i) => { if (i !== k && m.r === n.r) relax(i, dist[k] + Math.hypot(m.p[0] - n.p[0], m.p[1] - n.p[1]) * (n.r ? 1 : 1.3)); });
  }
  return end < 0 ? null : { n: NODES[first[end]], cost: best };
}
// along a way toward its end e: the next point
function along(w, p, e) {
  const pts = e ? CONNS[w][2] : [...CONNS[w][2]].reverse();
  let bi = 1, bd = Infinity; for (let i = 1; i < pts.length; i++) { const d = segD(p, pts[i - 1], pts[i]); if (d < bd - .01) { bd = d; bi = i; } }
  let q = pts[bi]; if (Math.hypot(q[0] - p.x, q[1] - p.z) < .8 && bi + 1 < pts.length) q = pts[bi + 1];
  return { x: q[0], y: q[2], z: q[1] };
}
// where a target is (someone on the stairs counts as the nearer end)
function placeOf(t) {
  const r = regionAt(t); if (r >= 0) return [r, t];
  const s = onWay(t), [ea, eb] = NODES.filter(n => n.w === s[0]);
  const n = hd(ea, t) < hd(eb, t) ? ea : eb;
  return [n.r, { x: n.p[0], y: n.p[2], z: n.p[1] }];
}
const cost = (r, from, rt, to) => r === rt ? Math.hypot(from.x - to.x, from.z - to.z) : route(r, from, rt, to)?.cost ?? Infinity;
M.nav = (p, t) => {
  const rp = regionAt(p), [rt, to] = placeOf(t);
  if (rp < 0) { // on stairs or a bridge: carry on to whichever end is the better way
    const w = onWay(p)[0], c = NODES.filter(n => n.w === w).map(n => { const q = { x: n.p[0], y: n.p[2], z: n.p[1] }; return hd(n, p) + cost(n.r, q, rt, to); });
    return along(w, p, c[1] < c[0] ? 1 : 0);
  }
  if (rp === rt) return rp === 0 ? streetStep(p, to.x, to.z) : null;
  const r = route(rp, p, rt, to);
  if (!r) return null;
  const n = r.n;
  const near = (q => q && q[0] === n.w)(nearWay(p));
  if (near || hd(n, p) < 1.1) return along(n.w, p, 1 - n.e); // at the foot or end: go across
  if (rp === 0) return streetStep(p, n.p[0], n.p[1]) || { x: n.p[0], y: 0, z: n.p[1] };
  return { x: n.p[0], y: n.p[2], z: n.p[1] };
};
M.ways = CONNS;
M.top = (x, z) => roofAt(x, z)?.h ?? 0;
M.surfAt = (x, z, y, base, s) => s ? base : 'stone';
}
