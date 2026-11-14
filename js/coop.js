// co-op zombie waves: up to 4 people online, no bots. The host's game runs the zombies and the waves and sends them out, everyone
// else draws them and sends their hits to the host. Each player looks after their own health
const Z_TYPES = ['walker', 'runner', 'brute', 'exploder', 'spitter', 'boss', 'hive'];
const REVIVE_T = 3, REVIVE_R = 1.8, SHOP_T = 30, COUNT_T = 3, Z_BEHIND = 200, Z_ROWS = 60;
let zph = 0, zphEnd = 0, zN = 1, zSeq = 0, zSynced = false, zRot = 0, reviveT = 0, reviveBy = 0, zReadyW = 0, zJoined = false, zDownWas = false, zBan = '', zHelp = false;
const zMap = new Map(), zGone = new Set(), zReady = new Set(), zA = new THREE.Vector3();
const coopUp = () => net.alive && !P.downed && !P.waiting && !dead;
function coopReset() {
  zph = 0; zphEnd = 0; zN = 1; zSeq = 0; zSynced = false; zRot = 0; reviveT = 0; reviveBy = 0; zReadyW = 0; zJoined = false; zDownWas = false; zBan = ''; zHelp = false;
  zMap.clear(); zGone.clear(); zReady.clear(); coopRun = net.coop;
}
const zIdOf = z => { if (!z.zid) { z.zid = (net.pid || 1) * 100000 + (++zSeq % 100000); z.born = performance.now(); zMap.set(z.zid, z); } return z.zid; };

// ---- the host: waves
function coopWaves(dt) {
  const t = net.now();
  if (!net.host) { coopCount(t); return; }
  if (zph === 3) return;
  if (zph === 0) {
    if (!zphEnd) { if (net.alive) zphEnd = t + COUNT_T * 1000; return; } // the run starts once the host is in
    coopCount(t);
    if (t < zphEnd) return;
    zN = 1 + net.mates().filter(m => m.here).length;
    wave++; horde = isHorde(wave); toSpawn = coopSize(wave, zN); spawnT = 0;
    if (wave % 5 === 0) { const b = spawnZombie(wave % 10 === 0 ? 'hive' : 'boss'); if (b) b.hp = b.maxHp = b.maxHp * (1 + COOP_GROW * (zN - 1)); sfx('bossRoar', { v: .7 }); } // tougher with more of you
    coopPhase(wave, 1);
  } else if (zph === 1) {
    if (!zTargets().length) { coopPhase(wave, 3); return; } // everyone's down
    if (toSpawn > 0 && (spawnT -= dt) <= 0) { spawnZombie(); toSpawn--; spawnT = spawnGap(wave); }
    if (toSpawn === 0 && zombies.every(z => z.type === 'bot')) { zphEnd = t + SHOP_T * 1000; coopPhase(wave, 2); }
  } else if (zph === 2) {
    const all = [net.pid, ...net.mates().filter(m => m.here).map(m => m.pid)];
    if (t >= zphEnd || zReadyW === wave && all.every(p => zReady.has(p))) { zphEnd = t + COUNT_T * 1000; coopPhase(wave, 0); }
  }
}
function coopCount(t) { // 3, 2, 1 before a wave
  if (zph !== 0 || !wave || !zphEnd) return;
  const n = Math.ceil((zphEnd - t) / 1000);
  if (n !== countShown && n > 0 && n <= COUNT_T) { countShown = n; banner(`WAVE ${wave + 1} IN ${n}`); sfx('tick', { v: .5 }); }
}
// a new phase, here or from the host: 0 counting down, 1 a wave, 2 the shop, 3 over
function coopPhase(w, ph) {
  const was = zph, wasW = wave;
  wave = w; zph = ph;
  if (ph === 1 && (was !== 1 || w !== wasW)) { countShown = 0; waveStartFx(); missionWave(wave); }
  if (ph === 2 && was !== 2) coopCleared();
  if (ph === 0 && was === 2) coopShopShut();
  if (ph === 3 && was !== 3) { dead = true; deadT = 0; if (shopOpen) { shopOpen = false; showShop(false); } }
}
// wave cleared: everyone back up, paid, and off to the shop
function coopCleared() {
  zReady.clear(); zReadyW = wave;
  if (P.waiting) P.waiting = false;
  if (P.downed) coopGetUp(0);
  if (!net.alive) return;
  wavePay(); openShop();
  if (!locked) { showShop(true); $('menu').style.display = 'none'; }
}
function coopShopShut() { // the next wave's coming, shopping or not
  if (!shopOpen) return;
  shopOpen = false; showShop(false); rerollPads();
  document.dispatchEvent(new Event('pointerlockchange')); // the menu, to click back in
}
function coopReadyUp() { zReady.add(net.pid); zReadyW = wave; net.zSend({ t: 'zr', w: wave }); }
function coopReadyMsg(m) { if ((m.w | 0) === wave) { zReady.add(m.pid); zReadyW = wave; } }

