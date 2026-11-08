const zombies = [];
let wave = 0, toSpawn = 0, spawnT = 0, waveWait = 1.5, kills = 0, coins = 0;
// zombie waves run state
let runCoins = 0, runXp = 0, bossKills = 0, deadT = 0, horde = false, countShown = 0;
const perk = { spd: 0, dmg: 0, hp: 0 }, PAY_WAVES = 30, DEAD_T = .9;
// zombie hp scale, since gun damage is tuned for deathmatch
const ZHP = .56;
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
function spawnZombie(type = pickType()) {
  const r0 = .3 * ZTYPES[type].scale;
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
// hit effects on a zombie or bot
function hitFx(zz, point, head, quiet) {
  if (quiet) { burst(point, 0xff7a1a, 2); return; }
  const big = zz.type === 'brute' || zz.boss;
  zz.flash = .1; burst(point, zz.type === 'bot' ? 0xb01818 : 0x3a8a2a, head ? 8 : 4);
  hurtSfx(zz, head ? 'hurtHead' : 'hurt', zz.g.position, { rate: zz.type === 'bot' ? 1 : big ? .6 : .78 });
}
// quiet = burn tick, by = the bot that did it (null = you)
// kind and pj say what hit it, for online play
function hurtZombie(zz, dmg, point, head, quiet = false, by = null, kind = 0, pj = 0) {
  if (!Number.isFinite(dmg)) return; // a bad number would make it unkillable
  if (zz.type === 'bot' && friendly(by, zz)) return; // no friendly fire
  if (net.on && (zz.remote || zz.pid)) { // online the server owns its health
    if (!quiet) { hitFx(zz, point, head, false); if (!by) hitMarker(head ? 'head' : 'body'); }
    net.claim(zz, { kind, head, point, gun: by ? BASE[by.gun]?.id : BASE[cur].id, pj, by });
    return;
  }
  if (zz.type === 'bot' && !quiet) [dmg, head] = gearHit(zz.rec.fx, dmg, head); // hats can block or soften headshots
  // damage boots
  dmg *= 1 + (by ? by.rec?.fx.dmg ?? 0 : youFx().dmg + perk.dmg * .1); // Sharpshooter perk
  if (zz.type === 'bot') { // bot armor works like yours
    dmg *= 1 - zz.dr - zz.rec.fx.dr;
    const soak = Math.min(zz.armor, dmg); zz.armor -= soak; zz.hp -= dmg - soak;
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
    if (!by) { kills++; coins += zz.coins + (head ? 2 : 0); if (zz.boss) bossKills++; }
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
function hurtPlayer(d, pierce = false, by = null, head = false, kind = 0, pj = 0) {
  if (respawnT > 0 || matchOver || !pvp() && dead || by && friendly(by, YOU_T)) return; // your own rocket still hurts
  if (net.on) { // online the server decides the damage
    net.claim(P, { kind, head, point: new THREE.Vector3(P.pos.x, P.pos.y + (head ? 1.6 : 1), P.pos.z), gun: by ? BASE[by.gun]?.id : BASE[cur].id, pj, by });
    return;
  }
  if (by?.rec) d *= 1 + by.rec.fx.dmg;
  if (by?.rec) youHelpers.add(by.rec); // for assists
  const wasHead = head; [d, head] = gearHit(youFx(), d, head); // hats can block or soften headshots
  d *= 1 - P.dr - youFx().dr; // armor and boots cut every hit
  const soak = pierce ? 0 : Math.min(P.armor, d);
  P.armor -= soak; P.hp -= d - soak;
  youHitFx(head, soak === d || wasHead && !head, soak === d);
  if (P.hp <= 0 && pvp()) { P.hp = 0; youDown(by); return; }
  if (P.hp <= 0 && !dead) { P.hp = 0; zombiesDead(); }
}
// set someone on fire
function applyBurn(victim, t, dmgPerTick, by, gunId, max = false) {
  if (net.on) { net.burn(victim, gunId, by); return; } // online the server runs the burn
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
  P.hp = 0; P.armor = 0; P.vy = 0; P.kx = P.kz = P.lx = P.lz = 0; P.drowned = true;
  if (net.on) { P.drownFlag = true; return; } // online the server calls it
  if (pvp()) { youDown(null); return; }
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
    z.hp = 0; z.dead = .0001; botDown(z, null, false, true); return;
  }
  if (z.type === 'exploder') z.boomed = true; // water puts the fuse out
  hurtZombie(z, z.hp + 1, z.g.position.clone(), false, true);
}
// high score: best wave, then kills
let best = { wave: 0, kills: 0 }, newBest = false;
try { best = JSON.parse(localStorage.getItem('voxelstrike-best')) ?? best; } catch {}
function saveBest() {
  if (mode !== 'zombies') return;
  newBest = wave > best.wave || (wave === best.wave && kills > best.kills);
  if (newBest) { best = { wave, kills }; try { localStorage.setItem('voxelstrike-best', JSON.stringify(best)); } catch {} onSave(); }
}
const booms = [];
function explode(z) {
  if (z.boomed) return;
  z.boomed = true; z.dead ||= .0001; z.g.visible = false;
  blast(z.g.position.clone().setY(z.g.position.y + 1), BLAST, (120 + wave * 25) * ZHP, z.dmg, z);
}
// explosion effect
function blastFx(p, R) {
  burst(p, 0xff8800, 30); burst(p, 0x333333, 14); sfx('boom', { at: p, far: 120 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: .9 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R });
}
function blast(p, R, zDmg, pDmg, skip, by = null, rocket = false, pj = 0) {
  blastFx(p, R);
  const pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
  if (net.on) { // online the server works out who got hurt
    const gun = rocket ? 'rocket' : 'flare', kind = rocket ? 4 : 6;
    if (pd < R && !dead && respawnT <= 0) {
      if (pDmg) net.claim(P, { kind, point: new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), gun, pj, by });
      if (rocket && !by) launch(P, new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), p, 1 - pd / R, true);
    }
    for (const o of zombies) {
      if (o === skip || o.dead || !o.pid) continue; // other players and room bots
      const c = o.g.position.clone().setY(o.g.position.y + o.scale), od = c.distanceTo(p);
      if (od < R) net.claim(o, { kind, point: c, gun, pj, by });
    }
    return;
  }
  if (pd < R && !dead && respawnT <= 0) {
    if (pDmg) hurtPlayer(Math.round(pDmg * (1 - pd / R * .6)), false, by);
    if (rocket && respawnT <= 0 && !dead && !(by && friendly(by, YOU_T))) launch(P, new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), p, 1 - pd / R, !by);
  }
  for (const o of zombies) {
    if (o === skip || o.dead || o.type === 'bot' && friendly(by, o)) continue;
    const c = o.g.position.clone().setY(o.g.position.y + o.scale), od = c.distanceTo(p);
    if (od >= R) continue;
    hurtZombie(o, o === by ? ROCKET_SELF * (1 - od / R * .6) : zDmg * (1 - od / R * .5), c, false, false, by);
    if (rocket && !o.dead) launch(o, c, p, 1 - od / R, o === by);
  }
}

