const zombies = [];
let wave = 0, toSpawn = 0, spawnT = 0, waveWait = 1.5, kills = 0, coins = 0;
// gun damage is tuned for deathmatch, so zombie hp is scaled by ZHP to keep waves playing the same
const ZHP = .56;
// hp is a multiplier on the wave's base zombie hp; coins are per kill (headshots add 2 more)
const ZTYPES = {
  walker: { hp: 1,   speed: () => Math.min(1.8 + wave * .15, 4.5), scale: 1,    dmg: 10, atk: 1,   coins: 2, shirt: shirtTex },
  runner: { hp: .45, speed: () => Math.min(3.6 + wave * .12, 5.6), scale: .85,  dmg: 6,  atk: .6,  coins: 3, shirt: runShirtTex },
  brute:  { hp: 3.5, speed: () => Math.min(1.1 + wave * .04, 2),   scale: 1.45, dmg: 25, atk: 1.5, coins: 8, shirt: bruteShirtTex, tint: 0x9fb08f },
  // exploder dmg is the blast damage at point blank
  exploder: { hp: .6, speed: () => Math.min(2.6 + wave * .08, 4.2), scale: .95, dmg: 30, atk: 1, coins: 4, shirt: boomShirtTex, tint: 0xc8ff90, tank: true },
  boss:   { hp: 15,  speed: () => Math.min(2.4 + wave * .05, 3.6), scale: 2.3,  dmg: 30, atk: 1.6, coins: 40, shirt: bossShirtTex, tint: 0xff9a8a, crown: true },
};
const FUSE = .7, BLAST = 3.5; // exploder fuse time and blast radius
const WIND = .8, CHARGE_T = 1.6, CHARGE_SPD = 12; // boss wind-up time, max charge time, charge speed (you run at 6)
function pickType() { // runners from wave 3, brutes from 5, exploders from 7, all get more common later
  const r = Math.random(); let c = 0;
  if (wave >= 5 && r < (c += Math.min(.22, .1 + (wave - 5) * .02))) return 'brute';
  if (wave >= 7 && r < (c += Math.min(.18, .08 + (wave - 7) * .02))) return 'exploder';
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
  if (T.crown) { // gold crown, not hittable
    const gold = lam({ color: 0xffcc22, emissive: 0x553300 });
    const band = box(.56, .12, .56, gold); band.position.y = 1.91; g.add(band);
    for (const sx of [-.2, 0, .2]) { const sp = box(.1, .16, .1, gold); sp.position.set(sx, 2.05, .23); g.add(sp); }
  }
  const hp = (60 + wave * 18) * T.hp * ZHP;
  const zz = { g, parts, mats, tankMat, pivL, pivR,
    type, hp, maxHp: hp, speed: T.speed(), dmg: Math.round(T.dmg * (1 + wave * .05)), atkRate: T.atk, coins: T.coins, scale: T.scale,
    r: .3 * T.scale, reach: Math.max(1.1, 1.1 * T.scale), t: Math.random() * 6, atk: 0, flash: 0, dead: 0,
    fuse: 0, beepT: 0, chargeT: 2 + Math.random() * 2, charging: 0, wind: 0, stun: 0, glow: 0, cdx: 0, cdz: 0, hitP: false };
  zz.parts.forEach(p => p.userData.zombie = zz);
  addOutline(zz);
  zombies.push(zz);
}
function spawnZombie(type = pickType()) {
  const r0 = .3 * ZTYPES[type].scale;
  for (let tries = 0; tries < 80; tries++) {
    let x, z;
    if (MAP.water) { x = (Math.random() * 2 - 1) * (A - 2); z = (Math.random() * 2 - 1) * (A - 2); } // the edges are sea: anywhere on dry land
    else { const side = Math.random() * 4 | 0, r = (Math.random() * 2 - 1) * (A - 2), e = A - 1.5; x = side === 0 ? -e : side === 1 ? e : r; z = side === 2 ? -e : side === 3 ? e : r; }
    if (!blocked(x, z, r0, 0) && !overWater(x, z, 0) && !poolAt(x, z) && Math.hypot(x - P.pos.x, z - P.pos.z) > (MAP.water ? 14 : 10)) return makeZombie(x, z, type);
  }
}
// quiet = burn damage: small orange sparks, no red flash or hit marker
// by = the deathmatch bot doing the damage, or null if it's you
function hurtZombie(zz, dmg, point, head, quiet = false, by = null) {
  if (!Number.isFinite(dmg)) return; // a bad number here would leave it with NaN health, and then nothing could ever kill it
  if (zz.type === 'bot' && friendly(by, zz)) return; // team modes: no friendly fire
  if (zz.type === 'bot' && !quiet) [dmg, head] = gearHit(zz.rec.fx, dmg, head); // its hat: a helmet can stop a headshot, a hood can halve the hit
  // boots that add damage (yours, or the bot's that hit it). Health isn't rounded, so even a few % on a small hit counts
  dmg *= 1 + (by ? by.rec?.fx.dmg ?? 0 : youFx().dmg);
  if (zz.type === 'bot') { // bots wear armor like yours: the cut first (armor and boots add up), then the armor bar soaks what's left
    dmg *= 1 - zz.dr - zz.rec.fx.dr;
    const soak = Math.min(zz.armor, dmg); zz.armor -= soak; zz.hp -= dmg - soak;
  } else zz.hp -= dmg;
  const dies = zz.hp <= 0 && !zz.dead;
  if (dies) zz.dead = .0001; // marked dead before the effects below, so a problem in a sound or particle can't leave it unkillable
  if (zz.type === 'bot' && by !== zz) { // remember who's hurting it and how much they've done in the last 2s (not its own rocket)
    const who = by ?? YOU_T;
    if (zz.hitBy !== who || zz.hitByT <= 0) zz.hitDmg = 0;
    zz.hitBy = who; zz.hitByT = 2; zz.hitDmg += dmg;
    (zz.helpers ??= new Set()).add(by ? by.rec : youRec); // everyone who hurt it this life, for assists (a new bot body each life)
  }
  const big = zz.type === 'brute' || zz.type === 'boss';
  if (quiet) burst(point, 0xff7a1a, 2);
  else {
    zz.flash = .1; burst(point, zz.type === 'bot' ? 0xb01818 : 0x3a8a2a, head ? 8 : 4);
    // the hit sound comes from whoever got hit (zombies sound lower), so it's quiet when they're far away
    hurtSfx(zz, head ? 'hurtHead' : 'hurt', zz.g.position, { rate: zz.type === 'bot' ? 1 : big ? .6 : .78 });
  }
  // your hit marker: red if it died (burns too), else gold for a headshot, white for the body. Burn ticks alone don't show one
  if (!by && (!quiet || dies)) hitMarker(dies ? 'kill' : head ? 'head' : 'body');
  if (dies) {
    if (!by) { kills++; coins += zz.coins + (head ? 2 : 0); }
    if (zz.type === 'bot') botDown(zz, by, head);
    else {
      if (!by && zz.type === 'boss') sfx('killSpecial'); // regular zombies die too often for a kill sound; their death groan is enough
      if (zz.type === 'exploder') explode(zz); // shooting one still sets it off, so keep your distance
      else if (zz.type === 'boss') { sfx('bossRoar', { at: zz.g.position, far: 80, rate: .75 }); banner(`BOSS DOWN!\n+${zz.coins} ${COIN}`, true); }
      else sfx('zDie', { at: zz.g.position, far: 35, rate: big ? .7 : 1 });
    }
  }
}
// pierce = damage that skips armor and hits HP directly. by = the deathmatch bot that shot you. head = it was a headshot
function hurtPlayer(d, pierce = false, by = null, head = false) {
  if (respawnT > 0 || matchOver || by && friendly(by, YOU_T)) return; // by = null is your own rocket, that still hurts
  if (by?.rec) d *= 1 + by.rec.fx.dmg; // a bot in damage boots
  if (by?.rec) youHelpers.add(by.rec); // for assists, cleared when you respawn
  const wasHead = head; [d, head] = gearHit(youFx(), d, head); // your hat: Warrior Helmet can stop a headshot, Raider Hood can halve the hit
  d *= 1 - P.dr - youFx().dr; // worn armor from Amethyst up and Warrior Boots cut every hit, added together (health can go fractional, the HUD rounds it up)
  const soak = pierce ? 0 : Math.min(P.armor, d);
  P.armor -= soak; P.hp -= d - soak;
  hurtSfx(P, soak === d || wasHead && !head ? 'armorHit' : head ? 'hurtHead' : 'hurt'); // a headshot your helmet stopped clanks
  if (P.hp <= 0) sfx('die');
  $('hit').style.background = soak === d ? '#c9ced6' : 'red'; // silver flash = armor took all of it
  $('hit').style.opacity = .4; setTimeout(() => $('hit').style.opacity = 0, 80);
  if (P.hp <= 0 && pvp()) { P.hp = 0; youDown(by); return; }
  if (P.hp <= 0 && !dead) { P.hp = 0; dead = true; saveBest(); document.exitPointerLock(); }
}
// fell into deep water: a splash, then you're out, whatever your HP and armor
function splash(at) { burst(at.clone().setY(Math.max(at.y + .5, .3)), 0xd8f2fa, 14); } // at the surface, you've already gone under
function drownYou() {
  if (respawnT > 0 || matchOver || dead) return;
  sfx('splash'); splash(P.pos);
  P.hp = 0; P.armor = 0; P.vy = 0; P.kx = P.kz = P.lx = P.lz = 0; P.drowned = true;
  if (pvp()) { youDown(null); return; }
  dead = true; saveBest(); document.exitPointerLock();
}
// after you drown you keep sinking to the bottom, and the screen goes blue once your eyes are under.
// The same blue when you're alive with your eyes under the pool's surface. Called every frame
let underTint = null;
function drownTick(dt) {
  if (!underTint) { underTint = document.createElement('div'); underTint.style.cssText = 'position:fixed;inset:0;background:#1a6c9c;opacity:.5;pointer-events:none;display:none'; $('hit').before(underTint); }
  const show = !!P.drowned && !inLobby;
  if (show) {
    P.pos.y = Math.max(MAP.floor?.(P.pos.x, P.pos.z) ?? 0, P.pos.y - 1.8 * dt);
    camera.position.y = P.pos.y + .35;
  }
  const under = show && inWater(P.pos.x, P.pos.z, camera.position.y - .5) || !inLobby && MAP.wet?.(camera.position.x, camera.position.z, camera.position.y);
  underTint.style.display = under ? 'block' : 'none';
}
// a bot or zombie in the water. A zombie counts as your kill (you lured it in). A bot's death goes to nobody
function drownZombie(z) {
  if (z.dead) return;
  sfx('splash', { at: z.g.position, far: 40 }); splash(z.g.position); z.drowned = true;
  if (z.type === 'bot') { z.hp = 0; z.dead = .0001; botDown(z, null, false, true); return; }
  if (z.type === 'exploder') z.boomed = true; // the water puts its fuse out
  hurtZombie(z, z.hp + 1, z.g.position.clone(), false, true);
}
// high score: best wave reached, ties go to more kills. Saved in the browser like your keybinds.
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
// an explosion at p: hurts you and every zombie within radius R, less the further away (exploders and rockets both use this)
// by = the deathmatch bot whose rocket it was: it gets the kills, and takes no more than ROCKET_SELF itself, like you do from yours.
// rocket = it was a rocket, so it also throws everyone in it (rocket jumping, see launch in combat.js). Exploders don't
function blast(p, R, zDmg, pDmg, skip, by = null, rocket = false) {
  burst(p, 0xff8800, 30); burst(p, 0x333333, 14); sfx('boom', { at: p, far: 120 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: .9 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R });
  const pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
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

const SHOP = [
  { gun: 'shotgun', price: 40, desc: '9 pellets, close range' },
  { gun: 'ar', price: 90, desc: 'full auto, 30 mag' },
  { gun: 'eradicator', price: 280, desc: '120 round bullet hose' },
  { gun: 'sniper', price: 140, desc: `${BASE[gi('sniper')].dmg} dmg, aim to scope` },
  { gun: 'flame', price: 200, desc: 'burns everything in front of you' },
  { gun: 'flare', price: 120, desc: 'one fiery shot that sets them on fire' },
  { gun: 'rocket', price: 450, desc: 'big splash damage, shoot the ground to rocket jump' },
  { name: 'Medkit',  price: 15, heal: 50, desc: '+50 HP' },
  { name: 'Armor',   price: 40, armor: 25, desc: `+25 max armor, refills it (cap ${ARMOR_CAP})` },
  { name: 'Ammo',    price: 20, refill: true, desc: 'refill all spare ammo' },
].map(it => it.gun ? { ...it, gun: gi(it.gun), name: BASE[gi(it.gun)].name } : it);
const ammoFull = () => WEAPONS.every((w, i) => !owned[i] || reserve[i] >= resMax(i));
let shopOpen = false, shopWave = 0, bonus = 0, armorBought = 0, waveReward = '';
// each armor costs 25 more than the last; upgrades cost 75% of the gun's price for ★★ and 125% for ★★★
const isUpg = it => it.gun !== undefined && owned[it.gun];
const maxed = it => (isUpg(it) && lvl[it.gun] >= 2) || (it.armor && P.maxArmor >= ARMOR_CAP);
const priceOf = it => it.armor ? it.price + armorBought * 25 : isUpg(it) ? Math.round(it.price * (lvl[it.gun] ? 1.25 : .75)) : it.price;
function renderShop() {
  $('shopInfo').innerHTML = `Wave ${wave} cleared! +${bonus} bonus   ·   <span class="pc">${COIN}${coins}</span>   ·   ${ico('heart')} ${P.hp}/${P.max}` + (P.maxArmor ? `   ·   ${ico('shield')} ${P.armor}/${P.maxArmor}` : '') + (waveReward ? `\n${waveReward}` : '');
  $('items').innerHTML = SHOP.map((it, i) => {
    const upg = isUpg(it), done = maxed(it);
    const off = done || (it.heal && P.hp >= P.max) || (it.refill && ammoFull()) || coins < priceOf(it);
    let label = it.name, desc = it.desc, cost = COIN + priceOf(it);
    if (it.gun !== undefined) label = `<small class="cat">${CATS[slotOf(it.gun)][1]}</small><br>${label}`;
    if (upg) {
      const g = it.gun, b = BASE[g], L = lvl[g] + 1;
      label = `<small class="cat">${CATS[slotOf(g)][1]}</small><br>${it.name} <span class="cat">${stars(g)}</span>`;
      desc = done ? 'fully upgraded' : `dmg ${WEAPONS[g].dmg} ${ico('right')} ${Math.round(b.dmg * (1 + .25 * L))} · mag ${WEAPONS[g].mag} ${ico('right')} ${magAt(b, L)} · faster reload`;
      cost = done ? 'MAXED' : 'UPGRADE ' + COIN + priceOf(it);
    }
    if (it.armor && done) { desc = `armor maxed at ${ARMOR_CAP}`; cost = 'MAXED'; }
    return `<button data-i="${i}" class="${done ? 'own' : ''}" ${off ? 'disabled' : ''}>${label}<br><small>${desc}</small><br>${cost}</button>`;
  }).join('');
}
function buy(i) {
  const it = SHOP[i], price = priceOf(it); if (coins < price || maxed(it)) return;
  coins -= price;
  if (isUpg(it)) { // star upgrade: also refills the mag to the new size
    const g = it.gun; lvl[g]++; applyLvl(g); ammo[g] = WEAPONS[g].mag;
    if (g === cur) { cancelReload(); buildGun(); renderHotbar(); } else equip(g);
    sfx('upgrade');
  }
  else if (it.gun !== undefined) { owned[it.gun] = true; reserve[it.gun] = resMax(it.gun); equip(it.gun); }
  if (it.heal) P.hp = Math.min(P.max, P.hp + it.heal);
  if (it.armor) { P.maxArmor = Math.min(ARMOR_CAP, P.maxArmor + it.armor); P.armor = P.maxArmor; armorBought++; }
  if (it.refill) WEAPONS.forEach((w, g) => { if (owned[g]) reserve[g] = resMax(g); });
  sfx('buy'); renderShop();
}
function openShop() { shopOpen = true; renderShop(); document.exitPointerLock(); }
$('items').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) buy(+b.dataset.i); });
$('next').addEventListener('click', () => {
  shopOpen = false; $('shop').style.display = 'none'; waveWait = 1;
  rerollPads(); // so pickups match what you own now (e.g. ammo once you have a 2nd gun, armor once you've bought some)
  lockMouse();
});
function banner(text, html = false) { const b = $('banner'); b[html ? 'innerHTML' : 'textContent'] = text; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1800); }
