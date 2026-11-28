// upgrade prices, as a share of the gun price
const UPG = [.75, .9];
// crafted pieces cost titanium bars as well as coins
const cost = (X, p = X.price) => COIN + p + (X.bars ? ' ' + BAR + X.bars : ''), barShort = X => (prof.bars | 0) < (X.bars | 0);
const barHint = X => X.bars ? `<div class="tn">${BAR}${prof.bars | 0} OF ${X.bars} BARS · ${barNext() ? `1 EVERY ${BAR_XP} XP AT LVL ${LV_MAX}` : 'YOU HAVE ALL YOU NEED'}</div>` : '';
let armCat = 'primary', armOpen = false, armSel = -1, armDet = false, armPick = false, gearPick = false, skinPick = -1; // picks: clicked, not just shown
const gunStars = i => prof.guns[BASE[i].id] ?? 0; // 0 = not bought
// stars you use in a match (bots never get more)
const gunUse = i => { const st = gunStars(i), u = prof.use?.[BASE[i].id]; return u ? Math.max(1, Math.min(st, u)) : st; };
const upgPrice = i => Math.round(BASE[i].price * UPG[gunStars(i) - 1]);
const inMatch = () => !inLobby && pvp() && !matchOver;

const shotTime = s => s.charge ? s.charge + s.rate : perShot(s); // a charge gun's full shot takes its charge time too
// main stats for a gun card
function mainStats(i, L = Math.max(0, gunUse(i) - 1)) {
  const w = BASE[i], s = statsAt(i, L);
  const per = v => v >= 10 ? Math.round(v) : +v.toFixed(1);
  return [
    ['DAMAGE', w.beam ? Math.round(s.dmg / s.rate) : s.dmg * w.pellets, w.beam ? '/SEC' : ''],
    ['FIRE RATE', w.beam ? 'BEAM' : per(1 / (w.mag === 1 && !w.melee ? Math.max(s.rate, s.reload) : shotTime(s))), w.beam ? '' : '/SEC'],
    ['CAPACITY', w.inf ? ico('inf') : s.mag, ''],
    ['MOBILITY', w.mob ?? 60, ''],
  ].filter(r => !(w.melee && r[0] === 'CAPACITY'));
}
// stats per star for the details view
function starTable(i) {
  const w = BASE[i], S = [0, 1, 2].map(L => statsAt(i, L)), rows = [];
  rows.push(['DAMAGE', ...S.map(s => w.beam ? Math.round(s.dmg / s.rate) + '/s' : s.dmg * w.pellets)]);
  if (!w.beam && S[2].rate !== S[0].rate) rows.push(['FIRE RATE', ...S.map(s => +(1 / s.rate).toFixed(1) + '/s')]);
  if (!w.beam && (w.mag > 1 || w.melee)) rows.push(['DMG / SEC', ...S.map(s => Math.round(s.dmg * w.pellets / shotTime(s)))]);
  if (w.mag > 1) rows.push(['CAPACITY', ...S.map(s => s.mag)]);
  if (!w.melee && !w.pool) rows.push(['RELOAD', ...S.map(s => s.reload.toFixed(2) + 's')]);
  if (w.jump) rows.push(['JUMP', ...w.jump.map(j => '+' + Math.round(j * 100) + '%')]);
  return rows;
}
const statBoxes = rows => `<div class="ms" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr))">${rows.map(([k, v, u]) => `<div><span>${k}</span><b>${v}${u ? `<small>${u}</small>` : ''}</b></div>`).join('')}</div>`;
// one size for every value in a row of boxes, small enough that the widest still fits on its line
function fitStats(root) {
  for (const g of root.querySelectorAll('.ms')) {
    const bs = [...g.querySelectorAll('b')]; let k = 1;
    for (const b of bs) b.style.fontSize = '';
    for (const b of bs) { const room = b.parentElement.clientWidth - 6, w = b.getBoundingClientRect().width; if (room > 0 && w > room) k = Math.min(k, room / w); }
    const f = bs.length && parseFloat(getComputedStyle(bs[0]).fontSize);
    if (k < 1) for (const b of bs) b.style.fontSize = Math.max(11, Math.floor(f * k)) + 'px';
  }
}
const setAct = html => { $('armAct').innerHTML = html; fitStats($('armAct')); };
// rarity: a coloured badge by names, a stripe along the bottom of cards
const rarTag = o => { const [n, c] = RARITY[rarOf(o)]; return `<span class="rt" style="--rc:${c}">${n}</span>`; };
const catTag = w => `<span class="rt" style="--rc:var(--silver)">${CATS[CAT_I[w.cat]][1]}</span>`; // which slot a gun goes in
const gunTags = w => `<span class="rts">${rarTag(w)}${catTag(w)}</span>`;
const RAR_GLOW = { common: .12, rare: .2, epic: .25, legend: .3, mythic: .36 }; // glow up from a card's bottom edge
const rarCls = o => `" style="--rc:${RARITY[rarOf(o)][1]};--rg:${RAR_GLOW[rarOf(o)]}`;
const attrTags = list => list.length ? `<div class="at">${list.map(a => `<span>${a}</span>`).join('')}</div>` : '';
// gun tags
function gunAttrs(w) {
  const a = [];
  if (w.melee) a.push('MELEE');
  else if (w.beam) a.push('BEAM');
  else if (w.action) a.push(w.action);
  else if (w.burst) a.push(w.burst + '-ROUND BURST');
  else if (w.auto) a.push('AUTOMATIC');
  else if (autoFire(w)) a.push('RAPID FIRE');
  else if (w.mag > 1) a.push('SEMI-AUTO');
  if (w.zoom) a.push(w.zoom + 'X ZOOM', w.scope ? 'SCOPE' : w.bow ? 'BOW SIGHT' : w.irons ? 'IRON SIGHTS' : 'HOLO SIGHT');
  if (w.quiet) a.push(w.bow || w.bolt ? 'SILENT' : 'SUPPRESSED');
  if (w.headMul) a.push('HEADSHOT X' + w.headMul);
  if (w.pool) a.push('NO RELOADS');
  if (w.grenade) a.push('BOUNCES', 'EXPLOSIVE');
  if (w.laser || w.lance) a.push('LASER');
  if (w.charge) a.push(w.bow ? 'DRAW TO SHOOT' : 'CHARGE SHOT');
  if (w.windup) a.push('SPINS UP');
  if (w.sweep) a.push('WIDE SWEEP');
  if (w.boomer) a.push('COMES BACK');
  if (w.meteor) a.push('METEOR STRIKE');
  if (w.dual) a.push('ONE IN EACH HAND');
  if (w.globe) a.push('BLIZZARD');
  if (w.sleigh) a.push('ROW OF BLASTS');
  if (w.grow) a.push('GROWS WITH YOU');
  if (w.wisp) a.push('HOMING');
  if (w.saw || w.ricochet) a.push('RICOCHET');
  if (w.seek) a.push('HOMING');
  if (w.vortex) a.push('PULLS IN', 'EXPLOSIVE', 'NO SELF DAMAGE');
  if (w.pierce) a.push('PIERCING');
  if (w.wallBreak) a.push('WALL BREAK');
  if (w.wand) a.push('WAND');
  if (slows(w)) a.push('SLOW');
  if (w.track) a.push('TRACKING');
  if (w.chain) a.push('CHAIN LIGHTNING');
  if (w.knock) a.push('KNOCKBACK');
  if (w.reel) a.push('REELS IN');
  if (w.stun) a.push('STUN');
  if (w.soul) a.push('HEALS ON KILL');
  if (w.rocket) a.push(...w.gust ? ['WIND BLAST', 'BIG LAUNCH'] : ['ROCKET', 'EXPLOSIVE']);
  if (w.cluster) a.push('CLUSTER BOMB');
  if (w.lob) a.push('LOBBED');
  if (w.spell) a.push('FIRE ICE OR WIND', 'EXPLOSIVE', 'NO SELF DAMAGE');
  else if (w.flame || w.flare || w.burn) a.push('FIRE');
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
  wildfire: 'A roaring blaze that leaves the ground burning wherever it lands',
  rocket: 'One rocket, one big boom, and anyone near it feels it',
  finale: 'One big bang, then six more in every colour of the sky',
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
  executioner: 'Quick purple laser bolts that hit hard, shot after shot',
  aerial: 'A cannon full of wind that blows foes away and throws you sky high',
  rubypierce: 'One red beam from a glowing ruby core, through walls and anyone behind them',
  quasar: 'A little quasar spins at its heart and fires a green lance through anything',
  paragon: 'Line them up and one blue beam goes through the lot, walls included',
  windwand: 'A pale wand that throws gusts of wind and blows foes back a step',
  stunwand: 'A crackling wand that zaps foes back and leaves them stuck in place',
  flamewand: 'A wand with an ember tip that throws fireballs and leaves foes burning',
  soulwand: 'A ghostly wand that takes a little life back from every foe it finishes',
  ancientwand: 'An old twisted wand that casts fire, ice or wind and never knows which',
  hornet: 'A striped rifle that stings in bursts of three',
  firefly: 'A little machine pistol that glows as it fires, quick and light on your feet',
  longbow: 'Draw it all the way back and the arrow hits like a sniper',
  rhino: 'A heavy rifle whose big slow rounds hit like a charging rhino',
  boomerang: 'Throw it out, catch it coming back, and hit them both ways',
  juggernaut: 'A huge minigun that takes a moment to spin up, then never stops',
  scythe: 'One wide sweep of the blade takes everyone in front of you',
  meteor: 'Mark a spot and a meteor comes down on it a second later',
  sleighbells: 'Dual pistols, jingling all the way',
  candycane: 'A great big peppermint cane, and it does not taste as sweet as it looks',
  nutcracker: 'Both barrels of a toy soldier with a very big bite',
  northstar: 'Follow the star, it only ever leads to one place',
  snowglobe: 'Not for the ones who like to stay warm',
  delivery: "This Santa isn't so friendly",
  salvo: 'Four tubes, four rockets and a very bad day for anyone in front',
  apex: 'A white tiger of a sniper, sitting at the top of the food chain',
  tracker: 'Tag them once and there is nowhere left to hide',
  tempest: 'A captured storm that jumps from one of them to the next',
  wisp: 'Blow the horn and its wisps go off to find someone',
  voidlantern: 'A pocket of night that pulls everyone close, then pops',
  aurora: 'Fill its coils with northern lights, then let go and cut through everything',
  crystal: 'A rifle of living crystal that grows stronger every time you do',
  tishot: 'A drum of shells and a wall of pellets, polished to a shine',
  daybreak: 'A six shooter the colour of sunrise, for players who came back',
  highnoon: 'A lever rifle that settles things at midday, a first week keepsake',
  cutlass: 'A quick blade pulled up from a wreck, still sharp',
  balisong: 'A butterfly knife that cuts quick and flips even quicker',
  monarch: 'The king of butterfly knives, light as a wing and full of tricks',
  harpoon: 'A speargun whose line reels them in to you',
  conch: 'A shell with the sea inside, and its jet shoves them back',
  tipistol: 'A heavy titanium hand cannon that hits like a rifle',
  tisword: 'A broad titanium blade with an edge that never dulls',
  tisaw: 'Throws spinning saw blades that cut through a whole row and skip off walls',
  tisniper: 'A long titanium rifle for one clean shot',
  tirocket: 'Two tubes, two big rockets, all titanium',
  moonbeam: 'A beam of moonlight that bounces off walls and finds whoever hides round the corner',
  bombard: 'An old siege cannon that lobs its ball high and lands it with a crash',
  peregrine: 'Its rockets dive for whoever is in front of them, but they turn slowly',
};
// the next level a growing gun gets stronger at (0: fully grown)
function growNext(i) { const w = BASE[i], a = grown(w, prof.lv); for (let lv = prof.lv + 1; lv <= w.grow.top; lv++) { const b = grown(w, lv); if (Object.keys(w.grow).some(k => a[k] !== b[k])) return lv; } return 0; }
// extra stats for the details view
function gunSpecs(i) {
  const w = BASE[i], out = [], rl = +statsAt(i, Math.max(0, gunUse(i) - 1)).reload.toFixed(1);
  if (!w.melee && w.start) out.push(['RELOAD', rl + 's']);
  if (w.range) out.push(['RANGE', w.range + ' BLOCKS']);
  if (w.rocket || w.grenade || w.spell) out.push(['BLAST RADIUS', boomR(w) + ' BLOCKS']);
  if (w.cluster) out.push(['BOMBLETS', `${CLUSTER_N}, ${Math.round(CLUSTER_K * 100)}% DAMAGE EACH`]);
  if (w.grenade) out.push(['FUSE', GREN_FUSE + 's']);
  if (w.launch && !w.vortex) out.push(['ROCKET JUMP', `${Math.round((w.launch - 1) * 100)}% STRONGER`]);
  if (w.headMul) out.push(['HEADSHOT', 'X' + w.headMul]);
  if (w.spare) out.push([w.bow ? 'SPARE BOLTS' : 'SPARE AMMO', w.mag * w.spare]);
  if (w.burn) out.push(['BURN', `${w.burn * 4} / SEC FOR ${w.burnT}s`]);
  if (w.flare) out.push(['SPLASH RADIUS', FLARE_R + ' BLOCKS']);
  if (w.wisp) out.push(['SEEKS', WISP_SEEK + ' BLOCKS']);
  if (w.saw) out.push(['SKIPS OFF', SAW_BOUNCES + ' WALLS']);
  if (w.ricochet) out.push(['BOUNCES', w.ricochet + ' TIMES'], ['AFTER A BOUNCE', Math.round(RICO_MUL * 100) + '% DAMAGE']);
  if (w.lob) out.push(['LANDING', 'SHOWN BY A RING']);
  if (w.seek) out.push(['SEEKS', SEEK_RANGE + ' BLOCKS']);
  if (w.vortex) out.push(['PULL RADIUS', VOID_PULL_R + ' BLOCKS'], ['BLAST RADIUS', VOID_R + ' BLOCKS']);
  if (w.charge) out.push(['FULL CHARGE', w.charge + 's'], ['QUICK SHOT', Math.round(CHARGE_MIN * 100) + '% DAMAGE'], ['FULLY CHARGED', 'THROUGH WALLS']);
  if (w.jump) out.push(['JUMP', `+${Math.round(w.jump[Math.max(0, gunUse(i) - 1)] * 100)}% HIGHER`]);
  if (slows(w)) out.push(['SLOW', `${Math.round((1 - (w.frost ? FROST_K : SLOW_K)) * 100)}% FOR ${SLOW_T}s`]);
  if (w.knock) out.push(['KNOCKBACK', w.knock >= 1.2 ? 'BIG' : w.knock >= .75 ? 'MEDIUM' : 'SMALL']);
  if (w.reel) out.push(['REELS IN', `UP TO ${REEL_MAX} BLOCKS`]);
  if (w.stun) out.push(['STUN', w.stun + 's']);
  if (w.soul) out.push(['HEAL ON KILL', w.soul + ' HP']);
  if (w.pierce) out.push(['PIERCE', `-${Math.round((1 - PIERCE_FALL) * 100)}% A BODY`]);
  if (w.wallBreak) out.push(['THROUGH WALLS', `${Math.round(WALL_MUL * 100)}% DAMAGE`]);
  if (w.grow) out.push(['GROWS WITH YOU', growNext(i) ? 'NEXT AT LVL ' + growNext(i) : 'FULLY GROWN']);
  if (w.chest) out.push(['FOUND IN', w.gift ? 'THE WELCOME WEEK, GOLDEN CHESTS' : 'GOLDEN CHESTS']);
  if (w.season) out.push(['EARNED IN', 'THE ' + seasonOf(w.season).name + ' SEASON']);
  else if (!w.start) out.push(['UNLOCKS AT', 'LVL ' + (w.unlock ?? 0)], ['PRICE', COIN + w.price]);
  return out;
}
// a category's list, by level. A chest gun joins it once it's yours, at its own level (your level, if it grows with you)
const listAt = i => { const w = BASE[i]; return w.grow ? Math.min(prof.lv, w.grow.top) + .5 : w.unlock ?? 0; };
const catList = () => BASE.map((w, i) => i).filter(i => BASE[i].cat === armCat && (!BASE[i].chest && !BASE[i].season || hasGun(i))).sort((a, b) => listAt(a) - listAt(b));
const RAR_RANK = { mythic: 4, legend: 3, epic: 2, rare: 1, common: 0 };
const exclList = () => BASE.map((w, i) => i).filter(i => BASE[i].chest || BASE[i].season && (hasGun(i) || seasonOn(BASE[i].season))).sort((a, b) => RAR_RANK[rarOf(BASE[b])] - RAR_RANK[rarOf(BASE[a])] || a - b); // never sold: the EXCLUSIVE page, rarest first (a season's while it's on, after that only if they're yours)
const isLocked = i => !hasGun(i) && prof.lv < (BASE[i].unlock ?? 0);
const chestOnly = i => (BASE[i].chest || BASE[i].season) && !hasGun(i); // not for sale: only in golden chests, or earned in its season
const starTxt = i => BASE[i].start ? '' : starRow(gunUse(i), gunStars(i), 3);
// star picker under your character
const lvPick = (k, label, lo, hi) => `<div class="lvp"><button data-${k}="-1" ${lo ? 'disabled' : ''}>${ico('left')}</button><span>${label}</span><button data-${k}="1" ${hi ? 'disabled' : ''}>${ico('right')}</button></div>`;
// armory pages and their sections
const PAGES = [['weapons', 'WEAPONS'], ['wear', 'WEAR'], ['exclusive', 'EXCLUSIVE'], ['index', 'INDEX']];
// the gun index: every gun numbered, starters first, then roughly in the order they joined (new ones go on the end)
const GUN_ORDER = ['voxel', 'shotgun', 'ar', 'sniper', 'knife', 'flame', 'flare', 'eradicator', 'rocket', 'hitman', 'heatray', 'thrasher', 'semisniper', 'herosword', 'shockbeam', 'tigerbite', 'executioner',
  'trex', 'starsmasher', 'blazesaber', 'windsaber', 'warhammer', 'crossbow', 'grenade', 'aerial', 'rubypierce', 'paragon', 'frostwand', 'windwand', 'stunwand', 'flamewand', 'soulwand', 'ancientwand',
  'hornet', 'salvo', 'apex', 'tracker', 'tempest', 'wisp', 'voidlantern', 'crystal', 'aurora',
  'tishot', 'tipistol', 'tisword', 'tisaw', 'tisniper', 'tirocket', 'daybreak', 'highnoon', 'cutlass', 'harpoon', 'conch', 'balisong', 'monarch', 'quasar', 'wildfire', 'finale', 'moonbeam', 'bombard', 'peregrine',
  'firefly', 'longbow', 'rhino', 'boomerang', 'juggernaut', 'scythe', 'meteor',
  'sleighbells', 'candycane', 'nutcracker', 'northstar', 'snowglobe', 'delivery'];
