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
  zombies.push(zz);
}
function spawnZombie(type = pickType()) {
  const r0 = .3 * ZTYPES[type].scale;
  for (let tries = 0; tries < 40; tries++) {
    const side = Math.random() * 4 | 0, r = (Math.random() * 2 - 1) * (A - 2), e = A - 1.5;
    const x = side === 0 ? -e : side === 1 ? e : r, z = side === 2 ? -e : side === 3 ? e : r;
    if (!blocked(x, z, r0, 0) && Math.hypot(x - P.pos.x, z - P.pos.z) > 10) return makeZombie(x, z, type);
  }
}
// quiet = burn damage: small orange sparks, no red flash or hit marker
// by = the deathmatch bot doing the damage, or null if it's you
function hurtZombie(zz, dmg, point, head, quiet = false, by = null) {
  zz.hp -= dmg;
  if (zz.type === 'bot') { zz.hitBy = by ?? YOU_T; zz.hitByT = 2; }
  if (quiet) burst(point, 0xff7a1a, 2);
  else { zz.flash = .1; burst(point, zz.type === 'bot' ? 0xb01818 : 0x3a8a2a, head ? 8 : 4); if (!by) setCross('#f44'); }
  if (zz.hp <= 0 && !zz.dead) {
    zz.dead = .0001;
    if (!by) { kills++; coins += zz.coins + (head ? 2 : 0); }
    if (zz.type === 'bot') botDown(zz, by, head);
    else if (zz.type === 'exploder') explode(zz); // shooting one still sets it off, so keep your distance
    else if (zz.type === 'boss') { beep(60, .9, 'sawtooth', .2); banner(`BOSS DOWN!\n+${zz.coins} ◆`); }
    else beep(zz.type === 'brute' ? 110 : 180, .3, 'sawtooth', .12);
  }
}
// pierce = damage that skips armor and hits HP directly. by = the deathmatch bot that shot you
function hurtPlayer(d, pierce = false, by = null) {
  if (respawnT > 0 || matchOver) return;
  const soak = pierce ? 0 : Math.min(P.armor, d);
  P.armor -= soak; P.hp -= d - soak;
  $('hit').style.background = soak === d ? '#c9ced6' : 'red'; // silver flash = armor took all of it
  $('hit').style.opacity = .4; setTimeout(() => $('hit').style.opacity = 0, 80);
  if (P.hp <= 0 && mode === 'dm') { P.hp = 0; youDown(by); return; }
  if (P.hp <= 0 && !dead) { P.hp = 0; dead = true; saveBest(); document.exitPointerLock(); }
}
// high score: best wave reached, ties go to more kills. Saved in the browser like your keybinds.
let best = { wave: 0, kills: 0 }, newBest = false;
try { best = JSON.parse(localStorage.getItem('voxelstrike-best')) ?? best; } catch {}
function saveBest() {
  if (mode !== 'zombies') return;
  newBest = wave > best.wave || (wave === best.wave && kills > best.kills);
  if (newBest) { best = { wave, kills }; try { localStorage.setItem('voxelstrike-best', JSON.stringify(best)); } catch {} }
  showBest();
}
const showBest = () => $('lobbyBest').textContent =best.wave ? `BEST: wave ${best.wave} · ${best.kills} kills` : '';
showBest();
const booms = [];
function explode(z) {
  if (z.boomed) return;
  z.boomed = true; z.dead ||= .0001; z.g.visible = false;
  blast(z.g.position.clone().setY(1), BLAST, (120 + wave * 25) * ZHP, z.dmg, z);
}
// an explosion at p: hurts you and every zombie within radius R, less the further away (exploders and rockets both use this)
function blast(p, R, zDmg, pDmg, skip) {
  burst(p, 0xff8800, 30); burst(p, 0x333333, 14); shotSound(.7, .6, 500);
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: .9 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R });
  const pd = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
  if (pd < R && !dead && pDmg) hurtPlayer(Math.round(pDmg * (1 - pd / R * .6)));
  for (const o of zombies) {
    if (o === skip || o.dead) continue;
    const c = o.g.position.clone().setY(o.scale), od = c.distanceTo(p);
    if (od < R) hurtZombie(o, zDmg * (1 - od / R * .5), c, false);
  }
}

