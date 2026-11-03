let stepT = 0, stepAlt = false; // footsteps: time until the next one, and which foot
let jumpWas = false; // jump was held last frame (a double jump needs a fresh press)
const runMul = w => mobMul(w) + youFx().spd; // your run speed: your gun's mobility plus your boots, added together

// ---- looking through a sight: every sight is a square window filling most of the screen, and you only see out of the window
// (the gun is hidden). kind = 'scope' (sniper: black all round, black cross lines) or 'holo' (holo sights: the dark sight housing
// all round, and the red reticle drawn on its own canvas). Drawn one pixel at a time and blown up by RPX, so it's pixel art
const RPX = () => Math.max(2, Math.round(innerHeight / 240));
let scopeKind = '';
// the zoom-in sound when you start aiming a scoped gun, the zoom-out when you stop (or a reload drops you out).
// Switching guns doesn't play a zoom-out, and after a pause (dead, menus) it quietly catches up instead of playing
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
  const holo = kind === 'holo', R = Math.round(H * (holo ? .45 : .4)); // half the window's side: holo windows are bigger
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data, cx = (W - 1) / 2, cy = (H - 1) / 2;
  const put = (x, y, r, gr, b, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; d[k] = r; d[k + 1] = gr; d[k + 2] = b; d[k + 3] = a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = R - Math.max(Math.abs(x - cx), Math.abs(y - cy)); // how far inside the window's edge (negative = outside it)
    if (holo) {
      if (e < -3) put(x, y, 26, 26, 30, 255); // the sight's housing
      else if (e < -1) put(x, y, 58, 58, 66, 255); // its lighter lip
      else if (e < 0) put(x, y, 0, 0, 0, 255); // and the black edge of the glass
      else if (e < 3) put(x, y, 0, 0, 0, 70);
      else put(x, y, 40, 90, 120, 14); // a faint blue tint on the glass
    } else {
      if (e < 0) put(x, y, 0, 0, 0, 255); // the tube
      else if (e < 1.5) put(x, y, 22, 24, 26, 255); // its rim
      else if (e < 4) put(x, y, 0, 0, 0, 110); // shadow round the edge of the lens
      else if (e < 7) put(x, y, 0, 8, 20, 45);
    }
  }
  if (holo) { g.putImageData(img, 0, 0); return; }
  const ink = (x, y) => put(cx + x, cy + y, 0, 0, 0, 255), post = Math.round(R * .45), step = Math.max(3, Math.round(R / 14));
  for (let k = -R; k <= R; k++) {
    if (Math.abs(k) < 2) continue; // a small open middle with a dot in it
    ink(k, 0); ink(0, k);
    if (Math.abs(k) > post) for (const o of [-1, 1]) { ink(k, o); if (k > 0) ink(o, k); } // thick posts left, right and below
  }
  ink(0, 0);
  for (let n = 1; n * step < post; n++) for (const s of [-1, 1]) { // tick marks along the lines, every other one longer
    const t = n * step * s, L = n % 2 ? 1 : 2;
    for (let o = 1; o <= L; o++) { ink(t, o); ink(t, -o); ink(o, t); ink(-o, t); }
  }
  g.putImageData(img, 0, 0);
}
// the holo reticle for a zoom level: a dot in the middle with a wide open gap round it, then short cross lines with a tick,
// and higher zooms get longer lines with a second tick
let holoZoom = 0;
function drawHolo(zoom) {
  holoZoom = zoom;
  const c = $('holo'), px = RPX(), N = 41, m = 20;
  c.width = c.height = N; c.style.setProperty('width', N * px + 'px', 'important'); c.style.setProperty('height', N * px + 'px', 'important');
  const g = c.getContext('2d'); g.clearRect(0, 0, N, N);
  const dot = (x, y, a = .9) => { g.fillStyle = `rgba(255,60,60,${a})`; g.fillRect(m + x, m + y, 1, 1); };
  const far = zoom >= 3 ? 15 : 12;
  const arm = (fx, fy) => { // one arm of the cross, going out along fx, fy
    for (let r = 7; r <= far; r++) dot(fx * r, fy * r);
    for (const r of zoom >= 3 ? [10, 13] : [10]) { dot(fx * r + fy, fy * r + fx, .7); dot(fx * r - fy, fy * r - fx, .7); } // ticks across it
  };
  arm(1, 0); arm(-1, 0); arm(0, 1); arm(0, -1);
  dot(0, 0, 1);
}
drawScope('scope'); drawHolo(2);
addEventListener('resize', () => { drawScope(scopeKind); drawHolo(holoZoom); });
function update(dt) {
  const down = pvp() && dmDown(dt);
  const w = WEAPONS[cur];
  if (down) aimOn = false;
  if (!down) {
  aaTarget(); // which enemy aim assist is helping with this frame (input.js)
  const mx = held('right') - held('left'), mz = held('back') - held('fwd');
  const lx = held('lookR') - held('lookL'), ly = held('lookU') - held('lookD');
  if (lx || ly) {
    const ls = 2.4 * sens.keys * dt * camera.fov / 75;
    const [ay, ap] = aaLook(-lx * ls, ly * ls, dt);
    P.yaw += ay; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + ap));
  }
  if (mx || mz) {
    const len = Math.hypot(mx, mz), c = Math.cos(P.yaw), s = Math.sin(P.yaw), sp = 6 * runMul(w) * dt / len;
    const dx = (mx * c + mz * s) * sp, dz = (-mx * s + mz * c) * sp;
    walkTo(P.pos, P.pos.x + dx, P.pos.z, .35, P.onGround);
    walkTo(P.pos, P.pos.x, P.pos.z + dz, .35, P.onGround);
  }
  if (P.kx || P.kz) { // knockback from the boss, fades out quickly
    const kx = P.kx * dt, kz = P.kz * dt;
    walkTo(P.pos, P.pos.x + kx, P.pos.z, .35, false);
    walkTo(P.pos, P.pos.x, P.pos.z + kz, .35, false);
    const f = Math.exp(-5 * dt); P.kx *= f; P.kz *= f;
    if (Math.abs(P.kx) + Math.abs(P.kz) < .2) P.kx = P.kz = 0;
  }
  launchMove(P, P.pos, .35, P.onGround, dt); // thrown by a rocket blast
  const jumpKey = held('jump');
  if (jumpKey && P.onGround) { P.vy = 9; P.onGround = false; }
  else if (jumpKey && !jumpWas && !P.onGround && !P.dj && youFx().dj) { // Raider Boots: press jump again in the air for a second jump
    P.dj = true; P.vy = Math.max(P.vy, DJ_V); sfx('djump'); burst(tmp.set(P.pos.x, P.pos.y + .1, P.pos.z), 0xe8eef2, 6);
  }
  jumpWas = jumpKey;
  const prevY = P.pos.y, wasAir = !P.onGround; P.vy -= 25 * dt; P.pos.y += P.vy * dt;
  if (P.vy > 0) { const c = ceilingAt(P.pos.x, P.pos.z, .35, prevY, P.pos.y - prevY); if (P.pos.y + BODY > c) { P.pos.y = c - BODY; P.vy = 0; } } // bumped your head
  const gy = groundAt(P.pos.x, P.pos.z, .35, prevY);
  if (!wasAir && P.vy <= 0 && sticks(prevY - gy, P.onRamp)) P.pos.y = gy; // walking down stairs: stay on your feet. Off anything else you fall
  if (P.pos.y <= gy) { if (wasAir && P.vy < -6) { sfx('land_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, gy))); stepT = .25; } P.pos.y = gy; P.vy = 0; P.onGround = true; P.onRamp = groundRamp; P.dj = false; } else P.onGround = false;
  if (inWater(P.pos.x, P.pos.z, P.pos.y)) drownYou();
  wetCheck(P, P.pos);
  easeLag(P.pos, dt);
  camera.position.set(P.pos.x, P.pos.y + 1.6 - (P.pos.lag || 0), P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  if ((mx || mz) && P.onGround) { if ((stepT -= dt) <= 0) { stepT = .33 / runMul(w); stepAlt = !stepAlt; sfx('step_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, P.pos.y)) + (stepAlt ? '' : '2'), { v: .75 }); } }
  else stepT = .08; // first step comes right after you start moving

  cd -= dt;
  if (w.auto && held('shoot')) shoot();
  aiming = opts.toggleAim ? aimOn : held('aim');
  if (reloading > 0) { reloading -= dt; if (reloading <= 0) { const take = Math.min(w.mag - ammo[cur], reserve[cur]); ammo[cur] += take; reserve[cur] -= take; reloadSnd = null; } }
  kick = Math.max(0, kick - dt * 8);
  tickCross(dt, BASE[cur]);
  if (gunSpin) { gunSpin.rotation.z += gunSpinV * dt; gunSpinV = Math.max(0, gunSpinV - dt * 25); } // eradicator barrels wind down after you stop firing
  if (kick < .6) { flashMesh.visible = false; flashLight.intensity = 0; }
  if (gunRound) { // the rocket: gone once fired, slides back into the tube near the end of the reload
    const k = reloading > 0 ? reloading / w.reload : 0;
    gunRound.visible = ammo[cur] > 0 || (reloading > 0 && k < .4);
    gunRound.position.z = reloading > 0 ? k / .4 * 10 * GPX : 0;
  }
  const hold = holdOf(w);
  zoomSound(w);
  adsT += ((aiming && reloading <= 0 && !w.melee ? 1 : 0) - adsT) * Math.min(1, dt * 14); // no aiming with the knife
  // zoom: how many times bigger things look through a holo sight or scope, so the view narrows to 1/zoom of the normal one
  const zoomFov = w.zoom ? 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(37.5)) / w.zoom)) : 0;
  const fov = 75 - adsT * (w.zoom ? 75 - zoomFov : 20);
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // aimed in: the screen is the sight's window (the gun hides). Holo sights also get their red reticle
  const holo = !!(w.zoom && gunHolo) && adsT > .8, scoped = holo || w.scope && adsT > .8;
  if (scoped && scopeKind !== (holo ? 'holo' : 'scope')) drawScope(holo ? 'holo' : 'scope');
  $('scope').style.display = scoped ? 'block' : 'none';
  if (holo && w.zoom !== holoZoom) drawHolo(w.zoom);
  $('holo').style.display = holo ? 'block' : 'none';
  $('cross').style.display = scoped ? 'none' : '';
  vm.visible = !scoped;
  const bob = (mx || mz) && P.onGround ? Math.sin(performance.now() * .012) * .015 * (1 - adsT * .8) : 0;
  if (w.melee) { // blade tipped up a little out of your fist
    vm.position.set(.3 - kick * .08, -.22 + bob, -.5 - kick * .2);
    vm.rotation.set(.22 - kick * .9, kick * .5, 0);
  } else if (hold === 'heavy') { // low at your hip
    vm.position.set(.34 - adsT * .12, -.38 + adsT * .06 + bob - (reloading > 0 ? .12 : 0), -.6 + kick * .06);
    vm.rotation.set(.04 + kick * .1 + (reloading > 0 ? -.4 : 0), 0, 0);
  } else if (hold === 'shoulder') { // on your shoulder, pulled in close and pointing straight ahead; its back end runs past your head
    vm.position.set(.42 - adsT * .12, -.17 + adsT * .04 + bob - (reloading > 0 ? .12 : 0), -.62 + kick * .1);
    vm.rotation.set(kick * .2 + (reloading > 0 ? -.35 : 0), 0, 0);
  } else {
    vm.position.set(.32 * (1 - adsT), -.3 + adsT * .08 + bob - (reloading > 0 ? .15 : 0), -.55 + kick * .08);
    vm.rotation.set(kick * .25 * (1 - adsT * .85) + (reloading > 0 ? -.6 : 0), 0, 0); // much less muzzle climb while aiming so the gun doesn't cover the crosshair
    if (hold === 'pistol') vm.position.y += .09 * (1 - adsT); // a pistol sits higher so your fist under its grip is on screen
    if (w.zoom && gunHolo) vm.position.y += (-gunHolo[0] - vm.position.y) * adsT; // aiming raises the holo sight's window onto the middle of the screen
  }
  }

  if (pvp()) { updateDM(dt); if (matchOver) return; }

  if (mode === 'zombies' && toSpawn > 0 && (spawnT -= dt) <= 0) { spawnZombie(); toSpawn--; spawnT = Math.max(.3, 1.5 - wave * .1); }
  if (mode === 'zombies' && toSpawn === 0 && zombies.length === 0) {
    if (wave > 0 && shopWave < wave) {
      shopWave = wave; bonus = 5 + wave * 2; coins += bonus;
      // account rewards: 1 real coin every wave, 15 XP every 5th wave
      const xp = wave % 5 ? 0 : 15, r = grant(xp, 1);
      waveReward = `Account: +1 ${COIN}${xp ? ` +${xp} XP` : ''}` + (r.ups ? `   ·   LEVEL UP! LVL ${prof.lv} +${r.bonus} ${COIN}` : '');
      openShop(); return;
    }
    if ((waveWait -= dt) <= 0) {
      wave++; toSpawn = Math.round(5 + wave * 2.5); spawnT = 0; waveWait = 3;
      const news = { 3: 'RUNNERS!', 5: 'BRUTES!', 7: 'EXPLODERS!' };
      banner(`WAVE ${wave}` + (news[wave] ? '\n' + news[wave] : '') + (wave % 5 === 0 ? '\nBOSS INCOMING!' : ''));
      sfx('waveStart');
      if (wave % 5 === 0) { spawnZombie('boss'); sfx('bossRoar', { v: .7 }); }
    }
  }

  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    easeLag(z.g.position, dt);
    if (z.dead) {
      z.dead += dt;
      if (z.angel) angelTick(z, z.dead); // a bot: floats up as an angel (deathmatch.js)
      else z.g.rotation.x = -Math.min(z.dead * 4, Math.PI / 2); // a zombie falls over
      if (z.drowned) { const p = z.g.position; p.y = Math.max(MAP.floor?.(p.x, p.z) ?? 0, p.y - 1.8 * dt); } // sinks to the bottom
      if (z.dead > 1.5) { if (z.angel) angelGone(z); scene.remove(z.g); zombies.splice(i, 1); }
      continue;
    }
    if (!(z.hp > 0)) { // safety net: still standing with no (or broken) health. Finish it off, credited to whoever hit it last
      z.hp = 0; hurtZombie(z, 1, z.g.position.clone().setY(z.g.position.y + 1), false, true, z.hitBy && z.hitBy !== YOU_T ? z.hitBy : null);
      continue;
    }
    launchMove(z, z.g.position, z.r, !z.vy, dt); // thrown by a rocket blast
    if (z.burn > 0) { // on fire: takes damage every quarter second until it burns out
      z.burn -= dt;
      if ((z.burnT = (z.burnT ?? 0) - dt) <= 0) { z.burnT = .25; hurtZombie(z, z.burnDmg, z.g.position.clone().setY(z.g.position.y + z.scale * 1.2), false, true, z.burnBy ?? null); }
      if (z.dead) continue;
    }
    if (z.type === 'bot') { updateBot(z, dt); continue; }
    settle(z, dt);
    if (inSea(z.g.position.x, z.g.position.z, z.g.position.y)) { drownZombie(z); continue; } // zombies can't wade: any of the sea gets them
    const dx = P.pos.x - z.g.position.x, dz = P.pos.z - z.g.position.z, dist = Math.hypot(dx, dz), dy = P.pos.y - z.g.position.y;
    const way = MAP.nav?.(z.g.position, P.pos); // a different floor of a building: head for the stairs first
    const wx = way ? way.x - z.g.position.x : dx, wz = way ? way.z - z.g.position.z : dz, wd = Math.hypot(wx, wz) || .001;
    z.g.rotation.y = Math.atan2(wx, wz);
    // exploders stop, swell and blink when they get close, then blow up. Run!
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
    // boss: roars and glows red while winding up, then charges in a straight line at 2x your speed.
    // Strafe sideways to dodge. If it rams a crate or wall it gets dazed for a moment.
    let spd = z.speed, hold = false;
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
        if (z.charging <= 0) z.atk = .6; // short pause before it can swing again
      } else if ((z.chargeT -= dt) <= 0 && dist > 4 && dist < 22 && !way) {
        z.wind = WIND; z.chargeT = Math.max(2.5, 5 - wave * .1) + Math.random() * 1.5;
        sfx('bossRoar', { at: z.g.position, far: 80 });
      }
    }
    if (hold) { /* boss is winding up, charging or dazed */ }
    else if (way || dist > z.reach) {
      let vx = wx / wd, vz = wz / wd;
      for (const o of zombies) { // keep them from stacking into one blob
        if (o === z || o.dead) continue;
        const ox = z.g.position.x - o.g.position.x, oz = z.g.position.z - o.g.position.z, od = Math.hypot(ox, oz);
        if (od < (z.r + o.r) * 1.15 && od > 0) { vx += ox / od; vz += oz / od; }
      }
      const s = spd * dt, nx = z.g.position.x + vx * s, nz = z.g.position.z + vz * s;
      const into = !!MAP.trapped?.(P.pos); // into the pool only after you
      walkDry(z.g.position, nx, z.g.position.z, z.r, !z.vy, into); // no climbing ledges in mid-air
      walkDry(z.g.position, z.g.position.x, nz, z.r, !z.vy, into);
      z.t += dt * spd * 3;
      z.pivL.rotation.x = Math.sin(z.t) * .6; z.pivR.rotation.x = -Math.sin(z.t) * .6;
    } else if ((z.atk -= dt) <= 0 && dy > -1 && dy < (z.type === 'boss' ? 3.5 : 2.2)) { // the boss can reach you on tall crates
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
    p.item.rotation.y += dt * 2; p.item.position.y = .6 + Math.sin(now * .003 + p.x) * .1;
    if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 1 && P.pos.y < 1.5 && !down && usePickup(p.type)) { clearPad(p); p.t = RESPAWN + Math.random() * 10; }
  }

  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i]; b.t += dt;
    b.m.scale.setScalar(.5 + b.t * 12 * b.R / BLAST); b.m.material.opacity = Math.max(0, .9 * (1 - b.t / .3));
    if (b.t > .3) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); booms.splice(i, 1); }
  }

  // rockets: check what's between here and where it'll be this frame, blow up on the first thing
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i], step = ROCKET_SPD * dt; r.life -= dt;
    ray2.set(r.m.position, r.dir); ray2.far = step;
    const hit = ray2.intersectObjects(targetsFor(r.by), false)[0];
    const onYou = r.by && rayHitsYou(ray2.ray, step) < (hit ? hit.distance : Infinity);
    if (hit || onYou || r.life <= 0) {
      scene.remove(r.m); rockets.splice(i, 1);
      // your rocket hurts you up to ROCKET_SELF. A bot's rocket hurts you as much as yours hurts a bot
      blast(onYou ? youHitP.clone() : hit ? hit.point.clone() : r.m.position.clone(), ROCKET_R, r.dmg, r.by ? r.dmg : ROCKET_SELF, null, r.by, true);
      continue;
    }
    r.m.position.addScaledVector(r.dir, step);
    if ((r.smoke -= dt) <= 0) { r.smoke = .03; burst(r.m.position, 0x888888, 1); }
  }

  updateFlares(dt); beamTick(dt);

  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i]; f.life -= dt;
    f.m.position.addScaledVector(f.v, dt); f.v.y += 2 * dt;
    f.m.scale.setScalar(1 + (.45 - f.life) * 7);
    if (f.life <= 0) { scene.remove(f.m); flames.splice(i, 1); }
  }

  const boss = zombies.find(z => z.type === 'boss' && !z.dead);
  $('bossbar').style.display = boss ? 'block' : 'none';
  if (boss) $('bossfill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; p.v.y -= 15 * dt; p.m.position.addScaledVector(p.v, dt);
    if (p.life <= 0 || p.m.position.y < 0) { scene.remove(p.m); parts.splice(i, 1); }
  }

  setHTML($('hp'), ico('heart') + Math.ceil(P.hp));
  setHTML($('arm'), P.maxArmor ? ico('shield') + Math.ceil(P.armor) : '');
  const spare = reserve[cur] === Infinity ? ico('inf') : reserve[cur];
  setHTML($('ammo'), `${w.name} <span class="st">${stars(cur)}</span><br>${w.melee ? 'MELEE' : reloading > 0 ? 'RELOADING' : !ammo[cur] && !reserve[cur] ? 'NO AMMO' : ammo[cur] + ' / ' + spare}`);
  if (!pvp()) $('top').innerHTML = `WAVE ${wave}   ·   KILLS ${kills}   ·   <span class="pc">${COIN}${coins}</span>`; // deathmatch fills the top in updateDM
}