// ---- the host: who the zombies go after
// a zombie hit the one it's after (knock: thrown back)
function zHurtT(z, d, knock) {
  if (ZT.me) { stingYou(z, hurtPlayer(d)); if (knock) { P.kx = knock[0]; P.kz = knock[1]; P.vy = Math.max(P.vy, knock[2]); P.onGround = false; } return; }
  net.zHurt(knock ? [ZT.pid, d, zIdOf(z), r2(knock[0]), r2(knock[1]), knock[2]] : [ZT.pid, d, zIdOf(z)]);
}
// a zombie got me on the host's screen
function coopHurt(m) {
  const [, d, id, kx, kz, vy] = m, z = zMap.get(id);
  if (!coopUp()) return;
  if (z) sfx('zAttack', { at: z.g.position, far: 30, rate: z.type === 'brute' || z.boss ? .7 : 1 });
  const dealt = hurtPlayer(Math.min(+d || 0, 500));
  if (z && !z.dead) stingYou(z, dealt);
  if (kx !== undefined) { P.kx = +kx || 0; P.kz = +kz || 0; P.vy = Math.max(P.vy, +vy || 0); P.onGround = false; sfx('smash'); }
}
// the others' hits on my zombies
function coopHits(from, list) {
  if (!Array.isArray(list)) return;
  for (const h of list) {
    const z = h && zMap.get(h.i); if (!z || z.dead || z.mirror) continue;
    zFrom = from | 0;
    try {
      if (h.d > 0) hurtZombie(z, Math.min(+h.d, 3000), new THREE.Vector3(z.g.position.x, z.g.position.y + z.scale * 1.1, z.g.position.z), !!h.h, !!h.q, null, 8);
      if (z.dead) continue;
      if (Array.isArray(h.b)) applyBurn(z, Math.min(+h.b[0] || 0, 10), Math.min(+h.b[1] || 0, 300), null, null, true);
      if (Array.isArray(h.sl)) { const k = +h.sl[0] || SLOW_K; z.slowK = z.slowT > 0 ? Math.min(z.slowK || SLOW_K, k) : k; z.slowT = Math.max(z.slowT || 0, Math.min(+h.sl[1] || 0, 10)); }
      if (h.st > 0) stunHit(z, Math.min(+h.st, 5));
      if (Array.isArray(h.ln)) { const [lx, ly, lz, k] = h.ln.map(n => +n || 0); z.vy = Math.min(LAUNCH_MAX * (k || 1), Math.max(z.vy || 0, 0) + ly); z.lx = (z.lx || 0) + lx; z.lz = (z.lz || 0) + lz; }
    } finally { zFrom = 0; }
  }
}
// what goes out in the host's packet: new ids and deaths every time, the zombies every other one (a few at a time when there are lots)
const zFlags = (z, now) => (z.fuse > 0 ? 1 : 0) | (z.wind > 0 ? 2 : 0) | (z.charging > 0 ? 4 : 0) | (z.stun > 0 ? 8 : 0) | (z.windS > 0 ? 16 : 0) | (z.stunT > 0 ? 32 : 0)
  | (z.burn > 0 ? 64 : 0) | (z.flash > -.1 ? 128 : 0) | (z.leap ? 256 : 0) | (z.rise > 0 ? 512 : 0) | (z.slowT > 0 ? 1024 : 0) | (now - z.born < 1000 ? 2048 : 0);
