// the mythics: the Wisp Caller's wisps, the Void Lantern's orbs and the Aurora Rail's charge
const _my = new THREE.Vector3(), _my2 = new THREE.Vector3(), _myFoes = [];
// everyone a shot of by's can hurt (by = null: yours)
function foesOf(by) {
  const out = _myFoes; out.length = 0;
  if (by && respawnT <= 0 && !dead && !P.downed && !friendly(by, YOU_T)) out.push(YOU_T);
  for (const z of zombies) if (z !== by && !z.dead && z.g.visible && !friendly(by, z)) out.push(z);
  return out;
}
// the first thing along the ray that isn't on by's team
const firstHit = (by, rc) => rc.intersectObjects(targetsFor(by, rc), false).find(h => { const z = h.object.userData.zombie; return !z || !friendly(by, z); });

// ---- the Wisp Caller: each wisp turns toward the nearest enemy in front of it
const WISP_SPD = 24, WISP_TURN = 3.5, WISP_SEEK = 20, WISP_CONE = .8, WISP_LIFE = 1.8; // speed, turn rate, how far and how wide (cos) it looks, how long it flies
const wisps = [], WISP_SPR = [bitMat(0x5fe8d8, PUFF_TEX), bitMat(0xeafffb, PUFF_TEX)];
function fireWisp(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const alt = opts.ghost && !by ? -1 : altBy(by, gi(w.id)); // in its own skin a gun's wisps take the skin's colours
  const ms = WISP_SPR.map((m, j) => { const s = new THREE.Sprite(alt < 0 ? m : bitTint(m, alt)); s.scale.setScalar(j ? .13 : .34); scene.add(s); return s; });
  const o = { alt, ms, p: from.clone().addScaledVector(dir, .6), v: dir.clone().multiplyScalar(WISP_SPD), life: WISP_LIFE, dmg: w.dmg, by, ghost: !!opts.ghost, id, g: w.id, tgt: null, look: 0, trail: 0, t: Math.random() * 6, gone: 0 };
  wisps.push(o); wispDraw(o);
}
function wispSeek(o) {
  _my2.copy(o.v).normalize();
  let best = null, bs = WISP_CONE;
  for (const t of foesOf(o.by)) {
    const d = chestOf(t, _my).distanceTo(o.p); if (d > WISP_SEEK || d < .3) continue;
    const s = _my.sub(o.p).divideScalar(d).dot(_my2);
    if (s > bs && clearLine(o.p, chestOf(t, _my))) { bs = s; best = t; }
  }
  return best;
}
const wispDraw = o => { for (const m of o.ms) m.position.set(o.p.x, o.p.y + Math.sin(o.t * 17) * .05, o.p.z); };
function wispPop(p) { wandBits('wisp', p, scene, 10, 3); sfx('wispHit', { at: p, far: 40 }); }
function updateWisps(dt) {
  for (let i = wisps.length - 1; i >= 0; i--) {
    const o = wisps[i];
    if (o.gone) { if ((o.gone -= dt) <= 0) wisps.splice(i, 1); continue; } // someone else's, gone here: waiting for where the server says it went
    o.life -= dt; o.t += dt;
    if (o.tgt && (o.tgt === YOU_T ? respawnT > 0 || dead : o.tgt.dead)) o.tgt = null;
    if ((o.look -= dt) <= 0) { o.look = .1; o.tgt = wispSeek(o); }
    if (o.tgt) { // turn toward it
      const c = chestOf(o.tgt, _my).sub(o.p).normalize(), f = _my2.copy(o.v).normalize(), a = f.angleTo(c);
      if (a > 1e-3) o.v.copy(f.lerp(c, Math.min(1, WISP_TURN * dt / a)).normalize()).multiplyScalar(WISP_SPD);
    }
    const step = WISP_SPD * dt;
    ray2.set(o.p, _my2.copy(o.v).normalize()); ray2.far = step;
    let hit = firstHit(o.by, ray2);
    const onYou = !o.ghost && o.by && !friendly(o.by, YOU_T) && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    if (onYou) hit = null;
    if (hit || onYou || o.life <= 0) {
      for (const m of o.ms) scene.remove(m);
      if (o.ghost) { o.gone = .6; continue; }
      wisps.splice(i, 1);
      const p = onYou ? youHitP.clone() : hit ? hit.point.clone() : o.p.clone();
      net.boom(o.id, p, o.by); wispPop(p);
      if (onYou) { const head = p.y > P.pos.y + 1.45; hurtPlayer(Math.round(o.dmg * (head ? HEAD_MUL : 1)), false, o.by, head, 5, o.id); }
      const zz = hit?.object.userData.zombie;
      if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, o.dmg * (head ? HEAD_MUL : 1), hit.point, head, false, o.by, 5, o.id); }
      continue;
    }
    o.p.addScaledVector(o.v, dt); wispDraw(o);
    if ((o.trail -= dt) <= 0) { o.trail = .03; wandBits('wisp', o.p, scene, 1, .4, .8, o.alt); }
  }
}