const SHOP = [
  { gun: 'shotgun', price: 40, desc: '9 pellets, close range' },
  { gun: 'ar', price: 90, desc: 'full auto, 30 mag' },
  { gun: 'eradicator', price: 280, desc: '120 round bullet hose' },
  { gun: 'sniper', price: 140, desc: `${BASE[gi('sniper')].dmg} dmg, aim to scope` },
  { gun: 'flame', price: 200, desc: 'burns everything in front of you' },
  { gun: 'flare', price: 120, desc: 'one fiery shot that sets them on fire' },
  { gun: 'rocket', price: 450, desc: 'big splash damage, don\'t fire point blank' },
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
  $('shopInfo').textContent = `Wave ${wave} cleared! +${bonus} bonus   ·   ◆ ${coins}   ·   ♥ ${P.hp}/${P.max}` + (P.maxArmor ? `   ·   ⛨ ${P.armor}/${P.maxArmor}` : '') + (waveReward ? `\n${waveReward}` : '');
  $('items').innerHTML = SHOP.map((it, i) => {
    const upg = isUpg(it), done = maxed(it);
    const off = done || (it.heal && P.hp >= P.max) || (it.refill && ammoFull()) || coins < priceOf(it);
    let label = it.name, desc = it.desc, cost = '◆ ' + priceOf(it);
    if (it.gun !== undefined) label = `<small style="color:#ffd23f">${CATS[slotOf(it.gun)][1]}</small><br>${label}`;
    if (upg) {
      const g = it.gun, b = BASE[g], L = lvl[g] + 1;
      label = `<small style="color:#ffd23f">${CATS[slotOf(g)][1]}</small><br>${it.name} <span style="color:#ffd23f">${stars(g)}</span>`;
      desc = done ? 'fully upgraded' : `dmg ${WEAPONS[g].dmg}→${Math.round(b.dmg * (1 + .25 * L))} · mag ${WEAPONS[g].mag}→${Math.round(b.mag * (1 + .25 * L))} · faster reload`;
      cost = done ? 'MAXED' : 'UPGRADE ◆ ' + priceOf(it);
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
    if (g === cur) { reloading = 0; buildGun(); renderHotbar(); } else equip(g);
    beep(1200, .2, 'triangle', .12);
  }
  else if (it.gun !== undefined) { owned[it.gun] = true; reserve[it.gun] = resMax(it.gun); equip(it.gun); }
  if (it.heal) P.hp = Math.min(P.max, P.hp + it.heal);
  if (it.armor) { P.maxArmor = Math.min(ARMOR_CAP, P.maxArmor + it.armor); P.armor = P.maxArmor; armorBought++; }
  if (it.refill) WEAPONS.forEach((w, g) => { if (owned[g]) reserve[g] = resMax(g); });
  beep(900, .12, 'triangle', .12); renderShop();
}
function openShop() { shopOpen = true; renderShop(); document.exitPointerLock(); }
$('items').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) buy(+b.dataset.i); });
$('next').addEventListener('click', () => {
  shopOpen = false; $('shop').style.display = 'none'; waveWait = 1;
  rerollPads(); // so pickups match what you own now (e.g. ammo once you have a 2nd gun, armor once you've bought some)
  lockMouse();
});
function banner(text) { const b = $('banner'); b.textContent = text; b.style.opacity = 1; setTimeout(() => b.style.opacity = 0, 1800); }
let crossT = 0; function setCross(c) { $('cross').style.setProperty('--c', c); crossT = .08; }
