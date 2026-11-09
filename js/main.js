let stepT = 0, stepAlt = false; // footsteps
let jumpWas = false; // double jump needs a fresh press
const RL_C = 2 * Math.PI * 34; // reload ring length
const runMul = w => (mobMul(w) + youFx().spd + perk.spd * .1) * slowMul(P); // run speed: gun, boots and perks, slowed by shocks

// scope and holo sight overlay
const RPX = () => Math.max(2, Math.round(innerHeight / 240));
let scopeKind = '';
// zoom in and out sounds
let zoomedGun = null, zoomSeen = 0;
function zoomSound(w) {
  const now = performance.now(), want = w.zoom && aiming && reloading <= 0 ? w.id : null;
  if (now - zoomSeen > 300) zoomedGun = want;
  zoomSeen = now;
  if (want === zoomedGun) return;
  if (zoomedGun && zoomedGun === w.id) sfx('zout_' + zoomedGun);
  if (want) sfx('zin_' + want);
  zoomedGun = want;
}
function drawScope(kind) {
  scopeKind = kind;
  const c = $('scope'), px = RPX(), W = Math.ceil(innerWidth / px) | 1, H = Math.ceil(innerHeight / px) | 1;
  c.width = W; c.height = H; c.style.setProperty('width', W * px + 'px', 'important'); c.style.setProperty('height', H * px + 'px', 'important');
  const holo = kind === 'holo', R = Math.round(H * (holo ? .45 : .4)); // holo windows are bigger
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, cx = (W - 1) / 2, cy = (H - 1) / 2;
  const put = (x, y, r, gr, b, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; d[k] = r; d[k + 1] = gr; d[k + 2] = b; d[k + 3] = a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = R - Math.max(Math.abs(x - cx), Math.abs(y - cy));
    if (holo) {
      if (e < -3) put(x, y, 26, 26, 30, 255); // housing
      else if (e < -1) put(x, y, 58, 58, 66, 255); // lip
      else if (e < 0) put(x, y, 0, 0, 0, 255); // glass edge
      else if (e < 3) put(x, y, 0, 0, 0, 70);
      else put(x, y, 40, 90, 120, 14); // glass tint
    } else {
      if (e < 0) put(x, y, 0, 0, 0, 255); // tube
      else if (e < 1.5) put(x, y, 22, 24, 26, 255); // rim
      else if (e < 4) put(x, y, 0, 0, 0, 110); // lens shadow
      else if (e < 7) put(x, y, 0, 8, 20, 45);
    }
  }
  if (holo) { g.putImageData(img, 0, 0); return; }
  const ink = (x, y) => put(cx + x, cy + y, 0, 0, 0, 255), post = Math.round(R * .45), step = Math.max(3, Math.round(R / 14));
  for (let k = -R; k <= R; k++) {
    if (Math.abs(k) < 2) continue; // open middle
    ink(k, 0); ink(0, k);
    if (Math.abs(k) > post) for (const o of [-1, 1]) { ink(k, o); if (k > 0) ink(o, k); } // thick posts
  }
  ink(0, 0);
  for (let n = 1; n * step < post; n++) for (const s of [-1, 1]) { // tick marks
    const t = n * step * s, L = n % 2 ? 1 : 2;
    for (let o = 1; o <= L; o++) { ink(t, o); ink(t, -o); ink(o, t); ink(-o, t); }
  }
  g.putImageData(img, 0, 0);
}
// holo reticle
let holoZoom = 0, holoCol = '';
function drawHolo(zoom, col = '255,60,60') {
  holoZoom = zoom; holoCol = col; $('holo').style.filter = `drop-shadow(0 0 3px rgba(${col},.75))`;
  const c = $('holo'), px = RPX(), N = 41, m = 20;
  c.width = c.height = N; c.style.setProperty('width', N * px + 'px', 'important'); c.style.setProperty('height', N * px + 'px', 'important');
  const g = c.getContext('2d'); g.clearRect(0, 0, N, N);
  const dot = (x, y, a = .9) => { g.fillStyle = `rgba(${col},${a})`; g.fillRect(m + x, m + y, 1, 1); };
  const far = zoom >= 3 ? 15 : 12;
  const arm = (fx, fy) => { // one arm of the cross
    for (let r = 7; r <= far; r++) dot(fx * r, fy * r);
    for (const r of zoom >= 3 ? [10, 13] : [10]) { dot(fx * r + fy, fy * r + fx, .7); dot(fx * r - fy, fy * r - fx, .7); }
  };
  arm(1, 0); arm(-1, 0); arm(0, 1); arm(0, -1);
  dot(0, 0, 1);
}
drawScope('scope'); drawHolo(2);
addEventListener('resize', () => { drawScope(scopeKind); drawHolo(holoZoom, holoCol); });
function update(dt) {
  if (P.slowT > 0) P.slowT -= dt;
  const down = pvp() && dmDown(dt);
  const w = WEAPONS[cur];
  if (down) aimOn = false;
  if (!down) {
  aaTarget(); // aim assist target
  const mx = held('right') - held('left'), mz = held('back') - held('fwd');
  const lx = held('lookR') - held('lookL'), ly = held('lookU') - held('lookD');
  if (lx || ly) {
    const ls = 2.4 * sens.keys * dt * camera.fov / fovBase;
    const [ay, ap] = aaLook(-lx * ls, ly * ls, dt);
    P.yaw += ay; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + ap));
  }
  let tx = 0, tz = 0; // the speed you want, which your actual speed eases to (quick, but not an instant flip)
  if (mx || mz) {
    const len = Math.hypot(mx, mz), c = Math.cos(P.yaw), s = Math.sin(P.yaw), sp = 6 * runMul(w) / len;
    tx = (mx * c + mz * s) * sp; tz = (-mx * s + mz * c) * sp;
  }
  const ease = 1 - Math.exp(-MOVE_EASE * dt);
  P.mvx += (tx - P.mvx) * ease; P.mvz += (tz - P.mvz) * ease;
  if (Math.abs(P.mvx) + Math.abs(P.mvz) > .02) {
    if (!walkTo(P.pos, P.pos.x + P.mvx * dt, P.pos.z, .35, P.onGround)) P.mvx = 0; // a wall stops you
    if (!walkTo(P.pos, P.pos.x, P.pos.z + P.mvz * dt, .35, P.onGround)) P.mvz = 0;
  } else P.mvx = P.mvz = 0;
  if (P.kx || P.kz) { // boss knockback
    const kx = P.kx * dt, kz = P.kz * dt;
    walkTo(P.pos, P.pos.x + kx, P.pos.z, .35, false);
    walkTo(P.pos, P.pos.x, P.pos.z + kz, .35, false);
    const f = Math.exp(-5 * dt); P.kx *= f; P.kz *= f;
    if (Math.abs(P.kx) + Math.abs(P.kz) < .2) P.kx = P.kz = 0;
  }
  launchMove(P, P.pos, .35, P.onGround, dt); // rocket blast push
  const jumpKey = held('jump');
  const jumpV = 9 * Math.sqrt(Math.max(.2, 1 + jumpOf(cur) + youFx().jump)); // height grows with v squared
  if (jumpKey && P.onGround) { P.vy = jumpV; P.onGround = false; net.ev('jump'); }
  else if (jumpKey && !jumpWas && !P.onGround && (P.dj | 0) < youFx().air) { // Raider Boots jump again in the air, twice with the full set
    P.dj = (P.dj | 0) + 1; P.vy = Math.max(P.vy, jumpV); sfx('djump'); burst(tmp.set(P.pos.x, P.pos.y + .1, P.pos.z), 0xe8eef2, 6); net.ev('djump');
  }
  jumpWas = jumpKey;
  const prevY = P.pos.y, wasAir = !P.onGround; P.vy -= 25 * dt; P.pos.y += P.vy * dt;
  if (P.vy > 0) { const c = ceilingAt(P.pos.x, P.pos.z, .35, prevY, P.pos.y - prevY); if (P.pos.y + BODY > c) { P.pos.y = c - BODY; P.vy = 0; } }
  const gy = groundAt(P.pos.x, P.pos.z, .35, prevY);
  if (!wasAir && P.vy <= 0 && sticks(prevY - gy, P.onRamp)) P.pos.y = gy; // stick to stairs going down
  if (P.pos.y <= gy) { if (wasAir && P.vy < -6) { sfx('land_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, gy))); stepT = .25; } P.pos.y = gy; P.vy = 0; P.onGround = true; P.onRamp = groundRamp; P.dj = 0; } else P.onGround = false;
  if (inWater(P.pos.x, P.pos.z, P.pos.y)) drownYou();
  wetCheck(P, P.pos);
  easeLag(P.pos, dt);
  camera.position.set(P.pos.x, P.pos.y + 1.6 - (P.pos.lag || 0), P.pos.z);
  recoilTick(dt, w);
  camera.rotation.set(P.pitch + rec.p * THREE.MathUtils.DEG2RAD, P.yaw + rec.y * THREE.MathUtils.DEG2RAD, 0); // recoil moves the camera, not your aim
  if ((mx || mz) && P.onGround) { if ((stepT -= dt) <= 0) { stepT = .33 / runMul(w); stepAlt = !stepAlt; sfx('step_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, P.pos.y)) + (stepAlt ? '' : '2'), { v: .75 }); } }
  else stepT = .08;

  // keep the real fire rate at any frame rate
  cd -= dt;
  if (autoFire(w) && held('shoot')) for (let n = 0; n < 3 && cd <= 0; n++) {
    const c0 = cd; shoot(); if (cd === c0) break;
    if (c0 > -dt) cd += c0;
  }
  aiming = opts.toggleAim ? aimOn : held('aim');
  if (reloading > 0) { reloading -= dt; if (reloading <= 0) { const take = Math.min(w.mag - ammo[cur], reserve[cur]); ammo[cur] += take; reserve[cur] -= take; reloadSnd = null; } }
  kick = Math.max(0, kick - dt * (w.melee ? 1 / KNIFE_SWING : w.scope ? 4 : 8)); // gun settles after a shot
  wandOn -= dt; wandK = Math.max(0, Math.min(1, wandK + dt * (wandOn > 0 && gunShown === cur ? 14 : -4)));
  tickCross(dt, BASE[cur]);
  if (gunSpin) { gunSpin.rotation.z += gunSpinV * dt; gunSpinV = Math.max(0, gunSpinV - dt * 25); } // barrels wind down
  if (kick < .6) { flashMesh.visible = false; flashLight.intensity = 0; }
  if (gunMag && w.flare && gunShown === cur) gunMag.visible = ammo[cur] > 0 || (reloading > 0 && reloading / w.reload < .6); // flare leaves the muzzle when fired
  if (gunRound) { // rocket leaves the tube when fired
    const k = reloading > 0 ? reloading / w.reload : 0;
    gunRound.visible = ammo[cur] > 0 || (reloading > 0 && k < .4);
    gunRound.position.z = reloading > 0 ? k / .4 * 10 * GPX : 0;
  }
  const hold = holdOf(w);
  zoomSound(w);
  adsT += ((aiming && reloading <= 0 && !w.melee ? 1 : 0) - adsT) * Math.min(1, dt * 14); // no aiming with the knife
  // zoom
  const zoomFov = w.zoom ? 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(fovBase / 2)) / w.zoom)) : 0;
  const fov = fovBase - adsT * (w.zoom ? fovBase - zoomFov : 20);
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // aimed in: show the sight
  const holo = !!(w.zoom && gunHolo) && adsT > .8, scoped = holo || w.scope && adsT > .8;
  if (scoped && scopeKind !== (holo ? 'holo' : 'scope')) drawScope(holo ? 'holo' : 'scope');
  $('scope').style.display = scoped ? 'block' : 'none';
  if (holo && (w.zoom !== holoZoom || (w.reticle || '255,60,60') !== holoCol)) drawHolo(w.zoom, w.reticle);
  $('holo').style.display = holo ? 'block' : 'none';
  $('cross').style.display = scoped ? 'none' : '';
  vm.visible = !scoped;
  const bob = (mx || mz) && P.onGround ? Math.sin(performance.now() * .012) * .015 * (1 - adsT * .8) : 0;
  const sw = swapTick(dt); // first, so a gun built this frame gets its own pose
  const vw = WEAPONS[gunShown] ?? w, vhold = holdOf(vw); // pose the gun on screen: the old one while it lowers
  if (vw.melee) { // knife swing
    const c = kick > 0 ? knifeChopFP(1 - kick) : 0;
    const up = meleeUp(vw), lo = vw.tilt ? .12 : 0; // swords stand up, lower in the hand
    vm.rotation.set(up + c * .95, Math.abs(c) * .2, -c * .4);
    knifeRest.set(up, 0, 0); _kp.copy(KNIFE_PIV).applyEuler(knifeRest); _kq.copy(KNIFE_PIV).applyEuler(vm.rotation);
    vm.position.set(.3 + lo * .3 + Math.min(0, c) * .18, -.22 - lo + bob + Math.max(0, c) * .1, -.5 - lo).add(_kp).sub(_kq);
  } else if (vhold === 'heavy') { // low at the hip
    vm.position.set(.34 - adsT * .12, -.38 + adsT * .06 + bob, -.6 + kick * .06);
    vm.rotation.set(.04 + kick * .1, 0, 0);
  } else if (vhold === 'shoulder') { // on the shoulder
    vm.position.set(.42 - adsT * .12, -.17 + adsT * .04 + bob, -.62 + kick * .1);
    vm.rotation.set(kick * .2, 0, 0);
  } else {
    vm.position.set(.32 * (1 - adsT), -.3 + adsT * .08 + bob, -.55 + kick * .08);
    vm.rotation.set(kick * .25 * (1 - adsT * .85), 0, 0); // less muzzle climb while aiming
    if (vhold === 'pistol') vm.position.y += .09 * (1 - adsT); // pistols sit higher
    if (vw.zoom && gunHolo) vm.position.y += (-gunHolo[0] - vm.position.y) * adsT; // holo sight to the middle
    if (vw.wand) vm.rotation.x += WAND_UP * (1 - wandK) * (1 - adsT); // a wand rests tipped up, points straight while it fires
  }
  // reload animation
  const ra = reloading > 0 && gunShown === cur ? reloadPose(w.id, 1 - reloading / w.reload) : null;
  if (ra) { vm.position.x += ra.x; vm.position.y += ra.y; vm.position.z += ra.z; vm.rotation.x += ra.rx; vm.rotation.y += ra.ry; vm.rotation.z += ra.rz; }
  if (gunMag) { const r = gunMag.userData.rest; gunMag.position.set(r.x + (ra ? ra.mx : 0), r.y + (ra ? ra.my : 0), r.z + (ra ? ra.mz : 0)); }
  if (gunArmL) { const r = gunArmL.userData.rest; gunArmL.position.set(r.x, r.y + (ra ? ra.ay : 0), r.z + (ra ? ra.az : 0)); }
  if (gunHand) { // left hand
    const r = gunHand.userData.rest, hd = ra ? ra.hand : 0; gunHand.visible = hd > .01;
    if (ra) gunHand.position.set(r.x + ra.mx, r.y + ra.my - (1 - hd) * .35, r.z + ra.mz);
  }
  reloadSwap(vmRl, w.id, ra ? 1 - reloading / w.reload : -1, gunMag, scene); // mag swap
  if (ra && w.id === 'eradicator' && reloading / w.reload < .12) gunSpinV = Math.max(gunSpinV, 16);
  // weapon swap
  if (sw > 0) { const e = sw * sw * (3 - 2 * sw); vm.position.y -= e * .5; vm.rotation.x -= e * .9; }
  // reload ring
  const rl = $('rl');
  if (reloading > 0) { rl.style.display = 'block'; $('rlFg').style.strokeDashoffset = RL_C * reloading / w.reload; } else if (rl.style.display !== 'none') rl.style.display = 'none';
  }

  if (pvp()) { updateDM(dt); if (matchOver) return; }

  if (mode === 'zombies' && !dead && toSpawn > 0 && (spawnT -= dt) <= 0) { spawnZombie(); toSpawn--; spawnT = Math.max(.3, 1.5 - wave * .1); }
  if (mode === 'zombies' && !dead && toSpawn === 0 && zombies.length === 0) {
    if (wave > 0 && shopWave < wave) {
      shopWave = wave; bonus = 5 + wave * 2; coins += bonus;
      // wave rewards, only up to PAY_WAVES
      const pay = wave <= PAY_WAVES, bossW = wave % 5 === 0, [xp, gold] = boostPay(pay ? 3 + (bossW ? 15 : 0) : 0, pay ? 1 + (bossW ? 5 : 0) : 0), r = grant(xp, gold); // boosters double it
      runXp += xp; runCoins += gold + r.bonus;
      waveReward = (pay ? `Account: +${gold} ${COIN} +${xp} XP` : `Account: past wave ${PAY_WAVES} the run pays no more`) + (r.ups ? `   ·   LEVEL UP! LVL ${prof.lv} +${r.bonus} ${COIN} +${r.boostUp} ${ico('bolt')}` : '');
      openShop(); return;
    }
    if ((waveWait -= dt) <= 0) {
      // hordes and boss waves
      wave++; horde = wave >= 12 && wave % 10 === 2; toSpawn = Math.round((8 + wave * 2.5) * (horde ? 1.6 : 1)); spawnT = 0; waveWait = 3; countShown = 0;
      const news = { 3: 'RUNNERS!', 5: 'BRUTES!', 7: 'EXPLODERS!', 9: 'SPITTERS!' };
      banner(`WAVE ${wave}` + (horde ? '\nHORDE!' : news[wave] ? '\n' + news[wave] : '') + (wave % 5 === 0 ? '\nBOSS INCOMING!' : ''));
      sfx('waveStart');
      if (wave % 5 === 0) { spawnZombie(wave % 10 === 0 ? 'hive' : 'boss'); sfx('bossRoar', { v: .7 }); }
    } else if (wave > 0) { // countdown between waves
      const n = Math.ceil(waveWait);
      if (n !== countShown && n <= 3) { countShown = n; banner(`WAVE ${wave + 1} IN ${n}`); sfx('tick', { v: .5 }); }
    }
  }

  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    easeLag(z.g.position, dt);
    if (z.dead) {
      z.dead += dt;
      if (z.angel) angelTick(z, z.dead); // bots float up
      else z.g.rotation.x = -Math.min(z.dead * 4, Math.PI / 2); // zombies fall over
      if (z.drowned) { const p = z.g.position; p.y = Math.max(MAP.floor?.(p.x, p.z) ?? 0, p.y - (MAP.sink ?? 1.8) * dt); }
      if (z.dead > 1.5) { if (z.angel) angelGone(z); scene.remove(z.g); zombies.splice(i, 1); }
      continue;
    }
    if (z.remote) { net.applyRemote(z, dt); continue; } // online players move from server updates
    if (!(z.hp > 0)) { // broken health, finish it off
      z.hp = 0; hurtZombie(z, 1, z.g.position.clone().setY(z.g.position.y + 1), false, true, z.hitBy && z.hitBy !== YOU_T ? z.hitBy : null);
      continue;
    }
    launchMove(z, z.g.position, z.r, !z.vy, dt); // rocket blast push
    if (z.burn > 0) { // burning
      z.burn -= dt;
      if ((z.burnT = (z.burnT ?? 0) - dt) <= 0) { z.burnT = .25; hurtZombie(z, z.burnDmg, z.g.position.clone().setY(z.g.position.y + z.scale * 1.2), false, true, z.burnBy ?? null); }
      if (z.dead) continue;
    }
    if (z.type === 'bot') { updateBot(z, dt); continue; }
    settle(z, dt);
    if (inSea(z.g.position.x, z.g.position.z, z.g.position.y)) { drownZombie(z); continue; } // zombies drown in the sea
    const dx = P.pos.x - z.g.position.x, dz = P.pos.z - z.g.position.z, dist = Math.hypot(dx, dz), dy = P.pos.y - z.g.position.y;
    const way = MAP.nav?.(z.g.position, P.pos); // head for the stairs
    const wx = way ? way.x - z.g.position.x : dx, wz = way ? way.z - z.g.position.z : dz, wd = Math.hypot(wx, wz) || .001;
    z.g.rotation.y = Math.atan2(wx, wz);
    // exploders swell and blink, then blow up
    if (z.type === 'exploder' && z.fuse <= 0 && dist < 1.8 && Math.abs(dy) < 2.5) { z.fuse = FUSE; z.beepT = 0; }
    if (z.fuse > 0) {
      z.fuse -= dt;
      z.g.scale.setScalar(z.scale * (1 + (FUSE - z.fuse) * .6));
      const blink = Math.sin(z.fuse * 40) > 0 ? 0xffffff : 0;
      z.mats.forEach(m => m.emissive.setHex(blink));
      if ((z.beepT -= dt) <= 0) { z.beepT = .12; sfx('fuse', { at: z.g.position, far: 35 }); }
      if (z.fuse <= 0) explode(z);
      continue;
    }
    // boss charge, dazed if it hits a wall
    if (z.slowT > 0) z.slowT -= dt;
    let spd = z.speed * slowMul(z), hold = false;
    z.glow = 0;
    if (z.type === 'boss') {
      if (z.stun > 0) {
        z.stun -= dt; hold = true;
        z.glow = Math.sin(z.stun * 25) > 0 ? 0x555500 : 0;
        z.g.rotation.z = z.stun > 0 ? Math.sin(z.stun * 18) * .12 : 0;
      } else if (z.wind > 0) {
        z.wind -= dt; hold = true;
        z.glow = Math.sin(z.wind * 30) > 0 ? 0xaa0000 : 0x330000;
        z.g.scale.setScalar(z.scale * (1 + (WIND - z.wind) * .1));
        if (z.wind <= 0) {
          z.charging = CHARGE_T; z.cdx = dx / (dist || 1); z.cdz = dz / (dist || 1); z.hitP = false;
          z.g.scale.setScalar(z.scale); sfx('bossCharge', { at: z.g.position, far: 70 });
        }
      } else if (z.charging > 0) {
        z.charging -= dt; z.glow = 0x660000;
        z.g.rotation.y = Math.atan2(z.cdx, z.cdz);
        const s = CHARGE_SPD * dt, nx = z.g.position.x + z.cdx * s, nz = z.g.position.z + z.cdz * s;
        if (!walkTo(z.g.position, nx, nz, z.r, true)) {
          z.charging = 0; z.stun = 1.8; sfx('bonk', { at: z.g.position, far: 60 }); burst(z.g.position.clone().setY(z.g.position.y + 1.5), 0xaa8855, 10);
        } else {
          z.t += dt * CHARGE_SPD * 1.5;
          z.pivL.rotation.x = Math.sin(z.t) * .8; z.pivR.rotation.x = -Math.sin(z.t) * .8;
        }
        const pd = Math.hypot(P.pos.x - z.g.position.x, P.pos.z - z.g.position.z);
        if (!z.hitP && pd < z.reach && dy > -1 && dy < 3.5) {
          z.hitP = true; hurtPlayer(Math.round(z.dmg * 1.5));
          P.kx = z.cdx * 16; P.kz = z.cdz * 16; P.vy = Math.max(P.vy, 6); P.onGround = false;
          sfx('smash');
        }
        hold = true;
        if (z.charging <= 0) z.atk = .6;
      } else if ((z.chargeT -= dt) <= 0 && dist > 4 && dist < 22 && !way) {
        z.wind = WIND; z.chargeT = Math.max(2.5, 5 - wave * .1) + Math.random() * 1.5;
        sfx('bossRoar', { at: z.g.position, far: 80 });
      }
    }
    // spitters keep away and lob acid
    if (z.spit) {
      if (z.windS > 0) { // winding up a spit
        z.windS -= dt; hold = true; z.glow = Math.sin(z.windS * 40) > 0 ? 0x335500 : 0x112200;
        if (z.windS <= 0) { spit(z); z.spitT = z.hive ? 2.4 : 2.8 + Math.random(); }
      } else if (dist > 4 && dist < (z.hive ? 18 : 13) && Math.abs(dy) < 3 && !way && clearLine(spitFrom.set(z.g.position.x, z.g.position.y + 1.45 * z.scale, z.g.position.z), spitTo.set(P.pos.x, P.pos.y + 1, P.pos.z))) {
        hold = true;
        if ((z.spitT -= dt) <= 0) { z.windS = .5; sfx('fuse', { at: z.g.position, far: 40, rate: .5 }); }
      }
      if (z.hive && (z.sumT -= dt) <= 0) {
        z.sumT = 7;
        if (zombies.filter(o => !o.dead).length < 40) for (let k = 0; k < 2; k++) for (let tries = 0; tries < 6; tries++) {
          const a = Math.random() * Math.PI * 2, sx = z.g.position.x + Math.cos(a) * 2.2, sz = z.g.position.z + Math.sin(a) * 2.2;
          if (blocked(sx, sz, .3, 0) || overWater(sx, sz, 0) || poolAt(sx, sz)) continue;
          const zz = makeZombie(sx, sz, 'runner'); burst(zz.g.position.clone().setY(.6), 0x9a60d0, 10); break;
        }
        sfx('bossRoar', { at: z.g.position, far: 80, rate: 1.3 });
      }
    }
    if (hold) { /* busy */ }
    else if (way || dist > z.reach) {
      let vx = wx / wd, vz = wz / wd;
      for (const o of zombies) { // don't stack up
        if (o === z || o.dead) continue;
        const ox = z.g.position.x - o.g.position.x, oz = z.g.position.z - o.g.position.z, od = Math.hypot(ox, oz);
        if (od < (z.r + o.r) * 1.15 && od > 0) { vx += ox / od; vz += oz / od; }
      }
      const s = spd * dt, nx = z.g.position.x + vx * s, nz = z.g.position.z + vz * s;
      const into = !!MAP.trapped?.(P.pos);
      walkDry(z.g.position, nx, z.g.position.z, z.r, !z.vy, into);
      walkDry(z.g.position, z.g.position.x, nz, z.r, !z.vy, into);
      z.t += dt * spd * 3;
      z.pivL.rotation.x = Math.sin(z.t) * .6; z.pivR.rotation.x = -Math.sin(z.t) * .6;
    } else if ((z.atk -= dt) <= 0 && dy > -1 && dy < (z.boss || z.type === 'brute' ? 3.5 : 2.2)) { // bosses and brutes reach higher
      z.atk = z.atkRate; sfx('zAttack', { at: z.g.position, far: 30, rate: z.type === 'brute' || z.type === 'boss' ? .7 : 1 }); hurtPlayer(z.dmg);
    }
    z.flash -= dt;
    const e = z.flash > 0 ? 0x880000 : z.burn > 0 ? (Math.sin(performance.now() * .03 + i) > 0 ? 0x993300 : 0x441100) : z.glow;
    z.mats.forEach(m => m.emissive.setHex(e));
    if (z.tankMat && z.flash <= 0) z.tankMat.emissive.setHex(Math.sin(performance.now() * .008) > 0 ? 0x771100 : 0);
  }

  MAP.tick?.(dt);

  const now = performance.now();
  for (const p of pads) {
    if (!p.item) { if ((p.t -= dt) <= 0) spawnPickup(p); continue; }
    p.item.rotation.y += dt * 2; p.item.position.y = p.y + .6 + Math.sin(now * .003 + p.x) * .1;
    if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 1 && P.pos.y < p.y + 1.5 && !down) {
      if (net.on) net.pick(p); // online the server decides
      else if (usePickup(p.type)) { clearPad(p); p.t = RESPAWN + Math.random() * 10; }
    }
  }

  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i]; b.t += dt;
    b.m.scale.setScalar(.5 + b.t * 12 * b.R / BLAST); b.m.material.opacity = Math.max(0, .9 * (1 - b.t / .3));
    if (b.t > .3) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); booms.splice(i, 1); }
  }

  // rockets
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i], step = ROCKET_SPD * dt; r.life -= dt;
    ray2.set(r.m.position, r.dir); ray2.far = step;
    const hit = ray2.intersectObjects(targetsFor(r.by), false)[0];
    const onYou = !r.ghost && r.by && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    if (hit || onYou || r.life <= 0) {
      scene.remove(r.m); rockets.splice(i, 1);
      if (r.ghost) continue; // the server places other players' blasts
      const at = onYou ? youHitP.clone() : hit ? hit.point.clone() : r.m.position.clone();
      net.boom(r.id, at, r.by);
      // rocket self damage
      blast(at, ROCKET_R, r.dmg, r.by ? r.dmg : ROCKET_SELF, null, r.by, r.g, r.id);
      continue;
    }
    r.m.position.addScaledVector(r.dir, step);
    if (r.gust) r.m.rotateZ(dt * 18);
    if ((r.smoke -= dt) <= 0) { r.smoke = .03; burst(r.m.position, r.gust ? 0xe8f7ff : 0x888888, 1); }
  }

  updateFlares(dt); updateGrenades(dt); beamTick(dt); tracerTick(dt); lanceTick(dt); globTick(dt);

  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i]; f.life -= dt;
    f.m.position.addScaledVector(f.v, dt); f.v.y += 2 * dt;
    f.m.scale.setScalar(1 + (.45 - f.life) * 7);
    if (f.life <= 0) { scene.remove(f.m); flames.splice(i, 1); }
  }

  const boss = zombies.find(z => z.boss && !z.dead);
  $('bossbar').style.display = boss ? 'block' : 'none';
  if (boss) $('bossfill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; p.v.y -= 15 * dt; p.m.position.addScaledVector(p.v, dt);
    if (p.life <= 0 || p.m.position.y < 0) { scene.remove(p.m); parts.splice(i, 1); }
  }

  vitBar('hp', P.hp, P.max, 'heart'); vitBar('arm', P.armor, P.maxArmor, 'shield');
  const spare = reserve[cur] === Infinity ? ico('inf') : reserve[cur];
  setHTML($('ammo'), `${w.name} <span class="st">${stars(cur)}</span><br>${w.melee ? 'MELEE' : reloading > 0 ? 'RELOADING' : !ammo[cur] && !reserve[cur] ? 'NO AMMO' : w.pool ? ammo[cur] : ammo[cur] + ' / ' + spare}`);
  if (!pvp()) $('top').innerHTML = `WAVE ${wave}   ·   ${toSpawn + zombies.filter(z => !z.dead).length} LEFT   ·   KILLS ${kills}   ·   <span class="pc">${COIN}${coins}</span>`;
}