const indexList = () => [...GUN_ORDER.map(gi), ...BASE.map((w, i) => i).filter(i => !GUN_ORDER.includes(BASE[i].id))], gunNo = i => indexList().indexOf(i) + 1;
function renderIndex() {
  const list = indexList(), have = list.filter(hasGun).length;
  $('armTabs').style.display = 'none'; $('armList').style.display = ''; $('armDet').style.display = 'none';
  $('armList').innerHTML = list.map((i, k) => {
    const w = BASE[i], own = hasGun(i);
    return `<div class="card rr idx${own ? '' : ' miss'}${rarCls(w)}" data-idx="${i}"><span class="tag">${String(k + 1).padStart(2, '0')}</span><img class="ai" src="${gunPic(i)}"><div class="cn">${w.name}</div></div>`;
  }).join('');
  const by = Object.keys(RARITY).map(r => [r, list.filter(i => rarOf(BASE[i]) === r)]).filter(([, l]) => l.length);
  setAct(`<div class="an"><span>GUN INDEX</span></div>` + statBoxes([['COLLECTED', `${have} / ${list.length}`, '']]) +
    `<div class="at">${by.map(([r, l]) => `<span style="color:${RARITY[r][1]}">${RARITY[r][0]} ${l.filter(hasGun).length}/${l.length}</span>`).join('')}</div>`);
  heroGun(-1); placeAct();
}
const WEAR_CATS = [['skins', 'SKINS'], ['armor', 'ARMOR'], ['boots', 'BOOTS'], ['hats', 'HATS'], ['kfx', 'KILL FX']];
let armPage = 'weapons', wearCat = 'skins', armorPrev = 0, armorCard = false, gearSel = -1, suitSel = '';
let armBare = false; // after TAKE OFF he shows what you wear, not the picked card
const myArmor = () => Math.min(ARMOR_MAX, prof.armor | 0);
const pageIcon = p => p === 'weapons' ? gunPic(loadoutGun('primary')) : p === 'exclusive' ? gunPic(exclList()[0]) : p === 'index' ? gunPic(gi(GUN_ORDER[0])) : armorPic(Math.max(0, wornArmor() - 1));
let skinGun = -1, skinSel = ''; // the gun whose skins are being looked at, and which of them
let exclTab = 'all', setSel = ''; // the EXCLUSIVE page's two tabs: every one of them, or the sets they make
const exclSets = () => armPage === 'exclusive' && exclTab === 'sets' && setsShown().length > 0;
function renderArmory() {
  $('armInfo').innerHTML = `LVL ${prof.lv}<span class="pc">${COIN}${prof.coins}</span>`;
  $('armPages').innerHTML = PAGES.map(([p, label]) =>
    `<button data-pg="${p}" class="${p === armPage ? 'sel' : ''}${p === 'exclusive' && !exclList().some(hasGun) ? ' dim' : ''}"><img class="ai" src="${pageIcon(p)}"><span>${label}</span></button>`).join('');
  $('armTabs').style.display = armPage === 'exclusive' && !setsShown().length ? 'none' : '';
  if (armPage === 'wear') { renderWear(); return; }
  heroArmor(shownArmor()); wearGear();
  if (armPage === 'index') { renderIndex(); return; }
  const excl = armPage === 'exclusive', list = excl ? exclList() : catList(), on = i => loadoutGun(BASE[i].cat) === i;
  if (excl && setsShown().length) $('armTabs').innerHTML = [['all', 'ALL', gunPic(list[0])], ['sets', 'SETS', gunPic(gi(setsShown()[0].guns[0]))]].map(([t, label, pic]) =>
    `<button data-xt="${t}" class="${(exclSets() ? 'sets' : 'all') === t ? 'sel' : ''}"><img class="ai" src="${pic}"><span>${label}</span></button>`).join('');
  if (exclSets()) { renderSets(); return; }
  if (skinGun >= 0) { if (!hasGun(skinGun) || !gsTiers(BASE[skinGun]).length) skinGun = -1; else { renderGunSkins(); return; } }
  heroSkin = null;
  if (!excl) $('armTabs').innerHTML = CATS.map(([c, label], s) =>
    `<button data-c="${c}" class="${c === armCat ? 'sel' : ''}"><img class="ai" src="${gunPic(loadoutGun(c), gunSkin(loadoutGun(c)))}"><span>${label}</span></button>`).join('');
  if (!list.includes(armSel)) { armSel = list.find(on) ?? list[0]; armPick = false; }
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (armDet) renderDetail();
  else $('armList').innerHTML = list.map(i => {
    const w = BASE[i], tri = i === trialNow() && trialOk(), tag = tri ? (on(i) ? `${ico('check')} TRYING` : 'FREE THIS WEEK') : chestOnly(i) ? `${ico('lock')} ${w.season ? seasonOf(w.season).name : w.gift ? 'WELCOME GIFT' : 'GOLDEN CHEST'}` : isLocked(i) ? `${ico('lock')} LVL ${w.unlock}` : !hasGun(i) ? COIN + w.price : on(i) ? 'EQUIPPED' : '';
    return `<div class="card rr${!tri && (isLocked(i) || chestOnly(i)) ? ' locked' : ''}${tri ? ' trial' : ''}${i === armSel && armPick ? ' sel' : ''}${on(i) ? ' on' : ''}${rarCls(w)}" data-i="${i}">` +
      (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai" src="${gunPic(i, gunSkin(i))}">` +
      `<div class="cn">${w.name}${hasGun(i) ? ` <span class="st">${starTxt(i)}</span>` : ''}</div></div>`; // stars once it's yours: none is what not having it means
  }).join('');
  renderAct();
  if (inLobby) heroGun(armSel);
}
// a gun's skins: the one it comes in and the ones it earns, each with what it takes
function renderGunSkins() {
  const i = skinGun, w = BASE[i], T = ['', ...gsTiers(w)], on = gunSkin(i);
  if (!T.includes(skinSel)) skinSel = on;
  armDet = false; armSel = i; $('armList').style.display = ''; $('armDet').style.display = 'none';
  $('armList').innerHTML = T.map(t => { const has = gsHas(i, t);
    return `<div class="card rr gsk${t === skinSel ? ' sel' : ''}${t === on ? ' on' : ''}${has ? '' : ' locked'}" data-gsk="${t}" style="--rc:${t ? GS_COL[t] : '#c9ced6'}">` +
      (t === on ? '<span class="tag">WEARING</span>' : has ? '' : `<span class="tag">${ico('lock')}</span>`) + `<img class="ai" src="${gunPic(i, t)}"><div class="cn">${gsName(i, t)}</div></div>`; }).join('');
  renderSkinsAct(); heroSkin = skinSel; if (inLobby) heroGun(i);
}
function renderSkinsAct() {
  renderHide();
  const i = skinGun, w = BASE[i], t = skinSel, T = gsTiers(w), at = T.indexOf(t), has = gsHas(i, t), on = gunSkin(i) === t, prev = at > 0 && !gsDone(i, T[at - 1]) ? T[at - 1] : '';
  const goals = gsGoals(w, t).map(G => { const n = Math.min(G[1], gsAt(w.id, G[0])), ok = n >= G[1]; return `<div class="snG${ok ? ' ok' : ''}"><span>${gsText(G)}</span><em>${ok ? ico('check') : `${n}/${G[1]}`}</em><u><i style="width:${n / G[1] * 100}%"></i></u></div>`; }).join('');
  const body = t ? `<div class="gsl">${has ? '' : `<div class="tn">EARN IT WITH THE ${w.name.toUpperCase()}</div>`}${goals}${prev ? `<div class="tn">${ico('lock')} AFTER ITS ${gsName(i, prev).toUpperCase()} SKIN</div>` : ''}</div>` : '';
  const btns = (on ? `<button class="eq" disabled>${ico('check')} WEARING</button>` : has ? `<button data-gswear="${t}">WEAR IT</button>` : `<button disabled>${ico('lock')} LOCKED</button>`) + `<button data-gsback="1">${ico('left')} BACK</button>`;
  setAct(actCard(`${w.name} · ${gsName(i, t)}`, '', body, '', btns));
  placeAct();
}
// the SETS tab: a card for each set, its weapons in a row, what owning them all pays
function renderSets() {
  const list = setsShown(); if (!list.some(T => T.id === setSel)) setSel = list[0].id;
  armDet = false; $('armList').style.display = ''; $('armDet').style.display = 'none';
  $('armList').innerHTML = list.map(T => {
    const n = setHas(T), a = ACH.find(x => x.id === T.ach), full = n === T.guns.length;
    return `<div class="card setc${T.id === setSel ? ' sel' : ''}${full ? ' on' : ''}" data-set="${T.id}" style="--rc:${T.col}"><span class="tag">${full ? ico('check') + ' COMPLETE' : n + ' / ' + T.guns.length}</span><div class="cn">${T.name}</div><div class="setg">` +
      T.guns.map(id => `<span class="${prof.guns[id] ? 'own' : ''}" title="${BASE[gi(id)].name}"><img class="ai" src="${gunPic(gi(id))}"></span>`).join('') + '</div>' +
      (a ? `<div class="setp">${achGot(a) ? ico('check') + ' REWARD CLAIMED' : (full ? 'YOURS TO CLAIM' : 'ALL ' + T.guns.length) + ' ' + achPayTags(a)}</div>` : '') + '</div>';
  }).join('');
  renderSetAct();
  const T = list.find(x => x.id === setSel), show = T.guns.find(id => prof.guns[id]) ?? T.guns[0]; armSel = gi(show);
  if (inLobby) heroGun(armSel);
}
function renderSetAct() {
  renderHide();
  const T = setsShown().find(x => x.id === setSel), n = setHas(T), a = ACH.find(x => x.id === T.ach), full = n === T.guns.length, on = T.guns.filter(id => prof.guns[id] && prof.loadout[BASE[gi(id)].cat] === id).length;
  const rows = T.guns.map(id => { const w = BASE[gi(id)], own = !!prof.guns[id]; return `<div class="setr${own ? ' own' : ''}"><span>${CATS[CAT_I[w.cat]][1]}</span><b>${w.name}</b><em>${own ? ico('check') : ico('lock')}</em></div>`; }).join('');
  let btns = n && on === n ? `<button class="eq" disabled>${ico('check')} EQUIPPED</button>` : `<button data-eqset="${T.id}" ${full ? '' : 'disabled'}>${full ? 'EQUIP THE SET' : ico('lock') + ' NOT OWNED'}</button>`;
  if (a && full && !achGot(a)) btns += `<button class="go" data-setgift="${a.id}">CLAIM ${achPayTags(a)}</button>`;
  setAct(actCard(T.name, '', `<div class="setl">${rows}</div>`, '', btns));
  placeAct();
}
// ---- the item card in the corner
const actCard = (name, stars, body, pick, btns) => `<div class="an"><span>${name} <span class="st">${stars}</span></span>` +
  (armDetOk() ? `<button class="more" data-det="1">${armDet ? ico('left') + ' LIST' : 'DETAILS ' + ico('right')}</button>` : '') + `</div>${body}${pick}<div class="ab">${btns}</div>`;
const armDetOk = () => !exclSets() && skinGun < 0 && (armPage !== 'wear' || (wearCat !== 'skins' && wearCat !== 'kfx' && (wearCat !== 'armor' || armorCard || !!suitSel)));
function renderAct() {
  renderHide();
  if (armPage === 'wear') { if (wearCat === 'kfx') renderKfxAct(); else if (isGear()) renderGearAct(); else if (wearCat === 'skins') renderSkinAct(); else if (shownSuit()) renderSuitAct(); else renderArmorAct(); return; }
  const i = armSel, w = BASE[i], st = gunStars(i), eq = loadoutGun(w.cat);
  let btns;
  const tr = i === trialNow() && trialOk() ? (i === eq ? `<button class="eq" disabled>${ico('check')} TRYING IT</button>` : '<button class="go" data-try="1">TRY IT FREE</button>') : '';
  if (chestOnly(i)) btns = BASE[i].season ? `<button data-season="${BASE[i].id}">${ico('gift')} EARN IT ON THE SEASON PAGE</button>` : `<button disabled>${ico('lock')} ${BASE[i].gift ? 'A WELCOME WEEK GIFT, OR IN GOLDEN CHESTS' : 'FOUND IN GOLDEN CHESTS'}</button>`;
  else if (isLocked(i)) btns = `<button disabled>${ico('lock')} UNLOCKS AT LVL ${w.unlock}</button>`;
  else if (!hasGun(i)) btns = `<button data-buy="${i}" ${prof.coins < w.price ? 'disabled' : ''}>BUY ${COIN}${w.price}</button>`;
  else {
    btns = i === eq ? '<button class="eq" disabled>EQUIPPED</button>' : `<button data-eq="${i}">EQUIP</button>`;
    if (!w.start && st < 3) btns += `<button data-up="${i}" ${prof.coins < upgPrice(i) ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${upgPrice(i)}</button>`;
  }
  if (tr) btns = tr + btns;
  if (hasGun(i) && gsTiers(w).length) btns += `<button data-skins="${i}" title="Skins this gun can earn">${ico('star')} SKINS ${gsOwned(i).length}/${gsTiers(w).length}</button>`;
  if (inLobby) btns += `<button data-range="${i}" title="Try it on the target range">${ico('target')} RANGE</button>`;
  const u = gunUse(i), pick = !w.start && st > 1 ? lvPick('use', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  setAct(actCard(w.name + ' ' + gunTags(w), starTxt(i), statBoxes(mainStats(i)) + attrTags(gunAttrs(w)), pick, btns));
  placeAct();
}
// SHOOT and RELOAD buttons
function placeAct() {
  placeHide();
  if (!armOpen) return;
  const h = $('heroAct'), on = inLobby && armPage !== 'wear' && armPage !== 'index' && wideArm();
  h.style.display = on ? 'flex' : 'none';
  const W = BASE[armSel], rb = $('heroReload'), insp = !!W?.melee, kind = insp ? 'flair' : 'reload';
  rb.style.display = !insp && (W?.inf || W?.pool) ? 'none' : ''; // nothing to reload: wands; a blade gets inspected instead
  if (rb.dataset.k !== kind) { rb.dataset.k = kind; rb.innerHTML = ico(kind); rb.title = insp ? 'Inspect' : 'Reload'; }
  if (!on) return;
  const edge = zRect($('armory')).right;
  if (TOUCH && phoneSide.matches) { // phones: a row under him, between the list and the card
    const c = zRect($('armAct')), right = c.width ? c.left : scr.w;
    h.style.left = Math.max(edge + 6, Math.min(right - 6 - h.offsetWidth, heroScreen.x - h.offsetWidth / 2)) + 'px'; h.style.top = scr.h - 10 - h.offsetHeight + 'px';
  } else { h.style.left = Math.max(edge, heroScreen.x - scr.h * .2 - 50) + 'px'; h.style.top = heroScreen.y + 'px'; }
}
const wideArm = () => TOUCH ? scr.w > scr.h : scr.w > 700; // room for him beside the list
function renderDetail() {
  const i = armSel, w = BASE[i], u = gunUse(i), rows = w.start ? [] : starTable(i);
  const table = rows.length ? `<div class="sk"><span></span>${[1, 2, 3].map(s => `<b class="h${s === u ? ' on' : ''}">${starRow(s)}</b>`).join('')}` +
    rows.map(([k, ...v]) => `<span>${k}</span>${v.map((x, s) => `<b${s + 1 === u ? ' class="on"' : ''}>${x}</b>`).join('')}`).join('') + '</div>' : '';
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dn">${w.name} ${gunTags(w)} <span class="st">${starTxt(i)}</span></div><p>${DESC[w.id] ?? ''}</p>` +
    (table ? `<div class="sh">WHAT EACH STAR DOES</div>${table}` : '') +
    `<div class="ds">${gunSpecs(i).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow(i + ':' + u + ':' + growStage(i), g => makeGun(i, g, Math.max(0, u - 1)), -Math.PI / 2);
}

// ---- WEAR page: hiding what you wear (you keep its stats, and kill cards still show it)
const wearTag = k => 'WEARING' + (hidOn(k) ? ' ' + ico('eyeShut') : '');
const hideOk = () => inLobby && wideArm(); // he's in view, with the eyes beside him
const hideBtn = k => inLobby && !hideOk() ? `<button data-hide="${k}">${ico(hidOn(k) ? 'eye' : 'eyeShut')} ${hidOn(k) ? 'SHOW' : 'HIDE'}</button>` : '';
function hideToggle(k) { prof.hide = (prof.hide | 0) ^ HIDE_BIT[k]; saveProf(); sfx('equip'); }
const HIDE_AT = [['hats', 'hat', 1.78], ['armor', 'armor', 1.1], ['boots', 'boots', .2]]; // [slot, name, height on him]
function renderHide() {
  const a = wornArmor(), b = wornBoots(), h = wornHat(), pic = { armor: a && armorPic(a - 1), boots: b && bootPic(b.id, b.st), hats: h && hatPic(h.id, h.st, h.skin) };
  $('heroHide').innerHTML = armPage !== 'wear' || wearCat === 'kfx' ? '' : HIDE_AT.filter(([k]) => pic[k]).map(([k, name]) =>
    `<button data-hide="${k}"${hidOn(k) ? ' class="off"' : ''} title="${hidOn(k) ? 'Show' : 'Hide'} your ${name}"><img src="${pic[k]}"><span class="eb">${ico(hidOn(k) ? 'eyeShut' : 'eye')}</span></button>`).join('');
}
const _hideV = new THREE.Vector3();
function placeHide() {
  const el = $('heroHide'), on = armOpen && hideOk() && armPage === 'wear' && !!el.firstChild;
  el.style.display = on ? 'block' : 'none';
  if (!on) return;
  const px = (x, y) => (_hideV.set(x, hero.position.y + y, 0).project(lobbyCam), (_hideV.x + 1) / 2 * scr.w);
  el.style.left = Math.max(zRect($('armory')).right + (TOUCH && phoneSide.matches ? 6 : -44), 2 * px(0, 1.1) - px(.7, 1.1) - 74) + 'px'; // past the cards (the panel fades out), clear of his shoulders
  let last = -1e9;
  for (const btn of el.children) { // each beside what it hides, never on top of each other
    _hideV.set(0, hero.position.y + HIDE_AT.find(([k]) => k === btn.dataset.hide)[2], 0).project(lobbyCam);
    last = Math.max(last + 62, (1 - _hideV.y) / 2 * scr.h); btn.style.top = last + 'px';
  }
}
$('heroHide').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; hideToggle(b.dataset.hide); renderArmory(); });
$('heroHide').addEventListener('pointerdown', e => e.stopPropagation());

// ---- WEAR page: armor
const ARMOR_DESC = 'Armor soaks up hits before your health does';
function renderWear() {
  const n = myArmor(), w = basicWorn(), T = armorOf(w || 1), sid = shownSuit();
  const tabIcon = c => c === 'skins' ? headPic(prof.look) : c === 'kfx' ? kfxPic(wornKfx()) : c === 'armor' ? armorPic(Math.max(0, wornArmor() - 1)) : (G => { const on = G.worn(); return on ? G.pic(on.id, on.st) : G.pic(G.list[0].id, 1); })(GEAR[c]);
  $('armTabs').innerHTML = WEAR_CATS.map(([c, label]) =>
    `<button data-wc="${c}" class="${c === wearCat ? 'sel' : ''}"><img class="${c === 'skins' ? 'hd ai' : 'ai'}" src="${tabIcon(c)}"><span>${label}</span></button>`).join('');
  if (wearCat === 'skins' || wearCat === 'kfx') armDet = false;
  $('armList').style.display = armDet ? 'none' : '';
  $('armDet').style.display = armDet ? 'flex' : 'none';
  if (wearCat === 'skins') { renderSkins(); return; }
  if (wearCat === 'kfx') { renderKfx(); return; }
  if (isGear()) { renderGear(); return; }
  wearGear();
  if (armDet) { if (sid) renderSuitDetail(); else renderArmorDetail(); }
  else {
    const locked = !n && prof.lv < T.unlock, on = n && !wornSuit() && !armorOff(), tag = on ? wearTag('armor') : n ? '' : locked ? `${ico('lock')} LVL ${T.unlock}` : COIN + T.price;
    $('armList').innerHTML = `<p class="wd">${ARMOR_DESC}</p>` +
      `<div class="card rr${locked ? ' locked' : ''}${armorCard ? ' sel' : ''}${on ? ' on' : ''}${rarCls(T)}" data-armor="1">${tag ? `<span class="tag">${tag}</span>` : ''}` +
      `<img class="ai wr" src="${armorPic((w || 1) - 1)}"><div class="cn">${ARMOR_ITEM} <span class="st">${n ? armorStarTxt() : ''}</span></div></div>` +
      SUITS.filter(S => !S.season || suitStars(S.id) || seasonOn(S.season)).map(suitCard).join(''); // a season's in its month, after that only if it's yours
  }
  const show = armBare ? wornArmor() : sid ? suitN(sid, suitShown(sid)) : armDet ? armorPrev : armorCard || !armorOff() ? w || 1 : 0;
  heroArmor(hidOn('armor') && show === wornArmor() ? 0 : show); // a hidden piece stays hidden, anything else you try on shows
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
  const n = myArmor(), w = basicWorn(), next = n < ARMOR_MAX ? armorOf(n + 1) : null, suit = wornSuit(), on = n && !suit && !armorOff();
  let btns = '';
  if (armDet && armorPrev && armorPrev <= n) btns += on && armorPrev === w ? '<button data-aoff="1">TAKE OFF</button>' + hideBtn('armor') : `<button data-wear="${armorPrev}">WEAR ${armorOf(armorPrev).name.toUpperCase()}</button>`;
  else if (!armDet && n) btns += on ? '<button data-aoff="1">TAKE OFF</button>' + hideBtn('armor') : `<button data-wear="${w}">WEAR</button>`;
  if (!next) btns += '<button class="eq" disabled>MAXED</button>';
  else if (prof.lv < next.unlock) btns += `<button disabled>${ico('lock')} ${n ? next.name.toUpperCase() + ' ' : ''}AT LVL ${next.unlock}</button>`;
  else btns += `<button data-arm="1" ${prof.coins < next.price ? 'disabled' : ''}>${n ? starRow(n + 1) + ' ' + next.name.toUpperCase() : 'BUY'} ${COIN}${next.price}</button>`;
  const pick = !armDet && n > 1 ? lvPick('wa', (on ? 'WEARING ' : 'USING ') + armorOf(w).name.toUpperCase(), w <= 1, w >= n) : '';
  const T = armorOf(armDet ? armorPrev : w || 1);
  const body = `<div class="tn">${T.name.toUpperCase()} ${rarTag(T)}${armDet ? '' : !n ? ' NOT OWNED' : on ? ' WEARING' : ''}</div>` + armorBoxes(T);
  setAct(actCard(ARMOR_ITEM, n ? armorStarTxt() : '', body, pick, btns));
  placeAct();
}
function wearStar(s, on = false) {
  const n = myArmor(); s = Math.max(1, Math.min(n, s)); if (s === basicWorn() && !(on && prof.armorOn)) return;
  prof.armorUse = s === n ? 0 : s; if (on) { prof.armorOn = ''; unhide('armor'); } saveProf(); armorSync(false); sfx('equip');
}
// ---- WEAR page: set armor
const SUIT_ABOUT = {
  warrior: 'Thick steel plate for brawlers, slow and heavy but tough to get through',
  raider: 'A light cloak for runners, thinner than plate but quick on its feet',
  ironclad: 'Heavy iron plate that nothing can push around',
  arcane: 'Starry robes for wand users, light on armor but full of magic',
  thornwood: 'Living bark that grows back once the shooting stops',
  skyrunner: 'Featherlight plates with glider wings for anyone who lives in the air',
  titanium: 'Polished titanium plate, as tough as steel at half the weight',
  elf: 'A workshop elf\'s tunic, quick on its feet and cheered up by every kill',
};
const SET_TXT = { warrior: '+5% DMG, +5% DMG CUT', raider: 'TRIPLE JUMP, +8% SPEED', ironclad: '+5% DMG CUT, NO KNOCKBACK, NO SLOWS OR STUNS',
  arcane: '+10% WAND DMG, WAND EFFECTS LAST 50% LONGER', thornwood: 'REGROWS AFTER 2S', skyrunner: 'SABER AIR DASH, +4% SPEED', titanium: '+5% DMG, +5% DMG CUT, +4% SPEED', elf: '+4% SPEED, +4% DMG CUT' };
const SUIT_SPECIAL = { thornwood: 'REGROWS AFTER 4S', skyrunner: 'HOLD JUMP TO GLIDE', elf: 'HEALTH BACK FOR EVERY KILL' };
const suitSpecial = id => SUIT_SPECIAL[id] ? `<div class="at sb"><span>SPECIAL</span><span>${SUIT_SPECIAL[id]}</span></div>` : '';
const shownSuit = () => armPage === 'wear' && wearCat === 'armor' ? suitSel || (!armorCard && wornSuit()?.id) || '' : '';
const suitShown = id => Math.max(1, suitUse(id));
const suitStarTxt = id => starRow(suitUse(id), suitStars(id), SUIT_ST);
const seasonGear = X => !!X.season, gearFrom = X => seasonOf(X.season).name + ' CHESTS'; // a season's wear: only from its chests
const suitLocked = S => !suitStars(S.id) && (seasonGear(S) || prof.lv < S.unlock[0]);
const lvlName = v => LEVEL_NAMES[v ?? 2];
const armorBoxes = T => statBoxes([['ARMOR', '+' + T.hp, ''], ['DMG CUT', T.dr ? pct(T.dr) : 'NONE', ''], ['MOBILITY', lvlName(T.mob), ''], ['JUMP', lvlName(T.jump), '']]);
// a full set: its cards get an outline and SET ACTIVE, its corner card the bonus
const setBonus = id => youFx().set === id ? `<div class="at sb"><span>SET BONUS</span>${SET_TXT[id].split(', ').map(t => `<span>${t}</span>`).join('')}</div>` : '';
const setTag = (id, worn) => worn && youFx().set === id ? ['<span class="sa">SET ACTIVE</span>', ' set'] : ['', ''];
function suitCard(S) {
  const st = suitStars(S.id), worn = wornSuit()?.id === S.id, locked = suitLocked(S), [sa, set] = setTag(S.id, worn);
  const tag = locked ? `${ico('lock')} ${seasonGear(S) ? gearFrom(S) : 'LVL ' + S.unlock[0]}` : !st ? cost(S, S.price[0]) : worn ? wearTag('armor') : '';
  return `<div class="card rr${locked ? ' locked' : ''}${suitSel === S.id ? ' sel' : ''}${worn ? ' on' : ''}${set}${rarCls(S)}" data-suit="${S.id}">` +
    sa + (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai wr" src="${armorPic(suitN(S.id, suitShown(S.id)) - 1)}">` +
    `<div class="cn">${S.name} <span class="st">${suitStarTxt(S.id)}</span></div></div>`;
}
function renderSuitDetail() {
  const id = shownSuit(), S = suitOf(id), have = suitStars(id), n = suitN(id, suitShown(id));
  const by = (a, f) => a.every(v => v === a[0]) ? f(a[0]) : a.map(f).join(' / ');
  const rows = [['ARMOR BY STAR', by(S.hp, v => '+' + v)], ['DAMAGE CUT BY STAR', by(S.dr, pct)], ['MOBILITY', lvlName(S.mob)], ['JUMP', lvlName(S.jump)],
    ...SUIT_SPECIAL[id] ? [['SPECIAL', SUIT_SPECIAL[id]]] : [], ['FULL SET', SET_TXT[id]], ['STARS AT LVL', by(S.unlock, v => v)], [S.bars ? 'CRAFT FOR' : 'PRICE', cost(S, S.price[0])],
    ['STATUS', wornSuit()?.id === id ? 'WEARING' : have ? 'OWNED' : suitLocked(S) ? ico('lock') + ' LOCKED' : 'NOT OWNED']];
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dn">${S.name} ${rarTag(S)} <span class="st">${suitStarTxt(id)}</span></div>` +
    `<p>${SUIT_ABOUT[id]}</p><div class="ds">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
  pvShow('armor' + n, g => armorModel(n, g), .5);
}
function renderSuitAct() {
  const id = shownSuit(), S = suitOf(id), st = suitStars(id), worn = wornSuit()?.id === id;
  let btns;
  if (suitLocked(S)) btns = `<button disabled>${ico('lock')} ${seasonGear(S) ? 'FOUND IN ' + gearFrom(S) : 'UNLOCKS AT LVL ' + S.unlock[0]}</button>`;
  else if (!st) btns = `<button data-sbuy="1" ${prof.coins < S.price[0] || barShort(S) ? 'disabled' : ''}>${S.bars ? 'CRAFT' : 'BUY'} ${cost(S, S.price[0])}</button>`;
  else {
    btns = worn ? '<button data-soff="1">TAKE OFF</button>' + hideBtn('armor') : '<button data-swear="1">WEAR</button>';
    if (st < SUIT_ST) btns += prof.lv < S.unlock[st] ? `<button disabled>${ico('lock')} ${starRow(st + 1)} AT LVL ${S.unlock[st]}</button>`
      : `<button data-sup="1" ${prof.coins < S.price[st] ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${S.price[st]}</button>`;
  }
  const u = suitUse(id), pick = st > 1 ? lvPick('su', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  const body = armorBoxes(armorOf(suitN(id, suitShown(id)))) + suitSpecial(id) + (worn ? setBonus(id) : st ? '' : '<div class="tn">NOT OWNED · SHOWN AT ' + starRow(1) + '</div>' + barHint(S));
  setAct(actCard(S.name + ' ' + rarTag(S), suitStarTxt(id), body, pick, btns));
  placeAct();
}
// set armor buttons
function suitClick(d) {
  const id = shownSuit(), S = suitOf(id); if (!S) return;
  const st = suitStars(id), own = prof.suits ??= {}, use = prof.suitUse ??= {};
  if (d.sbuy) {
    if (st || S.season || prof.coins < S.price[0] || prof.lv < S.unlock[0] || barShort(S)) return;
    prof.coins -= S.price[0]; if (S.bars) prof.bars -= S.bars; own[id] = 1; prof.armorOn = id; unhide('armor'); sfx('buy');
  } else if (d.sup) {
    if (!st || st >= SUIT_ST || prof.coins < S.price[st] || prof.lv < S.unlock[st]) return;
    prof.coins -= S.price[st]; own[id] = st + 1; delete use[id]; sfx('upgrade');
  } else if (d.swear) { prof.armorOn = id; unhide('armor'); sfx('equip'); }
  else if (d.soff) { prof.armorOn = ARMOR_OFF; armBare = true; sfx('equip'); }
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
// skin pictures: the character in 3D, or just the head
function skinPic(look, head) {
  let ch = null;
  return modelPic((head ? 'head:' : 'skin:') + (pxShown(look) ? 'd' : '') + lookKey(look), g => {
    ch = buildChar(look, 1 / 16);
    if (head) { ch.headPiv.position.set(0, 0, 0); g.add(ch.headPiv); } else g.add(ch.g);
  }, head ? { yaw: .5, tilt: .22, w: 128, h: 128, done: () => ch.dispose() } : { yaw: .45, tilt: .12, w: 160, h: 320, done: () => ch.dispose() });
}
const lookPic = L => skinPic(L, false), headPic = L => skinPic(L, true);
// ---- WEAR page: kill effects (killfx.js)
const KFX_DESC = 'What becomes of whoever you take down';
const KFX_ABOUT = { '': 'They float off with a halo and wings', ghost: 'They drift off as a wailing ghost', tombstone: 'Down they go, and up comes a headstone',
  chicken: 'Bawk! They turn into a chicken and run for it', shatter: 'They burst into a pile of their own blocks', frozen: 'Frozen solid, then smashed to bits',
  fireworks: 'Up they go and out they pop in a burst of colour', lightning: 'A bolt from the blue leaves nothing but ash', blackhole: 'A tiny black hole swallows them whole', confetti: 'Pop! They go off in a shower of confetti',
  snowman: 'One puff of snow and there is a snowman where they stood', present: 'Wrapped up with a bow, and then the lid comes off' };
let kfxSel = null; // the card picked ('' = angels)
const kfxList = () => ['', ...KILL_FX.filter(K => !K.season || prof.kfx?.[K.id] || seasonOn(K.season)).sort((a, b) => !!a.season - !!b.season || (a.chest | 0) - (b.chest | 0) || a.unlock - b.unlock).map(K => K.id)]; // a season's show in its month, after that only if they're yours
const kfxFrom = K => seasonOf(K.season).name + (K.chest ? ' CHESTS' : ' PRESENTS');
const kfxOwn = id => !id || !!prof.kfx?.[id], kfxLocked = K => !!K.id && !kfxOwn(K.id) && (K.chest || K.season || prof.lv < K.unlock);
function renderKfx() {
  heroArmor(shownArmor()); wearGear();
  const on = wornKfx(); if (kfxSel === null || (kfxSel && !kfxOf(kfxSel))) kfxSel = on;
  $('armList').innerHTML = `<p class="wd">${KFX_DESC}</p>` + kfxList().map(id => {
    const K = kfxOf(id) ?? ANGEL_FX, worn = id === on;
    const tag = worn ? 'EQUIPPED' : kfxOwn(id) ? '' : K.season ? `${ico('lock')} ${kfxFrom(K)}` : K.chest ? `${ico('lock')} GOLDEN CHEST` : prof.lv < K.unlock ? `${ico('lock')} LVL ${K.unlock}` : cost(K);
    return `<div class="card rr${kfxLocked(K) ? ' locked' : ''}${id === kfxSel ? ' sel' : ''}${worn ? ' on' : ''}${rarCls(K)}" data-kfx="${id}">` +
      (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai wr" src="${kfxPic(id)}"><div class="cn">${K.name}</div></div>`;
  }).join('');
  renderAct();
  if (inLobby) heroGun(-1);
}
function renderKfxAct() {
  const id = kfxSel ?? wornKfx(), K = kfxOf(id) ?? ANGEL_FX;
  let btns = inLobby && wideArm() ? `<button data-kplay="1">${ico('eye')} PREVIEW</button>` : '';
  if (id === wornKfx()) btns += '<button class="eq" disabled>EQUIPPED</button>';
  else if (kfxOwn(id)) btns += '<button data-kwear="1">EQUIP</button>';
  else if (K.season) btns += `<button disabled>${ico('lock')} FROM THE ${kfxFrom(K)}</button>`;
  else if (K.chest) btns += `<button disabled>${ico('lock')} FOUND IN GOLDEN CHESTS</button>`;
  else if (prof.lv < K.unlock) btns += `<button disabled>${ico('lock')} UNLOCKS AT LVL ${K.unlock}</button>`;
  else btns += `<button data-kbuy="1" ${prof.coins < K.price ? 'disabled' : ''}>BUY ${cost(K)}</button>`;
  setAct(actCard(K.name + ' ' + rarTag(K), '', `<div class="tn">${KFX_ABOUT[id]}</div>`, '', btns));
  placeAct();
}
function kfxClick(d) {
  const id = kfxSel ?? wornKfx(), K = kfxOf(id);
  if (d.kplay) { kfxPlay(id); return; }
  if (d.kbuy) {
    if (!K || K.chest || K.season || kfxOwn(id) || prof.coins < K.price || prof.lv < K.unlock) return;
    prof.coins -= K.price; prof.kfx = { ...prof.kfx, [id]: 1 }; prof.kfxOn = id; sfx('buy'); kfxPlay(id);
  } else if (d.kwear) { if (!kfxOwn(id)) return; prof.kfxOn = id; sfx('equip'); }
  saveProf(); showProf();
}
function renderSkins() {
  const list = lookChoices(), on = lookIndex();
  $('armList').innerHTML = `<p class="wd">${SKINS_DESC}</p>` + list.map((p, i) =>
    `<div class="card${i === skinPick ? ' sel' : ''}${i === on ? ' on' : ''}${p.secret ? ' rr' : ''}" data-skin="${i}"${p.secret ? ` style="--rc:${p.event ? RARITY.event[1] : '#a66bff'}"` : ''}>${i === on ? '<span class="tag">WEARING</span>' : ''}` +
    `<img class="sk ai" src="${lookPic(p.look)}"><div class="cn">${p.name}</div>${p.event ? `<small class="sec" style="color:${RARITY.event[1]}">${RARITY.event[0]}</small>` : p.secret ? '<small class="sec">SECRET</small>' : ''}</div>`).join('') +
    (inLobby ? '<div class="card" data-cust="1"><span class="plus">' + ico('pencil') + '</span><div class="cn">CUSTOMIZE</div><small>MAKE YOUR OWN LOOK</small></div>' : '') +
    (!prof.draw ? `<div class="card" data-dbuy="1"><span class="plus">${ico('pencil')}</span><div class="cn">DRAW</div><small>PAINT YOUR OWN SKINS<br>${COIN}${DRAW_PRICE}</small></div>`
      : inLobby && (prof.draws?.length || 0) < DRAW_MAX ? `<div class="card" data-dnew="1"><span class="plus">${ico('pencil')}</span><div class="cn">DRAW NEW</div><small>${prof.draws?.length || 0} / ${DRAW_MAX} SKINS</small></div>` : '') +
    `<div class="card${codeOn ? ' sel' : ''}" data-code="1"><span class="plus">${ico('lock')}</span><div class="cn">SECRET CODE</div><small>GOT ONE?</small></div>`;
  heroArmor(shownArmor()); wearGear();
  renderAct();
  if (inLobby) heroGun(-1);
}
function renderSkinAct() {
  if (codeOn) {
    setAct(actCard('SECRET CODE', '', '<div class="tn">SOME SKINS AND HATS ONLY COME FROM CODES</div><input id="secretIn" maxlength="24" autocomplete="off" spellcheck="false" placeholder="TYPE A CODE">' +
      `<p id="secretMsg" class="tn">${codeMsg}</p>`, '', '<button data-redeem="1">REDEEM</button>'));
    placeAct(); return;
  }
  const p = lookChoices()[lookIndex()], drawn = p?.drawn !== undefined;
  const btns = !inLobby ? '' : drawn ? `<button data-dedit="${p.drawn}">${ico('pencil')} EDIT</button><button data-ddel="${p.drawn}">${drawSure === p.drawn ? 'SURE?' : 'DELETE'}</button>` : '<button data-cust="1">' + ico('pencil') + ' CUSTOMIZE</button>';
  setAct(actCard(p?.name ?? 'CUSTOM', '', `<div class="tn">WEARING${drawn && CG_ON ? ' · ONLY YOU SEE DRAWN SKINS HERE' : ''}</div>`, '', btns));
  placeAct();
}
let drawSure = -1; // delete needs a second click
// secret codes, kept as hashes
let codeOn = false, codeMsg = '';
const CODES = { '5690d215caed2a6699cdf70479d8c6447be1e39a14bb6ad7aa96f31e91b32031': 'creature', '1c48319173d993e160c8c14a377f7aa4357d5a09fa41df198c6862db2cf28f03': 'creature',
  '8852032455ce783ddeae72e9f41cf20e3ff6ead5c35249ecb90cc003292797e6': 'hat:map',
  '06e1a5d53766a0be3db629e2a732262c41ceec5f2c394873351b137aa8f6e50f': 'hat:octopus', 'e0eb5a9059ccd1fae3b75c96f5c1456b6cde04a9e572c7bcfffc933e50679e42': 'hat:octopus' };
const SECRET_HI = { creature: ["Victor's Creature wakes up and joins your skins", "Victor's Creature is already yours"],
  'hat:map': ['The Map Hat unrolls, find it in the SKINS of any hat', 'The Map Hat is already yours'],
  'hat:octopus': ['An octopus climbs aboard, find it in the SKINS of any hat', 'The Octopus Hat is already yours'] };
async function redeem() {
  const c = ($('secretIn')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!c) return;
  let id = null;
  try { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('voxel-strike:' + c))); id = CODES[[...h].map(b => b.toString(16).padStart(2, '0')).join('')] ?? null; } catch {}
  if (!id) { codeMsg = "That code doesn't do anything"; sfx('ui'); renderAct(); return; }
  if (id.startsWith('hat:')) { // a hat skin: yours for every hat, and straight onto the one you're wearing
    const k = id.slice(4), had = !!prof.skins?.[k];
    prof.skins = { ...prof.skins, [k]: 1 };
    if (prof.hatOn && hatStars(prof.hatOn)) prof.hatSkin = { ...prof.hatSkin, [prof.hatOn]: k };
    saveProf(); dressHero(); codeOn = false; codeMsg = '';
    sfx(had ? 'equip' : 'levelUp'); netToast(SECRET_HI[id][had ? 1 : 0]); renderArmory(); return;
  }
  const had = ownSecret(id);
  if (!had) prof.secrets = [...(Array.isArray(prof.secrets) ? prof.secrets : []), id];
  prof.look = { ...SECRETS[id].look }; saveProf(); dressHero();
  codeOn = false; codeMsg = ''; skinPick = lookIndex();
  sfx(had ? 'equip' : 'levelUp'); netToast(SECRET_HI[id][had ? 1 : 0]);
  renderArmory();
}
$('armAct').addEventListener('keydown', e => { if (e.target.id === 'secretIn' && (e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); redeem(); } });
// open the customizer
function openCust() { closeArmory(); showCust(true); }

