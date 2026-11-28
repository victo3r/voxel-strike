// the season weapons' own tricks: the Snow Globe's blizzard and the Special Delivery's run of presents (tables.js has the server's copy of the numbers)
const GLOBE_R = 4.2, GLOBE_T = 4, GLOBE_TICK = .5, GLOBE_CHIP = .12; // the blizzard: how wide, how long it stays, how often it bites and how much of the globe's damage each bite is
const SLEIGH_T = 1.1, SLEIGH_N = 5, SLEIGH_GAP = 3, SLEIGH_R = 3.4, SLEIGH_STEP = .16; // the delivery: how long after the beacon, how many presents, how far apart, each one's blast and the time between them
const SNOW_MATS = [0xffffff, 0xe6f4ff, 0xbfe4ff].map(c => bitMat(c, PUFF_TEX));
const _snP = new THREE.Vector3(), _snV = new THREE.Vector3();

// ---- the blizzard a Snow Globe leaves: everyone in it who isn't on its thrower's side is slowed, and bitten every GLOBE_TICK
const clouds = [];
let cloudKit = null;
function snowCloud(p, by, dmg, g, id, ghost) {
  cloudKit ??= { ring: pxFlatRing(GLOBE_R - .3, GLOBE_R).rotateX(-Math.PI / 2), disc: pxDisc(GLOBE_R, 0, .3).rotateX(-Math.PI / 2),
    edge: new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: .7, depthWrite: false, fog: false, side: THREE.DoubleSide }),
    frost: new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: .22, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }) };
  const y = groundAt(p.x, p.z, .2, p.y + .4), fx = new THREE.Group(); fx.position.set(p.x, y + .05, p.z); fx.add(new THREE.Mesh(cloudKit.ring, cloudKit.edge), new THREE.Mesh(cloudKit.disc, cloudKit.frost)); fx.renderOrder = 2; scene.add(fx);
  clouds.push({ p: new THREE.Vector3(p.x, y, p.z), by, dmg, g, id, ghost, t: 0, tick: GLOBE_TICK, fx, acc: 0 });
}
const inCloud = (c, q, r = .3) => Math.hypot(q.x - c.p.x, q.z - c.p.z) < GLOBE_R + r && q.y > c.p.y - 1 && q.y < c.p.y + 2.6;
function cloudTick(dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i], by = c.by; c.t += dt;
    if (c.t >= GLOBE_T) { scene.remove(c.fx); clouds.splice(i, 1); continue; }
    const k = Math.min(1, (GLOBE_T - c.t) / .6); c.fx.scale.setScalar(.9 + .1 * Math.sin(c.t * 5)); c.fx.children[0].material.opacity = .7 * k; c.fx.children[1].material.opacity = .22 * k;
    for (c.acc += dt * (gfx.q === 'low' ? 18 : 46) * k; c.acc >= 1; c.acc--) { // snow whirling round inside it
      const a = Math.random() * 6.283, r = GLOBE_R * Math.sqrt(Math.random());
      _snP.set(c.p.x + Math.cos(a) * r, c.p.y + Math.random() * 2.4, c.p.z + Math.sin(a) * r); _snV.set(-Math.sin(a) * 3.2, .2 + Math.random() * .5, Math.cos(a) * 3.2);
      fxBit(SNOW_MATS[Math.random() * 3 | 0], scene, _snP, .07 + Math.random() * .09, _snV.clone(), .5 + Math.random() * .4, 1);
    }
    // the cold: you, and whoever this page moves (bots and zombies); other players slow themselves
    const youIn = by && respawnT <= 0 && !dead && !friendly(by, YOU_T) && inCloud(c, P.pos);
    if (youIn) shockHit(P, FROST);
    const foes = [];
    for (const z of zombies) {
      if (z === by || z.dead || (by ? friendly(by, z) : z.type === 'bot' && friendly(null, z)) || !inCloud(c, z.g.position, z.r ?? .3)) continue;
      if (!z.remote && !z.mirror) shockHit(z, FROST);
      foes.push(z);
    }
    if (c.ghost || (c.tick -= dt) > 0) continue; // someone else's: their page sends the bites
    c.tick = GLOBE_TICK;
    const chip = Math.max(1, Math.round(c.dmg * GLOBE_CHIP));
    if (net.pvp) {
      if (youIn) net.claim(P, { kind: 4, point: new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), gun: c.g, pj: c.id, by });
      for (const z of foes) if (z.pid) net.claim(z, { kind: 4, point: z.g.position.clone().setY(z.g.position.y + z.scale), gun: c.g, pj: c.id, by });
      continue;
    }
    if (youIn) hurtPlayer(chip, false, by);
    for (const z of foes) hurtZombie(z, chip, z.g.position.clone().setY(z.g.position.y + (z.scale || 1)), false, true, by);
  }
}

