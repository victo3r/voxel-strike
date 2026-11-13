const zombies = [];
let wave = 0, toSpawn = 0, spawnT = 0, waveWait = 1.5, kills = 0, coins = 0;
// zombie waves run state
let runCoins = 0, runXp = 0, bossKills = 0, deadT = 0, horde = false, countShown = 0;
const perk = { spd: 0, dmg: 0, hp: 0 }, PAY_WAVES = 30, DEAD_T = .9;
// zombie hp scale, since gun damage is tuned for deathmatch
const ZHP = .56;
// wave size and spawn gap (the server's tables.js has the same, to time runs for the zombie board)
const isHorde = w => w >= 12 && w % 10 === 2, waveSize = w => Math.round((8 + w * 2.5) * (isHorde(w) ? 1.6 : 1)), spawnGap = w => Math.max(.3, 1.5 - w * .1);
// zombie types (hp is a multiplier on the wave base)
const ZTYPES = {
  walker: { hp: 1,   speed: () => Math.min(1.8 + wave * .15, 4.5), scale: 1,    dmg: 10, atk: 1,   coins: 2, shirt: shirtTex },
  runner: { hp: .45, speed: () => Math.min(3.6 + wave * .12, 5.6), scale: .85,  dmg: 6,  atk: .6,  coins: 3, shirt: runShirtTex },
  brute:  { hp: 3.5, speed: () => Math.min(1.1 + wave * .04, 2),   scale: 1.45, dmg: 25, atk: 1.5, coins: 8, shirt: bruteShirtTex, tint: 0x9fb08f },
  exploder: { hp: .6, speed: () => Math.min(2.6 + wave * .08, 4.2), scale: .95, dmg: 30, atk: 1, coins: 4, shirt: boomShirtTex, tint: 0xc8ff90, tank: true },
  // spitters lob acid, the hive boss also summons runners
  spitter: { hp: .7, speed: () => Math.min(1.9 + wave * .1, 3.8), scale: 1.05, dmg: 12, atk: 1, coins: 5, shirt: spitShirtTex, tint: 0xd8b0ff, spit: true },
  boss:   { hp: 15,  speed: () => Math.min(2.4 + wave * .05, 3.6), scale: 2.3,  dmg: 30, atk: 1.6, coins: 40, shirt: bossShirtTex, tint: 0xff9a8a, crown: true },
  hive:   { hp: 12,  speed: () => Math.min(1.7 + wave * .04, 2.8), scale: 2.1,  dmg: 20, atk: 1.6, coins: 50, shirt: hiveShirtTex, tint: 0xc890ff, crown: true, spit: true, hive: true },
};
const FUSE = .7, BLAST = 3.5; // exploder fuse and blast radius
const WIND = .8, CHARGE_T = 1.6, CHARGE_SPD = 12; // boss charge (you run at 6)
const LEAP_G = 30, LEAP_CD = 5, LEAP_UP = 2.2, LEAP_R = 12, ROCK_CD = 2.8, ROCK_G = 9; // bosses jump up after you, or throw rocks
function pickType() { // tougher types show up in later waves
  const r = Math.random(); let c = 0;
  if (horde) return r < .4 ? 'runner' : 'walker';
  if (wave >= 5 && r < (c += Math.min(.22, .1 + (wave - 5) * .02))) return 'brute';
  if (wave >= 7 && r < (c += Math.min(.18, .08 + (wave - 7) * .02))) return 'exploder';
  if (wave >= 9 && r < (c += Math.min(.16, .08 + (wave - 9) * .015))) return 'spitter';
  if (wave >= 3 && r < (c += Math.min(.35, .25 + (wave - 3) * .025))) return 'runner';
  return 'walker';
}
function makeZombie(x, z, type) {
  const T = ZTYPES[type], tint = T.tint ?? 0xffffff;
  const skin = lam({ map: skinTex, color: tint }), face = lam({ map: faceTex, color: tint }), shirt = lam({ map: T.shirt }), pants = lam({ map: pantsTex });
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.position.set(x, 0, z); g.scale.setScalar(T.scale);
  const head = box(.5, .5, .5, [skin, skin, skin, skin, face, skin]); head.position.y = 1.6; head.userData.head = true;
  const body = box(.5, .7, .3, shirt); body.position.y = 1.0;
  const armL = box(.18, .18, .65, skin); armL.position.set(-.34, 1.25, .25);
  const armR = box(.18, .18, .65, skin); armR.position.set(.34, 1.25, .25);
  const mkLeg = sx => { const piv = new THREE.Group(); piv.position.set(sx, .65, 0); const l = box(.22, .65, .25, pants); l.position.y = -.325; piv.add(l); return [piv, l]; };
  const [pivL, legL] = mkLeg(-.13), [pivR, legR] = mkLeg(.13);
  g.add(head, body, armL, armR, pivL, pivR); scene.add(g);
  const parts = [head, body, armL, armR, legL, legR], mats = [skin, face, shirt, pants];
  let tankMat = null;
  if (T.tank) {
    tankMat = lam({ color: 0xdd2222 });
    const tank = box(.34, .44, .18, tankMat); tank.position.set(0, 1.05, -.24); g.add(tank); parts.push(tank); mats.push(tankMat);
  }
  if (T.crown) {
    const gold = lam({ color: 0xffcc22, emissive: 0x553300 });
    const band = box(.56, .12, .56, gold); band.position.y = 1.91; g.add(band);
    for (const sx of [-.2, 0, .2]) { const sp = box(.1, .16, .1, gold); sp.position.set(sx, 2.05, .23); g.add(sp); }
  }
  const hp = (60 + wave * 18) * T.hp * ZHP * (horde ? .7 : 1); // horde: more zombies, a bit weaker
  const zz = { g, parts, mats, tankMat, pivL, pivR,
    type, hp, maxHp: hp, speed: T.speed(), dmg: Math.round(T.dmg * (1 + wave * .05)), atkRate: T.atk, coins: T.coins, scale: T.scale,
    r: .3 * T.scale, reach: Math.max(1.1, 1.1 * T.scale), t: Math.random() * 6, atk: 0, flash: 0, dead: 0,
    fuse: 0, beepT: 0, chargeT: 2 + Math.random() * 2, charging: 0, wind: 0, stun: 0, glow: 0, cdx: 0, cdz: 0, hitP: false,
    boss: !!T.crown, spit: !!T.spit, hive: !!T.hive, spitT: 1.5 + Math.random() * 2, windS: 0, sumT: 5 };
  zz.parts.forEach(p => p.userData.zombie = zz);
  addOutline(zz);
  zombies.push(zz);
  return zz;
}
const RISE_T = 1.1; // climbing out of a grave
function spawnZombie(type = pickType()) {
  const r0 = .3 * ZTYPES[type].scale;
  if (MAP.graves && Math.random() < .8) { // out of an open grave, not right beside you
    const ok = MAP.graves.filter(([x, z]) => Math.hypot(x - P.pos.x, z - P.pos.z) > 9 && !zombies.some(o => !o.dead && Math.hypot(o.g.position.x - x, o.g.position.z - z) < 1.2));
    if (ok.length) {
      const [x, z] = ok[Math.random() * ok.length | 0], zz = makeZombie(x, z, type);
      zz.rise = RISE_T; zz.g.position.y = -1.9 * zz.scale; zz.g.rotation.y = Math.atan2(P.pos.x - x, P.pos.z - z);
      sfx('zDie', { at: zz.g.position, far: 45, rate: .5, v: .45 });
      return zz;
    }
  }
  if (MAP.spawns && Math.random() < .8) { // out of the corn, not right beside you
    const ok = MAP.spawns.filter(([x, z]) => Math.hypot(x - P.pos.x, z - P.pos.z) > 9 && !zombies.some(o => !o.dead && Math.hypot(o.g.position.x - x, o.g.position.z - z) < 1.2));
    if (ok.length) {
      const [x, z] = ok[Math.random() * ok.length | 0], zz = makeZombie(x, z, type);
      zz.g.rotation.y = Math.atan2(P.pos.x - x, P.pos.z - z);
      riseAt.set(x, 1.2, z); burst(riseAt, 0x6f9a3a, 8);
      if (!zz.boss) sfx('zDie', { at: zz.g.position, far: 45, rate: .5, v: .45 });
      return zz;
    }
  }
  for (let tries = 0; tries < 80; tries++) {
    let x, z;
    if (MAP.water) { x = (Math.random() * 2 - 1) * (A - 2); z = (Math.random() * 2 - 1) * (A - 2); } // anywhere on dry land
    else { const side = Math.random() * 4 | 0, r = (Math.random() * 2 - 1) * (A - 2), e = A - 1.5; x = side === 0 ? -e : side === 1 ? e : r; z = side === 2 ? -e : side === 3 ? e : r; }
    if (!blocked(x, z, r0, floorY(x, z)) && !overWater(x, z, floorY(x, z)) && !poolAt(x, z) && Math.hypot(x - P.pos.x, z - P.pos.z) > (MAP.water ? 14 : 10)) {
      const zz = makeZombie(x, z, type);
      if (!zz.boss) sfx('zDie', { at: zz.g.position, far: 45, rate: .5, v: .45 }); // a groan so you know where it came up
      return zz;
    }
  }
}
// a zombie climbing out of its grave, kicking up dirt
const riseAt = new THREE.Vector3();
function riseTick(z, dt) {
  z.rise = Math.max(0, z.rise - dt);
  const f = z.rise / RISE_T, p = z.g.position;
  p.y = -1.9 * z.scale * f * f;
  z.g.rotation.x = -.35 * f; z.pivL.rotation.x = Math.sin(z.rise * 18) * .5; z.pivR.rotation.x = -z.pivL.rotation.x;
  if (Math.random() < dt * 16) burst(riseAt.set(p.x + (Math.random() - .5) * .9, .1, p.z + (Math.random() - .5) * 1.6), 0x4a3a28, 2);
  if (!z.rise) z.g.rotation.x = 0;
}
// hit effects on a zombie or bot
function hitFx(zz, point, head, quiet) {
  if (quiet) { burst(point, 0xff7a1a, 2); return; }
  const big = zz.type === 'brute' || zz.boss;
  zz.flash = .1; burst(point, zz.type === 'bot' ? 0xb01818 : 0x3a8a2a, head ? 8 : 4);
  hurtSfx(zz, head ? 'hurtHead' : 'hurt', zz.g.position, { rate: zz.type === 'bot' ? 1 : big ? .6 : .78 });
}
// quiet = burn tick, by = the bot that did it (null = you)
// kind and pj say what hit it, for online play
function hurtZombie(zz, dmg, point, head, quiet = false, by = null, kind = 0, pj = 0, thru = 0) {
  if (!Number.isFinite(dmg)) return; // a bad number would make it unkillable
  if (zz.type === 'bot' && friendly(by, zz)) return; // no friendly fire
  if (net.on && (zz.remote || zz.pid)) { // online the server owns its health
    if (!quiet) { hitFx(zz, point, head, false); if (!by) hitMarker(head ? 'head' : 'body'); }
    net.claim(zz, { kind, head, point, gun: by ? BASE[by.gun]?.id : BASE[cur].id, pj, by, thru });
    return;
  }
  if (zz.type === 'bot' && !quiet) [dmg, head] = gearHit(zz.rec.fx, dmg, head); // hats can block or soften headshots
  // damage boots, the Sharpshooter perk, the Arcane set on wands (not thorns)
  const fx = by ? by.rec?.fx : youFx(), wand = !quiet && (by ? BASE[by.gun] : BASE[cur])?.wand;
  if (kind !== 8) dmg *= 1 + (fx?.dmg ?? 0) + (by ? 0 : perk.dmg * .1) + (wand ? fx?.wand ?? 0 : 0);
  if (zz.type === 'bot') { // bot armor works like yours (the Skyrunner Helm cuts more in the air)
    dmg *= 1 - zz.dr - zz.rec.fx.dr - (zz.vy ? zz.rec.fx.sky : 0);
    const soak = Math.min(zz.armor, dmg); zz.armor -= soak; zz.hp -= dmg - soak; zz.calm = 0;
    const t = kind === 1 && zz.rec.fx.thorns; // the Thornwood Crown stings back
    if (t && by !== zz) { if (by) { if (!by.dead) { stingFx(by.g.position); hurtZombie(by, dmg * t, by.g.position.clone().setY(by.g.position.y + 1), false, true, zz, 8); } } else { stingFx(P.pos); hurtPlayer(dmg * t, false, zz, false, 8); } }
  } else zz.hp -= dmg;
  const dies = zz.hp <= 0 && !zz.dead;
  if (dies) zz.dead = .0001; // mark dead first so a broken effect can't make it unkillable
  if (zz.type === 'bot' && by !== zz) { // recent damage, for kill credit
    const who = by ?? YOU_T;
    if (zz.hitBy !== who || zz.hitByT <= 0) zz.hitDmg = 0;
    zz.hitBy = who; zz.hitByT = 2; zz.hitDmg += dmg;
    (zz.helpers ??= new Set()).add(by ? by.rec : youRec); // for assists
  }
  const big = zz.type === 'brute' || zz.boss;
  hitFx(zz, point, head, quiet);
  // hit marker: red kill, gold headshot, white body
  if (!by && (!quiet || dies)) hitMarker(dies ? 'kill' : head ? 'head' : 'body');
  if (dies) {
    if (!by) { kills++; coins += zz.coins + (head ? 2 : 0); if (zz.boss) bossKills++; if (zz.type !== 'bot') missionKill(head); }
    if (zz.type === 'bot') botDown(zz, by, head);
    else {
      if (!by && zz.boss) sfx('killSpecial'); // walkers die too often for a kill sound
      if (zz.type === 'exploder') explode(zz);
      else if (zz.boss) { sfx('bossRoar', { at: zz.g.position, far: 80, rate: .75 }); banner(`BOSS DOWN!\n+${zz.coins} ${COIN}`, true); }
      else sfx('zDie', { at: zz.g.position, far: 35, rate: big ? .7 : 1 });
    }
  }
}
// hit effects on you (silver flash = armor took all of it)
function youHitFx(head, armorOnly, silver = armorOnly) {
  hurtSfx(P, armorOnly ? 'armorHit' : head ? 'hurtHead' : 'hurt');
  if (P.hp <= 0) sfx('die');
  $('hit').style.background = silver ? '#c9ced6' : 'red';
  $('hit').style.opacity = .4; setTimeout(() => $('hit').style.opacity = 0, 80);
}
// pierce skips armor, by = the bot that shot you
function hurtPlayer(d, pierce = false, by = null, head = false, kind = 0, pj = 0, thru = 0) {
  if (respawnT > 0 || matchOver || !pvp() && dead || by && friendly(by, YOU_T)) return; // your own rocket still hurts
  if (net.on) { // online the server decides the damage
    net.claim(P, { kind, head, point: new THREE.Vector3(P.pos.x, P.pos.y + (head ? 1.6 : 1), P.pos.z), gun: by ? BASE[by.gun]?.id : BASE[cur].id, pj, by, thru });
    return;
  }
  if (by?.rec && kind !== 8) d *= 1 + by.rec.fx.dmg + (kind !== 7 && BASE[by.gun]?.wand ? by.rec.fx.wand ?? 0 : 0);
  if (by?.rec) { youHelpers.add(by.rec); P.hitBy = by; P.hitAt = performance.now(); } // for assists, and knock-off kills
  if (by?.rec && kind < 7) killGuns.set(by.rec, by.gun); // a burn keeps the gun that lit it
  const wasHead = head, fx = youFx(); if (kind !== 8) [d, head] = gearHit(fx, d, head); // hats can block or soften headshots
  d *= 1 - P.dr - fx.dr - (P.onGround ? 0 : fx.sky); // armor and boots cut every hit (the Skyrunner Helm more in the air)
  const soak = pierce ? 0 : Math.min(P.armor, d);
  P.armor -= soak; P.hp -= d - soak; P.calm = 0;
  youHitFx(head, soak === d || wasHead && !head, soak === d);
  if (kind === 1 && fx.thorns && by?.rec && !by.dead) { stingFx(by.g.position); hurtZombie(by, d * fx.thorns, by.g.position.clone().setY(by.g.position.y + 1), false, true, null, 8); } // the Thornwood Crown
  if (P.hp <= 0 && pvp()) { P.hp = 0; youDown(by); return d; }
  if (P.hp <= 0 && !dead) { P.hp = 0; zombiesDead(); }
  return d;
}
// set someone on fire
function applyBurn(victim, t, dmgPerTick, by, gunId, max = false, pj = 0) {
  if (net.on) { net.burn(victim, gunId, by, pj); return; } // online the server runs the burn
  if (shrugs(victim, 'burn', t)) return;
  if (victim === P) { burnYou(t, dmgPerTick, by); return; }
  if (max) { victim.burn = Math.max(victim.burn || 0, t); victim.burnDmg = Math.max(victim.burnDmg || 0, dmgPerTick); }
  else { victim.burn = t; victim.burnDmg = dmgPerTick; }
  victim.burnBy = by;
}
// drowning
function splash(at) { burst(at.clone().setY(Math.max(at.y + .5, .3)), 0xd8f2fa, 14); }
function drownYou() {
  if (respawnT > 0 || matchOver || dead || P.drowned) return;
  if (!MAP.void) { sfx('splash'); splash(P.pos); }
  P.hp = 0; P.armor = 0; P.vy = 0; P.kx = P.kz = P.lx = P.lz = P.dx = P.dz = 0; P.drowned = true;
  if (net.on) { P.drownFlag = true; return; } // online the server calls it
  if (pvp()) { youDown(P.hitBy && performance.now() - P.hitAt < PUSH_KILL * 1000 ? P.hitBy : null); return; } // knocked in: whoever hurt you last gets the kill
  zombiesDead();
}
// blue screen when your eyes are underwater
let underTint = null;
function drownTick(dt) {
  if (!underTint) { underTint = document.createElement('div'); underTint.style.cssText = 'position:fixed;inset:0;background:#1a6c9c;opacity:.5;pointer-events:none;display:none'; $('hit').before(underTint); }
  const show = !!P.drowned && !inLobby;
  if (show) {
    P.pos.y = Math.max(MAP.floor?.(P.pos.x, P.pos.z) ?? 0, P.pos.y - (MAP.sink ?? 1.8) * dt);
    camera.position.y = P.pos.y + .35;
  }
  const under = show && !MAP.void && inWater(P.pos.x, P.pos.z, camera.position.y - .5) || !inLobby && MAP.wet?.(camera.position.x, camera.position.z, camera.position.y);
  underTint.style.display = under ? 'block' : 'none';
}
// a bot or zombie drowned (a zombie counts as your kill)
function drownZombie(z) {
  if (z.dead || z.drownFlag) return;
  if (!MAP.void) { sfx('splash', { at: z.g.position, far: 40 }); splash(z.g.position); }
  z.drowned = true;
  if (z.type === 'bot') {
    if (net.on && z.pid) { z.drownFlag = true; return; } // online the server calls it
    const by = z.hitBy && z.hitByT > 2 - PUSH_KILL ? z.hitBy : null; // knocked in: whoever hurt it last gets the kill
    z.hp = 0; z.dead = .0001; if (by === YOU_T) hitMarker('kill');
    botDown(z, by === YOU_T ? null : by, false, !by); return;
  }
  if (z.type === 'exploder') z.boomed = true; // water puts the fuse out
  hurtZombie(z, z.hp + 1, z.g.position.clone(), false, true);
}
// high score: best wave, then kills
let best = { wave: 0, kills: 0 }, newBest = false;
try { best = JSON.parse(localStorage.getItem('voxelstrike-best')) ?? best; } catch {}
function saveBest(gone) {
  if (mode !== 'zombies' && !zLive) return;
  newBest = wave > best.wave || (wave === best.wave && kills > best.kills);
  if (newBest) { best = { wave, kills }; try { localStorage.setItem('voxelstrike-best', JSON.stringify(best)); } catch {} onSave(); }
  if (gone) zRunWave(true); else zRunScore();
}
// the zombie board (signed in): the server times each run from its first wave; leaving counts the same as dying
let zRun = 0, zRank = null, zLive = false;
function zRunNew() { zRun++; zRank = null; }
function zRunStart() { zLive = !!auth; if (auth) api('POST', '/zombies/start').catch(() => {}); }
function zRunWave(keep = false) { if (zLive && auth && wave > 1) api('POST', '/zombies/score', { wave, kills, live: true }, keep).catch(() => {}); } // the run so far
function zRunScore() {
  const run = zRun; if (!zLive || !auth || !wave) return;
  zLive = false;
  api('POST', '/zombies/score', { wave, kills }).then(r => { if (run === zRun && r.status === 200 && r.week && r.all) { zRank = r; zRankRow(); } }).catch(() => {});
}
addEventListener('pagehide', () => { if (zLive) saveBest(true); }); // closing the tab mid-run
function zRankRow() {
  if (!zRank || !matchOver || $('zRk')) return;
  $('postBoard').insertAdjacentHTML('beforeend', `<div class="r" id="zRk"><span>TOP PLAYERS</span><span>#${zRank.week.rank} this week · #${zRank.all.rank} all time</span></div>`);
}
const booms = [];
function explode(z) {
  if (z.boomed) return;
  z.boomed = true; z.dead ||= .0001; z.g.visible = false;
  blast(z.g.position.clone().setY(z.g.position.y + 1), BLAST, (120 + wave * 25) * ZHP, z.dmg, z);
}
// explosion effect
function blastFx(p, R, gust = false) {
  if (gust) { burst(p, 0xffffff, 24); burst(p, 0x9fdcff, 16); burst(p, 0xffd45a, 6); sfx('gust', { at: p, far: 120 }); } // a burst of wind instead of fire
  else { burst(p, 0xff8800, 30); burst(p, 0x333333, 14); sfx('boom', { at: p, far: 120 }); }
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: gust ? 0xe2f6ff : 0xffaa33, transparent: true, opacity: gust ? .6 : .9 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R });
}
// el: the Ancient Wand's spell (0 fire, 1 ice, 2 wind), which never hurts whoever cast it
function blast(p, R, zDmg, pDmg, skip, by = null, rocket = false, pj = 0, el = -1) {
  const gun = rocket ? (rocket === true ? 'rocket' : rocket) : 'flare', W = BASE[gi(gun)], lk = W?.launch ?? 1, spell = !!W?.spell;
  if (spell) spellFx(p, el); else blastFx(p, R, !!W?.gust);
  const k = spell ? longOf(by ? by.rec?.fx : youFx(), W) : 1, push = self => !self && spell && el === 2 ? SPELL_GUST : 1;
  const hex = o => { if (el === 0) applyBurn(o, W.burnT * k, W.burn, by, W.id, true, pj); else if (el === 1 && !net.on) shockHit(o, FROST, k); }; // online the server sends the ice
  const pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
  if (net.on) { // online the server works out who got hurt
    const kind = rocket ? 4 : 6;
    if (pd < R && !dead && respawnT <= 0) {
      if (pDmg) { net.claim(P, { kind, point: new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), gun, pj, by }); if (spell) hex(P); }
      if (rocket && !by) launch(P, new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), p, 1 - pd / R, true, lk);
    }
    for (const o of zombies) {
      if (o === skip || o.dead || !o.pid || spell && o === by) continue; // other players and room bots
      const c = o.g.position.clone().setY(o.g.position.y + o.scale), od = c.distanceTo(p);
      if (od < R) { net.claim(o, { kind, point: c, gun, pj, by }); if (spell) hex(o); }
    }
    return;
  }
  if (pd < R && !dead && respawnT <= 0 && !(by && friendly(by, YOU_T))) {
    if (pDmg) { hurtPlayer(Math.round(pDmg * (1 - pd / R * .6)), false, by); if (spell) hex(P); }
    if (rocket && respawnT <= 0 && !dead) launch(P, new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), p, (1 - pd / R) * push(!by), !by, lk);
  }
  for (const o of zombies) {
    if (o === skip || o.dead || o.type === 'bot' && friendly(by, o)) continue;
    const c = o.g.position.clone().setY(o.g.position.y + o.scale), od = c.distanceTo(p), self = o === by;
    if (od >= R) continue;
    if (!(spell && self)) hurtZombie(o, self ? ROCKET_SELF * (1 - od / R * .6) : zDmg * (1 - od / R * .5), c, false, false, by);
    if (spell && !self && !o.dead) hex(o);
    if (rocket && !o.dead) launch(o, c, p, (1 - od / R) * push(self), self, lk);
  }
}