// ---- WEAR page: boots and hats
const GEAR = {
  boots: { list: BOOTS, I: BOOT_I, own: 'boots', use: 'bootUse', on: 'bootOn', stars: bootStars, using: bootUse, worn: wornBoots,
    pic: bootPic, model: bootsModel, face: .6, put: b => heroBoots(b),
    desc: 'Boots give you special stat boosts',
    about: {
      warrior: 'Steel greaves for brawlers, so you hit harder and take a little less',
      raider: 'Winged runners that make you faster and let you jump again in midair',
      ironclad: 'Iron boots so heavy that blasts and hammers barely move you',
      arcane: 'Soft midnight boots that keep you quick and your wands charged',
      thornwood: 'Rooty bark boots that slowly patch you up when nobody is hitting you',
      skyrunner: 'Featherweight runners for going fast and jumping high',
      titanium: 'Polished greaves that keep you quick and put weight behind every hit',
      elf: 'Curly toed shoes that never feel the cold, so frost cannot slow you',
    } },
  hats: { list: HATS, I: HAT_I, own: 'hats', use: 'hatUse', on: 'hatOn', stars: hatStars, using: hatUse, worn: wornHat,
    pic: hatPic, model: hatModel, face: .5, put: h => heroHat(h), look: hatSkin,
    desc: 'Hats give you special stat boosts',
    about: {
      warrior: 'A steel helmet that takes the edge off hits and sometimes turns a headshot into a body shot',
      raider: 'A dark hood that sometimes halves a hit and hides your red outline from anyone outside its stealth range',
      ironclad: 'A horned iron helm that shrugs off hits and headshots',
      arcane: 'A pointy wizard hat that sometimes lets you shake off fire, ice and stuns',
      thornwood: 'A bark helm with thorny branches that stings anyone who hits you up close',
      skyrunner: 'A winged flight helm that takes the sting out of hits while you fly',
      titanium: 'A polished helm that turns hits and headshots aside',
      elf: 'A pointed hat whose bell jingles when someone creeps up behind you',
    } },
};
const wearGear = () => { for (const k in GEAR) GEAR[k].put(hidOn(k) ? null : GEAR[k].worn()); };
const isGear = () => armPage === 'wear' && !!GEAR[wearCat];
const pct = v => Math.round(v * 100) + '%';
// gear stats as [label, value]
const plusPct = v => '+' + pct(v);
const GEAR_STATS = [['spd', 'SPEED', plusPct], ['dmg', 'DAMAGE', plusPct], ['dr', 'DAMAGE CUT', pct], ['hs', 'HEADSHOT BLOCK', pct],
  ['half', 'HALF DAMAGE', pct], ['stealth', 'STEALTH', v => v + 'M'], ['rl', 'FASTER RELOAD', plusPct], ['heavy', 'KNOCKBACK CUT', pct], ['shrug', 'SHAKE OFF', pct],
  ['heal', 'HEALING', v => v + ' HP/S'], ['jmp', 'JUMP', plusPct], ['thorns', 'THORNS', pct], ['sky', 'AIR DMG CUT', pct]];