// ---- the delivery: a sleigh comes over along the way its beacon flew and drops a row of presents, each one a blast; nobody is hit by more than one
const sleighs = [];
let sleighKit = null;
function sleighParts() { // made once, shared by every run
  if (sleighKit) return sleighKit;
  const glow = o => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, ...o }), M = { ring: glow({ color: 0xff5a4a, opacity: .75, side: THREE.DoubleSide }), close: glow({ color: 0xffe08a, opacity: .85, side: THREE.DoubleSide }),
    red: lam({ color: 0xc8322c }), gold: lam({ color: 0xe0b040, emissive: 0x4a3408 }), fur: lam({ color: 0x8c5c3a }), green: lam({ color: 0x2f8a4c }), white: lam({ color: 0xf2f2f4 }), bits: [bitMat(0xffe08a, STAR_MATS[0].map), bitMat(0xffffff, PUFF_TEX)] };
  const sleigh = new THREE.Group(), put = (g, w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); g.add(b); return b; };
  put(sleigh, 1.5, .5, 2.6, M.red, 0, .45, 0); put(sleigh, 1.5, .9, .3, M.red, 0, .9, 1.15); put(sleigh, 1.3, .7, 1, M.green, 0, 1, .4); // the sleigh and its sack (it flies down its -z)
  for (const e of [-1, 1]) { put(sleigh, .12, .1, 3.2, M.gold, e * .7, .05, -.1); put(sleigh, .1, .34, .1, M.gold, e * .7, .25, .8); put(sleigh, .1, .34, .1, M.gold, e * .7, .25, -.8); }
  for (const z of [-3.2, -5.4]) for (const e of [-1, 1]) { // two pairs of reindeer ahead of it
    const x = e * .55; put(sleigh, .4, .46, 1, M.fur, x, .75, z); put(sleigh, .26, .5, .26, M.fur, x, 1.2, z - .45); put(sleigh, .28, .28, .44, M.fur, x, 1.5, z - .62);
    for (const dz of [-.36, .36]) put(sleigh, .12, .6, .12, M.fur, x, .25, z + dz); put(sleigh, .5, .06, .06, M.white, x, 1.8, z - .5);
  }
  put(sleigh, .05, .05, 4.6, M.gold, 0, .9, -3.2);
  const gift = new THREE.Group(); put(gift, .7, .7, .7, M.red, 0, 0, 0); put(gift, .74, .74, .16, M.gold, 0, 0, 0); put(gift, .16, .74, .74, M.gold, 0, 0, 0);
  return sleighKit = { M, sleigh, gift, ring: pxFlatRing(SLEIGH_R - .45, SLEIGH_R).rotateX(-Math.PI / 2), close: pxFlatRing(.8, 1, 0, 1 / 8).rotateX(-Math.PI / 2) };
}
const SLEIGH_H = 15, SLEIGH_RUN = 46; // how high it flies and how far it comes from
function callSleigh(p, by, dmg, g, id, ghost, from = null) {
  const K = sleighParts(), dir = from && Math.hypot(from.x, from.z) > .05 ? new THREE.Vector3(from.x, 0, from.z).normalize() : new THREE.Vector3(0, 0, -1), fx = new THREE.Group(), marks = [];
  for (let k = 0; k < SLEIGH_N; k++) {
    const at = p.clone().addScaledVector(dir, (k - (SLEIGH_N - 1) / 2) * SLEIGH_GAP); at.y = groundAt(at.x, at.z, .2, p.y + 1.2);
    const ring = new THREE.Mesh(K.ring, K.M.ring), close = new THREE.Mesh(K.close, K.M.close), gift = K.gift.clone(); ring.position.copy(at).y += .07; close.position.copy(at).y += .08; gift.visible = false;
    fx.add(ring, close, gift); marks.push({ at, ring, close, gift, done: false });
  }
  const sl = K.sleigh.clone(); // its own -z along the way it flies
  sl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir); fx.add(sl); scene.add(fx);
  sleighs.push({ p: p.clone(), dir, by, dmg, g, id, ghost, t: 0, fx, marks, sl, hit: new Set(), trail: 0 });
  sfx('sleighBells', { at: p, far: 150 });
}
function sleighTick(dt) {
  for (let i = sleighs.length - 1; i >= 0; i--) {
    const s = sleighs[i], end = SLEIGH_T + SLEIGH_N * SLEIGH_STEP + .7; s.t += dt;
    const u = s.t / (SLEIGH_T + SLEIGH_N * SLEIGH_STEP * .5); // over the middle of the row as its presents land
    s.sl.position.copy(s.p).addScaledVector(s.dir, (u - 1) * SLEIGH_RUN).setY(s.p.y + SLEIGH_H + Math.sin(s.t * 3) * .4);
    if ((s.trail -= dt) <= 0) { s.trail = .03; for (const b of sleighKit.M.bits) fxBit(b, scene, _snP.copy(s.sl.position).addScaledVector(s.dir, -1.6), .16 + Math.random() * .14, _snV.set(Math.random() - .5, -.6, Math.random() - .5).clone(), .7, 1); }
    s.marks.forEach((m, k) => {
      if (m.done) return;
      const T = SLEIGH_T + k * SLEIGH_STEP, left = T - s.t, r = Math.max(.05, Math.min(1, left / SLEIGH_T) * SLEIGH_R);
      m.close.scale.setScalar(r); m.ring.material.opacity = .6 + .25 * Math.sin(s.t * 20);
      m.gift.visible = left < .55; if (m.gift.visible) { m.gift.position.copy(m.at).addScaledVector(s.dir, -left * 9).setY(m.at.y + Math.max(0, left) / .55 * SLEIGH_H); m.gift.rotation.x += dt * 7; m.gift.rotation.z += dt * 4; }
      if (left > 0) return;
      m.done = true; m.ring.visible = m.close.visible = m.gift.visible = false;
      if (s.ghost) blastFx(m.at, SLEIGH_R, false, false, s.g); // the server says what someone else's did
      else blast(m.at, SLEIGH_R, s.dmg, s.by ? s.dmg : ROCKET_SELF, s.hit, s.by, s.g, s.id);
    });
    if (s.t >= end) { scene.remove(s.fx); sleighs.splice(i, 1); }
  }
}
// the Elf Hat: its bell jingles when someone gets close behind you
let bellT = 0;
function bellTick(dt) {
  if ((bellT -= dt) > 0) return;
  bellT = .25;
  if (inLobby || dead || respawnT > 0 || matchOver) return;
  const R = youFx().bell; if (!R) { bellT = 1; return; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const z of zombies) {
    if (z.dead || z.type === 'bot' && friendly(null, z)) continue;
    const dx = z.g.position.x - P.pos.x, dz = z.g.position.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < R && d > .01 && Math.abs(z.g.position.y - P.pos.y) < 3 && (dx * fx + dz * fz) / d < -.25) { sfx('elfBell'); bellT = 2.5; return; }
  }
}
function seasonGunTick(dt) { cloudTick(dt); sleighTick(dt); bellTick(dt); }
function clearSeasonFx() { for (const c of clouds) scene.remove(c.fx); clouds.length = 0; for (const s of sleighs) scene.remove(s.fx); sleighs.length = 0; }