const clock = new THREE.Clock();
// the page starts with only the background showing (class "boot"); the buttons fade in once the lobby has drawn a couple of frames
let bootFrames = 0;
function bootDone() {
  if (bootFrames < 0 || ++bootFrames < 3) return;
  bootFrames = -1;
  document.body.classList.replace('boot', 'booting');
  setTimeout(() => document.body.classList.remove('booting'), 600);
}
// the FPS counter (Settings > Graphics), updated twice a second
let fpsN = 0, fpsT = 0;
function fpsTick(raw) {
  if (!gfx.fps) return;
  fpsN++; fpsT += raw;
  if (fpsT >= .5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = fpsT = 0; }
}
(function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(), dt = Math.min(raw, .05);
  fpsTick(raw);
  drownTick(dt); musicTick();
  if (inLobby) { soundTick(dt, false); updateLobby(dt); renderer.render(lobbyScene, lobbyCam); bootDone(); return; }
  bootDone();
  // zombie waves pauses while the menu (or settings) is open. Bot matches keep running behind the menu, the way an online
  // match would: with the mouse unlocked your keys are released, so you just stand there
  const live = !dead && !shopOpen && !matchOver && (pvp() || locked);
  if (live) update(dt);
  soundTick(dt, live);
  // bots and zombies are drawn a little low for a moment after stepping up a ledge, so they climb it smoothly
  const lagged = zombies.filter(z => z.g.position.lag), realY = lagged.map(z => z.g.position.y);
  for (const z of lagged) z.g.position.y -= z.g.position.lag;
  renderer.render(scene, camera);
  outlineRender(camera); // the red glow round enemies, over the finished picture
  lagged.forEach((z, k) => z.g.position.y = realY[k]);
})();