function gearLines(B, st) {
  const o = GEAR_STATS.filter(([f]) => B[f]).map(([f, k, fmt]) => [k, fmt(B[f][st - 1])]);
  if (B.dj) o.push(['JUMPS', '2']);
  return o;
}
const GEAR_SHORT = { 'DAMAGE CUT': 'DMG CUT', DAMAGE: 'DMG', 'HEADSHOT BLOCK': 'HS BLOCK', 'HALF DAMAGE': 'HALF DMG', 'FASTER RELOAD': 'RELOAD', 'KNOCKBACK CUT': 'KB CUT', 'AIR DMG CUT': 'AIR CUT' };
const gearList = G => G.list.map((B, i) => i).filter(i => !G.list[i].season || G.stars(G.list[i].id) || seasonOn(G.list[i].season)).sort((a, b) => !!G.list[a].season - !!G.list[b].season || G.list[a].unlock - G.list[b].unlock);
const gearLocked = (G, B) => !G.stars(B.id) && (seasonGear(B) || prof.lv < B.unlock);
const gearUpg = (G, B) => Math.round(B.price * UPG[G.stars(B.id) - 1]);
const gearStarTxt = (G, id) => starRow(G.using(id), G.stars(id), 3);
const gearShown = (G, B) => Math.max(1, G.using(B.id));
function gearNow() {
  const G = GEAR[wearCat];
  if (!G.list[gearSel]) { const on = G.worn(); gearSel = on ? G.I[on.id] : gearList(G)[0]; gearPick = false; }
  return G;
}
// what he tries on: the item at its stars, a hat in its skin
const gearOn = (G, B) => { const st = gearShown(G, B), skin = G.stars(B.id) && G.look?.(B.id); return skin ? { id: B.id, st, skin } : { id: B.id, st }; };
// he tries on the item you picked
function gearDress() {
  heroArmor(shownArmor());
  const G = isGear() && gearNow(), B = G && G.list[gearSel];
  for (const k in GEAR) { const on = GEAR[k].worn(), it = G && k === wearCat && !armBare ? gearOn(G, B) : on; GEAR[k].put(hidOn(k) && it?.id === on?.id ? null : it); }
}
function renderGear() {
  const G = gearNow();
  if (armDet) renderGearDetail();
  else $('armList').innerHTML = `<p class="wd">${G.desc}</p>` + gearList(G).map(i => {
    const K = G.list[i], st = G.stars(K.id), worn = prof[G.on] === K.id && st, s = gearShown(G, K), [sa, set] = setTag(K.id, worn);
    const tag = gearLocked(G, K) ? `${ico('lock')} ${seasonGear(K) ? gearFrom(K) : 'LVL ' + K.unlock}` : !st ? cost(K) : worn ? wearTag(wearCat) : '';
    return `<div class="card rr${gearLocked(G, K) ? ' locked' : ''}${i === gearSel && gearPick ? ' sel' : ''}${worn ? ' on' : ''}${set}${rarCls(K)}" data-gear="${i}">` +
      sa + (tag ? `<span class="tag">${tag}</span>` : '') + `<img class="ai wr" src="${G.pic(K.id, s, st && G.look?.(K.id))}">` +
      `<div class="cn">${K.name} <span class="st">${gearStarTxt(G, K.id)}</span></div></div>`;
  }).join('');
  gearDress();
  renderAct();
  if (inLobby) heroGun(-1);
}
function renderGearDetail() {
  const G = gearNow(), B = G.list[gearSel], st = gearShown(G, B), have = G.stars(B.id);
  const specs = GEAR_STATS.filter(([f]) => B[f]).map(([f, k, fmt]) => [k + ' BY STAR', B[f].map(fmt).join(' / ')]);
  if (SET_TXT[B.id]) specs.push(['FULL SET', SET_TXT[B.id]]);
  specs.push(['UNLOCKS AT', 'LVL ' + B.unlock], [B.bars ? 'CRAFT FOR' : 'PRICE', cost(B)],
    ['STATUS', prof[G.on] === B.id && have ? 'WEARING' : have ? 'OWNED' : gearLocked(G, B) ? ico('lock') + ' LOCKED' : 'NOT OWNED']);
  if (hskFor !== wearCat + gearSel) { hskOpen = false; hskSel = null; hskFor = wearCat + gearSel; }
  const skins = G.look && have, sk = skins ? hskSel ?? G.look(B.id) : '';
  $('armDet').innerHTML = `<button id="detBack">${ico('left')} BACK</button><div id="detView"><span class="hint">DRAG TO TURN</span></div>` +
    `<div class="dt"><div class="dn">${B.name} ${rarTag(B)} <span class="st">${gearStarTxt(G, B.id)}</span></div>${skins ? hskTop(B) : ''}</div>` +
    (skins && hskOpen ? hskGrid(B) : `<p>${G.about[B.id] ?? ''}</p><div class="ds">${specs.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`);
  pvShow(wearCat + ':' + B.id + st + ':' + sk, g => G.model(B.id, st, g, sk), G.face);
  if (hskShow) { hskShow = false; $('armDet').lastElementChild.scrollIntoView({ block: 'nearest' }); } // the skins just opened: all in view
}
// a hat's skins, in its details: try any on the model, wear the ones you've won
let hskOpen = false, hskSel = null, hskFor = '', hskShow = false;
const skinEvent = id => EVENTS.find(e => e.skin === id);
function hskTop(B) {
  const S = hatSkinOf(hskSel ?? hatSkin(B.id));
  return `<div class="hsk"><span>SKIN <b>${S ? S.name.toUpperCase() : 'DEFAULT'}</b></span><button data-hsko="1">${hskOpen ? 'DONE' : 'SKINS'}</button></div>`;
}
function hskGrid(B) {
  const on = hatSkin(B.id), sel = hskSel ?? on, S = hatSkinOf(sel), own = id => !!prof.skins?.[id];
  const card = (id, pic, name, note, cls) => `<button class="hsc${cls}" data-hsk="${id}"><img src="${pic}"><b>${name}</b><small>${note}</small></button>`;
  return '<div class="hsg">' + card('', hatPic(B.id, hatUse(B.id)), 'DEFAULT', on ? '' : 'WEARING', (on ? '' : ' on') + (sel ? '' : ' sel')) +
    HAT_SKINS.filter(K => K.season ? own(K.id) || seasonOn(K.season) : !K.secret || own(K.id)).map(K => card(K.id, hatPic(B.id, 0, K.id), K.name.toUpperCase(), own(K.id) ? (on === K.id ? 'WEARING' : '') : ico('lock') + ' ' + (K.season ? seasonOf(K.season).name + (K.chest ? ' CHESTS' : ' PRESENTS') : skinEvent(K.id)?.name ?? ''),
      (own(K.id) ? '' : ' locked') + (on === K.id ? ' on' : '') + (sel === K.id ? ' sel' : ''))).join('') + '</div>' +
    `<p class="hsa">${S ? S.about : 'The hat just as it comes'}</p>` + (S && !own(S.id) ? `<div class="tn">${ico('lock')} WIN IT IN ${skinEvent(S.id)?.name ?? 'AN EVENT'}</div>` : '');
}
function hskClick(d) {
  const B = HATS[gearSel]; if (wearCat !== 'hats' || !B || !hatStars(B.id)) return;
  if (d.hsko) { hskOpen = hskShow = !hskOpen; hskSel = null; sfx('ui'); return; }
  const id = d.hsk;
  if (id && !prof.skins?.[id]) { hskSel = id; sfx('ui'); return; } // not yours yet: just a look
  prof.hatSkin = { ...prof.hatSkin, [B.id]: id || '' }; // '' = you picked the hat's own look
  hskSel = null; saveProf(); sfx('equip');
}
function renderGearAct() {
  const G = gearNow(), B = G.list[gearSel], st = G.stars(B.id), worn = prof[G.on] === B.id && st;
  let btns;
  if (gearLocked(G, B)) btns = `<button disabled>${ico('lock')} ${seasonGear(B) ? 'FOUND IN ' + gearFrom(B) : 'UNLOCKS AT LVL ' + B.unlock}</button>`;
  else if (!st) btns = `<button data-gbuy="1" ${prof.coins < B.price || barShort(B) ? 'disabled' : ''}>${B.bars ? 'CRAFT' : 'BUY'} ${cost(B)}</button>`;
  else {
    btns = worn ? '<button data-goff="1">TAKE OFF</button>' + hideBtn(wearCat) : '<button data-gwear="1">WEAR</button>';
    if (st < 3) btns += `<button data-gup="1" ${prof.coins < gearUpg(G, B) ? 'disabled' : ''}>${starRow(st + 1)} ${COIN}${gearUpg(G, B)}</button>`;
  }
  const u = G.using(B.id), pick = st > 1 ? lvPick('gu', 'USING ' + starRow(u), u <= 1, u >= st) : '';
  const body = statBoxes(gearLines(B, gearShown(G, B)).map(([k, v]) => [GEAR_SHORT[k] ?? k, v, ''])) + (worn ? setBonus(B.id) : st ? '' : '<div class="tn">NOT OWNED · SHOWN AT ' + starRow(1) + '</div>' + barHint(B));
  setAct(actCard(B.name + ' ' + rarTag(B), gearStarTxt(G, B.id), body, pick, btns));
  placeAct();
}
// a hat you never picked a skin for takes the one you were wearing
function skinOver(to) { const s = hatSkin(prof.hatOn); if (s && prof.hatSkin[to] === undefined) prof.hatSkin = { ...prof.hatSkin, [to]: s }; }
// boots and hats buttons
function gearClick(d) {
  const G = GEAR[wearCat], B = G?.list[gearSel]; if (!B) return;
  const st = G.stars(B.id), own = prof[G.own] ??= {}, use = prof[G.use] ??= {};
  if (d.gbuy) {
    if (st || B.season || prof.coins < B.price || prof.lv < B.unlock || barShort(B)) return;
    prof.coins -= B.price; if (B.bars) prof.bars -= B.bars; own[B.id] = 1; if (G.look) skinOver(B.id); prof[G.on] = B.id; unhide(wearCat); sfx('buy');
  } else if (d.gup) {
    if (!st || st >= 3 || prof.coins < gearUpg(G, B)) return;
    prof.coins -= gearUpg(G, B); own[B.id] = st + 1; delete use[B.id]; sfx('upgrade');
  } else if (d.gwear) { if (G.look) skinOver(B.id); prof[G.on] = B.id; unhide(wearCat); sfx('equip'); }
  else if (d.goff) { prof[G.on] = ''; armBare = true; sfx('equip'); }
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
  armBare = false;
  if (c.dataset.cust) { openCust(); return; }
  if (c.dataset.dbuy) { drawBuy(); return; }
  if (c.dataset.dnew) { openDraw(-1); return; }
  if (c.dataset.skin) { drawSure = -1; codeOn = false; skinPick = +c.dataset.skin; wearLook(skinPick); renderArmory(); return; }
  if (c.dataset.kfx !== undefined) { kfxSel = c.dataset.kfx; kfxPlay(kfxSel); sfx('ui'); renderArmory(); return; }
  if (c.dataset.code) { codeOn = true; codeMsg = ''; skinPick = -1; sfx('ui'); renderArmory(); $('secretIn')?.focus(); return; }
  if (c.dataset.armor) { if (armorCard) { armDet = true; armorPrev = basicWorn() || 1; } else { armorCard = true; suitSel = ''; } sfx('ui'); renderArmory(); return; }
  if (c.dataset.suit) { const id = c.dataset.suit; if (suitSel === id) armDet = true; else { suitSel = id; armorCard = false; } sfx('ui'); renderArmory(); return; }
  if (c.dataset.gear) { const i = +c.dataset.gear; if (i === gearSel && gearPick) armDet = true; else { gearSel = i; gearPick = true; } sfx('ui'); renderArmory(); return; }
  if (c.dataset.set) { setSel = c.dataset.set; sfx('ui'); renderArmory(); return; }
  if (c.dataset.gsk !== undefined) { skinSel = c.dataset.gsk; sfx('ui'); renderArmory(); return; }
  if (c.dataset.idx) { const k = +c.dataset.idx; armPage = chestOnly(k) ? 'exclusive' : 'weapons'; armCat = BASE[k].cat; armSel = k; armPick = true; armDet = false; sfx('ui'); renderArmory(); return; } // to that gun's card
  const i = +c.dataset.i;
  if (i === armSel && armPick) armDet = true; else { armSel = i; armPick = true; }
  sfx('ui'); renderArmory();
});
function armClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.cust) { openCust(); return; }
  if (b.dataset.redeem) { redeem(); return; }
  if (b.dataset.dedit) { openDraw(+b.dataset.dedit); return; }
  if (b.dataset.ddel) { const i = +b.dataset.ddel; if (drawSure === i) { drawSure = -1; drawDelete(i); } else { drawSure = i; sfx('ui'); renderAct(); } return; }
  if (b.dataset.pg) { skinGun = -1; if (b.dataset.pg !== armPage) { armPage = b.dataset.pg; armDet = false; armorPrev = 0; armorCard = false; suitSel = ''; armSel = -1; gearSel = -1; skinPick = -1; codeOn = false; armBare = false; sfx('ui'); } }
  else if (b.dataset.wc) { if (b.dataset.wc !== wearCat) { wearCat = b.dataset.wc; kfxSel = null; armDet = false; armorCard = false; suitSel = ''; armorPrev = 0; gearSel = -1; skinPick = -1; codeOn = false; armBare = false; sfx('ui'); } }
  else if (b.dataset.gbuy || b.dataset.gup || b.dataset.gwear || b.dataset.goff || b.dataset.gu) gearClick(b.dataset);
  else if (b.dataset.hsko || 'hsk' in b.dataset) hskClick(b.dataset);
  else if (b.dataset.kbuy || b.dataset.kwear || b.dataset.kplay) kfxClick(b.dataset);
  else if (b.dataset.av) { armorStep(+b.dataset.av); return; }
  else if (b.dataset.sbuy || b.dataset.sup || b.dataset.swear || b.dataset.soff || b.dataset.su) suitClick(b.dataset);
  else if (b.dataset.wa) wearStar(basicWorn() + +b.dataset.wa);
  else if (b.dataset.wear) wearStar(+b.dataset.wear, true);
  else if (b.dataset.aoff) { prof.armorOn = ARMOR_OFF; armBare = true; saveProf(); armorSync(false); sfx('equip'); }
  else if (b.dataset.hide) hideToggle(b.dataset.hide);
  else if (b.dataset.use) {
    const i = armSel, st = gunStars(i), u = Math.max(1, Math.min(st, gunUse(i) + +b.dataset.use));
    if (u === st) delete prof.use[BASE[i].id]; else prof.use[BASE[i].id] = u;
    saveProf(); armSync(i, 'use'); sfx('equip');
  }
  else if (b.dataset.arm) {
    const n = myArmor(), T = n < ARMOR_MAX && armorOf(n + 1); if (!T || prof.coins < T.price || prof.lv < T.unlock) return;
    prof.coins -= T.price; prof.armor = n + 1; prof.armorUse = 0; if (armorOff()) { prof.armorOn = ''; unhide('armor'); } if (armDet) armorPrev = n + 1; saveProf(); showProf();
    armorSync(); sfx(n ? 'upgrade' : 'buy');
  }
  else if (b.dataset.range) { closeArmory(); startRange(+b.dataset.range); return; }
  else if (b.dataset.det) { armDet = !armDet; if (armDet && armPage === 'wear' && wearCat === 'armor') armorPrev = basicWorn() || 1; sfx('ui'); }
  else if (b.dataset.c) { armCat = b.dataset.c; armDet = false; skinGun = -1; sfx('ui'); }
  else if (b.dataset.xt) { exclTab = b.dataset.xt; armDet = false; armSel = -1; skinGun = -1; sfx('ui'); }
  else if (b.dataset.skins) { skinGun = +b.dataset.skins; skinSel = gunSkin(skinGun); sfx('ui'); }
  else if (b.dataset.gsback) { skinGun = -1; sfx('ui'); }
  else if (b.dataset.gswear !== undefined) { if (gsWear(skinGun, b.dataset.gswear)) { sfx('equip'); if (inMatch()) { if (gunShown === skinGun) buildGun(); renderHotbar(); net.gearChanged?.(); } } }
  else if (b.dataset.eqset) { // the whole set, each piece into its own slot
    const T = GUN_SETS.find(x => x.id === b.dataset.eqset); if (!T || setHas(T) < T.guns.length) return;
    for (const id of T.guns) { const c = BASE[gi(id)].cat; trialOff(c); prof.loadout[c] = id; }
    saveProf(); sfx('equip');
  } else if (b.dataset.setgift) { achClaim(b.dataset.setgift); return; }
  else if (b.id === 'detBack') { armDet = false; hskOpen = false; hskSel = null; sfx('ui'); }
  else if (b.dataset.buy) {
    const i = +b.dataset.buy, w = BASE[i]; if (w.chest || w.season || prof.coins < w.price || prof.lv < (w.unlock ?? 0)) return;
    trialOff(w.cat); prof.coins -= w.price; prof.guns[w.id] = 1; prof.loadout[w.cat] = w.id; saveProf(); showProf();
    armSync(i, 'buy'); sfx('buy');
  } else if (b.dataset.up) {
    const i = +b.dataset.up, p = upgPrice(i); if (prof.coins < p || gunStars(i) >= 3) return;
    prof.coins -= p; prof.guns[BASE[i].id]++; delete prof.use[BASE[i].id]; saveProf(); showProf();
    armSync(i, 'up'); sfx('upgrade');
  } else if (b.dataset.eq) {
    const i = +b.dataset.eq; trialOff(BASE[i].cat); prof.loadout[BASE[i].cat] = BASE[i].id; saveProf();
    armSync(i, 'eq'); sfx('equip');
  } else if (b.dataset.season) { openSeason('guns'); snSel = b.dataset.season; renderSeason();
  } else if (b.dataset.try) {
    trialSet(true); sfx('equip');
  } else if (b.id === 'armX') { closeArmory(); return; }
  renderArmory();
}
$('armory').addEventListener('click', armClick);
$('armAct').addEventListener('click', armClick);
$('armAct').addEventListener('pointerdown', e => e.stopPropagation());
$('heroAct').addEventListener('pointerdown', e => e.stopPropagation());
const armIcon = () => $('armIcon').src = gunPic(loadoutGun('primary'), gunSkin(loadoutGun('primary'))); // ARMORY button shows your primary
armIcon();
function armShow(on) {
  $('armory').style.display = on ? 'flex' : 'none';
  $('armAct').style.display = on ? 'flex' : 'none';
  if (!on) $('heroAct').style.display = $('heroHide').style.display = 'none';
  if (inLobby) { $('lobbyUI').style.display = on ? 'none' : ''; }
  else $('menu').style.display = on || locked || shopOpen || matchOver ? 'none' : 'flex';
}
function openArmory() { armOpen = true; skinGun = -1; heroSkin = null; kfxSel = null; armDet = false; armSel = -1; armorCard = false; suitSel = ''; skinPick = -1; codeOn = false; armBare = false; armShow(true); renderArmory(); }
function closeArmory() { if (!armOpen) return; armOpen = false; skinGun = -1; heroSkin = null; armShow(false); armIcon(); armorPrev = 0; gearSel = -1; suitSel = ''; heroArmor(shownArmor()); wearGear(); }
$('armBtn').addEventListener('click', e => { e.stopPropagation(); openArmory(); }); // don't re-lock the mouse
$('lobbyArm').addEventListener('click', openArmory);
addEventListener('keydown', e => {
  if (armOpen && armDet && armPage === 'wear' && wearCat === 'armor' && !shownSuit() && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { armorStep(e.code === 'ArrowLeft' ? -1 : 1); return; }
  if (e.code !== 'Escape' || !armOpen || $('binds').style.display === 'flex') return;
  if (armDet) { armDet = false; renderArmory(); } else closeArmory();
});
addEventListener('resize', () => { placeAct(); if (armOpen) fitStats($('armAct')); });
// wear pictures are drawn in idle time too, so the WEAR page opens without a stall
{
  const jobs = [...ARMOR_TIERS.map((t, k) => () => armorPic(k)), ...[[BOOTS, bootPic], [HATS, hatPic]].flatMap(([L, f]) => L.flatMap(x => [1, 2, 3].map(s => () => f(x.id, s)))), ...HAT_SKINS.map(S => () => hatPic('', 0, S.id)),
    ...PRESETS.map(p => () => lookPic(p.look)), () => headPic(prof.look)];
  const later = window.requestIdleCallback || (f => setTimeout(f, 50)), next = () => { if (!inLobby) { later(next); return; } const j = jobs.shift(); if (j) { j(); later(next); } };
  later(next);
}