// ---- the Void Lantern: a slow orb that opens a void where it lands. The void pulls in whoever was near when it opened, then bursts
const VOID_SPD = 20, VOID_LIFE = 2, VOID_T = 1.2, VOID_R = 3.5, VOID_PULL_R = 6, VOID_PULL = 10; // orb speed and flight time, how long it pulls, burst radius, pull reach and speed
const orbs = [], voids = [], orbGeo = new THREE.BoxGeometry(.24, .24, .24), ORB_MAT = new THREE.MeshBasicMaterial({ color: 0x1c0b30 }), ORB_GLOW = bitMat(0x9a5aff, PUFF_TEX), VOID_IN = bitMat(0xc89aff, PUFF_TEX);
const VOID_HALO = new THREE.SpriteMaterial({ map: PUFF_TEX, color: 0x5a24a8, depthWrite: false, fog: false, opacity: .9 }); // dark, not glowing: it's a hole
function fireVoid(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const alt = opts.ghost && !by ? -1 : altBy(by, gi(w.id)), m = new THREE.Group(), glow = new THREE.Sprite(alt < 0 ? ORB_GLOW : bitTint(ORB_GLOW, alt)); glow.scale.setScalar(.75); m.add(new THREE.Mesh(orbGeo, ORB_MAT), glow);
  m.position.copy(from).addScaledVector(dir, .6); scene.add(m);
  orbs.push({ alt, m, dir: dir.clone(), life: VOID_LIFE, dmg: w.dmg, by, ghost: !!opts.ghost, id, g: w.id, trail: 0, wait: 0 });
}
function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if (o.wait) { if ((o.wait -= dt) <= 0) { scene.remove(o.m); orbs.splice(i, 1); } continue; } // someone else's, landed here: waiting for the server
    o.life -= dt;
    const step = VOID_SPD * dt;
    ray2.set(o.m.position, o.dir); ray2.far = step;
    const hit = firstHit(o.by, ray2);
    const onYou = !o.ghost && o.by && !friendly(o.by, YOU_T) && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    if (hit || onYou || o.life <= 0) {
      const p = (onYou ? youHitP.clone() : hit ? hit.point.clone() : o.m.position.clone()).addScaledVector(o.dir, hit && !hit.object.userData.zombie ? -.35 : 0); // not inside the wall
      if (o.ghost) { o.m.position.copy(p); o.wait = .6; continue; }
      scene.remove(o.m); orbs.splice(i, 1);
      net.boom(o.id, p, o.by);
      openVoid(p, o.by, o.dmg, o.g, o.id, false);
      continue;
    }
    o.m.position.addScaledVector(o.dir, step); o.m.children[0].rotation.x += dt * 7; o.m.children[0].rotation.y += dt * 5;
    if ((o.trail -= dt) <= 0) { o.trail = .04; wandBits('void', o.m.position, scene, 1, .3, .9, o.alt); }
  }
}
// who a void of by's pulls: only the bodies this game moves (other players' own games pull them)
function pullable(by, p) {
  const out = [], near = c => c.distanceTo(p) < VOID_PULL_R;
  if (by && respawnT <= 0 && !dead && !P.downed && !friendly(by, YOU_T) && near(chestOf(YOU_T, _my))) out.push(YOU_T);
  for (const z of zombies) if (z !== by && !z.dead && !z.remote && !z.mirror && !friendly(by, z) && near(chestOf(z, _my))) out.push(z);
  return out;
}
function openVoid(p, by, dmg, g, id, ghost) {
  const alt = by || !ghost ? altBy(by, gi(g)) : -1, fx = new THREE.Group(), core = new THREE.Mesh(orbGeo, ORB_MAT), halo = new THREE.Sprite(alt < 0 ? VOID_HALO : bitTint(VOID_HALO, alt));
  fx.add(core, halo); fx.position.copy(p); scene.add(fx);
  voids.push({ alt, p: p.clone(), by, dmg, g, id, ghost, t: VOID_T, caught: ghost && !by ? [] : pullable(by, p), fx, core, halo, bits: 0, snd: sfx('voidOpen', { at: p, far: 70 }) });
}
function pullBody(o, pos, r, c, dt) {
  const fx = fxOf(o); if (fx?.steady) return; // Ironclad stands its ground
  const dx = c.x - pos.x, dz = c.z - pos.z, d = Math.hypot(dx, dz);
  if (d < .5 || d > VOID_PULL_R + 1.5) return;
  const s = Math.min(d - .4, VOID_PULL * (1 - .5 * Math.min(1, d / VOID_PULL_R)) * (1 - (fx?.heavy || 0)) / (o.scale || 1) * dt);
  walkTo(pos, pos.x + dx / d * s, pos.z, r, false); walkTo(pos, pos.x, pos.z + dz / d * s, r, false);
}
function voidPop(p) {
  burst(p, 0xb46bff, 22); burst(p, 0xffffff, 8); wandBits('void', p, scene, 18, 7, 1.4); sfx('voidPop', { at: p, far: 110 });
  const m = new THREE.Mesh(pxSphere(1), new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: .7 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R: VOID_R });
}
function updateVoids(dt) {
  for (let i = voids.length - 1; i >= 0; i--) {
    const v = voids[i]; v.t -= dt;
    for (const o of v.caught) {
      if (o === YOU_T) { if (respawnT <= 0 && !dead && !P.downed) pullBody(P, P.pos, .35, v.p, dt); }
      else if (!o.dead) pullBody(o, o.g.position, o.r, v.p, dt);
    }
    const k = 1 - v.t / VOID_T, now = performance.now() / 1000; // it swells as it pulls
    v.core.scale.setScalar(2 + k * 2.5); v.core.rotation.x = now * 3; v.core.rotation.y = now * 4.4;
    v.halo.scale.setScalar(1.6 + k * 1.6 + Math.sin(now * 30) * .1);
    for (v.bits += dt * fxN(40); v.bits >= 1; v.bits--) { // bits drawn in from all round
      const a = Math.random() * 6.283, y = (Math.random() - .5) * 2.4, r = VOID_PULL_R * (.6 + Math.random() * .4);
      _my.set(v.p.x + Math.cos(a) * r, v.p.y + y, v.p.z + Math.sin(a) * r);
      fxBit(v.alt >= 0 ? bitTint(VOID_IN, v.alt) : VOID_IN, scene, _my, .12, v.p.clone().sub(_my).multiplyScalar(4), .45, 0); // fast enough to get there through the drag
    }
    if (v.t > 0) continue;
    voids.splice(i, 1); scene.remove(v.fx); stopSfx(v.snd);
    voidPop(v.p);
    if (!v.ghost) blast(v.p, VOID_R, v.dmg, v.by ? v.dmg : 0, null, v.by, v.g, v.id); // the server says what someone else's did
  }
}
// ---- the Titanium Ripsaw: a spinning blade that skips off walls and cuts through everyone in its way
const SAW_SPD = 60, SAW_LIFE = 1.5, SAW_BOUNCES = 3; // speed, how long it flies, how many walls it skips off
const saws = [], SAW_PX = .035, SAW_R = 8, SAW_TILT = .6, SAW_SPIN = 16;
let sawGeos = null;
// the blade: a toothed disc with slots and a blue hub
function sawPieces() {
  const out = [], B = pieceBox(out), S = palIdx(0xdfe6ee, false, true), D = palIdx(0x39404a), BLUE = palIdx(0x4f9dff, true);
  for (let z = -SAW_R; z < SAW_R; z++) { const w = Math.round(Math.sqrt(SAW_R * SAW_R - (z + .5) ** 2)); B(-w, w, 0, 1, z, z + 1, S); }
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, x = Math.round(Math.cos(a) * (SAW_R + .5)), z = Math.round(Math.sin(a) * (SAW_R + .5)); B(x - 1, x + 1, 0, 1, z - 1, z + 1, S); } // teeth
  B(3, 6, 0, 1, 0, 1, D); B(-6, -3, 0, 1, -1, 0, D); B(-1, 0, 0, 1, 3, 6, D); B(0, 1, 0, 1, -6, -3, D); // slots
  B(-1, 1, -1, 2, -1, 1, BLUE);
  return out;
}
// flying nose up, so whoever threw it sees its face and not just its edge
function sawAim(m, dir) {
  const f = _my.copy(dir).normalize(), r = _my2.crossVectors(f, grenUp);
  if (r.lengthSq() < .01) r.set(1, 0, 0);
  r.normalize(); const u = _sawU.crossVectors(r, f);
  m.userData.tilt.quaternion.setFromUnitVectors(grenUp, u.multiplyScalar(Math.cos(SAW_TILT)).addScaledVector(f, -Math.sin(SAW_TILT)).addScaledVector(r, .2).normalize());
}
const _sawU = new THREE.Vector3();
function sawBlade(dir, size = 1) {
  sawGeos ??= voxelGeos(sawPieces(), SAW_PX);
  const m = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();
  for (const [geo, mat] of [[sawGeos.lit, gunLit], [sawGeos.glow, gunGlow], [sawGeos.shine, gunShine]]) if (geo) spin.add(new THREE.Mesh(geo, mat));
  tilt.add(spin); m.add(tilt); m.scale.setScalar(size); m.userData.tilt = tilt; m.userData.spin = spin;
  sawAim(m, dir); return m;
}
WAND_BOLT.saw.mesh = sawBlade; // the armory throws the same blade
function fireSaw(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const m = sawBlade(dir);
  m.position.copy(from).addScaledVector(dir, .6); scene.add(m);
  const mine = !by && !opts.ghost; // yours leaves from the gun, low on the right, and swings onto its line
  if (mine) { m.userData.tilt.position.copy(_my.crossVectors(dir, grenUp).normalize().multiplyScalar(.22)).y -= .2; m.userData.tilt.scale.setScalar(.3); }
  saws.push({ m, v: dir.clone().multiplyScalar(SAW_SPD), life: SAW_LIFE, left: SAW_BOUNCES, dmg: w.dmg, by, ghost: !!opts.ghost, id, g: w.id, gone: 0, cut: new Set() });
}
function sawEnd(p, hit) { wandBits('ti', p, scene, 10, 4); if (hit) sfx('sawHit', { at: p, far: 40 }); }
// the first thing in its way that it hasn't cut already
const sawHit = (o, rc) => rc.intersectObjects(targetsFor(o.by, rc), false).find(h => { const z = h.object.userData.zombie; return !z || !friendly(o.by, z) && !o.cut.has(z); });
function updateSaws(dt) {
  for (let i = saws.length - 1; i >= 0; i--) {
    const o = saws[i];
    if (o.gone) { if ((o.gone -= dt) <= 0) saws.splice(i, 1); continue; } // someone else's, stopped here: waiting for where the server says it ended
    o.life -= dt; o.m.userData.spin.rotation.y += dt * SAW_SPIN;
    const T = o.m.userData.tilt, k = Math.exp(-14 * dt); T.position.multiplyScalar(k); T.scale.setScalar(1 - (1 - T.scale.x) * k);
    const step = SAW_SPD * dt;
    ray2.set(o.m.position, _my2.copy(o.v).normalize()); ray2.far = step + .05;
    let hit;
    for (;;) { // cuts through every body in its way, weaker each time
      hit = sawHit(o, ray2);
      const onYou = o.by && !o.cut.has(YOU_T) && !friendly(o.by, YOU_T) && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
      const zz = onYou ? YOU_T : hit?.object.userData.zombie; if (!zz) break;
      const p = onYou ? youHitP.clone() : hit.point.clone(), d = o.dmg * PIERCE_FALL ** o.cut.size;
      o.cut.add(zz); sawEnd(p, true);
      if (o.ghost) continue; // the server says what someone else's did
      if (onYou) { const head = p.y > P.pos.y + 1.45; hurtPlayer(Math.round(d * (head ? HEAD_MUL : 1)), false, o.by, head, 5, o.id); }
      else if (!zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, d * (head ? HEAD_MUL : 1), p, head, false, o.by, 5, o.id); }
    }
    if (hit && o.left > 0 && o.life > 0) { // skips off a wall
      grenN.copy(hit.face?.normal ?? grenUp).transformDirection(hit.object.matrixWorld); if (grenN.dot(o.v) > 0) grenN.negate();
      o.m.position.copy(hit.point).addScaledVector(grenN, .08); o.v.addScaledVector(grenN, -2 * o.v.dot(grenN)); o.left--; sawAim(o.m, o.v);
      wandBits('ti', hit.point, scene, 4, 3, .8); sfx('sawBounce', { at: hit.point, far: 40, v: .7 });
      continue;
    }
    if (hit || o.life <= 0) {
      scene.remove(o.m);
      if (o.ghost) { o.gone = .6; continue; }
      saws.splice(i, 1);
      const p = hit ? hit.point.clone() : o.m.position.clone();
      net.boom(o.id, p, o.by); sawEnd(p, false);
      continue;
    }
    o.m.position.addScaledVector(o.v, dt);
  }
}
// ---- the Boomerang: straight out along your aim and back to whoever threw it, through everyone in its way, once each way. A wall knocks it down, and it's back in the hand a moment later
const BOOMER_T = 1.15, BOOMER_R = 20, BOOMER_W = .25, BOOMER_LOST = .6, BOOMER_SPIN = 24, BOOMER_HIT = .4; // a trip's time, how far out it goes and how far it bows aside coming back, how long a knocked-down one takes, its spin, how far from its middle it still hits
const boomers = [], _bm = new THREE.Vector3(), _bm2 = new THREE.Vector3(), _bmD = new THREE.Vector3(), _bmU = new THREE.Vector3(), _bmW = new THREE.Vector3(), _bmE = new THREE.Vector3(), _bmO = new THREE.Vector3(), _bmY = new THREE.Vector3(0, 1, 0);
const boomerParts = { skins: {}, c: null }; let boomCatchK = 0; // boomCatchK: your catch, 1 to 0
function boomerMesh(size, skin = '') { // the gun's own model (in the skin it wears), spinning about its middle with its face toward whoever threw it
  const P = boomerParts.skins[skin] ??= (() => {
    const geos = gunGeos(gi('boomerang'), 0, 0, skin).main, g = new THREE.Group();
    for (const [k, mat] of Object.entries(GUN_MATS)) if (geos[k]) g.add(new THREE.Mesh(geos[k], mat));
    boomerParts.c ??= new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()); return { g };
  })();
  const m = new THREE.Group(), spin = new THREE.Group(), turn = new THREE.Group(), flat = P.g.clone();
  flat.position.copy(boomerParts.c).negate(); turn.rotation.y = Math.PI / 2; turn.add(flat); spin.add(turn); m.add(spin); // the model stands in y and z: turned to face along the flight's axis
  m.scale.setScalar(2 * size); m.userData.spin = spin;
  return m;
}
function fireBoomer(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : opts.show ? 0 : net.launch(w.id, from, dir, by), k = opts.size || 1, sc = opts.sc || scene;
  const bi = gi('boomerang'), m = boomerMesh(k, by ? gsFor(bi, by.rec?.skins?.[bi]) : opts.show ? heroSkin ?? gunSkin(bi) : opts.ghost ? '' : gunSkin(bi)), off = !by && !opts.ghost && !opts.show && gunG?.visible && WEAPONS[gunShown]?.boomer ? gunG.localToWorld(boomerParts.c.clone()).sub(from) : null; m.position.copy(from); sc.add(m); // yours leaves your hand
  if (off) { m.position.add(off); m.scale.multiplyScalar(.5); }
  const side = _bm.set(dir.z, 0, -dir.x); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
  boomers.push({ m, sc, o: from.clone(), d: dir.clone().normalize(), side: side.clone(), k, t: 0, dmg: w.dmg, by, ghost: !!opts.ghost, show: !!opts.show, home: opts.home, hide: opts.hide ?? by?.gunM, caught: opts.caught, id, g: w.id, cut: [new Set(), new Set()], at: from.clone(), lost: 0, off, grow: off ? .5 : 1 });
  sfx('boomerang', { at: from, far: 40, v: opts.show ? .5 : 1 });
}
const boomerOut = (by, show = false) => boomers.some(o => o.by === by && o.show === show && !o.ghost);
function boomerHome(o, out) { // whoever threw it, where they are now
  if (o.home) return o.home(out);
  if (o.by) return o.by.g ? out.copy(o.by.g.position).setY(o.by.g.position.y + 1.3) : out.copy(o.o);
  return out.copy(camera.position).setY(camera.position.y - .3);
}
function boomerPos(o, s, out) { // s of the way: straight out along the throw, slowing to a stop, then back to its thrower, bowed a little aside
  const f = Math.sin(Math.PI * s), b = Math.min(1, Math.max(0, (s - .5) * 2));
  boomerHome(o, out); out.lerpVectors(o.o, out, b * b * (3 - 2 * b));
  return out.addScaledVector(o.d, BOOMER_R * o.k * f).addScaledVector(o.side, BOOMER_W * o.k * Math.sin(Math.PI * b));
}
function boomerCatch(o, lost) {
  if (o.hide) o.hide.visible = true;
  if (o.show) { o.caught?.(); sfx('boomCatch', { v: .4 }); return; }
  if (o.by || o.ghost) { if (o.by) o.by.ct = 1; if (!lost) sfx('boomCatch', { at: o.m.position, far: 30 }); return; }
  sfx('boomCatch'); boomCatchK = 1; const i = gi(o.g); if (i !== undefined) ammo[i] = WEAPONS[i].mag; // back in your hand
}
function boomerRay(o, from, dir, far, cut, pass, edge = false) { // what it cuts along one line: every body in the way, up to the first wall (which it returns); its edges never take a head
  ray2.set(from, dir); ray2.far = far;
  let wall = null;
  for (const h of ray2.intersectObjects(targetsFor(o.by, ray2), false)) {
    const z = h.object.userData.zombie;
    if (!z) { wall = h; break; }
    if (z.dead || z === o.by || cut.has(z) || friendly(o.by, z)) continue;
    cut.add(z); sfx('boomHit', { at: h.point, far: 30 });
    if (!o.ghost) { const head = !edge && !!h.object.userData.head; hurtZombie(z, o.dmg * (head ? HEAD_MUL : 1), h.point.clone(), head, false, o.by, 5, o.id, pass); } // the server says what someone else's did
  }
  if (o.by && !o.ghost && !cut.has(YOU_T) && !friendly(o.by, YOU_T) && respawnT <= 0 && !dead && rayHitsYou(ray2.ray, far) < (wall ? wall.distance : Infinity)) {
    cut.add(YOU_T); const p = youHitP.clone(), head = !edge && p.y > P.pos.y + 1.45; sfx('boomHit', { at: p, far: 30 });
    hurtPlayer(Math.round(o.dmg * (head ? HEAD_MUL : 1)), false, o.by, head, 5, o.id, pass);
  }
  return wall;
}
function updateBoomers(dt) {
  for (let i = boomers.length - 1; i >= 0; i--) {
    const o = boomers[i];
    if (o.lost) { if ((o.lost -= dt) <= 0) { boomers.splice(i, 1); boomerCatch(o, true); } continue; }
    if (o.hide) o.hide.visible = false;
    const s = Math.min(1, (o.t += dt) / BOOMER_T); boomerPos(o, s, _bm); o.m.userData.spin.rotation.z += dt * BOOMER_SPIN;
    const seg = _bm2.copy(_bm).sub(o.at), len = seg.length();
    if (len > 1e-4 && !o.show) {
      const pass = s < .5 ? 0 : 1, cut = o.cut[pass], dir = _bmD.copy(seg).divideScalar(len), wall = boomerRay(o, o.at, dir, len + .05, cut, pass);
      _bmU.crossVectors(dir, _bmY); if (_bmU.lengthSq() < 1e-4) _bmU.set(1, 0, 0); _bmU.normalize(); _bmW.crossVectors(dir, _bmU);
      for (let r = 0; r < 4; r++) { // it's wide: beside it, above and below it too, unless a wall's that close
        const e = _bmE.copy(r < 2 ? _bmU : _bmW).multiplyScalar(r % 2 ? -1 : 1);
        if (!boomerRay(o, o.at, e, BOOMER_HIT, cut, pass, true)) boomerRay(o, _bmO.copy(o.at).addScaledVector(e, BOOMER_HIT), dir, (wall ? wall.distance : len) + .05, cut, pass, true);
      }
      if (wall && o.t > .05) { o.sc.remove(o.m); o.lost = BOOMER_LOST; wandBits('wind', wall.point, scene, 8, 3, .8); sfx('boomDrop', { at: wall.point, far: 40 }); continue; } // knocked down
    }
    o.m.position.copy(_bm); o.at.copy(_bm);
    if (o.off) { const f = Math.exp(-14 * dt); o.m.position.add(o.off.multiplyScalar(f)); o.grow += (1 - o.grow) * (1 - f); o.m.scale.setScalar(2 * o.k * o.grow); } // from your hand onto its path
    o.m.lookAt(boomerHome(o, _bm2)); o.m.rotateX(.45); // tipped back a little
    if (s >= 1 || s > .75 && boomerHome(o, _bm2).distanceTo(_bm) < 1.2 * o.k) { o.sc.remove(o.m); boomers.splice(i, 1); boomerCatch(o, false); } // caught
  }
}
function clearBoomers(sc) { for (let i = boomers.length - 1; i >= 0; i--) { const o = boomers[i]; if (sc && o.sc !== sc) continue; o.sc.remove(o.m); if (o.hide) o.hide.visible = true; boomers.splice(i, 1); } }
// someone else's wisp or orb, where the server says it went (g: its gun)
function mythBoom(id, p, g, by) {
  const wi = wisps.findIndex(o => o.ghost && o.id === id), oi = orbs.findIndex(o => o.ghost && o.id === id), si = saws.findIndex(o => o.ghost && o.id === id);
  if (si >= 0) { scene.remove(saws[si].m); saws.splice(si, 1); sawEnd(p, false); return true; }
  if (wi >= 0) { const o = wisps[wi]; for (const m of o.ms) scene.remove(m); wisps.splice(wi, 1); wispPop(p); return true; }
  if (oi >= 0) { const o = orbs[oi]; scene.remove(o.m); orbs.splice(oi, 1); openVoid(p, o.by, 0, o.g, id, true); return true; }
  if (BASE[gi(g)]?.wisp) { wispPop(p); return true; }
  if (BASE[gi(g)]?.saw) { sawEnd(p, false); return true; }
  if (BASE[gi(g)]?.vortex) { openVoid(p, by, 0, g, id, true); return true; }
  return false;
}
function clearMyths() {
  for (const o of wisps) for (const m of o.ms) scene.remove(m);
  for (const o of orbs) scene.remove(o.m);
  for (const v of voids) { scene.remove(v.fx); stopSfx(v.snd); }
  for (const o of saws) scene.remove(o.m);
  wisps.length = orbs.length = voids.length = saws.length = 0; chargeEnd(); clearBoomers(scene);
}
function mythTick(dt) { updateWisps(dt); updateOrbs(dt); updateVoids(dt); updateSaws(dt); }