function coopRows(withRows) {
  const live = [], now = performance.now();
  for (const z of zombies) {
    if (z.type === 'bot' || z.mirror) continue;
    zIdOf(z);
    if (z.dead) { if (!z.told) { z.told = true; zMap.delete(z.zid); net.zEvent(['d', z.zid, z.killBy | 0, z.killHead ? 1 : 0, z.drowned ? 1 : z.boomed ? 2 : 0]); } continue; }
    live.push(z);
  }
  if (!withRows) return 0;
  const out = [[wave, toSpawn, zph, Math.max(0, Math.round(zphEnd - net.now())), horde ? 1 : 0, zN]];
  const n = Math.min(live.length, Z_ROWS); if (zRot >= live.length) zRot = 0;
  for (let k = 0; k < n; k++) {
    const z = live[(zRot + k) % live.length], p = z.g.position;
    const row = [z.zid, Z_TYPES.indexOf(z.type), r2(p.x), r2(p.y), r2(p.z), r2(z.g.rotation.y), zFlags(z, now), Math.ceil(z.hp)];
    if (z.boss) row.push(Math.round(z.maxHp));
    out.push(row);
  }
  zRot += n;
  return out;
}

// ---- everyone else: the host's zombies
function coopZm(m) {
  if (net.host) return;
  const [, st, zs, ev] = m;
  if (Array.isArray(zs)) { coopHeader(zs[0]); for (let i = 1; i < zs.length; i++) if (Array.isArray(zs[i])) zRow(zs[i], st); }
  if (Array.isArray(ev)) for (const e of ev) if (Array.isArray(e)) { if (e[0] === 'd') zDied(e); else if (e[0] === 'g') zGlob(e); else if (e[0] === 'l') zLand(e); }
}
function coopHeader(h) {
  if (!Array.isArray(h)) return;
  const [w, left, ph, ms, hd, n] = h;
  toSpawn = left | 0; horde = !!hd; zN = n | 0 || 1; zphEnd = net.now() + (+ms || 0);
  if (!zSynced) { zSynced = true; wave = w | 0; zph = ph | 0; coopJoined(); return; } // just got here: no banners for what already happened
  if (w !== wave || ph !== zph) coopPhase(w | 0, ph | 0);
}
// in at once, or (mid-wave) at the next one
function coopJoined() {
  if (zJoined || !net.alive || !zSynced && !net.host) return;
  zJoined = true;
  if (zph === 1 && wave && net.mates().some(m => m.here && !m.wait)) P.waiting = true;
  if (zph === 2) coopReadyUp(); // nothing to buy yet
}
function zRow(r, st) {
  const id = r[0]; if (zGone.has(id)) return;
  let z = zMap.get(id);
  if (!z) {
    const type = Z_TYPES[r[1]]; if (!type) return;
    z = makeZombie(r[2], r[4], type); z.zid = id; z.mirror = true; z.buf = []; zMap.set(id, z);
    z.g.position.y = r[3]; z.g.rotation.y = r[5];
    if (r[6] & 2048) { if (z.boss) sfx('bossRoar', { v: .7 }); else sfx('zDie', { at: z.g.position, far: 45, rate: .5, v: .45 }); } // just came up
  }
  if (!z.mirror || z.dead) return;
  const b = z.buf; if (b.length && st <= b[b.length - 1].ts) return;
  b.push({ ts: st, x: r[2], y: r[3], z: r[4], ry: r[5] }); while (b.length > 2 && b[1].ts < st - 1000) b.shift();
  z.f = r[6] | 0; z.hp = r[7]; z.maxHp = r[8] || Math.max(z.maxHp, r[7]); z.seen = performance.now();
}
// drawn a little in the past, with what it's up to on the host's screen. True when it should go (the host lost it)
function mirrorTick(z, dt) {
  const b = z.buf, t = Math.min(net.renderT, net.now() - Z_BEHIND), p = z.g.position;
  if (b.length) {
    let a = b[0], c = null;
    for (let i = b.length - 1; i >= 0; i--) if (b[i].ts <= t) { a = b[i]; c = b[i + 1] || null; break; }
    let x = a.x, y = a.y, zz = a.z, ry = a.ry;
    if (c) { const k = Math.min(1, (t - a.ts) / Math.max(1, c.ts - a.ts)); x += (c.x - a.x) * k; y += (c.y - a.y) * k; zz += (c.z - a.z) * k; ry = a.ry + wrapAng(c.ry - a.ry) * k; }
    const sp = Math.hypot(x - p.x, zz - p.z) / Math.max(dt, 1e-3);
    p.set(x, y, zz); z.g.rotation.y = ry;
    if (z.f & 256) { z.pivL.rotation.x = -.9; z.pivR.rotation.x = .4; }
    else if (sp > .3) { z.t += dt * Math.min(sp, 8) * 3; z.pivL.rotation.x = Math.sin(z.t) * .6; z.pivR.rotation.x = -Math.sin(z.t) * .6; }
    else { z.pivL.rotation.x *= .85; z.pivR.rotation.x *= .85; }
  }
  const f = z.f | 0, rose = f & ~(z.fWas | 0), now = performance.now(); z.fWas = f;
  if (rose & 2) sfx('bossRoar', { at: p, far: 80 });
  if (rose & 4) sfx('bossCharge', { at: p, far: 70 });
  if (rose & 8) { sfx('bonk', { at: p, far: 60 }); burst(zA.set(p.x, p.y + 1.5, p.z), 0xaa8855, 10); }
  if (rose & 16) sfx('fuse', { at: p, far: 40, rate: .5 });
  z.fuseT = f & 1 ? (z.fuseT || 0) + dt : 0; z.windT = f & 2 ? (z.windT || 0) + dt : 0; z.flash -= dt;
  let e = 0, s = 1;
  if (f & 1) { s = 1 + Math.min(FUSE, z.fuseT) * .6; e = Math.sin(z.fuseT * 40) > 0 ? 0xffffff : 0; if ((z.beepT = (z.beepT || 0) - dt) <= 0) { z.beepT = .12; sfx('fuse', { at: p, far: 35 }); } }
  else if (z.flash > 0 || f & 128) e = 0x880000;
  else if (f & 64) e = Math.sin(now * .03) > 0 ? 0x993300 : 0x441100;
  else if (f & 2) { e = Math.sin(z.windT * 30) > 0 ? 0xaa0000 : 0x330000; s = 1 + Math.min(WIND, z.windT) * .1; }
  else if (f & 4) e = 0x660000;
  else if (f & 8) e = Math.sin(now * .045) > 0 ? 0x555500 : 0;
  else if (f & 16) e = Math.sin(now * .04) > 0 ? 0x335500 : 0x112200;
  else if (f & 32) e = Math.sin(now * .04) > 0 ? 0x5a5000 : 0x1a1800;
  else if (f & 1024) e = Math.sin(now * .05) > 0 ? 0x1a4a66 : 0x0a1a2a;
  z.g.scale.setScalar(z.scale * s);
  z.g.rotation.z = f & 8 ? Math.sin(now * .018) * .12 : 0;
  z.g.rotation.x = f & 512 ? -.35 : 0;
  if (f & 512 && Math.random() < dt * 16) burst(riseAt.set(p.x + (Math.random() - .5) * .9, .1, p.z + (Math.random() - .5) * 1.6), 0x4a3a28, 2);
  z.mats.forEach(m => m.emissive.setHex(e));
  if (z.tankMat && !e) z.tankMat.emissive.setHex(Math.sin(now * .008) > 0 ? 0x771100 : 0);
  return now - (z.seen || now) > 4000;
}
// ['d', id, by, head, how: 1 drowned, 2 blew up]
function zDied(e) {
  const [, id, by, head, how] = e, z = zMap.get(id);
  zMap.delete(id); zGone.add(id);
  if (z && !z.dead) {
    z.hp = 0; z.dead = .0001;
    if (how === 1) { z.drowned = true; splash(z.g.position); sfx('splash', { at: z.g.position, far: 40 }); }
    else if (how === 2) zBoomAt(z);
    else if (z.boss) { sfx('bossRoar', { at: z.g.position, far: 80, rate: .75 }); if (by !== net.pid) banner('BOSS DOWN!'); }
    else sfx('zDie', { at: z.g.position, far: 35, rate: z.type === 'brute' ? .7 : 1 });
  }
  zCredit(by, z, !!head);
}
// a kill counts for whoever got it
function zCredit(by, z, head) {
  if (!by) return;
  if (by !== net.pid) { const r = net.recOf(by); if (r) r.kills++; return; }
  kills++; coins += (z?.coins ?? 2) + (head ? 2 : 0); missionKill(head); hitMarker('kill');
  if (z?.boss) { bossKills++; sfx('killSpecial'); banner(`BOSS DOWN!\n+${z.coins} ${COIN}`, true); }
  if (BASE[cur].soul && z) soulHeal(null, z.g.position.clone().setY(z.g.position.y + 1), SOUL_Z);
}
function zBoomAt(z) { // an exploder went off on the host's screen: the blast, and whether it got me
  z.boomed = true; z.g.visible = false;
  const p = zA.set(z.g.position.x, z.g.position.y + 1, z.g.position.z), pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
  blastFx(p, BLAST);
  if (pd < BLAST && coopUp()) hurtPlayer(Math.round(z.dmg * (1 - pd / BLAST * .6)));
}
// ['g', x, y, z, vx, vy, vz, dmg, kind: 0 acid, 1 rock, 2 the hive's big glob]: it can only hurt me here
function zGlob(e) {
  const [, x, y, z, vx, vy, vz, dmg, k] = e, m = new THREE.Mesh(k === 1 ? rockGeo : globGeo, k === 1 ? rockMat : globMat);
  if (k === 2) m.scale.setScalar(1.8);
  m.position.set(+x || 0, +y || 0, +z || 0); scene.add(m);
  globs.push({ m, v: new THREE.Vector3(+vx || 0, +vy || 0, +vz || 0), life: k ? 4 : 3, dmg: +dmg || 0, grav: k ? ROCK_G : undefined, rock: k === 1 });
  sfx('swing', { at: m.position, far: 50, rate: k ? .5 : .7 });
}
function zLand(e) { const [, id, x, y, z, stomp, dmg] = e; bossLanded(zMap.get(id), new THREE.Vector3(+x || 0, +y || 0, +z || 0), !!stomp, +dmg || 0); } // ['l', id, x, y, z, stomp, dmg]

