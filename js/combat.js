const ray = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
// crateMeshes = whatever stops bullets on the loaded map (crates, tree trunks, rocks...), set by useMap in maps/world.js
function shotTargets() { const t = [ground, ...crateMeshes]; for (const zz of zombies) if (!zz.dead) t.push(...zz.parts); return t; }
function shoot() {
  const w = WEAPONS[cur];
  if (cd > 0 || reloading > 0 || respawnT > 0) return;
  if (w.melee) return stab(w);
  if (ammo[cur] <= 0) { if (reserve[cur]) reload(); else { cd = .3; dry(); } return; }
  ammo[cur]--; cd = w.rate; net.shot(w);
  if (gunSpin) gunSpinV = 30;
  if (w.beam) heatBeam(w);
  else if (w.flame) flame(w);
  else {
    kick = 1; flashMesh.visible = true; flashLight.intensity = 3; crossKick(kickFor(w));
    sfx(w.id);
    if (w.rocket) fireRocket(w);
    else if (w.flare) fireFlare(w);
    else {
      const targets = shotTargets();
      // only primaries spread (shotgun wide, rifle/minigun small); aiming halves it. Everything else is pinpoint, scoped or not.
      const spread = w.spread * (1 - adsT * .5);
      for (let i = 0; i < w.pellets; i++) {
        ndc.set((Math.random() - .5) * spread * 2, (Math.random() - .5) * spread * 2);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(targets, false)[0];
        if (!hit) continue;
        const zz = hit.object.userData.zombie;
        if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 0); }
        else burst(hit.point, 0x999999, 2);
      }
    }
  }
  if (ammo[cur] === 0 && reserve[cur]) reload();
}
// knife: a few short rays around the crosshair so you don't need pixel-perfect aim. Hits one zombie per swing
function stab(w) {
  cd = w.rate; kick = 1; sfx('swing'); crossKick(kickFor(w)); net.shot(w);
  const targets = shotTargets();
  for (const [ox, oy] of [[0, 0], [.06, 0], [-.06, 0], [0, .06], [0, -.06]]) {
    ray2.setFromCamera(ndc.set(ox, oy), camera); ray2.far = w.range;
    const hit = ray2.intersectObjects(targets, false)[0], zz = hit?.object.userData.zombie;
    if (zz && !zz.dead) { const head = !!hit.object.userData.head; sfx('slash', { at: hit.point, far: 20 }); hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 1); return; }
    if (hit) return;
  }
}
const BURN_T = 2.5; // how long a zombie keeps burning after you stop hitting it
const flames = [], flameGeo = new THREE.BoxGeometry(.18, .18, .18);
const flameMats = [0xffdd55, 0xff8a1a, 0xff4a1a].map(color => new THREE.MeshBasicMaterial({ color }));
function flame(w) {
  kick = .3; flameHeld = .12; crossKick(.5, 2); // keeps the fire sound going (sound.js)
  camera.getWorldDirection(fwd);
  flashMesh.getWorldPosition(tmp);
  for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(tmp); scene.add(m);
    const v = fwd.clone().multiplyScalar(13).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(2.5));
    flames.push({ m, v, life: .45 });
  }
  for (const zz of zombies) {
    if (zz.dead || zz.type === 'bot' && friendly(null, zz)) continue; // team modes: your flames don't touch teammates
    const c = zz.g.position.clone().setY(zz.g.position.y + zz.scale * 1.1), to = c.clone().sub(camera.position), d = to.length(), along = to.dot(fwd);
    if (along <= 0 || along > w.range) continue;
    const off = Math.sqrt(Math.max(0, d * d - along * along)); // how far it is from the middle of the cone
    if (off > .5 + along * .15 + zz.r) continue;
    ray2.set(camera.position, to.divideScalar(d)); ray2.far = d;
    if (ray2.intersectObjects(crateMeshes, false).length) continue;
    hurtZombie(zz, w.dmg, c, false, false, null, 3);
    applyBurn(zz, BURN_T, w.dmg * .6, null, 'flame');
  }
}
// heat ray: a straight beam from the gun to whatever's under your crosshair (out to its range), doing its damage every tick
function heatBeam(w) {
  kick = .12; beamHeld = .12; crossKick(.4, 1.5); // keeps the hum going (sound.js)
  camera.getWorldDirection(fwd);
  ray2.setFromCamera(ndc.set(0, 0), camera); ray2.far = w.range;
  const hit = ray2.intersectObjects(shotTargets(), false)[0];
  const end = hit ? hit.point : tmp.copy(camera.position).addScaledVector(fwd, w.range);
  const zz = hit?.object.userData.zombie;
  if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head, false, null, 2); }
  if (hit && Math.random() < .35) burst(end, Math.random() < .5 ? 0xffd27a : 0xff8a1a, 1); // scorching where it lands
  showBeam(null, flashMesh.getWorldPosition(beamFrom), end);
}
// beams on screen, one per shooter (null = you): a hot orange glow round a white core, from the muzzle to where it lands.
// Each lasts a moment after the last tick, so holding the trigger keeps it steady
const beamGeo = new THREE.BoxGeometry(1, 1, 1), beamFrom = new THREE.Vector3(), beams = new Map();
const beamMats = [new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: .55, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })];
function showBeam(by, from, to) {
  let b = beams.get(by);
  if (!b) {
    const g = new THREE.Group();
    for (const [mat, s] of [[beamMats[0], 1], [beamMats[1], .4]]) { const m = new THREE.Mesh(beamGeo, mat); m.scale.set(s, s, 1); g.add(m); }
    scene.add(g); beams.set(by, b = { g, life: 0 });
  }
  const len = from.distanceTo(to);
  b.g.position.lerpVectors(from, to, .5); b.g.lookAt(to); b.g.scale.set(.055, .055, len);
  b.g.visible = true; b.life = .08;
}
function beamTick(dt) { for (const b of beams.values()) if (b.g.visible && (b.life -= dt) <= 0) b.g.visible = false; }
function clearBeams() { for (const b of beams.values()) scene.remove(b.g); beams.clear(); }

