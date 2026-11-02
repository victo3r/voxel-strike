let stepT = 0, stepAlt = false; // footsteps: time until the next one, and which foot
function update(dt) {
  const down = mode === 'dm' && dmDown(dt);
  const w = WEAPONS[cur];
  if (!down) {
  const mx = held('right') - held('left'), mz = held('back') - held('fwd');
  const lx = held('lookR') - held('lookL'), ly = held('lookU') - held('lookD');
  if (lx || ly) {
    const ls = 2.4 * sens.keys * dt * camera.fov / 75;
    P.yaw -= lx * ls; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + ly * ls));
  }
  if (mx || mz) {
    const len = Math.hypot(mx, mz), c = Math.cos(P.yaw), s = Math.sin(P.yaw), sp = 6 * (w.mob || 1) * dt / len;
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
  if (held('jump') && P.onGround) { P.vy = 9; P.onGround = false; }
  const prevY = P.pos.y, wasAir = !P.onGround; P.vy -= 25 * dt; P.pos.y += P.vy * dt;
  if (P.vy > 0) { const c = ceilingAt(P.pos.x, P.pos.z, .35, prevY, P.pos.y - prevY); if (P.pos.y + BODY > c) { P.pos.y = c - BODY; P.vy = 0; } } // bumped your head
  const gy = groundAt(P.pos.x, P.pos.z, .35, prevY);
  if (!wasAir && P.vy <= 0 && sticks(prevY - gy, P.onRamp)) P.pos.y = gy; // walking down stairs: stay on your feet. Off anything else you fall
  if (P.pos.y <= gy) { if (wasAir && P.vy < -6) { sfx('land_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, gy))); stepT = .25; } P.pos.y = gy; P.vy = 0; P.onGround = true; P.onRamp = groundRamp; } else P.onGround = false;
  if (inWater(P.pos.x, P.pos.z, P.pos.y)) drownYou();
  wetCheck(P, P.pos);
  easeLag(P.pos, dt);
  camera.position.set(P.pos.x, P.pos.y + 1.6 - (P.pos.lag || 0), P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  if ((mx || mz) && P.onGround) { if ((stepT -= dt) <= 0) { stepT = .33 / (w.mob || 1); stepAlt = !stepAlt; sfx('step_' + FOOT_OK(surfaceAt(P.pos.x, P.pos.z, .35, P.pos.y)) + (stepAlt ? '' : '2'), { v: .75 }); } }
  else stepT = .08; // first step comes right after you start moving

  cd -= dt;
  if (w.auto && held('shoot')) shoot();
  aiming = held('aim');
  if (reloading > 0) { reloading -= dt; if (reloading <= 0) { const take = Math.min(w.mag - ammo[cur], reserve[cur]); ammo[cur] += take; reserve[cur] -= take; reloadSnd = null; } }
  kick = Math.max(0, kick - dt * 8);
  if (gunSpin) { gunSpin.rotation.z += gunSpinV * dt; gunSpinV = Math.max(0, gunSpinV - dt * 25); } // eradicator barrels wind down after you stop firing
  if (kick < .6) { flashMesh.visible = false; flashLight.intensity = 0; }
  adsT += ((aiming && reloading <= 0 && !w.melee ? 1 : 0) - adsT) * Math.min(1, dt * 14); // no aiming with the knife
  const fov = 75 - adsT * (w.scope ? 57 : 20);
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const scoped = w.scope && adsT > .8;
  $('scope').style.display = scoped ? 'block' : 'none';
  $('cross').style.display = scoped ? 'none' : '';
  vm.visible = !scoped;
  const bob = (mx || mz) && P.onGround ? Math.sin(performance.now() * .012) * .015 * (1 - adsT * .8) : 0;
  if (w.melee) {
    vm.position.set(.3 - kick * .08, -.28 + bob, -.5 - kick * .2);
    vm.rotation.set(-kick * .9, kick * .5, 0);
  } else {
    vm.position.set(.32 * (1 - adsT), -.3 + adsT * .08 + bob - (reloading > 0 ? .15 : 0), -.55 + kick * .08);
    vm.rotation.set(kick * .25 * (1 - adsT * .85) + (reloading > 0 ? -.6 : 0), 0, 0); // much less muzzle climb while aiming so the gun doesn't cover the crosshair
  }
  if ((crossT -= dt) <= 0) $('cross').style.setProperty('--c', '#fff');
  }

  if (mode === 'dm') { updateDM(dt); if (matchOver) return; }

  if (mode === 'zombies' && toSpawn > 0 && (spawnT -= dt) <= 0) { spawnZombie(); toSpawn--; spawnT = Math.max(.3, 1.5 - wave * .1); }
  if (mode === 'zombies' && toSpawn === 0 && zombies.length === 0) {
    if (wave > 0 && shopWave < wave) {
      shopWave = wave; bonus = 5 + wave * 2; coins += bonus;
      // account rewards: 1 real coin every wave, 15 XP every 5th wave
      const xp = wave % 5 ? 0 : 15, r = grant(xp, 1);
      waveReward = `Account: +1 ◆${xp ? ` +${xp} XP` : ''}` + (r.ups ? `   ·   LEVEL UP! LVL ${prof.lv} +${r.bonus} ◆` : '');
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
      z.dead += dt; z.g.rotation.x = -Math.min(z.dead * 4, Math.PI / 2);
      if (z.drowned) { const p = z.g.position; p.y = Math.max(MAP.floor?.(p.x, p.z) ?? 0, p.y - 1.8 * dt); } // sinks to the bottom
      if (z.dead > 1.5) { scene.remove(z.g); zombies.splice(i, 1); }
      continue;
    }
    if (z.burn > 0) { // on fire: takes damage every quarter second until it burns out
      z.burn -= dt;
      if ((z.burnT = (z.burnT ?? 0) - dt) <= 0) { z.burnT = .25; hurtZombie(z, z.burnDmg, z.g.position.clone().setY(z.g.position.y + z.scale * 1.2), false, true, z.burnBy ?? null); }
      if (z.dead) continue;
    }
    if (z.type === 'bot') { updateBot(z, dt); continue; }
    settle(z, dt);
    if (inWater(z.g.position.x, z.g.position.z, z.g.position.y)) { drownZombie(z); continue; }
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
      blast(onYou ? youHitP.clone() : hit ? hit.point.clone() : r.m.position.clone(), ROCKET_R, r.dmg, r.by ? r.dmg : ROCKET_SELF, null, r.by);
      continue;
    }
    r.m.position.addScaledVector(r.dir, step);
    if ((r.smoke -= dt) <= 0) { r.smoke = .03; burst(r.m.position, 0x888888, 1); }
  }

  updateFlares(dt);

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

  $('hp').textContent = `♥ ${P.hp}`;
  $('arm').textContent = P.maxArmor ? `⛨ ${P.armor}` : '';
  const spare = reserve[cur] === Infinity ? '∞' : reserve[cur];
  $('ammo').textContent = `${w.name} ${stars(cur)}\n${w.melee ? 'MELEE' : reloading > 0 ? 'RELOADING' : !ammo[cur] && !reserve[cur] ? 'NO AMMO' : ammo[cur] + ' / ' + spare}`;
  $('ammo').style.whiteSpace = 'pre';
  if (mode !== 'dm') $('top').textContent = `WAVE ${wave}   ·   KILLS ${kills}   ·   ◆ ${coins}`; // deathmatch fills the top in updateDM
}

const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05);
  drownTick(dt); musicTick();
  if (inLobby) { soundTick(dt, false); updateLobby(dt); renderer.render(lobbyScene, lobbyCam); return; }
  // the game keeps running while the menu is open (it isn't a pause). Only the zombie-waves shop and death screen stop it,
  // and with the mouse unlocked your keys are released, so you just stand there
  const live = !dead && !shopOpen && !matchOver;
  if (live) update(dt);
  soundTick(dt, live);
  // bots and zombies are drawn a little low for a moment after stepping up a ledge, so they climb it smoothly
  const lagged = zombies.filter(z => z.g.position.lag), realY = lagged.map(z => z.g.position.y);
  for (const z of lagged) z.g.position.y -= z.g.position.lag;
  renderer.render(scene, camera);
  lagged.forEach((z, k) => z.g.position.y = realY[k]);
})();
