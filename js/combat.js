const ray = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
// what bullets can hit
const headMul = w => w.headMul ?? HEAD_MUL; // the crossbow hits heads harder
function shotTargets() { const t = [ground, ...crateMeshes]; for (const zz of zombies) if (!zz.dead) t.push(...zz.parts); return t; }
// recoil only moves the camera, your real aim stays put
function recoilKick(w) {
  const r = RECOIL[w.id]; if (!r) return;
  const soft = 1 - adsT * ADS_SOFT;
  rec.tp = Math.min(REC_MAX, rec.tp + r.up * soft);
  rec.ty = Math.max(-REC_MAX / 2, Math.min(REC_MAX / 2, rec.ty + (Math.random() - .5) * 2 * r.side * soft));
}
function recoilTick(dt, w) {
  const k = Math.exp(-(RECOIL[w.id]?.back ?? 1) * REC_BACK * dt), e = 1 - Math.exp(-REC_RISE * dt);
  rec.tp *= k; rec.ty *= k;
  rec.p += (rec.tp - rec.p) * e; rec.y += (rec.ty - rec.y) * e;
}
function recoilReset() { rec.tp = rec.ty = rec.p = rec.y = 0; }
// tracers for your own shots
const TRACER_SPD = 140, TRACER_LEN = 1.5, tracers = [], tracerPool = [];
const tracerGeo = new THREE.BoxGeometry(1, 1, 1), tracerMat = new THREE.MeshBasicMaterial({ color: 0xffeab0, transparent: true, opacity: .4, depthWrite: false });
const laserMat = new THREE.MeshBasicMaterial({ color: 0xd47bff, transparent: true, opacity: .9, depthWrite: false }); // Executioner bolts
const trFrom = new THREE.Vector3(), trTo = new THREE.Vector3();
let tracerN = 0;
function tracerOk(w, k) { return w.laser || !w.scope && (w.pellets > 1 ? k % 3 === 0 : w.id !== 'eradicator' || (tracerN++ & 1) === 0); }
function tracer(from, to, laser = false) {
  const len = from.distanceTo(to); if (len < TRACER_LEN + .5) return; // point blank: nothing to see
  const m = tracerPool.pop() || new THREE.Mesh(tracerGeo, tracerMat);
  m.material = laser ? laserMat : tracerMat;
  m.position.copy(from); m.lookAt(to); m.scale.set(laser ? .07 : .04, laser ? .07 : .04, TRACER_LEN);
  scene.add(m); tracers.push({ m, from: from.clone(), dir: to.clone().sub(from).divideScalar(len), d: TRACER_LEN / 2, len });
}
function tracerTick(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i]; t.d += TRACER_SPD * dt;
    if (t.d >= t.len - TRACER_LEN / 2) { scene.remove(t.m); tracerPool.push(t.m); tracers.splice(i, 1); continue; }
    t.m.position.copy(t.from).addScaledVector(t.dir, t.d);
  }
}
function clearTracers() { for (const t of tracers) { scene.remove(t.m); tracerPool.push(t.m); } tracers.length = 0; }
function shoot() {
  const w = WEAPONS[cur];
  if (cd > 0 || reloading > 0 || respawnT > 0) return;
  if (w.melee) return stab(w);
  if (ammo[cur] <= 0) { if (reserve[cur]) reload(); else { cd = .3; dry(); } return; }
  ammo[cur]--; cd = w.rate; net.shot(w); botHear(P.pos.x, P.pos.z, YOU_T, w.quiet); // bots hear it
  if (gunSpin) gunSpinV = 30;
  if (w.beam) heatBeam(w);
  else if (w.flame) flame(w);
  else {
    kick = 1; flashMesh.visible = true; flashLight.intensity = 3; crossKick(kickFor(w)); recoilKick(w);
    if (w.starFx && !aiming) starPuff(flashMesh, scene, .6); // not while you aim: they'd fill the sight
    sfx(w.id);
    if (w.rocket) fireRocket(w);
    else if (w.flare) fireFlare(w);
    else if (w.grenade) fireGrenade(w);
    else {
      const targets = shotTargets();
      flashMesh.getWorldPosition(trFrom);
      // only primaries spread, aiming halves it
      const spread = w.spread * (1 - adsT * .5);
      for (let i = 0; i < w.pellets; i++) {
        ndc.set((Math.random() - .5) * spread * 2, (Math.random() - .5) * spread * 2);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(targets, false)[0];
        if (tracerOk(w, i)) tracer(trFrom, hit ? hit.point : ray.ray.at(60, trTo), w.laser);
        if (!hit) continue;
        const zz = hit.object.userData.zombie;
        if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? headMul(w) : 1), hit.point, head, false, null, 0); }
        else burst(hit.point, 0x999999, 2);
      }
    }
  }
  if (ammo[cur] === 0 && reserve[cur]) reload();
}
// knife: a few rays around the crosshair so aim can be a bit off
function stab(w) {
  cd = w.rate; kick = 1; sfx(w.swing || 'swing'); crossKick(kickFor(w)); net.shot(w);
  const knock = (o, from) => { if (w.knock && !net.on && !o.dead) launch(o, o.g.position.clone().setY(o.g.position.y + 1), from, w.knock, false); }; // online the server sends the push
  const targets = shotTargets();
  for (const [ox, oy] of [[0, 0], [.06, 0], [-.06, 0], [0, .06], [0, -.06]]) {
    ray2.setFromCamera(ndc.set(ox, oy), camera); ray2.far = w.range;
    const hit = ray2.intersectObjects(targets, false)[0], zz = hit?.object.userData.zombie;
    if (zz && !zz.dead) { const head = !!hit.object.userData.head; sfx(w.hit || 'slash', { at: hit.point, far: 20 }); hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 1); if (w.burn && !zz.dead) applyBurn(zz, w.burnT, w.burn, null, w.id, true); knock(zz, camera.position); return; }
    if (hit) return;
  }
}
// little stars out of the muzzle (Starsmasher)
const starBits = [], STAR_MATS = [0xffe27a, 0xffffff, 0xffc84a].map(color => new THREE.SpriteMaterial({ color, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, map: (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 8, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r); }
  g.fill(); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})() }));