// rockets and flares fired by a deathmatch bot (by = the bot) can hit you, and skip the bot that fired them.
// Yours (by = null) fly out of the camera and never hit you.
const youBox = new THREE.Box3(), youHitP = new THREE.Vector3();
function rayHitsYou(r, far) { // distance along ray r to your body, or Infinity. The hit spot ends up in youHitP
  if (respawnT > 0) return Infinity;
  youBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); youBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25);
  if (!r.intersectBox(youBox, youHitP)) return Infinity;
  const d = r.origin.distanceTo(youHitP); return d <= far ? d : Infinity;
}
const targetsFor = by => by ? shotTargets().filter(o => o.userData.zombie !== by) : shotTargets();
const ROCKET_SPD = 46, ROCKET_R = 4, ROCKET_SELF = 12; // speed, blast radius, most damage it can do to whoever fired it
const rockets = [];
// rocket jumping: a rocket's blast throws everyone in it away from where it went off, harder the closer they were.
// LAUNCH = how hard it throws whoever fired it (speed at point blank), LAUNCH_OTHER = the share everyone else gets.
// Jumping as it goes off adds to it (your jump's speed carries on top), and LAUNCH_JUMP more on top of that.
// LAUNCH_UP = the least upward push, so a blast beside you still lifts you off the ground. LAUNCH_MAX = fastest you can go up
const LAUNCH = 13, LAUNCH_OTHER = .45, LAUNCH_JUMP = 1.25, LAUNCH_UP = .35, LAUNCH_MAX = 17;
// in the air you keep the sideways push for a long time (AIR_DRAG), on the ground it stops you quickly (GROUND_DRAG)
const AIR_DRAG = .5, GROUND_DRAG = 10;
const launchV = new THREE.Vector3();
// o = P (you) or a bot/zombie, center = the middle of its body, p = where the blast went off, f = 1 at point blank to 0 at the edge
function launch(o, center, p, f, self) {
  launchV.subVectors(center, p); if (launchV.lengthSq() < 1e-4) launchV.set(0, 1, 0);
  launchV.normalize(); launchV.y = Math.max(launchV.y, LAUNCH_UP); launchV.normalize();
  const you = o === P, jumping = you && (P.vy > 0 || held('jump'));
  let s = LAUNCH * f * (self ? 1 : LAUNCH_OTHER) * (jumping ? LAUNCH_JUMP : 1);
  if (!you) s /= o.scale || 1; // bigger zombies are heavier
  o.vy = Math.min(LAUNCH_MAX, Math.max(o.vy || 0, 0) + launchV.y * s);
  o.lx = (o.lx || 0) + launchV.x * s; o.lz = (o.lz || 0) + launchV.z * s;
  if (you) P.onGround = false;
}
// the sideways part of a launch: carries on through the air, dies out quickly once you land. grounded = standing on something
function launchMove(o, pos, r, grounded, dt) {
  if (!o.lx && !o.lz) return;
  if (!walkTo(pos, pos.x + o.lx * dt, pos.z, r, false)) o.lx = 0; // flew into a wall: that way stops
  if (!walkTo(pos, pos.x, pos.z + o.lz * dt, r, false)) o.lz = 0;
  const k = Math.exp(-(grounded ? GROUND_DRAG : AIR_DRAG) * dt); o.lx *= k; o.lz *= k;
  if (Math.abs(o.lx) + Math.abs(o.lz) < .1) o.lx = o.lz = 0;
}
// opts.ghost = someone else's rocket in an online match: it flies and looks the part, but the server says what it hit
// (the explosion comes from their boom). opts.id = its id then; your own rockets get theirs from net.launch (0 offline)
function fireRocket(w, from = null, dir = null, by = null, opts = {}) {
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir);
  const m = new THREE.Group(), body = box(.1, .1, .4, lam({ color: 0x4b5b3b })), tip = box(.12, .12, .12, lam({ color: 0xaa3333 }));
  tip.position.z = .24; m.add(body, tip);
  m.position.copy(from).addScaledVector(dir, .6); m.lookAt(tmp.copy(m.position).add(dir)); scene.add(m);
  rockets.push({ m, dir: dir.clone(), life: 3, dmg: w.dmg, smoke: 0, by, ghost: !!opts.ghost, id });
}
const FLARE_SPD = 60, FLARE_DROP = 2.5; // speed, how fast it falls
const FLARE_R = 2.5, FLARE_SPLASH = 14; // splash radius and most splash damage. Never hurts whoever fired it, and the direct-hit target doesn't take it too
const flares = [], flareMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
function fireFlare(w, from = null, dir = null, by = null, opts = {}) { // opts: see fireRocket
  if (!from) { camera.getWorldDirection(fwd); from = camera.position; dir = fwd; }
  const id = opts.ghost ? opts.id : net.launch(w.id, from, dir);
  const m = box(.14, .14, .14, flareMat);
  m.position.copy(from).addScaledVector(dir, .6); scene.add(m);
  flares.push({ m, v: dir.clone().multiplyScalar(FLARE_SPD), life: 3, dmg: w.dmg, burn: w.burn, burnT: w.burnT, trail: 0, by, ghost: !!opts.ghost, id });
}
// the look and sound of a flare landing at p
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
      if (f.ghost) continue; // someone else's: the server's boom says where it really landed
      const p = onYou ? youHitP.clone() : hit ? hit.point : f.m.position;
      net.boom(f.id, p);
      flareFx(p);
      if (onYou) {
        const head = p.y > P.pos.y + 1.45;
        hurtPlayer(Math.round(f.dmg * (head ? 1.5 : 1)), false, f.by, head, 5, f.id); applyBurn(P, f.burnT, f.burn, f.by, 'flare');
      } else if (f.by && Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z) < FLARE_R + .3) { // a bot's flare landing next to you
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

// pads at fixed (invisible) spots around the map. They start empty each game. Each holds one pickup; after you grab it, a new random one appears 20-30s later.
// You can't grab something that would do nothing (full HP, full armor, full ammo), so it stays there for later.
const pickMat = t => lam({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 });
const PICKUPS = {
  health: pickMat(tex(g => { noise(g, [235, 235, 235], 15); g.fillStyle = '#d22'; g.fillRect(6, 3, 4, 10); g.fillRect(3, 6, 10, 4); g.fillStyle = '#777'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  ammo: pickMat(tex(g => { noise(g, [85, 95, 45], 20); for (const x of [3, 7, 11]) { g.fillStyle = '#d8a830'; g.fillRect(x, 6, 2, 7); g.fillStyle = '#b87333'; g.fillRect(x, 4, 2, 2); } g.fillStyle = '#3a4020'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  armor: pickMat(tex(g => { noise(g, [175, 180, 188], 22); g.fillStyle = '#f2f4f7'; g.fillRect(4, 3, 8, 6); g.fillRect(5, 9, 6, 2); g.fillRect(6, 11, 4, 2); g.fillRect(7, 13, 2, 1); g.fillStyle = '#5c6068'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
};
const HEAL_PICK = 30, ARMOR_PICK = 25, RESPAWN = 20, FIRST_SPAWN = 15; // pads start empty; first pickups show up 15-25s in
const pads = [], pickGeo = new THREE.BoxGeometry(.45, .45, .45);
let padsFor = null;
function setupPads() {
  if (padsFor === MAP) return;
  for (const p of pads) clearPad(p);
  pads.length = 0; padsFor = MAP;
  for (const [x, z] of MAP.pads) pads.push({ x, z, item: null, type: '', t: 0 });
}
function pickupType() { // ammo only once you own a gun that uses it, armor only once you've bought some
  const opts = ['health', 'health'];
  if (owned.some((o, i) => o && !BASE[i].inf)) opts.push('ammo', 'ammo');
  if (P.maxArmor > 0) opts.push('armor', 'armor');
  return opts[Math.random() * opts.length | 0];
}
function spawnPickup(p, type) { // online the server says what it is (js/net.js)
  p.type = type || pickupType(); p.item = new THREE.Mesh(pickGeo, PICKUPS[p.type]);
  p.item.position.set(p.x, .6, p.z); scene.add(p.item);
}
function clearPad(p) { if (p.item) { scene.remove(p.item); p.item = null; } }
function emptyPads() { for (const p of pads) { clearPad(p); p.claimAt = 0; p.t = net.serverPads ? Infinity : FIRST_SPAWN + Math.random() * 10; } } // online the server restocks the pads (js/net.js), so the timer here never fires
function rerollPads() { for (const p of pads) if (p.item) { clearPad(p); spawnPickup(p); } }
// would this pickup do anything right now? A full one stays on the pad (online the server runs the same test before it hands it over)
function canPickup(type) {
  if (type === 'health') return P.hp < P.max;
  if (type === 'armor') return P.armor < P.maxArmor;
  return WEAPONS.some((w, i) => !BASE[i].inf && owned[i] && reserve[i] < resMax(i));
}
// srv = online: the server already applied it and these are its new hp and armor (js/net.js picked). Ammo is always topped up here
function usePickup(type, srv) {
  if (!srv && !canPickup(type)) return false;
  if (type === 'health') { P.hp = srv ? srv.hp : Math.min(P.max, P.hp + HEAL_PICK); toast(`+${HEAL_PICK} HP`, '#ff5a5a'); }
  else if (type === 'armor') { P.armor = srv ? srv.armor : Math.min(P.maxArmor, P.armor + ARMOR_PICK); toast(`+${ARMOR_PICK} ARMOR`, '#c9ced6'); }
  else {
    WEAPONS.forEach((w, i) => { if (!BASE[i].inf && owned[i] && reserve[i] < resMax(i)) reserve[i] = Math.min(resMax(i), reserve[i] + w.mag * 2); });
    toast('+AMMO', '#ffd23f');
  }
  sfx(type === 'health' ? 'pickHealth' : type === 'armor' ? 'pickArmor' : 'pickAmmo'); return true;
}
let toastT;
function toast(text, color) { const t = $('toast'); t.textContent = text; t.style.color = color; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = 0, 900); }
setupPads(); emptyPads();