// knife swing curve
const knifeChopFP = t => { const e = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }; return t < .22 ? .6 * e(t / .22) : t < .5 ? .6 - 1.15 * e((t - .22) / .28) : -.55 * (1 - e((t - .5) / .5)); };
const KNIFE_PIV = new THREE.Vector3(.04, -.06, .22), knifeRest = new THREE.Euler(), _kp = new THREE.Vector3(), _kq = new THREE.Vector3(); // knife pivot
const clock = new THREE.Clock();
// fade the buttons in once the lobby is drawn
let bootFrames = 0;
function bootDone() {
  if (bootFrames < 0 || ++bootFrames < 3) return;
  bootFrames = -1; cgLoaded(); // tell CrazyGames loading is done
  document.body.classList.replace('boot', 'booting');
  setTimeout(() => document.body.classList.remove('booting'), 600);
}
// FPS counter
let fpsN = 0, fpsT = 0;
function fpsTick(raw) {
  if (!gfx.fps) return;
  fpsN++; fpsT += raw;
  if (fpsT >= .5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = fpsT = 0; }
}
(function loop() {
  requestAnimationFrame(loop);
  // split slow frames into steps
  const raw = clock.getDelta(), dt = Math.min(raw, .05), steps = Math.min(3, Math.ceil(Math.min(raw, .15) / .05 - .001)) || 1;
  const sdt = Math.min(raw, .15) / steps;
  fpsTick(raw);
  drownTick(dt); musicTick();
  dropTick(dt); // dropped mags
  starTick(dt);
  if (inLobby) { $('rl').style.display = 'none'; cgPlay(false); soundTick(dt, false); updateLobby(dt); renderer.render(lobbyScene, lobbyCam); bootDone(); return; }
  bootDone();
  // zombie waves pause in the menu, matches don't
  const isLive = () => !dead && !shopOpen && !matchOver && (pvp() || locked);
  const live = isLive();
  cgPlay(live && locked && !inLobby); // tell CrazyGames you're playing
  if (live) for (let k = 0; k < steps && (k === 0 || isLive()); k++) update(sdt);
  if ((dead || respawnT > 0 || matchOver || inLobby) && $('rl').style.display !== 'none') $('rl').style.display = 'none'; // reload ring only while playing
  else if (mode === 'zombies' && dead && !matchOver && (deadT += dt) >= DEAD_T) zombiesOver(); // zombie waves game over
  soundTick(dt, live && respawnT <= 0); // nothing keeps whirring while you're down
  // smooth ledge climbing
  const lagged = zombies.filter(z => z.g.position.lag), realY = lagged.map(z => z.g.position.y);
  for (const z of lagged) z.g.position.y -= z.g.position.lag;
  renderer.render(scene, camera);
  outlineRender(camera); // red enemy outline
  lagged.forEach((z, k) => z.g.position.y = realY[k]);
})();
