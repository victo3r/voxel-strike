const ray = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
// what bullets can hit
const headMul = w => w.headMul ?? HEAD_MUL; // the crossbow hits heads harder
function shotTargets() { const t = [ground, ...crateMeshes]; for (const zz of zombies) if (!zz.dead) t.push(...zz.parts); return t; }
// recoil only moves the camera, your real aim stays put
function recoilKick(w) {
  const r = RECOIL[w.id]; if (!r) return;
  const soft = 1 - adsT * ADS_SOFT;
  rec.tp = Math.min(REC_MAX, rec.tp + r.up * soft * (heavyKick(w) ? HEAVY.lift : 1));
  rec.ty = Math.max(-REC_MAX / 2, Math.min(REC_MAX / 2, rec.ty + (Math.random() - .5) * 2 * r.side * soft));
}
function recoilTick(dt, w) {
  const k = Math.exp(-(RECOIL[w.id]?.back ?? 1) * (heavyKick(w) ? HEAVY.settle : 1) * REC_BACK * dt), e = 1 - Math.exp(-REC_RISE * dt);
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
  else if (w.lance) fireLance(w);
  else {
    kick = 1; flashMesh.visible = true; flashLight.intensity = 3; flashT = flashTime(w); crossKick(kickFor(w)); recoilKick(w);
    if (!aiming) muzzleBits(w, flashMesh, scene, .6); // not while you aim: they'd fill the sight
    sfx(w.id);
    if (w.wand) wandOn = .15;
    if (w.rocket) fireRocket(w);
    else if (w.flare) fireFlare(w);
    else if (w.grenade) fireGrenade(w);
    else if (w.spell) castSpell(w, camera.position.clone(), camera.getWorldDirection(fwd).clone(), null, flashMesh);
    else {
      const targets = shotTargets();
      flashMesh.getWorldPosition(trFrom);
      // only primaries spread, aiming halves it
      const spread = w.spread * (1 - adsT * .5);
      for (let i = 0; i < w.pellets; i++) {
        ndc.set((Math.random() - .5) * spread * 2, (Math.random() - .5) * spread * 2);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(targets, false)[0];
        const end = hit ? hit.point : ray.ray.at(60, trTo);
        if (w.wand) wandBolt(w.wand, trFrom, end); else if (tracerOk(w, i)) tracer(trFrom, end, w.laser); // wands throw a bolt
        if (!hit) continue;
        const zz = hit.object.userData.zombie;
        if (zz && !zz.dead) {
          const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? headMul(w) : 1), hit.point, head, false, null, 0);
          if (w.wand) wandHit(w, zz, camera.position, null);
          if (w.soul && !net.on && zz.dead) soulHeal(null, zz.g.position.clone().setY(zz.g.position.y + 1), mode === 'zombies' ? SOUL_Z : w.soul); // online the server heals you
        }
        else if (!w.wand) burst(hit.point, 0x999999, 2);
      }
    }
  }
  if (ammo[cur] === 0 && reserve[cur]) reload();
}
// lance guns: one beam through bodies and walls that hangs in the air for a moment
const LANCE_FAR = 120, LANCE_T = .5, PIERCE_FALL = .75, WALL_MUL = .5;
const lanceRay = new THREE.Raycaster(), lances = [], lanceGeo = new THREE.BoxGeometry(1, 1, 1), _lf = new THREE.Vector3(), _lc = new THREE.Color();
// everything a lance passes, in order, and how hard it still hits each body
function lanceLine(eye, dir, w, parts, you = null, skip = null) {
  lanceRay.set(eye, dir); lanceRay.far = LANCE_FAR;
  const hs = lanceRay.intersectObjects(parts, false), hits = [], walls = [], seen = new Set();
  if (you) { let k = 0; while (k < hs.length && hs[k].distance < you.distance) k++; hs.splice(k, 0, you); }
  let wall = false, n = 0, end = null;
  for (const h of hs) {
    const zz = h.you ? YOU_T : h.object.userData.zombie;
    if (zz) {
      if (zz.dead || seen.has(zz) || skip?.(zz)) continue;
      seen.add(zz);
      hits.push({ zz, head: h.you ? h.point.y > P.pos.y + 1.45 : !!h.object.userData.head, point: h.point, mul: PIERCE_FALL ** n * (wall ? WALL_MUL : 1), thru: n * 2 + (wall ? 1 : 0) });
      n++;
      if (!w.pierce) { end = h.point; break; }
      continue;
    }
    if (h.object === ground || !w.wallBreak) { end = h.point; break; }
    if (walls.length < 4) walls.push(h.point);
    wall = true;
  }
  return { hits, walls, end: end ? end.clone() : eye.clone().addScaledVector(dir, LANCE_FAR), stop: !!end };
}
// the beam: a glow and a hot core, k = thickness
function showLance(from, L, col, k = 1, sc = scene, tip = null) { // tip: the muzzle it keeps coming out of while the gun kicks
  for (const p of L.walls) burst(p, col, 3); // punched through here
  if (L.stop) burst(L.end, col, 4);
  const len = from.distanceTo(L.end); if (len < .3) return;
  const g = new THREE.Group(), mats = [
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    new THREE.MeshBasicMaterial({ color: _lc.set(col).lerp(new THREE.Color(0xffffff), .65), transparent: true, depthWrite: false, fog: false }), // it glows, fog doesn't hide it
  ];
  for (const [m, s] of [[mats[0], .17], [mats[1], .06]]) { const b = new THREE.Mesh(lanceGeo, m); b.scale.set(s * k, s * k, 1); g.add(b); }
  const l = { g, mats, sc, t: LANCE_T, end: L.end.clone(), tip }; lanceAt(l, from);
  sc.add(g); lances.push(l);
}
function lanceAt(l, from) { l.g.position.lerpVectors(from, l.end, .5); l.g.lookAt(l.end); l.g.scale.z = from.distanceTo(l.end); }
function lanceTick(dt) {
  for (let i = lances.length - 1; i >= 0; i--) {
    const l = lances[i];
    if ((l.t -= dt) <= 0) { l.sc.remove(l.g); l.mats.forEach(m => m.dispose()); lances.splice(i, 1); continue; }
    const f = l.t / LANCE_T;
    l.mats[0].opacity = .5 * f; l.mats[1].opacity = Math.min(1, f * 1.6);
    l.g.scale.x = l.g.scale.y = .5 + .5 * f; // thins out as it fades
    if (l.tip) lanceAt(l, l.tip.getWorldPosition(_lf));
  }
}
function clearLances() { for (const l of lances) { l.sc.remove(l.g); l.mats.forEach(m => m.dispose()); } lances.length = 0; }
function fireLance(w) {
  kick = 1; flashMesh.visible = true; flashLight.intensity = 3; flashT = flashTime(w); crossKick(kickFor(w)); recoilKick(w);
  if (!aiming) muzzleBits(w, flashMesh, scene, .6);
  sfx(w.id);
  ray.setFromCamera(ndc.set(0, 0), camera);
  const L = lanceLine(ray.ray.origin, ray.ray.direction, w, shotTargets(), null, zz => zz.type === 'bot' && friendly(null, zz));
  for (const h of L.hits) hurtZombie(h.zz, w.dmg * h.mul * (h.head ? headMul(w) : 1), h.point, h.head, false, null, 0, 0, h.thru);
  // through a sight it starts further out, or it would cover the view
  if (adsT > .5 && (w.scope || gunHolo)) {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), D = Math.min(.5 / t, .4 * camera.position.distanceTo(L.end));
    showLance(camera.localToWorld(_lf.set(0, -.7 * D * t, -D)), L, w.lance, .3);
  } else showLance(flashMesh.getWorldPosition(_lf), L, w.lance, 1, scene, flashMesh);
}
// knife: a few rays around the crosshair so aim can be a bit off
function stab(w) {
  cd = w.rate; kick = 1; sfx(w.swing || 'swing'); crossKick(kickFor(w)); net.shot(w);
  const zap = p => { if (w.wand) stunZap(flashMesh.getWorldPosition(new THREE.Vector3()), p); }; // the Stun Wand throws a little blast
  const knock = (o, from) => { if (w.knock && !net.on && !o.dead) launch(o, o.g.position.clone().setY(o.g.position.y + 1), from, w.knock, false); }; // online the server sends the push
  const targets = shotTargets();
  for (const [ox, oy] of [[0, 0], [.06, 0], [-.06, 0], [0, .06], [0, -.06]]) {
    ray2.setFromCamera(ndc.set(ox, oy), camera); ray2.far = w.range;
    const hit = ray2.intersectObjects(targets, false)[0], zz = hit?.object.userData.zombie;
    if (zz && !zz.dead) {
      const head = !!hit.object.userData.head; sfx(w.hit || 'slash', { at: hit.point, far: 20 }); hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 1);
      if (w.burn && !zz.dead) applyBurn(zz, w.burnT, w.burn, null, w.id, true);
      knock(zz, camera.position);
      if (w.stun && !net.on && !zz.dead) stunHit(zz, w.stun * longOf(youFx(), w)); // online the server says
      zap(hit.point); return;
    }
    if (hit) { zap(hit.point); return; }
  }
  zap(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(w.range).add(camera.position));
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
// ruby shards (Ruby Pierce) and short lines of energy shooting off the tip (Paragon)
const SHARD_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const dx = x - 3.5, dy = y - 3.5; if (Math.abs(dx) / 3 + Math.abs(dy) / 4 > 1) continue; g.fillStyle = dx < 0 ? (dy < 0 ? '#fff' : '#ddd') : dy < 0 ? '#bbb' : '#888'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})();
const bitMat = (color, map) => new THREE.SpriteMaterial({ color, map, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
const SHARD_MATS = [0xff2e48, 0xff4f6c, 0xff8ea4].map(c => bitMat(c, SHARD_TEX));
// a streak is a white-hot core in a blue glow, so it shows on the sky as well as in the dark
const streakGeo = new THREE.BoxGeometry(1, 1, 1), streaks = [], _sv = new THREE.Vector3(), _zAx = new THREE.Vector3(0, 0, 1);
const streakMat = (color, vm) => new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, depthWrite: false, depthTest: !vm });
const STREAK_MATS = [streakMat(0x2f8cff), streakMat(0xeefaff)], STREAK_VM = [streakMat(0x2f8cff, true), streakMat(0xeefaff, true)]; // yours draw over the barrel and the flash
function muzzleBits(w, from, sc = scene, size = 1) {
  if (w.starFx) starPuff(from, sc, size);
  const k = FLASH_FX[w.id]?.bits; if (!k) return;
  from.getWorldQuaternion(_sq); _sd.set(0, 0, -1).applyQuaternion(_sq);
  const bit = (mats, n, spd, spread, life, sz, g) => { for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mats[Math.random() * mats.length | 0]); from.getWorldPosition(s.position); s.scale.setScalar(sz * (.7 + Math.random() * .6) * size); sc.add(s);
    starBits.push({ s, sc, v: _sd.clone().multiplyScalar(spd * (.6 + Math.random() * .6)).add(new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).multiplyScalar(spread)), life: life * (.8 + Math.random() * .4), k: s.scale.x, g });
  } };
  if (k === 'gem') bit(SHARD_MATS, 9, 4, 2.8, .5, .11, 5);
  else if (WAND_BITS[k]) bit(...WAND_BITS[k]);
  else if (k === 'energy') { // short lines of energy shooting out of the tip, riding with the gun
    const box = from.parent; if (!box) return;
    const sz = size / box.getWorldScale(_sv).x, mine = box === vm, mats = mine ? STREAK_VM : STREAK_MATS;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6.283, sp = .22 + Math.random() * .5, d = new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp, -1).normalize();
      const o = from.position.clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar((.004 + Math.random() * .012) * sz)).addScaledVector(d, -.02 * sz); // from just inside the barrel
      const ms = mats.map((mt, j) => { const m = new THREE.Mesh(streakGeo, mt); m.quaternion.setFromUnitVectors(_zAx, d); m.visible = false; m.userData.shared = true; if (mine) m.renderOrder = 6 + j; box.add(m); return m; });
      const t = .18 + Math.random() * .12;
      streaks.push({ ms, sc: box, o, d, sp: (2.6 + Math.random() * 2.4) * sz, len: (.15 + Math.random() * .13) * sz, w: (.02 + Math.random() * .012) * sz, t, age: -i * .009 });
    }
  }
}
function starTick(dt) {
  for (let i = starBits.length - 1; i >= 0; i--) {
    const b = starBits[i]; b.life -= dt; b.s.position.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-3 * dt)); if (b.g) b.v.y -= b.g * dt;
    b.s.scale.setScalar(b.k * Math.max(0, Math.min(1, b.life * 4))); b.s.material.rotation += dt * 4;
    if (b.life <= 0) { b.sc.remove(b.s); starBits.splice(i, 1); }
  }
  for (let i = streaks.length - 1; i >= 0; i--) { // each grows out of the tip, lets go, then thins away
    const g = streaks[i]; if ((g.age += dt) < 0) continue;
    if (g.age >= g.t) { g.ms.forEach(m => g.sc.remove(m)); streaks.splice(i, 1); continue; }
    const head = g.sp * g.age, tail = Math.max(0, head - g.len), th = g.w * (1 - (g.age / g.t) ** 2);
    g.ms.forEach((m, j) => { m.visible = true; m.position.copy(g.o).addScaledVector(g.d, (head + tail) / 2); m.scale.set(th * (j ? .45 : 1), th * (j ? .45 : 1), head - tail + (j ? 0 : th * .5)); });
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
function shockHit(o, w, k = 1) { // k: how much longer it lasts
  if (fxOf(o)?.steady || shrugs(o, 'slow', SLOW_T * k)) return;
  const m = w?.frost ? FROST_K : SLOW_K; o.slowK = o.slowT > 0 ? Math.min(o.slowK || SLOW_K, m) : m; o.slowT = Math.max(o.slowT || 0, SLOW_T * k);
}
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
  if (!self) { const fx = fxOf(o); if (fx?.steady) return; f *= 1 - (fx?.heavy || 0); } // Ironclad stands its ground
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