// shop between waves
const SHOP = [
  { name: 'Medkit',  price: 15, heal: 50, desc: '+50 HP', ic: 'plus', col: '#ff6b6b' },
  { name: 'Armor Plate', price: 40, armor: 25, desc: `+25 max armor and a refill, up to ${ARMOR_CAP}`, ic: 'shield', col: '#9fd3ff' },
  { name: 'Ammo',    price: 20, refill: true, desc: 'fills up all your spare ammo', ic: 'bullet', col: '#ffcf3a' },
  { name: 'Adrenaline', price: 60, perk: 'spd', desc: '+10% run speed', ic: 'fast', col: '#8ff0b6' },
  { name: 'Sharpshooter', price: 80, perk: 'dmg', desc: '+10% damage', ic: 'aim', col: '#8ff0b6' },
  { name: 'Vitality', price: 50, perk: 'hp', desc: '+25 max HP, healed too', ic: 'heart', col: '#8ff0b6' },
  { gun: 'shotgun', price: 40, desc: '9 pellets, close range' },
  { gun: 'ar', price: 90, desc: 'full auto, 30 mag' },
  { gun: 'hitman', price: 60, desc: 'quiet pistol, 2x sight' },
  { gun: 'thrasher', price: 100, desc: '35 round rifle, 3x sight' },
  { gun: 'sniper', price: 140, desc: `${BASE[gi('sniper')].dmg} dmg, aim to scope` },
  { gun: 'semisniper', price: 200, desc: `${BASE[gi('semisniper')].dmg} dmg, 10 shot semi-auto` },
  { gun: 'heatray', price: 160, desc: 'a beam that cooks them' },
  { gun: 'flame', price: 200, desc: 'burns everything in front of you' },
  { gun: 'flare', price: 120, desc: 'one fiery shot that sets them on fire' },
  { gun: 'eradicator', price: 280, desc: '120 round bullet hose' },
  { gun: 'rocket', price: 450, desc: 'big splash damage' },
  { gun: 'herosword', price: 110, desc: 'a bronze blade with a long reach' },
  { gun: 'shockbeam', price: 180, desc: 'a beam that slows them down' },
  { gun: 'tigerbite', price: 240, desc: `${BASE[gi('tigerbite')].dmg} dmg, 6 shot sniper` },
  { gun: 'executioner', price: 260, desc: `laser pistol, ${BASE[gi('executioner')].dmg} dmg` },
  { gun: 'crossbow', price: 160, desc: 'quiet bolts, huge headshots' },
  { gun: 'grenade', price: 300, desc: 'bouncy grenades, big booms' },
  { gun: 'aerial', price: 360, desc: 'blasts of wind that throw you sky high' },
  { gun: 'rubypierce', price: 420, desc: 'a red beam through walls and whole rows of them' },
  { gun: 'paragon', price: 400, desc: `${BASE[gi('paragon')].dmg} dmg beam that goes through the lot` },
  { gun: 'trex', price: 250, desc: 'six big pellets and a dino bite' },
  { gun: 'starsmasher', price: 380, desc: 'stars out of the muzzle, 3x sight' },
  { gun: 'blazesaber', price: 320, desc: 'a blade of fire that burns them' },
  { gun: 'windsaber', price: 480, desc: 'run faster and jump higher' },
  { gun: 'frostwand', price: 300, desc: 'an icy beam that slows them right down' },
  { gun: 'warhammer', price: 320, desc: 'a heavy swing that knocks them flying' },
  { gun: 'windwand', price: 280, desc: 'gusts that blow them back a step' },
  { gun: 'stunwand', price: 260, desc: 'a zap that freezes them in place' },
  { gun: 'flamewand', price: 380, desc: 'fireballs that leave them burning' },
  { gun: 'soulwand', price: 400, desc: 'every kill gives you a little health' },
  { gun: 'ancientwand', price: 520, desc: 'fire, ice or wind, never the same twice' },
].map(it => it.gun ? { ...it, gun: gi(it.gun), name: BASE[gi(it.gun)].name } : it);
const PERK_MAX = 3, FETCH = .25; // fetching your own gun costs a share of its rent
// gun offers: one gun from each of a few categories, upgrades more likely, rarer guns less often (chest odds)
const OFFERS = 3, tierOf = g => BASE[g].start ? 0 : BASE[g].unlock || 1;
let shopOffer = [];
function pickOffers() {
  const held = {};
  BASE.forEach((w, g) => { if (owned[g]) held[w.cat] = Math.max(held[w.cat] ?? -1, tierOf(g)); });
  const cats = {};
  SHOP.forEach((it, i) => {
    if (it.gun === undefined || owned[it.gun]) return;
    const cat = BASE[it.gun].cat;
    if (BASE[it.gun].start && (held[cat] ?? 0) > 0) return; // skip starter guns once you have better
    (cats[cat] ??= []).push(i);
  });
  const pool = Object.entries(cats).map(([cat, list]) => ({ list, w: list.some(i => tierOf(SHOP[i].gun) > (held[cat] ?? -1)) ? 3 : 1 }));
  const draw = (items, w) => { let r = Math.random() * items.reduce((s, x) => s + w(x), 0), k = 0; while (k < items.length - 1 && (r -= w(items[k])) >= 0) k++; return k; };
  const out = [];
  while (pool.length && out.length < OFFERS) { const [p] = pool.splice(draw(pool, x => x.w), 1); out.push(p.list[draw(p.list, i => GUN_DROP[rarOf(BASE[SHOP[i].gun])])]); }
  return out.sort((a, b) => a - b);
}
const ammoFull = () => WEAPONS.every((w, i) => !owned[i] || reserve[i] >= resMax(i) && (!BASE[i].pool || ammo[i] >= w.mag));
let shopOpen = false, shopWave = 0, bonus = 0, armorBought = 0, waveReward = null;
// shop prices go up each time you buy
const rental = g => owned[g] && !hasGun(g); // rented this run, so it can be upgraded
const isUpg = it => it.gun !== undefined && rental(it.gun);
const maxed = it => (isUpg(it) && lvl[it.gun] >= 2) || (it.armor && P.maxArmor >= ARMOR_CAP) || (it.perk && perk[it.perk] >= PERK_MAX);
const priceOf = it => it.armor ? it.price + armorBought * 25 : it.perk ? Math.round(it.price * (1 + perk[it.perk] * .5)) : isUpg(it) ? Math.round(it.price * (lvl[it.gun] ? 1.25 : .75)) : it.gun !== undefined && hasGun(it.gun) ? Math.ceil(it.price * FETCH) : it.price;
function showShop(on) { $('shop').style.display = on ? 'flex' : 'none'; document.body.classList.toggle('shopping', on); }
// what the wave paid: run coins and health, then the account
function shopTop() {
  const box = (label, val, cls = '') => `<div class="sb${cls}"><small>${label}</small><b>${val}</b></div>`;
  const bar = (v, max, col) => `<span class="sbar" style="--f:${Math.max(0, Math.min(1, v / max))};--bc:${col}"></span>`;
  const R = waveReward;
  return `<div class="sg">${box('SHOP COINS', `${COIN}${coins}<em>+${bonus}</em>`, ' gold')}${box('HEALTH', `${ico('heart')} ${Math.ceil(P.hp)}/${P.max}${bar(P.hp, P.max, '#ff5a5a')}`)}` +
    (P.maxArmor ? box('ARMOR', `${ico('shield')} ${Math.ceil(P.armor)}/${P.maxArmor}${bar(P.armor, P.maxArmor, '#9fd3ff')}`) : '') + '</div>' +
    (R ? `<div class="sg acct">${box('ACCOUNT', R.pay ? `+${R.gold}${COIN} +${R.xp} XP` : `paid up to wave ${PAY_WAVES}`)}` +
      (R.ups ? box(`LEVEL ${R.lv}!`, `+${R.bonus}${COIN} +${R.boost} ${ico('bolt')}`, ' up') : '') + '</div>' : '');
}
// one row: icon or gun picture, name and what it does, price
function shopRow(it, i) {
  const upg = isUpg(it), done = maxed(it), price = priceOf(it), g = it.gun, gun = g !== undefined;
  const full = (it.heal && P.hp >= P.max) || (it.refill && ammoFull()), poor = !done && !full && coins < price;
  let name = it.name, tag = '', desc = it.desc, cost = `<b>${COIN}${price}</b>`;
  if (gun) {
    const mine = hasGun(g); // yours from the armory: cheap
    tag = CATS[slotOf(g)][1] + (upg ? '' : mine ? ' · YOURS' : ' · RENT');
    if (upg) name += ` <span class="st">${stars(g)}</span>`;
    else if (mine && gunUse(g)) name += ` <span class="st">${starRow(gunUse(g), gunUse(g), 3)}</span>`;
  }
  if (upg) {
    const nx = statsAt(g, lvl[g] + 1);
    const to = (k, a, b) => `${k} ${a} ${ico('right')} ${b}`, W = WEAPONS[g];
    desc = done ? 'fully upgraded' : [nx.dmg !== W.dmg ? to('dmg', W.dmg, nx.dmg) : to('rate', +(1 / W.rate).toFixed(1), +(1 / nx.rate).toFixed(1) + '/s'), nx.mag !== W.mag && to('mag', W.mag, nx.mag), 'faster reload'].filter(Boolean).join(' · ');
  }
  if (it.perk) name += ` <span class="pips">${'<i class="on"></i>'.repeat(perk[it.perk])}${'<i></i>'.repeat(PERK_MAX - perk[it.perk])}</span>`;
  if (done) cost = 'MAXED'; else if (full) cost = 'FULL';
  const col = gun ? RARITY[rarOf(BASE[g])][1] : it.col, pic = gun ? `<img src="${gunPic(g)}">` : ico(it.ic);
  return `<button data-i="${i}" class="si${gun ? ' gun' : ''}${done || full ? ' done' : ''}${poor ? ' poor' : ''}" style="--rc:${col}" ${done || full || poor ? 'disabled' : ''}>` +
    `<span class="sp">${pic}</span><span class="sn">${tag ? `<small>${tag}</small>` : ''}<b>${name}</b><small>${desc}</small></span>` +
    `<span class="sc">${upg && !done ? '<small>UPGRADE</small>' : ''}${cost}</span></button>`;
}
function renderShop() {
  $('shopH').textContent = `WAVE ${wave} CLEARED`;
  $('shopInfo').innerHTML = shopTop();
  // this visit: supplies and perks always, a few gun offers, upgrades for guns you rented
  const rows = f => SHOP.map((it, i) => [it, i]).filter(([it, i]) => f(it, i)).map(([it, i]) => shopRow(it, i)).join('');
  const sec = (title, html) => html ? `<section><h2>${title}</h2>${html}</section>` : '';
  const ups = rows(it => isUpg(it) && !maxed(it)) + rows(it => isUpg(it) && maxed(it)); // maxed ones last
  $('items').innerHTML = `<div class="scol">${sec('SUPPLIES', rows(it => it.gun === undefined && !it.perk))}${sec('PERKS', rows(it => it.perk))}</div>` +
    `<div class="scol">${sec('GUNS', rows((it, i) => shopOffer.includes(i) && !owned[it.gun]) || '<p class="none">nothing new this time</p>')}${sec('UPGRADES', ups)}</div>`;
}
function buy(i) {
  const it = SHOP[i], price = priceOf(it); if (coins < price || maxed(it)) return;
  coins -= price;
  if (isUpg(it)) { // upgrading also refills the mag
    const g = it.gun; lvl[g]++; applyLvl(g); ammo[g] = WEAPONS[g].mag;
    if (g === cur) { cancelReload(); buildGun(); renderHotbar(); } else equip(g);
    sfx('upgrade');
  }
  else if (it.gun !== undefined) {
    const g = it.gun;
    if (hasGun(g)) giveGun(g);
    else { lvl[g] = 0; applyLvl(g); owned[g] = true; ammo[g] = WEAPONS[g].mag; reserve[g] = resMax(g); }
    equip(g);
  }
  else if (it.perk) { perk[it.perk]++; if (it.perk === 'hp') { P.max += 25; P.hp = Math.min(P.max, P.hp + 25); } sfx('upgrade'); }
  if (it.heal) P.hp = Math.min(P.max, P.hp + it.heal);
  if (it.armor) { P.maxArmor = Math.min(ARMOR_CAP, P.maxArmor + it.armor); P.armor = P.maxArmor; armorBought++; }
  if (it.refill) WEAPONS.forEach((w, g) => { if (owned[g]) { reserve[g] = resMax(g); if (BASE[g].pool) ammo[g] = w.mag; } });
  sfx('buy'); renderShop();
}
function openShop() { shopOpen = true; shopOffer = pickOffers(); renderShop(); unlockMouse(); }
$('items').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) buy(+b.dataset.i); });
$('next').addEventListener('click', () => {
  shopOpen = false; showShop(false); waveWait = 3;
  rerollPads(); // so pickups match what you own now
  lockMouse();
});
// end of a run
function zombiesDead() { dead = true; deadT = 0; saveBest(); }
function zombiesOver() {
  matchOver = true; $('menu').style.display = 'none'; $('banner').style.opacity = 0;
  $('postSub').textContent = 'ZOMBIE WAVES OVER';
  $('postPlace').textContent = `WAVE ${wave}` + (newBest ? ' · NEW BEST!' : '');
  $('postBoard').className = 'lb z';
  const row = (k, v) => `<div class="r"><span>${k}</span><span>${v}</span></div>`;
  $('postBoard').innerHTML = row('WAVE REACHED', wave) + row('KILLS', kills) + row('BOSSES DOWN', bossKills) + row('BEST RUN', `wave ${best.wave} · ${best.kills} kills`)
    + (auth ? '' : row('TOP PLAYERS', cg.on ? 'Log in to get on the board' : 'Sign in to get on the board'));
  zRankRow(); missionEnd(false);
  $('rewards').innerHTML = rewardRow([xpTile(runXp), coinTile(runCoins), boostTile(), ...eventTiles()]) + `<div class="rl">LVL ${prof.lv} · ${xpText()}</div>${xpBar()}`
    + (wave > PAY_WAVES ? `<div class="rl">Past wave ${PAY_WAVES} a run pays no more</div>` : '') + missionsRow() + dailyRow();
  $('post').style.display = 'flex'; document.body.classList.add('results');
  sfx(newBest ? 'win' : 'lose');
  setTimeout(cgMidgame, 1500); // CrazyGames midgame ad
  unlockMouse();
}
// acid spit
const GLOB_SPD = 13, GLOB_G = 5, globs = [];
const globGeo = new THREE.BoxGeometry(.28, .28, .28), globMat = lam({ color: 0x8fd83a, emissive: 0x2a5a00 });
const spitFrom = new THREE.Vector3(), spitTo = new THREE.Vector3();
function spit(z) {
  const from = spitFrom.set(z.g.position.x, z.g.position.y + 1.45 * z.scale, z.g.position.z), to = spitTo.set(P.pos.x, P.pos.y + 1, P.pos.z);
  const n = z.type === 'hive' ? 3 : 1; // the hive spits three
  for (let k = 0; k < n; k++) {
    const v = to.clone().sub(from), d = Math.max(1, v.length()); v.normalize();
    if (n > 1) { const a = (k - 1) * .2, c = Math.cos(a), sn = Math.sin(a), x = v.x * c - v.z * sn, zz = v.x * sn + v.z * c; v.x = x; v.z = zz; }
    v.multiplyScalar(GLOB_SPD); v.y += d * GLOB_G / GLOB_SPD * .5; // aim a bit high to make up for the drop
    const m = new THREE.Mesh(globGeo, globMat); m.position.copy(from); scene.add(m);
    globs.push({ m, v, life: 3, dmg: z.dmg });
  }
  sfx('swing', { at: from, far: 40, rate: .7 });
}
function globTick(dt) {
  for (let i = globs.length - 1; i >= 0; i--) {
    const g = globs[i], p = g.m.position, w = g.rock ? .7 : .55; g.life -= dt; g.v.y -= (g.grav ?? GLOB_G) * dt;
    p.addScaledVector(g.v, dt); g.m.rotation.x += dt * 6; g.m.rotation.z += dt * 4;
    const hitYou = !dead && Math.abs(p.x - P.pos.x) < w && Math.abs(p.z - P.pos.z) < w && p.y > P.pos.y - .2 && p.y < P.pos.y + 1.9;
    if (hitYou) hurtPlayer(g.dmg);
    if (hitYou || g.life <= 0 || p.y < (MAP.floor?.(p.x, p.z) ?? 0) || solidAt(p.x, p.y, p.z, .14)) {
      burst(p.clone(), g.rock ? 0x8a8070 : 0x9ad84a, hitYou ? 8 : g.rock ? 10 : 5); if (g.rock) sfx('smash', { at: p, far: 40, v: .5 });
      scene.remove(g.m); globs.splice(i, 1);
    }
  }
}
function clearGlobs() { for (const g of globs) scene.remove(g.m); globs.length = 0; }

