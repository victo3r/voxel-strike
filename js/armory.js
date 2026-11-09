// upgrade prices, as a share of the gun price
const UPG = [.75, .9];
let armCat = 'primary', armOpen = false, armSel = -1, armDet = false;
const gunStars = i => prof.guns[BASE[i].id] ?? 0; // 0 = not bought
// stars you use in a match (bots never get more)
const gunUse = i => { const st = gunStars(i), u = prof.use?.[BASE[i].id]; return u ? Math.max(1, Math.min(st, u)) : st; };
const upgPrice = i => Math.round(BASE[i].price * UPG[gunStars(i) - 1]);
const inMatch = () => !inLobby && pvp() && !matchOver;

// main stats for a gun card
function mainStats(i, L = Math.max(0, gunUse(i) - 1)) {
  const w = BASE[i], s = statsAt(i, L);
  const per = v => v >= 20 ? Math.round(v) : +v.toFixed(1);
  return [
    ['DAMAGE', w.beam ? Math.round(s.dmg / s.rate) : s.dmg * w.pellets, w.beam ? '/ SEC' : ''],
    ['FIRE RATE', w.beam ? 'BEAM' : per(1 / (w.mag === 1 && !w.melee ? Math.max(s.rate, s.reload) : s.rate)), w.beam ? '' : '/ SEC'],
    ['CAPACITY', w.inf ? ico('inf') : s.mag, ''],
    ['MOBILITY', w.mob ?? 60, ''],
  ].filter(r => !(w.melee && r[0] === 'CAPACITY'));
}
// stats per star for the details view
function starTable(i) {
  const w = BASE[i], S = [0, 1, 2].map(L => statsAt(i, L)), rows = [];
  rows.push(['DAMAGE', ...S.map(s => w.beam ? Math.round(s.dmg / s.rate) + '/s' : s.dmg * w.pellets)]);
  if (!w.beam && S[2].rate !== S[0].rate) rows.push(['FIRE RATE', ...S.map(s => +(1 / s.rate).toFixed(1) + '/s')]);
  if (!w.beam && (w.mag > 1 || w.melee)) rows.push(['DMG / SEC', ...S.map(s => Math.round(s.dmg * w.pellets / s.rate))]);
  if (w.mag > 1) rows.push(['CAPACITY', ...S.map(s => s.mag)]);
  if (!w.melee && !w.pool) rows.push(['RELOAD', ...S.map(s => s.reload.toFixed(2) + 's')]);
  if (w.jump) rows.push(['JUMP', ...w.jump.map(j => '+' + Math.round(j * 100) + '%')]);
  return rows;
}
const statBoxes = rows => `<div class="ms" style="grid-template-columns:repeat(${rows.length},1fr)">${rows.map(([k, v, u]) => `<div><span>${k}</span><b>${v}${u ? `<small> ${u}</small>` : ''}</b></div>`).join('')}</div>`;
// rarity: a coloured badge by names, a stripe along the bottom of cards
const rarTag = o => { const [n, c] = RARITY[rarOf(o)]; return `<span class="rt" style="--rc:${c}">${n}</span>`; };
const rarCls = o => `" style="--rc:${RARITY[rarOf(o)][1]}`;
const attrTags = list => list.length ? `<div class="at">${list.map(a => `<span>${a}</span>`).join('')}</div>` : '';
// gun tags
function gunAttrs(w) {
  const a = [];
  if (w.melee) a.push('MELEE');
  else if (w.beam) a.push('BEAM');
  else if (w.action) a.push(w.action);
  else if (w.auto) a.push('AUTOMATIC');
  else if (autoFire(w)) a.push('RAPID FIRE');
  else if (w.mag > 1) a.push('SEMI-AUTO');
  if (w.zoom) a.push(w.zoom + 'X ZOOM', w.scope ? 'SCOPE' : w.bow ? 'BOW SIGHT' : 'HOLO SIGHT');
  if (w.quiet) a.push(w.bow ? 'SILENT' : 'SUPPRESSED');
  if (w.headMul) a.push('HEADSHOT X' + w.headMul);
  if (w.pool) a.push('NO RELOADS');
  if (w.grenade) a.push('BOUNCES', 'EXPLOSIVE');
  if (w.laser) a.push('LASER');
  if (w.wand) a.push('WAND');
  if (slows(w)) a.push('SLOW');
  if (w.knock) a.push('KNOCKBACK');
  if (w.rocket) a.push('ROCKET', 'EXPLOSIVE');
  if (w.flame || w.flare || w.burn) a.push('FIRE');
  if (w.jump) a.push('JUMP BOOST');
  if (w.starFx) a.push('STARS');
  if (w.flare) a.push('SPLASH');
  if (w.inf) a.push('INFINITE');
  return a;
}
const DESC = {
  voxel: 'Your trusty starter pistol, glowing teal core and all',
  hitman: 'A suppressed pistol with a holo sight, so nobody hears you coming',
  heatray: 'A giant magnifying glass turns sunlight into a beam that cooks whatever it touches',
  shotgun: 'Pump action and a fistful of pellets, brutal up close',
  ar: 'A solid rifle that does a bit of everything',
  thrasher: 'A hard-hitting rifle with a holo sight for the longer fights',
  sniper: 'One big shot from across the map',
  semisniper: 'A sniper you can keep firing, a little less punch for a lot more shots',
  eradicator: 'A minigun that shreds everything in front of it',
  knife: 'A trusty knife that never leaves your side.',
  flame: 'Sprays fire up close and leaves everything burning',
  rocket: 'One rocket, one big boom, and anyone near it feels it',
  flare: 'One burning flare that sets whoever it hits on fire',
  herosword: 'A bronze blade with a gem in the guard and the pommel, made for heroes',
  shockbeam: 'A crackling bolt of electricity that leaves whoever it touches slow and twitchy',
  tigerbite: 'A striped sniper with a bite worse than its growl',
  trex: 'A pump shotgun with a bite, six big pellets a blast',
  starsmasher: 'A battle rifle that throws stars out of the muzzle with every shot',
  blazesaber: 'A blade of fire that leaves whoever it hits burning',
  windsaber: 'A white blade as light as the wind, run faster and jump higher',
  frostwand: 'A wand tipped with ice that leaves whoever it touches slow and shivering',
  warhammer: 'A huge hammer that sends whoever it hits flying',
  crossbow: 'Silent bolts that hit a head really hard',
  grenade: 'Grenades that bounce off walls and go boom on whoever they touch',
  executioner: 'Purple laser bolts that hit like a sniper, from a pistol',
};
// extra stats for the details view
function gunSpecs(i) {
  const w = BASE[i], out = [], rl = +statsAt(i, Math.max(0, gunUse(i) - 1)).reload.toFixed(1);
  if (!w.melee && w.start) out.push(['RELOAD', rl + 's']);
  if (w.range) out.push(['RANGE', w.range + ' BLOCKS']);
  if (w.rocket || w.grenade) out.push(['BLAST RADIUS', ROCKET_R + ' BLOCKS']);
  if (w.grenade) out.push(['FUSE', GREN_FUSE + 's']);
  if (w.headMul) out.push(['HEADSHOT', 'X' + w.headMul]);
  if (w.spare) out.push([w.bow ? 'SPARE BOLTS' : 'SPARE AMMO', w.mag * w.spare]);
  if (w.burn) out.push(['BURN', `${w.burn * 4} / SEC FOR ${w.burnT}s`]);
  if (w.flare) out.push(['SPLASH RADIUS', FLARE_R + ' BLOCKS']);
  if (w.jump) out.push(['JUMP', `+${Math.round(w.jump[Math.max(0, gunUse(i) - 1)] * 100)}% HIGHER`]);
  if (slows(w)) out.push(['SLOW', `${Math.round((1 - (w.frost ? FROST_K : SLOW_K)) * 100)}% FOR ${SLOW_T}s`]);
  if (w.knock) out.push(['KNOCKBACK', 'BIG']);
  if (!w.start) out.push(['UNLOCKS AT', 'LVL ' + (w.unlock ?? 0)], ['PRICE', COIN + w.price]);
  return out;
}
const catList = () => BASE.map((w, i) => i).filter(i => BASE[i].cat === armCat).sort((a, b) => (BASE[a].unlock ?? 0) - (BASE[b].unlock ?? 0));
const isLocked = i => !hasGun(i) && prof.lv < (BASE[i].unlock ?? 0);
const starTxt = i => BASE[i].start ? '' : starRow(gunUse(i), gunStars(i), 3);
// star picker under your character
const lvPick = (k, label, lo, hi) => `<div class="lvp"><button data-${k}="-1" ${lo ? 'disabled' : ''}>${ico('left')}</button><span>${label}</span><button data-${k}="1" ${hi ? 'disabled' : ''}>${ico('right')}</button></div>`;
// armory pages and their sections
const PAGES = [['weapons', 'WEAPONS'], ['wear', 'WEAR']];
const WEAR_CATS = [['skins', 'SKINS'], ['armor', 'ARMOR'], ['boots', 'BOOTS'], ['hats', 'HATS']];
let armPage = 'weapons', wearCat = 'skins', armorPrev = 0, armorCard = false, gearSel = -1, suitSel = '';
const myArmor = () => prof.armor | 0;
const pageIcon = p => p === 'weapons' ? SPRITES[loadoutGun('primary')] : armorSprite(Math.max(0, wornArmor() - 1));
function renderArmory() {
  $('armInfo').innerHTML = `LVL ${prof.lv}<span class="pc">${COIN}${prof.coins}</span>`;
  $('armPages').innerHTML = PAGES.map(([p, label]) =>
    `<button data-pg="${p}" class="${p === armPage ? 'sel' : ''}"><img${p === 'wear' ? ' class="ai"' : ''} src="${pageIcon(p)}"><span>${label}</span></button>`).join('');
  if (armPage === 'wear') { renderWear(); return; }
  heroArmor(wornArmor()); wearGear();
  $('armTabs').innerHTML = CATS.map(([c, label], s) =>
    `<button data-c="${c}" class="${c === armCat ? 'sel' : ''}"><img src="${SPRITES[loadoutGun(c)]}"><span>${label}</span></button>`).join('');
  const eq = loadoutGun(armCat);
  if (BASE[armSel]?.cat !== armCat) armSel = eq;
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (armDet) renderDetail();
  else $('armList').innerHTML = catList().map(i => {
    const w = BASE[i], tag = isLocked(i) ? `${ico('lock')} LVL ${w.unlock}` : !hasGun(i) ? COIN + w.price : i === eq ? 'EQUIPPED' : '';
    return `<div class="card rr${isLocked(i) ? ' locked' : ''}${i === armSel ? ' sel' : ''}${i === eq ? ' on' : ''}${rarCls(w)}" data-i="${i}">` +
      (tag ? `<span class="tag">${tag}</span>` : '') + `<img src="${SPRITES[i]}">` +
      `<div class="cn">${w.name} <span class="st">${starTxt(i)}</span></div>${rarTag(w)}</div>`;
  }).join('');
  renderAct();
  if (inLobby) heroGun(armSel);
}
// ---- the item card in the corner
const actCard = (name, stars, body, pick, btns) => `<div class="an"><span>${name} <span class="st">${stars}</span></span>` +
  (armDetOk() ? `<button class="more" data-det="1">${armDet ? ico('left') + ' LIST' : 'DETAILS ' + ico('right')}</button>` : '') + `</div>${body}${pick}<div class="ab">${btns}</div>`;