// shop between waves
const SHOP = [
  { name: 'Medkit',  price: 15, heal: 50, desc: '+50 HP' },
  { name: 'Armor Plate', price: 40, armor: 25, desc: `+25 max armor, refills it (cap ${ARMOR_CAP})` },
  { name: 'Ammo',    price: 20, refill: true, desc: 'refill all spare ammo' },
  { name: 'Adrenaline', price: 60, perk: 'spd', desc: '+10% run speed, up to 3 times' },
  { name: 'Sharpshooter', price: 80, perk: 'dmg', desc: '+10% damage, up to 3 times' },
  { name: 'Vitality', price: 50, perk: 'hp', desc: '+25 max HP and heals it, up to 3 times' },
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
  { gun: 'trex', price: 250, desc: 'six big pellets and a dino bite' },
  { gun: 'starsmasher', price: 380, desc: 'stars out of the muzzle, 3x sight' },
  { gun: 'blazesaber', price: 320, desc: 'a blade of fire that burns them' },
  { gun: 'windsaber', price: 480, desc: 'run faster and jump higher' },
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
const ammoFull = () => WEAPONS.every((w, i) => !owned[i] || reserve[i] >= resMax(i));
let shopOpen = false, shopWave = 0, bonus = 0, armorBought = 0, waveReward = '';
// shop prices go up each time you buy
const rental = g => owned[g] && !hasGun(g); // rented this run, so it can be upgraded
const isUpg = it => it.gun !== undefined && rental(it.gun);
const maxed = it => (isUpg(it) && lvl[it.gun] >= 2) || (it.armor && P.maxArmor >= ARMOR_CAP) || (it.perk && perk[it.perk] >= PERK_MAX);
const priceOf = it => it.armor ? it.price + armorBought * 25 : it.perk ? Math.round(it.price * (1 + perk[it.perk] * .5)) : isUpg(it) ? Math.round(it.price * (lvl[it.gun] ? 1.25 : .75)) : it.gun !== undefined && hasGun(it.gun) ? Math.ceil(it.price * FETCH) : it.price;
function renderShop() {
  $('shopInfo').innerHTML = `Wave ${wave} cleared! +${bonus} bonus   ·   <span class="pc">${COIN}${coins}</span>   ·   ${ico('heart')} ${P.hp}/${P.max}` + (P.maxArmor ? `   ·   ${ico('shield')} ${P.armor}/${P.maxArmor}` : '') + (waveReward ? `\n${waveReward}` : '');
  // shop items for this visit
  const list = SHOP.map((it, i) => [it, i]).filter(([it, i]) => it.gun === undefined || isUpg(it) || shopOffer.includes(i) && !owned[it.gun]);
  $('items').innerHTML = list.map(([it, i]) => {
    const upg = isUpg(it), done = maxed(it);
    const off = done || (it.heal && P.hp >= P.max) || (it.refill && ammoFull()) || coins < priceOf(it);
    let label = it.name, desc = it.desc, cost = COIN + priceOf(it);
    if (it.gun !== undefined) {
      const mine = hasGun(it.gun); // yours from the armory: cheap
      label = `<small class="cat">${CATS[slotOf(it.gun)][1]}${mine ? ' · YOURS' : ' · RENT'}</small><br>${label}` + (mine && gunUse(it.gun) ? ` <span class="cat">${starRow(gunUse(it.gun), gunUse(it.gun), 3)}</span>` : '');
    }
    if (upg) {
      const g = it.gun, nx = statsAt(g, lvl[g] + 1);
      label = `<small class="cat">${CATS[slotOf(g)][1]}</small><br>${it.name} <span class="cat">${stars(g)}</span>`;
      desc = done ? 'fully upgraded' : (nx.dmg !== WEAPONS[g].dmg ? `dmg ${WEAPONS[g].dmg} ${ico('right')} ${nx.dmg} · ` : `rate ${+(1 / WEAPONS[g].rate).toFixed(1)} ${ico('right')} ${+(1 / nx.rate).toFixed(1)}/s · `) + `mag ${WEAPONS[g].mag} ${ico('right')} ${nx.mag} · faster reload`;
      cost = done ? 'MAXED' : 'UPGRADE ' + COIN + priceOf(it);
    }
    if (it.perk) { label = `${it.name} <span class="cat">${ico('star').repeat(perk[it.perk])}</span>`; if (done) cost = 'MAXED'; }
    if (it.armor && done) { desc = `armor maxed at ${ARMOR_CAP}`; cost = 'MAXED'; }
    return `<button data-i="${i}" class="${done ? 'own' : ''}" ${off ? 'disabled' : ''}>${label}<br><small>${desc}</small><br>${cost}</button>`;
  }).join('');
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
  if (it.refill) WEAPONS.forEach((w, g) => { if (owned[g]) reserve[g] = resMax(g); });
  sfx('buy'); renderShop();
}
function openShop() { shopOpen = true; shopOffer = pickOffers(); renderShop(); document.exitPointerLock(); }
$('items').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) buy(+b.dataset.i); });
$('next').addEventListener('click', () => {
  shopOpen = false; $('shop').style.display = 'none'; waveWait = 3;
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
  $('postBoard').innerHTML = row('WAVE REACHED', wave) + row('KILLS', kills) + row('BOSSES DOWN', bossKills) + row('BEST RUN', `wave ${best.wave} · ${best.kills} kills`);
  $('rewards').innerHTML = rewardRow([xpTile(runXp), coinTile(runCoins), boostTile()]) + `<div class="rl">LVL ${prof.lv} · ${xpText()}</div>${xpBar()}`
    + (wave > PAY_WAVES ? `<div class="rl">Past wave ${PAY_WAVES} a run pays no more</div>` : '');
  $('post').style.display = 'flex';
  sfx(newBest ? 'win' : 'lose');
  setTimeout(cgMidgame, 1500); // CrazyGames midgame ad
  document.exitPointerLock();
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
    const g = globs[i], p = g.m.position; g.life -= dt; g.v.y -= GLOB_G * dt;
    p.addScaledVector(g.v, dt); g.m.rotation.x += dt * 6; g.m.rotation.z += dt * 4;
    const hitYou = !dead && Math.abs(p.x - P.pos.x) < .55 && Math.abs(p.z - P.pos.z) < .55 && p.y > P.pos.y - .2 && p.y < P.pos.y + 1.9;
    if (hitYou) hurtPlayer(g.dmg);
    if (hitYou || g.life <= 0 || p.y < (MAP.floor?.(p.x, p.z) ?? 0) || blocked(p.x, p.z, .14, p.y - .14)) { burst(p.clone(), 0x9ad84a, hitYou ? 8 : 5); scene.remove(g.m); globs.splice(i, 1); }
  }
}
function clearGlobs() { for (const g of globs) scene.remove(g.m); globs.length = 0; }
function resetRun() { perk.spd = perk.dmg = perk.hp = 0; runCoins = runXp = bossKills = 0; deadT = 0; horde = false; countShown = 0; shopOffer = []; clearGlobs(); }
function banner(text, html = false) { const b = $('banner'); b[html ? 'innerHTML' : 'textContent'] = text; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1800); }