const _sq = new THREE.Quaternion(), _sd = new THREE.Vector3();
function starPuff(from, sc = scene, size = 1) { // from: the muzzle object
  from.getWorldQuaternion(_sq); _sd.set(0, 0, -1).applyQuaternion(_sq);
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Sprite(STAR_MATS[Math.random() * 3 | 0]); from.getWorldPosition(s.position); s.scale.setScalar((.07 + Math.random() * .06) * size); sc.add(s);
    starBits.push({ s, sc, v: _sd.clone().multiplyScalar(2 + Math.random() * 2).add(new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).multiplyScalar(2.2)), life: .35 + Math.random() * .15, k: s.scale.x });
  }
}
function starTick(dt) {
  for (let i = starBits.length - 1; i >= 0; i--) {
    const b = starBits[i]; b.life -= dt; b.s.position.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-3 * dt));
    b.s.scale.setScalar(b.k * Math.max(0, Math.min(1, b.life * 4))); b.s.material.rotation += dt * 4;
    if (b.life <= 0) { b.sc.remove(b.s); starBits.splice(i, 1); }
  }
}
const BURN_T = 2.5; // burn time after the flames stop
const flames = [], flameGeo = new THREE.BoxGeometry(.18, .18, .18);
const flameMats = [0xffdd55, 0xff8a1a, 0xff4a1a].map(color => new THREE.MeshBasicMaterial({ color }));
function flame(w) {
  kick = .3; flameHeld = .12; crossKick(.5, 2); recoilKick(w); // keeps the fire sound going
  camera.getWorldDirection(fwd);
  flashMesh.getWorldPosition(tmp);
  for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(tmp); scene.add(m);
    const v = fwd.clone().multiplyScalar(13).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(2.5));
    flames.push({ m, v, life: .45 });
  }
  for (const zz of zombies) {
    if (zz.dead || zz.type === 'bot' && friendly(null, zz)) continue; // no friendly fire
    const c = zz.g.position.clone().setY(zz.g.position.y + zz.scale * 1.1), to = c.clone().sub(camera.position), d = to.length(), along = to.dot(fwd);
    if (along <= 0 || along > w.range) continue;
    const off = Math.sqrt(Math.max(0, d * d - along * along));
    if (off > .5 + along * .15 + zz.r) continue;
    ray2.set(camera.position, to.divideScalar(d)); ray2.far = d;
    if (ray2.intersectObjects(crateMeshes, false).length) continue;
    hurtZombie(zz, w.dmg, c, false, false, null, 3);
    applyBurn(zz, BURN_T, w.dmg * .6, null, 'flame');
  }
}
// heat ray beam
function heatBeam(w) {
  if (w.frost) frostHeld = .12; else beamHeld = .12; // keeps the hum going
  if (w.wand) wandOn = .15;
  crossKick(.4, 1.5); recoilKick(w);
  camera.getWorldDirection(fwd);
  ray2.setFromCamera(ndc.set(0, 0), camera); ray2.far = w.range;
  const hit = ray2.intersectObjects(shotTargets(), false)[0];
  const end = hit ? hit.point : tmp.copy(camera.position).addScaledVector(fwd, w.range);
  const zz = hit?.object.userData.zombie;
  if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 2); if (slows(w)) shockHit(zz, w); }
  if (w.shock && Math.random() < .25) sfx('zap', { v: .6 });
  if (w.frost && Math.random() < .2) sfx('chill', { v: .6 });
  if (hit && Math.random() < .35) burst(end, w.frost ? (Math.random() < .5 ? 0xcff4ff : 0xffffff) : w.shock ? (Math.random() < .5 ? 0x8fe9ff : 0xffffff) : Math.random() < .5 ? 0xffd27a : 0xff8a1a, 1);
  showBeam(null, flashMesh.getWorldPosition(beamFrom), end, beamKind(w));
}
// beams on screen, one per shooter (null = you)
const beamGeo = new THREE.BoxGeometry(1, 1, 1), beamFrom = new THREE.Vector3(), beams = new Map();
const beamMats = [new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: .55, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })];
const beamKind = w => w.frost ? 'frost' : !!w.shock;
const frostMats = [new THREE.MeshBasicMaterial({ color: 0xa8ecff, transparent: true, opacity: .6, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xffffff })];
const shockMats = [new THREE.MeshBasicMaterial({ color: 0x4fc8ff, transparent: true, opacity: .55, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xeefcff })];
// shock beam: slows whoever it hits
const SLOW_T = 2.5, SLOW_K = .85, FROST_K = .65; // frost slows harder
const slowMul = o => (o?.slowT || 0) > 0 ? o.slowK || SLOW_K : 1;
const slows = w => !!(w?.shock || w?.frost);
function shockHit(o, w) { const k = w?.frost ? FROST_K : SLOW_K; o.slowK = o.slowT > 0 ? Math.min(o.slowK || SLOW_K, k) : k; o.slowT = SLOW_T; }
function showBeam(by, from, to, shock = false) {
  let b = beams.get(by);
  if (!b) {
    const g = new THREE.Group();
    for (const [mat, s] of [[beamMats[0], 1], [beamMats[1], .4]]) { const m = new THREE.Mesh(beamGeo, mat); m.scale.set(s, s, 1); g.add(m); }
    scene.add(g); beams.set(by, b = { g, life: 0 });
  }
  const len = from.distanceTo(to), mats = shock === 'frost' ? frostMats : shock ? shockMats : beamMats, w = shock === 'frost' ? .05 + Math.random() * .012 : shock ? .04 + Math.random() * .04 : .055; // electricity flickers
  b.g.children[0].material = mats[0]; b.g.children[1].material = mats[1];
  b.g.position.lerpVectors(from, to, .5); b.g.lookAt(to); b.g.scale.set(w, w, len);
  b.g.visible = true; b.life = .08;
  if (by === null) b.dist = camera.position.distanceTo(to);
}
// your own beam stays on the muzzle and the crosshair between shots
const beamA = new THREE.Vector3(), beamB = new THREE.Vector3();
function beamTick(dt) {
  for (const [by, b] of beams) {
    if (!b.g.visible) continue;
    if ((b.life -= dt) <= 0) { b.g.visible = false; continue; }
    if (by !== null) continue;
    flashMesh.getWorldPosition(beamA); camera.getWorldDirection(beamB).multiplyScalar(b.dist).add(camera.position);
    b.g.position.lerpVectors(beamA, beamB, .5); b.g.lookAt(beamB); b.g.scale.z = beamA.distanceTo(beamB);
  }
}
function clearBeams() { for (const b of beams.values()) scene.remove(b.g); beams.clear(); }

