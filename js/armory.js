// Star upgrades cost a share of the gun's own price: UPG[0] for ★★, UPG[1] for ★★★ (so less than buying the gun again).
const UPG = [.75, .9];
let armCat = 'primary', armOpen = false, armSel = -1, armDet = false; // armSel = the gun card you clicked, armDet = showing its details
const gunStars = i => prof.guns[BASE[i].id] ?? 0; // 0 = not bought yet (starters are always 0: no stars)
const upgPrice = i => Math.round(BASE[i].price * UPG[gunStars(i) - 1]);
const inMatch = () => !inLobby && pvp() && !matchOver;

function gunStats(i) {
  const w = BASE[i], L = Math.max(0, gunStars(i) - 1), dmg = Math.round(w.dmg * (1 + .25 * L)), mag = magAt(w, L);
  const mob = w.mob && w.mob !== 1 ? ` · SPEED ${w.mob > 1 ? '+' : ''}${Math.round((w.mob - 1) * 100)}%` : '';
  if (w.melee) return `DMG ${dmg} · MELEE${mob}`;
  const L2 = Math.max(0, gunStars(i) - 1), rl = +(w.reload * (1 - .15 * L2)).toFixed(1);
  if (w.mag === 1) return `DMG ${dmg} · RELOAD ${rl}s${mob}`; // one shot per reload, so fire rate doesn't mean much
  const rate = (1 / w.rate).toFixed(w.rate < .2 ? 0 : 1) + '/s';
  return `DMG ${w.pellets > 1 ? dmg + '×' + w.pellets : dmg} · ${rate} · ${w.flame ? 'FUEL' : 'MAG'} ${mag}${mob}`;
}
const DESC = {
  voxel: 'Your starting pistol. Semi-automatic with no spread at all, so every shot lands exactly where you aim. A dependable backup for when your primary runs dry.',
  shotgun: 'Fires 9 pellets in a wide spread with every pump. Devastating up close and weak at range, so get in close before you pull the trigger.',
  ar: 'Fully automatic with a 30-round magazine and only a little spread. It handles every range well, and aiming tightens the spread even more.',
  sniper: 'A bolt-action rifle that hits for 80 with no spread, scoped or not. Aim to look through the scope and pick people off from across the map.',
  eradicator: 'A minigun with a 120-round belt that shreds anything in front of it. Its spread is small, but reloading the belt takes a long time.',
  knife: 'Always with you and never runs out. You run 20% faster while holding it, so it\'s the quickest way to get around the map.',
  flame: 'Sprays a short cone of fire that hits everything in front of you and sets it burning. Its fuel tank refills when you reload.',
  rocket: 'Fires a rocket that explodes on impact and hurts everyone in the blast. The blast also throws you, so you can rocket jump with it.',
  flare: 'Fires a burning flare that sets whoever it hits on fire, with a small splash around the hit. It holds one flare, so make it count.',
};
// every stat for the details view, at the gun's current stars
function gunSpecs(i) {
  const w = BASE[i], L = Math.max(0, gunStars(i) - 1), out = [];
  const dmg = Math.round(w.dmg * (1 + .25 * L)), mag = magAt(w, L), rl = +(w.reload * (1 - .15 * L)).toFixed(1);
  out.push(['DAMAGE', w.pellets > 1 ? `${dmg} × ${w.pellets} PELLETS` : dmg]);
  if (w.mag !== 1) out.push([w.melee ? 'SWINGS' : 'FIRE RATE', (1 / w.rate).toFixed(w.rate < .2 ? 0 : 1) + ' / SEC']); // one-shot guns fire once per reload
  if (!w.melee) out.push([w.flame ? 'FUEL' : 'MAGAZINE', mag], ['RELOAD', rl + 's']);
  if (!w.melee && !w.flame) out.push(['SPREAD', !w.spread ? 'NONE' : w.spread < .02 ? 'LOW' : 'WIDE']);
  if (w.range) out.push(['RANGE', w.range + ' BLOCKS']);
  if (w.rocket) out.push(['BLAST RADIUS', ROCKET_R + ' BLOCKS']);
  if (w.flare) out.push(['BURN', `${w.burn * 4} / SEC FOR ${w.burnT}s`], ['SPLASH RADIUS', FLARE_R + ' BLOCKS']);
  if (w.mob && w.mob !== 1) out.push(['RUN SPEED', `${w.mob > 1 ? '+' : ''}${Math.round((w.mob - 1) * 100)}%`]);
  if (!w.start) out.push(['UNLOCKS AT', 'LVL ' + (w.unlock ?? 0)], ['PRICE', COIN + w.price]);
  return out;
}
const catList = () => BASE.map((w, i) => i).filter(i => BASE[i].cat === armCat).sort((a, b) => (BASE[a].unlock ?? 0) - (BASE[b].unlock ?? 0));
const isLocked = i => !hasGun(i) && prof.lv < (BASE[i].unlock ?? 0);
const starTxt = i => BASE[i].start ? '' : '★'.repeat(gunStars(i)) + '☆'.repeat(3 - gunStars(i));
// the armory's pages run down the left (the y axis). Each page has its own row of sections along the top (the x axis):
// WEAPONS has the gun categories, WEAR has ARMOR (more things to wear can go in WEAR_CATS later)
const PAGES = [['weapons', 'WEAPONS'], ['wear', 'WEAR']];
const WEAR_CATS = [['armor', 'ARMOR']];
// armorPrev = the star you're looking at in the armor details (your character wears it), armorCard = the Basic Armor card is picked
let armPage = 'weapons', wearCat = 'armor', armorPrev = 0, armorCard = false;
const myArmor = () => prof.armor | 0;
const pageIcon = p => p === 'weapons' ? SPRITES[loadoutGun('primary')] : armorSprite(Math.max(0, myArmor() - 1));
function renderArmory() {
  $('armInfo').innerHTML = `LVL ${prof.lv}<span class="pc">${COIN}${prof.coins}</span>`;
  $('armPages').innerHTML = PAGES.map(([p, label]) =>
    `<button data-pg="${p}" class="${p === armPage ? 'sel' : ''}${p === 'wear' && !myArmor() ? ' dim' : ''}"><img${p === 'wear' ? ' class="ai"' : ''} src="${pageIcon(p)}"><span>${label}</span></button>`).join('');
  if (armPage === 'wear') { renderWear(); return; }
  heroArmor(myArmor());
  $('armTabs').innerHTML = CATS.map(([c, label], s) =>
    `<button data-c="${c}" class="${c === armCat ? 'sel' : ''}"><img src="${SPRITES[loadoutGun(c)]}"><span>${label}</span></button>`).join('');
  const eq = loadoutGun(armCat);
  if (BASE[armSel]?.cat !== armCat) armSel = eq; // a new category starts on the gun you have equipped in it
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (armDet) renderDetail();
  else $('armList').innerHTML = catList().map(i => {
    const w = BASE[i], tag = isLocked(i) ? `🔒 LVL ${w.unlock}` : !hasGun(i) ? COIN + w.price : i === eq ? 'EQUIPPED' : '';
    return `<div class="card${isLocked(i) ? ' locked' : ''}${i === armSel ? ' sel' : ''}${i === eq ? ' on' : ''}" data-i="${i}">` +
      (tag ? `<span class="tag">${tag}</span>` : '') + `<img src="${SPRITES[i]}">` +
      `<div class="cn">${w.name} <span class="st">${starTxt(i)}</span></div><small>${gunStats(i)}</small></div>`;
  }).join('');
  renderAct();
  if (inLobby) heroGun(armSel);
}
// the buttons for the picked gun, under your character (in a match, under where he'd stand)
function renderAct() {
  if (armPage === 'wear') { renderArmorAct(); return; }
  const i = armSel, w = BASE[i], st = gunStars(i), eq = loadoutGun(armCat);
  let btns;
  if (isLocked(i)) btns = `<button disabled>🔒 UNLOCKS AT LVL ${w.unlock}</button>`;
  else if (!hasGun(i)) btns = `<button data-buy="${i}" ${prof.coins < w.price ? 'disabled' : ''}>BUY ${COIN}${w.price}</button>`;
  else {
    btns = i === eq ? '<button class="eq" disabled>EQUIPPED</button>' : `<button data-eq="${i}">EQUIP</button>`;
    if (!w.start && st < 3) btns += `<button data-up="${i}" ${prof.coins < upgPrice(i) ? 'disabled' : ''}>${'★'.repeat(st + 1)} ${COIN}${upgPrice(i)}</button>`;
  }
  $('armAct').innerHTML = `<div class="an">${w.name} <span class="st">${starTxt(i)}</span></div><div class="ab">${btns}</div>`;
  placeAct();
}
function placeAct() {
  const a = $('armAct'); if (!armOpen) return;
  const W = innerWidth, edge = W > 700 ? $('armory').getBoundingClientRect().right - 40 : 0;
  a.style.left = (inLobby ? heroScreen.x : (edge + W) / 2) + 'px';
  a.style.bottom = inLobby ? '' : '24%'; // in a match, clear of the hotbar
}
function renderDetail() {
  const i = armSel, w = BASE[i];
  $('armDet').innerHTML = `<button id="detBack">◀ BACK</button><div id="detView"></div>` +
    `<div class="dn">${w.name} <span class="st">${starTxt(i)}</span></div><p>${DESC[w.id] ?? ''}</p>` +
    `<div class="ds">${gunSpecs(i).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow(i + ':' + gunStars(i), g => makeGun(i, g, Math.max(0, gunStars(i) - 1), false), -Math.PI / 2); // starts side-on, muzzle to the right
}

// ---- WEAR page. ARMOR has one card, Basic Armor. Click it to pick it, click it again for its details: the chestplate spins there,
// and the arrows in the bottom corners step through its stars (your character wears whichever one you're looking at).
// The button under him buys the next star
const ARMOR_DESC = 'Worn in bot matches. Your armor bar fills every time you spawn and takes hits before your health. ' +
  'Every star turns it into a bigger, tougher chestplate, and from Amethyst on, each one also cuts the damage you take by 4% more. Bots wear the same armor you do.';
const armorStat = T => `+${T.hp} ARMOR` + (T.dr ? ` · −${Math.round(T.dr * 100)}% DAMAGE` : '');
function renderWear() {
  const n = myArmor(), T = armorOf(n || 1);
  $('armTabs').innerHTML = WEAR_CATS.map(([c, label]) =>
    `<button data-wc="${c}" class="${c === wearCat ? 'sel' : ''}"><img class="ai" src="${armorSprite(Math.max(0, n - 1))}"><span>${label}</span></button>`).join('');
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (armDet) renderArmorDetail();
  else {
    const locked = !n && prof.lv < T.unlock, tag = n ? 'WEARING' : locked ? `🔒 LVL ${T.unlock}` : COIN + T.price;
    $('armList').innerHTML = `<p class="wd">${ARMOR_DESC}</p>` +
      `<div class="card${locked ? ' locked' : ''}${armorCard ? ' sel' : ''}${n ? ' on' : ''}" data-armor="1"><span class="tag">${tag}</span>` +
      `<img class="ai" src="${armorSprite((n || 1) - 1)}"><div class="cn">${ARMOR_ITEM} <span class="st">${n ? armorStars(n) : ''}</span></div>` +
      `<small>${n ? T.name.toUpperCase() + ' · ' : ''}${armorStat(T)}</small></div>`;
  }
  heroArmor(armDet ? armorPrev : n || 1);
  renderAct();
  if (inLobby) heroGun(-1); // he puts the gun away and stands facing you, so you see the armor
}
function renderArmorDetail() {
  const s = armorPrev, T = armorOf(s), n = myArmor();
  const state = s === n ? 'WEARING' : s < n ? 'OWNED' : prof.lv < T.unlock ? '🔒 LOCKED' : 'NOT OWNED';
  const desc = `Star ${s} of ${ARMOR_ITEM}. You spawn with a ${T.hp} armor bar that takes hits before your health` +
    (T.dr ? `, and every hit you take is cut by ${Math.round(T.dr * 100)}%.` : '.');
  $('armDet').innerHTML = `<button id="detBack">◀ BACK</button>` +
    `<div id="detView"><button class="arw l" data-av="-1" ${s <= 1 ? 'disabled' : ''}>◀</button><button class="arw r" data-av="1" ${s >= ARMOR_MAX ? 'disabled' : ''}>▶</button></div>` +
    `<div class="dn">${T.name} <span class="st">${armorStars(s)}</span></div><p>${desc}</p><div class="ds">` +
    [['ARMOR BAR', '+' + T.hp], ['DAMAGE CUT', T.dr ? Math.round(T.dr * 100) + '%' : 'NONE'], ['UNLOCKS AT', 'LVL ' + T.unlock],
      ['PRICE', COIN + T.price], ['STATUS', state]].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('') + '</div>';
  pvShow('armor' + s, g => armorModel(s, g), .5); // turned a little, so you see its front and a side
}
function armorStep(d) {
  const s = Math.max(1, Math.min(ARMOR_MAX, armorPrev + d)); if (s === armorPrev) return;
  armorPrev = s; sfx('ui'); renderArmory();
}
function renderArmorAct() {
  const n = myArmor(), next = armorOf(n + 1);
  let btns;
  if (!next) btns = '<button class="eq" disabled>MAXED</button>';
  else if (prof.lv < next.unlock) btns = `<button disabled>🔒 ${n ? next.name.toUpperCase() + ' ' : ''}AT LVL ${next.unlock}</button>`;
  else btns = `<button data-arm="1" ${prof.coins < next.price ? 'disabled' : ''}>${n ? '★'.repeat(n + 1) + ' ' + next.name.toUpperCase() : 'BUY'} ${COIN}${next.price}</button>`;
  $('armAct').innerHTML = `<div class="an">${ARMOR_ITEM} <span class="st">${n ? armorStars(n) : ''}</span></div><div class="ab">${btns}</div>`;
  placeAct();
}
// bought or upgraded armor during a match: it's on right away, and the new part of the bar comes filled
function armorSync() {
  if (!inMatch()) return;
  const T = armorOf(myArmor()), gain = T.hp - P.maxArmor;
  P.maxArmor = T.hp; P.dr = T.dr; P.armor = Math.min(P.maxArmor, P.armor + Math.max(0, gain));
}

// ---- the spinning model in the details view (a gun, or a chestplate): its own little renderer, so it isn't blurred behind the panel.
// key = what's showing (it's only rebuilt when that changes), build(g) adds the model to g, face = the turn it starts at
let pv = null;
function pvShow(key, build, face) {
  if (!pv) {
    const cv = document.createElement('canvas'); cv.id = 'detCv';
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 2, .01, 50), spin = new THREE.Group();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x3a4a40, 1.5), spin);
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 3, 4); sc.add(key);
    pv = { cv, r, sc, cam, spin, key: '', on: false, t: 0 };
  }
  $('detView').append(pv.cv);
  if (pv.key !== key) {
    pv.key = key;
    pv.spin.clear(); // gun and armor geometry is shared, nothing to free
    const g = new THREE.Group(); build(g);
    const box = new THREE.Box3().setFromObject(g), sph = box.getBoundingSphere(new THREE.Sphere());
    g.position.sub(sph.center); pv.spin.add(g);
    pv.rad = sph.radius; pv.halfH = (box.max.y - box.min.y) / 2; pvFit();
    pv.spin.rotation.y = face;
  }
  if (!pv.on) { pv.on = true; pv.t = performance.now(); requestAnimationFrame(pvTick); }
}
// close enough that the gun fills the width when it's side-on, but never so close it leaves the top or bottom as it turns
function pvFit() {
  const tv = Math.tan(THREE.MathUtils.degToRad(pv.cam.fov / 2)), th = tv * pv.cam.aspect;
  const d = Math.max(pv.rad / th * 1.1, pv.halfH / tv * 1.25 + pv.rad); // the second: its near end, when it points at you
  pv.cam.position.set(0, d * .22, d); pv.cam.lookAt(0, 0, 0);
}
function pvTick(now) {
  if (!armOpen || !armDet) { pv.on = false; return; }
  const dt = Math.min(.1, (now - pv.t) / 1000); pv.t = now;
  const w = pv.cv.clientWidth, h = pv.cv.clientHeight;
  if (w && h && (pv.cv.width !== Math.round(w * pv.r.getPixelRatio()) || pv.cv.height !== Math.round(h * pv.r.getPixelRatio()))) {
    pv.r.setSize(w, h, false); pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix(); pvFit();
  }
  pv.spin.rotation.y += dt * .7;
  pv.r.render(pv.sc, pv.cam);
  requestAnimationFrame(pvTick);
}

function armSync(i, how) {
  if (!inMatch()) return;
  if (how === 'buy') giveGun(i);
  if (how === 'up') { lvl[i] = gunStars(i) - 1; applyLvl(i); if (i === cur) buildGun(); }
  const s = slotOf(i);
  if (slotGun[s] !== loadoutGun(BASE[i].cat)) { slotGun[s] = loadoutGun(BASE[i].cat); if (slotOf(cur) === s) { const g = slotGun[s]; cur = -1; equip(g); } }
  renderHotbar();
}
// click a card to pick it (your character holds it), click it again for its details
$('armList').addEventListener('click', e => {
  const c = e.target.closest('.card'); if (!c) return;
  if (c.dataset.armor) { if (armorCard) { armDet = true; armorPrev = myArmor() || 1; } else armorCard = true; sfx('ui'); renderArmory(); return; }
  const i = +c.dataset.i;
  if (i === armSel) armDet = true; else armSel = i;
  sfx('ui'); renderArmory();
});
function armClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.pg) { if (b.dataset.pg !== armPage) { armPage = b.dataset.pg; armDet = false; armorPrev = 0; armorCard = false; armSel = -1; sfx('ui'); } }
  else if (b.dataset.wc) { wearCat = b.dataset.wc; armDet = false; sfx('ui'); }
  else if (b.dataset.av) { armorStep(+b.dataset.av); return; }
  else if (b.dataset.arm) {
    const n = myArmor(), T = armorOf(n + 1); if (!T || prof.coins < T.price || prof.lv < T.unlock) return;
    prof.coins -= T.price; prof.armor = n + 1; if (armDet) armorPrev = n + 1; saveProf(); showProf();
    armorSync(); sfx(n ? 'upgrade' : 'buy');
  }
  else if (b.dataset.c) { armCat = b.dataset.c; armDet = false; sfx('ui'); }
  else if (b.id === 'detBack') { armDet = false; sfx('ui'); }
  else if (b.dataset.buy) {
    const i = +b.dataset.buy, w = BASE[i]; if (prof.coins < w.price || prof.lv < (w.unlock ?? 0)) return;
    prof.coins -= w.price; prof.guns[w.id] = 1; prof.loadout[w.cat] = w.id; saveProf(); showProf();
    armSync(i, 'buy'); sfx('buy');
  } else if (b.dataset.up) {
    const i = +b.dataset.up, p = upgPrice(i); if (prof.coins < p || gunStars(i) >= 3) return;
    prof.coins -= p; prof.guns[BASE[i].id]++; saveProf(); showProf();
    armSync(i, 'up'); sfx('upgrade');
  } else if (b.dataset.eq) {
    const i = +b.dataset.eq; prof.loadout[BASE[i].cat] = BASE[i].id; saveProf();
    armSync(i, 'eq'); sfx('equip');
  } else if (b.id === 'armX') { closeArmory(); return; }
  renderArmory();
}
$('armory').addEventListener('click', armClick);
$('armAct').addEventListener('click', armClick);
$('armAct').addEventListener('pointerdown', e => e.stopPropagation()); // clicking a button shouldn't start spinning him
const armIcon = () => $('armIcon').src = SPRITES[loadoutGun('primary')]; // the lobby's ARMORY button shows your primary gun
armIcon();
// in the lobby the home buttons hide and the camera slides over (lobby.js). In a match the menu hides so you see the game behind it
function armShow(on) {
  $('armory').style.display = on ? 'flex' : 'none';
  $('armAct').style.display = on ? 'flex' : 'none';
  if (inLobby) { $('lobbyUI').style.display = on ? 'none' : ''; $('lookPick').style.display = on ? 'none' : ''; }
  else $('menu').style.display = on || locked || shopOpen || matchOver ? 'none' : 'flex';
}
function openArmory() { armOpen = true; armDet = false; armSel = -1; armorCard = false; armShow(true); renderArmory(); }
function closeArmory() { if (!armOpen) return; armOpen = false; armShow(false); armIcon(); armorPrev = 0; heroArmor(myArmor()); }
$('armBtn').addEventListener('click', e => { e.stopPropagation(); openArmory(); }); // stopPropagation so the click doesn't re-lock the mouse
$('lobbyArm').addEventListener('click', openArmory);
addEventListener('keydown', e => {
  if (armOpen && armDet && armPage === 'wear' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { armorStep(e.code === 'ArrowLeft' ? -1 : 1); return; }
  if (e.code !== 'Escape' || !armOpen || $('binds').style.display === 'flex') return;
  if (armDet) { armDet = false; renderArmory(); } else closeArmory();
});
addEventListener('resize', placeAct);
