const ray = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
// crateMeshes = whatever stops bullets on the loaded map (crates, tree trunks, rocks...), set by useMap in maps/world.js
function shotTargets() { const t = [ground, ...crateMeshes]; for (const zz of zombies) if (!zz.dead) t.push(...zz.parts); return t; }
function shoot() {
  const w = WEAPONS[cur];
  if (cd > 0 || reloading > 0 || respawnT > 0) return;
  if (w.melee) return stab(w);
  if (ammo[cur] <= 0) { if (reserve[cur]) reload(); else { cd = .3; dry(); } return; }
  ammo[cur]--; cd = w.rate;
  if (gunSpin) gunSpinV = 30;
  if (w.flame) flame(w);
  else {
    kick = 1; flashMesh.visible = true; flashLight.intensity = 3;
    shotSound(w.vol, .15, w.cut);
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
        if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head); }
        else burst(hit.point, 0x999999, 2);
      }
    }
  }
  if (ammo[cur] === 0 && reserve[cur]) reload();
}
// knife: a few short rays around the crosshair so you don't need pixel-perfect aim. Hits one zombie per swing
function stab(w) {
  cd = w.rate; kick = 1; shotSound(w.vol, .12, w.cut);
  const targets = shotTargets();
  for (const [ox, oy] of [[0, 0], [.06, 0], [-.06, 0], [0, .06], [0, -.06]]) {
    ray2.setFromCamera(ndc.set(ox, oy), camera); ray2.far = w.range;
    const hit = ray2.intersectObjects(targets, false)[0], zz = hit?.object.userData.zombie;
    if (zz && !zz.dead) { const head = !!hit.object.userData.head; hurtZombie(zz, w.dmg * (head ? 1.5 : 1), hit.point, head); beep(220, .06, 'square', .1); return; }
    if (hit) return;
  }
}
const BURN_T = 2.5; // how long a zombie keeps burning after you stop hitting it
const flames = [], flameGeo = new THREE.BoxGeometry(.18, .18, .18);
const flameMats = [0xffdd55, 0xff8a1a, 0xff4a1a].map(color => new THREE.MeshBasicMaterial({ color }));
function flame(w) {
  kick = .3; if (Math.random() < .35) shotSound(w.vol * 2, .12, w.cut);
  camera.getWorldDirection(fwd);
  flashMesh.getWorldPosition(tmp);
  for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(tmp); scene.add(m);
    const v = fwd.clone().multiplyScalar(13).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(2.5));
    flames.push({ m, v, life: .45 });
  }
  for (const zz of zombies) {
    if (zz.dead) continue;
    const c = zz.g.position.clone().setY(zz.scale * 1.1), to = c.clone().sub(camera.position), d = to.length(), along = to.dot(fwd);
    if (along <= 0 || along > w.range) continue;
    const off = Math.sqrt(Math.max(0, d * d - along * along)); // how far it is from the middle of the cone
    if (off > .5 + along * .15 + zz.r) continue;
    ray2.set(camera.position, to.divideScalar(d)); ray2.far = d;
    if (ray2.intersectObjects(crateMeshes, false).length) continue;
    hurtZombie(zz, w.dmg, c, false);
    zz.burn = BURN_T; zz.burnDmg = w.dmg * .6;
  }
}
const ROCKET_SPD = 32, ROCKET_R = 4, ROCKET_SELF = 35; // speed, blast radius, most damage it can do to you
const rockets = [];
function fireRocket(w) {
  camera.getWorldDirection(fwd);
  const m = new THREE.Group(), body = box(.1, .1, .4, lam({ color: 0x4b5b3b })), tip = box(.12, .12, .12, lam({ color: 0xaa3333 }));
  tip.position.z = .24; m.add(body, tip);
  m.position.copy(camera.position).addScaledVector(fwd, .6); m.lookAt(tmp.copy(m.position).add(fwd)); scene.add(m);
  rockets.push({ m, dir: fwd.clone(), life: 3, dmg: w.dmg, smoke: 0 });
}
const FLARE_SPD = 60, FLARE_DROP = 2.5; // speed, how fast it falls
const FLARE_R = 2.5, FLARE_SPLASH = 14; // splash radius and most splash damage. Never hurts you, and the direct-hit target doesn't take it too
const flares = [], flareMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
function fireFlare(w) {
  camera.getWorldDirection(fwd);
  const m = box(.14, .14, .14, flareMat);
  m.position.copy(camera.position).addScaledVector(fwd, .6); scene.add(m);
  flares.push({ m, v: fwd.clone().multiplyScalar(FLARE_SPD), life: 3, dmg: w.dmg, burn: w.burn, burnT: w.burnT, trail: 0 });
}
function updateFlares(dt) {
  for (let i = flares.length - 1; i >= 0; i--) {
    const f = flares[i]; f.life -= dt; f.v.y -= FLARE_DROP * dt;
    const step = f.v.length() * dt;
    ray2.set(f.m.position, tmp.copy(f.v).normalize()); ray2.far = step;
    const hit = ray2.intersectObjects(shotTargets(), false)[0];
    if (hit || f.life <= 0) {
      scene.remove(f.m); flares.splice(i, 1);
      const p = hit ? hit.point : f.m.position;
      burst(p, 0xffaa33, 14); burst(p, 0xff4a1a, 8);
      const zz = hit?.object.userData.zombie;
      if (zz && !zz.dead) {
        const head = !!hit.object.userData.head;
        hurtZombie(zz, f.dmg * (head ? 1.5 : 1), hit.point, head);
        if (!zz.dead) { zz.burn = Math.max(zz.burn || 0, f.burnT); zz.burnDmg = Math.max(zz.burnDmg || 0, f.burn); }
      }
      for (const o of zombies) {
        if (o === zz || o.dead) continue;
        const c = o.g.position.clone().setY(o.scale), od = c.distanceTo(p);
        if (od < FLARE_R + o.r) hurtZombie(o, Math.round(FLARE_SPLASH * (1 - Math.min(1, od / FLARE_R) * .6)), c, false);
      }
      continue;
    }
    f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += dt * 9; f.m.rotation.y += dt * 7;
    if ((f.trail -= dt) <= 0) { f.trail = .025; burst(f.m.position, Math.random() < .5 ? 0xffcc55 : 0xff6a1a, 1); }
  }
}