// bot rockets, flares and grenades can hit you, yours can't
const youBox = new THREE.Box3(), youHitP = new THREE.Vector3();
function rayHitsYou(r, far) { // distance to your body along the ray, or Infinity
  if (respawnT > 0) return Infinity;
  youBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); youBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25);
  if (!r.intersectBox(youBox, youHitP)) return Infinity;
  const d = r.origin.distanceTo(youHitP); return d <= far ? d : Infinity;
}
const targetsFor = by => by ? shotTargets().filter(o => o.userData.zombie !== by) : shotTargets();
const ROCKET_SPD = 46, ROCKET_R = 4, ROCKET_SELF = 12; // speed, blast radius, max self damage
const rockets = [];
// rocket jumping: blasts push everyone away
const LAUNCH = 13, LAUNCH_OTHER = .45, LAUNCH_JUMP = 1.25, LAUNCH_UP = .35, LAUNCH_MAX = 17;
// sideways push lasts in the air, stops fast on the ground
const AIR_DRAG = .5, GROUND_DRAG = 10;
const launchV = new THREE.Vector3();
// f = 1 at point blank, 0 at the edge; k = the gun's own launch (Aerial Blast 1.1)
function launch(o, center, p, f, self, k = 1) {
  launchV.subVectors(center, p); if (launchV.lengthSq() < 1e-4) launchV.set(0, 1, 0);
  launchV.normalize(); launchV.y = Math.max(launchV.y, LAUNCH_UP); launchV.normalize();
  const you = o === P, jumping = you && (P.vy > 0 || held('jump'));
  let s = LAUNCH * f * k * (self ? 1 : LAUNCH_OTHER) * (jumping ? LAUNCH_JUMP : 1);
  if (!you) s /= o.scale || 1; // bigger zombies are heavier
  o.vy = Math.min(LAUNCH_MAX * k, Math.max(o.vy || 0, 0) + launchV.y * s);
  o.lx = (o.lx || 0) + launchV.x * s; o.lz = (o.lz || 0) + launchV.z * s;
  if (you) P.onGround = false;
}
// sideways part of a rocket launch
function launchMove(o, pos, r, grounded, dt) {
  if (!o.lx && !o.lz) return;
  if (!walkTo(pos, pos.x + o.lx * dt, pos.z, r, false)) o.lx = 0; // hit a wall
  if (!walkTo(pos, pos.x, pos.z + o.lz * dt, r, false)) o.lz = 0;
  const k = Math.exp(-(grounded ? GROUND_DRAG : AIR_DRAG) * dt); o.lx *= k; o.lz *= k;
  if (Math.abs(o.lx) + Math.abs(o.lz) < .1) o.lx = o.lz = 0;
}
// ghost = someone else's rocket online, the server says what it hit
function fireRocket(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const m = new THREE.Group();
  if (w.gust) { m.add(box(.18, .18, .18, GUST_MATS[0])); for (const r of [0, Math.PI / 2]) { const b = box(.42, .06, .06, GUST_MATS[1]); b.rotation.z = r; m.add(b); } } // a ball of wind
  else { const body = box(.1, .1, .4, lam({ color: 0x4b5b3b })), tip = box(.12, .12, .12, lam({ color: 0xaa3333 })); tip.position.z = .24; m.add(body, tip); }
  m.position.copy(from).addScaledVector(dir, .6); m.lookAt(tmp.copy(m.position).add(dir)); scene.add(m);
  rockets.push({ m, dir: dir.clone(), life: 3, dmg: w.dmg, smoke: 0, by, ghost: !!opts.ghost, id, g: w.id, gust: !!w.gust });
}
const GUST_MATS = [new THREE.MeshBasicMaterial({ color: 0xc8f0ff }), new THREE.MeshBasicMaterial({ color: 0xffffff })];
const FLARE_SPD = 60, FLARE_DROP = 2.5; // speed, drop
const FLARE_R = 2.5, FLARE_SPLASH = 14; // splash radius and damage
const flares = [], flareMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
function fireFlare(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const m = box(.14, .14, .14, flareMat);
  m.position.copy(from).addScaledVector(dir, .6); scene.add(m);
  flares.push({ m, v: dir.clone().multiplyScalar(FLARE_SPD), life: 3, dmg: w.dmg, burn: w.burn, burnT: w.burnT, trail: 0, by, ghost: !!opts.ghost, id });
}
// flare landing effect
function flareFx(p) { burst(p, 0xffaa33, 14); burst(p, 0xff4a1a, 8); sfx('flareHit', { at: p }); }
function updateFlares(dt) {
  for (let i = flares.length - 1; i >= 0; i--) {
    const f = flares[i]; f.life -= dt; f.v.y -= FLARE_DROP * dt;
    const step = f.v.length() * dt;
    ray2.set(f.m.position, tmp.copy(f.v).normalize()); ray2.far = step;
    let hit = ray2.intersectObjects(targetsFor(f.by), false)[0];
    const onYou = !f.ghost && f.by && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    if (onYou) hit = null;
    if (hit || onYou || f.life <= 0) {
      scene.remove(f.m); flares.splice(i, 1);
      if (f.ghost) continue; // the server says where it landed
      const p = onYou ? youHitP.clone() : hit ? hit.point : f.m.position;
      net.boom(f.id, p, f.by);
      flareFx(p);
      if (onYou) {
        const head = p.y > P.pos.y + 1.45;
        hurtPlayer(Math.round(f.dmg * (head ? 1.5 : 1)), false, f.by, head, 5, f.id); applyBurn(P, f.burnT, f.burn, f.by, 'flare');
      } else if (f.by && Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z) < FLARE_R + .3) {
        const pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
        hurtPlayer(Math.round(FLARE_SPLASH * (1 - Math.min(1, pd / FLARE_R) * .6)), false, f.by, false, 6, f.id);
      }
      const zz = hit?.object.userData.zombie;
      if (zz && !zz.dead) {
        const head = !!hit.object.userData.head;
        hurtZombie(zz, f.dmg * (head ? 1.5 : 1), hit.point, head, false, f.by, 5, f.id);
        if (!zz.dead && !(zz.type === 'bot' && friendly(f.by, zz))) applyBurn(zz, f.burnT, f.burn, f.by, 'flare', true);
      }
      for (const o of zombies) {
        if (o === zz || o === f.by || o.dead) continue;
        const c = o.g.position.clone().setY(o.g.position.y + o.scale), od = c.distanceTo(p);
        if (od < FLARE_R + o.r) hurtZombie(o, Math.round(FLARE_SPLASH * (1 - Math.min(1, od / FLARE_R) * .6)), c, false, false, f.by, 6, f.id);
      }
      continue;
    }
    f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += dt * 9; f.m.rotation.y += dt * 7;
    if ((f.trail -= dt) <= 0) { f.trail = .025; burst(f.m.position, Math.random() < .5 ? 0xffcc55 : 0xff6a1a, 1); }
  }
}
// grenade bouncer: bounces off walls, goes off on a body or when the fuse runs out
const GREN_SPD = 24, GREN_GRAV = 16, GREN_FUSE = 1.4, GREN_BOUNCE = .5; // speed, gravity, fuse, bounciness
const grenades = [], grenMats = [lam({ color: 0x3f7a3a }), lam({ color: 0xffc933 })], grenN = new THREE.Vector3(), grenUp = new THREE.Vector3(0, 1, 0);
function fireGrenade(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const m = new THREE.Group(); m.add(box(.16, .16, .16, grenMats[0]), box(.18, .05, .18, grenMats[1]));
  m.position.copy(from).addScaledVector(dir, .6); scene.add(m);
  grenades.push({ m, v: dir.clone().multiplyScalar(GREN_SPD), life: GREN_FUSE, dmg: w.dmg, g: w.id, by, ghost: !!opts.ghost, id });
}
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i]; g.life -= dt; g.v.y -= GREN_GRAV * dt;
    const step = g.v.length() * dt;
    ray2.set(g.m.position, tmp.copy(g.v).normalize()); ray2.far = step + .08;
    const hit = ray2.intersectObjects(targetsFor(g.by), false)[0];
    const onYou = !g.ghost && g.by && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    const body = onYou || !!hit?.object.userData.zombie;
    if (body || g.life <= 0) {
      if (g.ghost && g.life > -.5) { if (!body) g.m.position.addScaledVector(g.v, dt); else g.v.set(0, 0, 0); continue; } // the server says where it went off
      scene.remove(g.m); grenades.splice(i, 1);
      if (g.ghost) continue;
      const at = onYou ? youHitP.clone() : body ? hit.point.clone() : g.m.position.clone();
      net.boom(g.id, at, g.by);
      blast(at, ROCKET_R, g.dmg, g.by ? g.dmg : ROCKET_SELF, null, g.by, g.g, g.id);
      continue;
    }
    if (hit) { // bounce
      grenN.copy(hit.face?.normal ?? grenUp).transformDirection(hit.object.matrixWorld);
      if (grenN.dot(g.v) > 0) grenN.negate();
      g.m.position.copy(hit.point).addScaledVector(grenN, .1);
      const hard = -g.v.dot(grenN);
      g.v.addScaledVector(grenN, 2 * hard).multiplyScalar(GREN_BOUNCE);
      if (hard > 3) sfx('bounce', { at: g.m.position, far: 30 });
    } else g.m.position.addScaledVector(g.v, dt);
    g.m.rotation.x += dt * 8; g.m.rotation.z += dt * 5;
  }
}