// bosses are too big for stairs: when you're up out of reach they jump up beside you, or throw rocks if there's no room to land
const rockGeo = new THREE.BoxGeometry(.7, .6, .7), rockMat = lam({ color: 0xa39a8c, emissive: 0x24211c });
const bossTall = z => 1.9 * z.scale, bA = new THREE.Vector3(), bB = new THREE.Vector3();
// room for all of it: ground under its middle, and nothing over its head or shoulders
const bossFits = (z, x, y, zz) => Math.abs(x) < MAP.half - 1 && Math.abs(zz) < MAP.half - 1 && !blocked(x, zz, z.r, y) && !blocked(x, zz, z.r, y + 2)
  && groundAt(x, zz, z.r * .4, y + .1) > y - .3 && !overWater(x, zz, y)
  && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => clearLine(bA.set(x + a * z.r * .8, y + .4, zz + b * z.r * .8), bB.set(x + a * z.r * .8, y + bossTall(z), zz + b * z.r * .8)));
// a jump from s to l peaking h over the higher end, clear all the way for its body (middle, head and both shoulders)
function leapArc(z, s, l, h) {
  const len = Math.hypot(l.x - s.x, l.z - s.z); if (len > LEAP_R) return null;
  const top = Math.max(s.y, l.y) + h, v0 = Math.sqrt(2 * LEAP_G * (top - s.y)), T = v0 / LEAP_G + Math.sqrt(2 * (top - l.y) / LEAP_G), H = bossTall(z) - .2, N = 12;
  const sx = -(l.z - s.z) / (len || 1) * z.r, sz = (l.x - s.x) / (len || 1) * z.r, line = (a, b, ox, oz, dy) => clearLine(bA.set(a[0] + ox, a[1] + dy, a[2] + oz), bB.set(b[0] + ox, b[1] + dy, b[2] + oz));
  let q = [s.x, s.y, s.z];
  for (let k = 1; k <= N; k++) {
    const t = T * k / N, x = s.x + (l.x - s.x) * k / N, zz = s.z + (l.z - s.z) * k / N, y = s.y + v0 * t - LEAP_G * t * t / 2, n = [x, y, zz];
    if (k < N && (blocked(x, zz, z.r * .8, y) || blocked(x, zz, z.r * .8, y + 2))) return null;
    if (!line(q, n, 0, 0, 1) || !line(q, n, 0, 0, H) || !line(q, n, sx, sz, H * .6) || !line(q, n, -sx, -sz, H * .6)) return null;
    q = n;
  }
  return { T, v0 };
}
const leapFrom = (z, s, l) => leapArc(z, s, l, 2) || leapArc(z, s, l, 1) || leapArc(z, s, l, 4); // a low one under a roof
// somewhere beside you with room for it
function landNear(z) {
  const g0 = groundAt(P.pos.x, P.pos.z, .3, P.pos.y + .1), p = z.g.position, a0 = Math.atan2(p.x - P.pos.x, p.z - P.pos.z);
  for (const d of [1.8, 2.8]) for (const a of [0, .8, -.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
    const x = P.pos.x + Math.sin(a0 + a) * d, zz = P.pos.z + Math.cos(a0 + a) * d, y = groundAt(x, zz, z.r, g0 + .6);
    if (Math.abs(y - g0) < 1 && bossFits(z, x, y, zz)) return new THREE.Vector3(x, y, zz);
  }
  return null;
}
// you're down somewhere it can't fit (the crypt): the ground right over you
function overYou(z) {
  const p = z.g.position, y = groundAt(P.pos.x, P.pos.z, z.r, p.y + .6), h = y - P.pos.y;
  return Math.abs(y - p.y) < .8 && h > 1.5 && h < 4.5 && bossFits(z, P.pos.x, y, P.pos.z) ? new THREE.Vector3(P.pos.x, y, P.pos.z) : null;
}
// stuck among things too tight for it (rows of graves): a hop a few metres on along its way
function hopOn(z, way) {
  const p = z.g.position, t = way || P.pos, a0 = Math.atan2(t.x - p.x, t.z - p.z);
  for (const d of [4, 3]) for (const a of [0, .5, -.5, 1, -1]) {
    const x = p.x + Math.sin(a0 + a) * d, zz = p.z + Math.cos(a0 + a) * d, y = groundAt(x, zz, z.r, p.y + .6);
    if (Math.abs(y - p.y) < .8 && bossFits(z, x, y, zz)) return new THREE.Vector3(x, y, zz);
  }
  return null;
}
// a throw from `from` that gets to you clear
function lobAt(from) {
  const to = new THREE.Vector3(P.pos.x, P.pos.y + 1.1, P.pos.z), d = Math.hypot(to.x - from.x, to.z - from.z), q = new THREE.Vector3(), n = new THREE.Vector3();
  for (const T of [.45 + d / 14, .7 + d / 10, 1 + d / 8]) {
    const v = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y) / T + ROCK_G * T / 2, (to.z - from.z) / T);
    let ok = true; q.copy(from);
    for (let k = 1; k <= 10 && ok; k++) { const t = T * k / 10; n.set(from.x + v.x * t, from.y + v.y * t - ROCK_G * t * t / 2, from.z + v.z * t); ok = clearLine(q, n) && (k === 10 || !solidAt(n.x, n.y, n.z, .25)); q.copy(n); }
    if (ok) return v;
  }
  return null;
}
const bossHand = (z, x = z.g.position.x, y = z.g.position.y, zz = z.g.position.z) => { // a rock in its hands, facing you
  const d = Math.hypot(P.pos.x - x, P.pos.z - zz) || 1, f = .62 * z.scale;
  return new THREE.Vector3(x + (P.pos.x - x) / d * f, y + 1.32 * z.scale, zz + (P.pos.z - zz) / d * f);
};
// spots on its own level to jump from (round where it would land), then to throw from (round you), nearest first
function bossSpots(z, L) {
  const p = z.g.position, list = [];
  for (const l of L ? [L, null] : [null]) {
    const c = l || P.pos, ring = [];
    for (const r of [4, 6.5, 9]) for (let k = 0; k < 10; k++) {
      const a = (k + r) / 10 * Math.PI * 2, x = c.x + Math.sin(a) * r, zz = c.z + Math.cos(a) * r;
      if (!z.bad?.some(b => Math.hypot(b.x - x, b.z - zz) < 2)) ring.push({ d: Math.hypot(x - p.x, zz - p.z), x, zz, l }); // not one it couldn't get to
    }
    list.push(...ring.sort((a, b) => a.d - b.d));
  }
  return { list, i: 0 };
}
// try a few a frame: the spot, null when none will do, undefined while still looking
function bossSpotStep(z, n) {
  const p = z.g.position, H = z.hunt;
  while (n-- > 0 && H.i < H.list.length) {
    const { x, zz, l } = H.list[H.i++], y = groundAt(x, zz, z.r, p.y + .6);
    if (Math.abs(y - p.y) > .6 || !bossFits(z, x, y, zz)) continue;
    const s = new THREE.Vector3(x, y, zz);
    if (l ? leapFrom(z, s, l) : lobAt(bossHand(z, x, y, zz))) return s;
  }
  return H.i < H.list.length ? undefined : null;
}
// where a boss heads: the usual way, or when you're up out of reach (or it's stuck) a spot to jump or throw from
function bossWay(z, dt, way, dist) {
  const p = z.g.position, busy = z.wind > 0 || z.charging > 0 || z.stun > 0 || z.windS > 0 || z.throwW > 0 || z.landT > 0 || z.stunT > 0, dy = P.pos.y - p.y;
  if ((z.stuckT = (z.stuckT ?? 1) - dt) <= 0) { // walked for a while and got nowhere: the path is too tight for it
    if (z.walkT > .7 && dist > z.reach + .5 && Math.hypot(p.x - z.sx, p.y - z.sy, p.z - z.sz) < .3) {
      z.stuckOut = 4; z.bee = !z.bee;
      if (z.go && (z.stuckN = (z.stuckN || 0) + 1) >= 3) { (z.bad ||= []).push(z.go); z.go = null; z.goT = 0; } // can't get there either way: pick another spot
    } else z.stuckN = 0;
    z.stuckT = 1; z.walkT = 0; z.sx = p.x; z.sy = p.y; z.sz = p.z;
  }
  if (dist <= z.reach && dy > -1 && dy < 3.5) return null; // close enough to hit you
  if (z.stuckOut > 0) { z.stuckOut -= dt; if (dy < -1.5) z.downT = 8; } // stuck getting down to you: stomp from above instead
  if (z.downT > 0) z.downT -= dt;
  const pg = groundAt(P.pos.x, P.pos.z, .3, P.pos.y + .1), tight = !!way && blocked(way.x, way.z, z.r * .9, way.y);
  z.up = !dead && pg - p.y > LEAP_UP; z.out = z.up || !dead && (z.stuckOut > 0 || z.downT > 0);
  if (!z.out) { z.go = z.hunt = z.bad = null; return way; }
  z.leapCD = (z.leapCD ?? 2) - dt; z.rockCD = (z.rockCD ?? 1.5) - dt;
  if (!busy && (z.tryT = (z.tryT ?? 0) - dt) <= 0) {
    z.tryT = .2; z.tryK = !z.tryK; // a jump one go, a throw the next
    const L = z.tryK ? z.L = landNear(z) : z.L, arc = z.tryK && L && z.leapCD <= 0 && leapFrom(z, p, L);
    if (arc) { z.leap = { w: .6, s: p.clone(), l: L, ...arc }; z.go = null; sfx('bossRoar', { at: p, far: 80, rate: 1.15 }); return null; }
    const over = z.tryK && z.downT > 0 && overYou(z);
    if (over && Math.hypot(over.x - p.x, over.z - p.z) < 1.3) {
      const st = z.leapCD <= 0 && leapArc(z, p, p.clone(), 1.2);
      if (st) { z.leap = { w: .5, s: p.clone(), l: p.clone(), stomp: true, ...st }; z.go = null; sfx('bossRoar', { at: p, far: 80, rate: .9 }); return null; }
    } else if (over) { z.go = over; z.hunt = null; }
    const hop = z.tryK && !z.up && z.stuckOut > 0 && z.leapCD <= 0 && hopOn(z, z.go ? MAP.nav?.(p, z.go) || z.go : way), harc = hop && leapFrom(z, p, hop);
    if (harc) { z.leap = { w: .45, s: p.clone(), l: hop, ...harc }; z.go = null; z.stuckOut = 0; return null; }
    if (!z.tryK && z.rockCD <= 0 && dist < 20 && lobAt(bossHand(z))) {
      z.throwW = .55; z.rock = new THREE.Mesh(z.hive ? globGeo : rockGeo, z.hive ? globMat : rockMat); if (z.hive) z.rock.scale.setScalar(1.8);
      z.rock.position.copy(bossHand(z)); scene.add(z.rock); return null;
    }
    if (!z.hunt && ((z.goT = (z.goT ?? 0) - .3) <= 0 || z.go && Math.hypot(P.pos.x - z.goP.x, P.pos.z - z.goP.z) > 2)) { z.hunt = bossSpots(z, L); z.goT = 2.5; z.goP = P.pos.clone(); }
  }
  if (z.hunt) { const s = bossSpotStep(z, 2); if (s !== undefined) { z.go = s; z.hunt = null; z.bee = false; } }
  if (z.go) return (!z.bee && MAP.nav?.(p, z.go)) || z.go; // snagged on a corner: straight there for a bit
  return z.up ? (tight || way && way.y > p.y + .05 ? null : way) : z.bee ? null : way; // no climbing after you; just stuck: the path, or straight at you
}
// winding up a throw, or getting up after a landing
function bossBusy(z, dt) {
  if (z.landT > 0) { z.landT -= dt; return true; }
  if (!(z.throwW > 0)) return false;
  const r = z.rock; r.position.copy(bossHand(z)).y += (.55 - z.throwW) * .8; r.rotation.y += dt * 3; // lifted to throw
  if ((z.throwW -= dt) <= 0) {
    const v = lobAt(r.position);
    if (v) { globs.push({ m: r, v, life: 4, dmg: z.dmg, grav: ROCK_G, rock: !z.hive }); sfx('swing', { at: r.position, far: 50, rate: .5 }); }
    else scene.remove(r);
    z.rock = null; z.rockCD = ROCK_CD;
  }
  return true;
}
// a boss in the air: crouch, jump, then the landing shakes the ground and throws you back (or stomps down on you underground)
function leapTick(z, dt) {
  const L = z.leap, p = z.g.position;
  if (L.w > 0) {
    L.w -= dt; z.g.scale.set(z.scale * 1.06, z.scale * .86, z.scale * 1.06);
    z.mats.forEach(m => m.emissive.setHex(Math.sin(L.w * 30) > 0 ? 0x662200 : 0x220800));
    if (L.w <= 0) { z.g.scale.setScalar(z.scale); z.mats.forEach(m => m.emissive.setHex(0)); L.t = 0; sfx('bossCharge', { at: p, far: 70 }); }
    return;
  }
  L.t = Math.min(L.t + dt, L.T);
  const f = L.t / L.T;
  p.set(L.s.x + (L.l.x - L.s.x) * f, L.s.y + L.v0 * L.t - LEAP_G * L.t * L.t / 2, L.s.z + (L.l.z - L.s.z) * f);
  z.g.rotation.y = Math.atan2(L.l.x - L.s.x, L.l.z - L.s.z); z.pivL.rotation.x = -.9; z.pivR.rotation.x = .4;
  if (L.t < L.T) return;
  p.copy(L.l); z.leap = null; z.vy = 0; z.onRamp = false; z.landT = .7; z.leapCD = LEAP_CD; z.go = null; z.pivL.rotation.x = z.pivR.rotation.x = 0;
  sfx('boom', { at: p, far: 90 }); burst(p.clone().setY(p.y + .3), 0x8a7a66, 22);
  const dx = P.pos.x - p.x, dz = P.pos.z - p.z, d = Math.hypot(dx, dz);
  if (L.stomp) { // the ceiling comes down on you
    z.downT = 8; burst(new THREE.Vector3(P.pos.x, P.pos.y + 2.2, P.pos.z), 0x6a5a48, 16);
    if (!dead && d < 2.8 && P.pos.y < p.y - 1 && p.y - P.pos.y < 4.5) { stingYou(z, hurtPlayer(Math.round(z.dmg * 1.2))); sfx('smash'); }
  } else if (!dead && d < 3.4 && Math.abs(P.pos.y - p.y) < 2) { stingYou(z, hurtPlayer(Math.round(z.dmg * 1.2))); P.kx = dx / (d || 1) * 13; P.kz = dz / (d || 1) * 13; P.vy = Math.max(P.vy, 7); P.onGround = false; }
}
function resetRun() { perk.spd = perk.dmg = perk.hp = 0; runCoins = runXp = bossKills = 0; deadT = 0; horde = false; countShown = 0; shopOffer = []; clearGlobs(); }
function banner(text, html = false) { const b = $('banner'); b[html ? 'innerHTML' : 'textContent'] = text; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1800); }