// ---- the host changed: the new one takes over the zombies where they stand, the old one starts drawing them
function coopHost(mine) {
  for (const z of zombies) {
    if (z.type === 'bot' || z.dead) continue;
    if (mine && z.mirror) { z.mirror = false; z.buf = null; z.vy = 0; z.born = 0; z.flash = 0; z.g.scale.setScalar(z.scale); z.g.rotation.x = z.g.rotation.z = 0; }
    else if (!mine && !z.mirror) {
      zIdOf(z); z.mirror = true; z.leap = null; z.charging = z.wind = z.fuse = 0; if (z.rock) { scene.remove(z.rock); z.rock = null; }
      const p = z.g.position; z.buf = [{ ts: net.now(), x: p.x, y: p.y, z: p.z, ry: z.g.rotation.y }]; z.seen = performance.now();
    }
  }
  if (mine) { zJoined = true; if (zph === 0 && !zphEnd) zphEnd = net.now() + COUNT_T * 1000; }
}

// ---- you: joining, waiting for the next wave, or down
function coopDown(dt) {
  if (P.waiting && (zph !== 1 || !net.mates().some(m => m.here && !m.wait))) P.waiting = false; // nobody else playing: in you come
  const why = !net.alive ? 'join' : P.waiting ? 'wait' : P.downed ? 'down' : '';
  if (!why) { if (zDownWas) { zDownWas = false; vm.visible = true; $('cross').style.display = ''; $('banner').style.opacity = 0; zBan = ''; } return false; }
  zDownWas = true; aimOn = false; adsT = 0;
  if (camera.fov !== fovBase) { camera.fov = fovBase; camera.updateProjectionMatrix(); }
  $('scope').style.display = $('holo').style.display = $('cross').style.display = 'none'; vm.visible = false;
  if (why === 'down') { // you fall where you are
    P.vy -= 25 * dt; P.pos.y += P.vy * dt; const gy = groundAt(P.pos.x, P.pos.z, .35, P.pos.y + .5); if (P.pos.y <= gy) { P.pos.y = gy; P.vy = 0; }
    reviveTick(dt);
  }
  const low = why === 'down';
  camera.position.set(P.pos.x, P.pos.y + (low ? .45 : 1.6), P.pos.z); camera.rotation.set(P.pitch, P.yaw, low ? .3 : 0);
  const txt = why === 'join' ? net.banner : why === 'wait' ? "YOU'RE IN NEXT WAVE" : reviveT > 0 ? `GETTING UP\n<span class="rvbar"><i style="width:${Math.round(Math.min(1, reviveT / REVIVE_T) * 100)}%"></i></span>` : "YOU'RE DOWN\n<small>a teammate can get you up</small>";
  const b = $('banner'); if (txt !== zBan || b.style.opacity !== '1') b.innerHTML = zBan = txt; // a wave banner can cover it for a moment
  b.style.opacity = 1;
  return true;
}
// where you come in: beside a teammate who's up, or wherever's clear of zombies
function coopSpots() {
  const m = net.mates().find(m => m.up), out = [];
  if (m) for (let k = 0; k < 10 && out.length < 5; k++) {
    const a = k * 2.4, x = m.pos.x + Math.sin(a) * 2, z = m.pos.z + Math.cos(a) * 2, y = groundAt(x, z, .35, m.pos.y + .5);
    if (Math.abs(x) < MAP.half - 1 && Math.abs(z) < MAP.half - 1 && Math.abs(y - m.pos.y) < 1 && !blocked(x, z, .45, y) && !overWater(x, z, y) && !poolAt(x, z)) out.push([x, z, y]);
  }
  return out.length ? out : spawnSpots(YOU_T, 5);
}
function coopDowned() {
  if (P.downed) return;
  P.downed = true; P.hp = 0; P.burn = 0; reviveT = 0; cancelReload();
}
// a teammate standing over you for REVIVE_T gets you up
function reviveTick(dt) {
  const m = net.mates().find(m => m.up && Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z) < REVIVE_R && Math.abs(m.pos.y - P.pos.y) < 1.6);
  if (m) { reviveT += dt; reviveBy = m.pid; } else reviveT = Math.max(0, reviveT - dt);
  if (reviveT >= REVIVE_T) coopGetUp(reviveBy);
}
function coopGetUp(by) {
  P.downed = false; P.drowned = false; reviveT = 0; P.hp = Math.max(P.hp, Math.ceil(P.max / 2)); P.burn = 0; P.slowT = 0; P.stunT = 0; P.vy = 0;
  if (by) { net.zSend({ t: 'zup', by }); toast('BACK ON YOUR FEET', '#8ff0b6'); sfx('upgrade'); }
}
function coopUpMsg(m) { // someone got back up
  const who = net.recOf(m.pid), by = net.recOf(m.by);
  if (who && by && m.by !== m.pid) feed(`${nameTag(by)} got ${nameTag(who)} up`);
  if (m.by === net.pid && m.pid !== net.pid) { toast('TEAMMATE UP!', '#8ff0b6'); sfx('upgrade'); }
}
// standing over a teammate who's down
function reviveHelp(dt) {
  let near = null;
  for (const m of net.mates()) {
    const ok = coopUp() && m.body && m.down && Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z) < REVIVE_R && Math.abs(m.pos.y - P.pos.y) < 1.6 && !near;
    m.rv = ok ? (m.rv || 0) + dt : 0; if (ok) near = m;
  }
  const b = $('banner');
  if (near) { b.innerHTML = zBan = `GETTING ${esc(near.rec.name).toUpperCase()} UP\n<span class="rvbar"><i style="width:${Math.round(Math.min(1, near.rv / REVIVE_T) * 100)}%"></i></span>`; b.style.opacity = 1; zHelp = true; }
  else if (zHelp) { zHelp = false; b.style.opacity = 0; zBan = ''; }
}