// pickup pads
const pickMat = t => lam({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 });
const PICKUPS = {
  health: pickMat(tex(g => { noise(g, [235, 235, 235], 15); g.fillStyle = '#d22'; g.fillRect(6, 3, 4, 10); g.fillRect(3, 6, 10, 4); g.fillStyle = '#777'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  ammo: pickMat(tex(g => { noise(g, [85, 95, 45], 20); for (const x of [3, 7, 11]) { g.fillStyle = '#d8a830'; g.fillRect(x, 6, 2, 7); g.fillStyle = '#b87333'; g.fillRect(x, 4, 2, 2); } g.fillStyle = '#3a4020'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  armor: pickMat(tex(g => { noise(g, [175, 180, 188], 22); g.fillStyle = '#f2f4f7'; g.fillRect(4, 3, 8, 6); g.fillRect(5, 9, 6, 2); g.fillRect(6, 11, 4, 2); g.fillRect(7, 13, 2, 1); g.fillStyle = '#5c6068'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
};
const HEAL_PICK = 999, ARMOR_PICK = 999, // a pickup fills the bar
  RESPAWN = 20, FIRST_SPAWN = 15; // first pickups show up 15-25s in
const pads = [], pickGeo = new THREE.BoxGeometry(.45, .45, .45);
let padsFor = null;
function setupPads() {
  if (padsFor === MAP) return;
  for (const p of pads) clearPad(p);
  pads.length = 0; padsFor = MAP;
  for (const [x, z, y = 0] of MAP.pads) pads.push({ x, y, z, item: null, type: '', t: 0 });
}
function pickupType() {
  const opts = ['health', 'health'];
  if (owned.some((o, i) => o && !BASE[i].inf)) opts.push('ammo', 'ammo');
  if (P.maxArmor > 0) opts.push('armor', 'armor');
  return opts[Math.random() * opts.length | 0];
}
function spawnPickup(p, type) { // online the server picks the type
  p.type = type || pickupType(); p.item = new THREE.Mesh(pickGeo, PICKUPS[p.type]);
  p.item.position.set(p.x, p.y + .6, p.z); scene.add(p.item);
}
function clearPad(p) { if (p.item) { scene.remove(p.item); p.item = null; } }
function emptyPads() { for (const p of pads) { clearPad(p); p.claimAt = 0; p.t = net.serverPads ? Infinity : FIRST_SPAWN + Math.random() * 10; } } // online the server restocks the pads
function rerollPads() { for (const p of pads) if (p.item) { clearPad(p); spawnPickup(p); } }
// full health, armor or ammo means you can't grab it
function canPickup(type) {
  if (type === 'health') return P.hp < P.max;
  if (type === 'armor') return P.armor < P.maxArmor;
  return WEAPONS.some((w, i) => !BASE[i].inf && owned[i] && (BASE[i].pool ? ammo[i] < w.mag : reserve[i] < resMax(i)));
}
// srv = the server already applied it
function usePickup(type, srv) {
  if (!srv && !canPickup(type)) return false;
  if (type === 'health') { P.hp = srv ? srv.hp : Math.min(P.max, P.hp + HEAL_PICK); toast('HEALTH FULL', '#ff5a5a'); }
  else if (type === 'armor') { P.armor = srv ? srv.armor : Math.min(P.maxArmor, P.armor + ARMOR_PICK); toast('ARMOR FULL', armorCss()); }
  else {
    WEAPONS.forEach((w, i) => { if (!BASE[i].inf && owned[i] && reserve[i] < resMax(i)) reserve[i] = Math.min(resMax(i), reserve[i] + Math.ceil(resMax(i) / 2)); if (BASE[i].pool && owned[i]) ammo[i] = Math.min(w.mag, ammo[i] + Math.round(w.mag / 2)); });
    toast('+AMMO', '#ffffff');
  }
  sfx(type === 'health' ? 'pickHealth' : type === 'armor' ? 'pickArmor' : 'pickAmmo'); return true;
}
let toastT;
function toast(text, color) { const t = $('toast'); t.textContent = text; t.style.color = color; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = 0, 900); }
setupPads(); emptyPads();
