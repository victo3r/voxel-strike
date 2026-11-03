// Star upgrades cost a share of the gun's own price: UPG[0] for ★★, UPG[1] for ★★★ (so less than buying the gun again).
const UPG = [.75, .9];
let armCat = 'primary', armOpen = false, armSel = -1, armDet = false; // armSel = the gun card you clicked, armDet = showing its details
const gunStars = i => prof.guns[BASE[i].id] ?? 0; // 0 = not bought yet (starters are always 0: no stars)
// the stars you take into a match: all of them unless you picked fewer (prof.use). Bots never roll more than this
const gunUse = i => { const st = gunStars(i), u = prof.use?.[BASE[i].id]; return u ? Math.max(1, Math.min(st, u)) : st; };
const upgPrice = i => Math.round(BASE[i].price * UPG[gunStars(i) - 1]);
const inMatch = () => !inLobby && pvp() && !matchOver;

// the four main stats at the stars you're using: damage, fire rate, capacity (mag size) and mobility.
// [label, value, unit]. One-shot guns fire once per reload, so that's their fire rate. A beam fires nonstop
function mainStats(i) {
  const w = BASE[i], L = Math.max(0, gunUse(i) - 1), dmg = Math.round(w.dmg * (1 + .25 * L)), rl = w.reload * (1 - .15 * L);
  const per = s => s >= 20 ? Math.round(s) : +s.toFixed(1);
  return [
    ['DAMAGE', w.beam ? Math.round(dmg / w.rate) : w.pellets > 1 ? `${dmg}×${w.pellets}` : dmg, w.beam ? '/ SEC' : ''],
    ['FIRE RATE', w.beam ? 'BEAM' : per(1 / (w.mag === 1 && !w.melee ? Math.max(w.rate, rl) : w.rate)), w.beam ? '' : '/ SEC'],
    ['CAPACITY', w.inf ? '∞' : magAt(w, L), ''],
    ['MOBILITY', w.mob ?? 60, ''],
  ];
}
const gunStats = i => mainStats(i).map(([k, v]) => `${k === 'FIRE RATE' ? 'RATE' : k === 'CAPACITY' ? 'CAP' : k.slice(0, 3)} ${v}`).join(' · ');
// tags for how a gun works, listed under its description
function gunAttrs(w) {
  const a = [];
  if (w.melee) a.push('MELEE');
  else if (w.beam) a.push('BEAM');
  else if (w.action) a.push(w.action);
  else if (w.auto) a.push('AUTOMATIC');
  else if (w.mag > 1) a.push('SEMI-AUTO');
  if (w.zoom) a.push(w.zoom + 'X ZOOM', w.scope ? 'SCOPE' : 'HOLO SIGHT');
  if (w.quiet) a.push('SUPPRESSED');
  if (w.rocket) a.push('ROCKET', 'EXPLOSIVE');
  if (w.flame || w.flare) a.push('FIRE');
  if (w.flare) a.push('SPLASH');
  if (w.inf) a.push('INFINITE');
  return a;
}
const DESC = {
  voxel: 'Your starting pistol, with a teal energy core. A dependable backup for when your primary runs dry.',
  hitman: 'A suppressed pistol with a holo sight on the slide. Its quiet shots don\'t carry far, so people won\'t hear you coming.',
  heatray: 'A big magnifying glass on top gathers sunlight, and the barrel focuses that heat into a beam. Hold the trigger to keep it on target.',
  shotgun: 'A pump shotgun that fires a burst of pellets every shot. Devastating up close and weak at range, so get in close before you pull the trigger.',
  ar: 'A reliable rifle that handles every range well. A solid pick for any fight.',
  thrasher: 'A hard-hitting rifle that tears through fights, with a holo sight on the top rail for picking people off at range.',
  sniper: 'A bolt-action rifle that hits hard from across the map. Aim to look through the scope.',
  eradicator: 'A minigun that shreds anything in front of it. Reloading the belt takes a long time, so make it count.',
  knife: 'Always with you and never runs out. It\'s the quickest way to get around the map.',
  flame: 'Sprays a short cone of fire that hits everything in front of you and sets it burning. Its fuel tank refills when you reload.',
  rocket: 'Fires a rocket that explodes on impact and hurts everyone in the blast. The blast also throws you, so you can rocket jump with it.',
  flare: 'Fires a burning flare that sets whoever it hits on fire, with a small splash around the hit. It holds one flare, so make it count.',
};
// the rest of the stats for the details view, at the stars you're using
function gunSpecs(i) {
  const w = BASE[i], L = Math.max(0, gunUse(i) - 1), out = [], rl = +(w.reload * (1 - .15 * L)).toFixed(1);
  if (!w.melee) out.push(['RELOAD', rl + 's']);
  if (w.range) out.push(['RANGE', w.range + ' BLOCKS']);
  if (w.rocket) out.push(['BLAST RADIUS', ROCKET_R + ' BLOCKS']);
  if (w.flare) out.push(['BURN', `${w.burn * 4} / SEC FOR ${w.burnT}s`], ['SPLASH RADIUS', FLARE_R + ' BLOCKS']);
  if (!w.start) out.push(['UNLOCKS AT', 'LVL ' + (w.unlock ?? 0)], ['PRICE', COIN + w.price]);
  return out;
}
const catList = () => BASE.map((w, i) => i).filter(i => BASE[i].cat === armCat).sort((a, b) => (BASE[a].unlock ?? 0) - (BASE[b].unlock ?? 0));
const isLocked = i => !hasGun(i) && prof.lv < (BASE[i].unlock ?? 0);
// stars you're using, then stars you own but left off (dimmed), then ones you haven't bought
const starTxt = i => BASE[i].start ? '' : '★'.repeat(gunUse(i)) + (gunStars(i) > gunUse(i) ? `<i>${'★'.repeat(gunStars(i) - gunUse(i))}</i>` : '') + '☆'.repeat(3 - gunStars(i));
// the ◀ ▶ picker under your character for which star to use. k = what the arrows send, label = what's picked
const lvPick = (k, label, lo, hi) => `<div class="lvp"><button data-${k}="-1" ${lo ? 'disabled' : ''}>◀</button><span>${label}</span><button data-${k}="1" ${hi ? 'disabled' : ''}>▶</button></div>`;
// the armory's pages run down the left (the y axis). Each page has its own row of sections along the top (the x axis):
// WEAPONS has the gun categories, WEAR has ARMOR (more things to wear can go in WEAR_CATS later)
const PAGES = [['weapons', 'WEAPONS'], ['wear', 'WEAR']];
const WEAR_CATS = [['armor', 'ARMOR']];
// armorPrev = the star you're looking at in the armor details (your character wears it), armorCard = the Basic Armor card is picked
let armPage = 'weapons', wearCat = 'armor', armorPrev = 0, armorCard = false;
const myArmor = () => prof.armor | 0;
const pageIcon = p => p === 'weapons' ? SPRITES[loadoutGun('primary')] : armorSprite(Math.max(0, wornArmor() - 1));
function renderArmory() {
  $('armInfo').innerHTML = `LVL ${prof.lv}<span class="pc">${COIN}${prof.coins}</span>`;
  $('armPages').innerHTML = PAGES.map(([p, label]) =>
    `<button data-pg="${p}" class="${p === armPage ? 'sel' : ''}${p === 'wear' && !myArmor() ? ' dim' : ''}"><img${p === 'wear' ? ' class="ai"' : ''} src="${pageIcon(p)}"><span>${label}</span></button>`).join('');
  if (armPage === 'wear') { renderWear(); return; }
  heroArmor(wornArmor());
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
  const u = gunUse(i), pick = !w.start && st > 1 ? lvPick('use', 'USING ' + '★'.repeat(u), u <= 1, u >= st) : '';
  $('armAct').innerHTML = `<div class="an">${w.name} <span class="st">${starTxt(i)}</span></div>${pick}<div class="ab">${btns}</div>`;
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
    `<div class="dn">${w.name} <span class="st">${starTxt(i)}</span></div>` +
    `<div class="ms">${mainStats(i).map(([k, v, u]) => `<div><span>${k}</span><b>${v}${u ? `<small> ${u}</small>` : ''}</b></div>`).join('')}</div>` +
    `<p>${DESC[w.id] ?? ''}</p><div class="at">${gunAttrs(w).map(a => `<span>${a}</span>`).join('')}</div>` +
    `<div class="ds">${gunSpecs(i).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow(i + ':' + gunUse(i), g => makeGun(i, g, Math.max(0, gunUse(i) - 1), false), -Math.PI / 2); // starts side-on, muzzle to the right
}

// ---- WEAR page. ARMOR has one card, Basic Armor. Click it to pick it, click it again for its details: the chestplate spins there,
// and the arrows in the bottom corners step through its stars (your character wears whichever one you're looking at).
// The button under him buys the next star
const ARMOR_DESC = 'Worn in bot matches. Your armor bar fills every time you spawn and takes hits before your health. ' +
  'Every star turns it into a bigger, tougher chestplate, and from Amethyst on, each one also cuts the damage you take by 4% more. ' +
  'You can wear any star you own. Bots roll their own armor, never better than what you wear.';
const armorStat = T => `+${T.hp} ARMOR` + (T.dr ? ` · −${Math.round(T.dr * 100)}% DAMAGE` : '');
function renderWear() {
  const n = myArmor(), w = wornArmor(), T = armorOf(w || 1);
  $('armTabs').innerHTML = WEAR_CATS.map(([c, label]) =>
    `<button data-wc="${c}" class="${c === wearCat ? 'sel' : ''}"><img class="ai" src="${armorSprite(Math.max(0, w - 1))}"><span>${label}</span></button>`).join('');
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (armDet) renderArmorDetail();
  else {
    const locked = !n && prof.lv < T.unlock, tag = n ? 'WEARING' : locked ? `🔒 LVL ${T.unlock}` : COIN + T.price;
    $('armList').innerHTML = `<p class="wd">${ARMOR_DESC}</p>` +
      `<div class="card${locked ? ' locked' : ''}${armorCard ? ' sel' : ''}${n ? ' on' : ''}" data-armor="1"><span class="tag">${tag}</span>` +
      `<img class="ai" src="${armorSprite((w || 1) - 1)}"><div class="cn">${ARMOR_ITEM} <span class="st">${n ? armorStarTxt() : ''}</span></div>` +
      `<small>${n ? T.name.toUpperCase() + ' · ' : ''}${armorStat(T)}</small></div>`;
  }
  heroArmor(armDet ? armorPrev : w || 1);
  renderAct();
  if (inLobby) heroGun(-1); // he puts the gun away and stands facing you, so you see the armor
}
// the armor's stars like a gun's: the one you wear, the better ones you own (dimmed), then the ones you don't have
const armorStarTxt = () => { const n = myArmor(), w = wornArmor(); return '★'.repeat(w) + (n > w ? `<i>${'★'.repeat(n - w)}</i>` : '') + '☆'.repeat(ARMOR_MAX - n); };
function renderArmorDetail() {
  const s = armorPrev, T = armorOf(s), n = myArmor();
  const state = s === wornArmor() ? 'WEARING' : s <= n ? 'OWNED' : prof.lv < T.unlock ? '🔒 LOCKED' : 'NOT OWNED';
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
// under your character: which star to wear (◀ ▶, or WEAR on the star you're looking at in the details), and the next star to buy
function renderArmorAct() {
  const n = myArmor(), w = wornArmor(), next = armorOf(n + 1);
  let btns = '';
  if (armDet && armorPrev && armorPrev <= n && armorPrev !== w) btns += `<button data-wear="${armorPrev}">WEAR ${armorOf(armorPrev).name.toUpperCase()}</button>`;
  if (!next) btns += '<button class="eq" disabled>MAXED</button>';
  else if (prof.lv < next.unlock) btns += `<button disabled>🔒 ${n ? next.name.toUpperCase() + ' ' : ''}AT LVL ${next.unlock}</button>`;
  else btns += `<button data-arm="1" ${prof.coins < next.price ? 'disabled' : ''}>${n ? '★'.repeat(n + 1) + ' ' + next.name.toUpperCase() : 'BUY'} ${COIN}${next.price}</button>`;
  const pick = !armDet && n > 1 ? lvPick('wa', 'WEARING ' + armorOf(w).name.toUpperCase(), w <= 1, w >= n) : '';
  $('armAct').innerHTML = `<div class="an">${ARMOR_ITEM} <span class="st">${n ? armorStarTxt() : ''}</span></div>${pick}<div class="ab">${btns}</div>`;
  placeAct();
}
// picks star s to wear (your best = no pick saved, so buying the next star puts it straight on)
function wearStar(s) {
  const n = myArmor(); s = Math.max(1, Math.min(n, s)); if (s === wornArmor()) return;
  prof.armorUse = s === n ? 0 : s; saveProf(); armorSync(false); sfx('equip');
}
// changed armor during a match: it's on right away. A worse one cuts the bar down to its size.
// fill: you just bought a star, so the new part of the bar comes filled (switching between stars you own never fills it)
function armorSync(fill = true) {
  if (!inMatch()) return;
  const T = armorOf(wornArmor()), gain = fill ? Math.max(0, T.hp - P.maxArmor) : 0;
  P.maxArmor = T.hp; P.dr = T.dr; P.armor = Math.min(P.maxArmor, P.armor + gain);
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
  if (how === 'up' || how === 'use') { lvl[i] = Math.max(0, gunUse(i) - 1); applyLvl(i); ammo[i] = Math.min(ammo[i], WEAPONS[i].mag); if (i === cur) buildGun(); }
  const s = slotOf(i);
  if (slotGun[s] !== loadoutGun(BASE[i].cat)) { slotGun[s] = loadoutGun(BASE[i].cat); if (slotOf(cur) === s) { const g = slotGun[s]; cur = -1; equip(g); } }
  renderHotbar();
}
// click a card to pick it (your character holds it), click it again for its details
$('armList').addEventListener('click', e => {
  const c = e.target.closest('.card'); if (!c) return;
  if (c.dataset.armor) { if (armorCard) { armDet = true; armorPrev = wornArmor() || 1; } else armorCard = true; sfx('ui'); renderArmory(); return; }
  const i = +c.dataset.i;
  if (i === armSel) armDet = true; else armSel = i;
  sfx('ui'); renderArmory();
});
function armClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.pg) { if (b.dataset.pg !== armPage) { armPage = b.dataset.pg; armDet = false; armorPrev = 0; armorCard = false; armSel = -1; sfx('ui'); } }
  else if (b.dataset.wc) { wearCat = b.dataset.wc; armDet = false; sfx('ui'); }
  else if (b.dataset.av) { armorStep(+b.dataset.av); return; }
  else if (b.dataset.wa) wearStar(wornArmor() + +b.dataset.wa);
  else if (b.dataset.wear) wearStar(+b.dataset.wear);
  else if (b.dataset.use) { // which of a gun's stars you take into a match (your best = no pick saved, so an upgrade goes straight on)
    const i = armSel, st = gunStars(i), u = Math.max(1, Math.min(st, gunUse(i) + +b.dataset.use));
    if (u === st) delete prof.use[BASE[i].id]; else prof.use[BASE[i].id] = u;
    saveProf(); armSync(i, 'use'); sfx('equip');
  }
  else if (b.dataset.arm) {
    const n = myArmor(), T = armorOf(n + 1); if (!T || prof.coins < T.price || prof.lv < T.unlock) return;
    prof.coins -= T.price; prof.armor = n + 1; prof.armorUse = 0; if (armDet) armorPrev = n + 1; saveProf(); showProf();
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
    prof.coins -= p; prof.guns[BASE[i].id]++; delete prof.use[BASE[i].id]; saveProf(); showProf();
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
function closeArmory() { if (!armOpen) return; armOpen = false; armShow(false); armIcon(); armorPrev = 0; heroArmor(wornArmor()); }
$('armBtn').addEventListener('click', e => { e.stopPropagation(); openArmory(); }); // stopPropagation so the click doesn't re-lock the mouse
$('lobbyArm').addEventListener('click', openArmory);
addEventListener('keydown', e => {
  if (armOpen && armDet && armPage === 'wear' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { armorStep(e.code === 'ArrowLeft' ? -1 : 1); return; }
  if (e.code !== 'Escape' || !armOpen || $('binds').style.display === 'flex') return;
  if (armDet) { armDet = false; renderArmory(); } else closeArmory();
});
addEventListener('resize', placeAct);