// ---- the Aurora Rail: hold to charge (its coils light up one by one), let go to fire. A tap does CHARGE_MIN of the damage, only a full charge goes through
const CHARGE_MIN = .3;
const chargeMul = (w, k) => w.charge ? CHARGE_MIN + (1 - CHARGE_MIN) * Math.min(1, k) : 1;
let chargeSnd = null, chargeFull = false, shotCharge = 1; // shotCharge: how charged the shot being claimed was
function chargeEnd() { chargeT = 0; chargeFull = false; stopSfx(chargeSnd); chargeSnd = null; }
function chargeTick(dt, w) {
  const can = cd <= 0 && reloading <= 0 && respawnT <= 0 && !dead && !P.downed && ammo[cur] > 0 && gunShown === cur;
  if (can && held('shoot')) {
    if (!chargeT) chargeSnd = sfx(w.bow ? 'bowDraw' : 'chargeUp');
    chargeT = Math.min(w.charge, chargeT + dt);
    if (chargeT >= w.charge && !chargeFull) { chargeFull = true; sfx(w.bow ? 'bowFull' : 'chargeReady'); }
  } else if (chargeT > 0) {
    const k = chargeT / w.charge; chargeEnd();
    if (can) shoot(k);
  }
  if (gunShown === cur) chargeShow(gunCharges, chargeT / w.charge);
}
// the beam: thin and teal for a tap, a full charge is a wide band of every color
function auroraBeam(from, L, k, s, tip, held, sc = scene, alt = -1) { // s: how thick; alt: the gun, when it wears its own skin
  const full = k >= 1, C = c => alt < 0 ? c : shotCol(alt, 'alt', c);
  if (!full) { showLance(from, L, C(0x3dffd6), (.45 + .4 * k) * s, sc, tip, held); return; }
  showLance(from, L, C(0xa07bff), 2.2 * s, sc, tip, held);
  showLance(from, { ...L, walls: [], stop: false }, C(0x4dff9a), 1.2 * s, sc, tip, held);
  for (const q of L.walls) wandBits('aurora', q, sc, 8, 3);
  if (L.stop) wandBits('aurora', L.end, sc, 10, 3.5);
}