// pads at fixed spots around the map. They start empty each game. Each holds one pickup; after you grab it, a new random one appears 20-30s later.
// You can't grab something that would do nothing (full HP, full armor, full ammo), so it stays there for later.
const pickMat = t => lam({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 });
const PICKUPS = {
  health: pickMat(tex(g => { noise(g, [235, 235, 235], 15); g.fillStyle = '#d22'; g.fillRect(6, 3, 4, 10); g.fillRect(3, 6, 10, 4); g.fillStyle = '#777'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  ammo: pickMat(tex(g => { noise(g, [85, 95, 45], 20); for (const x of [3, 7, 11]) { g.fillStyle = '#d8a830'; g.fillRect(x, 6, 2, 7); g.fillStyle = '#b87333'; g.fillRect(x, 4, 2, 2); } g.fillStyle = '#3a4020'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
  armor: pickMat(tex(g => { noise(g, [175, 180, 188], 22); g.fillStyle = '#f2f4f7'; g.fillRect(4, 3, 8, 6); g.fillRect(5, 9, 6, 2); g.fillRect(6, 11, 4, 2); g.fillRect(7, 13, 2, 1); g.fillStyle = '#5c6068'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); })),
};
const HEAL_PICK = 30, ARMOR_PICK = 25, RESPAWN = 20, FIRST_SPAWN = 15; // pads start empty; first pickups show up 15-25s in
const pads = [], padGeo = new THREE.CylinderGeometry(.7, .7, .05, 16), padMat = lam({ color: 0x555555 }), pickGeo = new THREE.BoxGeometry(.45, .45, .45);
let padsFor = null;
function setupPads() {
  if (padsFor === MAP) return;
  for (const p of pads) { clearPad(p); scene.remove(p.mesh); }
  pads.length = 0; padsFor = MAP;
  for (const [x, z] of MAP.pads) {
    const mesh = new THREE.Mesh(padGeo, padMat); mesh.position.set(x, .07, z); scene.add(mesh);
    pads.push({ x, z, mesh, item: null, type: '', t: 0 });
  }
}
function pickupType() { // ammo only once you own a gun that uses it, armor only once you've bought some
  const opts = ['health', 'health'];
  if (owned.some((o, i) => o && !BASE[i].inf)) opts.push('ammo', 'ammo');
  if (P.maxArmor > 0) opts.push('armor', 'armor');
  return opts[Math.random() * opts.length | 0];
}
function spawnPickup(p) {
  p.type = pickupType(); p.item = new THREE.Mesh(pickGeo, PICKUPS[p.type]);
  p.item.position.set(p.x, .6, p.z); scene.add(p.item);
}
function clearPad(p) { if (p.item) { scene.remove(p.item); p.item = null; } }
function emptyPads() { for (const p of pads) { clearPad(p); p.t = FIRST_SPAWN + Math.random() * 10; } }
function rerollPads() { for (const p of pads) if (p.item) { clearPad(p); spawnPickup(p); } }
function usePickup(type) {
  if (type === 'health') {
    if (P.hp >= P.max) return false;
    P.hp = Math.min(P.max, P.hp + HEAL_PICK); toast(`+${HEAL_PICK} HP`, '#ff5a5a');
  } else if (type === 'armor') {
    if (P.armor >= P.maxArmor) return false;
    P.armor = Math.min(P.maxArmor, P.armor + ARMOR_PICK); toast(`+${ARMOR_PICK} ARMOR`, '#c9ced6');
  } else {
    let got = false;
    WEAPONS.forEach((w, i) => { if (!BASE[i].inf && owned[i] && reserve[i] < resMax(i)) { reserve[i] = Math.min(resMax(i), reserve[i] + w.mag * 2); got = true; } });
    if (!got) return false;
    toast('+AMMO', '#ffd23f');
  }
  beep(1000, .1, 'triangle', .12); return true;
}
let toastT;
function toast(text, color) { const t = $('toast'); t.textContent = text; t.style.color = color; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = 0, 900); }
setupPads(); emptyPads();