const armDetOk = () => armPage === 'weapons' || (wearCat !== 'skins' && (wearCat !== 'armor' || armorCard || !!suitSel));
function renderAct() {
  if (armPage === 'wear') { if (isGear()) renderGearAct(); else if (wearCat === 'skins') renderSkinAct(); else if (shownSuit()) renderSuitAct(); else renderArmorAct(); return; }
  const i = armSel, w = BASE[i], st = gunStars(i), eq = loadoutGun(armCat);
  let btns;
  if (isLocked(i)) btns = `<button disabled>${ico('lock')} UNLOCKS AT LVL ${w.unlock}</button>`;
  else if (!hasGun(i)) btns = `<button data-buy="${i}" ${prof.coins < w.price ? 'disabled' : ''}>BUY ${COIN}${w.price}</button>`;
  else {
    btns = i === eq ? '<button class="eq" disabled>EQUIPPED</button>' : `<button data-eq="${i}">EQUIP</button>`;
    if (!w.start && st < 3) btns += `<button data-up="${i}" ${prof.coins < upgPrice(i) ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${upgPrice(i)}</button>`;
  }
  const u = gunUse(i), pick = !w.start && st > 1 ? lvPick('use', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  $('armAct').innerHTML = actCard(w.name + ' ' + rarTag(w), starTxt(i), statBoxes(mainStats(i)) + attrTags(gunAttrs(w)), pick, btns);
  placeAct();
}
// SHOOT and RELOAD buttons
function placeAct() {
  if (!armOpen) return;
  const h = $('heroAct'), on = inLobby && armPage === 'weapons' && innerWidth > 700;
  h.style.display = on ? 'flex' : 'none';
  $('heroReload').style.display = BASE[armSel]?.inf ? 'none' : '';
  if (on) { const edge = $('armory').getBoundingClientRect().right; h.style.left = Math.max(edge, heroScreen.x - innerHeight * .2 - 50) + 'px'; h.style.top = heroScreen.y + 'px'; }
}
function renderDetail() {
  const i = armSel, w = BASE[i], u = gunUse(i), rows = w.start ? [] : starTable(i);
  const table = rows.length ? `<div class="sk"><span></span>${[1, 2, 3].map(s => `<b class="h${s === u ? ' on' : ''}">${starRow(s)}</b>`).join('')}` +
    rows.map(([k, ...v]) => `<span>${k}</span>${v.map((x, s) => `<b${s + 1 === u ? ' class="on"' : ''}>${x}</b>`).join('')}`).join('') + '</div>' : '';
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dn">${w.name} ${rarTag(w)} <span class="st">${starTxt(i)}</span></div><p>${DESC[w.id] ?? ''}</p>` +
    (table ? `<div class="sh">WHAT EACH STAR DOES</div>${table}` : '') +
    `<div class="ds">${gunSpecs(i).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow(i + ':' + u, g => makeGun(i, g, Math.max(0, u - 1), false), -Math.PI / 2);
}

// ---- WEAR page: armor
const ARMOR_DESC = 'Soaks up hits before your health does and fills back up every spawn, and armor, boots and a hat from one set give a bonus';
function renderWear() {
  const n = myArmor(), w = basicWorn(), T = armorOf(w || 1), sid = shownSuit();
  const tabIcon = c => c === 'skins' ? headSprite(prof.look) : c === 'armor' ? armorSprite(Math.max(0, wornArmor() - 1)) : (G => { const on = G.worn(); return on ? G.sprite(on.id, on.st) : G.sprite(G.list[0].id, 1); })(GEAR[c]);
  $('armTabs').innerHTML = WEAR_CATS.map(([c, label]) =>
    `<button data-wc="${c}" class="${c === wearCat ? 'sel' : ''}"><img class="${c === 'skins' ? 'hd' : 'ai'}" src="${tabIcon(c)}"><span>${label}</span></button>`).join('');
  if (wearCat === 'skins') armDet = false;
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (wearCat === 'skins') { renderSkins(); return; }
  if (isGear()) { renderGear(); return; }
  wearGear();
  if (armDet) { if (sid) renderSuitDetail(); else renderArmorDetail(); }
  else {
    const locked = !n && prof.lv < T.unlock, on = n && !wornSuit(), tag = on ? 'WEARING' : n ? '' : locked ? `${ico('lock')} LVL ${T.unlock}` : COIN + T.price;
    $('armList').innerHTML = `<p class="wd">${ARMOR_DESC}</p>` +
      `<div class="card${locked ? ' locked' : ''}${armorCard ? ' sel' : ''}${on ? ' on' : ''}" data-armor="1">${tag ? `<span class="tag">${tag}</span>` : ''}` +
      `<img class="ai" src="${armorSprite((w || 1) - 1)}"><div class="cn">${ARMOR_ITEM} <span class="st">${n ? armorStarTxt() : ''}</span></div></div>` +
      SUITS.map(suitCard).join('');
  }
  heroArmor(sid ? suitN(sid, suitShown(sid)) : armDet ? armorPrev : w || 1);
  renderAct();
  if (inLobby) heroGun(-1); // put the gun away to show the armor
}
const armorStarTxt = () => starRow(basicWorn(), myArmor(), ARMOR_MAX);
function renderArmorDetail() {
  const s = armorPrev, T = armorOf(s), n = myArmor();
  const state = s === wornArmor() ? 'WEARING' : s <= n ? 'OWNED' : prof.lv < T.unlock ? ico('lock') + ' LOCKED' : 'NOT OWNED';
  const desc = T.dr ? 'Soaks up hits before your health does and shrugs off part of every hit' : 'Soaks up hits before your health does';
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button>` +
    `<div id="detView"><button class="arw l" data-av="-1" ${s <= 1 ? 'disabled' : ''}>${ico('left')}</button><button class="arw r" data-av="1" ${s >= ARMOR_MAX ? 'disabled' : ''}>${ico('right')}</button></div>` +
    `<div class="dn">${T.name} ${rarTag(T)} <span class="st">${armorStars(s)}</span></div><p>${desc}</p><div class="ds">` +
    [['ARMOR', '+' + T.hp], ['DAMAGE CUT', T.dr ? Math.round(T.dr * 100) + '%' : 'NONE'], ['MOBILITY', lvlName(T.mob)], ['JUMP', lvlName(T.jump)], ['UNLOCKS AT', 'LVL ' + T.unlock],
      ['PRICE', COIN + T.price], ['STATUS', state]].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('') + '</div>';
  pvShow('armor' + s, g => armorModel(s, g), .5);
}
function armorStep(d) {
  const s = Math.max(1, Math.min(ARMOR_MAX, armorPrev + d)); if (s === armorPrev) return;
  armorPrev = s; sfx('ui'); renderArmory();
}
// armor buttons
function renderArmorAct() {
  const n = myArmor(), w = basicWorn(), next = armorOf(n + 1), suit = wornSuit();
  let btns = '';
  if (armDet && armorPrev && armorPrev <= n && (armorPrev !== w || suit)) btns += `<button data-wear="${armorPrev}">WEAR ${armorOf(armorPrev).name.toUpperCase()}</button>`;
  else if (!armDet && suit && n) btns += `<button data-wear="${w}">WEAR</button>`;
  if (!next) btns += '<button class="eq" disabled>MAXED</button>';
  else if (prof.lv < next.unlock) btns += `<button disabled>${ico('lock')} ${n ? next.name.toUpperCase() + ' ' : ''}AT LVL ${next.unlock}</button>`;
  else btns += `<button data-arm="1" ${prof.coins < next.price ? 'disabled' : ''}>${n ? starRow(n + 1) + ' ' + next.name.toUpperCase() : 'BUY'} ${COIN}${next.price}</button>`;
  const pick = !armDet && n > 1 ? lvPick('wa', (suit ? 'USING ' : 'WEARING ') + armorOf(w).name.toUpperCase(), w <= 1, w >= n) : '';
  const T = armorOf(armDet ? armorPrev : w || 1);
  const body = `<div class="tn">${T.name.toUpperCase()} ${rarTag(T)}${armDet ? '' : !n ? ' NOT OWNED' : suit ? '' : ' WEARING'}</div>` + armorBoxes(T);
  $('armAct').innerHTML = actCard(ARMOR_ITEM, n ? armorStarTxt() : '', body, pick, btns);
  placeAct();
}
function wearStar(s, on = false) {
  const n = myArmor(); s = Math.max(1, Math.min(n, s)); if (s === basicWorn() && !(on && prof.armorOn)) return;
  prof.armorUse = s === n ? 0 : s; if (on) prof.armorOn = ''; saveProf(); armorSync(false); sfx('equip');
}
// ---- WEAR page: set armor
const SUIT_ABOUT = {
  warrior: 'Thick steel plate for brawlers, slow and heavy but tough to get through',
  raider: 'A light cloak for runners, thinner than plate but quick on its feet',
};
const SET_TXT = { warrior: '+5% DMG, +5% DMG CUT', raider: 'TRIPLE JUMP, +8% SPEED' };
const shownSuit = () => armPage === 'wear' && wearCat === 'armor' ? suitSel || (!armorCard && wornSuit()?.id) || '' : '';
const suitShown = id => Math.max(1, suitUse(id));
const suitStarTxt = id => starRow(suitUse(id), suitStars(id), SUIT_ST);
const suitLocked = S => !suitStars(S.id) && prof.lv < S.unlock[0];
const lvlName = v => LEVEL_NAMES[v ?? 2];
const armorBoxes = T => statBoxes([['ARMOR', '+' + T.hp, ''], ['DMG CUT', T.dr ? pct(T.dr) : 'NONE', ''], ['MOBILITY', lvlName(T.mob), ''], ['JUMP', lvlName(T.jump), '']]);
const setOn = id => youFx().set === id ? '<div class="tn">FULL SET BONUS ON</div>' : '';
function suitCard(S) {
  const st = suitStars(S.id), worn = wornSuit()?.id === S.id, locked = suitLocked(S);
  const tag = locked ? `${ico('lock')} LVL ${S.unlock[0]}` : !st ? COIN + S.price[0] : worn ? 'WEARING' : '';
  return `<div class="card rr${locked ? ' locked' : ''}${suitSel === S.id ? ' sel' : ''}${worn ? ' on' : ''}${rarCls(S)}" data-suit="${S.id}">` +
    (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai" src="${armorSprite(suitN(S.id, suitShown(S.id)) - 1)}">` +
    `<div class="cn">${S.name} <span class="st">${suitStarTxt(S.id)}</span></div>${rarTag(S)}</div>`;
}
function renderSuitDetail() {
  const id = shownSuit(), S = suitOf(id), have = suitStars(id), n = suitN(id, suitShown(id));
  const by = (a, f) => a.every(v => v === a[0]) ? f(a[0]) : a.map(f).join(' / ');
  const rows = [['ARMOR BY STAR', by(S.hp, v => '+' + v)], ['DAMAGE CUT BY STAR', by(S.dr, pct)], ['MOBILITY', lvlName(S.mob)], ['JUMP', lvlName(S.jump)],
    ['FULL SET', SET_TXT[id]], ['STARS AT LVL', S.unlock.join(' / ')], ['PRICE', COIN + S.price[0]],
    ['STATUS', wornSuit()?.id === id ? 'WEARING' : have ? 'OWNED' : suitLocked(S) ? ico('lock') + ' LOCKED' : 'NOT OWNED']];
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dn">${S.name} ${rarTag(S)} <span class="st">${suitStarTxt(id)}</span></div>` +
    `<p>${SUIT_ABOUT[id]}</p><div class="ds">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow('armor' + n, g => armorModel(n, g), .5);
}
function renderSuitAct() {
  const id = shownSuit(), S = suitOf(id), st = suitStars(id), worn = wornSuit()?.id === id;
  let btns;
  if (suitLocked(S)) btns = `<button disabled>${ico('lock')} UNLOCKS AT LVL ${S.unlock[0]}</button>`;
  else if (!st) btns = `<button data-sbuy="1" ${prof.coins < S.price[0] ? 'disabled' : ''}>BUY ${COIN}${S.price[0]}</button>`;
  else {
    btns = worn ? '<button data-soff="1">TAKE OFF</button>' : '<button data-swear="1">WEAR</button>';
    if (st < SUIT_ST) btns += prof.lv < S.unlock[st] ? `<button disabled>${ico('lock')} ${starRow(st + 1)} AT LVL ${S.unlock[st]}</button>`
      : `<button data-sup="1" ${prof.coins < S.price[st] ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${S.price[st]}</button>`;
  }
  const u = suitUse(id), pick = st > 1 ? lvPick('su', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  const body = armorBoxes(armorOf(suitN(id, suitShown(id)))) + (worn ? setOn(id) : st ? '' : '<div class="tn">NOT OWNED · SHOWN AT ' + starRow(1) + '</div>');
  $('armAct').innerHTML = actCard(S.name + ' ' + rarTag(S), suitStarTxt(id), body, pick, btns);
  placeAct();
}
// set armor buttons
function suitClick(d) {
  const id = shownSuit(), S = suitOf(id); if (!S) return;
  const st = suitStars(id), own = prof.suits ??= {}, use = prof.suitUse ??= {};
  if (d.sbuy) {
    if (st || prof.coins < S.price[0] || prof.lv < S.unlock[0]) return;
    prof.coins -= S.price[0]; own[id] = 1; prof.armorOn = id; sfx('buy');
  } else if (d.sup) {
    if (!st || st >= SUIT_ST || prof.coins < S.price[st] || prof.lv < S.unlock[st]) return;
    prof.coins -= S.price[st]; own[id] = st + 1; delete use[id]; sfx('upgrade');
  } else if (d.swear) { prof.armorOn = id; sfx('equip'); }
  else if (d.soff) { prof.armorOn = ''; sfx('equip'); }
  else if (d.su) {
    const u = Math.max(1, Math.min(st, suitUse(id) + +d.su));
    if (u === st) delete use[id]; else use[id] = u;
    sfx('equip');
  }
  saveProf(); showProf(); armorSync(!!(d.sbuy || d.sup));
}
// ---- WEAR page: skins
const SKINS_DESC = 'Pick a look, make your own with CUSTOMIZE, or paint one from scratch with DRAW';
// skin icon, front view
const lookSpriteCache = new Map();
function skinSprite(look, head) {
  const key = (head ? 'h' : 'b') + (pxShown(look) ? 'd' : '') + lookKey(look);
  if (lookSpriteCache.has(key)) return lookSpriteCache.get(key);
  const src = skinTexture(look).image, W = head ? 8 : 16, H = head ? 8 : 33, K = 4;
  const c = document.createElement('canvas'); c.width = W + 2; c.height = H + 2;
  const g = c.getContext('2d'), cut = (sx, sy, w, h, x, y) => g.drawImage(src, sx, sy, w, h, x + 1, y + 1, w, h);
  if (head) cut(8, 8, 8, 8, 0, 0);
  else {
    cut(8, 8, 8, 8, 4, 0); cut(36, 4, 4, 1, 6, 8); cut(20, 20, 8, 12, 4, 9);
    cut(44, 20, 4, 12, 0, 9); cut(36, 52, 4, 12, 12, 9); cut(4, 20, 4, 12, 4, 21); cut(20, 52, 4, 12, 8, 21);
  }
  const d = g.getImageData(0, 0, W + 2, H + 2), a = (x, y) => x >= 0 && y >= 0 && x < W + 2 && y < H + 2 && d.data[(y * (W + 2) + x) * 4 + 3] > 0;
  const out = document.createElement('canvas'); out.width = (W + 2) * K; out.height = (H + 2) * K;
  const o = out.getContext('2d');
  for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
    const i = (y * (W + 2) + x) * 4;
    if (a(x, y)) o.fillStyle = `rgb(${d.data[i]},${d.data[i + 1]},${d.data[i + 2]})`;
    else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) o.fillStyle = '#000';
    else continue;
    o.fillRect(x * K, y * K, K, K);
  }
  const url = out.toDataURL(); lookSpriteCache.set(key, url); return url;
}
const lookSprite = L => skinSprite(L, false), headSprite = L => skinSprite(L, true);
function renderSkins() {
  const list = lookChoices(), on = lookIndex();
  $('armList').innerHTML = `<p class="wd">${SKINS_DESC}</p>` + list.map((p, i) =>
    `<div class="card${i === on ? ' sel on' : ''}" data-skin="${i}">${i === on ? '<span class="tag">WEARING</span>' : ''}` +
    `<img class="sk" src="${lookSprite(p.look)}"><div class="cn">${p.name}</div></div>`).join('') +
    (inLobby ? '<div class="card" data-cust="1"><span class="plus">' + ico('pencil') + '</span><div class="cn">CUSTOMIZE</div><small>MAKE YOUR OWN LOOK</small></div>' : '') +
    (!prof.draw ? `<div class="card" data-dbuy="1"><span class="plus">${ico('pencil')}</span><div class="cn">DRAW</div><small>PAINT YOUR OWN SKINS · ${COIN}${DRAW_PRICE}</small></div>`
      : inLobby && (prof.draws?.length || 0) < DRAW_MAX ? `<div class="card" data-dnew="1"><span class="plus">${ico('pencil')}</span><div class="cn">DRAW NEW</div><small>${prof.draws?.length || 0} / ${DRAW_MAX} SKINS</small></div>` : '');
  heroArmor(wornArmor()); wearGear();
  renderAct();
  if (inLobby) heroGun(-1);
}
function renderSkinAct() {
  const p = lookChoices()[lookIndex()], drawn = p?.drawn !== undefined;
  const btns = !inLobby ? '' : drawn ? `<button data-dedit="${p.drawn}">${ico('pencil')} EDIT</button><button data-ddel="${p.drawn}">${drawSure === p.drawn ? 'SURE?' : 'DELETE'}</button>` : '<button data-cust="1">' + ico('pencil') + ' CUSTOMIZE</button>';
  $('armAct').innerHTML = actCard(p?.name ?? 'CUSTOM', '', `<div class="tn">WEARING${drawn && CG_ON ? ' · ONLY YOU SEE DRAWN SKINS HERE' : ''}</div>`, '', btns);
  placeAct();
}
let drawSure = -1; // delete needs a second click
// open the customizer
function openCust() { closeArmory(); showCust(true); }

// ---- WEAR page: boots and hats
const GEAR = {
  boots: { list: BOOTS, I: BOOT_I, own: 'boots', use: 'bootUse', on: 'bootOn', stars: bootStars, using: bootUse, worn: wornBoots,
    sprite: bootSprite, model: bootsModel, face: .6, put: b => heroBoots(b),
    desc: 'One pair at a time, in every mode',
    about: {
      warrior: 'Steel greaves for brawlers, so you hit harder and take a little less',
      raider: 'Winged runners that make you faster and let you jump again in midair',
    } },
  hats: { list: HATS, I: HAT_I, own: 'hats', use: 'hatUse', on: 'hatOn', stars: hatStars, using: hatUse, worn: wornHat,
    sprite: hatSprite, model: hatModel, face: .5, put: h => heroHat(h),
    desc: 'One hat at a time, in every mode',
    about: {
      warrior: 'A steel helmet that takes the edge off hits and sometimes turns a headshot into a body shot',
      raider: 'A dark hood that sometimes halves a hit and hides your red outline from anyone outside its stealth range',
    } },
};
const wearGear = () => { for (const k in GEAR) GEAR[k].put(GEAR[k].worn()); };
const isGear = () => armPage === 'wear' && !!GEAR[wearCat];
const pct = v => Math.round(v * 100) + '%';
// gear stats as [label, value]
const plusPct = v => '+' + pct(v);
const GEAR_STATS = [['spd', 'SPEED', plusPct], ['dmg', 'DAMAGE', plusPct], ['dr', 'DAMAGE CUT', pct], ['hs', 'HEADSHOT BLOCK', pct],
  ['half', 'HALF DAMAGE', pct], ['stealth', 'STEALTH', v => v + 'M']];
function gearLines(B, st) {
  const o = GEAR_STATS.filter(([f]) => B[f]).map(([f, k, fmt]) => [k, fmt(B[f][st - 1])]);
  if (B.dj) o.push(['JUMPS', '2']);
  return o;
}
const GEAR_SHORT = { 'DAMAGE CUT': 'DMG CUT', DAMAGE: 'DMG', 'HEADSHOT BLOCK': 'HS BLOCK', 'HALF DAMAGE': 'HALF DMG' };
const gearList = G => G.list.map((B, i) => i).sort((a, b) => G.list[a].unlock - G.list[b].unlock);
const gearLocked = (G, B) => !G.stars(B.id) && prof.lv < B.unlock;
const gearUpg = (G, B) => Math.round(B.price * UPG[G.stars(B.id) - 1]);
const gearStarTxt = (G, id) => starRow(G.using(id), G.stars(id), 3);
const gearShown = (G, B) => Math.max(1, G.using(B.id));
function gearNow() {
  const G = GEAR[wearCat];
  if (!G.list[gearSel]) { const on = G.worn(); gearSel = on ? G.I[on.id] : gearList(G)[0]; }
  return G;
}
// he tries on the item you picked
function gearDress() {
  heroArmor(wornArmor());
  const G = isGear() && gearNow(), B = G && G.list[gearSel];
  for (const k in GEAR) GEAR[k].put(G && k === wearCat ? { id: B.id, st: gearShown(G, B) } : GEAR[k].worn());
}
function renderGear() {
  const G = gearNow();
  if (armDet) renderGearDetail();
  else $('armList').innerHTML = `<p class="wd">${G.desc}</p>` + gearList(G).map(i => {
    const K = G.list[i], st = G.stars(K.id), worn = prof[G.on] === K.id && st, s = gearShown(G, K);
    const tag = gearLocked(G, K) ? `${ico('lock')} LVL ${K.unlock}` : !st ? COIN + K.price : worn ? 'WEARING' : '';
    return `<div class="card rr${gearLocked(G, K) ? ' locked' : ''}${i === gearSel ? ' sel' : ''}${worn ? ' on' : ''}${rarCls(K)}" data-gear="${i}">` +
      (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai" src="${G.sprite(K.id, s)}">` +
      `<div class="cn">${K.name} <span class="st">${gearStarTxt(G, K.id)}</span></div>${rarTag(K)}</div>`;
  }).join('');
  gearDress();
  renderAct();
  if (inLobby) heroGun(-1);
}
function renderGearDetail() {
  const G = gearNow(), B = G.list[gearSel], st = gearShown(G, B), have = G.stars(B.id);
  const specs = GEAR_STATS.filter(([f]) => B[f]).map(([f, k, fmt]) => [k + ' BY STAR', B[f].map(fmt).join(' / ')]);
  if (SET_TXT[B.id]) specs.push(['FULL SET', SET_TXT[B.id]]);
  specs.push(['UNLOCKS AT', 'LVL ' + B.unlock], ['PRICE', COIN + B.price],
    ['STATUS', prof[G.on] === B.id && have ? 'WEARING' : have ? 'OWNED' : gearLocked(G, B) ? ico('lock') + ' LOCKED' : 'NOT OWNED']);
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dn">${B.name} ${rarTag(B)} <span class="st">${gearStarTxt(G, B.id)}</span></div>` +
    `<p>${G.about[B.id] ?? ''}</p><div class="ds">${specs.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow(wearCat + ':' + B.id + st, g => G.model(B.id, st, g), G.face);
}
function renderGearAct() {
  const G = gearNow(), B = G.list[gearSel], st = G.stars(B.id), worn = prof[G.on] === B.id && st;
  let btns;
  if (gearLocked(G, B)) btns = `<button disabled>${ico('lock')} UNLOCKS AT LVL ${B.unlock}</button>`;
  else if (!st) btns = `<button data-gbuy="1" ${prof.coins < B.price ? 'disabled' : ''}>BUY ${COIN}${B.price}</button>`;
  else {
    btns = worn ? '<button data-goff="1">TAKE OFF</button>' : '<button data-gwear="1">WEAR</button>';
    if (st < 3) btns += `<button data-gup="1" ${prof.coins < gearUpg(G, B) ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${gearUpg(G, B)}</button>`;
  }
  const u = G.using(B.id), pick = st > 1 ? lvPick('gu', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  const body = statBoxes(gearLines(B, gearShown(G, B)).map(([k, v]) => [GEAR_SHORT[k] ?? k, v, ''])) + (worn ? setOn(B.id) : st ? '' : '<div class="tn">NOT OWNED · SHOWN AT ' + starRow(1) + '</div>');
  $('armAct').innerHTML = actCard(B.name + ' ' + rarTag(B), gearStarTxt(G, B.id), body, pick, btns);
  placeAct();
}
// boots and hats buttons
function gearClick(d) {
  const G = GEAR[wearCat], B = G?.list[gearSel]; if (!B) return;
  const st = G.stars(B.id), own = prof[G.own] ??= {}, use = prof[G.use] ??= {};
  if (d.gbuy) {
    if (st || prof.coins < B.price || prof.lv < B.unlock) return;
    prof.coins -= B.price; own[B.id] = 1; prof[G.on] = B.id; sfx('buy');
  } else if (d.gup) {
    if (!st || st >= 3 || prof.coins < gearUpg(G, B)) return;
    prof.coins -= gearUpg(G, B); own[B.id] = st + 1; delete use[B.id]; sfx('upgrade');
  } else if (d.gwear) { prof[G.on] = B.id; sfx('equip'); }
  else if (d.goff) { prof[G.on] = ''; sfx('equip'); }
  else if (d.gu) {
    const u = Math.max(1, Math.min(st, G.using(B.id) + +d.gu));
    if (u === st) delete use[B.id]; else use[B.id] = u;
    sfx('equip');
  }
  saveProf(); showProf();
}
// armor changed mid-match
function armorSync(fill = true) {
  if (!inMatch()) return;
  const T = armorOf(wornArmor()), hp = T?.hp ?? 0, gain = fill ? Math.max(0, hp - P.maxArmor) : 0;
  P.maxArmor = hp; P.dr = T?.dr ?? 0; P.armor = Math.min(P.maxArmor, P.armor + gain);
}

// ---- spinning model in the details view
let pv = null;
function pvShow(key, build, face) {
  if (!pv) {
    const cv = document.createElement('canvas'); cv.id = 'detCv';
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 2, .01, 50), spin = new THREE.Group();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x3a4a40, 1.5), spin);
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(2, 3, 4); sc.add(key);
    pv = { cv, r, sc, cam, spin, key: '', on: false, t: 0, drag: null, v: .7 };
    // drag to turn it
    cv.addEventListener('pointerdown', e => { pv.drag = [e.clientX, e.clientY]; pv.v = 0; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); });
    cv.addEventListener('pointermove', e => {
      if (!pv.drag) return;
      const dx = e.clientX - pv.drag[0], dy = e.clientY - pv.drag[1]; pv.drag = [e.clientX, e.clientY];
      spin.rotation.y += dx * .012; spin.rotation.x = Math.max(-.7, Math.min(.7, spin.rotation.x + dy * .008));
      pv.v = dx * .012 * 60;
    });
    const end = () => { pv.drag = null; cv.classList.remove('drag'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  $('detView').append(pv.cv);
  if (pv.key !== key) {
    pv.key = key;
    pv.spin.clear();
    const g = new THREE.Group(); build(g);
    const box = new THREE.Box3().setFromObject(g), sph = box.getBoundingSphere(new THREE.Sphere());
    g.position.sub(sph.center); pv.spin.add(g);
    pv.rad = sph.radius; pv.halfH = (box.max.y - box.min.y) / 2; pvFit();
    pv.spin.rotation.set(0, face, 0); pv.v = .7;
  }
  if (!pv.on) { pv.on = true; pv.t = performance.now(); requestAnimationFrame(pvTick); }
}
// fit the model in view
function pvFit() {
  const tv = Math.tan(THREE.MathUtils.degToRad(pv.cam.fov / 2)), th = tv * pv.cam.aspect;
  const d = Math.max(pv.rad / th * 1.1, pv.halfH / tv * 1.25 + pv.rad);
  pv.cam.position.set(0, d * .22, d); pv.cam.lookAt(0, 0, 0);
}
function pvTick(now) {
  if (!armOpen || !armDet) { pv.on = false; return; }
  const dt = Math.min(.1, (now - pv.t) / 1000); pv.t = now;
  const w = pv.cv.clientWidth, h = pv.cv.clientHeight;
  if (w && h && (pv.cv.width !== Math.round(w * pv.r.getPixelRatio()) || pv.cv.height !== Math.round(h * pv.r.getPixelRatio()))) {
    pv.r.setSize(w, h, false); pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix(); pvFit();
  }
  if (!pv.drag) {
    pv.v += (.7 - pv.v) * Math.min(1, dt * 1.5); pv.spin.rotation.y += pv.v * dt;
    pv.spin.rotation.x *= Math.exp(-dt * 1.2);
  }
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
// click a card to pick it, again for details
$('armList').addEventListener('click', e => {
  const c = e.target.closest('.card'); if (!c) return;
  if (c.dataset.cust) { openCust(); return; }
  if (c.dataset.dbuy) { drawBuy(); return; }
  if (c.dataset.dnew) { openDraw(-1); return; }
  if (c.dataset.skin) { drawSure = -1; wearLook(+c.dataset.skin); renderArmory(); return; }
  if (c.dataset.armor) { if (armorCard) { armDet = true; armorPrev = basicWorn() || 1; } else { armorCard = true; suitSel = ''; } sfx('ui'); renderArmory(); return; }
  if (c.dataset.suit) { const id = c.dataset.suit; if (suitSel === id) armDet = true; else { suitSel = id; armorCard = false; } sfx('ui'); renderArmory(); return; }
  if (c.dataset.gear) { const i = +c.dataset.gear; if (i === gearSel) armDet = true; else gearSel = i; sfx('ui'); renderArmory(); return; }
  const i = +c.dataset.i;
  if (i === armSel) armDet = true; else armSel = i;
  sfx('ui'); renderArmory();
});
function armClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.cust) { openCust(); return; }
  if (b.dataset.dedit) { openDraw(+b.dataset.dedit); return; }
  if (b.dataset.ddel) { const i = +b.dataset.ddel; if (drawSure === i) { drawSure = -1; drawDelete(i); } else { drawSure = i; sfx('ui'); renderAct(); } return; }
  if (b.dataset.pg) { if (b.dataset.pg !== armPage) { armPage = b.dataset.pg; armDet = false; armorPrev = 0; armorCard = false; suitSel = ''; armSel = -1; gearSel = -1; sfx('ui'); } }
  else if (b.dataset.wc) { if (b.dataset.wc !== wearCat) { wearCat = b.dataset.wc; armDet = false; armorCard = false; suitSel = ''; armorPrev = 0; gearSel = -1; sfx('ui'); } }
  else if (b.dataset.gbuy || b.dataset.gup || b.dataset.gwear || b.dataset.goff || b.dataset.gu) gearClick(b.dataset);
  else if (b.dataset.av) { armorStep(+b.dataset.av); return; }
  else if (b.dataset.sbuy || b.dataset.sup || b.dataset.swear || b.dataset.soff || b.dataset.su) suitClick(b.dataset);
  else if (b.dataset.wa) wearStar(basicWorn() + +b.dataset.wa);
  else if (b.dataset.wear) wearStar(+b.dataset.wear, true);
  else if (b.dataset.use) {
    const i = armSel, st = gunStars(i), u = Math.max(1, Math.min(st, gunUse(i) + +b.dataset.use));
    if (u === st) delete prof.use[BASE[i].id]; else prof.use[BASE[i].id] = u;
    saveProf(); armSync(i, 'use'); sfx('equip');
  }
  else if (b.dataset.arm) {
    const n = myArmor(), T = armorOf(n + 1); if (!T || prof.coins < T.price || prof.lv < T.unlock) return;
    prof.coins -= T.price; prof.armor = n + 1; prof.armorUse = 0; if (armDet) armorPrev = n + 1; saveProf(); showProf();
    armorSync(); sfx(n ? 'upgrade' : 'buy');
  }
  else if (b.dataset.det) { armDet = !armDet; if (armDet && armPage === 'wear' && wearCat === 'armor') armorPrev = basicWorn() || 1; sfx('ui'); }
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
$('armAct').addEventListener('pointerdown', e => e.stopPropagation());
$('heroAct').addEventListener('pointerdown', e => e.stopPropagation());
const armIcon = () => $('armIcon').src = SPRITES[loadoutGun('primary')]; // ARMORY button shows your primary
armIcon();
function armShow(on) {
  $('armory').style.display = on ? 'flex' : 'none';
  $('armAct').style.display = on ? 'flex' : 'none';
  if (!on) $('heroAct').style.display = 'none';
  if (inLobby) { $('lobbyUI').style.display = on ? 'none' : ''; }
  else $('menu').style.display = on || locked || shopOpen || matchOver ? 'none' : 'flex';
}
function openArmory() { armOpen = true; armDet = false; armSel = -1; armorCard = false; suitSel = ''; armShow(true); renderArmory(); }
function closeArmory() { if (!armOpen) return; armOpen = false; armShow(false); armIcon(); armorPrev = 0; gearSel = -1; suitSel = ''; heroArmor(wornArmor()); wearGear(); }
$('armBtn').addEventListener('click', e => { e.stopPropagation(); openArmory(); }); // don't re-lock the mouse
$('lobbyArm').addEventListener('click', openArmory);
addEventListener('keydown', e => {
  if (armOpen && armDet && armPage === 'wear' && wearCat === 'armor' && !shownSuit() && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { armorStep(e.code === 'ArrowLeft' ? -1 : 1); return; }
  if (e.code !== 'Escape' || !armOpen || $('binds').style.display === 'flex') return;
  if (armDet) { armDet = false; renderArmory(); } else closeArmory();
});
addEventListener('resize', placeAct);
