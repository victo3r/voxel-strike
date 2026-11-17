const ray = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
// what bullets can hit
const headMul = w => w.headMul ?? HEAD_MUL; // the crossbow hits heads harder
function shotTargets(rc) { const t = [ground, ...(rc ? coverAlong(rc.ray.origin, rc.ray.direction, rc.far) : crateMeshes)]; for (const zz of zombies) if (!zz.dead && !(net.coop && zz.type === 'bot')) t.push(...zz.parts); return t; } // rc: only the cover along that ray; co-op: shots go past teammates
// auto fire (phones): the trigger pulls itself while your crosshair has been on an enemy for a moment
let autoShot = false, autoT = 0;
const AUTO_T = .1, AUTO_NEAR = 5;
function autoTick(dt, w) {
  autoShot = false;
  if (!TOUCH || !opts.auto || !locked || respawnT > 0 || dead || P.downed || reloading > 0) { autoT = 0; return; }
  ray.setFromCamera(ndc.set(0, 0), camera);
  const hit = ray.intersectObjects(shotTargets(ray), false)[0], zz = hit?.object.userData.zombie, boom = w.rocket || w.grenade || w.flare;
  const on = zz && !zz.dead && !friendly(null, zz) && hit.distance <= (w.range ?? 120) && !(boom && hit.distance < AUTO_NEAR); // nothing that would blow up in your face
  autoT = on ? autoT + dt : 0;
  autoShot = autoT >= AUTO_T && !(w.charge && chargeT >= w.charge); // a charge gun lets go once it's full
}
// recoil only moves the camera, your real aim stays put
function recoilKick(w, k = 1) { // k: a part charge kicks less
  const r = RECOIL[w.id]; if (!r) return;
  const soft = (1 - adsT * ADS_SOFT) * k;
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
const tracerCols = {}, tracerCol = c => tracerCols[c] ??= new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .75, depthWrite: false }); // guns with their own tracer colour (the Crystal Companion)
function tracer(from, to, laser = false, col = 0) {
  const len = from.distanceTo(to); if (len < TRACER_LEN + .5) return; // point blank: nothing to see
  const m = tracerPool.pop() || new THREE.Mesh(tracerGeo, tracerMat);
  m.material = laser ? laserMat : col ? tracerCol(col) : tracerMat;
  const th = laser ? .07 : col ? .05 : .04;
  m.position.copy(from); m.lookAt(to); m.scale.set(th, th, TRACER_LEN);
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
function shoot(k) { // k: how charged the Aurora Rail was
  const w = WEAPONS[cur];
  if (cd > 0 || reloading > 0 || respawnT > 0) return;
  if (w.melee) return stab(w);
  if (w.charge && k === undefined && ammo[cur] > 0) return; // it fires when you let go (chargeTick)
  if (ammo[cur] <= 0) { myBurst.bn = 0; if (reserve[cur]) reload(); else { cd = .3; dry(); } return; }
  ammo[cur]--; cd = burstCd(w, myBurst); net.shot(w); botHear(P.pos.x, P.pos.z, YOU_T, w.quiet); // bots hear it
  if (gunSpin) gunSpinV = spinKick(cur);
  if (w.beam) heatBeam(w);
  else if (w.flame) flame(w);
  else if (w.lance) fireLance(w, k);
  else {
    kick = 1; flashMesh.visible = true; flashLight.intensity = 3; flashT = flashTime(w); crossKick(kickFor(w)); recoilKick(w);
    if (!aiming) muzzleBits(w, flashMesh, scene, .6); // not while you aim: they'd fill the sight
    sfx(w.id);
    if (w.wand) wandOn = .15;
    if (w.rocket) fireRocket(w);
    else if (w.flare) fireFlare(w);
    else if (w.grenade) fireGrenade(w);
    else if (w.wisp) fireWisp(w);
    else if (w.vortex) fireVoid(w);
    else if (w.saw) fireSaw(w);
    else if (w.spell) castSpell(w, camera.position.clone(), camera.getWorldDirection(fwd).clone(), null, flashMesh);
    else {
      flashMesh.getWorldPosition(trFrom);
      // only primaries spread, aiming halves it
      const spread = w.spread * (1 - adsT * .5);
      for (let i = 0; i < w.pellets; i++) {
        ndc.set((Math.random() - .5) * spread * 2, (Math.random() - .5) * spread * 2);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(shotTargets(ray), false)[0];
        const end = hit ? hit.point : ray.ray.at(60, trTo);
        if (w.wand || w.bolt) wandBolt(w.wand || w.bolt, trFrom, end); else if (tracerOk(w, i)) tracer(trFrom, end, w.laser, w.tracer); // wands and darts throw a bolt
        if (!hit) continue;
        const zz = hit.object.userData.zombie;
        if (zz && !zz.dead) {
          const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? headMul(w) : 1), hit.point, head, false, null, 0);
          if (w.wand) wandHit(w, zz, camera.position, null);
          if (w.track) trackHit(zz, w.track);
          if (w.soul && !net.pvp && zz.dead) soulHeal(null, zz.g.position.clone().setY(zz.g.position.y + 1), mode === 'zombies' ? SOUL_Z : w.soul); // online the server heals you
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
function showLance(from, L, col, k = 1, sc = scene, tip = null, held = null) { // tip: the muzzle it keeps coming out of while the gun kicks, until held() says the gun was put away
  for (const p of L.walls) burst(p, col, 3); // punched through here
  if (L.stop) burst(L.end, col, 4);
  const len = from.distanceTo(L.end); if (len < .3) return;
  const g = new THREE.Group(), mats = [
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    new THREE.MeshBasicMaterial({ color: _lc.set(col).lerp(new THREE.Color(0xffffff), .65), transparent: true, depthWrite: false, fog: false }), // it glows, fog doesn't hide it
  ];
  for (const [m, s] of [[mats[0], .17], [mats[1], .06]]) { const b = new THREE.Mesh(lanceGeo, m); b.scale.set(s * k, s * k, 1); g.add(b); }
  const l = { g, mats, sc, t: LANCE_T, end: L.end.clone(), tip, held }; lanceAt(l, from);
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
    if (l.tip && l.held && !l.held()) l.tip = null; // switched guns: it stays where it was
    if (l.tip) lanceAt(l, l.tip.getWorldPosition(_lf));
  }
}
function clearLances() { for (const l of lances) { l.sc.remove(l.g); l.mats.forEach(m => m.dispose()); } lances.length = 0; }
function fireLance(w, k = 1) {
  const full = !w.charge || k >= 1, kk = w.charge ? .35 + .65 * Math.min(1, k) : 1; // a part charge kicks less
  kick = kk; flashMesh.visible = true; flashLight.intensity = 3 * kk; flashT = flashTime(w); crossKick(kickFor(w) * kk); recoilKick(w, kk);
  if (!aiming) muzzleBits(w, flashMesh, scene, .6 * kk);
  sfx(w.charge ? full ? 'auroraFull' : 'aurora' : w.id);
  if (w.charge && full) net.ev('full');
  ray.setFromCamera(ndc.set(0, 0), camera);
  const W = w.charge ? { ...w, pierce: full, wallBreak: full } : w; // only a full charge goes through
  const L = lanceLine(ray.ray.origin, ray.ray.direction, W, shotTargets(ray), null, zz => zz.type === 'bot' && friendly(null, zz));
  shotCharge = w.charge ? Math.min(1, k) : 1;
  for (const h of L.hits) hurtZombie(h.zz, w.dmg * chargeMul(w, k) * h.mul * (h.head ? headMul(w) : 1), h.point, h.head, false, null, 0, 0, h.thru);
  shotCharge = 1;
  // through a sight it starts further out, or it would cover the view
  const g = cur, held = () => cur === g && respawnT <= 0, scoped = adsT > .5 && (w.scope || gunHolo);
  let from = flashMesh.getWorldPosition(_lf);
  if (scoped) { const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), D = Math.min(.5 / t, .4 * camera.position.distanceTo(L.end)); from = camera.localToWorld(_lf.set(0, -.7 * D * t, -D)); }
  if (w.charge) auroraBeam(from, L, k, scoped ? .3 : 1, scoped ? null : flashMesh, scoped ? null : held);
  else if (scoped) showLance(from, L, w.lance, .3);
  else showLance(from, L, w.lance, 1, scene, flashMesh, held);
}
// knife: a few rays around the crosshair so aim can be a bit off
function stab(w) {
  cd = w.rate; kick = 1; sfx(w.swing || 'swing'); crossKick(kickFor(w)); net.shot(w);
  const zap = p => { if (w.wand) stunZap(flashMesh.getWorldPosition(new THREE.Vector3()), p); }; // the Stun Wand throws a little blast
  const knock = (o, from) => { if (w.knock && !net.pvp && !o.dead) launch(o, o.g.position.clone().setY(o.g.position.y + 1), from, w.knock, false); }; // online the server sends the push
  for (const [ox, oy] of [[0, 0], [.06, 0], [-.06, 0], [0, .06], [0, -.06]]) {
    ray2.setFromCamera(ndc.set(ox, oy), camera); ray2.far = w.range;
    const hit = ray2.intersectObjects(shotTargets(ray2), false)[0], zz = hit?.object.userData.zombie;
    if (zz && !zz.dead) {
      const head = !!hit.object.userData.head; sfx(w.hit || 'slash', { at: hit.point, far: 20 }); hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 1);
      if (w.burn && !zz.dead) applyBurn(zz, w.burnT, w.burn, null, w.id, true);
      knock(zz, camera.position);
      if (w.stun && !net.pvp && !zz.dead) stunHit(zz, w.stun * longOf(youFx(), w)); // online the server says
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
// effect bits (sparks, puffs, shards, stars) are drawn in batches: one draw call per look and scene instead of one each
const FX_CAP = 2048, fxLayers = new Map(), _fxV = new THREE.Vector4();
const FX_VS = `attribute float size; attribute float rot; attribute vec3 tint; uniform float halfH; varying vec3 vT; varying float vR;
  void main() { vT = tint; vR = rot; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * projectionMatrix[1][1] * halfH / -mv.z; }`;
const FX_FS = `uniform sampler2D map; varying vec3 vT; varying float vR;
  void main() {
    vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + .5;
    if (p.x < 0. || p.y < 0. || p.x > 1. || p.y > 1.) discard;
    vec4 t = texture2D(map, vec2(p.x, 1. - p.y)); if (t.a < .01) discard;
    gl_FragColor = vec4(t.rgb * vT, t.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function fxLayer(sc, map) {
  let byMap = fxLayers.get(sc); if (!byMap) fxLayers.set(sc, byMap = new Map());
  let L = byMap.get(map); if (L) return L;
  const g = new THREE.BufferGeometry(), at = (k, n) => { const a = new THREE.BufferAttribute(new Float32Array(FX_CAP * n), n).setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); return a; };
  L = { pos: at('position', 3), tint: at('tint', 3), size: at('size', 1), rot: at('rot', 1), n: 0, was: 0 };
  const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, halfH: { value: 300 } }, vertexShader: FX_VS, fragmentShader: FX_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  L.m = new THREE.Points(g, mat); L.m.frustumCulled = false; L.m.userData.shared = true;
  L.m.onBeforeRender = r => { r.getCurrentViewport(_fxV); mat.uniforms.halfH.value = _fxV.w / 2; };
  sc.add(L.m); byMap.set(map, L);
  return L;
}
// a bit flying off from `at` (mat: a SpriteMaterial for its colour and look, k: its size)
function fxBit(mat, sc, at, k, v, life, g) { starBits.push({ p: at.clone(), mat, sc, k, v, life, g, rot: Math.random() * 6.28 }); }
function fxDraw() {
  for (const byMap of fxLayers.values()) for (const L of byMap.values()) L.n = 0;
  for (const b of starBits) {
    const L = fxLayer(b.sc, b.mat.map); if (L.n >= FX_CAP) continue;
    const i = L.n++, c = b.mat.color;
    L.pos.setXYZ(i, b.p.x, b.p.y, b.p.z); L.tint.setXYZ(i, c.r, c.g, c.b);
    L.size.setX(i, b.k * Math.max(0, Math.min(1, b.life * 4))); L.rot.setX(i, b.rot);
  }
  for (const byMap of fxLayers.values()) for (const L of byMap.values()) {
    L.m.geometry.setDrawRange(0, L.n);
    if (L.n) for (const a of [L.pos, L.tint, L.size, L.rot]) { a.clearUpdateRanges(); a.addUpdateRange(0, L.n * a.itemSize); a.needsUpdate = true; }
    L.m.visible = L.n > 0;
  }
}
const _sq = new THREE.Quaternion(), _sd = new THREE.Vector3(), _sp = new THREE.Vector3();
function starPuff(from, sc = scene, size = 1) { // from: the muzzle object
  from.getWorldQuaternion(_sq); _sd.set(0, 0, -1).applyQuaternion(_sq); from.getWorldPosition(_sp);
  for (let k = fxN(4); k > 0; k--) fxBit(STAR_MATS[Math.random() * 3 | 0], sc, _sp, (.07 + Math.random() * .06) * size, _sd.clone().multiplyScalar(2 + Math.random() * 2).add(new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).multiplyScalar(2.2)), .35 + Math.random() * .15);
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
  from.getWorldPosition(_sp);
  const bit = (mats, n, spd, spread, life, sz, g) => { for (let i = fxN(n); i > 0; i--)
    fxBit(mats[Math.random() * mats.length | 0], sc, _sp, sz * (.7 + Math.random() * .6) * size, _sd.clone().multiplyScalar(spd * (.6 + Math.random() * .6)).add(new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).multiplyScalar(spread)), life * (.8 + Math.random() * .4), g);
  };
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
    const b = starBits[i]; b.life -= dt; b.p.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-3 * dt)); if (b.g) b.v.y -= b.g * dt; b.rot += dt * 4;
    if (b.life <= 0) { starBits[i] = starBits[starBits.length - 1]; starBits.pop(); }
  }
  fxDraw();
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
    if (ray2.intersectObjects(coverAlong(ray2.ray.origin, ray2.ray.direction, d), false).length) continue;
    hurtZombie(zz, w.dmg, c, false, false, null, 3);
    applyBurn(zz, BURN_T, w.dmg * .6, null, 'flame');
  }
}
// heat ray beam
function heatBeam(w) {
  if (w.frost) frostHeld = .12; else if (w.chain) stormHeld = .12; else beamHeld = .12; // keeps the hum going
  if (w.wand) wandOn = .15;
  crossKick(.4, 1.5); recoilKick(w);
  camera.getWorldDirection(fwd);
  ray2.setFromCamera(ndc.set(0, 0), camera); ray2.far = w.range;
  const hit = ray2.intersectObjects(shotTargets(ray2), false)[0];
  const end = hit ? hit.point : tmp.copy(camera.position).addScaledVector(fwd, w.range);
  const zz = hit?.object.userData.zombie;
  if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 2); if (slows(w)) shockHit(zz, w); if (w.chain) chainJumps(zz, w, null, lvl[cur]); }
  if ((w.shock || w.chain) && Math.random() < .25) sfx('zap', { v: .6 });
  if (w.frost && Math.random() < .2) sfx('chill', { v: .6 });
  if (hit && Math.random() < .35) burst(end, w.frost ? (Math.random() < .5 ? 0xcff4ff : 0xffffff) : w.shock ? (Math.random() < .5 ? 0x8fe9ff : 0xffffff) : w.chain ? (Math.random() < .5 ? 0xc8b4ff : 0xffffff) : Math.random() < .5 ? 0xffd27a : 0xff8a1a, 1);
  flashMesh.getWorldPosition(beamFrom);
  if (!w.chain) return showBeam(null, beamFrom, end, beamKind(w));
  const d = camera.position.distanceTo(end); // stays on the muzzle and the crosshair between shots
  arc('you', beamFrom, end, .1, scene, (a, b) => { flashMesh.getWorldPosition(a); camera.getWorldDirection(b).multiplyScalar(d).add(camera.position); });
}
// beams on screen, one per shooter (null = you)
const beamGeo = new THREE.BoxGeometry(1, 1, 1), beamFrom = new THREE.Vector3(), beams = new Map();
const beamMats = [new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: .55, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })];
const beamKind = w => w.frost ? 'frost' : !!w.shock;
const beamSnd = w => w.frost ? 'frost' : w.chain ? 'storm' : 'heat'; // its start and end sounds
const frostMats = [new THREE.MeshBasicMaterial({ color: 0xa8ecff, transparent: true, opacity: .6, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xffffff })];
const shockMats = [new THREE.MeshBasicMaterial({ color: 0x4fc8ff, transparent: true, opacity: .55, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xeefcff })];
// shock beam: slows whoever it hits
const SLOW_T = 2.5, SLOW_K = .85, FROST_K = .65; // frost slows harder
const slowMul = o => (o?.slowT || 0) > 0 ? o.slowK || SLOW_K : 1;
const slows = w => !!(w?.shock || w?.frost);
function shockHit(o, w, k = 1) { // k: how much longer it lasts
  if (fxOf(o)?.steady || shrugs(o, 'slow', SLOW_T * k)) return;
  const m = w?.frost ? FROST_K : SLOW_K;
  if (o.mirror) { net.zHit(o, { sl: [m, SLOW_T * k] }); return; } // co-op: the host slows it
  o.slowK = o.slowT > 0 ? Math.min(o.slowK || SLOW_K, m) : m; o.slowT = Math.max(o.slowT || 0, SLOW_T * k);
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
function clearBeams() { for (const b of beams.values()) scene.remove(b.g); beams.clear(); arcs.length = 0; }

// lightning: jagged bolts of thin boxes, drawn as two instanced meshes per scene (glow and core)
const ARC_SEG = 7, ARC_CAP = 192, arcLayers = new Map(), arcs = [];
const arcMats = [new THREE.MeshBasicMaterial({ color: 0x8a6bff, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), new THREE.MeshBasicMaterial({ color: 0xf4f0ff, fog: false })];
function arcLayer(sc) {
  let L = arcLayers.get(sc);
  if (!L) { L = arcMats.map(m => { const im = new THREE.InstancedMesh(beamGeo, m, ARC_CAP); im.count = 0; im.frustumCulled = false; sc.add(im); return im; }); arcLayers.set(sc, L); }
  return L;
}
// a bolt from a to b with new jags; one per key (null: a new one), aim(a, b) moves its ends every frame
function arc(key, a, b, life = .08, sc = scene, aim = null) {
  let z = key === null ? null : arcs.find(o => o.key === key);
  if (!z) arcs.push(z = { key, a: new THREE.Vector3(), b: new THREE.Vector3(), jag: new Float32Array(ARC_SEG * 2 - 2) });
  z.a.copy(a); z.b.copy(b); z.life = life; z.sc = sc; z.aim = aim;
  for (let i = 0; i < z.jag.length; i++) z.jag[i] = Math.random() * 2 - 1;
}
const _lza = new THREE.Vector3(), _lzu = new THREE.Vector3(), _lzv = new THREE.Vector3(), _lzd = new THREE.Vector3(), _lzc = new THREE.Vector3(), _lzs = new THREE.Vector3(), _lzf = new THREE.Vector3(0, 0, 1);
const _lzm = new THREE.Matrix4(), _lzq = new THREE.Quaternion(), _lzj = Array.from({ length: ARC_SEG + 1 }, () => new THREE.Vector3());
function arcTick(dt) {
  let drawn = arcs.length > 0;
  for (const L of arcLayers.values()) { drawn ||= L[0].count > 0; L[0].count = L[1].count = 0; }
  for (let i = arcs.length - 1; i >= 0; i--) {
    const z = arcs[i];
    if ((z.life -= dt) <= 0) { arcs.splice(i, 1); continue; }
    if (z.aim) z.aim(z.a, z.b);
    const len = z.a.distanceTo(z.b); if (len < .05) continue;
    _lzd.subVectors(z.b, z.a).divideScalar(len);
    _lzu.set(0, 1, 0).cross(_lzd); if (_lzu.lengthSq() < 1e-4) _lzu.set(1, 0, 0); _lzu.normalize(); _lzv.crossVectors(_lzd, _lzu);
    const amp = Math.min(.35, len * .06), L = arcLayer(z.sc);
    for (let k = 0; k <= ARC_SEG; k++) {
      const j = _lzj[k].copy(z.a).addScaledVector(_lzd, len * k / ARC_SEG);
      if (k > 0 && k < ARC_SEG) j.addScaledVector(_lzu, z.jag[k * 2 - 2] * amp).addScaledVector(_lzv, z.jag[k * 2 - 1] * amp);
    }
    for (let k = 0; k < ARC_SEG; k++) {
      const p0 = _lzj[k], p1 = _lzj[k + 1], l = p0.distanceTo(p1) || .001;
      _lzc.lerpVectors(p0, p1, .5); _lzq.setFromUnitVectors(_lzf, _lza.subVectors(p1, p0).divideScalar(l));
      for (let m = 0; m < 2; m++) { const im = L[m], w = m ? .02 : .07; if (im.count < ARC_CAP) im.setMatrixAt(im.count++, _lzm.compose(_lzc, _lzq, _lzs.set(w, w, l + w * .5))); }
    }
  }
  if (drawn) for (const L of arcLayers.values()) for (const im of L) im.instanceMatrix.needsUpdate = true;
}
// Tempest Coil: from whoever the beam hits, the lightning jumps to the nearest enemy in reach, then on once more, weaker each jump
const CHAIN_FALL = .6, CHAIN_N = 2, _ch0 = new THREE.Vector3(), _ch1 = new THREE.Vector3();
const chestOf = (o, v) => o === YOU_T ? v.set(P.pos.x, P.pos.y + 1, P.pos.z) : v.copy(o.g.position).setY(o.g.position.y + o.g.scale.y);
function chainJumps(first, w, by, L, deal = true) {
  const reach = w.chain[L] ?? w.chain[0], done = new Set([first]);
  let at = first;
  for (let n = 1; n <= CHAIN_N; n++) {
    chestOf(at, _ch0);
    let best = null, bd = reach;
    const look = o => { if (done.has(o) || o === by || friendly(by, o)) return; const d = chestOf(o, _ch1).distanceTo(_ch0); if (d < bd && clearLine(_ch0, _ch1)) { bd = d; best = o; } };
    for (const z of zombies) if (!z.dead && z.g.visible) look(z);
    if (by && respawnT <= 0 && !dead && !P.downed) look(YOU_T);
    if (!best) break;
    arc(null, _ch0, chestOf(best, _ch1), .09);
    if (Math.random() < .2) sfx('zap', { at: _ch1, far: 30, v: .5 });
    if (deal) {
      const d = w.dmg * CHAIN_FALL ** n * (by ? BOT.dmgMul : 1), from = at === YOU_T ? net.pid : at.pid | 0;
      if (best === YOU_T) hurtPlayer(Math.max(1, Math.round(d)), false, by, false, 9, from, n);
      else hurtZombie(best, d, _ch1.clone(), false, false, by, 9, from, n);
    }
    done.add(best); at = best;
  }
}
// the Tracker: a dart hit shows them to you through walls for a while, and whoever it hit gets a warning
function trackHit(o, t) { const now = performance.now(); if (!(o.trackAt > now)) sfx('trackOn', { v: .8 }); o.trackAt = now + t * 1000; }
function youTracked(t) { const now = performance.now(); if (!(P.trackAt > now)) { toast('TRACKED', '#ffd23a'); sfx('tracked'); } P.trackAt = now + t * 1000; }

// bot rockets, flares and grenades can hit you, yours can't
const youBox = new THREE.Box3(), youHitP = new THREE.Vector3();
function rayHitsYou(r, far) { // distance to your body along the ray, or Infinity
  if (respawnT > 0) return Infinity;
  youBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); youBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25);
  if (!r.intersectBox(youBox, youHitP)) return Infinity;
  const d = r.origin.distanceTo(youHitP); return d <= far ? d : Infinity;
}
const targetsFor = (by, rc) => by ? shotTargets(rc).filter(o => o.userData.zombie !== by) : shotTargets(rc);
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
  if (o.mirror) { net.zHit(o, { ln: [r2(launchV.x * s), r2(launchV.y * s), r2(launchV.z * s), k] }); return; } // co-op: the host throws it
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
// ---- Thornwood and Skyrunner
const GLIDE_FALL = 2.2, DASH_SPD = 22, DASH_UP = 3, DASH_DRAG = 5;
// armor (and health, with the boots) grows back after a while without a hit; online the server does it. 1 = armor grew, 2 = health
function regrow(o, fx, dt, maxHp) {
  if (!fx || !fx.grow && !fx.heal) return 0;
  if ((o.calm = (o.calm || 0) + dt) < fx.wait) return 0;
  const a = o.armor, h = o.hp;
  if (fx.grow) o.armor = Math.min(o.maxArmor, o.armor + fx.grow * dt);
  if (fx.heal) o.hp = Math.min(maxHp, o.hp + fx.heal * dt);
  return (o.armor > a) + 2 * (o.hp > h);
}
// the bars glow while they grow
function growBars(k) { if (k & 1) P.growA = .3; if (k & 2) P.growH = .3; }
const growFx = p => burst(tmp.set(p.x, p.y + 1.1, p.z), 0x6fcf4a, 4);
// the Thornwood Crown: melee hits sting whoever made them
const stingFx = p => { burst(tmp.set(p.x, p.y + 1.1, p.z), 0x5a3a1e, 5); sfx('thorns', { at: p, far: 20 }); };
function stingYou(z, d) { // a zombie clawed you
  const t = youFx().thorns; if (!t || !(d > 0) || z.dead) return;
  stingFx(z.g.position); hurtZombie(z, d * t, z.g.position.clone().setY(z.g.position.y + 1), false, true, null, 8);
}
// the full Skyrunner set with a saber in hand: a dash in the air toward where you look
const canDash = (fx, g) => fx.dash && BASE[g]?.swing === 'saber';
function dashYou() {
  const h = DASH_SPD * Math.max(.5, Math.cos(P.pitch));
  P.dashed = true; P.dx = -Math.sin(P.yaw) * h; P.dz = -Math.cos(P.yaw) * h; P.vy = DASH_UP + Math.sin(P.pitch) * DASH_SPD * .6;
  sfx('dash'); burst(tmp.set(P.pos.x, P.pos.y + .8, P.pos.z), 0xbff6fa, 8); net.ev('dash');
}
function dashMove(o, pos, r, dt) {
  if (!o.dx && !o.dz) return;
  if (!walkTo(pos, pos.x + o.dx * dt, pos.z, r, false)) o.dx = 0;
  if (!walkTo(pos, pos.x, pos.z + o.dz * dt, r, false)) o.dz = 0;
  const k = Math.exp(-DASH_DRAG * dt); o.dx *= k; o.dz *= k;
  if (Math.abs(o.dx) + Math.abs(o.dz) < .3) o.dx = o.dz = 0;
}
// ghost = someone else's rocket online, the server says what it hit
function fireRocket(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir, by);
  const m = new THREE.Group();
  if (w.gust) { m.add(box(.18, .18, .18, GUST_MATS[0])); for (const r of [0, Math.PI / 2]) { const b = box(.42, .06, .06, GUST_MATS[1]); b.rotation.z = r; m.add(b); } } // a ball of wind
  else { const [bc, tc] = ROCKET_COLS[w.id] ?? ROCKET_COLS.rocket, body = box(.1, .1, .4, lam({ color: bc })), tip = box(.12, .12, .12, lam({ color: tc })); tip.position.z = .24; m.add(body, tip); }
  m.position.copy(from).addScaledVector(dir, .6); m.lookAt(tmp.copy(m.position).add(dir)); scene.add(m);
  rockets.push({ m, dir: dir.clone(), life: 3, dmg: w.dmg, smoke: 0, by, ghost: !!opts.ghost, id, g: w.id, gust: !!w.gust });
}
const GUST_MATS = [new THREE.MeshBasicMaterial({ color: 0xc8f0ff }), new THREE.MeshBasicMaterial({ color: 0xffffff })];
const ROCKET_COLS = { rocket: [0x4b5b3b, 0xaa3333], salvo: [0x222024, 0xe0342c], tirocket: [0xaab5c2, 0x4f8fe0] }; // body, tip
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
    let hit = ray2.intersectObjects(targetsFor(f.by, ray2), false)[0];
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
    const hit = ray2.intersectObjects(targetsFor(g.by, ray2), false)[0];
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