// ---- each frame in a co-op room
function coopTick(dt) {
  net.coopTick(dt);
  if (!zJoined && (zSynced || net.host)) coopJoined();
  coopWaves(dt);
  reviveHelp(dt);
  if (shopOpen && zph === 2) {
    const s = Math.max(0, Math.ceil((zphEnd - net.now()) / 1000)), t = `WAVE ${wave} CLEARED · NEXT IN ${s}`, [r, all] = readyN(), u = r ? `READY · ${r}/${all}` : 'READY';
    if ($('shopH').textContent !== t) $('shopH').textContent = t;
    if ($('next').textContent !== u) $('next').textContent = u; // who's waiting on you
  }
  const show = held('board');
  $('board').style.display = show ? 'grid' : 'none';
  if (show) { const h = coopBoardHTML(); if (h !== $('board').dataset.h) { $('board').innerHTML = h; $('board').dataset.h = h; } }
}
// how many of those here are ready
function readyN() {
  const ids = [net.pid, ...net.mates().filter(m => m.here).map(m => m.pid)];
  return [ids.filter(p => zReady.has(p)).length, ids.length];
}
// the HUD line between waves
function coopTop() {
  if (zph !== 2 || shopOpen) return null;
  const [ready, all] = readyN();
  return `NEXT WAVE IN ${Math.max(0, Math.ceil((zphEnd - net.now()) / 1000))}   ·   ${ready}/${all} READY   ·   <span class="pc">${COIN}${coins}</span>`;
}
// the Tab board and the results: the team and their kills
function coopTeam() {
  const me = { name: myName, css: '#8ff0b6', kills, you: true, st: P.downed ? 'DOWN' : '' };
  return [me, ...net.mates().map(m => ({ name: m.rec.name, css: m.rec.css, kills: m.rec.kills | 0, fid: m.rec.fid, st: m.down ? 'DOWN' : m.wait ? 'NEXT WAVE' : '' }))].sort((a, b) => b.kills - a.kills);
}
function coopBoardHTML() {
  $('board').className = 'lb k';
  return `<div class="r h"><span>#</span><span>TEAM · WAVE ${wave}</span><span>KILLS</span><span></span></div>` + coopTeam().map((r, i) =>
    `<div class="r${r.you ? ' you' : ''}"><span>${i + 1}</span><span style="color:${safeCss(r.css)}"${r.fid ? ` data-fid="${r.fid}"` : ''}>${esc(r.name)}</span><span>${r.kills}</span><span>${r.st}</span></div>`).join('');
}
// the co-op board's place, once the room has saved the run
function coopRank() {
  const me = myId(); if (!auth || !me) return;
  setTimeout(async () => {
    try {
      const [w, a] = await Promise.all(['week', 'all'].map(b => api('GET', `/boards?b=${b}&by=coop&me=${me}`)));
      if (w.status !== 200 || !w.me || !matchOver || $('zRk')) return;
      $('postBoard').insertAdjacentHTML('beforeend', `<div class="r" id="zRk"><span>CO-OP BOARD</span><span>#${w.me.rank} this week${a.me ? ` · #${a.me.rank} all time` : ''}</span></div>`);
    } catch {}
  }, 1500);
}
